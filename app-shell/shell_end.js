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
    var last = null;
    function tell() {
      var t = window.swCurrentTheme ? String(window.swCurrentTheme())
            : (document.body.classList.contains('dark-mode') ? 'dark' : document.body.classList.contains('sepia-mode') ? 'sepia' : 'light');
      if (t === last) return;
      last = t;
      port.postMessage({ op: 'theme', theme: t });
    }
    function arm() {
      if (!document.body) return false;
      new MutationObserver(tell).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      tell();
      return true;
    }
    if (!arm()) document.addEventListener('DOMContentLoaded', arm);
  })();

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
