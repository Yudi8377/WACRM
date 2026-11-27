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
    tagline: "Mulai digitalisasi toko & WhatsApp bisnis dengan cepat tanpa biaya bulanan.",
    badge: "Gratis",
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
      "Hingga 2 agen CS bersamaan (Web & Android)",
      "WhatsApp + 1 kanal media sosial, maks 300 kontak",
      "Master Data & POS Kasir + Label Pengiriman QR",
      "Cetak universal: USB-C/Micro-USB OTG, Bluetooth, WiFi, Inkjet/LaserJet & EDC",
      "2 Agen AI Dasar (CS & Order Extractor)",
    ],
  },
  {
    id: "pro",
    name: "Growth Pro",
    tagline: "Automasi penuh penjualan omnichannel, ERP gudang & SEO AI untuk UMKM bertumbuh.",
    badge: "Populer",
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
      "Hingga 10 agen CS serentak (Desktop, Android & iOS)",
      "Semua 5 kanal omnichannel (WA, IG, Messenger, TikTok, YouTube)",
      "AI Auto-Reply 24/7 Tanpa Klik + Eskalasi Admin Otomatis",
      "ERP Gudang, Supplier & Mutasi Stok Real-Time",
      "Multi-Agent SEO & Growth AI (Google, WA, IG, TikTok, YouTube, FB)",
      "100% White-Label Nama Toko pada Invoice, Label QR & Laporan",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise AI Suite",
    tagline: "Seluruh 9 Agen AI Otonom, Asisten Suara 24/7, Akuntansi Double-Entry & Self-Healing.",
    badge: "Rekomendasi",
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
      "Agen CS Unlimited + 5 Cabang/Workspace dengan RLS PostgreSQL",
      "Seluruh 9 Multi-Agent AI Otonom (termasuk SEO AI, Follow-Up Hunter & Procurement Forecast)",
      "24/7 AI Personal Companion Suara & Teks + Memori Kontinu sampai 'cukup'",
      "Akuntansi Double-Entry Neraca & Laba Rugi + Jurnal Pelunasan Otomatis",
      "Fraud Sentinel (Anti Prompt/SQL/XSS Injection) & Self-Healing Guardian",
      "Dashboard Super Admin, Audit & Diagnostik 1-Klik",
    ],
  },
  {
    id: "sovereign",
    name: "Sovereign Corporate",
    tagline: "Infrastruktur privat, custom domain & APK Android berlabel perusahaan Anda sendiri.",
    badge: "Korporasi",
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
  return APP_EDITIONS.find((e) => e.id === id) ?? APP_EDITIONS[2];
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
