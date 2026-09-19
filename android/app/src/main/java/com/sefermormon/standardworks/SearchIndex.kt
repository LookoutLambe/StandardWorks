package com.sefermormon.standardworks

import android.content.Context
import android.util.JsonReader
import android.util.JsonToken
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.io.StringReader
import java.util.concurrent.Executors

/**
 * SEARCH ACROSS ALL SIX VOLUMES, NATIVE — the twin of SearchIndex.swift.
 *
 * The site precomputes one cross-volume verse index for its home page
 * (search_index.js: every verse as [deep-link, reference, consonantal Hebrew,
 * English]). Read once off the main thread, streamed rather than parsed
 * whole, and searched the way the home page searches: Hebrew with or without
 * nikkud, English case-blind, hits in the canon's order, 200 per volume.
 */
class SearchIndex(private val context: Context) {
    class Row(val volume: String, val link: String, val ref: String, val heb: String, val eng: String)
    class Hit(val row: Row, val volumeName: String, val page: String, val snippet: String) {
        val id get() = row.volume + "#" + row.link
        val path get() = "$page#${row.link}"
    }

    var volumes: List<String> = emptyList(); private set
    private var names: Map<String, String> = emptyMap()
    private var pages: Map<String, String> = emptyMap()
    private var rows: Map<String, List<Row>> = emptyMap()
    private var lowered: Map<String, List<String>> = emptyMap()
    var loaded by mutableStateOf(false); private set
    /** Book name → its place in the canon (WebShell sets it from the registry). */
    @Volatile var bookOrder: Map<String, Int> = emptyMap()

    init { Executors.newSingleThreadExecutor().execute { load() } }

    private fun load() {
        val text = try { context.assets.open("www/search_index.js").bufferedReader().use { it.readText() } } catch (e: Exception) { return }
        val start = text.indexOf('{'); if (start < 0) return
        val end = text.lastIndexOf('}'); if (end < start) return
        val vols = ArrayList<String>(); val nm = HashMap<String, String>(); val pg = HashMap<String, String>()
        val rw = HashMap<String, List<Row>>(); val low = HashMap<String, List<String>>()
        try {
            JsonReader(StringReader(text.substring(start, end + 1))).use { r ->
                r.beginObject()
                while (r.hasNext()) {
                    when (r.nextName()) {
                        "vols" -> { r.beginArray(); while (r.hasNext()) vols.add(r.nextString()); r.endArray() }
                        "names" -> { r.beginObject(); while (r.hasNext()) nm[r.nextName()] = r.nextString(); r.endObject() }
                        "pages" -> { r.beginObject(); while (r.hasNext()) pg[r.nextName()] = r.nextString(); r.endObject() }
                        "rows" -> {
                            r.beginObject()
                            while (r.hasNext()) {
                                val v = r.nextName()
                                val list = ArrayList<Row>()
                                r.beginArray()
                                while (r.hasNext()) {
                                    r.beginArray()
                                    val cells = ArrayList<String>(4)
                                    while (r.hasNext()) { if (r.peek() == JsonToken.NULL) { r.nextNull(); cells.add("") } else cells.add(r.nextString()) }
                                    r.endArray()
                                    if (cells.size >= 4) list.add(Row(v, cells[0], cells[1], cells[2], cells[3]))
                                }
                                r.endArray()
                                rw[v] = list
                                low[v] = list.map { it.eng.lowercase() }
                            }
                            r.endObject()
                        }
                        else -> r.skipValue()
                    }
                }
                r.endObject()
            }
        } catch (e: Exception) { return }
        volumes = vols; names = nm; pages = pg; rows = rw; lowered = low
        loaded = true
    }

    /** Hits in the site's volume order, at most `perVolume` from each. */
    fun find(query: String, perVolume: Int = 200): List<Hit> {
        val q = query.trim()
        if (!loaded || q.length < 2) return emptyList()
        val isHeb = hasHebrew(q)
        val nq = if (isHeb) normHeb(q) else q.lowercase()
        if (nq.isEmpty()) return emptyList()
        val hits = ArrayList<Hit>()
        val order = bookOrder
        for (v in volumes) {
            val list = rows[v] ?: continue; val lowList = lowered[v] ?: continue
            val found = ArrayList<Triple<Int, Int, Pair<Int, Hit>>>()
            for ((i, r) in list.withIndex()) {
                val hay = if (isHeb) r.heb else lowList[i]
                val at = hay.indexOf(nq); if (at < 0) continue
                val text = if (isHeb) r.heb else r.eng
                val (book, ch, vs) = place(r.ref)
                found.add(Triple(order[book] ?: Int.MAX_VALUE, ch, Pair(vs, Hit(r, names[v] ?: v, pages[v] ?: "", snippet(text, at, nq.length)))))
            }
            found.sortWith(compareBy({ it.first }, { it.second }, { it.third.first }))
            for (f in found.take(perVolume)) hits.add(f.third.second)
        }
        return hits
    }

    companion object {
        private val points = Regex("[\\u0591-\\u05C7]")
        private val finals = mapOf('ך' to 'כ', 'ם' to 'מ', 'ן' to 'נ', 'ץ' to 'צ', 'ף' to 'פ')

        fun hasHebrew(s: String) = s.any { it in '֐'..'׿' }

        fun normHeb(s: String): String {
            var t = s.replace("׃", "").replace("[", "").replace("]", "")
            t = points.replace(t, "")
            t = t.replace('־', ' ')
            t = t.map { finals[it] ?: it }.joinToString("")
            return t.split(Regex("\\s+")).filter { it.isNotEmpty() }.joinToString(" ")
        }

        /** "1 Kings 3:3" → ("1 Kings", 3, 3) */
        fun place(ref: String): Triple<String, Int, Int> {
            val sp = ref.lastIndexOf(' '); if (sp < 0) return Triple(ref, 0, 0)
            val cv = ref.substring(sp + 1).split(':')
            return Triple(ref.substring(0, sp), cv.getOrNull(0)?.toIntOrNull() ?: 0, cv.getOrNull(1)?.toIntOrNull() ?: 0)
        }

        private fun snippet(text: String, start: Int, len: Int): String {
            if (text.isEmpty()) return text
            val lo = maxOf(0, start - 40); val hi = minOf(text.length, start + len + 90)
            if (lo >= hi) return text
            return (if (lo > 0) "…" else "") + text.substring(lo, hi) + (if (hi < text.length) "…" else "")
        }
    }
}
