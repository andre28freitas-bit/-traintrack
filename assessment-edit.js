(() => {
'use strict';

const X = window.TTEX;
if (!X) return;
const { db, BUCKET, metrics, esc, fmtDate, toast, modal, close } = X;
let currentStudentId = null;
const originalOpenStudent = window.openStudent;
const originalStudentTab = window.studentTab;
const originalExportData = window.exportData;

const css = document.createElement('style');
css.textContent = `
.tt-assessment-manage{margin:14px 0}.tt-assessment-manage .manage-list{display:grid;gap:8px}.tt-assessment-manage .manage-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:#fff}.tt-assessment-manage .manage-row .actions{flex-wrap:wrap}.tt-assessment-manage .manage-meta{font-size:11px;color:var(--muted);margin-top:3px}.tt-photo-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px}.tt-photo-item{position:relative}.tt-photo-item img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;border:1px solid var(--border)}.tt-photo-item label{display:flex;gap:6px;align-items:center;font-size:10px;margin-top:4px}.tt-edit-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.tt-edit-actions .danger{margin-right:auto}@media(max-width:640px){.tt-assessment-manage .manage-row{align-items:flex-start;flex-direction:column}.tt-assessment-manage .manage-row .actions{width:100%}.tt-assessment-manage .manage-row .actions button{flex:1}.tt-photo-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
document.head.appendChild(css);

function fileExt(file){
  const name=(file?.name||'').split('.').pop()?.toLowerCase();
  if(name && /^[a-z0-9]{2,5}$/.test(name)) return name;
  return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'})[file?.type] || 'jpg';
}
async function upload(file, folder){
  if(!file?.size) return null;
  if(file.size>10*1024*1024) throw new Error('Cada fotografia pode ter no máximo 10 MB.');
  const {data:{user},error:userError}=await db.auth.getUser();
  if(userError || !user) throw userError || new Error('Sessão inválida.');
  const path=`${user.id}/${folder}/${crypto.randomUUID()}.${fileExt(file)}`;
  const {error}=await db.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||undefined});
  if(error) throw error;
  return path;
}
async function signed(path){
  if(!path) return '';
  const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,3600);
  if(error) throw error;
  return data.signedUrl;
}
function num(v){ return v==='' || v==null ? null : Number(v); }

async function refreshStudentWithoutReload(studentId, tab='assessments'){
  try{
    const {error}=await db.auth.refreshSession();
    if(error) throw error;
    await new Promise(resolve=>setTimeout(resolve,250));
  }catch(error){
    console.warn('TrainTrack soft refresh:', error?.message || error);
  }
  currentStudentId=studentId;
  window.openStudent?.(studentId,tab);
}

async function injectAssessmentManager(studentId){
  const body=document.querySelector('#studentBody');
  if(!body || document.querySelector('.tt-assessment-manage')) return;
  const {data:list,error}=await db.from('traintrack_assessments').select('*').eq('student_id',studentId).order('assessment_date',{ascending:false});
  if(error) return console.warn(error);
  if(!list?.length) return;
  const box=document.createElement('section');
  box.className='tt-assessment-manage';
  box.innerHTML=`<div class="section-head"><div><h2>Gestão das avaliações</h2><p>Corrige uma avaliação já submetida ou exporta-a.</p></div></div><div class="manage-list">${list.map(a=>`<div class="manage-row"><div><strong>${fmtDate(a.assessment_date)}</strong><div class="manage-meta">${Object.keys(a.values||{}).filter(k=>a.values?.[k]!==''&&a.values?.[k]!=null).length} resultados · ${Object.keys(a.body_metrics||{}).length} medidas · ${(a.photo_paths||[]).length} foto(s)</div></div><div class="actions"><button class="secondary" onclick="ttEditAssessment('${a.id}')">Editar</button><button class="secondary" onclick="ttExportReport('${studentId}','${a.id}')">PDF</button><button class="danger" onclick="ttDeleteAssessment('${a.id}','${studentId}')">Eliminar</button></div></div>`).join('')}</div>`;
  body.prepend(box);
}

window.openStudent = function(id, tab='overview'){
  currentStudentId=id;
  originalOpenStudent?.(id,tab);
  if(tab==='assessments') setTimeout(()=>injectAssessmentManager(id),50);
};
window.studentTab = function(tab){
  originalStudentTab?.(tab);
  if(tab==='assessments' && currentStudentId) setTimeout(()=>injectAssessmentManager(currentStudentId),50);
};
window.exportData = function(){
  if(currentStudentId && document.querySelector('#studentBody') && typeof window.ttExportReport==='function') return window.ttExportReport(currentStudentId);
  return originalExportData?.();
};

window.ttEditAssessment = async function(assessmentId){
  try{
    const [{data:a,error:aErr},{data:tests,error:tErr}] = await Promise.all([
      db.from('traintrack_assessments').select('*').eq('id',assessmentId).single(),
      db.from('traintrack_test_definitions').select('*').eq('active',true).order('sort_order')
    ]);
    if(aErr) throw aErr; if(tErr) throw tErr;
    const photoHtml=[];
    for(const p of (a.photo_paths||[])){
      try{ photoHtml.push(`<div class="tt-photo-item"><img src="${await signed(p)}" alt="Fotografia da avaliação"><label><input type="checkbox" name="remove_photo" value="${esc(p)}"> remover</label></div>`); }catch{}
    }
    modal(`<div class="modal-head"><h2>Editar avaliação</h2><button class="icon-btn" onclick="closeModal()">×</button></div><form onsubmit="ttSaveAssessmentEdit(event,'${assessmentId}')"><div class="form-grid"><div class="field"><label>Data</label><input type="date" name="assessment_date" value="${esc(a.assessment_date)}" required></div><div class="field"><label>Aluno</label><input value="${esc(document.querySelector('.profile-title h2')?.textContent||'Aluno')}" disabled></div>${(tests||[]).map(t=>`<div class="field"><label>${t.sort_order}. ${esc(t.name)} · ${esc(t.unit||'')}</label><input name="test_${t.id}" value="${esc(a.values?.[t.id]??'')}"></div>`).join('')}<div class="field full"><div class="form-section"><strong>Medidas corporais</strong><span>Podes corrigir qualquer valor.</span></div><div class="measure-input-grid">${metrics.map(([k,l,u])=>`<div class="field"><label>${l} (${u})</label><input name="metric_${k}" type="number" min="0" step="0.1" value="${esc(a.body_metrics?.[k]??'')}"></div>`).join('')}</div></div><div class="field full"><label>Notas</label><textarea name="notes">${esc(a.notes||'')}</textarea></div>${photoHtml.length?`<div class="field full"><label>Fotografias atuais</label><div class="tt-photo-list">${photoHtml.join('')}</div></div>`:''}<div class="field full"><label>Adicionar fotografias <span class="optional">opcional</span></label><div class="media-actions"><label class="secondary file-button">Carregar fotos<input hidden type="file" name="new_photos" accept="image/*" multiple></label><label class="secondary file-button">Abrir câmara<input hidden type="file" name="new_camera" accept="image/*" capture="environment"></label></div></div></div><div class="form-actions tt-edit-actions"><button type="button" class="danger" onclick="ttDeleteAssessment('${assessmentId}','${a.student_id}')">Eliminar avaliação</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Guardar alterações</button></div></form>`);
  }catch(e){ toast(e.message||'Não foi possível abrir a avaliação.',true); }
};

window.ttSaveAssessmentEdit = async function(e,assessmentId){
  e.preventDefault();
  const fd=new FormData(e.target);
  try{
    const {data:current,error:cErr}=await db.from('traintrack_assessments').select('*').eq('id',assessmentId).single();
    if(cErr) throw cErr;
    const {data:tests,error:tErr}=await db.from('traintrack_test_definitions').select('id').eq('active',true);
    if(tErr) throw tErr;
    const values={...(current.values||{})};
    (tests||[]).forEach(t=>{ values[t.id]=String(fd.get(`test_${t.id}`)||'').trim(); });
    const body_metrics={};
    metrics.forEach(([k])=>{ const v=num(fd.get(`metric_${k}`)); if(Number.isFinite(v)) body_metrics[k]=v; });
    const removePaths=fd.getAll('remove_photo').map(String);
    let photo_paths=(current.photo_paths||[]).filter(p=>!removePaths.includes(p));
    const newFiles=[...fd.getAll('new_photos'),fd.get('new_camera')].filter(f=>f instanceof File && f.size);
    for(const f of newFiles) photo_paths.push(await upload(f,`students/${current.student_id}/assessments/${assessmentId}`));
    const {error}=await db.from('traintrack_assessments').update({assessment_date:fd.get('assessment_date'),values,body_metrics,photo_paths,notes:String(fd.get('notes')||'').trim(),scores:{}}).eq('id',assessmentId);
    if(error) throw error;
    for(const p of removePaths){ await db.storage.from(BUCKET).remove([p]).catch(()=>{}); }
    if(Number.isFinite(body_metrics.weight_kg)) await db.from('traintrack_students').update({weight_kg:body_metrics.weight_kg}).eq('id',current.student_id);
    close();
    toast('Avaliação atualizada.');
    await refreshStudentWithoutReload(current.student_id,'assessments');
  }catch(err){ toast(err.message||'Erro ao atualizar avaliação.',true); }
};

window.ttDeleteAssessment = async function(assessmentId,studentId){
  if(!confirm('Eliminar esta avaliação? Esta ação não pode ser anulada.')) return;
  try{
    const {data:a,error:aErr}=await db.from('traintrack_assessments').select('photo_paths').eq('id',assessmentId).single();
    if(aErr) throw aErr;
    const {error}=await db.from('traintrack_assessments').delete().eq('id',assessmentId);
    if(error) throw error;
    if(a?.photo_paths?.length) await db.storage.from(BUCKET).remove(a.photo_paths).catch(()=>{});
    close();
    toast('Avaliação eliminada.');
    await refreshStudentWithoutReload(studentId,'assessments');
  }catch(err){ toast(err.message||'Erro ao eliminar avaliação.',true); }
};

})();