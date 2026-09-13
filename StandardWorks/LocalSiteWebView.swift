import SwiftUI
import WebKit

final class LocalSiteWebViewLogger: NSObject, WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        NSLog("[WebView] didFail: \(error.localizedDescription)")
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        NSLog("[WebView] didFailProvisional: \(error.localizedDescription)")
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        NSLog("[WebView] didFinish: \(webView.url?.absoluteString ?? "nil")")
        // A navigation rebuilds the scroll view's zoom state from the new
        // page's viewport, so the clamp has to be re-applied per page and not
        // once at construction. See pinLayoutScale for why.
        LocalSiteWebView.pinLayoutScale(webView)
    }
}

struct LocalSiteWebView: UIViewRepresentable {
    let wwwDirectoryURL: URL

    func makeCoordinator() -> LocalSiteWebViewLogger { LocalSiteWebViewLogger() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.preferredContentMode = .mobile

        // Force the page visible even if its own shell-ready signal never fires.
        let forceVisibleScript = """
        (function(){
          function mark(){
            try {
              document.documentElement.classList.add('sw-shell-ready');
              document.documentElement.classList.remove('sw-shell-pending');
            } catch(_){}
          }
          mark();
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mark);
          }
          setTimeout(mark, 0);
          setTimeout(mark, 300);
        })();
        """
        config.userContentController.addUserScript(WKUserScript(
            source: forceVisibleScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false))

        // Disable double-tap zoom. The footer-toggle handler that used to ride
        // along with it is gone: the footer is pinned (2026-09-08), and this
        // was a SECOND implementation of a gesture nav_engine.js already had —
        // the native copy kept firing against classes the web copy no longer
        // defines. touch-action stays, so a double-tap on a word does not zoom
        // the page out from under the tap that opens its card.
        // pan-y, not 'manipulation'. Both kill the double-tap zoom, but
        // 'manipulation' still permits a horizontal pan — and as an INLINE
        // style on <html> it outranks reader.css's rule, so the reading area
        // could be dragged sideways in the app while the web was fine. Zoom
        // is already pinned by min/maximumZoomScale below, so nothing is lost.
        let touchActionScript = """
        document.documentElement.style.touchAction = 'pan-y';
        """
        config.userContentController.addUserScript(WKUserScript(
            source: touchActionScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false))

        // Pinch-to-zoom off (2026-09-13). The reader sizes its own text with
        // A+/A-; a pinch shrank the whole layout inside the viewport instead,
        // which left a band of bare paper beside the column — on the LEFT,
        // because the Hebrew column is right-aligned — and no gesture in the
        // app put it back except pinching out again.
        //
        // scrollView.minimumZoomScale/maximumZoomScale alone did NOT hold it:
        // WKWebView derives its own zoom range from each page's viewport meta
        // and re-applies it on every navigation, overwriting whatever the
        // scroll view was set to at construction. The viewport is therefore
        // where the fix belongs, and the pages ship none of these keys:
        // `width=device-width, initial-scale=1, viewport-fit=cover`.
        //
        // This is a user script rather than an edit to the shipped HTML on
        // purpose: the same files serve sefermormon.com, where pinch-zoom is
        // an accessibility affordance (WCAG 1.4.4) and must stay. The app is
        // the only surface that has A+/A- as its replacement, so the app is
        // the only surface that clamps. `config.ignoresViewportScaleLimits`
        // is false by default, which is what makes WKWebView honour these.
        let viewportScript = """
        (function () {
          function clamp() {
            var head = document.head || document.getElementsByTagName('head')[0];
            if (!head) return false;
            var m = head.querySelector('meta[name="viewport"]');
            if (!m) {
              m = document.createElement('meta');
              m.setAttribute('name', 'viewport');
              m.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
              head.appendChild(m);
            }
            var c = m.getAttribute('content') || '';
            var parts = c.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
              .filter(function (s) { return !/^(user-scalable|minimum-scale|maximum-scale)\\s*=/i.test(s); });
            parts.push('minimum-scale=1', 'maximum-scale=1', 'user-scalable=no');
            m.setAttribute('content', parts.join(', '));
            return true;
          }
          if (!clamp()) {
            // documentStart can beat the parser to <head>; catch it the moment
            // it appears rather than waiting for DOMContentLoaded.
            var obs = new MutationObserver(function () { if (clamp()) obs.disconnect(); });
            obs.observe(document.documentElement, { childList: true, subtree: true });
          }
          document.addEventListener('DOMContentLoaded', clamp);
        })();
        """
        config.userContentController.addUserScript(WKUserScript(
            source: viewportScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false))

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = true
        webView.backgroundColor = UIColor.systemBackground
        webView.scrollView.backgroundColor = UIColor.systemBackground
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        LocalSiteWebView.pinLayoutScale(webView)
        webView.allowsBackForwardNavigationGestures = true

        let indexURL = wwwDirectoryURL.appendingPathComponent("index.html")
        // loadFileURL is the App-Sandbox-friendly way to display bundled HTML.
        // allowingReadAccessTo must be the parent directory so the page can pull
        // in its CSS/JS/font/image siblings.
        webView.loadFileURL(indexURL, allowingReadAccessTo: wwwDirectoryURL)
        NSLog("[WebView] loading \(indexURL.path)")
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    /// Hold the page at 1:1. The viewport user script is what actually stops
    /// WKWebView from offering a zoom range; these three are the native half,
    /// and they have to be re-set after every navigation because WKWebView
    /// rebuilds the scroll view's zoom state from each new page.
    ///
    /// `pinchGestureRecognizer` is the one that stops the gesture outright, so
    /// a page that rewrites its own viewport later cannot hand it back. Panning
    /// and long-press selection are separate recognizers and are untouched.
    static func pinLayoutScale(_ webView: WKWebView) {
        let scroll = webView.scrollView
        scroll.minimumZoomScale = 1.0
        scroll.maximumZoomScale = 1.0
        scroll.bouncesZoom = false
        scroll.pinchGestureRecognizer?.isEnabled = false
        if scroll.zoomScale != 1.0 { scroll.setZoomScale(1.0, animated: false) }
    }
}
