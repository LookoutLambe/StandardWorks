package com.sefermormon.standardworks

import android.content.Context
import android.media.AudioAttributes
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.util.Log
import android.webkit.WebView
import org.json.JSONObject
import java.util.Locale

/**
 * READ ALOUD ON ANDROID.
 *
 * The WebView has no Web Speech API, so read_aloud.js would find no
 * speechSynthesis and never build its control. app-shell/speech_shim.js
 * stands the API up over a message port, and this is the native end of that
 * port — the same protocol the Mac's SpeechBridge.swift speaks: {op:'speak',
 * id, text, lang, rate, pitch}, cancel, pause, resume from the page;
 * window.__swSpeechEvent(id, 'boundary'|'end'|'error', charIndex) back.
 *
 * The word highlighting survives the crossing: the engine's onRangeStart
 * gives the character offset it is about to utter, which is what the page's
 * onboundary consumes.
 *
 * One honest gap: Android's engine cannot pause mid-utterance. Pause stops
 * the voice without ending the utterance (the page would read on), and
 * resume speaks that utterance again from its start.
 */
class SpeechBridge(context: Context, private val shell: WebShell) {
    private var tts: TextToSpeech? = null
    private var ready = false
    private var web: WebView? = null

    private data class Pending(val id: Int, val text: String, val lang: String, val rate: Double, val pitch: Double)
    /** The utterance the engine is on, kept for a resume after a pause. */
    private var current: Pending? = null
    private var paused = false

    init {
        tts = TextToSpeech(context) { status ->
            ready = status == TextToSpeech.SUCCESS
            // The voice is spoken audio on the media stream: the volume keys
            // set it, and it takes and yields audio focus as ListenService does.
            if (ready) tts?.setAudioAttributes(AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            if (ready) tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                    send(utteranceId, "boundary", start)
                }
                override fun onDone(utteranceId: String?) {
                    if (paused) return                        // stopped by a pause, not finished
                    current = null
                    send(utteranceId, "end")
                }
                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) { current = null; send(utteranceId, "error") }
                override fun onError(utteranceId: String?, errorCode: Int) { current = null; send(utteranceId, "error") }
            })
        }
    }

    fun attach(web: WebView) { this.web = web }

    fun handle(body: JSONObject) {
        when (body.optString("op")) {
            "speak" -> {
                val id = body.optInt("id", -1)
                val text = body.optString("text", "")
                if (text.isEmpty()) { send(id.toString(), "end"); return }
                val p = Pending(id, text, body.optString("lang", "he-IL"), body.optDouble("rate", 1.0), body.optDouble("pitch", 1.0))
                paused = false
                speak(p)
            }
            "cancel" -> { paused = false; current = null; tts?.stop() }
            "pause" -> { if (current != null) { paused = true; tts?.stop() } }
            "resume" -> { val p = current; if (paused && p != null) { paused = false; speak(p) } }
        }
    }

    private fun speak(p: Pending) {
        val engine = tts
        if (!ready || engine == null) { send(p.id.toString(), "error"); return }
        current = p
        engine.voice = voiceFor(p.lang) ?: engine.voice
        if (engine.voice == null || engine.voice?.locale?.language?.let { it != "he" && it != "iw" } == true) {
            engine.language = Locale.forLanguageTag(p.lang)
        }
        engine.setSpeechRate(androidRate(p.rate))
        engine.setPitch(p.pitch.coerceIn(0.5, 2.0).toFloat())
        val params = Bundle()
        engine.speak(p.text, TextToSpeech.QUEUE_FLUSH, params, p.id.toString())
    }

    /** he-IL if the engine has it, otherwise any Hebrew voice, otherwise null. */
    private fun voiceFor(lang: String): Voice? {
        val voices = try { tts?.voices } catch (e: Exception) { null } ?: return null
        val want = Locale.forLanguageTag(lang)
        val hebrew = voices.filter { val l = it.locale.language; l == "he" || l == "iw" }
        return hebrew.firstOrNull { it.locale.country.equals(want.country, true) && !it.isNetworkConnectionRequired }
            ?: hebrew.firstOrNull { !it.isNetworkConnectionRequired }
            ?: hebrew.firstOrNull()
    }

    /**
     * WEB RATE AND ANDROID RATE ARE DIFFERENT SCALES. read_aloud.js speaks in
     * Web Speech terms, where the reader's cycle runs 0.3 to 0.75 and was
     * tuned by ear against Carmit. Android's engine takes 1.0 as its normal;
     * the web band is mapped onto a usable Android band rather than scaled:
     * 0.3 → 0.62, 0.5 → 0.78, 0.75 → 0.97, 1.0 → 1.15. Monotonic, every step
     * audibly distinct. Tune the two ends here.
     */
    private fun androidRate(web: Double): Float {
        val t = ((web.coerceIn(0.3, 1.0)) - 0.3) / 0.7
        return (0.62 + t * 0.53).toFloat()
    }

    /** What the engine offers for the player's label: the voice's name, or "Hebrew". */
    fun voiceLabel(): String {
        val v = try { tts?.voice } catch (e: Exception) { null }
        val name = v?.name ?: return "Hebrew"
        return if (name.contains("carmit", true)) "Carmit" else "Hebrew"
    }

    private fun send(utteranceId: String?, type: String, charIndex: Int = 0) {
        val id = utteranceId?.toIntOrNull() ?: return
        if (id < 0) return
        val js = "window.__swSpeechEvent && window.__swSpeechEvent($id,'$type',$charIndex)"
        shell.post { web?.evaluateJavascript(js, null) }
    }

    fun shutdown() {
        try { tts?.stop(); tts?.shutdown() } catch (e: Exception) { Log.w("SeferMormon", "tts shutdown: $e") }
        tts = null
    }
}
