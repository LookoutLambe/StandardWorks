// extract_ot.js — Old Testament (Masoretic Text) extraction from Sefaria API
// Usage: node extract_ot.js [--book BookName] [--force-fetch]
// Fetches Hebrew text from Sefaria, tokenizes, auto-glosses from BOM+PGP+DC dictionary,
// outputs verse JS files to ot_verses/

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
const OUTPUT_DIR = path.join(__dirname, 'ot_verses');
const CACHE_DIR = path.join(__dirname, '_cache', 'sefaria');
const STRONGS_PATH = path.join(__dirname, '_strongs_hebrew.json');
const DELAY_MS = 250; // ms between API requests

// Parse CLI args
const args = process.argv.slice(2);
const forceFetch = args.includes('--force-fetch');
let onlyBook = null;
const bookIdx = args.indexOf('--book');
if (bookIdx >= 0 && args[bookIdx + 1]) onlyBook = args[bookIdx + 1];

// ═══════════════════════════════════════════════════════════
// BOOK CONFIGURATION — Jewish Tanakh Order
// ═══════════════════════════════════════════════════════════
const OT_BOOKS = [
  // Torah
  { sefaria: 'Genesis',       prefix: 'gen', en: 'Genesis',        he: 'בְּרֵאשִׁית',          ch: 50,  cat: 'Torah' },
  { sefaria: 'Exodus',        prefix: 'exo', en: 'Exodus',         he: 'שְׁמוֹת',             ch: 40,  cat: 'Torah' },
  { sefaria: 'Leviticus',     prefix: 'lev', en: 'Leviticus',      he: 'וַיִּקְרָא',          ch: 27,  cat: 'Torah' },
  { sefaria: 'Numbers',       prefix: 'num', en: 'Numbers',        he: 'בְּמִדְבַּר',          ch: 36,  cat: 'Torah' },
  { sefaria: 'Deuteronomy',   prefix: 'deu', en: 'Deuteronomy',    he: 'דְּבָרִים',            ch: 34,  cat: 'Torah' },
  // Nevi'im — Former Prophets
  { sefaria: 'Joshua',        prefix: 'jos', en: 'Joshua',         he: 'יְהוֹשֻׁעַ',           ch: 24,  cat: 'Neviim' },
  { sefaria: 'Judges',        prefix: 'jdg', en: 'Judges',         he: 'שׁוֹפְטִים',           ch: 21,  cat: 'Neviim' },
  { sefaria: 'I Samuel',      prefix: '1sa', en: '1 Samuel',       he: 'שְׁמוּאֵל א',          ch: 31,  cat: 'Neviim' },
  { sefaria: 'II Samuel',     prefix: '2sa', en: '2 Samuel',       he: 'שְׁמוּאֵל ב',          ch: 24,  cat: 'Neviim' },
  { sefaria: 'I Kings',       prefix: '1ki', en: '1 Kings',        he: 'מְלָכִים א',           ch: 22,  cat: 'Neviim' },
  { sefaria: 'II Kings',      prefix: '2ki', en: '2 Kings',        he: 'מְלָכִים ב',           ch: 25,  cat: 'Neviim' },
  // Nevi'im — Latter Prophets
  { sefaria: 'Isaiah',        prefix: 'isa', en: 'Isaiah',         he: 'יְשַׁעְיָהוּ',         ch: 66,  cat: 'Neviim' },
  { sefaria: 'Jeremiah',      prefix: 'jer', en: 'Jeremiah',       he: 'יִרְמְיָהוּ',          ch: 52,  cat: 'Neviim' },
  { sefaria: 'Ezekiel',       prefix: 'eze', en: 'Ezekiel',        he: 'יְחֶזְקֵאל',           ch: 48,  cat: 'Neviim' },
  { sefaria: 'Hosea',         prefix: 'hos', en: 'Hosea',          he: 'הוֹשֵׁעַ',             ch: 14,  cat: 'Neviim' },
  { sefaria: 'Joel',          prefix: 'joe', en: 'Joel',           he: 'יוֹאֵל',              ch: 4,   cat: 'Neviim' },
  { sefaria: 'Amos',          prefix: 'amo', en: 'Amos',           he: 'עָמוֹס',              ch: 9,   cat: 'Neviim' },
  { sefaria: 'Obadiah',       prefix: 'oba', en: 'Obadiah',        he: 'עוֹבַדְיָה',           ch: 1,   cat: 'Neviim' },
  { sefaria: 'Jonah',         prefix: 'jon', en: 'Jonah',          he: 'יוֹנָה',              ch: 4,   cat: 'Neviim' },
  { sefaria: 'Micah',         prefix: 'mic', en: 'Micah',          he: 'מִיכָה',              ch: 7,   cat: 'Neviim' },
  { sefaria: 'Nahum',         prefix: 'nah', en: 'Nahum',          he: 'נַחוּם',              ch: 3,   cat: 'Neviim' },
  { sefaria: 'Habakkuk',      prefix: 'hab', en: 'Habakkuk',       he: 'חֲבַקּוּק',            ch: 3,   cat: 'Neviim' },
  { sefaria: 'Zephaniah',     prefix: 'zep', en: 'Zephaniah',      he: 'צְפַנְיָה',            ch: 3,   cat: 'Neviim' },
  { sefaria: 'Haggai',        prefix: 'hag', en: 'Haggai',         he: 'חַגַּי',              ch: 2,   cat: 'Neviim' },
  { sefaria: 'Zechariah',     prefix: 'zec', en: 'Zechariah',      he: 'זְכַרְיָה',            ch: 14,  cat: 'Neviim' },
  { sefaria: 'Malachi',       prefix: 'mal', en: 'Malachi',        he: 'מַלְאָכִי',            ch: 3,   cat: 'Neviim' },
  // Ketuvim
  { sefaria: 'Psalms',        prefix: 'psa', en: 'Psalms',         he: 'תְּהִלִּים',            ch: 150, cat: 'Ketuvim' },
  { sefaria: 'Proverbs',      prefix: 'pro', en: 'Proverbs',       he: 'מִשְׁלֵי',             ch: 31,  cat: 'Ketuvim' },
  { sefaria: 'Job',           prefix: 'job', en: 'Job',            he: 'אִיּוֹב',             ch: 42,  cat: 'Ketuvim' },
  { sefaria: 'Song of Songs', prefix: 'sos', en: 'Song of Songs',  he: 'שִׁיר הַשִּׁירִים',     ch: 8,   cat: 'Ketuvim' },
  { sefaria: 'Ruth',          prefix: 'rth', en: 'Ruth',           he: 'רוּת',               ch: 4,   cat: 'Ketuvim' },
  { sefaria: 'Lamentations',  prefix: 'lam', en: 'Lamentations',   he: 'אֵיכָה',              ch: 5,   cat: 'Ketuvim' },
  { sefaria: 'Ecclesiastes',  prefix: 'ecc', en: 'Ecclesiastes',   he: 'קֹהֶלֶת',             ch: 12,  cat: 'Ketuvim' },
  { sefaria: 'Esther',        prefix: 'est', en: 'Esther',         he: 'אֶסְתֵּר',             ch: 10,  cat: 'Ketuvim' },
  { sefaria: 'Daniel',        prefix: 'dan', en: 'Daniel',         he: 'דָּנִיֵּאל',            ch: 12,  cat: 'Ketuvim' },
  { sefaria: 'Ezra',          prefix: 'ezr', en: 'Ezra',           he: 'עֶזְרָא',             ch: 10,  cat: 'Ketuvim' },
  { sefaria: 'Nehemiah',      prefix: 'neh', en: 'Nehemiah',       he: 'נְחֶמְיָה',            ch: 13,  cat: 'Ketuvim' },
  { sefaria: 'I Chronicles',  prefix: '1ch', en: '1 Chronicles',   he: 'דִּבְרֵי הַיָּמִים א',  ch: 29,  cat: 'Ketuvim' },
  { sefaria: 'II Chronicles', prefix: '2ch', en: '2 Chronicles',   he: 'דִּבְרֵי הַיָּמִים ב',  ch: 36,  cat: 'Ketuvim' },
];

const totalChapters = OT_BOOKS.reduce((s, b) => s + b.ch, 0);

// Filter to single book if requested
const booksToProcess = onlyBook
  ? OT_BOOKS.filter(b => b.sefaria.toLowerCase() === onlyBook.toLowerCase() || b.en.toLowerCase() === onlyBook.toLowerCase() || b.prefix === onlyBook.toLowerCase())
  : OT_BOOKS;

if (onlyBook && booksToProcess.length === 0) {
  console.error(`ERROR: Book "${onlyBook}" not found. Use Sefaria name (e.g., "Genesis") or prefix (e.g., "gen").`);
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
  // Strip U+FFFD replacement characters (Sefaria data corruption)
  s = s.replace(/\uFFFD/g, '');
  // Replace paseq (׀ U+05C0) with space so joined words split into separate tokens
  s = s.replace(/\u05C0/g, ' ');
  // Strip parashah markers {פ} {ס} and surrounding thin/zero-width spaces
  s = s.replace(/[\u200B\u2009]*\{[פס]\}[\u200B\u2009]*/g, '');
  // NFC normalize to fix combining character order differences
  s = s.normalize('NFC');
  // Normalize whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ═══════════════════════════════════════════════════════════
// STEP 1: Fetch from Sefaria API (with caching)
// ═══════════════════════════════════════════════════════════
async function fetchAllChapters() {
  console.log('=== Old Testament Extraction Pipeline ===\n');
  console.log(`Step 1: Fetching from Sefaria API...`);
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
      const cacheFile = path.join(CACHE_DIR, `${book.sefaria}.${ch}.json`);

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
      const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(book.sefaria)}.${ch}`;
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
// ═══════════════════════════════════════════════════════════
function parseVerses(allBookData) {
  console.log('Step 2: Parsing and cleaning verses...');
  let totalVerses = 0;

  for (const bd of allBookData) {
    for (const chData of bd.chapters) {
      if (!chData.data) { chData.verses = []; continue; }

      // Find Hebrew text in versions
      let heText = null;
      const versions = chData.data.versions || [];
      for (const v of versions) {
        if (v.language === 'he' && Array.isArray(v.text)) {
          heText = v.text;
          break;
        }
      }

      if (!heText) {
        console.log(`  WARNING: No Hebrew text for ${bd.book.en} ${chData.ch}`);
        chData.verses = [];
        continue;
      }

      chData.verses = heText.map((raw, i) => ({
        num: i + 1,
        text: cleanHebrewText(raw)
      })).filter(v => v.text.length > 0);

      totalVerses += chData.verses.length;
    }
  }

  console.log(`  Total verses: ${totalVerses}\n`);
  return totalVerses;
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Build glossing dictionary from BOM + PGP + DC
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
    // NFC normalize keys
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

  const bomDict = loadVerseFiles(BOM_VERSES_DIR);
  const pgpDict = loadVerseFiles(PGP_VERSES_DIR);
  const dcDict = loadVerseFiles(DC_VERSES_DIR);
  // Priority: Strong's < TAHOT < BOM < PGP < DC < supplement (supplement highest)
  const glossDict = { ...strongsDict, ...tahotDict, ...bomDict, ...pgpDict, ...dcDict, ...suppDict };

  // Add Masoretic-specific forms that differ from BOM pointing
  const masoSupp = {
    'יְהֹוָה': 'the-LORD',           // YHVH with holam on he
    'יְהֹוָ֑ה': 'the-LORD',
    'הִוא': 'she',                   // ketiv form of היא
    'אֵלָו': 'to-him',              // ketiv form of אליו
    'פַּרְעֹה': 'Pharaoh',
    'פַרְעֹה': 'Pharaoh',
    'שָׁנָה': 'year',
    'שָׁנִים': 'years',
    'הוֹלִידוֹ': 'he-begot-him',
    'אַלּוּף': 'chief',
    'הַצֹּאן': 'the-flock',
    'וּבָנוֹת': 'and-daughters',
    'מִצְרַיִם': 'Egypt',
    'מִצְרָיִם': 'Egypt',
    'קָרָא': 'called',              // BOM has "read" but primary meaning is "called/named"
    'וַיִּקְרָא': 'and-he-called',
    'עֶרֶב': 'evening',
    'בֹקֶר': 'morning',
    'בֹּקֶר': 'morning',
    'וָבֹהוּ': 'and-void',
    'מְרַחֶפֶת': 'hovering',
    'וַיַּבְדֵּל': 'and-He-separated',
    'מַבְדִּיל': 'separating',
    'רָקִיעַ': 'firmament',
    'הָרָקִיעַ': 'the-firmament',
    'לִרְקִיעַ': 'to-the-firmament',
    'תַּדְשֵׁא': 'let-sprout',
    'דֶּשֶׁא': 'grass',
    'עֵשֶׂב': 'herb',
    'מַזְרִיעַ': 'yielding',
    'זֶרַע': 'seed',
    'פְּרִי': 'fruit',
    'לְמִינוֹ': 'after-its-kind',
    'לְמִינָהּ': 'after-its-kind',
    'לְמִינֵהוּ': 'after-its-kind',
    'מְאֹרֹת': 'lights',
    'הַמָּאוֹר': 'the-light',
    'הַגָּדֹל': 'the-great',
    'הַקָּטֹן': 'the-small',
    'מֶמְשֶׁלֶת': 'dominion-of',
    'הַכּוֹכָבִים': 'the-stars',
    'יִשְׁרְצוּ': 'let-swarm',
    'שֶׁרֶץ': 'swarm',
    'נֶפֶשׁ': 'soul',
    'חַיָּה': 'living',
    'תּוֹצֵא': 'let-bring-forth',
    'בְּהֵמָה': 'beast',
    'וָרֶמֶשׂ': 'and-creeping-thing',
    'נַעֲשֶׂה': 'let-us-make',
    'בְּצַלְמֵנוּ': 'in-our-image',
    'כִּדְמוּתֵנוּ': 'in-our-likeness',
    'וְיִרְדּוּ': 'and-let-them-rule',
    'בִּדְגַת': 'over-the-fish-of',
    'זָכָר': 'male',
    'וּנְקֵבָה': 'and-female',
    'וְכִבְשֻׁהָ': 'and-subdue-it',
    'וּרְדוּ': 'and-rule',
    'שַׁבָּת': 'Sabbath',
    'וַיְקַדֵּשׁ': 'and-He-sanctified',
    'שָׁבַת': 'He-ceased',
    'לָיְלָה': 'night',
    'לַיְלָה': 'night',
    'לָילָה': 'night',
    'לַיִל': 'night',
    'תּוֹלְדוֹת': 'generations-of',
    'תּוֹלְדֹת': 'generations-of',
    'תוֹלְדוֹת': 'generations-of',
    'דָּוִיד': 'David',
    'דָוִיד': 'David',
    'לְדָוִיד': 'of-David',
    'לְדָוִד': 'of-David',
    'מוֹאָב': 'Moab',
    'הַלְוִיִּם': 'the-Levites',
    'וְהַלְוִיִּם': 'and-the-Levites',
    'לַלְוִיִּם': 'to-the-Levites',
  };

  // Normalize supp keys and merge
  for (const [k, v] of Object.entries(masoSupp)) {
    glossDict[k.normalize('NFC')] = v;
  }

  console.log(`  BOM: ${Object.keys(bomDict).length}, PGP: ${Object.keys(pgpDict).length}, DC: ${Object.keys(dcDict).length}`);
  console.log(`  Combined + Masoretic supp: ${Object.keys(glossDict).length} unique entries\n`);
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

  // Pronominal suffixes and verb endings (longest first to avoid partial matches)
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
          // Direct dict lookup on base
          if (glossDict[base]) return glossDict[base] + sf.gl;
          // Consonant fallback on base
          const baseCons = base.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
          if (baseCons.length >= 2 && consonantMap[baseCons]) return consonantMap[baseCons] + sf.gl;
        }
      }
    }
    return null;
  }

  function glossWord(word) {
    if (glossDict[word]) return glossDict[word];
    // Try stripping Masoretic-specific marks that BOM doesn't use:
    // holam on he in YHVH (U+05B9 after U+05D4), qamats qatan variants, etc.
    const stripped = word.replace(/\u05D4\u05B9/g, '\u05D4');
    if (stripped !== word && glossDict[stripped]) return glossDict[stripped];
    const maqaf = tryMaqafCompound(word);
    if (maqaf) return maqaf;
    const prefix = tryPrefixStrip(word);
    if (prefix) return prefix;
    // Also try prefix strip on the holam-stripped form
    if (stripped !== word) {
      const prefixStripped = tryPrefixStrip(stripped);
      if (prefixStripped) return prefixStripped;
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
          // Handle sof pasuk at end of token
          let word = tok;
          let hasSof = false;
          if (word.endsWith('\u05C3')) {
            word = word.replace(/\u05C3/g, '');
            hasSof = true;
          }
          if (word.length > 0) {
            word = word.normalize('NFC');
            // Strip meteg (U+05BD) for lookup only — keep original pointing for display
            const displayWord = word.replace(/\u05BD/g, '');
            const gloss = glossWord(displayWord);
            words.push([displayWord, gloss]);
            totalWords++; bookTotal++;
            if (gloss === '???') {
              unknownWords++;
              unknownFreq[word] = (unknownFreq[word] || 0) + 1;
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
    let js = `// ot_verses/${book.prefix}.js — ${book.en} verse data\n`;
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

  const reportPath = path.join(__dirname, '_ot_unknowns.txt');
  const lines = sorted.map(([w, c]) => `${c}\t${w}`);
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`  ${sorted.length} unique unknown words written to _ot_unknowns.txt`);

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
