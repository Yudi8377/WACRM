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
            "https://wacrm-seven-dusky.vercel.app",
            UrlValidator.normalizeBaseUrl("https://wacrm-seven-dusky.vercel.app/")
        )
    }

    @Test
    fun rejectsInsecureRemoteHttpAndEmbeddedCredentials() {
        assertNull(UrlValidator.normalizeBaseUrl("http://example.com"))
        assertNull(UrlValidator.normalizeBaseUrl("https://user:pass@wacrm-seven-dusky.vercel.app"))
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
        assertTrue(UrlValidator.isSameOriginHost("https://wacrm-seven-dusky.vercel.app/demo", "https://wacrm-seven-dusky.vercel.app"))
        assertFalse(UrlValidator.isSameOriginHost("https://evil.example.com/demo", "https://wacrm-seven-dusky.vercel.app"))
    }
}
