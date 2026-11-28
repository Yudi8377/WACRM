"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Crown,
  Flame,
  LineChart,
  Lock,
  Package,
  Printer,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { ReportExportHub } from "@/components/report-export-hub";
import { UniversalPrintPanel } from "@/components/universal-print-panel";
import {
  formatIdr,
  type AppEditionId,
  type ConversationRecord,
  type ErpProductRecord,
  type PosOrderRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import { editionHasFeature } from "@/lib/editions";
import {
  buildSovereignBuyerInterestForecast,
  buildWinningProductRecommendations,
} from "@/lib/market-forecasting";
import {
  buildEscPosTextReport,
  renderMarketForecastPrintHtml,
} from "@/lib/printer";

interface MarketForecastViewProps {
  editionId: AppEditionId;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  conversations: ConversationRecord[];
  storeProfile: StoreBusinessProfile;
  onOpenEditions: () => void;
  onNotify: (msg: string) => void;
}

export function MarketForecastView({
  editionId,
  products,
  orders,
  conversations,
  storeProfile,
  onOpenEditions,
  onNotify,
}: MarketForecastViewProps) {
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(90);
  const hasSovereignForecast = editionHasFeature(editionId, "buyer_interest_forecast");

  const productIntel = useMemo(
    () =>
      buildWinningProductRecommendations({
        products,
        orders,
        conversations,
        storeName: storeProfile.businessName,
      }),
    [products, orders, conversations, storeProfile.businessName],
  );

  const sovereignForecast = useMemo(
    () =>
      buildSovereignBuyerInterestForecast({
        products,
        orders,
        storeName: storeProfile.businessName,
        horizonDays,
      }),
    [products, orders, storeProfile.businessName, horizonDays],
  );

  // SVG chart scaling for 90-day forecast curve
  const maxChartVal = Math.max(
    1,
    ...sovereignForecast.forecastSeries.map((p) => p.optimisticGmvIdr),
  );
  const svgW = 640;
  const svgH = 200;
  const padX = 36;
  const padY = 20;

  function buildPolyline(selector: (p: (typeof sovereignForecast.forecastSeries)[number]) => number) {
    const arr = sovereignForecast.forecastSeries;
    return arr
      .map((pt, i) => {
        const x = padX + (i / Math.max(1, arr.length - 1)) * (svgW - padX * 2);
        const y = svgH - padY - (selector(pt) / maxChartVal) * (svgH - padY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* PART 1: MULTI-AGENT AI SARAN PRODUK PALING LAKU (ENTERPRISE AI SUITE & SOVEREIGN CORPORATE) */}
      <div className="rounded-3xl border border-violet-500/35 bg-gradient-to-br from-slate-900 via-violet-950/30 to-slate-900 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-500/15 px-3 py-1 text-[11px] font-extrabold text-violet-200">
              <Bot className="h-3.5 w-3.5" /> Multi-Agent AI Product Recommender · Enterprise AI Suite &amp; Sovereign
            </div>
            <h2 className="mt-2.5 text-2xl font-extrabold text-white">
              Saran Produk Paling Laku &amp; Peluang Pasar oleh Multi-Agent AI
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {productIntel.executiveSummary}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {productIntel.analyzingAgents.map((ag) => (
              <span
                key={ag}
                className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-cyan-300"
              >
                ✓ {ag}
              </span>
            ))}
          </div>
        </div>

        {/* Winning Products in Catalog */}
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Flame className="h-4 w-4 text-amber-400" />
            Peringkat Produk Katalog Paling Berpotensi Laku Keras
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {productIntel.topCatalogWinners.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                    Skor Peluang {item.opportunityScore}/100
                  </span>
                  <span className="font-mono text-[10px] font-bold text-amber-300">
                    Margin {item.estimatedMarginPct}%
                  </span>
                </div>
                <div className="mt-2 font-extrabold text-white">{item.productName}</div>
                <div className="mt-0.5 text-[11px] text-cyan-300">
                  {formatIdr(item.targetPriceIdr)} · {item.bestChannel}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{item.aiReason}</p>
                <div className="mt-2.5 rounded-xl border border-violet-500/25 bg-violet-500/10 p-2.5 text-[11px] text-violet-200">
                  <strong>Saran Aksi AI:</strong> {item.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Market Opportunities + Bundling Ideas */}
        <div className="mt-5 grid gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 lg:col-span-7">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
              <Sparkles className="h-4 w-4" /> Rekomendasi Produk Baru Laku di Pasar Nasional (Belum Ada di Katalog)
            </h4>
            <div className="mt-3 space-y-2.5">
              {productIntel.newMarketWinners.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-white">{m.productName}</span>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                      Target {formatIdr(m.targetPriceIdr)} · Margin {m.estimatedMarginPct}%
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{m.aiReason}</p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-300">→ {m.recommendedAction}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 lg:col-span-5">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
              <Target className="h-4 w-4" /> Ide Paket Bundling AI (Dongkrak Nilai Keranjang)
            </h4>
            <div className="mt-3 space-y-2.5">
              {productIntel.bundleIdeas.map((b, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white">{b.title}</span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                      +{b.projectedAovLiftPct}% AOV
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-amber-200">
                    {b.itemsSummary} · <strong>{formatIdr(b.bundlePriceIdr)}</strong>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-300">&ldquo;{b.copyHook}&rdquo;</p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(b.copyHook);
                      onNotify("Copy promo bundling AI disalin ke clipboard!");
                    }}
                    className="mt-2 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/30"
                  >
                    Salin Copy Promo
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PART 2: MENU KHUSUS TREN MINAT PEMBELI & FORECASTING (EKSKLUSIF SOVEREIGN CORPORATE) */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold text-amber-200">
              <Crown className="h-3.5 w-3.5" /> EKSKLUSIF SOVEREIGN CORPORATE · Tren Minat Pembeli &amp; Forecasting
            </div>
            <h2 className="mt-2.5 text-2xl font-extrabold text-white">
              Menu Tren Minat Pembeli &amp; Forecasting Permintaan 30–90 Hari
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Prediksi kurva omzet 3 skenario (Konservatif, Realistis, Optimis), indeks minat pembeli per segmen &amp; jam belanja, simulasi dampak diskon/COD terhadap laba bersih, serta rencana belanja stok FIFO &amp; modal kerja.
            </p>
          </div>

          {hasSovereignForecast ? (
            <div className="flex gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-bold">
              {([30, 60, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setHorizonDays(d)}
                  className={`rounded-lg px-3 py-1.5 ${
                    horizonDays === d ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {d} Hari
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenEditions}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
            >
              <Lock className="h-3.5 w-3.5" /> Aktifkan Sovereign Corporate
            </button>
          )}
        </div>

        {!hasSovereignForecast ? (
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-slate-950/85 p-6 text-center">
            <Crown className="mx-auto h-10 w-10 text-amber-400" />
            <h3 className="mt-3 text-base font-extrabold text-white">
              Menu Tren Minat Pembeli &amp; Forecasting Khusus Edisi Sovereign Corporate
            </h3>
            <p className="mx-auto mt-1.5 max-w-xl text-xs leading-relaxed text-slate-300">
              Pada edisi <strong>Enterprise AI Suite</strong>, Anda sudah dapat menikmati <strong>Multi-Agent AI Saran Produk Terlaris</strong> di atas. Untuk membuka <strong>Kurva Forecasting Permintaan 30–90 Hari, Radar Minat Pembeli, Simulasi Elastisitas Harga/Promo, &amp; Perencanaan Modal Restock FIFO</strong>, aktifkan License Key <strong>Sovereign Corporate</strong>.
            </p>
            <button
              type="button"
              onClick={onOpenEditions}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
            >
              Lihat Sovereign Corporate &amp; Aktivasi Key <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
                <div className="text-[11px] text-slate-400">Indeks Minat Pembeli</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-400">
                  {sovereignForecast.buyerIntentScore} / 100
                </div>
                <div className="text-[10px] text-emerald-300">Momentum pasar sangat kuat</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
                <div className="text-[11px] text-slate-400">Forecast Realistis ({horizonDays}h)</div>
                <div className="mt-1 text-xl font-extrabold text-cyan-300">
                  {formatIdr(sovereignForecast.projected90dBaseGmvIdr)}
                </div>
                <div className="text-[10px] text-slate-400">Berdasarkan pola beli aktif</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
                <div className="text-[11px] text-slate-400">Forecast Optimis ({horizonDays}h)</div>
                <div className="mt-1 text-xl font-extrabold text-amber-300">
                  {formatIdr(sovereignForecast.projected90dOptimisticGmvIdr)}
                </div>
                <div className="text-[10px] text-amber-200">Dengan Bundling + AI Auto-FollowUp</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
                <div className="text-[11px] text-slate-400">Estimasi Modal Restock 30h</div>
                <div className="mt-1 text-xl font-extrabold text-white">
                  {formatIdr(sovereignForecast.recommendedWorkingCapitalIdr)}
                </div>
                <div className="text-[10px] text-slate-400">Anti kehabisan stok &amp; anti basi</div>
              </div>
            </div>

            {/* Interactive SVG Forecasting Curve */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                  <LineChart className="h-4 w-4 text-amber-400" />
                  Kurva Forecasting Omzet &amp; Permintaan Pembeli ({horizonDays} Hari ke Depan)
                </h3>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Optimis
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Realistis (Base)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Konservatif
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-52 w-full min-w-[500px]">
                  {[0.25, 0.5, 0.75, 1].map((g) => {
                    const y = svgH - padY - g * (svgH - padY * 2);
                    return (
                      <line
                        key={g}
                        x1={padX}
                        y1={y}
                        x2={svgW - padX}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                    );
                  })}
                  <polyline
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    points={buildPolyline((p) => p.conservativeGmvIdr)}
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    points={buildPolyline((p) => p.baseGmvIdr)}
                  />
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    points={buildPolyline((p) => p.optimisticGmvIdr)}
                  />
                  {sovereignForecast.forecastSeries.map((pt, i) => {
                    const x =
                      padX +
                      (i / Math.max(1, sovereignForecast.forecastSeries.length - 1)) *
                        (svgW - padX * 2);
                    const yBase =
                      svgH - padY - (pt.baseGmvIdr / maxChartVal) * (svgH - padY * 2);
                    return (
                      <g key={pt.label}>
                        <circle cx={x} cy={yBase} r="4.5" fill="#10b981" />
                        <text
                          x={x}
                          y={svgH - 4}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="10"
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Buyer Interest Segments */}
            <div className="grid gap-3 md:grid-cols-2">
              {sovereignForecast.buyerSegments.map((seg) => (
                <div
                  key={seg.segment}
                  className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-white">{seg.segment}</span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                      Minat {seg.interestIndex}/100 (+{seg.growthPct}%)
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-cyan-300">
                    <span>⏰ {seg.peakHours}</span>
                    <span>· 💳 {seg.preferredPayment}</span>
                    <span>· 🏷️ {seg.priceSweetSpot}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    <strong>Pemicu Beli:</strong> {seg.triggerFactor}
                  </p>
                </div>
              ))}
            </div>

            {/* Price & Promo Elasticity Simulator + Restock Plan */}
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 lg:col-span-6">
                <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                  <TrendingUp className="h-4 w-4" /> Simulasi Elastisitas Harga, Diskon &amp; COD
                </h4>
                <div className="mt-3 space-y-2.5">
                  {sovereignForecast.promoSimulations.map((sim) => (
                    <div
                      key={sim.scenarioName}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white">{sim.scenarioName}</span>
                        <span className="font-mono text-[11px] font-bold text-emerald-400">
                          Laba {formatIdr(sim.projectedNetProfitIdr)}/bln
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-300">
                        Omzet Proyeksi: <strong>{formatIdr(sim.projectedMonthlyRevenueIdr)}</strong> · Lift Order: <strong>+{sim.projectedOrderLiftPct}%</strong>
                      </div>
                      <div className="mt-1 text-[10px] text-cyan-300">{sim.verdict}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 lg:col-span-6">
                <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
                  <Package className="h-4 w-4" /> Proyeksi Belanja Stok FIFO 30 Hari ke Depan
                </h4>
                <div className="mt-3 space-y-2">
                  {sovereignForecast.restockPriorityQueue.map((r) => (
                    <div
                      key={r.sku}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-bold text-white">{r.productName}</div>
                        <div className="text-[10px] text-slate-400">
                          Stok kini {r.currentStock} · Prediksi butuh {r.predicted30dDemand} pcs
                        </div>
                      </div>
                      <div className="shrink-0 text-right font-mono">
                        <div className="font-extrabold text-emerald-300">
                          Order +{r.suggestedOrderQty} pcs
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatIdr(r.estimatedBudgetIdr)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ITEM #4: STUDIO CETAK & EKSPOR LAPORAN TREN MINAT & AI PRODUK */}
      <div className="space-y-4 rounded-3xl border border-violet-500/35 bg-slate-900/95 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-white">
              <Printer className="h-4 w-4 text-violet-400" />
              Cetak &amp; Ekspor Laporan Tren Minat Pembeli &amp; AI Produk ({horizonDays} Hari)
            </h3>
            <p className="text-xs text-slate-400">
              Preview langsung PDF, cetak ke Inkjet/LaserJet/Thermal, atau kirim laporan proyeksi omzet &amp; produk terlaris AI ke Desktop (Excel / PDF / CSV via USB, Bluetooth, Wi-Fi).
            </p>
          </div>
        </div>

        <UniversalPrintPanel
          documentLabel={`Laporan Tren Minat & AI Produk (${horizonDays} Hari)`}
          jobTitle={`Laporan Tren Minat & AI Produk ${horizonDays} Hari — ${storeProfile.businessName}`}
          filenameBase={`laporan-tren-minat-ai-produk-${horizonDays}h`}
          defaultPaper="a4"
          buildHtml={() =>
            renderMarketForecastPrintHtml({
              storeOrName: storeProfile,
              productIntel,
              sovereignForecast,
              includeSovereignForecast: hasSovereignForecast,
            })
          }
          buildEscPos={() =>
            buildEscPosTextReport(
              `LAPORAN AI PRODUK & FORECAST ${horizonDays}H`,
              storeProfile,
              [
                `Toko: ${storeProfile.businessName}`,
                `Indeks Minat: ${sovereignForecast.buyerIntentScore}/100`,
                `Proyeksi Dasar: ${formatIdr(sovereignForecast.projected90dBaseGmvIdr)}`,
                ...productIntel.topCatalogWinners
                  .slice(0, 6)
                  .map(
                    (w) =>
                      `#${w.opportunityScore} ${w.productName} (${w.demandMomentum}) ${formatIdr(w.targetPriceIdr)}`,
                  ),
              ],
            )
          }
          onResult={(res) => onNotify(res.message)}
        />

        <ReportExportHub
          heading="Ekspor Laporan Tren Minat & Saran Produk AI (Excel Multi-Sheet / PDF / CSV) ke Desktop"
          onToast={(msg) => onNotify(msg)}
          buildPayload={() => ({
            reportTitle: `Laporan Tren Minat Pembeli & Multi-Agent AI Produk (${horizonDays} Hari)`,
            subtitle: `Indeks Minat ${sovereignForecast.buyerIntentScore}/100 · Proyeksi Dasar ${formatIdr(sovereignForecast.projected90dBaseGmvIdr)}`,
            businessName: storeProfile.businessName,
            filenameBase: `laporan-tren-minat-ai-produk-${horizonDays}h`,
            kpis: [
              { label: "Indeks Minat Pembeli", value: `${sovereignForecast.buyerIntentScore}/100` },
              {
                label: `Proyeksi Dasar (${horizonDays}h)`,
                value: formatIdr(sovereignForecast.projected90dBaseGmvIdr),
              },
              {
                label: "Proyeksi Optimis",
                value: formatIdr(sovereignForecast.projected90dOptimisticGmvIdr),
              },
              {
                label: "Produk Terlaris AI",
                value: `${productIntel.topCatalogWinners.length} SKU`,
              },
            ],
            sheets: [
              {
                sheetName: "Produk Terlaris AI",
                headers: [
                  "Produk",
                  "SKU / Kategori",
                  "Skor Peluang",
                  "Momentum",
                  "Target Harga (Rp)",
                  "Margin %",
                  "Rekomendasi AI",
                ],
                rows: productIntel.topCatalogWinners.map((w) => [
                  w.productName,
                  w.sku || w.category,
                  w.opportunityScore,
                  w.demandMomentum,
                  w.targetPriceIdr,
                  w.estimatedMarginPct,
                  w.recommendedAction,
                ]),
              },
              {
                sheetName: "Peluang Produk Baru",
                headers: ["Ide Produk", "Kategori", "Skor", "Kanal Terbaik", "Harga Target (Rp)", "Alasan AI"],
                rows: productIntel.newMarketWinners.map((w) => [
                  w.productName,
                  w.category,
                  w.opportunityScore,
                  w.bestChannel,
                  w.targetPriceIdr,
                  w.aiReason,
                ]),
              },
              {
                sheetName: `Proyeksi ${horizonDays} Hari`,
                headers: [
                  "Periode",
                  "Konservatif (Rp)",
                  "Proyeksi Dasar (Rp)",
                  "Optimis (Rp)",
                  "Est. Order",
                  "Indeks Minat",
                ],
                rows: sovereignForecast.forecastSeries.map((pt) => [
                  pt.label,
                  pt.conservativeGmvIdr,
                  pt.baseGmvIdr,
                  pt.optimisticGmvIdr,
                  pt.predictedOrders,
                  pt.buyerInterestIndex,
                ]),
              },
              {
                sheetName: "Prioritas Restock FIFO",
                headers: ["SKU", "Produk", "Stok Kini", "Prediksi 30h", "Saran Order", "Anggaran (Rp)"],
                rows: sovereignForecast.restockPriorityQueue.map((r) => [
                  r.sku,
                  r.productName,
                  r.currentStock,
                  r.predicted30dDemand,
                  r.suggestedOrderQty,
                  r.estimatedBudgetIdr,
                ]),
              },
            ],
          })}
        />
      </div>
    </div>
  );
}
