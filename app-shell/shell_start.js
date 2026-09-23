(function () {
  /* 1. OPEN IN THE BOOK. Only on the shell's first request (?boot=1), only
     on the landing, and only when the page has a record to go back to.
     The record is the page's own — nav_engine.js writes it on every
     chapter — and its path is root-relative (bom/bom.html#…), so
     replace() resolves it against index.html's folder: the www root. */
  try {
    if (/(^|[?&])boot=1(&|$)/.test(location.search) && /(^|\/)index\.html$/.test(location.pathname)) {
      var g = JSON.parse(localStorage.getItem('sw-last-read') || 'null');
      if (g && typeof g.path === 'string' && /^[A-Za-z0-9_\/.-]+\.html(#[^\s]*)?$/.test(g.path)) {
        location.replace(g.path);
        return;
      }
    }
  } catch (e) {}

  /* 2. THE DEFAULT IS INTERLINEAR WITH TRANSLITERATION AND VOWELS (user,
     2026-09-20). The readers boot from three keys per volume and, with
     nothing stored, hide the transliteration; a shell that says
     readingDefaults seeds the keys ONCE, only where nothing is stored, so
     a choice already made anywhere is never overwritten, and every later
     tap in Settings writes the reader's own choice as before. */
  try {
    var caps = window.__swShellCaps || {};
    if (caps.readingDefaults) {
      ['bom', 'ot', 'nt', 'dc', 'pgp', 'jst'].forEach(function (vol) {
        if (localStorage.getItem(vol + '-show-translit') === null) localStorage.setItem(vol + '-show-translit', '1');
        if (localStorage.getItem(vol + '-no-nikkud') === null) localStorage.setItem(vol + '-no-nikkud', '0');
        if (localStorage.getItem(vol + '-view-mode') === null) localStorage.setItem(vol + '-view-mode', 'inter');
      });
    }
  } catch (e) {}

  /* 5. WEBSITE THINGS STAY ON THE WEBSITE. Every selector is prefixed
     with `html` so it outweighs the site's own !important display rules
     (the bar's buttons carry one), whatever order the sheets load in;
     and the style is moved to the end of <body> once the body exists,
     so it is also last in the cascade. */
  var CSS = [
    /* ...but only inside the APPS. On the website itself — the phone web
       shell, html.sw-web-shell — the landing page IS the website's home and
       keeps every part of it. */
    'html:not(.sw-web-shell) #sw-beta-invite, html:not(.sw-web-shell) .landing-app-store, html:not(.sw-web-shell) .landing-update-note, html:not(.sw-web-shell) .landing-after,',
    'html:not(.sw-web-shell) .hub-front, html:not(.sw-web-shell) .hub-sources, html:not(.sw-web-shell) .hub-footer-colophon, html:not(.sw-web-shell) .hub-footer-copy, html:not(.sw-web-shell) .shelf-foot,',
    'html:not(.sw-web-shell) .sw-chrome-print, html:not(.sw-web-shell) #safari-browser-tip { display: none !important; }',
    /* LISTEN IS IN THE APP'S ROW. The page's floating transport pill and
       its inline "Read aloud" bar above verse one would double it
       (translator, 2026-09-19: "the read aloud doesnt need to be there
       anymore since its in the footer"). The transport buttons stay in
       the DOM, hidden, because the player bar clicks them. */
    'html #ra-float, html .ra-bar { display: none !important; }',
    /* READING FOLDS THE MODE ROW. A scroll down puts sw-app-reading on
       <html> (WebShell.chromeHidden) and the page's own footer — the
       Interlinear · Hebrew · Dual · Translit · Nikkud row — slides out
       below the page's edge, where the app's row is; a scroll up brings
       it back. The row with Listen never moves. */
    'html #sw-reader-footer { transition: transform .22s ease !important; will-change: transform; }',
    'html.sw-app-reading #sw-reader-footer { transform: translateY(calc(100% + var(--sw-app-row-h, 0px) + 24px)) !important; pointer-events: none !important; }',
    '@media (prefers-reduced-motion: reduce) { html #sw-reader-footer { transition: none !important; } }',
    'html:not(.sw-web-shell) .hub-footer-contact a[href^="mailto:"] { display: none !important; }',
    /* 7. THE PAGE RUNS UNDER THE STATUS BAR, and the site measures its bar
       WITH that inset (site_chrome.js: --sw-chrome-h = bar.offsetHeight,
       and the bar pads by env(safe-area-inset-top)). Rules that then add
       env() again put the reading-progress line and the text-size
       popover a status bar too low and opened a blank band under the
       header. Here they are offset by the measured bar alone. */
    /* --sw-app-bar-h is the bar as drawn, inset included, measured by the
       script below with a ResizeObserver: on the phone the site's own
       --sw-chrome-h already carries the inset, on the iPad it is the
       stylesheet's static 56px, so neither can be trusted from here. */
    'html body.has-sw-chrome .page, html:has(link[href*="site_chrome.css"]) .page, html:has(link[href*="site_chrome.css"]) #main-content { padding-top: calc(var(--sw-app-bar-h, calc(var(--sw-chrome-h, 58px) + env(safe-area-inset-top, 0px))) + 8px) !important; }',
    'html body.has-sw-chrome.sw-chrome-reader .page, html body.has-sw-chrome.sw-chrome-reader #main-content { padding-top: calc(var(--sw-app-bar-h, calc(var(--sw-chrome-h, 58px) + env(safe-area-inset-top, 0px))) + 12px) !important; }',
    'html body.has-sw-chrome .page #main-content, html .page #main-content { padding-top: 0 !important; }',
    'html body.has-sw-chrome #reading-progress { top: var(--sw-app-bar-h, calc(var(--sw-chrome-h, 58px) + env(safe-area-inset-top, 0px))) !important; }',
    'html .sw-size-pop { top: calc(var(--sw-app-bar-h, calc(var(--sw-chrome-h, 58px) + env(safe-area-inset-top, 0px))) + 4px) !important; }',
    'html body.has-sw-chrome .dict-wrap { padding-top: calc(var(--sw-app-bar-h, calc(var(--sw-chrome-h, 58px) + env(safe-area-inset-top, 0px))) + 12px) !important; }',
    /* panels that slide in from the top of the glass leave the status bar its room */
    'html #glossary-panel, html #annotations-panel, html #rsc-panel { padding-top: calc(env(safe-area-inset-top, 0px) + 16px) !important; box-sizing: border-box !important; }',
    'html #nav-sidebar { padding-top: env(safe-area-inset-top, 0px) !important; box-sizing: border-box !important; }',
    /* THE CHAPTER ROW (shell_end.js, 11): above the modes, inside the band
       that folds; the site's own arrow style, the pill on the chrome. ONE set
       of chapter controls (user, 2026-09-20: "that footer has the same thing
       in the header no?"): where the shell draws the row (html.sw-app-chapter-row),
       the header's arrows go and its pill is the chapter's name, not a button
       -- the arrows stay in the DOM, hidden, because the row drives them and
       mirrors their labels. */
    'html.sw-app-chapter-row #sw-chrome-nav .nqd-nav-btn { display: none !important; }',
    'html.sw-app-chapter-row #sw-chrome-chapter { pointer-events: none !important; border-color: transparent !important; background: transparent !important; }',
    'html.sw-app-chapter-row #sw-chrome-chapter .sw-chrome-pill-caret { display: none !important; }',
    /* THE MODES LIVE IN SETTINGS (user, 2026-09-20): the footer is the
       chapter row alone; the five buttons stay in the DOM, hidden, because
       Settings drives the page's own switches through them. */
    'html.sw-app-modes-in-settings #sw-reader-footer .nqd-dock { display: none !important; }',
    'html.sw-app-modes-in-settings #sw-app-chapter-row { padding-bottom: max(6px, env(safe-area-inset-bottom, 0px)); }',
    'html #sw-reader-footer:has(#sw-app-chapter-row) { flex-direction: column !important; }',
    'html #sw-app-chapter-row { display: flex; align-items: stretch; gap: 8px; width: 100%; max-width: 960px; margin: 0 auto; box-sizing: border-box; direction: ltr;',
    '  padding: 6px max(8px, env(safe-area-inset-right, 0px)) 0 max(8px, env(safe-area-inset-left, 0px)); }',
    'html #sw-app-chapter-row .sw-app-arrow { flex: 0 0 auto !important; min-width: 64px !important; padding: 0 10px !important; gap: 5px; font: 500 15px/1 -apple-system, "SF Pro Text", system-ui, sans-serif; }',
    'html #sw-app-chapter-row .sw-app-arrow-n:empty { display: none; }',
    'html #sw-app-chapter-pill { flex: 1 1 auto; min-width: 0; min-height: 44px; margin: 0; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;',
    '  border: 1px solid color-mix(in srgb, var(--here-chrome) 50%, transparent); border-radius: 6px; background: transparent; color: var(--on-chrome, #F3EDE2);',
    '  font: 600 16px/1.2 "David Libre", serif; cursor: pointer; -webkit-tap-highlight-color: transparent; }',
    'html #sw-app-chapter-pill .sw-app-pill-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    'html #sw-app-chapter-pill .sw-app-pill-caret { color: var(--sw-gold, var(--here-chrome)); font-size: 12px; }',
    '@media (pointer: coarse) { html #sw-app-chapter-pill { min-height: 48px; } }',
    /* THE RETURN BANNER SITS ABOVE THE FOOTER AS DRAWN. The site pins it over
       --sw-footer-h; the footer with the chapter row is taller, so here it
       follows the measured height, and drops to the page's edge while the
       band is folded. */
    'html #sw-return { bottom: calc(var(--sw-reader-footer-h, 112px) + 10px) !important; transition: bottom .22s ease; }',
    'html.sw-app-reading #sw-return { bottom: max(10px, env(safe-area-inset-bottom, 0px)) !important; }',
    /* FULL HEIGHT UNDER FLOATING CHROME (user, 2026-09-20: "see how it
       optimizes the screen"). Where the shell says so (html.sw-app-row-overlay)
       its bottom row floats over the page, which runs to the bottom of the
       glass; the page's own footer is lifted above the row by the row's
       measured height (--sw-app-row-h, set by the shell), the page pads its
       end by both, and the Return banner rides above them. While the page is
       read aloud the footer slides down behind the player. */
    'html.sw-app-row-overlay #sw-reader-footer { bottom: var(--sw-app-row-h, 0px) !important; }',
    'html.sw-app-row-overlay #sw-app-chapter-row { padding-bottom: 6px !important; }',
    'html.sw-app-row-overlay .page, html.sw-app-row-overlay #main-content.page { padding-bottom: calc(var(--sw-reader-footer-h, 62px) + var(--sw-app-row-h, 0px) + 20px) !important; }',
    'html.sw-app-row-overlay #sw-return { bottom: calc(var(--sw-reader-footer-h, 62px) + var(--sw-app-row-h, 0px) + 10px) !important; }',
    'html.sw-app-row-overlay.sw-app-reading #sw-return { bottom: calc(var(--sw-app-row-h, 0px) + 10px) !important; }',
    /* listening: the player takes the row's place, so the chapter row goes
       all the way off — its own height AND the native overlay under it
       (user, 2026-09-20: "it doesnt collapse when its in reading mode") */
    'html.sw-app-row-overlay.sw-app-listening #sw-reader-footer { transform: translateY(calc(100% + var(--sw-app-row-h, 0px) + 24px)) !important; pointer-events: none !important; }',
    /* CLEAR CHROME: the header and the chapter row let the text show through,
       the way a scripture app's do. */
    /* -- as CAPSULES floating on the text, the way a scripture app draws
       them (user, 2026-09-20): the bar itself is transparent, its inner row
       a rounded capsule of the chrome over a blur; the footer the same,
       around the chapter row; circles for the buttons, no boxes. */
    'html.sw-app-clear .sw-top-bar { background: transparent !important; border: 0 !important; box-shadow: none !important; }',
    /* the capsule begins below the paper fade over the status bar (the
       #sw-app-statusbar rule below, 14px under the inset): with a top inset
       (the iPhone upright) 4px under it clears the fade's paper already;
       with none (Android, whose status bar is the shell's own; an iPhone on
       its side) it drops to the fade's end, or its top edge is lost in the
       paper (user, 2026-09-23: "the pill needs to be lower a tad bit") */
    'html.sw-app-clear .sw-top-bar-inner { display: flex !important; align-items: center; gap: 6px; margin: max(4px, calc(14px - env(safe-area-inset-top, 0px))) 12px 0; padding: 4px 6px; min-height: 52px; border-radius: 30px;',
    '  background: color-mix(in srgb, var(--chrome, #1B2A41) 60%, transparent) !important; -webkit-backdrop-filter: blur(22px) saturate(160%) brightness(.7); backdrop-filter: blur(22px) saturate(160%) brightness(.7); box-shadow: 0 6px 22px rgba(0,0,0,.18), inset 0 0 0 1px color-mix(in srgb, var(--on-chrome, #F3EDE2) 9%, transparent); }',
    'html.sw-app-clear #sw-chrome-nav { flex: 1 1 auto; display: flex; justify-content: center; min-width: 0; }',
    'html.sw-app-clear .sw-chrome-home img { width: 58px !important; height: 38px !important; }',
    'html.sw-app-clear #sw-app-more { width: 44px !important; height: 44px !important; min-width: 44px !important; min-height: 44px !important; padding: 0 !important; border: 0 !important; border-radius: 50% !important; background: color-mix(in srgb, var(--on-chrome, #F3EDE2) 14%, transparent) !important; }',
    'html.sw-app-clear #sw-reader-footer { background: transparent !important; border-top: 0 !important; box-shadow: none !important; }',
    'html.sw-app-clear #sw-app-chapter-row { margin: 0 12px 8px !important; padding: 5px 6px !important; width: auto !important; border-radius: 30px; gap: 6px;',
    '  background: color-mix(in srgb, var(--chrome, #1B2A41) 60%, transparent); -webkit-backdrop-filter: blur(22px) saturate(160%) brightness(.7); backdrop-filter: blur(22px) saturate(160%) brightness(.7); box-shadow: 0 -6px 22px rgba(0,0,0,.14), inset 0 0 0 1px color-mix(in srgb, var(--on-chrome, #F3EDE2) 9%, transparent); }',
    'html.sw-app-clear #sw-app-chapter-row .sw-app-arrow { border: 0 !important; border-radius: 22px !important; min-height: 44px !important; background: color-mix(in srgb, var(--on-chrome, #F3EDE2) 12%, transparent) !important; }',
    'html.sw-app-clear #sw-app-chapter-row .sw-app-arrow:disabled { background: transparent !important; }',
    'html.sw-app-clear #sw-app-chapter-pill { border: 0 !important; min-height: 44px !important; }',
    /* no Top floater in the app (user, 2026-09-20): it sat on the chapter
       row; a tap on the status bar scrolls to the top */
    'html.sw-app-clear #sw-totop { display: none !important; }',
    /* NO RETURN BANNER, NO PROGRESS LINE in the app (user, 2026-09-20: "take
       off the back to now i dont need that and the progression line on the
       top of every volume needs to be gone completely"). The site keeps both;
       the app's chrome is the header, the chapter row and the native row. */
    'html.sw-app-clear #sw-return { display: none !important; }',
    'html.sw-app-clear #reading-progress { display: none !important; }',
    /* the clock reads on the paper, not on scrolled text: a fade of the
       paper over the status bar, no band */
    'html.sw-app-clear #sw-app-statusbar { background: linear-gradient(to bottom, var(--paper, #FCFAF7) 55%, color-mix(in srgb, var(--paper, #FCFAF7) 0%, transparent)) !important; height: calc(env(safe-area-inset-top, 0px) + 14px); }',
    /* FULL SCREEN ON SCROLL (a Display option): reading folds the header
       too, up and away; a scroll up brings both back. */
    'html.sw-app-fullscreen .sw-top-bar { transition: transform .22s ease; }',
    'html.sw-app-fullscreen.sw-app-reading .sw-top-bar { transform: translateY(-110%) !important; }',
    '@media (prefers-reduced-motion: reduce) { html.sw-app-fullscreen .sw-top-bar { transition: none !important; } }',
    /* TWO MORE THEMES, cut from the dark one: Black (the OLED black a night
       reader wants) and Gray (a lifted charcoal). The page is in its dark
       theme; the shell adds the variant class and keeps it in
       sw-app-dark-variant so the class is back before the first paint. */
    'html.sw-app-theme-black body.dark-mode { --paper: #000000; --paper-2: #0A0A0A; --panel: #0A0A0A; --card: #141414; --chrome: #050810; --chrome-2: #000000; --chrome-line: #1C2230; --surface-1: #0F141C; }',
    'html.sw-app-theme-gray body.dark-mode { --paper: #2B2B2E; --paper-2: #343437; --panel: #343437; --card: #3C3C40; --ink: #F1ECE3; --ink-2: #C4BBAD; --ink-3: #A79E91; --chrome: #1C1D21; --chrome-2: #141518; --chrome-line: #33353B; --surface-1: #2F3036; }',
    /* THE HEADER IS MARK · TITLE · MORE (user, 2026-09-20: "see the three dots
       at the top"): the size and theme buttons fold into the shell's more
       menu, drawn by shell_end.js (12). */
    'html.sw-app-more #sw-chrome-size, html.sw-app-more #sw-chrome-dark, html.sw-app-more .sw-chrome-print { display: none !important; }',
    /* margin-left auto: the ⋯ keeps the bar's far end on the landing too, where
       the title is centred absolutely and nothing else fills the row */
    'html.sw-app-more #sw-app-more { min-width: 44px; min-height: 44px; margin: 0 0 0 auto; padding: 0 6px; border: 1px solid color-mix(in srgb, var(--here-chrome, #DDB768) 50%, transparent); border-radius: 6px; background: transparent; color: var(--on-chrome, #F3EDE2); font: 700 22px/1 -apple-system, system-ui, sans-serif; letter-spacing: 1px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }',
    /* and the status bar itself always sits on chrome, whatever is under it */
    'html #sw-app-statusbar { position: fixed; top: 0; left: 0; right: 0; height: env(safe-area-inset-top, 0px); background: var(--chrome, #1B2A41); z-index: 2147483646; pointer-events: none; }'
  ].join('\n');
  function node() {
    var s = document.getElementById('sw-app-shell');
    if (s) return s;
    s = document.createElement('style');
    s.id = 'sw-app-shell';
    s.textContent = CSS;
    return s;
  }
  function attach() {
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return false;
    if (!document.getElementById('sw-app-shell')) head.appendChild(node());
    return true;
  }
  if (!attach()) {
    var obs = new MutationObserver(function () { if (attach()) obs.disconnect(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.body) return;
    document.body.appendChild(node());
    if (!document.getElementById('sw-app-statusbar')) {
      var bar = document.createElement('div');
      bar.id = 'sw-app-statusbar';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
  });
})();
