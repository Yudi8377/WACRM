package com.wacrm.android

import java.net.URI

object UrlValidator {
    fun normalizeBaseUrl(raw: String): String? {
        val trimmed = raw.trim().trimEnd('/')
        if (trimmed.isEmpty()) return null
        val uri = try {
            URI(trimmed)
        } catch (_: Exception) {
            return null
        }
        val scheme = uri.scheme?.lowercase() ?: return null
        val host = uri.host?.lowercase() ?: return null
        val isLocal = host == "localhost" || host == "127.0.0.1" || host == "10.0.2.2"
        if (scheme != "https" && !(scheme == "http" && isLocal)) {
            return null
        }
        if (uri.userInfo != null) return null
        return trimmed
    }

    fun isSameOriginHost(url: String, allowedBaseUrl: String): Boolean {
        return try {
            val targetHost = URI(url).host?.lowercase() ?: return false
            val baseHost = URI(allowedBaseUrl).host?.lowercase() ?: return false
            targetHost == baseHost || targetHost.endsWith(".$baseHost")
        } catch (_: Exception) {
            false
        }
    }
}
