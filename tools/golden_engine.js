// golden_engine.js — the engine's golden test. Loads TWO engine files over the SAME
// data (strongs_lookup, strongs_roots, bdb_roots, shoroshim_roots, root_names,
// root_concordance for _rootWordForms), runs both over every distinct token of
// the six volumes, and reports every form whose answer differs.
//
//   node tools/golden_engine.js <engineA.js> <engineB.js> [--out diff.json]
//
// A rebuild of the engine passes when this prints "differences: 0". Any
// difference must be read and justified before the rebuilt engine ships.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
function load(engineFile) {
  const win = {};
  ['strongs_lookup.js', 'strongs_roots.js', 'bdb_roots.js', 'shoroshim_roots.js', 'root_names.js', 'root_concordance.js']
    .forEach(f => vm.runInNewContext(fs.readFileSync(path.join(R, f), 'utf8'), { window: win }, { filename: f }));
  const ctx = { window: win, _strongsLookup: win._strongsLookup, _strongsRoots: win._strongsRoots };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(engineFile, 'utf8'), ctx, { filename: path.basename(engineFile) });
  if (!win.RootEngine) throw new Error(engineFile + ' did not export RootEngine');
  return win.RootEngine;
}
const args = process.argv.slice(2);
const outIx = args.indexOf('--out'); const outFile = outIx >= 0 ? args[outIx + 1] : '';
const files = args.filter((a, i) => a !== '--out' && (outIx < 0 || i !== outIx + 1));
if (files.length !== 2) { console.error('usage: golden.js <engineA.js> <engineB.js> [--out diff.json]'); process.exit(2); }
const A = load(path.resolve(files[0])), B = load(path.resolve(files[1]));
// every distinct token, with its count, volume set and one gloss
const TOK = /\["([^"]*)","([^"]*)"\]/g;
const forms = new Map();
for (const d of ['ot_verses', 'nt_verses', 'bom/verses', 'dc_verses', 'pgp_verses', 'jst_verses']) {
  const D = path.join(R, d); if (!fs.existsSync(D)) continue;
  const vol = d.split('/')[0].replace('_verses', '');
  for (const f of fs.readdirSync(D)) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(D, f), 'utf8'); let m; TOK.lastIndex = 0;
    while ((m = TOK.exec(src))) {
      const h = m[1]; if (!/[א-ת]/.test(h)) continue;
      let o = forms.get(h); if (!o) { o = { n: 0, vols: new Set(), g: m[2] }; forms.set(h, o); }
      o.n++; o.vols.add(vol);
    }
  }
}
// the chapter-heading vocabulary: resolved at runtime on the pages, never
// walked by the concordance builder, so the verse walk alone would miss it
(function addHeadings() {
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/StandardWorks|node_modules|\.git/.test(f)) walk(p); continue; }
    if (!/chapter_headings_heb.*\.js$/.test(f)) continue;
    const src = fs.readFileSync(p, 'utf8'); const HW = /[\u05D0-\u05EA][\u0591-\u05C7\u05D0-\u05EA־]*/g; let m;
    while ((m = HW.exec(src))) { const h = m[0]; if (!/[א-ת]/.test(h)) continue;
      let o = forms.get(h); if (!o) { o = { n: 0, vols: new Set(), g: '' }; forms.set(h, o); } o.n++; o.vols.add('heading'); } } };
  walk(R);
})();
const run = (E, h) => { try { return JSON.stringify(E.getRoots(h)); } catch (e) { return 'ERR:' + e.message; } };
const runOne = (E, h) => { try { return String(E.getRoot(h)); } catch (e) { return 'ERR:' + e.message; } };
let same = 0, diff = 0, diffTok = 0; const out = []; const pairs = new Map();
const t0 = Date.now();
for (const [h, o] of forms) {
  const a = run(A, h), b = run(B, h);
  const a1 = runOne(A, h), b1 = runOne(B, h);
  if (a === b && a1 === b1) { same++; continue; }
  diff++; diffTok += o.n;
  const rec = { form: h, gloss: o.g, n: o.n, vols: [...o.vols].join(','), a: a1, b: b1, aRoots: a, bRoots: b };
  out.push(rec);
  const k = a1 + ' -> ' + b1; const p = pairs.get(k) || { n: 0, tok: 0, ex: [] }; p.n++; p.tok += o.n; if (p.ex.length < 3) p.ex.push(h); pairs.set(k, p);
}
const ms = Date.now() - t0;
console.log('forms: ' + forms.size + '   same: ' + same + '   differences: ' + diff + ' (' + diffTok + ' tokens)   ' + ms + ' ms');
if (diff) {
  const top = [...pairs.entries()].sort((x, y) => y[1].tok - x[1].tok).slice(0, 40);
  console.log('\nby old -> new (top 40 by tokens):');
  for (const [k, p] of top) console.log('  ' + String(p.tok).padStart(6) + ' tok  ' + String(p.n).padStart(4) + ' forms  ' + k + '   e.g. ' + p.ex.join(' '));
}
if (outFile) { fs.writeFileSync(outFile, JSON.stringify(out.sort((x, y) => y.n - x.n), null, 1)); console.log('full diff written: ' + outFile); }
process.exit(diff ? 1 : 0);
