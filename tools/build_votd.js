// build_votd.js — the front page's verse of the day, one file per Come, Follow Me week.
//
//     node tools/build_votd.js            # this week onward
//     node tools/build_votd.js --review   # also print every pick for reading over
//
// Inputs (all in the repo except the KJV source):
//   tools/cfm_schedule.json     the weeks (Monday to Sunday) and their scripture references
//   tools/votd_overrides.json   the translator's picks: whole weeks (Easter, Christmas) and single days
//   ot_verses/ nt_verses/       the Hebrew, ot_english/ nt_english/ the KJV line
//   ot_crossrefs/ nt_crossrefs/ the footnotes; bom/bom_inverse_crossrefs.js the footnotes that cite the BOM
//   ~/.cache/ot-gloss-audit/kjv/*.usfm   the 1769 KJV (see tools/build_ot_english_kjv.py), for the KJV verse
//                               number of an Old Testament verse the site keys by its Hebrew number
// Output: votd/<monday>.js, each calling window.__votdWeek({...}); read by votd.js on index.html.
//
// THE PICK (user, 2026-10-08: "automatic, you can override"). A week's chapters are scored verse by
// verse by how often the rest of scripture cites them (every footnote of all six volumes, weighted
// by where it comes from: the Book of Mormon and the D&C 4, the Pearl of Great Price 3, the New
// Testament quoting the Old 2, a parallel inside one testament 0.5), plus 2 for each Book of
// Mormon verse the verse's own footnotes cite, plus a quarter of its own footnote count. A verse
// must stand alone on a front page: 25 to 240 characters of English, at most 27 Hebrew words, not
// a genealogy line or an aside, and it loses weight for opening mid-sentence ("Saying...",
// "That..."), for ending on a comma, and for being a list of names. The week's best seven are
// taken (no chapter more than its share) and set in reading order, Monday to Sunday. Each step
// was read against a printed review (--review): footnote counts alone picked "the carcases of
// this people"; unweighted citations picked a king-list and Matthew 1's genealogy.
// An Old Testament verse is shown with its KJV number (Isaiah 9:6), linked by its Hebrew
// one (9:5): the number comes from matching the KJV text the site already pairs with that Hebrew
// verse, and a verse with no one-to-one KJV match (a psalm title folded into verse 1, a split
// verse) is never picked, so a reference on the front page is never off by one.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os');
const R = path.join(__dirname, '..');
const REVIEW = process.argv.includes('--review');

const HEB = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ל': 30, 'מ': 40,
  'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
const hebNum = s => [...String(s)].reduce((t, c) => t + (HEB[c] || 0), 0);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z]+/g, '');

function runFile(file, sandbox) {
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: path.basename(file) });
  return sandbox;
}

// ---------- the two testaments ----------
const VOL = {};
for (const [vol, vdir, edir, xdir, xkey] of [['ot', 'ot_verses', 'ot_english', 'ot_crossrefs', '_otCrossrefsData'],
                                              ['nt', 'nt_verses', 'nt_english', 'nt_crossrefs', '_ntCrossrefsData']]) {
  const books = {};                                   // English name -> { abbr, ch: { n: { v: {he, en} } } }
  for (const f of fs.readdirSync(path.join(R, edir))) {
    if (!f.endsWith('.js')) continue;
    const abbr = f.replace(/\.js$/, '');
    const rows = [];
    runFile(path.join(R, edir, f), { registerEnglish: r => rows.push(...r) });
    if (!rows.length) continue;
    const name = rows[0][0];
    const b = books[name] = { abbr, ch: {} };
    for (const [, c, v, en] of rows) ((b.ch[c] = b.ch[c] || {})[v] = { en });
    const sets = {};
    runFile(path.join(R, vdir, f), { window: {}, self: {}, document: { getElementById: () => null },
      renderVerseSet: (vs, id) => { sets[id] = vs; }, renderWords: () => '' });
    for (const [id, vs] of Object.entries(sets)) {
      const m = id.match(/-ch(\d+)-verses$/); if (!m) continue;
      const c = +m[1];
      for (const verse of vs) {
        const v = hebNum(verse.num), slot = (b.ch[c] = b.ch[c] || {})[v] = b.ch[c][v] || {};
        slot.words = verse.words.map(w => w[0]);
      }
    }
  }
  const W = {};
  for (const f of fs.readdirSync(path.join(R, xdir))) if (f.endsWith('.js')) runFile(path.join(R, xdir, f), { window: W });
  VOL[vol] = { books, xrefs: W[xkey] || {} };
}
const BOMINV = runFile(path.join(R, 'bom/bom_inverse_crossrefs.js'), { window: {} }).window._bomInverseXrefsData || {};
const bomLinks = {};                                  // "Isaiah|53|5" -> number of BOM verses its footnotes cite
for (const [bomKey, list] of Object.entries(BOMINV)) {
  const seen = new Set();
  for (const e of list) if (e.sourceKey && !seen.has(e.sourceKey)) { seen.add(e.sourceKey); bomLinks[e.sourceKey] = (bomLinks[e.sourceKey] || 0) + 1; }
}
const volOf = book => VOL.ot.books[book] ? 'ot' : VOL.nt.books[book] ? 'nt' : '';

// ---------- how often the rest of scripture cites a verse ----------
// A verse's OWN footnote count favours names, dates and judgments (the first build picked "the
// carcases of this people" and "the joints of his loins"). What makes a verse a key verse is that
// other scripture keeps pointing at it, so every footnote in all six volumes is read and each
// citation of an Old or New Testament verse is counted (KJV numbering, as the footnotes write it),
// with the Book of Mormon's own citations counted again.
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
  '1 Jn.': '1 John', '1 John': '1 John', '2 Jn.': '2 John', '3 Jn.': '3 John', 'Jude': 'Jude', 'Rev.': 'Revelation' };
// Weighted by WHERE the citation comes from: parallel accounts inside one testament (Kings and
// Jeremiah, Matthew 1 and 1 Chronicles) cite each other by the dozen and made a king-list and a
// genealogy look like key verses; a Restoration book citing a Bible verse, or the New Testament
// quoting the Old, is the signal that a verse carries doctrine.
const SRC_W = { _crossrefsData: 4, _dcCrossrefsData: 4, _pgpCrossrefsData: 3 };
const srcWeight = (dataKey, tgtVol) => SRC_W[dataKey] ||
  (dataKey === '_ntCrossrefsData' ? (tgtVol === 'ot' ? 2 : 0.5) : (tgtVol === 'nt' ? 1.5 : 0.5));
const citedBy = {}, citedByBom = {};             // "Isaiah|53|5" (KJV numbers) -> weighted citations
{
  const X = {};
  for (const d of ['ot_crossrefs', 'nt_crossrefs', 'dc_crossrefs', 'pgp_crossrefs', 'bom/crossrefs'])
    for (const f of fs.readdirSync(path.join(R, d))) if (f.endsWith('.js')) runFile(path.join(R, d, f), { window: X });
  for (const [dataKey, table] of Object.entries(X)) {
    const fromBom = dataKey === '_crossrefsData';
    for (const list of Object.values(table)) for (const note of list) {
      let book = '';
      for (const r of note.refs || []) {
        const s = String(r).replace(/\s*\(.*\)\s*$/, '').trim();
        let m = s.match(/^((?:\d\s)?[A-Za-z&—. ]+?)\s+(\d+):(\d+)(?:[–-](\d+))?$/), c, v1, v2;
        if (m) { book = ABBR[m[1].trim()] || ''; c = +m[2]; v1 = +m[3]; v2 = m[4] ? +m[4] : v1; }
        else if ((m = s.match(/^(\d+):(\d+)(?:[–-](\d+))?$/)) && book) { c = +m[1]; v1 = +m[2]; v2 = m[3] ? +m[3] : v1; }
        else continue;                            // "v. 51" (the footnoted verse's own chapter) and headings
        if (!book || v2 < v1 || v2 - v1 > 5) continue;
        for (let v = v1; v <= v2; v++) {
          const k = book + '|' + c + '|' + v;
          citedBy[k] = (citedBy[k] || 0) + srcWeight(dataKey, volOf(book));
          if (fromBom) citedByBom[k] = (citedByBom[k] || 0) + 1;
        }
      }
    }
  }
}

// ---------- the KJV numbers of the Old Testament ----------
const KJV_DIR = path.join(os.homedir(), '.cache/ot-gloss-audit/kjv');
const kjv = {};                                       // book -> { byText: norm -> [[c,v]], text: "c:v" -> norm }
for (const f of fs.readdirSync(KJV_DIR).filter(f => f.endsWith('.usfm'))) {
  const src = fs.readFileSync(path.join(KJV_DIR, f), 'utf8');
  const name = (src.match(/^\\h\s+(.+?)\s*$/m) || [])[1];
  if (!name || !VOL.ot.books[name]) continue;
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
function kjvRefOf(book, c, v) {            // Hebrew-numbered OT verse -> its KJV [c, v], or null
  const e = VOL.ot.books[book].ch[c] && VOL.ot.books[book].ch[c][v];
  const hits = e && kjv[book] && kjv[book].byText[norm(e.en)];
  return hits && hits.length === 1 ? hits[0] : null;
}
function hebRefOf(book, c, v) {            // KJV-numbered OT verse -> its Hebrew [c, v], or null
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
function entry(book, c, v, kc, kv) {           // c,v = the site's numbers; kc,kv = the KJV's
  const e = VOL[volOf(book)].books[book].ch[c][v];
  return { ref: book + ' ' + kc + ':' + kv, b: book, c, v, he: hebrewText(e.words), en: e.en };
}
function byKjvRef(ref) {                        // "Isaiah 9:6" -> entry, or throw
  const m = String(ref).match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m || !volOf(m[1])) throw new Error('override reference not understood: ' + ref);
  const [, book, kc, kv] = m;
  const at = volOf(book) === 'ot' ? hebRefOf(book, +kc, +kv) : [+kc, +kv];
  if (!at || !VOL[volOf(book)].books[book].ch[at[0]] || !VOL[volOf(book)].books[book].ch[at[0]][at[1]])
    throw new Error('override reference not found in the site text: ' + ref);
  return entry(book, at[0], at[1], +kc, +kv);
}

// ---------- a week's reading -> its chapters ----------
function chaptersOf(reading) {
  const out = []; let book = '';
  const expand = (b, from, to) => { for (let c = from; c <= to; c++) out.push([b, c]); };
  for (let part of reading.split(';').map(s => s.trim()).filter(Boolean)) {
    let m;
    if ((m = part.match(/^(\d)\s+and\s+(\d)\s+(.+)$/))) { for (const n of [m[1], m[2]]) whole(n + ' ' + m[3]); continue; }
    if ((m = part.match(/^(\d)[–-](\d)\s+(.+)$/))) { for (let n = +m[1]; n <= +m[2]; n++) whole(n + ' ' + m[3]); continue; }
    if ((m = part.match(/^(\d+)(?:[–-](\d+))?$/))) { span(book, m[1], m[2]); continue; }      // "24" after "Exodus 19–20"
    if ((m = part.match(/^(.+?)\s+(\d+)(?:[–-](\d+))?$/)) && volOf(m[1])) { book = m[1]; span(book, m[2], m[3]); continue; }
    if (volOf(part)) { whole(part); continue; }
    if (REVIEW) console.log('   (not in the Hebrew Bible volumes, skipped: ' + part + ')');
  }
  function whole(b) { if (!volOf(b)) return; book = b; for (const c of Object.keys(VOL[volOf(b)].books[b].ch).map(Number).sort((x, y) => x - y)) out.push([b, c]); }
  function span(b, from, to) {
    if (!volOf(b)) return;
    let t = to ? +to : +from;
    if (to && to.length < from.length) t = +(from.slice(0, from.length - to.length) + to);   // "102–3" -> 102–103
    expand(b, +from, t);
  }
  return out;
}

// ---------- the week's seven ----------
function pickWeek(reading) {
  const cand = [];
  chaptersOf(reading).forEach(([book, c], order) => {
    const vol = volOf(book), verses = VOL[vol].books[book].ch[c] || {};
    for (const v of Object.keys(verses).map(Number)) {
      const e = verses[v];
      if (!e.words || !e.en) continue;
      if (e.en.length < 25 || e.en.length > 240 || e.words.length > 27) continue;
      if (/\bbegat\b/.test(e.en) || /^\(/.test(e.en)) continue;     // a genealogy line; a parenthetical aside
      const kr = vol === 'ot' ? kjvRefOf(book, c, v) : [c, v];
      if (!kr) continue;
      const key = book + '|' + c + '|' + v, kkey = book + '|' + kr[0] + '|' + kr[1];
      const refs = (VOL[vol].xrefs[key] || []).reduce((t, n) => t + (n.category === 'cross-ref' && n.refs ? n.refs.length : 0), 0);
      let score = (citedBy[kkey] || 0) + 2 * (bomLinks[key] || 0) + 0.25 * refs;
      // a list of names is a genealogy or a king-list, not a verse to open the day with
      const names = (e.en.slice(1).match(/\b[A-Z][a-z]+/g) || []).filter(w => !/^(LORD|Lord|God|GOD|Christ|Jesus|Holy|Ghost|Spirit|Israel|Zion|Jerusalem|Saviour|Son|Father|Word|Messiah|Redeemer|Lamb|Behold|Thou|Thy|Ye|Yea|For|But|And|O)$/.test(w));
      if (names.length >= 3) score *= 0.5;
      // a front-page verse should stand alone: not "Saying to a stock..." nor one ending on a comma
      if (/^(That|Saying|Which|Who|Whom|To whom|Even|Whereas|Wherein|Whereby)\b/.test(e.en)) score *= 0.6;
      if (!/[.!?:)]['’”]?\s*$/.test(e.en)) score *= 0.7;
      if (!score) continue;
      cand.push({ book, c, v, kc: kr[0], kv: kr[1], score, order, len: e.en.length });
    }
  });
  cand.sort((a, b) => b.score - a.score || a.len - b.len);
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
  picked.sort((a, b) => a.order - b.order || a.v - b.v);
  return picked.map(x => entry(x.book, x.c, x.v, x.kc, x.kv));
}

// ---------- write ----------
const SCHED = JSON.parse(fs.readFileSync(path.join(__dirname, 'cfm_schedule.json'), 'utf8')).weeks;
const OVR = JSON.parse(fs.readFileSync(path.join(__dirname, 'votd_overrides.json'), 'utf8'));
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const today = new Date(); const thisMonday = addDays(iso(today), -((today.getDay() + 6) % 7));
const OUT = path.join(R, 'votd');
fs.mkdirSync(OUT, { recursive: true });
const keep = new Set(); let weeks = 0, days = 0, empty = [];
for (const [start, end, reading] of SCHED) {
  if (end < thisMonday) continue;
  let list = (OVR.weeks || {})[start] ? OVR.weeks[start].map(byKjvRef) : (reading ? pickWeek(reading) : []);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i), o = (OVR.days || {})[d];
    const e = o ? byKjvRef(o) : list[i];
    if (e) out.push(Object.assign({ d }, e));
  }
  if (!out.length) { empty.push(start); continue; }
  const file = start + '.js'; keep.add(file); weeks++; days += out.length;
  fs.writeFileSync(path.join(OUT, file),
    '// generated by tools/build_votd.js from tools/cfm_schedule.json and tools/votd_overrides.json; do not edit\n' +
    'window.__votdWeek && window.__votdWeek(' + JSON.stringify({ week: start, reading: reading || '', days: out }) + ');\n');
  if (REVIEW) {
    console.log('\n' + start + '  ' + (reading || '(overrides)'));
    for (const e of out) console.log('  ' + e.d + '  ' + e.ref.padEnd(22) + e.en.slice(0, 110));
  }
}
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.js') && !keep.has(f)) fs.unlinkSync(path.join(OUT, f));
console.log('votd: ' + weeks + ' weeks, ' + days + ' days written from ' + thisMonday + (empty.length ? '; weeks with nothing to show: ' + empty.join(', ') : ''));
