/* THE WEB SHELL — the app, on a phone's browser and on the installed PWA.
 *
 * The iPhone and Android apps are a native shell around the site with the
 * scripts in this folder injected. This file gives a PHONE the same shell in
 * web form, whether the site is open in Safari or Chrome or installed to the
 * home screen: the same injected scripts (shell_start.js, shell_end.js,
 * shell_mark.js), then the six-icon row, the Library, Search, Notes and
 * Settings panels, the player and the launch logo, built here in HTML on the
 * site's own hooks — NavEngine.VOLUMES, NotesEngine, SWReadAloud, stepSize,
 * swApplyTheme — so the page is never reimplemented, only framed.
 *
 * COMPUTERS ARE UNTOUCHED. The gate is the pointer: a phone or tablet has a
 * coarse pointer and no hover, a Mac or PC has a mouse. On a mouse this file
 * returns before doing anything, so the website is exactly what it was.
 * Inside the native apps it also returns: they inject the shell themselves.
 *
 * Testing on a computer: ?shell=1 forces the shell on (remembered until
 * ?shell=0). Every page loads this file first thing in <head>.
 */
(function () {
  'use strict';

  /* ── 1. THE GATE ─────────────────────────────────────────────────────── */
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.swShell) return;  // the iPhone app
  if (window.AndroidShell) return;                                                                        // the Android app
  var phone, force = /(^|[?&])shell=([01])(&|$)/.exec(location.search || '');
  try {
    if (force) { phone = force[2] === '1'; localStorage.setItem('sw-shell-force', force[2]); }
    else { var f = localStorage.getItem('sw-shell-force'); if (f === '1' || f === '0') phone = f === '1'; }
  } catch (e) {}
  if (phone === undefined) {
    try { phone = window.matchMedia('(pointer: coarse) and (hover: none)').matches; } catch (e) { phone = false; }
  }
  if (!phone) return;

  var me = document.currentScript;
  var BASE = (me && me.src) ? me.src.replace(/app-shell\/pwa_shell\.js.*$/, '') : '';
  var html = document.documentElement;
  html.classList.add('sw-web-shell', 'sw-app-booting');
  var bootedAt = Date.now();

  /* The message ports the shared scripts post to (the apps provide them natively). */
  var shell = {};
  window.webkit = { messageHandlers: {
    swShell:  { postMessage: function (m) { try { shell.receive(m || {}); } catch (e) {} } },
    swSpeech: { postMessage: function () {} }
  } };
  /* The mark in the bar: the app's own art, by URL rather than data URI. */
  window.__SW_MARK_SRC = BASE + 'app-shell/appmark.png';

  /* ── 2. DOCUMENT START: the shared stylesheet and boot redirect, and this shell's styles. ── */
  document.write('<script src="' + BASE + 'app-shell/shell_start.js"><\/script>');
  document.write('<link rel="stylesheet" href="' + BASE + 'app-shell/pwa_shell.css?v=1">');

  /* ── 3. DOCUMENT END: the shared bar scripts, then the shell's own surface. ── */
  function loadScript(src, done) {
    var s = document.createElement('script'); s.src = src; s.async = false;
    s.onload = done || null; s.onerror = done || null;
    document.head.appendChild(s);
  }
  function onEnd() {
    loadScript(BASE + 'app-shell/shell_end.js');
    loadScript(BASE + 'app-shell/shell_mark.js');
    build();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onEnd); else onEnd();

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pageFile() { return (location.pathname.split('/').pop() || 'index.html'); }
  function volumes() {
    var V = (window.NavEngine && window.NavEngine.VOLUMES) || {};
    return Object.keys(V).map(function (k) { return V[k]; }).filter(function (v) { return v && v.page && v.divisions && v.divisions.length; });
  }
  function currentVolume() {
    var tag = document.querySelector('script[data-sw-volume]');
    var key = tag ? tag.getAttribute('data-sw-volume') : '';
    var V = (window.NavEngine && window.NavEngine.VOLUMES) || {};
    return (key && V[key]) || null;
  }
  function whereLabel() {
    var e = document.getElementById('sw-chrome-chapter');
    return e ? (e.textContent || '').replace(/▾/g, '').trim() : '';
  }
  function hashFor(vol, chapterId) {
    try { if (window.NavEngine && window.NavEngine.buildHash) return window.NavEngine.buildHash(vol.key, chapterId); } catch (e) {}
    return chapterId;
  }
  /* A root-relative site path, the way the site and its last-read record spell one. */
  function open(path) {
    var file = path.split('#')[0], frag = path.split('#').slice(1).join('#');
    closePanel();
    if (file.split('/').pop() === pageFile() && frag) { location.hash = '#' + frag; return; }
    location.href = BASE + path;
  }

  /* ── ICONS: one small set, stroked, so the six read as one family. ───── */
  var ICON = {
    library: '<path d="M4 3.5h4v17H4zM10 3.5h4v17h-4zM15.6 4.6l3.9-1 3.4 15.5-3.9 1z"/>',
    read:    '<path d="M12 6.5C10 5 7 4.6 3 5.2v13.3c4-.6 7 0 9 1.5 2-1.5 5-2.1 9-1.5V5.2c-4-.6-7-.2-9 1.3z"/><path d="M12 6.5v13.5"/>',
    search:  '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3 21 21"/>',
    notes:   '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
    settings:'<path fill="currentColor" stroke="none" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94L5.24 5.33c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
    listen:  '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/>',
    close:   '<path d="M6 6l12 12M18 6 6 18"/>',
    back:    '<path d="M15 5l-7 7 7 7"/>',
    replay:  '<path d="M12 5a7 7 0 1 1-6.3 4"/><path d="M5 3v5h5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">10</text>',
    pause:   '<path d="M8 5v14M16 5v14" stroke-width="2.6"/>',
    play:    '<path fill="currentColor" stroke="none" d="M7 4.5v15l12-7.5z"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    check:   '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    book:    '<path d="M4 4.5h6a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H4zM20 4.5h-6a2 2 0 0 0-2 2V20a1.5 1.5 0 0 1 1.5-1.5H20z"/>',
    bookmark:'<path d="M6 3.5h12v17l-6-4-6 4z"/>',
    marker:  '<path d="M4 20h16M6.5 16l8-8 3.5 3.5-8 8H6.5z"/>'
  };
  function svg(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 24) + '" height="' + (size || 24) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
  }

  /* ── THE ROW, THE PANEL, THE PLAYER ──────────────────────────────────── */
  var row, panel, player, current = null, listenTimer = null, listening = false;
  var ITEMS = [
    { id: 'library', name: 'Library' }, { id: 'read', name: 'Read' }, { id: 'search', name: 'Search' },
    { id: 'notes', name: 'Notes' }, { id: 'settings', name: 'Settings' }, { id: 'listen', name: 'Listen' }
  ];

  function build() {
    if (document.getElementById('sw-app-row')) return;
    row = el('nav', null); row.id = 'sw-app-row'; row.setAttribute('aria-label', 'App');
    ITEMS.forEach(function (it) {
      var b = el('button'); b.type = 'button'; b.setAttribute('aria-label', it.name); b.dataset.id = it.id;
      b.innerHTML = svg(it.id, 26);
      b.addEventListener('click', function () { tap(it.id); });
      row.appendChild(b);
    });
    panel = el('div'); panel.id = 'sw-app-panel'; panel.setAttribute('role', 'dialog');
    player = el('div'); player.id = 'sw-app-player';
    document.body.appendChild(row); document.body.appendChild(panel); document.body.appendChild(player);
    markRow();
    watchScroll();
    refreshListen();
    /* the logo before anything: until the page has loaded, at least 0.9 s, never past 4.5 s */
    var done = false;
    function unboot() { if (done) return; done = true; html.classList.remove('sw-app-booting'); }
    function ready() { var left = 900 - (Date.now() - bootedAt); setTimeout(unboot, left > 0 ? left : 0); }
    if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
    setTimeout(unboot, 4500 - (Date.now() - bootedAt));
  }

  function markRow() {
    if (!row) return;
    var sel = current || (currentVolume() ? 'read' : null);
    Array.prototype.forEach.call(row.children, function (b) {
      if (b.dataset.id === sel) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  function tap(id) {
    if (id === 'listen') { toggleListen(); return; }
    if (id === 'read') {
      closePanel();
      /* Off the reader (the landing, a study page): Read opens the book where it was left. */
      if (!currentVolume()) {
        var last = null; try { last = window.NavEngine && window.NavEngine.getLastRead && window.NavEngine.getLastRead(); } catch (e) {}
        open(last && last.path ? last.path : 'bom/bom.html');
      }
      return;
    }
    if (current === id) { closePanel(); return; }
    openPanel(id);
  }

  function closePanel() { current = null; panel.classList.remove('open'); panel.innerHTML = ''; markRow(); }
  function openPanel(id) {
    current = id; panel.innerHTML = ''; panel.classList.add('open'); markRow();
    if (id === 'library') renderLibrary([]);
    else if (id === 'search') renderSearch();
    else if (id === 'notes') renderNotes();
    else if (id === 'settings') renderSettings();
  }

  /* A native page on the reader's paper: the navy bar with its title (and a back arrow), the panel colour under the content. */
  function page(title, onBack) {
    panel.innerHTML = '';
    var bar = el('div', 'sw-app-bar');
    if (onBack) {
      var back = el('button', 'sw-app-back'); back.type = 'button'; back.setAttribute('aria-label', 'Back'); back.innerHTML = svg('back');
      back.addEventListener('click', onBack); bar.appendChild(back);
    }
    bar.appendChild(el('div', 'sw-app-title', title));
    var scroll = el('div', 'sw-app-scroll');
    panel.appendChild(bar); panel.appendChild(scroll);
    return { bar: bar, scroll: scroll };
  }
  function card(parent) { var c = el('div', 'sw-app-card'); parent.appendChild(c); return c; }
  function header(parent, text) { parent.appendChild(el('div', 'sw-app-h', text)); }
  function rowIn(c, html, onClick) {
    var r = el(onClick ? 'button' : 'div', 'sw-app-r'); if (onClick) { r.type = 'button'; r.addEventListener('click', onClick); }
    r.innerHTML = html; c.appendChild(r); return r;
  }

  /* ── LIBRARY: volumes → books → chapters, from the site's own registry. ── */
  function renderLibrary(path) {
    var vols = volumes();
    if (path.length === 0) {
      var p = page('Library');
      var here = whereLabel(), last = null;
      try { last = window.NavEngine && window.NavEngine.getLastRead && window.NavEngine.getLastRead(); } catch (e) {}
      if (here) {
        var cc = card(p.scroll);
        rowIn(cc, '<span class="sw-app-ic sw-app-here">' + svg('book', 28) + '</span><span class="sw-app-grow"><span class="sw-app-sub">Continue reading</span><span class="sw-app-t sw-app-med">' + esc(here) + '</span></span><span class="sw-app-chev">' + svg('chevron', 20) + '</span>', function () { closePanel(); });
        p.scroll.appendChild(el('div', 'sw-app-gap'));
      } else if (last && last.path) {
        var lc = card(p.scroll);
        rowIn(lc, '<span class="sw-app-ic sw-app-here">' + svg('book', 28) + '</span><span class="sw-app-grow"><span class="sw-app-sub">Continue reading</span><span class="sw-app-t sw-app-med">' + esc(last.label || last.chapter || 'Where you left off') + '</span></span><span class="sw-app-chev">' + svg('chevron', 20) + '</span>', function () { open(last.path); });
        p.scroll.appendChild(el('div', 'sw-app-gap'));
      }
      header(p.scroll, 'Volumes');
      var c = card(p.scroll);
      vols.forEach(function (v) {
        rowIn(c, '<span class="sw-app-tile">' + esc(v.short) + '</span><span class="sw-app-grow"><span class="sw-app-t sw-app-med">' + esc(v.name) + '</span><span class="sw-app-sub sw-app-heb">' + esc(v.heb) + '</span></span><span class="sw-app-chev">' + svg('chevron', 20) + '</span>', function () { renderLibrary([v.key]); });
      });
      if (!vols.length) p.scroll.appendChild(el('div', 'sw-app-hint', 'Opening the book…'));
      return;
    }
    var vol = vols.filter(function (v) { return v.key === path[0]; })[0];
    if (!vol) return renderLibrary([]);
    if (path.length === 1) {
      var pb = page(vol.name, function () { renderLibrary([]); });
      vol.divisions.forEach(function (d, di) {
        if (di > 0) pb.scroll.appendChild(el('div', 'sw-app-gap'));
        header(pb.scroll, d.name);
        var cb = card(pb.scroll);
        d.books.forEach(function (b) {
          var single = b.isFront || b.ch === 1;
          rowIn(cb, '<span class="sw-app-t sw-app-grow">' + esc(b.en) + '</span>' + (b.ch > 1 ? '<span class="sw-app-n">' + b.ch + '</span>' : '') + '<span class="sw-app-heb sw-app-sub2">' + esc(b.heb) + '</span>' + (single ? '' : '<span class="sw-app-chev">' + svg('chevron', 20) + '</span>'),
            function () { if (single) open(vol.page + '#' + hashFor(vol, b.isFront ? b.prefix : b.prefix + '1')); else renderLibrary([vol.key, b.id]); });
        });
      });
      return;
    }
    var book = null;
    vol.divisions.forEach(function (d) { d.books.forEach(function (b) { if (b.id === path[1]) book = b; }); });
    if (!book) return renderLibrary([vol.key]);
    var pc = page(book.en, function () { renderLibrary([vol.key]); });
    var grid = el('div', 'sw-app-grid');
    for (var n = 1; n <= Math.max(book.ch, 1); n++) (function (n) {
      var b = el('button', 'sw-app-ch', String(n)); b.type = 'button'; b.setAttribute('aria-label', 'Chapter ' + n);
      b.addEventListener('click', function () { open(vol.page + '#' + hashFor(vol, book.prefix + n)); });
      grid.appendChild(b);
    })(n);
    pc.scroll.appendChild(grid);
  }

  /* ── SEARCH: all six volumes, from the site's precomputed index, as the home page searches it. ── */
  var idxState = 0, query = '', scope = '';
  function loadIndex(done) {
    if (window.SW_SEARCH_INDEX) { done(); return; }
    if (idxState === 1) return;
    idxState = 1;
    var s = document.createElement('script'); s.src = BASE + 'search_index.js?v=si2';
    s.onload = function () { idxState = 2; done(); }; s.onerror = function () { idxState = 3; done(); };
    document.head.appendChild(s);
  }
  var POINTS = /[֑-ׇ]/g, FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ' };
  function normHeb(s) { s = String(s || '').replace(/[׃\[\]]/g, '').replace(POINTS, '').replace(/־/g, ' '); var o = ''; for (var i = 0; i < s.length; i++) o += (FINALS[s.charAt(i)] || s.charAt(i)); return o.replace(/\s+/g, ' ').trim(); }
  function hasHeb(s) { return /[֐-׿]/.test(String(s || '')); }
  var lcCache = {};
  function bookOrder() {
    var order = {}, n = 0;
    volumes().forEach(function (v) { v.divisions.forEach(function (d) { d.books.forEach(function (b) { if (order[b.en] === undefined) order[b.en] = n++; }); }); });
    if (order['D&C'] === undefined) order['D&C'] = n;
    return order;
  }
  function place(ref) { var m = /^(.*\S)\s+(\d+):(\d+)$/.exec(ref || ''); return m ? [m[1], +m[2], +m[3]] : [ref, 0, 0]; }
  function findHits(q) {
    var idx = window.SW_SEARCH_INDEX; if (!idx) return [];
    var isHeb = hasHeb(q), nq = isHeb ? normHeb(q) : q.toLowerCase(); if (!nq) return [];
    var order = bookOrder(), out = [];
    idx.vols.forEach(function (vk) {
      if (scope && scope !== vk) return;
      var rows = idx.rows[vk] || [], lc = lcCache[vk] || (lcCache[vk] = []), found = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], hay;
        if (isHeb) hay = r[2]; else { hay = lc[i]; if (hay === undefined) hay = lc[i] = (r[3] || '').toLowerCase(); }
        var pos = hay.indexOf(nq); if (pos < 0) continue;
        var pl = place(r[1]);
        found.push({ o: order[pl[0]] === undefined ? 1e9 : order[pl[0]], c: pl[1], v: pl[2], r: r, pos: pos, text: isHeb ? r[2] : (r[3] || ''), isHeb: isHeb, vk: vk });
      }
      found.sort(function (a, b) { return a.o - b.o || a.c - b.c || a.v - b.v; });
      out.push({ vk: vk, name: idx.names[vk], page: idx.pages[vk], hits: found.slice(0, 200), more: found.length > 200 });
    });
    return out.filter(function (g) { return g.hits.length; });
  }
  function snip(t, pos, len) { var lo = Math.max(0, pos - 40), hi = Math.min(t.length, pos + len + 90); return (lo > 0 ? '…' : '') + t.slice(lo, hi) + (hi < t.length ? '…' : ''); }
  function renderSearch() {
    var p = page('Search');
    var box = el('div', 'sw-app-searchbox');
    box.innerHTML = '<span class="sw-app-sic">' + svg('search', 20) + '</span><input type="search" placeholder="Hebrew or English" autocomplete="off" autocorrect="off" enterkeyhint="search"><button type="button" class="sw-app-clear" aria-label="Clear">' + svg('close', 18) + '</button>';
    var input = box.querySelector('input'); input.value = query;
    var scopes = el('div', 'sw-app-scopes');
    function chip(label, key) { var b = el('button', 'sw-app-chip' + (scope === key ? ' on' : ''), label); b.type = 'button'; b.addEventListener('click', function () { scope = key; render(); Array.prototype.forEach.call(scopes.children, function (x) { x.classList.toggle('on', x === b); }); }); scopes.appendChild(b); }
    chip('All', ''); volumes().forEach(function (v) { chip(v.short, v.key); });
    p.bar.appendChild(box); p.bar.appendChild(scopes); p.bar.classList.add('sw-app-bar-tall');
    var results = p.scroll;
    var timer = null;
    function render() {
      results.innerHTML = '';
      var q = query.trim();
      if (q.length < 2) { results.appendChild(el('div', 'sw-app-hint', 'Hebrew, with or without vowels, or English — every volume at once.')); return; }
      if (!window.SW_SEARCH_INDEX) {
        results.appendChild(el('div', 'sw-app-hint', idxState === 3 ? 'Text search could not load — reload the page and try again.' : 'Preparing the index…'));
        loadIndex(function () { if (current === 'search') render(); });
        return;
      }
      var groups = findHits(q);
      if (!groups.length) { results.appendChild(el('div', 'sw-app-hint', 'No verses match “' + q + '”.')); return; }
      groups.forEach(function (g, gi) {
        if (gi > 0) results.appendChild(el('div', 'sw-app-gap'));
        header(results, g.name + ' · ' + g.hits.length + (g.more ? '+' : ''));
        var c = card(results);
        g.hits.forEach(function (h) {
          var s = snip(h.text, h.pos, (h.isHeb ? normHeb(q) : q.toLowerCase()).length);
          rowIn(c, '<span class="sw-app-grow"><span class="sw-app-ref">' + esc(h.r[1]) + '</span>' + (h.isHeb ? '<span class="sw-app-heb sw-app-t" dir="rtl" style="display:block;text-align:right">' + esc(s) + '</span>' : '<span class="sw-app-sub sw-app-clamp">' + esc(s) + '</span>') + '</span>',
            function () { open(g.page + '#' + h.r[0]); });
        });
      });
    }
    input.addEventListener('input', function () { query = input.value; clearTimeout(timer); timer = setTimeout(render, 250); });
    box.querySelector('.sw-app-clear').addEventListener('click', function () { query = ''; input.value = ''; render(); input.focus(); });
    render();
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
  }

  /* ── NOTES: bookmarks, highlights and notes from the page's own stores. ── */
  function refOf(key) { var p = String(key).split('|'); return p.length >= 3 ? p[0] + ' ' + p[1] + ':' + p[2] : key; }
  function dateOf(ms) { try { return ms > 0 ? new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''; } catch (e) { return ''; } }
  function openVerse(key) {
    var p = String(key).split('|'); if (p.length < 2) return;
    var href = null;
    try { href = window.NavEngineRefHref && window.NavEngineRefHref(p[0], p[1], p[2] || 0); } catch (e) {}
    if (href) { closePanel(); if (/^https?:|^\//.test(href)) location.href = href; else location.href = BASE + href.replace(/^\.\//, ''); }
  }
  function renderNotes() {
    var p = page('Notes');
    p.scroll.appendChild(el('div', 'sw-app-hint', 'Reading your marks…'));
    var out = { notes: [], highlights: {}, bookmarks: [] };
    try { out.highlights = JSON.parse(localStorage.getItem('sw-highlights-v1') || '{}') || {}; } catch (e) {}
    try { out.bookmarks = JSON.parse(localStorage.getItem('sw-bookmarks-v1') || '[]') || []; } catch (e) {}
    function show() {
      if (current !== 'notes') return;
      p.scroll.innerHTML = '';
      var notes = (out.notes || []).filter(function (n) { return n && n.verseKey; }).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      var hl = Object.keys(out.highlights || {}).filter(function (k) { var i = out.highlights[k]; return !(i && i.on === false); }).map(function (k) { return { key: k, ts: (out.highlights[k] && out.highlights[k].ts) || 0 }; }).sort(function (a, b) { return b.ts - a.ts; });
      var bm = (out.bookmarks || []).filter(function (b) { return b && b.path && b.label; });
      if (!notes.length && !hl.length && !bm.length) {
        var e = el('div', 'sw-app-empty');
        e.innerHTML = '<span class="sw-app-ic">' + svg('notes', 48) + '</span><div class="sw-app-t sw-app-bold">Nothing marked yet</div><div class="sw-app-sub">Tap a verse in the reader to highlight it or add a note; bookmark a chapter from the study panel.</div>';
        p.scroll.appendChild(e); return;
      }
      if (bm.length) {
        header(p.scroll, 'Bookmarks'); var cb = card(p.scroll);
        bm.forEach(function (b) { rowIn(cb, '<span class="sw-app-ic sw-app-here">' + svg('bookmark', 22) + '</span><span class="sw-app-t sw-app-med sw-app-grow">' + esc(b.label) + '</span><span class="sw-app-heb sw-app-sub2">' + esc(b.heb || '') + '</span>', function () { open(b.path); }); });
        p.scroll.appendChild(el('div', 'sw-app-gap'));
      }
      if (hl.length) {
        header(p.scroll, 'Highlights'); var ch = card(p.scroll);
        hl.forEach(function (h) { rowIn(ch, '<span class="sw-app-ic sw-app-here">' + svg('marker', 22) + '</span><span class="sw-app-t sw-app-grow">' + esc(refOf(h.key)) + '</span><span class="sw-app-n">' + esc(dateOf(h.ts)) + '</span>', function () { openVerse(h.key); }); });
        p.scroll.appendChild(el('div', 'sw-app-gap'));
      }
      if (notes.length) {
        header(p.scroll, 'Notes'); var cn = card(p.scroll);
        notes.forEach(function (n) { rowIn(cn, '<span class="sw-app-grow"><span class="sw-app-ref">' + esc(refOf(n.verseKey)) + '<span class="sw-app-n sw-app-right">' + esc(dateOf(n.updatedAt)) + '</span></span><span class="sw-app-t sw-app-clamp4">' + esc(n.text || '') + '</span></span>', function () { openVerse(n.verseKey); }); });
      }
    }
    if (window.NotesEngine && window.NotesEngine.exportAll) {
      try { Promise.resolve(window.NotesEngine.exportAll()).then(function (all) { out.notes = (all && all.notes) || []; show(); }, show); } catch (e) { show(); }
    } else show();
  }

  /* ── SETTINGS: theme through the page's own switch, text size through its slider. ── */
  function appearance() { try { return localStorage.getItem('sw-shell-appearance') || 'system'; } catch (e) { return 'system'; } }
  function applyAppearance(choice) {
    try { localStorage.setItem('sw-shell-appearance', choice); } catch (e) {}
    var t = choice;
    if (choice === 'system') { try { t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { t = 'light'; } }
    if (window.swApplyTheme) window.swApplyTheme(t);
  }
  function renderSettings() {
    var p = page('Settings');
    header(p.scroll, 'Appearance'); var ca = card(p.scroll);
    [['system', 'Match phone'], ['light', 'Light'], ['sepia', 'Sepia'], ['dark', 'Dark']].forEach(function (o) {
      rowIn(ca, '<span class="sw-app-t sw-app-grow">' + o[1] + '</span>' + (appearance() === o[0] ? '<span class="sw-app-here">' + svg('check', 22) + '</span>' : ''), function () { applyAppearance(o[0]); renderSettings(); });
    });
    p.scroll.appendChild(el('div', 'sw-app-gap'));
    header(p.scroll, 'Text size'); var cs = card(p.scroll);
    var r = rowIn(cs, '<button type="button" class="sw-app-sizebtn"><span style="font-size:14px">A</span> Smaller</button><span class="sw-app-grow"></span><button type="button" class="sw-app-sizebtn"><span style="font-size:20px">A</span> Larger</button>');
    var bs = r.querySelectorAll('button'); bs[0].addEventListener('click', function () { window.stepSize && window.stepSize(-10); }); bs[1].addEventListener('click', function () { window.stepSize && window.stepSize(10); });
    rowIn(cs, '<span class="sw-app-sub">Sets the reading size on every page; the same control as the Aa button in the reader.</span>');
    p.scroll.appendChild(el('div', 'sw-app-gap'));
    header(p.scroll, 'About'); var cb = card(p.scroll);
    rowIn(cb, '<span class="sw-app-t">Sefer Mormon in print</span>', function () { open('in-print.html'); });
    rowIn(cb, '<span class="sw-app-t">Privacy</span>', function () { open('privacy.html'); });
  }

  /* ── LISTEN: the page's own reader, and a now-playing bar in the row's place. ── */
  function ra() { return window.SWReadAloud || null; }
  function toggleListen() {
    var r = ra();
    /* Off the reader there is nothing to read yet: open the book, as Read does. */
    if (!r) { tap('read'); return; }
    closePanel();
    if (r.playing) r.stop(); else r.play();
    setTimeout(refreshListen, 400);
  }
  function press(id) { var b = document.getElementById(id); if (b) b.click(); setTimeout(refreshListen, 300); }
  function refreshListen() {
    var r = ra(), on = !!(r && r.playing);
    if (on !== listening) { listening = on; html.classList.toggle('sw-app-listening', on); }
    if (on) renderPlayer(r);
    clearTimeout(listenTimer);
    if (on) listenTimer = setTimeout(refreshListen, 1000);
  }
  function renderPlayer(r) {
    var pb = document.getElementById('ra-pause'), paused = !!(pb && pb.getAttribute('aria-pressed') === 'true');
    var vol = currentVolume(), rate = Number(r.rate) || 0;
    player.innerHTML = '<button type="button" class="sw-app-pb" aria-label="Stop listening">' + svg('close', 22) + '</button>' +
      '<span class="sw-app-ptile sw-app-heb">' + esc(vol ? vol.heb : 'כתבי הקדש') + '</span>' +
      '<span class="sw-app-pinfo"><span class="sw-app-ptitle">' + esc(whereLabel() || 'Reading') + '</span><span class="sw-app-psub">' + esc(vol ? vol.name : 'Hebrew') + ' | Hebrew · <button type="button" class="sw-app-rate" aria-label="Reading speed">' + esc(String(rate).replace(/0+$/, '')) + '×</button></span></span>' +
      '<button type="button" class="sw-app-pb" aria-label="Back ten seconds">' + svg('replay', 22) + '</button>' +
      '<button type="button" class="sw-app-pb" aria-label="' + (paused ? 'Resume' : 'Pause') + '">' + svg(paused ? 'play' : 'pause', 22) + '</button>';
    var bs = player.querySelectorAll('.sw-app-pb');
    bs[0].addEventListener('click', function () { r.stop(); setTimeout(refreshListen, 300); });
    bs[1].addEventListener('click', function () { press('ra-back'); });
    bs[2].addEventListener('click', function () { press('ra-pause'); });
    player.querySelector('.sw-app-rate').addEventListener('click', function () {
      var sp = (r.speeds || []).map(Number); if (!sp.length) return;
      var i = sp.indexOf(rate); r.setRate(sp[(i + 1) % sp.length]); refreshListen();
    });
  }

  /* ── READING FOLDS THE MODE ROW: a finger's scroll down, and up brings it back. ── */
  function watchScroll() {
    /* A finger DRAGGING, not the page: the web has no "is the user dragging"
       signal, so a drag is a touch that moved, still down or ended within the
       last moment (a fling). A bare tap is not a drag, so the scroll the
       reader makes after a tap on Listen — it follows the voice — never
       folds the row; and while the page reads, nothing folds at all. */
    var lastY = window.scrollY || 0, dragging = false, lastDrag = 0;
    document.addEventListener('touchmove', function () { dragging = true; lastDrag = Date.now(); }, { passive: true });
    document.addEventListener('touchend', function () { dragging = false; }, { passive: true });
    document.addEventListener('touchcancel', function () { dragging = false; }, { passive: true });
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0, dy = y - lastY; lastY = y;
      if (y <= 40) { html.classList.remove('sw-app-reading'); return; }
      if (listening) return;
      if (!dragging && Date.now() - lastDrag > 1500) return;
      if (Math.abs(dy) < 6) return;
      html.classList.toggle('sw-app-reading', dy > 0);
    }, { passive: true });
  }

  /* ── messages from the shared scripts ────────────────────────────────── */
  shell.receive = function (m) {
    if (m.op === 'library') { if (current === 'library') closePanel(); else openPanel('library'); }
    /* 'theme': the site's own variables recolour everything; nothing to do. */
  };

  /* Match phone: follow the phone's scheme while that is the choice. */
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (appearance() === 'system') applyAppearance('system'); });
  } catch (e) {}
})();
