import SwiftUI

/// SETTINGS, NATIVE.
///
/// Appearance follows the phone unless a theme is chosen here; the choice is
/// applied through the page's own switch (swApplyTheme) so the page persists
/// it exactly as if its moon button had been tapped. Text size steps the
/// page's own slider (stepSize). Nothing here is stored twice.
struct SettingsView: View {
    @EnvironmentObject var shell: WebShell
    @Environment(\.colorScheme) private var colorScheme
    @AppStorage("shell.appearance") private var appearance = "system"

    var body: some View {
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Theme", selection: $appearance) {
                        Text("Match phone").tag("system")
                        Text("Light").tag("light")
                        Text("Sepia").tag("sepia")
                        Text("Dark").tag("dark")
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }
                Section("Text size") {
                    HStack {
                        Button { shell.stepTextSize(-10) } label: { Label("Smaller", systemImage: "textformat.size.smaller") }
                            .buttonStyle(.bordered)
                        Spacer()
                        Button { shell.stepTextSize(10) } label: { Label("Larger", systemImage: "textformat.size.larger") }
                            .buttonStyle(.bordered)
                    }
                    Text("Sets the reading size on every page; the same control as the Aa button in the reader.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section("About") {
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "")
                    Button("Sefer Mormon in print") { shell.open(path: "in-print.html") }
                    Button("Privacy") { shell.open(path: "privacy.html") }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .shellBar()
        }
        .onChange(of: appearance) { _, newValue in apply(newValue) }
    }

    private func apply(_ choice: String) {
        let theme = choice == "system" ? (colorScheme == .dark ? "dark" : "light") : choice
        shell.run("window.swApplyTheme && window.swApplyTheme(\(jsString(theme)));")
    }
}
