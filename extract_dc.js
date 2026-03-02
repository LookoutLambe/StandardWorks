// extract_dc.js — Doctrine and Covenants DOCX extraction & auto-glossing
// Usage: node extract_dc.js
// Reads D&C Hebrew DOCX, tokenizes, auto-glosses from BOM+PGP dictionary,
// outputs verse JS files to dc_verses/

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// PATHS
// ═══════════════════════════════════════════════════════════
const BOM_DIR = path.resolve(__dirname, '..', 'Hebrew BOM');
const DC_DOCX = path.join(BOM_DIR, 'Doctrine and Covenants - Hebrew 2026.docx');
const BOM_VERSES_DIR = path.join(BOM_DIR, 'verses');
const PGP_VERSES_DIR = path.join(__dirname, 'pgp_verses');
const OUTPUT_DIR = path.join(__dirname, 'dc_verses');
const EXTRACT_DIR = path.join(__dirname, 'dc_docx_extract');

// ═══════════════════════════════════════════════════════════
// STEP 1: Extract XML from DOCX
// ═══════════════════════════════════════════════════════════
console.log('=== D&C Extraction Pipeline ===\n');
console.log('Step 1: Extracting DOCX...');

if (!fs.existsSync(DC_DOCX)) {
  console.error('ERROR: D&C DOCX not found at:', DC_DOCX);
  process.exit(1);
}

if (!fs.existsSync(EXTRACT_DIR)) {
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
}

const zipCopy = path.join(__dirname, 'temp_dc.zip');
fs.copyFileSync(DC_DOCX, zipCopy);
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
  const paraRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let match;
  while ((match = paraRegex.exec(xml)) !== null) {
    const pXml = match[0];
    const runs = pXml.match(/<w:r[\s>][\s\S]*?<\/w:r>/g) || [];
    let text = '';
    let hasBold = false;
    for (const run of runs) {
      const isBold = /<w:b[\s/>]/.test(run);
      const textMatches = run.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      for (const tm of textMatches) {
        const t = tm.replace(/<[^>]+>/g, '');
        text += t;
        if (isBold && t.trim()) hasBold = true;
      }
    }
    text = text.trim();
    if (text) paragraphs.push({ text, bold: hasBold });
  }
  return paragraphs;
}

const paragraphs = extractParagraphs(xml);
console.log(`  ${paragraphs.length} non-empty paragraphs\n`);

// ═══════════════════════════════════════════════════════════
// STEP 3: Identify sections and verses
// ═══════════════════════════════════════════════════════════
console.log('Step 3: Identifying sections...');

// Hebrew number decoder
function hebToArabic(heb) {
  const vals = { 'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
    'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,
    'ק':100,'ר':200,'ש':300,'ת':400 };
  // Handle special cases
  if (heb === 'טו') return 15;
  if (heb === 'טז') return 16;
  let total = 0;
  for (const ch of heb) {
    if (vals[ch]) total += vals[ch];
  }
  return total;
}

function toHebNum(n) {
  if (n <= 0) return '';
  const ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const hundreds = ['','ק','ר','ש','ת'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  let result = '';
  if (n >= 100) {
    const h = Math.floor(n / 100);
    if (h <= 4) result += hundreds[h];
    else result += 'ת' + (h > 5 ? hundreds[h - 4] : hundreds[h - 4]);
    n %= 100;
  }
  if (n >= 10) {
    result += tens[Math.floor(n / 10)];
    n %= 10;
  }
  // Special: 15=טו, 16=טז
  if (n > 0) result += ones[n];
  return result;
}

// Parse sections
const sections = []; // { sectionNum, headerIdx, introText, verses: [{num, text}] }
let currentSection = null;

for (let i = 0; i < paragraphs.length; i++) {
  const p = paragraphs[i];

  // Match section headers:
  // Pattern 1: "חֵלֶק" + Hebrew numeral (sections 1-113)
  // Pattern 2: Just Hebrew numeral for sections 114+
  // Pattern 3: Official Declarations: "הַכְרָזָה רִשְׁמִית א׳" / "ב׳"
  let sectionNum = null;
  let isOD = false;

  if (p.bold) {
    // Strip nikkud for matching
    const stripped = p.text.replace(/[\u0591-\u05C7]/g, '').trim();

    // Pattern 1: חלק + number
    const chelekMatch = stripped.match(/^חלק\s+(.+)$/);
    if (chelekMatch) {
      sectionNum = hebToArabic(chelekMatch[1].trim());
    }

    // Pattern 2: Just Hebrew numeral (for sections 114+)
    if (!sectionNum && /^[א-ת]{2,3}$/.test(stripped)) {
      const num = hebToArabic(stripped);
      if (num >= 114 && num <= 138) {
        sectionNum = num;
      }
    }

    // Pattern 3: Official Declaration
    const odMatch = stripped.match(/הכרזה\s*רשמית\s*([אב])/);
    if (odMatch) {
      isOD = true;
      sectionNum = odMatch[1] === 'א' ? 'OD1' : 'OD2';
    }
  }

  if (sectionNum !== null) {
    // Save previous section
    if (currentSection) sections.push(currentSection);
    currentSection = { sectionNum, headerIdx: i, introText: '', verses: [] };
    continue;
  }

  // Process verse or intro text within a section
  if (currentSection) {
    const verseMatch = p.text.match(/^(\d+)\.?\s+(.+)/);
    if (verseMatch) {
      currentSection.verses.push({
        num: parseInt(verseMatch[1], 10),
        text: verseMatch[2]
      });
    } else if (typeof currentSection.sectionNum === 'string' && !p.bold) {
      // Official Declaration: treat each paragraph as a pseudo-verse
      currentSection.odParaCount = (currentSection.odParaCount || 0) + 1;
      currentSection.verses.push({
        num: currentSection.odParaCount,
        text: p.text
      });
    } else if (currentSection.verses.length === 0 && !p.bold) {
      // Intro/heading text before first verse
      if (currentSection.introText) currentSection.introText += ' ';
      currentSection.introText += p.text;
    }
  }
}

// Push last section
if (currentSection) sections.push(currentSection);

console.log(`  Found ${sections.length} sections`);
let totalVerses = 0;
sections.forEach(s => totalVerses += s.verses.length);
console.log(`  Total verses: ${totalVerses}`);

// Show section summary
console.log('\n  Section breakdown:');
sections.forEach(s => {
  const label = typeof s.sectionNum === 'string' ? s.sectionNum : `Section ${s.sectionNum}`;
  console.log(`    ${label}: ${s.verses.length} verses`);
});

// ═══════════════════════════════════════════════════════════
// STEP 4: Build glossing dictionary from BOM + PGP verses
// ═══════════════════════════════════════════════════════════
console.log('\nStep 4: Building glossing dictionary...');

function loadVerseFiles(dir) {
  const dict = {};
  if (!fs.existsSync(dir)) return dict;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const pairRegex = /\["([^"]+)","([^"]+)"\]/g;
    let m;
    while ((m = pairRegex.exec(content)) !== null) {
      const heb = m[1];
      const gloss = m[2];
      if (heb !== '׃' && gloss !== '' && !gloss.includes('???')) {
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

const bomDict = loadVerseFiles(BOM_VERSES_DIR);
const pgpDict = loadVerseFiles(PGP_VERSES_DIR);
// Priority: Strong's < TAHOT < BOM < PGP < supplement (supplement highest)
const glossDict = { ...strongsDict, ...tahotDict, ...bomDict, ...pgpDict, ...suppDict };
console.log(`  BOM: ${Object.keys(bomDict).length}, PGP: ${Object.keys(pgpDict).length}`);
console.log(`  Combined: ${Object.keys(glossDict).length} unique entries`);

// ═══════════════════════════════════════════════════════════
// STEP 5: Tokenize and gloss
// ═══════════════════════════════════════════════════════════
console.log('\nStep 5: Tokenizing and glossing...');

// Hebrew prefix patterns for prefix stripping
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

function tokenize(text) {
  return text.split(/\s+/).filter(w => w.length > 0);
}

function tryMaqafCompound(word) {
  if (word.indexOf('\u05BE') < 0) return null;
  const parts = word.split('\u05BE');
  const glossed = parts.map(p => glossDict[p] || null);
  if (glossed.every(g => g !== null)) {
    return glossed.join('-');
  }
  // Try prefix strip on first part
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
      if (stripped.length >= 2 && glossDict[stripped]) {
        return pf.gl + glossDict[stripped];
      }
    }
  }
  // Two-prefix strip (e.g., וְהַ = and-the-)
  for (const pf1 of PREFIXES) {
    if (pf1.re.test(word)) {
      const after1 = word.replace(pf1.re, '');
      for (const pf2 of PREFIXES) {
        if (pf2.re.test(after1)) {
          const after2 = after1.replace(pf2.re, '');
          if (after2.length >= 2 && glossDict[after2]) {
            return pf1.gl + pf2.gl + glossDict[after2];
          }
        }
      }
    }
  }
  return null;
}

function glossWord(word) {
  if (glossDict[word]) return glossDict[word];
  const maqaf = tryMaqafCompound(word);
  if (maqaf) return maqaf;
  const prefix = tryPrefixStrip(word);
  if (prefix) return prefix;
  // Consonant-only fallback
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

// Process all sections
let totalWords = 0;
let glossedWords = 0;
let unknownWords = 0;
const unknownSet = new Set();

const processedSections = [];

for (const section of sections) {
  const processedVerses = [];
  for (const verse of section.verses) {
    const tokens = tokenize(verse.text);
    const words = [];
    for (const tok of tokens) {
      // Skip em-dashes and non-Hebrew
      if (tok === '—' || tok === '–' || /^[A-Za-z0-9.,;:!?'"()\-]+$/.test(tok)) continue;
      const gloss = glossWord(tok);
      words.push([tok, gloss]);
      totalWords++;
      if (gloss === '???') {
        unknownWords++;
        unknownSet.add(tok);
      } else {
        glossedWords++;
      }
    }
    // Add sof pasuk
    words.push(['׃', '']);
    processedVerses.push({ num: verse.num, words });
  }
  processedSections.push({
    sectionNum: section.sectionNum,
    verses: processedVerses
  });
}

const pct = totalWords > 0 ? (glossedWords / totalWords * 100).toFixed(1) : 0;
console.log(`  Total words: ${totalWords}`);
console.log(`  Glossed: ${glossedWords} (${pct}%)`);
console.log(`  Unknown: ${unknownWords} (???)`);
console.log(`  Unique unknowns: ${unknownSet.size}`);

// ═══════════════════════════════════════════════════════════
// STEP 6: Output verse JS files
// ═══════════════════════════════════════════════════════════
console.log('\nStep 6: Writing verse JS files...');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Group sections into files: one file per section is too many (140 files)
// Group by ranges: dc1-10.js, dc11-20.js, ..., dc131-138.js, od.js
function getSectionFileName(sectionNum) {
  if (typeof sectionNum === 'string') return 'od'; // Official Declarations
  const start = Math.floor((sectionNum - 1) / 10) * 10 + 1;
  const end = Math.min(start + 9, 138);
  return `dc${start}_${end}`;
}

// Group sections by file
const fileGroups = {};
for (const ps of processedSections) {
  const fname = getSectionFileName(ps.sectionNum);
  if (!fileGroups[fname]) fileGroups[fname] = [];
  fileGroups[fname].push(ps);
}

let totalLines = 0;
for (const [fname, secs] of Object.entries(fileGroups)) {
  let js = `// dc_verses/${fname}.js — D&C verse data\n`;
  js += '(function() {\n';

  for (const sec of secs) {
    const prefix = typeof sec.sectionNum === 'string'
      ? (sec.sectionNum === 'OD1' ? 'od1' : 'od2')
      : `dc${sec.sectionNum}`;
    const varName = `${prefix}_ch1Verses`;
    const containerId = `${prefix}-ch1-verses`;

    js += `var ${varName} = [\n`;
    for (const v of sec.verses) {
      const hebNum = typeof sec.sectionNum === 'string'
        ? toHebNum(v.num)
        : toHebNum(v.num);
      const wordsStr = v.words.map(([h, g]) => `["${h.replace(/"/g, '\\"')}","${g.replace(/"/g, '\\"')}"]`).join(',');
      js += `  { num: "${hebNum}", words: [\n    ${wordsStr}\n  ]},\n`;
    }
    js += '];\n';
    js += `renderVerseSet(${varName}, '${containerId}');\n\n`;
  }

  js += '})();\n';

  const outPath = path.join(OUTPUT_DIR, fname + '.js');
  fs.writeFileSync(outPath, js, 'utf8');
  const lines = js.split('\n').length;
  totalLines += lines;
  console.log(`  ${fname}.js: ${lines} lines (${secs.length} sections, ${secs.reduce((a, s) => a + s.verses.length, 0)} verses)`);
}

console.log(`\n  Total: ${totalLines} lines across ${Object.keys(fileGroups).length} files`);

// Write unknown words list
const unknownList = [...unknownSet].sort();
fs.writeFileSync(
  path.join(__dirname, 'dc_unknown_words.txt'),
  unknownList.join('\n'),
  'utf8'
);
console.log(`  Unknown words list: dc_unknown_words.txt (${unknownList.length} unique)`);

// Show top unknowns by frequency
const unknownFreq = {};
for (const sec of processedSections) {
  for (const v of sec.verses) {
    for (const [h, g] of v.words) {
      if (g === '???') unknownFreq[h] = (unknownFreq[h] || 0) + 1;
    }
  }
}
const topUnknowns = Object.entries(unknownFreq).sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log('\n  Top 30 unknown words:');
topUnknowns.forEach(([w, c]) => console.log(`    ${w}: ${c}x`));

// Cleanup extract dir
fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
console.log('\n=== Done! ===');
