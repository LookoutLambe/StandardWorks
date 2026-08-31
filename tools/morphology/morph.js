// Binyan-aware morphological analyser (v3) -- DAGESH-AWARE.
//
// The dagesh is evidence, not decoration. Van Pelt's rules applied here:
//   * dagesh forte in C1 of a stem  <- an assimilated נ (נפל -> יִפֹּל)
//     or the ל of לקח (יִקַּח)
//   * dagesh forte in the last radical of a 2-consonant stem <- a GEMINATE
//     root whose R3 collapsed into R2 (סבב -> יָסֹב / נָסַב)
//   * dagesh forte in R2 of a 3-consonant stem <- Piel/Pual doubling, which
//     is binyan morphology and NOT a lost radical: prefer the stem as-is
//   * dagesh in a בג"ד כפ"ת letter may be merely LENE (hardening after a
//     closed syllable) so it is weak evidence; in any other letter a dagesh
//     can only be FORTE, so it is strong evidence.
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const DAGESH=0x05BC, LETTER=/[א-ת]/;
const BGDKPT=new Set(["ב","ג","ד","כ","פ","ת"]);
const {canDouble,GUTTURAL}=require("./assim.js");

// -> [{c, dag, forte}] ; forte = dagesh that cannot be explained as lene
const FULLVOWEL=new Set([0x05B1,0x05B2,0x05B3,0x05B4,0x05B5,0x05B6,0x05B7,0x05B8,
                         0x05B9,0x05BA,0x05BB,0x05C7]);        // everything except shva 05B0
const SHVA=0x05B0;
function decompose(word){
  const out=[];
  for(const ch of String(word)){
    const n=ch.codePointAt(0);
    if(LETTER.test(ch)){ out.push({c:FIN[ch]||ch,dag:false,vow:null}); }
    else if(n===DAGESH && out.length){ out[out.length-1].dag=true; }
    else if(out.length && (FULLVOWEL.has(n)||n===SHVA)){
      const o=out[out.length-1]; if(o.vow===null) o.vow = (n===SHVA?"shva":"full");
    }
  }
  // Van Pelt: a בג"ד כפ"ת letter takes dagesh LENE only when NOT preceded by a
  // vowel sound. Preceded by a full vowel, the dagesh must be FORTE.
  out.forEach((o,i)=>{
    const prev=i>0?out[i-1]:null;
    const afterVowel = prev && prev.vow==="full";
    o.forte  = o.dag && canDouble(o.c) && (!BGDKPT.has(o.c) ? i>0 : !!afterVowel);
    o.strong = o.dag && canDouble(o.c) && (!BGDKPT.has(o.c) || !!afterVowel);
  });
  return out;
}
const norm=s=>decompose(s).map(o=>o.c).join("");

const PRE=["","ו","ה","ב","כ","ל","מ","ש","כש","לכ","וב","וה","ול","וכ","ומ","וש",
           "י","ת","א","נ","וי","ות","ונ","הת","להת","ולהת","מת","נת","ית","תת","הי",
           "מה","לה","בה","כה","וא","הא","מא","נה","מב","מל","תה","את"];
const SUF=["","ו","י","ך","ה","נו","הו","הם","הן","כם","כן","ים","ות","תי","ת","תם","תן",
           "נה","ני","יו","יה","יך","ם","ן","נא","את","ותי","ותם","ותיהם","יהם","יכם",
           "ינו","יתי","ית","הּ","יהן","ותיו"];
const NOM=["","ון","ין","ן","ית","יה","י","ות","ה","את","אן"];
const NPRE=[...new Set(PRE.map(norm))], NSUF=[...new Set(SUF.map(norm))], NNOM=[...new Set(NOM.map(norm))];
const RISKY=new Set(["א","י","ת","נ","ה","מ"]);

// peel on the DECOMPOSED word so dagesh flags travel with the stem
function* peel(u){
  const c=u.map(o=>o.c).join(""); const seen=new Set();
  for(const p of NPRE){
    if(p && !c.startsWith(p)) continue;
    for(const s of NSUF){
      const a=c.slice(p.length);
      if(s && !a.endsWith(s)) continue;
      const b=s?a.slice(0,-s.length):a;
      for(const n of NNOM){
        if(n && !b.endsWith(n)) continue;
        const d=n?b.slice(0,-n.length):b;
        if(d.length<2||d.length>5) continue;
        // A single-letter preformative followed by a FORTE dagesh is the
        // signature of imperfect + assimilated נ (יִפֹּל, יִתֵּן, יַגִּיד).
        // That is strong evidence, so the peel is cheap rather than risky.
        const nxt=u[p.length];
        const preformativeEvidence = p.length===1 && RISKY.has(p) && nxt && nxt.forte;
        const cost=(p?p.length*0.75+(p.length===1&&RISKY.has(p)&&!preformativeEvidence?0.9:0):0)
                  +(s?s.length*0.55:0)+(n?n.length*0.6:0);
        const k=d+"|"+cost.toFixed(2);
        if(seen.has(k)) continue; seen.add(k);
        yield [d,u.slice(p.length,p.length+d.length),cost];
      }
    }
  }
}
function* restore(stem,flags){
  const L=stem.length;
  const dag=i=>flags[i]&&flags[i].forte;
  const strong=i=>flags[i]&&flags[i].strong;
  if(L===3){
    // IIBS Course C, units 4 and 14: the Qal INFINITIVE CONSTRUCT of פ''נ and
    // פ''י verbs DROPS the first root letter and adds a feminine ת --
    //   ישב -> שֶׁבֶת   ידע -> דַּעַת   נגש -> גֶּשֶׁת   נתן -> תֵּת
    // so a surface C2-C3-ת is a root of י/נ + C2 + C3. This is why שִׁבְתֵּנוּ
    // and לָשֵׁבֶת were landing on שבת instead of ישב.
    if(stem[2]==="ת"){
      yield ["י"+stem.slice(0,2),0.30];
      yield ["נ"+stem.slice(0,2),0.40];
    }
    // root-final נ of נתן assimilated into an afformative ת: נָתַתִּי
    if(stem[2]==="ת"&&dag(2)) yield [stem.slice(0,2)+"נ",0.35];
    // A dagesh in R2 is Piel/Pual doubling ONLY if C1 is a real radical.
    // If C1 is a possible preformative (י ת א נ מ ה) the dagesh far more
    // likely marks an assimilated נ after that preformative (יִתֵּן = נתן),
    // so it must NOT be read as Piel and must NOT reward the identity.
    const PREFORM=new Set(["י","ת","א","נ","מ","ה"]);
    const c1pre=PREFORM.has(stem[0]);
    // an unexplained forte dagesh counts against reading the stem as-is
    const unexplained = (dag(0)||dag(2)||(dag(1)&&c1pre)) ? 0.85 : 0;
    yield [stem, (dag(1)&&!c1pre ? -0.25 : 0) + unexplained];
    // preformative + assimilated nun: יִתֵּן -> נתן, הִכָּה -> נכה
    if(c1pre&&dag(1)) yield ["נ"+stem.slice(1), 0.25];
    if(c1pre&&dag(1)&&stem[1]==="ק") yield ["ל"+stem.slice(1), 1.15];
    if(stem[2]==="י") yield [stem.slice(0,2)+"ה",0.5];
    if(stem[2]==="ו") yield [stem.slice(0,2)+"ה",0.7];
    if(stem[0]==="ו") yield ["י"+stem.slice(1),0.5];
    if(stem[0]==="נ") yield [stem.slice(1)+stem[2],1.3];
    if(stem[1]==="ו"||stem[1]==="י"){
      const col=stem[0]+stem[2];                 // collapse the mater: גיד -> גד
      yield [col+"ה",1.1];
      yield [col+col[1],1.2];
      // then the assimilation rules apply to the collapsed pair: יַגִּיד -> נגד
      yield ["נ"+col, dag(0)?0.55:1.15];
      if(col[0]==="ק") yield ["ל"+col, dag(0)?1.25:2.0];
      yield [col[0]+"ו"+col[1],1.15];
    }
    yield [stem.slice(0,2)+"ה",1.2];
  }
  if(L===4){
    yield [stem,0.4];
    for(let i=1;i<3;i++) if(stem[i]==="ו"||stem[i]==="י")
      yield [stem.slice(0,i)+stem.slice(i+1),0.6];
  }
  if(L===5){
    for(let i=1;i<4;i++) if(stem[i]==="ו"||stem[i]==="י")
      yield [stem.slice(0,i)+stem.slice(i+1),1.0];
  }
  if(L===2){
    // *** the dagesh rules ***
    // C1 carries forte -> a נ (or the ל of לקח) assimilated into it
    const nunCost   = strong(0)?0.05:(dag(0)?0.25:1.05);
    const lamedCost = strong(0)?0.85:(dag(0)?1.05:1.9);
    yield ["נ"+stem,nunCost];
    if(stem[0]==="ק") yield ["ל"+stem,lamedCost];   // לקח is the only ל that assimilates
    // C2 carries forte -> geminate root, R3 collapsed into R2
    // IIBS Course C unit 25: a geminate's two identical letters merge into one
    // letter with a strong dagesh; but Hebrew does not allow a dagesh at the
    // END of a word, so there the dagesh DROPS and only one letter is seen
    // (תָּסֹב = סבב). A bare 2-letter stem is therefore ordinary evidence of a
    // geminate, not weak evidence.
    const gemCost = strong(1)?0.05:(dag(1)?0.25:0.55);
    yield [stem+stem[1],gemCost];
    yield [stem+"ה",0.7];
    yield ["י"+stem,0.9];
    yield [stem[0]+"ו"+stem[1],0.9];
    yield [stem[0]+"י"+stem[1],1.1];
    yield [stem+"א",1.2];
    yield ["א"+stem,1.3];
  }
}
function makeAnalyzer(KNOWN,FREQ){
  // roots attested in the lexicon but absent from the corpus: allowed only
  // when nothing else fits, never preferred
  const KNOWN0=new Set();
  const cache=new Map();
  return function analyze(form){
    const u=decompose(form);
    const c=u.map(o=>o.c).join("");
    if(!c) return null;
    if(cache.has(c)) return cache.get(c);
    let best=null,bestScore=Infinity;
    for(const [stem,flags,acost] of peel(u)){
      for(const [root,rcost] of restore(stem,flags)){
        if(!KNOWN.has(root)) continue;
        const f=FREQ.get(root)||0;
        // A root that NEVER occurs in the corpus should almost never be the
        // answer: if nothing resolves to it, this form probably does not
        // either. Weighting frequency at 0.16 let זero-occurrence roots beat
        // real ones -- העד (0) beat עוד (1645), ורד (0) beat ירד (770) --
        // because a lazy peel to a dead root cost less than a real derivation.
        if(f===0 && !KNOWN0.has(root)) continue;
        const score=acost+rcost-Math.log(1+f)*0.55;
        if(score<bestScore){ bestScore=score; best=root; }
      }
    }
    cache.set(c,best);
    return best;
  };
}
module.exports={makeAnalyzer,norm,decompose};
