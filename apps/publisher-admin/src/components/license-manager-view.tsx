"use client";

import { useState, type FormEvent } from "react";
import {
  Ban,
  CheckCircle2,
  Copy,
  FileBadge2,
  History,
  KeyRound,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import {
  PUBLISHER_EDITIONS,
  V53_EDITION_CAPABILITY_MATRIX,
  verifySignedLicenseKey,
} from "@/lib/license-engine";
import {
  formatIdr,
  type BillingCycle,
  type EditionId,
  type LicenseRecord,
  type PublisherEmsState,
} from "@/lib/publisher-types";

interface LicenseManagerViewProps {
  state: PublisherEmsState;
  onIssueLicense: (input: {
    tenantId: string;
    editionId: EditionId;
    billingCycle: BillingCycle;
    maxSeats: number;
    expiryYear: number;
    expiryMonth: number;
    domain: string;
    notes: string;
  }) => void;
  onMutateLicense: (
    licenseId: string,
    action: "renew_12m" | "suspend" | "reactivate" | "revoke" | "upgrade",
    upgradeEdition?: EditionId,
  ) => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

const STATUS_STYLE: Record<LicenseRecord["status"], string> = {
  active: "bg-emerald-500/20 text-emerald-300",
  trial: "bg-cyan-500/20 text-cyan-300",
  grace_period: "bg-amber-500/20 text-amber-300",
  suspended: "bg-orange-500/20 text-orange-300",
  expired: "bg-rose-500/20 text-rose-300",
  revoked: "bg-red-500/20 text-red-300",
};

export function LicenseManagerView({
  state,
  onIssueLicense,
  onMutateLicense,
  onToast,
}: LicenseManagerViewProps) {
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [certLicense, setCertLicense] = useState<LicenseRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<ReturnType<typeof verifySignedLicenseKey> | null>(
    null,
  );

  const [form, setForm] = useState({
    tenantId: state.tenants[0]?.id ?? "",
    editionId: "enterprise" as EditionId,
    billingCycle: "annual" as BillingCycle,
    maxSeats: 50,
    expiryYear: 2027,
    expiryMonth: 12,
    domain: "",
    notes: "",
  });

  const filteredLicenses = state.licenses.filter((l) =>
    filterStatus === "all" ? true : l.status === filterStatus,
  );

  function handleIssueSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.tenantId) {
      onToast("Pilih perusahaan tenant terlebih dahulu.", "error");
      return;
    }
    onIssueLicense(form);
    setShowIssueModal(false);
  }

  function handleVerifyTest(e: FormEvent) {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setVerifyResult(verifySignedLicenseKey(verifyInput));
  }

  function copyKey(key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(key);
      onToast(`License Key ${key} disalin! Tempelkan di tab Edisi & Lisensi pada aplikasi WACRM.`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            License Management System (LMS) — Penerbit WACRM
          </h2>
          <p className="text-xs text-slate-400">
            Terbitkan, verifikasi, perpanjang, upgrade, atau cabut License Key bertanda tangan
            kriptografi untuk seluruh instansi aplikasi WACRM pelanggan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowIssueModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Terbitkan License Key Baru
        </button>
      </div>

      {/* Live Cryptographic Key Verifier */}
      <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
          <ShieldCheck className="h-4 w-4" /> Verifikator Kriptografi License Key (Endpoint API:
          <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-emerald-300">
            POST /api/licenses/verify
          </code>
          )
        </div>
        <form onSubmit={handleVerifyTest} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value.toUpperCase())}
            placeholder="Tempel License Key untuk menguji validitas signature & masa berlaku..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400"
          >
            Uji Verifikasi Key
          </button>
        </form>
        {verifyResult && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
              verifyResult.valid
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            {verifyResult.valid ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>VALID &amp; ASLI</strong> · Edisi:{" "}
                  <strong>{verifyResult.editionName}</strong> · Kuota:{" "}
                  <strong>
                    {verifyResult.isUnlimitedSeats ? "Unlimited" : `${verifyResult.maxSeats} kursi`}
                  </strong>{" "}
                  · Berlaku s/d <strong>{verifyResult.expiresAt}</strong> · Sig:{" "}
                  <code className="font-mono">{verifyResult.signature}</code>
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{verifyResult.error}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* v5.3 Commercial 4-Edition Entitlement Reference (Synced with wacrm-seven-dusky.vercel.app) */}
      <div className="rounded-2xl border border-amber-500/35 bg-slate-900/95 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-white">
              Katalog &amp; Diferensiasi 4 Edisi WACRM v5.3 (Sinkron dengan Aplikasi Klien)
            </h3>
            <p className="text-[11px] text-slate-400">
              Enterprise AI Suite dibatasi pada Pembukuan Operasional; Akuntansi PSAK/SPT, HRD Payroll CRUD+Print, ERP Korporat, Suite CRM/POS/SEO &amp; Strategi Marketing Enterprise 5-Agen AI dikunci eksklusif di Sovereign Corporate.
            </p>
          </div>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-extrabold text-amber-300">
            SYNC v5.3 · 4 EDISI AKTIF
          </span>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4 text-xs">
          {(["starter", "pro", "enterprise", "sovereign"] as const).map((edId) => {
            const spec = PUBLISHER_EDITIONS[edId];
            return (
              <div
                key={edId}
                className={`rounded-xl border p-3 ${
                  edId === "sovereign"
                    ? "border-amber-500/45 bg-amber-950/20"
                    : edId === "enterprise"
                      ? "border-violet-500/35 bg-violet-950/15"
                      : edId === "pro"
                        ? "border-cyan-500/30 bg-cyan-950/15"
                        : "border-slate-800 bg-slate-950"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <strong className="text-white">{spec.name}</strong>
                  <span className="font-mono text-[10px] font-bold text-emerald-300">
                    {spec.monthlyPriceIdr === 0 ? "Rp 0" : `${formatIdr(spec.monthlyPriceIdr)}/bln`}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-amber-300">{spec.badge}</div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-300">{spec.positioning}</p>
                <div className="mt-2 font-mono text-[10px] text-slate-400">
                  {spec.entitlements.length} entitlement · {spec.maxAiAgents} AI Agent ·{" "}
                  {spec.defaultSeats >= 9999 ? "Unlimited" : `${spec.defaultSeats}`} kursi
                </div>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="px-3 py-2">Modul &amp; Kapabilitas v5.3</th>
                <th className="px-2 py-2 text-center">Starter</th>
                <th className="px-2 py-2 text-center">Growth Pro</th>
                <th className="px-2 py-2 text-center">Enterprise</th>
                <th className="px-2 py-2 text-center text-amber-300">Sovereign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {V53_EDITION_CAPABILITY_MATRIX.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-1.5 text-slate-200">{row.label}</td>
                  {(["starter", "pro", "enterprise", "sovereign"] as const).map((edId) => (
                    <td key={edId} className="px-2 py-1.5 text-center font-bold">
                      {row.tiers[edId] ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-slate-600">🔒</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {["all", "active", "trial", "grace_period", "suspended", "revoked"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
              filterStatus === st
                ? "bg-emerald-500 text-slate-950"
                : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {st === "all" ? `Semua (${state.licenses.length})` : st.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* License Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {filteredLicenses.map((lic) => {
          const spec = PUBLISHER_EDITIONS[lic.editionId];
          const seatPct =
            lic.maxSeats >= 9999
              ? 18
              : Math.min(100, Math.round((lic.usedSeats / lic.maxSeats) * 100));
          return (
            <article
              key={lic.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[lic.status]}`}
                    >
                      {lic.status.replace("_", " ")}
                    </span>
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                      {spec.name}
                    </span>
                    <span className="text-[11px] text-slate-400">{lic.billingCycle}</span>
                  </div>
                  <h3 className="mt-1.5 text-base font-extrabold text-white">{lic.tenantName}</h3>
                  <div className="text-xs text-slate-400">Domain: {lic.domain}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-emerald-400">
                    {formatIdr(lic.monthlyValueIdr)}/bln
                  </div>
                  <div className="text-[11px] text-slate-400">Exp: {lic.expiresAt}</div>
                </div>
              </div>

              {/* License Key Strip */}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <KeyRound className="h-4 w-4 shrink-0 text-amber-400" />
                  <code className="font-mono text-xs font-bold text-emerald-300">
                    {lic.licenseKey}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyKey(lic.licenseKey)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                >
                  <Copy className="h-3 w-3" /> Salin Key
                </button>
              </div>

              {/* Seat Meter */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-slate-950/70 p-2">
                  <div className="text-slate-400">Kursi Aktif</div>
                  <div className="font-bold text-white">
                    {lic.usedSeats} / {lic.maxSeats >= 9999 ? "∞" : lic.maxSeats}
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${seatPct}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-2">
                  <div className="text-slate-400">Agen AI</div>
                  <div className="font-bold text-white">{lic.maxAiAgents} Agen Otonom</div>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-2">
                  <div className="text-slate-400">Maks Cabang</div>
                  <div className="font-bold text-white">
                    {lic.maxBranches >= 999 ? "Unlimited" : `${lic.maxBranches} cabang`}
                  </div>
                </div>
              </div>

              {/* Lifecycle Buttons */}
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => onMutateLicense(lic.id, "renew_12m")}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <RefreshCw className="h-3 w-3" /> Perpanjang +12 Bln
                </button>
                {lic.editionId !== "sovereign" && (
                  <button
                    type="button"
                    onClick={() =>
                      onMutateLicense(
                        lic.id,
                        "upgrade",
                        lic.editionId === "starter"
                          ? "pro"
                          : lic.editionId === "pro"
                            ? "enterprise"
                            : "sovereign",
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/25"
                  >
                    <TrendingUp className="h-3 w-3" /> Upgrade Edisi
                  </button>
                )}
                {lic.status === "suspended" || lic.status === "grace_period" ? (
                  <button
                    type="button"
                    onClick={() => onMutateLicense(lic.id, "reactivate")}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25"
                  >
                    <PlayCircle className="h-3 w-3" /> Aktifkan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMutateLicense(lic.id, "suspend")}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25"
                  >
                    <PauseCircle className="h-3 w-3" /> Tangguhkan
                  </button>
                )}
                {lic.status !== "revoked" && (
                  <button
                    type="button"
                    onClick={() => onMutateLicense(lic.id, "revoke")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25"
                  >
                    <Ban className="h-3 w-3" /> Cabut
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCertLicense(lic)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
                >
                  <FileBadge2 className="h-3 w-3" /> Sertifikat
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Audit Log */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <History className="h-4 w-4 text-amber-400" /> Audit Trail Penerbitan &amp; Verifikasi
          Lisensi
        </h3>
        <div className="mt-3 space-y-2 text-xs">
          {state.licenseLogs.slice(0, 12).map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2"
            >
              <div>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-300">
                  {log.action}
                </span>{" "}
                <strong className="text-white">{log.tenantName}</strong>{" "}
                <span className="font-mono text-[11px] text-slate-400">({log.licenseKey})</span>
                <div className="mt-0.5 text-[11px] text-slate-300">{log.detail}</div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div>{log.actor}</div>
                <div>{log.timestamp.slice(0, 19).replace("T", " ")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ISSUE LICENSE MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">
                Terbitkan License Key WACRM Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleIssueSubmit} className="mt-4 space-y-3.5 text-xs">
              <label className="block font-semibold text-slate-300">
                Perusahaan Tenant (Master Data) *
                <select
                  required
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {state.tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.companyName} ({t.domain})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block font-semibold text-slate-300">
                  Edisi WACRM *
                  <select
                    value={form.editionId}
                    onChange={(e) => {
                      const nextEd = e.target.value as EditionId;
                      setForm({
                        ...form,
                        editionId: nextEd,
                        maxSeats: PUBLISHER_EDITIONS[nextEd].defaultSeats,
                      });
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    {Object.values(PUBLISHER_EDITIONS).map((ed) => (
                      <option key={ed.id} value={ed.id}>
                        {ed.name} ({formatIdr(ed.monthlyPriceIdr)}/bln)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block font-semibold text-slate-300">
                  Siklus Tagihan
                  <select
                    value={form.billingCycle}
                    onChange={(e) =>
                      setForm({ ...form, billingCycle: e.target.value as BillingCycle })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="annual">Tahunan (Annual)</option>
                    <option value="monthly">Bulanan (Monthly)</option>
                    <option value="perpetual">Perpetual Corporate</option>
                    <option value="trial">Trial Evaluasi</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block font-semibold text-slate-300">
                  Maks Kursi (9999=∞)
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    required
                    value={form.maxSeats}
                    onChange={(e) =>
                      setForm({ ...form, maxSeats: Number.parseInt(e.target.value, 10) || 1 })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="block font-semibold text-slate-300">
                  Tahun Exp
                  <input
                    type="number"
                    min={2026}
                    max={2035}
                    required
                    value={form.expiryYear}
                    onChange={(e) =>
                      setForm({ ...form, expiryYear: Number.parseInt(e.target.value, 10) || 2027 })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="block font-semibold text-slate-300">
                  Bulan Exp (1-12)
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={form.expiryMonth}
                    onChange={(e) =>
                      setForm({ ...form, expiryMonth: Number.parseInt(e.target.value, 10) || 12 })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
              </div>

              <label className="block font-semibold text-slate-300">
                Domain Instansi (opsional)
                <input
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="otomatis mengikuti Master Data tenant"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>

              <label className="block font-semibold text-slate-300">
                Catatan Penerbitan
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Misal: Kontrak Enterprise Tahun 1 + Custom APK"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  Generate &amp; Terbitkan Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LICENSE CERTIFICATE MODAL */}
      {certLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-amber-400/40 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Sertifikat Lisensi Perangkat Lunak Resmi
                </div>
                <div className="text-lg font-extrabold text-white">{state.profile.companyName}</div>
              </div>
              <button
                type="button"
                onClick={() => setCertLicense(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <div className="text-[10px] uppercase text-emerald-300">Official License Key</div>
                <div className="mt-1 font-mono text-base font-extrabold text-white">
                  {certLicense.licenseKey}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div>
                  <span className="text-slate-400">Dilisensikan Kepada:</span>
                  <div className="font-bold text-white">{certLicense.tenantName}</div>
                </div>
                <div>
                  <span className="text-slate-400">Domain Terikat:</span>
                  <div className="font-mono text-white">{certLicense.domain}</div>
                </div>
                <div>
                  <span className="text-slate-400">Edisi Produk:</span>
                  <div className="font-bold text-indigo-300">
                    {PUBLISHER_EDITIONS[certLicense.editionId].name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Masa Berlaku:</span>
                  <div className="font-bold text-white">
                    {certLicense.issuedAt} s/d {certLicense.expiresAt}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Kuota Kursi &amp; AI:</span>
                  <div className="font-bold text-white">
                    {certLicense.maxSeats >= 9999 ? "Unlimited" : certLicense.maxSeats} pengguna ·{" "}
                    {certLicense.maxAiAgents} Agen AI
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">NPWP Penerbit:</span>
                  <div className="font-mono text-white">{state.profile.npwp}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => copyKey(certLicense.licenseKey)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-bold text-slate-200 hover:bg-slate-800"
                >
                  Salin License Key
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-amber-400 px-4 py-2 font-extrabold text-slate-950 hover:bg-amber-300"
                >
                  Cetak / Simpan PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
