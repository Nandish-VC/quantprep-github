// Curriculum seed (editable idea: tick subtopics as you finish them)
const C={"Probability":"Counting|Conditional probability & Bayes|Random variables|Distributions (Bern/Bin/Poisson/Geo/Unif/Exp/Normal/Gamma/Beta/χ²/t)|Expectation, variance, covariance|MGFs & characteristic functions|Joint/marginal/conditional|LLN & CLT|Order statistics|Transformations|Markov chains|Random walks & gambler's ruin|Martingales & stopping times|Poisson process|Brownian motion intro|Conditional expectation (tower)",
"Statistics":"MLE & method of moments|Bias/variance|Confidence intervals|Hypothesis tests & p-values|Linear regression & assumptions|Multicollinearity/heteroscedasticity|Bayesian basics|Time series (stationarity, ACF, ARIMA)|GARCH intro|Bootstrapping",
"Python libraries":"NumPy|Pandas|SciPy|Matplotlib/Seaborn|Statsmodels|Scikit-learn|Numba (optional)|Project: Monte Carlo option pricing|Project: momentum/mean-reversion backtest|Project: Black-Scholes & Greeks|Project: mean-variance optimisation",
"DSA":"Arrays & strings|Linked lists|Stacks & queues|Hashing|Recursion/backtracking|Sorting & searching|Trees & BST|Tries, segment/Fenwick|Heaps|Graphs (BFS/DFS/Dijkstra/topo/DSU/MST)|Dynamic programming|Greedy|Two pointers & sliding window|Bit manipulation|Complexity analysis",
"C++":"Pointers & references|Stack vs heap, RAII|Smart pointers|Classes, Rule of 3/5|Virtual functions|STL|Templates|Lambdas|Move semantics|Basic multithreading",
"OOP (Python)":"Classes & inheritance|MRO & polymorphism|abc & dunder methods|Design patterns|SOLID|Dataclasses & type hints|pytest|Project: backtesting framework",
"Complex Analysis":"Complex numbers & Euler|Analytic functions, Cauchy-Riemann|Contour integration, Cauchy's theorem|Laurent series & residues|Conformal maps|Fourier & Laplace transforms|Quant link: char. functions & Fourier pricing",
"Operating Systems":"Processes & threads|Synchronisation|Memory management|Linux/shell/git"};
const SRC=["LeetCode","Mosteller 50","Heard on the Street","Brainteaser","Other"];
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const td=()=>fmt(new Date()),add=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return fmt(d)};
const mon=s=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));return fmt(d)};
let S=JSON.parse(localStorage.qp||"null"),tab="today",board=[],bm="wk",err="",tm=JSON.parse(localStorage.qpt||"null"),T;
// modal state: must be declared before the first draw() call
let M=null,Q=null;
const sub=k=>{const[t,i]=k.split("|");return C[t].split("|")[i]};
const sb=supabase.createClient(CFG.url,CFG.key);
// Supabase Auth needs an email, so we derive a hidden one from the name (users never see or type it).
const em=n=>[...new TextEncoder().encode(n.trim().toLowerCase())].map(b=>b.toString(16).padStart(2,"0")).join("")+"@quantprep.app";
const stats=()=>({wk:weekMin(),streak:streak(),probs:S.d.problems.length,topics:Object.keys(S.d.done).length});
async function api(a,b={}){try{
 if(a=="register"){const n=(b.name||"").trim();if(!/^[\w .-]{2,24}$/.test(n)||(b.pw||"").length<6)return{err:"Name 2-24 chars, password 6+ chars"};
  const{data,error}=await sb.auth.signUp({email:em(n),password:b.pw});
  if(error)return{err:/registered/i.test(error.message)?"Name already taken":error.message};
  if(!data.session)return{err:"Disable 'Confirm email' in Supabase Auth settings"};
  const d={logs:[],done:{},rev:{},problems:[],errors:[],start:null};
  const r=await sb.from("profiles").insert({id:data.user.id,name:n,data:d});if(r.error)return{err:r.error.message};
  await sb.from("board").upsert({id:data.user.id,name:n});return{tok:1,name:n,d}}
 if(a=="login"){const{data,error}=await sb.auth.signInWithPassword({email:em(b.name||""),password:b.pw||""});if(error)return{err:"Wrong name or password"};
  const r=await sb.from("profiles").select("name,data").eq("id",data.user.id).single();return r.error?{err:r.error.message}:{tok:1,name:r.data.name,d:r.data.data}}
 if(a=="load"){const r=await sb.from("profiles").select("data").single();return r.error?{err:"Session expired, log in again"}:{d:r.data.data}}
 if(a=="save"){const{data:{user}}=await sb.auth.getUser();if(!user)return{err:"Session expired, log in again"};
  const r1=await sb.from("profiles").update({data:b.d}).eq("id",user.id);
  const r2=await sb.from("board").upsert({id:user.id,name:S.name,...stats(),updated_at:new Date().toISOString()});
  const e=r1.error||r2.error;return e?{err:e.message}:{ok:1}}
 if(a=="board"){const r=await sb.from("board").select("name,wk,streak,probs,topics");return{rows:r.data||[]}}
 if(a=="delete"){await sb.rpc("delete_me");return{ok:1}}
}catch(e){return{err:"Network error"}}}
function save(){localStorage.qp=JSON.stringify(S);clearTimeout(T);T=setTimeout(async()=>{if(!S)return;const r=await api("save",{d:S.d});if(r.err){err=r.err;if(/expired/.test(r.err)){S=null;localStorage.qp="null"}}else err="";draw()},700);draw()}
async function auth(a){const r=await api(a,{name:$("#n").value,pw:$("#p").value});if(r.err){err=r.err;return draw()}S={tok:r.tok,name:r.name,d:r.d};if(!S.d.start)S.d.start=td();err="";localStorage.qp=JSON.stringify(S);save();tab="today";draw()}
function logout(){sb.auth.signOut();S=null;localStorage.qp="null";draw()}
// stats (mirror of server logic)
function streak(){const ds=new Set(S.d.logs.filter(l=>l.min>=30).map(l=>l.date));let c=td(),s=0;if(!ds.has(c))c=add(c,-1);while(ds.has(c)){s++;c=add(c,-1)}return s}
function weekMin(){const m=mon(td());return S.d.logs.filter(l=>l.date>=m).reduce((a,l)=>a+l.min,0)}
function missedYesterday(){const ds=new Set(S.d.logs.filter(l=>l.min>=30).map(l=>l.date));const y=add(td(),-1),dow=new Date(y+"T00:00:00").getDay();return dow!=0&&!ds.has(y)&&!ds.has(td())&&S.d.logs.length>0}
// Spaced repetition: study day 0, reviews at +3, +7, +21, then every 30 days. "Forgot" resets to +1 day.
const iv=s=>[0,3,7,21][s]??30;
function toggleSub(t,i){const k=t+"|"+i,d=S.d;if(d.done[k]){delete d.done[k];delete d.rev[k]}else{d.done[k]=td();d.rev[k]={s:1,n:add(td(),iv(1))}}save();if(d.done[k]&&N[k])startQ(k)}
function review(k,ok){const r=S.d.rev[k];if(ok){r.s++;r.n=add(td(),iv(r.s))}else{r.s=1;r.n=add(td(),1)}save()}
function week(){const w=Math.floor((new Date(td())-new Date(S.d.start))/6048e5)+1;return Math.max(1,w)}
function plan(w){const A=w<=8?"Probability core":w<=16?"Advanced probability (joint, CLT, MGFs, Markov, martingales)":w<=26?"Statistics":w<=30?"Complex analysis (lean)":"Buffer: timed probability/stats mocks";
const B=w<=8?"DSA in Python (arrays, hashing, two pointers, windows, stacks, recursion, sorting, binary search)":w<=14?"Python libraries":w<=16?"C++ fundamentals":w<=20?"C++ STL":w<=26?"DSA: trees, heaps, graphs, DP":w<=29?"OOP + backtesting framework":w==30?"OS basics":"Research-style project, mock interviews";return{A,B}}
function dayType(){const d=new Date().getDay();return d==0?"Rest day 😴":d==5?"Timed problem set":d==6?"Weekly review + error log + mini project":"New material"}
// actions
function addLog(min,topic,block,diff,conf,note){S.d.logs.push({date:td(),min:+min,topic,block,diff:+diff,conf:+conf,note});save()}
function manualLog(){addLog($("#lm").value||0,$("#lt").value,$("#lb").value,$("#ld").value,$("#lc").value,$("#ln").value)}
function startT(){tm={s:Date.now()};localStorage.qpt=JSON.stringify(tm);draw()}
function stopT(){const m=Math.max(1,Math.round((Date.now()-tm.s)/6e4));tm=null;localStorage.qpt="null";addLog(m,$("#tt").value||"General",$("#tb").value,3,3,"Timer")}
function quick(){addLog(30,"Minimum day","A",2,3,"30-minute minimum day")}
function addProb(){const n=$("#pn").value.trim();if(!n)return;const r=$("#pr").value;S.d.problems.push({date:td(),name:n,src:$("#ps").value,diff:$("#pd").value,res:r,min:+$("#pm").value||0,redo:r=="no"?add(td(),7):null});save()}
function redoDone(i){S.d.problems[i].redo=null;save()}
function addErr(){S.d.errors.push({date:td(),type:$("#et").value,topic:$("#eo").value,sym:$("#es").value,root:$("#er").value,fix:$("#ef").value,code:$("#ec").value});save()}
function setStart(v){if(v){S.d.start=v;save()}}
async function loadBoard(){const r=await api("board",{today:td()});board=r.rows||[];if(tab=="board")draw()}
async function del(){if(confirm("Delete your account and all data permanently?")){await api("delete");logout()}}
function exportJ(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(S.d,null,2)],{type:"application/json"}));a.download="quantprep-data.json";a.click()}
// views
const bar=(p)=>`<div class="bar"><i style="width:${Math.min(100,p)}%"></i></div>`;
function vToday(){const w=week(),p=plan(w),h=weekMin(),due=dueList(),dm=S.d.logs.filter(l=>l.date==td()).reduce((a,l)=>a+l.min,0);
const days=[...Array(7)].map((_,i)=>{const d=add(mon(td()),i);return[d,S.d.logs.filter(l=>l.date==d).reduce((a,l)=>a+l.min,0)]});
return`${missedYesterday()?`<div class="card" style="border-color:var(--w)">⚠️ You missed yesterday. Never miss twice: even a 30-minute day counts!</div>`:""}
<div class="g"><div class="card"><div class="m">Streak</div><div class="big">🔥 ${streak()}</div></div><div class="card"><div class="m">Week ${w}/35 ${w%4==0?"· review+mock week":""}</div>${bar(w/35*100)}</div>
<div class="card"><div class="m">Hours this week (target 12)</div><div class="big">${(h/60).toFixed(1)}</div>${bar(h/720*100)}</div><div class="card"><div class="m">Problems (target 250)</div><div class="big">${S.d.problems.length}</div>${bar(S.d.problems.length/2.5)}</div></div>
<div class="card"><h3>Today: ${dayType()}</h3><div class="m">Studied today: ${dm} min</div><p><b>Block A (60m):</b> ${esc(p.A)}<br><b>Block B (60m):</b> ${esc(p.B)}</p>
<div class="row"><button class="p" onclick="quick()">✓ 30-min minimum day</button><label class="m">Plan start date <input type="date" value="${S.d.start}" onchange="setStart(this.value)"></label></div></div>
<div class="card"><h3>Timer</h3><div class="row">${tm?`<span>Running since ${new Date(tm.s).toLocaleTimeString()}</span>`:""}<input id="tt" placeholder="Topic" list="tl"><select id="tb"><option>A</option><option>B</option></select>${tm?`<button class="p" onclick="stopT()">Stop & log</button>`:`<button class="p" onclick="startT()">Start</button>`}</div></div>
<datalist id="tl">${Object.keys(C).map(t=>`<option>${esc(t)}`).join("")}</datalist>
<div class="card"><h3>This week (minutes/day)</h3><div class="cols">${days.map(([d,m])=>`<div><b style="height:${Math.min(80,m/2)}px"></b>${["M","T","W","T","F","S","S"][days.findIndex(x=>x[0]==d)]}<br>${m}</div>`).join("")}</div></div>
<div class="card"><h3>Due today (${due.length})</h3>${due.length?due.map(x=>x.t=="r"?`<div class="row"><span style="flex:1">📘 Review: ${esc(x.k.split("|")[0])} #${+x.k.split("|")[1]+1}: ${esc(C[x.k.split("|")[0]].split("|")[x.k.split("|")[1]])}</span><button onclick="review('${x.k}',1)">Done</button><button onclick="review('${x.k}',0)">Forgot</button></div>`:`<div class="row"><span style="flex:1">🔁 Re-solve: ${esc(S.d.problems[x.i].name)}</span><button onclick="redoDone(${x.i})">Done</button></div>`).join(""):"<span class=m>Nothing due 🎉</span>"}</div>`}
function dueList(){const t=td();return[...Object.entries(S.d.rev).filter(([k,r])=>r.n<=t).map(([k])=>({t:"r",k})),...S.d.problems.map((p,i)=>p.redo&&p.redo<=t?{t:"p",i}:null).filter(Boolean)]}
function vLog(){const L=[...S.d.logs].reverse().slice(0,40);return`<div class="card"><h3>Add log</h3><div class="row"><input id="lm" type="number" placeholder="Minutes"><input id="lt" placeholder="Topic / subtopic"><select id="lb"><option>A</option><option>B</option></select></div><div class="row"><select id="ld"><option value="1">Difficulty 1</option><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5</option></select><select id="lc"><option value="1">Confidence 1</option><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5</option></select><input id="ln" placeholder="Notes (private)"></div><button class="p" onclick="manualLog()">Save</button></div>
<div class="card"><h3>Recent</h3><table><tr><th>Date<th>Min<th>Topic<th>Blk<th>D/C</tr>${L.map(l=>`<tr><td>${l.date}<td>${l.min}<td>${esc(l.topic)}<td>${l.block}<td>${l.diff}/${l.conf}</tr>`).join("")}</table></div>`}
function vTopics(){return Object.entries(C).map(([t,s])=>{const a=s.split("|"),n=a.filter((_,i)=>S.d.done[t+"|"+i]).length;return`<details class="card"><summary>${esc(t)} — ${n}/${a.length} ${n==a.length?"✅ mastered":n?"· learning":""}</summary>${bar(n/a.length*100)}${a.map((x,i)=>{const k=t+"|"+i;return`<div><label><input type="checkbox" ${S.d.done[k]?"checked":""} onchange="toggleSub('${t.replace(/'/g,"")}',${i})"> ${esc(x)}</label><button class="mini" onclick="openN('${k}')">📖${N[k]?" 🧠":""}</button> ${S.d.rev[k]?`<span class=m>next review ${S.d.rev[k].n}</span>`:""}</div>`}).join("")}</details>`}).join("")}
function vProb(){const P=S.d.problems;return`<div class="card"><h3>${P.length}/250 problems</h3>${bar(P.length/2.5)}</div><div class="card"><div class="row"><input id="pn" placeholder="Problem name / link"><select id="ps">${SRC.map(s=>`<option>${s}`).join("")}</select></div><div class="row"><select id="pd"><option>Easy</option><option selected>Medium</option><option>Hard</option></select><select id="pr"><option value="yes">Solved alone</option><option value="hint">With hint</option><option value="no">Missed (redo in 7d)</option></select><input id="pm" type="number" placeholder="Minutes"></div><button class="p" onclick="addProb()">Add</button></div>
<div class="card"><table><tr><th>Date<th>Problem<th>Src<th>Result</tr>${[...P].reverse().slice(0,50).map(p=>`<tr><td>${p.date}<td>${esc(p.name)}<td>${esc(p.src)}<td>${p.res}</tr>`).join("")}</table></div>`}
function vErr(){const c={};S.d.errors.forEach(e=>c[e.type]=(c[e.type]||0)+1);const sat=new Date().getDay()==6;return`${sat?`<div class="card">📝 Saturday review: what were your most common errors this week?</div>`:""}<div class="card"><h3>Error & bug journal <span class=m>(private)</span></h3><div class="m">${Object.entries(c).map(([k,v])=>k+": "+v).join(" · ")||"No entries yet"}</div><div class="row"><select id="et"><option>concept error</option><option>bug</option><option>careless</option><option>time pressure</option></select><input id="eo" placeholder="Topic"></div><div class="row"><input id="es" placeholder="Symptom"><input id="er" placeholder="Root cause"><input id="ef" placeholder="Fix"></div><textarea id="ec" rows="3" style="width:100%" placeholder="Code snippet (optional)"></textarea><button class="p" onclick="addErr()">Add</button></div>${[...S.d.errors].reverse().map(e=>`<div class="card"><b>${esc(e.type)}</b> · ${esc(e.topic)} · <span class=m>${e.date}</span><br>${esc(e.sym)} → ${esc(e.root)} → <b>${esc(e.fix)}</b><details><summary class="m">💡 Explanation & solution</summary>${explain(e)}<div class="m">Habit: ${esc(TIP[e.type]||"")}</div><a href="https://www.google.com/search?q=${encodeURIComponent((e.topic||"")+" "+(e.sym||"")+" fix")}" target="_blank" rel="noopener">🔎 Search this error</a></details>${e.code?`<pre>${esc(e.code)}</pre>`:""}</div>`).join("")}`}
function vBoard(){const r=[...board].sort((a,b)=>b[bm]-a[bm]),top=m=>[...board].sort((a,b)=>b[m]-a[m])[0];const lab={wk:"Weekly hours",streak:"Streak",probs:"Problems",topics:"Subtopics done"};
const v=x=>bm=="wk"?(x.wk/60).toFixed(1)+"h":x[bm];return`<div class="card"><h3>Leaderboard</h3><div class="row">${Object.keys(lab).map(k=>`<button class="${bm==k?"p":""}" onclick="bm='${k}';draw()">${lab[k]}</button>`).join("")}<button onclick="loadBoard()">↻</button></div>
${board.length?`<div class="m">🔥 Longest streak: ${esc(top("streak").name)} (${top("streak").streak}d) · 🧠 Most topics: ${esc(top("topics").name)}</div>`:""}
<table><tr><th>#<th>Name<th>${lab[bm]}<th>Streak<th>Wk hrs<th>Probs</tr>${r.map((x,i)=>`<tr ${x.name==S.name?'style="font-weight:700"':""}><td>${i+1}<td>${esc(x.name)}<td>${v(x)}<td>🔥${x.streak}<td>${(x.wk/60).toFixed(1)}<td>${x.probs}</tr>`).join("")}</table><p class="m">Everyone sees streak, weekly hours, problems and topics count. Notes, errors and logs stay private.</p></div>`}
function vSet(){return`<div class="card"><h3>Settings</h3><div class="row"><button onclick="exportJ()">Export JSON</button><button onclick="logout()">Log out</button><button onclick="del()" style="color:#dc2626">Delete account</button></div></div>`}
function vAuth(){return`<div class="card" style="max-width:360px;margin:40px auto"><h2>QuantPrep Tracker</h2><p class="m">Pick a name and password. No email needed.</p><div class="row"><input id="n" placeholder="Name" autocomplete="username"></div><div class="row"><input id="p" type="password" placeholder="Password (6+ chars)" autocomplete="current-password"></div><div class="row"><button class="p" onclick="auth('login')">Log in</button><button onclick="auth('register')">Create profile</button></div><div class="err">${esc(err)}</div></div>`}
function draw(){const a=$("#app"),f=document.activeElement&&document.activeElement.id,v=f?document.activeElement.value:null;
if(!S){a.innerHTML=vAuth();return}
const tabs={today:"🏠 Today",log:"📝 Log",topics:"📚 Topics",prob:"🧩 Problems",err:"🐞 Errors",board:"🏆 Board",set:"⚙️"},V={today:vToday,log:vLog,topics:vTopics,prob:vProb,err:vErr,board:vBoard,set:vSet};
a.innerHTML=`<div class="row"><h2 style="flex:1">QuantPrep · ${esc(S.name)}</h2><span class="m">${err?`<span class=err>${esc(err)}</span>`:"✓ synced"}</span></div><nav>${Object.entries(tabs).map(([k,l])=>`<button class="${tab==k?"on":""}" onclick="tab='${k}';if(tab=='board')loadBoard();draw()">${l}</button>`).join("")}</nav>${V[tab]()}${vModal()}`;
if(f&&v!=null){const e=document.getElementById(f);if(e){e.value=v;e.focus()}}}
document.addEventListener("keydown",e=>{if(e.key=="Enter"&&!S)auth("login")});
draw();if(S)api("load").then(r=>{if(r.d){S.d=r.d;if(!S.d.start)S.d.start=td();draw()}else if(r.err){err=r.err;draw()}});setInterval(()=>{if(S&&tab=="board")loadBoard()},30000);

function openN(k){M=k;Q=null;draw()}
function closeM(){M=null;Q=null;draw()}
function startQ(k){M=k;Q={i:0,sc:0,a:null};draw()}
function ans(j){if(Q.a!=null)return;Q.a=j;if(j==N[M].q[Q.i][2])Q.sc++;draw()}
function nextQ(){Q.a=null;Q.i++;if(Q.i>=N[M].q.length){const p=Math.round(Q.sc/N[M].q.length*100);S.d.quiz=S.d.quiz||{};S.d.quiz[M]={p,date:td()};if(p<60&&S.d.rev[M])S.d.rev[M]={s:1,n:add(td(),1)};Q.fin=p;save();return}draw()}
function saveNote(k,v){S.d.notes=S.d.notes||{};S.d.notes[k]=v;save()}
function vModal(){if(!M)return"";const n=N[M]||{},t=sub(M);let b;
if(Q){if(Q.fin!=null)b=`<h3>Score: ${Q.fin}%</h3><p>${Q.fin>=60?"Passed 🎉":"Re-read the notes. This topic is rescheduled for review tomorrow."}</p><button class="p" onclick="openN(M)">Back to notes</button>`;
else{const q=n.q[Q.i];b=`<div class="m">Question ${Q.i+1}/${n.q.length}</div><p><b>${esc(q[0])}</b></p>${q[1].map((o,j)=>`<button class="opt ${Q.a!=null?(j==q[2]?"ok":j==Q.a?"bad":""):""}" onclick="ans(${j})">${esc(o)}</button>`).join("")}${Q.a!=null?`<p class="m">${esc(q[3]||"")}</p><button class="p" onclick="nextQ()">${Q.i+1<n.q.length?"Next":"Finish"}</button>`:""}`}}
else b=`<p>${n.n?esc(n.n):'<span class="m">No built-in notes for this subtopic yet.</span>'}</p><a href="https://www.google.com/search?q=${encodeURIComponent(t+" quant interview notes")}" target="_blank" rel="noopener">🔎 Find web notes</a><h3>My notes</h3><textarea rows="5" style="width:100%" onchange="saveNote(M,this.value)">${esc((S.d.notes||{})[M]||"")}</textarea>${n.q?`<p><button class="p" onclick="startQ(M)">🧠 Take quiz${S.d.quiz&&S.d.quiz[M]?" (last "+S.d.quiz[M].p+"%)":""}</button></p>`:""}`;
return`<div class="modal" onclick="if(event.target==this)closeM()"><div class="sheet"><div class="row"><h3 style="flex:1">${esc(t)}</h3><button onclick="closeM()">✕</button></div>${b}</div></div>`}
