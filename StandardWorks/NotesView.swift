import SwiftUI

/// NOTES, NATIVE — everything the reader has marked, in three lists.
///
/// The page's `SWMarks.collect()` (nav_engine.js) reads every store the
/// reader writes: the word popover's per-volume highlights and notes
/// (`<vol>-annotations`, `<vol>-notes`), the verse menu's (`sw-highlights-v1`,
/// NotesEngine in IndexedDB) and the bookmarks (`sw-bookmarks-v1`). This tab
/// used to read the verse menu's stores itself and so never saw the popover's,
/// which is how nearly everyone marks (Deep Testing BUG-003, 2026-10-03). Each
/// row comes with the path that opens it; a tap opens it in the Read tab. A
/// popover mark keeps no time, so it shows no date. Nothing is stored twice.
struct NotesView: View {
    @EnvironmentObject var shell: WebShell
    @State private var notes: [NoteRow] = []
    @State private var highlights: [MarkRow] = []
    @State private var bookmarks: [BookmarkRow] = []
    @State private var loaded = false

    private var empty: Bool { notes.isEmpty && highlights.isEmpty && bookmarks.isEmpty }

    var body: some View {
        NavigationStack {
            Group {
                if loaded && empty {
                    // An empty screen is an invitation to act: it says what the
                    // reader calls things and opens the reader itself.
                    // the view's own title and description faces are the system's:
                    // the one face is named on each (ShellTheme.text)
                    ContentUnavailableView {
                        Label { Text("Nothing marked yet").font(ShellTheme.text(.title2, weight: .semibold)) } icon: { Image(systemName: "note.text") }
                    } description: {
                        Text("Select a verse in the reader to highlight it or write a note. The Bookmark in the row marks the chapter you are reading.")
                            .font(ShellTheme.text(.body))
                    } actions: {
                        Button { shell.tab = .read } label: { Label("Open the reader", systemImage: "book") }
                            .buttonStyle(.borderedProminent)
                    }
                } else {
                    List {
                        if !bookmarks.isEmpty {
                            Section(header: Text("Bookmarks").foregroundStyle(shell.ink2)) {
                                ForEach(bookmarks) { b in
                                    Button { shell.open(path: b.path) } label: {
                                        HStack {
                                            Image(systemName: "bookmark.fill").foregroundStyle(shell.here)
                                            Text(b.label).font(ShellTheme.text(.body, weight: .medium))
                                            Spacer()
                                            Text(b.heb).font(ShellTheme.hebrew(16)).foregroundStyle(shell.ink2)
                                        }
                                    }
                                    .foregroundStyle(shell.ink)
                                }
                            }
                            .shellRow(shell)
                        }
                        if !highlights.isEmpty {
                            Section(header: Text("Highlights").foregroundStyle(shell.ink2)) {
                                ForEach(highlights) { h in
                                    Button { open(path: h.path, verseKey: h.key) } label: {
                                        HStack {
                                            Image(systemName: "highlighter").foregroundStyle(shell.here)
                                            Text(h.ref)
                                            Spacer()
                                            if let when = h.when {
                                                Text(when, style: .date).font(ShellTheme.text(.caption)).foregroundStyle(shell.ink3)
                                            }
                                        }
                                    }
                                    .foregroundStyle(shell.ink)
                                }
                            }
                            .shellRow(shell)
                        }
                        if !notes.isEmpty {
                            Section(header: Text("Notes").foregroundStyle(shell.ink2)) {
                                ForEach(notes) { note in
                                    Button { open(path: note.path, verseKey: note.key) } label: {
                                        VStack(alignment: .leading, spacing: 4) {
                                            HStack {
                                                Text(note.ref).font(ShellTheme.text(.footnote, weight: .semibold)).foregroundStyle(shell.here)
                                                Spacer()
                                                if let when = note.when {
                                                    Text(when, style: .date).font(ShellTheme.text(.caption)).foregroundStyle(shell.ink3)
                                                }
                                            }
                                            Text(note.text).font(ShellTheme.text(.body)).lineLimit(4)
                                        }
                                    }
                                    .foregroundStyle(shell.ink)
                                }
                            }
                            .shellRow(shell)
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .shellPage()
            .shellBar("Notes", closesPanel: true)
            .onAppear(perform: load)
            .refreshable { load() }
        }
    }

    private func load() {
        let body = """
        if (window.SWMarks) return await window.SWMarks.collect();
        return { notes: [], highlights: [], bookmarks: [] };
        """
        shell.call(body) { v in
            let d = (v as? [String: Any]) ?? [:]
            // The collector has already put each list in order.
            func when(_ r: [String: Any]) -> Date? {
                let ms = (r["ts"] as? Double) ?? 0
                return ms > 0 ? Date(timeIntervalSince1970: ms / 1000) : nil
            }
            let noteRows = (d["notes"] as? [[String: Any]]) ?? []
            notes = noteRows.enumerated().compactMap { i, r -> NoteRow? in
                guard let key = r["key"] as? String, let text = r["text"] as? String else { return nil }
                let ref = (r["ref"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? NotesView.ref(key)
                return NoteRow(id: "n:\(i)", key: key, ref: ref, path: r["path"] as? String ?? "", text: text, when: when(r))
            }
            let markRows = (d["highlights"] as? [[String: Any]]) ?? []
            highlights = markRows.enumerated().compactMap { i, r -> MarkRow? in
                guard let key = r["key"] as? String else { return nil }
                let ref = (r["ref"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? NotesView.ref(key)
                return MarkRow(id: "h:\(i)", key: key, ref: ref, path: r["path"] as? String ?? "", when: when(r))
            }
            let bm = (d["bookmarks"] as? [[String: Any]]) ?? []
            bookmarks = bm.compactMap { b -> BookmarkRow? in
                guard let path = b["path"] as? String, let label = b["label"] as? String else { return nil }
                return BookmarkRow(path: path, label: label, heb: b["heb"] as? String ?? "", when: Date(timeIntervalSince1970: ((b["ts"] as? Double) ?? 0) / 1000))
            }
            loaded = true
        }
    }

    /// "1 Nephi|3|7" → "1 Nephi 3:7"
    static func ref(_ key: String) -> String {
        let parts = key.split(separator: "|").map(String.init)
        return parts.count >= 3 ? "\(parts[0]) \(parts[1]):\(parts[2])" : key
    }

    /// The path the page built for the mark; the registry lookup only when it could not build one.
    private func open(path: String, verseKey: String) {
        if !path.isEmpty { shell.open(path: path) } else { open(verseKey: verseKey) }
    }

    /// "1 Nephi|3|7" → the registry's 1 Nephi, chapter 3, at verse 7 through the
    /// reader's own deep-link forms (bom "1-nephi-3:7", others "gen-ch1&v=7").
    private func open(verseKey: String) {
        let parts = verseKey.split(separator: "|").map(String.init)
        guard parts.count >= 2, let ch = Int(parts[1]) else { return }
        let name = parts[0], verse = parts.count >= 3 ? parts[2] : ""
        let ordered = shell.volumes.filter { $0.key != "jst" } + shell.volumes.filter { $0.key == "jst" }
        for volume in ordered {
            for division in volume.divisions {
                if let book = division.books.first(where: { $0.en == name }) {
                    let chapterId = book.chapterId(ch)
                    var hash = LibraryRegistry.hash(volume: volume.key, chapterId: chapterId, bomHashes: shell.bomHashes)
                    if !verse.isEmpty { hash += volume.key == "bom" ? ":" + verse : "&v=" + verse }
                    shell.open(path: volume.page + "#" + hash)
                    return
                }
            }
        }
    }
}

/// The id is the row's place in the collector's list: one verse can carry a
/// note in each of two stores, so the key alone is not unique.
struct NoteRow: Identifiable {
    let id: String, key: String, ref: String, path: String, text: String, when: Date?
}
struct MarkRow: Identifiable {
    let id: String, key: String, ref: String, path: String, when: Date?
}
struct BookmarkRow: Identifiable {
    let path: String, label: String, heb: String, when: Date
    var id: String { "b:" + path }
}
