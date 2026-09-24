package com.sefermormon.standardworks

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

/**
 * One Activity, one WebView, the Compose shell around it. The manifest's
 * configChanges keep this Activity (and so the WebView and the reading)
 * alive across rotation and theme changes.
 */
class MainActivity : ComponentActivity() {
    private lateinit var shell: WebShell

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        drawEdgeToEdge()
        ShellTheme.init(assets)
        shell = WebShell(applicationContext)
        val phoneDark = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
        shell.phoneDark = phoneDark
        LocalSiteWebView.make(this, shell, shell.wantedTheme())
        setContent { ShellRoot(shell) }
        // The review flow needs an Activity; the shell holds only the app context.
        ReviewPrompt.attach(this)
    }

    /**
     * THE PAGE RUNS UNDER THE SYSTEM BARS, on every Android version. Not
     * androidx.activity's enableEdgeToEdge: it sets the bar colours with
     * Window.setStatusBarColor / setNavigationBarColor and the cutout with
     * LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES, all deprecated in Android 15,
     * and Play reports them (2026-09-24, release 9). Worse, its dark(navy)
     * style painted the status bar solid navy below Android 15, under a clock
     * the shell turns to ink over the paper: dark on navy, unreadable. Here the
     * bars are clear (the theme's colours), the Compose bands behind them carry
     * the paper or the chrome, and ShellRoot sets the icons' ink.
     */
    private fun drawEdgeToEdge() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        // the shell draws its own band behind three-button navigation (ShellRoot);
        // the system's contrast scrim would lay a second veil over it
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) window.isNavigationBarContrastEnforced = false
        // into the camera cutout on every edge, as Android 15 does by default
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            }
        }
    }

    /** A day of use counts when the app comes to the front, not only at a cold start. */
    override fun onResume() {
        super.onResume()
        ReviewPrompt.recordUse(this)
    }

    override fun onDestroy() {
        ReviewPrompt.detach(this)
        // the reading ends with the Activity, and its service and card with it
        ListenService.sync(applicationContext, null)
        if (::shell.isInitialized) { shell.speech.shutdown(); shell.webView.destroy() }
        super.onDestroy()
    }
}
