"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  LayoutTemplate,
  Printer,
  RotateCcw,
  Save,
  Sliders,
} from "lucide-react";
import type { PosOrderRecord, StoreBusinessProfile } from "@/lib/crm-types";
import {
  INVOICE_ACCENT_PRESETS,
  INVOICE_TEMPLATE_OPTIONS,
  loadInvoiceLayoutSettings,
  resetInvoiceLayoutSettings,
  saveInvoiceLayoutSettings,
  type InvoiceHeaderAlignment,
  type InvoiceLayoutSettings,
  type InvoiceTemplateStyle,
} from "@/lib/invoice-layout";
import {
  buildPrintableHtmlDocument,
  downloadPrintableHtmlAsPdf,
  printViaWifiHtml,
  renderInvoicePrintHtml,
} from "@/lib/printer";

interface InvoiceLayoutStudioProps {
  storeProfile: StoreBusinessProfile;
  sampleOrder?: PosOrderRecord | null;
  onLayoutSaved?: (layout: InvoiceLayoutSettings) => void;
  onToast?: (message: string, tone?: "ok" | "error") => void;
}

const FALLBACK_SAMPLE_ORDER: PosOrderRecord = {
  id: "sample-preview",
  invoiceNumber: "INV-2026-0088",
  conversationId: null,
  contactId: null,
  customerName: "PT Maju Bersama Nusantara",
  customerPhone: "+62 812-3456-7890",
  shippingAddress: "Jl. Raya Darmo No. 88, Surabaya, Jawa Timur",
  channel: "whatsapp",
  subtotal: 650_000,
  discountAmount: 25_000,
  taxAmount: 68_750,
  totalAmount: 718_750,
  paymentMethod: "qris",
  paymentStatus: "paid",
  orderStatus: "confirmed",
  qrPayload: "WACRM|INV-2026-0088|718750",
  aiGenerated: false,
  fraudRiskScore: 0,
  shippingCourier: "JNE Express",
  shippingService: "JNE REG",
  shippingCost: 25_000,
  trackingCode: "JNE2026881092",
  notes: "Contoh preview tata letak invoice",
  items: [
    {
      id: "it-1",
      productId: "p1",
      sku: "KOPI-ARB-01",
      productName: "Kopi Arabika Kintamani 1kg (Fresh Roast)",
      quantity: 2,
      unitPrice: 220_000,
      costPrice: 120_000,
      lineTotal: 440_000,
    },
    {
      id: "it-2",
      productId: "p2",
      sku: "MATCHA-02",
      productName: "Matcha Ceremonial Uji Grade A 100g",
      quantity: 1,
      unitPrice: 210_000,
      costPrice: 105_000,
      lineTotal: 210_000,
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function InvoiceLayoutStudio({
  storeProfile,
  sampleOrder,
  onLayoutSaved,
  onToast,
}: InvoiceLayoutStudioProps) {
  const [layout, setLayout] = useState<InvoiceLayoutSettings>(() => loadInvoiceLayoutSettings());
  const [savedFlag, setSavedFlag] = useState(false);

  const previewOrder = sampleOrder ?? FALLBACK_SAMPLE_ORDER;

  const previewBodyHtml = useMemo(
    () => renderInvoicePrintHtml(previewOrder, storeProfile, "", layout),
    [previewOrder, storeProfile, layout],
  );

  const previewDocHtml = useMemo(
    () =>
      buildPrintableHtmlDocument(
        `Preview Invoice ${previewOrder.invoiceNumber}`,
        previewBodyHtml,
        layout.paperDefault === "thermal58" || layout.paperDefault === "edc"
          ? "thermal58"
          : layout.paperDefault === "thermal80"
            ? "thermal80"
            : "a4",
      ),
    [previewBodyHtml, previewOrder.invoiceNumber, layout.paperDefault],
  );

  function updateField<K extends keyof InvoiceLayoutSettings>(
    key: K,
    value: InvoiceLayoutSettings[K],
  ) {
    setSavedFlag(false);
    setLayout((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const persisted = saveInvoiceLayoutSettings(layout);
    setSavedFlag(true);
    onLayoutSaved?.(persisted);
    onToast?.(
      "Pengaturan bentuk Invoice (Tata Letak, Header, Kolom & Footer) disimpan! Otomatis berlaku untuk semua cetakan & PDF.",
      "ok",
    );
  }

  function handleReset() {
    const def = resetInvoiceLayoutSettings();
    setLayout(def);
    setSavedFlag(false);
    onLayoutSaved?.(def);
    onToast?.("Pengaturan bentuk Invoice dikembalikan ke standar default.", "ok");
  }

  return (
    <div className="space-y-4 rounded-3xl border border-cyan-500/35 bg-slate-900/95 p-4 text-slate-100 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 text-[11px] font-extrabold text-cyan-200">
            <LayoutTemplate className="h-3.5 w-3.5" /> Studio Bentuk Invoice POS, COD &amp; PDF
          </div>
          <h3 className="mt-2 text-lg font-extrabold text-white">
            Atur Tata Letak, Header, Logo, Kolom, Rekening, Tanda Tangan &amp; Footer Invoice
          </h3>
          <p className="text-xs text-slate-400">
            Setiap perubahan langsung terlihat di Preview Live di sebelah kanan dan otomatis diterapkan pada cetak PDF, Inkjet/LaserJet, WiFi &amp; Thermal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            {savedFlag ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {savedFlag ? "Tersimpan!" : "Simpan Bentuk Invoice"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* LEFT CONTROLS */}
        <div className="space-y-4 lg:col-span-6">
          {/* 1. Template Style */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
              <Sliders className="h-3.5 w-3.5" /> 1. Pilih Gaya Tata Letak &amp; Kertas Default
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {INVOICE_TEMPLATE_OPTIONS.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => updateField("templateStyle", tpl.id as InvoiceTemplateStyle)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    layout.templateStyle === tpl.id
                      ? "border-cyan-400 bg-cyan-500/15 text-white"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-extrabold">{tpl.label}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{tpl.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <label className="block">
                <span className="text-[10px] text-slate-400">Posisi Header</span>
                <select
                  value={layout.headerAlignment}
                  onChange={(e) =>
                    updateField("headerAlignment", e.target.value as InvoiceHeaderAlignment)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
                >
                  <option value="split">Split (Toko Kiri · No. Invoice Kanan)</option>
                  <option value="center">Rata Tengah (Simetris)</option>
                  <option value="left">Rata Kiri Bertumpuk</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-400">Ukuran Kertas Default</span>
                <select
                  value={layout.paperDefault}
                  onChange={(e) =>
                    updateField(
                      "paperDefault",
                      e.target.value as InvoiceLayoutSettings["paperDefault"],
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"
                >
                  <option value="a4">A4 (Inkjet / LaserJet / PDF)</option>
                  <option value="thermal80">Thermal Kasir 80mm</option>
                  <option value="thermal58">Thermal Kasir 58mm</option>
                  <option value="edc">EDC 32-Kolom</option>
                </select>
              </label>
            </div>

            {/* Accent Color Swatches */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-400">Warna Aksen Header &amp; Tabel</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {INVOICE_ACCENT_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => updateField("accentColor", c.hex)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      layout.accentColor === c.hex
                        ? "border-white bg-slate-800 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Header & Identitas */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 space-y-2.5 text-xs">
            <div className="font-extrabold text-emerald-300">2. Pengaturan Header &amp; Identitas</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] text-slate-400">Judul Dokumen Header</span>
                <input
                  value={layout.headerTitle}
                  onChange={(e) => updateField("headerTitle", e.target.value)}
                  placeholder="INVOICE PEMBAYARAN / FAKTUR PENJUALAN"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-400">Sub-Judul / Slogan Header</span>
                <input
                  value={layout.headerSubtitle}
                  onChange={(e) => updateField("headerSubtitle", e.target.value)}
                  placeholder="Contoh: Supplier Resmi Kopi & F&B Indonesia"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-400">Inisial Emblem Logo (maks 3 huruf)</span>
                <input
                  maxLength={3}
                  value={layout.logoInitials}
                  onChange={(e) => updateField("logoInitials", e.target.value.toUpperCase())}
                  placeholder="Auto"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-400">NPWP Usaha (Opsional)</span>
                <input
                  value={layout.customNpwp}
                  onChange={(e) => updateField("customNpwp", e.target.value)}
                  placeholder="01.234.567.8-901.000"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white"
                />
              </label>
            </div>

            {/* Visibility toggles */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] sm:grid-cols-3">
              {(
                [
                  ["showLogoBadge", "Emblem Logo"],
                  ["showAddress", "Alamat Toko"],
                  ["showPhoneAndEmail", "Telp & Email"],
                  ["showNpwp", "Tampilkan NPWP"],
                  ["showCourierAndResi", "Kurir & Resi"],
                  ["showQrCode", "QR Verifikasi"],
                  ["showSkuColumn", "Kode SKU Item"],
                  ["showUnitPriceColumn", "Kolom Harga Satuan"],
                  ["showDiscountRow", "Baris Diskon"],
                  ["showTaxRow", "Baris PPN 11%"],
                  ["showBankTransferBox", "Kotak Rekening"],
                  ["showSignatureBlock", "Blok Tanda Tangan"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(layout[key])}
                    onChange={(e) => updateField(key, e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-emerald-500"
                  />
                  <span className="text-slate-200">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Rekening, Syarat, Tanda Tangan & Footer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 space-y-2.5 text-xs">
            <div className="font-extrabold text-amber-300">
              3. Rekening Pembayaran, Syarat &amp; Footer Invoice
            </div>
            <label className="block">
              <span className="text-[10px] text-slate-400">Informasi Rekening Bank / Pembayaran</span>
              <input
                value={layout.bankTransferInfo}
                onChange={(e) => updateField("bankTransferInfo", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Syarat &amp; Ketentuan Retur / Garansi</span>
              <textarea
                rows={2}
                value={layout.termsAndConditions}
                onChange={(e) => updateField("termsAndConditions", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-400">Teks Footer / Ucapan Terima Kasih</span>
              <input
                value={layout.footerGreeting}
                onChange={(e) => updateField("footerGreeting", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-slate-400">Label TTD Kiri</span>
                <input
                  value={layout.signatureLeftLabel}
                  onChange={(e) => updateField("signatureLeftLabel", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-400">Label TTD Kanan</span>
                <input
                  value={layout.signatureRightLabel}
                  onChange={(e) => updateField("signatureRightLabel", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                />
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT LIVE PREVIEW */}
        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-3.5 lg:col-span-6">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
              <Eye className="h-4 w-4" /> Preview Live Bentuk Invoice ({layout.paperDefault.toUpperCase()})
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const res = printViaWifiHtml(
                    `Invoice ${previewOrder.invoiceNumber}`,
                    previewBodyHtml,
                    layout.paperDefault === "thermal58" || layout.paperDefault === "edc"
                      ? "thermal58"
                      : "a4",
                  );
                  onToast?.(res.message, res.ok ? "ok" : "error");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                <Printer className="h-3.5 w-3.5" /> Tes Cetak
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = downloadPrintableHtmlAsPdf(
                    `Invoice ${previewOrder.invoiceNumber}`,
                    previewBodyHtml,
                    storeProfile.businessName,
                  );
                  onToast?.(res.message, res.ok ? "ok" : "error");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-rose-400"
              >
                <FileText className="h-3.5 w-3.5" /> Unduh PDF
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden rounded-xl bg-white shadow-inner ring-1 ring-slate-300">
            <iframe
              title="Live Preview Tata Letak Invoice"
              srcDoc={previewDocHtml}
              className="h-[620px] w-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
