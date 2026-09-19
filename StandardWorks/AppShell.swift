import UIKit
import WebKit

/// THE APP'S OWN SURFACE OVER THE SITE.
///
/// One www folder serves sefermormon.com and this app, and the site does not
/// change for the app's sake (user, 2026-09-18: "do not change the website").
/// So everything that makes this an app rather than the website in a box
/// lives HERE, injected into the page from the shell as scripts and styles:
/// nothing in www knows about it, and sync-www.sh cannot sweep it away because
/// none of it is a file in www.
///
/// What the shell adds, and why, in the order a reader meets it:
///
///  1. It opens in the book. The site's landing is a home page — cover, verse
///     of the day, six cards, then prose about the edition, a store, a
///     copyright line. An app opens where you left off. The first load asks
///     for index.html with `?boot=1`; the document-start script sees that
///     flag, reads the page's own `sw-last-read` record, and replaces the
///     landing with that chapter before the landing can paint. Without a
///     record (first launch ever) the landing stays, trimmed by the styles
///     below to the cover and the six books.
///
///  2. The page fills the screen. ContentView lets the web view run under the
///     status bar and the home indicator; the site already pads its bars by
///     `env(safe-area-inset-*)`, which WebKit fills in because the viewport
///     script in LocalSiteWebView sets `viewport-fit=cover`. The navy bar
///     reaches the top of the glass and the status bar sits on it.
///
///  3. It follows the phone. The system's light/dark appearance is applied to
///     the page through its own `swApplyTheme` — once per change of the
///     system setting, never on every page, so a theme chosen by hand in the
///     app (sepia, say) stays until the phone itself changes.
///
///  4. No white frames. The web view's background is the page's paper, so a
///     page that has not painted yet shows paper, and the launch does not
///     flash white between the launch screen and the first page.
///
///  5. Website things stay on the website: the App Store card, the Android
///     invitation, the Safari home-screen tip, the store bag in the bar, the
///     landing's prose, the sources and the colophon.
///
///  6. The bar says what the App Store says: Sefer Mormon: Standard Works.
enum AppShell {

    /// The flag the shell puts on its very first request, and nothing else
    /// ever does: it is how the boot script tells a cold start from a reader
    /// who tapped the mark to come back to the landing on purpose.
    static let bootQuery = "boot=1"

    // MARK: - paper

    /// The page's own background per theme (reader.css --paper, sw_theme.css),
    /// so what shows through before and between pages is paper, not system
    /// white or system black.
    static func paper(theme: String) -> UIColor {
        switch theme {
        case "dark":  return UIColor(red: 0x14 / 255, green: 0x12 / 255, blue: 0x0F / 255, alpha: 1)
        case "sepia": return UIColor(red: 0xF4 / 255, green: 0xEA / 255, blue: 0xD8 / 255, alpha: 1)
        default:      return UIColor(red: 0xFC / 255, green: 0xFA / 255, blue: 0xF7 / 255, alpha: 1)
        }
    }

    // MARK: - scripts

    /// Applies a theme through the page's own switch. The page persists it,
    /// so it also survives into the next page and the next launch.
    static func applyThemeScript(dark: Bool) -> String {
        "window.swApplyTheme && window.swApplyTheme('\(dark ? "dark" : "light")');"
    }

    /// Asks the page which theme it is showing: "light", "sepia" or "dark".
    static let currentThemeScript =
        "(window.swCurrentTheme ? String(window.swCurrentTheme()) : (document.body && document.body.classList.contains('dark-mode') ? 'dark' : 'light'))"

    /// Document start, main frame only: the boot redirect, and the app-only
    /// stylesheet, attached the moment <head> exists.
    static let documentStartSource = """
    (function () {
      /* 1. OPEN IN THE BOOK. Only on the shell's first request (?boot=1), only
         on the landing, and only when the page has a record to go back to.
         The record is the page's own — nav_engine.js writes it on every
         chapter — and its path is root-relative (bom/bom.html#…), so
         replace() resolves it against index.html's folder: the www root. */
      try {
        if (/(^|[?&])boot=1(&|$)/.test(location.search) && /(^|\\/)index\\.html$/.test(location.pathname)) {
          var g = JSON.parse(localStorage.getItem('sw-last-read') || 'null');
          if (g && typeof g.path === 'string' && /^[A-Za-z0-9_\\/.-]+\\.html(#[^\\s]*)?$/.test(g.path)) {
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
        'html #sw-beta-invite, html .landing-app-store, html .landing-update-note, html .landing-after,',
        'html .hub-front, html .hub-sources, html .hub-footer-colophon, html .hub-footer-copy, html .shelf-foot,',
        'html .sw-chrome-print, html #safari-browser-tip { display: none !important; }',
        /* the app has its own Listen button; the page's floating transport pill would double it */
        'html #ra-float { display: none !important; }',
        /* LISTEN IN THE BAR, beside Aa and the theme toggle, where it covers no
           word in either orientation (a floating button sat on the last words
           of a row). Injected by the script below; gold while speaking. */
        'html body.sw-chrome-reader .sw-app-listen { grid-column: 5; }',
        /* narrower than the site's 44px so the chapter pill keeps its name; the tap area stays 44 tall and 38 wide */
        'html .sw-app-listen { min-width: 38px !important; padding: 6px 3px !important; }',
        'html .sw-app-listen svg { width: 20px; height: 20px; display: block; }',
        /* real gold and real navy: --sw-gold is a near-white in this bar */
        'html.sw-app-listening .sw-app-listen { background: #C89B3C !important; color: #1B2A41 !important; }',
        /* while the app's player is up, the page's bottom bar steps aside so
           the reader keeps its room: player + tab bar, as a scripture app has */
        'html.sw-app-listening .controls-bottom, html.sw-app-listening #sw-reader-footer { display: none !important; }',
        'html.sw-app-listening { --sw-footer-h: 0px !important; }',
        'html .hub-footer-contact a[href^="mailto:"] { display: none !important; }',
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
      ].join('\\n');
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
    """

    /// Document end, main frame only: the bar's English line is the App
    /// Store's name. The site builds its bar in site_chrome.js at load, so
    /// this waits for the span rather than assuming it.
    static let documentEndSource = """
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

      /* 9. LISTEN, in the bar. Only where the page can read aloud (SWReadAloud
         arrives with read_aloud.js, up to several seconds after the bar), and
         only with a native shell listening for the tap. */
      (function () {
        var port = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.swShell;
        if (!port) return;
        var tries = 0;
        var t = setInterval(function () {
          var bar = document.querySelector('.sw-top-bar-inner');
          var dark = document.getElementById('sw-chrome-dark');
          if (++tries > 300) { clearInterval(t); return; }
          if (!bar || !dark || !window.SWReadAloud) return;
          clearInterval(t);
          if (document.querySelector('.sw-app-listen')) return;
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'sw-chrome-btn sw-app-listen';
          b.setAttribute('aria-label', 'Listen');
          b.title = 'Listen';
          b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/>' +
            '<rect x="3.5" y="13" width="4.5" height="7" rx="1.6"/>' +
            '<rect x="16" y="13" width="4.5" height="7" rx="1.6"/></svg>';
          b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); port.postMessage({ op: 'listen' }); });
          dark.insertAdjacentElement('afterend', b);
        }, 100);
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
    """
}
