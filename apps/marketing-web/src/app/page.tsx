"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Globe,
  Layers,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  Quote,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import {
  COMMERCIAL_EDITIONS,
  formatIdr,
  type CommercialEditionId,
} from "@/lib/enterprise-catalog";
import { SPLIT_INDEX_ITEMS } from "@/lib/split-index-items";
import { RegistrationPortal } from "@/components/registration-portal";
import { LiveAiChatWidget } from "@/components/live-ai-chat-widget";

const HERO_SLIDES = [
  {
    eyebrow: "Selamat Datang di WACRM",
    title: "Otomasi Bisnis Anda Setiap Saat",
    subtitle: "— Satukan CRM AI, ERP Gudang, Kasir POS & Akuntansi PSAK 72 —",
    image: "/images/split-01-crm.jpg",
    primaryCta: "Daftar Gratis",
    secondaryCta: "Jelajahi Modul",
  },
  {
    eyebrow: "11 Agen AI Otonom · 24/7",
    title: "Ubah Chat WhatsApp Jadi Penjualan",
    subtitle: "— Respon 3,2 Detik · Skoring Prospek BANT · Follow-Up H+0 s/d H+7 —",
    image: "/images/split-02-erp.jpg",
    primaryCta: "Aktifkan AI CRM",
    secondaryCta: "Hitung ROI",
  },
  {
    eyebrow: "Multi-Cabang & Standar PSAK 72",
    title: "Kendali Penuh Dari HP & Desktop",
    subtitle: "— Stok FIFO Real-Time · Kasir QR · Laporan Neraca & PPN 11% Otomatis —",
    image: "/images/split-03-finance.jpg",
    primaryCta: "Lihat 4 Edisi",
    secondaryCta: "Daftar Akses Privat",
  },
];

const BUSINESS_SLIDES = [
  {
    image: "/images/split-01-crm.jpg",
    tag: "CRM AI · 24/7",
    caption: "11 Agen AI WhatsApp melayani prospek & follow-up otomatis",
  },
  {
    image: "/images/split-02-erp.jpg",
    tag: "ERP · FIFO",
    caption: "Kontrol stok multi-gudang, batch FIFO & Purchase Order",
  },
  {
    image: "/images/split-05-pos.jpg",
    tag: "POS · QR",
    caption: "Kasir cepat scan QR/Barcode & cetak struk Bluetooth/USB",
  },
  {
    image: "/images/split-03-finance.jpg",
    tag: "PSAK 72",
    caption: "Jurnal double-entry otomatis, Neraca, Laba Rugi & PPN 11%",
  },
];

const TESTIMONIALS = [
  {
    initials: "HS",
    name: "Hendra Setiawan",
    company: "Distribusi Multi-Cabang · Surabaya",
    quote:
      "Sebelumnya chat prospek sering terlewat dan stok 6 gudang tidak pernah sinkron. Setelah beralih ke WACRM, balasan WhatsApp ditangani AI 24/7 dan laporan Neraca PSAK langsung jadi otomatis.",
  },
  {
    initials: "RN",
    name: "Rina Nugraha",
    company: "Jaringan Retail & F&B · Bandung",
    quote:
      "Kasir cabang cukup pakai HP Android untuk scan QR dan cetak struk Bluetooth. Dari kantor pusat saya bisa memantau omzet, HPP FIFO, dan penggajian staf secara real-time.",
  },
];

const TRUST_BADGES = [
  { title: "PSAK 72", sub: "Akuntansi Balance" },
  { title: "AES-256-GCM", sub: "Enkripsi Data" },
  { title: "TLS 1.3", sub: "Keamanan Koneksi" },
  { title: "PostgreSQL RLS", sub: "Isolasi Multi-Tenant" },
  { title: "Android v5.3.2", sub: "Signed Release APK" },
  { title: "Windows .EXE", sub: "Offline Installer" },
];

const NAV_LINKS = [
  { href: "#beranda", label: "Beranda" },
  { href: "#keunggulan", label: "Keunggulan" },
  { href: "#produk", label: "Modul" },
  { href: "#harga", label: "Harga" },
  { href: "#roi", label: "ROI" },
  { href: "#testimoni", label: "Testimoni" },
];

export default function MadeCorporateEnterprisePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [bizIdx, setBizIdx] = useState(0);
  const [productPage, setProductPage] = useState<0 | 1>(0);
  const [inspectModuleId, setInspectModuleId] = useState<string | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<CommercialEditionId>("enterprise");

  // ROI Calculator state
  const [branches, setBranches] = useState(4);
  const [staffCount, setStaffCount] = useState(14);
  const [dailyChats, setDailyChats] = useState(180);

  // Auto-advance hero slide gently every 6.5s
  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

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

  const currentHero = HERO_SLIDES[heroIdx];
  const currentBiz = BUSINESS_SLIDES[bizIdx];
  const visibleModules =
    productPage === 0 ? SPLIT_INDEX_ITEMS.slice(0, 4) : SPLIT_INDEX_ITEMS.slice(4, 8);
  const inspectedModule = SPLIT_INDEX_ITEMS.find((m) => m.id === inspectModuleId) ?? null;

  function scrollToRegister(ed?: CommercialEditionId) {
    if (ed) setSelectedEdition(ed);
    setMobileMenuOpen(false);
    setInspectModuleId(null);
    const el = document.getElementById("daftar");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="min-h-screen w-full bg-white text-[#444444]">
      {/* =====================================================================
          1. TOP UTILITY BAR (Desktop lg+) + STICKY WHITE NAVBAR
          ===================================================================== */}
      <div className="hidden border-b border-zinc-200 bg-[#F5F5F5] text-xs text-[#666666] lg:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#00A885]" />
              Konsultan AI 24/7 Aktif
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#00A885]" />
              enterprise@wacrm.id
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://wacrm-commercial.dwahyudi8377.workers.dev/privacy"
              className="inline-flex items-center gap-1 font-semibold text-[#008C6F] transition hover:text-[#00A885] hover:underline"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#00A885]" />
              Kebijakan Privasi (UU PDP No. 27/2022)
            </a>
            <span className="inline-flex items-center gap-1 font-semibold text-[#00A885]">
              <Lock className="h-3.5 w-3.5" /> Akses Aplikasi Privat Terlindungi
            </span>
            <span className="text-[#888888]">WACRM Commercial OS v5.3.3</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Brand Logo */}
          <a href="#beranda" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00A885] font-heading text-base font-extrabold text-white shadow-xs">
              W
            </span>
            <div className="leading-tight">
              <div className="font-heading text-lg font-extrabold tracking-tight text-[#222222]">
                WACRM<span className="text-[#00A885]">.</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#797979]">
                Enterprise v5.3.2
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav aria-label="Navigasi utama" className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-heading text-xs font-bold uppercase tracking-wider text-[#444444] transition hover:text-[#00A885]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://wacrm-commercial.dwahyudi8377.workers.dev/privacy"
              className="inline-flex items-center gap-1 font-heading text-xs font-bold uppercase tracking-wider text-[#008C6F] transition hover:text-[#00A885]"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#00A885]" />
              Privasi
            </a>
            <button
              type="button"
              onClick={() => scrollToRegister(selectedEdition)}
              className="rounded bg-[#00A885] px-4 py-2.5 font-heading text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#008C6F]"
            >
              Daftar Gratis
            </button>
          </nav>

          {/* Mobile & Tablet Action + Hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => scrollToRegister(selectedEdition)}
              className="rounded bg-[#00A885] px-3.5 py-2 font-heading text-[11px] font-bold uppercase tracking-wider text-white transition active:scale-95"
            >
              Daftar
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              aria-expanded={mobileMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded border border-zinc-200 bg-white text-[#222222] transition hover:border-[#00A885] hover:text-[#00A885]"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Clean Mobile Slide-Down Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Menu mobile"
            className="made-fade-in border-t border-zinc-200 bg-white px-4 pb-4 pt-2 shadow-lg lg:hidden"
          >
            <div className="flex flex-col divide-y divide-zinc-100">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 font-heading text-xs font-bold uppercase tracking-wider text-[#333333] hover:text-[#00A885]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://wacrm-commercial.dwahyudi8377.workers.dev/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1.5 py-3 font-heading text-xs font-bold uppercase tracking-wider text-[#008C6F] hover:text-[#00A885]"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#00A885]" />
                Kebijakan Privasi (UU PDP)
              </a>
            </div>
            <button
              type="button"
              onClick={() => scrollToRegister(selectedEdition)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-[#00A885] px-4 py-3 font-heading text-xs font-bold uppercase tracking-widest text-white"
            >
              Daftar &amp; Buka Akses Privat <ArrowRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </header>

      {/* =====================================================================
          2. HERO BANNER CAROUSEL (Signature Made Dark Full-Bleed Slider)
          ===================================================================== */}
      <section
        id="beranda"
        className="relative flex min-h-[510px] w-full items-center overflow-hidden bg-[#222222] text-white sm:min-h-[560px] lg:min-h-[620px]"
      >
        {/* Background Photo + High-Contrast Dark Overlay */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentHero.image}
            src={currentHero.image}
            alt={currentHero.title}
            className="h-full w-full object-cover opacity-45 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#161918]/75 via-[#161918]/65 to-[#161918]/85" />
        </div>

        {/* Desktop Left/Right Arrows */}
        <button
          type="button"
          onClick={() => setHeroIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          aria-label="Slide sebelumnya"
          className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white transition hover:border-[#00A885] hover:bg-[#00A885] md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setHeroIdx((prev) => (prev + 1) % HERO_SLIDES.length)}
          aria-label="Slide berikutnya"
          className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white transition hover:border-[#00A885] hover:bg-[#00A885] md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Centered Hero Content */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-5 py-14 text-center sm:px-8 sm:py-20">
          <div key={heroIdx} className="made-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00A885]/50 bg-[#00A885]/20 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-[#00D4A8]" />
              {currentHero.eyebrow}
            </div>

            <h1 className="font-heading mt-4 text-3xl font-extrabold leading-[1.18] tracking-tight text-white sm:text-5xl lg:text-[54px]">
              {currentHero.title}
            </h1>

            <p className="mx-auto mt-3.5 max-w-2xl text-sm font-medium leading-relaxed text-zinc-200 sm:text-base">
              {currentHero.subtitle}
            </p>

            {/* Dual CTA Buttons — Full width stacked on Android, horizontal on sm+ */}
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={() => scrollToRegister(selectedEdition)}
                className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#00A885] px-7 py-3.5 font-heading text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-[#00A885]/30 transition hover:bg-[#008C6F] sm:w-auto"
              >
                {currentHero.primaryCta} <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href={heroIdx === 1 ? "#roi" : "#produk"}
                className="inline-flex w-full items-center justify-center gap-2 rounded border-2 border-white/80 bg-transparent px-7 py-3 font-heading text-xs font-bold uppercase tracking-widest text-white transition hover:border-[#00A885] hover:bg-[#00A885] sm:w-auto"
              >
                {currentHero.secondaryCta}
              </a>
            </div>
          </div>

          {/* Slide Indicators (1 · 2 · 3) */}
          <div className="mt-9 flex items-center justify-center gap-2.5">
            {HERO_SLIDES.map((slide, idx) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setHeroIdx(idx)}
                aria-label={`Pilih slide ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  idx === heroIdx ? "w-8 bg-[#00A885]" : "w-2.5 bg-white/45 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. THREE CORE FEATURES (Signature Made Icon-Left White Section)
          ===================================================================== */}
      <section id="keunggulan" className="scroll-mt-20 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-9">
            {[
              {
                icon: Bot,
                title: "11 Agen AI & Omnichannel WA",
                desc: "Menjawab chat masuk otomatis 24/7 dalam 3,2 detik, melakukan skoring prospek BANT, dan follow-up terjadwal H+0 hingga H+7.",
              },
              {
                icon: Layers,
                title: "ERP FIFO, POS & Akuntansi PSAK 72",
                desc: "Setiap transaksi kasir QR otomatis memotong stok FIFO multi-gudang sekaligus menjurnal Neraca, Laba Rugi, dan PPN 11%.",
              },
              {
                icon: Smartphone,
                title: "Adaptif Android, Tablet & Windows",
                desc: "Dirancang responsif untuk layar HP Android, Tablet, Web Desktop, hingga installer native APK Android v5.3.2 & Windows .EXE.",
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#E6F7F3] text-[#00A885]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-heading text-base font-bold text-[#222222] sm:text-lg">
                      {feat.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#797979]">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. BUSINESS HIGHLIGHT + BROWSER-FRAME SLIDER (Signature Made Grey Section)
          ===================================================================== */}
      <section id="bisnis" className="scroll-mt-20 border-y border-zinc-200/70 bg-[#F5F5F5] py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left: Browser-Top Frame Slider (.slid_shap #00A885) */}
            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                {/* Signature Emerald Browser Header Bar */}
                <div className="flex h-10 items-center justify-between bg-[#00A885] px-4 text-white">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/85" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest">
                    {currentBiz.tag}
                  </span>
                </div>

                {/* Image Viewport */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#222222]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={currentBiz.image}
                    src={currentBiz.image}
                    alt={currentBiz.caption}
                    className="h-full w-full object-cover transition-all duration-500"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
                    <p className="text-xs font-medium sm:text-sm">{currentBiz.caption}</p>
                  </div>

                  {/* Prev / Next Controls */}
                  <button
                    type="button"
                    onClick={() =>
                      setBizIdx((p) => (p - 1 + BUSINESS_SLIDES.length) % BUSINESS_SLIDES.length)
                    }
                    aria-label="Pratinjau sebelumnya"
                    className="absolute left-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-[#00A885]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBizIdx((p) => (p + 1) % BUSINESS_SLIDES.length)}
                    aria-label="Pratinjau berikutnya"
                    className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-[#00A885]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Bottom Dots */}
                <div className="flex items-center justify-center gap-2 bg-white py-3">
                  {BUSINESS_SLIDES.map((s, idx) => (
                    <button
                      key={s.tag}
                      type="button"
                      onClick={() => setBizIdx(idx)}
                      aria-label={`Pilih pratinjau ${idx + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        idx === bizIdx ? "w-6 bg-[#00A885]" : "w-2 bg-zinc-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Made Corporate Pitch + Checklist + Dual Buttons */}
            <div className="lg:col-span-6">
              <h2 className="font-heading text-2xl font-extrabold leading-tight text-[#222222] sm:text-3xl">
                <span className="text-[#00A885]">WACRM</span> Adalah Platform Terpadu Untuk Bisnis
                Anda
              </h2>

              <ul className="mt-5 space-y-2.5 text-sm font-medium text-[#333333] sm:text-base">
                {[
                  "Arsitektur Modern — 11 Agen AI + ERP + POS + PSAK 72",
                  "100% Responsif di HP Android, Tablet & Layar Desktop",
                  "Terenkripsi AES-256-GCM dengan Akses Privat Terverifikasi",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#00A885]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-sm leading-relaxed text-[#666666]">
                Tidak perlu lagi membayar 5 aplikasi terpisah untuk chat WhatsApp, kasir toko,
                manajemen gudang, absensi HRD, dan laporan pajak. PT WACRM Digital Nusantara
                menyatukan seluruh siklus operasional bisnis Anda dalam satu sistem yang mulai dari{" "}
                <strong className="text-[#222222]">Rp 0 Gratis Selamanya untuk UMKM</strong>.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#roi"
                  className="inline-flex items-center justify-center gap-2 rounded border border-zinc-300 bg-white px-6 py-3 font-heading text-xs font-bold uppercase tracking-wider text-[#333333] transition hover:border-[#00A885] hover:text-[#00A885]"
                >
                  <Calculator className="h-4 w-4" /> Hitung ROI Anda
                </a>
                <button
                  type="button"
                  onClick={() => scrollToRegister("enterprise")}
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#00A885] px-6 py-3 font-heading text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#008C6F]"
                >
                  Daftar Sekarang <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. PRODUCT / MODULE SHOWCASE (Signature Made 4-Card Carousel Grid)
          ===================================================================== */}
      <section id="produk" className="scroll-mt-20 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-[#222222] sm:text-3xl">
                Ekosistem 8 Modul Utama
              </h2>
              <p className="mt-1.5 text-sm text-[#797979]">
                Ketuk kartu modul untuk melihat metrik &amp; detail kapabilitas Enterprise
              </p>
            </div>

            {/* Clean Page Switcher (4 Modules / Page) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProductPage(0)}
                className={`rounded px-3.5 py-2 font-heading text-xs font-bold uppercase tracking-wider transition ${
                  productPage === 0
                    ? "bg-[#00A885] text-white"
                    : "border border-zinc-200 bg-white text-[#555555] hover:border-[#00A885]"
                }`}
              >
                01–04 Inti
              </button>
              <button
                type="button"
                onClick={() => setProductPage(1)}
                className={`rounded px-3.5 py-2 font-heading text-xs font-bold uppercase tracking-wider transition ${
                  productPage === 1
                    ? "bg-[#00A885] text-white"
                    : "border border-zinc-200 bg-white text-[#555555] hover:border-[#00A885]"
                }`}
              >
                05–08 Skala
              </button>
            </div>
          </div>

          {/* 4-Column Responsive Card Grid */}
          <div
            key={productPage}
            className="made-fade-in mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {visibleModules.map((mod) => (
              <article
                key={mod.id}
                onClick={() => setInspectModuleId(mod.id)}
                className="group cursor-pointer overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-xs transition hover:-translate-y-1 hover:border-[#00A885]/50 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#222222]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mod.image}
                    alt={mod.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 transition group-hover:bg-[#00A885]/45" />
                  <span className="absolute left-3 top-3 rounded bg-black/65 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                    {mod.num}
                  </span>
                  <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#00A885] text-white shadow-md transition group-hover:scale-110">
                    <Plus className="h-4 w-4" />
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-base font-bold text-[#222222] transition group-hover:text-[#00A885]">
                    {mod.title}
                  </h3>
                  <div className="mt-0.5 text-xs font-medium text-[#797979]">— {mod.category}</div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#666666]">
                    {mod.summary}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px]">
                    <span className="font-semibold text-[#00A885]">
                      {mod.metrics[0].label}: {mod.metrics[0].value}
                    </span>
                    <span className="font-bold text-[#222222] group-hover:text-[#00A885]">
                      Detail →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Inline Module Detail Panel when a card is tapped */}
          {inspectedModule && (
            <div className="made-fade-in mt-6 rounded-xl border-2 border-[#00A885] bg-[#F5F5F5] p-5 shadow-md sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-block rounded bg-[#00A885] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Modul {inspectedModule.num} · {inspectedModule.category}
                  </span>
                  <h3 className="font-heading mt-2 text-xl font-extrabold text-[#222222] sm:text-2xl">
                    {inspectedModule.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectModuleId(null)}
                  aria-label="Tutup detail modul"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#444444] shadow-xs hover:text-[#222222]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-2.5 text-sm leading-relaxed text-[#555555]">
                {inspectedModule.summary}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:max-w-lg">
                {inspectedModule.metrics.map((m) => (
                  <div key={m.label} className="rounded-md bg-white p-3 shadow-2xs">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#797979]">
                      {m.label}
                    </div>
                    <div className="font-heading mt-0.5 text-base font-extrabold text-[#00A885] sm:text-lg">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {inspectedModule.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border border-[#00A885]/30 bg-white px-3 py-1 text-xs font-medium text-[#333333]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollToRegister(inspectedModule.suggestedEdition ?? "enterprise")}
                  className="inline-flex items-center gap-1.5 rounded bg-[#00A885] px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-wider text-white hover:bg-[#008C6F]"
                >
                  {inspectedModule.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          6. FOUR COMMERCIAL EDITIONS PRICING (Light Grey Section)
          ===================================================================== */}
      <section id="harga" className="scroll-mt-20 border-y border-zinc-200/70 bg-[#F5F5F5] py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-[#222222] sm:text-3xl">
              Skema Lisensi Komersial
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#797979]">
              Empat jenjang transparan tanpa biaya tersembunyi — mulai dari Rp 0 Gratis Selamanya
              untuk UMKM hingga Holding Multi-Cabang.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {COMMERCIAL_EDITIONS.map((ed) => {
              const featured = ed.id === "enterprise";
              return (
                <div
                  key={ed.id}
                  className={`flex flex-col justify-between overflow-hidden rounded-lg bg-white p-6 shadow-xs transition hover:shadow-md ${
                    featured
                      ? "border-2 border-[#00A885] ring-2 ring-[#00A885]/15"
                      : "border border-zinc-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          featured
                            ? "bg-[#00A885] text-white"
                            : "bg-[#E6F7F3] text-[#008C6F]"
                        }`}
                      >
                        {ed.badge}
                      </span>
                      <span className="text-[11px] font-semibold text-[#797979]">
                        {ed.metrics.branches}
                      </span>
                    </div>

                    <h3 className="font-heading mt-3 text-xl font-extrabold text-[#222222]">
                      {ed.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#797979]">{ed.tagline}</p>

                    <div className="mt-4 border-y border-zinc-100 py-3.5">
                      <div className="font-heading text-2xl font-extrabold text-[#222222]">
                        {ed.monthlyPriceLabel}
                        {ed.monthlyValueIdr > 0 && (
                          <span className="text-xs font-normal text-[#797979]"> /bulan</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#00A885]">{ed.annualPriceLabel}</div>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-[#444444]">
                      {ed.features.slice(0, 5).map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00A885]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    <button
                      type="button"
                      onClick={() => scrollToRegister(ed.id)}
                      className={`w-full rounded px-4 py-3 font-heading text-xs font-bold uppercase tracking-wider transition ${
                        featured
                          ? "bg-[#00A885] text-white hover:bg-[#008C6F]"
                          : "border border-[#00A885] bg-white text-[#00A885] hover:bg-[#00A885] hover:text-white"
                      }`}
                    >
                      {ed.ctaLabel} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. INTERACTIVE ROI CALCULATOR (Clean White Section)
          ===================================================================== */}
      <section id="roi" className="scroll-mt-20 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-[#222222] sm:text-3xl">
              Simulasi ROI Operasional
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#797979]">
              Geser parameter operasional bisnis Anda untuk menghitung estimasi penghematan software
              dan kenaikan omzet bulanan bersama WACRM.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 rounded-xl border border-zinc-200 bg-[#F9F9F9] p-5 shadow-xs sm:p-8 lg:grid-cols-12 lg:items-center">
            <div className="space-y-5 lg:col-span-7">
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold sm:text-sm">
                  <span className="text-[#333333]">Jumlah Cabang / Gudang</span>
                  <span className="font-bold text-[#00A885]">{branches} Cabang</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={branches}
                  onChange={(e) => setBranches(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-[#00A885]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold sm:text-sm">
                  <span className="text-[#333333]">Jumlah Staf Operasional &amp; Sales</span>
                  <span className="font-bold text-[#00A885]">{staffCount} Staf</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={80}
                  value={staffCount}
                  onChange={(e) => setStaffCount(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-[#00A885]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold sm:text-sm">
                  <span className="text-[#333333]">Volume Chat Prospek WA / Hari</span>
                  <span className="font-bold text-[#00A885]">{dailyChats} Chat/Hari</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={800}
                  step={10}
                  value={dailyChats}
                  onChange={(e) => setDailyChats(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-[#00A885]"
                />
              </div>
            </div>

            <div className="rounded-lg bg-[#222222] p-6 text-white lg:col-span-5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#00D4A8]">
                Rekomendasi: {roiCalc.recName}
              </div>
              <div className="mt-2 text-xs text-zinc-300">
                Estimasi Efisiensi &amp; Tambahan Omzet / Bulan
              </div>
              <div className="font-heading mt-1 text-3xl font-extrabold text-white">
                {formatIdr(roiCalc.monthlyImpact)}
              </div>
              <div className="mt-2 text-xs text-zinc-300">
                {roiCalc.savedHours} jam kerja terhemat/bln ·{" "}
                <span className="font-semibold text-emerald-300">
                  {formatIdr(roiCalc.annualImpact)}/tahun
                </span>
              </div>
              <button
                type="button"
                onClick={() => scrollToRegister(roiCalc.rec)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-[#00A885] px-5 py-3 font-heading text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#008C6F]"
              >
                Aktifkan {roiCalc.recName} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. TESTIMONIALS (Made Grey Section) + ENTERPRISE STANDARDS STRIP
          ===================================================================== */}
      <section id="testimoni" className="scroll-mt-20 border-t border-zinc-200/70 bg-[#F5F5F5] py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-[#222222] sm:text-3xl">
              Apa Kata Pengguna Bisnis
            </h2>
            <p className="mt-1.5 text-sm text-[#797979]">
              Dampak nyata otomasi operasional di berbagai sektor usaha Indonesia
            </p>
          </div>

          <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-xs ring-1 ring-black/5 sm:flex-row sm:items-start"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#00A885] font-heading text-lg font-extrabold text-white">
                  {t.initials}
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#222222] text-white">
                    <Quote className="h-3 w-3" />
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-[#222222]">{t.name}</h3>
                  <div className="text-xs font-semibold text-[#00A885]">{t.company}</div>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#666666]">{t.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Standards / Brand Trust Strip */}
      <section className="bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TRUST_BADGES.map((b) => (
              <div
                key={b.title}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-200/80 bg-[#FAFAFA] px-3 py-4 text-center"
              >
                <ShieldCheck className="h-5 w-5 text-[#00A885]" />
                <div className="font-heading mt-1.5 text-xs font-extrabold text-[#222222]">
                  {b.title}
                </div>
                <div className="text-[10px] text-[#797979]">{b.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. EMERALD ACTION CALLOUT BANNER (Signature Made #00A885 Strip)
          ===================================================================== */}
      <section className="bg-[#00A885] py-10 text-white sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 text-center sm:px-6 md:flex-row md:text-left">
          <div>
            <h2 className="font-heading text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
              Siap Mengotomasi Operasional Bisnis Anda Hari Ini?
            </h2>
            <p className="mt-1 text-sm text-white/90">
              Mulai gratis untuk UMKM atau jadwalkan aktivasi Enterprise multi-cabang bersama 5 Agen
              AI kami.
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToRegister(selectedEdition)}
            className="w-full shrink-0 rounded border-2 border-white bg-white px-7 py-3 font-heading text-xs font-extrabold uppercase tracking-widest text-[#00A885] shadow-sm transition hover:bg-transparent hover:text-white md:w-auto"
          >
            Daftar Sekarang →
          </button>
        </div>
      </section>

      {/* =====================================================================
          10. GATED PRIVATE REGISTRATION SECTION (Zero Public Client URL)
          ===================================================================== */}
      <section id="daftar" className="scroll-mt-20 bg-[#F5F5F5] py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F7F3] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#008C6F]">
              <Lock className="h-3.5 w-3.5" /> Gerbang Pendaftaran &amp; Akses Privat Resmi
            </span>
            <h2 className="font-heading mt-3 text-2xl font-extrabold text-[#222222] sm:text-3xl">
              Buka Akses Privat Aplikasi WACRM Anda
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#666666]">
              Lengkapi formulir singkat di bawah. Tautan privat aplikasi langsung terbuka setelah
              terverifikasi dan pendaftaran otomatis diteruskan ke WACRM Publisher HQ.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <RegistrationPortal
              selectedEdition={selectedEdition}
              onChangeEdition={setSelectedEdition}
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          11. DARK CORPORATE FOOTER (Signature Made #222222 4-Column Footer)
          ===================================================================== */}
      <footer className="bg-[#222222] text-zinc-300">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Col 1: About */}
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-[#00A885] font-heading text-sm font-extrabold text-white">
                  W
                </span>
                <span className="font-heading text-lg font-extrabold text-white">
                  WACRM<span className="text-[#00A885]">.</span>
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                PT WACRM Digital Nusantara — Platform Enterprise Commercial OS v5.3.2 untuk CRM AI,
                ERP Multi-Gudang FIFO, Kasir POS, HRD Payroll &amp; Akuntansi PSAK 72.
              </p>
              <div className="mt-4 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#00A885]" />
                  <span>Jakarta &amp; Jawa Timur, Indonesia</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-[#00A885]" />
                  <span>Cloud &amp; Native Android / Windows</span>
                </div>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                Navigasi Cepat
              </h3>
              <ul className="mt-3.5 space-y-2 text-xs">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-zinc-400 transition hover:text-[#00A885]">
                      › {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#daftar" className="text-zinc-400 transition hover:text-[#00A885]">
                    › Pendaftaran Akses Privat
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Commercial Editions */}
            <div>
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                Edisi Lisensi
              </h3>
              <ul className="mt-3.5 space-y-2 text-xs text-zinc-400">
                {COMMERCIAL_EDITIONS.map((ed) => (
                  <li key={ed.id} className="flex items-center justify-between gap-2">
                    <span>{ed.name}</span>
                    <span className="font-semibold text-[#00D4A8]">{ed.monthlyPriceLabel}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Security & AI Readiness */}
            <div>
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
                Standar Enterprise
              </h3>
              <ul className="mt-3.5 space-y-2.5 text-xs text-zinc-400">
                <li className="flex items-start gap-2">
                  <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00A885]" />
                  <span>11 Agen AI Otonom + 5 Agen Publisher HQ 24/7</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00A885]" />
                  <span>Enkripsi TLS 1.3, AES-256-GCM &amp; RLS Multi-Tenant</span>
                </li>
                <li className="flex items-start gap-2">
                  <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00A885]" />
                  <span>Signed Release APK v5.3.2 &amp; Windows Offline Installer</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Strip — Safe pb-20 on mobile so floating AI pill NEVER covers text */}
        <div className="border-t border-white/10 bg-[#1B1B1B] px-4 pb-20 pt-5 text-center text-xs text-zinc-400 sm:pb-5">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
            <span>
              © {new Date().getFullYear()} PT WACRM Digital Nusantara · Pure-Free Original Enterprise
              UI
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
              <a href="/privacy" className="text-zinc-300 transition hover:text-[#00D4A8]">
                Kebijakan Privasi (UU PDP)
              </a>
              <span className="text-zinc-600">·</span>
              <a
                href="https://wacrm-commercial.dwahyudi8377.workers.dev/privacy"
                className="font-semibold text-[#00D4A8] transition hover:underline"
              >
                Privasi Aplikasi Commercial OS
              </a>
              <span className="text-zinc-600">·</span>
              <a href="/terms" className="text-zinc-300 transition hover:text-[#00D4A8]">
                Syarat &amp; Ketentuan
              </a>
              <span className="text-zinc-600">·</span>
              <a href="/refund" className="text-zinc-300 transition hover:text-[#00D4A8]">
                Kebijakan Refund
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 24/7 Live Multi-Agent AI Concierge Widget */}
      <LiveAiChatWidget onOpenRegister={() => scrollToRegister()} />
    </div>
  );
}
