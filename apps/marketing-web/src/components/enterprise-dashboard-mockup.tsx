"use client";

import { useState } from "react";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Package,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

type MockTab = "crm" | "erp" | "psak" | "hrd";

export function EnterpriseDashboardMockup() {
  const [activeTab, setActiveTab] = useState<MockTab>("crm");

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-emerald-950/30">
      {/* Window Chrome */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] text-slate-400">
            WACRM Enterprise v5.3.1 · Akses Privat Terenkripsi TLS 1.3
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { id: "crm", label: "CRM & 11 AI" },
            { id: "erp", label: "ERP & FIFO" },
            { id: "psak", label: "PSAK 72" },
            { id: "hrd", label: "HRD & RBAC" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as MockTab)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                activeTab === t.id
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview Body */}
      <div className="p-5">
        {activeTab === "crm" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricMini label="Chat AI Terjawab 24/7" value="1.482" sub="Respon rata-rata 3,2 dtk" />
              <MetricMini label="Prospek HOT Terkualifikasi" value="94 Lead" sub="Skor BANT > 75/100" />
              <MetricMini label="Konversi WhatsApp" value="+68%" sub="Cadence H+0 s.d. H+7" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <Bot className="h-4 w-4" /> Agen Sales Qualifier · Aktif
                </div>
                <p className="mt-2 rounded-xl bg-slate-900 p-2.5 text-[11px] leading-relaxed text-slate-300">
                  “Halo Pak Andi (PT Nusantara Distribusi), untuk kebutuhan 8 cabang &amp; 35 staf,
                  Edisi Enterprise AI kami menghemat ~Rp 14,2 Juta/bulan biaya operasional. Mau kami
                  aktifkan sesi onboarding privat hari ini?”
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Auto-Follow-Up Terjadwal: H+1</span>
                  <span className="font-bold text-emerald-400">Skor BANT: 91/100</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Pipeline Konversi Mingguan</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-3 space-y-2 text-[11px]">
                  {[
                    { label: "Lead Masuk Website & WA", pct: 95, color: "bg-sky-400" },
                    { label: "Kualifikasi Multi-Agent AI", pct: 78, color: "bg-emerald-400" },
                    { label: "Proposal & Trial Aktif", pct: 61, color: "bg-amber-400" },
                    { label: "Closed Won & Lisensi Terbit", pct: 46, color: "bg-violet-400" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between text-slate-300">
                        <span>{row.label}</span>
                        <span className="font-mono font-bold">{row.pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "erp" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricMini label="Gudang Tersinkron" value="12 Lokasi" sub="Stok real-time 0 selisih" />
              <MetricMini label="Metode Valuasi HPP" value="FIFO Akurat" sub="Batch & Expiry terjaga" />
              <MetricMini label="Hardware POS Bridge" value="Siap Pakai" sub="Kamera QR & Printer OK" />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs">
              <div className="mb-2 flex items-center gap-2 font-bold text-white">
                <Package className="h-4 w-4 text-emerald-400" /> Status Pergerakan SKU Kritis
              </div>
              <div className="space-y-2 text-[11px]">
                {[
                  { sku: "SKU-FMCG-01", name: "Karton Produk Utama A", stock: "420 Unit", badge: "Aman · FIFO OK" },
                  { sku: "SKU-POS-04", name: "Kertas Thermal 80mm Roll", stock: "18 Unit", badge: "Auto-PO Dibuat" },
                  { sku: "SKU-DIST-09", name: "Paket Bundling Korporat", stock: "145 Unit", badge: "Margin 41,2%" },
                ].map((item) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
                  >
                    <div>
                      <span className="font-mono text-emerald-300">{item.sku}</span>{" "}
                      <span className="font-semibold text-white">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-300">{item.stock}</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {item.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "psak" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricMini label="Status Neraca PSAK 72" value="100% Balance" sub="Selisih Debit/Kredit Rp 0" />
              <MetricMini label="Margin Kotor Konsolidasi" value="78,4%" sub="Otomatis dari POS & AR" />
              <MetricMini label="Rekap Pajak PPN 11%" value="Siap Lapor" sub="e-Faktur & Cetak A4" />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs">
              <div className="mb-2 flex items-center gap-2 font-bold text-white">
                <BarChart3 className="h-4 w-4 text-emerald-400" /> Jurnal Double-Entry Otomatis Terbaru
              </div>
              <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between rounded-lg bg-slate-900 px-3 py-1.5">
                  <span>1102 Bank BCA Operasional (D)</span>
                  <span className="text-emerald-300">Rp 22.089.000</span>
                </div>
                <div className="flex justify-between rounded-lg bg-slate-900 px-3 py-1.5">
                  <span>2102 Pendapatan Diterima di Muka (K)</span>
                  <span className="text-sky-300">Rp 19.900.000</span>
                </div>
                <div className="flex justify-between rounded-lg bg-slate-900 px-3 py-1.5">
                  <span>2103 Utang PPN Keluaran 11% (K)</span>
                  <span className="text-amber-300">Rp 2.189.000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "hrd" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricMini label="Kontrol Akses RBAC" value="7 Role Baku" sub="Owner, CFO, Sales, Gudang" />
              <MetricMini label="Payroll & Slip Gaji" value="1-Klik Cetak" sub="Hitung komisi & PPh 21" />
              <MetricMini label="Audit Keamanan" value="AES-256-GCM" sub="Log aktivitas terverifikasi" />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs">
              <div className="mb-2 flex items-center gap-2 font-bold text-white">
                <Users className="h-4 w-4 text-emerald-400" /> Matriks Izin Modul Enterprise
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                {[
                  "Direktur / Owner — Akses Penuh & Approval",
                  "Finance & Tax — PSAK, Invoice, e-Faktur",
                  "Sales & CS — CRM, AI Inbox, Quotation",
                  "Warehouse & POS — Stok FIFO, QR Scanner",
                ].map((line) => (
                  <div
                    key={line}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-2.5 py-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Akses aplikasi penuh terbuka eksklusif setelah pendaftaran terverifikasi
          </span>
          <a href="#daftar" className="font-bold text-emerald-300 hover:text-emerald-200">
            Minta Akses Privat →
          </a>
        </div>
      </div>
    </div>
  );
}

function MetricMini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-base font-extrabold text-white">{value}</div>
      <div className="mt-0.5 text-[10px] text-emerald-300">{sub}</div>
    </div>
  );
}
