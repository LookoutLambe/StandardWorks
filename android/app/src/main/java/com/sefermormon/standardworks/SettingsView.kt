package com.sefermormon.standardworks

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat

/**
 * SETTINGS, NATIVE — the iPhone's (SettingsView.swift): Display Options'
 * own sections (DisplayOptions.kt: text size, theme, reading, this chapter),
 * then About. Appearance follows the phone unless a theme is chosen; the
 * choice is only written (WebShell.chooseAppearance) and applied through the
 * page's own switch, and every other control drives the page's own and
 * shows what the page reports back.
 */
@Composable
fun SettingsView(shell: WebShell) {
    val p = shell.palette
    val context = LocalContext.current
    ShellPage(shell, title = "Settings", onClose = { shell.tab = WebShell.Tab.READ }) {
        LazyColumn(contentPadding = PaddingValues(16.dp)) {
            item {
                Column { DisplayOptionsSections(shell) }
                Spacer(Modifier.height(20.dp))
                SectionHeader(p, "About")
                ShellCard(p) {
                    ShellRow(p, onClick = { shareText(context, AppShell.SHARE_MESSAGE, AppShell.SHARE_SUBJECT) }) { Text("Share Sefer Mormon", color = p.ink, fontSize = 17.sp) }
                    Rule(p)
                    ShellRow(p, onClick = { openStoreListing(context) }) { Text("Rate Sefer Mormon", color = p.ink, fontSize = 17.sp) }
                    Rule(p)
                    // In a sheet, never in the reader: loading a website page
                    // into the one web view took the book away — no chapter
                    // pill, no Listen, and the Library lost "Continue reading"
                    // (the iPhone's navigation audit, 2026-09-20).
                    ShellRow(p, onClick = { shell.presentPage("in-print.html") }) { Text("Sefer Mormon in print", color = p.ink, fontSize = 17.sp) }
                    Rule(p)
                    ShellRow(p, onClick = { shell.presentPage("privacy.html") }) { Text("Privacy", color = p.ink, fontSize = 17.sp) }
                }
            }
        }
    }
    shell.sheetPage?.let { SitePageSheet(shell, it) }
}

/**
 * A SITE PAGE OVER THE APP: its own web view, the app's bar, Done — the twin
 * of SitePageSheet in SettingsView.swift. The one web view underneath never
 * navigates, so the reader keeps its place. It covers the whole screen and
 * rises from the bottom edge, as the iPhone's sheet does; back walks the
 * sheet's own pages first, then closes it.
 */
@Composable
fun SitePageSheet(shell: WebShell, path: String) {
    val p = shell.palette
    val close = { shell.sheetPage = null }
    Dialog(onDismissRequest = close, properties = DialogProperties(dismissOnBackPress = false, usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        val view = LocalView.current
        val window = (view.parent as? DialogWindowProvider)?.window
        DisposableEffect(window) {
            window?.let { spanTheGlass(it) }
            onDispose {}
        }
        SideEffect {
            window?.let {
                WindowCompat.getInsetsController(it, view).apply {
                    isAppearanceLightStatusBars = false            // the navy bar
                    isAppearanceLightNavigationBars = !shell.dark  // the page's paper
                }
            }
        }
        var web by remember { mutableStateOf<WebView?>(null) }
        BackHandler { val w = web; if (w != null && w.canGoBack()) w.goBack() else close() }
        // ShellRoot's frame: the status bar on chrome, the page to the bottom edge on its paper.
        Box(Modifier.fillMaxSize().background(p.chrome)) {
            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.displayCutout)) {
                Spacer(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars))
                Box(Modifier.weight(1f)) {
                    CompositionLocalProvider(LocalRowInset provides 0.dp) {
                    ShellPage(shell, title = if (path.startsWith("privacy")) "Privacy" else "In print", onDone = close) {
                        AndroidView(
                            factory = { ctx -> sitePageWebView(ctx, shell, path).also { web = it } },
                            onRelease = { it.destroy() },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    }
                }
                Spacer(Modifier.fillMaxWidth().windowInsetsBottomHeight(WindowInsets.navigationBars).background(p.paper))
            }
        }
    }
}

/**
 * The sheet's window: the whole glass, under the status and navigation bars
 * (the content pads itself by their insets, as ShellRoot does), rising from
 * the bottom edge. A dialog window otherwise stops at the bars, and the dimmed
 * app shows through above the sheet's own bar.
 */
private fun spanTheGlass(w: Window) {
    w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) w.attributes = w.attributes.also { it.fitInsetsTypes = 0 }
    else w.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN)
    w.setWindowAnimations(R.style.SheetAnimation)
}

/**
 * The sheet's web view: the bundled site as the reader serves it, and
 * anything outside the bundle (a store, the mail app) goes to the system.
 * The page is IN THE APP, so it is told so the way the reader is: the port's
 * name stands the site's phone web shell down (pwa_shell.js gates on
 * window.AndroidShell; without it the sheet grew a second six-icon row), and
 * shell_start.js keeps the website's own things on the website (the testers'
 * invitation, the store cards). Nothing else of the reader's: no bar scripts,
 * no speech, and the port is deaf, so the sheet is read and never drives the
 * shell.
 */
@SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
private fun sitePageWebView(ctx: Context, shell: WebShell, path: String): WebView {
    val web = WebView(ctx)
    web.settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        allowFileAccess = false
        allowContentAccess = false
        textZoom = 100
    }
    web.setBackgroundColor(shell.palette.paper.toArgb())
    web.addJavascriptInterface(DeafPort, "AndroidShell")
    val start = listOf(AppShell.shellFile(ctx, "shell_start.js"))
    LocalSiteWebView.injectAtStart(web, start)
    web.webViewClient = LocalSiteWebView.Client(ctx, start)
    web.loadUrl(AppShell.WWW + path)
    return web
}

/** The sheet's port: there, so the page knows it is inside the app; deaf, so the page cannot drive it. */
private object DeafPort {
    @JavascriptInterface
    fun postMessage(name: String, json: String) {}
}

/**
 * RATE opens the store listing, never the in-app review sheet: Google forbids
 * triggering that flow from a button (its quota would silently swallow the tap).
 * The sheet has its own calm moment in ReviewPrompt. The Play app first, the
 * web listing where there is no Play app (an emulator, a de-Googled phone).
 */
private fun openStoreListing(c: Context) {
    val flags = if (c is Activity) 0 else Intent.FLAG_ACTIVITY_NEW_TASK
    val id = Uri.parse(AppShell.PLAY_URL).getQueryParameter("id")
    try {
        c.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$id")).addFlags(flags))
    } catch (e: ActivityNotFoundException) {
        c.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(AppShell.PLAY_URL)).addFlags(flags))
    }
}
