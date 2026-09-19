import SwiftUI

/// THE APP'S FRAME: six icons along the bottom, the reader behind them.
///
/// Library · Read · Search · Notes · Settings · Listen — the row a scripture
/// app has, drawn by the app itself (ShellTabBar) rather than the system's
/// tab bar, which caps a phone at five items and folds the rest into "More";
/// the translator wants all six, icons only, and Listen never behind a menu.
/// The TabView underneath only holds the five pages and switches them; its
/// own bar is hidden. The Read page is the one WKWebView; the other four are
/// native and reach into it through WebShell. The row is sticky: reading
/// (a scroll down) collapses the PAGE'S mode row above it, not this one
/// (translator, 2026-09-19: "you cant hide the second line now where the
/// listen button is"); listening alone replaces it with the player, until
/// the reading is stopped.
struct ShellRoot: View {
    @StateObject private var shell: WebShell
    @Environment(\.colorScheme) private var colorScheme
    @AppStorage("shell.appearance") private var appearance = "system"

    let onPageSettled: () -> Void

    init(www: URL, onPageSettled: @escaping () -> Void = {}) {
        _shell = StateObject(wrappedValue: WebShell(www: www))
        self.onPageSettled = onPageSettled
    }

    var body: some View {
        // The row is a SIBLING below the pages, not an inset over them: an
        // inset only asks a page to leave room, and the web view — a UIKit
        // view filling its frame — took none, so the row sat on the page's
        // own footer (translator: "it cannot hide over the footer"). As a
        // sibling it takes real height; the reader ends where it begins.
        // Its ground is the page's chrome, so under the reader the site's
        // navy footer and this row are one navy band to the bottom of the
        // glass, and under the native pages the same navy answers the navy
        // bar at the top ("can the entire footer area be navy blue?").
        VStack(spacing: 0) {
            TabView(selection: $shell.tab) {
                LibraryView().tag(WebShell.Tab.library).toolbar(.hidden, for: .tabBar)
                readTab.tag(WebShell.Tab.read).toolbar(.hidden, for: .tabBar)
                SearchView().tag(WebShell.Tab.search).toolbar(.hidden, for: .tabBar)
                NotesView().tag(WebShell.Tab.notes).toolbar(.hidden, for: .tabBar)
                SettingsView().tag(WebShell.Tab.settings).toolbar(.hidden, for: .tabBar)
            }
            if !barHidden {
                ShellTabBar()
                    .padding(.bottom, max(ShellRoot.homeIndicatorInset, 8))
                    .background(shell.chrome)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        // The stack runs to the bottom of the glass; the row pads itself above
        // the home indicator, and when the row is gone the page takes it all.
        .ignoresSafeArea(.container, edges: .bottom)
        // Chrome behind everything: a hairline the layout leaves between the
        // page and the row, or the bands beside the page in landscape, is
        // navy and not a white seam.
        .background(shell.chrome.ignoresSafeArea())
        .animation(UIAccessibility.isReduceMotionEnabled ? nil : .easeInOut(duration: 0.2), value: barHidden)
        .environmentObject(shell)
        .tint(ShellTheme.gold)
    }

    /// Gone only while the player is up.
    private var barHidden: Bool { shell.listening }

    /// The Read page: the one web view and what rides on it.
    private var readTab: some View {
        LocalSiteWebView(shell: shell, wantedTheme: wantedTheme, onPageSettled: onPageSettled)
            // The player bar, native, above the page while it reads.
            .modifier(ListenBarBelowContent(shell: shell))
            // The page runs under the status bar and pads its own bar by
            // env(safe-area-inset-top). Its bottom edge is always the row's
            // (or the player's): the page's footer sits on that edge and the
            // row never leaves it.
            .ignoresSafeArea(.container, edges: [.top])
    }

    /// The bottom safe-area inset of the window, for anything that floats
    /// while the page owns the bottom edge.
    static var homeIndicatorInset: CGFloat {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows).first { $0.isKeyWindow }?.safeAreaInsets.bottom ?? 34
    }

    /// The phone's own appearance, whatever theme the page shows: a native
    /// page overrides colorScheme with the theme's (ShellPage), so Settings'
    /// "Match phone" asks the window instead of its environment.
    static var phoneIsDark: Bool {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .first?.traitCollection.userInterfaceStyle == .dark
    }

    /// The theme the page should show: Settings' choice, or under "Match
    /// phone" the phone's scheme. The ONE path a theme choice takes to the
    /// page (LocalSiteWebView.updateUIView → applyWantedThemeIfChanged);
    /// Settings only writes the choice.
    private var wantedTheme: String {
        switch appearance {
        case "light", "sepia", "dark": return appearance
        default: return colorScheme == .dark ? "dark" : "light"
        }
    }
}

/// THE ROW: six icons on the chrome, no names (translator, 2026-09-19: "you
/// can have them all there if you only had the icon and not the name"). Five
/// select a page; Listen starts or stops the reading. Each icon is a 52-pt
/// target with its name for VoiceOver, drawn in the site's on-chrome paper,
/// the selected one in the gold the site uses for "here" on navy.
struct ShellTabBar: View {
    @EnvironmentObject var shell: WebShell

    private struct Item: Identifiable {
        let id: String, symbol: String, tab: WebShell.Tab?
    }
    private let items: [Item] = [
        Item(id: "Library",  symbol: "books.vertical", tab: .library),
        Item(id: "Read",     symbol: "book",           tab: .read),
        Item(id: "Search",   symbol: "magnifyingglass", tab: .search),
        Item(id: "Notes",    symbol: "note.text",      tab: .notes),
        Item(id: "Settings", symbol: "gearshape",      tab: .settings),
        Item(id: "Listen",   symbol: "headphones",     tab: nil),
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items) { item in
                let selected = item.tab != nil && item.tab == shell.tab
                Button {
                    if let t = item.tab { shell.tab = t } else { shell.toggleListen() }
                } label: {
                    Image(systemName: selected ? filled(item.symbol) : item.symbol)
                        .font(.system(size: 22, weight: .medium))
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(selected ? shell.hereChrome : shell.onChrome)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.id)
                .accessibilityAddTraits(selected ? [.isSelected] : [])
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 2)
        .sensoryFeedback(.selection, trigger: shell.tab)
    }

    /// The selected page's icon is the filled variant where SF Symbols has one.
    private func filled(_ symbol: String) -> String {
        switch symbol {
        case "book": return "book.fill"
        case "gearshape": return "gearshape.fill"
        case "note.text": return "note.text"
        case "books.vertical": return "books.vertical.fill"
        default: return symbol
        }
    }
}

/// THE NOW-PLAYING BAR, the way a scripture app shows one while it reads:
/// close · the volume's tile · chapter and voice · back ten seconds · pause.
/// It takes the row's place on the same navy band (see
/// ListenBarBelowContent) and drives the page's own transport through
/// WebShell. Paper on chrome, the speed in the "here" gold.
struct ListenBar: View {
    @EnvironmentObject var shell: WebShell

    var body: some View {
        HStack(spacing: 10) {
            Button { shell.stopListen() } label: {
                Image(systemName: "xmark").font(.system(size: 16, weight: .semibold)).frame(width: 44, height: 44)
            }
            .accessibilityLabel("Stop listening")
            ZStack {
                RoundedRectangle(cornerRadius: 6, style: .continuous).strokeBorder(shell.hereChrome, lineWidth: 1)
                Text(shell.currentVolume?.heb ?? "\u{05DB}\u{05EA}\u{05D1}\u{05D9} \u{05D4}\u{05E7}\u{05D3}\u{05E9}")
                    .font(ShellTheme.hebrew(11)).foregroundStyle(shell.hereChrome)
                    .multilineTextAlignment(.center).minimumScaleFactor(0.6).padding(3)
            }
            .frame(width: 36, height: 36)
            VStack(alignment: .leading, spacing: 1) {
                Text(shell.whereLabel.isEmpty ? "Reading" : shell.whereLabel)
                    .font(.footnote.weight(.semibold)).lineLimit(1)
                HStack(spacing: 4) {
                    // The volume's name gives way first (scaled, then cut)
                    // so "Carmit" and the speed always show whole.
                    Text("\(shell.currentVolume?.name ?? "Hebrew") | Carmit \u{00B7}")
                        .font(.caption).foregroundStyle(shell.onChrome.opacity(0.72))
                        .lineLimit(1).minimumScaleFactor(0.85)
                    Menu {
                        ForEach(shell.listenRates, id: \.self) { r in
                            Button { shell.setListenRate(r) } label: {
                                if abs(r - shell.listenRate) < 0.001 { Label(String(format: "%g\u{00D7}", r), systemImage: "checkmark") }
                                else { Text(String(format: "%g\u{00D7}", r)) }
                            }
                        }
                    } label: {
                        Text(String(format: "%g\u{00D7}", shell.listenRate)).font(.caption.weight(.semibold)).foregroundStyle(shell.hereChrome)
                    }
                    .fixedSize()
                    .accessibilityLabel("Reading speed")
                }
            }
            Spacer(minLength: 4)
            Button { shell.skipListen(back: true) } label: {
                Image(systemName: "gobackward.10").font(.system(size: 20)).frame(width: 44, height: 44)
            }
            .accessibilityLabel("Back ten seconds")
            Button { shell.pauseListen() } label: {
                Image(systemName: shell.listenPaused ? "play.fill" : "pause.fill").font(.system(size: 20)).frame(width: 44, height: 44)
            }
            .accessibilityLabel(shell.listenPaused ? "Resume" : "Pause")
        }
        .foregroundStyle(shell.onChrome)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
    }
}

/// The player sits above the Read page's content, inset so the page moves
/// up under it, on the chrome that runs to the bottom of the glass. Not the
/// tab view's own bottom accessory: adding or removing that accessory
/// rebuilt the tab view, which re-parented the web view and cancelled the
/// very speech the bar was showing. An inset with conditional content
/// changes nothing above it.
struct ListenBarBelowContent: ViewModifier {
    @ObservedObject var shell: WebShell
    func body(content: Content) -> some View {
        content.safeAreaInset(edge: .bottom) {
            if shell.listening {
                ListenBar().environmentObject(shell)
                    .padding(.horizontal, 6)
                    .padding(.top, 2)
                    .frame(maxWidth: .infinity)
                    .background(shell.chrome.ignoresSafeArea(edges: .bottom))
            }
        }
    }
}
