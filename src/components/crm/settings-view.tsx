"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Database,
  Globe,
  KeyRound,
  Lock,
  RotateCcw,
  Save,
  Smartphone,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { evaluateEditionQuota, getEditionMatrixCapabilities } from "@/lib/access-control";
import type { AppEditionId, MemberRole, StoreBusinessProfile, TeamMemberRecord } from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface SettingsViewProps {
  adapter: WorkspaceAdapter;
  editionId?: AppEditionId;
  licenseMaxSeats?: number | null;
  workspaceName: string;
  workspaceSlug: string;
  storeProfile: StoreBusinessProfile;
  onSaveStoreProfile: (next: StoreBusinessProfile) => void;
  onUpgradeRequest?: () => void;
  currentRole: MemberRole;
  members: TeamMemberRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

export function SettingsView({
  adapter,
  editionId = "starter",
  licenseMaxSeats,
  workspaceName,
  storeProfile,
  onSaveStoreProfile,
  onUpgradeRequest,
  currentRole,
  members,
  onRefresh,
  onToast,
}: SettingsViewProps) {
  const router = useRouter();
  const caps = getEditionMatrixCapabilities(editionId, licenseMaxSeats);
  const seatQuota = evaluateEditionQuota(editionId, "agents", members.length, licenseMaxSeats);
  const [businessName, setBusinessName] = useState(storeProfile.businessName);
  const [businessTagline, setBusinessTagline] = useState(storeProfile.businessTagline);
  const [phone, setPhone] = useState(storeProfile.phone);
  const [email, setEmail] = useState(storeProfile.email);
  const [address, setAddress] = useState(storeProfile.address);
  const [city, setCity] = useState(storeProfile.city);
  const [taxId, setTaxId] = useState(storeProfile.taxId);
  const [defaultCourier, setDefaultCourier] = useState(storeProfile.defaultCourier);
  const [invoiceFooter, setInvoiceFooter] = useState(storeProfile.invoiceFooter);
  const [customDomain, setCustomDomain] = useState(storeProfile.sovereignConfig?.customDomain ?? "");
  const [brandedApkName, setBrandedApkName] = useState(storeProfile.sovereignConfig?.brandedApkName ?? "");
  const [brandedPackageId, setBrandedPackageId] = useState(
    storeProfile.sovereignConfig?.brandedPackageId ?? "",
  );
  const [dedicatedDbRegion, setDedicatedDbRegion] = useState(
    storeProfile.sovereignConfig?.dedicatedDbRegion ?? "ap-southeast-1 (Singapore)",
  );
  const [saving, setSaving] = useState(false);

  async function handleSaveBusinessProfile(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSaving(true);
    try {
      const next: StoreBusinessProfile = {
        ...storeProfile,
        businessName: businessName.trim(),
        businessTagline: businessTagline.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        taxId: taxId.trim(),
        defaultCourier: defaultCourier.trim() || "JNE Reguler",
        invoiceFooter: invoiceFooter.trim(),
        ...(caps.customBrandedApk || caps.dedicatedDbSla
          ? {
              sovereignConfig: {
                customDomain: customDomain.trim(),
                brandedApkName: brandedApkName.trim(),
                brandedPackageId: brandedPackageId.trim(),
                dedicatedDbRegion: dedicatedDbRegion.trim(),
              },
            }
          : {}),
      };
      onSaveStoreProfile(next);
      if (canManage && businessName.trim() !== workspaceName) {
        await adapter.updateWorkspace(businessName.trim());
        await onRefresh();
      }
      onToast(
        "Profil Toko & Usaha disimpan! Seluruh Invoice, Label Pengiriman QR & Laporan kini memakai identitas usaha Anda.",
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan profil usaha.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(member: TeamMemberRecord, role: MemberRole) {
    try {
      await adapter.updateMember(member.id, { role });
      await onRefresh();
      onToast(`Peran ${member.displayName} diubah menjadi ${role}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengubah peran.", "error");
    }
  }

  async function handleRemoveMember(member: TeamMemberRecord) {
    if (!window.confirm(`Keluarkan ${member.displayName} dari tim usaha ini?`)) return;
    try {
      await adapter.deleteMember(member.id);
      await onRefresh();
      onToast("Anggota tim dikeluarkan.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengeluarkan anggota.", "error");
    }
  }

  async function handleDeleteWorkspace() {
    if (!window.confirm(`Hapus permanen ruang kerja "${storeProfile.businessName}" beserta seluruh datanya?`)) return;
    try {
      await adapter.deleteWorkspace();
      onToast("Ruang kerja dihapus.");
      if (adapter.mode === "neon") {
        router.replace("/dashboard");
        router.refresh();
      } else {
        await onRefresh();
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus ruang kerja.", "error");
    }
  }

  async function handleResetDemo() {
    if (!adapter.resetDemo) return;
    if (!window.confirm("Kembalikan data contoh lokal ke kondisi awal?")) return;
    await adapter.resetDemo();
    await onRefresh();
    onToast("Data contoh telah direset ke kondisi awal.");
  }

  const canManage = currentRole === "owner" || currentRole === "admin";

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pengaturan Profil Usaha &amp; Tim</h2>
          <p className="text-sm text-slate-500">
            Atur identitas toko/usaha yang tampil di seluruh Invoice, Label Pengiriman QR, Struk Thermal, Laporan Keuangan, serta hak akses tim Anda.
          </p>
        </div>

        {/* White-Label Store / Business Profile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Identitas Toko / Usaha (Untuk Cetak Invoice, Label QR &amp; Laporan)</h3>
                <p className="text-xs text-slate-500">
                  {caps.whiteLabelStore
                    ? "100% White-Label Aktif — Nama usaha Anda menggantikan seluruh label sistem tanpa watermark WACRM."
                    : "Starter UMKM menambahkan watermark 'Powered by WACRM Starter UMKM' pada struk & invoice. Upgrade ke Growth Pro untuk 100% White-Label."}
                </p>
              </div>
            </div>
            {caps.whiteLabelStore ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" /> 100% White-Label Aktif
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onUpgradeRequest?.()}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
              >
                <Lock className="h-3 w-3" /> White-Label Penuh (Growth Pro)
              </button>
            )}
          </div>

          <form onSubmit={handleSaveBusinessProfile} className="mt-4 space-y-3.5 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block font-semibold text-slate-700">
                Nama Toko / Perusahaan *
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Contoh: Toko Berkah Nusantara"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                Tagline / Bidang Usaha
                <input
                  value={businessTagline}
                  onChange={(e) => setBusinessTagline(e.target.value)}
                  placeholder="Contoh: Grosir & Retail Terpercaya"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block font-semibold text-slate-700">
                No. Telepon / WhatsApp Toko
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812-3456-7890"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                Email Usaha
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cs@tokoanda.id"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                Kota Asal Pengiriman
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kota Kediri"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
            </div>

            <label className="block font-semibold text-slate-700">
              Alamat Lengkap Toko / Gudang (Pengirim pada Label Pengiriman QR)
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Dhoho No. 88, Kota Kediri, Jawa Timur"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block font-semibold text-slate-700">
                Kurir Pengiriman Default
                <input
                  value={defaultCourier}
                  onChange={(e) => setDefaultCourier(e.target.value)}
                  placeholder="JNE Reguler"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
              <label className="block font-semibold text-slate-700">
                NPWP Usaha (Opsional)
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="00.000.000.0-000.000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
            </div>

            <label className="block font-semibold text-slate-700">
              Catatan Kaki / Footer Invoice &amp; Struk
              <textarea
                rows={2}
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Profil Usaha"}
              </button>
            </div>
          </form>
        </section>

        {/* Team Members & RBAC */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users className="h-4 w-4 text-emerald-600" />
              Anggota Tim &amp; Kuota Kursi Lisensi ({members.length} /{" "}
              {seatQuota.isUnlimited ? "∞ Unlimited" : `${seatQuota.limit} agen`} · {caps.editionName})
            </h3>
            {!seatQuota.canAddMore && onUpgradeRequest && (
              <button
                type="button"
                onClick={onUpgradeRequest}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
              >
                <KeyRound className="h-3.5 w-3.5" /> Tambah Kuota Kursi
              </button>
            )}
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.displayName}</p>
                  <p className="text-xs text-slate-500">Status: {m.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    disabled={!canManage}
                    value={m.role}
                    onChange={(e) => handleRoleChange(m, e.target.value as MemberRole)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="agent">Agent</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Keluarkan anggota"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sovereign Corporate Infrastructure: Custom Branded APK, Custom Domain & Dedicated Neon DB SLA 99.95% */}
        <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Infrastruktur Sovereign Corporate — Custom Domain, Branded Android APK &amp; Dedicated DB SLA 99.95%
                </h3>
                {!caps.customBrandedApk && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                    <Lock className="h-3 w-3" /> Sovereign Corporate
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Konfigurasi domain korporasi, aplikasi Android APK berlabel perusahaan Anda sendiri, dan klaster Neon PostgreSQL Dedicated SLA 99.95%.
              </p>
            </div>
            {!caps.customBrandedApk && onUpgradeRequest && (
              <button
                type="button"
                onClick={onUpgradeRequest}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                <KeyRound className="h-3.5 w-3.5" /> Aktifkan License Key Sovereign
              </button>
            )}
          </div>

          {!caps.customBrandedApk && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              Mode Pratinjau — Lisensi aktif Anda (<strong>{caps.editionName}</strong>) belum membuka Custom Branded APK, Custom Domain &amp; Dedicated DB SLA 99.95%. Masukkan License Key <strong>Sovereign Corporate</strong> di menu Edisi &amp; Lisensi untuk mengaktifkan.
            </div>
          )}

          <div
            className={`mt-4 grid gap-3 text-xs sm:grid-cols-2 ${
              !caps.customBrandedApk ? "pointer-events-none select-none opacity-65" : ""
            }`}
          >
            <label className="block font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-indigo-500" /> Custom Domain Korporasi
              </span>
              <input
                disabled={!caps.customBrandedApk}
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="crm.perusahaananda.co.id"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Nama Aplikasi Android APK Berlabel Sendiri
              </span>
              <input
                disabled={!caps.customBrandedApk}
                value={brandedApkName}
                onChange={(e) => setBrandedApkName(e.target.value)}
                placeholder="Nusantara Retail CRM"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              Android Package ID (Play Store / Internal MDM)
              <input
                disabled={!caps.customBrandedApk}
                value={brandedPackageId}
                onChange={(e) => setBrandedPackageId(e.target.value)}
                placeholder="id.co.perusahaananda.crm"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm font-normal text-slate-900"
              />
            </label>
            <label className="block font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Database className="h-3.5 w-3.5 text-cyan-600" /> Region Dedicated Neon DB &amp; SLA 99.95%
              </span>
              <select
                disabled={!caps.dedicatedDbSla}
                value={dedicatedDbRegion}
                onChange={(e) => setDedicatedDbRegion(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
              >
                <option value="ap-southeast-1 (Singapore)">ap-southeast-1 (Singapore · SLA 99.95%)</option>
                <option value="ap-southeast-3 (Jakarta)">ap-southeast-3 (Jakarta · SLA 99.95%)</option>
                <option value="us-east-1 (Virginia)">us-east-1 (Virginia · SLA 99.95%)</option>
              </select>
            </label>
          </div>
          {caps.customBrandedApk && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900">
              <span>
                ✓ <strong>Sovereign Corporate Aktif:</strong> Simpan perubahan lewat tombol &ldquo;Simpan Profil Usaha&rdquo; di atas. Backup harian otomatis &amp; SLA 99.95% aktif.
              </span>
            </div>
          )}
        </section>

        {/* Reset / Danger Zone */}
        <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
          <h3 className="text-sm font-bold text-red-900">
            {adapter.mode === "demo" ? "Reset Data Contoh" : "Zona Berbahaya"}
          </h3>
          <p className="mt-1 text-xs text-red-700">
            {adapter.mode === "demo"
              ? "Kembalikan seluruh data contoh ke kondisi awal."
              : "Menghapus ruang kerja akan menghapus seluruh kontak, percakapan, transaksi POS, dan koneksi kanal secara permanen."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {adapter.mode === "demo" ? (
              <button
                type="button"
                onClick={() => void handleResetDemo()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Data Contoh
              </button>
            ) : (
              currentRole === "owner" && (
                <button
                  type="button"
                  onClick={() => void handleDeleteWorkspace()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Ruang Kerja Permanen
                </button>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
