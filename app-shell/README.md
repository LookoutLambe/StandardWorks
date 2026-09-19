# app-shell — the one injected surface, for both apps

Everything that makes the iPhone app and the Android app an *app* rather than
the website in a box is injected into the page from here. Neither app changes
a file in www; both load these files and hand them to their web view.

| File | Injected when | What it does |
|---|---|---|
| `shell_start.js` | document start, main frame | boot to the last-read chapter (`?boot=1`), the app-only stylesheet (hide website things, inset fixes, the folding mode row, the status-bar strip) |
| `shell_end.js` | document end, main frame | measures the bar (`--sw-app-bar-h`), the mark tap → Library, the theme message, the App Store name |
| `shell_mark.js` | document end, main frame | the app's own mark in the bar; `__SW_MARK_URI__` is replaced by a JSON-quoted data URI of `appmark.png` |
| `speech_shim.js` | document start, all frames | `window.speechSynthesis` over the native bridge where the web view has none (Mac Catalyst, Android); no-op on iOS |
| `appmark.png` | — | the icon's art, navy knocked out, 3:2 |
| `fonts/` | — | David Libre TTFs for the native screens' Hebrew |

The scripts post to `window.webkit.messageHandlers.<name>.postMessage(obj)`
with the names `swShell` and `swSpeech`. iOS provides those natively; the
Android shell stands them up over its JavaScript interface before any page
script runs. The full account of each rule lives in
`StandardWorks/AppShell.swift`; the Android side is `android/.../AppShell.kt`.

iOS bundles this folder as a folder reference; Android copies it into its
assets at build (`copyShellAssets` in `android/app/build.gradle`).
