package com.sefermormon.standardworks

import android.app.Activity
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat
import kotlin.math.roundToInt

/**
 * DISPLAY OPTIONS, the iPhone's (SettingsView.swift: DisplayOptionsSections,
 * ThemeSwatch, DisplayOptionsSheet): the reading size on a slider, the theme
 * as swatches — the site's Light, Sepia and Dark and the shell's Black and
 * Gray cuts of Dark — with Match phone, the reading modes (layout,
 * transliteration, vowel points, full screen on scroll), and this chapter's
 * bookmark and share. One set of sections in two places: the sheet the
 * header's ⋯ opens, and Settings. Every control drives the page's own switch
 * and shows what the page reports back.
 */
@Composable
fun ColumnScope.DisplayOptionsSections(shell: WebShell) {
    val p = shell.palette
    val context = LocalContext.current

    SectionHeader(p, "Text size")
    ShellCard(p) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("A", color = p.ink2, fontSize = 13.sp, modifier = Modifier.clearAndSetSemantics {})
            Slider(
                value = shell.textSize.toFloat(),
                onValueChange = { shell.chooseTextSize(it.roundToInt()) },
                valueRange = 70f..150f,
                steps = 15,                                    // every 5, as the page's own slider
                colors = SliderDefaults.colors(thumbColor = p.here, activeTrackColor = p.here, inactiveTrackColor = p.rule,
                    activeTickColor = Color.Transparent, inactiveTickColor = Color.Transparent),
                modifier = Modifier.weight(1f).padding(horizontal = 12.dp).semantics { contentDescription = "Text size" }
            )
            Text("A", color = p.ink2, fontSize = 24.sp, modifier = Modifier.clearAndSetSemantics {})
        }
    }

    Spacer(Modifier.height(20.dp))
    SectionHeader(p, "Theme")
    ShellCard(p) {
        val phone = if (shell.phoneDark) "dark" else "light"
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 12.dp)) {
            for (key in AppShell.THEME_ORDER) {
                val selected = shell.appearance == key || (shell.appearance == "system" && key == phone)
                ThemeSwatch(shell, key, selected, Modifier.weight(1f)) { shell.chooseAppearance(key) }
            }
        }
        Rule(p)
        SwitchRow(p, "Match phone", shell.appearance == "system") { on -> shell.chooseAppearance(if (on) "system" else phone) }
    }

    Spacer(Modifier.height(20.dp))
    SectionHeader(p, "Reading")
    ShellCard(p) {
        LayoutPicker(shell)
        Rule(p)
        SwitchRow(p, "Transliteration", shell.readTranslit) { shell.setReading(shell.readLayout, it, shell.readNikkud) }
        Rule(p)
        SwitchRow(p, "Vowel points (nikkud)", shell.readNikkud) { shell.setReading(shell.readLayout, shell.readTranslit, it) }
        Rule(p)
        SwitchRow(p, "Full screen on scroll", shell.fullScreenOnScroll) { shell.chooseFullScreen(it) }
    }

    if (shell.whereLabel.isNotEmpty()) {
        Spacer(Modifier.height(20.dp))
        SectionHeader(p, shell.whereLabel)
        ShellCard(p) {
            ShellRow(p, onClick = { shell.bookmarkChapter() }) {
                Icon(Icons.Outlined.Bookmark, null, tint = p.here, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(14.dp))
                Text("Bookmark this chapter", color = p.ink, fontSize = 17.sp)
            }
            Rule(p)
            ShellRow(p, onClick = { shell.currentSiteUrl?.let { shareText(context, it, shell.whereLabel) } }) {
                Icon(Icons.Outlined.Share, null, tint = p.here, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(14.dp))
                Text("Share this chapter", color = p.ink, fontSize = 17.sp)
            }
        }
    }
}

/** Interlinear · Hebrew only · Dual, the iPhone's segmented picker. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LayoutPicker(shell: WebShell) {
    val p = shell.palette
    val layouts = listOf("inter" to "Interlinear", "heb" to "Hebrew only", "dual" to "Dual")
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(16.dp)) {
        layouts.forEachIndexed { i, (key, label) ->
            SegmentedButton(
                selected = shell.readLayout == key,
                onClick = { shell.setReading(key, shell.readTranslit, shell.readNikkud) },
                shape = SegmentedButtonDefaults.itemShape(i, layouts.size),
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = p.here.copy(alpha = 0.16f), activeContentColor = p.ink, activeBorderColor = p.here,
                    inactiveContainerColor = p.card, inactiveContentColor = p.ink, inactiveBorderColor = p.rule),
                icon = {}                                       // no tick: the three names keep their room
            ) {
                Text(label, fontSize = 14.sp, fontWeight = if (shell.readLayout == key) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

/** A setting that is on or off: the whole row is the switch. */
@Composable
fun SwitchRow(p: AppShell.Palette, label: String, on: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp)
            .toggleable(value = on, role = Role.Switch, onValueChange = onChange)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = p.ink, fontSize = 17.sp, modifier = Modifier.weight(1f))
        Switch(checked = on, onCheckedChange = null, colors = SwitchDefaults.colors(
            checkedThumbColor = Color.White, checkedTrackColor = p.here, checkedBorderColor = p.here,
            uncheckedThumbColor = p.ink3, uncheckedTrackColor = p.rule, uncheckedBorderColor = p.ink3))
    }
}

/** A theme as its own paper and ink, ringed in "here" when chosen. */
@Composable
private fun ThemeSwatch(shell: WebShell, key: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val p = shell.palette
    val t = AppShell.palette(key)
    val name = THEME_NAMES[key] ?: key
    val shape = RoundedCornerShape(10.dp)
    Column(
        modifier.clip(RoundedCornerShape(12.dp))
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .semantics { contentDescription = name }
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(Modifier.size(52.dp, 40.dp).clip(shape).background(t.paper)
            .border(if (selected) 2.dp else 1.dp, if (selected) p.here else p.rule, shape),
            contentAlignment = Alignment.Center) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                for (i in 0 until 3) Box(Modifier.size(if (i == 2) 22.dp else 30.dp, 3.dp).clip(CircleShape).background(t.ink.copy(alpha = 0.75f)))
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(name, color = if (selected) p.here else p.ink2, fontSize = 11.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            modifier = Modifier.clearAndSetSemantics {})
    }
}

private val THEME_NAMES = mapOf("light" to "Light", "sepia" to "Sepia", "dark" to "Dark", "black" to "Black", "gray" to "Gray")

/**
 * The sheet the header's ⋯ opens: the same sections under the navy bar,
 * with a close button, half the screen at first and the whole screen on a
 * drag, the way the iPhone's rises.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DisplayOptionsSheet(shell: WebShell) {
    if (!shell.showDisplayOptions) return
    val p = shell.palette
    val close = { shell.showDisplayOptions = false }
    ModalBottomSheet(
        onDismissRequest = close,
        // fully open, it stops under the status bar, as the iPhone's leaves the page's edge showing
        modifier = Modifier.windowInsetsPadding(WindowInsets.statusBars),
        containerColor = p.chrome,
        contentColor = p.onChrome,
        dragHandle = { BottomSheetDefaults.DragHandle(color = p.onChrome.copy(alpha = 0.5f)) },
    ) {
        // The sheet is its own window, with its own status-bar ink: the
        // clock in ink over the reader's paper, in paper over anything dark.
        val view = LocalView.current
        val paperUnder = shell.tab == WebShell.Tab.READ && !shell.dark
        SideEffect {
            (view.parent as? DialogWindowProvider)?.window?.let {
                WindowCompat.getInsetsController(it, view).isAppearanceLightStatusBars = paperUnder
            }
        }
        Box(Modifier.fillMaxWidth().height(48.dp), contentAlignment = Alignment.Center) {
            Text("Display Options", color = p.onChrome, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Box(Modifier.align(Alignment.CenterEnd).padding(end = 8.dp).size(44.dp).clip(CircleShape).clickable(onClick = close)
                .semantics { contentDescription = "Close"; role = Role.Button }, contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.Cancel, null, tint = p.onChrome.copy(alpha = 0.8f), modifier = Modifier.size(26.dp))
            }
        }
        LazyColumn(Modifier.fillMaxWidth().background(p.panel), contentPadding = PaddingValues(16.dp)) {
            item { Column { DisplayOptionsSections(shell) } }
        }
    }
}

/** The system share sheet for plain text. */
fun shareText(c: Context, text: String, subject: String?) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
        if (subject != null) putExtra(Intent.EXTRA_SUBJECT, subject)
    }
    val chooser = Intent.createChooser(send, null)
    if (c !is Activity) chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    c.startActivity(chooser)
}
