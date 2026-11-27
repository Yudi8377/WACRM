"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  LineChart,
  Link2,
  Lock,
  LogIn,
  LogOut,
  MessageSquareHeart,
  Mic,
  QrCode,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import {
  detectClientPlatform,
  evaluateEditionQuota,
  evaluateTabAccess,
  evaluateTrialStatus,
  isAiAgentAllowedInEdition,
  revertCommercialSessionToTrial,
  startCommercialEditionTrial,
  upgradeCommercialSessionWithLicense,
  type CommercialUserSession,
  type WorkspaceTabId,
} from "@/lib/access-control";
import { authClient } from "@/lib/auth-client";
import type { AppEditionId, ContactRecord, StoreBusinessProfile } from "@/lib/crm-types";
import { editionHasFeature, getEditionById, saveTenantEdition } from "@/lib/editions";
import {
  clearLegacyUnscopedLicenseStorage,
  resolveStrictSessionEntitlement,
} from "@/lib/license-crypto";
import {
  detectUserRegionHint,
  getOrCreateSessionId,
  sendMarketSignalTelemetry,
  sendUsageTelemetry,
} from "@/lib/usage-telemetry";
import { playWarmActivationChime, primeMobileSpeechEngine } from "@/lib/warm-voice";
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
import { CommunityHubView } from "@/components/community-hub-view";
import { QrScannerStudio } from "@/components/qr-scanner-studio";
import { MarketForecastView } from "@/components/market-forecast-view";
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
  { id: "pos", label: "POS, COD & Lacak QR", shortLabel: "POS COD", icon: Receipt, group: "core" },
  { id: "qr_scanner", label: "QR Scanner & FIFO", shortLabel: "Scan QR", icon: QrCode, group: "core" },
  { id: "erp", label: "ERP & Gudang", shortLabel: "ERP", icon: Boxes, group: "core" },
  { id: "accounting", label: "Akuntansi", shortLabel: "Akuntansi", icon: BookOpenCheck, group: "core" },
  { id: "ai", label: "Multi-Agent AI", shortLabel: "AI 9x", icon: Bot, group: "core" },
  { id: "forecast", label: "Tren Minat & AI Produk", shortLabel: "Forecast", icon: LineChart, group: "core" },
  { id: "seo_growth", label: "SEO & Growth AI", shortLabel: "SEO AI", icon: TrendingUp, group: "core" },
  { id: "contacts", label: "Kontak CRM", shortLabel: "Kontak", icon: Users, group: "crm" },
  { id: "channels", label: "Kanal Omnichannel", shortLabel: "Kanal", icon: Link2, group: "crm" },
  { id: "templates", label: "Template & Cepat", shortLabel: "Template", icon: FileText, group: "crm" },
  { id: "analytics", label: "Analitik & Audit", shortLabel: "Analitik", icon: BarChart3, group: "crm" },
  { id: "community", label: "FAQ AI & Testimoni", shortLabel: "FAQ/Ulasan", icon: MessageSquareHeart, group: "platform" },
  { id: "editions", label: "Edisi & Lisensi", shortLabel: "Lisensi", icon: Layers, group: "platform" },
  { id: "settings", label: "Pengaturan", shortLabel: "Atur", icon: Settings, group: "platform" },
];

export function WorkspaceApp({
  adapter,
  accountEmail,
  commercialUser,
  onCommercialSessionUpdate,
  onSignOut,
}: {
  adapter: WorkspaceAdapter;
  accountEmail?: string | null;
  commercialUser?: CommercialUserSession | null;
  onCommercialSessionUpdate?: (next: CommercialUserSession) => void;
  onSignOut?: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("inbox");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreBusinessProfile>(() =>
    loadStoreProfile(adapter.tenantId),
  );
  const activeAccountEmail = commercialUser?.email ?? accountEmail ?? null;
  const [licenseRevision, setLicenseRevision] = useState(0);
  const [companionOpenSignal, setCompanionOpenSignal] = useState(0);
  const [compactMode, setCompactMode] = useState(false);
  const resolvedEntitlement = useMemo(() => {
    void licenseRevision;
    return resolveStrictSessionEntitlement({
      tenantId: adapter.tenantId,
      accountEmail: activeAccountEmail,
      sessionEditionId: commercialUser?.editionId,
      sessionLicenseKey: commercialUser?.licenseKey ?? null,
      sessionHasPaidLicense: commercialUser ? Boolean(commercialUser.hasPaidLicense) : undefined,
      trialEndsAt: commercialUser?.trialEndsAt ?? null,
      workspaceName: storeProfile.businessName || snapshot?.workspaceName,
    });
  }, [
    activeAccountEmail,
    adapter.tenantId,
    commercialUser,
    licenseRevision,
    snapshot?.workspaceName,
    storeProfile.businessName,
  ]);
  const editionId: AppEditionId = resolvedEntitlement.editionId;
  const licenseMaxSeats: number | null = resolvedEntitlement.licenseMaxSeats;

  useEffect(() => {
    // Scrub legacy unscoped v4 license/edition keys so old Sovereign/Enterprise keys
    // never leak into a Starter UMKM or Trial account on the same browser.
    clearLegacyUnscopedLicenseStorage(adapter.tenantId);
  }, [adapter.tenantId, activeAccountEmail]);

  // --- Real-Time Usage Telemetry Tracker (Duration, Feature, Peak Hour, Region -> Publisher HQ) ---
  const tabEnteredAtRef = useRef<number>(0);
  const trackedOrdersCountRef = useRef<number>(0);

  useEffect(() => {
    tabEnteredAtRef.current = Date.now();
    const sessionId = getOrCreateSessionId();
    const region = detectUserRegionHint(commercialUser?.city || storeProfile.address);
    const platform = commercialUser?.platform ?? detectClientPlatform();
    const email = activeAccountEmail || "guest@umkm.id";
    const business = storeProfile.businessName || commercialUser?.businessName || "";

    const flush = (useBeacon = false) => {
      const elapsedSec = Math.round((Date.now() - tabEnteredAtRef.current) / 1000);
      if (elapsedSec < 4) return;
      tabEnteredAtRef.current = Date.now();
      sendUsageTelemetry(
        {
          tenantEmail: email,
          businessName: business,
          editionId,
          platform,
          region,
          featureKey: tab,
          durationSeconds: elapsedSec,
          sessionId,
        },
        useBeacon,
      );
    };

    // Initial ping after 8s so even short visits record feature & hour telemetry
    const initTimer = window.setTimeout(() => flush(false), 8_000);
    const heartbeat = window.setInterval(() => flush(false), 45_000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    window.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(heartbeat);
      window.removeEventListener("visibilitychange", onVisibility);
      flush(true);
    };
  }, [
    activeAccountEmail,
    commercialUser?.businessName,
    commercialUser?.city,
    commercialUser?.platform,
    editionId,
    storeProfile.address,
    storeProfile.businessName,
    tab,
  ]);

  // Stream anonymized economic/market trend signals when new POS orders are recorded
  useEffect(() => {
    if (!snapshot) return;
    if (trackedOrdersCountRef.current === 0) {
      trackedOrdersCountRef.current = snapshot.orders.length;
      return;
    }
    if (snapshot.orders.length > trackedOrdersCountRef.current) {
      const newest = snapshot.orders[0];
      trackedOrdersCountRef.current = snapshot.orders.length;
      if (newest) {
        const firstItem = newest.items[0];
        const prod = snapshot.products.find((p) => p.id === firstItem?.productId);
        const totalUnits = newest.items.reduce((s, it) => s + (it.quantity || 1), 0);
        const payRaw = (newest.paymentMethod || "qris").toLowerCase();
        const paymentMethod = payRaw.includes("qris")
          ? "qris"
          : payRaw.includes("cod")
            ? "cod"
            : payRaw.includes("tunai") || payRaw.includes("cash")
              ? "cash"
              : "transfer";
        sendMarketSignalTelemetry({
          tenantEmail: activeAccountEmail || "",
          region: detectUserRegionHint(commercialUser?.city || storeProfile.address),
          productCategory: prod?.category || "UMKM Umum",
          productName: firstItem?.productName || "Produk UMKM",
          avgPriceIdr: firstItem?.unitPrice || newest.totalAmount,
          unitsSold: Math.max(1, totalUnits),
          orderValueIdr: newest.totalAmount,
          paymentMethod,
          channel: newest.conversationId ? "whatsapp" : "pos",
          repeatBuyer: snapshot.orders.filter((o) => o.customerPhone === newest.customerPhone).length > 1,
        });
      }
    }
  }, [activeAccountEmail, commercialUser?.city, snapshot, storeProfile.address]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const [pendingPosSku, setPendingPosSku] = useState<string | null>(null);
  const [pendingQrProductSku, setPendingQrProductSku] = useState<string | null>(null);
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

  function handleSelectEdition(
    nextEdition: AppEditionId,
    verifiedLicenseKey?: string,
    maxSeats?: number,
  ) {
    void maxSeats;
    saveTenantEdition(adapter.tenantId, nextEdition);
    if (verifiedLicenseKey) {
      if (commercialUser) {
        const upgraded = upgradeCommercialSessionWithLicense(
          commercialUser,
          nextEdition,
          verifiedLicenseKey,
        );
        onCommercialSessionUpdate?.(upgraded);
      }
    } else if (nextEdition === "starter" && commercialUser) {
      const reverted = revertCommercialSessionToTrial(commercialUser);
      onCommercialSessionUpdate?.(reverted);
    }
    setLicenseRevision((r) => r + 1);
    const ed = getEditionById(nextEdition);
    showToast(
      verifiedLicenseKey
        ? `Lisensi resmi ${ed.name} berhasil diaktifkan! Seluruh menu, kuota & fitur otomatis disesuaikan dengan Matriks Edisi.`
        : `Edisi workspace aktif diubah ke ${ed.name} (${ed.badge}).`,
    );
  }

  function handleStartEditionTrial(targetEdition: "pro" | "enterprise") {
    if (!commercialUser) {
      showToast("Silakan masuk akun terlebih dahulu untuk mengaktifkan Trial gratis.", "error");
      setTab("editions");
      return;
    }
    const res = startCommercialEditionTrial(commercialUser, targetEdition);
    if (!res.ok) {
      showToast(res.error || "Trial edisi ini sudah pernah digunakan pada akun ini.", "error");
      setTab("editions");
      return;
    }
    saveTenantEdition(adapter.tenantId, targetEdition);
    onCommercialSessionUpdate?.(res.session);
    setLicenseRevision((r) => r + 1);
    const edName = getEditionById(targetEdition).name;
    showToast(
      `Selamat! Trial Gratis ${res.trialDays} Hari ${edName} aktif sekarang. Setelah ${res.trialDays} hari tanpa License Key, akun otomatis kembali ke Starter UMKM (Gratis Selamanya).`,
    );
  }

  function handleClearLicense() {
    saveTenantEdition(adapter.tenantId, "starter");
    clearLegacyUnscopedLicenseStorage(adapter.tenantId);
    if (commercialUser) {
      const reverted = revertCommercialSessionToTrial(commercialUser);
      onCommercialSessionUpdate?.(reverted);
    }
    setLicenseRevision((r) => r + 1);
  }

  const activeEdition = useMemo(() => getEditionById(editionId), [editionId]);
  const effectiveRole = commercialUser?.role ?? snapshot?.currentRole ?? "owner";
  const trialStatus = useMemo(() => evaluateTrialStatus(commercialUser), [commercialUser]);

  const currentTabAccess = useMemo(
    () => evaluateTabAccess(editionId, effectiveRole, tab),
    [editionId, effectiveRole, tab],
  );
  // Starter UMKM is FREE FOREVER; expired Pro/Enterprise trials gracefully fall back to Starter UMKM (never locked out!)
  const isPreviewRestricted = !currentTabAccess.allowed;

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
  const activeAiCount =
    snapshot?.aiAgents.filter(
      (a) => a.enabled && isAiAgentAllowedInEdition(editionId, a.agentKey),
    ).length ?? 0;
  const voiceCompanionUnlocked = editionHasFeature(editionId, "voice_companion_24_7");
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
            onClick={() => {
              setCompactMode((prev) => {
                const next = !prev;
                showToast(
                  next
                    ? "Mode Ringkas UMKM Aktif — hanya menampilkan 5 menu inti harian agar cepat & tidak ribet!"
                    : "Mode Lengkap Enterprise Aktif — seluruh modul ditampilkan.",
                );
                return next;
              });
            }}
            className={`hidden items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition md:inline-flex ${
              compactMode
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title="Saklar tampilan Mode Ringkas UMKM vs Mode Lengkap Enterprise"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>{compactMode ? "Mode Ringkas" : "Ringkas"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              primeMobileSpeechEngine();
              playWarmActivationChime();
              setCompanionOpenSignal((s) => s + 1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition ${
              voiceCompanionUnlocked
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-emerald-400 shadow-xs hover:from-emerald-600 hover:to-teal-600"
                : "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100"
            }`}
            title="Buka Asisten Pribadi & Pemandu Suara AI 24/7 (Suara Ramah & Hangat)"
          >
            {voiceCompanionUnlocked ? (
              <Mic className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-emerald-600" />
            )}
            <span className="hidden sm:inline">
              {voiceCompanionUnlocked ? "Asisten Suara 24/7" : "Asisten Suara AI"}
            </span>
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
                {NAV_ITEMS.filter((n) =>
                  compactMode
                    ? ["inbox", "pos", "erp", "qr_scanner", "community", "settings"].includes(n.id)
                    : n.group === "core",
                ).map((item) => {
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                          <Lock className="h-2.5 w-2.5" />
                          {access.requiredEditionId === "pro"
                            ? "Pro"
                            : access.requiredEditionId === "enterprise"
                              ? "Ent"
                              : "Sov"}
                        </span>
                      ) : item.id === "inbox" && (unreadTotal > 0 || escalationTotal > 0) ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                            escalationTotal > 0 ? "bg-amber-600" : "bg-emerald-600"
                          }`}
                        >
                          {escalationTotal > 0 ? `${escalationTotal}!` : unreadTotal}
                        </span>
                      ) : item.id === "ai" ? (
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                          {activeEdition.limits.maxAiAgents}/9 AI
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

            {!compactMode && (
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
                      {!access.allowed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                          <Lock className="h-2.5 w-2.5" />
                          {access.requiredEditionId === "pro" ? "Pro" : "Ent"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            <div>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Platform &amp; Edisi v5.0
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
          {/* EDITION & TRIAL STATUS BANNER (Starter UMKM = Free Forever; Pro = 14d Trial; Enterprise = 7d Trial) */}
          {commercialUser && !resolvedEntitlement.isLicensed && (
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs ${
                trialStatus.isTrial && !trialStatus.isExpired
                  ? "border-cyan-500/40 bg-slate-900 text-cyan-100"
                  : trialStatus.isExpired
                    ? "border-amber-500/40 bg-amber-950/95 text-amber-100"
                    : "border-emerald-500/30 bg-emerald-950/95 text-emerald-100"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-300">
                  {trialStatus.isTrial && !trialStatus.isExpired
                    ? `Trial ${trialStatus.totalTrialDays} Hari · ${activeEdition.name}`
                    : "Starter UMKM · Gratis Selamanya"}
                </span>
                <span className="font-semibold">{trialStatus.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {editionId === "starter" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEditionTrial("pro")}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-2.5 py-1 text-[11px] font-extrabold text-slate-950 hover:bg-cyan-400"
                    >
                      <Sparkles className="h-3 w-3" /> Trial 14h Growth Pro
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEditionTrial("enterprise")}
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-violet-400"
                    >
                      <Sparkles className="h-3 w-3" /> Trial 7h Enterprise
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setTab("editions")}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  <KeyRound className="h-3.5 w-3.5" /> License Key
                </button>
              </div>
            </div>
          )}

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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* PREVIEW-ONLY BANNER WHEN MODULE IS ABOVE ACTIVE EDITION */}
              {isPreviewRestricted && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-slate-900 px-4 py-3 text-xs text-white">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-amber-300">
                        Mode Pratinjau Tampilan — Tombol Aksi Dibatasi ({activeEdition.name})
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-300">
                        {currentTabAccess.reason ||
                          `Modul ini membutuhkan minimal edisi ${currentTabAccess.requiredEditionName}. Coba gratis dengan Trial atau aktifkan License Key untuk membuka seluruh tombol & otomatisasi.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentTabAccess.requiredEditionId === "pro" && (
                      <button
                        type="button"
                        onClick={() => handleStartEditionTrial("pro")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Coba Gratis 14 Hari Pro
                      </button>
                    )}
                    {currentTabAccess.requiredEditionId === "enterprise" && (
                      <button
                        type="button"
                        onClick={() => handleStartEditionTrial("enterprise")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-400"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Coba Gratis 7 Hari Enterprise
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTab("editions")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Buka dengan License Key
                    </button>
                  </div>
                </div>
              )}

              <div
                aria-disabled={isPreviewRestricted || undefined}
                data-preview-locked={isPreviewRestricted ? "true" : "false"}
                className={`relative flex min-h-0 flex-1 flex-col ${
                  isPreviewRestricted ? "overflow-y-auto select-none" : "overflow-hidden"
                }`}
              >
                <div
                  className={`flex min-h-0 flex-1 flex-col ${
                    isPreviewRestricted ? "pointer-events-none opacity-85" : "overflow-hidden"
                  }`}
                >
              {tab === "inbox" && (
                <InboxView
                  key={activeConversationId ?? "default-inbox"}
                  adapter={adapter}
                  editionId={editionId}
                  conversations={snapshot.conversations}
                  contacts={snapshot.contacts}
                  channels={snapshot.channels}
                  quickReplies={snapshot.quickReplies}
                  members={snapshot.members}
                  initialConversationId={activeConversationId}
                  onUpgradeRequest={() => setTab("editions")}
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
                    onOpenQrGenerator={(sku) => {
                      if (editionHasFeature(editionId, "qr_camera_fifo_scanner")) {
                        setPendingQrProductSku(sku ?? null);
                        setTab("qr_scanner");
                      } else {
                        setTab("editions");
                        showToast(
                          "Aktifkan Uji Coba Gratis Pro 14 Hari untuk menggunakan Generator & Scanner QR Barang Datang.",
                          "error",
                        );
                      }
                    }}
                  />
                </div>
              )}
              {tab === "ai" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <AiAgentsView
                    adapter={adapter}
                    editionId={editionId}
                    agents={snapshot.aiAgents}
                    knowledge={snapshot.aiKnowledge}
                    incidents={snapshot.aiIncidents}
                    onUpgradeRequest={() => setTab("editions")}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "seo_growth" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <SeoGrowthView
                    adapter={adapter}
                    editionId={editionId}
                    storeProfile={storeProfile}
                    onUpdateStoreProfile={handleSaveStoreProfile}
                    products={snapshot.products}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "community" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <CommunityHubView
                    editionId={editionId}
                    accountEmail={activeAccountEmail}
                    displayName={commercialUser?.displayName}
                    businessName={storeProfile.businessName || snapshot.workspaceName}
                    defaultCity={commercialUser?.city || storeProfile.address}
                    onNavigateTab={(nextTab) => setTab(nextTab as TabId)}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "editions" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <EditionsView
                    key={`${adapter.tenantId}-${activeAccountEmail ?? "anon"}-${editionId}`}
                    tenantId={adapter.tenantId}
                    accountEmail={activeAccountEmail}
                    workspaceName={storeProfile.businessName || snapshot.workspaceName}
                    currentEditionId={editionId}
                    activeLicense={resolvedEntitlement.activeLicense}
                    isTrialActive={resolvedEntitlement.isTrialActive}
                    trialEndsAt={resolvedEntitlement.trialEndsAt}
                    usedTrialEditions={commercialUser?.usedTrialEditions}
                    activeAgentsCount={activeAiCount}
                    membersCount={snapshot.members.length}
                    contactsCount={snapshot.contacts.length}
                    productsCount={snapshot.products.length}
                    channelsCount={snapshot.channels.length}
                    onSelectEdition={handleSelectEdition}
                    onStartTrial={handleStartEditionTrial}
                    onClearLicense={handleClearLicense}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "pos" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <PosView
                    key={`${highlightOrderId ?? "pos"}-${pendingPosSku ?? "none"}`}
                    adapter={adapter}
                    editionId={editionId}
                    storeProfile={storeProfile}
                    products={snapshot.products}
                    orders={snapshot.orders}
                    highlightOrderId={highlightOrderId}
                    onClearHighlight={() => setHighlightOrderId(null)}
                    initialScannedSku={pendingPosSku}
                    onClearScannedSku={() => setPendingPosSku(null)}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "qr_scanner" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <QrScannerStudio
                    key={pendingQrProductSku ?? "qr-default"}
                    tenantId={adapter.tenantId}
                    products={snapshot.products}
                    suppliers={snapshot.suppliers}
                    orders={snapshot.orders}
                    storeProfile={storeProfile}
                    initialProductSku={pendingQrProductSku}
                    onClearInitialProductSku={() => setPendingQrProductSku(null)}
                    onCreateProduct={async (input) => {
                      const created = await adapter.createProduct(input);
                      await refresh();
                      return created;
                    }}
                    onAdjustProductStock={async (productId, newStockQty, note) => {
                      await adapter.updateProduct(productId, {
                        stockQty: newStockQty,
                        stockReason: note,
                      });
                      await refresh();
                    }}
                    onRecordAccountingEntry={async (entry) => {
                      const amount = Math.max(entry.debit, entry.credit);
                      if (amount > 0) {
                        await adapter.createAccountingEntry({
                          kind:
                            entry.accountType === "revenue"
                              ? "income"
                              : entry.accountType === "equity"
                                ? "capital"
                                : "expense",
                          categoryName: entry.accountName,
                          amount,
                          description: entry.description,
                        });
                        await refresh();
                      }
                    }}
                    onOpenPosWithSku={(sku) => {
                      setPendingPosSku(sku);
                      setTab("pos");
                    }}
                    onOpenMasterData={() => setTab("master")}
                    onNotify={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "forecast" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <MarketForecastView
                    editionId={editionId}
                    products={snapshot.products}
                    orders={snapshot.orders}
                    conversations={snapshot.conversations}
                    storeProfile={storeProfile}
                    onOpenEditions={() => setTab("editions")}
                    onNotify={(msg) => showToast(msg, "success")}
                  />
                </div>
              )}
              {tab === "erp" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <ErpView
                    adapter={adapter}
                    editionId={editionId}
                    storeProfile={storeProfile}
                    products={snapshot.products}
                    orders={snapshot.orders}
                    suppliers={snapshot.suppliers}
                    movements={snapshot.stockMovements}
                    onOpenQrGenerator={(sku) => {
                      if (editionHasFeature(editionId, "qr_camera_fifo_scanner")) {
                        setPendingQrProductSku(sku ?? null);
                        setTab("qr_scanner");
                      } else {
                        setTab("editions");
                        showToast(
                          "Aktifkan Uji Coba Gratis Pro 14 Hari untuk menggunakan Generator & Scanner QR Barang Datang.",
                          "error",
                        );
                      }
                    }}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "accounting" && (
                <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
                  <AccountingView
                    adapter={adapter}
                    editionId={editionId}
                    storeProfile={storeProfile}
                    entries={snapshot.accountingEntries}
                    orders={snapshot.orders}
                    products={snapshot.products}
                    report={snapshot.financialReport}
                    onRefresh={refresh}
                    onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
                  />
                </div>
              )}
              {tab === "contacts" && (
                <ContactsView
                  adapter={adapter}
                  editionId={editionId}
                  businessName={storeProfile.businessName || snapshot.workspaceName}
                  contacts={snapshot.contacts}
                  orders={snapshot.orders}
                  onUpgradeRequest={() => setTab("editions")}
                  onRefresh={refresh}
                  onStartChat={handleStartChat}
                  onToast={showToast}
                />
              )}
              {tab === "channels" && (
                <ChannelsView
                  adapter={adapter}
                  editionId={editionId}
                  channels={snapshot.channels}
                  onUpgradeRequest={() => setTab("editions")}
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
              {tab === "analytics" && (
                <AnalyticsView
                  analytics={snapshot.analytics}
                  editionId={editionId}
                  onUpgradeRequest={() => setTab("editions")}
                />
              )}
              {tab === "settings" && (
                <SettingsView
                  adapter={adapter}
                  editionId={editionId}
                  licenseMaxSeats={licenseMaxSeats}
                  commercialUser={commercialUser}
                  workspaceName={snapshot.workspaceName}
                  workspaceSlug={snapshot.workspaceSlug}
                  storeProfile={storeProfile}
                  onSaveStoreProfile={handleSaveStoreProfile}
                  onUpgradeRequest={() => setTab("editions")}
                  currentRole={effectiveRole}
                  members={snapshot.members}
                  onRefresh={refresh}
                  onToast={showToast}
                />
              )}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* MOBILE / ANDROID SCROLLABLE BOTTOM NAVIGATION BAR */}
      <nav className="safe-bottom flex overflow-x-auto border-t border-slate-200 bg-white md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          const access = evaluateTabAccess(editionId, effectiveRole, item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative flex min-w-[66px] shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-semibold transition ${
                active
                  ? "bg-emerald-50/70 text-emerald-700"
                  : access.allowed
                    ? "text-slate-500"
                    : "text-slate-400"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="truncate">{item.shortLabel}</span>
              {!access.allowed && (
                <span className="absolute right-1.5 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              )}
              {access.allowed && item.id === "inbox" && unreadTotal > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                  {unreadTotal}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 24/7 PERSONAL AI COMPANION (WARM HUMAN VOICE + TEXT + CONTINUOUS MEMORY) */}
      {snapshot && (
        <AiCompanion
          adapter={adapter}
          editionId={editionId}
          userName={commercialUser?.displayName}
          snapshot={snapshot}
          storeProfile={storeProfile}
          activeTab={tab}
          onNavigateTab={(nextTab) => setTab(nextTab as TabId)}
          onUpgradeRequest={() => setTab("editions")}
          onStartEnterpriseTrial={() => handleStartEditionTrial("enterprise")}
          onRefresh={refresh}
          onToast={(msg, tone) => showToast(msg, tone === "error" ? "error" : "success")}
          externalPrompt={companionTrigger}
          externalOpenSignal={companionOpenSignal}
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
