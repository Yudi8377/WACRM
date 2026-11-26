"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bluetooth,
  BookOpenCheck,
  CheckCircle2,
  Download,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import {
  formatIdr,
  type AccountingEntryRecord,
  type FinancialReportSummary,
  type PosOrderRecord,
} from "@/lib/crm-types";
import {
  buildEscPosFinancialReport,
  printViaBluetooth,
  printViaWifiHtml,
  renderFinancialReportPrintHtml,
} from "@/lib/printer";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface AccountingViewProps {
  adapter: WorkspaceAdapter;
  workspaceName: string;
  entries: AccountingEntryRecord[];
  orders: PosOrderRecord[];
  report: FinancialReportSummary;
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

export function AccountingView({
  adapter,
  workspaceName,
  entries,
  orders,
  report,
  onRefresh,
  onToast,
}: AccountingViewProps) {
  const [kind, setKind] = useState<"expense" | "income" | "capital">("expense");
  const [categoryName, setCategoryName] = useState("Operasional & Pengiriman");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreateEntry(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !description.trim()) return;
    setSaving(true);
    try {
      const res = await adapter.createAccountingEntry({
        kind,
        categoryName: categoryName.trim() || "Umum",
        amount: numericAmount,
        description: description.trim(),
      });
      setAmount("");
      setDescription("");
      await onRefresh();
      onToast(`Jurnal berpasangan ${res.entryNumber} dicatat (Debit = Kredit seimbang).`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mencatat jurnal akuntansi.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const header = "No Jurnal,Tanggal,Kode Akun,Nama Akun,Tipe,Debit,Kredit,Keterangan\n";
    const rows = entries
      .map(
        (e) =>
          `"${e.entryNumber}","${e.entryDate}","${e.accountCode}","${e.accountName.replace(/"/g, '""')}","${e.accountType}",${e.debit},${e.credit},"${e.description.replace(/"/g, '""')}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jurnal-akuntansi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Buku besar akuntansi diekspor ke CSV.");
  }

  function handlePrintWifi() {
    const html = renderFinancialReportPrintHtml(report, workspaceName, orders);
    const res = printViaWifiHtml("Laporan Keuangan & Neraca", html);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  async function handlePrintBluetooth() {
    const esc = buildEscPosFinancialReport(report, workspaceName, orders.length);
    const res = await printViaBluetooth(esc);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Akuntansi Double-Entry Otomatis · Audit AI Real-Time
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Pembukuan, Laba Rugi &amp; Neraca Perusahaan
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={handlePrintBluetooth}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            <Bluetooth className="h-3.5 w-3.5" /> Cetak BT
          </button>
          <button
            type="button"
            onClick={handlePrintWifi}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            <Wifi className="h-3.5 w-3.5" /> Cetak Laporan WiFi
          </button>
        </div>
      </div>

      {/* Balance Integrity Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-xs ${
          report.isBalanced
            ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/40 bg-amber-500/15 text-amber-200"
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          {report.isBalanced ? (
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          )}
          {report.isBalanced
            ? "Neraca Percobaan 100% SEIMBANG (Debit = Kredit terverifikasi otomatis oleh AI Guardian)."
            : "Terdeteksi selisih Debit/Kredit — jalankan Self-Healing di menu Multi-Agent AI untuk penyeimbangan otomatis."}
        </div>
        <div className="font-mono">
          Debit: <strong>{formatIdr(report.totalDebits)}</strong> · Kredit:{" "}
          <strong>{formatIdr(report.totalCredits)}</strong>
        </div>
      </div>

      {/* P&L and Balance Sheet Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Pendapatan Kotor</div>
          <div className="mt-1 text-lg font-bold text-emerald-400">
            {formatIdr(report.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-400">HPP: {formatIdr(report.totalCogs)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Laba Bersih (Net Profit)</div>
          <div
            className={`mt-1 text-lg font-bold ${
              report.netProfit >= 0 ? "text-emerald-300" : "text-rose-400"
            }`}
          >
            {formatIdr(report.netProfit)}
          </div>
          <div className="text-[11px] text-slate-400">
            Beban Ops: {formatIdr(report.totalExpenses)} · Margin {report.profitMarginPct.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Kas &amp; Bank / QRIS</div>
          <div className="mt-1 text-lg font-bold text-cyan-300">
            {formatIdr(report.cashBalance)}
          </div>
          <div className="text-[11px] text-slate-400">
            Piutang: {formatIdr(report.receivablesBalance)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Aset Persediaan &amp; Kewajiban</div>
          <div className="mt-1 text-lg font-bold text-white">
            {formatIdr(report.inventoryValue)}
          </div>
          <div className="text-[11px] text-amber-300">
            Kewajiban/PPN: {formatIdr(report.totalLiabilities)}
          </div>
        </div>
      </div>

      {/* Main Grid: Add Journal + General Ledger */}
      <div className="grid gap-5 xl:grid-cols-12">
        <form
          onSubmit={handleCreateEntry}
          className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 xl:col-span-4"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <PlusCircle className="h-4 w-4 text-emerald-400" />
            Catat Jurnal Akuntansi Manual
          </div>
          <p className="text-xs text-slate-400">
            Transaksi POS tercatat otomatis. Gunakan formulir ini untuk biaya operasional, pemasukan non-POS, atau tambahan modal.
          </p>
          <div>
            <label className="text-xs text-slate-400">Jenis Transaksi</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "expense" | "income" | "capital")}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            >
              <option value="expense">Beban Operasional (Debit Beban / Kredit Kas)</option>
              <option value="income">Pendapatan Lain (Debit Kas / Kredit Pendapatan)</option>
              <option value="capital">Setoran Modal (Debit Kas / Kredit Ekuitas)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Kategori Akun</label>
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Nominal (Rp) *</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250000"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Keterangan Transaksi *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Contoh: Pembayaran paket kurir & listrik kantor"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? "Mencatat..." : "Posting Jurnal Double-Entry"}
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 xl:col-span-8">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-3 py-3">Jurnal &amp; Tanggal</th>
                <th className="px-3 py-3">Akun</th>
                <th className="px-3 py-3 text-right">Debit</th>
                <th className="px-3 py-3 text-right">Kredit</th>
                <th className="px-3 py-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2.5">
                    <div className="font-mono font-bold text-cyan-300">{entry.entryNumber}</div>
                    <div className="text-[10px] text-slate-400">{entry.entryDate}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-white">
                      {entry.accountCode} · {entry.accountName}
                    </div>
                    <div className="text-[11px] text-slate-400">{entry.description}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-300">
                    {entry.debit > 0 ? formatIdr(entry.debit) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-300">
                    {entry.credit > 0 ? formatIdr(entry.credit) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {entry.aiVerified && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      {entry.referenceType === "manual" && (
                        <button
                          type="button"
                          onClick={async () => {
                            await adapter.deleteAccountingEntry(entry.entryNumber);
                            await onRefresh();
                            onToast(`Jurnal ${entry.entryNumber} dihapus.`);
                          }}
                          className="rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                          title="Hapus pasangan jurnal manual"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
