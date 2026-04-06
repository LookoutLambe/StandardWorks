// Generate KDP cover by overlaying design onto the template PDF
// Template provides correct KDP metadata (MediaBox, BleedBox, TrimBox, crop marks)
// Design is rendered at template dimensions and drawn on top
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Local font files (avoids KDP "fonts not embedded" warning)
const FONTS_PATH = path.join(__dirname, 'fonts').replace(/\\/g, '/');
const fontFaceCSS = `
@font-face { font-family: 'David Libre'; font-weight: 400; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Regular.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 500; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Medium.ttf') format('truetype'); }
@font-face { font-family: 'David Libre'; font-weight: 700; font-style: normal; src: url('file:///${FONTS_PATH}/DavidLibre-Bold.ttf') format('truetype'); }
`;

const TEMPLATE_PATH = 'C:/Users/chris/Desktop/PAPERBACK_8.500x11.000_396_BW_WHITE_RIGHT_TO_LEFT_en_US.pdf';
const OUTPUT_PATH   = 'C:/Users/chris/Desktop/Hebrew_Interlinear_BOM_Cover.pdf';

// ── Color palette ─────────────────────────────────────────────────────────
const NAVY  = '#0f1f3d';
const GOLD  = '#e8c04a';
const WHITE = '#ffffff';       // pure white for readability

async function main() {
  // ── Step 1: Read template to get exact dimensions ──────────────────────
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const templateDoc   = await PDFDocument.load(templateBytes);
  const templatePage  = templateDoc.getPage(0);
  const TW = templatePage.getWidth();   // pt
  const TH = templatePage.getHeight();  // pt
  console.log(`Template: ${(TW/72).toFixed(4)}" × ${(TH/72).toFixed(4)}"`);

  // ── Derive layout from template dimensions ────────────────────────────
  const BLEED   = 0.125 * 72;   //  9 pt
  const COVER_W = 8.5   * 72;   // 612 pt
  const SPINE_W = TW - 2 * BLEED - 2 * COVER_W;   // whatever template has
  const frontX  = BLEED;
  const spineX  = BLEED + COVER_W;
  const backX   = BLEED + COVER_W + SPINE_W;
  console.log(`  Spine: ${(SPINE_W/72).toFixed(4)}"  frontX: ${frontX}pt  backX: ${backX}pt`);

  // ── Step 2: Build cover HTML at template dimensions ───────────────────
  const PAD = BLEED + 36; // inner padding for content panels

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${fontFaceCSS}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: ${TW}pt; height: ${TH}pt;
  position: relative; overflow: hidden;
  font-family: 'David Libre', serif;
  background: ${NAVY};
}

/* ── Gold border frames — must sit inside KDP safe zone (0.375" from outer edge) ── */
.border-outer {
  position: absolute;
  top: 32pt; bottom: 32pt;
  left: 32pt; right: 32pt;
  border: 2pt solid ${GOLD};
  pointer-events: none;
}
.border-inner {
  position: absolute;
  top: 38pt; bottom: 38pt;
  left: 38pt; right: 38pt;
  border: 0.5pt solid ${GOLD};
  pointer-events: none;
}

/* ── Spine ── */
.spine {
  position: absolute;
  left: ${spineX}pt; top: 0;
  width: ${SPINE_W}pt; height: ${TH}pt;
  background: ${NAVY};
  border-left:  0.75pt solid ${GOLD};
  border-right: 0.75pt solid ${GOLD};
  display: flex; align-items: center; justify-content: center;
}
.spine-inner {
  display: flex; flex-direction: column; align-items: center; gap: 5pt;
  transform: rotate(-90deg); white-space: nowrap;
}
.spine-heb {
  font-family: 'David Libre', serif;
  font-size: 15pt; font-weight: 700; color: ${GOLD};
}
.spine-eng {
  font-family: 'David Libre', serif;
  font-size: 10pt; font-weight: 600; color: ${WHITE};
  opacity: 0.85; letter-spacing: 1pt; text-transform: uppercase;
}

/* ── Front cover (LEFT panel for RTL Hebrew book) ── */
.front {
  position: absolute;
  left: ${frontX}pt; top: 0;
  width: ${COVER_W}pt; height: ${TH}pt;
  display: flex; flex-direction: column;
  align-items: center; justify-content: space-between;
  padding: ${PAD}pt ${PAD}pt;
}
.front-title-group {
  display: flex; flex-direction: column; align-items: center; width: 100%;
}
.front-heb {
  font-family: 'David Libre', serif;
  font-size: 52pt; font-weight: 700; color: ${GOLD};
  text-align: center; direction: rtl; line-height: 1.1;
  margin-bottom: 6pt;
}
.gold-rule {
  width: 210pt; height: 1.5pt;
  background: linear-gradient(to right, transparent, ${GOLD}, transparent);
  margin: 7pt auto;
}
.gold-rule-thin {
  width: 150pt; height: 0.5pt;
  background: linear-gradient(to right, transparent, ${GOLD}, transparent);
  margin: 3pt auto;
}
.front-eng-title {
  font-family: 'David Libre', serif;
  font-size: 22pt; font-weight: 600; color: ${WHITE};
  text-align: center; letter-spacing: 1pt; margin-bottom: 4pt;
}
.front-subtitle {
  font-family: 'David Libre', serif;
  font-size: 13pt; color: ${GOLD};
  text-align: center;
}
.front-lang-bar {
  display: flex; align-items: center; justify-content: center;
  gap: 12pt; align-self: center; width: 100%;
}
.lang-text {
  font-family: 'David Libre', serif;
  font-size: 10pt; font-weight: 600; color: ${WHITE};
  opacity: 0.75; letter-spacing: 3pt; text-transform: uppercase;
}
.lang-dot {
  width: 3pt; height: 3pt; border-radius: 50%;
  background: ${GOLD}; opacity: 0.6;
}

/* ── Back cover (RIGHT panel for RTL Hebrew book) ── */
.back {
  position: absolute;
  left: ${backX}pt; top: 0;
  width: ${COVER_W}pt; height: ${TH}pt;
  display: flex; flex-direction: column;
  padding: ${PAD}pt ${PAD}pt;
}
.back-heb-title {
  font-family: 'David Libre', serif;
  font-size: 26pt; font-weight: 700; color: ${GOLD};
  direction: rtl; text-align: center; margin-bottom: 4pt;
}
.back-rule {
  width: 120pt; height: 1pt;
  background: linear-gradient(to right, transparent, ${GOLD}, transparent);
  margin: 6pt auto 14pt;
}
.back-body {
  font-family: 'David Libre', serif;
  font-size: 15pt; line-height: 1.65;
  color: ${WHITE}; text-align: justify; margin-bottom: 14pt;
}
.back-verse-heb {
  font-family: 'David Libre', serif;
  font-size: 18pt; direction: rtl;
  color: ${GOLD}; text-align: right; margin-bottom: 5pt;
}
.back-verse-eng {
  font-family: 'David Libre', serif;
  font-size: 13pt; color: ${WHITE}; opacity: 0.85;
}
.back-spacer { flex: 1; }
/* KDP barcode area — white, min 2"×1.2", pinned bottom-right */
.barcode-box {
  width: 144pt; height: 86.4pt;
  background: #ffffff; margin: 0 0 0 auto;
}
</style>
</head><body>

<!-- Gold border frames -->
<div class="border-outer"></div>
<div class="border-inner"></div>

<!-- ══ SPINE ══ -->
<div class="spine">
  <div class="spine-inner">
    <span class="spine-heb">ספר מורמון</span>
    <span class="spine-eng">Hebrew Book of Mormon · Interlinear</span>
  </div>
</div>

<!-- ══ FRONT COVER ══ -->
<div class="front">
  <div class="front-title-group">
    <div class="gold-rule"></div>
    <div class="gold-rule-thin"></div>
    <div class="front-heb">ספר מורמון</div>
    <div class="gold-rule-thin"></div>
    <div class="gold-rule"></div>
    <div class="front-eng-title">Hebrew Book of Mormon</div>
    <div class="front-subtitle">Interlinear Edition</div>
  </div>

  <div class="front-lang-bar">
    <span class="lang-text">Hebrew</span>
    <div class="lang-dot"></div>
    <span class="lang-text">English</span>
  </div>
</div>

<!-- ══ BACK COVER ══ -->
<div class="back">
  <div class="back-heb-title">ספר מורמון</div>
  <div class="back-rule"></div>

  <div class="back-body">
    The Hebrew Book of Mormon Interlinear presents the complete Nephite record in Biblical Hebrew alongside word-for-word English glosses. Each Hebrew word appears above its English equivalent, allowing readers to study the text in both languages simultaneously.
  </div>

  <div class="back-body">
    This edition covers all fifteen books of the Book of Mormon — from 1&nbsp;Nephi through Moroni — rendered in the tradition of classical Biblical Hebrew. An ideal resource for Hebrew students, Latter-day Saint scholars, and those seeking a deeper engagement with the sacred text.
  </div>

  <div class="back-verse-heb">והיה הדבר אשר יכתב יהיה קדוש</div>
  <div class="back-verse-eng">"And the things which shall be written shall be holy." — 2 Nephi 27:11</div>

  <div class="back-spacer"></div>
  <div class="barcode-box"></div>
</div>

</body></html>`;

  // ── Step 3: Render HTML with Puppeteer ────────────────────────────────
  console.log('Rendering cover HTML...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    protocolTimeout: 120000
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 4000));
  const designBuf = await page.pdf({
    width:  `${TW / 72}in`,
    height: `${TH / 72}in`,
    printBackground: true,
    preferCSSPageSize: false,
    displayHeaderFooter: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();
  console.log(`  Design rendered: ${(designBuf.length / 1024).toFixed(0)} KB`);

  // ── Step 4: Overlay design on template using pdf-lib ─────────────────
  console.log('Overlaying design on template...');
  const designDoc  = await PDFDocument.load(designBuf);
  const [embedded] = await templateDoc.embedPdf(designDoc, [0]);

  // Draw design on top of the template page (template keeps its KDP metadata)
  templatePage.drawPage(embedded, { x: 0, y: 0, width: TW, height: TH });

  const outBytes = await templateDoc.save();
  fs.writeFileSync(OUTPUT_PATH, outBytes);
  console.log(`Cover saved: ${OUTPUT_PATH}  (${(outBytes.length / 1024).toFixed(0)} KB)`);
  console.log(`  Template preserved — KDP metadata intact`);
}

main().catch(console.error);
