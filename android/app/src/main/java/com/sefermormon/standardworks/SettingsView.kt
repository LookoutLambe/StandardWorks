package com.sefermormon.standardworks

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * SETTINGS, NATIVE. Appearance follows the phone unless a theme is chosen
 * here; the choice is only written (WebShell.setAppearance) and applied
 * through the page's own switch, and when the page's own ◐ button changes
 * the theme, this picker follows. Text size steps the page's own slider.
 */
@Composable
fun SettingsView(shell: WebShell) {
    val p = shell.palette
    ShellPage(shell, title = "Settings") {
        LazyColumn(contentPadding = PaddingValues(16.dp)) {
            item {
                SectionHeader(p, "Appearance")
                ShellCard(p) {
                    listOf("system" to "Match phone", "light" to "Light", "sepia" to "Sepia", "dark" to "Dark").forEachIndexed { i, (key, label) ->
                        if (i > 0) Rule(p)
                        ShellRow(p, onClick = { shell.chooseAppearance(key) }) {
                            Text(label, color = p.ink, fontSize = 17.sp, modifier = Modifier.weight(1f))
                            if (shell.appearance == key) Icon(Icons.Outlined.Check, null, tint = p.here, modifier = Modifier.size(22.dp))
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
                SectionHeader(p, "Text size")
                ShellCard(p) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        SizeButton(p, "A", 14.sp, "Smaller") { shell.stepTextSize(-10) }
                        Spacer(Modifier.weight(1f))
                        SizeButton(p, "A", 20.sp, "Larger") { shell.stepTextSize(10) }
                    }
                    Rule(p)
                    Text("Sets the reading size on every page; the same control as the Aa button in the reader.",
                        color = p.ink2, fontSize = 13.sp, modifier = Modifier.padding(16.dp))
                }
                Spacer(Modifier.height(20.dp))
                SectionHeader(p, "About")
                ShellCard(p) {
                    ShellRow(p, onClick = { shell.open("in-print.html") }) { Text("Sefer Mormon in print", color = p.ink, fontSize = 17.sp) }
                    Rule(p)
                    ShellRow(p, onClick = { shell.open("privacy.html") }) { Text("Privacy", color = p.ink, fontSize = 17.sp) }
                }
            }
        }
    }
}

@Composable
private fun SizeButton(p: AppShell.Palette, glyph: String, size: androidx.compose.ui.unit.TextUnit, label: String, onClick: () -> Unit) {
    Row(
        Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(10.dp)).background(p.here.copy(alpha = 0.16f))
            .border(1.dp, p.here.copy(alpha = 0.3f), RoundedCornerShape(10.dp)).clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(glyph, color = p.ink, fontSize = size, fontWeight = FontWeight.Medium)
        Spacer(Modifier.width(10.dp))
        Text(label, color = p.ink, fontSize = 17.sp)
    }
}
