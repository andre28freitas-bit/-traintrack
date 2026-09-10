(() => {
'use strict';

const cfg=window.TRAINTRACK_CONFIG||{};
if(!window.supabase?.createClient || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const BUCKET='traintrack-media';
const metrics=[['weight_kg','Peso','kg'],['chest_cm','Peito / tórax','cm'],['waist_cm','Cintura','cm'],['abdomen_cm','Abdómen','cm'],['hip_cm','Anca','cm'],['arm_cm','Braço','cm'],['thigh_cm','Coxa','cm'],['calf_cm','Gémeo','cm']];
let currentStudentId=null;
let calendarEvents=[];
let calendarStudents=[];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtDate=d=>d?new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${d}T12:00:00`)):'—';
const fmtDT=d=>d?new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d)):'—';
const localDT=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,16)};
const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const toast=(msg,error=false)=>{const t=document.querySelector('#toast');if(!t)return; t.textContent=msg;t.style.background=error?'#9f2929':'#111827';t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3000)};
const modal=html=>{const root=document.querySelector('#modalRoot');if(root)root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`};
const close=()=>{const r=document.querySelector('#modalRoot');if(r)r.innerHTML=''};

async function user(){const {data:{user},error}=await db.auth.getUser();if(error)throw error;return user}
function ext(file){const n=(file?.name||'').split('.').pop()?.toLowerCase();return n&&/^[a-z0-9]{2,5}$/.test(n)?n:({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'})[file?.type]||'jpg'}
async function upload(file,folder){if(!file?.size)return null;if(file.size>10*1024*1024)throw new Error('Cada fotografia pode ter no máximo 10 MB.');const u=await user();const path=`${u.id}/${folder}/${crypto.randomUUID()}.${ext(file)}`;const {error}=await db.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||undefined});if(error)throw error;return path}
async function signed(path){if(!path)return'';const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,3600);if(error)throw error;return data.signedUrl}
function picked(fd,...names){for(const n of names){const f=fd.get(n);if(f instanceof File&&f.size)return f}return null}
function val(a,k){const v=a?.body_metrics?.[k];return v===''||v==null?null:Number(v)}
function delta(a,b,k){const x=val(a,k),y=val(b,k);return Number.isFinite(x)&&Number.isFinite(y)?x-y:null}
function score(a,k='overall'){const v=k==='overall'?a?.scores?.overall:a?.scores?.categories?.[k];return Number.isFinite(Number(v))?Number(v):null}
function scoreText(v){return v==null?'—':Math.round(v)}

const originalOpenStudent=window.openStudent;
if(originalOpenStudent) window.openStudent=(id,tab='overview')=>{currentStudentId=id;originalOpenStudent(id,tab);setTimeout(()=>enhanceStudent(id,tab),0)};
const originalStudentTab=window.studentTab;
if(originalStudentTab) window.studentTab=tab=>{originalStudentTab(tab);setTimeout(()=>enhanceStudent(currentStudentId,tab),0)};
const originalNav=window.nav;
if(originalNav) window.nav=v=>{originalNav(v);if(v==='calendar')setTimeout(()=>window.ttRenderCalendar?.(),0)};

async function enhanceStudent(id,tab='overview'){
 if(!id)return;
 try{
   const {data:s}=await db.from('traintrack_students').select('*').eq('id',id).single();
   if(!s)return;
   if(s.photo_path){const url=await signed(s.photo_path);const a=document.querySelector('.profile-head .avatar.big');if(a){a.classList.add('photo');a.innerHTML=`<img src="${url}" alt="Fotografia de ${esc(s.name)}">`}}
   if(tab==='assessments')await addAssessmentSummaries(id);
   if(tab==='progress')await addProgressHero(id);
 }catch(e){console.warn('TrainTrack extension',e)}
}

async function addAssessmentSummaries(id){
 const body=document.querySelector('#studentBody');if(!body||body.querySelector('.tt-extra-assessments'))return;
 const {data:list,error}=await db.from('traintrack_assessments').select('*').eq('student_id',id).order('assessment_date');if(error)throw error;
 if(!list?.length)return;
 const wrap=document.createElement('div');wrap.className='tt-extra-assessments';
 wrap.innerHTML=`<div class="section-head"><div><h2>Medidas e fotografias</h2><p>Registo visual e corporal por avaliação.</p></div></div><div class="assessment-summaries"></div>`;
 body.appendChild(wrap);const grid=wrap.querySelector('.assessment-summaries');
 for(let i=list.length-1;i>=0;i--){const a=list[i],prev=i>0?list[i-1]:null,defs=metrics.filter(([k])=>val(a,k)!=null);let photos='';for(const p of (a.photo_paths||[])){try{photos+=`<img class="photo-thumb" src="${await signed(p)}" alt="Fotografia da avaliação">`}catch{}}
 grid.insertAdjacentHTML('beforeend',`<article class="card assessment-summary"><div class="assessment-summary-head"><div><strong>${fmtDate(a.assessment_date)}</strong><div class="stat-note">${defs.length} medidas · ${(a.photo_paths||[]).length} foto(s)</div></div><button class="secondary small" onclick="ttExportReport('${id}','${a.id}')">PDF</button></div>${defs.length?`<div class="measure-grid">${defs.map(([k,l,u])=>{const d=delta(a,prev,k);return `<div class="measure"><span>${l}</span><strong>${val(a,k)} ${u}</strong><small>${d==null?'Sem comparação':`${d>0?'+':''}${d.toFixed(1)} ${u} vs anterior`}</small></div>`}).join('')}</div>`:'<div class="stat-note">Sem medidas corporais nesta avaliação.</div>'}${photos?`<div class="photo-grid">${photos}</div>`:''}</article>`)}
}

async function addProgressHero(id){
 const body=document.querySelector('#studentBody');if(!body||body.querySelector('.tt-progress-hero'))return;
 const [{data:s},{data:list,error},{data:tests}]=await Promise.all([db.from('traintrack_students').select('*').eq('id',id).single(),db.from('traintrack_assessments').select('*').eq('student_id',id).order('assessment_date'),db.from('traintrack_test_definitions').select('*').eq('active',true).order('sort_order')]);if(error)throw error;
 const latest=list?.at(-1),prev=list?.at(-2),overall=score(latest),prevOverall=score(prev),d=overall!=null&&prevOverall!=null?overall-prevOverall:null,cats=[...new Set((tests||[]).map(t=>t.category).filter(Boolean))];
 const box=document.createElement('div');box.className='tt-progress-hero';box.innerHTML=`<div class="progress-hero"><div class="progress-hero-main"><div><div class="eyebrow">PERFIL FÍSICO</div><h2>${esc(s?.name||'Aluno')}</h2><p>${latest?`Última avaliação: ${fmtDate(latest.assessment_date)}`:'Ainda sem avaliações'}</p></div><button class="primary" onclick="ttExportReport('${id}')">Exportar relatório PDF</button></div><div class="score-layout"><div class="overall-score"><span>OVERALL</span><strong>${scoreText(overall)}</strong><small>${overall==null?'Fórmula por definir':`/ 100${d!=null?` · ${d>=0?'+':''}${d.toFixed(0)} vs anterior`:''}`}</small></div><div class="category-score-grid">${cats.map(c=>{const x=score(latest,c),p=score(prev,c),cd=x!=null&&p!=null?x-p:null;return `<div class="category-score"><span>${esc(c)}</span><strong>${scoreText(x)}</strong><small>${x==null?'Fórmula por definir':cd==null?'Sem comparação':`${cd>=0?'+':''}${cd.toFixed(0)} vs anterior`}</small></div>`}).join('')}</div></div></div><div class="notice" style="margin:0 0 13px">O “player card” está pronto, mas sem inventar pontuações. Quando definires a fórmula, o Overall e os scores por área passam a ser calculados aqui.</div>${latest?`<div class="measure-grid large">${metrics.filter(([k])=>val(latest,k)!=null).map(([k,l,u])=>{const md=delta(latest,prev,k);return `<div class="card measure progress-measure"><span>${l}</span><strong>${val(latest,k)} ${u}</strong><small>${md==null?'Sem comparação anterior':`${md>0?'+':''}${md.toFixed(1)} ${u} vs anterior`}</small></div>`}).join('')}</div>`:''}`;
 body.prepend(box);
}

const originalStudentModal=window.studentModal;
if(originalStudentModal) window.studentModal=id=>{currentStudentId=id||null;originalStudentModal(id);setTimeout(()=>{const form=document.querySelector('#modalRoot form');if(!form||form.querySelector('[name="photo_file"]'))return;const notes=form.querySelector('textarea[name="notes"]')?.closest('.field');const block=document.createElement('div');block.className='field full';block.innerHTML='<label>Fotografia do aluno <span class="optional">opcional</span></label><div class="media-actions"><label class="secondary file-button">Carregar foto<input hidden type="file" name="photo_file" accept="image/*"></label><label class="secondary file-button">Abrir câmara<input hidden type="file" name="photo_camera" accept="image/*" capture="environment"></label></div>';(notes||form.querySelector('.form-actions'))?.before(block)},0)};

window.saveStudent=async(e,id)=>{e.preventDefault();const fd=new FormData(e.target),photo=picked(fd,'photo_file','photo_camera'),row={name:fd.get('name')?.trim(),phone:fd.get('phone')?.trim(),email:fd.get('email')?.trim(),birth_date:fd.get('birth_date'),height_cm:Number(fd.get('height_cm'))||null,weight_kg:Number(fd.get('weight_kg'))||null,evaluation_interval_months:Number(fd.get('evaluation_interval_months'))||0,evaluation_alert_days:Number(fd.get('evaluation_alert_days'))||0,notes:fd.get('notes')?.trim(),archived:false};try{let r=id?await db.from('traintrack_students').update(row).eq('id',id).select().single():await db.from('traintrack_students').insert(row).select().single();if(r.error)throw r.error;if(photo){const path=await upload(photo,`students/${r.data.id}/profile`);const u=await db.from('traintrack_students').update({photo_path:path}).eq('id',r.data.id);if(u.error)throw u.error}sessionStorage.setItem('tt_restore_student',r.data.id);location.reload()}catch(err){toast(err.message||'Erro ao guardar aluno.',true)}};

const originalAssessmentModal=window.assessmentModal;
if(originalAssessmentModal) window.assessmentModal=id=>{currentStudentId=id||currentStudentId;originalAssessmentModal(id);setTimeout(()=>{const form=document.querySelector('#modalRoot form');if(!form||form.querySelector('[name="metric_weight_kg"]'))return;const grid=form.querySelector('.form-grid');const notes=grid.querySelector('textarea[name="notes"]')?.closest('.field');const block=document.createElement('div');block.className='field full tt-assessment-extra';block.innerHTML=`<div class="form-section"><strong>Medidas corporais</strong><span>Todas opcionais.</span></div><div class="measure-input-grid">${metrics.map(([k,l,u])=>`<div class="field"><label>${l} (${u})</label><input name="metric_${k}" type="number" min="0" step="0.1"></div>`).join('')}</div><div class="form-section"><strong>Fotografias da avaliação</strong><span>Upload ou câmara do telemóvel.</span></div><div class="media-actions"><label class="secondary file-button">Carregar fotografias<input hidden type="file" name="assessment_photos" accept="image/*" multiple></label><label class="secondary file-button">Tirar fotografia<input hidden type="file" name="assessment_camera" accept="image/*" capture="environment"></label></div>`;(notes||grid.lastElementChild)?.before(block)},0)};

window.saveAssessment=async e=>{e.preventDefault();const fd=new FormData(e.target),studentId=fd.get('student_id'),values={},body_metrics={};document.querySelectorAll('#modalRoot [name^="test_"]').forEach(i=>values[i.name.slice(5)]=i.value.trim());metrics.forEach(([k])=>{const x=fd.get(`metric_${k}`);if(x!==''&&x!=null)body_metrics[k]=Number(x)});const files=[...fd.getAll('assessment_photos'),fd.get('assessment_camera')].filter(f=>f instanceof File&&f.size);try{let r=await db.from('traintrack_assessments').insert({student_id:studentId,assessment_date:fd.get('assessment_date'),values,scores:{},body_metrics,photo_paths:[],notes:fd.get('notes')?.trim()}).select().single();if(r.error)throw r.error;if(files.length){const paths=[];for(const f of files)paths.push(await upload(f,`students/${studentId}/assessments/${r.data.id}`));const u=await db.from('traintrack_assessments').update({photo_paths:paths}).eq('id',r.data.id);if(u.error)throw u.error}if(Number.isFinite(body_metrics.weight_kg)){await db.from('traintrack_students').update({weight_kg:body_metrics.weight_kg}).eq('id',studentId)}sessionStorage.setItem('tt_restore_student',studentId);sessionStorage.setItem('tt_restore_tab','assessments');location.reload()}catch(err){toast(err.message||'Erro ao guardar avaliação.',true)}};

window.TTEX={db,BUCKET,metrics,esc,fmtDate,fmtDT,localDT,initials,toast,modal,close,signed,val,delta,score,scoreText};
function restore(){const id=sessionStorage.getItem('tt_restore_student');if(!id)return;const tab=sessionStorage.getItem('tt_restore_tab')||'overview';sessionStorage.removeItem('tt_restore_student');sessionStorage.removeItem('tt_restore_tab');let n=0;const t=setInterval(()=>{if(window.openStudent&&document.querySelector('.shell')){clearInterval(t);window.openStudent(id,tab)}else if(++n>30)clearInterval(t)},200)}
setTimeout(restore,250);
})();
