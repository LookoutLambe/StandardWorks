import SwiftUI

/// THE APP'S FRAME: five tabs along the bottom, the reader in the middle one.
///
/// Library · Read · Search · Notes · Settings — the shape of a scripture app,
/// and the reason this no longer reads as a web page in a box. The Read tab
/// is the one WKWebView; the other four are native and reach into it through
/// WebShell. Reading hides the tab bar (chromeHidden) and a scroll back up
/// restores it, so the text has the whole screen while it is being read.
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
        Group {
            if #available(iOS 18.0, *) {
                // iOS 18's Tab API: on the iPad this becomes a sidebar (with the
                // system's own switch back to a tab bar); on the phone it is
                // the same bottom bar. The `if` is static, so the tab view is
                // never rebuilt — rebuilding it re-parents the web view and
                // cancels speech.
                TabView(selection: $shell.tab) {
                    Tab("Library", systemImage: "books.vertical", value: WebShell.Tab.library) { LibraryView() }
                    Tab("Read", systemImage: "book", value: WebShell.Tab.read) { readTab }
                    Tab("Search", systemImage: "magnifyingglass", value: WebShell.Tab.search) { SearchView() }
                    Tab("Notes", systemImage: "note.text", value: WebShell.Tab.notes) { NotesView() }
                    Tab("Settings", systemImage: "gearshape", value: WebShell.Tab.settings) { SettingsView() }
                }
                .tabViewStyle(.sidebarAdaptable)
            } else {
                TabView(selection: $shell.tab) {
                    LibraryView()
                        .tabItem { Label("Library", systemImage: "books.vertical") }
                        .tag(WebShell.Tab.library)
                    readTab
                        .tabItem { Label("Read", systemImage: "book") }
                        .tag(WebShell.Tab.read)
                    SearchView()
                        .tabItem { Label("Search", systemImage: "magnifyingglass") }
                        .tag(WebShell.Tab.search)
                    NotesView()
                        .tabItem { Label("Notes", systemImage: "note.text") }
                        .tag(WebShell.Tab.notes)
                    SettingsView()
                        .tabItem { Label("Settings", systemImage: "gearshape") }
                        .tag(WebShell.Tab.settings)
                }
            }
        }
        .environmentObject(shell)
        .tint(ShellTheme.gold)
    }

    /// The Read tab: the one web view and what rides on it.
    private var readTab: some View {
        LocalSiteWebView(shell: shell, systemDark: systemDark, onPageSettled: onPageSettled)
            // LISTEN, where a scripture app keeps it: a round button at the
            // right, above the page's own footer. It drives the site's
            // read-aloud (Carmit); a long press picks the speed.
            .overlay(alignment: .bottomTrailing) {
                if shell.canListen && !shell.listening {
                    ListenButton()
                        .padding(.trailing, 14)
                        .padding(.bottom, 64 + 12 + (shell.chromeHidden ? ShellRoot.homeIndicatorInset : 0))
                }
            }
            .modifier(ListenBarBelowContent(shell: shell))
            // The page runs under the status bar and pads its own bar by
            // env(safe-area-inset-top). The bottom edge is SwiftUI's while
            // the tab bar shows (the page's footer sits on the tab bar) and
            // the page's own once it hides (the footer pads by
            // env(safe-area-inset-bottom) down to the home indicator;
            // leaving that edge to SwiftUI left a white band there).
            // Listening is its own mode: both bars go, only the player stays
            // (translator, 2026-09-18: "close both bars and only the
            // playback should be opened"); the tab bar returns on stop.
            .ignoresSafeArea(.container, edges: (shell.chromeHidden && !shell.listening) ? [.top, .bottom] : [.top])
            .toolbar((shell.chromeHidden || shell.listening) ? .hidden : .visible, for: .tabBar)
    }

    /// The bottom safe-area inset of the window, for the floating button when
    /// the page owns the bottom edge.
    static var homeIndicatorInset: CGFloat {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows).first { $0.isKeyWindow }?.safeAreaInsets.bottom ?? 34
    }

    /// The theme the page should follow: the phone's, unless Settings chose one.
    private var systemDark: Bool {
        switch appearance {
        case "dark": return true
        case "light", "sepia": return false
        default: return colorScheme == .dark
        }
    }
}

/// The round headphones button. Navy on the paper like the site's own chrome,
/// gold when speaking; a long press offers the reader's speeds.
struct ListenButton: View {
    @EnvironmentObject var shell: WebShell

    var body: some View {
        Button {
            shell.toggleListen()
        } label: {
            Image(systemName: shell.listening ? "stop.fill" : "headphones")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(shell.listening ? ShellTheme.navy : ShellTheme.gold)
                .frame(width: 52, height: 52)
                .background(shell.listening ? ShellTheme.gold : ShellTheme.navy, in: Circle())
                .shadow(color: .black.opacity(0.25), radius: 6, y: 3)
        }
        .accessibilityLabel(shell.listening ? "Stop reading aloud" : "Listen")
        .sensoryFeedback(.impact(weight: .light), trigger: shell.listening)
        .contextMenu {
            ForEach(shell.listenRates, id: \.self) { r in
                Button {
                    shell.setListenRate(r)
                } label: {
                    if abs(r - shell.listenRate) < 0.001 { Label(String(format: "%g\u{00D7}", r), systemImage: "checkmark") }
                    else { Text(String(format: "%g\u{00D7}", r)) }
                }
            }
        }
    }
}

/// THE NOW-PLAYING BAR, the way a scripture app shows one while it reads:
/// close · the volume's tile · chapter and voice · back ten seconds · pause.
/// Inset above the Read tab's content (see ListenBarBelowContent); it
/// drives the page's own transport through WebShell.
struct ListenBar: View {
    @EnvironmentObject var shell: WebShell
    var compact = false

    var body: some View {
        HStack(spacing: compact ? 8 : 10) {
            Button { shell.stopListen() } label: {
                Image(systemName: "xmark").font(.system(size: 16, weight: .semibold)).frame(width: 44, height: 44)
            }
            .accessibilityLabel("Stop listening")
            if !compact {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous).fill(ShellTheme.navy)
                    Text(shell.currentVolume?.heb ?? "\u{05DB}\u{05EA}\u{05D1}\u{05D9} \u{05D4}\u{05E7}\u{05D3}\u{05E9}")
                        .font(ShellTheme.hebrew(11)).foregroundStyle(ShellTheme.gold)
                        .multilineTextAlignment(.center).minimumScaleFactor(0.6).padding(3)
                }
                .frame(width: 36, height: 36)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(shell.whereLabel.isEmpty ? "Reading" : shell.whereLabel)
                    .font(.footnote.weight(.semibold)).lineLimit(1)
                Text("\(shell.currentVolume?.name ?? "Hebrew") | Carmit \u{00B7} \(String(format: "%g\u{00D7}", shell.listenRate))")
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 4)
            if !compact {
                Button { shell.skipListen(back: true) } label: {
                    Image(systemName: "gobackward.10").font(.system(size: 20)).frame(width: 44, height: 44)
                }
                .accessibilityLabel("Back ten seconds")
            }
            Button { shell.pauseListen() } label: {
                Image(systemName: shell.listenPaused ? "play.fill" : "pause.fill").font(.system(size: 20)).frame(width: 44, height: 44)
            }
            .accessibilityLabel(shell.listenPaused ? "Resume" : "Pause")
        }
        .foregroundStyle(.primary)
        .padding(.horizontal, compact ? 8 : 10)
        .padding(.vertical, compact ? 4 : 5)
    }
}

/// The bar sits above the Read tab's content, inset so the page moves up
/// under it. Not the tab view's own bottom accessory: adding or removing
/// that accessory rebuilt the tab view, which re-parented the web view and
/// cancelled the very speech the bar was showing. An inset with conditional
/// content changes nothing above it.
struct ListenBarBelowContent: ViewModifier {
    @ObservedObject var shell: WebShell
    func body(content: Content) -> some View {
        content.safeAreaInset(edge: .bottom) {
            if shell.listening {
                ListenBar().environmentObject(shell)
                    .background(.regularMaterial, in: Capsule())
                    .padding(.horizontal, 10)
                    .padding(.bottom, 6)
            }
        }
    }
}
