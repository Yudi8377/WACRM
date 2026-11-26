"use client";

import { useState } from "react";
import {
  Bot,
  Brain,
  CheckCircle2,
  DatabaseZap,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import type {
  AiAgentRecord,
  AiKnowledgeItemRecord,
  AiSecurityIncidentRecord,
} from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface AiAgentsViewProps {
  adapter: WorkspaceAdapter;
  agents: AiAgentRecord[];
  knowledge: AiKnowledgeItemRecord[];
  incidents: AiSecurityIncidentRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

const ROLE_LABELS: Record<string, string> = {
  cs_sales: "Auto-Reply CS & Sales 24/7",
  order_pos: "Ekstraksi Order, POS & QR Invoice",
  knowledge_learner: "Pembelajar Pengetahuan Otonom",
  fraud_sentinel: "Deteksi Fraud & Anti-Penipuan",
  system_guardian: "Keamanan & Self-Healing Sistem",
};

const SOURCE_LABELS: Record<string, string> = {
  product: "Katalog ERP",
  chat: "Percakapan CRM",
  order: "Transaksi POS",
  sop: "SOP & Kebijakan",
  autonomous_learning: "Sintesis AI Otonom",
};

export function AiAgentsView({
  adapter,
  agents,
  knowledge,
  incidents,
  onRefresh,
  onToast,
}: AiAgentsViewProps) {
  const [tab, setTab] = useState<"agents" | "knowledge" | "security">("agents");
  const [syncingKb, setSyncingKb] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastHealthScore, setLastHealthScore] = useState<number>(98);
  const [busyAgent, setBusyAgent] = useState<string | null>(null);

  // Add knowledge form
  const [kbTitle, setKbTitle] = useState("");
  const [kbContent, setKbContent] = useState("");
  const [kbTags, setKbTags] = useState("sop, kebijakan");
  const [addingKb, setAddingKb] = useState(false);

  const activeAgentsCount = agents.filter((a) => a.enabled).length;
  const totalActions = agents.reduce((sum, a) => sum + a.actionsExecuted, 0);
  const openIncidents = incidents.filter((i) => i.status === "open").length;
  const selfHealedCount = incidents.filter((i) => i.selfHealed).length;

  async function toggleAgent(agent: AiAgentRecord) {
    setBusyAgent(agent.agentKey);
    try {
      await adapter.updateAiAgent(agent.agentKey, { enabled: !agent.enabled });
      await onRefresh();
      onToast(
        `${agent.name} ${!agent.enabled ? "diaktifkan (otonom penuh)" : "dinonaktifkan sementara"}.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengubah status agen AI.", "error");
    } finally {
      setBusyAgent(null);
    }
  }

  async function toggleAutonomy(agent: AiAgentRecord) {
    setBusyAgent(agent.agentKey);
    try {
      const next = !agent.autoReplyEnabled;
      await adapter.updateAiAgent(agent.agentKey, {
        autoReplyEnabled: next,
        autonomousLearning: next,
        autonomousHealing: next,
      });
      await onRefresh();
      onToast(
        `${agent.name} diubah ke mode ${next ? "Otonom Penuh 24/7" : "Terbantu (Assisted)"}.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memperbarui mode agen AI.", "error");
    } finally {
      setBusyAgent(null);
    }
  }

  async function handleSyncKnowledge() {
    setSyncingKb(true);
    try {
      const res = await adapter.runAiKnowledgeSync();
      await onRefresh();
      onToast(`AI berhasil mempelajari & menyinkronkan ${res.syncedCount} entri pengetahuan terbaru.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyinkronkan basis pengetahuan AI.", "error");
    } finally {
      setSyncingKb(false);
    }
  }

  async function handleAddKnowledge(e: React.FormEvent) {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) return;
    setAddingKb(true);
    try {
      await adapter.addAiKnowledge({
        title: kbTitle.trim(),
        content: kbContent.trim(),
        sourceType: "sop",
        tags: kbTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setKbTitle("");
      setKbContent("");
      await onRefresh();
      onToast("Pengetahuan SOP baru ditambahkan ke memori Multi-Agent AI.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan pengetahuan AI.", "error");
    } finally {
      setAddingKb(false);
    }
  }

  async function handleDeleteKnowledge(id: string) {
    try {
      await adapter.deleteAiKnowledge(id);
      await onRefresh();
      onToast("Entri pengetahuan dihapus dari memori AI.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus pengetahuan.", "error");
    }
  }

  async function handleGuardianScan() {
    setScanning(true);
    try {
      const res = await adapter.runAiGuardianScan();
      setLastHealthScore(res.healthScore);
      await onRefresh();
      onToast(
        `Pemindaian Guardian & Self-Healing selesai — Skor Kesehatan Sistem ${res.healthScore}/100 (${res.incidents.length} temuan diproses).`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Pemindaian keamanan AI gagal.", "error");
    } finally {
      setScanning(false);
    }
  }

  async function handleResolveIncident(id: string) {
    try {
      await adapter.resolveIncident(id);
      await onRefresh();
      onToast("Insiden keamanan ditandai selesai.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memperbarui insiden.", "error");
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Multi-Agent AI Swarm — Zero Manual Reply & Self-Healing
          </div>
          <h2 className="mt-2 text-xl font-bold text-white md:text-2xl">
            Pusat Kendali Multi-Agent AI Otonom
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            5 agen AI bekerja serentak 24/7: membalas chat otomatis, membuat order POS &amp; QR invoice, memperbarui pengetahuan dari ERP, menangkal fraud, dan memperbaiki anomali secara mandiri.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncKnowledge}
            disabled={syncingKb}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
          >
            <DatabaseZap className={`h-4 w-4 ${syncingKb ? "animate-spin" : ""}`} />
            {syncingKb ? "Belajar Otonom..." : "Perbarui Pengetahuan AI"}
          </button>
          <button
            type="button"
            onClick={handleGuardianScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <ShieldCheck className={`h-4 w-4 ${scanning ? "animate-pulse" : ""}`} />
            {scanning ? "Memindai..." : "Pindai Fraud & Self-Healing"}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Agen AI Aktif</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">
              {activeAgentsCount}/{agents.length}
            </span>
            <span className="text-xs text-emerald-300">24/7 Otonom</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Total Aksi Dieksekusi</div>
          <div className="mt-1 text-2xl font-bold text-white">{totalActions.toLocaleString("id-ID")}</div>
          <div className="text-xs text-slate-400">Balasan, Invoice QR &amp; Audit</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Memori Pengetahuan AI</div>
          <div className="mt-1 text-2xl font-bold text-cyan-300">{knowledge.length} entri</div>
          <div className="text-xs text-slate-400">ERP + Chat + SOP Otonom</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Kesehatan &amp; Keamanan</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-300">{lastHealthScore}/100</span>
            <span className="text-xs text-amber-300">
              {selfHealedCount} self-healed · {openIncidents} terbuka
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "agents" as const, label: `Armada Multi-Agent (${agents.length})`, icon: Bot },
          { id: "knowledge" as const, label: `Basis Pengetahuan Generatif (${knowledge.length})`, icon: Brain },
          { id: "security" as const, label: `Fraud Sentinel & Self-Healing (${incidents.length})`, icon: ShieldAlert },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Multi-Agent Fleet */}
      {tab === "agents" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.agentKey}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                agent.enabled
                  ? "border-emerald-500/30 bg-slate-900/90"
                  : "border-slate-800 bg-slate-950/80 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">
                      <Bot className="h-3 w-3" />
                      {ROLE_LABELS[agent.agentKey] ?? agent.agentKey}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-white">{agent.name}</h3>
                  </div>
                  <button
                    type="button"
                    disabled={busyAgent === agent.agentKey}
                    onClick={() => toggleAgent(agent)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      agent.enabled
                        ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {agent.enabled ? "AKTIF" : "NONAKTIF"}
                  </button>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-300">{agent.roleDescription}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-950/80 p-3 text-xs">
                  <div>
                    <div className="text-slate-500">Ambang Kepercayaan</div>
                    <div className="font-bold text-emerald-300">
                      {Math.round(agent.confidenceThreshold * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Aksi Terlaksana</div>
                    <div className="font-bold text-white">{agent.actionsExecuted}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-[11px] text-slate-400">
                  Mode:{" "}
                  <strong className="text-slate-200">
                    {agent.autoReplyEnabled ? "Otonom Penuh" : "Terbantu"}
                  </strong>
                </span>
                <button
                  type="button"
                  disabled={busyAgent === agent.agentKey}
                  onClick={() => toggleAutonomy(agent)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  Ubah Mode
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Autonomous Knowledge Base */}
      {tab === "knowledge" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <form
            onSubmit={handleAddKnowledge}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-1"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4 text-emerald-400" />
              Tambah Pengetahuan / SOP Bisnis
            </div>
            <p className="text-xs text-slate-400">
              AI otomatis mempelajari produk ERP &amp; chat pelanggan. Anda juga bisa menambahkan SOP, promo, atau aturan khusus di sini.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300">Judul Pengetahuan</label>
              <input
                value={kbTitle}
                onChange={(e) => setKbTitle(e.target.value)}
                placeholder="Contoh: Promo Ongkir & Garansi Produk"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Konten / Fakta untuk AI</label>
              <textarea
                value={kbContent}
                onChange={(e) => setKbContent(e.target.value)}
                rows={4}
                placeholder="Tulis informasi produk, syarat garansi, nomor rekening resmi, atau SOP layanan..."
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Tag (pisahkan koma)</label>
              <input
                value={kbTags}
                onChange={(e) => setKbTags(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={addingKb}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {addingKb ? "Menyimpan..." : "Simpan ke Memori AI"}
            </button>
          </form>

          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Daftar Pengetahuan Aktif ({knowledge.length})
              </h3>
              <button
                type="button"
                onClick={handleSyncKnowledge}
                disabled={syncingKb}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingKb ? "animate-spin" : ""}`} />
                Sinkronkan Ulang dari ERP
              </button>
            </div>

            {knowledge.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                        {SOURCE_LABELS[item.sourceType] ?? item.sourceType}
                      </span>
                      {item.autoGenerated && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          Auto-Learned AI
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        Kepercayaan {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-white">{item.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.content}</p>
                    {item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteKnowledge(item.id)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                    title="Hapus pengetahuan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Fraud Sentinel & Self-Healing */}
      {tab === "security" && (
        <div className="space-y-3">
          {incidents.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400" />
              <div className="mt-2 text-base font-bold text-white">
                Sistem 100% Aman &amp; Neraca Seimbang
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Tidak ada anomali fraud atau kesalahan database yang ditemukan.
              </p>
            </div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.id}
                className={`rounded-2xl border p-4 ${
                  inc.severity === "critical" || inc.severity === "high"
                    ? "border-rose-500/35 bg-rose-950/20"
                    : inc.severity === "medium"
                      ? "border-amber-500/35 bg-amber-950/15"
                      : "border-emerald-500/30 bg-emerald-950/15"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          inc.severity === "critical" || inc.severity === "high"
                            ? "bg-rose-500/20 text-rose-300"
                            : inc.severity === "medium"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {inc.severity} · Skor Risiko {inc.riskScore}
                      </span>
                      {inc.selfHealed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                          <Wrench className="h-3 w-3" />
                          Self-Healed Otomatis
                        </span>
                      )}
                      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-300">
                        Status: {inc.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{inc.title}</h4>
                    <p className="text-xs text-slate-300">{inc.description}</p>
                    {inc.healingAction && (
                      <div className="mt-2 rounded-xl border border-cyan-500/25 bg-slate-950/70 p-2.5 text-xs text-cyan-200">
                        <strong>Tindakan Self-Healing AI:</strong> {inc.healingAction}
                      </div>
                    )}
                  </div>

                  {inc.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => handleResolveIncident(inc.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Tandai Selesai
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
