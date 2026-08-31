// Does each NEWLY-GAINED family's meaning agree with the glosses under it?
// The consonantal match can be unambiguous in the MT and still wrong for the
// BOM/NT, when the MT's only occurrence of that skeleton is a proper name:
// וְיִתְמָה (Ithmah, 1Ch 11:46) captured 13 tokens of וַיִּתְמַהּ "marvelled".
const fs=require("fs"),path=require("path"),vm=require("vm");
function load(e,n){const win={};
 ["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js"].forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
 vm.runInNewContext(fs.readFileSync(n,"utf8"),{window:win},{filename:n});
 const c={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
 vm.createContext(c); vm.runInContext(fs.readFileSync(e,"utf8"),c,{filename:e}); return win.RootEngine.getRoot;}
const OLD=load("/tmp/re2.bak.js","/tmp/rn.bak.js"), NEW=load("root_engine.js","root_names.js");
const g={}; vm.runInNewContext(fs.readFileSync("bom/roots_glossary.js","utf8"),{window:g}); const GL=g._rootGlossaryData;
const strip=s=>[...String(s)].filter(c=>{const n=c.codePointAt(0);return !(n>=0x0591&&n<=0x05C7)}).join("");
const STOP=new Set(("the a an of to and or in on for with by from at as is are was were be been being it its his her their my our your you he she they we i me him them us that this these those which who what not no shall will would should may might can could must do does did done have has had am o yea behold lo unto upon into out up down all any every when where while after before now thus even also more most much many one two three own thee thou thy thine ye same such other according concerning against because therefore wherefore let").split(/\s+/));
const words=s=>String(s||"").toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
const st4=w=>w.slice(0,4);
const TOK=/\["([^"]*)","([^"]*)"\]/g; const forms=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
 if(!fs.existsSync(d))continue;
 for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
  const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
  while((m=TOK.exec(src))){ const h=m[1],gg=m[2]; if(!strip(h)||!gg)continue;
   if(!forms.has(h))forms.set(h,{g:new Set(),n:0,vol:d.split("/")[0].replace("_verses","")});
   const o=forms.get(h); o.g.add(gg); o.n++; } } }
const gained=new Map();
for(const [h,info] of forms){ let a,b; try{a=String(OLD(h))}catch(e){continue} try{b=String(NEW(h))}catch(e){continue}
 if(a===b)continue; const bare=strip(h).replace(/[^א-ת]/g,"");
 if(!(a===bare||a===strip(h)))continue; if(b===bare)continue;
 if(!gained.has(b))gained.set(b,{n:0,gl:new Map(),forms:new Set()});
 const G=gained.get(b); G.n+=info.n; G.forms.add(h);
 for(const x of info.g) G.gl.set(x,(G.gl.get(x)||0)+info.n); }
const bad=[];
for(const [r,G] of gained){
 const e=GL[r]; if(!e||!e.meaning) continue;
 const mw=new Set(words(e.meaning).map(st4)); if(!mw.size) continue;
 let tot=0,ok=0;
 for(const [gl,n] of G.gl){ tot+=n; if(words(gl).map(st4).some(w=>mw.has(w))) ok+=n; }
 if(tot>=2 && ok/tot < 0.10)
   bad.push({r,n:G.n,mean:e.meaning,top:[...G.gl.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join(" / "),
             forms:[...G.forms].slice(0,3).join(" ")});
}
bad.sort((a,b)=>b.n-a.n);
console.log("newly-gained families WITH a meaning line : "+[...gained.keys()].filter(r=>GL[r]).length);
console.log("whose meaning CONTRADICTS its own glosses : "+bad.length+"   ("+bad.reduce((a,b)=>a+b.n,0)+" tokens)\n");
for(const b of bad.slice(0,25))
  console.log("   "+String(b.n).padStart(4)+"  "+b.r.padEnd(10)+String(b.mean).slice(0,34).padEnd(36)+"| "+b.top.slice(0,40)+"   ["+b.forms.slice(0,34)+"]");
