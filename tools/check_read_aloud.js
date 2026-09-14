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
  ['יְהוִה',      'אלוהים',  'where the Masoretes pointed it with Elohim\'s vowels instead' + ' — and then spelled for the voice like every Elohim'],
  ['כׇּל',        'כול',      '"col yamaiu its yamav" — kol, and the qamats qatan is not enough on its own'],
  ['כָּל',        'כול',      'the same word spelled with a plain qamats'],
  ['חׇכְמָה',      'חֹכְמָה',   'U+05C7 is a codepoint she does not know: "chachma" for chochmah'],
  ['וַיָּמׇת',     'וַיָּמֹת',  'the same gap: "vayyamat" for vayyamot'],
  /* SUPERSEDED 2026-09-14. This asserted וַיְהִי -> וַיֶהִי on the claim that
     the sheva under the yod is NA. It is not — וַיְהִי is way-hî, the yod
     closing the syllable — and the segol made her say "vay-YEH-hi", which the
     translator heard in Moses 2:1. The word is excepted in SAY_AS now and its
     case is below. The wayyiqtol rule still covers the rest of the וַיְ class,
     so וַיְדַבֵּר holds it here until those are heard too. */
  ['וַיְדַבֵּר',   'וַיֶדַבֵּר', 'the wayyiqtol segol rule still applies to the rest of the class'],
  ['וַיְדַבֵּר',    'וַיֶדַבֵּר', 'the same weak wayyiqtol, 4,677 words'],
  ['וַיֹּאמֶר',    'וַיֹּאמֶר',  'NOT touched — the yod carries a dagesh here and she reads it right'],
  ['מְצַוֶּה',     'מִצְוֶה',   'the dagesh-vav came out "mitzawe"; mitsveh, and unpointing cannot help — ktiv male makes it מצווה, which is also the noun מִצְוָה'],
  ['וּמְצַוֶּה',    'וּמִצְוֶה',  'the prefixed form: SAY_AS matches a whole token, so it needs its own entry'],
  ['מִצְוָה',      'מִצְוָה',   'NOT touched — the noun keeps its own pointing and its own sound'],
  ['צִוָּה',       'צִוָה',     'the doubled vav read as a shuruk: a /u/ where tsivah belongs — 224 tokens'],
  ['צִוִּיתִי',     'צִוִיתִי',   'the same gemination, 71 tokens'],
  ['עִוֵּר',       'עִוֵר',     'not only the צוה family — 630 forms carry a doubled vav'],
  ['יִוָּדַע',      'יִוָדַע',    'a niphal with it too'],
  ['צֻוָּה',       'צֻוָה',     'the pual: a qubuts is a vowel like any other, so the vav after it is still doubled'],
  ['מְצֻוֶּה',      'מְצֻוֶה',    'the pual participle, the passive of the one the translator ruled on'],
  ['וּבְנֵי',       'וּבְנֵי',    'NOT touched — a word-initial shuruk has no letter before it'],
  ['יָקוּם',       'יָקוּם',    'NOT touched — a real shuruk: the qof it follows has no vowel of its own'],
  ['הוּא',        'הוּא',     'NOT touched — the commonest shuruk in the corpus'],
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
  /* THE DAGESH COMES OFF FOR THE VOICE on letters that cannot spirantize.
     Proved by rendering, not by reading the string: with a dagesh on the
     letter Carmit returns audio byte-identical to the unpointed word, so
     writing the segol alone was INERT. And she renders דָּבָר/דָבָר,
     גָּדוֹל/גָדוֹל, תּוֹרָה/תוֹרָה byte-identical — ג ד ת do not alternate in
     modern Hebrew — while בַּיִת, כֶּסֶף and פֶּה all differ, which is why
     those three keep it. `say -v Carmit -f w.txt -o w.aiff`, compare sizes. */
  ['הַדְּבָרִים', 'הַדֶ בָרִים', 'dalet: sheva voiced AND the dagesh dropped — "ha-de-varim"'],
  ['הַגְּדוֹלָה', 'הַגֶ דוֹלָה', 'gimel: same — it cannot spirantize'],
  ['הַנְּבִיאִים', 'הַנֶ בִיאִים', 'nun: a forte on a non-bgdkpt letter is pure gemination'],
  ['הַבְּרִית', 'הַבֶ רִית', 'bet LOSES its dagesh and stays hard — "ha-be-rit", heard and confirmed'],
  ['מִפְּרִי', 'מִפֶ רִי', 'pe LOSES its dagesh and stays hard — מִפְּנֵי cannot hold this case any more, it is the פֵּנֵי exception now'],
  /* THE NAME IS SPOKEN CORRECTLY OR NOT AT ALL (translator, 2026-09-14:
     "its Elohim! be respectful to the name", "even Carmit needs to be
     respectful by speaking it correctly"). Pointed, she sometimes said
     "elo-YAM". She is handed the modern spelling instead, which she has in
     her lexicon and cannot misread. Every prefix rides along; 4,502 tokens
     in 32 spellings. The DISPLAY keeps its pointing. */
  ['אֱלֹהִים', 'אלוהים', 'Elohim — spoken as modern אלוהים'],
  ['הָאֱלֹהִים', 'האלוהים', 'ha-Elohim — the article rides along (1,256 tokens)'],
  ['וּמֵהָאֱלֹהִים', 'ומהאלוהים', 'stacked prefixes ride along too'],
  ['אֱלֹהֵינוּ', 'אֱלֹהֵינוּ', 'NOT touched — Eloheinu is a different word'],
  ['אֵלִים', 'אֵלִים', 'NOT touched — elim, not Elohim'],
  /* וַיְהִי IS "vay-hi": the sheva is NACH and the yod closes the syllable.
     The wayyiqtol rule writes that sheva as a segol and made it "vay-YEH-hi";
     an identity entry in SAY_AS excepts the word so it reaches her with the
     corpus's own pointing. Chosen by ear from four rendered candidates. */
  ['\u05D5\u05B7\u05D9\u05B0\u05D4\u05B4\u05D9', '\u05D5\u05B7\u05D9\u05B0\u05D4\u05B4\u05D9', 'vay-hi — UNTOUCHED; a segol here says "vay-yehi"'],
  ['\u05D5\u05B7\u05D9\u05B0\u05D4\u05B4\u05D9\u05BE\u05E2\u05B6\u05E8\u05B6\u05D1', '\u05D5\u05B7\u05D9\u05B0\u05D4\u05B4\u05D9 \u05E2\u05B6\u05E8\u05B6\u05D1', 'the maqqef form reaches the exception too'],
  /* פְּנֵי IS THE EXCEPTION TO THE EXCEPTION. Everywhere else the dagesh comes
     off and the sheva becomes a SEGOL; here the dagesh STAYS (it keeps the p
     hard) and the sheva becomes a TSERE. Chosen by ear. It must run BEFORE
     voiceShevaNa, or that rule would voice the same sheva its own way. */
  ['\u05E4\u05B0\u05BC\u05E0\u05B5\u05D9', '\u05E4\u05BC\u05B5\u05E0\u05B5\u05D9', 'p\u2019nei \u2014 hard p, tsere, dagesh KEPT'],
  ['\u05E2\u05B7\u05DC\u05BE\u05E4\u05B0\u05BC\u05E0\u05B5\u05D9', '\u05E2\u05B7\u05DC \u05E4\u05BC\u05B5\u05E0\u05B5\u05D9', 'the maqqef form: split first, so the pe is word-initial and only THIS rule reaches it'],
  ['\u05DE\u05B4\u05E4\u05B0\u05BC\u05E0\u05B5\u05D9', '\u05DE\u05B4\u05E4\u05BC\u05B5\u05E0\u05B5\u05D9', 'the prefixed form takes it too, not the general segol'],
  /* the other vocal-sheva classes (2026-09-14) */
  ['הָיְתָה', 'הָיֶ תָה', 'after a LONG vowel: "ha-ye-ta", not "hayta"'],
  ['שָׁמְעוּ', 'שָׁמֶ עוּ', 'after a long vowel: "sha-me-u"'],
  ['עַבְדְּךָ', 'עַבְדֶ ךָ', 'SECOND of two shevas is the vocal one: "av-de-kha"'],
  ['הִנְנִי', 'הִנֶ נִי', 'before the SAME letter: "hi-ne-ni"'],
  ['יִשְׂרָאֵל', 'יִשְׂרָאֵל', 'NOT touched — a plain nach: "yis-ra-el", never "yi-se-ra-el"'],
  ['לִפְנֵי', 'לִפְנֵי', 'NOT touched — nach after a short vowel: "lif-nei"'],
  ['לָךְ', 'לָךְ', 'NOT touched — a word-FINAL sheva is always nach, long vowel or not'],
  /* the sheva after a dagesh forte is NA and she swallowed it (2026-09-14) */
  ['בַּגְּבוּלוֹת', 'בַּגֶ בוּלוֹת', 'in the borders — "ba-ge-vu-lot"; she read it "bagvulot", and the bet must KEEP its dagesh'],
  ['הַשְּׁבִיעִי', 'הַשֶׁ בִיעִי', 'the seventh — the shin-dot has to survive the substitution'],
  ['בְּרֵאשִׁית', 'בְּרֵאשִׁית', 'NOT touched — a word-initial dagesh is LENE and its sheva already sounds'],
  ['כְּמוֹ', 'כְּמוֹ', 'NOT touched — same reason: no vowel before it, so the dagesh is lene'],
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
/* ── the pairs she renders as silence ─────────────────────────────────────
   A bigram Carmit cannot say takes the WHOLE utterance down with it — onend
   fires, no error, no audio — and the reading walks straight past it. Only a
   full stop between the two words brings it back. Each pair below was proved
   with `say -v Carmit -o f.aiff`: silent renders a header-only 4096-byte
   AIFF, and with the period it renders real audio. */
const join = sb.window.SWReadAloud && sb.window.SWReadAloud.sayJoin;
if (!join) { fail('window.SWReadAloud.sayJoin is gone — the say-stop pairs are unguarded'); process.exit(1); }
const SAY_STOP_CASES = [
  ['בְּשֶׁבֶת', 'אָבִי',      '1 Nephi 8:2 — "this WHOLE phrase is being left off"'],
  ['גִד',      'וְטֵאוֹמְנֶר', 'Alma 58:20 and 58:23 — Gid and Teomner'],
  ['בַר',      'הָאַחֲרוֹן',   'Jacob 5:40 — found by the sweep, not by ear'],
  ['בֹא',      'לְהִלָּחֵם',    'Alma 56:18'],
  ['גִד',      'הָאֵלֶּה',     'Alma 57:36 — Gid again, with a different partner'],
  ['דַם',      'אָחִיךָ',      'Helaman 9:32'],
  ['וַיֹּאמֶר', 'אֵלֵינוּ',    'NOT a stop — an ordinary pair must still be joined by a space'],
];
let joinBad = 0;
for (const [a, b, why] of SAY_STOP_CASES) {
  const wantStop = !/NOT a stop/.test(why);
  const got = join(a, b);
  if ((got === '. ') !== wantStop) {
    joinBad++;
    fail(a + ' + ' + b + ' joined by "' + got + '"\n        ' + why);
  }
}
if (!joinBad) ok(SAY_STOP_CASES.length + ' say-stop pairs join as they must (a period only where she needs one)');

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

/* ── a word that must end its utterance actually does ────────────────────
   Carmit plans prosody across the whole string she is handed, so some words
   are only said correctly when nothing follows them: וְהָאַחֲרִית is
   "acharit" utterance-final and "achari-YAT" otherwise. A period inside the
   phrase does NOT cure it — proved by rendering — so phrases() has to hand
   her two utterances. This checks the split still happens; without it the
   defect returns silently, because nothing else in this file can hear. */
{
  const ph = sb.window.SWReadAloud && sb.window.SWReadAloud.phrases;
  if (typeof ph !== 'function') {
    fail('window.SWReadAloud.phrases is gone — the utterance split is unguarded');
  } else {
    const W = ['\u05D0\u05B2\u05E0\u05B4\u05D9',
               '\u05D4\u05B8\u05E8\u05B5\u05D0\u05E9\u05B4\u05C1\u05D9\u05EA',
               '\u05D5\u05B0\u05D4\u05B8\u05D0\u05B7\u05D7\u05B2\u05E8\u05B4\u05D9\u05EA',
               '\u05D0\u05B5\u05DC', '\u05E9\u05B7\u05C1\u05D3\u05BC\u05B7\u05D9'];
    const units = W.map(function (h) {
      return { getAttribute: function () { return h; },
               querySelector: function () { return { textContent: '' }; } };
    });
    let out = [];
    try { out = ph(units, null) || []; } catch (e) { fail('phrases() threw: ' + e.message); }
    const target = '\u05D5\u05B0\u05D4\u05B8\u05D0\u05B7\u05D7\u05B2\u05E8\u05B4\u05D9\u05EA';
    let good = false;
    out.forEach(function (grp) {
      const hs = grp.map(function (u) { return u.getAttribute('data-h'); });
      const i = hs.indexOf(target);
      if (i >= 0 && i === hs.length - 1) good = true;
    });
    if (!good) fail('\u05D5\u05B0\u05D4\u05B8\u05D0\u05B7\u05D7\u05B2\u05E8\u05B4\u05D9\u05EA no longer ends its utterance \u2014 Moses 2:1 will say "achari-YAT" again');
    else ok('a word that must end its utterance still does (Moses 2:1 splits before \u05D0\u05B5\u05DC)');
  }
}

if (failures) {
  console.error('[read-aloud] ' + failures + ' problem(s). Commit blocked.');
  process.exit(1);
}
console.log('[read-aloud] the voice is unchanged');
