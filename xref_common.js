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

  window.simpleStem = simpleStem;
  window.SWXref = { simpleStem: simpleStem };
})();
