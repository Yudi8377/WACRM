"use client";

import type { CommercialUserSession } from "@/lib/access-control";

export type BiometricMethod =
  | "android_biometric"
  | "webauthn_platform"
  | "device_pin"
  | "unavailable";

export interface BiometricCapability {
  available: boolean;
  method: BiometricMethod;
  label: string;
  detail: string;
  isAndroidWebView?: boolean;
}

export interface EnrolledBiometricProfile {
  email: string;
  userId: string;
  displayName: string;
  businessName: string;
  city?: string;
  role: CommercialUserSession["role"];
  editionId: CommercialUserSession["editionId"];
  hasPaidLicense: boolean;
  licenseKey?: string | null;
  trialEditionId?: "pro" | "enterprise" | null;
  usedTrialEditions?: Array<"pro" | "enterprise">;
  trialStartedAt: string;
  trialEndsAt: string;
  platform: "web" | "android";
  method: BiometricMethod;
  credentialIdBase64: string;
  pinSalt?: string;
  pinHash?: string;
  enrolledAt: string;
  lastUsedAt?: string;
}

const BIOMETRIC_VAULT_KEY = "wacrm_biometric_vault_v5";

interface AndroidBiometricBridge {
  isBiometricAvailable?: () => boolean;
  authenticateBiometric?: (title: string, subtitle: string) => void;
}

function getAndroidBiometricBridge(): AndroidBiometricBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { WACRMAndroid?: AndroidBiometricBridge }).WACRMAndroid;
  return bridge ?? null;
}

/**
 * Detects Android APK / in-app WebView runtimes where FIDO2 WebAuthn
 * (`navigator.credentials.create`) is commonly blocked by Android WebView even when
 * `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` resolves true.
 */
export function isAndroidWebViewRuntime(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/WACRM-Android/i.test(ua)) return true;
  if (/;\s*wv\)/i.test(ua)) return true;
  if (Boolean(getAndroidBiometricBridge())) return true;
  return false;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function randomChallenge(length = 32): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return arr;
}

async function hashDevicePin(pinCode: string, salt: string): Promise<string> {
  const payload = `wacrm-biometric-pin-v5:${salt}:${pinCode}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return bytesToBase64Url(new Uint8Array(digest));
  }
  // Safe deterministic fallback when SubtleCrypto is unavailable on older WebViews
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`;
}

/**
 * Builds a complete CommercialUserSession from active workspace / Better Auth context when
 * `loadCommercialSession()` is not yet populated (for example direct Neon Better Auth login
 * or Sovereign Corporate deployment).
 */
export function buildBiometricSessionFallback(params: {
  email?: string | null;
  displayName?: string | null;
  businessName?: string | null;
  userId?: string | null;
  role: CommercialUserSession["role"];
  editionId: CommercialUserSession["editionId"];
  licenseKey?: string | null;
}): CommercialUserSession | null {
  const cleanEmail = (params.email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return null;
  const nowIso = new Date().toISOString();
  const isPaid = params.editionId !== "starter" || Boolean(params.licenseKey);
  return {
    userId: (params.userId || "").trim() || `usr_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`,
    email: cleanEmail,
    displayName: (params.displayName || "").trim() || cleanEmail.split("@")[0] || "Pemilik Usaha",
    businessName: (params.businessName || "").trim() || "Workspace WACRM",
    role: params.role,
    editionId: params.editionId,
    authProvider: "cloud_neon",
    hasPaidLicense: isPaid,
    licenseKey: params.licenseKey ?? null,
    trialStartedAt: nowIso,
    trialEndsAt: nowIso,
    platform: isAndroidWebViewRuntime() ? "android" : "web",
    signedInAt: nowIso,
  };
}

export async function detectBiometricCapability(): Promise<BiometricCapability> {
  if (typeof window === "undefined") {
    return {
      available: false,
      method: "unavailable",
      label: "Biometrik Tidak Tersedia",
      detail: "Dijalankan di lingkungan server.",
    };
  }

  const inAndroidWebView = isAndroidWebViewRuntime();

  // 1. Native Android APK BiometricPrompt (Fingerprint / Face Unlock / Device Credential)
  const androidBridge = getAndroidBiometricBridge();
  if (
    androidBridge &&
    typeof androidBridge.isBiometricAvailable === "function" &&
    typeof androidBridge.authenticateBiometric === "function"
  ) {
    try {
      const ok = androidBridge.isBiometricAvailable();
      if (ok) {
        return {
          available: true,
          method: "android_biometric",
          label: "Sidik Jari & Face Unlock Android",
          detail: "Sensor biometrik native Android aktif — login 1 sentuhan tanpa ketik sandi.",
          isAndroidWebView: true,
        };
      }
    } catch {
      // fall through
    }
  }

  // 2. Android WebView without native biometric bridge (older APK or sensor disabled in HP Settings)
  // NEVER fall through to broken FIDO2 WebAuthn inside Android WebView!
  if (inAndroidWebView) {
    return {
      available: true,
      method: "device_pin",
      label: "Kunci Cepat Perangkat HP (PIN 6-Digit / APK)",
      detail:
        "Mode APK/WebView terdeteksi. Aktifkan Kunci Cepat 6-Digit langsung sekarang (atau aktifkan Kunci Layar/Sidik Jari di Pengaturan HP & perbarui APK WACRM terbaru untuk sensor native).",
      isAndroidWebView: true,
    };
  }

  // 3. WebAuthn FIDO2 Platform Authenticator (Chrome Android, Safari iOS Face ID/Touch ID, Windows Hello, macOS Touch ID)
  try {
    const pkc = (window as unknown as {
      PublicKeyCredential?: {
        isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
      };
    }).PublicKeyCredential;

    if (
      pkc &&
      typeof pkc.isUserVerifyingPlatformAuthenticatorAvailable === "function" &&
      window.isSecureContext &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.credentials?.create)
    ) {
      const supported = await pkc.isUserVerifyingPlatformAuthenticatorAvailable();
      if (supported) {
        const ua = navigator.userAgent || "";
        const isApple = /iPhone|iPad|Mac/i.test(ua);
        return {
          available: true,
          method: "webauthn_platform",
          label: isApple ? "Face ID / Touch ID" : "Sidik Jari / Pengenalan Wajah (Passkey)",
          detail:
            "Perangkat Anda mendukung autentikasi biometrik FIDO2/WebAuthn resmi untuk masuk 1 sentuhan.",
          isAndroidWebView: false,
        };
      }
    }
  } catch {
    // ignore probe errors
  }

  // 4. Universal Safe Fallback: Device Quick-Unlock PIN (works on 100% of phones & browsers)
  return {
    available: true,
    method: "device_pin",
    label: "Kunci Cepat Perangkat (PIN 6-Digit)",
    detail:
      "Browser ini belum mengekspos sensor Passkey secara langsung. Aktifkan Kunci Cepat PIN 6-Digit terenkripsi SHA-256 agar tetap bisa masuk 1 langkah di perangkat ini.",
    isAndroidWebView: false,
  };
}

export function loadEnrolledBiometricProfiles(): EnrolledBiometricProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BIOMETRIC_VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EnrolledBiometricProfile[]) : [];
  } catch {
    return [];
  }
}

export function getEnrolledBiometricForEmail(email: string): EnrolledBiometricProfile | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  return loadEnrolledBiometricProfiles().find((p) => p.email.toLowerCase() === clean) ?? null;
}

export function getLatestEnrolledBiometricProfile(): EnrolledBiometricProfile | null {
  const list = loadEnrolledBiometricProfiles();
  if (list.length === 0) return null;
  return [...list].sort(
    (a, b) =>
      Date.parse(b.lastUsedAt || b.enrolledAt) - Date.parse(a.lastUsedAt || a.enrolledAt),
  )[0];
}

export function removeEnrolledBiometricProfile(email: string): void {
  if (typeof window === "undefined") return;
  const clean = email.trim().toLowerCase();
  const next = loadEnrolledBiometricProfiles().filter((p) => p.email.toLowerCase() !== clean);
  try {
    window.localStorage.setItem(BIOMETRIC_VAULT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function saveEnrolledBiometricProfile(profile: EnrolledBiometricProfile): void {
  if (typeof window === "undefined") return;
  const existing = loadEnrolledBiometricProfiles().filter(
    (p) => p.email.toLowerCase() !== profile.email.toLowerCase(),
  );
  existing.unshift(profile);
  try {
    window.localStorage.setItem(BIOMETRIC_VAULT_KEY, JSON.stringify(existing.slice(0, 6)));
  } catch {
    // ignore storage errors
  }
}

function runNativeAndroidBiometric(title: string, subtitle: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const bridge = getAndroidBiometricBridge();
    if (!bridge || typeof bridge.authenticateBiometric !== "function") {
      resolve({ ok: false, error: "Bridge Biometrik Android tidak tersedia." });
      return;
    }

    const timeout = setTimeout(() => {
      resolve({ ok: false, error: "Waktu verifikasi biometrik habis. Silakan coba lagi." });
    }, 35_000);

    (window as unknown as {
      __wacrmBiometricResult?: (ok: boolean, detail?: string) => void;
    }).__wacrmBiometricResult = (ok: boolean, detail?: string) => {
      clearTimeout(timeout);
      resolve(ok ? { ok: true } : { ok: false, error: detail || "Verifikasi biometrik dibatalkan." });
    };

    try {
      bridge.authenticateBiometric(title, subtitle);
    } catch {
      clearTimeout(timeout);
      resolve({ ok: false, error: "Gagal membuka dialog Sidik Jari / Face Recognition Android." });
    }
  });
}

function createProfileRecord(
  session: CommercialUserSession,
  extra: Pick<EnrolledBiometricProfile, "method" | "credentialIdBase64" | "platform"> & {
    pinSalt?: string;
    pinHash?: string;
  },
): EnrolledBiometricProfile {
  const email = session.email.trim().toLowerCase();
  const nowIso = new Date().toISOString();
  return {
    email,
    userId: session.userId,
    displayName: session.displayName,
    businessName: session.businessName,
    city: session.city,
    role: session.role,
    editionId: session.editionId,
    hasPaidLicense: Boolean(session.hasPaidLicense),
    licenseKey: session.licenseKey ?? null,
    trialEditionId: session.trialEditionId ?? null,
    usedTrialEditions: session.usedTrialEditions ?? [],
    trialStartedAt: session.trialStartedAt ?? nowIso,
    trialEndsAt: session.trialEndsAt ?? nowIso,
    platform: extra.platform,
    method: extra.method,
    credentialIdBase64: extra.credentialIdBase64,
    pinSalt: extra.pinSalt,
    pinHash: extra.pinHash,
    enrolledAt: nowIso,
    lastUsedAt: nowIso,
  };
}

/**
 * Registers device Fingerprint / Face Recognition (or encrypted 6-digit Quick PIN fallback)
 * for the currently logged-in account (supports Starter, Pro, Enterprise & Sovereign Corporate).
 */
export async function enrollBiometricForSession(
  session: CommercialUserSession,
  options?: {
    pinCode?: string;
    forceDevicePin?: boolean;
    /** Pass pre-detected capability from component mount so navigator.credentials.create() executes synchronously inside the user tap gesture without expiring transient user activation! */
    capability?: BiometricCapability | null;
  },
): Promise<{
  ok: boolean;
  profile?: EnrolledBiometricProfile;
  error?: string;
  fallbackPinSuggested?: boolean;
}> {
  const cap = options?.capability ?? (await detectBiometricCapability());
  const email = session.email.trim().toLowerCase();
  if (!email) {
    return {
      ok: false,
      error: "Email akun aktif tidak ditemukan. Silakan simpan profil atau masuk ulang terlebih dahulu.",
    };
  }

  // Option A: Encrypted Device Quick PIN (explicitly requested OR capability is device_pin)
  if (options?.forceDevicePin || cap.method === "device_pin") {
    const cleanPin = (options?.pinCode || "").replace(/\D/g, "");
    if (cleanPin.length < 4 || cleanPin.length > 8) {
      return {
        ok: false,
        fallbackPinSuggested: true,
        error: "Masukkan PIN Cepat 6 digit angka untuk mengaktifkan Kunci Cepat Perangkat HP.",
      };
    }
    const salt = bytesToBase64Url(randomChallenge(16));
    const pinHash = await hashDevicePin(cleanPin, salt);
    const profile = createProfileRecord(session, {
      platform: cap.isAndroidWebView ? "android" : session.platform ?? "web",
      method: "device_pin",
      credentialIdBase64: bytesToBase64Url(randomChallenge(24)),
      pinSalt: salt,
      pinHash,
    });
    saveEnrolledBiometricProfile(profile);
    return { ok: true, profile };
  }

  if (!cap.available) {
    return {
      ok: false,
      fallbackPinSuggested: true,
      error:
        "Sensor Sidik Jari / Face ID tidak terdeteksi di browser ini. Anda tetap bisa mengaktifkan Kunci Cepat PIN 6-Digit.",
    };
  }

  // Option B: Native Android BiometricPrompt (Fingerprint / Face Unlock / Screen Lock)
  if (cap.method === "android_biometric") {
    const res = await runNativeAndroidBiometric(
      "Aktifkan Login Biometrik WACRM",
      `Verifikasi Sidik Jari / Wajah untuk ${email}`,
    );
    if (!res.ok) {
      return { ok: false, fallbackPinSuggested: true, error: res.error };
    }

    const profile = createProfileRecord(session, {
      platform: "android",
      method: "android_biometric",
      credentialIdBase64: bytesToBase64Url(randomChallenge(24)),
    });
    saveEnrolledBiometricProfile(profile);
    return { ok: true, profile };
  }

  // Option C: WebAuthn Platform Authenticator (FIDO2 Passkey on Android Chrome, iOS Safari, Desktop)
  const challenge = randomChallenge(32);
  const userIdBytes = new TextEncoder().encode((session.userId || email).slice(0, 64));
  const rpId = window.location.hostname;

  const basePublicKey: PublicKeyCredentialCreationOptions = {
    challenge: toExactArrayBuffer(challenge),
    rp: {
      name: "WACRM Commercial OS",
      id: rpId,
    },
    user: {
      id: toExactArrayBuffer(userIdBytes),
      name: email,
      displayName: session.displayName || email,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256 (Android / Apple standard)
      { type: "public-key", alg: -257 }, // RS256 (Windows Hello / legacy Android)
      { type: "public-key", alg: -8 }, // EdDSA
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "preferred",
      residentKey: "preferred",
    },
    timeout: 60_000,
    attestation: "none",
  };

  let credential: PublicKeyCredential | null = null;
  let lastError: unknown = null;

  try {
    credential = (await navigator.credentials.create({
      publicKey: basePublicKey,
    })) as PublicKeyCredential | null;
  } catch (firstErr) {
    lastError = firstErr;
    const errName = firstErr instanceof Error ? firstErr.name : "";
    // Many Android OEMs (Xiaomi/Oppo/Vivo/Samsung older Chrome) fail on `residentKey: "preferred"`
    // or strict `authenticatorAttachment: "platform"`. Retry progressively with relaxed constraints.
    if (
      errName === "NotSupportedError" ||
      errName === "ConstraintError" ||
      errName === "TypeError" ||
      errName === "NotAllowedError"
    ) {
      try {
        credential = (await navigator.credentials.create({
          publicKey: {
            ...basePublicKey,
            challenge: toExactArrayBuffer(randomChallenge(32)),
            authenticatorSelection: {
              userVerification: "preferred",
            },
          },
        })) as PublicKeyCredential | null;
        lastError = null;
      } catch (retryErr) {
        lastError = retryErr;
      }
    }
  }

  if (!credential) {
    const errName = lastError instanceof Error ? lastError.name : "";
    const msg =
      errName === "NotAllowedError"
        ? "Sensor Sidik Jari / Face ID ditolak atau dibatalkan oleh HP/browser. Pastikan Kunci Layar & Sidik Jari aktif di Pengaturan HP, atau gunakan PIN Cepat 6-Digit di bawah."
        : errName === "SecurityError" || errName === "InvalidStateError"
          ? `Browser membatasi Passkey pada konteks ini (${errName}). Gunakan PIN Cepat 6-Digit di bawah agar tetap bisa login 1 langkah.`
          : `Passkey belum didukung penuh oleh browser HP ini${errName ? ` (${errName})` : ""}. Gunakan PIN Cepat 6-Digit di bawah — 100% aman & langsung aktif!`;
    return { ok: false, fallbackPinSuggested: true, error: msg };
  }

  const credId = bytesToBase64Url(new Uint8Array(credential.rawId));
  const profile = createProfileRecord(session, {
    platform: session.platform ?? "web",
    method: "webauthn_platform",
    credentialIdBase64: credId,
  });
  saveEnrolledBiometricProfile(profile);
  return { ok: true, profile };
}

/**
 * Verifies Fingerprint / Face Recognition (or encrypted Device Quick PIN) on Sign-In
 * and returns the verified CommercialUserSession.
 */
export async function authenticateWithBiometric(
  preferredEmail?: string,
  pinCode?: string,
): Promise<{
  ok: boolean;
  session?: CommercialUserSession;
  requiresPin?: boolean;
  profile?: EnrolledBiometricProfile;
  error?: string;
}> {
  const profile = preferredEmail
    ? getEnrolledBiometricForEmail(preferredEmail) || getLatestEnrolledBiometricProfile()
    : getLatestEnrolledBiometricProfile();

  if (!profile) {
    return {
      ok: false,
      error:
        "Belum ada akun yang didaftarkan biometrik / kunci cepat di perangkat ini. Masuk sekali dengan email, lalu aktifkan Sidik Jari / Face ID di Pengaturan.",
    };
  }

  if (profile.method === "device_pin") {
    const cleanPin = (pinCode || "").replace(/\D/g, "");
    if (!cleanPin) {
      return {
        ok: false,
        requiresPin: true,
        profile,
        error: `Masukkan PIN Cepat perangkat untuk akun ${profile.email}.`,
      };
    }
    const expectedHash = profile.pinHash || "";
    const salt = profile.pinSalt || "";
    const computed = await hashDevicePin(cleanPin, salt);
    if (!expectedHash || computed !== expectedHash) {
      return {
        ok: false,
        requiresPin: true,
        profile,
        error: "PIN Cepat salah. Periksa kembali 6 digit PIN Anda.",
      };
    }
  } else if (profile.method === "android_biometric") {
    const res = await runNativeAndroidBiometric(
      "Masuk WACRM dengan Biometrik",
      `Gunakan Sidik Jari atau Face Unlock untuk ${profile.businessName || profile.email}`,
    );
    if (!res.ok) return { ok: false, error: res.error };
  } else {
    try {
      const challenge = randomChallenge(32);
      const credBytes = base64UrlToBytes(profile.credentialIdBase64);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: toExactArrayBuffer(challenge),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              type: "public-key",
              id: toExactArrayBuffer(credBytes),
              transports: ["internal"],
            },
          ],
          userVerification: "preferred",
          timeout: 60_000,
        },
      });
      if (!assertion) {
        return { ok: false, error: "Verifikasi biometrik dibatalkan." };
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Verifikasi Sidik Jari / Face ID dibatalkan."
          : "Verifikasi biometrik gagal. Silakan masuk dengan email & kata sandi.";
      return { ok: false, error: msg };
    }
  }

  const nowIso = new Date().toISOString();
  saveEnrolledBiometricProfile({ ...profile, lastUsedAt: nowIso });

  const session: CommercialUserSession = {
    userId: profile.userId,
    email: profile.email,
    displayName: profile.displayName,
    businessName: profile.businessName,
    city: profile.city,
    role: profile.role,
    editionId: profile.editionId,
    authProvider: profile.editionId === "sovereign" ? "cloud_neon" : "workspace_local",
    hasPaidLicense: profile.hasPaidLicense,
    licenseKey: profile.licenseKey ?? null,
    trialEditionId: profile.trialEditionId ?? null,
    usedTrialEditions: profile.usedTrialEditions ?? [],
    trialStartedAt: profile.trialStartedAt,
    trialEndsAt: profile.trialEndsAt,
    platform: profile.platform,
    signedInAt: nowIso,
  };
  return { ok: true, session };
}
