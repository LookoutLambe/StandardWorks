// extract_pgp.js — Pearl of Great Price DOCX extraction & auto-glossing
// Usage: node extract_pgp.js
// Reads PGOP Hebrew DOCX, tokenizes, auto-glosses from BOM dictionary,
// outputs verse JS files to pgp_verses/

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// PATHS
// ═══════════════════════════════════════════════════════════
const BOM_DIR = path.resolve(__dirname, '..', 'Hebrew BOM');
const PGOP_DOCX = path.join(BOM_DIR, 'PGOP - Hebrew.docx');
const BOM_VERSES_DIR = path.join(BOM_DIR, 'verses');
const OUTPUT_DIR = path.join(__dirname, 'pgp_verses');
const EXTRACT_DIR = path.join(__dirname, 'pgp_docx_extract');
const MANUAL_GLOSSES = path.join(__dirname, 'pgp_manual_glosses.json');

// ═══════════════════════════════════════════════════════════
// STEP 1: Extract XML from DOCX
// ═══════════════════════════════════════════════════════════
console.log('=== PGoP Extraction Pipeline ===\n');
console.log('Step 1: Extracting DOCX...');

if (!fs.existsSync(PGOP_DOCX)) {
  console.error('ERROR: PGOP DOCX not found at:', PGOP_DOCX);
  process.exit(1);
}

if (!fs.existsSync(EXTRACT_DIR)) {
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
}

const zipCopy = path.join(__dirname, 'temp_pgp.zip');
fs.copyFileSync(PGOP_DOCX, zipCopy);
execSync(`powershell -Command "Expand-Archive -Path '${zipCopy}' -DestinationPath '${EXTRACT_DIR}' -Force"`, { stdio: 'inherit' });
fs.unlinkSync(zipCopy);

const xmlPath = path.join(EXTRACT_DIR, 'word', 'document.xml');
const xml = fs.readFileSync(xmlPath, 'utf8');
console.log(`  XML loaded (${(xml.length / 1024).toFixed(0)} KB)\n`);

// ═══════════════════════════════════════════════════════════
// STEP 2: Parse paragraphs with bold detection
// ═══════════════════════════════════════════════════════════
console.log('Step 2: Parsing paragraphs...');

function extractParagraphs(xml) {
  const paragraphs = [];
  const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pXml = pMatch[0];

    // Get paragraph style
    let style = 'Normal';
    const styleMatch = pXml.match(/<w:pStyle w:val="([^"]+)"/);
    if (styleMatch) style = styleMatch[1];

    // Check if paragraph has bold runs
    const hasBold = /<w:b\/>/.test(pXml) || /<w:b w:val="true"/.test(pXml);

    // Extract all text runs
    let text = '';
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(pXml)) !== null) {
      text += tMatch[1];
    }
    text = text.trim();
    if (text) {
      paragraphs.push({ style, text, bold: hasBold });
    }
  }
  return paragraphs;
}

const paragraphs = extractParagraphs(xml);
console.log(`  Total paragraphs: ${paragraphs.length}`);

// ═══════════════════════════════════════════════════════════
// STEP 3: Identify books, chapters, verses
// ═══════════════════════════════════════════════════════════
console.log('\nStep 3: Parsing structure...');

// Arabic to Hebrew numeral conversion (extended to 75+)
function toHebNum(n) {
  var ones = ['','\u05D0','\u05D1','\u05D2','\u05D3','\u05D4','\u05D5','\u05D6','\u05D7','\u05D8'];
  var tens = ['','\u05D9','\u05DB','\u05DC','\u05DE','\u05E0','\u05E1','\u05E2','\u05E4'];
  if (n === 15) return '\u05D8\u05D5'; // טו
  if (n === 16) return '\u05D8\u05D6'; // טז
  var t = Math.floor(n / 10);
  var o = n % 10;
  return (tens[t] || '') + (ones[o] || '');
}

// Hebrew letter to Arabic numeral
const hebrewNumerals = {
  '\u05D0': 1, '\u05D1': 2, '\u05D2': 3, '\u05D3': 4, '\u05D4': 5,
  '\u05D5': 6, '\u05D6': 7, '\u05D7': 8, '\u05D8': 9,
  '\u05D9': 10, '\u05D9\u05D0': 11, '\u05D9\u05D1': 12, '\u05D9\u05D2': 13,
};

// Book detection patterns (Hebrew book names in the DOCX)
const BOOK_MARKERS = [
  { pattern: /\u05DE\u05E9\u05B6\u05C1\u05D4|\u05DE\u05E9\u05C1\u05B6\u05D4|\u05DE\u05D5\u05E9\u05D4|\u05DE\u05E9\u05D4/, code: 'ms', name: 'Moses', nameHeb: '\u05DE\u05B9\u05E9\u05C1\u05B6\u05D4', chapters: 8 },
  { pattern: /\u05D0\u05D1\u05E8\u05D4\u05DD|\u05D0\u05B7\u05D1\u05B0\u05E8\u05B8\u05D4\u05B8\u05DD/, code: 'ab', name: 'Abraham', nameHeb: '\u05D0\u05B7\u05D1\u05B0\u05E8\u05B8\u05D4\u05B8\u05DD', chapters: 5 },
  { pattern: /\u05D9\u05D5\u05B9\u05E1\u05B5\u05E3.*\u05DE\u05B7\u05EA\u05B8\u05BC\u05D9|\u05D9\u05D5\u05E1\u05E3.*\u05DE\u05EA/, code: 'jsm', name: 'JS-Matthew', nameHeb: '\u05D9\u05D5\u05E1\u05E3 \u05E1\u05DE\u05D9\u05EA\u2014\u05DE\u05EA\u05EA\u05D9\u05D4\u05D5', chapters: 1 },
  { pattern: /\u05D9\u05D5\u05B9\u05E1\u05B5\u05E3.*\u05EA\u05BC\u05D5\u05B9\u05DC\u05B0\u05D3\u05D5\u05B9\u05EA|\u05D9\u05D5\u05E1\u05E3.*\u05EA\u05D5\u05DC\u05D3\u05D5\u05EA|\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8/, code: 'jsh', name: 'JS-History', nameHeb: '\u05D9\u05D5\u05E1\u05E3 \u05E1\u05DE\u05D9\u05EA\u2014\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4', chapters: 1 },
  { pattern: /\u05D0\u05B4\u05DE\u05B0\u05E8\u05B5\u05D9\s+\u05D4\u05B8\u05D0\u05B1\u05DE\u05D5\u05BC\u05E0\u05B8\u05D4|\u05D0\u05DE\u05E8\u05D9\s+\u05D4\u05D0\u05DE\u05D5\u05E0\u05D4|\u05E2\u05B4\u05E7\u05B0\u05E8\u05B5\u05D9/, code: 'aof', name: 'Articles of Faith', nameHeb: '\u05E2\u05B4\u05E7\u05B0\u05E8\u05B5\u05D9 \u05D4\u05B8\u05D0\u05B1\u05DE\u05D5\u05BC\u05E0\u05B8\u05D4', chapters: 1 }
];

// Check if text is predominantly English (for facsimile detection)
function isEnglishText(text) {
  const latin = text.replace(/[^a-zA-Z]/g, '').length;
  const hebrew = text.replace(/[^\u05D0-\u05EA]/g, '').length;
  return latin > hebrew;
}

// Strip nikkud for pattern matching
function stripNikkud(str) {
  return str.replace(/[\u0591-\u05C7]/g, '');
}

// Parse document into structured data
const books = {};
let currentBook = null;
let currentChapter = 0;
let inFrontMatter = true;
let skippedFront = 0;
let skippedFacsimile = 0;

for (let i = 0; i < paragraphs.length; i++) {
  const { style, text, bold } = paragraphs[i];
  const textClean = stripNikkud(text);

  // Skip TOC and front matter styles
  if (style === 'TOC1' || style === 'TOCHeading') {
    skippedFront++;
    continue;
  }

  // Detect book headers (bold paragraphs or Heading1)
  if (bold || style === 'Heading1') {
    let foundBook = false;
    for (const bm of BOOK_MARKERS) {
      if (bm.pattern.test(text) || bm.pattern.test(textClean)) {
        currentBook = bm;
        currentChapter = 0;
        books[bm.code] = books[bm.code] || {};
        inFrontMatter = false;
        foundBook = true;

        // Single-chapter books auto-start chapter 1
        if (bm.chapters === 1 && bm.code !== 'aof') {
          currentChapter = 1;
          books[bm.code][1] = [];
        }
        break;
      }
    }

    // Check for chapter header (פרק)
    if (!foundBook && currentBook) {
      const chMatch = textClean.match(/\u05E4\u05E8\u05E7\s+([^\s]+)/);
      if (chMatch) {
        const chHeb = chMatch[1];
        const chNum = hebrewNumerals[chHeb];
        if (chNum) {
          currentChapter = chNum;
          books[currentBook.code][chNum] = [];
        } else {
          // Try stripped version
          for (const [h, n] of Object.entries(hebrewNumerals)) {
            if (stripNikkud(text).includes('\u05E4\u05E8\u05E7') && chHeb === h) {
              currentChapter = n;
              books[currentBook.code][n] = [];
              break;
            }
          }
          // Fallback: sequential chapter numbering
          if (!books[currentBook.code][currentChapter + 1]) {
            currentChapter++;
            books[currentBook.code][currentChapter] = [];
          }
        }
        continue;
      }

      // Articles of Faith: bold paragraphs with Hebrew ordinal numbering
      if (currentBook && currentBook.code === 'aof' && bold) {
        const aofMatch = text.match(/^([^\s.]+)\.\s+(.+)/);
        if (aofMatch) {
          if (!books.aof[1]) books.aof[1] = [];
          const artNum = hebrewNumerals[aofMatch[1]];
          const artHeb = artNum ? toHebNum(artNum) : aofMatch[1];
          books.aof[1].push({
            num: artHeb,
            arabicNum: artNum || books.aof[1].length + 1,
            text: aofMatch[2].trim()
          });
          continue;
        }
      }
    }

    if (inFrontMatter) { skippedFront++; continue; }
    continue;
  }

  // Skip front matter
  if (inFrontMatter) { skippedFront++; continue; }

  // Skip English text (facsimile descriptions)
  if (isEnglishText(text)) { skippedFacsimile++; continue; }

  // Skip empty or very short paragraphs
  if (text.length < 3) continue;

  // Detect verse: Arabic numeral at start
  if (currentBook && currentChapter > 0) {
    const verseMatch = text.match(/^(\d+)\s+(.+)/);
    if (verseMatch) {
      const verseNum = parseInt(verseMatch[1], 10);
      const verseText = verseMatch[2].trim();
      const verseHeb = toHebNum(verseNum);

      if (!books[currentBook.code][currentChapter]) {
        books[currentBook.code][currentChapter] = [];
      }
      books[currentBook.code][currentChapter].push({
        num: verseHeb,
        arabicNum: verseNum,
        text: verseText
      });
      continue;
    }

    // Articles of Faith: non-bold verses with Hebrew ordinal
    if (currentBook.code === 'aof') {
      const aofMatch = text.match(/^([^\s.]+)\.\s+(.+)/);
      if (aofMatch) {
        if (!books.aof[1]) books.aof[1] = [];
        const artNum = hebrewNumerals[aofMatch[1]];
        books.aof[1].push({
          num: artNum ? toHebNum(artNum) : aofMatch[1],
          arabicNum: artNum || books.aof[1].length + 1,
          text: aofMatch[2].trim()
        });
        continue;
      }
    }
  }
}

// Print extraction summary
console.log(`  Skipped front matter: ${skippedFront} paragraphs`);
console.log(`  Skipped facsimiles: ${skippedFacsimile} paragraphs`);
let totalVerses = 0;
for (const [code, chapters] of Object.entries(books)) {
  const chNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);
  const vCount = chNums.reduce((s, ch) => s + chapters[ch].length, 0);
  totalVerses += vCount;
  const bm = BOOK_MARKERS.find(b => b.code === code);
  console.log(`  ${bm ? bm.name : code}: ${chNums.length} chapters, ${vCount} verses`);
  // Show first verse sample
  if (chNums.length > 0 && chapters[chNums[0]] && chapters[chNums[0]].length > 0) {
    const sample = chapters[chNums[0]][0];
    console.log(`    Sample: ${sample.num}. ${sample.text.substring(0, 60)}...`);
  }
}
console.log(`  TOTAL: ${totalVerses} verses\n`);

// ═══════════════════════════════════════════════════════════
// STEP 4: Build glossing dictionary from BOM verse files
// ═══════════════════════════════════════════════════════════
console.log('Step 4: Building gloss dictionary...');

function loadVerseFiles(dir) {
  const dict = {};
  if (!fs.existsSync(dir)) return dict;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const pairRegex = /\["([^"]+)","([^"]*?)"\]/g;
    let m;
    while ((m = pairRegex.exec(content)) !== null) {
      const heb = m[1];
      const gloss = m[2];
      if (heb !== '\u05C3' && gloss !== '' && !gloss.includes('???')) {
        dict[heb] = gloss;
      }
    }
  }
  return dict;
}

// Load Strong's Hebrew lexicon
const STRONGS_PATH = path.join(__dirname, '_strongs_hebrew.json');
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

// Scan BOM verse files + chapter data
const bomDict = loadVerseFiles(BOM_VERSES_DIR);

// Also scan BOM.html and chapter data files
const bomHtml = path.join(BOM_DIR, 'BOM.html');
const extraSources = [];
if (fs.existsSync(bomHtml)) extraSources.push(bomHtml);
const chapterDataDir = path.join(BOM_DIR, '_chapter_data');
if (fs.existsSync(chapterDataDir)) {
  extraSources.push(...fs.readdirSync(chapterDataDir).filter(f => f.endsWith('.js')).map(f => path.join(chapterDataDir, f)));
}
const extraDict = {};
for (const src of extraSources) {
  const content = fs.readFileSync(src, 'utf8');
  const re = /\["([^"]+)","([^"]*?)"\]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[2] && !m[2].includes('???') && m[1] !== '\u05C3' && m[2] !== '') {
      extraDict[m[1]] = m[2];
    }
  }
}

// Load manual glosses if file exists
let manualGlosses = {};
if (fs.existsSync(MANUAL_GLOSSES)) {
  manualGlosses = JSON.parse(fs.readFileSync(MANUAL_GLOSSES, 'utf8'));
  console.log(`  Manual glosses loaded: ${Object.keys(manualGlosses).length}`);
}

// Priority: Strong's < TAHOT < BOM < extra < manual < supplement
const glossDict = { ...strongsDict, ...tahotDict, ...bomDict, ...extraDict, ...manualGlosses, ...suppDict };
console.log(`  Combined: ${Object.keys(glossDict).length} unique entries\n`);

// ═══════════════════════════════════════════════════════════
// STEP 5: Define prefix stripping patterns
// ═══════════════════════════════════════════════════════════
const PREFIXES = [
  // Triple compound
  { pattern: /^\u05D5\u05BC\u05DB\u05B0\u05E9\u05C1\u05B6/, gloss: 'and-as-that-' },
  // Double compound
  { pattern: /^\u05D5\u05BC\u05D1\u05B7/, gloss: 'and-in-the-' },
  { pattern: /^\u05D5\u05BC\u05D1\u05B0/, gloss: 'and-in-' },
  { pattern: /^\u05D5\u05BC\u05DC\u05B0/, gloss: 'and-to-' },
  { pattern: /^\u05D5\u05BC\u05DE\u05B4/, gloss: 'and-from-' },
  { pattern: /^\u05D5\u05BC\u05DE\u05B5/, gloss: 'and-from-' },
  { pattern: /^\u05D5\u05BC\u05DB\u05B0/, gloss: 'and-as-' },
  { pattern: /^\u05D5\u05B0\u05D4\u05B7/, gloss: 'and-the-' },
  { pattern: /^\u05D5\u05B0\u05D4\u05B8/, gloss: 'and-the-' },
  { pattern: /^\u05D5\u05B0\u05DC\u05B7/, gloss: 'and-to-the-' },
  { pattern: /^\u05D5\u05B0\u05DC\u05B8/, gloss: 'and-to-the-' },
  { pattern: /^\u05D5\u05B0\u05DC\u05B4/, gloss: 'and-to-' },
  { pattern: /^\u05D5\u05BC\u05DC\u05B7/, gloss: 'and-to-the-' },
  { pattern: /^\u05D5\u05B0\u05D1\u05B7/, gloss: 'and-in-the-' },
  { pattern: /^\u05D5\u05B0\u05D1\u05B0/, gloss: 'and-in-' },
  { pattern: /^\u05D5\u05B0\u05D1\u05B8/, gloss: 'and-in-the-' },
  { pattern: /^\u05D5\u05B0\u05D1\u05B4/, gloss: 'and-in-' },
  { pattern: /^\u05D5\u05B0\u05DB\u05B7/, gloss: 'and-as-the-' },
  { pattern: /^\u05D5\u05B0\u05DB\u05B8/, gloss: 'and-as-the-' },
  { pattern: /^\u05D5\u05B0\u05DB\u05B0/, gloss: 'and-as-' },
  { pattern: /^\u05D5\u05BC\u05DE\u05B7/, gloss: 'and-from-the-' },
  { pattern: /^\u05D5\u05B0\u05DE\u05B4/, gloss: 'and-from-' },
  { pattern: /^\u05D5\u05B0\u05DE\u05B5/, gloss: 'and-from-' },
  { pattern: /^\u05D1\u05B0\u05BC\u05D4\u05B7/, gloss: 'in-the-' },
  { pattern: /^\u05DC\u05B0\u05D4\u05B7/, gloss: 'to-the-' },
  { pattern: /^\u05DE\u05B5\u05D4\u05B7/, gloss: 'from-the-' },
  { pattern: /^\u05DE\u05B5\u05D4\u05B8/, gloss: 'from-the-' },
  { pattern: /^\u05DB\u05B0\u05BC\u05D4\u05B7/, gloss: 'as-the-' },
  { pattern: /^\u05E9\u05C1\u05B6\u05D1\u05B0/, gloss: 'that-in-' },
  { pattern: /^\u05E9\u05C1\u05B6\u05DC\u05B0/, gloss: 'that-to-' },
  { pattern: /^\u05E9\u05C1\u05B6\u05D4\u05B7/, gloss: 'that-the-' },
  { pattern: /^\u05E9\u05C1\u05B6\u05D4\u05B8/, gloss: 'that-the-' },
  // Single prefixes
  { pattern: /^\u05D5\u05B0/, gloss: 'and-' },
  { pattern: /^\u05D5\u05BC/, gloss: 'and-' },
  { pattern: /^\u05D5\u05B8/, gloss: 'and-' },
  { pattern: /^\u05D5\u05B6/, gloss: 'and-' },
  { pattern: /^\u05D5\u05B4/, gloss: 'and-' },
  { pattern: /^\u05D4\u05B7/, gloss: 'the-' },
  { pattern: /^\u05D4\u05B8/, gloss: 'the-' },
  { pattern: /^\u05D4\u05B6/, gloss: 'the-' },
  { pattern: /^\u05D1\u05B0\u05BC/, gloss: 'in-' },
  { pattern: /^\u05D1\u05B7\u05BC/, gloss: 'in-the-' },
  { pattern: /^\u05D1\u05B8\u05BC/, gloss: 'in-the-' },
  { pattern: /^\u05D1\u05B4\u05BC/, gloss: 'in-' },
  { pattern: /^\u05DC\u05B0/, gloss: 'to-' },
  { pattern: /^\u05DC\u05B7/, gloss: 'to-the-' },
  { pattern: /^\u05DC\u05B8/, gloss: 'to-the-' },
  { pattern: /^\u05DC\u05B4/, gloss: 'to-' },
  { pattern: /^\u05DE\u05B4/, gloss: 'from-' },
  { pattern: /^\u05DE\u05B5/, gloss: 'from-' },
  { pattern: /^\u05DE\u05B7/, gloss: 'from-the-' },
  { pattern: /^\u05DB\u05B0\u05BC/, gloss: 'as-' },
  { pattern: /^\u05DB\u05B7\u05BC/, gloss: 'as-the-' },
  { pattern: /^\u05DB\u05B8\u05BC/, gloss: 'as-the-' },
  { pattern: /^\u05DB\u05B4\u05BC/, gloss: 'as-' },
  { pattern: /^\u05E9\u05C1\u05B6/, gloss: 'that-' },
];

// Build consonant-only fallback map
const consonantMap = {};
for (const [k, v] of Object.entries(glossDict)) {
  const cons = k.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
  if (cons.length >= 2) consonantMap[cons] = v;
}
console.log(`  Consonant fallback map: ${Object.keys(consonantMap).length} entries`);

const SUFFIXES = [
  { re: /ֵיהֶם$/, gl: '-their' }, { re: /ֵיהֶן$/, gl: '-their' },
  { re: /ֵיכֶם$/, gl: '-your(pl)' }, { re: /ֵינוּ$/, gl: '-our' },
  { re: /וֹתָם$/, gl: '-their' }, { re: /וֹתָיו$/, gl: '-his' },
  { re: /וֹתַי$/, gl: '-my' }, { re: /וֹתֶיהָ$/, gl: '-her' },
  { re: /תִּי$/, gl: '(I)' }, { re: /תֶּם$/, gl: '(you-pl)' }, { re: /תֶּן$/, gl: '(you-fp)' },
  { re: /ֶיהָ$/, gl: '-her' }, { re: /ֶיךָ$/, gl: '-your' },
  { re: /ָתִי$/, gl: '-my' }, { re: /ֵנוּ$/, gl: '-us' },
  { re: /כֶם$/, gl: '-you(pl)' }, { re: /הֶם$/, gl: '-them' }, { re: /הֶן$/, gl: '-them' },
  { re: /ְךָ$/, gl: '-your' }, { re: /ָךְ$/, gl: '-your(f)' },
  { re: /וּן$/, gl: '(they)' },
  { re: /ִים$/, gl: '(pl)' }, { re: /וֹת$/, gl: '(pl)' }, { re: /ַיִם$/, gl: '(dual)' },
  { re: /ָהּ$/, gl: '-her' }, { re: /ָם$/, gl: '-their' }, { re: /ָן$/, gl: '-their' },
  { re: /ָיו$/, gl: '-his' }, { re: /וֹ$/, gl: '-his' }, { re: /ִי$/, gl: '-my' },
  { re: /וּ$/, gl: '(they)' }, { re: /ָה$/, gl: '' },
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

// Common maqaf first-parts
const MAQAF_FIRST = {
  '\u05D0\u05B6\u05EA': '[ACC]', '\u05D0\u05B6\u05DC': 'to',
  '\u05E2\u05B7\u05DC': 'upon', '\u05DE\u05B4\u05DF': 'from',
  '\u05D1\u05B6\u05BC\u05DF': 'son-of', '\u05D1\u05B7\u05BC\u05EA': 'daughter-of',
  '\u05DB\u05B8\u05DC': 'all', '\u05DB\u05B9\u05BC\u05DC': 'all',
  '\u05DC\u05B9\u05D0': 'not', '\u05D0\u05B5\u05D9\u05DF': 'no',
  '\u05D0\u05DC': 'to', '\u05E2\u05DC': 'upon', '\u05DE\u05DF': 'from',
  '\u05D1\u05DF': 'son-of', '\u05DB\u05DC': 'all', '\u05DC\u05D0': 'not',
};

// ═══════════════════════════════════════════════════════════
// STEP 6: Glossing functions
// ═══════════════════════════════════════════════════════════

function tryPrefixStrip(word) {
  if (glossDict[word]) return glossDict[word];

  const noSof = word.replace(/\u05C3$/, '');
  if (noSof !== word && glossDict[noSof]) return glossDict[noSof];

  for (const p of PREFIXES) {
    if (p.pattern.test(word)) {
      const stem = word.replace(p.pattern, '');
      if (stem.length >= 2) {
        if (glossDict[stem]) return p.gloss + glossDict[stem];
        const stemClean = stem.replace(/\u05C3$/, '');
        if (stemClean !== stem && glossDict[stemClean]) return p.gloss + glossDict[stemClean];
      }
    }
  }
  return null;
}

function tryMaqafCompound(word) {
  if (!word.includes('\u05BE') && !word.includes('-')) return null;
  const sep = word.includes('\u05BE') ? '\u05BE' : '-';
  const parts = word.split(sep);

  if (parts.length === 2) {
    const [first, second] = parts;
    const firstGloss = glossDict[first] || MAQAF_FIRST[first] || MAQAF_FIRST[stripNikkud(first)];
    const secondGloss = glossDict[second] || tryPrefixStrip(second);

    if (firstGloss && secondGloss) return firstGloss + '-' + secondGloss;
    if (firstGloss && !secondGloss) return firstGloss + '-???';
    if (!firstGloss && secondGloss) return '???-' + secondGloss;
  }

  if (parts.length > 2) {
    const glosses = parts.map(p => glossDict[p] || MAQAF_FIRST[p] || MAQAF_FIRST[stripNikkud(p)] || tryPrefixStrip(p) || '???');
    if (glosses.some(g => g !== '???')) return glosses.join('-');
  }

  return null;
}

function glossWord(word) {
  if (word === '\u05C3') return '';
  if (glossDict[word]) return glossDict[word];

  const noSof = word.replace(/\u05C3$/, '');
  if (noSof !== word && glossDict[noSof]) return glossDict[noSof];

  // Maqaf compound
  if (word.includes('\u05BE')) {
    const result = tryMaqafCompound(word);
    if (result && !result.includes('???')) return result;
  }

  const stripped = tryPrefixStrip(word);
  if (stripped) return stripped;

  // Consonant-only fallback
  const cons = word.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
  if (cons.length >= 2 && consonantMap[cons]) return consonantMap[cons];

  // Consonant-only with prefix strip
  for (const p of PREFIXES) {
    if (p.pattern.test(word)) {
      const after = word.replace(p.pattern, '');
      const afterCons = after.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
      if (afterCons.length >= 2 && consonantMap[afterCons]) return p.gloss + consonantMap[afterCons];
    }
  }

  // Maqaf compound with consonant fallback
  if (word.indexOf('\u05BE') >= 0) {
    const parts = word.split('\u05BE');
    const glossed = parts.map(p => {
      if (glossDict[p]) return glossDict[p];
      const c = p.replace(/[^\u05D0-\u05EA\u05BE]/g, '');
      return (c.length >= 2 && consonantMap[c]) ? consonantMap[c] : null;
    });
    if (glossed.every(g => g !== null)) return glossed.join('-');
  }

  // Suffix stripping
  const suffix = trySuffixStrip(word);
  if (suffix) return suffix;

  // Prefix + suffix combination
  for (const p of PREFIXES) {
    if (p.pattern.test(word)) {
      const afterPrefix = word.replace(p.pattern, '');
      if (afterPrefix.length >= 3) {
        const pfSuffix = trySuffixStrip(afterPrefix);
        if (pfSuffix) return p.gloss + pfSuffix;
      }
    }
  }

  // Partial maqaf
  if (word.includes('\u05BE')) {
    const result = tryMaqafCompound(word);
    if (result) return result;
  }

  return '???';
}

// ═══════════════════════════════════════════════════════════
// STEP 7: Tokenize and gloss all verses
// ═══════════════════════════════════════════════════════════
console.log('Step 5: Tokenizing and glossing...');

function tokenizeVerse(text) {
  const tokens = [];
  const rawTokens = text.split(/\s+/).filter(t => t.length > 0);

  for (const token of rawTokens) {
    let word = token;

    // Skip em dashes and other non-Hebrew punctuation
    if (word === '\u2014' || word === '—' || word === '-' || word === '–') continue;

    // Handle sof pasuk at end of word
    if (word.endsWith('\u05C3')) {
      const main = word.replace(/\u05C3$/, '');
      if (main) tokens.push(main);
      tokens.push('\u05C3');
    } else {
      tokens.push(word);
    }
  }

  // Ensure verse ends with sof pasuk
  if (tokens.length > 0 && tokens[tokens.length - 1] !== '\u05C3') {
    tokens.push('\u05C3');
  }

  return tokens;
}

// Process all books
const glossedBooks = {};
let totalWords = 0;
let totalGlossed = 0;
let totalUnknown = 0;
const unknownWords = new Map(); // word -> count

const bookStats = {};

for (const [code, chapters] of Object.entries(books)) {
  glossedBooks[code] = {};
  bookStats[code] = { words: 0, glossed: 0, unknown: 0 };

  for (const [chNum, verses] of Object.entries(chapters)) {
    glossedBooks[code][chNum] = verses.map(verse => {
      const tokens = tokenizeVerse(verse.text);
      const words = tokens.map(token => {
        const gloss = glossWord(token);
        totalWords++;
        bookStats[code].words++;

        if (gloss === '???' || gloss.includes('???')) {
          totalUnknown++;
          bookStats[code].unknown++;
          unknownWords.set(token, (unknownWords.get(token) || 0) + 1);
        } else {
          totalGlossed++;
          bookStats[code].glossed++;
        }

        return [token, gloss];
      });

      return { num: verse.num, words };
    });
  }
}

// Print glossing stats
console.log('\n=== Glossing Report ===');
for (const [code, stats] of Object.entries(bookStats)) {
  const bm = BOOK_MARKERS.find(b => b.code === code);
  const pct = stats.words > 0 ? ((stats.glossed / stats.words) * 100).toFixed(1) : 0;
  console.log(`  ${(bm ? bm.name : code).padEnd(20)} ${String(stats.words).padStart(5)} words, ${String(stats.glossed).padStart(5)} glossed (${pct}%), ${stats.unknown} ???`);
}
console.log(`  ${'TOTAL'.padEnd(20)} ${totalWords} words, ${totalGlossed} glossed (${((totalGlossed/totalWords)*100).toFixed(1)}%), ${totalUnknown} ???`);

// Sort unknown words by frequency
const unknownSorted = [...unknownWords.entries()].sort((a, b) => b[1] - a[1]);
console.log(`\nUnique ??? words: ${unknownSorted.length}`);
console.log('\nTop 30 most frequent ??? words:');
unknownSorted.slice(0, 30).forEach(([word, count]) => {
  console.log(`  ${word} (${count}x)`);
});

// ═══════════════════════════════════════════════════════════
// STEP 8: Output verse JS files
// ═══════════════════════════════════════════════════════════
console.log('\nStep 6: Writing verse JS files...');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const FILE_MAP = {
  ms: 'moses.js',
  ab: 'abraham.js',
  jsm: 'js_matthew.js',
  jsh: 'js_history.js',
  aof: 'articles_of_faith.js'
};

for (const [code, chapters] of Object.entries(glossedBooks)) {
  const fileName = FILE_MAP[code];
  if (!fileName) continue;

  const bm = BOOK_MARKERS.find(b => b.code === code);
  let js = `// pgp_verses/${fileName} \u2014 ${bm ? bm.name : code} verse data\n`;
  js += '(function() {\n';

  const chNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);

  for (const chNum of chNums) {
    const verses = chapters[chNum];
    const varName = `${code}_ch${chNum}Verses`;

    js += `var ${varName} = [\n`;
    for (let vi = 0; vi < verses.length; vi++) {
      const v = verses[vi];
      const wordsStr = v.words.map(w => `["${w[0].replace(/"/g, '\\"')}","${w[1].replace(/"/g, '\\"')}"]`).join(',');
      js += `  { num: "${v.num}", words: [\n    ${wordsStr}\n  ]}`;
      if (vi < verses.length - 1) js += ',';
      js += '\n';
    }
    js += '];\n';
    js += `renderVerseSet(${varName}, '${code}-ch${chNum}-verses');\n`;
  }

  js += '})();\n';

  const outPath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(outPath, js, 'utf8');
  console.log(`  ${fileName}: ${chNums.length} chapters written`);
}

// Save unknown words list for review
const unknownPath = path.join(__dirname, 'pgp_unknown_words.txt');
let unknownReport = `PGoP Unknown Words Report\n${'='.repeat(40)}\n`;
unknownReport += `Total unique: ${unknownSorted.length}\n\n`;
unknownSorted.forEach(([word, count]) => {
  unknownReport += `${word}\t${count}x\n`;
});
fs.writeFileSync(unknownPath, unknownReport, 'utf8');
console.log(`  Unknown words list: pgp_unknown_words.txt`);

// Clean up extraction directory
try {
  fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  console.log('  Cleaned up temp extraction directory');
} catch (e) {}

console.log('\n=== Done! ===');
