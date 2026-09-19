package com.sefermormon.standardworks

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.ui.graphics.toArgb
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/**
 * THE ONE WEB VIEW, built once at launch (MainActivity) and kept by WebShell,
 * so the reader is already loading while the Library is browsed and never
 * reloads on a tab switch. This mirrors StandardWorks/LocalSiteWebView.swift:
 * the bundled site, the injected scripts in the same order, the paper behind
 * it, the first request with ?boot=1.
 */
object LocalSiteWebView {
    private const val TAG = "SeferMormon"

    @SuppressLint("SetJavaScriptEnabled")
    fun make(activity: Activity, shell: WebShell, wantedTheme: String): WebView {
        val web = WebView(activity)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            // The reader sets its own width; leave its layout alone.
            useWideViewPort = true
            loadWithOverviewMode = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            allowFileAccess = false
            allowContentAccess = false
            textZoom = 100
        }
        web.isVerticalScrollBarEnabled = false
        web.overScrollMode = WebView.OVER_SCROLL_NEVER

        // Paper behind everything, never system white.
        web.setBackgroundColor(AppShell.palette(wantedTheme).paper.toArgb())

        // The bundled site at an https origin (see AppShell.ORIGIN).
        val assets = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(activity))
            .build()

        // The page's messages: the ports the shared scripts post to, and the
        // answers to the shell's own async calls.
        web.addJavascriptInterface(ShellPort(shell), "AndroidShell")

        // Document start, in this order: the ports, the speech shim (the page
        // tests for speechSynthesis as it loads), the visibility guard, the
        // touch/zoom clamps, the shell's own stylesheet and boot redirect, and
        // the document-end pair wrapped to run at DOMContentLoaded.
        val ctx = activity.applicationContext
        val startScripts = listOf(
            AppShell.PORT_SHIM,
            AppShell.shellFile(ctx, "speech_shim.js"),
            FORCE_VISIBLE,
            TOUCH_ACTION,
            VIEWPORT_CLAMP,
            AppShell.shellFile(ctx, "shell_start.js"),
            AppShell.atDocumentEnd(*listOfNotNull(AppShell.shellFile(ctx, "shell_end.js"), AppShell.markSource(ctx)).toTypedArray())
        )
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            for (s in startScripts) WebViewCompat.addDocumentStartJavaScript(web, s, setOf(AppShell.ORIGIN))
        } else {
            Log.w(TAG, "no document-start scripts on this WebView; the shell will inject at commit")
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assets.shouldInterceptRequest(request.url)

            /** Anything that is not the bundled site belongs to the system. */
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.toString().startsWith(AppShell.ORIGIN)) return false
                try { activity.startActivity(Intent(Intent.ACTION_VIEW, url)) } catch (e: Exception) {}
                return true
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                    for (s in startScripts) view.evaluateJavascript(s, null)
                }
            }

            override fun onPageFinished(view: WebView, url: String?) {
                Log.i(TAG, "[WebView] didFinish: $url")
                shell.applyWantedThemeIfChanged()
                shell.matchPaper()
                shell.pageSettled(url ?: "")
            }
        }

        // Reading collapses the page's mode row; a finger, not the page.
        web.setOnScrollChangeListener { _, _, y, _, _ -> shell.onScroll(y) }
        web.setOnTouchListener { _, e -> shell.onTouch(e.actionMasked); false }

        shell.attach(web)
        val first = AppShell.WWW + "index.html?" + AppShell.BOOT_QUERY
        Log.i(TAG, "[WebView] loading $first")
        web.loadUrl(first)
        if (BuildConfig.DEBUG) DebugBridge.start(activity, shell)
        return web
    }

    /** Force the page visible even if its own shell-ready signal never fires. */
    private const val FORCE_VISIBLE = """
(function(){
  function mark(){
    try {
      document.documentElement.classList.add('sw-shell-ready');
      document.documentElement.classList.remove('sw-shell-pending');
    } catch(_){}
  }
  mark();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark);
  setTimeout(mark, 0);
  setTimeout(mark, 300);
})();
"""

    /** pan-y: no double-tap zoom, no sideways drag of the reading area. */
    private const val TOUCH_ACTION = "document.documentElement.style.touchAction = 'pan-y';"

    /**
     * Pinch-to-zoom off, as in the iPhone app: the reader sizes its own text
     * with A+/A-. A user script rather than an edit to the shipped HTML,
     * because the same files serve the website, where pinch-zoom stays.
     */
    private const val VIEWPORT_CLAMP = """
(function () {
  function clamp() {
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return false;
    var m = head.querySelector('meta[name="viewport"]');
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', 'viewport');
      m.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
      head.appendChild(m);
    }
    var c = m.getAttribute('content') || '';
    var parts = c.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      .filter(function (s) { return !/^(user-scalable|minimum-scale|maximum-scale)\s*=/i.test(s); });
    parts.push('minimum-scale=1', 'maximum-scale=1', 'user-scalable=no');
    m.setAttribute('content', parts.join(', '));
    return true;
  }
  if (!clamp()) {
    var obs = new MutationObserver(function () { if (clamp()) obs.disconnect(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', clamp);
})();
"""
}

/**
 * The page's side of the message ports. Called on the WebView's JavaScript
 * thread; everything is handed to the main thread through the shell.
 */
class ShellPort(private val shell: WebShell) {
    @JavascriptInterface
    fun postMessage(name: String, json: String) {
        val body = try { JSONObject(json) } catch (e: Exception) { return }
        shell.post { shell.receive(name, body) }
    }
}
