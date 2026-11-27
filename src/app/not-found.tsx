import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-4 font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
          404 · Halaman Tidak Ditemukan
        </p>
        <h1 className="mt-2 text-2xl font-extrabold">Tautan tidak tersedia</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Halaman yang Anda cari mungkin telah dipindahkan atau alamat URL kurang tepat. Silakan kembali ke Portal WACRM.
        </p>
        <div className="mt-6 flex justify-center gap-2.5 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 font-bold text-slate-950 hover:bg-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke WACRM
          </Link>
        </div>
      </section>
    </main>
  );
}
