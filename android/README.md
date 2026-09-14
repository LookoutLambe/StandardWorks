# Android — Sefer Mormon: Standard Works

The Android app is not a second codebase. It is a **Trusted Web Activity**: a
thin native shell that opens https://sefermormon.com full-screen with no browser
chrome. The app *is* the website, so every commit that ships the site ships the
Android app too — you only rebuild this shell when the shell itself changes
(icon, name, colours, shortcuts, version).

## The two halves that must agree

| Half | Where | What it does |
|---|---|---|
| The shell | `twa-manifest.json` (here) | package id, name, colours, shortcuts, version |
| The proof | `/.well-known/assetlinks.json` (repo root) | tells Android this app may open this domain without browser chrome |

If `assetlinks.json` is wrong the app still runs, but with a URL bar across the
top. It carries **Google's app-signing fingerprint**, not the upload key's,
because Play App Signing re-signs the bundle with Google's own key. Get it from
Play Console → Test and release → App integrity → App signing key certificate.

## Identity — do not change these

- **packageId `com.sefermormon.standardworks`** is permanent. Play identifies
  the listing by it; a different id is a different app.
- **`~/sefermormon-release.keystore`** (alias `sefermormon`) is the upload key.
  Back it up somewhere that is not this Mac. Losing it does not lose the app —
  Google can reset an upload key — but it is days of waiting.

## Rebuilding

Bubblewrap regenerates the entire Gradle project from `twa-manifest.json`, which
is why none of it is committed.

    cd android
    npm install
    npx bubblewrap init --manifest https://sefermormon.com/manifest.json
    # answer: reuse the existing twa-manifest.json
    npx bubblewrap build

Needs a JDK 17 and the Android SDK. Output is `app-release.aab`.

## Shipping an update

1. Bump **both** `appVersion` and `appVersionCode` in `twa-manifest.json`
   (`appVersionCode` must be strictly higher than anything already uploaded —
   Play rejects a repeat).
2. `npx bubblewrap build`
3. Play Console → Internal testing → Create new release → upload the `.aab`.

Content updates need none of this. Push the site and the app follows.

## Store presence

- Listing: Play Console → Grow users → Store presence → Main store listing
- Internal test opt-in: https://play.google.com/apps/internaltest/4699308321170802848
- Production requires 12 testers opted in for 14 continuous days (personal
  developer account rule).
