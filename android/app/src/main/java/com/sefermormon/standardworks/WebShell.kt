package com.sefermormon.standardworks

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.MotionEvent
import android.webkit.WebView
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.toArgb
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import kotlin.math.abs

/**
 * ONE WEB VIEW, FIVE TABS — the Android twin of StandardWorks/WebShell.swift.
 *
 * The reader is the site's own pages in a single WebView; the app around it is
 * native Compose. This object is what the two halves share: the web view (made
 * once by LocalSiteWebView and kept here so switching tabs never reloads the
 * book), the site's registry for the native Library, the selected tab, the
 * theme, and the few calls the native tabs make into the page — open a
 * chapter, list the notes, step the text size, read aloud. Every one goes
 * through the page's own globals; the shell never reimplements the page.
 */
class WebShell(private val context: Context) {
    enum class Tab {
        LIBRARY, READ, SEARCH, NOTES, SETTINGS;
        /**
         * What slides up over the book as a sheet (PanelSheet): Search is a
         * whole page; the Library is a sheet only where the page has no drawer.
         */
        val isSheet get() = this == LIBRARY || this == NOTES || this == SETTINGS
    }

    private val main = Handler(Looper.getMainLooper())
    val prefs: SharedPreferences = context.getSharedPreferences("shell", Context.MODE_PRIVATE)

    private var tabState = mutableStateOf(Tab.READ)
    var tab: Tab
        get() = tabState.value
        set(t) {
            val was = tabState.value
            tabState.value = t
            if (t == was) return
            // the Library marks the place: ask the page where it is as it comes up
            if (t == Tab.LIBRARY) refreshWhere()
            // a panel opens at half height, over a closed drawer
            if (t != Tab.READ) { panelFull = false; closeDrawer() }
        }
    /** The panel's height: half the screen (the book in view above it), or all of it. */
    var panelFull by mutableStateOf(false)
    /** The page's drawer is open (shell_end.js, 14): Back closes it first. */
    var drawerOpen by mutableStateOf(false)
        private set
    /** This chapter is among the page's bookmarks (sw-bookmarks-v1): the row's Bookmark is filled. */
    var chapterBookmarked by mutableStateOf(false)
        private set
    /** The Search tab's text, kept here so the tab keeps it across visits. */
    var searchQuery by mutableStateOf("")
    /** Bumped on each visit to Notes, so the tab re-reads the page's stores. */
    var notesVisits by mutableIntStateOf(0)
    /** The site page shown in the sheet over the app (SitePageSheet), or none. */
    var sheetPage by mutableStateOf<String?>(null)
    /** The header's ⋯ (app-shell/shell_end.js, 12) and what it opens: DisplayOptionsSheet. */
    var showDisplayOptions by mutableStateOf(false)
    /**
     * The theme the shell is showing: the page's own ("light", "sepia",
     * "dark"), or the shell's Black or Gray cut of the page's Dark, as last
     * read by matchPaper.
     */
    var theme by mutableStateOf("light")
        private set
    val dark get() = theme == "dark" || theme in AppShell.DARK_VARIANTS
    val palette get() = AppShell.palette(theme)
    /** Settings' choice: "system", or one of AppShell.THEME_ORDER (light, sepia, dark, black, gray). */
    var appearance by mutableStateOf(prefs.getString("shell.appearance", "system") ?: "system")
        private set
    /** The phone's own scheme, as the root composable last saw it. */
    var phoneDark = false

    var volumes by mutableStateOf(listOf<Volume>())
        private set
    var bomHashes: Map<String, String> = emptyMap()
        private set
    /** The first page has finished loading: the launch splash may go. */
    var firstPageReady by mutableStateOf(false)
        private set
    /**
     * Reading: a finger scrolled the page down. The page's mode row collapses
     * while this is set and pops back on a scroll up; the shell's own row
     * stays. Carried to the page as a class on <html>, which the shared
     * stylesheet reads.
     */
    var chromeHidden by mutableStateOf(false)
        private set
    val libraryPath = mutableStateListOf<LibraryRoute>()
    /**
     * Bumped whenever the Library should show the WHOLE library again: every
     * volume folded, the list at its top (LibraryView). The row's Library
     * icon and the chapter pill come here.
     */
    var libraryFocus by mutableIntStateOf(0)
        private set
    /** The chapter the page is showing, for the Read tab's own sense of place. */
    var whereLabel by mutableStateOf("")
        private set
    /**
     * Where the page is, from its own last-read record — the volume key and
     * the chapter id (`bom`, `ch3`) — so the Library can mark the place.
     */
    var currentVolumeKey by mutableStateOf("")
        private set
    var currentChapterId by mutableStateOf("")
        private set
    /**
     * The reading modes the page is showing, as the page reports them
     * ({op:'modes'} from shell_end.js): the layout ("inter", "heb", "dual"),
     * transliteration and vowel points. Display Options shows and sets them;
     * the page's footer no longer carries the five buttons in the app.
     */
    var readLayout by mutableStateOf("inter")
        private set
    var readTranslit by mutableStateOf(true)
        private set
    var readNikkud by mutableStateOf(true)
        private set
    /** The reading size the page shows, 70…150 (its #sizeSlider). */
    var textSize by mutableIntStateOf(100)
        private set
    /** "Full screen on scroll": the header folds with the chapter row while reading. */
    var fullScreenOnScroll by mutableStateOf(prefs.getBoolean("shell.fullScreenOnScroll", false))
        private set
    /**
     * The height, in CSS pixels, of whatever floats over the page's bottom —
     * the row, or the player — handed to the page as --sw-app-row-h so its
     * own footer sits above it and its text ends clear of it.
     */
    var bottomOverlay = 0
        set(v) { if (field != v) { field = v; pushOverlayHeight() } }
    var canListen by mutableStateOf(false); private set
    var listening by mutableStateOf(false); private set
    var listenPaused by mutableStateOf(false); private set
    var listenRates by mutableStateOf(listOf<Double>()); private set
    var listenRate by mutableStateOf(0.0); private set

    val searchIndex = SearchIndex(context)
    val speech = SpeechBridge(context, this)
    lateinit var webView: WebView
        private set

    init {
        // A first launch opens on the landing page, whose covers are the
        // library; every launch after that opens in the book (the boot redirect).
        ListenService.bind(this)
    }

    fun post(r: () -> Unit) { main.post(r) }

    // MARK: - the page

    fun attach(web: WebView) {
        webView = web
        speech.attach(web)
    }

    /** Runs JavaScript in the page and ignores the answer. */
    fun run(js: String) { if (::webView.isInitialized) webView.evaluateJavascript(js, null) }

    /** Runs JavaScript and answers with its value, decoded from the JSON the WebView returns. */
    fun eval(js: String, cb: (Any?) -> Unit) {
        if (!::webView.isInitialized) { cb(null); return }
        webView.evaluateJavascript(js) { raw ->
            val v = try { JSONTokener(raw ?: "null").nextValue() } catch (e: Exception) { null }
            cb(if (v == JSONObject.NULL) null else v)
        }
    }

    private var callSeq = 0
    private val pending = HashMap<Int, (JSONObject?) -> Unit>()

    /** Runs JavaScript that may `await`, and answers with its returned object. */
    fun call(body: String, cb: (JSONObject?) -> Unit) {
        val id = ++callSeq
        pending[id] = cb
        run("(async function(){ $body })().then(function(v){ AndroidShell.postMessage('swCall', JSON.stringify({id:$id, value:v})); }, function(e){ AndroidShell.postMessage('swCall', JSON.stringify({id:$id, value:null})); });")
    }

    /** A message from the page: the ports the shared scripts post to. */
    fun receive(name: String, body: JSONObject) {
        when (name) {
            "swShell" -> when (body.optString("op")) {
                // The chapter pill: the page's drawer at this book — one
                // contents, not two (shell_end.js, 10).
                "chapters" -> openChapters(body.optString("volume"), body.optString("chapter"))
                // a chapter turned by the page itself (shell_end.js, 13)
                "place" -> refreshWhere()
                // the drawer opened or shut (shell_end.js, 14)
                "drawer" -> drawerOpen = body.optBoolean("open")
                "modes" -> {
                    if (body.has("layout")) readLayout = body.optString("layout", readLayout)
                    if (body.has("translit")) readTranslit = body.optBoolean("translit", readTranslit)
                    if (body.has("nikkud")) readNikkud = body.optBoolean("nikkud", readNikkud)
                }
                // the header's ⋯ opens Display Options itself, as on the iPhone
                "more" -> showDisplayOptions = true
                // The page changed its theme (its own ◐ button).
                "theme" -> { matchPaper(); body.optString("theme").takeIf { it.isNotEmpty() }?.let { adoptPageTheme(it) } }
            }
            "swSpeech" -> speech.handle(body)
            "swCall" -> pending.remove(body.optInt("id"))?.invoke(body.optJSONObject("value"))
        }
    }

    // MARK: - theme

    /** The theme the shell wants on the page: Settings' choice, or the phone's under "Match phone". */
    fun wantedTheme(): String = if (appearance in AppShell.THEMES) appearance else if (phoneDark) "dark" else "light"

    fun chooseAppearance(choice: String) {
        appearance = choice
        prefs.edit().putString("shell.appearance", choice).apply()
        applyWantedThemeIfChanged()
    }

    /** The one path a theme choice takes to the page, once per change. */
    fun applyWantedThemeIfChanged() {
        if (!::webView.isInitialized) return
        val want = wantedTheme()
        if (prefs.getString("shell.appliedTheme", null) == want) return
        prefs.edit().putString("shell.appliedTheme", want).apply()
        webView.evaluateJavascript(AppShell.applyThemeScript(want)) { matchPaper() }
    }

    /** The page's paper behind the web view, and the shell's palette, from the page's theme. */
    fun matchPaper() {
        eval(AppShell.CURRENT_THEME_SCRIPT) { v ->
            var t = (v as? String)?.takeIf { it in AppShell.PAGE_THEMES } ?: "light"
            // the page knows only its Dark; Black and Gray are the shell's cuts of it
            if (t == "dark" && appearance in AppShell.DARK_VARIANTS) t = appearance
            if (t != theme) theme = t
            if (::webView.isInitialized) webView.setBackgroundColor(AppShell.palette(t).paper.toArgb())
        }
    }

    /**
     * The page shows a theme: it is now Settings' choice, and counts as
     * applied. A Black or Gray choice is Dark to the page, so the page's Dark
     * leaves it standing.
     */
    private fun adoptPageTheme(t: String) {
        if (t !in AppShell.PAGE_THEMES) return
        val want = wantedTheme()
        if (AppShell.pageTheme(want) == t) {
            prefs.edit().putString("shell.appliedTheme", want).apply()
            return
        }
        prefs.edit().putString("shell.appliedTheme", t).apply()
        appearance = t
        prefs.edit().putString("shell.appearance", t).apply()
    }

    /** "Full screen on scroll", stored by the shell and carried to the page as a class. */
    fun chooseFullScreen(on: Boolean) {
        fullScreenOnScroll = on
        prefs.edit().putBoolean("shell.fullScreenOnScroll", on).apply()
        pushFullScreen()
    }
    private fun pushFullScreen() = run("document.documentElement.classList.toggle('sw-app-fullscreen', $fullScreenOnScroll);")

    private fun pushOverlayHeight() =
        run("document.documentElement.style.setProperty('--sw-app-row-h', '${bottomOverlay}px'); window.dispatchEvent(new Event('resize'));")

    /** The page's reading size, through its own setter (which persists it per volume). */
    fun chooseTextSize(n: Int) {
        val v = n.coerceIn(70, 150)
        if (v == textSize) return
        textSize = v
        run("(function (v) { var s = document.getElementById('sizeSlider'); if (s) s.value = v; if (window.setSize) window.setSize(v); })($v);")
    }

    /**
     * Display Options' reading switches, applied through the page's own (the
     * page then reports the result back, which is what the switches show).
     */
    fun setReading(layout: String, translit: Boolean, nikkud: Boolean) {
        readLayout = layout; readTranslit = translit; readNikkud = nikkud
        run("window.__swSetReading && window.__swSetReading({ layout: ${JSONObject.quote(layout)}, translit: $translit, nikkud: $nikkud });")
    }

    // MARK: - the library

    /**
     * THE LIBRARY IS THE PAGE'S OWN DRAWER (user, 2026-09-23, with
     * screenshots of it: "original design, the 5th picture isnt what i
     * wanted"): it slides in from the side at the reader's volume, the text
     * still in view beside it, with its own search, volume tabs and chapter
     * grids. The native Library is kept for a page with no drawer (the JST).
     * The twin of WebShell.showLibrary on the iPhone.
     */
    fun showLibrary() {
        tab = Tab.READ
        call("if (window.NavEngine && NavEngine.open) { NavEngine.open(); return { ok: true }; } return { ok: false };") { v ->
            if (v?.optBoolean("ok") != true) openNativeLibrary()
        }
    }
    private fun openNativeLibrary() {
        libraryPath.clear()
        libraryFocus++
        tab = Tab.LIBRARY
    }

    /**
     * The chapter pill's destination: the page's drawer at this book's
     * chapters (what the site's own pill does: site_chrome.js, openBooks);
     * the native chapter grid only where the page has no drawer, one level
     * deep, never two — back from the grid is the whole library.
     */
    fun openChapters(volumeKey: String, chapterId: String) {
        if (volumeKey.isNotEmpty()) currentVolumeKey = volumeKey
        if (chapterId.isNotEmpty()) currentChapterId = chapterId
        tab = Tab.READ
        call("if (window.NavEngine && NavEngine.openBooks) { NavEngine.openBooks(); return { ok: true }; } return { ok: false };") { v ->
            if (v?.optBoolean("ok") == true) return@call
            val vol = volumes.firstOrNull { it.key == volumeKey } ?: run { openNativeLibrary(); return@call }
            val b = LibraryRegistry.bookOf(vol, chapterId)
            libraryPath.clear()
            if (b != null && !b.isFront && b.ch > 1) libraryPath.add(LibraryRoute.Bk(vol.key, b.id))
            libraryFocus++
            tab = Tab.LIBRARY
        }
    }

    /** Closes the page's drawer, if it is open. */
    fun closeDrawer() = run("window.NavEngine && NavEngine.close && NavEngine.close();")

    // MARK: - opening

    fun open(volume: Volume, book: Book, chapter: Int) {
        val hash = LibraryRegistry.hash(volume.key, book.chapterId(chapter), bomHashes)
        open(volume.page + "#" + hash)
    }

    /** A root-relative site path (bom/bom.html#1-nephi-3), the way the site spells one. */
    fun open(path: String) {
        tab = Tab.READ
        val file = path.substringBefore('#')
        val fragment = if (path.contains('#')) path.substringAfter('#') else ""
        val current = webView.url?.substringBefore('#')?.substringBefore('?') ?: ""
        if (current == AppShell.WWW + file && fragment.isNotEmpty()) {
            // Same page: a hash change is a chapter turn the page handles itself.
            run("location.hash = ${JSONObject.quote("#$fragment")};")
            main.postDelayed({ refreshWhere() }, 700)
        } else {
            webView.loadUrl(AppShell.WWW + file + (if (fragment.isEmpty()) "" else "#$fragment"))
        }
    }

    /** A site page in a sheet (SettingsView): the reader stays where it is. */
    fun presentPage(path: String) { sheetPage = path }

    fun stepTextSize(delta: Int) { run("window.stepSize && window.stepSize($delta);") }

    /**
     * The chapter's address on the website, for sharing: the twin of
     * WebShell.currentSiteURL on iOS. The bundled origin and any query (the
     * boot flag) are dropped; the hash, which names the chapter, is kept. A page
     * that is not one of the bundled site's own has no address to give.
     */
    val currentSiteUrl: String?
        get() {
            val u = webView.url ?: return null
            if (!u.startsWith(AppShell.WWW)) return null
            val rest = u.removePrefix(AppShell.WWW)
            val path = rest.substringBefore('#').substringBefore('?')
            val hash = rest.substringAfter('#', "")
            return AppShell.SITE_URL + path + (if (hash.isEmpty()) "" else "#$hash")
        }

    /** The study panel's own bookmark button, driven while hidden, as on iOS. */
    fun bookmarkChapter() {
        run("(function(){ var b = document.getElementById('xref-bm-add'); if (b) b.click(); })();")
        main.postDelayed({ refreshWhere() }, 400)
    }

    /**
     * THE ROW'S BOOKMARK (user, 2026-09-23: "can the 6 panel tool add a 7th
     * as bookmark?"): the reader's chapter into the page's own bookmarks —
     * the study panel's Add (#xref-bm-add), which files it with its label
     * and Hebrew name — or out of them on a second tap. The Notes tab lists
     * them. Nothing to bookmark on a page with no chapter (the landing).
     */
    val canBookmark get() = whereLabel.isNotEmpty() && currentChapterId.isNotEmpty()
    fun toggleBookmark() {
        if (!canBookmark) return
        if (chapterBookmarked) {
            run("(function (v, c) { try { var k = 'sw-bookmarks-v1'; var l = JSON.parse(localStorage.getItem(k) || '[]') || []; localStorage.setItem(k, JSON.stringify(l.filter(function (b) { return !(b && b.volume === v && b.chapter === c); }))); if (window.NavEngine && NavEngine.refreshBookmarksUI) NavEngine.refreshBookmarksUI(); } catch (e) {} })(${JSONObject.quote(currentVolumeKey)}, ${JSONObject.quote(currentChapterId)});")
        } else {
            run("(function(){ var b = document.getElementById('xref-bm-add'); if (b) b.click(); })();")
        }
        chapterBookmarked = !chapterBookmarked
        main.postDelayed({ refreshWhere() }, 400)
    }

    // MARK: - a search, walked verse by verse

    /**
     * THE FIND BAR'S WALK, the iPhone's (WebShell.swift, FindWalk): a tap on a
     * Search result starts it with the query and the results in the Search
     * tab's order; the find bar (ShellRoot) steps up and down through them by
     * their deep links, into another book or volume as they fall; the page
     * marks the word in the verse it lands on (shell_end.js, 15); Done or
     * Back ends it.
     */
    class FindWalk(val query: String, val hits: List<SearchIndex.Hit>, val index: Int) {
        val hit get() = hits[index]
    }
    var find by mutableStateOf<FindWalk?>(null)
        private set

    fun startFind(query: String, hits: List<SearchIndex.Hit>, index: Int) {
        if (index !in hits.indices) return
        find = FindWalk(query, hits, index)
        goFind()
    }
    fun stepFind(delta: Int) {
        val f = find ?: return
        if (f.index + delta !in f.hits.indices) return
        find = FindWalk(f.query, f.hits, f.index + delta)
        goFind()
    }
    fun endFind() {
        find = null
        run("window.__swFind && window.__swFind(null);")
    }
    private fun goFind() {
        val f = find ?: return
        open(f.hit.path)
        // a turn within the page fires no page load; a load re-marks in pageSettled
        main.postDelayed({ markFind() }, 350)
    }
    /** The word, marked in the verse on screen; never in the JST, whose verse keys are file positions. */
    fun markFind() {
        val f = find ?: return
        val key = if (f.hit.row.volume == "jst") "" else SearchIndex.place(f.hit.row.ref).let { "${it.first}|${it.second}|${it.third}" }
        run("window.__swFind && window.__swFind({ q: ${JSONObject.quote(f.query)}, key: ${JSONObject.quote(key)} });")
    }

    // MARK: - listen

    fun toggleListen() {
        if (tab != Tab.READ) tab = Tab.READ
        if (!canListen) return
        run("(function(){ var r = window.SWReadAloud; if (!r) return; if (r.playing) r.stop(); else r.play(); })();")
        main.postDelayed({ refreshListen() }, 400)
    }

    fun chooseListenRate(rate: Double) {
        run("window.SWReadAloud && window.SWReadAloud.setRate($rate);")
        listenRate = rate
    }

    fun pauseListen() = press("ra-pause")
    fun skipListen(back: Boolean) = press(if (back) "ra-back" else "ra-fwd")
    fun stopListen() {
        run("window.SWReadAloud && window.SWReadAloud.stop();")
        main.postDelayed({ refreshListen() }, 300)
    }
    private fun press(id: String) {
        run("(function(){ var b = document.getElementById(${JSONObject.quote(id)}); if (b) b.click(); })();")
        main.postDelayed({ refreshListen() }, 300)
    }

    /** The volume the page is showing, by its file, for the player's cover tile. */
    val currentVolume: Volume?
        get() {
            if (!::webView.isInitialized) return null
            val file = webView.url?.substringBefore('#')?.substringBefore('?')?.substringAfterLast('/') ?: return null
            return volumes.firstOrNull { it.page.substringAfterLast('/') == file }
        }

    private val listenPoll = object : Runnable { override fun run() { refreshListen() } }

    fun refreshListen() {
        eval("(function(){ var r = window.SWReadAloud; if (!r) return null; var p = document.getElementById('ra-pause'); return { on: !!r.playing, paused: !!(p && p.getAttribute('aria-pressed') === 'true'), rate: Number(r.rate) || 0, speeds: (r.speeds || []).map(Number) }; })()") { v ->
            val d = v as? JSONObject
            if (d == null) {
                if (listening) {
                    (webView as? ReaderWebView)?.holdVisible = false
                    ListenService.sync(context, null)
                }
                canListen = false; listening = false; main.removeCallbacks(listenPoll)
                return@eval
            }
            canListen = true
            val was = listening
            listening = d.optBoolean("on")
            listenPaused = listening && d.optBoolean("paused")
            if (was != listening) {
                run("document.documentElement.classList.toggle('sw-app-listening', $listening);")
                (webView as? ReaderWebView)?.holdVisible = listening
            }
            // a book reads on from chapter to chapter by itself: the card follows it
            if (listening) refreshWhere()
            ListenService.sync(context, if (listening) ListenService.NowPlaying(
                title = whereLabel.ifEmpty { "Sefer Mormon" },
                artist = currentVolume?.name ?: AppShell.SHARE_SUBJECT,
                paused = listenPaused) else null)
            listenRate = d.optDouble("rate", listenRate)
            val sp = d.optJSONArray("speeds")
            if (sp != null && sp.length() > 0) listenRates = (0 until sp.length()).map { sp.optDouble(it) }
            main.removeCallbacks(listenPoll)
            if (listening) main.postDelayed(listenPoll, 1000)
        }
    }

    // MARK: - chrome that gets out of the way

    private var lastY = 0
    private var touching = false
    private var lastTouchUp = 0L
    private val density = context.resources.displayMetrics.density

    fun onTouch(action: Int) {
        when (action) {
            MotionEvent.ACTION_DOWN -> touching = true
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> { touching = false; lastTouchUp = SystemClock.uptimeMillis() }
        }
    }

    fun onScroll(y: Int) {
        val dy = y - lastY
        lastY = y
        if (y <= 40 * density) { if (chromeHidden) fold(false); return }
        // A finger, not the page: a chapter opened at a verse scrolls itself
        // there, and that must not fold the mode row before reading starts.
        if (!touching && SystemClock.uptimeMillis() - lastTouchUp > 1500) return
        if (abs(dy) < 6 * density) return
        fold(dy > 0)
    }

    private fun fold(hide: Boolean) {
        if (hide == chromeHidden) return
        chromeHidden = hide
        run("document.documentElement.classList.toggle('sw-app-reading', $hide);")
    }

    fun setReading(hide: Boolean) = fold(hide)

    // MARK: - each page

    fun pageSettled(url: String) {
        if (!firstPageReady) {
            // The boot request finishes BEFORE the chapter it redirects to, so
            // it only counts when there is no record to redirect to.
            if (url.contains(AppShell.BOOT_QUERY)) {
                eval("!!localStorage.getItem('sw-last-read')") { v -> if (v != true) firstPageReady = true }
            } else firstPageReady = true
        }
        lastY = webView.scrollY
        if (chromeHidden) fold(false)
        if (volumes.isEmpty()) loadRegistry()
        pushOverlayHeight()
        pushFullScreen()
        refreshWhere()
        refreshListen()
        markFind()
        eval("(function(){ var s = document.getElementById('sizeSlider'); var p = document.getElementById('page'); var v = s ? parseInt(s.value, 10) : NaN; if (isNaN(v) && p) v = parseInt(p.style.fontSize, 10); return isNaN(v) ? 100 : v; })()") { v ->
            (v as? Number)?.toInt()?.let { textSize = it }
        }
        ReviewPrompt.consider(context)
    }

    fun refreshWhere() {
        eval("(document.getElementById('sw-chrome-chapter') || {}).textContent || ''") { v ->
            val w = ((v as? String) ?: "").replace("▾", "").trim()
            if (w != whereLabel) whereLabel = w
        }
        // and the place itself, as the page records it on every chapter, and
        // whether it is among the page's bookmarks
        eval("(function(){ try { var g = JSON.parse(localStorage.getItem('sw-last-read') || 'null'); if (!g || !g.volume || !g.chapter) return null; var b = JSON.parse(localStorage.getItem('sw-bookmarks-v1') || '[]') || []; var on = b.some(function (x) { return x && x.volume === g.volume && x.chapter === g.chapter; }); return [String(g.volume), String(g.chapter), on ? '1' : '0']; } catch (e) { return null; } })()") { v ->
            val a = v as? JSONArray ?: return@eval
            if (a.length() != 3) return@eval
            a.optString(0).let { if (it != currentVolumeKey) currentVolumeKey = it }
            a.optString(1).let { if (it != currentChapterId) currentChapterId = it }
            (a.optString(2) == "1").let { if (it != chapterBookmarked) chapterBookmarked = it }
        }
    }

    /**
     * The site's registry, read from nav_engine.js the way the iPhone app
     * reads it: the `var VOLUMES = {…}` literal cut out by its braces (it
     * lives inside a closure, so the page cannot be asked for it) and
     * evaluated by the page's own engine, with toHebNum, which the D&C's 138
     * sections are named by. No second copy of the table.
     */
    private fun loadRegistry() {
        val js = try { context.assets.open("www/nav_engine.js").bufferedReader().use { it.readText() } } catch (e: Exception) { return }
        val vol = LibraryRegistry.literal("VOLUMES", js) ?: return
        val hashes = LibraryRegistry.literal("BOM_HASHES", js) ?: "{}"
        val helper = LibraryRegistry.function("toHebNum", js) ?: ""
        eval("(function(){ $helper var VOLUMES = $vol; var BOM_HASHES = $hashes; return JSON.stringify({ vols: Object.keys(VOLUMES).map(function (k) { return VOLUMES[k]; }), hashes: BOM_HASHES }); })()") { v ->
            val text = v as? String ?: return@eval
            val obj = try { JSONObject(text) } catch (e: Exception) { return@eval }
            val list = LibraryRegistry.parse(obj.optJSONArray("vols") ?: JSONArray())
            val h = obj.optJSONObject("hashes") ?: JSONObject()
            bomHashes = h.keys().asSequence().associateWith { h.optString(it) }
            volumes = list
            var n = 0
            val order = HashMap<String, Int>()
            for (vv in list) for (d in vv.divisions) for (b in d.books) if (order[b.en] == null) order[b.en] = n++
            order.putIfAbsent("D&C", n)
            searchIndex.bookOrder = order
        }
    }
}
