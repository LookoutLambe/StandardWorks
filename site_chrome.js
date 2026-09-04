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

  function isReader() {
    return !!document.querySelector('.controls-bottom');
  }

  function createHomeLink() {
    /* 2026-09-04: the reader header is the Spanish/Samoan shape now —
         home · chapter pill · Aa · theme · search
       so on a READER page the כה"ק mark is the way home, and the chapter
       pill in the centre is the way into the books (it opens the drawer at
       the volume in hand). That reverses the 2026-08-30 ruling for reader
       pages only, because the centre title that ruling made the home link
       is the thing the pill replaces. On the hub the mark still opens the
       drawer: the hub has no pill, and its title is already the home link. */
    var reader = isReader();
    var a = document.createElement(reader ? 'a' : 'button');
    if (reader) a.href = hubUrl(); else a.type = 'button';
    a.className = 'sw-chrome-home';
    a.setAttribute('aria-label', reader ? 'Home \u2014 Standard Works' : 'Open books and navigation');
    a.title = reader ? 'Home' : 'Books and navigation';
    a.style.cssText = 'background:none;border:none;padding:0;cursor:pointer';
    a.innerHTML = '<img src="' + assetBase() + 'icons/sw-mark.svg?v=3" alt="" style="width:38px;height:38px;display:block;border-radius:9px">';
    if (!reader) a.addEventListener('click', openMenu);
    return a;
  }

  /* ── The reader header's three controls ───────────────────────────── */
  function createChapterPill() {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'sw-chrome-chapter';
    b.className = 'sw-chrome-pill';
    b.setAttribute('aria-label', 'Open the book list');
    b.setAttribute('dir', 'ltr');
    b.innerHTML = '<span class="sw-chrome-pill-text"></span><span class="sw-chrome-pill-caret" aria-hidden="true">\u25BE</span>';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      try {
        if (window.NavEngine && typeof NavEngine.openBooks === 'function') { NavEngine.openBooks(); return; }
      } catch (err) {}
      openMenu();
    });
    return b;
  }

  /* Aa opens the two-step size control the readers already have (A- / A+
     over the hidden #sizeSlider), in a small popover under the button.
     One button in the bar, the control on demand — the Samoan reader does
     the same with a sheet. */
  function createSizeButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'sw-chrome-size';
    b.className = 'sw-chrome-btn sw-chrome-size';
    b.setAttribute('aria-label', 'Text size');
    b.setAttribute('aria-haspopup', 'true');
    b.setAttribute('aria-expanded', 'false');
    b.title = 'Text size';
    b.textContent = 'Aa';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSizePopover();
    });
    return b;
  }

  function sizePopover() {
    var pop = document.getElementById('sw-size-pop');
    if (pop) return pop;
    pop = document.createElement('div');
    pop.id = 'sw-size-pop';
    pop.className = 'sw-size-pop';
    pop.setAttribute('role', 'group');
    pop.setAttribute('aria-label', 'Text size');
    pop.hidden = true;
    pop.innerHTML =
      '<button type="button" class="sw-size-btn" aria-label="Smaller text">A<span aria-hidden="true">\u2212</span></button>' +
      '<span class="sw-size-pct" aria-live="polite"></span>' +
      '<button type="button" class="sw-size-btn sw-size-btn-up" aria-label="Larger text">A<span aria-hidden="true">+</span></button>';
    var btns = pop.querySelectorAll('.sw-size-btn');
    btns[0].addEventListener('click', function () { window.stepSize(-10); syncSizePct(); });
    btns[1].addEventListener('click', function () { window.stepSize(10); syncSizePct(); });
    document.body.appendChild(pop);
    document.addEventListener('click', function (e) {
      if (pop.hidden) return;
      if (e.target.closest && (e.target.closest('#sw-size-pop') || e.target.closest('#sw-chrome-size'))) return;
      toggleSizePopover(false);
    });
    return pop;
  }

  function syncSizePct() {
    var pct = document.querySelector('#sw-size-pop .sw-size-pct');
    var s = document.getElementById('sizeSlider');
    if (pct) pct.textContent = (s ? s.value : '100') + '%';
  }

  function toggleSizePopover(force) {
    var pop = sizePopover();
    var btn = document.getElementById('sw-chrome-size');
    var show = typeof force === 'boolean' ? force : pop.hidden;
    pop.hidden = !show;
    if (btn) btn.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (show) syncSizePct();
  }

  /* NavEngine hands over its arrow-button factory once the dock exists; the
     header seats them either side of the pill. Same ids as before
     (#nqd-nav-prev / #nqd-nav-next), so nothing that syncs them changed. */
  window.swMountChapterNav = function (makeArrow) {
    var nav = document.getElementById('sw-chrome-nav');
    if (!nav || nav.querySelector('.nqd-nav-btn')) return;
    var pill = nav.querySelector('#sw-chrome-chapter');
    nav.insertBefore(makeArrow('next'), pill);   /* left  */
    nav.appendChild(makeArrow('prev'));          /* right */
    try { if (typeof window.updateNavButtons === 'function') window.updateNavButtons(); } catch (e) {}
  };

  /* The pill's text comes from the reader's own chapter label; NavEngine
     calls this on every chapter change. */
  window.swSyncChapterPill = function (label) {
    var t = document.querySelector('#sw-chrome-chapter .sw-chrome-pill-text');
    if (!t) return;
    var text = label;
    if (!text) {
      try { if (typeof window.getChapterLabel === 'function') text = String(window.getChapterLabel(window.currentChapterId || '')).replace(/\s*\u25BE\s*$/, ''); } catch (e) {}
    }
    t.textContent = text || 'Books';
    var pill = document.getElementById('sw-chrome-chapter');
    if (pill) pill.setAttribute('aria-label', (text || 'Books') + ' \u2014 open the book list');
  };

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
      /* The page's stepper and its hidden #sizeSlider are kept, out of the
         bar, as the value store the Aa popover drives. Nothing else from the
         legacy tools row goes into the header: search has its own icon now,
         and the glossary / annotations / study panels are in the drawer. */
      var sliderLabel = toolsGroup.querySelector('.sw-size-stepper, label');
      if (sliderLabel) ensureNavHidden().appendChild(sliderLabel);
      var darkLegacy = toolsGroup.querySelector('#dark-mode-toggle');
      if (darkLegacy) ensureNavHidden().appendChild(darkLegacy);
      tools.innerHTML = '';
      tools.appendChild(createSizeButton());
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
    var reader = isReader();
    header.innerHTML =
      '<div class="sw-top-bar-inner">' +
        (reader
          ? ''   /* the chapter pill is inserted below, after the home mark */
          : '<a class="sw-top-bar-brand" href="' + hubUrl() + '" aria-label="Home — Hebrew Interlinear Standard Works">' +
              '<span class="sw-top-bar-brand-he" lang="he" dir="rtl">\u05DB\u05EA\u05D1\u05D9 \u05D4\u05E7\u05D5\u05D3\u05E9</span>' +
              '<span class="sw-top-bar-brand-en">Standard Works</span>' +
            '</a>') +
        '<div class="sw-top-bar-tools" id="sw-chrome-tools" aria-label="Text size"></div>' +
        '<button type="button" class="sw-chrome-btn" id="sw-chrome-dark" aria-label="Toggle dark mode">\u263D</button>' +
      '</div>';

    document.body.insertBefore(header, document.body.firstChild);

    if (reader) {
      var inner = header.querySelector('.sw-top-bar-inner');
      /* the chapter control is the three cells the footer used to carry —
         next · chapter · previous, in Hebrew order (next to the LEFT, as the
         next page of a Hebrew book is) — moved up here as one group. The
         arrows are supplied by NavEngine when it builds the dock, so their
         disabled state and destination tooltips keep syncing unchanged. */
      var nav = document.createElement('div');
      nav.className = 'sw-chrome-nav';
      nav.id = 'sw-chrome-nav';
      nav.setAttribute('role', 'group');
      nav.setAttribute('aria-label', 'Chapter');
      nav.appendChild(createChapterPill());
      inner.insertBefore(nav, inner.firstChild);
      /* no search icon: search is the top of the left slide-out, where the
         drawer already has it */
      window.swSyncChapterPill();
      if (typeof window.swArrowFactory === 'function') window.swMountChapterNav(window.swArrowFactory);
    }

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
