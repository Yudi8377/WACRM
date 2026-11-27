import type { AppEditionId } from "@/lib/crm-types";

export type EditionFeatureKey =
  | "omnichannel_inbox"
  | "zero_click_ai"
  | "master_data"
  | "universal_printing_usb_edc"
  | "pos_qr_shipping_label"
  | "erp_warehouse"
  | "double_entry_accounting"
  | "seo_growth_ai"
  | "voice_companion_24_7"
  | "fraud_sentinel_healing"
  | "white_label_store"
  | "super_admin_analytics"
  | "custom_branded_apk"
  | "dedicated_db_sla";

export interface AppEditionDefinition {
  id: AppEditionId;
  name: string;
  tagline: string;
  badge: string;
  trialDays: number; // 0 = Starter UMKM Gratis Selamanya; 14 = Growth Pro Trial; 7 = Enterprise Trial; 0 = Sovereign License Key Only
  monthlyPriceIdr: number;
  annualPriceIdr: number;
  recommended?: boolean;
  limits: {
    maxAgents: number; // -1 = unlimited
    maxContacts: number;
    maxChannels: number;
    maxAiAgents: number;
    maxWorkspaces: number;
  };
  features: EditionFeatureKey[];
  highlights: string[];
}

export const APP_EDITIONS: AppEditionDefinition[] = [
  {
    id: "starter",
    name: "Starter UMKM",
    tagline: "Gratis selamanya tanpa batas trial setelah mendaftar. Digitalisasi toko, WhatsApp, POS QR & FAQ AI.",
    badge: "Gratis Selamanya · Wajib Daftar",
    trialDays: 0,
    monthlyPriceIdr: 0,
    annualPriceIdr: 0,
    limits: {
      maxAgents: 2,
      maxContacts: 300,
      maxChannels: 2,
      maxAiAgents: 2,
      maxWorkspaces: 1,
    },
    features: [
      "omnichannel_inbox",
      "master_data",
      "pos_qr_shipping_label",
      "universal_printing_usb_edc",
    ],
    highlights: [
      "Gratis selamanya tanpa batas trial (wajib mendaftar akun email terlebih dahulu)",
      "Hingga 2 agen CS bersamaan (Web & Android), maks 300 kontak & 2 kanal",
      "Master Data & POS Kasir + Label Pengiriman QR",
      "Cetak universal: USB-C/Micro-USB OTG, Bluetooth, WiFi, Inkjet/LaserJet & EDC",
      "2 Agen AI Dasar (CS & Order Extractor) + Pusat FAQ Multi-Agen AI & Komunitas",
    ],
  },
  {
    id: "pro",
    name: "Growth Pro",
    tagline: "Trial gratis 14 hari! Automasi penuh penjualan omnichannel, ERP gudang & SEO AI untuk UMKM bertumbuh.",
    badge: "Trial 14 Hari · Populer",
    trialDays: 14,
    monthlyPriceIdr: 249_000,
    annualPriceIdr: 2_390_000,
    limits: {
      maxAgents: 10,
      maxContacts: 5_000,
      maxChannels: 5,
      maxAiAgents: 6,
      maxWorkspaces: 2,
    },
    features: [
      "omnichannel_inbox",
      "zero_click_ai",
      "master_data",
      "universal_printing_usb_edc",
      "pos_qr_shipping_label",
      "erp_warehouse",
      "seo_growth_ai",
      "white_label_store",
    ],
    highlights: [
      "Trial Gratis 14 Hari Penuh (otomatis kembali ke Starter UMKM Gratis jika belum aktivasi License Key)",
      "Hingga 10 agen CS serentak (Desktop, Android & iOS) & 5 kanal omnichannel",
      "AI Auto-Reply 24/7 Tanpa Klik + Eskalasi Admin Otomatis & 6 Agen AI",
      "ERP Gudang, Supplier & Mutasi Stok Real-Time",
      "Multi-Agent SEO & Growth AI (Google, WA, IG, TikTok, YouTube, FB)",
      "100% White-Label Nama Toko pada Invoice, Label QR & Laporan",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise AI Suite",
    tagline: "Trial gratis 7 hari! Seluruh 9 Agen AI Otonom, Pemandu Suara AI 24/7, Akuntansi Double-Entry & Self-Healing.",
    badge: "Trial 7 Hari · Rekomendasi",
    trialDays: 7,
    monthlyPriceIdr: 699_000,
    annualPriceIdr: 6_790_000,
    recommended: true,
    limits: {
      maxAgents: -1,
      maxContacts: 50_000,
      maxChannels: 20,
      maxAiAgents: 9,
      maxWorkspaces: 5,
    },
    features: [
      "omnichannel_inbox",
      "zero_click_ai",
      "master_data",
      "universal_printing_usb_edc",
      "pos_qr_shipping_label",
      "erp_warehouse",
      "double_entry_accounting",
      "seo_growth_ai",
      "voice_companion_24_7",
      "fraud_sentinel_healing",
      "white_label_store",
      "super_admin_analytics",
    ],
    highlights: [
      "Trial Gratis 7 Hari Penuh (otomatis kembali ke Starter UMKM Gratis setelah 7 hari tanpa key)",
      "Agen CS Unlimited + 5 Cabang/Workspace dengan RLS PostgreSQL",
      "Seluruh 9 Multi-Agent AI Otonom (termasuk SEO AI, Follow-Up Hunter & Procurement Forecast)",
      "24/7 AI Personal Companion Suara Hangat & Memori Kontinu sampai 'cukup'",
      "Akuntansi Double-Entry Neraca & Laba Rugi + Jurnal Pelunasan Otomatis",
      "Fraud Sentinel (Anti Prompt/SQL/XSS Injection) & Self-Healing Guardian",
    ],
  },
  {
    id: "sovereign",
    name: "Sovereign Corporate",
    tagline: "Infrastruktur privat, custom domain & APK Android berlabel perusahaan Anda sendiri (License Key Resmi).",
    badge: "Korporasi · License Key",
    trialDays: 0,
    monthlyPriceIdr: 1_950_000,
    annualPriceIdr: 18_900_000,
    limits: {
      maxAgents: -1,
      maxContacts: -1,
      maxChannels: -1,
      maxAiAgents: 9,
      maxWorkspaces: -1,
    },
    features: [
      "omnichannel_inbox",
      "zero_click_ai",
      "master_data",
      "universal_printing_usb_edc",
      "pos_qr_shipping_label",
      "erp_warehouse",
      "double_entry_accounting",
      "seo_growth_ai",
      "voice_companion_24_7",
      "fraud_sentinel_healing",
      "white_label_store",
      "super_admin_analytics",
      "custom_branded_apk",
      "dedicated_db_sla",
    ],
    highlights: [
      "Semua fitur Enterprise AI Suite tanpa batas agen, kontak & cabang",
      "Custom Branded Android APK & Custom Domain penuh atas nama perusahaan",
      "Database Neon PostgreSQL Dedicated + SLA 99.95% & Backup Harian",
      "Integrasi ERP / EDC / Webhook kustom + Priority Engineering Support",
    ],
  },
];

export const EDITION_FEATURE_LABELS: Record<EditionFeatureKey, string> = {
  omnichannel_inbox: "Inbox Omnichannel (WA, IG, Messenger, TikTok, YT)",
  zero_click_ai: "AI Auto-Reply 24/7 Otomatis Tanpa Klik + Eskalasi Admin",
  master_data: "Menu Master Data Lengkap (6 Modul)",
  universal_printing_usb_edc: "Cetak Universal: USB-C/Micro-USB OTG, Bluetooth, WiFi, Inkjet/LaserJet & EDC",
  pos_qr_shipping_label: "POS Auto-Invoice Lunas & Label Pengiriman QR",
  erp_warehouse: "ERP Gudang, Supplier & Mutasi Stok",
  double_entry_accounting: "Akuntansi Double-Entry, Laba Rugi & Neraca Otomatis",
  seo_growth_ai: "Multi-Agent SEO & Omnichannel Growth AI (6 Kanal)",
  voice_companion_24_7: "24/7 AI Personal Companion Suara & Teks (Memori Kontinu)",
  fraud_sentinel_healing: "Fraud Sentinel (Anti-Injection) & Self-Healing Guardian",
  white_label_store: "100% White-Label Identitas Toko pada Seluruh Dokumen",
  super_admin_analytics: "Dashboard Super Admin, Analitik SWOT & Auto-Perbaikan",
  custom_branded_apk: "Custom Branded Android APK & Custom Domain",
  dedicated_db_sla: "Dedicated Neon Database & SLA Korporasi 99.95%",
};

export function getEditionById(id: AppEditionId): AppEditionDefinition {
  return APP_EDITIONS.find((e) => e.id === id) ?? APP_EDITIONS[0];
}

export function getTrialDaysForEdition(editionId: AppEditionId): number {
  return getEditionById(editionId).trialDays;
}

export function editionHasFeature(editionId: AppEditionId, feature: EditionFeatureKey): boolean {
  return getEditionById(editionId).features.includes(feature);
}

const EDITION_KEY_PREFIX = "wacrm_tenant_edition_v4_";

export function loadTenantEdition(tenantId: string): AppEditionId {
  if (typeof window === "undefined") return "starter";
  try {
    const raw = window.localStorage.getItem(`${EDITION_KEY_PREFIX}${tenantId}`);
    if (raw === "starter" || raw === "pro" || raw === "enterprise" || raw === "sovereign") {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return "starter";
}

export function saveTenantEdition(tenantId: string, editionId: AppEditionId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${EDITION_KEY_PREFIX}${tenantId}`, editionId);
  } catch {
    // ignore
  }
}
