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
    'html.sw-app-reading #sw-reader-footer { transform: translateY(100%) !important; pointer-events: none !important; }',
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
