package com.sefermormon.standardworks

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONArray

/**
 * THE LIBRARY, READ FROM THE SITE'S OWN REGISTRY (nav_engine.js), the way the
 * iPhone app reads it: the VOLUMES literal is cut out of the file by its
 * braces and evaluated by the page's engine (WebShell.loadRegistry). Add a
 * book to the site and the Library has it on the next build.
 */
data class Volume(val key: String, val short: String, val name: String, val heb: String, val page: String, val divisions: List<Division>)
data class Division(val name: String, val books: List<Book>)
data class Book(val id: String, val en: String, val heb: String, val ch: Int, val prefix: String, val isFront: Boolean) {
    /** nav_engine's chapter id for chapter n of this book. */
    fun chapterId(n: Int) = if (isFront) prefix else prefix + n
}

sealed class LibraryRoute {
    data class Vol(val key: String) : LibraryRoute()
    data class Bk(val key: String, val bookId: String) : LibraryRoute()
}

object LibraryRegistry {
    fun parse(arr: JSONArray): List<Volume> {
        val out = ArrayList<Volume>()
        for (i in 0 until arr.length()) {
            val v = arr.optJSONObject(i) ?: continue
            val divs = ArrayList<Division>()
            val da = v.optJSONArray("divisions") ?: JSONArray()
            for (j in 0 until da.length()) {
                val d = da.optJSONObject(j) ?: continue
                val books = ArrayList<Book>()
                val ba = d.optJSONArray("books") ?: JSONArray()
                for (k in 0 until ba.length()) {
                    val b = ba.optJSONObject(k) ?: continue
                    books.add(Book(b.optString("id"), b.optString("en"), b.optString("heb"), b.optInt("ch", 1), b.optString("prefix"), b.optBoolean("isFront", false)))
                }
                divs.add(Division(d.optString("name"), books))
            }
            val page = v.optString("page")
            // The offline pseudo-volume and anything without a page are not books.
            if (page.isEmpty() || divs.isEmpty()) continue
            out.add(Volume(v.optString("key"), v.optString("short"), v.optString("name"), v.optString("heb"), page, divs))
        }
        return out
    }

    /** The `{ … }` literal assigned to `var NAME =`, balanced on braces, quotes respected. */
    fun literal(name: String, js: String): String? {
        val start = js.indexOf("var $name = {")
        if (start < 0) return null
        return balanced(js.indexOf('{', start), js)
    }

    /** `function NAME(...) { … }`, whole. */
    fun function(name: String, js: String): String? {
        val start = js.indexOf("function $name(")
        if (start < 0) return null
        val brace = js.indexOf('{', start)
        val body = balanced(brace, js) ?: return null
        return js.substring(start, brace) + body
    }

    fun balanced(open: Int, js: String): String? {
        var depth = 0; var i = open; var quote: Char? = null; var escaped = false
        while (i < js.length) {
            val c = js[i]
            if (quote != null) {
                if (escaped) escaped = false
                else if (c == '\\') escaped = true
                else if (c == quote) quote = null
            } else if (c == '\'' || c == '"') quote = c
            else if (c == '{') depth++
            else if (c == '}') { depth--; if (depth == 0) return js.substring(open, i + 1) }
            i++
        }
        return null
    }

    /**
     * The book a chapter id belongs to: front matter by its exact id, else
     * the longest prefix whose remainder is one of the book's chapter numbers
     * (`ch3` is 1 Nephi's, `al-ch32` Alma's, never 1 Nephi's `ch`). The twin
     * of WebShell.book(in:chapterId:) on the iPhone.
     */
    fun bookOf(v: Volume, chapterId: String): Book? {
        val books = v.divisions.flatMap { it.books }
        books.firstOrNull { it.isFront && it.prefix == chapterId }?.let { return it }
        return books.filter { b ->
            if (b.isFront || !chapterId.startsWith(b.prefix)) return@filter false
            val n = chapterId.substring(b.prefix.length).toIntOrNull() ?: return@filter false
            n >= 1 && n <= maxOf(b.ch, 1)
        }.maxByOrNull { it.prefix.length }
    }

    /** nav_engine's buildHash: the hash a chapter id is reached by. */
    fun hash(volume: String, chapterId: String, bomHashes: Map<String, String>): String {
        if (volume != "bom" || chapterId.contains("-colophon")) return chapterId
        for (key in bomHashes.keys.sortedByDescending { it.length }) if (chapterId.startsWith(key)) return bomHashes[key] + chapterId.substring(key.length)
        return chapterId
    }
}

// MARK: - views

/**
 * THE LIBRARY, ONE LIST, the iPhone's (Library.swift): "Continue reading" at
 * the top, then the six volumes, every one folded whenever the Library is
 * shown — a volume unfolds to its books where it stands, and only a book of
 * chapters goes one level deeper, to its chapter grid. The reader's volume,
 * book and chapter are marked in the "here" colour at every level.
 */
@Composable
fun LibraryView(shell: WebShell) {
    when (val route = shell.libraryPath.lastOrNull()) {
        null -> VolumesView(shell)
        is LibraryRoute.Vol -> shell.volumes.firstOrNull { it.key == route.key }?.let { BooksView(shell, it) } ?: VolumesView(shell)
        is LibraryRoute.Bk -> {
            val v = shell.volumes.firstOrNull { it.key == route.key }
            val b = v?.divisions?.flatMap { it.books }?.firstOrNull { it.id == route.bookId }
            if (v != null && b != null) ChaptersView(shell, v, b) else VolumesView(shell)
        }
    }
}

/** The book the reader is in, when it is in this volume. */
private fun hereBook(shell: WebShell, volume: Volume): Book? =
    if (shell.currentVolumeKey == volume.key) LibraryRegistry.bookOf(volume, shell.currentChapterId) else null

@Composable
private fun VolumesView(shell: WebShell) {
    val p = shell.palette
    // Which volumes are open: NONE whenever the Library is shown (user,
    // 2026-09-20: "it should just collapse to all books"), and the list at
    // its top — on arrival, and again each time the shell asks (libraryFocus).
    val open = remember { mutableStateListOf<String>() }
    val list = rememberLazyListState()
    LaunchedEffect(shell.libraryFocus) { open.clear(); list.scrollToItem(0) }
    ShellPage(shell, title = "Library", onClose = { shell.tab = WebShell.Tab.READ }) {
        LazyColumn(state = list, contentPadding = PaddingValues(16.dp)) {
            if (shell.whereLabel.isNotEmpty()) {
                item(key = "continue") {
                    ShellCard(p) {
                        ShellRow(p, onClick = { shell.tab = WebShell.Tab.READ }) {
                            Icon(Icons.AutoMirrored.Outlined.MenuBook, null, tint = p.here, modifier = Modifier.size(28.dp))
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text("Continue reading", color = p.ink2, fontSize = 12.sp)
                                Text(shell.whereLabel, color = p.ink, fontSize = 17.sp, fontWeight = FontWeight.Medium)
                            }
                            Chevron(p)
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }
            }
            for (volume in shell.volumes) {
                item(key = "volume-" + volume.key) {
                    val isOpen = volume.key in open
                    val here = shell.currentVolumeKey == volume.key
                    val turn by animateFloatAsState(if (isOpen) 90f else 0f, label = "chevron")
                    ShellCard(p) {
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 72.dp)
                                .clickable { if (isOpen) open.remove(volume.key) else open.add(volume.key) }
                                .semantics { role = Role.Button; stateDescription = if (isOpen) "Expanded" else "Collapsed" }
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(Modifier.size(44.dp, 56.dp).clip(RoundedCornerShape(6.dp)).background(p.chrome), contentAlignment = Alignment.Center) {
                                Text(volume.short, color = p.hereChrome, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(volume.name, color = if (here) p.here else p.ink, fontSize = 17.sp, fontWeight = if (here) FontWeight.SemiBold else FontWeight.Medium)
                                Text(volume.heb, color = p.ink2, fontSize = 15.sp, fontFamily = ShellTheme.hebrew)
                            }
                            Icon(Icons.Outlined.ChevronRight, null, tint = p.here, modifier = Modifier.size(22.dp).rotate(turn))
                        }
                        AnimatedVisibility(visible = isOpen, enter = expandVertically(), exit = shrinkVertically()) {
                            Column {
                                val hereB = hereBook(shell, volume)
                                for (division in volume.divisions) {
                                    if (volume.divisions.size > 1) {
                                        Text(division.name.uppercase(), color = p.ink3, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp,
                                            modifier = Modifier.fillMaxWidth().background(p.panel).padding(horizontal = 16.dp, vertical = 8.dp).semantics { heading() })
                                    }
                                    division.books.forEachIndexed { i, book ->
                                        if (i > 0 || volume.divisions.size == 1) Rule(p)
                                        BookRow(shell, volume, book, here = hereB?.id == book.id)
                                    }
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
            }
            if (shell.volumes.isEmpty()) item { Text("Opening the book…", color = p.ink2, modifier = Modifier.padding(16.dp)) }
        }
    }
}

/**
 * A book: its English, its chapter count and its Hebrew. A book of chapters
 * opens its chapter grid; front matter and a one-chapter book open at once.
 * The reader's book carries the mark before its name.
 */
@Composable
private fun BookRow(shell: WebShell, volume: Volume, book: Book, here: Boolean) {
    val p = shell.palette
    val direct = book.isFront || book.ch == 1
    ShellRow(p, onClick = {
        if (direct) shell.open(volume, book, 1) else shell.libraryPath.add(LibraryRoute.Bk(volume.key, book.id))
    }) {
        if (here) {
            Icon(Icons.AutoMirrored.Filled.MenuBook, "Reading now", tint = p.here, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(book.en, color = p.ink, fontSize = 17.sp, fontWeight = if (here) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.weight(1f))
        if (book.ch > 1) Text("${book.ch}", color = p.ink3, fontSize = 13.sp)
        Spacer(Modifier.width(10.dp))
        Text(book.heb, color = p.ink2, fontSize = 16.sp, fontFamily = ShellTheme.hebrew)
        if (!direct) Chevron(p)
    }
}

@Composable
private fun BooksView(shell: WebShell, volume: Volume) {
    val p = shell.palette
    val hereB = hereBook(shell, volume)
    ShellPage(shell, title = volume.name, onBack = { shell.libraryPath.removeAt(shell.libraryPath.lastIndex) }) {
        LazyColumn(contentPadding = PaddingValues(16.dp)) {
            volume.divisions.forEachIndexed { di, division ->
                item {
                    if (di > 0) Spacer(Modifier.height(20.dp))
                    SectionHeader(p, division.name)
                    ShellCard(p) {
                        division.books.forEachIndexed { i, book ->
                            if (i > 0) Rule(p)
                            BookRow(shell, volume, book, here = hereB?.id == book.id)
                        }
                    }
                }
            }
        }
    }
}

/**
 * A book's chapters as a grid. The chapter the reader is in, when this is
 * its book, is marked and scrolled into the middle of the view (the chapter
 * pill brings you here).
 */
@Composable
private fun ChaptersView(shell: WebShell, volume: Volume, book: Book) {
    val p = shell.palette
    val hereN: Int? = if (shell.currentVolumeKey == volume.key && !book.isFront && shell.currentChapterId.startsWith(book.prefix))
        shell.currentChapterId.substring(book.prefix.length).toIntOrNull()?.takeIf { it in 1..maxOf(book.ch, 1) } else null
    val grid = rememberLazyGridState()
    LaunchedEffect(book.id) {
        val n = hereN ?: return@LaunchedEffect
        grid.scrollToItem(n - 1)
        grid.scrollBy(-(grid.layoutInfo.viewportSize.height / 2f) + 60f)
    }
    ShellPage(shell, title = book.en, onBack = { shell.libraryPath.removeAt(shell.libraryPath.lastIndex) }) {
        // a Hebrew count runs right to left: א at the top right (user, 2026-09-23)
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        LazyVerticalGrid(state = grid, columns = GridCells.Adaptive(52.dp), contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items((1..maxOf(book.ch, 1)).toList()) { n ->
                val here = n == hereN
                val shape = RoundedCornerShape(8.dp)
                val ink = if (here) p.here else p.ink
                Column(Modifier.heightIn(min = 56.dp).clip(shape).background(if (here) p.here.copy(alpha = 0.14f) else p.card)
                    .then(if (here) Modifier.border(1.5.dp, p.here, shape) else Modifier)
                    .clickable { shell.open(volume, book, n) }
                    .semantics(mergeDescendants = true) { contentDescription = if (here) "Chapter $n, reading now" else "Chapter $n" }
                    .padding(vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    // the Hebrew numeral over the number (user, 2026-09-23): the
                    // Hebrew landing counts chapters in letters, and an English
                    // reader still finds "Alma 32" by its digits
                    Text(hebrewNumeral(n), color = ink, fontSize = 19.sp, fontFamily = ShellTheme.hebrew, textAlign = TextAlign.Center, lineHeight = 21.sp)
                    Text("$n", color = ink, fontSize = 13.sp, fontWeight = if (here) FontWeight.Bold else FontWeight.Normal, textAlign = TextAlign.Center, lineHeight = 15.sp)
                }
            }
        }
        }
    }
}

/**
 * A chapter number in Hebrew letters, the form the Hebrew landing page shows
 * (tools/build_static_pages.js hebNum): 15 and 16 are ט״ו and ט״ז, a single
 * letter takes a geresh, more take gershayim before the last. The twin of
 * hebrewNumeral in Library.swift.
 */
fun hebrewNumeral(number: Int): String {
    if (number <= 0 || number >= 1000) return number.toString()
    val hundreds = arrayOf("", "ק", "ר", "ש", "ת")
    val tens = arrayOf("", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ")
    val ones = arrayOf("", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט")
    var n = number
    val s = StringBuilder()
    var h = n / 100
    n %= 100
    while (h > 4) { s.append("ת"); h -= 4 }
    s.append(hundreds[h])
    when (n) {
        15 -> s.append("טו")
        16 -> s.append("טז")
        else -> s.append(tens[n / 10]).append(ones[n % 10])
    }
    return if (s.length == 1) "$s׳" else s.substring(0, s.length - 1) + "״" + s.last()
}

@Composable
fun Chevron(p: AppShell.Palette) {
    Icon(Icons.Outlined.ChevronRight, null, tint = p.ink3, modifier = Modifier.size(20.dp))
}

@Composable
fun Rule(p: AppShell.Palette) {
    Box(Modifier.fillMaxWidth().padding(start = 16.dp).height(1.dp).background(p.rule))
}

@Composable
fun SectionHeader(p: AppShell.Palette, text: String) {
    Text(text, color = p.ink2, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 4.dp, bottom = 8.dp).semantics { heading() })
}

/** A card of rows, the inset-grouped shape. */
@Composable
fun ShellCard(p: AppShell.Palette, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(p.card)) { content() }
}

@Composable
fun ShellRow(p: AppShell.Palette, onClick: (() -> Unit)? = null, content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) { content() }
}
