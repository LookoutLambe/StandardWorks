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
 *   - window._scriptureVerses      (from scripture_verses.js, optional)
 */

(function() {
  'use strict';

  // ── State ──
  window._crossrefsLoaded = false;
  window._crossrefMap = {};
  window._rootXrefs = {};

  // ── Scripture abbreviation to full book name ──
  var _abbrToFullBook = {
    'Gen.': 'Genesis', 'Ex.': 'Exodus', 'Lev.': 'Leviticus', 'Num.': 'Numbers',
    'Deut.': 'Deuteronomy', 'Josh.': 'Joshua', 'Judg.': 'Judges', 'Ruth': 'Ruth',
    '1 Sam.': '1 Samuel', '2 Sam.': '2 Samuel', '1 Kgs.': '1 Kings', '2 Kgs.': '2 Kings',
    '1 Chr.': '1 Chronicles', '2 Chr.': '2 Chronicles', 'Ezra': 'Ezra', 'Neh.': 'Nehemiah',
    'Esth.': 'Esther', 'Job': 'Job', 'Ps.': 'Psalms', 'Prov.': 'Proverbs',
    'Eccl.': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa.': 'Isaiah', 'Jer.': 'Jeremiah',
    'Lam.': 'Lamentations', 'Ezek.': 'Ezekiel', 'Dan.': 'Daniel', 'Hosea': 'Hosea',
    'Joel': 'Joel', 'Amos': 'Amos', 'Obad.': 'Obadiah', 'Jonah': 'Jonah',
    'Micah': 'Micah', 'Nahum': 'Nahum', 'Hab.': 'Habakkuk', 'Zeph.': 'Zephaniah',
    'Hag.': 'Haggai', 'Zech.': 'Zechariah', 'Mal.': 'Malachi',
    'Matt.': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
    'Acts': 'Acts', 'Rom.': 'Romans', '1 Cor.': '1 Corinthians', '2 Cor.': '2 Corinthians',
    'Gal.': 'Galatians', 'Eph.': 'Ephesians', 'Philip.': 'Philippians', 'Col.': 'Colossians',
    '1 Thes.': '1 Thessalonians', '2 Thes.': '2 Thessalonians',
    '1 Tim.': '1 Timothy', '2 Tim.': '2 Timothy', 'Titus': 'Titus', 'Philem.': 'Philemon',
    'Heb.': 'Hebrews', 'James': 'James', '1 Pet.': '1 Peter', '2 Pet.': '2 Peter',
    '1 Jn.': '1 John', '2 Jn.': '2 John', '3 Jn.': '3 John', 'Jude': 'Jude', 'Rev.': 'Revelation',
    'D&C': 'D&C', 'Moses': 'Moses', 'Abr.': 'Abraham', 'JS—H': 'JS-H', 'JS—M': 'JS-M', 'A of F': 'A-of-F',
    '1 Ne.': '1 Nephi', '2 Ne.': '2 Nephi', 'Jacob': 'Jacob', 'Enos': 'Enos',
    'Jarom': 'Jarom', 'Omni': 'Omni', 'W of M': 'Words of Mormon',
    'Mosiah': 'Mosiah', 'Alma': 'Alma', 'Hel.': 'Helaman',
    '3 Ne.': '3 Nephi', '4 Ne.': '4 Nephi', 'Morm.': 'Mormon',
    'Ether': 'Ether', 'Moro.': 'Moroni'
  };

  function parseScriptureRef(refText) {
    var norm = refText.replace(/\u00a0/g, ' ');
    for (var abbr in _abbrToFullBook) {
      if (norm.indexOf(abbr) === 0) {
        var rest = norm.substring(abbr.length).trim();
        var m = rest.match(/^(\d+):(\d+)/);
        if (m) {
          return _abbrToFullBook[abbr] + '|' + m[1] + '|' + m[2];
        }
      }
    }
    return null;
  }

  function getExternalVerseHtml(refText) {
    if (!window._scriptureVerses) return '';
    var key = parseScriptureRef(refText);
    if (key && window._scriptureVerses[key]) {
      return '<div class="xref-ref-english">' + window._scriptureVerses[key] + '</div>';
    }
    return '';
  }

  function getInternalVerseHtml(verseKey) {
    var verseDiv = document.querySelector('[data-verse-key="' + verseKey + '"]');
    if (!verseDiv) return '';
    var wordUnits = verseDiv.querySelectorAll('.word-unit');
    if (wordUnits.length === 0) return '';
    var html = '<div class="xref-ref-content">';
    wordUnits.forEach(function(wu) {
      var hwEl = wu.querySelector('.hw');
      var glEl = wu.querySelector('.gl');
      if (hwEl) {
        html += '<span class="xref-ref-word">';
        html += '<span class="hw">' + hwEl.textContent + '</span>';
        if (glEl) html += '<span class="en">' + glEl.textContent + '</span>';
        html += '</span>';
      }
    });
    html += '</div>';
    // Gloss-based English summary
    var glossArr = [];
    wordUnits.forEach(function(wu) {
      var glEl = wu.querySelector('.gl');
      if (glEl && glEl.textContent) glossArr.push(glEl.textContent);
    });
    if (glossArr.length > 0) {
      html += '<div class="xref-ref-english" style="font-style:italic;">' + glossArr.join(' ') + '</div>';
    }
    return html;
  }

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

      // Skip if already processed
      if (wordFlow.getAttribute('data-xrefs-applied')) return;
      wordFlow.setAttribute('data-xrefs-applied', '1');

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
      var lastBookPrefix = '';
      ref.refs.forEach(function(r) {
        var rNorm = r.replace(/\u00a0/g, ' ');

        // Resolve abbreviated continuation references
        var foundPrefix = '';
        for (var abbr in _abbrToFullBook) {
          if (rNorm.indexOf(abbr) === 0) { foundPrefix = abbr; break; }
        }
        var fullRef = rNorm;
        if (foundPrefix) {
          lastBookPrefix = foundPrefix;
        } else if (/^\d/.test(rNorm) && lastBookPrefix) {
          fullRef = lastBookPrefix + ' ' + rNorm;
        }

        var card = document.createElement('div');
        card.className = 'xref-ref-card';

        var titleDiv = document.createElement('div');
        titleDiv.className = 'xref-ref-title';

        // Check if this is an internal reference (in the current volume)
        var refKey = parseScriptureRef(fullRef);
        var isInternal = refKey && window._crossrefMap[refKey];

        var titleSpan = document.createElement('span');
        titleSpan.textContent = fullRef;
        if (isInternal) {
          titleSpan.style.cursor = 'pointer';
          titleSpan.style.textDecoration = 'underline';
          titleSpan.onclick = (function(k) {
            return function() {
              closeXrefPanel();
              navigateToVerseKey(k);
            };
          })(refKey);
        }
        titleDiv.appendChild(titleSpan);

        // Add "Go to verse" button for internal references
        if (isInternal) {
          var gotoBtn = document.createElement('span');
          gotoBtn.className = 'xref-ref-goto';
          gotoBtn.textContent = 'Go to verse \u2192';
          gotoBtn.onclick = (function(k) {
            return function() {
              closeXrefPanel();
              navigateToVerseKey(k);
            };
          })(refKey);
          titleDiv.appendChild(gotoBtn);
        }

        card.appendChild(titleDiv);

        // Show verse content
        if (isInternal) {
          var intHtml = getInternalVerseHtml(refKey);
          if (intHtml) {
            var intDiv = document.createElement('div');
            intDiv.innerHTML = intHtml;
            card.appendChild(intDiv);
          }
        }
        // Try external verse lookup (scripture_verses.js)
        var extHtml = getExternalVerseHtml(fullRef);
        if (extHtml) {
          var extDiv = document.createElement('div');
          extDiv.innerHTML = extHtml;
          card.appendChild(extDiv);
        }

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

  // ── Navigate to a verse key within the current volume ──
  function navigateToVerseKey(verseKey) {
    // verseKey format: "BookName|Chapter|Verse"
    var parts = verseKey.split('|');
    if (parts.length < 3) return;

    // Try to find the verse already in the DOM
    var existing = document.querySelector('[data-verse-key="' + verseKey + '"]');
    if (existing) {
      existing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      existing.style.transition = 'background 0.3s';
      existing.style.background = 'rgba(200,168,78,0.2)';
      setTimeout(function() { existing.style.background = ''; }, 2000);
      return;
    }

    // If not in DOM, try to navigate to the right chapter panel
    // Look for chapter panels and try to match
    var panels = document.querySelectorAll('.chapter-panel');
    for (var i = 0; i < panels.length; i++) {
      var panelId = panels[i].id;
      if (!panelId || panelId === 'panel-landing') continue;

      // Get the chapter ID from panel ID (remove "panel-" prefix)
      var chapId = panelId.replace('panel-', '');

      // Check if getBookChapter maps this panel to the right book/chapter
      if (typeof getBookChapter === 'function') {
        var bc = getBookChapter(chapId);
        if (bc && bc.book === parts[0] && String(bc.chapter) === parts[1]) {
          // Found the right panel - render it and navigate
          if (typeof _ensureChapterRendered === 'function') {
            _ensureChapterRendered(chapId);
          }
          panels[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Try to find the verse after rendering
          setTimeout(function() {
            var v = document.querySelector('[data-verse-key="' + verseKey + '"]');
            if (v) {
              v.scrollIntoView({ behavior: 'smooth', block: 'center' });
              v.style.transition = 'background 0.3s';
              v.style.background = 'rgba(200,168,78,0.2)';
              setTimeout(function() { v.style.background = ''; }, 2000);
            }
          }, 300);
          return;
        }
      }
    }
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
    var lastBookPrefix = '';
    entries.forEach(function(e) {
      if (e.ref.refs) {
        e.ref.refs.forEach(function(r) {
          var rNorm = r.replace(/\u00a0/g, ' ');
          var foundPrefix = '';
          for (var abbr in _abbrToFullBook) {
            if (rNorm.indexOf(abbr) === 0) { foundPrefix = abbr; break; }
          }
          var fullRef = rNorm;
          if (foundPrefix) {
            lastBookPrefix = foundPrefix;
          } else if (/^\d/.test(rNorm) && lastBookPrefix) {
            fullRef = lastBookPrefix + ' ' + rNorm;
          }

          if (!seen[fullRef]) {
            seen[fullRef] = true;
            var card = document.createElement('div');
            card.className = 'xref-ref-card';
            var titleDiv = document.createElement('div');
            titleDiv.className = 'xref-ref-title';
            var titleSpan = document.createElement('span');
            titleSpan.textContent = fullRef;
            titleDiv.appendChild(titleSpan);
            card.appendChild(titleDiv);

            // Show verse text
            var extHtml = getExternalVerseHtml(fullRef);
            if (extHtml) {
              var extDiv = document.createElement('div');
              extDiv.innerHTML = extHtml;
              card.appendChild(extDiv);
            }

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

  // ── Selection toolbar cross-reference button handler ──
  function selToolbarXref() {
    var candidates = [];
    if (window._selWordUnits && window._selWordUnits.length > 0) {
      for (var i = 0; i < window._selWordUnits.length; i++) candidates.push(window._selWordUnits[i]);
    }
    if (window._popupWordUnit) candidates.push(window._popupWordUnit);

    for (var c = 0; c < candidates.length; c++) {
      var wu = candidates[c];
      var xrefData = wu.getAttribute('data-xref-ref');
      var xrefKey = wu.getAttribute('data-xref-key');
      if (xrefData && xrefKey) {
        var hw = wu.querySelector('.hw');
        if (hw && window.getRoot) {
          var root = window.getRoot(hw.textContent);
          if (root && window._rootXrefs && window._rootXrefs[root]) {
            if (typeof _hideSelToolbar === 'function') _hideSelToolbar();
            openRootXrefPanel(root);
            return;
          }
        }
        if (typeof _hideSelToolbar === 'function') _hideSelToolbar();
        openXrefPanel(JSON.parse(xrefData), xrefKey, '');
        return;
      }
      var hw2 = wu.querySelector('.hw');
      if (hw2 && window.getRoot) {
        var root2 = window.getRoot(hw2.textContent);
        if (root2 && window._rootXrefs && window._rootXrefs[root2]) {
          if (typeof _hideSelToolbar === 'function') _hideSelToolbar();
          openRootXrefPanel(root2);
          return;
        }
      }
    }

    // Find nearest xref-linked word in the current verse
    var verseEl = null;
    if (candidates.length > 0) verseEl = candidates[0].closest('[data-verse-key]');
    if (verseEl) {
      var verseXref = verseEl.querySelector('.xref-linked');
      if (verseXref) {
        var hw3 = verseXref.querySelector('.hw');
        if (hw3 && window.getRoot) {
          var root3 = window.getRoot(hw3.textContent);
          if (root3 && window._rootXrefs && window._rootXrefs[root3]) {
            if (typeof _hideSelToolbar === 'function') _hideSelToolbar();
            openRootXrefPanel(root3);
            return;
          }
        }
        var xd = verseXref.getAttribute('data-xref-ref');
        var xk = verseXref.getAttribute('data-xref-key');
        if (xd && xk) {
          if (typeof _hideSelToolbar === 'function') _hideSelToolbar();
          openXrefPanel(JSON.parse(xd), xk, '');
          return;
        }
      }
    }

    // Fallback: first xref-linked word in active chapter
    if (typeof _hideSelToolbar === 'function') _hideSelToolbar();
    var active = document.querySelector('.chapter-panel[style*="block"]');
    if (active) {
      var firstXref = active.querySelector('.xref-linked');
      if (firstXref) {
        var hw4 = firstXref.querySelector('.hw');
        if (hw4 && window.getRoot) {
          var root4 = window.getRoot(hw4.textContent);
          if (root4 && window._rootXrefs && window._rootXrefs[root4]) { openRootXrefPanel(root4); return; }
        }
        var xd2 = firstXref.getAttribute('data-xref-ref');
        var xk2 = firstXref.getAttribute('data-xref-key');
        if (xd2 && xk2) { openXrefPanel(JSON.parse(xd2), xk2, ''); return; }
      }
    }

    // Nothing found
    var panel = document.getElementById('xref-panel');
    if (panel) {
      panel.querySelector('.xref-panel-word').textContent = '';
      panel.querySelector('.xref-panel-category').textContent = 'No cross-references found';
      document.getElementById('xref-panel-refs').innerHTML = '<div style="padding:16px;color:#888;font-style:italic;">Tap a blue word to view its cross-references.</div>';
      panel.scrollTop = 0;
      panel.classList.add('open');
    }
  }

  // ── Wrap addCrossRefMarkers to also apply talk ref markers ──
  var _origAddCrossRefMarkers = addCrossRefMarkers;
  function addCrossRefMarkersWithTalks() {
    _origAddCrossRefMarkers();
    // Chain talk reference markers after cross-refs
    setTimeout(addTalkRefMarkers, 200);
  }

  // ── Expose globally ──
  window.loadCrossRefs = loadCrossRefs;
  window.addCrossRefMarkers = addCrossRefMarkersWithTalks;
  window.openXrefPanel = openXrefPanel;
  window.openRootXrefPanel = openRootXrefPanel;
  window.closeXrefPanel = closeXrefPanel;
  window.navigateToVerseKey = navigateToVerseKey;
  window.selToolbarXref = selToolbarXref;

  // ── Auto-load after delay ──
  setTimeout(loadCrossRefs, 500);

  // ══════════════════════════════════════════════════════════════
  // ── TALK REFERENCE MARKERS (President Oaks Conference Talks) ──
  // ══════════════════════════════════════════════════════════════

  /**
   * Adds talk reference badges to verses that are cited in
   * President Oaks' conference talks. Requires oaks_scripture_index.js
   * to be loaded (sets window._oaksScriptureIndex).
   */
  function addTalkRefMarkers() {
    if (!window._oaksScriptureIndex) return;

    var allVerses = document.querySelectorAll('[data-verse-key]');
    allVerses.forEach(function(verseDiv) {
      // Skip if already processed
      if (verseDiv.getAttribute('data-talk-refs-applied')) return;

      var key = verseDiv.getAttribute('data-verse-key');
      var talkRefs = window._oaksScriptureIndex[key];
      if (!talkRefs || talkRefs.length === 0) return;

      verseDiv.setAttribute('data-talk-refs-applied', '1');

      // Create a talk badge under the verse number
      var badge = document.createElement('span');
      badge.className = 'talk-ref-badge';
      badge.title = 'Referenced in ' + talkRefs.length + ' talk' + (talkRefs.length > 1 ? 's' : '') + ' by President Oaks';
      badge.textContent = '\uD83C\uDF99\uFE0F';
      badge.onclick = function(e) {
        e.stopPropagation();
        openTalkRefPanel(key, talkRefs);
      };

      // Place inside .verse-num, below the number
      var verseNum = verseDiv.querySelector('.verse-num');
      if (verseNum) {
        verseNum.appendChild(badge);
      } else {
        verseDiv.appendChild(badge);
      }
    });
  }

  /**
   * Opens a mini-panel showing which talks reference a verse.
   * Reuses the cross-reference panel structure.
   */
  function openTalkRefPanel(verseKey, talkRefs) {
    var panel = document.getElementById('xref-panel');
    if (!panel) return;

    var parts = verseKey.split('|');
    var displayRef = parts.length >= 3 ? parts[0] + ' ' + parts[1] + ':' + parts[2] : verseKey;

    panel.querySelector('.xref-panel-word').textContent = displayRef;
    panel.querySelector('.xref-panel-category').textContent =
      'Referenced in ' + talkRefs.length + ' Conference Talk' + (talkRefs.length > 1 ? 's' : '');

    var refsContainer = document.getElementById('xref-panel-refs');
    refsContainer.innerHTML = '';

    talkRefs.forEach(function(t) {
      var card = document.createElement('div');
      card.className = 'xref-ref-card';

      var titleDiv = document.createElement('div');
      titleDiv.className = 'xref-ref-title';
      titleDiv.style.cursor = 'pointer';
      titleDiv.innerHTML = '<span style="color:var(--accent);">\uD83C\uDF99\uFE0F</span> ' +
        '<span style="font-weight:600;">' + (t.title || 'Untitled') + '</span>' +
        '<span style="font-size:0.8em;color:var(--ink-light,#888);margin-left:8px;">' + (t.conference || '') + '</span>';
      titleDiv.onclick = function() {
        window.open('talks.html#' + t.talkId, '_blank');
      };
      card.appendChild(titleDiv);

      if (t.snippet) {
        var snippetDiv = document.createElement('div');
        snippetDiv.className = 'xref-ref-english';
        snippetDiv.style.fontStyle = 'italic';
        snippetDiv.textContent = t.snippet;
        card.appendChild(snippetDiv);
      }

      // Build talk URI for church website link
      var talkUri = '';
      if (window._oaksTalksData) {
        for (var ti = 0; ti < window._oaksTalksData.length; ti++) {
          if (window._oaksTalksData[ti].id === t.talkId) {
            talkUri = window._oaksTalksData[ti].uri || '';
            break;
          }
        }
      }

      // Build return URL so talks.html can link back to this verse
      var returnUrl = window.location.pathname;
      var returnLabel = displayRef;

      var linkDiv = document.createElement('div');
      linkDiv.style.cssText = 'padding:6px 0;font-size:0.85em;display:flex;gap:12px;flex-wrap:wrap;';
      var talkPageUrl = 'talks.html?from=' + encodeURIComponent(returnUrl) + '&verse=' + encodeURIComponent(verseKey) + '#' + t.talkId;
      var links = '<a href="' + talkPageUrl + '" target="_blank" style="color:var(--accent);text-decoration:none;">Read talk \u2192</a>';
      if (talkUri) {
        links += '<a href="https://www.churchofjesuschrist.org/study' + talkUri + '?lang=eng" target="_blank" style="color:var(--accent);text-decoration:none;">\uD83C\uDF10 churchofjesuschrist.org</a>';
      }
      linkDiv.innerHTML = links;
      card.appendChild(linkDiv);

      refsContainer.appendChild(card);
    });

    panel.scrollTop = 0;
    panel.classList.add('open');
  }

  // ── Expose talk ref functions globally ──
  window.addTalkRefMarkers = addTalkRefMarkers;
  window.openTalkRefPanel = openTalkRefPanel;

  // ── Auto-load talk refs after cross-refs ──
  setTimeout(addTalkRefMarkers, 1500);

})();
