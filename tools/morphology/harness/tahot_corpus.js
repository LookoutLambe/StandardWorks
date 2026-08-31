const fs=require("fs"),path=require("path");
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
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const VOL={"ot_verses":"OT","nt_verses":"NT","bom/verses":"BOM","dc_verses":"D&C","pgp_verses":"PGP"};
console.log("  volume      forms   in TAHOT     tokens   token coverage");
let TF=0,TH=0,TT=0,TC=0;
for(const [d,label] of Object.entries(VOL)){
  const seen=new Map();
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){ const k=m[1]; if(!norm(k))continue;
      seen.set(k,(seen.get(k)||0)+1); } }
  let forms=0,hit=0,tok=0,cov=0;
  for(const [k,n] of seen){
    forms++; tok+=n;
    const parts=k.split("־").filter(Boolean);
    let ok=!!IDX[norm(k)];
    if(!ok) for(const p of parts) if(IDX[norm(p)]){ ok=true; break; }
    if(ok){ hit++; cov+=n; }
  }
  TF+=forms; TH+=hit; TT+=tok; TC+=cov;
  console.log("  "+label.padEnd(10)+String(forms).padStart(6)+String(hit).padStart(10)+
              String(tok).padStart(11)+"   "+(100*cov/tok).toFixed(1)+"%");
}
console.log("  "+"TOTAL".padEnd(10)+String(TF).padStart(6)+String(TH).padStart(10)+
            String(TT).padStart(11)+"   "+(100*TC/TT).toFixed(1)+"%");
