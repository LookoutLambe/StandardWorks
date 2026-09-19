package com.sefermormon.standardworks

import android.content.Context
import android.util.Base64
import androidx.compose.ui.graphics.Color
import org.json.JSONObject

/**
 * THE APP'S OWN SURFACE OVER THE SITE — the Android half.
 *
 * One www folder serves sefermormon.com, the iPhone app and this app, and the
 * site does not change for the apps' sake. Everything that makes this an app
 * rather than the website in a box is injected into the page from app-shell/
 * at the repo root: the same files the iPhone app injects, byte for byte
 * (StandardWorks/AppShell.swift is the full account of every rule in them).
 * This object only reads those files, cuts the palette, and stands up the
 * message ports the scripts post to.
 */
object AppShell {
    /** The flag the shell puts on its very first request, and nothing else ever does. */
    const val BOOT_QUERY = "boot=1"

    /**
     * The bundled site's origin. WebViewAssetLoader serves assets/www at this
     * https origin, so the page keeps localStorage, IndexedDB, its relative
     * paths and its last-read record exactly as on the web — a file:// origin
     * would have lost IndexedDB (the notes) and the fetches.
     */
    const val ORIGIN = "https://appassets.androidplatform.net"
    const val WWW = "$ORIGIN/assets/www/"

    val THEMES = setOf("light", "sepia", "dark")

    // MARK: - palette

    /**
     * THE SITE'S TOKENS PER THEME (reader.css :root, sw_theme.css
     * body.sepia-mode and body.dark-mode), so a native page is cut from the
     * same cloth as the reader beside it. Same values as the iPhone app.
     */
    data class Palette(
        val paper: Color, val panel: Color, val card: Color,
        val ink: Color, val ink2: Color, val ink3: Color, val rule: Color,
        val here: Color, val chrome: Color, val onChrome: Color, val hereChrome: Color
    )

    private fun hex(v: Long) = Color(0xFF000000L or v)

    fun palette(theme: String): Palette = when (theme) {
        "dark" -> Palette(
            paper = hex(0x14120F), panel = hex(0x1C1916), card = hex(0x221E19),
            ink = hex(0xEDE6DA), ink2 = hex(0xB5A896), ink3 = hex(0x9A8D7C), rule = hex(0x3A342C),
            here = hex(0xD9B45F), chrome = hex(0x101823), onChrome = hex(0xE7E0D4), hereChrome = hex(0xE6C87E))
        "sepia" -> Palette(
            paper = hex(0xF4EAD8), panel = hex(0xE8DAC2), card = hex(0xFEF8EA),
            ink = hex(0x2A2318), ink2 = hex(0x5C503C), ink3 = hex(0x665840), rule = hex(0xDCCDB2),
            here = hex(0x7A5412), chrome = hex(0x1B2A41), onChrome = hex(0xF3EDE2), hereChrome = hex(0xDDB768))
        else -> Palette(
            paper = hex(0xFCFAF7), panel = hex(0xF0ECE5), card = hex(0xFBF6EC),
            ink = hex(0x191713), ink2 = hex(0x554E45), ink3 = hex(0x6D655B), rule = hex(0xE2DCD2),
            here = hex(0x8E6215), chrome = hex(0x1B2A41), onChrome = hex(0xF3EDE2), hereChrome = hex(0xDDB768))
    }

    // MARK: - the injected sources

    /** A file from app-shell/, copied into the assets at build (copyShellAssets). */
    fun shellFile(ctx: Context, name: String): String =
        ctx.assets.open("app-shell/$name").bufferedReader().use { it.readText() }

    /** The app's own mark for the bar, as a data URI (app-shell/appmark.png). */
    fun markDataURI(ctx: Context): String? = try {
        "data:image/png;base64," + Base64.encodeToString(ctx.assets.open("app-shell/appmark.png").readBytes(), Base64.NO_WRAP)
    } catch (e: Exception) { null }

    /** shell_mark.js with its placeholder filled. */
    fun markSource(ctx: Context): String? {
        val uri = markDataURI(ctx) ?: return null
        return shellFile(ctx, "shell_mark.js").replace("__SW_MARK_URI__", JSONObject.quote(uri))
    }

    /** Applies a theme through the page's own switch; the page persists it. */
    fun applyThemeScript(theme: String) =
        "window.swApplyTheme && window.swApplyTheme('${if (theme in THEMES) theme else "light"}');"

    /** Asks the page which theme it is showing: "light", "sepia" or "dark". */
    const val CURRENT_THEME_SCRIPT =
        "(window.swCurrentTheme ? String(window.swCurrentTheme()) : (document.body && document.body.classList.contains('dark-mode') ? 'dark' : 'light'))"

    /**
     * THE MESSAGE PORTS. The shared scripts post to
     * window.webkit.messageHandlers.<name>.postMessage(obj), which iOS provides
     * natively; here the same shape is stood up over the AndroidShell
     * JavaScript interface (ShellPort) before any page script runs, so the
     * scripts need no platform branch.
     */
    const val PORT_SHIM = """
(function () {
  if (window.webkit && window.webkit.messageHandlers) return;
  var A = window.AndroidShell;
  if (!A) return;
  function port(name) {
    return { postMessage: function (o) { try { A.postMessage(name, JSON.stringify(o)); } catch (e) {} } };
  }
  window.webkit = { messageHandlers: { swShell: port('swShell'), swSpeech: port('swSpeech') } };
})();
"""

    /**
     * Android has document-start injection but no document-end; the
     * document-end scripts run at DOMContentLoaded instead, from a
     * document-start wrapper. They poll for what they need, so this is the
     * same moment for them as WebKit's.
     */
    fun atDocumentEnd(vararg scripts: String): String =
        "(function(){ function go(){ try { " + scripts.joinToString("\n") { "(function(){ $it })();" } +
            " } catch (e) {} } if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); })();"
}
