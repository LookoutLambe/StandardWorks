/**
 * read_aloud.js — the chapter read aloud, a phrase at a time, with the word
 * being spoken highlighted in the interlinear.
 *
 * There is no audio here and nothing is hosted. The Hebrew voice (Carmit,
 * he-IL) ships with macOS and iOS and is reachable from the browser through
 * the Web Speech API, so the whole feature is text in and boundary events
 * out. What the corpus supplies is everything the engine cannot work out for
 * itself, which is most of what makes Hebrew readable aloud.
 *
 * THREE THINGS THE ENGINE GETS WRONG, AND WHAT THIS FILE DOES ABOUT THEM
 *
 * 1. THE NAME. `יְהוָה` is not vowelled with its own vowels; it carries
 *    אֲדֹנָי's, as a standing instruction to say Adonai. Read literally the
 *    engine produces "Yehova" — the medieval misreading that gave us
 *    "Jehovah". So the spoken form is substituted and the displayed form is
 *    untouched, which is precisely the qere the pointing was encoding.
 *    Where the Masoretes pointed it with Elohim's vowels (`יְהוִה`, six
 *    times in this volume) the substitution is אֱלֹהִים instead.
 *
 * 2. PHRASING. A pause after every word is staccato; a pause every N words
 *    cuts through clauses. Biblical Hebrew announces its clause boundaries
 *    and this corpus records the announcements twice over — the connective
 *    is named in the English gloss ("therefore", "and yet"), and the
 *    waw-consecutive is visible in the Hebrew itself. Break there.
 *
 * 3. THE CONSTRUCT CHAIN, which forbids a break. A gloss ending in "of" is
 *    a construct and binds absolutely to what follows: splitting
 *    `בְּכׇל־מוּסַר | אָבִי` ("in all the learning of | my father") is the
 *    single most audible way to get this wrong.
 *
 * Rate is a synthesiser setting, not a post-process. Slowing playback by
 * resampling also drops the pitch and turns Carmit into a man; the `rate`
 * property slows the synthesis itself and leaves the voice alone.
 */
(function () {
  'use strict';

  /* SPEED IS A MULTIPLIER OF THE BROWSER'S DEFAULT, and the browser's default
     is faster than the command line's. Measured on 1 Nephi 1:1 — 36 words,
     six clauses, the same 420ms gaps throughout — the browser at 0.75 runs
     20.2s against 25.6s for the rendered file at the pace we settled on, so
     0.75 here is NOT the 75% we tuned by ear. The scale is also compressed at
     the low end, so the choice belongs to the reader rather than to a
     constant: the chip beside the button cycles it and the choice sticks. */
  /* Slowest first, so the default is the head of the cycle and tapping only
     ever speeds up. 0.3 is where this was tuned by ear against the rendered
     file, and the default is the setting almost every reader will keep. */
  var SPEEDS = [0.3, 0.4, 0.5, 0.6, 0.75];
  var RATE = 0.3;           // the default; overridden by the stored choice
  var PHRASE_GAP = 420;     // ms of silence at a full stop
  /* A COMMA IS NOT A FULL STOP. The Book of Mormon's breaks are carried
     across from the printed English, which marks both — "having been born of
     goodly parents, therefore I was taught ... my father;" — and reading the
     comma and the semicolon at the same length flattens the sentence into a
     list. The Old Testament's te'amim entries are all full stops and the
     rules produce nothing else, so only the weighted entries use this. */
  var COMMA_GAP = 240;

  /* SPEECH THAT DOES NOT MOVE IS NOT SPEECH. Every phrase was going out at the
     same pitch and the same rate, which is what "monotone" means literally —
     the reader was correct and it was not a matter of taste.
     Web Speech gives pitch and rate PER UTTERANCE and nothing finer, and this
     reader already speaks one phrase per utterance, so the contour can be
     drawn phrase by phrase, which is the level a sentence's intonation lives
     at anyway:
       DECLINATION  a sentence drifts downward as it goes — each phrase a
                    little lower than the one before, which is what makes a
                    long verse sound like one sentence and not a list
       CONTINUATION a phrase that ends on a comma stays UP, because the
                    sentence is not finished and the voice says so
       FINALITY     the last phrase of a sentence drops and slows, which is
                    the strongest cue in speech that a thought has landed */
  var PITCH_TOP  = 1.06;   /* where a sentence starts */
  var PITCH_STEP = 0.03;   /* how far it falls per phrase */
  var PITCH_MIN  = 0.94;   /* ... and no further, mid-sentence */
  var PITCH_END  = 0.88;   /* the drop on the phrase that ends it */
  var RATE_END   = 0.92;   /* final lengthening, as a factor of the rate */
  var MAX_PHRASE = 9;       // words: the cap is a last resort, not routine
  /* A BREATH GROUP HAS A FLOOR. Biblical narrative is one long chain of
     wayyiqtols — "and he came, and he saw, and he heard" — so breaking at
     every link shreds a verse into one- and two-word fragments: 1 Nephi 1:6
     came out in seven pieces, two of them a single word. A clause opener only
     starts a new group once the current one is a phrase in its own right. */
  var MIN_PHRASE = 4;

  try {
    var stored = parseFloat(localStorage.getItem('sw-read-rate'));
    if (stored > 0) RATE = stored;
  } catch (e) {}

  /* WHERE A PHRASE ENDS, MEASURED RATHER THAN GUESSED.
   *
   * The te'amim are a punctuation system: every Masoretic accent is either
   * disjunctive (break after this word) or conjunctive (bind it forward).
   * The Tanakh is fully accented, so the question "where does a phrase end"
   * has 283,561 worked examples in it. tools/build_phrase_map.py counts them.
   *
   * Across those, 22.1% of non-verse-final words carry a rank<=2 disjunctive.
   * That is the baseline every rule below is measured against — the share of
   * cases that really are a break when the NEXT word is of this shape:
   *
   *     וְעַתָּה           97.3%   lift 4.41x
   *     לָכֵן             96.8%        4.39x
   *     וַיְהִי           93.4%        4.23x
   *     יַעַן             93.1%        4.22x
   *     וְאַף             85.0%        3.85x
   *     פֶּן              82.7%        3.75x
   *     כִּי              81.9%        3.71x
   *     הִנֵּה            79.3%        3.60x
   *     any wayyiqtol     79.0%        3.58x
   *
   * Everything below is left alone, because near chance is not a rule:
   * אֲשֶׁר 46%, עַתָּה 44%, אַף 40%.
   *
   * A PLAIN WAW IS NOT A BREAK, and this is where the first attempt went
   * wrong in both directions. Taken flat it looks like one — 57.8%, nearly
   * three times chance — so the rule was added, and it promptly split "a
   * goodly father AND a goodly mother". The WLC's morphology tags say why:
   *
   *     וְ + verb    70.2%      וְ + noun       48.2%
   *     וְ + pronoun 86.0%      וְ + adjective  36.5%
   *
   * A waw before a verb opens a clause; a waw before a noun coordinates
   * inside one. The reader has no morphology to tell them apart, so the
   * blanket rule is dropped and only the waw-consecutive — which IS
   * detectable, by its patach — is kept.
   *
   * These BIND. They follow a break LESS often than chance, which is the
   * construct chain showing up in the measurement:
   *
   *     אֵת / אֶת         17.9%   lift 0.81x
   *     כֹּל / כׇּל       15.8%        0.72x
   */
  var BREAK_BEFORE = [
    /^וְעַתָּה/, /^לָכֵן/, /^עַל־?כֵּן/, /^וַיְהִי/, /^יַעַן/,
    /^וְאַף/, /^פֶּן/, /^כִּי/, /^ו?ְ?הִנֵּה/,
    /^ו[ַָ][איתנ]/               /* the waw-consecutive */
  ];
  /* Below chance: these bind to what precedes them. */
  var BINDS_HEB = [/^אֵת/, /^אֶת/, /^כׇּל/, /^כָּל/];
  /* A gloss ending in "of" is the construct chain, which no accent may split
     — and the same is true of any preposition governing what follows. Gen 1:9
     was coming out "…the waters UNDER | THE HEAVENS…" because "under" was not
     on this list. */
  var BINDS = /\b(of|in|to|unto|with|from|upon|on|all|the|a|under|over|before|after|against|among|between|into|through|beneath|above|beside|toward|towards|about|and)$/i;

  /* THE SPOKEN FORM, WHICH IS NOT THE WRITTEN ONE. Every rule here is a case
     where reading the letters as they stand produces something no Hebrew
     speaker says, and in every one the DISPLAY IS LEFT EXACTLY AS IT IS. */
  var SUBST = [
    [/יְהוָה/g, 'אֲדֹנָי'],     /* the Name: pointed for Adonai, so say Adonai */
    [/יְהוִה/g, 'אֱלֹהִים']     /* ... and for Elohim where it is pointed so   */
  ];

  /* ־ָיו IS SAID "-av": elav, alav, lefanav, banav, kol-yamav. The yod is not
     sounded and the vav is a consonant, and Carmit gets both wrong from the
     pointed spelling — בָּנָיו came out "banaiyu", and dropping the yod alone
     only moved it to "banau", because קָו-shaped qamats+vav reads to her as a
     vowel.

     So the substitution is the one the Name already uses: give her a DIFFERENT
     WORD to say, not a patched spelling. These are ordinary modern Hebrew
     words — אליו, עליו, לפניו, אחריו, ימיו, בניו, דבריו — and unpointed is the
     form she has them in, so the points come off the whole word and she reads
     it as the word it is, and ONLY that half of a maqqef compound.

     Scoped to words that actually carry the suffix. Stripping the pointing off
     the corpus at large would be a different and much worse idea: the pointing
     is what tells הִנֵּה "behold" from הֵנָּה "hither". */
  var YAV = /\u05B8\u05D9\u05D5$/;
  /* BOTH OF THE /o/ SIGNS SHE DOES NOT KNOW. U+05C7 is the explicit qamats
     qatan and U+05B3 is the hataf qamats — חֳדָשִׁים, עֳנִי, מׇרְדֳּכַי — and
     both are an /o/ that she reads as an /a/. Transcribed: רַב־עֳנִי comes
     back "rav ani", and with a holam on it "rav oni". 14,118 words carry the
     first and 1,013 the second. A holam is the same sound and she reads it. */
  var QATAN = /[\u05C7\u05B3]/g;
  var POINTS = /[\u0591-\u05BD\u05BF-\u05C7]/g;   /* NOT U+05BE, the maqqef */

  /* SAY IT LIKE THIS — and only where the pointing has been PROVED to fail.
     THE POINTING IS THE INFORMATION. It is what says the qamats on צִוִּיתִיךָ
     is an /a/, so the word ends "-kha" and not "-k". An override throws all of
     that away and has to rebuild the vowels out of letters, and every attempt
     to do that made things worse, not better: a plene ־כה came back as a chet,
     "ויטיחה"; writing the dagesh's doubling out turned צִוָּה into "tivisii".
     Both are reverted. The 44-form צוה table went with them — it was written
     to fix damage the doubling rule had done, and the revert had already
     fixed it.

     So this table is small on purpose, and everything in it earned its place
     by being heard: כׇּל read as "cli" pointed, and reads as "kol" spelled
     כול. That is the whole bar. */
  var SAY_AS = {
    '\u05DB\u05C7\u05BC\u05DC': '\u05DB\u05D5\u05DC',   /* כׇּל -> כול */
    '\u05DB\u05B8\u05BC\u05DC': '\u05DB\u05D5\u05DC',   /* כָּל -> כול */

    /* SARIAH ENDS ON AN AYIN FOR THE VOICE (translator's suggestion). The
       final ־ָה of שְׂרָיָה is a mater — the he is not sounded and the word
       ends "-yah" — but she sounds it, and the name came out "sa-rai-ya-HA",
       a syllable too long. An ayin is silent in modern Hebrew and carries the
       same qamats, so the vowel survives and the consonant does not. Nothing
       else changes: the pointing stays exactly as the corpus writes it. */
    '\u05D5\u05BC\u05E9\u05B0\u05C2\u05E8\u05B8\u05D9\u05B8\u05D4':
      '\u05D5\u05BC\u05E9\u05B0\u05C2\u05E8\u05B8\u05D9\u05B8\u05E2',   /* וּשְׂרָיָה -> וּשְׂרָיָע */
    '\u05DC\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D9\u05B8\u05D4':
      '\u05DC\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D9\u05B8\u05E2',   /* לִשְׂרָיָה -> לִשְׂרָיָע */
    '\u05E9\u05B0\u05C2\u05E8\u05B8\u05D9\u05B8\u05D4':
      '\u05E9\u05B0\u05C2\u05E8\u05B8\u05D9\u05B8\u05E2',   /* שְׂרָיָה -> שְׂרָיָע */
  };

  /* UNPOINTING IS NOT JUST DELETING THE POINTS. Modern Hebrew spells without
     them, and it pays for that by writing some vowels as letters — ktiv male.
     Take the points off אֱלֹהָיו and you get אלהיו, which is nobody's spelling
     of "his God": the word is אלוהיו, the vav carrying the holam that was on
     the ל. Carmit reads what is written, so the letter has to be put back.

     THE WHOLE DIFFICULTY IS THE VAV, because it is three things. It is the
     consonant /v/; it is the vowel /o/ (holam male, וֹ); and it is the vowel
     /u/ (shuruk, וּ). Unpointed, ktiv male tells them apart by DOUBLING the
     consonant — מצווה, not מצוה — and the pointing says which is which:

        the vav is a CONSONANT when the letter before it carries a vowel of
        its own, because that letter's syllable is already closed
            מִצְוֹתָיו   צ has a sheva   ->  מצוותיו   mitzvotav
        the vav is a VOWEL when the letter before it has none, because it is
        that letter's vowel
            בְנוֹתָיו    נ has nothing   ->  בנותיו    benotav
            צְבָאוֹתָיו  א has nothing   ->  צבאותיו   tsivotav

     Doubling every holam-vav gets the first right and the other two wrong —
     צבאוותיו, בנוותיו. A vav carrying any other vowel is always a consonant;
     one at the head of a word never doubles (וְאֶחָיו is ואחיו, not וואחיו).
     A holam or qibbuts on any other letter simply gains its vav. */
  var LETTER = /[\u05D0-\u05EA]/;
  var MARK   = /[\u0591-\u05C7]/;
  var VOWEL  = /[\u05B0-\u05BB\u05C7]/;      /* sheva through qibbuts, and qatan */
  var HOLAM  = /[\u05B9\u05BA]/;
  var DAGESH = '\u05BC';

  function units(w) {                      /* a letter and the marks upon it */
    var out = [], i = 0;
    while (i < w.length) {
      if (!LETTER.test(w[i])) { i++; continue; }
      var j = i + 1;
      while (j < w.length && MARK.test(w[j])) j++;
      out.push([w[i], w.slice(i + 1, j)]);
      i = j;
    }
    return out;
  }

  function ktivMale(w) {
    var u = units(w), out = '';
    for (var i = 0; i < u.length; i++) {
      var ch = u[i][0], m = u[i][1];
      var prevVowel = i > 0 && VOWEL.test(u[i - 1][1]);
      if (ch === '\u05D5') {                                   /* a vav */
        if (i === 0) out += ch;                               /* וְ, וּ: never doubles */
        else if (m.indexOf('\u05BA') >= 0) out += '\u05D5\u05D5';  /* always consonantal */
        else if (HOLAM.test(m) || m === DAGESH || m === '')
          out += prevVowel ? '\u05D5\u05D5' : '\u05D5';        /* vowel, or consonant + it */
        else out += '\u05D5\u05D5';                            /* any other vowel: /v/ */
      } else if (HOLAM.test(m) || m.indexOf('\u05BB') >= 0) {
        out += ch + '\u05D5';                                  /* holam or qibbuts gains a vav */
      } else {
        out += ch;
      }
    }
    return out;
  }

  /* WRITING THE DOUBLING OUT MADE IT WORSE, AND IT IS REVERTED (1adb35d9).
     The reasoning was sound and the result was not. וַיְצַוֵּהוּ is
     "vaytsavvehu" and the וֵּ really is a doubled consonantal /v/ — a shuruk
     carries no other vowel — so the vav became two and the dagesh went. But
     the words that rule touched came out GARBLED, not merely wrong:
     transcribed, צִוָּה is "צי ו" as written and "תי וב" with the doubling
     written out, and the translator heard the same thing — "garbled like
     tivisii". 1,861 words, made worse by a change I shipped on the strength
     of one rendered file sounding better to me.

     The lesson is the one this whole day keeps teaching: a transform that is
     phonetically correct on paper still has to be HEARD before it ships, and
     "the consonants came back right" is not hearing it, because Hebrew ASR
     writes unpointed and cannot show a vowel. */

  /* A WORD-FINAL BARE VAV IS THE CONSONANT /v/ and she reads it as a vowel:
     וַיְצַו came out "vayetsao". It closes the syllable — vay-TSAV — and the
     tell is the letter before it, which carries a vowel of its own. 807 words
     end this way and three forms are 59% of them: יַחְדָּו, וַיְצַו, עֵשָׂו. */
  var SAY_BARE = {
    '\u05D9\u05D7\u05D3\u05D5': '\u05D9\u05D7\u05D3\u05D9\u05D5',   /* יחדו -> יחדיו  yachdav */
    '\u05E2\u05E9\u05D5': '\u05E2\u05E9\u05D9\u05D5'                  /* עשו  -> עשיו   Esav    */
  };

  /** does this word end in a consonantal vav — one with no vowel of its own,
      after a letter that has one? */
  function endsInV(w) {
    var u = units(w);
    if (u.length < 2) return false;
    var last = u[u.length - 1];
    return last[0] === '\u05D5' && last[1] === '' && VOWEL.test(u[u.length - 2][1]);
  }

  /** the form to SPEAK for a word — never the form to show */
  function spoken(heb) {
    var s = heb;
    for (var i = 0; i < SUBST.length; i++) s = s.replace(SUBST[i][0], SUBST[i][1]);
    /* WORD BY WORD, NOT TOKEN BY TOKEN. כׇּל־יָמָיו is one token and two words
       needing different treatment: the first is looked up, the second goes to
       ktiv male. Unpointing the pair together took the qamats qatan off כׇּל
       and lost "kol" altogether.
       The maqqef becomes a SPACE for the voice: it joins two words that are
       still pronounced as two, and a hyphen inside a word is one more thing
       for a synthesiser to get wrong. */
    s = s.replace(/[\[\]()]/g, '');      /* a qere's brackets are not said */
    var parts = s.split('\u05BE');
    for (var k = 0; k < parts.length; k++) {
      if (SAY_AS[parts[k]]) { parts[k] = SAY_AS[parts[k]]; continue; }
      /* THE QAMATS QATAN IS AN /o/ AND SHE READS IT AS AN /a/. This corpus
         marks it with the explicit U+05C7 rather than leaving it to be
         guessed from a plain qamats — which is the right call for a reader
         and the wrong one for a synthesiser, because U+05C7 is a rare
         codepoint she does not know and falls back on. חׇכְמָה came out
         "chachma", וַיָּמׇת "vayyamat", יָרׇבְעָם "Yarav'am". 14,118 words
         across the six volumes.
         A holam is the same sound and she reads it, so she gets a holam.
         The spelling that produces is the ordinary one — כׇּל becomes כֹּל,
         which is how the Tanakh writes that word anyway. */
      parts[k] = parts[k].replace(QATAN, '\u05B9');
      /* THE SHEVA IN A WEAK WAYYIQTOL. וַיְהִי is "vay-HI" and she read it
         "vehi", losing the yod: transcribed as והיא every one of the five
         times it occurs in 1 Nephi 1. It is not the waw-consecutive itself —
         וַיֹּאמֶר, where the yod carries a dagesh, comes back right. It is the
         SHEVA under the yod, which the weak verbs take: וַיְהִי, וַיְדַבֵּר,
         וַיְצַו, 4,677 words. That sheva is a sheva NA, a real if very short
         vowel, and writing it as the segol it sounds like is enough — וַיֶּהִי
         transcribes correctly where וַיְהִי does not. */
      parts[k] = parts[k].replace(/^\u05D5\u05B7\u05D9\u05B0/, '\u05D5\u05B7\u05D9\u05B6');
      if (YAV.test(parts[k])) { parts[k] = ktivMale(parts[k]); continue; }
      if (endsInV(parts[k])) {
        var bare = parts[k].replace(POINTS, '');
        for (var b in SAY_BARE) {
          if (bare.length >= b.length && bare.slice(-b.length) === b) {
            bare = bare.slice(0, -b.length) + SAY_BARE[b]; break;
          }
        }
        parts[k] = bare;
        continue;
      }
    }
    return parts.join(' ');
  }

  /** does this word open a clause? (measured — see the table above) */
  function opensClause(heb) {
    if (bindsBack(heb)) return false;
    for (var i = 0; i < BREAK_BEFORE.length; i++) {
      if (BREAK_BEFORE[i].test(heb)) return true;
    }
    return false;
  }
  /** the object marker and כל bind to what precedes; never break before them */
  function bindsBack(heb) {
    for (var i = 0; i < BINDS_HEB.length; i++) if (BINDS_HEB[i].test(heb)) return true;
    return false;
  }

  /* THE KETIV IS NOT READ. WHERE THE MASORETES FOUND THE WRITTEN TEXT AND THE
     READ TEXT DIVERGING they preserved both: the ketiv, what the consonants
     say, and the qere, what the reader says instead. This corpus keeps the
     pair, and marks them the way a printed Tanakh does — the ketiv in
     parentheses and UNPOINTED, because there is no way to say it; the qere in
     brackets, with the vowels on it. 713 and 850 of them.

     So a voice must skip every parenthesised ketiv, or it says each of those
     verses twice over. Both conditions are needed: the parentheses AND the
     absence of pointing. A parenthetical that IS pointed is ordinary text —
     the Book of Mormon has asides like "(לְמַעַן ... בָּם)" — and is read.

     THE SAME TEST IS IN tools/build_phrase_breaks.py, because the break
     positions count speakable words: if one side skips a word and the other
     does not, every break after it in that verse lands one word out. */
  var KETIV = /^\(.*\)$/;
  function ketiv(heb) {
    return KETIV.test(heb || '') && !/[\u05B0-\u05BB\u05BD\u05BF\u05C1\u05C2\u05C7]/.test(heb);
  }

  /** true for anything with nothing to say: punctuation, and the ketiv */
  function silent(heb) { return !/[א-ת]/.test(heb || '') || ketiv(heb); }

  /**
   * Group a verse's word-units into clauses.
   * Returns an array of arrays of elements.
   */
  function phrases(units, verseKey) {
    /* THE MASORETES ANSWER FIRST. For the Old Testament this text IS the
       Masoretic Text, and where it breathes was marked a thousand years ago.
       tools/build_phrase_breaks.py aligns the corpus against the accented
       WLC and ships the break positions for 21,838 of the Tanakh's 23,204
       verses — 94.1%. Where an entry exists the rules do not run at all;
       where it does not (a versification or spelling divergence, and no
       other volume has any entry at all) they do. */
    var exact = verseKey && window.SW_BREAKS && window.SW_BREAKS[verseKey];
    var out = [], cur = [], k;
    if (exact && exact.length) {
      /* AN ENTRY IS EITHER A BARE INDEX OR AN [index, weight] PAIR. The
         Tanakh's are bare — every disjunctive accent that ships is a
         division of the verse or of its half, so every one is a full stop.
         The Book of Mormon's carry the weight of the English mark they came
         from, 1 for a comma and 2 for a stop. */
      var speakable = [];
      for (k = 0; k < units.length; k++) {
        if (!silent(units[k].getAttribute('data-h') || '')) speakable.push(units[k]);
      }
      var from = 0;
      for (k = 0; k < exact.length; k++) {
        var at = exact[k], w = 2;
        if (at && at.length) { w = at[1]; at = at[0]; }
        if (at >= from && at < speakable.length - 1) {
          cur = speakable.slice(from, at + 1);
          cur.gap = w === 1 ? COMMA_GAP : PHRASE_GAP;
          cur.stop = (w !== 1);
          out.push(cur);
          from = at + 1;
        }
      }
      if (from < speakable.length) out.push(speakable.slice(from));
    }

    if (!out.length) {
      cur = [];
      units.forEach(function (el, i) {
        var heb = el.getAttribute('data-h') || '';
        var gloss = (el.querySelector('.gl') || {}).textContent || '';
        if (i > 0 && cur.length >= MIN_PHRASE && opensClause(heb)) {
          out.push(cur); cur = [];
        }
        if (silent(heb)) return;
        cur.push(el);
        /* the gloss carries the English punctuation; a comma there is a real
           boundary the connectives would otherwise miss */
        if (/[,;:—]\s*$/.test(gloss) && cur.length >= MIN_PHRASE) {
          cur.stop = /[;:.]\s*$/.test(gloss); out.push(cur); cur = [];
        }
      });
      if (cur.length) out.push(cur);
    }

    /* A fronted object opens a clause with nothing to announce it — the
       te'amim would mark it, and this corpus has no accents. Cap the length
       and split at a word that neither continues a phrase nor breaks a
       construct. */
    var split = [];
    out.forEach(function (p) {
      if (p.length <= MAX_PHRASE) { split.push(p); return; }
      var mid = Math.floor(p.length / 2), best = -1;
      for (var d = 0; d < p.length && best < 0; d++) {
        var cands = [mid + d, mid - d];
        for (var k = 0; k < 2; k++) {
          var j = cands[k];
          if (j <= 0 || j >= p.length) continue;
          if (bindsBack(p[j].getAttribute('data-h') || '')) continue;
          var prevGloss = (p[j - 1].querySelector('.gl') || {}).textContent || '';
          if (BINDS.test(prevGloss.replace(/[,;:—]\s*$/, '').trim())) continue;
          best = j; break;
        }
      }
      if (best < 0) { split.push(p); return; }
      var head = p.slice(0, best), tail = p.slice(best);
      head.gap = COMMA_GAP;              /* a cap is a breath, not a stop */
      head.stop = false;
      tail.gap = p.gap;
      tail.stop = p.stop;
      split.push(head, tail);
    });
    return split;
  }

  /* ---- the voice ------------------------------------------------------ */

  var _voice = null;
  function hebrewVoice() {
    if (_voice) return _voice;
    var vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    for (var i = 0; i < vs.length; i++) {
      if (/^he\b|^he-/i.test(vs[i].lang)) { _voice = vs[i]; return _voice; }
    }
    return null;
  }

  /* ---- styles, injected: this component owns its own look, the way the
          root scorecard does, so reader.css stays out of it ------------- */

  function ensureStyle() {
    if (document.getElementById('ra-style')) return;
    var s = document.createElement('style');
    s.id = 'ra-style';
    /* --highlight is the theme's own wash, built to read the same in Light,
       Sepia and Dark; --here is its accent. A bright accent is a MARK, never
       a fill, so the word gets the wash plus a rule under it rather than a
       block of colour. (--sw-gold is NOT gold here: it resolves to #F3EDE2,
       a near-white, and a fill from it is invisible.) */
    s.textContent =
      '.ra-speaking{background:var(--highlight,rgba(0,0,0,.08));border-radius:4px;' +
      'box-shadow:inset 0 -3px 0 var(--here,#7A5412);transition:background .1s}' +
      '.ra-btn{font-family:inherit;font-size:.82em;letter-spacing:.04em;cursor:pointer;' +
      'background:transparent;color:var(--here,#7A5412);border:1px solid var(--rule,#DCCDB2);' +
      'border-radius:999px;padding:5px 15px;margin:6px 0 2px;display:inline-flex;' +
      'align-items:center;gap:7px;direction:ltr}' +
      '.ra-btn:hover{background:var(--highlight,rgba(0,0,0,.06))}' +
      '.ra-btn[aria-pressed="true"]{background:var(--highlight,rgba(0,0,0,.1));' +
      'border-color:var(--here,#7A5412)}' +
      '.ra-speed{font-family:inherit;font-size:.74em;letter-spacing:.03em;cursor:pointer;' +
      'background:transparent;color:var(--here,#7A5412);border:1px solid var(--rule,#DCCDB2);' +
      'border-radius:999px;padding:4px 11px;margin:6px 0 2px 8px;direction:ltr;min-width:44px}' +
      '.ra-speed:hover{background:var(--highlight,rgba(0,0,0,.06))}' +
      '.ra-bar{display:flex;align-items:center;justify-content:center;gap:0;'+
      'margin:2px 0 14px;direction:ltr}' +
      /* THE STOP HAS TO COME WITH YOU. The reading scrolls the page to keep
         the spoken word in view, so the button that started it is a chapter
         away within a verse or two — and scrolling back up to reach it means
         fighting the very scroll you are trying to stop. This rides the
         viewport instead, clear of the mode bar and its safe area. */
      /* THE SAME BROWN PILL AS "Continue Reading" — --accent-fill with
         --on-fill on it, which is the volume's one filled-button pair and
         is already resolved for Light, Sepia and Dark. The navy chrome
         this first used belongs to the bars at the edges of the screen;
         floating in the middle of the reading it read as a different app. */
      '#ra-float{position:fixed;left:50%;transform:translateX(-50%);' +
      'bottom:calc(66px + env(safe-area-inset-bottom,0px));z-index:var(--z-chrome,60);' +
      'display:none;align-items:stretch;direction:ltr;border-radius:999px;overflow:hidden;' +
      'background:var(--accent-fill,#7A5412);color:var(--on-fill,#FFF);' +
      'box-shadow:0 6px 20px rgba(0,0,0,.28)}' +
      '#ra-float.on{display:flex}' +
      /* 44px is the floor for a control you tap without looking, and these
         are tapped mid-sentence with the page moving under them. */
      '#ra-float button{font-family:inherit;font-size:.95em;font-weight:600;' +
      'cursor:pointer;display:flex;align-items:center;gap:7px;min-height:44px;' +
      'padding:0 18px;background:transparent;color:inherit;border:0}' +
      '#ra-float button:active{background:rgba(0,0,0,.16)}' +
      '#ra-stop,#ra-pause,#ra-back{border-left:1px solid rgba(255,255,255,.34)}' +
      '#ra-back span:last-child,#ra-fwd span:last-child{font-size:.82em;opacity:.9}' +
      '#ra-back,#ra-fwd{padding:0 14px;gap:4px}';
    document.head.appendChild(s);
  }

  /* ---- playback ------------------------------------------------------- */

  var state = { on: false, paused: false, token: 0, btn: null, mark: null, touched: 0,
                list: [], at: 0, seek: null, inSentence: 0, panel: null };
  function handTaken() { state.touched = Date.now(); }
  window.addEventListener('wheel', handTaken, { passive: true });
  window.addEventListener('touchmove', handTaken, { passive: true });

  /* Track the marked element rather than searching for it. Scoping the
     search to the current verse left the previous verse's last word lit
     when playback crossed the boundary — two words marked at once — and
     searching the whole document on every boundary event means walking
     7,000 word-units several times a second. One reference does both jobs. */
  function mark(el) {
    if (state.mark && state.mark !== el) state.mark.classList.remove('ra-speaking');
    state.mark = el || null;
    if (el) { el.classList.add('ra-speaking'); keepInView(el); }
  }

  /* FOLLOW THE WORD, NOT THE VERSE. This scrolled once per verse, to the
     verse's first word, which is fine for a two-line verse and useless for
     Alma: the reading walks down off the bottom of the screen and the page
     sits still until the next verse begins, then jumps. What the reader sees
     is a page that waits and then catches up, rather than one that follows.

     So the marked word is kept inside a band in the middle of the viewport,
     and the page moves only when it leaves — scrolling on every word would
     be a page that never stops moving, and the band is what makes it stop.
     The band is high of centre because the reading always travels downward:
     landing a word at the middle buys twice as much room ahead as behind.

     Two things hold it back. The reader's own gesture wins for four seconds,
     as before. And one scroll is allowed every 600ms, because a smooth scroll
     that is interrupted and restarted several times a second never arrives. */
  var lastScrolled = 0;
  function keepInView(el) {
    if (Date.now() - state.touched < 4000) return;     /* their hands, not ours */
    if (Date.now() - lastScrolled < 600) return;
    var h = window.innerHeight || document.documentElement.clientHeight;
    var r = el.getBoundingClientRect();
    if (r.top >= h * 0.22 && r.bottom <= h * 0.62) return;      /* still in the band */
    lastScrolled = Date.now();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function clearMarks() {
    mark(null);
    var m = document.querySelectorAll('.ra-speaking');   /* belt and braces */
    for (var i = 0; i < m.length; i++) m[i].classList.remove('ra-speaking');
  }

  /* THE CONTROLS THAT RIDE THE VIEWPORT. The reading scrolls the page to keep
     the spoken word in view, so the button that started it is a chapter away
     within a verse or two. Pause is the one a reader reaches for most — to
     look at a word, or to be interrupted — and having to stop and start over
     is not the same thing, because starting over begins the chapter again. */
  function ensureFloat() {
    var f = document.getElementById('ra-float');
    if (f) return f;
    f = document.createElement('div');
    f.id = 'ra-float';

    /* THE READING RUNS RIGHT TO LEFT, so back is on the RIGHT and forward on
       the LEFT — the buttons point the way the text moves, not the way an
       English media player does. */
    var fwd = document.createElement('button');
    fwd.type = 'button';
    fwd.id = 'ra-fwd';
    fwd.innerHTML = '<span aria-hidden="true">\u21BA</span><span>10</span>';
    fwd.setAttribute('aria-label', 'Forward ten seconds');
    fwd.addEventListener('click', function () { skip(10); });
    f.appendChild(fwd);

    var p = document.createElement('button');
    p.type = 'button';
    p.id = 'ra-pause';
    p.addEventListener('click', function () { pause(!state.paused); });
    f.appendChild(p);

    var s2 = document.createElement('button');
    s2.type = 'button';
    s2.id = 'ra-stop';
    s2.innerHTML = '<span aria-hidden="true">\u25A0</span><span>Stop</span>';
    s2.addEventListener('click', function () { stop(); });
    f.appendChild(s2);

    var back = document.createElement('button');
    back.type = 'button';
    back.id = 'ra-back';
    back.innerHTML = '<span aria-hidden="true">\u21BB</span><span>10</span>';
    back.setAttribute('aria-label', 'Back ten seconds');
    back.addEventListener('click', function () { skip(-10); });
    f.appendChild(back);

    document.body.appendChild(f);
    setPauseLabel();
    return f;
  }

  function setPauseLabel() {
    var p = document.getElementById('ra-pause');
    if (!p) return;
    p.innerHTML = state.paused
      ? '<span aria-hidden="true">\u25B6</span><span>Resume</span>'
      : '<span aria-hidden="true">\u2758\u2758</span><span>Pause</span>';
    p.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
  }

  /** hold the reading where it is, or let it go on */
  function pause(on) {
    if (!state.on || state.paused === on) return;
    state.paused = on;
    /* Two things have to hold: the utterance being spoken, and the silence
       between clauses. Pausing only the engine would let the gap timer run
       on and fire the next clause the instant the reader resumed — or worse,
       while they were still paused. */
    try { on ? speechSynthesis.pause() : speechSynthesis.resume(); } catch (e) {}
    setPauseLabel();
  }

  /** a gap that does not run down while the reading is held */
  function gap(ms, token) {
    return new Promise(function (resolve) {
      var left = ms, last = Date.now();
      (function tick() {
        if (token !== state.token) return;          /* stopped: never resolve */
        var now = Date.now();
        if (!state.paused) left -= now - last;
        last = now;
        if (left <= 0) return resolve();
        setTimeout(tick, left < 60 ? left : 60);
      })();
    });
  }

  function setButton(on) {
    state.on = on;
    ensureFloat().classList.toggle('on', on);
    if (!state.btn) return;
    state.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    state.btn.querySelector('.ra-label').textContent = on ? 'Stop' : 'Read aloud';
    state.btn.querySelector('.ra-icon').textContent = on ? '■' : '▶';
  }

  /** speak one clause, highlighting each word as the engine reaches it */
  function speakPhrase(els, token, pitch, rate) {
    return new Promise(function (resolve) {
      var text = '', spans = [];
      els.forEach(function (el, i) {
        var w = spoken(el.getAttribute('data-h') || '');
        if (i) text += ' ';
        spans.push({ start: text.length, end: text.length + w.length, el: el });
        text += w;
      });
      if (!text.trim()) return resolve();

      var u = new SpeechSynthesisUtterance(text);
      var v = hebrewVoice();
      if (v) u.voice = v;
      u.lang = 'he-IL';
      u.rate = RATE * (rate || 1);
      u.pitch = pitch || 1;

      u.onboundary = function (e) {
        if (token !== state.token) return;
        for (var i = 0; i < spans.length; i++) {
          if (e.charIndex >= spans[i].start && e.charIndex < spans[i].end) {
            mark(spans[i].el);
            return;
          }
        }
      };
      u.onend = function () { resolve(); };
      u.onerror = function () { resolve(); };
      speechSynthesis.speak(u);
    });
  }

  function wordsOf(verse) {
    return Array.prototype.slice.call(verse.querySelectorAll('.word-unit'));
  }

  /* THE CHAPTER ON SCREEN. All 250 panels are in the document at once and the
     reader shows one; .active is set on some pages and not on others, so the
     test that holds everywhere is which one is actually RENDERED. offsetParent
     is null for anything inside a display:none subtree, which is exactly the
     249 that are put away. */
  function activePanel() {
    var a = document.querySelector('.chapter-panel.active');
    if (a) return a;
    var ps = document.querySelectorAll('.chapter-panel');
    for (var i = 0; i < ps.length; i++) if (ps[i].offsetParent !== null) return ps[i];
    return null;
  }

  /** repaint a chapter's own button without touching playback state */
  function paintBtn(btn, on) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    var l = btn.querySelector('.ra-label'), i = btn.querySelector('.ra-icon');
    if (l) l.textContent = on ? 'Stop' : 'Read aloud';
    if (i) i.textContent = on ? '\u25A0' : '\u25B6';
  }

  function play(scope) {
    var panel = scope || activePanel();
    if (!panel) return;
    var token = ++state.token;
    state.seek = null; state.inSentence = 0;
    state.paused = false;
    setPauseLabel();
    setButton(true);
    readPanel(panel, token);
  }

  /* READING DOES NOT STOP AT THE CHAPTER LINE. A reader who starts 1 Nephi 1
     wants 1 Nephi, not one chapter of it — the book runs on, and so should the
     voice. At the last verse the reader turns the page itself, by the same
     goNext() the arrow uses, and picks up at verse one of the next chapter.
     The chapter has to be WAITED FOR: verses arrive lazily, a book at a time,
     so the panel can be on screen and empty for a second. And goNext() does
     nothing at all at the end of the volume, which is how the reading knows
     to stop — the chapter never changes, and the wait gives up. */
  /* THE CHAPTER IS ONE LIST OF PHRASES, NOT A LIST PER VERSE.
     Skipping ten seconds means moving some number of phrases, and a phrase
     index that resets at every verse cannot be moved backwards across a verse
     boundary without unwinding the recursion that built it. Flattening the
     chapter once, up front, makes a seek a single assignment. A chapter is a
     few hundred phrases — Alma 32 is 258 — so this costs nothing. */
  function readPanel(panel, token) {
    var verses = Array.prototype.slice.call(
      panel.querySelectorAll('.verse[data-verse-key]'));
    if (!verses.length) { advance(panel, token); return; }
    var all = [];
    for (var i = 0; i < verses.length; i++) {
      var gs = phrases(wordsOf(verses[i]), verses[i].getAttribute('data-verse-key'));
      for (var j = 0; j < gs.length; j++) all.push(gs[j]);
    }
    state.list = all;
    state.at = 0;
    state.panel = panel;
    step(token);
  }

  /* HOW LONG A PHRASE TAKES IS MEASURED, NOT ASSUMED. The rate is a
     multiplier of the browser's own default, which differs by browser and by
     voice, so a table of seconds-per-word would be wrong everywhere but here.
     Each phrase times itself and feeds a running average, and ten seconds is
     however many phrases that average says it is. */
  var wps = 2.2;                       /* words per second, until measured */
  function estimate(g) { return (g.length / wps) + (g.gap || PHRASE_GAP) / 1000; }

  function step(token) {
    if (token !== state.token) return;
    var g = state.list[state.at];
    if (!g) { advance(state.panel, token); return; }
    if (g.length) keepInView(g[0]);
    var last = (state.at === state.list.length - 1) || g.stop;
    var pitch = Math.max(PITCH_MIN, PITCH_TOP - PITCH_STEP * state.inSentence);
    var rate = 1;
    if (last) { pitch = PITCH_END; rate = RATE_END; state.inSentence = 0; }
    else state.inSentence++;
    var t0 = Date.now();
    speakPhrase(g, token, pitch, rate).then(function () {
      if (token !== state.token) return;
      var secs = (Date.now() - t0) / 1000;
      if (secs > 0.25 && g.length) {     /* a cancelled phrase teaches nothing */
        wps = wps * 0.8 + (g.length / secs) * 0.2;
      }
      if (state.seek !== null) {         /* a skip landed while this was speaking */
        state.at = state.seek; state.seek = null; state.inSentence = 0;
        step(token); return;
      }
      state.at++;
      gap(g.gap || PHRASE_GAP, token).then(function () { step(token); });
    });
  }

  /** move roughly `secs` seconds through the reading, in whole phrases */
  function skip(secs) {
    if (!state.on || !state.list.length) return;
    var i = state.at, budget = Math.abs(secs);
    while (budget > 0) {
      var j = secs < 0 ? i - 1 : i + 1;
      if (j < 0) { i = 0; break; }
      if (j >= state.list.length) { i = state.list.length - 1; break; }
      i = j;
      budget -= estimate(state.list[i]);
    }
    state.seek = i;
    state.paused = false; setPauseLabel();
    /* cancel resolves the phrase in flight, and its handler takes the seek */
    try { speechSynthesis.resume(); speechSynthesis.cancel(); } catch (e) {}
  }

  function advance(from, token) {
    if (token !== state.token) return;
    if (typeof window.goNext !== 'function') { stop(); return; }
    var wasId = window.currentChapterId;
    paintBtn(from.querySelector('.ra-btn'), false);
    window.goNext();
    var t0 = Date.now();
    (function wait() {
      if (token !== state.token) return;
      var moved = window.currentChapterId !== wasId;
      if (!moved && Date.now() - t0 > 1500) { stop(); return; }   /* end of the volume */
      var p = activePanel();
      if (moved && p && p !== from && p.querySelector('.verse[data-verse-key]')) {
        state.btn = p.querySelector('.ra-btn') || state.btn;
        paintBtn(state.btn, true);
        readPanel(p, token);
        return;
      }
      if (Date.now() - t0 > 20000) { stop(); return; }            /* it never came */
      setTimeout(wait, 180);
    })();
  }

  function stop() {
    state.token++;
    /* A PAUSED SYNTHESISER CAN IGNORE cancel() — the queue is suspended, so
       the utterance sits there and starts speaking again the next time
       anything resumes it. Let it go first, then cancel. */
    try { speechSynthesis.resume(); } catch (e) {}
    try { speechSynthesis.cancel(); } catch (e) {}
    state.paused = false;
    setPauseLabel();
    clearMarks();
    setButton(false);
  }

  /* ---- the control ---------------------------------------------------- */

  /** the control bar for one chapter — play button plus the speed chip */
  function buildBar(panel) {
    var bar = document.createElement('div');
    bar.className = 'ra-bar';

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ra-btn';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span class="ra-icon" aria-hidden="true">▶</span>' +
                  '<span class="ra-label">Read aloud</span>';
    b.addEventListener('click', function () {
      if (state.on) { stop(); return; }
      state.btn = b;
      play(panel);
    });
    bar.appendChild(b);

    /* cycles, persists, and takes effect on the next clause without
       interrupting the one being spoken */
    var sp = document.createElement('button');
    sp.type = 'button';
    sp.className = 'ra-speed';
    sp.title = 'Reading speed';
    sp.textContent = RATE.toFixed(2).replace(/0$/, '') + '\u00d7';
    sp.addEventListener('click', function () {
      var n = SPEEDS.indexOf(RATE);
      RATE = SPEEDS[(n + 1) % SPEEDS.length];
      try { localStorage.setItem('sw-read-rate', String(RATE)); } catch (e) {}
      var chips = document.querySelectorAll('.ra-speed');
      for (var k = 0; k < chips.length; k++) {
        chips[k].textContent = RATE.toFixed(2).replace(/0$/, '') + '\u00d7';
      }
    });
    bar.appendChild(sp);
    return bar;
  }

  function mount() {
    if (!window.speechSynthesis) return;          // no engine: no control
    ensureStyle();
    var heads = document.querySelectorAll('.chapter-heading');
    for (var i = 0; i < heads.length; i++) {
      var head = heads[i];
      var panel = head.closest('.chapter-panel') || head.parentNode;
      var bar = panel.querySelector('.ra-bar') || buildBar(panel);

      /* IT BELONGS AFTER THE CHAPTER SUMMARY AND ABOVE VERSE ONE, and it has
         to be PLACED rather than appended once. A chapter heading is empty
         when this first runs — the summary, its Hebrew and that summary's own
         interlinear flow are all rendered afterwards — so a bar appended to
         the heading ends up ABOVE everything the renderer adds next. Anchor
         it to the first verse instead, and re-anchor whenever the observer
         sees the chapter fill in. The keyed verse is the anchor, so on the
         Book of Mormon it lands below the colophon rather than above it,
         which is also where the reading starts. */
      var first = panel.querySelector('.verse[data-verse-key]') ||
                  panel.querySelector('.verse');
      if (first && first.parentNode) {
        if (bar.nextElementSibling !== first) first.parentNode.insertBefore(bar, first);
      } else if (!bar.parentNode) {
        head.appendChild(bar);                    // nothing rendered yet
      }
    }
  }

  /* Voices arrive asynchronously on first load; the control is useless
     until they do, so mount and then let the list settle. */
  if (window.speechSynthesis) {
    speechSynthesis.addEventListener('voiceschanged', function () { _voice = null; });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  /* Chapters render lazily, so re-mount whenever new headings appear. */
  var mo = new MutationObserver(function () { mount(); });
  if (document.body) mo.observe(document.body, { childList: true, subtree: true });

  window.SWReadAloud = { play: play, stop: stop, phrases: phrases, spoken: spoken,
                         mount: mount, speeds: SPEEDS,
                         setRate: function (r) {
                           RATE = r;
                           try { localStorage.setItem('sw-read-rate', String(r)); } catch (e) {}
                         },
                         get rate() { return RATE; },
                         get playing() { return state.on; } };
})();
