(() => {
'use strict';

const X=window.TTEX;
const db=X?.db;
if(!db)return;
const esc=X.esc||((v)=>String(v??''));
const toast=X.toast||(()=>{});
const cfg=window.TRAINTRACK_CONFIG||{};
const CONFIRM_BASE=`${String(cfg.supabaseUrl||'').replace(/\/$/,'')}/functions/v1/traintrack-confirm`;
let busy=false;

const style=document.createElement('style');
style.textContent=`
.tt-tomorrow{margin:14px 0 18px}
.tt-tomorrow-list{display:grid;gap:9px}
.tt-reminder-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 13px;border:1px solid var(--border);border-radius:13px;background:#fff}
.tt-reminder-main strong{display:block;font-size:13px}.tt-reminder-main small{display:block;color:var(--muted);font-size:10px;margin-top:3px}
.tt-reminder-status{display:inline-flex;margin-top:6px;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:800;background:#eef2f7;color:#5b677a}
.tt-reminder-status.confirmed{background:#e8f8f0;color:#08794b}.tt-reminder-status.declined{background:#fff0f0;color:#aa2d2d}
.tt-reminder-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.tt-reminder-actions button{min-height:31px;padding:5px 8px;font-size:9.5px}
.tt-contact-mini{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.tt-contact-mini button{min-height:28px;padding:4px 7px;font-size:9px}
@media(max-width:700px){.tt-reminder-row{grid-template-columns:1fr}.tt-reminder-actions{justify-content:stretch;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.tt-reminder-actions button{width:100%}}
`;
document.head.appendChild(style);

function phoneDigits(v){
  let d=String(v||'').replace(/\D/g,'');
  if(d.startsWith('00'))d=d.slice(2);
  if(d.length===9)d=`351${d}`;
  return d;
}
function firstName(name){return String(name||'').trim().split(/\s+/)[0]||'Olá'}
function localDateKey(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function isExcluded(ev,d){const t=d.getTime();return (Array.isArray(ev.recurrence_exceptions)?ev.recurrence_exceptions:[]).some(x=>Math.abs(new Date(x).getTime()-t)<1000)}
function weeklyDays(ev,start){
  const xs=Array.isArray(ev.recurrence_days)?ev.recurrence_days.map(Number).filter(n=>n>=0&&n<=6):[];
  return xs.length?xs:[start.getDay()];
}
function occurrences(ev,a,b){
  const s=new Date(ev.starts_at),e=new Date(ev.ends_at),dur=e-s,r=ev.recurrence||'none',until=ev.recurrence_until?new Date(`${ev.recurrence_until}T23:59:59`):null,out=[];
  if(r==='none'){if(s<=b&&e>=a&&!isExcluded(ev,s))out.push({...ev,_start:s});return out}
  if(r==='weekly'){
    const days=weeklyDays(ev,s),cur=new Date(s),limit=Math.min(b.getTime(),until?.getTime()??b.getTime());let n=0;
    while(cur.getTime()<=limit&&n++<800){
      if(cur>=s&&days.includes(cur.getDay())&&new Date(cur.getTime()+dur)>=a&&!isExcluded(ev,cur))out.push({...ev,_start:new Date(cur)});
      cur.setDate(cur.getDate()+1);
    }
    return out;
  }
  let cur=new Date(s),n=0;
  while(cur<=b&&n++<600){
    if((!until||cur<=until)&&new Date(cur.getTime()+dur)>=a&&!isExcluded(ev,cur))out.push({...ev,_start:new Date(cur)});
    const nx=new Date(cur);
    if(r==='biweekly')nx.setDate(nx.getDate()+14);
    else if(r==='monthly'){const day=nx.getDate();nx.setDate(1);nx.setMonth(nx.getMonth()+1);nx.setDate(Math.min(day,new Date(nx.getFullYear(),nx.getMonth()+1,0).getDate()))}
    else break;
    cur=nx;
  }
  return out;
}
async function getStudent(id){
  const {data,error}=await db.from('traintrack_students').select('id,name,phone,email').eq('id',id).maybeSingle();
  if(error)throw error;return data;
}
async function getEvent(id){
  const {data,error}=await db.from('traintrack_events').select('*').eq('id',id).single();
  if(error)throw error;return data;
}
async function ensureOccurrence(eventId,occurrenceIso){
  const iso=new Date(occurrenceIso).toISOString();
  let {data,error}=await db.from('traintrack_event_occurrences').select('*').eq('event_id',eventId).eq('occurrence_start',iso).maybeSingle();
  if(error)throw error;
  if(data)return data;
  const inserted=await db.from('traintrack_event_occurrences').insert({event_id:eventId,occurrence_start:iso}).select().single();
  if(inserted.error){
    const retry=await db.from('traintrack_event_occurrences').select('*').eq('event_id',eventId).eq('occurrence_start',iso).maybeSingle();
    if(retry.error||!retry.data)throw inserted.error;
    return retry.data;
  }
  return inserted.data;
}
function formatWhen(d,includeDay=true){
  return new Intl.DateTimeFormat('pt-PT',includeDay?{weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}:{hour:'2-digit',minute:'2-digit'}).format(new Date(d));
}
function confirmationUrl(token){return `${CONFIRM_BASE}?token=${encodeURIComponent(token)}`}
function reminderMessage(student,ev,occ,url,isTomorrow=false){
  const name=firstName(student?.name);
  const when=isTomorrow?`amanhã às ${formatWhen(occ,false)}`:formatWhen(occ,true);
  return `Olá ${name} 👋 Só para relembrar o teu ${String(ev?.event_type||'treino').toLowerCase()} ${when}. Podes confirmar se vais ou indicar que não consegues ir aqui: ${url}`;
}
async function openContact(student,channel,message='',subject='TrainTrack'){
  if(!student)return toast('Aluno não encontrado.',true);
  const number=phoneDigits(student.phone);
  if(channel==='call'){
    if(!number)return toast('Este aluno não tem contacto telefónico.',true);
    window.location.href=`tel:+${number}`;return;
  }
  if(channel==='email'){
    if(!student.email)return toast('Este aluno não tem email.',true);
    window.location.href=`mailto:${encodeURIComponent(student.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message||`Olá ${firstName(student.name)},`)}`;return;
  }
  if(!number)return toast('Este aluno não tem contacto telefónico.',true);
  if(channel==='sms'){window.location.href=`sms:+${number}?&body=${encodeURIComponent(message||`Olá ${firstName(student.name)},`)}`;return}
  if(channel==='whatsapp'){
    const w=window.open(`https://wa.me/${number}?text=${encodeURIComponent(message||`Olá ${firstName(student.name)},`)}`,'_blank','noopener');
    if(!w)window.location.href=`https://wa.me/${number}?text=${encodeURIComponent(message||`Olá ${firstName(student.name)},`)}`;
  }
}
window.ttStudentContact=async(id,channel)=>{
  try{await openContact(await getStudent(id),channel)}catch(e){toast(e.message||'Não foi possível abrir o contacto.',true)}
};
window.ttEventContact=async(eventId,occurrenceIso,channel,isReminder=false)=>{
  const pre=channel==='whatsapp'?window.open('about:blank','_blank'):null;
  try{
    const [ev,occ]=await Promise.all([getEvent(eventId),ensureOccurrence(eventId,occurrenceIso)]);
    const student=await getStudent(ev.student_id);
    const msg=reminderMessage(student,ev,occurrenceIso,confirmationUrl(occ.response_token),isReminder);
    if(isReminder&&channel!=='call'){
      await db.from('traintrack_event_occurrences').update({reminder_sent_at:new Date().toISOString(),reminder_channel:channel,updated_at:new Date().toISOString()}).eq('id',occ.id);
    }
    if(channel==='whatsapp'){
      const number=phoneDigits(student?.phone);if(!number)throw new Error('Este aluno não tem contacto telefónico.');
      const url=`https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
      if(pre){pre.opener=null;pre.location.href=url}else window.location.href=url;
    }else await openContact(student,channel,msg,'Confirmação de treino');
    setTimeout(enhanceTomorrow,500);
  }catch(e){if(pre)pre.close();toast(e.message||'Não foi possível preparar a mensagem.',true)}
};

async function tomorrowRows(){
  const now=new Date(),a=new Date(now);a.setDate(a.getDate()+1);a.setHours(0,0,0,0);const b=new Date(a);b.setHours(23,59,59,999);
  const [{data:events,error:eErr},{data:students,error:sErr}]=await Promise.all([
    db.from('traintrack_events').select('*').lte('starts_at',b.toISOString()).order('starts_at'),
    db.from('traintrack_students').select('id,name,phone,email,archived').eq('archived',false)
  ]);
  if(eErr)throw eErr;if(sErr)throw sErr;
  const byId=new Map((students||[]).map(s=>[s.id,s]));
  const occs=(events||[]).flatMap(ev=>occurrences(ev,a,b)).filter(x=>x.event_type==='Treino'&&byId.has(x.student_id));
  const rows=[];
  for(const x of occs){
    const occ=await ensureOccurrence(x.id,x._start.toISOString());
    rows.push({event:x,student:byId.get(x.student_id),occ});
  }
  return rows.sort((a,b)=>a.event._start-b.event._start);
}
function statusLabel(v){return v==='confirmed'?'Confirmado ✓':v==='declined'?'Não pode ir':'A aguardar confirmação'}
function rowHtml(x){
  const ev=x.event,s=x.student,o=x.occ,time=formatWhen(ev._start,false);
  const sent=o.reminder_sent_at?` · lembrete enviado${o.reminder_channel?` via ${o.reminder_channel}`:''}`:'';
  return `<div class="tt-reminder-row"><div class="tt-reminder-main"><strong>${esc(time)} · ${esc(s.name)}</strong><small>${esc(ev.location||'Treino')}${esc(sent)}</small><span class="tt-reminder-status ${esc(o.response_status)}">${esc(statusLabel(o.response_status))}</span></div><div class="tt-reminder-actions"><button class="success" onclick="ttEventContact('${ev.id}','${ev._start.toISOString()}','whatsapp',true)">WhatsApp</button><button class="secondary" onclick="ttEventContact('${ev.id}','${ev._start.toISOString()}','sms',true)">SMS</button><button class="secondary" onclick="ttEventContact('${ev.id}','${ev._start.toISOString()}','email',true)">Email</button><button class="secondary" onclick="ttEventContact('${ev.id}','${ev._start.toISOString()}','call',true)">Ligar</button></div></div>`;
}
async function enhanceTomorrow(){
  if(busy||document.querySelector('#pageTitle')?.textContent?.trim()!=='Dashboard')return;
  const content=document.querySelector('#content');if(!content)return;
  busy=true;
  try{
    const rows=await tomorrowRows();
    let section=content.querySelector('.tt-tomorrow');
    if(!section){
      section=document.createElement('section');section.className='tt-tomorrow';
      const stats=content.querySelector('.grid.grid-4');stats?.after(section);
    }
    if(!section)return;
    section.innerHTML=`<div class="section-head"><div><h2>Treinos de amanhã</h2><p>Lembra o aluno e envia o link para confirmar ou indicar que não pode ir.</p></div><span class="pill">${rows.length}</span></div><div class="tt-tomorrow-list">${rows.length?rows.map(rowHtml).join(''):'<div class="card empty">Sem treinos amanhã.</div>'}</div>`;
  }catch(e){console.warn('TrainTrack reminders',e)}finally{busy=false}
}
window.ttRefreshTomorrowReminders=enhanceTomorrow;

async function enhanceCalendarCards(){
  const cards=[...document.querySelectorAll('#content .calendar .event')];
  if(!cards.length)return;
  const {data:states}=await db.from('traintrack_event_occurrences').select('event_id,occurrence_start,response_status');
  const map=new Map((states||[]).map(x=>[x.event_id+'|'+new Date(x.occurrence_start).toISOString(),x.response_status]));
  for(const card of cards){
    const raw=card.getAttribute('onclick')||'';
    const m=raw.match(/ttOpenEvent\('([^']+)'\s*,\s*'([^']+)'\)/);
    if(!m)continue;
    const eventId=m[1],occIso=new Date(m[2]).toISOString(),key=eventId+'|'+occIso;
    let status=card.querySelector('.tt-calendar-confirm-status');
    const value=map.get(key);
    if(value){
      if(!status){status=document.createElement('span');status.className='tt-reminder-status tt-calendar-confirm-status';card.appendChild(status)}
      status.className='tt-reminder-status tt-calendar-confirm-status '+value;
      status.textContent=statusLabel(value);
    }
    if(card.querySelector('.tt-contact-mini'))continue;
    const actions=document.createElement('div');actions.className='tt-contact-mini';
    actions.innerHTML='<button class="success" type="button">WA</button><button class="secondary" type="button">SMS</button><button class="secondary" type="button">Email</button><button class="secondary" type="button">☎</button>';
    const channels=['whatsapp','sms','email','call'];
    [...actions.querySelectorAll('button')].forEach((b,i)=>b.addEventListener('click',ev=>{ev.stopPropagation();window.ttEventContact(eventId,occIso,channels[i],false)}));
    card.appendChild(actions);
  }
}

let timer;
const applyEnhancements=()=>{enhanceTomorrow();enhanceCalendarCards().catch(e=>console.warn('TrainTrack calendar contacts',e))};
const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(applyEnhancements,70)});
obs.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
setTimeout(applyEnhancements,180);
})();