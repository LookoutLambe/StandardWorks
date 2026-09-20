(function () {
  /* THE BAR AS DRAWN. --sw-app-bar-h follows .sw-top-bar's real height,
     inset and all, through a ResizeObserver, so everything the app
     offsets from the bar (page padding, the progress line, the size
     popover) sits exactly under it on every device and orientation. */
  var observed = null;
  function measure() {
    var bar = document.querySelector('.sw-top-bar');
    if (!bar) return false;
    document.documentElement.style.setProperty('--sw-app-bar-h', bar.offsetHeight + 'px');
    if (observed !== bar && window.ResizeObserver) {
      observed = bar;
      new ResizeObserver(function () { measure(); }).observe(bar);
    }
    return true;
  }
  if (!measure()) {
    var tries = 0;
    var t = setInterval(function () { if (measure() || ++tries > 60) clearInterval(t); }, 50);
  }
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', function () { setTimeout(measure, 100); });

  /* 8. THE MARK IN THE BAR IS THE LIBRARY, not the website's home page.
     Captured before the site's own handler, and only where a native
     shell is listening. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('.sw-chrome-home, .sw-top-bar-brand') : null;
    if (!a) return;
    var port = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.swShell;
    if (!port) return;
    e.preventDefault(); e.stopPropagation();
    port.postMessage({ op: 'library' });
  }, true);

  /* 9. THE THEME, AS THE PAGE CHANGES IT. The page's own theme button
     (◐) swaps body classes; the shell's surfaces — the bottom band, the
     player, the native bars — are cut from the page's chrome per theme,
     so they hear every change here rather than only at page load. */
  (function () {
    var port = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.swShell;
    if (!port || !window.MutationObserver) return;
    var last = null, lastModes = null;
    function tell() {
      var t = window.swCurrentTheme ? String(window.swCurrentTheme())
            : (document.body.classList.contains('dark-mode') ? 'dark' : document.body.classList.contains('sepia-mode') ? 'sepia' : 'light');
      if (t !== last) { last = t; port.postMessage({ op: 'theme', theme: t }); }
      /* 9b. THE READING MODES, the same way (user, 2026-09-20: the modes live
         in Settings). Layout and transliteration are body classes; the
         vowels are a body class in the Book of Mormon and the button's own
         state elsewhere. */
      var m = readingModes();
      if (m && m.key !== lastModes) { lastModes = m.key; port.postMessage({ op: 'modes', layout: m.layout, translit: m.translit, nikkud: m.nikkud }); }
    }
    function arm() {
      if (!document.body) return false;
      new MutationObserver(tell).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      var nik = document.getElementById('btn-nikkud');
      if (nik) new MutationObserver(tell).observe(nik, { attributes: true, attributeFilter: ['class'] });
      tell();
      return true;
    }
    if (!arm()) document.addEventListener('DOMContentLoaded', arm);
  })();

  function readingModes() {
    var b = document.body;
    if (!b || !document.getElementById('btn-inter')) return null;
    var nik = document.getElementById('btn-nikkud');
    var layout = b.classList.contains('dual-mode') ? 'dual' : b.classList.contains('hide-gloss') ? 'heb' : 'inter';
    var translit = !b.classList.contains('hide-translit');
    var nikkud = !(b.classList.contains('no-nikkud') || (nik && nik.classList.contains('active')));
    return { layout: layout, translit: translit, nikkud: nikkud, key: layout + (translit ? 't' : '') + (nikkud ? 'n' : '') };
  }
  /* Settings' switches, applied through the page's OWN: setMode writes the
     layout, toggleTranslit and toggleNikkud / toggleNoNikkud flip only when
     the wanted state differs, and each writes the reader's choice as a tap
     on the footer used to. */
  window.__swSetReading = function (want) {
    var m = readingModes();
    if (!m) return false;
    try {
      if (want.layout && want.layout !== m.layout && typeof window.setMode === 'function') window.setMode(want.layout);
      if (typeof want.translit === 'boolean' && want.translit !== m.translit && typeof window.toggleTranslit === 'function') window.toggleTranslit();
      if (typeof want.nikkud === 'boolean' && want.nikkud !== m.nikkud) {
        var f = window.toggleNikkud || window.toggleNoNikkud;
        if (typeof f === 'function') f();
      }
    } catch (e) { return false; }
    return true;
  };

  /* 10. ONE CONTENTS. A shell that has a native Library says so
     (window.__swShellCaps.chapters, set by the app before the page runs).
     There the chapter pill opens THAT library, at this book's chapters, and
     never the page's own drawer -- one contents, not two (navigation audit,
     2026-09-20). Where the page is comes from its own last-read record,
     which nav_engine.js writes on every chapter. */
  var CAPS = window.__swShellCaps || {};
  function shellPort() {
    return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.swShell;
  }
  function placeNow() {
    try {
      var g = JSON.parse(localStorage.getItem('sw-last-read') || 'null');
      if (g && g.volume && g.chapter) return g;
    } catch (e) {}
    return null;
  }
  function openNativeChapters() {
    var p = shellPort(), g = placeNow();
    if (!p || !CAPS.chapters || !g) return false;
    p.postMessage({ op: 'chapters', volume: String(g.volume), chapter: String(g.chapter), label: String(g.label || '') });
    return true;
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#sw-chrome-chapter') : null;
    if (!b || !openNativeChapters()) return;
    e.preventDefault(); e.stopPropagation();
  }, true);

  /* 11. THE CHAPTER ROW WHERE THE THUMB IS (caps.chapterRow). Next and
     previous live in the header, out of a thumb's reach on a phone, and the
     swipe is invisible; so the app puts them, with the chapter, in the band
     that folds while reading, above the five modes. The arrows drive the
     header's own buttons and mirror their labels -- Hebrew order, next on
     the LEFT, the way the page turns -- and each shows the number of the
     chapter it goes to, so the direction never has to be guessed. The pill
     opens the native chapters (10). The footer measures itself again after
     the row is in (syncQuickDockLayout runs on resize). */
  function chapterRow() {
    if (!CAPS.chapterRow) return true;
    if (document.getElementById('sw-app-chapter-row')) return true;
    var footer = document.getElementById('sw-reader-footer');
    var hNext = document.getElementById('nqd-nav-next'), hPrev = document.getElementById('nqd-nav-prev');
    var hPill = document.querySelector('#sw-chrome-chapter .sw-chrome-pill-text');
    if (!footer || !hNext || !hPrev) return false;
    var LEFT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>';
    var RIGHT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
    function arrow(which) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nqd-nav-btn sw-app-arrow sw-app-arrow-' + which;
      b.innerHTML = which === 'next' ? LEFT + '<span class="sw-app-arrow-n"></span>' : '<span class="sw-app-arrow-n"></span>' + RIGHT;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var h = document.getElementById(which === 'next' ? 'nqd-nav-next' : 'nqd-nav-prev');
        if (h && !h.disabled) h.click();
      });
      return b;
    }
    var row = document.createElement('div');
    row.id = 'sw-app-chapter-row';
    row.setAttribute('role', 'toolbar');
    row.setAttribute('aria-label', 'Chapter');
    var pill = document.createElement('button');
    pill.type = 'button';
    pill.id = 'sw-app-chapter-pill';
    pill.setAttribute('aria-label', 'Open the chapters');
    pill.innerHTML = '<span class="sw-app-pill-text"></span><span class="sw-app-pill-caret" aria-hidden="true">▾</span>';
    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      if (openNativeChapters()) return;
      try { if (window.NavEngine && NavEngine.openBooks) NavEngine.openBooks(); } catch (x) {}
    });
    var aNext = arrow('next'), aPrev = arrow('prev');
    row.appendChild(aNext); row.appendChild(pill); row.appendChild(aPrev);
    footer.insertBefore(row, footer.firstChild);
    function numberOf(label) {
      var m = /(\d+)\s*$/.exec(String(label || '').split('—').pop() || '');
      return m ? m[1] : '';
    }
    function sync() {
      var pn = numberOf(hNext.getAttribute('aria-label')), pp = numberOf(hPrev.getAttribute('aria-label'));
      aNext.querySelector('.sw-app-arrow-n').textContent = hNext.disabled ? '' : pn;
      aPrev.querySelector('.sw-app-arrow-n').textContent = hPrev.disabled ? '' : pp;
      aNext.disabled = !!hNext.disabled; aPrev.disabled = !!hPrev.disabled;
      aNext.setAttribute('aria-label', hNext.getAttribute('aria-label') || 'Next chapter');
      aPrev.setAttribute('aria-label', hPrev.getAttribute('aria-label') || 'Previous chapter');
      var t = hPill ? hPill.textContent : '';
      pill.querySelector('.sw-app-pill-text').textContent = t || 'Chapters';
      pill.setAttribute('aria-label', (t || 'Chapters') + ' — open the chapters');
    }
    sync();
    if (window.MutationObserver) {
      new MutationObserver(sync).observe(hNext, { attributes: true });
      new MutationObserver(sync).observe(hPrev, { attributes: true });
      if (hPill) new MutationObserver(sync).observe(hPill, { childList: true, characterData: true, subtree: true });
    }
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    return true;
  }
  if (!chapterRow()) {
    var rowTries = 0;
    var rowTimer = setInterval(function () { if (chapterRow() || ++rowTries > 80) clearInterval(rowTimer); }, 100);
  }

  /* 12. MORE. Where the shell answers it (caps.more), one button at the end
     of the bar gathers what is not reading: display options, share. The
     size and theme buttons it replaces are hidden by the shell's stylesheet;
     their functions are still the page's, driven from the shell's sheet. */
  function moreButton() {
    if (!CAPS.more) return true;
    if (document.getElementById('sw-app-more')) return true;
    var inner = document.querySelector('.sw-top-bar-inner');
    if (!inner) return false;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'sw-app-more';
    b.className = 'sw-chrome-btn';
    b.setAttribute('aria-label', 'Display options');
    b.setAttribute('aria-haspopup', 'dialog');
    b.textContent = '\u22EF';
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var p = shellPort();
      if (p) p.postMessage({ op: 'more' });
    });
    inner.appendChild(b);
    return true;
  }
  if (!moreButton()) {
    var moreTries = 0;
    var moreTimer = setInterval(function () { if (moreButton() || ++moreTries > 80) clearInterval(moreTimer); }, 100);
  }

  var NAME = 'Sefer Mormon: Standard Works';
  function rename() {
    var en = document.querySelector('.sw-top-bar-brand-en');
    if (!en) return false;
    if (en.textContent !== NAME) en.textContent = NAME;
    return true;
  }
  if (rename()) return;
  var tries = 0;
  var t = setInterval(function () { if (rename() || ++tries > 40) clearInterval(t); }, 50);
})();
