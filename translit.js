/**
 * translit.js — the Hebrew transliterator, for every volume.
 *
 * It existed twice: once in reader_ui.js for the five sibling volumes and once
 * inline in bom.html, ~200 lines each. The engine itself (_tlPointed) was
 * byte-identical, but the two wrappers were not, and the drift checker only
 * ever compared the engine — so the differences sat unnoticed:
 *
 *   · transliterate() in reader_ui stripped the ketiv/qere asterisk and
 *     guarded against null; bom.html's did neither.
 *   · _translitRaw built its unpointed dictionary key with different ranges:
 *     reader_ui stripped the shin/sin dots, bom.html preserved them. That is
 *     the difference that once made שׁוּב key as four characters and miss the
 *     three-character entry, hiding the meaning of 418 roots. It is unreachable
 *     on this corpus — no _tlKnown entry and no corpus form is unpointed AND
 *     dotted — but it was a live trap waiting for the first one.
 *
 * The stricter reading of each wins here. Sharing also means the file is
 * fetched and parsed ONCE for a reader moving between volumes, instead of
 * riding inline inside a 12,000-line document on one page and inside
 * reader_ui.js on the other five.
 *
 * NOT here: _stripNikkud. The two copies of THAT are deliberately different —
 * reader_ui strips everything including the maqqef and the shin/sin dots,
 * bom.html preserves them — because they answer different questions. Merging
 * them by name would reintroduce exactly the bug described above. They stay
 * where they are, under the names their own files give them.
 */
(function () {
  'use strict';

  /* Received spellings that beat the mechanical rules. TWO KINDS live here:
     the Book of Abraham astronomy names, which are spelled the way that book
     spells them, and words the corpus writes with a plain qamats where a
     qamats QATAN is meant (or without the dagesh that makes a bet a 'b') —
     "its korban", not karban.

     KEYED ON THE POINTED FORM, NOT THE CONSONANTS. It used to strip all the
     pointing before looking the word up, so one entry spoke for every word
     sharing its letters: 'חרבה' -> "chorba" was being applied to six different
     words, among them חֲרֵבָה "dry"; 'וארד' -> "vaord" was overriding וָאֵרֵד,
     "and I went down", five times. Sixteen of the forty-five keys covered more
     than one word. A patch for one word must not speak for another. */
  var _tlReceived = {
                      'אֳלִיבְלִישׁ':'oliblish', 'בְּבָשְׁתָּם':'bevoshtam', 'בְּקָרְבָּן':'vekorban',
                      'בְּקוֹלֹב':'bekolob', 'בְקָרְבָּן':'vekorban', 'בָשְׁתָּם':'boshtam',
                      'הַקָּרְבָּן':'hakkorban', 'הַקׇּרְבָן':'hakkorban', 'וְאָרְכָּהּ':'veorka',
                      'וְהַקָּרְבָּן':'vehakkorban', 'וְחָרְבָּנָם':'vechorbanam', 'וְלִשְׁלָשְׁתְּכֶם':'velishloshtekhem',
                      'וָאָרְדְּ':'vaord', 'וּנְבָזְבְּיָתָךְ':'unvozbeyatakh', 'וּשְׁלָשְׁתָּם':'ushloshtam',
                      'וּשְׂמֹאול':'usmol', 'חָרְבָּנָהּ':'chorbana', 'כְּקָרְבַּן':'kekorban',
                      'כְּרָחְבָּהּ':'kerochba', 'לְבָשְׁתְּכֶם':'levoshtekhem', 'לְבָשְׁתֵּנוּ':'levoshtenu',
                      'לְקוֹלֹב':'lekolob', 'לְרָחְבָּהּ':'lerochba', 'מִקּוֹלֹב':'mikkolob',
                      'מִשְּׂמֹאול':'missemol', 'מֵהַשְּׂמֹאול':'mehassemol', 'מָרָדְתָּא':'marodta',
                      'עָצְבְּכֶם':'otsbekhem', 'קָרְבָּנְךָ':'korbanekha', 'קָרְבָּנָהּ':'korbana',
                      'קוֹלֹב':'kolob', 'קוֹקַאוּבְּאֵם':'kokaubeam', 'קוֹקֹב':'kokob',
                      'שְׂמֹאול':'semol', 'שְׂמֹאולֶךָ':'semolekh', 'שִׁינֵהָה':'shinehah'
  };

  var _tlKnown = {
    '\u05D0\u05D1':'av','\u05D0\u05D7':'ach','\u05D0\u05DC':'el','\u05D0\u05DD':'em','\u05D0\u05E9':'esh','\u05D0\u05EA':'et',
    '\u05D1\u05DF':'ben','\u05D2\u05D3':'gad','\u05D3\u05DD':'dam','\u05D7\u05D9':'chai','\u05D7\u05DF':'chen','\u05D9\u05D3':'yad',
    '\u05D9\u05DD':'yam','\u05DB\u05DC':'kol','\u05DB\u05DF':'ken','\u05DC\u05D1':'lev','\u05E2\u05D3':'ad','\u05E2\u05DC':'al',
    '\u05E2\u05DD':'am','\u05E8\u05D1':'rav','\u05E9\u05DD':'shem','\u05E9\u05E8':'sar',
    '\u05DB\u05D9':'ki','\u05DC\u05D0':'lo','\u05D2\u05DD':'gam','\u05DE\u05DF':'min','\u05D0\u05E9\u05E8':'asher',
    '\u05D0\u05D1\u05D3':'avad','\u05D0\u05D3\u05DD':'adam','\u05D0\u05D4\u05D1':'ahav','\u05D0\u05D5\u05E8':'or','\u05D0\u05DE\u05E8':'amar',
    '\u05D0\u05E0\u05E9':'enosh','\u05D0\u05E8\u05E5':'erets','\u05D1\u05D5\u05D0':'bo','\u05D1\u05D9\u05EA':'bayit','\u05D1\u05E0\u05D4':'banah',
    '\u05D1\u05E8\u05D0':'bara','\u05D1\u05E8\u05DA':'barakh','\u05D2\u05D3\u05DC':'gadal','\u05D2\u05DC\u05D4':'galah','\u05D3\u05D1\u05E8':'davar',
    '\u05D3\u05E8\u05DA':'derekh','\u05D4\u05DC\u05DA':'halakh','\u05D4\u05D9\u05D4':'hayah','\u05D4\u05DC\u05DC':'halal','\u05D4\u05E0\u05D4':'hinneh',
    '\u05D6\u05DB\u05E8':'zakhar','\u05D6\u05E8\u05E2':'zera','\u05D7\u05D3\u05E9':'chadash','\u05D7\u05D6\u05E7':'chazaq','\u05D7\u05D8\u05D0':'chata',
    '\u05D7\u05D9\u05D4':'chayah','\u05D7\u05DB\u05DD':'chakham','\u05D7\u05E0\u05DF':'chanan','\u05D7\u05E1\u05D3':'chesed','\u05D7\u05E8\u05D1':'cherev',
    '\u05D8\u05D5\u05D1':'tov','\u05D9\u05D3\u05E2':'yada','\u05D9\u05D3\u05D4':'yadah','\u05D9\u05D5\u05DD':'yom','\u05D9\u05DC\u05D3':'yalad',
    '\u05D9\u05E8\u05D0':'yare','\u05D9\u05E8\u05D3':'yarad','\u05D9\u05E8\u05E9':'yarash','\u05D9\u05E9\u05D1':'yashav','\u05D9\u05E9\u05E2':'yasha',
    '\u05D9\u05E9\u05E8':'yashar','\u05DB\u05D4\u05DF':'kohen','\u05DB\u05D5\u05DF':'kun','\u05DB\u05E4\u05E8':'kafar','\u05DB\u05E8\u05EA':'karat',
    '\u05DB\u05EA\u05D1':'katav','\u05DC\u05D7\u05DD':'lacham','\u05DC\u05DE\u05D3':'lamad','\u05DC\u05E7\u05D7':'laqach','\u05DE\u05DC\u05D0':'male',
    '\u05DE\u05DC\u05DA':'melekh','\u05DE\u05DC\u05DB\u05D5\u05EA':'malkhut','\u05DE\u05DC\u05DB\u05D5':'malkhu','\u05DE\u05E9\u05D7':'mashach','\u05DE\u05E9\u05DC':'mashal','\u05DE\u05E9\u05E4\u05D8':'mishpat','\u05DE\u05D5\u05EA':'mut',
    '\u05E0\u05D1\u05D0':'nava','\u05E0\u05D2\u05D3':'nagad','\u05E0\u05E4\u05DC':'nafal','\u05E0\u05E4\u05E9':'nefesh','\u05E0\u05E9\u05D0':'nasa',
    '\u05E0\u05EA\u05DF':'natan','\u05E1\u05E4\u05E8':'sefer','\u05E2\u05D1\u05D3':'avad','\u05E2\u05D1\u05E8':'avar','\u05E2\u05DC\u05D4':'alah',
    '\u05E2\u05DC\u05DD':'olam','\u05E2\u05DE\u05D3':'amad','\u05E2\u05E0\u05D4':'anah','\u05E2\u05E9\u05D4':'asah','\u05E4\u05E7\u05D3':'paqad',
    '\u05E6\u05D1\u05D0':'tsava','\u05E6\u05D3\u05E7':'tsedek','\u05E6\u05D5\u05D4':'tsavah','\u05E7\u05D3\u05E9':'qadash','\u05E7\u05D5\u05DD':'qum',
    '\u05E7\u05D5\u05DC':'qol','\u05E7\u05E8\u05D0':'qara','\u05E7\u05E8\u05D1':'qarav','\u05E8\u05D0\u05D4':'raah','\u05E8\u05D0\u05E9':'rosh',
    '\u05E8\u05D5\u05D7':'ruach','\u05E8\u05D7\u05DD':'racham','\u05E9\u05D5\u05D1':'shuv','\u05E9\u05DC\u05D7':'shalach','\u05E9\u05DC\u05DD':'shalam',
    '\u05E9\u05DE\u05E2':'shama','\u05E9\u05DE\u05E8':'shamar','\u05E9\u05E4\u05D8':'shafat','\u05EA\u05D5\u05E8':'torah',
    '\u05D0\u05DC\u05D4\u05D9\u05DD':'elohim','\u05D9\u05D4\u05D5\u05D4':'Adonai','\u05DC\u05D9\u05D4\u05D5\u05D4':'la-Adonai','\u05D1\u05D9\u05D4\u05D5\u05D4':'ba-Adonai','\u05DE\u05D9\u05D4\u05D5\u05D4':'me-Adonai','\u05DB\u05D9\u05D4\u05D5\u05D4':'ke-Adonai','\u05D5\u05D9\u05D4\u05D5\u05D4':'ve-Adonai','\u05D5\u05DC\u05D9\u05D4\u05D5\u05D4':'ve-la-Adonai','\u05D4\u05D9\u05D4\u05D5\u05D4':'ha-Adonai','\u05E0\u05D1\u05D9\u05D0':'navi','\u05EA\u05D5\u05E8\u05D4':'torah',
    '\u05E9\u05DC\u05D5\u05DD':'shalom','\u05D1\u05E8\u05D9\u05EA':'berit','\u05E0\u05E4\u05E9':'nefesh','\u05E8\u05D5\u05D7':'ruach',
    '\u05DE\u05E9\u05D9\u05D7':'mashiach','\u05EA\u05E4\u05DC\u05D4':'tefilah','\u05D0\u05DE\u05D5\u05E0\u05D4':'emunah','\u05EA\u05E9\u05D5\u05D1\u05D4':'teshuvah','\u05D2\u05D0\u05D5\u05DC\u05D4':'geulah'
  ,
    'חכמה':'chokhmah', 'חכמת':'chokhmat', 'חפץ':'chofets', 'עז':'oz', 'חק':'choq', 'אזן':'ozen', 'חפן':'chofen', 'קרבן':'qorban', 'שרש':'shoresh', 'מוסר':'musar', 'שופט':'shofet', 'נחלה':'nachalah'
  
  };

  function _tlPointed(text) {
    // Tetragrammaton: always read as Adonai
    var stripped = text.replace(/[\u0591-\u05BD\u05BF-\u05C0\u05C3-\u05C7]/g, '');
    if (stripped === '\u05D5\u05DC\u05D9\u05D4\u05D5\u05D4') return 've-la-Adonai';
    if (stripped === '\u05D4\u05D9\u05D4\u05D5\u05D4') return 'ha-Adonai';
    if (stripped === '\u05DC\u05D9\u05D4\u05D5\u05D4') return 'la-Adonai'; // לַיהוָה (qere)
    if (stripped === '\u05D1\u05D9\u05D4\u05D5\u05D4') return 'ba-Adonai';
    if (stripped === '\u05DE\u05D9\u05D4\u05D5\u05D4') return 'me-Adonai';
    if (stripped === '\u05DB\u05D9\u05D4\u05D5\u05D4') return 'ke-Adonai';
    if (stripped === '\u05D5\u05D9\u05D4\u05D5\u05D4') return 've-Adonai';
    if (stripped === '\u05D9\u05D4\u05D5\u05D4') return 'Adonai'; // יהוה
    // Pratico & Van Pelt transliteration scheme (3rd Ed.)
    // Short vowels: plain. Changeable long: macron. Hatef: breve.
    var vmap = {};
    vmap['\u05B0']='\u0115'; vmap['\u05B1']='\u0115'; vmap['\u05B2']='\u0103'; vmap['\u05B3']='\u014F';
    vmap['\u05B4']='i'; vmap['\u05B5']='\u0113'; vmap['\u05B6']='e'; vmap['\u05B7']='a';
    vmap['\u05B8']='\u0101'; vmap['\u05B9']='\u014D'; vmap['\u05BA']='\u014D'; vmap['\u05BB']='u'; vmap['\u05C7']='o';
    // Consonants: P&VP — א/ע silent, ח=ch, ק=q
    var cmap = {'א':'','ב':'v','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t',
      'י':'y','כ':'kh','ך':'kh','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s',
      'ע':'','פ':'f','ף':'f','צ':'ts','ץ':'ts','ק':'q','ר':'r','ש':'sh','ת':'t'};
    var dmap = {'ב':'b','כ':'k','ך':'k','פ':'p','ף':'p'};
    // Parse into tokens: {cons, dagesh, sinDot, vowelChar}
    var tokens = [], i = 0;
    while (i < text.length) {
      var ch = text[i], code = ch.charCodeAt(0);
      if (code >= 0x05D0 && code <= 0x05EA) {
        var tok = {c:ch, dag:false, shin:true, vowel:''};
        i++;
        while (i < text.length) {
          var mc = text[i].charCodeAt(0);
          if (mc === 0x05BC) { tok.dag = true; i++; }
          else if (mc === 0x05C1) { tok.shin = true; i++; }
          else if (mc === 0x05C2) { tok.shin = false; i++; }
          else if ((mc >= 0x05B0 && mc <= 0x05BB) || mc === 0x05C7) { tok.vowel = text[i]; i++; }
          else if ((mc >= 0x0591 && mc <= 0x05AF) || mc === 0x05BD) { i++; }
          else break;
        }
        tokens.push(tok);
      } else { i++; }
    }
    var segments = [], len = tokens.length;
    for (var t = 0; t < len; t++) {
      var tk = tokens[t], isLast = (t === len - 1);
      // Consonant transliteration
      var c;
      if (tk.c === '\u05E9') c = tk.shin ? 'sh' : 's'; // shin vs sin
      else if (tk.dag && dmap[tk.c]) c = dmap[tk.c]; // dagesh in bgdkpt
      else c = cmap[tk.c] || '';
      // Shuruk: vav + dagesh + no vowel = û (unchangeable long, circumflex)
      if (tk.c === '\u05D5' && tk.dag && !tk.vowel) {
        if (t > 0 && tokens[t-1].c === '\u05D0' && !tokens[t-1].vowel) { segments.push({c:'\u02BE', v:'\u00FB'}); continue; }
        if (segments.length > 0) segments[segments.length-1].v = '\u00FB';
        else segments.push({c:'', v:'\u00FB'});
        continue;
      }
      // Cholam male: vav with cholam = ô (unchangeable long, circumflex)
      // Only treat as mater lectionis if previous consonant has no vowel yet;
      // otherwise the vav is a root consonant bearing cholam (e.g. עֲוֹנוֹת)
      if (tk.c === '\u05D5' && tk.vowel === '\u05B9' && !tk.dag) {
        if (t > 0 && tokens[t-1].c === '\u05D0' && !tokens[t-1].vowel) { segments.push({c:'\u02BE', v:'\u00F4'}); continue; }
        var prevSeg = segments.length > 0 ? segments[segments.length-1] : null;
        if (!prevSeg) { segments.push({c:'', v:'\u00F4'}); continue; }
        if (!prevSeg.v) { prevSeg.v = '\u00F4'; continue; }
        // Consonantal vav with cholam: fall through to produce 'v' + 'ô'
      }
      // Cholam male variant: vav after cholam on prev consonant = silent
      if (tk.c === '\u05D5' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B9') continue;
      if (tk.c === '\u05D0' && !tk.vowel && !tk.dag && t < len - 1) {
        var nxtAv = tokens[t + 1];
        if (nxtAv.c === '\u05D5' && (nxtAv.vowel === '\u05B9' || (nxtAv.dag && !nxtAv.vowel))) continue;
      }
      // Final he without vowel = silent
      if (tk.c === '\u05D4' && isLast && !tk.vowel) continue;
      // Chiriq male: yod after chiriq = î (unchangeable long, circumflex)
      if (tk.c === '\u05D9' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B4') {
        if (segments.length > 0) segments[segments.length-1].v = '\u00EE';
        continue;
      }
      // Tsere-yod: yod after tsere = ê (unchangeable long, circumflex)
      if (tk.c === '\u05D9' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B5') {
        if (segments.length > 0) segments[segments.length-1].v = '\u00EA';
        continue;
      }
      // Seghol-yod: yod after seghol = ê (unchangeable long, circumflex)
      if (tk.c === '\u05D9' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B6') {
        if (segments.length > 0) segments[segments.length-1].v = '\u00EA';
        continue;
      }
      // Vowel
      var v = tk.vowel ? (vmap[tk.vowel] || '') : '';
      var bgdkpt = '\u05D1\u05D2\u05D3\u05DB\u05E4\u05EA'; // בגדכפת
      var prevVowel = t > 0 ? tokens[t-1].vowel : '';
      var nextTok = t < len-1 ? tokens[t+1] : null;
      // Shva rules: nach (silent) vs na (voiced as 'e')
      if (tk.vowel === '\u05B0') {
        // Sheva na (vocal ĕ): under dagesh, or opens a syllable. Sheva nach (silent): closes prior syllable when no dagesh.
        if (isLast) v = '';
        else if (tk.dag) v = '\u0115';
        else if (t > 0 && !tk.dag && prevVowel === '\u05B7') v = '';  // sheva after short patach = silent
        else if (t > 0 && (prevVowel === '\u05B4' || prevVowel === '\u05B5' || prevVowel === '\u05B6' || prevVowel === '\u05B9' || prevVowel === '\u05C7')) v = '';
        else if (prevVowel === '\u05B7') v = '';
        else if (prevVowel === '\u05BB') v = '';
        /* A vav with a dagesh and no vowel IS the shureq. Word-internally the
           sheva after it stays silent — that is what this rule was for. But at
           the START of a word the shureq is the CONJUNCTION, and there the
           sheva is vocal: וּ is the form ו takes precisely BECAUSE the next
           letter has a sheva, and the two are read u-CE-. Treating it as silent
           gave "ulmuel" for וּלְמוּאֵל where לְמוּאֵל alone gave "lemuel", and
           "ushmuel" for Samuel. 9,034 tokens across the six volumes match
           וּ + consonant + sheva. Word-internal is left alone: whether מוּסְרֵי
           is muserei or musrei is a separate question and this is not the
           change that should answer it. */
        else if (t > 1 && tokens[t-1].c === '\u05D5' && tokens[t-1].dag && !tokens[t-1].vowel) v = '';
        else if (nextTok && bgdkpt.indexOf(nextTok.c) >= 0 && nextTok.dag) v = '';
        else if (nextTok && (t + 1 === len - 1) && !nextTok.vowel) v = '';
        else if (prevVowel === '\u05B0') v = '\u0115';
        else v = '\u0115';
      }
      // Qamets qatan is written explicitly in this corpus (U+05C7, the
      // red-rendered sign), so the vowel itself decides /o/ vs /a/. A closed
      // FINAL syllable carries the stress and keeps qamets gadol — \u05D0\u05B8\u05D6 is
      // "az", \u05E8\u05B8\u05DD is "ram"; only a written \u05C7 (\u05DB\u05C7\u05DC\u05BE, \u05E7\u05C7\u05E8\u05B0\u05D1\u05B8\u05BC\u05DF) reads "o".
      // Dagesh forte: double the consonant (non-bgdkpt with dagesh after a vowel)
      var isDagForte = tk.dag && bgdkpt.indexOf(tk.c) < 0 && t > 0 && prevVowel;
      // bgdkpt with dagesh after a vowel = also forte (doubled + hard)
      var isBgdkptForte = tk.dag && bgdkpt.indexOf(tk.c) >= 0 && t > 0 && prevVowel && prevVowel !== '\u05B0';
      // Gemination doubles the SOUND, not the spelling. Where a consonant is
      // written as a digraph (sh, ts, ch, kh), repeating the whole pair gives
      // "hashshamayim" / "hatstsaddik" — so only the digraph's first letter is
      // laid down here: hasshamayim, hattsaddik, missham, asshur. Single-letter
      // consonants are unaffected (hakkohen, atta, hammishpat).
      if (isDagForte || isBgdkptForte) {
        segments.push({c: c.charAt(0), v: '', ov: '', hc: tk.c, dag: false, doubled: true});
      }
      // Mappiq he: final הּ with dagesh = pronounced "h"
      if (tk.c === '\u05D4' && isLast && tk.dag && !tk.vowel) {
        segments.push({c: 'h', v: '', ov: '', hc: tk.c, dag: true});
        continue;
      }
      if (tk.c === '\u05D0' && tk.vowel) { segments.push({c: '\u02BE', v: v, ov: tk.vowel || '', hc: tk.c, dag: !!tk.dag}); continue; }
      if (tk.c === '\u05E2' && tk.vowel) { segments.push({c: '\u02BF', v: v, ov: tk.vowel || '', hc: tk.c, dag: !!tk.dag}); continue; }
      segments.push({c: c, v: v, ov: tk.vowel || '', hc: tk.c, dag: !!tk.dag});
    }
  
    // --- Patach furtivum: final guttural (ח,ע,ה) with patach → vowel BEFORE consonant ---
    var gutturals = '\u05D7\u05E2\u05D4'; // חעה
    var hasFurtive = false;
    if (segments.length >= 2) {
      var last = segments[segments.length - 1];
      if (gutturals.indexOf(last.hc) >= 0 && last.ov === '\u05B7') {
        last.furtive = true;
        last.v = 'a';
        hasFurtive = true;
      }
    }
  
    // --- Build result --- (P&VP: no stress ticks; vowel marks indicate length)
    var result = '';
    for (var s = 0; s < segments.length; s++) {
      var seg = segments[s];
      if (seg.furtive) {
        result += seg.v + seg.c;
      } else {
        result += seg.c + seg.v;
      }
    }
    return result;
  }

  function _tlPopular(s) {
    if (!s) return s;
    return s
      .replace(/[\u0101\u0103\u00E2]/g,'a')
      .replace(/[\u0113\u0115\u00EA]/g,'e')
      .replace(/[\u012B\u00EE]/g,'i')
      .replace(/[\u014D\u014F\u00F4]/g,'o')
      .replace(/[\u016B\u00FB]/g,'u')
      .replace(/[\u02BE\u02BF]/g,'')
      .replace(/q/g,'k');
  }

  function _translitRaw(heb) {
    if (heb.indexOf(' ') >= 0) return heb.split(' ').map(function(p) { return transliterate(p); }).join(' ');
    if (heb.indexOf('\u05BE') >= 0) return heb.split('\u05BE').map(function(p) { return transliterate(p); }).join('-');
    // Received spellings beat the mechanical rules regardless of pointing —
    // the Abraham 3 astronomy names keep their Book of Abraham forms.
    if (_tlReceived[heb]) return _tlReceived[heb];
    var hasNikkud = /[\u05B0-\u05BC\u05C7]/.test(heb);
    if (hasNikkud) {
      var consonantsOnly = heb.replace(/[\u0591-\u05C7\u05B0-\u05BB\u05BD\u05BF\u05C1\u05C2]/g, '');
      return _tlPointed(heb);
    }
    var clean = heb.replace(/[\u0591-\u05C7]/g, '');
    if (_tlKnown[clean]) return _tlKnown[clean];
    var cmap = {'\u05D0':'','\u05D1':'v','\u05D2':'g','\u05D3':'d','\u05D4':'h','\u05D5':'v','\u05D6':'z','\u05D7':'ch','\u05D8':'t',
      '\u05D9':'y','\u05DB':'kh','\u05DA':'kh','\u05DC':'l','\u05DE':'m','\u05DD':'m','\u05E0':'n','\u05DF':'n',
      '\u05E1':'s','\u05E2':'','\u05E4':'f','\u05E3':'f','\u05E6':'ts','\u05E5':'ts','\u05E7':'q','\u05E8':'r','\u05E9':'sh','\u05EA':'t'};
    var cc = [];
    for (var i = 0; i < clean.length; i++) { var x = cmap[clean[i]]; if (x !== undefined) cc.push(x); }
    if (cc.length === 0) return '';
    var r = '';
    for (var j = 0; j < cc.length; j++) { r += cc[j]; if (j < cc.length-1 && cc[j] && cc[j+1]) r += 'a'; }
    return r;
  }

  function transliterate(heb) { return _tlPopular(_translitRaw(String(heb == null ? '' : heb).replace(/\*/g, ''))); }

  window.transliterate = transliterate;
  window._tlPointed = _tlPointed;          /* the drift checker reads this */
  window.SWTranslit = { transliterate: transliterate, _tlPointed: _tlPointed };
})();
