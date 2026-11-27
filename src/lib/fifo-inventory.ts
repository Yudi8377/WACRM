import { formatIdr, type ErpProductRecord } from "@/lib/crm-types";

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
  kind: "batch_item" | "invoice_shipment" | "sku_or_barcode";
  sku?: string;
  batchCode?: string;
  expiryDate?: string | null;
  unitCostIdr?: number;
  invoiceNumber?: string;
  raw: string;
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
