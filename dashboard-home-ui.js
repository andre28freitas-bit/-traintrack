(() => {
'use strict';

const X=window.TTEX;
const db=X?.db;
const esc=X?.esc || (v=>String(v??''));
const DEFAULT_BIRTHDAY_TEMPLATE='[Template de mensagem de aniversário a definir com o negócio]';
const birthdayPeople=new Map();
let busy=false;

const style=document.createElement('style');
style.textContent=`
@media(max-width:760px){
  #content > .grid.grid-4:first-child{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:10px!important;
  }
  #content > .grid.grid-4:first-child .stat{
    min-width:0;
    padding:13px 12px;
  }
  #content > .grid.grid-4:first-child .stat-label{
    font-size:11px;
    line-height:1.25;
    min-height:28px;
  }
  #content > .grid.grid-4:first-child .stat-value{
    font-size:24px;
    line-height:1.05;
  }
  #content > .grid.grid-4:first-child .stat-note{
    font-size:9.5px;
    line-height:1.25;
    margin-top:5px;
  }
  .tt-birthday-card{padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;overflow:visible!important}
  .tt-birthday-grid{display:grid;gap:10px;overflow:visible;padding:1px;scroll-snap-type:x proximity}
  .tt-birthday-grid.one-row{grid-template-rows:1fr;grid-auto-flow:column;grid-auto-columns:calc((100% - 10px)/2)}
  .tt-birthday-grid.two-rows{grid-template-rows:repeat(2,minmax(0,1fr));grid-auto-flow:column;grid-auto-columns:calc((100% - 10px)/2)}
  .tt-birthday-grid.scroll{overflow-x:auto;overscroll-behavior-inline:contain;padding-bottom:7px;-webkit-overflow-scrolling:touch}
  .tt-birthday-person{scroll-snap-align:start;min-width:0;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:8px}
  .tt-birthday-person strong{font-size:12px;line-height:1.25;overflow-wrap:anywhere}
  .tt-birthday-meta{display:flex;align-items:center;justify-content:space-between;gap:7px;color:var(--muted);font-size:9.5px}
  .tt-birthday-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto}
  .tt-birthday-actions button{min-height:32px;padding:5px 6px;border-radius:8px;font-size:9.5px;font-weight:800}
}
@media(min-width:761px){
  .tt-birthday-grid{display:grid;grid-template-columns:1fr;gap:8px}
  .tt-birthday-person{border-bottom:1px solid var(--border);padding:9px 0}
  .tt-birthday-person:last-child{border-bottom:0}
  .tt-birthday-meta{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:10px;margin-top:3px}
  .tt-birthday-actions{display:flex;gap:6px;margin-top:7px}
  .tt-birthday-actions button{min-height:30px;padding:4px 8px;font-size:9.5px}
}
`;
document.head.appendChild(style);

function nextBirthday(birthDate){
  if(!birthDate)return null;
  const now=new Date();now.setHours(0,0,0,0);
  const born=new Date(`${birthDate}T12:00:00`);
  let next=new Date(now.getFullYear(),born.getMonth(),born.getDate());
  next.setHours(0,0,0,0);
  if(next<now)next=new Date(now.getFullYear()+1,born.getMonth(),born.getDate());
  const days=Math.round((next-now)/86400000);
  return {next,days};
}
function fmtBirthday(d){return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'2-digit'}).format(d)}
function phoneDigits(v){
  let d=String(v||'').replace(/\D/g,'');
  if(d.startsWith('00'))d=d.slice(2);
  if(d.length===9)d=`351${d}`;
  return d;
}
function birthdayMessage(name){return `Olá ${name},\n\n${DEFAULT_BIRTHDAY_TEMPLATE}`}
function getPerson(id){return birthdayPeople.get(id)}

window.ttBirthdaySMS=id=>{
  const p=getPerson(id);if(!p)return;
  const number=phoneDigits(p.phone);if(!number)return X?.toast?.('Este aluno não tem contacto telefónico.',true);
  const body=encodeURIComponent(birthdayMessage(p.name));
  window.location.href=`sms:+${number}?&body=${body}`;
};
window.ttBirthdayWhatsApp=id=>{
  const p=getPerson(id);if(!p)return;
  const number=phoneDigits(p.phone);if(!number)return X?.toast?.('Este aluno não tem contacto telefónico.',true);
  const text=encodeURIComponent(birthdayMessage(p.name));
  window.open(`https://wa.me/${number}?text=${text}`,'_blank','noopener');
};

async function fetchBirthdayPeople(){
  if(!db)return [];
  let result=await db.from('traintrack_students').select('id,name,phone,birth_date,status,archived').eq('archived',false);
  if(result.error && /status/i.test(result.error.message||'')){
    result=await db.from('traintrack_students').select('id,name,phone,birth_date,archived').eq('archived',false);
  }
  if(result.error)throw result.error;
  return (result.data||[])
    .filter(s=>(s.status||'active')==='active')
    .map(s=>{const b=nextBirthday(s.birth_date);return b?{...s,...b}:null})
    .filter(Boolean)
    .filter(s=>s.days>=0&&s.days<=30)
    .sort((a,b)=>a.days-b.days||a.name.localeCompare(b.name,'pt'));
}

function personCard(s){
  const hasPhone=!!phoneDigits(s.phone);
  const when=s.days===0?'Hoje 🎉':`em ${s.days} dia${s.days===1?'':'s'}`;
  return `<article class="tt-birthday-person"><strong>🎂 ${esc(s.name)}</strong><div class="tt-birthday-meta"><span>${fmtBirthday(s.next)}</span><span class="pill amber">${when}</span></div><div class="tt-birthday-actions"><button class="secondary" ${hasPhone?'': 'disabled'} onclick="ttBirthdaySMS('${s.id}')">SMS</button><button class="success" ${hasPhone?'': 'disabled'} onclick="ttBirthdayWhatsApp('${s.id}')">WhatsApp</button></div></article>`;
}

async function enhanceBirthdays(){
  if(busy||document.querySelector('#pageTitle')?.textContent?.trim()!=='Dashboard')return;
  const title=[...document.querySelectorAll('#content .section-head h2')].find(el=>el.textContent.trim()==='Aniversários');
  if(!title)return;
  const head=title.closest('.section-head');
  const list=head?.nextElementSibling;
  if(!list||list.dataset.ttBirthdayEnhanced==='1')return;

  busy=true;
  try{
    if(!head.querySelector('.tt-birthday-window')){
      const wrap=head.querySelector('div');
      if(wrap){const p=document.createElement('p');p.className='tt-birthday-window';p.textContent='Próximos 30 dias';wrap.appendChild(p)}
    }
    const people=await fetchBirthdayPeople();
    if(!document.body.contains(list))return;
    birthdayPeople.clear();people.forEach(p=>birthdayPeople.set(p.id,p));
    list.dataset.ttBirthdayEnhanced='1';
    list.classList.add('tt-birthday-card');
    if(!people.length){
      list.innerHTML='<div class="card empty tt-no-birthdays">Sem aniversários nos próximos 30 dias.</div>';
      return;
    }
    const mode=people.length<=2?'one-row':'two-rows';
    const scroll=people.length>4?' scroll':'';
    list.innerHTML=`<div class="tt-birthday-grid ${mode}${scroll}">${people.map(personCard).join('')}</div>`;
  }catch(error){
    console.warn('TrainTrack birthdays:',error?.message||error);
  }finally{busy=false}
}

function apply(){
  if(document.querySelector('#pageTitle')?.textContent?.trim()!=='Dashboard')return;
  enhanceBirthdays();
}

let timer=null;
const observer=new MutationObserver(()=>{
  clearTimeout(timer);
  timer=setTimeout(apply,30);
});
observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
setTimeout(apply,120);
})();
