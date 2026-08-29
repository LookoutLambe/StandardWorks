(function () {
  'use strict';

  document.documentElement.classList.add('has-sw-chrome', 'sw-shell-pending');

  function markShellReady() {
    document.documentElement.classList.add('sw-shell-ready');
    document.documentElement.classList.remove('sw-shell-pending');
  }
  window.swMarkShellReady = markShellReady;

  setTimeout(markShellReady, 2800);

  var STORAGE_KEY = 'sw-dark';

  function assetBase() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('/bom/') !== -1) return '../';
    return '';
  }

  function hubUrl() {
    return assetBase() + 'index.html';
  }

  function headerBar() {
    return document.getElementById('sw-top-bar');
  }

  window.swHeaderBar = headerBar;
  window.swSyncChromeLayout = syncChromeHeight;

  function syncChromeHeight() {
    var bar = headerBar();
    if (!bar) return;
    document.documentElement.style.setProperty('--sw-chrome-h', bar.offsetHeight + 'px');
  }

  function syncDarkButtons() {
    var isDark = document.body.classList.contains('dark-mode');
    var icon = isDark ? '\u2600' : '\u263D';
    var btn = document.getElementById('sw-chrome-dark');
    if (btn) btn.textContent = icon;
    var legacy = document.getElementById('dark-mode-toggle');
    if (legacy) legacy.textContent = icon;
    var dict = document.getElementById('darkBtn');
    if (dict) dict.textContent = icon;
  }

  function applyDark(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    try { localStorage.setItem(STORAGE_KEY, isDark ? '1' : '0'); } catch (e) {}
    syncDarkButtons();
  }

  // iPhone: keep the browser/status-bar surround color in step with dark mode
  function syncThemeColor() {
    try {
      var m = document.querySelector('meta[name="theme-color"]');
      if (!m) return;
      m.setAttribute('content', document.body.classList.contains('dark-mode') ? '#0a0a0a' : '#1e2233');
    } catch (e) {}
  }
  try {
    new MutationObserver(syncThemeColor).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncThemeColor();
  } catch (e) {}

  window.toggleDark = function () {
    var volBtn = document.getElementById('dark-mode-toggle');
    if (volBtn && typeof volBtn.onclick === 'function') {
      volBtn.click();
      syncDarkButtons();
      return;
    }
    if (typeof window.toggleDarkMode === 'function') {
      window.toggleDarkMode();
      syncDarkButtons();
      return;
    }
    applyDark(!document.body.classList.contains('dark-mode'));
  };

  function openMenu() {
    try {
      if (window.NavEngine && typeof NavEngine.toggle === 'function') {
        NavEngine.toggle();
        return;
      }
      if (window.NavEngine && typeof NavEngine.openToVolume === 'function') {
        var script = document.querySelector('script[src*="site_chrome.js"]');
        var vol = script && script.getAttribute('data-sw-volume');
        NavEngine.openToVolume(vol || 'bom');
      }
    } catch (e) {}
  }

  function ensureNavHidden() {
    var hidden = document.getElementById('sw-chrome-nav-hidden');
    if (hidden) return hidden;
    hidden = document.createElement('div');
    hidden.id = 'sw-chrome-nav-hidden';
    hidden.className = 'sw-chrome-nav-hidden';
    hidden.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hidden);
    return hidden;
  }

  function createHomeLink() {
    var a = document.createElement('a');
    a.href = hubUrl();
    a.className = 'sw-chrome-home';
    a.setAttribute('aria-label', 'Standard Works Home');
    a.title = 'Standard Works Home';
    a.innerHTML = '<img src="' + assetBase() + 'icons/sw-mark.svg" alt="" style="width:38px;height:38px;display:block;border-radius:9px">';
    return a;
  }

  function ensureHomeLink() {
    var menu = document.getElementById('sw-chrome-menu');
    if (!menu || document.querySelector('.sw-chrome-home')) return;
    menu.insertAdjacentElement('afterend', createHomeLink());
  }

  function createPrintLink() {
    var a = document.createElement('a');
    a.href = assetBase() + 'bom/bom.html#print-editions';
    a.className = 'sw-chrome-btn sw-chrome-print';
    a.setAttribute('aria-label', 'Print editions');
    a.title = 'Print editions';
    a.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M5.6 7.5h12.8l1.1 12a1.6 1.6 0 0 1-1.6 1.7H6.1a1.6 1.6 0 0 1-1.6-1.7z"/>' +
      '<path d="M8.8 10.2V6.4a3.2 3.2 0 0 1 6.4 0v3.8"/></svg>';
    return a;
  }

  function ensurePrintLink() {
    // The bag belongs to the landing hub only — never over the reading.
    if (document.body.classList.contains('sw-chrome-reader')) return;
    var dark = document.getElementById('sw-chrome-dark');
    if (!dark || document.querySelector('.sw-chrome-print')) return;
    dark.insertAdjacentElement('beforebegin', createPrintLink());
  }

  function mergeReaderControls() {
    var controls = document.querySelector('.controls-top');
    if (!controls) return;

    document.body.classList.add('sw-chrome-reader');

    var tools = document.getElementById('sw-chrome-tools');
    if (!tools) return;

    var navRow = controls.querySelector('.nav-row');
    if (navRow) {
      var hidden = ensureNavHidden();
      while (navRow.firstChild) {
        hidden.appendChild(navRow.firstChild);
      }
    }

    var toolsGroup = controls.querySelector('.tools-group');
    if (toolsGroup) {
      var sliderLabel = toolsGroup.querySelector('label');
      if (sliderLabel) {
        tools.innerHTML = '';
        tools.appendChild(sliderLabel);
      }
      var darkLegacy = toolsGroup.querySelector('#dark-mode-toggle');
      if (darkLegacy) ensureNavHidden().appendChild(darkLegacy);
    }

    controls.remove();
    ensureHomeLink();
    syncChromeHeight();
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  function mount() {
    if (document.getElementById('sw-top-bar')) return;

    document.body.classList.add('has-sw-chrome');

    var header = document.createElement('header');
    header.id = 'sw-top-bar';
    header.className = 'sw-top-bar';
    header.setAttribute('role', 'banner');
    header.innerHTML =
      '<div class="sw-top-bar-inner">' +
        '<button type="button" class="sw-chrome-btn" id="sw-chrome-menu" aria-label="Open books and navigation">' +
          '<span class="sw-chrome-menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>' +
        '</button>' +
        '<a class="sw-top-bar-brand" href="' + hubUrl() + '" aria-label="Home — Hebrew Interlinear Standard Works">' +
          '<span class="sw-top-bar-brand-he" lang="he" dir="rtl">\u05DB\u05EA\u05D1\u05D9 \u05D4\u05E7\u05D5\u05D3\u05E9</span>' +
          '<span class="sw-top-bar-brand-en">Standard Works</span>' +
        '</a>' +
        '<div class="sw-top-bar-tools" id="sw-chrome-tools" aria-label="Font size"></div>' +
        '<button type="button" class="sw-chrome-btn" id="sw-chrome-dark" aria-label="Toggle dark mode">\u263D</button>' +
      '</div>' +
      '<div id="sw-chrome-location" class="sw-chrome-location" aria-hidden="true"></div>';

    document.body.insertBefore(header, document.body.firstChild);

    document.getElementById('sw-chrome-menu').addEventListener('click', openMenu);
    document.getElementById('sw-chrome-dark').addEventListener('click', function () {
      window.toggleDark();
    });

    mergeReaderControls();
    ensureHomeLink();
    ensurePrintLink();

    if (!document.querySelector('.controls-bottom')) {
      markShellReady();
    }

    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        document.body.classList.add('dark-mode');
      }
    } catch (e) {}
    syncDarkButtons();
    syncChromeHeight();
    window.addEventListener('resize', syncChromeHeight);

    var swReg = document.createElement('script');
    swReg.src = assetBase() + 'sw_register.js?v=3';
    swReg.async = true;
    document.body.appendChild(swReg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Rights line — every page carries it at the end of the content flow.
  function mountFavicon() {
    if (document.querySelector('link[rel="icon"][href*="sw-mark"]')) return;
    var l = document.createElement('link');
    l.rel = 'icon';
    l.type = 'image/svg+xml';
    l.href = assetBase() + 'icons/sw-mark.svg';
    document.head.appendChild(l);
  }
  mountFavicon();

  function mountRights() {
    if (document.getElementById('sw-rights')) return;
    var d = document.createElement('div');
    d.id = 'sw-rights';
    d.innerHTML = '\u00a9 Christopher Lambe. All rights reserved. Licensing inquiries: <a href="mailto:chris@sefermormon.com">chris@sefermormon.com</a>';
    var page = document.querySelector('.page');
    (page || document.body).appendChild(d);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountRights);
  } else {
    mountRights();
  }
})();
