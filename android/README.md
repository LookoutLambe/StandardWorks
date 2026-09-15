# Android — Sefer Mormon: Standard Works

The Android app is a **WebView app**: a native shell whose one screen is a
full-screen WebView pointed at https://sefermormon.com. The app *is* the
website, so every commit that ships the site ships the Android app too — you
only rebuild this shell when the shell itself changes (icon, name, colours,
version, or the speech bridge).

## Why not a TWA

It was a Trusted Web Activity until 2026-09-15. A TWA hands the site to Chrome
and shows it full-screen, so the reading happens **inside Chrome, not inside the
app**. Google's production-access review looks for activity inside the app,
finds almost none, and refuses — blaming tester engagement. The listing sat at
8 opted-in testers under exactly that rule.

Do **not** "fix" this by setting `fallbackType: "webview"` on a Bubblewrap
build. That fallback only applies on phones with no TWA-capable browser, so on
any phone with Chrome the app is still a TWA.

## The read-aloud bridge

Android's WebView has no Web Speech API, so `read_aloud.js` would find no
`speechSynthesis` and hide its control. Two files put it back:

| File | Role |
|---|---|
| `app/src/main/java/.../SpeechBridge.java` | exposes the phone's TextToSpeech engine to the page as `SMTTS` |
| `app/src/main/assets/tts_shim.js` | re-implements `speechSynthesis` and `SpeechSynthesisUtterance` over it |

The shim is injected as a **document-start** script, because `read_aloud.js`
tests for an engine as it loads — injecting after `onPageFinished` is too late.

One limitation: Android's engine cannot pause mid-utterance. `pause()` stops the
voice and `resume()` speaks the current verse again from its start.

## Identity — do not change these

- **packageId `com.sefermormon.standardworks`** is permanent. Play identifies
  the listing by it; a different id is a different app.
- **`~/sefermormon-release.keystore`** (alias `sefermormon`) is the upload key.
  Back it up somewhere that is not this Mac. Losing it does not lose the app —
  Google can reset an upload key — but it is days of waiting.

## Build tools

JDK 17 and the Android SDK, both installed under your home folder:

    ~/Library/Java/JavaVirtualMachines/jdk-17*/Contents/Home
    ~/Library/Android/sdk

`local.properties` points the build at the SDK and is gitignored.

## Shipping an update

1. Bump `versionCode` (strictly higher than anything already uploaded — Play
   rejects a repeat) and `versionName` in `app/build.gradle`.
2. Build. **The keystore password is never stored in this repo**; the build
   reads it from the environment, so it lives only in the shell you type it in:

        cd android
        export JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/jdk-17.0.20.1+1/Contents/Home"
        read -rs -p "Keystore password: " SM_KEYSTORE_PASSWORD; echo
        export SM_KEYSTORE_PASSWORD
        ./gradlew :app:bundleRelease   # app/build/outputs/bundle/release/app-release.aab
        ./gradlew :app:assembleRelease # app/build/outputs/apk/release/app-release.apk
        unset SM_KEYSTORE_PASSWORD

3. Play Console → Closed testing → Create new release → upload the `.aab`.

Content updates need none of this. Push the site and the app follows.

## Store presence

- Listing: Play Console → Grow users → Store presence → Main store listing
- Closed test opt-in: https://play.google.com/apps/testing/com.sefermormon.standardworks
- Production requires 12 testers opted in for 14 continuous days (personal
  developer account rule).
