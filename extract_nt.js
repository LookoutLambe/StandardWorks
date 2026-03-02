// extract_nt.js — New Testament (Delitzsch Hebrew NT) extraction from BOLLS.life API
// Usage: node extract_nt.js [--book BookName] [--force-fetch]
// Fetches Delitzsch Hebrew NT text, tokenizes, auto-glosses from OT+BOM+PGP+DC dictionary,
// outputs verse JS files to nt_verses/

const fs = require('fs');
const path = require('path');
const https = require('https');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════
const BOM_DIR = path.resolve(__dirname, '..', 'Hebrew BOM');
const BOM_VERSES_DIR = path.join(BOM_DIR, 'verses');
const PGP_VERSES_DIR = path.join(__dirname, 'pgp_verses');
const DC_VERSES_DIR = path.join(__dirname, 'dc_verses');
const OT_VERSES_DIR = path.join(__dirname, 'ot_verses');
const OUTPUT_DIR = path.join(__dirname, 'nt_verses');
const CACHE_DIR = path.join(__dirname, '_cache', 'bolls');
const STRONGS_PATH = path.join(__dirname, '_strongs_hebrew.json');
const DELAY_MS = 250; // ms between API requests

// Parse CLI args
const args = process.argv.slice(2);
const forceFetch = args.includes('--force-fetch');
let onlyBook = null;
const bookIdx = args.indexOf('--book');
if (bookIdx >= 0 && args[bookIdx + 1]) onlyBook = args[bookIdx + 1];

// ═══════════════════════════════════════════════════════════
// BOOK CONFIGURATION — 27 NT Books
// bookNum follows standard Bible numbering (40=Matthew..66=Revelation)
// ═══════════════════════════════════════════════════════════
const NT_BOOKS = [
  // Gospels
  { bookNum: 40, prefix: 'matt', en: 'Matthew',         he: 'מַתָּי',              ch: 28, cat: 'Gospels' },
  { bookNum: 41, prefix: 'mark', en: 'Mark',             he: 'מַרְקוֹס',            ch: 16, cat: 'Gospels' },
  { bookNum: 42, prefix: 'luke', en: 'Luke',             he: 'לוּקָס',              ch: 24, cat: 'Gospels' },
  { bookNum: 43, prefix: 'john', en: 'John',             he: 'יוֹחָנָן',             ch: 21, cat: 'Gospels' },
  // History
  { bookNum: 44, prefix: 'acts', en: 'Acts',             he: 'מַעֲשֵׂי הַשְּׁלִיחִים', ch: 28, cat: 'History' },
  // Pauline Epistles
  { bookNum: 45, prefix: 'rom',  en: 'Romans',           he: 'רוֹמִים',             ch: 16, cat: 'Pauline' },
  { bookNum: 46, prefix: '1co',  en: '1 Corinthians',    he: 'קוֹרִנְתִּים א',       ch: 16, cat: 'Pauline' },
  { bookNum: 47, prefix: '2co',  en: '2 Corinthians',    he: 'קוֹרִנְתִּים ב',       ch: 13, cat: 'Pauline' },
  { bookNum: 48, prefix: 'gal',  en: 'Galatians',        he: 'גָּלָטִים',            ch: 6,  cat: 'Pauline' },
  { bookNum: 49, prefix: 'eph',  en: 'Ephesians',        he: 'אֶפֶסִים',            ch: 6,  cat: 'Pauline' },
  { bookNum: 50, prefix: 'php',  en: 'Philippians',      he: 'פִילִפִּים',           ch: 4,  cat: 'Pauline' },
  { bookNum: 51, prefix: 'col',  en: 'Colossians',       he: 'קוֹלוֹסִים',           ch: 4,  cat: 'Pauline' },
  { bookNum: 52, prefix: '1th',  en: '1 Thessalonians',  he: 'תֶּסָּלוֹנִיקִים א',   ch: 5,  cat: 'Pauline' },
  { bookNum: 53, prefix: '2th',  en: '2 Thessalonians',  he: 'תֶּסָּלוֹנִיקִים ב',   ch: 3,  cat: 'Pauline' },
  { bookNum: 54, prefix: '1ti',  en: '1 Timothy',        he: 'טִימוֹתֵאוֹס א',      ch: 6,  cat: 'Pauline' },
  { bookNum: 55, prefix: '2ti',  en: '2 Timothy',        he: 'טִימוֹתֵאוֹס ב',      ch: 4,  cat: 'Pauline' },
  { bookNum: 56, prefix: 'tit',  en: 'Titus',            he: 'טִיטוֹס',             ch: 3,  cat: 'Pauline' },
  { bookNum: 57, prefix: 'phm',  en: 'Philemon',         he: 'פִילֵימוֹן',           ch: 1,  cat: 'Pauline' },
  // General Epistles
  { bookNum: 58, prefix: 'heb',  en: 'Hebrews',          he: 'עִבְרִים',            ch: 13, cat: 'General' },
  { bookNum: 59, prefix: 'jas',  en: 'James',            he: 'יַעֲקֹב',             ch: 5,  cat: 'General' },
  { bookNum: 60, prefix: '1pe',  en: '1 Peter',          he: 'פֶּטְרוֹס א',          ch: 5,  cat: 'General' },
  { bookNum: 61, prefix: '2pe',  en: '2 Peter',          he: 'פֶּטְרוֹס ב',          ch: 3,  cat: 'General' },
  { bookNum: 62, prefix: '1jn',  en: '1 John',           he: 'יוֹחָנָן א',           ch: 5,  cat: 'General' },
  { bookNum: 63, prefix: '2jn',  en: '2 John',           he: 'יוֹחָנָן ב',           ch: 1,  cat: 'General' },
  { bookNum: 64, prefix: '3jn',  en: '3 John',           he: 'יוֹחָנָן ג',           ch: 1,  cat: 'General' },
  { bookNum: 65, prefix: 'jude', en: 'Jude',             he: 'יְהוּדָה',             ch: 1,  cat: 'General' },
  // Prophecy
  { bookNum: 66, prefix: 'rev',  en: 'Revelation',       he: 'חָזוֹן יוֹחָנָן',       ch: 22, cat: 'Prophecy' },
];

const totalChapters = NT_BOOKS.reduce((s, b) => s + b.ch, 0);

// Filter to single book if requested
const booksToProcess = onlyBook
  ? NT_BOOKS.filter(b => b.en.toLowerCase() === onlyBook.toLowerCase() || b.prefix === onlyBook.toLowerCase())
  : NT_BOOKS;

if (onlyBook && booksToProcess.length === 0) {
  console.error(`ERROR: Book "${onlyBook}" not found. Use English name (e.g., "Matthew") or prefix (e.g., "matt").`);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
function toHebNum(n) {
  if (n <= 0) return '';
  const ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const hundreds = ['','ק','ר','ש','ת'];
  let result = '';
  if (n >= 100) {
    const h = Math.floor(n / 100);
    if (h <= 4) result += hundreds[h];
    else result += 'ת' + hundreds[h - 4];
    n %= 100;
  }
  if (n === 15) return result + 'טו';
  if (n === 16) return result + 'טז';
  if (n >= 10) {
    result += tens[Math.floor(n / 10)];
    n %= 10;
  }
  if (n > 0) result += ones[n];
  return result;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'HebrewStandardWorks/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error(`Timeout for ${url}`)); });
  });
}

function cleanHebrewText(text) {
  if (!text || typeof text !== 'string') return '';
  // Strip HTML tags
  let s = text.replace(/<[^>]+>/g, '');
  // Strip HTML entities
  s = s.replace(/&thinsp;/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  // Strip cantillation marks (te'amim): U+0591 through U+05AF
  s = s.replace(/[\u0591-\u05AF]/g, '');
  // Strip U+FFFD replacement characters (source data corruption)
  s = s.replace(/\uFFFD/g, '');
  // Replace paseq (׀ U+05C0) with space so joined words split into separate tokens
  s = s.replace(/\u05C0/g, ' ');
  // NFC normalize
  s = s.normalize('NFC');
  // Normalize whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ═══════════════════════════════════════════════════════════
// STEP 1: Fetch from BOLLS.life API (with caching)
// ═══════════════════════════════════════════════════════════
async function fetchAllChapters() {
  console.log('=== New Testament Extraction Pipeline (Delitzsch Hebrew NT) ===\n');
  console.log(`Step 1: Fetching from BOLLS.life API...`);
  console.log(`  Books: ${booksToProcess.length}, Total chapters: ${booksToProcess.reduce((s, b) => s + b.ch, 0)}`);
  if (forceFetch) console.log('  (Force fetch mode — ignoring cache)');

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  let fetched = 0, cached = 0, errors = 0;
  let chapterNum = 0;
  const totalCh = booksToProcess.reduce((s, b) => s + b.ch, 0);

  const allBookData = [];

  for (const book of booksToProcess) {
    const bookChapters = [];

    for (let ch = 1; ch <= book.ch; ch++) {
      chapterNum++;
      const cacheFile = path.join(CACHE_DIR, `DHNT_${book.bookNum}_${ch}.json`);

      // Check cache
      if (!forceFetch && fs.existsSync(cacheFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          bookChapters.push({ ch, data });
          cached++;
          continue;
        } catch (e) { /* re-fetch if cache corrupted */ }
      }

      // Fetch from API
      const url = `https://bolls.life/get-text/DHNT/${book.bookNum}/${ch}/`;
      let retries = 0;
      let success = false;

      while (retries < 5 && !success) {
        try {
          process.stdout.write(`  [${chapterNum}/${totalCh}] ${book.en} ${ch}...`);
          const data = await fetchJSON(url);
          fs.writeFileSync(cacheFile, JSON.stringify(data), 'utf8');
          bookChapters.push({ ch, data });
          fetched++;
          success = true;
          console.log(' OK');
          await sleep(DELAY_MS);
        } catch (e) {
          retries++;
          const wait = Math.pow(2, retries) * 1000;
          console.log(` RETRY ${retries} (${e.message}), waiting ${wait/1000}s...`);
          await sleep(wait);
        }
      }

      if (!success) {
        console.log(`  ERROR: Failed to fetch ${book.en} ${ch} after 5 retries`);
        errors++;
        bookChapters.push({ ch, data: null });
      }
    }

    allBookData.push({ book, chapters: bookChapters });
  }

  console.log(`\n  Fetched: ${fetched}, Cached: ${cached}, Errors: ${errors}\n`);
  return allBookData;
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Parse and clean verses
// BOLLS response: [{ pk, verse, text }]
// ═══════════════════════════════════════════════════════════
function parseVerses(allBookData) {
  console.log('Step 2: Parsing and cleaning verses...');
  let totalVerses = 0;

  for (const bd of allBookData) {
    for (const chData of bd.chapters) {
      if (!chData.data || !Array.isArray(chData.data)) {
        chData.verses = [];
        continue;
      }

      chData.verses = chData.data
        .filter(v => v.text && v.text.trim())
        .map(v => ({
          num: v.verse,
          text: cleanHebrewText(v.text)
        }))
        .filter(v => v.text.length > 0);

      totalVerses += chData.verses.length;
    }
  }

  console.log(`  Total verses: ${totalVerses}\n`);
  return totalVerses;
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Build glossing dictionary
// Priority: OT (Tanakh) → BOM → PGP → DC → NT supplement
// ═══════════════════════════════════════════════════════════
function buildDictionary() {
  console.log('Step 3: Building glossing dictionary...');

  function loadVerseFiles(dir) {
    const dict = {};
    if (!fs.existsSync(dir)) return dict;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const pairRegex = /\["([^"]+)","([^"]+)"\]/g;
      let m;
      while ((m = pairRegex.exec(content)) !== null) {
        const heb = m[1].normalize('NFC');
        const gloss = m[2];
        if (heb !== '\u05C3' && gloss !== '' && !gloss.includes('???')) {
          dict[heb] = gloss;
        }
      }
    }
    return dict;
  }

  // Load Strong's Hebrew lexicon as base layer (lowest priority)
  let strongsDict = {};
  if (fs.existsSync(STRONGS_PATH)) {
    strongsDict = JSON.parse(fs.readFileSync(STRONGS_PATH, 'utf8'));
    const norm = {};
    for (const [k, v] of Object.entries(strongsDict)) norm[k.normalize('NFC')] = v;
    strongsDict = norm;
    console.log(`  Strong's lexicon: ${Object.keys(strongsDict).length} entries`);
  }

  // Load TAHOT dictionary (STEPBible - every word form in the Hebrew Bible)
  const TAHOT_PATH = path.join(__dirname, '_tahot_dict.json');
  let tahotDict = {};
  if (fs.existsSync(TAHOT_PATH)) {
    tahotDict = JSON.parse(fs.readFileSync(TAHOT_PATH, 'utf8'));
    console.log(`  TAHOT dictionary: ${Object.keys(tahotDict).length} entries`);
  }

  // Load supplement (proper nouns, Aramaic, morphological forms)
  const SUPP_PATH = path.join(__dirname, '_supplement.json');
  let suppDict = {};
  if (fs.existsSync(SUPP_PATH)) {
    const supp = JSON.parse(fs.readFileSync(SUPP_PATH, 'utf8'));
    suppDict = { ...supp.proper_nouns, ...supp.aramaic, ...supp.morphological };
    console.log(`  Supplement: ${Object.keys(suppDict).length} entries`);
  }

  // Load in priority order — later sources override earlier
  const otDict = loadVerseFiles(OT_VERSES_DIR);
  const bomDict = loadVerseFiles(BOM_VERSES_DIR);
  const pgpDict = loadVerseFiles(PGP_VERSES_DIR);
  const dcDict = loadVerseFiles(DC_VERSES_DIR);
  // Priority: Strong's < TAHOT < OT < BOM < PGP < DC < supplement (supplement highest)
  const glossDict = { ...strongsDict, ...tahotDict, ...otDict, ...bomDict, ...pgpDict, ...dcDict, ...suppDict };

  // NT-specific supplement for proper nouns and theological terms
  // Delitzsch uses these consistently
  const ntSupp = {
    'יֵשׁוּעַ': 'Yeshua',
    'הַמָּשִׁיחַ': 'the-Messiah',
    'מָשִׁיחַ': 'Messiah',
    'הַמָּשִׁיחַ': 'the-Messiah',
    'פֶּטְרוֹס': 'Peter',
    'פּוֹלוֹס': 'Paul',
    'שָׁאוּל': 'Saul',
    'מַתָּי': 'Matthew',
    'מַרְקוֹס': 'Mark',
    'לוּקָס': 'Luke',
    'יוֹחָנָן': 'John',
    'יַעֲקֹב': 'James/Jacob',
    'בַּר־נַבָּא': 'Barnabas',
    'טִימוֹתֵאוֹס': 'Timothy',
    'סִילָס': 'Silas',
    'פִילִפּוֹס': 'Philip',
    'אַנְדְּרֵאָס': 'Andrew',
    'תּוֹמָא': 'Thomas',
    'בַּר־תַּלְמַי': 'Bartholomew',
    'יְהוּדָה': 'Judah/Judas',
    'שִׁמְעוֹן': 'Simon',
    'נְצָרֶת': 'Nazareth',
    'כְּפַר־נָחוּם': 'Capernaum',
    'גָּלִיל': 'Galilee',
    'הַגָּלִיל': 'the-Galilee',
    'יְהוּדָא': 'Judea',
    'שֹׁמְרוֹן': 'Samaria',
    'קֵסָרְיָה': 'Caesarea',
    'אַנְטְיוֹכְיָה': 'Antioch',
    'קוֹרִנְתּוֹס': 'Corinth',
    'אֶפֶסוֹס': 'Ephesus',
    'רוֹמָה': 'Rome',
    'הוֹרְדוֹס': 'Herod',
    'פִּילָטוֹס': 'Pilate',
    'פָּרוּשִׁים': 'Pharisees',
    'צַדּוּקִים': 'Sadducees',
    'סַנְהֶדְרִין': 'Sanhedrin',
    'בְּשׂוֹרָה': 'gospel',
    'הַבְּשׂוֹרָה': 'the-gospel',
    'שָׁלִיחַ': 'apostle',
    'שְׁלִיחִים': 'apostles',
    'הַשְּׁלִיחִים': 'the-apostles',
    'תַּלְמִיד': 'disciple',
    'תַּלְמִידִים': 'disciples',
    'הַתַּלְמִידִים': 'the-disciples',
    'טְבִילָה': 'baptism',
    'הַטְּבִילָה': 'the-baptism',
    'טָבַל': 'baptized',
    'סוֹפְרִים': 'scribes',
    'הַסּוֹפְרִים': 'the-scribes',
    'בֶּן־הָאָדָם': 'Son-of-Man',
    'בֶּן־הָאֱלֹהִים': 'Son-of-God',
    'מַלְכוּת הַשָּׁמַיִם': 'kingdom-of-heaven',
    'רוּחַ הַקֹּדֶשׁ': 'Holy-Spirit',
    'קָרָא': 'called',
    'וַיִּקְרָא': 'and-he-called',
    'תּוֹלְדֹת': 'generations-of',
    'תּוֹלְדוֹת': 'generations-of',
    'תוֹלְדוֹת': 'generations-of',
    'לָיְלָה': 'night',
    'לַיְלָה': 'night',
    'לָילָה': 'night',
    'הוֹלִיד': 'begot',
    'רַבִּי': 'Rabbi',
    'פְּרוּשִׁים': 'Pharisees',
    'וְהַפְּרוּשִׁים': 'and-the-Pharisees',
    'מִן־הַפְּרוּשִׁים': 'from-the-Pharisees',
    'הַנָּצְרִי': 'the-Nazarene',
    'הַזֵּיתִים': 'the-olives',
    'הַהֶגְמוֹן': 'the-governor',
    'הַמַּגְדָּלִית': 'the-Magdalene',
    'אֵלִיָּהוּ': 'Elijah',
    'דָּוִיד': 'David',
    'דָוִיד': 'David',
  };

  for (const [k, v] of Object.entries(ntSupp)) {
    glossDict[k.normalize('NFC')] = v;
  }

  console.log(`  OT: ${Object.keys(otDict).length}, BOM: ${Object.keys(bomDict).length}, PGP: ${Object.keys(pgpDict).length}, DC: ${Object.keys(dcDict).length}`);
  console.log(`  Combined + NT supp: ${Object.keys(glossDict).length} unique entries\n`);
  return glossDict;
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Tokenize and gloss
// ═══════════════════════════════════════════════════════════
function glossAllVerses(allBookData, glossDict) {
  console.log('Step 4: Tokenizing and glossing...');

  const PREFIXES = [
    { re: /^וְ/, gl: 'and-' }, { re: /^וַ/, gl: 'and-' }, { re: /^וּ/, gl: 'and-' },
    { re: /^וָ/, gl: 'and-' }, { re: /^וֶ/, gl: 'and-' }, { re: /^וִ/, gl: 'and-' },
    { re: /^הַ/, gl: 'the-' }, { re: /^הָ/, gl: 'the-' }, { re: /^הֶ/, gl: 'the-' },
    { re: /^בְּ/, gl: 'in-' }, { re: /^בַּ/, gl: 'in-the-' }, { re: /^בִּ/, gl: 'in-' },
    { re: /^בָּ/, gl: 'in-the-' }, { re: /^בְ/, gl: 'in-' }, { re: /^בַ/, gl: 'in-' },
    { re: /^בִ/, gl: 'in-' },
    { re: /^לְ/, gl: 'to-' }, { re: /^לַ/, gl: 'to-the-' }, { re: /^לִ/, gl: 'to-' },
    { re: /^לָ/, gl: 'to-the-' }, { re: /^לֶ/, gl: 'to-' },
    { re: /^מִ/, gl: 'from-' }, { re: /^מֵ/, gl: 'from-' }, { re: /^מְ/, gl: 'from-' },
    { re: /^מַ/, gl: 'from-' },
    { re: /^כְּ/, gl: 'as-' }, { re: /^כַּ/, gl: 'as-the-' }, { re: /^כְ/, gl: 'as-' },
    { re: /^כַ/, gl: 'as-' },
    { re: /^שֶׁ/, gl: 'that-' }, { re: /^שֶ/, gl: 'that-' },
  ];

  // Build consonant-only fallback map (strips all nikkud for fuzzy vowel matching)
  const consonantMap = {};
  for (const [k, v] of Object.entries(glossDict)) {
    const cons = k.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
    if (cons.length >= 2) consonantMap[cons] = v;
  }
  console.log(`  Consonant fallback map: ${Object.keys(consonantMap).length} entries`);

  const SUFFIXES = [
    // Plural construct + possessive (longer patterns)
    { re: /ֵיהֶם$/, gl: '-their' },
    { re: /ֵיהֶן$/, gl: '-their' },
    { re: /ֵיכֶם$/, gl: '-your(pl)' },
    { re: /ֵינוּ$/, gl: '-our' },
    { re: /וֹתָם$/, gl: '-their' },
    { re: /וֹתָיו$/, gl: '-his' },
    { re: /וֹתַי$/, gl: '-my' },
    { re: /וֹתֶיהָ$/, gl: '-her' },
    // Verb perfect endings
    { re: /תִּי$/, gl: '(I)' },
    { re: /תֶּם$/, gl: '(you-pl)' },
    { re: /תֶּן$/, gl: '(you-fp)' },
    // Singular possessive / object suffixes
    { re: /ֶיהָ$/, gl: '-her' },
    { re: /ֶיךָ$/, gl: '-your' },
    { re: /ָתִי$/, gl: '-my' },
    { re: /ֵנוּ$/, gl: '-us' },
    { re: /כֶם$/, gl: '-you(pl)' },
    { re: /הֶם$/, gl: '-them' },
    { re: /הֶן$/, gl: '-them' },
    { re: /ְךָ$/, gl: '-your' },
    { re: /ָךְ$/, gl: '-your(f)' },
    // Verb imperfect/jussive plural
    { re: /וּן$/, gl: '(they)' },
    // Noun plural/dual endings
    { re: /ִים$/, gl: '(pl)' },
    { re: /וֹת$/, gl: '(pl)' },
    { re: /ַיִם$/, gl: '(dual)' },
    // Short possessive
    { re: /ָהּ$/, gl: '-her' },
    { re: /ָם$/, gl: '-their' },
    { re: /ָן$/, gl: '-their' },
    { re: /ָיו$/, gl: '-his' },
    { re: /וֹ$/, gl: '-his' },
    { re: /ִי$/, gl: '-my' },
    // Verb 3mp perfect
    { re: /וּ$/, gl: '(they)' },
    // Feminine/directional ending
    { re: /ָה$/, gl: '' },
  ];

  function trySuffixStrip(word) {
    for (const sf of SUFFIXES) {
      if (sf.re.test(word)) {
        const base = word.replace(sf.re, '');
        if (base.length >= 2) {
          if (glossDict[base]) return glossDict[base] + sf.gl;
          const baseCons = base.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
          if (baseCons.length >= 2 && consonantMap[baseCons]) return consonantMap[baseCons] + sf.gl;
        }
      }
    }
    return null;
  }

  function tryMaqafCompound(word) {
    if (word.indexOf('\u05BE') < 0) return null;
    const parts = word.split('\u05BE');
    const glossed = parts.map(p => glossDict[p] || null);
    if (glossed.every(g => g !== null)) return glossed.join('-');
    for (const pf of PREFIXES) {
      if (pf.re.test(parts[0])) {
        const stripped = parts[0].replace(pf.re, '');
        if (stripped.length >= 2 && glossDict[stripped]) {
          const restGloss = parts.slice(1).map(p => glossDict[p] || '???').join('-');
          return pf.gl + glossDict[stripped] + '-' + restGloss;
        }
      }
    }
    return null;
  }

  function tryPrefixStrip(word) {
    for (const pf of PREFIXES) {
      if (pf.re.test(word)) {
        const stripped = word.replace(pf.re, '');
        if (stripped.length >= 2 && glossDict[stripped]) return pf.gl + glossDict[stripped];
      }
    }
    for (const pf1 of PREFIXES) {
      if (pf1.re.test(word)) {
        const after1 = word.replace(pf1.re, '');
        for (const pf2 of PREFIXES) {
          if (pf2.re.test(after1)) {
            const after2 = after1.replace(pf2.re, '');
            if (after2.length >= 2 && glossDict[after2]) return pf1.gl + pf2.gl + glossDict[after2];
          }
        }
      }
    }
    return null;
  }

  function glossWord(word) {
    if (glossDict[word]) return glossDict[word];
    // Try stripping holam on he (YHVH variant)
    const stripped = word.replace(/\u05D4\u05B9/g, '\u05D4');
    if (stripped !== word && glossDict[stripped]) return glossDict[stripped];
    const maqaf = tryMaqafCompound(word);
    if (maqaf) return maqaf;
    const prefix = tryPrefixStrip(word);
    if (prefix) return prefix;
    if (stripped !== word) {
      const prefixStripped = tryPrefixStrip(stripped);
      if (prefixStripped) return prefixStripped;
    }
    // Consonant-only fallback (handles vowel-pointing variations between sources)
    const cons = word.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
    if (cons.length >= 2 && consonantMap[cons]) return consonantMap[cons];
    // Consonant-only with prefix strip
    for (const pf of PREFIXES) {
      if (pf.re.test(word)) {
        const after = word.replace(pf.re, '');
        const afterCons = after.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
        if (afterCons.length >= 2 && consonantMap[afterCons]) return pf.gl + consonantMap[afterCons];
      }
    }
    // Maqaf compound with consonant fallback on parts
    if (word.indexOf('\u05BE') >= 0) {
      const parts = word.split('\u05BE');
      const glossed = parts.map(p => {
        if (glossDict[p]) return glossDict[p];
        const c = p.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
        return (c.length >= 2 && consonantMap[c]) ? consonantMap[c] : null;
      });
      if (glossed.every(g => g !== null)) return glossed.join('-');
    }
    // Suffix stripping (pronominal suffixes, verb endings, plural forms)
    const suffix = trySuffixStrip(word);
    if (suffix) return suffix;
    // Prefix + suffix combination
    for (const pf of PREFIXES) {
      if (pf.re.test(word)) {
        const afterPrefix = word.replace(pf.re, '');
        if (afterPrefix.length >= 3) {
          const pfSuffix = trySuffixStrip(afterPrefix);
          if (pfSuffix) return pf.gl + pfSuffix;
        }
      }
    }
    return '???';
  }

  let totalWords = 0, glossedWords = 0, unknownWords = 0;
  const unknownFreq = {};

  for (const bd of allBookData) {
    let bookGlossed = 0, bookTotal = 0;
    for (const chData of bd.chapters) {
      if (!chData.verses) continue;
      chData.processedVerses = [];
      for (const verse of chData.verses) {
        const tokens = verse.text.split(/\s+/).filter(w => w.length > 0);
        const words = [];
        for (const tok of tokens) {
          if (tok === '—' || tok === '–' || /^[A-Za-z0-9.,;:!?'"()\-]+$/.test(tok)) continue;
          let word = tok;
          let hasSof = false;
          if (word.endsWith('\u05C3')) {
            word = word.replace(/\u05C3/g, '');
            hasSof = true;
          }
          if (word.length > 0) {
            word = word.normalize('NFC');
            // Strip meteg for lookup
            const lookupWord = word.replace(/\u05BD/g, '');
            const gloss = glossWord(lookupWord);
            words.push([lookupWord, gloss]);
            totalWords++; bookTotal++;
            if (gloss === '???') {
              unknownWords++;
              unknownFreq[lookupWord] = (unknownFreq[lookupWord] || 0) + 1;
            } else {
              glossedWords++; bookGlossed++;
            }
          }
          if (hasSof) words.push(['\u05C3', '']);
        }
        // Ensure verse ends with sof pasuk
        if (words.length > 0 && words[words.length - 1][0] !== '\u05C3') {
          words.push(['\u05C3', '']);
        }
        chData.processedVerses.push({ num: verse.num, words });
      }
    }
    const bookPct = bookTotal > 0 ? (bookGlossed / bookTotal * 100).toFixed(1) : 0;
    console.log(`  ${bd.book.en}: ${bookTotal} words, ${bookPct}% glossed`);
  }

  const pct = totalWords > 0 ? (glossedWords / totalWords * 100).toFixed(1) : 0;
  console.log(`\n  TOTAL: ${totalWords} words, ${glossedWords} glossed (${pct}%), ${unknownWords} unknown`);
  console.log(`  Unique unknowns: ${Object.keys(unknownFreq).length}\n`);

  return unknownFreq;
}

// ═══════════════════════════════════════════════════════════
// STEP 5: Output verse JS files
// ═══════════════════════════════════════════════════════════
function outputVerseFiles(allBookData) {
  console.log('Step 5: Writing verse JS files...');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalLines = 0;
  let totalFiles = 0;

  for (const bd of allBookData) {
    const book = bd.book;
    let js = `// nt_verses/${book.prefix}.js — ${book.en} verse data\n`;
    js += '(function() {\n';

    let bookVerses = 0;
    for (const chData of bd.chapters) {
      if (!chData.processedVerses || chData.processedVerses.length === 0) continue;
      const varName = `${book.prefix}_ch${chData.ch}Verses`;
      const containerId = `${book.prefix}-ch${chData.ch}-verses`;

      js += `var ${varName} = [\n`;
      for (const v of chData.processedVerses) {
        const hebNum = toHebNum(v.num);
        const wordsStr = v.words.map(([h, g]) => `["${h.replace(/"/g, '\\"')}","${g.replace(/"/g, '\\"')}"]`).join(',');
        js += `  { num:"${hebNum}", words:[${wordsStr}] },\n`;
        bookVerses++;
      }
      js += '];\n';
      js += `renderVerseSet(${varName}, '${containerId}');\n\n`;
    }

    js += '})();\n';

    const outPath = path.join(OUTPUT_DIR, book.prefix + '.js');
    fs.writeFileSync(outPath, js, 'utf8');
    const lines = js.split('\n').length;
    totalLines += lines;
    totalFiles++;
    console.log(`  ${book.prefix}.js: ${lines} lines (${book.ch} chapters, ${bookVerses} verses)`);
  }

  console.log(`\n  Total: ${totalLines} lines across ${totalFiles} files\n`);
}

// ═══════════════════════════════════════════════════════════
// STEP 6: Write unknowns report
// ═══════════════════════════════════════════════════════════
function writeUnknownsReport(unknownFreq) {
  console.log('Step 6: Writing unknowns report...');
  const sorted = Object.entries(unknownFreq).sort((a, b) => b[1] - a[1]);

  const reportPath = path.join(__dirname, '_nt_unknowns.txt');
  const lines = sorted.map(([w, c]) => `${c}\t${w}`);
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`  ${sorted.length} unique unknown words written to _nt_unknowns.txt`);

  console.log('\n  Top 30 unknown words:');
  sorted.slice(0, 30).forEach(([w, c]) => console.log(`    ${w}: ${c}x`));
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  const allBookData = await fetchAllChapters();
  parseVerses(allBookData);
  const glossDict = buildDictionary();
  const unknownFreq = glossAllVerses(allBookData, glossDict);
  outputVerseFiles(allBookData);
  writeUnknownsReport(unknownFreq);
  console.log('\n=== Done! ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
