#!/usr/bin/env node
// A WORKLIST FOR THE EAR, not a test. Nothing here can hear, and the defects
// found on 2026-09-14 are invisible to every automatic check we have: an
// inserted glide swaps a consonant without changing the duration, so
// אֱלֹהִים and אלוהים render byte-IDENTICAL audio even though one says
// "elo-YAM". Duration cannot separate them and neither can a string test.
//
// What the defects DID share is a shape. Each one had a weak consonant —
// א, ה or ע — sitting BETWEEN TWO VOWELS, where Carmit fills the hiatus with
// a /y/:  elo-(h)im -> elo-yim,  ha-(a)charit -> ha-yacharit.
//
// So this ranks every form in the corpus by that shape and by how many tokens
// it carries, and prints the words most worth listening to first. Covering the
// top of this list covers most of the risk in the corpus.
//
//   node tools/find_voice_risks.js [howMany]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const N = Number(process.argv[2] || 150);

/* the reader's own spoken() — the risk is in what SHE is handed, not the page */
const win = { document: { createElement: function () { return {}; } } };
win.window = win;
const noop = function () {};
const el = () => ({ style: {}, classList: { add: noop, remove: noop, contains: () => false },
  appendChild: noop, setAttribute: noop, addEventListener: noop,
  querySelector: () => null, querySelectorAll: () => [], dataset: {} });
const doc = { createElement: el, createTextNode: el, head: el(), body: el(),
  documentElement: el(), addEventListener: noop, querySelector: () => null,
  querySelectorAll: () => [], getElementById: () => null, readyState: 'complete' };
win.document = doc; win.addEventListener = noop; win.removeEventListener = noop;
win.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
win.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
win.requestIdleCallback = noop; win.setTimeout = noop; win.location = { href: '', search: '' };
win.MutationObserver = function () { return { observe: noop, disconnect: noop }; };
const sb = { window: win, document: doc, console: { warn() {}, log() {}, error() {} },
  setTimeout: noop, requestIdleCallback: noop, navigator: { userAgent: '' },
  location: win.location, localStorage: win.localStorage,
  MutationObserver: win.MutationObserver,
  speechSynthesis: { getVoices: () => [], addEventListener: noop, cancel: noop, speak: noop },
  SpeechSynthesisUtterance: function (t) { this.text = t; } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'read_aloud.js'), 'utf8'), sb,
                { filename: 'read_aloud.js' });
const spoken = win.SWReadAloud.spoken;

const LETTER = /[א-ת]/, MARK = /[֑-ׇ]/;
const FULL = /[ֱֲֳִֵֶַָׇֹֺֻ]/;
const WEAK = 'אהע';                      /* alef he ayin */

function units(w) {
  const out = [], ch = [...w];
  for (let i = 0; i < ch.length; i++) {
    if (!LETTER.test(ch[i])) continue;
    let j = i + 1, m = '';
    while (j < ch.length && MARK.test(ch[j])) { m += ch[j]; j++; }
    out.push({ c: ch[i], marks: m });
  }
  return out;
}
/* how many hiatus sites does this form carry? */
function risk(w) {
  const u = units(w);
  let n = 0;
  for (let i = 1; i < u.length; i++) {
    if (WEAK.indexOf(u[i].c) < 0) continue;
    if (!FULL.test(u[i].marks)) continue;               /* the weak letter is voiced */
    if (!FULL.test(u[i - 1].marks)) continue;           /* and a vowel precedes it */
    n++;
  }
  return n;
}

const VOLS = { ot: 'ot_verses', nt: 'nt_verses', dc: 'dc_verses',
               pgp: 'pgp_verses', jst: 'jst_verses', bom: 'bom/verses' };
const TOK = /\["([^"]*)","([^"]*)"\]/g;
const count = new Map(), where = new Map();
for (const [vol, d] of Object.entries(VOLS)) {
  const dir = path.join(ROOT, d);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    let m; TOK.lastIndex = 0;
    while ((m = TOK.exec(txt))) {
      const h = m[1];
      if (!h || !LETTER.test(h)) continue;
      for (const w of h.split('־')) {
        if (!LETTER.test(w)) continue;
        count.set(w, (count.get(w) || 0) + 1);
        if (!where.has(w)) where.set(w, vol + '/' + f.replace('.js', ''));
      }
    }
  }
}
const rows = [];
for (const [w, n] of count) {
  const sp = spoken(w);
  const r = risk(sp);
  if (!r) continue;
  rows.push({ w, sp, n, r, score: r * n, at: where.get(w) });
}
rows.sort((a, b) => b.score - a.score);
const totalTok = rows.reduce((s, x) => s + x.n, 0);
console.log('forms carrying a vowel-weak-vowel hiatus : ' + rows.length.toLocaleString());
console.log('tokens they account for                 : ' + totalTok.toLocaleString());
console.log('\nthe ' + N + ' most worth hearing (rank = sites x tokens):\n');
console.log('   rank  tokens  sites  form              spoken             first seen');
rows.slice(0, N).forEach((r, i) => {
  const same = r.sp === r.w ? '(unchanged)' : r.sp;
  console.log('   ' + String(i + 1).padStart(4) + '  ' + String(r.n).padStart(6) + '  ' +
              String(r.r).padStart(5) + '  ' + r.w.padEnd(17) + ' ' + same.padEnd(18) + ' ' + r.at);
});
const covered = rows.slice(0, N).reduce((s, x) => s + x.n, 0);
console.log('\nthese ' + N + ' forms cover ' + covered.toLocaleString() + ' tokens (' +
            (100 * covered / totalTok).toFixed(1) + '% of the risk)');
