"use client";

import {
  ArrowUpRight,
  BarChart3,
  Download,
  Flame,
  Globe2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { PublisherIntelligenceReport } from "@/lib/intelligence-types";
import { DonutPieChart } from "./svg-charts";

interface EconomicRadarViewProps {
  report: PublisherIntelligenceReport | null;
  loading: boolean;
  onRefresh: () => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

function formatIdr(n: number): string {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export function EconomicRadarView({
  report,
  loading,
  onRefresh,
  onToast,
}: EconomicRadarViewProps) {
  if (loading && !report) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        Menghitung statistik ekonomi, tren produk &amp; radar perilaku pembeli...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-300">Data statistik ekonomi belum tersedia.</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Muat Statistik Ekonomi
        </button>
      </div>
    );
  }

  const { economics, usage } = report;

  function handleExportCsv() {
    if (!report) return;
    const rows = [
      ["Kategori Produk", "Demand Index", "Pertumbuhan (%)", "Harga Rata-Rata (IDR)", "Total Unit", "Observed GMV (IDR)", "Momentum"],
      ...report.economics.productTrends.map((p) => [
        p.category,
        String(p.demandIndex),
        String(p.growthPct),
        String(p.avgPriceIdr),
        String(p.units),
        String(p.gmvIdr),
        p.momentum,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wacrm-statistik-ekonomi-umkm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Laporan CSV Statistik Ekonomi & Tren Produk berhasil diunduh!");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Executive Economic Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-cyan-500/35 bg-gradient-to-br from-slate-900 via-cyan-950/35 to-indigo-950/40 p-5 md:p-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 text-[11px] font-bold text-cyan-200">
            <Globe2 className="h-3.5 w-3.5" /> WACRM Economic Intelligence Radar · Tren Produk, Pasar &amp; Perilaku Pembeli
          </div>
          <h2 className="mt-2.5 text-2xl font-extrabold text-white">
            Statistik Ekonomi Ekosistem UMKM &amp; Intelijen Pasar Real-Time
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Agregasi anonim dari aktivitas POS, katalog, dan percakapan lintas merchant WACRM — menghadirkan indeks tren produk terlaris, pergeseran metode pembayaran (QRIS vs COD), jam emas checkout, tingkat repeat order, dan peta pertumbuhan ekonomi regional Indonesia.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3.5 py-2.5 text-xs font-extrabold text-cyan-200 hover:bg-cyan-500/25"
          >
            <Download className="h-4 w-4" /> Ekspor CSV Ekonomi
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Perbarui Radar
          </button>
        </div>
      </div>

      {/* Macro Economic KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Observed GMV Ekosistem
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-emerald-400">
            {formatIdr(economics.totalObservedGmvIdr)}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-300/90">
            Agregasi tren kategori aktif
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShoppingBag className="h-3.5 w-3.5 text-cyan-400" /> Rata-rata Keranjang (AOV)
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-white">
            {formatIdr(economics.avgOrderValueIdr)}
          </div>
          <div className="mt-0.5 text-[10px] text-cyan-300">
            +28% pada paket bundling
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> Rasio Repeat Buyer
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-amber-300">
            {economics.repeatBuyerRatePct}%
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Pelanggan belanja ulang
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Zap className="h-3.5 w-3.5 text-violet-400" /> Lift Closing AI (&lt;15 dtk)
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-violet-300">
            +{economics.aiFastResponseLiftPct}%
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Konversi chat → transfer
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Jam Emas Checkout
          </div>
          <div className="mt-1.5 text-xl font-extrabold text-pink-300">
            {economics.peakCheckoutWindow}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Puncak aktivitas: {usage.peakHourLabel}
          </div>
        </div>
      </div>

      {/* PIE CHARTS: BUYING CHANNELS + PAYMENT PREFERENCE */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DonutPieChart
          title="Pie Chart — Kanal Pembelian & Akuisisi Pasar"
          subtitle="Distribusi sumber pesanan pembeli lintas WhatsApp, Medsos & POS"
          slices={economics.channelPreference}
          centerValue={`${economics.channelPreference[0]?.percent ?? 48}%`}
          centerLabel={economics.channelPreference[0]?.label ?? "WhatsApp"}
        />
        <DonutPieChart
          title="Pie Chart — Preferensi Pembayaran Pembeli"
          subtitle="Pergeseran perilaku transaksi digital QRIS vs Transfer VA vs COD"
          slices={economics.paymentPreference}
          centerValue={`${economics.paymentPreference[0]?.percent ?? 44}%`}
          centerLabel={economics.paymentPreference[0]?.label ?? "QRIS"}
        />
      </div>

      {/* PRODUCT & MARKET TREND INDEX TABLE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              Indeks Tren Kategori Produk &amp; Permintaan Pasar UMKM
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Mengukur indeks permintaan, laju pertumbuhan, harga rata-rata, dan volume transaksi tiap kategori
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2.5 pr-4">Kategori Produk</th>
                <th className="py-2.5 pr-4">Indeks Permintaan</th>
                <th className="py-2.5 pr-4">Pertumbuhan</th>
                <th className="py-2.5 pr-4">Harga Rata-Rata</th>
                <th className="py-2.5 pr-4">Volume Unit</th>
                <th className="py-2.5 pr-4">Nilai GMV</th>
                <th className="py-2.5">Momentum Pasar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {economics.productTrends.map((p) => (
                <tr key={p.category} className="hover:bg-slate-800/30">
                  <td className="py-3 pr-4 font-bold text-white">{p.category}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-800">
                        <div
                          style={{ width: `${p.demandIndex}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                        />
                      </div>
                      <span className="font-mono font-bold text-emerald-300">{p.demandIndex}/100</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono font-bold text-emerald-400">
                    <span className="inline-flex items-center gap-0.5">
                      <ArrowUpRight className="h-3.5 w-3.5" /> +{p.growthPct}%
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-200">{formatIdr(p.avgPriceIdr)}</td>
                  <td className="py-3 pr-4 font-mono text-slate-300">
                    {p.units.toLocaleString("id-ID")} unit
                  </td>
                  <td className="py-3 pr-4 font-mono font-bold text-cyan-300">
                    {formatIdr(p.gmvIdr)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        p.momentum === "Naik Tajam"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : p.momentum === "Peluang Baru"
                            ? "bg-violet-500/20 text-violet-300"
                            : "bg-cyan-500/20 text-cyan-300"
                      }`}
                    >
                      {p.momentum}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BUYER BEHAVIOR INSIGHTS */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {economics.buyerBehaviorInsights.map((b) => (
          <div
            key={b.metric}
            className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-xs"
          >
            <div className="text-[11px] font-semibold text-cyan-300">{b.metric}</div>
            <div className="mt-1.5 text-base font-extrabold text-white">{b.value}</div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{b.signal}</p>
          </div>
        ))}
      </div>

      {/* REGIONAL UMKM ECONOMIC HEALTH INDEX */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5">
        <h3 className="text-sm font-extrabold text-white">
          Indeks Pertumbuhan Ekonomi UMKM per Wilayah Indonesia
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Pemetaan sebaran aktivitas dagang &amp; komoditas unggulan per regional untuk strategi ekspansi &amp; kemitraan daerah
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {economics.regionalEconomyIndex.map((reg) => (
            <div
              key={reg.region}
              className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-white">{reg.region}</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  +{reg.growthPct}% YoY
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Pangsa GMV Regional</span>
                <strong className="font-mono text-cyan-300">{reg.gmvSharePct}%</strong>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${Math.min(100, reg.gmvSharePct * 3)}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>Unggulan: <strong className="text-slate-200">{reg.topCategory}</strong></span>
                <span>{reg.activeMerchants} merchant</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
