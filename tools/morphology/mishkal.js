// NOUN PATTERNS (mishkalim), the way Pealim files them.
// A pattern says which slots are RADICALS and which are the pattern's own
// letters, so matching one extracts the root instead of guessing at it.
// Written over the consonant skeleton: 1/2/3 are radicals, letters are literal.
const PATTERNS=[
  // participle / agent
  ["kotel",     "1 ו 2 3"],        // שׁוֹמֵר  guard      (Qal active participle)
  ["kotel-pl",  "1 ו 2 3 י מ"],    // שׁוֹמְרִים
  ["kotel-cs",  "1 ו 2 3 י"],      // שׁוֹמְרֵי־
  ["katul",     "1 2 ו 3"],        // שָׁמוּר  guarded    (passive participle)
  ["katul-pl",  "1 2 ו 3 י מ"],
  ["katil",     "1 2 י 3"],        // שָׁמִיר
  ["ktila",     "1 2 י 3 ה"],      // שְׁמִירָה
  ["ktila-cs",  "1 2 י 3 ת"],
  ["kittul",    "1 י 2 ו 3"],      // שִׁימּוּר
  ["miktal",    "מ 1 2 3"],        // מִשְׁמָר
  ["miktala",   "מ 1 2 3 ה"],
  ["miktelet",  "מ 1 2 3 ת"],      // מִשְׁמֶרֶת
  ["katlan",    "1 2 3 נ"],        // שַׁמְרָן
  ["katlani",   "1 2 3 נ י"],      // שַׁמְרָנִי
  ["taktil",    "ת 1 2 י 3"],      // תַּלְמִיד
  ["taktila",   "ת 1 2 3 ה"],      // תְּפִלָּה
  ["haktala",   "ה 1 2 3 ה"],      // הַבְטָחָה
  ["katla",     "1 2 3 ה"],      // שִׂמְחָה joy, טוֹבָה good
  ["katlat",    "1 2 3 ת"],      // שִׂמְחַת־ / שִׂמְחָתְ־ : feminine ה written ת
                                 // before a suffix or in construct
  ["katal",     "1 2 3"],          // דָּבָר — the bare skeleton, last resort
];
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const cons=w=>[...String(w)].filter(c=>/[א-ת]/.test(c)).map(c=>FIN[c]||c).join("");
function match(tpl,c){
  const toks=tpl.split(" ").filter(Boolean);
  if(toks.length!==c.length) return null;
  const R={};
  for(let i=0;i<toks.length;i++){
    const t=toks[i], ch=c[i];
    if(/^[123]$/.test(t)){ if(R[t]&&R[t]!==ch) return null; R[t]=ch; }
    else if(t!==ch) return null;
  }
  return (R["1"]&&R["2"]&&R["3"]) ? R["1"]+R["2"]+R["3"] : null;
}
// clitics that sit outside the pattern
// cons() folds the final letters (ך ם ן ף ץ), so these tables must be folded
// through the SAME function -- written with a final kaf, the 2ms possessive of
// שִׂמְחָתְךָ could never strip, so שִׂמְחָה + ךָ never reached the katlat
// pattern. This is the fourth table tonight that needed folding.
const _PROC=["","ו","ב","כ","ל","מ","ה","ש","וב","וכ","ול","ומ","וה","וש","לה","בה","כה","מה"];
const _ENCL=["","י","ו","ך","ה","ם","נ","נו","הו","הם","הן","כם","כן","יו","יה","יך","ים","ות","תי","ינו","יהם","יכם"];
const PROC=[...new Set(_PROC.map(cons))];
const ENCL=[...new Set(_ENCL.map(cons))];
function analyze(form,KNOWN,FREQ){
  const c0=cons(form);
  const hits=[];
  for(const p of PROC){
    if(p&&!c0.startsWith(p)) continue;
    const a=c0.slice(p.length);
    for(const e of ENCL){
      if(e&&!a.endsWith(e)) continue;
      const body=e?a.slice(0,-e.length):a;
      if(body.length<3||body.length>6) continue;
      for(const [name,tpl] of PATTERNS){
        const r=match(tpl,body);
        if(!r||!KNOWN.has(r)) continue;
        const f=FREQ.get(r)||0;
        // BUG 1: a root that never occurs is not the answer. radical.js already
        // refused these; mishkal.js did not, so לְהָטִיל matched katil and
        // returned הטל with frequency 0.
        if(f===0) continue;
        // BUG 3: ש as the relative pronoun is rare; ש as a first radical is
        // common. Peeling it turned שִׂמְחָתְךָ into מחתכ -> miktal -> חתכ.
        const cost=p.length+e.length+(p.indexOf("ש")>=0?2:0);
        hits.push({r,how:"mishkal:"+name,d:cost,f});
      }
    }
  }
  if(!hits.length) return null;
  // shallowest clitic peel first; then the more specific pattern (katal last)
  const rank=n=>n.endsWith("katal")?1:0;
  hits.sort((a,b)=> a.d!==b.d ? a.d-b.d : (rank(a.how)!==rank(b.how) ? rank(a.how)-rank(b.how) : b.f-a.f));
  return hits[0];
}
module.exports={analyze,PATTERNS,cons};
