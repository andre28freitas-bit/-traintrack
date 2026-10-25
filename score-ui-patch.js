(() => {
'use strict';

function updateScoreCopy(){
  const overallNote=document.querySelector('.tt-overall small');
  if(overallNote && overallNote.textContent.trim()==='A aguardar fórmula'){
    overallNote.textContent='Ponderação definida no Back Office';
  }
  document.querySelectorAll('.notice').forEach(el=>{
    const text=el.textContent||'';
    if(text.includes('Overall') && (text.includes('fórmula') || text.includes('formula'))){
      el.textContent='O Overall usa a ponderação definida no Back Office. Os resultados brutos das avaliações mantêm-se sempre inalterados.';
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
