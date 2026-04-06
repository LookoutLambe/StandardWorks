// Generate 6×9 Schottenstein-style Interlinear Hebrew BOM PDF
// Two columns, Hebrew word on top + English gloss below, chevron arrows
// No commentary — interlinear fills the full text area
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const frontMatter = require(path.join(BASE, 'front_matter.json'));

// ─── Local font embedding (avoids KDP "fonts not embedded" warning) ──────────
const FONTS_PATH = path.join(__dirname, 'fonts').replace(/\\/g, '/');
const fontFaceCSS = `
@font-face { font-family: 'David Libre'; font-weight: 400; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Regular.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 500; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Medium.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 700; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Bold.ttf') format('truetype'); }
`;

// ─── Book metadata ───────────────────────────────────────────────────
const BOOKS = [
  { name: '1 Nephi',          hebrew: 'נֶפִי א׳',           chapters: 22, prefix: 'ch',    colophon: 'colophonWords' },
  { name: '2 Nephi',          hebrew: 'נֶפִי ב׳',           chapters: 33, prefix: 'n2_ch', colophon: 'n2_colophonVerses' },
  { name: 'Jacob',            hebrew: 'יַעֲקֹב',            chapters: 7,  prefix: 'jc_ch', colophon: 'jc_colophonVerses' },
  { name: 'Enos',             hebrew: 'אֱנוֹשׁ',            chapters: 1,  prefix: 'en_ch' },
  { name: 'Jarom',            hebrew: 'יָרוֹם',             chapters: 1,  prefix: 'jr_ch' },
  { name: 'Omni',             hebrew: 'עָמְנִי',            chapters: 1,  prefix: 'om_ch' },
  { name: 'Words of Mormon',  hebrew: 'דִּבְרֵי מוֹרְמוֹן', chapters: 1,  prefix: 'wm_ch' },
  { name: 'Mosiah',           hebrew: 'מוֹשִׁיָּה',         chapters: 29, prefix: 'mo_ch' },
  { name: 'Alma',             hebrew: 'אַלְמָא',            chapters: 63, prefix: 'al_ch' },
  { name: 'Helaman',          hebrew: 'הֵילָמָן',           chapters: 16, prefix: 'he_ch' },
  { name: '3 Nephi',          hebrew: 'נֶפִי ג׳',           chapters: 30, prefix: 'tn_ch' },
  { name: '4 Nephi',          hebrew: 'נֶפִי ד׳',           chapters: 1,  prefix: 'fn_ch' },
  { name: 'Mormon',           hebrew: 'מוֹרְמוֹן',          chapters: 9,  prefix: 'mm_ch' },
  { name: 'Ether',            hebrew: 'עֵתֶר',              chapters: 15, prefix: 'et_ch' },
  { name: 'Moroni',           hebrew: 'מוֹרוֹנִי',          chapters: 10, prefix: 'mr_ch' },
];

// Hebrew numerals (gematria)
function hebrewNum(n) {
  if (n <= 0) return String(n);
  const ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const hundreds = ['','ק','ר','ש','ת'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  let result = '';
  if (n >= 100) { result += hundreds[Math.floor(n/100)]; n %= 100; }
  if (n >= 10) { result += tens[Math.floor(n/10)]; n %= 10; }
  if (n > 0) result += ones[n];
  return result;
}

// ─── Page layout (points) ────────────────────────────────────────────
const PAGE_W    = 8.5 * 72;      // 612pt  (8.5 inches)
const PAGE_H    = 11 * 72;       // 792pt  (11 inches)
const GUTTER    = 0.75 * 72;     // 54pt (inside/spine margin)
const OUTER     = 0.6 * 72;      // 43pt (outside margin)
const TOP_M     = 0.5 * 72;      // 36pt
const BOT_M     = 0.4 * 72;      // 28.8pt
const COL_GAP   = 0.2 * 72;      // 14.4pt
const HEADER_H  = 12;
const HEADER_GAP = 3;
const PAGE_NUM_H = 10;
const CONTENT_H = PAGE_H - TOP_M - BOT_M - HEADER_H - HEADER_GAP - PAGE_NUM_H;
const TEXT_AREA_W = PAGE_W - GUTTER - OUTER;
const COL_W     = (TEXT_AREA_W - COL_GAP) / 2;

const GUTTER_SHIFT = (GUTTER - OUTER) / 2; // half the difference

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    protocolTimeout: 3600000
  });

  // ── Step 1: Extract interlinear data directly from verse JS files ──
  console.log('Step 1: Extracting interlinear data from verse files...');

  // Map book names to their verse file names
  const BOOK_FILES = {
    '1 Nephi': '1nephi', '2 Nephi': '2nephi', 'Jacob': 'jacob',
    'Enos': 'enos', 'Jarom': 'jarom', 'Omni': 'omni',
    'Words of Mormon': 'words_of_mormon', 'Mosiah': 'mosiah',
    'Alma': 'alma', 'Helaman': 'helaman', '3 Nephi': '3nephi',
    '4 Nephi': '4nephi', 'Mormon': 'mormon', 'Ether': 'ether',
    'Moroni': 'moroni',
  };

  function parseVerseFile(filePath) {
    const src = fs.readFileSync(filePath, 'utf8');
    const result = { colophon: null, chapters: {} };

    // Extract colophon (colophonWords = [...] or *colophonVerses = [...])
    const colMatch = src.match(/var\s+\w*[Cc]olophon\w*\s*=\s*(\[[\s\S]*?\]);/);
    if (colMatch) {
      try {
        const colData = eval('(' + colMatch[1] + ')');
        if (Array.isArray(colData) && colData.length > 0) {
          if (Array.isArray(colData[0]) && colData[0].length === 2) {
            result.colophon = [{ num: '', words: colData }];
          } else {
            result.colophon = colData;
          }
        }
      } catch(e) { /* skip */ }
    }

    // Extract chapter verse arrays: var PREFIX_chNVerses = [...]
    // Match patterns like: var ch1Verses = [...], var n2_ch1Verses = [...], etc.
    const chunkRe = /var\s+(\w*ch(\d+)Verses)\s*=\s*(\[[\s\S]*?\]);\s*(?=\n|var\s|renderVerseSet|function|\}\))/g;
    let m;
    while ((m = chunkRe.exec(src)) !== null) {
      const chNum = parseInt(m[2]);
      try {
        const verses = eval('(' + m[3] + ')');
        if (Array.isArray(verses)) {
          result.chapters[chNum] = verses;
        }
      } catch(e) {
        console.warn(`  Failed to parse ${m[1]}: ${e.message}`);
      }
    }

    return result;
  }

  const data = { books: [] };
  for (const book of BOOKS) {
    const fname = BOOK_FILES[book.name];
    const fpath = path.join(BASE, 'verses', fname + '.js');
    const bookData = { name: book.name, hebrew: book.hebrew, chapters: [] };

    if (fs.existsSync(fpath)) {
      const parsed = parseVerseFile(fpath);
      if (parsed.colophon) bookData.colophon = parsed.colophon;
      for (let ch = 1; ch <= book.chapters; ch++) {
        if (parsed.chapters[ch]) {
          bookData.chapters.push({ num: ch, verses: parsed.chapters[ch] });
        } else {
          console.warn(`  Missing chapter ${ch} in ${fname}.js`);
        }
      }
    } else {
      console.warn(`  File not found: ${fpath}`);
    }

    data.books.push(bookData);
  }

  // ── Parse frontmatter interlinear data ──
  const fmVarsMap = {
    'frontIntro':         'מבוא המתרגם',
    'frontTitle':         'ספר מורמון',
    'frontIntroduction':  'מבוא',
    'frontThreeWit':      'עדות שלשת העדים',
    'frontEightWit':      'עדות שמונה עדים',
    'frontJST':           'עדות הנביא יוסף סמית',
    'frontBrief':         'ביאור קצר על־ספר מורמון',
  };

  const fmPath = path.join(BASE, 'verses', 'frontmatter.js');
  const fmSections = [];
  if (fs.existsSync(fmPath)) {
    const fmSrc = fs.readFileSync(fmPath, 'utf8');
    for (const [varName, title] of Object.entries(fmVarsMap)) {
      const re = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);\\s*(?=\\n|var\\s|render|function|\\}\\))`, 'g');
      const m = re.exec(fmSrc);
      if (m) {
        try {
          const verses = eval('(' + m[1] + ')');
          if (Array.isArray(verses)) {
            fmSections.push({ title, verses });
          }
        } catch(e) { console.warn(`  Failed to parse frontmatter ${varName}: ${e.message}`); }
      }
    }
    console.log(`  Parsed ${fmSections.length} front matter sections`);
  }

  let totalVerses = 0;
  for (const book of data.books) {
    for (const ch of book.chapters) totalVerses += ch.verses.length;
  }
  console.log(`  Extracted ${data.books.length} books, ${totalVerses} verses`);

  // ── Step 2: Build structured elements ──
  console.log('Step 2: Building elements...');

  const elements = [];

  // Front matter will be rendered as single-column pages in buildFrontMatter()
  // Only body content goes into the two-column paginated elements array

  for (const bookData of data.books) {
    elements.push({ type: 'book-title', book: bookData.name, hebrew: bookData.hebrew });

    if (bookData.colophon) {
      elements.push({ type: 'colophon', bookHebrew: bookData.hebrew, verses: bookData.colophon });
    }

    for (const ch of bookData.chapters) {
      if (bookData.chapters.length > 1) {
        elements.push({ type: 'chapter-heading', book: bookData.name, bookHebrew: bookData.hebrew,
                         chapter: ch.num, hebrew: `פרק ${hebrewNum(ch.num)}` });
      }
      for (const verse of ch.verses) {
        elements.push({
          type: 'verse', book: bookData.name, bookHebrew: bookData.hebrew,
          chapter: ch.num, verse: verse.num,
          bookChapters: bookData.chapters.length,
          words: verse.words
        });
      }
    }
  }
  console.log(`  ${elements.length} elements`);

  // ── Step 3: Build pagination HTML ──
  // Uses CSS multi-column in the browser to measure what fits on each page
  console.log('Step 3: Paginating in browser...');

  function renderWordHtml(heb, eng, addSof = false) {
    const gloss = (eng || '').replace(/-/g, '\u2011'); // non-breaking hyphens
    // sof pasuk attached inside .wh so it can never orphan onto its own line
    const sofMark = addSof ? '<span class="sof">׃</span>' : '';
    return `<span class="wp"><span class="wh">${heb}${sofMark}</span><span class="we">${gloss}</span></span>`;
  }

  function renderVerseHtml(el) {
    const words = el.words.filter(p => p[0] && p[0] !== '׃');
    if (words.length === 0) return '';
    let html = '';
    if (el.verse) html += `<span class="vn">${el.verse}</span>`;
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
      html += `<div class="col-v">`;
      for (let i = 0; i < words.length; i++) {
        const isLast = (i === words.length - 1);
        html += renderWordHtml(words[i][0], words[i][1], isLast);
        if (!isLast) html += `<span class="arr-pair"><span class="arr-top"></span><span class="arr">&#x2039;</span></span>`;
      }
      html += `</div>`;
    }
    return html;
  }

  // Pre-render all elements into HTML
  const elHtmls = elements.map(el => {
    if (el.type === 'book-title') return `<div class="bt">${el.hebrew}</div>`;
    if (el.type === 'chapter-heading') return `<div class="ch">${el.hebrew}</div>`;
    if (el.type === 'colophon') return `<div class="colophon">${renderColophonHtml(el.verses)}</div>`;
    if (el.type === 'verse') return `<div class="v">${renderVerseHtml(el)}</div>`;
    return '';
  });

  // Store the full rendered HTML with class for proper measurement
  let storageDivs = '';
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'book-title')
      storageDivs += `<div class="bt" data-i="${i}">${el.hebrew}</div>\n`;
    else if (el.type === 'chapter-heading')
      storageDivs += `<div class="ch" data-i="${i}">${el.hebrew}</div>\n`;
    else if (el.type === 'colophon')
      storageDivs += `<div class="colophon" data-i="${i}">${renderColophonHtml(el.verses)}</div>\n`;
    else if (el.type === 'verse')
      storageDivs += `<div class="v" data-i="${i}">${renderVerseHtml(el)}</div>\n`;
  }

  const sharedCSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'David Libre', 'David', serif;
  font-size: 11pt;
  line-height: 1.3;
  direction: rtl;
  background: white;
  color: #1a1a1a;
}
.bt {
  text-align: center; font-size: 16pt; font-weight: 700;
  padding: 5pt 0 1pt; column-span: all;
}
.bt-eng {
  text-align: center; font-family: 'David Libre', serif;
  font-size: 8pt; font-weight: 600; color: #555;
  direction: ltr; margin-bottom: 2pt; column-span: all;
}
.ch {
  text-align: center; font-size: 11pt; font-weight: 700;
  padding: 2pt 0 1pt; border-top: 0.5pt solid #aaa;
  border-bottom: 0.5pt solid #aaa; margin: 2pt 0 1pt;
  break-after: avoid;
}
.colophon {
  column-span: all;
  margin-bottom: 10pt; padding: 1pt 0;
  direction: rtl;
  background: white;
  position: relative; z-index: 1;
}
.col-v { margin-bottom: 0.5pt; text-align: justify; text-align-last: right; }
.v {
  display: block; margin-bottom: 2pt;
  text-align: justify;
  text-align-last: right;
}
.vn {
  display: inline-block;
  font-size: 9pt; font-weight: 700; color: #555;
  margin-left: 1pt; vertical-align: top;
  padding-top: 1pt;
}
.wp {
  display: inline-block;
  margin: 0 1pt 1pt 1pt;
  vertical-align: top;
  /* inner flexbox column centers .wh and .we relative to the widest child */
  display: -webkit-inline-box;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}
/* Override inline-flex display for justification: Chromium honours inline-block for text-align:justify */
.v { text-align: justify; text-align-last: right; }
.wh {
  display: block;
  font-family: 'David Libre', serif;
  font-size: 13pt; font-weight: 700;
  line-height: 1.15; color: #1a2744;
  text-align: center; white-space: nowrap;
}
.we {
  display: block;
  font-family: 'David Libre', serif;
  font-size: 5.5pt;
  color: #555; direction: ltr;
  line-height: 1.1; white-space: nowrap;
  text-align: center;
}
/* Chevron centered between word pairs at the English-gloss level */
.arr-pair {
  display: inline-flex; flex-direction: column; align-items: center;
  vertical-align: top;
}
.arr-top {
  /* Explicit height matches .wh (13pt × 1.15) with no content — zero width */
  display: block; height: 14.95pt; font-size: 0;
}
.arr {
  display: block; text-align: center;
  font-family: 'Times New Roman', 'David Libre', serif;
  font-size: 8pt; color: #888; line-height: 0.85;
  direction: ltr; unicode-bidi: bidi-override;
}
.sof {
  font-family: 'David Libre', serif;
  font-size: 13pt; font-weight: 700;
  margin-right: 1pt; vertical-align: baseline;
  line-height: inherit; color: #1a2744;
  display: inline; white-space: nowrap;
}`;

  const pagHtml = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}
${sharedCSS}
#storage { display: none; }
#test-col {
  width: ${TEXT_AREA_W}pt;
  column-count: 2; column-gap: ${COL_GAP}pt; column-fill: auto;
  overflow: hidden; direction: rtl;
}
</style></head><body>
<div id="storage">${storageDivs}</div>
<div id="test-col"></div>
</body></html>`;

  const pagPath = path.join(__dirname, '_interlinear_paginate.html');
  fs.writeFileSync(pagPath, pagHtml, 'utf8');

  const pagPage = await browser.newPage();
  await pagPage.setViewport({ width: 1200, height: 800 });
  await pagPage.goto('file:///' + pagPath.replace(/\\/g, '/'), {
    waitUntil: 'networkidle0', timeout: 120000
  });
  await pagPage.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 3000));

  const elMeta = elements.map(el => ({ type: el.type }));

  const pageAssignments = await pagPage.evaluate((meta, contentH_pt) => {
    const ptToPx = 96 / 72;
    const contentH = contentH_pt * ptToPx;

    const testCol = document.getElementById('test-col');
    const storage = document.getElementById('storage');

    const elMap = {};
    storage.querySelectorAll('[data-i]').forEach(el => {
      elMap[el.getAttribute('data-i')] = el;
    });

    function overflows() {
      if (testCol.scrollWidth > testCol.clientWidth + 1) return true;
      const last = testCol.lastElementChild;
      if (!last) return false;
      const cRect = testCol.getBoundingClientRect();
      const rects = last.getClientRects();
      if (rects.length === 0) return true;
      for (const r of rects) {
        if (r.left < cRect.left - 1) return true;
        if (r.bottom > cRect.bottom + 1) return true;
      }
      return false;
    }

    const pages = [];
    let cur = 0;
    const total = meta.length;

    while (cur < total) {
      const pageItems = [];
      testCol.innerHTML = '';
      testCol.style.height = contentH + 'px';

      // Book title always starts a new page
      if (meta[cur].type === 'book-title') {
        const src = elMap[cur];
        testCol.appendChild(src.cloneNode(true));
        pageItems.push(cur);
        cur++;
      }

      while (cur < total) {
        const el = meta[cur];
        if (el.type === 'book-title') break;

        const src = elMap[cur];
        const clone = src.cloneNode(true);
        clone.removeAttribute('data-i');
        testCol.appendChild(clone);

        if (overflows()) {
          testCol.removeChild(clone);
          break;
        }

        // Chapter heading: ensure at least one verse follows
        if (el.type === 'chapter-heading' && cur + 1 < total && meta[cur + 1].type === 'verse') {
          const nextSrc = elMap[cur + 1];
          const nextClone = nextSrc.cloneNode(true);
          nextClone.removeAttribute('data-i');
          testCol.appendChild(nextClone);
          const wouldOverflow = overflows();
          testCol.removeChild(nextClone);

          if (wouldOverflow) {
            testCol.removeChild(clone);
            break;
          }
        }

        pageItems.push(cur);
        cur++;
      }

      if (pageItems.length === 0 && cur < total) {
        pageItems.push(cur);
        cur++;
      }

      // If page has only a chapter heading, force-add the next verse
      if (pageItems.length === 1 && meta[pageItems[0]].type === 'chapter-heading' && cur < total) {
        const src = elMap[cur];
        const clone = src.cloneNode(true);
        clone.removeAttribute('data-i');
        testCol.appendChild(clone);
        pageItems.push(cur);
        cur++;
      }

      pages.push(pageItems);
    }

    return pages;
  }, elMeta, CONTENT_H);

  await pagPage.close();
  try { fs.unlinkSync(pagPath); } catch(e) {}

  // Post-process: prevent orphaned chapter headings at page end
  for (let p = 0; p < pageAssignments.length - 1; p++) {
    const items = pageAssignments[p];
    if (items.length > 1) {
      const lastIdx = items[items.length - 1];
      if (elements[lastIdx].type === 'chapter-heading') {
        items.pop();
        pageAssignments[p + 1].unshift(lastIdx);
      }
    }
  }

  console.log(`  ${pageAssignments.length} body pages`);

  // ── Step 4: Build page objects ──
  const pages = [];
  let curBookHebrew = '', curBookEng = '';

  for (const indices of pageAssignments) {
    const pg = {
      items: [], bookHebrew: '', bookEng: '',
      startChapter: 0, startVerse: 0, endChapter: 0, endVerse: 0
    };

    for (const idx of indices) {
      const el = elements[idx];
      pg.items.push(el);

      if (el.type === 'book-title') {
        curBookHebrew = el.hebrew;
        curBookEng = el.book;
      }
      if (el.type === 'verse') {
        if (!pg.startChapter) {
          pg.startChapter = el.chapter;
          pg.startVerse = el.verse;
        }
        pg.endChapter = el.chapter;
        pg.endVerse = el.verse;
      }
      pg.bookHebrew = el.bookHebrew || curBookHebrew;
      pg.bookEng = el.book || curBookEng;
    }

    pages.push(pg);
  }

  // ── Step 5: Render final HTML ──
  console.log('Step 5: Building final HTML...');

  function renderPageHtml(pg, pageNum) {
    const isOdd = pageNum % 2 === 1;
    // RTL binding: spine on RIGHT when closed
    // Odd (recto, RIGHT side of spread): spine/gutter on LEFT
    // Even (verso, LEFT side of spread): spine/gutter on RIGHT
    // RTL: odd body pages land on the LEFT side of the spread (spine is on the RIGHT)
    //      even body pages land on the RIGHT side (spine is on the LEFT)
    const pR = isOdd ? GUTTER : OUTER;
    const pL = isOdd ? OUTER : GUTTER;

    let contentHtml = '';
    for (const el of pg.items) {
      if (el.type === 'book-title') {
        contentHtml += `<div class="bt">${el.hebrew}</div>`;
        contentHtml += `<div class="bt-eng">${el.book}</div>`;
      } else if (el.type === 'chapter-heading') {
        contentHtml += `<div class="ch">${el.hebrew}</div>`;
      } else if (el.type === 'colophon') {
        contentHtml += `<div class="colophon">${renderColophonHtml(el.verses)}</div>`;
      } else if (el.type === 'verse') {
        contentHtml += `<div class="v">${renderVerseHtml(el)}</div>`;
      }
    }

    // Running header: book name + verse range
    let verseRange = '';
    if (pg.startChapter && pg.endChapter) {
      const sc = hebrewNum(pg.startChapter);
      const sv = pg.startVerse || '';
      const ec = hebrewNum(pg.endChapter);
      const ev = pg.endVerse || '';
      if (pg.startChapter === pg.endChapter) {
        verseRange = sv === ev ? `${sc}:${sv}` : `${sc}:${sv}–${ev}`;
      } else {
        verseRange = `${sc}:${sv} – ${ec}:${ev}`;
      }
    }

    return `<div class="page" style="padding-right:${pR}pt;padding-left:${pL}pt;">
  <div class="header"><span class="h-book">${pg.bookHebrew || ''}</span><span class="h-range">${verseRange}</span></div>
  <div class="content">${contentHtml}</div>
  <div class="pn">${pageNum}</div>
</div>`;
  }

  // ── Front matter: title pages + interlinear content (single column) ──
  function buildFrontMatter() {
    let html = '';
    let fmIdx = 0;

    function fmPad() {
      const isOdd = fmIdx % 2 === 0;
      const pR = isOdd ? OUTER : GUTTER;
      const pL = isOdd ? GUTTER : OUTER;
      fmIdx++;
      return `padding: ${TOP_M}pt ${pR}pt ${BOT_M}pt ${pL}pt`;
    }

    // 2 blank pages
    html += `<div class="fm-page" style="${fmPad()}"></div>`;
    html += `<div class="fm-page" style="${fmPad()}"></div>`;

    // Half title page
    html += `<div class="fm-page" style="${fmPad()}">
      <div class="fm-title-page">
        <div class="fm-title-top">
          <div class="fm-main-title">${frontMatter[0].header}</div>
          <div class="fm-subtitle">${frontMatter[0].body}</div>
        </div>
      </div>
    </div>`;

    // Blank page
    html += `<div class="fm-page" style="${fmPad()}"></div>`;

    // Full title page with translation info
    const s1 = frontMatter[1];
    const transLines = s1.full.split('\n').filter(l => l.trim());
    html += `<div class="fm-page" style="${fmPad()}">
      <div class="fm-title-page">
        <div class="fm-title-top">
          <div class="fm-main-title">${frontMatter[0].header}</div>
          <div class="fm-subtitle">${frontMatter[0].body}</div>
          <div class="fm-interlinear-label" style="margin-top:12pt;">Hebrew Interlinear Translation</div>
        </div>
        <div class="fm-title-bottom">
          ${transLines.map(l => `<div class="fm-trans-line">${l.trim()}</div>`).join('\n')}
          <div class="fm-trans-line" style="font-size:7pt;margin-top:6pt;">כל הזכויות שמורות © תשפ״ו</div>
        </div>
      </div>
    </div>`;

    // Pad to even page count
    const curFmCount = (html.match(/class="fm-page/g) || []).length;
    if (curFmCount % 2 !== 0) {
      html += `<div class="fm-page" style="${fmPad()}"></div>`;
    }

    return html;
  }

  // Build interlinear front matter as flowing HTML (single column, auto-paginated by Puppeteer)
  // Each section: title + content flow together; page break BEFORE each new section (not after title)
  // TOC appended at the very end
  function buildInterlinearFrontMatter() {
    let contentHtml = '';
    for (let i = 0; i < fmSections.length; i++) {
      const fmSec = fmSections[i];
      const breakBefore = i > 0 ? 'page-break-before:always;' : '';
      // Title flows with its content — just force a new page before each section
      contentHtml += `<div class="fm-sec-hdr" style="${breakBefore}">${fmSec.title}</div>\n`;
      for (const verse of fmSec.verses) {
        contentHtml += `<div class="v">${renderVerseHtml(verse)}</div>\n`;
      }
    }

    // TOC comes AFTER all front matter sections
    const tocLines = BOOKS.map(b =>
      `<div class="fm-toc-line"><span>${b.hebrew}</span><span style="font-family:'David Libre',serif;font-size:9pt;direction:ltr;">${b.name}</span></div>`
    ).join('\n');
    contentHtml += `<div style="page-break-before:always;">
      <div class="fm-sec-hdr" style="font-size:16pt;margin-bottom:12pt;padding-bottom:8pt;border-bottom:1pt solid #999;display:block;height:auto;page-break-after:avoid;">תוכן העניינים</div>
      <div class="fm-toc">${tocLines}</div>
    </div>`;

    // Flowing HTML with @page — Puppeteer auto-paginates
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}
@page { size: ${PAGE_W / 72}in ${PAGE_H / 72}in; margin: ${TOP_M / 72}in ${GUTTER / 72}in ${BOT_M / 72}in ${GUTTER / 72}in; }
${sharedCSS}
body { padding: 0; }
.v { text-align: justify; text-align-last: right; margin-bottom: 2pt; }
.fm-sec-hdr {
  font-size: 18pt; font-weight: 700; text-align: center;
  margin-bottom: 8pt; padding-bottom: 5pt;
  border-bottom: 0.75pt solid #999;
}
.fm-toc { direction: rtl; }
.fm-toc-line {
  display: flex; justify-content: space-between;
  padding: 3pt 0; border-bottom: 0.5pt dotted #999;
}
</style></head><body>
${contentHtml}
</body></html>`;
  }

  const fmHtml = buildFrontMatter();
  const fmPageCount = (fmHtml.match(/class="fm-page/g) || []).length;
  console.log(`  Front matter: ${fmPageCount} pages`);

  let pagesHtml = '';
  for (let i = 0; i < pages.length; i++) pagesHtml += renderPageHtml(pages[i], i + 1);

  const finalHtml = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}
@page { size: ${PAGE_W / 72}in ${PAGE_H / 72}in; margin: 0; }
${sharedCSS}
.page {
  width: ${PAGE_W}pt; height: ${PAGE_H}pt;
  padding-top: ${TOP_M}pt; padding-bottom: ${BOT_M}pt;
  overflow: hidden; page-break-after: always;
  display: flex; flex-direction: column;
}
.page:last-child { page-break-after: auto; }
.header {
  display: flex; justify-content: space-between; flex-shrink: 0;
  font-size: 7.5pt; color: #555; border-bottom: 0.5pt solid #999;
  padding-bottom: 2pt; margin-bottom: ${HEADER_GAP}pt;
  height: ${HEADER_H}pt; direction: rtl;
}
.h-book { font-weight: 600; }
.h-range { font-weight: 400; }
.content {
  height: ${CONTENT_H}pt; flex-shrink: 0;
  column-count: 2; column-gap: ${COL_GAP}pt; column-fill: auto;
  column-rule: 0.5pt solid #bbb;
  direction: rtl; overflow: hidden;
}
.pn {
  flex-shrink: 0; font-size: 7.5pt; color: #555;
  text-align: center; height: ${PAGE_NUM_H}pt;
  border-top: 0.5pt solid #999; padding-top: 3pt;
}
/* Front matter */
.fm-page {
  width: ${PAGE_W}pt; height: ${PAGE_H}pt;
  position: relative; overflow: hidden; page-break-after: always;
  font-family: 'David Libre', 'David', serif; font-size: 12pt; line-height: 1.6;
  direction: rtl; text-align: justify;
}
.fm-title-page {
  display: flex; flex-direction: column; justify-content: space-between;
  height: 100%; text-align: center;
}
.fm-title-top { padding-top: 40pt; }
.fm-title-bottom { padding-bottom: 40pt; }
.fm-main-title { font-size: 26pt; font-weight: 700; margin-bottom: 14pt; }
.fm-subtitle { font-size: 14pt; color: #333; }
.fm-interlinear-label {
  font-family: 'David Libre', serif; font-size: 11pt;
  direction: ltr; margin-bottom: 16pt; color: #444;
}
.fm-trans-line { font-size: 12pt; margin-bottom: 6pt; }
.fm-section-title {
  font-size: 15pt; font-weight: 700; text-align: center;
  margin-bottom: 10pt;
}
.fm-text p { margin-bottom: 6pt; text-indent: 0; }
.fm-toc { direction: rtl; }
.fm-toc-line {
  display: flex; justify-content: space-between;
  padding: 3pt 0; border-bottom: 0.5pt dotted #999;
}
</style></head><body>
${fmHtml}
${pagesHtml}
</body></html>`;

  const htmlPath = path.join(__dirname, '_interlinear_6x9_pages.html');
  fs.writeFileSync(htmlPath, finalHtml, 'utf8');
  console.log(`  Final HTML: ${(finalHtml.length / 1024 / 1024).toFixed(1)} MB`);

  // ── Step 6: Render PDF in batches ──
  console.log('Step 6: Rendering PDF in batches...');

  const cssBlock = `@page { size: ${PAGE_W / 72}in ${PAGE_H / 72}in; margin: 0; }
${sharedCSS}
.page {
  width: ${PAGE_W}pt; height: ${PAGE_H}pt;
  padding-top: ${TOP_M}pt; padding-bottom: ${BOT_M}pt;
  overflow: hidden; page-break-after: always;
  display: flex; flex-direction: column;
}
.page:last-child { page-break-after: auto; }
.header {
  display: flex; justify-content: space-between; flex-shrink: 0;
  font-size: 7.5pt; color: #555; border-bottom: 0.5pt solid #999;
  padding-bottom: 2pt; margin-bottom: ${HEADER_GAP}pt;
  height: ${HEADER_H}pt; direction: rtl;
}
.h-book { font-weight: 600; }
.h-range { font-weight: 400; }
.content {
  height: ${CONTENT_H}pt; flex-shrink: 0;
  column-count: 2; column-gap: ${COL_GAP}pt; column-fill: auto;
  column-rule: 0.5pt solid #bbb;
  direction: rtl; overflow: hidden;
}
.pn {
  flex-shrink: 0; font-size: 7.5pt; color: #555;
  text-align: center; height: ${PAGE_NUM_H}pt;
  border-top: 0.5pt solid #999; padding-top: 3pt;
}
.fm-page {
  width: ${PAGE_W}pt; height: ${PAGE_H}pt;
  position: relative; overflow: hidden; page-break-after: always;
  font-family: 'David Libre', 'David', serif; font-size: 12pt; line-height: 1.6;
  direction: rtl; text-align: justify;
}
.fm-title-page {
  display: flex; flex-direction: column; justify-content: space-between;
  height: 100%; text-align: center;
}
.fm-title-top { padding-top: 40pt; }
.fm-title-bottom { padding-bottom: 40pt; }
.fm-main-title { font-size: 26pt; font-weight: 700; margin-bottom: 14pt; }
.fm-subtitle { font-size: 14pt; color: #333; }
.fm-interlinear-label {
  font-family: 'David Libre', serif; font-size: 11pt;
  direction: ltr; margin-bottom: 16pt; color: #444;
}
.fm-trans-line { font-size: 12pt; margin-bottom: 6pt; }
.fm-section-title {
  font-size: 15pt; font-weight: 700; text-align: center;
  margin-bottom: 10pt;
}
.fm-text p { margin-bottom: 6pt; text-indent: 0; }
.fm-toc { direction: rtl; }
.fm-toc-line {
  display: flex; justify-content: space-between;
  padding: 3pt 0; border-bottom: 0.5pt dotted #999;
}`;

  const fontsLink = `<style>${fontFaceCSS}</style>`;

  function wrapHtml(bodyContent) {
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
${fontsLink}
<style>${cssBlock}</style></head><body>
${bodyContent}
</body></html>`;
  }

  async function renderBatchPdf(html, label) {
    const pg = await browser.newPage();
    pg.setDefaultTimeout(300000);
    await pg.setContent(html, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise(r => setTimeout(r, 8000)); // let fonts + layout settle
    const buf = await pg.pdf({
      width: `${PAGE_W / 72}in`, height: `${PAGE_H / 72}in`,
      printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    await pg.close();
    console.log(`    ${label}: ${buf.length} bytes`);
    return buf;
  }

  const pdfBuffers = [];

  // Batch 0: Front matter
  if (fmHtml.trim()) {
    console.log('  Rendering title pages...');
    const fmBuf = await renderBatchPdf(wrapHtml(fmHtml), `Title pages (${fmPageCount} pages)`);
    pdfBuffers.push(fmBuf);
  }

  // Render interlinear front matter (single column, auto-paginated)
  if (fmSections.length > 0) {
    console.log('  Rendering interlinear front matter...');
    const ilFmHtml = buildInterlinearFrontMatter();
    const pg = await browser.newPage();
    pg.setDefaultTimeout(300000);
    await pg.setContent(ilFmHtml, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise(r => setTimeout(r, 8000));
    const ilFmBuf = await pg.pdf({
      width: `${PAGE_W / 72}in`, height: `${PAGE_H / 72}in`,
      printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    console.log(`    Interlinear front matter: ${ilFmBuf.length} bytes`);
    await pg.close();
    pdfBuffers.push(ilFmBuf);
  }

  // Ensure 1 Nephi (body page 1) starts on a LEFT page
  // In KDP RTL viewer: ODD pages appear on the LEFT side of a spread
  // So body must start on an ODD page → total front matter must be EVEN
  {
    let totalFmPages = 0;
    for (const buf of pdfBuffers) {
      const tmp = await PDFDocument.load(buf);
      totalFmPages += tmp.getPageCount();
    }
    console.log(`  Front matter is ${totalFmPages} pages`);
    if (totalFmPages % 2 !== 0) {
      // ODD front matter → body starts at even page = RIGHT in RTL → add 1 blank
      console.log(`  Inserting 1 blank page so body starts on LEFT page (odd page in RTL)`);
      const blankDoc = await PDFDocument.create();
      blankDoc.addPage([PAGE_W, PAGE_H]);
      const blankBytes = await blankDoc.save();
      pdfBuffers.push(Buffer.from(blankBytes));
    } else {
      console.log(`  Front matter already even — body starts on LEFT page (odd in RTL)`);
    }
  }

  // Body pages in batches of 50
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(pages.length / BATCH_SIZE);
  console.log(`  Rendering ${pages.length} body pages in ${totalBatches} batches...`);

  for (let b = 0; b < totalBatches; b++) {
    const start = b * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, pages.length);
    let batchHtml = '';
    for (let i = start; i < end; i++) batchHtml += renderPageHtml(pages[i], i + 1);
    const buf = await renderBatchPdf(wrapHtml(batchHtml), `Batch ${b + 1}/${totalBatches} (pages ${start + 1}-${end})`);
    pdfBuffers.push(buf);
  }

  // Merge all PDFs with pdf-lib
  console.log('  Merging PDFs...');
  const merged = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const src = await PDFDocument.load(buf);
    const copied = await merged.copyPages(src, src.getPageIndices());
    for (const pg of copied) merged.addPage(pg);
  }

  const outputPath = path.join(BASE, 'Hebrew_Interlinear_BOM_6x9.pdf');
  const mergedBytes = await merged.save();
  fs.writeFileSync(outputPath, mergedBytes);

  const stats = fs.statSync(outputPath);
  const totalPages = fmPageCount + pages.length;
  console.log(`\nPDF: ${outputPath}`);
  console.log(`  Pages: ${totalPages} (${fmPageCount} front + ${pages.length} body)`);
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  if (totalPages > 828) {
    console.log(`  NOTE: ${totalPages} pages exceeds KDP 6x9 limit of 828.`);
    console.log('  PDF generated successfully. Manual trimming may be needed for KDP submission.');
  }

  await browser.close();

  // Cleanup temp files
  try { fs.unlinkSync(htmlPath); } catch(e) {}

  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
