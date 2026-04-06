// generate_dc.js
// Standalone Doctrine & Covenants Hebrew Interlinear 6×9 PDF
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

const SW_BASE = path.resolve(__dirname, '..', '..');   // Standard Works Project/
const DC_DIR  = path.join(SW_BASE, 'dc_verses');

const FONTS_PATH = path.join(__dirname, 'fonts').replace(/\\/g, '/');
const fontFaceCSS = `
@font-face { font-family: 'David Libre'; font-weight: 400; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Regular.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 500; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Medium.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 700; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Bold.ttf') format('truetype'); }
`;

const DC_FILES = [
  'dc1_10.js','dc11_20.js','dc21_30.js','dc31_40.js',
  'dc41_50.js','dc51_60.js','dc61_70.js','dc71_80.js',
  'dc81_90.js','dc91_100.js','dc101_110.js','dc111_120.js',
  'dc121_130.js','dc131_138.js',
];

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

const PAGE_W    = 8.5 * 72;
const PAGE_H    = 11  * 72;
const GUTTER    = 0.75 * 72;
const OUTER     = 0.6  * 72;
const TOP_M     = 0.5  * 72;
const BOT_M     = 0.4  * 72;
const COL_GAP   = 0.2  * 72;
const HEADER_H  = 12;
const HEADER_GAP= 3;
const PAGE_NUM_H= 10;
const CONTENT_H = PAGE_H - TOP_M - BOT_M - HEADER_H - HEADER_GAP - PAGE_NUM_H;
const TEXT_AREA_W= PAGE_W - GUTTER - OUTER;

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'],
    protocolTimeout: 3600000
  });

  // ── Parsers ───────────────────────────────────────────────────────────────
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

  function parseNamedArray(filePath, varName) {
    if (!fs.existsSync(filePath)) return [];
    const src = fs.readFileSync(filePath, 'utf8');
    const re  = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);\\s*(?=\\n|var\\s|render|function|\\}\\))`);
    const m   = re.exec(src);
    if (!m) return [];
    try { return eval('(' + m[1] + ')'); } catch(e) { return []; }
  }

  // ── Step 1: Load D&C data ─────────────────────────────────────────────────
  console.log('Step 1: Loading D&C data...');

  const dcSections = {};
  for (const f of DC_FILES) {
    const secs = parseDCFile(path.join(DC_DIR, f));
    Object.assign(dcSections, secs);
  }
  const dcIntroVerses = parseNamedArray(path.join(DC_DIR, 'dc_intro.js'), 'dcIntro_ch1Verses');
  const od1Verses     = parseNamedArray(path.join(DC_DIR, 'od.js'), 'od1_ch1Verses');
  const od2Verses     = parseNamedArray(path.join(DC_DIR, 'od.js'), 'od2_ch1Verses');
  const dcSecNums     = Object.keys(dcSections).map(Number).sort((a,b)=>a-b);
  const verseCount    = dcSecNums.reduce((s,n)=>s+dcSections[n].length, 0);
  console.log(`  ${dcSecNums.length} sections, ${verseCount} verses  intro:${dcIntroVerses.length} od1:${od1Verses.length} od2:${od2Verses.length}`);

  // ── Step 2: Build elements ────────────────────────────────────────────────
  console.log('Step 2: Building elements...');
  const elements = [];

  // D&C Intro
  const dcIntroFiltered = dcIntroVerses.filter(v => v && v.num && v.words && v.words.length > 0);
  if (dcIntroFiltered.length > 0) {
    elements.push({ type:'book-title', book:'Introduction', hebrew:'מְבוֹא', bookHebrew:'תּוֹרָה וּבְרִיתוֹת' });
    for (const v of dcIntroFiltered)
      elements.push({ type:'verse', book:'Introduction', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                      chapter:0, verse:v.num, words:v.words });
  }

  // D&C Sections 1–138
  for (const n of dcSecNums) {
    const verses = dcSections[n].filter(v => v && v.num && v.words && v.words.length > 0);
    if (verses.length === 0) continue;
    elements.push({ type:'chapter-heading', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                    chapter:n, hebrew:`סעיף ${hebrewNum(n)}` });
    for (const v of verses)
      elements.push({ type:'verse', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                      chapter:n, verse:v.num, words:v.words });
  }

  // Official Declarations
  const od1f = od1Verses.filter(v => v && v.num && v.words && v.words.length > 0);
  if (od1f.length > 0) {
    elements.push({ type:'chapter-heading', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                    chapter:0, hebrew:'הַכְרָזָה רְשָׁמִית א׳' });
    for (const v of od1f)
      elements.push({ type:'verse', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                      chapter:0, verse:v.num, words:v.words });
  }
  const od2f = od2Verses.filter(v => v && v.num && v.words && v.words.length > 0);
  if (od2f.length > 0) {
    elements.push({ type:'chapter-heading', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                    chapter:0, hebrew:'הַכְרָזָה רְשָׁמִית ב׳' });
    for (const v of od2f)
      elements.push({ type:'verse', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                      chapter:0, verse:v.num, words:v.words });
  }

  console.log(`  ${elements.length} total elements`);

  // ── Renderers ─────────────────────────────────────────────────────────────
  function renderWordHtml(heb, eng, addSof = false) {
    const gloss   = (eng||'').replace(/-/g,'\u2011');
    const sofMark = addSof ? '<span class="sof">׃</span>' : '';
    return `<span class="wp"><span class="wh">${heb}${sofMark}</span><span class="we">${gloss}</span></span>`;
  }

  function renderVerseHtml(el) {
    const words = (el.words||[]).filter(p => p[0] && p[0] !== '׃');
    if (words.length === 0) return '';
    let html = el.verse ? `<span class="vn">${el.verse}</span>` : '';
    for (let i = 0; i < words.length; i++) {
      const isLast = (i === words.length - 1);
      html += renderWordHtml(words[i][0], words[i][1], isLast);
      if (!isLast) html += `<span class="arr-pair"><span class="arr-top"></span><span class="arr">&#x2039;</span></span>`;
    }
    return html;
  }

  // ── Shared CSS ────────────────────────────────────────────────────────────
  const sharedCSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'David Libre','David',serif; font-size:11pt; line-height:1.3; direction:rtl; background:white; color:#1a1a1a; }
.bt { text-align:center; font-size:16pt; font-weight:700; padding:5pt 0 1pt; column-span:all; }
.bt-eng { text-align:center; font-family:'David Libre',serif; font-size:8pt; font-weight:600; color:#555; direction:ltr; margin-bottom:2pt; column-span:all; }
.ch { text-align:center; font-size:11pt; font-weight:700; padding:2pt 0 1pt; border-top:0.5pt solid #aaa; border-bottom:0.5pt solid #aaa; margin:2pt 0 1pt; break-after:avoid; }
.v { display:block; margin-bottom:2pt; text-align:justify; text-align-last:right; }
.vn { display:inline-block; font-size:9pt; font-weight:700; color:#555; margin-left:1pt; vertical-align:top; padding-top:1pt; }
.wp { display:inline-block; margin:0 1pt 1pt 1pt; vertical-align:top; display:-webkit-inline-box; display:inline-flex; flex-direction:column; align-items:center; }
.v { text-align:justify; text-align-last:right; }
.wh { display:block; font-family:'David Libre',serif; font-size:13pt; font-weight:700; line-height:1.15; color:#1a2744; text-align:center; white-space:nowrap; }
.we { display:block; font-family:'David Libre',serif; font-size:5.5pt; color:#555; direction:ltr; line-height:1.1; white-space:nowrap; text-align:center; }
.arr-pair { display:inline-flex; flex-direction:column; align-items:center; vertical-align:top; }
.arr-top  { display:block; height:14.95pt; font-size:0; }
.arr      { display:block; text-align:center; font-family:'Times New Roman','David Libre',serif; font-size:8pt; color:#888; line-height:0.85; direction:ltr; unicode-bidi:bidi-override; }
.sof { font-family:'David Libre',serif; font-size:13pt; font-weight:700; margin-right:1pt; vertical-align:baseline; line-height:inherit; color:#1a2744; display:inline; white-space:nowrap; }`;

  // ── Step 3: Paginate ──────────────────────────────────────────────────────
  console.log('Step 3: Paginating...');

  let storageDivs = '';
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'book-title')
      storageDivs += `<div class="bt" data-i="${i}">${el.hebrew}</div>\n`;
    else if (el.type === 'chapter-heading')
      storageDivs += `<div class="ch" data-i="${i}">${el.hebrew}</div>\n`;
    else if (el.type === 'verse')
      storageDivs += `<div class="v" data-i="${i}">${renderVerseHtml(el)}</div>\n`;
  }

  const pagHtml = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}${sharedCSS}
#storage{display:none;}
#test-col{width:${TEXT_AREA_W}pt;column-count:2;column-gap:${COL_GAP}pt;column-fill:auto;overflow:hidden;direction:rtl;}
</style></head><body>
<div id="storage">${storageDivs}</div>
<div id="test-col"></div>
</body></html>`;

  const pagPath = path.join(__dirname, '_dc_paginate.html');
  fs.writeFileSync(pagPath, pagHtml, 'utf8');

  const pagPage = await browser.newPage();
  await pagPage.setViewport({ width:1200, height:800 });
  await pagPage.goto('file:///'+pagPath.replace(/\\/g,'/'), { waitUntil:'networkidle0', timeout:120000 });
  await pagPage.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 3000));

  const elMeta = elements.map(el => ({ type:el.type }));

  const pageAssignments = await pagPage.evaluate((meta, contentH_pt) => {
    const ptToPx   = 96/72;
    const contentH = contentH_pt * ptToPx;
    const testCol  = document.getElementById('test-col');
    const storage  = document.getElementById('storage');
    const elMap    = {};
    storage.querySelectorAll('[data-i]').forEach(el => elMap[el.getAttribute('data-i')] = el);

    function overflows() {
      if (testCol.scrollWidth > testCol.clientWidth+1) return true;
      const last = testCol.lastElementChild;
      if (!last) return false;
      const cRect = testCol.getBoundingClientRect();
      for (const r of last.getClientRects()) {
        if (r.left < cRect.left-1) return true;
        if (r.bottom > cRect.bottom+1) return true;
      }
      return false;
    }

    const pages = [];
    let cur=0, total=meta.length;
    while (cur < total) {
      const pageItems = [];
      testCol.innerHTML = '';
      testCol.style.height = contentH+'px';

      if (meta[cur].type === 'book-title') {
        testCol.appendChild(elMap[cur].cloneNode(true));
        pageItems.push(cur++);
      }

      while (cur < total) {
        const el = meta[cur];
        if (el.type === 'book-title') break;
        const clone = elMap[cur].cloneNode(true); clone.removeAttribute('data-i');
        testCol.appendChild(clone);
        if (overflows()) { testCol.removeChild(clone); break; }
        if (el.type === 'chapter-heading' && cur+1<total && meta[cur+1].type==='verse') {
          const nClone = elMap[cur+1].cloneNode(true); nClone.removeAttribute('data-i');
          testCol.appendChild(nClone);
          const over = overflows(); testCol.removeChild(nClone);
          if (over) { testCol.removeChild(clone); break; }
        }
        pageItems.push(cur++);
      }
      if (pageItems.length===0 && cur<total) { pageItems.push(cur++); }
      if (pageItems.length===1 && meta[pageItems[0]].type==='chapter-heading' && cur<total) pageItems.push(cur++);
      pages.push(pageItems);
    }
    return pages;
  }, elMeta, CONTENT_H);

  await pagPage.close();
  try { fs.unlinkSync(pagPath); } catch(e) {}

  // Orphan fix
  for (let p=0; p<pageAssignments.length-1; p++) {
    const items = pageAssignments[p];
    if (items.length>1 && elements[items[items.length-1]].type==='chapter-heading')
      pageAssignments[p+1].unshift(items.pop());
  }
  console.log(`  ${pageAssignments.length} body pages`);

  // ── Step 4: Build page objects ────────────────────────────────────────────
  const pages = [];
  let curBookHebrew = 'תּוֹרָה וּבְרִיתוֹת', curBookEng = 'Doctrine & Covenants';
  for (const indices of pageAssignments) {
    const pg = { items:[], bookHebrew:'', bookEng:'', startChapter:0, startVerse:'', endChapter:0, endVerse:'' };
    for (const idx of indices) {
      const el = elements[idx];
      pg.items.push(el);
      if (el.type==='book-title') { curBookHebrew=el.hebrew; curBookEng=el.book; }
      if (el.type==='verse' && el.chapter) {
        if (!pg.startChapter) { pg.startChapter=el.chapter; pg.startVerse=el.verse; }
        pg.endChapter=el.chapter; pg.endVerse=el.verse;
      }
      pg.bookHebrew = el.bookHebrew || curBookHebrew;
      pg.bookEng    = el.book || curBookEng;
    }
    pages.push(pg);
  }

  // ── Step 5: CSS + rendering ───────────────────────────────────────────────
  const cssBlock = `@page{size:${PAGE_W/72}in ${PAGE_H/72}in;margin:0;}
${sharedCSS}
.page{width:${PAGE_W}pt;height:${PAGE_H}pt;padding-top:${TOP_M}pt;padding-bottom:${BOT_M}pt;overflow:hidden;page-break-after:always;display:flex;flex-direction:column;}
.page:last-child{page-break-after:auto;}
.header{display:flex;justify-content:space-between;flex-shrink:0;font-size:7.5pt;color:#555;border-bottom:0.5pt solid #999;padding-bottom:2pt;margin-bottom:${HEADER_GAP}pt;height:${HEADER_H}pt;direction:rtl;}
.h-book{font-weight:600;}.h-range{font-weight:400;}
.content{height:${CONTENT_H}pt;flex-shrink:0;column-count:2;column-gap:${COL_GAP}pt;column-fill:auto;column-rule:0.5pt solid #bbb;direction:rtl;overflow:hidden;}
.pn{flex-shrink:0;font-size:7.5pt;color:#555;text-align:center;height:${PAGE_NUM_H}pt;border-top:0.5pt solid #999;padding-top:3pt;}
.fm-page{width:${PAGE_W}pt;height:${PAGE_H}pt;overflow:hidden;page-break-after:always;font-family:'David Libre',serif;direction:rtl;}
.fm-title-page{display:flex;flex-direction:column;justify-content:space-between;height:100%;text-align:center;}
.fm-title-top{padding-top:60pt;}
.fm-title-bottom{padding-bottom:60pt;}
.fm-main-title{font-size:28pt;font-weight:700;margin-bottom:14pt;}
.fm-subtitle{font-size:14pt;color:#444;}
.fm-trans-line{font-size:11pt;margin-bottom:6pt;}
.fm-sec-hdr{font-size:18pt;font-weight:700;text-align:center;margin-bottom:8pt;padding-bottom:5pt;border-bottom:0.75pt solid #999;}
.fm-toc{direction:rtl;}
.fm-toc-line{display:flex;justify-content:space-between;padding:3pt 0;border-bottom:0.5pt dotted #999;}`;

  function wrapHtml(body) {
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}</style><style>${cssBlock}</style></head><body>${body}</body></html>`;
  }

  function renderPageHtml(pg, pageNum) {
    const isOdd = pageNum%2===1;
    const pR = isOdd ? GUTTER : OUTER, pL = isOdd ? OUTER : GUTTER;
    let content = '';
    for (const el of pg.items) {
      if (el.type==='book-title')
        content += `<div class="bt">${el.hebrew}</div><div class="bt-eng">${el.book}</div>`;
      else if (el.type==='chapter-heading')
        content += `<div class="ch">${el.hebrew}</div>`;
      else if (el.type==='verse')
        content += `<div class="v">${renderVerseHtml(el)}</div>`;
    }
    let verseRange='';
    if (pg.startChapter && pg.endChapter) {
      const sc=hebrewNum(pg.startChapter),sv=pg.startVerse||'';
      const ec=hebrewNum(pg.endChapter),  ev=pg.endVerse  ||'';
      verseRange = pg.startChapter===pg.endChapter
        ? (sv===ev ? `${sc}:${sv}` : `${sc}:${sv}–${ev}`)
        : `${sc}:${sv} – ${ec}:${ev}`;
    }
    return `<div class="page" style="padding-right:${pR}pt;padding-left:${pL}pt;">
<div class="header"><span class="h-book">${pg.bookHebrew||''}</span><span class="h-range">${verseRange}</span></div>
<div class="content">${content}</div>
<div class="pn">${pageNum}</div>
</div>`;
  }

  // ── Front matter (title + intro pages) ───────────────────────────────────
  function buildFrontMatter() {
    let html = '', idx = 0;
    function pad() {
      const isOdd = idx%2===0;
      const pR = isOdd?OUTER:GUTTER, pL = isOdd?GUTTER:OUTER;
      idx++;
      return `padding:${TOP_M}pt ${pR}pt ${BOT_M}pt ${pL}pt`;
    }
    html += `<div class="fm-page" style="${pad()}"></div>`;
    html += `<div class="fm-page" style="${pad()}"></div>`;
    html += `<div class="fm-page" style="${pad()}">
      <div class="fm-title-page">
        <div class="fm-title-top">
          <div class="fm-main-title">תּוֹרָה וּבְרִיתוֹת</div>
          <div class="fm-subtitle">Doctrine &amp; Covenants</div>
          <div class="fm-subtitle" style="font-size:11pt;margin-top:10pt;direction:ltr;">Hebrew Interlinear Translation</div>
        </div>
      </div>
    </div>`;
    html += `<div class="fm-page" style="${pad()}"></div>`;
    const count = (html.match(/class="fm-page/g)||[]).length;
    if (count%2!==0) html += `<div class="fm-page" style="${pad()}"></div>`;
    return html;
  }

  // D&C intro as a flowing front-matter page
  function buildDCIntroHtml() {
    let content = `<div class="fm-sec-hdr">מְבוֹא לְתוֹרָה וּבְרִיתוֹת</div>\n`;
    for (const v of dcIntroFiltered)
      content += `<div class="v">${renderVerseHtml(v)}</div>\n`;
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}
@page{size:${PAGE_W/72}in ${PAGE_H/72}in;margin:${TOP_M/72}in ${GUTTER/72}in ${BOT_M/72}in ${GUTTER/72}in;}
${sharedCSS}
body{padding:0;}
.v{text-align:justify;text-align-last:right;margin-bottom:2pt;}
.fm-sec-hdr{font-size:18pt;font-weight:700;text-align:center;margin-bottom:8pt;padding-bottom:5pt;border-bottom:0.75pt solid #999;}
</style></head><body>
${content}
</body></html>`;
  }

  console.log('Step 6: Rendering PDF...');

  async function renderBatch(html, label) {
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
  pdfBuffers.push(await renderBatch(wrapHtml(fmHtml), `Title pages (${fmPageCount})`));

  if (dcIntroFiltered.length > 0) {
    console.log('  Rendering D&C intro...');
    const introPg = await browser.newPage();
    introPg.setDefaultTimeout(300000);
    await introPg.setContent(buildDCIntroHtml(), { waitUntil:'domcontentloaded', timeout:120000 });
    await new Promise(r => setTimeout(r, 8000));
    const introBuf = await introPg.pdf({
      width:`${PAGE_W/72}in`, height:`${PAGE_H/72}in`,
      printBackground:true, preferCSSPageSize:true,
      displayHeaderFooter:false, margin:{top:0,right:0,bottom:0,left:0}
    });
    await introPg.close();
    console.log(`    D&C intro: ${introBuf.length} bytes`);
    pdfBuffers.push(introBuf);
  }

  // RTL alignment: ensure body starts on odd page
  {
    let total = 0;
    for (const b of pdfBuffers) { const d = await PDFDocument.load(b); total += d.getPageCount(); }
    console.log(`  Front matter: ${total} pages`);
    if (total % 2 !== 0) {
      const blank = await PDFDocument.create(); blank.addPage([PAGE_W,PAGE_H]);
      pdfBuffers.push(Buffer.from(await blank.save()));
      console.log('  Inserted blank page');
    } else {
      console.log('  Even — body starts on LEFT page');
    }
  }

  const BATCH = 40;
  const totalBatches = Math.ceil(pages.length/BATCH);
  console.log(`  Rendering ${pages.length} body pages in ${totalBatches} batches...`);
  for (let b=0; b<totalBatches; b++) {
    const start=b*BATCH, end=Math.min(start+BATCH,pages.length);
    let bHtml='';
    for (let i=start; i<end; i++) bHtml += renderPageHtml(pages[i], i+1);
    pdfBuffers.push(await renderBatch(wrapHtml(bHtml), `Batch ${b+1}/${totalBatches} (pages ${start+1}–${end})`));
  }

  console.log('  Merging...');
  const merged = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const src = await PDFDocument.load(buf);
    const copied = await merged.copyPages(src, src.getPageIndices());
    for (const pg of copied) merged.addPage(pg);
  }

  const outPath = 'C:/Users/chris/Desktop/Hebrew_DC_Interlinear_6x9.pdf';
  fs.writeFileSync(outPath, await merged.save());
  const stats = fs.statSync(outPath);
  console.log(`\nPDF: ${outPath}`);
  console.log(`  Pages: ${merged.getPageCount()}`);
  console.log(`  Size:  ${(stats.size/1024/1024).toFixed(1)} MB`);

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
