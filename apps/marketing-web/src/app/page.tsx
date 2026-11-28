"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Lock, Sparkles } from "lucide-react";
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

const NAV_TABS: { id: SplitNavSection; label: string }[] = [
  { id: "index", label: "Index" },
  { id: "about", label: "Tentang" },
  { id: "pricing", label: "Harga" },
  { id: "register", label: "Daftar" },
];

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
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function switchTab(next: SplitNavSection) {
    setSection(next);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F5F2EB] lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* =====================================================================
          LEFT COLUMN (DESKTOP 50% SPLIT PANEL) / MAIN ADAPTIVE FLOW (MOBILE & TABLET)
          ===================================================================== */}
      <section className="paper-grain flex w-full flex-1 flex-col justify-between bg-[#F5F2EB] lg:h-screen lg:w-1/2 lg:flex-none lg:border-r lg:border-[#141311]/15">
        {/* ADAPTIVE STICKY HEADER — Zero overflow on 320px–360px Android, 1-row on Tablet & Desktop */}
        <header className="sticky top-0 z-30 border-b border-[#141311]/12 bg-[#F5F2EB]/95 backdrop-blur-md lg:static lg:bg-transparent lg:backdrop-blur-none">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-5">
            <button
              type="button"
              onClick={() => switchTab("index")}
              className="flex min-w-0 items-baseline gap-2 text-left md:block"
            >
              <div className="font-editorial text-xl font-semibold tracking-tight text-[#141311]">
                WACRM<span className="italic text-[#0F5132]">.</span>
              </div>
              <div className="font-mono-meta whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[#6C675E]">
                <span className="sm:hidden">v5.3.2</span>
                <span className="hidden sm:inline">Commercial OS · v5.3.2</span>
              </div>
            </button>

            {/* Tablet & Desktop Horizontal Nav (md+) */}
            <nav aria-label="Navigasi utama" className="hidden items-center gap-5 md:flex lg:gap-6">
              {NAV_TABS.map((nav) => {
                const active = section === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => switchTab(nav.id)}
                    className={`font-mono-meta relative whitespace-nowrap pb-1 text-[11px] uppercase tracking-[0.16em] transition ${
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

            {/* Mobile Quick Register CTA (< md) */}
            <button
              type="button"
              onClick={() => openRegistration(selectedEdition)}
              className="font-mono-meta inline-flex shrink-0 items-center gap-1 whitespace-nowrap bg-[#141311] px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-[#F5F2EB] transition active:scale-95 md:hidden"
            >
              Daftar <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Mobile 4-Column Full-Width Segmented Tab Bar (< md) — Touch-friendly 42px height, zero cutoff */}
          <nav
            aria-label="Navigasi mobile"
            className="grid grid-cols-4 border-t border-[#141311]/10 md:hidden"
          >
            {NAV_TABS.map((nav) => {
              const active = section === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => switchTab(nav.id)}
                  className={`font-mono-meta relative py-2.5 text-center text-[11px] uppercase tracking-[0.12em] transition ${
                    active
                      ? "bg-[#141311]/[0.04] font-semibold text-[#141311]"
                      : "text-[#6C675E] active:bg-[#141311]/[0.05]"
                  }`}
                >
                  {nav.label}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#141311]" />
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        {/* ===================================================================
            MOBILE & TABLET ABOVE-THE-FOLD VISUAL SHOWCASE (< lg ONLY)
            Ensures Android phones & tablets immediately see the rich editorial
            visual hero, active module preview, metrics & CTA on first paint!
            =================================================================== */}
        <div className="relative z-10 px-4 pt-4 sm:px-8 sm:pt-6 lg:hidden">
          {section === "index" && (
            <div className="relative overflow-hidden border border-[#141311]/15 bg-[#111110] text-[#F5F2EB] shadow-md">
              {/* Background Architectural Image */}
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`mobile-${activeItem.image}`}
                  src={activeItem.image}
                  alt={activeItem.title}
                  className="h-full w-full object-cover opacity-75 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0C] via-[#0D0D0C]/70 to-[#0D0D0C]/40" />
              </div>

              {/* Hero Overlay Content */}
              <div
                key={`mobile-content-${activeItem.id}`}
                className="split-panel-enter relative z-10 flex flex-col justify-between gap-4 p-4 sm:p-6 md:grid md:grid-cols-12 md:items-end md:gap-5"
              >
                <div className="space-y-2.5 md:col-span-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono-meta border border-[#F5F2EB]/25 bg-[#141311]/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300 backdrop-blur">
                      {activeItem.num} / 08 · {activeItem.category}
                    </span>
                    <span className="font-mono-meta inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#F5F2EB]/75">
                      <Lock className="h-3 w-3 text-emerald-300" /> Akses Privat
                    </span>
                  </div>

                  <h1 className="font-editorial text-2xl font-normal leading-tight text-[#F5F2EB] sm:text-3xl">
                    {activeItem.title}
                  </h1>
                  <p className="text-xs leading-relaxed text-[#F5F2EB]/85 sm:text-sm">
                    {activeItem.summary}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activeItem.highlights.map((h) => (
                      <span
                        key={h}
                        className="font-mono-meta border border-[#F5F2EB]/20 bg-[#141311]/60 px-2 py-0.5 text-[10px] text-[#F5F2EB]/90"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metrics & CTA Column */}
                <div className="space-y-3 md:col-span-6">
                  <div className="grid grid-cols-3 gap-2">
                    {activeItem.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="border border-[#F5F2EB]/20 bg-[#141311]/75 p-2.5 backdrop-blur-md"
                      >
                        <div className="font-mono-meta truncate text-[9px] uppercase tracking-wider text-[#F5F2EB]/65">
                          {m.label}
                        </div>
                        <div className="font-editorial mt-0.5 whitespace-nowrap text-base font-medium text-[#F5F2EB] sm:text-lg">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeItem.suggestedEdition) {
                        setSelectedEdition(activeItem.suggestedEdition);
                      }
                      switchTab(activeItem.actionTarget);
                    }}
                    className="font-mono-meta inline-flex w-full items-center justify-center gap-1.5 border border-[#F5F2EB] bg-[#F5F2EB] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-[#141311] transition hover:bg-transparent hover:text-[#F5F2EB]"
                  >
                    {activeItem.actionLabel} <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {section === "about" && (
            <div className="relative overflow-hidden border border-[#141311]/15 bg-[#111110] p-5 text-[#F5F2EB] sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/split-06-hrd.jpg"
                alt="PT WACRM Digital Nusantara"
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0C] via-[#0D0D0C]/70 to-[#0D0D0C]/45" />
              <div className="relative z-10 space-y-2">
                <span className="font-mono-meta text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                  Profil &amp; ROI Enterprise
                </span>
                <p className="font-editorial text-xl italic leading-snug sm:text-2xl">
                  &ldquo;Pertumbuhan bisnis skala enterprise lahir dari data yang bersih, respon
                  yang seketika, dan pembukuan yang selalu seimbang.&rdquo;
                </p>
              </div>
            </div>
          )}

          {section === "register" && (
            <div className="relative overflow-hidden border border-[#141311]/15 bg-[#111110] p-5 text-[#F5F2EB] sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/split-04-register.jpg"
                alt="Onboarding Privat WACRM"
                className="absolute inset-0 h-full w-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0C] via-[#0D0D0C]/75 to-[#0D0D0C]/45" />
              <div className="relative z-10 space-y-3">
                <span className="font-mono-meta text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                  Onboarding Privat Terverifikasi
                </span>
                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  <div className="border border-[#F5F2EB]/20 bg-[#141311]/70 p-3 backdrop-blur">
                    <div className="font-mono-meta text-[9px] uppercase tracking-widest text-emerald-300">
                      Langkah 01
                    </div>
                    <div className="mt-1 leading-snug text-[#F5F2EB]">
                      Isi data bisnis &amp; pilih edisi
                    </div>
                  </div>
                  <div className="border border-[#F5F2EB]/20 bg-[#141311]/70 p-3 backdrop-blur">
                    <div className="font-mono-meta text-[9px] uppercase tracking-widest text-emerald-300">
                      Langkah 02
                    </div>
                    <div className="mt-1 leading-snug text-[#F5F2EB]">
                      Akses privat terbuka &amp; lanjut ke Publisher HQ
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            SWAPPABLE MAIN CONTENT PANEL
            =================================================================== */}
        <div className="editorial-scroll relative z-10 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:overflow-y-auto lg:px-10 lg:py-9">
          {/* TAB 1: SIGNATURE 01–08 SPLIT INDEX (100% Untruncated Mobile/Tablet + Desktop Wipe) */}
          {section === "index" && (
            <div className="split-panel-enter flex h-full flex-col justify-between">
              <div>
                <div className="mb-3.5 flex items-center justify-between gap-2">
                  <span className="font-mono-meta whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-[#6C675E]">
                    <span className="sm:hidden">Ekosistem 2026</span>
                    <span className="hidden sm:inline">Ekosistem Enterprise — 2024 / 2026</span>
                  </span>
                  <span className="font-mono-meta hidden items-center gap-1 whitespace-nowrap text-[10px] uppercase tracking-widest text-[#0F5132] lg:inline-flex">
                    <Lock className="h-3 w-3" /> Akses Privat
                  </span>
                  <span className="font-mono-meta whitespace-nowrap text-[10px] uppercase tracking-widest text-[#0F5132] lg:hidden">
                    Ketuk Modul
                  </span>
                </div>

                {/* Responsive Grid: 1 col on Android Phone, 2 cols on Tablet, 1 clean list on Desktop Split */}
                <ul className="grid grid-cols-1 border-t border-[#141311]/15 md:grid-cols-2 md:gap-x-5 lg:grid-cols-1 lg:gap-x-0">
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
                            const isDesktop =
                              typeof window !== "undefined" && window.innerWidth >= 1024;
                            setActiveIndexId(item.id);
                            if (item.suggestedEdition) {
                              setSelectedEdition(item.suggestedEdition);
                            }
                            if (isDesktop && item.actionTarget !== "index") {
                              setSection(item.actionTarget);
                            } else if (!isDesktop) {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className="split-wipe-row flex w-full items-center justify-between gap-3 px-3 py-3.5 text-left lg:items-baseline lg:px-2.5 lg:py-4"
                        >
                          <div className="flex min-w-0 items-start gap-3.5 lg:items-baseline lg:gap-4">
                            <span className="font-mono-meta split-row-muted mt-1 shrink-0 text-[11px] tracking-widest text-[#6C675E] lg:mt-0">
                              {item.num}
                            </span>
                            <div className="min-w-0">
                              <div className="font-editorial text-lg font-normal leading-snug tracking-tight sm:text-xl lg:text-xl xl:text-2xl">
                                {item.title}
                              </div>
                              {/* Category displayed underneath on Android/Tablet so title NEVER truncates */}
                              <div className="font-mono-meta split-row-muted mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#6C675E] lg:hidden">
                                {item.category}
                              </div>
                            </div>
                          </div>

                          {/* Category aligned right on Desktop; compact chevron indicator on Mobile/Tablet */}
                          <span className="font-mono-meta split-row-muted hidden shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#6C675E] lg:inline">
                            {item.category}
                          </span>
                          <ChevronRight className="split-row-muted h-4 w-4 shrink-0 text-[#6C675E] lg:hidden" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.16em] text-[#6C675E]">
                  8 Modul Inti · Cloud &amp; Native Android/Windows
                </div>
                <button
                  type="button"
                  onClick={() => openRegistration("enterprise")}
                  className="font-mono-meta inline-flex items-center gap-1 border-b border-[#141311] pb-0.5 text-[11px] font-medium uppercase tracking-widest text-[#141311] transition hover:border-[#0F5132] hover:text-[#0F5132]"
                >
                  Daftar Akses Privat <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TENTANG STUDIO + INTERACTIVE ROI SIMULATOR */}
          {section === "about" && (
            <div className="split-panel-enter space-y-6 md:grid md:grid-cols-12 md:gap-7 md:space-y-0 lg:block lg:space-y-7">
              <div className="space-y-5 md:col-span-6 lg:col-span-12">
                <div className="space-y-3">
                  <div className="font-mono-meta text-[10px] uppercase tracking-[0.2em] text-[#6C675E]">
                    Tentang PT WACRM Digital Nusantara
                  </div>
                  <h1 className="font-editorial text-2xl font-normal leading-[1.18] tracking-tight text-[#141311] sm:text-3xl lg:text-4xl">
                    Kami menyatukan kerumitan operasional menjadi{" "}
                    <em className="italic text-[#0F5132]">satu kendali presisi</em>.
                  </h1>
                  <p className="text-sm leading-relaxed text-[#524E47]">
                    WACRM Commercial OS v5.3.2 dirancang khusus untuk realitas bisnis Indonesia —
                    menghubungkan percakapan pertama di WhatsApp, 11 Agen AI otonom, gudang FIFO
                    multi-cabang, kasir POS hardware-ready, HRD Payroll, hingga laporan Neraca PSAK
                    72 dalam satu arsitektur terenkripsi AES-256-GCM.
                  </p>
                </div>

                {/* Signature 3-Column Editorial Stats */}
                <div className="grid grid-cols-3 gap-3 border-y border-[#141311]/15 py-4 sm:gap-4 sm:py-5">
                  <div>
                    <div className="font-editorial text-2xl text-[#141311] sm:text-3xl">11+</div>
                    <div className="font-mono-meta mt-1 text-[9px] uppercase tracking-wider text-[#6C675E] sm:text-[10px]">
                      Agen AI 24/7
                    </div>
                  </div>
                  <div>
                    <div className="font-editorial text-2xl text-[#141311] sm:text-3xl">100%</div>
                    <div className="font-mono-meta mt-1 text-[9px] uppercase tracking-wider text-[#6C675E] sm:text-[10px]">
                      Balance PSAK
                    </div>
                  </div>
                  <div>
                    <div className="font-editorial text-2xl text-[#0F5132] sm:text-3xl">Rp 0</div>
                    <div className="font-mono-meta mt-1 text-[9px] uppercase tracking-wider text-[#6C675E] sm:text-[10px]">
                      Starter UMKM
                    </div>
                  </div>
                </div>
              </div>

              {/* Editorial ROI Simulator */}
              <div className="space-y-4 border border-[#141311]/15 bg-[#ECE7DC]/70 p-4 sm:p-5 md:col-span-6 lg:col-span-12">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono-meta text-[10px] uppercase tracking-widest text-[#141311]">
                    Simulasi ROI Operasional
                  </span>
                  <span className="font-mono-meta inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#0F5132]">
                    <Sparkles className="h-3 w-3" /> {roiCalc.recName}
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-[#524E47]">Jumlah Cabang / Gudang</span>
                      <span className="font-mono-meta font-medium">{branches} Cabang</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={branches}
                      onChange={(e) => setBranches(Number(e.target.value))}
                      className="h-2 w-full accent-[#141311]"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-[#524E47]">Staf Operasional &amp; Sales</span>
                      <span className="font-mono-meta font-medium">{staffCount} Staf</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={80}
                      value={staffCount}
                      onChange={(e) => setStaffCount(Number(e.target.value))}
                      className="h-2 w-full accent-[#141311]"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-[#524E47]">Chat Prospek WA / Hari</span>
                      <span className="font-mono-meta font-medium">{dailyChats} Chat/Hari</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={800}
                      step={10}
                      value={dailyChats}
                      onChange={(e) => setDailyChats(Number(e.target.value))}
                      className="h-2 w-full accent-[#141311]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-[#141311]/15 pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-mono-meta text-[10px] uppercase tracking-wider text-[#6C675E]">
                      Estimasi Efisiensi &amp; Omzet / Bulan
                    </div>
                    <div className="font-editorial text-2xl font-semibold text-[#0F5132]">
                      {formatIdr(roiCalc.monthlyImpact)}
                    </div>
                    <div className="font-mono-meta text-[10px] text-[#6C675E]">
                      {roiCalc.savedHours} jam/bln · {formatIdr(roiCalc.annualImpact)}/thn
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRegistration(roiCalc.rec)}
                    className="split-wipe-btn font-mono-meta w-full px-4 py-2.5 text-center text-[10px] uppercase tracking-widest sm:w-auto sm:py-2"
                  >
                    Aktifkan {roiCalc.recName} →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 4 COMMERCIAL EDITIONS (1 col Mobile, 2x2 Grid Tablet, Editorial List Desktop) */}
          {section === "pricing" && (
            <div className="split-panel-enter space-y-5">
              <div>
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.2em] text-[#6C675E]">
                  Skema Lisensi Komersial — v5.3.2
                </div>
                <h1 className="font-editorial mt-1.5 text-2xl font-normal text-[#141311] sm:text-3xl">
                  Empat jenjang transparan,{" "}
                  <em className="italic text-[#0F5132]">mulai gratis</em>.
                </h1>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 lg:gap-0 lg:border-t lg:border-[#141311]/15">
                {COMMERCIAL_EDITIONS.map((ed, idx) => {
                  const active = hoveredEditionId === ed.id;
                  return (
                    <div
                      key={ed.id}
                      onMouseEnter={() => setHoveredEditionId(ed.id)}
                      className={`flex flex-col justify-between border border-[#141311]/15 p-4 transition lg:border-x-0 lg:border-t-0 lg:px-3 lg:py-4 ${
                        active ? "bg-[#ECE7DC]/80" : "bg-[#F5F2EB] hover:bg-[#ECE7DC]/40"
                      }`}
                    >
                      <div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-meta text-[11px] text-[#6C675E]">
                                0{idx + 1}
                              </span>
                              <h2 className="font-editorial text-xl text-[#141311]">{ed.name}</h2>
                              <span className="font-mono-meta whitespace-nowrap border border-[#141311]/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#0F5132]">
                                {ed.badge}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2 sm:block sm:shrink-0 sm:text-right">
                            <div className="font-mono-meta text-base font-semibold text-[#141311] sm:text-sm">
                              {ed.monthlyPriceLabel}
                              {ed.monthlyValueIdr > 0 && (
                                <span className="text-[10px] font-normal text-[#6C675E]">/bln</span>
                              )}
                            </div>
                            <div className="font-mono-meta text-[10px] text-[#6C675E] lg:hidden">
                              {ed.annualPriceLabel}
                            </div>
                          </div>
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-[#524E47] lg:pl-7">
                          {ed.tagline}
                        </p>

                        {/* Show full feature checklist directly on Mobile & Tablet (shown on Right Canvas on Desktop) */}
                        <ul className="mt-3 space-y-1.5 border-t border-[#141311]/10 pt-3 text-xs text-[#2E2C28] lg:hidden">
                          {ed.features.slice(0, 4).map((feat) => (
                            <li key={feat} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F5132]" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-between lg:mt-3 lg:pl-7 lg:pt-0">
                        <div className="font-mono-meta text-[10px] text-[#6C675E]">
                          {ed.metrics.seats} · {ed.metrics.branches} · {ed.metrics.aiAgents}
                        </div>
                        <button
                          type="button"
                          onClick={() => openRegistration(ed.id)}
                          className="split-wipe-btn font-mono-meta w-full px-3.5 py-2 text-center text-[10px] uppercase tracking-widest sm:w-auto sm:py-1.5"
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
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.2em] text-[#6C675E]">
                  Gerbang Pendaftaran &amp; Akses Privat Resmi
                </div>
                <h1 className="font-editorial mt-1.5 text-2xl font-normal text-[#141311] sm:text-3xl">
                  Mulai aktivasi <em className="italic text-[#0F5132]">perusahaan Anda</em>.
                </h1>
              </div>
              <RegistrationPortal
                selectedEdition={selectedEdition}
                onChangeEdition={setSelectedEdition}
              />
            </div>
          )}
        </div>

        {/* SINGLE BOTTOM FOOTER — Safe pb-20 on mobile/tablet so floating AI button NEVER overlaps text */}
        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#141311]/12 px-4 pb-20 pt-4 sm:px-8 lg:px-10 lg:py-3.5">
          <span className="font-mono-meta text-[10px] uppercase tracking-[0.14em] text-[#6C675E]">
            PT WACRM Digital Nusantara · Pure-Free Enterprise UI
          </span>
          <span className="font-mono-meta text-[10px] text-[#6C675E]">
            TLS 1.3 · AES-256-GCM · PSAK 72
          </span>
        </footer>
      </section>

      {/* =====================================================================
          RIGHT 50% — FULL-HEIGHT CINEMATIC IMAGE & LIVE CANVAS (DESKTOP lg+ ONLY)
          On Mobile & Tablet (< lg), the visual hero already renders at the TOP
          of the page above the fold, eliminating duplicate below-the-fold panels!
          ===================================================================== */}
      <aside className="relative hidden lg:flex lg:h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:overflow-hidden bg-[#111110] text-[#F5F2EB]">
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
        <div className="relative z-10 flex items-center justify-between px-10 py-5">
          <span className="font-mono-meta border border-[#F5F2EB]/25 bg-[#141311]/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#F5F2EB] backdrop-blur">
            {section === "index"
              ? `${activeItem.num} / 08 · ${activeItem.category}`
              : section === "pricing"
                ? `LISENSI · ${hoveredEdition.name.toUpperCase()}`
                : section === "about"
                  ? "PROFIL & ROI ENTERPRISE"
                  : "ONBOARDING PRIVAT TERVERIFIKASI"}
          </span>
          <span className="font-mono-meta text-[10px] uppercase tracking-[0.2em] text-[#F5F2EB]/75">
            Indonesia · Cloud &amp; Native
          </span>
        </div>

        {/* Center/Bottom Editorial Showcase Overlay */}
        <div className="relative z-10 space-y-5 px-10 pb-20 pt-8">
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
                    <div className="font-editorial mt-1 text-xl text-[#F5F2EB]">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-[#F5F2EB]/20 pt-4">
                <div className="font-mono-meta text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                  {activeItem.category} — {activeItem.year}
                </div>
                <h2 className="font-editorial text-4xl font-normal leading-tight text-[#F5F2EB]">
                  {activeItem.title}
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-[#F5F2EB]/80">
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
              <p className="font-editorial text-3xl italic leading-snug text-[#F5F2EB]">
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
              <p className="font-editorial text-3xl italic leading-snug text-[#F5F2EB]">
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
