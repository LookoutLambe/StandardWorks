package com.sefermormon.standardworks

import android.content.Context
import android.view.View
import android.webkit.WebView

/**
 * THE READER'S WEB VIEW, which can go on reading with the screen off.
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
