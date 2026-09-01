// PARADIGM-BASED Hebrew morphological analyser.
//
// Not heuristic peeling: every binyan x conjugation x weak-class has a
// declared template over the CONSONANT skeleton, with the dagesh as an
// explicit slot. Matching a form against a template EXTRACTS the radicals.
//
// Template mini-language, matched left to right against consonants:
//   1 2 3      the three radicals
//   *2         radical 2 carrying a forte dagesh (an assimilated radical
//              or a geminate collapse lives in that dagesh)
//   =2         radical 2 doubled by Piel/Pual/Hitpael (dagesh, NOT a loss)
//   letters    literal consonants (preformatives, afformatives)
//   P          any imperfect preformative  א ת י נ
//   ?x         optional literal x
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const DAGESH=0x05BC, LETTER=/[א-ת]/;
const BGDKPT=new Set(["ב","ג","ד","כ","פ","ת"]);
const FULLVOWEL=new Set([0x05B1,0x05B2,0x05B3,0x05B4,0x05B5,0x05B6,0x05B7,0x05B8,0x05B9,0x05BA,0x05BB,0x05C7]);
const SHVA=0x05B0;

function decompose(word){
  const out=[];
  for(const ch of String(word)){
    const n=ch.codePointAt(0);
    if(LETTER.test(ch)) out.push({c:FIN[ch]||ch,dag:false,vow:null});
    else if(n===DAGESH&&out.length) out[out.length-1].dag=true;
    else if(out.length&&(FULLVOWEL.has(n)||n===SHVA)){
      const o=out[out.length-1]; if(o.vow===null) o.vow=(n===SHVA?"shva":"full");
    }
  }
  // Van Pelt: בג"ד כפ"ת takes dagesh LENE only when not preceded by a vowel.
  out.forEach((o,i)=>{
    const prev=i>0?out[i-1]:null, afterVowel=prev&&prev.vow==="full";
    o.forte=o.dag&&(!BGDKPT.has(o.c)?i>0:!!afterVowel);
  });
  return out;
}
const PREFORM=new Set(["א","ת","י","נ"]);

// Match a template against the consonant array; return {1:..,2:..,3:..} or null
function match(tpl,u){
  const toks=tpl.split(" ").filter(Boolean);
  const R={}; let i=0;
  for(let t=0;t<toks.length;t++){
    const tok=toks[t];
    if(tok.startsWith("?")){                       // optional literal
      if(i<u.length&&u[i].c===tok[1]) i++;
      continue;
    }
    if(i>=u.length) return null;
    const cur=u[i];
    if(tok==="P"){ if(!PREFORM.has(cur.c)) return null; i++; continue; }
    if(/^[123]$/.test(tok)){
      if(R[tok]&&R[tok]!==cur.c) return null;
      R[tok]=cur.c; i++; continue;
    }
    if(tok.startsWith("*")){                       // radical hidden in a dagesh
      const k=tok[1];
      if(!cur.forte) return null;
      if(R[k]&&R[k]!==cur.c) return null;
      R[k]=cur.c; i++; continue;
    }
    if(tok.startsWith("=")){                       // doubling: Piel etc.
      const k=tok[1];
      if(!cur.dag) return null;
      if(R[k]&&R[k]!==cur.c) return null;
      R[k]=cur.c; i++; continue;
    }
    if(cur.c!==tok) return null;                   // literal
    i++;
  }
  if(i!==u.length) return null;                    // must consume the whole stem
  return R;
}
// --- the paradigm table -------------------------------------------------
// [template, weak-class, root-builder, cost]  (lower cost = better evidence)
const R3=r=>r[1]&&r[2]&&r[3]?r[1]+r[2]+r[3]:null;
const NUN=r=>r[2]&&r[3]?"נ"+r[2]+r[3]:null;          // assimilated I-nun
const LQH=r=>r[2]&&r[3]?"ל"+r[2]+r[3]:null;          // לקח only
const YOD=r=>r[2]&&r[3]?"י"+r[2]+r[3]:null;          // I-yod dropped
const GEM=r=>r[1]&&r[3]?r[1]+r[3]+r[3]:null;         // geminate — templates bind slots 1 and 3 ("P 1 3", "נ 1 3"); reading slot 2 meant this never fired (fixed 2026-09-01)
const HOLW=r=>r[1]&&r[3]?r[1]+"ו"+r[3]:null;         // hollow II-waw
const HOLY=r=>r[1]&&r[3]?r[1]+"י"+r[3]:null;         // hollow II-yod
const IIIH=r=>r[1]&&r[2]?r[1]+r[2]+"ה":null;         // III-he
const T=[];
const add=(tpl,cls,fn,cost)=>T.push({tpl,cls,fn,cost});

// ---- QAL ---------------------------------------------------------------
add("1 2 3","qal perf strong",R3,0.10);
add("1 2 3 ת י","qal perf 1cs",R3,0.15);
add("1 2 3 ת","qal perf 2ms",R3,0.15);
add("1 2 3 נ ו","qal perf 1cp",R3,0.15);
add("1 2 3 ו","qal perf 3cp",R3,0.15);
add("1 2 3 ה","qal perf 3fs",R3,0.15);
add("P 1 2 3","qal impf strong",R3,0.15);
add("P *2 3","qal impf I-nun",NUN,0.10);
add("P *2 3","qal impf lamed-qof",LQH,1.20);
add("P 2 3","qal impf I-yod/I-nun",YOD,0.55);
add("P 1 2 3 ו","qal impf 3mp",R3,0.20);
add("P 1 2 3 נ ה","qal impf 3fp",R3,0.20);
add("P 1 ו 3","qal impf hollow",HOLW,0.30);
add("P 1 3","qal impf hollow/geminate",HOLW,0.60);
add("P 1 3","qal impf geminate",GEM,0.60);
add("P 1 2","qal impf III-he",IIIH,0.35);
add("1 2","qal imperative I-nun/III-he",IIIH,0.60);
add("1 2 3","qal imperative strong",R3,0.30);
add("ל 1 2 3","qal infinitive + ל",R3,0.20);
add("ל *2 3","qal infinitive I-nun",NUN,0.30);
add("ל 1 2 ת","qal infinitive cstr III-he",IIIH,0.40);
add("1 ו 2 3","qal participle",R3,0.20);
add("1 ו 2 3 י ם","qal participle mp",R3,0.25);
add("1 2 3 י ם","qal participle mp (defective)",R3,0.30);
// ---- NIPHAL ------------------------------------------------------------
add("נ 1 2 3","niphal perfect",R3,0.15);
add("נ 1 2 3 ו","niphal perf 3cp",R3,0.20);
add("ה 1 2 3","niphal imperative/infinitive",R3,0.35);
add("P *1 2 3","niphal imperfect",R3,0.30);
add("ה ו 2 3","niphal I-yod",YOD,0.35);
add("נ 1 2","niphal III-he",IIIH,0.40);
// ---- PIEL / PUAL -------------------------------------------------------
add("1 =2 3","piel/pual perfect",R3,0.10);
add("P 1 =2 3","piel imperfect",R3,0.15);
add("מ 1 =2 3","piel participle",R3,0.20);
add("1 =2","piel III-he",IIIH,0.45);
// ---- HIPHIL / HOPHAL ---------------------------------------------------
add("ה 1 2 י 3","hiphil perfect",R3,0.12);
add("ה *2 י 3","hiphil perfect I-nun",NUN,0.12);
add("ה 1 2 3","hiphil perfect (short)",R3,0.30);
add("ה *2 3","hiphil I-nun (short)",NUN,0.25);
add("P 1 2 י 3","hiphil imperfect",R3,0.18);
add("P *2 י 3","hiphil imperfect I-nun",NUN,0.15);
add("מ 1 2 י 3","hiphil participle",R3,0.22);
add("ה ו 2 י 3","hiphil I-yod",YOD,0.20);
add("ה ו 2 3","hiphil I-yod (short)",YOD,0.30);
add("ה 1 י 3","hiphil hollow",HOLW,0.25);
add("ה 1 י 3","hiphil hollow (yod)",HOLY,0.55);
add("ה 1 2","hiphil III-he",IIIH,0.45);
add("ה ה 1 2 3","hophal",R3,0.40);
// ---- HITPAEL -----------------------------------------------------------
add("ה ת 1 =2 3","hitpael perfect",R3,0.15);
add("P ת 1 =2 3","hitpael imperfect",R3,0.20);
add("מ ת 1 =2 3","hitpael participle",R3,0.25);
add("ה ת 1 2 3","hitpael (undoubled)",R3,0.30);
// ---- nominal patterns that hide the root -------------------------------
add("מ 1 2 3","noun mi-/ma- prefix",R3,0.30);
add("מ *2 3","noun mi- + I-nun",NUN,0.35);
add("1 2 3 ו נ","noun -on",R3,0.35);
add("1 2 ו נ","noun -on III-he",IIIH,0.45);
add("1 2 נ","noun -an",IIIH,0.50);
add("ת 1 2 3","noun ta- prefix",R3,0.40);
add("ת ו 2 3","noun ta- I-yod",YOD,0.45);

// ---- added 2026-09-01: classes the PGP second pass exposed ---------------
add("2 3 ת","qal inf-cstr / segholate noun, I-yod dropped (דַּעַת שֶׁבֶת רֶדֶת לֶדֶת)",YOD,0.40);
add("1 =2 ו י","noun kittul, III-he (עִנּוּי קִנּוּי)",IIIH,0.45);
add("ת 1 ו 3","noun ta- prefix, hollow (תְּקוּפָה תְּשׁוּבָה תְּבוּאָה תְּרוּמָה)",HOLW,0.45);
add("ת 1 ו 3 ת","noun ta- prefix, hollow, feminine construct/suffixed",HOLW,0.45);
add("נ 1 3","niphal perfect, geminate (נָמֵס נָסַב נָקֵל)",GEM,0.50);
add("1 2 3 נ","noun -on written defective (פִּתְרֹן)",R3,0.50);
add("ת 1 3 ו ת","noun ta- prefix, hollow written defective, fem plural (תְּקֻפוֹת)",HOLW,0.50);

module.exports={decompose,match,T};
