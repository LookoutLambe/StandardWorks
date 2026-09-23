import UIKit
import WebKit

/// THE APP'S OWN SURFACE OVER THE SITE.
///
/// One www folder serves sefermormon.com and this app, and the site does not
/// change for the app's sake (user, 2026-09-18: "do not change the website").
/// So everything that makes this an app rather than the website in a box
/// lives HERE, injected into the page from the shell as scripts and styles:
/// nothing in www knows about it, and sync-www.sh cannot sweep it away because
/// none of it is a file in www.
///
/// What the shell adds, and why, in the order a reader meets it:
///
///  1. It opens in the book. The site's landing is a home page — cover, verse
///     of the day, six cards, then prose about the edition, a store, a
///     copyright line. An app opens where you left off. The first load asks
///     for index.html with `?boot=1`; the document-start script sees that
///     flag, reads the page's own `sw-last-read` record, and replaces the
///     landing with that chapter before the landing can paint. Without a
///     record (first launch ever) the landing stays, trimmed by the styles
///     below to the cover and the six books.
///
///  2. The page fills the screen. ContentView lets the web view run under the
///     status bar and the home indicator; the site already pads its bars by
///     `env(safe-area-inset-*)`, which WebKit fills in because the viewport
///     script in LocalSiteWebView sets `viewport-fit=cover`. The navy bar
///     reaches the top of the glass and the status bar sits on it.
///
///  3. It follows the phone. The system's light/dark appearance is applied to
///     the page through its own `swApplyTheme` — once per change of the
///     system setting, never on every page, so a theme chosen by hand in the
///     app (sepia, say) stays until the phone itself changes.
///
///  4. No white frames. The web view's background is the page's paper, so a
///     page that has not painted yet shows paper, and the launch does not
///     flash white between the launch screen and the first page.
///
///  5. Website things stay on the website: the App Store card, the Android
///     invitation, the Safari home-screen tip, the store bag in the bar, the
///     landing's prose, the sources and the colophon.
///
///  6. The bar says what the App Store says: Sefer Mormon: Standard Works.
enum AppShell {

    /// The flag the shell puts on its very first request, and nothing else
    /// ever does: it is how the boot script tells a cold start from a reader
    /// who tapped the mark to come back to the landing on purpose.
    static let bootQuery = "boot=1"

    // MARK: - out of the app

    /// WHERE THE APP POINTS OUTWARD: the site, both stores, and the one message
    /// "Share Sefer Mormon" sends. The twin of the same constants in
    /// android/app/src/main/java/com/sefermormon/standardworks/AppShell.kt;
    /// change the two together. The message names all three doors, because the
    /// person it is sent to may carry either phone.
    static let siteURL = "https://sefermormon.com/"
    static let appStoreURL = "https://apps.apple.com/app/id6767954376"
    static let playURL = "https://play.google.com/store/apps/details?id=com.sefermormon.standardworks"
    static let shareSubject = "Sefer Mormon: Standard Works"
    static let shareMessage = """
        Sefer Mormon: Standard Works. The scriptures in Hebrew, with the English and a transliteration under every word.

        iPhone and iPad: \(appStoreURL)
        Android: \(playURL)
        On the web: \(siteURL)
        """

    /// RATE opens the App Store's write-a-review page, never the review sheet:
    /// Apple asks that requestReview never answer a tap, and the sheet already
    /// has its own calm moment in ReviewPrompt (ContentView.swift).
    static let writeReviewURL = URL(string: appStoreURL + "?action=write-review")!

    // MARK: - palette

    /// THE SITE'S TOKENS PER THEME (reader.css :root, sw_theme.css
    /// body.sepia-mode and body.dark-mode), so a native page is cut from the
    /// same cloth as the reader beside it: paper and panel under it, cards on
    /// it, ink on those, "here" for a mark on paper, and the chrome band with
    /// its own ink and gold. Sepia and Dark reach every tab through this, not
    /// the reading alone (translator, 2026-09-19: "the sepia and the dark
    /// doesnt hit anything except the reading areas... its not good").
    /// Chrome is the same navy in light and sepia and deepens in dark so the
    /// bar stays darker than the page it frames.
    struct Palette {
        let paper, panel, card, ink, ink2, ink3, rule, here, chrome, onChrome, hereChrome: UIColor
    }
    /// The themes the shell offers: the site's three, and two cuts of its
    /// dark one (AppShell's stylesheet: html.sw-app-theme-black / -gray).
    static let themes = ["light", "sepia", "dark", "black", "gray"]
    static let darkVariants: Set<String> = ["black", "gray"]

    static func palette(theme: String) -> Palette {
        switch theme {
        case "black":
            return Palette(paper: hex(0x000000), panel: hex(0x0A0A0A), card: hex(0x141414),
                           ink: hex(0xEDE6DA), ink2: hex(0xB5A896), ink3: hex(0x9A8D7C), rule: hex(0x2A2A2A),
                           here: hex(0xD9B45F), chrome: hex(0x050810), onChrome: hex(0xE7E0D4), hereChrome: hex(0xE6C87E))
        case "gray":
            return Palette(paper: hex(0x2B2B2E), panel: hex(0x343437), card: hex(0x3C3C40),
                           ink: hex(0xF1ECE3), ink2: hex(0xC4BBAD), ink3: hex(0xA79E91), rule: hex(0x4A4A4E),
                           here: hex(0xE6C87E), chrome: hex(0x1C1D21), onChrome: hex(0xE7E0D4), hereChrome: hex(0xE6C87E))
        case "dark":
            return Palette(paper: hex(0x14120F), panel: hex(0x1C1916), card: hex(0x221E19),
                           ink: hex(0xEDE6DA), ink2: hex(0xB5A896), ink3: hex(0x9A8D7C), rule: hex(0x3A342C),
                           here: hex(0xD9B45F), chrome: hex(0x101823), onChrome: hex(0xE7E0D4), hereChrome: hex(0xE6C87E))
        case "sepia":
            return Palette(paper: hex(0xF4EAD8), panel: hex(0xE8DAC2), card: hex(0xFEF8EA),
                           ink: hex(0x2A2318), ink2: hex(0x5C503C), ink3: hex(0x665840), rule: hex(0xDCCDB2),
                           here: hex(0x7A5412), chrome: hex(0x1B2A41), onChrome: hex(0xF3EDE2), hereChrome: hex(0xDDB768))
        default:
            return Palette(paper: hex(0xFCFAF7), panel: hex(0xF0ECE5), card: hex(0xFBF6EC),
                           ink: hex(0x191713), ink2: hex(0x554E45), ink3: hex(0x6D655B), rule: hex(0xE2DCD2),
                           here: hex(0x8E6215), chrome: hex(0x1B2A41), onChrome: hex(0xF3EDE2), hereChrome: hex(0xDDB768))
        }
    }
    private static func hex(_ v: Int) -> UIColor {
        UIColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: 1)
    }

    /// The page's own background per theme, so what shows through before and
    /// between pages is paper, not system white or system black.
    static func paper(theme: String) -> UIColor { palette(theme: theme).paper }

    // MARK: - scripts

    /// Applies a theme ("light", "sepia", "dark") through the page's own
    /// switch. The page persists it, so it also survives into the next page
    /// and the next launch.
    static func applyThemeScript(theme: String) -> String {
        let base = ["light", "sepia", "dark"].contains(theme) ? theme : (darkVariants.contains(theme) ? "dark" : "light")
        let variant = darkVariants.contains(theme) ? theme : ""
        // the page's own switch for the base theme; the variant is the shell's
        // class on <html>, remembered so the start script restores it before paint
        return "window.swApplyTheme && window.swApplyTheme('\(base)'); (function (v) { var h = document.documentElement; h.classList.remove('sw-app-theme-black', 'sw-app-theme-gray'); try { if (v) { h.classList.add('sw-app-theme-' + v); localStorage.setItem('sw-app-dark-variant', v); } else { localStorage.removeItem('sw-app-dark-variant'); } } catch (e) {} })('\(variant)');"
    }

    /// Asks the page which theme it is showing: "light", "sepia" or "dark".
    static let currentThemeScript =
        "(window.swCurrentTheme ? String(window.swCurrentTheme()) : (document.body && document.body.classList.contains('dark-mode') ? 'dark' : 'light'))"

    // MARK: - the injected sources

    /// THE SHELL'S SCRIPTS ARE FILES, in app-shell/ at the repo root, and both
    /// apps load the same files: this one from the bundle (the folder ships
    /// as a folder reference), the Android app from its assets. One source,
    /// so "exactly the same" is by construction, not by copying.
    static func shellFile(_ name: String) -> String {
        guard let url = Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "app-shell"),
              let s = try? String(contentsOf: url, encoding: .utf8) else {
            assertionFailure("app-shell/\(name) is missing from the bundle")
            return ""
        }
        return s
    }

    /// Document start, main frame only: the boot redirect and the app-only
    /// stylesheet (shell_start.js).
    static var documentStartSource: String { shellFile("shell_start.js") }

    /// Document end, main frame only: the bar's measured height, the mark as
    /// the Library, the theme message, the App Store name (shell_end.js).
    static var documentEndSource: String { shellFile("shell_end.js") }

    /// THE MARK IN THE BAR IS THE APP'S: the icon's art (app-shell/appmark.png,
    /// its navy knocked out, 3:2) drawn at 66×44 in place of the website's
    /// open book (translator, 2026-09-19). shell_mark.js takes the data URI.
    static func markSource(dataURI: String) -> String {
        shellFile("shell_mark.js").replacingOccurrences(of: "__SW_MARK_URI__", with: jsString(dataURI))
    }
    static var markData: Data? {
        Bundle.main.url(forResource: "appmark", withExtension: "png", subdirectory: "app-shell").flatMap { try? Data(contentsOf: $0) }
    }

}
