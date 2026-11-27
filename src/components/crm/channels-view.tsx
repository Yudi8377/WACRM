"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Lock,
  Mic,
  Plus,
  Power,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { evaluateEditionQuota } from "@/lib/access-control";
import { CHANNEL_META, type AppEditionId, type ChannelRecord, type ChannelType } from "@/lib/crm-types";
import { getEditionById } from "@/lib/editions";
import {
  cleanMetaAccessToken,
  diagnoseMetaWhatsAppDraft,
  META_QUICK_LINKS,
  normalizeWhatsAppPhoneNumber,
  parseMetaWhatsAppPaste,
} from "@/lib/meta-whatsapp-helper";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface ChannelsViewProps {
  adapter: WorkspaceAdapter;
  editionId?: AppEditionId;
  channels: ChannelRecord[];
  onUpgradeRequest?: () => void;
  onRefresh: () => Promise<void>;
  onAskCompanion?: (prompt: string, speakImmediately?: boolean) => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

export function ChannelsView({
  adapter,
  editionId = "starter",
  channels,
  onUpgradeRequest,
  onRefresh,
  onAskCompanion,
  onToast,
}: ChannelsViewProps) {
  const activeEdition = getEditionById(editionId);
  const connectedCount = channels.filter((c) => c.status === "connected").length;
  const channelQuota = evaluateEditionQuota(editionId, "channels", connectedCount);
  const [modalMode, setModalMode] = useState<"none" | "meta_whatsapp" | "custom">("none");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Meta Official WhatsApp Guided Wizard state
  const [waWizardTab, setWaWizardTab] = useState<"meta_official" | "quick_phone">("meta_official");
  const [smartPasteInput, setSmartPasteInput] = useState("");
  const [smartPasteNote, setSmartPasteNote] = useState<string | null>(null);
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [showMetaToken, setShowMetaToken] = useState(false);

  // Quick WhatsApp Mode (10-second UMKM phone onboarding without Meta Business Manager)
  const [quickWaName, setQuickWaName] = useState("");
  const [quickWaPhone, setQuickWaPhone] = useState("");
  const [quickWaGatewayUrl, setQuickWaGatewayUrl] = useState("");
  const [quickWaGatewayKey, setQuickWaGatewayKey] = useState("");

  const metaDiagnosis = useMemo(
    () => diagnoseMetaWhatsAppDraft({ wabaId, phoneNumberId, accessToken: metaToken }),
    [metaToken, phoneNumberId, wabaId],
  );

  function handleSmartPasteChange(raw: string) {
    setSmartPasteInput(raw);
    if (!raw.trim()) {
      setSmartPasteNote(null);
      return;
    }
    const parsed = parseMetaWhatsAppPaste(raw);
    if (parsed.wabaId) setWabaId(parsed.wabaId);
    if (parsed.phoneNumberId) setPhoneNumberId(parsed.phoneNumberId);
    if (parsed.accessToken) setMetaToken(parsed.accessToken);
    setSmartPasteNote(parsed.summary);
  }

  // Custom / Evolution / Omnichannel form
  const [channelType, setChannelType] = useState<ChannelType>("whatsapp");
  const [provider, setProvider] = useState<"meta_cloud" | "evolution_api" | "tiktok_api" | "youtube_api" | "manual">("evolution_api");
  const [displayName, setDisplayName] = useState("");
  const [externalAccountId, setExternalAccountId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://wacrm.vercel.app";
  const webhookUrl = `${origin}/api/webhooks/meta`;

  function copyWebhook() {
    navigator.clipboard?.writeText(webhookUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }

  async function handleConnectMeta(e: FormEvent) {
    e.preventDefault();
    if (!channelQuota.canAddMore) {
      onToast(
        `Kuota kanal aktif edisi ${activeEdition.name} penuh (${connectedCount}/${channelQuota.limit} kanal). Upgrade dengan License Key untuk menambah kanal omnichannel.`,
        "error",
      );
      onUpgradeRequest?.();
      return;
    }
    const cleanWaba = wabaId.replace(/\D/g, "");
    const cleanPhoneId = phoneNumberId.replace(/\D/g, "");
    const cleanToken = cleanMetaAccessToken(metaToken);
    if (!/^\d{5,30}$/.test(cleanWaba) || !/^\d{5,30}$/.test(cleanPhoneId)) {
      onToast(
        "WABA ID dan Phone Number ID harus berupa angka 5–30 digit dari halaman Meta API Setup.",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      const res = await adapter.connectMetaWhatsApp({
        wabaId: cleanWaba,
        phoneNumberId: cleanPhoneId,
        accessToken: cleanToken,
      });
      setWabaId("");
      setPhoneNumberId("");
      setMetaToken("");
      setSmartPasteInput("");
      setSmartPasteNote(null);
      setModalMode("none");
      await onRefresh();
      onToast(`WhatsApp Meta berhasil terhubung: ${res.displayName}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Validasi Meta WhatsApp gagal.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickConnectWhatsApp(e: FormEvent) {
    e.preventDefault();
    if (!channelQuota.canAddMore) {
      onToast(
        `Kuota kanal aktif edisi ${activeEdition.name} penuh (${connectedCount}/${channelQuota.limit} kanal). Upgrade dengan License Key untuk menambah kanal.`,
        "error",
      );
      onUpgradeRequest?.();
      return;
    }
    const normalizedPhone = normalizeWhatsAppPhoneNumber(quickWaPhone);
    if (normalizedPhone.length < 9) {
      onToast("Masukkan nomor WhatsApp aktif yang valid (contoh: 0812-3456-7890).", "error");
      return;
    }
    setSaving(true);
    try {
      const usingGateway = Boolean(quickWaGatewayUrl.trim());
      await adapter.createChannel({
        channel: "whatsapp",
        provider: usingGateway ? "evolution_api" : "manual",
        displayName: quickWaName.trim() || `WhatsApp ${normalizedPhone}`,
        externalAccountId: normalizedPhone,
        baseUrl: quickWaGatewayUrl.trim() || undefined,
        accessToken: quickWaGatewayKey.trim() || undefined,
        status: "connected",
      });
      setQuickWaName("");
      setQuickWaPhone("");
      setQuickWaGatewayUrl("");
      setQuickWaGatewayKey("");
      setModalMode("none");
      await onRefresh();
      onToast(`WhatsApp Cepat (+${normalizedPhone}) langsung aktif & siap dipakai!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengaktifkan WhatsApp Cepat.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCustom(e: FormEvent) {
    e.preventDefault();
    if (!channelQuota.canAddMore) {
      onToast(
        `Kuota kanal aktif edisi ${activeEdition.name} penuh (${connectedCount}/${channelQuota.limit} kanal). Upgrade dengan License Key untuk membuka lebih banyak kanal.`,
        "error",
      );
      onUpgradeRequest?.();
      return;
    }
    setSaving(true);
    try {
      await adapter.createChannel({
        channel: channelType,
        provider,
        displayName,
        externalAccountId,
        baseUrl: baseUrl || undefined,
        instanceName: instanceName || undefined,
        accessToken: accessToken || undefined,
      });
      setDisplayName("");
      setExternalAccountId("");
      setBaseUrl("");
      setInstanceName("");
      setAccessToken("");
      setModalMode("none");
      await onRefresh();
      onToast("Koneksi kanal berhasil disimpan.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan kanal.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ch: ChannelRecord) {
    const nextStatus = ch.status === "connected" ? "disabled" : "connected";
    if (nextStatus === "connected" && !channelQuota.canAddMore) {
      onToast(
        `Batas maksimal ${channelQuota.limit} kanal aktif untuk edisi ${activeEdition.name} sudah tercapai. Nonaktifkan 1 kanal lain atau upgrade License Key.`,
        "error",
      );
      onUpgradeRequest?.();
      return;
    }
    try {
      await adapter.updateChannel(ch.id, { status: nextStatus });
      await onRefresh();
      onToast(`Status kanal diubah menjadi ${nextStatus}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengubah status kanal.", "error");
    }
  }

  async function handleDelete(ch: ChannelRecord) {
    if (!window.confirm(`Putuskan dan hapus koneksi "${ch.displayName}"?`)) return;
    try {
      await adapter.deleteChannel(ch.id);
      await onRefresh();
      onToast("Koneksi kanal dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus kanal.", "error");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Koneksi Kanal Omnichannel</h2>
            <p className="text-sm text-slate-500">
              Kelola WhatsApp Cloud API (Meta), Evolution API (opsional), Instagram, Messenger, TikTok, dan YouTube.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!channelQuota.canAddMore) {
                  onToast(
                    `Kuota ${channelQuota.limit} kanal aktif pada ${activeEdition.name} sudah penuh. Upgrade License Key untuk menambah kanal.`,
                    "error",
                  );
                  onUpgradeRequest?.();
                  return;
                }
                setModalMode("meta_whatsapp");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              {channelQuota.canAddMore ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Hubungkan Meta WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                if (!channelQuota.canAddMore) {
                  onToast(
                    `Kuota ${channelQuota.limit} kanal aktif pada ${activeEdition.name} sudah penuh. Upgrade License Key untuk menambah kanal.`,
                    "error",
                  );
                  onUpgradeRequest?.();
                  return;
                }
                setModalMode("custom");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {channelQuota.canAddMore ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Tambah Kanal / Evolution API
            </button>
          </div>
        </div>

        {/* Edition Channel Quota Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs">
          <div>
            <span className="font-bold text-slate-800">
              Kuota Kanal Edisi {activeEdition.name}:{" "}
              <span className={channelQuota.canAddMore ? "text-emerald-700" : "text-amber-700"}>
                {connectedCount} / {channelQuota.isUnlimited ? "∞ Unlimited" : `${channelQuota.limit} kanal aktif`}
              </span>
            </span>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {editionId === "starter"
                ? "Starter UMKM mencakup WhatsApp + 1 kanal media sosial (maks 2 kanal aktif). Upgrade ke Growth Pro untuk 5 kanal omnichannel penuh."
                : editionId === "pro"
                  ? "Growth Pro mendukung 5 kanal omnichannel (WA, IG, Messenger, TikTok, YouTube). Enterprise mendukung hingga 20 kanal."
                  : "Lisensi Anda mendukung ekspansi kanal omnichannel skala besar."}
            </p>
          </div>
          {!channelQuota.canAddMore && onUpgradeRequest && (
            <button
              type="button"
              onClick={onUpgradeRequest}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
            >
              <KeyRound className="h-3.5 w-3.5" /> Upgrade Kuota Kanal
            </button>
          )}
        </div>

        {/* Webhook Info Card */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Webhook Callback Resmi (Meta Cloud API)</p>
              <p className="mt-1 font-mono text-xs text-emerald-950 break-all">{webhookUrl}</p>
            </div>
            <button
              type="button"
              onClick={copyWebhook}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedUrl ? "Tersalin" : "Salin URL"}
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-800/80">
            Token akses selalu dienkripsi di server menggunakan AES-256-GCM (<code className="font-mono">APP_ENCRYPTION_KEY</code>) dan tidak pernah dikirim kembali ke browser.
          </p>
        </div>

        {/* Channel Cards */}
        {channels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Link2 className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Belum ada koneksi kanal</p>
            <p className="mt-1 text-xs text-slate-500">Hubungkan WhatsApp Business Cloud API atau tambahkan kanal omnichannel lainnya.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((ch) => {
              const meta = CHANNEL_META[ch.channel];
              const isConnected = ch.status === "connected";
              return (
                <article key={ch.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.shortLabel.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{ch.displayName}</h3>
                        <p className="text-xs text-slate-500">{meta.label}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        isConnected
                          ? "bg-emerald-100 text-emerald-800"
                          : ch.status === "disabled"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isConnected ? "Terhubung" : ch.status === "disabled" ? "Nonaktif" : "Menunggu Setup"}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                      <dt className="text-slate-400">Account / Phone ID</dt>
                      <dd className="font-mono font-semibold text-slate-700 truncate">{ch.externalAccountId}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Provider</dt>
                      <dd className="font-semibold text-slate-700">{String(ch.metadata?.provider ?? "meta_cloud")}</dd>
                    </div>
                  </dl>

                  {ch.scopes.length > 0 && (
                    <p className="mt-2.5 text-[11px] text-slate-500">Izin: {ch.scopes.join(", ")}</p>
                  )}

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(ch)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Power className="h-3.5 w-3.5" />
                      {isConnected ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ch)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      title="Hapus kanal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* SUPER-EASY META WHATSAPP GUIDED WIZARD MODAL */}
      {modalMode === "meta_whatsapp" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  <Sparkles className="h-3 w-3" /> Wizard 60 Detik · Anti-Ribet
                </div>
                <h3 className="mt-1 text-base font-extrabold text-slate-900">
                  Hubungkan WhatsApp ke WACRM
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih Meta Cloud API Resmi (auto-isi 1 klik) atau Mode Cepat Nomor WA HP Biasa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 2 Clear Mode Switcher Tabs */}
            <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setWaWizardTab("meta_official")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition ${
                  waWizardTab === "meta_official"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Meta Cloud API Resmi
              </button>
              <button
                type="button"
                onClick={() => setWaWizardTab("quick_phone")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition ${
                  waWizardTab === "quick_phone"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Cepat: Nomor WA HP
              </button>
            </div>

            {waWizardTab === "meta_official" ? (
              <div className="mt-4 space-y-4">
                {/* STEP 1: Direct 1-Click Links to Meta */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-emerald-950">
                      Langkah 1 · Buka Meta API Setup (1 Klik)
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Gratis 1.000 chat/bln
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/80">
                    Buka aplikasi Anda di Meta Developers → klik menu <strong>WhatsApp → API Setup</strong>. Di sana langsung terlihat <strong>Token</strong>, <strong>Phone Number ID</strong>, <strong>WABA ID</strong>, dan kotak kode <strong>cURL</strong>.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <a
                      href={META_QUICK_LINKS.developersApps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-xs hover:bg-emerald-700"
                    >
                      Buka Meta Developers <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={META_QUICK_LINKS.systemUsers}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      Token Permanen (System User) <ExternalLink className="h-3 w-3" />
                    </a>
                    {onAskCompanion && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskCompanion(
                            "Pandu saya langkah demi langkah mengisi WABA ID, Phone Number ID, dan System User Access Token untuk Hubungkan WhatsApp Cloud API Meta",
                            true,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Mic className="h-3 w-3" /> Panduan Suara AI
                      </button>
                    )}
                  </div>
                </div>

                {/* STEP 2: Smart Auto-Fill Paste Box */}
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-3.5">
                  <label className="block text-xs font-extrabold text-cyan-950">
                    <span className="inline-flex items-center gap-1.5">
                      <Wand2 className="h-3.5 w-3.5 text-cyan-600" />
                      Langkah 2 · Tempel Otomatis dari Meta (Opsional — Hemat Waktu!)
                    </span>
                    <textarea
                      rows={2}
                      value={smartPasteInput}
                      onChange={(e) => handleSmartPasteChange(e.target.value)}
                      placeholder="Cukup Copy-Paste kode curl dari halaman Meta API Setup ke sini → Phone Number ID & Token langsung terisi otomatis!"
                      className="mt-1.5 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                  {smartPasteNote && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-cyan-900">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {smartPasteNote}
                    </p>
                  )}
                </div>

                {/* STEP 3: Clean Guided Form */}
                <form onSubmit={handleConnectMeta} className="space-y-3">
                  <p className="text-xs font-extrabold text-slate-800">
                    Langkah 3 · Cek 3 Data &amp; Klik Hubungkan
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Phone Number ID
                      <input
                        required
                        inputMode="numeric"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value.replace(/\s+/g, ""))}
                        placeholder="15 digit (mis. 112233445566778)"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      WABA ID (Business Account ID)
                      <input
                        required
                        inputMode="numeric"
                        value={wabaId}
                        onChange={(e) => setWabaId(e.target.value.replace(/\s+/g, ""))}
                        placeholder="15 digit (mis. 109876543210987)"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-semibold text-slate-700">
                    Access Token Meta (Temporary / Permanent System User)
                    <div className="relative mt-1">
                      <input
                        required
                        type={showMetaToken ? "text" : "password"}
                        minLength={10}
                        value={metaToken}
                        onChange={(e) => setMetaToken(e.target.value)}
                        placeholder="Tempel token EAA... di sini"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMetaToken((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        title={showMetaToken ? "Sembunyikan token" : "Lihat token"}
                      >
                        {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  {metaDiagnosis.warnings.length > 0 && (
                    <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] font-medium text-amber-900">
                      {metaDiagnosis.warnings.map((w) => (
                        <p key={w} className="flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span>{w}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Built-in Webhook Copy Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        Callback Webhook URL (Tempel di Meta Configuration)
                      </p>
                      <p className="truncate font-mono text-[11px] text-slate-800">{webhookUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyWebhook}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {copiedUrl ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedUrl ? "Tersalin" : "Salin"}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Token otomatis dibersihkan (jika tersalin dengan awalan &quot;Bearer&quot;), diverifikasi ke Graph API Meta, lalu dienkripsi AES-256-GCM di server.
                  </p>

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setModalMode("none")}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {saving ? "Memverifikasi ke Meta..." : "Validasi & Hubungkan Meta WA"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* QUICK MODE: 10-Second UMKM Phone Number Onboarding */
              <form onSubmit={handleQuickConnectWhatsApp} className="mt-4 space-y-3.5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-amber-600" />
                    Belum sempat daftar Meta Business? Pakai Mode Cepat 10 Detik!
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-900/85">
                    Cukup masukkan <strong>Nomor WhatsApp HP Toko</strong> Anda. Kanal WhatsApp langsung aktif untuk katalog, Link WA, kirim struk POS, dan CRM — nanti bisa beralih ke Meta Cloud API kapan saja.
                  </p>
                </div>

                <label className="block text-xs font-semibold text-slate-700">
                  Nama Toko / Nomor WhatsApp CS
                  <input
                    required
                    value={quickWaName}
                    onChange={(e) => setQuickWaName(e.target.value)}
                    placeholder="Contoh: WhatsApp CS Toko Berkah"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Nomor WhatsApp Aktif
                  <input
                    required
                    inputMode="tel"
                    value={quickWaPhone}
                    onChange={(e) => setQuickWaPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  {quickWaPhone.trim() && (
                    <span className="mt-1 block text-[11px] text-emerald-700">
                      Format internasional otomatis: +{normalizeWhatsAppPhoneNumber(quickWaPhone)}
                    </span>
                  )}
                </label>

                <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-700">
                    Opsional: Sambungkan Gateway WA QR (Evolution API)
                  </summary>
                  <div className="mt-2.5 space-y-2.5">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      URL Server Evolution API
                      <input
                        type="url"
                        value={quickWaGatewayUrl}
                        onChange={(e) => setQuickWaGatewayUrl(e.target.value)}
                        placeholder="https://evolution.tokoanda.com"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      API Key Gateway (jika ada)
                      <input
                        type="password"
                        value={quickWaGatewayKey}
                        onChange={(e) => setQuickWaGatewayKey(e.target.value)}
                        placeholder="Opsional"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </label>
                  </div>
                </details>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMode("none")}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4 text-amber-400" />
                    {saving ? "Mengaktifkan..." : "Aktifkan WhatsApp Cepat Sekarang"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM / EVOLUTION / OMNICHANNEL MODAL */}
      {modalMode === "custom" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Tambah Koneksi Kanal</h3>
              <button type="button" onClick={() => setModalMode("none")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustom} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Kanal
                  <select
                    value={channelType}
                    onChange={(e) => setChannelType(e.target.value as ChannelType)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {(Object.keys(CHANNEL_META) as ChannelType[]).map((ch) => (
                      <option key={ch} value={ch}>
                        {CHANNEL_META[ch].shortLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Transport / Provider
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as typeof provider)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="evolution_api">Evolution API</option>
                    <option value="meta_cloud">Meta API</option>
                    <option value="tiktok_api">TikTok Business</option>
                    <option value="youtube_api">YouTube Data API</option>
                    <option value="manual">Manual / CRM Log</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Nama Tampilan Kanal *
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Instagram Toko Utama"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Account / Page / Instance ID *
                <input
                  required
                  value={externalAccountId}
                  onChange={(e) => setExternalAccountId(e.target.value)}
                  placeholder="Contoh: wacrm-main-instance"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              {provider === "evolution_api" && (
                <>
                  <label className="block text-xs font-semibold text-slate-700">
                    Evolution Base URL (HTTPS)
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://evolution.domainanda.com"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Instance Evolution
                    <input
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      placeholder="wacrm-cs-01"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                </>
              )}
              <label className="block text-xs font-semibold text-slate-700">
                API Key / Access Token (opsional, dienkripsi server)
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Kosongkan jika status pending"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalMode("none")} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan Kanal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
