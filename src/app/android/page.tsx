"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Layers,
  Shield,
  Smartphone,
  Terminal,
} from "lucide-react";
import { CorporateFooter, CorporateNavbar } from "@/components/brand-chrome";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function AndroidPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function triggerInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#444444]">
      <CorporateNavbar activeHref="/android" />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00A885] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Portal Aplikasi
          </Link>
          <Link
            href="/demo"
            className="rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#008C6F]"
          >
            Buka Web App
          </Link>
        </div>

        {/* Hero */}
        <section className="rounded-2xl bg-[#222222] p-7 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#00A885] font-heading text-4xl font-extrabold text-white shadow-lg">
              W
            </span>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00A885]/20 px-3 py-1 font-heading text-xs font-bold text-[#00D4A8]">
                <Smartphone className="h-3.5 w-3.5" />
                Go-Commercial Suite v5.3.2 · Signed Release APK (v1/v2/v3) &amp; Auto-Fix Izin
              </span>
              <h1 className="font-heading mt-2.5 text-2xl font-extrabold sm:text-3xl">
                Pusat Installer Resmi WACRM v5.3.2 (Android APK &amp; Windows Offline Bundle)
              </h1>
              <p className="mt-1.5 text-sm text-zinc-300">
                APK Release resmi <strong>com.wacrm.android v5.3.2</strong> telah ditandatangani
                penuh (Signature v1 + v2 + v3, 4-byte zipalign, non-debuggable) dan dialirkan
                langsung dari server HTTPS WACRM agar bebas korupsi unduhan di Chrome/MIUI/Samsung
                serta langsung menuntaskan izin Kamera QR, Mikrofon AI, USB &amp; Bluetooth.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/api/download/android-apk"
              download="WACRM-v5.3.2-Android.apk"
              className="inline-flex items-center gap-2 rounded bg-[#00A885] px-5 py-3 font-heading text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:bg-[#008C6F]"
            >
              <Download className="h-4 w-4" />
              Unduh APK Android Resmi (Signed Release v5.3.2)
            </a>
            <a
              href="/downloads/WACRM-v5.3-Commercial-Offline-Installer-Bundle.zip"
              download
              className="inline-flex items-center gap-2 rounded border border-white/25 bg-white/10 px-5 py-3 font-heading text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
              Unduh Bundle Offline Installer (Windows + Android ADB)
            </a>
            {deferredPrompt ? (
              <button
                type="button"
                onClick={() => void triggerInstall()}
                className="inline-flex items-center gap-2 rounded border border-[#00D4A8]/50 bg-[#00A885]/20 px-5 py-3 font-heading text-xs font-bold uppercase tracking-wider text-[#00D4A8] hover:bg-[#00A885]/30"
              >
                <Smartphone className="h-4 w-4" />
                Pasang Instan PWA (Tanpa APK)
              </button>
            ) : installed ? (
              <span className="inline-flex items-center gap-2 rounded bg-[#00A885]/20 px-5 py-3 text-sm font-bold text-[#00D4A8]">
                <CheckCircle2 className="h-4 w-4" />
                WACRM sudah terpasang di perangkat ini!
              </span>
            ) : null}
            <a
              href="https://github.com/Yudi8377/WACRM/releases/latest/download/wacrm-android.apk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded border border-zinc-600 bg-[#1B1B1B] px-4 py-3 text-xs font-semibold text-zinc-200 hover:border-[#00A885] hover:text-[#00D4A8]"
            >
              Mirror GitHub Releases
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-xl border border-white/10 bg-[#1B1B1B] p-3.5 text-[11px] sm:grid-cols-4">
            <div>
              <div className="text-zinc-400">Package ID Resmi</div>
              <div className="font-mono font-bold text-[#00D4A8]">com.wacrm.android</div>
            </div>
            <div>
              <div className="text-zinc-400">Versi / Build</div>
              <div className="font-mono font-bold text-white">v5.3.2 (code 10)</div>
            </div>
            <div>
              <div className="text-zinc-400">Tanda Tangan APK</div>
              <div className="font-bold text-[#00D4A8]">Release v1 + v2 + v3</div>
            </div>
            <div>
              <div className="text-zinc-400">Kompatibilitas OS</div>
              <div className="font-bold text-white">Android 7.0 – 15</div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Android Installation & Troubleshooting Guide */}
        <section className="rounded-2xl border border-[#00A885]/30 bg-[#E6F7F3] p-6 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00A885] text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-base font-extrabold text-[#222222]">
                Panduan Instalasi Resmi di HP Android (Anti Gagal / Anti Bentrok Paket)
              </h2>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-[#333333]">
                <li>
                  <strong>Hapus versi uji coba lama (jika ada):</strong> Jika sebelumnya Anda
                  pernah memasang WACRM versi debug lama, hapus instalasinya terlebih dulu agar
                  Android tidak memunculkan peringatan bentrok paket.
                </li>
                <li>
                  <strong>Unduh melalui browser Chrome (bukan browser dalam WhatsApp):</strong>{" "}
                  Ketuk tombol hijau <em>&ldquo;Unduh APK Android Resmi (Signed Release v5.3.2)&rdquo;</em> di atas, lalu buka berkas{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[#008C6F]">
                    WACRM-v5.3.2-Android.apk
                  </code>{" "}
                  dari menu <strong>Download</strong>.
                </li>
                <li>
                  <strong>Izinkan Sumber Tidak Dikenal (Instalasi Langsung):</strong> Saat Android
                  meminta izin, aktifkan <em>&ldquo;Izinkan dari sumber ini&rdquo;</em> untuk Chrome
                  atau File Manager, lalu ketuk <strong>Pasang (Install)</strong>.
                </li>
                <li>
                  <strong>Jika Play Protect muncul:</strong> Ketuk <em>&ldquo;Detail selengkapnya&rdquo;</em>{" "}
                  → <em>&ldquo;Tetap instal&rdquo;</em> (normal untuk distribusi APK mandiri di luar
                  Play Store).
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Two Android Deployment Options */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F7F3] text-[#00A885]">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="font-heading mt-4 text-lg font-extrabold text-[#222222]">
              1. Pasang Instan via Chrome (PWA)
            </h2>
            <p className="mt-1.5 text-sm text-[#666666]">
              Alternatif tercepat tanpa unduh APK — langsung muncul ikon WACRM di layar utama
              Android dalam mode layar penuh (standalone).
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#444444]">
              <li>Buka halaman WACRM di <strong>Google Chrome Android</strong>.</li>
              <li>Ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan atas.</li>
              <li>Pilih <strong>&ldquo;Tambahkan ke Layar Utama&rdquo;</strong> atau <strong>&ldquo;Pasang aplikasi&rdquo;</strong>.</li>
              <li>WACRM akan terbuka penuh tanpa address bar dengan navigasi bawah native.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#222222] text-[#00D4A8]">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="font-heading mt-4 text-lg font-extrabold text-[#222222]">
              2. Native Kotlin APK v5.3.2 (Signed Release)
            </h2>
            <p className="mt-1.5 text-sm text-[#666666]">
              Proyek Android Studio native berbasis Kotlin + Material 3 + Hardware Permission Bridge
              + Bluetooth/USB OTG Thermal Printing.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#444444]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00A885]" />
                <span>
                  Package ID Resmi: <code className="font-mono text-xs">com.wacrm.android</code> (Release Signed v1/v2/v3)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00A885]" />
                <span>Auto-Grant Izin Kamera QR/FIFO, Mikrofon AI 24/7 &amp; Notifikasi</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00A885]" />
                <span>Native Bluetooth Thermal ESC/POS (58mm/80mm) &amp; USB-C OTG Print</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00A885]" />
                <span>Sinkronisasi Real-Time Desktop ↔ HP via Neon PostgreSQL</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Local Build Instructions */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 font-heading text-sm font-extrabold text-[#222222]">
            <Terminal className="h-4 w-4 text-[#00A885]" />
            Build &amp; Verifikasi APK Lokal (Android Studio / Gradle)
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-[#1B1B1B] p-4 font-mono text-xs text-[#00D4A8]">
{`cd android
./gradlew assembleRelease
# Verifikasi tanda tangan & badging resmi:
apksigner verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk`}
          </pre>
        </section>
      </main>

      <CorporateFooter />
    </div>
  );
}
