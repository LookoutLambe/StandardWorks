// Generate Hebrew-only BOM PDF with cross-references at page bottom
// Layout: 6"x9" KDP, two columns, mirror margins for Hebrew RTL binding
//
// Canonical build: npm run pdf (Chromium / Puppeteer page.pdf). Do not use Vivliostyle on
// this HTML; optional Prince script is commercial and secondary — tighten layout here.
//
// INVARIANT — scripture column vs annotations vs chrome:
// Pass 1 decides what verse text sits in the two-column body (indices → bodyInnerHtml). That body
// is frozen for output: do not reflow it when tuning footnotes, cross-refs, or running headers.
// Footnote HTML, fn-band CSS, and header markup may move or change only as annotations/chrome on
// top of that fixed column. Do not tie header measurement, slack, or peel/budget logic to “fixing
// alignment” of notes or headers — that repacks the body and changes page count/breaks.
// Running header **verse line** (`runningHeaderRh`) and Hebrew page-number glyph (`headerPageNumHebrew`)
// are stored at Pass 1 commit (same strings the probe measured). Recto/verso for margins + header
// span order is `scriptureSpreadSheetOdd(fmPageCount, scriptureOrdinal)` from the **final**
// `buildFrontMatter` page count; each slot is normalized after Pass 1 so Pass 3 matches print.
// Front matter is padded to an **even** page count so the first scripture sheet is an **odd** PDF
// page (mirror margins). Page numerals sit on the **physical outside** of each leaf (English BOM).
// Pass 1 `#paginate-shell` horizontal padding is updated every `recalcContentBudgetFromHeader` to match.
// PDF output: walk up from the repo until a folder named `Desktop` is found (your real Desktop).
//
const puppeteer = require('puppeteer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { buildWebHebrewMap } = require('./load_bom_web_hebrew');

const BASE = path.resolve(__dirname, '..');

/** Loose file on your Desktop (not inside the repo). Filename only — folder from `resolvePdfOutputDir`. */
const PDF_OUTPUT_BASENAME = 'Hebrew BOM Fixed.pdf';

/**
 * Folder for `tab.pdf()`: **the actual Desktop folder that contains this repo** (loose PDFs),
 * e.g. `…\\Desktop\\Hebrew BOM Fixed.pdf` when the project lives under `Desktop\\…`.
 * Walks up from `BASE` until a directory named `Desktop` is found; then OneDrive/classic Desktop.
 * Override: env `HEBREW_PDF_OUTPUT_DIR`.
 */
function resolvePdfOutputDir() {
  if (process.env.HEBREW_PDF_OUTPUT_DIR) {
    const d = path.resolve(process.env.HEBREW_PDF_OUTPUT_DIR);
    fs.mkdirSync(d, { recursive: true });
    return d;
  }
  let cur = path.resolve(BASE);
  for (let depth = 0; depth < 12; depth++) {
    if (path.basename(cur).toLowerCase() === 'desktop') {
      if (fs.existsSync(cur)) return cur;
      break;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  const home = process.env.USERPROFILE || os.homedir();
  const oneDriveDesk = path.join(home, 'OneDrive', 'Desktop');
  const classicDesk = path.join(home, 'Desktop');
  if (fs.existsSync(oneDriveDesk)) return oneDriveDesk;
  if (fs.existsSync(classicDesk)) return classicDesk;
  fs.mkdirSync(classicDesk, { recursive: true });
  return classicDesk;
}

function makeStampedPdfPath(outputDir) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const base = PDF_OUTPUT_BASENAME.replace(/\.pdf$/i, '');
  return path.join(outputDir, `${base} ${stamp}.pdf`);
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Study summaries (Hebrew), same source family as churchofjesuschrist.org study summaries — see Hebrew BOM/chapter_headings_heb.js */
function loadChapterSummariesHeb() {
  const p = path.join(BASE, 'chapter_headings_heb.js');
  if (!fs.existsSync(p)) {
    console.warn('  chapter_headings_heb.js not found — chapter summaries omitted');
    return {};
  }
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(p, 'utf8'), ctx);
  const map = ctx._chapterHeadingsHeb || {};
  console.log(`  Hebrew chapter summaries: ${Object.keys(map).length} entries (chapter_headings_heb.js)`);
  return map;
}
const BOM_VERSES_DIR = path.resolve(BASE, '..', 'bom', 'verses');

// ─── Load data ───────────────────────────────────────────────────────
console.log('Loading data...');
const verses = require(path.join(BASE, 'official_verses.json'));
const crossrefs = require(path.join(BASE, 'crossrefs.json'));
const frontMatter = require(path.join(BASE, 'front_matter.json'));

console.log(`  ${verses.length} verses, ${Object.keys(crossrefs).length} cross-ref entries`);

console.log('Loading Hebrew from BOM web app (bom/verses/*.js)...');
const webHebrewMap = buildWebHebrewMap(BOM_VERSES_DIR);
let webHits = 0;
for (const v of verses) {
  const k = `${v.book}|${v.chapter}|${v.verse}`;
  if (webHebrewMap.has(k)) webHits++;
}
console.log(`  Web Hebrew map: ${webHebrewMap.size} verse keys; matched ${webHits}/${verses.length} official rows`);

const chapterSummariesHeb = loadChapterSummariesHeb();

// ─── Book metadata ───────────────────────────────────────────────────
const BOOKS = [
  { name: '1 Nephi',          hebrew: 'נֶפִי א׳',           chapters: 22 },
  { name: '2 Nephi',          hebrew: 'נֶפִי ב׳',           chapters: 33 },
  { name: 'Jacob',            hebrew: 'יַעֲקֹב',            chapters: 7 },
  { name: 'Enos',             hebrew: 'אֱנוֹשׁ',            chapters: 1 },
  { name: 'Jarom',            hebrew: 'יָרוֹם',             chapters: 1 },
  { name: 'Omni',             hebrew: 'עָמְנִי',            chapters: 1 },
  { name: 'Words of Mormon',  hebrew: 'דִּבְרֵי מוֹרְמוֹן', chapters: 1 },
  { name: 'Mosiah',           hebrew: 'מוֹשִׁיָּה',         chapters: 29 },
  { name: 'Alma',             hebrew: 'אַלְמָא',            chapters: 63 },
  { name: 'Helaman',          hebrew: 'הֵילָמָן',           chapters: 16 },
  { name: '3 Nephi',          hebrew: 'נֶפִי ג׳',           chapters: 30 },
  { name: '4 Nephi',          hebrew: 'נֶפִי ד׳',           chapters: 1 },
  { name: 'Mormon',           hebrew: 'מוֹרְמוֹן',          chapters: 9 },
  { name: 'Ether',            hebrew: 'עֵתֶר',              chapters: 15 },
  { name: 'Moroni',           hebrew: 'מוֹרוֹנִי',          chapters: 10 },
];

/**
 * official_verses.json stores Mormon “English chapter 1” under source chapter 0; crossrefs / bom use 1..9.
 * Loop index `canonicalChapter` is always the printed/LDS chapter number.
 */
function sourceChapterFromCanonical(bookName, canonicalChapter) {
  if (bookName === 'Mormon' && canonicalChapter === 1) return 0;
  return canonicalChapter;
}

// Hebrew numerals (verses + page numbers into the hundreds)
function hebrewNum(n) {
  if (n <= 0) return String(n);
  const ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  let result = '';
  while (n >= 400) { result += 'ת'; n -= 400; }
  while (n >= 300) { result += 'ש'; n -= 300; }
  while (n >= 200) { result += 'ר'; n -= 200; }
  while (n >= 100) { result += 'ק'; n -= 100; }
  if (n === 15) return result + 'טו';
  if (n === 16) return result + 'טז';
  if (n >= 10) { result += tens[Math.floor(n / 10)]; n %= 10; }
  if (n > 0) result += ones[n];
  return result;
}

// ─── Reference translation to Hebrew ────────────────────────────────
const REF_TO_HEBREW = {
  // OT — use \u00A0 (non-breaking space) in multi-word names so they don't split across lines
  'Gen.': 'בראשית', 'Ex.': 'שמות', 'Lev.': 'ויקרא', 'Num.': 'במדבר',
  'Deut.': 'דברים', 'Josh.': 'יהושע', 'Judg.': 'שופטים', 'Ruth': 'רות',
  '1 Sam.': 'שמואל\u00A0א', '2 Sam.': 'שמואל\u00A0ב',
  '1 Kgs.': 'מלכים\u00A0א', '2 Kgs.': 'מלכים\u00A0ב',
  '1 Chr.': 'דבה״י\u00A0א', '2 Chr.': 'דבה״י\u00A0ב',
  'Ezra': 'עזרא', 'Neh.': 'נחמיה', 'Esth.': 'אסתר',
  'Job': 'איוב', 'Ps.': 'תהלים', 'Prov.': 'משלי',
  'Eccl.': 'קהלת', 'Song': 'שיר\u00A0השירים',
  'Isa.': 'ישעיהו', 'Jer.': 'ירמיהו', 'Lam.': 'איכה',
  'Ezek.': 'יחזקאל', 'Dan.': 'דניאל',
  'Hosea': 'הושע', 'Joel': 'יואל', 'Amos': 'עמוס',
  'Obad.': 'עובדיה', 'Jonah': 'יונה', 'Micah': 'מיכה',
  'Nahum': 'נחום', 'Hab.': 'חבקוק', 'Zeph.': 'צפניה',
  'Hag.': 'חגי', 'Zech.': 'זכריה', 'Mal.': 'מלאכי',
  // NT
  'Matt.': 'מתי', 'Mark': 'מרקוס', 'Luke': 'לוקס', 'John': 'יוחנן',
  'Acts': 'מעשי', 'Rom.': 'רומים',
  '1 Cor.': 'קורינתים\u00A0א', '2 Cor.': 'קורינתים\u00A0ב',
  'Gal.': 'גלטים', 'Eph.': 'אפסים', 'Philip.': 'פיליפים', 'Col.': 'קולוסים',
  '1 Thes.': 'תסלוניקים\u00A0א', '2 Thes.': 'תסלוניקים\u00A0ב',
  '1 Tim.': 'טימותיאוס\u00A0א', '2 Tim.': 'טימותיאוס\u00A0ב',
  'Titus': 'טיטוס', 'Philem.': 'פילימון',
  'Heb.': 'עברים', 'James': 'יעקב',
  '1 Pet.': 'פטרוס\u00A0א', '2 Pet.': 'פטרוס\u00A0ב',
  '1 Jn.': 'יוחנן\u00A0א', '2 Jn.': 'יוחנן\u00A0ב', '3 Jn.': 'יוחנן\u00A0ג',
  'Jude': 'יהודה', 'Rev.': 'התגלות',
  // Restoration
  'D&C': 'תו״מ', 'Moses': 'משה', 'Abr.': 'אברהם',
  'JS—H': 'יס״ה', 'JS—M': 'יס״מ', 'A of F': 'א״א',
  // BOM
  '1 Ne.': 'נפי\u00A0א', '2 Ne.': 'נפי\u00A0ב', '3 Ne.': 'נפי\u00A0ג', '4 Ne.': 'נפי\u00A0ד',
  'Jacob': 'יעקב', 'Enos': 'אנוש', 'Jarom': 'ירום', 'Omni': 'עמני',
  'W of M': 'דב״מ', 'Mosiah': 'מושיה', 'Alma': 'אלמא',
  'Hel.': 'הילמן', 'Morm.': 'מורמון', 'Ether': 'עתר', 'Moro.': 'מורוני',
};

const LATIN_MARKER_ORDER = 'abcdefghijkl';
/** Earlier Latin marker wins (a before b) — one superscript + one footnote line per anchor position */
function compareLatinMarker(a, b) {
  return LATIN_MARKER_ORDER.indexOf(a) - LATIN_MARKER_ORDER.indexOf(b);
}

/** Superscript + footer markers: א then ב … by verse reading order (word index), not Church Latin letter */
const FOOTNOTE_MARKERS = [...'אבגדהוזחטיכלמנסעפצקרשת'];
function sequentialFootnoteMarker(i) {
  return i < FOOTNOTE_MARKERS.length ? FOOTNOTE_MARKERS[i] : String(i + 1);
}

// Sort abbreviations longest-first for greedy matching
const REF_ABBRS = Object.keys(REF_TO_HEBREW).sort((a, b) => b.length - a.length);

/**
 * Footnotes: verse references ONLY (church JSON mixes TG, BD, GS, IE, topics, and prose).
 * Whitelist: continuation `ch:vs` or `BookAbbr ch:vs` — nothing else passes.
 */
function isScriptureRefString(r) {
  const s = String(r).trim().replace(/\u00a0/g, ' ');
  if (!s) return false;
  if (/\b(TG|BD|GS|IE|CR)\b/i.test(s)) return false;

  if (/^\d+\s*:\s*\d+/.test(s)) return true;

  for (const abbr of REF_ABBRS) {
    if (!s.startsWith(abbr)) continue;
    const rest = s.slice(abbr.length).trim();
    if (/^\d+\s*:\s*\d+/.test(rest)) return true;
    return false;
  }
  return false;
}

/** Church JSON joins "Scripture; TG …" in one string — split on ';' before filtering */
function expandRefChunks(refsArray) {
  const out = [];
  for (const r of refsArray || []) {
    String(r)
      .split(/\s*;\s*/)
      .map(s => s.trim().replace(/\u00a0/g, ' '))
      .filter(Boolean)
      .forEach(s => out.push(s));
  }
  return out;
}

/** Defense in depth if Latin study-aid tokens leak into joined footnote text */
function stripStudyAidLatin(line) {
  return line
    .split(/\s*;\s*/)
    .map(s => s.trim())
    .filter(s => s && !/\b(TG|BD|GS|IE|CR)\b/i.test(s))
    .join('; ');
}

/** Footnote body in PDF: scripture refs only (no TG/BD prose); split markers preserved in caller. */
function sanitizeFootnoteTextForPdf(t) {
  if (!t) return '';
  return stripStudyAidLatin(String(t).replace(/\[[^\]]*\]/g, '').trim())
    .split(/\s*;\s*/)
    .map(s => s.trim())
    .filter(s => s && !/\b(TG|BD|GS|IE|CR)\b/i.test(s))
    .join('; ');
}

/**
 * Running header (Church English PDF pattern): `BOOK ch:v–v` same chapter; cross-chapter
 * `BOOK ch:v – ch:v` (en dash between refs). Colon after chapter; **both** verses required
 * across a chapter break (never bare `ch:` before the dash).
 */
const RH_VERSE_HYPHEN = '\u2013'; // en dash within same chapter, e.g. א:ט–יט (matches English BOM)
const RH_CROSS_CH_SPAN = '\u00A0\u2013\u00A0'; // e.g. א:כ – ב:ט

/** LTR isolate so `:` and `-` stay between chapter/verse (matches Hebrew_BOM_Scripture PDF; avoids RTL mojibake like א-א-ל). */
function rhRefLtr(s) {
  return '\u2066' + s + '\u2069';
}

/**
 * From page `indices`, derive min/max chapter+verse for running header (order-independent;
 * matches English “1 Ne. 1:20–2:11” semantics).
 */
function applyVerseSpanMetricsForRunningHeader(pg, indices, meta) {
  const tuples = [];
  for (const raw of indices) {
    const idx = itemIndex(raw);
    const m = meta[idx];
    if (m && m.type === 'verse') {
      tuples.push({
        bh: m.bookHebrew || '',
        ch: m.chapter,
        v: m.verse
      });
    }
  }
  if (tuples.length === 0) return;
  const chs = tuples.map(t => t.ch);
  const sc = Math.min(...chs);
  const ec = Math.max(...chs);
  const sv = Math.min(...tuples.filter(t => t.ch === sc).map(t => t.v));
  const ev = Math.max(...tuples.filter(t => t.ch === ec).map(t => t.v));
  pg.startChapter = sc;
  pg.endChapter = ec;
  pg.startVerse = sv;
  pg.endVerse = ev;
  pg.startBookHebrew = tuples[0].bh || pg.startBookHebrew;
  pg.endBookHebrew = tuples[tuples.length - 1].bh || pg.endBookHebrew;
}

function formatRunningHeaderBookChapterVerse(pg) {
  if (pg.titleOnlyHebrew && pg.startChapter == null && !pg.startBookHebrew) return pg.titleOnlyHebrew;

  const sb = pg.startBookHebrew || '';
  const eb = pg.endBookHebrew || '';
  const sc = pg.startChapter;
  const sv = pg.startVerse;
  const ec = pg.endChapter;
  const ev = pg.endVerse;

  const oneBook = !eb || sb === eb;
  const book = sb || eb;

  if (oneBook && sc != null && ec != null && sv != null && ev != null) {
    const chA = hebrewNum(sc);
    const chB = hebrewNum(ec);
    const vA = hebrewNum(sv);
    const vB = hebrewNum(ev);
    if (sc === ec && sv === ev) {
      return `${book}\u00A0${rhRefLtr(`${chA}:${vA}`)}`;
    }
    if (sc === ec) {
      return `${book}\u00A0${rhRefLtr(`${chA}:${vA}${RH_VERSE_HYPHEN}${vB}`)}`;
    }
    return `${book}\u00A0${rhRefLtr(`${chA}:${vA}`)}${RH_CROSS_CH_SPAN}${rhRefLtr(`${chB}:${vB}`)}`;
  }

  if (oneBook && sc != null && ec != null && sv == null && ev == null) {
    if (sc === ec) return `${book}\u00A0${hebrewNum(sc)}`;
    return `${book}\u00A0${hebrewNum(sc)}${RH_CROSS_CH_SPAN}${hebrewNum(ec)}`;
  }

  if (sb && eb && sb !== eb) {
    if (sc != null && ec != null && sv != null && ev != null) {
      return `${sb}\u00A0${rhRefLtr(`${hebrewNum(sc)}:${hebrewNum(sv)}`)}\u00A0–\u00A0${eb}\u00A0${rhRefLtr(`${hebrewNum(ec)}:${hebrewNum(ev)}`)}`;
    }
    return `${sb}\u00A0–\u00A0${eb}`;
  }

  return book || pg.titleOnlyHebrew || '';
}

function translateRef(refStr) {
  let norm = refStr.replace(/\u00a0/g, ' ');

  for (const abbr of REF_ABBRS) {
    if (norm.indexOf(abbr) === 0) {
      const hebBook = REF_TO_HEBREW[abbr];
      let rest = norm.substring(abbr.length).trim();

      const m = rest.match(/^(\d+):(\d+)(.*)$/);
      if (m) {
        const ch = hebrewNum(parseInt(m[1]));
        const vs = hebrewNum(parseInt(m[2]));
        let suffix = m[3] || '';
        suffix = suffix.replace(/\d+/g, n => hebrewNum(parseInt(n)));
        return `${hebBook}\u00A0${ch}:${vs}${suffix}`;
      }

      const cm = rest.match(/^(\d+)(.*)$/);
      if (cm) {
        let rest2 = cm[2] || '';
        rest2 = rest2.replace(/\d+/g, n => hebrewNum(parseInt(n)));
        return `${hebBook}\u00A0${hebrewNum(parseInt(cm[1]))}${rest2}`;
      }

      return hebBook + (rest ? '\u00A0' + rest.replace(/\d+/g, n => hebrewNum(parseInt(n))) : '');
    }
  }
  return refStr.replace(/\d+/g, n => hebrewNum(parseInt(n)));
}

// ─── Build structured data ───────────────────────────────────────────
console.log('Processing verses and cross-references...');

const englishMap = {};
verses.forEach(v => {
  englishMap[`${v.book}|${v.chapter}|${v.verse}`] = v.english;
});

const elements = [];
let totalRefs = 0, keptRefs = 0;

for (const book of BOOKS) {
  elements.push({ type: 'book-title', book: book.name, hebrew: book.hebrew });

  for (let ch = 1; ch <= book.chapters; ch++) {
    const chLabel = `פרק ${hebrewNum(ch)}`;
    const sumRaw = chapterSummariesHeb[`${book.name} ${ch}`] || '';
    /* Split label vs summary so pagination can place them in different columns / pages (fill whitespace). */
    elements.push({
      type: 'chapter-label',
      book: book.name,
      bookHebrew: book.hebrew,
      chapter: ch,
      hebrew: chLabel,
      html: `<div class="ch">${chLabel}</div>`
    });
    if (sumRaw) {
      const sumWords = sumRaw.trim().split(/\s+/).filter(w => w.length > 0);
      elements.push({
        type: 'chapter-summary',
        book: book.name,
        bookHebrew: book.hebrew,
        chapter: ch,
        hebrewWords: sumWords,
        html: `<div class="ch-sum">${escapeHtmlText(sumRaw)}</div>`
      });
    }

    const sourceCh = sourceChapterFromCanonical(book.name, ch);
    const chVerses = verses.filter(v => v.book === book.name && v.chapter === sourceCh);
    chVerses.sort((a, b) => a.verse - b.verse);

    for (const v of chVerses) {
      const key = `${v.book}|${ch}|${v.verse}`;
      const allRefs = crossrefs[key] || [];
      totalRefs += allRefs.length;

      const refs = allRefs.filter(r => r.category === 'cross-ref');
      keptRefs += refs.length;

      const hebrewText = (webHebrewMap.get(key) || v.hebrew).replace(/\u05C3/g, '').trim();
      const hebrewWords = hebrewText.split(/\s+/).filter(w => w.length > 0);
      const englishText = v.english || '';
      const englishWords = englishText.split(/\s+/);

      /** word index -> cross-refs anchored there (merge to one head + one footer block) */
      const positionRefs = {};
      for (const ref of refs) {
        let placed = false;
        let hebIdx = 0;
        const searchText = (ref.text || '').toLowerCase().trim();
        if (!searchText) continue;

        if (englishWords.length > 0 && hebrewWords.length > 0) {
          let engIdx = -1;
          for (let i = 0; i < englishWords.length; i++) {
            const ew = englishWords[i].replace(/[.,;:!?()"']/g, '').toLowerCase();
            if (ew === searchText || ew.includes(searchText) || searchText.includes(ew)) {
              engIdx = i; break;
            }
          }
          if (engIdx >= 0) {
            const ratio = engIdx / Math.max(englishWords.length, 1);
            hebIdx = Math.min(Math.round(ratio * hebrewWords.length), hebrewWords.length - 1);
            placed = true;
          }
        }
        if (!positionRefs[hebIdx]) positionRefs[hebIdx] = [];
        positionRefs[hebIdx].push(ref);
      }

      const footnotes = [];
      const idxToMarker = {};
      const positionKeys = Object.keys(positionRefs).map(Number).sort((a, b) => a - b);
      let seqMk = 0;
      for (const hebIdx of positionKeys) {
        const group = positionRefs[hebIdx];
        const sorted = [...group].sort((x, y) => compareLatinMarker(x.marker, y.marker));
        const pieces = [];
        for (const ref of sorted) {
          const hebrewRefs = expandRefChunks(ref.refs)
            .filter(isScriptureRefString)
            .map(r => translateRef(r))
            .filter(Boolean);
          if (hebrewRefs.length > 0) {
            const merged = stripStudyAidLatin(
              hebrewRefs.join('; ').replace(/\d+/g, n => hebrewNum(parseInt(n)))
            );
            if (merged) pieces.push(merged);
          }
        }
        if (pieces.length === 0) continue;
        const marker = sequentialFootnoteMarker(seqMk++);
        idxToMarker[hebIdx] = marker;
        footnotes.push({
          marker,
          text: stripStudyAidLatin(pieces.join('; ')),
          wordIndex: hebIdx
        });
      }

      const wordMarkers = new Array(hebrewWords.length).fill(null);
      let verseHtml = `<b class="vn">${hebrewNum(v.verse)}</b>\u00A0`;
      for (let i = 0; i < hebrewWords.length; i++) {
        const mk = idxToMarker[i];
        if (mk) {
          verseHtml += `<sup class="xm">${mk}</sup>`;
          wordMarkers[i] = mk;
        }
        verseHtml += hebrewWords[i];
        if (i < hebrewWords.length - 1) verseHtml += ' ';
      }
      verseHtml += ' \u05C3';


      elements.push({
        type: 'verse', book: book.name, bookHebrew: book.hebrew,
        chapter: ch, verse: v.verse, bookChapters: book.chapters,
        html: verseHtml,
        hebrewWords,
        wordMarkers,
        footnotes,
        key
      });
    }
  }
}

console.log(`  ${elements.length} elements, cross-ref rows kept for anchoring: ${keptRefs}/${totalRefs} (footnotes = verse refs only)`);

// ─── Page layout constants (points) ─────────────────────────────────
const PAGE_W = 6 * 72;
const PAGE_H = 9 * 72;
const MARGIN_TOP = 0.5 * 72;
const MARGIN_BOTTOM = 0.45 * 72;
const GUTTER = 0.75 * 72;
const OUTER = 0.5 * 72;
const COL_GAP = 0.2 * 72;

/**
 * Recto/verso for scripture sheets vs **1-based PDF page index** (front matter + scripture ordinal).
 * Front matter is padded to an even count so scripture א is odd. Header is an LTR **grid**; **odd**
 * leaves: `header-odd` + DOM `h-range|h-pn` + `1fr min-content`; even: `header-even` + `h-pn|h-range`.
 * `html` is `dir=rtl` — `.header` uses `direction:ltr!important` + `unicode-bidi:isolate!important`.
 * Mirror margins (`pR`/`pL`) still follow this bit; running title sits toward the gutter.
 * Pass 1 browser evaluate must use the same formula with `layout.fmPageCount`.
 */
function scriptureSpreadSheetOdd(fmPageCount, scriptureOneBasedIndex) {
  return (fmPageCount + scriptureOneBasedIndex) % 2 === 1;
}
/** Compact strip — more room for scripture columns + footnotes. */
const HEADER_H = 12;
const HEADER_GAP = 2;
/** Pagination probe vs Chrome PDF layout — slack below header+body+fn (too small → PDF clips columns). */
const LAYOUT_SAFETY_PT = 17;
/**
 * Shrink the global cap passed into Pass 1 as `contentH_pt` (body + footnote band share this
 * vertical budget in pt). The inner paginator still subtracts **per-page** `fnBandPxForHtml(fnFromItems(…))`
 * from `#test-col` height; this term only reserves extra room so the real PDF footnote stack is
 * less likely to steal space from `.content` (typ. 2–4 pt; tune if clip persists).
 */
const FN_PESSIMISM_PT = 3.5;
/**
 * Padded to raw `#test-fn` height everywhere (Pass 1 + drift check). Must match real PDF band;
 * too small → column budget too tall → clipped verses (drift logs showed 3px measured vs 6px live).
 */
const FN_FINAL_PAD_PX = 6;
/**
 * Added to each **measured** running-header height in Pass 1 so pagination budgets match PDF headers
 * when page-number glyphs / book strings vary (e.g. ד vs א — avoids clipping the column bottom).
 */
const HEADER_MEASURE_PESSIMISM_PT = 3;
/** Inside .content / #test-col-inner: small gap before fn rule (probe matches final). */
const CONTENT_PAD_BOTTOM_PT = 2;
/**
 * Pass 3 only: caps `.content` **max-height** (`contentHeightPt + this`). Pass 1 does not add this
 * to the probe — smaller slack = less empty band inside the body above the fn rule; raise if
 * `HEBREW_PDF_CLIP_CHECK` shows vertical clip.
 *
 * QA: `HEBREW_PDF_CLIP_CHECK`, `HEBREW_PDF_DEBUG_OVERFLOW_VISIBLE=1`.
 */
const SCRIPTURE_CONTENT_SLACK_PT = (72 / 96) * 10;

/**
 * Visual chrome inspired by church English BOM PDF (`Book-of-Mormon-PDF.pdf` — same 6×9 trim).
 * Hebrew body size unchanged; footnote **line-height** / pad tuned with layout constants above.
 */
const REF_RULE_PT = 0.35;
const SCRIPT_BODY_PT = 12;
const SCRIPT_BODY_LH = 1.4;
/** First scripture sheet (header א): denser body line-height in Pass 1 `#test-col` and Pass 3 `.content` so more verse fits (e.g. 1 Nephi 1:11+). */
const SCRIPT_BODY_LH_FIRST_SCRIPTURE_PAGE = 1.35;
const HEADER_FONT_PT = 7.5;
const HEADER_COLOR = '#3a3a3a';
const HEADER_PN_WEIGHT = 500;
const HEADER_RULE_COLOR = '#c5c5c5';
const COLUMN_RULE_COLOR = '#dcdcdc';
const FN_SEPARATOR_COLOR = '#c5c5c5';
/** Footnotes: keep prior Hebrew PDF sizes (English ref does not shrink these). */
const FN_FONT_PT = 7.5;
/** Tighter stack frees vertical room for the body column (pagination + PDF use the same value). */
const FN_LINE_HEIGHT = 1.15;
const FN_AREA_PAD_TOP_PT = 1.5;
const FN_CH_HEAD_PT = 8;
/** Footnote band column count (default 2). Set env `HEBREW_PDF_FN_COLUMNS=3` for three reference columns. */
const FN_COLUMN_COUNT = (() => {
  const n = parseInt(process.env.HEBREW_PDF_FN_COLUMNS || '2', 10);
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : 2;
})();
const SUP_REF_COLOR = '#5c5c5c';

function itemIndex(it) {
  return typeof it === 'number' ? it : it.i;
}

/**
 * Word range [w0, w1) — **w1 exclusive** (half-open). Same convention everywhere:
 * `verseDiv` loops `wi < w1`, `appendFnSlice` keeps `wordIndex < w1`, `fnFromItems` uses this range.
 * Legacy numeric slot `{ i }` means full block [0, n).
 */
function verseWordRange(it, meta) {
  const idx = itemIndex(it);
  const m = meta[idx];
  if (!m || (m.type !== 'verse' && m.type !== 'chapter-summary')) return null;
  const n = (m.words && m.words.length) || 0;
  const w0 = typeof it === 'number' || it.w0 === undefined ? 0 : it.w0;
  const w1 = typeof it === 'number' || it.w1 === undefined ? n : it.w1;
  return [w0, w1];
}

/**
 * Debug one verse’s slices across pages (pagination uses **element index** `i`, not verse number).
 * Env: HEBREW_PDF_DEBUG_SLICE="1 Nephi|1|11" (book|chapter|verse).
 */
function logVerseSliceDebug(label, paginatedPages, elements, elMeta) {
  const parts = String(label)
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length !== 3) {
    console.warn(
      `  HEBREW_PDF_DEBUG_SLICE: expected BookName|chapter|verse (e.g. 1 Nephi|1|11), got: ${label}`
    );
    return;
  }
  const bookName = parts[0];
  const chapter = parseInt(parts[1], 10);
  const verse = parseInt(parts[2], 10);
  if (Number.isNaN(chapter) || Number.isNaN(verse)) {
    console.warn(`  HEBREW_PDF_DEBUG_SLICE: bad chapter/verse in ${label}`);
    return;
  }
  let idx = -1;
  for (let i = 0; i < elements.length; i++) {
    const e = elements[i];
    if (e.type === 'verse' && e.book === bookName && e.chapter === chapter && e.verse === verse) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    console.warn(`  DEBUG_SLICE: no elements[] row for ${bookName} ${chapter}:${verse}`);
    return;
  }
  const n = elements[idx].hebrewWords.length;
  console.log(
    `  DEBUG_SLICE: ${bookName} ${chapter}:${verse} → elements[${idx}] (${n} words); ranges are half-open [w0,w1)`
  );
  const rows = [];
  for (let p = 0; p < paginatedPages.length; p++) {
    const indices = paginatedPages[p].indices || [];
    for (const raw of indices) {
      if (itemIndex(raw) !== idx) continue;
      const rng = verseWordRange(raw, elMeta);
      if (!rng) continue;
      const [w0, w1] = rng;
      rows.push({
        contentPage: p + 1,
        elementIdx: idx,
        w0,
        w1,
        words: w1 - w0
      });
    }
  }
  if (rows.length === 0) {
    console.warn(`  DEBUG_SLICE: verse not present in any page indices`);
    return;
  }
  rows.sort((a, b) => a.w0 - b.w0);
  console.table(rows);
  let expected = 0;
  for (const r of rows) {
    if (r.w0 !== expected) {
      console.warn(`  DEBUG_SLICE: GAP/OVERLAP — expected next slice to start at w0=${expected}, got ${r.w0}`);
    }
    expected = r.w1;
  }
  if (expected !== n) {
    console.warn(`  DEBUG_SLICE: incomplete — covered words [0,${expected}), want [0,${n})`);
  } else {
    console.log(`  DEBUG_SLICE: OK — contiguous coverage of words [0, ${n})`);
  }
}

/**
 * How many scripture `.page` blocks to scan for `.content` scroll vs client (overflow clip).
 * Env `HEBREW_PDF_CLIP_CHECK`: omit or `0`/`off` = skip; number = max pages; `all` = entire BOM.
 */
function clipCheckMaxPagesFromEnv() {
  const v = process.env.HEBREW_PDF_CLIP_CHECK;
  if (v === undefined || v === null || String(v).trim() === '') return 0;
  if (v === '0' || v === 'off' || v === 'false') return 0;
  if (v === '1' || v === 'true') return 25;
  if (v === 'all') return 99999;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Inner footnote line HTML only (no wrappers). */
function fnFootnoteLinesInnerHtml(m, w0, w1) {
  if (!m.footnoteLines || m.footnoteLines.length === 0) return '';
  return m.footnoteLines
    .filter(fl => fl.wordIndex >= w0 && fl.wordIndex < w1)
    .map(fl => fl.html)
    .join('');
}

/** Chapter summary slice — same word-range rules as verses (no markers). */
function summaryHtmlSlice(el, w0, w1) {
  const words = el.hebrewWords;
  let h = '';
  if (w0 === 0) {
    h += '<div class="ch-sum">';
  } else {
    h += '<div class="ch-sum"><span class="ch-sum-cont">';
  }
  for (let wi = w0; wi < w1; wi++) {
    h += escapeHtmlText(words[wi]);
    if (wi < w1 - 1) h += ' ';
  }
  if (w0 > 0) h += '</span>';
  h += '</div>';
  return h;
}

/**
 * Inner HTML for one verse word slice (no wrapping `.v`; continuation omits verse num; sof pasuq only on last slice).
 * Used by `verseHtmlSlice` and `verseHtmlBlocksForSlice`.
 */
function verseSliceInnerHtml(el, w0, w1) {
  const words = el.hebrewWords;
  const markers = el.wordMarkers || [];
  let h = '';
  if (w0 === 0) {
    h += `<b class="vn">${escapeHtmlText(hebrewNum(el.verse))}</b>\u00A0`;
  } else {
    h += '<span class="vc">';
  }
  for (let wi = w0; wi < w1; wi++) {
    const mk = markers[wi];
    if (mk) h += `<sup class="xm">${escapeHtmlText(mk)}</sup>`;
    h += escapeHtmlText(words[wi]);
    if (wi < w1 - 1) h += ' ';
  }
  if (w0 > 0) h += '</span>';
  if (w1 === words.length) h += ' \u05C3';
  return h;
}

/** Same inner HTML as legacy `verseHtmlSlice` name (footnotes / callers). */
function verseHtmlSlice(el, w0, w1) {
  return verseSliceInnerHtml(el, w0, w1);
}

/** One `.v` per slice — word-range only (no full-verse repeat blocks; footnotes still use slice ranges). */
function verseHtmlBlocksForSlice(el, w0, w1) {
  return `<div class="v">${verseSliceInnerHtml(el, w0, w1)}</div>`;
}

/**
 * Rebuild footnote HTML from page slots (must match browser pagination rules exactly).
 * Verse slots may be `{ i, w0, w1 }` word-range slices.
 */
function accumulateFootnoteHtml(indices, meta) {
  let fnAccum = '';
  let pageFnChapter = null;
  let pageFnBook = null;
  for (const raw of indices) {
    const idx = itemIndex(raw);
    const el = meta[idx];
    if (!el || el.type !== 'verse') continue;
    const rng = verseWordRange(raw, meta);
    if (!rng) continue;
    const [w0, w1] = rng;
    const innerLines = fnFootnoteLinesInnerHtml(el, w0, w1);
    if (!innerLines) {
      pageFnChapter = el.chapter;
      pageFnBook = el.book;
      continue;
    }
    let head = '';
    if (pageFnBook !== null && el.book !== pageFnBook) {
      head += `<div class="fn-book">[${el.bookHebrew || el.book}]</div>`;
    }
    if (el.multiChapter && pageFnChapter !== null && el.chapter !== pageFnChapter) {
      head += `<div class="fn-ch">\u05E4\u05E8\u05E7 ${el.chapterHeb}</div>`;
    }
    fnAccum += `<div class="fn-verse-group">${head}${innerLines}</div>`;
    pageFnChapter = el.chapter;
    pageFnBook = el.book;
  }
  return fnAccum;
}

// ─── Build pagination HTML ──────────────────────────────────────────
// Uses the EXACT SAME CSS multi-column layout as the final render.
// overflow:hidden matches final render — body uses 2 cols; footnote band uses `FN_COLUMN_COUNT`.
// See overflows() in Pass 1: scrollWidth + vertical getClientRects (not scrollHeight).
// Footnote area height is MEASURED in a real multi-column `.fn-area` (not estimated).
function buildPaginationHtml() {
  // Store elements WITHOUT wrapper divs — match final render structure exactly
  let storageDivs = '';
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'book-title')
      storageDivs += `<div class="bt" data-i="${i}">${el.hebrew}</div>\n`;
    else if (el.type === 'chapter-label')
      storageDivs += `<div class="ch-wrap ch-part" data-i="${i}">${el.html}</div>\n`;
    else if (el.type === 'chapter-summary')
      storageDivs += `<div class="ch-wrap ch-part" data-i="${i}"></div>\n`;
    else
      storageDivs += `<div class="v" data-i="${i}">${el.html}</div>\n`;
  }

  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'David Libre', 'David', serif; font-size: ${SCRIPT_BODY_PT}pt; line-height: ${SCRIPT_BODY_LH}; direction: rtl; }
#storage { display: none; }
/* Mirror final .page + .header so column height matches PDF (headers wrap; bare-body probe was too tall). */
#paginate-shell {
  width: ${PAGE_W}pt; height: ${PAGE_H}pt;
  padding-top: ${MARGIN_TOP}pt; padding-bottom: ${MARGIN_BOTTOM}pt;
  padding-right: ${GUTTER}pt; padding-left: ${OUTER}pt;
  display: flex; flex-direction: column; overflow: hidden;
}
#paginate-shell .header {
  display: grid !important;
  direction: ltr !important;
  unicode-bidi: isolate !important;
  /* default grid-auto-flow: row — avoid grid-auto-flow:column (stacks both cells in track 1). */
  align-items: baseline;
  column-gap: ${COL_GAP}pt;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  font-size: ${HEADER_FONT_PT}pt; color: ${HEADER_COLOR}; border-bottom: ${REF_RULE_PT}pt solid ${HEADER_RULE_COLOR};
  padding-bottom: 1pt; margin-bottom: ${HEADER_GAP}pt; min-height: ${HEADER_H}pt;
}
#paginate-shell .header-even { grid-template-columns: min-content 1fr; }
#paginate-shell .header-odd { grid-template-columns: 1fr min-content; }
#paginate-shell .header-even .h-pn { justify-self: start; }
#paginate-shell .header-odd .h-pn { justify-self: end; }
#paginate-shell .header .h-range {
  unicode-bidi: isolate !important;
  direction: rtl;
  font-weight: ${HEADER_PN_WEIGHT};
  min-width: 0;
  overflow-wrap: anywhere;
}
/* Verso: range in col 2 — RTL start = physical right = gutter. Recto: range in col 1 — RTL end = physical left = gutter. */
#paginate-shell .header-even .h-range { text-align: start; }
#paginate-shell .header-odd .h-range { text-align: end; }
#paginate-shell .header .h-pn {
  unicode-bidi: isolate !important;
  direction: ltr;
  text-align: center;
  font-weight: ${HEADER_PN_WEIGHT};
  color: ${HEADER_COLOR};
  white-space: nowrap;
}
/* Outer column box height = paginator budget; inner multicol sits at bottom (spacer eats slack) so fn band meets column text. */
#test-col {
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  padding: 0 0 ${CONTENT_PAD_BOTTOM_PT}pt 0;
  margin: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
#test-col-spacer {
  flex: 1 1 auto;
  min-height: 0;
}
#test-col-inner {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  column-count: 2; column-gap: ${COL_GAP}pt; column-fill: auto;
  column-rule: ${REF_RULE_PT}pt solid ${COLUMN_RULE_COLOR};
  font-size: ${SCRIPT_BODY_PT}pt; line-height: ${SCRIPT_BODY_LH};
  text-align: justify;
  direction: rtl;
  unicode-bidi: embed;
  overflow-wrap: anywhere;
  word-wrap: break-word;
  overflow: hidden;
}
#paginate-shell .fn-area {
  flex-shrink: 0;
  width: 100%;
  padding: ${FN_AREA_PAD_TOP_PT}pt 0 0;
  border-top: ${REF_RULE_PT}pt solid ${FN_SEPARATOR_COLOR};
  font-size: ${FN_FONT_PT}pt;
  line-height: ${FN_LINE_HEIGHT};
  direction: rtl;
  column-count: ${FN_COLUMN_COUNT};
  column-gap: ${COL_GAP}pt;
  column-rule: ${REF_RULE_PT}pt solid ${COLUMN_RULE_COLOR};
  column-fill: balance;
}
.bt { text-align:center; font-size:18pt; font-weight:700; padding: 0 0 8pt; column-span: all; }
.ch-wrap {
  margin: 0 0 4pt;
  break-inside: auto;
  -webkit-column-break-inside: auto;
  break-before: auto;
  -webkit-column-break-before: auto;
}
.v + .ch-wrap { margin-top: 5pt; }
.v + .ch-wrap.ch-top { margin-top: 0; }
.ch-wrap.ch-top { margin-top: 0; }
.ch-wrap.ch-part + .ch-wrap.ch-part { margin-top: 2pt; }
.ch {
  text-align: center; font-size: 13pt; font-weight: 700;
  padding: 0 0 2pt;
  margin: 0;
  border-top: none;
  white-space: normal;
}
.ch-sum {
  font-size: 10pt; font-style: italic; font-weight: 400;
  text-align: justify; line-height: 1.35;
  padding: 2pt 2pt 5pt; color: #222;
  overflow-wrap: anywhere;
  break-inside: auto; -webkit-column-break-inside: auto;
  orphans: 2; widows: 2;
}
.ch-sum-cont { font-style: inherit; font-weight: inherit; }
/* Prefer continuous column flow: avoid starting a new column right before each verse when space allows. */
.v {
  display: block;
  margin-bottom: 3pt;
  text-align: justify;
  overflow-wrap: anywhere;
  word-wrap: break-word;
  break-before: avoid-column;
  break-after: auto;
  break-inside: auto;
  -webkit-column-break-before: avoid;
  -webkit-column-break-inside: auto;
}
.bt + .v,
.ch-wrap + .v {
  break-before: auto;
  -webkit-column-break-before: auto;
}
.vc { text-align: justify; }
.vn { font-weight:700; font-size:0.85em; }
.xm { font-size:0.6em; color:${SUP_REF_COLOR}; vertical-align:super; margin:0 1px; }
.fn-book {
  display: block;
  text-align: right;
  font-weight: 700;
  padding: 3pt 0 2pt;
  margin-top: 0.45em;
  margin-bottom: 0.2em;
  font-size: ${FN_FONT_PT}pt;
}
.fn-ch {
  display: block;
  text-align: right;
  font-weight: 700;
  padding: 2pt 0 1pt;
  margin-top: 0.45em;
  margin-bottom: 0.2em;
  font-size: ${FN_CH_HEAD_PT}pt;
}
.fn-verse-group > .fn-book:first-child,
.fn-verse-group > .fn-ch:first-child { margin-top: 0.2em; }
.fn-verse-group > .fn-book + .fn-ch { margin-top: 0.25em; }
.fn-verse-group {
  break-inside: avoid;
  margin-bottom: 3pt;
}
.fn-line { break-inside: avoid; margin-bottom: 1pt; display: flex; gap: 2pt; direction: rtl; }
.fn-v { font-weight: 700; width: 1.4em; text-align: right; flex-shrink: 0; }
.fn-m { font-weight: 700; width: 0.9em; text-align: center; flex-shrink: 0; }
.fn-t { flex: 1; min-width: 0; overflow-wrap: anywhere; }
</style></head><body>
<div id="paginate-shell">
  <div class="header header-odd" dir="ltr" id="paginate-header">
    <span class="h-range">נֶפִי א׳</span>
    <span class="h-pn">א</span>
  </div>
  <div id="test-col"><div id="test-col-spacer" aria-hidden="true"></div><div id="test-col-inner"></div></div>
  <div id="test-fn" class="fn-area"></div>
</div>
<div id="storage">${storageDivs}</div>
</body></html>`;
}

/**
 * Pagination ↔ PDF height pipeline (one source of truth)
 *
 * Pass 1 (browser): Footnotes are **`fnFromItems(pageItems)`** — only verse slices on that page.
 * **`#test-col` height is `(contentH − (raw #test-fn + FN_FINAL_PAD_PX))` px** where `FN_FINAL_PAD_PX` is shared with Pass 1, where `contentH` comes from
 * `bodyFnBudgetPt` (includes **`FN_PESSIMISM_PT`**). **`syncColHeightForPageItems`** uses the same
 * pattern as your footnote pre-pass (measure → pad → set height) **before** `fillColWith` — including
 * page א (book-title‑only → pad-only band).
 *
 * Pass 3: Render `fnHtml` verbatim — never rebuild from `accumulateFootnoteHtml(indices)` for the
 * main path. After pagination, a **global** browser loop re-syncs every page’s `#test-col` height
 * from `fnFromItems` → `#test-fn` measure (same as per-page finalize). **`pg.contentHeightPt`**
 * is `bodyFnBudgetPt − fnHeightPt` (Pass 3 caps `.content` with **`SCRIPTURE_CONTENT_SLACK_PT`** only).
 *
 * Body column: `bodyInnerHtml` is the final `#test-col-inner` HTML after `fillColWith(pageItems)` in
 * the same browser pass (DOM from `verseDiv` / `summaryDiv` / storage clones). Pass 3 injects that
 * string into `.content` so it is not re-sliced in Node (`verseHtmlSlice` / `ch-top` differed from
 * the measured DOM and could reflow / clip). Split verses are **one `.v` per slice** (no repeat blocks).
 *
 * Optional drift check (below): remeasure with same rect+`FN_FINAL_PAD_PX` as Pass 1.
 */
// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const pdfOutputDir = resolvePdfOutputDir();
  const OUTPUT_PDF_PATH = path.join(pdfOutputDir, PDF_OUTPUT_BASENAME);
  console.log(`  Desktop PDF (loose) → ${OUTPUT_PDF_PATH}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    /* Full BOM pagination can exceed 10 min on slow hosts; default CDP timeout was killing Pass 1. */
    protocolTimeout: 2_000_000
  });

  // ── Pass 1: Paginate using IDENTICAL CSS multi-column layout ──
  // Uses the same `.fn-area` column-count as the final render + overflow:hidden (column-fill: auto).
  // Overflow: scrollWidth + vertical fragment rects (not scrollHeight — see evaluate overflows()).
  console.log('Pass 1: Paginating in browser (CSS multi-column + overflow:hidden)...');
  const pagPage = await browser.newPage();
  await pagPage.emulateMediaType('print');
  await pagPage.setViewport({ width: 1200, height: 800 });

  const pagHtml = buildPaginationHtml();
  const pagPath = path.join(__dirname, '_paginate.html');
  fs.writeFileSync(pagPath, pagHtml, 'utf8');
  await pagPage.goto('file:///' + pagPath.replace(/\\/g, '/'), {
    waitUntil: 'networkidle0', timeout: 60000
  });
  await pagPage.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 2000));

  /** Legacy single-number budget (Pass 1 now measures header per scripture page inside evaluate). Used only as fallback if a slot omits `bodyFnBudgetPt`. */
  const measuredHeaderPtFallback = await pagPage.evaluate(() => {
    const el = document.getElementById('paginate-header');
    if (!el) return (16 + 4 + 2) * 72 / 96;
    const mb = parseFloat(getComputedStyle(el).marginBottom) || 0;
    return ((el.offsetHeight || el.getBoundingClientRect().height) + mb) * 72 / 96;
  });
  const bodyFnBudgetPt = Math.max(
    120,
    PAGE_H -
      MARGIN_TOP -
      MARGIN_BOTTOM -
      measuredHeaderPtFallback -
      LAYOUT_SAFETY_PT -
      FN_PESSIMISM_PT -
      HEADER_MEASURE_PESSIMISM_PT
  );
  console.log(
    `  Static header probe (fallback): ${measuredHeaderPtFallback.toFixed(1)}pt; fallback body+fn budget: ${bodyFnBudgetPt.toFixed(1)}pt (per‑page header measured in Pass 1; −${HEADER_MEASURE_PESSIMISM_PT}pt header pessimism)`
  );

  // Build elMeta with actual footnote HTML for measuring
  const elMeta = elements.map((el, i) => {
    const m = { type: el.type, fnCount: 0 };
    if (el.type === 'verse') {
      m.book = el.book;
      m.bookHebrew = el.bookHebrew || '';
      m.chapter = el.chapter;
      m.verse = el.verse;
      m.chapterHeb = hebrewNum(el.chapter);
      m.multiChapter = (el.bookChapters || 1) > 1;
      m.words = el.hebrewWords;
      m.wordMarkers = el.wordMarkers || [];
      m.vn = hebrewNum(el.verse);
      m.footnoteLines = [];
      if (el.footnotes?.length > 0) {
        m.fnCount = el.footnotes.length;
        let j = 0;
        for (const f of el.footnotes) {
          const vn = hebrewNum(el.verse);
          const ft = escapeHtmlText(sanitizeFootnoteTextForPdf(f.text));
          const html = `<div class="fn-line"><span class="fn-v">${j === 0 ? vn : ''}</span><span class="fn-m">${escapeHtmlText(f.marker)}</span><span class="fn-t">${ft}</span></div>`;
          m.footnoteLines.push({ wordIndex: f.wordIndex, html });
          j++;
        }
      }
    }
    if (el.type === 'chapter-summary') {
      m.words = el.hebrewWords;
      m.book = el.book;
      m.bookHebrew = el.bookHebrew || '';
      m.chapter = el.chapter;
      m.chapterHeb = hebrewNum(el.chapter);
      m.wordMarkers = [];
      m.footnoteLines = [];
    }
    if (el.type === 'book-title') {
      m.titleHebrew = el.hebrew;
    }
    if (el.type === 'chapter-label') {
      m.bookHebrew = el.bookHebrew || '';
    }
    return m;
  });

  /** `pa` = scripture `pageAssignments` for TOC; pass `[]` before pagination (same fm page count). */
  function buildFrontMatter(pa) {
    let html = '';
    const pad = `padding: ${MARGIN_TOP}pt ${GUTTER}pt ${MARGIN_BOTTOM}pt ${OUTER}pt`;
    const pageContentH = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;
    const CHARS_PER_LINE = 78;
    const LINE_H = 12 * 1.6;
    const PARA_MARGIN = 6;
    const TITLE_H = 14 + 10 + 6;

    function estParaH(text) {
      const lines = Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
      return lines * LINE_H + PARA_MARGIN;
    }

    function buildSectionPages(header, paragraphs) {
      const sectionPages = [];
      let curPage = [];
      let usedH = TITLE_H;

      for (const p of paragraphs) {
        const pH = estParaH(p);
        if (usedH + pH > pageContentH && curPage.length > 0) {
          sectionPages.push(curPage);
          curPage = [];
          usedH = 0;
        }
        curPage.push(p);
        usedH += pH;
      }
      if (curPage.length > 0) sectionPages.push(curPage);

      let result = '';
      for (let i = 0; i < sectionPages.length; i++) {
        result += `<div class="fm-page" style="${pad}">`;
        if (i === 0) result += `\n  <div class="fm-section-title">${header}</div>`;
        result += `\n  <div class="fm-text">${sectionPages[i].map(p => `<p>${p.trim()}</p>`).join('\n')}</div>`;
        result += `\n</div>`;
      }
      return result;
    }

    html += `<div class="fm-page" style="${pad}"></div>`;
    html += `<div class="fm-page" style="${pad}"></div>`;

    const s0 = frontMatter[0];
    const s1 = frontMatter[1];
    const transLines = s1.full.split('\n').filter(l => l.trim());
    html += `<div class="fm-page" style="${pad}">
      <div class="fm-title-page">
        <div class="fm-title-top">
          <div class="fm-main-title">${s0.header}</div>
          <div class="fm-subtitle">${s0.body}</div>
        </div>
        <div class="fm-title-bottom">
          ${transLines.map(l => `<div class="fm-trans-line">${l.trim()}</div>`).join('\n')}
        </div>
      </div>
    </div>`;

    const s2 = frontMatter[2];
    const introParagraphs = s2.body.split('\n').filter(l => l.trim());
    html += buildSectionPages(s2.header, introParagraphs);

    const s3 = frontMatter[3];
    const titleParas = s3.body.split('\n').filter(l => l.trim());
    html += buildSectionPages(s3.header, titleParas);

    for (let i = 4; i < frontMatter.length; i++) {
      const s = frontMatter[i];
      if (s.header === 'ראשי דברים') {
        html += `<div class="fm-page" style="${pad}">
          <div class="fm-section-title">${s.header}</div>
          <div class="fm-toc">`;

        for (const book of BOOKS) {
          const bookPageIdx = pa.findIndex(indices =>
            indices.some(raw => {
              const idx = itemIndex(raw);
              return elements[idx].type === 'book-title' && elements[idx].book === book.name;
            })
          );
          const pageNum = bookPageIdx >= 0 ? bookPageIdx + 1 : '';
          const hebPageNum = pageNum ? hebrewNum(pageNum) : '';
          html += `<div class="fm-toc-line"><span>${book.hebrew}</span><span>${hebPageNum}</span></div>\n`;
        }

        html += `</div></div>`;
        continue;
      }

      const bodyLines = s.body.split('\n').filter(l => l.trim());
      html += buildSectionPages(s.header, bodyLines);
    }

    html += `<div class="fm-page" style="${pad}"></div>`;
    html += `<div class="fm-page" style="${pad}"></div>`;

    let fc = (html.match(/class="fm-page/g) || []).length;
    /* Even total front-matter pages → first scripture PDF page is **odd** (recto) for mirror margins. */
    while (fc % 2 === 1) {
      html += `<div class="fm-page" style="${pad}"></div>`;
      fc++;
    }
    return html;
  }

  const fmPageCountForPass1 = (buildFrontMatter([]).match(/class="fm-page/g) || []).length;

  const paginatedPages = await pagPage.evaluate(
    (meta, lhDefault, lhFirst, layout) => {
    const ptToPx = 96 / 72;
    const PAGE_H_IN = layout.PAGE_H;
    const MT = layout.MARGIN_TOP;
    const MB = layout.MARGIN_BOTTOM;
    const LAYOUT_SAFETY_PT = layout.LAYOUT_SAFETY_PT;
    const FN_PESS_IN = layout.FN_PESSIMISM_PT;
    const HEADER_PESS_IN = layout.HEADER_MEASURE_PESSIMISM_PT;
    const FN_FINAL_PAD_PX = layout.FN_FINAL_PAD_PX;

    function rhRefLtr(s) {
      return '\u2066' + s + '\u2069';
    }

    function hebrewNumLocal(n) {
      if (n <= 0) return String(n);
      const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
      const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
      let result = '';
      let x = n;
      while (x >= 400) {
        result += 'ת';
        x -= 400;
      }
      while (x >= 300) {
        result += 'ש';
        x -= 300;
      }
      while (x >= 200) {
        result += 'ר';
        x -= 200;
      }
      while (x >= 100) {
        result += 'ק';
        x -= 100;
      }
      if (x === 15) return result + 'טו';
      if (x === 16) return result + 'טז';
      if (x >= 10) {
        result += tens[Math.floor(x / 10)];
        x %= 10;
      }
      if (x > 0) result += ones[x];
      return result;
    }

    function bookHebrewBefore(idx) {
      for (let j = idx; j >= 0; j--) {
        if (meta[j].type === 'book-title') return meta[j].titleHebrew || '';
      }
      return '';
    }

    /**
     * Same output as Node `formatRunningHeaderBookChapterVerse` after `applyVerseSpanMetricsForRunningHeader`:
     * verse span from **all** verse slices on the page (English BOM style), not label/summary scan order.
     */
    function formatRunningHeaderProbe(items, curIdx) {
      const tuples = [];
      for (let qi = 0; qi < items.length; qi++) {
        const idx = items[qi].i;
        const m = meta[idx];
        if (m && m.type === 'verse') {
          tuples.push({
            bh: m.bookHebrew || bookHebrewBefore(idx),
            ch: m.chapter,
            v: m.verse
          });
        }
      }

      if (tuples.length > 0) {
        const chs = tuples.map(function (t) {
          return t.ch;
        });
        const sc = Math.min.apply(null, chs);
        const ec = Math.max.apply(null, chs);
        const inSc = tuples
          .filter(function (t) {
            return t.ch === sc;
          })
          .map(function (t) {
            return t.v;
          });
        const inEc = tuples
          .filter(function (t) {
            return t.ch === ec;
          })
          .map(function (t) {
            return t.v;
          });
        const sv = Math.min.apply(null, inSc);
        const ev = Math.max.apply(null, inEc);
        const sb = tuples[0].bh || bookHebrewBefore(items[0].i);
        const eb = tuples[tuples.length - 1].bh || sb;
        const oneBook = !eb || sb === eb;
        const book = sb || eb;
        if (oneBook && sc !== null && ec !== null && sv !== null && ev !== null) {
          const chA = hebrewNumLocal(sc);
          const chB = hebrewNumLocal(ec);
          const vA = hebrewNumLocal(sv);
          const vB = hebrewNumLocal(ev);
          if (sc === ec && sv === ev) {
            return book + '\u00A0' + rhRefLtr(chA + ':' + vA);
          }
          if (sc === ec) {
            return book + '\u00A0' + rhRefLtr(chA + ':' + vA + '\u2013' + vB);
          }
          return book + '\u00A0' + rhRefLtr(chA + ':' + vA) + '\u00A0\u2013\u00A0' + rhRefLtr(chB + ':' + vB);
        }
        if (sb && eb && sb !== eb) {
          if (sc !== null && ec !== null && sv !== null && ev !== null) {
            return (
              sb +
              '\u00A0' +
              rhRefLtr(hebrewNumLocal(sc) + ':' + hebrewNumLocal(sv)) +
              '\u00A0–\u00A0' +
              eb +
              '\u00A0' +
              rhRefLtr(hebrewNumLocal(ec) + ':' + hebrewNumLocal(ev))
            );
          }
          return sb + '\u00A0–\u00A0' + eb;
        }
        return book || '';
      }

      let titleOnly = '';
      let sb = '';
      let eb = '';
      let sc = null;
      let sv = null;
      let ec = null;
      let ev = null;

      for (let qi = 0; qi < items.length; qi++) {
        const idx = items[qi].i;
        const m = meta[idx];
        if (m.type === 'book-title') titleOnly = m.titleHebrew || '';
        if (m.type === 'chapter-label') {
          const bh = m.bookHebrew || bookHebrewBefore(idx);
          if (!sb) sb = bh;
          eb = bh;
          if (sc === null) sc = m.chapter;
          ec = m.chapter;
        }
        if (m.type === 'chapter-summary') {
          const bh = m.bookHebrew || bookHebrewBefore(idx);
          if (!sb) sb = bh;
          eb = bh;
          if (sc === null) {
            sc = m.chapter;
            sv = null;
          }
          ec = m.chapter;
        }
      }

      if (titleOnly && !sb && !eb) return titleOnly;

      const oneBook = !eb || sb === eb;
      const book = sb || eb;

      if (oneBook && sc !== null && ec !== null && sv === null && ev === null) {
        if (sc === ec) return book + '\u00A0' + hebrewNumLocal(sc);
        return book + '\u00A0' + hebrewNumLocal(sc) + '\u00A0\u2013\u00A0' + hebrewNumLocal(ec);
      }

      if (sb && eb && sb !== eb) {
        return sb + '\u00A0–\u00A0' + eb;
      }

      if (curIdx < meta.length) {
        const m = meta[curIdx];
        if (m.type === 'book-title') return m.titleHebrew || '';
        if (m.type === 'chapter-label' || m.type === 'chapter-summary') {
          const bh = m.bookHebrew || bookHebrewBefore(curIdx);
          return bh + '\u00A0' + hebrewNumLocal(m.chapter);
        }
        if (m.type === 'verse') {
          const bh = m.bookHebrew || bookHebrewBefore(curIdx);
          return bh + '\u00A0' + rhRefLtr(hebrewNumLocal(m.chapter) + ':' + hebrewNumLocal(m.verse));
        }
      }

      return book || titleOnly || '';
    }

    let contentH = 0;
    let currentBodyFnBudgetPt = 0;

    function recalcContentBudgetFromHeader(pageItems, curIdx, completedPagesCount) {
      const scriptureOrdinal = completedPagesCount + 1;
      const globalPageNum = layout.fmPageCount + scriptureOrdinal;
      /* Keep in sync with Node `scriptureSpreadSheetOdd(fmPageCount, scriptureOneBasedIndex)`. */
      const sheetOdd = globalPageNum % 2 === 1;
      const pR = sheetOdd ? layout.GUTTER : layout.OUTER;
      const pL = sheetOdd ? layout.OUTER : layout.GUTTER;
      const shell = document.getElementById('paginate-shell');
      if (shell) {
        shell.style.paddingRight = pR + 'pt';
        shell.style.paddingLeft = pL + 'pt';
      }
      const rh = formatRunningHeaderProbe(pageItems, curIdx);
      const pnGem = hebrewNumLocal(scriptureOrdinal);
      const sheetClass = sheetOdd ? 'header-odd' : 'header-even';
      const hEl = document.getElementById('paginate-header');
      hEl.className = 'header ' + sheetClass;
      hEl.setAttribute('dir', 'ltr');
      /* Odd: range|pn + header-odd; even: pn|range + header-even (physical LTR grid; see Pass 3 CSS). */
      hEl.innerHTML = sheetOdd
        ? '<span class="h-range">' + rh + '</span><span class="h-pn">' + pnGem + '</span>'
        : '<span class="h-pn">' + pnGem + '</span><span class="h-range">' + rh + '</span>';
      const mb = parseFloat(getComputedStyle(hEl).marginBottom) || 0;
      const measuredHeaderPt =
        ((hEl.offsetHeight || hEl.getBoundingClientRect().height) + mb) * 72 / 96;
      const bodyFnBudgetPt = Math.max(
        120,
        PAGE_H_IN -
          MT -
          MB -
          measuredHeaderPt -
          LAYOUT_SAFETY_PT -
          FN_PESS_IN -
          HEADER_PESS_IN
      );
      currentBodyFnBudgetPt = bodyFnBudgetPt;
      contentH = bodyFnBudgetPt * ptToPx;
    }

    const testCol = document.getElementById('test-col');
    const testColInner = document.getElementById('test-col-inner');
    const testFn = document.getElementById('test-fn');
    const storage = document.getElementById('storage');
    const total = meta.length;
    const pages = [];

    // Build O(1) lookup map
    const elMap = {};
    storage.querySelectorAll('[data-i]').forEach(el => {
      elMap[el.getAttribute('data-i')] = el;
    });

    // Overflow for column-fill:auto:
    // - Do NOT use scrollHeight vs clientHeight: with column-count+overflow:hidden Chromium
    //   often reports scrollHeight as the stacked intrinsic height → almost always “overflow”,
    //   so word-range binary search stops after one line (huge whitespace before footnotes).
    // - Extra columns: scrollWidth. Clipping: fragment rects vs column box (vertical only);
    //   skip left/right rect checks — RTL multi-column fragment coords false-trigger often.
    // - Small bottomGuard: PDF can clip slightly below getClientRects; keep minimal.
    function overflows() {
      const tol = 2;
      const widthTol = 3;
      const bottomGuardPx = 6;
      const col = testColInner;
      if (col.scrollWidth > col.clientWidth + widthTol) return true;
      /* Vertical band = overlap of outer shell and inner multicol (inner can extend past flex budget). */
      const o = testCol.getBoundingClientRect();
      const ir = col.getBoundingClientRect();
      const topLimit = Math.max(o.top, ir.top);
      const bottomLimit = Math.min(o.bottom, ir.bottom) - bottomGuardPx;
      const kids = col.children;
      for (let i = 0; i < kids.length; i++) {
        const rects = kids[i].getClientRects();
        /* Skip nodes not yet laid out; treating these as overflow caused endless “doesn’t fit” probes. */
        if (rects.length === 0) continue;
        for (let j = 0; j < rects.length; j++) {
          const r = rects[j];
          if (r.width < 0.5 || r.height < 0.5) continue;
          if (r.bottom > bottomLimit + tol) return true;
          if (r.top < topLimit - tol) return true;
        }
      }
      return false;
    }

    // Raw footnote band height in px (no pad). Empty HTML → 0; with pad, column still shortens on page א.
    function measureFnBandRawPx(fnHtml) {
      if (!fnHtml) return 0;
      testFn.innerHTML = fnHtml;
      return Math.ceil(testFn.getBoundingClientRect().height);
    }
    // Pessimistic band = raw + FN_FINAL_PAD_PX (use everywhere we subtract from contentH).
    function fnBandPxForHtml(fnHtml) {
      return measureFnBandRawPx(fnHtml) + FN_FINAL_PAD_PX;
    }

    function appendFnSlice(baseFn, verseEl, w0, w1, pBook, pCh) {
      let out = baseFn;
      const lines = (verseEl.footnoteLines || []).filter(function (fl) {
        return fl.wordIndex >= w0 && fl.wordIndex < w1;
      });
      if (lines.length === 0) return out;
      let head = '';
      if (pBook !== null && verseEl.book !== pBook) {
        head += '<div class="fn-book">[' + (verseEl.bookHebrew || verseEl.book) + ']</div>';
      }
      if (verseEl.multiChapter && pCh !== null && verseEl.chapter !== pCh) {
        head += '<div class="fn-ch">\u05E4\u05E8\u05E7 ' + verseEl.chapterHeb + '</div>';
      }
      let inner = '';
      for (let li = 0; li < lines.length; li++) inner += lines[li].html;
      out += '<div class="fn-verse-group">' + head + inner + '</div>';
      return out;
    }

    /** Footnote HTML for exactly these body slices — single source of truth (no incremental drift). */
    function fnFromItems(items) {
      let out = '';
      let pCh = null;
      let pB = null;
      for (let xi = 0; xi < items.length; xi++) {
        const pit = items[xi];
        const m = meta[pit.i];
        if (m.type !== 'verse') continue;
        const w0 = pit.w0 !== undefined ? pit.w0 : 0;
        const w1 = pit.w1 !== undefined ? pit.w1 : m.words.length;
        out = appendFnSlice(out, m, w0, w1, pB, pCh);
        pCh = m.chapter;
        pB = m.book;
      }
      return out;
    }

    /** Always shorten #test-col by the footnote band for these items (even page א / empty fn HTML → pad only). */
    function syncColHeightForPageItems(items) {
      const fnHtmlCurrent = fnFromItems(items);
      let fnHeightPx = measureFnBandRawPx(fnHtmlCurrent);
      fnHeightPx += FN_FINAL_PAD_PX;
      testCol.style.height = (contentH - fnHeightPx) + 'px';
    }

    function verseDiv(idx, w0, w1, extraClass) {
      const e = meta[idx];
      const div = document.createElement('div');
      div.className = extraClass ? 'v ' + extraClass : 'v';
      const words = e.words;
      const markers = e.wordMarkers || [];
      let tail = div;
      if (w0 === 0) {
        const b = document.createElement('b');
        b.className = 'vn';
        b.textContent = e.vn;
        div.appendChild(b);
        div.appendChild(document.createTextNode('\u00A0'));
      } else {
        const span = document.createElement('span');
        span.className = 'vc';
        div.appendChild(span);
        tail = span;
      }
      for (let wi = w0; wi < w1; wi++) {
        const mk = markers[wi];
        if (mk) {
          const sup = document.createElement('sup');
          sup.className = 'xm';
          sup.textContent = mk;
          tail.appendChild(sup);
        }
        tail.appendChild(document.createTextNode(words[wi]));
        if (wi < w1 - 1) tail.appendChild(document.createTextNode(' '));
      }
      if (w1 === words.length) tail.appendChild(document.createTextNode(' \u05C3'));
      return div;
    }

    function summaryDiv(idx, w0, w1) {
      const e = meta[idx];
      const wrap = document.createElement('div');
      wrap.className = 'ch-wrap ch-part';
      const inner = document.createElement('div');
      inner.className = 'ch-sum';
      const words = e.words;
      if (w0 > 0) {
        const span = document.createElement('span');
        span.className = 'ch-sum-cont';
        for (let wi = w0; wi < w1; wi++) {
          if (wi > w0) span.appendChild(document.createTextNode(' '));
          span.appendChild(document.createTextNode(words[wi]));
        }
        inner.appendChild(span);
      } else {
        for (let wi = w0; wi < w1; wi++) {
          if (wi > w0) inner.appendChild(document.createTextNode(' '));
          inner.appendChild(document.createTextNode(words[wi]));
        }
      }
      wrap.appendChild(inner);
      return wrap;
    }

    /** One DOM block per word slice (matches Node `verseHtmlBlocksForSlice`; no duplicate full pasuq). */
    function appendVerseBlocksToCol(idx, w0, w1) {
      testColInner.appendChild(verseDiv(idx, w0, w1, null));
    }

    function appendPageItem(pit) {
      const idx = pit.i;
      const m = meta[idx];
      if (m.type === 'book-title' || m.type === 'chapter-label') {
        const s = elMap[idx].cloneNode(true);
        s.removeAttribute('data-i');
        testColInner.appendChild(s);
      } else if (m.type === 'chapter-summary') {
        const w0 = pit.w0 !== undefined ? pit.w0 : 0;
        const w1 = pit.w1 !== undefined ? pit.w1 : m.words.length;
        testColInner.appendChild(summaryDiv(idx, w0, w1));
      } else {
        const w0 = pit.w0 !== undefined ? pit.w0 : 0;
        const w1 = pit.w1 !== undefined ? pit.w1 : m.words.length;
        appendVerseBlocksToCol(idx, w0, w1);
      }
    }

    function fillColWith(items, extra) {
      testColInner.innerHTML = '';
      for (let pi = 0; pi < items.length; pi++) appendPageItem(items[pi]);
      if (extra) appendPageItem(extra);
    }

    let cur = 0;
    let verseStartWord = 0;

    while (cur < total) {
      const pageItems = [];
      let pageFnChapter = null;
      let pageFnBook = null;

      recalcContentBudgetFromHeader(pageItems, cur, pages.length);
      testColInner.style.lineHeight = pages.length === 0 ? String(lhFirst) : String(lhDefault);

      testColInner.innerHTML = '';
      syncColHeightForPageItems(pageItems);

      if (meta[cur].type === 'book-title') {
        const src = elMap[cur];
        testColInner.appendChild(src.cloneNode(true));
        pageItems.push({ i: cur });
        cur++;
        verseStartWord = 0;
        recalcContentBudgetFromHeader(pageItems, cur, pages.length);
        syncColHeightForPageItems(pageItems);
      }

      while (cur < total) {
        const el = meta[cur];
        if (el.type === 'book-title') break;

        if (el.type === 'chapter-label') {
          const projFnH = fnBandPxForHtml(fnFromItems(pageItems));
          testCol.style.height = (contentH - projFnH) + 'px';

          fillColWith(pageItems);
          const chClone = elMap[cur].cloneNode(true);
          chClone.removeAttribute('data-i');
          testColInner.appendChild(chClone);

          if (overflows()) {
            testColInner.removeChild(chClone);
            syncColHeightForPageItems(pageItems);
            break;
          }

          let probeIdx = -1;
          if (cur + 1 < total && meta[cur + 1].type === 'verse') probeIdx = cur + 1;
          else if (cur + 1 < total && meta[cur + 1].type === 'chapter-summary') probeIdx = cur + 1;
          else if (
            cur + 2 < total &&
            meta[cur + 1].type === 'chapter-summary' &&
            meta[cur + 2].type === 'verse'
          )
            probeIdx = cur + 2;

          if (probeIdx >= 0) {
            const nextEl = meta[probeIdx];
            const baseFn = fnFromItems(pageItems);
            let testFnAccum = appendFnSlice(baseFn, nextEl, 0, nextEl.words.length, pageFnBook, pageFnChapter);
            const testFnH = fnBandPxForHtml(testFnAccum);
            testCol.style.height = (contentH - testFnH) + 'px';

            if (nextEl.type === 'chapter-summary') {
              testColInner.appendChild(summaryDiv(probeIdx, 0, nextEl.words.length));
            } else {
              testColInner.appendChild(verseDiv(probeIdx, 0, nextEl.words.length));
            }
            const wouldOverflow = overflows();
            testColInner.removeChild(testColInner.lastChild);

            testCol.style.height = (contentH - projFnH) + 'px';

            if (wouldOverflow) {
              testColInner.removeChild(chClone);
              syncColHeightForPageItems(pageItems);
              break;
            }
          }

          pageItems.push({ i: cur });
          cur++;
          verseStartWord = 0;
          recalcContentBudgetFromHeader(pageItems, cur, pages.length);
          syncColHeightForPageItems(pageItems);
          fillColWith(pageItems);
          continue;
        }

        const n = el.words.length;
        if (n === 0) {
          cur++;
          verseStartWord = 0;
          continue;
        }
        if (verseStartWord >= n) {
          cur++;
          verseStartWord = 0;
          continue;
        }

        // Largest word end `w1` so slice [verseStartWord, w1) fits (binary search). Fills column slack
        // before breaking; `appendVerseBlocksToCol` emits one `.v` per slice only.
        let best = verseStartWord;
        let lo = verseStartWord + 1;
        let hi = n;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const probe = { i: cur, w0: verseStartWord, w1: mid };
          const pFn = fnFromItems(pageItems.concat([probe]));
          const fh = fnBandPxForHtml(pFn);
          testCol.style.height = (contentH - fh) + 'px';
          fillColWith(pageItems, probe);
          if (!overflows()) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }

        if (best === verseStartWord) {
          const fh0 = fnBandPxForHtml(fnFromItems(pageItems));
          testCol.style.height = (contentH - fh0) + 'px';
          fillColWith(pageItems);
          break;
        }

        const w1 = best;
        pageItems.push({ i: cur, w0: verseStartWord, w1 });
        recalcContentBudgetFromHeader(pageItems, cur, pages.length);
        const fhFinal = fnBandPxForHtml(fnFromItems(pageItems));
        testCol.style.height = (contentH - fhFinal) + 'px';
        fillColWith(pageItems);

        pageFnChapter = el.chapter;
        pageFnBook = el.book;
        verseStartWord = w1;
        if (verseStartWord >= n) {
          cur++;
          verseStartWord = 0;
        }
      }

      if (pageItems.length === 0 && cur < total) {
        const em = meta[cur];
        if (
          (em.type === 'verse' || em.type === 'chapter-summary') &&
          em.words &&
          em.words.length > 0
        ) {
          // Last resort: verse/summary taller than one column — still one slice [verseStartWord, n),
          // never the old one-word advance (that re‑introduced mid‑verse splits on empty columns).
          const w1 = em.words.length;
          pageItems.push({ i: cur, w0: verseStartWord, w1 });
          recalcContentBudgetFromHeader(pageItems, cur, pages.length);
          verseStartWord = w1;
          if (verseStartWord >= em.words.length) {
            cur++;
            verseStartWord = 0;
          }
        } else {
          pageItems.push({ i: cur });
          cur++;
          verseStartWord = 0;
          recalcContentBudgetFromHeader(pageItems, cur, pages.length);
        }
      }

      /**
       * Finalize page: double-sync fn ↔ column; if fragments still overflow the column box (probe
       * optimism vs PDF), peel the last body block and rewind `cur` so it starts the next page — e.g.
       * Nephi 3:1 belongs entirely on ה not clipped on ד.
       */
      const MAX_FN_PEEL = 80;
      let peelRound = 0;
      let committed = false;
      while (!committed && peelRound < MAX_FN_PEEL) {
        peelRound++;
        const fnHtmlFinal = fnFromItems(pageItems);
        let fnHeightPx = fnBandPxForHtml(fnHtmlFinal);
        testCol.style.height = (contentH - fnHeightPx) + 'px';
        fillColWith(pageItems);
        fnHeightPx = fnBandPxForHtml(fnHtmlFinal);
        testCol.style.height = (contentH - fnHeightPx) + 'px';
        fillColWith(pageItems);

        const ok = !overflows();
        if (ok || pageItems.length <= 1) {
          const scriptureOrdinal = pages.length + 1;
          const globalPageNum = layout.fmPageCount + scriptureOrdinal;
          const sheetOdd = globalPageNum % 2 === 1;
          pages.push({
            indices: pageItems,
            fnHtml: fnHtmlFinal,
            fnHeightPx: fnHeightPx,
            bodyInnerHtml: testColInner.innerHTML,
            bodyFnBudgetPt: currentBodyFnBudgetPt,
            contentHPx: contentH,
            /** Same strings used while measuring `#paginate-header` — Pass 3 must not re-derive from Node `pg` (can drift from probe). */
            runningHeaderRh: formatRunningHeaderProbe(pageItems, cur),
            headerPageNumHebrew: hebrewNumLocal(scriptureOrdinal),
            headerSheetOdd: sheetOdd
          });
          committed = true;
          break;
        }

        const peeled = pageItems.pop();
        cur = peeled.i;
        verseStartWord = peeled.w0 !== undefined ? peeled.w0 : 0;
        recalcContentBudgetFromHeader(pageItems, cur, pages.length);
      }
      if (!committed) {
        const fnHtmlFinal = fnFromItems(pageItems);
        let fnHeightPx = fnBandPxForHtml(fnHtmlFinal);
        testCol.style.height = (contentH - fnHeightPx) + 'px';
        fillColWith(pageItems);
        fnHeightPx = fnBandPxForHtml(fnHtmlFinal);
        testCol.style.height = (contentH - fnHeightPx) + 'px';
        fillColWith(pageItems);
        const scriptureOrdinal = pages.length + 1;
        const globalPageNum = layout.fmPageCount + scriptureOrdinal;
        const sheetOdd = globalPageNum % 2 === 1;
        pages.push({
          indices: pageItems,
          fnHtml: fnHtmlFinal,
          fnHeightPx: fnHeightPx,
          bodyInnerHtml: testColInner.innerHTML,
          bodyFnBudgetPt: currentBodyFnBudgetPt,
          contentHPx: contentH,
          runningHeaderRh: formatRunningHeaderProbe(pageItems, cur),
          headerPageNumHebrew: hebrewNumLocal(scriptureOrdinal),
          headerSheetOdd: sheetOdd
        });
      }
    }

    /**
     * Global finalize: for **every** page, re-derive `fnHtml` → measure `#test-fn` → set `#test-col`
     * height → `fillColWith` → re-measure fn (same double-sync as end-of-page). Ensures stored
     * `fnHeightPx` / `bodyInnerHtml` match the live footnote band, not a stale probe mid-pagination.
     */
    for (let pi = 0; pi < pages.length; pi++) {
      const slot = pages[pi];
      const pageItems = slot.indices;
      const contentHForPage = slot.contentHPx != null ? slot.contentHPx : contentH;
      const scriptureOrdinal = pi + 1;
      const globalPageNum = layout.fmPageCount + scriptureOrdinal;
      const sheetOdd = globalPageNum % 2 === 1;
      const pR = sheetOdd ? layout.GUTTER : layout.OUTER;
      const pL = sheetOdd ? layout.OUTER : layout.GUTTER;
      const shell = document.getElementById('paginate-shell');
      if (shell) {
        shell.style.paddingRight = pR + 'pt';
        shell.style.paddingLeft = pL + 'pt';
      }
      const fnHtmlFinal = fnFromItems(pageItems);
      let fnHeightPx = fnBandPxForHtml(fnHtmlFinal);
      testCol.style.height = contentHForPage - fnHeightPx + 'px';
      fillColWith(pageItems);
      fnHeightPx = fnBandPxForHtml(fnHtmlFinal);
      testCol.style.height = contentHForPage - fnHeightPx + 'px';
      fillColWith(pageItems);
      slot.fnHtml = fnHtmlFinal;
      slot.fnHeightPx = fnHeightPx;
      slot.bodyInnerHtml = testColInner.innerHTML;
      slot.headerSheetOdd = sheetOdd;
    }

    testFn.innerHTML = '';
    return pages;
  },
    elMeta,
    SCRIPT_BODY_LH,
    SCRIPT_BODY_LH_FIRST_SCRIPTURE_PAGE,
    {
      PAGE_H,
      MARGIN_TOP,
      MARGIN_BOTTOM,
      LAYOUT_SAFETY_PT,
      FN_PESSIMISM_PT,
      HEADER_MEASURE_PESSIMISM_PT,
      FN_FINAL_PAD_PX,
      fmPageCount: fmPageCountForPass1,
      GUTTER,
      OUTER
    }
  );

  const pageAssignments = paginatedPages.map(p => p.indices);

  const fmHtml = buildFrontMatter(pageAssignments);
  const fmPageCount = (fmHtml.match(/class="fm-page/g) || []).length;
  console.log(`  Front matter: ${fmPageCount} pages`);
  if (fmPageCount !== fmPageCountForPass1) {
    console.warn(
      `  WARN: front-matter count Pass 1 (${fmPageCountForPass1}) ≠ final HTML (${fmPageCount}); gutter/header parity was measured with Pass 1 count.`
    );
  }
  for (let i = 0; i < paginatedPages.length; i++) {
    paginatedPages[i].headerSheetOdd = scriptureSpreadSheetOdd(fmPageCount, i + 1);
  }

  // Footnote HTML must stay Pass 1 output: `fnFromItems(pageItems)` only (same slices as the body).
  // Re-measuring from accumulateFootnoteHtml(indices) can differ → wrong fn band height.

  // Keep Pass 1 `fnHeightPx` on each page — it is the footnote height used while binary-searching
  // column fit. Replacing it with a second offsetHeight pass can yield a *larger* number (fonts /
  // subpixels / container timing), which shrinks `.content` below what overflow probes assumed →
  // verses stay in the DOM but are clipped by overflow:hidden (validation still passes).
  for (let i = 0; i < paginatedPages.length; i++) {
    paginatedPages[i].indices = pageAssignments[i] || paginatedPages[i].indices;
  }

  // Pass 1b — sanity only: remeasure each page's authoritative fnHtml in #test-fn (same CSS as
  // Pass 1). If offsetHeight drifts from stored fnHeightPx, layout could clip body text.
  const skipFnDrift =
    process.env.HEBREW_PDF_SKIP_FN_DRIFT === '1' || process.env.CI === 'true';
  if (!skipFnDrift) {
    const fnPayload = paginatedPages.map(p => ({
      fnHtml: p.fnHtml || '',
      fnHeightPx: p.fnHeightPx || 0
    }));
    const drift = await pagPage.evaluate(
      ([pages, padPx]) => {
        const testFn = document.getElementById('test-fn');
        const TOL = 2;
        let maxDiff = 0;
        const bad = [];
        for (let i = 0; i < pages.length; i++) {
          const { fnHtml, fnHeightPx } = pages[i];
          testFn.innerHTML = fnHtml || '';
          const base = Math.ceil(testFn.getBoundingClientRect().height);
          const h = base + padPx;
          const d = Math.abs(h - fnHeightPx);
          if (d > maxDiff) maxDiff = d;
          if (d > TOL) bad.push({ page: i + 1, pass1: fnHeightPx, remeasured: h, diffPx: d });
        }
        testFn.innerHTML = '';
        return { maxDiff, bad };
      },
      [fnPayload, FN_FINAL_PAD_PX]
    );
    if (drift.bad.length > 0) {
      console.warn(
        `  WARN: Pass‑1 footnote height drift on ${drift.bad.length} page(s) (>2px); max diff ${drift.maxDiff}px — body column may clip. First: ${JSON.stringify(drift.bad.slice(0, 3))}`
      );
    } else {
      console.log(`  Pass‑1 fn height vs remeasure: max |Δ| = ${drift.maxDiff}px (≤2px ok)`);
    }
  }

  // DEBUG: Check page 1 to verify overflow detection works
  const debug = await pagPage.evaluate((firstPage, contentH_pt) => {
    const ptToPx = 96 / 72;
    const contentH = contentH_pt * ptToPx;
    const testCol = document.getElementById('test-col');
    const testColInner = document.getElementById('test-col-inner');
    const storage = document.getElementById('storage');

    // Build O(1) lookup for debug
    const debugMap = {};
    storage.querySelectorAll('[data-i]').forEach(el => {
      debugMap[el.getAttribute('data-i')] = el;
    });

    testColInner.innerHTML = '';
    testCol.style.height = contentH + 'px';

    const fpIdx = firstPage.indices || firstPage;
    for (let di = 0; di < fpIdx.length; di++) {
      const pit = fpIdx[di];
      const idx = typeof pit === 'number' ? pit : pit.i;
      const src = debugMap[String(idx)];
      if (src) testColInner.appendChild(src.cloneNode(true));
    }

    const cRect = testColInner.getBoundingClientRect();
    const childInfo = [];
    for (let i = 0; i < Math.min(testColInner.children.length, 30); i++) {
      const rects = testColInner.children[i].getClientRects();
      const r0 = rects[0];
      childInfo.push({
        tag: testColInner.children[i].className,
        text: testColInner.children[i].textContent.substring(0, 20),
        left: r0 ? Math.round(r0.left) : null,
        top: r0 ? Math.round(r0.top) : null,
        bottom: r0 ? Math.round(r0.bottom) : null,
        right: r0 ? Math.round(r0.right) : null
      });
    }

    return {
      container: { left: Math.round(cRect.left), top: Math.round(cRect.top), right: Math.round(cRect.right), bottom: Math.round(cRect.bottom), w: Math.round(cRect.width), h: Math.round(cRect.height) },
      expectedH: Math.round(contentH),
      scrollW: testColInner.scrollWidth, clientW: testColInner.clientWidth,
      scrollH: testColInner.scrollHeight, clientH: testColInner.clientHeight,
      numChildren: testColInner.children.length,
      children: childInfo
    };
  }, paginatedPages[0], bodyFnBudgetPt);

  console.log(`  DEBUG page 1: ${debug.numChildren} children, container h=${debug.container.h} expected=${debug.expectedH}`);
  console.log(`    scrollW=${debug.scrollW} clientW=${debug.clientW} scrollH=${debug.scrollH} clientH=${debug.clientH}`);
  console.log(`    Container: left=${debug.container.left} right=${debug.container.right} top=${debug.container.top} bottom=${debug.container.bottom}`);
  if (debug.children.length > 0) {
    const first = debug.children[0];
    const last = debug.children[debug.children.length - 1];
    console.log(`    First child: ${first.tag} "${first.text}" top=${first.top} bottom=${first.bottom} left=${first.left} right=${first.right}`);
    console.log(`    Last child: ${last.tag} "${last.text}" top=${last.top} bottom=${last.bottom} left=${last.left} right=${last.right}`);
  }

  await pagPage.close();
  try {
    fs.unlinkSync(pagPath);
  } catch (e) {}

  console.log(`  ${pageAssignments.length} pages`);

  const MAX_SANE_CONTENT_PAGES = 6000;
  if (pageAssignments.length > MAX_SANE_CONTENT_PAGES) {
    console.error(
      `  FATAL: Page count ${pageAssignments.length} is implausible (expected ~1–2k). Check overflows() / CSS vs pagination probe.`
    );
    await browser.close();
    process.exit(1);
  }

  const verseCoverage = new Map();
  for (const slot of paginatedPages) {
    for (const raw of slot.indices) {
      const idx = itemIndex(raw);
      if (elements[idx]?.type !== 'verse') continue;
      const rng = verseWordRange(raw, elMeta);
      if (!rng) continue;
      const [w0, w1] = rng;
      if (!verseCoverage.has(idx)) verseCoverage.set(idx, []);
      verseCoverage.get(idx).push([w0, w1]);
    }
  }

  let verseOk = true;
  const verseElementCount = elements.filter(e => e.type === 'verse').length;
  if (verseCoverage.size !== verseElementCount) {
    verseOk = false;
    console.error(`  VALIDATION FAILED: verses with slots=${verseCoverage.size}, verse elements=${verseElementCount}`);
  }
  for (const [idx, ranges] of verseCoverage) {
    const el = elements[idx];
    const n = el.hebrewWords.length;
    ranges.sort((a, b) => a[0] - b[0]);
    let expected = 0;
    for (const ab of ranges) {
      const a = ab[0];
      const b = ab[1];
      if (a !== expected) {
        verseOk = false;
        console.error(
          `  VALIDATION FAILED: verse ${el.book} ${el.chapter}:${el.verse} word gap/overlap (want start ${expected}, got ${a})`
        );
      }
      expected = b;
    }
    if (expected !== n) {
      verseOk = false;
      console.error(
        `  VALIDATION FAILED: verse ${el.book} ${el.chapter}:${el.verse} incomplete words (${expected}/${n})`
      );
    }
  }
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type !== 'verse') continue;
    if (!verseCoverage.has(i)) {
      verseOk = false;
      const el = elements[i];
      console.error(
        `  VALIDATION FAILED: verse never assigned: ${el.book} ${el.chapter}:${el.verse} (element ${i})`
      );
    }
  }
  if (verseOk) {
    console.log(`  Validated: all ${verses.length} verses covered by word slices (${verseCoverage.size} verse blocks)`);
  }

  if (process.env.HEBREW_PDF_DEBUG_SLICE) {
    logVerseSliceDebug(process.env.HEBREW_PDF_DEBUG_SLICE.trim(), paginatedPages, elements, elMeta);
  }

  const summaryCoverage = new Map();
  for (const slot of paginatedPages) {
    for (const raw of slot.indices) {
      const idx = itemIndex(raw);
      if (elements[idx]?.type !== 'chapter-summary') continue;
      const rng = verseWordRange(raw, elMeta);
      if (!rng) continue;
      const [w0, w1] = rng;
      if (!summaryCoverage.has(idx)) summaryCoverage.set(idx, []);
      summaryCoverage.get(idx).push([w0, w1]);
    }
  }
  let summaryOk = true;
  const summaryElementCount = elements.filter(e => e.type === 'chapter-summary').length;
  if (summaryCoverage.size !== summaryElementCount) {
    summaryOk = false;
    console.error(
      `  VALIDATION FAILED: chapter-summary slots=${summaryCoverage.size}, summary elements=${summaryElementCount}`
    );
  }
  for (const [idx, ranges] of summaryCoverage) {
    const el = elements[idx];
    const n = el.hebrewWords.length;
    ranges.sort((a, b) => a[0] - b[0]);
    let expected = 0;
    for (const ab of ranges) {
      const a = ab[0];
      const b = ab[1];
      if (a !== expected) {
        summaryOk = false;
        console.error(
          `  VALIDATION FAILED: chapter-summary ${el.book} ch.${el.chapter} word gap/overlap (want start ${expected}, got ${a})`
        );
      }
      expected = b;
    }
    if (expected !== n) {
      summaryOk = false;
      console.error(
        `  VALIDATION FAILED: chapter-summary ${el.book} ch.${el.chapter} incomplete words (${expected}/${n})`
      );
    }
  }
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type !== 'chapter-summary') continue;
    if (!summaryCoverage.has(i)) {
      summaryOk = false;
      const el = elements[i];
      console.error(`  VALIDATION FAILED: chapter-summary never assigned: ${el.book} ch.${el.chapter}`);
    }
  }
  if (summaryOk && summaryElementCount > 0) {
    console.log(`  Validated: all ${summaryElementCount} chapter summaries covered by word slices`);
  }

  // ── Build page objects (`slot.fnHeightPx` / bodyInnerHtml from Pass 1 global fn sync) ──
  const pages = [];
  let curBookHebrew = '';
  const BT_H_PT = 18 + 8;

  for (const slot of paginatedPages) {
    const indices = slot.indices;
    const rawFnPt = (slot.fnHeightPx || 0) * 72 / 96;
    const budgetPt =
      slot.bodyFnBudgetPt != null && slot.bodyFnBudgetPt > 0
        ? slot.bodyFnBudgetPt
        : bodyFnBudgetPt;
    const contentHeightPt = Math.max(0, budgetPt - rawFnPt);

    const pg = {
      items: [],
      bodyInnerHtml: slot.bodyInnerHtml || '',
      fnHtml: slot.fnHtml || '',
      fnHeightPt: rawFnPt,
      contentHeightPt,
      btHeight: 0,
      titleOnlyHebrew: '',
      startChapter: null,
      startVerse: null,
      endChapter: null,
      endVerse: null,
      startBookHebrew: '',
      endBookHebrew: '',
      /** Frozen at Pass 1 commit (browser probe); keeps header + gutter parity aligned with pagination. */
      runningHeaderRh: slot.runningHeaderRh,
      headerPageNumHebrew: slot.headerPageNumHebrew,
      headerSheetOdd: slot.headerSheetOdd
    };

    for (const raw of indices) {
      const idx = itemIndex(raw);
      const el = elements[idx];
      const rng = verseWordRange(raw, elMeta);
      if ((el.type === 'verse' || el.type === 'chapter-summary') && rng) {
        const [w0, w1] = rng;
        pg.items.push({ element: el, w0, w1, spanAll: false });
      } else {
        pg.items.push({ element: el, spanAll: el.type === 'book-title' });
      }

      if (el.type === 'book-title') {
        curBookHebrew = el.hebrew;
        pg.titleOnlyHebrew = el.hebrew;
        pg.btHeight = BT_H_PT;
      }
      if (el.type === 'chapter-label') {
        const bh = el.bookHebrew || curBookHebrew;
        if (bh) {
          if (!pg.startBookHebrew) pg.startBookHebrew = bh;
          pg.endBookHebrew = bh;
        }
        if (pg.startChapter === null) {
          pg.startChapter = el.chapter;
          pg.startVerse = null;
        }
        pg.endChapter = el.chapter;
      }
      if (el.type === 'chapter-summary') {
        const bh = el.bookHebrew || curBookHebrew;
        if (bh) {
          if (!pg.startBookHebrew) pg.startBookHebrew = bh;
          pg.endBookHebrew = bh;
        }
        if (pg.startChapter === null) {
          pg.startChapter = el.chapter;
          pg.startVerse = null;
        }
        pg.endChapter = el.chapter;
      }
      if (el.type === 'verse') {
        if (!pg.startBookHebrew) pg.startBookHebrew = el.bookHebrew || curBookHebrew;
        if (pg.startChapter === null) {
          pg.startChapter = el.chapter;
          pg.startVerse = el.verse;
        } else if (pg.startVerse === null) {
          pg.startVerse = el.verse;
        }
        pg.endChapter = el.chapter;
        pg.endVerse = el.verse;
        pg.endBookHebrew = el.bookHebrew || curBookHebrew;
      }
    }

    applyVerseSpanMetricsForRunningHeader(pg, indices, elMeta);
    const rhFinal = formatRunningHeaderBookChapterVerse(pg);
    slot.runningHeaderRh = rhFinal;
    pg.runningHeaderRh = rhFinal;

    pages.push(pg);
  }

  console.log(`  Built ${pages.length} page objects`);

  // ── Pass 3: Generate HTML ──
  console.log('Pass 3: Generating final HTML...');

  /** Running header: book + chapter + verse span for verses on this page. */
  function formatRunningHeaderText(pg) {
    return formatRunningHeaderBookChapterVerse(pg);
  }

  const debugRender =
    process.env.HEBREW_PDF_DEBUG_RENDER === '1' || process.env.HEBREW_PDF_DEBUG_RENDER_PAGE;
  const debugRenderPageSpec = process.env.HEBREW_PDF_DEBUG_RENDER_PAGE;

  function renderPage(pg, scripturePageNum, fmPgCount) {
    /* Recto/verso vs PDF index — NOT `scripturePageNum % 2` (front matter shifts parity). */
    const sheetOdd =
      typeof pg.headerSheetOdd === 'boolean'
        ? pg.headerSheetOdd
        : scriptureSpreadSheetOdd(fmPgCount, scripturePageNum);
    const pR = sheetOdd ? GUTTER : OUTER;
    const pL = sheetOdd ? OUTER : GUTTER;

    if (debugRender) {
      const matchPage =
        !debugRenderPageSpec ||
        String(debugRenderPageSpec) === String(scripturePageNum) ||
        String(debugRenderPageSpec) === 'all';
      if (matchPage) {
        const bl = (pg.bodyInnerHtml && pg.bodyInnerHtml.length) || 0;
        console.log(
          `  RENDER scripturePage ${scripturePageNum}/${pages.length} hasBodyHtml: ${!!pg.bodyInnerHtml} bodyLen: ${bl} items: ${(pg.items && pg.items.length) || 0}`
        );
      }
    }
    if (!pg.bodyInnerHtml && pg.items && pg.items.length > 0) {
      console.warn(
        `  RENDER WARNING: scripture page ${scripturePageNum} has empty bodyInnerHtml — using Node verseHtmlSlice fallback (${pg.items.length} items)`
      );
    }

    let contentHtml = '';
    if (pg.bodyInnerHtml) {
      contentHtml = pg.bodyInnerHtml;
    } else {
      for (let ii = 0; ii < pg.items.length; ii++) {
        const item = pg.items[ii];
        const el = item.element;
        if (el.type === 'book-title') contentHtml += `<div class="bt">${el.hebrew}</div>`;
        else if (el.type === 'chapter-label') {
          const chTop =
            ii === 0 || (ii === 1 && pg.items[0].element.type === 'book-title');
          const wrapCls = chTop ? 'ch-wrap ch-part ch-top' : 'ch-wrap ch-part';
          contentHtml += `<div class="${wrapCls}">${el.html}</div>`;
        } else if (el.type === 'chapter-summary') {
          const chTop =
            ii === 0 || (ii === 1 && pg.items[0].element.type === 'book-title');
          const wrapCls = chTop ? 'ch-wrap ch-part ch-top' : 'ch-wrap ch-part';
          const w0 = item.w0 !== undefined ? item.w0 : 0;
          const w1 = item.w1 !== undefined ? item.w1 : el.hebrewWords.length;
          contentHtml += `<div class="${wrapCls}">${summaryHtmlSlice(el, w0, w1)}</div>`;
        } else {
          const w0 = item.w0 !== undefined ? item.w0 : 0;
          const w1 = item.w1 !== undefined ? item.w1 : el.hebrewWords.length;
          contentHtml += verseHtmlBlocksForSlice(el, w0, w1);
        }
      }
    }

    const runningHeader =
      pg.runningHeaderRh != null ? String(pg.runningHeaderRh) : formatRunningHeaderText(pg);
    const pnGem =
      pg.headerPageNumHebrew != null ? String(pg.headerPageNumHebrew) : hebrewNum(scripturePageNum);
    const headerParityClass = sheetOdd ? 'header-odd' : 'header-even';
    const escPn = escapeHtmlText(pnGem);
    const escRh = escapeHtmlText(runningHeader);
    const headerInner = sheetOdd
      ? `<span class="h-range">${escRh}</span><span class="h-pn">${escPn}</span>`
      : `<span class="h-pn">${escPn}</span><span class="h-range">${escRh}</span>`;

    const fnBlock = pg.fnHtml ? `<div class="fn-area">${pg.fnHtml}</div>` : '';

    const isFirstScripturePage = scripturePageNum === 1;
    const contentHpt = pg.contentHeightPt + SCRIPTURE_CONTENT_SLACK_PT;
    const bodyLineHeight = isFirstScripturePage ? SCRIPT_BODY_LH_FIRST_SCRIPTURE_PAGE : SCRIPT_BODY_LH;

    return `<div class="page" style="padding-right:${pR}pt;padding-left:${pL}pt;">
  <div class="header ${headerParityClass}" dir="ltr">${headerInner}</div>
  <div class="page-body">
  <div class="scripture-stack">
    <div class="scripture-spacer" aria-hidden="true"></div>
    <div class="content scripture-body" style="max-height:${contentHpt}pt;min-height:0;line-height:${bodyLineHeight};">${contentHtml}</div>
  </div>
  ${fnBlock}
  </div>
</div>`;
  }

  let pagesHtml = '';
  for (let i = 0; i < pages.length; i++) pagesHtml += renderPage(pages[i], i + 1, fmPageCount);

  const overflowVisibleDebug = process.env.HEBREW_PDF_DEBUG_OVERFLOW_VISIBLE === '1';

  const finalHtml = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&display=swap" rel="stylesheet">
<style>
@page { size: 6in 9in; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'David Libre', 'David', serif; background: white; }
.page {
  width: ${PAGE_W}pt; height: ${PAGE_H}pt;
  padding-top: ${MARGIN_TOP}pt; padding-bottom: ${MARGIN_BOTTOM}pt;
  overflow: hidden; page-break-after: always;
  display: flex; flex-direction: column;
}
.page:last-child { page-break-after: auto; }
.page-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 0;
  width: 100%;
}
/* Spacer eats slack above scripture columns so the footnote band meets the column text (RTL first column on the right). */
.page-body > .scripture-stack {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}
.page-body > .scripture-stack > .scripture-spacer {
  flex: 1 1 auto;
  min-height: 0;
}
.page-body > .scripture-stack > .scripture-body {
  flex: 0 0 auto;
  width: 100%;
  height: fit-content;
}
.page-body > .fn-area {
  margin-top: auto;
  flex-shrink: 0;
}
.header {
  display: grid !important;
  direction: ltr !important;
  unicode-bidi: isolate !important;
  align-items: baseline;
  column-gap: ${COL_GAP}pt;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  font-size: ${HEADER_FONT_PT}pt; color: ${HEADER_COLOR}; border-bottom: ${REF_RULE_PT}pt solid ${HEADER_RULE_COLOR};
  padding-bottom: 1pt; margin-bottom: ${HEADER_GAP}pt; min-height: ${HEADER_H}pt;
}
.header-even { grid-template-columns: min-content 1fr; }
.header-odd { grid-template-columns: 1fr min-content; }
.header-even .h-pn { justify-self: start; }
.header-odd .h-pn { justify-self: end; }
.header .h-range {
  unicode-bidi: isolate !important;
  direction: rtl;
  font-weight: ${HEADER_PN_WEIGHT};
  min-width: 0;
  overflow-wrap: anywhere;
}
.header-even .h-range { text-align: start; }
.header-odd .h-range { text-align: end; }
.header .h-pn {
  unicode-bidi: isolate !important;
  direction: ltr;
  text-align: center;
  font-weight: ${HEADER_PN_WEIGHT};
  color: ${HEADER_COLOR};
  white-space: nowrap;
}
.content {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 0 ${CONTENT_PAD_BOTTOM_PT}pt 0;
  margin: 0;
  border: 0;
  column-count: 2; column-gap: ${COL_GAP}pt; column-fill: auto;
  column-rule: ${REF_RULE_PT}pt solid ${COLUMN_RULE_COLOR};
  font-size: ${SCRIPT_BODY_PT}pt; line-height: ${SCRIPT_BODY_LH};
  text-align: justify;
  direction: rtl;
  unicode-bidi: embed;
  overflow-wrap: anywhere;
  word-wrap: break-word;
  overflow: ${overflowVisibleDebug ? 'visible' : 'hidden'};
}
.v {
  display: block;
  margin-bottom: 3pt;
  overflow-wrap: anywhere;
  word-wrap: break-word;
  break-before: avoid-column;
  break-after: auto;
  break-inside: auto;
  -webkit-column-break-before: avoid;
  -webkit-column-break-inside: auto;
}
.bt + .v,
.ch-wrap + .v {
  break-before: auto;
  -webkit-column-break-before: auto;
}
.vc { text-align: justify; }
.vn { font-weight: 700; font-size: 0.85em; }
.xm { font-size: 0.6em; color: ${SUP_REF_COLOR}; vertical-align: super; margin: 0 1px; }
.bt { text-align: center; font-size: 18pt; font-weight: 700; padding: 0 0 8pt; margin: 0; column-span: all; }
.ch-wrap {
  margin: 0 0 4pt;
  break-inside: auto;
  -webkit-column-break-inside: auto;
  break-before: auto;
  -webkit-column-break-before: auto;
}
.v + .ch-wrap { margin-top: 5pt; }
.v + .ch-wrap.ch-top { margin-top: 0; }
.ch-wrap.ch-top { margin-top: 0; }
.ch-wrap.ch-part + .ch-wrap.ch-part { margin-top: 2pt; }
.ch {
  text-align: center; font-size: 13pt; font-weight: 700;
  padding: 0 0 2pt;
  margin: 0;
  border-top: none;
  white-space: normal;
}
.ch-sum {
  font-size: 10pt; font-style: italic; font-weight: 400;
  text-align: justify; line-height: 1.35;
  padding: 2pt 2pt 5pt; color: #222;
  overflow-wrap: anywhere;
  break-inside: auto; -webkit-column-break-inside: auto;
  orphans: 2; widows: 2;
}
.ch-sum-cont { font-style: inherit; font-weight: inherit; }
.fn-area {
  flex-shrink: 0;
  width: 100%;
  padding: ${FN_AREA_PAD_TOP_PT}pt 0 0;
  border-top: ${REF_RULE_PT}pt solid ${FN_SEPARATOR_COLOR};
  font-size: ${FN_FONT_PT}pt;
  line-height: ${FN_LINE_HEIGHT};
  direction: rtl;
  column-count: ${FN_COLUMN_COUNT};
  column-gap: ${COL_GAP}pt;
  column-rule: ${REF_RULE_PT}pt solid ${COLUMN_RULE_COLOR};
  column-fill: balance;
}
.fn-book {
  display: block;
  text-align: right;
  font-weight: 700;
  padding: 3pt 0 2pt;
  margin-top: 0.45em;
  margin-bottom: 0.2em;
  font-size: ${FN_FONT_PT}pt;
}
.fn-ch {
  display: block;
  text-align: right;
  font-weight: 700;
  padding: 2pt 0 1pt;
  margin-top: 0.45em;
  margin-bottom: 0.2em;
  font-size: ${FN_CH_HEAD_PT}pt;
}
.fn-verse-group > .fn-book:first-child,
.fn-verse-group > .fn-ch:first-child { margin-top: 0.2em; }
.fn-verse-group > .fn-book + .fn-ch { margin-top: 0.25em; }
.fn-verse-group {
  break-inside: avoid;
  margin-bottom: 3pt;
}
.fn-line { break-inside: avoid; margin-bottom: 1pt; display: flex; gap: 2pt; direction: rtl; }
.fn-v { font-weight: 700; width: 1.4em; text-align: right; flex-shrink: 0; }
.fn-m { font-weight: 700; width: 0.9em; text-align: center; flex-shrink: 0; }
.fn-t { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.fm-page {
  width: ${PAGE_W}pt; height: ${PAGE_H}pt;
  position: relative; overflow: hidden; page-break-after: always;
  font-family: 'David Libre', 'David', serif; font-size: 12pt; line-height: 1.6;
  direction: rtl; text-align: justify;
}
.fm-center {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; text-align: center;
}
.fm-title-page {
  display: flex; flex-direction: column; justify-content: space-between;
  height: 100%; text-align: center;
}
.fm-title-top { padding-top: 48pt; }
.fm-title-bottom { padding-bottom: 48pt; }
.fm-main-title { font-size: 28pt; font-weight: 700; margin-bottom: 16pt; }
.fm-subtitle { font-size: 16pt; color: #333; }
.fm-trans-line { font-size: 14pt; margin-bottom: 8pt; }
.fm-section-title {
  font-size: 16pt; font-weight: 700; text-align: center;
  margin-bottom: 12pt; column-span: all;
}
.fm-text p { margin-bottom: 8pt; text-indent: 0; }
.fm-title-text { text-align: center; margin-top: 16pt; }
.fm-title-text p { margin-bottom: 6pt; text-indent: 0; text-align: center; }
.fm-toc { direction: rtl; }
.fm-toc-line { display: flex; justify-content: space-between; padding: 4pt 0; border-bottom: 0.5pt dotted #999; }
</style></head><body>
${fmHtml}
${pagesHtml}
</body></html>`;

  const htmlPath = path.join(__dirname, '_hebrew_bom_pages.html');
  fs.writeFileSync(htmlPath, finalHtml, 'utf8');
  console.log(`  HTML: ${(finalHtml.length / 1024 / 1024).toFixed(1)} MB`);

  const skipChromePdf =
    process.env.SKIP_CHROME_PDF === '1' || process.env.VIVLIOSTYLE_ONLY === '1';

  const clipMaxPages = clipCheckMaxPagesFromEnv();
  const runClipScan = clipMaxPages > 0 && !overflowVisibleDebug;

  function scanRenderedContentClip(puppetPage) {
    return puppetPage.evaluate(
      opts => {
        const rows = [];
        const pageEls = Array.from(document.querySelectorAll('body > .page'));
        for (let i = 0; i < Math.min(pageEls.length, opts.maxPages); i++) {
          const p = pageEls[i];
          const c = p.querySelector('.content');
          if (!c) continue;
          const mh = (c.getAttribute('style') || '').match(/height:\s*([\d.]+)pt/);
          const inlinePt = mh ? parseFloat(mh[1], 10) : null;
          const cs = window.getComputedStyle(c);
          const verseDivs = p.querySelectorAll('.content .v').length;
          rows.push({
            scriptureOrdinal: i + 1,
            verseDivs,
            inlineHeightPt: inlinePt,
            computedHeight: cs.height,
            bodyFnBudgetPt: opts.bodyFnBudgetPt,
            slackPt: opts.slackPt,
            clientPx: c.clientHeight,
            scrollPx: c.scrollHeight,
            overPx: Math.max(0, c.scrollHeight - c.clientHeight)
          });
        }
        return rows;
      },
      {
        maxPages: clipMaxPages,
        bodyFnBudgetPt: Math.round(bodyFnBudgetPt * 1000) / 1000,
        slackPt: Math.round(SCRIPTURE_CONTENT_SLACK_PT * 1000) / 1000
      }
    );
  }

  // ── Pass 4 (optional): same HTML as probe — scrollHeight vs clientHeight proves box clipping.
  const needsPdfPass = !skipChromePdf;
  if (needsPdfPass || runClipScan) {
    const tab = await browser.newPage();
    await tab.emulateMediaType('print');
    tab.setDefaultTimeout(600000);
    await tab.goto('file:///' + htmlPath.replace(/\\/g, '/'), {
      waitUntil: 'networkidle0',
      timeout: 120000
    });
    await tab.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 3000));

    if (runClipScan) {
      const clipRows = await scanRenderedContentClip(tab);
      const anyClipped = clipRows.some(r => r.scrollPx > r.clientPx + 1);
      console.log(
        `  Rendered .content clip scan (${clipRows.length} scripture page(s), max ${clipMaxPages}):`
      );
      console.table(clipRows);
      if (anyClipped) {
        console.warn(
          '  WARN: scrollHeight > clientHeight — overflow:hidden is clipping body text. Paginator/coverage can still be OK. Try larger SCRIPTURE_CONTENT_SLACK_PT or compare computed width vs #test-col.'
        );
      } else {
        console.log('  No vertical clip detected on sampled pages (scroll ≤ client + 1px).');
      }
    }

    if (needsPdfPass) {
      console.log('Pass 4: Rendering PDF (Chromium / Puppeteer)...');
      await tab.pdf({
        path: OUTPUT_PDF_PATH,
        width: '6in',
        height: '9in',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
      const stampedPath = makeStampedPdfPath(pdfOutputDir);
      fs.copyFileSync(OUTPUT_PDF_PATH, stampedPath);
      const stats = fs.statSync(OUTPUT_PDF_PATH);
      console.log(`\n  ${OUTPUT_PDF_PATH}`);
      console.log(`  ${stampedPath}`);
      console.log(
        `  Pages: ${fmPageCount + pages.length} (${fmPageCount} front + ${pages.length} content), Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`
      );
    } else {
      console.log(
        `Pass 4: Skipped (SKIP_CHROME_PDF / VIVLIOSTYLE_ONLY). Open HTML for inspection: ${htmlPath}`
      );
    }

    await tab.close();
  } else {
    console.log(
      `Pass 4: Skipped (SKIP_CHROME_PDF). Set HEBREW_PDF_CLIP_CHECK=12 to scan .content scroll vs client on saved HTML.`
    );
  }

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
