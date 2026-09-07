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
 * parseScriptureRef WAS deliberately left out, on the grounds that both copies
 * were already identical so it caused no divergence. That reasoning does not
 * survive contact with time: "identical today" is not a property a codebase
 * keeps by itself, and the abbreviation map it depends on had ALREADY drifted
 * by the time anyone looked — the engine knew 87 books, bom.html 72. (The 15
 * missing ones are the Book of Mormon's own, which bom.html routes through
 * parseBomRef for in-page navigation instead; that split is deliberate and is
 * preserved below.) Both now live here, and the split is expressed as data
 * rather than as two tables that have to be kept in step by hand.
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

  /* ── The abbreviation map ──────────────────────────────────────────────
     Every book EXCEPT the Book of Mormon's own fifteen. Both the engine and
     bom.html need exactly these; the engine layers the BOM's fifteen on top
     (BOM_BOOK_ABBREV below) because a BOM reference from another volume is a
     cross-volume link, while bom.html deliberately does NOT, because there a
     BOM reference is an in-page jump handled by parseBomRef. That difference
     is the ONLY thing the two are allowed to disagree about, and it is now
     stated once, here, instead of being the accidental residue of two tables
     that fell out of step. */
  var BOOK_ABBREV = {
    'Gen.': 'Genesis', 'Ex.': 'Exodus', 'Lev.': 'Leviticus', 'Num.': 'Numbers',
    'Deut.': 'Deuteronomy', 'Josh.': 'Joshua', 'Judg.': 'Judges', 'Ruth': 'Ruth',
    '1 Sam.': '1 Samuel', '2 Sam.': '2 Samuel', '1 Kgs.': '1 Kings', '2 Kgs.': '2 Kings',
    '1 Chr.': '1 Chronicles', '2 Chr.': '2 Chronicles', 'Ezra': 'Ezra', 'Neh.': 'Nehemiah',
    'Esth.': 'Esther', 'Job': 'Job', 'Ps.': 'Psalms', 'Prov.': 'Proverbs',
    'Eccl.': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa.': 'Isaiah', 'Jer.': 'Jeremiah',
    'Lam.': 'Lamentations', 'Ezek.': 'Ezekiel', 'Dan.': 'Daniel', 'Hosea': 'Hosea',
    'Joel': 'Joel', 'Amos': 'Amos', 'Obad.': 'Obadiah', 'Jonah': 'Jonah',
    'Micah': 'Micah', 'Nahum': 'Nahum', 'Hab.': 'Habakkuk', 'Zeph.': 'Zephaniah',
    'Hag.': 'Haggai', 'Zech.': 'Zechariah', 'Mal.': 'Malachi', 'Matt.': 'Matthew',
    'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John', 'Acts': 'Acts',
    'Rom.': 'Romans', '1 Cor.': '1 Corinthians', '2 Cor.': '2 Corinthians', 'Gal.': 'Galatians',
    'Eph.': 'Ephesians', 'Philip.': 'Philippians', 'Col.': 'Colossians', '1 Thes.': '1 Thessalonians',
    '2 Thes.': '2 Thessalonians', '1 Tim.': '1 Timothy', '2 Tim.': '2 Timothy', 'Titus': 'Titus',
    'Philem.': 'Philemon', 'Heb.': 'Hebrews', 'James': 'James', '1 Pet.': '1 Peter',
    '2 Pet.': '2 Peter', '1 Jn.': '1 John', '2 Jn.': '2 John', '3 Jn.': '3 John',
    'Jude': 'Jude', 'Rev.': 'Revelation', 'D&C': 'D&C', 'Moses': 'Moses',
    'Abr.': 'Abraham', 'JS—H': 'JS-H', 'JS—M': 'JS-M', 'A of F': 'A-of-F'
  };
  var BOM_BOOK_ABBREV = {
    '1 Ne.': '1 Nephi', '2 Ne.': '2 Nephi', 'Jacob': 'Jacob',
    'Enos': 'Enos', 'Jarom': 'Jarom', 'Omni': 'Omni',
    'W of M': 'Words of Mormon', 'Mosiah': 'Mosiah', 'Alma': 'Alma',
    'Hel.': 'Helaman', '3 Ne.': '3 Nephi', '4 Ne.': '4 Nephi',
    'Morm.': 'Mormon', 'Ether': 'Ether', 'Moro.': 'Moroni'
  };

  /* "Isa. 53:5" -> "Isaiah|53|5". The table is passed in rather than closed
     over, so the one implementation serves both callers and their different
     book sets. Non-breaking spaces are normalised first: crossrefs.json uses
     U+00A0 inside "2 Kgs." and friends. */
  function parseScriptureRefWith(table, refText) {
    var norm = String(refText == null ? '' : refText).replace(/\u00a0/g, ' ');
    for (var abbr in table) {
      if (norm.indexOf(abbr) === 0) {
        var rest = norm.substring(abbr.length).trim();
        var m = rest.match(/^(\d+):(\d+)/);
        if (m) return table[abbr] + '|' + m[1] + '|' + m[2];
      }
    }
    return null;
  }

  /* "Isa. 53:5" or "Isa 53:5" or "Isaiah 53:5" -> "Isaiah|53|5".

     Three ways of writing the same reference, and until now three different
     amounts of support for them. The engine matched the abbreviation table
     exactly and separately accepted a full book name; bom.html matched the
     table exactly and then retried with a period appended, because the data is
     not consistent about it — "Gen 15:6" sits beside "Gen. 15:6" and only the
     second one resolved, so the first rendered as an inert span with no way to
     follow it. Each copy had a trick the other lacked. This has both. */
  function resolveRefKey(table, label) {
    /* "JST Gen. 9:15" is a reference to the Joseph Smith Translation, a volume
       this app ships — and not one of them was followable: 184 across the
       corpus rendered as inert text, because the prefix made the rest fail to
       parse. The prefix is stripped, the remainder resolved normally, and the
       key marked so nav_engine can send it to the JST's own page rather than
       to the book of the same name in the OT or NT. */
    var jst = String(label == null ? '' : label).match(/^JST[,]?\s+(.+)$/);
    if (jst) {
      var inner = resolveRefKey(table, jst[1]);
      return inner ? 'JST ' + inner : null;
    }
    var direct = parseScriptureRefWith(table, label);
    if (direct) return direct;
    var m = String(label == null ? '' : label).replace(/\u00a0/g, ' ').trim()
              .match(/^(.+?)\s+(\d+):(\d+)/);
    if (!m) return null;
    var book = m[1].trim();
    // the table's own value (a full book name) is accepted as written
    var full = table[book] || table[book + '.'] || null;
    if (!full) {
      for (var k in table) { if (table[k] === book) { full = book; break; } }
    }
    return full ? (full + '|' + m[2] + '|' + m[3]) : null;
  }

  /* ── The reference heading ─────────────────────────────────────────────
     The gold reference, and the "Go to verse" chip beside it, on every card in
     every volume. Both panels built this themselves in near-identical code —
     one with a <span role="link">, one with an <a>, and each with its own copy
     of the keyboard handling and the class names.

     What genuinely differs is only WHERE a reference goes: on bom.html a Book
     of Mormon reference is an in-page jump through parseBomRef, everywhere
     else it is a cross-volume trip through nav_engine. So the caller resolves
     the destination and passes it in; the row itself is built once, here.

     `dest` is null for a label with nowhere to go (a Topical Guide topic, say)
     — the heading is then plain text, which is what keeps "TG Faith" from
     pretending to be a link. Otherwise { href, go }: href for a real, copyable
     anchor when there is one, go() for what actually happens on activation. */
  function buildRefTitleRow(label, dest) {
    var row = document.createElement('div');
    row.className = 'xref-ref-title';
    var text = String(label == null ? '' : label);

    if (!dest || typeof dest.go !== 'function') {
      var plain = document.createElement('span');
      plain.textContent = text;
      row.appendChild(plain);
      return row;
    }

    var el;
    if (dest.href) {
      el = document.createElement('a');
      el.href = dest.href;                       // copyable, and survives a
      el.onclick = function (e) {                // handler that never runs
        e.preventDefault();
        dest.go();
      };
    } else {
      el = document.createElement('span');
      el.setAttribute('role', 'link');
      el.setAttribute('tabindex', '0');
      el.onclick = function () { dest.go(); };
    }
    el.className = 'xref-ref-link';
    el.textContent = text;
    el.onkeydown = function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dest.go(); }
    };
    row.appendChild(el);

    var chip = document.createElement('span');
    chip.className = 'xref-ref-goto';
    chip.textContent = 'Go to verse \u2192';
    chip.onclick = function () { dest.go(); };
    row.appendChild(chip);
    return row;
  }

  /* ── A verse rendered as interlinear, inside a reference card ──────────
     Both panels turned a verse's word array into the same markup, in their own
     code: crossrefs_engine.renderInterlinearHtml and, inline, bom.html's
     getExternalVerseHtml. Two differences, both preserved here as options
     rather than silently picked, because either choice changes what a reader
     sees on one of the volumes:

       · `sep` — the engine emits <span class="xref-ref-arr">‹</span> between
         words and bom.html does not. Invisible either way today: reader.css
         hides .xref-ref-arr inside #xref-panel. Kept because the markup is
         the engine's and something else may rely on it.
       · `dehyphen` — bom.html renders "in-the-beginning" as "in the
         beginning"; the engine leaves the hyphens in. The corpus uses both
         separators, per chapter rather than per book, so neither is wrong —
         but the two volumes disagree, and that is worth the translator's
         ruling rather than a quiet decision here. */
  function renderInterlinear(words, opts) {
    if (!words || !words.length) return '';
    opts = opts || {};
    var html = '<div class="xref-ref-content">', first = true;
    for (var i = 0; i < words.length; i++) {
      var w = words[i] || [];
      var hw = String(w[0] == null ? '' : w[0]).replace(/\u05C3/g, '');
      if (!hw) continue;                                  // sof pasuq carries no word
      var gl = String(w[1] == null ? '' : w[1]);
      if (opts.dehyphen) gl = gl.replace(/-/g, ' ');
      if (!first && opts.sep) html += '<span class="xref-ref-arr">\u2039</span>';
      first = false;
      html += '<span class="xref-ref-word"><span class="hw">' + hw + '</span>';
      if (gl) html += '<span class="en">' + gl + '</span>';
      html += '</span>';
    }
    return html + '</div>';
  }

  /* ── The study links under the word card ───────────────────────────────
     "View Cross-References (2)" and the root link beneath it. Both pages built
     this row themselves, and every bug in it this week had to be fixed twice —
     the count that named markers instead of references, the handler that closed
     the card, the Strong's link that left the app. They also disagreed on what
     to call the same thing: five volumes said "Cross-References for root", the
     Book of Mormon "View Root Cross-References". One row, one wording, the
     parallel construction the direct link already uses. */
  function studyLinksHtml(o) {
    o = o || {};
    var h = '';
    if (o.directCount > 0) {
      h += '<br><span class="popup-xref-direct">View Cross-References (' + o.directCount + ') \u2192</span>';
    }
    if (o.rootCount > 0) {
      h += '<br><span class="popup-xref-link">View Root Cross-References (' + o.rootCount + ') \u2192</span>';
    }
    return h;
  }

  window.simpleStem = simpleStem;
  window.SWXref = {
    renderInterlinear: renderInterlinear,
    studyLinksHtml: studyLinksHtml,
    buildRefTitleRow: buildRefTitleRow,
    simpleStem: simpleStem,
    resolveRefKey: resolveRefKey,
    BOOK_ABBREV: BOOK_ABBREV,
    BOM_BOOK_ABBREV: BOM_BOOK_ABBREV,
    parseScriptureRefWith: parseScriptureRefWith
  };
})();
