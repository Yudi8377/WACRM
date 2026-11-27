import {
  formatIdr,
  type ErpProductRecord,
  type MasterCategoryRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import { normalizeProductGroup, type NormalizedProductGroup } from "@/lib/store-profile";

export type ExpiryHealthStatus =
  | "expired"
  | "critical_7d"
  | "warning_30d"
  | "fresh"
  | "non_perishable";

export interface FifoBatchRecord {
  id: string;
  batchCode: string;
  productId: string;
  sku: string;
  productName: string;
  supplierName: string;
  receivedDate: string; // YYYY-MM-DD
  expiryDate: string | null; // YYYY-MM-DD or null for non-perishable
  initialQty: number;
  remainingQty: number;
  unitCostIdr: number;
  rackLocation: string;
  qrPayload: string;
  notes?: string;
  createdAt: string;
}

export interface FifoScanAuditLog {
  id: string;
  mode: "inbound_receive" | "outbound_fifo" | "pos_quick_scan" | "stock_opname" | "tracking_awb";
  rawCode: string;
  sku: string;
  productName: string;
  qtyDelta: number;
  batchCode: string;
  accountingSynced: boolean;
  summary: string;
  createdAt: string;
}

export interface ParsedQrPayload {
  kind: "arrival_label" | "batch_item" | "invoice_shipment" | "sku_or_barcode";
  arrivalId?: string;
  groupCode?: string;
  sku?: string;
  batchCode?: string;
  expiryDate?: string | null;
  unitCostIdr?: number;
  qty?: number;
  invoiceNumber?: string;
  raw: string;
}

export type ArrivalQrLabelStatus =
  | "generated_ready"
  | "printed_waiting_scan"
  | "scanned_synced";

export type StickerPaperLayout = "thermal58" | "thermal80" | "a4_grid";

export interface ArrivalQrLabelRecord {
  id: string;
  qrPayload: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  badgeColorHex: string;
  sku: string;
  productName: string;
  isNewMasterProduct: boolean;
  existingProductId?: string | null;
  unit: string;
  qty: number;
  costPrice: number;
  unitPrice: number;
  minStock: number;
  batchCode: string;
  expiryDate: string | null;
  rackLocation: string;
  supplierName: string;
  stickerCopies: number;
  notes?: string;
  status: ArrivalQrLabelStatus;
  createdAt: string;
  printedAt?: string | null;
  scannedAt?: string | null;
  syncedProductId?: string | null;
  syncedBatchId?: string | null;
  accountingSynced?: boolean;
}

export interface FifoPickAllocation {
  batchId: string;
  batchCode: string;
  expiryDate: string | null;
  receivedDate: string;
  qtyPicked: number;
  unitCostIdr: number;
  lineCogsIdr: number;
}

export interface FifoPickResult {
  ok: boolean;
  allocations: FifoPickAllocation[];
  totalPickedQty: number;
  shortfallQty: number;
  totalCogsIdr: number;
  updatedBatches: FifoBatchRecord[];
  message: string;
}

export interface QrScannerScenarioInfo {
  id: "inbound_receive" | "outbound_fifo" | "pos_quick_scan" | "stock_opname" | "tracking_awb" | "label_sticker";
  title: string;
  badge: string;
  connectedModules: string[];
  description: string;
}

export const QR_SCANNER_SCENARIOS: QrScannerScenarioInfo[] = [
  {
    id: "inbound_receive",
    title: "1. Barang Masuk Supplier + Batch FIFO & Expired",
    badge: "Master Data · Gudang · Keuangan",
    connectedModules: ["Master Data", "ERP Gudang FIFO", "Akuntansi Jurnal Persediaan"],
    description:
      "Scan QR/barcode barang datang dari supplier → stok gudang bertambah, nomor batch & tanggal kedaluwarsa (FIFO/FEFO) tercatat, dan jurnal Persediaan otomatis masuk ke Akuntansi.",
  },
  {
    id: "outbound_fifo",
    title: "2. Pengeluaran Barang FIFO / Anti-Basi Otomatis",
    badge: "Anti-Basi · FEFO Picking",
    connectedModules: ["ERP Gudang", "Peringatan Kadaluwarsa", "HPP Akuntansi"],
    description:
      "Saat scan barang keluar/packing, sistem otomatis memilih batch paling lama atau paling mendekati expired terlebih dahulu sehingga produk mudah basi selalu keluar duluan.",
  },
  {
    id: "pos_quick_scan",
    title: "3. Kasir POS Kilat (Scan Langsung Masuk Keranjang)",
    badge: "POS Kasir · Cetak Struk",
    connectedModules: ["Kasir POS", "Pemotongan Batch FIFO", "Cetak Thermal/USB/Bluetooth"],
    description:
      "Arahkan kamera belakang HP ke QR produk di etalase/meja kasir → harga otomatis terisi, stok batch FIFO tertua terpotong, dan siap cetak struk / QRIS / COD dalam 3 detik.",
  },
  {
    id: "stock_opname",
    title: "4. Stock Opname & Audit Fisik Rak Gudang",
    badge: "Audit Anti-Selisih",
    connectedModules: ["ERP Gudang", "System Guardian", "Penyesuaian Akuntansi"],
    description:
      "Scan produk di rak fisik lalu masukkan jumlah hitung nyata — sistem otomatis menghitung selisih stok (surplus/susut) agar tidak ada kebocoran barang.",
  },
  {
    id: "tracking_awb",
    title: "5. Scan Label Pengiriman QR & Update COD AI",
    badge: "COD · Lacak Kiriman AI",
    connectedModules: ["POS COD", "Pelacakan Pengiriman", "Multi-Agent AI Notif WA"],
    description:
      "Scan QR pada label paket sebelum kurir pickup → otomatis update status pengiriman & Multi-Agen AI langsung mengirim info resi + nama kurir ke WhatsApp pembeli.",
  },
  {
    id: "label_sticker",
    title: "6. Generate & Cetak Stiker QR Batch Produk",
    badge: "Stiker Rak & Dus",
    connectedModules: ["Master Data", "Universal Printer USB/Bluetooth/WiFi"],
    description:
      "Untuk produk UMKM rumahan yang belum punya barcode pabrikan, buat & cetak stiker QR resmi WACRM berisi SKU, Batch & Expired Date langsung ke printer thermal/A4.",
  },
];

export function encodeArrivalQrPayload(params: {
  arrivalId: string;
  groupCode: string;
  sku: string;
  batchCode: string;
  expiryDate?: string | null;
  qty?: number;
  unitCostIdr?: number;
}): string {
  const parts = [
    "WACRM-IN",
    `ID:${params.arrivalId.trim().toUpperCase()}`,
    `GRP:${params.groupCode.trim().toUpperCase()}`,
    `SKU:${params.sku.trim().toUpperCase()}`,
    `LOT:${params.batchCode.trim().toUpperCase()}`,
  ];
  if (params.expiryDate) parts.push(`EXP:${params.expiryDate}`);
  if (params.qty && params.qty > 0) parts.push(`QTY:${Math.round(params.qty)}`);
  if (params.unitCostIdr && params.unitCostIdr > 0) parts.push(`HPP:${Math.round(params.unitCostIdr)}`);
  return parts.join("|");
}

export function encodeBatchQrPayload(params: {
  sku: string;
  batchCode: string;
  expiryDate?: string | null;
  unitCostIdr?: number;
}): string {
  const parts = [`WACRM-ITEM`, `SKU:${params.sku.trim().toUpperCase()}`, `LOT:${params.batchCode.trim().toUpperCase()}`];
  if (params.expiryDate) parts.push(`EXP:${params.expiryDate}`);
  if (params.unitCostIdr && params.unitCostIdr > 0) parts.push(`HPP:${Math.round(params.unitCostIdr)}`);
  return parts.join("|");
}

export function parseScannedQrCode(rawCode: string): ParsedQrPayload {
  const clean = rawCode.trim();
  if (!clean) {
    return { kind: "sku_or_barcode", raw: "" };
  }

  if (clean.toUpperCase().startsWith("WACRM-IN|")) {
    const tokens = clean.split("|");
    let arrivalId: string | undefined;
    let groupCode: string | undefined;
    let sku: string | undefined;
    let batchCode: string | undefined;
    let expiryDate: string | null = null;
    let qty: number | undefined;
    let unitCostIdr: number | undefined;
    for (const token of tokens.slice(1)) {
      const [k, ...rest] = token.split(":");
      const val = rest.join(":").trim();
      const key = k.toUpperCase();
      if (key === "ID") arrivalId = val.toUpperCase();
      if (key === "GRP") groupCode = val.toUpperCase();
      if (key === "SKU") sku = val.toUpperCase();
      if (key === "LOT") batchCode = val.toUpperCase();
      if (key === "EXP") expiryDate = val || null;
      if (key === "QTY") {
        const parsed = Number(val);
        if (Number.isFinite(parsed) && parsed > 0) qty = Math.round(parsed);
      }
      if (key === "HPP") {
        const parsed = Number(val);
        if (Number.isFinite(parsed) && parsed > 0) unitCostIdr = Math.round(parsed);
      }
    }
    return {
      kind: "arrival_label",
      arrivalId,
      groupCode,
      sku,
      batchCode,
      expiryDate,
      qty,
      unitCostIdr,
      raw: clean,
    };
  }

  if (clean.toUpperCase().startsWith("WACRM-ITEM|")) {
    const tokens = clean.split("|");
    let sku: string | undefined;
    let batchCode: string | undefined;
    let expiryDate: string | null = null;
    let unitCostIdr: number | undefined;
    for (const token of tokens.slice(1)) {
      const [k, ...rest] = token.split(":");
      const val = rest.join(":").trim();
      if (k === "SKU") sku = val;
      if (k === "LOT") batchCode = val;
      if (k === "EXP") expiryDate = val || null;
      if (k === "HPP") {
        const parsed = Number(val);
        if (Number.isFinite(parsed) && parsed > 0) unitCostIdr = parsed;
      }
    }
    return {
      kind: "batch_item",
      sku,
      batchCode,
      expiryDate,
      unitCostIdr,
      raw: clean,
    };
  }

  const invMatch = clean.match(/\b(INV-[A-Z0-9-]{4,})\b/i);
  if (invMatch) {
    return {
      kind: "invoice_shipment",
      invoiceNumber: invMatch[1].toUpperCase(),
      raw: clean,
    };
  }

  return {
    kind: "sku_or_barcode",
    sku: clean.toUpperCase(),
    raw: clean,
  };
}

export function getDaysUntilExpiry(expiryDate: string | null, nowMs = Date.now()): number | null {
  if (!expiryDate) return null;
  const expMs = Date.parse(`${expiryDate}T23:59:59Z`);
  if (Number.isNaN(expMs)) return null;
  return Math.ceil((expMs - nowMs) / (24 * 60 * 60 * 1000));
}

export function evaluateExpiryHealth(
  expiryDate: string | null,
  nowMs = Date.now(),
): {
  status: ExpiryHealthStatus;
  daysLeft: number | null;
  label: string;
  badgeClass: string;
} {
  const daysLeft = getDaysUntilExpiry(expiryDate, nowMs);
  if (daysLeft === null) {
    return {
      status: "non_perishable",
      daysLeft: null,
      label: "Non-Expired (FIFO Tanggal Masuk)",
      badgeClass: "bg-slate-700/80 text-slate-200",
    };
  }
  if (daysLeft <= 0) {
    return {
      status: "expired",
      daysLeft,
      label: `Kadaluwarsa (${Math.abs(daysLeft)}h lalu)`,
      badgeClass: "bg-rose-600/30 text-rose-200 border border-rose-500/40",
    };
  }
  if (daysLeft <= 7) {
    return {
      status: "critical_7d",
      daysLeft,
      label: `DARURAT Basi (${daysLeft} hari lagi!)`,
      badgeClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
    };
  }
  if (daysLeft <= 30) {
    return {
      status: "warning_30d",
      daysLeft,
      label: `Prioritas Keluar (${daysLeft} hari lagi)`,
      badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
    };
  }
  return {
    status: "fresh",
    daysLeft,
    label: `Segar (${daysLeft} hari lagi)`,
    badgeClass: "bg-emerald-500/20 text-emerald-300",
  };
}

/**
 * Sorts stock batches in strict FEFO (First Expired, First Out) + FIFO (First In, First Out) order.
 * Perishable batches with earliest expiryDate always come before later expiry dates;
 * ties or non-perishables are sorted by oldest receivedDate first.
 */
export function sortBatchesFifoFefo(batches: FifoBatchRecord[]): FifoBatchRecord[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      const diff = Date.parse(a.expiryDate) - Date.parse(b.expiryDate);
      if (diff !== 0) return diff;
    } else if (a.expiryDate && !b.expiryDate) {
      return -1;
    } else if (!a.expiryDate && b.expiryDate) {
      return 1;
    }
    return Date.parse(a.receivedDate) - Date.parse(b.receivedDate);
  });
}

/**
 * Picks/consumes outbound stock strictly from the oldest / earliest-expiring non-expired batches (FIFO/FEFO).
 */
export function consumeStockFifo(
  batches: FifoBatchRecord[],
  productIdOrSku: string,
  requestedQty: number,
  nowMs = Date.now(),
): FifoPickResult {
  const cleanKey = productIdOrSku.trim().toLowerCase();
  const safeQty = Math.max(1, Math.round(requestedQty));

  const matching = sortBatchesFifoFefo(
    batches.filter(
      (b) =>
        b.remainingQty > 0 &&
        (b.productId.toLowerCase() === cleanKey || b.sku.toLowerCase() === cleanKey) &&
        evaluateExpiryHealth(b.expiryDate, nowMs).status !== "expired",
    ),
  );

  let remainingNeed = safeQty;
  const allocations: FifoPickAllocation[] = [];
  const deductById = new Map<string, number>();

  for (const batch of matching) {
    if (remainingNeed <= 0) break;
    const take = Math.min(batch.remainingQty, remainingNeed);
    if (take > 0) {
      deductById.set(batch.id, take);
      allocations.push({
        batchId: batch.id,
        batchCode: batch.batchCode,
        expiryDate: batch.expiryDate,
        receivedDate: batch.receivedDate,
        qtyPicked: take,
        unitCostIdr: batch.unitCostIdr,
        lineCogsIdr: take * batch.unitCostIdr,
      });
      remainingNeed -= take;
    }
  }

  const updatedBatches = batches.map((b) => {
    const deduct = deductById.get(b.id) ?? 0;
    return deduct > 0 ? { ...b, remainingQty: Math.max(0, b.remainingQty - deduct) } : b;
  });

  const totalPickedQty = safeQty - remainingNeed;
  const totalCogsIdr = allocations.reduce((s, a) => s + a.lineCogsIdr, 0);
  const batchList = allocations.map((a) => `${a.batchCode} (${a.qtyPicked} pcs)`).join(", ");

  return {
    ok: totalPickedQty > 0,
    allocations,
    totalPickedQty,
    shortfallQty: remainingNeed,
    totalCogsIdr,
    updatedBatches,
    message:
      totalPickedQty === safeQty
        ? `FIFO/FEFO sukses: diambil dari ${batchList} (Total HPP ${formatIdr(totalCogsIdr)}).`
        : totalPickedQty > 0
          ? `Diambil sebagian (${totalPickedQty}/${safeQty} pcs) dari ${batchList}; kekurangan ${remainingNeed} pcs (batch expired otomatis dilewati).`
          : "Tidak ada stok batch layak jual (seluruh stok habis atau kedaluwarsa).",
  };
}

/**
 * SIGNATURE SURPRISE FEATURE:
 * Multi-Agent AI Anti-Basi Flash Sale Generator for batches nearing expiry (<= 30 days).
 */
export function buildAntiBasiFlashSaleCampaign(batch: FifoBatchRecord, storeName: string): {
  recommendedDiscountPct: number;
  flashSalePriceIdr: number;
  capitalAtRiskIdr: number;
  whatsappCopy: string;
  socialCaption: string;
} {
  const health = evaluateExpiryHealth(batch.expiryDate);
  const discountPct = health.status === "critical_7d" ? 30 : 15;
  const estNormalSell = Math.round(batch.unitCostIdr * 1.45);
  const flashSalePriceIdr = Math.max(
    batch.unitCostIdr,
    Math.round(estNormalSell * (1 - discountPct / 100)),
  );
  const capitalAtRiskIdr = batch.remainingQty * batch.unitCostIdr;

  const whatsappCopy =
    `🔥 *FLASH SALE SEGAR HARI INI — ${storeName}* 🔥\n\n` +
    `Halo Kak! Spesial untuk pelanggan setia, *${batch.productName}* (Batch ${batch.batchCode}, kualitas masih sangat segar & layak konsumsi${batch.expiryDate ? `, Exp ${batch.expiryDate}` : ""}) lagi ada *DISKON SPESIAL ${discountPct}%*!\n\n` +
    `💰 Harga Spesial: *${formatIdr(flashSalePriceIdr)}* (Stok terbatas hanya ${batch.remainingQty} pcs!)\n` +
    `🚚 Bisa QRIS Instan atau COD Bayar di Tempat.\n\n` +
    `Balas *"MAU ${batch.sku}"* sekarang sebelum kehabisan ya Kak! 😊`;

  const socialCaption = `⚡ FLASH SALE ${discountPct}% ${batch.productName} di ${storeName}! Cuma ${formatIdr(flashSalePriceIdr)} (sisa ${batch.remainingQty} pcs fresh batch ${batch.batchCode}). Klik link bio / DM sekarang! #FlashSale #PromoUMKM #${batch.sku}`;

  return {
    recommendedDiscountPct: discountPct,
    flashSalePriceIdr,
    capitalAtRiskIdr,
    whatsappCopy,
    socialCaption,
  };
}

function fifoStorageKey(tenantId: string): string {
  return `wacrm_fifo_batches_v5_${tenantId}`;
}

function fifoLogsStorageKey(tenantId: string): string {
  return `wacrm_fifo_logs_v5_${tenantId}`;
}

function daysFromTodayIso(deltaDays: number): string {
  return new Date(Date.now() + deltaDays * 86_400_000).toISOString().slice(0, 10);
}

export function buildSeedFifoBatches(products: ErpProductRecord[]): FifoBatchRecord[] {
  const list: FifoBatchRecord[] = [];
  products.slice(0, 6).forEach((p, idx) => {
    const qtyOld = Math.max(2, Math.floor(p.stockQty * 0.35));
    const qtyNew = Math.max(1, p.stockQty - qtyOld);

    // Older / sooner-expiring batch (to clearly demonstrate FIFO / Anti-Basi!)
    const expSoon = idx === 0 ? daysFromTodayIso(5) : idx === 1 ? daysFromTodayIso(18) : daysFromTodayIso(75);
    const oldBatchCode = `LOT-${p.sku.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}-A1`;
    list.push({
      id: `fifo-seed-${p.id}-a`,
      batchCode: oldBatchCode,
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      supplierName: "Supplier Utama Nusantara",
      receivedDate: daysFromTodayIso(-45 + idx * 3),
      expiryDate: expSoon,
      initialQty: qtyOld + 5,
      remainingQty: qtyOld,
      unitCostIdr: p.costPrice || Math.round(p.unitPrice * 0.62),
      rackLocation: `Rak A-${idx + 1}`,
      qrPayload: encodeBatchQrPayload({
        sku: p.sku,
        batchCode: oldBatchCode,
        expiryDate: expSoon,
        unitCostIdr: p.costPrice,
      }),
      notes: idx === 0 ? "Prioritas keluar duluan (FIFO / Anti-Basi)" : "Batch awal gudang",
      createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    });

    // Newer batch
    const expLater = daysFromTodayIso(180 + idx * 15);
    const newBatchCode = `LOT-${p.sku.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}-B2`;
    list.push({
      id: `fifo-seed-${p.id}-b`,
      batchCode: newBatchCode,
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      supplierName: "Supplier Utama Nusantara",
      receivedDate: daysFromTodayIso(-7),
      expiryDate: expLater,
      initialQty: qtyNew,
      remainingQty: qtyNew,
      unitCostIdr: p.costPrice || Math.round(p.unitPrice * 0.62),
      rackLocation: `Rak B-${idx + 1}`,
      qrPayload: encodeBatchQrPayload({
        sku: p.sku,
        batchCode: newBatchCode,
        expiryDate: expLater,
        unitCostIdr: p.costPrice,
      }),
      notes: "Stok baru masuk (keluar setelah Batch A1 habis)",
      createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    });
  });
  return list;
}

export function loadFifoBatches(tenantId: string, products: ErpProductRecord[]): FifoBatchRecord[] {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(fifoStorageKey(tenantId));
      if (raw) {
        const parsed = JSON.parse(raw) as FifoBatchRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fall through to seed
    }
  }
  const seeded = buildSeedFifoBatches(products);
  saveFifoBatches(tenantId, seeded);
  return seeded;
}

export function saveFifoBatches(tenantId: string, batches: FifoBatchRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(fifoStorageKey(tenantId), JSON.stringify(batches));
  } catch {
    // ignore
  }
}

export function loadFifoScanLogs(tenantId: string): FifoScanAuditLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(fifoLogsStorageKey(tenantId));
    if (raw) {
      const parsed = JSON.parse(raw) as FifoScanAuditLog[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveFifoScanLogs(tenantId: string, logs: FifoScanAuditLog[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(fifoLogsStorageKey(tenantId), JSON.stringify(logs.slice(0, 60)));
  } catch {
    // ignore
  }
}

// =============================================================================
// Arrival QR Label Generator & Registry (Master Kelompok Barang -> Cetak -> Scan)
// =============================================================================

function arrivalLabelsStorageKey(tenantId: string): string {
  return `wacrm_arrival_qr_labels_v5_${tenantId}`;
}

export function loadArrivalQrLabels(tenantId: string): ArrivalQrLabelRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(arrivalLabelsStorageKey(tenantId));
    if (raw) {
      const parsed = JSON.parse(raw) as ArrivalQrLabelRecord[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveArrivalQrLabels(tenantId: string, labels: ArrivalQrLabelRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(arrivalLabelsStorageKey(tenantId), JSON.stringify(labels.slice(0, 200)));
  } catch {
    // ignore
  }
}

function formatDateYymm(now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

function formatDateYymmdd(now: Date): string {
  const dd = String(now.getDate()).padStart(2, "0");
  return `${formatDateYymm(now)}${dd}`;
}

function addDaysToIsoDate(now: Date, days: number): string {
  const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return target.toISOString().slice(0, 10);
}

/**
 * Auto-generate SKU unik berikutnya berdasarkan Kode Kelompok Barang (misal: MNM-2611-001).
 */
export function generateNextGroupSku(
  group: MasterCategoryRecord,
  existingProducts: ErpProductRecord[],
  existingLabels: ArrivalQrLabelRecord[] = [],
  now = new Date(),
): string {
  const norm = normalizeProductGroup(group);
  const prefix = `${norm.groupCode}-${formatDateYymm(now)}-`;
  const usedNumbers = new Set<number>();

  const scanSku = (sku: string) => {
    const upper = sku.trim().toUpperCase();
    if (upper.startsWith(prefix)) {
      const tail = Number(upper.slice(prefix.length));
      if (Number.isFinite(tail) && tail > 0) usedNumbers.add(tail);
    }
  };

  existingProducts.forEach((p) => scanSku(p.sku));
  existingLabels.forEach((l) => scanSku(l.sku));

  let seq = 1;
  while (usedNumbers.has(seq)) seq += 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/**
 * Auto-generate kode Batch FIFO & ID Stiker Barang Datang berikutnya.
 */
export function generateNextArrivalCodes(
  group: MasterCategoryRecord,
  existingBatches: FifoBatchRecord[],
  existingLabels: ArrivalQrLabelRecord[],
  now = new Date(),
): {
  group: NormalizedProductGroup;
  arrivalId: string;
  batchCode: string;
  suggestedExpiryDate: string | null;
} {
  const norm = normalizeProductGroup(group);
  const yymmdd = formatDateYymmdd(now);
  const idPrefix = `RCV-${norm.groupCode}-${yymmdd}-`;
  const lotPrefix = `LOT-${norm.groupCode}-${yymmdd}-`;

  const usedSeq = new Set<number>();
  for (const label of existingLabels) {
    if (label.id.toUpperCase().startsWith(idPrefix)) {
      const n = Number(label.id.slice(idPrefix.length));
      if (Number.isFinite(n) && n > 0) usedSeq.add(n);
    }
    if (label.batchCode.toUpperCase().startsWith(lotPrefix)) {
      const n = Number(label.batchCode.slice(lotPrefix.length));
      if (Number.isFinite(n) && n > 0) usedSeq.add(n);
    }
  }
  for (const batch of existingBatches) {
    if (batch.batchCode.toUpperCase().startsWith(lotPrefix)) {
      const n = Number(batch.batchCode.slice(lotPrefix.length));
      if (Number.isFinite(n) && n > 0) usedSeq.add(n);
    }
  }

  let seq = 1;
  while (usedSeq.has(seq)) seq += 1;
  const seqStr = String(seq).padStart(2, "0");

  return {
    group: norm,
    arrivalId: `${idPrefix}${seqStr}`,
    batchCode: `${lotPrefix}${seqStr}`,
    suggestedExpiryDate:
      norm.requiresExpiry && norm.defaultShelfLifeDays > 0
        ? addDaysToIsoDate(now, norm.defaultShelfLifeDays)
        : null,
  };
}

export interface CreateArrivalQrLabelInput {
  group: MasterCategoryRecord;
  productName: string;
  sku?: string;
  existingProduct?: ErpProductRecord | null;
  unit?: string;
  qty: number;
  costPrice: number;
  unitPrice: number;
  minStock?: number;
  batchCode?: string;
  expiryDate?: string | null;
  rackLocation?: string;
  supplierName?: string;
  stickerCopies?: number;
  notes?: string;
}

export function createArrivalQrLabelRecord(
  input: CreateArrivalQrLabelInput,
  existingProducts: ErpProductRecord[],
  existingBatches: FifoBatchRecord[],
  existingLabels: ArrivalQrLabelRecord[],
  now = new Date(),
): ArrivalQrLabelRecord {
  const auto = generateNextArrivalCodes(input.group, existingBatches, existingLabels, now);
  const normGroup = auto.group;
  const matchedExisting =
    input.existingProduct ??
    (input.sku
      ? existingProducts.find((p) => p.sku.toUpperCase() === input.sku!.trim().toUpperCase()) ?? null
      : null);

  const sku = (
    input.sku?.trim() ||
    matchedExisting?.sku ||
    generateNextGroupSku(normGroup, existingProducts, existingLabels, now)
  ).toUpperCase();

  const batchCode = (input.batchCode?.trim() || auto.batchCode).toUpperCase();
  const expiryDate =
    input.expiryDate !== undefined
      ? (input.expiryDate?.trim() || null)
      : auto.suggestedExpiryDate;
  const qty = Math.max(1, Math.round(Number(input.qty) || 1));
  const costPrice = Math.max(0, Math.round(Number(input.costPrice) || 0));
  const unitPrice = Math.max(0, Math.round(Number(input.unitPrice) || 0));
  const stickerCopies = Math.min(100, Math.max(1, Math.round(Number(input.stickerCopies) || 1)));

  const qrPayload = encodeArrivalQrPayload({
    arrivalId: auto.arrivalId,
    groupCode: normGroup.groupCode,
    sku,
    batchCode,
    expiryDate,
    qty,
    unitCostIdr: costPrice,
  });

  return {
    id: auto.arrivalId,
    qrPayload,
    groupId: normGroup.id,
    groupCode: normGroup.groupCode,
    groupName: normGroup.name,
    badgeColorHex: normGroup.badgeColorHex,
    sku,
    productName: input.productName.trim() || matchedExisting?.name || `Barang Baru ${sku}`,
    isNewMasterProduct: !matchedExisting,
    existingProductId: matchedExisting?.id ?? null,
    unit: (input.unit?.trim() || matchedExisting?.unit || normGroup.defaultUnit || "pcs").toLowerCase(),
    qty,
    costPrice,
    unitPrice,
    minStock: Math.max(0, Math.round(Number(input.minStock) || matchedExisting?.minStock || 5)),
    batchCode,
    expiryDate,
    rackLocation: input.rackLocation?.trim() || normGroup.defaultRack,
    supplierName: input.supplierName?.trim() || "Supplier Utama",
    stickerCopies,
    notes: input.notes?.trim() || undefined,
    status: "generated_ready",
    createdAt: now.toISOString(),
    printedAt: null,
    scannedAt: null,
    syncedProductId: null,
    syncedBatchId: null,
    accountingSynced: false,
  };
}

function escapeStickerHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Menghasilkan dokumen HTML siap cetak (Thermal 58mm, Thermal 80mm, atau A4 Grid 21-Stiker)
 * untuk ditempelkan ke fisik barang datang sebelum discan masuk ke Master & Sistem ERP/FIFO.
 */
export function renderArrivalQrStickersPrintHtml(params: {
  labels: ArrivalQrLabelRecord[];
  qrDataUrlById: Record<string, string>;
  storeProfile: Pick<StoreBusinessProfile, "businessName" | "phone">;
  layout: StickerPaperLayout;
}): string {
  const { labels, qrDataUrlById, storeProfile, layout } = params;
  const expanded: Array<{ label: ArrivalQrLabelRecord; copyIndex: number; totalCopies: number }> = [];
  for (const label of labels) {
    const copies = Math.min(50, Math.max(1, label.stickerCopies || 1));
    for (let i = 1; i <= copies; i += 1) {
      expanded.push({ label, copyIndex: i, totalCopies: copies });
    }
  }

  const pageCss =
    layout === "thermal58"
      ? `@page { size: 58mm auto; margin: 2mm; }
         body { width: 54mm; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
         .sheet { display: flex; flex-direction: column; gap: 4mm; }
         .sticker { border: 1px dashed #334155; border-radius: 6px; padding: 2.5mm; page-break-inside: avoid; break-inside: avoid; }
         .qr-img { width: 26mm; height: 26mm; display: block; }`
      : layout === "thermal80"
        ? `@page { size: 80mm auto; margin: 3mm; }
           body { width: 74mm; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
           .sheet { display: flex; flex-direction: column; gap: 4mm; }
           .sticker { border: 1.5px solid #0f172a; border-radius: 8px; padding: 3mm; page-break-inside: avoid; break-inside: avoid; }
           .qr-img { width: 30mm; height: 30mm; display: block; }`
        : `@page { size: A4 portrait; margin: 8mm; }
           body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
           .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
           .sticker { border: 1px dashed #475569; border-radius: 6px; padding: 3mm; page-break-inside: avoid; break-inside: avoid; }
           .qr-img { width: 24mm; height: 24mm; display: block; }`;

  const cardsHtml = expanded
    .map(({ label, copyIndex, totalCopies }) => {
      const qrSrc = qrDataUrlById[label.id] ?? "";
      const safeName = escapeStickerHtml(label.productName);
      const safeStore = escapeStickerHtml(storeProfile.businessName || "WACRM");
      const safeGroup = escapeStickerHtml(`[${label.groupCode}] ${label.groupName}`);
      const safeSku = escapeStickerHtml(label.sku);
      const safeLot = escapeStickerHtml(label.batchCode);
      const safeRack = escapeStickerHtml(label.rackLocation);
      const safeExp = label.expiryDate ? escapeStickerHtml(label.expiryDate) : "NON-EXP";
      const safePrice = escapeStickerHtml(formatIdr(label.unitPrice));
      const safeId = escapeStickerHtml(label.id);
      const safeColor = /^#[0-9a-fA-F]{6}$/.test(label.badgeColorHex) ? label.badgeColorHex : "#0f172a";

      return `
        <div class="sticker">
          <div class="top-row">
            <span class="store">${safeStore}</span>
            <span class="grp-badge" style="background:${safeColor};">${safeGroup}</span>
          </div>
          <div class="body-row">
            <div class="qr-box">
              ${qrSrc ? `<img class="qr-img" src="${qrSrc}" alt="QR ${safeSku}" />` : `<div class="qr-fallback">${safeSku}</div>`}
            </div>
            <div class="meta">
              <div class="prod-name">${safeName}</div>
              <div class="sku">SKU: <strong>${safeSku}</strong></div>
              <div class="line">LOT: ${safeLot}</div>
              <div class="line">EXP: <strong>${safeExp}</strong></div>
              <div class="line">RAK: ${safeRack} · QTY: ${label.qty} ${escapeStickerHtml(label.unit)}</div>
              <div class="price">${safePrice}</div>
            </div>
          </div>
          <div class="footer-row">
            <span>${safeId}</span>
            <span>Stiker ${copyIndex}/${totalCopies} · Scan Masuk Master</span>
          </div>
        </div>
      `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Cetak Stiker QR Barang Datang — ${escapeStickerHtml(storeProfile.businessName)}</title>
  <style>
    * { box-sizing: border-box; }
    ${pageCss}
    .top-row { display: flex; justify-content: space-between; align-items: center; gap: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; }
    .store { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .grp-badge { color: #ffffff; font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 99px; white-space: nowrap; }
    .body-row { display: flex; align-items: center; gap: 6px; }
    .qr-box { flex-shrink: 0; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; background: #fff; }
    .qr-fallback { width: 24mm; height: 24mm; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; }
    .meta { flex: 1; min-width: 0; font-size: 8.5px; line-height: 1.3; }
    .prod-name { font-size: 10px; font-weight: 800; color: #020617; margin-bottom: 2px; word-break: break-word; }
    .sku { font-family: monospace; font-size: 9px; color: #0f172a; }
    .line { color: #334155; font-size: 8px; }
    .price { margin-top: 2px; font-size: 10px; font-weight: 800; color: #047857; }
    .footer-row { display: flex; justify-content: space-between; margin-top: 4px; padding-top: 2px; border-top: 1px dotted #cbd5e1; font-size: 7px; color: #475569; font-family: monospace; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="sheet">${cardsHtml}</div>
</body>
</html>`;
}

