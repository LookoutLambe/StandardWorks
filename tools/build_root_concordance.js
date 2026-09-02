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
 * getRoot/stripPrefixes/extractRoot/rootMap code from root_engine.js (the
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
evalIntoWindow('bdb_roots.js');
evalIntoWindow('shoroshim_roots.js');  // Brauner validation set for the engine's morphology gate   // BDB root per Strong's number; baseRoot prefers it
if (!win._strongsLookup || !win._strongsRoots) throw new Error('Strong\'s data failed to load');
console.log('Strong\'s: %d forms, %d entries', Object.keys(win._strongsLookup).length, Object.keys(win._strongsRoots).length);

// ---------- 2. Load the canonical root engine (root_engine.js — the single source) ----------
const engineSrc = fs.readFileSync(path.join(ROOT, 'root_engine.js'), 'utf8');
const engineCtx = { window: win, _strongsLookup: win._strongsLookup, _strongsRoots: win._strongsRoots };
vm.createContext(engineCtx);
vm.runInContext(engineSrc, engineCtx, { filename: 'root_engine.js' });
if (!win.RootEngine || !win.RootEngine.getRoot) throw new Error('root_engine.js did not export RootEngine');
const getRoot = win.RootEngine.getRoot;
const getRoots = win.RootEngine.getRoots;

// The transliterated-term exception table lives in root_scorecard.js on one
// JSON line (TRANSLIT_TERMS); read it from the source so the two never drift.
const TRANSLIT_TERMS = (() => {
  const m = fs.readFileSync(path.join(ROOT, 'root_scorecard.js'), 'utf8').match(/var TRANSLIT_TERMS = (\{[^\n]*\});/);
  if (!m) throw new Error('root_scorecard.js: TRANSLIT_TERMS line not found');
  return JSON.parse(m[1]);
})();
const ttSkel = s => String(s || '').replace(/[\u0591-\u05C7]/g, '').replace(/[\u05C3\[\]"'`.,;:?!()*]/g, '');
const ttKey = p => TRANSLIT_TERMS[p] ? p : (/^[\u05D1\u05DB\u05DC\u05DE\u05D5\u05D4\u05E9]/.test(p) && TRANSLIT_TERMS[p.slice(1)] ? p.slice(1) : '');
// Mirrors RootScorecard.translitTermParts: a maqqef chain whose JOINED
// consonants are a term (אָדָם־אוֹנְדִי־אַהְמָן) is the term whole — testing its
// parts one by one would pass אָדָם as ordinary Hebrew and file the whole form
// under אדם.
const translitTermParts = surface => {
  const raw = String(surface || '').replace(/[\u05C3\[\]*]/g, '').split(/[\u05BE\s]+/).filter(Boolean);
  if (raw.length > 1 && ttKey(ttSkel(raw.join('')))) return { all: true, parts: raw };
  const parts = raw.filter(p => !!ttKey(ttSkel(p)));
  return { all: raw.length > 0 && parts.length === raw.length, parts };
};
const isTranslitTerm = surface => translitTermParts(surface).parts.length > 0;

// ---------- 2b. Pass 1: attested standalone word-forms ----------
// The engine strips a prefix from a non-Strong's word ONLY when what remains is
// itself a word this corpus actually uses standalone. Without this, הוֹרְדוֹס
// (Herod) would be filed under "ורדוס".
{
  const SKEL = s => String(s||'').replace(/[\u0591-\u05C7]/g,'').replace(/[\u05C3\u05C0"'`]/g,'').trim();
  const forms = Object.create(null);
  const TOKRE = /\[\s*"([^"]*)"\s*,\s*"/g;
  const walk = dir => { let ents = []; try { ents = fs.readdirSync(path.join(ROOT, dir)); } catch (e) { return; }
    for (const f of ents) { if (!/\.js$/.test(f)) continue;
      const t = fs.readFileSync(path.join(ROOT, dir, f), 'utf8'); let m; TOKRE.lastIndex = 0;
      while ((m = TOKRE.exec(t))) { const w = m[1];
        if (!/[\u05D0-\u05EA]/.test(w)) continue;
        if (isTranslitTerm(w)) continue;   // not Hebrew: never an attested standalone form
        const parts = SKEL(w).split(/[\u05BE\s]+/).filter(Boolean);
        if (parts.length === 1) forms[parts[0]] = 1; } } };
  ['ot_verses','nt_verses','dc_verses','pgp_verses','bom'].forEach(walk);
  win._rootWordForms = forms;

  // Tokens the corpus itself glosses as a proper name. The morphology step must
  // not peel these: מוֹרוֹנִי would otherwise reduce to מור, a real root, and
  // Moroni would be filed under "to change".
  // The gloss must BE a name, not merely end in one. Taking the last word made
  // "the God of Israel" mark אֱלֹהִים as a name and "the land of Egypt" mark
  // אֶרֶץ, which then blocked both from Strong's and sent אֱלֹהִים to H0193 אוּל.
  // A leading particle is allowed ("upon Laman", "and Nephi"); nothing else.
  const LEAD = new Set(['the','and','to','unto','of','from','in','into','upon','on',
    'for','with','by','at','even','yea','o','a','an','before','against','over','after']);
  const nameWordOf = g => {
    const parts = String(g || '').replace(/[.,;:!?]+$/, '').split(/[\s\u2014-]+/).filter(Boolean);
    let i = 0;
    while (i < parts.length && LEAD.has(parts[i].toLowerCase())) i++;
    const rest = parts.slice(i);
    if (rest.length !== 1) return '';
    const w = rest[0];
    return /^[A-Z][A-Za-z\u2019'-]+$/.test(w) && !COMMON.has(w) ? w : '';
  };
  const isNameGloss = g => !!nameWordOf(g);

  const COMMON = new Set(['The','And','God','Lord','But','For','Behold','Then','Now','Yea',
    'That','This','All','When','Who','What','Amen','If','So','It','He','She','They','We',
    'In','Of','To','A','An','O','Be','Is','Was','Are','Not','No','Yes','My','His','Her',
    'Their','Our','Your','Its','Him','Them','Me','Thou','Thee','Thy','Ye','I']);
  const names = Object.create(null);
  const nameTally = Object.create(null);
  // English word counts across every gloss: capW counts a gloss that IS a
  // capitalized single word ("Covenants", "Lot"), lowW counts every lowercase
  // word anywhere ("covenants", "lot"). The two together tell a title-case
  // ordinary word from a proper name \u2014 see the release step below.
  const capW = Object.create(null), lowW = Object.create(null);
  {
    const PAIR = /\[\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\]/g;
    const WORD = /[A-Za-z][A-Za-z\u2019'-]*/g;
    const walkN = (dir, vol) => { let ents = []; try { ents = fs.readdirSync(path.join(ROOT, dir)); } catch (e) { return; }
      for (const f of ents) { if (!/\.js$/.test(f)) continue;
        const t = fs.readFileSync(path.join(ROOT, dir, f), 'utf8'); let m; PAIR.lastIndex = 0;
        while ((m = PAIR.exec(t))) {
          const hw = m[1], gl = (m[2] || '').replace(/[\[\]()]/g, '').trim();
          let wm; WORD.lastIndex = 0;
          while ((wm = WORD.exec(gl))) { const w = wm[0]; if (/^[a-z]/.test(w)) lowW[w] = (lowW[w] || 0) + 1; }
          const nw0 = nameWordOf(gl); if (nw0) capW[nw0] = (capW[nw0] || 0) + 1;
          if (!/[\u05D0-\u05EA]/.test(hw)) continue;
          if (isTranslitTerm(hw)) continue;   // a term is not a name-form either
          const parts = SKEL(hw).split(/[\u05BE\s]+/).filter(Boolean);
          const head = parts[parts.length - 1] || '';
          const norm = head.replace(/[\u05DD\u05DF\u05E5\u05E3\u05DA]/g,
            c => ({'\u05DD':'\u05DE','\u05DF':'\u05E0','\u05E5':'\u05E6','\u05E3':'\u05E4','\u05DA':'\u05DB'}[c]));
          if (norm.length < 2) continue;
          // DOMINANCE, not presence (2026-08-31). Flagging a form on ONE
          // capitalized single-word gloss anywhere marked 1,406 ordinary words
          // as proper names, and isName disables BOTH the consonantal lookup
          // and the morphology -- so those words were stranded on their bare
          // consonantal key. Two causes, both minority readings:
          //   sentence-initial capitals -- "Teach" flagged לֻמְּדוּ, whose
          //     other 38 occurrences are all the verb; "Confirming" flagged
          //     וַיֶּחֶזְקוּ; "Because" flagged כִּי (9,531 tokens); "Assyria"
          //     flagged אֲשֶׁר (9,708 tokens)
          //   a real name sharing a skeleton with a common word -- וְיִתְמָה
          //     (Ithmah, 1Ch) vs וַיִּתְמַהּ "he marvelled", where the NIKKUD
          //     is the separator and the consonants are not
          // Verified against 24 genuine names before switching: every one sits
          // at 87-100% name-glosses (Seth is the floor at exactly 50%), and no
          // form with 3+ name-glosses is dropped. Majority is a safe cut.
          const nt = nameTally[norm] = nameTally[norm] || { name: 0, total: 0, words: Object.create(null), surf: new Set(), vols: new Set() };
          nt.total++;
          nt.vols.add(vol);
          // the pointed head (last maqqef piece of the raw token) — what the
          // engine actually looks up, and what the release step tests
          const rawParts = hw.split(/[־\s]+/).filter(Boolean);
          nt.surf.add(rawParts[rawParts.length - 1] || hw);
          const nw = nameWordOf(gl);
          if (nw) { nt.name++; nt.words[nw] = (nt.words[nw] || 0) + 1; }
        } } };
    // The Book of Mormon's verses live in bom/verses/, not bom/ — that holds
    // loaders and glossaries. Reading the wrong one meant most BOM names were
    // never collected, which is why לָמָן stayed merged with מָן "manna".
    [['ot_verses','ot'],['nt_verses','nt'],['dc_verses','dc'],['pgp_verses','pgp'],['bom/verses','bom']].forEach(d => walkN(d[0], d[1]));
    let minority = 0;
    for (const k in nameTally) {
      const t = nameTally[k];
      if (!t.name) continue;
      if (t.name / t.total >= 0.5) names[k] = 1; else minority++;
    }
    console.log('forms whose name-gloss is a MINORITY (not held back): %d', minority);
  }

  // A form counts as a Book of Mormon name only if it appears nowhere outside
  // the Book of Mormon. A name shared with another volume is a real Hebrew word
  // with its own entry (לֶחִי is Lehi and also the place in Judges 15), and must
  // resolve normally rather than being held back as a BOM-only name.
  {
    const seenIn = Object.create(null);
    const PAIR2 = /\[\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\]/g;
    const tally = (dir, vol) => { let ents = []; try { ents = fs.readdirSync(path.join(ROOT, dir)); } catch (e) { return; }
      for (const f of ents) { if (!/\.js$/.test(f)) continue;
        const t = fs.readFileSync(path.join(ROOT, dir, f), 'utf8'); let m; PAIR2.lastIndex = 0;
        while ((m = PAIR2.exec(t))) { const hw = m[1];
          if (!/[\u05D0-\u05EA]/.test(hw)) continue;
          // Only NAME occurrences count. Comparing against every token instead
          // made נֶפִי "shared" with the Old Testament because some unrelated
          // word there reduces to the same skeleton, and Nephi went back to
          // H5297 (Noph). A name is shared only if it is a name in both places.
          const g2 = (m[2] || '').replace(/[\[\]()]/g, '').trim();
          if (!isNameGloss(g2)) continue;
          const parts = SKEL(hw).split(/[\u05BE\s]+/).filter(Boolean);
          const head = parts[parts.length - 1] || '';
          const norm = head.replace(/[\u05DD\u05DF\u05E5\u05E3\u05DA]/g,
            c => ({'\u05DD':'\u05DE','\u05DF':'\u05E0','\u05E5':'\u05E6','\u05E3':'\u05E4','\u05DA':'\u05DB'}[c]));
          if (!norm) continue;
          (seenIn[norm] || (seenIn[norm] = new Set())).add(vol);
        } } };
    // "Outside the Book of Mormon" means the Hebrew and Greek scriptures. A name
    // shared with those really is a Hebrew word and must resolve to its own root
    // (Lehi is also the place in Judges 15; Jacob, Joseph, Isaiah likewise).
    // The D&C, Pearl of Great Price and JST naming Nephi, Laman, Mormon or
    // Moroni does not make them Hebrew words, so they stay their own roots.
    tally('ot_verses','ot'); tally('nt_verses','nt'); tally('bom/verses','bom');
    let dropped = 0;
    for (const k of Object.keys(names)) {
      const vols = seenIn[k];
      if (!vols) continue;
      if (vols.has('bom') && vols.size > 1) { delete names[k]; dropped++; }
    }
    console.log('names shared with the OT/NT (resolve to their Hebrew root): %d', dropped);
  }

  // TITLE CASE IS NOT A NAME (2026-09-02). "and Covenants" made וְהַבְּרִיתוֹת a
  // proper name and its own root; "the Father", "the Spirit", "the Church",
  // "Put", "Lot", "Sheba" did the same to 400+ ordinary words. The corpus
  // itself tells the two apart: a real name is never written lowercase
  // (Enoch, Nephi, Zion), a title-case word is written lowercase at least as
  // often ("covenants" 54 : "Covenants" 10). Such a form is released to resolve
  // like any other word when the lexicon knows it (exact, or with up to two
  // proclitics peeled, dagesh-blind), or when it occurs in a biblical-register
  // volume (OT/NT/BOM), where every Hebrew word is a real one and the
  // morphology can find it. A title-case word that survives only in the D&C,
  // Pearl of Great Price or JST with no lexicon hit is a modern name in
  // transliteration (Salt, New, May, March) and stays a name.
  {
    const DAG = /[ּֽֿ]/g;                       // dagesh, meteg, rafe
    const lexIdx = new Set(Object.keys(win._strongsLookup).map(k => k.replace(DAG, '')));
    const PRO = /^[והבלכמש][֑-ֽֿ-ׇ]*/;
    const lexHit = s => {
      let f = String(s || '').replace(/[׃:.,;!?]+$/, '').replace(DAG, '');   // a sof pasuq or colon glued to the word
      for (let i = 0; i < 3; i++) {
        if (lexIdx.has(f)) return true;
        const m = PRO.exec(f);
        if (!m || f.replace(/[֑-ׇ]/g, '').length - 1 < 2) break;
        f = f.slice(m[0].length);
      }
      return false;
    };
    let released = 0, kept = 0;
    const out = [];
    for (const k of Object.keys(names)) {
      const t = nameTally[k];
      if (!t || !t.words) continue;
      let W = '', best = 0;
      for (const w in t.words) if (t.words[w] > best) { best = t.words[w]; W = w; }
      if (!W) continue;
      const lo = lowW[W.toLowerCase()] || 0, hi = capW[W] || 0;
      if (lo < hi) continue;                                    // a real name
      // The no-lexicon path is for the Hebrew and Greek scriptures only, and
      // only where the lowercase reading clearly dominates: a Book of Mormon
      // coinage (Amnor the man / an amnor of silver) and a Delitzsch
      // transliteration (מַרְקוֹס Mark / "a mark") have no Hebrew root to
      // resolve to, and the morphology would invent one.
      // The lexicon is the only judge. Letting the morphology decide instead
      // filed New under לון, May under מא, City under the he-goat and Aha the
      // Nephite captain under "brother" — a transliteration always looks like
      // SOME Hebrew root. With no lexicon hit the form keeps its own card.
      let hit = '';
      for (const s of t.surf) if (lexHit(s)) { hit = s; break; }
      const row = k + '\t' + W + '\t' + lo + ':' + hi + '\t' + (hit || [...t.surf][0]) + '\t' + [...t.vols].join('');
      if (hit) { delete names[k]; released++; out.push('RELEASED\t' + row); }
      else { kept++; out.push('KEPT\t' + row); }
    }
    console.log('title-case ordinary words released from the name table: %d (modern transliterations kept: %d)', released, kept);
    if (process.env.RELEASE_LOG) fs.writeFileSync(process.env.RELEASE_LOG, out.join('\n') + '\n');
  }

  win._rootProperNames = names;
  console.log('proper-name forms held back from peeling: %d', Object.keys(names).length);
  engineCtx.window = win;
  console.log('attested standalone forms: %d', Object.keys(forms).length);
}
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
  // A maqqef joins two words. Each gets its own entry, keyed by its own root and
  // listing its own form — רַב־עֳנִי counts under רַב "much" AND עֳנִי
  // "affliction". Resolving the token to a single root discarded the other word,
  // and 13% of the corpus is maqqef-joined.
  let pairs = words.get(h);
  // Transliterated terms (root_scorecard.js's exception table, parsed above)
  // are not Hebrew words and get no root bucket — filing אַהְמָן under המן
  // would put Ahman beside Haman. A term part of a maqqef pair is dropped and
  // the Hebrew part keeps its count, matching RootEngine.getRoots on the page.
  if (pairs === undefined) {
    pairs = translitTermParts(h).all ? [] : (getRoots(h) || []).filter(pr => !isTranslitTerm(pr.part));
    words.set(h, pairs);
  }
  const gNorm = g.replace(/-/g, ' ').trim();
  for (const pr of pairs) {
    const root = pr.root;
    if (!root) continue;
    let e = roots.get(root);
    if (!e) {
      e = { c: new Array(NVOL).fill(0), verses: Array.from({length: NVOL}, () => new Set()),
            f: new Map(), g: new Map(), refs: Array.from({length: NVOL}, () => new Map()) };
      roots.set(root, e);
    }
    e.c[volIdx]++;
    e.verses[volIdx].add(chapId + '|' + verseNum);
    e.f.set(pr.part || h, (e.f.get(pr.part || h) || 0) + 1);
    e.g.set(gNorm, (e.g.get(gNorm) || 0) + 1);
    let chMap = e.refs[volIdx];
    let vs = chMap.get(chapId);
    if (!vs) { vs = new Set(); chMap.set(chapId, vs); }
    vs.add(verseNum);
  }
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
  volNames: { ot: 'Old Testament', nt: 'New Testament', bom: 'Book of Mormon', dc: 'D&C', pgp: 'Pearl of Great Price', jst: 'JST' },
  keys: keys,
  roots: rootsOut,
  books: books
};
const js = '// root_concordance.js — auto-generated by tools/build_root_concordance.js. DO NOT EDIT.\n' +
  '// Cross-volume root scorecard index: canonical root -> counts, top forms and\n' +
  '// glosses across OT, NT, BOM, D&C, PGP and JST. Verse references live in\n' +
  '// root_concordance_refs.js (loaded only when the references panel opens).\n' +
  'window._rootWordForms = ' + JSON.stringify(win._rootWordForms) + ';\n' +
  'window._rootProperNames = ' + JSON.stringify(win._rootProperNames) + ';\n' +
  'window._rootConcordance = ' + JSON.stringify(payload) + ';\n';
fs.writeFileSync(path.join(ROOT, 'root_concordance.js'), js);

// ---------- 5b. Emit root_names.js ----------
// The proper-name guard decides whether a word may be fuzzy-matched at all, so
// it MUST be loaded before the first getRoot call — not lazily with the
// concordance. Loading it late made נֵפִי resolve to H5297 (נֹף, Memphis) on a
// cold page and to its own key once the concordance arrived: two different keys
// for one word, which is what desynchronised the cross-reference index.
const namesJs = '// root_names.js — auto-generated by tools/build_root_concordance.js.\n' +
  '// Forms this corpus glosses as proper names. Loaded eagerly: root_engine.js\n' +
  '// consults it before any fuzzy matching. DO NOT EDIT.\n' +
  'window._rootProperNames = ' + JSON.stringify(win._rootProperNames) + ';\n';
fs.writeFileSync(path.join(ROOT, 'root_names.js'), namesJs);
console.log('root_names.js written: %d KB (%d forms)', Math.round(namesJs.length/1024), Object.keys(win._rootProperNames).length);
console.log('root_concordance.js written: %s MB (%d roots)', (js.length / 1048576).toFixed(2), keys.length);

const refsJs = '// root_concordance_refs.js — auto-generated by tools/build_root_concordance.js. DO NOT EDIT.\n' +
  '// Verse references per root (parallel to _rootConcordance.keys). Entries with _b\n' +
  '// carry per-book verse counts instead (roots too common to list verse by verse).\n' +
  'window._rootConcordanceRefs = ' + JSON.stringify(refsOut) + ';\n';
fs.writeFileSync(path.join(ROOT, 'root_concordance_refs.js'), refsJs);
console.log('root_concordance_refs.js written: %s MB', (refsJs.length / 1048576).toFixed(2));

// (root_engine.js is no longer emitted here — since 2026-08-30 it IS the
// source this builder reads; see step 2.)

// Sanity samples
['וּמֶמְשָׁלָה', 'שָׁלוֹם', 'חֶסֶד', 'וְהַמִּלְחָמוֹת'].forEach(function(w) {
  const idx = keyIdx.get(getRoot(w));
  if (idx === undefined) { console.log('sample %s: NOT FOUND', w); return; }
  const r = rootsOut[idx];
  console.log('sample %s → %s: counts=%j verses=%j refs=%s', w, keys[idx], r.c, r.vc, refsOut[idx]._b ? 'book-level' : 'verse-level');
});
