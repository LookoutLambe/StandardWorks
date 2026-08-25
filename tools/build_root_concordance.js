#!/usr/bin/env node
/**
 * build_root_concordance.js — generates root_concordance.js, the cross-volume
 * scorecard index for the word popup on all six scripture pages.
 *
 * Why this exists: each page used to count roots only from its own loaded
 * verse data (the BOM lazy-loads one book at a time, so counts were per-book;
 * the OT counted only the OT, etc.) and the root key drifted depending on
 * whether Strong's data had loaded yet. This script computes ONE canonical
 * root per surface form — with Strong's always loaded, using the exact
 * getRoot/stripPrefixes/extractRoot/rootMap code from bom/bom.html (extracted
 * at run time so it can never drift) — and counts across every volume.
 *
 * Output: root_concordance.js  →  window._rootConcordance = {
 *   v: <build version>,
 *   vols: ['ot','nt','bom','dc','pgp','jst'],
 *   keys: [rootKey…],                 // H-numbers or consonantal stems
 *   words: { surface → keyIndex },    // sof-pasuq-stripped surface forms
 *   roots: [ per keys index: {
 *     c:  [count per volume],
 *     vc: [verse count per volume],
 *     f:  { form: count } (top),      // most frequent surface forms
 *     g:  { gloss: count } (top),     // most frequent glosses (this site's own)
 *     r:  { vol: { chapId: [verseNums…] } }   // full references
 *   } ],
 *   books: { vol: [{p:'gen-ch', n:'Genesis'}…] }  // chapId prefix → display name
 * }
 *
 * Run: node tools/build_root_concordance.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ---------- 1. Load Strong's data ----------
const win = {};
function evalIntoWindow(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInNewContext(src, { window: win }, { filename: file });
}
evalIntoWindow('strongs_lookup.js');
evalIntoWindow('strongs_roots.js');
if (!win._strongsLookup || !win._strongsRoots) throw new Error('Strong\'s data failed to load');
console.log('Strong\'s: %d forms, %d entries', Object.keys(win._strongsLookup).length, Object.keys(win._strongsRoots).length);

// ---------- 2. Extract the canonical root engine from bom/bom.html ----------
const bomHtml = fs.readFileSync(path.join(ROOT, 'bom/bom.html'), 'utf8');
const engStart = bomHtml.indexOf('function stripPrefixes(w) {');
const engEnd = bomHtml.indexOf('/** Top glosses actually used', engStart);
if (engStart < 0 || engEnd < 0) throw new Error('root engine block not found in bom/bom.html');
const engineSrc = bomHtml.slice(engStart, engEnd);
for (const needle of ['var rootMap', 'function stripNikkud', 'function extractRoot', 'function getRoot']) {
  if (engineSrc.indexOf(needle) < 0) throw new Error('engine block missing ' + needle);
}
const engineCtx = { window: win, _strongsLookup: win._strongsLookup, _strongsRoots: win._strongsRoots };
vm.createContext(engineCtx);
vm.runInContext(engineSrc + '\nthis.getRoot = getRoot; this.stripNikkud = stripNikkud;', engineCtx, { filename: 'bom.html<engine>' });
const getRoot = engineCtx.getRoot;
if (getRoot('שָׁלוֹם') !== (win._strongsLookup['שָׁלוֹם'] || 'שׁלם')) console.log('note: shalom →', getRoot('שָׁלוֹם'));

// ---------- 3. Walk the six corpora ----------
const VOLS = [
  { key: 'ot',  dir: 'ot_verses',  skip: [] },
  { key: 'nt',  dir: 'nt_verses',  skip: [] },
  { key: 'bom', dir: 'bom/verses', skip: ['frontmatter.js'] },
  { key: 'dc',  dir: 'dc_verses',  skip: ['dc_intro.js', 'dc_chron.js'] },
  { key: 'pgp', dir: 'pgp_verses', skip: ['pgp_intro.js'] },
  { key: 'jst', dir: 'jst_verses', skip: ['jst_intro.js'] }
];
const NVOL = VOLS.length;

const roots = new Map();  // rootKey -> { c:[], verses:[Set], f:Map, g:Map, refs:[Map(chapId->Set(v))] }
const words = new Map();  // surface -> rootKey
let totalTokens = 0;

function record(volIdx, chapId, verseNum, h, g) {
  // Strip sof pasuq and the OT's ketiv/qere brackets — [לֹא] keys as לֹא.
  // The brackets stay in the DISPLAY; they must never reach the root key.
  h = h.replace(/[׃\[\]]/g, '');
  if (!h.trim() || !g.trim()) return;
  totalTokens++;
  let root = words.get(h);
  if (root === undefined) { root = getRoot(h); words.set(h, root); }
  let e = roots.get(root);
  if (!e) {
    e = { c: new Array(NVOL).fill(0), verses: Array.from({length: NVOL}, () => new Set()),
          f: new Map(), g: new Map(), refs: Array.from({length: NVOL}, () => new Map()) };
    roots.set(root, e);
  }
  e.c[volIdx]++;
  e.verses[volIdx].add(chapId + '|' + verseNum);
  e.f.set(h, (e.f.get(h) || 0) + 1);
  const gNorm = g.replace(/-/g, ' ').trim();
  e.g.set(gNorm, (e.g.get(gNorm) || 0) + 1);
  let chMap = e.refs[volIdx];
  let vs = chMap.get(chapId);
  if (!vs) { vs = new Set(); chMap.set(chapId, vs); }
  vs.add(verseNum);
}

VOLS.forEach(function(vol, volIdx) {
  const dir = path.join(ROOT, vol.dir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && vol.skip.indexOf(f) < 0).sort();
  let volTokens = 0, volChapters = 0;
  files.forEach(function(f) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const captured = [];
    // Sandbox: capture renderVerseSet calls; swallow everything else the file
    // touches (document.getElementById(...), window.*, renderWords, ...) with a
    // callable proxy that absorbs any call or property access.
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
    const sandbox = new Proxy({
      renderVerseSet: function(data, containerId) { captured.push([data, containerId]); }
    }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === Symbol.unscopables) return undefined;
        return makeAnything();
      },
      has() { return true; }
    });
    try {
      vm.runInNewContext(src, sandbox, { filename: vol.dir + '/' + f, timeout: 30000 });
    } catch (err) {
      console.warn('  ! %s/%s: %s', vol.dir, f, err.message);
    }
    captured.forEach(function(pair) {
      const data = pair[0], containerId = String(pair[1] || '');
      if (!Array.isArray(data)) return;
      const chapId = containerId.replace(/-verses$/, '').replace(/-colophon$/, '');
      if (!chapId) return;
      volChapters++;
      data.forEach(function(verse, vi) {
        if (!verse || !Array.isArray(verse.words)) return;
        verse.words.forEach(function(w) {
          if (!Array.isArray(w) || w.length < 2) return;
          if (w[0] === '׃') return;
          record(volIdx, chapId, vi + 1, String(w[0]), String(w[1]));
          volTokens++;
        });
      });
    });
  });
  console.log('%s: %d files, %d chapters, %d tokens', vol.key, files.length, volChapters, volTokens);
});
console.log('TOTAL counted tokens: %d — %d distinct forms, %d roots', totalTokens, words.size, roots.size);

// ---------- 4. Harvest book display-name tables from the pages ----------
function harvestBooks(file, re, map) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(map(m));
  return out;
}
const books = {
  ot:  harvestBooks('ot.html',  /\{prefix:'([a-z0-9]+)', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] })),
  nt:  harvestBooks('nt.html',  /\{prefix:'([a-z0-9]+)', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] })),
  bom: harvestBooks('bom/bom.html', /\{ prefix: '([a-z0-9-]+)', name: '([^']+)'/g, m => ({ p: m[1], n: m[2] })),
  dc:  [],   // dcN-ch1 → 'D&C N', odN-ch1 → 'OD N' — handled by pattern in the UI
  pgp: harvestBooks('pgp.html', /\{prefix:'([a-z0-9]+)-ch', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] })),
  jst: harvestBooks('jst.html', /\{prefix:'([a-z0-9]+)-ch', en:'JST ?([^']+)'/g, m => ({ p: m[1] + '-ch', n: 'JST ' + m[2] }))
};
if (!books.jst.length) books.jst = harvestBooks('jst.html', /\{prefix:'([a-z0-9]+)-ch', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] }));
// BOM 1 Nephi uses bare chNN — ensure its entry exists and sort longest-prefix-first for matching
if (!books.bom.some(b => b.p === 'ch')) books.bom.unshift({ p: 'ch', n: '1 Nephi' });
Object.keys(books).forEach(k => books[k].sort((a, b) => b.p.length - a.p.length));
console.log('books harvested: ot=%d nt=%d bom=%d pgp=%d jst=%d', books.ot.length, books.nt.length, books.bom.length, books.pgp.length, books.jst.length);

// ---------- 5. Emit ----------
function topEntries(map, n) {
  const obj = {};
  Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n)
    .forEach(pair => { obj[pair[0]] = pair[1]; });
  return obj;
}
const REF_CAP = 800;   // roots with more total uses get per-book counts instead of verse refs
function bookPrefixFor(volKey, chapId) {
  if (volKey === 'dc') return chapId.indexOf('od') === 0 ? 'od' : 'dc';
  const list = books[volKey] || [];
  for (let i = 0; i < list.length; i++) {
    if (chapId.indexOf(list[i].p) === 0) return list[i].p;
  }
  return chapId.replace(/-?ch\d+$/, '') || chapId;
}
const keys = Array.from(roots.keys());
const refsOut = [];   // parallel to keys; shipped in root_concordance_refs.js
const keyIdx = new Map(keys.map((k, i) => [k, i]));
const rootsOut = keys.map(function(k) {
  const e = roots.get(k);
  const total = e.c.reduce((a, b) => a + b, 0);
  const out = {
    c: e.c,
    vc: e.verses.map(s => s.size),
    f: topEntries(e.f, 6),
    g: topEntries(e.g, 10)
  };
  if (total <= REF_CAP) {
    const refs = {};
    VOLS.forEach(function(vol, vi) {
      if (!e.refs[vi].size) return;
      const chObj = {};
      Array.from(e.refs[vi].entries()).forEach(function(pair) {
        chObj[pair[0]] = Array.from(pair[1]).sort((a, b) => a - b);
      });
      refs[vol.key] = chObj;
    });
    refsOut.push(refs);
  } else {
    const rb = {};
    VOLS.forEach(function(vol, vi) {
      if (!e.refs[vi].size) return;
      const bObj = {};
      Array.from(e.refs[vi].entries()).forEach(function(pair) {
        const bp = bookPrefixFor(vol.key, pair[0]);
        bObj[bp] = (bObj[bp] || 0) + pair[1].size;
      });
      rb[vol.key] = bObj;
    });
    refsOut.push({ _b: rb });   // book-level verse counts for very common roots
  }
  return out;
});
// The surface->root map is NOT shipped (it would be ~3MB). Pages compute the
// root with root_engine.js -- the same code extracted below -- after ensuring
// Strong's data is loaded, which reproduces these keys exactly.
const payload = {
  v: 1,
  built: new Date().toISOString().slice(0, 10),
  vols: VOLS.map(v => v.key),
  volNames: { ot: 'Tanakh', nt: 'New Testament', bom: 'Book of Mormon', dc: 'D&C', pgp: 'Pearl of Great Price', jst: 'JST' },
  keys: keys,
  roots: rootsOut,
  books: books
};
const js = '// root_concordance.js — auto-generated by tools/build_root_concordance.js. DO NOT EDIT.\n' +
  '// Cross-volume root scorecard index: canonical root -> counts, top forms and\n' +
  '// glosses across OT, NT, BOM, D&C, PGP and JST. Verse references live in\n' +
  '// root_concordance_refs.js (loaded only when the references panel opens).\n' +
  'window._rootConcordance = ' + JSON.stringify(payload) + ';\n';
fs.writeFileSync(path.join(ROOT, 'root_concordance.js'), js);
console.log('root_concordance.js written: %s MB (%d roots)', (js.length / 1048576).toFixed(2), keys.length);

const refsJs = '// root_concordance_refs.js — auto-generated by tools/build_root_concordance.js. DO NOT EDIT.\n' +
  '// Verse references per root (parallel to _rootConcordance.keys). Entries with _b\n' +
  '// carry per-book verse counts instead (roots too common to list verse by verse).\n' +
  'window._rootConcordanceRefs = ' + JSON.stringify(refsOut) + ';\n';
fs.writeFileSync(path.join(ROOT, 'root_concordance_refs.js'), refsJs);
console.log('root_concordance_refs.js written: %s MB', (refsJs.length / 1048576).toFixed(2));

// ---------- 6. Emit root_engine.js (the same canonical block, for the pages) ----------
const engineJs = '// root_engine.js — auto-generated by tools/build_root_concordance.js from the\n' +
  '// canonical block in bom/bom.html. DO NOT EDIT — edit bom/bom.html and re-run.\n' +
  '// Exposes window.RootEngine.getRoot(hw): the SAME root key the concordance was\n' +
  '// built with, provided Strong\'s data (window._strongsLookup/_strongsRoots) is loaded.\n' +
  '(function() {\n' + engineSrc + '\n' +
  '  window.RootEngine = { getRoot: getRoot, stripPrefixes: stripPrefixes, stripNikkud: stripNikkud, toSofit: toSofit };\n' +
  '})();\n';
fs.writeFileSync(path.join(ROOT, 'root_engine.js'), engineJs);
console.log('root_engine.js written: %d KB', Math.round(engineJs.length / 1024));

// Sanity samples
['וּמֶמְשָׁלָה', 'שָׁלוֹם', 'חֶסֶד', 'וְהַמִּלְחָמוֹת'].forEach(function(w) {
  const idx = keyIdx.get(getRoot(w));
  if (idx === undefined) { console.log('sample %s: NOT FOUND', w); return; }
  const r = rootsOut[idx];
  console.log('sample %s → %s: counts=%j verses=%j refs=%s', w, keys[idx], r.c, r.vc, refsOut[idx]._b ? 'book-level' : 'verse-level');
});
