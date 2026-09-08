/**
 * reader_ui.js — the shared sibling reader, part 2 (post-data): navigation,
 * annotations, selection toolbar, search, transliteration, popups, glossary.
 * Extracted VERBATIM from ot.html (canon) on 2026-08-29 — see reader_core.js.
 */


// PREV / NEXT NAVIGATION
var currentChapterId = null;
var currentPageId = 'landing';
var fullPageOrder = ['landing'].concat(window.READER.extraPages || []).concat(chapterOrder);


// Initialize nav buttons for the landing page on load — mirrors bom.html's
// own boot-time call (its one reader NOT on this shared file). Without it,
// #nav-prev/#nav-next keep the `disabled` attribute they're born with in
// the HTML until the first navTo() call, and a plain visit with no URL
// hash never makes one (handleHash() below returns immediately when there
// is no hash) — so the visible dock Next/Prev buttons, which mirror THESE
// hidden legacy elements' .disabled state (nav_engine.js syncDockChapterNav),
// stay wrongly stuck disabled/enabled on every landing page until the
// reader navigates once by some other means. Safe to call this early:
// currentChapterId is still null here, so it only touches the landing
// branch (window.READER.navLabelHe), never the per-page getChapterLabel
// override that a page-specific script may still define after this file.
updateNavButtons();

// === HEBREW TRANSLITERATION ===
/* The transliterator moved to translit.js — one copy for all six volumes.
   It lived here AND inline in bom.html, and the two wrappers had quietly
   diverged while only the engine between them was ever compared. */
// The transliterated-term mark (Adam-ondi-Ahman*) is display-only and never
// reaches the rules: the star is not a letter.
/* The transliterator was forked into bom/bom.html, and the two drifted: 789 of
   107,318 distinct forms came out differently, and bom's copy was the better
   one on every class that could be settled against the corpus —

     shva     shulchan / urvot / haumnam, not shulechan / urevot / haumenam
              (a shva in a closed syllable is nach, and 389 forms turned on it);
     qamats   yadata / karban, not yadota / korban. THIS corpus marks qamats
              qatan EXPLICITLY with U+05C7 (10,353 of them: חׇכְמָה, כׇּל), so a
              plain U+05B8 is gadol and there is nothing to guess. reader_ui was
              inferring qatan from context and overriding the data, 210 times;
     holam-vav avonam, not onam — עֲוֹן is consonantal.

   bom's _tlPointed is therefore the copy that stands, and this is it. What does
   NOT come across is _tlReceived, which bom has no equivalent of and which
   _translitRaw still consults before the mechanical rules — the Abraham 3
   astronomy names and שְׂמֹאול, where bom's rules read the mater vav after the
   aleph as consonantal and produce semovl. */
function openShortcuts() { document.getElementById('shortcuts-overlay').classList.add('open'); }
function closeShortcuts() { document.getElementById('shortcuts-overlay').classList.remove('open'); }


// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openSearch(); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') { closeAllPanels(); e.preventDefault(); return; }
  if (e.key === 'ArrowLeft') { goNext(); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { goPrev(); e.preventDefault(); }
  else if (e.key === '1') { setMode('inter'); }
  else if (e.key === '2') { setMode('heb'); }
  else if (e.key === '3') { setMode('dual'); }   // adopted from jst 2026-08-29
  else if (e.key === 'd' || e.key === 'D') { toggleDarkMode(); }
  else if (e.key === 's' || e.key === 'S') { openSearch(); }
  else if (e.key === 'g' || e.key === 'G') { openGlossary(); }
  else if (e.key === 'n' || e.key === 'N') { openAnnotationsPanel(); }
  else if (e.key === 'b' || e.key === 'B') { if (window.NavEngine) NavEngine.toggle(); }
  else if (e.key === '?') { openShortcuts(); }
});


// HISTORY: Make chapter navigation create real Back/Forward entries.
//
// RETURN — "put me back". Back has to restore the VERSE you were on, not the
// top of the chapter. Follow a cross-reference out of Genesis 1:20 and your
// place has to still be there when you come back, or the corpus stops being
// explorable and people stop following references at all.
//
// So: before pushing the destination, stamp the verse being LEFT onto the
// entry we are leaving (replaceState). On the way back the browser restores
// that URL and fires hashchange -> handleHash(), which already knows how to
// read &v= and scroll to it. The probe must run BEFORE the inner navTo,
// while the old panel is still on screen and NavEngine still holds the old
// chapter — afterwards there is nothing left to measure.
//
// The destination is pushed CLEAN. The old code copied the current hash's
// &v= onto the NEW chapter's entry, so paging Genesis 1 (at verse 20) into
// Genesis 2 wrote "#gen-ch2&v=20" — a Back/Forward pair then dropped you at
// verse 20 of a chapter you had never scrolled.
(function() {
  var _navHist = window.navTo;
  window.navTo = function(id, slideDir) {
    var leavingId = window.currentPageId;
    var leavingVerse = 0;
    try {
      if (leavingId && leavingId !== 'landing' && leavingId !== id &&
          window.NavEngine && typeof NavEngine.currentVerseNum === 'function') {
        leavingVerse = NavEngine.currentVerseNum() || 0;
      }
    } catch (e) {}
    _navHist(id, slideDir);
    if (window.__swNavDeferred) return;   // the loader's hand-off pass — the completed pass pushes
    try {
      if (window.__swNavFromHash) return;
      if (leavingVerse) history.replaceState(null, '', '#' + leavingId + '&v=' + leavingVerse);
      if (id && id !== 'landing') history.pushState(null, '', '#' + id);
      else history.pushState(null, '', window.location.pathname);
    } catch (e) {}
  };
})();

// PAGE-FLIP ANIMATION
(function() {
  var _navFade = window.navTo;
  window.navTo = function(id, slideDir) {
    _navFade(id, slideDir);
    if (window.__swNavDeferred) return;   // book still loading — the old page stays exactly as it is
    document.querySelectorAll('.chapter-panel').forEach(function(p) { p.classList.remove('fade-in', 'slide-left', 'slide-right'); });
    setTimeout(function() {
      document.querySelectorAll('.chapter-panel').forEach(function(p) {
        if (p.style.display !== 'none') {
          p.classList.add(slideDir ? (slideDir === 'next' ? 'slide-right' : 'slide-left') : 'fade-in');
        }
      });
    }, 20);
  };
})();

// (audio word-highlight removed with the audio feature, 2026-08-29)

// VERSE HIGHLIGHTING

// === ROOT MAP + MORPHOLOGICAL ANALYSIS ===

// Strip common Hebrew prefixes to get closer to root/lemma
function stripPrefixes(w) {
  w = w.replace(/^.*\u05BE/, ''); // remove maqaf-joined particles
  var prefixes = [
    /^\u05D5\u05B0/, /^\u05D5\u05B7/, /^\u05D5\u05BC/, /^\u05D5\u05B8/, /^\u05D5\u05B6/,
    /^\u05D4\u05B7/, /^\u05D4\u05B8/, /^\u05D4\u05B6/,
    /^\u05D1\u05BC\u05B0/, /^\u05D1\u05BC\u05B7/, /^\u05D1\u05BC\u05B4/, /^\u05D1\u05BC\u05B8/, /^\u05D1\u05BC\u05B6/, /^\u05D1\u05B0/, /^\u05D1\u05B7/, /^\u05D1\u05B4/,
    /^\u05DC\u05B0/, /^\u05DC\u05B7/, /^\u05DC\u05B4/, /^\u05DC\u05B8/, /^\u05DC\u05B6/,
    /^\u05DE\u05B4/, /^\u05DE\u05B5/, /^\u05DE\u05B0/, /^\u05DE\u05B7/,
    /^\u05DB\u05BC\u05B0/, /^\u05DB\u05BC\u05B7/, /^\u05DB\u05B0/, /^\u05DB\u05B7/,
    /^\u05E9\u05C1\u05B6/, /^\u05E9\u05C1\u05B6/
  ];
  var stripped = w;
  for (var i = 0; i < prefixes.length; i++) {
    if (prefixes[i].test(stripped) && stripped.replace(prefixes[i], '').length >= 2) {
      stripped = stripped.replace(prefixes[i], ''); break;
    }
  }
  for (var j = 0; j < prefixes.length; j++) {
    if (prefixes[j].test(stripped) && stripped.replace(prefixes[j], '').length >= 2) {
      stripped = stripped.replace(prefixes[j], ''); break;
    }
  }
  return stripped;
}

// Progressive peels, shallowest first — mirrors RootEngine.stripLayers. A
// lookup chain must try the one-layer form before the two-layer one: the
// longest remainder wins (בַּבְּכוֹר stops at בְּכוֹר, never reaches כוֹר).
function _stripLayersUI(w) {
  if (window.RootEngine && window.RootEngine.stripLayers) return window.RootEngine.stripLayers(w);
  var s1 = stripPrefixes(w);   // NB: this local copy is two-layer; fall back to [w, deep]
  return s1 === w ? [w] : [w, s1];
}
function _strongsLayered(w) {
  if (!window._strongsLookup) return '';
  var L = _stripLayersUI(w), s = '', i;
  for (i = 0; i < L.length && !s; i++) s = _strongsLookup[L[i]] || '';
  for (i = 0; i < L.length && !s; i++) s = _strongsLookup[_stripNikkud(L[i])] || '';
  return s;
}

function normFinals(s) {
  return s.replace(/\u05DA/g,'\u05DB').replace(/\u05DD/g,'\u05DE').replace(/\u05DF/g,'\u05E0').replace(/\u05E3/g,'\u05E4').replace(/\u05E5/g,'\u05E6');
}

var sofitMap = {'\u05DB':'\u05DA','\u05DE':'\u05DD','\u05E0':'\u05DF','\u05E4':'\u05E3','\u05E6':'\u05E5'};
/* Stays here with the map it reads. It went out with the transliterator by
   mistake and broke on arrival — sofitMap did not travel with it — which is
   the whole argument for keeping a function next to its data. bom.html gets
   the identical implementation from root_engine.js. */
function toSofit(s) {
  if (!s || s.length === 0) return s;
  var last = s[s.length - 1];
  return sofitMap[last] ? s.slice(0, -1) + sofitMap[last] : s;
}
function extractRoot(cons) {
  var s = normFinals(cons);
  if (s.length <= 3) return s;
  if (s.length === 0) return cons;
  var sufs = [
    '\u05EA\u05D9\u05D4\u05DD','\u05D5\u05EA\u05D9\u05D4\u05DD','\u05D5\u05EA\u05D9\u05E0\u05D5',
    '\u05D9\u05D4\u05DD','\u05D9\u05D4\u05DF','\u05D5\u05EA\u05DD','\u05D5\u05EA\u05DF','\u05EA\u05D9\u05D5','\u05EA\u05D9\u05D4','\u05EA\u05E0\u05D5',
    '\u05DB\u05DD','\u05DB\u05DF','\u05E0\u05D5','\u05EA\u05D9','\u05EA\u05DD','\u05EA\u05DF','\u05D9\u05DD','\u05D5\u05EA','\u05D5\u05DF','\u05D9\u05DF','\u05D4\u05DD','\u05D4\u05DF',
    '\u05D4','\u05D5','\u05DD','\u05DF','\u05D9','\u05EA','\u05DB'
  ];
  var stem = s;
  for (var i = 0; i < sufs.length; i++) {
    if (stem.length > sufs[i].length + 2 && stem.endsWith(sufs[i])) { stem = stem.slice(0, -sufs[i].length); break; }
  }
  if (stem.length === 3) return stem;
  if (stem.length >= 5 && (stem.slice(0,2) === '\u05D4\u05EA' || stem.slice(0,2) === '\u05DE\u05EA')) { stem = stem.slice(2); }
  else if (stem.length >= 4 && /^[\u05D4\u05D9\u05EA\u05D0\u05E0\u05DE]/.test(stem)) { stem = stem.slice(1); }
  if (stem.length === 3) return stem;
  if (stem.length === 4 && stem[1] === stem[2]) return stem[0] + stem[1] + stem[3];
  for (var j = 0; j < sufs.length; j++) {
    if (stem.length > sufs[j].length + 2 && stem.endsWith(sufs[j])) { stem = stem.slice(0, -sufs[j].length); break; }
  }
  if (stem.length === 3) return stem;
  if (stem.length >= 4 && /^[\u05D4\u05D9\u05EA\u05D0\u05E0\u05DE]/.test(stem)) { stem = stem.slice(1); }
  if (stem.length === 3) return stem;
  if (stem.length === 4 && stem[1] === stem[2]) return stem[0] + stem[1] + stem[3];
  return stem.length > 3 ? stem.slice(0, 3) : stem;
}

var rootMap = {
  '\u05D7\u05B6\u05E1\u05B6\u05D3': '\u05D7\u05E1\u05D3', '\u05D7\u05B7\u05E1\u05B0\u05D3\u05BC\u05D5\u05B9': '\u05D7\u05E1\u05D3', '\u05D7\u05B2\u05E1\u05B8\u05D3\u05B8\u05D9\u05D5': '\u05D7\u05E1\u05D3',
  '\u05D2\u05BC\u05B8\u05D0\u05B7\u05DC': '\u05D2\u05D0\u05DC', '\u05D2\u05BC\u05B9\u05D0\u05B5\u05DC': '\u05D2\u05D0\u05DC', '\u05D2\u05BC\u05B0\u05D0\u05BB\u05DC\u05BC\u05B8\u05D4': '\u05D2\u05D0\u05DC',
  '\u05D1\u05BC\u05B0\u05E8\u05B4\u05D9\u05EA': '\u05D1\u05E8\u05EA', '\u05D4\u05B7\u05D1\u05BC\u05B0\u05E8\u05B4\u05D9\u05EA': '\u05D1\u05E8\u05EA',
  '\u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD': '\u05D0\u05DC\u05D4\u05D9\u05DD', '\u05D4\u05B8\u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD': '\u05D0\u05DC\u05D4\u05D9\u05DD',
  '\u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4': '\u05EA\u05D5\u05E8', '\u05D4\u05B7\u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4': '\u05EA\u05D5\u05E8', '\u05EA\u05BC\u05D5\u05B9\u05E8\u05B7\u05EA': '\u05EA\u05D5\u05E8',
  '\u05DE\u05B6\u05DC\u05B6\u05DA\u05B0': '\u05DE\u05DC\u05DB', '\u05D4\u05B7\u05DE\u05BC\u05B6\u05DC\u05B6\u05DA\u05B0': '\u05DE\u05DC\u05DB', '\u05DE\u05B0\u05DC\u05B8\u05DB\u05B4\u05D9\u05DD': '\u05DE\u05DC\u05DB',
  '\u05DE\u05B4\u05E9\u05C1\u05B0\u05E4\u05BC\u05B8\u05D8': '\u05E9\u05E4\u05D8', '\u05D4\u05B7\u05DE\u05BC\u05B4\u05E9\u05C1\u05B0\u05E4\u05BC\u05B8\u05D8': '\u05E9\u05E4\u05D8',
  '\u05E0\u05B8\u05D1\u05B4\u05D9\u05D0': '\u05E0\u05D1\u05D0', '\u05D4\u05B7\u05E0\u05BC\u05B8\u05D1\u05B4\u05D9\u05D0': '\u05E0\u05D1\u05D0', '\u05E0\u05B0\u05D1\u05B4\u05D9\u05D0\u05B4\u05D9\u05DD': '\u05E0\u05D1\u05D0',
  '\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD': '\u05E9\u05DC\u05DD', '\u05D4\u05B7\u05E9\u05C1\u05BC\u05B8\u05DC\u05D5\u05B9\u05DD': '\u05E9\u05DC\u05DD',
  '\u05DE\u05B8\u05E9\u05C1\u05B4\u05D9\u05D7\u05B7': '\u05DE\u05E9\u05D7', '\u05D4\u05B7\u05DE\u05BC\u05B8\u05E9\u05C1\u05B4\u05D9\u05D7\u05B7': '\u05DE\u05E9\u05D7',
  '\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD': '\u05E2\u05DC\u05DD', '\u05DC\u05B0\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD': '\u05E2\u05DC\u05DD',
  '\u05D9\u05B0\u05E8\u05D5\u05BC\u05E9\u05C1\u05B8\u05DC\u05B7\u05D9\u05B4\u05DD': '\u05D9\u05E8\u05E9\u05DC\u05DD',
  '\u05D3\u05BC\u05B8\u05D5\u05B4\u05D3': '\u05D3\u05D5\u05D3', '\u05DC\u05B0\u05D3\u05B8\u05D5\u05B4\u05D3': '\u05D3\u05D5\u05D3',
  '\u05D9\u05B4\u05E9\u05C2\u05B0\u05E8\u05B8\u05D0\u05B5\u05DC': '\u05D9\u05E9\u05E8\u05D0\u05DC'
};

function getRoot(hw) {
  // Canonical resolution lives in root_engine.js (generated from bom/bom.html).
  // Delegating keeps the cross-reference keys, the scorecard and the glossary on
  // ONE set of root keys. This page's own cascade below ends in a truncating
  // extractRoot() that invented keys — כָּאָרֶץ became "כאר", אַרְצוֹתֵינוּ became
  // "ארצ" — so _rootXrefs was keyed differently from the popup and the
  // "Cross-References for root" link never matched. Kept only as a fallback for
  // the case where root_engine.js fails to load.
  if (window.RootEngine && window.RootEngine.getRoot) return window.RootEngine.getRoot(hw);
  // Try Strong's-based root first
  if (window._strongsLookup && window._strongsRoots) {
    var sNum = _strongsLayered(hw);
    if (sNum && _strongsRoots[sNum]) {
      var entry = _strongsRoots[sNum];
      // Return the word's OWN lexeme. Strong's derivation parents (entry.r) are
      // 19th-century etymology (e.g. בן ← בנה) — separate words, not learning roots.
      return sNum;
    }
  }
  // Fallback to old algorithmic root
  if (rootMap[hw]) return rootMap[hw];
  var stripped2 = stripPrefixes(hw);
  if (rootMap[stripped2]) return rootMap[stripped2];
  return extractRoot(_stripNikkud(stripped2));
}

// Build frequency maps by root
var rootFreq = {};
var wordToRoot = {};
var wordFreq = {};
for (var ri = 0; ri < _verseRegistry.length; ri++) {
  var reg = _verseRegistry[ri];
  var bk = getBookChapter(reg.chapId);
  for (var vi = 0; vi < reg.verses.length; vi++) {
    var vWords = reg.verses[vi].words;
    var vk = bk ? (bk.book + '|' + bk.chapter + '|' + (vi + 1)) : '';
    for (var wi = 0; wi < vWords.length; wi++) {
      var h = vWords[wi][0], g = vWords[wi][1].replace(/-/g, ' ');
      if (h === '\u05C3' || !g.trim()) continue;
      var root = getRoot(h);
      wordToRoot[h] = root;
      if (!rootFreq[root]) rootFreq[root] = { count: 0, glosses: {}, forms: {}, exampleVerse: '', verseRefs: {} };
      rootFreq[root].count++;
      rootFreq[root].glosses[g] = (rootFreq[root].glosses[g] || 0) + 1;
      rootFreq[root].forms[h] = (rootFreq[root].forms[h] || 0) + 1;
      if (vk) { rootFreq[root].verseRefs[vk] = (rootFreq[root].verseRefs[vk] || 0) + 1; if (!rootFreq[root].exampleVerse) rootFreq[root].exampleVerse = vk; }
      if (!wordFreq[h]) wordFreq[h] = { count: 0, glosses: {} };
      wordFreq[h].count++;
      wordFreq[h].glosses[g] = (wordFreq[h].glosses[g] || 0) + 1;
    }
  }
}

// === ENHANCED WORD POPUP ===
(function() {
  var popup = document.getElementById('word-popup');
  var popupHw = document.getElementById('popup-hw');
  var popupGl = document.getElementById('popup-gl');
  var popupDetail = document.getElementById('popup-detail');
  var popupStrong = document.getElementById('popup-strong');

  document.addEventListener('click', function(e) {
    if (e.target.closest('#sel-toolbar')) return;
    if (e.target.closest('#word-popup')) return;
    /* The card OPENED this panel, so a click inside it is not "the reader
       moved on" — it is the same study gesture continuing. Without this the
       card was destroyed by the first tap in the panel it had just launched.
       The list lives in reader_surface.js: the glossary belongs to it too. */
    if (_swInsideCardPanel(e.target)) return;
    var wu = e.target.closest('.word-unit');
    if (!wu) { closePopup(); return; }
    if (e.target.closest('.verse-num')) return;
    if ('ontouchstart' in window && window.__readerTouchBurstLen && window.__readerTouchBurstLen() >= 2) {
      window.__readerTouchBurstClear();
      return;
    }
    var hw = wu.querySelector('.hw'), gl = wu.querySelector('.gl');
    if (!hw || !gl) return;
    window._popupWordUnit = wu;
    var hText = hw.textContent, gText = gl.textContent;
    hText = hText.replace(/^[\s.,;:?!()]+|[\s.,;:?!()]+$/g, '');
    // A transliterated term (RootScorecard's exception table: Adam-ondi-Ahman,
    // Ahman, Shedolamak) gets its note, never a root or a Strong's number.
    var _ttTerm = !!(window.RootScorecard && RootScorecard.translitTermParts && RootScorecard.translitTermParts(hText).all);
    popupHw.textContent = hText;
    document.getElementById('popup-translit').textContent = transliterate(hText);
    popupGl.textContent = gText;

    // Strong's H-number
    var strongsNum = _ttTerm ? '' : _strongsLayered(hText);
    /* THE SCORECARD CARRIES THE NUMBER NOW, as a quiet marker at the end of the
       meaning line. This row read "Strong’s: H0430 — gods", and that archaic
       headword sat directly under the card's own gloss "God", where it read as
       a contradiction rather than a citation. The row stays for the fallback
       path — a page without RootScorecard still needs the number somewhere. */
    if (strongsNum && window.RootScorecard) {
      popupStrong.style.display = 'none';
    } else if (strongsNum) {
      // The lexeme's own definition, so a derived noun explains itself:
      // לֶקַח H3948 "learning, doctrine" beside its root לקח "take".
      var sEntry = window._strongsRoots && window._strongsRoots[strongsNum];
      var gEntry = window._rootGlossaryData && window._rootGlossaryData[strongsNum];
      var sDef = (gEntry && gEntry.meaning) || (sEntry && sEntry.g) || '';
      /* NO EXTERNAL LEXICON. This linked out to blueletterbible.org, which took
         the reader off the app to look up a word the app already defines; the
         number now opens our own dictionary. */
      popupStrong.innerHTML = "Strong\u2019s: <span class='popup-strong-link' role='button' tabindex='0' data-strongs='" + strongsNum + "'>" + strongsNum + "</span>" +
        (sDef ? " <span style=\"font-style:italic;opacity:0.8;\">\u2014 " + sDef + "</span>" : "");
      popupStrong.style.display = '';
    } else {
      popupStrong.style.display = 'none';
    }

    // Root-based frequency
    var root = _ttTerm ? '' : (wordToRoot[hText] || getRoot(hText));
    var rInfo = _ttTerm ? null : rootFreq[root];
    // Lexeme line: this word's own dictionary entry (clearer for learners than the parent root)
    var lemmaLine = '';
    if (window.getLemmaStrongs && window._strongsRoots) {
      var lemNum = getLemmaStrongs(hText);
      if (lemNum && lemNum !== root && _strongsRoots[lemNum]) {
        var lemE = _strongsRoots[lemNum];
        lemmaLine = 'Word: <span style="font-family:David Libre,serif">' + (lemE.w || '') + '</span>' +
          (lemE.x ? ' <span style="font-size:0.85em;opacity:0.7;">(' + ((typeof transliterate === 'function' && lemE.w ? transliterate(lemE.w) : '') || lemE.x) + ')</span>' : '') +
          (lemE.g ? ' \u2014 ' + lemE.g : '') + '<br>';
      }
    }
    var sInfo = wordFreq[hText];
    var detailHtml = '';
detailHtml += '<div class="rsc-slot">';   // RootScorecard upgrades this block with cross-volume counts
    if (rInfo) {
      var verseCount = rInfo.verseRefs ? Object.keys(rInfo.verseRefs).length : 0;
      var rootDisplay = '', rootMeaning = '';
      var isStrongsRoot = /^H\d+$/.test(root) && window._strongsRoots;
      if (isStrongsRoot) {
        var rootEntry = _strongsRoots[root];
        if (rootEntry) {
          rootDisplay = '<span style="font-family:David Libre,serif">' + rootEntry.w + '</span> <span style="font-size:0.85em;opacity:0.7;">(' + ((typeof transliterate === 'function' && rootEntry.w ? transliterate(rootEntry.w) : '') || rootEntry.x) + ')</span>';
          // Exactness: prefer the site's own curated/observed glosses;
          // Strong's abridged one-word gloss only as a last resort.
          var strongsGloss = rootEntry.g || '';
          if (!rootMeaning) {
            var consRoot = _stripNikkud(rootEntry.w);
            var curatedRoot = (window._rootGlossaryData || {})[consRoot] || {};
            rootMeaning = curatedRoot.meaning || '';
          }
        }
      } else {
        rootDisplay = '(<span style="font-family:David Libre,serif">' + toSofit(root) + '</span>) <span style="font-size:0.85em;opacity:0.7;">' + transliterate(toSofit(root)) + '</span>';
        var curatedRoot = (window._rootGlossaryData || {})[root] || {};
        rootMeaning = curatedRoot.meaning || '';
      }
      if (!rootMeaning) {
        var glossPairs = Object.entries(rInfo.glosses).sort(function(a,b) { return b[1]-a[1]; });
        var seen = {}, meanings = [];
        glossPairs.forEach(function(pair) {
          var m = pair[0].replace(/^(and-|the-|to-|in-|from-|as-|that-|by-|for-|with-|a-|an-|his-|her-|their-|my-|our-|your-|its-)+/g,'').replace(/-/g,' ').trim();
          if (m && !seen[m] && m.length > 1) { seen[m] = true; meanings.push(m); }
        });
        rootMeaning = meanings.slice(0, 4).join(', ');
      }
      if (!rootMeaning && typeof strongsGloss === 'string') rootMeaning = strongsGloss;
      detailHtml += lemmaLine + '<span style="cursor:pointer;text-decoration:none;color:var(--tap-blue,var(--here));" onclick="event.stopPropagation();openGlossaryAtRoot(\'' + root.replace(/'/g,"\\'") + '\')">Root ' + rootDisplay + '</span> \u2014 ' + rInfo.count + ' uses in ' + verseCount + ' verses';
      if (rootMeaning) detailHtml += '<br><span style="font-style:italic;color:var(--ink-light);font-size:0.9em;">' + rootMeaning + '</span>';
      var formKeys = Object.keys(rInfo.forms);
      if (formKeys.length > 1) {
        var sortedForms = Object.entries(rInfo.forms).sort(function(a,b) { return b[1]-a[1]; });
        detailHtml += '<br><span>Forms:</span> ' + sortedForms.slice(0, 5).map(function(pair) {
          return '<span style="font-family:David Libre,serif">' + pair[0] + '</span> (' + pair[1] + 'x)';
        }).join(', ');
      }
      detailHtml += '<br><span style="cursor:pointer;color:var(--accent);text-decoration:underline;font-size:0.9em;" onclick="event.stopPropagation();closePopup();openRootXrefPanel(\'' + root.replace(/'/g,"\\'") + '\')">View all references \u2192</span>';
    } else if (_ttTerm) {
      detailHtml += RootScorecard.ttNoteHtml(hText);
    } else {
      // No sInfo means the form is not in this volume's verse text at all —
      // chapter-summary vocabulary is the usual case, since wordFreq is built
      // from _verseRegistry only. Printing "Occurrences: 1" there invented a
      // count for a word that occurs zero times in the corpus; say so instead.
      if (sInfo) detailHtml += '<span>Occurrences:</span> ' + sInfo.count;
      else detailHtml += '<span style="font-style:italic;color:var(--ink-2);font-size:0.9em;">Not in the verse text \u2014 chapter summary only</span>';
    }
    if (sInfo && Object.keys(sInfo.glosses).length > 1) {
      var sorted = Object.entries(sInfo.glosses).sort(function(a,b) { return b[1]-a[1]; });
      detailHtml += '<br><span>Also glossed:</span> ' + sorted.slice(0, 4).map(function(pair) { return '"' + pair[0] + '" (' + pair[1] + 'x)'; }).join(', ');
    }
detailHtml += '</div>';
    // The study-link row is shared with bom.html — see xref_common.js.
    var directXref = wu.getAttribute('data-xref-ref');
    var directXrefKey = wu.getAttribute('data-xref-key');
    var rootXrefs = window._rootXrefs && window._rootXrefs[root];
    /* COUNT WHAT THE PANEL WILL SHOW. This said rootXrefs.length — the number
       of study-footnote MARKERS on the root — while the panel lists the unique
       references those markers point at, so אלהים promised 8 and opened 13.
       The engine owns that dedup and is asked for the figure; markers are the
       fallback when it has not loaded. */
    detailHtml += window.SWXref.studyLinksHtml({
      directCount: directXref ? ((JSON.parse(directXref).refs || []).length) : 0,
      rootCount:   !rootXrefs ? 0
        : (typeof window.CrossrefsRootRefCount === 'function'
            ? window.CrossrefsRootRefCount(root) : rootXrefs.length)
    });
    popupDetail.innerHTML = detailHtml;

    // Bind xref links
    if (window.RootScorecard) RootScorecard.fill(popupDetail.querySelector('.rsc-slot'), (wu.getAttribute && wu.getAttribute('data-h')) || hText, gText);
    var directLink = popupDetail.querySelector('.popup-xref-direct');
    if (directLink && directXref) {
      directLink.addEventListener('click', function(ev) {
        ev.stopPropagation();
        openXrefPanel(JSON.parse(wu.getAttribute('data-xref-ref')), wu.getAttribute('data-xref-key'), (window.getLemmaStrongs && getLemmaStrongs(hText)) || root);
      });
    }
    /* The legacy Strong's row, when it is shown at all, opens the app's own
       dictionary too — never an external lexicon. */
    var sLink = popupStrong && popupStrong.querySelector('.popup-strong-link');
    if (sLink && typeof window.openGlossaryAtRoot === 'function') {
      sLink.addEventListener('click', function (ev) {
        ev.stopPropagation();
        window.openGlossaryAtRoot(sLink.getAttribute('data-strongs') || '');
      });
    }
    var xrefLink = popupDetail.querySelector('.popup-xref-link');
    if (xrefLink) {
      xrefLink.addEventListener('click', function(ev) {
        ev.stopPropagation();
        /* THE CARD STAYS. Cross-references are a deeper view of the word the
           card is about, not a departure from it — closing the card here threw
           away the reader's context the moment they asked for more of it, and
           left nothing to come back to. The panel opens over it; closing the
           panel gives the card back. */
        openRootXrefPanel(root);
      });
    }

    // Scorecard opens centered on screen — word-anchored placement ran
    // off-screen on phones and made study impossible.
    popup.style.display = 'block';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.maxWidth = 'min(460px, 92vw)';
    popup.style.maxHeight = '78vh';
    popup.style.overflowY = 'auto';
    popup.style.webkitOverflowScrolling = 'touch';
  });
})();


document.addEventListener(
  'pointerdown',
  function (e) {
    var wp = document.getElementById('word-popup');
    if (!wp || wp.style.display !== 'block') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('#word-popup')) return;
    if (e.target.closest('#sel-toolbar')) return;
    if (e.target.closest('.word-unit')) return;
    /* The cross-reference panel is the card's OWN deeper view, launched from a
       link on the card. This capture-phase guard runs before every other
       handler, so without the exclusion the card was destroyed by the very tap
       that opened the panel — and the reader lost the word they were studying
       at the moment they asked to see more of it. */
    if (_swInsideCardPanel(e.target)) return;   /* xref AND glossary — see SW_CARD_PANELS */
    closePopup();
  },
  true
);

// === ANNOTATIONS SYSTEM ===
/* Named for no volume in particular: the five write these under
   READER.vol, and bom.html shares the same code now. It was _otAnnotations,
   which read as Old-Testament-only and was not. */
var _swAnnotations = {};
try { _swAnnotations = JSON.parse(localStorage.getItem(window.READER.vol + '-annotations') || '{}'); } catch(e) {}
var _swNotes = {};
try { _swNotes = JSON.parse(localStorage.getItem(window.READER.vol + '-notes') || '{}'); } catch(e) {}


// Annotations are stored per word, not per tier, so a highlight made in any
// view (interlinear, Hebrew-only, dual, transliteration) shows in all of them.


var _currentAnnTab = 'highlights';


// === SELECTION TOOLBAR ===
var _selWordUnits = [];
var _selTier = '';
var _selMode = '';
var SW_SEL_TB_LS = 'sw-hide-sel-toolbar';


// Selection event listeners — do not dismiss on taps inside verse text (fixes double-tap / drag / native copy)
var _selToolbarLastInteract = 0;
document.addEventListener('mouseup', function(e) { if (!e.target.closest('#sel-toolbar') && !e.target.closest('#hl-pop')) setTimeout(_showSelToolbar, 10); });
document.addEventListener('touchend', function(e) { if (!e.target.closest('#sel-toolbar') && !e.target.closest('#hl-pop')) setTimeout(_showSelToolbar, 300); });
document.addEventListener('mousedown', function(e) {
  if (e.target.closest('#sel-toolbar') || e.target.closest('#hl-pop')) { _selToolbarLastInteract = Date.now(); return; }
  if (_isSelReadingSurface(e.target)) return;
  _hideSelToolbar();
});
document.addEventListener('touchstart', function(e) {
  if (e.target.closest('#sel-toolbar') || e.target.closest('#hl-pop')) { _selToolbarLastInteract = Date.now(); return; }
  if (e.touches && e.touches.length > 1) return;
  if (_isSelReadingSurface(e.target)) return;
  _hideSelToolbar();
});
document.addEventListener('selectionchange', function() {
  if (Date.now() - _selToolbarLastInteract < 500) return;
  // While the popover's note editor is open the textarea owns focus and the
  // text selection is gone — that must not dismiss the popover mid-typing.
  var nr = document.getElementById('hl-note-row');
  if (nr && nr.style.display !== 'none') return;
  var sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().trim()) return;
  var pop = document.getElementById('hl-pop');
  var tb = document.getElementById('sel-toolbar');
  if ((pop && pop.classList.contains('visible')) || (tb && tb.classList.contains('visible'))) _hideSelToolbar();
});

initFloatingSelToolbarPref();

// === SHARE SYSTEM ===
var _shareVerseKey = '';


// === GLOSSARY SYSTEM ===
var glossaryIndex = null;
var glossaryExclude = new Set(['', ' ']);


function buildVerseRefsHtml(verseRefs) {
  var keys = Object.keys(verseRefs);
  if (keys.length === 0) return '';
  var byBook = {};
  keys.forEach(function(vk) {
    var parts = vk.split('|');
    if (parts.length !== 3) return;
    if (!byBook[parts[0]]) byBook[parts[0]] = [];
    byBook[parts[0]].push({ ch: parseInt(parts[1],10), vs: parseInt(parts[2],10), key: vk });
  });
  for (var b in byBook) byBook[b].sort(function(a,c) { return a.ch !== c.ch ? a.ch - c.ch : a.vs - c.vs; });
  var html = '<div class="glossary-refs-section"><strong>References (' + keys.length + ' verses):</strong>';
  var count = 0;
  Object.keys(byBook).sort().forEach(function(book) {
    if (count >= 30) return;
    var refs = byBook[book].slice(0, 10);
    html += '<div class="glossary-refs-book"><span class="glossary-refs-book-name">' + book + ':</span> ';
    html += refs.map(function(r) { return '<span class="glossary-ref-link" onclick="event.stopPropagation();goToGlossaryVerse(\'' + r.key.replace(/'/g,"\\'") + '\')">' + r.ch + ':' + r.vs + '</span>'; }).join(', ');
    html += '</div>';
    count += refs.length;
  });
  html += '</div>';
  return html;
}


function findBookByName(name) {
  for (var i = 0; i < BOOKS.length; i++) { if (BOOKS[i].en === name) return BOOKS[i]; }
  return null;
}

/* All three live in xref_common.js now — reader_ui.js and bom.html had their
   own copies, identical but for a null-guard. The globals stay because the
   glossary card calls them from inline onclick handlers. */


function openGlossaryAtRoot(rootKey) {
  if (window.RootScorecard && !RootScorecard.ready()) {
    RootScorecard.ensure(function() {
      if (!RootScorecard.ready()) return;
      glossaryIndex = null;
      buildGlossaryIndex();
      if (document.getElementById('glossary-panel').classList.contains('open')) renderGlossaryList();
    });
  }
  /* THE CARD IS NOT A RIVAL — IT IS WHERE THIS TAP CAME FROM. This closed the
     word card before opening the glossary, so tapping the root headword or the
     Strong's number destroyed the card that offered them and left nothing to
     come back to: the same defect the cross-reference link had, in a second
     doorway. SWLayers in nav_engine.js owns which surfaces may sit together
     (COEXIST pairs word-popup with the panels the card launches) and
     #word-popup is already one z-rank under any panel, so the card stays open
     behind the glossary and is there again when it closes. Nothing here should
     be deciding that on its own. */
  buildGlossaryIndex();
  // For H-number roots, search by the Hebrew word instead
  var searchTerm = rootKey;
  if (/^H\d+$/.test(rootKey) && window._strongsRoots && _strongsRoots[rootKey]) {
    searchTerm = _strongsRoots[rootKey].w;
  }
  document.getElementById('glossary-search').value = searchTerm;
  renderGlossaryList();
  document.getElementById('glossary-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.add('open');
  setTimeout(function() {
    var entries = document.querySelectorAll('#glossary-list .glossary-entry');
    for (var i = 0; i < entries.length; i++) {
      var rootEl = entries[i].querySelector('.glossary-root');
      if (rootEl && (rootEl.getAttribute('data-root-key') === rootKey || rootEl.textContent === rootKey)) {
        entries[i].classList.add('expanded'); entries[i].scrollIntoView({ behavior: (window.swScrollBehavior || 'smooth'), block: 'start' }); break;
      }
    }
  }, 100);
}

// Debounced glossary search
(function() {
  var gd;
  document.getElementById('glossary-search').addEventListener('input', function() { clearTimeout(gd); gd = setTimeout(renderGlossaryList, 200); });
})();

// Apply saved annotations on chapter load
var _origEnsureRendered = _ensureChapterRendered;
// Injects the generated chapter heading (interlinear heading-flow). A volume
// whose headings key differently (D&C keys by section label) REDEFINES this
// function in its page block — later declaration wins.
function _injectChapterHeading(chapId) {
  try {
    if (window[window.READER.headingsEn] !== undefined && typeof getBookChapter === 'function') {
      var bc = getBookChapter(chapId);
      /* How a volume keys its headings is the ONE thing that differed between
         this function and the copies dc.html and pgp.html each kept inline.
         The D&C keys by section label, and the Pearl has books with no chapter
         number, so both forked the whole function to change one expression.
         READER.headingKey is that expression; everything else is shared. */
      var key = window.READER.headingKey
        ? window.READER.headingKey(chapId, bc)
        : (bc && bc.book && bc.chapter ? bc.book + ' ' + bc.chapter : null);
      if (key) {
        var text = window[window.READER.headingsEn][key];
        if (text) {
          var headingEl = document.querySelector('#panel-' + chapId + ' .chapter-heading');
          if (headingEl && !headingEl.querySelector('.chapter-summary-en')) {
            var p = document.createElement('div');
            p.className = 'chapter-summary-en';
            p.textContent = text;
            headingEl.appendChild(p);
          }
        }
        var ht = (window[window.READER.headingsHe] !== undefined) ? window[window.READER.headingsHe][key] : '';
        if (ht) {
          var headingEl2 = document.querySelector('#panel-' + chapId + ' .chapter-heading');
          if (headingEl2 && !headingEl2.querySelector('.chapter-summary-he')) {
            var ph = document.createElement('div');
            ph.className = 'chapter-summary-he';
            ph.setAttribute('dir', 'rtl');
            var phText = ht;
            if (window[window.READER.headingWords] !== undefined && window[window.READER.headingWords][key]) {
              phText = window[window.READER.headingWords][key].map(function(pr){ return pr[0]; }).join(' ').replace(/ \u05C3/g, '\u05C3');
            }
            ph.setAttribute('data-heb', phText);
            ph.textContent = window._noNikkud ? _stripNikkudDisplay(phText) : phText;
            headingEl2.appendChild(ph);
            if (window[window.READER.headingWords] !== undefined && window[window.READER.headingWords][key] && !headingEl2.querySelector('.heading-flow')) {
              var hf = document.createElement('div');
              hf.className = 'heading-flow';
              hf.setAttribute('dir', 'rtl');
              var hws = window[window.READER.headingWords][key];
              /* THE HEADING IS READING SURFACE TOO. Its words are the same
                 interlinear stack as a verse's — Hebrew, transliteration,
                 gloss — but they carried no data-wid, and every annotation
                 path keys off that: _getSelectedWordUnits filters
                 .word-unit[data-wid], so a selection in the summary found
                 nothing, and highlighting, underlining and notes were all
                 silently unavailable there. A heading has no verse number, so
                 the key is the chapter's own with 'heading' where the verse
                 would be: "Genesis|1|heading|3". _selVerseKey() then yields
                 "Genesis|1|heading", which is a perfectly good note key, and
                 applyAllAnnotations paints these like any other word. */
              var _hbc = (typeof getBookChapter === 'function') ? getBookChapter(chapId) : null;
              var _hwid = _hbc ? (_hbc.book + '|' + _hbc.chapter + '|heading') : '';
              var _hIdx = 0;
              for (var hi = 0; hi < hws.length; hi++) {
                var hh = hws[hi][0], hg = hws[hi][1] || '';
                if (hh === '\u2014' || hh === '\u2013' || hh === '-') {
                  var dash = document.createElement('span');
                  dash.className = 'heading-dash'; dash.textContent = '\u2014';
                  hf.appendChild(dash); continue;
                }
                if (hh === '\u05C3') {
                  // Sof pasuq closes the summary the way it closes a verse:
                  // rendered by the .sof class on the preceding word.
                  var lastGrp = hf.lastElementChild;
                  var lastWu = lastGrp && lastGrp.querySelector ? lastGrp.querySelector('.word-unit') : null;
                  if (lastWu) lastWu.classList.add('sof');
                  continue;
                }
                var wu = makeWordUnit(hh, hg, false);
                if (wu) {
                  if (_hwid) wu.setAttribute('data-wid', _hwid + '|' + (_hIdx++));
                  if (!/[\u05D0-\u05EA]/.test(hh)) { wu.style.direction = 'ltr'; wu.style.unicodeBidi = 'isolate'; var hwSpan = wu.querySelector('.hw'); if (hwSpan) { hwSpan.style.direction = 'ltr'; hwSpan.style.unicodeBidi = 'isolate'; } }
                  var tls = wu.querySelector('.tl');
                  if (tls && typeof transliterate === 'function' && /[\u05D0-\u05EA]/.test(hh)) { try { tls.textContent = transliterate(hh); } catch(eT) {} }
                  var hgrp = document.createElement('span');
                  hgrp.className = 'word-group';
                  hgrp.appendChild(wu);
                  var harr = document.createElement('span');
                  harr.className = 'arr';
                  harr.innerHTML = '<span class="arr-hw">\u200B</span><span class="arr-tl">\u2039</span><span class="arr-gl">\u2039</span>';
                  hgrp.appendChild(harr);
                  appendWordGroup(hf, hgrp);
                }
              }
              var lastA = hf.lastElementChild ? hf.lastElementChild.querySelector('.arr') : null;
              if (lastA) { var lt=lastA.querySelector('.arr-tl'), lg=lastA.querySelector('.arr-gl'); if(lt)lt.textContent='\u00ab'; if(lg)lg.textContent='\u00ab'; }
              headingEl2.appendChild(hf);
            }
          }
        }
      }
    }
  } catch(e) {}
}

_ensureChapterRendered = function(chapId) {
  _origEnsureRendered(chapId);
  setTimeout(applyAllAnnotations, 50);
  /* The cross-reference map arrives one book at a time now, so a chapter is
     not necessarily covered by what has already loaded — ask for this book's
     chunk and let the engine draw the markers once it lands. It falls back to
     the plain re-mark for a volume that ships no chunks. */
  if (typeof window.__swCrossrefsForChapter === 'function') {
    setTimeout(function() { window.__swCrossrefsForChapter(chapId); }, 100);
  }
  if (window._crossrefsLoaded && typeof addCrossRefMarkers === 'function') setTimeout(addCrossRefMarkers, 100);
  _injectChapterHeading(chapId);
};


(function migrateLegacyThemeKey() {
  try {
    var k = window.READER.vol + '-dark-mode';
    if (localStorage.getItem(k) === '1' && !localStorage.getItem('sw-theme-mode')) {
      localStorage.setItem('sw-theme-mode', 'dark');
      localStorage.setItem('sw-dark', '1');
    }
    localStorage.removeItem(k);           // one owner, one key
  } catch (e) {}
})();

// SEARCH
var searchIndex = null;


(function() {
  var debounce;
  document.addEventListener('input', function(e) {
    if (e.target.id !== 'search-input') return;
    clearTimeout(debounce);
    debounce = setTimeout(function() { doSearch(e.target.value); }, 200);
  });
})();

function _stripNikkud(s) { return s.replace(/[\u0591-\u05C7]/g, ''); }

// READING PROGRESS BAR
window.addEventListener('scroll', function() {
  var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  var pct = docHeight > 0 ? (scrollTop / docHeight * 100) : 0;
  document.getElementById('reading-progress').style.width = pct + '%';
});

// URL HASH ROUTING
(function() {
  // Map English book names to prefixes for friendly routing
  var bookNameMap = {};
  BOOKS.forEach(function(b) {
    bookNameMap[b.en.toLowerCase()] = b.prefix;
    bookNameMap[b.prefix] = b.prefix;
  });
  // Also add common abbreviations
  // per-volume alias spellings live in the page config
  var _al = window.READER.bookAliases || {};
  for (var _k in _al) bookNameMap[_k] = _al[_k];

  // The initial route must wait for DOMContentLoaded: dc/pgp/jst override
  // getBookChapter/parseHash in a script AFTER this file, and rendering the
  // landing chapter before those run keys its verses with the canon
  // getBookChapter (null for their ids — no Dual English, no annotation keys).
  function _initialRoute() {
    // The hash as booted: the hash wrapper strips a verse deep-link the
    // moment navTo completes, so read it first.
    var bootHash = '';
    try { bootHash = decodeURIComponent(window.location.hash); } catch (e) { bootHash = window.location.hash; }
    var deepVerse = (bootHash.match(/(?:&v=|:)(\d+)/) || [])[1] || 0;
    handleHash();
    // Resume at the saved reading position (same chapter, no verse deep-link)
    // AFTER the nav's own delayed scroll and font loading are done. Only
    // wheel/touch/key mark real user intent — the nav's programmatic scrolls
    // must not cancel the restore, but a reader who moved is never yanked.
    var userMoved = false, mark = function() { userMoved = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(function(ev) {
      window.addEventListener(ev, mark, { passive: true, once: true });
    });
    var settle = function() { if (!userMoved && !deepVerse && typeof window._restoreReadPos === 'function') window._restoreReadPos(); };
    setTimeout(settle, 700);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function() { setTimeout(settle, 120); });
    window.addEventListener('load', function() { setTimeout(settle, 400); });
    // One-paint reveal (html.sw-boot, set in each volume's <head> when the URL
    // names a page): the reading area stays hidden until a navigation has
    // completed and the Hebrew face is in; then the page is put at its resting
    // place (deep-linked verse, else the saved position) and unhidden. Without
    // it a reload showed the landing, then the chapter at its top, then a jump
    // down to the saved verse. The settle passes above remain as no-motion
    // corrections. Capped so a slow load still shows something.
    var html = document.documentElement;
    if (html.classList.contains('sw-boot')) {
      var t0 = Date.now(), revealed = false;
      var reveal = function() {
        if (revealed) return;
        revealed = true;
        try {
          var panel = document.querySelector('.chapter-panel[style*="block"]');
          var v = deepVerse && panel && panel.querySelectorAll('.verse')[parseInt(deepVerse, 10) - 1];
          if (v) v.scrollIntoView({ block: 'center', behavior: 'instant' });
          else settle();
          if (panel) panel.classList.add('fade-in');
        } catch (e) {}
        html.classList.remove('sw-boot');
      };
      (function tick() {
        var navDone = (window.__swNavCount || 0) > 0;
        // the chrome (top bar, footer dock) reflows the page when it wires up;
        // the body is hidden until then anyway, so the resting place must be
        // computed after it (site_chrome.js marks sw-shell-ready)
        var shellIn = !document.documentElement.classList.contains('sw-shell-pending');
        var fontsIn = true;
        // check() with no text only proves the face for a space (the Latin
        // subset): ask for Hebrew and Latin in all three weights, and start
        // their loads so the answer can become yes.
        try {
          if (document.fonts) {
            fontsIn = ['400', '500', '700'].every(function(w) {
              var f = w + ' 16px "David Libre"';
              document.fonts.load(f, '\u05d0a');
              return document.fonts.check(f, '\u05d0') && document.fonts.check(f, 'a');
            }) && document.fonts.status === 'loaded';
          }
        } catch (e) {}
        if ((navDone && shellIn && fontsIn) || Date.now() - t0 > 2500) reveal(); else setTimeout(tick, 40);
      })();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initialRoute);
  } else {
    _initialRoute();
  }
  window.addEventListener('hashchange', handleHash);
})();

// Auto-search from ?q= parameter (cross-volume search)
(function() {
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (q) {
    setTimeout(function() {
      openSearch();
      document.getElementById('search-input').value = q;
      buildSearchIndex();
      doSearch(q);
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }, 800);
  }
})();

