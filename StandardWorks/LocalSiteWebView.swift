import SwiftUI
import WebKit
import UIKit

final class LocalSiteWebViewLogger: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    /// Set by the representable each update; the view decides what a settled
    /// page is worth, this class only reports one.
    var onPageSettled: () -> Void = {}

    /// Read aloud's route to the voice on Mac Catalyst, where the web view has
    /// no Web Speech API. Held here because AVSpeechSynthesizer keeps only a
    /// weak delegate, and the coordinator is what outlives makeUIView.
    let speech = SpeechBridge()

    /// The first didFinish of a launch is the app booting into index.html, not
    /// the reader choosing anything. Only what follows it counts.
    private var hasSettledOnce = false

    /// The phone's appearance as the representable last passed it in.
    var systemDark = false

    /// The shell that shares this web view with the native tabs.
    weak var shell: WebShell?

    /// Messages from the page's app-only scripts (AppShell): {op: "library"}.
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "swShell", let body = message.body as? [String: Any] else { return }
        shell?.handle(message: body)
    }

    /// The theme the shell last pushed into the page for the system's sake.
    /// Kept in UserDefaults so a launch does not re-push a setting the page
    /// already has — and so a theme the reader chose by hand in between
    /// (sepia) is left alone until the phone itself changes.
    private static let appliedSchemeKey = "shell.appliedSystemScheme"

    func applySystemThemeIfChanged(_ webView: WKWebView) {
        let want = systemDark ? "dark" : "light"
        let store = UserDefaults.standard
        guard store.string(forKey: Self.appliedSchemeKey) != want else { return }
        store.set(want, forKey: Self.appliedSchemeKey)
        webView.evaluateJavaScript(AppShell.applyThemeScript(dark: systemDark)) { _, _ in
            Self.matchPaper(webView)
        }
    }

    /// Paints the web view's own background with the page's current paper,
    /// so what shows before the next page paints is paper and not system
    /// white or black. See AppShell.
    static func matchPaper(_ webView: WKWebView) {
        webView.evaluateJavaScript(AppShell.currentThemeScript) { value, _ in
            let theme = (value as? String) ?? "light"
            let paper = AppShell.paper(theme: theme)
            webView.backgroundColor = paper
            webView.scrollView.backgroundColor = paper
            webView.underPageBackgroundColor = paper
        }
    }

    /// Anything that is not the bundled site belongs to the system, not to the
    /// reader. The site carries real outbound links — four Amazon editions, a
    /// Lulu hardcover, mailto: — and with no policy here WKWebView loaded them
    /// INSIDE the reader: the app navigated off its own bundle, and with
    /// allowsBackForwardNavigationGestures off there was no way back short of
    /// force-quitting it. mailto: did nothing at all.
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow); return
        }
        let scheme = url.scheme?.lowercased()
        if url.isFileURL || scheme == nil || scheme == "about" || scheme == "blob" || scheme == "data" {
            decisionHandler(.allow); return
        }
        decisionHandler(.cancel)
        UIApplication.shared.open(url)
    }

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
        applySystemThemeIfChanged(webView)
        LocalSiteWebViewLogger.matchPaper(webView)
        shell?.pageSettled(webView)
        if hasSettledOnce { onPageSettled() } else { hasSettledOnce = true }
    }
}

struct LocalSiteWebView: UIViewRepresentable {
    /// Owns the one web view once it exists; see WebShell.
    @ObservedObject var shell: WebShell
    /// The phone's appearance; applied to the page once per change. See AppShell.
    var systemDark: Bool = false
    var onPageSettled: () -> Void = {}

    private var wwwDirectoryURL: URL { shell.wwwDirectoryURL }

    func makeCoordinator() -> LocalSiteWebViewLogger { shell.pageDelegate }

    func makeUIView(context: Context) -> WKWebView {
        // The web view is made by the shell at launch (see makeWebView), so
        // the reader is already loading while the Library is browsed and a
        // chapter tapped there has somewhere to go. This representable only
        // seats it and keeps its delegate current.
        let webView = shell.webView ?? LocalSiteWebView.makeWebView(shell: shell, coordinator: context.coordinator,
                                                                    systemDark: systemDark)
        context.coordinator.shell = shell
        context.coordinator.onPageSettled = onPageSettled
        webView.navigationDelegate = context.coordinator
        return webView
    }

    /// Builds the one web view: its configuration, the injected scripts, the
    /// paper behind it, the first request. Called once, by WebShell.init.
    static func makeWebView(shell: WebShell, coordinator: LocalSiteWebViewLogger, systemDark: Bool) -> WKWebView {
        let wwwDirectoryURL = shell.wwwDirectoryURL
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.preferredContentMode = .mobile

        // Read aloud needs a speech engine. iOS has one in the web view; Mac
        // Catalyst does not, so the page gets a stand-in that speaks through
        // AVSpeechSynthesizer instead. The shim no-ops wherever the real API
        // exists, so this changes nothing on iOS. See SpeechBridge.
        config.userContentController.add(coordinator.speech,
                                         name: SpeechBridge.handlerName)
        config.userContentController.add(coordinator, name: "swShell")
        config.userContentController.addUserScript(WKUserScript(
            source: SpeechBridge.shimSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false))

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

        // The app's own surface over the site — the boot redirect, the
        // app-only styles, the bar's name. Main frame only: the page has no
        // frames that need them, and AppShell explains each one.
        config.userContentController.addUserScript(WKUserScript(
            source: AppShell.documentStartSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true))
        config.userContentController.addUserScript(WKUserScript(
            source: AppShell.documentEndSource,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true))

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = coordinator
        coordinator.speech.attach(to: webView)
        coordinator.shell = shell
        // Paper behind everything, never system white: the launch used to
        // flash white between the launch screen and the first page, and every
        // volume switch showed a white frame. The page's own paper instead,
        // re-matched to the page's theme after each load (matchPaper).
        let paper = AppShell.paper(theme: systemDark ? "dark" : "light")
        webView.isOpaque = false
        webView.backgroundColor = paper
        webView.scrollView.backgroundColor = paper
        webView.underPageBackgroundColor = paper
        // .never, because ContentView now runs the web view under the status
        // bar and the page pads its own bars by env(safe-area-inset-*): with
        // .automatic WebKit would add the status-bar height a second time.
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        coordinator.systemDark = systemDark
        LocalSiteWebView.pinLayoutScale(webView)
        // The horizontal swipe belongs to the page turn, not to history.
        // A Hebrew book's spine is on the right, so turning FORWARD drags
        // rightward — which is the very gesture iOS reads as "go back" when
        // it starts near the leading edge. With this on, a forward page turn
        // taken a little too close to the edge became a history pop instead,
        // landing on the last chapter VISITED rather than the next one.
        //
        // The reader is one WKWebView holding index.html for the whole
        // edition; every chapter is a pushState inside it, and the way back
        // is the sidebar, the footer arrows and Return — none of which this
        // gesture provides uniquely. Reading apps give horizontal swipe to
        // the page for the same reason.
        //
        // The turn itself stays in nav_engine.js. Do NOT add a native
        // recognizer for it: the double-tap handler that used to live here
        // was a second copy of a gesture the web already owned, and it kept
        // firing against classes the web copy no longer defined.
        webView.allowsBackForwardNavigationGestures = false

        var indexURL = wwwDirectoryURL.appendingPathComponent("index.html")
        // ?boot=1 marks the shell's first request: the boot script in AppShell
        // sends it straight to the last-read chapter. A file URL keeps its
        // query, and the page never reads one.
        if var parts = URLComponents(url: indexURL, resolvingAgainstBaseURL: false) {
            parts.query = AppShell.bootQuery
            if let u = parts.url { indexURL = u }
        }
        // loadFileURL is the App-Sandbox-friendly way to display bundled HTML.
        // allowingReadAccessTo must be the parent directory so the page can pull
        // in its CSS/JS/font/image siblings.
        webView.loadFileURL(indexURL, allowingReadAccessTo: wwwDirectoryURL)
        NSLog("[WebView] loading \(indexURL.path)")
        shell.adopt(webView)
        #if DEBUG
        DebugBridge.start(webView, shell: shell)
        #endif
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Re-bound every update: the closure captures the view's environment,
        // and makeCoordinator() only ever runs once.
        context.coordinator.onPageSettled = onPageSettled
        // The phone changed its appearance while the app was up.
        if context.coordinator.systemDark != systemDark {
            context.coordinator.systemDark = systemDark
            context.coordinator.applySystemThemeIfChanged(webView)
        }
    }

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

#if DEBUG
/// REMOTE CONTROL FOR DEBUG BUILDS ONLY — compiled out of Release, so it
/// never ships. The simulator's app container is an ordinary folder on the
/// Mac; a script there is evaluated in the page and its result written back
/// beside it. That is how the app is driven from the development session
/// when the Mac refuses the assistant assistive access for synthetic taps.
/// Commands: put JavaScript in Documents/shell_cmd.js; the answer appears in
/// Documents/shell_out.txt and the command file is removed.
enum DebugBridge {
    private static var timer: Timer?
    private static weak var webView: WKWebView?

    private static weak var shell: WebShell?

    static func start(_ wv: WKWebView, shell sh: WebShell) {
        webView = wv
        shell = sh
        guard timer == nil,
              let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        let cmd = docs.appendingPathComponent("shell_cmd.js")
        let out = docs.appendingPathComponent("shell_out.txt")
        NSLog("[DebugBridge] watching \(cmd.path)")
        timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { _ in
            guard let js = try? String(contentsOf: cmd, encoding: .utf8) else { return }
            try? FileManager.default.removeItem(at: cmd)
            // "@tab library", "@open bom/bom.html#alma-32", "@library bom 1ne", "@size 10":
            // the native side of the app, driven the same way.
            if js.hasPrefix("@") {
                let parts = js.dropFirst().split(separator: " ").map(String.init)
                var answer = "ok"
                if let sh = shell, let verb = parts.first {
                    switch verb {
                    case "tab":
                        let names: [String: WebShell.Tab] = ["library": .library, "read": .read, "search": .search, "notes": .notes, "settings": .settings]
                        if parts.count > 1, let t = names[parts[1]] { sh.tab = t } else { answer = "unknown tab" }
                    case "open":
                        if parts.count > 1 { sh.open(path: parts[1]) }
                    case "library":
                        sh.tab = .library
                        var path: [LibraryRoute] = []
                        if parts.count > 1 { path.append(.volume(parts[1])) }
                        if parts.count > 2 { path.append(.book(parts[1], parts[2])) }
                        sh.libraryPath = path
                    case "chapter":
                        // "@chapter bom 1ne 3": the Library's own tap path
                        if parts.count > 3, let n = Int(parts[3]),
                           let v = sh.volumes.first(where: { $0.key == parts[1] }),
                           let b = v.divisions.flatMap(\.books).first(where: { $0.id == parts[2] }) {
                            sh.open(volume: v, book: b, chapter: n)
                        } else { answer = "unknown chapter" }
                    case "type":
                        sh.searchQuery = parts.dropFirst().joined(separator: " ")
                        sh.searchPresented = true
                    case "search":
                        let q = parts.dropFirst().joined(separator: " ")
                        let hits = sh.searchIndex.find(q)
                        answer = "loaded=\(sh.searchIndex.loaded) hits=\(hits.count) " + hits.prefix(6).map { $0.row.ref + " [" + $0.volumeName + "] " + $0.path }.joined(separator: " | ")
                    case "listen":
                        sh.toggleListen()
                    case "pause":
                        sh.pauseListen()
                    case "skipback":
                        sh.skipListen(back: true)
                    case "stop":
                        sh.stopListen()
                    case "size":
                        sh.stepTextSize(Int(parts.count > 1 ? parts[1] : "10") ?? 10)
                    case "state":
                        answer = "tab=\(sh.tab) chromeHidden=\(sh.chromeHidden) where=\(sh.whereLabel) volumes=\(sh.volumes.count) path=\(sh.libraryPath) canListen=\(sh.canListen) listening=\(sh.listening) paused=\(sh.listenPaused) rate=\(sh.listenRate) rates=\(sh.listenRates)"
                    default:
                        answer = "unknown command"
                    }
                } else { answer = "no shell" }
                try? answer.write(to: out, atomically: true, encoding: .utf8)
                return
            }
            guard let wv = webView else { return }
            wv.evaluateJavaScript(js) { value, error in
                var text: String
                if let error { text = "ERROR " + error.localizedDescription }
                else if let value { text = (value as? String) ?? String(describing: value) }
                else { text = "undefined" }
                try? text.write(to: out, atomically: true, encoding: .utf8)
            }
        }
    }
}
#endif
