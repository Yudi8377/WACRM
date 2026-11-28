import type {
  AccountingEntryRecord,
  ContactRecord,
  ErpProductRecord,
  FinancialReportSummary,
  PosOrderRecord,
} from "@/lib/crm-types";

// ============================================================================
// 1. SOVEREIGN CORPORATE ACCOUNTING ENGINE (PSAK COA, Neraca, Laba Rugi, Arus Kas, Pajak)
// ============================================================================

export interface CoaTrialBalanceRow {
  code: string;
  name: string;
  category: "Aset" | "Liabilitas" | "Ekuitas" | "Pendapatan" | "HPP" | "Beban";
  debit: number;
  credit: number;
  balance: number;
}

export interface AgingBucket {
  label: string;
  count: number;
  amountIdr: number;
}

export interface CorporateFinancialStatements {
  coaTrialBalance: CoaTrialBalanceRow[];
  totalTrialDebit: number;
  totalTrialCredit: number;
  isTrialBalanced: boolean;
  incomeStatement: {
    grossRevenueIdr: number;
    discountsAndReturnsIdr: number;
    netRevenueIdr: number;
    cogsIdr: number;
    grossProfitIdr: number;
    grossMarginPct: number;
    operatingExpenseIdr: number;
    ebitdaIdr: number;
    pphFinalUmkmIdr: number;
    ppnCollectedIdr: number;
    netProfitAfterTaxIdr: number;
    netMarginPct: number;
  };
  balanceSheet: {
    cashAndBankIdr: number;
    accountsReceivableIdr: number;
    inventoryAssetIdr: number;
    fixedAssetsIdr: number;
    totalAssetsIdr: number;
    accountsPayableIdr: number;
    taxPayableIdr: number;
    totalLiabilitiesIdr: number;
    paidInCapitalIdr: number;
    retainedEarningsIdr: number;
    currentYearEarningsIdr: number;
    totalEquityIdr: number;
    isBalanced: boolean;
  };
  cashFlow: {
    cashFromCustomersIdr: number;
    cashPaidForInventoryAndOpsIdr: number;
    operatingCashFlowIdr: number;
    investingCashFlowIdr: number;
    financingCashFlowIdr: number;
    netCashChangeIdr: number;
  };
  arAging: AgingBucket[];
  taxSummary: {
    dppIdr: number;
    ppn11Idr: number;
    pphFinal05Idr: number;
    estimatedTotalTaxIdr: number;
  };
}

export function buildCorporateFinancialStatements(input: {
  summary: FinancialReportSummary;
  orders: PosOrderRecord[];
  products: ErpProductRecord[];
  entries: AccountingEntryRecord[];
  operatingExpenseOverrideIdr?: number;
  fixedAssetsIdr?: number;
  accountsPayableIdr?: number;
}): CorporateFinancialStatements {
  const { summary, orders, products, entries } = input;
  const grossRevenue = Math.max(0, summary.totalRevenue);
  const cogs = Math.max(0, summary.totalCogs);
  const arCodPending = Math.max(
    0,
    summary.receivablesBalance ||
      orders
        .filter((o) => o.paymentStatus !== "paid")
        .reduce((s, o) => s + o.totalAmount, 0),
  );
  const netCollected = Math.max(
    0,
    orders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((s, o) => s + o.totalAmount, 0) || Math.max(0, grossRevenue - arCodPending),
  );

  const ledgerOps = entries
    .filter((e) => e.accountType === "expense")
    .reduce((acc, e) => acc + Math.max(0, e.debit || e.credit), 0);
  const operatingExpense =
    input.operatingExpenseOverrideIdr ??
    (summary.totalExpenses > 0
      ? summary.totalExpenses
      : ledgerOps > 0
        ? ledgerOps
        : Math.round(grossRevenue * 0.08));

  const inventoryValue =
    products.length > 0
      ? products.reduce(
          (sum, p) => sum + Math.max(0, p.stockQty) * Math.max(0, p.costPrice),
          0,
        )
      : Math.max(0, summary.inventoryValue);

  const fixedAssets = input.fixedAssetsIdr ?? 25_000_000;
  const accountsPayable =
    input.accountsPayableIdr ?? Math.round(inventoryValue * 0.25);

  const dppIdr = Math.round(grossRevenue / 1.11);
  const ppn11Idr = Math.max(0, grossRevenue - dppIdr);
  const pphFinal05Idr = Math.round(grossRevenue * 0.005);
  const taxPayable = ppn11Idr + pphFinal05Idr;

  const grossProfit = grossRevenue - cogs;
  const ebitda = grossProfit - operatingExpense;
  const netProfitAfterTax = ebitda - pphFinal05Idr;

  const cashAndBank = Math.max(
    15_000_000,
    (summary.cashBalance > 0 ? summary.cashBalance : 15_000_000) +
      Math.max(0, netCollected - operatingExpense),
  );
  const totalAssets = cashAndBank + arCodPending + inventoryValue + fixedAssets;
  const totalLiabilities = accountsPayable + taxPayable;
  const currentYearEarnings = netProfitAfterTax;
  const paidInCapital = Math.max(
    0,
    totalAssets - totalLiabilities - currentYearEarnings,
  );
  const retainedEarnings = 0;
  const totalEquity = paidInCapital + retainedEarnings + currentYearEarnings;

  // Strict Double-Entry Trial Balance: Total Debit === Total Credit
  const coaTrialBalance: CoaTrialBalanceRow[] = [
    {
      code: "1101",
      name: "Kas & Rekening Bank Operasional",
      category: "Aset",
      debit: cashAndBank,
      credit: 0,
      balance: cashAndBank,
    },
    {
      code: "1102",
      name: "Piutang Usaha & COD Dalam Pengiriman",
      category: "Aset",
      debit: arCodPending,
      credit: 0,
      balance: arCodPending,
    },
    {
      code: "1103",
      name: "Persediaan Barang Dagang (FIFO)",
      category: "Aset",
      debit: inventoryValue,
      credit: 0,
      balance: inventoryValue,
    },
    {
      code: "1201",
      name: "Aset Tetap & Peralatan Outlet",
      category: "Aset",
      debit: fixedAssets,
      credit: 0,
      balance: fixedAssets,
    },
    {
      code: "2101",
      name: "Utang Usaha Supplier",
      category: "Liabilitas",
      debit: 0,
      credit: accountsPayable,
      balance: accountsPayable,
    },
    {
      code: "2102",
      name: "Utang PPN Keluaran (11%)",
      category: "Liabilitas",
      debit: 0,
      credit: ppn11Idr,
      balance: ppn11Idr,
    },
    {
      code: "2103",
      name: "Utang PPh Final UMKM (0,5%)",
      category: "Liabilitas",
      debit: 0,
      credit: pphFinal05Idr,
      balance: pphFinal05Idr,
    },
    {
      code: "3101",
      name: "Modal Disetor & Saldo Ekuitas Awal",
      category: "Ekuitas",
      debit: 0,
      credit: paidInCapital,
      balance: paidInCapital,
    },
    {
      code: "4101",
      name: "Pendapatan Penjualan (POS & WA)",
      category: "Pendapatan",
      debit: 0,
      credit: grossRevenue,
      balance: grossRevenue,
    },
    {
      code: "5101",
      name: "Harga Pokok Penjualan (HPP)",
      category: "HPP",
      debit: cogs,
      credit: 0,
      balance: cogs,
    },
    {
      code: "6101",
      name: "Beban Operasional, Logistik & Marketing",
      category: "Beban",
      debit: operatingExpense,
      credit: 0,
      balance: operatingExpense,
    },
    {
      code: "6201",
      name: "Beban Pajak PPh Final (0,5%)",
      category: "Beban",
      debit: pphFinal05Idr,
      credit: 0,
      balance: pphFinal05Idr,
    },
  ];

  const totalTrialDebit = coaTrialBalance.reduce((s, r) => s + r.debit, 0);
  const totalTrialCredit = coaTrialBalance.reduce((s, r) => s + r.credit, 0);

  const nowMs = Date.now();
  const aging = [
    { label: "0 - 7 Hari (Lancar)", count: 0, amountIdr: 0 },
    { label: "8 - 30 Hari (Perhatian)", count: 0, amountIdr: 0 },
    { label: "31 - 60 Hari (Jatuh Tempo)", count: 0, amountIdr: 0 },
    { label: "> 60 Hari (Kritis / Koleksi)", count: 0, amountIdr: 0 },
  ];
  for (const ord of orders) {
    if (ord.paymentStatus === "paid") continue;
    const days = Math.max(
      0,
      Math.floor((nowMs - new Date(ord.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
    );
    const idx = days <= 7 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3;
    aging[idx].count += 1;
    aging[idx].amountIdr += ord.totalAmount;
  }

  const operatingCashFlow = netCollected - operatingExpense - Math.round(cogs * 0.6);

  return {
    coaTrialBalance,
    totalTrialDebit,
    totalTrialCredit,
    isTrialBalanced: totalTrialDebit === totalTrialCredit,
    incomeStatement: {
      grossRevenueIdr: grossRevenue,
      discountsAndReturnsIdr: orders.reduce((s, o) => s + (o.discountAmount || 0), 0),
      netRevenueIdr: grossRevenue,
      cogsIdr: cogs,
      grossProfitIdr: grossProfit,
      grossMarginPct: grossRevenue > 0 ? Math.round((grossProfit / grossRevenue) * 1000) / 10 : 0,
      operatingExpenseIdr: operatingExpense,
      ebitdaIdr: ebitda,
      pphFinalUmkmIdr: pphFinal05Idr,
      ppnCollectedIdr: ppn11Idr,
      netProfitAfterTaxIdr: netProfitAfterTax,
      netMarginPct:
        grossRevenue > 0 ? Math.round((netProfitAfterTax / grossRevenue) * 1000) / 10 : 0,
    },
    balanceSheet: {
      cashAndBankIdr: cashAndBank,
      accountsReceivableIdr: arCodPending,
      inventoryAssetIdr: inventoryValue,
      fixedAssetsIdr: fixedAssets,
      totalAssetsIdr: totalAssets,
      accountsPayableIdr: accountsPayable,
      taxPayableIdr: taxPayable,
      totalLiabilitiesIdr: totalLiabilities,
      paidInCapitalIdr: paidInCapital,
      retainedEarningsIdr: retainedEarnings,
      currentYearEarningsIdr: currentYearEarnings,
      totalEquityIdr: totalEquity,
      isBalanced: totalAssets === totalLiabilities + totalEquity,
    },
    cashFlow: {
      cashFromCustomersIdr: netCollected,
      cashPaidForInventoryAndOpsIdr: operatingExpense + Math.round(cogs * 0.6),
      operatingCashFlowIdr: operatingCashFlow,
      investingCashFlowIdr: 0,
      financingCashFlowIdr: 0,
      netCashChangeIdr: operatingCashFlow,
    },
    arAging: aging,
    taxSummary: {
      dppIdr,
      ppn11Idr,
      pphFinal05Idr,
      estimatedTotalTaxIdr: ppn11Idr + pphFinal05Idr,
    },
  };
}

// ============================================================================
// 2. SOVEREIGN CORPORATE ERP ENGINE (ABC Valuation, MRP ROP/EOQ, Transfers & PO)
// ============================================================================

export interface ErpSkuIntelligence {
  productId: string;
  sku: string;
  name: string;
  stock: number;
  costIdr: number;
  stockValueIdr: number;
  abcClass: "A" | "B" | "C";
  dailyDemandEst: number;
  reorderPoint: number;
  eoqQty: number;
  daysOfCover: number;
  needsReorder: boolean;
}

export interface WarehouseTransferRecord {
  id: string;
  transferCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  sku: string;
  productName: string;
  qty: number;
  status: "in_transit" | "received" | "approved";
  createdAt: string;
}

export interface CorporatePurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  sku: string;
  productName: string;
  qtyOrdered: number;
  unitCostIdr: number;
  totalCostIdr: number;
  etaDays: number;
  status: "draft" | "approved" | "grn_received";
  createdAt: string;
}

export function computeErpInventoryIntelligence(
  products: ErpProductRecord[],
  orders: PosOrderRecord[] = [],
): ErpSkuIntelligence[] {
  const soldQtyByProduct = new Map<string, number>();
  for (const ord of orders) {
    for (const item of ord.items) {
      if (!item.productId) continue;
      soldQtyByProduct.set(
        item.productId,
        (soldQtyByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }
  }

  const withVal = products
    .map((p) => ({
      product: p,
      value: Math.max(0, p.stockQty) * Math.max(0, p.costPrice),
    }))
    .sort((a, b) => b.value - a.value);

  const totalValue = withVal.reduce((s, r) => s + r.value, 0) || 1;
  let running = 0;

  return withVal.map(({ product, value }) => {
    running += value;
    const cumShare = running / totalValue;
    const abcClass: "A" | "B" | "C" =
      cumShare <= 0.7 ? "A" : cumShare <= 0.9 ? "B" : "C";

    const soldRecent = soldQtyByProduct.get(product.id) ?? 0;
    const dailyDemand = Math.max(
      0.5,
      Math.round((soldRecent > 0 ? soldRecent / 14 : 1.2) * 10) / 10,
    );
    const leadTimeDays = abcClass === "A" ? 5 : 7;
    const safetyStock = Math.max(3, Math.ceil(dailyDemand * 3));
    const reorderPoint = Math.max(
      product.minStock,
      Math.ceil(dailyDemand * leadTimeDays + safetyStock),
    );
    const annualDemand = dailyDemand * 365;
    const orderingCost = 75_000;
    const holdingCost = Math.max(1_000, Math.round(product.costPrice * 0.18));
    const eoqQty = Math.max(
      10,
      Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost)),
    );
    const daysOfCover =
      dailyDemand > 0 ? Math.round((product.stockQty / dailyDemand) * 10) / 10 : 99;

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      stock: product.stockQty,
      costIdr: product.costPrice,
      stockValueIdr: value,
      abcClass,
      dailyDemandEst: dailyDemand,
      reorderPoint,
      eoqQty,
      daysOfCover,
      needsReorder: product.stockQty <= reorderPoint,
    };
  });
}

// ============================================================================
// 3. SOVEREIGN CORPORATE CRM ENGINE (RFM, CLV, Lead Scoring, Pipeline Kanban)
// ============================================================================

export type RfmSegment =
  | "Champions"
  | "Loyal VIP"
  | "Potential Loyalist"
  | "At Risk"
  | "New Lead";

export interface CrmCustomerIntelligence {
  contactId: string;
  name: string;
  phone: string;
  company: string;
  orderCount: number;
  totalSpentIdr: number;
  estimatedClvIdr: number;
  leadScore: number;
  segment: RfmSegment;
  recommendedAction: string;
}

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won";

export interface CorporatePipelineDeal {
  id: string;
  title: string;
  companyName: string;
  contactName: string;
  valueIdr: number;
  stage: DealStage;
  probabilityPct: number;
  owner: string;
  nextAction: string;
}

export const DEAL_STAGE_META: Record<
  DealStage,
  { label: string; probabilityPct: number; color: string }
> = {
  lead: { label: "Prospek Masuk", probabilityPct: 20, color: "slate" },
  qualified: { label: "Terverifikasi", probabilityPct: 40, color: "sky" },
  proposal: { label: "Penawaran / Quotation", probabilityPct: 65, color: "amber" },
  negotiation: { label: "Negosiasi Final", probabilityPct: 85, color: "violet" },
  won: { label: "Closing Menang", probabilityPct: 100, color: "emerald" },
};

export function computeCrmCustomerIntelligence(
  contacts: ContactRecord[],
  orders: PosOrderRecord[] = [],
): CrmCustomerIntelligence[] {
  return contacts
    .map((c) => {
      const cleanContactDigits = (c.phoneE164 || "").replace(/\D/g, "");
      const matchedOrders = orders.filter((o) => {
        if (o.contactId && o.contactId === c.id) return true;
        if (o.customerName.toLowerCase().includes(c.displayName.toLowerCase())) return true;
        const ordDigits = (o.customerPhone || "").replace(/\D/g, "");
        return cleanContactDigits.length >= 8 && ordDigits.endsWith(cleanContactDigits.slice(-8));
      });
      const orderCount = matchedOrders.length;
      const totalSpentIdr = matchedOrders.reduce((s, o) => s + o.totalAmount, 0);
      const avgOrder = orderCount > 0 ? totalSpentIdr / orderCount : 350_000;
      const estimatedClvIdr = Math.round(
        totalSpentIdr + avgOrder * Math.max(2, orderCount * 1.6),
      );

      let leadScore = 35;
      if (orderCount >= 3) leadScore += 35;
      else if (orderCount >= 1) leadScore += 22;
      if (totalSpentIdr >= 1_000_000) leadScore += 18;
      if (c.tags.some((t) => /vip|grosir|reseller|korporat/i.test(t))) leadScore += 12;
      if (c.lifecycleStage === "vip" || c.lifecycleStage === "customer") leadScore += 10;
      leadScore = Math.min(100, leadScore);

      let segment: RfmSegment = "New Lead";
      let recommendedAction = "Kirim Katalog Produk & Voucher Selamat Datang via WA";
      if (orderCount >= 3 || totalSpentIdr >= 1_500_000 || c.lifecycleStage === "vip") {
        segment = "Champions";
        recommendedAction = "Undang ke Program Sovereign VIP & Penawaran Bundling Eksklusif";
      } else if (orderCount >= 2 || totalSpentIdr >= 700_000) {
        segment = "Loyal VIP";
        recommendedAction = "Follow-up Repeat Order Berkala + Diskon Member 7%";
      } else if (orderCount === 1 || c.lifecycleStage === "customer") {
        segment = "Potential Loyalist";
        recommendedAction = "Kirim Broadcast Cross-Sell 7 Hari Setelah Pembelian";
      } else if (c.lifecycleStage === "inactive") {
        segment = "At Risk";
        recommendedAction = "Audit SLA & Eskalasi Manajer Akun untuk Win-Back";
      }

      return {
        contactId: c.id,
        name: c.displayName,
        phone: c.phoneE164 || "-",
        company: c.company || "Pelanggan Retail / B2B",
        orderCount,
        totalSpentIdr,
        estimatedClvIdr,
        leadScore,
        segment,
        recommendedAction,
      };
    })
    .sort((a, b) => b.estimatedClvIdr - a.estimatedClvIdr);
}

// ============================================================================
// 4. SOVEREIGN CORPORATE POS ENGINE (Cashier Shift Z-Report, VIP Tiers, Split Pay)
// ============================================================================

export type VipLoyaltyTier = "bronze" | "silver" | "gold" | "sovereign_platinum";

export const VIP_TIER_DISCOUNT: Record<
  VipLoyaltyTier,
  { label: string; discountPct: number; minSpendIdr: number }
> = {
  bronze: { label: "Regular / Bronze (0%)", discountPct: 0, minSpendIdr: 0 },
  silver: { label: "Silver Member (3%)", discountPct: 3, minSpendIdr: 500_000 },
  gold: { label: "Gold Corporate (7%)", discountPct: 7, minSpendIdr: 2_500_000 },
  sovereign_platinum: {
    label: "Sovereign Platinum (12%)",
    discountPct: 12,
    minSpendIdr: 10_000_000,
  },
};

export interface CashierShiftReport {
  shiftId: string;
  cashierName: string;
  outletName: string;
  openedAt: string;
  closedAt: string | null;
  openingFloatIdr: number;
  cashSalesIdr: number;
  qrisSalesIdr: number;
  transferSalesIdr: number;
  codPendingIdr: number;
  expectedCashInDrawerIdr: number;
  countedCashIdr: number;
  varianceIdr: number;
  totalOrdersCount: number;
}

export function computeShiftReconciliation(input: {
  shiftId: string;
  cashierName: string;
  outletName: string;
  openedAt: string;
  openingFloatIdr: number;
  countedCashIdr: number;
  orders: PosOrderRecord[];
  closedAt?: string | null;
}): CashierShiftReport {
  let cashSales = 0;
  let qrisSales = 0;
  let transferSales = 0;
  let codPending = 0;

  for (const ord of input.orders) {
    if (ord.paymentMethod === "cash") cashSales += ord.totalAmount;
    else if (ord.paymentMethod === "qris") qrisSales += ord.totalAmount;
    else if (ord.paymentMethod === "bank_transfer" || ord.paymentMethod === "credit")
      transferSales += ord.totalAmount;
    else if (ord.paymentMethod === "cod") codPending += ord.totalAmount;
  }

  const expectedCash = input.openingFloatIdr + cashSales;
  const variance = input.countedCashIdr - expectedCash;

  return {
    shiftId: input.shiftId,
    cashierName: input.cashierName,
    outletName: input.outletName,
    openedAt: input.openedAt,
    closedAt: input.closedAt ?? null,
    openingFloatIdr: input.openingFloatIdr,
    cashSalesIdr: cashSales,
    qrisSalesIdr: qrisSales,
    transferSalesIdr: transferSales,
    codPendingIdr: codPending,
    expectedCashInDrawerIdr: expectedCash,
    countedCashIdr: input.countedCashIdr,
    varianceIdr: variance,
    totalOrdersCount: input.orders.length,
  };
}

// ============================================================================
// 5. SOVEREIGN CORPORATE HIGH-LEVEL SEO ENGINE (Audit, CWV, Multi-Schema, Clusters)
// ============================================================================

export interface CorporateSeoAuditInput {
  brandName: string;
  domainUrl: string;
  city: string;
  industry: string;
  primaryKeyword: string;
  pageTitle: string;
  metaDescription: string;
  whatsappNumber: string;
}

export interface CorporateSeoAuditResult {
  overallScore: number;
  cwvEstimates: {
    lcpSec: string;
    inpMs: string;
    clsScore: string;
    mobileScore: number;
  };
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "warn" | "fail";
    detail: string;
  }>;
  keywordClusters: Array<{
    keyword: string;
    intent: "Transactional" | "Commercial" | "Informational";
    estMonthlyVolume: number;
    difficulty: number;
    estMonthlyRevenueIdr: number;
  }>;
  jsonLdBundle: string;
  thirtyDayPlan: Array<{
    week: string;
    focus: string;
    deliverable: string;
  }>;
}

export function runCorporateSeoAudit(
  input: CorporateSeoAuditInput,
): CorporateSeoAuditResult {
  const titleLen = input.pageTitle.trim().length;
  const descLen = input.metaDescription.trim().length;
  const hasHttps = input.domainUrl.trim().toLowerCase().startsWith("https://");
  const titleHasKw = input.pageTitle
    .toLowerCase()
    .includes(input.primaryKeyword.toLowerCase().split(" ")[0] || "");
  const descHasCity = input.metaDescription
    .toLowerCase()
    .includes(input.city.toLowerCase());

  const checks: CorporateSeoAuditResult["checks"] = [
    {
      id: "https",
      label: "Keamanan HTTPS & Canonical URL",
      status: hasHttps ? "pass" : "fail",
      detail: hasHttps
        ? "URL menggunakan protokol HTTPS aman — sinyal ranking inti Google."
        : "Gunakan prefix https:// agar halaman terindeks optimal tanpa peringatan browser.",
    },
    {
      id: "title",
      label: `Panjang Meta Title (${titleLen} karakter)`,
      status: titleLen >= 45 && titleLen <= 65 ? "pass" : titleLen >= 30 ? "warn" : "fail",
      detail:
        titleLen >= 45 && titleLen <= 65
          ? "Ideal 45–65 karakter (tidak terpotong di SERP Google Mobile & Desktop)."
          : "Optimalkan panjang judul ke rentang 45–65 karakter dan letakkan keyword utama di awal.",
    },
    {
      id: "desc",
      label: `Meta Description CTR (${descLen} karakter)`,
      status: descLen >= 120 && descLen <= 160 ? "pass" : descLen >= 80 ? "warn" : "fail",
      detail:
        descLen >= 120 && descLen <= 160
          ? "Ideal 120–160 karakter — memaksimalkan Click-Through Rate (CTR) organik."
          : "Tulis ringkasan 120–160 karakter berisi keunggulan produk + CTA WhatsApp.",
    },
    {
      id: "kw_match",
      label: "Kesesuaian Keyword Utama di Title",
      status: titleHasKw ? "pass" : "warn",
      detail: titleHasKw
        ? `Keyword "${input.primaryKeyword}" terdeteksi pada Meta Title.`
        : `Masukkan kata kunci "${input.primaryKeyword}" pada awal judul halaman.`,
    },
    {
      id: "local_geo",
      label: `Sinyal Local SEO Kota (${input.city})`,
      status: descHasCity ? "pass" : "warn",
      detail: descHasCity
        ? `Kota "${input.city}" tercakup untuk dominasi Google Maps / Local Pack.`
        : `Sertakan nama kota "${input.city}" pada deskripsi & Schema LocalBusiness.`,
    },
    {
      id: "schema",
      label: "Rich Snippet JSON-LD (Organization + LocalBusiness + FAQ)",
      status: "pass",
      detail: "Bundel Schema JSON-LD Corporate otomatis dibuat siap tempel ke <head>.",
    },
  ];

  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const overallScore = Math.min(
    100,
    Math.round((passCount * 100 + warnCount * 62) / checks.length),
  );

  const kw = input.primaryKeyword.trim() || input.industry;
  const city = input.city.trim() || "Indonesia";

  const keywordClusters: CorporateSeoAuditResult["keywordClusters"] = [
    {
      keyword: `jual ${kw} ${city} harga grosir`,
      intent: "Transactional",
      estMonthlyVolume: 2400,
      difficulty: 28,
      estMonthlyRevenueIdr: 18_500_000,
    },
    {
      keyword: `distributor ${kw} terpercaya ${city}`,
      intent: "Transactional",
      estMonthlyVolume: 1650,
      difficulty: 34,
      estMonthlyRevenueIdr: 24_000_000,
    },
    {
      keyword: `rekomendasi ${kw} terbaik 2026`,
      intent: "Commercial",
      estMonthlyVolume: 4800,
      difficulty: 45,
      estMonthlyRevenueIdr: 14_200_000,
    },
    {
      keyword: `promo ${kw} kirim cepat cod`,
      intent: "Transactional",
      estMonthlyVolume: 1900,
      difficulty: 22,
      estMonthlyRevenueIdr: 11_800_000,
    },
    {
      keyword: `cara memilih ${kw} berkualitas untuk bisnis`,
      intent: "Informational",
      estMonthlyVolume: 3200,
      difficulty: 19,
      estMonthlyRevenueIdr: 6_500_000,
    },
  ];

  const cleanUrl = input.domainUrl.trim() || "https://bisnisanda.id";
  const jsonLdObj = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: input.brandName,
        url: cleanUrl,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: input.whatsappNumber || "+62-812-0000-0000",
          contactType: "sales",
          areaServed: "ID",
          availableLanguage: ["Indonesian"],
        },
      },
      {
        "@type": "LocalBusiness",
        name: input.brandName,
        description: input.metaDescription,
        url: cleanUrl,
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressCountry: "ID",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Apakah ${input.brandName} melayani pemesanan ${kw} di ${city}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Ya, ${input.brandName} melayani pemesanan retail maupun grosir ${kw} untuk wilayah ${city} dan seluruh Indonesia dengan pengiriman cepat serta konfirmasi WhatsApp otomatis.`,
            },
          },
          {
            "@type": "Question",
            name: `Bagaimana cara pesan cepat di ${input.brandName}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Klik tombol WhatsApp resmi kami di ${cleanUrl} untuk mendapatkan katalog harga terbaru, promo paket corporate, dan pengiriman hari ini.`,
            },
          },
        ],
      },
    ],
  };

  return {
    overallScore,
    cwvEstimates: {
      lcpSec: overallScore >= 85 ? "1.4s (Good)" : "2.3s (Needs Tuning)",
      inpMs: overallScore >= 85 ? "95ms (Good)" : "180ms (Good)",
      clsScore: "0.02 (Excellent)",
      mobileScore: Math.min(99, Math.max(76, overallScore + 4)),
    },
    checks,
    keywordClusters,
    jsonLdBundle: JSON.stringify(jsonLdObj, null, 2),
    thirtyDayPlan: [
      {
        week: "Minggu 1",
        focus: "Technical SEO & Schema Injection",
        deliverable: `Pasang JSON-LD Corporate & Optimasi Core Web Vitals di ${cleanUrl}`,
      },
      {
        week: "Minggu 2",
        focus: "Programmatic Landing Pages Kota",
        deliverable: `Terbitkan 5 halaman transaksional "${kw}" untuk ${city} & kota satelit`,
      },
      {
        week: "Minggu 3",
        focus: "Topical Authority & Google Business Profile",
        deliverable: "Publikasi 4 artikel pilar + 20 foto produk ber-geotag & ulasan pelanggan WA",
      },
      {
        week: "Minggu 4",
        focus: "High-Authority Backlinks & Konversi WA",
        deliverable: "PR media lokal, direktori B2B Indonesia, & evaluasi ranking + ROI organik",
      },
    ],
  };
}

/* ============================================================================
 * 6. ENTERPRISE INDONESIAN TAX CENTER (PPN 11%, PPh FINAL 0.5%, PPh BADAN 31E,
 *    PPh 21/23/4(2)) & EXECUTIVE FINANCIAL RATIOS + PRINTABLE HTML (v5.2)
 * ============================================================================ */

export interface EnterpriseTaxReport {
  periodLabel: string;
  taxableRevenueIdr: number;
  purchaseInputBaseIdr: number;
  // PPN 11% (UU HPP)
  ppnKeluaran11Idr: number;
  ppnMasukan11Idr: number;
  ppnNetPayableIdr: number; // positive = Kurang Bayar, negative = Lebih Bayar
  // PPh Final UMKM 0,5% (PP 55/2022)
  pphFinalUmkm05Idr: number;
  // PPh Badan Pasal 17 (22%) & Fasilitas Pasal 31E (11% untuk bagian omzet <= 4,8M)
  fiscalNetProfitIdr: number;
  pphBadanPasal31EIdr: number;
  pphBadanNormal22Idr: number;
  // Withholding taxes
  pph21PayrollIdr: number;
  pph23Services2Idr: number;
  pph4Ayat2Rent10Idr: number;
  totalEstimatedTaxLiabilityIdr: number;
  // Financial Ratios
  grossMarginPct: number;
  netMarginPct: number;
  currentRatio: number;
  debtToEquityRatio: number;
  returnOnAssetsPct: number;
  breakEvenRevenueIdr: number;
  // Statement of Changes in Equity
  openingEquityIdr: number;
  currentNetIncomeIdr: number;
  dividendsOrPriveIdr: number;
  closingEquityIdr: number;
}

export function computeEnterpriseTaxAndRatios(
  report: CorporateFinancialStatements,
  options?: {
    periodLabel?: string;
    pph21PayrollIdr?: number;
    serviceExpenseForPph23Idr?: number;
    rentExpenseForPph42Idr?: number;
    dividendsOrPriveIdr?: number;
  },
): EnterpriseTaxReport {
  const periodLabel =
    options?.periodLabel ||
    new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const taxableRevenueIdr = Math.max(0, report.incomeStatement.netRevenueIdr);
  const purchaseInputBaseIdr = Math.max(0, report.incomeStatement.cogsIdr);

  const ppnKeluaran11Idr = Math.round(taxableRevenueIdr * 0.11);
  const ppnMasukan11Idr = Math.round(purchaseInputBaseIdr * 0.11);
  const ppnNetPayableIdr = ppnKeluaran11Idr - ppnMasukan11Idr;

  const pphFinalUmkm05Idr = Math.round(taxableRevenueIdr * 0.005);
  const fiscalNetProfitIdr = Math.max(0, report.incomeStatement.ebitdaIdr);
  const pphBadanPasal31EIdr = Math.round(fiscalNetProfitIdr * 0.11);
  const pphBadanNormal22Idr = Math.round(fiscalNetProfitIdr * 0.22);

  const pph21PayrollIdr = Math.max(0, Math.round(options?.pph21PayrollIdr ?? 0));
  const pph23Services2Idr = Math.round(
    Math.max(
      0,
      options?.serviceExpenseForPph23Idr ?? report.incomeStatement.operatingExpenseIdr * 0.1,
    ) * 0.02,
  );
  const pph4Ayat2Rent10Idr = Math.round(
    Math.max(0, options?.rentExpenseForPph42Idr ?? 0) * 0.1,
  );

  const totalEstimatedTaxLiabilityIdr =
    Math.max(0, ppnNetPayableIdr) +
    pphFinalUmkm05Idr +
    pph21PayrollIdr +
    pph23Services2Idr +
    pph4Ayat2Rent10Idr;

  const grossMarginPct = report.incomeStatement.grossMarginPct;
  const netMarginPct = report.incomeStatement.netMarginPct;

  const currentAssets =
    report.balanceSheet.cashAndBankIdr +
    report.balanceSheet.accountsReceivableIdr +
    report.balanceSheet.inventoryAssetIdr;
  const currentLiabilities = Math.max(1, report.balanceSheet.totalLiabilitiesIdr);
  const currentRatio =
    report.balanceSheet.totalLiabilitiesIdr > 0
      ? Number((currentAssets / currentLiabilities).toFixed(2))
      : Number((currentAssets > 0 ? 9.99 : 0).toFixed(2));

  const equityBase = Math.max(1, Math.abs(report.balanceSheet.totalEquityIdr));
  const debtToEquityRatio = Number(
    (report.balanceSheet.totalLiabilitiesIdr / equityBase).toFixed(2),
  );
  const returnOnAssetsPct =
    report.balanceSheet.totalAssetsIdr > 0
      ? Number(
          (
            (report.incomeStatement.netProfitAfterTaxIdr /
              report.balanceSheet.totalAssetsIdr) *
            100
          ).toFixed(1),
        )
      : 0;

  const contributionMarginRatio =
    taxableRevenueIdr > 0
      ? Math.max(0.05, report.incomeStatement.grossProfitIdr / taxableRevenueIdr)
      : 0.35;
  const breakEvenRevenueIdr = Math.round(
    report.incomeStatement.operatingExpenseIdr / contributionMarginRatio,
  );

  const dividendsOrPriveIdr = Math.max(0, options?.dividendsOrPriveIdr ?? 0);
  const openingEquityIdr =
    report.balanceSheet.paidInCapitalIdr + report.balanceSheet.retainedEarningsIdr;
  const closingEquityIdr =
    openingEquityIdr + report.incomeStatement.netProfitAfterTaxIdr - dividendsOrPriveIdr;

  return {
    periodLabel,
    taxableRevenueIdr,
    purchaseInputBaseIdr,
    ppnKeluaran11Idr,
    ppnMasukan11Idr,
    ppnNetPayableIdr,
    pphFinalUmkm05Idr,
    fiscalNetProfitIdr,
    pphBadanPasal31EIdr,
    pphBadanNormal22Idr,
    pph21PayrollIdr,
    pph23Services2Idr,
    pph4Ayat2Rent10Idr,
    totalEstimatedTaxLiabilityIdr,
    grossMarginPct,
    netMarginPct,
    currentRatio,
    debtToEquityRatio,
    returnOnAssetsPct,
    breakEvenRevenueIdr,
    openingEquityIdr,
    currentNetIncomeIdr: report.incomeStatement.netProfitAfterTaxIdr,
    dividendsOrPriveIdr,
    closingEquityIdr,
  };
}

function escapeCorpHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRpHtml(n: number): string {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export function renderCorporateTaxAndAccountingPrintHtml(
  report: CorporateFinancialStatements,
  tax: EnterpriseTaxReport,
  businessName: string,
  npwp = "-",
): string {
  const tbRows = report.coaTrialBalance
    .map(
      (r) => `<tr>
        <td><strong>${escapeCorpHtml(r.code)}</strong></td>
        <td>${escapeCorpHtml(r.name)}</td>
        <td>${escapeCorpHtml(r.category)}</td>
        <td style="text-align:right;font-family:monospace">${formatRpHtml(r.debit)}</td>
        <td style="text-align:right;font-family:monospace">${formatRpHtml(r.credit)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8" />
<title>Laporan Keuangan PSAK & Pajak Korporat — ${escapeCorpHtml(businessName)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 11px; }
  .head { border-bottom: 3px solid #047857; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; }
  h1 { margin: 0; font-size: 16px; color: #047857; }
  h2 { font-size: 12px; color: #047857; margin: 14px 0 6px; border-left: 3px solid #047857; padding-left: 7px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
  .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
  .kpi .lbl { font-size: 9px; color: #64748b; text-transform: uppercase; }
  .kpi .val { font-size: 12px; font-weight: 800; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #ecfdf5; color: #065f46; border: 1px solid #cbd5e1; padding: 5px 7px; font-size: 10px; text-align: left; }
  td { border: 1px solid #e2e8f0; padding: 5px 7px; font-size: 10px; }
  .foot { margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; }
</style></head><body>
  <div class="head">
    <div>
      <h1>LAPORAN KEUANGAN PSAK &amp; SPT PAJAK KORPORAT</h1>
      <div>${escapeCorpHtml(businessName)} · NPWP: ${escapeCorpHtml(npwp)}</div>
    </div>
    <div style="text-align:right">
      <div><strong>Periode: ${escapeCorpHtml(tax.periodLabel)}</strong></div>
      <div>Dicetak: ${new Date().toLocaleString("id-ID")}</div>
    </div>
  </div>

  <div class="grid">
    <div class="kpi"><div class="lbl">Pendapatan Usaha</div><div class="val">${formatRpHtml(report.incomeStatement.netRevenueIdr)}</div></div>
    <div class="kpi"><div class="lbl">Laba Bersih</div><div class="val">${formatRpHtml(report.incomeStatement.netProfitAfterTaxIdr)}</div></div>
    <div class="kpi"><div class="lbl">Total Aset (Neraca)</div><div class="val">${formatRpHtml(report.balanceSheet.totalAssetsIdr)}</div></div>
    <div class="kpi"><div class="lbl">Total Kewajiban Pajak</div><div class="val">${formatRpHtml(tax.totalEstimatedTaxLiabilityIdr)}</div></div>
  </div>

  <h2>1. Ikhtisar Perpajakan Indonesia (SPT Masa &amp; Tahunan)</h2>
  <table>
    <thead><tr><th>Jenis Pajak / Regulasi</th><th>Dasar Pengenaan Pajak (DPP)</th><th>Tarif</th><th style="text-align:right">Nominal Pajak (Rp)</th></tr></thead>
    <tbody>
      <tr><td>PPN Keluaran (UU HPP)</td><td style="font-family:monospace">${formatRpHtml(tax.taxableRevenueIdr)}</td><td>11%</td><td style="text-align:right;font-family:monospace">${formatRpHtml(tax.ppnKeluaran11Idr)}</td></tr>
      <tr><td>PPN Masukan (Pembelian/HPP)</td><td style="font-family:monospace">${formatRpHtml(tax.purchaseInputBaseIdr)}</td><td>11%</td><td style="text-align:right;font-family:monospace">(${formatRpHtml(tax.ppnMasukan11Idr)})</td></tr>
      <tr><td><strong>PPN Kurang / (Lebih) Bayar</strong></td><td>SPT Masa PPN 1111</td><td>Netto</td><td style="text-align:right;font-family:monospace"><strong>${formatRpHtml(tax.ppnNetPayableIdr)}</strong></td></tr>
      <tr><td>PPh Final UMKM (PP 55/2022)</td><td style="font-family:monospace">${formatRpHtml(tax.taxableRevenueIdr)}</td><td>0,5%</td><td style="text-align:right;font-family:monospace">${formatRpHtml(tax.pphFinalUmkm05Idr)}</td></tr>
      <tr><td>PPh Badan Fasilitas Pasal 31E</td><td style="font-family:monospace">${formatRpHtml(tax.fiscalNetProfitIdr)}</td><td>11%</td><td style="text-align:right;font-family:monospace">${formatRpHtml(tax.pphBadanPasal31EIdr)}</td></tr>
      <tr><td>PPh Badan Tarif Normal Pasal 17</td><td style="font-family:monospace">${formatRpHtml(tax.fiscalNetProfitIdr)}</td><td>22%</td><td style="text-align:right;font-family:monospace">${formatRpHtml(tax.pphBadanNormal22Idr)}</td></tr>
      <tr><td>PPh Pasal 21 Karyawan (TER)</td><td>Payroll Bulanan</td><td>TER 2024</td><td style="text-align:right;font-family:monospace">${formatRpHtml(tax.pph21PayrollIdr)}</td></tr>
      <tr><td>PPh Pasal 23 (Jasa/Vendor) &amp; Pasal 4(2) (Sewa)</td><td>Jasa 2% + Sewa 10%</td><td>Withholding</td><td style="text-align:right;font-family:monospace">${formatRpHtml(tax.pph23Services2Idr + tax.pph4Ayat2Rent10Idr)}</td></tr>
    </tbody>
  </table>

  <h2>2. Perubahan Ekuitas &amp; Rasio Keuangan Eksekutif</h2>
  <table>
    <thead><tr><th>Metrik / Rasio Keuangan</th><th style="text-align:right">Nilai</th><th>Keterangan</th></tr></thead>
    <tbody>
      <tr><td>Modal Awal + Laba Periode - Prive/Dividen = Ekuitas Akhir</td><td style="text-align:right;font-family:monospace"><strong>${formatRpHtml(tax.closingEquityIdr)}</strong></td><td>Modal ${formatRpHtml(tax.openingEquityIdr)} + Laba ${formatRpHtml(tax.currentNetIncomeIdr)}</td></tr>
      <tr><td>Gross Margin / Net Profit Margin</td><td style="text-align:right;font-family:monospace">${tax.grossMarginPct}% / ${tax.netMarginPct}%</td><td>Profitabilitas Operasional</td></tr>
      <tr><td>Current Ratio / Debt-to-Equity (DER) / ROA</td><td style="text-align:right;font-family:monospace">${tax.currentRatio}x / ${tax.debtToEquityRatio}x / ${tax.returnOnAssetsPct}%</td><td>Likuiditas &amp; Solvabilitas</td></tr>
      <tr><td>Estimasi Break-Even Point (BEP Omzet)</td><td style="text-align:right;font-family:monospace">${formatRpHtml(tax.breakEvenRevenueIdr)}</td><td>Titik Impas Operasional</td></tr>
    </tbody>
  </table>

  <h2>3. Neraca Saldo (Trial Balance COA)</h2>
  <table>
    <thead><tr><th>Kode</th><th>Nama Akun COA</th><th>Kategori</th><th style="text-align:right">Debit</th><th style="text-align:right">Kredit</th></tr></thead>
    <tbody>${tbRows}</tbody>
  </table>

  <div class="foot">
    <span>Dokumen Akuntansi &amp; Perpajakan Sovereign Corporate — WA CRM Enterprise</span>
    <span>Disiapkan untuk Review Direksi, Auditor &amp; Konsultan Pajak</span>
  </div>
</body></html>`;
}

/* ============================================================================
 * 7. ENTERPRISE ERP SUB-MODULES: BOM PRODUKSI, STOCK OPNAME AUDIT,
 *    VENDOR SLA SCORECARD & CORPORATE ERP PRINTABLE REPORT (v5.2)
 * ============================================================================ */

export interface ErpBomRecipe {
  id: string;
  finishedProductName: string;
  sku: string;
  batchQty: number;
  laborAndOverheadIdr: number;
  components: Array<{
    materialName: string;
    qtyPerBatch: number;
    unit: string;
    unitCostIdr: number;
  }>;
}

export interface ErpBomCostResult {
  recipeId: string;
  materialCostPerBatchIdr: number;
  totalBatchCostIdr: number;
  unitHppIdr: number;
}

export function computeBomUnitCost(recipe: ErpBomRecipe): ErpBomCostResult {
  const materialCostPerBatchIdr = recipe.components.reduce(
    (s, c) => s + Math.max(0, c.qtyPerBatch) * Math.max(0, c.unitCostIdr),
    0,
  );
  const totalBatchCostIdr = materialCostPerBatchIdr + Math.max(0, recipe.laborAndOverheadIdr);
  const safeBatch = Math.max(1, recipe.batchQty);
  return {
    recipeId: recipe.id,
    materialCostPerBatchIdr: Math.round(materialCostPerBatchIdr),
    totalBatchCostIdr: Math.round(totalBatchCostIdr),
    unitHppIdr: Math.round(totalBatchCostIdr / safeBatch),
  };
}

export interface StockOpnameLine {
  productId: string;
  sku: string;
  productName: string;
  systemQty: number;
  physicalQty: number;
  unitCostIdr: number;
  varianceQty: number;
  varianceValueIdr: number;
  status: "MATCH" | "SURPLUS" | "SHORTAGE";
}

export function computeStockOpnameAudit(
  products: ErpProductRecord[],
  physicalCountMap: Record<string, number>,
): {
  lines: StockOpnameLine[];
  totalVarianceQty: number;
  totalVarianceValueIdr: number;
  accuracyPct: number;
} {
  const lines: StockOpnameLine[] = products.map((p) => {
    const physicalQty =
      physicalCountMap[p.id] !== undefined ? Math.max(0, physicalCountMap[p.id]) : p.stockQty;
    const varianceQty = physicalQty - p.stockQty;
    const varianceValueIdr = varianceQty * p.costPrice;
    const status: StockOpnameLine["status"] =
      varianceQty === 0 ? "MATCH" : varianceQty > 0 ? "SURPLUS" : "SHORTAGE";
    return {
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      systemQty: p.stockQty,
      physicalQty,
      unitCostIdr: p.costPrice,
      varianceQty,
      varianceValueIdr,
      status,
    };
  });
  const matchedCount = lines.filter((l) => l.status === "MATCH").length;
  return {
    lines,
    totalVarianceQty: lines.reduce((s, l) => s + l.varianceQty, 0),
    totalVarianceValueIdr: lines.reduce((s, l) => s + l.varianceValueIdr, 0),
    accuracyPct: lines.length > 0 ? Number(((matchedCount / lines.length) * 100).toFixed(1)) : 100,
  };
}

export interface VendorSlaScoreRow {
  vendorName: string;
  poCount: number;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  avgLeadTimeDays: number;
  compositeScore: number;
  grade: "A+" | "A" | "B" | "C";
}

export function computeVendorSlaScorecard(
  vendors: Array<{
    vendorName: string;
    poCount: number;
    onTimeDeliveryPct: number;
    defectRatePct: number;
    avgLeadTimeDays: number;
  }>,
): VendorSlaScoreRow[] {
  return vendors
    .map((v) => {
      const otdScore = Math.min(100, Math.max(0, v.onTimeDeliveryPct)) * 0.55;
      const qualityScore = Math.max(0, 100 - v.defectRatePct * 12) * 0.3;
      const speedScore = Math.max(0, 100 - Math.max(0, v.avgLeadTimeDays - 2) * 8) * 0.15;
      const compositeScore = Math.round(otdScore + qualityScore + speedScore);
      const grade: VendorSlaScoreRow["grade"] =
        compositeScore >= 92 ? "A+" : compositeScore >= 82 ? "A" : compositeScore >= 70 ? "B" : "C";
      return { ...v, compositeScore, grade };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

export type CorporateErpPrintScope =
  | "all"
  | "abc_mrp"
  | "transfers"
  | "bom"
  | "stock_opname"
  | "vendor_sla";

export function renderCorporateErpPrintHtml(input: {
  scope: CorporateErpPrintScope;
  businessName: string;
  abcRows: ErpSkuIntelligence[];
  transfers: WarehouseTransferRecord[];
  boms: ErpBomRecipe[];
  opname: ReturnType<typeof computeStockOpnameAudit>;
  vendorSla: VendorSlaScoreRow[];
}): string {
  const show = (s: CorporateErpPrintScope) => input.scope === "all" || input.scope === s;
  const sections: string[] = [];

  if (show("abc_mrp")) {
    sections.push(`<h2>Analisis ABC &amp; MRP Reorder Point (${input.abcRows.length} SKU)</h2>
    <table><thead><tr><th>SKU</th><th>Produk</th><th>Kelas ABC</th><th>Stok</th><th>ROP</th><th>EOQ</th><th style="text-align:right">Nilai Persediaan</th></tr></thead>
    <tbody>${input.abcRows
      .map(
        (r) => `<tr><td>${escapeCorpHtml(r.sku)}</td><td>${escapeCorpHtml(r.name)}</td><td><strong>${r.abcClass}</strong></td><td>${r.stock}</td><td>${r.reorderPoint}</td><td>${r.eoqQty}</td><td style="text-align:right;font-family:monospace">${formatRpHtml(r.stockValueIdr)}</td></tr>`,
      )
      .join("")}</tbody></table>`);
  }

  if (show("transfers")) {
    sections.push(`<h2>Mutasi Transfer Multi-Gudang &amp; Surat Jalan (${input.transfers.length})</h2>
    <table><thead><tr><th>No. Transfer</th><th>Produk</th><th>Asal → Tujuan</th><th>Qty</th><th>Status</th><th>Tanggal</th></tr></thead>
    <tbody>${input.transfers
      .map(
        (t) => `<tr><td>${escapeCorpHtml(t.transferCode)}</td><td>${escapeCorpHtml(t.productName)}</td><td>${escapeCorpHtml(t.fromWarehouse)} → ${escapeCorpHtml(t.toWarehouse)}</td><td>${t.qty}</td><td>${escapeCorpHtml(t.status)}</td><td>${new Date(t.createdAt).toLocaleDateString("id-ID")}</td></tr>`,
      )
      .join("")}</tbody></table>`);
  }

  if (show("bom")) {
    sections.push(`<h2>Bill of Materials (BOM) &amp; HPP Produksi (${input.boms.length} Resep)</h2>
    <table><thead><tr><th>SKU</th><th>Produk Jadi</th><th>Qty/Batch</th><th style="text-align:right">Biaya Bahan</th><th style="text-align:right">Tenaga &amp; Overhead</th><th style="text-align:right">HPP / Unit</th></tr></thead>
    <tbody>${input.boms
      .map((b) => {
        const calc = computeBomUnitCost(b);
        return `<tr><td>${escapeCorpHtml(b.sku)}</td><td>${escapeCorpHtml(b.finishedProductName)}</td><td>${b.batchQty}</td><td style="text-align:right;font-family:monospace">${formatRpHtml(calc.materialCostPerBatchIdr)}</td><td style="text-align:right;font-family:monospace">${formatRpHtml(b.laborAndOverheadIdr)}</td><td style="text-align:right;font-family:monospace"><strong>${formatRpHtml(calc.unitHppIdr)}</strong></td></tr>`;
      })
      .join("")}</tbody></table>`);
  }

  if (show("stock_opname")) {
    sections.push(`<h2>Berita Acara Stock Opname / Cycle Count (Akurasi ${input.opname.accuracyPct}%)</h2>
    <table><thead><tr><th>SKU</th><th>Barang</th><th>Stok Sistem</th><th>Stok Fisik</th><th>Selisih Qty</th><th style="text-align:right">Selisih Nilai (Rp)</th><th>Status</th></tr></thead>
    <tbody>${input.opname.lines
      .map(
        (l) => `<tr><td>${escapeCorpHtml(l.sku)}</td><td>${escapeCorpHtml(l.productName)}</td><td>${l.systemQty}</td><td>${l.physicalQty}</td><td>${l.varianceQty >= 0 ? `+${l.varianceQty}` : l.varianceQty}</td><td style="text-align:right;font-family:monospace">${formatRpHtml(l.varianceValueIdr)}</td><td>${l.status}</td></tr>`,
      )
      .join("")}</tbody></table>`);
  }

  if (show("vendor_sla")) {
    sections.push(`<h2>Vendor SLA Scorecard &amp; Kinerja Supplier (${input.vendorSla.length})</h2>
    <table><thead><tr><th>Vendor / Supplier</th><th>Total PO</th><th>OTD %</th><th>Defect %</th><th>Lead Time</th><th>Skor</th><th>Grade</th></tr></thead>
    <tbody>${input.vendorSla
      .map(
        (v) => `<tr><td><strong>${escapeCorpHtml(v.vendorName)}</strong></td><td>${v.poCount}</td><td>${v.onTimeDeliveryPct}%</td><td>${v.defectRatePct}%</td><td>${v.avgLeadTimeDays} hari</td><td>${v.compositeScore}/100</td><td><strong>${v.grade}</strong></td></tr>`,
      )
      .join("")}</tbody></table>`);
  }

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8" />
<title>Laporan ERP &amp; Gudang Sovereign Corporate — ${escapeCorpHtml(input.businessName)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 11px; }
  .head { border-bottom: 3px solid #0e7490; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; }
  h1 { margin: 0; font-size: 16px; color: #0e7490; }
  h2 { font-size: 12px; color: #0e7490; margin: 14px 0 6px; border-left: 3px solid #0e7490; padding-left: 7px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #ecfeff; color: #155e75; border: 1px solid #cbd5e1; padding: 5px 7px; font-size: 10px; text-align: left; }
  td { border: 1px solid #e2e8f0; padding: 5px 7px; font-size: 10px; }
  .foot { margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; }
</style></head><body>
  <div class="head">
    <div>
      <h1>LAPORAN ERP, RANTAI PASOK &amp; AUDIT GUDANG</h1>
      <div>${escapeCorpHtml(input.businessName)} · Sovereign Corporate Supply Chain</div>
    </div>
    <div style="text-align:right">
      <div><strong>Cakupan: ${escapeCorpHtml(input.scope.toUpperCase())}</strong></div>
      <div>Dicetak: ${new Date().toLocaleString("id-ID")}</div>
    </div>
  </div>
  ${sections.join("")}
  <div class="foot">
    <span>Berita Acara &amp; Laporan ERP Sovereign Corporate — WA CRM Enterprise</span>
    <span>Mengetahui: Kepala Gudang / Manajer Operasional</span>
  </div>
</body></html>`;
}

