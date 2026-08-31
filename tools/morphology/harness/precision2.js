// Is the sub-50% precision caused by PROPER NAMES in the test set?
// Partition the fallback population into names vs ordinary words.
const fs=require("fs"),vm=require("vm");
const H=require("../morph.js"), P=require("../morph2.js");
const norm=H.norm;
const {pairs,roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("root_engine.js","utf8"),ctx,{filename:"root_engine.js"});
const getRoot=win.RootEngine.getRoot, SR=win._strongsRoots, N=win._rootProperNames;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,FREQ=new Map(),size=new Map();
RC.keys.forEach((k,i)=>{const n=RC.roots[i].c.reduce((a,b)=>a+b,0);FREQ.set(norm(k),n);size.set(k,n);});
const real=r=>/^H\d+$/.test(String(r))||(size.get(r)||0)>=8;
const heu=H.makeAnalyzer(KNOWN,FREQ), par=P.makeAnalyzer(KNOWN,FREQ);
const analyze=f=>heu(f)||par(f);
// is this pair a proper NAME? two signals: the corpus names list, or the
// Strong's entry for the form being a name-glossed entry
const SL=win._strongsLookup;
const fold=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z]/g,"").replace(/j/g,"y").replace(/w/g,"u");
const nameEntry=n=>{const r=SR[n];if(!r)return false;const g=String(r.g||"").trim();
  if(!/^[A-Z]/.test(g)||g.split(/\s+/).length>2)return false;
  const a=fold(r.x),b=fold(g);return !!(a&&b&&(a===b||a.indexOf(b)===0||b.indexOf(a)===0));};
const isNameForm=f=>{const k=norm(f); if(N[k])return true; const s=SL[f]; return s?nameEntry(s):false;};
const test=pairs.filter((_,i)=>i%5===0);
const buckets={"PROPER NAMES":[],"ORDINARY WORDS":[]};
for(const [form,root] of test){
  let r; try{ r=getRoot(form); }catch(e){ r=null; }
  if(real(r)&&norm(r)===norm(root)) continue;         // engine already right
  buckets[isNameForm(form)?"PROPER NAMES":"ORDINARY WORDS"].push([form,root]);
}
for(const [label,rows] of Object.entries(buckets)){
  let n=0,right=0,wrong=0;
  for(const [form,root] of rows){
    const a=analyze(form); if(!a) continue;
    n++; if(norm(a)===norm(root)) right++; else wrong++;
  }
  console.log("  "+label.padEnd(16)+" population "+String(rows.length).padStart(5)+
              "   answered "+String(n).padStart(5)+"   right "+String(right).padStart(4)+
              "   wrong "+String(wrong).padStart(4)+"   precision "+(100*right/Math.max(n,1)).toFixed(1)+"%"+
              (right>wrong?"   <= NET POSITIVE":""));
}
