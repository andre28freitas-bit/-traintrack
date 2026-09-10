(() => {
'use strict';

const X=window.TTEX;
if(!X)return;
const {toast}=X;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

function printStyles(){
  return `
  @page{size:A4 landscape;margin:9mm}
  *{box-sizing:border-box}
  html,body{background:#fff!important}
  body{margin:0!important;color:#0f172a!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .tt-print-page{width:100%;max-width:none;margin:0 auto}
  .tt-print-header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;border-bottom:2px solid #e2e8f0;padding:0 0 10px;margin:0 0 12px}
  .tt-print-brand{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#64748b}
  .tt-print-header h1{font-size:24px;line-height:1.1;margin:3px 0 0;color:#0f172a}
  .tt-print-meta{text-align:right;font-size:9px;color:#64748b}
  .tt-print-profile{margin-bottom:10px}
  .tt-print-profile .actions,.tt-print-profile .tabs{display:none!important}
  .profile{box-shadow:none!important;border:0!important;padding:0!important}
  .profile-head{padding:0 0 10px!important;border-bottom:1px solid #e2e8f0!important}
  .profile-head .actions{display:none!important}
  .profile-title h2{font-size:18px!important}
  #studentBody{padding:0!important}
  .tt-progress-v2{margin:0!important}
  .tt-progress-hero{display:none!important}
  .tt-score-hero{padding:14px!important;border-radius:14px!important;box-shadow:none!important}
  .tt-score-head h2{font-size:20px!important}
  .tt-score-head button,.tt-score-head .primary{display:none!important}
  .tt-score-stage{grid-template-columns:120px 1fr!important;gap:10px!important;margin-top:10px!important}
  .tt-overall{min-height:145px!important;border-radius:12px!important}
  .tt-overall strong{font-size:42px!important}
  .tt-radar{min-height:145px!important;border-radius:12px!important;padding:7px!important}
  .tt-radar svg{max-height:145px!important}
  .tt-cat-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;margin-top:7px!important}
  .tt-cat{padding:7px!important;border-radius:8px!important}
  .tt-cat strong{font-size:18px!important}
  .tt-compare-bar{padding:8px 10px!important;margin:8px 0!important;border-radius:9px!important;background:#f8fafc!important}
  .tt-compare-control{font-size:9px;font-weight:800;color:#475569;text-align:right}
  .tt-compare-control select,.tt-compare-control label{display:none!important}
  .tt-print-reference{font-size:9px;font-weight:800;color:#475569;white-space:nowrap}
  .section-head{margin:9px 0 6px!important}
  .section-head h2{font-size:14px!important;margin:0!important}
  .section-head p{font-size:9px!important;margin-top:2px!important}
  .tt-highlights{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;margin-top:5px!important}
  .tt-highlight{padding:8px!important;min-height:72px!important;border-radius:9px!important;box-shadow:none!important}
  .tt-highlight strong{font-size:15px!important;margin:3px 0!important}
  .tt-highlight small{font-size:8px!important}
  .tt-highlight small .tt-delta-percent{font-size:7.5px!important;margin-top:1px!important}
  .notice{display:none!important}
  .progress-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;margin-top:8px!important}
  .progress-card{padding:9px!important;box-shadow:none!important;border-radius:10px!important;break-inside:avoid;page-break-inside:avoid}
  .progress-card h3{font-size:12px!important;margin:0!important}
  .progress-card .chart{height:66px!important;margin:5px 0!important}
  .progress-card .chart svg{height:66px!important}
  .progress-card .stat-note,.progress-card .metric-line{font-size:8px!important}
  .progress-card .metric-line strong{font-size:11px!important}
  .card{box-shadow:none!important}
  button,.mobile-nav,.sidebar,.topbar{display:none!important}
  .tt-print-footer{margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:7.5px;color:#94a3b8}
  svg{max-width:100%}
  @media print{
    a{text-decoration:none;color:inherit}
    .tt-score-hero,.tt-compare-bar,.tt-highlight,.progress-card{break-inside:avoid;page-break-inside:avoid}
  }
  `;
}

function copyDocumentStyles(){
  return [...document.head.querySelectorAll('style,link[rel="stylesheet"]')].map(node=>node.outerHTML).join('\n');
}

function buildSnapshot(){
  const body=document.querySelector('#studentBody');
  const profile=document.querySelector('.profile-head');
  if(!body)return null;
  const bodyClone=body.cloneNode(true);
  const profileClone=profile?.cloneNode(true);
  profileClone?.querySelector('.actions')?.remove();

  bodyClone.querySelectorAll('.tt-progress-hero').forEach(x=>x.remove());
  const scorecards=[...bodyClone.querySelectorAll('.tt-score-hero')];
  scorecards.slice(1).forEach(x=>x.remove());

  const compare=bodyClone.querySelector('.tt-compare-control');
  if(compare){
    const select=compare.querySelector('select');
    const selected=select?.selectedOptions?.[0]?.textContent?.trim()||'';
    compare.innerHTML=selected?`<div class="tt-print-reference">Referência: ${esc(selected)}</div>`:'';
  }
  bodyClone.querySelectorAll('button').forEach(x=>x.remove());
  bodyClone.querySelectorAll('.notice').forEach(x=>x.remove());
  bodyClone.innerHTML=bodyClone.innerHTML
    .replace(/avaliaçãoões/g,'avaliações')
    .replace(/avaliaçoes/gi,'avaliações')
    .replace(/avaliacoes/gi,'avaliações');
  return {body:bodyClone.outerHTML,profile:profileClone?.outerHTML||''};
}

async function ensureProgress(studentId){
  if(document.querySelector('.tt-progress-v2')&&document.querySelector('#studentBody .progress-grid'))return true;
  if(typeof window.openStudent!=='function')return false;
  window.openStudent(studentId,'progress');
  for(let i=0;i<12;i++){
    await wait(120);
    if(document.querySelector('.tt-progress-v2')&&document.querySelector('#studentBody .progress-grid'))return true;
  }
  return !!document.querySelector('#studentBody');
}

window.ttExportReport=async function(studentId){
  const printWindow=window.open('','_blank');
  if(!printWindow){toast?.('O browser bloqueou a janela do relatório. Permite pop-ups e tenta novamente.',true);return}
  printWindow.document.write('<!doctype html><html><head><meta charset="UTF-8"><title>A preparar relatório…</title></head><body style="font-family:system-ui;padding:30px">A preparar relatório…</body></html>');
  printWindow.document.close();

  try{
    const ready=await ensureProgress(studentId);
    if(!ready)throw new Error('Não foi possível abrir a progressão do aluno.');
    await wait(350);
    const snap=buildSnapshot();
    if(!snap)throw new Error('Não foi possível preparar o relatório.');

    const studentName=document.querySelector('.profile-title h2')?.textContent?.trim()||'Aluno';
    const comparison=document.querySelector('.tt-compare-control select')?.selectedOptions?.[0]?.textContent?.trim();
    const generated=new Intl.DateTimeFormat('pt-PT',{dateStyle:'medium',timeStyle:'short'}).format(new Date());
    const styles=copyDocumentStyles();
    const title=`TrainTrack — ${studentName}`;

    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="pt-PT"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${location.origin}/"><title>${esc(title)}</title>${styles}<style>${printStyles()}</style></head><body><main class="tt-print-page"><header class="tt-print-header"><div><div class="tt-print-brand">TRAINTRACK · RELATÓRIO DE PROGRESSÃO</div><h1>${esc(studentName)}</h1></div><div class="tt-print-meta">${comparison?`Comparação: ${esc(comparison)}<br>`:''}Gerado em ${esc(generated)}</div></header><section class="tt-print-profile">${snap.profile}</section>${snap.body}<footer class="tt-print-footer"><span>TrainTrack · Resultados que contam</span><span>A4 horizontal</span></footer></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),450));<\/script></body></html>`);
    printWindow.document.close();
  }catch(error){
    console.error('TrainTrack print report',error);
    printWindow.document.body.innerHTML=`<div style="font-family:system-ui;padding:30px"><strong>Não foi possível gerar o relatório.</strong><br><small>${esc(error?.message||'Erro inesperado.')}</small></div>`;
    toast?.(error?.message||'Erro ao gerar relatório.',true);
  }
};
})();
