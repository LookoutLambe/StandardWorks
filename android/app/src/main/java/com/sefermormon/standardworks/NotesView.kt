package com.sefermormon.standardworks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.BorderColor
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date

/**
 * NOTES, NATIVE — everything the reader has marked, in three lists, read from
 * the page's own stores (NotesEngine in IndexedDB, sw-highlights-v1 and
 * sw-bookmarks-v1 in localStorage). Nothing is stored twice.
 */
data class NoteRow(val key: String, val ref: String, val text: String, val whenMs: Long)
data class MarkRow(val key: String, val ref: String, val whenMs: Long)
data class BookmarkRow(val path: String, val label: String, val heb: String, val whenMs: Long)

@Composable
fun NotesView(shell: WebShell) {
    val p = shell.palette
    var notes by remember { mutableStateOf(listOf<NoteRow>()) }
    var highlights by remember { mutableStateOf(listOf<MarkRow>()) }
    var bookmarks by remember { mutableStateOf(listOf<BookmarkRow>()) }
    var loaded by remember { mutableStateOf(false) }
    val visits = shell.notesVisits

    LaunchedEffect(visits) {
        shell.call("""
            var out = { notes: [], highlights: {}, bookmarks: [] };
            try { if (window.NotesEngine) { var all = await window.NotesEngine.exportAll(); out.notes = (all && all.notes) || []; } } catch (e) {}
            try { out.highlights = JSON.parse(localStorage.getItem('sw-highlights-v1') || '{}') || {}; } catch (e) {}
            try { out.bookmarks = JSON.parse(localStorage.getItem('sw-bookmarks-v1') || '[]') || []; } catch (e) {}
            return out;
        """.trimIndent()) { d ->
            val o = d ?: JSONObject()
            val n = ArrayList<NoteRow>()
            val na = o.optJSONArray("notes")
            if (na != null) for (i in 0 until na.length()) {
                val r = na.optJSONObject(i) ?: continue
                val key = r.optString("verseKey"); val text = r.optString("text")
                if (key.isEmpty()) continue
                n.add(NoteRow(key, refOf(key), text, r.optDouble("updatedAt", 0.0).toLong()))
            }
            notes = n.sortedByDescending { it.whenMs }
            val h = ArrayList<MarkRow>()
            val ho = o.optJSONObject("highlights")
            if (ho != null) for (key in ho.keys()) {
                val info = ho.optJSONObject(key)
                if (info != null && info.has("on") && !info.optBoolean("on")) continue
                h.add(MarkRow(key, refOf(key), info?.optDouble("ts", 0.0)?.toLong() ?: 0L))
            }
            highlights = h.sortedByDescending { it.whenMs }
            val b = ArrayList<BookmarkRow>()
            val ba = o.optJSONArray("bookmarks")
            if (ba != null) for (i in 0 until ba.length()) {
                val r = ba.optJSONObject(i) ?: continue
                val path = r.optString("path"); val label = r.optString("label")
                if (path.isEmpty() || label.isEmpty()) continue
                b.add(BookmarkRow(path, label, r.optString("heb"), r.optDouble("ts", 0.0).toLong()))
            }
            bookmarks = b
            loaded = true
        }
    }

    val empty = notes.isEmpty() && highlights.isEmpty() && bookmarks.isEmpty()
    ShellPage(shell, title = "Notes", onClose = { shell.tab = WebShell.Tab.READ }) {
        if (loaded && empty) {
            Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.Description, null, tint = p.ink3, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Nothing marked yet", color = p.ink, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text("Select a verse in the reader to highlight it or write a note. The Bookmark in the row marks the chapter you are reading.",
                        color = p.ink2, fontSize = 15.sp, textAlign = TextAlign.Center)
                }
            }
        } else {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(0.dp)) {
                if (bookmarks.isNotEmpty()) item {
                    SectionHeader(p, "Bookmarks")
                    ShellCard(p) {
                        bookmarks.forEachIndexed { i, b ->
                            if (i > 0) Rule(p)
                            ShellRow(p, onClick = { shell.open(b.path) }) {
                                Icon(Icons.Outlined.Bookmark, null, tint = p.here, modifier = Modifier.size(22.dp))
                                Spacer(Modifier.width(12.dp))
                                Text(b.label, color = p.ink, fontSize = 17.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                Text(b.heb, color = p.ink2, fontSize = 16.sp, fontFamily = ShellTheme.hebrew)
                            }
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }
                if (highlights.isNotEmpty()) item {
                    SectionHeader(p, "Highlights")
                    ShellCard(p) {
                        highlights.forEachIndexed { i, h ->
                            if (i > 0) Rule(p)
                            ShellRow(p, onClick = { openVerse(shell, h.key) }) {
                                Icon(Icons.Outlined.BorderColor, null, tint = p.here, modifier = Modifier.size(22.dp))
                                Spacer(Modifier.width(12.dp))
                                Text(h.ref, color = p.ink, fontSize = 17.sp, modifier = Modifier.weight(1f))
                                Text(dateOf(h.whenMs), color = p.ink3, fontSize = 12.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }
                if (notes.isNotEmpty()) item {
                    SectionHeader(p, "Notes")
                    ShellCard(p) {
                        notes.forEachIndexed { i, n ->
                            if (i > 0) Rule(p)
                            ShellRow(p, onClick = { openVerse(shell, n.key) }) {
                                Column(Modifier.weight(1f)) {
                                    Row(Modifier.fillMaxWidth()) {
                                        Text(n.ref, color = p.here, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                        Text(dateOf(n.whenMs), color = p.ink3, fontSize = 12.sp)
                                    }
                                    Spacer(Modifier.height(4.dp))
                                    Text(n.text, color = p.ink, fontSize = 17.sp, maxLines = 4, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** "1 Nephi|3|7" → "1 Nephi 3:7" */
private fun refOf(key: String): String {
    val parts = key.split('|')
    return if (parts.size >= 3) "${parts[0]} ${parts[1]}:${parts[2]}" else key
}

private fun dateOf(ms: Long): String = if (ms <= 0) "" else DateFormat.getDateInstance(DateFormat.MEDIUM).format(Date(ms))

/** "1 Nephi|3|7" → the registry's 1 Nephi, chapter 3, at verse 7 through the reader's own deep-link forms. */
private fun openVerse(shell: WebShell, verseKey: String) {
    val parts = verseKey.split('|')
    if (parts.size < 2) return
    val ch = parts[1].toIntOrNull() ?: return
    val name = parts[0]; val verse = parts.getOrNull(2) ?: ""
    val ordered = shell.volumes.filter { it.key != "jst" } + shell.volumes.filter { it.key == "jst" }
    for (volume in ordered) for (division in volume.divisions) {
        val book = division.books.firstOrNull { it.en == name } ?: continue
        var hash = LibraryRegistry.hash(volume.key, book.chapterId(ch), shell.bomHashes)
        if (verse.isNotEmpty()) hash += if (volume.key == "bom") ":$verse" else "&v=$verse"
        shell.open(volume.page + "#" + hash)
        return
    }
}
