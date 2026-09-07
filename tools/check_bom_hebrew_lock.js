#!/usr/bin/env node
// The Book of Mormon Hebrew is LOCKED (user, 2026-09-05: "lock the hebrew to the
// book of mormon only glosses can be changed"). Every Hebrew token sequence in
// bom/verses/*.js is fingerprinted in tools/bom_hebrew_lock.json; this check
// fails when any fingerprint moved, so a commit can change GLOSSES freely but
// never the Hebrew. Wired into .git/hooks/pre-commit right after the drift guard:
//     node "$ROOT/tools/check_bom_hebrew_lock.js" || exit 1
//
//   node tools/check_bom_hebrew_lock.js            verify (exit 1 on any change)
//   node tools/check_bom_hebrew_lock.js --rebase   re-fingerprint the current
//        Hebrew -- ONLY after the user has explicitly approved a Hebrew change.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'bom', 'verses');
const LOCK = path.join(__dirname, 'bom_hebrew_lock.json');
const DECL = /var\s+(\w+)\s*=\s*\[/g;
const VERSE = /\{\s*num:\s*"([^"]+)"\s*,\s*words:\s*\[([\s\S]*?)\]\s*\}/g;
const TOK = /\["([^"]*)","([^"]*)"\]/g;
const POINTS = /[֑-ׇ]/g;
const GEM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,'ר':200,'ש':300,'ת':400};
const gem = s => [...s.replace(POINTS, '')].reduce((a, c) => a + (GEM[c] || 0), 0);
function hebrewOf(body) {
  const out = []; let m; TOK.lastIndex = 0;
  while ((m = TOK.exec(body))) out.push(m[1].normalize('NFC'));
  return out;
}
/* WHAT IS LOCKED IS THE HEBREW, NOT THE CELL BOUNDARIES.
   This joined the tokens with U+001F, so the fingerprint encoded where one
   cell ended and the next began as well as the text itself. Splitting a cell
   that holds two Hebrew words — "אֶת־שֵׁם הַנַּחַל" into "אֶת־שֵׁם" and
   "הַנַּחַל" — changes no letter, no point and no word order, only which gloss
   attaches to which word, and that is gloss-layer work. The lock refused it
   anyway, and refusing a change that cannot touch the text is the lock being
   wrong, not the change.
   Whitespace and the separator are both normalised out now: the fingerprint is
   the verse's Hebrew character sequence, exactly and only. Any letter, point or
   reordering still moves it. Verified first that the only whitespace inside a
   BOM token is a plain word separator — none leading, trailing or exotic. */
const digest = toks => crypto.createHash('sha256')
  .update(toks.join('\u001f').replace(/[\s\u001f]+/g, '')).digest('hex').slice(0, 24);

function fingerprint() {
  const hashes = {};
  for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.js')).sort()) {
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    const decls = [...t.matchAll(DECL)];
    decls.forEach((d, i) => {
      const start = d.index, end = i + 1 < decls.length ? decls[i + 1].index : t.length;
      const block = t.slice(start, end);
      const verses = [...block.matchAll(VERSE)];
      if (verses.length) {
        for (const v of verses) hashes[`${f}:${d[1]}:${gem(v[1])}`] = digest(hebrewOf(v[2]));
      } else {
        const toks = hebrewOf(block);
        if (toks.length) hashes[`${f}:${d[1]}`] = digest(toks);
      }
    });
  }
  return hashes;
}

const now = fingerprint();
if (process.argv.includes('--rebase')) {
  const body = JSON.stringify({
    locked: '2026-09-05',
    note: "Book of Mormon Hebrew is locked: only glosses may change. Re-run with --rebase only on the user's explicit approval of a Hebrew change.",
    hashes: now
  }, null, 1);
  fs.writeFileSync(LOCK, body);
  console.log(`[hebrew-lock] baseline written: ${Object.keys(now).length} Hebrew blocks fingerprinted`);
  process.exit(0);
}
if (!fs.existsSync(LOCK)) {
  console.error('[hebrew-lock] no baseline (tools/bom_hebrew_lock.json); run --rebase once');
  process.exit(1);
}
const base = JSON.parse(fs.readFileSync(LOCK, 'utf8')).hashes;
const changed = [], added = [], removed = [];
for (const k of Object.keys(base)) {
  if (!(k in now)) removed.push(k);
  else if (now[k] !== base[k]) changed.push(k);
}
for (const k of Object.keys(now)) if (!(k in base)) added.push(k);
if (!changed.length && !added.length && !removed.length) {
  console.log(`[hebrew-lock] ok: Book of Mormon Hebrew unchanged (${Object.keys(base).length} blocks)`);
  process.exit(0);
}
console.error('[hebrew-lock] BLOCKED: the Book of Mormon Hebrew is locked; only glosses may change.');
for (const k of changed) console.error(`   changed  ${k}`);
for (const k of added) console.error(`   added    ${k}`);
for (const k of removed) console.error(`   removed  ${k}`);
console.error("   Revert the Hebrew, or -- only with the user's explicit approval of this Hebrew change --");
console.error('   re-baseline: node tools/check_bom_hebrew_lock.js --rebase');
process.exit(1);
