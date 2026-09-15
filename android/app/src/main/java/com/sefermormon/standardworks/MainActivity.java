package com.sefermormon.standardworks;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Collections;

public class MainActivity extends AppCompatActivity {

    private static final String HOST = "sefermormon.com";
    private static final String START_URL = "https://sefermormon.com/index.html";

    private WebView web;
    private SwipeRefreshLayout refresh;
    private FrameLayout splash;
    private LinearLayout offline;
    private SpeechBridge speech;

    /** Set when a page fails, so a later success knows to clear the error screen. */
    private boolean failed = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        /* Drop the splash theme before inflating, or it stays behind the app. */
        setTheme(R.style.Theme_SeferMormon);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        web = findViewById(R.id.web);
        refresh = findViewById(R.id.refresh);
        splash = findViewById(R.id.splash);
        offline = findViewById(R.id.offline);
        Button retry = findViewById(R.id.retry);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        /* The reader sets its own width; leave its layout alone. */
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        speech = new SpeechBridge(this, web);
        web.addJavascriptInterface(speech, "SMTTS");
        installSpeechShim();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri uri = req.getUrl();
                String host = uri.getHost();
                if (host != null && (host.equals(HOST) || host.endsWith("." + HOST))) {
                    return false;               /* our own pages stay in the app */
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;                   /* anything else opens in the browser */
            }

            @Override
            public void onPageStarted(WebView v, String url, Bitmap favicon) {
                failed = false;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                refresh.setRefreshing(false);
                if (!failed) {
                    offline.setVisibility(View.GONE);
                    splash.setVisibility(View.GONE);
                }
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                /* Only a failure of the page itself is worth a full error screen;
                   a missing image is not. */
                if (req.isForMainFrame()) showOffline();
            }
        });

        refresh.setOnRefreshListener(() -> web.reload());
        retry.setOnClickListener(v -> {
            offline.setVisibility(View.GONE);
            splash.setVisibility(View.VISIBLE);
            web.loadUrl(START_URL);
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web.canGoBack()) {
                    web.goBack();               /* walk the reader's own history first */
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }
    }

    /**
     * read_aloud.js checks for speechSynthesis as it loads, so the shim has to
     * be in place before any page script runs — not after onPageFinished.
     */
    private void installSpeechShim() {
        String js = readAsset("tts_shim.js");
        if (js == null) return;
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                    web, js, Collections.singleton("https://" + HOST));
        } else {
            /* Older WebViews: the next best moment is the first script hook. */
            web.setWebChromeClient(new android.webkit.WebChromeClient() {
                @Override
                public void onProgressChanged(WebView v, int progress) {
                    if (progress > 0 && progress < 30) v.evaluateJavascript(js, null);
                }
            });
        }
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return null;
        }
    }

    private void showOffline() {
        failed = true;
        refresh.setRefreshing(false);
        splash.setVisibility(View.GONE);
        offline.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (speech != null) speech.shutdown();
        super.onDestroy();
    }
}
