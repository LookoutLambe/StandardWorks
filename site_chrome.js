(function () {
  'use strict';

  document.documentElement.classList.add('has-sw-chrome', 'sw-shell-pending');

  function markShellReady() {
    document.documentElement.classList.add('sw-shell-ready');
    document.documentElement.classList.remove('sw-shell-pending');
  }
  window.swMarkShellReady = markShellReady;

  setTimeout(markShellReady, 2800);

  var STORAGE_KEY = 'sw-dark';       // legacy boolean, still honoured
  var THEME_KEY   = 'sw-theme-mode';  // 'light' | 'sepia' | 'dark'

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

  // Honour the system motion preference in every programmatic scroll
  var _rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  window.swScrollBehavior = (_rm && _rm.matches) ? 'auto' : 'smooth';
  if (_rm && _rm.addEventListener) _rm.addEventListener('change', function (e) { window.swScrollBehavior = e.matches ? 'auto' : 'smooth'; });

  // Keyboard: Enter / Space on a focused word does what a tap does
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var wu = e.target && e.target.classList && e.target.classList.contains('word-unit') ? e.target : null;
    if (!wu) return;
    e.preventDefault();
    wu.click();
  });

  window.swHeaderBar = headerBar;

  // Font size: two 44 px steps instead of a 56x16 px slider thumb. The hidden
  // range input stays as the value store the readers already save/restore.
  window.stepSize = function (delta) {
    var s = document.getElementById('sizeSlider');
    var cur = s ? parseInt(s.value, 10) : NaN;
    if (isNaN(cur)) { var pg = document.getElementById('page'); cur = (pg && parseInt(pg.style.fontSize, 10)) || 100; }
    var next = Math.max(70, Math.min(150, cur + delta));
    if (s) s.value = next;
    if (typeof window.setSize === 'function') window.setSize(next);
  };
  window.swSyncChromeLayout = syncChromeHeight;

  function syncChromeHeight() {
    var bar = headerBar();
    if (!bar) return;
    document.documentElement.style.setProperty('--sw-chrome-h', bar.offsetHeight + 'px');
  }

  /* THREE reading themes, not two: light, sepia, dark — the set Kindle,
     Apple Books and Instapaper all ship. Sepia is a LIGHT theme (dark text on
     an aged-paper ground), because positive polarity out-reads negative at
     every age and the gap widens as type shrinks, and because dark mode
     haloes for readers with astigmatism. See the sepia block in sw_theme.css.

     The old key held '1'/'0'. It is still read and still written, so a reader
     who set dark on an older build keeps dark, and one who never opens the
     new control never sees a change. */
  var THEMES = ['light', 'sepia', 'dark'];
  var THEME_ICON = { light: '\u263D', sepia: '\u25D1', dark: '\u2600' };
  var THEME_LABEL = { light: 'Light', sepia: 'Sepia', dark: 'Dark' };

  function currentTheme() {
    if (document.body.classList.contains('dark-mode')) return 'dark';
    if (document.body.classList.contains('sepia-mode')) return 'sepia';
    return 'light';
  }

  function readStoredTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (THEMES.indexOf(t) >= 0) return t;
      return localStorage.getItem(STORAGE_KEY) === '1' ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  }

  function syncDarkButtons() {
    var t = currentTheme();
    var icon = THEME_ICON[t];
    ['sw-chrome-dark', 'dark-mode-toggle', 'darkBtn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = icon;
      el.setAttribute('aria-label', 'Reading theme: ' + THEME_LABEL[t] + '. Tap to change.');
      el.setAttribute('title', THEME_LABEL[t]);
    });
  }

  function applyTheme(name) {
    if (THEMES.indexOf(name) < 0) name = 'light';
    document.body.classList.toggle('dark-mode', name === 'dark');
    document.body.classList.toggle('sepia-mode', name === 'sepia');
    try {
      localStorage.setItem(THEME_KEY, name);
      localStorage.setItem(STORAGE_KEY, name === 'dark' ? '1' : '0');
    } catch (e) {}
    syncDarkButtons();
  }
  window.swApplyTheme = applyTheme;
  window.swCurrentTheme = currentTheme;

  function applyDark(isDark) { applyTheme(isDark ? 'dark' : 'light'); }

  // iPhone: keep the browser/status-bar surround color in step with dark mode
  function syncThemeColor() {
    try {
      var m = document.querySelector('meta[name="theme-color"]');
      if (!m) return;
      /* The header's ACTUAL painted colour, which is what the iPhone status
         bar has to match — set at runtime because this overwrites the markup
         anyway, so fixing the meta tag alone would never have held.
         Indigo & Gold paints one navy in light and sepia and deepens it in
         dark, so unlike the emerald scheme this is no longer a constant. */
      m.setAttribute('content',
        document.body.classList.contains('dark-mode') ? '#101823' : '#1B2A41');
    } catch (e) {}
  }
  try {
    new MutationObserver(syncThemeColor).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncThemeColor();
  } catch (e) {}

  /* one control, cycling light -> sepia -> dark -> light. The per-volume
     handlers are bypassed deliberately: they only ever knew two states and
     would drop sepia on the floor. */
  window.toggleDark = function () {
    var i = THEMES.indexOf(currentTheme());
    applyTheme(THEMES[(i + 1) % THEMES.length]);
  };
  window.cycleTheme = window.toggleDark;

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
    // User ruling 2026-08-30: the כה"ק mark opens the navigation drawer (the
    // hamburger is gone — the center title is the home link, so the mark and
    // the title no longer duplicate each other).
    var a = document.createElement('button');
    a.type = 'button';
    a.className = 'sw-chrome-home';
    a.setAttribute('aria-label', 'Open books and navigation');
    a.title = 'Books and navigation';
    a.style.cssText = 'background:none;border:none;padding:0;cursor:pointer';
    a.innerHTML = '<img src="' + assetBase() + 'icons/sw-mark.svg?v=3" alt="" style="width:38px;height:38px;display:block;border-radius:9px">';
    a.addEventListener('click', openMenu);
    return a;
  }

  function ensureHomeLink() {
    var bar = document.querySelector('.sw-top-bar-inner');
    if (!bar || document.querySelector('.sw-chrome-home')) return;
    bar.insertAdjacentElement('afterbegin', createHomeLink());
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
      var sliderLabel = toolsGroup.querySelector('.sw-size-stepper, label');
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
        ''+   /* hamburger removed 2026-08-30 — the כה"ק mark opens the drawer */
        '<a class="sw-top-bar-brand" href="' + hubUrl() + '" aria-label="Home — Hebrew Interlinear Standard Works">' +
          '<span class="sw-top-bar-brand-he" lang="he" dir="rtl">\u05DB\u05EA\u05D1\u05D9 \u05D4\u05E7\u05D5\u05D3\u05E9</span>' +
          '<span class="sw-top-bar-brand-en">Standard Works</span>' +
        '</a>' +
        '<div class="sw-top-bar-tools" id="sw-chrome-tools" aria-label="Font size"></div>' +
        '<button type="button" class="sw-chrome-btn" id="sw-chrome-dark" aria-label="Toggle dark mode">\u263D</button>' +
      '</div>' +
      ''   /* breadcrumb slot deleted 2026-08-29 */;

    document.body.insertBefore(header, document.body.firstChild);

    document.getElementById('sw-chrome-dark').addEventListener('click', function () {
      window.toggleDark();
    });

    mergeReaderControls();
    ensureHomeLink();
    ensurePrintLink();

  // ── Keyboard access (ui-ux audit 2026-08-30): the landing grids are
  // onclick divs/spans — invisible to Tab. Make every clickable non-control
  // focusable and Enter/Space-activatable. Runs late so generated landings
  // (the canon buildPages, D&C sections) are enhanced too.
  function enhanceClickables() {
    document.querySelectorAll('[onclick]:not(a):not(button):not(input):not(select):not(textarea):not([tabindex])').forEach(function (el) {
      el.setAttribute('tabindex', '0');
      if (!el.getAttribute('role')) el.setAttribute('role', 'button');
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target;
    if (!el || !el.getAttribute || !el.getAttribute('onclick')) return;
    if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(el.tagName) >= 0) return;
    e.preventDefault();
    el.click();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(enhanceClickables, 400); });
  else setTimeout(enhanceClickables, 400);
  setTimeout(enhanceClickables, 2500);
  window.addEventListener('hashchange', function () { setTimeout(enhanceClickables, 300); });





    if (!document.querySelector('.controls-bottom')) {
      markShellReady();
    }

    try {
      var boot = readStoredTheme();
      if (boot === 'dark') document.body.classList.add('dark-mode');
      else if (boot === 'sepia') document.body.classList.add('sepia-mode');
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
    // pages with their own rights block (the hub footer) keep just that one
    if (document.querySelector('[data-sw-rights]')) return;
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
