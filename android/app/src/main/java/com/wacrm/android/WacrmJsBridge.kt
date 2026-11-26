package com.wacrm.android

import android.content.Intent
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import android.widget.Toast

class WacrmJsBridge(
    private val activity: MainActivity
) {
    @JavascriptInterface
    fun showToast(message: String?) {
        val safe = message?.trim()?.take(200) ?: return
        if (safe.isEmpty()) return
        activity.runOnUiThread {
            Toast.makeText(activity, safe, Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun shareText(title: String?, text: String?) {
        val body = text?.trim()?.take(4096) ?: return
        if (body.isEmpty()) return
        activity.runOnUiThread {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, title?.take(120) ?: "WACRM")
                putExtra(Intent.EXTRA_TEXT, body)
            }
            activity.startActivity(Intent.createChooser(intent, "Bagikan melalui"))
        }
    }

    @JavascriptInterface
    fun hapticFeedback() {
        activity.runOnUiThread {
            activity.window.decorView.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
        }
    }

    @JavascriptInterface
    fun getAppVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun openSettings() {
        activity.runOnUiThread {
            activity.showServerSettingsDialog()
        }
    }
}
