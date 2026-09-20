import SwiftUI

/// NOTES, NATIVE — everything the reader has marked, in three lists.
///
/// The reader keeps its notes in IndexedDB through notes_engine.js
/// (window.NotesEngine, keyed "Book|chapter|verse"), its highlights in
/// localStorage `sw-highlights-v1` ({verseKey: {on, ts}}) and its bookmarks
/// in `sw-bookmarks-v1` ([{volume, chapter, label, heb, path, ts}]). This tab
/// reads all three from the page and lists them newest first; a tap opens the
/// place in the Read tab. Nothing is stored twice.
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
                    ContentUnavailableView {
                        Label("Nothing marked yet", systemImage: "note.text")
                    } description: {
                        Text("Select a verse in the reader to highlight it or write a note. Bookmarks are kept in the reader's Study panel.")
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
                                            Text(b.label).font(.body.weight(.medium))
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
                                    Button { open(verseKey: h.key) } label: {
                                        HStack {
                                            Image(systemName: "highlighter").foregroundStyle(shell.here)
                                            Text(h.ref)
                                            Spacer()
                                            Text(h.when, style: .date).font(.caption).foregroundStyle(shell.ink3)
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
                                    Button { open(verseKey: note.key) } label: {
                                        VStack(alignment: .leading, spacing: 4) {
                                            HStack {
                                                Text(note.ref).font(.footnote.weight(.semibold)).foregroundStyle(shell.here)
                                                Spacer()
                                                Text(note.when, style: .date).font(.caption).foregroundStyle(shell.ink3)
                                            }
                                            Text(note.text).font(.body).lineLimit(4)
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
            .navigationTitle("Notes")
            .navigationBarTitleDisplayMode(.inline)
            .shellBar()
            .onAppear(perform: load)
            .refreshable { load() }
        }
    }

    private func load() {
        let body = """
        var out = { notes: [], highlights: {}, bookmarks: [] };
        try { if (window.NotesEngine) { var all = await window.NotesEngine.exportAll(); out.notes = (all && all.notes) || []; } } catch (e) {}
        try { out.highlights = JSON.parse(localStorage.getItem('sw-highlights-v1') || '{}') || {}; } catch (e) {}
        try { out.bookmarks = JSON.parse(localStorage.getItem('sw-bookmarks-v1') || '[]') || []; } catch (e) {}
        return out;
        """
        shell.call(body) { v in
            let d = (v as? [String: Any]) ?? [:]
            let noteRows = (d["notes"] as? [[String: Any]]) ?? []
            notes = noteRows.compactMap { r -> NoteRow? in
                guard let key = r["verseKey"] as? String, let text = r["text"] as? String else { return nil }
                let ms = (r["updatedAt"] as? Double) ?? 0
                return NoteRow(key: key, ref: NotesView.ref(key), text: text, when: Date(timeIntervalSince1970: ms / 1000))
            }.sorted { $0.when > $1.when }
            let hl = (d["highlights"] as? [String: Any]) ?? [:]
            highlights = hl.compactMap { key, val -> MarkRow? in
                let info = val as? [String: Any]
                if let on = info?["on"] as? Bool, !on { return nil }
                let ms = (info?["ts"] as? Double) ?? 0
                return MarkRow(key: key, ref: NotesView.ref(key), when: Date(timeIntervalSince1970: ms / 1000))
            }.sorted { $0.when > $1.when }
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

struct NoteRow: Identifiable {
    let key: String, ref: String, text: String, when: Date
    var id: String { "n:" + key }
}
struct MarkRow: Identifiable {
    let key: String, ref: String, when: Date
    var id: String { "h:" + key }
}
struct BookmarkRow: Identifiable {
    let path: String, label: String, heb: String, when: Date
    var id: String { "b:" + path }
}
