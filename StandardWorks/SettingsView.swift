import SwiftUI
import WebKit

/// SETTINGS, NATIVE.
///
/// Appearance follows the phone unless a theme is chosen here. The choice
/// is only WRITTEN here (AppStorage shell.appearance); ShellRoot turns it
/// into the wanted theme and LocalSiteWebView applies it through the page's
/// own switch (swApplyTheme), so the page persists it exactly as if its ◐
/// button had been tapped — and when that button IS tapped, the page tells
/// the shell and this picker follows (WebShell.adoptPageTheme). Text size
/// steps the page's own slider (stepSize). Nothing here is stored twice.
struct SettingsView: View {
    @EnvironmentObject var shell: WebShell
    @AppStorage("shell.appearance") private var appearance = "system"

    var body: some View {
        NavigationStack {
            Form {
                DisplayOptionsSections()
                Section(header: Text("About").foregroundStyle(shell.ink2)) {
                    // The same two rows as the Android app, and the same message.
                    ShareLink(item: AppShell.shareMessage, subject: Text(AppShell.shareSubject)) { Text("Share Sefer Mormon") }
                    Link("Rate Sefer Mormon", destination: AppShell.writeReviewURL)
                    // In a sheet, never in the reader: loading a website page
                    // into the one web view took the book away — no chapter
                    // pill, no Listen, and the Library lost "Continue reading"
                    // (navigation audit, 2026-09-20).
                    Button("Sefer Mormon in print") { shell.presentPage("in-print.html") }
                    Button("Privacy") { shell.presentPage("privacy.html") }
                }
                .shellRow(shell)
            }
            .shellPage()
            .shellBar("Settings")
            .sheet(isPresented: Binding(get: { shell.sheetPage != nil }, set: { if !$0 { shell.sheetPage = nil } })) {
                if let page = shell.sheetPage { SitePageSheet(path: page).environmentObject(shell) }
            }
        }
    }
}

/// A SITE PAGE OVER THE APP: its own web view, the app's bar, Done. The
/// reader underneath keeps its place.
struct SitePageSheet: View {
    @EnvironmentObject var shell: WebShell
    @Environment(\.dismiss) private var dismiss
    let path: String

    var body: some View {
        NavigationStack {
            SitePageWebView(url: shell.wwwDirectoryURL.appendingPathComponent(path), www: shell.wwwDirectoryURL)
                .ignoresSafeArea(edges: .bottom)
                .background(shell.paper)
                .shellBar(path.hasPrefix("privacy") ? "Privacy" : "In print", sheet: true)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button { dismiss() } label: { Text("Done").font(ShellTheme.text(.body, weight: .semibold)) } } }
        }
        .environment(\.colorScheme, shell.dark ? .dark : .light)
    }
}

private struct SitePageWebView: UIViewRepresentable {
    let url: URL
    let www: URL
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.preferredContentMode = .mobile
        // THE PAGE IS IN THE APP, and is told so the way the reader is: a
        // swShell port stands the site's phone web shell down (pwa_shell.js
        // returns where one exists; without it the sheet grew a second
        // six-icon row at its foot), and shell_start.js keeps the website's
        // own things on the website. The port is deaf: the sheet is read and
        // never drives the shell. (Android's sheet, the same: DeafPort.)
        config.userContentController.add(DeafPort(), name: "swShell")
        config.userContentController.addUserScript(WKUserScript(source: AppShell.documentStartSource, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let wv = WKWebView(frame: .zero, configuration: config)
        wv.isOpaque = false
        wv.loadFileURL(url, allowingReadAccessTo: www)
        return wv
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

/// The sheet's port: there, so the page knows it is inside the app; deaf, so the page cannot drive it.
private final class DeafPort: NSObject, WKScriptMessageHandler {
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {}
}


/// DISPLAY OPTIONS, the way a scripture app offers them (user, 2026-09-20):
/// the reading size on a slider, the theme as swatches — the site's Light,
/// Sepia and Dark, and the shell's Black and Gray cuts of Dark — with "match
/// phone", and the reading modes (layout, transliteration, vowel points).
/// One view in two places: the sheet the header's ⋯ opens, and Settings.
/// Every control drives the page's own switch and shows what the page reports.
struct DisplayOptionsSections: View {
    @EnvironmentObject var shell: WebShell
    @AppStorage("shell.appearance") private var appearance = "system"

    var body: some View {
        Section(header: Text("Text size").foregroundStyle(shell.ink2)) {
            HStack(spacing: 12) {
                Text("A").font(ShellTheme.face(14)).foregroundStyle(shell.ink2)
                Slider(value: Binding(get: { Double(shell.textSize) }, set: { shell.setTextSize(Int($0.rounded())) }), in: 70...150, step: 5)
                    .accessibilityLabel("Text size")
                Text("A").font(ShellTheme.face(26)).foregroundStyle(shell.ink2)
            }
        }
        .shellRow(shell)
        Section(header: Text("Theme").foregroundStyle(shell.ink2)) {
            HStack(spacing: 14) {
                ForEach(AppShell.themes, id: \.self) { key in
                    Button { appearance = key } label: {
                        ThemeSwatch(key: key, selected: appearance == key || (appearance == "system" && key == systemTheme))
                    }
                    .buttonStyle(.plain)      // the system's pressed dimming, no layout shift
                }
            }
            .padding(.vertical, 4)
            .sensoryFeedback(.selection, trigger: appearance)
            Toggle("Match phone", isOn: Binding(get: { appearance == "system" }, set: { appearance = $0 ? "system" : systemTheme }))
        }
        .shellRow(shell)
        Section(header: Text("Reading").foregroundStyle(shell.ink2)) {
            Picker("Layout", selection: Binding(get: { shell.readLayout }, set: { shell.setReading(layout: $0, translit: shell.readTranslit, nikkud: shell.readNikkud) })) {
                Text("Interlinear").tag("inter")
                Text("Hebrew only").tag("heb")
                Text("Dual").tag("dual")
            }
            .pickerStyle(.segmented)
            Toggle("Transliteration", isOn: Binding(get: { shell.readTranslit }, set: { shell.setReading(layout: shell.readLayout, translit: $0, nikkud: shell.readNikkud) }))
            Toggle("Vowel points (nikkud)", isOn: Binding(get: { shell.readNikkud }, set: { shell.setReading(layout: shell.readLayout, translit: shell.readTranslit, nikkud: $0) }))
            Toggle("Full screen on scroll", isOn: Binding(get: { shell.fullScreenOnScroll }, set: { shell.fullScreenOnScroll = $0 }))
        }
        .shellRow(shell)
        if !shell.whereLabel.isEmpty {
            Section(header: Text(shell.whereLabel).foregroundStyle(shell.ink2)) {
                // the study panel's own bookmark button, driven while hidden
                Button { shell.run("(function(){ var b = document.getElementById('xref-bm-add'); if (b) b.click(); })();") } label: { Label("Bookmark this chapter", systemImage: "bookmark") }
                if let u = shell.currentSiteURL {
                    ShareLink(item: u) { Label("Share this chapter", systemImage: "square.and.arrow.up") }
                }
            }
            .shellRow(shell)
        }
    }

    /// The theme the phone's own scheme means, for the swatch that shows it.
    private var systemTheme: String { ShellRoot.phoneIsDark ? "dark" : "light" }
}

/// A theme as its own paper and ink, ringed in "here" when chosen.
private struct ThemeSwatch: View {
    @EnvironmentObject var shell: WebShell
    let key: String
    let selected: Bool
    private static let names = ["light": "Light", "sepia": "Sepia", "dark": "Dark", "black": "Black", "gray": "Gray"]

    var body: some View {
        let p = AppShell.palette(theme: key)
        VStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color(p.paper))
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(0..<3) { i in
                        Capsule().fill(Color(p.ink).opacity(0.75)).frame(width: i == 2 ? 22 : 30, height: 3)
                    }
                }
            }
            .frame(width: 52, height: 40)
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(selected ? shell.here : shell.rule, lineWidth: selected ? 2 : 1))
            Text(Self.names[key] ?? key).font(ShellTheme.text(.caption2)).foregroundStyle(selected ? shell.here : shell.ink2)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Self.names[key] ?? key)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : [.isButton])
    }
}

/// The sheet the header's ⋯ opens: the same sections, with Done.
struct DisplayOptionsSheet: View {
    @EnvironmentObject var shell: WebShell
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form { DisplayOptionsSections() }
                .shellPage(clearOfRow: false)
                .shellBar("Display Options", sheet: true)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button { dismiss() } label: { Image(systemName: "xmark.circle.fill").font(.title3) }
                            .accessibilityLabel("Close")
                    }
                }
        }
        .environment(\.colorScheme, shell.dark ? .dark : .light)
    }
}
