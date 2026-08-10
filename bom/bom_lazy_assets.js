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
        loadScript('official_verses.js?v=9', resolve);
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

  function scheduleStrongsIdle() {
    if (global._strongsLookup) return;
    var run = function() { global.ensureStrongsData(function() {}); };
    if ('requestIdleCallback' in global) global.requestIdleCallback(run, { timeout: 8000 });
    else setTimeout(run, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleStrongsIdle);
  } else {
    scheduleStrongsIdle();
  }

  document.addEventListener('click', function once(e) {
    if (!e.target.closest('.word-unit, .hw')) return;
    document.removeEventListener('click', once, true);
    global.ensureStrongsData(function() {});
  }, true);
})(window);
