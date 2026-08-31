const fs=require("fs"),path=require("path"),vm=require("vm");
const R="/Users/chrislambe/Desktop/untitled folder/Escrituras";
function load(engineFile,namesFile){
  const win={};
  ["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js"]
    .forEach(f=>vm.runInNewContext(fs.readFileSync(path.join(R,f),"utf8"),{window:win},{filename:f}));
  vm.runInNewContext(fs.readFileSync(namesFile,"utf8"),{window:win},{filename:namesFile});
  const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(engineFile,"utf8"),ctx,{filename:engineFile});
  return win.RootEngine.getRoot;
}
const OLD=load("/tmp/re2.bak.js","/tmp/rn.bak.js");
const NEW=load(path.join(R,"root_engine.js"),path.join(R,"root_names.js"));
const strip=s=>[...String(s)].filter(c=>{const n=c.codePointAt(0);return !(n>=0x0591&&n<=0x05C7)}).join("");
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const forms=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  const D=path.join(R,d); if(!fs.existsSync(D))continue;
  for(const f of fs.readdirSync(D)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(D,f),"utf8"); let m;
    while((m=TOK.exec(src))){ const h=m[1],g=m[2]; if(!strip(h)||!g)continue;
      if(!forms.has(h))forms.set(h,{g:new Set(),n:0,vol:d.split("/")[0].replace("_verses","")});
      const o=forms.get(h); o.g.add(g); o.n++; } } }
let same=0,gained=0,gTok=0,moved=0,mTok=0,lost=0;
const M=[],L=[];
for(const [h,info] of forms){
  let a,b; try{a=String(OLD(h))}catch(e){a="ERR"} try{b=String(NEW(h))}catch(e){b="ERR"}
  if(a===b){same++;continue}
  const bare=strip(h).replace(/[^א-ת]/g,"");
  const wasBare=(a===bare||a===strip(h)), isBare=(b===bare||b===strip(h));
  if(wasBare&&!isBare){gained++;gTok+=info.n}
  else if(!wasBare&&isBare){lost++;L.push({h,a,b,n:info.n,vol:info.vol,g:[...info.g][0]})}
  else {moved++;mTok+=info.n;M.push({h,a,b,n:info.n,vol:info.vol,g:[...info.g][0]})}
}
console.log("forms compared     : "+forms.size);
console.log("unchanged          : "+same);
console.log("GAINED a real root : "+gained+"   ("+gTok+" tokens)");
console.log("moved root->root   : "+moved+"   ("+mTok+" tokens)");
console.log("LOST a root (bad)  : "+lost+"\n");
if(L.length){console.log("=== REGRESSIONS: had a root, now bare ===");
  L.sort((a,b)=>b.n-a.n); for(const c of L.slice(0,40))
    console.log("   "+String(c.n).padStart(4)+"  "+c.h.padEnd(16)+" ["+c.vol+'] "'+c.g.slice(0,22)+'"   '+c.a+"  ->  "+c.b);}
M.sort((a,b)=>b.n-a.n);
console.log("\n=== MOVED root -> root (top 45, inspect) ===");
for(const c of M.slice(0,45))
  console.log("   "+String(c.n).padStart(4)+"  "+c.h.padEnd(16)+" ["+c.vol.padEnd(3)+'] "'+c.g.slice(0,24)+'"'.padEnd(26-Math.min(24,c.g.length))+"   "+c.a+"  ->  "+c.b);
