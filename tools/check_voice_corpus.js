#!/usr/bin/env node
// Run spoken() over EVERY token in all six volumes and look for output no
// reader should ever be handed. The per-word rules are easy to reason about
// one at a time and they interact: the syllable split was eaten by
// deGeminateVav for an hour, and the segol-with-dagesh was inert for a
// morning. Both read correctly in the source. This is the corpus-wide net.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const win = {}; win.window = win;
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
  location: win.location, localStorage: win.localStorage, MutationObserver: win.MutationObserver,
  speechSynthesis: { getVoices: () => [], addEventListener: noop, cancel: noop, speak: noop },
  SpeechSynthesisUtterance: function (t) { this.text = t; } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'read_aloud.js'), 'utf8'), sb,
                { filename: 'read_aloud.js' });
const spoken = win.SWReadAloud.spoken;

const VOLS = { ot: 'ot_verses', nt: 'nt_verses', dc: 'dc_verses',
               pgp: 'pgp_verses', jst: 'jst_verses', bom: 'bom/verses' };
const LETTER = /[א-ת]/, MARK = /[֑-ׇ]/;
const TOK = /\["([^"]*)","([^"]*)"\]/g;
const bad = { empty: [], lost: [], dbl: [], edge: [], orphan: [], grew: [] };
const seen = new Set();
let n = 0;
for (const [vol, d] of Object.entries(VOLS)) {
  const dir = path.join(ROOT, d);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    let m; TOK.lastIndex = 0;
    while ((m = TOK.exec(txt))) {
      const h = m[1];
      if (!h || !LETTER.test(h)) continue;
      if (seen.has(h)) continue;
      seen.add(h); n++;
      let s;
      try { s = spoken(h); } catch (e) { bad.empty.push([h, 'THREW ' + e.message, vol + '/' + f]); continue; }
      const where = vol + '/' + f.replace('.js', '');
      if (!s || !s.trim()) { bad.empty.push([h, s, where]); continue; }
      /* every Hebrew letter that went in must come out — the rules may respell,
         never delete */
      const inL = (h.match(/[א-ת]/g) || []).length;
      const outL = (s.match(/[א-ת]/g) || []).length;
      if (outL < inL - 1) bad.lost.push([h, s, where]);
      /* GROWTH IS LEGITIMATE WHEN IT IS ONLY MATERS. ktivMale respells ־ָיו and
         the qamats-qatan words the modern way — לְתֹלְדֹתָיו becomes לתולדותיו,
         four letters longer and every one of them a vav or a yod. What must
         never happen is a CONSONANT appearing that was not there. */
      /* Two rules replace a WHOLE word and legitimately change its consonants,
         which no structural test can tell from a rule going wrong:
           the Name — יְהוָה is spoken אֲדֹנָי, יְהוִה is spoken Elohim
           the archaic ־ָו — דְּרָכָו is given a bet, because the vav there is a
           consonant and she reads the bare form as a vowel
         Both are guarded by their own cases in check_read_aloud.js. */
      const SUBSTITUTED = /\u05D9\u05B0\u05D4\u05D5[\u05B8\u05B4]\u05D4/.test(h) ||
                          /\u05B8\u05D5$/.test(h);
      if (outL > inL && !SUBSTITUTED) {
        const strip = t => (t.match(/[\u05D0-\u05EA]/g) || [])
                             .filter(c => c !== '\u05D5' && c !== '\u05D9').join('');
        if (strip(s).length > strip(h).length) bad.grew.push([h, s, where]);
      }
      if (/\s{2,}/.test(s)) bad.dbl.push([h, s, where]);
      if (/^\s|\s$/.test(s)) bad.edge.push([h, s, where]);
      /* a mark with no letter in front of it is a broken respelling */
      if (MARK.test(s[0]) || /\s[֑-ׇ]/.test(s)) bad.orphan.push([h, s, where]);
    }
  }
}
let fail = 0;
function report(key, label) {
  const r = bad[key];
  if (!r.length) { console.log('[voice] ok: ' + label); return; }
  fail += r.length;
  console.error('[voice] ' + r.length + ' ' + label);
  r.slice(0, 8).forEach(x => console.error('     ' + x[0] + '  ->  [' + x[1] + ']   ' + x[2]));
}
console.log('[voice] ' + n.toLocaleString() + ' distinct forms through spoken()');
report('empty',  'forms come back empty or threw');
report('lost',   'forms lost letters — a rule deleted Hebrew');
report('grew',   'forms gained letters beyond a respelling');
report('dbl',    'forms carry a double space');
report('edge',   'forms start or end with whitespace');
report('orphan', 'forms have a mark with no letter before it');
if (fail) { console.error('[voice] ' + fail + ' problem(s). Commit blocked.'); process.exit(1); }
console.log('[voice] every form is speakable');
