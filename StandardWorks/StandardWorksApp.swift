import SwiftUI

@main
struct StandardWorksApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

/* THE STATUS BAR is the app's own: Info.plist (UIStatusBarStyle light,
   UIViewControllerBasedStatusBarAppearance off, merged into the generated
   plist through INFOPLIST_FILE) launches it light on the navy, and
   WebShell.updateStatusBar turns it to ink over the reader's light paper. A custom UISceneDelegate with its own
   UIHostingController was tried first for preferredStatusBarStyle: SwiftUI's
   WindowGroup still made its own window beside it, so the app ran TWO web
   views — one on screen, one behind it. Two "[WebView] loading" lines in the
   log are the tell. Never route the status bar through a scene delegate here. */
