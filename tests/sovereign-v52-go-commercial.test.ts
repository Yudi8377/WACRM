import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVOICE_LAYOUT,
  type InvoiceLayoutSettings,
} from "@/lib/invoice-layout";
import {
  renderInvoicePrintHtml,
  renderMarketForecastPrintHtml,
  renderMasterDataPrintHtml,
} from "@/lib/printer";
import {
  buildSovereignBuyerInterestForecast,
  buildWinningProductRecommendations,
} from "@/lib/market-forecasting";
import {
  buildMonthlyPayrollSummary,
  calculateEmployeePayroll,
  computeIndonesianOvertimePay,
  getDefaultHrdState,
  getTerCategoryForPtkp,
  lookupPph21TerRatePct,
  renderPayrollSummaryPrintHtml,
  renderPayslipPrintHtml,
} from "@/lib/hrd-payroll";
import {
  buildCorporateFinancialStatements,
  computeBomUnitCost,
  computeEnterpriseTaxAndRatios,
  computeErpInventoryIntelligence,
  computeStockOpnameAudit,
  computeVendorSlaScorecard,
  renderCorporateErpPrintHtml,
  renderCorporateTaxAndAccountingPrintHtml,
} from "@/lib/sovereign-corporate";
import { editionHasFeature } from "@/lib/editions";
import { TAB_REQUIRED_FEATURE } from "@/lib/access-control";
import type {
  ErpProductRecord,
  FinancialReportSummary,
  PosOrderRecord,
  StoreBusinessProfile,
} from "@/lib/crm-types";

const STORE: StoreBusinessProfile = {
  businessName: "PT Sovereign Niaga Nusantara",
  businessTagline: "Enterprise Omnichannel & Retail",
  phone: "0812-9000-8888",
  email: "finance@sovereign.co.id",
  address: "Jl. Sudirman Kav. 88, Jakarta Selatan",
  city: "Jakarta Selatan",
  taxId: "01.234.567.8-901.000",
  invoiceFooter: "Terima kasih telah berbelanja!",
  defaultCourier: "JNE REG",
};

const SAMPLE_PRODUCTS: ErpProductRecord[] = [
  {
    id: "prod-1",
    sku: "SKU-001",
    name: "Kopi Arabika Gayo 500g",
    category: "Beverage",
    description: "Kopi arabika pilihan single origin Aceh Gayo",
    unit: "pcs",
    costPrice: 55_000,
    unitPrice: 95_000,
    stockQty: 40,
    minStock: 10,
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "prod-2",
    sku: "SKU-002",
    name: "Madu Hutan Asli 1L",
    category: "Herbal",
    description: "Madu hutan murni grade A",
    unit: "botol",
    costPrice: 120_000,
    unitPrice: 195_000,
    stockQty: 12,
    minStock: 15,
    isActive: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
];

const SAMPLE_ORDER: PosOrderRecord = {
  id: "ord-1",
  invoiceNumber: "INV-2026-8801",
  conversationId: null,
  contactId: "ct-1",
  customerName: "Budi Hartono",
  customerPhone: "6281234567890",
  shippingAddress: "Jl. Asia Afrika 10, Bandung",
  channel: "whatsapp",
  subtotal: 290_000,
  discountAmount: 10_000,
  taxAmount: 0,
  totalAmount: 295_000,
  paymentMethod: "bank_transfer",
  paymentStatus: "paid",
  orderStatus: "completed",
  qrPayload: "WACRM|INV-2026-8801|295000",
  aiGenerated: false,
  fraudRiskScore: 5,
  trackingCode: "JNE88019922",
  shippingCost: 15_000,
  notes: "Kirim aman bubble wrap",
  items: [
    {
      id: "oi-1",
      productId: "prod-1",
      sku: "SKU-001",
      productName: "Kopi Arabika Gayo 500g",
      quantity: 2,
      unitPrice: 95_000,
      costPrice: 55_000,
      lineTotal: 190_000,
    },
    {
      id: "oi-2",
      productId: "prod-2",
      sku: "SKU-002",
      productName: "Madu Hutan Asli 1L",
      quantity: 1,
      unitPrice: 100_000,
      costPrice: 120_000,
      lineTotal: 100_000,
    },
  ],
  createdAt: "2026-11-20T08:00:00.000Z",
  updatedAt: "2026-11-20T08:00:00.000Z",
};

describe("v5.2 Go-Commercial Suite", () => {
  it("1. Customizes POS invoice layout with template, accent color, bank details & signature", () => {
    const customLayout: InvoiceLayoutSettings = {
      ...DEFAULT_INVOICE_LAYOUT,
      templateStyle: "classic_formal",
      accentColor: "#1d4ed8",
      headerTitle: "FAKTUR PENJUALAN RESMI",
      showBankTransferBox: true,
      bankTransferInfo: "BCA 123-456-7890 a/n PT Sovereign",
      showSignatureBlock: true,
      signatureRightLabel: "Finance Manager",
      footerGreeting: "Barang yang sudah dibeli bergaransi resmi 14 hari.",
    };

    expect(customLayout.templateStyle).toBe("classic_formal");
    expect(DEFAULT_INVOICE_LAYOUT.showQrCode).toBe(true);

    const html = renderInvoicePrintHtml(SAMPLE_ORDER, STORE, "a4", customLayout);
    expect(html).toContain("FAKTUR PENJUALAN RESMI");
    expect(html).toContain("BCA 123-456-7890 a/n PT Sovereign");
    expect(html).toContain("Finance Manager");
    expect(html).toContain("Barang yang sudah dibeli bergaransi resmi 14 hari.");
  });

  it("2. Renders printable Master Data reports across products, suppliers, customers & all scopes", () => {
    const htmlAll = renderMasterDataPrintHtml({
      scope: "all",
      storeOrName: STORE,
      products: SAMPLE_PRODUCTS,
      suppliers: [
        {
          id: "sup-1",
          name: "PT Roastery Gayo",
          contactPerson: "Hendra",
          phone: "0811-2233-44",
          email: "sales@gayo.id",
          address: "Aceh Tengah",
          paymentTerms: "NET 14",
          status: "active",
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      contacts: [
        {
          id: "ct-1",
          displayName: "Siti Rahma",
          phoneE164: "6281300001111",
          email: "siti@example.com",
          company: "CV Rahma Jaya",
          notes: "Pembeli rutin bulanan",
          tags: ["VIP", "Reseller"],
          lifecycleStage: "customer",
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      categories: [
        { id: "cat-1", name: "Beverage", groupCode: "BEV", description: "Minuman" },
      ],
      units: [{ id: "u-1", code: "pcs", name: "Pieces" }],
      couriers: [
        {
          id: "cur-1",
          code: "JNE",
          name: "JNE Express",
          serviceType: "REG/YES",
          baseRate: 15_000,
          estimatedDays: "2-3 Hari",
          isActive: true,
          codSupported: true,
        },
      ],
      payments: [
        {
          id: "pay-1",
          method: "bank_transfer",
          providerName: "Bank BCA",
          accountNumber: "8800112233",
          accountHolder: "PT Sovereign Niaga",
          isActive: true,
        },
      ],
    });

    expect(htmlAll).toContain("PT Sovereign Niaga Nusantara");
    expect(htmlAll).toContain("Kopi Arabika Gayo 500g");
    expect(htmlAll).toContain("PT Roastery Gayo");
    expect(htmlAll).toContain("Siti Rahma");
    expect(htmlAll).toContain("JNE Express");
    expect(htmlAll).toContain("8800112233");
  });

  it("3. Computes Enterprise Indonesian Tax SPT (PPN 11%, PPh Final 0.5%, PPh Badan 31E, PPh 21/23/4(2)) & Financial Ratios", () => {
    const summary: FinancialReportSummary = {
      totalRevenue: 120_000_000,
      totalCogs: 70_000_000,
      grossProfit: 50_000_000,
      totalExpenses: 18_000_000,
      netProfit: 32_000_000,
      profitMarginPct: 26.7,
      totalAssets: 80_000_000,
      totalLiabilities: 12_000_000,
      totalEquity: 68_000_000,
      totalDebits: 120_000_000,
      totalCredits: 120_000_000,
      isBalanced: true,
      cashBalance: 45_000_000,
      inventoryValue: 3_640_000,
      receivablesBalance: 5_000_000,
    };
    const corp = buildCorporateFinancialStatements({
      summary,
      orders: [SAMPLE_ORDER],
      products: SAMPLE_PRODUCTS,
      entries: [],
    });
    const tax = computeEnterpriseTaxAndRatios(corp, {
      periodLabel: "November 2026",
      pph21PayrollIdr: 1_250_000,
      serviceExpenseForPph23Idr: 5_000_000,
      rentExpenseForPph42Idr: 4_000_000,
    });

    expect(tax.ppnKeluaran11Idr).toBe(Math.round(120_000_000 * 0.11));
    expect(tax.ppnMasukan11Idr).toBe(Math.round(70_000_000 * 0.11));
    expect(tax.ppnNetPayableIdr).toBe(tax.ppnKeluaran11Idr - tax.ppnMasukan11Idr);
    expect(tax.pphFinalUmkm05Idr).toBe(600_000);
    expect(tax.pphBadanPasal31EIdr).toBe(Math.round(corp.incomeStatement.ebitdaIdr * 0.11));
    expect(tax.pph21PayrollIdr).toBe(1_250_000);
    expect(tax.pph23Services2Idr).toBe(100_000);
    expect(tax.pph4Ayat2Rent10Idr).toBe(400_000);
    expect(tax.currentRatio).toBeGreaterThan(0);

    const html = renderCorporateTaxAndAccountingPrintHtml(
      corp,
      tax,
      STORE.businessName,
      STORE.taxId,
    );
    expect(html).toContain("LAPORAN KEUANGAN PSAK");
    expect(html).toContain("SPT Masa PPN 1111");
    expect(html).toContain("01.234.567.8-901.000");
  });

  it("4. Renders printable Tren Minat Pembeli & AI Winning Products report end-to-end", () => {
    const productIntel = buildWinningProductRecommendations({
      products: SAMPLE_PRODUCTS,
      orders: [SAMPLE_ORDER],
      conversations: [],
      storeName: STORE.businessName,
    });
    const sovereignForecast = buildSovereignBuyerInterestForecast({
      products: SAMPLE_PRODUCTS,
      orders: [SAMPLE_ORDER],
      storeName: STORE.businessName,
      horizonDays: 60,
    });
    const html = renderMarketForecastPrintHtml({
      storeOrName: STORE,
      productIntel,
      sovereignForecast,
      includeSovereignForecast: true,
    });
    expect(html).toContain("PT Sovereign Niaga Nusantara");
    expect(html).toContain("Kopi Arabika Gayo 500g");
    expect(html).toContain("Proyeksi Tren Minat");
  });

  it("5. Computes Corporate ERP BOM HPP, Stock Opname Audit, Vendor SLA Scorecard & Printable ERP Report", () => {
    const bom = {
      id: "bom-test",
      sku: "PKG-GAYO-2X",
      finishedProductName: "Hampers Kopi Gayo Premium",
      batchQty: 10,
      laborAndOverheadIdr: 150_000,
      components: [
        { materialName: "Kopi Arabika 500g", qtyPerBatch: 10, unit: "pcs", unitCostIdr: 55_000 },
        { materialName: "Box Hampers", qtyPerBatch: 10, unit: "pcs", unitCostIdr: 15_000 },
      ],
    };
    const bomCost = computeBomUnitCost(bom);
    expect(bomCost.materialCostPerBatchIdr).toBe(700_000);
    expect(bomCost.totalBatchCostIdr).toBe(850_000);
    expect(bomCost.unitHppIdr).toBe(85_000);

    const opname = computeStockOpnameAudit(SAMPLE_PRODUCTS, {
      "prod-1": 38, // -2 shortage (-110,000)
      "prod-2": 12, // match
    });
    expect(opname.accuracyPct).toBe(50);
    expect(opname.totalVarianceQty).toBe(-2);
    expect(opname.totalVarianceValueIdr).toBe(-110_000);

    const sla = computeVendorSlaScorecard([
      { vendorName: "Vendor A", poCount: 10, onTimeDeliveryPct: 98, defectRatePct: 0.2, avgLeadTimeDays: 2 },
      { vendorName: "Vendor B", poCount: 6, onTimeDeliveryPct: 72, defectRatePct: 3.0, avgLeadTimeDays: 6 },
    ]);
    expect(sla[0].vendorName).toBe("Vendor A");
    expect(sla[0].grade).toBe("A+");
    expect(sla[0].compositeScore).toBeGreaterThan(sla[1].compositeScore);

    const abcRows = computeErpInventoryIntelligence(SAMPLE_PRODUCTS, [SAMPLE_ORDER]);
    const erpHtml = renderCorporateErpPrintHtml({
      scope: "all",
      businessName: STORE.businessName,
      abcRows,
      transfers: [],
      boms: [bom],
      opname,
      vendorSla: sla,
    });
    expect(erpHtml).toContain("Hampers Kopi Gayo Premium");
    expect(erpHtml).toContain("Berita Acara Stock Opname");
    expect(erpHtml).toContain("Vendor A");
  });

  it("6. Calculates Indonesian HRD & Payroll accurately (PP 58/2023 PPh 21 TER, PP 35/2021 1/173 Overtime, BPJS Caps & Payslip)", () => {
    expect(getTerCategoryForPtkp("TK/0")).toBe("A");
    expect(getTerCategoryForPtkp("K/1")).toBe("B");
    expect(getTerCategoryForPtkp("K/3")).toBe("C");

    // 5.4M Cat A -> 0%; 10M Cat A -> 2%
    expect(lookupPph21TerRatePct(5_400_000, "A")).toBe(0);
    expect(lookupPph21TerRatePct(10_000_000, "A")).toBe(2.0);

    // PP 35/2021: 3 hours overtime = (1.5 + 2 + 2) * (fixedWage / 173) = 5.5 * (6,920,000 / 173) = 220,000
    expect(computeIndonesianOvertimePay(6_920_000, 3)).toBe(220_000);

    const hrdState = getDefaultHrdState();
    const summary = buildMonthlyPayrollSummary(hrdState, "November 2026");
    expect(summary.employeeCount).toBe(hrdState.employees.length);
    expect(summary.totalTakeHomePayIdr).toBeGreaterThan(0);
    expect(summary.totalCompanyCostIdr).toBeGreaterThan(summary.totalTakeHomePayIdr);

    const single = calculateEmployeePayroll({
      employee: hrdState.employees[0],
      periodLabel: "November 2026",
      overtimeHours: 4,
      alfaDays: 0,
      bonusIdr: 500_000,
    });
    // BPJS Kesehatan base capped at 12,000,000 -> employee 1% <= 120,000
    expect(single.bpjsKesEmployeeIdr).toBeLessThanOrEqual(120_000);
    expect(single.netTakeHomePayIdr).toBe(single.grossIncomeIdr - single.totalDeductionsIdr);

    const payslipHtml = renderPayslipPrintHtml(single, STORE);
    expect(payslipHtml).toContain("SLIP GAJI KARYAWAN");
    expect(payslipHtml).toContain(single.employee.fullName);

    const registerHtml = renderPayrollSummaryPrintHtml(summary, STORE);
    expect(registerHtml).toContain("Rekapitulasi Payroll");
    expect(registerHtml).toContain("November 2026");

    // Sovereign Corporate feature gating
    expect(editionHasFeature("sovereign", "hrd_payroll_corporate")).toBe(true);
    expect(editionHasFeature("enterprise", "hrd_payroll_corporate")).toBe(false);
    expect(TAB_REQUIRED_FEATURE.hrd_payroll).toBe("hrd_payroll_corporate");
  });
});
