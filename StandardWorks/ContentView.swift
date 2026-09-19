import SwiftUI
import StoreKit

struct ContentView: View {
    /// iOS 16+. The deployment target is 16.0, so this is the whole API — there
    /// is no older SKStoreReviewController path to keep.
    @Environment(\.requestReview) private var requestReview

    var body: some View {
        Group {
            if let www = Bundle.main.url(forResource: "www", withExtension: nil),
               FileManager.default.fileExists(atPath: www.appendingPathComponent("index.html").path) {
                // The five tabs and the one web view: see ShellRoot and WebShell.
                ShellRoot(www: www, onPageSettled: {
                    ReviewPrompt.consider { requestReview() }
                })
            } else {
                MissingContentView()
            }
        }
        .onAppear { ReviewPrompt.recordUse() }
    }
}

/// The App Store review prompt, and when it is fair to spend one.
///
/// Apple gives no way to ask whether someone has already rated: requestReview
/// returns nothing, has no callback, and there is no query API — deliberately,
/// on privacy grounds. It does not need one. iOS will not display the sheet to
/// a person who has already rated this version, and it caps the whole thing at
/// three prompts per device per 365 days no matter how often the app asks. So
/// none of the bookkeeping here is about finding reviewers. It is about not
/// spending one of those three asks on someone who has barely opened the book.
///
/// **Launch counts are the wrong signal for a reader.** Opening the app twice
/// is not reading. The gate is DISTINCT DAYS used, and it waits a week besides.
///
/// Nothing here can know whether the sheet appeared, so nothing downstream may
/// assume it did: no thank-you, no follow-up, no "you already rated" state.
enum ReviewPrompt {
    private static let firstUseKey = "review.firstUse"
    private static let daysUsedKey = "review.daysUsed"
    private static let askedKey    = "review.askedForVersion"

    private static let minimumDaysSinceFirstUse = 7
    private static let minimumDistinctDaysUsed  = 5

    /// One ask per launch at most, however many pages settle.
    private static var askedThisLaunch = false

    private static var today: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")   // never the device calendar
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    private static var version: String {
        (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0"
    }

    /// Call once as the app comes up.
    static func recordUse() {
        let store = UserDefaults.standard
        if store.object(forKey: firstUseKey) == nil {
            store.set(Date(), forKey: firstUseKey)
        }
        var days = store.stringArray(forKey: daysUsedKey) ?? []
        // contains(), not last != today: a device whose clock moves backwards
        // would otherwise count the same day twice.
        if !days.contains(today) {
            days.append(today)
            if days.count > 40 { days.removeFirst(days.count - 40) }
            store.set(days, forKey: daysUsedKey)
        }
    }

    /// A page has finished loading and the reader is looking at something they
    /// chose. Two seconds after that is a calm moment; launch is not, and a
    /// button would get the app rejected.
    static func consider(ask: @escaping () -> Void) {
        guard !askedThisLaunch, shouldAsk else { return }
        askedThisLaunch = true
        // Recorded whether or not iOS ends up showing it — the app cannot tell,
        // and asking again on this version would only burn another of the three.
        UserDefaults.standard.set(version, forKey: askedKey)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2, execute: ask)
    }

    private static var shouldAsk: Bool {
        let store = UserDefaults.standard
        guard store.string(forKey: askedKey) != version else { return false }
        guard let first = store.object(forKey: firstUseKey) as? Date else { return false }
        let elapsed = Calendar.current.dateComponents([.day], from: first, to: Date()).day ?? 0
        guard elapsed >= minimumDaysSinceFirstUse else { return false }
        return (store.stringArray(forKey: daysUsedKey) ?? []).count >= minimumDistinctDaysUsed
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
