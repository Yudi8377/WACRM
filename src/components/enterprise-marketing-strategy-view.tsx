"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Bot,
  CheckCircle2,
  Compass,
  Copy,
  Crown,
  Edit3,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Rocket,
  Target,
  Trash2,
  TrendingUp,
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
  buildEnterpriseMarketingBlueprint,
  loadMarketingInitiatives,
  renderMarketingStrategyPrintHtml,
  saveMarketingInitiatives,
  type MarketingCampaignInitiative,
} from "@/lib/enterprise-marketing-strategy";
import { buildEscPosTextReport } from "@/lib/printer";

interface EnterpriseMarketingStrategyViewProps {
  tenantId: string;
  editionId: AppEditionId;
  storeProfile: StoreBusinessProfile;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  contacts: ContactRecord[];
  conversations: ConversationRecord[];
  report: FinancialReportSummary;
  onOpenEditions?: () => void;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

type StrategySubTab = "pipeline_swot" | "forecast_budget" | "blueprint_scripts" | "initiatives" | "print_export";

export function EnterpriseMarketingStrategyView({
  tenantId,
  editionId,
  storeProfile,
  products,
  orders,
  contacts,
  conversations,
  report,
  onOpenEditions,
  onToast,
}: EnterpriseMarketingStrategyViewProps) {
  const isSovereign = editionId === "sovereign";
  const [subTab, setSubTab] = useState<StrategySubTab>("pipeline_swot");
  const [monthlyBudgetIdr, setMonthlyBudgetIdr] = useState(5_000_000);
  const [targetGrowthPct, setTargetGrowthPct] = useState(45);
  const [strategicFocus, setStrategicFocus] = useState(
    "Dominasi Omnichannel WhatsApp CRM, Auto-Bundling & Kemitraan Reseller Nasional",
  );
  const [runRevision, setRunRevision] = useState(1);

  const blueprint = useMemo(() => {
    void runRevision;
    return buildEnterpriseMarketingBlueprint({
      storeProfile,
      products,
      orders,
      contacts,
      conversations,
      report,
      monthlyBudgetIdr,
      targetGrowthPct,
      strategicFocus,
    });
  }, [
    storeProfile,
    products,
    orders,
    contacts,
    conversations,
    report,
    monthlyBudgetIdr,
    targetGrowthPct,
    strategicFocus,
    runRevision,
  ]);

  const [initiatives, setInitiatives] = useState<MarketingCampaignInitiative[]>(() =>
    loadMarketingInitiatives(tenantId, blueprint),
  );
  const [editingInitId, setEditingInitId] = useState<string | null>(null);
  const [initTitle, setInitTitle] = useState("");
  const [initChannel, setInitChannel] = useState("WhatsApp CRM");
  const [initBudget, setInitBudget] = useState(1_500_000);
  const [initTargetRev, setInitTargetRev] = useState(9_000_000);
  const [initPic, setInitPic] = useState("Tim Marketing & CS AI");
  const [initNotes, setInitNotes] = useState("");

  function updateInitiatives(
    updater: (prev: MarketingCampaignInitiative[]) => MarketingCampaignInitiative[],
  ) {
    setInitiatives((prev) => {
      const next = updater(prev);
      saveMarketingInitiatives(tenantId, next);
      return next;
    });
  }

  function handleSaveInitiative(e: FormEvent) {
    e.preventDefault();
    if (!initTitle.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    if (editingInitId) {
      updateInitiatives((prev) =>
        prev.map((item) =>
          item.id === editingInitId
            ? {
                ...item,
                title: initTitle.trim(),
                channel: initChannel,
                budgetIdr: Math.max(0, initBudget),
                targetRevenueIdr: Math.max(0, initTargetRev),
                ownerPic: initPic.trim() || "Tim Marketing",
                notes: initNotes.trim(),
                updatedAt: today,
              }
            : item,
        ),
      );
      setEditingInitId(null);
      onToast("Inisiatif kampanye marketing berhasil diperbarui!", "ok");
    } else {
      const created: MarketingCampaignInitiative = {
        id: `cmp-${Date.now().toString().slice(-5)}`,
        title: initTitle.trim(),
        channel: initChannel,
        budgetIdr: Math.max(0, initBudget),
        targetRevenueIdr: Math.max(0, initTargetRev),
        ownerPic: initPic.trim() || "Tim Marketing",
        status: "draft",
        notes: initNotes.trim() || "Dirancang bersama Multi-Agent Strategist AI",
        updatedAt: today,
      };
      updateInitiatives((prev) => [created, ...prev]);
      onToast(`Kampanye "${created.title}" ditambahkan ke papan eksekusi!`, "ok");
    }
    setInitTitle("");
    setInitNotes("");
  }

  function handleEditInitiative(item: MarketingCampaignInitiative) {
    setEditingInitId(item.id);
    setInitTitle(item.title);
    setInitChannel(item.channel);
    setInitBudget(item.budgetIdr);
    setInitTargetRev(item.targetRevenueIdr);
    setInitPic(item.ownerPic);
    setInitNotes(item.notes);
  }

  function handleDeleteInitiative(id: string) {
    updateInitiatives((prev) => prev.filter((x) => x.id !== id));
    if (editingInitId === id) setEditingInitId(null);
    onToast("Inisiatif kampanye dihapus.", "ok");
  }

  if (!isSovereign) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/25 to-slate-950 p-6 text-center text-slate-100">
          <Crown className="mx-auto h-12 w-12 text-amber-400" />
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold text-amber-200">
            <Lock className="h-3.5 w-3.5" /> EKSKLUSIF SOVEREIGN CORPORATE
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-white">
            Strategi Marketing Enterprise — 5 Multi-Agent AI Otonom
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">
            Modul ini menugaskan 5 Agen AI khusus untuk mengumpulkan data riil katalog/POS/CRM, menyusun analisis SWOT &amp; 4 persona pembeli, menghitung simulasi anggaran iklan &amp; Break-Even ROAS 30/60/90 hari, merancang Roadmap 90 Hari + 4 naskah kampanye omnichannel, hingga mencetak Blueprint Strategi Direksi PDF.
          </p>
          {onOpenEditions && (
            <button
              type="button"
              onClick={onOpenEditions}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
            >
              <Crown className="h-4 w-4" /> Aktivasi License Key Sovereign Corporate
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 text-slate-100 md:p-6">
      {/* HERO HEADER + 5-AGENT CONTROL BAR */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/25 to-cyan-950/25 p-5 md:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold text-amber-200">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              Sovereign Corporate Exclusive · 5 Multi-Agent AI Enterprise Marketing Strategist
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-white">
              Strategi Pemasaran Enterprise Multi-Agen AI — {storeProfile.businessName}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              5 Agen AI bekerja berantai: <strong>1) Pengumpul Data Real-Time</strong> → <strong>2) Analis SWOT &amp; Persona</strong> → <strong>3) Forecaster Budget &amp; ROAS 90 Hari</strong> → <strong>4) Arsitek Blueprint &amp; Skrip Kampanye</strong> → <strong>5) Manajer Eksekusi Kampanye</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRunRevision((r) => r + 1);
              onToast("5 Multi-Agent AI selesai menyegarkan data, SWOT, ROAS & Blueprint Strategi 90 Hari!", "ok");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
          >
            <RefreshCw className="h-4 w-4" /> Jalankan Ulang 5-Agen AI (Run #{runRevision})
          </button>
        </div>

        {/* Interactive Strategy Controls */}
        <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/85 p-4 text-xs md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400">Fokus Strategis Direksi</span>
            <input
              value={strategicFocus}
              onChange={(e) => setStrategicFocus(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Anggaran Marketing / Bulan</span>
              <strong className="font-mono text-emerald-300">{formatIdr(monthlyBudgetIdr)}</strong>
            </div>
            <input
              type="range"
              min={1_000_000}
              max={50_000_000}
              step={500_000}
              value={monthlyBudgetIdr}
              onChange={(e) => setMonthlyBudgetIdr(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </label>
          <label className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Target Pertumbuhan Omzet 90 Hari</span>
              <strong className="font-mono text-amber-300">+{targetGrowthPct}%</strong>
            </div>
            <input
              type="range"
              min={15}
              max={150}
              step={5}
              value={targetGrowthPct}
              onChange={(e) => setTargetGrowthPct(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </label>
        </div>

        {/* Executive KPI Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[10px] text-slate-400">Proyeksi Omzet 90 Hari</div>
            <div className="mt-1 font-mono text-base font-extrabold text-emerald-300">
              {formatIdr(blueprint.forecast.projected90dRevenueIdr)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[10px] text-slate-400">Proyeksi Laba Bersih 90h</div>
            <div className="mt-1 font-mono text-base font-extrabold text-cyan-300">
              {formatIdr(blueprint.forecast.projected90dNetProfitIdr)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[10px] text-slate-400">Blended ROAS vs Break-Even</div>
            <div className="mt-1 font-mono text-base font-extrabold text-amber-300">
              {blueprint.forecast.blendedRoas}x{" "}
              <span className="text-[11px] font-normal text-slate-400">
                (BE {blueprint.forecast.breakEvenRoas}x)
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[10px] text-slate-400">Rasio LTV : CAC</div>
            <div className="mt-1 font-mono text-base font-extrabold text-white">
              {blueprint.forecast.ltvToCacRatio}x
            </div>
            <div className="text-[10px] text-emerald-300">
              CAC {formatIdr(blueprint.forecast.estimatedCacIdr)}
            </div>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 lg:col-span-1">
            <div className="text-[10px] text-slate-400">Produk Hero &amp; Margin</div>
            <div className="mt-1 truncate text-xs font-extrabold text-white">
              {blueprint.dataMetrics.heroProductName}
            </div>
            <div className="text-[10px] text-amber-300">
              Margin {blueprint.dataMetrics.grossMarginPct}% · {blueprint.dataMetrics.totalContacts} Kontak CRM
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "pipeline_swot", label: "1. 5-Agen AI, SWOT & Persona", icon: Bot },
            { id: "forecast_budget", label: "2. Forecasting & Alokasi ROAS", icon: TrendingUp },
            { id: "blueprint_scripts", label: "3. Roadmap 90 Hari & Skrip Kampanye", icon: Compass },
            { id: "initiatives", label: `4. Eksekusi Kampanye (${initiatives.length})`, icon: Rocket },
            { id: "print_export", label: "5. Cetak Blueprint PDF & Ekspor", icon: Printer },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                subTab === t.id
                  ? "bg-amber-400 text-slate-950"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: 5-AGENT PIPELINE, SWOT & 4 PERSONAS */}
      {subTab === "pipeline_swot" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            {blueprint.agentPipeline.map((ag) => (
              <div
                key={ag.agentNumber}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                    ✓ Agent #{ag.agentNumber}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="font-extrabold text-white">{ag.agentName}</div>
                <div className="text-[10px] text-cyan-300">{ag.roleTitle}</div>
                <ul className="space-y-1 text-[10px] text-slate-300">
                  {ag.keyFindings.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { title: "Strengths (Kekuatan)", items: blueprint.swot.strengths, color: "text-emerald-300 border-emerald-500/30" },
                { title: "Weaknesses (Celah Funnel)", items: blueprint.swot.weaknesses, color: "text-amber-300 border-amber-500/30" },
                { title: "Opportunities (Peluang)", items: blueprint.swot.opportunities, color: "text-cyan-300 border-cyan-500/30" },
                { title: "Threats (Mitigasi Risiko)", items: blueprint.swot.threats, color: "text-rose-300 border-rose-500/30" },
              ] as const
            ).map((box) => (
              <div
                key={box.title}
                className={`rounded-2xl border bg-slate-900/90 p-4 text-xs space-y-2 ${box.color}`}
              >
                <h4 className="font-extrabold">{box.title}</h4>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  {box.items.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
              <Target className="h-4 w-4 text-amber-400" /> 4 Persona Pembeli Target Hasil Analisis Multi-Agent AI
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              {blueprint.personas.map((p) => (
                <div key={p.name} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-white">{p.name}</strong>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      Porsi {p.segmentSharePct}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <strong>Masalah:</strong> {p.painPoint}
                  </div>
                  <div className="text-[11px] text-cyan-300">
                    <strong>Pemicu Beli:</strong> {p.buyingTrigger}
                  </div>
                  <div className="text-[11px] text-emerald-300">
                    <strong>Penawaran:</strong> {p.recommendedOffer} ({p.bestChannel})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORECASTING & ALOKASI BUDGET ROAS */}
      {subTab === "forecast_budget" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 text-xs">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-slate-400">Proyeksi Omzet 30 Hari</div>
              <div className="mt-1 font-mono text-xl font-extrabold text-white">
                {formatIdr(blueprint.forecast.projected30dRevenueIdr)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-slate-400">Proyeksi Omzet 60 Hari (Kumulatif)</div>
              <div className="mt-1 font-mono text-xl font-extrabold text-cyan-300">
                {formatIdr(blueprint.forecast.projected60dRevenueIdr)}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/20 p-4">
              <div className="text-emerald-200">Proyeksi Omzet 90 Hari (Kumulatif)</div>
              <div className="mt-1 font-mono text-xl font-extrabold text-emerald-300">
                {formatIdr(blueprint.forecast.projected90dRevenueIdr)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/95">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[11px] text-slate-400">
                <tr>
                  <th className="px-3.5 py-2.5">Kanal Pemasaran</th>
                  <th className="px-3.5 py-2.5 text-center">Porsi</th>
                  <th className="px-3.5 py-2.5 text-right">Budget/Bulan</th>
                  <th className="px-3.5 py-2.5 text-center">Est. ROAS</th>
                  <th className="px-3.5 py-2.5 text-right">Proyeksi Omzet/Bln</th>
                  <th className="px-3.5 py-2.5">Taktik &amp; KPI Utama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {blueprint.forecast.channelAllocations.map((c) => (
                  <tr key={c.channel} className="hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 font-bold text-white">{c.channel}</td>
                    <td className="px-3.5 py-2.5 text-center font-mono text-amber-300">{c.sharePct}%</td>
                    <td className="px-3.5 py-2.5 text-right font-mono">{formatIdr(c.monthlyBudgetIdr)}</td>
                    <td className="px-3.5 py-2.5 text-center font-mono font-extrabold text-emerald-300">
                      {c.projectedRoas}x
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-cyan-300">
                      {formatIdr(c.projectedMonthlyRevenueIdr)}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-slate-300">
                      <div>{c.tacticalPlay}</div>
                      <div className="text-[10px] text-emerald-300">KPI: {c.primaryKpi}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROADMAP 90 HARI & 4 SKRIP KAMPANYE */}
      {subTab === "blueprint_scripts" && (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {blueprint.roadmap90Days.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300">
                    {phase.windowLabel}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-300">
                    Target +{phase.targetRevenueLiftPct}%
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white">{phase.phase}</h4>
                <p className="text-[11px] text-slate-400">{phase.objective}</p>
                <ul className="space-y-1 text-[11px] text-slate-200">
                  {phase.deliverables.map((d, i) => (
                    <li key={i}>✓ {d}</li>
                  ))}
                </ul>
                <div className="pt-1 text-[10px] text-cyan-300">PIC AI: {phase.ownerAgent}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {blueprint.campaignScripts.map((scr) => (
              <div
                key={scr.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-200">
                      {scr.channel}
                    </span>
                    <span className="text-[10px] text-slate-400">{scr.targetAudience}</span>
                  </div>
                  <h4 className="font-extrabold text-white">{scr.title}</h4>
                  <pre className="whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-sans text-[11px] leading-relaxed text-slate-200">
                    {scr.scriptBody}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(scr.scriptBody);
                    onToast(`Naskah "${scr.title}" disalin ke clipboard!`, "ok");
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-[11px] font-extrabold text-emerald-300 hover:bg-emerald-500 hover:text-slate-950"
                >
                  <Copy className="h-3.5 w-3.5" /> Salin Skrip Kampanye Siap Pakai
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EKSEKUSI INISIATIF KAMPANYE (INSERT / UPDATE / DELETE / STATUS) */}
      {subTab === "initiatives" && (
        <div className="space-y-4">
          <form
            onSubmit={handleSaveInitiative}
            className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs sm:grid-cols-3 lg:grid-cols-6"
          >
            <input
              required
              value={initTitle}
              onChange={(e) => setInitTitle(e.target.value)}
              placeholder="Nama Inisiatif Kampanye *"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white lg:col-span-2"
            />
            <select
              value={initChannel}
              onChange={(e) => setInitChannel(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option>WhatsApp CRM</option>
              <option>TikTok Live &amp; Shop</option>
              <option>Instagram / Meta Ads</option>
              <option>Google Search SEO</option>
              <option>B2B &amp; Reseller</option>
            </select>
            <input
              type="number"
              min={0}
              step={100000}
              value={initBudget}
              onChange={(e) => setInitBudget(Number(e.target.value) || 0)}
              placeholder="Budget (Rp)"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
            />
            <input
              type="number"
              min={0}
              step={500000}
              value={initTargetRev}
              onChange={(e) => setInitTargetRev(Number(e.target.value) || 0)}
              placeholder="Target Omzet (Rp)"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-emerald-300"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> {editingInitId ? "Update" : "Insert"}
            </button>
            <input
              value={initPic}
              onChange={(e) => setInitPic(e.target.value)}
              placeholder="PIC / Penanggung Jawab"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white lg:col-span-2"
            />
            <input
              value={initNotes}
              onChange={(e) => setInitNotes(e.target.value)}
              placeholder="Catatan eksekusi / target KPI..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white lg:col-span-4"
            />
          </form>

          <div className="space-y-2">
            {initiatives.map((item) => {
              const estRoas =
                item.budgetIdr > 0
                  ? (item.targetRevenueIdr / item.budgetIdr).toFixed(1)
                  : "∞";
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-white">{item.title}</strong>
                      <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                        {item.channel}
                      </span>
                      <span className="font-mono text-[10px] text-amber-300">ROAS {estRoas}x</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      Budget {formatIdr(item.budgetIdr)} → Target {formatIdr(item.targetRevenueIdr)} · PIC: {item.ownerPic} · {item.notes}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateInitiatives((prev) =>
                          prev.map((x) =>
                            x.id === item.id
                              ? {
                                  ...x,
                                  status: e.target.value as MarketingCampaignInitiative["status"],
                                }
                              : x,
                          ),
                        )
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300"
                    >
                      <option value="draft">DRAFT</option>
                      <option value="approved">DISETUJUI</option>
                      <option value="running">BERJALAN</option>
                      <option value="completed">SELESAI</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleEditInitiative(item)}
                      className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                      title="Edit Inisiatif"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteInitiative(item.id)}
                      className="rounded-lg border border-slate-700 p-1 text-slate-400 hover:border-rose-500 hover:text-rose-400"
                      title="Hapus Inisiatif"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: PRINT BLUEPRINT PDF & MULTI-SHEET EXCEL EXPORT */}
      {subTab === "print_export" && (
        <div className="space-y-4">
          <UniversalPrintPanel
            documentLabel="Blueprint Strategi Pemasaran Enterprise 90 Hari"
            jobTitle={`Blueprint Strategi Marketing Enterprise — ${storeProfile.businessName}`}
            filenameBase="blueprint-strategi-marketing-enterprise"
            defaultPaper="a4"
            buildHtml={() => renderMarketingStrategyPrintHtml(blueprint, initiatives)}
            buildEscPos={() =>
              buildEscPosTextReport("STRATEGI MARKETING ENTERPRISE", storeProfile, [
                `Budget/Bln: ${formatIdr(blueprint.monthlyBudgetIdr)}`,
                `Blended ROAS: ${blueprint.forecast.blendedRoas}x (BE ${blueprint.forecast.breakEvenRoas}x)`,
                `Proyeksi 90h: ${formatIdr(blueprint.forecast.projected90dRevenueIdr)}`,
                `Hero: ${blueprint.dataMetrics.heroProductName}`,
                `Kampanye Aktif: ${initiatives.length}`,
              ])
            }
            onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
          />

          <ReportExportHub
            heading="Ekspor Blueprint Strategi Marketing Enterprise (Alokasi ROAS, Roadmap 90h, Persona & Kampanye) ke Desktop"
            onToast={onToast}
            buildPayload={() => ({
              reportTitle: "Blueprint Strategi Pemasaran Enterprise Multi-Agen AI",
              subtitle: `Fokus: ${blueprint.strategicFocus} · Blended ROAS ${blueprint.forecast.blendedRoas}x · Proyeksi 90h ${formatIdr(blueprint.forecast.projected90dRevenueIdr)}`,
              businessName: storeProfile.businessName,
              filenameBase: "strategi-marketing-enterprise-sovereign",
              kpis: [
                { label: "Budget/Bln", value: formatIdr(blueprint.monthlyBudgetIdr) },
                { label: "Blended ROAS", value: `${blueprint.forecast.blendedRoas}x` },
                { label: "Proyeksi Omzet 90h", value: formatIdr(blueprint.forecast.projected90dRevenueIdr) },
                { label: "Rasio LTV:CAC", value: `${blueprint.forecast.ltvToCacRatio}x` },
              ],
              sheets: [
                {
                  sheetName: "Alokasi Budget & ROAS",
                  headers: ["Kanal", "Porsi (%)", "Budget/Bln (Rp)", "Est ROAS", "Proyeksi Omzet/Bln (Rp)", "KPI"],
                  rows: blueprint.forecast.channelAllocations.map((c) => [
                    c.channel,
                    c.sharePct,
                    c.monthlyBudgetIdr,
                    c.projectedRoas,
                    c.projectedMonthlyRevenueIdr,
                    c.primaryKpi,
                  ]),
                },
                {
                  sheetName: "Roadmap 90 Hari",
                  headers: ["Fase", "Periode", "Objektif", "Target Lift (%)", "Deliverables"],
                  rows: blueprint.roadmap90Days.map((r) => [
                    r.phase,
                    r.windowLabel,
                    r.objective,
                    r.targetRevenueLiftPct,
                    r.deliverables.join(" | "),
                  ]),
                },
                {
                  sheetName: "Inisiatif Kampanye",
                  headers: ["Kampanye", "Kanal", "Budget (Rp)", "Target Omzet (Rp)", "PIC", "Status"],
                  rows: initiatives.map((i) => [
                    i.title,
                    i.channel,
                    i.budgetIdr,
                    i.targetRevenueIdr,
                    i.ownerPic,
                    i.status,
                  ]),
                },
              ],
            })}
          />
        </div>
      )}
    </div>
  );
}
