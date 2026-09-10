(() => {
'use strict';
const X=window.TTEX;if(!X)return;
const {db,esc,fmtDate,val,metrics,score,scoreText,toast}=X;
const selectedByStudent=new Map();
let currentStudentId=null;

const style=document.createElement('style');
style.textContent=`
.tt-compare-bar{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 16px;margin:14px 0;background:#f7f9fc;border:1px solid var(--border);border-radius:14px}.tt-compare-bar strong{display:block;font-size:13px}.tt-compare-bar span{display:block;margin-top:3px;color:var(--muted);font-size:10px}.tt-compare-control{display:flex;align-items:center;gap:8px}.tt-compare-control label{font-size:10px;font-weight:800;color:var(--muted);white-space:nowrap}.tt-compare-control select{min-width:190px}.tt-compare-current{font-weight:800;color:var(--text)!important}.tt-compare-legend{display:flex;gap:12px;align-items:center;margin-top:7px;font-size:9px;color:var(--muted)}.tt-compare-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;background:#7dabff}.tt-compare-dot.base{background:#94a3b8}
@media(max-width:640px){.tt-compare-bar{align-items:stretch;flex-direction:column}.tt-compare-control{align-items:stretch;flex-direction:column}.tt-compare-control select{width:100%;min-width:0}}
`;
document.head.appendChild(style);

function numeric(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null}
function deltaText(current,baseline,unit=''){
  if(current==null||baseline==null)return'Sem comparação';
  const d=current-baseline;
  const decimals=Math.abs(d)>=10?0:1;
  return`${d>=0?'+':''}${d.toFixed(decimals)}${unit?` ${unit}`:''}`;
}
function radarMarkup(cats,latest,baseline){
  if(cats.length<3)return'<div class="tt-radar"><span style="color:#bdc9da;font-size:11px;text-align:center">Radar preparado.<br>Fica ativo quando existirem pelo menos 3 áreas com score calculado.</span></div>';
  cats=cats.slice(0,6);const n=cats.length,cx=150,cy=105,r=72;
  const pt=(i,k=1)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(a)*r*k,cy+Math.sin(a)*r*k]};
  const poly=(vals,cl)=>`<polygon class="${cl}" points="${vals.map((v,i)=>pt(i,Math.max(0,Math.min(100,v))/100).join(',')).join(' ')}"/>`;
  const cur=cats.map(c=>score(latest,c)),old=cats.map(c=>score(baseline,c));
  const hasCur=cur.every(v=>v!=null),hasOld=old.every(v=>v!=null);
  return`<div class="tt-radar"><svg viewBox="0 0 300 225">${[.25,.5,.75,1].map(k=>`<polygon class="grid" points="${cats.map((_,i)=>pt(i,k).join(',')).join(' ')}"/>`).join('')}${cats.map((_,i)=>{const p=pt(i);return`<line class="grid" x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}"/>`}).join('')}${hasOld?poly(old,'prev'):''}${hasCur?poly(cur,'cur'):''}${cats.map((c,i)=>{const p=pt(i,1.28);return`<text x="${p[0]}" y="${p[1]}" text-anchor="middle">${esc(c)}</text>`}).join('')}</svg></div>`;
}

async function renderComparison(studentId){
  const root=document.querySelector('.tt-progress-v2');
  if(!root||!studentId)return;
  try{
    const [{data:list,error},{data:tests,error:testError}]=await Promise.all([
      db.from('traintrack_assessments').select('*').eq('student_id',studentId).order('assessment_date',{ascending:true}).order('created_at',{ascending:true}),
      db.from('traintrack_test_definitions').select('*').eq('active',true).order('sort_order')
    ]);
    if(error)throw error;if(testError)throw testError;
    if(!list||list.length<2){root.querySelector('.tt-compare-bar')?.remove();return}

    const latest=list.at(-1),previous=list.at(-2);
    let baselineId=selectedByStudent.get(studentId)||previous.id;
    let baseline=list.find(a=>a.id===baselineId&&a.id!==latest.id);
    if(!baseline){baseline=previous;baselineId=previous.id;selectedByStudent.set(studentId,baselineId)}
    const baselineIndex=list.findIndex(a=>a.id===baseline.id);
    const referenceLabel=fmtDate(baseline.assessment_date);

    let bar=root.querySelector('.tt-compare-bar');
    if(!bar){bar=document.createElement('div');bar.className='tt-compare-bar';const hero=root.querySelector('.tt-score-hero');hero?hero.after(bar):root.prepend(bar)}
    bar.innerHTML=`<div><strong>Comparar evolução</strong><span>Mais recente: <span class="tt-compare-current">${fmtDate(latest.assessment_date)}</span></span><div class="tt-compare-legend"><span><i class="tt-compare-dot"></i>Mais recente</span><span><i class="tt-compare-dot base"></i>Referência</span></div></div><div class="tt-compare-control"><label>Comparar com</label><select onchange="ttCompareProgress('${studentId}',this.value)">${list.slice(0,-1).map((a,i)=>`<option value="${a.id}" ${a.id===baseline.id?'selected':''}>${i+1}.ª avaliação · ${fmtDate(a.assessment_date)}</option>`).join('')}</select></div>`;

    const latestOverall=score(latest),baseOverall=score(baseline),overallSmall=root.querySelector('.tt-overall small');
    if(overallSmall){overallSmall.textContent=latestOverall==null?'3 fatores · 33,33% cada':`/100${baseOverall==null?'':` · ${latestOverall-baseOverall>=0?'+':''}${(latestOverall-baseOverall).toFixed(0)} vs ${referenceLabel}`}`}

    const cats=[...new Set((tests||[]).map(t=>t.category).filter(Boolean))];
    root.querySelectorAll('.tt-cat').forEach(card=>{
      const name=card.querySelector('span')?.textContent?.trim();const small=card.querySelector('small');if(!name||!small)return;
      const current=score(latest,name),base=score(baseline,name);
      small.textContent=current==null?'Fórmula por definir':base==null?'Sem comparação':`${current-base>=0?'+':''}${(current-base).toFixed(0)} vs ${referenceLabel}`;
    });

    const radar=root.querySelector('.tt-radar');
    if(radar)radar.outerHTML=radarMarkup(cats,latest,baseline);

    const high=[];
    metrics.slice(0,4).forEach(([k,label,unit])=>{
      const current=val(latest,k),base=val(baseline,k);
      if(current!=null)high.push({label,current,base,display:`${current} ${unit}`,delta:deltaText(current,base,unit),reference:referenceLabel});
    });
    (tests||[]).forEach(t=>{
      if(high.length>=8)return;
      const current=numeric(latest?.values?.[t.id]),base=numeric(baseline?.values?.[t.id]);
      if(current!=null)high.push({label:t.name,current,base,display:`${current}${t.unit?` ${t.unit}`:''}`,delta:deltaText(current,base,t.unit||''),reference:referenceLabel});
    });
    const grid=root.querySelector('.tt-highlights');
    if(grid){
      grid.innerHTML=high.map(item=>`<article class="card tt-highlight"><span>${esc(item.label)}</span><strong>${esc(item.display)}</strong><small data-current="${item.current}" data-baseline="${item.base==null?'':item.base}" data-reference="${esc(item.reference)}">${item.base==null?'Sem comparação':`${esc(item.delta)} vs ${esc(item.reference)}`}</small></article>`).join('');
      const sectionHead=grid.previousElementSibling;
      const p=sectionHead?.querySelector('p');if(p)p.textContent=`Mais recente vs ${referenceLabel}.`;
    }
  }catch(e){console.warn('Comparação de progressão',e);toast?.('Não foi possível atualizar a comparação.',true)}
}

window.ttCompareProgress=(studentId,assessmentId)=>{selectedByStudent.set(studentId,assessmentId);renderComparison(studentId)};

const baseOpen=window.openStudent;
if(baseOpen)window.openStudent=(id,tab='overview')=>{currentStudentId=id;const r=baseOpen(id,tab);if(tab==='progress')setTimeout(()=>renderComparison(id),320);return r};
const baseTab=window.studentTab;
if(baseTab)window.studentTab=tab=>{const r=baseTab(tab);if(tab==='progress'&&currentStudentId)setTimeout(()=>renderComparison(currentStudentId),320);return r};
})();
