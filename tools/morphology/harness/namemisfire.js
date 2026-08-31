const fs=require("fs"),path=require("path"),vm=require("vm");
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
 .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
let src=fs.readFileSync("root_engine.js","utf8")
  .replace("window.RootEngine = { getRoot: getRoot,","window.RootEngine = { _ckey:_ckey,_consIndex:_consIndex,baseRoot:baseRoot, getRoot: getRoot,");
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx); vm.runInContext(src,ctx,{filename:"re"});
const RE=win.RootEngine, ix=RE._consIndex();
const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g});
const GL=g._rootGlossaryData;
const isNameEntry=e=>{ if(!e||!e.meaning) return false;
  const m=String(e.meaning).replace(/\([^)]*\)/g,"").replace(/[;,].*$/,"").trim();
  return /^[A-Z][A-Za-z’-]*(\s+[A-Z][A-Za-z’-]*)?$/.test(m) && m.length>2; };
const strip=s=>[...String(s)].filter(c=>{const n=c.codePointAt(0);return !(n>=0x0591&&n<=0x05C7)}).join("");
const TOK=/\["([^"]*)","([^"]*)"\]/g; const forms=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
 if(!fs.existsSync(d))continue;
 for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
  const s2=fs.readFileSync(path.join(d,f),"utf8"); let m;
  while((m=TOK.exec(s2))){ const h=m[1],gg=m[2]; if(!strip(h)||!gg)continue;
   if(!forms.has(h))forms.set(h,{g:new Set(),n:0,vol:d.split("/")[0].replace("_verses","")});
   const o=forms.get(h); o.g.add(gg); o.n++; } } }
const LEAD=/^(and|the|of|to|in|a|an|or|but|for|unto|with|from|by|at|on|o|yea)[\s-]+/i;
const glossIsName=x=>{const t=String(x).replace(LEAD,"").replace(/[.,;:]+$/,"").trim();
  return /^[A-Z][A-Za-z’-]+$/.test(t);};
const bad=[];
for(const [h,info] of forms){
  const k=RE._ckey(h), hit=ix[k];
  if(!hit||hit==="*") continue;
  const r=String(RE.getRoot(h));
  if(r!==String(RE.baseRoot(hit))) continue;
  const ent=GL[hit]||GL[r];
  if(!isNameEntry(ent)) continue;
  if([...info.g].some(glossIsName)) continue;
  bad.push({h,n:info.n,vol:info.vol,g:[...info.g][0],hit,mean:ent.meaning});
}
bad.sort((a,b)=>b.n-a.n);
const q=s=>'"'+s+'"';
console.log("consonantal hits landing on a PROPER-NAME family, own gloss NOT a name:");
console.log("  forms: "+bad.length+"   tokens: "+bad.reduce((a,b)=>a+b.n,0)+"");
for(const b of bad) console.log("   "+String(b.n).padStart(4)+"  "+b.h.padEnd(18)+" ["+b.vol.padEnd(3)+"] "+
  q(b.g.slice(0,26)).padEnd(30)+b.hit.padEnd(8)+String(b.mean).slice(0,36));
