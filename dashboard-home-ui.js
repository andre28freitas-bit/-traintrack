(() => {
'use strict';

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
}
`;
document.head.appendChild(style);

function cleanBirthdays(){
  const title=[...document.querySelectorAll('#content .section-head h2')]
    .find(el=>el.textContent.trim()==='Aniversários');
  if(!title)return;

  const head=title.closest('.section-head');
  const list=head?.nextElementSibling;
  if(!list?.classList.contains('list'))return;

  if(!head.querySelector('.tt-birthday-window')){
    const wrap=head.querySelector('div');
    if(wrap){
      const p=document.createElement('p');
      p.className='tt-birthday-window';
      p.textContent='Próximos 30 dias';
      wrap.appendChild(p);
    }
  }

  list.querySelectorAll('.list-row').forEach(row=>{
    const text=row.querySelector('.pill')?.textContent?.trim()||'';
    if(/Hoje/i.test(text))return;
    const match=text.match(/em\s+(\d+)\s+dias?/i);
    if(match && Number(match[1])>30)row.remove();
  });

  if(!list.querySelector('.list-row') && !list.querySelector('.tt-no-birthdays')){
    list.innerHTML='<div class="empty tt-no-birthdays">Sem aniversários nos próximos 30 dias.</div>';
  }
}

function apply(){
  if(document.querySelector('#pageTitle')?.textContent?.trim()!=='Dashboard')return;
  cleanBirthdays();
}

let timer=null;
const observer=new MutationObserver(()=>{
  clearTimeout(timer);
  timer=setTimeout(apply,20);
});
observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
setTimeout(apply,120);
})();
