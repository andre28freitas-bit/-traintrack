(() => {
'use strict';
const X=window.TTEX;if(!X)return;
const db=X.db,esc=X.esc,fmtDT=X.fmtDT,localDT=X.localDT,toast=X.toast,modal=X.modal,close=X.close;
const WEEKDAYS=[['1','Seg'],['2','Ter'],['3','Qua'],['4','Qui'],['5','Sex'],['6','Sáb'],['0','Dom']];
const DAY_NAMES=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function daysOf(ev,start){const xs=Array.isArray(ev&&ev.recurrence_days)?ev.recurrence_days.map(Number).filter(n=>n>=0&&n<=6):[];return xs.length?xs:[start.getDay()]}
function labelDays(ev){return daysOf(ev,new Date(ev.starts_at)).map(n=>DAY_NAMES[n]).join(', ')}
function stamp(d){return new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}
function icsEsc(v){return String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function buildICS(ev,studentName){
  let rr='';
  if(ev.recurrence==='weekly'){
    const codes=['SU','MO','TU','WE','TH','FR','SA'];
    const by=daysOf(ev,new Date(ev.starts_at)).map(n=>codes[n]).join(',');
    rr='RRULE:FREQ=WEEKLY'+(by?';BYDAY='+by:'');
  }else if(ev.recurrence==='biweekly')rr='RRULE:FREQ=WEEKLY;INTERVAL=2';
  else if(ev.recurrence==='monthly')rr='RRULE:FREQ=MONTHLY';
  if(rr&&ev.recurrence_until)rr+=';UNTIL='+stamp(new Date(ev.recurrence_until+'T23:59:59'));
  const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TrainTrack//PT//PT','BEGIN:VEVENT','UID:'+ev.id+'@traintrack','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(ev.starts_at),'DTEND:'+stamp(ev.ends_at),'SUMMARY:'+icsEsc((ev.event_type||'Treino')+' — '+(studentName||'Aluno'))];
  if(ev.location)rows.push('LOCATION:'+icsEsc(ev.location));
  if(ev.notes)rows.push('DESCRIPTION:'+icsEsc(ev.notes));
  if(rr)rows.push(rr);
  rows.push('END:VEVENT','END:VCALENDAR');
  return rows.join('\r\n');
}
function fileFor(ev,name){return new File([buildICS(ev,name)],'traintrack-sessao.ics',{type:'text/calendar'})}
function download(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function loadEvent(id){
  const [er,sr]=await Promise.all([
    db.from('traintrack_events').select('*').eq('id',id).single(),
    db.from('traintrack_events').select('student_id').eq('id',id).single()
  ]);
  if(er.error)throw er.error;
  let name='Aluno';
  if(sr.data&&sr.data.student_id){
    const st=await db.from('traintrack_students').select('name').eq('id',sr.data.student_id).maybeSingle();
    if(st.data&&st.data.name)name=st.data.name;
  }
  return {ev:er.data,name};
}
window.ttAddCalendar=async function(id){try{const x=await loadEvent(id);download(fileFor(x.ev,x.name))}catch(e){toast(e.message||'Erro ao preparar calendário.',true)}};
window.ttShareCalendar=async function(id){
  try{
    const x=await loadEvent(id),file=fileFor(x.ev,x.name);
    if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({title:'Sessão TrainTrack',text:'Adicionar esta sessão ao calendário.',files:[file]});
    else{download(file);toast('Ficheiro de calendário preparado para partilhares com o aluno.')}
  }catch(e){if(e&&e.name!=='AbortError')toast(e.message||'Erro ao partilhar calendário.',true)}
};
window.ttToggleRecurrence=function(el){
  const until=document.querySelector('#ttRecurrenceUntil'),days=document.querySelector('#ttRecurrenceDays');
  if(until)until.style.display=el.value==='none'?'none':'flex';
  if(days)days.style.display=el.value==='weekly'?'flex':'none';
};
window.eventModal=function(id){
  const st=new Date();st.setMinutes(Math.ceil(st.getMinutes()/15)*15,0,0);const en=new Date(st.getTime()+3600000);
  db.from('traintrack_students').select('id,name').eq('archived',false).order('name').then(function(res){
    const opts=(res.data||[]).map(function(s){return '<option value="'+s.id+'" '+(s.id===id?'selected':'')+'>'+esc(s.name)+'</option>'}).join('');
    const days=WEEKDAYS.map(function(x){return '<label><input type="checkbox" name="recurrence_days" value="'+x[0]+'" '+(Number(x[0])===st.getDay()?'checked':'')+'><span>'+x[1]+'</span></label>'}).join('');
    const html='<div class="modal-head"><h2>Nova marcação</h2><button class="icon-btn" onclick="closeModal()">×</button></div>'+
      '<form onsubmit="ttSaveEvent(event)"><div class="form-grid">'+
      '<div class="field full"><label>Aluno</label><select name="student_id" required><option value="">Selecionar…</option>'+opts+'</select></div>'+
      '<div class="field"><label>Início</label><input type="datetime-local" name="starts_at" value="'+localDT(st)+'" required></div>'+
      '<div class="field"><label>Fim</label><input type="datetime-local" name="ends_at" value="'+localDT(en)+'" required></div>'+
      '<div class="field"><label>Tipo</label><select name="event_type"><option>Treino</option><option>Avaliação</option><option>Consulta</option><option>Outro</option></select></div>'+
      '<div class="field"><label>Local</label><input name="location"></div>'+
      '<div class="field"><label>Recorrência</label><select name="recurrence" onchange="ttToggleRecurrence(this)"><option value="none">Não repetir</option><option value="weekly">Semanalmente</option><option value="biweekly">Quinzenalmente</option><option value="monthly">Mensalmente</option></select></div>'+
      '<div class="field full tt-weekday-field" id="ttRecurrenceDays" style="display:none"><label>Dias da semana</label><div class="tt-weekday-options">'+days+'</div><span class="field-hint">Podes escolher vários dias, por exemplo terça e quinta.</span></div>'+
      '<div class="field" id="ttRecurrenceUntil" style="display:none"><label>Repetir até <span class="optional">opcional</span></label><input type="date" name="recurrence_until"><span class="field-hint">Vazio = continua até ser alterado.</span></div>'+
      '<div class="field full"><label>Notas</label><textarea name="notes"></textarea></div></div>'+
      '<div class="notice" style="margin-top:12px">Ao guardar, podes adicionar imediatamente a marcação ao calendário ou enviar o ficheiro de calendário ao aluno.</div>'+
      '<div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Agendar</button></div></form>';
    modal(html);
  });
};
window.ttSaveEvent=async function(e){
  e.preventDefault();const fd=new FormData(e.target),st=new Date(fd.get('starts_at')),en=new Date(fd.get('ends_at'));
  if(en<=st)return toast('A hora de fim tem de ser posterior ao início.',true);
  const recurrence=String(fd.get('recurrence')||'none'),until=fd.get('recurrence_until')||null;
  let recurrence_days=recurrence==='weekly'?fd.getAll('recurrence_days').map(Number).filter(n=>n>=0&&n<=6):[];
  if(recurrence==='weekly'&&!recurrence_days.length)recurrence_days=[st.getDay()];
  try{
    const row={student_id:fd.get('student_id'),starts_at:st.toISOString(),ends_at:en.toISOString(),event_type:fd.get('event_type'),location:String(fd.get('location')||'').trim()||null,notes:String(fd.get('notes')||'').trim()||null,status:'scheduled',recurrence:recurrence,recurrence_days:recurrence_days,recurrence_until:until};
    const r=await db.from('traintrack_events').insert(row).select().single();if(r.error)throw r.error;
    await window.ttRenderCalendar?.();
    const d=r.data,rec=d.recurrence!=='none'?' · '+(d.recurrence==='weekly'?'Semanalmente ('+labelDays(d)+')':d.recurrence==='biweekly'?'Quinzenalmente':'Mensalmente'):'';
    const html='<div class="modal-head"><h2>Marcação criada</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="success-panel">'+
      '<p>'+esc(fmtDT(d.starts_at))+' · '+esc(d.event_type)+esc(rec)+'</p>'+
      '<div class="actions"><button class="primary" onclick="ttAddCalendar(\''+d.id+'\')">📅 Adicionar ao calendário</button>'+
      '<button class="secondary" onclick="ttShareCalendar(\''+d.id+'\')">↗ Enviar calendário ao aluno</button>'+
      '<button class="success" onclick="ttStudentContact(\''+d.student_id+'\',\'whatsapp\')">WhatsApp</button>'+
      '<button class="secondary" onclick="ttStudentContact(\''+d.student_id+'\',\'sms\')">SMS</button>'+
      '<button class="secondary" onclick="ttStudentContact(\''+d.student_id+'\',\'email\')">Email</button>'+
      '<button class="secondary" onclick="ttStudentContact(\''+d.student_id+'\',\'call\')">☎ Ligar</button></div></div>';
    modal(html);
  }catch(err){toast(err.message||'Erro ao criar marcação.',true)}
};
})();