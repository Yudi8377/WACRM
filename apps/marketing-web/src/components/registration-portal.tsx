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
          source: "enterprise_website_split_index",
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
      <div className="split-panel-enter space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141311]/15 pb-3">
          <span className="font-mono-meta inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-[#0F5132]">
            <CheckCircle2 className="h-4 w-4" /> Terverifikasi · {success.registrationCode}
          </span>
          {success.aiTier && (
            <span className="font-mono-meta border border-[#141311]/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#141311]">
              AI BANT: {success.aiTier} ({success.aiScore}/100)
            </span>
          )}
        </div>

        <div className="border-l-2 border-[#141311] bg-[#ECE7DC]/70 p-4 text-xs leading-relaxed text-[#141311]">
          <div className="font-mono-meta mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#0F5132]">
            <Bot className="h-3.5 w-3.5" /> Respon Otomatis 5 Agen AI WACRM
          </div>
          <p className="whitespace-pre-line">{success.aiWelcomeMessage}</p>
        </div>

        {success.privateAccessUrl && (
          <div className="border border-[#0F5132]/40 bg-[#0F5132]/5 p-4 text-xs">
            <div className="font-mono-meta flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-[#0F5132]">
              <KeyRound className="h-3.5 w-3.5" /> Akses Privat Aplikasi Klien Terbuka
            </div>
            <p className="mt-1.5 text-[#6C675E]">
              Tautan eksklusif berikut diterbitkan khusus untuk pendaftar resmi Anda:
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <a
                href={success.privateAccessUrl}
                target="_blank"
                rel="noreferrer"
                className="split-wipe-btn inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Buka Aplikasi Klien
              </a>
              <span className="font-mono-meta bg-[#141311]/5 px-2.5 py-1.5 text-[10px] text-[#141311]">
                {success.privateAccessUrl}
              </span>
            </div>
          </div>
        )}

        <div className="border border-[#141311]/20 bg-[#ECE7DC] p-4 text-xs">
          <div className="font-editorial text-base font-semibold text-[#141311]">
            {autoRedirectPaused
              ? "Pengalihan otomatis dijeda."
              : `Melanjutkan otomatis ke Publisher HQ dalam ${countdown} detik…`}
          </div>
          <p className="mt-1 text-[11px] text-[#6C675E]">
            Proses aktivasi lisensi &amp; tindak lanjut otomatis berlanjut ke{" "}
            <span className="font-mono-meta text-[#141311]">{PUBLISHER_HQ_BASE_URL}</span>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={success.publisherPortalUrl}
              className="inline-flex items-center gap-1.5 bg-[#141311] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#F5F2EB] transition hover:bg-[#0F5132]"
            >
              Lanjut ke Publisher HQ <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setAutoRedirectPaused((p) => !p)}
              className="inline-flex items-center gap-1 border border-[#141311]/30 px-3 py-2.5 text-[11px] font-medium text-[#141311] hover:border-[#141311]"
            >
              <Pause className="h-3 w-3" /> {autoRedirectPaused ? "Lanjutkan Timer" : "Jeda"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="split-panel-enter space-y-5 text-xs">
      {errorMsg && (
        <div className="border border-rose-700/40 bg-rose-50 px-3.5 py-2.5 text-rose-900">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
            Nama Lengkap PIC *
          </span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Budi Santoso"
            className="split-underline-input text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
            Perusahaan / Usaha *
          </span>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="PT Nusantara Distribusi"
            className="split-underline-input text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
            Email Bisnis *
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@perusahaan.co.id"
            className="split-underline-input text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
            No. WhatsApp Aktif *
          </span>
          <input
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="0812xxxxxxxx"
            className="split-underline-input text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
            Kota
          </span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="split-underline-input text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
            Industri
          </span>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="split-underline-input text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
            Skala Tim
          </span>
          <select
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="split-underline-input text-sm"
          >
            <option value="1-5 Staf">1–5 Staf (UMKM)</option>
            <option value="6-15 Staf">6–15 Staf (UKM)</option>
            <option value="10-50 Staf">15–50 Staf</option>
            <option value="50+ Staf / Multi-Cabang">50+ Staf / Holding</option>
          </select>
        </label>
      </div>

      <div>
        <span className="font-mono-meta mb-2 block text-[10px] uppercase tracking-widest text-[#6C675E]">
          Edisi yang Diminati *
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMMERCIAL_EDITIONS.map((ed) => {
            const active = selectedEdition === ed.id;
            return (
              <button
                key={ed.id}
                type="button"
                onClick={() => onChangeEdition(ed.id)}
                className={`border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-[#141311] bg-[#141311] text-[#F5F2EB]"
                    : "border-[#141311]/20 bg-transparent text-[#141311] hover:border-[#141311]"
                }`}
              >
                <div className="text-[11px] font-semibold">{ed.name}</div>
                <div className="font-mono-meta mt-0.5 text-[10px] opacity-75">
                  {ed.monthlyPriceLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="font-mono-meta block text-[10px] uppercase tracking-widest text-[#6C675E]">
          Catatan Kebutuhan (Opsional)
        </span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: 5 cabang, kasir QR barcode & laporan PSAK 72."
          className="split-underline-input resize-none text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="max-w-xs text-[11px] leading-relaxed text-[#6C675E]">
          Tautan akses privat aplikasi terbuka seketika setelah formulir dikirim dan langsung
          dilanjutkan ke Publisher HQ.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="split-wipe-btn inline-flex items-center gap-2 px-6 py-3 font-mono-meta text-xs uppercase tracking-widest disabled:opacity-50"
        >
          {submitting ? "Memverifikasi AI…" : "Daftar & Buka Akses"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  );
}
