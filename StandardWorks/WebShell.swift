import SwiftUI
import WebKit
import CoreText
import AVFoundation
import MediaPlayer

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
    enum Tab: Hashable {
        case library, read, search, notes, settings
        /// what slides up over the book as a sheet (Search is a whole page;
        /// Library is a sheet only where the page has no drawer)
        var isSheet: Bool { self == .library || self == .notes || self == .settings }
    }

    @Published var tab: Tab = .read {
        // The Library marks the place and says "Continue reading": ask the
        // page where it is as the tab comes up, since a chapter turned by the
        // page's own arrows or a swipe fires no page load.
        didSet {
            if tab == .library, tab != oldValue { refreshWhere() }
            if tab != oldValue {
                // a panel opens at half height, over a closed drawer
                if tab != .read { panelDetent = .medium; closeDrawer() }
                updateStatusBar()
            }
        }
    }
    /// The Search tab's text, kept here so the tab keeps it across visits.
    @Published var searchQuery = ""
    @Published var searchPresented = false
    /// The theme the page is showing ("light", "sepia", "dark"), as last read
    /// by LocalSiteWebViewLogger.matchPaper, so the shell's own surfaces — the
    /// bottom band, the player, the native bars — are cut from the page's
    /// chrome in every theme.
    @Published var theme = "light" {
        didSet { if theme != oldValue { updateStatusBar() } }
    }
    var dark: Bool { theme == "dark" || AppShell.darkVariants.contains(theme) }
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
    /// The first page has finished loading: the launch splash may go.
    @Published private(set) var firstPageReady = false {
        didSet { if firstPageReady != oldValue { updateStatusBar() } }
    }
    @Published var chromeHidden = false {
        didSet { if chromeHidden != oldValue { run("document.documentElement.classList.toggle('sw-app-reading', \(chromeHidden));") } }
    }
    /// The Library's navigation stack, so a route can be pushed from outside a tap.
    @Published var libraryPath: [LibraryRoute] = []
    /// Bumped whenever the Library should show the WHOLE library again, opened
    /// at the reader's place (LibraryView expands that volume and scrolls to
    /// the book). The tab's own icon and a front-matter pill come here; only
    /// a book of chapters goes deeper.
    @Published var libraryFocus = 0
    /// The chapter the page is showing, for the Read tab's own sense of place.
    @Published private(set) var whereLabel = ""
    /// Where the page is, from its own last-read record — the volume key and
    /// the chapter id (`bom`, `ch3`) — so the Library can mark the place.
    @Published private(set) var currentVolumeKey = ""
    @Published private(set) var currentChapterId = ""
    /// That chapter is among the page's bookmarks (sw-bookmarks-v1): the
    /// row's Bookmark is filled.
    @Published private(set) var chapterBookmarked = false
    /// A site page shown in a sheet over the app (Settings' print and privacy
    /// pages): never loaded into the reader, which would take the book away.
    @Published var sheetPage: String?
    /// The reading modes the page is showing, as the page reports them
    /// ({op:'modes'} from app-shell/shell_end.js): the layout ("inter",
    /// "heb", "dual"), transliteration and vowel points. Settings shows and
    /// sets them; the footer no longer carries the five buttons in the app.
    @Published private(set) var readLayout = "inter"
    @Published private(set) var readTranslit = true
    @Published private(set) var readNikkud = true
    /// The reading size the page shows, 70…150 (its #sizeSlider).
    @Published private(set) var textSize = 100
    /// The header's ⋯ (app-shell/shell_end.js, 12) and what it opens. It
    /// opens at half height; dragged up to the top, the status bar sits on
    /// the black behind the card (updateStatusBar).
    @Published var showDisplayOptions = false {
        didSet {
            if !showDisplayOptions { displayOptionsDetent = .medium }
            updateStatusBar()
        }
    }
    @Published var displayOptionsDetent: PresentationDetent = .medium {
        didSet { if displayOptionsDetent != oldValue { updateStatusBar() } }
    }
    /// The height of the panel the row opened (Search, Notes, Settings).
    @Published var panelDetent: PresentationDetent = .medium {
        didSet { if panelDetent != oldValue { updateStatusBar() } }
    }
    @Published var shareURL: URL?
    /// The height of whatever floats over the page's bottom — the row, or the
    /// player — handed to the page as --sw-app-row-h so its own footer sits
    /// above it and its text ends clear of it (AppShell's stylesheet).
    @Published var bottomOverlay: CGFloat = 0 {
        didSet { if bottomOverlay != oldValue { pushOverlayHeight() } }
    }
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
        ShellTheme.registerFonts()
        volumes = LibraryRegistry.load(www: www)
        bomHashes = LibraryRegistry.bomHashes(www: www)
        var order: [String: Int] = [:], n = 0
        for v in volumes { for d in v.divisions { for b in d.books { if order[b.en] == nil { order[b.en] = n; n += 1 } } } }
        order["D&C"] = order["D&C"] ?? n   // the D&C's rows are "D&C 76:1", one book
        searchIndex.bookOrder = order
        // A first launch opens on the landing page, whose volumes are the
        // way in; every launch after that opens in the book (AppShell's boot
        // redirect). It opened on the native Library until 2026-09-23, when
        // the Library became the page's own drawer again.
        // The reader loads from the first moment, whichever tab is showing.
        pageDelegate.shell = self
        let phone = UITraitCollection.current.userInterfaceStyle == .dark ? "dark" : "light"
        let choice = UserDefaults.standard.string(forKey: "shell.appearance") ?? "system"
        _ = LocalSiteWebView.makeWebView(shell: self, coordinator: pageDelegate,
                                         wantedTheme: ["light", "sepia", "dark"].contains(choice) ? choice : phone)
    }

    /// What the shared scripts post through the "swShell" message handler.
    func handle(message: [String: Any]) {
        switch message["op"] as? String {
        // the page turned a chapter by itself (shell_end.js, 13)
        case "place": refreshWhere()
        // The page's chapter pill, tapped in the app: the native Library at
        // this book's chapters — one contents, not two (app-shell/shell_end.js, 10).
        case "chapters":
            openChapters(volumeKey: (message["volume"] as? String) ?? "", chapterId: (message["chapter"] as? String) ?? "")
        case "modes":
            if let l = message["layout"] as? String { readLayout = l }
            if let t = message["translit"] as? Bool { readTranslit = t }
            if let n = message["nikkud"] as? Bool { readNikkud = n }
        case "more": showDisplayOptions = true      // the header's ⋯ opens Display Options itself, the way a scripture app's does
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
        let want = ["light", "sepia", "dark"].contains(choice) ? choice : (AppShell.darkVariants.contains(choice) ? "dark" : phone)
        if want != t { store.set(t, forKey: "shell.appearance") }
    }

    /// "Full screen on scroll": the header folds with the chapter row while
    /// reading. Stored by the shell, carried to the page as a class.
    var fullScreenOnScroll: Bool {
        get { UserDefaults.standard.bool(forKey: "shell.fullScreenOnScroll") }
        set {
            UserDefaults.standard.set(newValue, forKey: "shell.fullScreenOnScroll")
            objectWillChange.send()
            pushFullScreen()
        }
    }
    private func pushFullScreen() {
        run("document.documentElement.classList.toggle('sw-app-fullscreen', \(fullScreenOnScroll));")
    }

    /// THE CLOCK READS ON WHAT IS UNDER IT (user, 2026-09-23: "the clock goes
    /// to white on white and white on beige"). The status bar is the app's own
    /// (Info.plist: not view-controller based, launched light for the navy
    /// launch screen), and it was white everywhere — right on the navy bars it
    /// was made for, wrong since the reader's header became a clear capsule
    /// and the page's paper runs up under the clock (html.sw-app-clear). So:
    /// ink over the reader's Light and Sepia paper; white over the navy native
    /// pages, the dark themes, the launch logo, and a sheet open to the top.
    /// iOS 27 picks the colour from the content by itself; before it, only the
    /// app-level setter reaches a status bar that is not view-controller based
    /// (the view-controller route needs a hosting controller of our own, and
    /// that made SwiftUI open a second window — see StandardWorksApp.swift).
    private var statusBarInk: Bool?
    func updateStatusBar() {
        let sheetAtTop = (showDisplayOptions && displayOptionsDetent == .large) || (tab.isSheet && panelDetent == .large)
        // Search is a whole page with a navy bar at the top
        let ink = firstPageReady && !dark && !sheetAtTop && tab != .search
        guard ink != statusBarInk else { return }
        statusBarInk = ink
        UIApplication.shared.setStatusBarStyle(ink ? .darkContent : .lightContent, animated: true)
    }

    private func pushOverlayHeight() {
        run("document.documentElement.style.setProperty('--sw-app-row-h', '\(Int(bottomOverlay.rounded()))px'); window.dispatchEvent(new Event('resize'));")
    }

    /// The page's reading size, through its own setter (which persists it per volume).
    func setTextSize(_ n: Int) {
        let v = max(70, min(150, n))
        textSize = v
        run("(function (v) { var s = document.getElementById('sizeSlider'); if (s) s.value = v; if (window.setSize) window.setSize(v); })(\(v));")
    }

    /// The chapter's address on the website, for sharing.
    var currentSiteURL: URL? {
        guard let wv = webView, let u = wv.url else { return nil }
        let rel = u.path.replacingOccurrences(of: wwwDirectoryURL.path, with: "").trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        var s = "https://sefermormon.com/" + rel
        if let f = u.fragment, !f.isEmpty { s += "#" + f }
        return URL(string: s)
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

    /// The chapter pill's destination: the Library pushed to this volume and,
    /// for a book of chapters, to its chapter grid, where the current chapter
    /// is marked (Library.swift). A front-matter piece or a one-chapter book
    /// stops at the book list.
    func openChapters(volumeKey: String, chapterId: String) {
        if !volumeKey.isEmpty { currentVolumeKey = volumeKey }       // the page's own word for where it is
        if !chapterId.isEmpty { currentChapterId = chapterId }
        // the page's own drawer at this book's chapters, sliding in beside
        // the text; the native grid only where the page has no drawer
        tab = .read
        // (the site's own pill does exactly this: site_chrome.js, openBooks)
        call("if (window.NavEngine && NavEngine.openBooks) { NavEngine.openBooks(); return true; } return false;") { [weak self] v in
            guard let self, (v as? Bool) != true else { return }
            self.openNativeChapters(volumeKey: volumeKey, chapterId: chapterId)
        }
    }
    private func openNativeChapters(volumeKey: String, chapterId: String) {
        guard let v = volumes.first(where: { $0.key == volumeKey }) else { openNativeLibrary(); return }
        // one level deep, never two: Back from the chapter grid is the whole
        // library, opened at this book (user, 2026-09-20: "it stays on the
        // current book not the full thing")
        if let b = book(in: v, chapterId: chapterId), !b.isFrontMatter, b.ch > 1 { libraryPath = [.book(v.key, b.id)] }
        else { libraryPath = [] }
        libraryFocus += 1
        tab = .library
    }

    /// THE LIBRARY IS THE PAGE'S OWN DRAWER (user, 2026-09-23, with
    /// screenshots of it: "original design, the 5th picture isnt what i
    /// wanted"): it slides in from the side at the reader's volume, the text
    /// still in view beside it, with its own search, volume tabs and chapter
    /// grids. The native Library is kept for a page with no drawer (the JST).
    func showLibrary() {
        tab = .read
        call("if (window.NavEngine && NavEngine.open) { NavEngine.open(); return true; } return false;") { [weak self] v in
            guard let self, (v as? Bool) != true else { return }
            self.openNativeLibrary()
        }
    }
    private func openNativeLibrary() {
        libraryPath = []
        libraryFocus += 1
        tab = .library
    }
    /// Closes the page's drawer, if it is open.
    func closeDrawer() {
        run("window.NavEngine && NavEngine.close && NavEngine.close();")
    }

    /// The book a chapter id belongs to: front matter by its exact id, else
    /// the longest prefix whose remainder is one of the book's chapter numbers
    /// (`ch3` is 1 Nephi's, `al-ch32` Alma's, never 1 Nephi's `ch`).
    func book(in v: Volume, chapterId: String) -> Book? {
        let books = v.divisions.flatMap(\.books)
        if let f = books.first(where: { $0.isFrontMatter && $0.prefix == chapterId }) { return f }
        return books
            .filter { b in
                guard !b.isFrontMatter, chapterId.hasPrefix(b.prefix), let n = Int(chapterId.dropFirst(b.prefix.count)) else { return false }
                return n >= 1 && n <= max(b.ch, 1)
            }
            .max { $0.prefix.count < $1.prefix.count }
    }

    /// A site page in a sheet (SettingsView): the reader stays where it is.
    func presentPage(_ path: String) { sheetPage = path }

    /// Settings' reading switches, applied through the page's own (the page
    /// then reports the result back, which is what Settings shows).
    func setReading(layout: String, translit: Bool, nikkud: Bool) {
        readLayout = layout; readTranslit = translit; readNikkud = nikkud
        run("window.__swSetReading && window.__swSetReading({ layout: \(jsString(layout)), translit: \(translit), nikkud: \(nikkud) });")
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
            guard let u = comps?.url else { return }
            // A page load: mark the way back first, and only then leave — the
            // script must have run before the page it runs in is gone.
            wv.evaluateJavaScript(returnPointScript(to: path)) { _, _ in
                wv.loadFileURL(u, allowingReadAccessTo: self.wwwDirectoryURL)
            }
        }
    }

    /// A WAY BACK FROM EVERY JUMP THE SHELL MAKES. A jump inside one page marks
    /// its own return point (nav_engine.js's navTo hook: any non-linear move
    /// shows "← Back to …"); a jump to ANOTHER volume is a page load, and only
    /// a study-panel reference used to mark one before leaving, so a Search hit
    /// or a Note in another volume offered no way home. This writes the very
    /// record the destination page reads on arrival (`sw-return-v1`: `from` is
    /// the place the page's last-read record and bookmark say, `to` the
    /// destination in that page's own chapter ids), and nothing when the jump
    /// lands where the reader already is. The script answers "" so the caller
    /// can load once it has run.
    private func returnPointScript(to path: String) -> String {
        let file = path.split(separator: "#").first.map(String.init) ?? path
        let fragment = path.split(separator: "#").dropFirst().joined(separator: "#")
        guard !fragment.isEmpty,
              let dest = volumes.first(where: { ($0.page as NSString).lastPathComponent == (file as NSString).lastPathComponent }) else { return "''" }
        let head = fragment.split(whereSeparator: { $0 == ":" || $0 == "&" }).first.map(String.init) ?? fragment
        var chapterId = head
        if dest.key == "bom" {
            // the friendly hash back to the page's id: alma-32 → al-ch32 (BOM_HASHES reversed, longest stem first)
            for (prefix, stem) in bomHashes.sorted(by: { $0.value.count > $1.value.count }) where head.hasPrefix(stem) {
                chapterId = prefix + head.dropFirst(stem.count)
                break
            }
        }
        return """
        (function (to) { try {
          var g = JSON.parse(localStorage.getItem('sw-last-read') || 'null');
          if (!g || !g.volume || !g.chapter) return '';
          if (g.volume === to.volume && g.chapter === to.chapter) return '';
          var v = 0;
          try { var d = JSON.parse(localStorage.getItem('sw-last-read-' + g.volume) || 'null'); if (d && d.chapter === g.chapter && d.verse) v = parseInt(d.verse, 10) || 0; } catch (e) {}
          if (!v && window.NavEngine && NavEngine.currentVerseNum) { try { v = NavEngine.currentVerseNum() || 0; } catch (e) {} }
          localStorage.setItem('sw-return-v1', JSON.stringify({ from: { volume: g.volume, chapter: g.chapter, verse: v, label: String(g.label || '') + (v ? ':' + v : '') }, to: to, at: Date.now() }));
        } catch (e) {} return ''; })({ volume: \(jsString(dest.key)), chapter: \(jsString(chapterId)) });
        """
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
        // the session is playback BEFORE the first word, so the voice is
        // already on a background-capable session when the phone locks
        let start = "(function(){ var r = window.SWReadAloud; if (!r) return; if (r.playing) r.stop(); else r.play(); })();"
        if listening {
            run(start)
        } else {
            wireRemoteCommands()
            audioSession(active: true) { [weak self] in self?.run(start) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in self?.refreshListen() }
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

    // MARK: - the voice keeps going with the phone locked

    /// THE READ-ALOUD IS THE PAGE'S OWN speechSynthesis, which WebKit voices
    /// from this process — so it follows this app's audio session. A playback
    /// session plus the `audio` background mode (Info.plist) keeps the app,
    /// and the voice, running when the phone locks or another app comes up
    /// (user, 2026-09-20: "when i close my phone i need it to continue to
    /// read and stay active"). Spoken-audio mode ducks nothing and pauses for
    /// interruptions like a podcast player would.
    private static let audioQueue = DispatchQueue(label: "shell.audio-session")
    private func audioSession(active: Bool, then: (() -> Void)? = nil) {
        // off the main thread: activating a session can block (a runtime
        // fault, "AVAudioSession Hang Risk", flagged the main-thread call)
        WebShell.audioQueue.async {
            let s = AVAudioSession.sharedInstance()
            do {
                if active {
                    try s.setCategory(.playback, mode: .spokenAudio, options: [])
                    try s.setActive(true)
                } else {
                    try s.setActive(false, options: .notifyOthersOnDeactivation)
                }
            } catch { NSLog("[shell] audio session \(active ? "on" : "off"): \(error)") }
            if let then { DispatchQueue.main.async(execute: then) }
        }
    }

    /// The lock screen and the earbuds drive the same transport the player
    /// bar does: play/pause, ±10 s, stop.
    private var remoteCommandsWired = false
    private func wireRemoteCommands() {
        guard !remoteCommandsWired else { return }
        remoteCommandsWired = true
        UIApplication.shared.beginReceivingRemoteControlEvents()
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.addTarget { [weak self] _ in
            guard let self, self.listening else { return .noActionableNowPlayingItem }
            if self.listenPaused { self.pauseListen() }
            return .success
        }
        c.pauseCommand.addTarget { [weak self] _ in
            guard let self, self.listening else { return .noActionableNowPlayingItem }
            if !self.listenPaused { self.pauseListen() }
            return .success
        }
        c.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self, self.listening else { return .noActionableNowPlayingItem }
            self.pauseListen()
            return .success
        }
        c.stopCommand.addTarget { [weak self] _ in self?.stopListen(); return .success }
        c.skipBackwardCommand.preferredIntervals = [10]
        c.skipBackwardCommand.addTarget { [weak self] _ in self?.skipListen(back: true); return .success }
        c.skipForwardCommand.preferredIntervals = [10]
        c.skipForwardCommand.addTarget { [weak self] _ in self?.skipListen(back: false); return .success }
        c.nextTrackCommand.isEnabled = false
        c.previousTrackCommand.isEnabled = false
    }

    /// What the lock screen shows: the chapter, the volume, the app's logo.
    private func updateNowPlaying() {
        let center = MPNowPlayingInfoCenter.default()
        guard listening else { center.nowPlayingInfo = nil; return }
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: whereLabel.isEmpty ? "Sefer Mormon" : whereLabel,
            MPMediaItemPropertyArtist: currentVolume?.name ?? "Sefer Mormon: Standard Works",
            MPNowPlayingInfoPropertyPlaybackRate: listenPaused ? 0.0 : 1.0,
            MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
        ]
        if let img = UIImage(named: "LaunchLogo") {
            info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: img.size) { _ in img }
        }
        center.nowPlayingInfo = info
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
                self.audioSession(active: self.listening)
                if self.listening { self.wireRemoteCommands() }
            }
            if self.listening || wasListening { self.updateNowPlaying() }
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
        if !firstPageReady {
            // The boot request (index.html?boot=1) finishes BEFORE the chapter
            // it redirects to (measured: didFinish for both, half a second
            // apart), so it only counts as the first page when there is no
            // record to redirect to — the landing is then the page.
            if (wv.url?.query ?? "").contains(AppShell.bootQuery) {
                wv.evaluateJavaScript("!!localStorage.getItem('sw-last-read')") { [weak self] v, _ in
                    if (v as? Bool) != true { self?.firstPageReady = true }
                }
            } else {
                firstPageReady = true
            }
        }
        lastOffset = wv.scrollView.contentOffset.y
        if chromeHidden { chromeHidden = false }
        pushOverlayHeight()
        pushFullScreen()
        refreshWhere()
        refreshListen()
        wv.evaluateJavaScript("(function(){ var s = document.getElementById('sizeSlider'); var p = document.getElementById('page'); var v = s ? parseInt(s.value, 10) : NaN; if (isNaN(v) && p) v = parseInt(p.style.fontSize, 10); return isNaN(v) ? 100 : v; })()") { [weak self] v, _ in
            if let n = v as? Int { self?.textSize = n } else if let d = v as? Double { self?.textSize = Int(d) }
        }
    }

    func refreshWhere() {
        webView?.evaluateJavaScript("(document.getElementById('sw-chrome-chapter') || {}).textContent || ''") { [weak self] v, _ in
            self?.whereLabel = ((v as? String) ?? "").replacingOccurrences(of: "\u{25BE}", with: "").trimmingCharacters(in: .whitespaces)
        }
        // and the place itself, as the page records it on every chapter
        webView?.evaluateJavaScript("(function(){ try { var g = JSON.parse(localStorage.getItem('sw-last-read') || 'null'); if (!g || !g.volume || !g.chapter) return null; var b = JSON.parse(localStorage.getItem('sw-bookmarks-v1') || '[]') || []; var on = b.some(function (x) { return x && x.volume === g.volume && x.chapter === g.chapter; }); return [String(g.volume), String(g.chapter), on ? '1' : '0']; } catch (e) { return null; } })()") { [weak self] v, _ in
            guard let self, let a = v as? [String], a.count == 3 else { return }
            if a[0] != self.currentVolumeKey { self.currentVolumeKey = a[0] }
            if a[1] != self.currentChapterId { self.currentChapterId = a[1] }
            if (a[2] == "1") != self.chapterBookmarked { self.chapterBookmarked = a[2] == "1" }
        }
    }

    /// THE ROW'S BOOKMARK (user, 2026-09-23: "can the 6 panel tool add a 7th
    /// as bookmark?"): the reader's chapter into the page's own bookmarks —
    /// the study panel's Add (#xref-bm-add), which files it with its label
    /// and Hebrew name — or out of them on a second tap. The Notes tab lists
    /// them. Nothing to bookmark on a page with no chapter (the landing).
    var canBookmark: Bool { !whereLabel.isEmpty && !currentChapterId.isEmpty }
    func toggleBookmark() {
        guard canBookmark else { return }
        if chapterBookmarked {
            run("(function (v, c) { try { var k = 'sw-bookmarks-v1'; var l = JSON.parse(localStorage.getItem(k) || '[]') || []; localStorage.setItem(k, JSON.stringify(l.filter(function (b) { return !(b && b.volume === v && b.chapter === c); }))); if (window.NavEngine && NavEngine.refreshBookmarksUI) NavEngine.refreshBookmarksUI(); } catch (e) {} })(\(jsString(currentVolumeKey)), \(jsString(currentChapterId)));")
        } else {
            run("(function(){ var b = document.getElementById('xref-bm-add'); if (b) b.click(); })();")
        }
        chapterBookmarked.toggle()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in self?.refreshWhere() }
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
    let title: String
    /// a sheet's root: no back button to strip, and the editor role would draw one
    var sheet = false
    /// the root of a panel the row opened (Notes, Settings, the drawerless
    /// Library): a close button that puts the book back in front
    var closesPanel = false
    func body(content: Content) -> some View {
        content
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            // the title in the one face, drawn here: SwiftUI's own bar title and
            // back-button label keep the system face whatever the appearance
            // says (tried 2026-09-23), so the title is ours and a back button
            // is its arrow alone
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text(title).font(ShellTheme.text(.headline, weight: .semibold)).foregroundStyle(shell.onChrome)
                        .lineLimit(1).accessibilityAddTraits(.isHeader)
                }
                if closesPanel {
                    ToolbarItem(placement: .confirmationAction) {
                        Button { shell.tab = .read } label: { Image(systemName: "xmark.circle.fill").font(.title3) }
                            .accessibilityLabel("Close")
                    }
                }
            }
            .toolbarRole(sheet || closesPanel ? .automatic : .editor)
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
    /// true for a page the floating row covers (Search); a sheet slides over the row
    var clearOfRow = false
    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            // THE LAST ROWS SCROLL CLEAR OF THE FLOATING ROW on a page it
            // covers (Search): the row's inset never reached a page under it,
            // and a list's last line stayed behind the capsule (2026-09-23).
            // A sheet slides over the row and needs none.
            .contentMargins(.bottom, clearOfRow ? shell.bottomOverlay : 0, for: .scrollContent)
            .background(shell.panel.ignoresSafeArea())
            .foregroundStyle(shell.ink)
            .tint(shell.here)
            .environment(\.colorScheme, shell.dark ? .dark : .light)
    }
}
extension View {
    func shellBar(_ title: String, sheet: Bool = false, closesPanel: Bool = false) -> some View {
        modifier(ShellBar(title: title, sheet: sheet, closesPanel: closesPanel))
    }
    func shellPage(clearOfRow: Bool = false) -> some View { modifier(ShellPage(clearOfRow: clearOfRow)) }
    /// A list row (or a whole section of them) on the page's card, ruled in
    /// the page's rule colour.
    func shellRow(_ shell: WebShell) -> some View {
        listRowBackground(shell.card).listRowSeparatorTint(shell.rule)
    }
}

/// The site's palette and its one face, for the native tabs — so a Library
/// row and a Hebrew name look like the page beside them.
enum ShellTheme {
    static let navy = Color(red: 0x1B / 255, green: 0x2A / 255, blue: 0x41 / 255)
    static let gold = Color(red: 0xC8 / 255, green: 0x9B / 255, blue: 0x3C / 255)

    private static var fontsRegistered = false

    /// David Libre is registered with CoreText once, from the TrueType files
    /// in the bundle's app-shell/fonts. NOT from www/fonts: the site
    /// self-hosts the face as woff2 (fonts/david_libre.css), which CoreText
    /// cannot load, so for as long as this read www every native Hebrew name
    /// quietly fell back to the system face (found 2026-09-23).
    static func registerFonts() {
        guard !fontsRegistered else { return }
        fontsRegistered = true
        guard let dir = Bundle.main.url(forResource: "fonts", withExtension: nil, subdirectory: "app-shell"),
              let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else {
            NSLog("[shell] app-shell/fonts is missing: the native text falls back to the system face")
            return
        }
        for f in files where ["ttf", "otf"].contains(f.pathExtension.lowercased()) {
            CTFontManagerRegisterFontsForURL(f as CFURL, .process, nil)
        }
        applyAppearance()
    }

    /// ONE FONT, DAVID LIBRE ONLY — the site's rule since 2026-09-01, and the
    /// app's (user, 2026-09-23: "everything is to be david font.... not
    /// everything is david font"). Every native Text takes its face from
    /// here: a text style's size, scaling with Dynamic Type like the system
    /// text it replaces, a little larger because David Libre's letters sit
    /// lower (x-height 0.48 em against the system face's 0.52). Weights: the
    /// face ships 400, 500 and 700, so semibold and heavier take the bold.
    /// SF Symbols keep the system font: they are icons, sized by it.
    static func text(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .custom(faceName(weight), size: baseSize(style), relativeTo: style)
    }
    static func uiFont(_ size: CGFloat, weight: Font.Weight = .regular) -> UIFont {
        UIFont(name: faceName(weight), size: size) ?? .systemFont(ofSize: size)
    }
    private static func faceName(_ w: Font.Weight) -> String {
        switch w {
        case .semibold, .bold, .heavy, .black: return "DavidLibre-Bold"
        case .medium: return "DavidLibre-Medium"
        default: return "DavidLibre-Regular"
        }
    }
    /// The system sizes at the default text size, scaled for the face.
    private static func baseSize(_ style: Font.TextStyle) -> CGFloat {
        let system: CGFloat
        switch style {
        case .largeTitle: system = 34
        case .title: system = 28
        case .title2: system = 22
        case .title3: system = 20
        case .headline, .body: system = 17
        case .callout: system = 16
        case .subheadline: system = 15
        case .footnote: system = 13
        case .caption: system = 12
        case .caption2: system = 11
        default: system = 17
        }
        return (system * 1.08).rounded()
    }

    /// The UIKit pieces SwiftUI draws with the system face unless told: the
    /// segmented pickers and the search field. (The navigation bars are not
    /// here: SwiftUI rebuilds their appearance and drops the face, so ShellBar
    /// draws their titles itself.)
    private static func applyAppearance() {
        UISegmentedControl.appearance().setTitleTextAttributes([.font: uiFont(15)], for: .normal)
        UISegmentedControl.appearance().setTitleTextAttributes([.font: uiFont(15, weight: .bold)], for: .selected)
        UITextField.appearance(whenContainedInInstancesOf: [UISearchBar.self]).font = uiFont(18)
        for state in [UIControl.State.normal, .highlighted, .disabled] {
            UIBarButtonItem.appearance(whenContainedInInstancesOf: [UISearchBar.self]).setTitleTextAttributes([.font: uiFont(18)], for: state)
        }
    }

    /// The face at a given size, scaling with Dynamic Type from the body style.
    static func face(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom(faceName(weight), size: size, relativeTo: .body)
    }
    /// Hebrew at a given size: the same face (the site's rule is one font).
    static func hebrew(_ size: CGFloat) -> Font { face(size) }
}
