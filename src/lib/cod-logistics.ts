import { formatIdr, type PosOrderRecord } from "@/lib/crm-types";

export type CodTrackingStage =
  | "awaiting_buyer_confirm"
  | "packed"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered_paid"
  | "settled_to_merchant"
  | "returned_rts";

export interface ShipmentCheckpoint {
  id: string;
  stage: CodTrackingStage;
  title: string;
  location: string;
  detail: string;
  driverName?: string;
  driverPhone?: string;
  timestamp: string;
  aiNotifiedBuyer: boolean;
}

export interface ShipmentTrackingRecord {
  orderId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  isCod: boolean;
  codCollectAmountIdr: number;
  codHandlingFeeIdr: number;
  codRiskScore: number;
  codRiskLevel: "AMAN" | "WASPADA" | "TINGGI";
  buyerCodConfirmed: boolean;
  courierName: string;
  awbNumber: string;
  senderName: string;
  senderPhone: string;
  driverName: string;
  driverPhone: string;
  currentStage: CodTrackingStage;
  etaLabel: string;
  codSettledAt: string | null;
  checkpoints: ShipmentCheckpoint[];
  updatedAt: string;
}

export const COD_STAGE_META: Record<
  CodTrackingStage,
  { label: string; shortLabel: string; stepIndex: number; badgeColor: string }
> = {
  awaiting_buyer_confirm: {
    label: "Konfirmasi COD Pembeli",
    shortLabel: "Konfirmasi",
    stepIndex: 0,
    badgeColor: "bg-amber-500/20 text-amber-300",
  },
  packed: {
    label: "Dikemas Penjual",
    shortLabel: "Dikemas",
    stepIndex: 1,
    badgeColor: "bg-sky-500/20 text-sky-300",
  },
  picked_up: {
    label: "Diserahkan ke Kurir",
    shortLabel: "Pickup Kurir",
    stepIndex: 2,
    badgeColor: "bg-indigo-500/20 text-indigo-300",
  },
  in_transit: {
    label: "Dalam Perjalanan (Transit Hub)",
    shortLabel: "Transit",
    stepIndex: 3,
    badgeColor: "bg-cyan-500/20 text-cyan-300",
  },
  out_for_delivery: {
    label: "Sedang Diantar Kurir ke Alamat",
    shortLabel: "Diantar",
    stepIndex: 4,
    badgeColor: "bg-violet-500/20 text-violet-300",
  },
  delivered_paid: {
    label: "Terkirim & Dibayar Pembeli",
    shortLabel: "Terkirim",
    stepIndex: 5,
    badgeColor: "bg-emerald-500/20 text-emerald-300",
  },
  settled_to_merchant: {
    label: "Dana COD Cair ke Rekening Toko",
    shortLabel: "Dana Cair",
    stepIndex: 6,
    badgeColor: "bg-emerald-600/30 text-emerald-200",
  },
  returned_rts: {
    label: "Retur / Gagal COD (RTS)",
    shortLabel: "Retur RTS",
    stepIndex: 5,
    badgeColor: "bg-rose-500/20 text-rose-300",
  },
};

export interface CodRiskEvaluation {
  score: number; // 0 = ultra-safe, 100 = very high RTS risk
  level: "AMAN" | "WASPADA" | "TINGGI";
  reasons: string[];
  recommendedAction: string;
}

/**
 * Marketplace-grade COD Return-to-Sender (RTS) Risk Evaluator (ala Shopee / Tokopedia Seller).
 */
export function evaluateCodRisk(params: {
  customerPhone?: string | null;
  shippingAddress: string;
  totalAmountIdr: number;
  buyerConfirmed?: boolean;
  priorReturnedCount?: number;
}): CodRiskEvaluation {
  let score = 12;
  const reasons: string[] = [];

  const addr = (params.shippingAddress || "").trim();
  const phone = (params.customerPhone || "").replace(/\D/g, "");

  if (addr.length < 22) {
    score += 28;
    reasons.push("Alamat pengiriman terlalu singkat (belum memuat patokan/RT-RW/Kecamatan).");
  }
  if (!/(kec\.|kecamatan|kel\.|kelurahan|rt|rw|no\.|jl\.|jalan|perum|blok|desa|gang)/i.test(addr)) {
    score += 18;
    reasons.push("Detail jalan/kecamatan belum spesifik — berisiko kurir kesulitan menemukan rumah.");
  }
  if (phone.length < 10) {
    score += 24;
    reasons.push("Nomor WhatsApp/HP pembeli belum lengkap untuk konfirmasi kurir.");
  }
  if (params.totalAmountIdr >= 1_500_000) {
    score += 22;
    reasons.push("Nominal COD di atas Rp 1,5 juta — sarankan DP 20% atau verifikasi telepon.");
  } else if (params.totalAmountIdr >= 500_000) {
    score += 10;
    reasons.push("Nominal COD menengah — wajib kirim konfirmasi kesiapan bayar via WA AI.");
  }
  if ((params.priorReturnedCount ?? 0) > 0) {
    score += 35;
    reasons.push(`Pembeli memiliki riwayat ${params.priorReturnedCount}x paket retur COD.`);
  }
  if (params.buyerConfirmed) {
    score = Math.max(5, score - 22);
    reasons.push("Pembeli telah mengonfirmasi alamat & kesediaan bayar COD via WhatsApp.");
  }

  const clamped = Math.min(98, Math.max(5, score));
  const level: CodRiskEvaluation["level"] =
    clamped >= 60 ? "TINGGI" : clamped >= 34 ? "WASPADA" : "AMAN";

  const recommendedAction =
    level === "TINGGI"
      ? "Kirim pesan Verifikasi COD AI + sarankan ubah ke QRIS/Transfer DP 20% sebelum paket diserahkan ke kurir."
      : level === "WASPADA"
        ? "Biarkan Multi-Agen AI mengirim konfirmasi alamat & nominal tunai pas ke WhatsApp pembeli sebelum pickup."
        : "Profil COD aman! Siap dikemas, cetak label QR COD, dan serahkan ke kurir ekspedisi.";

  return { score: clamped, level, reasons, recommendedAction };
}

/**
 * Standard Indonesian Marketplace COD Handling Fee (default 2.5%, min Rp 2.500, or 0% if promo).
 */
export function calculateCodHandlingFee(subtotalPlusShippingIdr: number, feePct = 2.5): number {
  if (feePct <= 0 || subtotalPlusShippingIdr <= 0) return 0;
  return Math.max(2_500, Math.round((subtotalPlusShippingIdr * feePct) / 100));
}

export function generateAwbNumber(courierName: string, invoiceNumber: string): string {
  const prefix = (courierName || "EXP")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");
  const digits = invoiceNumber.replace(/\D/g, "").slice(-6).padStart(6, "0");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${digits}${suffix}`;
}

export function buildAiShipmentNotification(params: {
  tracking: ShipmentTrackingRecord;
  checkpoint?: ShipmentCheckpoint;
}): {
  agentName: string;
  whatsappText: string;
  speechSummary: string;
  waDeepLink: string | null;
} {
  const { tracking } = params;
  const latest =
    params.checkpoint ?? tracking.checkpoints[tracking.checkpoints.length - 1];
  const stageMeta = COD_STAGE_META[tracking.currentStage];

  const codBlock = tracking.isCod
    ? `\n💵 *Pembayaran COD (Bayar di Tempat):* ${formatIdr(tracking.codCollectAmountIdr)}` +
      (tracking.currentStage === "out_for_delivery"
        ? `\nMohon menyiapkan uang tunai pas / QRIS saat kurir tiba, dan pastikan paket dalam keadaan tersegel baik ya Kak.`
        : `\nPembayaran dilakukan langsung ke kurir saat paket tiba di alamat tujuan.`)
    : `\n✅ *Status Pembayaran:* LUNAS (Non-COD)`;

  const courierPersonBlock =
    `\n📦 *Pengirim:* ${tracking.senderName}` +
    (tracking.driverName
      ? `\n🚚 *Kurir Pengantar:* ${tracking.driverName}${tracking.driverPhone ? ` (${tracking.driverPhone})` : ""}`
      : "");

  const whatsappText =
    `Halo Kak *${tracking.customerName}* 😊\n` +
    `Kabar terbaru untuk pesanan *${tracking.invoiceNumber}* dari *${tracking.senderName}*:\n\n` +
    `📍 *Status Terkini:* ${stageMeta.label}\n` +
    (latest ? `🗺️ *Lokasi / Catatan:* ${latest.location} — ${latest.detail}\n` : "") +
    `🧾 *Ekspedisi & Resi:* ${tracking.courierName} · \`${tracking.awbNumber}\`` +
    courierPersonBlock +
    `\n⏱️ *Estimasi Tiba:* ${tracking.etaLabel}` +
    codBlock +
    `\n\nJika ada pertanyaan atau butuh bantuan alamat, langsung balas pesan ini ya Kak. Terima kasih banyak sudah berbelanja bersama kami! 🙏`;

  const speechSummary = `Notifikasi pengiriman untuk ${tracking.customerName} sudah disiapkan. Status paket ${stageMeta.label} melalui ${tracking.courierName}, dikirim oleh ${tracking.senderName}${tracking.driverName ? ` dengan kurir ${tracking.driverName}` : ""}.`;

  const cleanPhone = (tracking.customerPhone || "").replace(/\D/g, "");
  const normalizedPhone = cleanPhone.startsWith("0")
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone.startsWith("62")
      ? cleanPhone
      : cleanPhone;

  const waDeepLink =
    normalizedPhone.length >= 10
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(whatsappText)}`
      : null;

  return {
    agentName: "Agen AI Pelacakan & Logistik COD",
    whatsappText,
    speechSummary,
    waDeepLink,
  };
}

function trackingStorageKey(tenantId: string): string {
  return `wacrm_cod_tracking_v5_${tenantId}`;
}

export function loadShipmentTrackings(
  tenantId: string,
  orders: PosOrderRecord[],
  defaultSenderName: string,
  defaultSenderPhone: string,
): Record<string, ShipmentTrackingRecord> {
  const existing: Record<string, ShipmentTrackingRecord> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(trackingStorageKey(tenantId));
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ShipmentTrackingRecord>;
        Object.assign(existing, parsed);
      }
    } catch {
      // ignore storage errors
    }
  }

  // Ensure every POS order has a synchronized tracking record
  for (const order of orders) {
    if (!existing[order.id]) {
      const isCod = order.paymentMethod === "cod";
      const risk = evaluateCodRisk({
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        totalAmountIdr: order.totalAmount,
        buyerConfirmed: order.orderStatus !== "draft",
      });
      const courier = order.shippingCourier || "J&T Express";
      const awb = order.trackingCode || generateAwbNumber(courier, order.invoiceNumber);
      const stage: CodTrackingStage =
        order.orderStatus === "completed"
          ? isCod && order.paymentStatus === "paid"
            ? "settled_to_merchant"
            : "delivered_paid"
          : order.orderStatus === "shipped"
            ? "out_for_delivery"
            : order.orderStatus === "packed"
              ? "packed"
              : isCod
                ? "awaiting_buyer_confirm"
                : "packed";

      const codFee = isCod ? calculateCodHandlingFee(order.totalAmount, 2.5) : 0;

      const checkpoints: ShipmentCheckpoint[] = [
        {
          id: `cp-${order.id}-1`,
          stage: "packed",
          title: "Pesanan Dikemas Penjual",
          location: defaultSenderName || "Gudang Utama Toko",
          detail: `Paket dicek kualitas & label QR ${isCod ? "COD" : "Lunas"} dicetak.`,
          timestamp: order.createdAt,
          aiNotifiedBuyer: true,
        },
      ];

      if (stage === "out_for_delivery" || stage === "delivered_paid" || stage === "settled_to_merchant") {
        checkpoints.push({
          id: `cp-${order.id}-2`,
          stage: "in_transit",
          title: `Transit di Sortation Hub ${courier}`,
          location: "Hub Distribusi Regional",
          detail: "Paket telah dipindai dan diberangkatkan menuju kota tujuan.",
          timestamp: order.updatedAt,
          aiNotifiedBuyer: true,
        });
        checkpoints.push({
          id: `cp-${order.id}-3`,
          stage: "out_for_delivery",
          title: "Sedang Diantar Kurir ke Alamat Pembeli",
          location: "Area Pengantaran Tujuan",
          detail: isCod
            ? "Kurir sedang menuju alamat tujuan (siapkan pembayaran COD)."
            : "Kurir sedang menuju alamat tujuan.",
          driverName: "Mas Dimas Prasetyo",
          driverPhone: "0812-8899-4411",
          timestamp: order.updatedAt,
          aiNotifiedBuyer: true,
        });
      }

      if (stage === "delivered_paid" || stage === "settled_to_merchant") {
        checkpoints.push({
          id: `cp-${order.id}-4`,
          stage,
          title:
            stage === "settled_to_merchant"
              ? "Terkirim & Dana COD Cair ke Toko"
              : "Paket Diterima oleh Pembeli",
          location: order.shippingAddress.slice(0, 48) || "Alamat Pembeli",
          detail: isCod
            ? "Pembeli menerima paket & melunasi tagihan COD ke kurir."
            : "Paket diterima dalam kondisi baik.",
          driverName: "Mas Dimas Prasetyo",
          timestamp: order.paidAt || order.updatedAt,
          aiNotifiedBuyer: true,
        });
      }

      existing[order.id] = {
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone || "",
        shippingAddress: order.shippingAddress,
        isCod,
        codCollectAmountIdr: isCod ? order.totalAmount + codFee : 0,
        codHandlingFeeIdr: codFee,
        codRiskScore: risk.score,
        codRiskLevel: risk.level,
        buyerCodConfirmed: !isCod || stage !== "awaiting_buyer_confirm",
        courierName: courier,
        awbNumber: awb,
        senderName: defaultSenderName || "Toko Utama WACRM",
        senderPhone: defaultSenderPhone || "",
        driverName:
          stage === "out_for_delivery" || stage === "delivered_paid" || stage === "settled_to_merchant"
            ? "Mas Dimas Prasetyo"
            : "",
        driverPhone:
          stage === "out_for_delivery" || stage === "delivered_paid" || stage === "settled_to_merchant"
            ? "0812-8899-4411"
            : "",
        currentStage: stage,
        etaLabel: "1–2 Hari Kerja",
        codSettledAt: stage === "settled_to_merchant" ? order.paidAt || order.updatedAt : null,
        checkpoints,
        updatedAt: order.updatedAt,
      };
    }
  }

  return existing;
}

export function saveShipmentTrackings(
  tenantId: string,
  map: Record<string, ShipmentTrackingRecord>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(trackingStorageKey(tenantId), JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export function appendTrackingCheckpoint(
  record: ShipmentTrackingRecord,
  input: {
    stage: CodTrackingStage;
    location: string;
    detail: string;
    senderName?: string;
    driverName?: string;
    driverPhone?: string;
    awbNumber?: string;
    courierName?: string;
    aiNotifiedBuyer?: boolean;
  },
): ShipmentTrackingRecord {
  const nowIso = new Date().toISOString();
  const stageMeta = COD_STAGE_META[input.stage];
  const cp: ShipmentCheckpoint = {
    id: `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    stage: input.stage,
    title: stageMeta.label,
    location: input.location.trim() || "Hub Pengiriman",
    detail: input.detail.trim() || stageMeta.label,
    driverName: input.driverName?.trim() || record.driverName || undefined,
    driverPhone: input.driverPhone?.trim() || record.driverPhone || undefined,
    timestamp: nowIso,
    aiNotifiedBuyer: input.aiNotifiedBuyer ?? true,
  };

  return {
    ...record,
    senderName: input.senderName?.trim() || record.senderName,
    driverName: input.driverName?.trim() ?? record.driverName,
    driverPhone: input.driverPhone?.trim() ?? record.driverPhone,
    awbNumber: input.awbNumber?.trim() || record.awbNumber,
    courierName: input.courierName?.trim() || record.courierName,
    currentStage: input.stage,
    buyerCodConfirmed:
      record.buyerCodConfirmed || input.stage !== "awaiting_buyer_confirm",
    codSettledAt:
      input.stage === "settled_to_merchant" ? nowIso : record.codSettledAt,
    checkpoints: [...record.checkpoints, cp],
    updatedAt: nowIso,
  };
}
