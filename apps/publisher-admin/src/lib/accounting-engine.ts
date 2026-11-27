import type {
  AccountType,
  ChartOfAccountRecord,
  JournalEntryRecord,
  JournalLineRecord,
  SubscriptionInvoiceRecord,
} from "./publisher-types";

export const DEFAULT_PUBLISHER_COA: ChartOfAccountRecord[] = [
  // Assets (1xxx)
  { code: "1101", name: "Kas & Bank BCA Operasional", type: "asset", normalBalance: "debit", category: "Kas & Bank", isSystem: true },
  { code: "1102", name: "Bank Mandiri Escrow & Billing", type: "asset", normalBalance: "debit", category: "Kas & Bank", isSystem: true },
  { code: "1201", name: "Piutang Langganan Lisensi (AR)", type: "asset", normalBalance: "debit", category: "Piutang Usaha", isSystem: true },
  { code: "1301", name: "Persediaan Perangkat POS & Printer", type: "asset", normalBalance: "debit", category: "Persediaan", isSystem: true },
  { code: "1401", name: "PPN Masukan (Pajak Dibayar Dimuka)", type: "asset", normalBalance: "debit", category: "Pajak Dibayar Dimuka", isSystem: true },
  { code: "1501", name: "Aset Tetap Server & Perangkat R&D", type: "asset", normalBalance: "debit", category: "Aset Tetap", isSystem: true },

  // Liabilities (2xxx)
  { code: "2101", name: "Hutang Vendor Cloud & AI (AP)", type: "liability", normalBalance: "credit", category: "Liabilitas Jangka Pendek", isSystem: true },
  { code: "2102", name: "Hutang Komisi Reseller & Partner", type: "liability", normalBalance: "credit", category: "Liabilitas Jangka Pendek", isSystem: true },
  { code: "2103", name: "Hutang PPN Keluaran (11%)", type: "liability", normalBalance: "credit", category: "Hutang Pajak", isSystem: true },
  { code: "2104", name: "Hutang PPh 21 / PPh 23", type: "liability", normalBalance: "credit", category: "Hutang Pajak", isSystem: true },
  { code: "2201", name: "Pendapatan Ditangguhkan (Deferred SaaS Revenue)", type: "liability", normalBalance: "credit", category: "Liabilitas Kontrak PSAK 72", isSystem: true },

  // Equity (3xxx)
  { code: "3101", name: "Modal Disetor PT WACRM Digital Nusantara", type: "equity", normalBalance: "credit", category: "Ekuitas", isSystem: true },
  { code: "3201", name: "Laba Ditahan (Retained Earnings)", type: "equity", normalBalance: "credit", category: "Ekuitas", isSystem: true },

  // Revenue (4xxx)
  { code: "4101", name: "Pendapatan Lisensi SaaS Diakui (Recognized)", type: "revenue", normalBalance: "credit", category: "Pendapatan SaaS", isSystem: true },
  { code: "4102", name: "Pendapatan Add-On AI Token & Kanal Ekstra", type: "revenue", normalBalance: "credit", category: "Pendapatan SaaS", isSystem: true },
  { code: "4103", name: "Pendapatan Implementasi, Custom APK & Hardware", type: "revenue", normalBalance: "credit", category: "Pendapatan Layanan", isSystem: true },

  // COGS (5xxx)
  { code: "5101", name: "HPP Infrastruktur Cloud, DB Neon & Vercel", type: "cogs", normalBalance: "debit", category: "Beban Pokok SaaS", isSystem: true },
  { code: "5102", name: "HPP API LLM AI & WhatsApp Cloud BSP", type: "cogs", normalBalance: "debit", category: "Beban Pokok SaaS", isSystem: true },
  { code: "5103", name: "HPP Perangkat Thermal/EDC Bundling", type: "cogs", normalBalance: "debit", category: "Beban Pokok Hardware", isSystem: true },

  // Operating Expenses (6xxx)
  { code: "6101", name: "Beban Gaji Engineering, R&D & Operasional", type: "expense", normalBalance: "debit", category: "Beban Operasional", isSystem: true },
  { code: "6102", name: "Beban Komisi Reseller & Sales AE", type: "expense", normalBalance: "debit", category: "Beban Penjualan", isSystem: true },
  { code: "6103", name: "Beban Pemasaran, SEO B2B & Akuisisi", type: "expense", normalBalance: "debit", category: "Beban Pemasaran", isSystem: true },
  { code: "6104", name: "Beban Operasional Kantor, Legal & Support SLA", type: "expense", normalBalance: "debit", category: "Beban Umum & Administrasi", isSystem: true },
];

export function validateBalancedJournal(
  lines: Array<{ accountCode: string; debit: number; credit: number }>,
): { valid: boolean; totalDebit: number; totalCredit: number; error?: string } {
  if (lines.length < 2) {
    return { valid: false, totalDebit: 0, totalCredit: 0, error: "Jurnal wajib memiliki minimal 2 baris (Debit & Kredit)." };
  }
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    if (!line.accountCode) {
      return { valid: false, totalDebit: 0, totalCredit: 0, error: "Setiap baris wajib memiliki kode akun CoA." };
    }
    if (line.debit < 0 || line.credit < 0) {
      return { valid: false, totalDebit: 0, totalCredit: 0, error: "Nominal Debit/Kredit tidak boleh negatif." };
    }
    totalDebit += Math.round(line.debit);
    totalCredit += Math.round(line.credit);
  }
  if (totalDebit <= 0) {
    return { valid: false, totalDebit, totalCredit, error: "Total nilai jurnal harus lebih besar dari Rp 0." };
  }
  if (totalDebit !== totalCredit) {
    return {
      valid: false,
      totalDebit,
      totalCredit,
      error: `Jurnal tidak seimbang (Selisih Rp ${Math.abs(totalDebit - totalCredit).toLocaleString("id-ID")}). Total Debit wajib sama dengan Total Kredit.`,
    };
  }
  return { valid: true, totalDebit, totalCredit };
}

export function buildJournalEntry(params: {
  id: string;
  journalNumber: string;
  date: string;
  reference: string;
  description: string;
  sourceModule: JournalEntryRecord["sourceModule"];
  postedBy: string;
  coa: ChartOfAccountRecord[];
  rawLines: Array<{ accountCode: string; debit: number; credit: number; memo?: string }>;
}): JournalEntryRecord {
  const check = validateBalancedJournal(params.rawLines);
  if (!check.valid) {
    throw new Error(check.error || "Jurnal double-entry tidak seimbang.");
  }

  const coaMap = new Map(params.coa.map((a) => [a.code, a.name]));
  const lines: JournalLineRecord[] = params.rawLines
    .filter((l) => l.debit > 0 || l.credit > 0)
    .map((l) => ({
      accountCode: l.accountCode,
      accountName: coaMap.get(l.accountCode) || `Akun ${l.accountCode}`,
      debit: Math.round(l.debit),
      credit: Math.round(l.credit),
      memo: l.memo,
    }));

  return {
    id: params.id,
    journalNumber: params.journalNumber,
    date: params.date,
    reference: params.reference,
    description: params.description,
    sourceModule: params.sourceModule,
    lines,
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
    postedBy: params.postedBy,
  };
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: "debit" | "credit";
  totalDebit: number;
  totalCredit: number;
  endingDebit: number;
  endingCredit: number;
  signedBalance: number; // positive in normal balance direction
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  sumEndingDebit: number;
  sumEndingCredit: number;
  balanced: boolean;
}

export function computeTrialBalance(
  coa: ChartOfAccountRecord[],
  journals: JournalEntryRecord[],
): TrialBalanceReport {
  const agg = new Map<string, { debit: number; credit: number }>();
  for (const acc of coa) {
    agg.set(acc.code, { debit: 0, credit: 0 });
  }
  for (const j of journals) {
    for (const line of j.lines) {
      const curr = agg.get(line.accountCode) ?? { debit: 0, credit: 0 };
      curr.debit += Math.round(line.debit);
      curr.credit += Math.round(line.credit);
      agg.set(line.accountCode, curr);
    }
  }

  const rows: TrialBalanceRow[] = [];
  let sumEndingDebit = 0;
  let sumEndingCredit = 0;

  for (const acc of coa) {
    const totals = agg.get(acc.code) ?? { debit: 0, credit: 0 };
    const netDebit = totals.debit - totals.credit;
    const endingDebit = netDebit > 0 ? netDebit : 0;
    const endingCredit = netDebit < 0 ? Math.abs(netDebit) : 0;
    const signedBalance = acc.normalBalance === "debit" ? netDebit : -netDebit;

    sumEndingDebit += endingDebit;
    sumEndingCredit += endingCredit;

    if (totals.debit > 0 || totals.credit > 0) {
      rows.push({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        endingDebit,
        endingCredit,
        signedBalance,
      });
    }
  }

  return {
    rows,
    sumEndingDebit,
    sumEndingCredit,
    balanced: sumEndingDebit === sumEndingCredit,
  };
}

export interface GeneralLedgerRow {
  journalId: string;
  journalNumber: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function computeGeneralLedgerForAccount(
  account: ChartOfAccountRecord,
  journals: JournalEntryRecord[],
): GeneralLedgerRow[] {
  const ordered = [...journals].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const out: GeneralLedgerRow[] = [];

  for (const j of ordered) {
    for (const line of j.lines) {
      if (line.accountCode !== account.code) continue;
      const delta =
        account.normalBalance === "debit" ? line.debit - line.credit : line.credit - line.debit;
      running += delta;
      out.push({
        journalId: j.id,
        journalNumber: j.journalNumber,
        date: j.date,
        reference: j.reference,
        description: line.memo || j.description,
        debit: line.debit,
        credit: line.credit,
        runningBalance: running,
      });
    }
  }

  return out;
}

export interface IncomeStatementReport {
  revenueRows: Array<{ code: string; name: string; amount: number }>;
  totalRevenue: number;
  cogsRows: Array<{ code: string; name: string; amount: number }>;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  expenseRows: Array<{ code: string; name: string; amount: number }>;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
}

export function computeIncomeStatement(
  coa: ChartOfAccountRecord[],
  journals: JournalEntryRecord[],
): IncomeStatementReport {
  const tb = computeTrialBalance(coa, journals);
  const revenueRows = tb.rows
    .filter((r) => r.type === "revenue")
    .map((r) => ({ code: r.code, name: r.name, amount: r.signedBalance }));
  const cogsRows = tb.rows
    .filter((r) => r.type === "cogs")
    .map((r) => ({ code: r.code, name: r.name, amount: r.signedBalance }));
  const expenseRows = tb.rows
    .filter((r) => r.type === "expense")
    .map((r) => ({ code: r.code, name: r.name, amount: r.signedBalance }));

  const totalRevenue = revenueRows.reduce((s, r) => s + r.amount, 0);
  const totalCogs = cogsRows.reduce((s, r) => s + r.amount, 0);
  const grossProfit = totalRevenue - totalCogs;
  const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  return {
    revenueRows,
    totalRevenue,
    cogsRows,
    totalCogs,
    grossProfit,
    grossMarginPct: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0,
    expenseRows,
    totalExpenses,
    netProfit,
    netMarginPct: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0,
  };
}

export interface BalanceSheetReport {
  assets: Array<{ code: string; name: string; amount: number }>;
  totalAssets: number;
  liabilities: Array<{ code: string; name: string; amount: number }>;
  totalLiabilities: number;
  equity: Array<{ code: string; name: string; amount: number }>;
  currentPeriodNetProfit: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
  deferredRevenueBalance: number;
  cashAndBankBalance: number;
}

export function computeBalanceSheet(
  coa: ChartOfAccountRecord[],
  journals: JournalEntryRecord[],
): BalanceSheetReport {
  const tb = computeTrialBalance(coa, journals);
  const pl = computeIncomeStatement(coa, journals);

  const assets = tb.rows
    .filter((r) => r.type === "asset")
    .map((r) => ({ code: r.code, name: r.name, amount: r.signedBalance }));
  const liabilities = tb.rows
    .filter((r) => r.type === "liability")
    .map((r) => ({ code: r.code, name: r.name, amount: r.signedBalance }));
  const equity = tb.rows
    .filter((r) => r.type === "equity")
    .map((r) => ({ code: r.code, name: r.name, amount: r.signedBalance }));

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const baseEquity = equity.reduce((s, r) => s + r.amount, 0);
  const totalEquity = baseEquity + pl.netProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const deferredRevenueBalance =
    liabilities.find((l) => l.code === "2201")?.amount ?? 0;
  const cashAndBankBalance = assets
    .filter((a) => a.code === "1101" || a.code === "1102")
    .reduce((s, a) => s + a.amount, 0);

  return {
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    currentPeriodNetProfit: pl.netProfit,
    totalEquity,
    totalLiabilitiesAndEquity,
    balanced: totalAssets === totalLiabilitiesAndEquity,
    deferredRevenueBalance,
    cashAndBankBalance,
  };
}

export interface CashFlowReport {
  operatingInflows: number;
  operatingOutflows: number;
  netOperatingCash: number;
  investingCash: number;
  financingCash: number;
  netCashChange: number;
  endingCashBalance: number;
}

export function computeCashFlowStatement(journals: JournalEntryRecord[]): CashFlowReport {
  let operatingInflows = 0;
  let operatingOutflows = 0;
  let investingCash = 0;
  let financingCash = 0;

  for (const j of journals) {
    const cashLines = j.lines.filter((l) => l.accountCode === "1101" || l.accountCode === "1102");
    if (cashLines.length === 0) continue;

    const netCashForJournal = cashLines.reduce((s, l) => s + (l.debit - l.credit), 0);
    const hasEquityCounter = j.lines.some((l) => l.accountCode.startsWith("3"));
    const hasFixedAssetCounter = j.lines.some((l) => l.accountCode === "1501");

    if (j.sourceModule === "opening" || hasEquityCounter) {
      financingCash += netCashForJournal;
    } else if (hasFixedAssetCounter) {
      investingCash += netCashForJournal;
    } else if (netCashForJournal >= 0) {
      operatingInflows += netCashForJournal;
    } else {
      operatingOutflows += Math.abs(netCashForJournal);
    }
  }

  const netOperatingCash = operatingInflows - operatingOutflows;
  const netCashChange = netOperatingCash + investingCash + financingCash;

  return {
    operatingInflows,
    operatingOutflows,
    netOperatingCash,
    investingCash,
    financingCash,
    netCashChange,
    endingCashBalance: netCashChange,
  };
}

export interface TaxSummaryReport {
  ppnOutputIdr: number;
  ppnInputIdr: number;
  netPpnPayableIdr: number;
  pphPayableIdr: number;
  taxableSalesIdr: number;
  paidInvoiceCount: number;
}

export function computeTaxSummary(
  coa: ChartOfAccountRecord[],
  journals: JournalEntryRecord[],
  invoices: SubscriptionInvoiceRecord[],
): TaxSummaryReport {
  const tb = computeTrialBalance(coa, journals);
  const ppnOutputIdr = tb.rows.find((r) => r.code === "2103")?.signedBalance ?? 0;
  const ppnInputIdr = tb.rows.find((r) => r.code === "1401")?.signedBalance ?? 0;
  const pphPayableIdr = tb.rows.find((r) => r.code === "2104")?.signedBalance ?? 0;
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const taxableSalesIdr = paidInvoices.reduce((s, i) => s + i.subtotalIdr, 0);

  return {
    ppnOutputIdr,
    ppnInputIdr,
    netPpnPayableIdr: ppnOutputIdr - ppnInputIdr,
    pphPayableIdr,
    taxableSalesIdr,
    paidInvoiceCount: paidInvoices.length,
  };
}

export function exportJournalsToCsv(journals: JournalEntryRecord[]): string {
  const headers = ["Tanggal", "No Jurnal", "Referensi", "Modul", "Kode Akun", "Nama Akun", "Debit", "Kredit", "Keterangan"];
  const rows = [headers.join(",")];
  for (const j of journals) {
    for (const l of j.lines) {
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      rows.push(
        [
          j.date,
          esc(j.journalNumber),
          esc(j.reference),
          j.sourceModule,
          l.accountCode,
          esc(l.accountName),
          String(l.debit),
          String(l.credit),
          esc(l.memo || j.description),
        ].join(","),
      );
    }
  }
  return rows.join("\n");
}
