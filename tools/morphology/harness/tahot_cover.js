const fs=require("fs");
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
const rows=fs.readFileSync(process.argv[3],"utf8").trim().split("\n").slice(1).map(l=>l.split("\t"));
let hit=0,tok=0,miss=0;
const ex=[];
for(const [n,vol,ref,form,gloss] of rows){
  const parts=form.split("־").filter(Boolean);
  let r=null;
  for(const p of parts){ const k=norm(p); if(IDX[k]){ r=IDX[k]; break; } }
  if(!r) r=IDX[norm(form)];
  if(r){ hit++; tok+=+n; if(ex.length<16) ex.push({n:+n,form,gloss,r}); }
  else miss++;
}
console.log("  in-scope gap rows      : "+rows.length);
console.log("  resolved by TAHOT      : "+hit+"  ("+(100*hit/rows.length).toFixed(1)+"%,  "+tok+" tokens)");
console.log("  not in TAHOT           : "+miss);
console.log("\n  === samples, with the morphology TAHOT supplies ===");
for(const e of ex){
  const r=e.r;
  const m = r.pos==="verb" ? [r.stem,r.conj,r.pgn].filter(Boolean).join(" ") : (r.sub||"");
  console.log("   x"+String(e.n).padEnd(3)+e.form.padEnd(20)+'"'+String(e.gloss).slice(0,22)+'"'.padEnd(24-Math.min(22,String(e.gloss).length))+
              " -> "+String(r.sn).padEnd(9)+r.pos.padEnd(11)+m);
}
