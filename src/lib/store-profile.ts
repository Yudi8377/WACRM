import {
  formatIdr,
  type MasterCategoryRecord,
  type MasterCourierRecord,
  type MasterPaymentAccountRecord,
  type MasterUnitRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import { sanitizeImageUrl } from "@/lib/security";

const PROFILE_STORAGE_PREFIX = "wacrm_store_profile_v3_";
const MASTER_STORAGE_PREFIX = "wacrm_master_data_v3_";
const PRODUCT_IMAGES_PREFIX = "wacrm_product_images_v42_";

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
      {
        id: "cur-1",
        code: "JNE",
        name: "JNE Express",
        serviceType: "Reguler, YES & Kargo JTR",
        baseRate: 18000,
        estimatedDays: "1-3 hari",
        isActive: true,
        pickupSchedule: "Senin–Sabtu pukul 14:00 & 17:30 WIB",
        cutoffTime: "16:00 WIB (order lewat pukul 16:00 ikut pickup besok)",
        codSupported: true,
        insuranceSupported: true,
        packagingNotes: "Gratis bubble wrap 2 lapis; barang elektronik/pecah belah wajib packing kayu (+Rp 15.000).",
        claimPolicy: "Klaim barang rusak/hilang maksimal 3x24 jam sejak diterima dengan bukti video unboxing utuh.",
        trackingUrlTemplate: "https://jne.co.id/tracking-package?resi={resi}",
        maxDimensionsCm: "100 x 80 x 80 cm (berat volumetrik P×L×T / 6000)",
        aiShippingNotes: "Pilihan paling stabil untuk pengiriman antarpulau & grosir berat via JTR Kargo minimal 10 kg.",
        serviceTiers: [
          {
            id: "jne-reg",
            serviceName: "JNE Reguler (REG)",
            ratePerKg: 18000,
            minWeightKg: 1,
            maxWeightKg: 30,
            estimatedDays: "2-3 hari kerja",
            coverageZones: "Seluruh Indonesia (Kota & Kabupaten)",
            codSupported: true,
            codFeePct: 2,
            insuranceAvailable: true,
            insuranceFeePct: 0.5,
          },
          {
            id: "jne-yes",
            serviceName: "JNE YES (Yakin Esok Sampai)",
            ratePerKg: 32000,
            minWeightKg: 1,
            maxWeightKg: 15,
            estimatedDays: "1 hari (Besok Sampai)",
            coverageZones: "Kota Besar Jawa, Bali & Ibu Kota Provinsi",
            codSupported: false,
            codFeePct: 0,
            insuranceAvailable: true,
            insuranceFeePct: 0.5,
          },
          {
            id: "jne-jtr",
            serviceName: "JNE Trucking (JTR Kargo Grosir)",
            ratePerKg: 5500,
            minWeightKg: 10,
            maxWeightKg: 200,
            estimatedDays: "4-6 hari kerja",
            coverageZones: "Jawa, Bali & Sumatera (Ekonomis Partai Besar)",
            codSupported: false,
            codFeePct: 0,
            insuranceAvailable: true,
            insuranceFeePct: 0.4,
          },
        ],
      },
      {
        id: "cur-2",
        code: "JNT",
        name: "J&T Express",
        serviceType: "Ekspres, COD & Kargo",
        baseRate: 17000,
        estimatedDays: "1-3 hari",
        isActive: true,
        pickupSchedule: "Setiap Hari (termasuk Minggu & Tanggal Merah) pukul 15:00 & 19:00 WIB",
        cutoffTime: "17:00 WIB (beroperasi 365 hari tanpa libur)",
        codSupported: true,
        insuranceSupported: true,
        packagingNotes: "Kemasan kardus double wall + segel fragile untuk pengiriman COD agar aman saat transit.",
        claimPolicy: "Penggantian hingga 100% nilai barang (diasuransikan) atau maksimal 10× ongkir tanpa asuransi.",
        trackingUrlTemplate: "https://jet.co.id/track?resi={resi}",
        maxDimensionsCm: "90 x 70 x 70 cm (volumetrik P×L×T / 6000)",
        aiShippingNotes: "Rekomendasi utama untuk pelanggan yang ingin bayar COD (maks Rp 5.000.000) dan butuh kirim di hari Minggu.",
        serviceTiers: [
          {
            id: "jnt-ez",
            serviceName: "J&T EZ Reguler",
            ratePerKg: 17000,
            minWeightKg: 1,
            maxWeightKg: 30,
            estimatedDays: "1-3 hari",
            coverageZones: "Seluruh Indonesia (365 hari aktif)",
            codSupported: true,
            codFeePct: 2.5,
            insuranceAvailable: true,
            insuranceFeePct: 0.5,
          },
          {
            id: "jnt-super",
            serviceName: "J&T Super (Prioritas SLA)",
            ratePerKg: 29000,
            minWeightKg: 1,
            maxWeightKg: 15,
            estimatedDays: "1-2 hari (Garansi Ongkir)",
            coverageZones: "Jawa, Bali, Makassar, Medan",
            codSupported: true,
            codFeePct: 2.5,
            insuranceAvailable: true,
            insuranceFeePct: 0.5,
          },
          {
            id: "jnt-cargo",
            serviceName: "J&T Cargo",
            ratePerKg: 6000,
            minWeightKg: 10,
            maxWeightKg: 250,
            estimatedDays: "3-5 hari",
            coverageZones: "Jawa, Bali, Sumatera & Kalimantan",
            codSupported: false,
            codFeePct: 0,
            insuranceAvailable: true,
            insuranceFeePct: 0.4,
          },
        ],
      },
      {
        id: "cur-3",
        code: "SICEPAT",
        name: "SiCepat Ekspres",
        serviceType: "Hemat HALU & Kargo GOKIL",
        baseRate: 14000,
        estimatedDays: "2-4 hari",
        isActive: true,
        pickupSchedule: "Senin–Sabtu pukul 16:00 WIB",
        cutoffTime: "15:00 WIB",
        codSupported: true,
        insuranceSupported: true,
        packagingNotes: "Disarankan tambahan bubble wrap ekstra untuk kemasan cair/botol/bubuk kopi.",
        claimPolicy: "Klaim maksimal 2x24 jam setelah status delivered dengan foto paket & video unboxing.",
        trackingUrlTemplate: "https://www.sicepat.com/checkAwb/{resi}",
        maxDimensionsCm: "100 x 70 x 70 cm",
        aiShippingNotes: "Pilihan ongkir paling ekonomis untuk pembeli ritel yang sensitif harga (HALU) dan kargo cepat (GOKIL).",
        serviceTiers: [
          {
            id: "sicepat-halu",
            serviceName: "SiCepat HALU (Hemat)",
            ratePerKg: 14000,
            minWeightKg: 1,
            maxWeightKg: 20,
            estimatedDays: "2-4 hari",
            coverageZones: "Jawa, Bali & Sumatera",
            codSupported: true,
            codFeePct: 2,
            insuranceAvailable: true,
            insuranceFeePct: 0.5,
          },
          {
            id: "sicepat-best",
            serviceName: "SiCepat BEST (Besok Sampai)",
            ratePerKg: 28000,
            minWeightKg: 1,
            maxWeightKg: 15,
            estimatedDays: "1 hari kerja",
            coverageZones: "Kota Besar Jawa & Jabodetabek",
            codSupported: false,
            codFeePct: 0,
            insuranceAvailable: true,
            insuranceFeePct: 0.5,
          },
          {
            id: "sicepat-gokil",
            serviceName: "SiCepat GOKIL (Kargo Kilat)",
            ratePerKg: 5000,
            minWeightKg: 10,
            maxWeightKg: 150,
            estimatedDays: "3-5 hari",
            coverageZones: "Jawa & Bali",
            codSupported: false,
            codFeePct: 0,
            insuranceAvailable: true,
            insuranceFeePct: 0.4,
          },
        ],
      },
      {
        id: "cur-4",
        code: "SAMEDAY",
        name: "Kurir Toko Same-Day",
        serviceType: "Antar Langsung Hari Ini",
        baseRate: 12000,
        estimatedDays: "Hari yang sama (2-6 jam)",
        isActive: true,
        pickupSchedule: "Pengiriman langsung kloter 10:00, 14:00 & 17:00 WIB",
        cutoffTime: "16:30 WIB untuk sampai di hari yang sama",
        codSupported: true,
        insuranceSupported: true,
        packagingNotes: "Diantar langsung oleh armada internal toko — aman untuk karton grosir & perangkat POS tanpa risiko lempar paket.",
        claimPolicy: "Garansi 100% tukar langsung di tempat saat serah terima dengan kurir internal toko.",
        trackingUrlTemplate: "",
        maxDimensionsCm: "Muat hingga 50 karton via mobil box toko",
        aiShippingNotes: "Tercepat & gratis ongkir untuk belanja grosir ≥ Rp 2.000.000 area Kota/Kabupaten Kediri & sekitarnya!",
        serviceTiers: [
          {
            id: "toko-instant",
            serviceName: "Kurir Toko Instant (2-3 Jam)",
            ratePerKg: 15000,
            minWeightKg: 1,
            maxWeightKg: 50,
            estimatedDays: "2-3 jam setelah konfirmasi",
            coverageZones: "Kota & Kabupaten Kediri",
            codSupported: true,
            codFeePct: 0,
            insuranceAvailable: true,
            insuranceFeePct: 0,
          },
          {
            id: "toko-sameday",
            serviceName: "Kurir Toko Same-Day Flat",
            ratePerKg: 12000,
            minWeightKg: 1,
            maxWeightKg: 500,
            estimatedDays: "Hari yang sama (3-6 jam)",
            coverageZones: "Kediri, Blitar, Tulungagung, Nganjuk, Jombang",
            codSupported: true,
            codFeePct: 0,
            insuranceAvailable: true,
            insuranceFeePct: 0,
          },
        ],
      },
    ],
    paymentAccounts: [
      { id: "pay-1", method: "qris", providerName: "QRIS Nasional Toko", accountNumber: "ID1020260008899", accountHolder: "Toko Berkah Nusantara", isActive: true },
      { id: "pay-2", method: "bank_transfer", providerName: "Bank BCA", accountNumber: "033-889-1122", accountHolder: "Toko Berkah Nusantara", isActive: true },
      { id: "pay-3", method: "bank_transfer", providerName: "Bank Mandiri", accountNumber: "141-00-8899112-3", accountHolder: "Toko Berkah Nusantara", isActive: true },
      { id: "pay-4", method: "cash", providerName: "Kas Tunai Kasir", accountNumber: "KAS-01", accountHolder: "Kasir Utama", isActive: true },
    ],
  };
}

function hydrateCourierDefaults(saved: MasterCourierRecord[], defaults: MasterCourierRecord[]): MasterCourierRecord[] {
  return saved.map((c) => {
    const matchDef = defaults.find(
      (d) =>
        d.id === c.id ||
        d.code.toLowerCase() === c.code.toLowerCase() ||
        c.name.toLowerCase().includes(d.code.toLowerCase()),
    );
    if (!c.serviceTiers || c.serviceTiers.length === 0) {
      return {
        ...matchDef,
        ...c,
        serviceTiers: matchDef?.serviceTiers ?? [
          {
            id: `${c.id}-std`,
            serviceName: `${c.name} ${c.serviceType || "Reguler"}`,
            ratePerKg: c.baseRate || 15000,
            minWeightKg: 1,
            maxWeightKg: 30,
            estimatedDays: c.estimatedDays || "2-3 hari",
            coverageZones: "Seluruh Indonesia",
            codSupported: Boolean(c.codSupported ?? true),
            codFeePct: 2,
            insuranceAvailable: Boolean(c.insuranceSupported ?? true),
            insuranceFeePct: 0.5,
          },
        ],
      };
    }
    return c;
  });
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
      couriers: parsed.couriers
        ? hydrateCourierDefaults(parsed.couriers, fallback.couriers)
        : fallback.couriers,
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

/**
 * Generates structured shipping knowledge text from Master Data -> Kurir Ekspedisi
 * so Multi-Agent AI always knows exact tariffs, COD fees, cutoffs, packaging & claims.
 */
export function buildCourierKnowledgeSummary(couriers: MasterCourierRecord[]): string {
  const active = couriers.filter((c) => c.isActive);
  if (active.length === 0) {
    return "Belum ada kurir ekspedisi aktif di Master Data.";
  }
  return active
    .map((c) => {
      const tiers =
        c.serviceTiers && c.serviceTiers.length > 0
          ? c.serviceTiers
              .map(
                (t) =>
                  `${t.serviceName}: ${formatIdr(t.ratePerKg)}/kg (min ${t.minWeightKg}kg, est ${t.estimatedDays}, zona ${t.coverageZones}${t.codSupported ? `, COD +${t.codFeePct}%` : ", non-COD"}${t.insuranceAvailable ? `, Asuransi ${t.insuranceFeePct}%` : ""})`,
              )
              .join(" | ")
          : `${c.serviceType}: ${formatIdr(c.baseRate)}/kg (${c.estimatedDays})`;
      const extras = [
        c.cutoffTime ? `Cut-off: ${c.cutoffTime}` : null,
        c.pickupSchedule ? `Pickup: ${c.pickupSchedule}` : null,
        c.packagingNotes ? `Packing: ${c.packagingNotes}` : null,
        c.claimPolicy ? `Klaim: ${c.claimPolicy}` : null,
        c.aiShippingNotes ? `Catatan AI: ${c.aiShippingNotes}` : null,
      ]
        .filter(Boolean)
        .join("; ");
      return `[${c.code}] ${c.name} -> ${tiers}${extras ? ` (${extras})` : ""}`;
    })
    .join("\n");
}

// =============================================================================
// Product Card Picture Storage Cache (works seamlessly in both Demo & Neon modes)
// =============================================================================

export function loadProductImages(tenantId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${PRODUCT_IMAGES_PREFIX}${tenantId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const clean: Record<string, string> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const safe = sanitizeImageUrl(val);
      if (safe) clean[key] = safe;
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveProductImage(tenantId: string, productIdOrSku: string, imageUrl: string | null): Record<string, string> {
  const current = loadProductImages(tenantId);
  const safe = sanitizeImageUrl(imageUrl);
  if (safe) {
    current[productIdOrSku] = safe;
  } else {
    delete current[productIdOrSku];
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${PRODUCT_IMAGES_PREFIX}${tenantId}`, JSON.stringify(current));
    } catch {
      // ignore storage quota errors
    }
  }
  return current;
}
