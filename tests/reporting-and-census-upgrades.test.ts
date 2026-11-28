import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ContactRecord,
  ConversationRecord,
  ErpProductRecord,
  FinancialReportSummary,
  PosOrderRecord,
  StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  buildEconomicCensusExportSheets,
  buildEconomicCensusMarketReport,
  renderEconomicCensusMarketPrintHtml,
} from "@/lib/economic-census-report";
import {
  buildCorporateFinancialStatements,
  computeEnterpriseTaxAndRatios,
  renderContextualAccountingPrintHtml,
} from "@/lib/sovereign-corporate";

const sampleStore: StoreBusinessProfile = {
  businessName: "CV Nusantara Herbal Mandiri",
  businessTagline: "Herbal & Wellness UMKM Indonesia",
  phone: "0812-3456-7890",
  email: "owner@nusantaraherbal.id",
  address: "Jl. Dhoho No. 88, Kediri",
  city: "Kediri",
  taxId: "09.123.456.7-622.000",
  invoiceFooter: "Terima kasih telah berbelanja!",
  defaultCourier: "J&T Express",
};

const sampleProducts: ErpProductRecord[] = [
  {
    id: "prod-1",
    sku: "HRB-MADU-500",
    name: "Madu Hutan Asli 500ml",
    category: "Herbal & Madu",
    unit: "botol",
    unitPrice: 125_000,
    costPrice: 68_000,
    stockQty: 65,
    minStock: 15,
    description: "Madu hutan murni",
    isActive: true,
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-20T08:00:00.000Z",
  },
  {
    id: "prod-2",
    sku: "HRB-JAHE-250",
    name: "Wedang Jahe Merah Instan 250g",
    category: "Minuman Kesehatan",
    unit: "pack",
    unitPrice: 55_000,
    costPrice: 28_000,
    stockQty: 110,
    minStock: 20,
    description: "Jahe merah alami",
    isActive: true,
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-20T08:00:00.000Z",
  },
];

const sampleOrders: PosOrderRecord[] = [
  {
    id: "ord-1",
    invoiceNumber: "INV-2026-1001",
    conversationId: "conv-1",
    contactId: "ct-1",
    customerName: "Budi Santoso",
    customerPhone: "628123456001",
    shippingAddress: "Surabaya",
    channel: "whatsapp",
    subtotal: 250_000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 250_000,
    paymentMethod: "qris",
    paymentStatus: "paid",
    orderStatus: "completed",
    qrPayload: "QRIS-INV-1001",
    aiGenerated: false,
    fraudRiskScore: 5,
    shippingCourier: "J&T",
    trackingCode: "JT001",
    notes: "",
    items: [
      {
        id: "it-1",
        productId: "prod-1",
        sku: "HRB-MADU-500",
        productName: "Madu Hutan Asli 500ml",
        quantity: 2,
        unitPrice: 125_000,
        costPrice: 68_000,
        lineTotal: 250_000,
      },
    ],
    createdAt: "2026-11-18T10:00:00.000Z",
    updatedAt: "2026-11-18T12:00:00.000Z",
  },
  {
    id: "ord-2",
    invoiceNumber: "INV-2026-1002-COD",
    conversationId: "conv-2",
    contactId: "ct-2",
    customerName: "Siti Rahayu",
    customerPhone: "628123456002",
    shippingAddress: "Malang",
    channel: "whatsapp",
    subtotal: 165_000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 165_000,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "shipped",
    qrPayload: "COD-INV-1002",
    aiGenerated: false,
    fraudRiskScore: 12,
    shippingCourier: "SiCepat",
    trackingCode: "SC002",
    notes: "COD belum lunas",
    items: [
      {
        id: "it-2",
        productId: "prod-2",
        sku: "HRB-JAHE-250",
        productName: "Wedang Jahe Merah Instan 250g",
        quantity: 3,
        unitPrice: 55_000,
        costPrice: 28_000,
        lineTotal: 165_000,
      },
    ],
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-10T12:00:00.000Z",
  },
];

const sampleContacts: ContactRecord[] = [
  {
    id: "ct-1",
    displayName: "Budi Santoso",
    phoneE164: "+628123456001",
    email: "budi@example.com",
    company: null,
    lifecycleStage: "vip",
    tags: ["VIP"],
    notes: null,
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-18T08:00:00.000Z",
  },
];

const sampleConversations: ConversationRecord[] = [
  {
    id: "conv-1",
    connectionId: "conn-1",
    contactId: "ct-1",
    contactName: "Budi Santoso",
    contactPhone: "+628123456001",
    channel: "whatsapp",
    channelDisplayName: "WhatsApp Official",
    externalConversationId: "ext-1",
    status: "open",
    priority: "normal",
    subject: "Order Madu Hutan",
    tags: ["order"],
    unreadCount: 0,
    assignedUserId: null,
    lastMessageText: "Kak madu hutan ready stok 2 botol?",
    lastMessageAt: "2026-11-18T10:00:00.000Z",
    createdAt: "2026-11-18T09:50:00.000Z",
    updatedAt: "2026-11-18T10:00:00.000Z",
  },
];

const sampleFinancialSummary: FinancialReportSummary = {
  totalRevenue: 415_000,
  totalCogs: 220_000,
  grossProfit: 195_000,
  totalExpenses: 45_000,
  netProfit: 150_000,
  profitMarginPct: 36.1,
  totalAssets: 32_500_000,
  totalLiabilities: 1_200_000,
  totalEquity: 31_300_000,
  totalDebits: 32_500_000,
  totalCredits: 32_500_000,
  isBalanced: true,
  cashBalance: 12_000_000,
  inventoryValue: 7_500_000,
  receivablesBalance: 165_000,
};

describe("Context-Aware PSAK Accounting Printing (5 Dedicated Menus + Bundle)", () => {
  const corp = buildCorporateFinancialStatements({
    summary: sampleFinancialSummary,
    orders: sampleOrders,
    products: sampleProducts,
    entries: [],
  });
  const tax = computeEnterpriseTaxAndRatios(corp, {
    pph21PayrollIdr: 450_000,
    rentExpenseForPph42Idr: 2_500_000,
  });

  it("prints ONLY Laba Rugi & Neraca when context is 'statements'", () => {
    const html = renderContextualAccountingPrintHtml({
      context: "statements",
      report: corp,
      tax,
      businessName: sampleStore.businessName,
      orders: sampleOrders,
    });
    expect(html).toContain("LAPORAN LABA RUGI &amp; NERACA POSISI KEUANGAN (PSAK)");
    expect(html).toContain("Menu: Laba Rugi &amp; Neraca");
    expect(html).toContain("Laporan Laba Rugi Komprehensif");
    expect(html).toContain("Laporan Posisi Keuangan / Neraca");
    expect(html).not.toContain("LAPORAN UMUR PIUTANG USAHA &amp; COD");
    expect(html).not.toContain("DAFTAR AKUN (COA 4-DIGIT) &amp; NERACA SALDO");
  });

  it("prints ONLY COA 4-Digit & Trial Balance when context is 'trial_balance'", () => {
    const html = renderContextualAccountingPrintHtml({
      context: "trial_balance",
      report: corp,
      tax,
      businessName: sampleStore.businessName,
      orders: sampleOrders,
    });
    expect(html).toContain("DAFTAR AKUN (COA 4-DIGIT) &amp; NERACA SALDO (TRIAL BALANCE)");
    expect(html).toContain("Menu: COA &amp; Neraca Saldo");
    expect(html).toContain("Rekapitulasi Saldo Per Klasifikasi Akun PSAK");
    expect(html).not.toContain("LAPORAN UMUR PIUTANG USAHA &amp; COD");
  });

  it("prints ONLY Cash Flow & Monthly Tax Summary when context is 'cashflow_tax'", () => {
    const html = renderContextualAccountingPrintHtml({
      context: "cashflow_tax",
      report: corp,
      tax,
      businessName: sampleStore.businessName,
      orders: sampleOrders,
    });
    expect(html).toContain("LAPORAN ARUS KAS (PSAK 2) &amp; RINGKASAN PAJAK MASA");
    expect(html).toContain("Menu: Arus Kas &amp; Ringkasan Pajak");
    expect(html).toContain("411211 / 100");
    expect(html).toContain("411128 / 420");
    expect(html).not.toContain("LAPORAN UMUR PIUTANG USAHA &amp; COD");
  });

  it("prints ONLY Full SPT Tax & Executive Financial Ratios when context is 'tax_ratios'", () => {
    const html = renderContextualAccountingPrintHtml({
      context: "tax_ratios",
      report: corp,
      tax,
      businessName: sampleStore.businessName,
      orders: sampleOrders,
    });
    expect(html).toContain("IKHTISAR SPT PAJAK INDONESIA, PERUBAHAN EKUITAS &amp; RASIO EKSEKUTIF");
    expect(html).toContain("Menu: SPT Pajak Lengkap &amp; Rasio");
    expect(html).toContain("SPT Masa 1111");
    expect(html).toContain("Current Ratio");
    expect(html).not.toContain("DAFTAR AKUN (COA 4-DIGIT) &amp; NERACA SALDO");
  });

  it("prints ONLY AR Aging Schedule with unpaid COD invoice details when context is 'ar_aging'", () => {
    const html = renderContextualAccountingPrintHtml({
      context: "ar_aging",
      report: corp,
      tax,
      businessName: sampleStore.businessName,
      orders: sampleOrders,
    });
    expect(html).toContain("LAPORAN UMUR PIUTANG USAHA &amp; COD (AR AGING SCHEDULE)");
    expect(html).toContain("Menu: Aging Piutang COD");
    expect(html).toContain("INV-2026-1002-COD");
    expect(html).toContain("Siti Rahayu");
    expect(html).not.toContain("INV-2026-1001"); // paid order excluded from unpaid AR list
  });

  it("supports full 5-in-1 bundle when context is 'full_bundle'", () => {
    const html = renderContextualAccountingPrintHtml({
      context: "full_bundle",
      report: corp,
      tax,
      businessName: sampleStore.businessName,
      orders: sampleOrders,
    });
    expect(html).toContain("LAPORAN KEUANGAN PSAK &amp; SPT PAJAK KORPORAT");
  });
});

describe("Institutional Economic Census, Market Research & Integrated AI Strategy Report", () => {
  const census = buildEconomicCensusMarketReport({
    storeProfile: sampleStore,
    products: sampleProducts,
    orders: sampleOrders,
    conversations: sampleConversations,
    contacts: sampleContacts,
    report: sampleFinancialSummary,
    horizonDays: 90,
  });

  it("computes PP 7/2021 UMKM scale, Gross Value Added, Digital Payment Inclusion & Digital Maturity", () => {
    expect(census.documentNumber).toMatch(/^SE-UMKM-\d{6}-\d{4}$/);
    expect(census.entityProfile.umkmScale).toContain("PP 7/2021");
    expect(census.entityProfile.kbliReferenceCode).toContain("4791");
    expect(census.entityProfile.digitalMaturityScore).toBeGreaterThanOrEqual(50);
    expect(census.entityProfile.digitalMaturityScore).toBeLessThanOrEqual(100);
    expect(census.economicIndicators.grossValueAddedIdr).toBeGreaterThan(0);
    // 250k QRIS out of 415k total = 60.2% digital inclusion
    expect(census.economicIndicators.digitalPaymentInclusionPct).toBeCloseTo(60.2, 0);
    expect(census.categoryStructure.length).toBe(2);
  });

  it("integrates executive conclusions from Strategi Marketing AI & 5 UMKM learning modules", () => {
    expect(census.marketingStrategyConclusion.blendedRoasTarget).toBeGreaterThan(0);
    expect(census.marketingStrategyConclusion.breakEvenRoas).toBeGreaterThan(0);
    expect(census.marketingStrategyConclusion.ltvToCacRatio).toBeGreaterThan(0);
    expect(census.marketingStrategyConclusion.keyStrengths.length).toBeGreaterThan(0);
    expect(census.marketingStrategyConclusion.channelBudgetSplit.length).toBeGreaterThan(0);
    expect(census.marketingStrategyConclusion.roadmapHighlights.length).toBeGreaterThan(0);
    expect(census.umkmLearningModules.length).toBe(5);
    expect(census.integratedExecutiveVerdict).toContain(sampleStore.businessName);
  });

  it("generates 6 structured Excel/CSV sheets and formal institutional print HTML", () => {
    const sheets = buildEconomicCensusExportSheets(census);
    expect(sheets).toHaveLength(6);
    expect(sheets.map((s) => s.sheetName)).toEqual([
      "1. Profil & Sensus BPS",
      "2. Pembayaran & Kategori",
      "3. Segmen & Tren Minat",
      "4. Proyeksi & Elastisitas",
      "5. Kesimpulan Strategi AI",
      "6. Panduan Riset UMKM",
    ]);

    const html = renderEconomicCensusMarketPrintHtml(census);
    expect(html).toContain("LAPORAN RISET PASAR, SENSUS EKONOMI UMKM &amp; KESIMPULAN STRATEGI PEMASARAN AI");
    expect(html).toContain("BPS Sensus Ekonomi");
    expect(html).toContain("Dinas Koperasi &amp; UKM");
    expect(html).toContain("Bank Indonesia (QRIS)");
    expect(html).toContain("Kesimpulan Terpadu dari Strategi Marketing AI");
    expect(html).toContain("Modul Pembelajaran Analisis Pasar Mandiri bagi Pelaku UMKM");
    expect(html).toContain(census.documentNumber);
  });
});

describe("Strategi Marketing AI UI Print Accessibility", () => {
  it("exposes prominent top-bar print buttons and persistent quick-print strip across all sub-tabs", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/components/enterprise-marketing-strategy-view.tsx"),
      "utf8",
    );
    expect(src).toContain("Cetak / Print Blueprint PDF");
    expect(src).toContain("Cetak Laporan Riset &amp; Sensus");
    expect(src).toContain("Cetak Cepat Blueprint Strategi Marketing AI (Tersedia di Semua Tab)");
  });
});
