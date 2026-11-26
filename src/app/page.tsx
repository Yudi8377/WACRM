import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Lock,
  MessageSquare,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { isDatabaseConfigured, NEON_BRANCH_ID, NEON_PROJECT_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

const channels = [
  {
    name: "WhatsApp Business Cloud API",
    badge: "Prioritas P0 · Aktif",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    detail: "API resmi Meta Graph, webhook terverifikasi HMAC-SHA256, idempotensi pesan, dan aturan jendela layanan 24 jam.",
  },
  {
    name: "Evolution API (Opsional)",
    badge: "Adapter Transport",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    detail: "Pilihan konektor mandiri per workspace dengan penyimpanan API key terenkripsi AES-256-GCM.",
  },
  {
    name: "Instagram & Messenger",
    badge: "Omnichannel Ready",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    detail: "Kelola DM Instagram profesional dan pesan Halaman Facebook dalam kotak masuk terpadu.",
  },
  {
    name: "TikTok & YouTube",
    badge: "Fondasi Adapter",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    detail: "Siap untuk TikTok Business Messaging dan manajemen komentar YouTube Data API v3.",
  },
];

const features = [
  {
    icon: MessageSquare,
    title: "Inbox Omnichannel Real-Time",
    desc: "Balas pelanggan, gunakan pintasan /balasan-cepat, simpan catatan internal tim, dan atur prioritas dalam satu tampilan.",
  },
  {
    icon: Users,
    title: "CRM Kontak & Lifecycle Lengkap",
    desc: "Insert, update, delete kontak, kelompokkan Prospek hingga VIP, tambahkan label khusus, dan mulai chat 1 klik.",
  },
  {
    icon: Database,
    title: "Neon PostgreSQL Multi-Tenant RLS",
    desc: `Dirancang untuk Neon project ${NEON_PROJECT_ID} (${NEON_BRANCH_ID}) dengan Row-Level Security aktif di seluruh tabel.`,
  },
  {
    icon: Smartphone,
    title: "Web App PWA + Native Android APK",
    desc: "Responsif dengan navigasi bawah bergaya aplikasi native, dapat dipasang sebagai PWA maupun di-build menjadi APK Kotlin.",
  },
  {
    icon: ShieldCheck,
    title: "Enkripsi Token & Audit Trail",
    desc: "Token kanal dienkripsi AES-256-GCM di server. Setiap perubahan tercatat di audit_logs dengan kontrol peran RBAC.",
  },
  {
    icon: Zap,
    title: "Template & Balasan Cepat",
    desc: "Kelola template pesan resmi WhatsApp dan jawaban instan agar waktu respons tim tetap di bawah 1 menit.",
  },
];

export default function HomePage() {
  const dbReady = isDatabaseConfigured();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="WACRM" className="h-9 w-9 rounded-xl shadow-xs" />
            <div>
              <span className="block text-base font-extrabold tracking-tight text-slate-900">WACRM</span>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Omnichannel OS</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/demo" className="hover:text-emerald-700">Demo Interaktif</Link>
            <Link href="/android" className="hover:text-emerald-700">Aplikasi Android</Link>
            <Link href="/setup" className="hover:text-emerald-700">Status Neon DB</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
            >
              Masuk
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 sm:text-sm"
            >
              Buka App
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-emerald-50/30 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" />
                Web App + Android APK · Neon PostgreSQL RLS
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
                Semua percakapan pelanggan,{" "}
                <span className="text-emerald-600">satu ruang kerja cepat.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                WACRM adalah CRM omnichannel mandiri untuk WhatsApp Business, Instagram, Messenger, TikTok, dan YouTube.
                Dilengkapi database Neon PostgreSQL berisolasi tenant, CRUD kontak &amp; percakapan lengkap, serta aplikasi Android siap pakai.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  <PlayCircle className="h-4 w-4" />
                  Coba Workspace Interaktif
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  Buat Akun Neon
                </Link>
                <Link
                  href="/android"
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <Smartphone className="h-4 w-4" />
                  Aplikasi Android
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${dbReady ? "bg-emerald-500" : "bg-amber-400"}`} />
                  Neon DB ({NEON_PROJECT_ID}):{" "}
                  <strong className="text-slate-700">{dbReady ? "Terhubung" : "Menunggu DATABASE_URL"}</strong>
                </span>
                <Link href="/setup" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
                  Buka Kontrol Setup Neon →
                </Link>
              </div>
            </div>

            {/* Interactive Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-900">Inbox Omnichannel Live</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    4 Aktif · 24j SLA
                  </span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {[
                    { name: "Siti Rahmawati", ch: "WhatsApp", chCol: "bg-emerald-600", msg: "Stok paket grosir 50 karton ready hari ini?", time: "Baru saja", unread: 2 },
                    { name: "Andi Pratama", ch: "Instagram", chCol: "bg-pink-600", msg: "Apakah aplikasi Android bisa 5 admin sekaligus?", time: "18 mnt", unread: 1 },
                    { name: "Rizky Fadillah", ch: "WhatsApp", chCol: "bg-emerald-600", msg: "Terima kasih, resi #INV-8821 sudah saya terima.", time: "1 jam", unread: 0 },
                  ].map((item) => (
                    <div key={item.name} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${item.chCol}`}>
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <span className="text-[10px] text-slate-400">{item.time}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-600">{item.msg}</p>
                      </div>
                      {item.unread > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                          {item.unread}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
                  <div className="flex items-center gap-2 text-xs">
                    <Lock className="h-4 w-4 text-emerald-400" />
                    <span>RLS PostgreSQL + AES-256-GCM</span>
                  </div>
                  <Link href="/demo" className="text-xs font-bold text-emerald-400 hover:underline">
                    Coba →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Arsitektur Konektor</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            WhatsApp dulu, omnichannel sejak hari pertama
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((ch) => (
            <article key={ch.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ch.color}`}>
                {ch.badge}
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-900">{ch.name}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{ch.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Fitur Lengkap</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Siap untuk operasional tim CS &amp; penjualan
            </h2>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <span className="inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3.5 text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Android & Neon CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-900 p-7 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Smartphone className="h-3.5 w-3.5" /> Android Native &amp; PWA
            </span>
            <h3 className="mt-4 text-2xl font-extrabold">Gunakan WACRM langsung dari ponsel Android</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Pasang instan sebagai aplikasi Android (PWA) atau build APK Kotlin native langsung dari folder <code className="font-mono text-emerald-300">android/</code> dan GitHub Actions.
            </p>
            <Link
              href="/android"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              Buka Pusat Aplikasi Android
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/70 px-3 py-1 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5" /> Neon PostgreSQL Ready
            </span>
            <h3 className="mt-4 text-2xl font-extrabold text-slate-900">Sinkronisasi penuh dengan Neon</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Skema lengkap migrasi 0001–0007 (19 tabel + RLS tenant isolation) siap dijalankan sekali klik pada branch{" "}
              <code className="font-mono font-semibold text-emerald-900">{NEON_BRANCH_ID}</code>.
            </p>
            <Link
              href="/setup"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Lihat Status &amp; Skrip SQL Neon
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4">
          WACRM — Omnichannel CRM Mandiri · Web App &amp; Android · Neon PostgreSQL ({NEON_PROJECT_ID})
        </div>
      </footer>
    </div>
  );
}
