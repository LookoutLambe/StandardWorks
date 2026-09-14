#!/usr/bin/env node
// Render a chapter to audio EXACTLY as the reader speaks it — same spoken(),
// same phrases(), same break table — so the translator can listen anywhere
// and report a verse reference instead of driving the app.
//
// The defects found on 2026-09-14 all lived in the UTTERANCE, never in the
// word: אֱלֹהִים is byte-identical to its fix in isolation, and וְהָאַחֲרִית is
// correct alone, correct as a pair, and wrong only inside Moses 2:1's own
// phrase. Testing words one at a time cannot find them. This renders what she
// actually says.
//
//   node tools/render_chapter.js pgp moses 2 [outdir] [wpm]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const [vol, book, chap] = process.argv.slice(2);
const OUT = process.argv[5] || path.join(ROOT, '.voice');
const WPM = process.argv[6] || '110';
if (!vol || !book || !chap) {
  console.error('usage: node tools/render_chapter.js <vol> <book> <chapter> [outdir] [wpm]');
  process.exit(1);
}

/* the reader itself, with no DOM */
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
for (const f of [vol + '_phrase_breaks.js', 'bom/bom_phrase_breaks.js', 'ot_phrase_breaks.js'])
  if (fs.existsSync(path.join(ROOT, f)))
    try { vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { window: win }); } catch (e) {}
vm.runInContext(fs.readFileSync(path.join(ROOT, 'read_aloud.js'), 'utf8'), sb,
                { filename: 'read_aloud.js' });
const spoken = win.SWReadAloud.spoken;

/* the verse data, and the break table keyed as phrases() reads it */
const dir = vol === 'bom' ? path.join(ROOT, 'bom', 'verses') : path.join(ROOT, vol + '_verses');
const txt = fs.readFileSync(path.join(dir, book + '.js'), 'utf8');
const CH = /var\s+([A-Za-z0-9_]+)_ch(\d+)Verses\s*=\s*\[/g;
const marks = []; let m;
while ((m = CH.exec(txt))) marks.push([m.index + m[0].length, +m[2], m[1]]);
const i = marks.findIndex(x => x[1] === +chap);
if (i < 0) { console.error('chapter not found'); process.exit(1); }
const body = txt.slice(marks[i][0], i + 1 < marks.length ? marks[i + 1][0] : txt.length);
const starts = [];
const NUM = /\{\s*num\s*:/g;
while ((m = NUM.exec(body))) starts.push(m.index);

fs.mkdirSync(OUT, { recursive: true });
const lines = [];
for (let v = 0; v < starts.length; v++) {
  const vb = body.slice(starts[v], v + 1 < starts.length ? starts[v + 1] : body.length);
  const words = []; const TOK = /\["([^"]*)","([^"]*)"\]/g; let t;
  while ((t = TOK.exec(vb))) if (/[א-ת]/.test(t[1])) words.push(t[1]);
  if (!words.length) continue;
  /* drive phrases() with the same shape the reader gives it */
  const units = words.map(h => ({ getAttribute: () => h,
                                  querySelector: () => ({ textContent: '' }) }));
  let grouped = [];
  try { grouped = win.SWReadAloud.phrases(units, null) || []; } catch (e) { grouped = [units]; }
  const said = grouped.map(g => g.map(u => spoken(u.getAttribute('data-h'))).join(' '));
  lines.push('[[slnc 500]] ' + said.join('. ') + '.');
}
const script = lines.join('\n[[slnc 700]]\n');
const base = path.join(OUT, vol + '_' + book + '_' + chap);
fs.writeFileSync(base + '.txt', script);
cp.execFileSync('say', ['-v', 'Carmit', '-r', WPM, '-f', base + '.txt', '-o', base + '.aiff']);
/* keep only the compressed copy — the AIFF is ten times the size and the
   whole corpus is 131 hours of audio */
try {
  cp.execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', base + '.aiff', base + '.m4a']);
  fs.unlinkSync(base + '.aiff');
} catch (e) {}
const kb = n => (fs.statSync(n).size / 1024).toFixed(0) + ' KB';
console.log(lines.length + ' verses rendered at ' + WPM + ' wpm');
console.log('  ' + base + '.m4a  (' + kb(base + '.m4a') + ')');
