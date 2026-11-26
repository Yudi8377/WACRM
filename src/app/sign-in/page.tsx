"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Database, Lock, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dbReady, setDbReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/system/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { readyForLiveAuth?: boolean } | null) => {
        if (data) setDbReady(Boolean(data.readyForLiveAuth));
      })
      .catch(() => setDbReady(null));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(
          result.error.status === 503
            ? "Database Neon belum aktif di server ini. Lengkapi DATABASE_URL melalui halaman /setup atau gunakan Mode Demo."
            : "Email atau kata sandi tidak cocok. Periksa kembali lalu coba lagi.",
        );
        return;
      }
      const callback = new URLSearchParams(window.location.search).get("callbackURL");
      router.replace(callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/dashboard");
      router.refresh();
    } catch {
      setError("Koneksi server gagal. Periksa koneksi jaringan atau status database Neon.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <Link href="/" className="inline-flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="WACRM" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">WACRM</span>
        </Link>

        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Masuk ke ruang kerja</h1>
        <p className="mt-1.5 text-sm text-slate-500">Kelola percakapan omnichannel dan kontak pelanggan Anda.</p>

        {dbReady === false && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-bold">
              <Database className="h-4 w-4 text-amber-600" />
              Database Neon belum ditautkan
            </p>
            <p className="mt-1 leading-relaxed text-amber-800">
              Hubungkan <code className="font-mono">DATABASE_URL</code> Neon di Vercel untuk login produksi, atau coba langsung ruang kerja interaktif.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Link href="/setup" className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700">
                Setup Neon
              </Link>
              <Link href="/demo" className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100">
                Masuk Mode Demo →
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Email
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.id"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Kata sandi
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 12 karakter"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </label>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            disabled={busy}
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Memeriksa..." : "Masuk"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>
            Belum punya akun?{" "}
            <Link href="/sign-up" className="font-bold text-emerald-700 hover:underline">
              Daftar
            </Link>
          </span>
          <Link href="/demo" className="font-semibold text-slate-700 hover:text-emerald-700">
            Coba Demo →
          </Link>
        </div>
      </section>
    </main>
  );
}
