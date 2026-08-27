/**
 * xref_common.js — cross-reference helpers shared by every volume.
 *
 * bom.html and crossrefs_engine.js each carried their own stemmer, and they
 * were not the same algorithm. bom's was a single regex alternation with no
 * length guard and no protection for a doubled -ss, so it reduced "bless" to
 * "b", "waters" to "wat", "press" to "pres" and "faithful" to "faith".
 * Cross-reference keyword matching on the Book of Mormon page ran on those.
 *
 * The implementation below is the engine's, which is the correct one: it
 * applies at most one suffix rule, guards on length, and never strips the
 * second s of a doubled ending.
 *
 * parseScriptureRef is deliberately NOT here. Both copies are already
 * identical, so it causes no divergence, and it depends on the 66-entry
 * abbreviation map inside the engine's closure.
 */
(function() {
  'use strict';

  function simpleStem(w) {
    w = String(w || '').toLowerCase().replace(/[^a-z]/g, '');
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

  var LATIN_MARKER_ORDER = 'abcdefghijklmnopqrstuvwxyz';

  // Marker placement, grouping and ordering. These lived only in bom.html, which
  // is why its addCrossRefMarkers is twice the size of the engine's — the other
  // five volumes have no placement or grouping logic at all. All three are pure,
  // so they move without touching either page's DOM handling.

  function compareLatinMarker(a, b) {
        return LATIN_MARKER_ORDER.indexOf(a.marker) - LATIN_MARKER_ORDER.indexOf(b.marker);
      }

  function computeCrossRefPlacement(ref, xrefRefs) {
        if (!ref.text) return 0;
        var searchText = ref.text.toLowerCase().trim();
        var searchWords = searchText.split(/[\s-]+/);
        var searchStems = searchWords.map(simpleStem).filter(function(s) { return s.length >= 3; });
        var i, e, gl, gl2;
        for (i = 0; i < wordUnits.length; i++) {
          gl = glossList[i];
          if (!gl || gl.length < 2) continue;
          var isMatch = (gl === searchText) || (gl.indexOf(searchText) !== -1) || (gl.length >= 3 && searchText.indexOf(gl) !== -1);
          if (isMatch) return i;
        }
        if (searchStems.length > 0) {
          for (i = 0; i < wordUnits.length; i++) {
            gl2 = glossList[i];
            if (!gl2 || gl2.length < 2) continue;
            var glossWords = gl2.split(/[\s]+/);
            var glossStems = glossWords.map(simpleStem).filter(function(s) { return s.length >= 3; });
            var stemMatch = false;
            for (var si = 0; si < searchStems.length && !stemMatch; si++) {
              for (var gi = 0; gi < glossStems.length && !stemMatch; gi++) {
                if (glossStems[gi].indexOf(searchStems[si]) === 0 || searchStems[si].indexOf(glossStems[gi]) === 0) {
                  stemMatch = true;
                }
              }
            }
            if (stemMatch) return i;
          }
        }
        if (engWords.length > 0 && wordUnits.length > 0) {
          var engIdx = -1;
          for (e = 0; e < engWords.length; e++) {
            var ew = engWords[e].replace(/[.,;:!?'"()]/g, '');
            if (ew === searchText || ew.indexOf(searchText) !== -1 || searchText.indexOf(ew) !== -1) {
              engIdx = e;
              break;
            }
            var ewStem = simpleStem(ew);
            if (ewStem.length >= 3 && searchStems.some(function(ss) { return ewStem.indexOf(ss) === 0 || ss.indexOf(ewStem) === 0; })) {
              engIdx = e;
              break;
            }
          }
          if (engIdx !== -1) {
            var ratio = engIdx / Math.max(engWords.length, 1);
            return Math.min(Math.round(ratio * wordUnits.length), wordUnits.length - 1);
          }
        }
        var denom = Math.max(xrefRefs.length, 1);
        return Math.round((xrefRefs.indexOf(ref) / denom) * (wordUnits.length - 1));
      }

  function mergeCrossRefGroup(group) {
        var sorted = group.slice().sort(compareLatinMarker);
        var merged = {
          marker: sorted[0].marker,
          text: sorted.map(function(r) { return r.text; }).filter(Boolean).join('; '),
          refs: [],
          category: 'cross-ref'
        };
        sorted.forEach(function(r) {
          (r.refs || []).forEach(function(x) { merged.refs.push(x); });
        });
        return merged;
      }

  window.simpleStem = simpleStem;
  window.compareLatinMarker = compareLatinMarker;
  window.computeCrossRefPlacement = computeCrossRefPlacement;
  window.mergeCrossRefGroup = mergeCrossRefGroup;
  window.SWXref = { simpleStem: simpleStem, compareLatinMarker: compareLatinMarker,
                    computeCrossRefPlacement: computeCrossRefPlacement,
                    mergeCrossRefGroup: mergeCrossRefGroup };
})();
