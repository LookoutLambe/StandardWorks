// check_root_meanings_vs_corpus.js — the meaning line on a study card comes
// from bom/roots_glossary.js, and that file is hand-maintained, so an entry can
// drift from what the corpus actually says the word means. רות was "provoke"
// on a card reading "from of Ruth".
//
// The corpus glosses ARE the translator's own curated work, so they are the
// evidence: if a root's meaning shares no word with ANY gloss the corpus gives
// it, the meaning is a candidate for correction. Prefix-matched on four
// characters so create/created/creation and hope/hoped agree, and with no
// stopword list — an earlier version stripped exactly the words that would
// have matched and reported 161 mismatches, most of them "which/that/who" vs
// "which, that, who".
//
// Every hit is a CANDIDATE, never a verdict: the translator rules.
//   node tools/check_root_meanings_vs_corpus.js [--all]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const win = {};
for (const f of ['bom/roots_glossary.js', 'root_concordance.js']) {
  new Function('window', fs.readFileSync(path.join(ROOT, f), 'utf8'))(win);
}
const G = win._rootGlossaryData, C = win._rootConcordance;
const toks = s => String(s || '').toLowerCase().replace(/[^a-z\s-]/g, ' ')
  .split(/[\s-]+/).filter(x => x.length > 2).map(t => t.slice(0, 4));
const share = (a, b) => { const A = new Set(toks(a)); return toks(b).some(t => A.has(t)); };

let checked = 0; const bad = [];
for (let i = 0; i < C.keys.length; i++) {
  const k = C.keys[i], e = C.roots[i], g = G[k];
  if (!g || !g.meaning || !e || !e.g) continue;
  if (!toks(g.meaning).length) continue;
  const glosses = Object.keys(e.g);
  if (!glosses.length) continue;
  checked++;
  if (share(g.meaning, glosses.join(' '))) continue;
  bad.push({ k, meaning: g.meaning, n: e.c.reduce((a, b) => a + b, 0), gl: glosses.slice(0, 4) });
}
bad.sort((a, b) => b.n - a.n);
console.log(`roots with both a meaning and corpus glosses: ${checked}`);
console.log(`meaning shares no word with any gloss:        ${bad.length} (${(100 * bad.length / checked).toFixed(1)}%)\n`);
const show = process.argv.includes('--all') ? bad : bad.slice(0, 40);
for (const b of show) {
  console.log(`  ${b.k.padEnd(10)}${String(b.n).padStart(6)}  "${b.meaning}"`);
  console.log(`  ${' '.repeat(16)}corpus: ${b.gl.join(' · ')}`);
}
if (show.length < bad.length) console.log(`\n  …${bad.length - show.length} more; pass --all`);
