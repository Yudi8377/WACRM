"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Crown,
  KeyRound,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { computePublisherOverview } from "@/lib/publisher-store";
import { formatIdr, type PublisherEmsState } from "@/lib/publisher-types";

interface OverviewViewProps {
  state: PublisherEmsState;
  onNavigate: (tab: string) => void;
  onQuickCollectOverdue: (invoiceId: string) => void;
}

export function OverviewView({
  state,
  onNavigate,
  onQuickCollectOverdue,
}: OverviewViewProps) {
  const m = computePublisherOverview(state);
  const overdueInvoices = state.invoices.filter((i) => i.status === "overdue" || i.status === "issued");

  // Compute Unit Economics per Tenant (MRR vs Cloud+AI Cost)
  const unitEcon = state.tenants.map((t) => {
    const lic = state.licenses.find((l) => l.tenantId === t.id && l.status !== "revoked");
    const mrr = lic?.monthlyValueIdr ?? 0;
    const cogs = t.monthlyCloudCogsIdr + t.monthlyAiTokenCostIdr;
    const margin = mrr - cogs;
    const marginPct = mrr > 0 ? Math.round((margin / mrr) * 100) : 0;
    return {
      tenant: t,
      edition: lic?.editionId ?? "starter",
      status: lic?.status ?? "trial",
      mrr,
      cogs,
      margin,
      marginPct,
    };
  });

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
            <Crown className="h-3.5 w-3.5" /> {state.profile.companyName} · Publisher Super Admin EMS
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-white">
            Executive Command Center — License, SaaS ERP, CRM &amp; Akuntansi PSAK
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-300">
            Aplikasi mandiri milik perusahaan penerbit WACRM. Seluruh penerbitan License Key, penagihan
            langganan B2B, pengadaan Cloud/AI &amp; Hardware, hingga laporan Neraca &amp; Laba Rugi
            terintegrasi secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate("licenses")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            <KeyRound className="h-4 w-4" /> Terbitkan License Key
          </button>
          <button
            type="button"
            onClick={() => onNavigate("accounting")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            <BookOpenCheck className="h-4 w-4 text-indigo-400" /> Laporan Keuangan PSAK
          </button>
        </div>
      </div>

      {/* Top 6 SaaS & Financial KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-semibold text-slate-400">MRR Aktif (Bulanan)</div>
          <div className="mt-1.5 text-lg font-extrabold text-emerald-400">{formatIdr(m.mrrIdr)}</div>
          <div className="mt-1 text-[11px] text-slate-400">ARR: {formatIdr(m.arrIdr)}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-semibold text-slate-400">Lisensi Aktif / Berbayar</div>
          <div className="mt-1.5 text-lg font-extrabold text-white">
            {m.activeLicenses} aktif{" "}
            <span className="text-xs font-normal text-slate-400">({m.paidLicenses} paid)</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-300">
            {m.trialLicenses} trial · {m.graceOrSuspendedLicenses} grace/tunda
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-semibold text-slate-400">Kas &amp; Bank Penerbit</div>
          <div className="mt-1.5 text-lg font-extrabold text-cyan-400">
            {formatIdr(m.cashBalanceIdr)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">BCA + Mandiri Escrow</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-semibold text-slate-400">Deferred SaaS Revenue</div>
          <div className="mt-1.5 text-lg font-extrabold text-indigo-300">
            {formatIdr(m.deferredRevenueIdr)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Akun 2201 (PSAK 72)</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-semibold text-slate-400">Pipeline B2B CRM</div>
          <div className="mt-1.5 text-lg font-extrabold text-amber-300">
            {formatIdr(m.openPipelineValueIdr)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Terbobot: {formatIdr(m.weightedPipelineIdr)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-[11px] font-semibold text-slate-400">Integritas Akuntansi</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-extrabold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            {m.ledgerBalanced && m.balanceSheetBalanced ? "BALANCE 100%" : "CEK JURNAL"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Gross Margin: <strong className="text-white">{m.grossMarginPct}%</strong>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner (1-Click Action) */}
      {overdueInvoices.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <strong>
                {overdueInvoices.length} Tagihan Langganan Belum Lunas ({formatIdr(m.unpaidArIdr)})
              </strong>{" "}
              — Konfirmasi pelunasan akan otomatis mengaktifkan lisensi &amp; memposting Jurnal PSAK.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueInvoices.slice(0, 2).map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => onQuickCollectOverdue(inv.id)}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-amber-300"
              >
                <Wallet className="h-3.5 w-3.5" /> Lunasi {inv.invoiceNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Automated SWOT Intelligence Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Strengths (Kekuatan Penerbit)
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-200">
            {m.strengths.map((s) => (
              <li key={s} className="rounded-xl bg-emerald-500/5 px-3 py-2">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <AlertTriangle className="h-4 w-4" /> Weaknesses (Area Perhatian Operasional)
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-200">
            {m.weaknesses.map((w) => (
              <li key={w} className="rounded-xl bg-amber-500/5 px-3 py-2">
                {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-300">
            <TrendingUp className="h-4 w-4" /> Opportunities (Peluang Pertumbuhan MRR)
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-200">
            {m.opportunities.map((o) => (
              <li key={o} className="rounded-xl bg-indigo-500/5 px-3 py-2">
                {o}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-slate-900/90 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-rose-300">
            <Sparkles className="h-4 w-4" /> Threats &amp; Mitigasi Risiko
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-200">
            {m.threats.map((t) => (
              <li key={t} className="rounded-xl bg-rose-500/5 px-3 py-2">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tenant Unit Economics Table (MRR vs Cloud & AI COGS) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers className="h-4 w-4 text-emerald-400" /> Unit Economics per Tenant (MRR vs
              Biaya Cloud &amp; Token AI)
            </h3>
            <p className="text-xs text-slate-400">
              Profitabilitas bersih setiap perusahaan pengguna WACRM secara real-time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("erp")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
          >
            Buka ERP &amp; Billing <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Perusahaan Tenant</th>
                <th className="px-3 py-2">Edisi</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">MRR / Bln</th>
                <th className="px-3 py-2 text-right">COGS Cloud + AI</th>
                <th className="px-3 py-2 text-right">Gross Profit</th>
                <th className="pl-3 py-2 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {unitEcon.map((row) => (
                <tr key={row.tenant.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 pr-3">
                    <div className="font-bold text-white">{row.tenant.companyName}</div>
                    <div className="text-[11px] text-slate-400">
                      {row.tenant.domain} · {row.tenant.city}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 uppercase font-mono text-[11px] text-indigo-300">
                    {row.edition}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        row.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : row.status === "trial"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-white">
                    {formatIdr(row.mrr)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-300">
                    {formatIdr(row.cogs)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-bold ${
                      row.margin >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatIdr(row.margin)}
                  </td>
                  <td className="pl-3 py-2.5 text-right font-mono font-bold text-white">
                    {row.mrr > 0 ? `${row.marginPct}%` : "Trial"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
