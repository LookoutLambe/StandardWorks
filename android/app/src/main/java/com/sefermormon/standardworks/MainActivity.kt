package com.sefermormon.standardworks

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
        val navy = Color.parseColor("#1B2A41")
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(navy), navigationBarStyle = SystemBarStyle.dark(navy))
        ShellTheme.init(assets)
        shell = WebShell(applicationContext)
        val phoneDark = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
        shell.phoneDark = phoneDark
        LocalSiteWebView.make(this, shell, shell.wantedTheme())
        setContent { ShellRoot(shell) }
        // The review flow needs an Activity; the shell holds only the app context.
        ReviewPrompt.attach(this)
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
