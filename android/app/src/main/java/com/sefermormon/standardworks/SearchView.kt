package com.sefermormon.standardworks

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.CompositionLocalProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * SEARCH, NATIVE, ALL SIX VOLUMES. Results come from the site's cross-volume
 * index (SearchIndex) as you type, grouped by volume in the canon's order,
 * with a scope for each volume; a tap opens the verse in the Read tab.
 */
@Composable
fun SearchView(shell: WebShell) {
    val p = shell.palette
    var scope by remember { mutableStateOf("") }
    var hits by remember { mutableStateOf(listOf<SearchIndex.Hit>()) }
    var searched by remember { mutableStateOf("") }
    val ready = shell.searchIndex.loaded

    LaunchedEffect(shell.searchQuery, scope, ready) {
        delay(250)
        val q = shell.searchQuery.trim()
        searched = q
        val all = if (q.length >= 2 && ready) withContext(Dispatchers.Default) { shell.searchIndex.find(q) } else emptyList()
        hits = if (scope.isEmpty()) all else all.filter { it.row.volume == scope }
    }

    val grouped = remember(hits) {
        val order = ArrayList<String>(); val by = LinkedHashMap<String, MutableList<SearchIndex.Hit>>()
        for (h in hits) { if (by[h.volumeName] == null) { order.add(h.volumeName); by[h.volumeName] = ArrayList() }; by[h.volumeName]!!.add(h) }
        order.map { it to by[it]!! }
    }

    ShellPage(shell, title = "Search", barContent = {
        // The field and the scope row live in the navy bar, as they do on the iPhone.
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Row(Modifier.fillMaxWidth().height(40.dp).clip(RoundedCornerShape(10.dp)).background(p.onChrome.copy(alpha = 0.14f)).padding(horizontal = 10.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Search, null, tint = p.onChrome.copy(alpha = 0.7f), modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Box(Modifier.weight(1f)) {
                    if (shell.searchQuery.isEmpty()) Text("Hebrew or English", color = p.onChrome.copy(alpha = 0.6f), fontSize = 17.sp)
                    BasicTextField(
                        value = shell.searchQuery, onValueChange = { shell.searchQuery = it },
                        singleLine = true,
                        textStyle = TextStyle(color = p.onChrome, fontSize = 17.sp),
                        cursorBrush = SolidColor(p.hereChrome),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = {}),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                if (shell.searchQuery.isNotEmpty()) {
                    Icon(Icons.Outlined.Close, "Clear", tint = p.onChrome.copy(alpha = 0.8f),
                        modifier = Modifier.size(20.dp).clip(CircleShape).clickable { shell.searchQuery = "" })
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.horizontalScroll(rememberScrollState())) {
                ScopeChip(p, "All", scope == "") { scope = "" }
                for (v in shell.volumes) { Spacer(Modifier.width(6.dp)); ScopeChip(p, v.short, scope == v.key) { scope = v.key } }
            }
        }
    }) {
        LazyColumn(contentPadding = PaddingValues(16.dp)) {
            val q = shell.searchQuery
            if (!ready && q.isNotEmpty()) item { Text("Preparing the index…", color = p.ink2, modifier = Modifier.padding(16.dp)) }
            else if (hits.isEmpty() && searched.length >= 2) item { Text("No verses match “$searched”.", color = p.ink2, modifier = Modifier.padding(16.dp)) }
            else if (hits.isEmpty() && q.isEmpty()) item { Text("Hebrew, with or without vowels, or English — every volume at once.", color = p.ink2, fontSize = 13.sp, modifier = Modifier.padding(16.dp)) }
            grouped.forEachIndexed { gi, (name, list) ->
                item {
                    if (gi > 0) Spacer(Modifier.height(20.dp))
                    SectionHeader(p, "$name · ${list.size}${if (list.size >= 200) "+" else ""}")
                    ShellCard(p) {
                        list.forEachIndexed { i, hit ->
                            if (i > 0) Rule(p)
                            ShellRow(p, onClick = { shell.open(hit.path) }) {
                                Column(Modifier.weight(1f)) {
                                    Text(hit.row.ref, color = p.here, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                    Spacer(Modifier.height(4.dp))
                                    if (SearchIndex.hasHebrew(searched)) {
                                        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                                            Text(hit.snippet, color = p.ink, fontSize = 18.sp, fontFamily = ShellTheme.hebrew, textAlign = TextAlign.Start, modifier = Modifier.fillMaxWidth())
                                        }
                                    } else {
                                        Text(hit.snippet, color = p.ink2, fontSize = 15.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScopeChip(p: AppShell.Palette, label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.heightIn(min = 32.dp).clip(RoundedCornerShape(8.dp))
            .background(if (selected) p.onChrome.copy(alpha = 0.22f) else p.onChrome.copy(alpha = 0.08f))
            .border(1.dp, p.onChrome.copy(alpha = if (selected) 0.35f else 0.12f), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center
    ) { Text(label, color = p.onChrome, fontSize = 14.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal) }
}
