/* ══════════════════════════════════════════════════════
   NAV ENGINE — Unified Navigation for Standard Works
   ══════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // ── Hebrew Numerals ──
  /* The JST translates scattered chapters, so a book's Nth entry is not its
     Nth chapter: jstgen-ch3 is Genesis 14. Label the cells with the chapter
     each passage actually translates. */
  var JST_CHAPTER_REF = {"jst1ch-ch1": "21", "jst1co-ch1": "7", "jst1co-ch2": "15", "jst1jn-ch1": "2", "jst1jn-ch2": "3", "jst1jn-ch3": "4", "jst1pe-ch1": "3", "jst1pe-ch2": "4", "jst1sa-ch1": "16", "jst1th-ch1": "4", "jst1ti-ch1": "2", "jst1ti-ch2": "3", "jst1ti-ch3": "6", "jst2ch-ch1": "18", "jst2co-ch1": "5", "jst2pe-ch1": "3", "jst2sa-ch1": "12", "jst2th-ch1": "2", "jstacts-ch1": "9", "jstacts-ch2": "22", "jstamo-ch1": "7", "jstcol-ch1": "2", "jstdeu-ch1": "10", "jsteph-ch1": "4", "jstexo-ch1": "4", "jstexo-ch2": "18", "jstexo-ch3": "22", "jstexo-ch4": "32", "jstexo-ch5": "33", "jstexo-ch6": "34", "jstgal-ch1": "3", "jstgen-ch1": "1–8", "jstgen-ch2": "9", "jstgen-ch3": "14", "jstgen-ch4": "15", "jstgen-ch5": "17", "jstgen-ch6": "19", "jstgen-ch7": "21", "jstgen-ch8": "48", "jstgen-ch9": "50", "jstheb-ch1": "1", "jstheb-ch2": "4", "jstheb-ch3": "6", "jstheb-ch4": "7", "jstheb-ch5": "11", "jstisa-ch1": "29", "jstisa-ch2": "42", "jstjas-ch1": "1", "jstjas-ch2": "2", "jstjer-ch1": "26", "jstjohn-ch1": "1", "jstjohn-ch2": "4", "jstjohn-ch3": "6", "jstjohn-ch4": "13", "jstjohn-ch5": "14", "jstluke-ch1": "1", "jstluke-ch10": "17", "jstluke-ch11": "18", "jstluke-ch12": "21", "jstluke-ch13": "23", "jstluke-ch14": "24", "jstluke-ch2": "2", "jstluke-ch3": "3", "jstluke-ch4": "6", "jstluke-ch5": "9", "jstluke-ch6": "11", "jstluke-ch7": "12", "jstluke-ch8": "14", "jstluke-ch9": "16", "jstmark-ch1": "2", "jstmark-ch2": "3", "jstmark-ch3": "7", "jstmark-ch4": "8", "jstmark-ch5": "9", "jstmark-ch6": "12", "jstmark-ch7": "14", "jstmark-ch8": "16", "jstmatt-ch1": "3", "jstmatt-ch10": "16", "jstmatt-ch11": "17", "jstmatt-ch12": "18", "jstmatt-ch13": "19", "jstmatt-ch14": "21", "jstmatt-ch15": "23", "jstmatt-ch16": "26", "jstmatt-ch17": "27", "jstmatt-ch2": "4", "jstmatt-ch3": "5", "jstmatt-ch4": "6", "jstmatt-ch5": "7", "jstmatt-ch6": "9", "jstmatt-ch7": "11", "jstmatt-ch8": "12", "jstmatt-ch9": "13", "jstpsa-ch1": "11", "jstpsa-ch2": "14", "jstpsa-ch3": "24", "jstpsa-ch4": "109", "jstrev-ch1": "1", "jstrev-ch2": "2", "jstrev-ch3": "5", "jstrev-ch4": "12", "jstrev-ch5": "19", "jstrom-ch1": "3", "jstrom-ch2": "4", "jstrom-ch3": "7", "jstrom-ch4": "8", "jstrom-ch5": "13"};
  var JST_CHAPTER_REF_HEB = {"jst1ch-ch1": "כא", "jst1co-ch1": "ז", "jst1co-ch2": "טו", "jst1jn-ch1": "ב", "jst1jn-ch2": "ג", "jst1jn-ch3": "ד", "jst1pe-ch1": "ג", "jst1pe-ch2": "ד", "jst1sa-ch1": "טז", "jst1th-ch1": "ד", "jst1ti-ch1": "ב", "jst1ti-ch2": "ג", "jst1ti-ch3": "ו", "jst2ch-ch1": "יח", "jst2co-ch1": "ה", "jst2pe-ch1": "ג", "jst2sa-ch1": "יב", "jst2th-ch1": "ב", "jstacts-ch1": "ט", "jstacts-ch2": "כב", "jstamo-ch1": "ז", "jstcol-ch1": "ב", "jstdeu-ch1": "י", "jsteph-ch1": "ד", "jstexo-ch1": "ד", "jstexo-ch2": "יח", "jstexo-ch3": "כב", "jstexo-ch4": "לב", "jstexo-ch5": "לג", "jstexo-ch6": "לד", "jstgal-ch1": "ג", "jstgen-ch1": "א–ח", "jstgen-ch2": "ט", "jstgen-ch3": "יד", "jstgen-ch4": "טו", "jstgen-ch5": "יז", "jstgen-ch6": "יט", "jstgen-ch7": "כא", "jstgen-ch8": "מח", "jstgen-ch9": "נ", "jstheb-ch1": "א", "jstheb-ch2": "ד", "jstheb-ch3": "ו", "jstheb-ch4": "ז", "jstheb-ch5": "יא", "jstisa-ch1": "כט", "jstisa-ch2": "מב", "jstjas-ch1": "א", "jstjas-ch2": "ב", "jstjer-ch1": "כו", "jstjohn-ch1": "א", "jstjohn-ch2": "ד", "jstjohn-ch3": "ו", "jstjohn-ch4": "יג", "jstjohn-ch5": "יד", "jstluke-ch1": "א", "jstluke-ch10": "יז", "jstluke-ch11": "יח", "jstluke-ch12": "כא", "jstluke-ch13": "כג", "jstluke-ch14": "כד", "jstluke-ch2": "ב", "jstluke-ch3": "ג", "jstluke-ch4": "ו", "jstluke-ch5": "ט", "jstluke-ch6": "יא", "jstluke-ch7": "יב", "jstluke-ch8": "יד", "jstluke-ch9": "טז", "jstmark-ch1": "ב", "jstmark-ch2": "ג", "jstmark-ch3": "ז", "jstmark-ch4": "ח", "jstmark-ch5": "ט", "jstmark-ch6": "יב", "jstmark-ch7": "יד", "jstmark-ch8": "טז", "jstmatt-ch1": "ג", "jstmatt-ch10": "טז", "jstmatt-ch11": "יז", "jstmatt-ch12": "יח", "jstmatt-ch13": "יט", "jstmatt-ch14": "כא", "jstmatt-ch15": "כג", "jstmatt-ch16": "כו", "jstmatt-ch17": "כז", "jstmatt-ch2": "ד", "jstmatt-ch3": "ה", "jstmatt-ch4": "ו", "jstmatt-ch5": "ז", "jstmatt-ch6": "ט", "jstmatt-ch7": "יא", "jstmatt-ch8": "יב", "jstmatt-ch9": "יג", "jstpsa-ch1": "יא", "jstpsa-ch2": "יד", "jstpsa-ch3": "כד", "jstpsa-ch4": "קט", "jstrev-ch1": "א", "jstrev-ch2": "ב", "jstrev-ch3": "ה", "jstrev-ch4": "יב", "jstrev-ch5": "יט", "jstrom-ch1": "ג", "jstrom-ch2": "ד", "jstrom-ch3": "ז", "jstrom-ch4": "ח", "jstrom-ch5": "יג"};
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
        { name: '\u05EA\u05D5\u05E8\u05D4 \u00B7 Torah', books: [
          { id:'gen', en:'Genesis', heb:'\u05D1\u05E8\u05D0\u05E9\u05D9\u05EA', ch:50, prefix:'gen-ch' },
          { id:'exo', en:'Exodus', heb:'\u05E9\u05DE\u05D5\u05EA', ch:40, prefix:'exo-ch' },
          { id:'lev', en:'Leviticus', heb:'\u05D5\u05D9\u05E7\u05E8\u05D0', ch:27, prefix:'lev-ch' },
          { id:'num', en:'Numbers', heb:'\u05D1\u05DE\u05D3\u05D1\u05E8', ch:36, prefix:'num-ch' },
          { id:'deu', en:'Deuteronomy', heb:'\u05D3\u05D1\u05E8\u05D9\u05DD', ch:34, prefix:'deu-ch' }
        ]},
        { name: "\u05E0\u05D1\u05D9\u05D0\u05D9\u05DD \u00B7 Nevi'im", books: [
          { id:'jos', en:'Joshua', heb:'\u05D9\u05D4\u05D5\u05E9\u05E2', ch:24, prefix:'jos-ch' },
          { id:'jdg', en:'Judges', heb:'\u05E9\u05D5\u05E4\u05D8\u05D9\u05DD', ch:21, prefix:'jdg-ch' },
          { id:'1sa', en:'1 Samuel', heb:'\u05E9\u05DE\u05D5\u05D0\u05DC \u05D0', ch:31, prefix:'1sa-ch' },
          { id:'2sa', en:'2 Samuel', heb:'\u05E9\u05DE\u05D5\u05D0\u05DC \u05D1', ch:24, prefix:'2sa-ch' },
          { id:'1ki', en:'1 Kings', heb:'\u05DE\u05DC\u05DB\u05D9\u05DD \u05D0', ch:22, prefix:'1ki-ch' },
          { id:'2ki', en:'2 Kings', heb:'\u05DE\u05DC\u05DB\u05D9\u05DD \u05D1', ch:25, prefix:'2ki-ch' },
          { id:'isa', en:'Isaiah', heb:'\u05D9\u05E9\u05E2\u05D9\u05D4\u05D5', ch:66, prefix:'isa-ch' },
          { id:'jer', en:'Jeremiah', heb:'\u05D9\u05E8\u05DE\u05D9\u05D4\u05D5', ch:52, prefix:'jer-ch' },
          { id:'eze', en:'Ezekiel', heb:'\u05D9\u05D7\u05D6\u05E7\u05D0\u05DC', ch:48, prefix:'eze-ch' },
          { id:'hos', en:'Hosea', heb:'\u05D4\u05D5\u05E9\u05E2', ch:14, prefix:'hos-ch' },
          { id:'joe', en:'Joel', heb:'\u05D9\u05D5\u05D0\u05DC', ch:4, prefix:'joe-ch' },
          { id:'amo', en:'Amos', heb:'\u05E2\u05DE\u05D5\u05E1', ch:9, prefix:'amo-ch' },
          { id:'oba', en:'Obadiah', heb:'\u05E2\u05D5\u05D1\u05D3\u05D9\u05D4', ch:1, prefix:'oba-ch' },
          { id:'jon', en:'Jonah', heb:'\u05D9\u05D5\u05E0\u05D4', ch:4, prefix:'jon-ch' },
          { id:'mic', en:'Micah', heb:'\u05DE\u05D9\u05DB\u05D4', ch:7, prefix:'mic-ch' },
          { id:'nah', en:'Nahum', heb:'\u05E0\u05D7\u05D5\u05DD', ch:3, prefix:'nah-ch' },
          { id:'hab', en:'Habakkuk', heb:'\u05D7\u05D1\u05E7\u05D5\u05E7', ch:3, prefix:'hab-ch' },
          { id:'zep', en:'Zephaniah', heb:'\u05E6\u05E4\u05E0\u05D9\u05D4', ch:3, prefix:'zep-ch' },
          { id:'hag', en:'Haggai', heb:'\u05D7\u05D2\u05D9', ch:2, prefix:'hag-ch' },
          { id:'zec', en:'Zechariah', heb:'\u05D6\u05DB\u05E8\u05D9\u05D4', ch:14, prefix:'zec-ch' },
          { id:'mal', en:'Malachi', heb:'\u05DE\u05DC\u05D0\u05DB\u05D9', ch:3, prefix:'mal-ch' }
        ]},
        { name: '\u05DB\u05EA\u05D5\u05D1\u05D9\u05DD \u00B7 Ketuvim', books: [
          { id:'psa', en:'Psalms', heb:'\u05EA\u05D4\u05DC\u05D9\u05DD', ch:150, prefix:'psa-ch' },
          { id:'pro', en:'Proverbs', heb:'\u05DE\u05E9\u05DC\u05D9', ch:31, prefix:'pro-ch' },
          { id:'job', en:'Job', heb:'\u05D0\u05D9\u05D5\u05D1', ch:42, prefix:'job-ch' },
          { id:'sos', en:'Song of Songs', heb:'\u05E9\u05D9\u05E8 \u05D4\u05E9\u05D9\u05E8\u05D9\u05DD', ch:8, prefix:'sos-ch' },
          { id:'rth', en:'Ruth', heb:'\u05E8\u05D5\u05EA', ch:4, prefix:'rth-ch' },
          { id:'lam', en:'Lamentations', heb:'\u05D0\u05D9\u05DB\u05D4', ch:5, prefix:'lam-ch' },
          { id:'ecc', en:'Ecclesiastes', heb:'\u05E7\u05D4\u05DC\u05EA', ch:12, prefix:'ecc-ch' },
          { id:'est', en:'Esther', heb:'\u05D0\u05E1\u05EA\u05E8', ch:10, prefix:'est-ch' },
          { id:'dan', en:'Daniel', heb:'\u05D3\u05E0\u05D9\u05D0\u05DC', ch:12, prefix:'dan-ch' },
          { id:'ezr', en:'Ezra', heb:'\u05E2\u05D6\u05E8\u05D0', ch:10, prefix:'ezr-ch' },
          { id:'neh', en:'Nehemiah', heb:'\u05E0\u05D7\u05DE\u05D9\u05D4', ch:13, prefix:'neh-ch' },
          { id:'1ch', en:'1 Chronicles', heb:'\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D0', ch:29, prefix:'1ch-ch' },
          { id:'2ch', en:'2 Chronicles', heb:'\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D1', ch:36, prefix:'2ch-ch' }
        ]}
      ]
    },
    nt: {
      key: 'nt', name: 'New Testament', heb:'\u05D4\u05D1\u05E8\u05D9\u05EA \u05D4\u05D7\u05D3\u05E9\u05D4', abbr:'\u05D1\u05F4\u05D7',
      page: 'nt.html',
      divisions: [
        { name: '\u05D1\u05E9\u05D5\u05E8\u05D5\u05EA \u00B7 Gospels', books: [
          { id:'matt', en:'Matthew', heb:'\u05DE\u05EA\u05D9', ch:28, prefix:'matt-ch' },
          { id:'mark', en:'Mark', heb:'\u05DE\u05E8\u05E7\u05D5\u05E1', ch:16, prefix:'mark-ch' },
          { id:'luke', en:'Luke', heb:'\u05DC\u05D5\u05E7\u05E1', ch:24, prefix:'luke-ch' },
          { id:'john', en:'John', heb:'\u05D9\u05D5\u05D7\u05E0\u05DF', ch:21, prefix:'john-ch' }
        ]},
        { name: '\u05DE\u05E2\u05E9\u05D9\u05DD \u00B7 Acts', books: [
          { id:'acts', en:'Acts', heb:'\u05DE\u05E2\u05E9\u05D9 \u05D4\u05E9\u05DC\u05D9\u05D7\u05D9\u05DD', ch:28, prefix:'acts-ch' }
        ]},
        { name: '\u05D0\u05D2\u05E8\u05D5\u05EA \u05E4\u05D5\u05DC\u05D5\u05E1 \u00B7 Pauline Epistles', books: [
          { id:'rom', en:'Romans', heb:'\u05E8\u05D5\u05DE\u05D9\u05DD', ch:16, prefix:'rom-ch' },
          { id:'1co', en:'1 Corinthians', heb:'\u05E7\u05D5\u05E8\u05E0\u05EA\u05D9\u05DD \u05D0', ch:16, prefix:'1co-ch' },
          { id:'2co', en:'2 Corinthians', heb:'\u05E7\u05D5\u05E8\u05E0\u05EA\u05D9\u05DD \u05D1', ch:13, prefix:'2co-ch' },
          { id:'gal', en:'Galatians', heb:'\u05D2\u05DC\u05D8\u05D9\u05DD', ch:6, prefix:'gal-ch' },
          { id:'eph', en:'Ephesians', heb:'\u05D0\u05E4\u05E1\u05D9\u05DD', ch:6, prefix:'eph-ch' },
          { id:'php', en:'Philippians', heb:'\u05E4\u05D9\u05DC\u05E4\u05D9\u05DD', ch:4, prefix:'php-ch' },
          { id:'col', en:'Colossians', heb:'\u05E7\u05D5\u05DC\u05D5\u05E1\u05D9\u05DD', ch:4, prefix:'col-ch' },
          { id:'1th', en:'1 Thessalonians', heb:'\u05EA\u05E1\u05DC\u05D5\u05E0\u05D9\u05E7\u05D9\u05DD \u05D0', ch:5, prefix:'1th-ch' },
          { id:'2th', en:'2 Thessalonians', heb:'\u05EA\u05E1\u05DC\u05D5\u05E0\u05D9\u05E7\u05D9\u05DD \u05D1', ch:3, prefix:'2th-ch' },
          { id:'1ti', en:'1 Timothy', heb:'\u05D8\u05D9\u05DE\u05D5\u05EA\u05D0\u05D5\u05E1 \u05D0', ch:6, prefix:'1ti-ch' },
          { id:'2ti', en:'2 Timothy', heb:'\u05D8\u05D9\u05DE\u05D5\u05EA\u05D0\u05D5\u05E1 \u05D1', ch:4, prefix:'2ti-ch' },
          { id:'tit', en:'Titus', heb:'\u05D8\u05D9\u05D8\u05D5\u05E1', ch:3, prefix:'tit-ch' },
          { id:'phm', en:'Philemon', heb:'\u05E4\u05D9\u05DC\u05D9\u05DE\u05D5\u05DF', ch:1, prefix:'phm-ch' }
        ]},
        { name: '\u05D0\u05D2\u05E8\u05D5\u05EA \u05DB\u05DC\u05DC\u05D9\u05D5\u05EA \u00B7 General Epistles', books: [
          { id:'heb', en:'Hebrews', heb:'\u05E2\u05D1\u05E8\u05D9\u05DD', ch:13, prefix:'heb-ch' },
          { id:'jas', en:'James', heb:'\u05D9\u05E2\u05E7\u05D1', ch:5, prefix:'jas-ch' },
          { id:'1pe', en:'1 Peter', heb:'\u05E4\u05D8\u05E8\u05D5\u05E1 \u05D0', ch:5, prefix:'1pe-ch' },
          { id:'2pe', en:'2 Peter', heb:'\u05E4\u05D8\u05E8\u05D5\u05E1 \u05D1', ch:3, prefix:'2pe-ch' },
          { id:'1jn', en:'1 John', heb:'\u05D9\u05D5\u05D7\u05E0\u05DF \u05D0', ch:5, prefix:'1jn-ch' },
          { id:'2jn', en:'2 John', heb:'\u05D9\u05D5\u05D7\u05E0\u05DF \u05D1', ch:1, prefix:'2jn-ch' },
          { id:'3jn', en:'3 John', heb:'\u05D9\u05D5\u05D7\u05E0\u05DF \u05D2', ch:1, prefix:'3jn-ch' },
          { id:'jude', en:'Jude', heb:'\u05D9\u05D4\u05D5\u05D3\u05D4', ch:1, prefix:'jude-ch' }
        ]},
        { name: '\u05D7\u05D6\u05D5\u05DF \u00B7 Prophecy', books: [
          { id:'rev', en:'Revelation', heb:'\u05D7\u05D6\u05D5\u05DF \u05D9\u05D5\u05D7\u05E0\u05DF', ch:22, prefix:'rev-ch' }
        ]}
      ]
    },
    bom: {
      key: 'bom', name: 'Book of Mormon', heb:'\u05E1\u05E4\u05E8 \u05DE\u05D5\u05E8\u05DE\u05D5\u05DF', abbr:'\u05E1\u05D5\u05F4\u05DE',
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
          { id:'1ne', en:'1 Nephi', heb:"\u05E0\u05E4\u05D9 \u05D0\u05F3", ch:22, prefix:'ch' },
          { id:'2ne', en:'2 Nephi', heb:"\u05E0\u05E4\u05D9 \u05D1\u05F3", ch:33, prefix:'2n-ch' },
          { id:'jac', en:'Jacob', heb:'\u05D9\u05E2\u05E7\u05D1', ch:7, prefix:'jc-ch' },
          { id:'eno', en:'Enos', heb:'\u05D0\u05E0\u05D5\u05E9', ch:1, prefix:'en-ch' },
          { id:'jar', en:'Jarom', heb:'\u05D9\u05E8\u05D5\u05DD', ch:1, prefix:'jr-ch' },
          { id:'omn', en:'Omni', heb:'\u05E2\u05DE\u05E0\u05D9', ch:1, prefix:'om-ch' }
        ]},
        { name: '\u05DC\u05D5\u05D7\u05D5\u05EA \u05D2\u05D3\u05D5\u05DC\u05D9\u05DD \u00B7 Large Plates', books: [
          { id:'wom', en:'Words of Mormon', heb:'\u05D3\u05D1\u05E8\u05D9 \u05DE\u05D5\u05E8\u05DE\u05D5\u05DF', ch:1, prefix:'wm-ch' },
          { id:'mos', en:'Mosiah', heb:'\u05DE\u05D5\u05E9\u05D9\u05D4', ch:29, prefix:'mo-ch' },
          { id:'alm', en:'Alma', heb:'\u05D0\u05DC\u05DE\u05D0', ch:63, prefix:'al-ch' },
          { id:'hel', en:'Helaman', heb:'\u05D4\u05D9\u05DC\u05DE\u05DF', ch:16, prefix:'he-ch' },
          { id:'3ne', en:'3 Nephi', heb:"\u05E0\u05E4\u05D9 \u05D2\u05F3", ch:30, prefix:'3n-ch' },
          { id:'4ne', en:'4 Nephi', heb:"\u05E0\u05E4\u05D9 \u05D3\u05F3", ch:1, prefix:'4n-ch' }
        ]},
        { name: '\u05DC\u05D5\u05D7\u05D5\u05EA \u05DE\u05D5\u05E8\u05DE\u05D5\u05DF \u00B7 Plates of Mormon', books: [
          { id:'mrm', en:'Mormon', heb:'\u05DE\u05D5\u05E8\u05DE\u05D5\u05DF', ch:9, prefix:'mm-ch' },
          { id:'eth', en:'Ether', heb:'\u05E2\u05EA\u05E8', ch:15, prefix:'et-ch' },
          { id:'mro', en:'Moroni', heb:'\u05DE\u05D5\u05E8\u05D5\u05E0\u05D9', ch:10, prefix:'mr-ch' }
        ]}
      ]
    },
    dc: {
      key: 'dc', name: 'D&C', heb:'הלקח והבריתות', abbr:'\u05DC.\u05D1',
      page: 'dc.html',
      divisions: [
        { name: '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter', books: [
          { id:'dc-intro', en:'Introduction', heb:'\u05DE\u05D1\u05D5\u05D0', ch:1, prefix:'dc-intro', isFront:true },
          { id:'dc-chron', en:'Chronological Order', heb:'\u05E1\u05D3\u05E8 \u05DB\u05E8\u05D5\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9', ch:1, prefix:'dc-chron', isFront:true }
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
      key: 'pgp', name: 'Pearl of Great Price', heb:'פנינת המחיר הגדול', abbr:'\u05E4\u05E0\u05F4\u05D4',
      page: 'pgp.html',
      divisions: [
        { name: '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter', books: [
          { id:'pgp-intro', en:'Introduction', heb:'\u05DE\u05D1\u05D5\u05D0', ch:1, prefix:'pgp-intro', isFront:true }
        ]},
        { name: '', books: [
          { id:'ms', en:'Moses', heb:'\u05DE\u05D5\u05E9\u05D4', ch:8, prefix:'ms-ch' },
          { id:'ab', en:'Abraham', heb:'\u05D0\u05D1\u05E8\u05D4\u05DD', ch:5, prefix:'ab-ch' },
          { id:'abfac', en:'Facsimiles', heb:'\u05E4\u05E7\u05E1\u05D9\u05DE\u05D9\u05DC\u05D9\u05D4', ch:3, prefix:'ab-fac' },
          { id:'jsm', en:'JS\u2014Matthew', heb:'\u05D9\u05D5\u05E1\u05E3 \u05E1\u05DE\u05D9\u05EA\u2014\u05DE\u05EA\u05EA\u05D9\u05D4\u05D5', ch:1, prefix:'jsm-ch' },
          { id:'jsh', en:'JS\u2014History', heb:'\u05D9\u05D5\u05E1\u05E3 \u05E1\u05DE\u05D9\u05EA\u2014\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4', ch:1, prefix:'jsh-ch' },
          { id:'aof', en:'Articles of Faith', heb:'\u05E2\u05E7\u05E8\u05D9 \u05D4\u05D0\u05DE\u05D5\u05E0\u05D4', ch:1, prefix:'aof-ch' }
        ]}
      ]
    },
    jst: {
      key: 'jst', name: 'JST', heb:'\u05EA\u05E8\u05D2\u05D5\u05DD \u05D9\u05D5\u05E1\u05E3 \u05E1\u05DE\u05D9\u05EA', abbr:'\u05EA\u05D2\u05F4\u05E1',
      page: 'jst.html',
      divisions: [
        { name: '\u05D4\u05E7\u05D3\u05DE\u05D5\u05EA \u00B7 Front Matter', books: [
          { id:'jst-intro', en:'Introduction', heb:'\u05DE\u05D1\u05D5\u05D0', ch:1, prefix:'jst-intro', isFront:true }
        ]},
        { name: '\u05EA\u05E0\u05F4\u05DA \u00B7 Old Testament', books: [
          { id:'jstgen', en:'Genesis', heb:'\u05D1\u05E8\u05D0\u05E9\u05D9\u05EA', ch:9, prefix:'jstgen-ch' },
          { id:'jstexo', en:'Exodus', heb:'\u05E9\u05DE\u05D5\u05EA', ch:6, prefix:'jstexo-ch' },
          { id:'jstdeu', en:'Deuteronomy', heb:'\u05D3\u05D1\u05E8\u05D9\u05DD', ch:1, prefix:'jstdeu-ch' },
          { id:'jst1sa', en:'1 Samuel', heb:'\u05E9\u05DE\u05D5\u05D0\u05DC \u05D0', ch:1, prefix:'jst1sa-ch' },
          { id:'jst2sa', en:'2 Samuel', heb:'\u05E9\u05DE\u05D5\u05D0\u05DC \u05D1', ch:1, prefix:'jst2sa-ch' },
          { id:'jst1ch', en:'1 Chronicles', heb:'\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D0', ch:1, prefix:'jst1ch-ch' },
          { id:'jst2ch', en:'2 Chronicles', heb:'\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D1', ch:1, prefix:'jst2ch-ch' },
          { id:'jstpsa', en:'Psalms', heb:'\u05EA\u05D4\u05DC\u05D9\u05DD', ch:4, prefix:'jstpsa-ch' },
          { id:'jstisa', en:'Isaiah', heb:'\u05D9\u05E9\u05E2\u05D9\u05D4\u05D5', ch:2, prefix:'jstisa-ch' },
          { id:'jstjer', en:'Jeremiah', heb:'\u05D9\u05E8\u05DE\u05D9\u05D4\u05D5', ch:1, prefix:'jstjer-ch' },
          { id:'jstamo', en:'Amos', heb:'\u05E2\u05DE\u05D5\u05E1', ch:1, prefix:'jstamo-ch' }
        ]},
        { name: '\u05D1\u05E8\u05D9\u05EA \u05D4\u05D7\u05D3\u05E9\u05D4 \u00B7 New Testament', books: [
          { id:'jstmatt', en:'Matthew', heb:'\u05DE\u05EA\u05EA\u05D9\u05D4\u05D5', ch:17, prefix:'jstmatt-ch' },
          { id:'jstmark', en:'Mark', heb:'\u05DE\u05E8\u05E7\u05D5\u05E1', ch:8, prefix:'jstmark-ch' },
          { id:'jstluke', en:'Luke', heb:'\u05DC\u05D5\u05E7\u05E1', ch:14, prefix:'jstluke-ch' },
          { id:'jstjohn', en:'John', heb:'\u05D9\u05D5\u05D7\u05E0\u05DF', ch:5, prefix:'jstjohn-ch' },
          { id:'jstacts', en:'Acts', heb:'\u05DE\u05E2\u05E9\u05D9', ch:2, prefix:'jstacts-ch' },
          { id:'jstrom', en:'Romans', heb:'\u05E8\u05D5\u05DE\u05D9\u05D9\u05DD', ch:5, prefix:'jstrom-ch' },
          { id:'jst1co', en:'1 Corinthians', heb:'\u05E7\u05D5\u05E8\u05E0\u05EA\u05D9\u05DD \u05D0', ch:2, prefix:'jst1co-ch' },
          { id:'jst2co', en:'2 Corinthians', heb:'\u05E7\u05D5\u05E8\u05E0\u05EA\u05D9\u05DD \u05D1', ch:1, prefix:'jst2co-ch' },
          { id:'jstgal', en:'Galatians', heb:'\u05D2\u05DC\u05D8\u05D9\u05DD', ch:1, prefix:'jstgal-ch' },
          { id:'jsteph', en:'Ephesians', heb:'\u05D0\u05E4\u05E1\u05D9\u05DD', ch:1, prefix:'jsteph-ch' },
          { id:'jstcol', en:'Colossians', heb:'\u05E7\u05D5\u05DC\u05D5\u05E1\u05D9\u05DD', ch:1, prefix:'jstcol-ch' },
          { id:'jst1th', en:'1 Thessalonians', heb:'\u05EA\u05E1\u05DC\u05D5\u05E0\u05D9\u05E7\u05D9\u05DD \u05D0', ch:1, prefix:'jst1th-ch' },
          { id:'jst2th', en:'2 Thessalonians', heb:'\u05EA\u05E1\u05DC\u05D5\u05E0\u05D9\u05E7\u05D9\u05DD \u05D1', ch:1, prefix:'jst2th-ch' },
          { id:'jst1ti', en:'1 Timothy', heb:'\u05D8\u05D9\u05DE\u05D5\u05EA\u05D0\u05D5\u05E1 \u05D0', ch:3, prefix:'jst1ti-ch' },
          { id:'jstheb', en:'Hebrews', heb:'\u05E2\u05D1\u05E8\u05D9\u05DD', ch:5, prefix:'jstheb-ch' },
          { id:'jstjas', en:'James', heb:'\u05D9\u05E2\u05E7\u05D1', ch:2, prefix:'jstjas-ch' },
          { id:'jst1pe', en:'1 Peter', heb:'\u05E4\u05D8\u05E8\u05D5\u05E1 \u05D0', ch:2, prefix:'jst1pe-ch' },
          { id:'jst2pe', en:'2 Peter', heb:'\u05E4\u05D8\u05E8\u05D5\u05E1 \u05D1', ch:1, prefix:'jst2pe-ch' },
          { id:'jst1jn', en:'1 John', heb:'\u05D9\u05D5\u05D7\u05E0\u05DF \u05D0', ch:3, prefix:'jst1jn-ch' },
          { id:'jstrev', en:'Revelation', heb:'\u05D7\u05D6\u05D5\u05DF', ch:5, prefix:'jstrev-ch' }
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
    // Parse "Book", "Book Chapter", or "Book Chapter:Verse" / "Book Chapter.Verse"
    var refMatch = q.match(/^(.+?)(?:\s+(\d+)(?:[:.](\d+))?)?$/);
    var bookQ = refMatch ? refMatch[1] : q;
    var chNum = refMatch && refMatch[2] ? parseInt(refMatch[2], 10) : 0;
    var verseNum = refMatch && refMatch[3] ? parseInt(refMatch[3], 10) : 0;

    var results = [];
    _searchIndex.forEach(function(entry) {
      var enLower = entry.en.toLowerCase();
      var score = 0;
      if (enLower === bookQ) score = 100;
      else if (enLower.indexOf(bookQ) === 0) score = 80;
      else if (enLower.indexOf(bookQ) >= 0) score = 60;
      else if (entry.heb.indexOf(q) >= 0) score = 70;
      if (score > 0) {
        results.push({ entry: entry, score: score, chNum: chNum, verseNum: verseNum });
      }
    });
    results.sort(function(a, b) { return b.score - a.score; });
    return results.slice(0, 8);
  }

  // ── Create DOM ──
  function getTopBar() {
    return (typeof window.swHeaderBar === 'function' && window.swHeaderBar()) ||
      document.querySelector('.controls-top');
  }

  /** Reserve space for fixed header + optional breadcrumb + footer (iOS PWA / Safari). */
  function syncReaderPageChromePadding() {
    var pageEl = document.querySelector('.page');
    var ct = getTopBar();
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
    var footerEl = getReaderFooter();
    if (footerEl) {
      var footerH = 0;
      try {
        var stF = window.getComputedStyle(footerEl);
        if (stF.display !== 'none' && stF.visibility !== 'hidden') footerH = footerEl.offsetHeight || 0;
      } catch (eFoot) {}
      pageEl.style.paddingBottom = (footerH + 20) + 'px';
    } else if (cb) {
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

    _injectAccentTheme();

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

    var homeBtn = document.createElement('button');
    homeBtn.className = 'nav-icon-btn nav-home-btn';
    homeBtn.innerHTML = '🏠';
    homeBtn.title = 'Home';
    homeBtn.setAttribute('aria-label', 'Home');
    homeBtn.onclick = goHome;

    _searchInput = document.createElement('input');
    _searchInput.type = 'text';
    _searchInput.id = 'nav-search-input';
    _searchInput.placeholder = 'Search a word, or jump to a verse… — / or Ctrl+K';
    _searchInput.oninput = onSearchInput;
    _searchInput.onkeydown = onSearchKeydown;
    var closeBtn = document.createElement('button');
    closeBtn.className = 'nav-close-btn';
    closeBtn.innerHTML = '\u2715';
    closeBtn.onclick = closeSidebar;
    searchWrap.appendChild(homeBtn);
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
      tab.title = vol.heb + ' · ' + vol.name;
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
    offBanner.style.cssText = 'display:none;position:fixed;bottom:0;left:0;right:0;z-index:6000;padding:10px 16px;text-align:center;font-size:0.88em;line-height:1.35;background:#3d2914;color:#f5e6c8;border-top:1px solid var(--accent,#dbb958);font-family:\'David Libre\',Georgia,serif;';
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

    // Default: show Library view (reader pages switch to Books when sidebar opens).
    // Some volume landing pages want the hamburger to open directly to Books.
    setViewMode(_config && _config.preferBooksOnOpen ? 'books' : 'library');

    // (breadcrumb bar deleted 2026-08-29 — footer chapter control is the location)
    var _legacyBc = document.getElementById('nav-breadcrumb');
    if (_legacyBc && _legacyBc.parentNode) _legacyBc.parentNode.removeChild(_legacyBc);
    updateBreadcrumb();
    ensureContinueReadingChip();

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
      return '' +
        '<div class="nl-tile" data-vol="' + vk + '" tabindex="0" role="button">' +
          '<div class="nl-top">' +
            '<div class="nl-name">' + v.name + '</div>' +
            '<div class="nl-heb" dir="rtl" lang="he">' + v.heb + '</div>' +
          '</div>' +
        '</div>';
    }

    var html = '';
    html += '<div class="nl-sec-title">Library</div>';

    if (last && last.path) {
      html += '<div class="nl-card nl-last" id="nl-last" tabindex="0" role="button">' +
                '<div class="nl-card-title">Continue</div>' +
                '<div class="nl-card-text">' + (last.label || 'Continue reading') + '</div>' +
                (last.heb ? '<div class="nl-card-heb" dir="rtl">' + String(last.heb).replace(/[֑-ׇ]/g, '') + '</div>' : '') +
              '</div>';
    }

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

    html += '<div class="nl-sec-title" style="margin-top:10px">Study</div>';
    html += '<div class="nl-card" id="nl-topical" tabindex="0" role="button">' +
              '<div class="nl-card-title">Topical Guide</div>' +
              '<div class="nl-card-text">Major themes for study</div>' +
              '<div class="nl-card-heb" dir="rtl">מדריך נושאים</div>' +
            '</div>';
    html += '<div class="nl-card" id="nl-print" tabindex="0" role="button">' +
              '<div class="nl-card-title">In Print</div>' +
              '<div class="nl-card-text">Paper editions of Sefer Mormon</div>' +
              '<div class="nl-card-heb" dir="rtl">בדפוס</div>' +
            '</div>';

    // Reader-page panels — with the study rail gone, the drawer is the touch
    // entry for annotations and the glossary (keyboard still has N / G).
    if (typeof window.openAnnotationsPanel === 'function') {
      html += '<div class="nl-card" id="nl-annotations" tabindex="0" role="button">' +
                '<div class="nl-card-title">My Annotations</div>' +
                '<div class="nl-card-text">Highlights, underlines, notes</div>' +
                '<div class="nl-card-heb" dir="rtl">הערות</div>' +
              '</div>';
    }
    if (typeof window.openGlossary === 'function') {
      html += '<div class="nl-card" id="nl-glossary" tabindex="0" role="button">' +
                '<div class="nl-card-title">Glossary</div>' +
                '<div class="nl-card-text">Roots and vocabulary</div>' +
                '<div class="nl-card-heb" dir="rtl">מילון</div>' +
              '</div>';
    }

    _libraryEl.innerHTML = html;

    var lastEl = document.getElementById('nl-last');
    if (lastEl && last) {
      var lastUrl = resolveLastReadUrl(last);
      if (lastUrl) {
        lastEl.onclick = function() { window.location.href = lastUrl; };
        lastEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lastEl.click(); } };
      }
    }

    var tgEl = document.getElementById('nl-topical');
    if (tgEl) {
      tgEl.onclick = function() {
        window.location.href = (_config && _config.basePath || '') + VOLUMES.bom.page + '#topical-guide';
      };
      tgEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tgEl.click(); } };
    }

    var prEl = document.getElementById('nl-print');
    if (prEl) {
      prEl.onclick = function() {
        window.location.href = (_config && _config.basePath || '') + VOLUMES.bom.page + '#print-editions';
      };
      prEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prEl.click(); } };
    }

    var annEl = document.getElementById('nl-annotations');
    if (annEl) {
      annEl.onclick = function() { closeSidebar(); try { window.openAnnotationsPanel(); } catch (eA) {} };
      annEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); annEl.click(); } };
    }
    var glsEl = document.getElementById('nl-glossary');
    if (glsEl) {
      glsEl.onclick = function() { closeSidebar(); try { window.openGlossary(); } catch (eG) {} };
      glsEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); glsEl.click(); } };
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
    // The five shared readers fetch books through reader_core.js's
    // VolumeLoader, so the page's manifest says which files exist: the
    // offline set is derived from it — every verse file and the Dual-view
    // English chunk beside it — never typed out here.
    var man = window.READER_VERSE_MANIFEST;
    if (man && man.files && /^(ot|nt|dc|pgp|jst)$/.test(vk)) {
      var list = [vk + '.html', vk + '_verses/manifest.js'];
      if (vk === 'dc') list.push('dc_verses/dc_chron.js');   // a table the page loads statically
      man.files.forEach(function(f) { list.push(vk + '_verses/' + f); });
      (man.english || []).forEach(function(f) { list.push(vk + '_english/' + f); });
      return list;
    }
    if (vk === 'bom') return ['bom/bom.html'].concat([
      'bom/official_verses.js','bom/crossrefs.js','bom/roots_glossary.js','bom/chapter_headings.js','bom/chapter_headings_heb.js',
      'bom/scripture_verses.js','bom/topical_guide.js',
      'bom/verses/frontmatter.js','bom/verses/1nephi.js','bom/verses/book_colophons.js','bom/verses/2nephi.js','bom/verses/jacob.js','bom/verses/enos.js','bom/verses/jarom.js',
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
    function dictHref() {
      var p = (window.location && window.location.pathname) ? window.location.pathname : '';
      return (p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p)) ? '../dictionary.html' : 'dictionary.html';
    }
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
      focusRow.innerHTML = '<span><span class="nb-en">← All books</span></span><span class="nb-heb">הכל</span>';
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
            var chHeb = JST_CHAPTER_REF_HEB[chId] || toHebNum(c);
            var chNumTxt = JST_CHAPTER_REF[chId] || c;
            cell.innerHTML = '<span class="ch-heb">' + chHeb + '</span><span class="ch-num">' + chNumTxt + '</span>';
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
    introRow.innerHTML = '<span><span class="nb-en">Introduction</span></span><span class="nb-heb">\u05DE\u05D1\u05D5\u05D0</span>';
    if ('dc' === _config.volume && 'dc-intro' === _config.currentChapter) introRow.style.background = 'rgba(200,168,78,0.15)';
    introRow.onclick = function() { navigateToChapter('dc', 'dc-intro'); };
    list.appendChild(introRow);

    var chronRow = document.createElement('div');
    chronRow.className = 'nav-book-row single-ch';
    chronRow.innerHTML = '<span><span class="nb-en">Chronological Order</span></span><span class="nb-heb">\u05E1\u05D3\u05E8 \u05DB\u05E8\u05D5\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9</span>';
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
  function navigateToChapter(volKey, chapterId, book, verseNum) {
    closeSidebar();
    // Save reading position
    saveReadingPosition(volKey, chapterId, book);

    var verseSuffix = (verseNum && verseNum > 0) ? '-v' + verseNum : '';

    // Home hub (index.html): always load the target volume page
    if (_config && _config.hub) {
      var volHub = VOLUMES[volKey];
      if (!volHub) return;
      var urlHub = (_config.basePath || '') + volHub.page;
      var hashHub = buildHash(volKey, chapterId);
      window.location.href = urlHub + (hashHub ? '#' + hashHub + verseSuffix : '');
      return;
    }

    if (volKey === _config.volume) {
      // Same volume — use page's navTo
      _config.currentChapter = chapterId;
      try {
        if (_config.onNavigate) _config.onNavigate(chapterId, verseNum || 0);
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
      window.location.href = url + (hash ? '#' + hash + verseSuffix : '');
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
      if (chapterId.indexOf('-colophon') > 0) return chapterId;
      var bomPrefixes = Object.keys(bomHashes).sort(function(a, b) { return b.length - a.length; });
      for (var i = 0; i < bomPrefixes.length; i++) {
        var prefix = bomPrefixes[i];
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
      appendVerseHits(q);                       // words can still match the text
      if (!_searchResults.children.length) { _searchResults.classList.remove('open'); return; }
      _searchResults.classList.add('open');
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
    appendVerseHits(q);
    _searchResults.classList.add('open');
  }

  /** Word search over the verse text, beneath the book/chapter matches.
   *  Hebrew matches with or without nikkud; English matches the gloss and the
   *  translation column. Only a reader page has verse data loaded. */
  function appendVerseHits(q) {
    if (!window.SWSearch || !q || q.length < 2) return;
    var hits = [];
    try { hits = window.SWSearch.find(q, 12) || []; } catch (e) { return; }
    if (!hits.length) return;
    var head = document.createElement('div');
    head.className = 'nav-search-section';
    head.textContent = 'In the text';
    head.style.cssText = 'padding:6px 14px;font-size:0.72em;letter-spacing:0.08em;' +
      'text-transform:uppercase;opacity:0.6;border-top:1px solid rgba(200,168,78,0.25);margin-top:4px;';
    _searchResults.appendChild(head);
    hits.forEach(function (hit) {
      var div = document.createElement('div');
      div.className = 'nav-search-result';
      var snip = '';
      try { snip = window.SWSearch.snippet(hit, q, 76); } catch (e) {}
      // the snippet is Hebrew or English depending on the query — set the
      // direction to match, or English reads back to front in an RTL drawer
      var rtl = window.SWSearch.hasHebrew(snip);
      div.innerHTML = '<span style="display:block;"><span class="sr-name" style="display:block;direction:ltr;text-align:left;">' +
        escapeHtml(hit.ref) + '</span>' +
        '<span class="sr-vol" style="display:block;opacity:0.72;font-size:0.85em;line-height:1.45;' +
        'direction:' + (rtl ? 'rtl' : 'ltr') + ';text-align:' + (rtl ? 'right' : 'left') + ';">' +
        escapeHtml(snip) + '</span></span>';
      div.onclick = function () {
        closeDrawer();
        try { window.SWSearch.goTo(hit); } catch (e) {}
      };
      _searchResults.appendChild(div);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      navigateToChapter(r.entry.vol, r.entry.chId, null, r.verseNum || 0);
      return;
    }
    if (r.chNum) {
      var chId = r.entry.prefix + chNum;
      navigateToChapter(r.entry.vol, chId, null, r.verseNum || 0);
      return;
    }
    // Focus the selected book so only its chapter grid shows.
    _searchInput.value = '';
    _searchResults.classList.remove('open');
    _searchResults.innerHTML = '';
    _searchIdx = -1;
    focusBook(r.entry.vol, r.entry.id);
  }

  function syncHeaderChromeLayout() {
    try {
      if (typeof window.swSyncChromeLayout === 'function') window.swSyncChromeLayout();
    } catch (e) {}
    setTimeout(syncReaderPageChromePadding, 0);
  }

  function isSameReadingPlace(last) {
    if (!last || !last.path) return true;
    try {
      var a = new URL(last.path, window.location.origin);
      var b = new URL(window.location.pathname + window.location.hash, window.location.origin);
      return a.pathname === b.pathname && a.hash === b.hash;
    } catch (e) {
      return String(last.path) === String(window.location.pathname + window.location.hash);
    }
  }

  function ensureContinueReadingChip() {
    /* Continue reading is on index.html only — not in the site header */
  }

  // ── Breadcrumb ──
  // The breadcrumb bar was DELETED (user ruling 2026-08-29): the footer
  // chapter control carries the location. This function now only keeps the
  // footer label in sync — every old call site still works.
  function updateBreadcrumb() {
    if (!_config.currentChapter || _config.currentChapter === 'landing') {
      syncChapterCenterBtn('');
      syncHeaderChromeLayout();
      return;
    }
    var bookInfo = findBook(_config.volume, _config.currentChapter);
    if (!bookInfo) {
      syncChapterCenterBtn('');
      syncHeaderChromeLayout();
      return;
    }
    syncChapterCenterBtn(dockChapterDisplayLabel(_config.currentChapter));
    syncHeaderChromeLayout();
  }

  function findBook(volKey, chapterId) {
    var vol = VOLUMES[volKey];
    if (!vol) return null;
    var best = null;
    var bestLen = -1;
    for (var d = 0; d < vol.divisions.length; d++) {
      var books = vol.divisions[d].books;
      for (var b = 0; b < books.length; b++) {
        var prefix = books[b].prefix;
        if (chapterId.indexOf(prefix) === 0 && prefix.length > bestLen) {
          best = books[b];
          bestLen = prefix.length;
        }
      }
    }
    return best;
  }


  // ── Site accent theme for the drawer and the right cross-reference panel ──
  // Injected as a late <style> (external-sheet overrides were not reliably
  // applied for these elements); navy #1e2233 + gold #f4ca48 like .sw-top-bar.
  function _injectAccentTheme() {
    if (document.getElementById('sw-accent-theme')) return;
    var st = document.createElement('style');
    st.id = 'sw-accent-theme';
    st.textContent =
      /* left drawer */
      '#nav-sidebar{background:var(--surface-0) !important;color:var(--on-surface) !important;border-right:2px solid var(--gold-bright) !important;box-shadow:4px 0 24px rgba(0,0,0,0.35) !important;}' +
      'body.dark-mode #nav-sidebar{background:var(--surface-0) !important;}' +
      '#nav-sidebar .nav-division,#nav-sidebar .nl-sec-title{color:var(--gold-bright) !important;border-top-color:rgba(244,202,72,0.25) !important;}' +
      '#nav-sidebar .nav-book-row:hover,#nav-sidebar .nav-book-row.expanded,#nav-sidebar .nav-book-row.nav-focus-row{background:var(--surface-2) !important;}' +
      '#nav-sidebar .nav-book-row .nb-heb{color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-book-row .nb-en{color:var(--gold-pale) !important;}' +
      '#nav-sidebar .nav-book-row .nb-ch,#nav-sidebar .nav-book-row .nb-arrow{color:rgba(244,202,72,0.85) !important;}' +
      '#nav-sidebar .nav-ch-grid{background:rgba(0,0,0,0.25) !important;}' +
      '#nav-sidebar .nav-ch-cell{background:var(--surface-2) !important;border-color:rgba(244,202,72,0.28) !important;}' +
      '#nav-sidebar .nav-ch-cell:hover{background:var(--surface-3) !important;border-color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-ch-cell.current{background:var(--gold-bright) !important;border-color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-ch-cell .ch-heb{color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-ch-cell .ch-num{color:var(--gold-pale) !important;}' +
      '#nav-sidebar .nav-ch-cell.current .ch-heb,#nav-sidebar .nav-ch-cell.current .ch-num{color:var(--surface-0) !important;}' +
      '#nav-sidebar .nav-search-results{background:var(--surface-sunken) !important;}' +
      '#nav-sidebar .nav-search-result{border-bottom-color:rgba(244,202,72,0.12) !important;}' +
      '#nav-sidebar .nav-search-result:hover,#nav-sidebar .nav-search-result.active{background:var(--surface-2) !important;}' +
      '#nav-sidebar .nav-search-result .sr-name{color:var(--on-surface) !important;}' +
      '#nav-sidebar .nav-search-result .sr-heb{color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-footer{background:var(--surface-sunken) !important;border-top-color:rgba(244,202,72,0.3) !important;}' +
      '#nav-sidebar .nav-footer .nf-hint{color:rgba(232,224,208,0.6) !important;}' +
      '#nav-sidebar .nl-card,#nav-sidebar .nl-bm,#nav-sidebar .nl-tile{background:var(--surface-2) !important;border-color:rgba(244,202,72,0.3) !important;}' +
      '#nav-sidebar .nl-card:hover,#nav-sidebar .nl-bm:hover,#nav-sidebar .nl-tile:hover{background:var(--surface-3) !important;border-color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nl-card-title,#nav-sidebar .nl-name,#nav-sidebar .nl-bm-title{color:var(--gold-pale) !important;}' +
      '#nav-sidebar .nl-card-heb,#nav-sidebar .nl-heb,#nav-sidebar .nl-bm-heb,#nav-sidebar .nl-card-text{color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nl-sub{color:rgba(232,224,208,0.65) !important;}' +
      'body.dark-mode #nav-sidebar .nav-book-row:hover,body.dark-mode #nav-sidebar .nav-book-row.expanded,' +
      'body.dark-mode #nav-sidebar .nav-ch-cell,body.dark-mode #nav-sidebar .nl-card,' +
      'body.dark-mode #nav-sidebar .nl-bm,body.dark-mode #nav-sidebar .nl-tile{background:var(--surface-1) !important;}' +
      'body.dark-mode #nav-sidebar .nav-search-results,body.dark-mode #nav-sidebar .nav-footer{background:var(--surface-sunken) !important;}' +
      '#nav-sidebar .nav-library,#nav-sidebar .nav-book-list{background:transparent !important;}' +
      '#nav-sidebar .nav-search-wrap{background:var(--surface-sunken) !important;border-bottom:1px solid rgba(244,202,72,0.35) !important;}' +
      '#nav-sidebar .nav-search-wrap input{background:var(--surface-2) !important;color:var(--gold-pale) !important;border:1px solid rgba(244,202,72,0.4) !important;}' +
      '#nav-sidebar .nav-search-wrap input::placeholder{color:rgba(244,202,72,0.55) !important;}' +
      '#nav-sidebar .nav-icon-btn,#nav-sidebar .nav-close-btn{color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-vol-tabs{background:var(--surface-sunken) !important;border-bottom:1px solid rgba(244,202,72,0.3) !important;}' +
      '#nav-sidebar .nav-vol-tab{color:rgba(244,202,72,0.8) !important;}' +
      '#nav-sidebar .nav-vol-tab:hover{background:var(--surface-2) !important;}' +
      '#nav-sidebar .nav-vol-tab.active{background:var(--surface-2) !important;border-bottom-color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-vol-tab .vt-heb{color:var(--gold-bright) !important;}' +
      '#nav-sidebar .nav-vol-tab .vt-en{color:rgba(244,202,72,0.85) !important;}' +
      '#nav-sidebar .nav-vol-tab.active .vt-en{color:var(--gold-pale) !important;}' +
      /* right cross-reference / study panel */
      '#xref-panel{background:var(--surface-0) !important;color:var(--on-surface) !important;border-left:2px solid var(--gold-bright) !important;}' +
      'body.dark-mode #xref-panel{background:var(--surface-0) !important;}' +
      '#xref-panel .xref-panel-header{background:var(--surface-sunken) !important;border-bottom:1px solid rgba(244,202,72,0.35) !important;}' +
      '#xref-panel .xref-panel-header h3,#xref-panel .xref-panel-word{color:var(--gold-bright) !important;}' +
      '#xref-panel .xref-panel-category{color:rgba(232,224,208,0.75) !important;}' +
      '#xref-panel .xref-panel-close{color:var(--gold-bright) !important;}' +
      '#xref-panel .xref-study-tabs{background:var(--surface-sunken) !important;border-bottom-color:rgba(244,202,72,0.3) !important;}' +
      '#xref-panel .xref-study-tab{background:var(--surface-2) !important;color:rgba(244,202,72,0.85) !important;border-color:rgba(244,202,72,0.3) !important;}' +
      '#xref-panel .xref-study-tab.active{background:var(--gold-bright) !important;color:var(--surface-0) !important;font-weight:700 !important;}' +
      '#xref-panel .xref-ref-word,#xref-panel .xref-category{color:var(--gold-bright) !important;}' +
      '#xref-panel .xref-ref-content{color:var(--on-surface) !important;}' +
      '#xref-panel .xf-bookmark-item{background:var(--surface-2) !important;border-color:rgba(244,202,72,0.25) !important;}' +
      '#xref-panel .xf-bookmark-item:hover{background:var(--surface-3) !important;}' +
      '#xref-panel .xf-bookmark-item .xf-bm-title{color:var(--gold-pale) !important;}' +
      '#xref-panel .xf-bookmark-item .xf-bm-heb{color:var(--gold-bright) !important;}' +
      '#xref-panel .study-pane-hint,#xref-panel .study-pane-sub{color:rgba(232,224,208,0.7) !important;}' +
      '#xref-panel .study-btn-row button{background:var(--surface-2) !important;color:var(--gold-pale) !important;border:1px solid rgba(244,202,72,0.4) !important;}' +
      '#xref-panel .study-btn-row button:hover{background:var(--surface-3) !important;border-color:var(--gold-bright) !important;}' +
      /* interlinear verse previews inside the panel: readable on navy */
      '#xref-panel .hw{color:var(--gold-bright) !important;}' +
      '#xref-panel .tl{color:rgba(232,224,208,0.65) !important;}' +
      '#xref-panel .gl{color:var(--gold-pale) !important;}' +
      '#xref-panel .arr-tl,#xref-panel .arr-gl{color:rgba(244,202,72,0.45) !important;}' +
      '#xref-panel .verse-num{color:rgba(244,202,72,0.8) !important;}' +
      '#xref-panel .verse{border-color:rgba(244,202,72,0.15) !important;}' +
      '#xref-panel .xref-refs,#xref-panel .xref-pane{color:var(--on-surface) !important;}' +
      '#xref-panel .xref-ref-loading,#xref-panel .xref-ref-nodata{color:rgba(232,224,208,0.7) !important;}' +
      /* cross-reference cards: title row, go-to link, interlinear words */
      '#xref-panel .xref-ref-card{background:var(--surface-2) !important;border:1px solid rgba(244,202,72,0.2) !important;border-radius:10px;}' +
      '#xref-panel .xref-ref-title,#xref-panel .xref-ref-title span{color:var(--gold-bright) !important;}' +
      '#xref-panel .xref-ref-goto{color:var(--gold-bright) !important;text-decoration:underline;}' +
      '#xref-panel .xref-ref-word{color:var(--on-surface) !important;}' +
      '#xref-panel .xref-ref-word .en,#xref-panel .en{color:var(--gold-pale) !important;}' +
      '#xref-panel .xref-ref-word .he,#xref-panel .he{color:var(--gold-bright) !important;}' +
      /* Phones: slide panels take the FULL screen — half-panels are useless on
         a small display (user request). Widths only, as 100% of the viewport's usable width (100vw counts the
         scrollbar and hangs a drawer 15px off the edge on a narrow desktop window);
         where a drawer sits is the drawer contract in nav_engine.css. */
      '@media (max-width: 700px) {' +
        '#nav-sidebar{width:100% !important;max-width:100% !important;}' +
        '#glossary-panel{width:100% !important;max-width:100% !important;}' +
        '#xref-panel{width:100% !important;max-width:100% !important;}' +
        '#annotations-panel{width:100% !important;max-width:100% !important;}' +
        '#rsc-panel .rsc-panel-card{width:100vw !important;max-width:100vw !important;height:100dvh;max-height:100dvh !important;' +
          'border-radius:0 !important;border-left:none !important;border-right:none !important;' +
          'left:0 !important;top:0 !important;transform:none !important;}' +
      '}';
    document.head.appendChild(st);
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
      // Only reuse browser hash when it already matches this chapter (NavEngine.update
      // runs before bom.html updates history, so location.hash is often stale).
      if (_config && volKey === _config.volume && typeof window !== 'undefined' && window.location && window.location.hash && window.location.hash.length > 1) {
        var cur = window.location.hash.replace(/^#/, '');
        var verseMatch = cur.match(/^(.+):(\d+)$/);
        var curBase = verseMatch ? verseMatch[1] : cur;
        if (hash && curBase === hash) {
          url = vol.page + window.location.hash;
        }
      }
    } catch (e) {}
    try {
      localStorage.setItem('sw-last-read', JSON.stringify({
        volume: volKey, chapter: chapterId, label: label,
        heb: bookInfo ? bookInfo.heb : '', path: url, timestamp: Date.now()
      }));
    } catch(e) {}
    // Per-volume bookmark (feeds the hub's six Continue-reading links).
    // Keep the finer verse position when re-saving the same chapter.
    // A landing / front-matter update carries no book — never let it
    // overwrite a real saved position with an empty record.
    if (!bookInfo) return;
    try {
      var pvKey = 'sw-last-read-' + volKey;
      var prev = null;
      try { prev = JSON.parse(localStorage.getItem(pvKey)); } catch(e2) { prev = null; }
      var rec = {
        volume: volKey, chapter: chapterId, label: label,
        heb: bookInfo ? bookInfo.heb : '', path: url, timestamp: Date.now()
      };
      if (prev && prev.chapter === chapterId && prev.verse) {
        rec.verse = prev.verse;
        rec.vlabel = prev.vlabel;
        if (prev.path) rec.path = prev.path;
      }
      localStorage.setItem(pvKey, JSON.stringify(rec));
    } catch(e) {}
  }

  // ── Verse-level position tracking (refines the per-volume bookmark) ──
  var _vtTimer = null;
  function captureVersePosition() {
    if (!_config || _config.hub || !_config.volume) return;
    var chap = _config.currentChapter;
    if (!chap || chap === 'landing') return;
    var book = findBook(_config.volume, chap);
    if (!book) return;
    var probe = null;
    var px = Math.max(20, Math.floor(window.innerWidth / 2));
    var pys = [130, Math.floor(window.innerHeight * 0.35)];
    for (var i = 0; i < pys.length && !probe; i++) {
      var el = document.elementFromPoint(px, pys[i]);
      probe = el && el.closest ? el.closest('.verse[data-verse-key]') : null;
    }
    if (!probe) return;
    var kp = (probe.getAttribute('data-verse-key') || '').split('|');
    var vNum = kp.length === 3 ? parseInt(kp[2], 10) : 0;
    if (!vNum) return;
    var chNum = chap.replace(book.prefix, '');
    if (kp[1] && String(kp[1]) !== String(chNum)) return;
    var label = book.en;
    if (book.ch > 1) label += ' ' + chNum;
    var vol = VOLUMES[_config.volume];
    var hash = buildHash(_config.volume, chap);
    var vSuffix = _config.volume === 'bom' ? ':' + vNum : '&v=' + vNum;
    try {
      localStorage.setItem('sw-last-read-' + _config.volume, JSON.stringify({
        volume: _config.volume, chapter: chap, label: label,
        heb: book.heb, verse: vNum,
        vlabel: book.en + ' ' + (book.ch > 1 ? chNum : '1') + ':' + vNum,
        path: vol.page + (hash ? '#' + hash + vSuffix : ''),
        timestamp: Date.now()
      }));
    } catch(e) {}
  }
  function installVersePositionTracker() {
    if (!_config || _config.hub || !_config.volume) return;
    window.addEventListener('scroll', function() {
      if (_vtTimer) clearTimeout(_vtTimer);
      _vtTimer = setTimeout(captureVersePosition, 600);
    }, { passive: true, capture: true });
  }

  function resolveLastReadUrl(data) {
    if (!data) return null;
    var vol = data.volume && VOLUMES[data.volume];
    if (vol && data.chapter) {
      var hash = buildHash(data.volume, data.chapter);
      if (hash) {
        var page = (data.path && data.path.split('#')[0]) || vol.page;
        return page + '#' + hash;
      }
    }
    return data.path || null;
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

    // Chapter prev/next: footer bar only (no horizontal swipe — avoids fighting text selection / highlights)
  }

  // ── Torah quick dock (בית + חמש חומשים) below the mode bar ──
  var TORAH_DOCK_LAST_KEY = 'sw-torah-dock-last-v1';
  var _quickDockInstalled = false;
  var BOOK_ICON_SVG =
    '<svg class="nqd-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>' +
    '<path d="M16 3v6l-1.25-1L13 9V3"/></svg>';
  var HOME_ICON_SVG =
    '<svg class="nqd-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">' +
    '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';

  function stripNikkudForDock(s) {
    return (s || '').replace(/[\u0591-\u05BD\u05BF-\u05C0\u05C3-\u05C7]/g, '');
  }

  function dockHomeHref() {
    var p = (window.location && window.location.pathname) ? window.location.pathname : '';
    return p.indexOf('/bom/') >= 0 || /\\bom\\/.test(p) ? '../index.html' : 'index.html';
  }

  function getTorahDockTargetChapter(book) {
    try {
      var raw = localStorage.getItem(TORAH_DOCK_LAST_KEY);
      var map = raw ? JSON.parse(raw) : {};
      if (!map || typeof map !== 'object') map = {};
      var saved = map[book.id];
      if (saved && typeof saved === 'string' && saved.indexOf(book.prefix) === 0) {
        var tail = saved.substring(book.prefix.length);
        var num = parseInt(tail, 10);
        if (!isNaN(num) && num >= 1 && num <= book.ch) return saved;
      }
    } catch (e) {}
    return book.prefix + '1';
  }

  function rememberTorahDockChapter(chapterId) {
    if (!_config || _config.volume !== 'ot' || !chapterId) return;
    var torahDiv = VOLUMES.ot && VOLUMES.ot.divisions && VOLUMES.ot.divisions[0];
    var books = torahDiv && torahDiv.books;
    if (!books) return;
    for (var i = 0; i < 5; i++) {
      var bk = books[i];
      if (chapterId.indexOf(bk.prefix) === 0) {
        try {
          var raw = localStorage.getItem(TORAH_DOCK_LAST_KEY);
          var map = raw ? JSON.parse(raw) : {};
          if (!map || typeof map !== 'object') map = {};
          map[bk.id] = chapterId;
          localStorage.setItem(TORAH_DOCK_LAST_KEY, JSON.stringify(map));
        } catch (e2) {}
        return;
      }
    }
  }

  function getReaderFooter() {
    return document.getElementById('sw-reader-footer');
  }

  function createChapterNavButton(which, heb, enLabel) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nqd-nav-btn nqd-nav-' + which;
    btn.id = which === 'prev' ? 'nqd-nav-prev' : 'nqd-nav-next';
    btn.setAttribute('aria-label', which === 'prev' ? 'Previous chapter' : 'Next chapter');
    btn.innerHTML =
      '<span class="nqd-nav-he" dir="rtl" lang="he">' + heb + '</span>' +
      '<span class="nqd-nav-en" dir="ltr">' + enLabel + '</span>';
    btn.onclick = function() { triggerChapterNav(which); };
    return btn;
  }

  function syncQuickDockActive() {
    var dock = getReaderFooter();
    if (!dock || !_config) return;
    var cur = _config.currentChapter || '';
    dock.querySelectorAll('.nqd-item[data-dock-vol]').forEach(function(el) {
      var v = el.getAttribute('data-dock-vol');
      el.classList.toggle('active', !!v && _config.volume === v);
    });
  }

  function getCurrentChapterId() {
    var cur = _config && _config.currentChapter;
    if (cur && cur !== 'landing') return cur;
    try {
      if (typeof window.currentChapterId !== 'undefined' && window.currentChapterId) return window.currentChapterId;
    } catch (e) {}
    return null;
  }

  function getAdjacentChapterIds() {
    var cur = getCurrentChapterId();
    if (!cur) return { prev: null, next: null };

    if (typeof window.chapterOrder !== 'undefined' && Array.isArray(window.chapterOrder)) {
      var cidx = window.chapterOrder.indexOf(cur);
      if (cidx >= 0) {
        return {
          prev: cidx > 0 ? window.chapterOrder[cidx - 1] : null,
          next: cidx < window.chapterOrder.length - 1 ? window.chapterOrder[cidx + 1] : null
        };
      }
    }

    if (typeof window.fullPageOrder !== 'undefined' && Array.isArray(window.fullPageOrder)) {
      var pageId = cur;
      try {
        if (typeof window.currentPageId !== 'undefined' && window.currentPageId) pageId = window.currentPageId;
      } catch (e2) {}
      var pidx = window.fullPageOrder.indexOf(pageId);
      if (pidx < 0) pidx = window.fullPageOrder.indexOf(cur);
      if (pidx >= 0) {
        return {
          prev: pidx > 0 ? window.fullPageOrder[pidx - 1] : null,
          next: pidx < window.fullPageOrder.length - 1 ? window.fullPageOrder[pidx + 1] : null
        };
      }
    }
    return { prev: null, next: null };
  }

  function chapterShortLabel(chapterId) {
    if (!chapterId) return '';
    try {
      if (typeof window.getChapterLabel === 'function') {
        return String(window.getChapterLabel(chapterId)).replace(/\s*\u25BE\s*$/g, '').trim();
      }
    } catch (e) {}
    if (!_config || !_config.volume) return '';
    var bookInfo = findBook(_config.volume, chapterId);
    if (!bookInfo) return '';
    var chNum = chapterId.replace(bookInfo.prefix, '');
    var label = bookInfo.en;
    if (bookInfo.ch > 1) label += ' ' + chNum;
    return label;
  }

  function setDockNavButtonLabels(btn, hebDefault, enDefault, destLabel) {
    if (!btn) return;
    var he = btn.querySelector('.nqd-nav-he');
    var en = btn.querySelector('.nqd-nav-en');
    if (he) he.textContent = hebDefault;
    if (en) {
      if (destLabel) en.textContent = destLabel;
      else en.textContent = enDefault;
    }
  }

  function dockChapterDisplayLabel(chapterId) {
    if (!chapterId) return '';
    try {
      if (typeof window.getChapterLabel === 'function') {
        return String(window.getChapterLabel(chapterId)).replace(/\s*\u25BE\s*$/g, '').trim();
      }
    } catch (e) {}
    try {
      if (typeof window.getBookProgress === 'function') {
        var progress = window.getBookProgress(chapterId);
        if (progress) {
          var main = progress.bookName || '';
          if (progress.totalChapters > 1 && progress.chapterNum) main += ' ' + progress.chapterNum;
          return main.trim();
        }
      }
    } catch (e2) {}
    return chapterShortLabel(chapterId);
  }

  function syncChapterCenterBtn(label) {
    var center = document.getElementById('nqd-chapter-now');
    if (!center) return;
    var text = label || dockChapterDisplayLabel(getCurrentChapterId());
    if (!text) {
      try {
        var navLabel = document.getElementById('nav-label');
        if (navLabel) {
          var clone = navLabel.cloneNode(true);
          var prog = clone.querySelector('#nav-progress-text');
          if (prog) prog.remove();
          text = (clone.textContent || '').replace(/\s*\u25BE\s*$/g, '').replace(/\s+/g, ' ').trim();
        }
      } catch (e) {}
    }
    var shown = text || '\u05E1\u05E4\u05E8\u05D9\u05DD';
    var slot = center.querySelector('.nqd-now-label');
    if (slot) slot.textContent = shown; else center.textContent = shown;
    center.title = '\u05E4\u05EA\u05D7 \u05E8\u05E9\u05D9\u05DE\u05EA \u05E1\u05E4\u05E8\u05D9\u05DD \u00B7 ' + shown;
    center.setAttribute('aria-label', shown + ' \u2014 open book list');
  }

  /* The footer's chapter control opens the book list for the volume in hand —
     D&C from a section, the Book of Mormon from 1 Nephi, the NT from John —
     so navigation is reachable at the bottom of the screen instead of only
     from the hamburger in the top corner. */
  function openBooksForCurrentVolume() {
    var vol = (_config && _config.volume) || null;
    if (!vol) { openSidebar(); return; }
    openSidebar();
    try { setViewMode('books'); } catch (e) {}
    try { switchVolTab(vol); } catch (e2) {}
  }

  function openCurrentBookChapters() {
    if (!_config || !_config.volume) {
      openSidebar();
      return;
    }
    var cur = getCurrentChapterId();
    var bookInfo = cur ? findBook(_config.volume, cur) : null;
    if (bookInfo) {
      try {
        if (typeof focusBook === 'function') {
          focusBook(_config.volume, bookInfo.id);
          return;
        }
      } catch (e) {}
      if (window.NavEngine && typeof NavEngine.openToBook === 'function') NavEngine.openToBook(bookInfo.id);
      return;
    }
    openSidebar();
    try { setViewMode('books'); } catch (e2) {}
    switchVolTab(_config.volume);
  }

  function syncDockChapterNav() {
    var dockPrev = document.getElementById('nqd-nav-prev');
    var dockNext = document.getElementById('nqd-nav-next');
    if (!dockPrev || !dockNext) return;
    var prev = document.getElementById('nav-prev');
    var next = document.getElementById('nav-next');
    if (prev) dockPrev.disabled = !!prev.disabled;
    if (next) dockNext.disabled = !!next.disabled;

    var peers = getAdjacentChapterIds();
    var prevLabel = dockChapterDisplayLabel(peers.prev);
    var nextLabel = dockChapterDisplayLabel(peers.next);
    setDockNavButtonLabels(dockPrev, '\u05D4\u05E7\u05D5\u05D3\u05DD', 'Prev', prevLabel);
    setDockNavButtonLabels(dockNext, '\u05D4\u05D1\u05D0', 'Next', nextLabel);
    syncChapterCenterBtn(dockChapterDisplayLabel(getCurrentChapterId()));
  }

  function hookDockChapterNavSync() {
    if (window._swDockNavHooked) return;
    window._swDockNavHooked = true;
    var orig = window.updateNavButtons;
    if (typeof orig === 'function') {
      window.updateNavButtons = function() {
        orig.apply(this, arguments);
        syncDockChapterNav();
      };
    }
    syncDockChapterNav();
  }

  function triggerChapterNav(direction) {
    if (direction === 'prev') {
      if (typeof goPrev === 'function') { goPrev(); return; }
      var p = document.getElementById('nav-prev');
      if (p && !p.disabled) p.click();
      return;
    }
    if (typeof goNext === 'function') { goNext(); return; }
    var n = document.getElementById('nav-next');
    if (n && !n.disabled) n.click();
  }

  // Swipe left/right turns the chapter like a page: the sheet follows the
  // finger, springs back on a short drag, and on commit slides off while the
  // next chapter slides in from the opposite side (the Gospel-Library /
  // Kindle pattern). Guards keep it from ever fighting text selection (the
  // old reason swipe was removed) or the OS edge gestures: an active
  // selection wins, the 24px edge strips are left to the system, and the
  // gesture only locks once horizontal intent clearly beats vertical scroll.
  // Hebrew page order: dragging rightward reveals the next (left-hand)
  // chapter, leftward the previous.
  function installSwipeChapterNav() {
    if (window._swSwipeNavHooked) return;
    window._swSwipeNavHooked = true;
    var sx = 0, sy = 0, st = 0, live = false, locked = false, sheet = null, fromWord = false;
    var reduceMotion = false;
    try { reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (eRM) {}

    function currentSheet() {
      // The whole sheet turns — .page carries the book header and the chapter
      // body together. Sliding only the chapter-panel left the title standing
      // while the text underneath moved.
      return document.querySelector('.page');
    }
    function clipX(on) {
      try { document.documentElement.style.overflowX = on ? 'hidden' : ''; } catch (e) {}
    }
    function navDisabled(dir) {
      var b = document.getElementById(dir === 'next' ? 'nqd-nav-next' : 'nqd-nav-prev');
      return !!(b && b.disabled);
    }
    function releaseSheet(el) {
      if (!el) return;
      el.style.transition = '';
      el.style.transform = '';
      el.style.willChange = '';
    }
    function springBack() {
      var el = sheet; sheet = null; locked = false;
      if (!el) { clipX(false); return; }
      if (reduceMotion) { releaseSheet(el); clipX(false); return; }
      el.style.transition = 'transform 0.18s ease-out';
      el.style.transform = 'translateX(0px)';
      setTimeout(function() { releaseSheet(el); clipX(false); }, 200);
    }
    function completeTurn(dir, dx) {
      var el = sheet; sheet = null; locked = false;
      if (!el) { clipX(false); return; }
      if (reduceMotion) { releaseSheet(el); triggerChapterNav(dir); clipX(false); return; }
      var off = (dx > 0 ? 1 : -1) * (window.innerWidth + 60);
      el.style.transition = 'transform 0.2s ease-in';
      el.style.transform = 'translateX(' + off + 'px)';
      setTimeout(function() {
        releaseSheet(el);
        triggerChapterNav(dir);
        var incoming = currentSheet() || el;
        incoming.style.transition = 'none';
        incoming.style.transform = 'translateX(' + (-off) + 'px)';
        void incoming.offsetWidth;
        incoming.style.transition = 'transform 0.22s ease-out';
        incoming.style.transform = 'translateX(0px)';
        setTimeout(function() { releaseSheet(incoming); clipX(false); }, 260);
      }, 210);
    }

    document.addEventListener('touchstart', function(e) {
      live = false;
      if (locked || sheet) return;
      if (!e.touches || e.touches.length !== 1) return;
      var t = e.touches[0];
      if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
      if (e.target.closest && e.target.closest(
        '#nav-sidebar, #sw-reader-footer, .controls-bottom, .controls-top, #glossary-panel, ' +
        '#xref-panel, #annotations-panel, #search-container, #search-results, #sel-toolbar, ' +
        '#hl-pop, #word-popup, #share-popup, #note-modal, input, textarea, select, button, a')) return;
      sx = t.clientX; sy = t.clientY; st = Date.now(); live = true; locked = false;
      fromWord = !!(e.target.closest && e.target.closest('.word-unit'));
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!live) return;
      if (!e.touches || e.touches.length !== 1 || window._swWordSelActive) {
        live = false;
        if (locked) springBack();
        return;
      }
      var t = e.touches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (!locked) {
        // A press that starts on a word may be a long-press-to-highlight in
        // progress: give it drift room (34px) before the page-drag may lock;
        // elsewhere 14px is enough. The selection timer itself survives 22px.
        var lockAt = fromWord ? 34 : 14;
        if (fromWord && window._swWselPending) return;
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { live = false; return; }
        if (Math.abs(dx) > lockAt && Math.abs(dx) > 1.4 * Math.abs(dy)) {
          try {
            var sel = window.getSelection();
            if (sel && !sel.isCollapsed && sel.toString().trim()) { live = false; return; }
          } catch (err) {}
          var pop = document.getElementById('hl-pop');
          if (pop && pop.classList.contains('visible')) { live = false; return; }
          sheet = currentSheet();
          if (!sheet) { live = false; return; }
          locked = true;
          sheet.style.willChange = 'transform';
          clipX(true);
        } else {
          return;
        }
      }
      e.preventDefault();
      if (sheet) {
        // a turn that cannot happen (first/last chapter) drags with resistance
        var blocked = navDisabled(dx > 0 ? 'next' : 'prev');
        sheet.style.transform = 'translateX(' + (blocked ? dx / 3 : dx) + 'px)';
      }
    }, { passive: false });

    document.addEventListener('touchend', function(e) {
      if (!live) return;
      live = false;
      if (!locked || !sheet) return;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) { springBack(); return; }
      var dx = t.clientX - sx, dt = Math.max(Date.now() - st, 1);
      var dir = dx > 0 ? 'next' : 'prev';
      var flick = Math.abs(dx) / dt > 0.5 && Math.abs(dx) > 40;
      if ((Math.abs(dx) > window.innerWidth * 0.28 || flick) && !navDisabled(dir)) {
        completeTurn(dir, dx);
      } else {
        springBack();
      }
    }, { passive: true });

    document.addEventListener('touchcancel', function() {
      live = false;
      if (locked) springBack();
    }, { passive: true });
  }

  // Touch word-range selection: iOS cannot drag a native selection across the
  // interlinear's per-word islands, so on touch the Hebrew line is selected
  // here instead — hold a word, sweep across its neighbours (each gets a
  // preview tint), release, and the highlight popover opens on the range.
  function installTouchWordSelection() {
    if (window._swWselHooked) return;
    window._swWselHooked = true;
    if (!document.getElementById('hl-pop')) return;
    var timer = null, active = false, anchorWu = null, panelWords = null, lastRange = [];
    var startX = 0, startY = 0;

    function clearTint() {
      for (var i = 0; i < lastRange.length; i++) lastRange[i].classList.remove('wsel');
      lastRange = [];
    }
    // Wrap the page's hide/show so the preview tint always clears with the
    // popover, and so the native-selection path can't tear down a custom
    // range (it sees a collapsed native selection and would dismiss).
    if (typeof window._hideSelToolbar === 'function' && !window._hideSelToolbar._wselWrapped) {
      var origHide = window._hideSelToolbar;
      var wrappedHide = function() { clearTint(); return origHide.apply(this, arguments); };
      wrappedHide._wselWrapped = true;
      window._hideSelToolbar = wrappedHide;
    }
    if (typeof window._showSelToolbar === 'function' && !window._showSelToolbar._wselWrapped) {
      var origShow = window._showSelToolbar;
      var wrappedShow = function() {
        if (lastRange.length) return;
        return origShow.apply(this, arguments);
      };
      wrappedShow._wselWrapped = true;
      window._showSelToolbar = wrappedShow;
    }
    function wordFromPoint(x, y) {
      var el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest('.word-unit[data-wid]') : null;
    }
    function rangeBetween(a, b) {
      if (!panelWords) return [a];
      var ia = panelWords.indexOf(a), ib = panelWords.indexOf(b);
      if (ia < 0 || ib < 0) return [a];
      var lo = Math.min(ia, ib), hi = Math.max(ia, ib);
      return panelWords.slice(lo, hi + 1);
    }
    function setRange(words) {
      clearTint();
      lastRange = words;
      for (var i = 0; i < words.length; i++) words[i].classList.add('wsel');
    }
    function cancel() {
      if (timer) { clearTimeout(timer); timer = null; window._swWselPending = false; }
      if (active) { clearTint(); active = false; window._swWordSelActive = false; }
      anchorWu = null;
    }
    document.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) { cancel(); return; }
      var t = e.touches[0];
      // A tap outside a stale popover dismisses it — the custom range has no
      // native selection whose collapse would do it.
      var pop = document.getElementById('hl-pop');
      if (pop && pop.classList.contains('visible') && !(e.target.closest && e.target.closest('#hl-pop'))) {
        try {
          var sel = window.getSelection();
          if (!sel || sel.isCollapsed) window._hideSelToolbar();
        } catch (eSel) {}
      }
      if (!e.target.closest) return;
      var wu = e.target.closest('.word-unit[data-wid]');
      if (!wu || !e.target.closest('.hw')) return;
      anchorWu = wu; startX = t.clientX; startY = t.clientY;
      window._swWselPending = true;
      timer = setTimeout(function() {
        timer = null;
        window._swWselPending = false;
        active = true;
        window._swWordSelActive = true;
        var panel = anchorWu.closest('.chapter-panel') || anchorWu.closest('.page') || document;
        panelWords = Array.prototype.slice.call(panel.querySelectorAll('.word-unit[data-wid]'));
        setRange([anchorWu]);
      }, 250);
    }, { passive: true });
    document.addEventListener('touchmove', function(e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      if (timer && (Math.abs(t.clientX - startX) > 28 || Math.abs(t.clientY - startY) > 28)) {
        clearTimeout(timer); timer = null; anchorWu = null;
        window._swWselPending = false;
        return;
      }
      if (!active) return;
      e.preventDefault();
      var wu = wordFromPoint(t.clientX, t.clientY);
      if (wu && anchorWu) setRange(rangeBetween(anchorWu, wu));
    }, { passive: false });
    document.addEventListener('touchend', function(e) {
      if (timer) { clearTimeout(timer); timer = null; anchorWu = null; window._swWselPending = false; }
      if (!active) return;
      e.preventDefault();
      active = false;
      window._swWordSelActive = false;
      anchorWu = null;
      if (!lastRange.length) return;
      window._selWordUnits = lastRange.slice();
      window._selMode = 'word';
      window._selTier = 'hw';
      var pop = document.getElementById('hl-pop');
      var rowHl = document.getElementById('hl-row-hl');
      var rowUl = document.getElementById('hl-row-ul');
      var noteRow = document.getElementById('hl-note-row');
      if (rowHl) rowHl.style.display = 'flex';
      if (rowUl) rowUl.style.display = 'flex';
      if (noteRow) noteRow.style.display = 'none';
      pop.classList.add('visible');
      if (typeof window._updateSelToolbarIndicators === 'function') window._updateSelToolbarIndicators();
    }, { passive: false });
    document.addEventListener('touchcancel', cancel, { passive: true });
    document.addEventListener('contextmenu', function(e) {
      if (active) e.preventDefault();
    });
  }

  function syncQuickDockLayout() {
    var footer = getReaderFooter();
    if (!footer || !_quickDockInstalled) return;
    try {
      footer.style.display = 'flex';
      var h = footer.offsetHeight + 'px';
      document.documentElement.style.setProperty('--sw-reader-footer-h', h);
      document.documentElement.style.setProperty('--sw-quick-dock-h', h);
    } catch (e) {}
    syncReaderPageChromePadding();
  }

  function firstChapterIdForVolume(volKey) {
    var vol = VOLUMES[volKey];
    if (!vol || !vol.divisions) return null;
    for (var d = 0; d < vol.divisions.length; d++) {
      var books = vol.divisions[d].books;
      if (!books) continue;
      for (var i = 0; i < books.length; i++) {
        var b = books[i];
        if (b.isFront) continue;
        return b.prefix + '1';
      }
    }
    var fb = vol.divisions[0].books[0];
    return fb ? (fb.isFront ? fb.prefix : fb.prefix + '1') : null;
  }

  function createQuickDock() {
    if (_quickDockInstalled) return;
    if (_config && _config.hub) return;
    var modeBar = document.querySelector('.controls-bottom');
    if (!modeBar) return;

    _quickDockInstalled = true;
    document.body.classList.add('sw-has-quick-dock');

    var footer = document.createElement('footer');
    footer.id = 'sw-reader-footer';
    footer.className = 'sw-reader-footer';
    footer.setAttribute('role', 'contentinfo');
    footer.setAttribute('aria-label', 'Reader footer');

    var rowNav = document.createElement('div');
    rowNav.className = 'nqd-row nqd-chapter-nav';
    rowNav.setAttribute('role', 'toolbar');
    rowNav.setAttribute('aria-label', 'Chapter navigation');
    /* RTL: first item sits on the right — Previous right, Next left */
    rowNav.appendChild(createChapterNavButton('prev', '\u05D4\u05E7\u05D5\u05D3\u05DD', 'Prev'));
    var centerBtn = document.createElement('button');
    centerBtn.type = 'button';
    centerBtn.className = 'nqd-chapter-now';
    centerBtn.id = 'nqd-chapter-now';
    centerBtn.setAttribute('dir', 'ltr');
    centerBtn.setAttribute('lang', 'en');
    centerBtn.setAttribute('aria-label', 'Open book list');
    centerBtn.innerHTML = '<span class="nqd-now-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round">' +
      '<path d="M2 4h12M2 8h12M2 12h12"/></svg></span>' +
      '<span class="nqd-now-label"></span>';
    centerBtn.onclick = function(e) {
      e.stopPropagation();
      openBooksForCurrentVolume();
    };
    rowNav.appendChild(centerBtn);
    rowNav.appendChild(createChapterNavButton('next', '\u05D4\u05D1\u05D0', 'Next'));
    rowNav.setAttribute('title', 'Double-tap or double-click anywhere to show or hide reading modes');
    footer.appendChild(rowNav);

    modeBar.classList.add('sw-footer-modes');
    footer.appendChild(modeBar);

    document.body.appendChild(footer);
    document.body.classList.add('sw-footer-ready');
    syncQuickDockActive();
    hookDockChapterNavSync();
    installSwipeChapterNav();
    installTouchWordSelection();

    window.addEventListener(
      'resize',
      function() {
        syncQuickDockLayout();
      },
      { passive: true }
    );

    setTimeout(syncQuickDockLayout, 0);
    setTimeout(syncQuickDockLayout, 300);
    setTimeout(function() {
      try {
        if (typeof window.swMarkShellReady === 'function') window.swMarkShellReady();
      } catch (eReady) {}
    }, 0);
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
      var bomLegacyBar = localStorage.getItem('bom-hide-bottom-bar');
      if (sw === '1' || leg === '1' || bomLegacyBar === '1') {
        document.body.classList.add('reader-footer-hidden');
        document.body.classList.add('hide-bottom-bar');
        if (leg === '1' && sw !== '1') {
          localStorage.setItem(READ_FTR_LS, '1');
          localStorage.removeItem(READ_FTR_LS_LEGACY);
        }
        if (sw !== '1') localStorage.setItem(READ_FTR_LS, '1');
        try {
          localStorage.setItem('bom-hide-bottom-bar', '1');
        } catch (eBom) {}
      }
    } catch (e) {}

    // Overlays / panels only — footer, header, and reading surface accept double-tap to collapse.
    var SEL_IGNORE =
      '#nav-sidebar, #nav-overlay, ' +
      '.nav-search-wrap, .nav-search-results, .nav-library, .nav-vol-tabs, .nav-book-list, ' +
      '#xref-panel.open, #word-popup, #search-container.open, #search-results.open, ' +
      '#glossary-panel, #annotations-panel, #share-popup, #share-overlay, #shortcuts-overlay.open, ' +
      '#sel-toolbar, #verse-action-menu, .safari-browser-tip, .global-search-wrap, #gs-results, ' +
      '[role="dialog"]';
    var SEL_INTERACTIVE =
      'button, a[href], input, textarea, select, label[for], [role="button"], [role="link"], [contenteditable="true"]';
    function collapseGestureTarget(el) {
      if (!el) return false;
      if (el.nodeType === 3 && el.parentElement) el = el.parentElement;
      if (!el || el.nodeType !== 1 || !el.closest) return false;
      if (el.closest(SEL_IGNORE)) return false;
      if (el.closest(SEL_INTERACTIVE)) return false;
      return true;
    }
    function hasReadableTextSelection() {
      try {
        var sel = window.getSelection();
        return !!(sel && !sel.isCollapsed && /\S/.test((sel.toString() || '').replace(/\u00a0/g, ' ')));
      } catch (eSel) {
        return false;
      }
    }
    function toggleReadingFooterBar() {
      if (!document.querySelector('.controls-bottom')) return;
      var hidden = document.body.classList.toggle('reader-footer-hidden');
      document.body.classList.toggle('hide-bottom-bar', hidden);
      try {
        localStorage.setItem(READ_FTR_LS, hidden ? '1' : '0');
        localStorage.removeItem(READ_FTR_LS_LEGACY);
        localStorage.setItem('bom-hide-bottom-bar', hidden ? '1' : '0');
      } catch (e2) {}
      try {
        window.dispatchEvent(new Event('resize'));
      } catch (e3) {}
      requestAnimationFrame(function() {
        syncQuickDockLayout();
        syncDockChapterNav();
      });
    }

    var lastTap = 0, lastTapX = 0, lastTapY = 0;
    var tapStartX = 0, tapStartY = 0, tapMoved = false;

    // The first tap of the gesture opens the word popup, so the SECOND tap lands
    // on #word-popup — which SEL_IGNORE would otherwise reject, killing the
    // gesture every time. Treat a popup that the pending first tap opened as
    // transparent, and dismiss it along with the toggle.
    function onPendingWordPopup(el) {
      if (!lastTap || !el || !el.closest) return false;
      return !!el.closest('#word-popup, #word-popup-overlay');
    }
    function dismissWordPopup() {
      try {
        if (typeof window.closePopup === 'function') window.closePopup();
      } catch (ePop) {}
    }

    function doubleTapWindowMs() {
      var tapWin = 650;
      try {
        if ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) tapWin = 850;
      } catch (eTap) {}
      return tapWin;
    }

    document.addEventListener(
      'touchstart',
      function(e) {
        if (!e.touches || e.touches.length !== 1) {
          tapMoved = true;
          lastTap = 0;
          return;
        }
        tapStartX = e.touches[0].clientX;
        tapStartY = e.touches[0].clientY;
        tapMoved = false;
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      'touchmove',
      function(e) {
        if (tapMoved) return;
        if (!e.touches || e.touches.length !== 1) {
          tapMoved = true;
          return;
        }
        var t = e.touches[0];
        if (Math.abs(t.clientX - tapStartX) > 12 || Math.abs(t.clientY - tapStartY) > 12) tapMoved = true;
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      'touchend',
      function(e) {
        if (!document.querySelector('.controls-bottom')) return;
        var ct = e.changedTouches;
        if (!ct || ct.length !== 1) return;
        // A scroll ends in a touchend too — it must not seed or complete the gesture.
        if (tapMoved) {
          tapMoved = false;
          lastTap = 0;
          return;
        }
        var onPopup = onPendingWordPopup(e.target);
        if (!onPopup && !collapseGestureTarget(e.target)) {
          lastTap = 0;
          return;
        }
        var t = ct[0];
        var now = Date.now();
        var tapWin = doubleTapWindowMs();
        var near = Math.abs(t.clientX - lastTapX) <= 48 && Math.abs(t.clientY - lastTapY) <= 48;
        if (lastTap && near && now - lastTap < tapWin && now - lastTap > 12) {
          if (onPopup) dismissWordPopup();
          toggleReadingFooterBar();
          lastTap = 0;
          return;
        }
        lastTap = now;
        lastTapX = t.clientX;
        lastTapY = t.clientY;
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      'dblclick',
      function(e) {
        if (!document.querySelector('.controls-bottom')) return;
        var dcPopup = !!(e.target && e.target.closest && e.target.closest('#word-popup, #word-popup-overlay'));
        if (!dcPopup && !collapseGestureTarget(e.target)) return;
        if (hasReadableTextSelection()) return;
        e.preventDefault();
        if (dcPopup) dismissWordPopup();
        toggleReadingFooterBar();
      },
      true
    );
  }

  // ── Public API ──
  window.NavEngine = {
    init: function(config) {
      _config = config || {};
      _config.hub = !!_config.hub;
      // Reader pages use pinned footer prev/next; disable chapter swipe unless explicitly opted in
      if (_config.skipSwipeNav !== false && document.querySelector('.controls-bottom')) {
        _config.skipSwipeNav = true;
      }
      createSidebar();
      document.addEventListener('keydown', onKeydown);
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true });

      // Hook into existing nav-label click
      var navLabel = document.getElementById('nav-label');
      if (navLabel) {
        navLabel.onclick = function(e) {
          e.stopPropagation();
          // On reader pages, the expected behavior is: open directly to "Books" for this volume.
          // (On the hub, the hamburger opens the Library view.)
          try {
            if (isOpen()) closeSidebar();
            else window.NavEngine.openToVolume(_config && _config.volume ? _config.volume : 'bom');
          } catch(err) {
            toggleSidebar();
          }
        };
      }
      installReaderFooterChrome();
      createQuickDock();
      installVersePositionTracker();
    },
    open: openSidebar,
    openJumpSearch: openSidebarAndFocusSearch,
    close: closeSidebar,
    toggle: toggleSidebar,
    update: function(chapterId) {
      _config.currentChapter = chapterId;
      updateBreadcrumb();
      saveReadingPosition(_config.volume, chapterId);
      rememberTorahDockChapter(chapterId);
      syncQuickDockActive();
      syncDockChapterNav();
      ensureContinueReadingChip();
    },
    openCurrentBookChapters: openCurrentBookChapters,
    openBooksForCurrentVolume: openBooksForCurrentVolume,
    openToVolume: function(volKey) {
      openSidebar();
      // Ensure we're in the "Books" view (not Library)
      try { setViewMode('books'); } catch(e) {}
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
    resolveLastReadUrl: function(data) {
      return resolveLastReadUrl(data || this.getLastRead());
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
