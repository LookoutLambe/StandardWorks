#!/usr/bin/env node
// check_nikkud_conflation.js — the WITHIN-BUCKET cluster detector.
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
// Usage: node tools/check_nikkud_conflation.js [minClusterUses] [minFormUses]
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

const minCluster = parseInt(process.argv[2] || '25', 10);
const minForm = parseInt(process.argv[3] || '5', 10);
// Within each bucket, cluster forms by shared gloss content-stems. Two
// clusters with NO shared stems = two pointing-distinct lexemes sharing one
// card — the user's standing diagnosis: 'nikkud is not being respected'.
const flagged = [];
for (const [key, forms] of buckets) {
  if (key === 'H0853' || key === 'את') continue;
  const items = [];
  for (const [form, gl] of forms) {
    let uses = 0; for (const n of gl.values()) uses += n;
    if (uses < minForm) continue;
    const top = [...gl.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);
    const stems = new Set([].concat(...top.map(g => words(g).map(stem))));
    const funcOnly = top.every(g => rawWords(g).every(w => STOP.has(w) || FUNC.has(w)));
    if (!stems.size && !funcOnly) continue;
    items.push({ form, uses, stems, funcOnly, top });
  }
  if (items.length < 2) continue;
  // greedy clustering by stem overlap (func-only forms cluster together)
  const clusters = [];
  for (const it of items) {
    let home = null;
    for (const c of clusters) {
      if (it.funcOnly && c.funcOnly) { home = c; break; }
      if (!it.funcOnly && !c.funcOnly) {
        let share = false;
        for (const s of it.stems) if (c.stems.has(s)) { share = true; break; }
        if (share) { home = c; break; }
      }
    }
    if (home) {
      home.uses += it.uses; home.forms.push(it);
      for (const s of it.stems) home.stems.add(s);
    } else {
      clusters.push({ uses: it.uses, forms: [it], stems: new Set(it.stems), funcOnly: it.funcOnly });
    }
  }
  // merge pass: clusters can become linkable after absorbing stems
  let merged = true;
  while (merged) {
    merged = false;
    outer:
    for (let a = 0; a < clusters.length; a++) for (let b = a+1; b < clusters.length; b++) {
      if (clusters[a].funcOnly !== clusters[b].funcOnly) continue;
      if (!clusters[a].funcOnly) {
        let share = false;
        for (const s of clusters[a].stems) if (clusters[b].stems.has(s)) { share = true; break; }
        if (!share) continue;
      }
      for (const s of clusters[b].stems) clusters[a].stems.add(s);
      clusters[a].uses += clusters[b].uses;
      clusters[a].forms.push(...clusters[b].forms);
      clusters.splice(b,1); merged = true; break outer;
    }
  }
  const big = clusters.filter(c => c.uses >= minCluster);
  if (big.length < 2) continue;
  big.sort((a,b)=>b.uses-a.uses);
  flagged.push({ key, clusters: big, minorUses: big[1].uses });
}
flagged.sort((a,b)=>b.minorUses-a.minorUses);
console.log('%d buckets hold 2+ non-overlapping gloss clusters (clusters >= %d uses, forms >= %d):%s',
  flagged.length, minCluster, minForm, String.fromCharCode(10));
for (const f of flagged) {
  console.log('BUCKET %s', f.key);
  for (const c of f.clusters) {
    const rep = c.forms.sort((x,y)=>y.uses-x.uses).slice(0,3);
    console.log('   cluster %d uses%s :: %s', c.uses, c.funcOnly ? ' [FUNC]' : '',
      rep.map(r => r.form + ' (' + r.top.slice(0,2).join(' / ') + ')').join(' | '));
  }
  console.log('');
}
