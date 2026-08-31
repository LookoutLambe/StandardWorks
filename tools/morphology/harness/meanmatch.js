// ROOTS WHOSE CARD CONTRADICTS THE WORDS UNDER IT.
// roots_glossary.js carries one meaning per root. Where the corpus uses that
// root in a sense the entry does not mention, the card asserts something the
// reader can see is wrong: צבע glossed "color" sitting under "pointing".
// Test: does the entry share ANY content word with the glosses of the tokens
// actually filed under it?
const fs=require("fs"),path=require("path"),vm=require("vm");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const strip=s=>[...String(s)].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("").replace(/[^א-ת]/g,"");
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("root_engine.js","utf8"),ctx,{filename:"root_engine.js"});
const getRoot=win.RootEngine.getRoot;
const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g},{filename:"g"});
const GL=g._rootGlossaryData||{};
const STOP=new Set(("the a an of to and or in on for with by from at as is are was were be been being it its his her their my our your you "+
 "he she they we i me him them us that this these those which who what not no shall will would should may might can could must do does did "+
 "done have has had am o yea behold lo unto upon into out up down all any every when where while after before now thus even also more most "+
 "much many one two three own thee thou thy thine ye same such other according concerning against because therefore wherefore let").split(/\s+/));
const words=s=>String(s||"").toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
const stem4=w=>w.slice(0,4);
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const fam=new Map();   // root -> Map(gloss -> count)
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){
      const h=m[1], gl=m[2]; if(!norm(h)||!gl) continue;
      let r; try{ r=String(getRoot(h)); }catch(e){ continue; }
      if(!fam.has(r)) fam.set(r,new Map());
      const M=fam.get(r); M.set(gl,(M.get(gl)||0)+1);
    } } }
const bad=[];
for(const [r,M] of fam){
  const entry=GL[r]; if(!entry||!entry.meaning) continue;
  const mw=new Set(words(entry.meaning).map(stem4));
  if(!mw.size) continue;
  let tot=0, matched=0;
  for(const [gl,n] of M){ tot+=n;
    if(words(gl).map(stem4).some(w=>mw.has(w))) matched+=n; }
  if(tot<4) continue;
  const pct=matched/tot;
  if(pct<0.10){
    const top=[...M.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join(" / ");
    bad.push({r,tot,pct,meaning:entry.meaning,top});
  }
}
bad.sort((a,b)=>b.tot-a.tot);
console.log("  roots with a glossary entry            : "+[...fam.keys()].filter(r=>GL[r]).length);
console.log("  entry shares NOTHING with its own words: "+bad.length+"   ("+bad.reduce((a,b)=>a+b.tot,0)+" tokens)\n");
console.log("   tokens  root      card says                                  the words under it actually mean");
for(const b of bad.slice(0,30))
  console.log("   "+String(b.tot).padStart(6)+"  "+b.r.padEnd(9)+String(b.meaning).slice(0,42).padEnd(44)+b.top.slice(0,46));
fs.writeFileSync(process.argv[2]||"mismatch.json",JSON.stringify(bad,null,1));
console.log("\n  written: "+(process.argv[2]||"mismatch.json"));
