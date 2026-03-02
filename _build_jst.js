// Build jst.html from pgp.html template + _jst_meta.json
// Strategy: extract CSS and JS blocks carefully from pgp.html using
// precise boundary markers, then assemble jst.html from scratch.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const pgp = fs.readFileSync(path.join(dir, 'pgp.html'), 'utf8').replace(/\r\n/g, '\n');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'jst_verses', '_jst_meta.json'), 'utf8'));

// ── helpers ──────────────────────────────────────────────────────────
function toHebNum(n) {
  const ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens = ['','י','כ','ל','מ','נ','ס','ע'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  return (tens[Math.floor(n/10)]||'') + (ones[n%10]||'');
}

// ── extract CSS from pgp.html ────────────────────────────────────────
const cssStart = pgp.indexOf('<style>');
const cssEnd = pgp.indexOf('</style>') + '</style>'.length;
const CSS_BLOCK = pgp.substring(cssStart, cssEnd);

// ── extract JS function blocks from pgp.html second <script> ────────
// The second script block starts after the verse data script tags.
// We find it by looking for the block that begins with "// PREV / NEXT"
// But we actually need content from TWO script blocks in pgp.
// Script 1: from first <script> to first </script> — contains rendering engine, navigation, mode controls, translit init
// Script 2: from the script after verse data tags to the last </script> before service worker

// Let's find script block boundaries by their content markers:
function extractBetween(src, startMarker, endMarker) {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error('Start marker not found: ' + startMarker.substring(0, 40));
  const e = src.indexOf(endMarker, s + startMarker.length);
  if (e < 0) throw new Error('End marker not found: ' + endMarker.substring(0, 40));
  return src.substring(s, e);
}

// Extract the rendering engine (makeWordUnit through _ensureChapterRendered)
const RENDER_ENGINE = extractBetween(pgp, '// === RENDERING ENGINE ===', '// === NAVIGATION ===');

// Transliteration engine
const TRANSLIT_ENGINE = extractBetween(pgp, '// === HEBREW TRANSLITERATION ===', '// === NAV DROPDOWN ===');

// Keyboard shortcuts + close all panels + page flip + verse highlighting
const KB_BLOCK = extractBetween(pgp, '// Keyboard shortcuts', '// === ROOT MAP + MORPHOLOGICAL ANALYSIS ===');

// Root map + morphological analysis
const ROOT_MAP = extractBetween(pgp, '// === ROOT MAP + MORPHOLOGICAL ANALYSIS ===', '// === ENHANCED WORD POPUP ===');

// Enhanced word popup
const POPUP_BLOCK = extractBetween(pgp, '// === ENHANCED WORD POPUP ===', '// === ANNOTATIONS SYSTEM ===');

// Selection toolbar (need to grab cleanly)
const SEL_TOOLBAR = extractBetween(pgp, '// === SELECTION TOOLBAR ===', '// === SHARE SYSTEM ===');

// Search system
const SEARCH_BLOCK = extractBetween(pgp, '// SEARCH\nvar searchIndex', '// READING PROGRESS BAR');

// Reading progress bar
const PROGRESS_BLOCK = extractBetween(pgp, '// READING PROGRESS BAR', '// URL HASH ROUTING');

// ── OT vs NT classification ─────────────────────────────────────────
const otCodes = new Set(['jstgen','jstexo','jstdeu','jst1sa','jst2sa','jst1ch','jst2ch','jstpsa','jstisa','jstjer','jstamo']);

// ── build data arrays ────────────────────────────────────────────────
const chapterOrder = [];
meta.forEach(b => b.entries.forEach(e => chapterOrder.push(b.code+'-ch'+e.ch)));

const bookMapLines = meta.map(b => `    '${b.code}-ch': '${b.en}'`);
const bookDataLines = meta.map((b,i) => `  { prefix: '${b.code}-ch', name: '${b.en}', count: ${b.entries.length}, index: ${i+1} }`);
const ddBooksLines = meta.map(b => `  { id: 'dd-${b.code}', prefix: '${b.code}-ch', count: ${b.entries.length}, entries: [${b.entries.map(e=>e.ch).join(',')}] }`);
const jstBooksLines = meta.map(b => `  {prefix:'${b.code}-ch', en:'${b.en}'}`);
const friendlyMapLines = meta.map(b => `      '${b.en.toLowerCase().replace(/\s+/g,'-')}': '${b.code}-ch'`);
const scriptTagLines = meta.map(b => `<script src="jst_verses/${b.code}.js"><\/script>`);

// navTo book header branches
const navToBranches = meta.map(b =>
  `  } else if (id.indexOf('${b.code}-') === 0) {\n    titleEl.textContent = '${b.he}';\n    subEl.textContent = '${b.en}'; subEl.style.display = '';`
);

// Landing cards
const landingCards = meta.map(b => {
  const tv = b.entries.reduce((s,e) => s+e.verseCount, 0);
  const cl = b.entries.length === 1 ? '1 Entry' : b.entries.length+' Entries';
  return `        <div class="landing-book-card" onclick="navTo('${b.code}-ch${b.entries[0].ch}')">
          <div class="card-title">${b.he}</div>
          <div class="card-subtitle">${b.en}</div>
          <div class="card-chapters">${cl} &middot; ${tv} Verses</div>
        </div>`;
});

// Chapter panels
const chPanels = [];
meta.forEach(b => b.entries.forEach(e => {
  const pid = b.code+'-ch'+e.ch;
  chPanels.push(`    <div class="chapter-panel" id="panel-${pid}" style="display:none;">
      <div class="chapter-heading"><h2>פֶּרֶק ${toHebNum(e.ch)}</h2><div class="chapter-label-en">${e.label}</div></div>
      <div id="${pid}-verses"></div>
    </div>`);
}));

// Nav dropdown
const ddOT = [], ddNT = [];
meta.forEach(b => {
  const line = `        <div class="dd-book" onclick="toggleDdBook('dd-${b.code}')"><span class="dd-arrow">▼</span>${b.he} <span class="dd-eng">${b.en}</span></div>\n        <div class="dd-chapters" id="dd-${b.code}"></div>`;
  (otCodes.has(b.code) ? ddOT : ddNT).push(line);
});

// ── Annotations block — adapted from pgp ─────────────────────────────
// Extract and adapt
let annBlock = extractBetween(pgp, '// === ANNOTATIONS SYSTEM ===', '// === SELECTION TOOLBAR ===');
annBlock = annBlock.replace(/_pgpAnnotations/g, '_jstAnnotations');
annBlock = annBlock.replace(/_pgpNotes/g, '_jstNotes');
annBlock = annBlock.replace(/pgp-annotations/g, 'jst-annotations');
annBlock = annBlock.replace(/pgp-notes/g, 'jst-notes');
annBlock = annBlock.replace(/pgp-annotations\.json/g, 'jst-annotations.json');
annBlock = annBlock.replace(/reader: 'Pearl of Great Price'/g, "reader: 'Joseph Smith Translation'");

let selBlock = SEL_TOOLBAR;
selBlock = selBlock.replace(/_pgpAnnotations/g, '_jstAnnotations');
selBlock = selBlock.replace(/_pgpNotes/g, '_jstNotes');

// Share block
let shareBlock = extractBetween(pgp, '// === SHARE SYSTEM ===', '// === GLOSSARY SYSTEM ===');
shareBlock = shareBlock.replace(/Hebrew Pearl of Great Price/g, 'Hebrew Joseph Smith Translation');

// Glossary block
let glossBlock = extractBetween(pgp, '// === GLOSSARY SYSTEM ===', '// Apply saved annotations on chapter load');
glossBlock = glossBlock.replace(
  /var PGP_BOOKS = \[[\s\S]*?\];/,
  `var JST_BOOKS = [\n${jstBooksLines.join(',\n')}\n];`
);
glossBlock = glossBlock.replace(/PGP_BOOKS/g, 'JST_BOOKS');

// Apply annotations block
const applyAnnBlock = extractBetween(pgp, '// Apply saved annotations on chapter load', '// DARK MODE');

// ══════════════════════════════════════════════════════════════════════
// ASSEMBLE THE HTML
// ══════════════════════════════════════════════════════════════════════
const out = [];
const W = s => out.push(s);

// ── HEAD ──
W(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>כתבי הקודש — Joseph Smith Translation</title>
<meta name="description" content="Hebrew Interlinear Joseph Smith Translation — Classical Biblical Hebrew, Word-by-Word">
<meta name="theme-color" content="#1e2233">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&family=Frank+Ruhl+Libre:wght@300;400;500;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">`);

W(CSS_BLOCK);

W(`</head>
<body>
<a href="#main-content" class="skip-link">Skip to content</a>
<div id="nav-hint"></div>

<!-- Reading progress bar -->
<div id="reading-progress"></div>

<!-- Search bar -->
<div id="search-container" role="search">
  <input id="search-input" type="text" placeholder="Search Hebrew or English..." autocomplete="off" aria-label="Search Hebrew or English">
  <span id="search-close" onclick="closeSearch()" role="button" aria-label="Close search">✕</span>
</div>
<div id="search-results"></div>

<!-- Word popup -->
<div id="word-popup">
  <span class="popup-close" onclick="closePopup()" role="button" aria-label="Close popup">✕</span>
  <div class="popup-hebrew" id="popup-hw"></div>
  <div class="popup-translit" id="popup-translit"></div>
  <div class="popup-gloss" id="popup-gl"></div>
  <div class="popup-strong" id="popup-strong"></div>
  <div class="popup-detail" id="popup-detail"></div>
</div>

<!-- Panel Overlay -->
<div id="panel-overlay" onclick="closeGlossary();closeAnnotationsPanel();"></div>

<!-- Selection Toolbar -->
<div id="sel-toolbar">
  <button id="sel-btn-highlight" onclick="selToolbarToggleColors()" title="Highlight">🖍</button>
  <button id="sel-btn-note" onclick="selToolbarOpenNote()" title="Note">✎</button>
  <button id="sel-btn-copy" onclick="selToolbarCopy()" title="Copy">📋</button>
  <button id="sel-btn-share" onclick="selToolbarShare()" title="Share">↗</button>
  <button id="sel-btn-delete" onclick="selToolbarClearAll()" title="Clear">✕</button>
  <button id="sel-btn-glossary" onclick="closePopup();openGlossary()" title="Glossary">📖</button>
  <button id="sel-btn-annotations" onclick="openAnnotationsPanel()" title="Annotations">📝</button>
  <div id="sel-subpanel">
    <div class="sel-color-row">
      <span class="sel-color-row-label">HL</span>
      <span class="sel-color" style="background:#fff9c4" data-ann="highlight" data-color="#fff9c4" onclick="selToolbarApply(this)"></span>
      <span class="sel-color" style="background:#bbdefb" data-ann="highlight" data-color="#bbdefb" onclick="selToolbarApply(this)"></span>
      <span class="sel-color" style="background:#ef9a9a" data-ann="highlight" data-color="#ef9a9a" onclick="selToolbarApply(this)"></span>
      <span class="sel-color" style="background:#c8e6c9" data-ann="highlight" data-color="#c8e6c9" onclick="selToolbarApply(this)"></span>
      <span class="sel-color" style="background:#e1bee7" data-ann="highlight" data-color="#e1bee7" onclick="selToolbarApply(this)"></span>
    </div>
    <div class="sel-color-row">
      <span class="sel-color-row-label">UL</span>
      <span class="sel-color" style="background:#c8a84e" data-ann="underline" data-color="#c8a84e" onclick="selToolbarApply(this)"></span>
      <span class="sel-color" style="background:#ef5350" data-ann="underline" data-color="#ef5350" onclick="selToolbarApply(this)"></span>
      <span class="sel-color" style="background:#42a5f5" data-ann="underline" data-color="#42a5f5" onclick="selToolbarApply(this)"></span>
    </div>
  </div>
  <div id="sel-note-row">
    <textarea id="sel-note-input" placeholder="Add a note..."></textarea>
    <button id="sel-note-save" onclick="selToolbarSaveNote()">Save</button>
  </div>
</div>

<!-- Share Popup -->
<div id="share-popup">
  <span class="share-close" onclick="closeSharePopup()">✕</span>
  <h3>Share This Verse</h3>
  <div id="share-verse-preview" style="font-family:'David Libre',serif;font-size:1.1em;color:var(--ink);direction:rtl;margin-bottom:12px;padding:8px;background:var(--bg-deep);border-radius:4px;"></div>
  <div class="share-btns">
    <button class="share-btn" onclick="shareToFacebook()">Facebook</button>
    <button class="share-btn" onclick="shareToX()">𝕏 / Twitter</button>
    <button class="share-btn" onclick="shareCopyLink()">Copy Link</button>
    <button class="share-btn" onclick="shareNative()">Share...</button>
  </div>
</div>

<!-- Glossary Panel -->
<div id="glossary-panel" role="dialog" aria-label="Glossary">
  <div class="glossary-header">
    <h3>📖 Root Glossary</h3>
    <span class="glossary-close" onclick="closeGlossary()">✕</span>
  </div>
  <input id="glossary-search" type="text" placeholder="Search by root or meaning..." autocomplete="off">
  <div class="glossary-controls">
    <button class="glossary-tab active" data-tab="all" onclick="setGlossaryTab(this)">All</button>
    <button class="glossary-tab" data-tab="frequent" onclick="setGlossaryTab(this)">Frequent</button>
    <button class="glossary-tab" data-tab="category" onclick="setGlossaryTab(this)">Category</button>
    <select id="glossary-sort-select" onchange="renderGlossaryList()">
      <option value="freq-desc">Most frequent</option>
      <option value="freq-asc">Least frequent</option>
      <option value="alpha-heb">א-ת</option>
      <option value="alpha-eng">A-Z</option>
    </select>
  </div>
  <div id="glossary-list"></div>
</div>

<!-- Annotations Panel -->
<div id="annotations-panel" role="dialog" aria-label="Annotations">
  <div class="ann-panel-header">
    <h3>📝 Annotations</h3>
    <span class="ann-panel-close" onclick="closeAnnotationsPanel()">✕</span>
  </div>
  <div class="ann-tabs">
    <button class="ann-tab active" onclick="showAnnTab('highlights')">Highlights</button>
    <button class="ann-tab" onclick="showAnnTab('notes')">Notes</button>
  </div>
  <div id="annotations-list"></div>
  <button class="ann-export-btn" onclick="exportAnnotations()">Export Annotations (JSON)</button>
</div>`);

// ── CONTROLS TOP ──
W(`
<div class="controls-top">
  <div class="nav-row">
    <a href="index.html" style="background:transparent;border:1px solid #3a3f55;color:#c8a84e;padding:5px 10px;border-radius:3px;text-decoration:none;font-size:0.95em;line-height:1;display:flex;align-items:center;" title="Standard Works Home" aria-label="Standard Works Home">🏠</a>
    <button class="nav-prev" id="nav-prev" onclick="goPrev()" disabled aria-label="Previous chapter">←</button>
    <span class="nav-label-wrap">
      <span id="nav-label" onclick="toggleNavDropdown()">תרגום ג׳וזף סמית ▾</span>
      <div id="nav-dropdown">
        <button class="dd-link" onclick="ddNav('landing')">← תרגום ג׳וזף סמית</button>
        <hr class="dd-divider">
        <div class="dd-section">תנ״ך / Old Testament</div>
${ddOT.join('\n')}
        <hr class="dd-divider">
        <div class="dd-section">הברית החדשה / New Testament</div>
${ddNT.join('\n')}
      </div>
    </span>
    <button class="nav-next" id="nav-next" onclick="goNext()" disabled aria-label="Next chapter">→</button>
  </div>
  <div class="tools-group">
    <label><span class="label-text">Size </span><input type="range" id="sizeSlider" min="70" max="150" value="100" oninput="setSize(this.value)" aria-label="Font size"></label>
    <span style="color:#3a3f55">│</span>
    <button id="dark-mode-toggle" onclick="toggleDarkMode()" title="Toggle dark mode" aria-label="Toggle dark mode">☽</button>
    <button id="search-toggle" style="background:transparent;border:1px solid #3a3f55;color:#c8a84e;padding:5px 10px;border-radius:3px;cursor:pointer;font-size:0.9em;" onclick="openSearch()" title="Search" aria-label="Search">⌕</button>
  </div>
</div>

<div class="controls-bottom">
  <button id="btn-inter" class="active" onclick="setMode('inter')">Interlinear<br>בֵּין־שׁוּרוֹת</button>
  <button id="btn-heb" onclick="setMode('heb')">Hebrew Only<br>עִבְרִית</button>
  <button id="btn-translit" onclick="toggleTranslit()" title="Show/hide transliteration">Transliterate<br>תַּעְתִּיק</button>
</div>`);

// ── PAGE + PANELS ──
W(`
<div class="page" id="page">
  <div class="book-header" id="book-header">
    <div class="book-title" id="main-book-title">תרגום ג׳וזף סמית</div>
    <div class="book-subtitle" id="main-book-subtitle">Joseph Smith Translation</div>
  </div>
  <div class="ornament" id="main-ornament">✦ ✦ ✦</div>
  <main id="main-content">

    <!-- Landing Panel -->
    <div class="chapter-panel" id="panel-landing" style="display:block;">
      <div class="landing-hero">
        <h1>תרגום ג׳וזף סמית</h1>
        <div class="subtitle-en">Joseph Smith Translation</div>
        <div class="subtitle-heb">Hebrew Interlinear</div>
      </div>
      <hr class="landing-divider">
      <div class="landing-books">
${landingCards.join('\n')}
      </div>
      <div class="landing-back">
        <a href="index.html">← Standard Works Home</a>
      </div>
    </div>

    <!-- Chapter Panels -->
${chPanels.join('\n')}

  </main>
</div>`);

// ── SCRIPT 1: Helper functions + rendering engine + navigation + mode + init ──
W(`
<script>
// === HELPER FUNCTIONS ===

function getBookChapter(chId) {
  var bookMap = {
${bookMapLines.join(',\n')}
  };
  for (var prefix in bookMap) {
    if (chId.indexOf(prefix) === 0) {
      var num = parseInt(chId.replace(prefix, ''), 10);
      return { book: bookMap[prefix], chapter: num || 1 };
    }
  }
  return null;
}

function getChapterLabel(id) {
  if (!id) return 'Joseph Smith Translation';
  if (id === 'landing') return 'Joseph Smith Translation';
  var bookMap = {
${bookMapLines.join(',\n')}
  };
  for (var prefix in bookMap) {
    if (id.indexOf(prefix) === 0) {
      var num = id.replace(prefix, '');
      return bookMap[prefix] + ' ' + num;
    }
  }
  return id;
}

${RENDER_ENGINE}
// === NAVIGATION ===

function navTo(id, slideDir) {
  var isLanding = id === 'landing';
  var headerEl = document.getElementById('book-header');
  var ornamentEl = document.getElementById('main-ornament');
  var titleEl = document.getElementById('main-book-title');
  var subEl = document.getElementById('main-book-subtitle');

  headerEl.style.display = isLanding ? 'none' : '';
  ornamentEl.style.display = isLanding ? 'none' : '';

  if (isLanding) {
    // header hidden
${navToBranches.join('\n')}
  }

  if (!isLanding) { _ensureChapterRendered(id); }

  document.querySelectorAll('.chapter-panel').forEach(function(p) {
    p.style.display = 'none';
    p.classList.remove('slide-right', 'slide-left');
  });
  var targetPanel = document.getElementById('panel-' + (isLanding ? 'landing' : id));
  if (targetPanel) {
    targetPanel.style.display = 'block';
    if (slideDir) targetPanel.classList.add(slideDir === 'next' ? 'slide-right' : 'slide-left');
  }

  currentPageId = id;
  if (!isLanding) { currentChapterId = id; } else { currentChapterId = null; }
  updateNavButtons();
  window.scrollTo({top: 0, behavior: 'instant'});
}

// === MODE CONTROLS ===

function setMode(mode) {
  document.body.classList.remove('hide-gloss');
  document.querySelectorAll('.controls-bottom button:not(#btn-translit)').forEach(function(b) { b.classList.remove('active'); });
  if (mode === 'heb') {
    document.body.classList.add('hide-gloss');
    document.getElementById('btn-heb').classList.add('active');
  } else {
    document.getElementById('btn-inter').classList.add('active');
  }
}

function toggleTranslit() {
  document.body.classList.toggle('hide-translit');
  var btn = document.getElementById('btn-translit');
  btn.classList.toggle('active');
  try { localStorage.setItem('jst-show-translit', btn.classList.contains('active') ? '1' : '0'); } catch(e) {}
}

function setSize(val) {
  document.getElementById('page').style.fontSize = val + '%';
  try { localStorage.setItem('jst-font-size', val); } catch(e) {}
}

// INIT
try {
  if (localStorage.getItem('jst-show-translit') === '1') {
    document.getElementById('btn-translit').classList.add('active');
  } else {
    document.body.classList.add('hide-translit');
  }
} catch(e) { document.body.classList.add('hide-translit'); }

try {
  var savedSize = localStorage.getItem('jst-font-size');
  if (savedSize) {
    document.getElementById('page').style.fontSize = savedSize + '%';
    document.getElementById('sizeSlider').value = savedSize;
  }
} catch(e) {}
<\/script>

<!-- Strong's lookup + Root glossary data -->
<script src="strongs_lookup.js"><\/script>
<script src="../Hebrew BOM/roots_glossary.js"><\/script>

<!-- Verse data files -->
${scriptTagLines.join('\n')}

<script>

// PREV / NEXT CHAPTER NAVIGATION
var currentChapterId = null;
var currentPageId = 'landing';
var chapterOrder = [
  '${chapterOrder.join("','")}'
];

var BOOK_DATA = [
${bookDataLines.join(',\n')}
];

function getBookProgress(chapterId) {
  if (!chapterId) return null;
  for (var i = 0; i < BOOK_DATA.length; i++) {
    var b = BOOK_DATA[i];
    if (chapterId.indexOf(b.prefix) === 0) {
      var chNum = parseInt(chapterId.replace(b.prefix, ''), 10) || 1;
      return { bookName: b.name, bookIndex: b.index, totalBooks: ${meta.length}, chapterNum: chNum, totalChapters: b.count };
    }
  }
  return null;
}

var fullPageOrder = ['landing'].concat(chapterOrder);

function updateNavButtons() {
  var prevBtn = document.getElementById('nav-prev');
  var nextBtn = document.getElementById('nav-next');
  var label = document.getElementById('nav-label');
  var idx = fullPageOrder.indexOf(currentPageId);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= fullPageOrder.length - 1;
  prevBtn.textContent = '\\u2190';
  nextBtn.textContent = '\\u2192';
  if (label) {
    if (currentChapterId) {
      var progress = getBookProgress(currentChapterId);
      if (progress) {
        var mainText = progress.bookName;
        if (progress.totalChapters > 1) mainText += ' ' + progress.chapterNum;
        label.innerHTML = mainText + ' \\u25BE';
      } else {
        label.innerHTML = getChapterLabel(currentChapterId) + ' \\u25BE';
      }
    } else {
      label.innerHTML = '\u05EA\u05E8\u05D2\u05D5\u05DD \u05D2\u05F3\u05D5\u05D6\u05E3 \u05E1\u05DE\u05D9\u05EA \\u25BE';
    }
  }
}

function goNext() {
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx >= 0 && idx < fullPageOrder.length - 1) { navTo(fullPageOrder[idx + 1], 'next'); }
}

function goPrev() {
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx > 0) { navTo(fullPageOrder[idx - 1], 'prev'); }
}

${TRANSLIT_ENGINE}
// === NAV DROPDOWN ===
function toHebNum(n) {
  var ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  var tens = ['','י','כ','ל','מ','נ','ס','ע'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  var t = Math.floor(n / 10);
  var o = n % 10;
  return (tens[t] || '') + (ones[o] || '');
}

var DD_BOOKS = [
${ddBooksLines.join(',\n')}
];
(function initDdChapters() {
  DD_BOOKS.forEach(function(b) {
    var el = document.getElementById(b.id);
    if (!el) return;
    var html = '';
    for (var i = 0; i < b.entries.length; i++) {
      var ch = b.entries[i];
      html += '<button class="dd-ch" onclick="ddNav(\\'' + b.prefix + ch + '\\')">' +
        '<span class="dd-ch-heb">' + toHebNum(ch) + '</span>' + ch + '</button>';
    }
    el.innerHTML = html;
  });
})();

function toggleNavDropdown() {
  var dd = document.getElementById('nav-dropdown');
  dd.classList.toggle('open');
}

function toggleDdBook(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var isOpen = el.classList.contains('open');
  document.querySelectorAll('#nav-dropdown .dd-chapters').forEach(function(c) { c.classList.remove('open'); });
  document.querySelectorAll('#nav-dropdown .dd-book .dd-arrow').forEach(function(a) { a.textContent = '▼'; });
  if (!isOpen) {
    el.classList.add('open');
    var arrow = el.previousElementSibling.querySelector('.dd-arrow');
    if (arrow) arrow.textContent = '▲';
  }
}

function ddNav(id) {
  document.getElementById('nav-dropdown').classList.remove('open');
  navTo(id);
}

document.addEventListener('click', function(e) {
  var dd = document.getElementById('nav-dropdown');
  if (!dd || !dd.classList.contains('open')) return;
  var wrap = e.target.closest('.nav-label-wrap');
  if (!wrap) dd.classList.remove('open');
});

${KB_BLOCK}
${ROOT_MAP}
${POPUP_BLOCK}
function closePopup() { document.getElementById('word-popup').style.display = 'none'; }

${annBlock}
${selBlock}
${shareBlock}
${glossBlock}
${applyAnnBlock}
// DARK MODE
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  var isDark = document.body.classList.contains('dark-mode');
  var btn = document.getElementById('dark-mode-toggle');
  btn.textContent = isDark ? '☀' : '☽';
  try { localStorage.setItem('jst-dark-mode', isDark ? '1' : '0'); } catch(e) {}
}
(function() {
  var saved = localStorage.getItem('jst-dark-mode');
  if (saved === '1') {
    document.body.classList.add('dark-mode');
    var btn = document.getElementById('dark-mode-toggle');
    if (btn) btn.textContent = '☀';
  }
})();

${SEARCH_BLOCK}
${PROGRESS_BLOCK}
// URL HASH ROUTING
(function() {
  function handleHash() {
    var hash = window.location.hash.replace('#', '');
    if (!hash) return;
    var friendlyMap = {
${friendlyMapLines.join(',\n')}
    };
    if (chapterOrder.indexOf(hash) >= 0) { navTo(hash); return; }
    for (var name in friendlyMap) {
      var re = new RegExp('^' + name + '-(\\\\d+)$', 'i');
      var match = hash.match(re);
      if (match) {
        var chapId = friendlyMap[name] + match[1];
        if (chapterOrder.indexOf(chapId) >= 0) { navTo(chapId); return; }
      }
      if (hash.toLowerCase() === name) {
        var chapId2 = friendlyMap[name] + '1';
        if (chapterOrder.indexOf(chapId2) >= 0) { navTo(chapId2); return; }
      }
    }
  }
  var _navHash = window.navTo;
  window.navTo = function(id, slideDir) {
    _navHash(id, slideDir);
    if (id && id !== 'landing') {
      var label = getChapterLabel(id).toLowerCase().replace(/\\s+/g, '-');
      history.replaceState(null, '', '#' + label);
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  };
  window.addEventListener('hashchange', handleHash);
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }
})();

<\/script>
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}
<\/script>
</body>
</html>`);

const result = out.join('\n');
fs.writeFileSync(path.join(dir, 'jst.html'), result, 'utf8');
console.log('jst.html written: ' + result.length + ' chars, ' + result.split('\n').length + ' lines');
console.log('Chapters: ' + chapterOrder.length + ', Books: ' + meta.length);

// Verify no PGP remnants
const pgpRefs = (result.match(/Pearl of Great Price/g) || []).length;
const pgpKeys = (result.match(/pgp-/g) || []).length;
console.log('PGP name refs: ' + pgpRefs + ' (should be 0)');
console.log('pgp- key refs: ' + pgpKeys + ' (should be 0)');
