// extract_jst.js — Joseph Smith Translation extraction & verse assembly
// Usage: node extract_jst.js
// Loads existing Hebrew verse data from ot_verses/ and nt_verses/,
// maps to JST chapter structure, outputs jst_verses/*.js

const fs = require('fs');
const path = require('path');
const https = require('https');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════
const OT_VERSES_DIR = path.join(__dirname, 'ot_verses');
const NT_VERSES_DIR = path.join(__dirname, 'nt_verses');
const OUTPUT_DIR = path.join(__dirname, 'jst_verses');
const CACHE_DIR = path.join(__dirname, '_cache', 'jst');

// ═══════════════════════════════════════════════════════════
// JST ENTRY CATALOG — every JST appendix entry
// source: 'ot' or 'nt' — which verse set to pull Hebrew from
// srcPrefix: prefix in ot_verses/ or nt_verses/ (e.g. 'gen', 'matt')
// srcChapter: which KJV chapter(s) to load Hebrew from
// ═══════════════════════════════════════════════════════════
const JST_BOOKS = [
  // ─── OLD TESTAMENT ───
  {
    code: 'jstgen', en: 'Genesis', he: 'בְּרֵאשִׁית', source: 'ot', srcPrefix: 'gen',
    entries: [
      { ch: 1, label: 'JST, Genesis 1–8', srcChapters: [1,2,3,4,5,6], slug: 'jst-gen/1-8' },
      { ch: 2, label: 'JST, Genesis 9', srcChapters: [8,9], slug: 'jst-gen/9' },
      { ch: 3, label: 'JST, Genesis 14', srcChapters: [14], slug: 'jst-gen/14' },
      { ch: 4, label: 'JST, Genesis 15', srcChapters: [15], slug: 'jst-gen/15' },
      { ch: 5, label: 'JST, Genesis 17', srcChapters: [17], slug: 'jst-gen/17' },
      { ch: 6, label: 'JST, Genesis 19', srcChapters: [19], slug: 'jst-gen/19' },
      { ch: 7, label: 'JST, Genesis 21', srcChapters: [21], slug: 'jst-gen/21' },
      { ch: 8, label: 'JST, Genesis 48', srcChapters: [48], slug: 'jst-gen/48' },
      { ch: 9, label: 'JST, Genesis 50', srcChapters: [50], slug: 'jst-gen/50' },
    ]
  },
  {
    code: 'jstexo', en: 'Exodus', he: 'שְׁמוֹת', source: 'ot', srcPrefix: 'exo',
    entries: [
      { ch: 1, label: 'JST, Exodus 4', srcChapters: [4], slug: 'jst-ex/4' },
      { ch: 2, label: 'JST, Exodus 18', srcChapters: [18], slug: 'jst-ex/18' },
      { ch: 3, label: 'JST, Exodus 22', srcChapters: [22], slug: 'jst-ex/22' },
      { ch: 4, label: 'JST, Exodus 32', srcChapters: [32], slug: 'jst-ex/32' },
      { ch: 5, label: 'JST, Exodus 33', srcChapters: [33], slug: 'jst-ex/33' },
      { ch: 6, label: 'JST, Exodus 34', srcChapters: [34], slug: 'jst-ex/34' },
    ]
  },
  {
    code: 'jstdeu', en: 'Deuteronomy', he: 'דְּבָרִים', source: 'ot', srcPrefix: 'deu',
    entries: [
      { ch: 1, label: 'JST, Deuteronomy 10', srcChapters: [10], slug: 'jst-deut/10' },
    ]
  },
  {
    code: 'jst1sa', en: '1 Samuel', he: 'שְׁמוּאֵל א', source: 'ot', srcPrefix: '1sa',
    entries: [
      { ch: 1, label: 'JST, 1 Samuel 16', srcChapters: [16], slug: 'jst-1-sam/16' },
    ]
  },
  {
    code: 'jst2sa', en: '2 Samuel', he: 'שְׁמוּאֵל ב', source: 'ot', srcPrefix: '2sa',
    entries: [
      { ch: 1, label: 'JST, 2 Samuel 12', srcChapters: [12], slug: 'jst-2-sam/12' },
    ]
  },
  {
    code: 'jst1ch', en: '1 Chronicles', he: 'דִּבְרֵי הַיָּמִים א', source: 'ot', srcPrefix: '1ch',
    entries: [
      { ch: 1, label: 'JST, 1 Chronicles 21', srcChapters: [21], slug: 'jst-1-chr/21' },
    ]
  },
  {
    code: 'jst2ch', en: '2 Chronicles', he: 'דִּבְרֵי הַיָּמִים ב', source: 'ot', srcPrefix: '2ch',
    entries: [
      { ch: 1, label: 'JST, 2 Chronicles 18', srcChapters: [18], slug: 'jst-2-chr/18' },
    ]
  },
  {
    code: 'jstpsa', en: 'Psalms', he: 'תְּהִלִּים', source: 'ot', srcPrefix: 'psa',
    entries: [
      { ch: 1, label: 'JST, Psalm 11', srcChapters: [11], slug: 'jst-ps/11' },
      { ch: 2, label: 'JST, Psalm 14', srcChapters: [14], slug: 'jst-ps/14' },
      { ch: 3, label: 'JST, Psalm 24', srcChapters: [24], slug: 'jst-ps/24' },
      { ch: 4, label: 'JST, Psalm 109', srcChapters: [109], slug: 'jst-ps/109' },
    ]
  },
  {
    code: 'jstisa', en: 'Isaiah', he: 'יְשַׁעְיָהוּ', source: 'ot', srcPrefix: 'isa',
    entries: [
      { ch: 1, label: 'JST, Isaiah 29', srcChapters: [29], slug: 'jst-isa/29' },
      { ch: 2, label: 'JST, Isaiah 42', srcChapters: [42], slug: 'jst-isa/42' },
    ]
  },
  {
    code: 'jstjer', en: 'Jeremiah', he: 'יִרְמְיָהוּ', source: 'ot', srcPrefix: 'jer',
    entries: [
      { ch: 1, label: 'JST, Jeremiah 26', srcChapters: [26], slug: 'jst-jer/26' },
    ]
  },
  {
    code: 'jstamo', en: 'Amos', he: 'עָמוֹס', source: 'ot', srcPrefix: 'amo',
    entries: [
      { ch: 1, label: 'JST, Amos 7', srcChapters: [7], slug: 'jst-amos/7' },
    ]
  },

  // ─── NEW TESTAMENT ───
  {
    code: 'jstmatt', en: 'Matthew', he: 'מַתָּי', source: 'nt', srcPrefix: 'matt',
    entries: [
      { ch: 1, label: 'JST, Matthew 3', srcChapters: [3], slug: 'jst-matt/3' },
      { ch: 2, label: 'JST, Matthew 4', srcChapters: [4], slug: 'jst-matt/4' },
      { ch: 3, label: 'JST, Matthew 5', srcChapters: [5], slug: 'jst-matt/5' },
      { ch: 4, label: 'JST, Matthew 6', srcChapters: [6], slug: 'jst-matt/6' },
      { ch: 5, label: 'JST, Matthew 7', srcChapters: [7], slug: 'jst-matt/7' },
      { ch: 6, label: 'JST, Matthew 9', srcChapters: [9], slug: 'jst-matt/9' },
      { ch: 7, label: 'JST, Matthew 11', srcChapters: [11], slug: 'jst-matt/11' },
      { ch: 8, label: 'JST, Matthew 12', srcChapters: [12], slug: 'jst-matt/12' },
      { ch: 9, label: 'JST, Matthew 13', srcChapters: [13], slug: 'jst-matt/13' },
      { ch: 10, label: 'JST, Matthew 16', srcChapters: [16], slug: 'jst-matt/16' },
      { ch: 11, label: 'JST, Matthew 17', srcChapters: [17], slug: 'jst-matt/17' },
      { ch: 12, label: 'JST, Matthew 18', srcChapters: [18], slug: 'jst-matt/18' },
      { ch: 13, label: 'JST, Matthew 19', srcChapters: [19], slug: 'jst-matt/19' },
      { ch: 14, label: 'JST, Matthew 21', srcChapters: [21], slug: 'jst-matt/21' },
      { ch: 15, label: 'JST, Matthew 23', srcChapters: [23], slug: 'jst-matt/23' },
      { ch: 16, label: 'JST, Matthew 26', srcChapters: [26], slug: 'jst-matt/26' },
      { ch: 17, label: 'JST, Matthew 27', srcChapters: [27], slug: 'jst-matt/27' },
    ]
  },
  {
    code: 'jstmark', en: 'Mark', he: 'מַרְקוֹס', source: 'nt', srcPrefix: 'mark',
    entries: [
      { ch: 1, label: 'JST, Mark 2', srcChapters: [2], slug: 'jst-mark/2' },
      { ch: 2, label: 'JST, Mark 3', srcChapters: [3], slug: 'jst-mark/3' },
      { ch: 3, label: 'JST, Mark 7', srcChapters: [7], slug: 'jst-mark/7' },
      { ch: 4, label: 'JST, Mark 8', srcChapters: [8], slug: 'jst-mark/8' },
      { ch: 5, label: 'JST, Mark 9', srcChapters: [9], slug: 'jst-mark/9' },
      { ch: 6, label: 'JST, Mark 12', srcChapters: [12], slug: 'jst-mark/12' },
      { ch: 7, label: 'JST, Mark 14', srcChapters: [14], slug: 'jst-mark/14' },
      { ch: 8, label: 'JST, Mark 16', srcChapters: [16], slug: 'jst-mark/16' },
    ]
  },
  {
    code: 'jstluke', en: 'Luke', he: 'לוּקָס', source: 'nt', srcPrefix: 'luke',
    entries: [
      { ch: 1, label: 'JST, Luke 1', srcChapters: [1], slug: 'jst-luke/1' },
      { ch: 2, label: 'JST, Luke 2', srcChapters: [2], slug: 'jst-luke/2' },
      { ch: 3, label: 'JST, Luke 3', srcChapters: [3], slug: 'jst-luke/3' },
      { ch: 4, label: 'JST, Luke 6', srcChapters: [6], slug: 'jst-luke/6' },
      { ch: 5, label: 'JST, Luke 9', srcChapters: [9], slug: 'jst-luke/9' },
      { ch: 6, label: 'JST, Luke 11', srcChapters: [11], slug: 'jst-luke/11' },
      { ch: 7, label: 'JST, Luke 12', srcChapters: [12], slug: 'jst-luke/12' },
      { ch: 8, label: 'JST, Luke 14', srcChapters: [14], slug: 'jst-luke/14' },
      { ch: 9, label: 'JST, Luke 16', srcChapters: [16], slug: 'jst-luke/16' },
      { ch: 10, label: 'JST, Luke 17', srcChapters: [17], slug: 'jst-luke/17' },
      { ch: 11, label: 'JST, Luke 18', srcChapters: [18], slug: 'jst-luke/18' },
      { ch: 12, label: 'JST, Luke 21', srcChapters: [21], slug: 'jst-luke/21' },
      { ch: 13, label: 'JST, Luke 23', srcChapters: [23], slug: 'jst-luke/23' },
      { ch: 14, label: 'JST, Luke 24', srcChapters: [24], slug: 'jst-luke/24' },
    ]
  },
  {
    code: 'jstjohn', en: 'John', he: 'יוֹחָנָן', source: 'nt', srcPrefix: 'john',
    entries: [
      { ch: 1, label: 'JST, John 1', srcChapters: [1], slug: 'jst-john/1' },
      { ch: 2, label: 'JST, John 4', srcChapters: [4], slug: 'jst-john/4' },
      { ch: 3, label: 'JST, John 6', srcChapters: [6], slug: 'jst-john/6' },
      { ch: 4, label: 'JST, John 13', srcChapters: [13], slug: 'jst-john/13' },
      { ch: 5, label: 'JST, John 14', srcChapters: [14], slug: 'jst-john/14' },
    ]
  },
  {
    code: 'jstacts', en: 'Acts', he: 'מַעֲשֵׂי הַשְּׁלִיחִים', source: 'nt', srcPrefix: 'acts',
    entries: [
      { ch: 1, label: 'JST, Acts 9', srcChapters: [9], slug: 'jst-acts/9' },
      { ch: 2, label: 'JST, Acts 22', srcChapters: [22], slug: 'jst-acts/22' },
    ]
  },
  {
    code: 'jstrom', en: 'Romans', he: 'אֶל הָרוֹמִים', source: 'nt', srcPrefix: 'rom',
    entries: [
      { ch: 1, label: 'JST, Romans 3', srcChapters: [3], slug: 'jst-rom/3' },
      { ch: 2, label: 'JST, Romans 4', srcChapters: [4], slug: 'jst-rom/4' },
      { ch: 3, label: 'JST, Romans 7', srcChapters: [7], slug: 'jst-rom/7' },
      { ch: 4, label: 'JST, Romans 8', srcChapters: [8], slug: 'jst-rom/8' },
      { ch: 5, label: 'JST, Romans 13', srcChapters: [13], slug: 'jst-rom/13' },
    ]
  },
  {
    code: 'jst1co', en: '1 Corinthians', he: 'אֶל הַקּוֹרִנְתִּים א', source: 'nt', srcPrefix: '1co',
    entries: [
      { ch: 1, label: 'JST, 1 Corinthians 7', srcChapters: [7], slug: 'jst-1-cor/7' },
      { ch: 2, label: 'JST, 1 Corinthians 15', srcChapters: [15], slug: 'jst-1-cor/15' },
    ]
  },
  {
    code: 'jst2co', en: '2 Corinthians', he: 'אֶל הַקּוֹרִנְתִּים ב', source: 'nt', srcPrefix: '2co',
    entries: [
      { ch: 1, label: 'JST, 2 Corinthians 5', srcChapters: [5], slug: 'jst-2-cor/5' },
    ]
  },
  {
    code: 'jstgal', en: 'Galatians', he: 'אֶל הַגָּלָטִים', source: 'nt', srcPrefix: 'gal',
    entries: [
      { ch: 1, label: 'JST, Galatians 3', srcChapters: [3], slug: 'jst-gal/3' },
    ]
  },
  {
    code: 'jsteph', en: 'Ephesians', he: 'אֶל הָאֶפֶסִיִּים', source: 'nt', srcPrefix: 'eph',
    entries: [
      { ch: 1, label: 'JST, Ephesians 4', srcChapters: [4], slug: 'jst-eph/4' },
    ]
  },
  {
    code: 'jstcol', en: 'Colossians', he: 'אֶל הַקּוֹלוֹסִּים', source: 'nt', srcPrefix: 'col',
    entries: [
      { ch: 1, label: 'JST, Colossians 2', srcChapters: [2], slug: 'jst-col/2' },
    ]
  },
  {
    code: 'jst1th', en: '1 Thessalonians', he: 'אֶל הַתֶּסָלוֹנִיקִים א', source: 'nt', srcPrefix: '1th',
    entries: [
      { ch: 1, label: 'JST, 1 Thessalonians 4', srcChapters: [4], slug: 'jst-1-thes/4' },
    ]
  },
  {
    code: 'jst2th', en: '2 Thessalonians', he: 'אֶל הַתֶּסָלוֹנִיקִים ב', source: 'nt', srcPrefix: '2th',
    entries: [
      { ch: 1, label: 'JST, 2 Thessalonians 2', srcChapters: [2], slug: 'jst-2-thes/2' },
    ]
  },
  {
    code: 'jst1ti', en: '1 Timothy', he: 'אֶל טִימוֹתֵיאוֹס א', source: 'nt', srcPrefix: '1ti',
    entries: [
      { ch: 1, label: 'JST, 1 Timothy 2', srcChapters: [2], slug: 'jst-1-tim/2' },
      { ch: 2, label: 'JST, 1 Timothy 3', srcChapters: [3], slug: 'jst-1-tim/3' },
      { ch: 3, label: 'JST, 1 Timothy 6', srcChapters: [6], slug: 'jst-1-tim/6' },
    ]
  },
  {
    code: 'jstheb', en: 'Hebrews', he: 'אֶל הָעִבְרִים', source: 'nt', srcPrefix: 'heb',
    entries: [
      { ch: 1, label: 'JST, Hebrews 1', srcChapters: [1], slug: 'jst-heb/1' },
      { ch: 2, label: 'JST, Hebrews 4', srcChapters: [4], slug: 'jst-heb/4' },
      { ch: 3, label: 'JST, Hebrews 6', srcChapters: [6], slug: 'jst-heb/6' },
      { ch: 4, label: 'JST, Hebrews 7', srcChapters: [7], slug: 'jst-heb/7' },
      { ch: 5, label: 'JST, Hebrews 11', srcChapters: [11], slug: 'jst-heb/11' },
    ]
  },
  {
    code: 'jstjas', en: 'James', he: 'יַעֲקֹב', source: 'nt', srcPrefix: 'jas',
    entries: [
      { ch: 1, label: 'JST, James 1', srcChapters: [1], slug: 'jst-james/1' },
      { ch: 2, label: 'JST, James 2', srcChapters: [2], slug: 'jst-james/2' },
    ]
  },
  {
    code: 'jst1pe', en: '1 Peter', he: 'פֶּטְרוֹס א', source: 'nt', srcPrefix: '1pe',
    entries: [
      { ch: 1, label: 'JST, 1 Peter 3', srcChapters: [3], slug: 'jst-1-pet/3' },
      { ch: 2, label: 'JST, 1 Peter 4', srcChapters: [4], slug: 'jst-1-pet/4' },
    ]
  },
  {
    code: 'jst2pe', en: '2 Peter', he: 'פֶּטְרוֹס ב', source: 'nt', srcPrefix: '2pe',
    entries: [
      { ch: 1, label: 'JST, 2 Peter 3', srcChapters: [3], slug: 'jst-2-pet/3' },
    ]
  },
  {
    code: 'jst1jn', en: '1 John', he: 'יוֹחָנָן א', source: 'nt', srcPrefix: '1jn',
    entries: [
      { ch: 1, label: 'JST, 1 John 2', srcChapters: [2], slug: 'jst-1-jn/2' },
      { ch: 2, label: 'JST, 1 John 3', srcChapters: [3], slug: 'jst-1-jn/3' },
      { ch: 3, label: 'JST, 1 John 4', srcChapters: [4], slug: 'jst-1-jn/4' },
    ]
  },
  {
    code: 'jstrev', en: 'Revelation', he: 'הִתְגַּלּוּת', source: 'nt', srcPrefix: 'rev',
    entries: [
      { ch: 1, label: 'JST, Revelation 1', srcChapters: [1], slug: 'jst-rev/1' },
      { ch: 2, label: 'JST, Revelation 2', srcChapters: [2], slug: 'jst-rev/2' },
      { ch: 3, label: 'JST, Revelation 5', srcChapters: [5], slug: 'jst-rev/5' },
      { ch: 4, label: 'JST, Revelation 12', srcChapters: [12], slug: 'jst-rev/12' },
      { ch: 5, label: 'JST, Revelation 19', srcChapters: [19], slug: 'jst-rev/19' },
    ]
  },
];

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

// Hebrew numeral → Arabic
function fromHebNum(h) {
  const vals = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
    'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,
    'ק':100,'ר':200,'ש':300,'ת':400};
  let n = 0;
  for (const c of h) {
    if (vals[c]) n += vals[c];
  }
  return n;
}

// ═══════════════════════════════════════════════════════════
// STEP 1: Load existing Hebrew verse data from JS files
// ═══════════════════════════════════════════════════════════
console.log('=== JST Extraction Pipeline ===\n');
console.log('Step 1: Loading existing Hebrew verse data...');

function loadVerseData(dir, prefix) {
  const filePath = path.join(dir, prefix + '.js');
  if (!fs.existsSync(filePath)) {
    console.log(`  WARNING: ${filePath} not found`);
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const chapters = {};

  // Match: var prefix_chNVerses = [ ... ]; renderVerseSet(...)
  const varRegex = new RegExp(`var\\s+${prefix}_ch(\\d+)Verses\\s*=\\s*\\[`, 'g');
  let varMatch;

  while ((varMatch = varRegex.exec(content)) !== null) {
    const chNum = parseInt(varMatch[1], 10);
    const startIdx = varMatch.index + varMatch[0].length;

    // Find the matching closing bracket
    let depth = 1;
    let i = startIdx;
    while (i < content.length && depth > 0) {
      if (content[i] === '[') depth++;
      else if (content[i] === ']') depth--;
      i++;
    }
    const arrayContent = content.substring(startIdx, i - 1);

    // Parse verses from the array content
    const verses = [];
    // Match each { num:"X", words:[...] }
    const verseRegex = /\{\s*num:\s*"([^"]+)",\s*words:\s*\[([\s\S]*?)\]\s*\}/g;
    let vMatch;
    while ((vMatch = verseRegex.exec(arrayContent)) !== null) {
      const hebNum = vMatch[1];
      const wordsStr = vMatch[2];

      // Parse word pairs
      const words = [];
      const pairRegex = /\["([^"]*?)","([^"]*?)"\]/g;
      let pMatch;
      while ((pMatch = pairRegex.exec(wordsStr)) !== null) {
        words.push([pMatch[1], pMatch[2]]);
      }

      verses.push({
        num: hebNum,
        arabicNum: fromHebNum(hebNum),
        words: words
      });
    }

    if (verses.length > 0) {
      chapters[chNum] = verses;
    }
  }

  return chapters;
}

// Load all needed source data
const loadedSources = {};

for (const book of JST_BOOKS) {
  const dir = book.source === 'ot' ? OT_VERSES_DIR : NT_VERSES_DIR;
  const key = book.source + ':' + book.srcPrefix;
  if (!loadedSources[key]) {
    const data = loadVerseData(dir, book.srcPrefix);
    loadedSources[key] = data;
    const chCount = Object.keys(data).length;
    const vCount = Object.values(data).reduce((s, ch) => s + ch.length, 0);
    console.log(`  ${book.srcPrefix}: ${chCount} chapters, ${vCount} verses`);
  }
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Assemble JST verse data from source chapters
// ═══════════════════════════════════════════════════════════
console.log('\nStep 2: Assembling JST verse data...');

let totalEntries = 0;
let totalVerses = 0;
let missingChapters = 0;

const assembledBooks = {};

for (const book of JST_BOOKS) {
  const key = book.source + ':' + book.srcPrefix;
  const sourceData = loadedSources[key] || {};
  assembledBooks[book.code] = {};

  for (const entry of book.entries) {
    const allVerses = [];

    for (const srcCh of entry.srcChapters) {
      const chVerses = sourceData[srcCh];
      if (!chVerses) {
        console.log(`  MISSING: ${book.en} chapter ${srcCh}`);
        missingChapters++;
        continue;
      }
      // Add all verses from this source chapter
      for (const v of chVerses) {
        allVerses.push({
          num: v.num,
          words: v.words
        });
      }
    }

    if (allVerses.length > 0) {
      // Re-number verses sequentially if multiple source chapters combined
      if (entry.srcChapters.length > 1) {
        let counter = 1;
        for (const v of allVerses) {
          v.num = toHebNum(counter);
          counter++;
        }
      }

      assembledBooks[book.code][entry.ch] = allVerses;
      totalVerses += allVerses.length;
    }

    totalEntries++;
  }

  const bookVerses = Object.values(assembledBooks[book.code]).reduce((s, ch) => s + ch.length, 0);
  const bookEntries = Object.keys(assembledBooks[book.code]).length;
  if (bookEntries > 0) {
    console.log(`  ${book.en}: ${bookEntries} entries, ${bookVerses} verses`);
  }
}

console.log(`\n  TOTAL: ${totalEntries} entries, ${totalVerses} verses`);
if (missingChapters > 0) console.log(`  Missing source chapters: ${missingChapters}`);

// ═══════════════════════════════════════════════════════════
// STEP 3: Output jst_verses/*.js files
// ═══════════════════════════════════════════════════════════
console.log('\nStep 3: Writing JST verse files...');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let totalFiles = 0;
let totalLines = 0;

for (const book of JST_BOOKS) {
  const chapters = assembledBooks[book.code];
  if (!chapters || Object.keys(chapters).length === 0) continue;

  const fileName = `${book.code}.js`;
  let js = `// jst_verses/${fileName} — ${book.en} (JST) verse data\n`;
  js += '(function() {\n';

  const chNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);

  for (const chNum of chNums) {
    const verses = chapters[chNum];
    const varName = `${book.code}_ch${chNum}Verses`;
    const containerId = `${book.code}-ch${chNum}-verses`;

    js += `var ${varName} = [\n`;
    for (let vi = 0; vi < verses.length; vi++) {
      const v = verses[vi];
      const wordsStr = v.words.map(w => `["${w[0].replace(/"/g, '\\"')}","${w[1].replace(/"/g, '\\"')}"]`).join(',');
      js += `  { num:"${v.num}", words:[${wordsStr}] },\n`;
    }
    js += '];\n';
    js += `renderVerseSet(${varName}, '${containerId}');\n\n`;
  }

  js += '})();\n';

  const outPath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(outPath, js, 'utf8');
  const lines = js.split('\n').length;
  totalLines += lines;
  totalFiles++;

  const entryCount = chNums.length;
  const verseCount = chNums.reduce((s, ch) => s + chapters[ch].length, 0);
  console.log(`  ${fileName}: ${entryCount} entries, ${verseCount} verses (${lines} lines)`);
}

console.log(`\n  Total: ${totalFiles} files, ${totalLines} lines`);

// ═══════════════════════════════════════════════════════════
// STEP 4: Write JST_BOOKS metadata for jst.html
// ═══════════════════════════════════════════════════════════
console.log('\nStep 4: Writing metadata...');

const metaPath = path.join(OUTPUT_DIR, '_jst_meta.json');
const meta = JST_BOOKS.map(book => ({
  code: book.code,
  en: book.en,
  he: book.he,
  entries: book.entries.map(e => ({
    ch: e.ch,
    label: e.label,
    verseCount: (assembledBooks[book.code][e.ch] || []).length
  }))
})).filter(b => b.entries.some(e => e.verseCount > 0));

fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
console.log(`  _jst_meta.json written (${meta.length} books)`);

console.log('\n=== Done! ===');
