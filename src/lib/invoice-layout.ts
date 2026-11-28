/**
 * Customizable Invoice Layout & White-Label Document Styling Configuration
 * Persisted per browser/workspace so every printed, previewed, or PDF-exported invoice
 * follows the store's exact branding, header, column visibility, bank details, signature & footer.
 */

export type InvoiceTemplateStyle =
  | "modern_corporate"
  | "classic_formal"
  | "compact_thermal"
  | "minimalist_clean";

export type InvoiceHeaderAlignment = "split" | "center" | "left";

export interface InvoiceLayoutSettings {
  templateStyle: InvoiceTemplateStyle;
  headerAlignment: InvoiceHeaderAlignment;
  accentColor: string;
  headerTitle: string;
  headerSubtitle: string;
  showLogoBadge: boolean;
  logoInitials: string;
  showAddress: boolean;
  showPhoneAndEmail: boolean;
  showNpwp: boolean;
  customNpwp: string;
  showCourierAndResi: boolean;
  showQrCode: boolean;
  showSkuColumn: boolean;
  showUnitPriceColumn: boolean;
  showDiscountRow: boolean;
  showTaxRow: boolean;
  showBankTransferBox: boolean;
  bankTransferInfo: string;
  termsAndConditions: string;
  footerGreeting: string;
  showSignatureBlock: boolean;
  signatureLeftLabel: string;
  signatureRightLabel: string;
  paperDefault: "a4" | "thermal80" | "thermal58" | "edc";
}

export const INVOICE_ACCENT_PRESETS: Array<{ label: string; hex: string }> = [
  { label: "Emerald Bisnis", hex: "#059669" },
  { label: "Navy Corporate", hex: "#0f172a" },
  { label: "Royal Blue", hex: "#1d4ed8" },
  { label: "Gold Executive", hex: "#b45309" },
  { label: "Crimson Retail", hex: "#be123c" },
  { label: "Violet Modern", hex: "#6d28d9" },
];

export const INVOICE_TEMPLATE_OPTIONS: Array<{
  id: InvoiceTemplateStyle;
  label: string;
  desc: string;
}> = [
  {
    id: "modern_corporate",
    label: "Modern Corporate",
    desc: "Header aksen berwarna, tabel rapi, kotak bank & QR verifikasi",
  },
  {
    id: "classic_formal",
    label: "Klasik Formal (Faktur B2B)",
    desc: "Bingkai tegas hitam/abu, cocok untuk faktur perusahaan & kantor",
  },
  {
    id: "compact_thermal",
    label: "Kasir Thermal Ringkas",
    desc: "Tata letak ramping hemat kertas 58mm/80mm untuk kasir cepat",
  },
  {
    id: "minimalist_clean",
    label: "Minimalis Clean",
    desc: "Tipografi bersih elegan tanpa garis berat untuk brand premium",
  },
];

export const DEFAULT_INVOICE_LAYOUT: InvoiceLayoutSettings = {
  templateStyle: "modern_corporate",
  headerAlignment: "split",
  accentColor: "#059669",
  headerTitle: "INVOICE PEMBAYARAN",
  headerSubtitle: "",
  showLogoBadge: true,
  logoInitials: "",
  showAddress: true,
  showPhoneAndEmail: true,
  showNpwp: true,
  customNpwp: "",
  showCourierAndResi: true,
  showQrCode: true,
  showSkuColumn: true,
  showUnitPriceColumn: true,
  showDiscountRow: true,
  showTaxRow: true,
  showBankTransferBox: true,
  bankTransferInfo: "BCA 123-456-7890 a.n. Toko Resmi · QRIS tersedia di kasir",
  termsAndConditions:
    "Barang yang sudah dibeli dapat ditukar maks. 3 hari dengan bukti invoice asli. Simpan struk ini sebagai garansi resmi.",
  footerGreeting: "Terima kasih atas kepercayaan & transaksi Anda!",
  showSignatureBlock: true,
  signatureLeftLabel: "Penerima / Pelanggan",
  signatureRightLabel: "Hormat Kami / Kasir",
  paperDefault: "a4",
};

const STORAGE_KEY = "wacrm_invoice_layout_v52";

export function loadInvoiceLayoutSettings(): InvoiceLayoutSettings {
  if (typeof window === "undefined") return { ...DEFAULT_INVOICE_LAYOUT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INVOICE_LAYOUT };
    const parsed = JSON.parse(raw) as Partial<InvoiceLayoutSettings>;
    return {
      ...DEFAULT_INVOICE_LAYOUT,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_INVOICE_LAYOUT };
  }
}

export function saveInvoiceLayoutSettings(settings: InvoiceLayoutSettings): InvoiceLayoutSettings {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }
  return settings;
}

export function resetInvoiceLayoutSettings(): InvoiceLayoutSettings {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return { ...DEFAULT_INVOICE_LAYOUT };
}
