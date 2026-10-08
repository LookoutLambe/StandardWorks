// build_votd.js — the front page's verse of the day, one file per Come, Follow Me week.
//
//     node tools/build_votd.js            # this week through the end of the study year three on
//     node tools/build_votd.js --review   # also print every pick for reading over
//     node tools/build_votd.js --years 5  # further ahead
//
// Inputs (all in the repo except the KJV source):
//   tools/cfm_schedule.json     the cycle's four official years: weeks (Monday to Sunday), references, special kinds
//   tools/votd_overrides.json   the translator's picks: special weeks per volume, whole weeks, single days
//   <vol>_verses, <vol>_english, <vol>_crossrefs for the Old and New Testaments, the Book of Mormon
//                               (bom/verses, bom/english, bom/crossrefs), the D&C and the Pearl of Great Price
//   ~/.cache/ot-gloss-audit/kjv/*.usfm   the 1769 KJV (see tools/build_ot_english_kjv.py), for the KJV verse
//                               number of an Old Testament verse the site keys by its Hebrew number
// Output: votd/<monday>.js, each calling window.__votdWeek({...}); read by votd.js on index.html.
//
// THE CYCLE (user, 2026-10-08: "add the BOM and D&C... its the same every 4 years"). Come, Follow
// Me turns Book of Mormon, D&C, Old Testament, New Testament (year % 4 = 0, 1, 2, 3). A study year
// starts on the Monday on or before 1 January (2026: 29 December 2025) and the Church publishes each
// manual a year or so ahead, so a year with no official weeks in the schedule is PROJECTED from the
// year four before it: its intro week first, its Easter week on that year's Easter, its Christmas
// week on that year's Christmas, the ordinary weeks in order between them; a spare week before
// Christmas takes the Christmas verses. When the real manual is published its weeks go into the
// schedule and the projection steps aside for that year.
//
// THE PICK (user, 2026-10-08: "automatic, you can override"). A week's chapters are scored verse by
// verse by how often the rest of scripture cites them: every footnote of all five volumes, weighted
// by where it comes from (SRC_W below: a Restoration book citing a Bible verse, or the New Testament
// quoting the Old, carries doctrine; a parallel inside one book of scripture mostly carries
// history), plus 2 for each Book of Mormon verse the verse's own footnotes cite (Bible, D&C, Pearl
// of Great Price), plus a quarter of its own footnote count. A verse must stand alone on a front
// page: 25 to 240 characters of English, at most 27 Hebrew words, not a genealogy line or an
// aside; it loses weight for opening mid-sentence ("Saying...", "That..."), for ending on a comma,
// and for being a list of names. The week's best seven are taken (no chapter more than its share)
// and set in reading order, Monday to Sunday. Each step was read against a printed review
// (--review): footnote counts alone picked "the carcases of this people"; unweighted citations
// picked a king-list and Matthew 1's genealogy.
// An Old Testament verse is shown with its KJV number (Isaiah 9:6) and linked by its Hebrew one
// (9:5): the number comes from matching the KJV text the site already pairs with that Hebrew verse,
// and a verse with no one-to-one KJV match (a psalm title folded into verse 1, a split verse) is
// never picked, so a reference on the front page is never off by one.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os');
const R = path.join(__dirname, '..');
const REVIEW = process.argv.includes('--review');
const YEARS_AHEAD = +(process.argv[process.argv.indexOf('--years') + 1] || 0) || 3;

const HEB = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ל': 30, 'מ': 40,
  'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
const hebNum = s => [...String(s)].reduce((t, c) => t + (HEB[c] || 0), 0);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z]+/g, '');
function runFile(file, sandbox) {
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: path.basename(file) });
  return sandbox;
}

// ---------- the five volumes ----------
// book names are the site's own keys (the English rows and the footnote keys agree): 'D&C',
// 'JS-History', 'Song of Songs'. DISPLAY gives the reader's form of the few that differ.
const SPECS = [
  { vol: 'ot', vdir: 'ot_verses', edir: 'ot_english', xdir: 'ot_crossrefs', xkey: '_otCrossrefsData' },
  { vol: 'nt', vdir: 'nt_verses', edir: 'nt_english', xdir: 'nt_crossrefs', xkey: '_ntCrossrefsData' },
  { vol: 'bom', vdir: 'bom/verses', edir: 'bom/english', xdir: 'bom/crossrefs', xkey: '_crossrefsData' },
  { vol: 'dc', vdir: 'dc_verses', edir: 'dc_english', xdir: 'dc_crossrefs', xkey: '_dcCrossrefsData' },
  { vol: 'pgp', vdir: 'pgp_verses', edir: 'pgp_english', xdir: 'pgp_crossrefs', xkey: '_pgpCrossrefsData' },
];
const DISPLAY = { 'JS-History': 'Joseph Smith—History', 'JS-Matthew': 'Joseph Smith—Matthew' };
// the reader's own name for the book (READER.books[].en, which NavEngineRefHref looks up), where
// the data files spell it otherwise
const SITE_NAME = { 'JS-History': 'JS\u2014History', 'JS-Matthew': 'JS\u2014Matthew' };
const ALIAS = { 'Doctrine and Covenants': 'D&C', 'Joseph Smith—History': 'JS-History', 'Joseph Smith—Matthew': 'JS-Matthew',
  'The Articles of Faith': 'Articles of Faith', 'Psalm': 'Psalms', 'Song of Solomon': 'Song of Songs' };
const VOL = {}, ORDER = [];                           // ORDER: every book, in the order its files list it
for (const S of SPECS) {
  const books = {};
  for (const f of fs.readdirSync(path.join(R, S.edir)).sort(byCanon)) {
    if (!f.endsWith('.js') || !fs.existsSync(path.join(R, S.vdir, f))) continue;
    const rows = [], W = {};
    runFile(path.join(R, S.edir, f), { registerEnglish: r => rows.push(...r), window: W });
    for (const o of W._officialVersesData || []) rows.push([o.book, o.chapter, o.verse, o.english]);
    if (!rows.length) continue;
    const sets = {};
    runFile(path.join(R, S.vdir, f), { window: {}, self: {}, document: { getElementById: () => null },
      renderVerseSet: (vs, id) => { sets[id] = vs; }, renderWords: () => '' });
    const name = rows[0][0];
    if (!/^[A-Za-z0-9& -]+$/.test(name) || /Introduction/.test(name)) continue;
    for (const [b, c, v, en] of rows) {
      const B = books[b] = books[b] || { ch: {} };
      if (!ORDER.includes(b)) ORDER.push(b);
      ((B.ch[c] = B.ch[c] || {})[v] = B.ch[c][v] || {}).en = en;
    }
    for (const [id, vs] of Object.entries(sets)) {
      let m = id.match(/^dc(\d+)-ch1-verses$/), c;
      if (m) c = +m[1]; else if ((m = id.match(/(?:^|-)ch(\d+)-verses$/))) c = +m[1]; else continue;
      const B = books[name]; if (!B) continue;
      for (const verse of vs) {
        const v = hebNum(verse.num);
        ((B.ch[c] = B.ch[c] || {})[v] = B.ch[c][v] || {}).words = verse.words.map(w => w[0]);
      }
    }
  }
  const W = {};
  for (const f of fs.readdirSync(path.join(R, S.xdir))) if (f.endsWith('.js')) runFile(path.join(R, S.xdir, f), { window: W });
  VOL[S.vol] = { books, xrefs: W[S.xkey] || {} };
}
// file order is alphabetical; the canon is not ("1nephi" < "alma" < "enos"), so the few
// cross-book ranges the schedule uses ("Enos–Words of Mormon") read this list
function byCanon(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
const BOM_ORDER = ['1 Nephi', '2 Nephi', 'Jacob', 'Enos', 'Jarom', 'Omni', 'Words of Mormon', 'Mosiah', 'Alma', 'Helaman',
  '3 Nephi', '4 Nephi', 'Mormon', 'Ether', 'Moroni'];
const volOf = book => { for (const S of SPECS) if (VOL[S.vol].books[book]) return S.vol; return ''; };
const bookName = s => { s = String(s || '').trim(); return volOf(s) ? s : (ALIAS[s] && volOf(ALIAS[s]) ? ALIAS[s] : ''); };
const display = b => DISPLAY[b] || b;
const chaptersIn = b => Object.keys(VOL[volOf(b)].books[b].ch).map(Number).sort((x, y) => x - y);

// ---------- how often the rest of scripture cites a verse ----------
const ABBR = { 'Gen.': 'Genesis', 'Ex.': 'Exodus', 'Lev.': 'Leviticus', 'Num.': 'Numbers', 'Deut.': 'Deuteronomy',
  'Josh.': 'Joshua', 'Judg.': 'Judges', 'Ruth': 'Ruth', '1 Sam.': '1 Samuel', '2 Sam.': '2 Samuel', '1 Kgs.': '1 Kings',
  '2 Kgs.': '2 Kings', '1 Chr.': '1 Chronicles', '2 Chr.': '2 Chronicles', 'Ezra': 'Ezra', 'Neh.': 'Nehemiah',
  'Esth.': 'Esther', 'Job': 'Job', 'Ps.': 'Psalms', 'Psalm': 'Psalms', 'Prov.': 'Proverbs', 'Eccl.': 'Ecclesiastes',
  'Song': 'Song of Songs', 'Isa.': 'Isaiah', 'Jer.': 'Jeremiah', 'Lam.': 'Lamentations', 'Ezek.': 'Ezekiel',
  'Dan.': 'Daniel', 'Hosea': 'Hosea', 'Joel': 'Joel', 'Amos': 'Amos', 'Obad.': 'Obadiah', 'Jonah': 'Jonah',
  'Micah': 'Micah', 'Mic.': 'Micah', 'Nahum': 'Nahum', 'Hab.': 'Habakkuk', 'Zeph.': 'Zephaniah', 'Hag.': 'Haggai',
  'Zech.': 'Zechariah', 'Mal.': 'Malachi', 'Matt.': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
  'Acts': 'Acts', 'Rom.': 'Romans', '1 Cor.': '1 Corinthians', '2 Cor.': '2 Corinthians', 'Gal.': 'Galatians',
  'Eph.': 'Ephesians', 'Philip.': 'Philippians', 'Phil.': 'Philippians', 'Col.': 'Colossians',
  '1 Thes.': '1 Thessalonians', '2 Thes.': '2 Thessalonians', '1 Tim.': '1 Timothy', '2 Tim.': '2 Timothy',
  'Titus': 'Titus', 'Philem.': 'Philemon', 'Heb.': 'Hebrews', 'James': 'James', '1 Pet.': '1 Peter', '2 Pet.': '2 Peter',
  '1 Jn.': '1 John', '1 John': '1 John', '2 Jn.': '2 John', '3 Jn.': '3 John', 'Jude': 'Jude', 'Rev.': 'Revelation',
  '1 Ne.': '1 Nephi', '2 Ne.': '2 Nephi', 'Jacob': 'Jacob', 'Enos': 'Enos', 'Jarom': 'Jarom', 'Omni': 'Omni',
  'W of M': 'Words of Mormon', 'Mosiah': 'Mosiah', 'Alma': 'Alma', 'Hel.': 'Helaman', '3 Ne.': '3 Nephi',
  '4 Ne.': '4 Nephi', 'Morm.': 'Mormon', 'Ether': 'Ether', 'Moro.': 'Moroni', 'D&C': 'D&C', 'Moses': 'Moses',
  'Abr.': 'Abraham', 'JS—M': 'JS-Matthew', 'JS—H': 'JS-History', 'A of F': 'Articles of Faith' };
const SRC_OF = { _otCrossrefsData: 'ot', _ntCrossrefsData: 'nt', _crossrefsData: 'bom', _dcCrossrefsData: 'dc', _pgpCrossrefsData: 'pgp' };
const SRC_W = {                                  // SRC_W[target][source]
  ot:  { ot: 0.5, nt: 2, bom: 4, dc: 4, pgp: 3 },
  nt:  { ot: 1.5, nt: 0.5, bom: 4, dc: 4, pgp: 3 },
  bom: { ot: 3, nt: 3, bom: 1, dc: 4, pgp: 3 },
  dc:  { ot: 3, nt: 3, bom: 3, dc: 1, pgp: 3 },
  pgp: { ot: 2, nt: 2, bom: 3, dc: 3, pgp: 1 } };
const citedBy = {};                              // "Isaiah|53|5" (KJV numbers) -> weighted citations
for (const S of SPECS) {
  const src = S.vol;
  for (const list of Object.values(VOL[src].xrefs)) for (const note of list) {
    let book = '';
    for (const r of note.refs || []) {
      // the footnotes write "1 Ne." with a no-break space; read as a space, or no numbered book is ever counted
      const s = String(r).replace(/\u00a0/g, ' ').replace(/\s*\(.*\)\s*$/, '').trim();
      let m = s.match(/^((?:\d\s)?[A-Za-z&—. ]+?)\s+(\d+):(\d+)(?:[–-](\d+))?$/), c, v1, v2;
      if (m) { book = ABBR[m[1].trim()] || ''; c = +m[2]; v1 = +m[3]; v2 = m[4] ? +m[4] : v1; }
      else if ((m = s.match(/^(\d+):(\d+)(?:[–-](\d+))?$/)) && book) { c = +m[1]; v1 = +m[2]; v2 = m[3] ? +m[3] : v1; }
      else continue;                              // "v. 51" (the footnoted verse's own chapter) and headings
      const tv = volOf(book);
      if (!tv || v2 < v1 || v2 - v1 > 5) continue;
      for (let v = v1; v <= v2; v++) {
        const k = book + '|' + c + '|' + v;
        citedBy[k] = (citedBy[k] || 0) + SRC_W[tv][src];
      }
    }
  }
}
const BOMINV = runFile(path.join(R, 'bom/bom_inverse_crossrefs.js'), { window: {} }).window._bomInverseXrefsData || {};
const bomLinks = {};                             // "Isaiah|53|5" -> number of BOM verses its own footnotes cite
for (const list of Object.values(BOMINV)) {
  const seen = new Set();
  for (const e of list) if (e.sourceKey && !seen.has(e.sourceKey)) { seen.add(e.sourceKey); bomLinks[e.sourceKey] = (bomLinks[e.sourceKey] || 0) + 1; }
}

// ---------- the passages every Latter-day Saint knows ----------
// tools/votd_known.json: the Church's Doctrinal Mastery list. Footnote counts alone ranked
// 2 Nephi 2:25 below "they have brought forth children" (2:20); each verse of a known passage
// gets KNOWN_BONUS, about a well-cited verse's whole score, and may run long (Ether 12:27).
const KNOWN_BONUS = 20;
const KNOWN = new Set();                         // "Ether|12|27" (KJV numbers)
for (const list of Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, 'votd_known.json'), 'utf8')).passages)) {
  for (const ref of list) {
    const m = ref.match(/^(.+?)\s+(\d+):(.+)$/), book = m && bookName(m[1]);
    if (!book) throw new Error('votd_known.json: reference not understood: ' + ref);
    for (const part of m[3].split(',')) {
      const [a, z] = part.trim().split(/[–-]/).map(Number);
      for (let v = a; v <= (z || a); v++) KNOWN.add(book + '|' + m[2] + '|' + v);
    }
  }
}

// ---------- the KJV numbers of the Old Testament ----------
const KJV_DIR = path.join(os.homedir(), '.cache/ot-gloss-audit/kjv');
const kjv = {};                                  // book -> { byText: norm -> [[c,v]], text: "c:v" -> norm }
for (const f of fs.readdirSync(KJV_DIR).filter(f => f.endsWith('.usfm'))) {
  const src = fs.readFileSync(path.join(KJV_DIR, f), 'utf8');
  let name = (src.match(/^\\h\s+(.+?)\s*$/m) || [])[1];
  name = bookName(name);
  if (!name || volOf(name) !== 'ot') continue;
  const k = kjv[name] = { byText: {}, text: {} };
  let c = 0;
  for (const line of src.split('\n')) {
    const mc = line.match(/^\\c\s+(\d+)/); if (mc) { c = +mc[1]; continue; }
    const mv = line.match(/^\\v\s+(\d+)\s+(.*)$/); if (!mv || !c) continue;
    const t = norm(mv[2].replace(/\\f\s.*?\\f\*/g, '').replace(/\\x\s.*?\\x\*/g, '')
      .replace(/\\\+?w\s+([^|\\]*)\|[^\\]*\\\+?w\*/g, '$1').replace(/\\\+?[a-z0-9]+\*?/g, ''));
    (k.byText[t] = k.byText[t] || []).push([c, +mv[1]]);
    k.text[c + ':' + mv[1]] = t;
  }
}
function kjvRefOf(book, c, v) {                  // Hebrew-numbered OT verse -> its KJV [c, v], or null
  const e = VOL.ot.books[book].ch[c] && VOL.ot.books[book].ch[c][v];
  const hits = e && kjv[book] && kjv[book].byText[norm(e.en)];
  return hits && hits.length === 1 ? hits[0] : null;
}
function hebRefOf(book, c, v) {                  // KJV-numbered OT verse -> its Hebrew [c, v], or null
  const t = kjv[book] && kjv[book].text[c + ':' + v]; if (!t) return null;
  const B = VOL.ot.books[book], out = [];
  for (const hc in B.ch) for (const hv in B.ch[hc]) if (norm(B.ch[hc][hv].en) === t) out.push([+hc, +hv]);
  return out.length === 1 ? out[0] : null;
}

// ---------- one verse, ready for the page ----------
function hebrewText(words) {
  return words.filter(w => !/^\(.*\)$/.test(w)).map(w => w.replace(/^\[(.*)\]$/, '$1')).join(' ')
    .replace(/\s+׃/g, '׃').replace(/\s+/g, ' ').trim();
}
function entry(book, c, v, kc, kv) {             // c,v = the site's numbers; kc,kv = the KJV's
  const e = VOL[volOf(book)].books[book].ch[c][v];
  return { ref: display(book) + ' ' + kc + ':' + kv, b: SITE_NAME[book] || book, c, v, he: hebrewText(e.words), en: e.en };
}
function byRef(ref) {                            // "Isaiah 9:6", "Doctrine and Covenants 76:22" -> entry, or throw
  const m = String(ref).match(/^(.+?)\s+(\d+):(\d+)$/);
  const book = m && bookName(m[1]);
  if (!book) throw new Error('reference not understood: ' + ref);
  const kc = +m[2], kv = +m[3];
  const at = volOf(book) === 'ot' ? hebRefOf(book, kc, kv) : [kc, kv];
  const e = at && VOL[volOf(book)].books[book].ch[at[0]] && VOL[volOf(book)].books[book].ch[at[0]][at[1]];
  if (!e || !e.words || !e.en) throw new Error('reference not found in the site text: ' + ref);
  return entry(book, at[0], at[1], kc, kv);
}

// ---------- a week's reading -> its chapters (and verse spans) ----------
function chaptersOf(reading) {
  const out = []; let book = '';
  const push = (b, c, v1, v2) => out.push({ b, c, v1: v1 || 0, v2: v2 || 0 });
  const whole = b => { book = b; for (const c of chaptersIn(b)) push(b, c); };
  const span = (b, from, to) => {
    let t = to ? +to : +from;
    if (to && to.length < from.length) t = +(from.slice(0, from.length - to.length) + to);   // "102–3" -> 102–103
    for (let c = +from; c <= t; c++) push(b, c);
  };
  for (let part of reading.split(';').map(s => s.trim()).filter(Boolean)) {
    part = part.replace(/^The\s+/, '').replace(/\s+and Official Declarations.*$/, '');
    let m;
    if ((m = part.match(/^(\d)\s+and\s+(\d)\s+(.+)$/))) { for (const n of [m[1], m[2]]) if (bookName(n + ' ' + m[3])) whole(bookName(n + ' ' + m[3])); continue; }
    if ((m = part.match(/^(\d)[–-](\d)\s+(.+)$/))) { for (let n = +m[1]; n <= +m[2]; n++) if (bookName(n + ' ' + m[3])) whole(bookName(n + ' ' + m[3])); continue; }
    // across books: "Enos–Words of Mormon", "Mosiah 29–Alma 4", "3 Nephi 27–4 Nephi"
    if ((m = part.match(/^(.+?)(?:\s+(\d+))?[–-]((?:\d\s)?[A-Za-z].*?)(?:\s+(\d+))?$/)) && bookName(m[1]) && bookName(m[3])) {
      const a = bookName(m[1]), z = bookName(m[3]), ia = BOM_ORDER.indexOf(a), iz = BOM_ORDER.indexOf(z);
      if (ia >= 0 && iz > ia) {
        for (let i = ia; i <= iz; i++) {
          const b = BOM_ORDER[i], chs = chaptersIn(b);
          for (const c of chs) if ((i > ia || !m[2] || c >= +m[2]) && (i < iz || !m[4] || c <= +m[4])) push(b, c);
        }
        book = z; continue;
      }
    }
    if ((m = part.match(/^(.+?)\s+(\d+):(\d+)[–-](\d+)$/)) && bookName(m[1])) { book = bookName(m[1]); push(book, +m[2], +m[3], +m[4]); continue; }
    if ((m = part.match(/^(\d+)(?:[–-](\d+))?$/)) && book) { span(book, m[1], m[2]); continue; }   // "24" after "Exodus 19–20"
    if ((m = part.match(/^(.+?)\s+(\d+)(?:[–-](\d+))?$/)) && bookName(m[1])) { book = bookName(m[1]); span(book, m[2], m[3]); continue; }
    if (bookName(part)) { whole(bookName(part)); continue; }
    if (REVIEW) console.log('   (not read: ' + part + ')');
  }
  return out;
}

// ---------- the week's seven ----------
function pickWeek(reading) {
  const cand = [];
  chaptersOf(reading).forEach(({ b: book, c, v1, v2 }, order) => {
    const vol = volOf(book), verses = VOL[vol].books[book].ch[c] || {};
    for (const v of Object.keys(verses).map(Number)) {
      if (v1 && (v < v1 || v > v2)) continue;
      const e = verses[v];
      if (!e.words || !e.en) continue;
      const kr = vol === 'ot' ? kjvRefOf(book, c, v) : [c, v];
      if (!kr) continue;
      const key = book + '|' + c + '|' + v, kkey = book + '|' + kr[0] + '|' + kr[1], known = KNOWN.has(kkey);
      // a verse longer than 240 characters is kept back for a week whose chapters have too few
      // shorter ones (Joseph Smith—History, whose verses run long, would show one day in seven);
      // a known passage competes at any length up to Mosiah 3:19's
      if (e.en.length < 25 || e.en.length > (known ? 480 : 400) || e.words.length > (known ? 50 : 45)) continue;
      const long = !known && (e.en.length > 240 || e.words.length > 27);
      if (/\bbegat\b/.test(e.en) || /^\(/.test(e.en)) continue;     // a genealogy line; a parenthetical aside
      const refs = (VOL[vol].xrefs[key] || []).reduce((t, n) => t + (n.category === 'cross-ref' && n.refs ? n.refs.length : 0), 0);
      let score = (citedBy[kkey] || 0) + (vol === 'bom' ? 0 : 2 * (bomLinks[key] || 0)) + 0.25 * refs + (known ? KNOWN_BONUS : 0);
      // a front-page verse should stand alone: not "Saying to a stock..." nor one ending on a comma
      if (/^(That|Saying|Which|Who|Whom|To whom|Even|Whereas|Wherein|Whereby)\b/.test(e.en)) score *= 0.6;
      if (!/[.!?:)]['’”]?\s*$/.test(e.en)) score *= 0.7;
      // a list of names is a genealogy or a king-list, not a verse to open the day with
      const names = (e.en.slice(1).match(/\b[A-Z][a-z]+/g) || []).filter(w => !/^(LORD|Lord|God|GOD|Christ|Jesus|Holy|Ghost|Spirit|Israel|Zion|Jerusalem|Saviour|Savior|Son|Father|Word|Messiah|Redeemer|Lamb|Behold|Thou|Thy|Ye|Yea|For|But|And|O|I)$/.test(w));
      if (names.length >= 3) score *= 0.5;
      if (!score) continue;
      cand.push({ book, c, v, kc: kr[0], kv: kr[1], score, order, len: e.en.length, long });
    }
  });
  cand.sort((a, b) => a.long - b.long || b.score - a.score || a.len - b.len);
  // the week's best seven, with no chapter taking more than its share (a light cap, so one rich
  // chapter cannot fill the week, but a thin chapter is never forced in either)
  const nCh = new Set(cand.map(x => x.book + '|' + x.c)).size || 1;
  const cap = Math.max(2, Math.ceil(7 / nCh)), per = {}, picked = [];
  for (const x of cand) {
    if (picked.length === 7) break;
    const ck = x.book + '|' + x.c;
    if ((per[ck] || 0) >= cap) continue;
    per[ck] = (per[ck] || 0) + 1; picked.push(x);
  }
  for (const x of cand) if (picked.length < 7 && !picked.includes(x)) picked.push(x);   // short of seven: the cap gives way
  picked.sort((a, b) => a.order - b.order || a.v - b.v);
  return picked.map(x => entry(x.book, x.c, x.v, x.kc, x.kv));
}

// ---------- the calendar: official weeks, and the years projected from them ----------
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
const CYCLE = ['bom', 'dc', 'ot', 'nt'];         // study year % 4
function studyStart(Y) { const d = new Date(Date.UTC(Y, 0, 1, 12)); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return iso(d); }
function easter(Y) {                             // the Gregorian computus
  const a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Y + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}
const SCHED = JSON.parse(fs.readFileSync(path.join(__dirname, 'cfm_schedule.json'), 'utf8')).weeks;
const OFFICIAL = {};                             // study year -> [{start, end, refs, type}]
for (const [start, end, refs, type] of SCHED) {
  // a study year's first Sunday is on or after 1 January and the year before's last is not,
  // so a week belongs to the year its Sunday falls in
  const sy = +addDays(start, 6).slice(0, 4);
  (OFFICIAL[sy] = OFFICIAL[sy] || []).push({ start, end, refs: refs || '', type: type || '' });
}
const memo = {};
function weeksFor(Y) {
  if (memo[Y]) return memo[Y];
  if (OFFICIAL[Y]) return (memo[Y] = OFFICIAL[Y].map(w => Object.assign({ year: Y }, w)));
  if (Y < 2024) return null;
  const src = weeksFor(Y - 4); if (!src) return null;
  const start = studyStart(Y), n = daysBetween(start, studyStart(Y + 1)) / 7;
  const mondays = Array.from({ length: n }, (_, i) => addDays(start, 7 * i));
  const slot = new Array(n).fill(null);
  if (src[0].type === 'intro') slot[0] = { type: 'intro' };
  if (src.some(w => w.type === 'easter')) { const i = mondays.indexOf(addDays(easter(Y), -6)); if (i >= 0) slot[i] = { type: 'easter' }; }
  if (src.some(w => w.type === 'christmas')) { const x = Y + '-12-25', i = mondays.findIndex(m => m <= x && addDays(m, 6) >= x); if (i >= 0) slot[i] = { type: 'christmas' }; }
  const seq = src.filter(w => !['intro', 'easter', 'christmas'].includes(w.type));
  let k = 0;
  for (let i = 0; i < n; i++) if (!slot[i]) slot[i] = k < seq.length ? { refs: seq[k].refs, type: seq[k++].type } : { type: 'christmas', spare: true };
  if (k < seq.length) console.log('votd: ' + Y + ' is shorter than ' + (Y - 4) + ' by ' + (seq.length - k) + ' week(s); dropped: ' + seq.slice(k).map(w => w.refs || w.type).join(', '));
  return (memo[Y] = mondays.map((m, i) => ({ year: Y, start: m, end: addDays(m, 6), refs: slot[i].refs || '', type: slot[i].type || '', spare: !!slot[i].spare, projected: Y - 4 })));
}

// ---------- write ----------
const OVR = JSON.parse(fs.readFileSync(path.join(__dirname, 'votd_overrides.json'), 'utf8'));
const today = new Date();
const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
const thisMonday = addDays(todayStr, -((today.getDay() + 6) % 7));
// a day a reader has already been shown never changes under them: in the week under way, every day
// through tomorrow (Jerusalem is ahead of the machine that runs this) keeps the verse its file
// already has, unless the translator's overrides name that day or that week
const shownThrough = addDays(todayStr, 1);
function shownDays(start) {
  let w = null; const f = path.join(R, 'votd', start + '.js');
  if (start > shownThrough || !fs.existsSync(f)) return {};
  vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: { __votdWeek: x => { w = x; } } });
  const out = {};
  for (const e of (w && w.days) || []) if (e.d <= shownThrough) out[e.d] = e;
  return out;
}
const firstYear = +thisMonday.slice(0, 4) + (thisMonday >= studyStart(+thisMonday.slice(0, 4) + 1) ? 1 : 0);
const OUT = path.join(R, 'votd');
fs.mkdirSync(OUT, { recursive: true });
const keep = new Set(); let nWeeks = 0, nDays = 0; const empty = [], projected = new Set();
for (let Y = firstYear; Y <= firstYear + YEARS_AHEAD; Y++) {
  const vol = CYCLE[Y % 4];
  for (const w of weeksFor(Y) || []) {
    if (w.end < thisMonday) continue;
    if (w.projected) projected.add(Y + ' (from ' + w.projected + ')');
    // a special list may hold a second seven, for the spare week of a longer year (2028 has 53
    // weeks to 2024's 52, so two run up to Christmas); without one the spare week repeats the first
    let special = !w.refs && w.type && ((OVR.specials || {})[vol] || {})[w.type];
    if (special) special = w.spare && special.length >= 14 ? special.slice(7, 14) : special.slice(0, 7);
    let list = (OVR.weeks || {})[w.start] ? OVR.weeks[w.start].map(byRef) : special ? special.map(byRef) : (w.refs ? pickWeek(w.refs) : []);
    const out = [], shown = (OVR.weeks || {})[w.start] ? {} : shownDays(w.start);
    const used = new Set(Object.values(shown).map(e => e.ref));
    for (let i = 0; i < 7; i++) {
      const d = addDays(w.start, i), o = (OVR.days || {})[d];
      // a later day never repeats a verse already shown this week: it takes the next one not shown
      const fresh = shown[d] ? null : list.slice(i).concat(list.slice(0, i)).find(x => !used.has(x.ref));
      const e = o ? byRef(o) : shown[d] || fresh;
      if (e) { used.add(e.ref); out.push(Object.assign({ d }, e)); }
    }
    if (!out.length) { empty.push(w.start + (w.type ? ' (' + w.type + ')' : '')); continue; }
    const file = w.start + '.js'; keep.add(file); nWeeks++; nDays += out.length;
    fs.writeFileSync(path.join(OUT, file),
      '// generated by tools/build_votd.js from tools/cfm_schedule.json and tools/votd_overrides.json; do not edit\n' +
      'window.__votdWeek && window.__votdWeek(' + JSON.stringify({ week: w.start, reading: w.refs || '', days: out }) + ');\n');
    if (REVIEW) {
      console.log('\n' + w.start + '  ' + (w.refs || '(' + w.type + ')') + (w.projected ? '   [projected from ' + w.projected + ']' : ''));
      for (const e of out) console.log('  ' + e.d + '  ' + e.ref.padEnd(30) + e.en.slice(0, 100));
    }
  }
}
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.js') && !keep.has(f)) fs.unlinkSync(path.join(OUT, f));
console.log('votd: ' + nWeeks + ' weeks, ' + nDays + ' days written from ' + thisMonday + ' through study year ' + (firstYear + YEARS_AHEAD) +
  (projected.size ? '; projected: ' + [...projected].join(', ') : '') + (empty.length ? '; weeks with nothing to show: ' + empty.join(', ') : ''));
