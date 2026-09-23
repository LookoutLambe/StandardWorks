package com.sefermormon.standardworks

import android.content.res.AssetManager
import android.app.Activity
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.tappableElement
import android.os.Build
import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.Typography
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.semantics.role
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Velocity
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.launch
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
 * Seven icons along the bottom, the reader behind them: Library · Read ·
 * Search · Notes · Bookmark · Settings · Listen, icons only. THE ROW FLOATS,
 * as on the iPhone (user, 2026-09-20: "see how it optimizes the screen"): a
 * capsule of the chrome over the page, which runs to the bottom of the glass
 * and lifts its own footer above the capsule by the height the shell reports
 * to it (WebShell.bottomOverlay → --sw-app-row-h). The row is sticky: reading
 * (a scroll down) folds the PAGE'S chapter row, not this one; listening alone
 * replaces it with the player.
 *
 * THE BOOK IS ALWAYS UNDERNEATH (user, 2026-09-23: "these tools were to be
 * sliders so it didnt fill up the entire page"). The one WebView is always in
 * the tree; Library and the chapter pill open the page's own drawer, which
 * slides in from the side (WebShell.showLibrary), and Notes and Settings
 * slide up over the book as a panel, half the screen at first, the page still
 * in view and still scrollable above it (PanelSheet) — all but Search, which
 * stays a whole page over the book, the row floating on it ("keep search as
 * a full page"). The reading and the reader's voice never stop for any of it.
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

    // Back: out of a Library push, then down to the book, then the page's
    // drawer shut, then through the reader's own history.
    BackHandler(enabled = shell.tab != WebShell.Tab.READ || shell.drawerOpen || shell.webView.canGoBack()) {
        when {
            shell.tab == WebShell.Tab.LIBRARY && shell.libraryPath.isNotEmpty() -> shell.libraryPath.removeAt(shell.libraryPath.lastIndex)
            shell.tab != WebShell.Tab.READ -> shell.tab = WebShell.Tab.READ
            shell.drawerOpen -> shell.closeDrawer()
            shell.webView.canGoBack() -> shell.webView.goBack()
        }
    }

    // Landscape on a phone is a compact height: the page's chapter row folds
    // at once there (a scroll up still brings it back), as on the iPhone.
    val compactHeight = LocalConfiguration.current.screenHeightDp < 480
    LaunchedEffect(compactHeight) { if (compactHeight && !shell.chromeHidden) shell.setReading(true) }

    // THE STATUS BAR SITS ON WHAT IS UNDER IT: the page's paper over the
    // reader and above a panel (the clock in ink on Light and Sepia), the
    // navy bar over Search. The gesture handle reads on the paper or panel
    // beneath it.
    val onPaper = shell.tab != WebShell.Tab.SEARCH
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
    // ONE FACE (user, 2026-09-23: "everything is to be david font"): David
    // Libre for every native Text that names none, a size up, as it sets
    // smaller than the system face at the same point size (the iPhone's ×1.08).
    val baseDensity = LocalDensity.current
    MaterialTheme(colorScheme = scheme, typography = ShellTheme.typography) {
      CompositionLocalProvider(LocalDensity provides Density(baseDensity.density, baseDensity.fontScale * ShellTheme.SCALE)) {
        val density = LocalDensity.current
        var overlay by remember { mutableStateOf(0.dp) }
        Box(Modifier.fillMaxSize().background(if (onPaper) p.paper else p.chrome)) {
            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.displayCutout).imePadding()) {
                // The status bar's band: the page begins below it.
                Spacer(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars).background(if (onPaper) p.paper else p.chrome))
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    AndroidView(factory = { shell.webView }, modifier = Modifier.fillMaxSize())
                    // Search, the one whole page: it ends where the floating row begins
                    if (shell.tab == WebShell.Tab.SEARCH) {
                        CompositionLocalProvider(LocalRowInset provides overlay) { SearchView(shell) }
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
                        if (shell.listening && shell.tab != WebShell.Tab.SEARCH) {
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
                    // Notes, Settings (and the Library where the page has no
                    // drawer) slide up over the book and the row
                    PanelSheet(shell)
                }
            }
            DisplayOptionsSheet(shell)
            // THE LOGO BEFORE ANYTHING: the system splash's navy continues here
            // until the first page has loaded, at least 0.9 s, never past 4.5 s.
            AnimatedVisibility(visible = splashShowing, exit = fadeOut(tween(400))) { LaunchSplash() }
        }
      }
    }
}

/**
 * THE PANEL OVER THE BOOK: the iPhone's sheet at its two heights. It rises to
 * half the screen, the page still in view and in reach above it (no scrim, so
 * a tap or a scroll up there reaches the book), and to nearly all of it on a
 * drag up or a scroll up in its list; a drag down from the top of its list,
 * or on its bar, lowers it and then puts it away. Its X, Back, or the page's
 * Read put it away too (WebShell.tab).
 */
@Composable
private fun PanelSheet(shell: WebShell) {
    val p = shell.palette
    val showing = shell.tab.isSheet
    // the last panel stays drawn while it slides away
    val last = remember { arrayOf(WebShell.Tab.NOTES) }
    val panel = if (showing) shell.tab.also { last[0] = it } else last[0]
    val bottomInset = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val density = LocalDensity.current
        val fullPx = with(density) { (maxHeight - 10.dp).toPx() }
        val halfPx = with(density) { (maxHeight * 0.52f).toPx() }
        val height = remember { Animatable(0f) }
        val scope = rememberCoroutineScope()
        val rise = spring<Float>(dampingRatio = 1f, stiffness = Spring.StiffnessMediumLow)
        LaunchedEffect(showing, shell.panelFull, fullPx, halfPx) {
            height.animateTo(if (!showing) 0f else if (shell.panelFull) fullPx else halfPx, if (showing) rise else tween(220))
        }
        // where a drag lets go: a fling or the nearer of the two heights, or away
        fun settle(velocity: Float) {
            val h = height.value
            val target = when {
                velocity > 900f -> if (h > halfPx + 40f) halfPx else 0f
                velocity < -900f -> fullPx
                h < halfPx * 0.6f -> 0f
                h > (halfPx + fullPx) / 2f -> fullPx
                else -> halfPx
            }
            if (target == 0f) { shell.tab = WebShell.Tab.READ; return }
            shell.panelFull = target == fullPx
            scope.launch { height.animateTo(target, rise) }
        }
        /** The panel follows the finger by dy (down is +); answers what it took, in the finger's terms. */
        fun dragBy(dy: Float): Float {
            val before = height.value
            val next = (before - dy).coerceIn(0f, fullPx)
            // at once, so the next move of the finger starts from this one
            scope.launch(start = CoroutineStart.UNDISPATCHED) { height.snapTo(next) }
            return before - next
        }
        // the list scrolls first down and the panel first up, as the iPhone's sheet does
        val nested = remember(fullPx, halfPx) {
            object : NestedScrollConnection {
                override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset =
                    if (available.y < 0 && source == NestedScrollSource.UserInput && height.value < fullPx) Offset(0f, dragBy(available.y)) else Offset.Zero
                override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset =
                    if (available.y > 0 && source == NestedScrollSource.UserInput) Offset(0f, dragBy(available.y)) else Offset.Zero
                override suspend fun onPreFling(available: Velocity): Velocity {
                    val h = height.value
                    if (h == fullPx || h == halfPx) return Velocity.Zero
                    settle(available.y)
                    return available
                }
            }
        }
        if (height.value > 0.5f || showing) {
            val shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)
            Column(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth()
                    .height(with(density) { height.value.toDp() })
                    .shadow(16.dp, shape).clip(shape).background(p.chrome)
                    .nestedScroll(nested)
                    .draggable(rememberDraggableState { dragBy(it) }, Orientation.Vertical, onDragStopped = { settle(it) })
            ) {
                // the grip, on the navy of the bar below it
                Box(Modifier.fillMaxWidth().height(18.dp), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(36.dp, 5.dp).clip(CircleShape).background(p.onChrome.copy(alpha = 0.45f)))
                }
                CompositionLocalProvider(LocalRowInset provides bottomInset) {
                    when (panel) {
                        WebShell.Tab.LIBRARY -> LibraryView(shell)
                        WebShell.Tab.SETTINGS -> SettingsView(shell)
                        else -> NotesView(shell)
                    }
                }
            }
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

/** Five pages, and two actions: Bookmark (this chapter, on or off) and Listen. */
private enum class RowKind { PAGE, BOOKMARK, LISTEN }
private data class RowItem(val name: String, val outline: ImageVector, val filled: ImageVector, val kind: RowKind, val tab: WebShell.Tab? = null)

/** THE ROW: seven icons on the chrome, no names; one that is "on" filled, in the "here" gold. */
@Composable
fun ShellTabBar(shell: WebShell) {
    val p = shell.palette
    val view = LocalView.current
    val items = listOf(
        RowItem("Library", Icons.Outlined.LibraryBooks, Icons.Filled.LibraryBooks, RowKind.PAGE, WebShell.Tab.LIBRARY),
        RowItem("Read", Icons.AutoMirrored.Outlined.MenuBook, Icons.AutoMirrored.Filled.MenuBook, RowKind.PAGE, WebShell.Tab.READ),
        RowItem("Search", Icons.Outlined.Search, Icons.Outlined.Search, RowKind.PAGE, WebShell.Tab.SEARCH),
        RowItem("Notes", Icons.Outlined.Description, Icons.Filled.Description, RowKind.PAGE, WebShell.Tab.NOTES),
        RowItem("Bookmark", Icons.Outlined.BookmarkBorder, Icons.Filled.Bookmark, RowKind.BOOKMARK),
        RowItem("Settings", Icons.Outlined.Settings, Icons.Filled.Settings, RowKind.PAGE, WebShell.Tab.SETTINGS),
        RowItem("Listen", Icons.Outlined.Headphones, Icons.Outlined.Headphones, RowKind.LISTEN),
    )
    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        for (item in items) {
            val bookmark = item.kind == RowKind.BOOKMARK
            // "on": the page showing, or this chapter bookmarked
            val on = if (bookmark) shell.chapterBookmarked else item.tab != null && item.tab == shell.tab
            val enabled = !bookmark || shell.canBookmark
            Box(
                Modifier.weight(1f).heightIn(min = 52.dp).clip(RoundedCornerShape(12.dp))
                    .clickable(enabled = enabled) {
                        when (item.kind) {
                            RowKind.LISTEN -> shell.toggleListen()
                            RowKind.BOOKMARK -> {
                                if (!shell.chapterBookmarked) view.performHapticFeedback(if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY)
                                shell.toggleBookmark()
                            }
                            RowKind.PAGE -> {
                                view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                                when (item.tab) {
                                    WebShell.Tab.LIBRARY -> shell.showLibrary()
                                    // back to the book, whatever was over it
                                    WebShell.Tab.READ -> { shell.tab = WebShell.Tab.READ; shell.closeDrawer() }
                                    else -> { shell.tab = item.tab!!; if (item.tab == WebShell.Tab.NOTES) shell.notesVisits++ }
                                }
                            }
                        }
                    }
                    .alpha(if (enabled) 1f else 0.45f)
                    .semantics {
                        contentDescription = if (bookmark) {
                            if (shell.chapterBookmarked) "Remove the bookmark on ${shell.whereLabel}" else "Bookmark ${shell.whereLabel.ifEmpty { "this chapter" }}"
                        } else item.name
                        if (!bookmark) this.selected = on
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(if (on) item.filled else item.outline, null, tint = if (on) p.hereChrome else p.onChrome, modifier = Modifier.size(24.dp))
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
fun ShellPage(shell: WebShell, title: String, onBack: (() -> Unit)? = null, onDone: (() -> Unit)? = null, onClose: (() -> Unit)? = null, barContent: (@Composable () -> Unit)? = null, content: @Composable () -> Unit) {
    val p = shell.palette
    Column(Modifier.fillMaxSize().background(p.panel)) {
        Column(Modifier.fillMaxWidth().background(p.chrome)) {
            Box(Modifier.fillMaxWidth().height(56.dp), contentAlignment = Alignment.Center) {
                if (onBack != null) {
                    Box(Modifier.align(Alignment.CenterStart).padding(start = 8.dp).size(44.dp).clip(CircleShape).clickable(onClick = onBack).semantics { contentDescription = "Back" }, contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, null, tint = p.onChrome)
                    }
                }
                Text(title, color = p.onChrome, fontSize = 17.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = if (onDone != null) 84.dp else 60.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                // a panel's root: its X puts it away, down to the book
                if (onClose != null) {
                    Box(Modifier.align(Alignment.CenterEnd).padding(end = 8.dp).size(44.dp).clip(CircleShape).clickable(onClick = onClose)
                        .semantics { contentDescription = "Close"; role = Role.Button }, contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Cancel, null, tint = p.onChrome.copy(alpha = 0.8f), modifier = Modifier.size(26.dp))
                    }
                }
                if (onDone != null) {
                    Box(Modifier.align(Alignment.CenterEnd).padding(end = 8.dp).heightIn(min = 44.dp).clip(RoundedCornerShape(10.dp)).clickable(role = Role.Button, onClick = onDone).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                        Text("Done", color = p.hereChrome, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            barContent?.invoke()
        }
        Box(Modifier.fillMaxSize().padding(bottom = LocalRowInset.current)) { content() }
    }
}

/**
 * The site's face for the native screens: David Libre from app-shell/fonts,
 * for the Hebrew and, since 2026-09-23, for everything else too.
 */
object ShellTheme {
    /** David Libre sets smaller than the system face at a size: every native size ×1.08, as on the iPhone. */
    const val SCALE = 1.08f
    lateinit var hebrew: FontFamily
        private set
    /** Material's type scale, every style in David Libre. */
    val typography: Typography by lazy {
        val t = Typography()
        val f = hebrew
        Typography(
            displayLarge = t.displayLarge.copy(fontFamily = f), displayMedium = t.displayMedium.copy(fontFamily = f), displaySmall = t.displaySmall.copy(fontFamily = f),
            headlineLarge = t.headlineLarge.copy(fontFamily = f), headlineMedium = t.headlineMedium.copy(fontFamily = f), headlineSmall = t.headlineSmall.copy(fontFamily = f),
            titleLarge = t.titleLarge.copy(fontFamily = f), titleMedium = t.titleMedium.copy(fontFamily = f), titleSmall = t.titleSmall.copy(fontFamily = f),
            bodyLarge = t.bodyLarge.copy(fontFamily = f), bodyMedium = t.bodyMedium.copy(fontFamily = f), bodySmall = t.bodySmall.copy(fontFamily = f),
            labelLarge = t.labelLarge.copy(fontFamily = f), labelMedium = t.labelMedium.copy(fontFamily = f), labelSmall = t.labelSmall.copy(fontFamily = f),
        )
    }
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
