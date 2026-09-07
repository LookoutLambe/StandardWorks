/* tools/check_glossary_meanings.js
 *
 * The italic line under "Root X — N uses" on the word card comes from
 * bom/roots_glossary.js, which is largely auto-derived and was full of junk:
 * inflected surface forms sitting where a root meaning belongs, and one
 * token's gloss copied into the slot for the whole family.
 *
 * THE TEST: a root's meaning must share a content word with that root's own
 * top glosses in root_concordance.js (or with Strong's gloss for a
 * consonant-matching lemma, or with the family's Strong's sub-entry glosses).
 *
 * This had been rebuilt from scratch twice because it lived in a scratchpad.
 * It lives here now. Run it with no arguments:
 *
 *     node tools/check_glossary_meanings.js
 *
 * IT OVER-REPORTS IF YOU LOOSEN ANY OF THESE — each was a real false-positive
 * class, and together they were most of the raw list:
 *   · "one", "all", "no", "every" and the numerals are CONTENT in a gloss, not
 *     stopwords (אֶחָד "one, a single" vs a top gloss of "one")
 *   · the corpus's English is KJV-register, so -eth/-est come off first, and
 *     the irregulars (led/lead, saith/say, spake/speak) need a table
 *   · never stem below three characters — "led" was becoming "l"
 *   · the personal pronouns are exempt from the "starts with a pronoun" shape
 *     rule: for them that IS the meaning (הוא "he, it, that one", 4,089 uses)
 *   · a parenthetical-only meaning is a grammatical label, not a gloss
 *
 * Rulings the translator has made are in tools/glossary_ruled.json and are
 * skipped, so a ruling never has to be made twice.
 *
 * THE SETTLED RULE FOR FIXING: delete rather than guess. A blank line beats a
 * false one, and the card still shows Forms and Glossed underneath. Blanking
 * is safe — rootDisplay only overrides with `if (cur && cur.meaning)`.
 */
const fs=require('fs'),vm=require('vm');
const c={window:{},console};c.window=c;vm.createContext(c);
for(const f of ['bom/roots_glossary.js','root_concordance.js','strongs_roots.js']) vm.runInContext(fs.readFileSync(f,'utf8'),c);
const G=c._rootGlossaryData, RC=c._rootConcordance, SR=c._strongsRoots;
const idx={}; RC.keys.forEach((k,i)=>idx[k]=RC.roots[i]);
/* Function words only. "one", "all", "no", "every" and the numerals were in
   here and are CONTENT in a gloss — stopping them made אֶחָד "one, a single"
   fail against a top gloss of "one", and H3606 "all, every" fail against
   "for all". That was most of the false positives. */
const STOP=new Set(('the a an of and or to in for on from by with that which who whom whose is was were be been being am are it its his her their our your my thy thee thou ye you he she they them him us we this these those there then when where as at into unto upon shall will did do doth done hath have has had shalt'.split(' ')));
const words=s=>String(s||'').toLowerCase().replace(/[^a-z\s'-]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
/* Crude suffix stripping missed breathe/breath and declare/declaring, which
   are plainly the same word. Strip a trailing 'e' too, and compare on a
   4-character prefix when both words are long enough. */
/* THE CORPUS'S ENGLISH IS KJV-REGISTER. leadeth/doeth/saith/giveth/cometh are
   the same verbs as lead/do/say/give/come, so -eth and -est must come off
   before anything is compared — otherwise every root glossed in the archaic
   form fails against a modern meaning. (The translator caught this on יוביל
   "led" vs "leadeth".) -eth first, then the ordinary suffixes. */
/* Never strip below three characters: "led" was losing its "ed" and becoming
   "l", which could not match anything. */
const cut=(w,re)=>{const t=w.replace(re,''); return t.length>=3?t:w;};
const stem=w=>cut(cut(cut(w,/(eth|est)$/),/(ings|ing|ies|ied|es|ed|s)$/),/e$/);
/* English irregulars a suffix stripper cannot reach. The corpus is KJV-register
   and uses them freely, so led/lead, saith/say, went/go would each read as a
   disagreement with a modern meaning. */
const IRREG={led:'lead',saith:'say',said:'say',went:'go',gone:'go',came:'come',saw:'see',
             seen:'see',knew:'know',known:'know',gave:'give',given:'give',took:'take',
             taken:'take',made:'make',held:'hold',told:'tell',brought:'bring',
             wrought:'work',begat:'beget',slew:'slay',smote:'smite',spake:'speak',
             spoken:'speak',written:'write',wrote:'write',fell:'fall',fallen:'fall'};
const norm=w=>IRREG[w]||w;
const near=(a,b)=>a===b || (a.length>=4&&b.length>=4&&(a.startsWith(b)||b.startsWith(a)));
const cons=s=>String(s||'').replace(/[֑-ׇ]/g,'').replace(/[^א-ת]/g,'');
const nf=s=>s.replace(/ך/g,'כ').replace(/ם/g,'מ').replace(/ן/g,'נ').replace(/ף/g,'פ').replace(/ץ/g,'צ');
// lemma consonants -> strongs gloss
const byCons={};
for(const n in SR){const e=SR[n]; if(!e||!e.w)continue; const k=nf(cons(e.w)); (byCons[k]=byCons[k]||[]).push(e.g||'');}

/* Entries the translator has personally ruled correct. Kept in the repo so a
   ruling never has to be made twice. */
const RULED=(()=>{try{return Object.keys(JSON.parse(fs.readFileSync('tools/glossary_ruled.json','utf8')).correct_as_written||{})}catch(e){return []}})();
const RULEDSET=new Set(RULED);
const PRON=new Set(['הוא','היא','המ','הנ','אני','אנכי','אנחנו','אתה','את','אתמ','אתנ','אנו']);
const rows=[];
for(const key of Object.keys(G)){
  const entry=G[key]; const meaning=(entry&&entry.meaning)||''; if(!meaning) continue;
  const root=idx[key]; if(!root) continue;                       // must reach a card
  /* The personal pronouns are a closed class pinned to their own families, and
     for them a meaning that STARTS with a pronoun is the correct meaning, not
     a token gloss copied into the slot: הוא really is "he, it, that one". */
  if(PRON.has(nf(cons(key)))) continue;
  if(RULEDSET.has(key)) continue;                                // translator has ruled
  if(/;/.test(meaning)) continue;                                // curated multi-sense
  if(/[֑-ׇ]/.test(meaning)) continue;                  // carries pointed Hebrew
  if(/^to\s/i.test(meaning)) continue;                           // verb citation form
  const mw=new Set(words(meaning).map(w=>stem(norm(w))));
  if(!mw.size) continue;
  const gw=new Set();
  for(const g of Object.keys(root.g||{})) words(g).map(w=>stem(norm(w))).forEach(w=>gw.add(w));
  for(const g of (byCons[nf(cons(key))]||[])) words(g).map(w=>stem(norm(w))).forEach(w=>gw.add(w));
  for(const sk of Object.keys(root.s||{})){ const se=root.s[sk];
    words(se.g).map(w=>stem(norm(w))).forEach(w=>gw.add(w));
    for(const gg of Object.keys(se.gs||{})) words(gg).map(w=>stem(norm(w))).forEach(w=>gw.add(w)); }
  let shared=false;
  outer: for(const w of mw){ for(const v of gw) if(near(w,v)) {shared=true;break outer;} }
  if(shared) continue;
  const traffic=(root.c||[]).reduce((a,b)=>a+b,0);
  const topG=Object.entries(root.g||{}).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  // the three shapes that need no judgement call
  let shape='';
  if(/\sof$/i.test(meaning.trim())) shape='construct (ends " of")';
  else if(/\((f|m|pl|s|fpl|mpl|sg)\)/i.test(meaning)) shape='inflection tag';
  else if(/^(his|her|its|their|our|my|your|thy|he|she|they|it|we|i|is|was|were|are|am|be|been|has|have|had|will|shall|did|do)\b/i.test(meaning.trim())) shape='pronoun/auxiliary';
  rows.push({key, meaning, traffic, topG, shape, cat:(entry.category||'')});
}
rows.sort((a,b)=>b.traffic-a.traffic);
console.log('glossary rows reaching a live root: '+Object.keys(G).filter(k=>idx[k]).length);
console.log('FAILING the corroboration test: '+rows.length);
const del=rows.filter(r=>r.shape), judge=rows.filter(r=>!r.shape);
console.log('  structurally impossible (delete, no judgement): '+del.length);
console.log('  need a judgement call: '+judge.length);
fs.writeFileSync('/tmp/glossary_meaning_failures.json', JSON.stringify(rows,null,1));
console.log('\n── STRUCTURALLY IMPOSSIBLE ('+del.length+') ──');
del.slice(0,40).forEach(r=>console.log('  '+String(r.traffic).padStart(5)+'  '+r.key.padEnd(10)+' "'+r.meaning.slice(0,44)+'"   ['+r.shape+']  top: '+r.topG.slice(0,3).join(' / ')));
console.log('\n── NEED A CALL, by traffic ('+judge.length+') ──');
judge.slice(0,30).forEach(r=>console.log('  '+String(r.traffic).padStart(5)+'  '+r.key.padEnd(10)+' "'+r.meaning.slice(0,42)+'"   top: '+r.topG.slice(0,3).join(' / ')));
