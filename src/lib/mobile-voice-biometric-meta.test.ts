import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticateWithBiometric,
  buildBiometricSessionFallback,
  detectBiometricCapability,
  enrollBiometricForSession,
  removeEnrolledBiometricProfile,
} from "./biometric-auth";
import {
  cleanMetaAccessToken,
  diagnoseMetaWhatsAppDraft,
  normalizeWhatsAppPhoneNumber,
  parseMetaWhatsAppPaste,
} from "./meta-whatsapp-helper";
import {
  MetaWhatsAppValidationError,
  validateMetaWhatsAppDirectToken,
} from "./connectors/meta-whatsapp-validation";
import {
  COMPANION_FAB_PREF_KEY,
  loadCompanionFabVisible,
  saveCompanionFabVisible,
  speakWarmIndonesian,
  stopWarmSpeech,
} from "./warm-voice";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

describe("Mobile Companion UI, Voice AI Android Bridge, Biometric Sovereign & Meta WhatsApp Helpers", () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;
  const originalUtterance = (globalThis as unknown as { SpeechSynthesisUtterance?: unknown })
    .SpeechSynthesisUtterance;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    stopWarmSpeech();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      value: originalUtterance,
      configurable: true,
      writable: true,
    });
  });

  describe("1. Non-Intrusive AI Companion Floating Button Preference", () => {
    it("defaults to HIDDEN on Android / mobile viewports and VISIBLE on desktop", () => {
      const storage = createMemoryStorage();
      const listeners = new Map<string, EventListener>();
      const fakeWin = {
        innerWidth: 390,
        localStorage: storage,
        dispatchEvent: (ev: Event) => {
          listeners.get(ev.type)?.(ev);
          return true;
        },
        addEventListener: (t: string, fn: EventListener) => listeners.set(t, fn),
      };
      Object.defineProperty(globalThis, "window", { value: fakeWin, configurable: true, writable: true });
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "Mozilla/5.0 (Linux; Android 14) WACRM-Android/5.0.0" },
        configurable: true,
        writable: true,
      });

      expect(loadCompanionFabVisible()).toBe(false);

      // User explicitly enables it
      saveCompanionFabVisible(true);
      expect(storage.getItem(COMPANION_FAB_PREF_KEY)).toBe("visible");
      expect(loadCompanionFabVisible()).toBe(true);

      // User hides it again
      saveCompanionFabVisible(false);
      expect(loadCompanionFabVisible()).toBe(false);

      // Clear preference & test Desktop viewport default
      storage.clear();
      fakeWin.innerWidth = 1440;
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0.0.0" },
        configurable: true,
        writable: true,
      });
      expect(loadCompanionFabVisible()).toBe(true);
    });
  });

  describe("2. Voice AI Android Bridge 2-Arg Arity & Mobile Web Speech", () => {
    it("invokes WACRMAndroid.speakText with BOTH (text, 'id-ID') args and resolves on __wacrmOnSpeechEnd", () => {
      const speakText = vi.fn();
      const stopSpeaking = vi.fn();
      const fakeWin: Record<string, unknown> = {
        WACRMAndroid: { speakText, stopSpeaking },
      };
      Object.defineProperty(globalThis, "window", { value: fakeWin, configurable: true, writable: true });
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "Mozilla/5.0 (Linux; Android 14) WACRM-Android/5.0.0" },
        configurable: true,
        writable: true,
      });

      const onStart = vi.fn();
      const onEnd = vi.fn();
      const result = speakWarmIndonesian({
        text: "Halo **Kak**, omzet hari ini Rp 250.000!",
        onStart,
        onEnd,
      });

      expect(result.engine).toBe("android");
      expect(speakText).toHaveBeenCalledTimes(1);
      // MUST pass 2 arguments so Android @JavascriptInterface fun speakText(text, lang) matches!
      expect(speakText.mock.calls[0].length).toBe(2);
      expect(speakText.mock.calls[0][1]).toBe("id-ID");
      expect(onStart).toHaveBeenCalledTimes(1);

      // Native Android TTS completion callback ends speech cleanly
      const endCb = fakeWin.__wacrmOnSpeechEnd as (() => void) | undefined;
      expect(typeof endCb).toBe("function");
      endCb?.();
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it("falls back cleanly to synchronous Web Speech on mobile Chrome when Android bridge throws", () => {
      const spokenUtterances: Array<{ text: string; lang: string }> = [];
      class FakeUtterance {
        text: string;
        lang = "";
        voice: unknown = null;
        rate = 1;
        pitch = 1;
        volume = 1;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        constructor(t: string) {
          this.text = t;
        }
      }
      const speakMock = vi.fn((u: FakeUtterance) => {
        spokenUtterances.push({ text: u.text, lang: u.lang });
        u.onstart?.();
        u.onend?.();
      });
      const fakeWin = {
        WACRMAndroid: {
          speakText: () => {
            throw new Error("bridge method mismatch");
          },
        },
        speechSynthesis: {
          speaking: false,
          pending: false,
          paused: false,
          getVoices: () => [],
          speak: speakMock,
          cancel: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn(),
        },
      };
      Object.defineProperty(globalThis, "window", { value: fakeWin, configurable: true, writable: true });
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/131.0 Mobile Safari/537.36" },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
        value: FakeUtterance,
        configurable: true,
        writable: true,
      });

      const onEnd = vi.fn();
      const res = speakWarmIndonesian({ text: "Halo suara aktif sekarang.", onEnd });
      // Must speak SYNCHRONOUSLY (no setTimeout delay) to preserve mobile user-gesture token!
      expect(res.engine).toBe("web_speech");
      expect(speakMock).toHaveBeenCalledTimes(1);
      expect(spokenUtterances[0].lang).toBe("id-ID");
      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Biometric Login on HP, Android WebView & Sovereign Corporate", () => {
    it("detects Android WebView without native biometric as device_pin (never broken WebAuthn) and preserves Sovereign edition", async () => {
      const storage = createMemoryStorage();
      const fakeWin = {
        localStorage: storage,
        isSecureContext: true,
        location: { hostname: "wacrm-seven-dusky.vercel.app" },
        PublicKeyCredential: {
          isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
        },
      };
      Object.defineProperty(globalThis, "window", { value: fakeWin, configurable: true, writable: true });
      Object.defineProperty(globalThis, "navigator", {
        value: {
          userAgent: "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 WACRM-Android/4.5.0",
          credentials: { create: vi.fn(), get: vi.fn() },
        },
        configurable: true,
        writable: true,
      });

      const cap = await detectBiometricCapability();
      expect(cap.available).toBe(true);
      expect(cap.method).toBe("device_pin");
      expect(cap.isAndroidWebView).toBe(true);

      // Build fallback session for Sovereign Corporate without local commercial session
      const sovereignSess = buildBiometricSessionFallback({
        email: "ceo@sovereign-corp.id",
        displayName: "Direktur Utama",
        businessName: "PT Sovereign Nusantara",
        role: "owner",
        editionId: "sovereign",
        licenseKey: "WACRM-SOV-TEST-KEY",
      });
      expect(sovereignSess).not.toBeNull();
      expect(sovereignSess?.editionId).toBe("sovereign");
      expect(sovereignSess?.hasPaidLicense).toBe(true);

      // Enroll with 6-digit encrypted Quick PIN
      const enrollRes = await enrollBiometricForSession(sovereignSess!, { pinCode: "246810" });
      expect(enrollRes.ok).toBe(true);
      expect(enrollRes.profile?.editionId).toBe("sovereign");
      expect(enrollRes.profile?.method).toBe("device_pin");

      // Wrong PIN must be rejected
      const badLogin = await authenticateWithBiometric("ceo@sovereign-corp.id", "000000");
      expect(badLogin.ok).toBe(false);
      expect(badLogin.requiresPin).toBe(true);

      // Correct PIN unlocks full Sovereign Corporate session!
      const okLogin = await authenticateWithBiometric("ceo@sovereign-corp.id", "246810");
      expect(okLogin.ok).toBe(true);
      expect(okLogin.session?.editionId).toBe("sovereign");
      expect(okLogin.session?.hasPaidLicense).toBe(true);
      expect(okLogin.session?.email).toBe("ceo@sovereign-corp.id");

      removeEnrolledBiometricProfile("ceo@sovereign-corp.id");
    });

    it("prefers native Android BiometricPrompt when WACRMAndroid.isBiometricAvailable() is true", async () => {
      const fakeWin = {
        localStorage: createMemoryStorage(),
        isSecureContext: true,
        WACRMAndroid: {
          isBiometricAvailable: () => true,
          authenticateBiometric: vi.fn(),
        },
      };
      Object.defineProperty(globalThis, "window", { value: fakeWin, configurable: true, writable: true });
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "Mozilla/5.0 (Linux; Android 14) WACRM-Android/5.0.1" },
        configurable: true,
        writable: true,
      });

      const cap = await detectBiometricCapability();
      expect(cap.available).toBe(true);
      expect(cap.method).toBe("android_biometric");
    });
  });

  describe("4. Super-Easy Meta WhatsApp Smart Parser & Direct Graph Validation", () => {
    it("extracts Phone Number ID, Access Token, and WABA ID from Meta API Setup curl snippet", () => {
      const sampleCurl = `
        curl -i -X POST \\
          https://graph.facebook.com/v22.0/104567891234567/messages \\
          -H 'Authorization: Bearer EAAGm0PX4ZCpsBA1234567890abcdefghijklmnop' \\
          -H 'Content-Type: application/json' \\
          -d '{ "messaging_product": "whatsapp" }'
        WhatsApp Business Account ID: 109876543210987
      `;
      const parsed = parseMetaWhatsAppPaste(sampleCurl);
      expect(parsed.phoneNumberId).toBe("104567891234567");
      expect(parsed.wabaId).toBe("109876543210987");
      expect(parsed.accessToken).toBe("EAAGm0PX4ZCpsBA1234567890abcdefghijklmnop");
      expect(parsed.extractedFields).toEqual(["wabaId", "phoneNumberId", "accessToken"]);
    });

    it("diagnoses common user mistakes (08xx phone number, identical IDs, Bearer prefix)", () => {
      expect(cleanMetaAccessToken("Authorization: Bearer EAAToken12345")).toBe("EAAToken12345");
      expect(normalizeWhatsAppPhoneNumber("0812-3456-7890")).toBe("6281234567890");

      const wrongPhone = diagnoseMetaWhatsAppDraft({
        wabaId: "109876543210987",
        phoneNumberId: "081234567890",
        accessToken: "EAAGm0PX4ZCpsBA1234567890",
      });
      expect(wrongPhone.ready).toBe(false);
      expect(wrongPhone.warnings.some((w) => w.includes("bukan nomor HP biasa"))).toBe(true);

      const sameIds = diagnoseMetaWhatsAppDraft({
        wabaId: "109876543210987",
        phoneNumberId: "109876543210987",
        accessToken: "EAAGm0PX4ZCpsBA1234567890",
      });
      expect(sameIds.ready).toBe(false);
      expect(sameIds.warnings.some((w) => w.includes("tidak boleh sama"))).toBe(true);
    });

    it("validates workspace Meta tokens directly via Graph API when META_APP_SECRET is not hardcoded", async () => {
      const mockFetch = vi.fn(async (url: string | URL | Request) => {
        const u = String(url);
        if (u.includes("/104567891234567?fields=")) {
          return new Response(
            JSON.stringify({
              id: "104567891234567",
              display_phone_number: "+62 812-3456-7890",
              verified_name: "Toko Berkah Kediri",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (u.includes("/109876543210987/phone_numbers?")) {
          return new Response(JSON.stringify({ data: [{ id: "104567891234567" }] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("{}", { status: 404 });
      });

      const res = await validateMetaWhatsAppDirectToken(
        {
          wabaId: "109876543210987",
          phoneNumberId: "104567891234567",
          accessToken: "EAAGm0PX4ZCpsBA1234567890",
        },
        mockFetch as typeof fetch,
      );
      expect(res.verifiedName).toBe("Toko Berkah Kediri");
      expect(res.displayPhoneNumber).toBe("+62 812-3456-7890");
      expect(res.wabaId).toBe("109876543210987");

      // Invalid token returns MetaWhatsAppValidationError("invalid_token")
      const unauthorizedFetch = vi.fn(async () => new Response("{}", { status: 401 }));
      await expect(
        validateMetaWhatsAppDirectToken(
          {
            wabaId: "109876543210987",
            phoneNumberId: "104567891234567",
            accessToken: "EAAG-invalid-token",
          },
          unauthorizedFetch as typeof fetch,
        ),
      ).rejects.toBeInstanceOf(MetaWhatsAppValidationError);
    });
  });
});
