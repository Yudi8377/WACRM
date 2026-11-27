"use client";

import { useMemo, useState } from "react";
import {
  Bluetooth,
  Cable,
  CreditCard,
  Download,
  Eye,
  FileDown,
  FileText,
  Printer,
  Share2,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";
import type { PrinterPaperProfile } from "@/lib/crm-types";
import {
  buildPrintableHtmlDocument,
  detectPrinterCapabilities,
  downloadEscPosBinary,
  downloadPrintableHtmlAsPdf,
  printViaBluetooth,
  printViaSystemSpooler,
  printViaUsbOtg,
  printViaUsbSerialEdc,
  printViaWifiHtml,
  shareOrDownloadPrintable,
  type PrintResult,
} from "@/lib/printer";

export interface UniversalPrintPanelProps {
  documentLabel: string;
  jobTitle: string;
  filenameBase: string;
  defaultPaper?: PrinterPaperProfile;
  buildHtml: () => Promise<string> | string;
  buildEscPos: () => { bytes: Uint8Array; base64: string; plainText: string };
  buildEdcEscPos?: () => { bytes: Uint8Array; base64: string; plainText: string };
  onResult: (res: PrintResult) => void;
  compact?: boolean;
}

const PAPER_OPTIONS: Array<{ id: PrinterPaperProfile; label: string; hint: string }> = [
  { id: "a4", label: "A4 (Inkjet / LaserJet)", hint: "Printer tinta/laser USB, WiFi, AirPrint, Mopria" },
  { id: "label100", label: "Label QR 100×150mm", hint: "Label pengiriman thermal / stiker A6" },
  { id: "thermal80", label: "Thermal 80mm", hint: "Printer kasir 80mm USB-C / BT / LAN" },
  { id: "thermal58", label: "Thermal 58mm", hint: "Printer kasir mini 58mm USB OTG / BT" },
  { id: "edc", label: "EDC Kompak 32-Kol", hint: "Terminal EDC / Mini POS thermal" },
];

export function UniversalPrintPanel({
  documentLabel,
  jobTitle,
  filenameBase,
  defaultPaper = "a4",
  buildHtml,
  buildEscPos,
  buildEdcEscPos,
  onResult,
  compact = false,
}: UniversalPrintPanelProps) {
  const [paper, setPaper] = useState<PrinterPaperProfile>(defaultPaper);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewRawHtml, setPreviewRawHtml] = useState<string | null>(null);
  const caps = useMemo(() => detectPrinterCapabilities(), []);

  const previewPaperSize: "a4" | "thermal58" | "thermal80" =
    paper === "thermal58" || paper === "edc"
      ? "thermal58"
      : paper === "thermal80"
        ? "thermal80"
        : "a4";

  const previewFullHtml = useMemo(
    () =>
      previewRawHtml
        ? buildPrintableHtmlDocument(jobTitle, previewRawHtml, previewPaperSize)
        : "",
    [jobTitle, previewRawHtml, previewPaperSize],
  );

  async function openDirectPdfPreview() {
    setBusy("preview");
    try {
      const html = await buildHtml();
      setPreviewRawHtml(html);
    } catch (err) {
      onResult({
        ok: false,
        method: "fallback",
        message: err instanceof Error ? err.message : "Gagal menyiapkan preview PDF.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function runAction(key: string, fn: () => Promise<PrintResult> | PrintResult) {
    setBusy(key);
    try {
      const res = await fn();
      onResult(res);
    } catch (err) {
      onResult({
        ok: false,
        method: "fallback",
        message: err instanceof Error ? err.message : "Gagal memproses cetak.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/90 ${compact ? "p-3" : "p-4"} space-y-3`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Printer className="h-4 w-4 text-emerald-600" />
            Studio Cetak Universal — {documentLabel}
          </div>
          <p className="text-[11px] text-slate-500">
            Mendukung HP Android, iOS (iPhone/iPad) &amp; PC via Kabel Micro-USB / USB-C OTG, Inkjet, LaserJet, Thermal, EDC, Bluetooth, WiFi &amp; PDF.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
          <Smartphone className="h-3 w-3 text-emerald-600" />
          {caps.isAndroidApk
            ? "Android APK Native (USB OTG + BT + PrintManager)"
            : caps.isAndroid
              ? `Android Web (${caps.supportsWebUsb ? "WebUSB OTG Aktif" : "Mopria / BT / PDF"})`
              : caps.isIos
                ? "iOS (AirPrint / Share ke Aplikasi Printer / PDF)"
                : `Desktop (${caps.supportsWebUsb ? "WebUSB + " : ""}USB Inkjet/LaserJet/EDC)`}
        </div>
      </div>

      {/* Paper / Printer Media Profile Picker */}
      <div className="flex flex-wrap gap-1.5">
        {PAPER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            title={opt.hint}
            onClick={() => setPaper(opt.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              paper === opt.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Primary Direct PDF Preview & Real .PDF Download Bar */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void openDirectPdfPreview()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          <Eye className="h-4 w-4 text-emerald-400" />
          <span>{busy === "preview" ? "Menyiapkan Preview..." : "Preview Cetak PDF Langsung"}</span>
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            runAction("real_pdf", async () => {
              const html = await buildHtml();
              const pdfRes = downloadPrintableHtmlAsPdf(jobTitle, html);
              return {
                ok: pdfRes.ok,
                method: "browser_wifi_print",
                message: pdfRes.message,
              };
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
        >
          <FileText className="h-4 w-4" />
          <span>{busy === "real_pdf" ? "Membuat PDF..." : "Unduh File PDF Asli (.pdf)"}</span>
        </button>
      </div>

      {/* Multi-Transport Action Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            runAction("usb_otg", () => printViaUsbOtg(buildEscPos(), jobTitle))
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <Cable className="h-3.5 w-3.5 shrink-0" />
          <span>{busy === "usb_otg" ? "Menghubungkan..." : "USB-C / Micro-USB OTG"}</span>
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            runAction("spooler", async () => {
              const html = await buildHtml();
              return printViaSystemSpooler(jobTitle, html, paper);
            })
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          <Printer className="h-3.5 w-3.5 shrink-0" />
          <span>Inkjet / LaserJet / AirPrint</span>
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            runAction("edc", () =>
              printViaUsbSerialEdc((buildEdcEscPos ?? buildEscPos)(), jobTitle),
            )
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
        >
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          <span>EDC / USB Serial</span>
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            runAction("bt", () => printViaBluetooth(buildEscPos()))
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
        >
          <Bluetooth className="h-3.5 w-3.5 shrink-0 text-blue-600" />
          <span>Bluetooth Thermal</span>
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            runAction("wifi", async () => {
              const html = await buildHtml();
              const wifiPaper =
                paper === "thermal80" || paper === "edc" ? "thermal58" : paper;
              return printViaWifiHtml(jobTitle, html, wifiPaper);
            })
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
        >
          <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>WiFi Jaringan / PDF</span>
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            runAction("share", async () => {
              const html = await buildHtml();
              return shareOrDownloadPrintable(jobTitle, html, filenameBase, paper);
            })
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
        >
          {caps.supportsWebShare ? (
            <Share2 className="h-3.5 w-3.5 shrink-0 text-violet-600" />
          ) : (
            <FileDown className="h-3.5 w-3.5 shrink-0 text-violet-600" />
          )}
          <span>Bagikan / File Cetak iOS</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2 text-[11px] text-slate-500">
        <span>
          Tips HP Android/iOS: Colok kabel USB-C / Micro-USB OTG untuk Thermal/EDC/Inkjet (Mopria), atau klik &ldquo;Inkjet / LaserJet / AirPrint&rdquo; untuk printer kabel/WiFi.
        </span>
        <button
          type="button"
          onClick={() =>
            runAction("bin", () => downloadEscPosBinary(buildEscPos(), filenameBase))
          }
          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
        >
          <Download className="h-3 w-3" /> Unduh Raw ESC/POS (.bin)
        </button>
      </div>

      {/* Live In-App Direct PDF & Print Preview Modal (Popup-Free, Works on Android APK / Mobile / iOS / Desktop!) */}
      {previewRawHtml && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview PDF ${jobTitle}`}
        >
          <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <span className="truncate">Preview Cetak &amp; PDF — {jobTitle}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ukuran kertas aktif: <strong className="text-emerald-300">{paper.toUpperCase()}</strong> · Tampilan WYSIWYG siap cetak atau simpan PDF.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void runAction("preview_print", () =>
                      printViaWifiHtml(
                        jobTitle,
                        previewRawHtml,
                        previewPaperSize === "thermal80" ? "thermal58" : previewPaperSize,
                      ),
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak / Simpan PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pdfRes = downloadPrintableHtmlAsPdf(jobTitle, previewRawHtml);
                    onResult({
                      ok: pdfRes.ok,
                      method: "browser_wifi_print",
                      message: pdfRes.message,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-xs font-extrabold text-white hover:bg-rose-400"
                >
                  <FileText className="h-3.5 w-3.5" /> Unduh .PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRawHtml(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
                  aria-label="Tutup Preview PDF"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-800/80 p-3 md:p-5">
              <div className="mx-auto h-full max-w-[820px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-300">
                <iframe
                  title={`PDF Preview ${jobTitle}`}
                  srcDoc={previewFullHtml}
                  className="h-full min-h-[65vh] w-full border-0 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
