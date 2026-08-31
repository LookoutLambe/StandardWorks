// Isolate BOOK OF MORMON proper names and check how each currently resolves.
// A BOM name is a form the corpus glosses as a capitalised proper name and
// which does NOT appear as a name in the Hebrew or Greek scriptures. Those are
// the ones with no lexical entry anywhere, so any root they get is a collision.
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
const getRoot=win.RootEngine.getRoot, SR=win._strongsRoots, NAMES=win._rootProperNames;
const TOK=/\["([^"]*)","([^"]*)"\]/g;
// LEAD particles may precede the name in the gloss
const LEAD=new Set("the and to unto of from in into upon on for with by at even yea o a an before against over after also".split(" "));
const COMMON=new Set(("The And God Lord But For Behold Then Now Yea That This All When Who What Amen If So It He She They We In Of To A An O "+
 "My His Her Their Our Your Its Him Them Me Thou Thee Thy Ye I With At From On Even Yes No Not Be Is Was Are Jesus Christ Spirit Father Son "+
 "Holy Ghost Israel Jerusalem Egypt Zion Moses Abraham Isaac Jacob Joseph Judah David Solomon Isaiah Jeremiah Adam Eve Noah Babylon Assyria "+
 "Gentiles Jews Jew Messiah Sabbath Red Sea Aaron Samuel John Paul Peter Mary Elias Enoch Melchizedek Sherem Pharaoh Ishmael Lemuel Laban").split(/\s+/));
function nameOf(g){
  const parts=String(g||"").replace(/[.,;:!?)(]+/g,"").trim().split(/[\s—]+/).filter(Boolean);
  let i=0; while(i<parts.length&&LEAD.has(parts[i].toLowerCase())) i++;
  const rest=parts.slice(i);
  if(!rest.length||rest.length>2) return null;
  const w=rest[0];
  if(!/^[A-Z][a-z]/.test(w)||COMMON.has(w)) return null;
  return rest.join(" ");
}
// where does each form appear, and is it a name THERE too?
const seen=new Map();   // form -> {gl, n, vols:Set}
const VOL={"bom/verses":"BOM","ot_verses":"OT","nt_verses":"NT","dc_verses":"D&C","pgp_verses":"PGP"};
for(const [d,label] of Object.entries(VOL)){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){
      const h=m[1], g=m[2]; if(!norm(h)) continue;
      const nm=nameOf(g); if(!nm) continue;
      const k=norm(h.split("־").pop());
      if(!seen.has(k)) seen.set(k,{form:h,gl:nm,n:0,vols:new Set()});
      const e=seen.get(k); e.n++; e.vols.add(label);
    } } }
const bom=[], shared=[];
for(const [k,e] of seen){
  const v=[...e.vols];
  const inScripture = v.includes("OT")||v.includes("NT");
  (inScripture?shared:bom).push({k,...e,vols:v.join("/")});
}
// how does each BOM-only name currently resolve?
let ok=0,bad=0; const wrong=[];
for(const b of bom){
  let r; try{ r=String(getRoot(b.form)); }catch(e){ r="ERR"; }
  b.root=r;
  const isH=/^H\d+$/.test(r);
  const rec=isH?(SR[r]||{}):null;
  b.shown=isH?((rec.w||"")+' "'+(rec.g||"")+'"'):r;
  b.inNames=!!NAMES[b.k];
  // a name is WRONG if it lands on a lexical entry that is a common word
  b.wrong = isH && rec && !/^[A-Z]/.test(String(rec.g||""));
  if(b.wrong){ bad++; wrong.push(b); } else ok++;
}
bom.sort((a,b)=>b.n-a.n);
console.log("  forms glossed as a proper name        : "+seen.size);
console.log("    also a name in the OT/NT (biblical) : "+shared.length);
console.log("    BOOK OF MORMON / restoration only   : "+bom.length);
console.log("");
console.log("  of the "+bom.length+" restoration-only names:");
console.log("    resolve to their own family or a name entry : "+ok);
console.log("    resolve to a COMMON WORD (collision)        : "+bad);
console.log("    flagged in root_names.js                    : "+bom.filter(b=>b.inNames).length);
console.log("\n  === collisions, most frequent first ===");
wrong.sort((a,b)=>b.n-a.n);
for(const w of wrong.slice(0,25))
  console.log("   x"+String(w.n).padEnd(4)+w.form.padEnd(22)+'"'+w.gl+'"'.padEnd(20-Math.min(18,w.gl.length))+
              " -> "+w.root.padEnd(8)+w.shown+(w.inNames?"":"   [NOT in root_names]"));
fs.writeFileSync(process.argv[2]||"bom_names.json",JSON.stringify(bom,null,1));
console.log("\n  full list written to "+(process.argv[2]||"bom_names.json"));
