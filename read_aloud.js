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
  var PHRASE_GAP = 420;     // ms of silence between clauses
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

  var SUBST = [[/יְהוָה/g, 'אֲדֹנָי'],   /* יהוה -> אדני  */
               [/יְהוִה/g, 'אֱלֹהִים']]; /* יהוה(Elohim) -> אלהים */

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

  /** the form to SPEAK for a word — never the form to show */
  function spoken(heb) {
    var s = heb;
    for (var i = 0; i < SUBST.length; i++) s = s.replace(SUBST[i][0], SUBST[i][1]);
    return s;
  }

  /** true for punctuation-only tokens (sof pasuq, paseq) — nothing to say */
  function silent(heb) { return !/[א-ת]/.test(heb || ''); }

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
    if (exact && exact.length) {
      var speakable = [], k;
      for (k = 0; k < units.length; k++) {
        if (!silent(units[k].getAttribute('data-h') || '')) speakable.push(units[k]);
      }
      var groups = [], from = 0;
      for (k = 0; k < exact.length; k++) {
        if (exact[k] >= from && exact[k] < speakable.length - 1) {
          groups.push(speakable.slice(from, exact[k] + 1));
          from = exact[k] + 1;
        }
      }
      if (from < speakable.length) groups.push(speakable.slice(from));
      if (groups.length) return groups;
    }

    var out = [], cur = [];
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
      if (/[,;:—]\s*$/.test(gloss) && cur.length >= MIN_PHRASE) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);

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
      split.push(p.slice(0, best), p.slice(best));
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
      '.ra-speed:hover{background:var(--highlight,rgba(0,0,0,.06))}';
    document.head.appendChild(s);
  }

  /* ---- playback ------------------------------------------------------- */

  var state = { on: false, token: 0, btn: null, mark: null };

  /* Track the marked element rather than searching for it. Scoping the
     search to the current verse left the previous verse's last word lit
     when playback crossed the boundary — two words marked at once — and
     searching the whole document on every boundary event means walking
     7,000 word-units several times a second. One reference does both jobs. */
  function mark(el) {
    if (state.mark && state.mark !== el) state.mark.classList.remove('ra-speaking');
    state.mark = el || null;
    if (el) el.classList.add('ra-speaking');
  }
  function clearMarks() {
    mark(null);
    var m = document.querySelectorAll('.ra-speaking');   /* belt and braces */
    for (var i = 0; i < m.length; i++) m[i].classList.remove('ra-speaking');
  }

  function setButton(on) {
    state.on = on;
    if (!state.btn) return;
    state.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    state.btn.querySelector('.ra-label').textContent = on ? 'Stop' : 'Read aloud';
    state.btn.querySelector('.ra-icon').textContent = on ? '■' : '▶';
  }

  /** speak one clause, highlighting each word as the engine reaches it */
  function speakPhrase(els, token) {
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
      u.rate = RATE;

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

  /** read every verse of a chapter in order */
  function play(scope) {
    var root = scope || document;
    /* Numbered verses only. The colophon is a .verse too but carries no
       data-verse-key — it is the book's superscription, not scripture to be
       read aloud, so the chapter starts at אֲנִי נֶפִי. */
    var verses = Array.prototype.slice.call(root.querySelectorAll('.verse[data-verse-key]'));
    if (!verses.length) return;
    var token = ++state.token;
    setButton(true);

    (function next(vi) {
      if (token !== state.token) return;
      if (vi >= verses.length) { stop(); return; }
      var groups = phrases(wordsOf(verses[vi]),
                           verses[vi].getAttribute('data-verse-key'));
      (function step(pi) {
        if (token !== state.token) return;
        if (pi >= groups.length) { next(vi + 1); return; }
        if (pi === 0 && groups[0].length) {
          groups[0][0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        speakPhrase(groups[pi], token).then(function () {
          if (token !== state.token) return;
          setTimeout(function () { step(pi + 1); }, PHRASE_GAP);
        });
      })(0);
    })(0);
  }

  function stop() {
    state.token++;
    try { speechSynthesis.cancel(); } catch (e) {}
    clearMarks();
    setButton(false);
  }

  /* ---- the control ---------------------------------------------------- */

  function mount() {
    if (!window.speechSynthesis) return;          // no engine: no control
    ensureStyle();
    var heads = document.querySelectorAll('.chapter-heading');
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].querySelector('.ra-btn')) continue;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ra-btn';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="ra-icon" aria-hidden="true">▶</span>' +
                    '<span class="ra-label">Read aloud</span>';
      (function (btn, head) {
        btn.addEventListener('click', function () {
          if (state.on) { stop(); return; }
          state.btn = btn;
          /* the chapter is whatever shares this heading's panel */
          play(head.closest('.chapter-panel') || head.parentNode);
        });
      })(b, heads[i]);
      heads[i].appendChild(b);

      /* the speed chip — cycles, persists, and takes effect on the next
         clause without interrupting the one being spoken */
      var sp = document.createElement('button');
      sp.type = 'button';
      sp.className = 'ra-speed';
      sp.title = 'Reading speed';
      sp.textContent = RATE.toFixed(2).replace(/0$/, '') + '\u00d7';
      sp.addEventListener('click', function () {
        var i = SPEEDS.indexOf(RATE);
        RATE = SPEEDS[(i + 1) % SPEEDS.length];
        try { localStorage.setItem('sw-read-rate', String(RATE)); } catch (e) {}
        var chips = document.querySelectorAll('.ra-speed');
        for (var k = 0; k < chips.length; k++) {
          chips[k].textContent = RATE.toFixed(2).replace(/0$/, '') + '\u00d7';
        }
      });
      heads[i].appendChild(sp);
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
