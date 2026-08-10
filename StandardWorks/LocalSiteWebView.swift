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

        // Disable double-tap zoom and inject a reliable footer-toggle double-tap handler.
        let doubleTapScript = """
        document.documentElement.style.touchAction = 'manipulation';
        (function() {
          var last = 0;
          var IGNORE = '.controls-top,.controls-bottom,#nav-sidebar,#nav-overlay,#word-popup,#word-popup-overlay,#xref-panel,[role="dialog"]';
          document.addEventListener('touchend', function(e) {
            var ct = e.changedTouches;
            if (!ct || ct.length !== 1) return;
            var el = e.target;
            if (el && el.closest && el.closest(IGNORE)) return;
            var now = Date.now();
            if (last && now - last < 500 && now - last > 30) {
              var hidden = document.body.classList.toggle('reader-footer-hidden');
              document.body.classList.toggle('hide-bottom-bar', hidden);
              try { localStorage.setItem('sw-reader-footer-hidden', hidden ? '1' : '0'); } catch(_) {}
              try { localStorage.setItem('bom-hide-bottom-bar', hidden ? '1' : '0'); } catch(_) {}
              try { window.dispatchEvent(new Event('resize')); } catch(_) {}
              last = 0;
            } else {
              last = now;
            }
          }, { passive: true, capture: true });
        })();
        """
        config.userContentController.addUserScript(WKUserScript(
            source: doubleTapScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false))

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = true
        webView.backgroundColor = UIColor.systemBackground
        webView.scrollView.backgroundColor = UIColor.systemBackground
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
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
}
