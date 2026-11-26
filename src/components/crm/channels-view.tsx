"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Link2, Plus, Power, ShieldCheck, Trash2, X } from "lucide-react";
import { CHANNEL_META, type ChannelRecord, type ChannelType } from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface ChannelsViewProps {
  adapter: WorkspaceAdapter;
  channels: ChannelRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

export function ChannelsView({ adapter, channels, onRefresh, onToast }: ChannelsViewProps) {
  const [modalMode, setModalMode] = useState<"none" | "meta_whatsapp" | "custom">("none");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Meta Official WhatsApp form
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [metaToken, setMetaToken] = useState("");

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
    setSaving(true);
    try {
      const res = await adapter.connectMetaWhatsApp({ wabaId, phoneNumberId, accessToken: metaToken });
      setWabaId("");
      setPhoneNumberId("");
      setMetaToken("");
      setModalMode("none");
      await onRefresh();
      onToast(`WhatsApp Meta terhubung: ${res.displayName}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Validasi Meta WhatsApp gagal.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCustom(e: FormEvent) {
    e.preventDefault();
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
              onClick={() => setModalMode("meta_whatsapp")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Hubungkan Meta WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setModalMode("custom")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Tambah Kanal / Evolution API
            </button>
          </div>
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

      {/* META WHATSAPP MODAL */}
      {modalMode === "meta_whatsapp" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Hubungkan WhatsApp Cloud API (Meta)</h3>
              <button type="button" onClick={() => setModalMode("none")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConnectMeta} className="mt-4 space-y-3.5">
              <label className="block text-xs font-semibold text-slate-700">
                WABA ID (WhatsApp Business Account ID)
                <input
                  required
                  inputMode="numeric"
                  pattern="\d{5,30}"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="Contoh: 109876543210987"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Phone Number ID
                <input
                  required
                  inputMode="numeric"
                  pattern="\d{5,30}"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="Contoh: 112233445566778"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                System User Access Token
                <input
                  required
                  type="password"
                  minLength={10}
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  placeholder="EAAG..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <p className="text-[11px] text-slate-500">
                Server akan memvalidasi token terhadap Graph API Meta lalu mengenkripsinya sebelum disimpan di Neon PostgreSQL.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalMode("none")} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? "Memvalidasi..." : "Validasi & Hubungkan"}
                </button>
              </div>
            </form>
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
