// WHICH LETTER IS IN THE DAGESH — the assimilation inventory.
//
// A dagesh forte is not generic evidence of loss. Only specific letters
// assimilate, and several common dageshes are not a lost letter at all.
//
// ASSIMILATES INTO THE FOLLOWING CONSONANT:
//   נ   a nun closing a syllable (silent shva) assimilates.
//       I-nun verbs: נפל->יִפֹּל, נגד->יַגִּיד, נתן->יִתֵּן, נצל->יַצִּיל
//       also the preposition מִן: מִן+כל -> מִכָּל
//   נ   ROOT-FINAL nun of נתן assimilates into an afformative ת:
//       נתן+תי -> נָתַתִּי, נתן+ת -> נָתַתָּ
//   ל   ONLY in לקח: יִקַּח, קַח, תִּקַּח.  No other ל assimilates.
//   ת   the Hitpael ת assimilates into a following ד ט ז:
//       הִתְדַּמָּה -> הִדַּמָּה, הִתְטַמֵּא -> הִטַּמֵּא
//       (before a sibilant ס צ שׁ שׂ it METATHESISES instead: הִשְׁתַּמֵּר)
//   ה   the article's ה after ב כ ל: בְּ+הַ -> בַּ
//
// IS *NOT* A LOST LETTER (must never be read as assimilation):
//   the article הַ doubling the next consonant   (הַשָּׁמַיִם)
//   Piel / Pual / Hitpael doubling of R2         (דִּבֵּר, קִדֵּשׁ)
//   dagesh lene in בג"ד כפ"ת after a closed syllable
//
// CANNOT TAKE A DAGESH AT ALL — so nothing assimilates into them:
//   the gutturals א ה ח ע and (with rare exception) ר.
//   Hence I-nun verbs with a guttural R2 keep the nun: נחל -> יִנְחַל,
//   never *יִחַּל.  A "nun restore" before a guttural is therefore illegal.
const GUTTURAL=new Set(["א","ה","ח","ע","ר"]);
const HITPAEL_ASSIM=new Set(["ד","ט","ז"]);
const SIBILANT=new Set(["ס","צ","שׁ","שׂ","ש"]);

// Can this consonant host a dagesh forte at all?
const canDouble=c=>!GUTTURAL.has(c);

// Given the consonant that carries the dagesh and its position/context,
// return the candidate letters that could be hiding in it.
function swallowedBy(c,ctx){
  const out=[];
  if(!canDouble(c)) return out;               // gutturals: nothing can hide here
  if(ctx.articleDagesh) return out;           // הַ doubling: not a lost letter
  if(ctx.pielPosition)  return out;           // Piel R2 doubling: not a lost letter
  out.push({letter:"נ",cost:0.05});           // by far the commonest
  if(c==="ק") out.push({letter:"ל",cost:0.15});          // לקח only
  if(ctx.hitpael&&HITPAEL_ASSIM.has(c)) out.push({letter:"ת",cost:0.10});
  return out;
}
// root-final nun of נתן hiding in an afformative ת
const finalNunBeforeTav=(stem,flags)=>
  stem.length>=2 && stem[stem.length-1]==="ת" && flags[flags.length-1] && flags[flags.length-1].forte;

module.exports={GUTTURAL,HITPAEL_ASSIM,SIBILANT,canDouble,swallowedBy,finalNunBeforeTav};
