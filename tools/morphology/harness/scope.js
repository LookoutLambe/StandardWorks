// WHAT IS IN SCOPE for a biblical-root analyser.
// Out of scope, and not failures:
//   NUMERALS   a single Hebrew letter, alone or with geresh/period/gershayim --
//              verse numbers are written in Hebrew letters (ק. ו׳ ב ג ט)
//   NON-WORDS  digits, Latin, ellipsis, punctuation-only tokens
//   LOANWORDS  Greek/Latin/Persian transcriptions with no Hebrew root
//   NAMES      already excluded upstream via root_names.js
// IN scope: everything else, including post-biblical formations built on
// biblical roots (הַבְטָחָה from בטח), which the rules CAN resolve.
const fs=require("fs");
const strip=s=>[...s].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("");
const HEB=/[א-ת]/;
function classify(form,gloss){
  const raw=String(form);
  const letters=[...raw].filter(c=>HEB.test(c));
  const hasOther=/[A-Za-z0-9…]/.test(raw);
  if(!letters.length) return "non-word";
  // a lone Hebrew letter, with or without geresh ׳ / gershayim ״ / period
  if(letters.length===1) return "numeral";
  if(letters.length===2 && /[׳״.]/.test(raw)) return "numeral";
  if(hasOther) return "non-word";
  return "in-scope";
}
// Greco-Roman institutional vocabulary, and modern/scientific loanwords in the
// D&C and PGP. None has a Hebrew root, so a root for them is always an artefact
// of forcing the analysis -- monogamy became נגה "light", history became סטר.
const LOAN=/\b(governor|council|sanhedrin|centurion|legion|denar|penny|farthing|mite|talent|theatre|theater|proconsul|procurator|tetrarch|praetorium|cohort|drachma|stadia|litra|tribune|prefect|cock|hen|monogamy|polygamy|history|historian|philosoph|democra|republic|constitution|committee|secretary|president|professor|college|university|telegraph|railroad|America|Europe|Asia|dollar|acre)\b/i;
// transliteration shapes: Greek/Latin endings on a long stem, and consonant
// runs Hebrew roots do not produce
const FOREIGN_SHAPE=/(־?[א-ת]*)?(וגמיה|וריה|טוריה|לוגיה|ריון|אוס|יוס|נטי|רסיט)$/;
const rows=fs.readFileSync("engine_gaps.tsv","utf8").trim().split("\n").slice(1).map(l=>l.split("\t"));
const out={}, tok={};
const keep=[];
for(const r of rows){
  const [n,vol,ref,form,gloss]=r;
  let k=classify(form,gloss);
  const c=norm(form.split("־").pop());
  if(k==="in-scope" && (LOAN.test(gloss||"") || (FOREIGN_SHAPE.test(c)&&c.length>=7))) k="loanword";
  out[k]=(out[k]||0)+1; tok[k]=(tok[k]||0)+ +n;
  if(k==="in-scope") keep.push(r);
}
console.log("  gap rows: "+rows.length+"\n");
for(const k of ["in-scope","numeral","non-word","loanword"])
  if(out[k]) console.log("    "+k.padEnd(12)+String(out[k]).padStart(5)+" forms   "+String(tok[k]).padStart(5)+" tokens");
fs.writeFileSync(process.argv[2],"count\tvolume\tfirst_ref\tform\tgloss\n"+keep.map(r=>r.join("\t")).join("\n"));
console.log("\n  in-scope list written to "+process.argv[2]);
// show what got excluded, so the call is auditable
console.log("\n  === excluded as numerals / non-words ===");
let shown=0;
for(const [n,vol,ref,form,gloss] of rows){
  const k=classify(form,gloss);
  if((k==="numeral"||k==="non-word") && shown<14){ shown++;
    console.log("   x"+String(n).padEnd(3)+vol.padEnd(10)+form.padEnd(14)+'"'+String(gloss).slice(0,22)+'"   ['+k+']'); }
}
