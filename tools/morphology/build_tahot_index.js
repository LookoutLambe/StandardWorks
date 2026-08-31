// Build a form -> (root, part of speech, stem, conjugation, PGN) index from
// TAHOT (STEPBible.org, CC BY 4.0 — github.com/STEPBible/STEPBible-Data).
// The raw files are NOT redistributed here, per STEPBible's request; point the
// script at a local download. Output is a derived index, which the licence
// expressly permits ("download the data and reformat it for your application").
//
// TAHOT marks the AFFIX BOUNDARY with "/" and gives a morphology code per
// morpheme, so it answers directly the question this whole folder exists for:
// what is part of the root, and what is not.
//     בְּ/רֵאשִׁ֖ית   H9003/{H7225G}   HR/Ncfsa
//     בָּרָ֣א        {H1254A}         HVqp3ms      Verb Qal perfect 3ms
const fs=require("fs"),path=require("path");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const strip=s=>[...String(s)].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("").replace(/[^א-ת]/g,"");
const POS={N:"noun",V:"verb",A:"adjective",T:"particle",P:"pronoun",R:"preposition",
           D:"adverb",C:"conjunction",S:"suffix"};
const STEM={q:"qal",N:"niphal",p:"piel",P:"pual",h:"hiphil",H:"hophal",t:"hithpael"};
const CONJ={p:"perfect",q:"seq-perfect",i:"imperfect",w:"wayyiqtol",v:"imperative",
            r:"participle",s:"participle-pass",a:"inf-absolute",c:"inf-construct"};
function parseMorph(code){
  if(!code) return null;
  // TAHOT writes the language letter ONCE, on the first morpheme: "HR/Ncfsa".
  // Subsequent codes are bare, so requiring a leading H dropped every prefixed
  // word -- which is most of them.
  const c=(code[0]==="H"?code.slice(1):code);
  if(!c) return null;
  const pos=POS[c[0]]||null;
  if(c[0]==="V") return {pos:"verb",stem:STEM[c[1]]||null,conj:CONJ[c[2]]||null,pgn:c.slice(3)||null};
  if(!pos) return null;
  return {pos,sub:c.slice(1)||null};
}
const dir=process.argv[2]||".";
const out=new Map();          // normalised form -> {sn, pos, stem, conj, pgn, n}
let rows=0;
for(const f of fs.readdirSync(dir)){
  if(!/^tahot_.*\.txt$/i.test(f)) continue;
  const lines=fs.readFileSync(path.join(dir,f),"utf8").split("\n");
  for(const line of lines){
    // 1Sa, 2Ki, 1Ch ... start with a digit and were being skipped entirely
    if(!/^\d?[A-Z][a-z]{2}\.\d/.test(line)) continue;
    const col=line.split("\t");
    const word=col[1]||"", sn=col[4]||"", mor=col[5]||"";
    if(!word||!mor) continue;
    rows++;
    // each morpheme, so a prefixed form is indexed BOTH whole and by its stem
    const wparts=word.split("/"), mparts=mor.split("/"), sparts=sn.split("/");
    const whole=norm(word.replace(/\//g,""));
    // the CONTENT morpheme is the last one that is not a bare particle
    let idx=mparts.length-1;
    const m=parseMorph(mparts[idx]), s=(sparts[idx]||"").replace(/[{}]/g,"");
    if(!m) continue;
    const rec={sn:s,...m};
    if(whole && !out.has(whole)) out.set(whole,rec);
    const stemForm=norm(wparts[idx]||"");
    if(stemForm && !out.has(stemForm)) out.set(stemForm,rec);
  }
}
console.log("  TAHOT rows parsed : "+rows);
console.log("  distinct forms    : "+out.size);
const byPos={};
for(const r of out.values()) byPos[r.pos]=(byPos[r.pos]||0)+1;
console.log("  by part of speech : "+Object.entries(byPos).sort((a,b)=>b[1]-a[1]).map(x=>x[0]+" "+x[1]).join(", "));
const obj={}; for(const [k,v] of out) obj[k]=v;
fs.writeFileSync(process.argv[3]||"tahot_index.json",JSON.stringify(obj));
console.log("  written: "+(process.argv[3]||"tahot_index.json"));
