(() => {
'use strict';
const X=window.TTEX;if(!X)return;
const {db,esc,localDT,toast,modal,close}=X;

const css=document.createElement('style');css.textContent=`
.tt-event-scope{padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:#f7f9fc;margin-bottom:12px}.tt-event-scope label{display:block;font-size:11px;font-weight:800;color:#566379;margin-bottom:6px}.tt-event-scope select{width:100%}.tt-event-delete{margin-right:auto}.tt-event-series-note{font-size:10px;line-height:1.45;color:var(--muted);margin-top:6px}.tt-event-edit-form .form-actions{align-items:center}@media(max-width:640px){.tt-event-edit-form .form-actions{display:grid;grid-template-columns:1fr 1fr}.tt-event-edit-form .form-actions .tt-event-delete{grid-column:1/-1;margin:0}.tt-event-edit-form .form-actions button{width:100%}}
`;document.head.appendChild(css);

const recurLabel=v=>({none:'Não repetir',weekly:'Semanalmente',biweekly:'Quinzenalmente',monthly:'Mensalmente'})[v]||'Não repetir';
const exceptions=ev=>Array.isArray(ev?.recurrence_exceptions)?ev.recurrence_exceptions:[];
const sameInstant=(a,b)=>Math.abs(new Date(a).getTime()-new Date(b).getTime())<1000;
const localDate=d=>{const x=new Date(d);return`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const previousLocalDate=d=>{const x=new Date(d);x.setDate(x.getDate()-1);return localDate(x)};
const byTime=(a,b)=>new Date(a).getTime()-new Date(b).getTime();

async function refresh(){close();await window.ttRenderCalendar?.()}
async function loadEvent(id){const {data,error}=await db.from('traintrack_events').select('*').eq('id',id).single();if(error)throw error;return data}
async function addException(ev,occurrenceIso){const next=[...new Set([...exceptions(ev),occurrenceIso])].sort(byTime);const {error}=await db.from('traintrack_events').update({recurrence_exceptions:next}).eq('id',ev.id);if(error)throw error}

window.ttEventScopeChanged=function(el){
  const form=el.form;if(!form)return;const scope=el.value;
  const start=form.elements.starts_at,end=form.elements.ends_at;
  if(scope==='all'){
    start.value=form.dataset.masterStart||start.value;
    end.value=form.dataset.masterEnd||end.value;
  }else{
    start.value=form.dataset.occStart||start.value;
    end.value=form.dataset.occEnd||end.value;
  }
  form.querySelectorAll('.tt-edit-recurrence').forEach(block=>block.style.display=scope==='single'?'none':'flex');
};

window.ttOpenEvent=async function(eventId,occurrenceIso=''){
  try{
    const [evRes,studentsRes]=await Promise.all([
      db.from('traintrack_events').select('*').eq('id',eventId).single(),
      db.from('traintrack_students').select('id,name').eq('archived',false).eq('client_status','active').order('name')
    ]);
    if(evRes.error)throw evRes.error;if(studentsRes.error)throw studentsRes.error;
    const ev=evRes.data,recurring=(ev.recurrence||'none')!=='none';
    const occStart=occurrenceIso?new Date(occurrenceIso):new Date(ev.starts_at),duration=new Date(ev.ends_at)-new Date(ev.starts_at),occEnd=new Date(occStart.getTime()+duration);
    const studentOptions=[...(studentsRes.data||[])];
    if(!studentOptions.some(s=>s.id===ev.student_id)){
      const {data:current}=await db.from('traintrack_students').select('id,name').eq('id',ev.student_id).maybeSingle();
      if(current)studentOptions.unshift(current);
    }
    const scope=recurring?`<div class="tt-event-scope"><label>Aplicar alterações a</label><select name="scope" onchange="ttEventScopeChanged(this)"><option value="single">Só esta marcação</option><option value="following">Esta e as seguintes</option><option value="all">Toda a série</option></select><div class="tt-event-series-note">Série atual: ${esc(recurLabel(ev.recurrence))}${ev.recurrence_until?` · até ${esc(ev.recurrence_until)}`:' · sem data final'}</div></div>`:'';
    modal(`<div class="modal-head"><div><h2>Editar marcação</h2>${recurring?`<div class="stat-note">Ocorrência de ${esc(localDate(occStart))}</div>`:''}</div><button class="icon-btn" onclick="closeModal()">×</button></div><form class="tt-event-edit-form" data-master-start="${esc(localDT(new Date(ev.starts_at)))}" data-master-end="${esc(localDT(new Date(ev.ends_at)))}" data-occ-start="${esc(localDT(occStart))}" data-occ-end="${esc(localDT(occEnd))}" onsubmit="ttSaveCalendarEventEdit(event,'${ev.id}','${esc(occStart.toISOString())}')">${scope}<div class="form-grid"><div class="field full"><label>Aluno</label><select name="student_id" required>${studentOptions.map(s=>`<option value="${s.id}" ${s.id===ev.student_id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Início</label><input type="datetime-local" name="starts_at" value="${esc(localDT(occStart))}" required></div><div class="field"><label>Fim</label><input type="datetime-local" name="ends_at" value="${esc(localDT(occEnd))}" required></div><div class="field"><label>Tipo</label><select name="event_type">${['Treino','Avaliação','Consulta','Outro'].map(v=>`<option ${v===ev.event_type?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Local</label><input name="location" value="${esc(ev.location||'')}"></div><div class="field tt-edit-recurrence" style="${recurring?'display:none':''}"><label>Recorrência</label><select name="recurrence"><option value="none" ${ev.recurrence==='none'?'selected':''}>Não repetir</option><option value="weekly" ${ev.recurrence==='weekly'?'selected':''}>Semanalmente</option><option value="biweekly" ${ev.recurrence==='biweekly'?'selected':''}>Quinzenalmente</option><option value="monthly" ${ev.recurrence==='monthly'?'selected':''}>Mensalmente</option></select></div><div class="field tt-edit-recurrence" style="${recurring?'display:none':''}"><label>Repetir até <span class="optional">opcional</span></label><input type="date" name="recurrence_until" value="${esc(ev.recurrence_until||'')}"></div><div class="field full"><label>Notas</label><textarea name="notes">${esc(ev.notes||'')}</textarea></div></div><div class="form-actions"><button type="button" class="danger tt-event-delete" onclick="ttDeleteCalendarEvent('${ev.id}','${esc(occStart.toISOString())}',this.form.elements.scope?.value||'all')">Eliminar</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Guardar alterações</button></div></form>`);
  }catch(e){toast(e.message||'Não foi possível abrir a marcação.',true)}
};

window.ttSaveCalendarEventEdit=async function(e,eventId,occurrenceIso){
  e.preventDefault();const fd=new FormData(e.target);
  try{
    const ev=await loadEvent(eventId),recurring=(ev.recurrence||'none')!=='none',scope=recurring?(fd.get('scope')||'single'):'all';
    const st=new Date(fd.get('starts_at')),en=new Date(fd.get('ends_at'));if(en<=st)return toast('A hora de fim tem de ser posterior ao início.',true);
    const recurrence=scope==='single'?'none':(fd.get('recurrence')||ev.recurrence||'none');
    const row={student_id:fd.get('student_id'),starts_at:st.toISOString(),ends_at:en.toISOString(),event_type:fd.get('event_type'),location:String(fd.get('location')||'').trim()||null,notes:String(fd.get('notes')||'').trim()||null,status:ev.status||'scheduled',recurrence,recurrence_until:recurrence==='none'?null:(fd.get('recurrence_until')||null)};

    if(!recurring){
      const {error}=await db.from('traintrack_events').update({...row,recurrence_exceptions:[]}).eq('id',eventId);if(error)throw error;
    }else if(scope==='single'){
      await addException(ev,occurrenceIso);
      const {error}=await db.from('traintrack_events').insert({...row,series_key:ev.series_key,recurrence:'none',recurrence_until:null,recurrence_exceptions:[]});if(error)throw error;
    }else if(scope==='following'){
      if(sameInstant(occurrenceIso,ev.starts_at)){
        const {error}=await db.from('traintrack_events').update({...row,recurrence_exceptions:exceptions(ev)}).eq('id',eventId);if(error)throw error;
      }else{
        const cut=new Date(occurrenceIso).getTime(),oldEx=exceptions(ev).filter(x=>new Date(x).getTime()<cut),futureEx=recurrence===ev.recurrence?exceptions(ev).filter(x=>new Date(x).getTime()>=cut):[];
        const first=await db.from('traintrack_events').update({recurrence_until:previousLocalDate(occurrenceIso),recurrence_exceptions:oldEx}).eq('id',eventId);if(first.error)throw first.error;
        const second=await db.from('traintrack_events').insert({...row,series_key:ev.series_key,recurrence_exceptions:futureEx});if(second.error)throw second.error;
      }
    }else{
      const keepExceptions=recurrence===ev.recurrence?exceptions(ev):[];
      const {error}=await db.from('traintrack_events').update({...row,recurrence_exceptions:keepExceptions}).eq('id',eventId);if(error)throw error;
    }
    toast('Marcação atualizada.');await refresh();
  }catch(err){toast(err.message||'Erro ao atualizar marcação.',true)}
};

window.ttDeleteCalendarEvent=async function(eventId,occurrenceIso,scope='all'){
  const text=scope==='single'?'Eliminar apenas esta marcação?':scope==='following'?'Eliminar esta marcação e todas as seguintes?':'Eliminar toda a série?';
  if(!confirm(text))return;
  try{
    const ev=await loadEvent(eventId),recurring=(ev.recurrence||'none')!=='none';
    if(!recurring){
      const {error}=await db.from('traintrack_events').delete().eq('id',eventId);if(error)throw error;
    }else if(scope==='all'){
      const {error}=await db.from('traintrack_events').delete().eq('series_key',ev.series_key);if(error)throw error;
    }else if(scope==='single'){
      await addException(ev,occurrenceIso);
    }else if(scope==='following'){
      if(sameInstant(occurrenceIso,ev.starts_at)){
        const {error}=await db.from('traintrack_events').delete().eq('id',eventId);if(error)throw error;
      }else{
        const cut=new Date(occurrenceIso).getTime(),oldEx=exceptions(ev).filter(x=>new Date(x).getTime()<cut);
        const {error}=await db.from('traintrack_events').update({recurrence_until:previousLocalDate(occurrenceIso),recurrence_exceptions:oldEx}).eq('id',eventId);if(error)throw error;
      }
    }
    toast('Marcação eliminada.');await refresh();
  }catch(err){toast(err.message||'Erro ao eliminar marcação.',true)}
};
})();