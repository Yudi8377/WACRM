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
    fun printWifiDocument(jobName: String?) {
        val safeTitle = jobName?.trim()?.take(80)?.ifEmpty { "WACRM Document" } ?: "WACRM Document"
        activity.runOnUiThread {
            activity.printCurrentWebView(safeTitle)
        }
    }

    @JavascriptInterface
    fun printHtml(title: String?, html: String?) {
        val safeHtml = html?.trim() ?: return
        if (safeHtml.isEmpty()) return
        val safeTitle = title?.trim()?.take(80)?.ifEmpty { "WACRM Document" } ?: "WACRM Document"
        activity.runOnUiThread {
            activity.printHtmlDocument(safeTitle, safeHtml)
        }
    }

    @JavascriptInterface
    fun printBluetoothEscPos(base64EscPos: String?, jobName: String?) {
        val payload = base64EscPos?.trim() ?: return
        if (payload.isEmpty()) return
        val safeJob = jobName?.trim()?.take(80)?.ifEmpty { "WACRM Thermal Receipt" } ?: "WACRM Thermal Receipt"
        activity.runOnUiThread {
            activity.printBluetoothEscPos(payload, safeJob)
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
