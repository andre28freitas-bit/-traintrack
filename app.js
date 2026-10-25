(() => {
'use strict';

const cfg = window.TRAINTRACK_CONFIG || {};
const sb = window.supabase?.createClient?.(cfg.supabaseUrl, cfg.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const starterTests = [
  {sort_order:1,name:'Supino',category:'Força',unit:'kg',ideal_value:'',scoring_key:'strength_bench',counts_for_score:true,active:true},
  {sort_order:2,name:'Agachamento',category:'Força',unit:'kg',ideal_value:'',scoring_key:'strength_squat',counts_for_score:true,active:true},
  {sort_order:3,name:'Levantamento Terra',category:'Força',unit:'kg',ideal_value:'',scoring_key:'strength_deadlift',counts_for_score:true,active:true},
  {sort_order:4,name:'Remada inclinada',category:'Força',unit:'kg',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:5,name:'Teste de Cooper',category:'Cardiovascular',unit:'m',ideal_value:'',scoring_key:'cooper',counts_for_score:true,active:true},
  {sort_order:6,name:'Teste BIP',category:'Cardiovascular',unit:'nível',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:7,name:'VO₂max estimado',category:'Cardiovascular',unit:'ml/kg/min',ideal_value:'',scoring_key:'vo2_derived',counts_for_score:false,active:true},
  {sort_order:8,name:'Clean & Press',category:'Exercícios integrados',unit:'kg',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:9,name:'Snatch',category:'Exercícios integrados',unit:'kg',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:10,name:'Flexões',category:'Calistenia',unit:'reps',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:11,name:'Afundos',category:'Calistenia',unit:'reps',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:12,name:'Elevações',category:'Calistenia',unit:'reps',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:13,name:'Press militar',category:'Força',unit:'kg',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:14,name:'Leg press',category:'Força',unit:'kg',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:15,name:'Hip thrust',category:'Força',unit:'kg',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:16,name:'Lunges',category:'Força',unit:'kg',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:17,name:'Abdominais',category:'Core',unit:'reps',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:18,name:'Prancha',category:'Core',unit:'s',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:19,name:'Prancha lateral',category:'Core',unit:'s',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:20,name:'Burpees',category:'Calistenia',unit:'reps',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:21,name:'Salto vertical',category:'Potência',unit:'cm',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:22,name:'Salto horizontal',category:'Potência',unit:'cm',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true},
  {sort_order:23,name:'Sit-and-Reach',category:'Mobilidade',unit:'cm',ideal_value:'',scoring_key:'tracking',counts_for_score:false,active:true}
];

const S = { user:null, data:null, view:'dashboard', studentId:null, tab:'overview' };
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const today = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const localDT = d => { const x=new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,16); };
const fmtDate = d => d ? new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${d}T12:00:00`)) : '—';
const fmtDT = d => d ? new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d)) : '—';
const cooperVO2 = distance => { const d=Number(String(distance??'').replace(',','.')); return Number.isFinite(d)&&d>0?(d-504.9)/44.73:null; };
window.ttUpdateDerivedVO2=form=>{if(!form)return;const cooper=S.data?.tests?.find(t=>t.scoring_key==='cooper'),vo2=S.data?.tests?.find(t=>t.scoring_key==='vo2_derived');if(!cooper||!vo2)return;const d=form.querySelector(`[name="test_${cooper.id}"]`)?.value,v=form.querySelector(`[name="test_${vo2.id}"]`);if(v){const x=cooperVO2(d);v.value=x==null?'':x.toFixed(1);}};
const initials = n => String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();

function age(b){
  if(!b) return null;
  const n=new Date(), d=new Date(`${b}T12:00:00`); let a=n.getFullYear()-d.getFullYear();
  const m=n.getMonth()-d.getMonth(); if(m<0 || (m===0 && n.getDate()<d.getDate())) a--; return a;
}
function birthdayDays(b){
  if(!b) return 999; const n=new Date(); n.setHours(0,0,0,0); const d=new Date(`${b}T12:00:00`);
  let next=new Date(n.getFullYear(),d.getMonth(),d.getDate()); if(next<n) next=new Date(n.getFullYear()+1,d.getMonth(),d.getDate());
  return Math.round((next-n)/86400000);
}
function addMonthsClamped(dateStr, months){
  if(!dateStr || !months) return null; const b=new Date(`${dateStr}T12:00:00`), day=b.getDate();
  const t=new Date(b.getFullYear(),b.getMonth()+Number(months),1,12); const last=new Date(t.getFullYear(),t.getMonth()+1,0,12).getDate();
  t.setDate(Math.min(day,last)); return [t.getFullYear(),String(t.getMonth()+1).padStart(2,'0'),String(t.getDate()).padStart(2,'0')].join('-');
}
function student(id){ return S.data?.students.find(x=>x.id===id); }
function assessments(id){ return (S.data?.assessments||[]).filter(x=>x.student_id===id).sort((a,b)=>a.assessment_date.localeCompare(b.assessment_date)); }
function workouts(id){ return (S.data?.workouts||[]).filter(x=>x.student_id===id).sort((a,b)=>b.workout_date.localeCompare(a.workout_date)); }
function reminder(s){
  const last=assessments(s.id).at(-1), months=Number(s.evaluation_interval_months||0);
  if(!last || !months) return {enabled:false,status:'none',next:null,days:null,last:last?.assessment_date||null};
  const next=addMonthsClamped(last.assessment_date,months), days=Math.round((new Date(`${next}T12:00:00`)-new Date(`${today()}T12:00:00`))/86400000);
  const alert=Number(s.evaluation_alert_days??2), status=days<0?'overdue':days===0?'today':days<=alert?'soon':'scheduled';
  return {enabled:true,status,next,days,last:last.assessment_date,alert};
}
function reminderLabel(r){
  if(!r.enabled) return 'Sem frequência definida';
  if(r.status==='overdue') return `Em atraso há ${Math.abs(r.days)} dia${Math.abs(r.days)===1?'':'s'}`;
  if(r.status==='today') return 'Avaliação hoje';
  if(r.status==='soon') return `Avaliação em ${r.days} dia${r.days===1?'':'s'}`;
  return `Próxima: ${fmtDate(r.next)}`;
}
function student(id){ return S.data?.students.find(x=>x.id===id); }
function assessments(id){ return (S.data?.assessments||[]).filter(x=>x.student_id===id).sort((a,b)=>a.assessment_date.localeCompare(b.assessment_date)); }
function workouts(id){ return (S.data?.workouts||[]).filter(x=>x.student_id===id).sort((a,b)=>b.workout_date.localeCompare(a.workout_date)); }
function toast(msg,error=false){ const t=$('#toast'); if(!t)return; t.textContent=msg; t.style.background=error?'#9f2929':'#111827'; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2600); }
function fail(e){ console.error(e); toast(e?.message || 'Ocorreu um erro.',true); }

async function load(){
  const q = await Promise.all([
    sb.from('traintrack_profiles').select('*').maybeSingle(),
    sb.from('traintrack_students').select('*').eq('archived',false).order('name'),
    sb.from('traintrack_test_definitions').select('*').eq('active',true).order('sort_order'),
    sb.from('traintrack_assessments').select('*').order('assessment_date'),
    sb.from('traintrack_workouts').select('*').order('workout_date',{ascending:false}),
    sb.from('traintrack_events').select('*').order('starts_at')
  ]);
  const err=q.find(x=>x.error)?.error; if(err) throw err;
  let [profile,students,tests,assessmentsRows,workoutsRows,events] = q.map(x=>x.data);
  if(!profile){
    const display_name=S.user?.user_metadata?.display_name || S.user?.email?.split('@')[0] || 'Personal Trainer';
    const r=await sb.from('traintrack_profiles').insert({id:S.user.id,display_name}).select().single(); if(r.error) throw r.error; profile=r.data;
  }
  if(!tests?.length){ const r=await sb.from('traintrack_test_definitions').insert(starterTests).select(); if(r.error) throw r.error; tests=r.data; }
  S.data={profile,students:students||[],tests:tests||[],assessments:assessmentsRows||[],workouts:workoutsRows||[],events:events||[]};
}
async function refresh(){ try{ await load(); render(); }catch(e){ fail(e); } }
window.ttReloadData=load;

function authScreen(signup=false){
  $('#root').innerHTML=`<div class="auth-page"><section class="auth-brand"><div class="brand-mark">TT</div><h1>TrainTrack</h1><p>Avaliações físicas, treinos, agenda e progressão numa ferramenta simples para PTs presenciais.</p><div class="auth-feature"><div>✓ Alunos e contactos</div><div>✓ Reavaliações automáticas</div><div>✓ Treinos e agenda</div><div>✓ Progressão visual</div></div></section><section class="auth-panel"><form class="auth-box" onsubmit="submitAuth(event,${signup})"><h2>${signup?'Criar conta':'Entrar'}</h2><p>${signup?'Cria o teu acesso à TrainTrack.':'Acede aos teus alunos e avaliações.'}</p>${signup?'<div class="field"><label>Nome</label><input name="name" required autocomplete="name"></div>':''}<div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email"></div><div class="field"><label>Password</label><input name="password" type="password" minlength="6" required></div><button class="primary">${signup?'Criar conta':'Entrar'}</button><div class="auth-divider">${signup?'Já tens conta?':'Ainda não tens conta?'}</div><button type="button" class="secondary" onclick="authScreen(${!signup})">${signup?'Voltar ao login':'Criar conta'}</button></form></section></div>`;
}
window.authScreen=authScreen;
window.submitAuth=async(e,signup)=>{
  e.preventDefault(); const f=new FormData(e.target);
  try{
    const res=signup ? await sb.auth.signUp({email:f.get('email'),password:f.get('password'),options:{data:{display_name:f.get('name')}}}) : await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
    if(res.error) throw res.error; if(signup && !res.data.session) toast('Conta criada. Confirma o email para entrar.');
  }catch(err){ fail(err); }
};

function shell(){
  const nav=[['dashboard','⌂','Dashboard'],['students','♙','Alunos'],['calendar','▣','Agenda'],['assessments','⌁','Avaliações'],['workouts','≡','Treinos']];
  return `<div class="shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">TT</div><div class="brand-text"><strong>TrainTrack</strong><span>Resultados que contam</span></div></div><nav class="nav">${nav.map(n=>`<button class="nav-btn ${S.view===n[0]?'active':''}" onclick="nav('${n[0]}')"><span class="nav-icon">${n[1]}</span>${n[2]}</button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="sidebar-card"><div class="user">${esc(S.data.profile?.display_name||'PT')}</div><small>Dados cloud protegidos por conta</small><button class="secondary" style="width:100%;margin-top:12px" onclick="logout()">Terminar sessão</button></div></aside><main class="main"><header class="topbar"><div><h1 id="pageTitle"></h1><p id="pageSubtitle"></p></div><div class="topbar-actions"><button class="secondary desktop-only" onclick="exportData()">Exportar</button><button class="primary" onclick="studentModal()">+ Aluno</button></div></header><section class="content" id="content"></section></main><nav class="mobile-nav">${nav.map(n=>`<button class="${S.view===n[0]?'active':''}" onclick="nav('${n[0]}')"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('')}</nav></div>`;
}
function header(t,s){ $('#pageTitle').textContent=t; $('#pageSubtitle').textContent=s; }
window.nav=v=>{ S.view=v; S.studentId=null; S.tab='overview'; render(); };
window.openStudent=(id,tab='overview')=>{ S.view='student'; S.studentId=id; S.tab=tab; render(); };

function render(){
  if(!S.user || !S.data) return authScreen(false);
  $('#root').innerHTML=shell();
  ({dashboard:dashboard,students:studentsPage,calendar:calendarPage,assessments:assessmentIndex,workouts:workoutIndex,student:studentPage}[S.view]||dashboard)();
}
function stat(label,value,note){ return `<div class="card stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`; }
function cards(list){
  if(!list.length) return '<div class="card empty">Ainda não existem alunos.</div>';
  return `<div class="student-grid">${list.map(s=>{ const b=birthdayDays(s.birth_date),r=reminder(s),last=assessments(s.id).at(-1); return `<article class="card student-card"><div class="student-head"><div class="avatar">${initials(s.name)}</div><div><h3>${esc(s.name)}</h3><p>${age(s.birth_date)} anos · ${esc(s.email||'sem email')}</p></div></div><div class="pills">${b<=30?`<span class="pill amber">🎂 ${b===0?'Hoje':`em ${b} dias`}</span>`:''}<span class="pill">Últ. avaliação: ${last?fmtDate(last.assessment_date):'—'}</span>${['overdue','today','soon'].includes(r.status)?`<span class="pill ${r.status==='overdue'?'red':'green'}">⚡ ${reminderLabel(r)}</span>`:''}</div><div class="actions"><button class="secondary" style="flex:1" onclick="openStudent('${s.id}')">Abrir ficha</button><button class="primary" onclick="eventModal('${s.id}')">Agendar</button></div></article>`; }).join('')}</div>`;
}
function dashboard(){
  header('Dashboard','O que precisa da tua atenção hoje.'); const now=new Date();
  const future=S.data.events.filter(e=>new Date(e.starts_at)>=now).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  const rem=S.data.students.map(s=>({s,r:reminder(s)})).filter(x=>['overdue','today','soon'].includes(x.r.status)).sort((a,b)=>(a.r.days??999)-(b.r.days??999));
  const bdays=S.data.students.map(s=>({...s,days:birthdayDays(s.birth_date)})).sort((a,b)=>a.days-b.days).slice(0,6);
  $('#content').innerHTML=`<div class="grid grid-4">${stat('Alunos ativos',S.data.students.length,'Perfis disponíveis')}${stat('Avaliações',S.data.assessments.length,'Resultados guardados')}${stat('Reavaliações pendentes',rem.length,rem.length?'Precisam de atenção':'Tudo em dia')}${stat('Marcações futuras',future.length,'Na agenda')}</div>${rem.length?`<div class="section-head"><div><h2>Reavaliações</h2><p>Calculadas pela última avaliação e frequência de cada aluno.</p></div></div><div class="card card-pad list">${rem.map(x=>`<div class="list-row"><div><strong>${esc(x.s.name)}</strong><div class="stat-note">Última: ${fmtDate(x.r.last)} · Próxima: ${fmtDate(x.r.next)}</div></div><div class="actions"><span class="pill ${x.r.status==='overdue'?'red':'green'}">${reminderLabel(x.r)}</span><button class="primary" onclick="assessmentModal('${x.s.id}')">Avaliar</button></div></div>`).join('')}</div>`:''}<div class="split"><div><div class="section-head"><div><h2>Próximas marcações</h2><p>Agenda ligada às fichas.</p></div><button class="primary" onclick="eventModal()">+ Marcação</button></div><div class="card card-pad list">${future.slice(0,6).map(ev=>`<div class="list-row"><div><strong>${esc(student(ev.student_id)?.name||'Aluno')}</strong><div class="stat-note">${esc(ev.event_type)} · ${esc(ev.location||'Sem local')}</div></div><strong>${fmtDT(ev.starts_at)}</strong></div>`).join('')||'<div class="empty">Sem marcações futuras.</div>'}</div></div><div><div class="section-head"><div><h2>Aniversários</h2></div></div><div class="card card-pad list">${bdays.map(s=>`<div class="list-row"><div><strong>${esc(s.name)}</strong><div class="stat-note">${fmtDate(s.birth_date)} · ${age(s.birth_date)} anos</div></div><span class="pill ${s.days<=30?'amber':''}">${s.days===0?'Hoje 🎉':`em ${s.days} dias`}</span></div>`).join('')}</div></div></div><div class="section-head"><div><h2>Alunos</h2></div><button class="secondary" onclick="nav('students')">Ver todos</button></div>${cards(S.data.students.slice(0,6))}`;
}
function studentsPage(){ header('Alunos','Contactos, avaliações, treinos e progressão.'); $('#content').innerHTML=`<div class="search"><input id="search" placeholder="Pesquisar por nome, email ou contacto…" oninput="filterStudents()"><button class="primary" onclick="studentModal()">+ Novo aluno</button></div><div id="results">${cards(S.data.students)}</div>`; }
window.filterStudents=()=>{ const q=$('#search').value.toLowerCase(); $('#results').innerHTML=cards(S.data.students.filter(s=>[s.name,s.email,s.phone].some(v=>String(v||'').toLowerCase().includes(q)))); };

function studentPage(){
  const s=student(S.studentId); if(!s){S.view='students';return render();} header(s.name,'Ficha completa do aluno.');
  const tabs=[['overview','Visão geral'],['assessments','Avaliações'],['workouts','Treinos'],['progress','Progressão']];
  $('#content').innerHTML=`<section class="card profile"><div class="profile-head"><div class="avatar big">${initials(s.name)}</div><div class="profile-title"><h2>${esc(s.name)}</h2><div class="profile-meta"><span>${age(s.birth_date)} anos</span><span>🎂 ${fmtDate(s.birth_date)}</span>${s.height_cm?`<span>${s.height_cm} cm</span>`:''}${s.weight_kg?`<span>${s.weight_kg} kg</span>`:''}</div></div><div class="actions"><button class="secondary" onclick="sendEmail('${s.id}')">✉ Email</button><button class="success" onclick="sendWA('${s.id}')">WhatsApp</button><button class="secondary" onclick="studentModal('${s.id}')">Editar</button></div></div><div class="tabs">${tabs.map(t=>`<button class="tab ${S.tab===t[0]?'active':''}" onclick="studentTab('${t[0]}')">${t[1]}</button>`).join('')}</div><div class="profile-body" id="studentBody"></div></section>`;
  studentTabRender();
}
window.studentTab=t=>{S.tab=t;studentPage();};
function info(l,v){return `<div class="info"><span>${l}</span><strong>${esc(v)}</strong></div>`;}
function studentTabRender(){
  const s=student(S.studentId), body=$('#studentBody'); if(S.tab==='assessments')return renderAssessments(body,s); if(S.tab==='workouts')return renderWorkouts(body,s); if(S.tab==='progress')return renderProgress(body,s);
  const r=reminder(s), last=assessments(s.id).at(-1), next=S.data.events.filter(e=>e.student_id===s.id&&new Date(e.starts_at)>=new Date()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at))[0],b=birthdayDays(s.birth_date);
  body.innerHTML=`${['overdue','today','soon'].includes(r.status)?`<div class="notice ${r.status==='overdue'?'red':'green'}" style="margin-bottom:13px">⚡ <strong>${reminderLabel(r)}</strong> · prevista para ${fmtDate(r.next)}.</div>`:''}${b<=30?`<div class="notice amber" style="margin-bottom:13px">🎂 Aniversário ${b===0?'hoje':`daqui a ${b} dias`}.</div>`:''}<div class="info-grid">${info('Contacto / WhatsApp',s.phone||'—')}${info('Email',s.email||'—')}${info('Data de nascimento',`${fmtDate(s.birth_date)} · ${age(s.birth_date)} anos`)}${info('Próxima sessão',next?fmtDT(next.starts_at):'Sem marcação')}${info('Última avaliação',last?fmtDate(last.assessment_date):'Sem avaliação')}${info('Próxima avaliação',r.enabled?`${fmtDate(r.next)} · ${reminderLabel(r)}`:'Sem frequência definida')}${info('Frequência',s.evaluation_interval_months?`A cada ${s.evaluation_interval_months} ${Number(s.evaluation_interval_months)===1?'mês':'meses'}`:'Sem lembrete')}${info('Treinos registados',workouts(s.id).length)}</div><div class="section-head"><div><h2>Objetivo / notas</h2></div></div><div class="notice">${esc(s.notes||'Sem notas.')}</div><div class="section-head"><div><h2>Ações rápidas</h2></div></div><div class="actions"><button class="primary" onclick="eventModal('${s.id}')">+ Agendar sessão</button><button class="secondary" onclick="assessmentModal('${s.id}')">+ Nova avaliação</button><button class="secondary" onclick="workoutModal('${s.id}')">+ Registar treino</button></div>`;
}
function renderAssessments(body,s){
  const list=assessments(s.id); body.innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Matriz de avaliação física</h2><p>Valor ideal e uma coluna por data.</p></div><div class="actions"><button class="secondary" onclick="testModal()">+ Teste</button><button class="primary" onclick="assessmentModal('${s.id}')">+ Nova avaliação</button></div></div><div class="notice amber" style="margin-bottom:13px">Scores preparados, mas desligados até introduzirmos as fórmulas e standards reais.</div><div class="card table-wrap" style="box-shadow:none"><table class="matrix"><thead><tr><th>#</th><th>Exercício / teste</th><th>Categoria</th><th>Ideal</th>${list.map(a=>`<th>${fmtDate(a.assessment_date)}</th>`).join('')}<th>Score</th></tr></thead><tbody>${S.data.tests.map(t=>`<tr><td>${t.sort_order}</td><td><strong>${esc(t.name)}</strong><div class="stat-note">${esc(t.unit||'')}</div></td><td><span class="badge ${t.category==='Força'?'blue':'green'}">${esc(t.category)}</span></td><td>${esc(t.ideal_value||'—')} ${esc(t.unit||'')}</td>${list.map(a=>`<td>${esc(a.values?.[t.id]||'—')} ${a.values?.[t.id]?esc(t.unit||''):''}</td>`).join('')}<td><span class="score-empty">Por definir</span></td></tr>`).join('')}</tbody></table></div>`;
}
function workoutExerciseSummary(x){
  if(Array.isArray(x?.series)){
    const cells=x.series.map((s,i)=>s?.display?`S${i+1} ${esc(s.display)}`:'').filter(Boolean);
    return `<strong>${esc(x.name||'Exercício')}</strong>${cells.length?` · ${cells.join(' · ')}`:''}`;
  }
  return `${esc(x?.name||'Exercício')} · ${esc(x?.sets||'—')}×${esc(x?.reps||'—')} · ${esc(x?.load||'—')}`;
}
function renderWorkouts(body,s){ const list=workouts(s.id); body.innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Treinos</h2></div><button class="primary" onclick="workoutModal('${s.id}')">+ Novo treino</button></div><div class="card table-wrap" style="box-shadow:none"><table><thead><tr><th>Data</th><th>Tipo</th><th>Duração</th><th>Exercícios</th><th>Observações</th></tr></thead><tbody>${list.map(w=>`<tr><td>${fmtDate(w.workout_date)}</td><td><strong>${esc(w.workout_type)}</strong></td><td>${w.duration_min||'—'} min</td><td>${(w.exercises||[]).map(workoutExerciseSummary).join('<br>')||'—'}</td><td>${esc(w.notes||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Sem treinos registados.</td></tr>'}</tbody></table></div>`; }
function chart(vals){
  const a=vals.map(Number).filter(Number.isFinite); if(a.length<2)return '<div class="empty">São necessárias 2 avaliações.</div>';
  const w=280,h=90,p=8,min=Math.min(...a),max=Math.max(...a),range=max-min||1,pts=a.map((v,i)=>[p+i*((w-2*p)/(a.length-1)),h-p-(v-min)/range*(h-2*p)]);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line class="chart-grid" x1="0" y1="${h-10}" x2="${w}" y2="${h-10}"></line><polyline class="chart-line" points="${pts.map(x=>x.join(',')).join(' ')}"></polyline>${pts.map(x=>`<circle class="chart-dot" cx="${x[0]}" cy="${x[1]}" r="3.5"></circle>`).join('')}</svg>`;
}
function renderProgress(body,s){ const list=assessments(s.id); body.innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Progressão</h2><p>Evolução dos resultados brutos.</p></div></div><div class="notice" style="margin-bottom:13px">O radar e o score agregado entram quando estiverem definidos os standards reais.</div><div class="progress-grid">${S.data.tests.map(t=>{const vals=list.map(a=>a.values?.[t.id]).filter(v=>v!==''&&v!=null),f=Number(vals[0]),l=Number(vals.at(-1)),c=Number.isFinite(f)&&Number.isFinite(l)&&f?((l-f)/Math.abs(f))*100:null;return `<article class="card progress-card"><div class="progress-card-head"><h3>${esc(t.name)}</h3><span class="badge">${esc(t.category)}</span></div><div class="stat-note">Ideal: ${esc(t.ideal_value||'—')} ${esc(t.unit||'')}</div><div class="chart">${chart(vals)}</div><div class="metric-line"><div><div class="stat-note">Último</div><strong>${vals.length?esc(vals.at(-1)):'—'} ${esc(t.unit||'')}</strong></div>${c!==null?`<span class="pill ${c>=0?'green':'red'}">${c>=0?'+':''}${c.toFixed(1)}%</span>`:''}</div></article>`}).join('')}</div>`; }

function calendarPage(){
  header('Agenda','Treinos e avaliações associados a cada aluno.'); const b=new Date(),wd=(b.getDay()+6)%7;b.setDate(b.getDate()-wd);b.setHours(0,0,0,0);const days=Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(d.getDate()+i);return d;});
  $('#content').innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Semana atual</h2></div><button class="primary" onclick="eventModal()">+ Nova marcação</button></div><div class="calendar">${days.map(d=>{const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,evs=S.data.events.filter(e=>{const x=new Date(e.starts_at);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`===key;});return `<div class="day"><h4>${new Intl.DateTimeFormat('pt-PT',{weekday:'short',day:'2-digit',month:'2-digit'}).format(d)}</h4>${evs.map(e=>`<div class="event ${e.event_type==='Avaliação'?'eval':''}" onclick="openStudent('${e.student_id}')"><strong>${new Date(e.starts_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})} · ${esc(student(e.student_id)?.name||'Aluno')}</strong>${esc(e.event_type)}<br>${esc(e.location||'')}</div>`).join('')||'<div class="stat-note">Sem marcações</div>'}</div>`}).join('')}</div>`;
}
function assessmentIndex(){ header('Avaliações','Escolhe um aluno para abrir a matriz.'); $('#content').innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Avaliações por aluno</h2></div></div>${cards(S.data.students)}`; }
function workoutIndex(){ header('Treinos','Histórico das sessões normais.'); const list=[...S.data.workouts].sort((a,b)=>b.workout_date.localeCompare(a.workout_date)); $('#content').innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Treinos recentes</h2></div><button class="primary" onclick="workoutModal()">+ Novo treino</button></div><div class="card table-wrap"><table><thead><tr><th>Data</th><th>Aluno</th><th>Tipo</th><th>Duração</th><th>Notas</th></tr></thead><tbody>${list.map(w=>`<tr><td>${fmtDate(w.workout_date)}</td><td><button class="ghost" onclick="openStudent('${w.student_id}','workouts')">${esc(student(w.student_id)?.name||'Aluno')} →</button></td><td>${esc(w.workout_type)}</td><td>${w.duration_min||'—'} min</td><td>${esc(w.notes||'—')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Sem treinos.</td></tr>'}</tbody></table></div>`; }

function modal(html){ $('#modalRoot').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`; }
window.closeModal=()=>$('#modalRoot').innerHTML='';
function opts(selected=''){ return S.data.students.map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${esc(s.name)}</option>`).join(''); }
window.studentModal=id=>{
  const s=id?student(id):null; modal(`<div class="modal-head"><h2>${s?'Editar aluno':'Novo aluno'}</h2><button class="icon-btn" onclick="closeModal()">×</button></div><form onsubmit="saveStudent(event,'${id||''}')"><div class="form-grid"><div class="field full"><label>Nome</label><input name="name" required value="${esc(s?.name||'')}"></div><div class="field"><label>Contacto / WhatsApp</label><input name="phone" value="${esc(s?.phone||'')}"></div><div class="field"><label>Email</label><input name="email" type="email" value="${esc(s?.email||'')}"></div><div class="field"><label>Data de nascimento</label><input name="birth_date" type="date" required value="${esc(s?.birth_date||'')}"></div><div class="field"><label>Idade</label><input disabled value="${s?.birth_date?age(s.birth_date)+' anos':'calculada automaticamente'}"></div><div class="field"><label>Referência das tabelas</label><select name="reference_sex"><option value="">Não definida</option><option value="male" ${s?.reference_sex==='male'?'selected':''}>Homem</option><option value="female" ${s?.reference_sex==='female'?'selected':''}>Mulher</option></select></div><div class="field"><label>Altura (cm)</label><input name="height_cm" type="number" step="0.1" value="${esc(s?.height_cm||'')}"></div><div class="field"><label>Peso (kg)</label><input name="weight_kg" type="number" step="0.1" value="${esc(s?.weight_kg||'')}"></div><div class="field"><label>Frequência da avaliação</label><select name="evaluation_interval_months">${[[0,'Sem lembrete'],[1,'Todos os meses'],[2,'A cada 2 meses'],[3,'A cada 3 meses'],[6,'A cada 6 meses'],[12,'Todos os anos']].map(x=>`<option value="${x[0]}" ${Number(s?.evaluation_interval_months??1)===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div><div class="field"><label>Avisar com antecedência</label><select name="evaluation_alert_days">${[0,1,2,3,7].map(x=>`<option value="${x}" ${Number(s?.evaluation_alert_days??2)===x?'selected':''}>${x===0?'No próprio dia':`${x} dia${x===1?'':'s'} antes`}</option>`).join('')}</select></div><div class="field full"><label>Objetivo / notas</label><textarea name="notes">${esc(s?.notes||'')}</textarea></div></div><div class="form-actions">${s?`<button type="button" class="danger" onclick="deleteStudent('${s.id}')">Eliminar</button>`:''}<button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Guardar</button></div></form>`);
};
window.saveStudent=async(e,id)=>{
  e.preventDefault();const f=new FormData(e.target),row={name:f.get('name').trim(),phone:f.get('phone').trim(),email:f.get('email').trim(),birth_date:f.get('birth_date'),reference_sex:String(f.get('reference_sex')||'')||null,height_cm:Number(f.get('height_cm'))||null,weight_kg:Number(f.get('weight_kg'))||null,evaluation_interval_months:Number(f.get('evaluation_interval_months'))||0,evaluation_alert_days:Number(f.get('evaluation_alert_days'))||0,notes:f.get('notes').trim(),archived:false};
  try{let r;if(id)r=await sb.from('traintrack_students').update(row).eq('id',id).select().single();else r=await sb.from('traintrack_students').insert(row).select().single();if(r.error)throw r.error;closeModal();S.view='student';S.studentId=r.data.id;await refresh();toast('Aluno guardado.');}catch(err){fail(err);}
};
window.deleteStudent=async id=>{if(!confirm('Eliminar este aluno e o histórico associado?'))return;try{const r=await sb.from('traintrack_students').delete().eq('id',id);if(r.error)throw r.error;closeModal();S.view='students';S.studentId=null;await refresh();}catch(e){fail(e);}};
window.sendEmail=id=>{const s=student(id);if(!s?.email)return toast('Este aluno não tem email.',true);location.href=`mailto:${encodeURIComponent(s.email)}`;};
window.sendWA=id=>{const s=student(id);if(!s?.phone)return toast('Este aluno não tem contacto.',true);window.open(`https://wa.me/${s.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${s.name.split(' ')[0]},`)}`,'_blank','noopener');};

window.testModal=()=>modal(`<div class="modal-head"><h2>Novo exercício / teste</h2><button class="icon-btn" onclick="closeModal()">×</button></div><form onsubmit="saveTest(event)"><div class="form-grid"><div class="field"><label>Número / ordem</label><input type="number" name="sort_order" value="${S.data.tests.length+1}" required></div><div class="field"><label>Categoria</label><select name="category"><option>Força</option><option>Cardiovascular</option><option>Exercícios integrados</option><option>Calistenia</option><option>Core</option><option>Resistência</option><option>Mobilidade</option><option>Potência</option><option>Outro</option></select></div><div class="field full"><label>Exercício / teste</label><input name="name" required></div><div class="field"><label>Unidade</label><input name="unit"></div><div class="field"><label>Valor ideal</label><input name="ideal_value"></div><div class="field"><label>Modo</label><select name="score_mode"><option value="tracking">Só tracking</option><option value="score">Avaliação + tracking</option></select></div></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Adicionar</button></div></form>`);
window.saveTest=async e=>{e.preventDefault();const f=new FormData(e.target);try{const r=await sb.from('traintrack_test_definitions').insert({sort_order:Number(f.get('sort_order')),name:f.get('name').trim(),category:f.get('category'),unit:f.get('unit').trim(),ideal_value:f.get('ideal_value').trim(),counts_for_score:f.get('score_mode')==='score',active:true});if(r.error)throw r.error;closeModal();await refresh();}catch(err){fail(err);}};

window.assessmentModal=(id='')=>modal(`<div class="modal-head"><h2>Nova avaliação física</h2><button class="icon-btn" onclick="closeModal()">×</button></div><form onsubmit="saveAssessment(event)"><div class="form-grid"><div class="field"><label>Aluno</label><select name="student_id" required><option value="">Selecionar…</option>${opts(id)}</select></div><div class="field"><label>Data</label><input type="date" name="assessment_date" value="${today()}" required></div>${S.data.tests.map(t=>t.scoring_key==='vo2_derived'?`<div class="field"><label>${t.sort_order}. ${esc(t.name)}</label><input name="test_${t.id}" readonly placeholder="Calculado automaticamente pelo Cooper"><div class="stat-note">Calculado a partir da distância do Cooper.</div></div>`:`<div class="field"><label>${t.sort_order}. ${esc(t.name)} ${t.ideal_value?`· ideal ${esc(t.ideal_value)} ${esc(t.unit||'')}`:''}</label><input name="test_${t.id}" placeholder="${esc(t.unit||'valor')}" ${t.scoring_key==='cooper'?'oninput="ttUpdateDerivedVO2(this.form)"':''}></div>`).join('')}<div class="field full"><label>Notas</label><textarea name="notes"></textarea></div></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Guardar avaliação</button></div></form>`);
window.saveAssessment=async e=>{e.preventDefault();ttUpdateDerivedVO2(e.target);const f=new FormData(e.target),values={};S.data.tests.forEach(t=>values[t.id]=String(f.get(`test_${t.id}`)||'').trim());const cooper=S.data.tests.find(t=>t.scoring_key==='cooper'),vo2=S.data.tests.find(t=>t.scoring_key==='vo2_derived');if(cooper&&vo2){const x=cooperVO2(values[cooper.id]);values[vo2.id]=x==null?'':x.toFixed(1);}const row={student_id:f.get('student_id'),assessment_date:f.get('assessment_date'),values,scores:{},notes:f.get('notes').trim()};try{const r=await sb.from('traintrack_assessments').insert(row);if(r.error)throw r.error;closeModal();S.studentId=row.student_id;S.view='student';S.tab='assessments';await refresh();toast('Avaliação guardada.');}catch(err){fail(err);}};

function workoutExerciseNames(){
  return [...new Set((S.data?.tests||[]).map(t=>String(t.name||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'pt'));
}
function workoutExerciseOptions(){
  return workoutExerciseNames().map(name=>`<option value="${esc(name)}"></option>`).join('');
}
window.ttCloseWorkoutSuggestions=()=>{
  document.querySelector('#ttWorkoutSuggestions')?.remove();
};
window.ttPickWorkoutExercise=(inputId,encodedName)=>{
  const input=document.getElementById(inputId);
  if(!input)return;
  input.value=decodeURIComponent(encodedName);
  ttCloseWorkoutSuggestions();
  input.focus();
};
window.ttWorkoutSuggest=input=>{
  if(!input)return;
  const q=String(input.value||'').trim().toLocaleLowerCase('pt-PT');
  ttCloseWorkoutSuggestions();
  if(!q)return;
  const names=workoutExerciseNames();
  const matches=names
    .filter(name=>name.toLocaleLowerCase('pt-PT').includes(q))
    .sort((a,b)=>{
      const al=a.toLocaleLowerCase('pt-PT'),bl=b.toLocaleLowerCase('pt-PT');
      const ap=al.startsWith(q)?0:1,bp=bl.startsWith(q)?0:1;
      return ap-bp||a.localeCompare(b,'pt');
    })
    .slice(0,7);
  if(!matches.length)return;
  const r=input.getBoundingClientRect();
  const popup=document.createElement('div');
  popup.id='ttWorkoutSuggestions';
  popup.className='workout-autocomplete';
  popup.style.left=`${Math.max(8,Math.min(r.left,window.innerWidth-248))}px`;
  popup.style.top=`${Math.min(r.bottom+5,window.innerHeight-220)}px`;
  popup.style.width=`${Math.max(220,Math.min(280,window.innerWidth-16))}px`;
  popup.innerHTML=matches.map(name=>`<button type="button" onpointerdown="event.preventDefault();ttPickWorkoutExercise('${input.id}','${encodeURIComponent(name)}')"><strong>${esc(name)}</strong><span>${esc((S.data?.tests||[]).find(t=>t.name===name)?.category||'Exercício')}</span></button>`).join('');
  document.body.appendChild(popup);
};
window.ttWorkoutNameKey=(event,input)=>{
  if(event.key==='Escape')ttCloseWorkoutSuggestions();
  if(event.key==='Enter'&&document.querySelector('#ttWorkoutSuggestions')){
    const first=document.querySelector('#ttWorkoutSuggestions button');
    if(first){event.preventDefault();first.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));}
  }
};
window.ttNormalizeWorkoutSet=input=>{
  input.value=String(input.value||'').trim().replace(/\s*[xX*]\s*/g,'×');
};
window.ttWorkoutCellKey=(event,input)=>{
  if(event.key!=='Enter')return;
  event.preventDefault();
  ttNormalizeWorkoutSet(input);
  const inputs=[...input.closest('form').querySelectorAll('.workout-grid input')];
  const next=inputs[inputs.indexOf(input)+1];
  if(next)next.focus();
};
function workoutGridRow(index){
  const inputId=`workoutExercise_${index}`;
  return `<tr data-workout-row><td class="workout-name-cell"><input id="${inputId}" name="exercise_name_${index}" autocomplete="off" autocapitalize="words" placeholder="Ex.: Supino" oninput="ttWorkoutSuggest(this)" onfocus="ttWorkoutSuggest(this)" onkeydown="ttWorkoutNameKey(event,this)" onblur="setTimeout(ttCloseWorkoutSuggestions,140)"></td>${[1,2,3,4,5].map(s=>`<td><input name="exercise_${index}_set_${s}" inputmode="text" autocomplete="off" autocapitalize="off" placeholder="10×60" onblur="ttNormalizeWorkoutSet(this)" onkeydown="ttWorkoutCellKey(event,this)"></td>`).join('')}<td><button type="button" class="icon-btn workout-remove" onclick="ttRemoveWorkoutRow(this)" aria-label="Remover exercício">×</button></td></tr>`;
}
window.ttAddWorkoutRow=()=>{
  const body=document.querySelector('#workoutGridBody');if(!body)return;
  const index=Number(body.dataset.nextIndex||body.children.length);
  body.insertAdjacentHTML('beforeend',workoutGridRow(index));
  body.dataset.nextIndex=String(index+1);
};
window.ttRemoveWorkoutRow=btn=>{
  const row=btn.closest('[data-workout-row]'),body=document.querySelector('#workoutGridBody');
  if(!row||!body)return;
  if(body.querySelectorAll('[data-workout-row]').length<=1){
    row.querySelectorAll('input').forEach(i=>i.value='');
    return;
  }
  row.remove();
};
function parseWorkoutSet(raw){
  const display=String(raw||'').trim();
  if(!display)return null;
  const parts=display.split(/\s*[×xX*]\s*/);
  return {display,reps:(parts[0]||'').trim(),load:(parts.slice(1).join('×')||'').trim()};
}
window.workoutModal=(id='')=>modal(`<div class="modal-head"><h2>Registar treino</h2><button class="icon-btn" onclick="closeModal()">×</button></div><form class="workout-form" onsubmit="saveWorkout(event)"><div class="form-grid"><div class="field full workout-student"><label>Aluno</label><select name="student_id" required><option value="">Selecionar…</option>${opts(id)}</select></div><div class="field workout-date"><label>Data</label><input type="date" name="workout_date" value="${today()}" required></div><div class="field workout-duration"><label>Duração (min)</label><input type="number" name="duration_min" value="60"></div><div class="field full workout-type"><label>Tipo</label><input name="workout_type" placeholder="Ex.: Upper Body" required></div><div class="field full workout-sheet-field"><label>Exercícios e séries</label><div class="workout-help">Cada célula: <strong>reps × carga</strong> · Ex.: <strong>10×60</strong> ou <strong>12×PC</strong>.</div><div class="workout-scroll-hint">Desliza para ver as séries 3–5 →</div><div class="workout-grid-wrap"><table class="workout-grid"><thead><tr><th>Exercício</th><th>Série 1</th><th>Série 2</th><th>Série 3</th><th>Série 4</th><th>Série 5</th><th></th></tr></thead><tbody id="workoutGridBody" data-next-index="4">${[0,1,2,3].map(workoutGridRow).join('')}</tbody></table></div><button type="button" class="secondary workout-add-row" onclick="ttAddWorkoutRow()">+ Exercício</button></div><div class="field full workout-notes"><label>Observações</label><textarea name="notes"></textarea></div></div><div class="form-actions workout-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Guardar treino</button></div></form>`);
window.saveWorkout=async e=>{e.preventDefault();const f=new FormData(e.target),exercises=[...e.target.querySelectorAll('[data-workout-row]')].map(row=>{const name=row.querySelector('input[name^="exercise_name_"]')?.value.trim()||'';const series=[...row.querySelectorAll('input[name*="_set_"]')].map(i=>parseWorkoutSet(i.value)).filter(Boolean);return{name,series};}).filter(x=>x.name||x.series.length);const row={student_id:f.get('student_id'),workout_date:f.get('workout_date'),workout_type:f.get('workout_type').trim(),duration_min:Number(f.get('duration_min'))||null,exercises,notes:f.get('notes').trim()};try{const r=await sb.from('traintrack_workouts').insert(row);if(r.error)throw r.error;closeModal();S.studentId=row.student_id;S.view='student';S.tab='workouts';await refresh();toast('Treino guardado.');}catch(err){fail(err);}};

window.eventModal=(id='')=>{const st=new Date();st.setMinutes(Math.ceil(st.getMinutes()/15)*15,0,0);const en=new Date(st.getTime()+3600000);modal(`<div class="modal-head"><h2>Nova marcação</h2><button class="icon-btn" onclick="closeModal()">×</button></div><form onsubmit="saveEvent(event)"><div class="form-grid"><div class="field full"><label>Aluno</label><select name="student_id" required><option value="">Selecionar…</option>${opts(id)}</select></div><div class="field"><label>Início</label><input type="datetime-local" name="starts_at" value="${localDT(st)}" required></div><div class="field"><label>Fim</label><input type="datetime-local" name="ends_at" value="${localDT(en)}" required></div><div class="field"><label>Tipo</label><select name="event_type"><option>Treino</option><option>Avaliação</option><option>Consulta</option><option>Outro</option></select></div><div class="field"><label>Local</label><input name="location"></div><div class="field full"><label>Notas</label><textarea name="notes"></textarea></div></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Agendar</button></div></form>`);};
window.saveEvent=async e=>{e.preventDefault();const f=new FormData(e.target),st=new Date(f.get('starts_at')),en=new Date(f.get('ends_at'));if(en<=st)return toast('A hora de fim tem de ser posterior ao início.',true);try{const r=await sb.from('traintrack_events').insert({student_id:f.get('student_id'),starts_at:st.toISOString(),ends_at:en.toISOString(),event_type:f.get('event_type'),location:f.get('location').trim(),notes:f.get('notes').trim(),status:'scheduled'});if(r.error)throw r.error;closeModal();S.view='calendar';await refresh();toast('Marcação criada.');}catch(err){fail(err);}};

window.exportData=()=>{const blob=new Blob([JSON.stringify(S.data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`traintrack-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);};
window.logout=()=>sb.auth.signOut();

async function init(){
  if(!sb){ $('#root').innerHTML='<div class="empty">Configuração Supabase em falta.</div>'; return; }
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
  const {data:{user}}=await sb.auth.getUser(); S.user=user||null;
  sb.auth.onAuthStateChange(async(_event,session)=>{S.user=session?.user||null;if(S.user)await refresh();else{S.data=null;authScreen(false);}});
  if(S.user) await refresh(); else authScreen(false);
}
init();
})();
