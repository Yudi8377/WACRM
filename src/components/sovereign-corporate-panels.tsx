"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Copy,
  Crown,
  Factory,
  Globe2,
  Layers,
  Lock,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  formatIdr,
  type AccountingEntryRecord,
  type AppEditionId,
  type ContactRecord,
  type ErpProductRecord,
  type FinancialReportSummary,
  type PosOrderRecord,
} from "@/lib/crm-types";
import { ReportExportHub } from "@/components/report-export-hub";
import { UniversalPrintPanel } from "@/components/universal-print-panel";
import { buildEscPosTextReport } from "@/lib/printer";
import {
  buildCorporateFinancialStatements,
  computeBomUnitCost,
  computeCrmCustomerIntelligence,
  computeEnterpriseTaxAndRatios,
  computeErpInventoryIntelligence,
  computeShiftReconciliation,
  computeStockOpnameAudit,
  computeVendorSlaScorecard,
  DEAL_STAGE_META,
  renderCorporateErpPrintHtml,
  renderCorporateTaxAndAccountingPrintHtml,
  runCorporateSeoAudit,
  VIP_TIER_DISCOUNT,
  type CorporateErpPrintScope,
  type CorporatePipelineDeal,
  type CorporatePurchaseOrder,
  type DealStage,
  type ErpBomRecipe,
  type VipLoyaltyTier,
  type WarehouseTransferRecord,
} from "@/lib/sovereign-corporate";

function SovereignBadge({
  editionId,
  moduleLabel,
}: {
  editionId?: AppEditionId;
  moduleLabel: string;
}) {
  const isSovereign = editionId === "sovereign";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold text-amber-200">
        <Crown className="h-3.5 w-3.5 text-amber-400" />
        Sovereign Corporate · {moduleLabel}
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
          isSovereign
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-slate-800 text-slate-300"
        }`}
      >
        {isSovereign ? "EDISI SOVEREIGN AKTIF" : `Mode Preview (${(editionId || "starter").toUpperCase()})`}
      </span>
    </div>
  );
}

function SovereignLockedUpgradeCard({
  editionId,
  suiteTitle,
  subtitle,
  lockedCapabilities,
  onOpenEditions,
}: {
  editionId?: AppEditionId;
  suiteTitle: string;
  subtitle: string;
  lockedCapabilities: string[];
  onOpenEditions?: () => void;
}) {
  return (
    <section className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-950 p-5 text-slate-100 shadow-xl md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold text-amber-200">
          <Lock className="h-3.5 w-3.5 text-amber-400" />
          EKSKLUSIF SOVEREIGN CORPORATE · TERKUNCI DI EDISI {(editionId || "starter").toUpperCase()}
        </div>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
          License Key Sovereign Diperlukan
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <Crown className="h-5 w-5 text-amber-400" />
            {suiteTitle}
          </h3>
          <p className="text-xs leading-relaxed text-slate-300">{subtitle}</p>
          <div className="grid gap-1.5 pt-1 text-[11px] text-amber-100/90 sm:grid-cols-2">
            {lockedCapabilities.map((cap) => (
              <div
                key={cap}
                className="flex items-start gap-1.5 rounded-xl border border-amber-500/20 bg-slate-900/80 px-2.5 py-1.5"
              >
                <Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          {onOpenEditions ? (
            <button
              type="button"
              onClick={onOpenEditions}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-amber-300"
            >
              <Crown className="h-4 w-4" /> Upgrade ke Sovereign Corporate
            </button>
          ) : (
            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-200">
              Buka Menu Edisi &amp; Lisensi → Sovereign Corporate
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 1. SOVEREIGN CORPORATE ACCOUNTING SUITE (#3)
// ============================================================================

export function SovereignAccountingSuite(props: {
  editionId?: AppEditionId;
  businessName: string;
  summary: FinancialReportSummary;
  orders: PosOrderRecord[];
  products: ErpProductRecord[];
  entries: AccountingEntryRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  if (props.editionId !== "sovereign") {
    return (
      <SovereignLockedUpgradeCard
        editionId={props.editionId}
        suiteTitle="Suite Akuntansi Korporat PSAK, SPT Pajak & Rasio Keuangan"
        subtitle="Edisi Enterprise AI Suite hanya mencakup Pembukuan & Akuntansi Operasional (Jurnal Harian, Buku Kas & Laba Rugi Ringkas). Aktifkan Sovereign Corporate untuk membuka standar pelaporan korporasi & perpajakan lengkap:"
        lockedCapabilities={[
          "Neraca Balance Sheet Seimbang Otomatis (Aset = Liabilitas + Ekuitas)",
          "Neraca Saldo COA 4-Digit & Laporan Arus Kas PSAK",
          "Kalkulator SPT Pajak Lengkap: PPN 11%, PPh Final 0,5%, PPh Badan 31E, PPh 21/23/4(2)",
          "5 Rasio Keuangan Eksekutif (Current Ratio, GPM, NPM, ROE, DER) & Aging Piutang",
          "Cetak Audit PSAK A4/F4 & Ekspor Pembukuan Multi-Sheet Excel ke Desktop",
        ]}
        onOpenEditions={props.onOpenEditions}
      />
    );
  }
  return <SovereignAccountingSuiteInner {...props} />;
}

function SovereignAccountingSuiteInner({
  editionId,
  businessName,
  summary,
  orders,
  products,
  entries,
  onToast,
}: {
  editionId?: AppEditionId;
  businessName: string;
  summary: FinancialReportSummary;
  orders: PosOrderRecord[];
  products: ErpProductRecord[];
  entries: AccountingEntryRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  const [subTab, setSubTab] = useState<
    "statements" | "trial_balance" | "cashflow_tax" | "tax_ratios" | "ar_aging"
  >("statements");
  const [fixedAssetsIdr, setFixedAssetsIdr] = useState(25_000_000);
  const [operatingExpCustom, setOperatingExpCustom] = useState<string>("");
  const [pph21PayrollIdr, setPph21PayrollIdr] = useState(450_000);
  const [rentExpenseIdr, setRentExpenseIdr] = useState(2_500_000);

  const corp = useMemo(
    () =>
      buildCorporateFinancialStatements({
        summary,
        orders,
        products,
        entries,
        fixedAssetsIdr,
        operatingExpenseOverrideIdr:
          operatingExpCustom.trim() !== "" && Number(operatingExpCustom) >= 0
            ? Number(operatingExpCustom)
            : undefined,
      }),
    [summary, orders, products, entries, fixedAssetsIdr, operatingExpCustom],
  );

  const taxReport = useMemo(
    () =>
      computeEnterpriseTaxAndRatios(corp, {
        pph21PayrollIdr,
        rentExpenseForPph42Idr: rentExpenseIdr,
      }),
    [corp, pph21PayrollIdr, rentExpenseIdr],
  );

  return (
    <section className="space-y-4 rounded-3xl border border-amber-500/35 bg-slate-950/95 p-4 text-slate-100 shadow-xl md:p-6">
      <SovereignBadge
        editionId={editionId}
        moduleLabel="Akuntansi Korporat PSAK Lengkap (COA, Neraca, Laba Rugi, Arus Kas & Pajak)"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-white">
            Laporan Keuangan Corporate Double-Entry (Standar PSAK Indonesia)
          </h3>
          <p className="text-xs text-slate-400">
            Neraca seimbang otomatis (Aset = Liabilitas + Ekuitas), Neraca Saldo COA 4-digit, Arus Kas, Aging Piutang COD, &amp; Estimasi PPN 11% / PPh Final UMKM 0,5%.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5">
            <span className="text-[10px] text-slate-400">Aset Tetap (Rp)</span>
            <input
              type="number"
              min={0}
              step={1000000}
              value={fixedAssetsIdr}
              onChange={(e) => setFixedAssetsIdr(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 bg-transparent text-right font-mono text-xs font-bold text-emerald-300 outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5">
            <span className="text-[10px] text-slate-400">Beban Ops (Opsional)</span>
            <input
              type="number"
              min={0}
              placeholder="Auto"
              value={operatingExpCustom}
              onChange={(e) => setOperatingExpCustom(e.target.value)}
              className="w-24 bg-transparent text-right font-mono text-xs font-bold text-amber-300 outline-none"
            />
          </label>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "statements", label: "Laba Rugi & Neraca", icon: Calculator },
            { id: "trial_balance", label: "COA & Neraca Saldo", icon: Layers },
            { id: "cashflow_tax", label: "Arus Kas & Ringkasan Pajak", icon: Wallet },
            { id: "tax_ratios", label: "SPT Pajak Lengkap & Rasio", icon: Scale },
            { id: "ar_aging", label: "Aging Piutang COD", icon: Receipt },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                subTab === t.id
                  ? "bg-amber-400 text-slate-950"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === "statements" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Income Statement (Laba Rugi) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-extrabold text-emerald-300">
                Laporan Laba Rugi (Income Statement)
              </h4>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Margin Bersih {corp.incomeStatement.netMarginPct}%
              </span>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300">4101 · Pendapatan Penjualan Kotor</span>
                <span className="font-mono font-bold text-white">
                  {formatIdr(corp.incomeStatement.grossRevenueIdr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">5101 · Harga Pokok Penjualan (HPP)</span>
                <span className="font-mono text-rose-300">
                  ({formatIdr(corp.incomeStatement.cogsIdr)})
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                <span className="text-emerald-200">
                  Laba Kotor (Gross Profit · {corp.incomeStatement.grossMarginPct}%)
                </span>
                <span className="font-mono text-emerald-300">
                  {formatIdr(corp.incomeStatement.grossProfitIdr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">6101 · Beban Operasional &amp; Logistik</span>
                <span className="font-mono text-amber-300">
                  ({formatIdr(corp.incomeStatement.operatingExpenseIdr)})
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-200">EBITDA Operasional</span>
                <span className="font-mono text-cyan-300">
                  {formatIdr(corp.incomeStatement.ebitdaIdr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">6201 · Estimasi PPh Final UMKM (0,5%)</span>
                <span className="font-mono text-rose-300">
                  ({formatIdr(corp.incomeStatement.pphFinalUmkmIdr)})
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-emerald-500/15 px-3 py-2 font-extrabold text-emerald-200">
                <span>LABA BERSIH SETELAH PAJAK</span>
                <span className="font-mono">
                  {formatIdr(corp.incomeStatement.netProfitAfterTaxIdr)}
                </span>
              </div>
            </div>
          </div>

          {/* Balance Sheet (Neraca) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-extrabold text-cyan-300">
                Neraca Posisi Keuangan (Balance Sheet)
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {corp.balanceSheet.isBalanced ? "SEIMBANG (BALANCED)" : "CEK SELISIH"}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                ASET (AKTIVA)
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">1101 · Kas &amp; Bank Operasional</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.cashAndBankIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">1102 · Piutang Usaha / COD</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.accountsReceivableIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">1103 · Persediaan Barang Dagang (FIFO)</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.inventoryAssetIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">1201 · Aset Tetap &amp; Peralatan</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.fixedAssetsIdr)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-800/80 px-2.5 py-1.5 font-extrabold text-white">
                <span>TOTAL ASET</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.totalAssetsIdr)}</span>
              </div>

              <div className="pt-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                LIABILITAS &amp; EKUITAS (PASIVA)
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">2101 · Utang Usaha Supplier</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.accountsPayableIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">2102-2103 · Utang Pajak (PPN + PPh)</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.taxPayableIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">3101 · Modal Disetor &amp; Ekuitas Awal</span>
                <span className="font-mono">{formatIdr(corp.balanceSheet.paidInCapitalIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">3201 · Laba Tahun Berjalan</span>
                <span className="font-mono text-emerald-300">
                  {formatIdr(corp.balanceSheet.currentYearEarningsIdr)}
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-cyan-500/15 px-2.5 py-1.5 font-extrabold text-cyan-200">
                <span>TOTAL LIABILITAS + EKUITAS</span>
                <span className="font-mono">
                  {formatIdr(corp.balanceSheet.totalLiabilitiesIdr + corp.balanceSheet.totalEquityIdr)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "trial_balance" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-[11px] text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Kode COA</th>
                <th className="px-3 py-2.5">Nama Akun</th>
                <th className="px-3 py-2.5">Kategori</th>
                <th className="px-3 py-2.5 text-right">Debit</th>
                <th className="px-3 py-2.5 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {corp.coaTrialBalance.map((row) => (
                <tr key={row.code} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-mono font-bold text-amber-300">{row.code}</td>
                  <td className="px-3 py-2 text-slate-100">{row.name}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                      {row.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-300">
                    {row.debit > 0 ? formatIdr(row.debit) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-cyan-300">
                    {row.credit > 0 ? formatIdr(row.credit) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 font-extrabold text-white">
              <tr>
                <td colSpan={3} className="px-3 py-2.5">
                  TOTAL NERACA SALDO ({corp.isTrialBalanced ? "SEIMBANG 100%" : "PERLU PENYESUAIAN"})
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-400">
                  {formatIdr(corp.totalTrialDebit)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-cyan-400">
                  {formatIdr(corp.totalTrialCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {subTab === "cashflow_tax" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2 text-xs">
            <h4 className="text-sm font-extrabold text-emerald-300">Laporan Arus Kas (Cash Flow)</h4>
            <div className="flex justify-between">
              <span className="text-slate-300">Arus Kas Masuk dari Pelanggan</span>
              <span className="font-mono font-bold text-emerald-300">
                +{formatIdr(corp.cashFlow.cashFromCustomersIdr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Pembayaran Stok &amp; Operasional</span>
              <span className="font-mono text-rose-300">
                ({formatIdr(corp.cashFlow.cashPaidForInventoryAndOpsIdr)})
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 font-extrabold text-white">
              <span>Arus Kas Bersih Operasional</span>
              <span className="font-mono text-cyan-300">
                {formatIdr(corp.cashFlow.operatingCashFlowIdr)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2 text-xs">
            <h4 className="text-sm font-extrabold text-amber-300">
              Ringkasan Pajak Indonesia (e-Faktur &amp; e-Billing Ready)
            </h4>
            <div className="flex justify-between">
              <span className="text-slate-300">Dasar Pengenaan Pajak (DPP)</span>
              <span className="font-mono">{formatIdr(corp.taxSummary.dppIdr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">PPN Keluaran (11% — UU HPP)</span>
              <span className="font-mono text-amber-300">{formatIdr(corp.taxSummary.ppn11Idr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">PPh Final UMKM (0,5% — PP 55/2022)</span>
              <span className="font-mono text-amber-300">
                {formatIdr(corp.taxSummary.pphFinal05Idr)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 font-extrabold text-white">
              <span>Total Estimasi Kewajiban Pajak</span>
              <span className="font-mono text-rose-300">
                {formatIdr(corp.taxSummary.estimatedTotalTaxIdr)}
              </span>
            </div>
          </div>
        </div>
      )}

      {subTab === "tax_ratios" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-amber-500/30 bg-slate-900/90 p-3.5 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-slate-400">PPh 21 Karyawan (TER Payroll):</span>
              <input
                type="number"
                min={0}
                step={50000}
                value={pph21PayrollIdr}
                onChange={(e) => setPph21PayrollIdr(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-amber-300"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-slate-400">Biaya Sewa (Objek PPh 4(2) 10%):</span>
              <input
                type="number"
                min={0}
                step={100000}
                value={rentExpenseIdr}
                onChange={(e) => setRentExpenseIdr(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-cyan-300"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Detail SPT Pajak Indonesia */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2">
              <h4 className="text-sm font-extrabold text-amber-300">
                Pusat Perpajakan Enterprise (SPT Masa &amp; Tahunan — {taxReport.periodLabel})
              </h4>
              <div className="flex justify-between">
                <span className="text-slate-300">PPN Keluaran 11% (Faktur Penjualan)</span>
                <span className="font-mono text-white">{formatIdr(taxReport.ppnKeluaran11Idr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PPN Masukan 11% (Faktur Pembelian/HPP)</span>
                <span className="font-mono text-emerald-300">({formatIdr(taxReport.ppnMasukan11Idr)})</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold">
                <span className="text-amber-200">PPN Kurang / (Lebih) Bayar (SPT 1111)</span>
                <span className="font-mono text-amber-300">{formatIdr(taxReport.ppnNetPayableIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">PPh Final UMKM 0,5% (PP 55/2022)</span>
                <span className="font-mono">{formatIdr(taxReport.pphFinalUmkm05Idr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Alternatif PPh Badan Pasal 31E (11% Laba)</span>
                <span className="font-mono text-cyan-300">{formatIdr(taxReport.pphBadanPasal31EIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Alternatif PPh Badan Pasal 17 (22% Normal)</span>
                <span className="font-mono text-slate-300">{formatIdr(taxReport.pphBadanNormal22Idr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">PPh Pasal 21 Karyawan (TER PP 58/2023)</span>
                <span className="font-mono">{formatIdr(taxReport.pph21PayrollIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">PPh Pasal 23 Jasa (2%) &amp; PPh 4(2) Sewa (10%)</span>
                <span className="font-mono">
                  {formatIdr(taxReport.pph23Services2Idr + taxReport.pph4Ayat2Rent10Idr)}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-amber-500/15 px-3 py-2 font-extrabold text-amber-200">
                <span>TOTAL ESTIMASI KEWAJIBAN SETOR PAJAK</span>
                <span className="font-mono">{formatIdr(taxReport.totalEstimatedTaxLiabilityIdr)}</span>
              </div>
            </div>

            {/* Perubahan Ekuitas & Rasio Keuangan Eksekutif */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2.5">
              <h4 className="text-sm font-extrabold text-emerald-300">
                Laporan Perubahan Ekuitas &amp; Rasio Keuangan Eksekutif
              </h4>
              <div className="rounded-xl bg-slate-950 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Modal Awal &amp; Laba Ditahan</span>
                  <span className="font-mono">{formatIdr(taxReport.openingEquityIdr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Laba Bersih Periode Berjalan</span>
                  <span className="font-mono text-emerald-300">+{formatIdr(taxReport.currentNetIncomeIdr)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5 font-extrabold text-white">
                  <span>Ekuitas Akhir Periode</span>
                  <span className="font-mono text-cyan-300">{formatIdr(taxReport.closingEquityIdr)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">Current Ratio (Likuiditas)</div>
                  <div className="font-mono text-base font-extrabold text-emerald-300">{taxReport.currentRatio}x</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">Debt-to-Equity (DER)</div>
                  <div className="font-mono text-base font-extrabold text-cyan-300">{taxReport.debtToEquityRatio}x</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">Return on Assets (ROA)</div>
                  <div className="font-mono text-base font-extrabold text-amber-300">{taxReport.returnOnAssetsPct}%</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  <div className="text-[10px] text-slate-400">Estimasi BEP Omzet</div>
                  <div className="font-mono text-xs font-extrabold text-white">{formatIdr(taxReport.breakEvenRevenueIdr)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "ar_aging" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {corp.arAging.map((b) => (
            <div
              key={b.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5"
            >
              <div className="text-[11px] font-semibold text-slate-400">{b.label}</div>
              <div className="mt-1 font-mono text-lg font-extrabold text-amber-300">
                {formatIdr(b.amountIdr)}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">{b.count} faktur / COD terbuka</div>
            </div>
          ))}
        </div>
      )}

      {/* Direct Corporate PSAK + SPT Tax PDF Print Panel */}
      <UniversalPrintPanel
        documentLabel="Laporan Keuangan PSAK & SPT Pajak Korporat"
        jobTitle={`Laporan PSAK & Pajak — ${businessName}`}
        filenameBase="laporan-psak-pajak-sovereign"
        defaultPaper="a4"
        buildHtml={() =>
          renderCorporateTaxAndAccountingPrintHtml(corp, taxReport, businessName)
        }
        buildEscPos={() =>
          buildEscPosTextReport(
            `PSAK & PAJAK ${taxReport.periodLabel}`,
            businessName,
            [
              `Omzet: ${formatIdr(corp.incomeStatement.netRevenueIdr)}`,
              `Laba Bersih: ${formatIdr(corp.incomeStatement.netProfitAfterTaxIdr)}`,
              `PPN Netto: ${formatIdr(taxReport.ppnNetPayableIdr)}`,
              `PPh Final 0.5%: ${formatIdr(taxReport.pphFinalUmkm05Idr)}`,
              `PPh 21 TER: ${formatIdr(taxReport.pph21PayrollIdr)}`,
              `Total Pajak: ${formatIdr(taxReport.totalEstimatedTaxLiabilityIdr)}`,
            ],
          )
        }
        onResult={(res) => onToast?.(res.message, res.ok ? "ok" : "error")}
        compact
      />

      {/* Multi-Format Export + USB/Bluetooth/Wi-Fi Transfer to Desktop */}
      <ReportExportHub
        heading="Ekspor Laporan Keuangan PSAK & SPT Pajak Lengkap (Excel Multi-Sheet / PDF / CSV / JSON) ke Desktop"
        onToast={onToast}
        buildPayload={() => ({
          reportTitle: "Laporan Keuangan Korporat PSAK & SPT Pajak Indonesia",
          subtitle: `Sovereign Corporate Accounting · Margin Bersih ${corp.incomeStatement.netMarginPct}% · Current Ratio ${taxReport.currentRatio}x`,
          businessName,
          filenameBase: "laporan-keuangan-pajak-corporate-psak",
          kpis: [
            { label: "Pendapatan Kotor", value: formatIdr(corp.incomeStatement.grossRevenueIdr) },
            { label: "Laba Bersih", value: formatIdr(corp.incomeStatement.netProfitAfterTaxIdr) },
            { label: "Total Aset", value: formatIdr(corp.balanceSheet.totalAssetsIdr) },
            { label: "Total Pajak Est.", value: formatIdr(taxReport.totalEstimatedTaxLiabilityIdr) },
          ],
          sheets: [
            {
              sheetName: "Neraca Saldo COA",
              headers: ["Kode COA", "Nama Akun", "Kategori", "Debit (Rp)", "Kredit (Rp)"],
              rows: corp.coaTrialBalance.map((r) => [
                r.code,
                r.name,
                r.category,
                r.debit,
                r.credit,
              ]),
            },
            {
              sheetName: "SPT Pajak Indonesia",
              headers: ["Jenis Pajak", "Tarif / Regulasi", "Nominal (Rp)"],
              rows: [
                ["PPN Keluaran", "11% UU HPP", taxReport.ppnKeluaran11Idr],
                ["PPN Masukan", "11% Pembelian/HPP", -taxReport.ppnMasukan11Idr],
                ["PPN Kurang / (Lebih) Bayar", "SPT Masa 1111", taxReport.ppnNetPayableIdr],
                ["PPh Final UMKM", "0,5% PP 55/2022", taxReport.pphFinalUmkm05Idr],
                ["PPh Badan Pasal 31E (Simulasi)", "11% Fasilitas", taxReport.pphBadanPasal31EIdr],
                ["PPh Badan Pasal 17 (Normal)", "22% Tarif Umum", taxReport.pphBadanNormal22Idr],
                ["PPh Pasal 21 Karyawan", "TER PP 58/2023", taxReport.pph21PayrollIdr],
                ["PPh Pasal 23 Jasa", "2% Withholding", taxReport.pph23Services2Idr],
                ["PPh Pasal 4(2) Sewa", "10% Final", taxReport.pph4Ayat2Rent10Idr],
              ],
            },
            {
              sheetName: "Rasio & Ekuitas",
              headers: ["Metrik Keuangan", "Nilai"],
              rows: [
                ["Modal Awal + Laba Ditahan (Rp)", taxReport.openingEquityIdr],
                ["Laba Periode Berjalan (Rp)", taxReport.currentNetIncomeIdr],
                ["Ekuitas Akhir (Rp)", taxReport.closingEquityIdr],
                ["Gross Margin (%)", taxReport.grossMarginPct],
                ["Net Margin (%)", taxReport.netMarginPct],
                ["Current Ratio (x)", taxReport.currentRatio],
                ["Debt-to-Equity Ratio (x)", taxReport.debtToEquityRatio],
                ["Return on Assets (%)", taxReport.returnOnAssetsPct],
                ["Estimasi BEP Omzet (Rp)", taxReport.breakEvenRevenueIdr],
              ],
            },
            {
              sheetName: "Aging Piutang COD",
              headers: ["Bucket Umur", "Jumlah Order", "Nominal (Rp)"],
              rows: corp.arAging.map((b) => [b.label, b.count, b.amountIdr]),
            },
          ],
        })}
      />
    </section>
  );
}

// ============================================================================
// 2. SOVEREIGN CORPORATE ERP SUITE (#6)
// ============================================================================

export function SovereignErpSuite(props: {
  editionId?: AppEditionId;
  businessName: string;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  if (props.editionId !== "sovereign") {
    return (
      <SovereignLockedUpgradeCard
        editionId={props.editionId}
        suiteTitle="Suite ERP & Gudang Korporat (ABC/MRP, Multi-Gudang, PO/GRN, BOM & Vendor SLA)"
        subtitle="Edisi Starter/Pro/Enterprise menyediakan ERP Gudang Operasional (Produk, Stok Real-Time, Mutasi & Supplier). Upgrade ke Sovereign Corporate untuk manajemen rantai pasok korporasi penuh:"
        lockedCapabilities={[
          "Klasifikasi Inventori ABC + Perhitungan MRP (Reorder Point & EOQ Otomatis)",
          "Transfer Stok Multi-Gudang & Kontrol Penerimaan Purchase Order (PO/GRN)",
          "Bill of Materials (BOM) Produksi & Kalkulator HPP Batch Otomatis",
          "Audit Stock Opname Fisik vs Sistem + Scorecard Vendor SLA & Cetak Laporan ERP",
        ]}
        onOpenEditions={props.onOpenEditions}
      />
    );
  }
  return <SovereignErpSuiteInner {...props} />;
}

function SovereignErpSuiteInner({
  editionId,
  businessName,
  products,
  orders,
  onToast,
}: {
  editionId?: AppEditionId;
  businessName: string;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  const [erpSubTab, setErpSubTab] = useState<
    "abc_mrp" | "transfers" | "po_procurement" | "bom" | "stock_opname" | "vendor_sla"
  >("abc_mrp");
  const [erpPrintScope, setErpPrintScope] = useState<CorporateErpPrintScope>("all");
  const intel = useMemo(
    () => computeErpInventoryIntelligence(products, orders),
    [products, orders],
  );

  // BOM & Production recipes
  const [boms, setBoms] = useState<ErpBomRecipe[]>(() => [
    {
      id: "bom-1",
      sku: products[0]?.sku || "PKG-BUNDLE-01",
      finishedProductName: `Paket Bundling ${products[0]?.name || "Produk Unggulan"}`,
      batchQty: 20,
      laborAndOverheadIdr: 320_000,
      components: [
        {
          materialName: products[0]?.name || "Unit Produk Utama",
          qtyPerBatch: 20,
          unit: "pcs",
          unitCostIdr: products[0]?.costPrice || 45_000,
        },
        {
          materialName: "Box Premium + Bubble Wrap + Segel QR",
          qtyPerBatch: 20,
          unit: "set",
          unitCostIdr: 6_500,
        },
        {
          materialName: "Kartu Garansi & Stiker Brand",
          qtyPerBatch: 20,
          unit: "lbr",
          unitCostIdr: 1_500,
        },
      ],
    },
  ]);

  // Stock Opname physical counts per productId
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const opnameAudit = useMemo(
    () => computeStockOpnameAudit(products, physicalCounts),
    [products, physicalCounts],
  );

  // Vendor SLA Scorecard
  const vendorSlaRows = useMemo(
    () =>
      computeVendorSlaScorecard([
        {
          vendorName: "PT Distribusi Nusantara Tbk",
          poCount: 18,
          onTimeDeliveryPct: 96,
          defectRatePct: 0.4,
          avgLeadTimeDays: 2,
        },
        {
          vendorName: "CV Sumber Makmur Jaya",
          poCount: 12,
          onTimeDeliveryPct: 88,
          defectRatePct: 1.2,
          avgLeadTimeDays: 4,
        },
        {
          vendorName: "PT Logistik Kemasan Prima",
          poCount: 9,
          onTimeDeliveryPct: 79,
          defectRatePct: 2.1,
          avgLeadTimeDays: 5,
        },
      ]),
    [],
  );

  const [transfers, setTransfers] = useState<WarehouseTransferRecord[]>(() => [
    {
      id: "trf-1",
      transferCode: "TRF-2026-001",
      fromWarehouse: "Gudang Pusat Jakarta",
      toWarehouse: "Cabang Surabaya",
      sku: products[0]?.sku || "SKU-001",
      productName: products[0]?.name || "Produk Utama",
      qty: 25,
      status: "in_transit",
      createdAt: new Date().toISOString().slice(0, 10),
    },
  ]);
  const [fromWh, setFromWh] = useState("Gudang Pusat Jakarta");
  const [toWh, setToWh] = useState("Cabang Surabaya");
  const [trfSku, setTrfSku] = useState(products[0]?.sku || "");
  const [trfQty, setTrfQty] = useState(15);

  const [posList, setPosList] = useState<CorporatePurchaseOrder[]>(() => {
    const topReorder = intel[0];
    if (!topReorder) return [];
    return [
      {
        id: "po-1",
        poNumber: "PO-CORP-2026-081",
        supplierName: "PT Distribusi Nusantara Tbk",
        sku: topReorder.sku,
        productName: topReorder.name,
        qtyOrdered: topReorder.eoqQty,
        unitCostIdr: topReorder.costIdr,
        totalCostIdr: topReorder.eoqQty * topReorder.costIdr,
        etaDays: 4,
        status: "approved",
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ];
  });

  function handleAddTransfer() {
    const prod = products.find((p) => p.sku === trfSku) ?? products[0];
    if (!prod || trfQty <= 0) return;
    const rec: WarehouseTransferRecord = {
      id: `trf-${Date.now()}`,
      transferCode: `TRF-${new Date().getFullYear()}-${String(transfers.length + 2).padStart(3, "0")}`,
      fromWarehouse: fromWh,
      toWarehouse: toWh,
      sku: prod.sku,
      productName: prod.name,
      qty: trfQty,
      status: "in_transit",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setTransfers((prev) => [rec, ...prev]);
    onToast?.(`Transfer ${rec.transferCode} (${prod.name} x${trfQty}) dicatat!`, "ok");
  }

  function handleAutoCreatePo(item: (typeof intel)[number]) {
    const seq = posList.length + 82;
    const po: CorporatePurchaseOrder = {
      id: `po-${item.sku}-${seq}`,
      poNumber: `PO-CORP-${new Date().getFullYear()}-${String(seq).padStart(3, "0")}`,
      supplierName: "PT Supplier Utama Nusantara",
      sku: item.sku,
      productName: item.name,
      qtyOrdered: item.eoqQty,
      unitCostIdr: item.costIdr,
      totalCostIdr: item.eoqQty * item.costIdr,
      etaDays: 5,
      status: "approved",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setPosList((prev) => [po, ...prev]);
    setErpSubTab("po_procurement");
    onToast?.(`Purchase Order ${po.poNumber} dibuat otomatis (${item.eoqQty} unit EOQ)!`, "ok");
  }

  const totalStockValue = intel.reduce((s, r) => s + r.stockValueIdr, 0);
  const reorderAlertCount = intel.filter((r) => r.needsReorder).length;

  return (
    <section className="space-y-4 rounded-3xl border border-amber-500/35 bg-slate-950/95 p-4 text-slate-100 shadow-xl md:p-6">
      <SovereignBadge
        editionId={editionId}
        moduleLabel="ERP Corporate Suite (ABC Valuation, MRP ROP/EOQ, Multi-Gudang & Purchase Order GRN)"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Valuasi Persediaan (FIFO)</div>
          <div className="mt-1 font-mono text-base font-extrabold text-emerald-300">
            {formatIdr(totalStockValue)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">SKU Kelas A (Prioritas 70%)</div>
          <div className="mt-1 text-base font-extrabold text-amber-300">
            {intel.filter((i) => i.abcClass === "A").length} SKU
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Wajib Reorder (≤ ROP)</div>
          <div className="mt-1 text-base font-extrabold text-rose-400">
            {reorderAlertCount} SKU
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">PO Aktif &amp; Transfer Cabang</div>
          <div className="mt-1 text-base font-extrabold text-cyan-300">
            {posList.length} PO · {transfers.length} Mutasi
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "abc_mrp", label: "ABC Valuation & MRP ROP/EOQ", icon: BarChart3 },
            { id: "transfers", label: "Mutasi Multi-Gudang / Cabang", icon: Truck },
            { id: "po_procurement", label: "Purchase Order & GRN", icon: ClipboardCheck },
            { id: "bom", label: "BOM Produksi & HPP", icon: Factory },
            { id: "stock_opname", label: "Stock Opname / Audit", icon: ClipboardList },
            { id: "vendor_sla", label: "Vendor SLA Scorecard", icon: Award },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setErpSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                erpSubTab === t.id
                  ? "bg-amber-400 text-slate-950"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {erpSubTab === "abc_mrp" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-[11px] text-slate-400">
              <tr>
                <th className="px-3 py-2.5">SKU &amp; Produk</th>
                <th className="px-3 py-2.5 text-center">Kelas ABC</th>
                <th className="px-3 py-2.5 text-right">Stok</th>
                <th className="px-3 py-2.5 text-right">Valuasi (Rp)</th>
                <th className="px-3 py-2.5 text-right">ROP</th>
                <th className="px-3 py-2.5 text-right">Saran EOQ</th>
                <th className="px-3 py-2.5 text-right">Aksi MRP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {intel.map((row) => (
                <tr key={row.productId} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2">
                    <div className="font-bold text-white">{row.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {row.sku} · Estimasi habis {row.daysOfCover} hari
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        row.abcClass === "A"
                          ? "bg-amber-500/20 text-amber-300"
                          : row.abcClass === "B"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      Kelas {row.abcClass}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-white">
                    {row.stock}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-300">
                    {formatIdr(row.stockValueIdr)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-amber-300">
                    {row.reorderPoint}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-cyan-300">
                    {row.eoqQty} pcs
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleAutoCreatePo(row)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${
                        row.needsReorder
                          ? "bg-rose-500 text-white hover:bg-rose-400"
                          : "bg-slate-800 text-emerald-300 hover:bg-slate-700"
                      }`}
                    >
                      {row.needsReorder ? "⚡ Buat PO Urgent" : "+ Buat PO EOQ"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {erpSubTab === "transfers" && (
        <div className="space-y-3">
          <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 sm:grid-cols-5">
            <select
              value={fromWh}
              onChange={(e) => setFromWh(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
            >
              <option>Gudang Pusat Jakarta</option>
              <option>Cabang Surabaya</option>
              <option>Cabang Bandung</option>
              <option>Hub Semarang</option>
            </select>
            <select
              value={toWh}
              onChange={(e) => setToWh(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
            >
              <option>Cabang Surabaya</option>
              <option>Cabang Bandung</option>
              <option>Hub Semarang</option>
              <option>Gudang Pusat Jakarta</option>
            </select>
            <select
              value={trfSku}
              onChange={(e) => setTrfSku(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.sku}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={trfQty}
              onChange={(e) => setTrfQty(Math.max(1, Number(e.target.value) || 1))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={handleAddTransfer}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> Kirim Mutasi
            </button>
          </div>
          <div className="space-y-2">
            {transfers.map((trf) => (
              <div
                key={trf.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-cyan-300">{trf.transferCode}</span> ·{" "}
                  <strong className="text-white">{trf.productName}</strong> ({trf.qty} pcs)
                  <div className="text-[11px] text-slate-400">
                    {trf.fromWarehouse} → {trf.toWarehouse} · {trf.createdAt}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTransfers((prev) =>
                      prev.map((x) =>
                        x.id === trf.id ? { ...x, status: "received" } : x,
                      ),
                    )
                  }
                  className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${
                    trf.status === "received"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300 hover:bg-emerald-500/30"
                  }`}
                >
                  {trf.status === "received" ? "✓ Diterima di Cabang" : "Konfirmasi Terima GRN"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {erpSubTab === "po_procurement" && (
        <div className="space-y-2">
          {posList.map((po) => (
            <div
              key={po.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-amber-300">{po.poNumber}</span> ·{" "}
                <strong className="text-white">{po.productName}</strong> ({po.qtyOrdered} pcs)
                <div className="text-[11px] text-slate-400">
                  Supplier: {po.supplierName} · Nilai: {formatIdr(po.totalCostIdr)} · ETA {po.etaDays} hari
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPosList((prev) =>
                    prev.map((x) => (x.id === po.id ? { ...x, status: "grn_received" } : x)),
                  );
                  onToast?.(`GRN ${po.poNumber} diverifikasi diterima!`, "ok");
                }}
                className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold ${
                  po.status === "grn_received"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                }`}
              >
                {po.status === "grn_received" ? "✓ GRN Selesai" : "Terima Barang (GRN)"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 4: BILL OF MATERIALS (BOM) & HPP PRODUKSI */}
      {erpSubTab === "bom" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-xs">
            <div>
              <strong className="text-white">Bill of Materials (BOM) &amp; Kalkulasi HPP Produksi/Bundling</strong>
              <p className="text-[11px] text-slate-400">
                Hitung biaya bahan baku, tenaga kerja, overhead, dan HPP netto per unit untuk manufaktur ringan atau paket bundling.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const p = products[boms.length % Math.max(1, products.length)];
                const nextIdx = boms.length + 1;
                setBoms((prev) => [
                  ...prev,
                  {
                    id: `bom-${nextIdx}`,
                    sku: `BOM-${String(nextIdx).padStart(3, "0")}`,
                    finishedProductName: `Paket Produksi ${p?.name || "Komersial"} #${nextIdx}`,
                    batchQty: 25,
                    laborAndOverheadIdr: 375_000,
                    components: [
                      {
                        materialName: p?.name || "Bahan Baku Utama",
                        qtyPerBatch: 25,
                        unit: "pcs",
                        unitCostIdr: p?.costPrice || 40_000,
                      },
                      {
                        materialName: "Kemasan & Label QR Enterprise",
                        qtyPerBatch: 25,
                        unit: "set",
                        unitCostIdr: 5_500,
                      },
                    ],
                  },
                ]);
                onToast?.("Resep BOM produksi baru ditambahkan!", "ok");
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Resep BOM
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {boms.map((b) => {
              const calc = computeBomUnitCost(b);
              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-cyan-300">{b.sku}</span>
                      <h4 className="text-sm font-extrabold text-white">{b.finishedProductName}</h4>
                      <div className="text-[11px] text-slate-400">Ukuran Batch: {b.batchQty} unit</div>
                    </div>
                    <div className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-right">
                      <div className="text-[10px] text-emerald-200">HPP / Unit</div>
                      <div className="font-mono text-sm font-extrabold text-emerald-300">
                        {formatIdr(calc.unitHppIdr)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 rounded-xl bg-slate-950 p-2.5 text-[11px]">
                    {b.components.map((c, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-slate-300">
                          {c.materialName} ({c.qtyPerBatch} {c.unit})
                        </span>
                        <span className="font-mono text-slate-200">
                          {formatIdr(c.qtyPerBatch * c.unitCostIdr)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-slate-800 pt-1 text-amber-300">
                      <span>Tenaga Kerja &amp; Overhead Batch</span>
                      <span className="font-mono">{formatIdr(b.laborAndOverheadIdr)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white">
                      <span>Total Biaya 1 Batch</span>
                      <span className="font-mono">{formatIdr(calc.totalBatchCostIdr)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: STOCK OPNAME / CYCLE COUNT AUDIT */}
      {erpSubTab === "stock_opname" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="text-[11px] text-slate-400">Akurasi Stok Gudang</div>
              <div className="mt-1 font-mono text-lg font-extrabold text-emerald-300">
                {opnameAudit.accuracyPct}%
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="text-[11px] text-slate-400">Total Selisih Qty</div>
              <div className="mt-1 font-mono text-lg font-extrabold text-amber-300">
                {opnameAudit.totalVarianceQty >= 0
                  ? `+${opnameAudit.totalVarianceQty}`
                  : opnameAudit.totalVarianceQty}{" "}
                pcs
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="text-[11px] text-slate-400">Dampak Selisih Nilai (Rp)</div>
              <div
                className={`mt-1 font-mono text-base font-extrabold ${
                  opnameAudit.totalVarianceValueIdr < 0 ? "text-rose-400" : "text-cyan-300"
                }`}
              >
                {formatIdr(opnameAudit.totalVarianceValueIdr)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[11px] text-slate-400">
                <tr>
                  <th className="px-3 py-2">SKU &amp; Nama Barang</th>
                  <th className="px-3 py-2 text-right">Stok Sistem</th>
                  <th className="px-3 py-2 text-right">Input Hitung Fisik</th>
                  <th className="px-3 py-2 text-right">Selisih Qty</th>
                  <th className="px-3 py-2 text-right">Nilai Selisih</th>
                  <th className="px-3 py-2 text-center">Status Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {opnameAudit.lines.map((line) => (
                  <tr key={line.productId} className="hover:bg-slate-800/40">
                    <td className="px-3 py-2">
                      <div className="font-bold text-white">{line.productName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{line.sku}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{line.systemQty}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={line.physicalQty}
                        onChange={(e) =>
                          setPhysicalCounts((prev) => ({
                            ...prev,
                            [line.productId]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-cyan-300"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold">
                      {line.varianceQty >= 0 ? `+${line.varianceQty}` : line.varianceQty}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatIdr(line.varianceValueIdr)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          line.status === "MATCH"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : line.status === "SURPLUS"
                              ? "bg-cyan-500/20 text-cyan-300"
                              : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {line.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: VENDOR SLA SCORECARD */}
      {erpSubTab === "vendor_sla" && (
        <div className="grid gap-3 md:grid-cols-3">
          {vendorSlaRows.map((v) => (
            <div
              key={v.vendorName}
              className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-white">{v.vendorName}</h4>
                  <div className="text-[11px] text-slate-400">{v.poCount} Purchase Order selesai</div>
                </div>
                <span
                  className={`rounded-xl px-2.5 py-1 font-mono text-sm font-extrabold ${
                    v.grade === "A+" || v.grade === "A"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : v.grade === "B"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  Grade {v.grade}
                </span>
              </div>
              <div className="space-y-1 rounded-xl bg-slate-950 p-2.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">On-Time Delivery (OTD)</span>
                  <strong className="font-mono text-emerald-300">{v.onTimeDeliveryPct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tingkat Retur / Defect</span>
                  <strong className="font-mono text-amber-300">{v.defectRatePct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rata-rata Lead Time</span>
                  <strong className="font-mono text-cyan-300">{v.avgLeadTimeDays} hari</strong>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-300">Skor Komposit SLA</span>
                  <strong className="font-mono text-white">{v.compositeScore} / 100</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTEXT-SPECIFIC ERP PRINT CENTER */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-extrabold text-cyan-300">
            Cetak Laporan ERP &amp; Gudang Konteks-Spesifik (PDF / Printer)
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: "all", label: "Semua ERP" },
                { id: "abc_mrp", label: "ABC & MRP" },
                { id: "transfers", label: "Mutasi Gudang" },
                { id: "bom", label: "BOM & HPP" },
                { id: "stock_opname", label: "Berita Acara Opname" },
                { id: "vendor_sla", label: "Vendor SLA" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setErpPrintScope(s.id)}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                  erpPrintScope === s.id
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-500/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <UniversalPrintPanel
          documentLabel={`Laporan ERP (${erpPrintScope.toUpperCase()})`}
          jobTitle={`Laporan ERP ${erpPrintScope.toUpperCase()} — ${businessName}`}
          filenameBase={`laporan-erp-${erpPrintScope}`}
          defaultPaper="a4"
          buildHtml={() =>
            renderCorporateErpPrintHtml({
              scope: erpPrintScope,
              businessName,
              abcRows: intel,
              transfers,
              boms,
              opname: opnameAudit,
              vendorSla: vendorSlaRows,
            })
          }
          buildEscPos={() =>
            buildEscPosTextReport(
              `LAPORAN ERP (${erpPrintScope.toUpperCase()})`,
              businessName,
              [
                `Total SKU: ${intel.length}`,
                `Valuasi FIFO: ${formatIdr(totalStockValue)}`,
                `Alert Reorder: ${reorderAlertCount} SKU`,
                `Akurasi Opname: ${opnameAudit.accuracyPct}%`,
                `Resep BOM: ${boms.length} · Transfer: ${transfers.length}`,
              ],
            )
          }
          onResult={(res) => onToast?.(res.message, res.ok ? "ok" : "error")}
          compact
        />
      </div>

      <ReportExportHub
        heading="Ekspor Laporan ERP Lengkap (ABC/MRP, Mutasi, PO, BOM, Stock Opname & Vendor SLA) ke Desktop"
        onToast={onToast}
        buildPayload={() => ({
          reportTitle: "Laporan ERP Corporate — Valuasi ABC, MRP, BOM, Stock Opname & Vendor SLA",
          subtitle: `Total Valuasi Persediaan: ${formatIdr(totalStockValue)} · Akurasi Opname ${opnameAudit.accuracyPct}%`,
          businessName,
          filenameBase: "laporan-erp-corporate-lengkap",
          kpis: [
            { label: "Valuasi Stok FIFO", value: formatIdr(totalStockValue) },
            { label: "Total SKU", value: `${intel.length} SKU` },
            { label: "Akurasi Stock Opname", value: `${opnameAudit.accuracyPct}%` },
            { label: "Purchase Order", value: `${posList.length} PO` },
          ],
          sheets: [
            {
              sheetName: "ABC & MRP Intelligence",
              headers: [
                "SKU",
                "Nama Barang",
                "Kelas ABC",
                "Stok Saat Ini",
                "Valuasi (Rp)",
                "Reorder Point",
                "Saran EOQ",
                "Status",
              ],
              rows: intel.map((i) => [
                i.sku,
                i.name,
                i.abcClass,
                i.stock,
                i.stockValueIdr,
                i.reorderPoint,
                i.eoqQty,
                i.needsReorder ? "REORDER URGENT" : "AMAN",
              ]),
            },
            {
              sheetName: "BOM Produksi & HPP",
              headers: ["SKU", "Produk Jadi", "Batch Qty", "Biaya Bahan (Rp)", "Overhead (Rp)", "HPP/Unit (Rp)"],
              rows: boms.map((b) => {
                const c = computeBomUnitCost(b);
                return [
                  b.sku,
                  b.finishedProductName,
                  b.batchQty,
                  c.materialCostPerBatchIdr,
                  b.laborAndOverheadIdr,
                  c.unitHppIdr,
                ];
              }),
            },
            {
              sheetName: "Stock Opname Audit",
              headers: ["SKU", "Produk", "Sistem", "Fisik", "Selisih Qty", "Selisih Nilai (Rp)", "Status"],
              rows: opnameAudit.lines.map((l) => [
                l.sku,
                l.productName,
                l.systemQty,
                l.physicalQty,
                l.varianceQty,
                l.varianceValueIdr,
                l.status,
              ]),
            },
            {
              sheetName: "Vendor SLA Scorecard",
              headers: ["Vendor", "Total PO", "OTD %", "Defect %", "Lead Time (hr)", "Skor", "Grade"],
              rows: vendorSlaRows.map((v) => [
                v.vendorName,
                v.poCount,
                v.onTimeDeliveryPct,
                v.defectRatePct,
                v.avgLeadTimeDays,
                v.compositeScore,
                v.grade,
              ]),
            },
            {
              sheetName: "Purchase Orders",
              headers: ["No PO", "Supplier", "SKU", "Produk", "Qty", "Total Nilai (Rp)", "Status"],
              rows: posList.map((p) => [
                p.poNumber,
                p.supplierName,
                p.sku,
                p.productName,
                p.qtyOrdered,
                p.totalCostIdr,
                p.status,
              ]),
            },
          ],
        })}
      />
    </section>
  );
}

// ============================================================================
// 3. SOVEREIGN CORPORATE CRM SUITE (#7)
// ============================================================================

export function SovereignCrmSuite(props: {
  editionId?: AppEditionId;
  businessName: string;
  contacts: ContactRecord[];
  orders: PosOrderRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  if (props.editionId !== "sovereign") {
    return (
      <SovereignLockedUpgradeCard
        editionId={props.editionId}
        suiteTitle="Suite CRM Korporat: B2B Deal Pipeline Kanban & Segmentasi RFM/CLV"
        subtitle="Buka pengelolaan kontrak grosir/B2B bernilai tinggi, weighted pipeline forecasting, serta skor Customer Lifetime Value (CLV) & retensi RFM secara otomatis pada edisi Sovereign Corporate:"
        lockedCapabilities={[
          "Pipeline Deal B2B Multi-Tahap (Prospek → Proposal → Negosiasi → Menang)",
          "Perhitungan Weighted Pipeline Revenue & Probabilitas Closing Real-Time",
          "Segmentasi RFM Otomatis (Champion, Loyal, Potensial, Berisiko Churn) + CLV",
          "Ekspor Laporan Intelijen Pelanggan & B2B ke Excel/PDF Desktop",
        ]}
        onOpenEditions={props.onOpenEditions}
      />
    );
  }
  return <SovereignCrmSuiteInner {...props} />;
}

function SovereignCrmSuiteInner({
  editionId,
  businessName,
  contacts,
  orders,
  onToast,
}: {
  editionId?: AppEditionId;
  businessName: string;
  contacts: ContactRecord[];
  orders: PosOrderRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  const [crmSubTab, setCrmSubTab] = useState<"pipeline" | "rfm_clv">("pipeline");
  const rfmRows = useMemo(
    () => computeCrmCustomerIntelligence(contacts, orders),
    [contacts, orders],
  );

  const [deals, setDeals] = useState<CorporatePipelineDeal[]>(() => [
    {
      id: "deal-1",
      title: "Kontrak Suplai Grosir Q4 (500 Paket)",
      companyName: contacts[0]?.company || "PT Maju Bersama Abadi",
      contactName: contacts[0]?.displayName || "Rina Kartika",
      valueIdr: 45_000_000,
      stage: "negotiation",
      probabilityPct: 85,
      owner: "Account Director",
      nextAction: "Kirim Draft MoU & Invoice DP 30% via WA",
    },
    {
      id: "deal-2",
      title: "Kemitraan Reseller Wilayah Jawa Timur",
      companyName: contacts[1]?.company || "CV Berkah Niaga",
      contactName: contacts[1]?.displayName || "Budi Santoso",
      valueIdr: 22_500_000,
      stage: "proposal",
      probabilityPct: 65,
      owner: "Sales B2B",
      nextAction: "Presentasi margin grosir & katalog PDF",
    },
    {
      id: "deal-3",
      title: "Corporate Hampers & Loyalty Program",
      companyName: "PT Sinergi Digital Nusantara",
      contactName: "Siti Rahma",
      valueIdr: 18_000_000,
      stage: "qualified",
      probabilityPct: 40,
      owner: "Enterprise AE",
      nextAction: "Kirim sampel produk & penawaran paket",
    },
  ]);

  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealCompany, setNewDealCompany] = useState("");
  const [newDealValue, setNewDealValue] = useState(15_000_000);

  const stageOrder: DealStage[] = ["lead", "qualified", "proposal", "negotiation", "won"];
  const totalPipeline = deals.reduce((s, d) => s + d.valueIdr, 0);
  const weightedForecast = deals.reduce(
    (s, d) => s + Math.round((d.valueIdr * d.probabilityPct) / 100),
    0,
  );

  function advanceDeal(dealId: string) {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        const idx = stageOrder.indexOf(d.stage);
        const nextStage = stageOrder[Math.min(stageOrder.length - 1, idx + 1)];
        return {
          ...d,
          stage: nextStage,
          probabilityPct: DEAL_STAGE_META[nextStage].probabilityPct,
        };
      }),
    );
    onToast?.("Tahap deal berhasil dinaikkan!", "ok");
  }

  function handleAddDeal() {
    if (!newDealTitle.trim()) return;
    const item: CorporatePipelineDeal = {
      id: `deal-${Date.now()}`,
      title: newDealTitle.trim(),
      companyName: newDealCompany.trim() || "Klien Korporat Baru",
      contactName: "PIC Korporat",
      valueIdr: Math.max(100_000, newDealValue),
      stage: "lead",
      probabilityPct: 20,
      owner: "Owner / AE",
      nextAction: "Kualifikasi kebutuhan & jadwal demo WA",
    };
    setDeals((prev) => [item, ...prev]);
    setNewDealTitle("");
    setNewDealCompany("");
    onToast?.(`Deal "${item.title}" ditambahkan ke Pipeline!`, "ok");
  }

  return (
    <section className="space-y-4 rounded-3xl border border-amber-500/35 bg-slate-950/95 p-4 text-slate-100 shadow-xl md:p-6">
      <SovereignBadge
        editionId={editionId}
        moduleLabel="CRM Enterprise 360° (Visual Sales Pipeline Kanban, RFM Segmentation & CLV Scoring)"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Total Nilai Pipeline</div>
          <div className="mt-1 font-mono text-base font-extrabold text-white">
            {formatIdr(totalPipeline)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Weighted Revenue Forecast</div>
          <div className="mt-1 font-mono text-base font-extrabold text-emerald-300">
            {formatIdr(weightedForecast)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Segmen Champions &amp; VIP</div>
          <div className="mt-1 text-base font-extrabold text-amber-300">
            {rfmRows.filter((r) => r.segment === "Champions" || r.segment === "Loyal VIP").length} Akun
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Total Proyeksi CLV</div>
          <div className="mt-1 font-mono text-base font-extrabold text-cyan-300">
            {formatIdr(rfmRows.reduce((s, r) => s + r.estimatedClvIdr, 0))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCrmSubTab("pipeline")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
            crmSubTab === "pipeline"
              ? "bg-amber-400 text-slate-950"
              : "border border-slate-800 bg-slate-900 text-slate-300"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Sales Pipeline Kanban ({deals.length})
        </button>
        <button
          type="button"
          onClick={() => setCrmSubTab("rfm_clv")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
            crmSubTab === "rfm_clv"
              ? "bg-amber-400 text-slate-950"
              : "border border-slate-800 bg-slate-900 text-slate-300"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Segmentasi RFM &amp; CLV Scoring ({rfmRows.length})
        </button>
      </div>

      {crmSubTab === "pipeline" && (
        <div className="space-y-3">
          <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:grid-cols-4">
            <input
              value={newDealTitle}
              onChange={(e) => setNewDealTitle(e.target.value)}
              placeholder="Judul Deal B2B / Proyek..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              value={newDealCompany}
              onChange={(e) => setNewDealCompany(e.target.value)}
              placeholder="Nama Perusahaan / Klien"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              type="number"
              step={500000}
              value={newDealValue}
              onChange={(e) => setNewDealValue(Number(e.target.value) || 0)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
            <button
              type="button"
              onClick={handleAddDeal}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Deal
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {stageOrder.map((st) => {
              const meta = DEAL_STAGE_META[st];
              const stageDeals = deals.filter((d) => d.stage === st);
              return (
                <div
                  key={st}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[11px] font-extrabold text-white">{meta.label}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      {meta.probabilityPct}%
                    </span>
                  </div>
                  {stageDeals.length === 0 && (
                    <div className="py-4 text-center text-[10px] text-slate-500">Belum ada deal</div>
                  )}
                  {stageDeals.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px]"
                    >
                      <div className="font-bold text-white">{d.title}</div>
                      <div className="text-[10px] text-slate-400">{d.companyName}</div>
                      <div className="mt-1 font-mono font-extrabold text-emerald-300">
                        {formatIdr(d.valueIdr)}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">{d.nextAction}</div>
                      {d.stage !== "won" && (
                        <button
                          type="button"
                          onClick={() => advanceDeal(d.id)}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/30"
                        >
                          Naikkan Tahap <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {crmSubTab === "rfm_clv" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-[11px] text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Pelanggan</th>
                <th className="px-3 py-2.5">Segmen RFM</th>
                <th className="px-3 py-2.5 text-center">Lead Score</th>
                <th className="px-3 py-2.5 text-right">Total Belanja</th>
                <th className="px-3 py-2.5 text-right">Proyeksi CLV</th>
                <th className="px-3 py-2.5">Rekomendasi Aksi AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rfmRows.map((r) => (
                <tr key={r.contactId} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2">
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="text-[10px] text-slate-400">{r.phone}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {r.segment}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-amber-300">
                    {r.leadScore}/100
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatIdr(r.totalSpentIdr)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-cyan-300">
                    {formatIdr(r.estimatedClvIdr)}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-300">{r.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReportExportHub
        heading="Ekspor Laporan CRM (Pipeline B2B, Segmen RFM & CLV Pelanggan) ke Desktop"
        onToast={onToast}
        buildPayload={() => ({
          reportTitle: "Laporan CRM Corporate — Sales Pipeline Kanban & Segmentasi RFM/CLV",
          subtitle: `Weighted Forecast: ${formatIdr(weightedForecast)} · ${rfmRows.length} Pelanggan Dianalisis`,
          businessName,
          filenameBase: "laporan-crm-corporate-rfm-pipeline",
          kpis: [
            { label: "Total Pipeline", value: formatIdr(totalPipeline) },
            { label: "Weighted Forecast", value: formatIdr(weightedForecast) },
            { label: "Total Pelanggan", value: `${rfmRows.length}` },
          ],
          sheets: [
            {
              sheetName: "RFM & CLV Pelanggan",
              headers: ["Nama", "Telepon", "Segmen RFM", "Lead Score", "Belanja (Rp)", "Proyeksi CLV (Rp)", "Aksi"],
              rows: rfmRows.map((r) => [
                r.name,
                r.phone,
                r.segment,
                r.leadScore,
                r.totalSpentIdr,
                r.estimatedClvIdr,
                r.recommendedAction,
              ]),
            },
            {
              sheetName: "Sales Pipeline Deals",
              headers: ["Judul Deal", "Perusahaan", "Tahap", "Probabilitas %", "Nilai Deal (Rp)", "Aksi Berikutnya"],
              rows: deals.map((d) => [
                d.title,
                d.companyName,
                DEAL_STAGE_META[d.stage].label,
                d.probabilityPct,
                d.valueIdr,
                d.nextAction,
              ]),
            },
          ],
        })}
      />
    </section>
  );
}

// ============================================================================
// 4. SOVEREIGN CORPORATE POS SUITE (#8)
// ============================================================================

export function SovereignPosSuite(props: {
  editionId?: AppEditionId;
  businessName: string;
  orders: PosOrderRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  if (props.editionId !== "sovereign") {
    return (
      <SovereignLockedUpgradeCard
        editionId={props.editionId}
        suiteTitle="Suite POS Korporat: Rekonsiliasi Shift Laci Kas, Split Bill & VIP Loyalty Tier"
        subtitle="Sempurnakan kontrol kasir multi-shift dan program loyalitas pelanggan VIP (Silver/Gold/Platinum) dengan audit tutup kasir otomatis di Sovereign Corporate:"
        lockedCapabilities={[
          "Rekonsiliasi Laci Kas Shift (Modal Awal, Tunai Aktual, & Deteksi Selisih Real-Time)",
          "Kalkulator Split-Bill Multi-Pembayaran (Tunai + QRIS / Transfer)",
          "Program Diskon VIP Loyalty Tier (Silver 3%, Gold 7%, Platinum 12%)",
          "Cetak & Ekspor Berita Acara Tutup Shift Kasir ke Desktop",
        ]}
        onOpenEditions={props.onOpenEditions}
      />
    );
  }
  return <SovereignPosSuiteInner {...props} />;
}

function SovereignPosSuiteInner({
  editionId,
  businessName,
  orders,
  onToast,
}: {
  editionId?: AppEditionId;
  businessName: string;
  orders: PosOrderRecord[];
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  const [cashierName, setCashierName] = useState("Kepala Kasir Shift Pagi");
  const [outletName, setOutletName] = useState(`${businessName} — Outlet Pusat`);
  const [openingFloat, setOpeningFloat] = useState(500_000);
  const [countedCash, setCountedCash] = useState(500_000);
  const [shiftClosedAt, setShiftClosedAt] = useState<string | null>(null);

  // Split Bill & VIP Tier Calculator
  const [splitTotalIdr, setSplitTotalIdr] = useState(350_000);
  const [vipTier, setVipTier] = useState<VipLoyaltyTier>("gold");
  const [splitCashPortion, setSplitCashPortion] = useState(150_000);

  const shiftReport = useMemo(
    () =>
      computeShiftReconciliation({
        shiftId: `SHIFT-${new Date().toISOString().slice(0, 10)}`,
        cashierName,
        outletName,
        openedAt: `${new Date().toISOString().slice(0, 10)} 08:00`,
        openingFloatIdr: openingFloat,
        countedCashIdr: countedCash,
        orders,
        closedAt: shiftClosedAt,
      }),
    [cashierName, outletName, openingFloat, countedCash, orders, shiftClosedAt],
  );

  const discountPct = VIP_TIER_DISCOUNT[vipTier].discountPct;
  const afterVipDiscount = Math.round(splitTotalIdr * (1 - discountPct / 100));
  const remainingNonCash = Math.max(0, afterVipDiscount - splitCashPortion);

  return (
    <section className="space-y-4 rounded-3xl border border-amber-500/35 bg-slate-950/95 p-4 text-slate-100 shadow-xl md:p-6">
      <SovereignBadge
        editionId={editionId}
        moduleLabel="POS Enterprise Register (Tutup Shift Z-Report, Rekonsiliasi Laci Kas, Split Bill & VIP Loyalty)"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cashier Shift & Z-Report */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-emerald-300">
              <Building2 className="h-4 w-4" /> Rekonsiliasi Shift Kasir (X / Z-Report)
            </h4>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                shiftClosedAt
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {shiftClosedAt ? "Z-REPORT DITUTUP" : "SHIFT AKTIF"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="block">
              <span className="text-[10px] text-slate-400">Nama Kasir</span>
              <input
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Outlet / Cabang</span>
              <input
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Modal Awal Laci (Rp)</span>
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Uang Tunai Fisik Dihitung (Rp)</span>
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-emerald-300"
              />
            </label>
          </div>

          <div className="space-y-1.5 rounded-xl bg-slate-950 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Penjualan Tunai (Cash)</span>
              <span className="font-mono text-white">{formatIdr(shiftReport.cashSalesIdr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Non-Tunai QRIS / E-Wallet</span>
              <span className="font-mono text-cyan-300">{formatIdr(shiftReport.qrisSalesIdr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transfer Bank &amp; COD</span>
              <span className="font-mono text-amber-300">
                {formatIdr(shiftReport.transferSalesIdr + shiftReport.codPendingIdr)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold">
              <span>Target Tunai Seharusnya di Laci</span>
              <span className="font-mono text-white">
                {formatIdr(shiftReport.expectedCashInDrawerIdr)}
              </span>
            </div>
            <div className="flex justify-between font-extrabold">
              <span>Selisih Laci (Variance)</span>
              <span
                className={`font-mono ${
                  shiftReport.varianceIdr === 0
                    ? "text-emerald-400"
                    : shiftReport.varianceIdr > 0
                      ? "text-cyan-300"
                      : "text-rose-400"
                }`}
              >
                {shiftReport.varianceIdr === 0
                  ? "Rp 0 (KLOP 100%)"
                  : formatIdr(shiftReport.varianceIdr)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShiftClosedAt(new Date().toLocaleString("id-ID"));
              onToast?.("Z-Report Shift Kasir berhasil dikunci & siap diekspor!", "ok");
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
          >
            <ShieldCheck className="h-4 w-4" /> Kunci &amp; Finalisasi Z-Report Shift
          </button>
        </div>

        {/* Split Payment & VIP Tier Discount Calculator */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
          <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-cyan-300">
            <Sparkles className="h-4 w-4" /> Kalkulator Split Bill &amp; Diskon Member VIP
          </h4>
          <p className="text-[11px] text-slate-400">
            Hitung cepat pembayaran gabungan (Tunai + QRIS/Transfer) serta diskon bertingkat pelanggan korporat Sovereign.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="block">
              <span className="text-[10px] text-slate-400">Total Tagihan Bruto (Rp)</span>
              <input
                type="number"
                value={splitTotalIdr}
                onChange={(e) => setSplitTotalIdr(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Tier Member VIP</span>
              <select
                value={vipTier}
                onChange={(e) => setVipTier(e.target.value as VipLoyaltyTier)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              >
                {(Object.keys(VIP_TIER_DISCOUNT) as VipLoyaltyTier[]).map((k) => (
                  <option key={k} value={k}>
                    {VIP_TIER_DISCOUNT[k].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 block">
              <span className="text-[10px] text-slate-400">Porsi Bayar Tunai / Cash (Rp)</span>
              <input
                type="number"
                value={splitCashPortion}
                onChange={(e) => setSplitCashPortion(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-emerald-300"
              />
            </label>
          </div>
          <div className="space-y-1.5 rounded-xl bg-slate-950 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Diskon VIP ({discountPct}%)</span>
              <span className="font-mono text-amber-300">
                -{formatIdr(splitTotalIdr - afterVipDiscount)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-white">
              <span>Netto Setelah Diskon VIP</span>
              <span className="font-mono text-emerald-300">{formatIdr(afterVipDiscount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5 font-extrabold">
              <span>Sisa Pembayaran Non-Tunai (QRIS / EDC)</span>
              <span className="font-mono text-cyan-300">{formatIdr(remainingNonCash)}</span>
            </div>
          </div>
        </div>
      </div>

      <ReportExportHub
        heading="Ekspor Laporan Kasir POS & Z-Report Shift (Excel / PDF / CSV) ke Desktop"
        onToast={onToast}
        buildPayload={() => ({
          reportTitle: `Laporan Z-Report Kasir POS — ${outletName}`,
          subtitle: `Kasir: ${cashierName} · Total ${orders.length} Transaksi`,
          businessName,
          filenameBase: "laporan-pos-z-report-shift",
          kpis: [
            { label: "Kas Tunai", value: formatIdr(shiftReport.cashSalesIdr) },
            { label: "QRIS/E-Wallet", value: formatIdr(shiftReport.qrisSalesIdr) },
            { label: "Target Laci", value: formatIdr(shiftReport.expectedCashInDrawerIdr) },
            { label: "Selisih", value: formatIdr(shiftReport.varianceIdr) },
          ],
          sheets: [
            {
              sheetName: "Z-Report Shift",
              headers: ["Parameter Shift", "Nilai"],
              rows: [
                ["Shift ID", shiftReport.shiftId],
                ["Kasir", shiftReport.cashierName],
                ["Outlet", shiftReport.outletName],
                ["Modal Awal Laci (Rp)", shiftReport.openingFloatIdr],
                ["Penjualan Tunai (Rp)", shiftReport.cashSalesIdr],
                ["Penjualan QRIS/E-Wallet (Rp)", shiftReport.qrisSalesIdr],
                ["Transfer Bank (Rp)", shiftReport.transferSalesIdr],
                ["COD Pending (Rp)", shiftReport.codPendingIdr],
                ["Target Kas di Laci (Rp)", shiftReport.expectedCashInDrawerIdr],
                ["Kas Fisik Dihitung (Rp)", shiftReport.countedCashIdr],
                ["Selisih / Variance (Rp)", shiftReport.varianceIdr],
              ],
            },
            {
              sheetName: "Daftar Transaksi POS",
              headers: ["Invoice", "Pelanggan", "Metode", "Status", "Total (Rp)"],
              rows: orders.map((o) => [
                o.invoiceNumber,
                o.customerName,
                o.paymentMethod,
                o.paymentStatus,
                o.totalAmount,
              ]),
            },
          ],
        })}
      />
    </section>
  );
}

// ============================================================================
// 5. SOVEREIGN CORPORATE HIGH-LEVEL SEO SUITE (#9)
// ============================================================================

export function SovereignSeoSuite(props: {
  editionId?: AppEditionId;
  businessName: string;
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  if (props.editionId !== "sovereign") {
    return (
      <SovereignLockedUpgradeCard
        editionId={props.editionId}
        suiteTitle="Suite SEO Korporat: Technical SEO Audit Score & JSON-LD Schema Generator"
        subtitle="Audit teknis SEO mendalam (skor 0–100), deteksi kepadatan keyword, optimasi Google Business Profile lokal, & generator JSON-LD LocalBusiness/Product siap pasang tersedia eksklusif di Sovereign Corporate:"
        lockedCapabilities={[
          "Skor Audit SEO Teknis Otomatis (Title, Meta Description, Keyword & Local Intent)",
          "Generator JSON-LD Schema LocalBusiness + WhatsApp ContactPoint Siap Salin",
          "Rekomendasi Perbaikan Teknis Prioritas untuk Dominasi Pencarian Google",
          "Ekspor Laporan Audit SEO Korporat ke Excel/PDF",
        ]}
        onOpenEditions={props.onOpenEditions}
      />
    );
  }
  return <SovereignSeoSuiteInner {...props} />;
}

function SovereignSeoSuiteInner({
  editionId,
  businessName,
  onToast,
}: {
  editionId?: AppEditionId;
  businessName: string;
  onOpenEditions?: () => void;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}) {
  const [domainUrl, setDomainUrl] = useState("https://tokoanda.co.id");
  const [city, setCity] = useState("Surabaya");
  const industry = "Kopi Specialty & Kuliner Premium";
  const [primaryKeyword, setPrimaryKeyword] = useState("kopi arabika grosir");
  const [pageTitle, setPageTitle] = useState(
    `Jual Kopi Arabika Grosir Terbaik di Surabaya | ${businessName}`,
  );
  const [metaDescription, setMetaDescription] = useState(
    `Pesan kopi arabika grosir fresh roast di Surabaya bersama ${businessName}. Harga distributor, kirim cepat seluruh Indonesia, dan konsultasi langsung via WhatsApp.`,
  );
  const [whatsappNumber, setWhatsappNumber] = useState("+62-812-3456-7890");

  const audit = useMemo(
    () =>
      runCorporateSeoAudit({
        brandName: businessName,
        domainUrl,
        city,
        industry,
        primaryKeyword,
        pageTitle,
        metaDescription,
        whatsappNumber,
      }),
    [businessName, domainUrl, city, industry, primaryKeyword, pageTitle, metaDescription, whatsappNumber],
  );

  async function copySchema() {
    try {
      await navigator.clipboard.writeText(
        `<script type="application/ld+json">\n${audit.jsonLdBundle}\n</script>`,
      );
      onToast?.("Bundel Schema JSON-LD Corporate disalin! Tempel di <head> website Anda.", "ok");
    } catch {
      onToast?.("Gagal menyalin otomatis.", "error");
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-amber-500/35 bg-slate-950/95 p-4 text-slate-100 shadow-xl md:p-6">
      <SovereignBadge
        editionId={editionId}
        moduleLabel="High-Level Corporate SEO Suite (Technical Audit, Core Web Vitals, Multi-Schema JSON-LD & Keyword ROI)"
      />

      {/* Inputs + Live Score & CWV */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 lg:col-span-7">
          <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
            <Globe2 className="h-4 w-4 text-emerald-400" /> Parameter Audit &amp; Generator SERP
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <label className="block">
              <span className="text-[10px] text-slate-400">URL Domain Utama</span>
              <input
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Target Kota / Wilayah</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Keyword Utama (Money Keyword)</span>
              <input
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">WhatsApp Bisnis (Schema)</span>
              <input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="sm:col-span-2 block">
              <span className="text-[10px] text-slate-400">
                Meta Title ({pageTitle.length} karakter — ideal 45-65)
              </span>
              <input
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="sm:col-span-2 block">
              <span className="text-[10px] text-slate-400">
                Meta Description ({metaDescription.length} karakter — ideal 120-160)
              </span>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
          </div>
        </div>

        {/* Right: Technical Score + Google SERP Preview */}
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400">Skor Technical SEO</div>
              <div className="text-3xl font-extrabold text-emerald-400">
                {audit.overallScore}
                <span className="text-sm text-slate-400">/100</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-right text-[10px]">
              <div className="rounded-lg bg-slate-950 px-2 py-1">
                <span className="text-slate-400">LCP: </span>
                <strong className="text-emerald-300">{audit.cwvEstimates.lcpSec}</strong>
              </div>
              <div className="rounded-lg bg-slate-950 px-2 py-1">
                <span className="text-slate-400">INP: </span>
                <strong className="text-emerald-300">{audit.cwvEstimates.inpMs}</strong>
              </div>
              <div className="rounded-lg bg-slate-950 px-2 py-1">
                <span className="text-slate-400">CLS: </span>
                <strong className="text-cyan-300">{audit.cwvEstimates.clsScore}</strong>
              </div>
              <div className="rounded-lg bg-slate-950 px-2 py-1">
                <span className="text-slate-400">Mobile: </span>
                <strong className="text-amber-300">{audit.cwvEstimates.mobileScore}/100</strong>
              </div>
            </div>
          </div>

          {/* Live Google SERP Preview */}
          <div className="rounded-xl bg-white p-3 text-left text-slate-900">
            <div className="text-[10px] font-semibold text-slate-500">
              Preview Tampilan Google Search (SERP)
            </div>
            <div className="mt-1 truncate text-[11px] text-emerald-800">{domainUrl}</div>
            <div className="text-sm font-bold text-blue-800 leading-snug">{pageTitle}</div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-600">
              {metaDescription}
            </p>
          </div>

          <div className="space-y-1">
            {audit.checks.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5 text-[11px]">
                <span
                  className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                    c.status === "pass"
                      ? "bg-emerald-400"
                      : c.status === "warn"
                        ? "bg-amber-400"
                        : "bg-rose-500"
                  }`}
                />
                <div>
                  <strong className="text-slate-100">{c.label}:</strong>{" "}
                  <span className="text-slate-400">{c.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyword Intent Clusters & Revenue ROI */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <h4 className="text-xs font-extrabold text-amber-300">
            Topical Authority &amp; Keyword Cluster ROI Matrix
          </h4>
          <span className="text-[10px] text-slate-400">
            Total Potensi Omzet Organik:{" "}
            <strong className="text-emerald-300">
              {formatIdr(
                audit.keywordClusters.reduce((s, k) => s + k.estMonthlyRevenueIdr, 0),
              )}
              /bulan
            </strong>
          </span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-[11px] text-slate-400">
            <tr>
              <th className="px-3 py-2">Keyword Cluster</th>
              <th className="px-3 py-2">Search Intent</th>
              <th className="px-3 py-2 text-right">Volume/Bln</th>
              <th className="px-3 py-2 text-center">KD</th>
              <th className="px-3 py-2 text-right">Proyeksi ROI/Bln</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {audit.keywordClusters.map((k) => (
              <tr key={k.keyword} className="hover:bg-slate-800/40">
                <td className="px-3 py-2 font-bold text-white">{k.keyword}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                    {k.intent}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{k.estMonthlyVolume.toLocaleString("id-ID")}</td>
                <td className="px-3 py-2 text-center font-mono text-amber-300">{k.difficulty}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-300">
                  {formatIdr(k.estMonthlyRevenueIdr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Multi-Schema JSON-LD & 30-Day Execution Calendar */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
              <Code2 className="h-4 w-4" /> Multi-Schema JSON-LD (Organization + LocalBusiness + FAQ)
            </h4>
            <button
              type="button"
              onClick={() => void copySchema()}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Copy className="h-3 w-3" /> Salin Script
            </button>
          </div>
          <pre className="mt-2 max-h-44 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[10px] text-emerald-300">
            {audit.jsonLdBundle}
          </pre>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
            <RefreshCw className="h-4 w-4" /> Roadmap Eksekusi SEO Corporate 30 Hari
          </h4>
          {audit.thirtyDayPlan.map((w) => (
            <div
              key={w.week}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
            >
              <div className="font-bold text-emerald-300">
                {w.week} — {w.focus}
              </div>
              <div className="text-[11px] text-slate-300">{w.deliverable}</div>
            </div>
          ))}
        </div>
      </div>

      <ReportExportHub
        heading="Ekspor Blueprint SEO Corporate (Audit, Keyword ROI & 30-Day Plan) ke Desktop"
        onToast={onToast}
        buildPayload={() => ({
          reportTitle: `Blueprint High-Level SEO Corporate — ${businessName}`,
          subtitle: `Skor Technical SEO: ${audit.overallScore}/100 · Target: ${primaryKeyword} (${city})`,
          businessName,
          filenameBase: "blueprint-seo-corporate",
          kpis: [
            { label: "Skor SEO", value: `${audit.overallScore}/100` },
            { label: "Mobile CWV", value: `${audit.cwvEstimates.mobileScore}/100` },
            { label: "Keyword Utama", value: primaryKeyword },
          ],
          sheets: [
            {
              sheetName: "Keyword Cluster ROI",
              headers: ["Keyword", "Intent", "Volume/Bln", "KD", "Estimasi ROI/Bln (Rp)"],
              rows: audit.keywordClusters.map((k) => [
                k.keyword,
                k.intent,
                k.estMonthlyVolume,
                k.difficulty,
                k.estMonthlyRevenueIdr,
              ]),
            },
            {
              sheetName: "Audit Teknis & 30-Day Plan",
              headers: ["Item", "Status / Minggu", "Rincian"],
              rows: [
                ...audit.checks.map((c) => [c.label, c.status.toUpperCase(), c.detail]),
                ...audit.thirtyDayPlan.map((p) => [p.focus, p.week, p.deliverable]),
              ],
            },
          ],
        })}
      />
    </section>
  );
}
