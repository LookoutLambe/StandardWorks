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
    '\u05DE\u05E2\u05D5\u05DC\u05DD', '\u05DE\u05D7\u05D3\u05E9', '\u05DE\u05E8\u05D0\u05E9', '\u05DE\u05E2\u05E9\u05D5\u05EA',
    // mem-PREFORMATIVE nouns that themselves begin \u05DE\u05B4\u05DE- :
    // \u05DE\u05B4\u05DE\u05B0\u05E9\u05B7\u05C1\u05DC "reign", \u05DE\u05B4\u05DE\u05B0\u05DB\u05BC\u05B8\u05E8 "sale", \u05DE\u05B4\u05DE\u05B0\u05E1\u05B8\u05DA\u05BC "mixed wine"
    '\u05DE\u05DE\u05E9\u05DC', '\u05DE\u05DE\u05DB\u05E8', '\u05DE\u05DE\u05DB\u05E8\u05D5', '\u05DE\u05DE\u05DB\u05E8\u05D9\u05D5', '\u05DE\u05DE\u05DB\u05E8\u05EA', '\u05DE\u05DE\u05E9\u05D7', '\u05DE\u05DE\u05E1\u05DA', '\u05DE\u05DE\u05E9\u05E7'
  ]).forEach(function (w) { MEM_NOT_FROM[w] = 1; });

  function augmentGlossWithPrefixes(heb, gloss) {
    if (!gloss || !heb) return gloss;
    var g = String(gloss).trim();
    // "than" is the SAME mem in its comparative sense (מֵחֵלֶב "more than the fat"),
    // so a gloss carrying either word already accounts for the preposition.
    if (!g || /\b(from|than)\b/i.test(g)) return g;
    // A gloss that OPENS with "of" / "out of" / "off" is ALREADY rendering this
    // same mem, so prepending turns it into "from of your substance". Position
    // is what separates the two senses: a LEADING "of" is the preposition, a
    // trailing one is the construct chain ("the sons of"), which still needs
    // "from". Testing the start of the string keeps מִבְּנֵי אָדָם working while
    // fixing 1,232 tokens site-wide (527 BoM, 415 NT, 290 OT).
    // Hyphen-tolerant: this corpus stores the same gloss both as "out of Egypt"
    // and as "out-of-Egypt", and matching only the spaced form silently skips
    // most of it.
    if (/^(?:out[\s-]+of|off|of)\b/i.test(g)) return g;

    // THE MEM IS NOT ONLY DIRECTIONAL. It is also causal (מֵרֹב "because of the
    // greatness of"), agentive (מֵאֱלֹהִים "by God"), temporal (מֵעֵת "since"),
    // partitive, and simply lexicalised (מִמׇּחֳרָת "on the morrow",
    // מִמּוּל "over against", מִמִּזְרָח "on the east", מֵעַל "over").
    // Wherever the gloss ALREADY OPENS with one of these English function words
    // the translator has decided how this mem reads, and the renderer must not
    // overwrite that decision — "from on the morrow", "from because of the
    // greatness of", "from by God" are simply broken English.
    //
    // The words below are exactly those that cannot follow "from". The
    // directional adverbs that CAN — above, beyond, across, behind, within,
    // among, beneath, without, afar, whence, henceforth — are deliberately
    // absent, so "from above" and "from afar off" keep working.
    if (/^(?:on|by|because|for|to|in|at|with|upon|after|over|into|through|since|about|against|concerning)\b/i.test(g)) return g;

    // "above" / "beneath" are the LOCATIVE and COMPARATIVE senses of this mem
    // (מִמַּעַל … מִתָּחַת "in the heavens above and in the earth beneath";
    // מֵאֶחָיו "above his brethren"; מֵחֲבֵרֶךָ "above thy fellows"), and
    // prepending turns them into "from above his brethren". The translator
    // writes "from above" EXPLICITLY at the 31 sites that are directional, so a
    // bare "above" is a deliberate choice: 51 of 52 such tokens are locative or
    // comparative. (The one that was relying on the renderer, 3 Nephi 9:11
    // "I did send down fire", now stores "from above" like the other 31.)
    if (/^(?:above|beneath|below|underneath)\b/i.test(g)) return g;

    var h = String(heb).replace(/\u05C3/g, '');
    // Directional "from" is only unambiguous as explicit מִן־ or double-mem
    // מִמ (from + a mem-initial word, e.g. מִמִּצְרַיִם "from Egypt", מִמֶּנּוּ
    // "from him"). A bare מִ- is usually a root/preformative letter, not the
    // preposition (מִצְרַיִם "Egypt", מִשְׁפָּט "judgment", מִי "who"), so it
    // must NOT trigger "from".
    var bare = h.replace(/[\u0591-\u05C7]/g, '').replace(/־/g, '');

    /* מִמ IS NOT ALWAYS THE PREPOSITION. A mem-preformative noun can itself
       begin מִמ־ — מִמְשַׁל "reign", מִמְכָּר "sale", מִמְסָךְ "mixed wine",
       מִמְשַׁח, מִמְשַׁק — and מִמׇחֳרָת is the fixed idiom "on the morrow",
       not "from the morrow". MEM_NOT_FROM used to be consulted only by the מֵ
       branch below, so this one prepended "from" unconditionally and the READER
       saw "and thus began FROM the reign of the judges" at Mosiah 29:44 and
       29:47. Both branches now share the same escape. */
    if (/^מִן/.test(h) || /^מִמ/.test(h)) {
      if (/^ממחרת/.test(bare)) return g;
      if (MEM_NOT_FROM[bare]) return g;
      return 'from ' + g;
    }

    if (/^מֵ/.test(h)) {
      // Idioms where מֵ is not directional "from"
      if (/^מאז/.test(bare) || /^מה/.test(bare)) return g;
      if (MEM_NOT_FROM[bare]) return g;
      // (A rule here once rewrote a leading "for" into "from". It was wrong and
      // is gone: every מ + "for" gloss in the corpus is either CAUSAL — "for
      // want of food", "for fear of the law", "for joy", "for the multitude of
      // fishes" — or the COMPARATIVE mem after "too" — "too strong for me",
      // "nothing too hard for You", "too great for man". "from" fits none of
      // them, and the guard above now returns before this point anyway.)
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
