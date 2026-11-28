"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Copy,
  Crown,
  Flame,
  Landmark,
  LineChart,
  Lock,
  Package,
  Printer,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { ReportExportHub } from "@/components/report-export-hub";
import { UniversalPrintPanel } from "@/components/universal-print-panel";
import {
  formatIdr,
  type AppEditionId,
  type ContactRecord,
  type ConversationRecord,
  type ErpProductRecord,
  type FinancialReportSummary,
  type PosOrderRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  buildEconomicCensusExportSheets,
  buildEconomicCensusMarketReport,
  renderEconomicCensusMarketPrintHtml,
} from "@/lib/economic-census-report";
import { editionHasFeature } from "@/lib/editions";
import {
  buildSmartAutoBundlePlan,
  buildSovereignBuyerInterestForecast,
  buildWinningProductRecommendations,
  loadAutonomousMarketBrain,
  runAutonomousKnowledgeUpgrade,
  saveAutonomousMarketBrain,
  type AutonomousMarketBrainState,
  type WinningProductRecommendation,
} from "@/lib/market-forecasting";
import {
  buildEscPosTextReport,
  renderMarketForecastPrintHtml,
} from "@/lib/printer";

interface MarketForecastViewProps {
  tenantId?: string;
  editionId: AppEditionId;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  conversations: ConversationRecord[];
  contacts?: ContactRecord[];
  report?: FinancialReportSummary;
  storeProfile: StoreBusinessProfile;
  onCreateProduct?: (input: {
    sku: string;
    name: string;
    category: string;
    unit: string;
    unitPrice: number;
    costPrice: number;
    stockQty: number;
    minStock: number;
    description: string;
  }) => Promise<void>;
  onOpenMarketingStrategy?: () => void;
  onOpenEditions: () => void;
  onNotify: (msg: string) => void;
}

export function MarketForecastView({
  tenantId = "default",
  editionId,
  products,
  orders,
  conversations,
  contacts = [],
  report,
  storeProfile,
  onCreateProduct,
  onOpenMarketingStrategy,
  onOpenEditions,
  onNotify,
}: MarketForecastViewProps) {
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(90);
  const [censusSubTab, setCensusSubTab] = useState<
    "overview" | "marketing_conclusion" | "umkm_learning"
  >("overview");
  const hasSovereignForecast = editionHasFeature(editionId, "buyer_interest_forecast");

  // Autonomous Self-Learning Knowledge Brain (v5.3)
  const [brain, setBrain] = useState<AutonomousMarketBrainState>(() =>
    loadAutonomousMarketBrain(tenantId),
  );
  const [userSignalInput, setUserSignalInput] = useState("");
  const [upgradingBrain, setUpgradingBrain] = useState(false);

  // Interactive AI Auto-Execution Approval Modal State (Auto-Bundling 3-in-1 OR New Market SKU)
  const [approvalTarget, setApprovalTarget] = useState<WinningProductRecommendation | null>(null);
  const [heroProductId, setHeroProductId] = useState<string>("");
  const [comp1Id, setComp1Id] = useState<string>("");
  const [comp2Id, setComp2Id] = useState<string>("");
  const [bundleDiscountPct, setBundleDiscountPct] = useState(12);
  const [customSku, setCustomSku] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCostPrice, setCustomCostPrice] = useState(0);
  const [customSellPrice, setCustomSellPrice] = useState(0);
  const [customInitStock, setCustomInitStock] = useState(15);
  const [executingApproval, setExecutingApproval] = useState(false);
  const [lastExecutedCopy, setLastExecutedCopy] = useState<{
    sku: string;
    name: string;
    promoCopy: string;
  } | null>(null);

  const productIntel = useMemo(
    () =>
      buildWinningProductRecommendations({
        products,
        orders,
        conversations,
        storeName: storeProfile.businessName,
        brain,
      }),
    [products, orders, conversations, storeProfile.businessName, brain],
  );

  const liveBundlePlan = useMemo(
    () =>
      buildSmartAutoBundlePlan({
        products,
        orders,
        storeName: storeProfile.businessName,
        heroProductId: heroProductId || undefined,
        companionIds: [comp1Id, comp2Id].filter(Boolean),
        discountPct: bundleDiscountPct,
      }),
    [products, orders, storeProfile.businessName, heroProductId, comp1Id, comp2Id, bundleDiscountPct],
  );

  function handleUpgradeAutonomousBrain() {
    setUpgradingBrain(true);
    const upgraded = runAutonomousKnowledgeUpgrade({
      currentBrain: brain,
      products,
      orders,
      conversations,
      newUserSignal: userSignalInput,
    });
    setBrain(upgraded);
    saveAutonomousMarketBrain(tenantId, upgraded);
    setUserSignalInput("");
    setUpgradingBrain(false);
    onNotify(
      `Pengetahuan AI Otonom berhasil ditingkatkan ke Generasi #${upgraded.generation} — seluruh saran produk diperbarui!`,
    );
  }

  function openApprovalWizard(item: WinningProductRecommendation) {
    setApprovalTarget(item);
    setLastExecutedCopy(null);
    if (item.autoExecutionSpec?.actionType === "auto_bundle_3in1") {
      const initialPlan = buildSmartAutoBundlePlan({
        products,
        orders,
        storeName: storeProfile.businessName,
        discountPct: 12,
      });
      setHeroProductId(initialPlan?.heroProduct.id ?? products[0]?.id ?? "");
      setComp1Id(initialPlan?.companionProducts[0]?.id ?? "");
      setComp2Id(initialPlan?.companionProducts[1]?.id ?? "");
      setBundleDiscountPct(12);
      setCustomSku(initialPlan?.suggestedSku ?? item.autoExecutionSpec.suggestedSku);
      setCustomName(initialPlan?.suggestedBundleName ?? item.productName);
      setCustomInitStock(initialPlan?.suggestedInitialStock ?? 15);
    } else if (item.autoExecutionSpec) {
      setCustomSku(item.autoExecutionSpec.suggestedSku);
      setCustomName(item.productName);
      setCustomCostPrice(item.autoExecutionSpec.suggestedCostPriceIdr);
      setCustomSellPrice(item.autoExecutionSpec.suggestedSellPriceIdr);
      setCustomInitStock(item.autoExecutionSpec.suggestedInitialStock);
    }
  }

  async function handleConfirmAutoExecution() {
    if (!approvalTarget || !approvalTarget.autoExecutionSpec) return;
    setExecutingApproval(true);
    try {
      const isBundle = approvalTarget.autoExecutionSpec.actionType === "auto_bundle_3in1";
      const finalSku =
        (isBundle ? customSku || liveBundlePlan?.suggestedSku : customSku) ||
        approvalTarget.autoExecutionSpec.suggestedSku;
      const finalName =
        (isBundle ? customName || liveBundlePlan?.suggestedBundleName : customName) ||
        approvalTarget.productName;
      const finalCost = isBundle
        ? liveBundlePlan?.bundleCostPriceIdr ?? approvalTarget.autoExecutionSpec.suggestedCostPriceIdr
        : Math.max(0, customCostPrice);
      const finalSell = isBundle
        ? liveBundlePlan?.bundleSellPriceIdr ?? approvalTarget.autoExecutionSpec.suggestedSellPriceIdr
        : Math.max(1000, customSellPrice);
      const finalPromoCopy = isBundle
        ? liveBundlePlan?.whatsappBroadcastCopy ?? approvalTarget.autoExecutionSpec.launchPromoCopy
        : approvalTarget.autoExecutionSpec.launchPromoCopy;

      if (onCreateProduct) {
        await onCreateProduct({
          sku: finalSku.trim().toUpperCase(),
          name: finalName.trim(),
          category: approvalTarget.category,
          unit: approvalTarget.autoExecutionSpec.suggestedUnit || "paket",
          unitPrice: finalSell,
          costPrice: finalCost,
          stockQty: Math.max(1, customInitStock),
          minStock: Math.max(3, Math.floor(customInitStock * 0.25)),
          description: isBundle && liveBundlePlan
            ? `Bundling Otomatis AI: ${liveBundlePlan.heroProduct.name} + ${liveBundlePlan.companionProducts.map((c) => c.name).join(" + ")}`
            : approvalTarget.aiReason,
        });
      }

      // Record autonomous learning feedback from user approval!
      const nextBrain: AutonomousMarketBrainState = {
        ...brain,
        generation: brain.generation + 1,
        approvedExecutionsCount: brain.approvedExecutionsCount + 1,
        lastUpgradedAt: new Date().toISOString(),
        learnedPatterns: [
          {
            id: `pat-exec-${Date.now()}`,
            source: "approved_execution" as const,
            insight: `[Gen #${brain.generation + 1} · Disetujui Owner] SKU "${finalName}" (${finalSku}) resmi diluncurkan di harga ${formatIdr(finalSell)} — AI memantau konversi & repeat ordernya.`,
            confidencePct: 99,
            learnedAt: new Date().toISOString(),
          },
          ...brain.learnedPatterns,
        ].slice(0, 14),
      };
      setBrain(nextBrain);
      saveAutonomousMarketBrain(tenantId, nextBrain);
      setLastExecutedCopy({ sku: finalSku, name: finalName, promoCopy: finalPromoCopy });
      onNotify(
        `Berhasil dieksekusi! SKU "${finalName}" (${finalSku}) otomatis masuk ke Master Data, POS & ERP Gudang!`,
      );
    } catch {
      onNotify("Gagal mengeksekusi pembuatan SKU otomatis. Coba ubah kode SKU jika sudah dipakai.");
    } finally {
      setExecutingApproval(false);
    }
  }

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

  const economicCensus = useMemo(
    () =>
      buildEconomicCensusMarketReport({
        storeProfile,
        products,
        orders,
        conversations,
        contacts,
        report,
        brain,
        horizonDays,
        existingProductIntel: productIntel,
        existingForecast: sovereignForecast,
      }),
    [
      storeProfile,
      products,
      orders,
      conversations,
      contacts,
      report,
      brain,
      horizonDays,
      productIntel,
      sovereignForecast,
    ],
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
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-1.5">
              {productIntel.analyzingAgents.map((ag) => (
                <span
                  key={ag}
                  className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-cyan-300"
                >
                  ✓ {ag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("economic-census-market-report-hub");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                <Landmark className="h-3.5 w-3.5" /> Laporan Sensus Ekonomi &amp; Riset Pasar
              </button>
              {onOpenMarketingStrategy && (
                <button
                  type="button"
                  onClick={onOpenMarketingStrategy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200 transition hover:bg-violet-500/25"
                >
                  <Target className="h-3.5 w-3.5" /> Buka Strategi Marketing AI
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AUTONOMOUS SELF-LEARNING KNOWLEDGE UPGRADE PANEL (v5.3) */}
        <div className="mt-4 rounded-2xl border border-cyan-500/35 bg-slate-950/90 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-extrabold text-cyan-200">
                Otak Pengetahuan AI Otonom — Generasi #{brain.generation} ({brain.learnedPatterns.length} Pola Pasar Dipelajari · {brain.approvedExecutionsCount} Aksi Disetujui)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {onOpenMarketingStrategy && (
                <button
                  type="button"
                  onClick={onOpenMarketingStrategy}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/25"
                >
                  <Crown className="h-3.5 w-3.5" /> Strategi Marketing Enterprise AI
                </button>
              )}
              <button
                type="button"
                disabled={upgradingBrain}
                onClick={handleUpgradeAutonomousBrain}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${upgradingBrain ? "animate-spin" : ""}`} />
                Upgrade Pengetahuan AI Otonom Sekarang
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={userSignalInput}
              onChange={(e) => setUserSignalInput(e.target.value)}
              placeholder="Opsional: ajari AI sinyal pasar terbaru (mis. 'Pembeli cari hampers <200rb' atau 'Kompetitor naik harga kopi 10%')..."
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleUpgradeAutonomousBrain}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25"
            >
              + Latih &amp; Perbarui Saran AI
            </button>
          </div>

          <div className="grid gap-1.5 md:grid-cols-2">
            {brain.learnedPatterns.slice(0, 4).map((pat) => (
              <div
                key={pat.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-300"
              >
                <span className="font-bold text-emerald-300">{pat.confidencePct}% yakin · </span>
                {pat.insight}
              </div>
            ))}
          </div>
        </div>

        {/* Winning Products in Catalog (100% Product-Specific Non-Generic AI Actions) */}
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Flame className="h-4 w-4 text-amber-400" />
            Peringkat Produk Katalog Paling Berpotensi Laku Keras (Analisis Khusus Per Produk)
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {productIntel.topCatalogWinners.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                      Skor Peluang {item.opportunityScore}/100
                    </span>
                    <span className="font-mono text-[10px] font-bold text-amber-300">
                      Margin {item.estimatedMarginPct}% {item.unitProfitIdr ? `(+${formatIdr(item.unitProfitIdr)})` : ""}
                    </span>
                  </div>
                  <div className="mt-2 font-extrabold text-white">{item.productName}</div>
                  <div className="mt-0.5 text-[11px] text-cyan-300">
                    {formatIdr(item.targetPriceIdr)} · {item.bestChannel}
                  </div>
                  {item.knowledgeTag && (
                    <div className="mt-1 inline-block rounded-md bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
                      {item.knowledgeTag} · Est. stok ±{item.stockDaysCover ?? 30} hari
                    </div>
                  )}
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{item.aiReason}</p>
                  <div className="mt-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5 text-[11px] text-violet-100">
                    <strong className="text-violet-300">Saran Aksi Khusus AI:</strong>{" "}
                    {item.recommendedAction}
                  </div>
                  {item.tacticalSteps && item.tacticalSteps.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[10px] text-slate-300">
                      {item.tacticalSteps.map((step, sIdx) => (
                        <li key={sIdx} className="flex gap-1.5">
                          <span className="font-bold text-emerald-400">{sIdx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {item.promoCopyHook && (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(item.promoCopyHook || "");
                      onNotify(`Hook promo khusus "${item.productName}" disalin ke clipboard!`);
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-cyan-200 hover:border-cyan-500/50 hover:text-white"
                  >
                    <Copy className="h-3 w-3" /> Salin Hook Promosi Produk Ini
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* New Market Opportunities (Clickable Auto-Execution with User Approval!) + Bundling Ideas */}
        <div className="mt-5 grid gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 lg:col-span-7">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
              <Sparkles className="h-4 w-4" /> Rekomendasi Produk Baru Laku di Pasar Nasional (Belum Ada di Katalog)
            </h4>
            <p className="mt-1 text-[11px] text-slate-400">
              Klik tombol aksi hijau di bawah setiap rekomendasi — AI menyiapkan langkah kerja, kalkulasi harga/margin, SKU, &amp; naskah promo lalu mengeksekusinya otomatis setelah Anda menyetujuinya.
            </p>
            <div className="mt-3 space-y-2.5">
              {productIntel.newMarketWinners.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-white">{m.productName}</span>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                      Target {formatIdr(m.targetPriceIdr)} · Margin {m.estimatedMarginPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{m.aiReason}</p>
                  <button
                    type="button"
                    onClick={() => openApprovalWizard(m)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-left text-[11px] font-extrabold text-emerald-200 transition hover:bg-emerald-500 hover:text-slate-950"
                  >
                    <span>→ {m.recommendedAction}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-950/40 px-2 py-0.5 text-[10px]">
                      <Rocket className="h-3 w-3" /> Jalankan Otomatis
                    </span>
                  </button>
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

      {/* ITEM #3B (NEW INSTITUTIONAL HUB): LAPORAN RISET PASAR, SENSUS EKONOMI UMKM & KESIMPULAN STRATEGI MARKETING AI */}
      <section
        id="economic-census-market-report-hub"
        className="space-y-5 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-emerald-950/25 to-cyan-950/25 p-5 shadow-xl md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-extrabold text-emerald-200">
              <Landmark className="h-3.5 w-3.5" /> Standar BPS · Dinas Koperasi &amp; UKM · Disperindag · Bank Indonesia · Riset Pasar &amp; Edukasi UMKM
            </div>
            <h3 className="mt-2.5 text-xl font-extrabold text-white">
              Laporan Riset Pasar, Sensus Ekonomi UMKM &amp; Kesimpulan Strategi Marketing AI
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Dataset terstruktur untuk kebutuhan pendataan <strong>Sensus Ekonomi BPS</strong>, pelaporan <strong>Dinas Koperasi &amp; UKM / Disperindag</strong>, inklusi QRIS <strong>Bank Indonesia</strong>, pengajuan <strong>KUR Perbankan</strong>, serta modul belajar riset pasar mandiri bagi UMKM — sudah terintegrasi otomatis dengan <strong>Kesimpulan 5-Agen Strategi Marketing AI</strong>.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/90 px-3.5 py-2.5 text-right text-[11px]">
            <div className="font-mono font-extrabold text-emerald-300">
              No. {economicCensus.documentNumber}
            </div>
            <div className="text-slate-400">
              KBLI Ref: {economicCensus.entityProfile.kbliReferenceCode} ·{" "}
              {economicCensus.reportingPeriodLabel}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              <ShieldCheck className="h-3 w-3" /> {economicCensus.entityProfile.umkmScale}
            </div>
          </div>
        </div>

        {/* 4 Institutional Census & Economic KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Nilai Tambah Bruto (GVA / PDB)
            </div>
            <div className="mt-1 font-mono text-lg font-extrabold text-emerald-300">
              {formatIdr(economicCensus.economicIndicators.grossValueAddedIdr)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              Rasio Nilai Tambah {economicCensus.economicIndicators.valueAddedRatioPct}% · AOV{" "}
              {formatIdr(economicCensus.economicIndicators.averageOrderValueIdr)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Inklusi Bayar Digital (BI)
            </div>
            <div className="mt-1 font-mono text-lg font-extrabold text-cyan-300">
              {economicCensus.economicIndicators.digitalPaymentInclusionPct}% Digital
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              QRIS &amp; VA vs {(100 - economicCensus.economicIndicators.digitalPaymentInclusionPct).toFixed(1)}% COD/Tunai
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Indeks Kematangan Digital
            </div>
            <div className="mt-1 font-mono text-lg font-extrabold text-amber-300">
              {economicCensus.entityProfile.digitalMaturityScore}/100
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              Level: {economicCensus.entityProfile.digitalMaturityTier}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ROAS &amp; LTV:CAC (Marketing AI)
            </div>
            <div className="mt-1 font-mono text-lg font-extrabold text-violet-300">
              {economicCensus.marketingStrategyConclusion.blendedRoasTarget}x ROAS
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              BEP {economicCensus.marketingStrategyConclusion.breakEvenRoas}x · LTV:CAC{" "}
              {economicCensus.marketingStrategyConclusion.ltvToCacRatio}x
            </div>
          </div>
        </div>

        {/* Integrated Executive Verdict */}
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-xs leading-relaxed text-cyan-100">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" /> Ringkasan Eksekutif Terpadu (Sensus Ekonomi + Riset Pasar + Strategi Marketing AI)
          </div>
          {economicCensus.integratedExecutiveVerdict}
        </div>

        {/* Interactive Sub-Tabs for Institutional Preview */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "overview", label: "Indikator Sensus BPS & Struktur Komoditas", icon: Building2 },
              { id: "marketing_conclusion", label: "Kesimpulan Strategi Marketing AI", icon: Target },
              { id: "umkm_learning", label: "Modul Belajar Analisis Pasar UMKM (5 Pelajaran)", icon: BookOpen },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCensusSubTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  censusSubTab === t.id
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {censusSubTab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Payment Inclusion Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                Struktur Inklusi Pembayaran Digital (Indikator Bank Indonesia &amp; BPS)
              </h4>
              <div className="mt-3 space-y-2">
                {economicCensus.economicIndicators.paymentBreakdown.map((p) => (
                  <div
                    key={p.channel}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{p.channel}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.category} · {p.ordersCount} transaksi
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-extrabold text-cyan-300">{p.sharePct}%</div>
                      <div className="text-[10px] text-slate-400">{formatIdr(p.amountIdr)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] text-slate-300">
                <strong>Instansi Pengguna Dataset:</strong>{" "}
                {economicCensus.intendedInstitutions.join(" · ")}
              </div>
            </div>

            {/* Category Commodity Structure */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Struktur Komoditas &amp; Konsentrasi Pasar Per Kategori
              </h4>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-1.5 pr-2">Kategori</th>
                      <th className="py-1.5 pr-2 text-right">SKU / Stok</th>
                      <th className="py-1.5 pr-2 text-right">Margin</th>
                      <th className="py-1.5 text-right">Porsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {economicCensus.categoryStructure.slice(0, 6).map((c) => (
                      <tr key={c.category}>
                        <td className="py-1.5 pr-2 font-semibold text-white">{c.category}</td>
                        <td className="py-1.5 pr-2 text-right font-mono text-slate-300">
                          {c.skuCount} / {c.totalStockUnits}
                        </td>
                        <td className="py-1.5 pr-2 text-right font-mono text-emerald-300">
                          {c.avgGrossMarginPct}%
                        </td>
                        <td className="py-1.5 text-right font-mono font-bold text-cyan-300">
                          {c.revenueSharePct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {censusSubTab === "marketing_conclusion" && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/90 p-4 text-xs">
                <div className="font-extrabold text-emerald-300">
                  Kekuatan &amp; Peluang Utama (SWOT — Strategi Marketing AI)
                </div>
                <ul className="mt-2 space-y-1.5 text-slate-300">
                  {economicCensus.marketingStrategyConclusion.keyStrengths.map((s, i) => (
                    <li key={`str-${i}`} className="flex gap-1.5">
                      <span className="text-emerald-400">✓</span> <span>{s}</span>
                    </li>
                  ))}
                  {economicCensus.marketingStrategyConclusion.priorityOpportunities.map((o, i) => (
                    <li key={`opp-${i}`} className="flex gap-1.5">
                      <span className="text-cyan-400">★</span> <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-500/25 bg-slate-950/90 p-4 text-xs">
                <div className="font-extrabold text-amber-300">
                  Celah Funnel &amp; Alokasi Kanal Pemasaran Strategis
                </div>
                <div className="mt-2 space-y-1.5">
                  {economicCensus.marketingStrategyConclusion.channelBudgetSplit.map((ch) => (
                    <div
                      key={ch.channel}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5"
                    >
                      <span className="font-semibold text-white">{ch.channel}</span>
                      <span className="font-mono text-[11px] text-cyan-300">
                        {ch.sharePct}% · {formatIdr(ch.monthlyBudgetIdr)} · ROAS {ch.expectedRoas}x
                      </span>
                    </div>
                  ))}
                </div>
                {onOpenMarketingStrategy && (
                  <button
                    type="button"
                    onClick={onOpenMarketingStrategy}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-violet-500 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-violet-400"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Lihat Detail Lengkap di Strategi Marketing AI
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {censusSubTab === "umkm_learning" && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {economicCensus.umkmLearningModules.map((mod) => (
              <div
                key={mod.code}
                className="flex flex-col justify-between rounded-2xl border border-emerald-500/25 bg-slate-950/90 p-4 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300">
                      {mod.code}
                    </span>
                    <span className="text-[10px] font-semibold text-cyan-300">
                      {mod.institutionalRelevance}
                    </span>
                  </div>
                  <h4 className="mt-2 font-extrabold text-white">{mod.topic}</h4>
                  <div className="mt-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 font-mono text-[11px] text-amber-300">
                    {mod.observedMetricLabel}: <strong>{mod.observedMetricValue}</strong>
                  </div>
                  <p className="mt-2 leading-relaxed text-slate-300">{mod.plainLanguageLesson}</p>
                </div>
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-2.5 text-[11px] text-emerald-200">
                  <strong>Langkah Praktis:</strong> {mod.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Direct Formal A4/PDF Print + 6-Sheet Institutional Excel/CSV Export */}
        <UniversalPrintPanel
          documentLabel="Laporan Riset Pasar, Sensus Ekonomi UMKM & Kesimpulan Strategi AI"
          jobTitle={`Laporan Sensus Ekonomi & Riset Pasar — ${storeProfile.businessName}`}
          filenameBase={`laporan-sensus-ekonomi-riset-pasar-${economicCensus.documentNumber.toLowerCase()}`}
          defaultPaper="a4"
          buildHtml={() => renderEconomicCensusMarketPrintHtml(economicCensus)}
          buildEscPos={() =>
            buildEscPosTextReport(
              `SENSUS EKONOMI & RISET PASAR`,
              storeProfile,
              [
                `No. Dok: ${economicCensus.documentNumber}`,
                `Skala: ${economicCensus.entityProfile.umkmScale}`,
                `GVA (PDB): ${formatIdr(economicCensus.economicIndicators.grossValueAddedIdr)} (${economicCensus.economicIndicators.valueAddedRatioPct}%)`,
                `Bayar Digital: ${economicCensus.economicIndicators.digitalPaymentInclusionPct}%`,
                `Kematangan Digital: ${economicCensus.entityProfile.digitalMaturityScore}/100`,
                `Indeks Minat: ${economicCensus.economicIndicators.buyerIntentIndex}/100`,
                `ROAS AI: ${economicCensus.marketingStrategyConclusion.blendedRoasTarget}x | LTV:CAC ${economicCensus.marketingStrategyConclusion.ltvToCacRatio}x`,
              ],
            )
          }
          onResult={(res) => onNotify(res.message)}
        />

        <ReportExportHub
          heading="Ekspor Dataset Sensus Ekonomi, Riset Pasar & Strategi AI (6-Sheet Excel / PDF / CSV / JSON) untuk BPS, Dinas Koperasi & Bank KUR"
          onToast={(msg) => onNotify(msg)}
          buildPayload={() => ({
            reportTitle: `Laporan Riset Pasar, Sensus Ekonomi UMKM & Kesimpulan Strategi Marketing AI (${economicCensus.documentNumber})`,
            subtitle: `${economicCensus.entityProfile.umkmScale} · KBLI ${economicCensus.entityProfile.kbliReferenceCode} · Digital Maturity ${economicCensus.entityProfile.digitalMaturityScore}/100`,
            businessName: storeProfile.businessName,
            filenameBase: `dataset-sensus-ekonomi-riset-pasar-${horizonDays}h`,
            kpis: [
              { label: "Skala Usaha (PP 7/2021)", value: economicCensus.entityProfile.umkmScale },
              {
                label: "Nilai Tambah Bruto (GVA)",
                value: formatIdr(economicCensus.economicIndicators.grossValueAddedIdr),
              },
              {
                label: "Inklusi Digital (BI)",
                value: `${economicCensus.economicIndicators.digitalPaymentInclusionPct}%`,
              },
              {
                label: "Target ROAS Strategi AI",
                value: `${economicCensus.marketingStrategyConclusion.blendedRoasTarget}x`,
              },
            ],
            sheets: buildEconomicCensusExportSheets(economicCensus),
          })}
        />
      </section>

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

      {/* AI AUTO-EXECUTION & SMART AUTO-BUNDLING APPROVAL MODAL (v5.3) */}
      {approvalTarget && approvalTarget.autoExecutionSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-emerald-500/40 bg-slate-900 p-5 text-xs text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                  <Rocket className="h-3 w-3" /> Eksekusi Otomatis AI (Memerlukan Persetujuan Anda)
                </div>
                <h3 className="mt-1.5 text-base font-extrabold text-white">
                  {approvalTarget.autoExecutionSpec.actionType === "auto_bundle_3in1"
                    ? "AI Smart Auto-Bundling 3-in-1 (1 Hero + 2 Pendamping Stok Berlebih)"
                    : `Peluncuran Otomatis: ${approvalTarget.productName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovalTarget(null)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {lastExecutedCopy ? (
              <div className="space-y-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  Berhasil! SKU {lastExecutedCopy.sku} — {lastExecutedCopy.name} sudah aktif di Master Data, POS &amp; ERP!
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase text-cyan-300">
                    Naskah Broadcast WhatsApp / Promo Siap Kirim (Otomatis Disusun AI):
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-200">
                    {lastExecutedCopy.promoCopy}
                  </pre>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(lastExecutedCopy.promoCopy);
                      onNotify("Naskah promo WhatsApp disalin ke clipboard!");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 font-extrabold text-slate-950 hover:bg-cyan-400"
                  >
                    <Copy className="h-3.5 w-3.5" /> Salin Naskah Broadcast WA
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalTarget(null)}
                    className="rounded-xl border border-slate-700 px-4 py-2 font-bold text-slate-200"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <>
                {approvalTarget.autoExecutionSpec.actionType === "auto_bundle_3in1" && liveBundlePlan ? (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-amber-300">
                          1. Produk Terlaris (Hero)
                        </span>
                        <select
                          value={heroProductId || liveBundlePlan.heroProduct.id}
                          onChange={(e) => setHeroProductId(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatIdr(p.unitPrice)})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-cyan-300">
                          2. Pendamping Stok Berlebih #1
                        </span>
                        <select
                          value={comp1Id || liveBundlePlan.companionProducts[0]?.id || ""}
                          onChange={(e) => setComp1Id(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                        >
                          <option value="">-- Otomatis AI --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stok {p.stockQty})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-cyan-300">
                          3. Pendamping Stok Berlebih #2
                        </span>
                        <select
                          value={comp2Id || liveBundlePlan.companionProducts[1]?.id || ""}
                          onChange={(e) => setComp2Id(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                        >
                          <option value="">-- Otomatis AI --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stok {p.stockQty})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4">
                      <label className="space-y-1 sm:col-span-2">
                        <span className="text-[10px] text-slate-400">Nama SKU Bundling</span>
                        <input
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] text-slate-400">Kode SKU</span>
                        <input
                          value={customSku}
                          onChange={(e) => setCustomSku(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-amber-300"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] text-slate-400">Diskon Bundling (%)</span>
                        <input
                          type="number"
                          min={5}
                          max={35}
                          value={bundleDiscountPct}
                          onChange={(e) => setBundleDiscountPct(Math.max(5, Math.min(35, Number(e.target.value) || 10)))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-emerald-300"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-emerald-500/30 bg-slate-950 p-3 sm:grid-cols-4">
                      <div>
                        <div className="text-[10px] text-slate-400">Harga Normal Gabungan</div>
                        <div className="font-mono font-bold text-slate-300 line-through">
                          {formatIdr(liveBundlePlan.normalTotalPriceIdr)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Harga Bundling AI</div>
                        <div className="font-mono text-sm font-extrabold text-emerald-300">
                          {formatIdr(liveBundlePlan.bundleSellPriceIdr)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">HPP Gabungan</div>
                        <div className="font-mono font-bold text-amber-300">
                          {formatIdr(liveBundlePlan.bundleCostPriceIdr)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Laba Bersih / Paket</div>
                        <div className="font-mono font-extrabold text-cyan-300">
                          +{formatIdr(liveBundlePlan.projectedProfitPerBundleIdr)} ({liveBundlePlan.projectedMarginPct}%)
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[10px] text-slate-400">Nama Produk Baru</span>
                      <input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] text-slate-400">Kode SKU</span>
                      <input
                        value={customSku}
                        onChange={(e) => setCustomSku(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-amber-300"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] text-slate-400">Estimasi HPP / Modal (Rp)</span>
                      <input
                        type="number"
                        min={0}
                        value={customCostPrice}
                        onChange={(e) => setCustomCostPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] text-slate-400">Harga Jual Rekomendasi (Rp)</span>
                      <input
                        type="number"
                        min={1000}
                        value={customSellPrice}
                        onChange={(e) => setCustomSellPrice(Math.max(1000, Number(e.target.value) || 0))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-emerald-300"
                      />
                    </label>
                  </div>
                )}

                <label className="block space-y-1">
                  <span className="text-[10px] text-slate-400">Stok Awal Siap Jual (Paket/Unit)</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={customInitStock}
                    onChange={(e) => setCustomInitStock(Math.max(1, Number(e.target.value) || 10))}
                    className="w-36 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                  />
                </label>

                <div className="rounded-2xl border border-cyan-500/30 bg-slate-950 p-3.5 space-y-1.5">
                  <div className="text-[11px] font-extrabold text-cyan-300">
                    Langkah Kerja Otomatis AI Setelah Anda Menyetujui:
                  </div>
                  {(approvalTarget.autoExecutionSpec.actionType === "auto_bundle_3in1" && liveBundlePlan
                    ? liveBundlePlan.automationSteps
                    : approvalTarget.autoExecutionSpec.executionSteps
                  ).map((step, i) => (
                    <div key={i} className="text-[11px] text-slate-300">
                      ✓ {step}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setApprovalTarget(null)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={executingApproval}
                    onClick={() => void handleConfirmAutoExecution()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {executingApproval
                      ? "AI Sedang Mengeksekusi..."
                      : "Setujui & Jalankan Otomatis Sekarang"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
