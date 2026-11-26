"use client";

import { useState, type FormEvent } from "react";
import { FileText, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import {
  CHANNEL_META,
  type ChannelType,
  type MessageTemplateRecord,
  type QuickReplyRecord,
  type TemplateCategory,
  type TemplateStatus,
} from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface TemplatesViewProps {
  adapter: WorkspaceAdapter;
  quickReplies: QuickReplyRecord[];
  templates: MessageTemplateRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const TEMPLATE_STATUS_BADGE: Record<TemplateStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  archived: "bg-zinc-100 text-zinc-500",
};

export function TemplatesView({ adapter, quickReplies, templates, onRefresh, onToast }: TemplatesViewProps) {
  const [subTab, setSubTab] = useState<"quick_replies" | "templates">("quick_replies");

  // Quick Reply modal
  const [qrModal, setQrModal] = useState(false);
  const [editingQr, setEditingQr] = useState<QuickReplyRecord | null>(null);
  const [qrForm, setQrForm] = useState({ shortcut: "", title: "", category: "umum", bodyText: "" });

  // Message Template modal
  const [tplModal, setTplModal] = useState(false);
  const [editingTpl, setEditingTpl] = useState<MessageTemplateRecord | null>(null);
  const [tplForm, setTplForm] = useState({
    channel: "whatsapp" as ChannelType,
    name: "",
    category: "utility" as TemplateCategory,
    language: "id",
    bodyText: "",
    status: "draft" as TemplateStatus,
  });

  const [saving, setSaving] = useState(false);

  function openCreateQr() {
    setEditingQr(null);
    setQrForm({ shortcut: "", title: "", category: "umum", bodyText: "" });
    setQrModal(true);
  }

  function openEditQr(qr: QuickReplyRecord) {
    setEditingQr(qr);
    setQrForm({ shortcut: qr.shortcut, title: qr.title, category: qr.category, bodyText: qr.bodyText });
    setQrModal(true);
  }

  async function saveQr(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingQr) {
        await adapter.updateQuickReply(editingQr.id, qrForm);
        onToast("Balasan cepat diperbarui.");
      } else {
        await adapter.createQuickReply(qrForm);
        onToast("Balasan cepat ditambahkan.");
      }
      setQrModal(false);
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan balasan cepat.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQr(qr: QuickReplyRecord) {
    if (!window.confirm(`Hapus balasan cepat /${qr.shortcut}?`)) return;
    try {
      await adapter.deleteQuickReply(qr.id);
      await onRefresh();
      onToast("Balasan cepat dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus balasan cepat.", "error");
    }
  }

  function openCreateTpl() {
    setEditingTpl(null);
    setTplForm({ channel: "whatsapp", name: "", category: "utility", language: "id", bodyText: "", status: "draft" });
    setTplModal(true);
  }

  function openEditTpl(tpl: MessageTemplateRecord) {
    setEditingTpl(tpl);
    setTplForm({
      channel: tpl.channel,
      name: tpl.name,
      category: tpl.category,
      language: tpl.language,
      bodyText: tpl.bodyText,
      status: tpl.status,
    });
    setTplModal(true);
  }

  async function saveTpl(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTpl) {
        await adapter.updateTemplate(editingTpl.id, {
          category: tplForm.category,
          language: tplForm.language,
          bodyText: tplForm.bodyText,
          status: tplForm.status,
        });
        onToast("Template pesan diperbarui.");
      } else {
        await adapter.createTemplate(tplForm);
        onToast("Template pesan ditambahkan.");
      }
      setTplModal(false);
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan template.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTpl(tpl: MessageTemplateRecord) {
    if (!window.confirm(`Hapus template "${tpl.name}"?`)) return;
    try {
      await adapter.deleteTemplate(tpl.id);
      await onRefresh();
      onToast("Template pesan dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus template.", "error");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Balasan Cepat &amp; Template Pesan</h2>
            <p className="text-sm text-slate-500">Percepat respons tim layanan pelanggan dengan pintasan /slash dan template resmi.</p>
          </div>
          <button
            type="button"
            onClick={subTab === "quick_replies" ? openCreateQr : openCreateTpl}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            {subTab === "quick_replies" ? "Tambah Balasan Cepat" : "Tambah Template"}
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setSubTab("quick_replies")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === "quick_replies" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Balasan Cepat ({quickReplies.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("templates")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === "templates" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Template Pesan ({templates.length})
          </button>
        </div>

        {subTab === "quick_replies" ? (
          quickReplies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Belum ada balasan cepat. Buat pintasan seperti <code className="font-mono">/salam</code> atau <code className="font-mono">/resi</code>.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {quickReplies.map((qr) => (
                <article key={qr.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">
                        /{qr.shortcut}
                      </span>
                      <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {qr.category}
                      </span>
                      <h3 className="mt-1.5 text-sm font-bold text-slate-900">{qr.title}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEditQr(qr)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => deleteQr(qr)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{qr.bodyText}</p>
                </article>
              ))}
            </div>
          )
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Belum ada template pesan. Gunakan template untuk pesan notifikasi di luar jendela 24 jam WhatsApp.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((tpl) => (
              <article key={tpl.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${CHANNEL_META[tpl.channel].badgeClass}`}>
                        {CHANNEL_META[tpl.channel].shortLabel}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMPLATE_STATUS_BADGE[tpl.status]}`}>
                        {tpl.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {tpl.category} · {tpl.language}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-mono text-sm font-bold text-slate-900">{tpl.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEditTpl(tpl)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteTpl(tpl)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                  {tpl.bodyText}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* QUICK REPLY MODAL */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{editingQr ? "Ubah Balasan Cepat" : "Tambah Balasan Cepat"}</h3>
              <button type="button" onClick={() => setQrModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveQr} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Pintasan (tanpa /) *
                  <input
                    required
                    pattern="[a-z0-9_-]{2,40}"
                    value={qrForm.shortcut}
                    onChange={(e) => setQrForm({ ...qrForm, shortcut: e.target.value.toLowerCase() })}
                    placeholder="salam"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Kategori
                  <input
                    required
                    value={qrForm.category}
                    onChange={(e) => setQrForm({ ...qrForm, category: e.target.value })}
                    placeholder="penjualan"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Judul *
                <input
                  required
                  value={qrForm.title}
                  onChange={(e) => setQrForm({ ...qrForm, title: e.target.value })}
                  placeholder="Salam Pembuka"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Isi Pesan *
                <textarea
                  required
                  rows={4}
                  value={qrForm.bodyText}
                  onChange={(e) => setQrForm({ ...qrForm, bodyText: e.target.value })}
                  placeholder="Halo Kak! Ada yang bisa kami bantu?"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setQrModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}
      {tplModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{editingTpl ? "Ubah Template Pesan" : "Buat Template Pesan"}</h3>
              <button type="button" onClick={() => setTplModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveTpl} className="mt-4 space-y-3.5">
              <label className="block text-xs font-semibold text-slate-700">
                Nama Template (snake_case) *
                <input
                  required
                  disabled={Boolean(editingTpl)}
                  pattern="[a-z0-9_]{2,80}"
                  value={tplForm.name}
                  onChange={(e) => setTplForm({ ...tplForm, name: e.target.value.toLowerCase() })}
                  placeholder="konfirmasi_pesanan"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Kanal
                  <select
                    disabled={Boolean(editingTpl)}
                    value={tplForm.channel}
                    onChange={(e) => setTplForm({ ...tplForm, channel: e.target.value as ChannelType })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {(Object.keys(CHANNEL_META) as ChannelType[]).map((ch) => (
                      <option key={ch} value={ch}>
                        {CHANNEL_META[ch].shortLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Kategori
                  <select
                    value={tplForm.category}
                    onChange={(e) => setTplForm({ ...tplForm, category: e.target.value as TemplateCategory })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="utility">Utility</option>
                    <option value="marketing">Marketing</option>
                    <option value="authentication">Authentication</option>
                    <option value="service">Service</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Bahasa
                  <input
                    required
                    value={tplForm.language}
                    onChange={(e) => setTplForm({ ...tplForm, language: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Status
                  <select
                    value={tplForm.status}
                    onChange={(e) => setTplForm({ ...tplForm, status: e.target.value as TemplateStatus })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="archived">Diarsipkan</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Isi Template (gunakan {"{{1}}"} untuk variabel) *
                <textarea
                  required
                  rows={4}
                  value={tplForm.bodyText}
                  onChange={(e) => setTplForm({ ...tplForm, bodyText: e.target.value })}
                  placeholder="Halo {{1}}, pesanan #{{2}} sedang dalam pengiriman."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setTplModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
