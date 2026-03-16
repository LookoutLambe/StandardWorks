// fetch_english.js — Download English scripture text from bcbooks/scriptures-json
// and convert to the format used by our dual-mode viewer.
//
// Usage: node _build_scripts/fetch_english.js
//
// Output files:
//   ot_english.js   — window._otEnglishData = [{book, chapter, verse, english}, ...]
//   nt_english.js   — window._ntEnglishData = [...]
//   dc_english.js   — window._dcEnglishData = [...]
//   pgp_english.js  — window._pgpEnglishData = [...]

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/bcbooks/scriptures-json/master/flat/';

const VOLUMES = [
  {
    url: BASE + 'old-testament-flat.json',
    output: 'ot_english.js',
    globalVar: '_otEnglishData',
    bookMap: {} // no remapping needed — names match
  },
  {
    url: BASE + 'new-testament-flat.json',
    output: 'nt_english.js',
    globalVar: '_ntEnglishData',
    bookMap: {}
  },
  {
    url: BASE + 'doctrine-and-covenants-flat.json',
    output: 'dc_english.js',
    globalVar: '_dcEnglishData',
    bookMap: {}
  },
  {
    url: BASE + 'pearl-of-great-price-flat.json',
    output: 'pgp_english.js',
    globalVar: '_pgpEnglishData',
    bookMap: {
      // bcbooks uses em-dash names; our code uses hyphenated names
      'Joseph Smith\u2014Matthew': 'JS-Matthew',
      'Joseph Smith\u2014History': 'JS-History'
    }
  }
];

// OT book name mapping: our code uses specific English names in getBookChapter()
// The bcbooks data uses the same names, but we need to verify a few edge cases
const OT_NAME_MAP = {
  "Solomon's Song": 'Song of Songs'  // bcbooks uses "Solomon's Song", our code uses "Song of Songs"
};

const NT_NAME_MAP = {};

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseReference(ref) {
  // "Genesis 1:1" => { book: "Genesis", chapter: 1, verse: 1 }
  // "1 Corinthians 13:4" => { book: "1 Corinthians", chapter: 13, verse: 4 }
  // "D&C 1:1" => { book: "D&C", chapter: 1, verse: 1 }
  const colonIdx = ref.lastIndexOf(':');
  if (colonIdx < 0) return null;
  const verse = parseInt(ref.substring(colonIdx + 1), 10);
  const beforeColon = ref.substring(0, colonIdx);
  const spaceIdx = beforeColon.lastIndexOf(' ');
  if (spaceIdx < 0) return null;
  const book = beforeColon.substring(0, spaceIdx);
  const chapter = parseInt(beforeColon.substring(spaceIdx + 1), 10);
  if (isNaN(verse) || isNaN(chapter)) return null;
  return { book, chapter, verse };
}

async function processVolume(vol) {
  console.log('Fetching', vol.url, '...');
  const raw = await fetch(vol.url);
  const data = JSON.parse(raw);
  const verses = data.verses;
  console.log('  Got', verses.length, 'verses');

  const result = [];
  for (const v of verses) {
    const parsed = parseReference(v.reference);
    if (!parsed) {
      console.warn('  Skipping unparseable:', v.reference);
      continue;
    }
    // Apply book name mapping
    let bookName = parsed.book;
    if (vol.bookMap[bookName]) bookName = vol.bookMap[bookName];
    if (OT_NAME_MAP[bookName]) bookName = OT_NAME_MAP[bookName];
    if (NT_NAME_MAP[bookName]) bookName = NT_NAME_MAP[bookName];

    result.push({
      book: bookName,
      chapter: parsed.chapter,
      verse: parsed.verse,
      english: v.text
    });
  }

  const outPath = path.join(__dirname, '..', vol.output);
  const js = 'window.' + vol.globalVar + ' = ' + JSON.stringify(result) + ';\n';
  fs.writeFileSync(outPath, js, 'utf8');
  console.log('  Wrote', outPath, '(' + (js.length / 1024).toFixed(0) + ' KB,', result.length, 'verses)');
}

async function main() {
  for (const vol of VOLUMES) {
    await processVolume(vol);
  }
  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
