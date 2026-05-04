/* ══════════════════════════════════════════════════════
   NAV ENGINE — Unified Navigation for Standard Works
   ══════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // ── Hebrew Numerals ──
  function toHebNum(n) {
    var ones = ['','\u05D0','\u05D1','\u05D2','\u05D3','\u05D4','\u05D5','\u05D6','\u05D7','\u05D8'];
    var tens = ['','\u05D9','\u05DB','\u05DC','\u05DE','\u05E0','\u05E1','\u05E2','\u05E4','\u05E6'];
    var hundreds = ['','\u05E7','\u05E8','\u05E9','\u05EA'];
    if (n === 15) return '\u05D8\u05D5';
    if (n === 16) return '\u05D8\u05D6';
    var result = '';
    if (n >= 100) {
      var h = Math.floor(n / 100);
      if (h <= 4) result += hundreds[h];
      else result += '\u05EA' + hundreds[h - 4];
      n %= 100;
    }
    if (n === 15) { result += '\u05D8\u05D5'; return result; }
    if (n === 16) { result += '\u05D8\u05D6'; return result; }
    if (n >= 10) { result += tens[Math.floor(n / 10)]; n %= 10; }
    if (n > 0) result += ones[n];
    return result;
  }

  // ── Volume Registry ──
  var VOLUMES = {
    ot: {
      key: 'ot', name: 'Old Testament', heb: '\u05EA\u05E0\u05F4\u05DA', abbr: '\u05EA\u05E0\u05F4\u05DA',
      page: 'ot.html',
      divisions: [
        { name: '\u05EA\u05D5\u05B9\u05E8\u05B8\u05D4 \u00B7 Torah', books: [
          { id:'gen', en:'Genesis', heb:'\u05D1\u05B0\u05BC\u05E8\u05B5\u05D0\u05E9\u05B4\u05C1\u05D9\u05EA', ch:50, prefix:'gen-ch' },
          { id:'exo', en:'Exodus', heb:'\u05E9\u05B0\u05C1\u05DE\u05D5\u05B9\u05EA', ch:40, prefix:'exo-ch' },
          { id:'lev', en:'Leviticus', heb:'\u05D5\u05B7\u05D9\u05B4\u05BC\u05E7\u05B0\u05E8\u05B8\u05D0', ch:27, prefix:'lev-ch' },
          { id:'num', en:'Numbers', heb:'\u05D1\u05B0\u05BC\u05DE\u05B4\u05D3\u05B0\u05D1\u05B7\u05BC\u05E8', ch:36, prefix:'num-ch' },
          { id:'deu', en:'Deuteronomy', heb:'\u05D3\u05B0\u05BC\u05D1\u05B8\u05E8\u05B4\u05D9\u05DD', ch:34, prefix:'deu-ch' }
        ]},
        { name: "\u05E0\u05B0\u05D1\u05B4\u05D9\u05D0\u05B4\u05D9\u05DD \u00B7 Nevi'im", books: [
          { id:'jos', en:'Joshua', heb:'\u05D9\u05B0\u05D4\u05D5\u05B9\u05E9\u05BB\u05C1\u05E2\u05B7', ch:24, prefix:'jos-ch' },
          { id:'jdg', en:'Judges', heb:'\u05E9\u05C1\u05D5\u05B9\u05E4\u05B0\u05D8\u05B4\u05D9\u05DD', ch:21, prefix:'jdg-ch' },
          { id:'1sa', en:'1 Samuel', heb:'\u05E9\u05B0\u05C1\u05DE\u05D5\u05BC\u05D0\u05B5\u05DC \u05D0', ch:31, prefix:'1sa-ch' },
          { id:'2sa', en:'2 Samuel', heb:'\u05E9\u05B0\u05C1\u05DE\u05D5\u05BC\u05D0\u05B5\u05DC \u05D1', ch:24, prefix:'2sa-ch' },
          { id:'1ki', en:'1 Kings', heb:'\u05DE\u05B0\u05DC\u05B8\u05DB\u05B4\u05D9\u05DD \u05D0', ch:22, prefix:'1ki-ch' },
          { id:'2ki', en:'2 Kings', heb:'\u05DE\u05B0\u05DC\u05B8\u05DB\u05B4\u05D9\u05DD \u05D1', ch:25, prefix:'2ki-ch' },
          { id:'isa', en:'Isaiah', heb:'\u05D9\u05B0\u05E9\u05B7\u05C1\u05E2\u05B0\u05D9\u05B8\u05D4\u05D5\u05BC', ch:66, prefix:'isa-ch' },
          { id:'jer', en:'Jeremiah', heb:'\u05D9\u05B4\u05E8\u05B0\u05DE\u05B0\u05D9\u05B8\u05D4\u05D5\u05BC', ch:52, prefix:'jer-ch' },
          { id:'eze', en:'Ezekiel', heb:'\u05D9\u05B0\u05D7\u05B6\u05D6\u05B0\u05E7\u05B5\u05D0\u05DC', ch:48, prefix:'eze-ch' },
          { id:'hos', en:'Hosea', heb:'\u05D4\u05D5\u05B9\u05E9\u05B5\u05C1\u05E2\u05B7', ch:14, prefix:'hos-ch' },
          { id:'joe', en:'Joel', heb:'\u05D9\u05D5\u05B9\u05D0\u05B5\u05DC', ch:4, prefix:'joe-ch' },
          { id:'amo', en:'Amos', heb:'\u05E2\u05B8\u05DE\u05D5\u05B9\u05E1', ch:9, prefix:'amo-ch' },
          { id:'oba', en:'Obadiah', heb:'\u05E2\u05D5\u05B9\u05D1\u05B7\u05D3\u05B0\u05D9\u05B8\u05D4', ch:1, prefix:'oba-ch' },
          { id:'jon', en:'Jonah', heb:'\u05D9\u05D5\u05B9\u05E0\u05B8\u05D4', ch:4, prefix:'jon-ch' },
          { id:'mic', en:'Micah', heb:'\u05DE\u05B4\u05D9\u05DB\u05B8\u05D4', ch:7, prefix:'mic-ch' },
          { id:'nah', en:'Nahum', heb:'\u05E0\u05B7\u05D7\u05D5\u05BC\u05DD', ch:3, prefix:'nah-ch' },
          { id:'hab', en:'Habakkuk', heb:'\u05D7\u05B2\u05D1\u05B7\u05E7\u05BC\u05D5\u05BC\u05E7', ch:3, prefix:'hab-ch' },
          { id:'zep', en:'Zephaniah', heb:'\u05E6\u05B0\u05E4\u05B7\u05E0\u05B0\u05D9\u05B8\u05D4', ch:3, prefix:'zep-ch' },
          { id:'hag', en:'Haggai', heb:'\u05D7\u05B7\u05D2\u05B7\u05BC\u05D9', ch:2, prefix:'hag-ch' },
          { id:'zec', en:'Zechariah', heb:'\u05D6\u05B0\u05DB\u05B7\u05E8\u05B0\u05D9\u05B8\u05D4', ch:14, prefix:'zec-ch' },
          { id:'mal', en:'Malachi', heb:'\u05DE\u05B7\u05DC\u05B0\u05D0\u05B8\u05DB\u05B4\u05D9', ch:3, prefix:'mal-ch' }
        ]},
        { name: '\u05DB\u05B0\u05BC\u05EA\u05D5\u05BC\u05D1\u05B4\u05D9\u05DD \u00B7 Ketuvim', books: [
          { id:'psa', en:'Psalms', heb:'\u05EA\u05B0\u05BC\u05D4\u05B4\u05DC\u05B4\u05BC\u05D9\u05DD', ch:150, prefix:'psa-ch' },
          { id:'pro', en:'Proverbs', heb:'\u05DE\u05B4\u05E9\u05B0\u05C1\u05DC\u05B5\u05D9', ch:31, prefix:'pro-ch' },
          { id:'job', en:'Job', heb:'\u05D0\u05B4\u05D9\u05BC\u05D5\u05B9\u05D1', ch:42, prefix:'job-ch' },
          { id:'sos', en:'Song of Songs', heb:'\u05E9\u05B4\u05C1\u05D9\u05E8 \u05D4\u05B7\u05E9\u05B4\u05BC\u05C1\u05D9\u05E8\u05B4\u05D9\u05DD', ch:8, prefix:'sos-ch' },
          { id:'rth', en:'Ruth', heb:'\u05E8\u05D5\u05BC\u05EA', ch:4, prefix:'rth-ch' },
          { id:'lam', en:'Lamentations', heb:'\u05D0\u05B5\u05D9\u05DB\u05B8\u05D4', ch:5, prefix:'lam-ch' },
          { id:'ecc', en:'Ecclesiastes', heb:'\u05E7\u05B9\u05D4\u05B6\u05DC\u05B6\u05EA', ch:12, prefix:'ecc-ch' },
          { id:'est', en:'Esther', heb:'\u05D0\u05B6\u05E1\u05B0\u05EA\u05B5\u05BC\u05E8', ch:10, prefix:'est-ch' },
          { id:'dan', en:'Daniel', heb:'\u05D3\u05B8\u05BC\u05E0\u05B4\u05D9\u05B5\u05BC\u05D0\u05DC', ch:12, prefix:'dan-ch' },
          { id:'ezr', en:'Ezra', heb:'\u05E2\u05B6\u05D6\u05B0\u05E8\u05B8\u05D0', ch:10, prefix:'ezr-ch' },
          { id:'neh', en:'Nehemiah', heb:'\u05E0\u05B0\u05D7\u05B6\u05DE\u05B0\u05D9\u05B8\u05D4', ch:13, prefix:'neh-ch' },
          { id:'1ch', en:'1 Chronicles', heb:'\u05D3\u05B4\u05BC\u05D1\u05B0\u05E8\u05B5\u05D9 \u05D4\u05B7\u05D9\u05B8\u05BC\u05DE\u05B4\u05D9\u05DD \u05D0', ch:29, prefix:'1ch-ch' },
          { id:'2ch', en:'2 Chronicles', heb:'\u05D3\u05B4\u05BC\u05D1\u05B0\u05E8\u05B5\u05D9 \u05D4\u05B7\u05D9\u05B8\u05BC\u05DE\u05B4\u05D9\u05DD \u05D1', ch:36, prefix:'2ch-ch' }
        ]}
      ]
    },
    nt: {
      key: 'nt', name: 'New Testament', heb:'\u05D4\u05D1\u05E8\u05D9\u05EA \u05D4\u05D7\u05D3\u05E9\u05D4', abbr:'\u05D1.\u05D7',
      page: 'nt.html',
      divisions: [
        { name: '\u05D1\u05E9\u05D5\u05E8\u05D5\u05EA \u00B7 Gospels', books: [
          { id:'matt', en:'Matthew', heb:'\u05DE\u05B7\u05EA\u05B8\u05BC\u05D9', ch:28, prefix:'matt-ch' },
          { id:'mark', en:'Mark', heb:'\u05DE\u05B7\u05E8\u05B0\u05E7\u05D5\u05B9\u05E1', ch:16, prefix:'mark-ch' },
          { id:'luke', en:'Luke', heb:'\u05DC\u05D5\u05BC\u05E7\u05B8\u05E1', ch:24, prefix:'luke-ch' },
          { id:'john', en:'John', heb:'\u05D9\u05D5\u05B9\u05D7\u05B8\u05E0\u05B8\u05DF', ch:21, prefix:'john-ch' }
        ]},
        { name: '\u05DE\u05E2\u05E9\u05D9\u05DD \u00B7 Acts', books: [
          { id:'acts', en:'Acts', heb:'\u05DE\u05B7\u05E2\u05B2\u05E9\u05B5\u05C2\u05D9 \u05D4\u05B7\u05E9\u05B0\u05BC\u05C1\u05DC\u05B4\u05D9\u05D7\u05B4\u05D9\u05DD', ch:28, prefix:'acts-ch' }
        ]},
        { name: '\u05D0\u05D2\u05E8\u05D5\u05EA \u05E4\u05D5\u05DC\u05D5\u05E1 \u00B7 Pauline Epistles', books: [
          { id:'rom', en:'Romans', heb:'\u05E8\u05D5\u05B9\u05DE\u05B4\u05D9\u05DD', ch:16, prefix:'rom-ch' },
          { id:'1co', en:'1 Corinthians', heb:'\u05E7\u05D5\u05B9\u05E8\u05B4\u05E0\u05B0\u05EA\u05B4\u05BC\u05D9\u05DD \u05D0', ch:16, prefix:'1co-ch' },
          { id:'2co', en:'2 Corinthians', heb:'\u05E7\u05D5\u05B9\u05E8\u05B4\u05E0\u05B0\u05EA\u05B4\u05BC\u05D9\u05DD \u05D1', ch:13, prefix:'2co-ch' },
          { id:'gal', en:'Galatians', heb:'\u05D2\u05B8\u05BC\u05DC\u05B8\u05D8\u05B4\u05D9\u05DD', ch:6, prefix:'gal-ch' },
          { id:'eph', en:'Ephesians', heb:'\u05D0\u05B6\u05E4\u05B6\u05E1\u05B4\u05D9\u05DD', ch:6, prefix:'eph-ch' },
          { id:'php', en:'Philippians', heb:'\u05E4\u05B4\u05D9\u05DC\u05B4\u05E4\u05B4\u05BC\u05D9\u05DD', ch:4, prefix:'php-ch' },
          { id:'col', en:'Colossians', heb:'\u05E7\u05D5\u05B9\u05DC\u05D5\u05B9\u05E1\u05B4\u05D9\u05DD', ch:4, prefix:'col-ch' },
          { id:'1th', en:'1 Thessalonians', heb:'\u05EA\u05B6\u05BC\u05E1\u05B8\u05BC\u05DC\u05D5\u05B9\u05E0\u05B4\u05D9\u05E7\u05B4\u05D9\u05DD \u05D0', ch:5, prefix:'1th-ch' },
          { id:'2th', en:'2 Thessalonians', heb:'\u05EA\u05B6\u05BC\u05E1\u05B8\u05BC\u05DC\u05D5\u05B9\u05E0\u05B4\u05D9\u05E7\u05B4\u05D9\u05DD \u05D1', ch:3, prefix:'2th-ch' },
          { id:'1ti', en:'1 Timothy', heb:'\u05D8\u05B4\u05D9\u05DE\u05D5\u05B9\u05EA\u05B5\u05D0\u05D5\u05B9\u05E1 \u05D0', ch:6, prefix:'1ti-ch' },
          { id:'2ti', en:'2 Timothy', heb:'\u05D8\u05B4\u05D9\u05DE\u05D5\u05B9\u05EA\u05B5\u05D0\u05D5\u05B9\u05E1 \u05D1', ch:4, prefix:'2ti-ch' },
          { id:'tit', en:'Titus', heb:'\u05D8\u05B4\u05D9\u05D8\u05D5\u05B9\u05E1', ch:3, prefix:'tit-ch' },
          { id:'phm', en:'Philemon', heb:'\u05E4\u05B4\u05D9\u05DC\u05B5\u05D9\u05DE\u05D5\u05B9\u05DF', ch:1, prefix:'phm-ch' }
        ]},
        { name: '\u05D0\u05D2\u05E8\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA \u00B7 General Epistles', books: [
          { id:'heb', en:'Hebrews', heb:'\u05E2\u05B4\u05D1\u05B0\u05E8\u05B4\u05D9\u05DD', ch:13, prefix:'heb-ch' },
          { id:'jas', en:'James', heb:'\u05D9\u05B7\u05E2\u05B2\u05E7\u05B9\u05D1', ch:5, prefix:'jas-ch' },
          { id:'1pe', en:'1 Peter', heb:'\u05E4\u05B6\u05BC\u05D8\u05B0\u05E8\u05D5\u05B9\u05E1 \u05D0', ch:5, prefix:'1pe-ch' },
          { id:'2pe', en:'2 Peter', heb:'\u05E4\u05B6\u05BC\u05D8\u05B0\u05E8\u05D5\u05B9\u05E1 \u05D1', ch:3, prefix:'2pe-ch' },
          { id:'1jn', en:'1 John', heb:'\u05D9\u05D5\u05B9\u05D7\u05B8\u05E0\u05B8\u05DF \u05D0', ch:5, prefix:'1jn-ch' },
          { id:'2jn', en:'2 John', heb:'\u05D9\u05D5\u05B9\u05D7\u05B8\u05E0\u05B8\u05DF \u05D1', ch:1, prefix:'2jn-ch' },
          { id:'3jn', en:'3 John', heb:'\u05D9\u05D5\u05B9\u05D7\u05B8\u05E0\u05B8\u05DF \u05D2', ch:1, prefix:'3jn-ch' },
          { id:'jude', en:'Jude', heb:'\u05D9\u05B0\u05D4\u05D5\u05BC\u05D3\u05B8\u05D4', ch:1, prefix:'jude-ch' }
        ]},
        { name: '\u05D7\u05D6\u05D5\u05DF \u00B7 Prophecy', books: [
          { id:'rev', en:'Revelation', heb:'\u05D7\u05B8\u05D6\u05D5\u05B9\u05DF \u05D9\u05D5\u05B9\u05D7\u05B8\u05E0\u05B8\u05DF', ch:22, prefix:'rev-ch' }
        ]}
      ]
    },
    bom: {
      key: 'bom', name: 'Book of Mormon', heb:'\u05E1\u05E4\u05E8 \u05DE\u05D5\u05E8\u05DE\u05D5\u05DF', abbr:'\u05E1.\u05DE',
      page: 'bom/bom.html',
      divisions: [
        { name: '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter', books: [
          { id:'intro', en:'To the Reader', heb:'\u05D0\u05DC \u05D4\u05E7\u05D5\u05E8\u05D0', ch:1, prefix:'intro', isFront:true },
          { id:'front-translator', en:"Translator's Preface", heb:'\u05D4\u05E7\u05D3\u05DE\u05EA \u05D4\u05DE\u05EA\u05E8\u05D2\u05DD', ch:1, prefix:'front-translator', isFront:true },
          { id:'front-titlepage', en:'Title Page', heb:'\u05D3\u05E3 \u05D4\u05E9\u05E2\u05E8', ch:1, prefix:'front-titlepage', isFront:true },
          { id:'front-introduction', en:'Introduction', heb:'\u05DE\u05D1\u05D5\u05D0', ch:1, prefix:'front-introduction', isFront:true },
          { id:'front-three', en:'Three Witnesses', heb:'\u05E9\u05DC\u05E9\u05EA \u05D4\u05E2\u05D3\u05D9\u05DD', ch:1, prefix:'front-three', isFront:true },
          { id:'front-eight', en:'Eight Witnesses', heb:'\u05E9\u05DE\u05D5\u05E0\u05D4 \u05E2\u05D3\u05D9\u05DD', ch:1, prefix:'front-eight', isFront:true },
          { id:'front-js', en:'Joseph Smith', heb:'\u05D9\u05D5\u05E1\u05E3 \u05E1\u05DE\u05D9\u05EA', ch:1, prefix:'front-js', isFront:true },
          { id:'front-brief', en:'Brief Explanation', heb:'\u05D4\u05E1\u05D1\u05E8 \u05E7\u05E6\u05E8', ch:1, prefix:'front-brief', isFront:true },
          { id:'front-hebrew-guide', en:'Hebrew Guide', heb:'\u05DE\u05D3\u05E8\u05D9\u05DA \u05E2\u05D1\u05E8\u05D9\u05EA', ch:1, prefix:'front-hebrew-guide', isFront:true }
        ]},
        { name: '\u05DC\u05D5\u05D7\u05D5\u05EA \u05E7\u05D8\u05E0\u05D9\u05DD \u00B7 Small Plates', books: [
          { id:'1ne', en:'1 Nephi', heb:"\u05E0\u05B6\u05E4\u05B4\u05D9 \u05D0\u05F3", ch:22, prefix:'ch' },
          { id:'2ne', en:'2 Nephi', heb:"\u05E0\u05B6\u05E4\u05B4\u05D9 \u05D1\u05F3", ch:33, prefix:'2n-ch' },
          { id:'jac', en:'Jacob', heb:'\u05D9\u05B7\u05E2\u05B2\u05E7\u05B9\u05D1', ch:7, prefix:'jc-ch' },
          { id:'eno', en:'Enos', heb:'\u05D0\u05B1\u05E0\u05D5\u05B9\u05E9\u05C1', ch:1, prefix:'en-ch' },
          { id:'jar', en:'Jarom', heb:'\u05D9\u05B8\u05E8\u05D5\u05B9\u05DD', ch:1, prefix:'jr-ch' },
          { id:'omn', en:'Omni', heb:'\u05E2\u05B8\u05DE\u05B0\u05E0\u05B4\u05D9', ch:1, prefix:'om-ch' }
        ]},
        { name: '\u05DC\u05D5\u05D7\u05D5\u05EA \u05D2\u05D3\u05D5\u05DC\u05D9\u05DD \u00B7 Large Plates', books: [
          { id:'wom', en:'Words of Mormon', heb:'\u05D3\u05B4\u05BC\u05D1\u05B0\u05E8\u05B5\u05D9 \u05DE\u05D5\u05B9\u05E8\u05B0\u05DE\u05D5\u05B9\u05DF', ch:1, prefix:'wm-ch' },
          { id:'mos', en:'Mosiah', heb:'\u05DE\u05D5\u05B9\u05E9\u05B4\u05C1\u05D9\u05B8\u05BC\u05D4', ch:29, prefix:'mo-ch' },
          { id:'alm', en:'Alma', heb:'\u05D0\u05B7\u05DC\u05B0\u05DE\u05B8\u05D0', ch:63, prefix:'al-ch' },
          { id:'hel', en:'Helaman', heb:'\u05D4\u05B5\u05D9\u05DC\u05B8\u05DE\u05B8\u05DF', ch:16, prefix:'he-ch' },
          { id:'3ne', en:'3 Nephi', heb:"\u05E0\u05B6\u05E4\u05B4\u05D9 \u05D2\u05F3", ch:30, prefix:'3n-ch' },
          { id:'4ne', en:'4 Nephi', heb:"\u05E0\u05B6\u05E4\u05B4\u05D9 \u05D3\u05F3", ch:1, prefix:'4n-ch' }
        ]},
        { name: '\u05DC\u05D5\u05D7\u05D5\u05EA \u05DE\u05D5\u05E8\u05DE\u05D5\u05DF \u00B7 Plates of Mormon', books: [
          { id:'mrm', en:'Mormon', heb:'\u05DE\u05D5\u05B9\u05E8\u05B0\u05DE\u05D5\u05B9\u05DF', ch:9, prefix:'mm-ch' },
          { id:'eth', en:'Ether', heb:'\u05E2\u05B5\u05EA\u05B6\u05E8', ch:15, prefix:'et-ch' },
          { id:'mro', en:'Moroni', heb:'\u05DE\u05D5\u05B9\u05E8\u05D5\u05B9\u05E0\u05B4\u05D9', ch:10, prefix:'mr-ch' }
        ]}
      ]
    },
    dc: {
      key: 'dc', name: 'D&C', heb:'\u05EA\u05D5\u05E8\u05D4 \u05D5\u05D1\u05E8\u05D9\u05EA\u05D5\u05EA', abbr:'\u05EA\u05D5',
      page: 'dc.html',
      divisions: [
        { name: '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter', books: [
          { id:'dc-intro', en:'Introduction', heb:'\u05DE\u05B8\u05D1\u05D5\u05B9\u05D0', ch:1, prefix:'dc-intro', isFront:true },
          { id:'dc-chron', en:'Chronological Order', heb:'\u05E1\u05B5\u05D3\u05B6\u05E8 \u05DB\u05B0\u05BC\u05E8\u05D5\u05B9\u05E0\u05D5\u05B9\u05DC\u05D5\u05B9\u05D2\u05B4\u05D9', ch:1, prefix:'dc-chron', isFront:true }
        ]},
        { name: '\u05E1\u05E2\u05D9\u05E4\u05D9\u05DD \u00B7 Sections', books: (function() {
          var books = [];
          for (var i = 1; i <= 138; i++) {
            books.push({ id:'dc'+i, en:'Section '+i, heb:'\u05E1\u05E2\u05D9\u05E3 '+toHebNum(i), ch:1, prefix:'dc'+i+'-ch', isSection:true, secNum:i });
          }
          return books;
        })()},
        { name: '\u05D4\u05DB\u05E8\u05D6\u05D5\u05EA \u00B7 Official Declarations', books: [
          { id:'od1', en:'OD 1', heb:'\u05D4\u05DB\u05E8\u05D6\u05D4 \u05D0', ch:1, prefix:'od1-ch' },
          { id:'od2', en:'OD 2', heb:'\u05D4\u05DB\u05E8\u05D6\u05D4 \u05D1', ch:1, prefix:'od2-ch' }
        ]}
      ]
    },
    pgp: {
      key: 'pgp', name: 'Pearl of Great Price', heb:'\u05E4\u05E0\u05D9\u05E0\u05EA \u05D4\u05DE\u05D7\u05D9\u05E8 \u05D4\u05D2\u05D3\u05D5\u05DC', abbr:'\u05E4\u05E0\u05D9\u05E0\u05EA',
      page: 'pgp.html',
      divisions: [
        { name: '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter', books: [
          { id:'pgp-intro', en:'Introduction', heb:'\u05DE\u05B8\u05D1\u05D5\u05B9\u05D0', ch:1, prefix:'pgp-intro', isFront:true }
        ]},
        { name: '', books: [
          { id:'ms', en:'Moses', heb:'\u05DE\u05D5\u05B9\u05E9\u05B6\u05C1\u05D4', ch:8, prefix:'ms-ch' },
          { id:'ab', en:'Abraham', heb:'\u05D0\u05B7\u05D1\u05B0\u05E8\u05B8\u05D4\u05B8\u05DD', ch:5, prefix:'ab-ch' },
          { id:'jsm', en:'JS\u2014Matthew', heb:'\u05D9\u05D5\u05B9\u05E1\u05B5\u05E3 \u05E1\u05DE\u05D9\u05EA\u2014\u05DE\u05EA\u05EA\u05D9\u05D4\u05D5', ch:1, prefix:'jsm-ch' },
          { id:'jsh', en:'JS\u2014History', heb:'\u05D9\u05D5\u05B9\u05E1\u05B5\u05E3 \u05E1\u05DE\u05D9\u05EA\u2014\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4', ch:1, prefix:'jsh-ch' },
          { id:'aof', en:'Articles of Faith', heb:'\u05E2\u05B4\u05E7\u05B0\u05E8\u05B5\u05D9 \u05D4\u05B8\u05D0\u05B1\u05DE\u05D5\u05BC\u05E0\u05B8\u05D4', ch:1, prefix:'aof-ch' }
        ]}
      ]
    },
    jst: {
      key: 'jst', name: 'JST', heb:'\u05EA\u05B7\u05BC\u05E8\u05B0\u05D2\u05BC\u05D5\u05BC\u05DD \u05D9\u05D5\u05B9\u05E1\u05B5\u05E3 \u05E1\u05B0\u05DE\u05B4\u05D9\u05EA', abbr:'\u05EA.\u05D2.\u05E1',
      page: 'jst.html',
      divisions: [
        { name: '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter', books: [
          { id:'jst-intro', en:'Introduction', heb:'\u05DE\u05B8\u05D1\u05D5\u05B9\u05D0', ch:1, prefix:'jst-intro', isFront:true }
        ]},
        { name: '\u05EA\u05E0\u05F4\u05DA \u00B7 Old Testament', books: [
          { id:'jstgen', en:'Genesis', heb:'\u05D1\u05B0\u05BC\u05E8\u05B5\u05D0\u05E9\u05B4\u05C1\u05D9\u05EA', ch:9, prefix:'jstgen-ch' },
          { id:'jstexo', en:'Exodus', heb:'\u05E9\u05B0\u05C1\u05DE\u05D5\u05B9\u05EA', ch:6, prefix:'jstexo-ch' },
          { id:'jstdeu', en:'Deuteronomy', heb:'\u05D3\u05B0\u05BC\u05D1\u05B8\u05E8\u05B4\u05D9\u05DD', ch:1, prefix:'jstdeu-ch' },
          { id:'jst1sa', en:'1 Samuel', heb:'\u05E9\u05B0\u05C1\u05DE\u05D5\u05BC\u05D0\u05B5\u05DC \u05D0', ch:1, prefix:'jst1sa-ch' },
          { id:'jst2sa', en:'2 Samuel', heb:'\u05E9\u05B0\u05C1\u05DE\u05D5\u05BC\u05D0\u05B5\u05DC \u05D1', ch:1, prefix:'jst2sa-ch' },
          { id:'jst1ch', en:'1 Chronicles', heb:'\u05D3\u05B4\u05BC\u05D1\u05B0\u05E8\u05B5\u05D9 \u05D4\u05B7\u05D9\u05B8\u05BC\u05DE\u05B4\u05D9\u05DD \u05D0', ch:1, prefix:'jst1ch-ch' },
          { id:'jst2ch', en:'2 Chronicles', heb:'\u05D3\u05B4\u05BC\u05D1\u05B0\u05E8\u05B5\u05D9 \u05D4\u05B7\u05D9\u05B8\u05BC\u05DE\u05B4\u05D9\u05DD \u05D1', ch:1, prefix:'jst2ch-ch' },
          { id:'jstpsa', en:'Psalms', heb:'\u05EA\u05B0\u05BC\u05D4\u05B4\u05DC\u05B4\u05BC\u05D9\u05DD', ch:4, prefix:'jstpsa-ch' },
          { id:'jstisa', en:'Isaiah', heb:'\u05D9\u05B0\u05E9\u05B7\u05C1\u05E2\u05B0\u05D9\u05B8\u05D4\u05D5\u05BC', ch:2, prefix:'jstisa-ch' },
          { id:'jstjer', en:'Jeremiah', heb:'\u05D9\u05B4\u05E8\u05B0\u05DE\u05B0\u05D9\u05B8\u05D4\u05D5\u05BC', ch:1, prefix:'jstjer-ch' },
          { id:'jstamo', en:'Amos', heb:'\u05E2\u05B8\u05DE\u05D5\u05B9\u05E1', ch:1, prefix:'jstamo-ch' }
        ]},
        { name: '\u05D1\u05E8\u05D9\u05EA \u05D4\u05D7\u05D3\u05E9\u05D4 \u00B7 New Testament', books: [
          { id:'jstmatt', en:'Matthew', heb:'\u05DE\u05B7\u05EA\u05B4\u05BC\u05EA\u05B0\u05D9\u05B8\u05D4\u05D5\u05BC', ch:17, prefix:'jstmatt-ch' },
          { id:'jstmark', en:'Mark', heb:'\u05DE\u05B7\u05E8\u05B0\u05E7\u05D5\u05B9\u05E1', ch:8, prefix:'jstmark-ch' },
          { id:'jstluke', en:'Luke', heb:'\u05DC\u05D5\u05BC\u05E7\u05B8\u05E1', ch:14, prefix:'jstluke-ch' },
          { id:'jstjohn', en:'John', heb:'\u05D9\u05D5\u05B9\u05D7\u05B8\u05E0\u05B8\u05DF', ch:5, prefix:'jstjohn-ch' },
          { id:'jstacts', en:'Acts', heb:'\u05DE\u05B7\u05E2\u05B2\u05E9\u05B5\u05C2\u05D9', ch:2, prefix:'jstacts-ch' },
          { id:'jstrom', en:'Romans', heb:'\u05E8\u05D5\u05B9\u05DE\u05B4\u05D9\u05B4\u05BC\u05D9\u05DD', ch:5, prefix:'jstrom-ch' },
          { id:'jst1co', en:'1 Corinthians', heb:'\u05E7\u05D5\u05B9\u05E8\u05B4\u05E0\u05B0\u05EA\u05B4\u05BC\u05D9\u05B4\u05DD \u05D0', ch:2, prefix:'jst1co-ch' },
          { id:'jst2co', en:'2 Corinthians', heb:'\u05E7\u05D5\u05B9\u05E8\u05B4\u05E0\u05B0\u05EA\u05B4\u05BC\u05D9\u05B4\u05DD \u05D1', ch:1, prefix:'jst2co-ch' },
          { id:'jstgal', en:'Galatians', heb:'\u05D2\u05B8\u05BC\u05DC\u05B8\u05D8\u05B4\u05D9\u05B4\u05DD', ch:1, prefix:'jstgal-ch' },
          { id:'jsteph', en:'Ephesians', heb:'\u05D0\u05B6\u05E4\u05B0\u05E1\u05B4\u05D9\u05B4\u05DD', ch:1, prefix:'jsteph-ch' },
          { id:'jstcol', en:'Colossians', heb:'\u05E7\u05D5\u05B9\u05DC\u05D5\u05B9\u05E1\u05B4\u05D9\u05B4\u05DD', ch:1, prefix:'jstcol-ch' },
          { id:'jst1th', en:'1 Thessalonians', heb:'\u05EA\u05B6\u05BC\u05E1\u05B7\u05DC\u05D5\u05B9\u05E0\u05B4\u05D9\u05E7\u05B4\u05D9\u05DD \u05D0', ch:1, prefix:'jst1th-ch' },
          { id:'jst2th', en:'2 Thessalonians', heb:'\u05EA\u05B6\u05BC\u05E1\u05B7\u05DC\u05D5\u05B9\u05E0\u05B4\u05D9\u05E7\u05B4\u05D9\u05DD \u05D1', ch:1, prefix:'jst2th-ch' },
          { id:'jst1ti', en:'1 Timothy', heb:'\u05D8\u05B4\u05D9\u05DE\u05D5\u05B9\u05EA\u05B0\u05D0\u05D5\u05B9\u05E1 \u05D0', ch:3, prefix:'jst1ti-ch' },
          { id:'jstheb', en:'Hebrews', heb:'\u05E2\u05B4\u05D1\u05B0\u05E8\u05B4\u05D9\u05B4\u05DD', ch:5, prefix:'jstheb-ch' },
          { id:'jstjas', en:'James', heb:'\u05D9\u05B7\u05E2\u05B2\u05E7\u05B9\u05D1', ch:2, prefix:'jstjas-ch' },
          { id:'jst1pe', en:'1 Peter', heb:'\u05E4\u05B6\u05BC\u05D8\u05B0\u05E8\u05D5\u05B9\u05E1 \u05D0', ch:2, prefix:'jst1pe-ch' },
          { id:'jst2pe', en:'2 Peter', heb:'\u05E4\u05B6\u05BC\u05D8\u05B0\u05E8\u05D5\u05B9\u05E1 \u05D1', ch:1, prefix:'jst2pe-ch' },
          { id:'jst1jn', en:'1 John', heb:'\u05D9\u05D5\u05B9\u05D7\u05B8\u05E0\u05B8\u05DF \u05D0', ch:3, prefix:'jst1jn-ch' },
          { id:'jstrev', en:'Revelation', heb:'\u05D7\u05B8\u05D6\u05D5\u05B9\u05DF', ch:5, prefix:'jstrev-ch' }
        ]}
      ]
    }
  };

  // ── State ──
  var _config = null;
  var _sidebarEl = null;
  var _overlayEl = null;
  var _breadcrumbEl = null;
  var _searchInput = null;
  var _searchResults = null;
  var _libraryEl = null;
  var _tabsRowEl = null;
  var _bookListEl = null;
  var _activeVolTab = null;
  var _expandedBook = null;
  var _searchIdx = -1;
  var _focusedBookId = null;
  var _viewMode = 'library'; // 'library' | 'books'

  // ── Build flat search index ──
  var _searchIndex = [];
  (function buildSearchIndex() {
    var volKeys = ['ot','nt','bom','dc','pgp','jst'];
    volKeys.forEach(function(vk) {
      var vol = VOLUMES[vk];
      vol.divisions.forEach(function(div) {
        div.books.forEach(function(book) {
          if (book.isSection) {
            // D&C sections — add as single entry per section
            _searchIndex.push({
              en: 'D&C ' + book.secNum, heb: book.heb, vol: vk,
              volName: vol.name, page: vol.page, prefix: book.prefix,
              ch: 1, chId: book.prefix + '1'
            });
          } else {
            _searchIndex.push({
              en: book.en, heb: book.heb, vol: vk,
              volName: vol.name, page: vol.page, prefix: book.prefix,
              ch: book.ch, id: book.id
            });
          }
        });
      });
    });
  })();

  // ── Search ──
  function searchBooks(query) {
    if (!query || query.length < 1) return [];
    var q = query.toLowerCase().trim();
    // Try to parse "Book Chapter" pattern
    var chMatch = q.match(/^(.+?)\s+(\d+)$/);
    var bookQ = chMatch ? chMatch[1] : q;
    var chNum = chMatch ? parseInt(chMatch[2], 10) : 0;

    var results = [];
    _searchIndex.forEach(function(entry) {
      var enLower = entry.en.toLowerCase();
      var score = 0;
      if (enLower === bookQ) score = 100;
      else if (enLower.indexOf(bookQ) === 0) score = 80;
      else if (enLower.indexOf(bookQ) >= 0) score = 60;
      else if (entry.heb.indexOf(q) >= 0) score = 70;
      if (score > 0) {
        results.push({ entry: entry, score: score, chNum: chNum });
      }
    });
    results.sort(function(a, b) { return b.score - a.score; });
    return results.slice(0, 8);
  }

  // ── Create DOM ──
  /** Reserve space for fixed header + optional breadcrumb + footer (iOS PWA / Safari). */
  function syncReaderPageChromePadding() {
    var pageEl = document.querySelector('.page');
    var ct = document.querySelector('.controls-top');
    var cb = document.querySelector('.controls-bottom');
    if (!pageEl || !ct) return;
    var bc = document.getElementById('nav-breadcrumb');
    var topPx;
    if (bc && bc.classList.contains('visible')) {
      topPx = ct.offsetHeight + bc.offsetHeight + 16;
    } else {
      topPx = ct.offsetHeight + 12;
    }
    pageEl.style.paddingTop = topPx + 'px';
    if (cb) {
      pageEl.style.paddingBottom = (cb.offsetHeight + 20) + 'px';
    }
  }

  function createSidebar() {
    // Overlay
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'nav-overlay';
    _overlayEl.addEventListener('click', function(e) {
      // Only close if clicking directly on the overlay, not on sidebar content
      if (e.target === _overlayEl) closeSidebar();
    });
    document.body.appendChild(_overlayEl);

    // Sidebar
    _sidebarEl = document.createElement('div');
    _sidebarEl.id = 'nav-sidebar';
    // Prevent clicks inside sidebar from propagating to overlay or page handlers
    _sidebarEl.addEventListener('click', function(e) { e.stopPropagation(); });

    // Search bar
    var searchWrap = document.createElement('div');
    searchWrap.className = 'nav-search-wrap';

    function _homeHref() {
      var p = (window.location && window.location.pathname) ? window.location.pathname : '';
      // bom/bom.html sits one folder deeper than the other volumes
      return (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../index.html' : 'index.html';
    }
    function goHome() { window.location.href = _homeHref(); }
    function goBack() {
      var before = window.location.href;
      try { window.history.back(); } catch (e) { goHome(); return; }
      setTimeout(function() {
        if (window.location.href === before) goHome();
      }, 250);
    }

    var backBtn = document.createElement('button');
    backBtn.className = 'nav-icon-btn';
    backBtn.innerHTML = '&#8592;';
    backBtn.title = 'Back';
    backBtn.setAttribute('aria-label', 'Back');
    backBtn.onclick = goBack;

    var homeBtn = document.createElement('button');
    homeBtn.className = 'nav-icon-btn';
    homeBtn.innerHTML = '&#8962;';
    homeBtn.title = 'Home';
    homeBtn.setAttribute('aria-label', 'Home');
    homeBtn.onclick = goHome;

    var libraryBtn = document.createElement('button');
    libraryBtn.className = 'nav-icon-btn';
    libraryBtn.innerHTML = '&#9776;'; // ☰
    libraryBtn.title = 'Library';
    libraryBtn.setAttribute('aria-label', 'Library');
    libraryBtn.onclick = function() {
      try {
        _focusedBookId = null;
        if (_searchInput) _searchInput.value = '';
        if (_searchResults) { _searchResults.classList.remove('open'); _searchResults.innerHTML = ''; }
        _searchIdx = -1;
        setViewMode('library');
      } catch(e) {}
    };

    _searchInput = document.createElement('input');
    _searchInput.type = 'text';
    _searchInput.placeholder = 'Jump to verse… (e.g. Isaiah 53) — / or Ctrl+K';
    _searchInput.oninput = onSearchInput;
    _searchInput.onkeydown = onSearchKeydown;
    var closeBtn = document.createElement('button');
    closeBtn.className = 'nav-close-btn';
    closeBtn.innerHTML = '\u2715';
    closeBtn.onclick = closeSidebar;
    searchWrap.appendChild(backBtn);
    searchWrap.appendChild(homeBtn);
    searchWrap.appendChild(libraryBtn);
    searchWrap.appendChild(_searchInput);
    searchWrap.appendChild(closeBtn);
    _sidebarEl.appendChild(searchWrap);

    // Search results
    _searchResults = document.createElement('div');
    _searchResults.className = 'nav-search-results';
    _sidebarEl.appendChild(_searchResults);

    // Library view container (default)
    _libraryEl = document.createElement('div');
    _libraryEl.id = 'nav-library';
    _libraryEl.className = 'nav-library';
    _sidebarEl.appendChild(_libraryEl);

    // Volume tabs
    _tabsRowEl = document.createElement('div');
    _tabsRowEl.className = 'nav-vol-tabs';
    _tabsRowEl.id = 'nav-vol-tabs';
    var volKeys = ['ot','nt','bom','dc','pgp','jst'];
    volKeys.forEach(function(vk) {
      var vol = VOLUMES[vk];
      var tab = document.createElement('div');
      tab.className = 'nav-vol-tab' + (vk === _config.volume ? ' active' : '');
      tab.setAttribute('data-vol', vk);
      tab.innerHTML = '<span class="vt-heb">' + vol.abbr + '</span><span class="vt-en">' + vol.name + '</span>';
      tab.onclick = function() { switchVolTab(vk); };
      _tabsRowEl.appendChild(tab);
    });
    _sidebarEl.appendChild(_tabsRowEl);

    // Book list container
    _bookListEl = document.createElement('div');
    _bookListEl.className = 'nav-book-list';
    _bookListEl.id = 'nav-book-list';
    _sidebarEl.appendChild(_bookListEl);

    document.body.appendChild(_sidebarEl);

    // Offline indicator (site-wide when NavEngine is initialized)
    var offBanner = document.createElement('div');
    offBanner.id = 'nav-offline-banner';
    offBanner.setAttribute('role', 'status');
    offBanner.setAttribute('aria-live', 'polite');
    offBanner.style.cssText = 'display:none;position:fixed;bottom:0;left:0;right:0;z-index:6000;padding:10px 16px;text-align:center;font-size:0.88em;line-height:1.35;background:#3d2914;color:#f5e6c8;border-top:1px solid var(--accent,#c8a84e);font-family:\'David Libre\',Georgia,serif;';
    offBanner.textContent = 'You appear to be offline. Reconnect to load new pages, or open a volume you already saved for offline reading.';
    function syncOfflineBanner() {
      try {
        offBanner.style.display = typeof navigator !== 'undefined' && navigator.onLine === false ? 'block' : 'none';
      } catch (e) {}
    }
    window.addEventListener('online', syncOfflineBanner);
    window.addEventListener('offline', syncOfflineBanner);
    document.body.appendChild(offBanner);
    setTimeout(syncOfflineBanner, 0);

    // Study tools live in #xref-panel (right drawer); wired after DOM/markup loads
    setTimeout(function() {
      mountStudyToolsIntoXrefPanel();
      renderBookmarks();
      renderOfflineStatus();
    }, 0);

    // Default: show Library view (reader pages switch to Books when sidebar opens)
    setViewMode('library');

    // Breadcrumb
    _breadcrumbEl = document.getElementById('nav-breadcrumb');
    if (!_breadcrumbEl) {
      _breadcrumbEl = document.createElement('div');
      _breadcrumbEl.id = 'nav-breadcrumb';
      var controlsTop = document.querySelector('.controls-top');
      if (controlsTop && controlsTop.nextElementSibling) {
        controlsTop.parentNode.insertBefore(_breadcrumbEl, controlsTop.nextElementSibling);
      } else if (controlsTop) {
        controlsTop.parentNode.appendChild(_breadcrumbEl);
      }
    }
    updateBreadcrumb();

    // Ensure page padding clears fixed header + breadcrumb + footer (layout varies by screen / iOS safe areas)
    function _fixPagePadding() {
      syncReaderPageChromePadding();
    }
    setTimeout(_fixPagePadding, 50);
    setTimeout(_fixPagePadding, 300);
    window.addEventListener('load', _fixPagePadding);
    window.addEventListener('resize', _fixPagePadding);
  }

  function setViewMode(mode) {
    _viewMode = mode === 'books' ? 'books' : 'library';
    if (_libraryEl) _libraryEl.style.display = (_viewMode === 'library') ? 'block' : 'none';
    if (_tabsRowEl) _tabsRowEl.style.display = (_viewMode === 'books') ? 'flex' : 'none';
    if (_bookListEl) _bookListEl.style.display = (_viewMode === 'books') ? 'block' : 'none';
    if (_viewMode === 'library') renderLibrary();
  }

  function renderLibrary() {
    if (!_libraryEl) return;
    var last = null;
    try { last = localStorage.getItem('sw-last-read'); last = last ? JSON.parse(last) : null; } catch(e) { last = null; }
    var meta = _loadOfflineMeta();
    var bms = loadBookmarks();

    function tile(vk) {
      var v = VOLUMES[vk];
      var m = meta ? meta[vk] : null;
      var status = m ? ('Downloaded') : ('Not downloaded');
      return '' +
        '<div class="nl-tile" data-vol="' + vk + '" tabindex="0" role="button">' +
          '<div class="nl-top">' +
            '<div class="nl-abbr">' + (v.abbr || vk.toUpperCase()) + '</div>' +
            '<div class="nl-name">' + v.name + '</div>' +
          '</div>' +
          '<div class="nl-sub">' + status + '</div>' +
        '</div>';
    }

    var html = '';
    html += '<div class="nl-sec-title">Library</div>';

    if (last && last.path) {
      html += '<div class="nl-card nl-last" id="nl-last" tabindex="0" role="button">' +
                '<div class="nl-card-title">Continue</div>' +
                '<div class="nl-card-text">' + (last.label || 'Continue reading') + '</div>' +
                (last.heb ? '<div class="nl-card-heb" dir="rtl">' + last.heb + '</div>' : '') +
              '</div>';
    }

    // Learn Hebrew (always available)
    html += '<div class="nl-card" id="nl-learn-hebrew" tabindex="0" role="button" style="margin-top:10px">' +
              '<div class="nl-card-title">Learn Biblical Hebrew</div>' +
              '<div class="nl-card-text">Reading game + daily review</div>' +
              '<div class="nl-card-heb" dir="rtl">לִמּוּד עִבְרִית</div>' +
            '</div>';

    // Dictionary (Strong's)
    html += '<div class="nl-card" id="nl-dict" tabindex="0" role="button" style="margin-top:10px">' +
              '<div class="nl-card-title">Dictionary</div>' +
              '<div class="nl-card-text">Strong’s Hebrew lookup + saved deck</div>' +
              '<div class="nl-card-heb" dir="rtl">מִלּוֹן</div>' +
            '</div>';

    if (bms && bms.length) {
      html += '<div class="nl-sec-title" style="margin-top:10px">Bookmarks</div>';
      html += '<div class="nl-bm-list">';
      bms.slice(0, 3).forEach(function(bm) {
        html += '<div class="nl-bm" data-path="' + (bm.path || '').replace(/"/g,'&quot;') + '" tabindex="0" role="button">' +
                  '<div class="nl-bm-title">' + (bm.label || 'Bookmark') + '</div>' +
                  (bm.heb ? '<div class="nl-bm-heb" dir="rtl">' + bm.heb + '</div>' : '') +
                '</div>';
      });
      html += '</div>';
    }

    html += '<div class="nl-sec-title" style="margin-top:10px">Volumes</div>';
    html += '<div class="nl-grid">' + ['ot','nt','bom','dc','pgp','jst'].map(tile).join('') + '</div>';

    _libraryEl.innerHTML = html;

    var lastEl = document.getElementById('nl-last');
    if (lastEl && last && last.path) {
      lastEl.onclick = function() { window.location.href = last.path; };
      lastEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lastEl.click(); } };
    }

    var learnEl = document.getElementById('nl-learn');
    if (learnEl) {
      learnEl.onclick = function() {
        alert('Learning course has been removed.');
      };
      learnEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); learnEl.click(); } };
    }

    var learnHebEl = document.getElementById('nl-learn-hebrew');
    if (learnHebEl) {
      learnHebEl.onclick = function() {
        var p = (window.location && window.location.pathname) ? window.location.pathname : '';
        var href = (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../learn.html' : 'learn.html';
        window.location.href = href;
      };
      learnHebEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); learnHebEl.click(); } };
    }

    var dictEl = document.getElementById('nl-dict');
    if (dictEl) {
      dictEl.onclick = function() {
        var p = (window.location && window.location.pathname) ? window.location.pathname : '';
        var href = (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../dictionary.html' : 'dictionary.html';
        window.location.href = href;
      };
      dictEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dictEl.click(); } };
    }
    _libraryEl.querySelectorAll('.nl-bm').forEach(function(el) {
      el.onclick = function() { var p = el.getAttribute('data-path'); if (p) window.location.href = p; };
      el.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } };
    });
    _libraryEl.querySelectorAll('.nl-tile').forEach(function(el) {
      function go() {
        var vk = el.getAttribute('data-vol');
        if (!vk) return;
        _focusedBookId = null;
        setViewMode('books');
        switchVolTab(vk);
      }
      el.onclick = go;
      el.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
  }

  function _downloadJson(filename, obj) {
    try {
      var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    } catch(e) {
      alert('Export failed: ' + (e && e.message ? e.message : e));
    }
  }

  async function exportNotes() {
    if (!window.NotesEngine || !window.NotesEngine.exportAll) {
      alert('Notes are not available on this page yet. Open a scripture page and try again.');
      return;
    }
    try {
      var payload = await window.NotesEngine.exportAll();
      var ts = new Date().toISOString().replace(/[:.]/g,'-');
      _downloadJson('standard-works-notes-' + ts + '.json', payload);
    } catch(e) {
      alert('Export failed: ' + (e && e.message ? e.message : e));
    }
  }

  function importNotesPrompt() {
    if (!window.NotesEngine || !window.NotesEngine.importAll) {
      alert('Notes are not available on this page yet. Open a scripture page and try again.');
      return;
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    input.onchange = function() {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = async function() {
        try {
          var payload = JSON.parse(reader.result);
          await window.NotesEngine.importAll(payload, { mode: 'merge' });
          alert('Import complete.');
        } catch(e) {
          alert('Import failed: ' + (e && e.message ? e.message : e));
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(function() { try { document.body.removeChild(input); } catch(e) {} }, 0);
  }

  // ── Offline Download (per volume) ──
  var OFFLINE_META_KEY = 'sw-offline-volumes-v1';
  function _loadOfflineMeta() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_META_KEY) || '{}') || {}; } catch(e) { return {}; }
  }
  function _saveOfflineMeta(meta) {
    try { localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(meta || {})); } catch(e) {}
  }
  function _offlineAssetsForCurrentVolume() {
    if (!_config || !_config.volume) return [];
    var vk = _config.volume;
    if (vk === 'ot') return ['ot.html'].concat([
      'ot_verses/gen.js','ot_verses/exo.js','ot_verses/lev.js','ot_verses/num.js','ot_verses/deu.js','ot_verses/jos.js','ot_verses/jdg.js',
      'ot_verses/1sa.js','ot_verses/2sa.js','ot_verses/1ki.js','ot_verses/2ki.js','ot_verses/isa.js','ot_verses/jer.js','ot_verses/eze.js',
      'ot_verses/hos.js','ot_verses/joe.js','ot_verses/amo.js','ot_verses/oba.js','ot_verses/jon.js','ot_verses/mic.js','ot_verses/nah.js',
      'ot_verses/hab.js','ot_verses/zep.js','ot_verses/hag.js','ot_verses/zec.js','ot_verses/mal.js','ot_verses/psa.js','ot_verses/pro.js',
      'ot_verses/job.js','ot_verses/sos.js','ot_verses/rth.js','ot_verses/lam.js','ot_verses/ecc.js','ot_verses/est.js','ot_verses/dan.js',
      'ot_verses/ezr.js','ot_verses/neh.js','ot_verses/1ch.js','ot_verses/2ch.js'
    ]);
    if (vk === 'nt') return ['nt.html'].concat([
      'nt_verses/matt.js','nt_verses/mark.js','nt_verses/luke.js','nt_verses/john.js','nt_verses/acts.js','nt_verses/rom.js','nt_verses/1co.js',
      'nt_verses/2co.js','nt_verses/gal.js','nt_verses/eph.js','nt_verses/php.js','nt_verses/col.js','nt_verses/1th.js','nt_verses/2th.js',
      'nt_verses/1ti.js','nt_verses/2ti.js','nt_verses/tit.js','nt_verses/phm.js','nt_verses/heb.js','nt_verses/jas.js','nt_verses/1pe.js',
      'nt_verses/2pe.js','nt_verses/1jn.js','nt_verses/2jn.js','nt_verses/3jn.js','nt_verses/jude.js','nt_verses/rev.js'
    ]);
    if (vk === 'dc') return ['dc.html'].concat([
      'dc_verses/dc1_10.js','dc_verses/dc11_20.js','dc_verses/dc21_30.js','dc_verses/dc31_40.js','dc_verses/dc41_50.js','dc_verses/dc51_60.js',
      'dc_verses/dc61_70.js','dc_verses/dc71_80.js','dc_verses/dc81_90.js','dc_verses/dc91_100.js','dc_verses/dc101_110.js','dc_verses/dc109.js',
      'dc_verses/dc111_120.js','dc_verses/dc121_130.js','dc_verses/dc131_138.js','dc_verses/dc_chron.js','dc_verses/dc_intro.js','dc_verses/od.js'
    ]);
    if (vk === 'pgp') return ['pgp.html'].concat([
      'pgp_verses/moses.js','pgp_verses/abraham.js','pgp_verses/js_matthew.js','pgp_verses/js_history.js','pgp_verses/articles_of_faith.js','pgp_verses/pgp_intro.js'
    ]);
    if (vk === 'jst') return ['jst.html'];
    if (vk === 'bom') return ['bom/bom.html'].concat([
      'bom/official_verses.js','bom/crossrefs.js','bom/roots_glossary.js','bom/chapter_headings.js','bom/chapter_headings_heb.js',
      'bom/scripture_verses.js','bom/topical_guide.js',
      'bom/verses/frontmatter.js','bom/verses/1nephi.js','bom/verses/2nephi.js','bom/verses/jacob.js','bom/verses/enos.js','bom/verses/jarom.js',
      'bom/verses/omni.js','bom/verses/words_of_mormon.js','bom/verses/mosiah.js','bom/verses/alma.js','bom/verses/helaman.js','bom/verses/3nephi.js',
      'bom/verses/4nephi.js','bom/verses/mormon.js','bom/verses/ether.js','bom/verses/moroni.js'
    ]);
    return [];
  }
  function _postToSW(msg) {
    return new Promise(function(resolve) {
      if (!navigator.serviceWorker) return resolve({ error: 1 });
      var done = false;
      function handler(e) {
        if (done) return;
        var d = e.data || {};
        if (d.type === 'offline:done') {
          done = true;
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(d);
        }
      }
      navigator.serviceWorker.addEventListener('message', handler);
      var sw = navigator.serviceWorker.controller;
      if (!sw) {
        navigator.serviceWorker.removeEventListener('message', handler);
        return resolve({ error: 1, noController: 1 });
      }
      sw.postMessage(msg);
    });
  }
  function offlineDownloadCurrentVolume() {
    var assets = _offlineAssetsForCurrentVolume();
    if (!assets.length) return;
    var btn = document.getElementById('xref-offline-dl');
    if (btn) { btn.disabled = true; btn.textContent = 'Downloading…'; }
    _postToSW({ type: 'offline:download', assets: assets }).then(function(r) {
      var meta = _loadOfflineMeta();
      meta[_config.volume] = { ts: Date.now(), count: assets.length };
      _saveOfflineMeta(meta);
      if (btn) { btn.disabled = false; btn.textContent = 'Download'; }
      renderOfflineStatus();
      if (r && r.noController) alert('Offline download queued. Please refresh once to enable it.');
    });
  }
  function offlineRemoveCurrentVolume() {
    var assets = _offlineAssetsForCurrentVolume();
    if (!assets.length) return;
    var btn = document.getElementById('xref-offline-rm');
    if (btn) { btn.disabled = true; btn.textContent = 'Removing…'; }
    _postToSW({ type: 'offline:remove', assets: assets }).then(function() {
      var meta = _loadOfflineMeta();
      delete meta[_config.volume];
      _saveOfflineMeta(meta);
      if (btn) { btn.disabled = false; btn.textContent = 'Remove'; }
      renderOfflineStatus();
    });
  }
  function renderOfflineStatus() {
    if (!_config || !_config.volume) return;
    var el = document.getElementById('xref-offline-status');
    if (!el) return;
    var meta = _loadOfflineMeta();
    var m = meta[_config.volume];
    if (!m) el.textContent = 'Not downloaded.';
    else el.textContent = 'Downloaded (' + (m.count || '?') + ' files).';
  }

  /** Wire Study panel buttons (learn / notes migration / bookmarks / backup / offline) — lives in page HTML (#xref-pane-*) */
  function mountStudyToolsIntoXrefPanel() {
    if (!document.getElementById('xref-pane-more')) return;
    function courseHref() {
      var p = (window.location && window.location.pathname) ? window.location.pathname : '';
      return (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../learn.html' : 'learn.html';
    }
    function vocabHref() {
      var p = (window.location && window.location.pathname) ? window.location.pathname : '';
      return (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../vocab.html' : 'vocab.html';
    }
    function dictHref() {
      var p = (window.location && window.location.pathname) ? window.location.pathname : '';
      return (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../dictionary.html' : 'dictionary.html';
    }
    var lc = document.getElementById('xref-sp-course');
    if (lc) lc.onclick = function() { window.location.href = courseHref(); };
    var lv = document.getElementById('xref-sp-vocab');
    if (lv) lv.onclick = function() { window.location.href = vocabHref(); };
    var ld = document.getElementById('xref-sp-dict');
    if (ld) ld.onclick = function() { window.location.href = dictHref(); };

    var ex = document.getElementById('xref-ne-export');
    var im = document.getElementById('xref-ne-import');
    if (ex) ex.onclick = exportNotes;
    if (im) im.onclick = importNotesPrompt;

    var bmAdd = document.getElementById('xref-bm-add');
    var bmClr = document.getElementById('xref-bm-clear');
    if (bmAdd) bmAdd.onclick = addBookmarkCurrent;
    if (bmClr) bmClr.onclick = clearBookmarks;

    var bex = document.getElementById('xref-bk-export');
    var bim = document.getElementById('xref-bk-import');
    if (bex) bex.onclick = exportBackup;
    if (bim) bim.onclick = importBackupPrompt;

    var odl = document.getElementById('xref-offline-dl');
    var orm = document.getElementById('xref-offline-rm');
    if (odl) odl.onclick = offlineDownloadCurrentVolume;
    if (orm) orm.onclick = offlineRemoveCurrentVolume;

    var ann = document.getElementById('xref-open-annotations');
    if (ann) {
      ann.onclick = function() {
        try {
          if (typeof closeXrefPanel === 'function') closeXrefPanel();
        } catch (e) {}
        try {
          if (typeof openAnnotationsPanel === 'function') openAnnotationsPanel();
        } catch (e2) {}
      };
    }
  }

  function scrollNavReadingPositionIntoView() {
    if (!_bookListEl) return;
    var cur = _bookListEl.querySelector('.nav-ch-cell.current');
    if (cur) {
      try { cur.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
      return;
    }
    var openGrid = _bookListEl.querySelector('.nav-ch-grid.open');
    if (openGrid) {
      try { openGrid.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e2) {}
    }
  }

  // ── Render books for a volume ──
  function renderVolBooks(volKey) {
    var list = document.getElementById('nav-book-list');
    if (!list) return;
    list.innerHTML = '';
    _expandedBook = null;
    _activeVolTab = volKey;

    // Update tab highlight
    var tabs = _sidebarEl.querySelectorAll('.nav-vol-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-vol') === volKey);
    }

    var vol = VOLUMES[volKey];
    if (!vol) return;

    // D&C special: show section number grid instead of book list
    if (volKey === 'dc') {
      _focusedBookId = null;
      renderDCSections(list, vol);
      return;
    }

    // Focus mode: show only chapters for one specific book (but keep tabs)
    if (_focusedBookId) {
      var focusRow = document.createElement('div');
      focusRow.className = 'nav-book-row nav-focus-row';
      focusRow.innerHTML = '<span><span class="nb-en">← All books</span></span><span class="nb-heb">הַכֹּל</span>';
      focusRow.onclick = function() { _focusedBookId = null; renderVolBooks(volKey); };
      list.appendChild(focusRow);
    }

    vol.divisions.forEach(function(div) {
      if (div.name) {
        var divEl = document.createElement('div');
        divEl.className = 'nav-division';
        divEl.textContent = div.name;
        if (!_focusedBookId) list.appendChild(divEl);
      }
      div.books.forEach(function(book) {
        if (_focusedBookId && book.id !== _focusedBookId) return;
        // Book row
        var row = document.createElement('div');
        row.className = 'nav-book-row' + (book.ch === 1 ? ' single-ch' : '');
        var leftSpan = document.createElement('span');
        leftSpan.innerHTML = (book.ch > 1 ? '<span class="nb-arrow">\u25B8</span>' : '') +
          '<span class="nb-en">' + book.en + '</span>' +
          (book.ch > 1 ? '<span class="nb-ch"> \u00B7 ' + book.ch + '</span>' : '');
        var rightSpan = document.createElement('span');
        rightSpan.className = 'nb-heb';
        rightSpan.textContent = book.heb;
        row.appendChild(leftSpan);
        row.appendChild(rightSpan);

        if (book.ch === 1) {
          // Single chapter — click navigates directly
          // Front matter pages use prefix as-is; regular chapters append '1'
          row.onclick = (function(b) { var cid = b.isFront ? b.prefix : b.prefix + '1'; return function() { navigateToChapter(volKey, cid, b); }; })(book);
        } else {
          // Multi-chapter — click expands grid
          row.onclick = (function(b, r) { return function() { toggleBookGrid(volKey, b, r); }; })(book, row);
        }
        list.appendChild(row);

        // Chapter grid (hidden)
        if (book.ch > 1) {
          var grid = document.createElement('div');
          grid.className = 'nav-ch-grid' + (_focusedBookId ? ' open' : '');
          grid.setAttribute('data-book', book.id);
          for (var c = 1; c <= book.ch; c++) {
            var cell = document.createElement('div');
            cell.className = 'nav-ch-cell';
            var chId = book.prefix + c;
            if (volKey === _config.volume && chId === _config.currentChapter) {
              cell.classList.add('current');
            }
            cell.innerHTML = '<span class="ch-heb">' + toHebNum(c) + '</span><span class="ch-num">' + c + '</span>';
            cell.onclick = (function(vid, cid, b) { return function(e) { e.stopPropagation(); navigateToChapter(vid, cid, b); }; })(volKey, chId, book);
            grid.appendChild(cell);
          }
          list.appendChild(grid);
        }
      });
    });

    // Auto-expand current book if on this volume
    if (!_focusedBookId && volKey === _config.volume && _config.currentChapter) {
      autoExpandCurrentBook();
    }
  }

  function focusBook(volKey, bookId) {
    _focusedBookId = bookId || null;
    setViewMode('books');
    renderVolBooks(volKey);
    setTimeout(function() {
      var grid = _sidebarEl ? _sidebarEl.querySelector('.nav-ch-grid[data-book="' + bookId + '"]') : null;
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  // ── D&C special rendering (section grid) ──
  function renderDCSections(list, vol) {
    // Front Matter
    var frontDiv = document.createElement('div');
    frontDiv.className = 'nav-division';
    frontDiv.textContent = '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter';
    list.appendChild(frontDiv);

    var introRow = document.createElement('div');
    introRow.className = 'nav-book-row single-ch';
    introRow.innerHTML = '<span><span class="nb-en">Introduction</span></span><span class="nb-heb">\u05DE\u05B8\u05D1\u05D5\u05B9\u05D0</span>';
    if ('dc' === _config.volume && 'dc-intro' === _config.currentChapter) introRow.style.background = 'rgba(200,168,78,0.15)';
    introRow.onclick = function() { navigateToChapter('dc', 'dc-intro'); };
    list.appendChild(introRow);

    var chronRow = document.createElement('div');
    chronRow.className = 'nav-book-row single-ch';
    chronRow.innerHTML = '<span><span class="nb-en">Chronological Order</span></span><span class="nb-heb">\u05E1\u05B5\u05D3\u05B6\u05E8 \u05DB\u05B0\u05BC\u05E8\u05D5\u05B9\u05E0\u05D5\u05B9\u05DC\u05D5\u05B9\u05D2\u05B4\u05D9</span>';
    if ('dc' === _config.volume && 'dc-chron' === _config.currentChapter) chronRow.style.background = 'rgba(200,168,78,0.15)';
    chronRow.onclick = function() { navigateToChapter('dc', 'dc-chron'); };
    list.appendChild(chronRow);

    // Sections
    var secDiv = document.createElement('div');
    secDiv.className = 'nav-division';
    secDiv.textContent = '\u05E1\u05E2\u05D9\u05E4\u05D9\u05DD \u00B7 Sections';
    list.appendChild(secDiv);

    var grid = document.createElement('div');
    grid.className = 'nav-ch-grid open';
    grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    for (var i = 1; i <= 138; i++) {
      var cell = document.createElement('div');
      cell.className = 'nav-ch-cell';
      var chId = 'dc' + i + '-ch1';
      if ('dc' === _config.volume && chId === _config.currentChapter) cell.classList.add('current');
      cell.innerHTML = '<span class="ch-heb">' + toHebNum(i) + '</span><span class="ch-num">' + i + '</span>';
      cell.onclick = (function(cid) { return function() { navigateToChapter('dc', cid); }; })(chId);
      grid.appendChild(cell);
    }
    list.appendChild(grid);

    // Official Declarations
    var odDiv = document.createElement('div');
    odDiv.className = 'nav-division';
    odDiv.textContent = '\u05D4\u05DB\u05E8\u05D6\u05D5\u05EA \u00B7 Official Declarations';
    list.appendChild(odDiv);

    ['od1','od2'].forEach(function(od, idx) {
      var row = document.createElement('div');
      row.className = 'nav-book-row single-ch';
      var chId = od + '-ch1';
      row.innerHTML = '<span><span class="nb-en">Official Declaration ' + (idx+1) + '</span></span><span class="nb-heb">\u05D4\u05DB\u05E8\u05D6\u05D4 ' + toHebNum(idx+1) + '</span>';
      if ('dc' === _config.volume && chId === _config.currentChapter) row.style.background = 'rgba(200,168,78,0.15)';
      row.onclick = (function(cid) { return function() { navigateToChapter('dc', cid); }; })(chId);
      list.appendChild(row);
    });
  }

  // ── Toggle book chapter grid ──
  function toggleBookGrid(volKey, book, rowEl) {
    var grid = _sidebarEl.querySelector('.nav-ch-grid[data-book="' + book.id + '"]');
    if (!grid) return;
    var isOpen = grid.classList.contains('open');
    // Close all grids first
    var allGrids = _sidebarEl.querySelectorAll('.nav-ch-grid');
    var allRows = _sidebarEl.querySelectorAll('.nav-book-row');
    for (var i = 0; i < allGrids.length; i++) allGrids[i].classList.remove('open');
    for (var i = 0; i < allRows.length; i++) allRows[i].classList.remove('expanded');
    if (!isOpen) {
      grid.classList.add('open');
      rowEl.classList.add('expanded');
      _expandedBook = book.id;
      // Scroll grid into view
      setTimeout(function() { grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
    } else {
      _expandedBook = null;
    }
  }

  // ── Auto-expand the book containing current chapter ──
  function autoExpandCurrentBook() {
    if (!_config.currentChapter) return;
    var vol = VOLUMES[_config.volume];
    if (!vol) return;
    for (var d = 0; d < vol.divisions.length; d++) {
      var books = vol.divisions[d].books;
      for (var b = 0; b < books.length; b++) {
        if (_config.currentChapter.indexOf(books[b].prefix) === 0) {
          var grid = _sidebarEl.querySelector('.nav-ch-grid[data-book="' + books[b].id + '"]');
          var row = grid ? grid.previousElementSibling : null;
          if (grid && row) {
            grid.classList.add('open');
            row.classList.add('expanded');
            _expandedBook = books[b].id;
            setTimeout(function() {
              var cur = grid.querySelector('.current');
              if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
          return;
        }
      }
    }
  }

  // ── Navigate to a chapter ──
  function navigateToChapter(volKey, chapterId, book) {
    closeSidebar();
    // Save reading position
    saveReadingPosition(volKey, chapterId, book);

    // Home hub (index.html): always load the target volume page
    if (_config && _config.hub) {
      var volHub = VOLUMES[volKey];
      if (!volHub) return;
      var urlHub = (_config.basePath || '') + volHub.page;
      var hashHub = buildHash(volKey, chapterId);
      window.location.href = urlHub + (hashHub ? '#' + hashHub : '');
      return;
    }

    if (volKey === _config.volume) {
      // Same volume — use page's navTo
      _config.currentChapter = chapterId;
      try {
        if (_config.onNavigate) _config.onNavigate(chapterId);
      } catch(e) {
        console.error('NavEngine: navigation error for', chapterId, e);
      }
      updateBreadcrumb();
    } else {
      // Cross-volume — navigate to other page
      var vol = VOLUMES[volKey];
      if (!vol) return;
      var url = _config.basePath + vol.page;
      // Build hash from chapterId
      var hash = buildHash(volKey, chapterId);
      window.location.href = url + (hash ? '#' + hash : '');
    }
  }

  // ── Build URL hash from chapter ID ──
  function buildHash(volKey, chapterId) {
    if (volKey === 'bom') {
      // BOM uses different hash format
      var bomHashes = {
        'ch': '1-nephi-', '2n-ch': '2-nephi-', 'jc-ch': 'jacob-',
        'en-ch': 'enos-', 'jr-ch': 'jarom-', 'om-ch': 'omni-',
        'wm-ch': 'words-of-mormon-', 'mo-ch': 'mosiah-', 'al-ch': 'alma-',
        'he-ch': 'helaman-', '3n-ch': '3-nephi-', '4n-ch': '4-nephi-',
        'mm-ch': 'mormon-', 'et-ch': 'ether-', 'mr-ch': 'moroni-'
      };
      for (var prefix in bomHashes) {
        if (chapterId.indexOf(prefix) === 0) {
          var num = chapterId.replace(prefix, '');
          return bomHashes[prefix] + num;
        }
      }
    }
    // For other volumes, the hash is typically derived from the page's navTo logic
    // We return the chapterId as a reasonable hash for now
    return chapterId;
  }

  // ── Switch volume tab ──
  function switchVolTab(volKey) {
    _focusedBookId = null;
    renderVolBooks(volKey);
  }

  // ── Open / Close ──
  function openSidebar() {
    if (!_sidebarEl) return;
    // Close any conflicting page panels/overlays that might block the sidebar
    var panelOverlay = document.getElementById('panel-overlay');
    if (panelOverlay) panelOverlay.classList.remove('open');
    var glossary = document.getElementById('glossary-panel');
    if (glossary) glossary.classList.remove('open');
    var annotations = document.getElementById('annotations-panel');
    if (annotations) annotations.classList.remove('open');
    _sidebarEl.classList.add('open');
    _overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    var inReader = _config && _config.volume &&
      _config.currentChapter && _config.currentChapter !== 'landing';
    if (inReader) {
      setViewMode('books');
      switchVolTab(_config.volume);
      setTimeout(scrollNavReadingPositionIntoView, 200);
    } else {
      setViewMode('library');
      setTimeout(function() {
        try { _searchInput.focus(); } catch (e) {}
      }, 250);
    }
  }

  function closeSidebar() {
    if (!_sidebarEl) return;
    _sidebarEl.classList.remove('open');
    _overlayEl.classList.remove('open');
    document.body.style.overflow = '';
    _searchInput.value = '';
    _searchResults.classList.remove('open');
    _searchResults.innerHTML = '';
    _searchIdx = -1;
  }

  function toggleSidebar() {
    if (_sidebarEl && _sidebarEl.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  /** Open sidebar and focus the jump search field ( / and Ctrl+K ) */
  function openSidebarAndFocusSearch() {
    if (!_sidebarEl) return;
    var wasOpen = _sidebarEl.classList.contains('open');
    if (!wasOpen) openSidebar();
    setTimeout(function() {
      try {
        if (_searchInput) {
          _searchInput.focus();
          _searchInput.select();
        }
      } catch (e) {}
    }, wasOpen ? 0 : 220);
  }

  function isTypingFocusTarget(el) {
    if (!el || !el.tagName) return false;
    var t = el.tagName.toUpperCase();
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return true;
    try {
      if (el.isContentEditable) return true;
    } catch (e) {}
    return false;
  }

  // ── Search input handler ──
  function onSearchInput() {
    var q = _searchInput.value.trim();
    if (q.length < 1) {
      _searchResults.classList.remove('open');
      _searchResults.innerHTML = '';
      _searchIdx = -1;
      return;
    }
    var results = searchBooks(q);
    _searchResults.innerHTML = '';
    _searchIdx = -1;
    if (results.length === 0) {
      _searchResults.classList.remove('open');
      return;
    }
    results.forEach(function(r, idx) {
      var div = document.createElement('div');
      div.className = 'nav-search-result';
      var label = r.entry.en;
      if (r.chNum && r.chNum <= r.entry.ch) label += ' ' + r.chNum;
      div.innerHTML = '<span><span class="sr-name">' + label + '</span><span class="sr-vol"> ' + r.entry.volName + '</span></span><span class="sr-heb">' + r.entry.heb + '</span>';
      div.onclick = function() { executeSearchResult(r); };
      _searchResults.appendChild(div);
    });
    _searchResults.classList.add('open');
  }

  function onSearchKeydown(e) {
    var items = _searchResults.querySelectorAll('.nav-search-result');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _searchIdx = Math.min(_searchIdx + 1, items.length - 1);
      updateSearchHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _searchIdx = Math.max(_searchIdx - 1, 0);
      updateSearchHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_searchIdx >= 0 && items[_searchIdx]) {
        items[_searchIdx].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      closeSidebar();
    }
  }

  function updateSearchHighlight(items) {
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', i === _searchIdx);
    }
  }

  function executeSearchResult(r) {
    var chNum = r.chNum || 1;
    if (chNum > r.entry.ch) chNum = r.entry.ch;
    // If user typed a chapter number, jump there. Otherwise focus the book’s chapters.
    if (r.entry.isSection) {
      navigateToChapter(r.entry.vol, r.entry.chId);
      return;
    }
    if (r.chNum) {
      var chId = r.entry.prefix + chNum;
      navigateToChapter(r.entry.vol, chId);
      return;
    }
    // Focus the selected book so only its chapter grid shows.
    _searchInput.value = '';
    _searchResults.classList.remove('open');
    _searchResults.innerHTML = '';
    _searchIdx = -1;
    focusBook(r.entry.vol, r.entry.id);
  }

  // ── Breadcrumb ──
  function updateBreadcrumb() {
    if (!_breadcrumbEl) return;
    if (!_config.currentChapter || _config.currentChapter === 'landing') {
      _breadcrumbEl.classList.remove('visible');
      var pageEl = document.querySelector('.page');
      if (pageEl) pageEl.style.paddingTop = '';
      setTimeout(syncReaderPageChromePadding, 0);
      return;
    }
    var vol = VOLUMES[_config.volume];
    if (!vol) return;

    var bookInfo = findBook(_config.volume, _config.currentChapter);
    if (!bookInfo) { _breadcrumbEl.classList.remove('visible'); return; }

    var chNum = _config.currentChapter.replace(bookInfo.prefix, '');
    var bcHtml = '<span onclick="NavEngine.openToVolume(\'' + _config.volume + '\')">' + vol.heb + ' \u00B7 ' + vol.name + '</span>';
    bcHtml += '<span class="bc-sep">\u203A</span>';
    bcHtml += '<span onclick="NavEngine.openToBook(\'' + bookInfo.id + '\')">' + bookInfo.heb + ' \u00B7 ' + bookInfo.en + '</span>';
    if (bookInfo.ch > 1) {
      bcHtml += '<span class="bc-sep">\u203A</span>';
      bcHtml += '<span>\u05E4\u05E8\u05E7 ' + toHebNum(parseInt(chNum,10)) + ' \u00B7 Chapter ' + chNum + '</span>';
    }
    _breadcrumbEl.innerHTML = bcHtml;
    _breadcrumbEl.classList.add('visible');
    // Position below controls-top and push page content down
    var ct = document.querySelector('.controls-top');
    if (ct) {
      var bcTop = ct.offsetHeight;
      _breadcrumbEl.style.top = bcTop + 'px';
      setTimeout(function() {
        syncReaderPageChromePadding();
      }, 0);
    }
  }

  function findBook(volKey, chapterId) {
    var vol = VOLUMES[volKey];
    if (!vol) return null;
    for (var d = 0; d < vol.divisions.length; d++) {
      var books = vol.divisions[d].books;
      for (var b = 0; b < books.length; b++) {
        if (chapterId.indexOf(books[b].prefix) === 0) return books[b];
      }
    }
    return null;
  }

  // ── Reading Position Memory ──
  function saveReadingPosition(volKey, chapterId, book) {
    var vol = VOLUMES[volKey];
    if (!vol) return;
    var bookInfo = book || findBook(volKey, chapterId);
    var label = bookInfo ? bookInfo.en : '';
    var chNum = chapterId.replace(bookInfo ? bookInfo.prefix : '', '');
    if (bookInfo && bookInfo.ch > 1) label += ' ' + chNum;
    var hash = buildHash(volKey, chapterId);
    var url = vol.page + (hash ? '#' + hash : '');
    try {
      if (_config && volKey === _config.volume && typeof window !== 'undefined' && window.location && window.location.hash && window.location.hash.length > 1) {
        url = vol.page + window.location.hash;
      }
    } catch (e) {}
    try {
      localStorage.setItem('sw-last-read', JSON.stringify({
        volume: volKey, chapter: chapterId, label: label,
        heb: bookInfo ? bookInfo.heb : '', path: url, timestamp: Date.now()
      }));
    } catch(e) {}
  }

  // ── Bookmarks ──
  var BOOKMARKS_KEY = 'sw-bookmarks-v1';
  function loadBookmarks() {
    try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]') || []; } catch(e) { return []; }
  }
  function saveBookmarks(list) {
    try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list || [])); } catch(e) {}
  }
  function addBookmarkCurrent() {
    if (!_config || !_config.volume) return;
    var vol = VOLUMES[_config.volume];
    if (!vol) return;
    var chap = _config.currentChapter || 'landing';
    if (!chap || chap === 'landing') return;
    var bookInfo = findBook(_config.volume, chap);
    if (!bookInfo) return;
    var label = bookInfo.en;
    var chNum = chap.replace(bookInfo.prefix, '');
    if (bookInfo.ch > 1) label += ' ' + chNum;
    var hash = buildHash(_config.volume, chap);
    var path = vol.page + (hash ? '#' + hash : '');
    var item = { volume: _config.volume, chapter: chap, label: label, heb: bookInfo.heb, path: path, ts: Date.now() };
    var list = loadBookmarks().filter(function(b) { return !(b && b.volume === item.volume && b.chapter === item.chapter); });
    list.unshift(item);
    if (list.length > 50) list = list.slice(0, 50);
    saveBookmarks(list);
    renderBookmarks();
  }
  function clearBookmarks() {
    saveBookmarks([]);
    renderBookmarks();
  }
  function renderBookmarks() {
    var box = document.getElementById('xref-bookmarks-list');
    if (!box) return;
    var list = loadBookmarks();
    if (!list.length) {
      box.innerHTML = '<p class="study-pane-hint">No bookmarks yet. Use Add current while reading.</p>';
      return;
    }
    var html = '';
    list.slice(0, 10).forEach(function(bm) {
      var label = (bm && bm.label) ? bm.label : 'Bookmark';
      var heb = (bm && bm.heb) ? bm.heb : '';
      var path = (bm && bm.path) ? bm.path : '';
      html += '<div class="xf-bookmark-item" tabindex="0" role="button" data-path="' + path.replace(/"/g,'&quot;') + '">' +
                '<div class="xf-bm-title">' + label + '</div>' +
                (heb ? '<div class="xf-bm-heb" dir="rtl">' + heb + '</div>' : '') +
              '</div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.xf-bookmark-item').forEach(function(row) {
      row.onclick = function() {
        var p = row.getAttribute('data-path');
        if (p) window.location.href = p;
      };
      row.onkeydown = function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
      };
    });
  }

  // ── Backup (Notes + Highlights + Bookmarks) ──
  function exportBackup() {
    var payload = { version: 1, exportedAt: new Date().toISOString(), bookmarks: loadBookmarks(), highlights: null, notes: null };
    try { payload.highlights = JSON.parse(localStorage.getItem('sw-highlights-v1') || '{}') || {}; } catch(e) { payload.highlights = {}; }
    var pNotes = (window.NotesEngine && typeof window.NotesEngine.exportAll === 'function')
      ? window.NotesEngine.exportAll().then(function(n) { payload.notes = n || []; })
      : Promise.resolve();
    pNotes.then(function() {
      try {
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'standard-works-backup.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 0);
      } catch(e) { alert('Export failed.'); }
    });
  }
  function importBackupPrompt() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function() {
        try {
          var payload = JSON.parse(reader.result || '{}');
          if (payload && Array.isArray(payload.bookmarks)) saveBookmarks(payload.bookmarks);
          if (payload && payload.highlights) localStorage.setItem('sw-highlights-v1', JSON.stringify(payload.highlights || {}));
          var p = Promise.resolve();
          if (payload && payload.notes && window.NotesEngine && typeof window.NotesEngine.importAll === 'function') {
            p = window.NotesEngine.importAll(payload.notes, { mode: 'merge' });
          }
          p.then(function() {
            renderBookmarks();
            alert('Import complete.');
            try { if (typeof applySavedHighlights === 'function') applySavedHighlights(); } catch(e) {}
            try { if (typeof addNoteMarkers === 'function') addNoteMarkers(); } catch(e) {}
          });
        } catch(err) { alert('Import failed (invalid JSON).'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Keyboard Shortcuts ──
  function onKeydown(e) {
    if (isTypingFocusTarget(e.target)) return;
    try {
      if (_config && _config.hub && window.location.pathname) {
        var pn = window.location.pathname.replace(/\\/g, '/');
        var onHub = /(^|\/)index\.html$/i.test(pn) || pn === '/' || pn.endsWith('/');
        if (onHub) {
          var modHub = e.ctrlKey || e.metaKey;
          if (e.key === '/' || (modHub && (e.key === 'k' || e.key === 'K'))) return;
        }
      }
    } catch (err) {}
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openSidebarAndFocusSearch();
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      openSidebarAndFocusSearch();
      return;
    }
    if (e.key === 'b' || e.key === 'B' || e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleSidebar();
    } else if (e.key === 's' || e.key === 'S') {
      if (!_sidebarEl.classList.contains('open')) {
        e.preventDefault();
        openSidebar();
      }
    } else if (e.key === 'Escape') {
      closeSidebar();
    }
  }

  // ── Touch / Swipe ──
  var _touchStartX = 0;
  var _touchStartY = 0;
  var _screenW = window.innerWidth || 360;
  window.addEventListener('resize', function() { _screenW = window.innerWidth || 360; });

  function onTouchStart(e) {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    var dx = e.changedTouches[0].clientX - _touchStartX;
    var dy = Math.abs(e.changedTouches[0].clientY - _touchStartY);
    var absDx = Math.abs(dx);
    var edgeZone = _screenW * 0.15; // 15% from each edge

    // Ignore if mostly vertical scroll or too short
    if (dy > absDx || absDx < 60) return;

    // If sidebar is open, swipe left closes it (from anywhere)
    if (_sidebarEl.classList.contains('open')) {
      if (dx < -60) closeSidebar();
      return;
    }

    // Swipe right from left edge opens sidebar
    if (_touchStartX < 30 && dx > 60) {
      openSidebar();
      return;
    }

    // Chapter navigation: ONLY from screen edges to avoid blocking text selection
    // Left edge swipe or right edge swipe (not from the middle where text is)
    if (!_config.skipSwipeNav && (_touchStartX < edgeZone || _touchStartX > _screenW - edgeZone)) {
      if (dx > 80) {
        if (typeof goNext === 'function') goNext();
        else { var nb = document.getElementById('nav-next'); if (nb && !nb.disabled) nb.click(); }
      } else if (dx < -80) {
        if (typeof goPrev === 'function') goPrev();
        else { var pb = document.getElementById('nav-prev'); if (pb && !pb.disabled) pb.click(); }
      }
    }
  }

  // ── Site-wide reader footer hide (double-tap touch / double-click) ──
  var READ_FTR_LS = 'sw-reader-footer-hidden';
  var READ_FTR_LS_LEGACY = 'bom-reader-footer-hidden';
  var _readFtrInstalled = false;

  function installReaderFooterChrome() {
    if (_readFtrInstalled) return;
    if (!document.querySelector('.controls-bottom')) return;
    _readFtrInstalled = true;

    try {
      var sw = localStorage.getItem(READ_FTR_LS);
      var leg = localStorage.getItem(READ_FTR_LS_LEGACY);
      if (sw === '1' || leg === '1') {
        document.body.classList.add('reader-footer-hidden');
        if (leg === '1' && sw !== '1') {
          localStorage.setItem(READ_FTR_LS, '1');
          localStorage.removeItem(READ_FTR_LS_LEGACY);
        }
      }
    } catch (e) {}

    var SEL_IGNORE = '.controls-top, .controls-bottom, #nav-breadcrumb, #nav-sidebar, #nav-overlay, .nav-search-wrap, .nav-search-results, .nav-library, .nav-vol-tabs, .nav-book-list, #xref-panel.open, #word-popup, #search-container.open, #search-results.open, #glossary-panel, #annotations-panel, #share-popup, #share-overlay, #shortcuts-overlay.open, #sel-toolbar, #verse-action-menu, .safari-browser-tip, .global-search-wrap, #gs-results, button, input, textarea, select, [role="dialog"]';
    var SEL_READING = '#page, .page';
    function ignoreTarget(el) {
      return el && el.closest && el.closest(SEL_IGNORE);
    }
    function readingSurfaceEl(el) {
      if (!el) return null;
      if (el.nodeType === 3 && el.parentElement) el = el.parentElement;
      if (!el || el.nodeType !== 1 || !el.closest) return null;
      return el.closest(SEL_READING) ? el : null;
    }
    function toggleReadingFooterBar() {
      if (!document.querySelector('.controls-bottom')) return;
      document.body.classList.toggle('reader-footer-hidden');
      try {
        localStorage.setItem(READ_FTR_LS, document.body.classList.contains('reader-footer-hidden') ? '1' : '0');
        localStorage.removeItem(READ_FTR_LS_LEGACY);
      } catch (e2) {}
      try { window.dispatchEvent(new Event('resize')); } catch (e3) {}
    }

    var lastTap = 0;
    document.addEventListener('touchend', function(e) {
      if (!document.querySelector('.controls-bottom')) return;
      var ct = e.changedTouches;
      if (!ct || ct.length < 1) return;
      var tEl = readingSurfaceEl(e.target);
      if (!tEl) return;
      if (ignoreTarget(tEl)) return;
      var now = Date.now();
      if (lastTap && now - lastTap < 580 && now - lastTap > 12) {
        toggleReadingFooterBar();
        lastTap = 0;
        return;
      }
      lastTap = now;
    }, { passive: true, capture: true });

    document.addEventListener('dblclick', function(e) {
      if (!document.querySelector('.controls-bottom')) return;
      var tEl = readingSurfaceEl(e.target);
      if (!tEl) return;
      if (ignoreTarget(tEl)) return;
      e.preventDefault();
      toggleReadingFooterBar();
    });
  }

  // ── Public API ──
  window.NavEngine = {
    init: function(config) {
      _config = config;
      if (_config) _config.hub = !!_config.hub;
      createSidebar();
      document.addEventListener('keydown', onKeydown);
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true });

      // Hook into existing nav-label click
      var navLabel = document.getElementById('nav-label');
      if (navLabel) {
        navLabel.onclick = function(e) { e.stopPropagation(); toggleSidebar(); };
      }
      installReaderFooterChrome();
    },
    open: openSidebar,
    openJumpSearch: openSidebarAndFocusSearch,
    close: closeSidebar,
    toggle: toggleSidebar,
    update: function(chapterId) {
      _config.currentChapter = chapterId;
      updateBreadcrumb();
      saveReadingPosition(_config.volume, chapterId);
    },
    openToVolume: function(volKey) {
      openSidebar();
      switchVolTab(volKey);
    },
    openToBook: function(bookId) {
      openSidebar();
      // Ensure we're in the "Books" view (not Library)
      try { setViewMode('books'); } catch(e) {}
      // Find which volume has this book
      var volKeys = ['ot','nt','bom','dc','pgp','jst'];
      for (var v = 0; v < volKeys.length; v++) {
        var vol = VOLUMES[volKeys[v]];
        for (var d = 0; d < vol.divisions.length; d++) {
          for (var b = 0; b < vol.divisions[d].books.length; b++) {
            if (vol.divisions[d].books[b].id === bookId) {
              var volKey = volKeys[v];
              // For multi-chapter books, focus mode is the cleanest UX (chapters open immediately).
              try {
                if (typeof focusBook === 'function') {
                  focusBook(volKey, bookId);
                  return;
                }
              } catch(e) {}

              // Fallback: switch tab and open the chapter grid
              switchVolTab(volKey);
              setTimeout(function() {
                var grid = _sidebarEl.querySelector('.nav-ch-grid[data-book="' + bookId + '"]');
                var row = grid ? grid.previousElementSibling : null;
                if (grid && row) {
                  grid.classList.add('open');
                  row.classList.add('expanded');
                  grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
              return;
            }
          }
        }
      }
    },
    getLastRead: function() {
      try {
        var data = localStorage.getItem('sw-last-read');
        return data ? JSON.parse(data) : null;
      } catch(e) { return null; }
    },
    offline: {
      downloadThisVolume: offlineDownloadCurrentVolume,
      removeThisVolume: offlineRemoveCurrentVolume,
      status: function() {
        try {
          var meta = _loadOfflineMeta();
          return meta && _config && _config.volume ? (meta[_config.volume] || null) : null;
        } catch(e) { return null; }
      }
    },
    searchBooks: function(query) {
      return searchBooks(query);
    },
    buildHash: function(volKey, chapterId) {
      return buildHash(volKey, chapterId);
    },
    refreshBookmarksUI: renderBookmarks,
    renderOfflineStatusPublic: renderOfflineStatus,
    mountStudyToolsIntoXrefPanel: mountStudyToolsIntoXrefPanel,
    VOLUMES: VOLUMES,
    installReaderFooterChrome: installReaderFooterChrome
  };
})();
