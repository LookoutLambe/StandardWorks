#!/usr/bin/env node
// check_root_meanings.js — the corroboration detector.
//
// The root cards draw on four layers that historically did not check each
// other: Strong's (homograph-prone surface lookup), BDB (etymological
// folding), the curated glossary, and the corpus's own per-verse glosses —
// plus Brauner's SHOROSHIM verb-root inventory, which was loaded by nothing.
// This tool makes them corroborate: for every concordance bucket it computes
// the meaning line EXACTLY the way root_scorecard.js rootDisplay() does, then
// asks whether that meaning shares even one content word with the corpus's own
// top glosses for the bucket. A card whose definition contradicts every gloss
// under it is the הֵם="abundance" / קִיּוּם="vomit" / חָם="father-in-law"
// signature. Bare keys are also validated against the shoroshim list.
//
// A hit is a CANDIDATE, never a verdict — read the bucket before touching
// anything (some meanings are legitimately received renderings the corpus
// words orbit rather than repeat). Fix confirmed hits in the single sources:
// root_engine.js (rootMap/_lexNoPeel pins), strongs_lookup.js (surface
// numbers), bom/roots_glossary.js (meanings) — then rerun
// tools/build_root_concordance.js.
//
// Usage: node tools/check_root_meanings.js [minUses]   (default 5)

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const win = {};
for (const f of ['strongs_lookup.js', 'strongs_roots.js', 'bdb_roots.js',
                 'root_names.js', 'shoroshim_roots.js', 'root_concordance.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { window: win }, { filename: f });
}
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'bom/roots_glossary.js'), 'utf8'), { window: win }, { filename: 'roots_glossary.js' });

const S = win._strongsRoots, gd = win._rootGlossaryData, rc = win._rootConcordance;
const shoroshim = new Set((win._shoroshimRoots || []).map(r => r.replace(/[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C7]/g, '')));
const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const strip = w => String(w || '').replace(/[֑-ׇ]/g, '').replace(/[ךםןףץ]/g, c => FIN[c]);

function strongsGloss(num) {
  const seen = {};
  while (num && S[num] && !seen[num]) {
    seen[num] = 1;
    if (S[num].g) return S[num].g;
    num = S[num].r || S[num].u;
  }
  return '';
}
// consonantal index, primitive roots first — mirrors root_scorecard.js
const consIdx = {};
for (const n in S) {
  const c = strip(S[n].w);
  if (!c) continue;
  const cur = consIdx[c];
  if (!cur) { consIdx[c] = n; continue; }
  if ((S[n].p && !S[cur].p) || (!!S[n].p === !!S[cur].p && S[n].g && !S[cur].g)) consIdx[c] = n;
}
const dematIdx = {};
for (const n in S) {
  const c = strip(S[n].w);
  if (!c) continue;
  const d = c.charAt(0) + c.slice(1).replace(/[וי]/g, '');
  if (d.length >= 3 && !dematIdx[d]) dematIdx[d] = consIdx[c] || n;
}
const keySet = new Set(rc.keys);

// A NAME'S MEANING IS ITS ENGLISH NAME — mirrors root_scorecard.js exactly
// (2026-09-12): a Strong's name entry with no curated row shows the capitalized
// word its own corpus glosses use most, when that word carries at least half of
// them; otherwise Strong's transliteration stands and this detector flags it.
function isNameEntry(e) {
  const x = String(e && e.x || '').replace(/^[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF]+/, ''), c = x.charAt(0);   // as root_engine.js familyOf: the first LETTER of the transliteration, past ʼ ʻ
  return !!c && c === c.toUpperCase() && c !== c.toLowerCase();
}
const NAME_STOP = /^(The|And|Of|To|Unto|In|Into|From|With|For|By|Upon|On|At|Against|Before|After|Over|Under|Through|Toward|Towards|Between|Among|Out|Son|Sons|Daughter|Daughters|Children|King|Kings|Queen|Land|House|Men|Man|People|City|Cities|River|Mount|Mountain|Wife|Brother|Brethren|Father|Fathers|Mother|God|Lord|LORD|O|Even|Also|All|But|That|Which|Who|Nor|Or|As|Like|Till|Until|His|Her|Their|My|Our|Your|Is|Was|Be|It|This|These|Those|Not|No|A|An|Now|Behold|Yea|Thus|So|Then|When|If|Because|Therefore|Wherefore|Every|Each|Some|Many|Other|Another|Same|Own|Great|Holy|Whole|Half|Both)$/;
function corpusName(key) {
  const i = rc.keys.indexOf(key);
  if (i < 0) return '';
  const g = rc.roots[i].g || {}, tally = {};
  let total = 0, best = '', bn = 0;
  for (const gl in g) {
    const n = g[gl]; total += n;
    const ws = gl.replace(/[^A-Za-z'\-]+/g, ' ').split(' ').filter(Boolean);
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k].replace(/^-+|-+$/g, '');
      if (w.length < 2 || !/^[A-Z]/.test(w) || NAME_STOP.test(w)) continue;
      tally[w] = (tally[w] || 0) + n;
      if (tally[w] > bn) { bn = tally[w]; best = w; }
      break;
    }
  }
  return (best && bn * 2 >= total) ? best : '';
}
function displayedMeaning(key) {
  // meaning line as rootDisplay() computes it
  if (/^H\d+$/.test(key) && S[key]) {
    let meaning = S[key].g || strongsGloss(S[key].r || S[key].u) || '';
    let cur = gd[key];
    if (!cur) {
      const cons = strip(S[key].w);
      if (!keySet.has(cons) && !isNameEntry(S[key])) cur = gd[cons];   // a bare-consonant row never leaks onto a name (mirrors rootDisplay)
    }
    if (cur && cur.meaning) meaning = cur.meaning;
    else if (isNameEntry(S[key])) { const cn = corpusName(key); if (cn) meaning = cn; }
    return meaning;
  }
  let cur = gd[key];
  if (cur && cur.meaning) return cur.meaning;
  const k = key.replace(/[ךםןףץ]/g, c => FIN[c]);
  let sNum = consIdx[k];
  if (!sNum) {
    const d = k.charAt(0) + k.slice(1).replace(/[וי]/g, '');
    if (d.length >= 3) sNum = dematIdx[d];
  }
  return sNum ? (S[sNum].g || strongsGloss(sNum)) : '';
}

const STOP = new Set(('the of a an and or in on to for by with unto upon from at is are was were be been ' +
  'he she it they them him her his my your thy thou thee ye i we us our will shall would may might have has ' +
  'had do does did not no nor so as that this these those there then than who whom whose which what when').split(' '));
const rawWords = s => String(s || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(w => w.length > 1);
const words = s => rawWords(s).filter(w => !STOP.has(w));
// irregulars + close pairs the 4-char stem misses
const EQ = { men: 'man', women: 'woman', children: 'child', seas: 'sea', heavens: 'heaven',
             sky: 'heaven', mine: 'my', goes: 'go', went: 'go', said: 'say', says: 'say', spoke: 'speak' };
const stem = w => { w = EQ[w] || w; return w.slice(0, Math.min(w.length, 4)); };

const minUses = parseInt(process.argv[2] || '5', 10);
const flagged = [];
rc.keys.forEach((key, ix) => {
  const r = rc.roots[ix];
  const uses = r.c.reduce((a, b) => a + b, 0);
  if (uses < minUses) return;
  const meaning = displayedMeaning(key);
  if (!meaning) return;
  let mw = words(meaning).map(stem);
  const glosses = Object.keys(r.g || {}).slice(0, 10);
  let gw = new Set([].concat(...glosses.map(g => words(g).map(stem))));
  if (!mw.length || !gw.size) {
    // a meaning made entirely of stopwords (that/which/to/them...) is a
    // grammatical word — compare unfiltered so particles corroborate
    mw = rawWords(meaning).map(stem);
    gw = new Set([].concat(...glosses.map(g => rawWords(g).map(stem))));
  }
  if (!mw.length || !gw.size) return;
  let overlap = mw.some(w => gw.has(w));
  if (!overlap) {
    // last chance for particles: unfiltered comparison
    const mw2 = rawWords(meaning).map(stem);
    const gw2 = new Set([].concat(...glosses.map(g => rawWords(g).map(stem))));
    overlap = mw2.some(w => gw2.has(w));
  }
  if (overlap) return;
  const bare = !/^H\d+$/.test(key);
  flagged.push({
    key, uses, meaning,
    glosses: glosses.slice(0, 5).join(' | '),
    realRoot: bare ? (shoroshim.has(key.replace(/[ךםןףץ]/g, c => FIN[c])) ? 'shoroshim:yes' : 'shoroshim:NO') : 'strongs-key'
  });
});
flagged.sort((a, b) => b.uses - a.uses);
console.log('%d buckets (>= %d uses) whose meaning line matches NONE of their corpus glosses:\n', flagged.length, minUses);
for (const f of flagged) {
  console.log('%s  uses=%d  [%s]\n    meaning: %s\n    corpus:  %s\n',
    f.key, f.uses, f.realRoot, f.meaning, f.glosses);
}
