"use client";

import { useState } from "react";
import {
  Bluetooth,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Laptop,
  Share2,
  Usb,
  Wifi,
} from "lucide-react";
import {
  exportAndTransferReport,
  generateReportArtifact,
  type DesktopTransferTransport,
  type ReportExportFormat,
  type ReportExportPayload,
} from "@/lib/report-exporter";

interface ReportExportHubProps {
  /** Builder function called on demand when user clicks Export / Transfer */
  buildPayload: () => ReportExportPayload;
  /** Optional short label displayed on header */
  heading?: string;
  /** Compact inline layout vs full card layout */
  compact?: boolean;
  onToast?: (msg: string, tone?: "ok" | "error") => void;
}

const FORMAT_OPTIONS: Array<{
  id: ReportExportFormat;
  label: string;
  ext: string;
  desc: string;
}> = [
  { id: "excel", label: "Excel", ext: ".xls", desc: "Multi-sheet Microsoft Excel / Calc" },
  { id: "pdf", label: "PDF Asli", ext: ".pdf", desc: "Siap Cetak & Arsip Corporate A4" },
  { id: "csv", label: "CSV", ext: ".csv", desc: "UTF-8 BOM Kompatibel Semua Spreadsheet" },
  { id: "json", label: "JSON", ext: ".json", desc: "Integrasi API / ERP / Backup" },
];

export function ReportExportHub({
  buildPayload,
  heading = "Ekspor Laporan & Transfer ke Desktop (USB / Bluetooth / Wi-Fi)",
  compact = false,
  onToast,
}: ReportExportHubProps) {
  const [format, setFormat] = useState<ReportExportFormat>("excel");
  const [busy, setBusy] = useState<DesktopTransferTransport | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function runExport(transport: DesktopTransferTransport, overrideFormat?: ReportExportFormat) {
    const activeFormat = overrideFormat ?? format;
    if (overrideFormat) setFormat(overrideFormat);
    setBusy(transport);
    setStatus(null);
    try {
      const payload = buildPayload();
      const res = await exportAndTransferReport(payload, activeFormat, transport);
      setStatus({ tone: res.ok ? "ok" : "error", text: res.message });
      onToast?.(res.message, res.ok ? "ok" : "error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengekspor laporan.";
      setStatus({ tone: "error", text: msg });
      onToast?.(msg, "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyForExcel() {
    try {
      const payload = buildPayload();
      const artifact = generateReportArtifact(payload, "excel");
      await navigator.clipboard.writeText(artifact.tsvForClipboard);
      const msg = "Tabel laporan disalin! Langsung tekan Ctrl+V / Tempel di Microsoft Excel Desktop.";
      setStatus({ tone: "ok", text: msg });
      onToast?.(msg, "ok");
    } catch {
      const msg = "Tidak dapat menyalin otomatis — gunakan tombol Unduh Excel (.xls).";
      setStatus({ tone: "error", text: msg });
      onToast?.(msg, "error");
    }
  }

  return (
    <div
      className={`rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/35 ${
        compact ? "p-3.5" : "p-4 md:p-5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
            <Laptop className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-white md:text-sm">{heading}</h4>
            <p className="text-[11px] text-slate-400">
              Pilih format dokumen (Excel, PDF, CSV, JSON) lalu unduh atau transfer langsung ke PC/Laptop via USB, Bluetooth, atau Wi-Fi.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCopyForExcel()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300"
        >
          <Copy className="h-3.5 w-3.5" /> Salin ke Excel
        </button>
      </div>

      {/* Format Selector Pills */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFormat(opt.id)}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              format === opt.id
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-200 shadow-sm"
                : "border-slate-800 bg-slate-950/75 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold">
                {opt.id === "excel" || opt.id === "csv" ? (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                )}
                {opt.label}
              </span>
              <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                {opt.ext}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[10px] text-slate-400">{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* Transfer & Download Action Buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runExport("download")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {busy === "download" ? "Membuat..." : `Unduh ${format.toUpperCase()}`}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runExport("usb")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-60"
        >
          <Usb className="h-4 w-4" />
          {busy === "usb" ? "Menyimpan..." : "Transfer via USB PC"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runExport("bluetooth")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 py-2.5 text-xs font-bold text-blue-200 transition hover:bg-blue-500/25 disabled:opacity-60"
        >
          <Bluetooth className="h-4 w-4" />
          {busy === "bluetooth" ? "Membuka..." : "Kirim via Bluetooth"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runExport("wifi")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-60"
        >
          <Wifi className="h-4 w-4" />
          <Share2 className="h-3 w-3 -ml-1" />
          {busy === "wifi" ? "Membagikan..." : "Transfer via Wi-Fi"}
        </button>
      </div>

      {status && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-medium ${
            status.tone === "ok"
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/35 bg-rose-500/10 text-rose-200"
          }`}
        >
          {status.text}
        </div>
      )}
    </div>
  );
}
