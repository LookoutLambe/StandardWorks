/**
 * Defer heavy BOM assets until needed (English corpus, KJV xref map, Strong's).
 */
(function(global) {
  'use strict';

  function loadScript(src, cb) {
    var el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = function() { if (cb) cb(); };
    el.onerror = function() { console.warn('[bom_lazy_assets] failed', src); if (cb) cb(); };
    document.head.appendChild(el);
  }

  var officialPromise = null;
  global.ensureOfficialVerses = function(cb) {
    if (global.defined_verses || global._officialVersesData) {
      if (cb) cb();
      return;
    }
    if (!officialPromise) {
      officialPromise = new Promise(function(resolve) {
        loadScript('official_verses.js?v=10', resolve);
      });
    }
    officialPromise.then(function() { if (cb) cb(); });
  };

  var scripturePromise = null;
  global.ensureScriptureVerses = function(cb) {
    if (global._scriptureVerses) {
      if (cb) cb();
      return;
    }
    if (!scripturePromise) {
      scripturePromise = new Promise(function(resolve) {
        loadScript('scripture_verses.js', resolve);
      });
    }
    scripturePromise.then(function() { if (cb) cb(); });
  };

  var strongsPromise = null;
  global.ensureStrongsData = function(cb) {
    if (global._strongsLookup && global._strongsRoots) {
      if (cb) cb();
      return;
    }
    if (!strongsPromise) {
      strongsPromise = new Promise(function(resolve) {
        var n = 0;
        function done() {
          if (++n >= 2) resolve();
        }
        loadScript('../strongs_lookup.js', done);
        loadScript('../strongs_roots.js', done);
      });
    }
    strongsPromise.then(function() { if (cb) cb(); });
  };

  /* NO WARMUP OF ITS OWN. This scheduled ensureStrongsData() on DOMContentLoaded
     behind a bare requestIdleCallback — no interaction gate, no Data Saver or
     2g check — and so pulled strongs_lookup.js + strongs_roots.js (3,073 KB)
     on every visit to this page whether or not a word was ever tapped. It is
     the pattern root_scorecard.js already replaced, kept alive here in a second
     copy; and because bom.html loads BOTH, the ungated one simply won and the
     gated one never got to decide anything.

     root_scorecard.js owns the warmup policy for all six volumes now, and its
     ensure() already routes through window.ensureStrongsData on this page, so
     deleting the schedule here loses nothing: the data still arrives on the
     same signal as everywhere else, and still immediately on the tap below. */

  document.addEventListener('click', function once(e) {
    if (!e.target.closest('.word-unit, .hw')) return;
    document.removeEventListener('click', once, true);
    global.ensureStrongsData(function() {});
  }, true);
})(window);
