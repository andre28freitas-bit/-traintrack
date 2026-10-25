(() => {
'use strict';

const X=window.TTEX;
if(!X?.db)return;
const db=X.db;
const esc=X.esc||((v)=>String(v??''));
const toast=X.toast||(()=>{});
const modal=X.modal||(()=>{});
const close=X.close||(()=>{});

const SCORE_LEVELS={very_bad:20,bad:40,medium:60,good:80,excellent:100};
const DEFAULT_TESTS=[
  {name:'Supino',category:'Força',unit:'kg',scoring_key:'strength_bench'},
  {name:'Agachamento',category:'Força',unit:'kg',scoring_key:'strength_squat'},
  {name:'Levantamento Terra',category:'Força',unit:'kg',scoring_key:'strength_deadlift'},
  {name:'Remada inclinada',category:'Força',unit:'kg',scoring_key:'tracking'},
  {name:'Teste de Cooper',category:'Cardiovascular',unit:'m',scoring_key:'cooper'},
  {name:'Teste BIP',category:'Cardiovascular',unit:'nível',scoring_key:'tracking'},
  {name:'VO₂max estimado',category:'Cardiovascular',unit:'ml/kg/min',scoring_key:'vo2'},
  {name:'Clean & Press',category:'Exercícios integrados',unit:'kg',scoring_key:'tracking'},
  {name:'Snatch',category:'Exercícios integrados',unit:'kg',scoring_key:'tracking'},
  {name:'Flexões',category:'Calistenia',unit:'reps',scoring_key:'tracking'},
  {name:'Afundos',category:'Calistenia',unit:'reps',scoring_key:'tracking'},
  {name:'Elevações',category:'Calistenia',unit:'reps',scoring_key:'tracking'}
];

const STRENGTH={
  male:{
    strength_bench:[.50,.75,1.00,1.30,1.65],
    strength_squat:[.75,1.10,1.50,1.90,2.30],
    strength_deadlift:[.90,1.30,1.75,2.20,2.60]
  },
  female:{
    strength_bench:[.25,.40,.60,.85,1.10],
    strength_squat:[.50,.75,1.00,1.35,1.70],
    strength_deadlift:[.60,.90,1.25,1.60,2.00]
  }
};
const LEVEL_LABELS=['Principiante','Novato','Intermédio','Avançado','Elite'];

const COOPER={
  male:{
    '20-29':[1600,2200,2400,2801],
    '30-39':[1500,2000,2300,2701]
  },
  female:{
    '20-29':[1500,1800,2200,2701],
    '30-39':[1400,1700,2000,2501]
  }
};
const COOPER_LABELS=['Muito mau','Mau','Médio','Bom','Excelente'];

const css=document.createElement('style');
css.textContent=`
.tt-bo-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;margin-bottom:18px}
.tt-bo-card{padding:18px}
.tt-weight-row{display:grid;grid-template-columns:1fr 110px;gap:10px;align-items:center;margin-top:10px}
.tt-weight-total{margin-top:10px;font-size:11px;color:var(--muted)}
.tt-catalog-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.tt-catalog-group{border:1px solid var(--border);border-radius:12px;padding:11px;background:#fbfcfe}
.tt-catalog-group h4{margin:0 0 8px;font-size:12px}
.tt-test-chip{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--border);font-size:10px}
.tt-test-chip:first-of-type{border-top:0}
.tt-track{color:var(--muted);font-size:9px}
.tt-ref-table{width:100%;border-collapse:collapse;font-size:10px;margin-top:10px}
.tt-ref-table th,.tt-ref-table td{border-bottom:1px solid var(--border);padding:7px 6px;text-align:left}
.tt-ref-section{margin-top:16px}
.tt-result-explain{margin-top:12px;display:grid;gap:8px}
.tt-result-row{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#fff}
@media(max-width:760px){.tt-bo-grid,.tt-catalog-groups{grid-template-columns:1fr}.tt-weight-row{grid-template-columns:1fr 90px}}
`;
document.head.appendChild(css);

const normName=s=>String(s||'').trim().toLocaleLowerCase('pt-PT');
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
function ageAt(birth,date){
  if(!birth||!date)return null;
  const b=new Date(birth+'T12:00:00'),d=new Date(date+'T12:00:00');
  let a=d.getFullYear()-b.getFullYear();
  if(d.getMonth()<b.getMonth()||(d.getMonth()===b.getMonth()&&d.getDate()<b.getDate()))a--;
  return a;
}
function ageBand(age){if(age>=20&&age<=29)return'20-29';if(age>=30&&age<=39)return'30-39';return null}
function levelFromThresholds(value,thresholds){
  if(value==null||!thresholds)return null;
  let idx=0;
  thresholds.forEach((t,i)=>{if(value>=t)idx=i});
  return Math.max(0,Math.min(4,idx));
}
function scoreFromLevel(i){return [20,40,60,80,100][Math.max(0,Math.min(4,i))]}

async function ensureCatalog(){
  const {data:tests,error}=await db.from('traintrack_test_definitions').select('*').order('sort_order');
  if(error)throw error;
  const byName=new Map((tests||[]).map(t=>[normName(t.name),t]));
  let order=Math.max(0,...(tests||[]).map(t=>Number(t.sort_order)||0));
  for(const def of DEFAULT_TESTS){
    const existing=byName.get(normName(def.name));
    if(existing){
      const patch={};
      if(existing.category!==def.category)patch.category=def.category;
      if(!existing.unit)patch.unit=def.unit;
      if(!existing.scoring_key)patch.scoring_key=def.scoring_key;
      if(Object.keys(patch).length){
        const r=await db.from('traintrack_test_definitions').update(patch).eq('id',existing.id);
        if(r.error)throw r.error;
      }
    }else{
      order+=1;
      const r=await db.from('traintrack_test_definitions').insert({...def,sort_order:order,active:true});
      if(r.error)throw r.error;
    }
  }
}

function strengthResult(value,key,student,assessment){
  const sex=student?.reference_sex;
  const weight=num(assessment?.body_metrics?.weight_kg)??num(student?.weight_kg);
  if(!sex||!weight||!STRENGTH[sex]?.[key])return null;
  const ratio=value/weight;
  const idx=levelFromThresholds(ratio,STRENGTH[sex][key]);
  return{score:scoreFromLevel(idx),label:LEVEL_LABELS[idx],detail:`${ratio.toFixed(2)}× peso corporal`};
}
function cooperResult(value,student,assessment){
  const sex=student?.reference_sex,age=ageAt(student?.birth_date,assessment?.assessment_date),band=ageBand(age);
  const th=sex&&band?COOPER[sex]?.[band]:null;
  if(!th)return null;
  let idx=value<th[0]?0:value<th[1]?1:value<th[2]?2:value<th[3]?3:4;
  return{score:scoreFromLevel(idx),label:COOPER_LABELS[idx],detail:`${Math.round(value)} m · ${band} anos`};
}
function vo2Result(value,student,assessment){
  const age=ageAt(student?.birth_date,assessment?.assessment_date);
  if(age==null||age<20||age>39)return null;
  if(value<35)return{score:20,label:'Baixo',detail:`${value.toFixed(1)} ml/kg/min`};
  if(value>=36&&value<=44)return{score:60,label:'Médio / bom',detail:`${value.toFixed(1)} ml/kg/min`};
  if(value>=45)return{score:100,label:'Excelente',detail:`${value.toFixed(1)} ml/kg/min`};
  return null;
}
function resultFor(test,value,student,assessment){
  const key=test?.scoring_key;
  if(key?.startsWith('strength_'))return strengthResult(value,key,student,assessment);
  if(key==='cooper')return cooperResult(value,student,assessment);
  if(key==='vo2')return vo2Result(value,student,assessment);
  return null;
}

function calcScores(assessment,student,tests,weights){
  const grouped={},details={};
  for(const test of tests){
    const value=num(assessment?.values?.[test.id]);
    if(value==null)continue;
    const r=resultFor(test,value,student,assessment);
    if(!r)continue;
    (grouped[test.category] ||= []).push(r.score);
    details[test.id]={name:test.name,category:test.category,...r};
  }
  const categories={};
  Object.entries(grouped).forEach(([k,a])=>categories[k]=a.reduce((s,v)=>s+v,0)/a.length);
  const active=Object.entries(weights||{}).filter(([,w])=>num(w)>0);
  let overall=null;
  if(active.length&&active.every(([k])=>Number.isFinite(categories[k]))){
    const total=active.reduce((s,[,w])=>s+num(w),0);
    if(Math.abs(total-100)<0.01)overall=active.reduce((s,[k,w])=>s+categories[k]*num(w)/100,0);
  }
  return{categories,overall,details,weights:{...(weights||{})},model:'traintrack_reference_v1'};
}

async function profileWeights(){
  const {data,error}=await db.from('traintrack_profiles').select('overall_weights').maybeSingle();
  if(error)throw error;
  return data?.overall_weights||{};
}
async function recalcAll(){
  const [{data:students,error:se},{data:tests,error:te},{data:assessments,error:ae},weights]=await Promise.all([
    db.from('traintrack_students').select('*').eq('archived',false),
    db.from('traintrack_test_definitions').select('*').eq('active',true).order('sort_order'),
    db.from('traintrack_assessments').select('*'),
    profileWeights()
  ]);
  if(se||te||ae)throw(se||te||ae);
  const sm=new Map((students||[]).map(s=>[s.id,s]));
  for(const a of assessments||[]){
    const s=sm.get(a.student_id);if(!s)continue;
    const scores=calcScores(a,s,tests||[],weights);
    const r=await db.from('traintrack_assessments').update({scores}).eq('id',a.id);
    if(r.error)throw r.error;
  }
}

window.ttSaveOverallWeights=async e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const weights={Força:num(f.get('Força'))||0,Cardiovascular:num(f.get('Cardiovascular'))||0};
  const total=Object.values(weights).reduce((s,v)=>s+v,0);
  if(Math.abs(total-100)>.01)return toast('A soma das ponderações tem de ser 100%.',true);
  const {error}=await db.from('traintrack_profiles').update({overall_weights:weights});
  if(error)return toast(error.message,true);
  try{await recalcAll();toast('Fórmula do Overall atualizada para todos os alunos.');setTimeout(()=>enhanceBO(true),50)}
  catch(err){toast(err.message||'Fórmula guardada, mas houve erro ao recalcular.',true)}
};

function catalogHTML(tests){
  const groups={};
  tests.forEach(t=>(groups[t.category] ||= []).push(t));
  return Object.entries(groups).map(([cat,items])=>`<div class="tt-catalog-group"><h4>${esc(cat)}</h4>${items.map(t=>`<div class="tt-test-chip"><span>${esc(t.name)} <small>· ${esc(t.unit||'')}</small></span><span class="${t.scoring_key==='tracking'?'tt-track':'pill green'}">${t.scoring_key==='tracking'?'Tracking':'Com referência'}</span></div>`).join('')}</div>`).join('');
}

async function enhanceBO(force=false){
  if(document.querySelector('#pageTitle')?.textContent?.trim()!=='Avaliações')return;
  if(force)document.querySelector('.tt-assessment-bo')?.remove();
  if(document.querySelector('.tt-assessment-bo'))return;
  const content=document.querySelector('#content');if(!content)return;
  const [{data:tests,error},weights]=await Promise.all([
    db.from('traintrack_test_definitions').select('*').eq('active',true).order('sort_order'),
    profileWeights()
  ]);
  if(error)return;
  const box=document.createElement('section');
  box.className='tt-assessment-bo';
  box.innerHTML=`
    <div class="tt-bo-grid">
      <div class="card tt-bo-card">
        <div class="section-head" style="margin-top:0"><div><h2>Fórmula do Overall</h2><p>Configuração global aplicada a todos os alunos.</p></div></div>
        <form onsubmit="ttSaveOverallWeights(event)">
          <div class="tt-weight-row"><label>Cardio</label><input name="Cardiovascular" type="number" min="0" max="100" step="1" value="${esc(weights.Cardiovascular??'')}"></div>
          <div class="tt-weight-row"><label>Força</label><input name="Força" type="number" min="0" max="100" step="1" value="${esc(weights['Força']??'')}"></div>
          <div class="tt-weight-total">A soma tem de ser 100%. Ex.: Cardio 60% + Força 40%.</div>
          <div class="form-actions"><button type="button" class="secondary" onclick="ttReferenceModal()">Ver referências</button><button class="primary">Guardar fórmula</button></div>
        </form>
      </div>
      <div class="card tt-bo-card">
        <div class="section-head" style="margin-top:0"><div><h2>Catálogo de avaliação</h2><p>“Tracking” regista evolução sem afetar automaticamente o score.</p></div></div>
        <div class="tt-catalog-groups">${catalogHTML(tests||[])}</div>
      </div>
    </div>`;
  content.prepend(box);
}

window.ttReferenceModal=()=>{
  modal(`<div class="modal-head"><h2>Referências de avaliação</h2><button class="icon-btn" onclick="closeModal()">×</button></div>
  <div class="notice">Estas referências foram estruturadas a partir das tabelas fornecidas para apoiar o cálculo e a explicação ao aluno. O score 0–100 é uma normalização interna da TrainTrack; a classificação original é mostrada separadamente.</div>
  <div class="tt-ref-section"><h3>Força — 1RM / peso corporal</h3>
    <table class="tt-ref-table"><thead><tr><th>Exercício</th><th>Homens · Intermédio</th><th>Mulheres · Intermédio</th></tr></thead>
    <tbody><tr><td>Supino</td><td>1,00×</td><td>0,60×</td></tr><tr><td>Agachamento</td><td>1,50×</td><td>1,00×</td></tr><tr><td>Levantamento Terra</td><td>1,75×</td><td>1,25×</td></tr></tbody></table>
    <p class="stat-note">Categorias completas: Principiante · Novato · Intermédio · Avançado · Elite.</p>
  </div>
  <div class="tt-ref-section"><h3>Teste de Cooper — 20 a 39 anos</h3>
    <table class="tt-ref-table"><thead><tr><th>Grupo</th><th>Médio</th><th>Bom</th><th>Excelente</th></tr></thead>
    <tbody><tr><td>Homens 20–29</td><td>2200–2399 m</td><td>2400–2800 m</td><td>&gt;2800 m</td></tr><tr><td>Homens 30–39</td><td>2000–2299 m</td><td>2300–2700 m</td><td>&gt;2700 m</td></tr><tr><td>Mulheres 20–29</td><td>1800–2199 m</td><td>2200–2700 m</td><td>&gt;2700 m</td></tr><tr><td>Mulheres 30–39</td><td>1700–1999 m</td><td>2000–2500 m</td><td>&gt;2500 m</td></tr></tbody></table>
  </div>
  <div class="tt-ref-section"><h3>VO₂max — referência fornecida</h3>
    <table class="tt-ref-table"><tbody><tr><td>Abaixo de 35</td><td>Baixo</td></tr><tr><td>36–44</td><td>Médio / bom</td></tr><tr><td>45+</td><td>Excelente</td></tr></tbody></table>
  </div>
  <div class="form-actions"><button class="primary" onclick="closeModal()">Fechar</button></div>`);
};

async function addProgressExplanation(){
  if(document.querySelector('#pageTitle')?.textContent?.trim()==='Avaliações')return;
  const hero=document.querySelector('.tt-progress-v2');if(!hero||hero.querySelector('.tt-result-explain'))return;
  const title=document.querySelector('#pageTitle')?.textContent?.trim();if(!title)return;
  const {data:student}=await db.from('traintrack_students').select('id').eq('name',title).maybeSingle();
  if(!student)return;
  const {data:a}=await db.from('traintrack_assessments').select('*').eq('student_id',student.id).order('assessment_date',{ascending:false}).limit(1).maybeSingle();
  const details=Object.values(a?.scores?.details||{});
  if(!details.length)return;
  const box=document.createElement('div');box.className='tt-result-explain';
  box.innerHTML=`<div class="section-head"><div><h2>Leitura dos resultados</h2><p>Classificação de referência da avaliação mais recente.</p></div></div>${details.map(d=>`<div class="tt-result-row"><div><strong>${esc(d.name)}</strong><div class="stat-note">${esc(d.detail||'')}</div></div><span class="pill">${esc(d.label||'—')}</span></div>`).join('')}`;
  hero.append(box);
}

let enhancing=false;
async function apply(){
  if(enhancing)return;enhancing=true;
  try{
    await enhanceBO();
    await addProgressExplanation();
  }catch(e){console.warn('TrainTrack assessment engine:',e?.message||e)}
  finally{enhancing=false}
}

async function boot(){
  try{await ensureCatalog();await recalcAll()}catch(e){console.warn('TrainTrack assessment setup:',e?.message||e)}
  apply();
}
const observer=new MutationObserver(()=>setTimeout(apply,40));
observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
db.auth.onAuthStateChange((_event,session)=>{if(session?.user)setTimeout(boot,120)});
setTimeout(boot,160);
})();