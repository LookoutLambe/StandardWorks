// _build_mastery_hebrew_deck.js
//
// Builds a scripture mastery deck using HEBREW text from this project's verse datasets.
// The Hebrew is assembled from the per-verse `words` arrays: we join word[0] surfaces.
//
// Usage:
//   node .\\_build_mastery_hebrew_deck.js
//
// Input:
//   mastery_list.json (reference list)
//
// Output:
//   mastery_hebrew_deck.js (window.MasteryHebrewDeck / window.MasteryHebrewDeckMeta)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function readText(p) { return fs.readFileSync(p, 'utf8'); }
function loadJson(p) { return JSON.parse(readText(p)); }

function loadVerseDir(relDir) {
  const dir = path.join(ROOT, relDir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const collected = [];
  const sandbox = {
    renderVerseSet: (verseData, containerId) => collected.push({ containerId, verseData }),
    // Some verse files are also used in-browser and touch DOM helpers before calling renderVerseSet.
    // Stub them so the dataset can still be evaluated in Node.
    document: { getElementById: () => null },
    renderWords: () => {}
  };
  vm.createContext(sandbox);
  for (const f of files) {
    const js = readText(path.join(dir, f));
    try { vm.runInContext(js, sandbox, { timeout: 20000 }); } catch {}
  }
  return collected;
}

function cleanHebToken(t) {
  // Remove sof pasuq marker, keep maqaf if embedded in token.
  const s = String(t || '').replace(/\u05C3/g, '').trim();
  if (!s || s === '׃') return '';
  return s;
}

function verseHebrewString(words) {
  // Join Hebrew surfaces as a readable RTL string.
  // Keep maqaf inside tokens; separate tokens with spaces.
  const toks = [];
  for (const w of words || []) {
    const heb = cleanHebToken(w && w[0]);
    if (!heb) continue;
    toks.push(heb);
  }
  return toks.join(' ').replace(/\s+/g, ' ').trim();
}

function hebrewNumeralToInt(s) {
  const str = String(s || '').trim();
  if (!str) return null;
  // strip gershayim/geresh and whitespace
  const clean = str.replace(/["׳״\s]/g, '');
  const map = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
  };
  let sum = 0;
  for (const ch of clean) {
    const v = map[ch];
    if (!v) return null;
    sum += v;
  }
  return sum || null;
}

function verseNumFrom(v, fallback) {
  if (!v) return fallback;
  if (typeof v.num === 'number') return v.num;
  const raw = String(v.num || '').trim();
  if (!raw) return fallback;
  // Arabic
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  // Hebrew numerals (gematria style)
  const hn = hebrewNumeralToInt(raw);
  if (hn != null) return hn;
  return fallback;
}

// Container-id prefix -> canonical book name mapping (matches mastery_list.json)
const MAP = {
  // OT
  gen: 'Genesis', exo: 'Exodus', lev: 'Leviticus', num: 'Numbers', deu: 'Deuteronomy',
  jos: 'Joshua', jdg: 'Judges', rth: 'Ruth', '1sa': '1 Samuel', '2sa': '2 Samuel',
  '1ki': '1 Kings', '2ki': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
  ezr: 'Ezra', neh: 'Nehemiah', est: 'Esther', job: 'Job', psa: 'Psalms', pro: 'Proverbs',
  ecc: 'Ecclesiastes', sos: 'Song of Solomon', isa: 'Isaiah', jer: 'Jeremiah',
  lam: 'Lamentations', eze: 'Ezekiel', dan: 'Daniel', hos: 'Hosea', joe: 'Joel', amo: 'Amos',
  oba: 'Obadiah', jon: 'Jonah', mic: 'Micah', nah: 'Nahum', hab: 'Habakkuk',
  zep: 'Zephaniah', hag: 'Haggai', zec: 'Zechariah', mal: 'Malachi',
  // NT
  matt: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John', acts: 'Acts', rom: 'Romans',
  '1co': '1 Corinthians', '2co': '2 Corinthians', gal: 'Galatians', eph: 'Ephesians',
  php: 'Philippians', col: 'Colossians', '1th': '1 Thessalonians', '2th': '2 Thessalonians',
  '1ti': '1 Timothy', '2ti': '2 Timothy', tit: 'Titus', phm: 'Philemon', heb: 'Hebrews',
  jas: 'James', '1pe': '1 Peter', '2pe': '2 Peter', '1jn': '1 John', '2jn': '2 John',
  '3jn': '3 John', jude: 'Jude', rev: 'Revelation',
  // BOM
  // Some historical ids used earlier in the project are kept as aliases.
  ch: '1 Nephi',
  n2: '2 Nephi',
  tn: '3 Nephi',
  fn: '4 Nephi',
  // Current container-id prefixes in bom/verses/*.js
  '1n': '1 Nephi', '2n': '2 Nephi', '3n': '3 Nephi', '4n': '4 Nephi',
  jc: 'Jacob', en: 'Enos', jr: 'Jarom', om: 'Omni',
  wm: 'Words of Mormon', mo: 'Mosiah', al: 'Alma', he: 'Helaman',
  mm: 'Mormon', et: 'Ether', mr: 'Moroni',
  // PGP
  ms: 'Moses', ab: 'Abraham', jsh: 'JS-History', jsm: 'JS-Matthew', aof: 'A-of-F',
};

function parseContainerId(containerId) {
  // Examples:
  //   gen-ch1-verses, matt-ch2-verses, mo-ch5-verses, dc1-ch1-verses, ms-ch7-verses, jstgen-ch2-verses
  const cid = String(containerId || '');
  // BOM 1 Nephi uses bare ids like: ch1-verses, ch2-verses, ...
  let m = cid.match(/^ch(\d+)-verses$/);
  if (m) return { book: '1 Nephi', chapter: parseInt(m[1], 10) };

  // D&C special
  m = cid.match(/^(dc(\d+))-ch1-verses$/);
  if (m) return { book: 'D&C', chapter: parseInt(m[2], 10) };
  if (cid === 'od1-ch1-verses') return { book: 'OD', chapter: 1 };
  if (cid === 'od2-ch1-verses') return { book: 'OD', chapter: 2 };

  // JST: prefix like jstgen-ch2-verses -> Genesis chapter 2 (JST still uses Genesis book name)
  m = cid.match(/^jst([a-z0-9]+)-ch(\d+)-verses$/);
  if (m) {
    const book = MAP[m[1]] || m[1];
    return { book, chapter: parseInt(m[2], 10), isJst: true };
  }

  // Standard: <prefix>-ch<num>-verses
  m = cid.match(/^([a-z0-9]+)-ch(\d+)-verses$/);
  if (m) {
    const book = MAP[m[1]] || m[1];
    return { book, chapter: parseInt(m[2], 10) };
  }
  return null;
}

function indexVerseSets(verseSets) {
  // book|chapter|verse -> heb string
  const idx = new Map();
  for (const set of verseSets || []) {
    const info = parseContainerId(set.containerId);
    if (!info) continue;
    const book = info.book;
    const chapter = info.chapter;
    const vdata = set.verseData || [];
    for (let i = 0; i < vdata.length; i++) {
      const v = vdata[i];
      if (!v || !v.words) continue;
      const verseNum = verseNumFrom(v, i + 1);
      const key = `${book}|${chapter}|${verseNum}`;
      const heb = verseHebrewString(v.words);
      if (heb) idx.set(key, heb);
    }
  }
  return idx;
}

function refLabel(book, chapter, verseStart, verseEnd) {
  if (verseStart === verseEnd) return `${book} ${chapter}:${verseStart}`;
  return `${book} ${chapter}:${verseStart}–${verseEnd}`;
}

function joinRange(idx, book, chapter, vs, ve) {
  const parts = [];
  for (let v = vs; v <= ve; v++) {
    const key = `${book}|${chapter}|${v}`;
    const t = idx.get(key);
    if (!t) return { ok: false, text: '' };
    parts.push(t);
  }
  return { ok: true, text: parts.join(' ').replace(/\s+/g, ' ').trim() };
}

function main() {
  const mastery = loadJson(path.join(ROOT, 'mastery_list.json'));

  // Load Hebrew verse datasets
  const idx = new Map();
  const sources = [
    { key: 'ot', dir: 'ot_verses' },
    { key: 'nt', dir: 'nt_verses' },
    { key: 'bom', dir: path.join('bom', 'verses') },
    { key: 'dc', dir: 'dc_verses' },
    { key: 'pgp', dir: 'pgp_verses' },
    { key: 'jst', dir: 'jst_verses' },
  ];

  let totalVerseSets = 0;
  for (const s of sources) {
    const verseSets = loadVerseDir(s.dir);
    totalVerseSets += verseSets.length;
    const local = indexVerseSets(verseSets);
    for (const [k, v] of local.entries()) idx.set(k, v);
  }

  const deck = [];
  const missing = [];

  // Some mastery references are KJV versification while the Hebrew datasets
  // can follow Hebrew versification for a few books (notably Malachi).
  // Normalize a small set of known offsets so the deck is buildable.
  function normalizeRef(book, chapter, verseStart, verseEnd) {
    // Malachi 4:1-6 (KJV) == Malachi 3:19-24 (Hebrew)
    if (book === 'Malachi' && chapter === 4) {
      const shift = 18; // v1 -> 19, v6 -> 24
      return { book, chapter: 3, verseStart: verseStart + shift, verseEnd: verseEnd + shift };
    }
    return { book, chapter, verseStart, verseEnd };
  }

  for (const it of mastery.verses || []) {
    const norm = normalizeRef(it.book, it.chapter, it.verseStart, it.verseEnd);
    const book = norm.book;
    const chapter = norm.chapter;
    const vs = norm.verseStart;
    const ve = norm.verseEnd;
    const got = joinRange(idx, book, chapter, vs, ve);
    if (!got.ok) {
      missing.push({ book, chapter, verseStart: vs, verseEnd: ve });
      continue;
    }
    deck.push({
      book,
      chapter,
      verseStart: vs,
      verseEnd: ve,
      ref: refLabel(book, chapter, vs, ve),
      hebrew: got.text
    });
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    source: mastery.source || '',
    deckSize: deck.length,
    missingCount: missing.length,
    totalIndexedVerses: idx.size,
    totalVerseSetsLoaded: totalVerseSets,
  };

  const out = path.join(ROOT, 'mastery_hebrew_deck.js');
  const js =
    `// mastery_hebrew_deck.js (generated)\n` +
    `window.MasteryHebrewDeckMeta = ${JSON.stringify(meta)};\n` +
    `window.MasteryHebrewDeck = ${JSON.stringify(deck)};\n`;
  fs.writeFileSync(out, js, 'utf8');
  fs.writeFileSync(path.join(ROOT, '_mastery_hebrew_missing.json'), JSON.stringify(missing, null, 2), 'utf8');

  console.log('Wrote mastery_hebrew_deck.js');
  console.log('Deck size:', deck.length);
  console.log('Missing:', missing.length);
  if (missing.length) console.log('First missing:', missing[0]);
}

main();

