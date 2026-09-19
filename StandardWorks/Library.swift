import SwiftUI
import JavaScriptCore

/// THE LIBRARY, READ FROM THE SITE'S OWN REGISTRY.
///
/// nav_engine.js declares every volume, division, book and chapter count in
/// one literal, `var VOLUMES = { … };`, and the app never keeps a second copy
/// of that table: at launch the literal is cut out of the bundled
/// nav_engine.js by its first and last lines and evaluated in JavaScriptCore,
/// which is the one thing that reads a JavaScript literal exactly as the page
/// does. Add a book to the site and the app's Library has it on the next
/// build, with nothing to edit here.
///
/// Chapter hashes are built the way nav_engine's buildHash builds them: the
/// chapter id is prefix + number, and only the Book of Mormon translates its
/// ids into friendly hashes (`ch3` → `1-nephi-3`) through BOM_HASHES, which
/// is read out of the same file the same way.
struct Volume: Identifiable, Decodable {
    let key: String
    let short: String
    let name: String
    let heb: String
    let page: String
    let divisions: [Division]
    var id: String { key }
}

struct Division: Decodable {
    let name: String
    let books: [Book]
}

struct Book: Identifiable, Decodable {
    let id: String
    let en: String
    let heb: String
    let ch: Int
    let prefix: String
    let isFront: Bool?

    var isFrontMatter: Bool { isFront ?? false }

    /// nav_engine's chapter id for chapter n of this book.
    func chapterId(_ n: Int) -> String {
        isFrontMatter ? prefix : prefix + String(n)
    }
}

enum LibraryRegistry {
    /// The six volumes in the site's order, or [] when the bundle cannot be read.
    static func load(www: URL) -> [Volume] {
        guard let js = try? String(contentsOf: www.appendingPathComponent("nav_engine.js"), encoding: .utf8),
              let volumes = literal(named: "VOLUMES", in: js),
              let ctx = JSContext() else { return [] }
        // The D&C's 138 sections are not written out: the literal builds them
        // in a loop that names each with toHebNum, so that helper (a pure
        // function a few lines above the registry) comes along.
        if let helper = function(named: "toHebNum", in: js) { ctx.evaluateScript(helper) }
        ctx.evaluateScript("var VOLUMES = " + volumes + ";")
        guard let json = ctx.evaluateScript("JSON.stringify(Object.keys(VOLUMES).map(function (k) { return VOLUMES[k]; }))")?.toString(),
              let data = json.data(using: .utf8),
              let list = try? JSONDecoder().decode([Volume].self, from: data) else { return [] }
        // The offline pseudo-volume and anything without a page are not books.
        return list.filter { !$0.page.isEmpty && !$0.divisions.isEmpty }
    }

    /// BOM_HASHES, prefix → friendly stem, from the same file.
    static func bomHashes(www: URL) -> [String: String] {
        guard let js = try? String(contentsOf: www.appendingPathComponent("nav_engine.js"), encoding: .utf8),
              let lit = literal(named: "BOM_HASHES", in: js),
              let ctx = JSContext() else { return [:] }
        ctx.evaluateScript("var BOM_HASHES = " + lit + ";")
        guard let json = ctx.evaluateScript("JSON.stringify(BOM_HASHES)")?.toString(),
              let data = json.data(using: .utf8),
              let map = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }
        return map
    }

    /// The `{ … }` literal assigned to `var NAME =`, balanced on braces,
    /// skipping braces inside string literals.
    static func literal(named name: String, in js: String) -> String? {
        guard let start = js.range(of: "var \(name) = {") else { return nil }
        return balanced(from: js.index(before: start.upperBound), in: js)
    }

    /// `function NAME(...) { … }`, whole.
    static func function(named name: String, in js: String) -> String? {
        guard let start = js.range(of: "function \(name)("),
              let brace = js[start.upperBound...].firstIndex(of: "{"),
              let body = balanced(from: brace, in: js) else { return nil }
        return String(js[start.lowerBound..<brace]) + body
    }

    /// The text from an opening brace to its match, quotes respected.
    static func balanced(from open: String.Index, in js: String) -> String? {
        var depth = 0, i = open, quote: Character? = nil, escaped = false
        while i < js.endIndex {
            let c = js[i]
            if let q = quote {
                if escaped { escaped = false }
                else if c == "\\" { escaped = true }
                else if c == q { quote = nil }
            } else if c == "'" || c == "\"" {
                quote = c
            } else if c == "{" {
                depth += 1
            } else if c == "}" {
                depth -= 1
                if depth == 0 { return String(js[open...i]) }
            }
            i = js.index(after: i)
        }
        return nil
    }

    /// nav_engine's buildHash: the hash a chapter id is reached by.
    static func hash(volume: String, chapterId: String, bomHashes: [String: String]) -> String {
        guard volume == "bom", !chapterId.contains("-colophon") else { return chapterId }
        for key in bomHashes.keys.sorted(by: { $0.count > $1.count }) where chapterId.hasPrefix(key) {
            return bomHashes[key]! + chapterId.dropFirst(key.count)
        }
        return chapterId
    }
}

// MARK: - views

/// Volumes → books → chapters, three pushes, the way a scripture app lays out
/// its library. Every row is the registry's own English and Hebrew.
/// Where the Library is, as a value: pushable from a tap or from the shell.
enum LibraryRoute: Hashable {
    case volume(String)
    case book(String, String)
}

struct LibraryView: View {
    @EnvironmentObject var shell: WebShell

    var body: some View {
        NavigationStack(path: $shell.libraryPath) {
            List {
                if !shell.whereLabel.isEmpty {
                    Section {
                        Button { shell.tab = .read } label: {
                            HStack(spacing: 14) {
                                Image(systemName: "book.pages").font(.title3).foregroundStyle(ShellTheme.gold).frame(width: 44)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Continue reading").font(.caption).foregroundStyle(.secondary)
                                    Text(shell.whereLabel).font(.body.weight(.medium))
                                }
                                Spacer()
                                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                            }
                        }
                        .foregroundStyle(.primary)
                    }
                }
                Section("Volumes") {
                    ForEach(shell.volumes) { volume in
                        NavigationLink(value: LibraryRoute.volume(volume.key)) {
                            VolumeRow(volume: volume)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Library")
            .navigationBarTitleDisplayMode(.inline)
            .shellBar()
            .navigationDestination(for: LibraryRoute.self) { route in
                switch route {
                case .volume(let key):
                    if let v = shell.volumes.first(where: { $0.key == key }) { BooksView(volume: v) }
                case .book(let key, let bookId):
                    if let v = shell.volumes.first(where: { $0.key == key }),
                       let b = v.divisions.flatMap(\.books).first(where: { $0.id == bookId }) {
                        ChaptersView(volume: v, book: b)
                    }
                }
            }
        }
    }
}

private struct VolumeRow: View {
    let volume: Volume
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 6, style: .continuous).fill(ShellTheme.navy)
                Text(volume.short).font(.caption.weight(.semibold)).foregroundStyle(ShellTheme.gold)
            }
            .frame(width: 44, height: 56)
            VStack(alignment: .leading, spacing: 3) {
                Text(volume.name).font(.body.weight(.medium))
                Text(volume.heb).font(ShellTheme.hebrew(15)).foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 2)
    }
}

struct BooksView: View {
    @EnvironmentObject var shell: WebShell
    let volume: Volume

    var body: some View {
        List {
            ForEach(Array(volume.divisions.enumerated()), id: \.offset) { _, division in
                Section(division.name) {
                    ForEach(division.books) { book in
                        if book.isFrontMatter || book.ch == 1 {
                            Button {
                                shell.open(volume: volume, book: book, chapter: 1)
                            } label: { BookRow(book: book) }
                            .foregroundStyle(.primary)
                        } else {
                            NavigationLink(value: LibraryRoute.book(volume.key, book.id)) { BookRow(book: book) }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(volume.name)
        .navigationBarTitleDisplayMode(.inline)
        .shellBar()
    }
}

private struct BookRow: View {
    let book: Book
    var body: some View {
        HStack {
            Text(book.en)
            Spacer()
            if book.ch > 1 {
                Text("\(book.ch)").font(.footnote).foregroundStyle(.tertiary)
            }
            Text(book.heb).font(ShellTheme.hebrew(16)).foregroundStyle(.secondary)
        }
    }
}

struct ChaptersView: View {
    @EnvironmentObject var shell: WebShell
    let volume: Volume
    let book: Book
    private let columns = [GridItem(.adaptive(minimum: 52), spacing: 10)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(1...max(book.ch, 1), id: \.self) { n in
                    Button {
                        shell.open(volume: volume, book: book, chapter: n)
                    } label: {
                        Text("\(n)")
                            .font(.body.monospacedDigit())
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .foregroundStyle(.primary)
                }
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(book.en)
        .navigationBarTitleDisplayMode(.inline)
        .shellBar()
    }
}
