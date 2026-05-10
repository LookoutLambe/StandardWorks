import SwiftUI

struct ContentView: View {
    var body: some View {
        Group {
            if let www = Bundle.main.url(forResource: "www", withExtension: nil),
               FileManager.default.fileExists(atPath: www.appendingPathComponent("index.html").path) {
                LocalSiteWebView(wwwDirectoryURL: www)
                    .ignoresSafeArea(.container, edges: .bottom)
            } else {
                MissingContentView()
            }
        }
    }
}

private struct MissingContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Standard Works")
                .font(.title2.weight(.semibold))
            Text("The www folder was not found in the app bundle. Copy your Standard Works Project files into StandardWorks/www (see README on your Desktop).")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding()
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
