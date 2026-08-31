/**
 * reader_ui.js — the shared sibling reader, part 2 (post-data): navigation,
 * annotations, selection toolbar, search, transliteration, popups, glossary.
 * Extracted VERBATIM from ot.html (canon) on 2026-08-29 — see reader_core.js.
 */


// PREV / NEXT NAVIGATION
var currentChapterId = null;
var currentPageId = 'landing';
var fullPageOrder = ['landing'].concat(window.READER.extraPages || []).concat(chapterOrder);

function updateNavButtons() {
  var prevBtn = document.getElementById('nav-prev');
  var nextBtn = document.getElementById('nav-next');
  var label = document.getElementById('nav-label');
  var idx = fullPageOrder.indexOf(currentPageId);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= fullPageOrder.length - 1;
  if (label) {
    if (currentChapterId) {
      label.innerHTML = getChapterLabel(currentChapterId) + ' \u25BE';
    } else {
      label.innerHTML = window.READER.navLabelHe + ' \u25BE';
    }
  }
}

function goNext() {
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx >= 0 && idx < fullPageOrder.length - 1) navTo(fullPageOrder[idx + 1], 'next');
}

function goPrev() {
  var idx = fullPageOrder.indexOf(currentPageId);
  if (idx > 0) navTo(fullPageOrder[idx - 1], 'prev');
}

// === HEBREW TRANSLITERATION ===
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

function transliterate(heb) { return _tlPopular(_translitRaw(heb)); }
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
var _tlReceived = { 'קולב':'kolob', 'בקולב':'bekolob', 'לקולב':'lekolob', 'מקולב':'mikkolob',
                    'קוקב':'kokob', 'קוקאובאם':'kokaubeam', 'שינהה':'shinehah', 'אליבליש':'oliblish',
                    // שמאול: the Masoretic mater vav sits AFTER the aleph (Gen 13:9) —
                    // the mechanical rules read it as consonantal 'v' (usmovl)
                    'שמאול':'semol', 'ושמאול':'usmol', 'משמאול':'missemol',
                    'מהשמאול':'mehassemol', 'השמאול':'hassemol', 'שמאולך':'semolekh' };
function _translitRaw(heb) {
  if (heb.indexOf(' ') >= 0) return heb.split(' ').map(function(p) { return transliterate(p); }).join(' ');
  if (heb.indexOf('\u05BE') >= 0) return heb.split('\u05BE').map(function(p) { return transliterate(p); }).join('-');
  // Received spellings beat the mechanical rules regardless of pointing —
  // the Abraham 3 astronomy names keep their Book of Abraham forms.
  var _rc = heb.replace(/[\u0591-\u05C7]/g, '');
  if (_tlReceived[_rc]) return _tlReceived[_rc];
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

function _tlPointed(text) {
  var stripped = text.replace(/[\u0591-\u05C7]/g, '');
  if (stripped === '\u05D5\u05DC\u05D9\u05D4\u05D5\u05D4') return 've-la-Adonai';
  if (stripped === '\u05D4\u05D9\u05D4\u05D5\u05D4') return 'ha-Adonai';
  if (stripped === '\u05DC\u05D9\u05D4\u05D5\u05D4') return 'la-Adonai';
  if (stripped === '\u05D1\u05D9\u05D4\u05D5\u05D4') return 'ba-Adonai';
  if (stripped === '\u05DE\u05D9\u05D4\u05D5\u05D4') return 'me-Adonai';
  if (stripped === '\u05DB\u05D9\u05D4\u05D5\u05D4') return 'ke-Adonai';
  if (stripped === '\u05D5\u05D9\u05D4\u05D5\u05D4') return 've-Adonai';
  if (stripped === '\u05D9\u05D4\u05D5\u05D4') return 'Adonai';
  var vmap = {};
  vmap['\u05B0']='\u0115'; vmap['\u05B1']='\u0115'; vmap['\u05B2']='\u0103'; vmap['\u05B3']='\u014F';
  vmap['\u05B4']='i'; vmap['\u05B5']='\u0113'; vmap['\u05B6']='e'; vmap['\u05B7']='a';
  vmap['\u05B8']='\u0101'; vmap['\u05B9']='\u014D'; vmap['\u05BA']='\u014D'; vmap['\u05BB']='u'; vmap['\u05C7']='o';
  var cmap = {'\u05D0':'','\u05D1':'v','\u05D2':'g','\u05D3':'d','\u05D4':'h','\u05D5':'v','\u05D6':'z','\u05D7':'ch','\u05D8':'t',
    '\u05D9':'y','\u05DB':'kh','\u05DA':'kh','\u05DC':'l','\u05DE':'m','\u05DD':'m','\u05E0':'n','\u05DF':'n','\u05E1':'s',
    '\u05E2':'','\u05E4':'f','\u05E3':'f','\u05E6':'ts','\u05E5':'ts','\u05E7':'q','\u05E8':'r','\u05E9':'sh','\u05EA':'t'};
  var dmap = {'\u05D1':'b','\u05DB':'k','\u05DA':'k','\u05E4':'p','\u05E3':'p'};
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
    var c;
    if (tk.c === '\u05E9') c = tk.shin ? 'sh' : 's';
    else if (tk.dag && dmap[tk.c]) c = dmap[tk.c];
    else c = cmap[tk.c] || '';
    if (tk.c === '\u05D5' && tk.dag && !tk.vowel) {
      if (t > 0 && tokens[t-1].c === '\u05D0' && !tokens[t-1].vowel) { segments.push({c:'\u02BE', v:'\u00FB'}); continue; }
      if (segments.length > 0) segments[segments.length-1].v = '\u00FB';
      else segments.push({c:'', v:'\u00FB'});
      continue;
    }
    if (tk.c === '\u05D5' && tk.vowel === '\u05B9' && !tk.dag) {
      if (t > 0 && tokens[t-1].c === '\u05D0' && !tokens[t-1].vowel) { segments.push({c:'\u02BE', v:'\u00F4'}); continue; }
      if (segments.length > 0) segments[segments.length-1].v = '\u00F4';
      else segments.push({c:'', v:'\u00F4'});
      continue;
    }
    if (tk.c === '\u05D5' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B9') continue;
    if (tk.c === '\u05D0' && !tk.vowel && !tk.dag && t < len - 1) {
      var nxtAv = tokens[t + 1];
      if (nxtAv.c === '\u05D5' && (nxtAv.vowel === '\u05B9' || (nxtAv.dag && !nxtAv.vowel))) continue;
    }
    if (tk.c === '\u05D4' && isLast && !tk.vowel) continue;
    if (tk.c === '\u05D9' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B4') {
      if (segments.length > 0) segments[segments.length-1].v = '\u00EE'; continue;
    }
    if (tk.c === '\u05D9' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B5') {
      if (segments.length > 0) segments[segments.length-1].v = '\u00EA'; continue;
    }
    if (tk.c === '\u05D9' && !tk.vowel && !tk.dag && t > 0 && tokens[t-1].vowel === '\u05B6') {
      if (segments.length > 0) segments[segments.length-1].v = '\u00EA'; continue;
    }
    var v = tk.vowel ? (vmap[tk.vowel] || '') : '';
    var bgdkpt = '\u05D1\u05D2\u05D3\u05DB\u05E4\u05EA';
    var prevVowel = t > 0 ? tokens[t-1].vowel : '';
    var nextTok = t < len-1 ? tokens[t+1] : null;
    if (tk.vowel === '\u05B0') {
      if (isLast) v = '';
      else if (tk.dag) v = '\u0115';
      else if (t > 0 && !tk.dag && prevVowel === '\u05B7') v = '';  // sheva after short patach = silent (shva nach)
      else if (t > 0 && (prevVowel === '\u05B4' || prevVowel === '\u05B5' || prevVowel === '\u05B6' || prevVowel === '\u05B9' || prevVowel === '\u05C7')) v = '';
      else if (t > 0 && tokens[t-1].c === '\u05D5' && tokens[t-1].dag && !tokens[t-1].vowel) v = '';
      else if (nextTok && bgdkpt.indexOf(nextTok.c) >= 0 && nextTok.dag) v = '';
      else if (nextTok && (t + 1 === len - 1) && !nextTok.vowel) v = '';
      else if (prevVowel === '\u05B0') v = '\u0115';
      else v = '\u0115';
    }
    if (tk.vowel === '\u05B8' && !isLast) {
      var nxt = tokens[t+1];
      var nxtIsLast = (t+1 === len-1);
      var suffixLetters = '\u05DD\u05DF\u05DA';
      // A stressed CVC monosyllable with PLAIN qamats is qamats GADOL \u2014 az,
      // rav, yad, shav (Sephardi, like the rest of this system). The old
      // whitelist-else-'o' default rendered every unlisted word qatan (\u05D0\u05B8\u05D6
      // came out 'oz'). Real qatan is marked explicitly with U+05C7 in this
      // corpus and handled by its own rule; no monosyllable branch needed.
      if (!nxtIsLast && nxt.vowel === '\u05B0') {
        var nxt2 = t+2 < len ? tokens[t+2] : null;
        if (nxt2 && bgdkpt.indexOf(nxt2.c) >= 0 && nxt2.dag) v = 'o';
      }
    }
    var isDagForte = tk.dag && bgdkpt.indexOf(tk.c) < 0 && t > 0 && prevVowel;
    var isBgdkptForte = tk.dag && bgdkpt.indexOf(tk.c) >= 0 && t > 0 && prevVowel && prevVowel !== '\u05B0';
    if (isDagForte || isBgdkptForte) segments.push({c: c, v: '', ov: '', hc: tk.c, dag: false, doubled: true});
    if (tk.c === '\u05D4' && isLast && tk.dag && !tk.vowel) { segments.push({c: 'h', v: '', ov: '', hc: tk.c, dag: true}); continue; }
    if (tk.c === '\u05D0' && tk.vowel) { segments.push({c: '\u02BE', v: v, ov: tk.vowel || '', hc: tk.c, dag: !!tk.dag}); continue; }
    if (tk.c === '\u05E2' && tk.vowel) { segments.push({c: '\u02BF', v: v, ov: tk.vowel || '', hc: tk.c, dag: !!tk.dag}); continue; }
    segments.push({c: c, v: v, ov: tk.vowel || '', hc: tk.c, dag: !!tk.dag});
  }
  var gutturals = '\u05D7\u05E2\u05D4';
  if (segments.length >= 2) {
    var last = segments[segments.length - 1];
    if (gutturals.indexOf(last.hc) >= 0 && last.ov === '\u05B7') { last.furtive = true; last.v = 'a'; }
  }
  var result = '';
  for (var s = 0; s < segments.length; s++) {
    var seg = segments[s];
    result += seg.furtive ? (seg.v + seg.c) : (seg.c + seg.v);
  }
  return result;
}

function openShortcuts() { document.getElementById('shortcuts-overlay').classList.add('open'); }
function closeShortcuts() { document.getElementById('shortcuts-overlay').classList.remove('open'); }



// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openSearch(); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') { closeAllPanels(); e.preventDefault(); return; }
  if (e.key === 'ArrowLeft') { goNext(); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { goPrev(); e.preventDefault(); }
  else if (e.key === '1') { setMode('inter'); }
  else if (e.key === '2') { setMode('heb'); }
  else if (e.key === '3') { setMode('dual'); }   // adopted from jst 2026-08-29
  else if (e.key === 'd' || e.key === 'D') { toggleDarkMode(); }
  else if (e.key === 's' || e.key === 'S') { openSearch(); }
  else if (e.key === 'g' || e.key === 'G') { openGlossary(); }
  else if (e.key === 'n' || e.key === 'N') { openAnnotationsPanel(); }
  else if (e.key === 'b' || e.key === 'B') { if (window.NavEngine) NavEngine.toggle(); }
  else if (e.key === '?') { openShortcuts(); }
});

function closeAllPanels() {
  var sc = document.getElementById('search-container');
  if (sc && sc.classList.contains('open')) closeSearch();
  var wp = document.getElementById('word-popup');
  if (wp && wp.style.display !== 'none' && wp.style.display !== '') closePopup();
  var gp = document.getElementById('glossary-panel');
  if (gp && gp.classList.contains('open')) closeGlossary();
  var ap = document.getElementById('annotations-panel');
  if (ap && ap.classList.contains('open')) closeAnnotationsPanel();
  var sp = document.getElementById('share-popup');
  if (sp && sp.classList.contains('open')) closeSharePopup();
  _hideSelToolbar();
  if (window.NavEngine) NavEngine.close();
  var sh = document.getElementById('shortcuts-overlay');
  if (sh && sh.classList.contains('open')) closeShortcuts();
}

// HISTORY: Make chapter navigation create real Back/Forward entries
(function() {
  var _navHist = window.navTo;
  window.navTo = function(id, slideDir) {
    _navHist(id, slideDir);
    try {
      if (window.__swNavFromHash) return;
      var v = 0;
      try {
        var h = window.location.hash.replace('#','');
        var hp = h.split('&');
        for (var i = 1; i < hp.length; i++) { var kv = hp[i].split('='); if (kv[0] === 'v') v = parseInt(kv[1]||'0',10)||0; }
      } catch(e) {}
      if (id && id !== 'landing') history.pushState(null, '', '#' + id + (v ? '&v=' + v : ''));
      else history.pushState(null, '', window.location.pathname);
    } catch (e) {}
  };
})();

// PAGE-FLIP ANIMATION
(function() {
  var _navFade = window.navTo;
  window.navTo = function(id, slideDir) {
    document.querySelectorAll('.chapter-panel').forEach(function(p) { p.classList.remove('fade-in', 'slide-left', 'slide-right'); });
    _navFade(id, slideDir);
    setTimeout(function() {
      document.querySelectorAll('.chapter-panel').forEach(function(p) {
        if (p.style.display !== 'none') {
          p.classList.add(slideDir ? (slideDir === 'next' ? 'slide-right' : 'slide-left') : 'fade-in');
        }
      });
    }, 20);
  };
})();

// (audio word-highlight removed with the audio feature, 2026-08-29)

// VERSE HIGHLIGHTING
(function() {
  var HIGHLIGHTS_KEY = 'sw-highlights-v1';
  var menu = null;
  var currentVerseEl = null;

  function loadHighlights() {
    try { return JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '{}') || {}; } catch(e) { return {}; }
  }
  function saveHighlights(obj) {
    try { localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(obj || {})); } catch(e) {}
  }
  function verseKeyOf(verseEl) {
    return verseEl ? verseEl.getAttribute('data-verse-key') : null;
  }
  function ensureMenu() {
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'verse-action-menu';
    menu.style.position = 'fixed';
    menu.style.zIndex = '9999';
    menu.style.display = 'none';
    menu.style.minWidth = '180px';
    menu.style.background = 'rgba(30,34,51,0.98)';
    menu.style.border = '1px solid rgba(200,168,78,0.35)';
    menu.style.borderRadius = '8px';
    menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    menu.style.padding = '8px';
    menu.style.direction = 'ltr';
    menu.style.backdropFilter = 'blur(6px)';

    menu.innerHTML = '' +
      '<button data-act="highlight" style="width:100%;margin:0 0 6px 0;padding:10px 12px;border-radius:6px;border:1px solid rgba(200,168,78,0.35);background:#1e2233;color:#c8a84e;cursor:pointer;font-family:inherit;font-size:0.95em;">Highlight / Unhighlight</button>' +
      '<button data-act="note" style="width:100%;margin:0 0 6px 0;padding:10px 12px;border-radius:6px;border:1px solid rgba(200,168,78,0.25);background:#151929;color:#e8e0d0;cursor:pointer;font-family:inherit;font-size:0.95em;">Note</button>' +
      '<button data-act="copy" style="width:100%;margin:0 0 6px 0;padding:10px 12px;border-radius:6px;border:1px solid rgba(200,168,78,0.25);background:#151929;color:#e8e0d0;cursor:pointer;font-family:inherit;font-size:0.95em;">Copy verse</button>' +
      '<button data-act="share" style="width:100%;margin:0;padding:10px 12px;border-radius:6px;border:1px solid rgba(200,168,78,0.25);background:#151929;color:#e8e0d0;cursor:pointer;font-family:inherit;font-size:0.95em;">Share verse</button>';

    menu.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var act = btn.getAttribute('data-act');
      if (!currentVerseEl) return;
      if (act === 'highlight') { togglePersistentHighlight(currentVerseEl); hideMenu(); }
      else if (act === 'note') { openNoteEditor(currentVerseEl); hideMenu(); }
      else if (act === 'copy') { copyVerseOnly(currentVerseEl); hideMenu(); }
      else if (act === 'share') { shareVerseOnly(currentVerseEl); hideMenu(); }
    });

    document.body.appendChild(menu);
    return menu;
  }

  function getVerseText(verseEl) {
    var key = verseKeyOf(verseEl) || '';
    var ref = key ? key.replace(/\|/g, ' ') : '';
    var heb = '';
    try {
      var hws = verseEl.querySelectorAll('.word-unit .hw');
      var parts = [];
      for (var i = 0; i < hws.length; i++) {
        var t = (hws[i].textContent || '').trim();
        if (t) parts.push(t);
      }
      heb = parts.join(' ');
    } catch(e) {}
    var eng = '';
    try {
      var engDiv = verseEl.querySelector('.verse-english');
      if (engDiv) eng = (engDiv.textContent || '').trim();
    } catch(e) {}
    var out = (ref ? ref + '\n' : '') + (heb ? heb + '\n' : '') + (eng ? eng : '');
    return out.trim();
  }

  function togglePersistentHighlight(verseEl) {
    var key = verseKeyOf(verseEl);
    if (!key) return;
    var map = loadHighlights();
    if (map[key]) delete map[key];
    else map[key] = { on: true, ts: Date.now() };
    saveHighlights(map);
    verseEl.classList.toggle('user-highlight', !!map[key]);
  }

  function applyNoteMarker(verseEl, hasNote) {
    var num = verseEl ? verseEl.querySelector('.verse-num') : null;
    if (!num) return;
    num.classList.toggle('has-note', !!hasNote);
  }

  function ensureNoteModal() {
    var existing = document.getElementById('note-modal');
    if (existing) return existing;
    var overlay = document.createElement('div');
    overlay.id = 'note-modal';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'none';
    overlay.innerHTML =
      '<div id="note-modal-card" style="max-width:720px;width:92%;margin:10vh auto;background:var(--bg);color:var(--ink);border:2px solid var(--accent);border-radius:10px;box-shadow:0 14px 40px rgba(0,0,0,0.35);padding:16px;direction:ltr;font-family:David Libre,serif;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">' +
          '<div style="font-weight:700;color:var(--accent);font-size:1.05em;" id="note-modal-title">Note</div>' +
          '<button id="note-modal-close" style="border:1px solid var(--rule);background:transparent;color:var(--ink);border-radius:8px;padding:6px 10px;cursor:pointer;">Close</button>' +
        '</div>' +
        '<textarea id="note-modal-text" style="width:100%;min-height:180px;resize:vertical;border:1px solid var(--rule);border-radius:8px;padding:10px 12px;font-family:David Libre,serif;font-size:1em;line-height:1.4;background:var(--bg-deep);color:var(--ink);"></textarea>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">' +
          '<button id="note-modal-delete" style="border:1px solid rgba(180,60,60,0.4);background:transparent;color:#b43c3c;border-radius:8px;padding:8px 12px;cursor:pointer;">Delete</button>' +
          '<button id="note-modal-save" style="border:1px solid var(--accent);background:var(--accent);color:#1e2233;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700;">Save</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) hideNoteModal();
    });
    document.getElementById('note-modal-close').addEventListener('click', function() { hideNoteModal(); });
    return overlay;
  }

  function hideNoteModal() {
    var overlay = document.getElementById('note-modal');
    if (overlay) overlay.style.display = 'none';
  }

  async function openNoteEditor(verseEl) {
    var key = verseKeyOf(verseEl);
    if (!key || !window.NotesEngine) return;
    ensureNoteModal();
    var title = document.getElementById('note-modal-title');
    title.textContent = key.replace(/\|/g, ' ');
    var ta = document.getElementById('note-modal-text');
    var existing = await window.NotesEngine.getNote(key);
    ta.value = existing && existing.text ? existing.text : '';
    document.getElementById('note-modal').style.display = 'block';
    setTimeout(function() { try { ta.focus(); ta.selectionStart = ta.value.length; } catch(e) {} }, 0);

    var saveBtn = document.getElementById('note-modal-save');
    var delBtn = document.getElementById('note-modal-delete');

    saveBtn.onclick = async function() {
      await window.NotesEngine.upsertNote(key, ta.value);
      applyNoteMarker(verseEl, (ta.value || '').trim().length > 0);
      hideNoteModal();
    };
    delBtn.onclick = async function() {
      ta.value = '';
      await window.NotesEngine.deleteNote(key);
      applyNoteMarker(verseEl, false);
      hideNoteModal();
    };
  }

  async function copyVerseOnly(verseEl) {
    var text = getVerseText(verseEl);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch(e) {}
  }

  async function shareVerseOnly(verseEl) {
    var text = getVerseText(verseEl);
    try {
      // Add a shareable deep link to this verse
      var key = verseKeyOf(verseEl) || '';
      var verseNum = 0;
      if (key) {
        var ps = key.split('|');
        verseNum = ps.length >= 3 ? parseInt(ps[2], 10) || 0 : 0;
      }
      var link = '';
      if (verseNum && currentChapterId) {
        link = window.location.origin + window.location.pathname + '#' + currentChapterId + '&v=' + verseNum;
        text = link + '\n' + text;
      }
      if (navigator.share) {
        await navigator.share({ text: text });
      } else {
        await copyVerseOnly(verseEl);
      }
    } catch(e) {}
  }

  function applySavedHighlights(scopeEl) {
    var map = loadHighlights();
    (scopeEl || document).querySelectorAll('.verse[data-verse-key]').forEach(function(v) {
      var key = verseKeyOf(v);
      if (key && map[key]) v.classList.add('user-highlight');
    });
  }

  async function applySavedNotes(scopeEl) {
    if (!window.NotesEngine) return;
    var verses = (scopeEl || document).querySelectorAll('.verse[data-verse-key]');
    for (var i = 0; i < verses.length; i++) {
      var v = verses[i];
      var key = verseKeyOf(v);
      if (!key) continue;
      try {
        var note = await window.NotesEngine.getNote(key);
        applyNoteMarker(v, !!(note && note.text));
      } catch(e) {}
    }
  }

  function showMenuFor(numEl, verseEl) {
    ensureMenu();
    currentVerseEl = verseEl;
    var rect = numEl.getBoundingClientRect();
    var x = Math.min(rect.left, window.innerWidth - 220);
    var y = Math.min(rect.bottom + 8, window.innerHeight - 170);
    menu.style.left = Math.max(8, x) + 'px';
    menu.style.top = Math.max(8, y) + 'px';
    menu.style.display = 'block';
  }
  function hideMenu() {
    if (!menu) return;
    menu.style.display = 'none';
    currentVerseEl = null;
  }

  // Open verse actions menu on verse number click (does not alter selection)
  document.addEventListener('click', function(e) {
    var num = e.target.closest('.verse-num');
    if (!num) return;
    var verse = num.closest('.verse');
    if (!verse) return;
    e.preventDefault();
    e.stopPropagation();
    showMenuFor(num, verse);
  }, true);

  // Close menu on outside click / Escape
  document.addEventListener('click', function(e) {
    if (menu && menu.style.display === 'block' && !e.target.closest('#verse-action-menu') && !e.target.closest('.verse-num')) hideMenu();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideMenu();
  });

  // Apply highlights after chapters render / on load
  document.addEventListener('DOMContentLoaded', function() { applySavedHighlights(document); applySavedNotes(document); });
  // Patch _ensureChapterRendered to apply highlights to newly-rendered chapter
  var _origEnsure = window._ensureChapterRendered;
  if (typeof _origEnsure === 'function') {
    window._ensureChapterRendered = function(chapId) {
      _origEnsure(chapId);
      var panel = document.getElementById('panel-' + chapId);
      if (panel) { applySavedHighlights(panel); applySavedNotes(panel); }
    };
  }
})();

// === ROOT MAP + MORPHOLOGICAL ANALYSIS ===

// Strip common Hebrew prefixes to get closer to root/lemma
function stripPrefixes(w) {
  w = w.replace(/^.*\u05BE/, ''); // remove maqaf-joined particles
  var prefixes = [
    /^\u05D5\u05B0/, /^\u05D5\u05B7/, /^\u05D5\u05BC/, /^\u05D5\u05B8/, /^\u05D5\u05B6/,
    /^\u05D4\u05B7/, /^\u05D4\u05B8/, /^\u05D4\u05B6/,
    /^\u05D1\u05BC\u05B0/, /^\u05D1\u05BC\u05B7/, /^\u05D1\u05BC\u05B4/, /^\u05D1\u05BC\u05B8/, /^\u05D1\u05BC\u05B6/, /^\u05D1\u05B0/, /^\u05D1\u05B7/, /^\u05D1\u05B4/,
    /^\u05DC\u05B0/, /^\u05DC\u05B7/, /^\u05DC\u05B4/, /^\u05DC\u05B8/, /^\u05DC\u05B6/,
    /^\u05DE\u05B4/, /^\u05DE\u05B5/, /^\u05DE\u05B0/, /^\u05DE\u05B7/,
    /^\u05DB\u05BC\u05B0/, /^\u05DB\u05BC\u05B7/, /^\u05DB\u05B0/, /^\u05DB\u05B7/,
    /^\u05E9\u05C1\u05B6/, /^\u05E9\u05C1\u05B6/
  ];
  var stripped = w;
  for (var i = 0; i < prefixes.length; i++) {
    if (prefixes[i].test(stripped) && stripped.replace(prefixes[i], '').length >= 2) {
      stripped = stripped.replace(prefixes[i], ''); break;
    }
  }
  for (var j = 0; j < prefixes.length; j++) {
    if (prefixes[j].test(stripped) && stripped.replace(prefixes[j], '').length >= 2) {
      stripped = stripped.replace(prefixes[j], ''); break;
    }
  }
  return stripped;
}

// Progressive peels, shallowest first — mirrors RootEngine.stripLayers. A
// lookup chain must try the one-layer form before the two-layer one: the
// longest remainder wins (בַּבְּכוֹר stops at בְּכוֹר, never reaches כוֹר).
function _stripLayersUI(w) {
  if (window.RootEngine && window.RootEngine.stripLayers) return window.RootEngine.stripLayers(w);
  var s1 = stripPrefixes(w);   // NB: this local copy is two-layer; fall back to [w, deep]
  return s1 === w ? [w] : [w, s1];
}
function _strongsLayered(w) {
  if (!window._strongsLookup) return '';
  var L = _stripLayersUI(w), s = '', i;
  for (i = 0; i < L.length && !s; i++) s = _strongsLookup[L[i]] || '';
  for (i = 0; i < L.length && !s; i++) s = _strongsLookup[_stripNikkud(L[i])] || '';
  return s;
}

function normFinals(s) {
  return s.replace(/\u05DA/g,'\u05DB').replace(/\u05DD/g,'\u05DE').replace(/\u05DF/g,'\u05E0').replace(/\u05E3/g,'\u05E4').replace(/\u05E5/g,'\u05E6');
}

var sofitMap = {'\u05DB':'\u05DA','\u05DE':'\u05DD','\u05E0':'\u05DF','\u05E4':'\u05E3','\u05E6':'\u05E5'};
function toSofit(s) {
  if (!s || s.length === 0) return s;
  var last = s[s.length - 1];
  return sofitMap[last] ? s.slice(0, -1) + sofitMap[last] : s;
}

function extractRoot(cons) {
  var s = normFinals(cons);
  if (s.length <= 3) return s;
  if (s.length === 0) return cons;
  var sufs = [
    '\u05EA\u05D9\u05D4\u05DD','\u05D5\u05EA\u05D9\u05D4\u05DD','\u05D5\u05EA\u05D9\u05E0\u05D5',
    '\u05D9\u05D4\u05DD','\u05D9\u05D4\u05DF','\u05D5\u05EA\u05DD','\u05D5\u05EA\u05DF','\u05EA\u05D9\u05D5','\u05EA\u05D9\u05D4','\u05EA\u05E0\u05D5',
    '\u05DB\u05DD','\u05DB\u05DF','\u05E0\u05D5','\u05EA\u05D9','\u05EA\u05DD','\u05EA\u05DF','\u05D9\u05DD','\u05D5\u05EA','\u05D5\u05DF','\u05D9\u05DF','\u05D4\u05DD','\u05D4\u05DF',
    '\u05D4','\u05D5','\u05DD','\u05DF','\u05D9','\u05EA','\u05DB'
  ];
  var stem = s;
  for (var i = 0; i < sufs.length; i++) {
    if (stem.length > sufs[i].length + 2 && stem.endsWith(sufs[i])) { stem = stem.slice(0, -sufs[i].length); break; }
  }
  if (stem.length === 3) return stem;
  if (stem.length >= 5 && (stem.slice(0,2) === '\u05D4\u05EA' || stem.slice(0,2) === '\u05DE\u05EA')) { stem = stem.slice(2); }
  else if (stem.length >= 4 && /^[\u05D4\u05D9\u05EA\u05D0\u05E0\u05DE]/.test(stem)) { stem = stem.slice(1); }
  if (stem.length === 3) return stem;
  if (stem.length === 4 && stem[1] === stem[2]) return stem[0] + stem[1] + stem[3];
  for (var j = 0; j < sufs.length; j++) {
    if (stem.length > sufs[j].length + 2 && stem.endsWith(sufs[j])) { stem = stem.slice(0, -sufs[j].length); break; }
  }
  if (stem.length === 3) return stem;
  if (stem.length >= 4 && /^[\u05D4\u05D9\u05EA\u05D0\u05E0\u05DE]/.test(stem)) { stem = stem.slice(1); }
  if (stem.length === 3) return stem;
  if (stem.length === 4 && stem[1] === stem[2]) return stem[0] + stem[1] + stem[3];
  return stem.length > 3 ? stem.slice(0, 3) : stem;
}

var rootMap = {
  '\u05D7\u05B6\u05E1\u05B6\u05D3': '\u05D7\u05E1\u05D3', '\u05D7\u05B7\u05E1\u05B0\u05D3\u05BC\u05D5\u05B9': '\u05D7\u05E1\u05D3', '\u05D7\u05B2\u05E1\u05B8\u05D3\u05B8\u05D9\u05D5': '\u05D7\u05E1\u05D3',
  '\u05D2\u05BC\u05B8\u05D0\u05B7\u05DC': '\u05D2\u05D0\u05DC', '\u05D2\u05BC\u05B9\u05D0\u05B5\u05DC': '\u05D2\u05D0\u05DC', '\u05D2\u05BC\u05B0\u05D0\u05BB\u05DC\u05BC\u05B8\u05D4': '\u05D2\u05D0\u05DC',
  '\u05D1\u05BC\u05B0\u05E8\u05B4\u05D9\u05EA': '\u05D1\u05E8\u05EA', '\u05D4\u05B7\u05D1\u05BC\u05B0\u05E8\u05B4\u05D9\u05EA': '\u05D1\u05E8\u05EA',
  '\u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD': '\u05D0\u05DC\u05D4\u05D9\u05DD', '\u05D4\u05B8\u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD': '\u05D0\u05DC\u05D4\u05D9\u05DD',
  '\u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4': '\u05EA\u05D5\u05E8', '\u05D4\u05B7\u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4': '\u05EA\u05D5\u05E8', '\u05EA\u05BC\u05D5\u05B9\u05E8\u05B7\u05EA': '\u05EA\u05D5\u05E8',
  '\u05DE\u05B6\u05DC\u05B6\u05DA\u05B0': '\u05DE\u05DC\u05DB', '\u05D4\u05B7\u05DE\u05BC\u05B6\u05DC\u05B6\u05DA\u05B0': '\u05DE\u05DC\u05DB', '\u05DE\u05B0\u05DC\u05B8\u05DB\u05B4\u05D9\u05DD': '\u05DE\u05DC\u05DB',
  '\u05DE\u05B4\u05E9\u05C1\u05B0\u05E4\u05BC\u05B8\u05D8': '\u05E9\u05E4\u05D8', '\u05D4\u05B7\u05DE\u05BC\u05B4\u05E9\u05C1\u05B0\u05E4\u05BC\u05B8\u05D8': '\u05E9\u05E4\u05D8',
  '\u05E0\u05B8\u05D1\u05B4\u05D9\u05D0': '\u05E0\u05D1\u05D0', '\u05D4\u05B7\u05E0\u05BC\u05B8\u05D1\u05B4\u05D9\u05D0': '\u05E0\u05D1\u05D0', '\u05E0\u05B0\u05D1\u05B4\u05D9\u05D0\u05B4\u05D9\u05DD': '\u05E0\u05D1\u05D0',
  '\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD': '\u05E9\u05DC\u05DD', '\u05D4\u05B7\u05E9\u05C1\u05BC\u05B8\u05DC\u05D5\u05B9\u05DD': '\u05E9\u05DC\u05DD',
  '\u05DE\u05B8\u05E9\u05C1\u05B4\u05D9\u05D7\u05B7': '\u05DE\u05E9\u05D7', '\u05D4\u05B7\u05DE\u05BC\u05B8\u05E9\u05C1\u05B4\u05D9\u05D7\u05B7': '\u05DE\u05E9\u05D7',
  '\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD': '\u05E2\u05DC\u05DD', '\u05DC\u05B0\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD': '\u05E2\u05DC\u05DD',
  '\u05D9\u05B0\u05E8\u05D5\u05BC\u05E9\u05C1\u05B8\u05DC\u05B7\u05D9\u05B4\u05DD': '\u05D9\u05E8\u05E9\u05DC\u05DD',
  '\u05D3\u05BC\u05B8\u05D5\u05B4\u05D3': '\u05D3\u05D5\u05D3', '\u05DC\u05B0\u05D3\u05B8\u05D5\u05B4\u05D3': '\u05D3\u05D5\u05D3',
  '\u05D9\u05B4\u05E9\u05C2\u05B0\u05E8\u05B8\u05D0\u05B5\u05DC': '\u05D9\u05E9\u05E8\u05D0\u05DC'
};

function getRoot(hw) {
  // Canonical resolution lives in root_engine.js (generated from bom/bom.html).
  // Delegating keeps the cross-reference keys, the scorecard and the glossary on
  // ONE set of root keys. This page's own cascade below ends in a truncating
  // extractRoot() that invented keys — כָּאָרֶץ became "כאר", אַרְצוֹתֵינוּ became
  // "ארצ" — so _rootXrefs was keyed differently from the popup and the
  // "Cross-References for root" link never matched. Kept only as a fallback for
  // the case where root_engine.js fails to load.
  if (window.RootEngine && window.RootEngine.getRoot) return window.RootEngine.getRoot(hw);
  // Try Strong's-based root first
  if (window._strongsLookup && window._strongsRoots) {
    var sNum = _strongsLayered(hw);
    if (sNum && _strongsRoots[sNum]) {
      var entry = _strongsRoots[sNum];
      // Return the word's OWN lexeme. Strong's derivation parents (entry.r) are
      // 19th-century etymology (e.g. בן ← בנה) — separate words, not learning roots.
      return sNum;
    }
  }
  // Fallback to old algorithmic root
  if (rootMap[hw]) return rootMap[hw];
  var stripped2 = stripPrefixes(hw);
  if (rootMap[stripped2]) return rootMap[stripped2];
  return extractRoot(_stripNikkud(stripped2));
}

// Build frequency maps by root
var rootFreq = {};
var wordToRoot = {};
var wordFreq = {};
for (var ri = 0; ri < _verseRegistry.length; ri++) {
  var reg = _verseRegistry[ri];
  var bk = getBookChapter(reg.chapId);
  for (var vi = 0; vi < reg.verses.length; vi++) {
    var vWords = reg.verses[vi].words;
    var vk = bk ? (bk.book + '|' + bk.chapter + '|' + (vi + 1)) : '';
    for (var wi = 0; wi < vWords.length; wi++) {
      var h = vWords[wi][0], g = vWords[wi][1].replace(/-/g, ' ');
      if (h === '\u05C3' || !g.trim()) continue;
      var root = getRoot(h);
      wordToRoot[h] = root;
      if (!rootFreq[root]) rootFreq[root] = { count: 0, glosses: {}, forms: {}, exampleVerse: '', verseRefs: {} };
      rootFreq[root].count++;
      rootFreq[root].glosses[g] = (rootFreq[root].glosses[g] || 0) + 1;
      rootFreq[root].forms[h] = (rootFreq[root].forms[h] || 0) + 1;
      if (vk) { rootFreq[root].verseRefs[vk] = (rootFreq[root].verseRefs[vk] || 0) + 1; if (!rootFreq[root].exampleVerse) rootFreq[root].exampleVerse = vk; }
      if (!wordFreq[h]) wordFreq[h] = { count: 0, glosses: {} };
      wordFreq[h].count++;
      wordFreq[h].glosses[g] = (wordFreq[h].glosses[g] || 0) + 1;
    }
  }
}

// === ENHANCED WORD POPUP ===
(function() {
  var popup = document.getElementById('word-popup');
  var popupHw = document.getElementById('popup-hw');
  var popupGl = document.getElementById('popup-gl');
  var popupDetail = document.getElementById('popup-detail');
  var popupStrong = document.getElementById('popup-strong');

  document.addEventListener('click', function(e) {
    if (e.target.closest('#sel-toolbar')) return;
    if (e.target.closest('#word-popup')) return;
    var wu = e.target.closest('.word-unit');
    if (!wu) { closePopup(); return; }
    if (e.target.closest('.verse-num')) return;
    if ('ontouchstart' in window && window.__readerTouchBurstLen && window.__readerTouchBurstLen() >= 2) {
      window.__readerTouchBurstClear();
      return;
    }
    var hw = wu.querySelector('.hw'), gl = wu.querySelector('.gl');
    if (!hw || !gl) return;
    window._popupWordUnit = wu;
    var hText = hw.textContent, gText = gl.textContent;
    hText = hText.replace(/^[\s.,;:?!()]+|[\s.,;:?!()]+$/g, '');
    popupHw.textContent = hText;
    document.getElementById('popup-translit').textContent = transliterate(hText);
    popupGl.textContent = gText;

    // Strong's H-number
    var strongsNum = _strongsLayered(hText);
    if (strongsNum) {
      // The lexeme's own definition, so a derived noun explains itself:
      // לֶקַח H3948 "learning, doctrine" beside its root לקח "take".
      var sEntry = window._strongsRoots && window._strongsRoots[strongsNum];
      var gEntry = window._rootGlossaryData && window._rootGlossaryData[strongsNum];
      var sDef = (gEntry && gEntry.meaning) || (sEntry && sEntry.g) || '';
      popupStrong.innerHTML = "Strong\u2019s: <a href='https://www.blueletterbible.org/lexicon/" + strongsNum.toLowerCase() + "/wlc/0/1/' target='_blank' rel='noopener'>" + strongsNum + "</a>" +
        (sDef ? " <span style=\"font-style:italic;opacity:0.8;\">\u2014 " + sDef + "</span>" : "");
      popupStrong.style.display = '';
    } else {
      popupStrong.style.display = 'none';
    }

    // Root-based frequency
    var root = wordToRoot[hText] || getRoot(hText);
    var rInfo = rootFreq[root];
    // Lexeme line: this word's own dictionary entry (clearer for learners than the parent root)
    var lemmaLine = '';
    if (window.getLemmaStrongs && window._strongsRoots) {
      var lemNum = getLemmaStrongs(hText);
      if (lemNum && lemNum !== root && _strongsRoots[lemNum]) {
        var lemE = _strongsRoots[lemNum];
        lemmaLine = 'Word: <span style="font-family:David Libre,serif">' + (lemE.w || '') + '</span>' +
          (lemE.x ? ' <span style="font-size:0.85em;opacity:0.7;">(' + ((typeof transliterate === 'function' && lemE.w ? transliterate(lemE.w) : '') || lemE.x) + ')</span>' : '') +
          (lemE.g ? ' \u2014 ' + lemE.g : '') + '<br>';
      }
    }
    var sInfo = wordFreq[hText];
    var detailHtml = '';
detailHtml += '<div class="rsc-slot">';   // RootScorecard upgrades this block with cross-volume counts
    if (rInfo) {
      var verseCount = rInfo.verseRefs ? Object.keys(rInfo.verseRefs).length : 0;
      var rootDisplay = '', rootMeaning = '';
      var isStrongsRoot = /^H\d+$/.test(root) && window._strongsRoots;
      if (isStrongsRoot) {
        var rootEntry = _strongsRoots[root];
        if (rootEntry) {
          rootDisplay = '<span style="font-family:David Libre,serif">' + rootEntry.w + '</span> <span style="font-size:0.85em;opacity:0.7;">(' + ((typeof transliterate === 'function' && rootEntry.w ? transliterate(rootEntry.w) : '') || rootEntry.x) + ')</span>';
          // Exactness: prefer the site's own curated/observed glosses;
          // Strong's abridged one-word gloss only as a last resort.
          var strongsGloss = rootEntry.g || '';
          if (!rootMeaning) {
            var consRoot = _stripNikkud(rootEntry.w);
            var curatedRoot = (window._rootGlossaryData || {})[consRoot] || {};
            rootMeaning = curatedRoot.meaning || '';
          }
        }
      } else {
        rootDisplay = '(<span style="font-family:David Libre,serif">' + toSofit(root) + '</span>) <span style="font-size:0.85em;opacity:0.7;">' + transliterate(toSofit(root)) + '</span>';
        var curatedRoot = (window._rootGlossaryData || {})[root] || {};
        rootMeaning = curatedRoot.meaning || '';
      }
      if (!rootMeaning) {
        var glossPairs = Object.entries(rInfo.glosses).sort(function(a,b) { return b[1]-a[1]; });
        var seen = {}, meanings = [];
        glossPairs.forEach(function(pair) {
          var m = pair[0].replace(/^(and-|the-|to-|in-|from-|as-|that-|by-|for-|with-|a-|an-|his-|her-|their-|my-|our-|your-|its-)+/g,'').replace(/-/g,' ').trim();
          if (m && !seen[m] && m.length > 1) { seen[m] = true; meanings.push(m); }
        });
        rootMeaning = meanings.slice(0, 4).join(', ');
      }
      if (!rootMeaning && typeof strongsGloss === 'string') rootMeaning = strongsGloss;
      detailHtml += lemmaLine + '<span style="cursor:pointer;text-decoration:none;color:var(--tap-blue,#2e6da4);" onclick="event.stopPropagation();openGlossaryAtRoot(\'' + root.replace(/'/g,"\\'") + '\')">Root ' + rootDisplay + '</span> \u2014 ' + rInfo.count + ' uses in ' + verseCount + ' verses';
      if (rootMeaning) detailHtml += '<br><span style="font-style:italic;color:var(--ink-light);font-size:0.9em;">' + rootMeaning + '</span>';
      var formKeys = Object.keys(rInfo.forms);
      if (formKeys.length > 1) {
        var sortedForms = Object.entries(rInfo.forms).sort(function(a,b) { return b[1]-a[1]; });
        detailHtml += '<br><span>Forms:</span> ' + sortedForms.slice(0, 5).map(function(pair) {
          return '<span style="font-family:David Libre,serif">' + pair[0] + '</span> (' + pair[1] + 'x)';
        }).join(', ');
      }
      detailHtml += '<br><span style="cursor:pointer;color:var(--accent);text-decoration:underline;font-size:0.9em;" onclick="event.stopPropagation();closePopup();openRootXrefPanel(\'' + root.replace(/'/g,"\\'") + '\')">View all references \u2192</span>';
    } else {
      detailHtml += '<span>Occurrences:</span> ' + (sInfo ? sInfo.count : 1);
    }
    if (sInfo && Object.keys(sInfo.glosses).length > 1) {
      var sorted = Object.entries(sInfo.glosses).sort(function(a,b) { return b[1]-a[1]; });
      detailHtml += '<br><span>Also glossed:</span> ' + sorted.slice(0, 4).map(function(pair) { return '"' + pair[0] + '" (' + pair[1] + 'x)'; }).join(', ');
    }
detailHtml += '</div>';
    // Cross-reference link
    var directXref = wu.getAttribute('data-xref-ref');
    var directXrefKey = wu.getAttribute('data-xref-key');
    if (directXref) {
      var xrefObj = JSON.parse(directXref);
      var refCount = xrefObj.refs ? xrefObj.refs.length : 0;
      detailHtml += '<br><span class="popup-xref-direct" style="cursor:pointer;color:#d4af37;text-decoration:underline;font-size:0.9em;">View Cross-References (' + refCount + ') \u2192</span>';
    }
    if (true) {
      var rootXrefs = window._rootXrefs && window._rootXrefs[root];
      if (rootXrefs && rootXrefs.length > 0) {
        detailHtml += '<br><span class="popup-xref-link" style="cursor:pointer;color:#d4af37;text-decoration:underline;font-size:0.9em;">Cross-References for root (' + rootXrefs.length + ') \u2192</span>';
      }
    }
    popupDetail.innerHTML = detailHtml;

    // Bind xref links
    if (window.RootScorecard) RootScorecard.fill(popupDetail.querySelector('.rsc-slot'), (wu.getAttribute && wu.getAttribute('data-h')) || hText, gText);
    var directLink = popupDetail.querySelector('.popup-xref-direct');
    if (directLink && directXref) {
      directLink.addEventListener('click', function(ev) {
        ev.stopPropagation();
        closePopup();
        openXrefPanel(JSON.parse(wu.getAttribute('data-xref-ref')), wu.getAttribute('data-xref-key'), (window.getLemmaStrongs && getLemmaStrongs(hText)) || root);
      });
    }
    var xrefLink = popupDetail.querySelector('.popup-xref-link');
    if (xrefLink) {
      xrefLink.addEventListener('click', function(ev) {
        ev.stopPropagation();
        closePopup();
        openRootXrefPanel(root);
      });
    }

    // Scorecard opens centered on screen — word-anchored placement ran
    // off-screen on phones and made study impossible.
    popup.style.display = 'block';
    var ovl = document.getElementById('word-popup-overlay');
    if (ovl) {
      ovl.classList.add('visible');
      ovl.setAttribute('aria-hidden', 'false');
    }
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.maxWidth = 'min(460px, 92vw)';
    popup.style.maxHeight = '78vh';
    popup.style.overflowY = 'auto';
    popup.style.webkitOverflowScrolling = 'touch';
  });
})();

function closePopup() {
  var wp = document.getElementById('word-popup');
  if (wp) wp.style.display = 'none';
  var ovl = document.getElementById('word-popup-overlay');
  if (ovl) {
    ovl.classList.remove('visible');
    ovl.setAttribute('aria-hidden', 'true');
  }
}

document.addEventListener(
  'pointerdown',
  function (e) {
    var wp = document.getElementById('word-popup');
    if (!wp || wp.style.display !== 'block') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('#word-popup')) return;
    if (e.target.closest('#sel-toolbar')) return;
    if (e.target.closest('.word-unit')) return;
    closePopup();
  },
  true
);

// === ANNOTATIONS SYSTEM ===
var _otAnnotations = {};
try { _otAnnotations = JSON.parse(localStorage.getItem(window.READER.vol + '-annotations') || '{}'); } catch(e) {}
var _otNotes = {};
try { _otNotes = JSON.parse(localStorage.getItem(window.READER.vol + '-notes') || '{}'); } catch(e) {}

function _saveAnnotations() { try { localStorage.setItem(window.READER.vol + '-annotations', JSON.stringify(_otAnnotations)); } catch(e) {} }
function _saveNotes() { try { localStorage.setItem(window.READER.vol + '-notes', JSON.stringify(_otNotes)); } catch(e) {} }

// Annotations are stored per word, not per tier, so a highlight made in any
// view (interlinear, Hebrew-only, dual, transliteration) shows in all of them.
function _annOf(wid) {
  var a = _otAnnotations[wid];
  if (!a) return {};
  if (a.hl || a.ul) return { hl: a.hl, ul: a.ul };
  var out = {};                       // legacy per-tier record — fold it down
  ['hw','tl','gl'].forEach(function(t) {
    if (!a[t]) return;
    if (a[t].hl && !out.hl) out.hl = a[t].hl;
    if (a[t].ul && !out.ul) out.ul = a[t].ul;
  });
  return out;
}

function _paintWordAnnotation(el, ta) {
  ['hw','tl','gl'].forEach(function(tier) {
    var tierEl = el.querySelector('.' + tier);
    if (!tierEl) return;
    // Highlights and underlines paint the Hebrew line only (corpus-wide rule);
    // the loop still visits tl/gl so stale paint from older data is cleaned.
    var on = tier === 'hw';
    if (on && ta.hl) { tierEl.classList.add('ann-hl'); tierEl.style.backgroundColor = ta.hl; tierEl.setAttribute('data-hlc', ta.hl); }
    else { tierEl.classList.remove('ann-hl'); tierEl.style.backgroundColor = ''; tierEl.removeAttribute('data-hlc'); }
    // Underlines were removed 2026-08-30 — they collided with the nikkud and
    // made pointed text hard to read. Stale ann-ul paint is still cleaned.
    tierEl.classList.remove('ann-ul'); tierEl.style.textDecorationColor = '';
  });
}

function setWordAnnotation(wid, tier, type, color) {
  var cur = _annOf(wid);
  if (color) { cur[type] = color; } else { delete cur[type]; }
  if (cur.hl || cur.ul) { _otAnnotations[wid] = cur; } else { delete _otAnnotations[wid]; }
  _saveAnnotations();
  applyAnnotationToWord(wid);
}

function applyAnnotationToWord(wid) {
  var ta = _annOf(wid);
  document.querySelectorAll('.word-unit[data-wid="' + wid + '"]').forEach(function(el) {
    _paintWordAnnotation(el, ta);
  });
}

function applyAllAnnotations() {
  document.querySelectorAll('.word-unit[data-wid]').forEach(function(el) {
    var wid = el.getAttribute('data-wid');
    if (!_otAnnotations[wid]) return;
    _paintWordAnnotation(el, _annOf(wid));
  });
}

function openAnnotationsPanel() {
  renderAnnotationsList();
  document.getElementById('annotations-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.add('open');
}
function closeAnnotationsPanel() {
  document.getElementById('annotations-panel').classList.remove('open');
  document.getElementById('panel-overlay').classList.remove('open');
}

var _currentAnnTab = 'highlights';
function showAnnTab(tab) {
  _currentAnnTab = tab;
  document.querySelectorAll('.ann-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelector('.ann-tab[onclick*="' + tab + '"]').classList.add('active');
  renderAnnotationsList();
}

function renderAnnotationsList() {
  var list = document.getElementById('annotations-list');
  var html = '';
  if (_currentAnnTab === 'highlights') {
    var wids = Object.keys(_otAnnotations);
    if (wids.length === 0) { html = '<div style="color:var(--ink-light);padding:16px;font-style:italic;">No highlights yet. Select text and use the toolbar to highlight.</div>'; }
    else {
      wids.forEach(function(wid) {
        var parts = wid.split('|');
        var ref = parts.length >= 3 ? parts[0] + ' ' + parts[1] + ':' + parts[2] : wid;
        var el = document.querySelector('.word-unit[data-wid="' + wid + '"]');
        var hw = el ? el.querySelector('.hw') : null;
        var text = hw ? hw.textContent : '';
        html += '<div class="ann-item"><div class="ann-item-ref">' + ref + '</div><div class="ann-item-text">' + text + '</div></div>';
      });
    }
  } else {
    var vks = Object.keys(_otNotes);
    if (vks.length === 0) { html = '<div style="color:var(--ink-light);padding:16px;font-style:italic;">No notes yet. Select text and use the toolbar to add notes.</div>'; }
    else {
      vks.forEach(function(vk) {
        var parts = vk.split('|');
        var ref = parts.length >= 3 ? parts[0] + ' ' + parts[1] + ':' + parts[2] : vk;
        html += '<div class="ann-item"><div class="ann-item-ref">' + ref + '</div><div class="ann-item-note">' + _otNotes[vk] + '</div></div>';
      });
    }
  }
  list.innerHTML = html;
}

function exportAnnotations() {
  var data = { annotations: _otAnnotations, notes: _otNotes, exported: new Date().toISOString(), reader: window.READER.readerName };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = window.READER.vol + '-annotations.json'; a.click();
  URL.revokeObjectURL(url);
}

// === SELECTION TOOLBAR ===
var _selWordUnits = [];
var _selTier = '';
var _selMode = '';
var SW_SEL_TB_LS = 'sw-hide-sel-toolbar';

function _isSelReadingSurface(el) {
  if (!el || !el.closest) return false;
  return !!el.closest('.chapter-panel, .verse, .word-flow, .word-unit, #main-content, #page, .book-header, .landing-hero, .landing-content');
}

function initFloatingSelToolbarPref() {
  // The tools rail starts hidden — selecting text pops the highlighter at the
  // selection (Gospel-Library pattern); the crayon tab opens the full rail.
  document.body.classList.add('hide-sel-toolbar');
  _syncSelToolbarModeButton();
}

function _syncSelToolbarModeButton() {
  var b = document.getElementById('sel-toolbar-mode-toggle');
  if (!b) return;
  var off = document.body.classList.contains('hide-sel-toolbar');
  b.classList.toggle('active', off);
  b.setAttribute('aria-pressed', off ? 'true' : 'false');
  b.title = off ? 'Selection toolbar off — tap to turn on (tools appear after you select text)' : 'Hide floating selection toolbar (copy/select works normally)';
}

function toggleFloatingSelToolbar(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  document.body.classList.toggle('hide-sel-toolbar');
  try { localStorage.setItem(SW_SEL_TB_LS, document.body.classList.contains('hide-sel-toolbar') ? '1' : '0'); } catch (err) {}
  _syncSelToolbarModeButton();
  _hideSelToolbar();
}

function _detectTier(node) {
  var el = node.nodeType === 3 ? node.parentElement : node;
  while (el && !el.classList.contains('word-unit')) {
    if (el.classList.contains('hw')) return 'hw';
    if (el.classList.contains('tl')) return 'tl';
    if (el.classList.contains('gl')) return 'gl';
    el = el.parentElement;
  }
  return '';
}

function _getSelectedWordUnits(sel) {
  if (!sel.rangeCount) return [];
  var range = sel.getRangeAt(0);
  var tier = _detectTier(sel.anchorNode);
  if (!tier) tier = _detectTier(sel.focusNode);
  if (!tier) return [];
  _selTier = tier;
  var container = range.commonAncestorContainer;
  if (container.nodeType === 3) container = container.parentElement;
  while (container && !container.classList.contains('verse') && !container.classList.contains('word-flow') && !container.classList.contains('chapter-panel')) {
    if (container.tagName === 'BODY') return [];
    container = container.parentElement;
  }
  if (!container) return [];
  var wordUnits = container.querySelectorAll('.word-unit[data-wid]');
  var result = [];
  wordUnits.forEach(function(wu) {
    var tierEl = wu.querySelector('.' + tier);
    if (tierEl && sel.containsNode(tierEl, true)) result.push(wu);
  });
  return result;
}

function _showSelToolbar() {
  var sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) { _hideSelToolbar(); return; }
  var anchor = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode);
  if (anchor && (anchor.closest('#sel-toolbar') || anchor.closest('#hl-pop') || anchor.closest('input') || anchor.closest('textarea'))) return;
  var wus = _getSelectedWordUnits(sel);
  if (wus.length > 0) { _selMode = 'word'; _selWordUnits = wus; }
  else { _selMode = 'text'; _selWordUnits = []; }
  var range = sel.getRangeAt(0);
  var rect = range.getBoundingClientRect();
  document.getElementById('sel-subpanel').style.display = 'none';
  document.getElementById('sel-note-row').style.display = 'none';
  // The popover appears at the selection: color rows for word selections,
  // note/copy/share always; it closes when the selection collapses.
  var pop = document.getElementById('hl-pop');
  if (!pop) return;
  document.getElementById('hl-row-hl').style.display = _selMode === 'word' ? 'flex' : 'none';
  document.getElementById('hl-row-ul').style.display = _selMode === 'word' ? 'flex' : 'none';
  document.getElementById('hl-note-row').style.display = 'none';
  pop.classList.add('visible');
  if (_selMode === 'word') _updateSelToolbarIndicators();
}

function _hideSelToolbar() {
  document.getElementById('sel-toolbar').classList.remove('visible');
  var pop = document.getElementById('hl-pop');
  if (pop) pop.classList.remove('visible');
  var pnr = document.getElementById('hl-note-row');
  if (pnr) pnr.style.display = 'none';
  var sp = document.getElementById('sel-subpanel');
  if (sp) sp.style.display = 'none';
  _selWordUnits = [];
  _selTier = '';
  _selMode = '';
}

function hlPopClose() {
  try { window.getSelection().removeAllRanges(); } catch (e) {}
  _hideSelToolbar();
}

// Note editing inside the popover delegates to the rail's note plumbing so the
// storage/marker logic stays in one place.
function hlPopNote() {
  var row = document.getElementById('hl-note-row');
  if (!row) return;
  if (row.style.display !== 'none') { row.style.display = 'none'; return; }
  _loadSelNote();
  var src = document.getElementById('sel-note-input');
  var ta = document.getElementById('hl-note-input');
  ta.value = src ? src.value : '';
  ta.placeholder = src ? src.placeholder : 'Add a note...';
  row.style.display = 'flex';
  ta.focus();
}

function hlPopSaveNote() {
  var ta = document.getElementById('hl-note-input');
  var dst = document.getElementById('sel-note-input');
  if (dst) dst.value = ta.value;
  ta.value = '';
  selToolbarSaveNote();
}

function _updateSelToolbarIndicators() {
  if (_selWordUnits.length === 0) return;
  var ta = _annOf(_selWordUnits[0].getAttribute('data-wid'));
  document.querySelectorAll('#sel-toolbar .sel-color[data-ann="highlight"], #hl-pop .sel-color[data-ann="highlight"]').forEach(function(c) { c.classList.toggle('active', ta.hl === c.getAttribute('data-color')); });
  document.querySelectorAll('#sel-toolbar .sel-color[data-ann="underline"], #hl-pop .sel-color[data-ann="underline"]').forEach(function(c) { c.classList.toggle('active', ta.ul === c.getAttribute('data-color')); });
}

function selToolbarApply(el) {
  var annType = el.getAttribute('data-ann');
  var color = el.getAttribute('data-color');
  var type = annType === 'highlight' ? 'hl' : 'ul';
  _selWordUnits.forEach(function(wu) { var wid = wu.getAttribute('data-wid'); if (wid) setWordAnnotation(wid, _selTier, type, color || null); });
  _updateSelToolbarIndicators();
  window.getSelection().removeAllRanges();
  setTimeout(_hideSelToolbar, 150);
}

function selToolbarToggleColors() {
  var sp = document.getElementById('sel-subpanel');
  sp.style.display = sp.style.display === 'none' ? 'block' : 'none';
}

function selToolbarOpenNote() {
  var row = document.getElementById('sel-note-row');
  var panel = document.getElementById('sel-subpanel');
  if (row.style.display !== 'none') { row.style.display = 'none'; } else { panel.style.display = 'block'; row.style.display = 'block'; _loadSelNote(); document.getElementById('sel-note-input').focus(); }
}

function _selVerseKey() {
  if (_selWordUnits.length === 0) return '';
  var wid = _selWordUnits[0].getAttribute('data-wid');
  return wid ? wid.split('|').slice(0, 3).join('|') : '';
}

function _loadSelNote() {
  var ta = document.getElementById('sel-note-input');
  var vk = _selVerseKey();
  ta.value = vk ? (_otNotes[vk] || '') : '';
}

function selToolbarSaveNote() {
  var vk = _selVerseKey();
  if (!vk) return;
  var ta = document.getElementById('sel-note-input');
  if (ta.value.trim()) { _otNotes[vk] = ta.value; } else { delete _otNotes[vk]; }
  _saveNotes();
  ta.value = '';
  _hideSelToolbar();
}

function selToolbarCopy() {
  var text = '';
  _selWordUnits.forEach(function(wu) {
    var el = wu.querySelector('.' + _selTier);
    if (el) text += (text ? ' ' : '') + el.textContent;
  });
  if (!text && _selMode === 'text') text = window.getSelection().toString();
  if (text) { navigator.clipboard.writeText(text).catch(function() {}); }
  _hideSelToolbar();
}

function selToolbarShare() { _hideSelToolbar(); openSharePopup(); }

function selToolbarClearAll() {
  _selWordUnits.forEach(function(wu) {
    var wid = wu.getAttribute('data-wid');
    if (wid && _otAnnotations[wid]) { delete _otAnnotations[wid]; _saveAnnotations(); applyAnnotationToWord(wid); }
  });
  _hideSelToolbar();
}

// Selection event listeners — do not dismiss on taps inside verse text (fixes double-tap / drag / native copy)
var _selToolbarLastInteract = 0;
document.addEventListener('mouseup', function(e) { if (!e.target.closest('#sel-toolbar') && !e.target.closest('#hl-pop')) setTimeout(_showSelToolbar, 10); });
document.addEventListener('touchend', function(e) { if (!e.target.closest('#sel-toolbar') && !e.target.closest('#hl-pop')) setTimeout(_showSelToolbar, 300); });
document.addEventListener('mousedown', function(e) {
  if (e.target.closest('#sel-toolbar') || e.target.closest('#hl-pop')) { _selToolbarLastInteract = Date.now(); return; }
  if (_isSelReadingSurface(e.target)) return;
  _hideSelToolbar();
});
document.addEventListener('touchstart', function(e) {
  if (e.target.closest('#sel-toolbar') || e.target.closest('#hl-pop')) { _selToolbarLastInteract = Date.now(); return; }
  if (e.touches && e.touches.length > 1) return;
  if (_isSelReadingSurface(e.target)) return;
  _hideSelToolbar();
});
document.addEventListener('selectionchange', function() {
  if (Date.now() - _selToolbarLastInteract < 500) return;
  // While the popover's note editor is open the textarea owns focus and the
  // text selection is gone — that must not dismiss the popover mid-typing.
  var nr = document.getElementById('hl-note-row');
  if (nr && nr.style.display !== 'none') return;
  var sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().trim()) return;
  var pop = document.getElementById('hl-pop');
  var tb = document.getElementById('sel-toolbar');
  if ((pop && pop.classList.contains('visible')) || (tb && tb.classList.contains('visible'))) _hideSelToolbar();
});

initFloatingSelToolbarPref();

// === SHARE SYSTEM ===
var _shareVerseKey = '';
function _getShareUrl() {
  var hash = currentChapterId || '';
  return window.location.origin + window.location.pathname + '#' + hash;
}

function getShareContent() {
  var text = '';
  if (_selWordUnits.length > 0) {
    _selWordUnits.forEach(function(wu) { var hw = wu.querySelector('.hw'); if (hw) text += (text ? ' ' : '') + hw.textContent; });
  }
  return text;
}

function openSharePopup() {
  var preview = document.getElementById('share-verse-preview');
  preview.textContent = getShareContent() || 'Select text to share';
  document.getElementById('share-popup').classList.add('open');
}
function closeSharePopup() { document.getElementById('share-popup').classList.remove('open'); }

function shareToFacebook() { window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(_getShareUrl()), '_blank'); closeSharePopup(); }
function shareToX() { var text = getShareContent(); window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(_getShareUrl()), '_blank'); closeSharePopup(); }
function shareCopyLink() {
  navigator.clipboard.writeText(_getShareUrl()).then(function() { var btn = document.querySelector('.share-btn:nth-child(3)'); if (btn) { btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = 'Copy Link'; }, 1500); } });
  closeSharePopup();
}
function shareNative() {
  if (navigator.share) { navigator.share({ title: window.READER.shareTitle, text: getShareContent(), url: _getShareUrl() }).catch(function() {}); }
  closeSharePopup();
}

// === GLOSSARY SYSTEM ===
var glossaryIndex = null;
var glossaryExclude = new Set(['', ' ']);

function buildGlossaryIndex() {
  if (glossaryIndex) return;
  // Cross-volume index from the concordance: every root in the whole corpus,
  // with total counts — the in-page fallback below only sees this volume.
  if (window.RootScorecard && RootScorecard.ready()) {
    glossaryIndex = RootScorecard.glossaryEntries(typeof glossaryExclude !== 'undefined' ? glossaryExclude : null);
    if (glossaryIndex) return;
  }
  glossaryIndex = [];
  var curated = window._rootGlossaryData || {};
  for (var root in rootFreq) {
    if (glossaryExclude.has(root)) continue;
    var rInfo = rootFreq[root];
    // For Strong's H-number roots, resolve display info and curated data
    var displayHeb = root, displayTranslit = '';
    var cInfo = curated[root] || {};
    if (/^H\d+$/.test(root) && window._strongsRoots && _strongsRoots[root]) {
      var sEntry = _strongsRoots[root];
      displayHeb = sEntry.w;
      displayTranslit = (typeof transliterate === 'function' && sEntry.w ? transliterate(sEntry.w) : '') || sEntry.x || '';
      if (!cInfo.meaning) {
        var consRoot = _stripNikkud(sEntry.w);
        cInfo = curated[consRoot] || {};
      }
    }
    var topGloss = '', topCount = 0;
    for (var g in rInfo.glosses) { if (rInfo.glosses[g] > topCount) { topCount = rInfo.glosses[g]; topGloss = g; } }
    var autoMeaning = topGloss.replace(/^(and-|the-|to-|in-|from-|as-|that-|by-|for-|with-|a-|an-)+/g,'').replace(/-/g,' ');
    glossaryIndex.push({
      root: root, displayHeb: displayHeb, displayTranslit: displayTranslit,
      meaning: cInfo.meaning || autoMeaning || '', category: cInfo.category || 'Uncategorized',
      count: rInfo.count, forms: rInfo.forms, glosses: rInfo.glosses,
      exampleVerse: rInfo.exampleVerse || '', verseRefs: rInfo.verseRefs || {}, biblicalRefs: cInfo.biblicalRefs || []
    });
  }
}

function openGlossary() {
  if (window.RootScorecard && !RootScorecard.ready()) {
    RootScorecard.ensure(function() {
      if (!RootScorecard.ready()) return;
      glossaryIndex = null;
      buildGlossaryIndex();
      if (document.getElementById('glossary-panel').classList.contains('open')) renderGlossaryList();
    });
  }
  buildGlossaryIndex();
  renderGlossaryList();
  document.getElementById('glossary-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.add('open');
}
function closeGlossary() {
  document.getElementById('glossary-panel').classList.remove('open');
  document.getElementById('panel-overlay').classList.remove('open');
  clearHighlightedWords();
}

function setGlossaryTab(btn) {
  document.querySelectorAll('.glossary-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  renderGlossaryList();
}

function renderGlossaryList() {
  var list = document.getElementById('glossary-list');
  var searchVal = (document.getElementById('glossary-search').value || '').trim().toLowerCase();
  var activeTab = document.querySelector('.glossary-tab.active');
  var tab = activeTab ? activeTab.getAttribute('data-tab') : 'all';
  var sortVal = document.getElementById('glossary-sort-select').value;
  var filtered = glossaryIndex.filter(function(e) {
    if (searchVal) {
      // normFinals must be applied to BOTH sides. Folding ם→מ on the search
      // term only made every word ending in a final letter unfindable —
      // "שבעים" became "שבעימ" and matched nothing. That is all ־ים plurals.
      var svNorm = normFinals(searchVal.replace(/[\u0591-\u05C7]/g, ''));
      var rootNorm = normFinals(e.root.replace(/[\u0591-\u05C7]/g, ''));
      var dispNorm = normFinals((e.displayHeb || '').replace(/[\u0591-\u05C7]/g, ''));
      return rootNorm.indexOf(svNorm) === 0 || dispNorm.indexOf(svNorm) === 0 ||
        e.root.toLowerCase().indexOf(searchVal) >= 0 ||
        e.meaning.toLowerCase().indexOf(searchVal) >= 0 ||
        Object.keys(e.glosses).some(function(g) { return g.toLowerCase().indexOf(searchVal) >= 0; }) ||
        Object.keys(e.forms || {}).some(function(f) { var fn2 = normFinals(f.replace(/[\u0591-\u05C7]/g, '')); return fn2.indexOf(svNorm) === 0; });
    }
    return true;
  });
  // A search naming a root exactly should return that root, not every root it
  // is a prefix of: "חלם" listed חַלָּמִישׁ (flint) beside חָלַם.
  if (searchVal) {
    var svExactNarrow = normFinals(searchVal.replace(/[֑-ׇ]/g, ''));
    var exactHits = filtered.filter(function(e) {
      var r0 = normFinals(String(e.root || '').replace(/[֑-ׇ]/g, ''));
      var d0 = normFinals(String(e.displayHeb || '').replace(/[֑-ׇ]/g, ''));
      return r0 === svExactNarrow || d0 === svExactNarrow;
    });
    if (exactHits.length) filtered = exactHits;
  }
  if (sortVal === 'freq-desc') filtered.sort(function(a,b) { return b.count - a.count; });
  else if (sortVal === 'freq-asc') filtered.sort(function(a,b) { return a.count - b.count; });
  else if (sortVal === 'alpha-heb') filtered.sort(function(a,b) { return a.root.localeCompare(b.root,'he'); });
  else if (sortVal === 'alpha-eng') filtered.sort(function(a,b) { return a.meaning.localeCompare(b.meaning,'en'); });
  var html = '';
  if (tab === 'category') {
    var cats = {};
    filtered.forEach(function(e) { var c = e.category || 'Uncategorized'; if (!cats[c]) cats[c] = []; cats[c].push(e); });
    Object.keys(cats).sort().forEach(function(cat) {
      html += '<div class="glossary-category-header">' + cat + ' (' + cats[cat].length + ')</div>';
      cats[cat].forEach(function(e) { html += renderGlossaryEntry(e); });
    });
  } else if (tab === 'frequent') {
    filtered.sort(function(a,b) { return b.count - a.count; });
    filtered.slice(0, 100).forEach(function(e) { html += renderGlossaryEntry(e); });
  } else {
    filtered.forEach(function(e) { html += renderGlossaryEntry(e); });
  }
  if (!html) html = '<div style="color:var(--ink-light);padding:20px;font-style:italic;">No roots found.</div>';
  list.innerHTML = html;
}

function renderGlossaryEntry(entry) {
  var formsList = Object.entries(entry.forms).sort(function(a,b) { return b[1]-a[1]; }).slice(0,8)
    .map(function(pair) { return '<span class="glossary-form-chip" onclick="event.stopPropagation();highlightForm(\'' + pair[0].replace(/'/g,"\\'") + '\')">' + pair[0] + ' <small>(' + pair[1] + ')</small></span>'; }).join('');
  var glossList = Object.entries(entry.glosses).sort(function(a,b) { return b[1]-a[1]; }).slice(0,6)
    .map(function(pair) { return '"' + pair[0] + '" (' + pair[1] + 'x)'; }).join(', ');
  var refsHtml = buildVerseRefsHtml(entry.verseRefs || {});
  var rootHeb = entry.displayHeb || toSofit(entry.root);
  var rootTranslit = entry.displayTranslit || transliterate(toSofit(entry.root));
  return '<div class="glossary-entry" onclick="toggleGlossaryEntry(this)">' +
    '<div class="glossary-entry-header"><span class="glossary-root" data-root-key="' + entry.root + '">' + rootHeb + '</span>' +
    '<span style="font-size:0.75em;opacity:0.6;margin-left:6px;">' + rootTranslit + '</span>' +
    '<span class="glossary-count">' + entry.count + 'x</span></div>' +
    '<div class="glossary-meaning">' + (entry.meaning || '') + '</div>' +
    (entry.category !== 'Uncategorized' ? '<span class="glossary-category-badge">' + entry.category + '</span>' : '') +
    '<div class="glossary-detail">' +
      (entry._rscChips ? '<div style="margin-bottom:6px;">' + entry._rscChips + '</div>' : '') +
      '<div><strong>Glosses:</strong> ' + glossList + '</div>' +
    '<div style="margin-top:6px;"><strong>Forms:</strong></div><div class="glossary-forms-list">' + formsList + '</div>' +
    refsHtml +
    '<button class="glossary-highlight-btn" onclick="event.stopPropagation();highlightAllForms(\'' + entry.root.replace(/'/g,"\\'") + '\')">Highlight all in text</button></div></div>';
}

function buildVerseRefsHtml(verseRefs) {
  var keys = Object.keys(verseRefs);
  if (keys.length === 0) return '';
  var byBook = {};
  keys.forEach(function(vk) {
    var parts = vk.split('|');
    if (parts.length !== 3) return;
    if (!byBook[parts[0]]) byBook[parts[0]] = [];
    byBook[parts[0]].push({ ch: parseInt(parts[1],10), vs: parseInt(parts[2],10), key: vk });
  });
  for (var b in byBook) byBook[b].sort(function(a,c) { return a.ch !== c.ch ? a.ch - c.ch : a.vs - c.vs; });
  var html = '<div class="glossary-refs-section"><strong>References (' + keys.length + ' verses):</strong>';
  var count = 0;
  Object.keys(byBook).sort().forEach(function(book) {
    if (count >= 30) return;
    var refs = byBook[book].slice(0, 10);
    html += '<div class="glossary-refs-book"><span class="glossary-refs-book-name">' + book + ':</span> ';
    html += refs.map(function(r) { return '<span class="glossary-ref-link" onclick="event.stopPropagation();goToGlossaryVerse(\'' + r.key.replace(/'/g,"\\'") + '\')">' + r.ch + ':' + r.vs + '</span>'; }).join(', ');
    html += '</div>';
    count += refs.length;
  });
  html += '</div>';
  return html;
}

function toggleGlossaryEntry(el) { el.classList.toggle('expanded'); }

function goToGlossaryVerse(verseKey) {
  closeGlossary();
  var parts = verseKey.split('|');
  if (parts.length < 3) return;
  var book = findBookByName(parts[0]);
  if (!book) return;
  var chId = book.prefix + '-ch' + parts[1];
  navTo(chId);
  setTimeout(function() {
    var verse = document.querySelector('[data-verse-key="' + verseKey + '"]');
    if (verse) { verse.classList.add('highlighted'); verse.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }, 200);
}

function findBookByName(name) {
  for (var i = 0; i < BOOKS.length; i++) { if (BOOKS[i].en === name) return BOOKS[i]; }
  return null;
}

function highlightAllForms(rootKey) {
  clearHighlightedWords();
  var panel = document.querySelector('.chapter-panel[style*="block"]');
  if (!panel) return;
  // Canonical root via the shared engine (matches the scorecard/glossary keys);
  // fall back to the page's own getRoot while the concordance loads.
  var canon = (window.RootScorecard && RootScorecard.ready())
    ? function(w) { var f = RootScorecard.lookup(w); return f ? f.key : null; }
    : null;
  panel.querySelectorAll('.word-unit').forEach(function(wu) {
    var hw = wu.querySelector('.hw');
    if (!hw) return;
    var h = (wu.getAttribute && wu.getAttribute('data-h')) || hw.textContent;
    var wRoot = canon ? canon(h) : getRoot(h);
    if (wRoot === rootKey) wu.classList.add('glossary-highlighted');
  });
}

function highlightForm(surfaceForm) {
  clearHighlightedWords();
  var panel = document.querySelector('.chapter-panel[style*="block"]');
  if (!panel) return;
  panel.querySelectorAll('.word-unit').forEach(function(wu) {
    var hw = wu.querySelector('.hw');
    if (hw && hw.textContent === surfaceForm) wu.classList.add('glossary-highlighted');
  });
}

function clearHighlightedWords() { document.querySelectorAll('.glossary-highlighted').forEach(function(el) { el.classList.remove('glossary-highlighted'); }); }

function openGlossaryAtRoot(rootKey) {
  if (window.RootScorecard && !RootScorecard.ready()) {
    RootScorecard.ensure(function() {
      if (!RootScorecard.ready()) return;
      glossaryIndex = null;
      buildGlossaryIndex();
      if (document.getElementById('glossary-panel').classList.contains('open')) renderGlossaryList();
    });
  }
  closePopup();
  buildGlossaryIndex();
  // For H-number roots, search by the Hebrew word instead
  var searchTerm = rootKey;
  if (/^H\d+$/.test(rootKey) && window._strongsRoots && _strongsRoots[rootKey]) {
    searchTerm = _strongsRoots[rootKey].w;
  }
  document.getElementById('glossary-search').value = searchTerm;
  renderGlossaryList();
  document.getElementById('glossary-panel').classList.add('open');
  document.getElementById('panel-overlay').classList.add('open');
  setTimeout(function() {
    var entries = document.querySelectorAll('#glossary-list .glossary-entry');
    for (var i = 0; i < entries.length; i++) {
      var rootEl = entries[i].querySelector('.glossary-root');
      if (rootEl && (rootEl.getAttribute('data-root-key') === rootKey || rootEl.textContent === rootKey)) {
        entries[i].classList.add('expanded'); entries[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      }
    }
  }, 100);
}

// Debounced glossary search
(function() {
  var gd;
  document.getElementById('glossary-search').addEventListener('input', function() { clearTimeout(gd); gd = setTimeout(renderGlossaryList, 200); });
})();

// Apply saved annotations on chapter load
var _origEnsureRendered = _ensureChapterRendered;
// Injects the generated chapter heading (interlinear heading-flow). A volume
// whose headings key differently (D&C keys by section label) REDEFINES this
// function in its page block — later declaration wins.
function _injectChapterHeading(chapId) {
  try {
    if (window[window.READER.headingsEn] !== undefined && typeof getBookChapter === 'function') {
      var bc = getBookChapter(chapId);
      if (bc && bc.book && bc.chapter) {
        var key = bc.book + ' ' + bc.chapter;
        var text = window[window.READER.headingsEn][key];
        if (text) {
          var headingEl = document.querySelector('#panel-' + chapId + ' .chapter-heading');
          if (headingEl && !headingEl.querySelector('.chapter-summary-en')) {
            var p = document.createElement('div');
            p.className = 'chapter-summary-en';
            p.textContent = text;
            headingEl.appendChild(p);
          }
        }
        var ht = (window[window.READER.headingsHe] !== undefined) ? window[window.READER.headingsHe][key] : '';
        if (ht) {
          var headingEl2 = document.querySelector('#panel-' + chapId + ' .chapter-heading');
          if (headingEl2 && !headingEl2.querySelector('.chapter-summary-he')) {
            var ph = document.createElement('div');
            ph.className = 'chapter-summary-he';
            ph.setAttribute('dir', 'rtl');
            var phText = ht;
            if (window[window.READER.headingWords] !== undefined && window[window.READER.headingWords][key]) {
              phText = window[window.READER.headingWords][key].map(function(pr){ return pr[0]; }).join(' ').replace(/ \u05C3/g, '\u05C3');
            }
            ph.setAttribute('data-heb', phText);
            ph.textContent = window._noNikkud ? _stripNikkudDisplay(phText) : phText;
            headingEl2.appendChild(ph);
            if (window[window.READER.headingWords] !== undefined && window[window.READER.headingWords][key] && !headingEl2.querySelector('.heading-flow')) {
              var hf = document.createElement('div');
              hf.className = 'heading-flow';
              hf.setAttribute('dir', 'rtl');
              var hws = window[window.READER.headingWords][key];
              for (var hi = 0; hi < hws.length; hi++) {
                var hh = hws[hi][0], hg = hws[hi][1] || '';
                if (hh === '\u2014' || hh === '\u2013' || hh === '-') {
                  var dash = document.createElement('span');
                  dash.className = 'heading-dash'; dash.textContent = '\u2014';
                  hf.appendChild(dash); continue;
                }
                if (hh === '\u05C3') {
                  // Sof pasuq closes the summary the way it closes a verse:
                  // rendered by the .sof class on the preceding word.
                  var lastGrp = hf.lastElementChild;
                  var lastWu = lastGrp && lastGrp.querySelector ? lastGrp.querySelector('.word-unit') : null;
                  if (lastWu) lastWu.classList.add('sof');
                  continue;
                }
                var wu = makeWordUnit(hh, hg, false);
                if (wu) {
                  if (!/[\u05D0-\u05EA]/.test(hh)) { wu.style.direction = 'ltr'; wu.style.unicodeBidi = 'isolate'; var hwSpan = wu.querySelector('.hw'); if (hwSpan) { hwSpan.style.direction = 'ltr'; hwSpan.style.unicodeBidi = 'isolate'; } }
                  var tls = wu.querySelector('.tl');
                  if (tls && typeof transliterate === 'function' && /[\u05D0-\u05EA]/.test(hh)) { try { tls.textContent = transliterate(hh); } catch(eT) {} }
                  var hgrp = document.createElement('span');
                  hgrp.className = 'word-group';
                  hgrp.appendChild(wu);
                  var harr = document.createElement('span');
                  harr.className = 'arr';
                  harr.innerHTML = '<span class="arr-hw">\u200B</span><span class="arr-tl">\u2039</span><span class="arr-gl">\u2039</span>';
                  hgrp.appendChild(harr);
                  hf.appendChild(hgrp);
                }
              }
              var lastA = hf.lastElementChild ? hf.lastElementChild.querySelector('.arr') : null;
              if (lastA) { var lt=lastA.querySelector('.arr-tl'), lg=lastA.querySelector('.arr-gl'); if(lt)lt.textContent='\u00ab'; if(lg)lg.textContent='\u00ab'; }
              headingEl2.appendChild(hf);
            }
          }
        }
      }
    }
  } catch(e) {}
}

_ensureChapterRendered = function(chapId) {
  _origEnsureRendered(chapId);
  setTimeout(applyAllAnnotations, 50);
  if (window._crossrefsLoaded && typeof addCrossRefMarkers === 'function') setTimeout(addCrossRefMarkers, 100);
  _injectChapterHeading(chapId);
};

// DARK MODE
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  var isDark = document.body.classList.contains('dark-mode');
  document.getElementById('dark-mode-toggle').textContent = isDark ? '\u2600' : '\u263D';
  try { localStorage.setItem(window.READER.vol + '-dark-mode', isDark ? '1' : '0'); } catch(e) {}
}
(function() {
  if (localStorage.getItem(window.READER.vol + '-dark-mode') === '1') {
    document.body.classList.add('dark-mode');
    var btn = document.getElementById('dark-mode-toggle');
    if (btn) btn.textContent = '\u2600';
  }
})();

// SEARCH
var searchIndex = null;
function buildSearchIndex() {
  if (searchIndex) return;
  searchIndex = [];
  for (var r = 0; r < _verseRegistry.length; r++) {
    var reg = _verseRegistry[r];
    var label = getChapterLabel(reg.chapId);
    for (var vi = 0; vi < reg.verses.length; vi++) {
      var v = reg.verses[vi];
      var hWords = [], eWords = [];
      for (var wi = 0; wi < v.words.length; wi++) {
        var w = v.words[wi];
        if (w[0] !== '\u05C3') { hWords.push(w[0]); eWords.push(w[1].replace(/-/g, ' ')); }
      }
      searchIndex.push({ chapId: reg.chapId, ref: label + ':' + (vi + 1), hebrew: hWords.join(' '), english: eWords.join(' '), verseIdx: vi });
    }
  }
}

function openSearch() { document.getElementById('search-container').classList.add('open'); document.getElementById('search-input').focus(); buildSearchIndex(); }
function closeSearch() {
  document.getElementById('search-container').classList.remove('open');
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('search-input').value = '';
}
(function() {
  var debounce;
  document.addEventListener('input', function(e) {
    if (e.target.id !== 'search-input') return;
    clearTimeout(debounce);
    debounce = setTimeout(function() { doSearch(e.target.value); }, 200);
  });
})();

function _stripNikkud(s) { return s.replace(/[\u0591-\u05C7]/g, ''); }
function doSearch(query) {
  var results = document.getElementById('search-results');
  if (!query || query.trim().length === 0) { results.classList.remove('open'); results.innerHTML = ''; return; }
  var q = query.trim().toLowerCase(), qStripped = _stripNikkud(q);
  var matches = [];
  for (var i = 0; i < searchIndex.length && matches.length < 50; i++) {
    var si = searchIndex[i];
    var hebStripped = _stripNikkud(si.hebrew);
    // Hebrew without nikkud, and English from the gloss or the translation
    if (window.SWSearch ? window.SWSearch.matches(si, query.trim())
        : (hebStripped.indexOf(qStripped) >= 0 || si.english.toLowerCase().indexOf(q) >= 0 || si.hebrew.indexOf(q) >= 0)) matches.push(si);
  }
  if (matches.length === 0) {
    results.innerHTML = '<div style="padding:12px;color:#888;font-family:David Libre,serif;">No results found</div>';
    results.classList.add('open'); return;
  }
  var html = '';
  matches.forEach(function(m) {
    // show the side the query was asked in: Hebrew for Hebrew, translation for English
    var displayText, _rtl = true;
    if (window.SWSearch) {
      displayText = window.SWSearch.snippet(m, query.trim(), 78);
      _rtl = window.SWSearch.hasHebrew(displayText);
    } else {
      displayText = m.hebrew.length > 60 ? m.hebrew.substring(0, 60) + '\u2026' : m.hebrew;
    }
    displayText = String(displayText).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    html += '<div class="search-result" onclick="closeSearch();navTo(\'' + m.chapId + '\')">';
    html += '<div class="search-result-ref">' + m.ref + '</div>';
    html += '<div class="search-result-text" dir="' + (_rtl ? 'rtl' : 'ltr') + '" style="text-align:' + (_rtl ? 'right' : 'left') + ';">' + displayText + '</div></div>';
  });
  html += '<div style="padding:12px 16px;border-top:2px solid var(--rule);direction:ltr;font-family:David Libre,serif;font-size:0.85em;color:var(--ink-light);">';
  html += '<div style="font-weight:600;margin-bottom:6px;">Search other volumes:</div>';
  [{name:'Old Testament',page:'ot.html'},{name:'New Testament',page:'nt.html'},{name:'Book of Mormon',page:'bom/bom.html'},{name:'D&C',page:'dc.html'},{name:'Pearl of Great Price',page:'pgp.html'},{name:'JST',page:'jst.html'}].filter(function(v) { return v.page !== window.READER.selfPage; }).forEach(function(v) {
    html += '<a href="' + v.page + '?q=' + encodeURIComponent(query.trim()) + '" style="display:inline-block;margin:3px 4px;color:var(--accent);text-decoration:none;padding:4px 10px;border:1px solid var(--accent);border-radius:3px;font-size:0.9em;">' + v.name + '</a>';
  });
  html += '</div>';
  results.innerHTML = html;
  results.classList.add('open');
}

// READING PROGRESS BAR
window.addEventListener('scroll', function() {
  var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  var pct = docHeight > 0 ? (scrollTop / docHeight * 100) : 0;
  document.getElementById('reading-progress').style.width = pct + '%';
});

// URL HASH ROUTING
(function() {
  // Map English book names to prefixes for friendly routing
  var bookNameMap = {};
  BOOKS.forEach(function(b) {
    bookNameMap[b.en.toLowerCase()] = b.prefix;
    bookNameMap[b.prefix] = b.prefix;
  });
  // Also add common abbreviations
  // per-volume alias spellings live in the page config
  var _al = window.READER.bookAliases || {};
  for (var _k in _al) bookNameMap[_k] = _al[_k];

  function handleHash() {
    var hashRaw = window.location.hash.replace('#', '');
    if (!hashRaw) return;

    // Support verse deep-link: #gen-ch1&v=5 or #genesis/1&v=5
    var parts = hashRaw.split('&');
    var hash = parts[0] || '';
    var vNum = 0;
    for (var pi = 1; pi < parts.length; pi++) {
      var kv = parts[pi].split('=');
      if (kv[0] === 'v') vNum = parseInt(kv[1] || '0', 10) || 0;
    }

    function scrollToVerseNum(n) {
      if (!n || n < 1) return;
      setTimeout(function() {
        var panel = document.querySelector('.chapter-panel[style*="block"]');
        if (!panel) return;
        var verses = panel.querySelectorAll('.verse');
        var v = verses[n - 1];
        if (v) {
          v.scrollIntoView({ behavior: 'smooth', block: 'center' });
          v.classList.add('highlighted');
          setTimeout(function() { v.classList.remove('highlighted'); }, 3000);
        }
      }, 350);
    }
    // Direct match: gen-ch1, psa-ch150
    if (chapterOrder.indexOf(hash) >= 0) { window.__swNavFromHash = true; try { navTo(hash); } finally { window.__swNavFromHash = false; } scrollToVerseNum(vNum); return; }
    // A volume with its own hash grammar (D&C: #dc/109, #section-109)
    // supplies READER.parseHash(hash) → chapId or null.
    if (window.READER.parseHash) {
      var _custom = window.READER.parseHash(hash);
      if (_custom) { window.__swNavFromHash = true; try { navTo(_custom); } finally { window.__swNavFromHash = false; } scrollToVerseNum(vNum); return; }
    }
    // Friendly: genesis/1, gen-1, gen/1, psalms/23
    var m = hash.match(/^([a-z0-9\s]+?)[\/-](\d+)$/i);
    if (m) {
      var bookKey = m[1].toLowerCase().replace(/\s+/g, ' ');
      var ch = parseInt(m[2], 10);
      var prefix = bookNameMap[bookKey];
      if (prefix) {
        var book = findBook(prefix);
        if (book && ch >= 1 && ch <= book.ch) { window.__swNavFromHash = true; try { navTo(prefix + '-ch' + ch); } finally { window.__swNavFromHash = false; } scrollToVerseNum(vNum); return; }
      }
    }
    // Just a book name without chapter: genesis, psalms
    var bookOnly = hash.toLowerCase().replace(/[\/-]/g, '');
    if (bookNameMap[bookOnly]) {
      window.__swNavFromHash = true; try { navTo(bookNameMap[bookOnly] + '-ch1'); } finally { window.__swNavFromHash = false; }
      scrollToVerseNum(vNum);
      return;
    }
  }
  // The initial route must wait for DOMContentLoaded: dc/pgp/jst override
  // getBookChapter/parseHash in a script AFTER this file, and rendering the
  // landing chapter before those run keys its verses with the canon
  // getBookChapter (null for their ids — no Dual English, no annotation keys).
  function _initialRoute() {
    handleHash();
    // Resume at the saved reading position (same chapter, no verse deep-link)
    // AFTER the nav's own delayed scroll and font loading are done. Only
    // wheel/touch/key mark real user intent — the nav's programmatic scrolls
    // must not cancel the restore, but a reader who moved is never yanked.
    var userMoved = false, mark = function() { userMoved = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(function(ev) {
      window.addEventListener(ev, mark, { passive: true, once: true });
    });
    var settle = function() { if (!userMoved && typeof window._restoreReadPos === 'function') window._restoreReadPos(); };
    setTimeout(settle, 700);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function() { setTimeout(settle, 120); });
    window.addEventListener('load', function() { setTimeout(settle, 400); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initialRoute);
  } else {
    _initialRoute();
  }
  window.addEventListener('hashchange', handleHash);
})();

// Auto-search from ?q= parameter (cross-volume search)
(function() {
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (q) {
    setTimeout(function() {
      openSearch();
      document.getElementById('search-input').value = q;
      buildSearchIndex();
      doSearch(q);
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }, 800);
  }
})();

