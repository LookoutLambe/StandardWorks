# Android — Sefer Mormon: Standard Works

The Android app is the **iPhone app's twin**: a native Jetpack Compose shell
around one WebView that shows the bundled site, with the same injected scripts
(`app-shell/` at the repo root, shared byte for byte) and the same native
screens — Library · Read · Search · Notes · Settings · Listen in one navy row
along the bottom, the logo at launch, Light / Sepia / Dark on every screen.
Each Kotlin file names the Swift file it mirrors.

| Kotlin | Mirrors | Role |
|---|---|---|
| `AppShell.kt` | `AppShell.swift` | the palette per theme, the shared scripts, the message ports |
| `LocalSiteWebView.kt` | `LocalSiteWebView.swift` | the one WebView: asset loader, injected scripts, paper, first request |
| `WebShell.kt` | `WebShell.swift` | the state the two halves share; every call into the page |
| `SpeechBridge.kt` | `SpeechBridge.swift` | Read aloud through the phone's text-to-speech, the same protocol |
| `Library.kt`, `SearchIndex.kt`, `SearchView.kt`, `NotesView.kt`, `SettingsView.kt` | the same names | the native pages |
| `ShellRoot.kt` | `ShellRoot.swift` | the frame: the row, the player, the splash |
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
`files/shell_out.txt` — `@state`, `@tab library`, `@open bom/bom.html#1-nephi-3`,
`@listen`, `@appearance sepia`, or any JavaScript for the page.

## Shipping an update

1. Bump `versionCode` (strictly higher than anything already uploaded — Play
   rejects a repeat) and `versionName` in `app/build.gradle`.
2. Build with the upload key. **The keystore password is never stored in this
   repo**; the build reads it from the environment, so it lives only in the
   shell you type it in (without it, a release build signs with the debug key
   and can only be run locally):

        cd android
        export JAVA_HOME=$(/usr/libexec/java_home -v 17)
        read -rs -p "Keystore password: " SM_KEYSTORE_PASSWORD; echo
        export SM_KEYSTORE_PASSWORD
        ./gradlew :app:bundleRelease   # app/build/outputs/bundle/release/app-release.aab
        unset SM_KEYSTORE_PASSWORD

3. Play Console → the testing track → Create new release → upload the `.aab`.

## Store presence

- Listing: Play Console → Grow users → Store presence → Main store listing
- Closed test opt-in: https://play.google.com/apps/testing/com.sefermormon.standardworks
- Production requires 12 testers opted in for 14 continuous days (personal
  developer account rule).
