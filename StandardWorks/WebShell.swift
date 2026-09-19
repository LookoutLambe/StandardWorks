import SwiftUI
import WebKit
import CoreText

/// ONE WEB VIEW, FIVE TABS.
///
/// The reader is the site's own pages in a single WKWebView; the app around
/// it is native SwiftUI — a bottom tab bar (Library · Read · Search · Notes ·
/// Settings) the way a scripture app has one. This object is what the two
/// halves share: the web view itself (made once by LocalSiteWebView and kept
/// here so switching tabs never reloads the book), the site's registry for
/// the native Library, the selected tab, and the few calls the native tabs
/// make into the page — open a chapter, run a search, list the notes, step
/// the text size. Every one of those goes through the page's own globals
/// (navTo, VerseSearch, NotesEngine, stepSize, swApplyTheme); the shell
/// never reimplements what the page already does.
@MainActor
final class WebShell: ObservableObject {
    enum Tab: Hashable { case library, read, search, notes, settings }

    @Published var tab: Tab = .read
    /// The Search tab's text, kept here so the tab keeps it across visits.
    @Published var searchQuery = ""
    @Published var searchPresented = false
    /// The theme the page is showing ("light", "sepia", "dark"), as last read
    /// by LocalSiteWebViewLogger.matchPaper, so the shell's own surfaces — the
    /// bottom band, the player, the native bars — are cut from the page's
    /// chrome in every theme.
    @Published var theme = "light"
    var dark: Bool { theme == "dark" }
    /// The page's palette for this theme (AppShell.Palette), as SwiftUI colours.
    var palette: AppShell.Palette { AppShell.palette(theme: theme) }
    var paper: Color { Color(palette.paper) }
    var panel: Color { Color(palette.panel) }
    var card: Color { Color(palette.card) }
    var ink: Color { Color(palette.ink) }
    var ink2: Color { Color(palette.ink2) }
    var ink3: Color { Color(palette.ink3) }
    var rule: Color { Color(palette.rule) }
    var here: Color { Color(palette.here) }
    var chrome: Color { Color(palette.chrome) }
    var onChrome: Color { Color(palette.onChrome) }
    var hereChrome: Color { Color(palette.hereChrome) }
    @Published private(set) var volumes: [Volume] = []
    /// Reading: a finger scrolled the page down. The page's mode row
    /// (Interlinear · Hebrew · Dual · Translit · Nikkud) collapses while this
    /// is set and pops back on a scroll up (translator, 2026-09-19); the
    /// shell's own row stays. Carried to the page as a class on <html>, which
    /// the app's injected stylesheet (AppShell) reads.
    @Published var chromeHidden = false {
        didSet { if chromeHidden != oldValue { run("document.documentElement.classList.toggle('sw-app-reading', \(chromeHidden));") } }
    }
    /// The Library's navigation stack, so a route can be pushed from outside a tap.
    @Published var libraryPath: [LibraryRoute] = []
    /// The chapter the page is showing, for the Read tab's own sense of place.
    @Published private(set) var whereLabel = ""
    /// Read-aloud (the site's read_aloud.js, Carmit through Web Speech): whether
    /// this page has it, whether it is speaking, and the speeds it offers.
    @Published private(set) var canListen = false
    @Published private(set) var listening = false
    @Published private(set) var listenPaused = false
    @Published private(set) var listenRates: [Double] = []
    @Published private(set) var listenRate: Double = 0
    private var listenTimer: Timer?

    let wwwDirectoryURL: URL
    /// The whole canon's verse index, loaded once in the background. See SearchIndex.
    let searchIndex: SearchIndex
    /// The web view's navigation delegate and speech bridge, owned here so the
    /// web view can exist before the Read tab is ever shown.
    let pageDelegate = LocalSiteWebViewLogger()
    private(set) var bomHashes: [String: String] = [:]
    var webView: WKWebView?
    private var scrollObservation: NSKeyValueObservation?
    private var lastOffset: CGFloat = 0

    init(www: URL) {
        wwwDirectoryURL = www
        searchIndex = SearchIndex(www: www)
        ShellTheme.registerFonts(www: www)
        volumes = LibraryRegistry.load(www: www)
        bomHashes = LibraryRegistry.bomHashes(www: www)
        var order: [String: Int] = [:], n = 0
        for v in volumes { for d in v.divisions { for b in d.books { if order[b.en] == nil { order[b.en] = n; n += 1 } } } }
        order["D&C"] = order["D&C"] ?? n   // the D&C's rows are "D&C 76:1", one book
        searchIndex.bookOrder = order
        // A first launch opens on the Library, the way a scripture app does;
        // every launch after that opens in the book (AppShell's boot redirect).
        if !UserDefaults.standard.bool(forKey: "shell.launchedBefore") {
            UserDefaults.standard.set(true, forKey: "shell.launchedBefore")
            tab = .library
        }
        // The reader loads from the first moment, whichever tab is showing.
        pageDelegate.shell = self
        let phone = UITraitCollection.current.userInterfaceStyle == .dark ? "dark" : "light"
        let choice = UserDefaults.standard.string(forKey: "shell.appearance") ?? "system"
        _ = LocalSiteWebView.makeWebView(shell: self, coordinator: pageDelegate,
                                         wantedTheme: ["light", "sepia", "dark"].contains(choice) ? choice : phone)
    }

    /// The page's own home mark, tapped in the app: not the website's landing
    /// page but the Library tab. Posted by the script in AppShell through
    /// the "swShell" message handler.
    func handle(message: [String: Any]) {
        switch message["op"] as? String {
        case "library": tab = .library
        // The page changed its theme (its own ◐ button): re-cut the shell's
        // chrome and the web view's paper to match, and make it the choice.
        case "theme":
            if let wv = webView { LocalSiteWebViewLogger.matchPaper(wv, shell: self) }
            if let t = message["theme"] as? String { adoptPageTheme(t) }
        default: break
        }
    }

    /// The page shows a theme. It is now the choice Settings shows — "Match
    /// phone" only while it is the phone's own scheme — and the theme the
    /// shell counts as already applied, so the next page load does not push
    /// an older choice back over it.
    private func adoptPageTheme(_ t: String) {
        guard ["light", "sepia", "dark"].contains(t) else { return }
        let store = UserDefaults.standard
        store.set(t, forKey: LocalSiteWebViewLogger.appliedThemeKey)
        let phone = ShellRoot.phoneIsDark ? "dark" : "light"
        let choice = store.string(forKey: "shell.appearance") ?? "system"
        let want = ["light", "sepia", "dark"].contains(choice) ? choice : phone
        if want != t { store.set(t, forKey: "shell.appearance") }
    }

    // MARK: - the page

    /// The web view is made by LocalSiteWebView; it hands it over here once.
    func adopt(_ wv: WKWebView) {
        guard webView !== wv else { return }
        webView = wv
        watchScroll(wv)
    }

    /// Runs JavaScript in the page and ignores the answer.
    func run(_ js: String) {
        webView?.evaluateJavaScript(js) { _, _ in }
    }

    /// Runs JavaScript that may `await`, and answers with its return value.
    func call(_ body: String, _ completion: @escaping (Any?) -> Void) {
        guard let wv = webView else { completion(nil); return }
        wv.callAsyncJavaScript(body, arguments: [:], in: nil, in: .page) { result in
            switch result {
            case .success(let v): completion(v)
            case .failure: completion(nil)
            }
        }
    }

    /// The Library tapped a chapter: the page shows it and the Read tab comes up.
    func open(volume: Volume, book: Book, chapter: Int) {
        let chapterId = book.chapterId(chapter)
        let hash = LibraryRegistry.hash(volume: volume.key, chapterId: chapterId, bomHashes: bomHashes)
        open(path: volume.page + "#" + hash)
    }

    /// A root-relative site path (bom/bom.html#1-nephi-3), the way the site's
    /// own links and its last-read record spell one.
    func open(path: String) {
        tab = .read
        guard let wv = webView else { return }
        let target = wwwDirectoryURL.appendingPathComponent(path.split(separator: "#").first.map(String.init) ?? path)
        let fragment = path.split(separator: "#").dropFirst().joined(separator: "#")
        let current = wv.url?.standardizedFileURL.path ?? ""
        if current == target.standardizedFileURL.path, !fragment.isEmpty {
            // Same page: a hash change is a chapter turn the page handles itself,
            // and it fires no didFinish — so the label is read back after it.
            run("location.hash = \(jsString("#" + fragment));")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in self?.refreshWhere() }
        } else {
            var comps = URLComponents(url: target, resolvingAgainstBaseURL: false)
            comps?.fragment = fragment.isEmpty ? nil : fragment
            if let u = comps?.url { wv.loadFileURL(u, allowingReadAccessTo: wwwDirectoryURL) }
        }
    }

    func stepTextSize(_ delta: Int) {
        run("window.stepSize && window.stepSize(\(delta));")
    }

    // MARK: - listen

    /// The Listen item in the tab row: play the chapter from the page's own
    /// reader (bringing the Read tab up if another was showing), or stop it.
    func toggleListen() {
        if tab != .read { tab = .read }
        guard canListen else { return }
        run("(function(){ var r = window.SWReadAloud; if (!r) return; if (r.playing) r.stop(); else r.play(); })();")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in self?.refreshListen() }
    }

    func setListenRate(_ rate: Double) {
        run("window.SWReadAloud && window.SWReadAloud.setRate(\(rate));")
        listenRate = rate
    }

    /// The player bar's controls drive the page's own transport (#ra-pause,
    /// #ra-back, #ra-fwd), which stays wired even while the app hides it.
    func pauseListen() { press("ra-pause") }
    func skipListen(back: Bool) { press(back ? "ra-back" : "ra-fwd") }
    func stopListen() {
        run("window.SWReadAloud && window.SWReadAloud.stop();")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in self?.refreshListen() }
    }
    private func press(_ id: String) {
        run("(function(){ var b = document.getElementById(\(jsString(id))); if (b) b.click(); })();")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in self?.refreshListen() }
    }

    /// The volume the page is showing, by its file, for the player's cover tile.
    var currentVolume: Volume? {
        guard let file = webView?.url?.lastPathComponent else { return nil }
        return volumes.first { ($0.page as NSString).lastPathComponent == file }
    }

    /// Asks the page whether reading aloud exists here and is running; while
    /// it runs, asks again every second so the button follows the voice.
    func refreshListen() {
        webView?.evaluateJavaScript("(function(){ var r = window.SWReadAloud; if (!r) return null; var p = document.getElementById('ra-pause'); return { on: !!r.playing, paused: !!(p && p.getAttribute('aria-pressed') === 'true'), rate: Number(r.rate) || 0, speeds: (r.speeds || []).map(Number) }; })()") { [weak self] v, _ in
            guard let self else { return }
            guard let d = v as? [String: Any] else {
                self.canListen = false; self.listening = false; self.listenTimer?.invalidate(); self.listenTimer = nil
                return
            }
            self.canListen = true
            let wasListening = self.listening
            self.listening = (d["on"] as? Bool) ?? false
            self.listenPaused = self.listening && ((d["paused"] as? Bool) ?? false)
            if wasListening != self.listening {
                // The page's own footer steps aside while the player is up (AppShell CSS).
                self.run("document.documentElement.classList.toggle('sw-app-listening', \(self.listening));")
            }
            self.listenRate = (d["rate"] as? Double) ?? self.listenRate
            if let sp = d["speeds"] as? [Double], !sp.isEmpty { self.listenRates = sp }
            if self.listening, self.listenTimer == nil {
                self.listenTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.refreshListen() }
            } else if !self.listening { self.listenTimer?.invalidate(); self.listenTimer = nil }
        }
    }

    // MARK: - chrome that gets out of the way

    /// Reading collapses the page's mode row; a scroll back up, or reaching
    /// the top, brings it back. Measured against the page's own scroll view,
    /// so a page that scrolls inside a panel does not move it.
    private func watchScroll(_ wv: WKWebView) {
        scrollObservation = wv.scrollView.observe(\.contentOffset, options: [.new]) { [weak self] sv, _ in
            guard let self else { return }
            let y = sv.contentOffset.y
            let dy = y - self.lastOffset
            self.lastOffset = y
            if y <= 40 { if self.chromeHidden { withAnimation { self.chromeHidden = false } }; return }
            // A finger, not the page: a chapter opened at a verse scrolls itself
            // there, and that must not fold the mode row before reading starts.
            guard sv.isDragging || sv.isDecelerating else { return }
            if abs(dy) < 6 { return }
            let hide = dy > 0
            if hide != self.chromeHidden {
                if UIAccessibility.isReduceMotionEnabled { self.chromeHidden = hide }
                else { withAnimation(.easeInOut(duration: 0.2)) { self.chromeHidden = hide } }
            }
        }
    }

    func pageSettled(_ wv: WKWebView) {
        lastOffset = wv.scrollView.contentOffset.y
        if chromeHidden { chromeHidden = false }
        refreshWhere()
        refreshListen()
    }

    func refreshWhere() {
        webView?.evaluateJavaScript("(document.getElementById('sw-chrome-chapter') || {}).textContent || ''") { [weak self] v, _ in
            self?.whereLabel = ((v as? String) ?? "").replacingOccurrences(of: "\u{25BE}", with: "").trimmingCharacters(in: .whitespaces)
        }
    }
}

func jsString(_ s: String) -> String {
    let data = try? JSONSerialization.data(withJSONObject: [s])
    let arr = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
    return String(arr.dropFirst().dropLast())
}

/// The native tabs wear the site's navy bar too: one chrome across the app,
/// and white status-bar text that reads on every tab (the status bar is
/// light app-wide for the reader's sake; a white native bar would have put
/// white on white).
struct ShellBar: ViewModifier {
    @EnvironmentObject var shell: WebShell
    func body(content: Content) -> some View {
        content
            .toolbarBackground(shell.chrome, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

/// A NATIVE PAGE ON THE READER'S PAPER. The list's ground is the site's
/// panel, its ink the site's ink, its accent the site's "here" (the mark on
/// paper — never the bar's gold, which is 2:1 on white), and the system's own
/// pieces (chevrons, menus, the empty state, the search field) go dark with
/// the Dark theme. So a Library row in Sepia is on sepia, and in Dark on the
/// dark card, exactly like the reader beside it.
struct ShellPage: ViewModifier {
    @EnvironmentObject var shell: WebShell
    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            .background(shell.panel.ignoresSafeArea())
            .foregroundStyle(shell.ink)
            .tint(shell.here)
            .environment(\.colorScheme, shell.dark ? .dark : .light)
    }
}
extension View {
    func shellBar() -> some View { modifier(ShellBar()) }
    func shellPage() -> some View { modifier(ShellPage()) }
    /// A list row (or a whole section of them) on the page's card, ruled in
    /// the page's rule colour.
    func shellRow(_ shell: WebShell) -> some View {
        listRowBackground(shell.card).listRowSeparatorTint(shell.rule)
    }
}

/// The site's palette and Hebrew face, for the native tabs — so a Library
/// row and a Hebrew name look like the page beside them.
enum ShellTheme {
    static let navy = Color(red: 0x1B / 255, green: 0x2A / 255, blue: 0x41 / 255)
    static let gold = Color(red: 0xC8 / 255, green: 0x9B / 255, blue: 0x3C / 255)

    private static var fontsRegistered = false
    private static var hebrewFamily = "David Libre"

    /// David Libre ships in www/fonts for the page; the native tabs register
    /// the same files with CoreText once, so their Hebrew is the page's.
    static func registerFonts(www: URL) {
        guard !fontsRegistered else { return }
        fontsRegistered = true
        let dir = www.appendingPathComponent("fonts")
        guard let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return }
        for f in files where ["ttf", "otf"].contains(f.pathExtension.lowercased()) && f.lastPathComponent.lowercased().contains("david") {
            CTFontManagerRegisterFontsForURL(f as CFURL, .process, nil)
        }
    }

    /// Scales with the reader's Dynamic Type setting, like the system text beside it.
    static func hebrew(_ size: CGFloat) -> Font {
        if UIFont(name: "DavidLibre-Regular", size: size) != nil { return .custom("DavidLibre-Regular", size: size, relativeTo: .body) }
        if UIFont(name: hebrewFamily, size: size) != nil { return .custom(hebrewFamily, size: size, relativeTo: .body) }
        return .system(size: size)
    }
}
