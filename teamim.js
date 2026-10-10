/* teamim.js — the Old Testament's cantillation layer.
   (User, 2026-10-09: "put it as a layer in the website in the settings".)

   WHAT IT IS. A switch, off by default, that lays the Masoretic accents (the
   te'amim and meteg) over the Hebrew of the Tanakh. The verse data has none
   and gets none: ot_verses is untouchable. The accents come from
   ot_teamim/<book>.js (tools/build_ot_teamim.py, from the Westminster Leningrad
   Codex, matched to this text consonant by consonant), fetched a book at a
   time and only while the layer is on. They change what a word LOOKS like and
   nothing else: _hwHtml in reader_surface.js draws them (the one home of a
   word's display, which the stress mark draws through too), and every lookup
   reads data-h or _hwText, neither of which carries an accent.

   THE FACE. David Libre has no cantillation marks, so with the layer on the
   verse text is set in Taamey David CLM (Culmus; fonts/TaameyDavidCLM-LICENSE.txt),
   a David cut made for the te'amim — the user's choice of the three offered.
   teamim.css loads only when the layer is first switched on.

   WHERE THE SWITCH IS. Under Aa in the reader's header (site_chrome.js: the
   web has no settings page, and the footer is the five reading modes by
   design), on the phone shell's Settings page (app-shell/pwa_shell.js), and
   in the two apps' Settings. The state is one localStorage key, sw-teamim.

   AND THE BOOK OF MORMON (user, 2026-10-09: "based on the cantillation marks
   in the bible you can study them and know exactly how to do it to the BOM").
   bom/teamim/<book>.js carries the te'amim laid over the Book of Mormon by
   the Masoretes' own rules, counted out of the Tanakh (tools/teamim_grammar.py,
   tools/build_bom_teamim.py); where a verse quotes the Tanakh, its phrasing is
   the Tanakh's. Same encoding, same switch, same font; the canon is never
   touched. */
(function () {
  'use strict';
  var R = window.READER || {};
  if (R.vol !== 'ot' && R.vol !== 'bom') return;
  var KEY = 'sw-teamim', DATA_V = '1', CSS_V = '2';
  /* this file's own directory, so the stylesheet and the data resolve from
     bom/bom.html as they do from ot.html */
  var SELF = document.currentScript && document.currentScript.src;
  var BASE = SELF ? SELF.replace(/[^\/]*$/, '') : '';
  var DIR = BASE + (R.vol === 'bom' ? 'bom/teamim/' : 'ot_teamim/');
  /* book name (the first field of data-wid) -> the data file's name: the Old
     Testament's book prefix, the Book of Mormon's verse-file slug, which its
     loader derives from a chapter id so there is no second table of names.
     LOOKED UP WHEN ASKED, NEVER AT LOAD: bom.html fills READER.books further
     down the page than this script, so a table built here was empty, and a
     reload with the layer on drew no accents until the switch was flipped
     (the switch goes through the chapter id and never saw it). */
  var byName = {};
  function fileFor(name) {
    if (byName[name]) return byName[name];
    var books = R.books || [], f = null;
    for (var i = 0; i < books.length; i++) {
      if (books[i].en !== name) continue;
      if (R.vol === 'bom') f = window.bomBookSlugForChapId ? bomBookSlugForChapId(books[i].idPrefix + '1') : null;
      else f = books[i].prefix;
      break;
    }
    if (f) byName[name] = f;
    return f;
  }
  var state = { loaded: {}, loading: {} };
  var observer = null;

  /* The word `h` (data-h) with its accents laid over it, as plain text, and
     `after`: markup that follows the word (a paseq). _hwShown in
     reader_surface.js is the only caller. */
  function accents(h, wid) {
    var plain = { text: h, after: '' };
    var cut = wid.lastIndexOf('|');
    var row = (window.SW_TEAMIM || {})[wid.slice(0, cut)];
    if (!row) return plain;
    var code = row.split('|')[+wid.slice(cut + 1)];
    if (!code) return plain;
    var acc = {}, k = -1, paseq = false, i, c;
    for (i = 0; i < code.length; i++) {
      c = code.charCodeAt(i);
      if (c === 0x05C0) paseq = true;
      else if (c < 0x0590) { k = c - 0x30; acc[k] = ''; }
      else if (k >= 0) acc[k] += code.charAt(i);
    }
    var out = '', n = -1, j, ch;
    for (j = 0; j < h.length; j++) {
      ch = h.charAt(j);
      out += ch;
      if (ch >= 'א' && ch <= 'ת') {
        n++;
        /* the letter's own points first, then the accents the Masoretes put on it */
        while (j + 1 < h.length && /[֑-ׇֽֿׁׂׅׄ]/.test(h.charAt(j + 1))) out += h.charAt(++j);
        if (acc[n]) out += acc[n];
      }
    }
    if (out.normalize) out = out.normalize('NFC');
    /* a paseq stands between words; drawn by CSS so no lookup ever reads it */
    return { text: out, after: paseq ? '<span class="tm-paseq" aria-hidden="true"></span>' : '' };
  }

  var T = window.SWTeamim = { on: false, accents: accents, toggle: function () { set(!T.on); }, set: set };

  function sync() {
    var b = document.getElementById('sw-teamim-switch');
    if (b) b.setAttribute('aria-pressed', T.on ? 'true' : 'false');
    document.documentElement.classList.toggle('sw-teamim', T.on);
  }

  function redraw() {
    var go = function () {
      if (typeof _redrawHebrewWords === 'function') _redrawHebrewWords(document);   // and the stress marks after it
      if (window.fitGlossLines) window.fitGlossLines(document);   // Taamey David sets wider than David Libre
    };
    if (typeof _keepVersePosition === 'function') _keepVersePosition(go); else go();
  }

  function css() {
    if (document.getElementById('sw-teamim-css')) return;
    var l = document.createElement('link');
    l.id = 'sw-teamim-css'; l.rel = 'stylesheet'; l.href = BASE + 'teamim.css?v=' + CSS_V;
    document.head.appendChild(l);
  }

  function load(prefix) {
    if (!prefix || state.loaded[prefix] || state.loading[prefix]) return;
    state.loading[prefix] = true;
    var s = document.createElement('script');
    s.src = DIR + prefix + '.js?v=' + DATA_V;
    s.async = true;
    s.onload = function () { state.loaded[prefix] = true; state.loading[prefix] = false; if (T.on) redraw(); };
    s.onerror = function () { state.loading[prefix] = false; };
    document.head.appendChild(s);
  }

  /* the books on the page: every rendered verse word, plus the chapter open */
  function loadVisible(root) {
    var seen = {};
    (root || document).querySelectorAll('.word-unit[data-wid]').forEach(function (u) {
      var w = u.getAttribute('data-wid'), name = w.slice(0, w.indexOf('|'));
      if (!seen[name]) { seen[name] = 1; load(fileFor(name)); }
    });
    var cur = window.currentChapterId || '';
    if (cur) {
      if (R.vol === 'bom') { if (window.bomBookSlugForChapId) load(bomBookSlugForChapId(cur)); }
      else load(cur.replace(/-ch\d+$/, ''));
    }
  }

  /* a book that arrives later (a page turn, a jump, the next chapter rendered
     ahead) fetches its accents the moment its first word is drawn */
  function watch(onNow) {
    if (!onNow) { if (observer) observer.disconnect(); observer = null; return; }
    if (observer || !window.MutationObserver) return;
    var main = document.getElementById('main-content') || document.body;
    observer = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var el = added[j];
          if (el.nodeType !== 1) continue;
          var u = el.matches && el.matches('.word-unit[data-wid]') ? el : (el.querySelector && el.querySelector('.word-unit[data-wid]'));
          if (!u) continue;
          var w = u.getAttribute('data-wid'), p = fileFor(w.slice(0, w.indexOf('|')));
          if (p && !state.loaded[p]) load(p);
        }
      }
    });
    observer.observe(main, { childList: true, subtree: true });
  }

  function set(v) {
    T.on = !!v;
    try { if (T.on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) {}
    if (T.on) css();
    sync();
    watch(T.on);
    if (T.on) loadVisible(document);
    redraw();
  }

  /* boot: the layer comes back on if it was on */
  var was = false;
  try { was = localStorage.getItem(KEY) === '1'; } catch (e) {}
  T.on = was;
  if (was) { css(); document.documentElement.classList.add('sw-teamim'); }
  function ready() {
    sync();
    if (T.on) { watch(true); loadVisible(document); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
