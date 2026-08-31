const fs=require("fs"),vm=require("vm");
const S=require("../split.js"), H=require("../morph.js");
const norm=H.norm;
const {roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const SR=win._strongsRoots;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,FREQ=new Map();
RC.keys.forEach((k,i)=>FREQ.set(norm(k),RC.roots[i].c.reduce((a,b)=>a+b,0)));
let GL={};
try{ const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g},{filename:"g"});
     GL=g._rootGlossaryData||g._rootsGlossary||{}; }catch(e){}
const mean=r=>{ if(GL[r]) return String(GL[r].m||GL[r].meaning||GL[r]||"").slice(0,40);
  for(const k in SR){ const x=SR[k]; if(x&&norm(x.w)===norm(r)) return String(x.g||"").slice(0,40); } return ""; };
const analyze=S.makeAnalyzer(KNOWN,FREQ);
const rows=fs.readFileSync("engine_gaps.tsv","utf8").trim().split("\n").slice(1).map(l=>l.split("\t"));
// deterministic pseudo-random sample: every Nth answered row
const answered=rows.map(r=>({r,a:analyze(r[3])})).filter(x=>x.a);
const step=Math.floor(answered.length/60);
const samp=answered.filter((_,i)=>i%step===0).slice(0,60);
console.log("  answered population: "+answered.length+"   sample: "+samp.length+"\n");
samp.forEach((x,i)=>{
  const [n,vol,ref,form,gloss]=x.r;
  console.log(String(i+1).padStart(3)+". "+form.padEnd(24)+"gloss: "+gloss.padEnd(30)+"-> "+String(x.a).padEnd(9)+" ("+mean(x.a)+")");
});
