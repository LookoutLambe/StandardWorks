#!/usr/bin/env node
/* build_jst_crossrefs.js — where the JST revises an OT or NT verse.
 *
 * The JST is stored by FILE POSITION (jstgen-ch3), not by the chapter it
 * revises; the source reference lives only in a header comment
 * ("// === CH3: JST Genesis 14:25–40 ==="). This reads those headers, takes the
 * verse numbers from the verses' own num fields (Hebrew numerals), and emits an
 * index the OT and NT pages can use to mark a verse that has a JST version.
 *
 * A JST verse is only indexed when the OT/NT chapter ACTUALLY HAS that verse:
 * much of the JST is added material past the end of the KJV chapter (JST
 * Genesis 14 runs to v40; Genesis 14 has 24 verses), and there is nothing to
 * mark there. Those are reported, not silently mapped.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GEM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,
             'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,
             'ק':100,'ר':200,'ש':300,'ת':400};
const gem = s => [...String(s)].filter(c => GEM[c]).reduce((a, c) => a + GEM[c], 0);

/* book name -> chapter-id prefix, from nav_engine's own VOLUMES — but ONLY the
   OT and NT blocks. The JST volume lists books under the SAME English names
   with jst-prefixed ids, so scanning the whole file mapped "1 Chronicles" to
   jst1ch-ch and every lookup resolved back into the JST. */
const nav = fs.readFileSync(path.join(ROOT, 'nav_engine.js'), 'utf8');
const vstart = nav.indexOf('var VOLUMES = {');
let depth = 0, vend = -1;
for (let i = nav.indexOf('{', vstart); i < nav.length; i++) {
  if (nav[i] === '{') depth++;
  else if (nav[i] === '}') { depth--; if (!depth) { vend = i + 1; break; } }
}
const vctx = { toHebNum: n => String(n) };   // the D&C block builds its sections inline
vm.createContext(vctx);
vm.runInContext('VOLUMES = ' + nav.slice(nav.indexOf('{', vstart), vend) + ';', vctx);
const BOOK = {};
['ot', 'nt'].forEach(function (vk) {
  (vctx.VOLUMES[vk].divisions || []).forEach(function (d) {
    (d.books || []).forEach(function (b) { BOOK[b.en.toLowerCase()] = { id: b.id, prefix: b.prefix }; });
  });
});
BOOK['psalm'] = BOOK['psalms'];               // the JST headers say "Psalm 11"

// which verses each OT/NT chapter actually has
const have = {};
for (const dir of ['ot_verses', 'nt_verses']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
    const cre = /var\s+([a-z0-9_]+)_ch(\d+)Verses\s*=\s*\[/gi;
    let cm;
    while ((cm = cre.exec(src))) {
      const start = cm.index;
      const next = src.indexOf('Verses = [', cre.lastIndex);
      const seg = src.slice(start, next > 0 ? next : src.length);
      const n = (seg.match(/\{\s*num:/g) || []).length;
      have[cm[1].replace(/_/g, '') + '-ch' + cm[2]] = n;
    }
  }
}

const out = {};
const skipped = [];
let indexed = 0, added = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'jst_verses')).sort()) {
  if (!f.endsWith('.js')) continue;
  const stem = f.slice(0, -3);
  const src = fs.readFileSync(path.join(ROOT, 'jst_verses', f), 'utf8');
  const hs = [...src.matchAll(/\/\/ === CH(\d+): (.+?) ===/g)];
  hs.forEach((h, i) => {
    const jstId = stem + '-ch' + h[1];
    const label = h[2];
    const seg = src.slice(h.index, i + 1 < hs.length ? hs[i + 1].index : src.length);
    const nums = [...seg.matchAll(/num:"([^"]+)"/g)].map(m => gem(m[1])).filter(Boolean);
    const m = label.match(/^JST\s+(.+?)\s+(\d+)(?::|$)/);
    if (!m) { skipped.push(jstId + '  ' + label + '  (no parsable reference)'); return; }
    const book = BOOK[m[1].toLowerCase()];
    if (!book) { skipped.push(jstId + '  ' + label + '  (unknown book)'); return; }
    const chapId = book.prefix + m[2];
    const total = have[chapId];
    if (!total) { skipped.push(jstId + '  ' + label + '  (no such chapter: ' + chapId + ')'); return; }
    /* Much of the JST is material added PAST the end of the KJV chapter — JST
       Genesis 14 runs to v40 where Genesis 14 has 24 verses. The user's rule:
       "for like Genesis 14:24 put a mark under the verse for JST link" — so an
       addition anchors to the chapter's LAST verse, which is where it attaches,
       rather than being dropped for having no counterpart. */
    nums.forEach(v => {
      const at = v > total ? total : v;
      if (v > total) added++;
      /* Keep the JST's OWN verse number too: an addition anchored to Genesis
         14:24 lives at JST Genesis 14:25, so linking with the anchor's number
         would land on a verse the JST chapter does not have. First one wins —
         several additions can share an anchor, and the link opens at the start
         of the added run. */
      /* Third slot marks WHICH KIND this is, because the two read differently
         and the user wants them placed differently: an in-place revision of
         this very verse gets its mark beside the verse NUMBER, while material
         added past the end of the chapter gets it BELOW the verse it attaches
         to. 1 = added, absent = in place. */
      const bucket = (out[chapId] = out[chapId] || {});
      if (!bucket[at]) bucket[at] = (v > total) ? [jstId, v, 1] : [jstId, v];
      indexed++;
    });
  });
}
fs.writeFileSync(path.join(ROOT, 'jst_crossrefs.js'),
  '// generated by tools/build_jst_crossrefs.js — OT/NT chapter -> { verse: JST chapter id }\n' +
  'window._jstCrossrefs = ' + JSON.stringify(out) + ';\n', 'utf8');
console.log('chapters marked: ' + Object.keys(out).length + '   verses marked: ' + indexed);
console.log('of those, anchored to the chapter\'s last verse (added material): ' + added);
console.log('not marked: ' + skipped.length);
skipped.slice(0, 14).forEach(s => console.log('   ' + s));
if (skipped.length > 14) console.log('   ... and ' + (skipped.length - 14) + ' more');
