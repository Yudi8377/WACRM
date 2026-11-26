"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Database, RotateCcw, Save, Smartphone, Trash2, Users } from "lucide-react";
import type { MemberRole, TeamMemberRecord } from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface SettingsViewProps {
  adapter: WorkspaceAdapter;
  workspaceName: string;
  workspaceSlug: string;
  currentRole: MemberRole;
  members: TeamMemberRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

export function SettingsView({
  adapter,
  workspaceName,
  workspaceSlug,
  currentRole,
  members,
  onRefresh,
  onToast,
}: SettingsViewProps) {
  const router = useRouter();
  const [name, setName] = useState(workspaceName);
  const [savingName, setSavingName] = useState(false);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      await adapter.updateWorkspace(name.trim());
      await onRefresh();
      onToast("Nama workspace diperbarui.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memperbarui nama workspace.", "error");
    } finally {
      setSavingName(false);
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
    if (!window.confirm(`Keluarkan ${member.displayName} dari workspace ini?`)) return;
    try {
      await adapter.deleteMember(member.id);
      await onRefresh();
      onToast("Anggota dikeluarkan.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengeluarkan anggota.", "error");
    }
  }

  async function handleDeleteWorkspace() {
    if (!window.confirm(`Hapus permanen workspace "${workspaceName}" beserta seluruh data pelanggan & percakapan?`)) return;
    try {
      await adapter.deleteWorkspace();
      onToast("Workspace dihapus.");
      if (adapter.mode === "neon") {
        router.replace("/dashboard");
        router.refresh();
      } else {
        await onRefresh();
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus workspace.", "error");
    }
  }

  async function handleResetDemo() {
    if (!adapter.resetDemo) return;
    await adapter.resetDemo();
    await onRefresh();
    onToast("Data demo telah direset ke kondisi awal.");
  }

  const canManage = currentRole === "owner" || currentRole === "admin";

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pengaturan Workspace &amp; Tim</h2>
          <p className="text-sm text-slate-500">Kelola identitas organisasi, peran anggota, integrasi Neon DB, dan aplikasi Android.</p>
        </div>

        {/* Workspace Profile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-900">Profil Workspace</h3>
          <p className="mt-1 text-xs text-slate-500">
            Slug: <code className="font-mono text-slate-700">{workspaceSlug}</code> · Peran Anda:{" "}
            <strong className="uppercase text-emerald-700">{currentRole}</strong>
          </p>
          <form onSubmit={handleSaveName} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              required
              minLength={2}
              maxLength={160}
              disabled={!canManage}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm disabled:bg-slate-100"
            />
            {canManage && (
              <button
                type="submit"
                disabled={savingName}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingName ? "Menyimpan..." : "Simpan Nama"}
              </button>
            )}
          </form>
        </section>

        {/* Team Members */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4 text-emerald-600" />
            Anggota Tim ({members.length})
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

        {/* Neon & Android Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/setup"
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300"
          >
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Konfigurasi Database Neon</h4>
              <p className="mt-0.5 text-xs text-slate-500">
                Project <code className="font-mono">small-tree-35716017</code> · Branch <code className="font-mono">br-patient-mud-a1xi2iun</code>
              </p>
            </div>
          </Link>
          <Link
            href="/android"
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300"
          >
            <span className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Aplikasi Android &amp; PWA</h4>
              <p className="mt-0.5 text-xs text-slate-500">
                Pasang langsung di Android atau unduh proyek APK Kotlin native.
              </p>
            </div>
          </Link>
        </div>

        {/* Danger / Reset Zone */}
        <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
          <h3 className="text-sm font-bold text-red-900">
            {adapter.mode === "demo" ? "Reset Mode Demo" : "Zona Berbahaya"}
          </h3>
          <p className="mt-1 text-xs text-red-700">
            {adapter.mode === "demo"
              ? "Kembalikan seluruh data contoh lokal ke kondisi awal."
              : "Menghapus workspace akan menghapus semua kontak, percakapan, pesan, dan koneksi kanal secara permanen."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {adapter.mode === "demo" ? (
              <button
                type="button"
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Data Demo
              </button>
            ) : (
              currentRole === "owner" && (
                <button
                  type="button"
                  onClick={handleDeleteWorkspace}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Workspace Permanen
                </button>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
