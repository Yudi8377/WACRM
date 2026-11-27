import type { EditionId } from "./publisher-types";

export interface EditionSpec {
  id: EditionId;
  code: "STR" | "PRO" | "ENT" | "SOV";
  name: string;
  monthlyPriceIdr: number;
  annualPriceIdr: number;
  defaultSeats: number;
  maxAiAgents: number;
  maxBranches: number;
  entitlements: string[];
}

export const PUBLISHER_EDITIONS: Record<EditionId, EditionSpec> = {
  starter: {
    id: "starter",
    code: "STR",
    name: "Starter UMKM",
    monthlyPriceIdr: 0,
    annualPriceIdr: 0,
    defaultSeats: 3,
    maxAiAgents: 3,
    maxBranches: 1,
    entitlements: ["crm_inbox", "pos_thermal_print", "basic_erp", "ai_3_agents"],
  },
  pro: {
    id: "pro",
    code: "PRO",
    name: "Growth Pro",
    monthlyPriceIdr: 499_000,
    annualPriceIdr: 4_990_000,
    defaultSeats: 15,
    maxAiAgents: 6,
    maxBranches: 3,
    entitlements: [
      "crm_inbox",
      "omnichannel_5",
      "pos_universal_print",
      "erp_multi_warehouse",
      "accounting_double_entry",
      "ai_6_agents",
      "seo_catalog_public",
      "ai_template_slash",
    ],
  },
  enterprise: {
    id: "enterprise",
    code: "ENT",
    name: "Enterprise AI Suite",
    monthlyPriceIdr: 1_990_000,
    annualPriceIdr: 19_900_000,
    defaultSeats: 50,
    maxAiAgents: 9,
    maxBranches: 20,
    entitlements: [
      "crm_inbox",
      "omnichannel_unlimited",
      "pos_universal_usb_edc",
      "erp_full",
      "accounting_psak",
      "ai_9_agents",
      "seo_catalog_public",
      "ai_template_slash",
      "white_label_print",
      "priority_sla_support",
    ],
  },
  sovereign: {
    id: "sovereign",
    code: "SOV",
    name: "Sovereign Corporate",
    monthlyPriceIdr: 5_990_000,
    annualPriceIdr: 59_900_000,
    defaultSeats: 9999,
    maxAiAgents: 9,
    maxBranches: 999,
    entitlements: [
      "crm_inbox",
      "omnichannel_unlimited",
      "pos_universal_usb_edc",
      "erp_full",
      "accounting_psak",
      "ai_9_agents",
      "seo_catalog_public",
      "ai_template_slash",
      "white_label_print",
      "custom_branded_apk",
      "dedicated_db_cluster",
      "sla_99_9_24x7",
    ],
  },
};

const CODE_TO_EDITION: Record<string, EditionId> = {
  STR: "starter",
  PRO: "pro",
  ENT: "enterprise",
  SOV: "sovereign",
};

const LICENSE_SIGNING_SALT =
  process.env.NEXT_PUBLIC_WACRM_LICENSE_SALT || "WACRM-PUBLISHER-HQ-2026-SIGN-V1";

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

  return ((h1 ^ h2) >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}

export function issueSignedLicenseKey(params: {
  editionId: EditionId;
  expiryYear: number;
  expiryMonth: number;
  maxSeats: number;
}): string {
  const spec = PUBLISHER_EDITIONS[params.editionId];
  const yy = String(Math.max(2025, Math.min(2099, Math.floor(params.expiryYear))) % 100).padStart(
    2,
    "0",
  );
  const mm = String(Math.max(1, Math.min(12, Math.floor(params.expiryMonth)))).padStart(2, "0");
  const seats = String(Math.max(1, Math.min(9999, Math.floor(params.maxSeats)))).padStart(4, "0");
  const body = `WACRM-${spec.code}-${yy}${mm}-${seats}`;
  const sig = computeLicenseSignature(body);
  return `${body}-${sig}`;
}

export interface LicenseVerificationResult {
  valid: boolean;
  normalizedKey: string;
  editionId?: EditionId;
  editionName?: string;
  maxSeats?: number;
  isUnlimitedSeats?: boolean;
  expiresAt?: string;
  isExpired?: boolean;
  entitlements?: string[];
  signature?: string;
  error?: string;
}

export function verifySignedLicenseKey(
  rawKey: string,
  now = new Date(),
): LicenseVerificationResult {
  const normalizedKey = rawKey.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalizedKey.match(/^WACRM-(STR|PRO|ENT|SOV)-(\d{2})(\d{2})-(\d{4})-([0-9A-F]{8})$/);

  if (!match) {
    return {
      valid: false,
      normalizedKey,
      error: "Format License Key tidak valid (contoh: WACRM-ENT-2711-0050-XXXXXXXX).",
    };
  }

  const [, code, yyStr, mmStr, seatsStr, providedSig] = match;
  const body = `WACRM-${code}-${yyStr}${mmStr}-${seatsStr}`;
  const expectedSig = computeLicenseSignature(body);

  if (providedSig !== expectedSig) {
    return {
      valid: false,
      normalizedKey,
      error: "Signature kriptografi tidak valid — key bukan terbitan resmi PT WACRM Digital Nusantara.",
    };
  }

  const editionId = CODE_TO_EDITION[code];
  const spec = PUBLISHER_EDITIONS[editionId];
  const year = 2000 + Number.parseInt(yyStr, 10);
  const month = Number.parseInt(mmStr, 10);
  if (month < 1 || month > 12) {
    return { valid: false, normalizedKey, error: "Bulan kedaluwarsa tidak valid." };
  }

  const expiryDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const expiresAt = expiryDate.toISOString().slice(0, 10);
  const isExpired = expiryDate.getTime() < now.getTime();
  const maxSeats = Number.parseInt(seatsStr, 10);

  return {
    valid: !isExpired,
    normalizedKey,
    editionId,
    editionName: spec.name,
    maxSeats,
    isUnlimitedSeats: maxSeats >= 9999,
    expiresAt,
    isExpired,
    entitlements: spec.entitlements,
    signature: providedSig,
    error: isExpired ? `Lisensi telah kedaluwarsa pada ${expiresAt}.` : undefined,
  };
}
