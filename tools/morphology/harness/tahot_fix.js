// Of the forms the LIVE engine cannot root, how many does TAHOT resolve?
const fs=require("fs"),path=require("path"),vm=require("vm");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const strip=s=>[...String(s)].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("").replace(/[^א-ת]/g,"");
const IDX=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
// In a maqqef compound take the CONTENT word, not the first part: גַּם־כִּי was
// resolving to the particle H1571 "also" instead of כי.
const PARTICLE=new Set(["את","מנ","לא","כל","ואת","גמ","וגמ","אל","ואל","על","ועל","עד","מה","אמ","או","כי"]);
function lookup(form){
  const parts=String(form).split("־").filter(Boolean);
  const content=parts.filter(p=>!PARTICLE.has(norm(p)));
  for(const p of (content.length?content:parts)){ const r=IDX[norm(p)]; if(r) return r; }
  return IDX[norm(form)]||null;
}
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
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const occ=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){ if(!norm(m[1]))continue;
      if(!occ.has(m[1])) occ.set(m[1],{g:m[2],n:0}); occ.get(m[1]).n++; } } }
let fail=0,failTok=0,fixed=0,fixedTok=0;
const ex=[];
for(const [h,info] of occ){
  let r; try{ r=getRoot(h); }catch(e){ r=null; }
  if(real(r)) continue;
  fail++; failTok+=info.n;
  const t=lookup(h);
  if(t){ fixed++; fixedTok+=info.n;
    if(ex.length<14) ex.push({h,g:info.g,n:info.n,t}); }
}
console.log("  engine cannot root      : "+fail+" forms  ("+failTok+" tokens)");
console.log("  TAHOT resolves them     : "+fixed+" forms  ("+fixedTok+" tokens)   = "+(100*fixed/fail).toFixed(1)+"%");
console.log("\n  === samples ===");
for(const e of ex){
  const t=e.t, m = t.pos==="verb" ? [t.stem,t.conj,t.pgn].filter(Boolean).join(" ") : (t.sub||"");
  console.log("   x"+String(e.n).padEnd(3)+e.h.padEnd(22)+'"'+String(e.g).slice(0,24)+'"'.padEnd(26-Math.min(24,String(e.g).length))+
              " -> "+String(t.sn).padEnd(10)+t.pos.padEnd(11)+m);
}
