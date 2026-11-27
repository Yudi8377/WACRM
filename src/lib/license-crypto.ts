import type { AppEditionId } from "@/lib/crm-types";
import { getEditionById } from "@/lib/editions";

const EDITION_TO_CODE: Record<AppEditionId, string> = {
  starter: "STR",
  pro: "PRO",
  enterprise: "ENT",
  sovereign: "SOV",
};

const CODE_TO_EDITION: Record<string, AppEditionId> = {
  STR: "starter",
  PRO: "pro",
  ENT: "enterprise",
  SOV: "sovereign",
};

const LICENSE_SIGNING_SALT =
  process.env.NEXT_PUBLIC_WACRM_LICENSE_SALT || "WACRM-PUBLISHER-HQ-2026-SIGN-V1";

/**
 * Pure deterministic 32-bit FNV-1a + Murmur-style avalanche digest producing an 8-char hex signature.
 * Works identically in both browser and Node.js runtimes across the separate
 * WACRM Publisher HQ app and WACRM Client instances.
 */
export function computeLicenseSignature(payload: string, salt = LICENSE_SIGNING_SALT): string {
  const input = `${salt}::${payload}::WACRM-LMS`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + ((h1 >>> 13) & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h2 ^= h2 >>> 15;
  h2 = Math.imul(h2, 0xc2b2ae35);
  h2 ^= h2 >>> 16;

  const combined = ((h1 ^ h2) >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return combined.slice(0, 8);
}

export interface IssueLicenseKeyParams {
  editionId: AppEditionId;
  expiryYear: number; // e.g. 2027
  expiryMonth: number; // 1..12
  maxSeats: number; // 1..9999 (9999 = Unlimited)
}

export interface VerifiedLicensePayload {
  valid: boolean;
  normalizedKey: string;
  editionId?: AppEditionId;
  editionName?: string;
  maxSeats?: number;
  isUnlimitedSeats?: boolean;
  expiresAt?: string;
  isExpired?: boolean;
  signature?: string;
  verificationMode: "cryptographic_offline" | "publisher_live";
  error?: string;
}

export interface StoredClientLicense {
  licenseKey: string;
  editionId: AppEditionId;
  maxSeats: number;
  expiresAt: string;
  activatedAt: string;
  licensedTo: string;
  licensedEmail?: string | null;
  verificationMode: "cryptographic_offline" | "publisher_live";
  status: "active" | "expired";
}

export function issueSignedLicenseKey(params: IssueLicenseKeyParams): string {
  const code = EDITION_TO_CODE[params.editionId];
  const yy = String(Math.max(2025, Math.min(2099, Math.floor(params.expiryYear))) % 100).padStart(
    2,
    "0",
  );
  const mm = String(Math.max(1, Math.min(12, Math.floor(params.expiryMonth)))).padStart(2, "0");
  const yymm = `${yy}${mm}`;
  const seats = String(Math.max(1, Math.min(9999, Math.floor(params.maxSeats)))).padStart(4, "0");
  const body = `WACRM-${code}-${yymm}-${seats}`;
  const sig = computeLicenseSignature(body);
  return `${body}-${sig}`;
}

export function verifySignedLicenseKey(
  rawKey: string,
  now = new Date(),
): VerifiedLicensePayload {
  const normalizedKey = rawKey.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalizedKey.match(/^WACRM-(STR|PRO|ENT|SOV)-(\d{2})(\d{2})-(\d{4})-([0-9A-F]{8})$/);

  if (!match) {
    return {
      valid: false,
      normalizedKey,
      verificationMode: "cryptographic_offline",
      error:
        "Format License Key tidak valid. Gunakan format resmi Penerbit: WACRM-ENT-2711-0050-XXXXXXXX.",
    };
  }

  const [, tierCode, yyStr, mmStr, seatsStr, providedSig] = match;
  const body = `WACRM-${tierCode}-${yyStr}${mmStr}-${seatsStr}`;
  const expectedSig = computeLicenseSignature(body);

  if (providedSig !== expectedSig) {
    return {
      valid: false,
      normalizedKey,
      verificationMode: "cryptographic_offline",
      error:
        "Tanda tangan kriptografi License Key tidak cocok. Pastikan key diterbitkan oleh WACRM Publisher HQ.",
    };
  }

  const editionId = CODE_TO_EDITION[tierCode];
  const edition = getEditionById(editionId);
  const year = 2000 + Number.parseInt(yyStr, 10);
  const month = Number.parseInt(mmStr, 10);
  if (month < 1 || month > 12) {
    return {
      valid: false,
      normalizedKey,
      verificationMode: "cryptographic_offline",
      error: "Bulan masa berlaku pada License Key tidak valid.",
    };
  }

  // Last day of expiry month
  const expiryDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const expiresAt = expiryDate.toISOString().slice(0, 10);
  const isExpired = expiryDate.getTime() < now.getTime();
  const maxSeats = Number.parseInt(seatsStr, 10);

  return {
    valid: !isExpired,
    normalizedKey,
    editionId,
    editionName: edition.name,
    maxSeats,
    isUnlimitedSeats: maxSeats >= 9999,
    expiresAt,
    isExpired,
    signature: providedSig,
    verificationMode: "cryptographic_offline",
    error: isExpired
      ? `License Key telah kedaluwarsa pada ${expiresAt}. Silakan perpanjang melalui PT WACRM Digital Nusantara (Publisher HQ).`
      : undefined,
  };
}

function normalizeScopeEmail(accountEmail?: string | null): string | null {
  const clean = accountEmail?.trim().toLowerCase();
  return clean && clean.length > 0 ? clean : null;
}

function legacyLicenseStorageKey(tenantId: string): string {
  return `wacrm_active_license_v4_${tenantId}`;
}

export function licenseStorageKey(tenantId: string, accountEmail?: string | null): string {
  const scopeEmail = normalizeScopeEmail(accountEmail);
  return scopeEmail
    ? `wacrm_active_license_v5_${tenantId}::${scopeEmail}`
    : `wacrm_active_license_v5_${tenantId}`;
}

/**
 * Purges legacy unscoped v4 license & edition keys that previously leaked
 * across different user accounts sharing the same browser.
 */
export function clearLegacyUnscopedLicenseStorage(tenantId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(legacyLicenseStorageKey(tenantId));
    window.localStorage.removeItem(`wacrm_tenant_edition_v4_${tenantId}`);
  } catch {
    // Ignore storage access errors
  }
}

export function loadStoredClientLicense(
  tenantId: string,
  accountEmail?: string | null,
): StoredClientLicense | null {
  if (typeof window === "undefined") return null;
  try {
    const scopeEmail = normalizeScopeEmail(accountEmail);
    const raw = window.localStorage.getItem(licenseStorageKey(tenantId, scopeEmail));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredClientLicense;
    if (!parsed.licenseKey || !parsed.editionId) return null;

    // Cross-account isolation guard: never return a license bound to another email
    if (
      scopeEmail &&
      parsed.licensedEmail &&
      parsed.licensedEmail.trim().toLowerCase() !== scopeEmail
    ) {
      return null;
    }

    // Re-verify signature & expiry on every read so tampered/expired keys cannot persist
    const check = verifySignedLicenseKey(parsed.licenseKey);
    if (!check.valid || check.isExpired || !check.editionId) {
      return null;
    }

    return {
      ...parsed,
      editionId: check.editionId,
      maxSeats: check.maxSeats ?? parsed.maxSeats,
      expiresAt: check.expiresAt ?? parsed.expiresAt,
      status: "active",
    };
  } catch {
    return null;
  }
}

export function saveStoredClientLicense(
  tenantId: string,
  license: StoredClientLicense,
  accountEmail?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const scopeEmail = normalizeScopeEmail(accountEmail ?? license.licensedEmail);
    const payload: StoredClientLicense = {
      ...license,
      licensedEmail: scopeEmail ?? license.licensedEmail ?? null,
    };
    window.localStorage.setItem(licenseStorageKey(tenantId, scopeEmail), JSON.stringify(payload));
    // Also remove any legacy unscoped v4 key so it can never leak into another account
    window.localStorage.removeItem(legacyLicenseStorageKey(tenantId));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredClientLicense(
  tenantId: string,
  accountEmail?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const scopeEmail = normalizeScopeEmail(accountEmail);
    window.localStorage.removeItem(licenseStorageKey(tenantId, scopeEmail));
    window.localStorage.removeItem(legacyLicenseStorageKey(tenantId));
  } catch {
    // Ignore
  }
}

export interface ResolvedSessionEntitlement {
  editionId: AppEditionId;
  activeLicense: StoredClientLicense | null;
  licenseMaxSeats: number | null;
  isLicensed: boolean;
  isTrialActive: boolean;
  isFreeForever: boolean;
  trialEndsAt: string | null;
}

/**
 * Single source of truth for resolving a signed-in user's edition & license:
 * 1. Verified paid License Key bound to THIS exact account unlocks its exact tier (STR/PRO/ENT/SOV).
 * 2. Active non-expired Trial bound to THIS exact account unlocks:
 *    - Growth Pro (14 days)
 *    - Enterprise AI Suite (7 days)
 *    (Sovereign Corporate NEVER unlocks via trial — License Key required!)
 * 3. Otherwise (including Starter UMKM or expired Pro/Enterprise trial) strictly resolves to
 *    "starter" (Starter UMKM — Gratis Selamanya, tanpa batas trial).
 * 4. Cross-account isolation guarantees another account's Sovereign key on the same browser NEVER leaks.
 */
export function resolveStrictSessionEntitlement(params: {
  tenantId: string;
  accountEmail?: string | null;
  sessionEditionId?: AppEditionId;
  sessionLicenseKey?: string | null;
  sessionHasPaidLicense?: boolean;
  trialEndsAt?: string | null;
  workspaceName?: string;
  nowMs?: number;
}): ResolvedSessionEntitlement {
  const scopeEmail = normalizeScopeEmail(params.accountEmail);
  const nowMs = params.nowMs ?? Date.now();

  // 1. Check license key attached directly to this account session
  const sessionKey = params.sessionLicenseKey?.trim();
  if (sessionKey) {
    const verified = verifySignedLicenseKey(sessionKey, new Date(nowMs));
    if (verified.valid && !verified.isExpired && verified.editionId && verified.expiresAt) {
      const storedForAccount = loadStoredClientLicense(params.tenantId, scopeEmail);
      const activeLicense: StoredClientLicense =
        storedForAccount && storedForAccount.licenseKey === verified.normalizedKey
          ? storedForAccount
          : {
              licenseKey: verified.normalizedKey,
              editionId: verified.editionId,
              maxSeats: verified.maxSeats ?? 2,
              expiresAt: verified.expiresAt,
              activatedAt: new Date(nowMs).toISOString().slice(0, 10),
              licensedTo: params.workspaceName || "Workspace WACRM",
              licensedEmail: scopeEmail,
              verificationMode: verified.verificationMode,
              status: "active",
            };
      return {
        editionId: verified.editionId,
        activeLicense,
        licenseMaxSeats: verified.maxSeats ?? null,
        isLicensed: true,
        isTrialActive: false,
        isFreeForever: false,
        trialEndsAt: null,
      };
    }
  }

  // 2. If session explicitly has NO paid license, check if THIS session has an active Pro (14d) or Enterprise (7d) trial
  if (params.sessionHasPaidLicense === false && !sessionKey) {
    if (
      (params.sessionEditionId === "pro" || params.sessionEditionId === "enterprise") &&
      params.trialEndsAt
    ) {
      const endMs = Date.parse(params.trialEndsAt);
      if (!Number.isNaN(endMs) && endMs > nowMs) {
        return {
          editionId: params.sessionEditionId,
          activeLicense: null,
          licenseMaxSeats: null,
          isLicensed: false,
          isTrialActive: true,
          isFreeForever: false,
          trialEndsAt: new Date(endMs).toISOString(),
        };
      }
    }
    // Starter UMKM (Free Forever) or expired trial -> strictly Starter UMKM, NEVER inherit another account's key
    return {
      editionId: "starter",
      activeLicense: null,
      licenseMaxSeats: null,
      isLicensed: false,
      isTrialActive: false,
      isFreeForever: true,
      trialEndsAt: null,
    };
  }

  // 3. Check strictly account-scoped license storage (for Better Auth / restored paid sessions)
  if (scopeEmail) {
    const storedForAccount = loadStoredClientLicense(params.tenantId, scopeEmail);
    if (storedForAccount && storedForAccount.status === "active") {
      return {
        editionId: storedForAccount.editionId,
        activeLicense: storedForAccount,
        licenseMaxSeats: storedForAccount.maxSeats,
        isLicensed: true,
        isTrialActive: false,
        isFreeForever: false,
        trialEndsAt: null,
      };
    }
  }

  // 4. Active Pro (14d) or Enterprise (7d) trial fallback when sessionHasPaidLicense was omitted
  if (
    (params.sessionEditionId === "pro" || params.sessionEditionId === "enterprise") &&
    params.trialEndsAt
  ) {
    const endMs = Date.parse(params.trialEndsAt);
    if (!Number.isNaN(endMs) && endMs > nowMs) {
      return {
        editionId: params.sessionEditionId,
        activeLicense: null,
        licenseMaxSeats: null,
        isLicensed: false,
        isTrialActive: true,
        isFreeForever: false,
        trialEndsAt: new Date(endMs).toISOString(),
      };
    }
  }

  // 5. Default fallback: strictly Starter UMKM (Gratis Selamanya)
  return {
    editionId: "starter",
    activeLicense: null,
    licenseMaxSeats: null,
    isLicensed: false,
    isTrialActive: false,
    isFreeForever: true,
    trialEndsAt: null,
  };
}
