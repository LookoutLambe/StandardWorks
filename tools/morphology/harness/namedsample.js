const fs=require("fs"),path=require("path"),vm=require("vm");
const R=require("../radical.js"), M=require("../mishkal.js");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const strip=s=>[...String(s)].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("").replace(/[^א-ת]/g,"");
const {roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("root_engine.js","utf8"),ctx,{filename:"root_engine.js"});
const getRoot=win.RootEngine.getRoot, SL=win._strongsLookup, NAMES=win._rootProperNames, SR=win._strongsRoots;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,size=new Map(),FREQ=new Map();
RC.keys.forEach((k,i)=>{const n=RC.roots[i].c.reduce((a,b)=>a+b,0);size.set(k,n);FREQ.set(norm(k),n);});
try{ const LF=require("../lexfreq.js").build(); for(const [k,v] of LF) FREQ.set(k,Math.max(v*8,FREQ.get(k)||0)); }catch(e){}
const real=r=>/^H\d+$/.test(String(r))||(size.get(r)||0)>=8;
const CI=new Set(); for(const f of Object.keys(SL)) CI.add(norm(f));
let GL={}; try{ const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g},{filename:"g"}); GL=g._rootGlossaryData||{}; }catch(e){}
const mean=r=>GL[r]?String(GL[r].meaning).slice(0,40):(()=>{for(const k in SR){const x=SR[k];if(x&&norm(x.w)===norm(r))return String(x.g||"").slice(0,40);}return"";})();
const IGNORE=new Set(["את","מנ","לא","כל","ואת"]);
function analyze(form){
  const one=f=>{ const m=M.analyze(f,KNOWN,FREQ);
    if(m&&m.how!=="mishkal:katal") return m;
    const r=R.analyze(f,KNOWN,FREQ); return r||m||null; };
  if(!form.includes("־")) return one(form);
  const ps=form.split("־").filter(Boolean), kept=ps.filter(p=>!IGNORE.has(norm(p)));
  for(const p of (kept.length?kept:ps)){ const a=one(p); if(a) return a; }
  return null;
}
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const occ=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){ if(!norm(m[1]))continue;
      if(!occ.has(m[1])) occ.set(m[1],{g:m[2],n:0}); occ.get(m[1]).n++; } } }
const pool=[];
for(const [h,info] of occ){
  let r; try{ r=getRoot(h); }catch(e){ r=null; }
  if(real(r)) continue;
  const head=norm(h.split("־").pop());
  if(NAMES[head]) continue;
  if(CI.has(norm(h))||h.split("־").some(p=>CI.has(norm(p)))) continue;
  const a=analyze(h);
  if(a&&a.how&&a.how!=="heuristic") pool.push({h,g:info.g,n:info.n,r:a.r,how:a.how});
}
pool.sort((a,b)=>b.n-a.n);
const step=Math.max(1,Math.floor(pool.length/50));
const samp=pool.filter((_,i)=>i%step===0).slice(0,50);
console.log("  named-rule pool: "+pool.length+"   sample: "+samp.length+"\n");
samp.forEach((s,i)=>console.log(String(i+1).padStart(3)+". "+s.h.padEnd(22)+String(s.g).slice(0,26).padEnd(28)+
  "-> "+s.r.padEnd(7)+("["+s.how+"]").padEnd(26)+mean(s.r)));
