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
  // Consonantal forms that open with \u05DE\u05B5 where the mem is a ROOT letter or the
  // hifil participial preformative \u2014 never the preposition "from". Without this
  // list a bare ^\u05DE\u05B5 test mis-glosses ~1,000 tokens site-wide ("from testifying"
  // for \u05DE\u05B5\u05E2\u05B4\u05D9\u05D3, "from an hundred" for \u05DE\u05B5\u05D0\u05B8\u05D4, "from dead" for \u05DE\u05B5\u05EA).
  var MEM_NOT_FROM = {};
  ([
    // \u05DE\u05B5\u05D0\u05B8\u05D4 "hundred"
    '\u05DE\u05D0\u05D4', '\u05DE\u05D0\u05D5\u05EA', '\u05DE\u05D0\u05D4\u05D0\u05DC\u05E3',
    // root \u05DE\u05D5\u05EA "to die"
    '\u05DE\u05EA', '\u05DE\u05EA\u05D4', '\u05DE\u05EA\u05D5', '\u05DE\u05EA\u05D9\u05DD', '\u05DE\u05EA\u05D9', '\u05DE\u05EA\u05D9\u05D5', '\u05DE\u05EA\u05D9\u05D4', '\u05DE\u05EA\u05D9\u05D4\u05DD', '\u05DE\u05EA\u05D9\u05DB\u05DD', '\u05DE\u05EA\u05D9\u05E0\u05D5',
    // construct of \u05DE\u05B7\u05D9\u05B4\u05DD "waters"
    '\u05DE\u05D9', '\u05DE\u05D9\u05DE\u05D9', '\u05DE\u05D9\u05DE\u05D9\u05D5', '\u05DE\u05D9\u05DE\u05D9\u05D4', '\u05DE\u05D9\u05E8\u05D0\u05E9',
    // \u05DE\u05B5\u05E2\u05B6\u05D4 "bowels"
    '\u05DE\u05E2\u05D9', '\u05DE\u05E2\u05D9\u05D5', '\u05DE\u05E2\u05D9\u05D4', '\u05DE\u05E2\u05D9\u05DA', '\u05DE\u05E2\u05D9\u05DB\u05DD', '\u05DE\u05E2\u05D9\u05E0\u05D5',
    // root \u05DE\u05D0\u05DF "to refuse"
    '\u05DE\u05D0\u05DF', '\u05DE\u05D0\u05E0\u05D4', '\u05DE\u05D0\u05E0\u05D5', '\u05DE\u05D0\u05E0\u05EA', '\u05DE\u05D0\u05E0\u05EA\u05DD',
    // hifil participles of II-vav/yod and geminate roots
    '\u05DE\u05D1\u05D9\u05D0', '\u05DE\u05D1\u05D9\u05D0\u05D4', '\u05DE\u05D1\u05D9\u05D0\u05D9\u05DD', '\u05DE\u05D1\u05D9\u05DF', '\u05DE\u05D1\u05D9\u05E0\u05D4', '\u05DE\u05D1\u05D9\u05E0\u05D9\u05DD', '\u05DE\u05D1\u05D9\u05E9',
    '\u05DE\u05E2\u05D9\u05D3', '\u05DE\u05E2\u05D9\u05D3\u05D4', '\u05DE\u05E2\u05D9\u05D3\u05D9\u05DD', '\u05DE\u05E9\u05D9\u05D1', '\u05DE\u05E9\u05D9\u05D1\u05D4', '\u05DE\u05E9\u05D9\u05DD', '\u05DE\u05E7\u05D9\u05DD', '\u05DE\u05E7\u05D9\u05DE\u05D4',
    '\u05DE\u05DB\u05D9\u05DF', '\u05DE\u05DB\u05D9\u05E0\u05D4', '\u05DE\u05E1\u05D9\u05E8', '\u05DE\u05E1\u05D9\u05E8\u05D4', '\u05DE\u05E1\u05D1', '\u05DE\u05E1\u05D1\u05D9\u05DD', '\u05DE\u05E1\u05D9\u05EA', '\u05DE\u05D7\u05DC',
    '\u05DE\u05D9\u05D8\u05D9\u05D1', '\u05DE\u05E0\u05D9\u05E3', '\u05DE\u05D0\u05D9\u05E8', '\u05DE\u05D0\u05D9\u05E8\u05D4', '\u05DE\u05E2\u05D9\u05E8', '\u05DE\u05D9\u05E0\u05D9\u05E7\u05EA', '\u05DE\u05D9\u05E0\u05D9\u05E7\u05EA\u05D9\u05DA', '\u05DE\u05DC\u05D9\u05E5', '\u05DE\u05DC\u05D9\u05E6\u05D4',
    // nouns/adjectives with a mem preformative
    '\u05DE\u05D9\u05E9\u05E8\u05D9\u05DD', '\u05DE\u05D9\u05D8\u05D1', '\u05DE\u05E8\u05E2',
    // proper names
    '\u05DE\u05D9\u05E9\u05DA', '\u05DE\u05D9\u05D3\u05D1\u05D0',
    // idioms whose curated gloss already carries the directional sense
    '\u05DE\u05E2\u05D5\u05DC\u05DD', '\u05DE\u05D7\u05D3\u05E9', '\u05DE\u05E8\u05D0\u05E9', '\u05DE\u05E2\u05E9\u05D5\u05EA'
  ]).forEach(function (w) { MEM_NOT_FROM[w] = 1; });

  function augmentGlossWithPrefixes(heb, gloss) {
    if (!gloss || !heb) return gloss;
    var g = String(gloss).trim();
    // "than" is the SAME mem in its comparative sense (מֵחֵלֶב "more than the fat"),
    // so a gloss carrying either word already accounts for the preposition.
    if (!g || /\b(from|than)\b/i.test(g)) return g;

    var h = String(heb).replace(/\u05C3/g, '');
    // Directional "from" is only unambiguous as explicit מִן־ or double-mem
    // מִמ (from + a mem-initial word, e.g. מִמִּצְרַיִם "from Egypt", מִמֶּנּוּ
    // "from him"). A bare מִ- is usually a root/preformative letter, not the
    // preposition (מִצְרַיִם "Egypt", מִשְׁפָּט "judgment", מִי "who"), so it
    // must NOT trigger "from".
    if (/^מִן/.test(h) || /^מִמ/.test(h)) return 'from ' + g;

    if (/^מֵ/.test(h)) {
      var bare = h.replace(/[\u0591-\u05C7]/g, '').replace(/־/g, '');
      // Idioms where מֵ is not directional "from"
      if (/^מאז/.test(bare) || /^מה/.test(bare)) return g;
      if (MEM_NOT_FROM[bare]) return g;
      if (/^for[- ]/i.test(g)) return g.replace(/^for[- ]/i, 'from ');
      return 'from ' + g;
    }

    return g;
  }

  /**
   * Append a .word-group to a word-flow / heading-flow, with a real space
   * between it and the previous group.
   *
   * ONE home, because there are FOUR builders that make these rows: verses
   * and chapter summaries in the shared engine (reader_core.js renderWords,
   * reader_ui.js heading loop) and again in bom.html, which carries its own
   * inline copy of the reader engine and does not load reader_core.js at all.
   * Writing the same three lines into all four is exactly the duplication
   * that keeps forcing every shared fix to be made twice.
   *
   * The space is what makes justification possible: text-align:justify
   * distributes slack into soft-wrap opportunities, and the groups used to be
   * emitted flush against each other, so there were none and the rows stayed
   * ragged. It also replaces the flex column-gap, which block layout cannot
   * use. See the JUSTIFIED ROWS block in reader.css.
   */
  function appendWordGroup(container, group) {
    if (!container || !group) return;
    if (container.lastChild) container.appendChild(document.createTextNode(' '));
    container.appendChild(group);
  }

  global.augmentGlossWithPrefixes = augmentGlossWithPrefixes;
  global.appendWordGroup = appendWordGroup;
})(typeof window !== 'undefined' ? window : global);
