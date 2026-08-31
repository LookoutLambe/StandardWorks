// RADICAL IDENTIFICATION, following IIBS Course C Unit 7 ("Using the Lexicon").
// The question is not "what root scores best" but "WHAT IS PART OF THE ROOT,
// AND WHAT IS NOT". Peeled in the order the book gives, on the DECOMPOSED
// array so a dagesh never loses its index.
//
//   particles   משה וכלב  — interrogative ה, article ה, conjunction ו,
//               relative שׁ, prepositions ב כ ל מ
//   verbal      1. Yiqtol/Wayyiqtol preformatives  אית״ן
//   prefixes    2. the ו of Weqatal / Wayyiqtol
//               3. binyan markers: נ Nifal, ה Hifil/Hufal, הת Hitpael
//               4. participial מ
//   suffixes    pronominal and inflectional
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const DAGESH=0x05BC, LETTER=/[א-ת]/;
function decomp(w){
  const o=[];
  for(const ch of String(w)){
    const n=ch.codePointAt(0);
    if(LETTER.test(ch)) o.push({c:FIN[ch]||ch,dag:false});
    else if(n===DAGESH&&o.length) o[o.length-1].dag=true;
  }
  return o;
}
const S=u=>u.map(o=>o.c).join("");
const AITAN=new Set(["א","י","ת","נ"]);
const PARTICLE=new Set(["מ","ש","ה","ו","כ","ל","ב"]);   // משה וכלב
const SUF=["הו","ני","נו","הם","הן","כם","כן","יו","יה","יך","ים","ות","תי","תם","תן","נה",
           "ה","ו","י","ך","ם","ן","ת"];

// every plausible (stem, flags) after peeling, cheapest first
function* peels(u){
  const seen=new Set();
  const emit=(v,tag)=>{ const k=S(v)+"|"+tag; if(!seen.has(k)){ seen.add(k); } return [v,tag]; };
  const bases=[[u,""]];
  // 1. particles (at most two layers: וְהַ, לַ, מֵהַ ...)
  for(let d=0;d<2;d++){
    const cur=bases[bases.length-1][0];
    if(cur.length>2 && PARTICLE.has(cur[0].c)) bases.push([cur.slice(1),"particle"]);
    else break;
  }
  for(const [b0,btag] of bases){
    const pdepth = btag==="particle" ? (u.length-b0.length) : 0;
    // 2. verbal prefixes
    const cands=[[b0,"none"]];
    if(b0.length>2 && AITAN.has(b0[0].c)) cands.push([b0.slice(1),"aitan"]);
    if(b0.length>3 && b0[0].c==="ה" && b0[1].c==="ת") cands.push([b0.slice(2),"hitpael"]);
    if(b0.length>2 && b0[0].c==="ה") cands.push([b0.slice(1),"hifil"]);
    if(b0.length>2 && b0[0].c==="נ") cands.push([b0.slice(1),"nifal"]);
    if(b0.length>2 && b0[0].c==="מ") cands.push([b0.slice(1),"participle"]);
    if(b0.length>3 && b0[0].c==="ת") cands.push([b0.slice(1),"noun-tav"]);
    for(const [b1,tag] of cands){
      // 3. suffixes
      const vdepth = pdepth + (tag==="none"?0:(tag==="hitpael"?2:1));
      yield [b1,tag,vdepth];
      const s=S(b1);
      for(const sf of SUF) if(s.length>sf.length+1 && s.endsWith(sf)){
        const cut=b1.slice(0,b1.length-sf.length);
        yield [cut,tag,vdepth+sf.length];
        // FEMININE ה -> ת: a feminine noun in ־ָה writes ־ַת before a suffix or
        // in construct, so a ת left at the end after stripping a suffix is that
        // ending, not a radical. הֲכָנָתָם = הֲכָנָה + ־ָם  (IIBS C, unit 29).
        if(cut.length>2 && cut[cut.length-1].c==="ת")
          yield [cut.slice(0,cut.length-1),tag,vdepth+sf.length+1];
      }
      // bare feminine ־ת in construct, with no pronominal suffix
      if(b1.length>2 && b1[b1.length-1].c==="ת")
        yield [b1.slice(0,b1.length-1),tag,vdepth+1];
    }
  }
}
// From a peeled stem, recover the three radicals using the weak-verb rules.
// From a peeled stem, recover the three radicals. Rules COMPOSE: a 4-letter
// stem that loses a mater becomes a 3-letter stem, which is then run through
// the 3-letter rules -- הוֹשִׁיב -> ושיב -> ושב -> ישב.
function three(c,tag,out,depth){
  if(c.length!==3) return;
  out.push([c,"strong"]);
  // ל"י: the third radical was historically YOD; the lexicon lists it with ה,
  // which is only a mater lectionis for the vowel (IIBS C, unit 11). So a
  // stem ending in yod is looked up under he.
  if(c[2]==="י") out.push([c.slice(0,2)+"ה","lamed-yod (yod hides the he)"]);
  if(c[2]==="ו") out.push([c.slice(0,2)+"ה","lamed-yod (vav form)"]);
  // Hifil of I-yod writes ו where the root has י: הוֹשִׁיב = ישב
  if(c[0]==="ו") out.push(["י"+c.slice(1),"I-yod (vav for yod)"]);
  // a medial ו/י may be the vowel letter of a hollow root
  if(c[1]==="ו"||c[1]==="י") out.push([c[0]+"ו"+c[2],"hollow (mater)"]);
  // an initial ו/י that is only a vowel letter: נוּבָא -> בוא
  if(depth<1&&(c[0]==="ו"||c[0]==="י")) two(c.slice(1),tag,out,depth+1);
}
function two(c,tag,out,depth){
  if(c.length!==2) return;
  out.push([c[0]+"ו"+c[1],"hollow"]);
  out.push([c[0]+"י"+c[1],"hollow (yod)"]);
  out.push([c+c[1],"geminate"]);
  out.push([c+"ה","lamed-yod / III-he"]);
  out.push(["י"+c,"I-yod"]);
  out.push(["נ"+c,"I-nun"]);
  out.push(["ה"+c,"I-he"]);
}
function* radicals(v,tag){
  const c=S(v), n=c.length, out=[];
  // הַקְטָלָה: the Hiphil verbal noun. Applied BEFORE the generic readings
  // because it is a recognised pattern, not a guess -- הֲכָנָה is כון, never
  // כנה "to name", even though כנה is a real root.
  if(tag==="hifil" && n>=3 && c[n-1]==="ה"){
    const mid=c.slice(0,n-1);
    if(mid.length===2){
      out.push([mid[0]+"ו"+mid[1],"haqtalah (hollow)"]);
      out.push(["נ"+mid,"haqtalah (I-nun)"]);
      out.push([mid+mid[1],"haqtalah (geminate)"]);
      out.push(["י"+mid,"haqtalah (I-yod)"]);
    }
    if(mid.length===3) out.push([mid,"haqtalah"]);
  }
  if(n===3) three(c,tag,out,0);
  if(n===2){
    if(v[0].dag){ out.push(["נ"+c,"I-nun (dagesh)"]);
                  if(c[0]==="ק") out.push(["ל"+c,"lqh"]); }
    two(c,tag,out,0);
  }
  if(n===4){
    for(let i=1;i<3;i++) if(c[i]==="ו"||c[i]==="י"){
      const t=c.slice(0,i)+c.slice(i+1);
      out.push([t,"mater dropped"]);
      three(t,tag,out,0);                       // <-- compose
    }
    if(c[3]==="י"||c[3]==="ה"){ const t=c.slice(0,3); out.push([t,"final mater"]); three(t,tag,out,0); }
  }
  for(const o of out) yield o;
}
// A derivation licensed by EVIDENCE outranks a generic one. A forte dagesh on
// the stem's first consonant is positive evidence of an assimilated nun; a ו
// after an identified Hifil prefix is positive evidence of an original yod.
// Frequency only breaks ties among equally-licensed readings -- ranking by
// frequency alone let תנן beat נתן and שוב beat ישב.
const PRIORITY={
  "haqtalah":0, "haqtalah (hollow)":0, "haqtalah (I-nun)":0,
  "haqtalah (geminate)":0, "haqtalah (I-yod)":1,
  "I-nun (dagesh)":0, "lqh":0,
  "I-yod (vav for yod)":1, "hollow (mater)":1, "lamed-yod (yod hides the he)":1,
  "strong":2,
  "mater dropped":3, "final mater":3, "lamed-yod / III-he":3, "hollow":3,
  "hollow (yod)":4, "geminate":4, "I-yod":4, "I-nun":5, "I-he":5,
  "lamed-yod (vav form)":4
};
function analyze(form,KNOWN,FREQ){
  const u=decomp(form);
  const hits=[];
  for(const [v,tag,depth] of peels(u)){
    if(v.length<2||v.length>5) continue;
    for(const [r,how] of radicals(v,tag)){
      if(r.length!==3||!KNOWN.has(r)) continue;
      const f=FREQ.get(r)||0;
      if(f===0) continue;
      let p=PRIORITY[how];
      if(p===undefined) p=3;
      // a Hifil/participle peel makes the vav-for-yod reading much more likely
      if(how==="I-yod (vav for yod)"&&(tag==="hifil"||tag==="participle"||tag==="aitan")) p=0;
      hits.push({r,how,tag,f,p,d:depth||0});
    }
  }
  if(!hits.length) return null;
  // MINIMAL ANALYSIS WINS: a reading that removes fewer affixes is preferred.
  // Peeling the כ of הֲכָנָתָם as a preposition (it is one, in משה וכלב) opened
  // a four-layer path to תמה that beat the two-layer path to כון.
  // DEPTH DOMINATES. A shallower analysis is a better one: כּוֹתֵב is the Qal
  // participle כתב with the holam-vav as a vowel letter (depth 0), not יתב
  // reached by peeling the כ as a preposition and then firing I-yod (depth 1).
  // Ranking by rule priority first let the deeper reading win.
  // Depth, rule specificity and frequency all TRADE OFF; none dominates.
  // Sorting by priority alone let ענו (7 occurrences, "strong") beat ענה (225)
  // and יעז (7) beat עזז (214). One extra peel layer is worth about one order
  // of magnitude of frequency; a more specific rule is worth about a third.
  const score = h => h.d * 1.0 + h.p * 0.35 - Math.log10(1 + h.f) * 1.0;
  hits.sort((a, b) => score(a) - score(b));
  return hits[0];
}
module.exports={analyze,decomp,S,peels,radicals};
