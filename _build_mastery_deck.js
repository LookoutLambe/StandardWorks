// _build_mastery_deck.js
//
// Builds a scripture mastery deck (reference list) using the verse text already
// present in this project:
// - OT: window._otEnglishData (KJV)
// - NT: window._ntEnglishData (KJV)
// - BOM: window._officialVersesData (official English verses)
// - D&C: window._dcEnglishData
// - PGP: window._pgpEnglishData
//
// Usage:
//   node .\\_build_mastery_deck.js
//
// Output:
//   mastery_deck.js  (window.MasteryDeck)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function readText(p) { return fs.readFileSync(p, 'utf8'); }

function loadJson(p) { return JSON.parse(readText(p)); }

function loadWindowData(filePath, varName) {
  const js = readText(filePath);
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { timeout: 20000 });
  return sandbox.window[varName];
}

function keyOf(book, chapter, verse) {
  return `${book}|${chapter}|${verse}`;
}

function makeIndex(arr) {
  const idx = new Map();
  for (const v of arr || []) {
    if (!v) continue;
    const k = keyOf(v.book, v.chapter, v.verse);
    idx.set(k, v.english || '');
  }
  return idx;
}

function inferVolume(book) {
  if (book === 'D&C' || book === 'OD') return 'dc';
  if (book === 'Moses' || book === 'Abraham' || book === 'JS-History' || book === 'JS-Matthew' || book === 'A-of-F') return 'pgp';
  // BOM books
  const bomBooks = new Set(['1 Nephi','2 Nephi','Jacob','Enos','Jarom','Omni','Words of Mormon','Mosiah','Alma','Helaman','3 Nephi','4 Nephi','Mormon','Ether','Moroni']);
  if (bomBooks.has(book)) return 'bom';
  // NT books
  const ntBooks = new Set(['Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation']);
  if (ntBooks.has(book)) return 'nt';
  return 'ot';
}

function refLabel(book, chapter, verseStart, verseEnd) {
  if (verseStart === verseEnd) return `${book} ${chapter}:${verseStart}`;
  return `${book} ${chapter}:${verseStart}–${verseEnd}`;
}

function joinRangeTexts(book, chapter, vs, ve, index) {
  const parts = [];
  for (let v = vs; v <= ve; v++) {
    const t = index.get(keyOf(book, chapter, v));
    if (!t) return { ok: false, text: '' };
    parts.push(t.trim());
  }
  return { ok: true, text: parts.join(' ') };
}

function main() {
  const mastery = loadJson(path.join(ROOT, 'mastery_list.json'));
  const ot = makeIndex(loadWindowData(path.join(ROOT, 'ot_english.js'), '_otEnglishData'));
  const nt = makeIndex(loadWindowData(path.join(ROOT, 'nt_english.js'), '_ntEnglishData'));
  const dc = makeIndex(loadWindowData(path.join(ROOT, 'dc_english.js'), '_dcEnglishData'));
  const pgp = makeIndex(loadWindowData(path.join(ROOT, 'pgp_english.js'), '_pgpEnglishData'));
  const bom = makeIndex(loadWindowData(path.join(ROOT, 'bom', 'official_verses.js'), '_officialVersesData'));

  const deck = [];
  const missing = [];

  for (const it of mastery.verses || []) {
    const book = it.book;
    const chapter = it.chapter;
    const vs = it.verseStart;
    const ve = it.verseEnd;
    const vol = inferVolume(book);

    const index = vol === 'ot' ? ot : vol === 'nt' ? nt : vol === 'dc' ? dc : vol === 'pgp' ? pgp : bom;
    const got = joinRangeTexts(book, chapter, vs, ve, index);
    if (!got.ok) {
      missing.push({ book, chapter, verseStart: vs, verseEnd: ve, volume: vol });
      continue;
    }

    deck.push({
      volume: vol,
      book,
      chapter,
      verseStart: vs,
      verseEnd: ve,
      ref: refLabel(book, chapter, vs, ve),
      text: got.text,
    });
  }

  const out = path.join(ROOT, 'mastery_deck.js');
  const js =
    `// mastery_deck.js (generated)\n` +
    `window.MasteryDeckMeta = ${JSON.stringify({ generatedAt: new Date().toISOString(), source: mastery.source || '', missingCount: missing.length })};\n` +
    `window.MasteryDeck = ${JSON.stringify(deck)};\n`;
  fs.writeFileSync(out, js, 'utf8');

  console.log('Wrote mastery_deck.js');
  console.log('Deck size:', deck.length);
  console.log('Missing:', missing.length);
  if (missing.length) {
    console.log('First missing:', missing[0]);
  }
}

main();

