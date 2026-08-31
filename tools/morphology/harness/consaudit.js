const fs=require("fs"),path=require("path"),vm=require("vm");
const R="/Users/chrislambe/Desktop/untitled folder/Escrituras";
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const strip=s=>[...String(s)].filter(c=>{const n=c.codePointAt(0);return !(n>=0x0591&&n<=0x05C7)}).join("");
const cons=s=>[...strip(s)].map(c=>FIN[c]||c).join("").replace(/[^א-ת]/g,"");
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(path.join(R,f),"utf8"),{window:win},{filename:f}));
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(R,"root_engine.js"),"utf8"),ctx,{filename:"root_engine.js"});
const RE=win.RootEngine, getRoot=RE.getRoot, LK=win._strongsLookup||{};
const NM=win._rootNames||win.RootNames||{};
const g={}; vm.runInNewContext(fs.readFileSync(path.join(R,"bom/roots_glossary.js"),"utf8"),{window:g},{filename:"g"});
const GL=g._rootGlossaryData||{};
const idx=new Map();
for(const k of Object.keys(LK)){ const c=cons(k); if(c.length<2)continue;
  let v=LK[k]; v=Array.isArray(v)?v[0]:v; if(!v)continue;
  if(!idx.has(c))idx.set(c,new Set()); idx.get(c).add(String(v)); }
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const forms=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  const D=path.join(R,d); if(!fs.existsSync(D))continue;
  for(const f of fs.readdirSync(D)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(D,f),"utf8"); let m;
    while((m=TOK.exec(src))){ const h=m[1],gg=m[2]; if(!cons(h)||!gg)continue;
      if(!forms.has(h))forms.set(h,{g:new Set(),n:0,vol:d.split("/")[0].replace("_verses","")});
      const o=forms.get(h); o.g.add(gg); o.n++; } } }
const isName=h=>{ const c=cons(h);
  for(const k of Object.keys(NM)) if(cons(k)===c) return true;
  return false; };
const out=[];
for(const [h,info] of forms){
  let r; try{ r=String(getRoot(h)); }catch(e){continue}
  const c=cons(h); if(r&&r!==c) continue;
  const s=idx.get(c); if(!s||s.size!==1) continue;
  const st=[...s][0];
  let base=st; try{ base=String(RE.getRoot? (win._strongsRoots&&win._strongsRoots[st])||st : st);}catch(e){}
  const entry=GL[st]||GL[base]||null;
  out.push({h,n:info.n,vol:info.vol,g:[...info.g].slice(0,2).join(" | "),st,base,
            mean:entry?String(entry.meaning||"").slice(0,40):"(no card)", nm:isName(h)});
}
out.sort((a,b)=>b.n-a.n);
console.log("recovered forms: "+out.length+"   tokens: "+out.reduce((a,b)=>a+b.n,0));
console.log("of which flagged as NAMES (will be gated out): "+out.filter(x=>x.nm).length+"\n");
for(const o of out) console.log((o.nm?"NAME ":"     ")+String(o.n).padStart(5)+"  "+o.h.padEnd(16)+
  " ["+o.vol.padEnd(3)+"] "+('"'+o.g+'"').slice(0,40).padEnd(42)+o.st.padEnd(7)+o.mean);
