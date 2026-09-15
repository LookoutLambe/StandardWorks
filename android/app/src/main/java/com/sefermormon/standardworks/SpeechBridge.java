package com.sefermormon.standardworks;

import android.app.Activity;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Locale;
import java.util.Set;

/**
 * Android's WebView has no Web Speech API, so read_aloud.js would find no
 * speechSynthesis and hide its controls. This exposes the phone's own
 * text-to-speech engine to the page; tts_shim.js dresses it up as the
 * standard speechSynthesis object the reader already knows how to drive.
 */
public class SpeechBridge {

    private final Activity activity;
    private final WebView web;
    private TextToSpeech tts;
    private boolean ready = false;

    SpeechBridge(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.tts = new TextToSpeech(activity, status -> {
            ready = (status == TextToSpeech.SUCCESS);
            if (ready) {
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { fire("start", id); }
                    @Override public void onDone(String id) { fire("end", id); }
                    @Override public void onError(String id) { fire("error", id); }
                    @Override public void onError(String id, int code) { fire("error", id); }
                });
            }
            /* The page asks for voices before the engine has any. Tell it when
               the list actually arrives, the same way browsers do. */
            post("window.__smTTS && window.__smTTS._voiceschanged();");
        });
    }

    private void fire(String type, String id) {
        post("window.__smTTS && window.__smTTS._on(" + q(type) + "," + q(id) + ");");
    }

    private void post(final String js) {
        activity.runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private static String q(String s) {
        return JSONObject.quote(s == null ? "" : s);
    }

    @JavascriptInterface
    public boolean isReady() {
        return ready;
    }

    /** Every Hebrew-capable voice the engine offers, shaped like a browser's. */
    @JavascriptInterface
    public String voices() {
        JSONArray out = new JSONArray();
        if (!ready) return out.toString();
        try {
            Set<Voice> vs = tts.getVoices();
            if (vs == null) return out.toString();
            for (Voice v : vs) {
                Locale loc = v.getLocale();
                if (loc == null) continue;
                JSONObject o = new JSONObject();
                o.put("name", v.getName());
                /* he-IL, not iw_IL: the page matches on the modern tag. */
                String lang = loc.toLanguageTag().replace("iw", "he");
                o.put("lang", lang);
                o.put("localService", !v.isNetworkConnectionRequired());
                o.put("default", false);
                out.put(o);
            }
        } catch (Exception ignored) {
        }
        return out.toString();
    }

    @JavascriptInterface
    public void speak(String id, String text, String lang, String voiceName, float rate, float pitch) {
        if (!ready || text == null || text.isEmpty()) {
            fire("error", id);
            return;
        }
        try {
            if (voiceName != null && !voiceName.isEmpty()) {
                for (Voice v : tts.getVoices()) {
                    if (voiceName.equals(v.getName())) { tts.setVoice(v); break; }
                }
            } else if (lang != null && !lang.isEmpty()) {
                tts.setLanguage(Locale.forLanguageTag(lang));
            }
            tts.setSpeechRate(rate <= 0 ? 1f : rate);
            tts.setPitch(pitch <= 0 ? 1f : pitch);
            HashMap<String, String> params = new HashMap<>();
            params.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, id);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, params);
        } catch (Exception e) {
            fire("error", id);
        }
    }

    @JavascriptInterface
    public void cancel() {
        if (ready) try { tts.stop(); } catch (Exception ignored) {}
    }

    void shutdown() {
        if (tts != null) {
            try { tts.stop(); tts.shutdown(); } catch (Exception ignored) {}
            tts = null;
        }
    }
}
