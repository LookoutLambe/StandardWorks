/**
 * verse_loader.js — one verse-loading and interlinear layer for every volume.
 *
 * bom.html and crossrefs_engine.js each grew their own copy of this, and they
 * diverged: bom's book map listed 71 books and omitted the Book of Mormon's own,
 * while the engine's getExternalVerseHtml was a stub returning ''. Fixes landed
 * in one and not the other, which is how a root's verses rendered on five pages
 * and silently vanished on the sixth.
 *
 * The map below is the engine's — 87 books, a strict superset, Book of Mormon
 * and D&C included. Capture is scoped to this file's own loads: renderVerseSet
 * is shimmed only while a file it requested is executing, so a host page's own
 * rendering pipeline is never intercepted.
 *
 *   SWVerses.get(book, chapter, verse, cb)  -> cb(words|null)
 *   SWVerses.interlinearHtml(words)         -> Hebrew-over-gloss markup
 */
(function() {
  'use strict';

  var BOOKS = {
    'JST 1 Chronicles':        {dir:'jst_verses', file:'jst1ch', chPfx:'jst1ch'},
    'JST 1 Corinthians':       {dir:'jst_verses', file:'jst1co', chPfx:'jst1co'},
    'JST 1 John':              {dir:'jst_verses', file:'jst1jn', chPfx:'jst1jn'},
    'JST 1 Peter':             {dir:'jst_verses', file:'jst1pe', chPfx:'jst1pe'},
    'JST 1 Samuel':            {dir:'jst_verses', file:'jst1sa', chPfx:'jst1sa'},
    'JST 1 Thessalonians':     {dir:'jst_verses', file:'jst1th', chPfx:'jst1th'},
    'JST 1 Timothy':           {dir:'jst_verses', file:'jst1ti', chPfx:'jst1ti'},
    'JST 2 Chronicles':        {dir:'jst_verses', file:'jst2ch', chPfx:'jst2ch'},
    'JST 2 Corinthians':       {dir:'jst_verses', file:'jst2co', chPfx:'jst2co'},
    'JST 2 Peter':             {dir:'jst_verses', file:'jst2pe', chPfx:'jst2pe'},
    'JST 2 Samuel':            {dir:'jst_verses', file:'jst2sa', chPfx:'jst2sa'},
    'JST 2 Thessalonians':     {dir:'jst_verses', file:'jst2th', chPfx:'jst2th'},
    'JST Acts':                {dir:'jst_verses', file:'jstacts', chPfx:'jstacts'},
    'JST Amos':                {dir:'jst_verses', file:'jstamo', chPfx:'jstamo'},
    'JST Colossians':          {dir:'jst_verses', file:'jstcol', chPfx:'jstcol'},
    'JST Deuteronomy':         {dir:'jst_verses', file:'jstdeu', chPfx:'jstdeu'},
    'JST Ephesians':           {dir:'jst_verses', file:'jsteph', chPfx:'jsteph'},
    'JST Exodus':              {dir:'jst_verses', file:'jstexo', chPfx:'jstexo'},
    'JST Galatians':           {dir:'jst_verses', file:'jstgal', chPfx:'jstgal'},
    'JST Genesis':             {dir:'jst_verses', file:'jstgen', chPfx:'jstgen'},
    'JST Hebrews':             {dir:'jst_verses', file:'jstheb', chPfx:'jstheb'},
    'JST Isaiah':              {dir:'jst_verses', file:'jstisa', chPfx:'jstisa'},
    'JST James':               {dir:'jst_verses', file:'jstjas', chPfx:'jstjas'},
    'JST Jeremiah':            {dir:'jst_verses', file:'jstjer', chPfx:'jstjer'},
    'JST John':                {dir:'jst_verses', file:'jstjohn', chPfx:'jstjohn'},
    'JST Luke':                {dir:'jst_verses', file:'jstluke', chPfx:'jstluke'},
    'JST Mark':                {dir:'jst_verses', file:'jstmark', chPfx:'jstmark'},
    'JST Matthew':             {dir:'jst_verses', file:'jstmatt', chPfx:'jstmatt'},
    'JST Psalms':              {dir:'jst_verses', file:'jstpsa', chPfx:'jstpsa'},
    'JST Revelation':          {dir:'jst_verses', file:'jstrev', chPfx:'jstrev'},
    'JST Romans':              {dir:'jst_verses', file:'jstrom', chPfx:'jstrom'},
    '1 Chronicles':        {dir:'ot_verses', file:'1ch', chPfx:'1ch'},
    '1 Corinthians':       {dir:'nt_verses', file:'1co', chPfx:'1co'},
    '1 John':              {dir:'nt_verses', file:'1jn', chPfx:'1jn'},
    '1 Kings':             {dir:'ot_verses', file:'1ki', chPfx:'1ki'},
    '1 Nephi':             {dir:'bom/verses', file:'1nephi', chPfx:''},
    '1 Peter':             {dir:'nt_verses', file:'1pe', chPfx:'1pe'},
    '1 Samuel':            {dir:'ot_verses', file:'1sa', chPfx:'1sa'},
    '1 Thessalonians':     {dir:'nt_verses', file:'1th', chPfx:'1th'},
    '1 Timothy':           {dir:'nt_verses', file:'1ti', chPfx:'1ti'},
    '2 Chronicles':        {dir:'ot_verses', file:'2ch', chPfx:'2ch'},
    '2 Corinthians':       {dir:'nt_verses', file:'2co', chPfx:'2co'},
    '2 John':              {dir:'nt_verses', file:'2jn', chPfx:'2jn'},
    '2 Kings':             {dir:'ot_verses', file:'2ki', chPfx:'2ki'},
    '2 Nephi':             {dir:'bom/verses', file:'2nephi', chPfx:'2n'},
    '2 Peter':             {dir:'nt_verses', file:'2pe', chPfx:'2pe'},
    '2 Samuel':            {dir:'ot_verses', file:'2sa', chPfx:'2sa'},
    '2 Thessalonians':     {dir:'nt_verses', file:'2th', chPfx:'2th'},
    '2 Timothy':           {dir:'nt_verses', file:'2ti', chPfx:'2ti'},
    '3 John':              {dir:'nt_verses', file:'3jn', chPfx:'3jn'},
    '3 Nephi':             {dir:'bom/verses', file:'3nephi', chPfx:'3n'},
    '4 Nephi':             {dir:'bom/verses', file:'4nephi', chPfx:'4n'},
    'A-of-F':              {dir:'pgp_verses', file:'articles_of_faith', chPfx:'aof'},
    'Abraham':             {dir:'pgp_verses', file:'abraham', chPfx:'ab'},
    'Acts':                {dir:'nt_verses', file:'acts', chPfx:'acts'},
    'Alma':                {dir:'bom/verses', file:'alma', chPfx:'al'},
    'Amos':                {dir:'ot_verses', file:'amo', chPfx:'amo'},
    'Colossians':          {dir:'nt_verses', file:'col', chPfx:'col'},
    'D&C':                 {dir:'dc_verses', chPfx:'dc', isDC:true},
    'Daniel':              {dir:'ot_verses', file:'dan', chPfx:'dan'},
    'Deuteronomy':         {dir:'ot_verses', file:'deu', chPfx:'deu'},
    'Ecclesiastes':        {dir:'ot_verses', file:'ecc', chPfx:'ecc'},
    'Enos':                {dir:'bom/verses', file:'enos', chPfx:'en'},
    'Ephesians':           {dir:'nt_verses', file:'eph', chPfx:'eph'},
    'Esther':              {dir:'ot_verses', file:'est', chPfx:'est'},
    'Ether':               {dir:'bom/verses', file:'ether', chPfx:'et'},
    'Exodus':              {dir:'ot_verses', file:'exo', chPfx:'exo'},
    'Ezekiel':             {dir:'ot_verses', file:'eze', chPfx:'eze'},
    'Ezra':                {dir:'ot_verses', file:'ezr', chPfx:'ezr'},
    'Galatians':           {dir:'nt_verses', file:'gal', chPfx:'gal'},
    'Genesis':             {dir:'ot_verses', file:'gen', chPfx:'gen'},
    'Habakkuk':            {dir:'ot_verses', file:'hab', chPfx:'hab'},
    'Haggai':              {dir:'ot_verses', file:'hag', chPfx:'hag'},
    'Hebrews':             {dir:'nt_verses', file:'heb', chPfx:'heb'},
    'Helaman':             {dir:'bom/verses', file:'helaman', chPfx:'he'},
    'Hosea':               {dir:'ot_verses', file:'hos', chPfx:'hos'},
    'Isaiah':              {dir:'ot_verses', file:'isa', chPfx:'isa'},
    'JS-H':                {dir:'pgp_verses', file:'js_history', chPfx:'jsh'},
    'JS-M':                {dir:'pgp_verses', file:'js_matthew', chPfx:'jsm'},
    'Jacob':               {dir:'bom/verses', file:'jacob', chPfx:'jc'},
    'James':               {dir:'nt_verses', file:'jas', chPfx:'jas'},
    'Jarom':               {dir:'bom/verses', file:'jarom', chPfx:'jr'},
    'Jeremiah':            {dir:'ot_verses', file:'jer', chPfx:'jer'},
    'Job':                 {dir:'ot_verses', file:'job', chPfx:'job'},
    'Joel':                {dir:'ot_verses', file:'joe', chPfx:'joe'},
    'John':                {dir:'nt_verses', file:'john', chPfx:'john'},
    'Jonah':               {dir:'ot_verses', file:'jon', chPfx:'jon'},
    'Joshua':              {dir:'ot_verses', file:'jos', chPfx:'jos'},
    'Jude':                {dir:'nt_verses', file:'jude', chPfx:'jude'},
    'Judges':              {dir:'ot_verses', file:'jdg', chPfx:'jdg'},
    'Lamentations':        {dir:'ot_verses', file:'lam', chPfx:'lam'},
    'Leviticus':           {dir:'ot_verses', file:'lev', chPfx:'lev'},
    'Luke':                {dir:'nt_verses', file:'luke', chPfx:'luke'},
    'Malachi':             {dir:'ot_verses', file:'mal', chPfx:'mal'},
    'Mark':                {dir:'nt_verses', file:'mark', chPfx:'mark'},
    'Matthew':             {dir:'nt_verses', file:'matt', chPfx:'matt'},
    'Micah':               {dir:'ot_verses', file:'mic', chPfx:'mic'},
    'Mormon':              {dir:'bom/verses', file:'mormon', chPfx:'mm'},
    'Moroni':              {dir:'bom/verses', file:'moroni', chPfx:'mr'},
    'Moses':               {dir:'pgp_verses', file:'moses', chPfx:'ms'},
    'Mosiah':              {dir:'bom/verses', file:'mosiah', chPfx:'mo'},
    'Nahum':               {dir:'ot_verses', file:'nah', chPfx:'nah'},
    'Nehemiah':            {dir:'ot_verses', file:'neh', chPfx:'neh'},
    'Numbers':             {dir:'ot_verses', file:'num', chPfx:'num'},
    'Obadiah':             {dir:'ot_verses', file:'oba', chPfx:'oba'},
    'Omni':                {dir:'bom/verses', file:'omni', chPfx:'om'},
    'Philemon':            {dir:'nt_verses', file:'phm', chPfx:'phm'},
    'Philippians':         {dir:'nt_verses', file:'php', chPfx:'php'},
    'Proverbs':            {dir:'ot_verses', file:'pro', chPfx:'pro'},
    'Psalms':              {dir:'ot_verses', file:'psa', chPfx:'psa'},
    'Revelation':          {dir:'nt_verses', file:'rev', chPfx:'rev'},
    'Romans':              {dir:'nt_verses', file:'rom', chPfx:'rom'},
    'Ruth':                {dir:'ot_verses', file:'rth', chPfx:'rth'},
    'Song of Solomon':     {dir:'ot_verses', file:'sos', chPfx:'sos'},
    'Titus':               {dir:'nt_verses', file:'tit', chPfx:'tit'},
    'Words of Mormon':     {dir:'bom/verses', file:'words_of_mormon', chPfx:'wm'},
    'Zechariah':           {dir:'ot_verses', file:'zec', chPfx:'zec'},
    'Zephaniah':           {dir:'ot_verses', file:'zep', chPfx:'zep'}
  };

  window._extVerseRegistry = window._extVerseRegistry || {};
  var registry = window._extVerseRegistry;
  var loaded = {};            // url -> true | 'pending'
  var waiting = {};           // url -> [cb]
  var prefixToBook = {};
  for (var bn in BOOKS) {
    var pfx = BOOKS[bn].chPfx;
    if (pfx && !prefixToBook[pfx]) prefixToBook[pfx] = bn;
  }

  function basePath() {
    var p = window.location.pathname.replace(/[^/]*$/, '');
    return p.replace(/\/bom\/$/, '/');
  }
  function dcFile(chapter) {
    var n = parseInt(chapter, 10);
    if (!n || n < 1) return null;
    var lo = Math.floor((n - 1) / 10) * 10 + 1;
    return 'dc' + lo + '-' + (lo + 9);
  }
  function urlFor(book, chapter) {
    var info = BOOKS[book];
    if (!info) return null;
    if (info.isDC) {
      var fn = dcFile(chapter);
      return fn ? basePath() + info.dir + '/' + fn + '.js' : null;
    }
    return basePath() + info.dir + '/' + info.file + '.js';
  }

  // Capture is active only while a file this module requested is executing.
  var capturing = 0;
  var hostRVS = null, hostRW = null;
  // The book whose file is currently being fetched. Container ids are ambiguous:
  // 1 Nephi has an empty chapter prefix, so "ch3-verses" would otherwise be
  // credited to it no matter which book's file produced it.
  var loadingBook = null;
  function beginCapture() {
    if (capturing++ > 0) return;
    hostRVS = window.renderVerseSet;
    hostRW = window.renderWords;
    window.renderVerseSet = function(verses, containerId) {
      var book = null, chapter = null;
      var dc = String(containerId || '').match(/^dc(\d+)-ch1-verses$/);
      if (dc) { book = 'D&C'; chapter = parseInt(dc[1], 10); }
      else {
        var m = String(containerId || '').match(/^(.*)-?ch(\d+)-verses$/);
        if (m) {
          chapter = parseInt(m[2], 10);
          var p = (m[1] || '').replace(/-$/, '');
          book = (p && prefixToBook[p]) || loadingBook || null;
        }
      }
      if (book && chapter) {
        for (var i = 0; i < verses.length; i++) {
          registry[book + '|' + chapter + '|' + (i + 1)] = verses[i].words;
        }
      }
    };
    window.renderWords = function() {};
  }
  function endCapture() {
    if (--capturing > 0) return;
    window.renderVerseSet = hostRVS;
    window.renderWords = hostRW;
  }

  function loadUrl(url, book, cb) {
    if (!url) { cb(false); return; }
    if (loaded[url] === true) { cb(true); return; }
    if (loaded[url] === false) { cb(false); return; }
    (waiting[url] = waiting[url] || []).push(cb);
    if (loaded[url] === 'pending') return;
    loaded[url] = 'pending';
    loadingBook = book || null;
    beginCapture();
    var el = document.createElement('script');
    el.src = url;
    el.async = true;
    function done(ok) {
      endCapture();
      loadingBook = null;
      if (el.parentNode) el.parentNode.removeChild(el);
      loaded[url] = ok;
      var cbs = waiting[url] || [];
      delete waiting[url];
      for (var i = 0; i < cbs.length; i++) cbs[i](ok);
    }
    el.onload = function() { done(true); };
    el.onerror = function() { done(false); };
    document.head.appendChild(el);
  }

  function words(book, chapter, verse) {
    return registry[book + '|' + chapter + '|' + verse] || null;
  }
  function get(book, chapter, verse, cb) {
    var have = words(book, chapter, verse);
    if (have) { cb(have); return; }
    var url = urlFor(book, chapter);
    if (!url) { cb(null); return; }
    loadUrl(url, book, function() { cb(words(book, chapter, verse)); });
  }
  function interlinearHtml(ws) {
    if (!ws || !ws.length) return '';
    var esc = function(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    var html = '<div class="xref-ref-content">', first = true;
    for (var i = 0; i < ws.length; i++) {
      var hw = ws[i][0], gl = ws[i][1];
      if (!hw) continue;
      hw = String(hw).replace(/\u05C3/g, '');
      if (!hw || hw === '\u05BE') continue;
      if (!first) html += '<span class="xref-ref-arr">\u2039</span>';
      first = false;
      html += '<span class="xref-ref-word"><span class="hw">' + esc(hw) + '</span>';
      if (gl) html += '<span class="en">' + esc(String(gl).replace(/-/g, ' ')) + '</span>';
      html += '</span>';
    }
    return html + '</div>';
  }

  window.SWVerses = {
    books: BOOKS,
    url: urlFor,
    has: function(book, chapter) { return !!urlFor(book, chapter); },
    load: function(book, chapter, cb) { loadUrl(urlFor(book, chapter), book, cb || function() {}); },
    words: words,
    get: get,
    interlinearHtml: interlinearHtml
  };
})();
