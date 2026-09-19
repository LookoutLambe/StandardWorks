(function () {
  var SRC = __SW_MARK_URI__;
  function apply() {
    var img = document.querySelector('.sw-chrome-home img');
    if (!img) return false;
    if (img.getAttribute('src') !== SRC) {
      img.setAttribute('src', SRC);
      img.style.width = '66px'; img.style.height = '44px';
      img.style.objectFit = 'contain'; img.style.display = 'block';
    }
    return true;
  }
  if (!apply()) {
    var tries = 0;
    var t = setInterval(function () { if (apply() || ++tries > 60) clearInterval(t); }, 50);
  }
  if (window.MutationObserver) {
    new MutationObserver(function () { apply(); }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
