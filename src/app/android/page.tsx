"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, Layers, Shield, Smartphone, Terminal } from "lucide-react";

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
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
          <Link href="/demo" className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            Buka Web App
          </Link>
        </div>

        {/* Hero */}
        <section className="rounded-3xl bg-slate-900 p-7 text-white shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-512.png" alt="Ikon Aplikasi Android WACRM" className="h-20 w-20 rounded-3xl shadow-lg" />
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Smartphone className="h-3.5 w-3.5" />
                Android App · com.wacrm.android
              </span>
              <h1 className="mt-2.5 text-2xl font-extrabold sm:text-3xl">Aplikasi Android WACRM</h1>
              <p className="mt-1.5 text-sm text-slate-300">
                Tersedia dalam dua mode siap produksi: <strong>PWA WebAPK Instan</strong> langsung dari Chrome Android &amp;{" "}
                <strong>Proyek Native Kotlin APK</strong> (<code className="font-mono text-emerald-300">android/</code>) dengan auto-build GitHub Actions.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={() => void triggerInstall()}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Download className="h-4 w-4" />
                Pasang Sekarang di Android
              </button>
            ) : installed ? (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                WACRM sudah terpasang di perangkat ini!
              </span>
            ) : (
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Smartphone className="h-4 w-4" />
                Buka Tampilan Mobile WACRM
              </Link>
            )}
            <a
              href="https://github.com/Yudi8377/WACRM/actions"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Unduh APK dari GitHub Actions
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Two Android Deployment Options */}
        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <span className="inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <Layers className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-900">1. Pasang Instan via Chrome (PWA)</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Tanpa perlu Play Store — langsung muncul ikon WACRM di layar utama Android dalam mode layar penuh (standalone).
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-700">
              <li>Buka URL live WACRM di <strong>Google Chrome Android</strong>.</li>
              <li>Ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan atas.</li>
              <li>Pilih <strong>&ldquo;Tambahkan ke Layar Utama&rdquo;</strong> atau <strong>&ldquo;Pasang aplikasi&rdquo;</strong>.</li>
              <li>WACRM akan terbuka penuh tanpa address bar dengan navigasi bawah native.</li>
            </ol>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <span className="inline-flex rounded-xl bg-sky-100 p-2.5 text-sky-700">
              <Shield className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-900">2. Native Kotlin APK (android/)</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Proyek Android Studio lengkap berbasis Kotlin + Material 3 + SwipeRefresh + JavaScript Bridge + Pengaturan Server in-app.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                Package ID: <code className="font-mono font-semibold">com.wacrm.android</code>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                Persisten Cookie &amp; Sesi Better Auth + Upload File + Deep Link WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                Auto-build APK otomatis pada GitHub Actions (<code className="font-mono">android-release.yml</code>)
              </li>
            </ul>
          </article>
        </div>

        {/* Local Build Instructions */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Terminal className="h-4 w-4 text-emerald-600" />
            Build APK Lokal (Android Studio / Gradle)
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-200">
{`cd android
./gradlew assembleDebug
# Hasil APK: android/app/build/outputs/apk/debug/app-debug.apk`}
          </pre>
        </section>
      </div>
    </div>
  );
}
