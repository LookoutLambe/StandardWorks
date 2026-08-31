const fs=require("fs"),path=require("path"),vm=require("vm");
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("root_engine.js","utf8"),ctx,{filename:"root_engine.js"});
const getRoot=win.RootEngine.getRoot;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,size=new Map();
RC.keys.forEach((k,i)=>size.set(k,RC.roots[i].c.reduce((a,b)=>a+b,0)));
const real=r=>/^H\d+$/.test(String(r))||(size.get(r)||0)>=8;
const N=win._rootProperNames;
const strip=s=>[...s].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("");
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const occ=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){ if(!norm(m[1]))continue;
      if(!occ.has(m[1])) occ.set(m[1],{g:m[2],n:0}); occ.get(m[1]).n++; } } }
let forms=0,tok=0,badF=0,badT=0,nameF=0,nameT=0;
for(const [h,i] of occ){
  forms++; tok+=i.n;
  let r; try{ r=getRoot(h); }catch(e){ r=null; }
  if(real(r)) continue;
  badF++; badT+=i.n;
  if(N[norm(h)]){ nameF++; nameT+=i.n; }
}
const pf=(a,b)=>(100*a/b).toFixed(2)+"%";
console.log("  CORPUS TOTAL");
console.log("    distinct forms         : "+forms.toLocaleString()+"        tokens: "+tok.toLocaleString());
console.log("    unresolved             : "+badF.toLocaleString()+"  ("+pf(badF,forms)+" of forms)   "+badT.toLocaleString()+" tokens ("+pf(badT,tok)+")");
console.log("    ...of those, PROPER NAMES (correctly unresolvable)");
console.log("                           : "+nameF.toLocaleString()+"  ("+pf(nameF,badF)+" of the failures)   "+nameT.toLocaleString()+" tokens");
console.log("    genuine engine gaps    : "+(badF-nameF).toLocaleString()+"  ("+pf(badF-nameF,forms)+" of forms)   "+(badT-nameT).toLocaleString()+" tokens ("+pf(badT-nameT,tok)+")");
