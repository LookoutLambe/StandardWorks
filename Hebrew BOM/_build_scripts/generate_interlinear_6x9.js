// Interlinear Hebrew BOM PDF (verse files → paginated HTML → PDF)
// Verse structure matches bom.html: _doRenderVerses (Hebrew num from data + Arabic index) + renderWords
// (gloss hyphens → spaces, full word list with ׃ for sof pasuk, chevrons ‹/«). Print CSS is denser than the web app.
// Page: US Letter 8.5×11; running headers use hebrewNum() for chapter only — verse keys are data verse.num strings.
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

// Hebrew numerals (gematria) — chapters only; verse markers come from verse files as Hebrew strings (א…יא…)
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

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Interlinear HTML aligned with bom.html: renderWords + _doRenderVerses (verse-num + word-flow + word-unit). */
function renderVerseHtml(el, pageAttrs) {
  const rawWords = (el.words || []).filter(p => p && p[0]);
  if (rawWords.length === 0) return '';

  const verseLabel = el.verseLabel !== undefined ? el.verseLabel : el.num;
  const verseArabic = el.verseArabic !== undefined ? el.verseArabic : null;
  const dataA =
    pageAttrs && (pageAttrs.ch != null || pageAttrs.vs != null)
      ? ` data-ch="${escapeHtml(String(pageAttrs.ch ?? ''))}" data-vs="${escapeHtml(String(pageAttrs.vs ?? ''))}"`
      : '';

  const realWords = rawWords.filter(([h]) => h !== '\u05C3');
  const lastRealIdx = realWords.length - 1;
  let realCount = 0;
  let wordFlow = '';

  rawWords.forEach(([h, e], i) => {
    if (h === '\u05C3') return;
    const isSof = (i + 1 < rawWords.length && rawWords[i + 1][0] === '\u05C3') || (realCount === lastRealIdx);
    const isLastWord = realCount === lastRealIdx;
    const sym = isLastWord ? '\u00ab' : '\u2039';
    let hw = h.replace(/\u05C3/g, '');
    const gloss = (e || '').replace(/-/g, ' ');
    wordFlow += `<span class="word-group"><span class="word-unit${isSof ? ' sof' : ''}"><span class="hw">${escapeHtml(hw)}</span><span class="gl">${escapeHtml(gloss)}</span></span><span class="arr">${sym}</span></span>`;
    realCount++;
  });

  let numHtml = '';
  if (verseLabel != null && verseLabel !== '') {
    numHtml = `<div class="verse-num"><span class="vn-heb">${escapeHtml(String(verseLabel))}</span>`;
    if (verseArabic != null && verseArabic !== '') {
      numHtml += `<span class="verse-num-arabic">${verseArabic}</span>`;
    }
    numHtml += '</div>';
  }

  return `<div class="verse"${dataA}>${numHtml}<div class="word-flow">${wordFlow}</div></div>`;
}

// ─── Page layout (points) — US Letter 8.5×11, KDP-ready — tuned for ~540 interior pages ───
const PAGE_W    = 8.5 * 72;      // 612pt
const PAGE_H    = 11 * 72;       // 792pt
const GUTTER    = 0.58 * 72;     // inside/spine
const OUTER     = 0.52 * 72;     // outside — wider columns → fewer wraps
const TOP_M     = 0.42 * 72;
const BOT_M     = 0.40 * 72;
const COL_GAP   = 0.14 * 72;     // column gutter
const HEADER_H  = 10;
const HEADER_GAP = 0;
const PAGE_NUM_H = 8;

// Interlinear band (.arr-top height must match .wh line box)
// Print density — tuned with web-style verse row (Hebrew + Arabic index) to land near KDP 540
const HEB_PT     = 10.85;
const HEB_LH     = 1.08;
const ENG_PT     = 6.95;
const ENG_LH     = 1.02;
const ARR_TOP_PT = HEB_PT * HEB_LH;
const VN_PT      = Math.min(11.5, HEB_PT - 1.2); // verse letter: visually subordinate to Hebrew line
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
      const superCount = ch.verses.filter(v => v.num === '∗').length;
      ch.verses.forEach((verse, idx) => {
        const verseArabic = verse.num === '∗' ? null : (idx + 1 - superCount);
        elements.push({
          type: 'verse',
          book: bookData.name,
          bookHebrew: bookData.hebrew,
          chapter: ch.num,
          verseLabel: verse.num,
          verseArabic,
          bookChapters: bookData.chapters.length,
          words: verse.words
        });
      });
    }
  }
  console.log(`  ${elements.length} elements`);

  // ── Step 3: Build pagination HTML ──
  // Uses CSS multi-column in the browser to measure what fits on each page
  console.log('Step 3: Paginating in browser...');

  function renderColophonHtml(colVerses) {
    let html = '';
    for (const v of colVerses) {
      html += renderVerseHtml({
        words: v.words || [],
        verseLabel: '',
        verseArabic: null
      });
    }
    return html;
  }

  // Pre-render all elements into HTML
  const elHtmls = elements.map(el => {
    if (el.type === 'book-title') return `<div class="bt">${el.hebrew}</div>`;
    if (el.type === 'chapter-heading') return `<div class="ch">${el.hebrew}</div>`;
    if (el.type === 'colophon') return `<div class="colophon">${renderColophonHtml(el.verses)}</div>`;
    if (el.type === 'verse') return renderVerseHtml(el);
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
      storageDivs += `<div data-i="${i}">${renderVerseHtml(el)}</div>\n`;
  }

  const sharedCSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'David Libre', 'David', serif;
  font-size: 12pt;
  line-height: 1.35;
  direction: rtl;
  background: white;
  color: #1a1a1a;
}
.bt {
  text-align: center; font-size: 19pt; font-weight: 700;
  padding: 5pt 0 1pt; column-span: all;
}
.bt-eng {
  text-align: center; font-family: 'David Libre', serif;
  font-size: 9.5pt; font-weight: 600; color: #555;
  direction: ltr; margin-bottom: 2pt; column-span: all;
}
.ch {
  text-align: center; font-size: 14pt; font-weight: 700;
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
/* ── Interlinear: same DOM semantics as bom.html; print CSS keeps gloss single-line for density ── */
.verse {
  display: flex;
  align-items: flex-start;
  gap: 4.5pt;
  margin-bottom: 0.85pt;
  padding: 1pt 0 1.5pt;
  border-bottom: none;
  box-sizing: border-box;
}
.colophon .verse { padding: 0.5pt 0; margin-bottom: 0.25pt; }
.verse-num {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 2.5pt;
  min-width: 22pt;
  max-width: 36pt;
  padding-top: 2.5pt;
  font-size: ${VN_PT}pt;
  font-weight: 700;
  color: #5a9fc4;
  line-height: 1;
}
.vn-heb { flex-shrink: 0; }
.verse-num-arabic {
  display: inline;
  font-size: 6.6pt;
  font-weight: 500;
  opacity: 0.78;
  font-family: 'David Libre', serif;
  color: #5a9fc4;
}
.word-flow {
  flex: 1;
  text-align: justify;
  text-align-last: right;
  direction: rtl;
  min-width: 0;
}
.word-group {
  display: inline-flex;
  align-items: flex-start;
  vertical-align: top;
  direction: rtl;
}
.word-unit {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 1px 1.5pt 3pt;
  margin: 0 2.5pt;
  min-width: 18pt;
  vertical-align: top;
}
.hw {
  font-family: 'David Libre', serif;
  font-size: ${HEB_PT}pt;
  font-weight: 700;
  line-height: ${HEB_LH};
  color: #1a2744;
  white-space: nowrap;
  direction: rtl;
  text-align: center;
}
.gl {
  font-family: 'David Libre', serif;
  font-size: ${ENG_PT}pt;
  font-style: italic;
  color: #1a2744;
  line-height: ${ENG_LH};
  text-align: center;
  direction: ltr;
  white-space: nowrap;
  margin-top: 0.5px;
  opacity: 0.88;
}
.word-unit.sof .hw::after {
  content: ' ׃';
  color: #1a2744;
}
.arr {
  display: inline-block;
  vertical-align: top;
  padding: 4pt 0 2pt;
  margin: 0 0.5px;
  opacity: 0.7;
  direction: ltr;
  unicode-bidi: isolate;
  color: #b8943a;
  font-family: 'Times New Roman', 'David Libre', serif;
  font-size: 9.5pt;
  line-height: 1;
}`;

  const pagHtml = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}
${sharedCSS}
#storage { display: none; }
#test-col {
  width: ${TEXT_AREA_W}pt;
  column-count: 2; column-gap: ${COL_GAP}pt; column-fill: auto;
  column-rule: 0.5pt solid #bbb;
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
      if (testCol.scrollWidth > testCol.clientWidth + 2) return true;
      // Multi-column: measuring only the last child misses clipped blocks (headers showed e.g. …–ז while verse ז was hidden).
      if (testCol.scrollHeight > testCol.clientHeight + 2) return true;
      const last = testCol.lastElementChild;
      if (!last) return false;
      const cRect = testCol.getBoundingClientRect();
      const rects = last.getClientRects();
      if (rects.length === 0) return true;
      for (const r of rects) {
        if (r.left < cRect.left - 2) return true;
        if (r.bottom > cRect.bottom + 2) return true;
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
    }

    // Header verse range: always from first verse on page → last verse on page (document order).
    // Incremental !startChapter logic was wrong for chapter 1 vs 0 and easier to desync.
    const verseEls = indices.map(i => elements[i]).filter(e => e.type === 'verse');
    if (verseEls.length > 0) {
      const first = verseEls[0];
      const last = verseEls[verseEls.length - 1];
      pg.startChapter = first.chapter;
      pg.startVerse = first.verseLabel;
      pg.endChapter = last.chapter;
      pg.endVerse = last.verseLabel;
      pg.bookHebrew = first.bookHebrew || '';
      pg.bookEng = first.book || '';
    } else {
      for (let i = indices.length - 1; i >= 0; i--) {
        const el = elements[indices[i]];
        if (el.bookHebrew) {
          pg.bookHebrew = el.bookHebrew;
          break;
        }
        if (el.type === 'book-title') {
          pg.bookHebrew = el.hebrew;
          break;
        }
      }
      if (!pg.bookHebrew) pg.bookHebrew = curBookHebrew;
      if (!pg.bookEng) pg.bookEng = curBookEng;
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
        contentHtml += renderVerseHtml(el, { ch: el.chapter, vs: el.verseLabel });
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
      const fmSuper = fmSec.verses.filter(v => v.num === '∗').length;
      fmSec.verses.forEach((verse, idx) => {
        const verseArabic = verse.num === '∗' ? null : (idx + 1 - fmSuper);
        contentHtml += `${renderVerseHtml({
          words: verse.words,
          verseLabel: verse.num,
          verseArabic
        })}\n`;
      });
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

  function buildBodyHtmlDocument(bodyPagesHtml) {
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
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
${bodyPagesHtml}
</body></html>`;
  }

  /** After layout, verse blocks that fall outside .content (column overflow) are clipped but remain in the DOM. Snap headers to actually visible .verse nodes. */
  async function snapHeadersToVisibleVerses(browserInst, htmlPathForSnap, pagesArr) {
    const url = 'file:///' + htmlPathForSnap.replace(/\\/g, '/');
    const tab = await browserInst.newPage();
    await tab.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
    await tab.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 1500));
    const rows = await tab.evaluate(() => {
      const pageEls = Array.from(document.querySelectorAll('body > .page'));
      return pageEls.map(pageEl => {
        const content = pageEl.querySelector('.content');
        if (!content) return null;
        const cr = content.getBoundingClientRect();
        const verseEls = Array.from(pageEl.querySelectorAll('.content .verse'));
        const vis = verseEls.filter(v => {
          const r = v.getBoundingClientRect();
          return r.top >= cr.top - 1 && r.bottom <= cr.bottom + 1
            && r.left >= cr.left - 1 && r.right <= cr.right + 1;
        });
        if (!vis.length) return null;
        const f = vis[0];
        const l = vis[vis.length - 1];
        return {
          ch0: f.getAttribute('data-ch'),
          v0: f.getAttribute('data-vs'),
          ch1: l.getAttribute('data-ch'),
          v1: l.getAttribute('data-vs'),
        };
      });
    });
    await tab.close();
    for (let i = 0; i < pagesArr.length; i++) {
      const row = rows[i];
      if (!row || row.ch0 == null || row.ch0 === '') continue;
      const p = pagesArr[i];
      p.startChapter = parseInt(row.ch0, 10) || p.startChapter;
      p.endChapter = parseInt(row.ch1, 10) || p.endChapter;
      p.startVerse = row.v0 != null ? row.v0 : p.startVerse;
      p.endVerse = row.v1 != null ? row.v1 : p.endVerse;
    }
  }

  let pagesHtml = '';
  for (let i = 0; i < pages.length; i++) pagesHtml += renderPageHtml(pages[i], i + 1);

  const htmlPath = path.join(__dirname, '_interlinear_letter_pages.html');
  let finalHtml = buildBodyHtmlDocument(pagesHtml);
  fs.writeFileSync(htmlPath, finalHtml, 'utf8');
  console.log(`  Final HTML: ${(finalHtml.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('  Snapping headers to visible verses (layout pass)...');
  await snapHeadersToVisibleVerses(browser, htmlPath, pages);
  pagesHtml = '';
  for (let i = 0; i < pages.length; i++) pagesHtml += renderPageHtml(pages[i], i + 1);
  finalHtml = buildBodyHtmlDocument(pagesHtml);
  fs.writeFileSync(htmlPath, finalHtml, 'utf8');

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

  const outputPath = path.join(BASE, 'Hebrew_Interlinear_BOM_8p5x11.pdf');
  const mergedBytes = await merged.save();
  fs.writeFileSync(outputPath, mergedBytes);

  const stats = fs.statSync(outputPath);
  const totalPages = merged.getPageCount();
  console.log(`\nPDF: ${outputPath}`);
  console.log(`  Pages: ${totalPages} (title/front batches + interlinear FM + ${pages.length} body)`);
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  const PAGE_TARGET_KDP = 540;
  if (totalPages > PAGE_TARGET_KDP) {
    console.log(`  NOTE: ${totalPages} pages — KDP target was ~${PAGE_TARGET_KDP}; tighten HEB_PT/ENG_PT/margins in this script if you need fewer pages.`);
  } else if (totalPages < PAGE_TARGET_KDP - 20) {
    console.log(`  NOTE: ${totalPages} pages is well under ${PAGE_TARGET_KDP}; you can loosen typography slightly if desired.`);
  }

  await browser.close();

  // Cleanup temp files
  try { fs.unlinkSync(htmlPath); } catch(e) {}

  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
