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

function licenseStorageKey(tenantId: string): string {
  return `wacrm_active_license_v4_${tenantId}`;
}

export function loadStoredClientLicense(tenantId: string): StoredClientLicense | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(licenseStorageKey(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredClientLicense;
    if (!parsed.licenseKey || !parsed.editionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredClientLicense(tenantId: string, license: StoredClientLicense): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(licenseStorageKey(tenantId), JSON.stringify(license));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredClientLicense(tenantId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(licenseStorageKey(tenantId));
  } catch {
    // Ignore
  }
}
