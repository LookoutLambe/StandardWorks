// generate_standard_works.js
// Combined Standard Works interlinear 6×9 PDF: BOM + D&C + Pearl of Great Price
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

const BOM_BASE  = path.resolve(__dirname, '..');           // Hebrew BOM/
const SW_BASE   = path.resolve(BOM_BASE, '..');            // Standard Works Project/
const DC_DIR    = path.join(SW_BASE, 'dc_verses');
const PGP_DIR   = path.join(SW_BASE, 'pgp_verses');
const BOM_VERSES= path.join(BOM_BASE, 'verses');
const frontMatter = require(path.join(BOM_BASE, 'front_matter.json'));

// ─── Local font embedding ────────────────────────────────────────────────────
const FONTS_PATH = path.join(__dirname, 'fonts').replace(/\\/g, '/');
const fontFaceCSS = `
@font-face { font-family: 'David Libre'; font-weight: 400; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Regular.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 500; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Medium.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 700; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Bold.ttf') format('truetype'); }
`;

// ─── Book metadata ───────────────────────────────────────────────────────────
const BOM_BOOKS = [
  { name: '1 Nephi',          hebrew: 'נֶפִי א׳',              chapters: 22, file: '1nephi',          colophon: 'colophonWords'     },
  { name: '2 Nephi',          hebrew: 'נֶפִי ב׳',              chapters: 33, file: '2nephi',          colophon: 'n2_colophonVerses' },
  { name: 'Jacob',            hebrew: 'יַעֲקֹב',               chapters: 7,  file: 'jacob',           colophon: 'jc_colophonVerses' },
  { name: 'Enos',             hebrew: 'אֱנוֹשׁ',               chapters: 1,  file: 'enos'                                           },
  { name: 'Jarom',            hebrew: 'יָרוֹם',                chapters: 1,  file: 'jarom'                                          },
  { name: 'Omni',             hebrew: 'עָמְנִי',               chapters: 1,  file: 'omni'                                           },
  { name: 'Words of Mormon',  hebrew: 'דִּבְרֵי מוֹרְמוֹן',    chapters: 1,  file: 'words_of_mormon'                                },
  { name: 'Mosiah',           hebrew: 'מוֹשִׁיָּה',            chapters: 29, file: 'mosiah'                                         },
  { name: 'Alma',             hebrew: 'אַלְמָא',               chapters: 63, file: 'alma'                                           },
  { name: 'Helaman',          hebrew: 'הֵילָמָן',              chapters: 16, file: 'helaman'                                        },
  { name: '3 Nephi',          hebrew: 'נֶפִי ג׳',              chapters: 30, file: '3nephi'                                         },
  { name: '4 Nephi',          hebrew: 'נֶפִי ד׳',              chapters: 1,  file: '4nephi'                                         },
  { name: 'Mormon',           hebrew: 'מוֹרְמוֹן',             chapters: 9,  file: 'mormon'                                         },
  { name: 'Ether',            hebrew: 'עֵתֶר',                 chapters: 15, file: 'ether'                                          },
  { name: 'Moroni',           hebrew: 'מוֹרוֹנִי',             chapters: 10, file: 'moroni'                                         },
];

const PGP_BOOKS = [
  { name: 'Moses',                hebrew: 'מֹשֶׁה',                          chapters: 8, file: 'moses'            },
  { name: 'Abraham',              hebrew: 'אַבְרָהָם',                        chapters: 5, file: 'abraham'          },
  { name: 'Joseph Smith—Matthew', hebrew: 'יוֹסֵף סְמִית — מַתִּתְיָהוּ',     chapters: 1, file: 'js_matthew'       },
  { name: 'Joseph Smith—History', hebrew: 'יוֹסֵף סְמִית — הִיסְטוֹרְיָה',    chapters: 1, file: 'js_history'       },
  { name: 'Articles of Faith',    hebrew: 'עִקְרֵי הָאֱמוּנָה',               chapters: 1, file: 'articles_of_faith'},
];

const DC_FILES = [
  'dc1_10.js','dc11_20.js','dc21_30.js','dc31_40.js',
  'dc41_50.js','dc51_60.js','dc61_70.js','dc71_80.js',
  'dc81_90.js','dc91_100.js','dc101_110.js','dc111_120.js',
  'dc121_130.js','dc131_138.js',
];

// ─── Hebrew numerals (gematria) ──────────────────────────────────────────────
function hebrewNum(n) {
  if (n <= 0) return '';
  const ones    = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens    = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const hundreds= ['','ק','ר','ש','ת','תק','תר','תש','תת'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  let r = '';
  if (n >= 100) { r += hundreds[Math.floor(n/100)]; n %= 100; }
  if (n >= 10)  { r += tens[Math.floor(n/10)];      n %= 10; }
  if (n > 0)    { r += ones[n]; }
  return r;
}

// ─── Page layout ─────────────────────────────────────────────────────────────
const PAGE_W   = 8.5 * 72;
const PAGE_H   = 11  * 72;
const GUTTER   = 0.75 * 72;
const OUTER    = 0.6  * 72;
const TOP_M    = 0.5  * 72;
const BOT_M    = 0.4  * 72;
const COL_GAP  = 0.2  * 72;
const HEADER_H = 12;
const HEADER_GAP = 3;
const PAGE_NUM_H = 10;
const CONTENT_H  = PAGE_H - TOP_M - BOT_M - HEADER_H - HEADER_GAP - PAGE_NUM_H;
const TEXT_AREA_W = PAGE_W - GUTTER - OUTER;

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'],
    protocolTimeout: 3600000
  });

  // ── Parsers ──────────────────────────────────────────────────────────────
  function parseVerseFile(filePath) {
    if (!fs.existsSync(filePath)) return { colophon: null, chapters: {} };
    const src = fs.readFileSync(filePath, 'utf8');
    const result = { colophon: null, chapters: {} };
    const colMatch = src.match(/var\s+\w*[Cc]olophon\w*\s*=\s*(\[[\s\S]*?\]);/);
    if (colMatch) {
      try {
        const d = eval('(' + colMatch[1] + ')');
        if (Array.isArray(d) && d.length > 0) {
          result.colophon = (Array.isArray(d[0]) && d[0].length === 2) ? [{ num:'', words:d }] : d;
        }
      } catch(e) {}
    }
    const chunkRe = /var\s+(\w*ch(\d+)Verses)\s*=\s*(\[[\s\S]*?\]);\s*(?=\n|var\s|renderVerseSet|function|\}\))/g;
    let m;
    while ((m = chunkRe.exec(src)) !== null) {
      try {
        const v = eval('(' + m[3] + ')');
        if (Array.isArray(v)) result.chapters[parseInt(m[2])] = v;
      } catch(e) { console.warn(`  parse ${m[1]}: ${e.message}`); }
    }
    return result;
  }

  // Extract dc{n}_ch1Verses from a DC file → { sectionNum: verses[] }
  function parseDCFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const src = fs.readFileSync(filePath, 'utf8');
    const sections = {};
    const re = /var\s+dc(\d+)_ch1Verses\s*=\s*(\[[\s\S]*?\]);\s*(?=\n|var\s|render|function|\}\))/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      try { sections[parseInt(m[1])] = eval('(' + m[2] + ')'); }
      catch(e) { console.warn(`  DC section ${m[1]}: ${e.message}`); }
    }
    return sections;
  }

  // Extract a single named array from a file
  function parseNamedArray(filePath, varName) {
    if (!fs.existsSync(filePath)) return [];
    const src = fs.readFileSync(filePath, 'utf8');
    const re  = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);\\s*(?=\\n|var\\s|render|function|\\}\\))`);
    const m   = re.exec(src);
    if (!m) return [];
    try { return eval('(' + m[1] + ')'); } catch(e) { return []; }
  }

  // ── Step 1: Load all data ─────────────────────────────────────────────────
  console.log('Step 1: Loading data...');

  // BOM
  const bomData = [];
  for (const book of BOM_BOOKS) {
    const parsed = parseVerseFile(path.join(BOM_VERSES, book.file + '.js'));
    const bd = { name: book.name, hebrew: book.hebrew, chapters: [] };
    if (parsed.colophon) bd.colophon = parsed.colophon;
    for (let ch = 1; ch <= book.chapters; ch++) {
      if (parsed.chapters[ch]) bd.chapters.push({ num: ch, verses: parsed.chapters[ch] });
      else console.warn(`  BOM missing chapter ${ch} in ${book.file}.js`);
    }
    bomData.push(bd);
  }
  let bomVerseCount = 0;
  bomData.forEach(b => b.chapters.forEach(c => bomVerseCount += c.verses.length));
  console.log(`  BOM: ${bomData.length} books, ${bomVerseCount} verses`);

  // D&C
  const dcSections = {};
  for (const f of DC_FILES) {
    const secs = parseDCFile(path.join(DC_DIR, f));
    Object.assign(dcSections, secs);
  }
  const dcIntroVerses = parseNamedArray(path.join(DC_DIR, 'dc_intro.js'), 'dcIntro_ch1Verses');
  const od1Verses     = parseNamedArray(path.join(DC_DIR, 'od.js'), 'od1_ch1Verses');
  const od2Verses     = parseNamedArray(path.join(DC_DIR, 'od.js'), 'od2_ch1Verses');
  const dcSecNums     = Object.keys(dcSections).map(Number).sort((a,b)=>a-b);
  const dcVerseCount  = dcSecNums.reduce((s,n)=>s+dcSections[n].length, 0);
  console.log(`  D&C: ${dcSecNums.length} sections, ${dcVerseCount} verses  intro:${dcIntroVerses.length} od1:${od1Verses.length} od2:${od2Verses.length}`);

  // PGP
  const pgpData = [];
  for (const book of PGP_BOOKS) {
    const parsed = parseVerseFile(path.join(PGP_DIR, book.file + '.js'));
    const bd = { name: book.name, hebrew: book.hebrew, chapters: [] };
    for (let ch = 1; ch <= book.chapters; ch++) {
      if (parsed.chapters[ch]) bd.chapters.push({ num: ch, verses: parsed.chapters[ch] });
      else console.warn(`  PGP missing chapter ${ch} in ${book.file}.js`);
    }
    pgpData.push(bd);
  }
  const pgpIntroVerses = parseNamedArray(path.join(PGP_DIR, 'pgp_intro.js'), 'pgpIntro_ch1Verses');
  let pgpVerseCount = 0;
  pgpData.forEach(b => b.chapters.forEach(c => pgpVerseCount += c.verses.length));
  console.log(`  PGP: ${pgpData.length} books, ${pgpVerseCount} verses  intro:${pgpIntroVerses.length}`);

  // ── Front matter interlinear sections (BOM only) ──────────────────────────
  const fmVarsMap = {
    'frontIntro':        'מבוא המתרגם',
    'frontTitle':        'ספר מורמון',
    'frontIntroduction': 'מבוא',
    'frontThreeWit':     'עדות שלשת העדים',
    'frontEightWit':     'עדות שמונה עדים',
    'frontJST':          'עדות הנביא יוסף סמית',
    'frontBrief':        'ביאור קצר על־ספר מורמון',
  };
  const fmPath = path.join(BOM_VERSES, 'frontmatter.js');
  const fmSections = [];
  if (fs.existsSync(fmPath)) {
    const fmSrc = fs.readFileSync(fmPath, 'utf8');
    for (const [varName, title] of Object.entries(fmVarsMap)) {
      const re = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);\\s*(?=\\n|var\\s|render|function|\\}\\))`, 'g');
      const m = re.exec(fmSrc);
      if (m) {
        try {
          const v = eval('(' + m[1] + ')');
          if (Array.isArray(v)) fmSections.push({ title, verses: v });
        } catch(e) {}
      }
    }
    console.log(`  BOM front matter: ${fmSections.length} sections`);
  }

  // ── Step 2: Build elements ────────────────────────────────────────────────
  console.log('Step 2: Building elements...');
  const elements = [];

  // ═══ BOOK OF MORMON ═══
  elements.push({ type:'section-divider', hebrew:'סֵפֶר מוֹרְמוֹן', english:'The Book of Mormon',
                  book:'Book of Mormon', bookHebrew:'ספר מורמון' });
  for (const bd of bomData) {
    elements.push({ type:'book-title', book:bd.name, hebrew:bd.hebrew, bookHebrew:bd.hebrew });
    if (bd.colophon) elements.push({ type:'colophon', bookHebrew:bd.hebrew, verses:bd.colophon });
    for (const ch of bd.chapters) {
      if (bd.chapters.length > 1)
        elements.push({ type:'chapter-heading', book:bd.name, bookHebrew:bd.hebrew,
                        chapter:ch.num, hebrew:`פרק ${hebrewNum(ch.num)}` });
      for (const v of ch.verses)
        elements.push({ type:'verse', book:bd.name, bookHebrew:bd.hebrew,
                        chapter:ch.num, verse:v.num, words:v.words });
    }
  }

  // ═══ DOCTRINE & COVENANTS ═══
  elements.push({ type:'section-divider', hebrew:'תּוֹרָה וּבְרִיתוֹת', english:'Doctrine & Covenants',
                  book:'Doctrine & Covenants', bookHebrew:'תורה ובריתות' });
  // D&C Intro
  const dcIntroFiltered = dcIntroVerses.filter(v => v && v.num && v.words && v.words.length > 0);
  if (dcIntroFiltered.length > 0) {
    elements.push({ type:'book-title', book:'D&C Introduction', hebrew:'מְבוֹא', bookHebrew:'תורה ובריתות' });
    for (const v of dcIntroFiltered)
      elements.push({ type:'verse', book:'D&C Introduction', bookHebrew:'תורה ובריתות',
                      chapter:0, verse:v.num, words:v.words });
  }
  // D&C Sections 1–138
  for (const n of dcSecNums) {
    const verses = dcSections[n].filter(v => v && v.num && v.words && v.words.length > 0);
    if (verses.length === 0) continue;
    elements.push({ type:'chapter-heading', book:'Doctrine & Covenants', bookHebrew:'תורה ובריתות',
                    chapter:n, hebrew:`סעיף ${hebrewNum(n)}` });
    for (const v of verses)
      elements.push({ type:'verse', book:'Doctrine & Covenants', bookHebrew:'תורה ובריתות',
                      chapter:n, verse:v.num, words:v.words });
  }
  // Official Declarations
  const od1f = od1Verses.filter(v => v && v.num && v.words && v.words.length > 0);
  if (od1f.length > 0) {
    elements.push({ type:'chapter-heading', book:'Doctrine & Covenants', bookHebrew:'תורה ובריתות',
                    chapter:0, hebrew:'הַכְרָזָה רְשָׁמִית א׳' });
    for (const v of od1f)
      elements.push({ type:'verse', book:'Doctrine & Covenants', bookHebrew:'תורה ובריתות',
                      chapter:0, verse:v.num, words:v.words });
  }
  const od2f = od2Verses.filter(v => v && v.num && v.words && v.words.length > 0);
  if (od2f.length > 0) {
    elements.push({ type:'chapter-heading', book:'Doctrine & Covenants', bookHebrew:'תורה ובריתות',
                    chapter:0, hebrew:'הַכְרָזָה רְשָׁמִית ב׳' });
    for (const v of od2f)
      elements.push({ type:'verse', book:'Doctrine & Covenants', bookHebrew:'תורה ובריתות',
                      chapter:0, verse:v.num, words:v.words });
  }

  // ═══ PEARL OF GREAT PRICE ═══
  elements.push({ type:'section-divider', hebrew:'פְּנִינַת הַמְּחִיר הַגָּדוֹל', english:'Pearl of Great Price',
                  book:'Pearl of Great Price', bookHebrew:'פנינת המחיר הגדול' });
  // PGP Intro
  const pgpIntroFiltered = pgpIntroVerses.filter(v => v && v.num && v.words && v.words.length > 0);
  if (pgpIntroFiltered.length > 0) {
    elements.push({ type:'book-title', book:'PGP Introduction', hebrew:'מְבוֹא', bookHebrew:'פנינת המחיר הגדול' });
    for (const v of pgpIntroFiltered)
      elements.push({ type:'verse', book:'PGP Introduction', bookHebrew:'פנינת המחיר הגדול',
                      chapter:0, verse:v.num, words:v.words });
  }
  // PGP Books
  for (const bd of pgpData) {
    elements.push({ type:'book-title', book:bd.name, hebrew:bd.hebrew, bookHebrew:bd.hebrew });
    for (const ch of bd.chapters) {
      if (bd.chapters.length > 1)
        elements.push({ type:'chapter-heading', book:bd.name, bookHebrew:bd.hebrew,
                        chapter:ch.num, hebrew:`פרק ${hebrewNum(ch.num)}` });
      for (const v of ch.verses)
        elements.push({ type:'verse', book:bd.name, bookHebrew:bd.hebrew,
                        chapter:ch.num, verse:v.num, words:v.words });
    }
  }

  console.log(`  ${elements.length} total elements`);

  // ── Step 3: HTML renderers ────────────────────────────────────────────────
  function renderWordHtml(heb, eng, addSof = false) {
    const gloss   = (eng || '').replace(/-/g, '\u2011');
    const sofMark = addSof ? '<span class="sof">׃</span>' : '';
    return `<span class="wp"><span class="wh">${heb}${sofMark}</span><span class="we">${gloss}</span></span>`;
  }

  function renderVerseHtml(el) {
    const words = (el.words || []).filter(p => p[0] && p[0] !== '׃');
    if (words.length === 0) return '';
    let html = el.verse ? `<span class="vn">${el.verse}</span>` : '';
    for (let i = 0; i < words.length; i++) {
      const isLast = (i === words.length - 1);
      html += renderWordHtml(words[i][0], words[i][1], isLast);
      if (!isLast) html += `<span class="arr-pair"><span class="arr-top"></span><span class="arr">&#x2039;</span></span>`;
    }
    return html;
  }

  function renderColophonHtml(colVerses) {
    let html = '';
    for (const v of colVerses) {
      const words = (v.words || []).filter(p => p[0] && p[0] !== '׃');
      html += '<div class="col-v">';
      for (let i = 0; i < words.length; i++) {
        const isLast = (i === words.length - 1);
        html += renderWordHtml(words[i][0], words[i][1], isLast);
        if (!isLast) html += `<span class="arr-pair"><span class="arr-top"></span><span class="arr">&#x2039;</span></span>`;
      }
      html += '</div>';
    }
    return html;
  }

  // ── Step 4: Shared CSS ────────────────────────────────────────────────────
  const sharedCSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'David Libre','David',serif; font-size:11pt; line-height:1.3; direction:rtl; background:white; color:#1a1a1a; }
/* Section divider — full-column, top of new page */
.section-divider {
  column-span: all;
  text-align: center;
  padding: 36pt 0 14pt;
  border-top: 1.5pt solid #1a2744;
  border-bottom: 0.75pt solid #1a2744;
  margin-bottom: 10pt;
}
.sd-heb { font-size: 22pt; font-weight: 700; color: #1a2744; margin-bottom: 5pt; }
.sd-eng { font-size: 9pt; color: #666; direction: ltr; letter-spacing: 2pt; text-transform: uppercase; font-family: 'David Libre', serif; }
/* Book title */
.bt { text-align:center; font-size:16pt; font-weight:700; padding:5pt 0 1pt; column-span:all; }
.bt-eng { text-align:center; font-family:'David Libre',serif; font-size:8pt; font-weight:600; color:#555; direction:ltr; margin-bottom:2pt; column-span:all; }
/* Chapter heading */
.ch { text-align:center; font-size:11pt; font-weight:700; padding:2pt 0 1pt; border-top:0.5pt solid #aaa; border-bottom:0.5pt solid #aaa; margin:2pt 0 1pt; break-after:avoid; }
/* Colophon */
.colophon { column-span:all; margin-bottom:10pt; padding:1pt 0; direction:rtl; background:white; position:relative; z-index:1; }
.col-v { margin-bottom:0.5pt; text-align:justify; text-align-last:right; }
/* Verse */
.v { display:block; margin-bottom:2pt; text-align:justify; text-align-last:right; }
.vn { display:inline-block; font-size:9pt; font-weight:700; color:#555; margin-left:1pt; vertical-align:top; padding-top:1pt; }
/* Word pair */
.wp { display:inline-block; margin:0 1pt 1pt 1pt; vertical-align:top; display:-webkit-inline-box; display:inline-flex; flex-direction:column; align-items:center; }
.v { text-align:justify; text-align-last:right; }
.wh { display:block; font-family:'David Libre',serif; font-size:13pt; font-weight:700; line-height:1.15; color:#1a2744; text-align:center; white-space:nowrap; }
.we { display:block; font-family:'David Libre',serif; font-size:5.5pt; color:#555; direction:ltr; line-height:1.1; white-space:nowrap; text-align:center; }
/* Chevron */
.arr-pair { display:inline-flex; flex-direction:column; align-items:center; vertical-align:top; }
.arr-top  { display:block; height:14.95pt; font-size:0; }
.arr      { display:block; text-align:center; font-family:'Times New Roman','David Libre',serif; font-size:8pt; color:#888; line-height:0.85; direction:ltr; unicode-bidi:bidi-override; }
/* Sof pasuk */
.sof { font-family:'David Libre',serif; font-size:13pt; font-weight:700; margin-right:1pt; vertical-align:baseline; line-height:inherit; color:#1a2744; display:inline; white-space:nowrap; }`;

  // ── Step 5: Paginate in browser ───────────────────────────────────────────
  console.log('Step 5: Paginating...');

  let storageDivs = '';
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'section-divider')
      storageDivs += `<div class="section-divider" data-i="${i}"><div class="sd-heb">${el.hebrew}</div><div class="sd-eng">${el.english}</div></div>\n`;
    else if (el.type === 'book-title')
      storageDivs += `<div class="bt" data-i="${i}">${el.hebrew}</div>\n`;
    else if (el.type === 'chapter-heading')
      storageDivs += `<div class="ch" data-i="${i}">${el.hebrew}</div>\n`;
    else if (el.type === 'colophon')
      storageDivs += `<div class="colophon" data-i="${i}">${renderColophonHtml(el.verses)}</div>\n`;
    else if (el.type === 'verse')
      storageDivs += `<div class="v" data-i="${i}">${renderVerseHtml(el)}</div>\n`;
  }

  const pagHtml = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}
${sharedCSS}
#storage { display:none; }
#test-col { width:${TEXT_AREA_W}pt; column-count:2; column-gap:${COL_GAP}pt; column-fill:auto; overflow:hidden; direction:rtl; }
</style></head><body>
<div id="storage">${storageDivs}</div>
<div id="test-col"></div>
</body></html>`;

  const pagPath = path.join(__dirname, '_sw_paginate.html');
  fs.writeFileSync(pagPath, pagHtml, 'utf8');

  const pagPage = await browser.newPage();
  await pagPage.setViewport({ width: 1200, height: 800 });
  await pagPage.goto('file:///' + pagPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 120000 });
  await pagPage.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 3000));

  const elMeta = elements.map(el => ({ type: el.type }));

  const pageAssignments = await pagPage.evaluate((meta, contentH_pt) => {
    const ptToPx    = 96 / 72;
    const contentH  = contentH_pt * ptToPx;
    const testCol   = document.getElementById('test-col');
    const storage   = document.getElementById('storage');

    const elMap = {};
    storage.querySelectorAll('[data-i]').forEach(el => elMap[el.getAttribute('data-i')] = el);

    function overflows() {
      if (testCol.scrollWidth > testCol.clientWidth + 1) return true;
      const last = testCol.lastElementChild;
      if (!last) return false;
      const cRect = testCol.getBoundingClientRect();
      for (const r of last.getClientRects()) {
        if (r.left < cRect.left - 1) return true;
        if (r.bottom > cRect.bottom + 1) return true;
      }
      return false;
    }

    const NEW_PAGE_TYPES = new Set(['book-title','section-divider']);
    const pages = [];
    let cur = 0, total = meta.length;

    while (cur < total) {
      const pageItems = [];
      testCol.innerHTML = '';
      testCol.style.height = contentH + 'px';

      // section-divider and book-title always start a fresh page
      if (NEW_PAGE_TYPES.has(meta[cur].type)) {
        const src = elMap[cur];
        testCol.appendChild(src.cloneNode(true));
        pageItems.push(cur++);
      }

      while (cur < total) {
        const el = meta[cur];
        if (NEW_PAGE_TYPES.has(el.type)) break;

        const clone = elMap[cur].cloneNode(true);
        clone.removeAttribute('data-i');
        testCol.appendChild(clone);

        if (overflows()) { testCol.removeChild(clone); break; }

        // chapter-heading: ensure at least one verse follows
        if (el.type === 'chapter-heading' && cur+1 < total && meta[cur+1].type === 'verse') {
          const nClone = elMap[cur+1].cloneNode(true); nClone.removeAttribute('data-i');
          testCol.appendChild(nClone);
          const over = overflows();
          testCol.removeChild(nClone);
          if (over) { testCol.removeChild(clone); break; }
        }
        pageItems.push(cur++);
      }

      if (pageItems.length === 0 && cur < total) { pageItems.push(cur++); }

      // single orphan chapter-heading → force-add next element
      if (pageItems.length === 1 && meta[pageItems[0]].type === 'chapter-heading' && cur < total) {
        pageItems.push(cur++);
      }

      pages.push(pageItems);
    }
    return pages;
  }, elMeta, CONTENT_H);

  await pagPage.close();
  try { fs.unlinkSync(pagPath); } catch(e) {}

  // Post-process: orphaned chapter headings at page end
  for (let p = 0; p < pageAssignments.length - 1; p++) {
    const items = pageAssignments[p];
    if (items.length > 1 && elements[items[items.length - 1]].type === 'chapter-heading') {
      pageAssignments[p+1].unshift(items.pop());
    }
  }

  console.log(`  ${pageAssignments.length} body pages`);

  // ── Step 6: Build page objects ────────────────────────────────────────────
  const pages = [];
  let curBookHebrew = '', curBookEng = '';
  for (const indices of pageAssignments) {
    const pg = { items:[], bookHebrew:'', bookEng:'', startChapter:0, startVerse:'', endChapter:0, endVerse:'' };
    for (const idx of indices) {
      const el = elements[idx];
      pg.items.push(el);
      if (el.type === 'section-divider') { curBookHebrew = el.hebrew; curBookEng = el.english; }
      if (el.type === 'book-title') { curBookHebrew = el.hebrew; curBookEng = el.book; }
      if (el.type === 'verse' && el.chapter) {
        if (!pg.startChapter) { pg.startChapter = el.chapter; pg.startVerse = el.verse; }
        pg.endChapter = el.chapter; pg.endVerse = el.verse;
      }
      pg.bookHebrew = el.bookHebrew || curBookHebrew;
      pg.bookEng    = el.book || curBookEng;
    }
    pages.push(pg);
  }

  // ── Step 7: CSS block for rendering ──────────────────────────────────────
  const cssBlock = `@page { size:${PAGE_W/72}in ${PAGE_H/72}in; margin:0; }
${sharedCSS}
.page { width:${PAGE_W}pt; height:${PAGE_H}pt; padding-top:${TOP_M}pt; padding-bottom:${BOT_M}pt; overflow:hidden; page-break-after:always; display:flex; flex-direction:column; }
.page:last-child { page-break-after:auto; }
.header { display:flex; justify-content:space-between; flex-shrink:0; font-size:7.5pt; color:#555; border-bottom:0.5pt solid #999; padding-bottom:2pt; margin-bottom:${HEADER_GAP}pt; height:${HEADER_H}pt; direction:rtl; }
.h-book { font-weight:600; }
.h-range{ font-weight:400; }
.content { height:${CONTENT_H}pt; flex-shrink:0; column-count:2; column-gap:${COL_GAP}pt; column-fill:auto; column-rule:0.5pt solid #bbb; direction:rtl; overflow:hidden; }
.pn { flex-shrink:0; font-size:7.5pt; color:#555; text-align:center; height:${PAGE_NUM_H}pt; border-top:0.5pt solid #999; padding-top:3pt; }
/* Front matter */
.fm-page { width:${PAGE_W}pt; height:${PAGE_H}pt; position:relative; overflow:hidden; page-break-after:always; font-family:'David Libre','David',serif; font-size:12pt; line-height:1.6; direction:rtl; text-align:justify; }
.fm-title-page { display:flex; flex-direction:column; justify-content:space-between; height:100%; text-align:center; }
.fm-title-top { padding-top:40pt; }
.fm-title-bottom { padding-bottom:40pt; }
.fm-main-title { font-size:26pt; font-weight:700; margin-bottom:14pt; }
.fm-subtitle { font-size:14pt; color:#333; }
.fm-interlinear-label { font-family:'David Libre',serif; font-size:11pt; direction:ltr; margin-bottom:16pt; color:#444; }
.fm-trans-line { font-size:12pt; margin-bottom:6pt; }
.fm-section-title { font-size:15pt; font-weight:700; text-align:center; margin-bottom:10pt; }
.fm-toc { direction:rtl; }
.fm-toc-line { display:flex; justify-content:space-between; padding:3pt 0; border-bottom:0.5pt dotted #999; }`;

  const fontsLink = `<style>${fontFaceCSS}</style>`;

  function wrapHtml(body) {
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
${fontsLink}<style>${cssBlock}</style></head><body>
${body}
</body></html>`;
  }

  function renderPageHtml(pg, pageNum) {
    const isOdd = (pageNum % 2 === 1);
    const pR = isOdd ? GUTTER : OUTER;
    const pL = isOdd ? OUTER  : GUTTER;

    let contentHtml = '';
    for (const el of pg.items) {
      if (el.type === 'section-divider')
        contentHtml += `<div class="section-divider"><div class="sd-heb">${el.hebrew}</div><div class="sd-eng">${el.english}</div></div>`;
      else if (el.type === 'book-title')
        contentHtml += `<div class="bt">${el.hebrew}</div><div class="bt-eng">${el.book}</div>`;
      else if (el.type === 'chapter-heading')
        contentHtml += `<div class="ch">${el.hebrew}</div>`;
      else if (el.type === 'colophon')
        contentHtml += `<div class="colophon">${renderColophonHtml(el.verses)}</div>`;
      else if (el.type === 'verse')
        contentHtml += `<div class="v">${renderVerseHtml(el)}</div>`;
    }

    let verseRange = '';
    if (pg.startChapter && pg.endChapter) {
      const sc = hebrewNum(pg.startChapter), sv = pg.startVerse || '';
      const ec = hebrewNum(pg.endChapter),   ev = pg.endVerse   || '';
      verseRange = (pg.startChapter === pg.endChapter)
        ? (sv === ev ? `${sc}:${sv}` : `${sc}:${sv}–${ev}`)
        : `${sc}:${sv} – ${ec}:${ev}`;
    }

    return `<div class="page" style="padding-right:${pR}pt;padding-left:${pL}pt;">
  <div class="header"><span class="h-book">${pg.bookHebrew||''}</span><span class="h-range">${verseRange}</span></div>
  <div class="content">${contentHtml}</div>
  <div class="pn">${pageNum}</div>
</div>`;
  }

  // ── Step 8: Front matter pages ────────────────────────────────────────────
  console.log('Step 8: Building front matter...');

  function buildFrontMatter() {
    let html = '', fmIdx = 0;
    function fmPad() {
      const isOdd = fmIdx % 2 === 0;
      const pR = isOdd ? OUTER : GUTTER, pL = isOdd ? GUTTER : OUTER;
      fmIdx++;
      return `padding:${TOP_M}pt ${pR}pt ${BOT_M}pt ${pL}pt`;
    }
    html += `<div class="fm-page" style="${fmPad()}"></div>`;
    html += `<div class="fm-page" style="${fmPad()}"></div>`;
    html += `<div class="fm-page" style="${fmPad()}">
      <div class="fm-title-page"><div class="fm-title-top">
        <div class="fm-main-title">כִּתְבֵי הַקֹּדֶשׁ</div>
        <div class="fm-subtitle">Standard Works — Hebrew Interlinear</div>
        <div class="fm-subtitle" style="font-size:12pt;margin-top:10pt;">ספר מורמון · תורה ובריתות · פנינת המחיר הגדול</div>
      </div></div>
    </div>`;
    html += `<div class="fm-page" style="${fmPad()}"></div>`;

    const s1 = frontMatter[1];
    const transLines = (s1 && s1.full ? s1.full.split('\n') : []).filter(l => l.trim());
    html += `<div class="fm-page" style="${fmPad()}">
      <div class="fm-title-page">
        <div class="fm-title-top">
          <div class="fm-main-title">כִּתְבֵי הַקֹּדֶשׁ</div>
          <div class="fm-subtitle">Standard Works</div>
          <div class="fm-interlinear-label" style="margin-top:12pt;">Hebrew Interlinear Translation</div>
        </div>
        <div class="fm-title-bottom">
          ${transLines.map(l=>`<div class="fm-trans-line">${l.trim()}</div>`).join('\n')}
          <div class="fm-trans-line" style="font-size:7pt;margin-top:6pt;">כל הזכויות שמורות © תשפ״ו</div>
        </div>
      </div>
    </div>`;

    const count = (html.match(/class="fm-page/g)||[]).length;
    if (count % 2 !== 0) html += `<div class="fm-page" style="${fmPad()}"></div>`;
    return html;
  }

  function buildInterlinearFrontMatter() {
    let contentHtml = '';
    for (let i = 0; i < fmSections.length; i++) {
      const sec = fmSections[i];
      contentHtml += `<div class="fm-sec-hdr" style="${i>0?'page-break-before:always;':''}">${sec.title}</div>\n`;
      for (const verse of sec.verses)
        contentHtml += `<div class="v">${renderVerseHtml(verse)}</div>\n`;
    }

    // Full TOC
    const bomLines = BOM_BOOKS.map(b=>
      `<div class="fm-toc-line"><span>${b.hebrew}</span><span style="font-family:'David Libre',serif;font-size:9pt;direction:ltr;">${b.name}</span></div>`
    ).join('\n');
    const dcLine  = `<div class="fm-toc-line"><span style="font-weight:700;">תּוֹרָה וּבְרִיתוֹת</span><span style="font-family:'David Libre',serif;font-size:9pt;direction:ltr;font-weight:700;">Doctrine &amp; Covenants (§1–138)</span></div>`;
    const pgpLines = PGP_BOOKS.map(b=>
      `<div class="fm-toc-line"><span>${b.hebrew}</span><span style="font-family:'David Libre',serif;font-size:9pt;direction:ltr;">${b.name}</span></div>`
    ).join('\n');

    contentHtml += `<div style="page-break-before:always;">
      <div class="fm-sec-hdr" style="font-size:16pt;margin-bottom:12pt;padding-bottom:8pt;border-bottom:1pt solid #999;display:block;height:auto;page-break-after:avoid;">תוכן העניינים</div>
      <div class="fm-toc">
        <div class="fm-toc-line" style="font-weight:700;border-bottom:1pt solid #aaa;margin-bottom:4pt;padding-bottom:4pt;"><span>ספר מורמון</span><span style="direction:ltr;font-family:'David Libre',serif;font-size:9pt;">Book of Mormon</span></div>
        ${bomLines}
        <div style="margin-top:8pt;">${dcLine}</div>
        <div style="margin-top:8pt;font-weight:700;border-bottom:1pt solid #aaa;margin-bottom:4pt;padding-bottom:4pt;" class="fm-toc-line"><span>פְּנִינַת הַמְּחִיר הַגָּדוֹל</span><span style="direction:ltr;font-family:'David Libre',serif;font-size:9pt;">Pearl of Great Price</span></div>
        ${pgpLines}
      </div>
    </div>`;

    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}
@page { size:${PAGE_W/72}in ${PAGE_H/72}in; margin:${TOP_M/72}in ${GUTTER/72}in ${BOT_M/72}in ${GUTTER/72}in; }
${sharedCSS}
body { padding:0; }
.v { text-align:justify; text-align-last:right; margin-bottom:2pt; }
.fm-sec-hdr { font-size:18pt; font-weight:700; text-align:center; margin-bottom:8pt; padding-bottom:5pt; border-bottom:0.75pt solid #999; }
.fm-toc { direction:rtl; }
.fm-toc-line { display:flex; justify-content:space-between; padding:3pt 0; border-bottom:0.5pt dotted #999; }
</style></head><body>
${contentHtml}
</body></html>`;
  }

  // ── Step 9: Render everything ─────────────────────────────────────────────
  console.log('Step 9: Rendering PDF...');

  async function renderBatchPdf(html, label) {
    const pg = await browser.newPage();
    pg.setDefaultTimeout(300000);
    await pg.setContent(html, { waitUntil:'domcontentloaded', timeout:120000 });
    await new Promise(r => setTimeout(r, 8000));
    const buf = await pg.pdf({
      width:`${PAGE_W/72}in`, height:`${PAGE_H/72}in`,
      printBackground:true, preferCSSPageSize:true,
      displayHeaderFooter:false, margin:{top:0,right:0,bottom:0,left:0}
    });
    await pg.close();
    console.log(`    ${label}: ${buf.length} bytes`);
    return buf;
  }

  const pdfBuffers = [];

  const fmHtml = buildFrontMatter();
  const fmPageCount = (fmHtml.match(/class="fm-page/g)||[]).length;
  console.log(`  Title pages: ${fmPageCount}`);
  pdfBuffers.push(await renderBatchPdf(wrapHtml(fmHtml), `Title pages (${fmPageCount})`));

  if (fmSections.length > 0) {
    console.log('  Rendering BOM interlinear front matter...');
    const ilFmPg = await browser.newPage();
    ilFmPg.setDefaultTimeout(300000);
    await ilFmPg.setContent(buildInterlinearFrontMatter(), { waitUntil:'domcontentloaded', timeout:120000 });
    await new Promise(r => setTimeout(r, 8000));
    const ilFmBuf = await ilFmPg.pdf({
      width:`${PAGE_W/72}in`, height:`${PAGE_H/72}in`,
      printBackground:true, preferCSSPageSize:true,
      displayHeaderFooter:false, margin:{top:0,right:0,bottom:0,left:0}
    });
    console.log(`    BOM front matter: ${ilFmBuf.length} bytes`);
    await ilFmPg.close();
    pdfBuffers.push(ilFmBuf);
  }

  // Ensure body starts on LEFT page (odd page in RTL KDP)
  {
    let totalFm = 0;
    for (const buf of pdfBuffers) { const d = await PDFDocument.load(buf); totalFm += d.getPageCount(); }
    console.log(`  Front matter total: ${totalFm} pages`);
    if (totalFm % 2 !== 0) {
      const blank = await PDFDocument.create(); blank.addPage([PAGE_W, PAGE_H]);
      pdfBuffers.push(Buffer.from(await blank.save()));
      console.log('  Inserted blank page for RTL alignment');
    } else {
      console.log('  Front matter even — body starts on LEFT (odd) page');
    }
  }

  // Body in batches of 40 pages
  const BATCH = 40;
  const totalBatches = Math.ceil(pages.length / BATCH);
  console.log(`  Rendering ${pages.length} body pages in ${totalBatches} batches...`);
  for (let b = 0; b < totalBatches; b++) {
    const start = b * BATCH, end = Math.min(start + BATCH, pages.length);
    let batchHtml = '';
    for (let i = start; i < end; i++) batchHtml += renderPageHtml(pages[i], i + 1);
    pdfBuffers.push(await renderBatchPdf(wrapHtml(batchHtml), `Batch ${b+1}/${totalBatches} (pages ${start+1}–${end})`));
  }

  // Merge
  console.log('  Merging PDFs...');
  const merged = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const src = await PDFDocument.load(buf);
    const copied = await merged.copyPages(src, src.getPageIndices());
    for (const pg of copied) merged.addPage(pg);
  }

  const outPath = 'C:/Users/chris/Desktop/Hebrew_Standard_Works_6x9.pdf';
  fs.writeFileSync(outPath, await merged.save());
  const stats = fs.statSync(outPath);
  console.log(`\nPDF: ${outPath}`);
  console.log(`  Pages: ${merged.getPageCount()}  (${fmPageCount} title + ${pages.length} body)`);
  console.log(`  Size:  ${(stats.size/1024/1024).toFixed(1)} MB`);

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
