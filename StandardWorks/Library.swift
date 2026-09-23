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
    /// Which volumes are open. Whenever the Library is shown, NONE: six rows,
    /// one per volume, and a volume unfolds to its books only when tapped
    /// (user, 2026-09-20: "it should just collapse to all books just not have
    /// the BOM open when i click on library i need navigation easier"). The
    /// reader's volume and book are still marked in the "here" colour.
    @State private var open: Set<String> = []

    private func rowId(_ volume: Volume, _ book: Book) -> String { "book-\(volume.key)-\(book.id)" }
    private var hereBook: (Volume, Book)? {
        guard let v = shell.volumes.first(where: { $0.key == shell.currentVolumeKey }), let b = shell.book(in: v, chapterId: shell.currentChapterId) else { return nil }
        return (v, b)
    }
    private func focus(_ proxy: ScrollViewProxy) {
        open = []
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { withAnimation { proxy.scrollTo("library-top", anchor: .top) } }
    }

    var body: some View {
        NavigationStack(path: $shell.libraryPath) {
            ScrollViewReader { proxy in
                List {
                    if !shell.whereLabel.isEmpty {
                        Section {
                            Button { shell.tab = .read } label: {
                                HStack(spacing: 14) {
                                    Image(systemName: "book.pages").font(.title3).foregroundStyle(shell.here).frame(width: 44)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Continue reading").font(ShellTheme.text(.caption)).foregroundStyle(shell.ink2)
                                        Text(shell.whereLabel).font(ShellTheme.text(.body, weight: .medium))
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(shell.ink3)
                                }
                            }
                            .foregroundStyle(shell.ink)
                        }
                        .shellRow(shell)
                    }
                    ForEach(shell.volumes) { volume in
                        Section {
                            DisclosureGroup(isExpanded: Binding(get: { open.contains(volume.key) }, set: { on in if on { open.insert(volume.key) } else { open.remove(volume.key) } })) {
                                ForEach(Array(volume.divisions.enumerated()), id: \.offset) { _, division in
                                    if volume.divisions.count > 1 {
                                        Text(division.name.uppercased()).font(ShellTheme.text(.caption2, weight: .semibold)).kerning(0.8).foregroundStyle(shell.ink3)
                                            .listRowBackground(shell.panel)
                                            .accessibilityAddTraits(.isHeader)
                                    }
                                    ForEach(division.books) { book in
                                        let here = shell.currentVolumeKey == volume.key && shell.book(in: volume, chapterId: shell.currentChapterId)?.id == book.id
                                        Group {
                                            if book.isFrontMatter || book.ch == 1 {
                                                Button { shell.open(volume: volume, book: book, chapter: 1) } label: { BookRow(book: book, here: here) }
                                                    .foregroundStyle(shell.ink)
                                            } else {
                                                NavigationLink(value: LibraryRoute.book(volume.key, book.id)) { BookRow(book: book, here: here) }
                                            }
                                        }
                                        .id(rowId(volume, book))
                                    }
                                }
                            } label: {
                                VolumeRow(volume: volume, here: shell.currentVolumeKey == volume.key)
                            }
                            .tint(shell.here)
                        }
                        .shellRow(shell)
                    }
                }
                .listStyle(.insetGrouped)
                .shellPage()
                .id("library-top")
                .onAppear { focus(proxy) }
                .onChange(of: shell.libraryFocus) { _, _ in focus(proxy) }
            }
            .shellBar("Library")
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
    @EnvironmentObject var shell: WebShell
    let volume: Volume
    /// The volume being read: its name in the "here" colour.
    var here = false
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 6, style: .continuous).fill(shell.chrome)
                Text(volume.short).font(ShellTheme.text(.caption, weight: .semibold)).foregroundStyle(shell.hereChrome)
            }
            .frame(width: 44, height: 56)
            VStack(alignment: .leading, spacing: 3) {
                Text(volume.name).font(ShellTheme.text(.body, weight: here ? .semibold : .medium)).foregroundStyle(here ? shell.here : shell.ink)
                Text(volume.heb).font(ShellTheme.hebrew(15)).foregroundStyle(shell.ink2)
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
                Section(header: Text(division.name).foregroundStyle(shell.ink2)) {
                    ForEach(division.books) { book in
                        let here = shell.currentVolumeKey == volume.key && shell.book(in: volume, chapterId: shell.currentChapterId)?.id == book.id
                        if book.isFrontMatter || book.ch == 1 {
                            Button {
                                shell.open(volume: volume, book: book, chapter: 1)
                            } label: { BookRow(book: book, here: here) }
                            .foregroundStyle(shell.ink)
                        } else {
                            NavigationLink(value: LibraryRoute.book(volume.key, book.id)) { BookRow(book: book, here: here) }
                        }
                    }
                }
                .shellRow(shell)
            }
        }
        .listStyle(.insetGrouped)
        .shellPage()
        .shellBar(volume.name)
    }
}

private struct BookRow: View {
    @EnvironmentObject var shell: WebShell
    let book: Book
    /// The book being read: a mark in the "here" colour before its name.
    var here = false
    var body: some View {
        HStack {
            if here {
                Image(systemName: "book.pages.fill").font(.footnote).foregroundStyle(shell.here)
                    .accessibilityLabel("Reading now")
            }
            Text(book.en).fontWeight(here ? .semibold : .regular)
            Spacer()
            if book.ch > 1 {
                Text("\(book.ch)").font(ShellTheme.text(.footnote)).foregroundStyle(shell.ink3)
            }
            Text(book.heb).font(ShellTheme.hebrew(16)).foregroundStyle(shell.ink2)
        }
    }
}

struct ChaptersView: View {
    @EnvironmentObject var shell: WebShell
    let volume: Volume
    let book: Book
    private let columns = [GridItem(.adaptive(minimum: 52), spacing: 10)]

    /// The chapter the reader is in, when this is its book: marked, and
    /// scrolled into view when the grid opens (the pill brings you here).
    private var hereChapter: Int? {
        guard shell.currentVolumeKey == volume.key, shell.currentChapterId.hasPrefix(book.prefix),
              let n = Int(shell.currentChapterId.dropFirst(book.prefix.count)), n >= 1, n <= book.ch else { return nil }
        return n
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(1...max(book.ch, 1), id: \.self) { n in
                        let here = n == hereChapter
                        Button {
                            shell.open(volume: volume, book: book, chapter: n)
                        } label: {
                            // the Hebrew numeral over the number (user, 2026-09-23): the
                            // Hebrew landing counts chapters in letters, and an English
                            // reader still finds "Alma 32" by its digits
                            VStack(spacing: 1) {
                                Text(hebrewNumeral(n)).font(ShellTheme.hebrew(19))
                                Text("\(n)").font(ShellTheme.text(.footnote, weight: here ? .semibold : .regular))
                            }
                            .frame(maxWidth: .infinity, minHeight: 56)
                            .background(here ? shell.here.opacity(0.14) : shell.card, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(shell.here, lineWidth: here ? 1.5 : 0))
                        }
                        .foregroundStyle(here ? shell.here : shell.ink)
                        .accessibilityLabel(here ? "Chapter \(n), reading now" : "Chapter \(n)")
                        .id(n)
                    }
                }
                .padding(16)
                // a Hebrew count runs right to left: א at the top right (user, 2026-09-23)
                .environment(\.layoutDirection, .rightToLeft)
            }
            .onAppear { if let n = hereChapter { proxy.scrollTo(n, anchor: .center) } }
        }
        .shellPage()
        .shellBar(book.en)
    }
}

/// A chapter number in Hebrew letters, the form the Hebrew landing page shows
/// (tools/build_static_pages.js hebNum): 15 and 16 are ט״ו and ט״ז, a single
/// letter takes a geresh, more take gershayim before the last.
func hebrewNumeral(_ number: Int) -> String {
    guard number > 0, number < 1000 else { return String(number) }
    let hundreds = ["", "ק", "ר", "ש", "ת"], tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"], ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"]
    var n = number, s = ""
    var h = n / 100
    n %= 100
    while h > 4 { s += "ת"; h -= 4 }
    s += hundreds[h]
    if n == 15 { s += "טו" } else if n == 16 { s += "טז" } else { s += tens[n / 10] + ones[n % 10] }
    return s.count == 1 ? s + "׳" : String(s.dropLast()) + "״" + String(s.last!)
}
