"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Flame,
  Layers,
  PackageCheck,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import {
  formatIdr,
  type ErpProductRecord,
  type ErpSupplierRecord,
  type MasterCategoryRecord,
  type PosOrderRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  buildAntiBasiFlashSaleCampaign,
  consumeStockFifo,
  createArrivalQrLabelRecord,
  encodeBatchQrPayload,
  evaluateExpiryHealth,
  generateNextArrivalCodes,
  generateNextGroupSku,
  loadArrivalQrLabels,
  loadFifoBatches,
  loadFifoScanLogs,
  parseScannedQrCode,
  QR_SCANNER_SCENARIOS,
  renderArrivalQrStickersPrintHtml,
  saveArrivalQrLabels,
  saveFifoBatches,
  saveFifoScanLogs,
  sortBatchesFifoFefo,
  type ArrivalQrLabelRecord,
  type FifoBatchRecord,
  type FifoScanAuditLog,
  type StickerPaperLayout,
} from "@/lib/fifo-inventory";
import { generateQrDataUrl } from "@/lib/qr-generator";
import {
  deriveGroupCode,
  loadLocalMasterData,
  normalizeProductGroup,
  saveLocalMasterData,
} from "@/lib/store-profile";
import { playWarmActivationChime } from "@/lib/warm-voice";

type ScanOperationMode =
  | "inbound_receive"
  | "outbound_fifo"
  | "pos_quick_scan"
  | "stock_opname"
  | "tracking_awb";

type StudioWorkspaceTab = "arrival_generator" | "camera_scanner";

interface QrScannerStudioProps {
  tenantId: string;
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  orders: PosOrderRecord[];
  storeProfile: StoreBusinessProfile;
  onCreateProduct?: (input: {
    sku: string;
    name: string;
    category: string;
    description?: string;
    unit?: string;
    unitPrice: number;
    costPrice?: number;
    stockQty: number;
    minStock?: number;
  }) => Promise<ErpProductRecord>;
  onAdjustProductStock: (productId: string, newStockQty: number, note?: string) => Promise<void>;
  onRecordAccountingEntry: (input: {
    accountCode: string;
    accountName: string;
    accountType: "asset" | "liability" | "equity" | "revenue" | "expense" | "cogs";
    debit: number;
    credit: number;
    description: string;
  }) => Promise<void>;
  onOpenPosWithSku?: (sku: string) => void;
  onOpenMasterData?: () => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

function computeFutureIsoDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function QrScannerStudio({
  tenantId,
  products,
  suppliers,
  orders,
  storeProfile,
  onCreateProduct,
  onAdjustProductStock,
  onRecordAccountingEntry,
  onOpenPosWithSku,
  onOpenMasterData,
  onNotify,
}: QrScannerStudioProps) {
  const [studioTab, setStudioTab] = useState<StudioWorkspaceTab>("arrival_generator");
  const [scanMode, setScanMode] = useState<ScanOperationMode>("inbound_receive");
  const [batches, setBatches] = useState<FifoBatchRecord[]>(() =>
    loadFifoBatches(tenantId, products),
  );
  const [scanLogs, setScanLogs] = useState<FifoScanAuditLog[]>(() =>
    loadFifoScanLogs(tenantId),
  );
  const [arrivalLabels, setArrivalLabels] = useState<ArrivalQrLabelRecord[]>(() =>
    loadArrivalQrLabels(tenantId),
  );
  const [localMaster, setLocalMaster] = useState(() => loadLocalMasterData(tenantId));
  const productGroups = useMemo(
    () => localMaster.categories.map((cat, idx) => normalizeProductGroup(cat, idx)),
    [localMaster.categories],
  );

  // Camera & scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Selected product & batch inputs
  const [selectedSku, setSelectedSku] = useState<string>(products[0]?.sku || "");
  const [qtyInput, setQtyInput] = useState<number>(10);
  const [unitCostInput, setUnitCostInput] = useState<number>(products[0]?.costPrice || 50_000);
  const [supplierName, setSupplierName] = useState<string>(
    suppliers[0]?.name || "Supplier Utama Nusantara",
  );
  const [batchCodeInput, setBatchCodeInput] = useState<string>(
    `LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-01`,
  );
  const [expiryInput, setExpiryInput] = useState<string>(() =>
    new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
  );
  const [rackInput, setRackInput] = useState<string>("Rak A-1");
  const [syncAccounting, setSyncAccounting] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);

  // Sticker preview & Anti-Basi Flash Sale modal
  const [stickerBatch, setStickerBatch] = useState<FifoBatchRecord | null>(null);
  const [stickerQrUrl, setStickerQrUrl] = useState<string | null>(null);
  const [flashSaleBatch, setFlashSaleBatch] = useState<FifoBatchRecord | null>(null);

  // ===========================================================================
  // ARRIVAL QR GENERATOR STATE (Kelompok Barang -> Generate & Cetak -> Scan Masuk Master)
  // ===========================================================================
  const initialGroup = productGroups[0];
  const [genTargetMode, setGenTargetMode] = useState<"new_product" | "restock_existing">("new_product");
  const [genGroupId, setGenGroupId] = useState<string>(initialGroup?.id ?? "cat-1");
  const [genExistingSku, setGenExistingSku] = useState<string>(products[0]?.sku ?? "");
  const [genProductName, setGenProductName] = useState<string>("");
  const [genCustomSku, setGenCustomSku] = useState<string>("");
  const [genUnit, setGenUnit] = useState<string>(initialGroup?.defaultUnit ?? "pcs");
  const [genQty, setGenQty] = useState<number>(24);
  const [genCostPrice, setGenCostPrice] = useState<number>(35_000);
  const [genUnitPrice, setGenUnitPrice] = useState<number>(55_000);
  const [genMinStock, setGenMinStock] = useState<number>(5);
  const [genBatchCode, setGenBatchCode] = useState<string>("");
  const [genExpiryDate, setGenExpiryDate] = useState<string>(() =>
    initialGroup?.requiresExpiry && initialGroup.defaultShelfLifeDays > 0
      ? computeFutureIsoDate(initialGroup.defaultShelfLifeDays)
      : "",
  );
  const [genRack, setGenRack] = useState<string>(initialGroup?.defaultRack ?? "Rak A-1");
  const [genSupplier, setGenSupplier] = useState<string>(
    suppliers[0]?.name || "Supplier Utama Nusantara",
  );
  const [genStickerCopies, setGenStickerCopies] = useState<number>(4);
  const [genNotes, setGenNotes] = useState<string>("");
  const [paperLayout, setPaperLayout] = useState<StickerPaperLayout>("thermal58");
  const [activePreviewLabel, setActivePreviewLabel] = useState<ArrivalQrLabelRecord | null>(null);
  const [previewQrDataUrls, setPreviewQrDataUrls] = useState<Record<string, string>>({});

  // Quick-Create Kelompok Barang inline form
  const [showQuickGroupForm, setShowQuickGroupForm] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState("");
  const [quickGroupCode, setQuickGroupCode] = useState("");
  const [quickGroupRack, setQuickGroupRack] = useState("Rak G-1");
  const [quickGroupUnit, setQuickGroupUnit] = useState("pcs");
  const [quickGroupRequiresExp, setQuickGroupRequiresExp] = useState(true);
  const [quickGroupShelfDays, setQuickGroupShelfDays] = useState("90");

  // Scanned Arrival QR Intake Verification State (when scanning WACRM-IN|...)
  const [scannedArrivalDraft, setScannedArrivalDraft] = useState<ArrivalQrLabelRecord | null>(null);
  const [scannedDuplicateWarning, setScannedDuplicateWarning] = useState<string | null>(null);
  const [autoPostOneScan, setAutoPostOneScan] = useState<boolean>(false);

  const selectedGroup = useMemo(
    () => productGroups.find((g) => g.id === genGroupId) ?? productGroups[0],
    [productGroups, genGroupId],
  );

  const previewAutoCodes = useMemo(() => {
    if (!selectedGroup) {
      return { sku: "BRG-001", batchCode: "LOT-01", suggestedExpiryDate: null as string | null };
    }
    const auto = generateNextArrivalCodes(selectedGroup, batches, arrivalLabels);
    const sku =
      genTargetMode === "restock_existing" && genExistingSku
        ? genExistingSku
        : generateNextGroupSku(selectedGroup, products, arrivalLabels);
    return {
      sku,
      batchCode: auto.batchCode,
      suggestedExpiryDate: auto.suggestedExpiryDate,
    };
  }, [selectedGroup, batches, arrivalLabels, genTargetMode, genExistingSku, products]);

  const pendingArrivalCount = useMemo(
    () => arrivalLabels.filter((l) => l.status !== "scanned_synced").length,
    [arrivalLabels],
  );

  const persistBatches = useCallback(
    (next: FifoBatchRecord[]) => {
      setBatches(next);
      saveFifoBatches(tenantId, next);
    },
    [tenantId],
  );

  const persistArrivalLabels = useCallback(
    (next: ArrivalQrLabelRecord[]) => {
      setArrivalLabels(next);
      saveArrivalQrLabels(tenantId, next);
    },
    [tenantId],
  );

  const appendLog = useCallback(
    (log: Omit<FifoScanAuditLog, "id" | "createdAt">) => {
      const entry: FifoScanAuditLog = {
        ...log,
        id: `scan-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      };
      setScanLogs((prev) => {
        const next = [entry, ...prev].slice(0, 60);
        saveFifoScanLogs(tenantId, next);
        return next;
      });
    },
    [tenantId],
  );

  const ensureQrDataUrl = useCallback(
    async (label: ArrivalQrLabelRecord): Promise<string> => {
      if (previewQrDataUrls[label.id]) return previewQrDataUrls[label.id];
      const url = await generateQrDataUrl(label.qrPayload, 220);
      setPreviewQrDataUrls((prev) => ({ ...prev, [label.id]: url }));
      return url;
    },
    [previewQrDataUrls],
  );

  function handleSelectGroup(nextGroupId: string) {
    setGenGroupId(nextGroupId);
    const grp = productGroups.find((g) => g.id === nextGroupId);
    if (!grp) return;
    setGenUnit(grp.defaultUnit);
    setGenRack(grp.defaultRack);
    setGenCustomSku("");
    setGenBatchCode("");
    if (grp.requiresExpiry && grp.defaultShelfLifeDays > 0) {
      setGenExpiryDate(computeFutureIsoDate(grp.defaultShelfLifeDays));
    } else {
      setGenExpiryDate("");
    }
  }

  function handleSelectExistingProductForRestock(sku: string) {
    setGenExistingSku(sku);
    const found = products.find((p) => p.sku === sku);
    if (!found) return;
    setGenProductName(found.name);
    setGenCostPrice(found.costPrice || Math.round(found.unitPrice * 0.65));
    setGenUnitPrice(found.unitPrice);
    setGenUnit(found.unit || "pcs");
    setGenMinStock(found.minStock || 5);
    const matchedGrp = productGroups.find(
      (g) => g.name.toLowerCase() === found.category.toLowerCase(),
    );
    if (matchedGrp) {
      setGenGroupId(matchedGrp.id);
      setGenRack(matchedGrp.defaultRack);
      setGenExpiryDate(
        matchedGrp.requiresExpiry && matchedGrp.defaultShelfLifeDays > 0
          ? new Date(Date.now() + matchedGrp.defaultShelfLifeDays * 86_400_000)
              .toISOString()
              .slice(0, 10)
          : "",
      );
    }
  }

  function handleCreateQuickGroup() {
    const cleanName = quickGroupName.trim();
    if (!cleanName) {
      onNotify("Isi nama Kelompok Barang terlebih dahulu.", "error");
      return;
    }
    const newCat: MasterCategoryRecord = normalizeProductGroup({
      id: `cat-${Date.now()}`,
      name: cleanName,
      description: `Kelompok barang auto-QR (${cleanName})`,
      groupCode: deriveGroupCode(cleanName, quickGroupCode),
      defaultRack: quickGroupRack.trim() || "Rak A-1",
      defaultUnit: quickGroupUnit.trim() || "pcs",
      requiresExpiry: quickGroupRequiresExp,
      defaultShelfLifeDays: quickGroupRequiresExp ? Math.max(1, Number(quickGroupShelfDays) || 90) : 0,
    });
    const nextMaster = saveLocalMasterData(tenantId, {
      ...localMaster,
      categories: [newCat, ...localMaster.categories],
    });
    setLocalMaster(nextMaster);
    setGenGroupId(newCat.id);
    setGenRack(newCat.defaultRack ?? "Rak A-1");
    setGenUnit(newCat.defaultUnit ?? "pcs");
    setGenExpiryDate(
      newCat.requiresExpiry && (newCat.defaultShelfLifeDays ?? 0) > 0
        ? new Date(Date.now() + (newCat.defaultShelfLifeDays ?? 90) * 86_400_000)
            .toISOString()
            .slice(0, 10)
        : "",
    );
    setQuickGroupName("");
    setQuickGroupCode("");
    setShowQuickGroupForm(false);
    onNotify(
      `Kelompok Barang [${newCat.groupCode}] ${newCat.name} tersimpan ke Master Data & langsung aktif di Generator QR!`,
    );
  }

  async function handleGenerateArrivalQr() {
    if (!selectedGroup) {
      onNotify("Buat minimal 1 Kelompok Barang terlebih dahulu.", "error");
      return;
    }
    const existingProd =
      genTargetMode === "restock_existing"
        ? products.find((p) => p.sku === genExistingSku) ?? null
        : products.find(
            (p) => p.sku.toUpperCase() === (genCustomSku.trim() || previewAutoCodes.sku).toUpperCase(),
          ) ?? null;

    const cleanName =
      genTargetMode === "restock_existing"
        ? existingProd?.name || genProductName.trim()
        : genProductName.trim();

    if (!cleanName) {
      onNotify("Masukkan Nama Barang yang datang agar stiker QR jelas saat ditempel & discan.", "error");
      return;
    }

    const label = createArrivalQrLabelRecord(
      {
        group: selectedGroup,
        productName: cleanName,
        sku:
          genTargetMode === "restock_existing"
            ? existingProd?.sku || genExistingSku
            : genCustomSku.trim() || previewAutoCodes.sku,
        existingProduct: existingProd,
        unit: genUnit || selectedGroup.defaultUnit,
        qty: genQty,
        costPrice: genCostPrice,
        unitPrice: genUnitPrice,
        minStock: genMinStock,
        batchCode: genBatchCode.trim() || previewAutoCodes.batchCode,
        expiryDate: genExpiryDate.trim() || null,
        rackLocation: genRack.trim() || selectedGroup.defaultRack,
        supplierName: genSupplier.trim() || "Supplier Utama",
        stickerCopies: genStickerCopies,
        notes: genNotes.trim() || undefined,
      },
      products,
      batches,
      arrivalLabels,
    );

    const nextLabels = [label, ...arrivalLabels];
    persistArrivalLabels(nextLabels);
    setActivePreviewLabel(label);
    setGenCustomSku("");
    setGenBatchCode("");
    if (genTargetMode === "new_product") {
      setGenProductName("");
    }
    playWarmActivationChime();
    try {
      await ensureQrDataUrl(label);
    } catch {
      // QR canvas fallback handled gracefully
    }
    onNotify(
      `QR Barang Datang [${label.id}] untuk "${label.productName}" (${label.sku}) siap dicetak & ditempel!`,
    );
  }

  async function handlePrintArrivalStickers(labelsToPrint: ArrivalQrLabelRecord[]) {
    if (labelsToPrint.length === 0) {
      onNotify("Belum ada stiker QR barang datang untuk dicetak.", "error");
      return;
    }
    const qrMap: Record<string, string> = { ...previewQrDataUrls };
    for (const lbl of labelsToPrint) {
      if (!qrMap[lbl.id]) {
        try {
          qrMap[lbl.id] = await generateQrDataUrl(lbl.qrPayload, 220);
        } catch {
          qrMap[lbl.id] = "";
        }
      }
    }
    setPreviewQrDataUrls((prev) => ({ ...prev, ...qrMap }));

    const html = renderArrivalQrStickersPrintHtml({
      labels: labelsToPrint,
      qrDataUrlById: qrMap,
      storeProfile,
      layout: paperLayout,
    });

    const printWin = window.open("", "_blank", "width=780,height=720");
    if (printWin) {
      printWin.document.write(
        html.replace(
          "</body>",
          `<script>window.onload=function(){setTimeout(function(){window.print();},250);}</script></body>`,
        ),
      );
      printWin.document.close();
    } else {
      onNotify("Popup diblokir browser — izinkan popup untuk membuka dialog cetak stiker.", "error");
    }

    const printedIds = new Set(labelsToPrint.map((l) => l.id));
    const nowIso = new Date().toISOString();
    const updated = arrivalLabels.map((l) =>
      printedIds.has(l.id) && l.status === "generated_ready"
        ? { ...l, status: "printed_waiting_scan" as const, printedAt: nowIso }
        : l,
    );
    persistArrivalLabels(updated);
    if (activePreviewLabel && printedIds.has(activePreviewLabel.id)) {
      setActivePreviewLabel((prev) =>
        prev && prev.status === "generated_ready"
          ? { ...prev, status: "printed_waiting_scan", printedAt: nowIso }
          : prev,
      );
    }
    onNotify(
      `${labelsToPrint.length} jenis stiker QR (${labelsToPrint.reduce((s, l) => s + l.stickerCopies, 0)} lembar) dikirim ke Printer (${paperLayout === "a4_grid" ? "A4 Grid" : paperLayout.toUpperCase()}). Tempelkan pada fisik barang lalu scan masuk!`,
    );
  }

  function handleDeleteArrivalLabel(labelId: string) {
    const next = arrivalLabels.filter((l) => l.id !== labelId);
    persistArrivalLabels(next);
    if (activePreviewLabel?.id === labelId) {
      setActivePreviewLabel(next[0] ?? null);
    }
    onNotify("Stiker QR dihapus dari antrean.");
  }

  /**
   * CORE INTEGRATED PIPELINE:
   * Scan QR Barang Datang -> Auto Create/Update Master Barang + ERP Gudang + FIFO Batch + POS + Akuntansi + AI Knowledge!
   */
  const commitArrivalQrIntake = useCallback(
    async (draft: ArrivalQrLabelRecord, allowDuplicate = false) => {
      const existingRegistry = arrivalLabels.find((l) => l.id === draft.id);
      if (existingRegistry?.status === "scanned_synced" && !allowDuplicate) {
        setScannedDuplicateWarning(
          `Stiker QR ${draft.id} sudah pernah discan & tersinkron pada ${new Date(existingRegistry.scannedAt ?? existingRegistry.createdAt).toLocaleString("id-ID")}. Aktifkan konfirmasi ulang hanya jika benar-benar barang berbeda.`,
        );
        onNotify(
          `Peringatan Anti-Dobel: Stiker ${draft.id} sudah pernah discan masuk sebelumnya!`,
          "error",
        );
        return;
      }

      setBusy(true);
      try {
        const qty = Math.max(1, Math.round(draft.qty || 1));
        const costPrice = Math.max(0, Math.round(draft.costPrice || 0));
        const unitPrice = Math.max(0, Math.round(draft.unitPrice || 0));
        const matchedProduct = products.find(
          (p) => p.sku.toUpperCase() === draft.sku.toUpperCase(),
        );

        let syncedProduct: ErpProductRecord | null = matchedProduct ?? null;
        let createdNewInMaster = false;

        if (matchedProduct) {
          await onAdjustProductStock(
            matchedProduct.id,
            matchedProduct.stockQty + qty,
            `Scan Stiker QR Barang Datang [${draft.id}] · Batch ${draft.batchCode}`,
          );
        } else if (onCreateProduct) {
          syncedProduct = await onCreateProduct({
            sku: draft.sku.toUpperCase(),
            name: draft.productName.trim() || `Barang ${draft.sku}`,
            category: draft.groupName || "Umum",
            description:
              draft.notes ||
              `Didaftarkan otomatis via Scan Stiker QR Barang Datang [${draft.id}] · Kelompok [${draft.groupCode}] · Rak ${draft.rackLocation}`,
            unit: draft.unit || "pcs",
            unitPrice,
            costPrice,
            stockQty: qty,
            minStock: draft.minStock || 5,
          });
          createdNewInMaster = true;
        } else {
          onNotify("Handler pembuatan produk Master Data belum terhubung.", "error");
          return;
        }

        const batchId = `fifo-${Date.now().toString(36)}`;
        const newBatch: FifoBatchRecord = {
          id: batchId,
          batchCode: draft.batchCode,
          productId: syncedProduct?.id ?? `pending-${draft.sku}`,
          sku: draft.sku.toUpperCase(),
          productName: syncedProduct?.name ?? draft.productName,
          supplierName: draft.supplierName || "Supplier Utama",
          receivedDate: new Date().toISOString().slice(0, 10),
          expiryDate: draft.expiryDate || null,
          initialQty: qty,
          remainingQty: qty,
          unitCostIdr: costPrice,
          rackLocation: draft.rackLocation || "Rak A-1",
          qrPayload: draft.qrPayload,
          notes: `Scan Stiker Datang [${draft.id}] · Kelompok [${draft.groupCode}] ${draft.groupName}`,
          createdAt: new Date().toISOString(),
        };
        persistBatches([newBatch, ...batches]);

        const totalInventoryCost = qty * costPrice;
        let accountingPosted = false;
        if (syncAccounting && totalInventoryCost > 0) {
          await onRecordAccountingEntry({
            accountCode: "1105",
            accountName: "Persediaan Barang Dagang (FIFO)",
            accountType: "asset",
            debit: totalInventoryCost,
            credit: 0,
            description: `Scan QR Barang Datang [${draft.id}] ${draft.productName} (${qty} ${draft.unit} · Batch ${draft.batchCode})`,
          });
          await onRecordAccountingEntry({
            accountCode: "1101",
            accountName: "Kas & Bank / Pembelian Supplier",
            accountType: "asset",
            debit: 0,
            credit: totalInventoryCost,
            description: `Pembelian Barang Datang ${draft.supplierName} · [${draft.id}]`,
          });
          accountingPosted = true;
        }

        const nowIso = new Date().toISOString();
        const syncedRecord: ArrivalQrLabelRecord = {
          ...draft,
          qty,
          costPrice,
          unitPrice,
          status: "scanned_synced",
          scannedAt: nowIso,
          syncedProductId: syncedProduct?.id ?? null,
          syncedBatchId: batchId,
          accountingSynced: accountingPosted,
        };

        const existsInRegistry = arrivalLabels.some((l) => l.id === draft.id);
        const nextRegistry = existsInRegistry
          ? arrivalLabels.map((l) => (l.id === draft.id ? syncedRecord : l))
          : [syncedRecord, ...arrivalLabels];
        persistArrivalLabels(nextRegistry);

        appendLog({
          mode: "inbound_receive",
          rawCode: draft.qrPayload,
          sku: draft.sku,
          productName: draft.productName,
          qtyDelta: qty,
          batchCode: draft.batchCode,
          accountingSynced: accountingPosted,
          summary: `${createdNewInMaster ? "✨ BARANG BARU dibuat di Master Barang" : "📦 Stok Master Barang ditambah"} (+${qty} ${draft.unit}) · Kelompok [${draft.groupCode}] ${draft.groupName} · Batch ${draft.batchCode}${draft.expiryDate ? ` (Exp ${draft.expiryDate})` : ""} · POS, ERP Gudang & AI tersinkron${accountingPosted ? ` · Jurnal ${formatIdr(totalInventoryCost)}` : ""}`,
        });

        setSelectedSku(draft.sku);
        setScannedArrivalDraft(null);
        setScannedDuplicateWarning(null);
        playWarmActivationChime();
        onNotify(
          createdNewInMaster
            ? `🎉 SUKSES TERINTEGRASI! Produk BARU "${draft.productName}" (${draft.sku}) otomatis masuk ke Master Barang, ERP Gudang (+${qty} ${draft.unit}), FIFO Anti-Basi, POS Kasir, AI Knowledge & Jurnal Akuntansi!`
            : `🎉 SUKSES TERINTEGRASI! Restok +${qty} ${draft.unit} "${draft.productName}" (${draft.sku}) otomatis masuk ke Master Barang, ERP Gudang, FIFO Batch ${draft.batchCode}, POS Kasir & Akuntansi!`,
        );
      } finally {
        setBusy(false);
      }
    },
    [
      arrivalLabels,
      batches,
      products,
      syncAccounting,
      onAdjustProductStock,
      onCreateProduct,
      onRecordAccountingEntry,
      persistArrivalLabels,
      persistBatches,
      appendLog,
      onNotify,
    ],
  );

  const stopRearCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRearCamera();
    };
  }, [stopRearCamera]);

  const handleDecodedQrValue = useCallback(
    (rawValue: string) => {
      const clean = rawValue.trim();
      if (!clean) return;
      playWarmActivationChime();
      setLastScannedCode(clean);
      setManualCode(clean);

      const parsed = parseScannedQrCode(clean);

      // 1. INTEGRATED ARRIVAL QR STICKER (WACRM-IN|...)
      if (parsed.kind === "arrival_label") {
        setStudioTab("camera_scanner");
        setScanMode("inbound_receive");

        const registered = arrivalLabels.find(
          (l) =>
            (parsed.arrivalId && l.id.toUpperCase() === parsed.arrivalId.toUpperCase()) ||
            l.qrPayload === clean,
        );

        const matchedGroup =
          productGroups.find(
            (g) => g.groupCode.toUpperCase() === (parsed.groupCode ?? "").toUpperCase(),
          ) ?? productGroups[0];

        const matchedProd = products.find(
          (p) => p.sku.toUpperCase() === (registered?.sku || parsed.sku || "").toUpperCase(),
        );

        const draft: ArrivalQrLabelRecord = registered ?? {
          id: parsed.arrivalId || `RCV-SCAN-${Date.now().toString(36).toUpperCase()}`,
          qrPayload: clean,
          groupId: matchedGroup?.id ?? "cat-1",
          groupCode: parsed.groupCode || matchedGroup?.groupCode || "BRG",
          groupName: matchedGroup?.name || "Umum",
          badgeColorHex: matchedGroup?.badgeColorHex || "#10b981",
          sku: parsed.sku || `BRG-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          productName: matchedProd?.name || `Barang Datang ${parsed.sku || "Baru"}`,
          isNewMasterProduct: !matchedProd,
          existingProductId: matchedProd?.id ?? null,
          unit: matchedProd?.unit || matchedGroup?.defaultUnit || "pcs",
          qty: parsed.qty || 1,
          costPrice: parsed.unitCostIdr || matchedProd?.costPrice || 0,
          unitPrice: matchedProd?.unitPrice || Math.round((parsed.unitCostIdr || 50_000) * 1.35),
          minStock: matchedProd?.minStock || 5,
          batchCode: parsed.batchCode || `LOT-${Date.now().toString(36).toUpperCase()}`,
          expiryDate: parsed.expiryDate ?? null,
          rackLocation: matchedGroup?.defaultRack || "Rak A-1",
          supplierName: suppliers[0]?.name || "Supplier Utama",
          stickerCopies: 1,
          status: "printed_waiting_scan",
          createdAt: new Date().toISOString(),
        };

        // Recompute live Master existence status in case product was created/deleted after printing
        const resolvedDraft: ArrivalQrLabelRecord = {
          ...draft,
          isNewMasterProduct: !matchedProd,
          existingProductId: matchedProd?.id ?? null,
        };

        if (registered?.status === "scanned_synced") {
          setScannedDuplicateWarning(
            `Stiker QR ${registered.id} sudah pernah discan & tersinkron pada ${new Date(registered.scannedAt ?? registered.createdAt).toLocaleString("id-ID")}.`,
          );
          setScannedArrivalDraft(resolvedDraft);
          onNotify(
            `⚠️ Peringatan Anti-Dobel: Stiker ${registered.id} sudah pernah discan masuk!`,
            "error",
          );
          return;
        }

        setScannedDuplicateWarning(null);
        setScannedArrivalDraft(resolvedDraft);

        if (autoPostOneScan) {
          void commitArrivalQrIntake(resolvedDraft);
        } else {
          onNotify(
            resolvedDraft.isNewMasterProduct
              ? `✨ QR Barang BARU terdeteksi: "${resolvedDraft.productName}" (${resolvedDraft.sku})! Klik Posting untuk otomatis masuk ke Master Barang, ERP, FIFO, POS & Akuntansi.`
              : `📦 QR Restok terdeteksi: "${resolvedDraft.productName}" (+${resolvedDraft.qty} ${resolvedDraft.unit})! Klik Posting untuk sinkron penuh.`,
          );
        }
        return;
      }

      // 2. INVOICE / COD SHIPMENT QR
      setScannedArrivalDraft(null);
      setScannedDuplicateWarning(null);
      if (parsed.kind === "invoice_shipment" && parsed.invoiceNumber) {
        setScanMode("tracking_awb");
        const foundOrder = orders.find(
          (o) => o.invoiceNumber.toUpperCase() === parsed.invoiceNumber,
        );
        onNotify(
          foundOrder
            ? `QR Resi ${foundOrder.invoiceNumber} (${foundOrder.customerName}) terdeteksi! Siap update pelacakan & kirim notif WA AI.`
            : `QR Resi ${parsed.invoiceNumber} terdeteksi.`,
        );
        return;
      }

      // 3. STANDARD BATCH / PRODUCT SKU QR
      const matchedProduct = products.find(
        (p) =>
          p.sku.toLowerCase() === (parsed.sku || clean).toLowerCase() ||
          p.name.toLowerCase().includes((parsed.sku || clean).toLowerCase()),
      );

      if (matchedProduct) {
        setSelectedSku(matchedProduct.sku);
        setUnitCostInput(parsed.unitCostIdr || matchedProduct.costPrice || 50_000);
        if (parsed.batchCode) setBatchCodeInput(parsed.batchCode);
        if (parsed.expiryDate) setExpiryInput(parsed.expiryDate);
        onNotify(
          `QR Terbaca: ${matchedProduct.name} (${matchedProduct.sku}) — stok saat ini ${matchedProduct.stockQty} pcs.`,
        );
      } else {
        onNotify(
          `Kode "${clean}" belum ada di Master Barang. Buat stiker QR Barang Datang atau pilih produk tujuan.`,
        );
      }
    },
    [
      arrivalLabels,
      autoPostOneScan,
      commitArrivalQrIntake,
      orders,
      productGroups,
      products,
      suppliers,
      onNotify,
    ],
  );

  async function startRearCamera() {
    setCameraError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Kamera browser tidak didukung di lingkungan ini. Gunakan input scanner manual / USB Barcode Scanner atau tombol Simulasi Scan di bawah.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // REAR CAMERA ON MOBILE PHONES!
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });

      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;

      if (DetectorCtor) {
        const detector = new DetectorCtor({
          formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39"],
        });
        let lastCode = "";
        let lastTime = 0;

        scanTimerRef.current = setInterval(() => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          detector
            .detect(video)
            .then((codes) => {
              const first = codes[0]?.rawValue?.trim();
              if (!first) return;
              const now = Date.now();
              if (first === lastCode && now - lastTime < 2500) return;
              lastCode = first;
              lastTime = now;
              handleDecodedQrValue(first);
            })
            .catch(() => undefined);
        }, 420);
      } else {
        setCameraError(
          "Kamera belakang aktif! Browser desktop ini belum memiliki native BarcodeDetector API — arahkan ke kamera HP Android/Chrome untuk auto-decode, atau masukkan kode QR di kolom bawah.",
        );
      }
    } catch {
      setCameraError(
        "Izin kamera belakang ditolak atau perangkat tidak memiliki kamera. Anda tetap dapat memindai via scanner USB/Bluetooth atau klik Simulasi Scan.",
      );
    }
  }

  const activeProduct = useMemo(
    () => products.find((p) => p.sku === selectedSku) ?? products[0] ?? null,
    [products, selectedSku],
  );

  const sortedBatches = useMemo(() => sortBatchesFifoFefo(batches), [batches]);

  const expiryAlerts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let expired = 0;
    let atRiskValue = 0;
    for (const b of batches) {
      if (b.remainingQty <= 0) continue;
      const h = evaluateExpiryHealth(b.expiryDate);
      if (h.status === "expired") {
        expired++;
        atRiskValue += b.remainingQty * b.unitCostIdr;
      } else if (h.status === "critical_7d") {
        critical++;
        atRiskValue += b.remainingQty * b.unitCostIdr;
      } else if (h.status === "warning_30d") {
        warning++;
        atRiskValue += b.remainingQty * b.unitCostIdr;
      }
    }
    return { critical, warning, expired, atRiskValue };
  }, [batches]);

  async function executeScanTransaction() {
    if (!activeProduct) {
      onNotify("Tambahkan produk terlebih dahulu di Master Data.", "error");
      return;
    }
    setBusy(true);
    try {
      if (scanMode === "inbound_receive") {
        const qty = Math.max(1, Math.round(qtyInput));
        const cost = Math.max(0, Math.round(unitCostInput));
        const cleanBatch =
          batchCodeInput.trim() ||
          `LOT-${activeProduct.sku.slice(0, 6)}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
        const qrPayload = encodeBatchQrPayload({
          sku: activeProduct.sku,
          batchCode: cleanBatch,
          expiryDate: expiryInput || null,
          unitCostIdr: cost,
        });

        const newBatch: FifoBatchRecord = {
          id: `fifo-${Date.now().toString(36)}`,
          batchCode: cleanBatch,
          productId: activeProduct.id,
          sku: activeProduct.sku,
          productName: activeProduct.name,
          supplierName: supplierName.trim() || "Supplier Utama",
          receivedDate: new Date().toISOString().slice(0, 10),
          expiryDate: expiryInput.trim() || null,
          initialQty: qty,
          remainingQty: qty,
          unitCostIdr: cost,
          rackLocation: rackInput.trim() || "Rak A-1",
          qrPayload,
          createdAt: new Date().toISOString(),
        };

        persistBatches([newBatch, ...batches]);
        await onAdjustProductStock(
          activeProduct.id,
          activeProduct.stockQty + qty,
          `Barang masuk QR FIFO ${cleanBatch}`,
        );

        const totalInventoryCost = qty * cost;
        if (syncAccounting && totalInventoryCost > 0) {
          await onRecordAccountingEntry({
            accountCode: "1105",
            accountName: "Persediaan Barang Dagang (FIFO)",
            accountType: "asset",
            debit: totalInventoryCost,
            credit: 0,
            description: `Barang Masuk QR ${activeProduct.name} (${qty} pcs · Batch ${cleanBatch})`,
          });
          await onRecordAccountingEntry({
            accountCode: "1101",
            accountName: "Kas & Bank / Pembelian Supplier",
            accountType: "asset",
            debit: 0,
            credit: totalInventoryCost,
            description: `Pembayaran/Hutang Supplier ${supplierName} · Batch ${cleanBatch}`,
          });
        }

        appendLog({
          mode: "inbound_receive",
          rawCode: qrPayload,
          sku: activeProduct.sku,
          productName: activeProduct.name,
          qtyDelta: qty,
          batchCode: cleanBatch,
          accountingSynced: syncAccounting && totalInventoryCost > 0,
          summary: `+${qty} pcs masuk ke Gudang FIFO (${cleanBatch}${expiryInput ? `, Exp ${expiryInput}` : ""})${syncAccounting ? ` · Jurnal Persediaan ${formatIdr(totalInventoryCost)} tercatat` : ""}`,
        });

        onNotify(
          `Barang masuk sukses! +${qty} pcs ${activeProduct.name} (${cleanBatch}) tersinkron ke Master Data, Gudang FIFO & Akuntansi.`,
        );
      } else if (scanMode === "outbound_fifo") {
        const qty = Math.max(1, Math.round(qtyInput));
        const res = consumeStockFifo(batches, activeProduct.sku, qty);
        if (!res.ok) {
          onNotify(res.message, "error");
          return;
        }
        persistBatches(res.updatedBatches);
        await onAdjustProductStock(
          activeProduct.id,
          Math.max(0, activeProduct.stockQty - res.totalPickedQty),
          `Keluar FIFO ${res.allocations.map((a) => a.batchCode).join(", ")}`,
        );

        if (syncAccounting && res.totalCogsIdr > 0) {
          await onRecordAccountingEntry({
            accountCode: "5101",
            accountName: "Harga Pokok Penjualan (HPP FIFO)",
            accountType: "cogs",
            debit: res.totalCogsIdr,
            credit: 0,
            description: `Pengeluaran FIFO ${activeProduct.name} (${res.totalPickedQty} pcs)`,
          });
          await onRecordAccountingEntry({
            accountCode: "1105",
            accountName: "Persediaan Barang Dagang (FIFO)",
            accountType: "asset",
            debit: 0,
            credit: res.totalCogsIdr,
            description: `Pengurangan Stok Batch FIFO ${res.allocations.map((a) => a.batchCode).join(", ")}`,
          });
        }

        appendLog({
          mode: "outbound_fifo",
          rawCode: manualCode || activeProduct.sku,
          sku: activeProduct.sku,
          productName: activeProduct.name,
          qtyDelta: -res.totalPickedQty,
          batchCode: res.allocations.map((a) => a.batchCode).join("+"),
          accountingSynced: syncAccounting && res.totalCogsIdr > 0,
          summary: res.message,
        });
        onNotify(res.message);
      } else if (scanMode === "pos_quick_scan") {
        appendLog({
          mode: "pos_quick_scan",
          rawCode: manualCode || activeProduct.sku,
          sku: activeProduct.sku,
          productName: activeProduct.name,
          qtyDelta: -1,
          batchCode: "POS-QR",
          accountingSynced: false,
          summary: `Scan kasir kilat ${activeProduct.name} (${formatIdr(activeProduct.unitPrice)}) dikirim ke POS`,
        });
        onOpenPosWithSku?.(activeProduct.sku);
        onNotify(`Produk ${activeProduct.name} siap diproses di Kasir POS!`);
      } else if (scanMode === "stock_opname") {
        const physicalQty = Math.max(0, Math.round(qtyInput));
        const diff = physicalQty - activeProduct.stockQty;
        await onAdjustProductStock(
          activeProduct.id,
          physicalQty,
          `Stock Opname QR (${diff >= 0 ? "+" : ""}${diff})`,
        );
        appendLog({
          mode: "stock_opname",
          rawCode: manualCode || activeProduct.sku,
          sku: activeProduct.sku,
          productName: activeProduct.name,
          qtyDelta: diff,
          batchCode: "OPNAME",
          accountingSynced: false,
          summary: `Stock Opname ${activeProduct.name}: fisik ${physicalQty} pcs (selisih ${diff >= 0 ? "+" : ""}${diff} pcs)`,
        });
        onNotify(
          `Stock Opname selesai! ${activeProduct.name} diperbarui ke ${physicalQty} pcs (selisih ${diff >= 0 ? "+" : ""}${diff}).`,
        );
      } else if (scanMode === "tracking_awb") {
        appendLog({
          mode: "tracking_awb",
          rawCode: manualCode || orders[0]?.invoiceNumber || "INV-SCAN",
          sku: "RESI",
          productName: "Label Pengiriman QR",
          qtyDelta: 0,
          batchCode: "LOGISTIK",
          accountingSynced: false,
          summary: `Label Resi ${manualCode || orders[0]?.invoiceNumber || "-"} terverifikasi untuk pickup & notif AI.`,
        });
        onNotify(
          `Label Resi terverifikasi! Buka tab POS → COD & Lacak Kiriman untuk kirim notifikasi WA otomatis ke pembeli.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenSticker(batch: FifoBatchRecord) {
    setStickerBatch(batch);
    try {
      const url = await generateQrDataUrl(batch.qrPayload, 220);
      setStickerQrUrl(url);
    } catch {
      setStickerQrUrl(null);
    }
  }

  function handlePrintSticker(batch: FifoBatchRecord, qrDataUrl: string | null) {
    const html = `<!doctype html><html><head><title>Stiker QR ${batch.batchCode}</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 12px; }
        .card { width: 260px; border: 2px dashed #0f172a; border-radius: 12px; padding: 12px; text-align: center; }
        .sku { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #059669; }
        .name { font-size: 14px; font-weight: 800; margin: 4px 0; }
        .meta { font-size: 11px; color: #334155; }
        img { width: 150px; height: 150px; margin: 8px auto; display: block; }
      </style></head><body>
      <div class="card">
        <div class="sku">${storeProfile.businessName} · FIFO QR</div>
        <div class="name">${batch.productName}</div>
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ""}
        <div class="meta"><strong>SKU:</strong> ${batch.sku} · <strong>Batch:</strong> ${batch.batchCode}</div>
        <div class="meta"><strong>Masuk:</strong> ${batch.receivedDate}${batch.expiryDate ? ` · <strong>EXP:</strong> ${batch.expiryDate}` : ""}</div>
        <div class="meta"><strong>Rak:</strong> ${batch.rackLocation}</div>
      </div>
      <script>window.onload=function(){window.print();}</script></body></html>`;
    const w = window.open("", "_blank", "width=420,height=520");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero Banner */}
      <div className="rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-slate-900 via-emerald-950/35 to-cyan-950/35 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-[11px] font-extrabold text-emerald-300">
              <QrCode className="h-3.5 w-3.5" /> Generator Stiker QR Barang Datang · Kamera Belakang Scanner · FIFO Anti-Basi
            </div>
            <h2 className="mt-2.5 text-2xl font-extrabold text-white">
              Generator QR Barang Datang, Kamera Scanner &amp; Gudang FIFO Terintegrasi
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Buat &amp; cetak stiker QR otomatis berdasarkan <strong>Kelompok Barang</strong> untuk ditempel pada barang datang. Begitu stiker dipindai kamera belakang HP atau scanner USB, data langsung terintegrasi ke <strong>Master Barang, ERP Gudang, FIFO Anti-Basi, Kasir POS, Akuntansi Double-Entry &amp; Pengetahuan AI</strong>!
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenMasterData && (
              <button
                type="button"
                onClick={onOpenMasterData}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/90 px-3.5 py-3 text-xs font-bold text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300"
              >
                <Layers className="h-4 w-4 text-cyan-400" />
                Kelompok Barang di Master
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (cameraActive) {
                  stopRearCamera();
                } else {
                  setStudioTab("camera_scanner");
                  void startRearCamera();
                }
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold shadow-lg transition ${
                cameraActive
                  ? "bg-rose-500 text-white hover:bg-rose-400"
                  : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              }`}
            >
              {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraActive ? "Matikan Kamera" : "Aktifkan Kamera Belakang HP"}
            </button>
          </div>
        </div>

        {/* Expiry Health Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/75 p-3.5">
            <div className="text-[11px] text-emerald-300">Stiker QR Barang Datang</div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {arrivalLabels.length} Label
            </div>
            <div className="text-[10px] text-emerald-300/90">
              {pendingArrivalCount} siap cetak/scan · {arrivalLabels.length - pendingArrivalCount} tersinkron Master
            </div>
          </div>
          <div className="rounded-2xl border border-rose-500/35 bg-rose-950/20 p-3.5">
            <div className="text-[11px] text-rose-300">Darurat Basi (≤ 7 Hari)</div>
            <div className="mt-1 text-xl font-extrabold text-rose-400">
              {expiryAlerts.critical} Batch
            </div>
            <div className="text-[10px] text-rose-200/80">
              {expiryAlerts.expired > 0 ? `+ ${expiryAlerts.expired} kadaluwarsa` : "Segera Flash Sale AI!"}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3.5">
            <div className="text-[11px] text-amber-300">Prioritas Keluar (≤ 30 Hari)</div>
            <div className="mt-1 text-xl font-extrabold text-amber-300">
              {expiryAlerts.warning} Batch
            </div>
            <div className="text-[10px] text-slate-400">
              {batches.filter((b) => b.remainingQty > 0).length} batch FIFO aktif
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/75 p-3.5">
            <div className="text-[11px] text-slate-400">Nilai Modal Dijaga Anti-Basi</div>
            <div className="mt-1 text-xl font-extrabold text-cyan-300">
              {formatIdr(expiryAlerts.atRiskValue)}
            </div>
            <div className="text-[10px] text-slate-400">Siap diselamatkan Flash Sale AI</div>
          </div>
        </div>
      </div>

      {/* Primary Studio Workspace Tabs */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setStudioTab("arrival_generator")}
          className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
            studioTab === "arrival_generator"
              ? "border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-950/30"
              : "border-slate-800 bg-slate-900 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                studioTab === "arrival_generator"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-emerald-400"
              }`}
            >
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white">
                1. Generator &amp; Cetak Stiker QR Barang Datang
              </div>
              <div className="text-[11px] text-slate-400">
                Pilih Kelompok Barang → Auto SKU &amp; FIFO → Cetak Stiker Thermal/A4 &amp; Tempel
              </div>
            </div>
          </div>
          {pendingArrivalCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-extrabold text-amber-300">
              {pendingArrivalCount} Antrean
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStudioTab("camera_scanner")}
          className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
            studioTab === "camera_scanner"
              ? "border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-950/30"
              : "border-slate-800 bg-slate-900 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                studioTab === "camera_scanner"
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-slate-800 text-cyan-400"
              }`}
            >
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white">
                2. Kamera Scanner &amp; Posting Terintegrasi
              </div>
              <div className="text-[11px] text-slate-400">
                Scan Stiker Barang Datang → Auto Masuk Master Barang, ERP, FIFO, POS &amp; Akuntansi
              </div>
            </div>
          </div>
          {scannedArrivalDraft && (
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950">
              Siap Posting!
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: GENERATOR & CETAK STIKER QR BARANG DATANG PER KELOMPOK BARANG */}
      {/* ===================================================================== */}
      {studioTab === "arrival_generator" && (
        <div className="space-y-5">
          {/* 3-Step Integrated Flow Guide */}
          <div className="grid gap-2.5 rounded-2xl border border-emerald-500/25 bg-slate-900/90 p-4 md:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-extrabold text-slate-950">
                1
              </span>
              <div className="text-[11px]">
                <div className="font-extrabold text-white">Generate QR Per Kelompok Barang</div>
                <p className="text-slate-400">
                  Pilih Kelompok Barang dari Master Data → sistem otomatis membuat SKU unik, Batch FIFO, Rak &amp; Tanggal Expired.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xs font-extrabold text-slate-950">
                2
              </span>
              <div className="text-[11px]">
                <div className="font-extrabold text-white">Cetak &amp; Tempel pada Barang Datang</div>
                <p className="text-slate-400">
                  Cetak langsung ke Printer Thermal 58mm/80mm atau Stiker A4 Grid 21-up, lalu tempel pada dus / kemasan fisik barang.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400 text-xs font-extrabold text-slate-950">
                3
              </span>
              <div className="text-[11px]">
                <div className="font-extrabold text-white">Scan QR → Otomatis Masuk Seluruh Sistem</div>
                <p className="text-slate-400">
                  Begitu discan kamera HP/USB, barang langsung tercipta/terupdate di <strong>Master Barang, ERP Gudang, FIFO, POS, Akuntansi &amp; AI!</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            {/* Left Form: Generator Stiker QR Barang Datang */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <QrCode className="h-4 w-4 text-emerald-400" />
                  Buat Stiker QR Barang Datang Otomatis
                </h3>
                <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setGenTargetMode("new_product");
                      setGenProductName("");
                      setGenCustomSku("");
                    }}
                    className={`rounded-lg px-2.5 py-1 font-bold transition ${
                      genTargetMode === "new_product"
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ✨ Barang Baru (Auto-Master)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGenTargetMode("restock_existing");
                      if (products[0]) handleSelectExistingProductForRestock(products[0].sku);
                    }}
                    className={`rounded-lg px-2.5 py-1 font-bold transition ${
                      genTargetMode === "restock_existing"
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📦 Restok Barang Lama
                  </button>
                </div>
              </div>

              {/* Kelompok Barang Selector + Quick Create */}
              <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
                    <Layers className="h-3.5 w-3.5" />
                    Pilih Kelompok Barang (Terhubung Master Data)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickGroupForm((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    <Plus className="h-3 w-3" />
                    {showQuickGroupForm ? "Tutup Form Kelompok" : "+ Kelompok Barang Baru"}
                  </button>
                </div>

                {/* Group Pills */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {productGroups.map((grp) => {
                    const active = selectedGroup?.id === grp.id;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => handleSelectGroup(grp.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          active
                            ? "border-emerald-400 bg-emerald-500/20 text-white shadow"
                            : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: grp.badgeColorHex }}
                        >
                          {grp.groupCode}
                        </span>
                        <span>{grp.name}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedGroup && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span>
                      Auto SKU: <strong className="font-mono text-emerald-300">{previewAutoCodes.sku}</strong>
                    </span>
                    <span>
                      Batch FIFO: <strong className="font-mono text-cyan-300">{previewAutoCodes.batchCode}</strong>
                    </span>
                    <span>
                      Rak Default: <strong className="text-slate-200">{selectedGroup.defaultRack}</strong>
                    </span>
                    <span>
                      FIFO:{" "}
                      <strong className={selectedGroup.requiresExpiry ? "text-amber-300" : "text-slate-300"}>
                        {selectedGroup.requiresExpiry
                          ? `Anti-Basi (${selectedGroup.defaultShelfLifeDays} hari)`
                          : "Non-Expired"}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Quick Create New Kelompok Barang */}
                {showQuickGroupForm && (
                  <div className="mt-3 space-y-2.5 border-t border-slate-800 pt-3">
                    <div className="text-[11px] font-bold text-cyan-300">
                      Tambah Kelompok Barang Baru (otomatis tersimpan ke Master Data):
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={quickGroupName}
                        onChange={(e) => {
                          setQuickGroupName(e.target.value);
                          if (!quickGroupCode) setQuickGroupCode(deriveGroupCode(e.target.value));
                        }}
                        placeholder="Nama Kelompok (misal: Kopi Roastery)"
                        className="col-span-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                      <input
                        value={quickGroupCode}
                        maxLength={5}
                        onChange={(e) =>
                          setQuickGroupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                        }
                        placeholder="Kode (KOP)"
                        className="rounded-xl border border-emerald-500/40 bg-slate-900 px-3 py-1.5 font-mono text-xs font-bold uppercase text-emerald-300"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={quickGroupRack}
                        onChange={(e) => setQuickGroupRack(e.target.value)}
                        placeholder="Rak Default (Rak F-1)"
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                      <select
                        value={quickGroupUnit}
                        onChange={(e) => setQuickGroupUnit(e.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      >
                        {localMaster.units.map((u) => (
                          <option key={u.id} value={u.code}>
                            Satuan: {u.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={quickGroupShelfDays}
                        onChange={(e) => {
                          setQuickGroupShelfDays(e.target.value);
                          setQuickGroupRequiresExp(Number(e.target.value) > 0);
                        }}
                        placeholder="Masa simpan (hari)"
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] text-amber-200">
                        <input
                          type="checkbox"
                          checked={quickGroupRequiresExp}
                          onChange={(e) => setQuickGroupRequiresExp(e.target.checked)}
                          className="accent-amber-500"
                        />
                        Wajib Expired FIFO
                      </label>
                      <button
                        type="button"
                        onClick={handleCreateQuickGroup}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                      >
                        Simpan Kelompok ke Master
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Arrival Item Details Form */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {genTargetMode === "restock_existing" ? (
                  <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
                    Pilih Barang Lama di Master Barang *
                    <select
                      value={genExistingSku}
                      onChange={(e) => handleSelectExistingProductForRestock(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.sku}>
                          [{p.category}] {p.sku} — {p.name} (Stok: {p.stockQty} {p.unit})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
                      Nama Barang Datang Baru (otomatis dibuat di Master saat discan) *
                      <input
                        value={genProductName}
                        onChange={(e) => setGenProductName(e.target.value)}
                        placeholder="Contoh: Kopi Arabika Gayo 500gr / Matcha Uji Premium 1kg"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-300">
                      Kode SKU Otomatis (bisa diubah)
                      <input
                        value={genCustomSku}
                        onChange={(e) => setGenCustomSku(e.target.value.toUpperCase())}
                        placeholder={previewAutoCodes.sku}
                        className="mt-1 w-full rounded-xl border border-emerald-500/35 bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-300"
                      />
                    </label>
                  </>
                )}

                <label className="block text-xs font-semibold text-slate-300">
                  Kode Batch / Lot FIFO Otomatis
                  <input
                    value={genBatchCode}
                    onChange={(e) => setGenBatchCode(e.target.value.toUpperCase())}
                    placeholder={previewAutoCodes.batchCode}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-cyan-300"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Qty Datang *
                    <input
                      type="number"
                      min={1}
                      value={genQty}
                      onChange={(e) => setGenQty(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-300">
                    Satuan
                    <select
                      value={genUnit}
                      onChange={(e) => setGenUnit(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                    >
                      {localMaster.units.map((u) => (
                        <option key={u.id} value={u.code}>
                          {u.code}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-semibold text-slate-300">
                  Harga Beli / HPP per Unit (Rp)
                  <input
                    type="number"
                    min={0}
                    value={genCostPrice}
                    onChange={(e) => setGenCostPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Harga Jual POS / Katalog (Rp)
                  <input
                    type="number"
                    min={0}
                    value={genUnitPrice}
                    onChange={(e) => setGenUnitPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Tanggal Expired FIFO (Anti-Basi)
                  <input
                    type="date"
                    value={genExpiryDate}
                    onChange={(e) => setGenExpiryDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Rak Gudang &amp; Jumlah Cetak Stiker
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input
                      value={genRack}
                      onChange={(e) => setGenRack(e.target.value)}
                      placeholder="Rak A-1"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={genStickerCopies}
                      onChange={(e) => setGenStickerCopies(Number(e.target.value))}
                      title="Jumlah stiker yang akan dicetak"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </label>

                <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
                  Supplier Pengirim &amp; Catatan Datang (opsional)
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <input
                      value={genSupplier}
                      onChange={(e) => setGenSupplier(e.target.value)}
                      placeholder="Nama Supplier"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                    />
                    <input
                      value={genNotes}
                      onChange={(e) => setGenNotes(e.target.value)}
                      placeholder="Catatan dus / surat jalan (opsional)"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleGenerateArrivalQr()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400"
              >
                <Sparkles className="h-4 w-4" />
                Generate QR Barang Datang ({genStickerCopies} Stiker Siap Cetak &amp; Tempel)
              </button>
            </div>

            {/* Right Preview: Printable Sticker Preview & Layout Printer */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/95 p-5 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                    <Printer className="h-4 w-4 text-cyan-400" />
                    Preview Stiker QR Siap Cetak
                  </h3>
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                    Thermal / A4
                  </span>
                </div>

                {/* Paper Layout Picker */}
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
                  {(
                    [
                      { id: "thermal58", label: "Thermal 58mm" },
                      { id: "thermal80", label: "Thermal 80mm" },
                      { id: "a4_grid", label: "A4 Grid 21-Up" },
                    ] as const
                  ).map((lay) => (
                    <button
                      key={lay.id}
                      type="button"
                      onClick={() => setPaperLayout(lay.id)}
                      className={`rounded-xl border px-2 py-2 font-bold transition ${
                        paperLayout === lay.id
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      {lay.label}
                    </button>
                  ))}
                </div>

                {/* Live White Sticker Mockup */}
                {activePreviewLabel ? (
                  <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-600 bg-white p-4 text-slate-950 shadow-xl">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <span className="truncate text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                        {storeProfile.businessName}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white"
                        style={{ backgroundColor: activePreviewLabel.badgeColorHex }}
                      >
                        [{activePreviewLabel.groupCode}] {activePreviewLabel.groupName}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1">
                        {previewQrDataUrls[activePreviewLabel.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewQrDataUrls[activePreviewLabel.id]}
                            alt={`QR ${activePreviewLabel.sku}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <QrCode className="h-14 w-14 text-slate-800" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5 text-[11px]">
                        <div className="text-sm font-extrabold leading-tight text-slate-950">
                          {activePreviewLabel.productName}
                        </div>
                        <div className="font-mono text-[11px] font-bold text-slate-800">
                          SKU: {activePreviewLabel.sku}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          LOT: {activePreviewLabel.batchCode}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          EXP:{" "}
                          <strong className="text-slate-900">
                            {activePreviewLabel.expiryDate || "NON-EXP"}
                          </strong>{" "}
                          · RAK: {activePreviewLabel.rackLocation}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          QTY: <strong>{activePreviewLabel.qty} {activePreviewLabel.unit}</strong> ·{" "}
                          {activePreviewLabel.stickerCopies} stiker
                        </div>
                        <div className="pt-1 text-sm font-extrabold text-emerald-700">
                          {formatIdr(activePreviewLabel.unitPrice)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-dotted border-slate-300 pt-1.5 font-mono text-[9px] text-slate-500">
                      <span>{activePreviewLabel.id}</span>
                      <span>
                        {activePreviewLabel.isNewMasterProduct
                          ? "AUTO-MASTER BARU"
                          : "RESTOK MASTER"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center">
                    <QrCode className="h-12 w-12 text-emerald-400/60" />
                    <div className="mt-3 text-xs font-bold text-slate-200">
                      Belum Ada Stiker QR Dipilih
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Pilih Kelompok Barang di sebelah kiri, isi Nama Barang Datang, lalu klik{" "}
                      <strong>Generate QR Barang Datang</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons under Preview */}
              {activePreviewLabel && (
                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePrintArrivalStickers([activePreviewLabel])}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-cyan-300"
                    >
                      <Printer className="h-4 w-4" />
                      Cetak Stiker Ini ({activePreviewLabel.stickerCopies}x)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecodedQrValue(activePreviewLabel.qrPayload)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      <ScanLine className="h-4 w-4" />
                      Scan Masuk Master →
                    </button>
                  </div>
                  <div className="rounded-xl bg-slate-950 px-3 py-1.5 font-mono text-[10px] text-slate-400 break-all">
                    Payload QR: {activePreviewLabel.qrPayload}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Antrean Stiker QR Barang Datang (Siap Cetak / Menunggu Scan / Tersinkron) */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                  Antrean Stiker QR Barang Datang ({arrivalLabels.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cetak semua stiker sekaligus, tempel ke barang datang, lalu scan dengan kamera belakang HP untuk masuk otomatis ke seluruh modul.
                </p>
              </div>
              {pendingArrivalCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    void handlePrintArrivalStickers(
                      arrivalLabels.filter((l) => l.status !== "scanned_synced"),
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/20 px-3.5 py-2 text-xs font-extrabold text-cyan-200 ring-1 ring-cyan-500/40 hover:bg-cyan-500/30"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak Semua Antrean ({pendingArrivalCount} Label)
                </button>
              )}
            </div>

            {arrivalLabels.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
                Belum ada stiker QR barang datang. Buat stiker pertama Anda di form di atas untuk mencoba alur <strong>Kelompok Barang → Cetak Stiker → Scan Masuk Master &amp; ERP!</strong>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {arrivalLabels.map((lbl) => (
                  <div
                    key={lbl.id}
                    onClick={() => {
                      setActivePreviewLabel(lbl);
                      void ensureQrDataUrl(lbl);
                    }}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                      activePreviewLabel?.id === lbl.id
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: lbl.badgeColorHex }}
                        >
                          {lbl.groupCode}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{lbl.groupName}</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          lbl.status === "scanned_synced"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : lbl.status === "printed_waiting_scan"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {lbl.status === "scanned_synced"
                          ? "✅ Tersinkron Sistem"
                          : lbl.status === "printed_waiting_scan"
                            ? "🏷️ Dicetak · Tunggu Scan"
                            : "✨ Siap Cetak"}
                      </span>
                    </div>

                    <div className="mt-2 font-extrabold text-white">{lbl.productName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-emerald-300">
                      {lbl.sku} · {lbl.batchCode}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                      <span>
                        Qty: <strong className="text-white">{lbl.qty} {lbl.unit}</strong>
                      </span>
                      <span>HPP: {formatIdr(lbl.costPrice)}</span>
                      <span>Jual: {formatIdr(lbl.unitPrice)}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      Rak {lbl.rackLocation} · EXP: {lbl.expiryDate || "Non-Expired"} · {lbl.stickerCopies} stiker
                    </div>

                    <div
                      className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => void handlePrintArrivalStickers([lbl])}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-slate-700"
                      >
                        <Printer className="h-3 w-3" /> Cetak
                      </button>
                      {lbl.status !== "scanned_synced" ? (
                        <button
                          type="button"
                          onClick={() => handleDecodedQrValue(lbl.qrPayload)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
                        >
                          <ScanLine className="h-3 w-3" /> Scan Masuk Sistem
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Master, ERP, FIFO &amp; POS Aktif
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteArrivalLabel(lbl.id)}
                        className="ml-auto rounded-lg p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                        title="Hapus dari antrean"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: KAMERA BELAKANG SCANNER & POSTING TERINTEGRASI                 */}
      {/* ===================================================================== */}
      {studioTab === "camera_scanner" && (
        <>
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {(
              [
                { id: "inbound_receive", label: "1. Barang Masuk FIFO", icon: ArrowDownToLine },
                { id: "outbound_fifo", label: "2. Keluar FIFO/Anti-Basi", icon: ArrowUpFromLine },
                { id: "pos_quick_scan", label: "3. Kasir POS Kilat", icon: ShoppingCart },
                { id: "stock_opname", label: "4. Stock Opname", icon: ClipboardCheck },
                { id: "tracking_awb", label: "5. Scan Resi COD", icon: Truck },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              const active = scanMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setScanMode(m.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition ${
                    active
                      ? "border-emerald-400 bg-emerald-500 text-slate-950 shadow"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scanner Viewport + Transaction Panel */}
          <div className="grid gap-5 lg:grid-cols-12">
        {/* Left: Rear Camera Viewfinder */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
              <ScanLine className="h-4 w-4 text-emerald-400" />
              Jendela Scan Kamera Belakang
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                cameraActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {cameraActive ? "KAMERA AKTIF" : "STANDBY"}
            </span>
          </div>

          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`}
            />
            {!cameraActive && (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <QrCode className="h-12 w-12 text-emerald-400/70" />
                <p className="mt-3 text-xs font-bold text-slate-200">
                  Kamera Belakang Siap Memindai QR &amp; Barcode
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Klik &ldquo;Aktifkan Kamera Belakang HP&rdquo; di atas atau pindai langsung menggunakan scanner USB/Bluetooth di kolom bawah.
                </p>
                <button
                  type="button"
                  onClick={() => void startRearCamera()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  <Camera className="h-4 w-4" /> Buka Kamera Belakang
                </button>
              </div>
            )}
            {cameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-44 w-44 rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
              </div>
            )}
          </div>

          {cameraError && (
            <div className="mt-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-[11px] text-amber-200">
              {cameraError}
            </div>
          )}

          {/* Manual / USB Scanner Input + Quick Simulate Buttons */}
          <div className="mt-4 space-y-2">
            <label className="block text-[11px] font-bold text-slate-300">
              Input Kode QR / Barcode (atau tembak via Scanner USB/Bluetooth)
            </label>
            <div className="flex gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleDecodedQrValue(manualCode);
                  }
                }}
                placeholder="Contoh: SKU-KOPI-01 atau WACRM-ITEM|SKU:..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleDecodedQrValue(manualCode)}
                className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
              >
                Baca
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {arrivalLabels
                .filter((l) => l.status !== "scanned_synced")
                .slice(0, 2)
                .map((lbl) => (
                  <button
                    key={lbl.id}
                    type="button"
                    onClick={() => handleDecodedQrValue(lbl.qrPayload)}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-extrabold text-cyan-200 hover:border-cyan-400"
                  >
                    Scan Stiker Datang: {lbl.sku}
                  </button>
                ))}
              {products.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    handleDecodedQrValue(
                      encodeBatchQrPayload({
                        sku: p.sku,
                        batchCode: `LOT-${p.sku.slice(0, 5)}-NEW`,
                        expiryDate: expiryInput,
                        unitCostIdr: p.costPrice,
                      }),
                    )
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-emerald-300 hover:border-emerald-500"
                >
                  Simulasi Scan: {p.sku}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[11px] text-violet-200">
              <input
                type="checkbox"
                checked={autoPostOneScan}
                onChange={(e) => setAutoPostOneScan(e.target.checked)}
                className="h-3.5 w-3.5 accent-violet-400"
              />
              <Zap className="h-3.5 w-3.5 shrink-0 text-violet-300" />
              <span>
                <strong>Mode Cepat 1-Scan Auto-Posting</strong> (scan stiker barang datang langsung masuk Master &amp; ERP tanpa klik konfirmasi)
              </span>
            </label>

            {lastScannedCode && (
              <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 font-mono text-[10px] text-cyan-300 break-all">
                Terakhir dipindai: {lastScannedCode}
              </div>
            )}
          </div>
        </div>

        {/* Right: Connected ERP + FIFO + Accounting Action Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 lg:col-span-7">
          {/* INTEGRATED ARRIVAL QR STICKER VERIFICATION PANEL (WACRM-IN|...) */}
          {scannedArrivalDraft && (
            <div className="mb-5 rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-950/60 via-slate-950 to-cyan-950/40 p-4 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: scannedArrivalDraft.badgeColorHex }}
                    >
                      [{scannedArrivalDraft.groupCode}] {scannedArrivalDraft.groupName}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        scannedArrivalDraft.isNewMasterProduct
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-cyan-400 text-slate-950"
                      }`}
                    >
                      {scannedArrivalDraft.isNewMasterProduct
                        ? "✨ BARANG BARU → Auto-Buat di Master Barang"
                        : "📦 RESTOK → Auto-Tambah Stok Master Barang"}
                    </span>
                  </div>
                  <h4 className="mt-2 text-base font-extrabold text-white">
                    Stiker QR Barang Datang Terbaca: {scannedArrivalDraft.productName}
                  </h4>
                  <p className="font-mono text-[11px] text-emerald-300">
                    ID {scannedArrivalDraft.id} · SKU {scannedArrivalDraft.sku} · LOT {scannedArrivalDraft.batchCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScannedArrivalDraft(null);
                    setScannedDuplicateWarning(null);
                  }}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Tutup
                </button>
              </div>

              {scannedDuplicateWarning && (
                <div className="mt-3 rounded-xl border border-rose-500/50 bg-rose-500/15 p-3 text-xs text-rose-200">
                  <strong>⚠️ Anti-Dobel Scan Aktif:</strong> {scannedDuplicateWarning}
                </div>
              )}

              {/* Editable Final Confirmation Fields */}
              <div className="mt-3 grid gap-2.5 sm:grid-cols-4">
                <label className="block text-[11px] font-semibold text-slate-300 sm:col-span-2">
                  Nama Barang (Masuk Master)
                  <input
                    value={scannedArrivalDraft.productName}
                    onChange={(e) =>
                      setScannedArrivalDraft({ ...scannedArrivalDraft, productName: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-300">
                  Qty Datang ({scannedArrivalDraft.unit})
                  <input
                    type="number"
                    min={1}
                    value={scannedArrivalDraft.qty}
                    onChange={(e) =>
                      setScannedArrivalDraft({
                        ...scannedArrivalDraft,
                        qty: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-300">
                  Rak Gudang
                  <input
                    value={scannedArrivalDraft.rackLocation}
                    onChange={(e) =>
                      setScannedArrivalDraft({ ...scannedArrivalDraft, rackLocation: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-300">
                  HPP / Modal (Rp)
                  <input
                    type="number"
                    min={0}
                    value={scannedArrivalDraft.costPrice}
                    onChange={(e) =>
                      setScannedArrivalDraft({
                        ...scannedArrivalDraft,
                        costPrice: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-300">
                  Harga Jual POS (Rp)
                  <input
                    type="number"
                    min={0}
                    value={scannedArrivalDraft.unitPrice}
                    onChange={(e) =>
                      setScannedArrivalDraft({
                        ...scannedArrivalDraft,
                        unitPrice: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-300 sm:col-span-2">
                  Tanggal Expired FIFO (opsional)
                  <input
                    type="date"
                    value={scannedArrivalDraft.expiryDate ?? ""}
                    onChange={(e) =>
                      setScannedArrivalDraft({
                        ...scannedArrivalDraft,
                        expiryDate: e.target.value || null,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </label>
              </div>

              {/* 5 Integrated Systems Badges */}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-300">
                  ✓ Master Barang
                </span>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-cyan-300">
                  ✓ ERP Gudang &amp; Mutasi
                </span>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-300">
                  ✓ Batch FIFO Anti-Basi
                </span>
                <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-violet-300">
                  ✓ POS Kasir &amp; AI Sales
                </span>
                <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-pink-300">
                  ✓ Jurnal Persediaan ({formatIdr(scannedArrivalDraft.qty * scannedArrivalDraft.costPrice)})
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void commitArrivalQrIntake(scannedArrivalDraft, Boolean(scannedDuplicateWarning))}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Menyinkronkan ke Master Barang, ERP, FIFO, POS &amp; Akuntansi...
                    </>
                  ) : scannedDuplicateWarning ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Tetap Posting Ulang (Override Anti-Dobel)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Posting Masuk ke Master Barang &amp; Seluruh Sistem (+{scannedArrivalDraft.qty}{" "}
                      {scannedArrivalDraft.unit})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <PackageCheck className="h-4 w-4 text-emerald-400" />
            {scanMode === "inbound_receive" && "Catat Barang Masuk → Master Data, Gudang FIFO & Jurnal Akuntansi"}
            {scanMode === "outbound_fifo" && "Keluarkan Barang Otomatis Metode FIFO / FEFO (Anti-Basi)"}
            {scanMode === "pos_quick_scan" && "Kasir POS Kilat via Scan QR Kamera"}
            {scanMode === "stock_opname" && "Stock Opname Fisik Rak vs Sistem"}
            {scanMode === "tracking_awb" && "Verifikasi Label QR Pengiriman & COD"}
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
              Produk Terhubung (Master Data)
              <select
                value={selectedSku}
                onChange={(e) => {
                  const nextSku = e.target.value;
                  setSelectedSku(nextSku);
                  const p = products.find((item) => item.sku === nextSku);
                  if (p) setUnitCostInput(p.costPrice || 50_000);
                }}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.sku}>
                    {p.sku} — {p.name} (Stok Sistem: {p.stockQty} · HPP {formatIdr(p.costPrice)})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-300">
              {scanMode === "stock_opname" ? "Jumlah Hitung Fisik di Rak *" : "Jumlah (Qty) *"}
              <input
                type="number"
                min={scanMode === "stock_opname" ? 0 : 1}
                value={qtyInput}
                onChange={(e) => setQtyInput(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </label>

            {scanMode === "inbound_receive" && (
              <>
                <label className="block text-xs font-semibold text-slate-300">
                  Harga Beli / HPP per Unit (Rp)
                  <input
                    type="number"
                    min={0}
                    value={unitCostInput}
                    onChange={(e) => setUnitCostInput(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Kode Batch / Lot FIFO
                  <input
                    value={batchCodeInput}
                    onChange={(e) => setBatchCodeInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Tanggal Kedaluwarsa / Expired (Opsional — Anti-Basi)
                  <input
                    type="date"
                    value={expiryInput}
                    onChange={(e) => setExpiryInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Supplier Pengirim
                  <input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Lokasi Rak Gudang
                  <input
                    value={rackInput}
                    onChange={(e) => setRackInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </label>
              </>
            )}
          </div>

          {(scanMode === "inbound_receive" || scanMode === "outbound_fifo") && (
            <label className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
              <input
                type="checkbox"
                checked={syncAccounting}
                onChange={(e) => setSyncAccounting(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              <span>
                <strong>Otomatis Posting Jurnal Akuntansi Double-Entry</strong> (Persediaan / HPP FIFO seimbang otomatis)
              </span>
            </label>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void executeScanTransaction()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy
              ? "Menyinkronkan Master Data, Gudang & Keuangan..."
              : scanMode === "inbound_receive"
                ? `Simpan Barang Masuk FIFO (+${qtyInput} pcs · ${formatIdr(qtyInput * unitCostInput)})`
                : scanMode === "outbound_fifo"
                  ? `Keluarkan ${qtyInput} pcs dengan Urutan FIFO / Anti-Basi`
                  : scanMode === "pos_quick_scan"
                    ? "Kirim ke Keranjang Kasir POS"
                    : scanMode === "stock_opname"
                      ? "Simpan Hasil Stock Opname"
                      : "Verifikasi Label Resi Pengiriman"}
          </button>

          {/* 6 Real-World Scenarios Grid */}
          <div className="mt-5 border-t border-slate-800 pt-4">
            <h4 className="text-xs font-extrabold text-cyan-300">
              6 Skenario Penggunaan Kamera QR Belakang HP yang Sudah Aktif:
            </h4>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {QR_SCANNER_SCENARIOS.map((sc) => (
                <div
                  key={sc.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px]"
                >
                  <div className="font-extrabold text-white">{sc.title}</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-emerald-400">
                    {sc.connectedModules.join(" → ")}
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-400">{sc.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* FIFO / FEFO ANTI-BASI BATCH LEDGER TABLE */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Antrean Gudang FIFO / FEFO (Barang Masuk Duluan / Mendekati Basi Keluar Duluan)
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Urutan prioritas paling atas adalah batch yang wajib keluar terlebih dahulu untuk mencegah barang basi/kadaluwarsa.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2 pr-3">Urutan FIFO</th>
                <th className="py-2 pr-3">Batch &amp; Produk</th>
                <th className="py-2 pr-3">Tgl Masuk / Exp</th>
                <th className="py-2 pr-3">Status Kesegaran</th>
                <th className="py-2 pr-3">Sisa / HPP</th>
                <th className="py-2">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sortedBatches.filter((b) => b.remainingQty > 0).map((b, idx) => {
                const health = evaluateExpiryHealth(b.expiryDate);
                return (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-[11px] font-extrabold text-emerald-300">
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-bold text-white">{b.productName}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {b.sku} · {b.batchCode} · {b.rackLocation}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-300">
                      <div>In: {b.receivedDate}</div>
                      <div className="text-amber-300">Exp: {b.expiryDate || "Non-Exp"}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${health.badgeClass}`}>
                        {health.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono">
                      <div className="font-bold text-white">{b.remainingQty} pcs</div>
                      <div className="text-[10px] text-slate-400">{formatIdr(b.unitCostIdr)}/pcs</div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenSticker(b)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:border-cyan-400"
                        >
                          <Printer className="h-3 w-3" /> Stiker QR
                        </button>
                        {(health.status === "critical_7d" || health.status === "warning_30d") && (
                          <button
                            type="button"
                            onClick={() => setFlashSaleBatch(b)}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950"
                          >
                            <Flame className="h-3 w-3" /> AI Flash Sale Anti-Basi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent QR Scan Audit Trail */}
      {scanLogs.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <h4 className="text-xs font-extrabold text-white">Riwayat Scan QR &amp; Sinkronisasi Terbaru</h4>
          <div className="mt-2.5 space-y-1.5">
            {scanLogs.slice(0, 6).map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px]"
              >
                <div>
                  <span className="font-bold text-white">{l.productName}</span>{" "}
                  <span className="text-slate-400">· {l.summary}</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400">
                  {l.accountingSynced ? "✓ Jurnal Akuntansi" : l.batchCode}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Print QR Sticker */}
      {stickerBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-5 text-center shadow-2xl">
            <h4 className="text-sm font-extrabold text-white">Stiker QR Batch FIFO</h4>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Tempel di kardus/rak barang untuk scan cepat kamera HP
            </p>
            <div className="mt-4 rounded-2xl bg-white p-4 text-slate-900">
              <div className="text-[10px] font-extrabold uppercase text-emerald-700">
                {storeProfile.businessName} · FIFO QR
              </div>
              <div className="mt-1 text-sm font-extrabold">{stickerBatch.productName}</div>
              {stickerQrUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={stickerQrUrl} alt="QR Batch" className="mx-auto my-2 h-40 w-40" />
              )}
              <div className="font-mono text-[11px] font-bold">
                {stickerBatch.sku} · {stickerBatch.batchCode}
              </div>
              <div className="text-[10px] text-slate-600">
                Masuk: {stickerBatch.receivedDate}
                {stickerBatch.expiryDate ? ` · EXP: ${stickerBatch.expiryDate}` : ""}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => handlePrintSticker(stickerBatch, stickerQrUrl)}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold text-slate-950"
              >
                Cetak Stiker QR
              </button>
              <button
                type="button"
                onClick={() => setStickerBatch(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Signature AI Anti-Basi Flash Sale */}
      {flashSaleBatch && (() => {
        const promo = buildAntiBasiFlashSaleCampaign(flashSaleBatch, storeProfile.businessName);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-extrabold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> Fitur Istimewa: AI Anti-Basi Auto Flash Sale
              </div>
              <h4 className="mt-2 text-lg font-extrabold text-white">
                Selamatkan Modal {formatIdr(promo.capitalAtRiskIdr)} — {flashSaleBatch.productName}
              </h4>
              <p className="mt-1 text-xs text-slate-300">
                Rekomendasi diskon <strong>{promo.recommendedDiscountPct}%</strong> → harga jual kilat{" "}
                <strong className="text-emerald-300">{formatIdr(promo.flashSalePriceIdr)}</strong> sebelum tanggal expired ({flashSaleBatch.expiryDate}).
              </p>
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs whitespace-pre-wrap text-slate-200">
                {promo.whatsappCopy}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(promo.whatsappCopy);
                    onNotify("Copy Flash Sale WhatsApp disalin! Siap broadcast ke pelanggan.");
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950"
                >
                  <Copy className="h-3.5 w-3.5" /> Salin Promo WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(promo.socialCaption);
                    onNotify("Caption Flash Sale IG/TikTok disalin!");
                  }}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2.5 text-xs font-bold text-cyan-200"
                >
                  Salin IG/TikTok
                </button>
                <button
                  type="button"
                  onClick={() => setFlashSaleBatch(null)}
                  className="rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-bold text-slate-300"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
