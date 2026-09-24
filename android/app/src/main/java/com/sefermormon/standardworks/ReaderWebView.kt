package com.sefermormon.standardworks

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView

/**
 * A WEB VIEW FOR THE SITE'S PAGES — the reader's, which can go on reading
 * with the screen off, and the site-page sheet's (SettingsView).
 *
 * IT FILLS ITS PLACE, SAID IN ITS LAYOUT PARAMS. Compose's AndroidView adds a
 * view with the ViewGroup default, WRAP_CONTENT, and the WebView reads a
 * WRAP_CONTENT height as "size to the page": it lays the page out at zero
 * height, so every vh on the page came out 0 — the word card's max-height of
 * 78vh made it a sliver (user, 2026-09-24: "the score card doesnt open all
 * the way its a sliver"), and every panel sized in vh with it. innerHeight
 * was right all along; only the viewport units were zero. MATCH_PARENT gives
 * the page the view's real height.
 *
 * Chromium treats a web view whose window is out of sight — the screen off,
 * another app in front — as a hidden page, and throttles its timers. The
 * reading walks from phrase to phrase on the page's timers (the breath after
 * a full stop, the wait for the next chapter to arrive), so with the screen
 * off it slowed to a halt even while the process was kept alive
 * (ListenService). While the page reads aloud the shell holds its window
 * "visible" for it; the moment the reading stops, the real visibility is
 * handed back and the page sleeps as any hidden page does.
 */
class ReaderWebView(context: Context) : WebView(context) {
    init {
        layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    }

    var holdVisible = false
        set(v) {
            if (field == v) return
            field = v
            dispatchWindowVisibilityChanged(windowVisibility)
        }

    override fun onWindowVisibilityChanged(visibility: Int) {
        super.onWindowVisibilityChanged(if (holdVisible) View.VISIBLE else visibility)
    }
}
