"use client";

import { Activity, CheckCircle2, Link2, MessageSquare, Shield, Users } from "lucide-react";
import { CHANNEL_META, LIFECYCLE_LABELS, type WorkspaceAnalytics } from "@/lib/crm-types";

export function AnalyticsView({ analytics }: { analytics: WorkspaceAnalytics }) {
  const maxChannel = Math.max(1, ...analytics.byChannel.map((item) => item.count));
  const maxStage = Math.max(1, ...analytics.byStage.map((item) => item.count));

  const kpis = [
    { label: "Percakapan Aktif", value: analytics.openConversations + analytics.pendingConversations, sub: `${analytics.openConversations} terbuka · ${analytics.pendingConversations} menunggu`, icon: MessageSquare, accent: "text-emerald-700 bg-emerald-50" },
    { label: "Percakapan Selesai", value: analytics.resolvedConversations, sub: `Dari total ${analytics.totalConversations} percakapan`, icon: CheckCircle2, accent: "text-sky-700 bg-sky-50" },
    { label: "Total Kontak CRM", value: analytics.totalContacts, sub: `${analytics.messagesLast24h} pesan dalam 24 jam terakhir`, icon: Users, accent: "text-indigo-700 bg-indigo-50" },
    { label: "Kanal Terhubung", value: analytics.connectedChannels, sub: `${analytics.totalMessages} total pesan tersimpan`, icon: Link2, accent: "text-amber-700 bg-amber-50" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analitik &amp; Jejak Audit Keamanan</h2>
          <p className="text-sm text-slate-500">Ringkasan performa omnichannel dan log aktivitas tenant secara real-time.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <article key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">{kpi.label}</p>
                  <span className={`rounded-xl p-2 ${kpi.accent}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">{kpi.value}</p>
                <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
              </article>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="h-4 w-4 text-emerald-600" />
              Distribusi Percakapan per Kanal
            </h3>
            {analytics.byChannel.length === 0 ? (
              <p className="mt-4 text-xs text-slate-400">Belum ada data percakapan.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {analytics.byChannel.map((item) => {
                  const meta = CHANNEL_META[item.channel];
                  const pct = Math.round((item.count / maxChannel) * 100);
                  return (
                    <div key={item.channel}>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{meta.label}</span>
                        <span className="font-bold tabular-nums text-slate-900">{item.count}</span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users className="h-4 w-4 text-indigo-600" />
              Corong Tahap Pelanggan (CRM Lifecycle)
            </h3>
            {analytics.byStage.length === 0 ? (
              <p className="mt-4 text-xs text-slate-400">Belum ada kontak pelanggan.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {analytics.byStage.map((item) => {
                  const label = LIFECYCLE_LABELS[item.stage]?.label ?? item.stage;
                  const pct = Math.round((item.count / maxStage) * 100);
                  return (
                    <div key={item.stage}>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="font-bold tabular-nums text-slate-900">{item.count}</span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Audit Logs */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Shield className="h-4 w-4 text-emerald-600" />
              Jejak Audit Aktivitas Workspace (Terbaru)
            </h3>
            <span className="text-xs text-slate-400">Dilindungi RLS Tenant</span>
          </div>
          {analytics.recentAuditLogs.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">Belum ada log aktivitas.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="pb-2 font-semibold">Waktu</th>
                    <th className="pb-2 font-semibold">Aktor</th>
                    <th className="pb-2 font-semibold">Aksi</th>
                    <th className="pb-2 font-semibold">Sumber Daya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.recentAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-800">{log.actorName}</td>
                      <td className="py-2.5 pr-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500">{log.resourceType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
