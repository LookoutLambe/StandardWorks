// Is the failure rate HIGHER in the translated volumes than in the MT?
// The MT is real biblical Hebrew, so its rate is the floor set by the engine
// itself. Anything close to it means the engine, not the text.
const fs=require("fs"),path=require("path"),vm=require("vm");
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js"]
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
const VOL={"ot_verses":"OT (Masoretic — CONTROL)","nt_verses":"NT (Delitzsch)",
           "bom/verses":"Book of Mormon","dc_verses":"Doctrine & Covenants","pgp_verses":"Pearl of Great Price"};
const rows=[];
for(const [d,label] of Object.entries(VOL)){
  const seen=new Map();
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){ if(!seen.has(m[1])) seen.set(m[1],{g:m[2],n:0}); seen.get(m[1]).n++; } }
  let tok=0,badTok=0,forms=0,badForms=0; const ex=[];
  for(const [h,info] of seen){
    forms++; tok+=info.n;
    let r; try{ r=getRoot(h); }catch(e){ r=null; }
    if(!real(r)){ badForms++; badTok+=info.n; if(ex.length<6) ex.push(h+" ("+info.g+")"); }
  }
  rows.push({label,forms,badForms,tok,badTok,pct:100*badTok/tok,ex});
}
console.log("  volume                        forms   unresolved   tokens    token-rate");
for(const r of rows)
  console.log("  "+r.label.padEnd(28)+String(r.forms).padStart(6)+"  "+String(r.badForms).padStart(6)+
              "      "+String(r.tok).padStart(7)+"   "+r.pct.toFixed(2)+"%");
console.log("");
for(const r of rows){ console.log("  "+r.label+" — samples:"); for(const e of r.ex) console.log("       "+e); }
