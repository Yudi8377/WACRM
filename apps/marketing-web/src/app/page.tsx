"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Lock, Sparkles } from "lucide-react";
import {
  COMMERCIAL_EDITIONS,
  formatIdr,
  type CommercialEditionId,
} from "@/lib/enterprise-catalog";
import {
  SPLIT_INDEX_ITEMS,
  type SplitNavSection,
} from "@/lib/split-index-items";
import { RegistrationPortal } from "@/components/registration-portal";
import { LiveAiChatWidget } from "@/components/live-ai-chat-widget";

export default function SplitIndexEnterprisePage() {
  const [section, setSection] = useState<SplitNavSection>("index");
  const [activeIndexId, setActiveIndexId] = useState<string>(SPLIT_INDEX_ITEMS[0].id);
  const [selectedEdition, setSelectedEdition] = useState<CommercialEditionId>("enterprise");
  const [hoveredEditionId, setHoveredEditionId] = useState<CommercialEditionId>("enterprise");

  // Compact ROI calculator inside the "Tentang" editorial panel
  const [branches, setBranches] = useState(4);
  const [staffCount, setStaffCount] = useState(14);
  const [dailyChats, setDailyChats] = useState(180);

  const roiCalc = useMemo(() => {
    const legacySoftwareCost = branches * 450_000 + staffCount * 85_000;
    const savedHours = branches * 18 + Math.round(dailyChats * 0.18);
    const laborValue = savedHours * 45_000;
    const recoveredRev = dailyChats * 30 * 0.015 * 220_000;
    let rec: CommercialEditionId = "pro";
    let monthlyCost = 249_000;
    let recName = "Growth Pro";
    if (branches <= 1 && staffCount <= 2) {
      rec = "starter";
      monthlyCost = 0;
      recName = "Starter UMKM (Gratis)";
    } else if (branches > 20 || staffCount > 50) {
      rec = "sovereign";
      monthlyCost = 1_950_000;
      recName = "Sovereign Corporate";
    } else if (branches > 5 || staffCount > 10 || dailyChats >= 150) {
      rec = "enterprise";
      monthlyCost = 699_000;
      recName = "Enterprise AI";
    }
    const monthlyImpact = Math.max(0, legacySoftwareCost - monthlyCost) + laborValue + recoveredRev;
    return {
      rec,
      recName,
      savedHours,
      monthlyImpact,
      annualImpact: monthlyImpact * 12,
    };
  }, [branches, staffCount, dailyChats]);

  const activeItem =
    SPLIT_INDEX_ITEMS.find((i) => i.id === activeIndexId) ?? SPLIT_INDEX_ITEMS[0];
  const hoveredEdition =
    COMMERCIAL_EDITIONS.find((e) => e.id === hoveredEditionId) ?? COMMERCIAL_EDITIONS[2];

  // Determine active full-bleed canvas image + editorial overlay based on current tab
  const canvasImage =
    section === "about"
      ? "/images/split-06-hrd.jpg"
      : section === "register"
        ? "/images/split-04-register.jpg"
        : section === "pricing"
          ? hoveredEdition.id === "sovereign"
            ? "/images/split-03-finance.jpg"
            : hoveredEdition.id === "enterprise"
              ? "/images/split-01-crm.jpg"
              : hoveredEdition.id === "pro"
                ? "/images/split-02-erp.jpg"
                : "/images/split-05-pos.jpg"
          : activeItem.image;

  function openRegistration(ed?: CommercialEditionId) {
    if (ed) setSelectedEdition(ed);
    setSection("register");
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* LEFT 50% — WARM ARCHIVAL PAPER EDITORIAL SPLIT PANEL (TemplateMo 616 Split Index UX/UI) */}
      <section className="paper-grain flex min-h-screen w-full flex-col justify-between border-b border-[#141311]/15 bg-[#F5F2EB] lg:h-screen lg:w-1/2 lg:border-b-0 lg:border-r">
        {/* Minimal Editorial Top Header */}
        <header className="relative z-10 flex items-center justify-between gap-4 border-b border-[#141311]/12 px-6 py-5 sm:px-10">
          <button
            type="button"
            onClick={() => setSection("index")}
            className="text-left"
          >
            <div className="font-editorial text-xl font-semibold tracking-tight text-[#141311]">
              WACRM<span className="italic text-[#0F5132]">.</span>
            </div>
            <div className="font-mono-meta text-[10px] uppercase tracking-[0.2em] text-[#6C675E]">
              Commercial OS · v5.3.2
            </div>
          </button>

          <nav className="flex items-center gap-4 sm:gap-6">
            {[
              { id: "index", label: "Index" },
              { id: "about", label: "Tentang" },
              { id: "pricing", label: "Harga" },
              { id: "register", label: "Daftar" },
            ].map((nav) => {
              const active = section === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setSection(nav.id as SplitNavSection)}
                  className={`font-mono-meta relative pb-1 text-[11px] uppercase tracking-[0.16em] transition ${
                    active ? "font-medium text-[#141311]" : "text-[#6C675E] hover:text-[#141311]"
                  }`}
                >
                  {nav.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#141311]" />
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        {/* Swappable Left Panel Content */}
        <div className="editorial-scroll relative z-10 flex-1 overflow-y-auto px-6 py-7 sm:px-10 sm:py-9">
          {/* TAB 1: SIGNATURE 01–08 SPLIT INDEX */}
          {section === "index" && (
            <div className="split-panel-enter flex h-full flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono-meta text-[10px] uppercase tracking-[0.22em] text-[#6C675E]">
                    Ekosistem Enterprise — 2024 / 2026
                  </span>
                  <span className="font-mono-meta hidden items-center gap-1 text-[10px] uppercase tracking-widest text-[#0F5132] sm:inline-flex">
                    <Lock className="h-3 w-3" /> Akses Privat
                  </span>
                </div>

                <ul className="border-t border-[#141311]/15">
                  {SPLIT_INDEX_ITEMS.map((item) => {
                    const active = activeItem.id === item.id;
                    return (
                      <li key={item.id} className="border-b border-[#141311]/15">
                        <button
                          type="button"
                          data-active={active}
                          onMouseEnter={() => setActiveIndexId(item.id)}
                          onFocus={() => setActiveIndexId(item.id)}
                          onClick={() => {
                            setActiveIndexId(item.id);
                            if (item.suggestedEdition) {
                              setSelectedEdition(item.suggestedEdition);
                            }
                            if (item.actionTarget !== "index") {
                              setSection(item.actionTarget);
                            }
                          }}
                          className="split-wipe-row flex w-full items-baseline justify-between gap-3 px-2.5 py-3.5 text-left sm:py-4"
                        >
                          <div className="flex min-w-0 items-baseline gap-4">
                            <span className="font-mono-meta split-row-muted text-[11px] tracking-widest text-[#6C675E]">
                              {item.num}
                            </span>
                            <span className="font-editorial truncate text-xl font-normal tracking-tight sm:text-2xl">
                              {item.title}
                            </span>
                          </div>
                          <span className="font-mono-meta split-row-muted shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#6C675E]">
                            {item.category}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.18em] text-[#6C675E]">
                  8 Modul Inti · Arahkan Kursor / Ketuk Pratinjau
                </div>
                <button
                  type="button"
                  onClick={() => openRegistration("enterprise")}
                  className="font-mono-meta inline-flex items-center gap-1 border-b border-[#141311] pb-0.5 text-[11px] uppercase tracking-widest text-[#141311] transition hover:border-[#0F5132] hover:text-[#0F5132]"
                >
                  Daftar Akses Privat <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TENTANG STUDIO + INTERACTIVE ROI SIMULATOR */}
          {section === "about" && (
            <div className="split-panel-enter space-y-7">
              <div className="space-y-3">
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.22em] text-[#6C675E]">
                  Tentang PT WACRM Digital Nusantara
                </div>
                <h1 className="font-editorial text-3xl font-normal leading-[1.15] tracking-tight text-[#141311] sm:text-4xl">
                  Kami menyatukan kerumitan operasional menjadi{" "}
                  <em className="italic text-[#0F5132]">satu kendali presisi</em>.
                </h1>
                <p className="text-sm leading-relaxed text-[#524E47]">
                  WACRM Commercial OS v5.3.2 dirancang khusus untuk realitas bisnis Indonesia —
                  menghubungkan percakapan pertama di WhatsApp, 11 Agen AI otonom, gudang FIFO
                  multi-cabang, kasir POS hardware-ready, HRD Payroll, hingga laporan Neraca PSAK 72
                  dalam satu arsitektur terenkripsi AES-256-GCM.
                </p>
              </div>

              {/* Signature 3-Column Editorial Stats */}
              <div className="grid grid-cols-3 gap-4 border-y border-[#141311]/15 py-5">
                <div>
                  <div className="font-editorial text-3xl text-[#141311]">11+</div>
                  <div className="font-mono-meta mt-1 text-[10px] uppercase tracking-widest text-[#6C675E]">
                    Agen AI 24/7
                  </div>
                </div>
                <div>
                  <div className="font-editorial text-3xl text-[#141311]">100%</div>
                  <div className="font-mono-meta mt-1 text-[10px] uppercase tracking-widest text-[#6C675E]">
                    Balance PSAK
                  </div>
                </div>
                <div>
                  <div className="font-editorial text-3xl text-[#0F5132]">Rp 0</div>
                  <div className="font-mono-meta mt-1 text-[10px] uppercase tracking-widest text-[#6C675E]">
                    Starter UMKM
                  </div>
                </div>
              </div>

              {/* Editorial ROI Simulator */}
              <div className="space-y-4 border border-[#141311]/15 bg-[#ECE7DC]/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-meta text-[10px] uppercase tracking-widest text-[#141311]">
                    Simulasi ROI Operasional
                  </span>
                  <span className="font-mono-meta inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#0F5132]">
                    <Sparkles className="h-3 w-3" /> {roiCalc.recName}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-[#524E47]">Jumlah Cabang / Gudang</span>
                      <span className="font-mono-meta font-medium">{branches} Cabang</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={branches}
                      onChange={(e) => setBranches(Number(e.target.value))}
                      className="w-full accent-[#141311]"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-[#524E47]">Jumlah Staf Operasional &amp; Sales</span>
                      <span className="font-mono-meta font-medium">{staffCount} Staf</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={80}
                      value={staffCount}
                      onChange={(e) => setStaffCount(Number(e.target.value))}
                      className="w-full accent-[#141311]"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-[#524E47]">Volume Chat Prospek WA / Hari</span>
                      <span className="font-mono-meta font-medium">{dailyChats} Chat/Hari</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={800}
                      step={10}
                      value={dailyChats}
                      onChange={(e) => setDailyChats(Number(e.target.value))}
                      className="w-full accent-[#141311]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#141311]/15 pt-4">
                  <div>
                    <div className="font-mono-meta text-[10px] uppercase tracking-wider text-[#6C675E]">
                      Estimasi Efisiensi &amp; Omzet / Bulan
                    </div>
                    <div className="font-editorial text-2xl font-semibold text-[#0F5132]">
                      {formatIdr(roiCalc.monthlyImpact)}
                    </div>
                    <div className="font-mono-meta text-[10px] text-[#6C675E]">
                      {roiCalc.savedHours} jam/bln terhemat · {formatIdr(roiCalc.annualImpact)}/thn
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRegistration(roiCalc.rec)}
                    className="split-wipe-btn font-mono-meta px-4 py-2 text-[10px] uppercase tracking-widest"
                  >
                    Aktifkan {roiCalc.recName} →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 4 COMMERCIAL EDITIONS */}
          {section === "pricing" && (
            <div className="split-panel-enter space-y-5">
              <div>
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.22em] text-[#6C675E]">
                  Skema Lisensi Komersial — v5.3.2
                </div>
                <h2 className="font-editorial mt-1.5 text-3xl font-normal text-[#141311]">
                  Empat jenjang transparan,{" "}
                  <em className="italic text-[#0F5132]">mulai gratis</em>.
                </h2>
              </div>

              <div className="border-t border-[#141311]/15">
                {COMMERCIAL_EDITIONS.map((ed, idx) => {
                  const active = hoveredEditionId === ed.id;
                  return (
                    <div
                      key={ed.id}
                      onMouseEnter={() => setHoveredEditionId(ed.id)}
                      className={`border-b border-[#141311]/15 px-3 py-4 transition ${
                        active ? "bg-[#ECE7DC]/80" : "hover:bg-[#ECE7DC]/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-3">
                          <span className="font-mono-meta text-[11px] text-[#6C675E]">
                            0{idx + 1}
                          </span>
                          <h3 className="font-editorial text-xl text-[#141311]">{ed.name}</h3>
                          <span className="font-mono-meta border border-[#141311]/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#0F5132]">
                            {ed.badge}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono-meta text-sm font-medium text-[#141311]">
                            {ed.monthlyPriceLabel}
                          </span>
                          {ed.monthlyValueIdr > 0 && (
                            <span className="font-mono-meta text-[10px] text-[#6C675E]"> /bln</span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1.5 pl-7 text-xs text-[#524E47]">{ed.tagline}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-7">
                        <div className="font-mono-meta text-[10px] text-[#6C675E]">
                          {ed.metrics.seats} · {ed.metrics.branches} · {ed.metrics.aiAgents}
                        </div>
                        <button
                          type="button"
                          onClick={() => openRegistration(ed.id)}
                          className="split-wipe-btn font-mono-meta px-3.5 py-1.5 text-[10px] uppercase tracking-widest"
                        >
                          {ed.ctaLabel} →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: EDITORIAL UNDERLINE GATED REGISTRATION PORTAL */}
          {section === "register" && (
            <div id="daftar" className="split-panel-enter space-y-5">
              <div>
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.22em] text-[#6C675E]">
                  Gerbang Pendaftaran &amp; Akses Privat Resmi
                </div>
                <h2 className="font-editorial mt-1.5 text-3xl font-normal text-[#141311]">
                  Mulai aktivasi <em className="italic text-[#0F5132]">perusahaan Anda</em>.
                </h2>
              </div>
              <RegistrationPortal
                selectedEdition={selectedEdition}
                onChangeEdition={setSelectedEdition}
              />
            </div>
          )}
        </div>

        {/* Minimal Editorial Footer Strip */}
        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#141311]/12 px-6 py-3.5 sm:px-10">
          <span className="font-mono-meta text-[10px] uppercase tracking-[0.14em] text-[#6C675E]">
            PT WACRM Digital Nusantara · Pure-Free Enterprise UI
          </span>
          <span className="font-mono-meta text-[10px] text-[#6C675E]">
            TLS 1.3 · AES-256-GCM · PSAK 72
          </span>
        </footer>
      </section>

      {/* RIGHT 50% — FULL-HEIGHT CINEMATIC IMAGE & LIVE ENTERPRISE CANVAS */}
      <aside className="relative flex min-h-[540px] w-full flex-col justify-between overflow-hidden bg-[#111110] text-[#F5F2EB] lg:h-screen lg:w-1/2">
        {/* Smooth Fade & Scale Editorial Background Image Layer */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={canvasImage}
            src={canvasImage}
            alt="WACRM Enterprise Editorial Canvas"
            className="h-full w-full object-cover opacity-80 transition-all duration-700 ease-out"
            style={{ transform: "scale(1.02)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0C] via-[#0D0D0C]/45 to-[#0D0D0C]/35" />
        </div>

        {/* Top Canvas Metadata Bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <span className="font-mono-meta border border-[#F5F2EB]/25 bg-[#141311]/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#F5F2EB] backdrop-blur">
            {section === "index"
              ? `${activeItem.num} / 08 · ${activeItem.category}`
              : section === "pricing"
                ? `LISENSI · ${hoveredEdition.name.toUpperCase()}`
                : section === "about"
                  ? "PROFIL & ROI ENTERPRISE"
                  : "ONBOARDING PRIVAT TERVERIFIKASI"}
          </span>
          <span className="font-mono-meta hidden text-[10px] uppercase tracking-[0.2em] text-[#F5F2EB]/75 sm:inline">
            Indonesia · Cloud &amp; Native
          </span>
        </div>

        {/* Center/Bottom Editorial Showcase Overlay */}
        <div className="relative z-10 space-y-5 px-6 pb-20 pt-8 sm:px-10 lg:pb-14">
          {section === "index" && (
            <div key={activeItem.id} className="split-panel-enter space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                {activeItem.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="border border-[#F5F2EB]/15 bg-[#141311]/70 p-3 backdrop-blur-md"
                  >
                    <div className="font-mono-meta text-[9px] uppercase tracking-widest text-[#F5F2EB]/60">
                      {m.label}
                    </div>
                    <div className="font-editorial mt-1 text-lg text-[#F5F2EB] sm:text-xl">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-[#F5F2EB]/20 pt-4">
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                  {activeItem.category} — {activeItem.year}
                </div>
                <h2 className="font-editorial text-3xl font-normal leading-tight text-[#F5F2EB] sm:text-4xl">
                  {activeItem.title}
                </h2>
                <p className="max-w-lg text-xs leading-relaxed text-[#F5F2EB]/80 sm:text-sm">
                  {activeItem.summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {activeItem.highlights.map((h) => (
                    <span
                      key={h}
                      className="font-mono-meta border border-[#F5F2EB]/20 bg-[#141311]/55 px-2.5 py-1 text-[10px] text-[#F5F2EB]/90 backdrop-blur"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeItem.suggestedEdition) setSelectedEdition(activeItem.suggestedEdition);
                    setSection(activeItem.actionTarget);
                  }}
                  className="font-mono-meta inline-flex items-center gap-1.5 border border-[#F5F2EB] bg-[#F5F2EB] px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-[#141311] transition hover:bg-transparent hover:text-[#F5F2EB]"
                >
                  {activeItem.actionLabel} <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {section === "pricing" && (
            <div key={hoveredEdition.id} className="split-panel-enter space-y-4">
              <div className="border border-[#F5F2EB]/20 bg-[#141311]/75 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-meta text-[10px] uppercase tracking-widest text-emerald-300">
                    {hoveredEdition.badge}
                  </span>
                  <span className="font-mono-meta text-xs text-[#F5F2EB]/80">
                    {hoveredEdition.annualPriceLabel}
                  </span>
                </div>
                <h3 className="font-editorial mt-2 text-3xl text-[#F5F2EB]">
                  {hoveredEdition.name}
                </h3>
                <p className="mt-1 text-xs text-[#F5F2EB]/75">{hoveredEdition.tagline}</p>
                <ul className="mt-4 space-y-2 border-t border-[#F5F2EB]/15 pt-4 text-xs text-[#F5F2EB]/90">
                  {hoveredEdition.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {section === "about" && (
            <div className="split-panel-enter max-w-md space-y-3">
              <p className="font-editorial text-2xl italic leading-snug text-[#F5F2EB] sm:text-3xl">
                &ldquo;Pertumbuhan bisnis skala enterprise lahir dari data yang bersih, respon yang
                seketika, dan pembukuan yang selalu seimbang.&rdquo;
              </p>
              <div className="font-mono-meta text-[11px] uppercase tracking-[0.2em] text-[#F5F2EB]/70">
                — PT WACRM Digital Nusantara
              </div>
            </div>
          )}

          {section === "register" && (
            <div className="split-panel-enter max-w-md space-y-4">
              <p className="font-editorial text-2xl italic leading-snug text-[#F5F2EB] sm:text-3xl">
                &ldquo;Satu pendaftaran membuka akses privat aplikasi sekaligus mengaktifkan
                pendampingan 5 Agen AI kami secara otomatis.&rdquo;
              </p>
              <div className="font-mono-meta text-[11px] uppercase tracking-[0.2em] text-[#F5F2EB]/70">
                — WACRM Publisher HQ Onboarding
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2 text-[11px]">
                <div className="border border-[#F5F2EB]/20 bg-[#141311]/65 p-3 backdrop-blur">
                  <div className="font-mono-meta text-[9px] uppercase tracking-widest text-emerald-300">
                    Langkah 01
                  </div>
                  <div className="mt-1 text-[#F5F2EB]">Kirim data perusahaan &amp; pilih edisi</div>
                </div>
                <div className="border border-[#F5F2EB]/20 bg-[#141311]/65 p-3 backdrop-blur">
                  <div className="font-mono-meta text-[9px] uppercase tracking-widest text-emerald-300">
                    Langkah 02
                  </div>
                  <div className="mt-1 text-[#F5F2EB]">
                    Akses privat terbuka &amp; lanjut ke Publisher HQ
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 24/7 Live Multi-Agent AI Concierge Widget Connected to Publisher HQ */}
      <LiveAiChatWidget onOpenRegister={() => openRegistration()} />
    </div>
  );
}
