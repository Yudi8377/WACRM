"use client";

import { useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  Crown,
  KeyRound,
  Layers,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { formatIdr, type AppEditionId } from "@/lib/crm-types";
import {
  APP_EDITIONS,
  EDITION_FEATURE_LABELS,
  getEditionById,
  type EditionFeatureKey,
} from "@/lib/editions";
import {
  clearStoredClientLicense,
  loadStoredClientLicense,
  saveStoredClientLicense,
  type StoredClientLicense,
  type VerifiedLicensePayload,
} from "@/lib/license-crypto";

interface EditionsViewProps {
  tenantId: string;
  accountEmail?: string | null;
  workspaceName: string;
  currentEditionId: AppEditionId;
  activeLicense?: StoredClientLicense | null;
  activeAgentsCount: number;
  membersCount?: number;
  contactsCount?: number;
  productsCount: number;
  channelsCount: number;
  onSelectEdition: (editionId: AppEditionId, verifiedLicenseKey?: string, maxSeats?: number) => void;
  onClearLicense?: () => void;
  onToast?: (msg: string, tone?: "success" | "error") => void;
}

const ALL_FEATURES = Object.keys(EDITION_FEATURE_LABELS) as EditionFeatureKey[];

function formatLimit(val: number, unit: string): string {
  return val < 0 ? `Unlimited ${unit}` : `${val.toLocaleString("id-ID")} ${unit}`;
}

export function EditionsView({
  tenantId,
  accountEmail,
  workspaceName,
  currentEditionId,
  activeLicense,
  activeAgentsCount,
  membersCount = 1,
  contactsCount = 0,
  productsCount,
  channelsCount,
  onSelectEdition,
  onClearLicense,
  onToast,
}: EditionsViewProps) {
  const activeEdition = getEditionById(currentEditionId);
  const [storedLicense, setStoredLicense] = useState<StoredClientLicense | null>(() =>
    activeLicense !== undefined ? activeLicense : loadStoredClientLicense(tenantId, accountEmail),
  );
  const effectiveStoredLicense =
    activeLicense !== undefined ? activeLicense : storedLicense;
  const [licenseInput, setLicenseInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  async function handleActivateLicense(e: FormEvent) {
    e.preventDefault();
    if (!licenseInput.trim()) return;
    setVerifying(true);
    setVerifyFeedback(null);

    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey: licenseInput.trim(),
          tenantId,
          domain: typeof window !== "undefined" ? window.location.host : "localhost",
        }),
      });
      const data = (await res.json()) as VerifiedLicensePayload;

      if (!data.valid || !data.editionId || !data.expiresAt || !data.maxSeats) {
        const msg = data.error || "License Key tidak valid atau sudah kedaluwarsa.";
        setVerifyFeedback({ ok: false, message: msg });
        onToast?.(msg, "error");
        return;
      }

      const nextLicense: StoredClientLicense = {
        licenseKey: data.normalizedKey,
        editionId: data.editionId,
        maxSeats: data.maxSeats,
        expiresAt: data.expiresAt,
        activatedAt: new Date().toISOString().slice(0, 10),
        licensedTo: workspaceName,
        licensedEmail: accountEmail?.trim().toLowerCase() ?? null,
        verificationMode: data.verificationMode,
        status: "active",
      };

      saveStoredClientLicense(tenantId, nextLicense, accountEmail);
      setStoredLicense(nextLicense);
      onSelectEdition(data.editionId, data.normalizedKey, data.maxSeats);
      setLicenseInput("");
      const okMsg = `Lisensi resmi ${data.editionName} aktif (${data.isUnlimitedSeats ? "Unlimited" : data.maxSeats} kursi, berlaku hingga ${data.expiresAt}). Seluruh menu & kuota langsung disesuaikan dengan Matriks Fitur!`;
      setVerifyFeedback({ ok: true, message: okMsg });
      onToast?.(okMsg, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memverifikasi License Key.";
      setVerifyFeedback({ ok: false, message: msg });
      onToast?.(msg, "error");
    } finally {
      setVerifying(false);
    }
  }

  function handleClearLicense() {
    clearStoredClientLicense(tenantId, accountEmail);
    setStoredLicense(null);
    setVerifyFeedback(null);
    onClearLicense?.();
    onToast?.("Ikatan License Key dilepas — workspace kembali ke batasan Starter UMKM.");
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Layers className="h-3.5 w-3.5" />
            WACRM Multi-Edition &amp; Aktivasi Lisensi Resmi Penerbit
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Edisi, Kuota &amp; Aktivasi License Key WACRM
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-300">
            Aktifkan License Key resmi yang diterbitkan dari aplikasi terpisah{" "}
            <strong className="text-indigo-200">WACRM Publisher HQ (Super Admin EMS)</strong> milik
            PT WACRM Digital Nusantara untuk membuka kuota agen, modul AI, dan SLA Enterprise.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 px-4 py-3 text-right">
          <div className="text-[11px] font-semibold text-slate-400">Edisi Aktif Workspace Ini</div>
          <div className="mt-0.5 flex items-center justify-end gap-1.5 text-lg font-extrabold text-emerald-400">
            <Crown className="h-4 w-4" /> {activeEdition.name}
          </div>
          <div className="text-[11px] text-slate-400">
            {activeEdition.monthlyPriceIdr === 0
              ? "Gratis Selamanya"
              : `${formatIdr(activeEdition.monthlyPriceIdr)} / bulan`}
          </div>
        </div>
      </div>

      {/* LICENSE ACTIVATION BRIDGE TO SEPARATE PUBLISHER HQ APP */}
      <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <KeyRound className="h-4 w-4" /> Aktivasi License Key dari WACRM Publisher HQ
            </div>
            <p className="max-w-2xl text-xs text-slate-300">
              Manajemen lisensi, billing penerbit, ERP, CRM B2B, dan akuntansi perusahaan penerbit
              berjalan pada aplikasi terpisah <strong>WACRM Publisher HQ</strong>. Tempelkan License
              Key bertanda tangan kriptografi dari Publisher HQ di bawah ini untuk mengaktifkan
              edisi workspace Anda secara instan.
            </p>
          </div>

          {effectiveStoredLicense ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-300">
                  Lisensi Terverifikasi ({effectiveStoredLicense.verificationMode === "publisher_live" ? "Live API" : "Signed Offline"})
                </div>
                <div className="font-mono text-sm font-bold text-white">
                  {effectiveStoredLicense.licenseKey}
                </div>
                <div className="text-[11px] text-slate-300">
                  Kuota:{" "}
                  <strong>
                    {effectiveStoredLicense.maxSeats >= 9999 ? "Unlimited" : `${effectiveStoredLicense.maxSeats} kursi`}
                  </strong>{" "}
                  · Berlaku s/d <strong>{effectiveStoredLicense.expiresAt}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearLicense}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
              >
                Lepas Key
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-400">
              <Building2 className="h-4 w-4 text-indigo-400" />
              Belum ada License Key terikat (Mode Trial 14 Hari Starter UMKM)
            </div>
          )}
        </div>

        <form onSubmit={handleActivateLicense} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            id="wacrm-license-key-input"
            type="text"
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
            placeholder="Tempel License Key resmi (contoh: WACRM-ENT-2711-0050-XXXXXXXX)"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-mono text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={verifying || !licenseInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {verifying ? "Memverifikasi..." : "Verifikasi & Aktifkan Lisensi"}
          </button>
        </form>

        {verifyFeedback && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
              verifyFeedback.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-200"
            }`}
          >
            {verifyFeedback.ok ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{verifyFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Live Quota Meters (100% synced with active License Key & Edition Matrix) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Kursi Agen CS / Tim</span>
            <strong className="text-white">
              {membersCount} /{" "}
              {effectiveStoredLicense?.editionId === currentEditionId && effectiveStoredLicense.maxSeats > 0
                ? effectiveStoredLicense.maxSeats >= 9999
                  ? "∞"
                  : effectiveStoredLicense.maxSeats
                : activeEdition.limits.maxAgents < 0
                  ? "∞"
                  : activeEdition.limits.maxAgents}
            </strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{
                width: `${
                  activeEdition.limits.maxAgents < 0 ||
                  (effectiveStoredLicense?.editionId === currentEditionId && effectiveStoredLicense.maxSeats >= 9999)
                    ? 25
                    : Math.min(
                        100,
                        Math.round(
                          (membersCount /
                            Math.max(
                              1,
                              effectiveStoredLicense?.editionId === currentEditionId &&
                                effectiveStoredLicense.maxSeats > 0
                                ? effectiveStoredLicense.maxSeats
                                : activeEdition.limits.maxAgents,
                            )) *
                            100,
                        ),
                      )
                }%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Agen AI Terbuka</span>
            <strong className="text-white">
              {Math.min(activeAgentsCount, activeEdition.limits.maxAiAgents)} /{" "}
              {activeEdition.limits.maxAiAgents}
            </strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(100, Math.round((Math.min(activeAgentsCount, activeEdition.limits.maxAiAgents) / activeEdition.limits.maxAiAgents) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Kapasitas Kontak CRM</span>
            <strong className="text-white">
              {contactsCount.toLocaleString("id-ID")} /{" "}
              {activeEdition.limits.maxContacts < 0
                ? "∞"
                : activeEdition.limits.maxContacts.toLocaleString("id-ID")}
            </strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-500"
              style={{
                width: `${
                  activeEdition.limits.maxContacts < 0
                    ? 20
                    : Math.min(100, Math.max(4, Math.round((contactsCount / activeEdition.limits.maxContacts) * 100)))
                }%`,
              }}
            />
          </div>
          <div className="mt-1 text-[10px] text-slate-500">{productsCount} SKU produk terdaftar</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Kanal Omnichannel</span>
            <strong className="text-white">
              {channelsCount} /{" "}
              {activeEdition.limits.maxChannels < 0 ? "∞" : activeEdition.limits.maxChannels}
            </strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{
                width: `${
                  activeEdition.limits.maxChannels < 0
                    ? 35
                    : Math.min(100, Math.round((channelsCount / activeEdition.limits.maxChannels) * 100))
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 4-Tier Edition Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {APP_EDITIONS.map((ed) => {
          const isCurrent = ed.id === currentEditionId;
          return (
            <div
              key={ed.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                isCurrent
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
                  : ed.recommended
                    ? "border-indigo-500/50 bg-slate-900/95"
                    : "border-slate-800 bg-slate-900/85"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-200">
                    {ed.badge}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      <Check className="h-3 w-3" /> Aktif
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-lg font-extrabold text-white">{ed.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{ed.tagline}</p>

                <div className="mt-4 border-y border-slate-800 py-3">
                  <div className="text-2xl font-extrabold text-white">
                    {ed.monthlyPriceIdr === 0 ? "Rp 0" : formatIdr(ed.monthlyPriceIdr)}
                    <span className="text-xs font-normal text-slate-400"> /bln</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {ed.annualPriceIdr === 0
                      ? "Tanpa biaya komitmen"
                      : `Tahunan hemat: ${formatIdr(ed.annualPriceIdr)}/thn`}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    Tim: <strong>{formatLimit(ed.limits.maxAgents, "agen")}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    AI: <strong>{ed.limits.maxAiAgents} agen</strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    Kontak: <strong>{formatLimit(ed.limits.maxContacts, "")}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    Cabang: <strong>{formatLimit(ed.limits.maxWorkspaces, "")}</strong>
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                  {ed.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  if (ed.id === "starter" || effectiveStoredLicense?.editionId === ed.id) {
                    onSelectEdition(
                      ed.id,
                      effectiveStoredLicense?.editionId === ed.id
                        ? effectiveStoredLicense.licenseKey
                        : undefined,
                      effectiveStoredLicense?.editionId === ed.id
                        ? effectiveStoredLicense.maxSeats
                        : undefined,
                    );
                  } else {
                    const inputEl = document.getElementById("wacrm-license-key-input");
                    inputEl?.scrollIntoView({ behavior: "smooth", block: "center" });
                    inputEl?.focus();
                    onToast?.(
                      `Edisi ${ed.name} memerlukan License Key resmi dari WACRM Publisher HQ. Masukkan kunci lisensi Anda di kolom aktivasi di atas.`,
                      "error",
                    );
                  }
                }}
                className={`mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  isCurrent
                    ? "cursor-default border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                    : ed.id === "starter" || effectiveStoredLicense?.editionId === ed.id
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "border border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                }`}
              >
                {isCurrent ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Edisi Aktif Saat Ini
                  </>
                ) : ed.id === "starter" ? (
                  "Gunakan Edisi Starter UMKM"
                ) : effectiveStoredLicense?.editionId === ed.id ? (
                  `Aktifkan Lisensi ${ed.name}`
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Butuh License Key {ed.name}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <h3 className="text-sm font-bold text-white">
          Matriks Perbandingan Fitur Antar Edisi WACRM
        </h3>
        <table className="mt-3 w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-2.5 pr-4">Kapabilitas &amp; Modul</th>
              {APP_EDITIONS.map((ed) => (
                <th
                  key={ed.id}
                  className={`px-3 py-2.5 text-center font-bold ${
                    ed.id === currentEditionId
                      ? "rounded-t-lg bg-emerald-500/15 text-emerald-300"
                      : "text-white"
                  }`}
                >
                  {ed.name}
                  {ed.id === currentEditionId && (
                    <div className="text-[10px] font-semibold text-emerald-400">Aktif</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {ALL_FEATURES.map((feat) => (
              <tr key={feat} className="hover:bg-slate-800/40">
                <td className="py-2.5 pr-4 font-medium text-slate-200">
                  {EDITION_FEATURE_LABELS[feat]}
                </td>
                {APP_EDITIONS.map((ed) => {
                  const has = ed.features.includes(feat);
                  const isCurrentCol = ed.id === currentEditionId;
                  return (
                    <td
                      key={ed.id}
                      className={`px-3 py-2.5 text-center ${
                        isCurrentCol ? "bg-emerald-500/10" : ""
                      }`}
                    >
                      {has ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
