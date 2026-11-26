"use client";

import { useState, type FormEvent } from "react";
import { Building2, Mail, MessageCircle, Pencil, Phone, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { LIFECYCLE_LABELS, type ContactRecord, type LifecycleStage } from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface ContactsViewProps {
  adapter: WorkspaceAdapter;
  contacts: ContactRecord[];
  onRefresh: () => Promise<void>;
  onStartChat: (contact: ContactRecord) => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const emptyForm = {
  displayName: "",
  phoneE164: "",
  email: "",
  company: "",
  lifecycleStage: "lead" as LifecycleStage,
  tagsText: "",
  notes: "",
};

export function ContactsView({ adapter, contacts, onRefresh, onStartChat, onToast }: ContactsViewProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = contacts.filter((c) => {
    if (stageFilter !== "all" && c.lifecycleStage !== stageFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${c.displayName} ${c.phoneE164 ?? ""} ${c.email ?? ""} ${c.company ?? ""} ${c.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(contact: ContactRecord) {
    setEditing(contact);
    setForm({
      displayName: contact.displayName,
      phoneE164: contact.phoneE164 ?? "",
      email: contact.email ?? "",
      company: contact.company ?? "",
      lifecycleStage: contact.lifecycleStage,
      tagsText: contact.tags.join(", "),
      notes: contact.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const tags = form.tagsText
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    try {
      if (editing) {
        await adapter.updateContact(editing.id, {
          displayName: form.displayName.trim(),
          phoneE164: form.phoneE164.trim() || null,
          email: form.email.trim() || null,
          company: form.company.trim() || null,
          lifecycleStage: form.lifecycleStage,
          tags,
          notes: form.notes.trim() || null,
        });
        onToast("Kontak berhasil diperbarui.");
      } else {
        await adapter.createContact({
          displayName: form.displayName.trim(),
          phoneE164: form.phoneE164.trim() || undefined,
          email: form.email.trim() || undefined,
          company: form.company.trim() || undefined,
          lifecycleStage: form.lifecycleStage,
          tags,
          notes: form.notes.trim() || undefined,
        });
        onToast("Kontak baru berhasil ditambahkan.");
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan kontak.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contact: ContactRecord) {
    if (!window.confirm(`Hapus kontak "${contact.displayName}"? Percakapan terkait juga akan terhapus.`)) return;
    try {
      await adapter.deleteContact(contact.id);
      await onRefresh();
      onToast("Kontak berhasil dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus kontak.", "error");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Direktori Kontak Pelanggan</h2>
            <p className="text-sm text-slate-500">Tambah, ubah, kelompokkan tahap pelanggan, dan mulai percakapan langsung.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Kontak
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, telepon, perusahaan, label..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStageFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                stageFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua ({contacts.length})
            </button>
            {(Object.keys(LIFECYCLE_LABELS) as LifecycleStage[]).map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  stageFilter === stage ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {LIFECYCLE_LABELS[stage].label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact Grid / List */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">Belum ada kontak yang cocok</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Kontak Pertama
            </button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((contact) => (
              <article
                key={contact.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                        {contact.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900">{contact.displayName}</h3>
                        <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${LIFECYCLE_LABELS[contact.lifecycleStage].badgeClass}`}>
                          {LIFECYCLE_LABELS[contact.lifecycleStage].label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(contact)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        title="Ubah kontak"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(contact)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Hapus kontak"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    {contact.phoneE164 && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{contact.phoneE164}</span>
                      </p>
                    )}
                    {contact.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{contact.email}</span>
                      </p>
                    )}
                    {contact.company && (
                      <p className="flex items-center gap-2 truncate">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{contact.company}</span>
                      </p>
                    )}
                  </div>

                  {contact.notes && <p className="mt-2.5 line-clamp-2 text-xs text-slate-500">{contact.notes}</p>}

                  {contact.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {contact.tags.map((t) => (
                        <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => onStartChat(contact)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Mulai Percakapan
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{editing ? "Ubah Data Kontak" : "Tambah Kontak Baru"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <label className="block text-xs font-semibold text-slate-700">
                Nama Lengkap *
                <input
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Contoh: Siti Rahmawati"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Nomor WhatsApp / Telepon (E.164)
                  <input
                    value={form.phoneE164}
                    onChange={(e) => setForm({ ...form, phoneE164: e.target.value })}
                    placeholder="+6281234567890"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="pelanggan@bisnis.id"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Perusahaan / Toko
                  <input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Toko Berkah Mandiri"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Tahap Pelanggan
                  <select
                    value={form.lifecycleStage}
                    onChange={(e) => setForm({ ...form, lifecycleStage: e.target.value as LifecycleStage })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {(Object.keys(LIFECYCLE_LABELS) as LifecycleStage[]).map((st) => (
                      <option key={st} value={st}>
                        {LIFECYCLE_LABELS[st].label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Label (pisahkan dengan koma)
                <input
                  value={form.tagsText}
                  onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                  placeholder="vip, grosir, surabaya"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Catatan CRM
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Preferensi pengiriman, riwayat pembelian..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Kontak"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
