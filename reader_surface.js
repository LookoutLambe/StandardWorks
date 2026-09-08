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

/* ── Reconciled from two copies (de-fork step 4) ───────────────────────────
   Each of these differed in ONE way, and in each case one copy was simply
   ahead of the other. The winner is named per function; nothing was merged
   by hand, so each is exactly one of the two that were running.

   _stripNikkud is NOT here and stays forked ON PURPOSE: the two copies strip
   different Unicode ranges (bom.html keeps the maqqef and the shin/sin dots),
   which is a deliberate difference, not drift. */

/* buildSearchIndex — from the shared engine: identical semantics; the shared copy is the tighter one */
function buildSearchIndex() {
  if (searchIndex) return;
  searchIndex = [];
  for (var r = 0; r < _verseRegistry.length; r++) {
    var reg = _verseRegistry[r];
    var label = getChapterLabel(reg.chapId);
    for (var vi = 0; vi < reg.verses.length; vi++) {
      var v = reg.verses[vi];
      var hWords = [], eWords = [];
      for (var wi = 0; wi < v.words.length; wi++) {
        var w = v.words[wi];
        if (w[0] !== '\u05C3') { hWords.push(w[0]); eWords.push(w[1].replace(/-/g, ' ')); }
      }
      searchIndex.push({ chapId: reg.chapId, ref: label + ':' + (vi + 1), hebrew: hWords.join(' '), english: eWords.join(' '), verseIdx: vi });
    }
  }
}

/* _selVerseKey — from the shared engine: identical semantics */
function _selVerseKey() {
  if (_selWordUnits.length === 0) return '';
  var wid = _selWordUnits[0].getAttribute('data-wid');
  return wid ? wid.split('|').slice(0, 3).join('|') : '';
}

/* applyAllAnnotations — from bom.html: bom.html's optional root — a superset, the five pass nothing */
function applyAllAnnotations(root) {
  (root || document).querySelectorAll('.word-unit[data-wid]').forEach(function(el) {
    var wid = el.getAttribute('data-wid');
    if (!_swAnnotations[wid]) return;
    _paintWordAnnotation(el, _annOf(wid));
  });
}

/* _isSelReadingSurface — from bom.html: bom.html also counts .heading-flow as reading surface */
function _isSelReadingSurface(el) {
  if (!el || !el.closest) return false;
  return !!el.closest('.chapter-panel, .verse, .word-flow, .heading-flow, .word-unit, #main-content, #page, .book-header, .landing-hero, .landing-content');
}

/* openAnnotationsPanel — from bom.html: bom.html resets panel.scrollTop, so reopening starts at the top */
function openAnnotationsPanel() {
  renderAnnotationsList();
  var panel = document.getElementById('annotations-panel');
  panel.scrollTop = 0;
  panel.classList.add('open');
  document.getElementById('panel-overlay').classList.add('open');
}

/* _hideSelToolbar — from bom.html: bom.html also clears the highlight button's active state */
function _hideSelToolbar() {
  var tb = document.getElementById('sel-toolbar');
  if (tb) tb.classList.remove('visible');
  var pop = document.getElementById('hl-pop');
  if (pop) pop.classList.remove('visible');
  var pnr = document.getElementById('hl-note-row');
  if (pnr) pnr.style.display = 'none';
  var sp = document.getElementById('sel-subpanel');
  if (sp) sp.style.display = 'none';
  var hlBtn = document.getElementById('sel-btn-highlight');
  if (hlBtn) hlBtn.classList.remove('active');
  _selWordUnits = [];
  _selTier = '';
  _selMode = '';
}

/* _detectTier — from bom.html: bom.html also resolves the chevron column's arr-hw/tl/gl tiers */
function _detectTier(node) {
  var el = node.nodeType === 3 ? node.parentElement : node;
  while (el && !el.classList.contains('word-unit')) {
    if (el.classList.contains('hw')) return 'hw';
    if (el.classList.contains('tl')) return 'tl';
    if (el.classList.contains('gl')) return 'gl';
    if (el.classList.contains('arr-hw')) return 'hw';
    if (el.classList.contains('arr-tl')) return 'tl';
    if (el.classList.contains('arr-gl')) return 'gl';
    el = el.parentElement;
  }
  return '';
}

/* ── The verse deep link, per volume, stated once ──────────────────────────
   The one genuine difference inside the verse-actions block below: the Book of
   Mormon addresses a verse as #alma-32:5 and every other volume as
   #gen-ch1&v=5. That is the same split nav_engine's buildCrossVolumeUrl and
   root_scorecard's refHref already encode, and it is the reason the block was
   forked at all. With it behind one function the rest of the block is
   identical, so the block can live here instead of in two places. */
function swVerseDeepLink(chapId, verseNum) {
  var base = window.location.origin + window.location.pathname;
  if (!chapId || !verseNum) return '';
  if (window.READER && window.READER.vol === 'bom') {
    var label = (typeof getChapterLabel === 'function')
      ? String(getChapterLabel(chapId) || '').toLowerCase().replace(/\s+/g, '-') : '';
    return base + '#' + (label || chapId) + ':' + verseNum;
  }
  return base + '#' + chapId + '&v=' + verseNum;
}

/* ══════════════════════════════════════════════════════════════════════
   VERSE ACTIONS — the number menu, the note modal, per-verse highlights
   ══════════════════════════════════════════════════════════════════════
   Thirteen functions and three pieces of closure state, held twice and 99.7%
   identical. Only three things actually differed, and all three are resolved
   rather than papered over:

     the deep-link syntax   the BOM addresses a verse as #alma-32:5 and the
                            others as #gen-ch1&v=5 — now swVerseDeepLink above,
                            stated once
     the menu's border      bom.html used --here-chrome, the five --here. The
                            menu's background is var(--chrome), so the on-navy
                            gold is the correct one and the five had a border
                            too dark to see. bom.html's wins.
     the JST-mark guard     only the five have JST marks in the number column,
                            but closest('.jst-mark') simply never matches on the
                            BOM, so the guard is kept for everyone.
   ══════════════════════════════════════════════════════════════════════ */
(function() {
  var HIGHLIGHTS_KEY = 'sw-highlights-v1';
  var menu = null;
  var currentVerseEl = null;

  function loadHighlights() {
    try { return JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '{}') || {}; } catch(e) { return {}; }
  }
  function saveHighlights(obj) {
    try { localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(obj || {})); } catch(e) {}
  }
  function verseKeyOf(verseEl) {
    return verseEl ? verseEl.getAttribute('data-verse-key') : null;
  }
  function ensureMenu() {
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'verse-action-menu';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';
    menu.style.display = 'none';
    menu.style.minWidth = '180px';
    menu.style.background = 'color-mix(in srgb, var(--chrome) 98%, transparent)';
    menu.style.border = '1px solid color-mix(in srgb, var(--here-chrome) 35%, transparent)';
    menu.style.borderRadius = '8px';
    menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    menu.style.padding = '8px';
    menu.style.direction = 'ltr';
    menu.style.backdropFilter = 'blur(6px)';

    menu.innerHTML = '' +
      '<button data-act="highlight" style="width:100%;margin:0 0 6px 0;padding:10px 12px;border-radius:6px;border:1px solid color-mix(in srgb, var(--here) 35%, transparent);background:var(--chrome);color:var(--here);cursor:pointer;font-family:inherit;font-size:0.95em;">Highlight / Unhighlight</button>' +
      '<button data-act="note" style="width:100%;margin:0 0 6px 0;padding:10px 12px;border-radius:6px;border:1px solid color-mix(in srgb, var(--here-chrome) 25%, transparent);background:#151929;color:var(--on-chrome);cursor:pointer;font-family:inherit;font-size:0.95em;">Note</button>' +
      '<button data-act="copy" style="width:100%;margin:0 0 6px 0;padding:10px 12px;border-radius:6px;border:1px solid color-mix(in srgb, var(--here-chrome) 25%, transparent);background:#151929;color:var(--on-chrome);cursor:pointer;font-family:inherit;font-size:0.95em;">Copy verse</button>' +
      '<button data-act="share" style="width:100%;margin:0;padding:10px 12px;border-radius:6px;border:1px solid color-mix(in srgb, var(--here-chrome) 25%, transparent);background:#151929;color:var(--on-chrome);cursor:pointer;font-family:inherit;font-size:0.95em;">Share verse</button>';

    menu.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var act = btn.getAttribute('data-act');
      if (!currentVerseEl) return;
      if (act === 'highlight') { togglePersistentHighlight(currentVerseEl); hideMenu(); }
      else if (act === 'note') { openNoteEditor(currentVerseEl); hideMenu(); }
      else if (act === 'copy') { copyVerseOnly(currentVerseEl); hideMenu(); }
      else if (act === 'share') { shareVerseOnly(currentVerseEl); hideMenu(); }
    });

    document.body.appendChild(menu);
    return menu;
  }

  function getVerseText(verseEl) {
    var key = verseKeyOf(verseEl) || '';
    var ref = key ? key.replace(/\|/g, ' ') : '';
    var heb = '';
    try {
      var hws = verseEl.querySelectorAll('.word-unit .hw');
      var parts = [];
      for (var i = 0; i < hws.length; i++) {
        var t = (hws[i].textContent || '').trim();
        if (t) parts.push(t);
      }
      heb = parts.join(' ');
    } catch(e) {}
    var eng = '';
    try {
      var engDiv = verseEl.querySelector('.verse-english');
      if (engDiv) eng = (engDiv.textContent || '').trim();
    } catch(e) {}
    var out = (ref ? ref + '\n' : '') + (heb ? heb + '\n' : '') + (eng ? eng : '');
    return out.trim();
  }

  function togglePersistentHighlight(verseEl) {
    var key = verseKeyOf(verseEl);
    if (!key) return;
    var map = loadHighlights();
    if (map[key]) delete map[key];
    else map[key] = { on: true, ts: Date.now() };
    saveHighlights(map);
    verseEl.classList.toggle('user-highlight', !!map[key]);
  }

  function applyNoteMarker(verseEl, hasNote) {
    var num = verseEl ? verseEl.querySelector('.verse-num') : null;
    if (!num) return;
    num.classList.toggle('has-note', !!hasNote);
  }

  function ensureNoteModal() {
    var existing = document.getElementById('note-modal');
    if (existing) return existing;
    var overlay = document.createElement('div');
    overlay.id = 'note-modal';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'none';
    overlay.innerHTML =
      '<div id="note-modal-card" style="max-width:720px;width:92%;margin:10vh auto;background:var(--bg);color:var(--ink);border:2px solid var(--accent);border-radius:10px;box-shadow:0 14px 40px rgba(0,0,0,0.35);padding:16px;direction:ltr;font-family:David Libre,serif;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">' +
          '<div style="font-weight:700;color:var(--accent);font-size:1.05em;" id="note-modal-title">Note</div>' +
          '<button id="note-modal-close" style="border:1px solid var(--rule);background:transparent;color:var(--ink);border-radius:8px;padding:6px 10px;cursor:pointer;">Close</button>' +
        '</div>' +
        '<textarea id="note-modal-text" style="width:100%;min-height:180px;resize:vertical;border:1px solid var(--rule);border-radius:8px;padding:10px 12px;font-family:David Libre,serif;font-size:1em;line-height:1.4;background:var(--bg-deep);color:var(--ink);"></textarea>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">' +
          '<button id="note-modal-delete" style="border:1px solid rgba(180,60,60,0.4);background:transparent;color:#b43c3c;border-radius:8px;padding:8px 12px;cursor:pointer;">Delete</button>' +
          '<button id="note-modal-save" style="border:1px solid var(--accent);background:var(--accent);color:var(--chrome);border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700;">Save</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) hideNoteModal();
    });
    document.getElementById('note-modal-close').addEventListener('click', function() { hideNoteModal(); });
    return overlay;
  }

  function hideNoteModal() {
    var overlay = document.getElementById('note-modal');
    if (overlay) overlay.style.display = 'none';
  }

  async function openNoteEditor(verseEl) {
    var key = verseKeyOf(verseEl);
    if (!key || !window.NotesEngine) return;
    ensureNoteModal();
    var title = document.getElementById('note-modal-title');
    title.textContent = key.replace(/\|/g, ' ');
    var ta = document.getElementById('note-modal-text');
    var existing = await window.NotesEngine.getNote(key);
    ta.value = existing && existing.text ? existing.text : '';
    document.getElementById('note-modal').style.display = 'block';
    setTimeout(function() { try { ta.focus(); ta.selectionStart = ta.value.length; } catch(e) {} }, 0);

    var saveBtn = document.getElementById('note-modal-save');
    var delBtn = document.getElementById('note-modal-delete');

    saveBtn.onclick = async function() {
      await window.NotesEngine.upsertNote(key, ta.value);
      applyNoteMarker(verseEl, (ta.value || '').trim().length > 0);
      hideNoteModal();
    };
    delBtn.onclick = async function() {
      ta.value = '';
      await window.NotesEngine.deleteNote(key);
      applyNoteMarker(verseEl, false);
      hideNoteModal();
    };
  }

  async function copyVerseOnly(verseEl) {
    var text = getVerseText(verseEl);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch(e) {}
  }

  async function shareVerseOnly(verseEl) {
    var text = getVerseText(verseEl);
    try {
      // Add a shareable deep link to this verse
      var key = verseKeyOf(verseEl) || '';
      var verseNum = 0;
      if (key) {
        var ps = key.split('|');
        verseNum = ps.length >= 3 ? parseInt(ps[2], 10) || 0 : 0;
      }
      var link = swVerseDeepLink(currentChapterId, verseNum);
      if (link) text = link + '\n' + text;
      if (navigator.share) {
        await navigator.share({ text: text });
      } else {
        await copyVerseOnly(verseEl);
      }
    } catch(e) {}
  }

  function applySavedHighlights(scopeEl) {
    var map = loadHighlights();
    (scopeEl || document).querySelectorAll('.verse[data-verse-key]').forEach(function(v) {
      var key = verseKeyOf(v);
      if (key && map[key]) v.classList.add('user-highlight');
    });
  }

  async function applySavedNotes(scopeEl) {
    if (!window.NotesEngine) return;
    var verses = (scopeEl || document).querySelectorAll('.verse[data-verse-key]');
    for (var i = 0; i < verses.length; i++) {
      var v = verses[i];
      var key = verseKeyOf(v);
      if (!key) continue;
      try {
        var note = await window.NotesEngine.getNote(key);
        applyNoteMarker(v, !!(note && note.text));
      } catch(e) {}
    }
  }

  function showMenuFor(numEl, verseEl) {
    ensureMenu();
    currentVerseEl = verseEl;
    var rect = numEl.getBoundingClientRect();
    var x = Math.min(rect.left, window.innerWidth - 220);
    var y = Math.min(rect.bottom + 8, window.innerHeight - 170);
    menu.style.left = Math.max(8, x) + 'px';
    menu.style.top = Math.max(8, y) + 'px';
    menu.style.display = 'block';
  }
  function hideMenu() {
    if (!menu) return;
    menu.style.display = 'none';
    currentVerseEl = null;
  }

  // Open verse actions menu on verse number click (does not alter selection)
  document.addEventListener('click', function(e) {
    /* The JST mark lives INSIDE the number column and is a real link. This
       listener is on the capture phase and preventDefaults, so without this the
       link was swallowed and the tap just opened the verse menu. */
    if (e.target.closest('.jst-mark')) return;
    var num = e.target.closest('.verse-num');
    if (!num) return;
    var verse = num.closest('.verse');
    if (!verse) return;
    e.preventDefault();
    e.stopPropagation();
    showMenuFor(num, verse);
  }, true);

  // Close menu on outside click / Escape
  document.addEventListener('click', function(e) {
    if (menu && menu.style.display === 'block' && !e.target.closest('#verse-action-menu') && !e.target.closest('.verse-num')) hideMenu();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideMenu();
  });

  // Apply highlights after chapters render / on load
  document.addEventListener('DOMContentLoaded', function() { applySavedHighlights(document); applySavedNotes(document); });
  /* Apply highlights to a chapter as it renders, by wrapping the renderer.
     ORDER-INDEPENDENT, because the six pages define _ensureChapterRendered at
     different points: reader_core.js runs BEFORE this file on the five, but
     bom.html declares its own several inline blocks AFTER it. The old code
     read the function once, at parse time, and simply skipped the wrap when it
     was not there yet — which on bom.html meant newly-rendered chapters
     silently lost their saved highlights and notes. Try now, and again at
     DOMContentLoaded when every inline block has run; the flag stops the two
     attempts from wrapping it twice. */
  function _installRenderHook() {
    var orig = window._ensureChapterRendered;
    if (typeof orig !== 'function' || orig.__swHighlightsWrapped) return !!orig;
    var wrapped = function(chapId) {
      orig(chapId);
      var panel = document.getElementById('panel-' + chapId);
      if (panel) { applySavedHighlights(panel); applySavedNotes(panel); }
    };
    wrapped.__swHighlightsWrapped = true;
    window._ensureChapterRendered = wrapped;
    return true;
  }
  if (!_installRenderHook()) {
    document.addEventListener('DOMContentLoaded', _installRenderHook);
  }
})();

/* ══════════════════════════════════════════════════════════════════════
   CHAPTER IDS ARE DATA, NOT CODE
   ══════════════════════════════════════════════════════════════════════
   getBookChapter and getChapterLabel were forked FIVE ways: reader_core.js for
   ot/nt, and a hand-written prefix→name map inline in dc.html, pgp.html,
   jst.html and bom.html — each of them twice, once per function, so ten maps
   describing the same thing.

   None of it is logic. It is each volume describing its own id scheme, so it
   moves into READER.books and the code below is the same for everyone.

     idPrefix   the literal start of a chapter id. Absent, '-ch' is appended to
                prefix, which is how ot/nt already declare their books
                (prefix:'gen' for gen-ch1). The others state it outright:
                'al-ch' for the BOM's al-ch32, a bare 'ch' for its ch1, 'dc'
                for the D&C's dc76-ch1, 'jstgen-ch' for the JST's.
     idSuffix   what follows the number. The D&C's ids are dc76-ch1: the
                section is the number and '-ch1' is fixed.
     label      the display name, when it differs from the book identity. The
                Pearl's ab-fac IS the book 'Abraham-Facsimile' but reads
                'Facsimile No. 2'.
     soloLabel  show the book name with no number. PER BOOK, not per volume:
                the Pearl does it for JS-Matthew and the BOM for Enos, while
                the Tanakh has Obadiah — one chapter, and it still reads
                "Obadiah 1".
     frontTitles (on READER) ids that are not chapters at all.

   Longest prefix wins, so a bare 'ch' cannot swallow '2n-ch', and an id with
   nothing after the prefix is chapter 1 (the Pearl's pgp-intro).
   ══════════════════════════════════════════════════════════════════════ */
function _swBooks() { return (window.READER && window.READER.books) || []; }
function _swBookName(b) { return (b && (b.en || b.name)) || ''; }
function _swBookLabel(b) { return (b && (b.label || b.en || b.name)) || ''; }
function _swBookIdPrefix(b) {
  if (!b) return '';
  if (b.idPrefix) return b.idPrefix;
  var p = b.prefix || '';
  return /-ch$/.test(p) ? p : (p ? p + '-ch' : '');
}

/** The book entry whose id scheme matches chId, and the chapter number in it. */
function _swMatchChapterId(chId) {
  if (!chId) return null;
  var books = _swBooks(), best = null, bestRest = null, bestLen = -1;
  for (var i = 0; i < books.length; i++) {
    var b = books[i], p = _swBookIdPrefix(b);
    if (!p || chId.indexOf(p) !== 0 || p.length <= bestLen) continue;
    var rest = chId.slice(p.length), suf = b.idSuffix || '';
    if (suf) {
      if (rest.length < suf.length || rest.slice(-suf.length) !== suf) continue;
      rest = rest.slice(0, rest.length - suf.length);
    }
    if (rest !== '' && !/^\d+$/.test(rest)) continue;
    best = b; bestRest = rest; bestLen = p.length;
  }
  if (!best) return null;
  return { book: best, chapter: bestRest === '' ? 1 : (parseInt(bestRest, 10) || 1) };
}

function getBookChapter(chId) {
  var m = _swMatchChapterId(chId);
  if (!m) return null;
  return { book: _swBookName(m.book), chapter: m.chapter, bookData: m.book };
}

function getChapterLabel(id) {
  var R = window.READER || {};
  if (!id) return R.landingTitle || '';
  var front = R.frontTitles || {};
  if (front[id]) return front[id];
  if (id === 'landing') return R.landingTitle || id;
  var m = _swMatchChapterId(id);
  if (!m) return id;
  if (m.book.soloLabel) return _swBookLabel(m.book);
  return _swBookLabel(m.book) + ' ' + m.chapter;
}

/* ── Prefetching the next and previous chapter ─────────────────────────────
   Forked over two things. isChapter() was a hand-written list of ids that are
   NOT chapters — 'landing' on the five, and on bom.html also 'intro',
   'topical-guide', 'print-editions' and everything starting with 'front-'.
   With the id scheme in READER.books that list is redundant: getBookChapter
   returns null for exactly those, so asking it IS the test.

   The other was how a book gets loaded before the chapter renders. The five
   need nothing — reader_core's _ensureChapterRendered fetches the verse file
   itself — while bom.html's renderer does not, and had to call
   ensureBomBookForChapId first. A volume that needs it says so in READER,
   instead of the shared code knowing the Book of Mormon by name. */
function _swEnsureBook(chapId, cb) {
  var R = window.READER || {};
  if (typeof R.ensureBook === 'function') { R.ensureBook(chapId, cb); return; }
  cb();
}

function scheduleAdjacentPrefetch() {
  if (!currentPageId || typeof _ensureChapterRendered !== 'function') return;
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx < 0) return;
  var nextId = (idx < fullPageOrder.length - 1) ? fullPageOrder[idx + 1] : null;
  var prevId = (idx > 0) ? fullPageOrder[idx - 1] : null;
  function prefetch(id) {
    if (!id || !getBookChapter(id)) return;   // landing, front matter, the topical guide
    _swEnsureBook(id, function () { _ensureChapterRendered(id); });
  }
  function run() {
    try { prefetch(nextId); prefetch(prevId); } catch (e) {}
  }
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 250);
}

/* ══════════════════════════════════════════════════════════════════════
   SHARE — one implementation for all six volumes
   ══════════════════════════════════════════════════════════════════════
   Held twice, and the two were not variants of one design — they disagreed
   about what getShareContent even returns. The five built a STRING out of the
   selected Hebrew words; bom.html builds an OBJECT { title, text, url } from
   the highlighted verse, with the Hebrew, the English and the reference, and
   shows a preview of it before you send. The BOM's is the better one, so it is
   the one that survives, and the five gain the preview, the scrim, the icons
   and the native-share button that only appears where navigator.share exists.

   Two things in it were about the Book of Mormon rather than about sharing,
   and both now come from READER:
     the title    was the hardcoded Hebrew name of this volume; it is
                  READER.shareTitle, which all five already declared.
     the chapter  was read out of #nav-label's text; it is
                  getChapterLabel(currentChapterId), which is shared as of
                  the id-scheme work and does not depend on the chrome.
   ══════════════════════════════════════════════════════════════════════ */
var _shareContent = null;
function _swShareTitle() {
  return (window.READER && window.READER.shareTitle) || document.title || '';
}

function _getHighlightedVerse() {
  var active = document.querySelector('.chapter-panel.active');
  if (!active) {
    var panels = document.querySelectorAll('.chapter-panel');
    for (var i = 0; i < panels.length; i++) {
      if (getComputedStyle(panels[i]).display !== 'none') { active = panels[i]; break; }
    }
  }
  if (!active) return null;
  var hl = active.querySelector('.verse.highlighted');
  if (!hl) return null;
  var numEl = hl.querySelector('.verse-num-arabic');
  var verseNum = numEl ? numEl.textContent : '';
  var wus = hl.querySelectorAll('.word-unit[data-wid]');
  var heb = [], eng = [];
  wus.forEach(function(wu) {
    var hw = wu.querySelector('.hw');
    var gl = wu.querySelector('.gl');
    if (hw) heb.push(hw.textContent);
    if (gl && gl.textContent.trim()) eng.push(gl.textContent.trim());
  });
  var wid = wus.length > 0 ? wus[0].getAttribute('data-wid') : '';
  var parts = wid.split('|');
  var ref = parts.length >= 3 ? parts[0] + ' ' + parts[1] + ':' + verseNum : '';
  return { heb: heb.join(' '), eng: eng.join(' · '), ref: ref, num: verseNum };
}

function _getShareUrl() {
  var base = window.location.href.split('#')[0];
  var hash = window.location.hash;
  return base + hash;
}

function getShareContent() {
  var url = _getShareUrl();
  var chapter = getChapterLabel(window.currentChapterId);
  var verse = _getHighlightedVerse();
  if (verse && verse.heb) {
    return {
      title: verse.ref + ' \u2014 ' + _swShareTitle(),
      text: verse.heb + '\n' + verse.eng + '\n(' + verse.ref + ')',
      url: url
    };
  }
  return {
    title: _swShareTitle(),
    text: chapter + ' \u2014 ' + _swShareTitle(),
    url: url
  };
}

function openSharePopup() {
  _shareContent = getShareContent();
  document.getElementById('share-title').textContent =
    _shareContent.text.includes(':') ? 'Share verse' : 'Share ' + _getChapterLabel();
  document.getElementById('share-preview').textContent =
    _shareContent.text.length > 120 ? _shareContent.text.substring(0, 120) + '...' : _shareContent.text;
  document.getElementById('copy-label').textContent = 'Copy';
  // Show native share on mobile
  if (navigator.share) {
    document.getElementById('share-native-btn').style.display = '';
  }
  document.getElementById('share-popup').classList.add('visible');
  document.getElementById('share-overlay').classList.add('visible');
}

function closeSharePopup() {
  document.getElementById('share-popup').classList.remove('visible');
  document.getElementById('share-overlay').classList.remove('visible');
}

function shareCopyLink() {
  var c = _shareContent || getShareContent();
  var copyText = c.text + '\n' + c.url;
  navigator.clipboard.writeText(copyText).then(function() {
    document.getElementById('copy-label').textContent = 'Copied!';
    setTimeout(function() { document.getElementById('copy-label').textContent = 'Copy'; }, 2000);
  });
}

function shareToTruth() {
  var c = _shareContent || getShareContent();
  var text = c.text + '\n' + c.url;
  window.open('https://truthsocial.com/share?text=' + encodeURIComponent(text), '_blank');
  closeSharePopup();
}

function shareToFacebook() {
  var c = _shareContent || getShareContent();
  window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(c.url) + '&quote=' + encodeURIComponent(c.text), '_blank');
  closeSharePopup();
}

function shareToX() {
  var c = _shareContent || getShareContent();
  window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(c.text) + '&url=' + encodeURIComponent(c.url), '_blank');
  closeSharePopup();
}

function shareNative() {
  var c = _shareContent || getShareContent();
  navigator.share({ title: c.title, text: c.text, url: c.url }).catch(function() {});
  closeSharePopup();
}

/* ══════════════════════════════════════════════════════════════════════
   THE SELECTION TOOLBAR — one implementation
   ══════════════════════════════════════════════════════════════════════
   Eight functions, and in every one of them bom.html's was the fuller copy —
   not a different design, the same design further along: null guards on
   elements the five dereferenced blind, the highlight button showing its
   active state, the note field carrying the verse reference as its
   placeholder, the selection cleared after an action so the toolbar does not
   linger over nothing, and clearing an annotation going through
   setWordAnnotation instead of reaching into the store.

   The five's DOM already has every id these touch — sel-subpanel,
   sel-note-row, sel-btn-highlight — so they gain the behaviour with no markup
   change.

   addNoteMarkers and openNoteInXrefPanel exist only on bom.html; they belong
   to the cross-reference panel, which is still forked. They are called through
   a typeof guard so this file does not depend on a cluster it has not reached
   yet — on the five the guard is simply false, which is exactly what those
   pages did before. */

function _showSelToolbar() {
  var sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
    _hideSelToolbar();
    return;
  }
  // Don't trigger on inputs/textareas or inside the toolbar itself
  var anchor = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode);
  if (anchor && (anchor.closest('#sel-toolbar') || anchor.closest('#hl-pop') || anchor.closest('input') || anchor.closest('textarea') || anchor.closest('#search-results'))) return;

  var wus = _getSelectedWordUnits(sel);
  if (wus.length > 0) {
    _selMode = 'word';
    _selWordUnits = wus;
  } else {
    _selMode = 'text';
    _selWordUnits = [];
  }

  var range = sel.getRangeAt(0);
  var rect = range.getBoundingClientRect();

  // Reset the rail's sub-panels
  var sp = document.getElementById('sel-subpanel');
  if (sp) sp.style.display = 'none';
  var snr = document.getElementById('sel-note-row');
  if (snr) snr.style.display = 'none';
  var hlBtn = document.getElementById('sel-btn-highlight');
  if (hlBtn) hlBtn.classList.remove('active');

  // The popover appears at the selection: color rows for word selections,
  // note/copy/share always; it closes when the selection collapses.
  var pop = document.getElementById('hl-pop');
  if (!pop) return;
  var rowHl = document.getElementById('hl-row-hl');
  if (rowHl) rowHl.style.display = _selMode === 'word' ? 'flex' : 'none';
  var rowUl = document.getElementById('hl-row-ul');
  if (rowUl) rowUl.style.display = _selMode === 'word' ? 'flex' : 'none';
  var noteRow = document.getElementById('hl-note-row');
  if (noteRow) noteRow.style.display = 'none';
  pop.classList.add('visible');
  if (_selMode === 'word') _updateSelToolbarIndicators();
}

function _loadSelNote() {
  var ta = document.getElementById('sel-note-input');
  if (!ta) return;
  var vk = _selVerseKey();
  ta.value = vk ? (_swNotes[vk] || '') : '';
  // Show verse reference as placeholder
  if (vk) {
    var parts = vk.split('|');
    ta.placeholder = 'Note for ' + parts[0] + ' ' + parts[1] + ':' + parts[2] + '...';
  }
}

function selToolbarToggleColors() {
  var panel = document.getElementById('sel-subpanel');
  var btn = document.getElementById('sel-btn-highlight');
  var noteRow = document.getElementById('sel-note-row');
  if (panel.style.display === 'none' || panel.style.display === '') {
    noteRow.style.display = 'none';
    panel.style.display = 'block';
    btn.classList.add('active');
    _updateSelToolbarIndicators();
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }
}

function selToolbarOpenNote() {
  var row = document.getElementById('sel-note-row');
  var panel = document.getElementById('sel-subpanel');
  if (!row || !panel) return;
  var showing = row.style.display !== 'none';
  if (showing) {
    row.style.display = 'none';
    var hlBtn = document.getElementById('sel-btn-highlight');
    if (!hlBtn || !hlBtn.classList.contains('active')) {
      panel.style.display = 'none';
    }
  } else {
    panel.style.display = 'block';
    row.style.display = 'block';
    _loadSelNote();
    var ta = document.getElementById('sel-note-input');
    if (ta) ta.focus();
  }
}

function selToolbarSaveNote() {
  var vk = _selVerseKey();
  if (!vk) return;
  var ta = document.getElementById('sel-note-input');
  if (!ta) return;
  if (ta.value.trim()) {
    _swNotes[vk] = ta.value;
  } else {
    delete _swNotes[vk];
  }
  _saveNotes();
  var noteText = ta.value.trim();
  ta.value = '';
  window.getSelection().removeAllRanges();
  _hideSelToolbar();
  // Add note marker to the verse and open in xref panel
  if (typeof addNoteMarkers === 'function') addNoteMarkers();
  if (noteText) {
    if (typeof openNoteInXrefPanel === 'function') openNoteInXrefPanel(vk);
  }
}

function selToolbarClearAll() {
  _selWordUnits.forEach(function(wu) {
    var wid = wu.getAttribute('data-wid');
    if (wid) {
      setWordAnnotation(wid, _selTier, 'hl', null);
      setWordAnnotation(wid, _selTier, 'ul', null);
    }
  });
  window.getSelection().removeAllRanges();
  setTimeout(_hideSelToolbar, 150);
}

function selToolbarCopy() {
  var text;
  if (_selMode === 'word' && _selWordUnits.length > 0) {
    var heb = [], eng = [];
    _selWordUnits.forEach(function(wu) {
      var hw = wu.querySelector('.hw');
      var gl = wu.querySelector('.gl');
      if (hw) heb.push(hw.textContent);
      if (gl && gl.textContent.trim()) eng.push(gl.textContent.trim());
    });
    text = heb.join(' ') + '\n' + eng.join(' \u00b7 ');
  } else {
    var sel = window.getSelection();
    text = sel ? sel.toString() : '';
  }
  navigator.clipboard.writeText(text).then(function() {
    ['sel-btn-copy', 'hl-btn-copy'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) { btn.style.color = 'var(--here-chrome)'; setTimeout(function() { btn.style.color = ''; }, 1200); }
    });
  });
}

function selToolbarShare() {
  var shareText, ref;
  if (_selMode === 'word' && _selWordUnits.length > 0) {
    var heb = [], eng = [];
    _selWordUnits.forEach(function(wu) {
      var hw = wu.querySelector('.hw');
      var gl = wu.querySelector('.gl');
      if (hw) heb.push(hw.textContent);
      if (gl && gl.textContent.trim()) eng.push(gl.textContent.trim());
    });
    var wid = _selWordUnits[0].getAttribute('data-wid') || '';
    var parts = wid.split('|');
    ref = parts.length >= 3 ? parts[0] + ' ' + parts[1] + ':' + parts[2] : _getChapterLabel();
    shareText = heb.join(' ') + '\n' + eng.join(' · ') + '\n(' + ref + ')';
  } else {
    var sel = window.getSelection();
    shareText = sel ? sel.toString() : '';
    ref = typeof _getChapterLabel === 'function' ? _getChapterLabel() : 'Book of Mormon';
  }
  _shareContent = {
    title: ref + ' — Hebrew Interlinear',
    text: shareText,
    url: typeof _getShareUrl === 'function' ? _getShareUrl() : window.location.href
  };
  document.getElementById('share-title').textContent = 'Share selection';
  document.getElementById('share-preview').textContent =
    _shareContent.text.length > 120 ? _shareContent.text.substring(0, 120) + '...' : _shareContent.text;
  document.getElementById('copy-label').textContent = 'Copy';
  if (navigator.share) document.getElementById('share-native-btn').style.display = '';
  document.getElementById('share-popup').classList.add('visible');
  document.getElementById('share-overlay').classList.add('visible');
}

/* ══════════════════════════════════════════════════════════════════════
   ONE WORD UNIT — the hottest function in the reader
   ══════════════════════════════════════════════════════════════════════
   Both copies did the same job and each had something the other lacked.

     inert on the five   computeGlossFromHebrew(h, baseGloss) is gated on
                         window._useStrongsMorphGloss, which reader_core sets
                         to false and nothing ever sets true — so it returned
                         its fallback unchanged. Dropped rather than carried.
     missing on the BOM  the exception mark. root_scorecard's registry covers
                         transliterated names (Adam-ondi-Ahman, Ahman,
                         Shedolamak) AND Hebrew acronyms — both are words with
                         no root that the engine must skip — and bom.html
                         rendered תנ״ך with no mark at all. It gets one now.
                         The title says both things, because the registry does.
     data-mgl            dc.html and pgp.html already set it through the
                         READER.wordUnitExtra hook; bom.html did it inline.
                         It goes through the hook there too.

   The no-nikkud state is read through _swNoNikkud() because the two pages
   record it differently — window._noNikkud on the five, a body class on the
   Book of Mormon — and both are still their own to set. The display rules
   themselves were already identical, geminated vav and all. */
function _swNoNikkud() {
  return !!window._noNikkud ||
    !!(document.body && document.body.classList.contains('no-nikkud'));
}
function _stripNikkudDisplay(s) {
  /* geminated vav doubles in plene display: metavvekh -> מתווך, never מתוך */
  return s.replace(/ו(ּ[\u05B0-\u05C7\u05BB]|[\u05B0-\u05C7\u05BB]ּ)/g, 'וו$1')
          .replace(/[\u0591-\u05BD\u05BF-\u05C0\u05C3-\u05C7]/g, '');
}
function _isTranslitTerm(h) {
  try {
    return !!(window.RootScorecard && window.RootScorecard.isTranslitTerm &&
              window.RootScorecard.isTranslitTerm(h));
  } catch (e) { return false; }
}

function makeWordUnit(h, e, isSof) {
  if (h === '\u05C3') return '';
  h = h.replace(/\u05C3/g, '');            // embedded sof pasuq: CSS ::after draws it
  var div = document.createElement('div');
  div.className = 'word-unit' + (isSof ? ' sof' : '');
  div.setAttribute('data-h', h);
  var gloss = augmentGlossWithPrefixes(h, e.replace(/-/g, ' '));
  var displayH = _swNoNikkud()
    ? _stripNikkudDisplay(h)
    : h.replace(/([\u05D0-\u05EA][\u0591-\u05C6]*\u05C7[\u0591-\u05C6]*)/g, '<span class="qq">$1</span>');
  if (_isTranslitTerm(h)) {
    displayH += '<span class="tt-mark" title="transliterated term or acronym — no Hebrew root">*</span>';
  }
  var glCls = 'gl' + ((gloss && gloss.length <= 18 && gloss.split(' ').length <= 3) ? ' gl-nw' : '');
  div.innerHTML = '<span class="hw" lang="he">' + displayH + '</span>' +
                  '<span class="tl"></span><span class="' + glCls + '">' + gloss + '</span>';
  div.setAttribute('tabindex', '0');
  div.setAttribute('role', 'button');
  if (window.READER && window.READER.wordUnitExtra) window.READER.wordUnitExtra(div, h);
  return div;
}
