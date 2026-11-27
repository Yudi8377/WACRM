"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Scale,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  buildJournalEntry,
  computeBalanceSheet,
  computeCashFlowStatement,
  computeGeneralLedgerForAccount,
  computeIncomeStatement,
  computeTaxSummary,
  computeTrialBalance,
  exportJournalsToCsv,
  validateBalancedJournal,
} from "@/lib/accounting-engine";
import { formatIdr, type PublisherEmsState } from "@/lib/publisher-types";

interface PublisherAccountingViewProps {
  state: PublisherEmsState;
  onUpdateState: (updater: (prev: PublisherEmsState) => PublisherEmsState) => void;
  onRunRevenueRecognition: (amountIdr: number, periodLabel: string) => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

type AccountingTab =
  | "journals"
  | "ledger"
  | "trial_balance"
  | "income_statement"
  | "balance_sheet"
  | "cash_flow"
  | "tax";

export function PublisherAccountingView({
  state,
  onUpdateState,
  onRunRevenueRecognition,
  onToast,
}: PublisherAccountingViewProps) {
  const [subTab, setSubTab] = useState<AccountingTab>("journals");
  const [selectedAccountCode, setSelectedAccountCode] = useState(state.coa[0]?.code ?? "1101");
  const [journalModal, setJournalModal] = useState(false);

  // Manual journal state
  const [jDate, setJDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [jRef, setJRef] = useState("ADJ-MANUAL");
  const [jDesc, setJDesc] = useState("");
  const [jLines, setJLines] = useState<
    Array<{ accountCode: string; debit: number; credit: number; memo: string }>
  >([
    { accountCode: "6104", debit: 1_500_000, credit: 0, memo: "" },
    { accountCode: "1101", debit: 0, credit: 1_500_000, memo: "" },
  ]);

  const tb = useMemo(() => computeTrialBalance(state.coa, state.journals), [state.coa, state.journals]);
  const pl = useMemo(() => computeIncomeStatement(state.coa, state.journals), [state.coa, state.journals]);
  const bs = useMemo(() => computeBalanceSheet(state.coa, state.journals), [state.coa, state.journals]);
  const cf = useMemo(() => computeCashFlowStatement(state.journals), [state.journals]);
  const tax = useMemo(
    () => computeTaxSummary(state.coa, state.journals, state.invoices),
    [state.coa, state.journals, state.invoices],
  );

  const selectedAccount =
    state.coa.find((a) => a.code === selectedAccountCode) ?? state.coa[0];
  const ledgerRows = useMemo(
    () => (selectedAccount ? computeGeneralLedgerForAccount(selectedAccount, state.journals) : []),
    [selectedAccount, state.journals],
  );

  const manualCheck = validateBalancedJournal(jLines);

  function handleExportCsv() {
    const csv = exportJournalsToCsv(state.journals);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jurnal-psak-${state.profile.companyName.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Jurnal Umum PSAK berhasil diekspor ke CSV.");
  }

  function handlePostManualJournal(e: FormEvent) {
    e.preventDefault();
    try {
      const entry = buildJournalEntry({
        id: `jrn-${Date.now().toString(36)}`,
        journalNumber: `JRN-${new Date().getFullYear()}-${String(state.journals.length + 1).padStart(4, "0")}`,
        date: jDate,
        reference: jRef.trim() || "MANUAL",
        description: jDesc.trim() || "Jurnal Penyesuaian Manual",
        sourceModule: "manual",
        postedBy: "Finance Controller",
        coa: state.coa,
        rawLines: jLines,
      });
      onUpdateState((prev) => ({ ...prev, journals: [entry, ...prev.journals] }));
      setJournalModal(false);
      setJDesc("");
      onToast(`Jurnal ${entry.journalNumber} (${formatIdr(entry.totalDebit)}) berhasil diposting.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memposting jurnal.", "error");
    }
  }

  const tabs: Array<{ id: AccountingTab; label: string; icon: typeof BookOpenCheck }> = [
    { id: "journals", label: `Jurnal Umum (${state.journals.length})`, icon: FileText },
    { id: "ledger", label: "Buku Besar (GL)", icon: BookOpenCheck },
    { id: "trial_balance", label: "Neraca Saldo", icon: Scale },
    { id: "income_statement", label: "Laba Rugi (P&L)", icon: TrendingUp },
    { id: "balance_sheet", label: "Neraca (Balance Sheet)", icon: Landmark },
    { id: "cash_flow", label: "Arus Kas", icon: Wallet },
    { id: "tax", label: "Pajak PPN & PPh", icon: Receipt },
  ];

  const suggestedMonthlyAmort = Math.min(
    bs.deferredRevenueBalance,
    Math.round(bs.deferredRevenueBalance / 10),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            Akuntansi Lengkap Perusahaan Penerbit (PSAK 72 Double-Entry)
          </h2>
          <p className="text-xs text-slate-400">
            Jurnal Umum, Pengakuan Pendapatan SaaS (Deferred Revenue), Buku Besar, Neraca Saldo,
            Laba Rugi, Neraca, Arus Kas &amp; PPN 11% terhitung otomatis.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {bs.deferredRevenueBalance > 0 && (
            <button
              type="button"
              onClick={() =>
                onRunRevenueRecognition(
                  suggestedMonthlyAmort > 0 ? suggestedMonthlyAmort : bs.deferredRevenueBalance,
                  `Periode ${new Date().toISOString().slice(0, 7)}`,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-400"
            >
              <CalendarClock className="h-4 w-4" /> Akui Pendapatan Bulanan (
              {formatIdr(suggestedMonthlyAmort)})
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            <Download className="h-4 w-4" /> Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => setJournalModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Buat Jurnal Manual
          </button>
        </div>
      </div>

      {/* Integrity Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
          <div className="text-slate-400">Pendapatan Diakui (P&amp;L)</div>
          <div className="mt-1 text-base font-extrabold text-emerald-400">
            {formatIdr(pl.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-400">Gross Margin {pl.grossMarginPct}%</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
          <div className="text-slate-400">Laba / (Rugi) Bersih</div>
          <div
            className={`mt-1 text-base font-extrabold ${
              pl.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatIdr(pl.netProfit)}
          </div>
          <div className="text-[11px] text-slate-400">Net Margin {pl.netMarginPct}%</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
          <div className="text-slate-400">Deferred Revenue (2201)</div>
          <div className="mt-1 text-base font-extrabold text-indigo-300">
            {formatIdr(bs.deferredRevenueBalance)}
          </div>
          <div className="text-[11px] text-slate-400">Siap diamortisasi tiap bulan</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
          <div className="text-emerald-300">Status Persamaan Akuntansi</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {tb.balanced && bs.balanced ? "SEIMBANG 100%" : "TIDAK SEIMBANG"}
          </div>
          <div className="text-[11px] text-emerald-200">
            Aset: {formatIdr(bs.totalAssets)}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                subTab === t.id
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. JOURNALS */}
      {subTab === "journals" && (
        <div className="space-y-3">
          {state.journals.map((j) => (
            <div
              key={j.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <span className="font-mono font-bold text-emerald-300">{j.journalNumber}</span>
                  <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase font-bold text-indigo-300">
                    {j.sourceModule}
                  </span>
                  <span className="ml-2 text-slate-400">Ref: {j.reference}</span>
                  <div className="mt-1 font-bold text-white">{j.description}</div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <div>{j.date}</div>
                  <div>Posted by: {j.postedBy}</div>
                </div>
              </div>
              <table className="mt-2.5 w-full text-left">
                <thead>
                  <tr className="text-[11px] text-slate-400">
                    <th className="py-1">Akun CoA</th>
                    <th className="py-1">Keterangan</th>
                    <th className="py-1 text-right">Debit</th>
                    <th className="py-1 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {j.lines.map((l, idx) => (
                    <tr key={`${j.id}-${idx}`}>
                      <td className="py-1.5 font-mono text-slate-200">
                        {l.accountCode} — <span className="font-sans">{l.accountName}</span>
                      </td>
                      <td className="py-1.5 text-slate-400">{l.memo || "-"}</td>
                      <td className="py-1.5 text-right font-semibold text-emerald-300">
                        {l.debit > 0 ? formatIdr(l.debit) : "-"}
                      </td>
                      <td className="py-1.5 text-right font-semibold text-amber-300">
                        {l.credit > 0 ? formatIdr(l.credit) : "-"}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-700 font-bold text-white">
                    <td colSpan={2} className="pt-2">
                      Total Jurnal (Balance ✓)
                    </td>
                    <td className="pt-2 text-right">{formatIdr(j.totalDebit)}</td>
                    <td className="pt-2 text-right">{formatIdr(j.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* 2. GENERAL LEDGER */}
      {subTab === "ledger" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Buku Besar (General Ledger)</h3>
            <select
              value={selectedAccountCode}
              onChange={(e) => setSelectedAccountCode(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              {state.coa.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2">Tanggal</th>
                  <th className="px-3 py-2">No Jurnal / Ref</th>
                  <th className="px-3 py-2">Uraian</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Kredit</th>
                  <th className="pl-3 py-2 text-right">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Belum ada mutasi pada akun {selectedAccount?.code} — {selectedAccount?.name}.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((row, idx) => (
                    <tr key={`${row.journalId}-${idx}`}>
                      <td className="py-2 text-slate-300">{row.date}</td>
                      <td className="px-3 py-2 font-mono text-indigo-300">
                        {row.journalNumber} ({row.reference})
                      </td>
                      <td className="px-3 py-2 text-slate-200">{row.description}</td>
                      <td className="px-3 py-2 text-right text-emerald-300">
                        {row.debit > 0 ? formatIdr(row.debit) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-300">
                        {row.credit > 0 ? formatIdr(row.credit) : "-"}
                      </td>
                      <td className="pl-3 py-2 text-right font-bold text-white">
                        {formatIdr(row.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TRIAL BALANCE */}
      {subTab === "trial_balance" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-xs">
          <h3 className="text-sm font-bold text-white">Neraca Saldo (Trial Balance)</h3>
          <table className="mt-4 w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2">Kode</th>
                <th className="px-3 py-2">Nama Akun</th>
                <th className="px-3 py-2">Tipe</th>
                <th className="px-3 py-2 text-right">Saldo Akhir Debit</th>
                <th className="pl-3 py-2 text-right">Saldo Akhir Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tb.rows.map((r) => (
                <tr key={r.code}>
                  <td className="py-2 font-mono font-bold text-emerald-300">{r.code}</td>
                  <td className="px-3 py-2 text-white">{r.name}</td>
                  <td className="px-3 py-2 uppercase text-[10px] text-slate-400">{r.type}</td>
                  <td className="px-3 py-2 text-right text-slate-200">
                    {r.endingDebit > 0 ? formatIdr(r.endingDebit) : "-"}
                  </td>
                  <td className="pl-3 py-2 text-right text-slate-200">
                    {r.endingCredit > 0 ? formatIdr(r.endingCredit) : "-"}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-700 font-extrabold text-white">
                <td colSpan={3} className="pt-3">
                  TOTAL NERACA SALDO ({tb.balanced ? "BALANCE ✓" : "SELISIH"})
                </td>
                <td className="px-3 pt-3 text-right text-emerald-400">
                  {formatIdr(tb.sumEndingDebit)}
                </td>
                <td className="pl-3 pt-3 text-right text-emerald-400">
                  {formatIdr(tb.sumEndingCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 4. INCOME STATEMENT */}
      {subTab === "income_statement" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-xs space-y-4">
          <h3 className="text-sm font-bold text-white">
            Laporan Laba Rugi (Income Statement) — {state.profile.companyName}
          </h3>
          <div className="space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-emerald-400">
              Pendapatan Usaha Diakui (Revenue)
            </div>
            {pl.revenueRows.map((r) => (
              <div key={r.code} className="flex justify-between border-b border-slate-800/50 py-1.5">
                <span className="text-slate-200">
                  {r.code} · {r.name}
                </span>
                <span className="font-semibold text-white">{formatIdr(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-extrabold text-emerald-300">
              <span>Total Pendapatan</span>
              <span>{formatIdr(pl.totalRevenue)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-amber-400">
              Beban Pokok SaaS &amp; Hardware (COGS)
            </div>
            {pl.cogsRows.map((r) => (
              <div key={r.code} className="flex justify-between border-b border-slate-800/50 py-1.5">
                <span className="text-slate-200">
                  {r.code} · {r.name}
                </span>
                <span className="font-semibold text-white">({formatIdr(r.amount)})</span>
              </div>
            ))}
            <div className="flex justify-between rounded-xl bg-slate-950 px-3 py-2 font-extrabold text-white">
              <span>LABA KOTOR (Gross Profit · Margin {pl.grossMarginPct}%)</span>
              <span className="text-emerald-400">{formatIdr(pl.grossProfit)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-rose-400">
              Beban Operasional (OpEx)
            </div>
            {pl.expenseRows.map((r) => (
              <div key={r.code} className="flex justify-between border-b border-slate-800/50 py-1.5">
                <span className="text-slate-200">
                  {r.code} · {r.name}
                </span>
                <span className="font-semibold text-white">({formatIdr(r.amount)})</span>
              </div>
            ))}
            <div className="flex justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-extrabold">
              <span className="text-white">LABA / (RUGI) BERSIH PERIODE BERJALAN</span>
              <span className={pl.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {formatIdr(pl.netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. BALANCE SHEET */}
      {subTab === "balance_sheet" && (
        <div className="grid gap-4 lg:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 space-y-2">
            <h3 className="text-sm font-bold text-cyan-300">ASET (AKTIVA)</h3>
            {bs.assets.map((a) => (
              <div key={a.code} className="flex justify-between border-b border-slate-800/50 py-1.5">
                <span className="text-slate-200">
                  {a.code} · {a.name}
                </span>
                <span className="font-semibold text-white">{formatIdr(a.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between rounded-xl bg-cyan-500/10 px-3 py-2.5 text-sm font-extrabold text-cyan-300">
              <span>TOTAL ASET</span>
              <span>{formatIdr(bs.totalAssets)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 space-y-3">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-amber-300">LIABILITAS (KEWAJIBAN)</h3>
              {bs.liabilities.map((l) => (
                <div key={l.code} className="flex justify-between border-b border-slate-800/50 py-1.5">
                  <span className="text-slate-200">
                    {l.code} · {l.name}
                  </span>
                  <span className="font-semibold text-white">{formatIdr(l.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 font-bold text-amber-300">
                <span>Total Liabilitas</span>
                <span>{formatIdr(bs.totalLiabilities)}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <h3 className="text-sm font-bold text-emerald-300">EKUITAS (MODAL)</h3>
              {bs.equity.map((e) => (
                <div key={e.code} className="flex justify-between border-b border-slate-800/50 py-1.5">
                  <span className="text-slate-200">
                    {e.code} · {e.name}
                  </span>
                  <span className="font-semibold text-white">{formatIdr(e.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between border-b border-slate-800/50 py-1.5">
                <span className="text-slate-200">Laba/(Rugi) Periode Berjalan</span>
                <span className="font-semibold text-white">
                  {formatIdr(bs.currentPeriodNetProfit)}
                </span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-emerald-300">
                <span>Total Ekuitas</span>
                <span>{formatIdr(bs.totalEquity)}</span>
              </div>
            </div>

            <div className="flex justify-between rounded-xl bg-emerald-500/15 px-3 py-2.5 text-sm font-extrabold text-emerald-300">
              <span>TOTAL LIABILITAS + EKUITAS ({bs.balanced ? "BALANCE ✓" : "CEK"})</span>
              <span>{formatIdr(bs.totalLiabilitiesAndEquity)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. CASH FLOW */}
      {subTab === "cash_flow" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-xs space-y-3">
          <h3 className="text-sm font-bold text-white">
            Laporan Arus Kas (Cash Flow Statement) — Metode Langsung
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-800 py-2">
              <span className="text-slate-300">Penerimaan Kas dari Pelanggan Lisensi &amp; Hardware</span>
              <span className="font-bold text-emerald-400">{formatIdr(cf.operatingInflows)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 py-2">
              <span className="text-slate-300">Pengeluaran Kas Operasional (Cloud, LLM API, Payroll, OpEx)</span>
              <span className="font-bold text-rose-300">({formatIdr(cf.operatingOutflows)})</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-950 px-3 py-2 font-bold text-white">
              <span>Arus Kas Bersih dari Aktivitas Operasi</span>
              <span>{formatIdr(cf.netOperatingCash)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 py-2">
              <span className="text-slate-300">Arus Kas dari Aktivitas Investasi (Server/Aset Tetap)</span>
              <span className="font-semibold text-white">{formatIdr(cf.investingCash)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 py-2">
              <span className="text-slate-300">Arus Kas dari Aktivitas Pendanaan (Modal Awal)</span>
              <span className="font-semibold text-cyan-300">{formatIdr(cf.financingCash)}</span>
            </div>
            <div className="flex justify-between rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm font-extrabold text-cyan-300">
              <span>SALDO KAS &amp; BANK AKHIR PERIODE</span>
              <span>{formatIdr(cf.endingCashBalance)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAX REPORT */}
      {subTab === "tax" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-xs space-y-4">
          <h3 className="text-sm font-bold text-white">
            Rekapitulasi Pajak PKP — PPN 11% (Faktur Pajak) &amp; PPh ({state.profile.npwp})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-950 p-4">
              <div className="text-slate-400">Dasar Pengenaan Pajak (DPP Lunas)</div>
              <div className="mt-1 text-base font-extrabold text-white">
                {formatIdr(tax.taxableSalesIdr)}
              </div>
              <div className="text-[11px] text-slate-400">{tax.paidInvoiceCount} Faktur Lunas</div>
            </div>
            <div className="rounded-xl bg-slate-950 p-4">
              <div className="text-slate-400">PPN Keluaran (Akun 2103 · 11%)</div>
              <div className="mt-1 text-base font-extrabold text-amber-300">
                {formatIdr(tax.ppnOutputIdr)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950 p-4">
              <div className="text-slate-400">PPN Masukan (Akun 1401 · 11%)</div>
              <div className="mt-1 text-base font-extrabold text-cyan-300">
                {formatIdr(tax.ppnInputIdr)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="text-amber-200">PPN Kurang Bayar (Setor SPT Masa)</div>
              <div className="mt-1 text-base font-extrabold text-white">
                {formatIdr(tax.netPpnPayableIdr)}
              </div>
              <div className="text-[11px] text-amber-200">
                + PPh 21/23 Terutang: {formatIdr(tax.pphPayableIdr)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL DOUBLE-ENTRY JOURNAL MODAL */}
      {journalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">
                Posting Jurnal Manual Double-Entry (PSAK)
              </h3>
              <button
                type="button"
                onClick={() => setJournalModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePostManualJournal} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  required
                  value={jDate}
                  onChange={(e) => setJDate(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  required
                  placeholder="Referensi"
                  value={jRef}
                  onChange={(e) => setJRef(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  required
                  placeholder="Deskripsi Jurnal *"
                  value={jDesc}
                  onChange={(e) => setJDesc(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-2">
                {jLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <select
                      value={line.accountCode}
                      onChange={(e) =>
                        setJLines((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, accountCode: e.target.value } : x,
                          ),
                        )
                      }
                      className="col-span-6 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                    >
                      {state.coa.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      placeholder="Debit"
                      value={line.debit}
                      onChange={(e) =>
                        setJLines((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, debit: Number(e.target.value) || 0 } : x,
                          ),
                        )
                      }
                      className="col-span-3 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-right text-white"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Kredit"
                      value={line.credit}
                      onChange={(e) =>
                        setJLines((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, credit: Number(e.target.value) || 0 } : x,
                          ),
                        )
                      }
                      className="col-span-3 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-right text-white"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setJLines((prev) => [
                      ...prev,
                      { accountCode: "1101", debit: 0, credit: 0, memo: "" },
                    ])
                  }
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  + Tambah Baris Akun
                </button>
              </div>

              <div
                className={`rounded-xl border p-3 ${
                  manualCheck.valid
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                }`}
              >
                Total Debit: <strong>{formatIdr(manualCheck.totalDebit)}</strong> · Total Kredit:{" "}
                <strong>{formatIdr(manualCheck.totalCredit)}</strong> —{" "}
                {manualCheck.valid ? "SEIMBANG ✓" : manualCheck.error}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJournalModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!manualCheck.valid}
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950 disabled:opacity-40"
                >
                  Posting ke Buku Besar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
