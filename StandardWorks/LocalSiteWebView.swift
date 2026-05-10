import SwiftUI
import WebKit

/// Serves bundled www/ files over app://localhost so fetch() and XHR work normally.
private class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    let wwwURL: URL

    init(wwwURL: URL) { self.wwwURL = wwwURL }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { task.didFailWithError(URLError(.badURL)); return }
        let path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let fileURL = wwwURL.appendingPathComponent(path)
        do {
            let data = try Data(contentsOf: fileURL)
            let mime = Self.mimeType(for: fileURL.pathExtension)
            let response = URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: "utf-8")
            task.didReceive(response)
            task.didReceive(data)
            task.didFinish()
        } catch {
            task.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html"
        case "css":  return "text/css"
        case "js":   return "application/javascript"
        case "json": return "application/json"
        case "png":  return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "svg":  return "image/svg+xml"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf":  return "font/ttf"
        default:     return "application/octet-stream"
        }
    }
}

struct LocalSiteWebView: UIViewRepresentable {
    let wwwDirectoryURL: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.preferredContentMode = .mobile
        config.setURLSchemeHandler(BundleSchemeHandler(wwwURL: wwwDirectoryURL), forURLScheme: "app")

        // Disable double-tap zoom and inject a reliable footer-toggle double-tap handler.
        // The built-in JS handler misses taps that land on word-popup elements (which are in its
        // ignore list), so we replace it with a simpler version that only requires the tap
        // to be outside the navigation/control chrome.
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
        let doubleTapUserScript = WKUserScript(
            source: doubleTapScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(doubleTapUserScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = true
        webView.backgroundColor = UIColor.systemBackground
        webView.scrollView.backgroundColor = UIColor.systemBackground
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
        webView.allowsBackForwardNavigationGestures = true

        webView.load(URLRequest(url: URL(string: "app://localhost/index.html")!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
