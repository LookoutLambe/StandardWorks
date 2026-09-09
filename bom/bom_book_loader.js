/**
 * Lazy-load BOM per-book verse scripts (one book at a time instead of ~5MB+ all at once).
 * Runtime source: bom/verses/*.js (NOT Hebrew BOM/verses — that folder is a mirror only).
 */
(function(global) {
  'use strict';

  var _loaded = Object.create(null);
  var _pending = Object.create(null);
  var _colophonsLoaded = false;

  var BOOK_RULES = [
    { match: function(id) { return id === 'intro' || id.indexOf('front-') === 0; }, src: 'verses/frontmatter.js' },
    { match: function(id) { return /^ch\d+$/.test(id); }, src: 'verses/1nephi.js?v=25' },
    { match: function(id) { return id.indexOf('2n-') === 0; }, src: 'verses/2nephi.js?v=24' },
    { match: function(id) { return id.indexOf('jc-') === 0; }, src: 'verses/jacob.js?v=9' },
    { match: function(id) { return id.indexOf('en-') === 0; }, src: 'verses/enos.js' },
    { match: function(id) { return id.indexOf('jr-') === 0; }, src: 'verses/jarom.js' },
    { match: function(id) { return id.indexOf('om-') === 0; }, src: 'verses/omni.js' },
    { match: function(id) { return id.indexOf('wm-') === 0; }, src: 'verses/words_of_mormon.js' },
    { match: function(id) { return id.indexOf('mo-') === 0; }, src: 'verses/mosiah.js?v=7' },
    { match: function(id) { return id.indexOf('al-') === 0; }, src: 'verses/alma.js?v=4' },
    { match: function(id) { return id.indexOf('he-') === 0; }, src: 'verses/helaman.js?v=3' },
    { match: function(id) { return id.indexOf('3n-') === 0; }, src: 'verses/3nephi.js?v=5' },
    { match: function(id) { return id.indexOf('4n-') === 0; }, src: 'verses/4nephi.js?v=1' },
    { match: function(id) { return id.indexOf('mm-') === 0; }, src: 'verses/mormon.js?v=1' },
    { match: function(id) { return id.indexOf('et-') === 0; }, src: 'verses/ether.js?v=1' },
    { match: function(id) { return id.indexOf('mr-') === 0; }, src: 'verses/moroni.js' }
  ];

  function bookScriptFor(chapId) {
    if (!chapId || chapId === 'landing' || chapId === 'topical-guide') return null;
    for (var i = 0; i < BOOK_RULES.length; i++) {
      if (BOOK_RULES[i].match(chapId)) return BOOK_RULES[i].src;
    }
    return null;
  }

  function needsColophonBundle(chapId) {
    return chapId && chapId !== 'landing' && chapId !== 'intro' &&
      chapId.indexOf('front-') !== 0 && chapId !== 'topical-guide';
  }

  function loadScript(src, cb) {
    if (_loaded[src]) {
      if (cb) cb();
      return;
    }
    if (!_pending[src]) _pending[src] = [];
    _pending[src].push(cb || function() {});
    if (_pending[src].length > 1) return;

    var el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = function() {
      _loaded[src] = true;
      var cbs = _pending[src] || [];
      delete _pending[src];
      for (var i = 0; i < cbs.length; i++) {
        try { cbs[i](); } catch (e) { console.warn('[bom_book_loader]', src, e); }
      }
    };
    el.onerror = function() {
      console.warn('[bom_book_loader] failed to load', src);
      _loaded[src] = true;
      var cbs = _pending[src] || [];
      delete _pending[src];
      for (var j = 0; j < cbs.length; j++) cbs[j]();
    };
    document.head.appendChild(el);
  }

  function loadChain(sources, cb) {
    var i = 0;
    function next() {
      if (i >= sources.length) {
        if (cb) cb();
        return;
      }
      loadScript(sources[i++], next);
    }
    next();
  }

  function isColophonOnly(chapId) {
    return chapId && /-colophon$/.test(chapId);
  }

  global.ensureBomBookForChapId = function(chapId, cb) {
    if (isColophonOnly(chapId)) {
      loadChain(['verses/book_colophons.js?v=2'], cb);
      return;
    }
    var bookSrc = bookScriptFor(chapId);
    if (!bookSrc) {
      if (cb) cb();
      return;
    }
    var chain = [];
    if (needsColophonBundle(chapId) && !_colophonsLoaded) {
      _colophonsLoaded = true;
      chain.push('verses/book_colophons.js?v=2');
    }
    chain.push(bookSrc);
    loadChain(chain, cb);
  };

  global.bomBookScriptForChapId = bookScriptFor;

  /* The two cross-reference maps, split per book by the same generator that
     splits the other five volumes (tools/build_crossref_chunks.js). They used
     to be whole deferred files on the page — 785 KB and 632 KB — so they did
     not block the parser, but 1.4 MB was still fetched on every visit, and
     DOMContentLoaded still waited for it, to mark up one chapter. The slug is taken from this file's own BOOK_RULES so there is
     no second table saying which book a chapter belongs to.

     Deliberately NOT part of ensureBomBookForChapId: a marker is decoration
     over a chapter that is already readable, so this is called at idle after
     the render and never delays a page turn. */
  function bomBookSlug(chapId) {
    var src = bookScriptFor(chapId);
    var m = src && src.match(/verses\/([^.?]+)\.js/);
    return m ? m[1] : null;
  }
  global.bomBookSlugForChapId = bomBookSlug;
  global.ensureBomCrossrefsForChapId = function (chapId, cb) {
    var slug = bomBookSlug(chapId);
    if (!slug) { if (cb) cb(); return; }
    loadChain(['crossrefs/' + slug + '.js', 'inverse_crossrefs/' + slug + '.js'], cb || function () {});
  };

  /* The official English for one book. official_verses.js was 1,852 KB of it
     in one file, and it sat on the critical path because addCrossRefMarkers()
     pre-fetched the whole corpus for its position-based fallback — so a reader
     in Hebrew-only view downloaded every English verse in the book to place a
     marker. The Dual column wants the same chunk, so both go through here. */
  global.ensureBomEnglishForChapId = function (chapId, cb) {
    var slug = bomBookSlug(chapId);
    if (!slug) { if (cb) cb(); return; }
    loadChain(['english/' + slug + '.js'], cb || function () {});
  };

  /* Search has to see the whole volume, not just the book being read, so this
     pulls in every book script once. ~5MB, fetched only when a search runs. */
  var _allLoaded = false;
  global.loadAllBomBooks = function (cb) {
    if (_allLoaded) { if (cb) cb(); return; }
    _allLoaded = true;
    var srcs = ['verses/book_colophons.js?v=2'];
    for (var i = 0; i < BOOK_RULES.length; i++) {
      if (srcs.indexOf(BOOK_RULES[i].src) < 0) srcs.push(BOOK_RULES[i].src);
    }
    loadChain(srcs, function () { if (cb) cb(); });
  };

  /* EVERY FILE THIS VOLUME IS MADE OF, for the offline save — derived from
     BOOK_RULES, so there is no second list to fall out of step with the first.
     The five shared readers get this from their generated manifest and their
     own comment says the set is "never typed out here"; the Book of Mormon had
     no equivalent, so nav_engine.js carried a hand-typed list instead. It had
     gone stale in both directions: it still asked for official_verses.js and
     crossrefs.js, both split per book long ago and fetched by nothing, and it
     had never gained the per-book chunks that replaced them — so saving the
     volume downloaded 2.6 MB of dead weight and still left the Dual English
     and both cross-reference maps missing when the reader went offline.

     frontmatter and book_colophons are verse files with no English or
     cross-reference chunk of their own, which is why the three chunk
     directories hold fifteen files and verses/ holds seventeen. */
  global.bomOfflineAssets = function () {
    var out = ['bom/verses/book_colophons.js'], seen = {};
    for (var i = 0; i < BOOK_RULES.length; i++) {
      var m = BOOK_RULES[i].src.match(/verses\/([^.?]+)\.js/);
      if (!m || seen[m[1]]) continue;
      var slug = seen[m[1]] = m[1];
      out.push('bom/verses/' + slug + '.js');
      if (slug === 'frontmatter') continue;
      out.push('bom/english/' + slug + '.js');
      out.push('bom/crossrefs/' + slug + '.js');
      out.push('bom/inverse_crossrefs/' + slug + '.js');
    }
    return out;
  };
})(window);
