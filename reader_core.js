/**
 * reader_core.js — the shared sibling reader, part 1 (pre-data).
 * Phase 2 of the consolidation: extracted VERBATIM from ot.html (the canon
 * copy) on 2026-08-29. Must load BEFORE the verse data scripts — they call
 * renderVerseSet() as they load. Parameterization for nt/dc/pgp/jst arrives
 * with each page conversion; until a sibling converts, its own inline copy
 * still governs it. bom/bom.html keeps its feature-rich reader this phase.
 */

(function readerTouchBurstTracker() {
  var recentEnds = [];
  document.addEventListener('touchend', function(e) {
    if (!e.target.closest('#page')) return;
    if (e.target.closest('#sel-toolbar, #word-popup, #search-container, #glossary-panel, #annotations-panel, .controls-top, .controls-bottom, button, input, textarea, select')) return;
    var now = Date.now();
    recentEnds.push(now);
    recentEnds = recentEnds.filter(function(t) { return now - t < 550; });
  }, { passive: true, capture: true });
  window.__readerTouchBurstLen = function() {
    var now = Date.now();
    recentEnds = recentEnds.filter(function(t) { return now - t < 550; });
    return recentEnds.length;
  };
  window.__readerTouchBurstClear = function() { recentEnds = []; };
})();
// The book table lives in each page (var OT_BOOKS / NT_BOOKS ... passed in
// as READER.books) — the concordance builder greps the PAGES for it.
var BOOKS = window.READER.books;

// Build chapter order
var chapterOrder = [];
if (window.READER.buildChapterOrder) {
  // Volume with its own page structure (D&C sections, JST selections...)
  window.READER.buildChapterOrder(chapterOrder);
} else {
  BOOKS.forEach(function(book) {
    for (var ch = 1; ch <= book.ch; ch++) {
      chapterOrder.push(book.prefix + '-ch' + ch);
    }
  });
}

// Hebrew numeral converter (supports up to ~500)
function toHebNum(n) {
  var ones = ['','\u05D0','\u05D1','\u05D2','\u05D3','\u05D4','\u05D5','\u05D6','\u05D7','\u05D8'];
  var tens = ['','\u05D9','\u05DB','\u05DC','\u05DE','\u05E0','\u05E1','\u05E2','\u05E4','\u05E6'];
  var hundreds = ['','\u05E7','\u05E8','\u05E9','\u05EA'];
  if (n === 15) return '\u05D8\u05D5';
  if (n === 16) return '\u05D8\u05D6';
  var result = '';
  if (n >= 100) {
    var h = Math.floor(n / 100);
    if (h <= 4) result += hundreds[h];
    else result += '\u05EA' + hundreds[h - 4];
    n %= 100;
  }
  if (n === 15) { result += '\u05D8\u05D5'; return result; }
  if (n === 16) { result += '\u05D8\u05D6'; return result; }
  if (n >= 10) { result += tens[Math.floor(n / 10)]; n %= 10; }
  if (n > 0) result += ones[n];
  return result;
}

// Helper: find book by prefix
function findBook(prefix) {
  for (var i = 0; i < BOOKS.length; i++) {
    if (BOOKS[i].prefix === prefix) return BOOKS[i];
  }
  return null;
}


// Dynamically create landing page and chapter panels
(function buildPanels() {
  var mainContent = document.getElementById('main-content');
  var landingPanel = document.getElementById('panel-landing');

  // A volume whose landing/panels have their own shape (D&C section grids,
  // JST selections) supplies READER.buildPages and skips the book-based canon.
  if (window.READER.buildPages) { window.READER.buildPages(mainContent, landingPanel); return; }

  // Build landing page — interlinear hero + stacked book titles + chapter grids (matches the BOM landing)
  var landingHtml = '<div style="max-width:700px;margin:0 auto;padding:40px 20px 0;text-align:center">' +
    '<div class="hero-lis" style="margin-bottom:6px">' +
    '<div class="hero-lis-row">' +
    window.READER.heroHtml +
    '</div>' +
    '<div style="font-family:\'David Libre\',serif;font-size:0.95em;color:var(--ink-light);letter-spacing:0.1em;direction:ltr;margin-top:16px">HEBREW INTERLINEAR</div>' +
    '</div>' +
    '<div style="margin:24px 0 4px"><button id="start-reading-btn" onclick="navTo(\''+window.READER.firstChapter+'\')">Begin Reading \u2192</button></div>' +
    '</div><hr class="landing-divider"><div class="landing-sections">';

  var BOOK_TL = window.READER.bookTranslit;
  var cats = window.READER.cats, catEn = window.READER.catEn, catHe = window.READER.catHe;

  cats.forEach(function(cat) {
    landingHtml += '<div class="landing-section-group"><h3><span dir="ltr">' + catEn[cat] + '</span> · <span class="lsg-heb" dir="rtl" style="unicode-bidi:isolate">' + catHe[cat] + '</span></h3>';
    BOOKS.forEach(function(book) {
      if (book.cat !== cat) return;
      landingHtml += '<div class="landing-section-group"><h3 class="lsg-stack">' +
        '<span class="lsg-s-heb" dir="rtl">' + book.he.replace(/ (\u05D0|\u05D1|\u05D2)$/, ' $1\u05F3') + '</span>' +
        '<span class="lsg-s-tl">' + (BOOK_TL[book.prefix] || '') + '</span>' +
        '<span class="lsg-s-en" dir="ltr">' + book.en + '</span></h3>' +
        '<div class="landing-section-grid">';
      for (var n = 1; n <= book.ch; n++) {
        landingHtml += '<div class="landing-sec-btn" onclick="navTo(\'' + book.prefix + '-ch' + n + '\')">' +
          '<span class="sec-heb">' + toHebNum(n) + '</span><span class="sec-num">' + n + '</span></div>';
      }
      landingHtml += '</div></div>';
    });
    landingHtml += '</div>';
  });
  landingHtml += '</div><div class="landing-back"><a href="index.html">\u2190 Standard Works Home</a></div>';
  landingPanel.innerHTML = landingHtml;

  // Create chapter panels dynamically for all 929 chapters
  BOOKS.forEach(function(book) {
    for (var ch = 1; ch <= book.ch; ch++) {
      var panelId = book.prefix + '-ch' + ch;
      var div = document.createElement('div');
      div.className = 'chapter-panel';
      div.id = 'panel-' + panelId;
      div.style.display = 'none';
      div.innerHTML = '<div class="chapter-heading"></div>' +
        '<div id="' + panelId + '-verses"></div>';
      mainContent.appendChild(div);
    }
  });
})();

// === RENDERING ENGINE ===

window._noNikkud = false;
 // geminated vav doubles in plene display: metavvekh -> מתווך, never מתוך







var _verseRegistry = [];
var _pendingRenders = [];
var _renderedChapters = {};

// === VOLUME LOADER (lazy books) ===
// A page contributes DATA only: READER.verseDir with <verseDir>/manifest.js
// (generated by tools/build_verse_manifests.js — which verse file registers
// which chapter id) and, for the Dual column, READER.englishDir holding one
// English chunk per verse file. A book is fetched the first time one of its
// chapters is shown, exactly as bom_book_loader.js does for the Book of
// Mormon, and its English chunk only while the Dual view is on. A page with
// no manifest (static verse tags) makes every call here a no-op that reports
// the chapter as present, so the old shape keeps working unchanged.
var VolumeLoader = (function() {
  var loaded = {}, pending = {};
  function manifest() { return window.READER_VERSE_MANIFEST || null; }
  function fileFor(chapId) {
    var m = manifest(); if (!m || !chapId) return null;
    if (m.ids[chapId]) return m.ids[chapId];
    return m.prefixes[chapId.replace(/\d+$/, '')] || null;
  }
  function loadScript(src, cb) {
    if (loaded[src]) { cb(); return; }                 // synchronous when already here
    if (pending[src]) { pending[src].push(cb); return; }
    pending[src] = [cb];
    var s = document.createElement('script');
    s.src = src;
    s.onload = s.onerror = function() {                // an error still settles: no request loops forever
      loaded[src] = true;
      var q = pending[src] || []; delete pending[src];
      q.forEach(function(f) { try { f(); } catch (e) { console.error(e); } });
    };
    document.head.appendChild(s);
  }
  function dualOn() { return !!(document.body && document.body.classList.contains('dual-mode')); }
  function verseSrc(f) { return window.READER.verseDir + '/' + f; }
  function englishSrc(f) {                            // null when the file carries no Dual English (an introduction, a table)
    var m = manifest();
    return (window.READER.englishDir && m && m.english && m.english.indexOf(f) >= 0) ? window.READER.englishDir + '/' + f : null;
  }
  /* The chapter summary — English, Hebrew and its glossed words — used to be
     three whole-corpus files loaded eagerly: 856 KB on the OT's critical path
     to render ONE chapter's heading, larger than the chapter itself. Split per
     book by tools/build_heading_manifests.js and fetched with the book, the
     same way the Dual English chunk is. Largest single book is now 104 KB, and
     only the book being read is fetched. */
  function headingSrc(f) {
    var m = manifest();
    return (m && m.headings && m.headings.indexOf(f) >= 0) ? window.READER.vol + '_headings/' + f : null;
  }
  /* The cross-reference map, split the same way by tools/build_crossref_chunks.js.
     It is deliberately NOT part of ensure(): markers are decoration over a
     chapter that is already readable, so the chunk is fetched at idle after
     the render (crossrefs_engine asks for it) and never delays a page turn.
     The OT's map was 1.24 MB in one file — 41% of that page's bytes — to mark
     up one chapter; the largest single book is now 115 KB. */
  function crossrefSrc(f) {
    var m = manifest();
    return (m && m.crossrefs && m.crossrefs.indexOf(f) >= 0) ? window.READER.vol + '_crossrefs/' + f : null;
  }
  function loadAll(srcs, cb) {
    var n = srcs.length; if (!n) { cb(); return; }
    srcs.forEach(function(src) { loadScript(src, function() { if (--n === 0) cb(); }); });
  }
  /** Everything a chapter needs right now is on the page (its verse file, and its English while Dual is on). */
  function has(chapId) {
    var f = fileFor(chapId); if (!f) return true;
    var e = englishSrc(f), h = headingSrc(f);
    return !!loaded[verseSrc(f)] && (!h || !!loaded[h]) && (!dualOn() || !e || !!loaded[e]);
  }
  /** Fetch what has(chapId) is missing, then cb — synchronously when nothing is missing. */
  function ensure(chapId, cb) {
    var f = fileFor(chapId); if (!f) { cb(); return; }
    var want = [verseSrc(f)], e = englishSrc(f), h = headingSrc(f);
    if (h) want.push(h);                              // the summary renders with the chapter
    if (e && dualOn()) want.push(e);
    loadAll(want, cb);
  }
  /** The English chunks of every chapter already rendered — a Dual view switched on after the books loaded. */
  function ensureEnglish(cb) {
    if (!manifest() || !window.READER.englishDir) { cb(); return; }
    var srcs = {};
    Object.keys(_renderedChapters).forEach(function(id) { var f = fileFor(id), e = f && englishSrc(f); if (e) srcs[e] = 1; });
    loadAll(Object.keys(srcs), cb);
  }
  /** Every verse file of the volume and every English chunk — search matches the English column too. */
  function ensureAll(cb) {
    var m = manifest(); if (!m) { cb(); return; }
    var srcs = m.files.map(verseSrc);
    srcs = srcs.concat(m.files.map(englishSrc).filter(Boolean));
    srcs = srcs.concat(m.files.map(headingSrc).filter(Boolean));
    loadAll(srcs, cb);
  }
  /** The cross-reference chunk for one chapter's book — cb runs either way. */
  function ensureCrossrefs(chapId, cb) {
    var f = fileFor(chapId), src = f && crossrefSrc(f);
    if (!src) { cb(); return; }
    loadScript(src, cb);
  }
  /** The chunks of every chapter already rendered — the first idle pass, and a
      Dual/theme reload that re-renders several panels before the engine wakes. */
  function ensureCrossrefsRendered(cb) {
    var srcs = {};
    Object.keys(_renderedChapters).forEach(function(id) {
      var f = fileFor(id), c = f && crossrefSrc(f); if (c) srcs[c] = 1;
    });
    loadAll(Object.keys(srcs), cb);
  }
  /** Whether this volume ships chunks at all — the JST has no cross-references,
      and a page with no manifest still loads the one whole file it always did. */
  function hasCrossrefChunks() {
    var m = manifest(); return !!(m && m.crossrefs && m.crossrefs.length);
  }
  return { fileFor: fileFor, has: has, ensure: ensure, ensureEnglish: ensureEnglish,
           ensureAll: ensureAll, ensureCrossrefs: ensureCrossrefs,
           ensureCrossrefsRendered: ensureCrossrefsRendered, hasCrossrefChunks: hasCrossrefChunks };
})();
// verse_search.js preloads a lazy volume through this before searching it.
window.__swLoadAllVerses = function(cb) { VolumeLoader.ensureAll(cb || function() {}); };
// crossrefs_engine.js asks for cross-reference chunks through these.
window.__swEnsureCrossrefs = function(chapId, cb) { VolumeLoader.ensureCrossrefs(chapId, cb || function() {}); };
window.__swEnsureCrossrefsRendered = function(cb) { VolumeLoader.ensureCrossrefsRendered(cb || function() {}); };
// reader_surface.js's loadEnglishText asks for the English of what is rendered.
window.__swEnsureEnglishRendered = function(cb) { VolumeLoader.ensureEnglish(cb || function() {}); };
window.__swHasCrossrefChunks = function() { return VolumeLoader.hasCrossrefChunks(); };

/* PSALM 119 IS AN ACROSTIC and the printed editions say so. 176 verses in 22
   stanzas of eight, each stanza opening with the next letter of the alphabet —
   verse 1 אַשְׁרֵי, verse 9 בַּמֶּה, verse 17 גְּמֹל, verse 25 דָּבְקָה — and the
   KJV heads each stanza with the letter's name. Without them the psalm reads
   as 176 undifferentiated verses and the one structural fact about it is
   invisible, even though the Hebrew carries it perfectly.

   The letter itself is the heading, with its name beneath in the site's own
   transliteration — the same Hebrew-over-transliteration idiom as every other
   line in the book, rather than the KJV's archaic romanisation (VAU, JOD,
   SCHIN). Nothing is added to the verse data: the stanza boundary is arithmetic
   on the verse number, so no file needs a marker and nothing can drift. */


/* The JST revises particular OT and NT verses, and nothing on those verses said
   so — the reader had to already know. jst_crossrefs.js (generated by
   tools/build_jst_crossrefs.js) maps chapter -> verse -> [JST chapter, JST
   verse, added?].
 
   TWO KINDS, and they mean different things, so they sit in different places:
 
     a REVISION of this very verse (355 of them) annotates the verse, so its
     mark goes beside the verse NUMBER — "this verse has a JST reading";
 
     material ADDED past the end of the chapter (JST Genesis 14 runs to v40
     where Genesis 14 stops at 24) points PAST the verse rather than at it, so
     it sits BELOW the last verse and reads "JST +". The user: "thats just for
     those that have additional... the others that has it in verse please put
     it next to the verse".
 
   The JST's own verse number is carried separately because for an addition it
   is never the anchor's — Genesis 14:24 links to JST Genesis 14:25. */

function _ensureChapterRendered(chapId) {
  if (!VolumeLoader.has(chapId)) {                    // a book not here yet (adjacent prefetch): fetch, then render
    VolumeLoader.ensure(chapId, function() { _ensureChapterRendered(chapId); });
    return;
  }
  if (_renderedChapters[chapId]) {
    // Guard: if the panel is unexpectedly empty (failed load), allow a retry
    var _versesEl = document.getElementById(chapId + '-verses');
    if (_versesEl && _versesEl.children.length > 0) return;
    _renderedChapters[chapId] = false; // reset so we fall through and re-render
  }
  for (var i = _pendingRenders.length - 1; i >= 0; i--) {
    if (_pendingRenders[i].chapId === chapId) {
      _doRenderVerses(_pendingRenders[i].verseData, _pendingRenders[i].containerId);
      _pendingRenders.splice(i, 1);
    }
  }
  // Fallback: if panel still empty, re-render from _verseRegistry (never cleared)
  var _versesEl2 = document.getElementById(chapId + '-verses');
  if (_versesEl2 && _versesEl2.children.length === 0) {
    for (var r = 0; r < _verseRegistry.length; r++) {
      if (_verseRegistry[r].chapId === chapId) {
        _doRenderVerses(_verseRegistry[r].verses, chapId + '-verses');
      }
    }
  }
  _renderedChapters[chapId] = true;
  if (typeof transliterate === 'function') {
    var chapContainer = document.getElementById('panel-' + chapId);
    if (chapContainer) {
      var units = chapContainer.querySelectorAll('.word-unit[data-h]');
      for (var ti = 0; ti < units.length; ti++) {
        var h = units[ti].getAttribute('data-h');
        var tlSpan = units[ti].querySelector('.tl');
        if (tlSpan && h && !tlSpan.textContent) tlSpan.textContent = transliterate(h);
      }
    }
  }
  if (window._englishLoaded && typeof populateEnglishDivs === 'function') populateEnglishDivs();
}

// === NAVIGATION ===

function navTo(id, slideDir) {
  var isLanding = id === 'landing';
  // A lazy book: hand off to the loader and come back through the whole
  // wrapper chain once the file is here. The flag tells the wrappers in
  // reader_ui.js that this pass did nothing (no pushState, no flip); it is
  // set AFTER the call because a synchronous re-entry has already reset it.
  window.__swNavDeferred = false;
  if (!isLanding && !VolumeLoader.has(id)) {
    var fromHash = !!window.__swNavFromHash;
    VolumeLoader.ensure(id, function() {
      var prev = window.__swNavFromHash;
      window.__swNavFromHash = fromHash;
      try { navTo(id, slideDir); } finally { window.__swNavFromHash = prev; }
    });
    window.__swNavDeferred = true;
    return;
  }
  var headerEl = document.getElementById('book-header');
  var ornamentEl = document.getElementById('main-ornament');
  var titleEl = document.getElementById('main-book-title');
  var subEl = document.getElementById('main-book-subtitle');

  headerEl.style.display = isLanding ? 'none' : '';
  ornamentEl.style.display = isLanding ? 'none' : '';

  if (!isLanding) {
    if (window.READER.panelTitle && window.READER.panelTitle(titleEl, subEl, id)) {
      // page-supplied title (D&C 'חלק N' etc.) — handled
    } else {
    var info = getBookChapter(id);
    if (info) {
      titleEl.innerHTML = info.bookData.he.replace(/[\u0591-\u05C7]/g,'') + '<br><span class="book-title-en" dir="ltr">' + info.bookData.en + '</span>';
      subEl.textContent = '\u05E4\u05E8\u05E7 ' + toHebNum(info.chapter) + ' / Chapter ' + info.chapter;
      subEl.style.display = '';
    }
    }
    _ensureChapterRendered(id);
  }

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
  currentChapterId = isLanding ? null : id;
  // Keep NavEngine in sync even if a cosmetic helper below throws —
  // otherwise the sidebar reopens to the Library view instead of this book.
  if (window.NavEngine) NavEngine.update(currentChapterId || 'landing');
  try { updateNavButtons(); } catch(e) {}
  window.scrollTo({top: 0, behavior: 'instant'});
  window.__swNavCount = (window.__swNavCount || 0) + 1;   // completed navigations (the boot reveal waits on it)

  // Prefetch/render adjacent chapters during idle time so next/prev feels instant.
  scheduleAdjacentPrefetch();
}


function toggleNoNikkud() {
  _keepVersePosition(function() {
  window._noNikkud = !window._noNikkud;
  document.getElementById('btn-nikkud').classList.toggle('active', window._noNikkud);
  document.querySelectorAll('.word-unit').forEach(function(unit) {
    var hw = unit.querySelector('.hw');
    if (!hw) return;
    var orig = unit.getAttribute('data-h');
    if (orig) {
      var ttMark = _isTranslitTerm(orig) ? '<span class="tt-mark" title="transliterated term">*</span>' : '';
      if (window._noNikkud) hw.innerHTML = _stripNikkudDisplay(orig) + ttMark;
      else hw.innerHTML = orig.replace(/([\u05D0-\u05EA][\u0591-\u05C6]*\u05C7[\u0591-\u05C6]*)/g, '<span class="qq">$1</span>') + ttMark;
    }
  });
    document.querySelectorAll('.chapter-summary-he[data-heb]').forEach(function(el) {
    var orig = el.getAttribute('data-heb');
    el.textContent = window._noNikkud ? _stripNikkudDisplay(orig) : orig;
  });
  try { localStorage.setItem(window.READER.vol + '-no-nikkud', window._noNikkud ? '1' : '0'); } catch(e) {}
  });
}


// === READING POSITION MEMORY ===
// The verse at the top of the view is saved as the reader scrolls; the next
// visit to the same chapter resumes there instead of at the chapter top.
(function() {
  // Verse-based restore is reflow-proof where the browser's pixel restore is
  // not (a mode/font change reflows the chapter) — take over restoration.
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  var t = null;
  window.addEventListener('scroll', function() {
    if (t) return;
    t = setTimeout(function() {
      t = null;
      try {
        // our own restore scrolls must not re-save: the shifted layout would
        // save a different verse and the settle passes would ratchet away
        if (window._rpQuiet && Date.now() < window._rpQuiet) return;
        var chap = window.currentChapterId;
        if (!chap) return;
        var panel = document.getElementById(chap + '-verses');
        if (!panel || panel.offsetHeight === 0) return;
        var yRef = 4, bar = document.querySelector('.sw-top-bar');
        if (bar) { var br = bar.getBoundingClientRect(); if (br.bottom > 0) yRef = br.bottom + 4; }
        var vs = panel.querySelectorAll('.verse');
        for (var i = 0; i < vs.length; i++) {
          var r = vs[i].getBoundingClientRect();
          if (r.height > 0 && r.bottom > yRef) {
            localStorage.setItem(window.READER.vol + '-read-pos', chap + '|' + i);
            break;
          }
        }
      } catch (e) {}
    }, 400);
  }, { passive: true });

  window._restoreReadPos = function() {
    try {
      // an explicit verse deep-link (…&v=5 / …:5) wins over the saved position
      if (/(&v=|:)\d+/.test(decodeURIComponent(location.hash))) return;
      // read the target once — the saver may legitimately overwrite the key
      // between the first restore and the settle passes
      if (window._rpTarget === undefined) window._rpTarget = localStorage.getItem(window.READER.vol + '-read-pos') || null;
      var saved = window._rpTarget;
      if (!saved) return;
      var parts = saved.split('|'), chap = parts[0], vi = parseInt(parts[1], 10) || 0;
      if (!chap || vi <= 0 || chap !== window.currentChapterId) return;
      var panel = document.getElementById(chap + '-verses');
      if (!panel) return;
      var vs = panel.querySelectorAll('.verse');
      if (!vs[vi]) return;
      var bar = document.querySelector('.sw-top-bar');
      var off = (bar && bar.getBoundingClientRect().bottom > 0 ? bar.getBoundingClientRect().bottom : 0) + 8;
      window._rpQuiet = Date.now() + 900;
      window.scrollTo(0, vs[vi].getBoundingClientRect().top + window.scrollY - off);
    } catch (e) {}
  };
})();

// === DUAL MODE ENGLISH TEXT ===
window._englishLoaded = false;
window._englishMap = {};


/** One English chunk (<englishDir>/<verse file>): rows of [book, chapter, verse, english]. */
function registerEnglish(rows) {
  rows.forEach(function(r) { window._englishMap[r[0] + '|' + r[1] + '|' + r[2]] = r[3]; });
  populateEnglishDivs();
}

// INIT: Restore settings
try {
  if (localStorage.getItem(window.READER.vol + '-show-translit') === '1') {
    document.getElementById('btn-translit').classList.add('active');
  } else { document.body.classList.add('hide-translit'); }
} catch(e) { document.body.classList.add('hide-translit'); }
try {
  var savedSize = localStorage.getItem(window.READER.vol + '-font-size');
  if (savedSize) { document.getElementById('page').style.fontSize = savedSize + '%'; document.getElementById('sizeSlider').value = savedSize; }
} catch(e) {}
try {
  if (localStorage.getItem(window.READER.vol + '-no-nikkud') === '1') {
    window._noNikkud = true;
    document.getElementById('btn-nikkud').classList.add('active');
  }
} catch(e) {}
try {
  // The view mode is a reading preference like the toggles above — a Dual
  // reader must not be dropped back to interlinear on every load.
  var _savedMode = localStorage.getItem(window.READER.vol + '-view-mode');
  if (_savedMode === 'heb' || _savedMode === 'dual') setMode(_savedMode);
} catch(e) {}
