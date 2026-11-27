import { describe, expect, it } from "vitest";
import {
  buildPdfFromPrintableHtml,
  generateStructuredPdfBytes,
} from "@/lib/pdf-generator";
import { buildPrintableHtmlDocument } from "@/lib/printer";
import {
  hashTenantPassword,
  verifyTenantPassword,
} from "@/lib/publisher-sync";
import {
  buildCsvString,
  buildExcelWorkbookXml,
  generateReportArtifact,
  type ReportExportPayload,
} from "@/lib/report-exporter";
import {
  buildCorporateFinancialStatements,
  computeCrmCustomerIntelligence,
  computeErpInventoryIntelligence,
  computeShiftReconciliation,
  runCorporateSeoAudit,
} from "@/lib/sovereign-corporate";
import type {
  ContactRecord,
  ErpProductRecord,
  FinancialReportSummary,
  PosOrderRecord,
} from "@/lib/crm-types";

describe("Item #1 — Persistent Cloud Password Hashing (Sign-Out -> Sign-In)", () => {
  it("hashes with scrypt + salt and verifies passwords securely", () => {
    const hash = hashTenantPassword("Rahasia123");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(verifyTenantPassword("Rahasia123", hash)).toBe(true);
    expect(verifyTenantPassword("Salah999", hash)).toBe(false);
    expect(verifyTenantPassword("Rahasia123", "invalid:format")).toBe(false);
  });
});

describe("Items #2 & #11 — Genuine PDF 1.4 Generator, Print Preview & Multi-Format Report Exporter", () => {
  const samplePayload: ReportExportPayload = {
    reportTitle: "Laporan Keuangan Corporate PSAK",
    subtitle: "Periode November 2026",
    businessName: "PT Nusantara Kopi Tbk",
    filenameBase: "laporan-keuangan-psak",
    kpis: [
      { label: "Omzet", value: "Rp 45.000.000" },
      { label: "Laba Bersih", value: "Rp 18.200.000" },
    ],
    sheets: [
      {
        sheetName: "Neraca Saldo",
        headers: ["Kode", "Nama Akun", "Debit", "Kredit"],
        rows: [
          ["1101", "Kas & Bank", 25000000, 0],
          ["4101", "Pendapatan Penjualan", 0, 25000000],
        ],
      },
    ],
  };

  it("generates genuine multi-page binary %PDF-1.4 bytes with xref and %%EOF", () => {
    const manyRows = Array.from({ length: 85 }, (_, i) => [
      `SKU-${String(i + 1).padStart(3, "0")}`,
      `Produk Korporat ${i + 1}`,
      `Rp ${(i + 1) * 15000}`,
    ]);
    const pdfBytes = generateStructuredPdfBytes({
      title: "Laporan Persediaan Multi-Halaman",
      businessName: "PT Nusantara Kopi Tbk",
      kpis: [{ label: "Total SKU", value: "85" }],
      columns: [
        { header: "SKU", widthRatio: 1 },
        { header: "Nama Produk", widthRatio: 3 },
        { header: "Nilai", widthRatio: 1.5 },
      ],
      rows: manyRows,
    });
    const text = new TextDecoder().decode(pdfBytes);
    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text).toContain("xref\n");
    expect(text).toContain("%%EOF");
    expect(text).toMatch(/\/Count [2-9]/);
  });

  it("converts printable HTML tables into downloadable %PDF-1.4 bytes and white-paper preview HTML", () => {
    const html = `<h1>Invoice #INV-01</h1><table><tr><th>Item</th><th>Total</th></tr><tr><td>Kopi</td><td>Rp 90.000</td></tr></table>`;
    const pdfBytes = buildPdfFromPrintableHtml("Invoice INV-01", html, "Toko Kopi");
    const pdfText = new TextDecoder().decode(pdfBytes);
    expect(pdfText.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdfText).toContain("Kopi");

    const previewDoc = buildPrintableHtmlDocument("Invoice INV-01", html, "a4");
    expect(previewDoc).toContain("<!DOCTYPE html>");
    expect(previewDoc).toContain("background: #fff");
    expect(previewDoc).toContain("Invoice #INV-01");
  });

  it("exports valid Excel SpreadsheetML (.xls), PDF (.pdf), UTF-8 BOM CSV (.csv) and JSON (.json)", () => {
    const xlsXml = buildExcelWorkbookXml(samplePayload);
    expect(xlsXml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xlsXml).toContain('<Worksheet ss:Name="Neraca Saldo">');
    expect(xlsXml).toContain('<Data ss:Type="Number">25000000</Data>');

    const csv = buildCsvString(samplePayload.sheets[0]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Kas & Bank");

    const xlsArt = generateReportArtifact(samplePayload, "excel");
    const pdfArt = generateReportArtifact(samplePayload, "pdf");
    const csvArt = generateReportArtifact(samplePayload, "csv");
    const jsonArt = generateReportArtifact(samplePayload, "json");

    expect(xlsArt.filename.endsWith(".xls")).toBe(true);
    expect(pdfArt.filename.endsWith(".pdf")).toBe(true);
    expect(new TextDecoder().decode(pdfArt.bytes).startsWith("%PDF-1.4")).toBe(true);
    expect(csvArt.filename.endsWith(".csv")).toBe(true);
    expect(jsonArt.filename.endsWith(".json")).toBe(true);
    expect(xlsArt.tsvForClipboard).toContain("Kode\tNama Akun");
  });
});

describe("Items #3, #6, #7, #8, #9 — Sovereign Corporate Enterprise Calculation Suites", () => {
  const sampleProducts: ErpProductRecord[] = [
    {
      id: "p1",
      sku: "KOPI-ARB-01",
      name: "Kopi Arabika Kintamani 1kg",
      category: "Kopi",
      description: "Fresh roast",
      unit: "kg",
      unitPrice: 220_000,
      costPrice: 120_000,
      stockQty: 50,
      minStock: 10,
      isActive: true,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    },
    {
      id: "p2",
      sku: "MATCHA-02",
      name: "Matcha Uji Ceremonial 100g",
      category: "Teh",
      description: "Grade A",
      unit: "kaleng",
      unitPrice: 165_000,
      costPrice: 85_000,
      stockQty: 4,
      minStock: 12,
      isActive: true,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    },
  ];

  const sampleOrders: PosOrderRecord[] = [
    {
      id: "o1",
      invoiceNumber: "INV-2026-001",
      conversationId: null,
      contactId: "c1",
      customerName: "Rina Kartika",
      customerPhone: "+6281234567890",
      shippingAddress: "Surabaya",
      channel: "whatsapp",
      subtotal: 1_800_000,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 1_800_000,
      paymentMethod: "qris",
      paymentStatus: "paid",
      orderStatus: "completed",
      qrPayload: "QR-1",
      aiGenerated: false,
      fraudRiskScore: 0,
      notes: null,
      items: [
        {
          id: "i1",
          productId: "p1",
          sku: "KOPI-ARB-01",
          productName: "Kopi Arabika Kintamani 1kg",
          quantity: 8,
          unitPrice: 225_000,
          costPrice: 120_000,
          lineTotal: 1_800_000,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "o2",
      invoiceNumber: "INV-2026-002",
      conversationId: null,
      contactId: "c2",
      customerName: "Budi Santoso",
      customerPhone: "+628199999999",
      shippingAddress: "Bandung",
      channel: "whatsapp",
      subtotal: 500_000,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 500_000,
      paymentMethod: "cash",
      paymentStatus: "paid",
      orderStatus: "completed",
      qrPayload: "QR-2",
      aiGenerated: false,
      fraudRiskScore: 0,
      notes: null,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const sampleSummary: FinancialReportSummary = {
    totalRevenue: 2_300_000,
    totalCogs: 960_000,
    grossProfit: 1_340_000,
    totalExpenses: 250_000,
    netProfit: 1_090_000,
    profitMarginPct: 47.4,
    totalAssets: 50_000_000,
    totalLiabilities: 2_000_000,
    totalEquity: 48_000_000,
    totalDebits: 10_000_000,
    totalCredits: 10_000_000,
    isBalanced: true,
    cashBalance: 18_000_000,
    inventoryValue: 6_340_000,
    receivablesBalance: 0,
  };

  it("#3 Accounting: produces balanced Trial Balance & Balance Sheet with Indonesian tax figures", () => {
    const corp = buildCorporateFinancialStatements({
      summary: sampleSummary,
      orders: sampleOrders,
      products: sampleProducts,
      entries: [],
    });
    expect(corp.isTrialBalanced).toBe(true);
    expect(corp.totalTrialDebit).toBe(corp.totalTrialCredit);
    expect(corp.balanceSheet.isBalanced).toBe(true);
    expect(corp.balanceSheet.totalAssetsIdr).toBe(
      corp.balanceSheet.totalLiabilitiesIdr + corp.balanceSheet.totalEquityIdr,
    );
    expect(corp.taxSummary.pphFinal05Idr).toBe(Math.round(2_300_000 * 0.005));
    expect(corp.taxSummary.ppn11Idr).toBeGreaterThan(0);
  });

  it("#6 ERP: computes ABC valuation & MRP ROP/EOQ and flags low-stock SKU for reorder", () => {
    const intel = computeErpInventoryIntelligence(sampleProducts, sampleOrders);
    expect(intel).toHaveLength(2);
    const matcha = intel.find((x) => x.sku === "MATCHA-02");
    expect(matcha?.needsReorder).toBe(true);
    expect(matcha?.eoqQty).toBeGreaterThanOrEqual(10);
  });

  it("#7 CRM: classifies VIP contacts into RFM segments with bounded lead scores & CLV", () => {
    const contacts: ContactRecord[] = [
      {
        id: "c1",
        displayName: "Rina Kartika",
        phoneE164: "+6281234567890",
        email: "rina@majubersama.id",
        company: "PT Maju Bersama",
        notes: null,
        tags: ["vip", "grosir"],
        lifecycleStage: "vip",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
      },
    ];
    const rfm = computeCrmCustomerIntelligence(contacts, sampleOrders);
    expect(rfm[0]?.segment).toBe("Champions");
    expect(rfm[0]?.leadScore).toBeGreaterThanOrEqual(70);
    expect(rfm[0]?.estimatedClvIdr).toBeGreaterThan(1_800_000);
  });

  it("#8 POS: reconciles cashier shift drawer with exact variance calculation", () => {
    const shift = computeShiftReconciliation({
      shiftId: "SHIFT-TEST",
      cashierName: "Kasir 1",
      outletName: "Outlet Pusat",
      openedAt: "2026-11-26 08:00",
      openingFloatIdr: 500_000,
      countedCashIdr: 1_000_000,
      orders: sampleOrders,
    });
    expect(shift.cashSalesIdr).toBe(500_000);
    expect(shift.qrisSalesIdr).toBe(1_800_000);
    expect(shift.expectedCashInDrawerIdr).toBe(1_000_000);
    expect(shift.varianceIdr).toBe(0);
  });

  it("#9 SEO: runs technical SEO audit & generates valid Multi-Schema JSON-LD bundle", () => {
    const seo = runCorporateSeoAudit({
      brandName: "Kopi Nusantara",
      domainUrl: "https://kopinusantara.co.id",
      city: "Surabaya",
      industry: "Kopi",
      primaryKeyword: "kopi arabika grosir",
      pageTitle: "Jual Kopi Arabika Grosir Terbaik Surabaya | Kopi Nusantara",
      metaDescription:
        "Pesan kopi arabika grosir fresh roast di Surabaya langsung dari distributor resmi Kopi Nusantara. Harga kompetitif, kirim cepat seluruh Indonesia via WhatsApp.",
      whatsappNumber: "+62-812-3456-7890",
    });
    expect(seo.overallScore).toBeGreaterThanOrEqual(85);
    expect(seo.keywordClusters).toHaveLength(5);
    const parsedSchema = JSON.parse(seo.jsonLdBundle) as { "@graph": unknown[] };
    expect(parsedSchema["@graph"]).toHaveLength(3);
  });
});
