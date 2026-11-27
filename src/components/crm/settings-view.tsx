"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save, Store, Trash2, Users } from "lucide-react";
import type { MemberRole, StoreBusinessProfile, TeamMemberRecord } from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface SettingsViewProps {
  adapter: WorkspaceAdapter;
  workspaceName: string;
  workspaceSlug: string;
  storeProfile: StoreBusinessProfile;
  onSaveStoreProfile: (next: StoreBusinessProfile) => void;
  currentRole: MemberRole;
  members: TeamMemberRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

export function SettingsView({
  adapter,
  workspaceName,
  storeProfile,
  onSaveStoreProfile,
  currentRole,
  members,
  onRefresh,
  onToast,
}: SettingsViewProps) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(storeProfile.businessName);
  const [businessTagline, setBusinessTagline] = useState(storeProfile.businessTagline);
  const [phone, setPhone] = useState(storeProfile.phone);
  const [email, setEmail] = useState(storeProfile.email);
  const [address, setAddress] = useState(storeProfile.address);
  const [city, setCity] = useState(storeProfile.city);
  const [taxId, setTaxId] = useState(storeProfile.taxId);
  const [defaultCourier, setDefaultCourier] = useState(storeProfile.defaultCourier);
  const [invoiceFooter, setInvoiceFooter] = useState(storeProfile.invoiceFooter);
  const [saving, setSaving] = useState(false);

  async function handleSaveBusinessProfile(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSaving(true);
    try {
      const next: StoreBusinessProfile = {
        businessName: businessName.trim(),
        businessTagline: businessTagline.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        taxId: taxId.trim(),
        defaultCourier: defaultCourier.trim() || "JNE Reguler",
        invoiceFooter: invoiceFooter.trim(),
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
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Identitas Toko / Usaha (Untuk Cetak Invoice, Label QR &amp; Laporan)</h3>
              <p className="text-xs text-slate-500">
                Nama usaha Anda menggantikan seluruh label sistem pada setiap dokumen yang dicetak maupun dikirim ke pelanggan.
              </p>
            </div>
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
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4 text-emerald-600" />
            Anggota Tim &amp; Hak Akses ({members.length} orang — Multi-User Aktif)
          </h3>
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
