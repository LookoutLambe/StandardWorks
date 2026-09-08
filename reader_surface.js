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
    _shareContent.text.includes(':') ? 'Share verse' : 'Share ' + getChapterLabel(window.currentChapterId);
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
    ref = parts.length >= 3 ? parts[0] + ' ' + parts[1] + ':' + parts[2] : getChapterLabel(window.currentChapterId);
    shareText = heb.join(' ') + '\n' + eng.join(' · ') + '\n(' + ref + ')';
  } else {
    var sel = window.getSelection();
    shareText = sel ? sel.toString() : '';
    ref = getChapterLabel(window.currentChapterId);
  }
  _shareContent = {
    title: ref + ' \u2014 ' + _swShareTitle(),
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
                         window._useStrongsMorphGloss, which reader_core set
                         to false and nothing ever set true — so it returned
                         its fallback unchanged. Dropped rather than carried,
                         and deleted outright on 2026-09-08 with the rest of
                         the morph-gloss subsystem (see below).
     missing on the BOM  the exception mark. root_scorecard's registry covers
                         transliterated names (Adam-ondi-Ahman, Ahman,
                         Shedolamak) AND Hebrew acronyms — both are words with
                         no root that the engine must skip — and bom.html
                         rendered תנ״ך with no mark at all. It gets one now.
                         The title says both things, because the registry does.
     data-mgl            REMOVED 2026-09-08. Three pages set it on every
                         word through READER.wordUnitExtra, and its own
                         display had been off for a year behind
                         `if (false && morphGloss)` because the affix peeler
                         ate lexeme letters. Measured before deleting: on a
                         chapter rendered after Strong's lands it filled 870
                         of 1,020 words and the values were WRONG — וְעַתָּה
                         "and now" came back "and her at this time" (the ה of
                         עתה read as a "her" suffix), אֲנִי "I" as "my I",
                         כֹּתֵב "writing" as "as write", אֲשֶׁר־דִּבֶּר "who spoke"
                         as "subdue". Before the warmup it filled nothing, so
                         the attribute was empty on a first render and wrong
                         on every later one. The word card's Parse line
                         (root_scorecard.js) supersedes it and is correct:
                         "conjunction + adverb · וְ · עַתָּה". The
                         READER.wordUnitExtra hook itself stays — it is the
                         sanctioned way for a page to touch a word unit — but
                         nothing implements it now, and nothing should put
                         Strong's-dependent work back on the render path.

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

/* ── Moving between chapters, and closing what is open ─────────────────────
   goNext / goPrev  bom.html consults chapterOrder first when a chapter is
                    open, because currentPageId can go stale in PWA edge cases
                    — a navigation triggered from outside the page, or timing
                    against the service worker's restore — and the page-order
                    lookup then lands nowhere. The five had only the page-order
                    path. Keeping the fast path costs them nothing.
   updateNavButtons bom.html shows reading progress ("Alma 32 · 32/63 · Book 9
                    of 15") through getBookProgress, which only that page
                    defines; the call is guarded, so the five keep the plain
                    label until they define one. The landing label was a
                    hardcoded 'Book of Mormon' and is READER.navLabelHe now.
   closeAllPanels   the two had drifted into closing different sets. bom.html
                    had gained NavEngine.close() and the annotations panel; the
                    five still closed the share popup by a class it no longer
                    uses. The union, with .visible — which is the class all six
                    share since sharing became one implementation. */

function goNext() {
  // Prefer chapterOrder when reading a chapter; currentPageId can get stale in PWA
  // edge-cases (e.g., navigation triggered externally / timing with SW restore).
  if (currentChapterId && chapterOrder.indexOf(currentChapterId) >= 0) {
    var cidx = chapterOrder.indexOf(currentChapterId);
    if (cidx >= 0 && cidx < chapterOrder.length - 1) {
      navTo(chapterOrder[cidx + 1], 'next');
    }
    return;
  }
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx >= 0 && idx < fullPageOrder.length - 1) navTo(fullPageOrder[idx + 1], 'next');
}

function goPrev() {
  if (currentChapterId && chapterOrder.indexOf(currentChapterId) >= 0) {
    var cidx = chapterOrder.indexOf(currentChapterId);
    if (cidx > 0) {
      navTo(chapterOrder[cidx - 1], 'prev');
    }
    return;
  }
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx > 0) navTo(fullPageOrder[idx - 1], 'prev');
}

function updateNavButtons() {
  var prevBtn = document.getElementById('nav-prev');
  var nextBtn = document.getElementById('nav-next');
  var label = document.getElementById('nav-label');
  var idx = fullPageOrder.indexOf(currentPageId);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= fullPageOrder.length - 1;
  prevBtn.textContent = '\u2190';
  nextBtn.textContent = '\u2192';
  if (label) {
    if (currentChapterId) {
      var progress = (typeof getBookProgress === 'function') ? getBookProgress(currentChapterId) : null;
      if (progress) {
        var mainText = progress.bookName;
        if (progress.totalChapters > 1) mainText += ' ' + progress.chapterNum;
        label.innerHTML = mainText + ' \u25BE' +
          '<span id="nav-progress-text">' +
          progress.chapterNum + '/' + progress.totalChapters +
          ' \u00B7 Book ' + progress.bookIndex + ' of ' + progress.totalBooks +
          '</span>';
      } else {
        label.textContent = getChapterLabel(currentChapterId) + ' \u25BE';
      }
    } else if (window.currentPageId && (((window.READER || {}).frontTitles || {})[window.currentPageId])) {
      /* Front matter and the topical guide are pages, not chapters, so
         currentChapterId is null there and the pill fell back to the volume's
         name — "Book of Mormon" while the Title Page was on screen.
         getChapterLabel names them, so use it. */
      label.textContent = getChapterLabel(window.currentPageId) + ' \u25BE';
    } else {
      label.textContent = (window.READER && window.READER.navLabelHe ? window.READER.navLabelHe : '') + ' \u25BE';
    }
  }
}

function closeAllPanels() {
  if (window.NavEngine) NavEngine.close();
  var sc = document.getElementById('search-container');
  if (sc && sc.classList.contains('open')) closeSearch();
  var wp = document.getElementById('word-popup');
  if (wp && wp.style.display !== 'none' && wp.style.display !== '') closePopup();
  var ap = document.getElementById('annotations-panel');
  if (ap && ap.classList.contains('open')) closeAnnotationsPanel();
  var sp = document.getElementById('share-popup');
  if (sp && sp.classList.contains('visible')) closeSharePopup();
  var gp = document.getElementById('glossary-panel');
  if (gp && gp.classList.contains('open')) closeGlossary();
  var xp = document.getElementById('xref-panel');
  if (xp && xp.classList.contains('open')) closeXrefPanel();
}

/* ── Leaving the glossary for a verse, and getting your notes out ──────────
   goToGlossaryVerse    the five's version is the one that was deliberately
                        fixed: a dictionary entry lists every verse a root
                        appears in, so this is the longest jump in the app, and
                        a bare navTo() CLEARS the return point instead of
                        setting one — the reader looked a word up from Alma 32,
                        followed it, and had no way back (and inside the iOS app
                        there is no browser Back either). It built the chapter
                        id by hand from the five's scheme, which is why the BOM
                        could not use it; it goes through the shared id model
                        now and works for both.

   export / copy        these were not two versions of one function. The five
                        download a JSON file with the annotations AND the
                        notes; bom.html copies the notes to the clipboard as
                        readable text. Both are worth having and each page
                        promised only one of them in its button, so both are
                        here and every page gets both buttons. */
function goToGlossaryVerse(verseKey) {
  closeGlossary();
  swGoToVerseKey(verseKey);
}

function exportAnnotations() {
  var data = {
    annotations: _swAnnotations, notes: _swNotes,
    exported: new Date().toISOString(),
    reader: (window.READER && window.READER.readerName) || document.title
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = ((window.READER && window.READER.vol) || 'reader') + '-annotations.json';
  a.click();
  URL.revokeObjectURL(url);
}

function copyAllNotes() {
  var keys = Object.keys(_swNotes).sort();
  var title = ((window.READER && window.READER.readerName) || 'Reader') + ' Study Notes';
  var text = title + '\n' + '='.repeat(title.length) + '\n\n';
  keys.forEach(function(key) {
    var parts = key.split('|');
    text += (parts.length >= 3 ? parts[0] + ' ' + parts[1] + ':' + parts[2] : key) + '\n';
    text += _swNotes[key] + '\n\n';
  });
  navigator.clipboard.writeText(text).then(function() {
    alert(keys.length ? 'Notes copied to clipboard!' : 'No notes yet.');
  });
}

/* One word row. The two copies were the same function written twice — the five
   in ES5, bom.html in ES6 with destructured parameters — and nothing else
   differed. The ES5 form is kept because that is what the rest of this codebase
   is; bom.html's comments are kept because they say what the shapes are for. */
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
    if (el && verseKey) el.setAttribute('data-wid', verseKey + '|' + realCount);   // the annotation key
    /* Schottenstein-style chevron between words (points left in the RTL flow). */
    var chevron = document.createElement('span');
    chevron.className = 'arr';
    var sym = isLastWord ? '\u00ab' : '\u2039';
    chevron.innerHTML = '<span class="arr-hw">\u200B</span><span class="arr-tl">' + sym + '</span><span class="arr-gl">' + sym + '</span>';
    /* Word and chevron wrap as one. */
    var group = document.createElement('span');
    group.className = 'word-group';
    if (el) group.appendChild(el);
    group.appendChild(chevron);
    appendWordGroup(container, group);   // interlinear_gloss.js — one home for all four builders
    realCount++;
  });
}

/* ── Which words a selection actually covers ───────────────────────────────
   Two real differences, and bom.html had the better of both.

   It stops the walk at .heading-flow as well as .verse / .word-flow. That
   matters more now than it did: without it a selection inside a chapter
   summary walks all the way up to .chapter-panel and then tests every word in
   the chapter — hundreds of them — instead of the heading's own. Since the
   headings became annotatable this is the difference between scoping the
   selection and scanning the panel.

   And it tests containment through _selRangeContainsNode, which falls back to
   comparing range boundary points where Selection.containsNode is missing or
   throws, rather than calling it bare. */
function _selRangeContainsNode(sel, node) {
  if (!sel || !sel.rangeCount || !node) return false;
  try {
    if (typeof sel.containsNode === 'function') return sel.containsNode(node, true);
  } catch (e1) {}
  try {
    var range = sel.getRangeAt(0);
    var nr = document.createRange();
    nr.selectNodeContents(node);
    return range.compareBoundaryPoints(Range.END_TO_START, nr) < 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, nr) > 0;
  } catch (e2) { return false; }
}

function _getSelectedWordUnits(sel) {
  if (!sel.rangeCount) return [];
  var range = sel.getRangeAt(0);
  var tier = _detectTier(sel.anchorNode);
  if (!tier) tier = _detectTier(sel.focusNode);
  if (!tier) return [];
  _selTier = tier;
  var container = range.commonAncestorContainer;
  if (container.nodeType === 3) container = container.parentElement;
  while (container && !container.classList.contains('verse') &&
         !container.classList.contains('word-flow') &&
         !container.classList.contains('heading-flow') &&
         !container.classList.contains('chapter-panel')) {
    if (container.tagName === 'BODY') return [];      // never scan the whole DOM
    container = container.parentElement;
  }
  if (!container) return [];
  var wordUnits = container.querySelectorAll('.word-unit[data-wid]');
  var result = [];
  wordUnits.forEach(function(wu) {
    var tierEl = wu.querySelector('.' + tier);
    if (!tierEl) return;
    if (_selRangeContainsNode(sel, tierEl)) result.push(wu);
  });
  return result;
}

/* ── The view mode (Interlinear / Hebrew only / Dual) ──────────────────────
   Three differences, and the copies disagreed about which buttons the mode
   owns. The five exclude BOTH #btn-translit and #btn-nikkud from the
   deactivation sweep; bom.html excluded only #btn-translit — and it has a
   nikkud button, so switching view mode silently cleared its active state
   while the vowel points stayed off. The five's selector is the correct one.

   Turning the Dual column on has to fetch this book's English on the Book of
   Mormon, whose renderer does not; the five's loadEnglishText fetches its own.
   READER.ensureEnglishFor is the volume saying which it is, the same shape as
   READER.ensureBook. */
function setMode(mode) {
  _keepVersePosition(function() {
    document.body.classList.remove('hide-gloss', 'english-only', 'dual-mode');
    document.querySelectorAll('.controls-bottom button:not(#btn-translit):not(#btn-nikkud)')
      .forEach(function(b) { b.classList.remove('active'); });
    if (mode === 'heb') {
      document.body.classList.add('hide-gloss');
      document.getElementById('btn-heb').classList.add('active');
    } else if (mode === 'dual') {
      document.body.classList.add('dual-mode');
      document.getElementById('btn-dual').classList.add('active');
      var R = window.READER || {};
      if (typeof R.ensureEnglishFor === 'function' && window.currentChapterId) {
        R.ensureEnglishFor(window.currentChapterId, function () { loadEnglishText(); });
      } else {
        loadEnglishText();   // idempotent; in chunk mode it also fetches what is on the page
      }
    } else {
      document.getElementById('btn-inter').classList.add('active');
    }
  });
  try { localStorage.setItem((window.READER && window.READER.vol) + '-view-mode', mode || 'inter'); } catch(e) {}
}

/* ── The English column ────────────────────────────────────────────────────
   TWO SHAPES OF THE SAME DATA. The five's English chunks call registerEnglish
   and fill _englishMap as they load, so all this has to do is make sure the
   chunks for the chapters on the page have arrived. The Book of Mormon's
   chunks concat rows into _officialVersesData, which have to be folded in
   here. Both then fill the same divs.

   Folding is idempotent — keyed by book|chapter|verse, so re-processing a
   verse rewrites it with itself — which matters because this is called again
   every time a chunk lands.

   bom.html also carried a fetch/XHR fallback to official_verses.json for
   file:// use. That file does not exist and has not for as long as the repo
   records, so the branch was unreachable; it is not carried across. */
function loadEnglishText() {
  var R = window.READER || {};
  var rows = window.defined_verses || window._officialVersesData;
  if (rows && rows.length) {
    var before = Object.keys(window._englishMap).length;
    rows.forEach(function (v) {
      window._englishMap[v.book + '|' + v.chapter + '|' + v.verse] = v.english;
    });
    window._englishLoaded = true;
    if (Object.keys(window._englishMap).length !== before) populateEnglishDivs();
    return;
  }
  if (R.englishDir) {
    window._englishLoaded = true;
    if (typeof window.__swEnsureEnglishRendered === 'function') {
      window.__swEnsureEnglishRendered(populateEnglishDivs);
    } else {
      populateEnglishDivs();
    }
    return;
  }
  if (window._englishLoaded) return;
  var eng = R.englishData && window[R.englishData];
  if (!eng) {
    /* The view-mode restore calls this BEFORE the English data script tag has
       run — without a retry a saved Dual page rendered a permanently empty
       column. Retry once every page script has executed. */
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadEnglishText);
    return;
  }
  eng.forEach(function (v) {
    window._englishMap[v.book + '|' + v.chapter + '|' + v.verse] = v.english;
  });
  window._englishLoaded = true;
  populateEnglishDivs();
}

/* ── The glossary list ─────────────────────────────────────────────────────
   The two copies were identical apart from ONE thing repeated seven times: how
   much of the pointing to strip before matching. The five stripped
   \u0591-\u05C7 — everything; bom.html stripped a narrower range that keeps
   the maqqef and the shin/sin dots, because ש with the left dot is not the same
   consonant as ש with the right one and folding them merges roots that are
   deliberately separate.

   That difference is real and it already has a home: _stripNikkud, which each
   page declares for itself and which is the one function in this de-fork that
   stays forked ON PURPOSE. Routing these seven inline regexes through it makes
   the rest of the function identical, so the list can be shared while each
   volume keeps its own idea of what a letter is. */
function renderGlossaryList() {
  var list = document.getElementById('glossary-list');
  var searchVal = (document.getElementById('glossary-search').value || '').trim().toLowerCase();
  var activeTab = document.querySelector('.glossary-tab.active');
  var tab = activeTab ? activeTab.getAttribute('data-tab') : 'all';
  var sortVal = document.getElementById('glossary-sort-select').value;
  var filtered = glossaryIndex.filter(function(e) {
    if (searchVal) {
      // normFinals must be applied to BOTH sides. Folding ם→מ on the search
      // term only made every word ending in a final letter unfindable —
      // "שבעים" became "שבעימ" and matched nothing. That is all ־ים plurals.
      var svNorm = normFinals(_stripNikkud(searchVal));
      var rootNorm = normFinals(_stripNikkud(e.root));
      var dispNorm = normFinals(_stripNikkud(e.displayHeb || ''));
      return rootNorm.indexOf(svNorm) === 0 || dispNorm.indexOf(svNorm) === 0 ||
        e.root.toLowerCase().indexOf(searchVal) >= 0 ||
        e.meaning.toLowerCase().indexOf(searchVal) >= 0 ||
        Object.keys(e.glosses).some(function(g) { return g.toLowerCase().indexOf(searchVal) >= 0; }) ||
        Object.keys(e.forms || {}).some(function(f) { var fn2 = normFinals(_stripNikkud(f)); return fn2.indexOf(svNorm) === 0; });
    }
    return true;
  });
  // A search naming a root exactly should return that root, not every root it
  // is a prefix of: "חלם" listed חַלָּמִישׁ (flint) beside חָלַם.
  if (searchVal) {
    var svExactNarrow = normFinals(_stripNikkud(searchVal));
    var exactHits = filtered.filter(function(e) {
      var r0 = normFinals(_stripNikkud(String(e.root || '')));
      var d0 = normFinals(_stripNikkud(String(e.displayHeb || '')));
      return r0 === svExactNarrow || d0 === svExactNarrow;
    });
    if (exactHits.length) filtered = exactHits;
  }
  if (sortVal === 'freq-desc') filtered.sort(function(a,b) { return b.count - a.count; });
  else if (sortVal === 'freq-asc') filtered.sort(function(a,b) { return a.count - b.count; });
  else if (sortVal === 'alpha-heb') filtered.sort(function(a,b) { return a.root.localeCompare(b.root,'he'); });
  else if (sortVal === 'alpha-eng') filtered.sort(function(a,b) { return a.meaning.localeCompare(b.meaning,'en'); });
  var html = '';
  if (tab === 'category') {
    var cats = {};
    filtered.forEach(function(e) { var c = e.category || 'Uncategorized'; if (!cats[c]) cats[c] = []; cats[c].push(e); });
    Object.keys(cats).sort().forEach(function(cat) {
      html += '<div class="glossary-category-header">' + cat + ' (' + cats[cat].length + ')</div>';
      cats[cat].forEach(function(e) { html += renderGlossaryEntry(e); });
    });
  } else if (tab === 'frequent') {
    filtered.sort(function(a,b) { return b.count - a.count; });
    filtered.slice(0, 100).forEach(function(e) { html += renderGlossaryEntry(e); });
  } else {
    filtered.forEach(function(e) { html += renderGlossaryEntry(e); });
  }
  if (!html) html = '<div style="color:var(--ink-light);padding:20px;font-style:italic;">No roots found.</div>';
  list.innerHTML = html;
}

/* ── Panels the word card launches ─────────────────────────────────────────
   A click inside one of these is the same study gesture continuing, not "the
   reader moved on", so the outside-click closer must not treat it as a reason
   to destroy the card. The list had been written out as a bare
   closest('#xref-panel') in FOUR places, and the glossary was never added to
   any of them — so opening the Root Glossary from a word (which is what the
   root headword and the Strong's number do) left a panel where every click,
   including its own ✕, closed the card behind it.

   Same set as nav_engine's COEXIST, and stated here so the two cannot drift:
   nav_engine builds its pairs from this list. */
window.SW_CARD_PANELS = ['xref-panel', 'glossary-panel'];
function _swInsideCardPanel(target) {
  if (!target || !target.closest) return false;
  for (var i = 0; i < window.SW_CARD_PANELS.length; i++) {
    if (target.closest('#' + window.SW_CARD_PANELS[i])) return true;
  }
  return false;
}

/* ── A dictionary entry ────────────────────────────────────────────────────
   bom.html's was the fuller of the two — it also lists Tanakh cross-references
   — so it is the one that survives, and the five gain that section.

   EVERY FORM, not the top eight (user's ask). Two caps were hiding them, and
   the renderer's was the lesser one: tools/build_root_concordance.js kept only
   the top SIX surface forms per root, so ברא came back with six no matter what
   the panel did, and 20% of roots were silently truncated in the DATA. Both
   caps are gone. The cost is real and accepted — root_concordance.js grew
   5.55 MB → 6.95 MB — and it is an idle-loaded file, not on the reading path.

   A common root can now carry hundreds of forms (max in the corpus: 522), so
   the list scrolls inside its own box instead of running the panel off the
   screen, and the heading says how many there are. */
function renderGlossaryEntry(entry) {
  var formPairs = Object.entries(entry.forms || {}).sort(function(a, b) { return b[1] - a[1]; });
  var formsList = formPairs.map(function(pair) {
    return '<span class="glossary-form-chip" onclick="event.stopPropagation();highlightForm(\'' +
      pair[0].replace(/'/g, "\\'") + '\')">' + pair[0] + ' <small>(' + pair[1] + ')</small></span>';
  }).join('');
  var glossList = Object.entries(entry.glosses || {}).sort(function(a, b) { return b[1] - a[1]; })
    .map(function(pair) { return '"' + pair[0] + '" (' + pair[1] + 'x)'; }).join(', ');
  var refsHtml = buildVerseRefsHtml(entry.verseRefs || {});
  var rootHeb = entry.displayHeb || toSofit(entry.root);
  var rootTranslit = entry.displayTranslit || transliterate(toSofit(entry.root));

  var biblHtml = '';
  if (entry.biblicalRefs && entry.biblicalRefs.length > 0) {
    biblHtml = '<div class="glossary-biblical-section"><strong>Tanakh Cross-References:</strong>' +
      '<div class="glossary-biblical-list">';
    entry.biblicalRefs.forEach(function(br) {
      biblHtml += '<div class="glossary-biblical-ref">' +
        '<span class="glossary-biblical-ref-key">' + br.ref + '</span> ' +
        '<span class="glossary-biblical-ref-note">' + br.note + '</span></div>';
    });
    biblHtml += '</div></div>';
  }

  return '<div class="glossary-entry" onclick="toggleGlossaryEntry(this)">' +
    '<div class="glossary-entry-header">' +
      '<span class="glossary-root" data-root-key="' + entry.root + '">' + rootHeb + '</span>' +
      '<span style="font-size:0.75em;opacity:0.6;margin-left:6px;">' + rootTranslit + '</span>' +
      '<span class="glossary-count">' + entry.count + 'x</span>' +
    '</div>' +
    '<div class="glossary-meaning">' + (entry.meaning || '<em style="color:var(--ink-light)">(tap to expand)</em>') + '</div>' +
    (entry.category !== 'Uncategorized' ? '<span class="glossary-category-badge">' + entry.category + '</span>' : '') +
    '<div class="glossary-detail">' +
      (entry._rscChips ? '<div style="margin-bottom:6px;">' + entry._rscChips + '</div>' : '') +
      '<div><strong>Glosses:</strong> ' + glossList + '</div>' +
      '<div style="margin-top:6px;"><strong>Forms</strong> (' + formPairs.length + '):</div>' +
      '<div class="glossary-forms-list">' + formsList + '</div>' +
      biblHtml +
      refsHtml +
      '<button class="glossary-highlight-btn" onclick="event.stopPropagation();highlightAllForms(\'' +
        entry.root.replace(/'/g, "\\'") + '\')">Highlight all in text</button>' +
    '</div>' +
  '</div>';
}

/* ── Building the dictionary index ─────────────────────────────────────────
   Two differences. bom.html read window.rootFreq through a guard where the five
   read the bare name, which throws if the concordance has not landed — that
   guard is kept. And bom.html stripped the pointing with its own inline regex
   where the five call _stripNikkud; routed through _stripNikkud, each page
   keeps its own idea of which marks are letters (the BOM's spares the maqqef
   and the shin/sin dots) and the function itself is one. */
function buildGlossaryIndex() {
  if (glossaryIndex) return;
  // Cross-volume index from the concordance: every root in the whole corpus,
  // with total counts — the in-page fallback below only sees this volume.
  if (window.RootScorecard && RootScorecard.ready()) {
    glossaryIndex = RootScorecard.glossaryEntries(typeof glossaryExclude !== 'undefined' ? glossaryExclude : null);
    if (glossaryIndex) return;
  }
  glossaryIndex = [];
  var curated = window._rootGlossaryData || {};
  var rf = window.rootFreq || {};
  for (var root in rf) {
    if (glossaryExclude.has(root)) continue;
    var rInfo = rf[root];
    // For Strong's H-number roots, resolve display info and curated data
    var displayHeb = root, displayTranslit = '';
    var cInfo = curated[root] || {};
    if (/^H\d+$/.test(root) && window._strongsRoots && _strongsRoots[root]) {
      var sEntry = _strongsRoots[root];
      displayHeb = sEntry.w;
      displayTranslit = (typeof transliterate === 'function' && sEntry.w ? transliterate(sEntry.w) : '') || sEntry.x || '';
      if (!cInfo.meaning) {
        var consRoot = _stripNikkud(sEntry.w);
        cInfo = curated[consRoot] || {};
      }
    }
    var topGloss = '', topCount = 0;
    for (var g in rInfo.glosses) { if (rInfo.glosses[g] > topCount) { topCount = rInfo.glosses[g]; topGloss = g; } }
    var autoMeaning = topGloss.replace(/^(and-|the-|to-|in-|from-|as-|that-|by-|for-|with-|a-|an-)+/g,'').replace(/-/g,' ');
    glossaryIndex.push({
      root: root, displayHeb: displayHeb, displayTranslit: displayTranslit,
      meaning: cInfo.meaning || autoMeaning || '', category: cInfo.category || 'Uncategorized',
      count: rInfo.count, forms: rInfo.forms, glosses: rInfo.glosses,
      exampleVerse: rInfo.exampleVerse || '', verseRefs: rInfo.verseRefs || {}, biblicalRefs: cInfo.biblicalRefs || []
    });
  }
}

/* ── The annotations panel ─────────────────────────────────────────────────
   bom.html's was much the fuller — highlights grouped by verse with their
   colours, an Underlines tab the five never had, a note editor with a verse
   picker — so it is the one that survives and the five gain all of it. Its one
   defect is fixed on the way (see the read below), and its verse links go
   through swGoToVerseKey, so following one now leaves a return point. */
function swGoToVerseKey(verseKey) {
  var parts = String(verseKey || '').split('|');
  if (parts.length < 3) return;
  var books = _swBooks(), book = null;
  for (var i = 0; i < books.length; i++) {
    if (_swBookName(books[i]) === parts[0]) { book = books[i]; break; }
  }
  if (!book) return;
  var chId = _swBookIdPrefix(book) + parts[1] + (book.idSuffix || '');
  var href = (typeof swVerseDeepLink === 'function') ? swVerseDeepLink(chId, parts[2]) : '';
  if (typeof window.NavEngineFollow === 'function' && href) {
    window.NavEngineFollow('#' + href.split('#')[1]);
  } else {
    navTo(chId);
  }
  setTimeout(function() {
    var verse = document.querySelector('[data-verse-key="' + verseKey + '"]');
    if (verse) {
      verse.classList.add('highlighted');
      verse.scrollIntoView({ behavior: (window.swScrollBehavior || 'smooth'), block: 'center' });
    }
  }, 200);
}
function renderAnnotationsList() {
  /* bom.html calls it ann-list, the five annotations-list. */
  var list = document.getElementById('ann-list') || document.getElementById('annotations-list');
  if (!list) return;
  var html = '';

  if (_currentAnnTab === 'highlights' || _currentAnnTab === 'underlines') {
    var type = _currentAnnTab === 'highlights' ? 'hl' : 'ul';
    var entries = [];
    /* THROUGH _annOf, NOT THE RAW RECORD. setWordAnnotation writes a FLAT
       { hl, ul } — it has for as long as _annOf has been folding the older
       per-tier records down — and this read only ever looked for the per-tier
       shape. So on this page a highlight was stored, was painted in the text,
       and the panel still said "No highlights yet". _annOf returns whichever
       shape the record is in; the tier is recovered separately, and only for
       choosing the font. */
    Object.keys(_swAnnotations).forEach(function(wid) {
      var a = _annOf(wid);
      if (!a[type]) return;
      var raw = _swAnnotations[wid] || {}, tier = 'hw';
      ['hw', 'tl', 'gl'].forEach(function(t) { if (raw[t] && raw[t][type]) tier = t; });
      entries.push({ wid: wid, tier: tier, color: a[type] });
    });
    entries.sort(function(a, b) { return a.wid.localeCompare(b.wid); });
    if (entries.length === 0) {
      html = '<p class="ann-empty">No ' + _currentAnnTab + ' yet. Select text to add one.</p>';
    } else {
      // Group by verse
      var groups = {};
      entries.forEach(function(e) {
        var parts = e.wid.split('|');
        var vKey = parts.slice(0, 3).join('|');
        if (!groups[vKey]) groups[vKey] = [];
        groups[vKey].push(e);
      });
      Object.keys(groups).sort().forEach(function(vKey) {
        var parts = vKey.split('|');
        var label = parts[0] + ' ' + parts[1] + ':' + parts[2];
        html += '<div class="ann-entry">';
        html += '<div class="ann-entry-ref" onclick="closeAnnotationsPanel(); swGoToVerseKey(\'' + vKey.replace(/'/g, "\\'") + '\')">' + label + '</div>';
        html += '<div class="ann-entry-text">';
        groups[vKey].forEach(function(e) {
          html += '<span class="ann-entry-color" style="background:' + e.color + '"></span>';
          var wu = document.querySelector('.word-unit[data-wid="' + e.wid + '"]');
          var tierEl = wu ? wu.querySelector('.' + e.tier) : null;
          var wText = tierEl ? tierEl.textContent : e.wid.split('|')[3];
          var fontStyle = e.tier === 'hw' ? 'font-family:\'David Libre\',serif;direction:rtl' : 'font-family:\'David Libre\',serif';
          html += '<span style="' + fontStyle + '">' + wText + '</span> ';
        });
        html += '</div></div>';
      });
    }
  } else if (_currentAnnTab === 'notes') {
    var keys = Object.keys(_swNotes).sort();
    if (keys.length === 0) {
      html = '<p class="ann-empty">No notes yet. Use the notes tab to add verse notes.</p>';
    } else {
      keys.forEach(function(key) {
        var parts = key.split('|');
        var label = parts[0] + ' ' + parts[1] + ':' + parts[2];
        html += '<div class="ann-entry">';
        html += '<div class="ann-entry-ref" onclick="closeAnnotationsPanel(); swGoToVerseKey(\'' + key.replace(/'/g, "\\'") + '\')">' + label + '</div>';
        html += '<div class="ann-entry-text">' + (_swNotes[key] || '').substring(0, 120) + (_swNotes[key].length > 120 ? '...' : '') + '</div>';
        html += '</div>';
      });
    }
    // Add new note area
    html += '<div style="margin-top:16px;border-top:1px solid var(--rule);padding-top:12px;">';
    html += '<label style="font-size:0.85em;color:var(--ink-light);">Add note for current verse:</label>';
    html += '<select id="ann-note-verse" style="width:100%;padding:6px;margin:6px 0;border:1px solid var(--rule);border-radius:4px;background:var(--bg);color:var(--ink);font-family:\'David Libre\',serif;font-size:0.85em;">';
    // Populate with visible verses
    var visPanel = document.querySelector('.chapter-panel[style*="block"]');
    if (visPanel) {
      visPanel.querySelectorAll('.verse[data-verse-key]').forEach(function(v) {
        var vk = v.getAttribute('data-verse-key');
        var parts = vk.split('|');
        var label = parts[0] + ' ' + parts[1] + ':' + parts[2];
        var selected = _swNotes[vk] ? ' selected' : '';
        html += '<option value="' + vk + '"' + selected + '>' + label + '</option>';
      });
    }
    html += '</select>';
    html += '<textarea id="ann-note-text" class="ann-note-textarea" placeholder="Write your note..." oninput="saveAnnotationNote()"></textarea>';
    html += '</div>';
    html += '<button class="ann-export" onclick="copyAllNotes()">Copy All Notes</button>';
    html += '<button class="ann-export" onclick="exportAnnotations()">Export Annotations (JSON)</button>';
  }

  list.innerHTML = html;

  // Load selected note text
  if (_currentAnnTab === 'notes') {
    var sel = document.getElementById('ann-note-verse');
    var ta = document.getElementById('ann-note-text');
    if (sel && ta) {
      ta.value = _swNotes[sel.value] || '';
      sel.onchange = function() { ta.value = _swNotes[sel.value] || ''; };
    }
  }
}

/* ── Search ────────────────────────────────────────────────────────────────
   Each copy had something the other needed. bom.html preloaded the volume
   first, which the five did not and badly needed — they are lazy too, so a
   search from Genesis quietly searched Genesis. And it landed on the VERSE,
   where the five navigated to the top of the chapter and left the reader to
   find the line they had just searched for.

   The five escaped the result text and showed the side the query was asked in
   — Hebrew for a Hebrew query, the translation for an English one — and built
   the other-volumes list by filtering READER.selfPage out of the six, where
   bom.html hardcoded five and could not have listed itself. Both kept. */
function _swVolHref(page) {
  /* bom.html sits in bom/, so a sibling volume is one level up; from a volume
     page the Book of Mormon is one level down. The pages are named once, in
     the list below, and this is the only thing that differs. */
  var self = (window.READER && window.READER.selfPage) || '';
  var inBom = self.indexOf('bom') >= 0 || window.location.pathname.indexOf('/bom/') >= 0;
  if (inBom) return page.indexOf('bom/') === 0 ? page.replace('bom/', '') : '../' + page;
  return page;
}

function goToSearchResult(chapId, verseIdx) {
  closeSearch();
  navTo(chapId);
  setTimeout(function() {
    var panel = document.querySelector('.chapter-panel[style*="block"]');
    if (!panel) return;
    /* BY VERSE KEY, NOT BY POSITION. panel.querySelectorAll('.verse')[verseIdx]
       assumes the nth .verse in the DOM is verse n+1, and on the Book of Mormon
       it is not — a colophon carries the class too, so clicking "Alma 1:25"
       landed on Alma 1:24. The key is exact wherever the extra elements are;
       the positional lookup stays as a fallback for a panel with no keys. */
    var bc = getBookChapter(chapId);
    var v = null;
    if (bc) v = panel.querySelector('[data-verse-key="' + bc.book + '|' + bc.chapter + '|' + (verseIdx + 1) + '"]');
    if (!v) v = panel.querySelectorAll('.verse')[verseIdx];
    if (!v) return;
    v.scrollIntoView({ behavior: (window.swScrollBehavior || 'smooth'), block: 'center' });
    v.classList.add('highlighted');
    /* Stamp the verse into the URL the way THIS volume writes one — the BOM's
       #alma-32:5 against the others' #gen-ch1&v=5 — instead of appending ':'. */
    var link = (typeof swVerseDeepLink === 'function') ? swVerseDeepLink(chapId, verseIdx + 1) : '';
    if (link) { try { history.replaceState(null, '', link); } catch (e) {} }
    setTimeout(function() { v.classList.remove('highlighted'); }, 3000);
  }, 300);
}

function doSearch(query) {
  var results = document.getElementById('search-results');
  if (!query || query.trim().length === 0) { results.classList.remove('open'); results.innerHTML = ''; return; }
  /* THE VOLUME LOADS ONE BOOK AT A TIME, AND SEARCH NEEDS ALL OF IT. Only
     bom.html did this. On the other five, searching from Genesis searched the
     1,533 verses of Genesis and said nothing about the rest — no message, no
     partial-results warning, just a short list that looked complete. */
  if (window.SWSearch && window.SWSearch.needsPreload && window.SWSearch.needsPreload()) {
    results.innerHTML = '<div style="color:var(--ink-light);padding:12px;font-family:David Libre,serif;">Loading the rest of ' +
      ((window.READER && window.READER.readerName) || 'this volume') + '\u2026</div>';
    results.classList.add('open');
    window.SWSearch.preload(function () { doSearch(query); });
    return;
  }
  if (!searchIndex || !searchIndex.length) buildSearchIndex();
  var q = query.trim().toLowerCase(), qStripped = _stripNikkud(q);
  var matches = [];
  for (var i = 0; i < searchIndex.length && matches.length < 100; i++) {
    var si = searchIndex[i];
    var hebStripped = _stripNikkud(si.hebrew);
    // Hebrew without nikkud, and English from the gloss or the translation
    if (window.SWSearch ? window.SWSearch.matches(si, query.trim())
        : (hebStripped.indexOf(qStripped) >= 0 || si.english.toLowerCase().indexOf(q) >= 0 || si.hebrew.indexOf(q) >= 0)) matches.push(si);
  }
  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:12px;color:#888;font-family:David Libre,serif;">No results found</div>';
    results.classList.add('open'); return;
  }
  var html = '';
  matches.forEach(function(m) {
    // show the side the query was asked in: Hebrew for Hebrew, translation for English
    var displayText, _rtl = true;
    if (window.SWSearch) {
      displayText = window.SWSearch.snippet(m, query.trim(), 78);
      _rtl = window.SWSearch.hasHebrew(displayText);
    } else {
      displayText = m.hebrew.length > 60 ? m.hebrew.substring(0, 60) + '\u2026' : m.hebrew;
    }
    displayText = String(displayText).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    html += '<div class="search-result" onclick="goToSearchResult(\'' + m.chapId + '\',' + m.verseIdx + ')">';
    html += '<div class="search-result-ref">' + m.ref + '</div>';
    html += '<div class="search-result-text" dir="' + (_rtl ? 'rtl' : 'ltr') + '" style="text-align:' + (_rtl ? 'right' : 'left') + ';">' + displayText + '</div></div>';
  });
  html += '<div style="padding:12px 16px;border-top:2px solid var(--rule);direction:ltr;font-family:David Libre,serif;font-size:0.85em;color:var(--ink-light);">';
  html += '<div style="font-weight:600;margin-bottom:6px;">Search other volumes:</div>';
  [{name:'Old Testament',page:'ot.html'},{name:'New Testament',page:'nt.html'},{name:'Book of Mormon',page:'bom/bom.html'},{name:'D&C',page:'dc.html'},{name:'Pearl of Great Price',page:'pgp.html'},{name:'JST',page:'jst.html'}].filter(function(v) { return v.page !== window.READER.selfPage; }).forEach(function(v) {
    html += '<a href="' + _swVolHref(v.page) + '?q=' + encodeURIComponent(query.trim()) + '" style="display:inline-block;margin:3px 4px;color:var(--accent);text-decoration:none;padding:4px 10px;border:1px solid var(--accent);border-radius:3px;font-size:0.9em;">' + v.name + '</a>';
  });
  html += '</div>';
  results.innerHTML = html;
  results.classList.add('open');
}

/* ── The address bar ───────────────────────────────────────────────────────
   Both copies parsed a hash into a chapter, each with its own hand-written
   table of friendly book names — "alma" -> al-ch on bom.html, "genesis" -> gen
   on the five — and each understood only its own verse syntax. Neither table
   is needed now: READER.books carries the id scheme, and nav_engine already
   owns the BOM's friendly-hash mapping in BOM_HASHES (it has to, because
   buildHash writes those links).

   BOTH verse syntaxes are accepted here rather than one per page. #alma-32:5
   and #gen-ch1&v=5 are the two this app emits, a link is a thing people paste,
   and neither form is ambiguous — the colon form has no '&v=', the other has
   no trailing ':N'. */
function _swScrollToVerseNum(n) {
  if (!n || n < 1) return;
  setTimeout(function() {
    var panel = document.querySelector('.chapter-panel[style*="block"]');
    if (!panel) return;
    /* By key where the panel has them: a colophon carries .verse on the Book of
       Mormon, so the nth .verse is not verse n there. */
    var v = null, bc = getBookChapter((_config_currentChapterId()) || '');
    if (bc) v = panel.querySelector('[data-verse-key="' + bc.book + '|' + bc.chapter + '|' + n + '"]');
    if (!v) v = panel.querySelectorAll('.verse')[n - 1];
    if (!v) return;
    v.scrollIntoView({ behavior: (window.swScrollBehavior || 'smooth'), block: 'center' });
    v.classList.add('highlighted');
    setTimeout(function() { v.classList.remove('highlighted'); }, 3000);
  }, 350);
}
function _config_currentChapterId() {
  return window.currentChapterId || '';
}

function handleHash() {
  var raw = window.location.hash.replace('#', '');
  if (!raw) return;
  if (raw === 'home') { history.replaceState(null, '', window.location.pathname); return; }

  var hash = raw, verseNum = 0;
  var amp = raw.split('&');
  if (amp.length > 1) {
    hash = amp[0];
    for (var i = 1; i < amp.length; i++) {
      var kv = amp[i].split('=');
      if (kv[0] === 'v') verseNum = parseInt(kv[1] || '0', 10) || 0;
    }
  }
  var colon = hash.match(/^(.+):(\d+)$/);
  if (colon) { hash = colon[1]; verseNum = parseInt(colon[2], 10) || 0; }

  function go(id) {
    window.__swNavFromHash = true;
    try { navTo(id); } finally { window.__swNavFromHash = false; }
    _swScrollToVerseNum(verseNum);
  }

  var R = window.READER || {};
  /* Ids that are not chapters: the front matter, the topical guide. Declared in
     READER.frontTitles, which is also what names them in the chapter pill. */
  var front = R.frontTitles || {};
  if (front[hash]) { go(hash); return; }

  /* A volume with its own hash grammar (the D&C's #dc/109, #section-109). */
  if (R.parseHash) {
    var custom = R.parseHash(hash);
    if (custom) { go(custom); return; }
  }

  /* nav_engine translates the BOM's #alma-32 to al-ch32 and returns every
     other volume's hash unchanged. */
  var mapped = (typeof window.NavEngineParseHash === 'function')
    ? window.NavEngineParseHash(R.vol || '', hash) : hash;
  if (chapterOrder.indexOf(mapped) >= 0) { go(mapped); return; }
  if (chapterOrder.indexOf(hash) >= 0) { go(hash); return; }

  /* Friendly book name, with or without a chapter: #genesis/1, #gen-1,
     #alma-32, #psalms. Matched against READER.books instead of a table. */
  function bookByFriendly(name) {
    var want = String(name || '').toLowerCase().replace(/[\s_]+/g, '-').replace(/-/g, '');
    var books = _swBooks();
    for (var i = 0; i < books.length; i++) {
      var en = _swBookName(books[i]).toLowerCase().replace(/[\s_]+/g, '-').replace(/-/g, '');
      if (en === want) return books[i];
    }
    return null;
  }
  function idFor(book, ch) { return _swBookIdPrefix(book) + ch + (book.idSuffix || ''); }

  var m = hash.match(/^(.+?)[\/-](\d+)$/);
  if (m) {
    var b = bookByFriendly(m[1]);
    if (b) {
      var id = idFor(b, parseInt(m[2], 10));
      if (chapterOrder.indexOf(id) >= 0) { go(id); return; }
    }
  }
  var only = bookByFriendly(hash);
  if (only) {
    var id1 = idFor(only, 1);
    if (chapterOrder.indexOf(id1) >= 0) { go(id1); return; }
  }
}


/* ── Two more that were identical in both copies ───────────────────────────
   Proved at runtime, not on disk: _keepVersePosition hashed the same on
   ot.html and bom/bom.html, and openGlossaryAtRoot did NOT — the disk scan
   said 100% and was wrong. The one real difference was that bom.html
   null-guards #panel-overlay and reader_ui.js did not; the guarded copy is
   the one kept, since a page without that element threw. */

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
  var searchTerm = rootKey;
  if (/^H\d+$/.test(rootKey) && window._strongsRoots && _strongsRoots[rootKey]) {
    searchTerm = _strongsRoots[rootKey].w;
  }
  document.getElementById('glossary-search').value = searchTerm;
  renderGlossaryList();
  document.getElementById('glossary-panel').classList.add('open');
  var _po = document.getElementById('panel-overlay'); if (_po) _po.classList.add('open');   // click-off closes the glossary
  setTimeout(function() {
    var entries = document.querySelectorAll('#glossary-list .glossary-entry');
    for (var i = 0; i < entries.length; i++) {
      var rootEl = entries[i].querySelector('.glossary-root');
      if (rootEl && (rootEl.getAttribute('data-root-key') === rootKey || rootEl.textContent === rootKey)) {
        entries[i].classList.add('expanded');
        entries[i].scrollIntoView({ behavior: (window.swScrollBehavior || 'smooth'), block: 'start' });
        break;
      }
    }
  }, 100);
}


/* ── The reference list under a glossary entry ─────────────────────────────
   This was forked, and the two copies were not two spellings of one feature —
   they were two different features, and the five had the worse one.

   reader_ui.js listed at most 10 verses per book and stopped entirely after
   30, with nothing on screen to say a reference had been dropped: a root with
   400 occurrences showed 30 and looked complete. It also ordered the books
   ALPHABETICALLY, so the Tanakh read Amos, Chronicles, Daniel.

   bom.html showed every reference in canonical order behind a "Show all N"
   expander. That is the one kept — a silent cap is exactly the defect the
   Root Glossary's forms list was fixed for. The book order now comes from
   READER.books instead of a hardcoded list, so it is each volume's own
   canonical order; a book the volume does not name (a cross-volume key) is
   still listed, after the ones it does, alphabetically. */
function buildVerseRefsHtml(verseRefs) {
  var keys = Object.keys(verseRefs);
  if (keys.length === 0) return '';

  var byBook = {};
  keys.forEach(function (vk) {
    var parts = vk.split('|');
    if (parts.length !== 3) return;
    if (!byBook[parts[0]]) byBook[parts[0]] = [];
    byBook[parts[0]].push({ ch: parseInt(parts[1], 10), vs: parseInt(parts[2], 10), key: vk });
  });
  for (var b in byBook) {
    byBook[b].sort(function (a, c) { return a.ch !== c.ch ? a.ch - c.ch : a.vs - c.vs; });
  }

  /* Canonical first, in this volume's own order, then anything else. */
  var canonical = ((window.READER && window.READER.books) || []).map(function (bk) { return bk.en; });
  var order = canonical.filter(function (n) { return byBook[n]; });
  var extra = Object.keys(byBook).filter(function (n) { return canonical.indexOf(n) < 0; }).sort();
  order = order.concat(extra);

  var total = keys.length;
  var INITIAL_SHOW = 20;
  var html = '<div class="glossary-refs-section"><strong>All References (' + total + ' verses):</strong>';
  var shown = 0, hidden = '', overflowing = false;

  order.forEach(function (book) {
    var refs = byBook[book];
    var bookHtml = '<div class="glossary-refs-book"><span class="glossary-refs-book-name">' +
      book + ':</span> ' + refs.map(function (r) {
        return '<span class="glossary-ref-link" onclick="event.stopPropagation();goToGlossaryVerse(\'' +
          r.key.replace(/'/g, "\\'") + '\')">' + r.ch + ':' + r.vs + '</span>';
      }).join(', ') + '</div>';
    shown += refs.length;
    /* A book is never split across the fold — once past the initial count,
       every remaining book goes behind it. */
    if (!overflowing && shown <= INITIAL_SHOW) html += bookHtml;
    else { overflowing = true; hidden += bookHtml; }
  });

  if (hidden) {
    html += '<div class="glossary-refs-overflow" style="display:none;">' + hidden + '</div>';
    html += '<span class="glossary-refs-toggle" data-refs-total="' + total +
      '" onclick="event.stopPropagation();toggleRefsOverflow(this)">Show all ' +
      total + ' references ▼</span>';
  }
  return html + '</div>';
}

function toggleRefsOverflow(el) {
  var overflow = el.previousElementSibling;
  if (!overflow || !overflow.classList.contains('glossary-refs-overflow')) return;
  var showing = overflow.style.display !== 'none';
  overflow.style.display = showing ? 'none' : 'block';
  /* Collapsing used to drop the count and read "Show all references" — the
     number is the whole point of the label, so it is carried on the element. */
  var total = el.getAttribute('data-refs-total');
  el.textContent = showing
    ? 'Show all ' + (total || '') + ' references ▼'
    : 'Hide references ▲';
}


/* ── Where every verse file lands ──────────────────────────────────────────
   Each <vol>_verses/<book>.js calls this as it loads. reader_core.js and
   bom.html both had it; the BOM's is a strict superset, because only the Book
   of Mormon has book colophons and on the five the two extra lines are no-ops
   (a containerId with no '-colophon' in it makes the replace and the test
   both do nothing). One copy, the superset. */
function renderVerseSet(verseData, containerId) {
  var chId = containerId.replace('-verses', '').replace('-colophon', '');
  _verseRegistry.push({ chapId: chId, verses: verseData });
  /* A book colophon is displayed inside that book's chapter-1 panel (the way
     1 Nephi does it), so its DOM has to be built when chapter 1 is built —
     nobody ever navigates to a bare book id like '2n'. */
  var renderAt = /-colophon-verses$/.test(containerId) ? chId + '-ch1' : chId;
  /* Deferred: the DOM is built on the first navTo, which is what keeps a
     whole volume out of memory on a phone. */
  _pendingRenders.push({ verseData: verseData, containerId: containerId, chapId: renderAt });
}


/* ── Stripping the pointing ────────────────────────────────────────────────
   _stripHebrewMarks existed FOUR times, byte-identical: reader_core.js and
   inline in dc.html, pgp.html and bom/bom.html. One line, four homes.

   _stripNikkud is the one that genuinely differed, and the difference is real
   linguistics, not drift, so it is declared as data instead of being copied:

     the five  [\u0591-\u05C7]                              everything
     the BOM   [\u0591-\u05BD\u05BF-\u05C0\u05C3-\u05C7]  spares U+05BE maqqef,
                                                        U+05C1/2 shin & sin dots

   The BOM keeps the maqqef because a consonantal pattern written with one can
   never match a string the maqqef has been stripped from, and keeps the shin
   and sin dots because folding them merges שׂ with שׁ — two different letters,
   and two different roots (חפשׂ against חפשׁ). Changing the Tanakh's root
   extraction is a corpus decision, not a refactor, so the five keep what they
   have; READER.keepMaqqefAndSinDots says which a volume wants. */
function _stripHebrewMarks(s) { return (s || '').replace(/[\u0591-\u05C7]/g, ''); }

var _SW_NIKKUD_ALL  = /[\u0591-\u05C7]/g;
var _SW_NIKKUD_KEEP = /[\u0591-\u05BD\u05BF-\u05C0\u05C3-\u05C7]/g;
function _stripNikkud(s) {
  var keep = !!(window.READER && window.READER.keepMaqqefAndSinDots);
  return (s || '').replace(keep ? _SW_NIKKUD_KEEP : _SW_NIKKUD_ALL, '');
}


/* ── Building one chapter's verses ─────────────────────────────────────────
   _doRenderVerses was the last renderer that was two functions, and they were
   two halves rather than two versions: each carried features the other simply
   did not have, and every one of them is a no-op where its data is absent.

     from reader_core.js   the Psalm 119 acrostic stanza headers
                           the gold JST marks beside and below a verse
     from bom.html         book colophons (a headnote, so no verse number)
                           superscriptions (v.num "*"), which must not consume
                             an Arabic verse number — Mosiah is the only
                             chapter in the six volumes that has one
                           v.english, the inline English of front matter

   Both additions guard themselves. _appendAcrosticStanza returns unless the
   chapter is psa-ch119; _appendJstMark returns unless window._jstCrossrefs has
   that id, and bom.html does not even load jst_crossrefs.js. The colophon and
   superscription tests are false for every chapter in the five. So the merged
   function is each page's own behaviour, unchanged, from one copy.

   _PS119, _appendAcrosticStanza and _appendJstMark come along because they
   were in reader_core.js, which bom.html does not load. */

var _PS119 = [
  ['א','alef'], ['ב','bet'],   ['ג','gimel'], ['ד','dalet'], ['ה','he'],
  ['ו','vav'],  ['ז','zayin'], ['ח','chet'],  ['ט','tet'],   ['י','yod'],
  ['כ','kaf'],  ['ל','lamed'], ['מ','mem'],   ['נ','nun'],   ['ס','samekh'],
  ['ע','ayin'], ['פ','pe'],    ['צ','tsadi'], ['ק','kof'],   ['ר','resh'],
  ['ש','shin'], ['ת','tav']
];

function _appendAcrosticStanza(container, chId, verseNo) {
  if (chId !== 'psa-ch119') return;
  if ((verseNo - 1) % 8 !== 0) return;
  var pair = _PS119[(verseNo - 1) / 8];
  if (!pair) return;
  var d = document.createElement('div');
  d.className = 'acrostic-stanza';
  d.setAttribute('aria-label', 'Stanza ' + pair[1]);
  var he = document.createElement('span');
  he.className = 'acrostic-letter';
  he.textContent = pair[0];
  var en = document.createElement('span');
  en.className = 'acrostic-name';
  en.textContent = pair[1];
  d.appendChild(he); d.appendChild(en);
  container.appendChild(d);
}

function _appendJstMark(host, chapId, verseNum, wantAdded) {
  var X = window._jstCrossrefs;
  if (!X || !chapId) return;
  var e = X[chapId] && X[chapId][verseNum];
  if (!e) return;
  var isAdded = !!e[2];
  if (isAdded !== !!wantAdded) return;          // the other placement will take it
  var a = document.createElement('a');
  a.className = 'jst-mark' + (isAdded ? ' jst-mark--added' : '');
  a.href = 'jst.html#' + e[0] + '&v=' + e[1];
  a.textContent = isAdded ? 'JST +' : 'JST';
  a.title = isAdded
    ? 'The Joseph Smith Translation continues past this verse'
    : 'Joseph Smith Translation of this verse';
  /* Same one-way trip a study reference used to be: this leaves the volume, and
     inside the iOS app there is no browser Back. Mark the return point so the
     JST page offers "← Back to Genesis 9:4". */
  a.addEventListener('click', function () {
    try {
      if (typeof window.NavEngineMarkReturn === 'function') window.NavEngineMarkReturn(a.getAttribute('href'));
    } catch (e) {}
  });
  host.appendChild(a);
}

function _doRenderVerses(verseData, containerId) {
  var chId = containerId.replace('-verses', '').replace('-colophon', '');
  var container = document.getElementById(containerId);
  if (!container) return;
  var bkInfo = getBookChapter(chId);

  /* Superscriptions are not numbered verses, so the Arabic counter has to skip
     them or every verse after one reads a number too high. */
  var superCount = 0;
  for (var s = 0; s < verseData.length; s++) if (verseData[s].num === '∗') superCount++;
  /* A book colophon is a headnote, not a numbered verse — 1 Nephi's renders
     through renderWords and carries no number, so these must not either. */
  var isColophon = /-colophon-verses$/.test(containerId);

  verseData.forEach(function (v, idx) {
    var verseKey = bkInfo ? (bkInfo.book + '|' + bkInfo.chapter + '|' + (idx + 1)) : '';
    _appendAcrosticStanza(container, chId, idx + 1);

    var verseDiv = document.createElement('div');
    verseDiv.className = 'verse';
    if (verseKey) verseDiv.setAttribute('data-verse-key', verseKey);

    var numDiv = document.createElement('div');
    numDiv.className = 'verse-num';
    numDiv.textContent = v.num;
    var arabicNum = document.createElement('span');
    arabicNum.className = 'verse-num-arabic';
    if (v.num !== '∗' && !isColophon) arabicNum.textContent = idx + 1 - superCount;
    numDiv.appendChild(arabicNum);
    verseDiv.appendChild(numDiv);
    _appendJstMark(numDiv, chId, idx + 1, false);   // a revision OF this verse

    var flowDiv = document.createElement('div');
    flowDiv.className = 'word-flow';
    renderWords(v.words, flowDiv, verseKey);
    verseDiv.appendChild(flowDiv);

    // Hidden English for Dual mode, populated on first activation — except
    // front matter, which carries its English in the verse itself.
    var engDiv = document.createElement('div');
    engDiv.className = 'verse-english';
    if (verseKey) engDiv.setAttribute('data-key', verseKey);
    if (v.english) engDiv.textContent = v.english;
    verseDiv.appendChild(engDiv);

    _appendJstMark(verseDiv, chId, idx + 1, true);  // material added AFTER this verse
    container.appendChild(verseDiv);
  });
}
