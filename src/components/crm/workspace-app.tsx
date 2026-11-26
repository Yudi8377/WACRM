"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Database,
  FileText,
  Inbox,
  Link2,
  RefreshCw,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
import type { ContactRecord } from "@/lib/crm-types";
import type { WorkspaceAdapter, WorkspaceSnapshot } from "@/lib/workspace-adapter";
import { notifyAndroid } from "@/components/pwa-register";
import { InboxView } from "./inbox-view";
import { ContactsView } from "./contacts-view";
import { ChannelsView } from "./channels-view";
import { TemplatesView } from "./templates-view";
import { AnalyticsView } from "./analytics-view";
import { SettingsView } from "./settings-view";

type TabId = "inbox" | "contacts" | "channels" | "templates" | "analytics" | "settings";

const NAV_ITEMS: Array<{ id: TabId; label: string; shortLabel: string; icon: typeof Inbox }> = [
  { id: "inbox", label: "Kotak Masuk", shortLabel: "Inbox", icon: Inbox },
  { id: "contacts", label: "Kontak CRM", shortLabel: "Kontak", icon: Users },
  { id: "channels", label: "Kanal", shortLabel: "Kanal", icon: Link2 },
  { id: "templates", label: "Template & Cepat", shortLabel: "Template", icon: FileText },
  { id: "analytics", label: "Analitik & Audit", shortLabel: "Analitik", icon: BarChart3 },
  { id: "settings", label: "Pengaturan", shortLabel: "Atur", icon: Settings },
];

export function WorkspaceApp({ adapter }: { adapter: WorkspaceAdapter }) {
  const [tab, setTab] = useState<TabId>("inbox");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const showToast = useCallback((text: string, tone: "success" | "error" = "success") => {
    setToast({ text, tone });
    notifyAndroid(text);
    setTimeout(() => setToast((curr) => (curr?.text === text ? null : curr)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await adapter.loadAll();
      setSnapshot(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data workspace belum dapat dimuat.");
    } finally {
      setLoading(false);
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
    return () => {
      active = false;
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

  return (
    <div className="flex h-dvh flex-col bg-slate-50 overflow-hidden">
      {/* TOP BAR */}
      <header className="safe-top flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3.5 md:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={adapter.mode === "neon" ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="WACRM" className="h-8 w-8 rounded-xl shadow-xs" />
            <span className="font-extrabold tracking-tight text-slate-900">WACRM</span>
          </Link>
          <span className="hidden text-slate-300 sm:inline">/</span>
          <span className="truncate text-sm font-semibold text-slate-700">
            {snapshot?.workspaceName || "Memuat workspace..."}
          </span>
          {adapter.mode === "demo" ? (
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 sm:inline-flex">
              Mode Demo Interaktif
            </span>
          ) : (
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 sm:inline-flex">
              Neon Live DB
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            title="Segarkan data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/android"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
            Android
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
        <nav className="hidden w-56 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-3 md:flex">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                    {item.label}
                  </span>
                  {item.id === "inbox" && unreadTotal > 0 && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      {unreadTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-bold text-slate-800">
              {adapter.mode === "neon" ? "Database Neon Aktif" : "Sandbox Demo Lokal"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {adapter.mode === "neon"
                ? "Semua INSERT, UPDATE, DELETE tersimpan aman dengan RLS PostgreSQL."
                : "Semua aksi CRUD tersimpan di perangkat ini. Hubungkan Neon untuk produksi multi-agen."}
            </p>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Memuat ruang kerja WACRM...
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
                  onToast={showToast}
                />
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

      {/* MOBILE / ANDROID BOTTOM NAVIGATION BAR */}
      <nav className="safe-bottom grid grid-cols-6 border-t border-slate-200 bg-white md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition ${
                active ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.shortLabel}</span>
              {item.id === "inbox" && unreadTotal > 0 && (
                <span className="absolute right-2.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
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
