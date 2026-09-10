/* Every string read_aloud.js hands the synthesiser, for all six volumes.
   The SHIPPED phrases(), spoken() and sayJoin under a stub DOM — so this is
   what the reader says today, periods and all, not a reimplementation. */
const fs = require('fs'), path = require('path');
const ROOT = '/Users/chrislambe/Desktop/untitled folder/Escrituras';
const noop = () => {};
const el = () => ({ addEventListener: noop, appendChild: noop, closest: () => null,
  querySelector: () => null, querySelectorAll: () => [], insertBefore: noop,
  setAttribute: noop, getAttribute: () => null,
  classList: { toggle: noop, add: noop, remove: noop, contains: () => false } });
global.window = global; global.addEventListener = noop;
global.document = Object.assign(el(), { readyState: 'complete', body: null,
  createElement: el, head: el(), getElementById: () => null });
global.MutationObserver = function () { this.observe = noop; };
global.localStorage = { getItem: () => null, setItem: noop };
global.speechSynthesis = undefined;

for (const f of ['ot_phrase_breaks.js','nt_phrase_breaks.js','dc_phrase_breaks.js',
                 'pgp_phrase_breaks.js','jst_phrase_breaks.js','bom/bom_phrase_breaks.js'])
  require(path.join(ROOT, f));
require(path.join(ROOT, 'read_aloud.js'));
const { phrases, spoken, sayJoin } = window.SWReadAloud;

const unit = (h, g) => ({ getAttribute: a => (a === 'data-h' ? h : null),
                          querySelector: s => (s === '.gl' ? { textContent: g || '' } : null) });

const verses = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = [];
let keyed = 0, periods = 0;
for (const [key, toks] of verses) {
  if (window.SW_BREAKS[key]) keyed++;
  const us = toks.map(t => unit(t[0], t[1]));
  for (const g of phrases(us, key)) {
    let text = '', prev = '';
    g.forEach((e, i) => {
      const w = spoken(e.getAttribute('data-h') || '');
      if (i) text += sayJoin(prev, w);
      text += w; prev = w;
    });
    if (!text.trim()) continue;
    if (text.includes('. ')) periods++;
    out.push(key + '\t' + text);
  }
}
fs.writeFileSync(process.argv[3], out.join('\n') + '\n', 'utf8');
console.error('verses ' + verses.length.toLocaleString() +
              '   keys that hit SW_BREAKS ' + (100*keyed/verses.length).toFixed(1) + '%' +
              '   phrases ' + out.length.toLocaleString() +
              '   already carrying a period ' + periods);
