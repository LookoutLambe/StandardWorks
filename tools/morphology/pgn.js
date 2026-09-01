// PERSON / GENDER / NUMBER paradigm.
// The preformative and the afformative are a PAIR, not independent affixes:
// תִּ־…־ִי is 2fs, יִ־…־וּ is 3mp, תִּ־…־נָה is 2/3fp. Stripping them as an
// unordered bag lets a form match combinations the paradigm never produces.
// Written over the consonant skeleton, finals folded.
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const cons=w=>[...String(w)].filter(c=>/[א-ת]/.test(c)).map(c=>FIN[c]||c).join("");
// [conjugation, preformative, afformative, label]
const PGN=[
  // Qatal — afformative only
  ["qatal","","",      "3ms"], ["qatal","","ה",   "3fs"],
  ["qatal","","ת",     "2ms"], ["qatal","","תי",  "1cs"],
  ["qatal","","נו",    "1cp"], ["qatal","","ו",   "3cp"],
  ["qatal","","תמ",    "2mp"], ["qatal","","תנ",  "2fp"],
  // Yiqtol — preformative, sometimes with an afformative
  ["yiqtol","י","",    "3ms"], ["yiqtol","ת","",  "3fs/2ms"],
  ["yiqtol","א","",    "1cs"], ["yiqtol","נ","",  "1cp"],
  ["yiqtol","ת","י",   "2fs"], ["yiqtol","י","ו", "3mp"],
  ["yiqtol","ת","ו",   "2mp"], ["yiqtol","ת","נה","2/3fp"],
  ["yiqtol","י","נה",  "3fp"],
  // Imperative — afformative only, no preformative
  ["imperative","","",  "ms"], ["imperative","","י","fs"],
  ["imperative","","ו", "mp"], ["imperative","","נה","fp"],
  // Participle
  ["participle","","",   "ms"], ["participle","","ת","fs"],
  ["participle","","ה",  "fs"], ["participle","","ימ","mp"],
  ["participle","","ות", "fp"],
];
// pronominal object/possessive suffixes sit OUTSIDE the pgn afformative
const OBJ=["","ני","נו","ו","הו","ה","ה","כ","כמ","כנ","מ","נ","המ","הנ","יו","יה","יכ","ינו","ימ","יהמ","יכמ","ננו","ננה","נני","נכ"];  // energic: ־ֶנּוּ ־ֶנָּה ־ֶנִּי ־ֶךָּ (נִתְּנֶנּוּ אֶתְּנֶנָּה)
// proclitics: משה וכלב
const PRO=["","ו","ב","כ","ל","מ","ה","ש","וב","וכ","ול","ומ","וה","וש","ולה","וה"];
// waw-consecutive is a proclitic ו plus the yiqtol preformative
function* parses(form){
  const c=cons(form);
  for(const p of PRO){
    if(p&&!c.startsWith(p)) continue;
    const a=c.slice(p.length);
    for(const o of OBJ){
      if(o&&!a.endsWith(o)) continue;
      const b=o?a.slice(0,-o.length):a;
      for(const [conj,pre,af,lab] of PGN){
        if(pre&&!b.startsWith(pre)) continue;
        if(af&&!b.endsWith(af)) continue;
        const stem=b.slice(pre.length, af?b.length-af.length:b.length);
        if(stem.length<2||stem.length>4) continue;
        yield {stem,conj,pre,af,lab,pro:p,obj:o,
               depth:p.length+o.length+pre.length+af.length};
      }
    }
  }
}
module.exports={parses,cons,PGN};
