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
    a.textContent = '\u{1F3E0}';
    return a;
  }

  function ensureHomeLink() {
    var menu = document.getElementById('sw-chrome-menu');
    if (!menu || document.querySelector('.sw-chrome-home')) return;
    menu.insertAdjacentElement('afterend', createHomeLink());
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
})();
