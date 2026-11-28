import { describe, expect, it } from "vitest";
import {
  evaluateTabAccess,
  getEditionMatrixCapabilities,
} from "@/lib/access-control";
import { editionHasFeature } from "@/lib/editions";
import {
  appendTrackingCheckpoint,
  buildAiShipmentNotification,
  calculateCodHandlingFee,
  evaluateCodRisk,
  loadShipmentTrackings,
} from "@/lib/cod-logistics";
import {
  buildAntiBasiFlashSaleCampaign,
  buildSeedFifoBatches,
  consumeStockFifo,
  encodeBatchQrPayload,
  evaluateExpiryHealth,
  parseScannedQrCode,
} from "@/lib/fifo-inventory";
import {
  buildSovereignBuyerInterestForecast,
  buildWinningProductRecommendations,
} from "@/lib/market-forecasting";
import { answerAppFaqWithMultiAgent } from "@/lib/community-faq";
import { buildPublisherIntelligenceReport } from "@/lib/publisher-intelligence";
import type {
  ConversationRecord,
  ErpProductRecord,
  PosOrderRecord,
} from "@/lib/crm-types";

const NOW_ISO = new Date().toISOString();

const SAMPLE_PRODUCTS: ErpProductRecord[] = [
  {
    id: "prd-1",
    sku: "KOPI-GAYO-250",
    name: "Kopi Arabika Gayo 250gr",
    category: "Kopi & Minuman",
    description: "Kopi specialty sangrai medium",
    unit: "pack",
    unitPrice: 85_000,
    costPrice: 45_000,
    stockQty: 42,
    minStock: 15,
    isActive: true,
    weightGrams: 250,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "prd-2",
    sku: "SERUM-GLOW-30",
    name: "Serum Vitamin C Glow 30ml",
    category: "Skincare & Kecantikan",
    description: "Serum pencerah wajah BPOM",
    unit: "botol",
    unitPrice: 135_000,
    costPrice: 62_000,
    stockQty: 28,
    minStock: 10,
    isActive: true,
    weightGrams: 120,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

const SAMPLE_ORDERS: PosOrderRecord[] = [
  {
    id: "ord-1",
    invoiceNumber: "INV-2026-001",
    conversationId: null,
    contactId: null,
    customerName: "Rina Wulandari",
    customerPhone: "081234567890",
    shippingAddress: "Jl. Brawijaya No. 18, Kecamatan Kota, Kediri, Jawa Timur",
    channel: "whatsapp",
    subtotal: 255_000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 273_000,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "packed",
    qrPayload: "WACRM|INV:INV-2026-001",
    aiGenerated: true,
    fraudRiskScore: 12,
    shippingCourier: "J&T Express",
    shippingService: "EZ COD",
    shippingCost: 18_000,
    shippingWeightKg: 0.75,
    notes: "Mohon telepon sebelum kurir sampai",
    items: [
      {
        id: "itm-1",
        productId: "prd-1",
        sku: "KOPI-GAYO-250",
        productName: "Kopi Arabika Gayo 250gr",
        quantity: 3,
        unitPrice: 85_000,
        costPrice: 45_000,
        lineTotal: 255_000,
      },
    ],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

const SAMPLE_CONVERSATIONS: ConversationRecord[] = [];

describe("WACRM v5.0 — Strict Tier Gating & Capabilities", () => {
  it("restricts QR Camera FIFO Scanner strictly to Growth Pro, Enterprise AI, and Sovereign Corporate", () => {
    expect(editionHasFeature("starter", "qr_camera_fifo_scanner")).toBe(false);
    expect(editionHasFeature("pro", "qr_camera_fifo_scanner")).toBe(true);
    expect(editionHasFeature("enterprise", "qr_camera_fifo_scanner")).toBe(true);
    expect(editionHasFeature("sovereign", "qr_camera_fifo_scanner")).toBe(true);

    expect(evaluateTabAccess("starter", "owner", "qr_scanner").allowed).toBe(false);
    expect(evaluateTabAccess("pro", "owner", "qr_scanner").allowed).toBe(true);
    expect(evaluateTabAccess("enterprise", "owner", "qr_scanner").allowed).toBe(true);
    expect(evaluateTabAccess("sovereign", "owner", "qr_scanner").allowed).toBe(true);
  });

  it("restricts Multi-Agent AI Product Recommender to Enterprise AI & Sovereign, and Buyer Forecasting exclusively to Sovereign", () => {
    expect(editionHasFeature("starter", "ai_product_recommender")).toBe(false);
    expect(editionHasFeature("pro", "ai_product_recommender")).toBe(false);
    expect(editionHasFeature("enterprise", "ai_product_recommender")).toBe(true);
    expect(editionHasFeature("sovereign", "ai_product_recommender")).toBe(true);

    expect(editionHasFeature("starter", "buyer_interest_forecast")).toBe(false);
    expect(editionHasFeature("pro", "buyer_interest_forecast")).toBe(false);
    expect(editionHasFeature("enterprise", "buyer_interest_forecast")).toBe(false);
    expect(editionHasFeature("sovereign", "buyer_interest_forecast")).toBe(true);

    expect(evaluateTabAccess("pro", "owner", "forecast").allowed).toBe(false);
    expect(evaluateTabAccess("enterprise", "owner", "forecast").allowed).toBe(true);
    expect(evaluateTabAccess("sovereign", "owner", "forecast").allowed).toBe(true);

    expect(getEditionMatrixCapabilities("starter").qrCameraFifoScanner).toBe(false);
    expect(getEditionMatrixCapabilities("pro").qrCameraFifoScanner).toBe(true);
    expect(getEditionMatrixCapabilities("enterprise").aiProductRecommender).toBe(true);
    expect(getEditionMatrixCapabilities("enterprise").buyerInterestForecast).toBe(false);
    expect(getEditionMatrixCapabilities("sovereign").buyerInterestForecast).toBe(true);
  });
});

describe("WACRM v5.0 — Marketplace COD Tracking & Multi-Agent AI Notifications", () => {
  it("computes COD fee, evaluates RTS risk, progresses status, and builds buyer AI notification with sender & driver name", () => {
    const fee = calculateCodHandlingFee(273_000, 2.5);
    expect(fee).toBeGreaterThanOrEqual(2_500);

    const lowRisk = evaluateCodRisk({
      totalAmountIdr: 273_000,
      customerPhone: "081234567890",
      shippingAddress: "Jl. Brawijaya No. 18, Kecamatan Kota, Kediri, Jawa Timur",
      buyerConfirmed: true,
    });
    expect(lowRisk.level).toBe("AMAN");

    const highRisk = evaluateCodRisk({
      totalAmountIdr: 2_500_000,
      customerPhone: "0812",
      shippingAddress: "Kediri",
      buyerConfirmed: false,
      priorReturnedCount: 2,
    });
    expect(highRisk.level).toBe("TINGGI");

    const trackingMap = loadShipmentTrackings(
      "tenant-test",
      SAMPLE_ORDERS,
      "Kedai Kopi Nusantara",
      "081234567800",
    );
    const initial = trackingMap["ord-1"];
    expect(initial).toBeDefined();
    expect(initial.isCod).toBe(true);
    expect(initial.senderName).toBe("Kedai Kopi Nusantara");

    const updated = appendTrackingCheckpoint(initial, {
      stage: "out_for_delivery",
      location: "Hub Kediri Kota",
      detail: "Kurir sedang menuju alamat penerima",
      senderName: "Budi Gudang - Kedai Kopi",
      driverName: "Mas Wahyu Kurir",
      driverPhone: "081399998888",
    });
    expect(updated.currentStage).toBe("out_for_delivery");
    expect(updated.driverName).toBe("Mas Wahyu Kurir");
    expect(updated.checkpoints.length).toBe(initial.checkpoints.length + 1);

    const notif = buildAiShipmentNotification({ tracking: updated });
    expect(notif.whatsappText).toContain("Mas Wahyu Kurir");
    expect(notif.whatsappText).toContain("Budi Gudang - Kedai Kopi");
    expect(notif.whatsappText).toContain(updated.awbNumber);
    expect(notif.whatsappText).toContain("Rina Wulandari");
    expect(notif.waDeepLink).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  });
});

describe("WACRM v5.0 — Rear Camera QR Scanner & FIFO Anti-Basi Engine", () => {
  it("parses structured QR payloads and dispatches earliest-expiring (FIFO/FEFO) batch first", () => {
    const encoded = encodeBatchQrPayload({
      sku: "KOPI-GAYO-250",
      batchCode: "BCH-001",
      expiryDate: "2026-12-10",
    });
    const parsed = parseScannedQrCode(encoded);
    expect(parsed.kind).toBe("batch_item");
    expect(parsed.sku).toBe("KOPI-GAYO-250");
    expect(parsed.batchCode).toBe("BCH-001");
    expect(parsed.expiryDate).toBe("2026-12-10");

    const seeded = buildSeedFifoBatches(SAMPLE_PRODUCTS);
    expect(seeded.length).toBeGreaterThanOrEqual(4);

    const kopiBatches = seeded.filter((b) => b.sku === "KOPI-GAYO-250");
    const earliest = [...kopiBatches].sort((a, b) =>
      (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"),
    )[0];

    const result = consumeStockFifo(seeded, "KOPI-GAYO-250", 2);
    expect(result.allocations[0]?.batchCode).toBe(earliest.batchCode);
    expect(result.shortfallQty).toBe(0);

    const health = evaluateExpiryHealth(earliest.expiryDate);
    expect(["expired", "critical_7d", "warning_30d", "healthy", "no_expiry"]).toContain(
      health.status,
    );

    const flash = buildAntiBasiFlashSaleCampaign(earliest, "Kedai Kopi Nusantara");
    expect(flash.recommendedDiscountPct).toBeGreaterThanOrEqual(15);
    expect(flash.whatsappCopy).toContain("Kedai Kopi Nusantara");
  });
});

describe("WACRM v5.0 — Multi-Agent AI Product Recommendations & Sovereign Forecasting", () => {
  it("recommends winning catalog products and generates 30/60/90d Sovereign demand forecast", () => {
    const recs = buildWinningProductRecommendations({
      products: SAMPLE_PRODUCTS,
      orders: SAMPLE_ORDERS,
      conversations: SAMPLE_CONVERSATIONS,
      storeName: "Kedai Kopi Nusantara",
    });
    expect(recs.topCatalogWinners.length).toBe(SAMPLE_PRODUCTS.length);
    expect(recs.newMarketWinners.length).toBeGreaterThanOrEqual(3);
    expect(recs.topCatalogWinners[0].opportunityScore).toBeGreaterThan(0);

    const forecast = buildSovereignBuyerInterestForecast({
      products: SAMPLE_PRODUCTS,
      orders: SAMPLE_ORDERS,
      storeName: "Kedai Kopi Nusantara",
      horizonDays: 90,
    });
    expect(forecast.forecastSeries.length).toBeGreaterThanOrEqual(4);
    for (const pt of forecast.forecastSeries) {
      expect(pt.optimisticGmvIdr).toBeGreaterThanOrEqual(pt.baseGmvIdr);
      expect(pt.baseGmvIdr).toBeGreaterThanOrEqual(pt.conservativeGmvIdr);
    }
    expect(forecast.buyerSegments.length).toBeGreaterThanOrEqual(3);
    expect(forecast.restockPriorityQueue.length).toBeGreaterThan(0);
  });
});

describe("WACRM v5.0 — Publisher HQ Forecasting & Multi-Agent FAQ", () => {
  it("includes 12-month SaaS MRR/ARR forecasting & tier funnel in Publisher Intelligence Report", async () => {
    const report = await buildPublisherIntelligenceReport();
    expect(report.forecasting.currentMrrIdr).toBeGreaterThan(0);
    expect(report.forecasting.mrrTrajectory).toHaveLength(12);
    expect(report.forecasting.tierUpgradeFunnel.length).toBe(3);
    expect(report.forecasting.categoryDemandForecast90d.length).toBeGreaterThan(0);
    expect(report.forecasting.executiveSignals.length).toBeGreaterThanOrEqual(3);
  });

  it("answers v5.0 biometric, COD tracking, QR FIFO, and Sovereign forecasting questions in FAQ", () => {
    const bio = answerAppFaqWithMultiAgent({
      question: "Cara login sidik jari dan Face ID di HP?",
      editionId: "starter",
    });
    expect(bio.answer).toMatch(/Biometrik|Sidik Jari/i);

    const cod = answerAppFaqWithMultiAgent({
      question: "Apakah ada COD dan lacak pengiriman kurir?",
      editionId: "pro",
    });
    expect(cod.answer).toMatch(/COD/i);

    const qr = answerAppFaqWithMultiAgent({
      question: "Bagaimana pakai kamera belakang QR scanner FIFO?",
      editionId: "pro",
    });
    expect(qr.answer).toMatch(/FIFO/i);

    const fc = answerAppFaqWithMultiAgent({
      question: "Menu tren minat pembeli dan forecasting di edisi mana?",
      editionId: "sovereign",
    });
    expect(fc.answer).toMatch(/Sovereign/i);
  });
});
