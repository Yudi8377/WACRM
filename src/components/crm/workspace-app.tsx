"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpenCheck,
  Bot,
  Boxes,
  CloudCheck,
  Database,
  FileText,
  Inbox,
  Link2,
  Receipt,
  RefreshCw,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
import type { ContactRecord } from "@/lib/crm-types";
import type { WorkspaceAdapter, WorkspaceSnapshot } from "@/lib/workspace-adapter";
import { notifyAndroid } from "@/components/pwa-register";
import { AiAgentsView } from "@/components/ai-agents-view";
import { PosView } from "@/components/pos-view";
import { ErpView } from "@/components/erp-view";
import { AccountingView } from "@/components/accounting-view";
import { InboxView } from "./inbox-view";
import { ContactsView } from "./contacts-view";
import { ChannelsView } from "./channels-view";
import { TemplatesView } from "./templates-view";
import { AnalyticsView } from "./analytics-view";
import { SettingsView } from "./settings-view";

type TabId =
  | "inbox"
  | "ai"
  | "pos"
  | "erp"
  | "accounting"
  | "contacts"
  | "channels"
  | "templates"
  | "analytics"
  | "settings";

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof Inbox;
  group: "core" | "crm";
}> = [
  { id: "inbox", label: "Inbox AI Otomatis", shortLabel: "Inbox AI", icon: Inbox, group: "core" },
  { id: "ai", label: "Multi-Agent AI", shortLabel: "AI Swarm", icon: Bot, group: "core" },
  { id: "pos", label: "POS & QR Invoice", shortLabel: "POS QR", icon: Receipt, group: "core" },
  { id: "erp", label: "ERP & Gudang", shortLabel: "ERP", icon: Boxes, group: "core" },
  { id: "accounting", label: "Akuntansi", shortLabel: "Akuntansi", icon: BookOpenCheck, group: "core" },
  { id: "contacts", label: "Kontak CRM", shortLabel: "Kontak", icon: Users, group: "crm" },
  { id: "channels", label: "Kanal Omnichannel", shortLabel: "Kanal", icon: Link2, group: "crm" },
  { id: "templates", label: "Template & Cepat", shortLabel: "Template", icon: FileText, group: "crm" },
  { id: "analytics", label: "Analitik & Audit", shortLabel: "Analitik", icon: BarChart3, group: "crm" },
  { id: "settings", label: "Pengaturan", shortLabel: "Atur", icon: Settings, group: "crm" },
];

export function WorkspaceApp({ adapter }: { adapter: WorkspaceAdapter }) {
  const [tab, setTab] = useState<TabId>("inbox");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const showToast = useCallback((text: string, tone: "success" | "error" | "ok" = "success") => {
    const normalizedTone = tone === "error" ? "error" : "success";
    setToast({ text, tone: normalizedTone });
    notifyAndroid(text);
    setTimeout(() => setToast((curr) => (curr?.text === text ? null : curr)), 3800);
  }, []);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const next = await adapter.loadAll();
      setSnapshot(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data workspace belum dapat dimuat.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [adapter]);

  useEffect(() => {
    let active = true;
    adapter
      .loadAll()
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Data workspace belum dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Desktop <-> Mobile continuous Neon database synchronization (every 25s when tab visible)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void adapter
          .loadAll()
          .then((next) => {
            if (active) setSnapshot(next);
          })
          .catch(() => undefined);
      }
    }, 25_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [adapter]);

  async function handleStartChat(contact: ContactRecord) {
    try {
      const existing = snapshot?.conversations.find((c) => c.contactId === contact.id);
      if (existing) {
        setActiveConversationId(existing.id);
        setTab("inbox");
        return;
      }
      const created = await adapter.createConversation({
        contactId: contact.id,
        channel: "whatsapp",
        priority: "normal",
        subject: `Percakapan dengan ${contact.displayName}`,
      });
      await refresh();
      setActiveConversationId(created.id);
      setTab("inbox");
      showToast(`Percakapan dengan ${contact.displayName} dibuka.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal membuka percakapan.", "error");
    }
  }

  const unreadTotal = snapshot?.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) ?? 0;
  const activeAiCount = snapshot?.aiAgents.filter((a) => a.enabled).length ?? 0;
  const syncedClock = snapshot?.syncedAt
    ? new Date(snapshot.syncedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      {/* TOP BAR */}
      <header className="safe-top flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href={adapter.mode === "neon" ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="WACRM" className="h-8 w-8 rounded-xl shadow-xs" />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-slate-900">WACRM</span>
              <span className="hidden rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white sm:inline">
                v2.0 AI
              </span>
            </div>
          </Link>
          <span className="hidden text-slate-300 sm:inline">/</span>
          <span className="truncate text-sm font-semibold text-slate-700">
            {snapshot?.workspaceName || "Memuat workspace..."}
          </span>
          {adapter.mode === "demo" ? (
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 lg:inline-flex">
              Mode Demo Interaktif
            </span>
          ) : (
            <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 lg:inline-flex">
              <CloudCheck className="h-3.5 w-3.5" />
              Sinkron Desktop ↔ HP · {syncedClock}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Sinkronkan Desktop & Mobile sekarang"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-emerald-600" : ""}`} />
            <span className="hidden sm:inline">{syncing ? "Sinkron..." : "Sync"}</span>
          </button>
          <Link
            href="/android"
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
            Android APK
          </Link>
          {adapter.mode === "demo" ? (
            <Link
              href="/setup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hubungkan Neon</span>
              <span className="sm:hidden">Neon</span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Workspace
            </Link>
          )}
        </div>
      </header>

      {/* BODY: Desktop Sidebar + Main View */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav className="hidden w-60 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white p-3 md:flex">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Suite Otonom AI &amp; Bisnis
              </p>
              <div className="space-y-1">
                {NAV_ITEMS.filter((n) => n.group === "core").map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                        {item.label}
                      </span>
                      {item.id === "inbox" && unreadTotal > 0 && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {unreadTotal}
                        </span>
                      )}
                      {item.id === "ai" && activeAiCount > 0 && (
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                          {activeAiCount} ON
                        </span>
                      )}
                      {item.id === "pos" && snapshot && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {snapshot.orders.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                CRM &amp; Administrasi
              </p>
              <div className="space-y-1">
                {NAV_ITEMS.filter((n) => n.group === "crm").map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
            <p className="font-bold text-emerald-900">
              {adapter.mode === "neon" ? "Neon Cloud Sync Aktif" : "Sandbox Enterprise v2.0"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80">
              {adapter.mode === "neon"
                ? `Sinkron otomatis Desktop ↔ Android (${syncedClock}). 28 tabel + 24 RLS aktif.`
                : "Semua fitur AI Swarm, POS QR, ERP, Akuntansi & Print aktif langsung. Hubungkan Neon untuk sinkron multi-perangkat."}
            </p>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Memuat ruang kerja WACRM Enterprise AI...
            </div>
          ) : error && !snapshot ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Coba Lagi
              </button>
            </div>
          ) : snapshot ? (
            <>
              {tab === "inbox" && (
                <InboxView
                  key={activeConversationId ?? "default-inbox"}
                  adapter={adapter}
                  conversations={snapshot.conversations}
                  contacts={snapshot.contacts}
                  channels={snapshot.channels}
                  quickReplies={snapshot.quickReplies}
                  members={snapshot.members}
                  initialConversationId={activeConversationId}
                  onRefresh={refresh}
                  onOpenPos={() => setTab("pos")}
                  onToast={showToast}
                />
              )}
              {tab === "ai" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <AiAgentsView
                    adapter={adapter}
                    agents={snapshot.aiAgents}
                    knowledge={snapshot.aiKnowledge}
                    incidents={snapshot.aiIncidents}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "pos" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <PosView
                    adapter={adapter}
                    workspaceName={snapshot.workspaceName}
                    products={snapshot.products}
                    orders={snapshot.orders}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "erp" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <ErpView
                    adapter={adapter}
                    workspaceName={snapshot.workspaceName}
                    products={snapshot.products}
                    suppliers={snapshot.suppliers}
                    movements={snapshot.stockMovements}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "accounting" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <AccountingView
                    adapter={adapter}
                    workspaceName={snapshot.workspaceName}
                    entries={snapshot.accountingEntries}
                    orders={snapshot.orders}
                    report={snapshot.financialReport}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "contacts" && (
                <ContactsView
                  adapter={adapter}
                  contacts={snapshot.contacts}
                  onRefresh={refresh}
                  onStartChat={handleStartChat}
                  onToast={showToast}
                />
              )}
              {tab === "channels" && (
                <ChannelsView
                  adapter={adapter}
                  channels={snapshot.channels}
                  onRefresh={refresh}
                  onToast={showToast}
                />
              )}
              {tab === "templates" && (
                <TemplatesView
                  adapter={adapter}
                  quickReplies={snapshot.quickReplies}
                  templates={snapshot.templates}
                  onRefresh={refresh}
                  onToast={showToast}
                />
              )}
              {tab === "analytics" && <AnalyticsView analytics={snapshot.analytics} />}
              {tab === "settings" && (
                <SettingsView
                  adapter={adapter}
                  workspaceName={snapshot.workspaceName}
                  workspaceSlug={snapshot.workspaceSlug}
                  currentRole={snapshot.currentRole}
                  members={snapshot.members}
                  onRefresh={refresh}
                  onToast={showToast}
                />
              )}
            </>
          ) : null}
        </main>
      </div>

      {/* MOBILE / ANDROID SCROLLABLE BOTTOM NAVIGATION BAR */}
      <nav className="safe-bottom flex overflow-x-auto border-t border-slate-200 bg-white md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative flex min-w-[70px] shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-semibold transition ${
                active ? "bg-emerald-50/70 text-emerald-700" : "text-slate-500"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="truncate">{item.shortLabel}</span>
              {item.id === "inbox" && unreadTotal > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                  {unreadTotal}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* TOAST */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-white shadow-xl md:bottom-6 ${
            toast.tone === "error" ? "bg-red-600" : "bg-slate-900"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
