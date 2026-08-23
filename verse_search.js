/* Shared verse-text search for every volume.
 *
 * Hebrew matches with or without nikkud — אלהים finds אֱלֹהִים — because both
 * sides are reduced to bare consonants with final forms folded in. English
 * matches the interlinear gloss AND the translation column, so a word that
 * only appears in the translation ("judgment") is still found.
 *
 * The reader's own search box, the nav drawer and the home page all go
 * through this, so the three behave identically.
 */
(function (global) {
  'use strict';

  // U+0591–U+05C7 covers niqqud, the te'amim, maqqef and sof pasuq
  var POINTS = /[֑-ׇ]/g;
  var PUNCT  = /[׳״‎‏"'`‘’־׀׃-]/g;
  var FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ',
                 'ף': 'פ', 'ץ': 'צ' };

  function normHeb(s) {
    if (!s) return '';
    s = String(s).replace(POINTS, '').replace(PUNCT, '');
    var out = '', i;
    for (i = 0; i < s.length; i++) out += (FINALS[s.charAt(i)] || s.charAt(i));
    return out;
  }

  function normEng(s) {
    return String(s || '').toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[^a-z0-9' ]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function hasHebrew(s) { return /[֐-׿]/.test(String(s || '')); }

  /** "Genesis 1:1" -> "Genesis|1|1", the key _englishMap uses. */
  function engKeyOf(ref) {
    var m = String(ref || '').match(/^(.*\S)\s+(\d+):(\d+)$/);
    return m ? (m[1] + '|' + m[2] + '|' + m[3]) : '';
  }

  var _engTried = false;
  /** The translation column normally loads only when dual view opens; search
   *  needs it too, so pull it in once on first use. */
  function ensureEnglish() {
    if (_engTried) return;
    _engTried = true;
    try {
      var map = global._englishMap;
      if ((!map || !Object.keys(map).length) && typeof global.loadEnglishText === 'function') {
        global.loadEnglishText();
      }
    } catch (e) {}
  }

  function enrich(si) {
    ensureEnglish();
    if (si._nh !== undefined) return si;
    si._nh = normHeb(si.hebrew);
    var trans = '';
    try {
      var k = engKeyOf(si.ref);
      if (k && global._englishMap) trans = global._englishMap[k] || '';
    } catch (e) {}
    si._tr = trans;
    si._ne = normEng((si.english || '') + ' ' + trans);
    return si;
  }

  function matches(si, q) {
    if (!q) return false;
    enrich(si);
    if (hasHebrew(q)) {
      var qh = normHeb(q);
      return qh.length > 0 && si._nh.indexOf(qh) >= 0;
    }
    var qe = normEng(q);
    return qe.length > 0 && si._ne.indexOf(qe) >= 0;
  }

  /** A short piece of the verse around the hit, for the results list. */
  function snippet(si, q, max) {
    enrich(si);
    max = max || 90;
    if (hasHebrew(q)) {
      return si.hebrew.length > max ? si.hebrew.slice(0, max) + '…' : si.hebrew;
    }
    var text = si._tr || si.english || '';
    var at = normEng(text).indexOf(normEng(q));
    if (at < 0) return text.slice(0, max) + (text.length > max ? '…' : '');
    var start = Math.max(0, at - 30);
    return (start ? '…' : '') + text.slice(start, start + max) +
           (start + max < text.length ? '…' : '');
  }

  function ready() {
    try {
      if (typeof global.buildSearchIndex === 'function') global.buildSearchIndex();
    } catch (e) {}
    ensureEnglish();
    return global.searchIndex || null;
  }

  function find(q, limit) {
    var idx = ready();
    if (!idx || !q) return [];
    limit = limit || 40;
    var out = [], i;
    for (i = 0; i < idx.length && out.length < limit; i++) {
      if (matches(idx[i], q)) out.push(idx[i]);
    }
    return out;
  }

  function count(q) {
    var idx = ready();
    if (!idx || !q) return 0;
    var n = 0, i;
    for (i = 0; i < idx.length; i++) if (matches(idx[i], q)) n++;
    return n;
  }

  /** Go to a hit and flash the verse so the eye lands on it. */
  function goTo(hit) {
    if (!hit) return;
    try { if (typeof global.navTo === 'function') global.navTo(hit.chapId); } catch (e) {}
    var key = engKeyOf(hit.ref);
    setTimeout(function () {
      var el = key && document.querySelector('[data-verse-key="' + key + '"]');
      if (!el) {
        var panel = document.getElementById(hit.chapId + '-verses');
        var kids = panel ? panel.querySelectorAll('.verse') : [];
        el = kids[hit.verseIdx] || null;
      }
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlighted');
      setTimeout(function () { el.classList.remove('highlighted'); }, 2600);
    }, 350);
  }

  /* Some volumes load their verse data a book at a time. Search needs all of
     it, so a page can expose a loader and we pull the rest in on first search. */
  var _preloaded = false, _preloading = false;
  function preload(done) {
    if (_preloaded) { if (done) done(false); return; }
    var loader = global.loadAllBomBooks || global.__swLoadAllVerses;
    if (typeof loader !== 'function') { _preloaded = true; if (done) done(false); return; }
    if (_preloading) return;
    _preloading = true;
    loader(function () {
      _preloaded = true; _preloading = false;
      try { global.searchIndex = null; } catch (e) {}   // rebuild over everything
      if (done) done(true);
    });
  }
  function needsPreload() {
    return !_preloaded && typeof (global.loadAllBomBooks || global.__swLoadAllVerses) === 'function';
  }

  global.SWSearch = {
    preload: preload, needsPreload: needsPreload,
    normHeb: normHeb, normEng: normEng, hasHebrew: hasHebrew,
    enrich: enrich, matches: matches, snippet: snippet,
    find: find, count: count, goTo: goTo, engKeyOf: engKeyOf
  };
})(window);
