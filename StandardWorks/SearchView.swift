import SwiftUI

/// SEARCH, NATIVE, ALL SIX VOLUMES.
///
/// Results come from the site's cross-volume index (SearchIndex) as you type,
/// grouped by volume in the canon's order; a tap opens the verse in the Read
/// tab through the same deep link the home page's search uses.
struct SearchView: View {
    @EnvironmentObject var shell: WebShell
    @State private var hits: [SearchIndex.Hit] = []
    @State private var searched = ""
    @State private var indexReady = false
    /// A volume to search within, or "" for the whole canon.
    @State private var scope = ""
    private var query: Binding<String> { $shell.searchQuery }

    private var grouped: [(String, [SearchIndex.Hit])] {
        var order: [String] = [], byVol: [String: [SearchIndex.Hit]] = [:]
        for h in hits {
            if byVol[h.volumeName] == nil { order.append(h.volumeName) }
            byVol[h.volumeName, default: []].append(h)
        }
        return order.map { ($0, byVol[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            List {
                if !indexReady && !shell.searchQuery.isEmpty {
                    HStack(spacing: 10) { ProgressView(); Text("Preparing the index\u{2026}").foregroundStyle(.secondary) }
                } else if hits.isEmpty && searched.count >= 2 {
                    Text("No verses match \u{201c}\(searched)\u{201d}.").foregroundStyle(.secondary)
                } else if hits.isEmpty && shell.searchQuery.isEmpty {
                    Text("Hebrew, with or without vowels, or English \u{2014} every volume at once.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                ForEach(grouped, id: \.0) { name, list in
                    Section {
                        ForEach(list) { hit in
                            Button {
                                shell.open(path: hit.path)
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(hit.row.ref).font(.footnote.weight(.semibold)).foregroundStyle(ShellTheme.gold)
                                    if SearchIndex.hasHebrew(searched) {
                                        Text(hit.snippet).font(ShellTheme.hebrew(18))
                                            .frame(maxWidth: .infinity, alignment: .trailing)
                                            .environment(\.layoutDirection, .rightToLeft)
                                    } else {
                                        Text(hit.snippet).font(.subheadline).foregroundStyle(.secondary).lineLimit(3)
                                    }
                                }
                            }
                            .foregroundStyle(.primary)
                        }
                    } header: {
                        Text("\(name) \u{00B7} \(list.count)\(list.count >= 200 ? "+" : "")")
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .shellBar()
            .searchable(text: query, prompt: "Hebrew or English")
            .searchScopes($scope, activation: .onSearchPresentation) {
                Text("All").tag("")
                ForEach(shell.volumes) { v in Text(v.short).tag(v.key) }
            }
            .onChange(of: scope) { _, _ in run(shell.searchQuery) }
            .onSubmit(of: .search) { run(shell.searchQuery) }
            .task(id: shell.searchQuery) {
                // As you type, after a beat; the index is the whole canon.
                try? await Task.sleep(nanoseconds: 250_000_000)
                if !Task.isCancelled { run(shell.searchQuery) }
            }
            .onReceive(shell.searchIndex.$loaded) { ready in
                indexReady = ready
                if ready { run(shell.searchQuery) }
            }
        }
    }

    private func run(_ q: String) {
        let trimmed = q.trimmingCharacters(in: .whitespaces)
        searched = trimmed
        let all = trimmed.count >= 2 ? shell.searchIndex.find(trimmed) : []
        hits = scope.isEmpty ? all : all.filter { $0.row.volume == scope }
    }
}
