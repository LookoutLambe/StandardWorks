// diff2 with the LOOKUP file parameterised: measures a change to strongs_lookup.js
// (pins) over every corpus form, same engine both sides.  node diff3.js /tmp/sl_head.js
const fs=require("fs"),path=require("path"),vm=require("vm");
const R="/Users/chrislambe/Desktop/untitled folder/Escrituras";
function load(lookupFile){
  const win={};
  [[lookupFile,true],["strongs_roots.js"],["bdb_roots.js"],["shoroshim_roots.js"],["root_names.js"]]
    .forEach(([f,abs])=>vm.runInNewContext(fs.readFileSync(abs?f:path.join(R,f),"utf8"),{window:win},{filename:f}));
  const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(R,"root_engine.js"),"utf8"),ctx,{filename:"root_engine.js"});
  return win.RootEngine.getRoot;
}
const OLD=load(process.argv[2]), NEW=load(path.join(R,"strongs_lookup.js"));
const strip=s=>[...String(s)].filter(c=>{const n=c.codePointAt(0);return !(n>=0x0591&&n<=0x05C7)}).join("");
const TOK=/\["([^"]*)","([^"]*)"\]/g; const forms=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  const D=path.join(R,d); if(!fs.existsSync(D))continue;
  for(const f of fs.readdirSync(D)){ if(!f.endsWith(".js"))continue; const src=fs.readFileSync(path.join(D,f),"utf8"); let m;
    while((m=TOK.exec(src))){ const h=m[1],g=m[2]; if(!strip(h)||!g)continue;
      if(!forms.has(h))forms.set(h,{g:new Set(),n:0,vol:d.split("/")[0].replace("_verses","")}); const o=forms.get(h); o.g.add(g); o.n++; } } }
let same=0,gained=0,gTok=0,moved=0,lost=0; const G=[],M=[],L=[];
for(const [h,info] of forms){
  let a,b; try{a=String(OLD(h))}catch(e){a="ERR"} try{b=String(NEW(h))}catch(e){b="ERR"}
  if(a===b){same++;continue}
  const bare=strip(h).replace(/[^א-ת]/g,""); const wasBare=(a===bare||a===strip(h)), isBare=(b===bare||b===strip(h));
  if(wasBare&&!isBare){gained++;gTok+=info.n;G.push({h,a,b,n:info.n,vol:info.vol,g:[...info.g][0]})}
  else if(!wasBare&&isBare){lost++;L.push({h,a,b,n:info.n,vol:info.vol,g:[...info.g][0]})}
  else {moved++;M.push({h,a,b,n:info.n,vol:info.vol,g:[...info.g][0]})}
}
console.log("forms compared: "+forms.size+"   unchanged: "+same+"   GAINED: "+gained+" ("+gTok+" tok)   moved: "+moved+"   LOST: "+lost);
const show=(t,A)=>{ if(!A.length)return; console.log("\n=== "+t+" ==="); A.sort((x,y)=>y.n-x.n); for(const c of A.slice(0,40)) console.log("   "+String(c.n).padStart(4)+"  "+c.h.padEnd(18)+" ["+c.vol.padEnd(3)+'] "'+c.g.slice(0,26)+'"'.padEnd(28-Math.min(26,c.g.length))+"  "+c.a+"  ->  "+c.b); };
show("LOST a root (regression)",L); show("MOVED root -> root",M); show("GAINED",G);
