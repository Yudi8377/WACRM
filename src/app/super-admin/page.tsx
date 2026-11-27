import Link from "next/link";
import { ArrowLeft, Building2, KeyRound, Lock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arsitektur Terpisah — WACRM Publisher HQ",
  robots: { index: false, follow: false },
};

export default function SuperAdminSeparatedNoticePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
          <Lock className="h-3.5 w-3.5" /> Aplikasi Terpisah Milik Perusahaan Penerbit
        </div>

        <h1 className="mt-4 text-2xl font-extrabold text-white">
          Super Admin Dashboard Dipisahkan ke Aplikasi Khusus Penerbit (WACRM Publisher HQ)
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Demi keamanan multi-tenant dan pemisahan tata kelola korporasi,{" "}
          <strong>Dashboard Super Admin</strong> tidak lagi disatukan di dalam aplikasi klien WACRM.
          Sistem tersebut kini berjalan sebagai aplikasi mandiri{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-emerald-300">
            apps/publisher-admin
          </code>{" "}
          milik perusahaan penerbit WACRM (<strong>PT WACRM Digital Nusantara</strong>).
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <KeyRound className="h-4 w-4" /> Fungsi Aplikasi Penerbit (Port 3001)
            </div>
            <ul className="mt-2 space-y-1 text-slate-300">
              <li>• License Management System (Signed Keys &amp; Entitlements)</li>
              <li>• Master Data Penerbit (Tenant, SKU, Reseller, Vendor, CoA)</li>
              <li>• Publisher CRM B2B (Pipeline Deal, Renewal, Support SLA)</li>
              <li>• Publisher ERP (Recurring Billing, Cloud/AI COGS, Hardware)</li>
              <li>• Akuntansi PSAK Lengkap (Jurnal, Deferred Revenue, Neraca, PPN)</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <Building2 className="h-4 w-4" /> Untuk Pengguna Aplikasi WACRM
            </div>
            <p className="mt-2 leading-relaxed text-slate-300">
              Jika Anda adalah pemilik bisnis pengguna WACRM dan ingin mengaktifkan atau memperpanjang
              edisi workspace, buka tab <strong>Edisi &amp; Lisensi</strong> di dalam WACRM lalu
              masukkan <strong>License Key</strong> resmi yang diterbitkan oleh tim penerbit.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Isolasi Data Tenant 100% Terjaga
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Aplikasi WACRM
          </Link>
          <span className="font-mono text-[11px] text-slate-500">
            Publisher EMS Standalone: apps/publisher-admin (port 3001)
          </span>
        </div>
      </div>
    </main>
  );
}
