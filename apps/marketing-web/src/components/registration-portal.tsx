"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Pause,
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
          source: "enterprise_website_made_corporate",
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

  if (success) {
    return (
      <div className="made-fade-in space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3.5">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00A885]">
            <CheckCircle2 className="h-4 w-4" /> Terverifikasi · {success.registrationCode}
          </span>
          {success.aiTier && (
            <span className="rounded bg-[#E6F7F3] px-2.5 py-1 text-[11px] font-semibold text-[#008C6F]">
              AI BANT: {success.aiTier} ({success.aiScore}/100)
            </span>
          )}
        </div>

        <div className="rounded-lg border-l-4 border-[#00A885] bg-[#F5F5F5] p-4 text-xs leading-relaxed text-[#333333]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00A885]">
            <Bot className="h-4 w-4" /> Respon Otomatis 5 Agen AI WACRM
          </div>
          <p className="whitespace-pre-line">{success.aiWelcomeMessage}</p>
        </div>

        {success.privateAccessUrl && (
          <div className="rounded-lg border border-[#00A885]/40 bg-[#E6F7F3]/70 p-4 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#008C6F]">
              <KeyRound className="h-4 w-4" /> Akses Privat Aplikasi Klien Terbuka
            </div>
            <p className="mt-1.5 text-[#555555]">
              Tautan eksklusif berikut diterbitkan khusus untuk pendaftar resmi Anda:
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={success.privateAccessUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded bg-[#00A885] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#008C6F]"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Buka Aplikasi Klien
              </a>
              <span className="break-all rounded bg-white px-2.5 py-1.5 font-mono text-[11px] text-[#222222] shadow-xs">
                {success.privateAccessUrl}
              </span>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 bg-[#F5F5F5] p-4 text-xs">
          <div className="font-heading text-base font-bold text-[#222222]">
            {autoRedirectPaused
              ? "Pengalihan otomatis dijeda."
              : `Melanjutkan otomatis ke Publisher HQ dalam ${countdown} detik…`}
          </div>
          <p className="mt-1 text-xs text-[#666666]">
            Proses aktivasi lisensi &amp; tindak lanjut otomatis berlanjut ke{" "}
            <span className="font-mono font-semibold text-[#222222]">{PUBLISHER_HQ_BASE_URL}</span>.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            <a
              href={success.publisherPortalUrl}
              className="inline-flex items-center gap-1.5 rounded bg-[#222222] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#00A885]"
            >
              Lanjut ke Publisher HQ <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setAutoRedirectPaused((p) => !p)}
              className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#333333] hover:border-[#222222]"
            >
              <Pause className="h-3.5 w-3.5" /> {autoRedirectPaused ? "Lanjutkan Timer" : "Jeda"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="made-fade-in space-y-4 text-sm">
      {errorMsg && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
            Nama Lengkap PIC *
          </span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Budi Santoso"
            className="made-input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
            Perusahaan / Usaha *
          </span>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="PT Nusantara Distribusi"
            className="made-input"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
            Email Bisnis *
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@perusahaan.co.id"
            className="made-input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
            No. WhatsApp Aktif *
          </span>
          <input
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="0812xxxxxxxx"
            className="made-input"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
            Kota
          </span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="made-input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
            Industri
          </span>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="made-input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
            Skala Tim
          </span>
          <select
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="made-input"
          >
            <option value="1-5 Staf">1–5 Staf (UMKM)</option>
            <option value="6-15 Staf">6–15 Staf (UKM)</option>
            <option value="10-50 Staf">15–50 Staf</option>
            <option value="50+ Staf / Multi-Cabang">50+ Staf / Holding</option>
          </select>
        </label>
      </div>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
          Pilih Edisi Lisensi *
        </span>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {COMMERCIAL_EDITIONS.map((ed) => {
            const active = selectedEdition === ed.id;
            return (
              <button
                key={ed.id}
                type="button"
                onClick={() => onChangeEdition(ed.id)}
                className={`rounded-md border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-[#00A885] bg-[#00A885] text-white shadow-sm"
                    : "border-zinc-200 bg-[#FAFAFA] text-[#222222] hover:border-[#00A885]"
                }`}
              >
                <div className="text-xs font-bold leading-snug">{ed.name}</div>
                <div className={`mt-0.5 text-[11px] ${active ? "text-white/90" : "text-[#666666]"}`}>
                  {ed.monthlyPriceLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
          Catatan Kebutuhan (Opsional)
        </span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: 5 cabang, kasir QR barcode & laporan PSAK 72."
          className="made-input resize-none"
        />
      </label>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[#797979] sm:max-w-sm">
          Tautan akses privat aplikasi terbuka otomatis setelah formulir terkirim dan dilanjutkan ke
          Publisher HQ.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#00A885] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-[#00A885]/25 transition hover:bg-[#008C6F] disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Memverifikasi AI…" : "Daftar & Buka Akses"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
