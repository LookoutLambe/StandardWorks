#!/usr/bin/env node
/* check_pin_ambiguity.js — a SURFACE_PIN is a claim about every use of that
 * form in six volumes, not just the token in front of you.
 *
 * The pin שְׁנַת -> ישן "to sleep" was right about the two tokens that gloss
 * "the sleep of" and wrong about the hundred and twenty-six that gloss "the
 * year of": שְׁנַת is the construct of both שָׁנָה and שֵׁנָה, identical in
 * consonants AND pointing. It shipped, and "the seventh year" read as sleep.
 *
 * THE TEST is not "does this form carry two senses" — hundreds do, and most of
 * that is one sense worded two ways. It is whether the pin FOLLOWS A MINORITY
 * SENSE: take the form's commonest gloss and ask whether the family the pin
 * names says anything resembling it. A form's glosses are gathered from the
 * whole token AND from each maqqef-separated part, which is how the "year"
 * sense of שְׁנָתוֹ hid inside בֶּן־שְׁנָתוֹ "a year old".
 *
 * A form that genuinely carries two senses needs a HOMOGRAPH, which decides
 * by the gloss, not a pin, which cannot. Exit 1 on a finding.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'root_engine.js'), 'utf8');

/* Pins only. A homograph is not a pin and must not be tested here: deciding
   between two senses is exactly its job. */
const start = src.indexOf('var SURFACE_PINS = {');
if (start < 0) { console.error('[pins] SURFACE_PINS not found'); process.exit(1); }
let depth = 0, end = start;
for (let i = src.indexOf('{', start); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (!depth) { end = i; break; } }
}
const pins = new Map();
const re = /'([֐-׿־‏-]+)':\s*'([^']+)',/g;
let m; while ((m = re.exec(src.slice(start, end)))) pins.set(m[1], m[2]);

const VOLS = ['ot_verses', 'nt_verses', 'dc_verses', 'pgp_verses', 'jst_verses', 'bom/verses'];
const byForm = new Map();
for (const d of VOLS) {
  const dir = path.join(ROOT, d);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    const rx = /\["([^"]*)","([^"]*)"\]/g; let x;
    while ((x = rx.exec(t))) {
      const h = x[1], g = x[2]; if (!h || !g) continue;
      for (const part of [h].concat(h.split(/[־ ]/).filter(Boolean))) {
        if (!byForm.has(part)) byForm.set(part, new Map());
        const gm = byForm.get(part); gm.set(g, (gm.get(g) || 0) + 1);
      }
    }
  }
}
const STOP = new Set(('the of and a an to in his her their my your our he she it they them is are was were be ' +
  'been that this which who whom unto upon with for by from not no shall will may might had have has did do ' +
  'does you ye him us me i we all as at on into out up or but so then now also even yea thus when if than ' +
  'more very there here what how because let shalt hath doth thee thy thou am its these those such own').split(' '));
const words = g => String(g).toLowerCase().replace(/[^a-z' ]+/g, ' ').split(' ')
  .filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(eth|est|ing|ed|es|s)$/, '').slice(0, 4));

function loadWin(file) { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { window: w }); return w; }
const conc = loadWin('root_concordance.js')._rootConcordance;
const gloss = loadWin('bom/roots_glossary.js')._rootGlossaryData || {};
const idx = {}; conc.keys.forEach((k, i) => idx[k] = i);
function famWords(key) {
  const out = [];
  const mm = (gloss[key] || {}).meaning; if (mm) out.push.apply(out, words(mm));
  const i = idx[key];
  if (i !== undefined) {
    for (const g of Object.entries(conc.roots[i].g || {}).sort((a, b) => b[1] - a[1]).slice(0, 30))
      out.push.apply(out, words(g[0]));
  }
  return new Set(out);
}

/* Cluster the gloss variants by SENSE before counting. "the year of",
   "year of", "in the year" and "the year" are one sense in four wordings;
   counted as four strings none of them is a majority and the check sleeps
   through the very bug it exists for. Two glosses join a cluster when they
   share a content word. */
function clusters(groups) {
  const cl = [];
  for (const [g, n] of groups) {
    const w = words(g); if (!w.length) continue;
    let put = null;
    for (const c of cl) if (w.some(x => c.words.has(x))) { put = c; break; }
    if (!put) { put = { words: new Set(), n: 0, label: g }; cl.push(put); }
    w.forEach(x => put.words.add(x));
    put.n += n;
  }
  return cl.sort((a, b) => b.n - a.n);
}

/* REVIEWED AND KEPT. Each of these trips the word-overlap test because the
   family's glosses and the form's gloss are the same sense in different
   words — הַבְטָחָה "a promise" against בטח "to trust", הַמַּתָּנָה "the
   gift" against נתן "to give". They were read and are right. The list exists
   so that a NEW finding means something; delete an entry if you change its
   pin, and never add one without reading the card. */
const REVIEWED = new Map([
  ['וְלָהֶם', 'להם'],
  ['יוּשְׁבוּ', 'שוב'],
  ['הַבְטָחָה', 'H0982'],
  ['הַמַּתָּנָה', 'נתן'],
  ['הַנֶּאֱמָרִים', 'אמר'],
  ['יְעֻנֶּה', 'ענה'],
  ['יוּשַׁב', 'שוב'],
  ['אַבָּא', 'H0001'],
  ['הַנֶּאֱמָר', 'אמר']
].map(function (p) { return [p[0], p[1]]; }));

const found = [];
for (const [form, target] of pins) {
  const gm = byForm.get(form); if (!gm) continue;
  const groups = [...gm.entries()].sort((a, b) => b[1] - a[1]);
  const cl = clusters(groups); if (!cl.length) continue;
  const total = cl.reduce((s, c) => s + c.n, 0);
  const top = cl[0];
  if (top.n * 2 <= total) continue;             // no clear majority sense: leave it
  /* BLAST RADIUS. A word-overlap test between a gloss and a family cannot be
     made precise — "sufferings" and "to afflict" are one sense and share no
     stem — so it is useless as a gate at every scale. It is not useless at
     THIS scale: a pin that contradicts the majority sense of a form used ten
     or more times is doing visible damage across the corpus, and that is the
     שְׁנַת case exactly (126 of 128 tokens). Rarer forms are left to the
     chapter reading, which sees them in context. */
  if (top.n < 10) continue;
  const fw = famWords(target); if (!fw.size) continue;
  let agree = false; for (const w of top.words) if (fw.has(w)) agree = true;
  if (agree) continue;                          // the pin agrees with the majority
  if (REVIEWED.get(form) === target) continue;
  found.push({ form, target, topGloss: top.label, topN: top.n, total, groups });
}
if (!found.length) {
  console.log('[pins] ok: no pin follows a minority sense (' + pins.size + ' pins checked)');
  process.exit(0);
}
console.log('[pins] ' + found.length + " pin(s) name a family that says nothing like the form's commonest gloss.");
console.log('[pins] That is how the pin on שְׁנַת made "the year of" read "to sleep". Use a HOMOGRAPH, not a pin.');
for (const f of found) {
  console.log('\n  ' + f.form + '  -> [' + f.target + ']');
  console.log('      commonest gloss: "' + f.topGloss + '"  (' + f.topN + ' of ' + f.total + ' tokens)');
  const other = f.groups.slice(1, 4).map(g => '"' + g[0] + '" x' + g[1]).join(', ');
  if (other) console.log('      also: ' + other);
}
process.exit(1);
