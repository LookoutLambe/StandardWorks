// If a form has no EXACT pointed entry in strongs_lookup, how safe is it to
// match on consonants alone? That is the nikkud trade in one measurement:
// how many failures it would resolve, versus how often the consonants are
// AMBIGUOUS (several pointed entries, different Strong's numbers).
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
const getRoot=win.RootEngine.getRoot, SL=win._strongsLookup, SR=win._strongsRoots, BR=win._bdbRoots;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,size=new Map();
RC.keys.forEach((k,i)=>size.set(k,RC.roots[i].c.reduce((a,b)=>a+b,0)));
const real=r=>/^H\d+$/.test(String(r))||(size.get(r)||0)>=8;
// consonantal index of the lookup: skeleton -> set of Strong's numbers
const CI=new Map();
for(const [form,h] of Object.entries(SL)){
  const k=norm(form); if(!k) continue;
  if(!CI.has(k)) CI.set(k,new Set());
  CI.get(k).add(h);
}
let amb=0,uniq=0;
for(const s of CI.values()) (s.size>1?amb++:uniq++);
console.log("  strongs_lookup consonantal skeletons : "+CI.size);
console.log("    map to ONE Strong's number         : "+uniq);
console.log("    AMBIGUOUS (2+ numbers)             : "+amb+"   <- the nikkud is the only separator");
// how would a consonantal fallback do on the engine's failures?
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const occ=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){ if(!norm(m[1]))continue;
      if(!occ.has(m[1])) occ.set(m[1],{g:m[2],n:0}); occ.get(m[1]).n++; } } }
let fail=0,failTok=0,hitU=0,hitUTok=0,hitA=0,hitATok=0;
const ex=[],exA=[];
for(const [h,info] of occ){
  let r; try{ r=getRoot(h); }catch(e){ r=null; }
  if(real(r)) continue;
  fail++; failTok+=info.n;
  const parts=h.split("־").filter(Boolean);
  let set=null;
  for(const p of [h,...parts]){ const s=CI.get(norm(p)); if(s){ set=s; break; } }
  if(!set) continue;
  if(set.size===1){ hitU++; hitUTok+=info.n;
    if(ex.length<12){ const sn=[...set][0]; ex.push({h,g:info.g,n:info.n,sn,root:BR[sn]||"",w:(SR[sn]||{}).w}); } }
  else { hitA++; hitATok+=info.n;
    if(exA.length<8) exA.push({h,g:info.g,n:info.n,set:[...set]}); }
}
console.log("\n  engine failures                      : "+fail+"  ("+failTok+" tokens)");
console.log("    consonants match ONE lookup entry  : "+hitU+"  ("+hitUTok+" tokens)   <- safe");
console.log("    consonants are AMBIGUOUS           : "+hitA+"  ("+hitATok+" tokens)   <- needs the pointing");
console.log("\n  === safe: one entry, so the pointing adds nothing ===");
for(const e of ex) console.log("   x"+String(e.n).padEnd(3)+e.h.padEnd(20)+'"'+String(e.g).slice(0,22)+'"'.padEnd(24-Math.min(22,String(e.g).length))+" -> "+e.sn.padEnd(8)+String(e.root).padEnd(7)+String(e.w||""));
console.log("\n  === ambiguous: several entries share these consonants ===");
for(const e of exA) console.log("   x"+String(e.n).padEnd(3)+e.h.padEnd(20)+'"'+String(e.g).slice(0,20)+'"'.padEnd(22-Math.min(20,String(e.g).length))+" -> "+e.set.map(s=>s+"="+((SR[s]||{}).w||"")).join("  "));
