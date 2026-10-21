// ===== Curriculum (edit freely) =====
const C={"Probability":"Counting|Conditional probability & Bayes|Random variables|Distributions (Bern/Bin/Poisson/Geo/Unif/Exp/Normal/Gamma/Beta/χ²/t)|Expectation, variance, covariance|MGFs & characteristic functions|Joint/marginal/conditional|LLN & CLT|Order statistics|Transformations|Markov chains|Random walks & gambler's ruin|Martingales & stopping times|Poisson process|Brownian motion intro|Conditional expectation (tower)",
"Statistics":"MLE & method of moments|Bias/variance|Confidence intervals|Hypothesis tests & p-values|Linear regression & assumptions|Multicollinearity/heteroscedasticity|Bayesian basics|Time series (stationarity, ACF, ARIMA)|GARCH intro|Bootstrapping",
"Python libraries":"NumPy|Pandas|SciPy|Matplotlib/Seaborn|Statsmodels|Scikit-learn|Numba (optional)|Project: Monte Carlo option pricing|Project: momentum/mean-reversion backtest|Project: Black-Scholes & Greeks|Project: mean-variance optimisation",
"DSA":"Arrays & strings|Linked lists|Stacks & queues|Hashing|Recursion/backtracking|Sorting & searching|Trees & BST|Tries, segment/Fenwick|Heaps|Graphs (BFS/DFS/Dijkstra/topo/DSU/MST)|Dynamic programming|Greedy|Two pointers & sliding window|Bit manipulation|Complexity analysis",
"C++":"Pointers & references|Stack vs heap, RAII|Smart pointers|Classes, Rule of 3/5|Virtual functions|STL|Templates|Lambdas|Move semantics|Basic multithreading",
"OOP (Python)":"Classes & inheritance|MRO & polymorphism|abc & dunder methods|Design patterns|SOLID|Dataclasses & type hints|pytest|Project: backtesting framework",
"Complex Analysis":"Complex numbers & Euler|Analytic functions, Cauchy-Riemann|Contour integration, Cauchy's theorem|Laurent series & residues|Conformal maps|Fourier & Laplace transforms|Quant link: char. functions & Fourier pricing",
"Operating Systems":"Processes & threads|Synchronisation|Memory management|Linux/shell/git"};
const SRC=["LeetCode","Mosteller 50","Heard on the Street","Brainteaser","Other"];
const TABS={today:["🏠","Today"],log:["📝","Log"],topics:["📚","Topics"],prob:["🧩","Problems"],err:["🐞","Errors"],board:["🏆","Board"],set:["⚙️","Settings"]};

// ===== Helpers =====
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const td=()=>fmt(new Date());
const add=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return fmt(d)};
const mon=s=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));return fmt(d)};
const dow=s=>new Date(s+"T00:00:00").getDay();
const shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const jget=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
const blank=()=>({logs:[],done:{},rev:{},problems:[],errors:[],notes:{},quiz:{},start:null});
const norm=d=>Object.assign(blank(),d||{});
const sub=k=>{const[t,i]=k.split("|");return((C[t]||"").split("|")[i])||k};

// ===== State =====
let S=jget("qp"),tm=jget("qpt"),tab="today",board=[],bm="wk",err="";
let T,ver=0,fl=false,busy=false,VK="",VT="",M=null,Q=null;   // M/Q (quiz modal) must exist before the first draw()
if(S&&S.name&&S.d)S.d=norm(S.d);else S=null;

if(typeof supabase==="undefined"||typeof CFG==="undefined"){
  $("#app").innerHTML='<div class="card err"><b>Could not start.</b><br>Supabase library or config.js failed to load. Check the script tags in index.html and that config.js is deployed next to it.</div>';
  throw new Error("supabase/CFG missing");
}
const sb=supabase.createClient(CFG.url,CFG.key);
// Supabase Auth needs an email, so a hidden one is derived from the name (users never see it).
const em=n=>[...new TextEncoder().encode(n.trim().toLowerCase())].map(b=>b.toString(16).padStart(2,"0")).join("")+"@quantprep.app";

// ===== Stats (mirrors what is stored on the leaderboard) =====
const dayMap=()=>{const m={};S.d.logs.forEach(l=>m[l.date]=(m[l.date]||0)+(+l.min||0));return m};
function streak(){const m=dayMap();let c=td(),s=0;if(!(m[c]>=30))c=add(c,-1);
  for(;;){if(m[c]>=30)s++;else if(dow(c)!==0)break;c=add(c,-1)}   // Sunday is a rest day: it never breaks a streak
  return s}
function weekMin(){const m=mon(td());return S.d.logs.filter(l=>l.date>=m).reduce((a,l)=>a+(+l.min||0),0)}
function missedYesterday(){const m=dayMap(),y=add(td(),-1);return dow(y)!==0&&!(m[y]>=30)&&!(m[td()]>=30)&&S.d.logs.length>0}
const stats=()=>({wk:weekMin(),streak:streak(),probs:S.d.problems.length,topics:Object.keys(S.d.done).length});

// ===== Backend =====
async function api(a,b={}){try{
 if(a=="register"){const n=(b.name||"").trim();
  if(!/^[\w .-]{2,24}$/.test(n)||(b.pw||"").length<6)return{err:"Name 2-24 chars (letters, digits, space . _ -), password 6+ chars"};
  const{data,error}=await sb.auth.signUp({email:em(n),password:b.pw});
  if(error)return{err:/registered/i.test(error.message)?"Name already taken":error.message};
  if(!data.session)return{err:"Name may be taken, or 'Confirm email' is still ON in Supabase → Auth settings"};
  const d=blank(),r=await sb.from("profiles").insert({id:data.user.id,name:n,data:d});if(r.error)return{err:r.error.message};
  await sb.from("board").upsert({id:data.user.id,name:n});return{name:n,d}}
 if(a=="login"){const n=(b.name||"").trim();
  const{data,error}=await sb.auth.signInWithPassword({email:em(n),password:b.pw||""});
  if(error)return{err:/invalid|credentials/i.test(error.message)?"Wrong name or password":error.message};
  const id=data.user.id,r=await sb.from("profiles").select("name,data").eq("id",id).maybeSingle();
  if(r.error)return{err:r.error.message};
  if(!r.data){const d=blank(),ins=await sb.from("profiles").insert({id,name:n,data:d});return ins.error?{err:ins.error.message}:{name:n,d}}
  return{name:r.data.name,d:r.data.data}}
 if(a=="load"){const{data:{session}}=await sb.auth.getSession();if(!session)return{err:"Session expired, log in again",expired:1};
  const r=await sb.from("profiles").select("data").eq("id",session.user.id).maybeSingle();
  return r.error?{err:r.error.message}:r.data?{d:r.data.data}:{err:"Profile not found"}}
 if(a=="save"){const{data:{session}}=await sb.auth.getSession();if(!session)return{err:"Session expired, log in again",expired:1};
  const id=session.user.id;
  const r1=await sb.from("profiles").update({data:b.d}).eq("id",id);
  const r2=await sb.from("board").upsert({id,name:b.name,...b.st,updated_at:new Date().toISOString()});
  const e=r1.error||r2.error;return e?{err:e.message}:{ok:1}}
 if(a=="board"){const r=await sb.from("board").select("name,wk,streak,probs,topics");return r.error?{err:r.error.message}:{rows:r.data||[]}}
 if(a=="delete"){const r=await sb.rpc("delete_me");return r.error?{err:r.error.message}:{ok:1}}
}catch(e){return{err:"Network error"}}}

// Local-first saving: every change is written to localStorage immediately and flagged "dirty" (qpd)
// until the server confirms, so a failed/slow sync never loses data or gets overwritten on next load.
function save(nodraw){ver++;localStorage.qp=JSON.stringify(S);localStorage.qpd="1";clearTimeout(T);T=setTimeout(flush,700);if(!nodraw)draw();else stat()}
async function flush(){
 if(!S)return;
 if(fl){clearTimeout(T);T=setTimeout(flush,500);return}
 fl=true;const v=ver;
 const r=await api("save",{d:S.d,name:S.name,st:stats()});
 fl=false;if(!S)return;
 if(r.err){err=r.err;if(r.expired){S=null;localStorage.qp="null";localStorage.qpd=""}else{clearTimeout(T);T=setTimeout(flush,15000)}}
 else{err="";if(v===ver)localStorage.qpd=""}
 if(S)stat();else draw()}
const statHTML=()=>err?`<span class="err">${esc(err)}</span>`:localStorage.qpd?"⏳ saving…":"✓ synced";
const stat=()=>{const e=$("#st");if(e)e.innerHTML=statHTML()};

async function auth(a){
 if(busy)return;const n=$("#n"),p=$("#p");if(!n||!p)return;
 busy=true;document.querySelectorAll("#app button").forEach(x=>x.disabled=true);
 const r=await api(a,{name:n.value,pw:p.value});busy=false;
 if(r.err){err=r.err;return draw()}
 S={name:r.name,d:norm(r.d)};if(!S.d.start)S.d.start=td();
 err="";tab="today";M=Q=null;save()}
function logout(){clearTimeout(T);sb.auth.signOut();S=null;M=Q=null;tab="today";localStorage.qp="null";localStorage.qpd="";draw()}
function resetLocal(){localStorage.qp="null";localStorage.qpd="";location.reload()}
async function del(){if(!confirm("Delete your account and all data permanently?"))return;
 const r=await api("delete");if(r.err){err=r.err;return draw()}logout()}
async function loadBoard(){const r=await api("board");if(r.err)err=r.err;else board=r.rows;if(tab=="board"&&S)draw()}
function go(k){tab=k;if(k=="board")loadBoard();draw();scrollTo(0,0)}

// ===== Planner logic =====
// Spaced repetition: study day 0, reviews at +3, +7, +21, then every 30 days. "Forgot" resets to +1 day.
const iv=s=>[0,3,7,21][s]??30;
function toggleSub(k){const d=S.d;
 if(d.done[k]){delete d.done[k];delete d.rev[k];save()}
 else{d.done[k]=td();d.rev[k]={s:1,n:add(td(),iv(1))};save();if(N[k])startQ(k)}}
function review(k,ok){const r=S.d.rev[k];if(!r)return;if(ok){r.s++;r.n=add(td(),iv(r.s))}else{r.s=1;r.n=add(td(),1)}save()}
function week(){return Math.max(1,Math.floor((new Date(td())-new Date(S.d.start||td()))/6048e5)+1)}
function plan(w){
 const A=w<=8?"Probability core":w<=16?"Advanced probability (joint, CLT, MGFs, Markov, martingales)":w<=26?"Statistics":w<=30?"Complex analysis (lean)":"Buffer: timed probability/stats mocks";
 const B=w<=8?"DSA in Python (arrays, hashing, two pointers, windows, stacks, recursion, sorting, binary search)":w<=14?"Python libraries":w<=16?"C++ fundamentals":w<=20?"C++ STL":w<=26?"DSA: trees, heaps, graphs, DP":w<=29?"OOP + backtesting framework":w==30?"OS basics":"Research-style project, mock interviews";
 return{A,B}}
function dayType(){const d=new Date().getDay();return d==0?"Rest day 😴":d==5?"Timed problem set":d==6?"Weekly review + error log + mini project":"New material"}
function dueList(){const t=td();return[
 ...Object.entries(S.d.rev).filter(([k,r])=>r.n<=t).map(([k])=>({t:"r",k})),
 ...S.d.problems.map((p,i)=>p.redo&&p.redo<=t?{t:"p",i}:null).filter(Boolean)]}

// ===== Actions =====
const clr=(...ids)=>ids.forEach(i=>{const e=document.getElementById(i);if(e&&e.tagName!=="SELECT")e.value=""});
function addLog(min,topic,block,diff,conf,note){S.d.logs.push({date:td(),min:Math.min(1440,Math.round(+min)),topic:topic||"General",block,diff:+diff,conf:+conf,note});save()}
function manualLog(){const m=+$("#lm").value;if(!(m>0)){$("#lm").focus();return}
 const a=[m,$("#lt").value.trim(),$("#lb").value,$("#ld").value,$("#lc").value,$("#ln").value];clr("lm","lt","ln");addLog(...a)}
function startT(){tm={s:Date.now()};localStorage.qpt=JSON.stringify(tm);draw()}
function stopT(){const m=Math.max(1,Math.round((Date.now()-tm.s)/6e4)),t=$("#tt").value.trim(),b=$("#tb").value;
 tm=null;localStorage.qpt="null";clr("tt");addLog(m,t,b,3,3,"Timer")}
function quick(){addLog(30,"Minimum day","A",2,3,"30-minute minimum day")}
function addProb(){const n=$("#pn").value.trim();if(!n){$("#pn").focus();return}const r=$("#pr").value;
 S.d.problems.push({date:td(),name:n,src:$("#ps").value,diff:$("#pd").value,res:r,min:+$("#pm").value||0,redo:r=="no"?add(td(),7):null});clr("pn","pm");save()}
function redoDone(i){S.d.problems[i].redo=null;save()}
function addErr(){const o={date:td(),type:$("#et").value,topic:$("#eo").value.trim(),sym:$("#es").value.trim(),root:$("#er").value.trim(),fix:$("#ef").value.trim(),code:$("#ec").value};
 if(!o.sym&&!o.root&&!o.topic){$("#es").focus();return}clr("eo","es","er","ef","ec");S.d.errors.push(o);save()}
function delItem(kind,i){if(!confirm("Delete this entry?"))return;S.d[kind].splice(i,1);save()}
function setStart(v){if(v){S.d.start=v;save()}}
function exportJ(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(S.d,null,2)],{type:"application/json"}));a.download="quantprep-data.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}

// quiz / notes modal (options are shuffled so the right answer isn't always first)
function openN(k){M=k;Q=null;draw()}
function closeM(){M=null;Q=null;draw()}
function startQ(k){M=k;Q={i:0,sc:0,a:null,p:N[k].q.map(q=>shuf(q[1].map((_,i)=>i)))};draw()}
function ans(j){if(!Q||Q.a!=null)return;Q.a=j;if(Q.p[Q.i][j]==N[M].q[Q.i][2])Q.sc++;draw()}
function nextQ(){Q.a=null;Q.i++;
 if(Q.i>=N[M].q.length){const p=Math.round(Q.sc/N[M].q.length*100);S.d.quiz[M]={p,date:td()};
  if(p<60&&S.d.rev[M])S.d.rev[M]={s:1,n:add(td(),1)};Q.fin=p;save();return}
 draw()}
function saveNote(k,v){S.d.notes[k]=v;save(true)}

// ===== Views =====
const bar=p=>`<div class="bar"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div>`;
function vToday(){
 const w=week(),p=plan(w),h=weekMin(),due=dueList(),m=dayMap(),t0=td(),dm=m[t0]||0;
 const days=[...Array(7)].map((_,i)=>{const d=add(mon(t0),i);return[d,m[d]||0]}),L=["M","T","W","T","F","S","S"];
 const dueHTML=due.length?due.map(x=>x.t=="r"
  ?`<div class="row"><span style="flex:1">📘 Review: ${esc(x.k.split("|")[0])} #${+x.k.split("|")[1]+1}: ${esc(sub(x.k))}</span><button onclick="review('${x.k}',1)">Done</button><button onclick="review('${x.k}',0)">Forgot</button></div>`
  :`<div class="row"><span style="flex:1">🔁 Re-solve: ${esc(S.d.problems[x.i].name)}</span><button onclick="redoDone(${x.i})">Done</button></div>`).join(""):'<span class="m">Nothing due 🎉</span>';
 return`${missedYesterday()?`<div class="card" style="border-color:var(--w)">⚠️ You missed yesterday. Never miss twice: even a 30-minute day counts!</div>`:""}
<div class="g"><div class="card"><div class="m">Streak</div><div class="big">🔥 ${streak()}</div></div>
<div class="card"><div class="m">Week ${w}/35 ${w%4==0?"· review+mock week":""}</div>${bar(w/35*100)}</div>
<div class="card"><div class="m">Hours this week (target 12)</div><div class="big">${(h/60).toFixed(1)}</div>${bar(h/720*100)}</div>
<div class="card"><div class="m">Problems (target 250)</div><div class="big">${S.d.problems.length}</div>${bar(S.d.problems.length/2.5)}</div></div>
<div class="card"><h3>Today: ${dayType()}</h3><div class="m">Studied today: ${dm} min</div><p><b>Block A (60m):</b> ${esc(p.A)}<br><b>Block B (60m):</b> ${esc(p.B)}</p>
<div class="row"><button class="p" onclick="quick()">✓ 30-min minimum day</button><label class="m">Plan start date <input type="date" value="${esc(S.d.start)}" onchange="setStart(this.value)"></label></div></div>
<div class="card"><h3>Timer</h3><div class="row">${tm?`<span>Running since ${new Date(tm.s).toLocaleTimeString()}</span>`:""}<input id="tt" placeholder="Topic" list="tl"><select id="tb"><option>A</option><option>B</option></select>${tm?'<button class="p" onclick="stopT()">Stop &amp; log</button>':'<button class="p" onclick="startT()">Start</button>'}</div></div>
<datalist id="tl">${Object.keys(C).map(t=>`<option value="${esc(t)}">`).join("")}</datalist>
<div class="card"><h3>This week (minutes/day)</h3><div class="cols">${days.map(([d,x],i)=>`<div class="${d==t0?"now":""}"><b style="height:${Math.min(80,x/2)}px"></b>${L[i]}<br>${x}</div>`).join("")}</div></div>
<div class="card"><h3>Due today (${due.length})</h3>${dueHTML}</div>`}
function vLog(){const L=S.d.logs.map((l,i)=>[l,i]).reverse().slice(0,40);
 return`<div class="card"><h3>Add log</h3><div class="row"><input id="lm" type="number" min="1" max="1440" inputmode="numeric" placeholder="Minutes"><input id="lt" placeholder="Topic / subtopic"><select id="lb"><option>A</option><option>B</option></select></div>
<div class="row"><select id="ld"><option value="1">Difficulty 1</option><option value="2">Difficulty 2</option><option value="3" selected>Difficulty 3</option><option value="4">Difficulty 4</option><option value="5">Difficulty 5</option></select>
<select id="lc"><option value="1">Confidence 1</option><option value="2">Confidence 2</option><option value="3" selected>Confidence 3</option><option value="4">Confidence 4</option><option value="5">Confidence 5</option></select><input id="ln" placeholder="Notes (private)"></div>
<button class="p" onclick="manualLog()">Save</button></div>
<div class="card"><h3>Recent</h3><div class="tw"><table><tr><th>Date<th>Min<th>Topic<th>Blk<th>D/C<th></tr>${L.map(([l,i])=>`<tr><td>${esc(l.date)}<td>${esc(l.min)}<td>${esc(l.topic)}<td>${esc(l.block)}<td>${esc(l.diff)}/${esc(l.conf)}<td><button class="del" title="Delete" onclick="delItem('logs',${i})">✕</button></tr>`).join("")}</table></div></div>`}
function vTopics(){return Object.entries(C).map(([t,s])=>{const a=s.split("|"),n=a.filter((_,i)=>S.d.done[t+"|"+i]).length;
 return`<details class="card" data-k="${esc(t)}"><summary>${esc(t)} — ${n}/${a.length} ${n==a.length?"✅ mastered":n?"· learning":""}</summary>${bar(n/a.length*100)}${a.map((x,i)=>{const k=t+"|"+i;
  return`<div class="sr"><label><input type="checkbox" ${S.d.done[k]?"checked":""} onchange="toggleSub('${k}')"> ${esc(x)}</label><button class="mini" onclick="openN('${k}')">📖${N[k]?" 🧠":""}</button>${S.d.rev[k]?`<span class="m">next review ${esc(S.d.rev[k].n)}</span>`:""}</div>`}).join("")}</details>`}).join("")}
function vProb(){const P=S.d.problems.map((p,i)=>[p,i]),R={yes:"✅ alone",hint:"💡 hint",no:"❌ missed"};
 return`<div class="card"><h3>${P.length}/250 problems</h3>${bar(P.length/2.5)}</div>
<div class="card"><div class="row"><input id="pn" placeholder="Problem name / link"><select id="ps">${SRC.map(s=>`<option>${esc(s)}</option>`).join("")}</select></div>
<div class="row"><select id="pd"><option>Easy</option><option selected>Medium</option><option>Hard</option></select><select id="pr"><option value="yes">Solved alone</option><option value="hint">With hint</option><option value="no">Missed (redo in 7d)</option></select><input id="pm" type="number" min="0" inputmode="numeric" placeholder="Minutes"></div>
<button class="p" onclick="addProb()">Add</button></div>
<div class="card"><div class="tw"><table><tr><th>Date<th>Problem<th>Src<th>Result<th></tr>${[...P].reverse().slice(0,50).map(([p,i])=>`<tr><td>${esc(p.date)}<td>${esc(p.name)}<td>${esc(p.src)}<td>${R[p.res]||esc(p.res)}<td><button class="del" title="Delete" onclick="delItem('problems',${i})">✕</button></tr>`).join("")}</table></div></div>`}
function vErr(){const c={};S.d.errors.forEach(e=>c[e.type]=(c[e.type]||0)+1);const sat=new Date().getDay()==6;
 return`${sat?'<div class="card">📝 Saturday review: what were your most common errors this week?</div>':""}
<div class="card"><h3>Error &amp; bug journal <span class="m">(private)</span></h3><div class="m">${Object.entries(c).map(([k,v])=>esc(k)+": "+v).join(" · ")||"No entries yet"}</div>
<div class="row"><select id="et"><option>concept error</option><option>bug</option><option>careless</option><option>time pressure</option></select><input id="eo" placeholder="Topic"></div>
<div class="row"><input id="es" placeholder="Symptom"><input id="er" placeholder="Root cause"><input id="ef" placeholder="Fix"></div>
<textarea id="ec" rows="3" style="width:100%" placeholder="Code snippet (optional)"></textarea><div class="row"><button class="p" onclick="addErr()">Add</button></div></div>
${S.d.errors.map((e,i)=>[e,i]).reverse().map(([e,i])=>`<div class="card"><b>${esc(e.type)}</b> · ${esc(e.topic)} · <span class="m">${esc(e.date)}</span> <button class="del" title="Delete" onclick="delItem('errors',${i})">✕</button><br>${esc(e.sym)} → ${esc(e.root)} → <b>${esc(e.fix)}</b>
<details data-k="e${i}"><summary class="m">💡 Explanation &amp; solution</summary>${explain(e)}<div class="m">Habit: ${esc(TIP[e.type]||"")}</div><a href="https://www.google.com/search?q=${encodeURIComponent((e.topic||"")+" "+(e.sym||"")+" fix")}" target="_blank" rel="noopener">🔎 Search this error</a></details>${e.code?`<pre>${esc(e.code)}</pre>`:""}</div>`).join("")}`}
function vBoard(){const r=[...board].sort((a,b)=>b[bm]-a[bm]),top=m=>[...board].sort((a,b)=>b[m]-a[m])[0];
 const lab={wk:"Weekly hours",streak:"Streak",probs:"Problems",topics:"Subtopics done"},v=x=>bm=="wk"?(x.wk/60).toFixed(1)+"h":x[bm];
 return`<div class="card"><h3>Leaderboard</h3><div class="row">${Object.keys(lab).map(k=>`<button class="${bm==k?"p":""}" onclick="bm='${k}';draw()">${lab[k]}</button>`).join("")}<button onclick="loadBoard()" title="Refresh">↻</button></div>
${board.length?`<div class="m">🔥 Longest streak: ${esc(top("streak").name)} (${top("streak").streak}d) · 🧠 Most topics: ${esc(top("topics").name)}</div>`:'<div class="m">No entries yet. Tap ↻ to refresh.</div>'}
<div class="tw"><table><tr><th>#<th>Name<th>${lab[bm]}<th>Streak<th>Wk hrs<th>Probs</tr>${r.map((x,i)=>`<tr ${x.name==S.name?'style="font-weight:700"':""}><td>${i+1}<td>${esc(x.name)}<td>${v(x)}<td>🔥${+x.streak||0}<td>${((+x.wk||0)/60).toFixed(1)}<td>${+x.probs||0}</tr>`).join("")}</table></div>
<p class="m">Everyone sees streak, weekly hours, problems and topics count. Notes, errors and logs stay private.</p></div>`}
function vSet(){return`<div class="card"><h3>Settings</h3><p class="m">Signed in as <b>${esc(S.name)}</b></p><div class="row"><button onclick="exportJ()">Export JSON</button><button onclick="logout()">Log out</button><button onclick="del()" style="color:var(--bad)">Delete account</button></div></div>`}
function vAuth(){return`<div class="card auth"><h2>📈 QuantPrep Tracker</h2><p class="m">Pick a name and password. No email needed.</p>
<div class="row"><input id="n" placeholder="Name" autocomplete="username" autocapitalize="none"></div>
<div class="row"><input id="p" type="password" placeholder="Password (6+ chars)" autocomplete="current-password"></div>
<div class="row"><button class="p" onclick="auth('login')">Log in</button><button onclick="auth('register')">Create profile</button></div><div class="err" role="alert">${esc(err)}</div></div>`}
function vModal(){if(!M)return"";const n=N[M]||{},t=sub(M);let b;
 if(Q){
  if(Q.fin!=null)b=`<h3>Score: ${Q.fin}%</h3><p>${Q.fin>=60?"Passed 🎉":"Re-read the notes. This topic is rescheduled for review tomorrow."}</p><button class="p" onclick="openN(M)">Back to notes</button>`;
  else{const q=n.q[Q.i];b=`<div class="m">Question ${Q.i+1}/${n.q.length}</div><p><b>${esc(q[0])}</b></p>${Q.p[Q.i].map((oi,j)=>`<button class="opt ${Q.a!=null?(oi==q[2]?"ok":j==Q.a?"bad":""):""}" onclick="ans(${j})">${esc(q[1][oi])}</button>`).join("")}${Q.a!=null?`<p class="m">${esc(q[3]||"")}</p><button class="p" onclick="nextQ()">${Q.i+1<n.q.length?"Next":"Finish"}</button>`:""}`}}
 else b=`<p>${n.n?esc(n.n):'<span class="m">No built-in notes for this subtopic yet.</span>'}</p><a href="https://www.google.com/search?q=${encodeURIComponent(t+" quant interview notes")}" target="_blank" rel="noopener">🔎 Find web notes</a><h3>My notes</h3><textarea id="mn" rows="5" style="width:100%" oninput="saveNote(M,this.value)">${esc(S.d.notes[M]||"")}</textarea>${n.q?`<p><button class="p" onclick="startQ(M)">🧠 Take quiz${S.d.quiz[M]?" (last "+S.d.quiz[M].p+"%)":""}</button></p>`:""}`;
 return`<div class="modal" onclick="if(event.target==this)closeM()"><div class="sheet"><div class="row"><h3 style="flex:1">${esc(t)}</h3><button onclick="closeM()" aria-label="Close">✕</button></div>${b}</div></div>`}

// ===== Render =====
// Re-rendering via innerHTML would wipe typed text, focus, scroll position and open <details>.
// draw() snapshots those and restores them whenever the same view is redrawn.
function draw(){
 const a=$("#app"),ae=document.activeElement,fid=ae&&ae.id,key=!S?"auth":tab+"|"+M+"|"+(Q?1:0),keep=key===VK,sameTab=!!S&&tab===VT;
 const vals={},open=[...a.querySelectorAll("details[open]")].map(d=>d.dataset.k),sy=window.scrollY;let ss=0,se=0;
 if(keep){a.querySelectorAll("input[id],select[id],textarea[id]").forEach(e=>vals[e.id]=e.value);
  if(fid){try{ss=ae.selectionStart;se=ae.selectionEnd}catch{}}}
 VK=key;VT=S?tab:"";
 if(!S)a.innerHTML=vAuth();
 else{let body;
  try{body=({today:vToday,log:vLog,topics:vTopics,prob:vProb,err:vErr,board:vBoard,set:vSet}[tab]||vToday)()+vModal()}
  catch(e){console.error(e);body=`<div class="card"><h3>Something went wrong</h3><p class="m">${esc(e.message)}</p><button onclick="resetLocal()">Reset local cache &amp; reload</button></div>`}
  a.innerHTML=`<div class="top"><h2>QuantPrep · ${esc(S.name)}</h2><span class="m" id="st">${statHTML()}</span></div><nav>${Object.entries(TABS).map(([k,[i,l]])=>`<button class="${tab==k?"on":""}" onclick="go('${k}')"><span class="ic">${i}</span><span class="lb">${l}</span></button>`).join("")}</nav>${body}`}
 if(keep){for(const id in vals){const e=document.getElementById(id);if(e)e.value=vals[id]}
  const f=fid&&document.getElementById(fid);if(f){f.focus({preventScroll:true});try{f.setSelectionRange(ss,se)}catch{}}}
 if(sameTab){a.querySelectorAll("details").forEach(d=>{if(open.includes(d.dataset.k))d.open=true});window.scrollTo(0,sy)}}

// ===== Boot =====
document.addEventListener("keydown",e=>{if(e.key=="Enter"&&!S&&e.target&&(e.target.id=="n"||e.target.id=="p"))auth("login")});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&S&&localStorage.qpd)flush()});
sb.auth.onAuthStateChange(ev=>{if(ev=="SIGNED_OUT"&&S){S=null;M=Q=null;localStorage.qp="null";localStorage.qpd="";err="Session expired, log in again";draw()}});
setInterval(()=>{if(S&&tab=="board"&&!document.hidden)loadBoard()},30000);
draw();
(async()=>{if(!S)return;
 if(localStorage.qpd)return flush();            // unsynced local edits win over server data
 const v0=ver,r=await api("load");
 if(r.expired){S=null;localStorage.qp="null";err=r.err;return draw()}
 if(r.d&&v0===ver&&S){S.d=norm(r.d);if(!S.d.start)S.d.start=td();localStorage.qp=JSON.stringify(S);draw()}
 else if(r.err){err=r.err;draw()}})();
