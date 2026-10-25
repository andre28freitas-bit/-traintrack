(() => {
'use strict';

const X=window.TTEX;
if(!X?.db)return;
const db=X.db;
const esc=X.esc||((v)=>String(v??''));
let testsCache=null;

const CATEGORY_ORDER=['Força','Cardiovascular','Exercícios integrados','Calistenia','Core','Potência','Mobilidade','Resistência','Outro'];

const css=document.createElement('style');
css.textContent=`
.tt-test-groups{display:grid;gap:18px;margin:4px 0 10px}
.tt-test-group{border:1px solid var(--border);border-radius:16px;background:#f8fafc;overflow:hidden}
.tt-test-group-head{padding:12px 14px;border-bottom:1px solid var(--border);background:#eef3f9}
.tt-test-group-head strong{display:block;font-size:13px;letter-spacing:.02em}
.tt-test-group-head span{display:block;margin-top:2px;font-size:10px;color:var(--muted)}
.tt-test-list{display:grid}
.tt-test-item{margin:0!important;padding:13px 14px!important;border-bottom:1px solid var(--border)}
.tt-test-item:last-child{border-bottom:0}
.tt-test-item label{display:block;margin:0 0 7px!important;font-size:12px!important;font-weight:800!important;color:var(--text)!important}
.tt-test-item input{width:100%;min-height:42px}
.tt-test-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;font-size:9px;color:var(--muted)}
.tt-test-meta .mode{font-weight:800}
.tt-test-meta .mode.score{color:#2563eb}
.tt-test-meta .mode.tracking{color:var(--muted)}
.tt-test-item[data-derived="true"] input{background:#f1f5f9;color:#64748b}
@media(max-width:640px){
  .tt-test-groups{gap:14px}
  .tt-test-group{border-radius:14px}
  .tt-test-group-head{padding:11px 12px}
  .tt-test-item{padding:11px 12px!important}
  .tt-test-item input{min-height:40px}
}
`;
document.head.appendChild(css);

async function getTests(){
  if(testsCache)return testsCache;
  const {data,error}=await db.from('traintrack_test_definitions').select('*').eq('active',true).order('sort_order');
  if(error)throw error;
  testsCache=data||[];
  return testsCache;
}

function cleanLabel(label){
  return String(label||'')
    .replace(/^\s*\d+\.\s*/,'')
    .replace(/\s*·\s*ideal\s+—(?:\s+\S+)?\s*$/i,'')
    .trim();
}

function helpText(test){
  if(test.scoring_key==='vo2_derived')return 'Calculado automaticamente a partir do Teste de Cooper.';
  if(test.counts_for_score){
    return test.scoring_key==='tracking'
      ? 'Marcado para avaliação · ainda sem referência automática de score.'
      : 'Conta para o score da categoria e mantém histórico.';
  }
  return 'Registado apenas para acompanhar evolução.';
}

function categorySubtitle(cat,items){
  const scoreCount=items.filter(t=>t.counts_for_score).length;
  return `${items.length} exercício${items.length===1?'':'s'} · ${scoreCount} a contar para avaliação`;
}

function syncEmptyGroups(form){
  form.querySelectorAll('.tt-test-group').forEach(group=>{
    const visible=[...group.querySelectorAll('.tt-test-item')].some(x=>x.style.display!=='none');
    group.style.display=visible?'':'none';
  });
}

async function groupForm(){
  const form=document.querySelector('#modalRoot form');
  if(!form||form.querySelector('.tt-test-groups'))return;
  const fields=[...form.querySelectorAll('.field')].filter(f=>f.querySelector('input[name^="test_"]'));
  if(!fields.length)return;
  const tests=await getTests();
  const byId=new Map(tests.map(t=>[String(t.id),t]));
  const first=fields[0];
  const groups=document.createElement('div');
  groups.className='field full tt-test-groups';

  const grouped=new Map();
  for(const field of fields){
    const input=field.querySelector('input[name^="test_"]');
    const id=input?.name?.slice(5);
    const test=byId.get(String(id));
    if(!test)continue;
    if(!grouped.has(test.category))grouped.set(test.category,[]);
    grouped.get(test.category).push({field,input,test});
  }

  const cats=[...grouped.keys()].sort((a,b)=>{
    const ai=CATEGORY_ORDER.indexOf(a),bi=CATEGORY_ORDER.indexOf(b);
    return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,'pt');
  });

  for(const cat of cats){
    const items=grouped.get(cat);
    const section=document.createElement('section');
    section.className='tt-test-group';
    section.dataset.category=cat;
    section.innerHTML=`<div class="tt-test-group-head"><strong>${esc(cat==='Cardiovascular'?'Cardio':cat)}</strong><span>${esc(categorySubtitle(cat,items.map(x=>x.test)))}</span></div><div class="tt-test-list"></div>`;
    const list=section.querySelector('.tt-test-list');
    for(const {field,input,test} of items){
      field.classList.add('tt-test-item');
      field.dataset.testId=test.id;
      field.dataset.derived=String(test.scoring_key==='vo2_derived');
      const label=field.querySelector('label');
      if(label)label.textContent=cleanLabel(test.name||label.textContent);
      field.querySelectorAll('.stat-note').forEach(n=>n.remove());
      let meta=field.querySelector('.tt-test-meta');
      if(!meta){
        meta=document.createElement('div');
        meta.className='tt-test-meta';
        field.appendChild(meta);
      }
      const mode=test.counts_for_score?'Avaliação + tracking':'Só tracking';
      meta.innerHTML=`<span>${esc(test.unit||'Resultado')} · ${esc(helpText(test))}</span><span class="mode ${test.counts_for_score?'score':'tracking'}">${esc(mode)}</span>`;
      list.appendChild(field);
    }
    groups.appendChild(section);
  }

  first.before(groups);
  fields.forEach(f=>{if(f.parentElement!==groups&&!f.closest('.tt-test-group'))f.remove()});
  syncEmptyGroups(form);
}

const baseAssessmentModal=window.assessmentModal;
if(baseAssessmentModal){
  window.assessmentModal=async id=>{
    const result=await baseAssessmentModal(id);
    setTimeout(()=>groupForm().catch(console.warn),100);
    return result;
  };
}

const baseEditAssessment=window.ttEditAssessment;
if(baseEditAssessment){
  window.ttEditAssessment=async id=>{
    const result=await baseEditAssessment(id);
    setTimeout(()=>groupForm().catch(console.warn),80);
    return result;
  };
}

const baseApplyTemplate=window.ttApplyAssessmentTemplate;
if(baseApplyTemplate){
  window.ttApplyAssessmentTemplate=el=>{
    const result=baseApplyTemplate(el);
    setTimeout(()=>{const form=document.querySelector('#modalRoot form');if(form)syncEmptyGroups(form)},20);
    return result;
  };
}

db.auth.onAuthStateChange(()=>{testsCache=null});
})();