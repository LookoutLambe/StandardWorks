import Foundation
import JavaScriptCore

/// SEARCH ACROSS ALL SIX VOLUMES, NATIVE.
///
/// The site precomputes one cross-volume verse index for its home page
/// (tools/build_search_index.js → search_index.js: every verse as
/// [deep-link, reference, consonantal Hebrew, English]). The reader pages
/// only index the volume they hold, which is why the Search tab first showed
/// two Old Testament verses for "charity" and none of Moroni 7. This reads
/// the home page's file instead — the whole canon — once, off the main
/// thread, evaluated in JavaScriptCore exactly as the page would evaluate it,
/// and searches it the way the home page does: Hebrew with or without nikkud
/// (points stripped, finals folded, maqqef a space), English case-blind.
final class SearchIndex: ObservableObject {
    struct Row {
        let volume: String
        let link: String       // the reader's deep-link hash
        let ref: String        // "3 Nephi 17:4"
        let heb: String        // consonantal
        let eng: String
    }
    struct Hit: Identifiable {
        let row: Row
        let volumeName: String
        let page: String
        let snippet: String
        var id: String { row.volume + "#" + row.link }
        var path: String { page + "#" + row.link }
    }

    private(set) var volumes: [String] = []
    private var names: [String: String] = [:]
    private var pages: [String: String] = [:]
    private var rows: [String: [Row]] = [:]
    private var lowered: [String: [String]] = [:]
    @Published private(set) var loaded = false
    /// Book name → its place in the canon, from the site's registry (WebShell
    /// sets it), so hits read Genesis before 1 Kings and not in file order.
    var bookOrder: [String: Int] = [:]
    private let queue = DispatchQueue(label: "search-index", qos: .userInitiated)

    init(www: URL) {
        queue.async { [weak self] in self?.load(www: www) }
    }

    private func load(www: URL) {
        guard let js = try? String(contentsOf: www.appendingPathComponent("search_index.js"), encoding: .utf8),
              let ctx = JSContext() else { return }
        ctx.evaluateScript("var window = {};")
        ctx.evaluateScript(js)
        guard let json = ctx.evaluateScript("JSON.stringify(window.SW_SEARCH_INDEX)")?.toString(),
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        let vols = obj["vols"] as? [String] ?? []
        let nm = obj["names"] as? [String: String] ?? [:]
        let pg = obj["pages"] as? [String: String] ?? [:]
        let rw = obj["rows"] as? [String: [[Any]]] ?? [:]
        var out: [String: [Row]] = [:], low: [String: [String]] = [:]
        for v in vols {
            let list = (rw[v] ?? []).compactMap { r -> Row? in
                guard r.count >= 4 else { return nil }
                return Row(volume: v, link: r[0] as? String ?? "", ref: r[1] as? String ?? "",
                           heb: r[2] as? String ?? "", eng: r[3] as? String ?? "")
            }
            out[v] = list
            low[v] = list.map { $0.eng.lowercased() }
        }
        DispatchQueue.main.async {
            self.volumes = vols; self.names = nm; self.pages = pg; self.rows = out; self.lowered = low
            self.loaded = true
        }
    }

    // MARK: - matching, the home page's rules

    private static let points = try! NSRegularExpression(pattern: "[\\u0591-\\u05C7]")
    private static let finals: [Character: Character] = ["\u{05DA}": "\u{05DB}", "\u{05DD}": "\u{05DE}", "\u{05DF}": "\u{05E0}", "\u{05E5}": "\u{05E6}", "\u{05E3}": "\u{05E4}"]

    static func hasHebrew(_ s: String) -> Bool { s.unicodeScalars.contains { (0x0590...0x05FF).contains($0.value) } }

    static func normHeb(_ s: String) -> String {
        var t = s.replacingOccurrences(of: "\u{05C3}", with: "").replacingOccurrences(of: "[", with: "").replacingOccurrences(of: "]", with: "")
        t = points.stringByReplacingMatches(in: t, range: NSRange(t.startIndex..., in: t), withTemplate: "")
        t = t.replacingOccurrences(of: "\u{05BE}", with: " ")
        t = String(t.map { finals[$0] ?? $0 })
        return t.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }

    /// Hits in the site's volume order, at most `perVolume` from each.
    func find(_ query: String, perVolume: Int = 200) -> [Hit] {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard loaded, q.count >= 2 else { return [] }
        let isHeb = Self.hasHebrew(q)
        let nq = isHeb ? Self.normHeb(q) : q.lowercased()
        guard !nq.isEmpty else { return [] }
        var hits: [Hit] = []
        for v in volumes {
            let list = rows[v] ?? [], low = lowered[v] ?? []
            var found: [(Int, Int, Int, Hit)] = []
            for (i, r) in list.enumerated() {
                let hay = isHeb ? r.heb : low[i]
                guard let range = hay.range(of: nq) else { continue }
                let text = isHeb ? r.heb : r.eng
                let (book, ch, vs) = Self.place(r.ref)
                found.append((bookOrder[book] ?? Int.max, ch, vs,
                              Hit(row: r, volumeName: names[v] ?? v, page: pages[v] ?? "",
                                  snippet: Self.snippet(text, around: range, in: hay))))
            }
            // The canon's order, then chapter and verse; the cap after the sort
            // so Genesis is never crowded out by 1 Chronicles.
            found.sort { ($0.0, $0.1, $0.2) < ($1.0, $1.1, $1.2) }
            hits.append(contentsOf: found.prefix(perVolume).map { $0.3 })
        }
        return hits
    }

    /// "1 Kings 3:3" → ("1 Kings", 3, 3)
    static func place(_ ref: String) -> (String, Int, Int) {
        guard let sp = ref.lastIndex(of: " ") else { return (ref, 0, 0) }
        let book = String(ref[..<sp]), cv = ref[ref.index(after: sp)...].split(separator: ":")
        return (book, Int(cv.first ?? "") ?? 0, Int(cv.count > 1 ? cv[1] : "") ?? 0)
    }

    /// A window of the verse around the match; the offsets of the lowered
    /// haystack are the offsets of the text it was lowered from.
    private static func snippet(_ text: String, around range: Range<String.Index>, in hay: String) -> String {
        let start = hay.distance(from: hay.startIndex, to: range.lowerBound)
        let len = hay.distance(from: range.lowerBound, to: range.upperBound)
        let chars = Array(text)
        guard !chars.isEmpty else { return text }
        let lo = max(0, start - 40), hi = min(chars.count, start + len + 90)
        guard lo < hi, hi <= chars.count else { return text }
        return (lo > 0 ? "\u{2026}" : "") + String(chars[lo..<hi]) + (hi < chars.count ? "\u{2026}" : "")
    }
}
