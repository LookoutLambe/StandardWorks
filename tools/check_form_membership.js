#!/usr/bin/env node
// check_form_membership.js — the per-FORM corroboration detector.
//
// check_root_meanings.js asks whether a bucket's meaning line matches ANY of
// its corpus glosses — which goes blind exactly when a bucket has swallowed a
// second lexeme: מַיִם "water" (229 uses) sat inside the מִי "who" bucket and
// never flagged, because "who" IS the bucket's majority gloss. The user's
// rule: the corpus carries the English for every token, so the English tells
// you which root each FORM belongs to. This tool applies that per form: walk
// the six corpora the same way the concordance builder does, profile every
// pointed surface form's own glosses, and flag any form whose profile shares
// nothing with its bucket's meaning line. A flagged form is a CANDIDATE for a
// pointing-boundary split (_bdbSplit / rootMap pins in root_engine.js), never
// a verdict — homograph buckets with legitimate dual meanings will surface
// their minority member too; read the verses before splitting.
//
// Usage: node tools/check_form_membership.js [minBucketUses] [minFormUses]
//        (defaults 25 and 15)

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

// ---- engine + data stack (same load order as the builder) ----
const win = {};
for (const f of ['strongs_lookup.js', 'strongs_roots.js', 'bdb_roots.js',
                 'root_names.js', 'shoroshim_roots.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { window: win }, { filename: f });
}
const engineCtx = vm.createContext({ window: win, _strongsLookup: win._strongsLookup, _strongsRoots: win._strongsRoots });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'root_engine.js'), 'utf8'), engineCtx, { filename: 'root_engine.js' });
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'bom/roots_glossary.js'), 'utf8'), { window: win }, { filename: 'roots_glossary.js' });
const getRoots = win.RootEngine.getRoots;
const S = win._strongsRoots, gd = win._rootGlossaryData;

// ---- meaning line, exactly as root_scorecard.js rootDisplay() computes it ----
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
function displayedMeaning(key, keySet) {
  if (/^H\d+$/.test(key) && S[key]) {
    let meaning = S[key].g || strongsGloss(S[key].r || S[key].u) || '';
    let cur = gd[key];
    if (!cur) {
      const cons = strip(S[key].w);
      if (!keySet.has(cons)) cur = gd[cons];
    }
    if (cur && cur.meaning) meaning = cur.meaning;
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

// ---- walk the six corpora (same sandbox as build_root_concordance.js) ----
const VOLS = [
  { dir: 'ot_verses',  skip: [] },
  { dir: 'nt_verses',  skip: [] },
  { dir: 'bom/verses', skip: ['frontmatter.js'] },
  { dir: 'dc_verses',  skip: ['dc_intro.js', 'dc_chron.js'] },
  { dir: 'pgp_verses', skip: ['pgp_intro.js'] },
  { dir: 'jst_verses', skip: ['jst_intro.js'] }
];
const buckets = new Map();   // rootKey -> Map(form -> Map(gloss -> count))
const wordCache = new Map();
function record(h, g) {
  h = h.replace(/[׃\[\]]/g, '');
  if (!h.trim() || !g.trim()) return;
  let pairs = wordCache.get(h);
  if (pairs === undefined) { pairs = getRoots(h) || []; wordCache.set(h, pairs); }
  const gNorm = g.replace(/-/g, ' ').trim();
  for (const pr of pairs) {
    if (!pr.root) continue;
    let forms = buckets.get(pr.root);
    if (!forms) { forms = new Map(); buckets.set(pr.root, forms); }
    const form = pr.part || h;
    let gl = forms.get(form);
    if (!gl) { gl = new Map(); forms.set(form, gl); }
    gl.set(gNorm, (gl.get(gNorm) || 0) + 1);
  }
}
function makeAnything() {
  const fn = function() { return anything; };
  const anything = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'valueOf') return () => 0;
      if (k === 'toString') return () => '';
      return anything;
    },
    apply() { return anything; },
    construct() { return anything; },
    has() { return true; }
  });
  return anything;
}
for (const vol of VOLS) {
  const dir = path.join(ROOT, vol.dir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && vol.skip.indexOf(f) < 0).sort();
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const captured = [];
    const sandbox = new Proxy({
      renderVerseSet: function(data) { captured.push(data); }
    }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === Symbol.unscopables) return undefined;
        return makeAnything();
      },
      has() { return true; }
    });
    try { vm.runInNewContext(src, sandbox, { filename: vol.dir + '/' + f, timeout: 30000 }); }
    catch (err) { console.warn('  ! %s/%s: %s', vol.dir, f, err.message); }
    for (const data of captured) {
      if (!Array.isArray(data)) continue;
      for (const verse of data) {
        if (!verse || !Array.isArray(verse.words)) continue;
        for (const w of verse.words) {
          if (!Array.isArray(w) || w.length < 2 || w[0] === '׃') continue;
          record(String(w[0]), String(w[1]));
        }
      }
    }
  }
}

// ---- compare each form's gloss profile to its bucket's meaning line ----
const STOP = new Set(('the of a an and or in on to for by with unto upon from at is are was were be been ' +
  'he she it they them him her his my your thy thou thee ye i we us our will shall would may might have has ' +
  'had do does did not no nor so as that this these those there then than who whom whose which what when').split(' '));
const rawWords = s => String(s || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(w => w.length > 1);
const words = s => rawWords(s).filter(w => !STOP.has(w));
const EQ = { men: 'man', women: 'woman', children: 'child', seas: 'sea', heavens: 'heaven',
             sky: 'heaven', mine: 'my', goes: 'go', went: 'go', said: 'say', says: 'say', spoke: 'speak',
             whoso: 'who', whosoever: 'who', whoever: 'who', waters: 'water',
             // English irregular inflections — without these every הָיָה="was"
             // flags against "to be" and the list drowns in conjugation noise
             was: 'be', were: 'be', been: 'be', being: 'be', am: 'be', art: 'be',
             did: 'do', done: 'do', doeth: 'do', doth: 'do', made: 'make', maketh: 'make',
             hath: 'have', hast: 'have', gone: 'go', goeth: 'go', came: 'come', cometh: 'come',
             saw: 'see', seen: 'see', seeth: 'see', gave: 'give', given: 'give', giveth: 'give',
             took: 'take', taken: 'take', spake: 'speak', spoken: 'speak', knew: 'know', known: 'know',
             brought: 'bring', built: 'build', stood: 'stand', sat: 'sit', ate: 'eat', eaten: 'eat',
             drank: 'drink', slew: 'slay', slain: 'slay', dwelt: 'dwell', begat: 'beget',
             bare: 'bear', born: 'bear', borne: 'bear', sent: 'send', heard: 'hear',
             found: 'find', fell: 'fall', fallen: 'fall', rose: 'rise', risen: 'rise',
             fled: 'flee', sought: 'seek', caught: 'catch', bought: 'buy', fought: 'fight',
             told: 'tell', kept: 'keep', left: 'leave', laid: 'lay', lain: 'lie',
             smote: 'smite', smitten: 'smite', wrote: 'write', written: 'write',
             began: 'begin', begun: 'begin', dead: 'death', died: 'die', dying: 'die',
             brethren: 'brother', begot: 'beget', begotten: 'beget',
             cities: 'city', feet: 'foot', saying: 'say', beloved: 'love',
             oxen: 'ox', wives: 'wife', lives: 'life', could: 'can', cannot: 'can',
             himself: 'self', itself: 'self', themselves: 'self', thyself: 'self',
             myself: 'self', herself: 'self', yourselves: 'self', ourselves: 'self',
             on: 'upon', upward: 'above', chose: 'choose', chosen: 'choose',
             approached: 'near', wept: 'weep', asked: 'ask', labor: 'work', labour: 'work',
             sinned: 'sin', buried: 'bury', showed: 'show', shown: 'show', shewed: 'show',
             shew: 'show', mixed: 'mix', arose: 'rise', arisen: 'rise', coming: 'come',
             armies: 'army', ended: 'end', tenth: 'ten', tenths: 'ten',
             thought: 'think', thoughts: 'think', supposed: 'think', broke: 'break',
             broken: 'break', ran: 'run', cried: 'cry', cries: 'cry', tore: 'tear',
             torn: 'tear', rent: 'tear', arise: 'rise', sinner: 'sin', bound: 'bind',
             replying: 'answer', replied: 'answer', loaves: 'loaf', hid: 'hide' };
const stem = w => { w = EQ[w] || w;
  // EQ again after the plural strip so 'thoughts' still reaches 'think'
  // plural-blind: 'days' must meet 'day', 'kings' 'king' — strip one trailing
  // s (not 'ss') before truncating, applied to BOTH sides so it stays fair
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = EQ[w.slice(0, -1)] || w.slice(0, -1);
  return w.slice(0, Math.min(w.length, 4)); };
// A form whose glosses are ALL function words is a grammaticalized derivative
// (לִפְנֵי "before" under פנים "face", לָכֵן "therefore" under כן) — a correct
// filing whose received rendering just isn't the bucket's core meaning. Those
// are not swallowed lexemes; suppress them so content conflations stand out.
const FUNC = new Set(('as when even according inasmuch therefore wherefore before after because account sake ' +
  'presence sight behalf unto upon against toward towards among amongst beside besides within without through ' +
  'during until till concerning behold lo yea also moreover nevertheless notwithstanding howbeit whither thence ' +
  'hence thereof therein thereby wherein whereby whereof wherefore how why but if only except save more most very you me ' +
  'much many all any some none both each every again still yet now never ever always about over under between out ' +
  'up down away back forth off into onto here where else other another same such like both').split(' '));

const minBucket = parseInt(process.argv[2] || '25', 10);
const minForm = parseInt(process.argv[3] || '15', 10);
const keySet = new Set([...buckets.keys()].filter(k => !/^H\d+$/.test(k)));
const flagged = [];
for (const [key, forms] of buckets) {
  // The object marker's "meaning" can never match its glosses — every gloss
  // is the marked object. Correct by design (see check_root_meanings.js).
  if (key === 'H0853' || key === 'את') continue;
  let total = 0;
  for (const gl of forms.values()) for (const n of gl.values()) total += n;
  if (total < minBucket) continue;
  const meaning = displayedMeaning(key, keySet);
  if (!meaning) continue;
  const mw = new Set(words(meaning).map(stem));
  const mwRaw = new Set(rawWords(meaning).map(stem));
  if (!mwRaw.size) continue;
  for (const [form, gl] of forms) {
    let uses = 0;
    for (const n of gl.values()) uses += n;
    if (uses < minForm) continue;
    const top = [...gl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    const gw = new Set([].concat(...top.map(g => words(g).map(stem))));
    let hit = [...(mw.size ? mw : mwRaw)].some(w => gw.has(w));
    if (!hit) {
      // particles: unfiltered comparison before flagging
      const gwRaw = new Set([].concat(...top.map(g => rawWords(g).map(stem))));
      hit = [...mwRaw].some(w => gwRaw.has(w));
    }
    if (!hit) {
      // grammaticalized derivative? every content word in every top gloss is a
      // function word → correct filing, received rendering — not a conflation
      const contentless = top.every(g => rawWords(g).every(w => STOP.has(w) || FUNC.has(w)));
      if (contentless) continue;
      flagged.push({ key, form, uses, meaning, top: top.join(' | ') });
    }
  }
}
flagged.sort((a, b) => b.uses - a.uses);
console.log('%d forms (>= %d uses, buckets >= %d) whose own glosses match nothing in their bucket meaning:\n',
  flagged.length, minForm, minBucket);
for (const f of flagged) {
  console.log('%s  IN BUCKET %s  uses=%d\n    bucket meaning: %s\n    form glosses:   %s\n',
    f.form, f.key, f.uses, f.meaning, f.top);
}
