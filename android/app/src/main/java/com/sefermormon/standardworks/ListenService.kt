package com.sefermormon.standardworks

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import java.lang.ref.WeakReference

/**
 * THE VOICE KEEPS GOING WITH THE PHONE LOCKED — the Android half of the
 * iPhone's audio session, remote commands and now-playing card
 * (WebShell.swift, "the voice keeps going with the phone locked").
 *
 * The reading is the page's own (read_aloud.js, voiced through
 * SpeechBridge), so it lasts exactly as long as this process runs and the
 * page's timers fire. While the page reads, this service holds what Android
 * asks of any player that keeps going in the background:
 *
 *  - a MEDIA-PLAYBACK FOREGROUND SERVICE and its notification, so the process
 *    is neither frozen nor killed when the screen goes off or another app
 *    comes up;
 *  - a MEDIA SESSION, which is what the lock screen, the notification shade,
 *    earbuds and a car drive: play and pause, back and forward ten seconds,
 *    stop — the transport the player bar drives (WebShell.pauseListen,
 *    skipListen, stopListen) — and the card they show: the chapter, the
 *    volume, the app's mark;
 *  - AUDIO FOCUS, so a call, another app's sound or headphones pulled out
 *    pause the reading the way a podcast pauses, and a short interruption
 *    hands it back when it ends;
 *  - a PARTIAL WAKE LOCK while the voice is going, because the silence between
 *    phrases is the page's own timer and the CPU must stay up to fire it;
 *  - a SILENT TRACK of its own while the voice is going. Android sends the
 *    earbuds' and a headset's buttons to the session of the app that is
 *    making sound, and the voice sounds from the text-to-speech engine's
 *    process, not this one: measured, the "media button session" stayed
 *    empty and a pause from the earbuds went nowhere. Silence played here
 *    makes this app the one that is playing, and the buttons arrive.
 *
 * The page meanwhile is held "visible" to itself (ReaderWebView), or Chromium
 * would throttle those timers as soon as the screen went off.
 *
 * WebShell drives it through sync(), on every poll of the page's reader: the
 * first poll that finds it reading starts the service, a change of chapter or
 * of pause redraws the card, and the poll that finds it stopped ends it.
 */
class ListenService : Service() {

    /** The reading as the shell last saw it; the card is redrawn when this changes. */
    data class NowPlaying(val title: String, val artist: String, val paused: Boolean)

    companion object {
        private const val TAG = "SeferMormon"
        private const val CHANNEL = "listen"
        private const val NOTE_ID = 1207
        private const val ACTION_TOGGLE = "com.sefermormon.standardworks.listen.TOGGLE"
        private const val ACTION_BACK = "com.sefermormon.standardworks.listen.BACK"
        private const val ACTION_FORWARD = "com.sefermormon.standardworks.listen.FORWARD"
        private const val ACTION_STOP = "com.sefermormon.standardworks.listen.STOP"
        private const val CUSTOM_BACK = "back10"
        private const val CUSTOM_FORWARD = "forward10"
        /**
         * A reading left paused this long with the app out of sight is ended,
         * so a forgotten pause does not keep the service (and the page's poll)
         * alive all night. In sight, a pause is kept however long it lasts.
         */
        private const val PAUSED_LIMIT_MS = 30 * 60 * 1000L
        /** The wake lock's own limit; every change of chapter or pause renews it. */
        private const val WAKE_LIMIT_MS = 2 * 60 * 60 * 1000L

        private var shellRef: WeakReference<WebShell>? = null
        private var instance: ListenService? = null
        /** What the service should be showing; null once the reading has stopped. */
        private var now: NowPlaying? = null

        /** The shell the controls drive; set once, by WebShell. */
        fun bind(shell: WebShell) { shellRef = WeakReference(shell) }

        /**
         * The reading as it stands, or null when it has stopped. Starting and
         * stopping are both left to the service itself once it exists: a
         * service asked to start in the foreground must reach
         * startForeground() even if the reading stopped in the meantime, or
         * the system ends the app.
         */
        fun sync(ctx: Context, np: NowPlaying?) {
            val was = now
            now = np
            val s = instance
            if (np == null) {
                s?.finish()
                return
            }
            if (s != null) { if (np != was) s.show(); return }
            if (was != null) return                     // already on its way up
            val start = Intent(ctx, ListenService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(start) else ctx.startService(start)
            } catch (e: Exception) {
                // Refused (the app was already out of sight): the reading goes
                // on for as long as the system lets the process run.
                Log.w(TAG, "listen: could not start the service: $e")
                now = null
            }
        }
    }

    private val main = Handler(Looper.getMainLooper())
    private lateinit var session: MediaSession
    private lateinit var audio: AudioManager
    private var focusRequest: AudioFocusRequest? = null
    private var hasFocus = false
    /** A short interruption paused the reading; it resumes when focus comes back. */
    private var resumeOnGain = false
    private var wake: PowerManager.WakeLock? = null
    private var art: Bitmap? = null
    private var silence: AudioTrack? = null
    private var noisyRegistered = false
    private val shell: WebShell? get() = shellRef?.get()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        audio = getSystemService(AUDIO_SERVICE) as AudioManager
        makeChannel()
        art = coverArt()
        session = MediaSession(this, "SeferMormon").apply {
            @Suppress("DEPRECATION")   // implied from API 26; needed below it
            setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS)
            setCallback(transport, main)
            setSessionActivity(openApp())
            isActive = true
        }
        val noisy = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(unplugged, noisy, RECEIVER_NOT_EXPORTED) else registerReceiver(unplugged, noisy)
        noisyRegistered = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Every start keeps the promise startForegroundService() made, even
        // one that is only going to end at once.
        goForeground()
        when (intent?.action) {
            ACTION_TOGGLE -> togglePause()
            ACTION_BACK -> shell?.skipListen(back = true)
            ACTION_FORWARD -> shell?.skipListen(back = false)
            ACTION_STOP -> shell?.stopListen()
        }
        if (now == null) finish() else show()
        return START_NOT_STICKY
    }

    /** Swiping the app away ends the reading, as it does on the iPhone. */
    override fun onTaskRemoved(rootIntent: Intent?) {
        shell?.stopListen()
        now = null
        finish()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        instance = null
        main.removeCallbacks(pausedTooLong)
        holdWake(false)
        silence?.let { try { it.stop(); it.release() } catch (e: Exception) {} }
        silence = null
        dropFocus()
        if (noisyRegistered) { try { unregisterReceiver(unplugged) } catch (e: Exception) {}; noisyRegistered = false }
        session.isActive = false
        session.release()
        super.onDestroy()
    }

    private fun finish() {
        main.removeCallbacks(pausedTooLong)
        holdWake(false)
        holdSilence(false)
        dropFocus()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // MARK: - the card

    /** Draws the reading as it now is: the session's card and state, the notification, focus, the wake lock. */
    private fun show() {
        val np = now ?: return
        session.setMetadata(MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, np.title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, np.artist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, AppShell.SHARE_SUBJECT)
            .apply { art?.let { putBitmap(MediaMetadata.METADATA_KEY_ART, it) } }
            .build())
        session.setPlaybackState(PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
                PlaybackState.ACTION_STOP or PlaybackState.ACTION_REWIND or PlaybackState.ACTION_FAST_FORWARD)
            // Android 13 and later draw the shade's player from the session and
            // put custom actions in the two outer slots: back and forward ten.
            .addCustomAction(PlaybackState.CustomAction.Builder(CUSTOM_BACK, "Back ten seconds", R.drawable.ic_listen_back).build())
            .addCustomAction(PlaybackState.CustomAction.Builder(CUSTOM_FORWARD, "Forward ten seconds", R.drawable.ic_listen_forward).build())
            .setState(if (np.paused) PlaybackState.STATE_PAUSED else PlaybackState.STATE_PLAYING,
                PlaybackState.PLAYBACK_POSITION_UNKNOWN, if (np.paused) 0f else 1f)
            .build())
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTE_ID, notification())
        if (!np.paused && !hasFocus && !takeFocus()) {
            // no sound allowed now (a call is up): the reading waits paused
            shell?.let { if (it.listening && !it.listenPaused) it.pauseListen() }
        }
        holdWake(!np.paused)
        holdSilence(!np.paused)
        main.removeCallbacks(pausedTooLong)
        if (np.paused) main.postDelayed(pausedTooLong, PAUSED_LIMIT_MS)
    }

    private fun goForeground() {
        val n = notification()
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTE_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            else startForeground(NOTE_ID, n)
        } catch (e: Exception) {
            Log.w(TAG, "listen: foreground refused: $e")
        }
    }

    /**
     * The notification: the chapter and the volume on the app's mark, and the
     * player bar's own controls — back ten, pause or play, forward ten, stop.
     * The first three stay in the collapsed view. Tapping it opens the app.
     */
    private fun notification(): Notification {
        val np = now
        val paused = np?.paused ?: false
        @Suppress("DEPRECATION")
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
        b.setSmallIcon(R.drawable.ic_listen_note)
            .setContentTitle(np?.title ?: "Sefer Mormon")
            .setContentText(np?.artist ?: AppShell.SHARE_SUBJECT)
            .setContentIntent(openApp())
            .setDeleteIntent(control(ACTION_STOP))
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setShowWhen(false)
            .setOnlyAlertOnce(true)
            .setOngoing(!paused)
            .setColor(0xFF1B2A41.toInt())
            .addAction(action(R.drawable.ic_listen_back, "Back ten seconds", ACTION_BACK))
            .addAction(if (paused) action(R.drawable.ic_listen_play, "Resume", ACTION_TOGGLE) else action(R.drawable.ic_listen_pause, "Pause", ACTION_TOGGLE))
            .addAction(action(R.drawable.ic_listen_forward, "Forward ten seconds", ACTION_FORWARD))
            .addAction(action(R.drawable.ic_listen_stop, "Stop listening", ACTION_STOP))
            .setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1, 2))
        art?.let { b.setLargeIcon(it) }
        if (Build.VERSION.SDK_INT >= 26) b.setColorized(true)
        return b.build()
    }

    private fun action(icon: Int, label: String, what: String) =
        Notification.Action.Builder(Icon.createWithResource(this, icon), label, control(what)).build()

    private fun control(what: String): PendingIntent =
        PendingIntent.getService(this, what.hashCode(), Intent(this, ListenService::class.java).setAction(what),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun openApp(): PendingIntent =
        PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun makeChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        val ch = NotificationChannel(CHANNEL, "Reading aloud", NotificationManager.IMPORTANCE_LOW).apply {
            description = "The chapter being read aloud, with its controls"
            setShowBadge(false)
        }
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
    }

    /** The app's mark on its navy, square, for the lock screen and the shade. */
    private fun coverArt(): Bitmap? = try {
        val logo = BitmapFactory.decodeResource(resources, R.drawable.launch_logo)
        val side = 512
        val out = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888)
        val c = Canvas(out)
        c.drawColor(0xFF1B2A41.toInt())
        val scale = minOf(side.toFloat() / logo.width, side.toFloat() / logo.height)
        val w = (logo.width * scale).toInt(); val h = (logo.height * scale).toInt()
        c.drawBitmap(logo, null, Rect((side - w) / 2, (side - h) / 2, (side + w) / 2, (side + h) / 2), null)
        logo.recycle()
        out
    } catch (e: Throwable) { null }

    // MARK: - the transport, from outside the app

    private val transport = object : MediaSession.Callback() {
        override fun onPlay() { shell?.let { if (it.listening && it.listenPaused) { resumeOnGain = false; it.pauseListen() } } }
        override fun onPause() { shell?.let { if (it.listening && !it.listenPaused) { resumeOnGain = false; it.pauseListen() } } }
        override fun onStop() { shell?.stopListen() }
        override fun onRewind() { shell?.skipListen(back = true) }
        override fun onFastForward() { shell?.skipListen(back = false) }
        override fun onCustomAction(action: String, extras: Bundle?) {
            when (action) { CUSTOM_BACK -> onRewind(); CUSTOM_FORWARD -> onFastForward() }
        }
    }

    private fun togglePause() {
        val s = shell ?: return
        if (!s.listening) return
        resumeOnGain = false
        s.pauseListen()
    }

    /** Headphones pulled out: pause, never blare the chapter from the speaker. */
    private val unplugged = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            if (i.action != AudioManager.ACTION_AUDIO_BECOMING_NOISY) return
            shell?.let { if (it.listening && !it.listenPaused) { resumeOnGain = false; it.pauseListen() } }
        }
    }

    // MARK: - focus and wake

    private val focusChange = AudioManager.OnAudioFocusChangeListener { change ->
        val s = shell
        when (change) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                hasFocus = true
                if (resumeOnGain && s != null && s.listening && s.listenPaused) s.pauseListen()
                resumeOnGain = false
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                hasFocus = false; resumeOnGain = false
                if (s != null && s.listening && !s.listenPaused) s.pauseListen()
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // a voice is not ducked under another: it stops, and comes back after
                hasFocus = false
                if (s != null && s.listening && !s.listenPaused) { resumeOnGain = true; s.pauseListen() }
            }
        }
    }

    @Suppress("DEPRECATION")   // the pre-26 focus calls
    private fun takeFocus(): Boolean {
        val granted = if (Build.VERSION.SDK_INT >= 26) {
            val r = focusRequest ?: AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                .setWillPauseWhenDucked(true)
                .setOnAudioFocusChangeListener(focusChange, main)
                .build().also { focusRequest = it }
            audio.requestAudioFocus(r)
        } else {
            audio.requestAudioFocus(focusChange, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
        }
        hasFocus = granted == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        return hasFocus
    }

    @Suppress("DEPRECATION")
    private fun dropFocus() {
        if (Build.VERSION.SDK_INT >= 26) focusRequest?.let { audio.abandonAudioFocusRequest(it) }
        else audio.abandonAudioFocus(focusChange)
        hasFocus = false
        resumeOnGain = false
    }

    private fun holdWake(on: Boolean) {
        if (on) {
            val w = wake ?: (getSystemService(POWER_SERVICE) as PowerManager)
                .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SeferMormon:listen")
                .also { it.setReferenceCounted(false); wake = it }
            w.acquire(WAKE_LIMIT_MS)
        } else {
            wake?.let { if (it.isHeld) it.release() }
        }
    }

    /** Half a second of silence, looped while the voice is going (see the class note). */
    private fun holdSilence(on: Boolean) {
        try {
            if (on) {
                val t = silence ?: run {
                    val rate = 8000
                    val frames = rate / 2
                    AudioTrack.Builder()
                        .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                        .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(rate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                        .setTransferMode(AudioTrack.MODE_STATIC)
                        .setBufferSizeInBytes(frames * 2)
                        .build()
                        .also { it.write(ShortArray(frames), 0, frames); it.setLoopPoints(0, frames, -1); silence = it }
                }
                if (t.playState != AudioTrack.PLAYSTATE_PLAYING) t.play()
            } else {
                silence?.let { if (it.playState == AudioTrack.PLAYSTATE_PLAYING) it.pause() }
            }
        } catch (e: Exception) {
            Log.w(TAG, "listen: silent track: $e")
        }
    }

    private val pausedTooLong: Runnable = object : Runnable {
        override fun run() {
            val me = ActivityManager.RunningAppProcessInfo()
            ActivityManager.getMyMemoryState(me)
            if (me.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) main.postDelayed(this, PAUSED_LIMIT_MS)
            else shell?.stopListen()
        }
    }
}
