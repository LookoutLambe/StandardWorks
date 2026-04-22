/* Dictionary — Strong's Hebrew (offline, no build step) */
(function() {
  'use strict';

  var LS_DARK = 'sw-dark';
  var LS_SAVED = 'sw-saved-strongs-v1'; // JSON string array of Strong's IDs: ["H0430", ...]

  function $(id) { return document.getElementById(id); }
  var elQ = $('q');
  var elList = $('list');
  var elEntry = $('entry');
  var elCount = $('countPill');
  var btnDark = $('darkBtn');
  var btnHome = $('homeBtn');
  var btnSaved = $('savedBtn');

  function safe(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function restoreDark() {
    try {
      if (localStorage.getItem(LS_DARK) === '1') {
        document.body.classList.add('dark-mode');
        if (btnDark) btnDark.textContent = '☀️';
      }
    } catch (e) {}
  }
  function toggleDark() {
    document.body.classList.toggle('dark-mode');
    var isDark = document.body.classList.contains('dark-mode');
    if (btnDark) btnDark.textContent = isDark ? '☀️' : '🌙';
    try { localStorage.setItem(LS_DARK, isDark ? '1' : '0'); } catch (e) {}
  }

  function homeHref() {
    var p = (window.location && window.location.pathname) ? window.location.pathname : '';
    return (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../index.html' : 'index.html';
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(LS_SAVED);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(function(x) { return typeof x === 'string' && /^H\d{4}$/.test(x); });
    } catch (e) { return []; }
  }
  function saveSaved(list) {
    try { localStorage.setItem(LS_SAVED, JSON.stringify(list || [])); } catch (e) {}
  }
  function isSaved(h) {
    var s = loadSaved();
    return s.indexOf(h) >= 0;
  }
  function toggleSaved(h) {
    var s = loadSaved();
    var i = s.indexOf(h);
    if (i >= 0) s.splice(i, 1);
    else s.unshift(h);
    // de-dupe, keep top 500
    var seen = {};
    s = s.filter(function(x) { if (seen[x]) return false; seen[x] = 1; return true; }).slice(0, 500);
    saveSaved(s);
    return s;
  }

  function norm(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ');
  }

  function getRoots() {
    return window._strongsRoots || {};
  }

  function getLookup() {
    return window._strongsLookup || {};
  }

  function resolveToStrongs(query) {
    var q = String(query || '').trim();
    if (!q) return '';
    var m = q.match(/^(H)?(\d{1,4})$/i);
    if (m) return 'H' + String(m[2]).padStart(4, '0');
    var m2 = q.match(/^H(\d{4})$/i);
    if (m2) return 'H' + m2[1];
    // Try Hebrew form lookup
    var lookup = getLookup();
    var h = lookup[q.normalize('NFC')];
    if (h && /^H\d{4}$/.test(h)) return h;
    // Try stripping cantillation marks (keep vowels)
    var stripped = q.replace(/[\u0591-\u05AF]/g, '').replace(/\u05BD/g, '').normalize('NFC');
    h = lookup[stripped];
    if (h && /^H\d{4}$/.test(h)) return h;
    return '';
  }

  function renderEntry(hNum) {
    var roots = getRoots();
    var e = roots[hNum] || null;
    if (!e) {
      elEntry.innerHTML = '<h2>Not found</h2><div class="small">No entry for <code>' + safe(hNum) + '</code>.</div>';
      return;
    }
    var w = e.w || '';
    var x = e.x || '';
    var g = e.g || '';
    var r = e.r || '';
    var saved = isSaved(hNum);

    var html = '';
    html += '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; flex-wrap:wrap;">';
    html +=   '<div>';
    html +=     '<h2 style="margin:0"><span style="direction:rtl; font-size:1.2em">' + safe(w) + '</span> <span style="opacity:0.7; font-size:0.75em">(' + safe(hNum) + ')</span></h2>';
    html +=     '<div class="pill" style="margin-top:10px">Translit: <strong>' + safe(x || '—') + '</strong></div>';
    html +=     '<div class="pill" style="margin-top:10px">Gloss: <strong>' + safe(g || '—') + '</strong></div>';
    if (r && /^H\d{4}$/.test(r)) html += '<div class="pill" style="margin-top:10px">Related: <code>' + safe(r) + '</code></div>';
    html +=   '</div>';
    html +=   '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">';
    html +=     '<button class="btn ' + (saved ? 'danger' : 'primary') + '" id="saveBtn" type="button">' + (saved ? 'Remove from Saved' : 'Save word') + '</button>';
    html +=     '<button class="btn" id="openVocabBtn" type="button">Practice in Vocab</button>';
    html +=   '</div>';
    html += '</div>';

    html += '<div class="small" style="margin-top:12px;">';
    html += 'Tip: you can link directly to this entry with <code>#' + safe(hNum) + '</code>.';
    html += '</div>';
    elEntry.innerHTML = html;

    var saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.onclick = function() {
      toggleSaved(hNum);
      renderEntry(hNum);
      renderList(currentList);
    };
    var openVocabBtn = document.getElementById('openVocabBtn');
    if (openVocabBtn) openVocabBtn.onclick = function() {
      var p = (window.location && window.location.pathname) ? window.location.pathname : '';
      var href = (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../vocab.html' : 'vocab.html';
      window.location.href = href + '#saved';
    };
  }

  function rankMatches(q, hNum, e) {
    // Lower is better
    var w = String(e.w || '');
    var g = String(e.g || '');
    var x = String(e.x || '');
    var s = (hNum + ' ' + w + ' ' + x + ' ' + g).toLowerCase();
    if (s === q) return 0;
    if (hNum.toLowerCase() === q) return 1;
    if (w && w.indexOf(q) === 0) return 2;
    if (g && g.toLowerCase().indexOf(q) === 0) return 3;
    if (s.indexOf(q) >= 0) return 4;
    return 9;
  }

  var currentList = [];
  function renderList(items) {
    if (!elList) return;
    var html = '';
    if (!items || !items.length) {
      html = '<div class="item" style="cursor:default; opacity:0.8">No results.</div>';
      elList.innerHTML = html;
      return;
    }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      html += '' +
        '<div class="item" data-h="' + safe(it.h) + '">' +
          '<div class="heb">' + safe(it.w || '—') + '</div>' +
          '<div class="meta"><strong>' + safe(it.h) + '</strong> · ' + safe(it.g || '—') + (it.x ? (' · ' + safe(it.x)) : '') + '</div>' +
        '</div>';
    }
    elList.innerHTML = html;
    elList.querySelectorAll('.item[data-h]').forEach(function(row) {
      row.onclick = function() {
        var h = row.getAttribute('data-h');
        if (!h) return;
        window.location.hash = '#' + h;
        renderEntry(h);
      };
    });
  }

  function runSearch(query) {
    var roots = getRoots();
    var q = norm(query);
    if (!roots || !Object.keys(roots).length) {
      elCount.textContent = 'Missing data';
      renderList([]);
      return;
    }

    var strong = resolveToStrongs(query);
    if (strong && roots[strong]) {
      // If query resolves cleanly, jump to it.
      window.location.hash = '#' + strong;
      renderEntry(strong);
    }

    var out = [];
    if (!q) {
      // Default: show saved or a short starting slice.
      var saved = loadSaved();
      if (saved.length) {
        for (var s = 0; s < Math.min(80, saved.length); s++) {
          var h = saved[s];
          var e = roots[h];
          if (e) out.push({ h: h, w: e.w, x: e.x, g: e.g });
        }
        elCount.textContent = 'Saved: ' + saved.length;
        currentList = out;
        renderList(out);
        return;
      }
      // Otherwise show first N entries
      var keys = Object.keys(roots).filter(function(k) { return /^H\d{4}$/.test(k); }).slice(0, 80);
      keys.forEach(function(h) {
        var e = roots[h];
        if (e) out.push({ h: h, w: e.w, x: e.x, g: e.g });
      });
      elCount.textContent = 'Loaded';
      currentList = out;
      renderList(out);
      return;
    }

    var max = 120;
    var keysAll = Object.keys(roots);
    for (var i = 0; i < keysAll.length; i++) {
      var hNum = keysAll[i];
      if (!/^H\d{4}$/.test(hNum)) continue;
      var e = roots[hNum];
      if (!e) continue;
      var w = String(e.w || '');
      var g = String(e.g || '');
      var x = String(e.x || '');
      var hay = (hNum + ' ' + w + ' ' + x + ' ' + g).toLowerCase();
      if (hay.indexOf(q) < 0) continue;
      out.push({ h: hNum, w: w, x: x, g: g, _rank: rankMatches(q, hNum, e) });
      if (out.length > 700) break; // protect worst-case
    }
    out.sort(function(a, b) {
      if (a._rank !== b._rank) return a._rank - b._rank;
      return a.h.localeCompare(b.h);
    });
    out = out.slice(0, max).map(function(it) { delete it._rank; return it; });
    elCount.textContent = out.length + ' matches';
    currentList = out;
    renderList(out);
  }

  var _t = null;
  function scheduleSearch() {
    if (_t) clearTimeout(_t);
    _t = setTimeout(function() { runSearch(elQ ? elQ.value : ''); }, 80);
  }

  function showSaved() {
    if (elQ) elQ.value = '';
    runSearch('');
  }

  function initHash() {
    var raw = (window.location && window.location.hash) ? window.location.hash.replace(/^#/, '') : '';
    var h = resolveToStrongs(raw);
    if (h) {
      if (elQ) elQ.value = h;
      renderEntry(h);
    }
  }

  // Wire
  restoreDark();
  if (btnDark) btnDark.onclick = toggleDark;
  if (btnHome) btnHome.onclick = function() { window.location.href = homeHref(); };
  if (btnSaved) btnSaved.onclick = showSaved;
  if (elQ) {
    elQ.addEventListener('input', scheduleSearch);
    elQ.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); runSearch(elQ.value); }
      if (e.key === 'Escape') { elQ.value = ''; runSearch(''); }
    });
  }

  // Start
  initHash();
  runSearch((elQ && elQ.value) ? elQ.value : '');
})();

