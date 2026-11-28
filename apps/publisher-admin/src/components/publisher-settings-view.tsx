"use client";

import { useState, type FormEvent } from "react";
import { Building2, Download, Lock, Monitor, RotateCcw, Save, ShieldCheck } from "lucide-react";
import type { PublisherCompanyProfile, PublisherEmsState } from "@/lib/publisher-types";

interface PublisherSettingsViewProps {
  state: PublisherEmsState;
  onSaveProfile: (profile: PublisherCompanyProfile) => void;
  onResetDemo: () => void;
}

export function PublisherSettingsView({
  state,
  onSaveProfile,
  onResetDemo,
}: PublisherSettingsViewProps) {
  const [form, setForm] = useState<PublisherCompanyProfile>(state.profile);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSaveProfile(form);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white">
          Pengaturan Entitas Perusahaan Penerbit &amp; Keamanan
        </h2>
        <p className="text-xs text-slate-400">
          Identitas legal penerbit WACRM untuk Sertifikat Lisensi, Faktur Pajak PPN 11%, dan
          konektor verifikasi ke aplikasi WACRM klien.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-xs lg:col-span-2"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Building2 className="h-4 w-4 text-emerald-400" /> Identitas Legal &amp; Perpajakan
            Penerbit
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block font-semibold text-slate-300">
              Nama Perusahaan Penerbit *
              <input
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block font-semibold text-slate-300">
              NPWP Perusahaan (PKP)
              <input
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
              />
            </label>
            <label className="block font-semibold text-slate-300">
              Email Resmi Lisensi
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block font-semibold text-slate-300">
              Telepon / Hotline Enterprise
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block font-semibold text-slate-300">
              Bank Penerimaan Langganan
              <input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block font-semibold text-slate-300">
              Nomor Rekening Penerbit
              <input
                value={form.bankAccountNo}
                onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
              />
            </label>
          </div>

          <label className="block font-semibold text-slate-300">
            Alamat Kantor Pusat Penerbit
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 font-bold text-rose-300 hover:bg-rose-500/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Data Awal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Save className="h-4 w-4" /> Simpan Profil Penerbit
            </button>
          </div>
        </form>

        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Isolasi &amp; Keamanan Aplikasi Terpisah
            </div>
            <ul className="mt-3 space-y-2 text-slate-300">
              <li>
                • <strong>Zero Public SEO:</strong> Header <code className="font-mono">X-Robots-Tag: noindex, nofollow</code> dan <code className="font-mono">robots.txt: Disallow: /</code> aktif penuh agar sistem internal penerbit tidak pernah muncul di mesin pencari.
              </li>
              <li>
                • <strong>Deployment Independen:</strong> Folder <code className="font-mono">apps/publisher-admin</code> dapat di-deploy sebagai proyek Vercel/server terpisah dengan domain internal sendiri (mis. <code className="font-mono">hq.wacrm.id</code>).
              </li>
              <li>
                • <strong>API Verifikasi Lisensi:</strong> Aplikasi WACRM klien memvalidasi License Key via <code className="font-mono">POST /api/licenses/verify</code> atau verifikasi tanda tangan kriptografi offline.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-500/35 bg-amber-950/15 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Monitor className="h-4 w-4" /> Aplikasi Desktop Windows v5.3 (Offline Installer)
            </div>
            <p className="mt-2 text-slate-300 leading-relaxed">
              Instal <strong>100% secara offline</strong> di Windows 10/11 (mengompilasi launcher native{" "}
              <code className="font-mono">WACRM-Publisher-HQ.exe</code> + shortcut Desktop &amp; Start Menu tanpa Node.js/Admin). Saat dijalankan, aplikasi langsung terhubung <strong>online</strong> ke server Publisher HQ v5.3.
            </p>
            <a
              href="/downloads/WACRM-Publisher-HQ-v5.3-Windows-Offline-Installer.zip"
              download
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
            >
              <Download className="h-4 w-4" /> Unduh Paket Windows Offline Installer (.zip)
            </a>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Lock className="h-4 w-4" /> Matriks Peran Internal Penerbit (RBAC)
            </div>
            <div className="mt-3 space-y-1.5 text-slate-300">
              <div>• <strong>Super Admin:</strong> Akses penuh LMS, ERP, CRM, Akuntansi &amp; Cabut Lisensi.</div>
              <div>• <strong>License Officer:</strong> Terbitkan, perpanjang &amp; audit License Key.</div>
              <div>• <strong>Finance Controller:</strong> Jurnal PSAK, Pengakuan Pendapatan &amp; Pajak PPN.</div>
              <div>• <strong>Sales AE &amp; CS:</strong> Pipeline B2B, Reseller &amp; Tiket SLA Enterprise.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
