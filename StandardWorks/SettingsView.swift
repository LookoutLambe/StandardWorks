import SwiftUI

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
                    Button("Sefer Mormon in print") { shell.open(path: "in-print.html") }
                    Button("Privacy") { shell.open(path: "privacy.html") }
                }
                .shellRow(shell)
            }
            .shellPage()
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .shellBar()
        }
    }
}
