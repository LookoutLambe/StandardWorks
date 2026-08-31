// ROOT CARDS WHOSE MEANING LINE LEADS WITH A PROPER NAME.
// Not caused by the resolver: roots_glossary.js itself. H0559 (אמר "to say")
// carries the meaning "Amorite", so every one of the ~700 "say" tokens shows a
// card that names a Canaanite nation. Same for Nathan/give, Saul/ask,
// Hezekiah/be-strong, Hashabiah/think.
const fs=require("fs"),path=require("path"),vm=require("vm");
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
 .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx); vm.runInContext(fs.readFileSync("root_engine.js","utf8"),ctx,{filename:"re"});
const getRoot=win.RootEngine.getRoot;
const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g});
const GL=g._rootGlossaryData;
const strip=s=>[...String(s)].filter(c=>{const n=c.codePointAt(0);return !(n>=0x0591&&n<=0x05C7)}).join("");
const LEAD=/^(and|the|of|to|in|a|an|or|but|for|unto|with|from|by|at|on|o|yea)[\s-]+/i;
const glossIsName=x=>/^[A-Z][A-Za-z’-]+$/.test(String(x).replace(LEAD,"").replace(/[.,;:]+$/,"").trim());
// the meaning line LEADS with a name: first clause, stripped of its Hebrew
// parenthetical, is a bare capitalised word
const leadsName=m=>{ const first=String(m).split(";")[0].replace(/\([^)]*\)/g,"").trim();
  return /^[A-Z][A-Za-z’-]*(\s+[A-Z][A-Za-z’-]*)?$/.test(first) && first.length>2; };
const TOK=/\["([^"]*)","([^"]*)"\]/g; const fam=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
 if(!fs.existsSync(d))continue;
 for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
  const s2=fs.readFileSync(path.join(d,f),"utf8"); let m;
  while((m=TOK.exec(s2))){ const h=m[1],gg=m[2]; if(!strip(h)||!gg)continue;
   let r; try{ r=String(getRoot(h)); }catch(e){ continue; }
   if(!fam.has(r)) fam.set(r,{n:0,name:0,gl:new Map()});
   const F=fam.get(r); F.n++; if(glossIsName(gg)) F.name++;
   F.gl.set(gg,(F.gl.get(gg)||0)+1); } } }
const out=[];
for(const [r,F] of fam){
  const e=GL[r]; if(!e||!e.meaning) continue;
  if(!leadsName(e.meaning)) continue;
  if(F.name/F.n >= 0.5) continue;                 // family really IS that name
  out.push({r,n:F.n,namePct:F.name/F.n,mean:e.meaning,
            top:[...F.gl.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join(" / ")});
}
out.sort((a,b)=>b.n-a.n);
console.log("root families whose CARD leads with a proper name but whose WORDS are not that name");
console.log("  families: "+out.length+"    tokens affected: "+out.reduce((a,b)=>a+b.n,0)+"\n");
const q=s=>'"'+s+'"';
for(const o of out.slice(0,40))
  console.log("  "+String(o.n).padStart(5)+"  "+o.r.padEnd(9)+String(o.mean).slice(0,40).padEnd(42)+q(o.top).slice(0,44));
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
console.log("\nfull list -> "+process.argv[2]);
