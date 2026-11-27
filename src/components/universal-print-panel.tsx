"use client";

import { useMemo, useState } from "react";
import {
  Bluetooth,
  Cable,
  CreditCard,
  Download,
  FileDown,
  Printer,
  Share2,
  Smartphone,
  Wifi,
} from "lucide-react";
import type { PrinterPaperProfile } from "@/lib/crm-types";
import {
  detectPrinterCapabilities,
  downloadEscPosBinary,
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
  const caps = useMemo(() => detectPrinterCapabilities(), []);

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
    </div>
  );
}
