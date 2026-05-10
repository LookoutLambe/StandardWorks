# Standard Works — iOS shell for the App Store

This folder contains an **Xcode iOS project** that wraps your **Standard Works Project** static site in a full-screen **WKWebView**. You finish shipping it on a **Mac** with **Xcode** and an **Apple Developer Program** account ($99/year).

## Why you need a Mac

Apple only ships **Xcode** on macOS. You cannot produce a signed `.ipa` or submit to App Store Connect from Windows alone. Options:

1. **Borrow or buy a Mac**, install Xcode from the Mac App Store (free).
2. **MacStadium / MacinCloud / GitHub Actions macOS runner** — rent CI time to build (still need Apple Developer credentials).

## One-time setup

1. **Copy your web app into the bundle**

   Copy the **entire contents** of your `Standard Works Project` folder (HTML, CSS, JS, `dc_verses`, fonts you host locally, `icons`, etc.) into:

   ```
   StandardWorks/StandardWorks/www/
   ```

   So that this file exists:

   ```
   StandardWorks/StandardWorks/www/index.html
   ```

   If anything loads from **absolute paths** or assumes a server root, adjust after testing in Safari **File → Open** on `index.html`, or fix paths for `file://` (your root `index.html` already uses relative assets — good).

2. **Open the project on a Mac**

   Double-click:

   ```
   StandardWorks/StandardWorks.xcodeproj
   ```

3. **Signing**

   - Xcode → select the **StandardWorks** target → **Signing & Capabilities**.
   - Choose your **Team** (Apple ID with Developer Program).
   - Set a unique **Bundle Identifier**, e.g. `com.yourname.standardworks` (must be unique on App Store).

4. **App icon**

   - Replace placeholders in `StandardWorks/Assets.xcassets/AppIcon.appiconset/` with real PNGs (Xcode shows required sizes). You need at least **1024×1024** for App Store Connect.

5. **Run on simulator or device**

   Choose an iPhone simulator and press **Run**. The app should load `www/index.html`.

## App Store submission (short checklist)

1. Enroll in **[Apple Developer Program](https://developer.apple.com/programs/)**.
2. In **[App Store Connect](https://appstoreconnect.apple.com/)**, create a new app record (name, bundle ID, screenshots, description, privacy policy URL if you collect data).
3. In Xcode: **Product → Archive** → **Distribute App** → App Store Connect.
4. Answer **encryption / export compliance** (this template uses HTTPS for Google Fonts like your site; local files are static — typically “No” for custom encryption).
5. Complete **App Privacy** labels (local WKWebView only — often minimal; declare if you add analytics later).

## Offline / fonts

Your `index.html` loads **Google Fonts** over HTTPS. That requires network permission (allowed by default). To work fully offline, bundle fonts and change `<link href="https://fonts.googleapis.com/...">` in your copied `www/index.html` to local CSS/font files.

## Support

If the screen is blank, open Xcode’s **console** for WKWebView errors. Common fixes: wrong `www` path, mixed `file://` restrictions (the Swift code grants read access to the whole `www` folder), or a script assuming `http://localhost`.
