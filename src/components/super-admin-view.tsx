"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crown,
  Lightbulb,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import {
  formatIdr,
  type AppEditionId,
  type SubscriptionStatus,
  type SuperAdminOverview,
  type SuperAdminTenantRecord,
} from "@/lib/crm-types";
import { APP_EDITIONS, getEditionById } from "@/lib/editions";
import {
  applySuperAdminAutoFix,
  applySuperAdminTenantUpdate,
  computeSuperAdminOverview,
  loadStoredSuperAdminTenants,
  saveStoredSuperAdminTenants,
} from "@/lib/super-admin";

interface SuperAdminViewProps {
  currentTenantTelemetry?: SuperAdminTenantRecord | null;
  liveApiMode?: boolean;
  onSyncCurrentEdition?: (editionId: AppEditionId) => void;
  onToast?: (message: string, tone?: "ok" | "error") => void;
}

const STATUS_BADGE: Record<SubscriptionStatus, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-emerald-500/20 text-emerald-300" },
  trial: { label: "Uji Coba", cls: "bg-cyan-500/20 text-cyan-300" },
  past_due: { label: "Tertunggak", cls: "bg-amber-500/20 text-amber-300" },
  suspended: { label: "Ditangguhkan", cls: "bg-rose-500/20 text-rose-300" },
};

export function SuperAdminView({
  currentTenantTelemetry = null,
  liveApiMode = false,
  onSyncCurrentEdition,
  onToast,
}: SuperAdminViewProps) {
  const mergeWithCurrentTenant = useCallback(
    (stored: SuperAdminTenantRecord[]): SuperAdminTenantRecord[] => {
      if (!currentTenantTelemetry) return stored;
      const idx = stored.findIndex((t) => t.tenantId === currentTenantTelemetry.tenantId);
      const merged = [...stored];
      if (idx >= 0) {
        merged[idx] = {
          ...currentTenantTelemetry,
          subscriptionStatus: stored[idx].subscriptionStatus,
        };
      } else {
        merged.unshift(currentTenantTelemetry);
      }
      saveStoredSuperAdminTenants(merged);
      return merged;
    },
    [currentTenantTelemetry],
  );

  const [tenants, setTenants] = useState<SuperAdminTenantRecord[]>(() =>
    mergeWithCurrentTenant(loadStoredSuperAdminTenants()),
  );
  const [sourceMode, setSourceMode] = useState<"neon" | "demo">("demo");
  const [sourceLabel, setSourceLabel] = useState<string>(
    liveApiMode
      ? "Hybrid Live Workspace + Portofolio Multi-Tenant"
      : "Portofolio Multi-Tenant Real-Time (Workspace Aktif + Benchmark)",
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editionFilter, setEditionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const notify = useCallback(
    (msg: string, tone: "ok" | "error" = "ok") => {
      if (onToast) onToast(msg, tone);
    },
    [onToast],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (liveApiMode) {
        const res = await fetch("/api/super-admin/overview", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as {
            source: string;
            overview: SuperAdminOverview;
          };
          if (json.overview?.tenants?.length > 0) {
            setTenants(json.overview.tenants);
            setSourceMode("neon");
            setSourceLabel("Neon PostgreSQL Live Multi-Tenant");
            return;
          }
        }
      }
    } catch {
      // Fallback smoothly to local multi-tenant telemetry + live current workspace
    } finally {
      setLoading(false);
    }

    const next = mergeWithCurrentTenant(loadStoredSuperAdminTenants());
    setTenants(next);
    setSourceMode("demo");
    setSourceLabel(
      liveApiMode
        ? "Hybrid Live Workspace + Portofolio Multi-Tenant"
        : "Portofolio Multi-Tenant Real-Time (Workspace Aktif + Benchmark)",
    );
  }, [liveApiMode, mergeWithCurrentTenant]);

  useEffect(() => {
    if (!liveApiMode) return;
    let active = true;
    fetch("/api/super-admin/overview", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ overview?: SuperAdminOverview }>) : null))
      .then((json) => {
        if (!active || !json?.overview?.tenants?.length) return;
        setTenants(json.overview.tenants);
        setSourceMode("neon");
        setSourceLabel("Neon PostgreSQL Live Multi-Tenant");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [liveApiMode]);

  const effectiveTenants = useMemo(() => {
    if (sourceMode === "neon" || !currentTenantTelemetry) return tenants;
    const idx = tenants.findIndex((t) => t.tenantId === currentTenantTelemetry.tenantId);
    if (idx < 0) return [currentTenantTelemetry, ...tenants];
    const next = [...tenants];
    next[idx] = {
      ...currentTenantTelemetry,
      subscriptionStatus: tenants[idx].subscriptionStatus,
    };
    return next;
  }, [currentTenantTelemetry, sourceMode, tenants]);

  const overview = useMemo(
    () => computeSuperAdminOverview({ tenants: effectiveTenants, source: sourceMode }),
    [effectiveTenants, sourceMode],
  );

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return overview.tenants.filter((t) => {
      if (editionFilter !== "all" && t.editionId !== editionFilter) return false;
      if (statusFilter !== "all" && t.subscriptionStatus !== statusFilter) return false;
      if (
        q &&
        !t.businessName.toLowerCase().includes(q) &&
        !t.ownerEmail.toLowerCase().includes(q) &&
        !t.ownerName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [overview.tenants, search, editionFilter, statusFilter]);

  async function handleUpdateTenant(
    tenantId: string,
    patch: Partial<{ editionId: AppEditionId; subscriptionStatus: SubscriptionStatus }>,
  ) {
    setBusyAction(tenantId);
    try {
      if (sourceMode === "neon") {
        const res = await fetch("/api/super-admin/overview", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_tenant", tenantId, ...patch }),
        });
        if (!res.ok) throw new Error("Gagal menyimpan perubahan ke Neon DB.");
        await loadData();
      } else {
        const next = applySuperAdminTenantUpdate(tenants, tenantId, patch);
        setTenants(next);
        saveStoredSuperAdminTenants(next);
      }

      if (patch.editionId && currentTenantTelemetry?.tenantId === tenantId && onSyncCurrentEdition) {
        onSyncCurrentEdition(patch.editionId);
      }
      notify("Perubahan edisi / status tenant berhasil diterapkan.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Gagal memperbarui tenant.", "error");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAutoFixTenant(tenantId: string, businessName: string) {
    setBusyAction(`fix-${tenantId}`);
    try {
      if (sourceMode === "neon") {
        const res = await fetch("/api/super-admin/overview", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "auto_fix", tenantId }),
        });
        const json = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) throw new Error(json.error || "Gagal menjalankan Auto-Fix.");
        await loadData();
        notify(json.message || `Auto-Fix untuk ${businessName} selesai.`);
      } else {
        const next = applySuperAdminAutoFix(tenants, tenantId);
        setTenants(next);
        saveStoredSuperAdminTenants(next);
        notify(`Auto-Fix selesai untuk ${businessName}: neraca diseimbangkan, SEO & kesehatan dipulihkan!`);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Gagal menjalankan Auto-Fix.", "error");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAutoFixAll() {
    setBusyAction("fix-all");
    try {
      if (sourceMode === "neon") {
        const res = await fetch("/api/super-admin/overview", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "auto_fix" }),
        });
        const json = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) throw new Error(json.error || "Auto-Fix global gagal.");
        await loadData();
        notify(json.message || "Auto-Fix global berhasil dijalankan.");
      } else {
        let next = [...tenants];
        for (const t of tenants) {
          next = applySuperAdminAutoFix(next, t.tenantId);
          if (t.subscriptionStatus === "past_due") {
            next = applySuperAdminTenantUpdate(next, t.tenantId, { subscriptionStatus: "active" });
          }
        }
        setTenants(next);
        saveStoredSuperAdminTenants(next);
        notify(`Seluruh ${next.length} tenant telah dipulihkan via Super Admin Self-Healing Auto-Fix!`);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Auto-Fix global gagal.", "error");
    } finally {
      setBusyAction(null);
    }
  }

  const allInsights = useMemo(
    () => [...overview.strengths, ...overview.weaknesses, ...overview.opportunities],
    [overview.strengths, overview.weaknesses, overview.opportunities],
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/50 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            <Crown className="h-3.5 w-3.5" />
            Super Admin Command Center · Platform Control Plane
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Pelacakan Seluruh Pengguna/Tenant, Analisis Keunggulan &amp; Kelemahan, serta Auto-Fix
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Sumber data: <strong className="text-amber-200">{sourceLabel}</strong> · Pantau MRR, edisi aktif, kesehatan sistem, SWOT otomatis, dan jalankan perbaikan lintas tenant 1-klik.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void handleAutoFixAll()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
          >
            <Wrench className="h-3.5 w-3.5" /> Auto-Fix Semua Tenant
          </button>
        </div>
      </div>

      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Tenant</span>
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">
            {overview.summary.totalTenants}
          </div>
          <div className="text-[11px] text-emerald-400">
            {overview.summary.activeTenants} aktif · {overview.summary.trialTenants} trial
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Pengguna</span>
            <Users className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">
            {overview.summary.totalUsersAgents}
          </div>
          <div className="text-[11px] text-slate-400">
            Auto-Reply {overview.summary.avgAiAutomationPct}%
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>MRR Platform</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 text-lg font-extrabold text-emerald-400">
            {formatIdr(overview.summary.mrrIdr)}
          </div>
          <div className="text-[11px] text-slate-400">
            ARR {formatIdr(overview.summary.arrIdr)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>GMV Klien</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-extrabold text-white">
            {formatIdr(overview.summary.totalGmvIdr)}
          </div>
          <div className="text-[11px] text-slate-400">{overview.summary.totalOrders} order POS</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Kesehatan Sistem</span>
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-300">
            {overview.summary.avgHealthScore}%
          </div>
          <div className="text-[11px] text-slate-400">Rata-rata tenant</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>SEO Global</span>
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-cyan-300">
            {overview.summary.avgSeoScore}/100
          </div>
          <div className="text-[11px] text-slate-400">Skor katalog</div>
        </div>
      </div>

      {/* Edition Breakdown Strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {overview.editionBreakdown.map((stat) => (
          <div
            key={stat.editionId}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{stat.label}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                {stat.count} tenant
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              MRR: <strong className="text-slate-200">{formatIdr(stat.mrrIdr)}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Automated Product Strengths, Weaknesses & Opportunities (SWOT + Auto-Fix) */}
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              Analisis Otomatis Keunggulan, Kelemahan &amp; Peluang Perbaikan Produk (SWOT)
            </h3>
            <p className="text-[11px] text-slate-400">
              Dihitung real-time dari performa seluruh tenant — langsung eksekusi Auto-Fix untuk memperbaiki kelemahan!
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {allInsights.map((ins) => {
            const isStrength = ins.type === "strength";
            const isWeakness = ins.type === "weakness";
            return (
              <div
                key={ins.id}
                className={`rounded-xl border p-4 text-xs ${
                  isStrength
                    ? "border-emerald-500/35 bg-emerald-500/10"
                    : isWeakness
                      ? "border-rose-500/35 bg-rose-500/10"
                      : "border-indigo-500/35 bg-indigo-500/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    {isStrength ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isWeakness ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    ) : (
                      <Lightbulb className="h-4 w-4 shrink-0 text-indigo-300" />
                    )}
                    <span>{ins.title}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-200">
                    {isStrength ? "Keunggulan" : isWeakness ? "Kelemahan" : "Peluang"} · {ins.metric}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-slate-200">{ins.detail}</p>
                {ins.recommendedFix && (
                  <div className="mt-2 text-[11px] font-semibold text-amber-200">
                    Rekomendasi Perbaikan: {ins.recommendedFix}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All Tenants / Users Directory & Live Control Table */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">
            Daftar Seluruh Tenant &amp; Pengguna Aplikasi ({filteredTenants.length})
          </h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari bisnis / pemilik / email..."
                className="rounded-xl border border-slate-700 bg-slate-950 py-1.5 pl-8 pr-3 text-white placeholder:text-slate-500"
              />
            </div>
            <select
              value={editionFilter}
              onChange={(e) => setEditionFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
            >
              <option value="all">Semua Edisi</option>
              {APP_EDITIONS.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="trial">Uji Coba</option>
              <option value="past_due">Tertunggak</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-3">Bisnis / Pemilik</th>
                <th className="px-2 py-2.5">Edisi</th>
                <th className="px-2 py-2.5">Status</th>
                <th className="px-2 py-2.5 text-right">Langganan/bln</th>
                <th className="px-2 py-2.5 text-center">Agen / Kontak / Kanal</th>
                <th className="px-2 py-2.5 text-center">Kesehatan / SEO</th>
                <th className="px-2 py-2.5">Deteksi Masalah &amp; Auto-Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTenants.map((t) => {
                const ed = getEditionById(t.editionId);
                const st = STATUS_BADGE[t.subscriptionStatus];
                return (
                  <tr key={t.tenantId} className="align-top hover:bg-slate-800/40">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{t.businessName}</span>
                        {t.isCurrentWorkspace && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                            ANDA
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t.ownerName} · {t.ownerEmail}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        GMV: {formatIdr(t.gmvIdr)} ({t.ordersCount} order)
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={t.editionId}
                        disabled={busyAction === t.tenantId}
                        onChange={(e) =>
                          void handleUpdateTenant(t.tenantId, {
                            editionId: e.target.value as AppEditionId,
                          })
                        }
                        aria-label={`Ubah edisi ${t.businessName}`}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        {APP_EDITIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-[10px] text-slate-400">{ed.badge}</div>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={t.subscriptionStatus}
                        disabled={busyAction === t.tenantId}
                        onChange={(e) =>
                          void handleUpdateTenant(t.tenantId, {
                            subscriptionStatus: e.target.value as SubscriptionStatus,
                          })
                        }
                        aria-label={`Ubah status ${t.businessName}`}
                        className={`rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-bold ${st.cls}`}
                      >
                        <option value="active">Aktif</option>
                        <option value="trial">Uji Coba</option>
                        <option value="past_due">Tertunggak</option>
                        <option value="suspended">Ditangguhkan</option>
                      </select>
                    </td>
                    <td className="px-2 py-3 text-right font-bold text-emerald-400">
                      {formatIdr(t.monthlyPriceIdr)}
                    </td>
                    <td className="px-2 py-3 text-center text-[11px] text-slate-300">
                      {t.activeAgents} agen · {t.totalContacts} kontak · {t.connectedChannels} kanal
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div
                        className={`font-bold ${
                          t.healthScore >= 85
                            ? "text-emerald-300"
                            : t.healthScore >= 70
                              ? "text-amber-300"
                              : "text-rose-400"
                        }`}
                      >
                        {t.healthScore}% Sehat
                      </div>
                      <div className="text-[11px] text-cyan-300">SEO {t.seoScore}/100</div>
                    </td>
                    <td className="px-2 py-3">
                      {t.detectedIssues.length > 0 ? (
                        <div className="space-y-1.5">
                          <ul className="space-y-1 text-[11px] text-amber-300">
                            {t.detectedIssues.map((iss, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{iss}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void handleAutoFixTenant(t.tenantId, t.businessName)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 ring-1 ring-amber-500/40 hover:bg-amber-500/30"
                          >
                            <Wrench className="h-3 w-3" /> Auto-Fix Tenant Ini
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Optimal tanpa isu
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
