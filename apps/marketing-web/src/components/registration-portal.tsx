"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  Pause,
  ShieldCheck,
} from "lucide-react";
import {
  COMMERCIAL_EDITIONS,
  PUBLISHER_HQ_BASE_URL,
  type CommercialEditionId,
} from "@/lib/enterprise-catalog";

interface RegistrationPortalProps {
  selectedEdition: CommercialEditionId;
  onChangeEdition: (ed: CommercialEditionId) => void;
}

interface RegistrationSuccessPayload {
  registrationCode: string;
  aiWelcomeMessage: string;
  privateAccessUrl: string;
  publisherPortalUrl: string;
  aiTier?: string;
  aiScore?: number;
}

export function RegistrationPortal({
  selectedEdition,
  onChangeEdition,
}: RegistrationPortalProps) {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("Jakarta");
  const [industry, setIndustry] = useState("Distribusi & Retail Multi-Cabang");
  const [teamSize, setTeamSize] = useState("10-50 Staf");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<RegistrationSuccessPayload | null>(null);
  const [countdown, setCountdown] = useState(6);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState(false);

  // Auto-continue to https://wacrm-publisher-hq.vercel.app/ after registration
  useEffect(() => {
    if (!success || autoRedirectPaused) return;
    if (countdown <= 0) {
      window.location.assign(success.publisherPortalUrl);
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [success, countdown, autoRedirectPaused]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${PUBLISHER_HQ_BASE_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          city: city.trim(),
          industry: industry.trim(),
          teamSize,
          interestedEdition: selectedEdition,
          source: "enterprise_website",
          notes: notes.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        registrationCode?: string;
        aiWelcomeMessage?: string;
        privateAccessUrl?: string;
        publisherPortalUrl?: string;
        lead?: { aiTier?: string; aiScore?: number };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal memproses pendaftaran ke Publisher HQ.");
      }

      const targetPortal = `${data.publisherPortalUrl || PUBLISHER_HQ_BASE_URL}/?lead=${encodeURIComponent(
        data.registrationCode || "",
      )}`.replace(/\/\/\?/, "/?");

      setSuccess({
        registrationCode: data.registrationCode || `REG-${Date.now().toString().slice(-6)}`,
        aiWelcomeMessage:
          data.aiWelcomeMessage ||
          "Pendaftaran Anda telah diterima & langsung diproses oleh 5 Agen AI WACRM.",
        privateAccessUrl: data.privateAccessUrl || "",
        publisherPortalUrl: targetPortal,
        aiTier: data.lead?.aiTier,
        aiScore: data.lead?.aiScore,
      });
      setCountdown(6);
      setAutoRedirectPaused(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Terjadi kendala koneksi ke server pendaftaran. Silakan coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="daftar" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl lg:grid-cols-12 lg:p-10">
        {/* Left Information Column */}
        <div className="flex flex-col justify-between space-y-6 lg:col-span-5">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
              <Lock className="h-3.5 w-3.5" /> Gerbang Pendaftaran &amp; Akses Privat Resmi
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Daftarkan Perusahaan Anda &amp; Buka Akses Aplikasi Privat
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Demi standar keamanan korporasi dan kualitas pendampingan onboarding, tautan aplikasi
              klien <strong>tidak dibuka secara publik</strong>. Sesaat setelah pendaftaran dikirim:
            </p>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>1. Kualifikasi Multi-Agent AI Seketika:</strong> 5 Agen AI kami menghitung
                  kebutuhan cabang, modul, dan rekomendasi lisensi terbaik dalam &lt; 2 detik.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>2. Tautan Akses Privat Terbuka:</strong> Sistem langsung menampilkan
                  tautan akses privat aplikasi beserta kode registrasi resmi Anda.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>3. Terhubung Otomatis ke Publisher HQ:</strong> Data pendaftar masuk
                  langsung ke EMS Penerbit untuk penerbitan License Key &amp; follow-up WhatsApp.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Jaminan Privasi Data Korporasi
            </div>
            <p className="mt-1 leading-relaxed">
              Seluruh informasi bisnis Anda dienkripsi TLS 1.3 dan hanya digunakan oleh{" "}
              <strong className="text-slate-200">PT WACRM Digital Nusantara</strong> untuk proses
              aktivasi lisensi &amp; dukungan teknis resmi.
            </p>
          </div>
        </div>

        {/* Right Form / Post-Registration Unlock Panel */}
        <div className="lg:col-span-7">
          {!success ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-6 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Formulir Registrasi Peminat &amp; Aktivasi Akses
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Isi data lengkap untuk langsung menerima akses privat &amp; onboarding resmi.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                  Proses Instan · 24/7 AI
                </span>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-slate-300">
                  Nama Lengkap PIC / Owner *
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white placeholder:text-slate-500"
                  />
                </label>
                <label className="block text-slate-300">
                  Nama Perusahaan / Usaha *
                  <input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Contoh: PT Nusantara Distribusi"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white placeholder:text-slate-500"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-slate-300">
                  Email Bisnis Aktif *
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.co.id"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white placeholder:text-slate-500"
                  />
                </label>
                <label className="block text-slate-300">
                  Nomor WhatsApp Aktif *
                  <input
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white placeholder:text-slate-500"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-slate-300">
                  Kota / Provinsi
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white"
                  />
                </label>
                <label className="block text-slate-300">
                  Sektor Industri
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white"
                  />
                </label>
                <label className="block text-slate-300">
                  Skala Tim
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white"
                  >
                    <option value="1-5 Staf">1–5 Staf (UMKM)</option>
                    <option value="6-15 Staf">6–15 Staf (UKM)</option>
                    <option value="10-50 Staf">15–50 Staf (Menengah)</option>
                    <option value="50+ Staf / Multi-Cabang">50+ Staf / Multi-Cabang</option>
                  </select>
                </label>
              </div>

              <div>
                <div className="mb-1.5 text-slate-300">Edisi yang Diminati *</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COMMERCIAL_EDITIONS.map((ed) => {
                    const active = selectedEdition === ed.id;
                    return (
                      <button
                        key={ed.id}
                        type="button"
                        onClick={() => onChangeEdition(ed.id)}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                            : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-[11px] font-extrabold">{ed.name}</div>
                        <div className="text-[10px] opacity-80">{ed.monthlyPriceLabel}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block text-slate-300">
                Kebutuhan Khusus / Jumlah Cabang (Opsional)
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Butuh integrasi 5 cabang, kasir QR barcode, dan laporan PSAK 72."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {submitting
                  ? "Menghubungkan ke Multi-Agent AI Publisher HQ..."
                  : "Daftar & Dapatkan Akses Privat Aplikasi"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="space-y-4 rounded-2xl border border-emerald-500/50 bg-slate-950 p-6 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 font-extrabold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Pendaftaran Terverifikasi ·{" "}
                  {success.registrationCode}
                </span>
                {success.aiTier && (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-300">
                    Prioritas AI: {success.aiTier.toUpperCase()} ({success.aiScore}/100)
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 font-bold text-emerald-300">
                  <Bot className="h-4 w-4" /> Respon Otomatis 5 Agen AI WACRM
                </div>
                <p className="whitespace-pre-line leading-relaxed text-slate-200">
                  {success.aiWelcomeMessage}
                </p>
              </div>

              {success.privateAccessUrl && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-1.5 font-extrabold text-emerald-300">
                    <KeyRound className="h-4 w-4" /> Akses Privat Aplikasi Klien WACRM Anda Terbuka
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Simpan tautan eksklusif berikut (hanya diberikan khusus untuk pendaftar resmi):
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <a
                      href={success.privateAccessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Buka Aplikasi Klien WACRM
                    </a>
                    <span className="rounded-lg bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-emerald-200">
                      {success.privateAccessUrl}
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-amber-200">
                      {autoRedirectPaused
                        ? "Pengalihan Otomatis Dijeda"
                        : `Melanjutkan otomatis ke Publisher HQ dalam ${countdown} detik...`}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-300">
                      Anda akan diarahkan ke Portal Penerbit (<strong>{PUBLISHER_HQ_BASE_URL}</strong>)
                      untuk pemrosesan onboarding &amp; tindak lanjut lisensi.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoRedirectPaused((p) => !p)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-bold text-slate-200 hover:bg-slate-800"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      {autoRedirectPaused ? "Lanjutkan Timer" : "Jeda"}
                    </button>
                    <a
                      href={success.publisherPortalUrl}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 font-extrabold text-slate-950 hover:bg-amber-300"
                    >
                      Lanjut ke Publisher HQ Sekarang <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
