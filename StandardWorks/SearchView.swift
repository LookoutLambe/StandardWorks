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
                Group {
                    if !indexReady && !shell.searchQuery.isEmpty {
                        HStack(spacing: 10) { ProgressView(); Text("Preparing the index\u{2026}").foregroundStyle(shell.ink2) }
                    } else if hits.isEmpty && searched.count >= 2 {
                        Text("No verses match \u{201c}\(searched)\u{201d}.").foregroundStyle(shell.ink2)
                    } else if hits.isEmpty && shell.searchQuery.isEmpty {
                        Text("Hebrew, with or without vowels, or English \u{2014} every volume at once.")
                            .font(ShellTheme.text(.footnote)).foregroundStyle(shell.ink2)
                    }
                }
                .shellRow(shell)
                ForEach(grouped, id: \.0) { name, list in
                    Section {
                        ForEach(list) { hit in
                            Button {
                                // the whole list goes with it: the find bar walks it verse by verse
                                if let i = hits.firstIndex(where: { $0.id == hit.id }) {
                                    shell.startFind(query: searched, hits: hits, at: i)
                                } else {
                                    shell.open(path: hit.path)
                                }
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(hit.row.ref).font(ShellTheme.text(.footnote, weight: .semibold)).foregroundStyle(shell.here)
                                    if SearchIndex.hasHebrew(searched) {
                                        Text(hit.snippet).font(ShellTheme.hebrew(18))
                                            .frame(maxWidth: .infinity, alignment: .trailing)
                                            .environment(\.layoutDirection, .rightToLeft)
                                    } else {
                                        Text(hit.snippet).font(ShellTheme.text(.subheadline)).foregroundStyle(shell.ink2).lineLimit(3)
                                    }
                                }
                            }
                            .foregroundStyle(shell.ink)
                        }
                    } header: {
                        Text("\(name) \u{00B7} \(list.count)\(list.count >= 200 ? "+" : "")").foregroundStyle(shell.ink2)
                    }
                    .shellRow(shell)
                }
            }
            .listStyle(.insetGrouped)
            .shellPage(clearOfRow: true)
            .shellBar("Search")
            // The field under the title, always: from iOS 26 the default puts
            // it at the bottom of the screen, under the floating row, where it
            // could not be seen or reached (user, 2026-09-24, on iOS 27).
            .searchable(text: query, isPresented: $shell.searchPresented,
                        placement: .navigationBarDrawer(displayMode: .always), prompt: "Hebrew or English")
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
