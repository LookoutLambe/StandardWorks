package com.sefermormon.standardworks

import android.app.Activity
import android.os.Handler
import android.os.Looper
import java.io.File

/**
 * DEBUG ONLY: the app driven from adb, the way the iPhone app is driven from
 * the simulator. It polls files/shell_cmd.js in its own files dir, runs the
 * text in the page (or, with a leading @, a native command) and writes the
 * answer to files/shell_out.txt. `adb shell run-as` reaches both files.
 */
object DebugBridge {
    private var started = false

    fun start(activity: Activity, shell: WebShell) {
        if (started) return
        started = true
        val cmd = File(activity.filesDir, "shell_cmd.js")
        val out = File(activity.filesDir, "shell_out.txt")
        val h = Handler(Looper.getMainLooper())
        val tick = object : Runnable {
            override fun run() {
                try {
                    if (cmd.exists()) {
                        val js = cmd.readText(); cmd.delete()
                        if (js.startsWith("@")) {
                            val parts = js.drop(1).trim().split(Regex("\\s+"))
                            var answer = "ok"
                            when (parts.firstOrNull()) {
                                "tab" -> when (parts.getOrNull(1)) {
                                    "library" -> shell.tab = WebShell.Tab.LIBRARY
                                    "read" -> shell.tab = WebShell.Tab.READ
                                    "search" -> shell.tab = WebShell.Tab.SEARCH
                                    "notes" -> { shell.tab = WebShell.Tab.NOTES; shell.notesVisits++ }
                                    "settings" -> shell.tab = WebShell.Tab.SETTINGS
                                    "listen" -> shell.toggleListen()
                                    else -> answer = "unknown tab"
                                }
                                "open" -> parts.getOrNull(1)?.let { shell.open(it) }
                                "library" -> {
                                    shell.tab = WebShell.Tab.LIBRARY
                                    shell.libraryPath.clear()
                                    parts.getOrNull(1)?.let { shell.libraryPath.add(LibraryRoute.Vol(it)) }
                                    parts.getOrNull(2)?.let { shell.libraryPath.add(LibraryRoute.Bk(parts[1], it)) }
                                }
                                "chapter" -> {
                                    val v = shell.volumes.firstOrNull { it.key == parts.getOrNull(1) }
                                    val b = v?.divisions?.flatMap { it.books }?.firstOrNull { it.id == parts.getOrNull(2) }
                                    val n = parts.getOrNull(3)?.toIntOrNull()
                                    if (v != null && b != null && n != null) shell.open(v, b, n) else answer = "unknown chapter"
                                }
                                "type" -> { shell.searchQuery = parts.drop(1).joinToString(" ") }
                                "search" -> { val hits = shell.searchIndex.find(parts.drop(1).joinToString(" ")); answer = "loaded=${shell.searchIndex.loaded} hits=${hits.size} " + hits.take(6).joinToString(" | ") { "${it.row.ref} [${it.volumeName}] ${it.path}" } }
                                "listen" -> shell.toggleListen()
                                "pause" -> shell.pauseListen()
                                "skipback" -> shell.skipListen(true)
                                "stop" -> shell.stopListen()
                                "size" -> shell.stepTextSize(parts.getOrNull(1)?.toIntOrNull() ?: 10)
                                "reading" -> shell.setReading(parts.getOrNull(1) == "1")
                                "appearance" -> parts.getOrNull(1)?.let { shell.chooseAppearance(it) } ?: run { answer = "which?" }
                                "state" -> answer = "tab=${shell.tab} chromeHidden=${shell.chromeHidden} where=${shell.whereLabel} volumes=${shell.volumes.size} path=${shell.libraryPath.toList()} canListen=${shell.canListen} listening=${shell.listening} paused=${shell.listenPaused} rate=${shell.listenRate} rates=${shell.listenRates} theme=${shell.theme} appearance=${shell.appearance} ready=${shell.firstPageReady} url=${shell.webView.url}"
                                else -> answer = "unknown command"
                            }
                            out.writeText(answer)
                        } else {
                            shell.webView.evaluateJavascript(js) { v -> try { out.writeText(v ?: "undefined") } catch (e: Exception) {} }
                        }
                    }
                } catch (e: Exception) { try { out.writeText("ERROR $e") } catch (_: Exception) {} }
                h.postDelayed(this, 250)
            }
        }
        h.postDelayed(tick, 250)
    }
}
