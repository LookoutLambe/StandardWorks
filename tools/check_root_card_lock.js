#!/usr/bin/env node
// THE SCORECARDS ARE LOCKED (user, 2026-09-13: "lock everything the way it is
// right now then. this is final"), taken after the chapter-by-chapter audit of
// the New Testament, the Book of Mormon, the Doctrine and Covenants and the
// Pearl of Great Price was complete and verified not to have regressed.
//
// What is locked is the CARD FACE: for every distinct Hebrew-surface + gloss
// pair in the corpus, the family the engine resolves it to and the sense text
// the scorecard renders for it. That is what the audit actually fixed, so that
// is what the lock holds. It is fingerprinted per source file in
// tools/root_card_lock.json, so a failure names the book that moved.
//
// This deliberately sits DOWNSTREAM of everything that can change a card:
// root_engine.js (pins, homographs, family splits), bom/roots_glossary.js (the
// sense lines), root_concordance.js and root_scorecard.js (senseFor and the
// numeral / digit / initial / transliterated-term rules). Edit any of them and
// this check names exactly which books' cards moved.
//
// Wired into .git/hooks/pre-commit beside the Hebrew lock:
//     node "$ROOT/tools/check_root_card_lock.js" || exit 1
//
//   node tools/check_root_card_lock.js            verify (exit 1 on any change)
//   node tools/check_root_card_lock.js --rebase   re-fingerprint the current
//        cards -- ONLY after the user has explicitly approved a card change.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const LOCK = path.join(__dirname, 'root_card_lock.json');
const REBASE = process.argv.indexOf('--rebase') >= 0;

const VOLS = {
  ot: ['ot_verses', 'ot_headings'], nt: ['nt_verses', 'nt_headings'],
  dc: ['dc_verses', 'dc_headings'], pgp: ['pgp_verses', 'pgp_headings'],
  jst: ['jst_verses'], bom: ['bom/verses']
};

/* Boot the engine and the scorecard's sense layer with no DOM. The scorecard is
   an IIFE, so senseFor is reached by appending an export before its close. */
function boot() {
  const win = {};
  for (const f of ['strongs_lookup.js', 'strongs_roots.js', 'bdb_roots.js',
                   'shoroshim_roots.js', 'attested_forms.js', 'root_names.js',
                   'root_concordance.js', 'bom/roots_glossary.js'])
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { window: win }, { filename: f });
  const ectx = { window: win, _strongsLookup: win._strongsLookup, _strongsRoots: win._strongsRoots };
  vm.createContext(ectx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'root_engine.js'), 'utf8'), ectx,
                  { filename: 'root_engine.js' });

  const noop = function () {};
  const el = () => ({ style: {}, classList: { add: noop, remove: noop, contains: () => false },
    appendChild: noop, setAttribute: noop, addEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [], dataset: {} });
  const doc = { createElement: el, createTextNode: el, head: el(), body: el(),
    documentElement: el(), addEventListener: noop, querySelector: () => null,
    querySelectorAll: () => [], getElementById: () => null };
  win.document = doc; win.addEventListener = noop; win.removeEventListener = noop;
  win.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
  win.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  win.requestIdleCallback = noop; win.setTimeout = noop; win.location = { href: '', search: '' };
  const sb = { window: win, document: doc, console: { warn() {}, log() {}, error() {} },
    setTimeout: noop, requestIdleCallback: noop, navigator: { userAgent: '' },
    location: win.location, localStorage: win.localStorage };
  vm.createContext(sb);
  let code = fs.readFileSync(path.join(ROOT, 'root_scorecard.js'), 'utf8');
  code = code.replace(/\}\)\(\);?\s*$/, '  window.__sc={senseFor:senseFor};\n})();');
  vm.runInContext(code, sb, { filename: 'root_scorecard.js' });
  if (!win.__sc || !win.__sc.senseFor) {
    console.error('[card-lock] could not reach senseFor in root_scorecard.js');
    process.exit(1);
  }
  return { E: win.RootEngine, G: win._rootGlossaryData, senseFor: win.__sc.senseFor };
}

const boot_ = boot();
const E = boot_.E, G = boot_.G, senseFor = boot_.senseFor;

/* The card face: every family the pair resolves to, each with the sense text
   the card renders for it. Any pin, split, homograph or sense-line edit that
   changes what a reader sees moves this string. */
function face(h, g) {
  let parts = [];
  try { parts = E.getRoots(h, g) || []; } catch (e) { return 'ERR'; }
  return parts.map(function (q) {
    const mean = (G[q.root] && G[q.root].meaning) || '';
    return q.root + '::' + (mean ? senseFor(mean, q.root, g) : '');
  }).join(' | ');
}

/* A separator that cannot occur in Hebrew text or an English gloss, so the
   boundary between surface, gloss and face is never ambiguous. */
const SEP = '\u001F';
const TOK = /\["([^"]*)","([^"]*)"\]/g;
const now = {};
let pairs = 0;
for (const vol of Object.keys(VOLS)) {
  for (const d of VOLS[vol]) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith('.js')) continue;
      const txt = fs.readFileSync(path.join(dir, f), 'utf8');
      const seen = new Set(), faces = [];
      let m; TOK.lastIndex = 0;
      while ((m = TOK.exec(txt))) {
        const h = m[1], g = m[2];
        if (!h || !g) continue;
        const k = h + SEP + g;
        if (seen.has(k)) continue;
        seen.add(k);
        faces.push(k + SEP + face(h, g));
      }
      faces.sort();
      pairs += faces.length;
      now[vol + '/' + d + '/' + f] = {
        n: faces.length,
        d: crypto.createHash('sha256').update(faces.join('\n'), 'utf8').digest('hex').slice(0, 16)
      };
    }
  }
}

if (REBASE) {
  fs.writeFileSync(LOCK, JSON.stringify(now) + '\n');
  console.log('[card-lock] re-fingerprinted ' + Object.keys(now).length +
              ' files, ' + pairs + ' card faces');
  process.exit(0);
}

if (!fs.existsSync(LOCK)) {
  console.error('[card-lock] no lock file - run: node tools/check_root_card_lock.js --rebase');
  process.exit(1);
}
const was = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
const moved = [], gone = [], added = [];
for (const k of Object.keys(was)) {
  if (!now[k]) { gone.push(k); continue; }
  if (now[k].d !== was[k].d) moved.push(k + '  (' + was[k].n + ' -> ' + now[k].n + ' cards)');
}
for (const k of Object.keys(now)) if (!was[k]) added.push(k);

if (!moved.length && !gone.length && !added.length) {
  console.log('[card-lock] ok: all ' + pairs + ' card faces unchanged across ' +
              Object.keys(now).length + ' files');
  process.exit(0);
}
console.error('[card-lock] THE SCORECARDS ARE LOCKED and these moved:');
moved.slice(0, 25).forEach(function (x) { console.error('   changed  ' + x); });
if (moved.length > 25) console.error('   ...and ' + (moved.length - 25) + ' more');
gone.slice(0, 10).forEach(function (x) { console.error('   missing  ' + x); });
added.slice(0, 10).forEach(function (x) { console.error('   new      ' + x); });
console.error('[card-lock] If the user has approved this change:');
console.error('[card-lock]     node tools/check_root_card_lock.js --rebase');
process.exit(1);
