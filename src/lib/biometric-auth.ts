"use client";

import type { CommercialUserSession } from "@/lib/access-control";

export type BiometricMethod = "android_biometric" | "webauthn_platform" | "unavailable";

export interface BiometricCapability {
  available: boolean;
  method: BiometricMethod;
  label: string;
  detail: string;
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

export async function detectBiometricCapability(): Promise<BiometricCapability> {
  if (typeof window === "undefined") {
    return {
      available: false,
      method: "unavailable",
      label: "Biometrik Tidak Tersedia",
      detail: "Dijalankan di lingkungan server.",
    };
  }

  // 1. Native Android APK BiometricPrompt (Fingerprint / Face Unlock)
  const androidBridge = getAndroidBiometricBridge();
  if (androidBridge && typeof androidBridge.isBiometricAvailable === "function") {
    try {
      const ok = androidBridge.isBiometricAvailable();
      if (ok) {
        return {
          available: true,
          method: "android_biometric",
          label: "Sidik Jari & Face Unlock Android",
          detail: "Sensor biometrik native Android aktif — login 1 sentuhan tanpa ketik sandi.",
        };
      }
    } catch {
      // fall through to WebAuthn
    }
  }

  // 2. WebAuthn FIDO2 Platform Authenticator (Android Chrome, iOS Safari Face ID / Touch ID, Windows Hello, macOS Touch ID)
  try {
    const pkc = (window as unknown as {
      PublicKeyCredential?: {
        isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
      };
    }).PublicKeyCredential;

    if (
      pkc &&
      typeof pkc.isUserVerifyingPlatformAuthenticatorAvailable === "function" &&
      window.isSecureContext
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
        };
      }
    }
  } catch {
    // ignore probe errors
  }

  return {
    available: false,
    method: "unavailable",
    label: "Perangkat Tanpa Sensor Biometrik",
    detail:
      "Buka WACRM di HP Android/iPhone (PWA atau Aplikasi Android APK) untuk mengaktifkan login Sidik Jari & Face Recognition.",
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

/**
 * Registers device Fingerprint / Face Recognition for the currently logged-in account.
 */
export async function enrollBiometricForSession(
  session: CommercialUserSession,
): Promise<{ ok: boolean; profile?: EnrolledBiometricProfile; error?: string }> {
  const cap = await detectBiometricCapability();
  if (!cap.available) {
    return {
      ok: false,
      error:
        "Sensor Sidik Jari / Face ID tidak terdeteksi di browser ini. Pastikan Anda membuka WACRM lewat HTTPS di HP Android/iPhone atau Aplikasi Android APK.",
    };
  }

  const email = session.email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  if (cap.method === "android_biometric") {
    const res = await runNativeAndroidBiometric(
      "Aktifkan Login Biometrik WACRM",
      `Verifikasi Sidik Jari / Wajah untuk ${email}`,
    );
    if (!res.ok) return { ok: false, error: res.error };

    const profile: EnrolledBiometricProfile = {
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
      platform: "android",
      method: "android_biometric",
      credentialIdBase64: bytesToBase64Url(randomChallenge(24)),
      enrolledAt: nowIso,
      lastUsedAt: nowIso,
    };
    saveEnrolledBiometricProfile(profile);
    return { ok: true, profile };
  }

  // WebAuthn Platform Authenticator (FIDO2)
  try {
    const challenge = randomChallenge(32);
    const userIdBytes = new TextEncoder().encode(session.userId.slice(0, 64));
    const rpId = window.location.hostname;
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rp: {
          name: "WACRM Commercial OS",
          id: rpId,
        },
        user: {
          id: userIdBytes.buffer as ArrayBuffer,
          name: email,
          displayName: session.displayName || email,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 45_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { ok: false, error: "Pendaftaran biometrik dibatalkan pengguna." };
    }

    const credId = bytesToBase64Url(new Uint8Array(credential.rawId));
    const profile: EnrolledBiometricProfile = {
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
      platform: session.platform ?? "web",
      method: "webauthn_platform",
      credentialIdBase64: credId,
      enrolledAt: nowIso,
      lastUsedAt: nowIso,
    };
    saveEnrolledBiometricProfile(profile);
    return { ok: true, profile };
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "NotAllowedError"
        ? "Verifikasi Sidik Jari / Face ID dibatalkan atau belum aktif di perangkat Anda."
        : "Gagal mengaktifkan biometrik di browser ini.";
    return { ok: false, error: msg };
  }
}

/**
 * Verifies Fingerprint / Face Recognition on Sign-In and returns the verified CommercialUserSession.
 */
export async function authenticateWithBiometric(
  preferredEmail?: string,
): Promise<{ ok: boolean; session?: CommercialUserSession; error?: string }> {
  const profile = preferredEmail
    ? getEnrolledBiometricForEmail(preferredEmail) || getLatestEnrolledBiometricProfile()
    : getLatestEnrolledBiometricProfile();

  if (!profile) {
    return {
      ok: false,
      error:
        "Belum ada akun yang didaftarkan biometrik di perangkat ini. Masuk sekali dengan email, lalu aktifkan Sidik Jari / Face ID di Pengaturan.",
    };
  }

  if (profile.method === "android_biometric") {
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
          challenge: challenge.buffer as ArrayBuffer,
          rpId: window.location.hostname,
          allowCredentials: [
            {
              type: "public-key",
              id: credBytes.buffer as ArrayBuffer,
              transports: ["internal"],
            },
          ],
          userVerification: "required",
          timeout: 45_000,
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
    authProvider: "workspace_local",
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
