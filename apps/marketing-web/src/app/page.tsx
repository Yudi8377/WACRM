"use client";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Cpu,
  Globe2,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  COMMERCIAL_EDITIONS,
  ENTERPRISE_FAQS,
  ENTERPRISE_PILLARS,
  INDUSTRY_SOLUTIONS,
  type CommercialEditionId,
} from "@/lib/enterprise-catalog";
import { EnterpriseDashboardMockup } from "@/components/enterprise-dashboard-mockup";
import { RoiCalculator } from "@/components/roi-calculator";
import { RegistrationPortal } from "@/components/registration-portal";
import { LiveAiChatWidget } from "@/components/live-ai-chat-widget";

export default function EnterpriseLandingPage() {
  const [selectedEdition, setSelectedEdition] = useState<CommercialEditionId>("enterprise");
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  function jumpToRegistrationWithEdition(ed: CommercialEditionId) {
    setSelectedEdition(ed);
    const el = document.getElementById("daftar");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      {/* Top Executive Navigation — ZERO Public Client App Link */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#030712]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-white">
                WACRM <span className="text-emerald-400">Enterprise</span>
              </div>
              <div className="text-[10px] text-slate-400">PT WACRM Digital Nusantara</div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-xs font-semibold text-slate-300 md:flex">
            <a href="#arsitektur" className="hover:text-emerald-300">
              Arsitektur Modul
            </a>
            <a href="#roi" className="hover:text-emerald-300">
              Kalkulator ROI
            </a>
            <a href="#harga" className="hover:text-emerald-300">
              Edisi &amp; Harga
            </a>
            <a href="#industri" className="hover:text-emerald-300">
              Solusi Industri
            </a>
            <a href="#faq" className="hover:text-emerald-300">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href="#daftar"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
            >
              <Lock className="h-3.5 w-3.5" /> Daftar &amp; Akses Privat
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="enterprise-grid-bg relative overflow-hidden border-b border-slate-800/80">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[760px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Rilis Komersial v5.3.1 · Cloud + Windows + Android
            </div>

            <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl">
              Satu Sistem Enterprise untuk{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                CRM AI, ERP, POS &amp; Akuntansi PSAK 72
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-300">
              Tinggalkan puluhan spreadsheet dan aplikasi terpisah. WACRM menyatukan 11 Agen AI
              WhatsApp, inventori multi-gudang FIFO, kasir POS hardware-ready, HRD Payroll, dan
              laporan keuangan PSAK 72 dalam satu platform bisnis berstandar korporasi.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#daftar"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                Ajukan Akses Privat Gratis <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#roi"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-sm font-bold text-slate-200 transition hover:border-emerald-500/50 hover:text-white"
              >
                Simulasi ROI Bisnis Anda
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-6 text-xs">
              <div>
                <div className="text-xl font-black text-white">11 Agen AI</div>
                <div className="text-slate-400">Otonom 24/7 CS &amp; Sales</div>
              </div>
              <div>
                <div className="text-xl font-black text-emerald-400">100% Balance</div>
                <div className="text-slate-400">Jurnal PSAK 72 Otomatis</div>
              </div>
              <div>
                <div className="text-xl font-black text-white">Rp 0</div>
                <div className="text-slate-400">Starter UMKM Selamanya</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <EnterpriseDashboardMockup />
          </div>
        </div>
      </section>

      {/* Enterprise Trust & Compliance Strip */}
      <section className="border-b border-slate-800/80 bg-slate-950/70">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 text-xs sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: ShieldCheck, title: "Enkripsi AES-256-GCM", sub: "Keamanan data & webhook HMAC" },
            { icon: Globe2, title: "Akses Online Global HTTPS", sub: "Multi-cabang real-time 99,9% SLA" },
            { icon: Cpu, title: "Hardware Ready v5.3.1", sub: "Auto-Fix Izin Kamera QR & Mikrofon" },
            { icon: Building2, title: "Kepatuhan PSAK 72 RI", sub: "Neraca, Laba Rugi & PPN 11%" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-900/50 p-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-white">{item.title}</div>
                  <div className="text-[11px] text-slate-400">{item.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6 Enterprise Architecture Pillars */}
      <section id="arsitektur" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Arsitektur Terpadu End-to-End
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Enam Pilar Inti yang Menghubungkan Front-Office hingga Pembukuan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Dirancang khusus untuk realitas operasional bisnis Indonesia — dari pesan pertama di
            WhatsApp hingga laporan Neraca dan slip gaji bulanan.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ENTERPRISE_PILLARS.map((p) => (
            <article
              key={p.code}
              className="group flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-emerald-500/40 hover:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-emerald-400">
                    MODUL {p.code}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    {p.subtitle}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-white">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.description}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-4">
                {p.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <RoiCalculator onSelectEditionForRegistration={jumpToRegistrationWithEdition} />

      {/* 4-Tier Transparent Commercial Pricing */}
      <section id="harga" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Skema Lisensi Transparan
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Mulai Gratis untuk UMKM, Tumbuh Mulus ke Skala Korporasi
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Tanpa biaya tersembunyi. Pilih edisi sesuai tahap bisnis Anda dan daftarkan perusahaan
            untuk langsung menerima akses privat aplikasi.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {COMMERCIAL_EDITIONS.map((ed) => (
            <div
              key={ed.id}
              className={`flex flex-col justify-between rounded-3xl border p-6 ${
                ed.highlighted
                  ? "border-emerald-400 bg-gradient-to-b from-emerald-950/40 to-slate-900 shadow-2xl shadow-emerald-950/50"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-extrabold text-white">{ed.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                      ed.highlighted
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {ed.badge}
                  </span>
                </div>
                <p className="mt-2 min-h-[36px] text-xs text-slate-400">{ed.tagline}</p>

                <div className="mt-5 border-y border-slate-800 py-4">
                  <div className="text-3xl font-black text-white">
                    {ed.monthlyPriceLabel}
                    {ed.monthlyValueIdr > 0 && (
                      <span className="text-xs font-normal text-slate-400"> /bln</span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-emerald-300">
                    {ed.annualPriceLabel}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="rounded-lg bg-slate-950/80 py-1.5 font-bold text-slate-300">
                    {ed.metrics.seats}
                  </div>
                  <div className="rounded-lg bg-slate-950/80 py-1.5 font-bold text-slate-300">
                    {ed.metrics.branches}
                  </div>
                  <div className="rounded-lg bg-slate-950/80 py-1.5 font-bold text-emerald-300">
                    {ed.metrics.aiAgents}
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  {ed.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => jumpToRegistrationWithEdition(ed.id)}
                className={`mt-6 w-full rounded-xl px-4 py-3 text-xs font-extrabold transition ${
                  ed.highlighted
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "border border-slate-700 bg-slate-950 text-white hover:border-emerald-500/50 hover:text-emerald-300"
                }`}
              >
                {ed.ctaLabel}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Industry Solutions */}
      <section id="industri" className="border-y border-slate-800/80 bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Teruji Lintas Sektor Bisnis
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Dirancang Menjawab Tantangan Nyata Lapangan
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {INDUSTRY_SOLUTIONS.map((sol) => (
              <div
                key={sol.sector}
                className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-extrabold text-white">{sol.sector}</h3>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-bold text-emerald-300">
                    {sol.kpi}
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  <p className="text-slate-400">
                    <strong className="text-rose-300">Tantangan:</strong> {sol.pain}
                  </p>
                  <p className="text-slate-200">
                    <strong className="text-emerald-300">Solusi WACRM:</strong> {sol.outcome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gated Registration & Private Access Unlock Portal */}
      <RegistrationPortal
        selectedEdition={selectedEdition}
        onChangeEdition={setSelectedEdition}
      />

      {/* Enterprise FAQ Accordion */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Pertanyaan Umum Enterprise
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Keamanan, Akses Online, Hardware &amp; Lisensi
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {ENTERPRISE_FAQS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-white hover:bg-slate-900"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-emerald-400 transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800 px-5 py-4 text-xs leading-relaxed text-slate-300">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pure-Free Original Enterprise Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-xs text-slate-400">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="space-y-2 md:col-span-2">
            <div className="text-sm font-black text-white">
              WACRM <span className="text-emerald-400">Enterprise</span> · PT WACRM Digital Nusantara
            </div>
            <p className="max-w-md leading-relaxed">
              Platform WhatsApp CRM Multi-Agent AI, ERP Multi-Gudang, Kasir POS, HRD Payroll &amp;
              Akuntansi PSAK 72 resmi untuk akselerasi digital UMKM dan Korporasi Indonesia.
            </p>
            <p className="text-[11px] text-slate-500">
              Desain &amp; kode sumber asli 100% bebas hak cipta pihak ketiga (Pure-Free Original
              Enterprise UI · MIT Lucide Icons · Tailwind CSS).
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-white">Navigasi</div>
            <ul className="space-y-1.5">
              <li>
                <a href="#arsitektur" className="hover:text-emerald-300">
                  Arsitektur 6 Pilar
                </a>
              </li>
              <li>
                <a href="#roi" className="hover:text-emerald-300">
                  Kalkulator ROI
                </a>
              </li>
              <li>
                <a href="#harga" className="hover:text-emerald-300">
                  Edisi &amp; Lisensi
                </a>
              </li>
              <li>
                <a href="#daftar" className="hover:text-emerald-300">
                  Pendaftaran Akses Privat
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-white">Keamanan &amp; Dukungan</div>
            <ul className="space-y-1.5">
              <li>Akses Privat Pasca-Registrasi</li>
              <li>Enkripsi TLS 1.3 &amp; AES-256-GCM</li>
              <li>Standar Akuntansi PSAK 72 RI</li>
              <li>Dukungan Multi-Agent AI 24/7</li>
            </ul>
          </div>
        </div>
      </footer>

      {/* 24/7 Live Multi-Agent AI Widget Connected to Publisher HQ */}
      <LiveAiChatWidget />
    </div>
  );
}
