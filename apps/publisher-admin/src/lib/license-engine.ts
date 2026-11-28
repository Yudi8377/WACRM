import type { EditionId } from "./publisher-types";

export interface EditionSpec {
  id: EditionId;
  code: "STR" | "PRO" | "ENT" | "SOV";
  name: string;
  badge: string;
  positioning: string;
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
    badge: "Gratis Selamanya · Wajib Daftar",
    positioning: "Digitalisasi toko dasar: Inbox 2 kanal, POS COD/QR, Master Data, ERP Gudang dasar (tanpa AI Zero-Click & Akuntansi).",
    monthlyPriceIdr: 0,
    annualPriceIdr: 0,
    defaultSeats: 2,
    maxAiAgents: 2,
    maxBranches: 1,
    entitlements: [
      "omnichannel_inbox",
      "master_data",
      "pos_qr_shipping_label",
      "erp_warehouse",
      "universal_printing_usb_edc",
      "ai_2_basic_agents",
    ],
  },
  pro: {
    id: "pro",
    code: "PRO",
    name: "Growth Pro",
    badge: "Trial 14 Hari · Scale-Up UMKM",
    positioning: "Membuka AI Auto-Reply Zero-Click 24/7, Scanner QR Kamera FIFO Anti-Basi, SEO Growth AI 6 Kanal & 100% White-Label.",
    monthlyPriceIdr: 249_000,
    annualPriceIdr: 2_390_000,
    defaultSeats: 10,
    maxAiAgents: 6,
    maxBranches: 2,
    entitlements: [
      "omnichannel_inbox",
      "zero_click_ai",
      "master_data",
      "universal_printing_usb_edc",
      "pos_qr_shipping_label",
      "erp_warehouse",
      "qr_camera_fifo_scanner",
      "seo_growth_ai",
      "white_label_store",
      "ai_6_agents",
    ],
  },
  enterprise: {
    id: "enterprise",
    code: "ENT",
    name: "Enterprise AI Suite",
    badge: "Trial 7 Hari · 9 Agen AI & Pembukuan Operasional",
    positioning: "Seluruh 9 Agen AI Otonom, Otak AI Self-Learning Saran Produk & Auto-Bundling 3-in-1, Suara AI 24/7, Fraud Sentinel & Pembukuan Operasional (Suite PSAK/SPT/HRD/Strategi Marketing terkunci di Sovereign).",
    monthlyPriceIdr: 699_000,
    annualPriceIdr: 6_790_000,
    defaultSeats: 9999,
    maxAiAgents: 9,
    maxBranches: 5,
    entitlements: [
      "omnichannel_inbox",
      "zero_click_ai",
      "master_data",
      "universal_printing_usb_edc",
      "pos_qr_shipping_label",
      "erp_warehouse",
      "qr_camera_fifo_scanner",
      "double_entry_accounting",
      "ai_product_recommender",
      "seo_growth_ai",
      "voice_companion_24_7",
      "fraud_sentinel_healing",
      "white_label_store",
      "super_admin_analytics",
      "ai_9_agents",
    ],
  },
  sovereign: {
    id: "sovereign",
    code: "SOV",
    name: "Sovereign Corporate",
    badge: "Korporasi · License Key Resmi (Full OS)",
    positioning: "Full Corporate OS: Eksklusif Strategi Marketing Enterprise 5-Agen AI, Akuntansi Korporat PSAK & SPT Pajak Lengkap, HRD & Payroll CRUD+Print (PPh 21 TER), ERP Korporat (ABC/MRP/BOM/Opname/Vendor SLA), Suite CRM/POS/SEO Korporat, Forecast 90h & Dedicated DB.",
    monthlyPriceIdr: 1_950_000,
    annualPriceIdr: 18_900_000,
    defaultSeats: 9999,
    maxAiAgents: 9,
    maxBranches: 999,
    entitlements: [
      "omnichannel_inbox",
      "zero_click_ai",
      "master_data",
      "universal_printing_usb_edc",
      "pos_qr_shipping_label",
      "erp_warehouse",
      "qr_camera_fifo_scanner",
      "double_entry_accounting",
      "ai_product_recommender",
      "buyer_interest_forecast",
      "hrd_payroll_corporate",
      "sovereign_corporate_accounting",
      "sovereign_corporate_erp",
      "sovereign_corporate_crm_pos_seo",
      "enterprise_marketing_strategy",
      "seo_growth_ai",
      "voice_companion_24_7",
      "fraud_sentinel_healing",
      "white_label_store",
      "super_admin_analytics",
      "custom_branded_apk",
      "dedicated_db_sla",
      "ai_9_agents",
    ],
  },
};

export const V53_EDITION_CAPABILITY_MATRIX: Array<{
  key: string;
  label: string;
  tiers: Record<EditionId, boolean>;
}> = [
  { key: "erp_warehouse", label: "Inbox Omnichannel, POS COD/QR, Master Data & ERP Gudang Operasional", tiers: { starter: true, pro: true, enterprise: true, sovereign: true } },
  { key: "zero_click_ai", label: "AI Auto-Reply 24/7 Zero-Click, Scanner QR Kamera FIFO, SEO AI 6 Kanal & White-Label", tiers: { starter: false, pro: true, enterprise: true, sovereign: true } },
  { key: "ai_product_recommender", label: "Otak AI Self-Learning Saran Produk Anti-Generik + Auto-Bundling 3-in-1 Persetujuan User", tiers: { starter: false, pro: false, enterprise: true, sovereign: true } },
  { key: "double_entry_accounting", label: "Pembukuan Operasional (Jurnal Harian, Buku Kas, Piutang COD & Laba Rugi Ringkas)", tiers: { starter: false, pro: false, enterprise: true, sovereign: true } },
  { key: "voice_companion_24_7", label: "9 Agen AI Penuh + Pemandu Suara AI 24/7 + Fraud Sentinel & SWOT", tiers: { starter: false, pro: false, enterprise: true, sovereign: true } },
  { key: "sovereign_corporate_accounting", label: "EKSKLUSIF: Akuntansi Korporat PSAK, Neraca, COA 4-Digit, SPT Pajak (PPN/PPh Badan/21/23/4(2)) & Audit CSV/Excel", tiers: { starter: false, pro: false, enterprise: false, sovereign: true } },
  { key: "hrd_payroll_corporate", label: "EKSKLUSIF: HRD & Payroll Korporat CRUD + Print (Karyawan, Absensi, Lembur PP 35/2021, Cuti, KPI 40/20/20/20, PPh 21 TER)", tiers: { starter: false, pro: false, enterprise: false, sovereign: true } },
  { key: "sovereign_corporate_erp", label: "EKSKLUSIF: ERP Korporat (ABC/MRP ROP-EOQ, Multi-Gudang, PO/GRN, BOM HPP, Stock Opname & Vendor SLA)", tiers: { starter: false, pro: false, enterprise: false, sovereign: true } },
  { key: "sovereign_corporate_crm_pos_seo", label: "EKSKLUSIF: Suite Korporat CRM Pipeline/RFM, POS Shift/VIP Loyalty & Technical SEO Audit JSON-LD", tiers: { starter: false, pro: false, enterprise: false, sovereign: true } },
  { key: "enterprise_marketing_strategy", label: "EKSKLUSIF: Strategi Pemasaran Enterprise — 5 Multi-Agent AI (Data, SWOT/Persona, ROAS 90h, Roadmap & Skrip)", tiers: { starter: false, pro: false, enterprise: false, sovereign: true } },
  { key: "buyer_interest_forecast", label: "EKSKLUSIF: Tren Minat Pembeli & Forecasting 30–90 Hari + Custom Branded APK & Dedicated DB", tiers: { starter: false, pro: false, enterprise: false, sovereign: true } },
];

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
