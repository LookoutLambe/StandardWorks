#!/usr/bin/env node
/**
 * build_search_index.js — generates search_index.js, the cross-volume verse
 * index behind the home page's inline text search.
 *
 * Why this exists: the hub has no verse data loaded, so its search used to
 * hand a word query off to the six volume readers behind an extra click. This
 * precomputes ONE compact file the hub can lazy-load and search directly —
 * Hebrew matches with or without nikkud (both sides reduced to bare
 * consonants with finals folded, same rules as verse_search.js), English
 * matches the translation column.
 *
 * Output: search_index.js → window.SW_SEARCH_INDEX = {
 *   v: <build stamp>,
 *   vols: ['ot','nt','bom','dc','pgp','jst'],
 *   names: { vol → display name },
 *   pages: { vol → reader page },
 *   rows:  { vol → [ [link, ref, hebConsonantal, english], … ] }
 * }
 * link is the reader deep-link hash (bom: "3-nephi-17:4", others:
 * "1sa-ch12&v=3") — the formats the readers already parse.
 *
 * Run: node tools/build_search_index.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

const VOLS = [
  { key: 'ot',  dir: 'ot_verses',  page: 'ot.html',      name: 'Old Testament',       eng: 'ot_english.js',          engVar: '_otEnglishData',      skip: [] },
  { key: 'nt',  dir: 'nt_verses',  page: 'nt.html',      name: 'New Testament',       eng: 'nt_english.js',          engVar: '_ntEnglishData',      skip: [] },
  { key: 'bom', dir: 'bom/verses', page: 'bom/bom.html', name: 'Book of Mormon',      eng: 'bom/official_verses.js', engVar: '_officialVersesData', skip: ['frontmatter.js', 'book_colophons.js'] },
  { key: 'dc',  dir: 'dc_verses',  page: 'dc.html',      name: 'D&C',                 eng: 'dc_english.js',          engVar: '_dcEnglishData',      skip: ['dc_intro.js', 'dc_chron.js'] },
  { key: 'pgp', dir: 'pgp_verses', page: 'pgp.html',     name: 'Pearl of Great Price',eng: 'pgp_english.js',         engVar: '_pgpEnglishData',     skip: ['pgp_intro.js'] },
  { key: 'jst', dir: 'jst_verses', page: 'jst.html',     name: 'JST',                 eng: 'jst_english.js',         engVar: '_jstEnglishData',     skip: ['jst_intro.js'] }
];

// ---------- book display-name tables, as the scorecard builder harvests them ----------
function harvestBooks(file, re, map) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(map(m));
  return out;
}
const books = {
  ot:  harvestBooks('ot.html',  /\{prefix:'([a-z0-9]+)', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] })),
  nt:  harvestBooks('nt.html',  /\{prefix:'([a-z0-9]+)', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] })),
  bom: harvestBooks('bom/bom.html', /\{ prefix: '([a-z0-9-]+)', name: '([^']+)'/g, m => ({ p: m[1], n: m[2] })),
  dc:  [],
  pgp: harvestBooks('pgp.html', /\{prefix:'([a-z0-9]+)-ch', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] })),
  jst: harvestBooks('jst.html', /\{prefix:'([a-z0-9]+)-ch', en:'([^']+)'/g, m => ({ p: m[1] + '-ch', n: m[2] }))
};
if (!books.bom.some(b => b.p === 'ch')) books.bom.unshift({ p: 'ch', n: '1 Nephi' });
Object.keys(books).forEach(k => books[k].sort((a, b) => b.p.length - a.p.length));

// ---------- normalization, mirroring verse_search.js ----------
const POINTS = /[֑-ׇ]/g;
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ' };
function normHeb(s) {
  s = String(s || '').replace(/[׃\[\]]/g, '').replace(POINTS, '').replace(/־/g, ' ');
  let out = '';
  for (let i = 0; i < s.length; i++) out += (FINALS[s.charAt(i)] || s.charAt(i));
  return out.replace(/\s+/g, ' ').trim();
}

// ---------- English translation columns ----------
function loadEnglish(vol) {
  const map = Object.create(null);
  let file = path.join(ROOT, vol.eng);
  if (!fs.existsSync(file)) { console.warn('  ! no english file for %s (%s)', vol.key, vol.eng); return map; }
  const win = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window: win }, { filename: vol.eng });
  const data = win[vol.engVar];
  if (!Array.isArray(data)) { console.warn('  ! %s: %s is not an array', vol.eng, vol.engVar); return map; }
  data.forEach(r => {
    if (!r || r.english === undefined) return;
    map[String(r.book) + '|' + r.chapter + '|' + r.verse] = String(r.english);
  });
  return map;
}

// ---------- walk the verse data (the scorecard builder's sandbox) ----------
function makeAnything() {
  const fn = function () { return anything; };
  const anything = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'valueOf') return () => 0;
      if (k === 'toString') return () => '';
      return anything;
    },
    apply() { return anything; },
    construct() { return anything; },
    has() { return true; }
  });
  return anything;
}
function captureFile(file) {
  const captured = [];
  const sandbox = new Proxy({
    renderVerseSet: function (data, containerId) { captured.push([data, containerId]); }
  }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === Symbol.unscopables) return undefined;
      return makeAnything();
    },
    has() { return true; }
  });
  try {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 30000 });
  } catch (err) {
    console.warn('  ! %s: %s', file, err.message);
  }
  return captured;
}

function bookFor(volKey, chapId) {
  if (volKey === 'dc') {
    let m = chapId.match(/^dc(\d+)-ch/);
    if (m) return { n: 'D&C', ch: m[1] };
    m = chapId.match(/^od(\d+)-ch/);
    if (m) return { n: 'OD', ch: m[1] };
    return null;
  }
  const list = books[volKey] || [];
  for (let i = 0; i < list.length; i++) {
    if (chapId.indexOf(list[i].p) === 0) {
      const rest = chapId.slice(list[i].p.length).replace(/^-?ch/, '');
      return { n: list[i].n, ch: rest || '1' };
    }
  }
  return null;
}

function linkFor(volKey, bookName, chNum, chapId, v) {
  if (volKey === 'bom') {
    return bookName.toLowerCase().replace(/\s+/g, '-') + '-' + chNum + ':' + v;
  }
  return chapId + '&v=' + v;
}

const out = { vols: [], names: {}, pages: {}, rows: {} };
let total = 0;
VOLS.forEach(vol => {
  const eng = loadEnglish(vol);
  const dir = path.join(ROOT, vol.dir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && vol.skip.indexOf(f) < 0).sort();
  const rows = [];
  let missEng = 0;
  files.forEach(f => {
    captureFile(path.join(dir, f)).forEach(pair => {
      const data = pair[0], containerId = String(pair[1] || '');
      if (!Array.isArray(data)) return;
      if (/-colophon$/.test(containerId)) return;
      const chapId = containerId.replace(/-verses$/, '');
      const bk = bookFor(vol.key, chapId);
      if (!bk) return;
      data.forEach((verse, vi) => {
        if (!verse || !Array.isArray(verse.words)) return;
        const v = vi + 1;
        let heb = '';
        verse.words.forEach(w => {
          if (!Array.isArray(w) || !w[0] || w[0] === '׃') return;
          heb += (heb ? ' ' : '') + normHeb(String(w[0]));
        });
        if (!heb) return;
        let e = eng[bk.n + '|' + bk.ch + '|' + v];
        if (e === undefined) {
          e = eng[bk.n.replace(/^JST\s+/, '') + '|' + bk.ch + '|' + v];
        }
        if (e === undefined) { e = ''; missEng++; }
        const ref = bk.n + ' ' + bk.ch + ':' + v;
        rows.push([linkFor(vol.key, bk.n, bk.ch, chapId, v), ref, heb, e]);
        total++;
      });
    });
  });
  out.vols.push(vol.key);
  out.names[vol.key] = vol.name;
  out.pages[vol.key] = vol.page;
  out.rows[vol.key] = rows;
  console.log('%s: %d verses%s', vol.key, rows.length, missEng ? (' (' + missEng + ' without english)') : '');
});

out.v = new Date().toISOString().slice(0, 10);
const payload = 'window.SW_SEARCH_INDEX = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'search_index.js'), payload);
console.log('TOTAL %d verses → search_index.js (%s MB)', total, (payload.length / 1048576).toFixed(2));
