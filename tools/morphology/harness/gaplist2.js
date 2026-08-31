// Engine gaps, HEBREW ONLY.
// Excluded: bracketed/parenthesised ketiv-qere (unvocalised by design, never
// parseable) and the Aramaic sections of the Tanakh.
const fs=require("fs"),path=require("path"),vm=require("vm");
const win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js","root_names.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const ctx={window:win,_strongsLookup:win._strongsLookup,_strongsRoots:win._strongsRoots};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("root_engine.js","utf8"),ctx,{filename:"root_engine.js"});
const getRoot=win.RootEngine.getRoot, SR=win._strongsRoots, N=win._rootProperNames, SL=win._strongsLookup;
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,size=new Map();
RC.keys.forEach((k,i)=>size.set(k,RC.roots[i].c.reduce((a,b)=>a+b,0)));
const real=r=>/^H\d+$/.test(String(r))||(size.get(r)||0)>=8;
const strip=s=>[...s].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("");
const fold=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z]/g,"").replace(/j/g,"y").replace(/w/g,"u");
const nameEntry=n=>{const r=SR[n];if(!r)return false;const g=String(r.g||"").trim();
  if(!/^[A-Z]/.test(g)||g.split(/\s+/).length>2)return false;
  const a=fold(r.x),b=fold(g);return !!(a&&b&&(a===b||a.indexOf(b)===0||b.indexOf(a)===0));};
const COMMONCAP=new Set("The And God Lord But For Behold Then Now Yea That This All When Who What Amen If So It He She They We In Of To A An O My His Her Their Our Your Its Him Them Me Thou Thee Thy Ye I With At From On Even Yes No Not Be Is Was Are".split(" "));
const glossLooksName=g=>{const w=String(g||"").replace(/[^A-Za-z\- ]/g,"").trim().split(/\s+/)[0]||"";
  return /^[A-Z][a-z]/.test(w)&&!COMMONCAP.has(w);};
// THE ARAMAIC SECTIONS OF THE TANAKH
const ARAMAIC=(file,ch,v)=>{
  if(file==="dan.js") return (ch===2&&v>=4)||(ch>=3&&ch<=7);
  if(file==="ezr.js") return (ch===4&&v>=8)||ch===5||(ch===6&&v<=18)||(ch===7&&v>=12&&v<=26);
  if(file==="jer.js") return ch===10&&v===11;
  if(file==="gen.js") return ch===31&&v===47;
  return false;
};
const GEM={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};
const gem=s=>[...s].reduce((a,c)=>a+(GEM[c]||0),0);
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const VOL={"bom/verses":"BOM","ot_verses":"OT","nt_verses":"NT","dc_verses":"D&C","pgp_verses":"PGP"};
const occ=new Map();
let aramSkipped=0, bracketSkipped=0;
for(const [d,label] of Object.entries(VOL)){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8");
    const CH=/ch(\d+)Verses\s*=\s*\[/g; let cm;
    while((cm=CH.exec(src))){
      const ch=parseInt(cm[1]);
      let i=src.indexOf("[",cm.index),dep=0,end=src.length;
      for(let j=i;j<src.length;j++){ if(src[j]==="[")dep++; else if(src[j]==="]"){dep--; if(!dep){end=j+1;break;}} }
      const block=src.slice(i,end);
      const VR=/\{\s*num\s*:\s*"([^"]*)"([\s\S]*?)\}(?=\s*[,\]])/g; let vmz;
      while((vmz=VR.exec(block))){
        const v=gem(vmz[1]); let m; TOK.lastIndex=0;
        while((m=TOK.exec(vmz[2]))){
          const h=m[1]; if(!norm(h)) continue;
          if(/[\[\]()]/.test(h)){ bracketSkipped++; continue; }
          if(d==="ot_verses"&&ARAMAIC(f,ch,v)){ aramSkipped++; continue; }
          if(!occ.has(h)) occ.set(h,{gl:new Map(),n:0,vols:new Set(),ref:label+" "+f.replace(".js","")+" "+ch+":"+v});
          const e=occ.get(h); e.n++; e.vols.add(label); e.gl.set(m[2],(e.gl.get(m[2])||0)+1);
        } } } } }
const rows=[];
for(const [h,e] of occ){
  let r; try{ r=getRoot(h); }catch(err){ r=null; }
  if(real(r)) continue;
  if(N[norm(h)]) continue;
  const s=SL[h]; if(s&&nameEntry(s)) continue;
  const gloss=[...e.gl.entries()].sort((a,b)=>b[1]-a[1])[0][0];
  if(glossLooksName(gloss)) continue;
  rows.push({h,gloss,n:e.n,vols:[...e.vols].join("/"),ref:e.ref});
}
rows.sort((a,b)=>b.n-a.n);
console.log("  excluded: "+bracketSkipped+" bracketed ketiv/qere tokens, "+aramSkipped+" Aramaic tokens");
console.log("  HEBREW-ONLY ENGINE GAPS: "+rows.length+" forms, "+rows.reduce((a,r)=>a+r.n,0)+" tokens\n");
console.log("   x    volume       form                     gloss");
for(const r of rows.slice(0,40))
  console.log("   "+String(r.n).padEnd(5)+r.vols.padEnd(13)+r.h.padEnd(25)+r.gloss);
fs.writeFileSync(process.argv[2],"count\tvolume\tfirst_ref\tform\tgloss\n"+
  rows.map(r=>[r.n,r.vols,r.ref,r.h,r.gloss].join("\t")).join("\n"));
console.log("\n  written: "+process.argv[2]);
