// Run the analyser on the HEBREW-ONLY corpus gaps and score each answer by
// whether the proposed root's known meaning overlaps the token's own gloss.
const fs=require("fs"),vm=require("vm");
const H=require("../morph.js"), P=require("../morph2.js");
const norm=H.norm;
const {roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,FREQ=new Map();
RC.keys.forEach((k,i)=>FREQ.set(norm(k),RC.roots[i].c.reduce((a,b)=>a+b,0)));
// what each root MEANS: from the corpus's own glossary, else Strong's
let GLOSSARY={};
try{ const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g},{filename:"g"});
     GLOSSARY=g._rootGlossaryData||g._rootsGlossary||{}; }catch(e){}
const SR=win._strongsRoots;
function meaningOf(root){
  if(GLOSSARY[root]) return String(GLOSSARY[root].m||GLOSSARY[root].meaning||GLOSSARY[root]||"");
  for(const k in SR){ const r=SR[k]; if(r&&norm(r.w)===norm(root)) return String(r.g||""); }
  return "";
}
const STOP=new Set("the a an of to and or in on for with by from at as is are was were be been being it its his her their my our your you he she they we i me him them us that this these those which who what not no shall will would should may might can could must do does did done have has had am o yea behold lo unto upon into out up down all any every when where while after before now thus even also more most much many one two three own thee thou thy thine ye same such other".split(" "));
const words=g=>String(g||"").toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
const stem=w=>w.slice(0,4);   // prefix match: write/written/writing all -> "writ"
const heu=H.makeAnalyzer(KNOWN,FREQ), par=P.makeAnalyzer(KNOWN,FREQ);
const analyze=f=>heu(f)||par(f);
const rows=fs.readFileSync("engine_gaps.tsv","utf8").trim().split("\n").slice(1).map(l=>l.split("\t"));
let answered=0,consistent=0,inconsistent=0,none=0,tokA=0,tokC=0;
const good=[],bad=[];
for(const [n,vol,ref,form,gloss] of rows){
  const a=analyze(form);
  if(!a){ none++; continue; }
  answered++; tokA+=parseInt(n);
  const m=meaningOf(a);
  const gw=new Set(words(gloss).map(stem)), mw=new Set(words(m).map(stem));
  let hit=false; for(const w of gw) if(mw.has(w)) hit=true;
  if(!hit){ for(const w of gw) for(const v of mw) if(w.length>3&&v.length>3&&(w.startsWith(v)||v.startsWith(w))) hit=true; }
  if(hit){ consistent++; tokC+=parseInt(n); if(good.length<16) good.push({n,form,a,gloss,m}); }
  else { inconsistent++; if(bad.length<14) bad.push({n,form,a,gloss,m}); }
}
console.log("  gaps examined            : "+rows.length);
console.log("  analyser gives an answer : "+answered+"  ("+(100*answered/rows.length).toFixed(1)+"%)   "+tokA+" tokens");
console.log("  no answer                : "+none);
console.log("");
console.log("  of the answers, meaning OVERLAPS the token gloss : "+consistent+"  ("+(100*consistent/Math.max(answered,1)).toFixed(1)+"%)");
console.log("  meaning does NOT overlap (needs a human)          : "+inconsistent);
console.log("\n  === consistent (root meaning matches the gloss) ===");
for(const g of good) console.log("   x"+String(g.n).padEnd(3)+g.form.padEnd(22)+"-> "+String(g.a).padEnd(8)+' gloss="'+g.gloss+'"   root means "'+String(g.m).slice(0,34)+'"');
console.log("\n  === inconsistent ===");
for(const b of bad) console.log("   x"+String(b.n).padEnd(3)+b.form.padEnd(22)+"-> "+String(b.a).padEnd(8)+' gloss="'+b.gloss+'"   root means "'+String(b.m).slice(0,34)+'"');
