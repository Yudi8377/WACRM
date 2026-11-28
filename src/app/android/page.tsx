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
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
          <Link
            href="/demo"
            className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Buka Web App
          </Link>
        </div>

        {/* Hero */}
        <section className="rounded-3xl bg-slate-900 p-7 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-512.png"
              alt="Ikon Aplikasi Android WACRM"
              className="h-20 w-20 rounded-3xl shadow-lg"
            />
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Smartphone className="h-3.5 w-3.5" />
                Go-Commercial Suite v5.3.2 · Signed Release APK (v1/v2/v3) &amp; Auto-Fix Izin
              </span>
              <h1 className="mt-2.5 text-2xl font-extrabold sm:text-3xl">
                Pusat Installer Resmi WACRM v5.3.2 (Android APK &amp; Windows Offline Bundle)
              </h1>
              <p className="mt-1.5 text-sm text-slate-300">
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
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
            >
              <Download className="h-4 w-4" />
              Unduh APK Android Resmi (Signed Release v5.3.2)
            </a>
            <a
              href="/downloads/WACRM-v5.3-Commercial-Offline-Installer-Bundle.zip"
              download
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300"
            >
              <Download className="h-4 w-4" />
              Unduh Bundle Offline Installer (Windows + Android ADB)
            </a>
            {deferredPrompt ? (
              <button
                type="button"
                onClick={() => void triggerInstall()}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-5 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-500/25"
              >
                <Smartphone className="h-4 w-4" />
                Pasang Instan PWA (Tanpa APK)
              </button>
            ) : installed ? (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                WACRM sudah terpasang di perangkat ini!
              </span>
            ) : null}
            <a
              href="https://github.com/Yudi8377/WACRM/releases/latest/download/wacrm-android.apk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Mirror GitHub Releases
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 text-[11px] sm:grid-cols-4">
            <div>
              <div className="text-slate-400">Package ID Resmi</div>
              <div className="font-mono font-bold text-emerald-300">com.wacrm.android</div>
            </div>
            <div>
              <div className="text-slate-400">Versi / Build</div>
              <div className="font-mono font-bold text-white">v5.3.2 (code 10)</div>
            </div>
            <div>
              <div className="text-slate-400">Tanda Tangan APK</div>
              <div className="font-bold text-emerald-300">Release v1 + v2 + v3</div>
            </div>
            <div>
              <div className="text-slate-400">Kompatibilitas OS</div>
              <div className="font-bold text-white">Android 7.0 – 15</div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Android Installation & Troubleshooting Guide */}
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-extrabold text-amber-950">
                Panduan Instalasi Resmi di HP Android (Anti Gagal / Anti Bentrok Paket)
              </h2>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-amber-900">
                <li>
                  <strong>Hapus versi uji coba lama (jika ada):</strong> Jika sebelumnya Anda
                  pernah memasang WACRM versi debug lama, hapus instalasinya terlebih dulu agar
                  Android tidak memunculkan peringatan bentrok paket.
                </li>
                <li>
                  <strong>Unduh melalui browser Chrome (bukan browser dalam WhatsApp):</strong>{" "}
                  Ketuk tombol hijau <em>&ldquo;Unduh APK Android Resmi (Signed Release v5.3.2)&rdquo;</em> di atas, lalu buka berkas{" "}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              1. Pasang Instan via Chrome (PWA)
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Alternatif tercepat tanpa unduh APK — langsung muncul ikon WACRM di layar utama
              Android dalam mode layar penuh (standalone).
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Buka halaman WACRM di <strong>Google Chrome Android</strong>.</li>
              <li>Ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan atas.</li>
              <li>Pilih <strong>&ldquo;Tambahkan ke Layar Utama&rdquo;</strong> atau <strong>&ldquo;Pasang aplikasi&rdquo;</strong>.</li>
              <li>WACRM akan terbuka penuh tanpa address bar dengan navigasi bawah native.</li>
            </ol>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              2. Native Kotlin APK v5.3.2 (Signed Release)
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Proyek Android Studio native berbasis Kotlin + Material 3 + Hardware Permission Bridge
              + Bluetooth/USB OTG Thermal Printing.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Package ID Resmi: <code className="font-mono text-xs">com.wacrm.android</code> (Release Signed v1/v2/v3)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Auto-Grant Izin Kamera QR/FIFO, Mikrofon AI 24/7 &amp; Notifikasi</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Native Bluetooth Thermal ESC/POS (58mm/80mm) &amp; USB-C OTG Print</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Sinkronisasi Real-Time Desktop ↔ HP via Neon PostgreSQL</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Local Build Instructions */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Terminal className="h-4 w-4 text-emerald-600" />
            Build &amp; Verifikasi APK Lokal (Android Studio / Gradle)
          </div>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-300">
{`cd android
./gradlew assembleRelease
# Verifikasi tanda tangan & badging resmi:
apksigner verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk`}
          </pre>
        </section>
      </div>
    </div>
  );
}
