"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Bot,
  Boxes,
  CloudCheck,
  Database,
  FileText,
  Inbox,
  KeyRound,
  Layers,
  Link2,
  Lock,
  LogIn,
  LogOut,
  Mic,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  evaluateEditionQuota,
  evaluateTabAccess,
  type CommercialUserSession,
  type WorkspaceTabId,
} from "@/lib/access-control";
import { authClient } from "@/lib/auth-client";
import type { AppEditionId, ContactRecord, StoreBusinessProfile } from "@/lib/crm-types";
import { getEditionById, loadTenantEdition, saveTenantEdition } from "@/lib/editions";
import { loadStoreProfile, saveStoreProfile } from "@/lib/store-profile";
import type { WorkspaceAdapter, WorkspaceSnapshot } from "@/lib/workspace-adapter";
import { notifyAndroid } from "@/components/pwa-register";
import { AiAgentsView } from "@/components/ai-agents-view";
import { AiCompanion } from "@/components/ai-companion";
import { PosView } from "@/components/pos-view";
import { ErpView } from "@/components/erp-view";
import { AccountingView } from "@/components/accounting-view";
import { MasterDataView } from "@/components/master-data-view";
import { SeoGrowthView } from "@/components/seo-growth-view";
import { EditionsView } from "@/components/editions-view";
import { InboxView } from "./inbox-view";
import { ContactsView } from "./contacts-view";
import { ChannelsView } from "./channels-view";
import { TemplatesView } from "./templates-view";
import { AnalyticsView } from "./analytics-view";
import { SettingsView } from "./settings-view";

type TabId = WorkspaceTabId;

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof Inbox;
  group: "core" | "crm" | "platform";
}> = [
  { id: "inbox", label: "Inbox AI Otomatis", shortLabel: "Inbox", icon: Inbox, group: "core" },
  { id: "master", label: "Master Data", shortLabel: "Master", icon: Database, group: "core" },
  { id: "pos", label: "POS & Cetak QR", shortLabel: "POS QR", icon: Receipt, group: "core" },
  { id: "erp", label: "ERP & Gudang", shortLabel: "ERP", icon: Boxes, group: "core" },
  { id: "accounting", label: "Akuntansi", shortLabel: "Akuntansi", icon: BookOpenCheck, group: "core" },
  { id: "ai", label: "Multi-Agent AI", shortLabel: "AI 9x", icon: Bot, group: "core" },
  { id: "seo_growth", label: "SEO & Growth AI", shortLabel: "SEO AI", icon: TrendingUp, group: "core" },
  { id: "contacts", label: "Kontak CRM", shortLabel: "Kontak", icon: Users, group: "crm" },
  { id: "channels", label: "Kanal Omnichannel", shortLabel: "Kanal", icon: Link2, group: "crm" },
  { id: "templates", label: "Template & Cepat", shortLabel: "Template", icon: FileText, group: "crm" },
  { id: "analytics", label: "Analitik & Audit", shortLabel: "Analitik", icon: BarChart3, group: "crm" },
  { id: "editions", label: "Edisi & Lisensi", shortLabel: "Lisensi", icon: Layers, group: "platform" },
  { id: "settings", label: "Pengaturan", shortLabel: "Atur", icon: Settings, group: "platform" },
];

export function WorkspaceApp({
  adapter,
  commercialUser,
  onSignOut,
}: {
  adapter: WorkspaceAdapter;
  commercialUser?: CommercialUserSession | null;
  onSignOut?: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("inbox");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreBusinessProfile>(() =>
    loadStoreProfile(adapter.tenantId),
  );
  const [editionId, setEditionId] = useState<AppEditionId>(() =>
    loadTenantEdition(adapter.tenantId),
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [companionTrigger, setCompanionTrigger] = useState<{
    id: number;
    prompt: string;
    speakImmediately?: boolean;
  } | null>(null);

  const showToast = useCallback((text: string, tone: "success" | "error" | "ok" = "success") => {
    const normalizedTone = tone === "error" ? "error" : "success";
    setToast({ text, tone: normalizedTone });
    notifyAndroid(text);
    setTimeout(() => setToast((curr) => (curr?.text === text ? null : curr)), 4000);
  }, []);

  const triggerCompanion = useCallback((prompt: string, speakImmediately = true) => {
    setCompanionTrigger({ id: Date.now(), prompt, speakImmediately });
  }, []);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const next = await adapter.loadAll();
      setSnapshot(next);
      setStoreProfile(loadStoreProfile(adapter.tenantId, next.workspaceName));
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
        setStoreProfile(loadStoreProfile(adapter.tenantId, next.workspaceName));
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Data workspace belum dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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

  function handleSaveStoreProfile(next: StoreBusinessProfile) {
    saveStoreProfile(adapter.tenantId, next);
    setStoreProfile(next);
  }

  function handleSelectEdition(nextEdition: AppEditionId) {
    saveTenantEdition(adapter.tenantId, nextEdition);
    setEditionId(nextEdition);
    const ed = getEditionById(nextEdition);
    showToast(`Edisi workspace aktif diubah ke ${ed.name} (${ed.badge}).`);
  }

  const activeEdition = useMemo(() => getEditionById(editionId), [editionId]);
  const effectiveRole = commercialUser?.role ?? snapshot?.currentRole ?? "owner";

  const currentTabAccess = useMemo(
    () => evaluateTabAccess(editionId, effectiveRole, tab),
    [editionId, effectiveRole, tab],
  );

  const quotaSnapshot = useMemo(() => {
    if (!snapshot) return null;
    const enabledAgents = snapshot.aiAgents.filter((a) => a.enabled).length;
    return {
      contacts: evaluateEditionQuota(editionId, "contacts", snapshot.contacts.length),
      channels: evaluateEditionQuota(editionId, "channels", snapshot.channels.length),
      aiAgents: evaluateEditionQuota(editionId, "aiAgents", enabledAgents),
    };
  }, [editionId, snapshot]);

  async function handleSignOutClick() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (onSignOut) {
        onSignOut();
        return;
      }
      await authClient.signOut().catch(() => undefined);
      router.replace("/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

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
  const escalationTotal =
    snapshot?.conversations.filter((c) => c.tags.includes("perlu-admin")).length ?? 0;
  const activeAiCount = snapshot?.aiAgents.filter((a) => a.enabled).length ?? 0;
  const syncedClock = snapshot?.syncedAt
    ? new Date(snapshot.syncedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      {/* TOP BAR */}
      <header className="safe-top flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className="flex shrink-0 items-center gap-2 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="WACRM" className="h-8 w-8 rounded-xl shadow-xs" />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-slate-900">WACRM</span>
              <span className="hidden rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white sm:inline">
                v4.2
              </span>
            </div>
          </button>
          <span className="hidden text-slate-300 sm:inline">/</span>
          <button
            type="button"
            onClick={() => setTab("settings")}
            title="Klik untuk ubah profil toko/usaha"
            className="truncate text-sm font-bold text-slate-800 hover:text-emerald-700"
          >
            {storeProfile.businessName}
          </button>
          <button
            type="button"
            onClick={() => setTab("editions")}
            title="Klik untuk lihat & ubah Edisi WACRM"
            className="hidden items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100 md:inline-flex"
          >
            <Layers className="h-3 w-3" />
            {activeEdition.name}
          </button>
          {adapter.mode === "neon" && (
            <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 lg:inline-flex">
              <CloudCheck className="h-3.5 w-3.5" />
              Sinkron · {syncedClock}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              triggerCompanion(
                "Apakah hari ini ada prospek yang belum kita follow up?",
                true,
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
            title="Tanya Asisten Pribadi AI 24/7 (Suara & Teks)"
          >
            <Mic className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">AI Companion 24/7</span>
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Muat ulang & sinkronkan data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-emerald-600" : ""}`} />
            <span className="hidden md:inline">{syncing ? "Sinkron..." : "Sync"}</span>
          </button>
          {commercialUser && (
            <div className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] xl:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="max-w-[140px] truncate font-bold text-slate-800">{commercialUser.displayName}</span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                {effectiveRole}
              </span>
            </div>
          )}
          {onSignOut || adapter.mode === "neon" ? (
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOutClick()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50"
              title="Keluar (Sign Out) dari sesi WACRM"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{signingOut ? "Keluar..." : "Sign Out"}</span>
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Masuk</span>
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
                Operasional Bisnis
              </p>
              <div className="space-y-1">
                {NAV_ITEMS.filter((n) => n.group === "core").map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  const access = evaluateTabAccess(editionId, effectiveRole, item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-emerald-50 text-emerald-800"
                          : access.allowed
                            ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            : "text-slate-400 hover:bg-slate-50"
                      }`}
                      title={access.allowed ? item.label : access.reason ?? "Terkunci oleh Edisi/Role"}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                        {item.label}
                      </span>
                      {!access.allowed ? (
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                      ) : item.id === "inbox" && (unreadTotal > 0 || escalationTotal > 0) ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                            escalationTotal > 0 ? "bg-amber-600" : "bg-emerald-600"
                          }`}
                        >
                          {escalationTotal > 0 ? `${escalationTotal}!` : unreadTotal}
                        </span>
                      ) : item.id === "ai" && activeAiCount > 0 ? (
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                          {activeAiCount} ON
                        </span>
                      ) : item.id === "pos" && snapshot ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {snapshot.orders.length}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                CRM &amp; Kanal
              </p>
              <div className="space-y-1">
                {NAV_ITEMS.filter((n) => n.group === "crm").map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  const access = evaluateTabAccess(editionId, effectiveRole, item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-emerald-50 text-emerald-800"
                          : access.allowed
                            ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            : "text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                        {item.label}
                      </span>
                      {!access.allowed && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Platform &amp; Edisi v4.0
              </p>
              <div className="space-y-1">
                {NAV_ITEMS.filter((n) => n.group === "platform").map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  const access = evaluateTabAccess(editionId, effectiveRole, item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-amber-50 text-amber-900"
                          : access.allowed
                            ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            : "text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${active ? "text-amber-600" : "text-slate-400"}`} />
                        {item.label}
                      </span>
                      {!access.allowed ? (
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                      ) : item.id === "editions" ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                          {activeEdition.id.toUpperCase()}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
            <div className="flex items-center justify-between gap-1">
              <p className="truncate font-bold text-emerald-900">{activeEdition.name}</p>
              <button
                type="button"
                onClick={() => setTab("editions")}
                className="text-[10px] font-bold text-indigo-700 hover:underline"
              >
                Upgrade
              </button>
            </div>
            {quotaSnapshot && (
              <div className="mt-2 space-y-1 text-[10px] text-emerald-900/90">
                <div className="flex justify-between">
                  <span>Kontak CRM</span>
                  <strong className={!quotaSnapshot.contacts.withinQuota ? "text-rose-600" : ""}>
                    {quotaSnapshot.contacts.label}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Kanal</span>
                  <strong className={!quotaSnapshot.channels.withinQuota ? "text-rose-600" : ""}>
                    {quotaSnapshot.channels.label}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Agen AI</span>
                  <strong className={!quotaSnapshot.aiAgents.withinQuota ? "text-rose-600" : ""}>
                    {quotaSnapshot.aiAgents.label}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Memuat ruang kerja bisnis...
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
            !currentTabAccess.allowed ? (
              <div className="flex flex-1 items-center justify-center bg-slate-950 p-6 text-white">
                <div className="w-full max-w-lg rounded-3xl border border-amber-500/35 bg-slate-900 p-7 text-center shadow-2xl">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
                    <Lock className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-400">
                    Hak Akses Dibatasi Sesuai Langganan &amp; Peran
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold text-white">
                    {NAV_ITEMS.find((n) => n.id === tab)?.label ?? "Modul"} Tidak Tersedia di Paket / Peran Saat Ini
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {currentTabAccess.reason}
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-left text-xs text-slate-300">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Edisi Aktif Workspace:</span>
                      <strong className="text-emerald-400">{activeEdition.name}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Peran Akun Anda:</span>
                      <strong className="uppercase text-cyan-300">{effectiveRole}</strong>
                    </div>
                    {currentTabAccess.requiredEditionName && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Minimal Edisi Dibutuhkan:</span>
                        <strong className="text-amber-300">{currentTabAccess.requiredEditionName}</strong>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap justify-center gap-2.5 text-xs">
                    {currentTabAccess.lockedByEdition && (
                      <button
                        type="button"
                        onClick={() => setTab("editions")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-slate-950 hover:bg-emerald-400"
                      >
                        <KeyRound className="h-4 w-4" />
                        Buka Edisi, Kuota &amp; Aktivasi License Key
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTab("inbox")}
                      className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      Kembali ke Inbox
                    </button>
                  </div>
                </div>
              </div>
            ) : (
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
                  onOpenPos={(orderId) => {
                    if (orderId) setHighlightOrderId(orderId);
                    setTab("pos");
                  }}
                  onToast={showToast}
                />
              )}
              {tab === "master" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <MasterDataView
                    adapter={adapter}
                    products={snapshot.products}
                    suppliers={snapshot.suppliers}
                    contacts={snapshot.contacts}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
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
              {tab === "seo_growth" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <SeoGrowthView
                    adapter={adapter}
                    storeProfile={storeProfile}
                    products={snapshot.products}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "editions" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <EditionsView
                    tenantId={adapter.tenantId}
                    workspaceName={storeProfile.businessName || snapshot.workspaceName}
                    currentEditionId={editionId}
                    activeAgentsCount={activeAiCount}
                    productsCount={snapshot.products.length}
                    channelsCount={snapshot.channels.length}
                    onSelectEdition={handleSelectEdition}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "pos" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <PosView
                    key={highlightOrderId ?? "pos-default"}
                    adapter={adapter}
                    storeProfile={storeProfile}
                    products={snapshot.products}
                    orders={snapshot.orders}
                    highlightOrderId={highlightOrderId}
                    onClearHighlight={() => setHighlightOrderId(null)}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "erp" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <ErpView
                    adapter={adapter}
                    storeProfile={storeProfile}
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
                    storeProfile={storeProfile}
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
                  onAskCompanion={triggerCompanion}
                  onToast={showToast}
                />
              )}
              {tab === "templates" && (
                <TemplatesView
                  adapter={adapter}
                  quickReplies={snapshot.quickReplies}
                  templates={snapshot.templates}
                  storeProfile={storeProfile}
                  products={snapshot.products}
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
                  storeProfile={storeProfile}
                  onSaveStoreProfile={handleSaveStoreProfile}
                  currentRole={effectiveRole}
                  members={snapshot.members}
                  onRefresh={refresh}
                  onToast={showToast}
                />
              )}
            </>
            )
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
              className={`relative flex min-w-[66px] shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-semibold transition ${
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

      {/* 24/7 PERSONAL AI COMPANION (VOICE + TEXT + CONTINUOUS MEMORY) */}
      {snapshot && (
        <AiCompanion
          adapter={adapter}
          snapshot={snapshot}
          storeProfile={storeProfile}
          activeTab={tab}
          onNavigateTab={(nextTab) => setTab(nextTab as TabId)}
          onRefresh={refresh}
          onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
          externalPrompt={companionTrigger}
        />
      )}

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
