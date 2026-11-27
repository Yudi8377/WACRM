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
  PackageCheck,
  Printer,
  QrCode,
  ScanLine,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import {
  formatIdr,
  type ErpProductRecord,
  type ErpSupplierRecord,
  type PosOrderRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  buildAntiBasiFlashSaleCampaign,
  consumeStockFifo,
  encodeBatchQrPayload,
  evaluateExpiryHealth,
  loadFifoBatches,
  loadFifoScanLogs,
  parseScannedQrCode,
  QR_SCANNER_SCENARIOS,
  saveFifoBatches,
  saveFifoScanLogs,
  sortBatchesFifoFefo,
  type FifoBatchRecord,
  type FifoScanAuditLog,
} from "@/lib/fifo-inventory";
import { generateQrDataUrl } from "@/lib/qr-generator";
import { playWarmActivationChime } from "@/lib/warm-voice";

type ScanOperationMode =
  | "inbound_receive"
  | "outbound_fifo"
  | "pos_quick_scan"
  | "stock_opname"
  | "tracking_awb";

interface QrScannerStudioProps {
  tenantId: string;
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  orders: PosOrderRecord[];
  storeProfile: StoreBusinessProfile;
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
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

export function QrScannerStudio({
  tenantId,
  products,
  suppliers,
  orders,
  storeProfile,
  onAdjustProductStock,
  onRecordAccountingEntry,
  onOpenPosWithSku,
  onNotify,
}: QrScannerStudioProps) {
  const [scanMode, setScanMode] = useState<ScanOperationMode>("inbound_receive");
  const [batches, setBatches] = useState<FifoBatchRecord[]>(() =>
    loadFifoBatches(tenantId, products),
  );
  const [scanLogs, setScanLogs] = useState<FifoScanAuditLog[]>(() =>
    loadFifoScanLogs(tenantId),
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

  const persistBatches = useCallback(
    (next: FifoBatchRecord[]) => {
      setBatches(next);
      saveFifoBatches(tenantId, next);
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
        onNotify(`Kode "${clean}" terbaca. Pilih produk tujuan di Master Data untuk melanjutkan.`);
      }
    },
    [orders, products, onNotify],
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
              <QrCode className="h-3.5 w-3.5" /> Kamera Belakang HP QR Scanner · Gudang FIFO Anti-Basi · Auto Akuntansi
            </div>
            <h2 className="mt-2.5 text-2xl font-extrabold text-white">
              QR Scanner Kamera Belakang &amp; Manajemen Stok FIFO / Anti-Basi
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Gunakan kamera belakang HP untuk memindai QR/Barcode barang masuk, barang keluar FIFO (First In, First Out / FEFO), Kasir POS kilat, Stock Opname, hingga Resi COD — langsung terhubung otomatis ke <strong>Master Data, Gudang ERP, Keuangan Double-Entry, &amp; AI Flash Sale Anti-Basi</strong>!
            </p>
          </div>
          <button
            type="button"
            onClick={() => (cameraActive ? stopRearCamera() : void startRearCamera())}
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

        {/* Expiry Health Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-3.5">
            <div className="text-[11px] text-slate-400">Total Batch FIFO Aktif</div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {batches.filter((b) => b.remainingQty > 0).length} Batch
            </div>
            <div className="text-[10px] text-emerald-300">Urutan keluar otomatis FEFO/FIFO</div>
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
            <div className="text-[10px] text-slate-400">Otomatis keluar duluan saat scan</div>
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
            {lastScannedCode && (
              <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 font-mono text-[10px] text-cyan-300">
                Terakhir dipindai: {lastScannedCode}
              </div>
            )}
          </div>
        </div>

        {/* Right: Connected ERP + FIFO + Accounting Action Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 lg:col-span-7">
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
