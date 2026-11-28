package com.wacrm.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UrlValidatorTest {
    @Test
    fun acceptsHttpsUrlsAndTrimsTrailingSlash() {
        assertEquals(
            "https://wacrm-commercial.dwahyudi8377.workers.dev",
            UrlValidator.normalizeBaseUrl("https://wacrm-commercial.dwahyudi8377.workers.dev/")
        )
    }

    @Test
    fun rejectsInsecureRemoteHttpAndEmbeddedCredentials() {
        assertNull(UrlValidator.normalizeBaseUrl("http://example.com"))
        assertNull(UrlValidator.normalizeBaseUrl("https://user:pass@wacrm-commercial.dwahyudi8377.workers.dev"))
        assertNull(UrlValidator.normalizeBaseUrl("javascript:alert(1)"))
    }

    @Test
    fun allowsAndroidEmulatorLocalhostForDevelopment() {
        assertEquals(
            "http://10.0.2.2:3000",
            UrlValidator.normalizeBaseUrl("http://10.0.2.2:3000/")
        )
    }

    @Test
    fun matchesSameOriginHostsSafely() {
        assertTrue(
            UrlValidator.isSameOriginHost(
                "https://wacrm-commercial.dwahyudi8377.workers.dev/privacy",
                "https://wacrm-commercial.dwahyudi8377.workers.dev"
            )
        )
        assertTrue(
            UrlValidator.isSameOriginHost(
                "https://wacrm-commercial.dwahyudi8377.workers.dev/demo",
                "https://wacrm-commercial.dwahyudi8377.workers.dev"
            )
        )
        assertFalse(
            UrlValidator.isSameOriginHost(
                "https://evil.example.com/demo",
                "https://wacrm-commercial.dwahyudi8377.workers.dev"
            )
        )
    }

    @Test
    fun sanitizesDeepLinkPaths() {
        assertEquals("/privacy", UrlValidator.safeDeepLinkPath("/privacy"))
        assertEquals("/demo", UrlValidator.safeDeepLinkPath("/demo"))
        assertEquals("", UrlValidator.safeDeepLinkPath("//evil.com/phish"))
        assertEquals("", UrlValidator.safeDeepLinkPath("/../etc/passwd"))
        assertEquals("", UrlValidator.safeDeepLinkPath(null))
    }
}
