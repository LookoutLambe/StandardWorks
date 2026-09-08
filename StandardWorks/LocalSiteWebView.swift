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

        // Disable double-tap zoom. The footer-toggle handler that used to ride
        // along with it is gone: the footer is pinned (2026-09-08), and this
        // was a SECOND implementation of a gesture nav_engine.js already had —
        // the native copy kept firing against classes the web copy no longer
        // defines. touch-action stays, so a double-tap on a word does not zoom
        // the page out from under the tap that opens its card.
        let touchActionScript = """
        document.documentElement.style.touchAction = 'manipulation';
        """
        config.userContentController.addUserScript(WKUserScript(
            source: touchActionScript,
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
