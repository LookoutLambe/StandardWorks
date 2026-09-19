package com.sefermormon.standardworks

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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

    /** nav_engine's buildHash: the hash a chapter id is reached by. */
    fun hash(volume: String, chapterId: String, bomHashes: Map<String, String>): String {
        if (volume != "bom" || chapterId.contains("-colophon")) return chapterId
        for (key in bomHashes.keys.sortedByDescending { it.length }) if (chapterId.startsWith(key)) return bomHashes[key] + chapterId.substring(key.length)
        return chapterId
    }
}

// MARK: - views

/** Volumes → books → chapters, three pushes; every row the registry's own English and Hebrew. */
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

@Composable
private fun VolumesView(shell: WebShell) {
    val p = shell.palette
    ShellPage(shell, title = "Library") {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(0.dp)) {
            if (shell.whereLabel.isNotEmpty()) {
                item {
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
            item { SectionHeader(p, "Volumes") }
            item {
                ShellCard(p) {
                    shell.volumes.forEachIndexed { i, volume ->
                        if (i > 0) Rule(p)
                        ShellRow(p, onClick = { shell.libraryPath.add(LibraryRoute.Vol(volume.key)) }) {
                            Box(Modifier.size(44.dp, 56.dp).clip(RoundedCornerShape(6.dp)).background(p.chrome), contentAlignment = Alignment.Center) {
                                Text(volume.short, color = p.hereChrome, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(volume.name, color = p.ink, fontSize = 17.sp, fontWeight = FontWeight.Medium)
                                Text(volume.heb, color = p.ink2, fontSize = 15.sp, fontFamily = ShellTheme.hebrew)
                            }
                            Chevron(p)
                        }
                    }
                }
            }
            if (shell.volumes.isEmpty()) item { Text("Opening the book…", color = p.ink2, modifier = Modifier.padding(16.dp)) }
        }
    }
}

@Composable
private fun BooksView(shell: WebShell, volume: Volume) {
    val p = shell.palette
    ShellPage(shell, title = volume.name, onBack = { shell.libraryPath.removeAt(shell.libraryPath.lastIndex) }) {
        LazyColumn(contentPadding = PaddingValues(16.dp)) {
            volume.divisions.forEachIndexed { di, division ->
                item {
                    if (di > 0) Spacer(Modifier.height(20.dp))
                    SectionHeader(p, division.name)
                    ShellCard(p) {
                        division.books.forEachIndexed { i, book ->
                            if (i > 0) Rule(p)
                            ShellRow(p, onClick = {
                                if (book.isFront || book.ch == 1) shell.open(volume, book, 1)
                                else shell.libraryPath.add(LibraryRoute.Bk(volume.key, book.id))
                            }) {
                                Text(book.en, color = p.ink, fontSize = 17.sp, modifier = Modifier.weight(1f))
                                if (book.ch > 1) Text("${book.ch}", color = p.ink3, fontSize = 13.sp)
                                Spacer(Modifier.width(10.dp))
                                Text(book.heb, color = p.ink2, fontSize = 16.sp, fontFamily = ShellTheme.hebrew)
                                if (!(book.isFront || book.ch == 1)) Chevron(p)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChaptersView(shell: WebShell, volume: Volume, book: Book) {
    val p = shell.palette
    ShellPage(shell, title = book.en, onBack = { shell.libraryPath.removeAt(shell.libraryPath.lastIndex) }) {
        LazyVerticalGrid(columns = GridCells.Adaptive(52.dp), contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items((1..maxOf(book.ch, 1)).toList()) { n ->
                Box(Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(8.dp)).background(p.card)
                    .clickable { shell.open(volume, book, n) }, contentAlignment = Alignment.Center) {
                    Text("$n", color = p.ink, fontSize = 17.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 12.dp))
                }
            }
        }
    }
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
    Text(text, color = p.ink2, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 4.dp, bottom = 8.dp))
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
