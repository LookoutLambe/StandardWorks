// Find the highest-frequency gaps where the proposed root's meaning has NOTHING
// to do with the gloss -- the likeliest wrong answers, worth tracing.
const fs=require("fs"),vm=require("vm");
const M=require("../mishkal.js"), R=require("../radical.js");
const HEU=require("../morph.js"), PAR=require("../morph2.js");
const strip=s=>[...s].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("");
const {roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
const win={}; vm.runInNewContext(fs.readFileSync("strongs_roots.js","utf8"),{window:win},{filename:"x"});
const SR=win._strongsRoots;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,FREQ=new Map();
RC.keys.forEach((k,i)=>FREQ.set(norm(k),RC.roots[i].c.reduce((a,b)=>a+b,0)));
let GL={};
try{ const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g},{filename:"g"});
     GL=g._rootGlossaryData||g._rootsGlossary||{}; }catch(e){}
const mean=r=>{ if(GL[r]) return String(GL[r].m||GL[r].meaning||GL[r]||"").replace(/\s+/g," ").slice(0,40);
  for(const k in SR){ const x=SR[k]; if(x&&norm(x.w)===norm(r)) return String(x.g||"").slice(0,40); } return ""; };
const heu=HEU.makeAnalyzer(KNOWN,FREQ), par=PAR.makeAnalyzer(KNOWN,FREQ);
function one(f){
  const m=M.analyze(f,KNOWN,FREQ);
  if(m&&m.how!=="mishkal:katal") return m;
  const r=R.analyze(f,KNOWN,FREQ); if(r) return r;
  if(m) return m;
  const h=heu(f)||par(f); return h?{r:h,how:"heuristic"}:null;
}
const STOP=new Set("the a an of to and or in on for with by from at as is are was were be been it its his her their my our your you he she they we not shall will unto upon that this which who".split(" "));
const words=g=>String(g||"").toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>3&&!STOP.has(w));
const rows=fs.readFileSync("engine_gaps.tsv","utf8").trim().split("\n").slice(1).map(l=>l.split("\t"));
const susp=[];
for(const [n,vol,ref,form,gloss] of rows){
  const a=one(form); if(!a) continue;
  const m=mean(a.r); if(!m) continue;
  const gw=words(gloss).map(w=>w.slice(0,4)), mw=words(m).map(w=>w.slice(0,4));
  if(!gw.length||!mw.length) continue;
  if(gw.some(w=>mw.includes(w))) continue;             // meanings overlap -> probably fine
  susp.push({n:+n,vol,form,gloss,root:a.r,how:a.how,mean:m});
}
susp.sort((a,b)=>b.n-a.n);
console.log("  highest-frequency SUSPECT answers (root meaning unrelated to the gloss):\n");
for(const s of susp.slice(0,14))
  console.log("   x"+String(s.n).padEnd(3)+s.form.padEnd(22)+'"'+s.gloss.slice(0,26)+'"'.padEnd(28-Math.min(26,s.gloss.length))+
              "  -> "+s.root.padEnd(7)+("["+s.how+"]").padEnd(22)+'means "'+s.mean+'"');
