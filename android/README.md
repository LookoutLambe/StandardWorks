# Android — Sefer Mormon: Standard Works

The Android app is the **iPhone app's twin**: a native Jetpack Compose shell
around one WebView that shows the bundled site, with the same injected scripts
(`app-shell/` at the repo root, shared byte for byte) and the same native
screens — Library · Read · Search · Notes · Bookmark · Settings · Listen in one row
floating over the page, the logo at launch, Display Options behind the
header's ⋯, Light / Sepia / Dark / Black / Gray on every screen, David Libre
throughout. The book is always underneath: Library and the chapter pill open
the page's own drawer, Notes and Settings rise over the book as a half-height
panel (`PanelSheet`), and only Search is a whole page. The page is
told what the shell can do (`AppShell.CAPS_SCRIPT`, the iPhone's list less
`returnPoint`) before it runs. Each Kotlin file names the Swift file it mirrors.

| Kotlin | Mirrors | Role |
|---|---|---|
| `AppShell.kt` | `AppShell.swift` | the palette per theme, the shared scripts, the message ports |
| `LocalSiteWebView.kt` | `LocalSiteWebView.swift` | the one WebView: asset loader, injected scripts, paper, first request |
| `WebShell.kt` | `WebShell.swift` | the state the two halves share; every call into the page |
| `SpeechBridge.kt` | `SpeechBridge.swift` | Read aloud through the phone's text-to-speech, the same protocol |
| `ListenService.kt` | the audio session, remote commands and now-playing in `WebShell.swift` | the reading with the screen off: foreground media service, media session, focus, wake lock |
| `ReaderWebView.kt` | — | the reader's WebView, held "visible" while it reads so its timers are not throttled |
| `Library.kt`, `SearchIndex.kt`, `SearchView.kt`, `NotesView.kt`, `SettingsView.kt` | the same names | the native pages |
| `DisplayOptions.kt` | `DisplayOptionsSections`, `DisplayOptionsSheet` in `SettingsView.swift` | text size, theme, reading modes, this chapter — in the ⋯ sheet and in Settings |
| `ShellRoot.kt` | `ShellRoot.swift` | the frame: the floating row, the player, the splash |
| `DebugBridge.kt` | `DebugBridge` | debug builds only: the app driven from adb |

## The site is bundled, as on the iPhone

`copyShellAssets` (app/build.gradle) copies `../../StandardWorks/www` — the
mirror `sync-www.sh` makes of the repo root, refreshed by the pre-commit hook
— and `../../app-shell` into the assets. The page is served by
`WebViewAssetLoader` at `https://appassets.androidplatform.net/assets/www/`,
an https origin, so localStorage, IndexedDB (the notes) and the last-read
record behave exactly as on the web. Nothing is fetched from the network; the
app works offline. Content updates ship with the app, as on the iPhone.

It was a WebView over the live site until 2026-09-19, and a Trusted Web
Activity before 2026-09-15 (a TWA hands the reading to Chrome, and Google's
production review found no activity inside the app).

## Read aloud

The WebView has no Web Speech API. `app-shell/speech_shim.js` stands
`speechSynthesis` up over a message port and `SpeechBridge.kt` is the native
end, through `android.speech.tts.TextToSpeech`, with the engine's
`onRangeStart` feeding the page's word highlighting. Android's engine cannot
pause mid-utterance: pause stops the voice and resume speaks that utterance
again from its start. Web rates map onto an Android band (0.3 → 0.62 … 1.0 →
1.15) in `androidRate`.

With the screen off it keeps reading (`ListenService.kt`): a media-playback
foreground service keeps the process alive, a partial wake lock keeps the CPU
up for the page's timers between phrases, and `ReaderWebView` keeps the page
from being throttled as a hidden page. The media session carries the lock
screen's and the shade's controls. **The voice sounds from the TTS engine's
process, not ours**, so Android found no media-button session and earbud
buttons went nowhere; a looped silent `AudioTrack` while the voice is going
makes this app the one playing (`dumpsys media_session`: "Media button session
is com.sefermormon.standardworks/SeferMormon"). Play asks for a foreground
service declaration (App content) for the `mediaPlayback` type.

## Identity — do not change these

- **packageId `com.sefermormon.standardworks`** is permanent. Play identifies
  the listing by it; a different id is a different app.
- **`~/sefermormon-release.keystore`** (alias `sefermormon`) is the upload key.
  Back it up somewhere that is not this Mac.

## Build tools

JDK 17 and the Android SDK (`~/Library/Android/sdk`; `local.properties`
points at it and is gitignored). Debug build and run on the emulator:

    cd android
    export JAVA_HOME=$(/usr/libexec/java_home -v 17)
    ./gradlew :app:assembleDebug
    adb install -r app/build/outputs/apk/debug/app-debug.apk

Debug builds carry `DebugBridge`: write a command to the app's
`files/shell_cmd.js` (through `adb shell run-as`) and read
`files/shell_out.txt` — `@state`, `@tab library`, `@library bom 1ne` (the native Library), `@bookmark`,
`@panel full`, `@open bom/bom.html#1-nephi-3`,
`@listen`, `@appearance sepia`, or any JavaScript for the page.

## Shipping an update

1. Bump `versionCode` (strictly higher than anything already uploaded — Play
   rejects a repeat) and `versionName` in `app/build.gradle`.
2. Build with the upload key. **The keystore password is never stored in this
   repo**; the build reads it from the environment. On this Mac the session
   that made the key (2026-09-14) left the password beside it in
   `~/sefermormon-keystore-password.txt` (mode 600, outside the repo), so the
   build can read it without anyone typing it:

        cd android
        export JAVA_HOME=$(/usr/libexec/java_home -v 17)
        SM_KEYSTORE_PASSWORD="$(tr -d '\r\n' < ~/sefermormon-keystore-password.txt)" ./gradlew :app:bundleRelease
        # → app/build/outputs/bundle/release/app-release.aab

   Without the password a release build signs with the debug key and can
   only be run locally.

3. Play Console → the testing track → Create new release → upload the `.aab`
   (it is ~30 MB; the Chrome tool's attachment cap is 10 MB, so the upload
   goes through the native file dialog), release notes, Next, Save, then
   Publishing overview → Send for review. Keep `minSdk 24`: version code 4
   was built with 26 and Play flagged 1,379 Android 7 models as dropped.
   Sent to closed testing (Alpha) as 5 (1.2.0) on 2026-09-19.

## Store presence

- Listing: Play Console → Grow users → Store presence → Main store listing
- Closed test opt-in: https://play.google.com/apps/testing/com.sefermormon.standardworks
- Production requires 12 testers opted in for 14 continuous days (personal
  developer account rule).
