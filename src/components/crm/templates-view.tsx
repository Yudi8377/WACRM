"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  FileText,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  CS_SCENARIO_PRESETS,
  evaluateMetaTemplateCompliance,
  generateAiCustomerServiceTemplates,
  renderTemplatePreview,
  TEMPLATE_TONE_META,
  type AiTemplateGenerateMode,
  type AiTemplateGenerationResult,
  type CsScenarioId,
  type GeneratedOfficialTemplateDraft,
  type GeneratedQuickReplyDraft,
  type TemplateLanguage,
  type TemplateTone,
} from "@/lib/ai-template-generator";
import {
  CHANNEL_META,
  type ChannelType,
  type ErpProductRecord,
  type MessageTemplateRecord,
  type QuickReplyRecord,
  type StoreBusinessProfile,
  type TemplateCategory,
  type TemplateStatus,
} from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface TemplatesViewProps {
  adapter: WorkspaceAdapter;
  quickReplies: QuickReplyRecord[];
  templates: MessageTemplateRecord[];
  storeProfile?: StoreBusinessProfile;
  products?: ErpProductRecord[];
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

export function TemplatesView({
  adapter,
  quickReplies,
  templates,
  storeProfile,
  products = [],
  onRefresh,
  onToast,
}: TemplatesViewProps) {
  const [subTab, setSubTab] = useState<"quick_replies" | "templates">("quick_replies");
  const [showAiStudio, setShowAiStudio] = useState(true);

  // AI Generator Studio State
  const [aiMode, setAiMode] = useState<AiTemplateGenerateMode>("bundle");
  const [aiScenario, setAiScenario] = useState<CsScenarioId>("greeting_catalog");
  const [aiPrompt, setAiPrompt] = useState(CS_SCENARIO_PRESETS[0].samplePrompt);
  const [aiTone, setAiTone] = useState<TemplateTone>("ramah");
  const [aiLanguage, setAiLanguage] = useState<TemplateLanguage>("id");
  const [aiChannel, setAiChannel] = useState<ChannelType>("whatsapp");
  const [aiCategory, setAiCategory] = useState<TemplateCategory | "auto">("auto");
  const [aiSeed, setAiSeed] = useState(0);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSavingId, setAiSavingId] = useState<string | null>(null);
  const [aiSavedIds, setAiSavedIds] = useState<Record<string, boolean>>({});
  const [aiResult, setAiResult] = useState<AiTemplateGenerationResult | null>(null);

  // Quick Reply modal
  const [qrModal, setQrModal] = useState(false);
  const [editingQr, setEditingQr] = useState<QuickReplyRecord | null>(null);
  const [qrForm, setQrForm] = useState({
    shortcut: "",
    title: "",
    category: "umum",
    bodyText: "",
  });

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

  const liveModalCompliance = tplForm.bodyText.trim()
    ? evaluateMetaTemplateCompliance({
        name: tplForm.name || "draft_template",
        category: tplForm.category,
        bodyText: tplForm.bodyText,
      })
    : null;

  async function runAiGenerator(overrideSeed?: number) {
    setAiGenerating(true);
    const nextSeed = overrideSeed ?? aiSeed;
    try {
      let generated: AiTemplateGenerationResult | null = null;

      // Try server API first when running in live Neon workspace mode
      if (adapter.mode === "neon") {
        try {
          const res = await fetch(`/api/organizations/${adapter.tenantId}/templates/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: aiMode,
              prompt: aiPrompt,
              scenarioId: aiScenario,
              tone: aiTone,
              language: aiLanguage,
              channel: aiChannel,
              officialCategory: aiCategory === "auto" ? undefined : aiCategory,
              variationSeed: nextSeed,
            }),
          });
          if (res.ok) {
            generated = (await res.json()) as AiTemplateGenerationResult;
          }
        } catch {
          // Graceful fallback to local deterministic AI engine
        }
      }

      if (!generated) {
        generated = generateAiCustomerServiceTemplates({
          mode: aiMode,
          prompt: aiPrompt,
          scenarioId: aiScenario,
          tone: aiTone,
          language: aiLanguage,
          channel: aiChannel,
          officialCategory: aiCategory === "auto" ? undefined : aiCategory,
          storeProfile,
          products,
          existingShortcuts: quickReplies.map((q) => q.shortcut),
          existingTemplateNames: templates.map((t) => t.name),
          variationSeed: nextSeed,
        });
      }

      setAiResult(generated);
      setAiSavedIds({});
      const total = generated.quickReplies.length + generated.officialTemplates.length;
      onToast(`AI berhasil membuat ${total} draf respons CS (/slash & template resmi).`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menjalankan AI Generator.", "error");
    } finally {
      setAiGenerating(false);
    }
  }

  function handleSelectPreset(preset: (typeof CS_SCENARIO_PRESETS)[number]) {
    setAiScenario(preset.id);
    setAiPrompt(preset.samplePrompt);
    setAiCategory("auto");
  }

  async function saveGeneratedQr(draft: GeneratedQuickReplyDraft) {
    setAiSavingId(draft.id);
    try {
      await adapter.createQuickReply({
        shortcut: draft.shortcut,
        title: draft.title,
        category: draft.category,
        bodyText: draft.bodyText,
      });
      setAiSavedIds((prev) => ({ ...prev, [draft.id]: true }));
      await onRefresh();
      onToast(`Balasan cepat /${draft.shortcut} disimpan & langsung aktif di Inbox.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan balasan cepat.", "error");
    } finally {
      setAiSavingId(null);
    }
  }

  async function saveGeneratedTpl(draft: GeneratedOfficialTemplateDraft) {
    setAiSavingId(draft.id);
    try {
      await adapter.createTemplate({
        channel: draft.channel,
        name: draft.name,
        category: draft.category,
        language: draft.language,
        bodyText: draft.bodyText,
        status: draft.status,
      });
      setAiSavedIds((prev) => ({ ...prev, [draft.id]: true }));
      await onRefresh();
      onToast(`Template resmi "${draft.name}" berhasil disimpan.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan template resmi.", "error");
    } finally {
      setAiSavingId(null);
    }
  }

  async function saveAllGenerated() {
    if (!aiResult) return;
    setAiSavingId("all");
    let count = 0;
    try {
      for (const qr of aiResult.quickReplies) {
        if (aiSavedIds[qr.id]) continue;
        await adapter.createQuickReply({
          shortcut: qr.shortcut,
          title: qr.title,
          category: qr.category,
          bodyText: qr.bodyText,
        });
        setAiSavedIds((prev) => ({ ...prev, [qr.id]: true }));
        count++;
      }
      for (const tpl of aiResult.officialTemplates) {
        if (aiSavedIds[tpl.id]) continue;
        await adapter.createTemplate({
          channel: tpl.channel,
          name: tpl.name,
          category: tpl.category,
          language: tpl.language,
          bodyText: tpl.bodyText,
          status: tpl.status,
        });
        setAiSavedIds((prev) => ({ ...prev, [tpl.id]: true }));
        count++;
      }
      await onRefresh();
      onToast(`${count} balasan /slash & template resmi berhasil disimpan sekaligus!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Sebagian template gagal disimpan.", "error");
    } finally {
      setAiSavingId(null);
    }
  }

  function loadDraftIntoQrModal(draft: GeneratedQuickReplyDraft) {
    setEditingQr(null);
    setQrForm({
      shortcut: draft.shortcut,
      title: draft.title,
      category: draft.category,
      bodyText: draft.bodyText,
    });
    setQrModal(true);
  }

  function loadDraftIntoTplModal(draft: GeneratedOfficialTemplateDraft) {
    setEditingTpl(null);
    setTplForm({
      channel: draft.channel,
      name: draft.name,
      category: draft.category,
      language: draft.language,
      bodyText: draft.bodyText,
      status: draft.status,
    });
    setTplModal(true);
  }

  function aiAutofillQrModal() {
    const res = generateAiCustomerServiceTemplates({
      mode: "quick_reply",
      prompt: qrForm.title || qrForm.shortcut || "Balasan ramah layanan pelanggan",
      tone: aiTone,
      language: aiLanguage,
      channel: "whatsapp",
      storeProfile,
      products,
      existingShortcuts: quickReplies.map((q) => q.shortcut),
      variationSeed: Math.floor(Math.random() * 10),
    });
    const first = res.quickReplies[0];
    if (first) {
      setQrForm({
        shortcut: qrForm.shortcut || first.shortcut,
        title: qrForm.title || first.title,
        category: qrForm.category === "umum" ? first.category : qrForm.category,
        bodyText: first.bodyText,
      });
      onToast("AI mengisi draf balasan cepat /slash otomatis.");
    }
  }

  function aiAutofillTplModal() {
    const res = generateAiCustomerServiceTemplates({
      mode: "official_template",
      prompt: tplForm.name.replace(/_/g, " ") || "Konfirmasi pesanan resmi",
      tone: aiTone,
      language: tplForm.language === "en" ? "en" : "id",
      channel: tplForm.channel,
      officialCategory: tplForm.category,
      storeProfile,
      products,
      existingTemplateNames: templates.map((t) => t.name),
      variationSeed: Math.floor(Math.random() * 10),
    });
    const first = res.officialTemplates[0];
    if (first) {
      setTplForm({
        ...tplForm,
        name: editingTpl ? tplForm.name : tplForm.name || first.name,
        category: first.category,
        bodyText: first.bodyText,
        status: first.status,
      });
      onToast("AI mengisi draf template resmi sesuai aturan Meta Compliance.");
    }
  }

  function copyText(text: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      onToast(`${label} disalin ke clipboard.`);
    }
  }

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
    setTplForm({
      channel: "whatsapp",
      name: "",
      category: "utility",
      language: "id",
      bodyText: "",
      status: "draft",
    });
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
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Balasan Cepat &amp; Template Pesan
            </h2>
            <p className="text-sm text-slate-500">
              Percepat respons tim layanan pelanggan dengan AI Generator pintasan{" "}
              <code className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-xs text-emerald-700">
                /slash
              </code>{" "}
              dan template resmi siap approve Meta.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiStudio((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                showAiStudio
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              {showAiStudio ? "Tutup AI Generator" : "Buka AI Generator"}
            </button>
            <button
              type="button"
              onClick={subTab === "quick_replies" ? openCreateQr : openCreateTpl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              {subTab === "quick_replies" ? "Tambah Balasan Cepat" : "Tambah Template"}
            </button>
          </div>
        </div>

        {/* AI TEMPLATE & SLASH SHORTCUT GENERATOR STUDIO */}
        {showAiStudio && (
          <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-semibold text-indigo-200">
                  <Bot className="h-3.5 w-3.5 text-emerald-400" />
                  AI Copywriter Layanan Pelanggan · Otomatis Sinkron Profil Toko &amp; Katalog ERP
                </div>
                <h3 className="mt-2 text-lg font-bold text-white">
                  Generate Balasan Cepat (/slash) &amp; Template Resmi dengan AI
                </h3>
                <p className="mt-0.5 text-xs text-slate-300">
                  Pilih skenario CS atau tulis instruksi bebas — AI menghasilkan pintasan{" "}
                  <span className="font-mono text-emerald-300">/slash</span> anti-duplikat dan
                  template resmi lengkap variabel <span className="font-mono">{"{{1}}"}</span>,
                  pratinjau chat WhatsApp, serta skor kepatuhan Meta Approval.
                </p>
              </div>
              <div className="flex rounded-xl border border-slate-700 bg-slate-900/90 p-1 text-xs">
                {(
                  [
                    { id: "bundle", label: "Paket Lengkap", icon: Layers },
                    { id: "quick_reply", label: "/slash Cepat", icon: Zap },
                    { id: "official_template", label: "Template Resmi", icon: FileText },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAiMode(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                        aiMode === item.id
                          ? "bg-emerald-500 text-slate-950"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10 Quick Scenario Preset Chips */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                10 Skenario Layanan Pelanggan Instan
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CS_SCENARIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition ${
                      aiScenario === preset.id
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-emerald-400">/{preset.defaultShortcut}</span>{" "}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt + Controls */}
            <div className="mt-4 grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Instruksi / Konteks Pesan CS (Boleh Bebas)
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      setAiScenario("custom");
                    }}
                    placeholder="Contoh: Buat balasan sopan saat stok kosong tapi menawarkan diskon 10% untuk produk pengganti + template resmi notifikasi restock..."
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2.5 lg:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Gaya Bahasa (Tone)
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as TemplateTone)}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {(Object.keys(TEMPLATE_TONE_META) as TemplateTone[]).map((t) => (
                      <option key={t} value={t}>
                        {TEMPLATE_TONE_META[t].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Bahasa Output
                  <select
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value as TemplateLanguage)}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    <option value="id">Bahasa Indonesia (id)</option>
                    <option value="en">English (en)</option>
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Kanal Template Resmi
                  <select
                    value={aiChannel}
                    onChange={(e) => setAiChannel(e.target.value as ChannelType)}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {(Object.keys(CHANNEL_META) as ChannelType[]).map((ch) => (
                      <option key={ch} value={ch}>
                        {CHANNEL_META[ch].shortLabel}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-300">
                  Kategori Meta Resmi
                  <select
                    value={aiCategory}
                    onChange={(e) =>
                      setAiCategory(e.target.value as TemplateCategory | "auto")
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    <option value="auto">Otomatis (Dipilih AI)</option>
                    <option value="utility">Utility (Transaksi/Resi)</option>
                    <option value="service">Service (Layanan/Komplain)</option>
                    <option value="marketing">Marketing (Promo/Ulasan)</option>
                    <option value="authentication">Authentication (OTP)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3.5">
              <div className="text-[11px] text-slate-400">
                Konteks otomatis aktif:{" "}
                <strong className="text-slate-200">
                  {storeProfile?.businessName || "Workspace WACRM"}
                </strong>{" "}
                · {products.filter((p) => p.isActive).length} produk aktif
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {aiResult && (
                  <>
                    <button
                      type="button"
                      disabled={aiGenerating}
                      onClick={() => {
                        const next = aiSeed + 1;
                        setAiSeed(next);
                        void runAiGenerator(next);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Variasi Lain
                    </button>
                    <button
                      type="button"
                      disabled={aiSavingId === "all"}
                      onClick={() => void saveAllGenerated()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {aiSavingId === "all" ? "Menyimpan..." : "Simpan Semua Hasil AI"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => void runAiGenerator()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-emerald-400 disabled:opacity-60"
                >
                  <Wand2 className="h-4 w-4" />
                  {aiGenerating ? "AI Sedang Menulis..." : "Generate dengan AI"}
                </button>
              </div>
            </div>

            {/* GENERATED RESULTS PREVIEW */}
            {aiResult && (
              <div className="mt-5 space-y-4 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-300">
                    ✨ {aiResult.engineLabel}
                  </span>
                  <span className="text-slate-400">
                    {aiResult.quickReplies.length} Balasan /slash ·{" "}
                    {aiResult.officialTemplates.length} Template Resmi
                  </span>
                </div>

                {/* Generated Quick Replies */}
                {aiResult.quickReplies.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      ⚡ Hasil AI — Balasan Cepat (/slash)
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {aiResult.quickReplies.map((draft) => {
                        const saved = Boolean(aiSavedIds[draft.id]);
                        return (
                          <div
                            key={draft.id}
                            className="flex flex-col justify-between rounded-xl border border-slate-700/90 bg-slate-900/90 p-3.5"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                                  /{draft.shortcut}
                                </span>
                                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                  {draft.category} · {draft.tone}
                                </span>
                              </div>
                              <h4 className="mt-2 text-xs font-bold text-white">{draft.title}</h4>
                              <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-slate-950/80 p-2.5 text-[11px] leading-relaxed text-slate-200">
                                {draft.bodyText}
                              </p>
                              <p className="mt-1.5 text-[10px] text-slate-400">
                                💡 {draft.usageTip}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 pt-2">
                              <button
                                type="button"
                                disabled={saved || aiSavingId === draft.id}
                                onClick={() => void saveGeneratedQr(draft)}
                                className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                                  saved
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {saved
                                  ? "Tersimpan"
                                  : aiSavingId === draft.id
                                    ? "Menyimpan..."
                                    : "Simpan /slash"}
                              </button>
                              <button
                                type="button"
                                onClick={() => loadDraftIntoQrModal(draft)}
                                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                              >
                                Sunting
                              </button>
                              <button
                                type="button"
                                onClick={() => copyText(draft.bodyText, `/${draft.shortcut}`)}
                                className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800"
                                title="Salin teks"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Generated Official Templates */}
                {aiResult.officialTemplates.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      📜 Hasil AI — Template Resmi (Siap Meta Approval &amp; Variabel {"{{1}}"})
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {aiResult.officialTemplates.map((draft) => {
                        const saved = Boolean(aiSavedIds[draft.id]);
                        const previewText = renderTemplatePreview(
                          draft.bodyText,
                          draft.variableSamples,
                        );
                        return (
                          <div
                            key={draft.id}
                            className="flex flex-col justify-between rounded-xl border border-indigo-500/40 bg-slate-900/95 p-4"
                          >
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-xs font-bold text-indigo-200">
                                    {draft.name}
                                  </span>
                                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
                                    {draft.category} · {draft.language}
                                  </span>
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    draft.compliance.status === "ready"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  Meta {draft.compliance.score}/100
                                </span>
                              </div>

                              {/* Raw Template Body with {{n}} */}
                              <div className="mt-2.5">
                                <div className="text-[10px] font-semibold uppercase text-slate-400">
                                  Struktur Variabel Resmi
                                </div>
                                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] leading-relaxed text-slate-200">
                                  {draft.bodyText}
                                </p>
                              </div>

                              {/* Live Rendered WhatsApp Preview */}
                              <div className="mt-2.5">
                                <div className="text-[10px] font-semibold uppercase text-emerald-400">
                                  Pratinjau Pesan Diterima Pelanggan
                                </div>
                                <div className="mt-1 rounded-xl rounded-tl-none border border-emerald-500/30 bg-emerald-950/60 p-2.5 text-[11px] leading-relaxed text-emerald-100">
                                  {previewText}
                                </div>
                              </div>

                              {/* Compliance checklist */}
                              <div className="mt-2 space-y-1 text-[10px]">
                                {draft.compliance.issues.map((iss) => (
                                  <div key={iss} className="flex items-start gap-1 text-amber-300">
                                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                    <span>{iss}</span>
                                  </div>
                                ))}
                                {draft.compliance.issues.length === 0 && (
                                  <div className="text-emerald-300">✓ {draft.submissionNote}</div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-1.5 pt-2">
                              <button
                                type="button"
                                disabled={saved || aiSavingId === draft.id}
                                onClick={() => void saveGeneratedTpl(draft)}
                                className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                                  saved
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-indigo-500 text-white hover:bg-indigo-400"
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {saved
                                  ? "Tersimpan"
                                  : aiSavingId === draft.id
                                    ? "Menyimpan..."
                                    : "Simpan Template Resmi"}
                              </button>
                              <button
                                type="button"
                                onClick={() => loadDraftIntoTplModal(draft)}
                                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                              >
                                Sunting
                              </button>
                              <button
                                type="button"
                                onClick={() => copyText(draft.bodyText, draft.name)}
                                className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800"
                                title="Salin template"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Subtabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setSubTab("quick_replies")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === "quick_replies"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Balasan Cepat ({quickReplies.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("templates")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === "templates"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Template Pesan Resmi ({templates.length})
          </button>
        </div>

        {/* Saved List */}
        {subTab === "quick_replies" ? (
          quickReplies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Belum ada balasan cepat. Gunakan <strong>AI Generator</strong> di atas atau buat
              pintasan seperti <code className="font-mono">/salam</code> atau{" "}
              <code className="font-mono">/resi</code>.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {quickReplies.map((qr) => (
                <article
                  key={qr.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
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
                      <button
                        type="button"
                        onClick={() => copyText(qr.bodyText, `/${qr.shortcut}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Salin"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditQr(qr)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQr(qr)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                    {qr.bodyText}
                  </p>
                </article>
              ))}
            </div>
          )
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Belum ada template pesan resmi. Gunakan <strong>AI Generator</strong> di atas untuk
            membuat template siap approve Meta WhatsApp.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((tpl) => {
              const comp = evaluateMetaTemplateCompliance({
                name: tpl.name,
                category: tpl.category,
                bodyText: tpl.bodyText,
              });
              return (
                <article
                  key={tpl.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${CHANNEL_META[tpl.channel].badgeClass}`}
                        >
                          {CHANNEL_META[tpl.channel].shortLabel}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMPLATE_STATUS_BADGE[tpl.status]}`}
                        >
                          {tpl.status}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Meta {comp.score}/100
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {tpl.category} · {tpl.language}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-mono text-sm font-bold text-slate-900">
                        {tpl.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copyText(tpl.bodyText, tpl.name)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Salin"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditTpl(tpl)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTpl(tpl)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                    {tpl.bodyText}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK REPLY MODAL */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingQr ? "Ubah Balasan Cepat" : "Tambah Balasan Cepat"}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={aiAutofillQrModal}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <Sparkles className="h-3 w-3" /> Bantu Tulis AI
                </button>
                <button
                  type="button"
                  onClick={() => setQrModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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
                <button
                  type="button"
                  onClick={() => setQrModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
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
              <h3 className="text-base font-bold text-slate-900">
                {editingTpl ? "Ubah Template Pesan" : "Buat Template Pesan Resmi"}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={aiAutofillTplModal}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <Sparkles className="h-3 w-3" /> Bantu Tulis AI
                </button>
                <button
                  type="button"
                  onClick={() => setTplModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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
                    onChange={(e) =>
                      setTplForm({ ...tplForm, channel: e.target.value as ChannelType })
                    }
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
                    onChange={(e) =>
                      setTplForm({ ...tplForm, category: e.target.value as TemplateCategory })
                    }
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
                    onChange={(e) =>
                      setTplForm({ ...tplForm, status: e.target.value as TemplateStatus })
                    }
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

              {liveModalCompliance && (
                <div
                  className={`rounded-xl border p-2.5 text-[11px] ${
                    liveModalCompliance.status === "ready"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="font-bold">
                    Skor Meta Compliance: {liveModalCompliance.score}/100
                  </div>
                  {liveModalCompliance.issues.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4">
                      {liveModalCompliance.issues.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  ) : (
                    <div>✓ Struktur variabel dan kategori siap diajukan ke Meta API.</div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTplModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
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
