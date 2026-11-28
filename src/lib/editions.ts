import type { AppEditionId } from "@/lib/crm-types";

export type EditionFeatureKey =
  | "omnichannel_inbox"
  | "zero_click_ai"
  | "master_data"
  | "universal_printing_usb_edc"
  | "pos_qr_shipping_label"
  | "erp_warehouse"
  | "qr_camera_fifo_scanner"
  | "double_entry_accounting"
  | "seo_growth_ai"
  | "voice_companion_24_7"
  | "fraud_sentinel_healing"
  | "ai_product_recommender"
  | "white_label_store"
  | "super_admin_analytics"
  | "buyer_interest_forecast"
  | "hrd_payroll_corporate"
  | "sovereign_corporate_accounting"
  | "sovereign_corporate_erp"
  | "sovereign_corporate_crm_pos_seo"
  | "enterprise_marketing_strategy"
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
    tagline: "Gratis selamanya tanpa batas trial setelah mendaftar. Digitalisasi toko, WhatsApp, POS COD, ERP Gudang & FAQ AI.",
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
      "erp_warehouse",
      "universal_printing_usb_edc",
    ],
    highlights: [
      "Gratis selamanya tanpa batas trial (wajib mendaftar akun email terlebih dahulu)",
      "Hingga 2 agen CS bersamaan (Web & Android + Login Biometrik Sidik Jari/Face ID), maks 300 kontak & 2 kanal",
      "ERP & Gudang aktif penuh: Pantau Stok Real-Time, Mutasi Keluar-Masuk, Peringatan Stok Menipis & Supplier",
      "Master Data, POS Kasir, COD Marketplace + Lacak Pengiriman & Label QR",
      "Cetak universal Plug & Play: USB-C/Micro-USB OTG, Bluetooth, WiFi, Inkjet/LaserJet & EDC",
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
      "qr_camera_fifo_scanner",
      "seo_growth_ai",
      "white_label_store",
    ],
    highlights: [
      "Trial Gratis 14 Hari Penuh (otomatis kembali ke Starter UMKM Gratis jika belum aktivasi License Key)",
      "Hingga 10 agen CS serentak (Desktop, Android & iOS) & 5 kanal omnichannel",
      "Scanner QR Kamera Belakang HP → Otomatis Barang Masuk, Gudang FIFO Anti-Basi, POS & Keuangan",
      "AI Auto-Reply 24/7 Tanpa Klik + COD Marketplace & Lacak Pengiriman + Notif AI Kurir",
      "ERP Gudang, Supplier & Mutasi Stok + Multi-Agent SEO Growth AI (6 Kanal)",
      "100% White-Label Nama Toko pada Invoice, Label QR & Laporan",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise AI Suite",
    tagline: "Trial gratis 7 hari! Seluruh 9 Agen AI Otonom, Saran Produk Terlaris AI + Auto-Bundling, Suara AI 24/7 & Pembukuan Operasional.",
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
      "qr_camera_fifo_scanner",
      "double_entry_accounting",
      "seo_growth_ai",
      "voice_companion_24_7",
      "fraud_sentinel_healing",
      "ai_product_recommender",
      "white_label_store",
      "super_admin_analytics",
    ],
    highlights: [
      "Trial Gratis 7 Hari Penuh (otomatis kembali ke Starter UMKM Gratis setelah 7 hari tanpa key)",
      "Otak AI Self-Learning Otonom: Saran Produk Spesifik Anti-Generik + Auto-Bundling 3-in-1 Persetujuan User",
      "Pembukuan & Akuntansi Operasional: Buku Kas, Jurnal Harian & Laba Rugi Ringkas (Suite PSAK/SPT Pajak di Sovereign)",
      "Seluruh 9 Multi-Agent AI Otonom + Pemandu Suara AI 24/7 Ramah & Hangat",
      "Scanner QR Kamera Belakang HP → Gudang FIFO Anti-Basi, POS & Jurnal Penjualan Otomatis",
      "Fraud Sentinel (Anti-Injection) & Self-Healing Guardian + Dashboard Super Admin & SWOT",
    ],
  },
  {
    id: "sovereign",
    name: "Sovereign Corporate",
    tagline: "Full Corporate OS: Strategi Marketing Enterprise 5-Agen AI, Akuntansi PSAK & SPT Pajak, ERP Korporat, HRD Payroll & Dedicated DB.",
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
      "qr_camera_fifo_scanner",
      "double_entry_accounting",
      "seo_growth_ai",
      "voice_companion_24_7",
      "fraud_sentinel_healing",
      "ai_product_recommender",
      "white_label_store",
      "super_admin_analytics",
      "buyer_interest_forecast",
      "hrd_payroll_corporate",
      "sovereign_corporate_accounting",
      "sovereign_corporate_erp",
      "sovereign_corporate_crm_pos_seo",
      "enterprise_marketing_strategy",
      "custom_branded_apk",
      "dedicated_db_sla",
    ],
    highlights: [
      "EKSKLUSIF: Strategi Marketing Enterprise (5 Multi-Agent AI: Data, SWOT/Persona, Forecaster ROAS 90h, Roadmap & Skrip)",
      "EKSKLUSIF: Akuntansi Korporat PSAK & SPT Pajak Lengkap (Neraca, COA 4-Digit, Arus Kas, PPN/PPh Badan/21/23/4(2), Rasio & Audit Ekspor)",
      "EKSKLUSIF: HRD & Payroll Korporat CRUD + Print (Karyawan, Absensi, Lembur PP 35/2021, Cuti, KPI, BPJS, PPh 21 TER & Slip Gaji)",
      "EKSKLUSIF: ERP Korporat (ABC/MRP ROP-EOQ, Multi-Gudang, PO/GRN, BOM HPP, Stock Opname, Vendor SLA) + CRM/POS/SEO Korporat",
      "EKSKLUSIF: Tren Minat Pembeli & Forecasting 30–90 Hari, Custom Branded APK Biometrik & Dedicated Neon DB SLA 99.95%",
    ],
  },
];

export const EDITION_FEATURE_LABELS: Record<EditionFeatureKey, string> = {
  omnichannel_inbox: "Inbox Omnichannel (WA, IG, Messenger, TikTok, YT)",
  zero_click_ai: "AI Auto-Reply 24/7 Otomatis Tanpa Klik + Template Siap Kirim",
  master_data: "Menu Master Data Lengkap (6 Modul) + Cetak & Ekspor PDF/Excel",
  universal_printing_usb_edc: "Cetak Universal: USB-C/Micro-USB OTG, Bluetooth, WiFi, Inkjet/LaserJet & EDC",
  pos_qr_shipping_label: "POS Auto-Invoice, Kustomisasi Layout Faktur, COD Marketplace, Lacak Kiriman & Label QR",
  erp_warehouse: "ERP Gudang Operasional (Produk, Stok Real-Time, Mutasi Keluar-Masuk & Supplier)",
  qr_camera_fifo_scanner: "Scanner QR Kamera Belakang HP → Master Data, Gudang FIFO Anti-Basi & POS",
  double_entry_accounting: "Pembukuan & Akuntansi Operasional (Jurnal Harian, Buku Kas, Piutang COD & Laba Rugi Ringkas)",
  seo_growth_ai: "Multi-Agent SEO & Omnichannel Growth AI (6 Kanal)",
  voice_companion_24_7: "24/7 AI Personal Companion Suara & Teks (Memori Kontinu)",
  fraud_sentinel_healing: "Fraud Sentinel (Anti-Injection) & Self-Healing Guardian",
  ai_product_recommender: "AI Self-Learning Otonom: Saran Produk Paling Laku & Auto-Bundling 3-in-1 Persetujuan User",
  white_label_store: "100% White-Label Identitas Toko pada Seluruh Dokumen",
  super_admin_analytics: "Dashboard Super Admin, Analitik SWOT & Auto-Perbaikan",
  buyer_interest_forecast: "Menu Tren Minat Pembeli & Forecasting Permintaan 30–90 Hari (Sovereign)",
  hrd_payroll_corporate: "Modul HRD & Payroll Korporat CRUD + Cetak: Karyawan, Absensi, Lembur, Cuti, KPI, BPJS & PPh 21 TER (Sovereign)",
  sovereign_corporate_accounting: "Akuntansi Korporat PSAK Penuh: Neraca, COA 4-Digit, Arus Kas, SPT Pajak (PPN/PPh Badan/21/23/4(2)), Rasio & Audit CSV/Excel (Sovereign)",
  sovereign_corporate_erp: "ERP Korporat: ABC/MRP ROP-EOQ, Multi-Gudang Transfer, PO/GRN, BOM HPP, Stock Opname & Vendor SLA (Sovereign)",
  sovereign_corporate_crm_pos_seo: "Suite Korporat CRM Pipeline/RFM, POS Shift & VIP Loyalty Tier, serta Audit Teknis SEO & JSON-LD (Sovereign)",
  enterprise_marketing_strategy: "Strategi Pemasaran Enterprise — 5 Multi-Agent AI (Data, SWOT/Persona, Budget & ROAS 90h, Blueprint & Eksekusi Kampanye) (Sovereign)",
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
