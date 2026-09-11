#!/usr/bin/env node
// build_static_pages.js — the crawlable face of the site: one plain HTML page
// per chapter under hebrew/, plus sitemap.xml.
//
// WHY. Every reader page (ot.html, bom/bom.html, …) draws its chapters with
// JavaScript on ONE url per volume, so a search engine sees six pages with a
// heading each and none of the 1,695 chapters. Checked live 2026-09-11:
// robots.txt and sitemap.xml were 404, the landing cards were onclick
// handlers a crawler cannot follow, and "site:sefermormon.com" surfaced only
// the shell pages. This generator gives the crawler what the reader shows a
// person: the Hebrew, every word with its gloss, and — where the English is
// licensed for that use — the English verse beside it.
//
// WHAT IT WRITES.
//   hebrew/index.html                          the six volumes
//   hebrew/<volume>/index.html                 books × chapter numerals
//   hebrew/<volume>/<book>/<n>.html            one chapter: interlinear + English
//   hebrew/static.css                          the one stylesheet (Indigo & Gold tokens)
//   sitemap.xml                                every page above + the site pages
// robots.txt is hand-written at the root and points at the sitemap.
//
// The pages are DERIVED — never edit one by hand. tools/hooks/pre-commit
// (step 6) rebuilds them whenever verse data, an English column, a book table
// or this file is staged. sync-www.sh excludes hebrew/ and sitemap.xml: the
// iOS app never opens them.
//
// ENGLISH COLUMN — a licence question, not a technical one.
//   bom / dc / pgp : the 2013 English is licensed side-by-side with the Hebrew
//                    (user, 2026-09-04), which is exactly this layout → shown.
//   nt             : KJV, public domain → shown.
//   ot             : KJV aligned to the Masoretic numbering by
//                    tools/build_ot_english_kjv.py (user, 2026-09-11; it
//                    replaced the copyrighted Koren column) → shown.
//   jst            : the JST English column has no licence note on file →
//                    withheld the same way.
// The Hebrew and the glosses are the site's own work in every volume (the OT
// Hebrew is the Masoretic Text, the NT Hebrew Delitzsch — both public domain).
//
// Run directly:  node tools/build_static_pages.js        (≈3 s)

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'hebrew');
const SITE = 'https://sefermormon.com/';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => String(s).toLowerCase()
  .replace(/&/g, 'and').replace(/[—–]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// JS-string escapes in the page tables ('בּ…') → the characters.
const unesc = s => { try { return JSON.parse('"' + s.replace(/"/g, '\\"') + '"'); } catch (e) { return s; } };

// ---------- Hebrew numerals ----------
const GEM = { 'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,'ר':200,'ש':300,'ת':400 };
function gematria(s) {
  let n = 0, seen = false;
  for (const c of String(s || '').replace(/[׳״'"׳״\s]/g, '')) {
    if (!(c in GEM)) return 0;
    n += GEM[c]; seen = true;
  }
  return seen ? n : 0;
}
function hebNum(n) {
  n = Number(n); if (!(n > 0) || n > 999) return String(n);
  const H = ['', 'ק', 'ר', 'ש', 'ת'], T = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], U = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  let s = '';
  let h = Math.floor(n / 100); n %= 100;
  while (h > 4) { s += 'ת'; h -= 4; }
  s += H[h];
  if (n === 15) s += 'טו'; else if (n === 16) s += 'טז';
  else s += T[Math.floor(n / 10)] + U[n % 10];
  return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
}

// ---------- verse data (the search-index builder's sandbox) ----------
function makeAnything() {
  const fn = function () { return anything; };
  const anything = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'valueOf') return () => 0;
      if (k === 'toString') return () => '';
      return anything;
    },
    apply() { return anything; }, construct() { return anything; }, has() { return true; }
  });
  return anything;
}
function captureDir(dir) {
  const sets = {};
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.js$/.test(f) && f !== 'manifest.js').sort()) {
    const sandbox = new Proxy({
      renderVerseSet: function (data, containerId) {
        const id = String(containerId).replace(/-verses$/, '');
        if (Array.isArray(data)) sets[id] = data;
      }
    }, {
      get(t, k) { if (k in t) return t[k]; if (k === Symbol.unscopables) return undefined; return makeAnything(); },
      has() { return true; }
    });
    try { vm.runInNewContext(read(dir + '/' + f), sandbox, { filename: f, timeout: 30000 }); }
    catch (err) { console.warn('  ! %s/%s: %s', dir, f, err.message); }
  }
  return sets;
}
function loadEnglish(file, varName) {
  const win = {};
  vm.runInNewContext(read(file), { window: win }, { filename: file });
  const map = {};
  for (const r of (win[varName] || [])) map[r.book + '|' + r.chapter + '|' + r.verse] = r.english;
  return map;
}

// ---------- book tables (read from the pages: pages hold the data) ----------
function pageTable(page, re) {
  const src = read(page), out = [];
  let m; re.lastIndex = 0;
  while ((m = re.exec(src))) out.push(m);
  return out;
}
const OT_NT_ROW = /\{prefix:'([a-z0-9]+)',\s*en:'([^']+)',\s*he:'([^']*)',\s*ch:(\d+)/g;
function otNtBooks(page) {
  return pageTable(page, OT_NT_ROW).map(m => ({
    en: m[2], he: unesc(m[3]), engKey: m[2], slug: slug(m[2]),
    chapters: Array.from({ length: +m[4] }, (_, i) => ({ id: m[1] + '-ch' + (i + 1), n: i + 1 }))
  }));
}
const BOM_ROW = /\{\s*prefix:\s*'([a-z0-9-]+)',\s*name:\s*'([^']+)',\s*count:\s*(\d+),\s*index:\s*\d+,\s*he:\s*'([^']+)'/g;
function bomBooks() {
  return pageTable('bom/bom.html', BOM_ROW).map(m => ({
    en: m[2], he: m[4], engKey: m[2], slug: slug(m[2]),
    chapters: Array.from({ length: +m[3] }, (_, i) => ({
      id: m[1] + (i + 1), n: i + 1,
      hash: m[2].toLowerCase().replace(/\s+/g, '-') + '-' + (i + 1)   // bom.html's own hash scheme
    }))
  }));
}
function dcBooks(sets) {
  const nums = re => Object.keys(sets).map(id => id.match(re)).filter(Boolean).map(m => +m[1]).sort((a, b) => a - b);
  return [
    { en: 'Doctrine and Covenants', he: 'הַלֶּקַח וְהַבְּרִיתוֹת', engKey: 'D&C', slug: 'sections', label: 'Doctrine and Covenants Section', heUnit: 'סעיף',
      chapters: nums(/^dc(\d+)-ch1$/).map(n => ({ id: 'dc' + n + '-ch1', n })) },
    { en: 'Official Declarations', he: 'הַצְהָרוֹת רִשְׁמִיּוֹת', engKey: 'OD', slug: 'official-declarations', label: 'Official Declaration', heUnit: 'הַצְהָרָה',
      chapters: nums(/^od(\d+)-ch1$/).map(n => ({ id: 'od' + n + '-ch1', n })) }
  ];
}
const PGP_ROW = /\{\s*idPrefix:\s*'([a-z-]+)',\s*en:\s*'([^']+)'/g;
const PGP_NAMES = { 'JS-Matthew': 'Joseph Smith—Matthew', 'JS-History': 'Joseph Smith—History', 'Abraham-Facsimile': 'Facsimile' };
const PGP_HE = { 'Moses': 'מֹשֶׁה', 'Abraham': 'אַבְרָהָם', 'Facsimile': 'תַּבְנִית', 'Joseph Smith—Matthew': 'יוֹסֵף סְמִית — מַתָּי', 'Joseph Smith—History': 'יוֹסֵף סְמִית — תּוֹלָדוֹת', 'Articles of Faith': 'עִקְּרֵי הָאֱמוּנָה' };
function pgpBooks(sets) {
  return pageTable('pgp.html', PGP_ROW).filter(m => m[1] !== 'pgp-intro').map(m => {
    const en = PGP_NAMES[m[2]] || m[2];
    const chapters = [];
    for (let n = 1; sets[m[1] + n]; n++) chapters.push({ id: m[1] + n, n });
    return { en, he: PGP_HE[en] || '', engKey: m[2], slug: slug(en), chapters,
      label: m[1] === 'ab-fac' ? 'Facsimile No.' : null, heUnit: m[1] === 'ab-fac' ? '' : null };
  });
}
const JST_ROW = /\{\s*idPrefix:\s*'(jst[a-z0-9]+-ch)',\s*en:\s*'([^']+)'/g;
function jstBooks() {
  const win = {};
  vm.runInNewContext(read('jst_refmap.js'), { window: win }, { filename: 'jst_refmap.js' });
  const byId = {};
  for (const ref in win._jstRefMap) byId[win._jstRefMap[ref]] = ref;
  return pageTable('jst.html', JST_ROW).map(m => {
    // ids are FILE POSITIONS (jstgen-ch2 = JST Genesis 9); the refmap is the
    // only place the real reference lives, and a position it does not name
    // (jstgen-ch1, a "see the Book of Moses" pointer) is not a chapter.
    const chapters = [];
    for (let i = 1; i <= 200; i++) {
      const id = m[1] + i, ref = byId[id];
      if (!ref) continue;
      chapters.push({ id, n: +(ref.match(/(\d+)$/) || [0, i])[1], label: 'JST ' + ref, filePos: i });
    }
    return { en: m[2], he: '', engKey: m[2], slug: slug(m[2]), chapters, prefix: 'JST ' };
  }).filter(b => b.chapters.length);
}

// ---------- the volumes ----------
const VOLUMES = [
  { key: 'ot', slug: 'old-testament', en: 'Old Testament', he: 'תנ״ך', page: 'ot.html', verseDir: 'ot_verses',
    books: () => otNtBooks('ot.html'), english: ['ot_english.js', '_otEnglishData'],   // KJV since 2026-09-11 (tools/build_ot_english_kjv.py)
    blurb: 'The Tanakh in the Masoretic Text, every word glossed in English, beside the King James text.',
    hebrewNote: 'Masoretic Text' },
  { key: 'nt', slug: 'new-testament', en: 'New Testament', he: 'הברית החדשה', page: 'nt.html', verseDir: 'nt_verses',
    books: () => otNtBooks('nt.html'), english: ['nt_english.js', '_ntEnglishData'],
    blurb: 'The New Testament in Hebrew (Delitzsch), every word glossed, beside the King James text.',
    hebrewNote: 'Delitzsch Hebrew New Testament' },
  { key: 'bom', slug: 'book-of-mormon', en: 'Book of Mormon', he: 'ספר מורמון', page: 'bom/bom.html', verseDir: 'bom/verses',
    books: () => bomBooks(), english: ['bom/official_verses.js', '_officialVersesData'],
    blurb: 'Sefer Mormon: the Book of Mormon in Classical Biblical Hebrew, every word glossed, beside the English.',
    hebrewNote: 'Classical Biblical Hebrew translation' },
  { key: 'dc', slug: 'doctrine-and-covenants', en: 'Doctrine and Covenants', he: 'הלקח והבריתות', page: 'dc.html', verseDir: 'dc_verses',
    books: sets => dcBooks(sets), english: ['dc_english.js', '_dcEnglishData'],
    blurb: 'The Doctrine and Covenants in Hebrew, section by section, every word glossed, beside the English.',
    hebrewNote: 'Hebrew translation' },
  { key: 'pgp', slug: 'pearl-of-great-price', en: 'Pearl of Great Price', he: 'פנינת המחיר הגדול', page: 'pgp.html', verseDir: 'pgp_verses',
    books: sets => pgpBooks(sets), english: ['pgp_english.js', '_pgpEnglishData'],
    blurb: 'The Pearl of Great Price in Hebrew, every word glossed, beside the English.',
    hebrewNote: 'Hebrew translation' },
  { key: 'jst', slug: 'joseph-smith-translation', en: 'Joseph Smith Translation', he: 'תרגום יוסף סמית', page: 'jst.html', verseDir: 'jst_verses',
    books: () => jstBooks(), english: null,
    blurb: 'The Joseph Smith Translation excerpts in Hebrew, every word glossed.',
    hebrewNote: 'Hebrew translation' }
];

// ---------- rendering ----------
const HEB_LETTER = /[א-ת]/;
function verseUnits(words) {
  // [[heb, gloss], …] → units; a token with no Hebrew letter (sof pasuq, a
  // bare maqqef) is punctuation and hangs on the previous word.
  const units = [];
  for (const w of words || []) {
    const heb = String(w[0] || ''), gl = String(w[1] || '');
    if (!HEB_LETTER.test(heb)) { if (units.length && heb) units[units.length - 1].heb += heb; continue; }
    units.push({ heb, gl });
  }
  return units;
}
function renderVerse(v, i, english) {
  const n = gematria(v.num) || (i + 1);
  const units = verseUnits(v.words).map(u =>
    '<span><b>' + esc(u.heb) + '</b><i>' + esc(u.gl) + '</i></span>').join('');   // 27 bytes of markup per word: 560k words × page weight
  const en = english ? '<p class="en">' + esc(english) + '</p>' : '';
  return '<li id="v' + n + '"><span class="n"><a href="#v' + n + '">' + n + '</a></span><p class="he" lang="he" dir="rtl">' + units + '</p>' + en + '</li>';
}
function head(rel, title, desc, canonical, extra) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(desc) + '">\n' +
    '<link rel="canonical" href="' + canonical + '">\n' +
    '<meta property="og:title" content="' + esc(title) + '">\n' +
    '<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:url" content="' + canonical + '">\n' +
    '<meta property="og:type" content="article">\n' +
    '<meta property="og:site_name" content="Sefer Mormon">\n' +
    '<meta property="og:image" content="' + SITE + 'bom/images/cover-hebrew.jpg">\n' +
    '<meta name="theme-color" content="#1B2A41">\n' +
    '<link rel="icon" href="' + rel + 'icons/icon-192.png?v=3">\n' +
    '<link rel="stylesheet" href="' + rel + 'fonts/david_libre.css?v=2">\n' +
    '<link rel="stylesheet" href="' + rel + 'hebrew/static.css?v=1">\n' +
    (extra || '') + '</head>\n';
}
function chrome(rel, crumbs) {
  const trail = crumbs.map((c, i) => c.href
    ? '<a href="' + c.href + '">' + esc(c.text) + '</a>'
    : '<span aria-current="page">' + esc(c.text) + '</span>').join('<span class="sep">›</span>');
  return '<header class="bar"><a class="brand" href="' + rel + '"><span lang="he" dir="rtl">כתבי הקודש</span> Hebrew Interlinear Standard Works</a></header>\n' +
    '<nav class="crumbs" aria-label="Breadcrumb">' + trail + '</nav>\n';
}
function foot(rel) {
  return '<footer class="foot"><p><a href="' + rel + '">sefermormon.com</a> · <a href="' + rel + 'hebrew-study.html">How to read pointed Hebrew</a> · <a href="' + rel + 'hebrew/index.html">All chapters</a></p>' +
    '<p>Hebrew Interlinear Standard Works. The interlinear reader adds transliteration, roots, cross-references, notes and read-aloud.</p></footer>\n</body>\n</html>\n';
}
function breadcrumbLd(items) {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.text, item: it.url }))
  }) + '</script>\n';
}

// "1 Nephi 1", "Doctrine and Covenants Section 76", "Facsimile No. 2", "JST Genesis 9"
function chapterLabel(book, ch) {
  if (ch.label) return ch.label;
  return (book.label || (book.prefix || '') + book.en) + ' ' + ch.n;
}
function chapterHeb(book, ch) {
  if (!book.he) return '';
  const unit = book.heUnit == null ? 'פרק' : book.heUnit;
  return book.he + ' ' + (unit ? unit + ' ' : '') + hebNum(ch.n);
}

function buildVolume(vol, urls) {
  const sets = captureDir(vol.verseDir);
  const books = vol.books(sets);
  const english = vol.english ? loadEnglish(vol.english[0], vol.english[1]) : null;
  const volDir = path.join(OUT, vol.slug);
  const rel = '../../../';
  const flat = [];
  for (const b of books) for (const c of b.chapters) {
    if (!sets[c.id]) { console.warn('  ! %s: no verse set for %s (%s)', vol.key, c.id, chapterLabel(b, c)); continue; }
    flat.push({ b, c, verses: sets[c.id] });
  }
  let pages = 0, missingEn = 0;
  flat.forEach((e, k) => {
    const { b, c, verses } = e;
    const file = vol.slug + '/' + b.slug + '/' + c.n + '.html';
    const url = SITE + 'hebrew/' + file;
    const label = chapterLabel(b, c), heb = chapterHeb(b, c);
    const readerHref = rel + vol.page + '#' + (c.hash || c.id);
    const enKey = n => english && english[b.engKey + '|' + (c.filePos || c.n) + '|' + n];
    const firstEn = english ? enKey(gematria(verses[0] && verses[0].num) || 1) : null;
    const quote = firstEn ? ' “' + (firstEn.length > 110 ? firstEn.slice(0, 110).replace(/\s+\S*$/, '') + '…' : firstEn) + '”' : '';
    const title = label + ' in Hebrew' + (heb ? ' — ' + heb : '') + ' · Sefer Mormon';
    const desc = label + ' in Hebrew, every word with its English gloss' + (english ? ', beside the English text.' : '.') + quote +
      ' ' + vol.en + ' · ' + vol.hebrewNote + '.';
    const prev = flat[k - 1], next = flat[k + 1];
    const navLink = (e2, cls) => !e2 ? '<span class="' + cls + '"></span>'
      : '<a class="' + cls + '" href="../' + e2.b.slug + '/' + e2.c.n + '.html">' +
        (cls === 'prev' ? '← ' : '') + esc(chapterLabel(e2.b, e2.c)) + (cls === 'next' ? ' →' : '') + '</a>';
    const nav = '<nav class="pn">' + navLink(prev, 'prev') + '<a class="up" href="../index.html">' + esc(vol.en) + '</a>' + navLink(next, 'next') + '</nav>\n';
    const crumbs = [
      { text: 'Sefer Mormon', href: rel, url: SITE },
      { text: vol.en, href: '../index.html', url: SITE + 'hebrew/' + vol.slug + '/index.html' },
      { text: label, url }
    ];
    const ld = '<script type="application/ld+json">' + JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Chapter', name: label + ' in Hebrew', url,
      inLanguage: english ? ['he', 'en'] : ['he'], position: c.n,
      isPartOf: { '@type': 'Book', name: vol.en + ' in Hebrew (' + vol.he + ')', url: SITE + vol.page, inLanguage: 'he' }
    }) + '</script>\n' + breadcrumbLd(crumbs);
    let missing = 0;
    const body = verses.map((v, i) => {
      const n = gematria(v.num) || (i + 1);
      const en = enKey(n);
      if (english && !en) missing++;
      return renderVerse(v, i, en);
    }).join('\n');
    missingEn += missing;
    const html = head(rel, title, desc, url, ld) + '<body class="chapter">\n' + chrome(rel, crumbs) +
      '<main>\n<h1>' + esc(label) + (heb ? ' <span class="h1he" lang="he" dir="rtl">' + esc(heb) + '</span>' : '') + '</h1>\n' +
      '<p class="lede">' + esc(vol.hebrewNote) + ', word by word with English glosses' + (english ? ', the English verse beneath each' : '') +
      '. <a class="open" href="' + readerHref + '">Open ' + esc(label) + ' in the interlinear reader</a> for transliteration, roots and notes.</p>\n' +
      nav + '<ol class="verses">\n' + body + '\n</ol>\n' + nav + '</main>\n' + foot(rel);
    fs.mkdirSync(path.join(volDir, b.slug), { recursive: true });
    fs.writeFileSync(path.join(OUT, file), html);
    urls.push(url);
    pages++;
  });

  // the volume index: books × numeral cells
  const vrel = '../../';
  const vurl = SITE + 'hebrew/' + vol.slug + '/index.html';
  const crumbs = [{ text: 'Sefer Mormon', href: vrel, url: SITE }, { text: vol.en, url: vurl }];
  const list = books.filter(b => b.chapters.some(c => sets[c.id])).map(b =>
    '<section class="book"><h2>' + esc(b.en) + (b.he ? ' <span lang="he" dir="rtl">' + esc(b.he) + '</span>' : '') + '</h2>' +
    '<p class="cells">' + b.chapters.filter(c => sets[c.id]).map(c =>
      '<a href="' + b.slug + '/' + c.n + '.html" title="' + esc(chapterLabel(b, c)) + '">' + c.n + '</a>').join('') + '</p></section>').join('\n');
  const vhtml = head(vrel, vol.en + ' in Hebrew — ' + vol.he + ' · Sefer Mormon',
    vol.blurb + ' ' + pages + ' chapters, each a plain page with the Hebrew and its word-by-word English.', vurl, breadcrumbLd(crumbs)) +
    '<body class="volume">\n' + chrome(vrel, crumbs) + '<main>\n<h1>' + esc(vol.en) + ' <span class="h1he" lang="he" dir="rtl">' + esc(vol.he) + '</span></h1>\n' +
    '<p class="lede">' + esc(vol.blurb) + ' <a class="open" href="' + vrel + vol.page + '">Open the ' + esc(vol.en) + ' reader</a>.</p>\n' +
    list + '\n</main>\n' + foot(vrel);
  fs.writeFileSync(path.join(volDir, 'index.html'), vhtml);
  urls.push(vurl);
  console.log('  %s: %d chapter pages%s', vol.key, pages, english ? ' (' + missingEn + ' verses without English)' : '');
  return { vol, pages };
}

function buildHub(summary, urls) {
  const rel = '../';
  const url = SITE + 'hebrew/index.html';
  const crumbs = [{ text: 'Sefer Mormon', href: rel, url: SITE }, { text: 'All chapters', url }];
  const cards = summary.map(s =>
    '<li><a href="' + s.vol.slug + '/index.html"><span class="vhe" lang="he" dir="rtl">' + esc(s.vol.he) + '</span><span class="ven">' + esc(s.vol.en) + '</span><span class="vn">' + s.pages + ' chapters</span></a><p>' + esc(s.vol.blurb) + '</p></li>').join('\n');
  const html = head(rel, 'The Standard Works in Hebrew, chapter by chapter · Sefer Mormon',
    'Every chapter of the Old Testament, New Testament, Book of Mormon, Doctrine and Covenants, Pearl of Great Price and Joseph Smith Translation in Hebrew, word by word with English glosses.', url, breadcrumbLd(crumbs)) +
    '<body class="hub">\n' + chrome(rel, crumbs) + '<main>\n<h1>The Standard Works in Hebrew <span class="h1he" lang="he" dir="rtl">כתבי הקודש</span></h1>\n' +
    '<p class="lede">Plain pages, one per chapter: the Hebrew with every word glossed in English. The <a class="open" href="' + rel + '">interlinear reader</a> adds transliteration, roots, cross-references, notes and read-aloud.</p>\n' +
    '<ul class="volumes">\n' + cards + '\n</ul>\n</main>\n' + foot(rel);
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  urls.push(url);
}

const CSS = `/* generated by tools/build_static_pages.js — the plain chapter pages. Indigo & Gold tokens (reader.css :root / sw_theme.css dark). */
:root{--paper:#FCFAF7;--panel:#F0ECE5;--card:#FFFFFF;--ink:#191713;--ink-2:#554E45;--ink-3:#6D655B;--chrome:#1B2A41;--on-chrome:#F3EDE2;--here:#8E6215;--here-chrome:#DDB768;--rule:#DDD6C9;--link:#1F4E8C}
@media (prefers-color-scheme:dark){:root{--paper:#14120F;--panel:#1C1916;--card:#221E19;--ink:#EDE6DA;--ink-2:#B5A896;--ink-3:#9A8D7C;--chrome:#101823;--on-chrome:#E7E0D4;--here:#D9B45F;--here-chrome:#E6C87E;--rule:#3A342C;--link:#8FB4E8}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 Georgia,'Times New Roman',serif}
a{color:var(--link)}
.bar{background:var(--chrome);color:var(--on-chrome);padding:.6rem 1rem;border-bottom:3px solid var(--here-chrome)}
.bar .brand{color:var(--on-chrome);text-decoration:none;font-size:.95rem;letter-spacing:.01em}
.bar .brand [lang=he]{font-family:'David Libre',serif;font-size:1.15em;margin-right:.5em}
.crumbs{padding:.5rem 1rem;font-size:.85rem;color:var(--ink-3);background:var(--panel);border-bottom:1px solid var(--rule)}
.crumbs .sep{margin:0 .45em;color:var(--ink-3)}
main{max-width:46rem;margin:0 auto;padding:1.25rem 1rem 3rem}
h1{font-size:1.7rem;line-height:1.25;margin:.3rem 0 .6rem;font-weight:600}
h2{font-size:1.15rem;margin:1.4rem 0 .4rem;font-weight:600;border-bottom:1px solid var(--rule);padding-bottom:.2rem}
.h1he,h2 [lang=he]{font-family:'David Libre',serif;font-weight:400;color:var(--ink-2);font-size:.9em;margin-left:.5em;white-space:nowrap}
.lede{color:var(--ink-2);font-size:.95rem;margin:0 0 1rem}
.open{font-weight:600}
.pn{display:flex;justify-content:space-between;align-items:center;gap:1rem;font-size:.9rem;margin:.75rem 0;padding:.4rem 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.pn .up{color:var(--ink-3)}
.verses{list-style:none;margin:0;padding:0}
.verses li{position:relative;padding:.9rem 0 .7rem 2.2rem;border-bottom:1px solid var(--rule)}
.verses .n{position:absolute;left:0;top:1rem;font-size:.8rem;color:var(--here);font-weight:700}
.verses .n a{color:inherit;text-decoration:none}
.he{margin:0;display:flex;flex-wrap:wrap;direction:rtl;gap:.55rem .7rem;font-family:'David Libre',serif}
.he>span{display:inline-flex;flex-direction:column;align-items:center;max-width:100%}
.he b{font-weight:400;font-size:1.5rem;line-height:1.35;color:var(--ink)}
.he i{font-style:normal;direction:ltr;font-family:Georgia,'Times New Roman',serif;font-size:.72rem;line-height:1.2;color:var(--ink-2);text-align:center;max-width:9em}
.en{margin:.75rem 0 0;font-size:.98rem;color:var(--ink);line-height:1.5}
.cells{display:flex;flex-wrap:wrap;gap:.35rem;margin:.3rem 0 0}
.cells a{display:inline-flex;align-items:center;justify-content:center;min-width:2.6rem;height:2.6rem;padding:0 .4rem;border:1px solid var(--rule);border-radius:.35rem;background:var(--card);color:var(--ink);text-decoration:none;font-size:.9rem}
.cells a:hover{border-color:var(--here);color:var(--here)}
.volumes{list-style:none;padding:0;margin:0;display:grid;gap:.9rem}
.volumes li{background:var(--card);border:1px solid var(--rule);border-radius:.5rem;padding:.9rem 1rem}
.volumes li>a{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4em .8em;text-decoration:none;color:var(--ink)}
.volumes .vhe{font-family:'David Libre',serif;font-size:1.5rem;color:var(--here)}
.volumes .ven{font-size:1.1rem;font-weight:600}
.volumes .vn{font-size:.85rem;color:var(--ink-3)}
.volumes p{margin:.35rem 0 0;font-size:.92rem;color:var(--ink-2)}
.foot{max-width:46rem;margin:0 auto;padding:1rem 1rem 2.5rem;font-size:.85rem;color:var(--ink-3);border-top:1px solid var(--rule)}
`;

// ---------- main ----------
function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'static.css'), CSS);
  const urls = [SITE, SITE + 'bom/bom.html', SITE + 'ot.html', SITE + 'nt.html', SITE + 'dc.html', SITE + 'pgp.html', SITE + 'jst.html',
    SITE + 'hebrew-study.html', SITE + 'dictionary.html'];
  const summary = [];
  for (const vol of VOLUMES) {
    try { summary.push(buildVolume(vol, urls)); }
    catch (err) { console.error('  ! %s failed: %s', vol.key, err.stack || err.message); process.exitCode = 1; }
  }
  buildHub(summary, urls);
  const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + esc(u) + '</loc></url>').join('\n') + '\n</urlset>\n';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sm);
  console.log('[static] %d pages, sitemap.xml %d urls', summary.reduce((a, s) => a + s.pages, 0) + summary.length + 1, urls.length);
}
main();
