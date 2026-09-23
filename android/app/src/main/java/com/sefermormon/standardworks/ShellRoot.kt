package com.sefermormon.standardworks

import android.content.res.AssetManager
import android.app.Activity
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.tappableElement
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import kotlin.math.roundToInt
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
import androidx.compose.ui.semantics.Role
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
 * · Notes · Settings · Listen, icons only. THE ROW FLOATS, as on the iPhone
 * (user, 2026-09-20: "see how it optimizes the screen"): a capsule of the
 * chrome over the page, which runs to the bottom of the glass and lifts its
 * own footer above the capsule by the height the shell reports to it
 * (WebShell.bottomOverlay → --sw-app-row-h). The row is sticky: reading (a
 * scroll down) folds the PAGE'S chapter row, not this one; listening alone
 * replaces it with the player. The one WebView is always in the tree; the
 * native pages are drawn over it, so the reading and the reader's voice never
 * stop for a tab switch.
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

    // Landscape on a phone is a compact height: the page's chapter row folds
    // at once there (a scroll up still brings it back), as on the iPhone.
    val compactHeight = LocalConfiguration.current.screenHeightDp < 480
    LaunchedEffect(compactHeight) { if (compactHeight && !shell.chromeHidden) shell.setReading(true) }

    // THE STATUS BAR SITS ON WHAT IS UNDER IT: the page's paper over the
    // reader (the clock in ink on Light and Sepia), the navy bar over a native
    // page. The gesture handle reads on the paper or panel beneath it.
    val onPaper = shell.tab == WebShell.Tab.READ
    val view = LocalView.current
    val gestureNav = WindowInsets.tappableElement.getBottom(LocalDensity.current) == 0
    SideEffect {
        (view.context as? Activity)?.window?.let { w ->
            WindowCompat.getInsetsController(w, view).apply {
                isAppearanceLightStatusBars = onPaper && !shell.dark
                isAppearanceLightNavigationBars = gestureNav && !shell.dark
            }
        }
    }

    val scheme = if (shell.dark) darkColorScheme(primary = p.here, background = p.panel, surface = p.card, onSurface = p.ink, onBackground = p.ink, outline = p.rule)
                 else lightColorScheme(primary = p.here, background = p.panel, surface = p.card, onSurface = p.ink, onBackground = p.ink, outline = p.rule)
    MaterialTheme(colorScheme = scheme) {
        val density = LocalDensity.current
        var overlay by remember { mutableStateOf(0.dp) }
        Box(Modifier.fillMaxSize().background(if (onPaper) p.paper else p.chrome)) {
            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.displayCutout).imePadding()) {
                // The status bar's band: the page begins below it.
                Spacer(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars).background(if (onPaper) p.paper else p.chrome))
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    AndroidView(factory = { shell.webView }, modifier = Modifier.fillMaxSize())
                    // the native pages end where the floating row begins
                    CompositionLocalProvider(LocalRowInset provides overlay) {
                        when (shell.tab) {
                            WebShell.Tab.LIBRARY -> LibraryView(shell)
                            WebShell.Tab.SEARCH -> SearchView(shell)
                            WebShell.Tab.NOTES -> NotesView(shell)
                            WebShell.Tab.SETTINGS -> SettingsView(shell)
                            WebShell.Tab.READ -> {}
                        }
                    }
                    // The row, or the player in its place while the page reads:
                    // a capsule above the gesture bar, inset from the edges.
                    val bottomGap = maxOf(WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding(), 10.dp)
                    Box(
                        Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                            .padding(start = 12.dp, end = 12.dp, top = 4.dp, bottom = bottomGap)
                            .onSizeChanged { size ->
                                // the row's height plus the gaps around it, in the page's CSS pixels (= dp)
                                val h = with(density) { size.height.toDp() } + 4.dp + bottomGap
                                overlay = h
                                shell.bottomOverlay = h.value.roundToInt()
                            }
                    ) {
                        if (shell.listening && shell.tab == WebShell.Tab.READ) {
                            Box(Modifier.fillMaxWidth().shadow(10.dp, RoundedCornerShape(26.dp)).clip(RoundedCornerShape(26.dp)).background(floatingChrome(p))) {
                                ListenBar(shell)
                            }
                        } else {
                            Box(Modifier.fillMaxWidth().height(58.dp).shadow(10.dp, CircleShape).clip(CircleShape).background(floatingChrome(p)),
                                contentAlignment = Alignment.Center) {
                                ShellTabBar(shell)
                            }
                        }
                    }
                }
            }
            DisplayOptionsSheet(shell)
            // THE LOGO BEFORE ANYTHING: the system splash's navy continues here
            // until the first page has loaded, at least 0.9 s, never past 4.5 s.
            AnimatedVisibility(visible = splashShowing, exit = fadeOut(tween(400))) { LaunchSplash() }
        }
    }
}

/**
 * How far the floating row rises from the bottom of the glass, for the
 * native pages under it: ShellPage ends its content there.
 */
val LocalRowInset = compositionLocalOf { 0.dp }

/**
 * THE CHROME THAT FLOATS OVER THE TEXT. On the iPhone it is glass — the
 * system blur, darkened, with 60% of the chrome over it. Android draws no
 * blur behind a native view over a WebView, so this is the colour that
 * glass comes to over the page's paper (60% chrome over the paper at 70%),
 * nearly opaque: the same slate on the paper, the same navy in the dark,
 * and the on-chrome ink stays above 4.5:1 with no text showing through.
 */
fun floatingChrome(p: AppShell.Palette): Color {
    val c = p.chrome; val paper = p.paper
    fun mix(a: Float, b: Float) = a * 0.6f + b * 0.7f * 0.4f
    return Color(mix(c.red, paper.red), mix(c.green, paper.green), mix(c.blue, paper.blue), 0.97f)
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
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        for (item in items) {
            val selected = item.tab != null && item.tab == shell.tab
            Box(
                Modifier.weight(1f).heightIn(min = 52.dp).clip(RoundedCornerShape(12.dp))
                    .clickable {
                        when (item.tab) {
                            null -> shell.toggleListen()
                            // the whole library, folded, every time — tapped again while there too
                            WebShell.Tab.LIBRARY -> shell.showLibrary()
                            else -> { shell.tab = item.tab; if (item.tab == WebShell.Tab.NOTES) shell.notesVisits++ }
                        }
                    }
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
    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
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
 * back arrow, or the Search field, or Done for a sheet), the site's panel
 * under the content.
 */
@Composable
fun ShellPage(shell: WebShell, title: String, onBack: (() -> Unit)? = null, onDone: (() -> Unit)? = null, barContent: (@Composable () -> Unit)? = null, content: @Composable () -> Unit) {
    val p = shell.palette
    Column(Modifier.fillMaxSize().background(p.panel)) {
        Column(Modifier.fillMaxWidth().background(p.chrome)) {
            Box(Modifier.fillMaxWidth().height(56.dp), contentAlignment = Alignment.Center) {
                if (onBack != null) {
                    Box(Modifier.align(Alignment.CenterStart).padding(start = 8.dp).size(44.dp).clip(CircleShape).clickable(onClick = onBack).semantics { contentDescription = "Back" }, contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, null, tint = p.onChrome)
                    }
                }
                Text(title, color = p.onChrome, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = if (onDone != null) 84.dp else 60.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (onDone != null) {
                    Box(Modifier.align(Alignment.CenterEnd).padding(end = 8.dp).heightIn(min = 44.dp).clip(RoundedCornerShape(10.dp)).clickable(role = Role.Button, onClick = onDone).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                        Text("Done", color = p.hereChrome, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            barContent?.invoke()
        }
        Box(Modifier.fillMaxSize().padding(bottom = LocalRowInset.current)) { content() }
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
