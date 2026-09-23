package com.sefermormon.standardworks

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import com.google.android.play.core.review.ReviewManagerFactory
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * The Play Store review prompt, and when it is fair to spend one: the twin of
 * ReviewPrompt in StandardWorks/ContentView.swift, with the same gate.
 *
 * Google, like Apple, gives no way to learn whether someone has already rated,
 * and quietly declines to show the sheet once its own quota is spent. So
 * nothing here tries to find reviewers. It only refuses to spend an ask on
 * someone who has barely opened the book.
 *
 * **Launch counts are the wrong signal for a reader.** Opening the app twice is
 * not reading. The gate is DISTINCT DAYS used, and it waits a week besides:
 * seven days since first use, five separate days of use, once per version, two
 * seconds after a page the reader chose has settled. Never at launch, and never
 * from a button (Google's rule: a button must open the store listing instead,
 * which Settings does).
 *
 * The review flow needs an Activity and the shell holds only the application
 * context, so MainActivity lends itself here while it is alive.
 *
 * Nothing here can know whether the sheet appeared, so nothing downstream may
 * assume it did: no thank-you, no follow-up, no "you already rated" state.
 */
object ReviewPrompt {
    private const val STORE = "review"
    private const val FIRST_USE = "review.firstUse"
    private const val DAYS_USED = "review.daysUsed"
    private const val ASKED = "review.askedForVersion"

    private const val MIN_DAYS_SINCE_FIRST_USE = 7L
    private const val MIN_DISTINCT_DAYS_USED = 5
    private const val DAYS_KEPT = 40

    /** One ask per launch at most, however many pages settle. */
    private var askedThisLaunch = false
    private var host: WeakReference<Activity>? = null
    private val main = Handler(Looper.getMainLooper())

    fun attach(activity: Activity) { host = WeakReference(activity) }
    fun detach(activity: Activity) { if (host?.get() === activity) host = null }

    private fun prefs(c: Context) = c.getSharedPreferences(STORE, Context.MODE_PRIVATE)
    /** Never the device calendar: a fixed Gregorian stamp, as on iOS. */
    private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    private fun days(c: Context): MutableList<String> =
        (prefs(c).getString(DAYS_USED, "") ?: "").split(',').filter { it.isNotEmpty() }.toMutableList()

    /** Call as the app comes to the front. Idempotent within a day. */
    fun recordUse(c: Context) {
        val p = prefs(c)
        val edit = p.edit()
        if (!p.contains(FIRST_USE)) edit.putLong(FIRST_USE, System.currentTimeMillis())
        val days = days(c)
        val t = today()
        // contains(), not last != today: a device whose clock moves backwards
        // would otherwise count the same day twice.
        if (!days.contains(t)) {
            days.add(t)
            while (days.size > DAYS_KEPT) days.removeAt(0)
            edit.putString(DAYS_USED, days.joinToString(","))
        }
        edit.apply()
    }

    /** A page has finished loading and the reader is looking at something they chose. */
    fun consider(c: Context) {
        if (askedThisLaunch || !shouldAsk(c) || host?.get() == null) return
        askedThisLaunch = true
        // Recorded whether or not Play ends up showing it: the app cannot tell,
        // and asking again on this version would only spend another ask.
        prefs(c).edit().putString(ASKED, BuildConfig.VERSION_NAME).apply()
        main.postDelayed({
            val activity = host?.get() ?: return@postDelayed
            if (activity.isFinishing || activity.isDestroyed) return@postDelayed
            val manager = ReviewManagerFactory.create(activity)
            manager.requestReviewFlow().addOnCompleteListener { request ->
                if (request.isSuccessful && !activity.isFinishing && !activity.isDestroyed) {
                    manager.launchReviewFlow(activity, request.result)
                }
            }
        }, 2000)
    }

    private fun shouldAsk(c: Context): Boolean {
        val p = prefs(c)
        if (p.getString(ASKED, null) == BuildConfig.VERSION_NAME) return false
        val first = p.getLong(FIRST_USE, 0L)
        if (first <= 0L) return false
        val elapsed = TimeUnit.MILLISECONDS.toDays(System.currentTimeMillis() - first)
        if (elapsed < MIN_DAYS_SINCE_FIRST_USE) return false
        return days(c).size >= MIN_DISTINCT_DAYS_USED
    }
}
