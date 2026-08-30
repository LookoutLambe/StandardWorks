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

function getBookChapter(chId) {
  var m = chId.match(/^([a-z0-9]+)-ch(\d+)$/);
  if (!m) return null;
  var book = findBook(m[1]);
  if (!book) return null;
  return { book: book.en, chapter: parseInt(m[2], 10), bookData: book };
}

function getChapterLabel(id) {
  if (!id || id === 'landing') return window.READER.landingTitle;
  var info = getBookChapter(id);
  if (!info) return id;
  return info.book + ' ' + info.chapter;
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
function _stripNikkudDisplay(s) { return s.replace(/ו(ּ[ְ-ׇֻ]|[ְ-ׇֻ]ּ)/g,'וו$1').replace(/[\u0591-\u05BD\u05BF-\u05C0\u05C3-\u05C7]/g, ''); } // geminated vav doubles in plene display: metavvekh -> מתווך, never מתוך

// OT interlinear English under each Hebrew word comes from ot_verses/*.js (curated
// per-word glosses — WLC interlinear, aligned with Blue Letter Bible). Do not
// replace them with Strong's-lemma heuristics here; popups still link Strong's on tap.
window._useStrongsMorphGloss = false;

function _stripHebrewMarks(s) { return (s || '').replace(/[\u0591-\u05C7]/g, ''); }

function _guessAffixParts(heb) {
  // Returns {prefixTokens:[], base:"...", suffixToken:""} using surface heuristics.
  // This is NOT full morphology, but it improves glossing vs Strong's-only.
  var h = (heb || '').replace(/\u05C3/g, ''); // remove sof marker if present
  var noMarks = _stripHebrewMarks(h);
  // split on maqaf, but keep it simple (treat whole as one for Strong's lookup)
  var s = noMarks.replace(/[\u05BE]/g, ''); // maqaf

  var prefixTokens = [];
  var i = 0;
  // Handle very common single-letter prefixes
  while (i < s.length) {
    var ch = s[i];
    // Conjunction ו-
    if (ch === 'ו') { prefixTokens.push('and'); i++; continue; }
    // Prepositions
    if (ch === 'ב') { prefixTokens.push('in'); i++; continue; }
    if (ch === 'ל') { prefixTokens.push('to'); i++; continue; }
    if (ch === 'כ') { prefixTokens.push('as'); i++; continue; }
    if (ch === 'מ') { prefixTokens.push('from'); i++; continue; }
    if (ch === 'ש') { prefixTokens.push('that'); i++; continue; }
    // Definite article ה-
    if (ch === 'ה') { prefixTokens.push('the'); i++; continue; }
    break;
  }

  var base = s.slice(i);

  // Very rough pronominal suffix handling (common forms)
  // These should really come from morphology tags; we keep it conservative.
  var suffixToken = '';
  var sufMap = [
    ['יהם', 'their'], ['יהן', 'their'], ['יכם', 'your'], ['יכן', 'your'],
    ['ינו', 'our'], ['ני', 'my'], ['י', 'my'],
    ['ך', 'your'], ['כם', 'your'], ['כן', 'your'],
    ['ו', 'his'], ['ה', 'her'], ['ם', 'their'], ['ן', 'their']
  ];
  for (var si = 0; si < sufMap.length; si++) {
    var suf = sufMap[si][0];
    if (base.length > suf.length + 1 && base.endsWith(suf)) {
      suffixToken = sufMap[si][1];
      base = base.slice(0, -suf.length);
      break;
    }
  }

  return { prefixTokens: prefixTokens, base: base, suffixToken: suffixToken };
}

function _strongsGlossForHebrew(hebBase) {
  if (!hebBase || !window._strongsLookup || !window._strongsRoots) return '';
  var sNum = _strongsLookup[hebBase] || _strongsLookup[_stripHebrewMarks(hebBase)] || '';
  if (!sNum || !_strongsRoots[sNum]) return '';
  return (_strongsRoots[sNum].g || '').trim();
}

function computeGlossFromHebrew(heb, fallbackGloss) {
  try {
    if (!window._useStrongsMorphGloss) return fallbackGloss;
    var parts = _guessAffixParts(heb);
    var lemmaGloss = _strongsGlossForHebrew(parts.base);
    if (!lemmaGloss) return fallbackGloss;

    var tokens = [];
    parts.prefixTokens.forEach(function(t) { if (t) tokens.push(t); });
    if (parts.suffixToken) tokens.push(parts.suffixToken);

    // Normalize lemma gloss (BLB-style uses short gloss; keep first 1–3 words).
    var lg = lemmaGloss.replace(/\s+/g, ' ').trim();
    // If gloss is a phrase, keep it but avoid overly long definitions.
    if (lg.split(' ').length > 5) lg = lg.split(' ').slice(0, 3).join(' ');

    // Compose into hyphenated gloss like the existing dataset.
    var composed = '';
    if (tokens.length > 0) composed = tokens.join('-') + '-' + lg;
    else composed = lg;

    return composed.replace(/-/g, ' ').trim();
  } catch (e) {
    return fallbackGloss;
  }
}

function makeWordUnit(h, e, isSof) {
  if (h === '\u05C3') return '';
  h = h.replace(/\u05C3/g, '');
  var div = document.createElement('div');
  div.className = 'word-unit' + (isSof ? ' sof' : '');
  div.setAttribute('data-h', h);
  var baseGloss = augmentGlossWithPrefixes(h, e.replace(/-/g, ' '));
  var gloss = computeGlossFromHebrew(h, baseGloss);
  var displayH = window._noNikkud ? _stripNikkudDisplay(h) : h;
  if (!window._noNikkud) displayH = displayH.replace(/([\u05D0-\u05EA][\u0591-\u05C6]*\u05C7[\u0591-\u05C6]*)/g, '<span class="qq">$1</span>');
  div.innerHTML = '<span class="hw">' + displayH + '</span><span class="tl"></span><span class="gl">' + gloss + '</span>';
  if (window.READER.wordUnitExtra) window.READER.wordUnitExtra(div, h);
  return div;
}

function renderWords(words, container, verseKey) {
  var realWords = words.filter(function(w) { return w[0] !== '\u05C3'; });
  var lastRealIdx = realWords.length - 1;
  var realCount = 0;
  words.forEach(function(w, i) {
    var h = w[0], e = w[1];
    if (h === '\u05C3') return;
    var isSof = (i + 1 < words.length && words[i+1][0] === '\u05C3') || (realCount === lastRealIdx);
    var isLastWord = (realCount === lastRealIdx);
    var el = makeWordUnit(h, e, isSof);
    if (el && verseKey) el.setAttribute('data-wid', verseKey + '|' + realCount);
    var chevron = document.createElement('span');
    chevron.className = 'arr';
    var sym = isLastWord ? '\u00ab' : '\u2039';
    chevron.innerHTML = '<span class="arr-hw">\u200B</span><span class="arr-tl">' + sym + '</span><span class="arr-gl">' + sym + '</span>';
    var group = document.createElement('span');
    group.className = 'word-group';
    if (el) group.appendChild(el);
    group.appendChild(chevron);
    container.appendChild(group);
    realCount++;
  });
}

var _verseRegistry = [];
var _pendingRenders = [];
var _renderedChapters = {};

function renderVerseSet(verseData, containerId) {
  var chId = containerId.replace('-verses', '');
  _verseRegistry.push({ chapId: chId, verses: verseData });
  _pendingRenders.push({ verseData: verseData, containerId: containerId, chapId: chId });
}

function _doRenderVerses(verseData, containerId) {
  var chId = containerId.replace('-verses', '');
  var container = document.getElementById(containerId);
  if (!container) return;
  var bkInfo = getBookChapter(chId);
  verseData.forEach(function(v, idx) {
    var verseKey = bkInfo ? (bkInfo.book + '|' + bkInfo.chapter + '|' + (idx + 1)) : '';
    var verseDiv = document.createElement('div');
    verseDiv.className = 'verse';
    if (verseKey) verseDiv.setAttribute('data-verse-key', verseKey);
    var numDiv = document.createElement('div');
    numDiv.className = 'verse-num';
    numDiv.textContent = v.num;
    var arabicNum = document.createElement('span');
    arabicNum.className = 'verse-num-arabic';
    arabicNum.textContent = idx + 1;
    numDiv.appendChild(arabicNum);
    verseDiv.appendChild(numDiv);
    var flowDiv = document.createElement('div');
    flowDiv.className = 'word-flow';
    renderWords(v.words, flowDiv, verseKey);
    verseDiv.appendChild(flowDiv);
    var engDiv = document.createElement('div');
    engDiv.className = 'verse-english';
    if (verseKey) engDiv.setAttribute('data-key', verseKey);
    verseDiv.appendChild(engDiv);
    container.appendChild(verseDiv);
  });
}

function _ensureChapterRendered(chapId) {
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

  // Prefetch/render adjacent chapters during idle time so next/prev feels instant.
  scheduleAdjacentPrefetch();
}

function scheduleAdjacentPrefetch() {
  if (!currentPageId || typeof _ensureChapterRendered !== 'function') return;
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx < 0) return;
  var nextId = (idx >= 0 && idx < fullPageOrder.length - 1) ? fullPageOrder[idx + 1] : null;
  var prevId = (idx > 0) ? fullPageOrder[idx - 1] : null;

  function isChapter(id) { return id && id !== 'landing'; }
  function run() {
    try {
      if (isChapter(nextId)) _ensureChapterRendered(nextId);
      if (isChapter(prevId)) _ensureChapterRendered(prevId);
    } catch (e) {}
  }

  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 250);
}

// (The Mechon-Mamre audio feature was removed entirely on 2026-08-29 —
// user ruling: no audio anywhere in this.)

// === MODE CONTROLS ===

// Switching view mode (or translit/nikkud) reflows every verse above the
// reading point, so a raw pixel scroll position lands somewhere else — the
// verse being read must stay put. Pin the topmost visible verse across the
// relayout and scroll by however far it moved.
function _keepVersePosition(apply) {
  var yRef = 4;
  var bar = document.querySelector('.sw-top-bar');
  if (bar) { var br = bar.getBoundingClientRect(); if (br.bottom > 0) yRef = br.bottom + 4; }
  var anchor = null, verses = document.querySelectorAll('.verse');
  for (var i = 0; i < verses.length; i++) {
    var r = verses[i].getBoundingClientRect();
    if (r.height > 0 && r.bottom > yRef) {
      // A verse straddling the header line anchors by its BOTTOM edge — the
      // boundary being read — so its own height change (interlinear verses
      // are far taller than dual ones) cannot drag the next verse away.
      var straddle = r.top < yRef;
      anchor = { el: verses[i], pos: straddle ? r.bottom : r.top, straddle: straddle };
      break;
    }
  }
  apply();
  if (anchor) {
    var nr = anchor.el.getBoundingClientRect();
    var np = anchor.straddle ? nr.bottom : nr.top;
    if (np !== anchor.pos) window.scrollBy(0, np - anchor.pos);
  }
}

function setMode(mode) {
  _keepVersePosition(function() {
  document.body.classList.remove('hide-gloss', 'dual-mode');
  document.querySelectorAll('.controls-bottom button:not(#btn-translit):not(#btn-nikkud)').forEach(function(b) { b.classList.remove('active'); });
  if (mode === 'heb') {
    document.body.classList.add('hide-gloss');
    document.getElementById('btn-heb').classList.add('active');
  } else if (mode === 'dual') {
    document.body.classList.add('dual-mode');
    document.getElementById('btn-dual').classList.add('active');
    if (!window._englishLoaded) loadEnglishText();
  } else {
    document.getElementById('btn-inter').classList.add('active');
  }
  });
  try { localStorage.setItem(window.READER.vol + '-view-mode', mode || 'inter'); } catch(e) {}
}

function toggleTranslit() {
  _keepVersePosition(function() {
  document.body.classList.toggle('hide-translit');
  var btn = document.getElementById('btn-translit');
  btn.classList.toggle('active');
  try { localStorage.setItem(window.READER.vol + '-show-translit', btn.classList.contains('active') ? '1' : '0'); } catch(e) {}
  });
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
      if (window._noNikkud) hw.textContent = _stripNikkudDisplay(orig);
      else hw.innerHTML = orig.replace(/([\u05D0-\u05EA][\u0591-\u05C6]*\u05C7[\u0591-\u05C6]*)/g, '<span class="qq">$1</span>');
    }
  });
    document.querySelectorAll('.chapter-summary-he[data-heb]').forEach(function(el) {
    var orig = el.getAttribute('data-heb');
    el.textContent = window._noNikkud ? _stripNikkudDisplay(orig) : orig;
  });
  try { localStorage.setItem(window.READER.vol + '-no-nikkud', window._noNikkud ? '1' : '0'); } catch(e) {}
  });
}

function setSize(val) {
  _keepVersePosition(function() {
  document.getElementById('page').style.fontSize = val + '%';
  });
  try { localStorage.setItem(window.READER.vol + '-font-size', val); } catch(e) {}
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

function loadEnglishText() {
  if (window._englishLoaded) return;
  var _engData = window[window.READER.englishData];
  if (!_engData) {
    // The INIT view-mode restore calls this BEFORE the english data script
    // tag has run — without a retry, saved-dual pages rendered a permanently
    // empty English column. Retry once every page script has executed.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadEnglishText);
    return;
  }
  _engData.forEach(function(v) {
    window._englishMap[v.book + '|' + v.chapter + '|' + v.verse] = v.english;
  });
  window._englishLoaded = true;
  populateEnglishDivs();
}

function populateEnglishDivs() {
  document.querySelectorAll('.verse-english[data-key]').forEach(function(div) {
    var key = div.getAttribute('data-key');
    if (window._englishMap[key]) div.textContent = window._englishMap[key];
  });
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
