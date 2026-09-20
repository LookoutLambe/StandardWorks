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
                // THE READING MODES, here instead of the footer (user,
                // 2026-09-20): the layout, the transliteration and the vowel
                // points, each the page's own switch. The default is
                // interlinear with both (seeded once by AppShell's start script).
                Section(header: Text("Reading").foregroundStyle(shell.ink2)) {
                    Picker("Layout", selection: Binding(get: { shell.readLayout }, set: { shell.setReading(layout: $0, translit: shell.readTranslit, nikkud: shell.readNikkud) })) {
                        Text("Interlinear").tag("inter")
                        Text("Hebrew only").tag("heb")
                        Text("Dual").tag("dual")
                    }
                    .pickerStyle(.segmented)
                    Toggle("Transliteration", isOn: Binding(get: { shell.readTranslit }, set: { shell.setReading(layout: shell.readLayout, translit: $0, nikkud: shell.readNikkud) }))
                    Toggle("Vowel points (nikkud)", isOn: Binding(get: { shell.readNikkud }, set: { shell.setReading(layout: shell.readLayout, translit: shell.readTranslit, nikkud: $0) }))
                    Text("Interlinear sets the English gloss under every word; Hebrew only is the text alone; Dual sets the English beside it.")
                        .font(.footnote).foregroundStyle(shell.ink2)
                }
                .shellRow(shell)
                Section(header: Text("Appearance").foregroundStyle(shell.ink2)) {
                    Picker("Theme", selection: $appearance) {
                        Text("Match phone").tag("system")
                        Text("Light").tag("light")
                        Text("Sepia").tag("sepia")
                        Text("Dark").tag("dark")
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }
                .shellRow(shell)
                Section(header: Text("Text size").foregroundStyle(shell.ink2)) {
                    HStack {
                        Button { shell.stepTextSize(-10) } label: { Label("Smaller", systemImage: "textformat.size.smaller") }
                            .buttonStyle(.bordered)
                        Spacer()
                        Button { shell.stepTextSize(10) } label: { Label("Larger", systemImage: "textformat.size.larger") }
                            .buttonStyle(.bordered)
                    }
                    Text("Sets the reading size on every page; the same control as the Aa button in the reader.")
                        .font(.footnote).foregroundStyle(shell.ink2)
                }
                .shellRow(shell)
                Section(header: Text("About").foregroundStyle(shell.ink2)) {
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
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .shellBar()
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
                .navigationTitle(path.hasPrefix("privacy") ? "Privacy" : "In print")
                .navigationBarTitleDisplayMode(.inline)
                .shellBar()
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
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
        let wv = WKWebView(frame: .zero, configuration: config)
        wv.isOpaque = false
        wv.loadFileURL(url, allowingReadAccessTo: www)
        return wv
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
