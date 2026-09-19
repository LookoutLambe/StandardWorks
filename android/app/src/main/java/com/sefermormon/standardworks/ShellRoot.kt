package com.sefermormon.standardworks

import android.content.res.AssetManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Headphones
import androidx.compose.material.icons.outlined.LibraryBooks
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Replay10
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.delay

/**
 * THE APP'S FRAME — the Android twin of StandardWorks/ShellRoot.swift.
 *
 * Six icons along the bottom, the reader behind them: Library · Read · Search
 * · Notes · Settings · Listen, icons only, drawn on the site's chrome so the
 * page's own navy footer and this row are ONE navy band to the bottom of the
 * glass. The row is sticky: reading (a scroll down) folds the PAGE'S mode row,
 * not this one; listening alone replaces it with the player. The one WebView
 * is always in the tree; the native pages are drawn over it, so the reading
 * and the reader's voice never stop for a tab switch.
 */
@Composable
fun ShellRoot(shell: WebShell) {
    val p = shell.palette
    shell.phoneDark = isSystemInDarkTheme()
    LaunchedEffect(shell.phoneDark, shell.appearance) { shell.applyWantedThemeIfChanged() }

    var splashMinimumPassed by remember { mutableStateOf(false) }
    var splashGaveUp by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(900); splashMinimumPassed = true; delay(3600); splashGaveUp = true }
    val splashShowing = !splashGaveUp && !(shell.firstPageReady && splashMinimumPassed)

    // Back: out of a Library push, then to the reader, then through the reader's own history.
    BackHandler(enabled = shell.tab != WebShell.Tab.READ || shell.webView.canGoBack()) {
        when {
            shell.tab == WebShell.Tab.LIBRARY && shell.libraryPath.isNotEmpty() -> shell.libraryPath.removeAt(shell.libraryPath.lastIndex)
            shell.tab != WebShell.Tab.READ -> shell.tab = WebShell.Tab.READ
            shell.webView.canGoBack() -> shell.webView.goBack()
        }
    }

    val scheme = if (shell.dark) darkColorScheme(primary = p.here, background = p.panel, surface = p.card, onSurface = p.ink, onBackground = p.ink, outline = p.rule)
                 else lightColorScheme(primary = p.here, background = p.panel, surface = p.card, onSurface = p.ink, onBackground = p.ink, outline = p.rule)
    MaterialTheme(colorScheme = scheme) {
        Box(Modifier.fillMaxSize().background(p.chrome)) {
            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.displayCutout).imePadding()) {
                // The status bar sits on chrome; the page begins below it.
                Spacer(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars).background(p.chrome))
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    AndroidView(factory = { shell.webView }, modifier = Modifier.fillMaxSize())
                    when (shell.tab) {
                        WebShell.Tab.LIBRARY -> LibraryView(shell)
                        WebShell.Tab.SEARCH -> SearchView(shell)
                        WebShell.Tab.NOTES -> NotesView(shell)
                        WebShell.Tab.SETTINGS -> SettingsView(shell)
                        WebShell.Tab.READ -> {}
                    }
                }
                // The row, or the player in its place while the page reads.
                if (shell.listening && shell.tab == WebShell.Tab.READ) ListenBar(shell) else ShellTabBar(shell)
                Spacer(Modifier.fillMaxWidth().windowInsetsBottomHeight(WindowInsets.navigationBars).background(p.chrome))
            }
            // THE LOGO BEFORE ANYTHING: the system splash's navy continues here
            // until the first page has loaded, at least 0.9 s, never past 4.5 s.
            AnimatedVisibility(visible = splashShowing, exit = fadeOut(tween(400))) { LaunchSplash() }
        }
    }
}

private data class RowItem(val name: String, val outline: ImageVector, val filled: ImageVector, val tab: WebShell.Tab?)

/** THE ROW: six icons on the chrome, no names; the selected one in the "here" gold. */
@Composable
fun ShellTabBar(shell: WebShell) {
    val p = shell.palette
    val items = listOf(
        RowItem("Library", Icons.Outlined.LibraryBooks, Icons.Filled.LibraryBooks, WebShell.Tab.LIBRARY),
        RowItem("Read", Icons.AutoMirrored.Outlined.MenuBook, Icons.AutoMirrored.Filled.MenuBook, WebShell.Tab.READ),
        RowItem("Search", Icons.Outlined.Search, Icons.Outlined.Search, WebShell.Tab.SEARCH),
        RowItem("Notes", Icons.Outlined.Description, Icons.Filled.Description, WebShell.Tab.NOTES),
        RowItem("Settings", Icons.Outlined.Settings, Icons.Filled.Settings, WebShell.Tab.SETTINGS),
        RowItem("Listen", Icons.Outlined.Headphones, Icons.Outlined.Headphones, null),
    )
    Row(Modifier.fillMaxWidth().background(p.chrome).padding(horizontal = 12.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
        for (item in items) {
            val selected = item.tab != null && item.tab == shell.tab
            Box(
                Modifier.weight(1f).heightIn(min = 52.dp).clip(RoundedCornerShape(12.dp))
                    .clickable { if (item.tab != null) { shell.tab = item.tab; if (item.tab == WebShell.Tab.NOTES) shell.notesVisits++ } else shell.toggleListen() }
                    .semantics { contentDescription = item.name; this.selected = selected },
                contentAlignment = Alignment.Center
            ) {
                Icon(if (selected) item.filled else item.outline, null, tint = if (selected) p.hereChrome else p.onChrome, modifier = Modifier.size(26.dp))
            }
        }
    }
}

/** THE NOW-PLAYING BAR: close · the volume's tile · chapter and voice · back ten seconds · pause. */
@Composable
fun ListenBar(shell: WebShell) {
    val p = shell.palette
    var menu by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().background(p.chrome).padding(horizontal = 6.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        BarButton(p, Icons.Outlined.Close, "Stop listening") { shell.stopListen() }
        Spacer(Modifier.width(4.dp))
        Box(Modifier.size(36.dp).border(1.dp, p.hereChrome, RoundedCornerShape(6.dp)), contentAlignment = Alignment.Center) {
            Text(shell.currentVolume?.heb ?: "כתבי הקדש", color = p.hereChrome, fontSize = 10.sp,
                fontFamily = ShellTheme.hebrew, textAlign = TextAlign.Center, maxLines = 2, lineHeight = 11.sp, modifier = Modifier.padding(2.dp))
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(shell.whereLabel.ifEmpty { "Reading" }, color = p.onChrome, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${shell.currentVolume?.name ?: "Hebrew"} | ${shell.speech.voiceLabel()} ·", color = p.onChrome.copy(alpha = 0.72f), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                Spacer(Modifier.width(4.dp))
                Box {
                    Text(trimRate(shell.listenRate) + "×", color = p.hereChrome, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable { menu = true }.semantics { contentDescription = "Reading speed" })
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                        for (r in shell.listenRates) DropdownMenuItem(text = { Text((if (r == shell.listenRate) "✓ " else "") + trimRate(r) + "×") }, onClick = { shell.chooseListenRate(r); menu = false })
                    }
                }
            }
        }
        BarButton(p, Icons.Outlined.Replay10, "Back ten seconds") { shell.skipListen(back = true) }
        BarButton(p, if (shell.listenPaused) Icons.Outlined.PlayArrow else Icons.Outlined.Pause, if (shell.listenPaused) "Resume" else "Pause") { shell.pauseListen() }
    }
}

private fun trimRate(r: Double): String = if (r == r.toLong().toDouble()) r.toLong().toString() else r.toString().trimEnd('0')

@Composable
private fun BarButton(p: AppShell.Palette, icon: ImageVector, label: String, onClick: () -> Unit) {
    Box(Modifier.size(44.dp).clip(CircleShape).clickable(onClick = onClick).semantics { contentDescription = label }, contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = p.onChrome, modifier = Modifier.size(24.dp))
    }
}

/** The launch screen, continued: the same logo on the same navy until the book is open. */
@Composable
fun LaunchSplash() {
    Box(Modifier.fillMaxSize().background(AppShell.palette("light").chrome), contentAlignment = Alignment.Center) {
        Image(painterResource(R.drawable.launch_logo), null, contentScale = ContentScale.Fit, modifier = Modifier.requiredSize(512.dp))
    }
}

/**
 * A NATIVE PAGE ON THE READER'S PAPER: the navy bar with its title (and a
 * back arrow, or the Search field), the site's panel under the content.
 */
@Composable
fun ShellPage(shell: WebShell, title: String, onBack: (() -> Unit)? = null, barContent: (@Composable () -> Unit)? = null, content: @Composable () -> Unit) {
    val p = shell.palette
    Column(Modifier.fillMaxSize().background(p.panel)) {
        Column(Modifier.fillMaxWidth().background(p.chrome)) {
            Box(Modifier.fillMaxWidth().height(56.dp), contentAlignment = Alignment.Center) {
                if (onBack != null) {
                    Box(Modifier.align(Alignment.CenterStart).padding(start = 8.dp).size(44.dp).clip(CircleShape).clickable(onClick = onBack).semantics { contentDescription = "Back" }, contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, null, tint = p.onChrome)
                    }
                }
                Text(title, color = p.onChrome, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 60.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            barContent?.invoke()
        }
        Box(Modifier.fillMaxSize()) { content() }
    }
}

/** The site's Hebrew face for the native screens: David Libre from app-shell/fonts. */
object ShellTheme {
    lateinit var hebrew: FontFamily
        private set
    fun init(assets: AssetManager) {
        if (::hebrew.isInitialized) return
        hebrew = try {
            FontFamily(
                Font("app-shell/fonts/DavidLibre-Regular.ttf", assets, FontWeight.Normal),
                Font("app-shell/fonts/DavidLibre-Medium.ttf", assets, FontWeight.Medium),
                Font("app-shell/fonts/DavidLibre-Bold.ttf", assets, FontWeight.Bold),
            )
        } catch (e: Exception) { FontFamily.Serif }
    }
}
