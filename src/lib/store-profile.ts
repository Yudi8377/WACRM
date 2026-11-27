import type {
  MasterCategoryRecord,
  MasterCourierRecord,
  MasterPaymentAccountRecord,
  MasterUnitRecord,
  StoreBusinessProfile,
} from "@/lib/crm-types";

const PROFILE_STORAGE_PREFIX = "wacrm_store_profile_v3_";
const MASTER_STORAGE_PREFIX = "wacrm_master_data_v3_";

export interface LocalMasterDataState {
  categories: MasterCategoryRecord[];
  units: MasterUnitRecord[];
  couriers: MasterCourierRecord[];
  paymentAccounts: MasterPaymentAccountRecord[];
}

export function getDefaultStoreProfile(workspaceName?: string): StoreBusinessProfile {
  const cleanName =
    workspaceName &&
    !/^wacrm(\s+(ai|demo))?\s*enterprise$/i.test(workspaceName.trim())
      ? workspaceName.trim()
      : "Toko Berkah Nusantara";
  return {
    businessName: cleanName,
    businessTagline: "Grosir & Retail Produk Pilihan",
    phone: "+62 812-3456-7890",
    email: "cs@tokoberkahnusantara.id",
    address: "Jl. Dhoho No. 88, Kota Kediri, Jawa Timur",
    city: "Kota Kediri",
    taxId: "",
    invoiceFooter:
      "Terima kasih atas kepercayaan Anda. Pindai kode QR untuk verifikasi pesanan & pengiriman.",
    defaultCourier: "JNE Reguler",
  };
}

export function loadStoreProfile(tenantId: string, workspaceName?: string): StoreBusinessProfile {
  const fallback = getDefaultStoreProfile(workspaceName);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${tenantId}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoreBusinessProfile>;
    return {
      ...fallback,
      ...parsed,
      businessName: parsed.businessName?.trim() || fallback.businessName,
    };
  } catch {
    return fallback;
  }
}

export function saveStoreProfile(tenantId: string, profile: StoreBusinessProfile): StoreBusinessProfile {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${tenantId}`, JSON.stringify(profile));
    } catch {
      // ignore quota error
    }
  }
  return profile;
}

export function getDefaultMasterData(): LocalMasterDataState {
  return {
    categories: [
      { id: "cat-1", name: "Grosir", description: "Paket sembako & grosir untuk reseller/toko" },
      { id: "cat-2", name: "Minuman", description: "Kopi specialty, matcha, dan bahan minuman kafe" },
      { id: "cat-3", name: "Merchandise", description: "Tumbler, kemasan, dan perlengkapan branding" },
      { id: "cat-4", name: "Perangkat POS", description: "Printer thermal, kertas struk, dan paket kasir" },
    ],
    units: [
      { id: "u-1", code: "pcs", name: "Pieces / Buah" },
      { id: "u-2", code: "karton", name: "Karton / Dus Besar" },
      { id: "u-3", code: "kg", name: "Kilogram" },
      { id: "u-4", code: "pack", name: "Pack / Kemasan" },
      { id: "u-5", code: "unit", name: "Unit Perangkat" },
      { id: "u-6", code: "paket", name: "Paket Bundling" },
    ],
    couriers: [
      { id: "cur-1", code: "JNE-REG", name: "JNE Reguler", serviceType: "Reguler Nasional", baseRate: 18000, estimatedDays: "2-3 hari", isActive: true },
      { id: "cur-2", code: "JNT-EXP", name: "J&T Express", serviceType: "Ekspres & COD", baseRate: 19000, estimatedDays: "1-3 hari", isActive: true },
      { id: "cur-3", code: "SICEPAT", name: "SiCepat HALU", serviceType: "Ekonomis", baseRate: 15000, estimatedDays: "2-4 hari", isActive: true },
      { id: "cur-4", code: "SAMEDAY", name: "Kurir Toko Same-Day", serviceType: "Area Kediri & Jatim", baseRate: 12000, estimatedDays: "Hari yang sama", isActive: true },
    ],
    paymentAccounts: [
      { id: "pay-1", method: "qris", providerName: "QRIS Nasional Toko", accountNumber: "ID1020260008899", accountHolder: "Toko Berkah Nusantara", isActive: true },
      { id: "pay-2", method: "bank_transfer", providerName: "Bank BCA", accountNumber: "033-889-1122", accountHolder: "Toko Berkah Nusantara", isActive: true },
      { id: "pay-3", method: "bank_transfer", providerName: "Bank Mandiri", accountNumber: "141-00-8899112-3", accountHolder: "Toko Berkah Nusantara", isActive: true },
      { id: "pay-4", method: "cash", providerName: "Kas Tunai Kasir", accountNumber: "KAS-01", accountHolder: "Kasir Utama", isActive: true },
    ],
  };
}

export function loadLocalMasterData(tenantId: string): LocalMasterDataState {
  const fallback = getDefaultMasterData();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${MASTER_STORAGE_PREFIX}${tenantId}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LocalMasterDataState>;
    return {
      categories: parsed.categories ?? fallback.categories,
      units: parsed.units ?? fallback.units,
      couriers: parsed.couriers ?? fallback.couriers,
      paymentAccounts: parsed.paymentAccounts ?? fallback.paymentAccounts,
    };
  } catch {
    return fallback;
  }
}

export function saveLocalMasterData(tenantId: string, data: LocalMasterDataState): LocalMasterDataState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${MASTER_STORAGE_PREFIX}${tenantId}`, JSON.stringify(data));
    } catch {
      // ignore quota error
    }
  }
  return data;
}
