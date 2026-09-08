/* ══════════════════════════════════════════════════════════════════════
   THE READING SURFACE — panels, selection tools and annotation marks
   ══════════════════════════════════════════════════════════════════════
   One implementation, for all six volume pages.

   These twenty-three functions existed TWICE: once in reader_ui.js, which the
   five shared-engine volumes load, and once inline in bom/bom.html, which
   loads none of the shared reader. They were not merely similar — every one
   of them was byte-identical once comments were normalised away, proved at
   runtime by hashing Function.prototype.toString() on both pages and diffing:
   23 checked, 0 differing.

   That is the whole case for moving them here. Where bom.html genuinely
   differs from the shared engine — an in-page jump instead of a cross-volume
   link, its own panel markup, parseBomRef — the fork stays and
   tools/check_shared_drift.js holds the two copies to their shared
   invariants. This file is only for the parts that were never different.

   Loaded BEFORE reader_ui.js on the five, and before the inline blocks on
   bom.html. Everything here is called at runtime (event handlers, panel
   toggles), never during parse, so it may reference state each page declares
   for itself: _annOf, _selWordUnits, _selTier, _currentAnnTab, glossaryIndex,
   _hideSelToolbar, renderGlossaryList, buildGlossaryIndex, buildSearchIndex,
   renderAnnotationsList, setWordAnnotation, RootScorecard, SW_SEL_TB_LS.
   Those are top-level in both, so they are globals by the time anything here
   runs. Adding a function that runs at PARSE time would break that.
   ══════════════════════════════════════════════════════════════════════ */

function closePopup() {
  var wp = document.getElementById('word-popup');
  if (wp) wp.style.display = 'none';
}

function _paintWordAnnotation(el, ta) {
  ['hw','tl','gl'].forEach(function(tier) {
    var tierEl = el.querySelector('.' + tier);
    if (!tierEl) return;
    // Highlights and underlines paint the Hebrew line only (corpus-wide rule);
    // the loop still visits tl/gl so stale paint from older data is cleaned.
    var on = tier === 'hw';
    if (on && ta.hl) { tierEl.classList.add('ann-hl'); tierEl.style.backgroundColor = ta.hl; tierEl.setAttribute('data-hlc', ta.hl); }
    else { tierEl.classList.remove('ann-hl'); tierEl.style.backgroundColor = ''; tierEl.removeAttribute('data-hlc'); }
    // Underlines were removed 2026-08-30 — they collided with the nikkud and
    // made pointed text hard to read. Stale ann-ul paint is still cleaned.
    tierEl.classList.remove('ann-ul'); tierEl.style.textDecorationColor = '';
  });
}

function applyAnnotationToWord(wid) {
  var ta = _annOf(wid);
  document.querySelectorAll('.word-unit[data-wid="' + wid + '"]').forEach(function(el) {
    _paintWordAnnotation(el, ta);
  });
}

function closeAnnotationsPanel() {
  document.getElementById('annotations-panel').classList.remove('open');
  document.getElementById('panel-overlay').classList.remove('open');
}

function showAnnTab(tab) {
  _currentAnnTab = tab;
  document.querySelectorAll('.ann-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelector('.ann-tab[onclick*="' + tab + '"]').classList.add('active');
  renderAnnotationsList();
}

function initFloatingSelToolbarPref() {
  // The tools rail starts hidden — selecting text pops the highlighter at the
  // selection (Gospel-Library pattern); the crayon tab opens the full rail.
  document.body.classList.add('hide-sel-toolbar');
  _syncSelToolbarModeButton();
}

function _syncSelToolbarModeButton() {
  var b = document.getElementById('sel-toolbar-mode-toggle');
  if (!b) return;
  var off = document.body.classList.contains('hide-sel-toolbar');
  b.classList.toggle('active', off);
  b.setAttribute('aria-pressed', off ? 'true' : 'false');
  b.title = off ? 'Selection toolbar off — tap to turn on (tools appear after you select text)' : 'Hide floating selection toolbar (copy/select works normally)';
}

function toggleFloatingSelToolbar(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  document.body.classList.toggle('hide-sel-toolbar');
  try { localStorage.setItem(SW_SEL_TB_LS, document.body.classList.contains('hide-sel-toolbar') ? '1' : '0'); } catch (err) {}
  _syncSelToolbarModeButton();
  _hideSelToolbar();
}

function hlPopClose() {
  try { window.getSelection().removeAllRanges(); } catch (e) {}
  _hideSelToolbar();
}

// Note editing inside the popover delegates to the rail's note plumbing so the
// storage/marker logic stays in one place.
function hlPopNote() {
  var row = document.getElementById('hl-note-row');
  if (!row) return;
  if (row.style.display !== 'none') { row.style.display = 'none'; return; }
  _loadSelNote();
  var src = document.getElementById('sel-note-input');
  var ta = document.getElementById('hl-note-input');
  ta.value = src ? src.value : '';
  ta.placeholder = src ? src.placeholder : 'Add a note...';
  row.style.display = 'flex';
  ta.focus();
}

function hlPopSaveNote() {
  var ta = document.getElementById('hl-note-input');
  var dst = document.getElementById('sel-note-input');
  if (dst) dst.value = ta.value;
  ta.value = '';
  selToolbarSaveNote();
}

function _updateSelToolbarIndicators() {
  if (_selWordUnits.length === 0) return;
  var ta = _annOf(_selWordUnits[0].getAttribute('data-wid'));
  document.querySelectorAll('#sel-toolbar .sel-color[data-ann="highlight"], #hl-pop .sel-color[data-ann="highlight"]').forEach(function(c) { c.classList.toggle('active', ta.hl === c.getAttribute('data-color')); });
  document.querySelectorAll('#sel-toolbar .sel-color[data-ann="underline"], #hl-pop .sel-color[data-ann="underline"]').forEach(function(c) { c.classList.toggle('active', ta.ul === c.getAttribute('data-color')); });
}

function selToolbarApply(el) {
  var annType = el.getAttribute('data-ann');
  var color = el.getAttribute('data-color');
  var type = annType === 'highlight' ? 'hl' : 'ul';
  _selWordUnits.forEach(function(wu) { var wid = wu.getAttribute('data-wid'); if (wid) setWordAnnotation(wid, _selTier, type, color || null); });
  _updateSelToolbarIndicators();
  window.getSelection().removeAllRanges();
  setTimeout(_hideSelToolbar, 150);
}

function openGlossary() {
  if (window.RootScorecard && !RootScorecard.ready()) {
    RootScorecard.ensure(function() {
      if (!RootScorecard.ready()) return;
      glossaryIndex = null;
      buildGlossaryIndex();
      if (document.getElementById('glossary-panel').classList.contains('open')) renderGlossaryList();
    });
  }
  buildGlossaryIndex();
  renderGlossaryList();
  document.getElementById('glossary-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.add('open');
}

function closeGlossary() {
  document.getElementById('glossary-panel').classList.remove('open');
  document.getElementById('panel-overlay').classList.remove('open');
  /* The marks STAY. Closing used to clear them, which made "Highlight all in
     text" self-defeating: the panel is what covers the text it just marked, so
     getting out of the way was the point — and doing so wiped the highlight.
     They are cleared by the next highlight, and by leaving the chapter. */
}

function setGlossaryTab(btn) {
  document.querySelectorAll('.glossary-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  renderGlossaryList();
}

function toggleGlossaryEntry(el) { el.classList.toggle('expanded'); }

function highlightAllForms(rootKey) {
  var canon = (window.RootScorecard && RootScorecard.ready())
    ? function (w) { var f = RootScorecard.lookup(w); return f ? f.key : null; }
    : null;
  return window.SWXref.highlightWords(function (wu, hw) {
    var h = (wu.getAttribute && wu.getAttribute('data-h')) || hw.textContent;
    var wRoot = canon ? canon(h) : (window.getRoot ? window.getRoot(h) : h);
    return wRoot === rootKey;
  });
}

function highlightForm(surfaceForm) {
  return window.SWXref.highlightWords(function (wu, hw) {
    return hw.textContent === surfaceForm;
  });
}

function clearHighlightedWords() { window.SWXref.clearHighlightedWords(); }

// THEME — site_chrome.js is the single owner (light / sepia / dark).
// This used to keep its own <vol>-dark-mode key AND add the class itself, so
// there were two owners of one piece of state. The moment a third theme
// existed that became visible: the shared system set sepia-mode while this
// restored dark-mode from a stale per-volume key, and the body carried BOTH
// at once — a cream page painted with dark-mode's rules.
// Delegates now. The legacy key is migrated once so nobody loses their setting.
function toggleDarkMode() {
  if (typeof window.toggleDark === 'function') { window.toggleDark(); return; }
  document.body.classList.toggle('dark-mode');   // only if the shared chrome never loaded
}

function openSearch() { document.getElementById('search-container').classList.add('open'); document.getElementById('search-input').focus(); buildSearchIndex(); }

function closeSearch() {
  document.getElementById('search-container').classList.remove('open');
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('search-input').value = '';
}


/* ── Reconciled from two copies (de-fork step 2) ───────────────────────────
   These three differed between reader_core.js and bom.html for no reason that
   survived inspection:

     toggleTranslit / setSize   the shared copy wrote localStorage under
                                READER.vol + '-show-translit'; bom.html wrote
                                the literal 'bom-show-translit'. Same key once
                                READER.vol is 'bom', which bom.html now
                                declares — so no reader loses a saved
                                preference.
     populateEnglishDivs        bom.html's took an optional root to repopulate
                                one panel; the shared one always did the whole
                                document. The parameter is a superset, so the
                                five keep working unchanged and the Book of
                                Mormon keeps the narrower call it needs. */
function toggleTranslit() {
  _keepVersePosition(function() {
  document.body.classList.toggle('hide-translit');
  var btn = document.getElementById('btn-translit');
  btn.classList.toggle('active');
  try { localStorage.setItem(window.READER.vol + '-show-translit', btn.classList.contains('active') ? '1' : '0'); } catch(e) {}
  });
}

function setSize(val) {
  _keepVersePosition(function() {
  document.getElementById('page').style.fontSize = val + '%';
  });
  try { localStorage.setItem(window.READER.vol + '-font-size', val); } catch(e) {}
}

function populateEnglishDivs(root) {
  (root || document).querySelectorAll('.verse-english[data-key]').forEach(function(div) {
    var key = div.getAttribute('data-key');
    if (window._englishMap[key]) div.textContent = window._englishMap[key];
  });
}

/* ── The annotation store (de-fork step 3) ─────────────────────────────────
   Held twice, over state the two pages named differently: _otAnnotations /
   _otNotes on the five (an OT-only name for something every volume used)
   and _bomAnnotations / _bomNotes on bom.html. Both are _swAnnotations /
   _swNotes now, each page still declaring and loading its own — the store is
   per volume, only the code is shared. The localStorage keys are untouched:
   READER.vol + '-annotations' is 'bom-annotations' on that page, which is
   what its readers already have. */
function _annOf(wid) {
  var a = _swAnnotations[wid];
  if (!a) return {};
  if (a.hl || a.ul) return { hl: a.hl, ul: a.ul };
  var out = {};                       // legacy per-tier record — fold it down
  ['hw','tl','gl'].forEach(function(t) {
    if (!a[t]) return;
    if (a[t].hl && !out.hl) out.hl = a[t].hl;
    if (a[t].ul && !out.ul) out.ul = a[t].ul;
  });
  return out;
}

function setWordAnnotation(wid, tier, type, color) {
  var cur = _annOf(wid);
  if (color) { cur[type] = color; } else { delete cur[type]; }
  if (cur.hl || cur.ul) { _swAnnotations[wid] = cur; } else { delete _swAnnotations[wid]; }
  _saveAnnotations();
  applyAnnotationToWord(wid);
}

function _saveAnnotations() { try { localStorage.setItem(window.READER.vol + '-annotations', JSON.stringify(_swAnnotations)); } catch(e) {} }

function _saveNotes() { try { localStorage.setItem(window.READER.vol + '-notes', JSON.stringify(_swNotes)); } catch(e) {} }
