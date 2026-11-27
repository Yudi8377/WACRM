"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function GlobalAppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold">Terjadi Gangguan Sementara</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Sistem WACRM mendeteksi kendala saat memuat halaman ini. Data bisnis Anda tetap aman dan tersimpan.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-slate-950 hover:bg-emerald-400"
          >
            <RotateCcw className="h-4 w-4" />
            Muat Ulang Halaman
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
