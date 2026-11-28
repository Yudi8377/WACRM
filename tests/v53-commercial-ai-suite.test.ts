import { describe, expect, it } from "vitest";
import {
  evaluateTabAccess,
  getEditionMatrixCapabilities,
} from "@/lib/access-control";
import { editionHasFeature } from "@/lib/editions";
import {
  buildMonthlyPayrollSummary,
  computeWeightedKpiScore,
  getDefaultHrdState,
  renderHrdAttendancePrintHtml,
  renderHrdEmployeesPrintHtml,
  renderHrdKpiPrintHtml,
  renderHrdLeavesPrintHtml,
  renderPayslipPrintHtml,
  renderSptPph21RegisterPrintHtml,
} from "@/lib/hrd-payroll";
import {
  buildSmartAutoBundlePlan,
  buildWinningProductRecommendations,
  getDefaultAutonomousMarketBrain,
  runAutonomousKnowledgeUpgrade,
} from "@/lib/market-forecasting";
import {
  buildEnterpriseMarketingBlueprint,
  getDefaultMarketingInitiatives,
  renderMarketingStrategyPrintHtml,
} from "@/lib/enterprise-marketing-strategy";
import type {
  ContactRecord,
  ConversationRecord,
  ErpProductRecord,
  FinancialReportSummary,
  PosOrderRecord,
  StoreBusinessProfile,
} from "@/lib/crm-types";

const SAMPLE_STORE: StoreBusinessProfile = {
  businessName: "Toko Berkah Nusantara",
  businessTagline: "Kopi Specialty, Herbal & Kebutuhan Keluarga",
  address: "Jl. Raya Darmo No. 88, Surabaya",
  phone: "081234567890",
  email: "owner@tokoberkah.id",
  city: "Surabaya",
  taxId: "01.234.567.8-901.000",
  invoiceFooter: "Terima kasih atas kepercayaan Anda!",
  defaultCourier: "JNE REG",
};

const SAMPLE_PRODUCTS: ErpProductRecord[] = [
  {
    id: "p1",
    sku: "KOP-ARA-250",
    name: "Kopi Arabika Gayo Premium 250gr",
    category: "Kopi & Minuman",
    description: "Kopi arabika single origin Gayo fresh roast",
    unitPrice: 95_000,
    costPrice: 52_000,
    stockQty: 42,
    minStock: 10,
    unit: "pack",
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  },
  {
    id: "p2",
    sku: "MAD-HUT-500",
    name: "Madu Hutan Murni Flores 500ml",
    category: "Herbal & Kesehatan",
    description: "Madu hutan murni alami tanpa campuran",
    unitPrice: 145_000,
    costPrice: 80_000,
    stockQty: 95,
    minStock: 12,
    unit: "botol",
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  },
  {
    id: "p3",
    sku: "SMB-ROA-200",
    name: "Sambal Roa Manado Extra Pedas 200gr",
    category: "Kuliner & Sambal",
    description: "Sambal ikan roa asap khas Manado",
    unitPrice: 58_000,
    costPrice: 31_000,
    stockQty: 8,
    minStock: 15,
    unit: "jar",
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  },
  {
    id: "p4",
    sku: "SER-VITC-30",
    name: "Serum Vitamin C Glow Brightening 30ml",
    category: "Skincare & Kecantikan",
    description: "Serum pencerah harian vitamin C BPOM",
    unitPrice: 125_000,
    costPrice: 58_000,
    stockQty: 64,
    minStock: 10,
    unit: "botol",
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  },
  {
    id: "p5",
    sku: "TUM-VAC-750",
    name: "Tumbler Vacuum Stainless 750ml",
    category: "Perlengkapan Rumah & Lifestyle",
    description: "Tumbler tahan panas & dingin 12 jam",
    unitPrice: 165_000,
    costPrice: 92_000,
    stockQty: 72,
    minStock: 8,
    unit: "pcs",
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  },
  {
    id: "p6",
    sku: "TEH-HJU-100",
    name: "Teh Hijau Matcha Organik 100gr",
    category: "Kopi & Minuman",
    description: "Matcha ceremonial grade organik",
    unitPrice: 82_000,
    costPrice: 44_000,
    stockQty: 55,
    minStock: 10,
    unit: "pack",
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  },
];

const SAMPLE_ORDERS: PosOrderRecord[] = [
  {
    id: "o1",
    invoiceNumber: "INV-2026-001",
    conversationId: null,
    contactId: "ct1",
    customerName: "Rina Kartika",
    customerPhone: "0812111222",
    shippingAddress: "Jl. Darmo 10, Surabaya",
    channel: "whatsapp",
    paymentMethod: "qris",
    paymentStatus: "paid",
    orderStatus: "completed",
    subtotal: 475_000,
    taxAmount: 52_250,
    discountAmount: 0,
    totalAmount: 527_250,
    qrPayload: "WACRM|INV-2026-001|527250",
    aiGenerated: false,
    fraudRiskScore: 5,
    notes: null,
    items: [
      {
        id: "oi-1",
        productId: "p1",
        sku: "KOP-ARA-250",
        productName: "Kopi Arabika Gayo Premium 250gr",
        quantity: 5,
        unitPrice: 95_000,
        costPrice: 52_000,
        lineTotal: 475_000,
      },
    ],
    createdAt: "2026-11-22T09:00:00.000Z",
    updatedAt: "2026-11-22T09:00:00.000Z",
  },
  {
    id: "o2",
    invoiceNumber: "INV-2026-002",
    conversationId: null,
    contactId: "ct1",
    customerName: "Dedi Pratama",
    customerPhone: "0812333444",
    shippingAddress: "Jl. Pemuda 22, Surabaya",
    channel: "whatsapp",
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "shipped",
    subtotal: 290_000,
    taxAmount: 31_900,
    discountAmount: 0,
    totalAmount: 321_900,
    qrPayload: "WACRM|INV-2026-002|321900",
    aiGenerated: false,
    fraudRiskScore: 5,
    notes: null,
    items: [
      {
        id: "oi-2",
        productId: "p3",
        sku: "SMB-ROA-200",
        productName: "Sambal Roa Manado Extra Pedas 200gr",
        quantity: 5,
        unitPrice: 58_000,
        costPrice: 31_000,
        lineTotal: 290_000,
      },
    ],
    createdAt: "2026-11-24T14:00:00.000Z",
    updatedAt: "2026-11-24T14:00:00.000Z",
  },
];

const SAMPLE_CONVERSATIONS: ConversationRecord[] = [
  {
    id: "c1",
    connectionId: "conn-1",
    contactId: "ct1",
    contactName: "Sari Dewi",
    contactPhone: "+62812999888",
    channel: "whatsapp",
    channelDisplayName: "WA Utama",
    externalConversationId: "wa-ext-1",
    status: "open",
    priority: "high",
    subject: "Tanya paket bundling COD",
    tags: ["bundling", "cod"],
    unreadCount: 2,
    assignedUserId: null,
    assignedUserName: "AI CS",
    lastMessageText: "Kak ada paket bundling kopi arabika sama madu hutan bisa COD?",
    lastMessageAt: "2026-11-25T10:00:00.000Z",
    createdAt: "2026-11-25T09:00:00.000Z",
    updatedAt: "2026-11-25T10:00:00.000Z",
  },
];

const SAMPLE_CONTACTS: ContactRecord[] = [
  {
    id: "ct1",
    displayName: "Sari Dewi",
    phoneE164: "+62812999888",
    email: "sari@example.com",
    company: "Kafe Senja",
    tags: ["VIP", "Repeat Buyer"],
    notes: "Suka pesan rutin kopi arabika",
    lifecycleStage: "customer",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-11-25T00:00:00.000Z",
  },
];

const SAMPLE_REPORT: FinancialReportSummary = {
  totalRevenue: 48_500_000,
  totalCogs: 26_200_000,
  grossProfit: 22_300_000,
  totalExpenses: 8_400_000,
  netProfit: 13_900_000,
  profitMarginPct: 28.66,
  totalAssets: 58_350_000,
  totalLiabilities: 3_200_000,
  totalEquity: 55_150_000,
  cashBalance: 32_100_000,
  receivablesBalance: 4_850_000,
  inventoryValue: 21_400_000,
  totalDebits: 85_000_000,
  totalCredits: 85_000_000,
  isBalanced: true,
};

describe("v5.3 Commercial & Sovereign AI Suite", () => {
  it("Point 1: HRD & Payroll handles adjustments, weighted KPI 40/20/20/20 & all 6 print HTML renderers", () => {
    const baseState = getDefaultHrdState();
    const weighted = computeWeightedKpiScore({
      targetOutputScore: 95,
      disciplineScore: 90,
      qualityScore: 85,
      collaborationScore: 80,
    });
    expect(weighted).toBe(Math.round(95 * 0.4 + 90 * 0.2 + 85 * 0.2 + 80 * 0.2));

    const stateWithDeduction = {
      ...baseState,
      adjustments: [
        ...baseState.adjustments,
        {
          id: "adj-ded-1",
          employeeId: "emp-2",
          type: "deduction" as const,
          category: "Kasbon / Pinjaman" as const,
          amountIdr: 200_000,
          notes: "Cicilan kasbon bulan berjalan",
          createdAt: "2026-11-26",
        },
      ],
    };

    const summary = buildMonthlyPayrollSummary(stateWithDeduction, "November 2026");
    const emp2Line = summary.lines.find((l) => l.employee.id === "emp-2");
    expect(emp2Line).toBeDefined();
    expect(emp2Line!.extraEarningsIdr).toBe(350_000);
    expect(emp2Line!.extraDeductionsIdr).toBe(200_000);
    expect(emp2Line!.netTakeHomePayIdr).toBe(
      emp2Line!.grossIncomeIdr - emp2Line!.totalDeductionsIdr,
    );

    const payslipHtml = renderPayslipPrintHtml(emp2Line!, SAMPLE_STORE);
    expect(payslipHtml).toContain("Tunjangan / Insentif Tambahan");
    expect(payslipHtml).toContain("Potongan Kasbon / Penyesuaian Lain");

    expect(renderSptPph21RegisterPrintHtml(summary, SAMPLE_STORE)).toContain("SPT Masa PPh Pasal 21");
    expect(renderHrdEmployeesPrintHtml(baseState.employees, SAMPLE_STORE)).toContain("Database Induk Karyawan");
    expect(renderHrdAttendancePrintHtml(baseState.attendance, baseState.employees, SAMPLE_STORE)).toContain("Laporan Rekap Absensi");
    expect(renderHrdLeavesPrintHtml(baseState.leaveRequests, baseState.employees, SAMPLE_STORE)).toContain("Laporan Pengajuan Cuti");
    expect(renderHrdKpiPrintHtml(baseState.kpiEvaluations, baseState.employees, SAMPLE_STORE)).toContain("Laporan Evaluasi KPI Multi-Dimensi");
  });

  it("Point 2: Autonomous AI recommendations are 100% unique per product & brain upgrades autonomously", () => {
    const initialBrain = getDefaultAutonomousMarketBrain();
    const upgradedBrain = runAutonomousKnowledgeUpgrade({
      currentBrain: initialBrain,
      products: SAMPLE_PRODUCTS,
      orders: SAMPLE_ORDERS,
      conversations: SAMPLE_CONVERSATIONS,
      newUserSignal: "Permintaan hampers akhir tahun & COD 1 ongkir naik tajam di Surabaya",
    });

    expect(upgradedBrain.generation).toBe(initialBrain.generation + 1);
    expect(upgradedBrain.learnedPatterns.length).toBeGreaterThan(initialBrain.learnedPatterns.length);
    expect(upgradedBrain.learnedPatterns.some((p) => p.source === "user_feedback")).toBe(true);

    const report = buildWinningProductRecommendations({
      products: SAMPLE_PRODUCTS,
      orders: SAMPLE_ORDERS,
      conversations: SAMPLE_CONVERSATIONS,
      storeName: SAMPLE_STORE.businessName,
      brain: upgradedBrain,
    });

    expect(report.topCatalogWinners.length).toBe(SAMPLE_PRODUCTS.length);
    const actions = report.topCatalogWinners.map((w) => w.recommendedAction);
    const uniqueActions = new Set(actions);
    // ZERO duplicate or generic actions across all catalog products!
    expect(uniqueActions.size).toBe(actions.length);
    for (const w of report.topCatalogWinners) {
      expect(w.recommendedAction).not.toContain(
        "Jadikan produk hero di Studio SEO AI & tawarkan cross-sell otomatis saat checkout.",
      );
      expect((w.tacticalSteps ?? []).length).toBeGreaterThanOrEqual(3);
      expect((w.promoCopyHook ?? "").length).toBeGreaterThan(20);
      expect((w.knowledgeTag ?? "").length).toBeGreaterThan(3);
    }
  });

  it("Point 3: Auto-bundling 3-in-1 builds 1 hero + 2 overstock companion SKU plan ready for user approval", () => {
    const bundlePlan = buildSmartAutoBundlePlan({
      products: SAMPLE_PRODUCTS,
      orders: SAMPLE_ORDERS,
      storeName: SAMPLE_STORE.businessName,
      discountPct: 12,
    });

    expect(bundlePlan).not.toBeNull();
    expect(bundlePlan!.heroProduct.sku).toBe("KOP-ARA-250");
    expect(bundlePlan!.companionProducts.length).toBe(2);
    expect(bundlePlan!.companionProducts.every((p) => p.id !== bundlePlan!.heroProduct.id)).toBe(true);
    expect(bundlePlan!.bundleSellPriceIdr).toBeLessThan(bundlePlan!.normalTotalPriceIdr);
    expect(bundlePlan!.projectedProfitPerBundleIdr).toBeGreaterThan(0);
    expect(bundlePlan!.projectedMarginPct).toBeGreaterThan(0);
    expect(bundlePlan!.suggestedSku).toMatch(/^BND-/);
    expect(bundlePlan!.automationSteps.length).toBeGreaterThanOrEqual(3);
    expect(bundlePlan!.whatsappBroadcastCopy).toContain(bundlePlan!.heroProduct.name);

    const rec = buildWinningProductRecommendations({
      products: SAMPLE_PRODUCTS,
      orders: SAMPLE_ORDERS,
      conversations: SAMPLE_CONVERSATIONS,
      storeName: SAMPLE_STORE.businessName,
    });
    const bundleOpp = rec.newMarketWinners.find(
      (n) => n.autoExecutionSpec?.actionType === "auto_bundle_3in1",
    );
    expect(bundleOpp).toBeDefined();
    expect(bundleOpp!.recommendedAction).toContain("Gabungkan 1 produk terlaris + 2 produk pendamping");
  });

  it("Point 4: Strict 4-edition commercial differentiation restricts Enterprise accounting vs Sovereign Corporate", () => {
    // Starter UMKM: operational core only
    expect(editionHasFeature("starter", "erp_warehouse")).toBe(true);
    expect(editionHasFeature("starter", "zero_click_ai")).toBe(false);
    expect(editionHasFeature("starter", "double_entry_accounting")).toBe(false);

    // Growth Pro: unlocks Zero-Click AI, QR FIFO, SEO, White-Label; still no Accounting or AI Recommender
    expect(editionHasFeature("pro", "zero_click_ai")).toBe(true);
    expect(editionHasFeature("pro", "qr_camera_fifo_scanner")).toBe(true);
    expect(editionHasFeature("pro", "seo_growth_ai")).toBe(true);
    expect(editionHasFeature("pro", "double_entry_accounting")).toBe(false);
    expect(editionHasFeature("pro", "ai_product_recommender")).toBe(false);

    // Enterprise AI Suite: Operational Accounting & 9 AI Agents ONLY — ALL Sovereign corporate suites strictly locked!
    const entCaps = getEditionMatrixCapabilities("enterprise");
    expect(entCaps.doubleEntryAccounting).toBe(true);
    expect(entCaps.aiProductRecommender).toBe(true);
    expect(entCaps.voiceCompanion247).toBe(true);
    expect(entCaps.sovereignCorporateAccounting).toBe(false);
    expect(entCaps.sovereignCorporateErp).toBe(false);
    expect(entCaps.sovereignCorporateCrmPosSeo).toBe(false);
    expect(entCaps.hrdPayrollCorporate).toBe(false);
    expect(entCaps.buyerInterestForecast).toBe(false);
    expect(entCaps.enterpriseMarketingStrategy).toBe(false);

    // Sovereign Corporate: Unlocks EVERYTHING
    const sovCaps = getEditionMatrixCapabilities("sovereign");
    expect(sovCaps.sovereignCorporateAccounting).toBe(true);
    expect(sovCaps.sovereignCorporateErp).toBe(true);
    expect(sovCaps.sovereignCorporateCrmPosSeo).toBe(true);
    expect(sovCaps.hrdPayrollCorporate).toBe(true);
    expect(sovCaps.buyerInterestForecast).toBe(true);
    expect(sovCaps.enterpriseMarketingStrategy).toBe(true);

    // Tab gating for Enterprise Marketing Strategy is Sovereign-exclusive
    const entAccess = evaluateTabAccess("enterprise", "owner", "marketing_strategy");
    expect(entAccess.allowed).toBe(false);
    expect(entAccess.requiredEditionId).toBe("sovereign");

    const sovAccess = evaluateTabAccess("sovereign", "owner", "marketing_strategy");
    expect(sovAccess.allowed).toBe(true);
  });

  it("Point 5: Sovereign Enterprise Marketing Strategy orchestrates 5 AI agents, ROAS forecast, 90d roadmap & PDF blueprint", () => {
    const bp = buildEnterpriseMarketingBlueprint({
      storeProfile: SAMPLE_STORE,
      products: SAMPLE_PRODUCTS,
      orders: SAMPLE_ORDERS,
      contacts: SAMPLE_CONTACTS,
      conversations: SAMPLE_CONVERSATIONS,
      report: SAMPLE_REPORT,
      monthlyBudgetIdr: 6_000_000,
      targetGrowthPct: 50,
      strategicFocus: "Ekspansi Nasional Bundling & Kemitraan Kafe B2B",
    });

    expect(bp.agentPipeline.length).toBe(5);
    expect(bp.swot.strengths.length).toBeGreaterThanOrEqual(2);
    expect(bp.personas.length).toBe(4);
    expect(bp.personas.reduce((s, p) => s + p.segmentSharePct, 0)).toBe(100);
    expect(bp.forecast.channelAllocations.reduce((s, c) => s + c.sharePct, 0)).toBe(100);
    expect(bp.forecast.projected30dRevenueIdr).toBeLessThan(bp.forecast.projected60dRevenueIdr);
    expect(bp.forecast.projected60dRevenueIdr).toBeLessThan(bp.forecast.projected90dRevenueIdr);
    expect(bp.forecast.blendedRoas).toBeGreaterThan(bp.forecast.breakEvenRoas);
    expect(bp.roadmap90Days.length).toBe(3);
    expect(bp.campaignScripts.length).toBe(4);

    const initiatives = getDefaultMarketingInitiatives(bp);
    const html = renderMarketingStrategyPrintHtml(bp, initiatives);
    expect(html).toContain("BLUEPRINT STRATEGI PEMASARAN ENTERPRISE");
    expect(html).toContain(SAMPLE_STORE.businessName);
    expect(html).toContain("WhatsApp CRM Retention");
  });
});
