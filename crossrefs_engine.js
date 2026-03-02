/**
 * crossrefs_engine.js
 *
 * Shared cross-reference engine for all Standard Works pages.
 * Each page loads its own crossrefs data file (e.g. pgp_crossrefs.js)
 * which sets window._volumeCrossrefsData, then includes this script.
 *
 * Expected globals from the page:
 *   - window._volumeCrossrefsData  (set by the data file)
 *   - getRoot(hebrewWord)          (from the page's Hebrew utils)
 *   - transliterate(hebrewWord)    (from the page's transliteration utils)
 *   - window._rootGlossaryData     (from roots_glossary.js)
 *   - toSofit(root)                (from the page's Hebrew utils)
 */

(function() {
  'use strict';

  // ── State ──
  window._crossrefsLoaded = false;
  window._crossrefMap = {};
  window._rootXrefs = {};

  // ── Load cross-references ──
  function loadCrossRefs() {
    if (window._crossrefsLoaded) return;
    if (!window._volumeCrossrefsData) {
      console.warn('Cross-refs: No data found (window._volumeCrossrefsData not set)');
      return;
    }
    window._crossrefMap = window._volumeCrossrefsData;
    window._crossrefsLoaded = true;
    console.log('Cross-references loaded:', Object.keys(window._crossrefMap).length, 'verses');
    addCrossRefMarkers();
  }

  // ── Simple English stemmer for matching ──
  function simpleStem(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (w.endsWith('ing')) w = w.slice(0, -3);
    else if (w.endsWith('ness')) w = w.slice(0, -4);
    else if (w.endsWith('tion')) w = w.slice(0, -4);
    else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith('ly') && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith('er') && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1);
    return w;
  }

  // ── Add cross-reference markers to all rendered verses ──
  function addCrossRefMarkers() {
    if (!window._crossrefsLoaded) return;

    var allVerses = document.querySelectorAll('[data-verse-key]');
    allVerses.forEach(function(verseDiv) {
      var key = verseDiv.getAttribute('data-verse-key');
      var refs = window._crossrefMap[key];
      if (!refs || refs.length === 0) return;

      var wordFlow = verseDiv.querySelector('.word-flow');
      if (!wordFlow) return;
      var wordUnits = wordFlow.querySelectorAll('.word-unit');
      if (wordUnits.length === 0) return;

      // Build gloss list
      var glossList = [];
      for (var gi = 0; gi < wordUnits.length; gi++) {
        var glEl = wordUnits[gi].querySelector('.gl');
        glossList.push(glEl ? glEl.textContent.toLowerCase().replace(/-/g, ' ').trim() : '');
      }

      // Helper: attach marker to a word-unit
      function attachMarker(wu, ref) {
        var sup = document.createElement('sup');
        sup.className = 'xref-marker';
        sup.setAttribute('data-marker', ref.marker);
        sup.textContent = ref.marker;
        var hwEl = wu.querySelector('.hw');
        var wuRoot = (hwEl && window.getRoot) ? window.getRoot(hwEl.textContent) : '';
        sup.onclick = (function(r, rt, k) {
          return function(e) {
            e.stopPropagation();
            openXrefPanel(r, k, rt);
          };
        })(ref, wuRoot, key);
        wu.appendChild(sup);
        wu.classList.add('xref-linked');

        // Store xref data on word-unit for popup integration
        if (!wu.getAttribute('data-xref-ref')) {
          wu.setAttribute('data-xref-ref', JSON.stringify(ref));
          wu.setAttribute('data-xref-key', key);
        }

        // Index by Hebrew root
        if (hwEl && window.getRoot) {
          var root = window.getRoot(hwEl.textContent);
          if (root) {
            if (!window._rootXrefs[root]) window._rootXrefs[root] = [];
            window._rootXrefs[root].push({ ref: ref, verseKey: key });
          }
        }
      }

      // Place markers on matching words
      refs.forEach(function(ref) {
        var placed = false;
        if (!ref.text) return;
        var searchText = ref.text.toLowerCase().trim();
        var searchWords = searchText.split(/[\s-]+/);
        var searchStems = searchWords.map(simpleStem).filter(function(s) { return s.length >= 3; });

        // Strategy 1: Direct gloss match
        for (var i = 0; i < wordUnits.length; i++) {
          if (wordUnits[i].querySelector('.xref-marker[data-marker="' + ref.marker + '"]')) continue;
          var gl = glossList[i];
          if (!gl || gl.length < 2) continue;
          if (gl === searchText || gl.indexOf(searchText) !== -1 || (gl.length >= 3 && searchText.indexOf(gl) !== -1)) {
            attachMarker(wordUnits[i], ref);
            placed = true;
            break;
          }
        }

        // Strategy 2: Stem matching
        if (!placed && searchStems.length > 0) {
          for (var i2 = 0; i2 < wordUnits.length; i2++) {
            if (wordUnits[i2].querySelector('.xref-marker[data-marker="' + ref.marker + '"]')) continue;
            var gl2 = glossList[i2];
            if (!gl2 || gl2.length < 2) continue;
            var glossWords = gl2.split(/[\s-]+/);
            var glossStems = glossWords.map(simpleStem).filter(function(s) { return s.length >= 3; });
            var matchCount = 0;
            searchStems.forEach(function(ss) {
              glossStems.forEach(function(gs) {
                if (ss === gs || ss.indexOf(gs) === 0 || gs.indexOf(ss) === 0) matchCount++;
              });
            });
            if (matchCount > 0) {
              attachMarker(wordUnits[i2], ref);
              placed = true;
              break;
            }
          }
        }

        // Strategy 3: Position-based fallback (place proportionally)
        if (!placed) {
          var idx = Math.min(Math.round(refs.indexOf(ref) / refs.length * wordUnits.length), wordUnits.length - 1);
          for (var off = 0; off <= 3; off++) {
            if (idx + off < wordUnits.length && !wordUnits[idx + off].querySelector('.xref-marker[data-marker="' + ref.marker + '"]')) {
              attachMarker(wordUnits[idx + off], ref);
              placed = true;
              break;
            }
            if (idx - off >= 0 && !wordUnits[idx - off].querySelector('.xref-marker[data-marker="' + ref.marker + '"]')) {
              attachMarker(wordUnits[idx - off], ref);
              placed = true;
              break;
            }
          }
        }
      });
    });
  }

  // ── Open cross-reference panel ──
  function openXrefPanel(ref, sourceVerseKey, hebrewRoot) {
    var panel = document.getElementById('xref-panel');
    if (!panel) return;

    var displayText = ref.text || '';
    var engMeaning = '';
    if (hebrewRoot) {
      var glossEntry = window._rootGlossaryData && window._rootGlossaryData[hebrewRoot];
      engMeaning = glossEntry ? glossEntry.meaning : '';
      displayText = hebrewRoot;
    }
    var xrefTranslit = (hebrewRoot && typeof transliterate === 'function')
      ? ' <span style="font-weight:400;font-size:0.75em;opacity:0.7;">' + transliterate(hebrewRoot) + '</span>'
      : '';
    panel.querySelector('.xref-panel-word').innerHTML = displayText + xrefTranslit +
      (engMeaning ? ' <span style="font-weight:400;font-size:0.8em;color:var(--ink-light,#888);">\u2014 ' + engMeaning + '</span>' : '');

    var catLabel = ref.category === 'tg' ? 'Topical Guide' :
      ref.category === 'cross-ref' ? 'Cross-Reference' :
      ref.category === 'gst' ? 'Guide to Scriptures' :
      ref.category === 'heb' ? 'Hebrew/Greek' :
      ref.category === 'ie' ? 'Explanation' :
      ref.category === 'or' ? 'Alternate Translation' :
      (ref.category || 'Cross-Reference');
    panel.querySelector('.xref-panel-category').textContent = catLabel;

    var refsContainer = document.getElementById('xref-panel-refs');
    refsContainer.innerHTML = '';

    if (ref.refs && ref.refs.length > 0) {
      ref.refs.forEach(function(r) {
        var card = document.createElement('div');
        card.className = 'xref-ref-card';

        var titleDiv = document.createElement('div');
        titleDiv.className = 'xref-ref-title';
        var titleSpan = document.createElement('span');
        titleSpan.textContent = r;
        titleDiv.appendChild(titleSpan);
        card.appendChild(titleDiv);

        refsContainer.appendChild(card);
      });
    } else {
      var noData = document.createElement('div');
      noData.className = 'xref-ref-nodata';
      noData.textContent = 'No additional references available.';
      refsContainer.appendChild(noData);
    }

    panel.scrollTop = 0;
    panel.classList.add('open');
  }

  // ── Open aggregated root xref panel ──
  function openRootXrefPanel(root) {
    var entries = window._rootXrefs[root];
    if (!entries || entries.length === 0) return;

    var panel = document.getElementById('xref-panel');
    if (!panel) return;

    var glossEntry = window._rootGlossaryData && window._rootGlossaryData[root];
    var engMeaning = glossEntry ? glossEntry.meaning : '';
    var rootTranslit = (typeof transliterate === 'function') ? transliterate(root) : '';
    panel.querySelector('.xref-panel-word').innerHTML = root +
      (rootTranslit ? ' <span style="font-weight:400;font-size:0.75em;opacity:0.7;">' + rootTranslit + '</span>' : '') +
      (engMeaning ? ' <span style="font-weight:400;font-size:0.8em;color:var(--ink-light,#888);">\u2014 ' + engMeaning + '</span>' : '');
    panel.querySelector('.xref-panel-category').textContent = 'Cross-References (' + entries.length + ' markers)';

    var refsContainer = document.getElementById('xref-panel-refs');
    refsContainer.innerHTML = '';

    // Deduplicate
    var seen = {};
    entries.forEach(function(e) {
      if (e.ref.refs) {
        e.ref.refs.forEach(function(r) {
          if (!seen[r]) {
            seen[r] = true;
            var card = document.createElement('div');
            card.className = 'xref-ref-card';
            var titleDiv = document.createElement('div');
            titleDiv.className = 'xref-ref-title';
            titleDiv.textContent = r;
            card.appendChild(titleDiv);
            refsContainer.appendChild(card);
          }
        });
      }
    });

    panel.scrollTop = 0;
    panel.classList.add('open');
  }

  // ── Close panel ──
  function closeXrefPanel() {
    var panel = document.getElementById('xref-panel');
    if (panel) panel.classList.remove('open');
  }

  // ── Click outside to close ──
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('xref-panel');
    if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !e.target.classList.contains('xref-marker')) {
      closeXrefPanel();
    }
  });

  // ── Expose globally ──
  window.loadCrossRefs = loadCrossRefs;
  window.addCrossRefMarkers = addCrossRefMarkers;
  window.openXrefPanel = openXrefPanel;
  window.openRootXrefPanel = openRootXrefPanel;
  window.closeXrefPanel = closeXrefPanel;

  // ── Auto-load after delay ──
  setTimeout(loadCrossRefs, 500);

})();
