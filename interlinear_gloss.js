/**
 * Shared interlinear gloss helpers for all Standard Works readers.
 * Used at render time so curated verse data is corrected site-wide.
 */
(function (global) {
  'use strict';

  /**
   * Add "from" when Hebrew has directional מִ/מִן/מֵ but the stored gloss omits it
   * (e.g. מִבְּנֵי אָדָם → "from the sons of" + "man", not just "the sons of").
   */
  function augmentGlossWithPrefixes(heb, gloss) {
    if (!gloss || !heb) return gloss;
    var g = String(gloss).trim();
    if (!g || /\bfrom\b/i.test(g)) return g;

    var h = String(heb).replace(/\u05C3/g, '');
    // Directional "from" is only unambiguous as explicit מִן־ or double-mem
    // מִמ (from + a mem-initial word, e.g. מִמִּצְרַיִם "from Egypt", מִמֶּנּוּ
    // "from him"). A bare מִ- is usually a root/preformative letter, not the
    // preposition (מִצְרַיִם "Egypt", מִשְׁפָּט "judgment", מִי "who"), so it
    // must NOT trigger "from".
    if (/^מִן/.test(h) || /^מִמ/.test(h)) return 'from ' + g;

    if (/^מֵ/.test(h)) {
      var bare = h.replace(/[\u0591-\u05C7]/g, '');
      // Idioms where מֵ is not directional "from"
      if (/^מאז/.test(bare) || /^מה/.test(bare)) return g;
      if (/^for[- ]/i.test(g)) return g.replace(/^for[- ]/i, 'from ');
      return 'from ' + g;
    }

    return g;
  }

  global.augmentGlossWithPrefixes = augmentGlossWithPrefixes;
})(typeof window !== 'undefined' ? window : global);
