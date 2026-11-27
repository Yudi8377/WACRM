"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bluetooth,
  BookOpenCheck,
  Cable,
  CheckCircle2,
  Download,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";
import { CrudToolbar, PaginationBar } from "@/components/crud-toolbar";
import { UniversalPrintPanel } from "@/components/universal-print-panel";
import {
  formatIdr,
  type AccountingEntryRecord,
  type FinancialReportSummary,
  type PosOrderRecord,
  type StoreBusinessProfile,
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
  storeProfile: StoreBusinessProfile;
  entries: AccountingEntryRecord[];
  orders: PosOrderRecord[];
  report: FinancialReportSummary;
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

const PAGE_SIZE = 8;

export function AccountingView({
  adapter,
  storeProfile,
  entries,
  orders,
  report,
  onRefresh,
  onToast,
}: AccountingViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEntryNumber, setSelectedEntryNumber] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPrintStudio, setShowPrintStudio] = useState(false);

  const [kind, setKind] = useState<"expense" | "income" | "capital">("expense");
  const [categoryName, setCategoryName] = useState("Operasional & Pengiriman");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(
      (e) =>
        !q ||
        e.entryNumber.toLowerCase().includes(q) ||
        e.accountName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [entries, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedIsManual = Boolean(
    selectedEntryNumber &&
      entries.some((e) => e.entryNumber === selectedEntryNumber && e.referenceType === "manual"),
  );

  async function handleCreateEntry(e: FormEvent) {
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
      setModalOpen(false);
      await onRefresh();
      onToast(`Jurnal berpasangan ${res.entryNumber} dicatat (Debit = Kredit seimbang).`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mencatat jurnal akuntansi.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedEntryNumber || !selectedIsManual) return;
    if (!window.confirm(`Hapus pasangan jurnal manual ${selectedEntryNumber}?`)) return;
    try {
      await adapter.deleteAccountingEntry(selectedEntryNumber);
      setSelectedEntryNumber(null);
      await onRefresh();
      onToast(`Jurnal ${selectedEntryNumber} dihapus.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus jurnal.", "error");
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
    const html = renderFinancialReportPrintHtml(report, storeProfile, orders);
    const res = printViaWifiHtml(`Laporan Keuangan - ${storeProfile.businessName}`, html);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  async function handlePrintBluetooth() {
    const esc = buildEscPosFinancialReport(report, storeProfile, orders.length);
    const res = await printViaBluetooth(esc);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <BookOpenCheck className="h-3.5 w-3.5" />
            {storeProfile.businessName} · Akuntansi Double-Entry Otomatis
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Pembukuan, Laba Rugi &amp; Neraca Usaha
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleExportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button type="button" onClick={handlePrintBluetooth} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25">
            <Bluetooth className="h-3.5 w-3.5" /> Cetak BT
          </button>
          <button type="button" onClick={handlePrintWifi} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">
            <Wifi className="h-3.5 w-3.5" /> Cetak Laporan WiFi
          </button>
          <button
            type="button"
            onClick={() => setShowPrintStudio((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25"
          >
            <Cable className="h-3.5 w-3.5" /> Cetak USB / Inkjet / EDC
          </button>
        </div>
      </div>

      {showPrintStudio && (
        <UniversalPrintPanel
          documentLabel="Laporan Keuangan Laba Rugi & Neraca"
          jobTitle={`Laporan Keuangan - ${storeProfile.businessName}`}
          filenameBase={`laporan-keuangan-${new Date().toISOString().slice(0, 10)}`}
          defaultPaper="a4"
          buildHtml={() => renderFinancialReportPrintHtml(report, storeProfile, orders)}
          buildEscPos={() => buildEscPosFinancialReport(report, storeProfile, orders.length)}
          onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
        />
      )}

      {/* Balance Banner */}
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-xs ${report.isBalanced ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200" : "border-amber-500/40 bg-amber-500/15 text-amber-200"}`}>
        <div className="flex items-center gap-2 font-semibold">
          {report.isBalanced ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
          {report.isBalanced
            ? "Neraca Percobaan 100% SEIMBANG (Debit = Kredit terverifikasi otomatis)."
            : "Terdeteksi selisih Debit/Kredit — jalankan Self-Healing di menu Multi-Agent AI."}
        </div>
        <div className="font-mono">
          Debit: <strong>{formatIdr(report.totalDebits)}</strong> · Kredit: <strong>{formatIdr(report.totalCredits)}</strong>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Pendapatan Kotor</div>
          <div className="mt-1 text-lg font-bold text-emerald-400">{formatIdr(report.totalRevenue)}</div>
          <div className="text-[11px] text-slate-400">HPP: {formatIdr(report.totalCogs)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Laba Bersih</div>
          <div className={`mt-1 text-lg font-bold ${report.netProfit >= 0 ? "text-emerald-300" : "text-rose-400"}`}>{formatIdr(report.netProfit)}</div>
          <div className="text-[11px] text-slate-400">Margin {report.profitMarginPct.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Kas &amp; Bank / QRIS</div>
          <div className="mt-1 text-lg font-bold text-cyan-300">{formatIdr(report.cashBalance)}</div>
          <div className="text-[11px] text-slate-400">Piutang: {formatIdr(report.receivablesBalance)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Aset Persediaan &amp; PPN</div>
          <div className="mt-1 text-lg font-bold text-white">{formatIdr(report.inventoryValue)}</div>
          <div className="text-[11px] text-amber-300">Kewajiban: {formatIdr(report.totalLiabilities)}</div>
        </div>
      </div>

      {/* CRUD Toolbar */}
      <CrudToolbar
        dark
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari nomor jurnal, akun, keterangan..."
        onAddNew={() => setModalOpen(true)}
        addNewLabel="Tambah Jurnal Baru"
        hasSelection={selectedIsManual}
        onDeleteSelected={() => void handleDeleteSelected()}
        onRefresh={() => void onRefresh()}
      />

      {/* General Ledger Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
            <tr>
              <th className="px-3 py-3">Jurnal &amp; Tanggal</th>
              <th className="px-3 py-3">Akun</th>
              <th className="px-3 py-3 text-right">Debit</th>
              <th className="px-3 py-3 text-right">Kredit</th>
              <th className="px-3 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {paginated.map((entry) => (
              <tr
                key={entry.id}
                onClick={() => setSelectedEntryNumber(entry.entryNumber)}
                className={`cursor-pointer ${selectedEntryNumber === entry.entryNumber ? "bg-emerald-500/15" : "hover:bg-slate-800/40"}`}
              >
                <td className="px-3 py-2.5">
                  <div className="font-mono font-bold text-cyan-300">{entry.entryNumber}</div>
                  <div className="text-[10px] text-slate-400">{entry.entryDate}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-white">{entry.accountCode} · {entry.accountName}</div>
                  <div className="text-[11px] text-slate-400">{entry.description}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-300">{entry.debit > 0 ? formatIdr(entry.debit) : "-"}</td>
                <td className="px-3 py-2.5 text-right font-mono text-amber-300">{entry.credit > 0 ? formatIdr(entry.credit) : "-"}</td>
                <td className="px-3 py-2.5 text-right">
                  {entry.aiVerified && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationBar dark page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />

      {/* Sub-Module Modal: Tambah Jurnal Baru */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold">Sub-Modul Tambah Jurnal Double-Entry</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEntry} className="mt-4 space-y-3 text-xs">
              <label className="block">
                Jenis Transaksi
                <select value={kind} onChange={(e) => setKind(e.target.value as "expense" | "income" | "capital")} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                  <option value="expense">Beban Operasional (Debit Beban / Kredit Kas)</option>
                  <option value="income">Pendapatan Lain (Debit Kas / Kredit Pendapatan)</option>
                  <option value="capital">Setoran Modal (Debit Kas / Kredit Ekuitas)</option>
                </select>
              </label>
              <label className="block">
                Kategori Akun *
                <input required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>
              <label className="block">
                Nominal (Rp) *
                <input required type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250000" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>
              <label className="block">
                Keterangan Transaksi *
                <textarea required rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contoh: Pembayaran ongkir & listrik toko" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300">Batal</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                  {saving ? "Mencatat..." : "Posting Jurnal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
