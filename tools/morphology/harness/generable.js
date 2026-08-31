// How many engine failures are "known root, inflection the MT never contains"?
// Those cannot be reached by ANY lookup strategy -- only by generating the
// paradigm, or by an analyser. This is the population a generator would fix.
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
const getRoot=win.RootEngine.getRoot, SL=win._strongsLookup, NAMES=win._rootProperNames;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,size=new Map(),FREQ=new Map();
RC.keys.forEach((k,i)=>{const n=RC.roots[i].c.reduce((a,b)=>a+b,0);size.set(k,n);FREQ.set(norm(k),n);});
try{ const LF=require("../lexfreq.js").build(); for(const [k,v] of LF) FREQ.set(k,Math.max(v*8,FREQ.get(k)||0)); }catch(e){}
const real=r=>/^H\d+$/.test(String(r))||(size.get(r)||0)>=8;
const CI=new Set(); for(const f of Object.keys(SL)) CI.add(norm(f));
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
let fail=0,failTok=0, gen=0,genTok=0, named=0,namedTok=0;
const ex=[];
for(const [h,info] of occ){
  let r; try{ r=getRoot(h); }catch(e){ r=null; }
  if(real(r)) continue;
  const head=norm(h.split("־").pop());
  if(NAMES[head]) continue;                       // a name: no root by design
  fail++; failTok+=info.n;
  const inLookup = CI.has(norm(h)) || h.split("־").some(p=>CI.has(norm(p)));
  if(inLookup) continue;                          // a lookup strategy could reach it
  gen++; genTok+=info.n;
  const a=analyze(h);
  if(a && a.how && a.how!=="heuristic"){ named++; namedTok+=info.n;
    if(ex.length<16) ex.push({h,g:info.g,n:info.n,r:a.r,how:a.how}); }
}
console.log("  engine failures (names excluded)          : "+fail+"  ("+failTok+" tokens)");
console.log("  ...form absent from the lookup ENTIRELY   : "+gen+"  ("+genTok+" tokens)");
console.log("     of those, the analyser gives a NAMED rule: "+named+"  ("+namedTok+" tokens)");
console.log("\n  === named-rule answers for forms no lookup can reach ===");
for(const e of ex) console.log("   x"+String(e.n).padEnd(3)+e.h.padEnd(22)+'"'+String(e.g).slice(0,24)+'"'.padEnd(26-Math.min(24,String(e.g).length))+" -> "+e.r.padEnd(7)+"["+e.how+"]");
