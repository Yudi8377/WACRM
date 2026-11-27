"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Printer,
  Send,
  ShieldCheck,
  Truck,
  UserCheck,
  Wallet,
} from "lucide-react";
import {
  formatIdr,
  type PosOrderRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  appendTrackingCheckpoint,
  buildAiShipmentNotification,
  COD_STAGE_META,
  evaluateCodRisk,
  loadShipmentTrackings,
  saveShipmentTrackings,
  type CodTrackingStage,
  type ShipmentTrackingRecord,
} from "@/lib/cod-logistics";
import { detectPrinterCapabilities, printViaWifiHtml } from "@/lib/printer";

interface CodTrackingHubProps {
  tenantId: string;
  orders: PosOrderRecord[];
  storeProfile: StoreBusinessProfile;
  onSettleCodToAccounting?: (order: PosOrderRecord, tracking: ShipmentTrackingRecord) => Promise<void>;
  onToast: (msg: string, tone?: "ok" | "error") => void;
}

const ORDERED_STAGES: CodTrackingStage[] = [
  "awaiting_buyer_confirm",
  "packed",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered_paid",
  "settled_to_merchant",
];

export function CodTrackingHub({
  tenantId,
  orders,
  storeProfile,
  onSettleCodToAccounting,
  onToast,
}: CodTrackingHubProps) {
  const [trackingMap, setTrackingMap] = useState<Record<string, ShipmentTrackingRecord>>(() =>
    loadShipmentTrackings(
      tenantId,
      orders,
      storeProfile.businessName,
      storeProfile.socialHandles?.whatsapp || storeProfile.phone || "",
    ),
  );
  const [filterMode, setFilterMode] = useState<"all" | "cod" | "in_delivery" | "settled">("all");
  const [activeOrderId, setActiveOrderId] = useState<string>(orders[0]?.id || "");

  // Checkpoint editor state
  const [nextStage, setNextStage] = useState<CodTrackingStage>("out_for_delivery");
  const [locationInput, setLocationInput] = useState("Hub Kota Tujuan");
  const [detailInput, setDetailInput] = useState(
    "Kurir sedang mengantar paket menuju alamat penerima.",
  );
  const [senderInput, setSenderInput] = useState(storeProfile.businessName);
  const [driverNameInput, setDriverNameInput] = useState("Mas Dimas Prasetyo");
  const [driverPhoneInput, setDriverPhoneInput] = useState("0812-8899-4411");
  const [courierInput, setCourierInput] = useState("J&T Express");
  const [awbInput, setAwbInput] = useState("");
  const [autoNotifyAi, setAutoNotifyAi] = useState(true);
  const [previewNotif, setPreviewNotif] = useState<{
    text: string;
    waLink: string | null;
    agentName: string;
  } | null>(null);
  const [busySettle, setBusySettle] = useState(false);

  const printerCaps = useMemo(() => detectPrinterCapabilities(), []);

  const trackingList = useMemo(() => {
    const merged = {
      ...loadShipmentTrackings(
        tenantId,
        orders,
        storeProfile.businessName,
        storeProfile.socialHandles?.whatsapp || storeProfile.phone || "",
      ),
      ...trackingMap,
    };
    return orders
      .map((o) => ({ order: o, tracking: merged[o.id] }))
      .filter((x): x is { order: PosOrderRecord; tracking: ShipmentTrackingRecord } => Boolean(x.tracking));
  }, [orders, storeProfile.businessName, storeProfile.phone, storeProfile.socialHandles?.whatsapp, tenantId, trackingMap]);

  const filteredList = useMemo(() => {
    return trackingList.filter(({ tracking }) => {
      if (filterMode === "cod") return tracking.isCod;
      if (filterMode === "in_delivery")
        return ["packed", "picked_up", "in_transit", "out_for_delivery"].includes(
          tracking.currentStage,
        );
      if (filterMode === "settled")
        return tracking.currentStage === "settled_to_merchant" || tracking.currentStage === "delivered_paid";
      return true;
    });
  }, [trackingList, filterMode]);

  const selectedPair =
    trackingList.find((x) => x.order.id === activeOrderId) ?? trackingList[0] ?? null;

  const codSummary = useMemo(() => {
    let totalCodOrders = 0;
    let pendingCodSettlementIdr = 0;
    let settledCodIdr = 0;
    let inTransitCount = 0;
    for (const { tracking } of trackingList) {
      if (tracking.isCod) {
        totalCodOrders++;
        if (tracking.currentStage === "settled_to_merchant") {
          settledCodIdr += tracking.codCollectAmountIdr - tracking.codHandlingFeeIdr;
        } else if (tracking.currentStage !== "returned_rts") {
          pendingCodSettlementIdr += tracking.codCollectAmountIdr;
        }
      }
      if (["picked_up", "in_transit", "out_for_delivery"].includes(tracking.currentStage)) {
        inTransitCount++;
      }
    }
    return { totalCodOrders, pendingCodSettlementIdr, settledCodIdr, inTransitCount };
  }, [trackingList]);

  function selectShipment(orderId: string) {
    setActiveOrderId(orderId);
    const pair = trackingList.find((x) => x.order.id === orderId);
    if (pair) {
      setSenderInput(pair.tracking.senderName);
      setDriverNameInput(pair.tracking.driverName || "Mas Dimas Prasetyo");
      setDriverPhoneInput(pair.tracking.driverPhone || "0812-8899-4411");
      setCourierInput(pair.tracking.courierName);
      setAwbInput(pair.tracking.awbNumber);
    }
    setPreviewNotif(null);
  }

  function handleUpdateCheckpoint() {
    if (!selectedPair) return;
    const updated = appendTrackingCheckpoint(selectedPair.tracking, {
      stage: nextStage,
      location: locationInput,
      detail: detailInput,
      senderName: senderInput,
      driverName: driverNameInput,
      driverPhone: driverPhoneInput,
      courierName: courierInput,
      awbNumber: awbInput || selectedPair.tracking.awbNumber,
      aiNotifiedBuyer: autoNotifyAi,
    });

    const nextMap = { ...trackingMap, [selectedPair.order.id]: updated };
    setTrackingMap(nextMap);
    saveShipmentTrackings(tenantId, nextMap);

    const notif = buildAiShipmentNotification({ tracking: updated });
    setPreviewNotif({
      text: notif.whatsappText,
      waLink: notif.waDeepLink,
      agentName: notif.agentName,
    });

    onToast(
      autoNotifyAi
        ? `Status diperbarui ke "${COD_STAGE_META[nextStage].label}" & Multi-Agen AI menyiapkan notifikasi WA pembeli (lengkap nama pengirim & kurir)!`
        : `Checkpoint pelacakan berhasil diperbarui!`,
    );
  }

  async function handleSettleCodFunds() {
    if (!selectedPair) return;
    setBusySettle(true);
    try {
      const settled = appendTrackingCheckpoint(selectedPair.tracking, {
        stage: "settled_to_merchant",
        location: "Rekening Escrow / Bank Toko",
        detail: `Dana COD cair bersih ${formatIdr(selectedPair.tracking.codCollectAmountIdr - selectedPair.tracking.codHandlingFeeIdr)} (Biaya admin COD ${formatIdr(selectedPair.tracking.codHandlingFeeIdr)}).`,
        senderName: senderInput || selectedPair.tracking.senderName,
        driverName: driverNameInput || selectedPair.tracking.driverName,
        driverPhone: driverPhoneInput || selectedPair.tracking.driverPhone,
        aiNotifiedBuyer: true,
      });
      const nextMap = { ...trackingMap, [selectedPair.order.id]: settled };
      setTrackingMap(nextMap);
      saveShipmentTrackings(tenantId, nextMap);

      if (onSettleCodToAccounting) {
        await onSettleCodToAccounting(selectedPair.order, settled);
      }
      onToast(
        `Dana COD ${selectedPair.order.invoiceNumber} cair & otomatis masuk Jurnal Kas + Beban Admin COD di Akuntansi!`,
      );
    } finally {
      setBusySettle(false);
    }
  }

  function handlePrintUniversalCodReport() {
    const rowsHtml = trackingList
      .map(
        ({ order, tracking }) => `
        <tr>
          <td style="padding:6px;border:1px solid #cbd5e1;">${order.invoiceNumber}<br/><small>${tracking.awbNumber}</small></td>
          <td style="padding:6px;border:1px solid #cbd5e1;"><strong>${order.customerName}</strong><br/><small>${tracking.shippingAddress}</small></td>
          <td style="padding:6px;border:1px solid #cbd5e1;">${tracking.courierName}<br/><small>Kurir: ${tracking.driverName || "-"}</small></td>
          <td style="padding:6px;border:1px solid #cbd5e1;">${tracking.isCod ? `COD ${formatIdr(tracking.codCollectAmountIdr)}` : "Lunas"}</td>
          <td style="padding:6px;border:1px solid #cbd5e1;">${COD_STAGE_META[tracking.currentStage].label}</td>
        </tr>`,
      )
      .join("");

    const html = `<!doctype html><html><head><title>Laporan Pengiriman & COD — ${storeProfile.businessName}</title>
      <style>body{font-family:system-ui,sans-serif;padding:16px;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;text-align:left;padding:8px;border:1px solid #cbd5e1}</style></head>
      <body>
        <h2>${storeProfile.businessName} — Manifest Pengiriman &amp; Settlement COD</h2>
        <p style="font-size:12px;color:#475569">Dicetak: ${new Date().toLocaleString("id-ID")} · Total COD Aktif: ${codSummary.totalCodOrders} paket · Dana COD Menunggu Cair: ${formatIdr(codSummary.pendingCodSettlementIdr)}</p>
        <table><thead><tr><th>Invoice / Resi</th><th>Pembeli &amp; Alamat</th><th>Kurir &amp; Pengantar</th><th>Pembayaran</th><th>Status Terkini</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`;
    const res = printViaWifiHtml(`Manifest COD ${storeProfile.businessName}`, html);
    onToast(res.message);
  }

  return (
    <div className="space-y-5">
      {/* KPI & Universal Printer Compatibility Banner */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Wallet className="h-3.5 w-3.5 text-emerald-400" /> Order COD Marketplace
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">{codSummary.totalCodOrders}</div>
          <div className="text-[10px] text-emerald-300">Dengan AI Risk &amp; Fee Ala Shopee/Toped</div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Truck className="h-3.5 w-3.5 text-amber-400" /> Dalam Pengiriman Kurir
          </div>
          <div className="mt-1 text-2xl font-extrabold text-amber-300">{codSummary.inTransitCount}</div>
          <div className="text-[10px] text-slate-400">Pelacakan real-time + Nama Kurir</div>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Piutang COD Menunggu Cair
          </div>
          <div className="mt-1 text-xl font-extrabold text-cyan-300">
            {formatIdr(codSummary.pendingCodSettlementIdr)}
          </div>
          <div className="text-[10px] text-slate-400">Otomatis cair ke Kas Akuntansi</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Printer className="h-3.5 w-3.5 text-emerald-400" /> Printer Universal
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
              PLUG &amp; PLAY
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
            Siap cetak di <strong>SEMUA printer</strong>: USB OTG{printerCaps.supportsWebUsb ? " ✓" : ""}, Bluetooth Thermal{printerCaps.supportsWebBluetooth ? " ✓" : ""}, WiFi/AirPrint/Mopria, Inkjet/LaserJet A4 &amp; EDC!
          </p>
          <button
            type="button"
            onClick={handlePrintUniversalCodReport}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
          >
            <Printer className="h-3 w-3" /> Cetak Manifest COD
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: `Semua Kiriman (${trackingList.length})` },
            { id: "cod", label: `Khusus COD (${codSummary.totalCodOrders})` },
            { id: "in_delivery", label: "Sedang Dikirim" },
            { id: "settled", label: "Terkirim / Dana Cair" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterMode(f.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterMode === f.id
                ? "bg-emerald-500 text-slate-950"
                : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left List of Orders */}
        <div className="space-y-2.5 lg:col-span-5">
          {filteredList.map(({ order, tracking }) => {
            const active = selectedPair?.order.id === order.id;
            const meta = COD_STAGE_META[tracking.currentStage];
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => selectShipment(order.id)}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-emerald-400 bg-emerald-950/35 shadow"
                    : "border-slate-800 bg-slate-900/90 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-extrabold text-white">
                    {order.invoiceNumber}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeColor}`}>
                    {meta.shortLabel}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{order.customerName}</span>
                  <span className="font-mono font-extrabold text-emerald-300">
                    {tracking.isCod ? `COD ${formatIdr(tracking.codCollectAmountIdr)}` : formatIdr(order.totalAmount)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span>🚚 {tracking.courierName}</span>
                  <span>· Resi: {tracking.awbNumber}</span>
                  {tracking.driverName && <span className="text-cyan-300">· Kurir: {tracking.driverName}</span>}
                </div>
              </button>
            );
          })}
          {filteredList.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-xs text-slate-400">
              Belum ada pengiriman pada filter ini. Buat transaksi baru (termasuk COD) di tab Kasir POS!
            </div>
          )}
        </div>

        {/* Right Detail: Shopee/Toped Stepper + COD Risk + Multi-Agent AI Auto Notify */}
        <div className="space-y-4 lg:col-span-7">
          {selectedPair ? (
            (() => {
              const { order, tracking } = selectedPair;
              const codRisk = evaluateCodRisk({
                customerPhone: order.customerPhone,
                shippingAddress: order.shippingAddress,
                totalAmountIdr: order.totalAmount,
                buyerConfirmed: tracking.buyerCodConfirmed,
              });
              const activeStepIdx = COD_STAGE_META[tracking.currentStage].stepIndex;
              const liveNotif = buildAiShipmentNotification({ tracking });

              return (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">
                          {order.invoiceNumber} — {order.customerName}
                        </h3>
                        {tracking.isCod && (
                          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300">
                            COD BAYAR DI TEMPAT · {formatIdr(tracking.codCollectAmountIdr)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Pengirim: <strong className="text-slate-200">{tracking.senderName}</strong> · Ekspedisi:{" "}
                        <strong className="text-cyan-300">{tracking.courierName}</strong> ({tracking.awbNumber})
                      </p>
                      {tracking.driverName && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-300">
                          <UserCheck className="h-3.5 w-3.5" />
                          Kurir Pengantar: <strong>{tracking.driverName}</strong>
                          {tracking.driverPhone ? ` (${tracking.driverPhone})` : ""}
                        </p>
                      )}
                    </div>

                    {tracking.isCod && tracking.currentStage !== "settled_to_merchant" && (
                      <button
                        type="button"
                        disabled={busySettle}
                        onClick={() => void handleSettleCodFunds()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        {busySettle ? "Mencairkan..." : "Dana COD Cair → Akuntansi"}
                      </button>
                    )}
                  </div>

                  {/* Visual Marketplace Stepper */}
                  <div className="mt-4 grid grid-cols-7 gap-1">
                    {ORDERED_STAGES.map((st, idx) => {
                      const done = idx <= activeStepIdx && tracking.currentStage !== "returned_rts";
                      return (
                        <div key={st} className="text-center">
                          <div
                            className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ${
                              done
                                ? "bg-emerald-500 text-slate-950"
                                : "border border-slate-700 bg-slate-950 text-slate-500"
                            }`}
                          >
                            {done ? "✓" : idx + 1}
                          </div>
                          <div className="mt-1 truncate text-[9px] font-bold text-slate-300">
                            {COD_STAGE_META[st].shortLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* COD Risk Guard (Ala Shopee/Toped Anti-RTS) */}
                  {tracking.isCod && (
                    <div
                      className={`mt-4 rounded-2xl border p-3.5 text-xs ${
                        codRisk.level === "TINGGI"
                          ? "border-rose-500/40 bg-rose-950/20"
                          : codRisk.level === "WASPADA"
                            ? "border-amber-500/35 bg-amber-950/20"
                            : "border-emerald-500/30 bg-emerald-950/20"
                      }`}
                    >
                      <div className="flex items-center justify-between font-extrabold">
                        <span className="flex items-center gap-1.5 text-white">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          AI COD Anti-Retur Risk Guard: {codRisk.level} (Skor {codRisk.score}/100)
                        </span>
                        <span className="font-mono text-[11px] text-slate-300">
                          Fee COD: {formatIdr(tracking.codHandlingFeeIdr)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300">{codRisk.recommendedAction}</p>
                    </div>
                  )}

                  {/* Update Checkpoint + Nama Pengirim / Kurir Form */}
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/85 p-4">
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
                      <MapPin className="h-3.5 w-3.5" /> Update Lokasi Pengiriman &amp; Nama Pengirim/Kurir
                    </h4>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Tahap Pengiriman Baru
                        <select
                          value={nextStage}
                          onChange={(e) => setNextStage(e.target.value as CodTrackingStage)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        >
                          <option value="packed">Dikemas Penjual</option>
                          <option value="picked_up">Diserahkan ke Kurir (Pickup)</option>
                          <option value="in_transit">Dalam Perjalanan (Transit Hub)</option>
                          <option value="out_for_delivery">Sedang Diantar Kurir ke Alamat</option>
                          <option value="delivered_paid">Terkirim &amp; Diterima Pembeli</option>
                          <option value="settled_to_merchant">Dana COD Cair ke Toko</option>
                          <option value="returned_rts">Retur / Gagal COD (RTS)</option>
                        </select>
                      </label>

                      <label className="block text-[11px] font-semibold text-slate-300">
                        Ekspedisi &amp; No. Resi
                        <div className="mt-1 flex gap-1.5">
                          <input
                            value={courierInput}
                            onChange={(e) => setCourierInput(e.target.value)}
                            placeholder="J&T / JNE / SPX"
                            className="w-1/2 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
                          />
                          <input
                            value={awbInput}
                            onChange={(e) => setAwbInput(e.target.value)}
                            placeholder={tracking.awbNumber}
                            className="w-1/2 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 font-mono text-xs text-white"
                          />
                        </div>
                      </label>

                      <label className="block text-[11px] font-semibold text-slate-300">
                        Nama Pengirim (Toko / Admin)
                        <input
                          value={senderInput}
                          onChange={(e) => setSenderInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        />
                      </label>

                      <label className="block text-[11px] font-semibold text-slate-300">
                        Nama Kurir Pengantar &amp; No. HP
                        <div className="mt-1 flex gap-1.5">
                          <input
                            value={driverNameInput}
                            onChange={(e) => setDriverNameInput(e.target.value)}
                            placeholder="Nama Kurir"
                            className="w-1/2 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
                          />
                          <input
                            value={driverPhoneInput}
                            onChange={(e) => setDriverPhoneInput(e.target.value)}
                            placeholder="0812-xxxx"
                            className="w-1/2 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
                          />
                        </div>
                      </label>

                      <label className="block text-[11px] font-semibold text-slate-300">
                        Lokasi Terkini Paket
                        <input
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="Contoh: Gudang Sortir Surabaya / Kurir Kediri Kota"
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        />
                      </label>

                      <label className="block text-[11px] font-semibold text-slate-300">
                        Catatan Pengiriman
                        <input
                          value={detailInput}
                          onChange={(e) => setDetailInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-[11px] text-emerald-300">
                        <input
                          type="checkbox"
                          checked={autoNotifyAi}
                          onChange={(e) => setAutoNotifyAi(e.target.checked)}
                          className="h-3.5 w-3.5 accent-emerald-500"
                        />
                        <strong>Multi-Agen AI Otomatis Kabari Pembeli (WA + Nama Pengirim &amp; Kurir)</strong>
                      </label>

                      <button
                        type="button"
                        onClick={handleUpdateCheckpoint}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
                      >
                        <Send className="h-3.5 w-3.5" /> Simpan Status &amp; Siapkan Notif AI
                      </button>
                    </div>
                  </div>

                  {/* Multi-Agent AI Notification Ready-to-Send Preview */}
                  <div className="mt-4 rounded-2xl border border-emerald-500/35 bg-emerald-950/20 p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-extrabold text-emerald-300">
                        <Bot className="h-4 w-4" />
                        {previewNotif?.agentName || liveNotif.agentName} — Pesan WhatsApp Otomatis Pembeli
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(previewNotif?.text || liveNotif.whatsappText);
                            onToast("Pesan notifikasi pelacakan AI disalin!");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:border-emerald-400"
                        >
                          <Copy className="h-3 w-3" /> Salin WA
                        </button>
                        {(previewNotif?.waLink || liveNotif.waDeepLink) && (
                          <a
                            href={previewNotif?.waLink || liveNotif.waDeepLink || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 hover:bg-emerald-400"
                          >
                            Kirim ke WA Pembeli <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/90 p-3 font-sans text-[11px] leading-relaxed text-slate-200">
                      {previewNotif?.text || liveNotif.whatsappText}
                    </pre>
                  </div>

                  {/* Timeline Checkpoints */}
                  <div className="mt-4">
                    <h4 className="text-xs font-extrabold text-white">Riwayat Jejak Pengiriman</h4>
                    <div className="mt-2 space-y-2">
                      {[...tracking.checkpoints].reverse().map((cp) => (
                        <div
                          key={cp.id}
                          className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/75 p-3 text-xs"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-bold text-white">{cp.title}</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {new Date(cp.timestamp).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="text-[11px] text-cyan-300">
                              {cp.location}
                              {cp.driverName ? ` · Kurir: ${cp.driverName}` : ""}
                            </div>
                            <div className="text-[11px] text-slate-400">{cp.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-xs text-slate-400">
              <Package className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-2">Pilih pesanan di sebelah kiri untuk melacak &amp; mengirim notifikasi AI.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
