"use client";

import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { SuperAdminView } from "@/components/super-admin-view";

export default function SuperAdminStandalonePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Aplikasi Utama
          </Link>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Crown className="h-4 w-4" /> WACRM v4.0 · Super Admin Control Plane
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl">
        <SuperAdminView liveApiMode />
      </div>
    </main>
  );
}
