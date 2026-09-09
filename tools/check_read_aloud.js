#!/usr/bin/env node
/**
 * check_read_aloud.js — the pronunciation rules have no other guard.
 *
 * Every rule in read_aloud.js's spoken() was found the same way: the reader
 * listened, heard Carmit say the wrong thing, and said so. "banav is reading
 * as banaiyu." "tsivitik for tsivitika." "its pronouncing sariah as
 * sa-rai-yaha thats bad." None of that is derivable from the text — it is
 * knowledge about one synthesiser, paid for an evening at a time — and until
 * now nothing in the repo would notice if an edit undid it. A rule can be
 * lost to a careless regex and the only symptom is a word that sounds wrong,
 * in a corpus of 728,289 of them.
 *
 * So this pins the OUTPUT, not the implementation: for each case, the exact
 * string handed to the synthesiser today, with the symptom that produced it.
 * If a rule is rewritten and the output still matches, the test says nothing.
 * If the output moves, the test says which reported bug just came back.
 *
 * Run directly:  node tools/check_read_aloud.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

/* read_aloud.js is a browser IIFE. It wants a window, a document and a few
   listeners at load; readyState 'loading' defers mount() so nothing here
   touches the DOM. It already exports what this needs — window.SWReadAloud
   carries spoken() and phrases() — so there is no test-only seam to keep in
   step with the real thing. */
function load(extra) {
  const sb = {
    MutationObserver: function () { this.observe = function () {}; },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: {}, console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    addEventListener() {}, removeEventListener() {},
  };
  sb.document = {
    readyState: 'loading', addEventListener() {}, body: null,
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, querySelector: () => null }),
  };
  sb.window = sb;
  vm.createContext(sb);
  for (const f of (extra || [])) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'read_aloud.js'), 'utf8'), sb, { filename: 'read_aloud.js' });
  return sb;
}

let failures = 0;
const fail = m => { console.error('[read-aloud] FAIL: ' + m); failures++; };
const ok = m => console.log('[read-aloud] ok: ' + m);
const cp = s => [...s].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');

const sb = load();
const spoken = sb.window.SWReadAloud && sb.window.SWReadAloud.spoken;
if (typeof spoken !== 'function') {
  fail('window.SWReadAloud.spoken is gone — every case below is unguarded');
  process.exit(1);
}

/* ── what the reader heard, and what fixed it ───────────────────────────── */
const CASES = [
  ['יְהוָה',      'אֲדֹנָי',   'the Name carries Adonai\'s vowels; read literally she says "Yehova", the medieval misreading'],
  ['יְהוִה',      'אֱלֹהִים',  'where the Masoretes pointed it with Elohim\'s vowels instead'],
  ['כׇּל',        'כול',      '"col yamaiu its yamav" — kol, and the qamats qatan is not enough on its own'],
  ['כָּל',        'כול',      'the same word spelled with a plain qamats'],
  ['חׇכְמָה',      'חֹכְמָה',   'U+05C7 is a codepoint she does not know: "chachma" for chochmah'],
  ['וַיָּמׇת',     'וַיָּמֹת',  'the same gap: "vayyamat" for vayyamot'],
  ['וַיְהִי',      'וַיֶהִי',   'the sheva under the yod is a sheva na; she dropped the yod and said "vehi"'],
  ['וַיְדַבֵּר',    'וַיֶדַבֵּר', 'the same weak wayyiqtol, 4,677 words'],
  ['וַיֹּאמֶר',    'וַיֹּאמֶר',  'NOT touched — the yod carries a dagesh here and she reads it right'],
  ['יָמָיו',      'ימיו',     'the ־ָיו suffix: "yamaiyu" for yamav'],
  ['בָּנָיו',      'בניו',     '"banav is reading as banaiyu"'],
  ['כׇּל־יָמָיו',  'כול ימיו', 'one token, two words, two different rules — and the maqqef is a SPACE'],
  ['יַחְדָּו',     'יחדיו',    'a consonantal vav read as a vowel'],
  ['עֵשָׂו',      'עשיו',     'the same, for Esau'],
  /* THOSE TWO NAMES WERE THE ONLY FINAL VAV EVER GUARDED, and they are the
     two the rule does NOT touch — so the branch stayed green while it broke
     153 other forms and 807 occurrences. Unpointing handed a bare final vav
     to the modern reader, which takes it for a mater: heard as "darko" for
     "his ways", "lula" for "upon him", "vekhulam" for "and he waited". The
     word-final bet is the same /v/ and keeps every point in place. */
  ['וַיְצַו',      'וַיֶצַב',   '"vaytsav it being pronounced as vi-itstov" — unpointed ויצו is an itpael to her'],
  ['וָאֲצַו',     'וָאֲצַב',   'the same verb in the first person'],
  ['דְּרָכָו',     'דְּרָכָב',   'the archaic ־ָו for ־ָיו: "darko", his way, for derakhav, his ways'],
  ['עָלָו',       'עָלָב',     'upon him — she read the bare form "lula"'],
  ['שָׁלֵו',      'שָׁלֵב',    'at ease; the vav is the last consonant, not a vowel'],
  ['אֶת־לֶחִי',    'אֶת לֶחִי',  'a maqqef between two pointed words: it separates, it does not strip'],
  ['הׇרְגֵהוּ',    'הֹרְגֵהוּ',  'slay him, 1 Nephi 4:12 — the one imperative listed by hand'],
  ['שְׂרָיָה',     'שְׂרָיָע',   '"its pronouncing sariah as sa-rai-yaha thats bad" — the he becomes an ayin'],
  ['חַסְדּוֹ',     'חַסְדּוֹ',   'NOT touched — a vav with a holam of its own is a vowel, not a final consonant'],
];
let bad = 0;
for (const [input, want, why] of CASES) {
  const got = spoken(input);
  if (got !== want) {
    bad++;
    fail(input + ' → ' + got + '\n        expected ' + want +
         '\n        ' + why +
         '\n        got  ' + cp(got) + '\n        want ' + cp(want));
  }
}
if (!bad) ok(CASES.length + ' pronunciation rules still hold (the Name, qamats qatan, weak wayyiqtol, ־ָיו, consonantal vav, Sariah, the maqqef)');

/* ── invariants over the real corpus, not a sample of hand-picked words ───
   Two things must be true of EVERY word this sends to the synthesiser, and
   both have been broken before by a sweep that looked clean on the letters.
   U+05C7 she cannot read at all. The maqqef must never be deleted — "no do
   not strip out the maqqef" — and because U+05BE sits inside the accent
   range [֑-ׇ], the obvious way to write that regex removes it. It has to
   leave as a SPACE, never by fusing its two words into one. */
{
  const files = fs.readdirSync(path.join(ROOT, 'bom', 'verses')).filter(f => f.endsWith('.js'));
  const re = /[֐-״]+(?:־[֐-״]+)*/g;
  let words = 0, qatan = 0, fused = 0, firstQatan = null, firstFused = null;
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, 'bom', 'verses', f), 'utf8');
    for (const m of src.match(re) || []) {
      words++;
      const out = spoken(m);
      if (/ׇ/.test(out) && !qatan++) firstQatan = m + ' → ' + out;
      /* a maqqef in, the same number of words out */
      if (m.indexOf('־') >= 0) {
        const inWords = m.split('־').length, outWords = out.split(' ').length;
        if (outWords < inWords && !fused++) firstFused = m + ' → ' + out;
      }
    }
  }
  if (qatan) fail(qatan + ' words still carry U+05C7 after spoken() — she reads it as an /a/\n        first: ' + firstQatan);
  else ok('no qamats qatan survives into speech (' + words.toLocaleString() + ' Book of Mormon words)');
  if (fused) fail(fused + ' maqqef-joined tokens came back as fewer words — the maqqef was stripped, not spoken\n        first: ' + firstFused);
  else ok('every maqqef separates its words instead of vanishing');
}

/* ── the phrasing table is reached, not just present ─────────────────────
   phrases() falls back to the connective rules when it finds no entry, and
   that fallback is silent: a lookup broken by a key-format change reads the
   whole volume by rule and nothing says so. */
{
  const sb2 = load(['bom/bom_phrase_breaks.js']);
  const table = sb2.window.SW_BREAKS || {};
  const key = '1 Nephi|1|1';
  const n = Object.keys(table).length;
  if (!table[key]) fail('SW_BREAKS has no entry for ' + key + ' — ' + n + ' keys loaded, so the key format has moved');
  else ok('the Book of Mormon phrasing table is keyed as phrases() reads it (' + n.toLocaleString() + ' verses, ' + table[key].length + ' marks on ' + key + ')');
}

if (failures) {
  console.error('[read-aloud] ' + failures + ' problem(s). Commit blocked.');
  process.exit(1);
}
console.log('[read-aloud] the voice is unchanged');
