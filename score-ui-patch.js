(() => {
'use strict';

function updateScoreCopy(){
  const overallNote=document.querySelector('.tt-overall small');
  if(overallNote && overallNote.textContent.trim()==='A aguardar fórmula'){
    overallNote.textContent='3 fatores · 33,33% cada';
  }
  document.querySelectorAll('.notice').forEach(el=>{
    const text=el.textContent||'';
    if(text.includes('Overall') && (text.includes('fórmula') || text.includes('formula'))){
      el.textContent='Ponderação atual do Overall: média simples dos 3 fatores individuais (33,33% cada). Os valores de referência podem ser atualizados depois sem alterar o histórico das avaliações.';
    }
  });
}

const baseOpenStudent=window.openStudent;
if(baseOpenStudent) window.openStudent=(id,tab='overview')=>{
  const r=baseOpenStudent(id,tab);
  if(tab==='progress') setTimeout(updateScoreCopy,120);
  return r;
};

const baseStudentTab=window.studentTab;
if(baseStudentTab) window.studentTab=tab=>{
  const r=baseStudentTab(tab);
  if(tab==='progress') setTimeout(updateScoreCopy,120);
  return r;
};

setTimeout(updateScoreCopy,250);
})();
