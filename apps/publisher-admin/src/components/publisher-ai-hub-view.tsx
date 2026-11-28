"use client";

import { useState, type FormEvent } from "react";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { EmsActionToolbar } from "./ems-action-toolbar";
import type { EditionId, PublisherCompanyProfile } from "@/lib/publisher-types";
import {
  buildFollowUpScript,
  buildWhatsappDeepLink,
  generateMultiAgentChatReply,
  qualifyWebsiteLead,
  type PublisherAiAgentConfig,
  type PublisherWebsiteLead,
} from "@/lib/publisher-ai-agents";
import { exportEmsRowsToCsv } from "@/lib/publisher-crud";
import { printEmsTableReport } from "@/lib/publisher-print";

export type AiHubSubModule = "inbox_chat" | "website_leads" | "agent_config";

interface PublisherAiHubViewProps {
  profile: PublisherCompanyProfile;
  subModule: AiHubSubModule;
  onSelectSubModule: (sub: AiHubSubModule) => void;
  leads: PublisherWebsiteLead[];
  agents: PublisherAiAgentConfig[];
  syncingLeads: boolean;
  onSyncLeads: () => void;
  onInsertLead: (lead: PublisherWebsiteLead) => void;
  onUpdateLead: (id: string, patch: Partial<PublisherWebsiteLead>) => void;
  onDeleteLead: (id: string) => void;
  onConvertLeadToDeal: (lead: PublisherWebsiteLead) => void;
  onUpdateAgent: (id: PublisherAiAgentConfig["id"], patch: Partial<PublisherAiAgentConfig>) => void;
}

export function PublisherAiHubView({
  profile,
  subModule,
  onSelectSubModule,
  leads,
  agents,
  syncingLeads,
  onSyncLeads,
  onInsertLead,
  onUpdateLead,
  onDeleteLead,
  onConvertLeadToDeal,
  onUpdateAgent,
}: PublisherAiHubViewProps) {
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id ?? "");
  const [chatInput, setChatInput] = useState("");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  // Insert/Update Lead Form
  const [fName, setFName] = useState("");
  const [fCompany, setFCompany] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fWa, setFWa] = useState("");
  const [fCity, setFCity] = useState("Jakarta");
  const [fIndustry, setFIndustry] = useState("Retail & Distribusi");
  const [fTeamSize, setFTeamSize] = useState("10-30 orang");
  const [fEdition, setFEdition] = useState<EditionId>("pro");
  const [fStatus, setFStatus] = useState<PublisherWebsiteLead["status"]>("ai_engaged");
  const [fNotes, setFNotes] = useState("");

  // Editing AI Agent Prompt
  const [editingAgentId, setEditingAgentId] = useState<PublisherAiAgentConfig["id"] | null>(null);
  const [agentPromptDraft, setAgentPromptDraft] = useState("");

  const filteredLeads = leads.filter((l) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.fullName.toLowerCase().includes(q) ||
      l.companyName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.registrationCode.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q)
    );
  });

  const activeLead =
    leads.find((l) => l.id === selectedLeadId) ?? filteredLeads[0] ?? leads[0] ?? null;

  function openInsertLead() {
    setEditingLeadId(null);
    setFName("");
    setFCompany("");
    setFEmail("");
    setFWa("");
    setFCity("Surabaya");
    setFIndustry("Retail & F&B");
    setFTeamSize("10-30 orang");
    setFEdition("pro");
    setFStatus("new");
    setFNotes("");
    setShowLeadModal(true);
  }

  function openEditLead(lead: PublisherWebsiteLead) {
    setEditingLeadId(lead.id);
    setFName(lead.fullName);
    setFCompany(lead.companyName);
    setFEmail(lead.email);
    setFWa(lead.whatsapp);
    setFCity(lead.city);
    setFIndustry(lead.industry);
    setFTeamSize(lead.teamSize);
    setFEdition(lead.interestedEdition);
    setFStatus(lead.status);
    setFNotes(lead.notes);
    setShowLeadModal(true);
  }

  function handleSaveLead(e: FormEvent) {
    e.preventDefault();
    if (!fName.trim() || !fCompany.trim() || !fEmail.trim()) return;
    if (editingLeadId) {
      onUpdateLead(editingLeadId, {
        fullName: fName.trim(),
        companyName: fCompany.trim(),
        email: fEmail.trim(),
        whatsapp: fWa.trim(),
        city: fCity.trim(),
        industry: fIndustry.trim(),
        teamSize: fTeamSize.trim(),
        interestedEdition: fEdition,
        status: fStatus,
        notes: fNotes.trim(),
      });
    } else {
      const now = new Date().toISOString();
      const q = qualifyWebsiteLead({
        fullName: fName.trim(),
        companyName: fCompany.trim(),
        interestedEdition: fEdition,
        teamSize: fTeamSize,
        industry: fIndustry,
        city: fCity,
        notes: fNotes,
      });
      const created: PublisherWebsiteLead = {
        id: `lead-${Date.now()}`,
        registrationCode: `WCRM-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        fullName: fName.trim(),
        companyName: fCompany.trim(),
        email: fEmail.trim(),
        whatsapp: fWa.trim(),
        city: fCity.trim() || "Indonesia",
        industry: fIndustry.trim() || "UMKM",
        teamSize: fTeamSize.trim() || "1-10 orang",
        interestedEdition: fEdition,
        source: "manual_ems",
        notes: fNotes.trim(),
        status: fStatus,
        aiScore: q.aiScore,
        aiRecommendedEdition: q.aiRecommendedEdition,
        aiWelcomeReply: q.aiWelcomeReply,
        followUpStage: "H+0",
        lastFollowUpAt: now,
        messages: [
          {
            id: `msg-${Date.now()}-a`,
            sender: "ai_agent",
            agentId: "ai_concierge",
            agentName: "Nadia AI · Sales Concierge 24/7",
            text: q.aiWelcomeReply,
            timestamp: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      onInsertLead(created);
      setSelectedLeadId(created.id);
    }
    setShowLeadModal(false);
  }

  function handleSendChatOrAiReply(mode: "prospect_test" | "admin_reply" | "ai_autopilot") {
    if (!activeLead) return;
    const now = new Date().toISOString();

    if (mode === "ai_autopilot") {
      const lastProspect = [...activeLead.messages].reverse().find((m) => m.sender === "prospect");
      const prompt = lastProspect?.text || activeLead.notes || `Minta info paket ${activeLead.interestedEdition}`;
      const ai = generateMultiAgentChatReply(prompt, {
        prospectName: activeLead.fullName,
        companyName: activeLead.companyName,
      });
      onUpdateLead(activeLead.id, {
        status: "ai_engaged",
        lastFollowUpAt: now,
        messages: [
          ...activeLead.messages,
          {
            id: `msg-${Date.now()}`,
            sender: "ai_agent",
            agentId: ai.agentId,
            agentName: ai.agentName,
            text: ai.reply,
            timestamp: now,
          },
        ],
      });
      return;
    }

    const txt = chatInput.trim();
    if (!txt) return;
    setChatInput("");

    if (mode === "admin_reply") {
      onUpdateLead(activeLead.id, {
        status: "follow_up",
        lastFollowUpAt: now,
        messages: [
          ...activeLead.messages,
          {
            id: `msg-${Date.now()}`,
            sender: "publisher_admin",
            agentName: "Admin Sales Publisher HQ",
            text: txt,
            timestamp: now,
          },
        ],
      });
      return;
    }

    // Prospect chat simulation -> Multi-Agent AI automatically replies in real-time!
    const ai = generateMultiAgentChatReply(txt, {
      prospectName: activeLead.fullName,
      companyName: activeLead.companyName,
    });
    const conciergeActive = agents.find((a) => a.id === ai.agentId)?.autoReplyEnabled ?? true;
    const nextMsgs = [
      ...activeLead.messages,
      {
        id: `msg-${Date.now()}-p`,
        sender: "prospect" as const,
        text: txt,
        timestamp: now,
      },
      ...(conciergeActive
        ? [
            {
              id: `msg-${Date.now()}-ai`,
              sender: "ai_agent" as const,
              agentId: ai.agentId,
              agentName: ai.agentName,
              text: ai.reply,
              timestamp: now,
            },
          ]
        : []),
    ];
    onUpdateLead(activeLead.id, {
      status: "ai_engaged",
      aiRecommendedEdition: ai.suggestedEdition ?? activeLead.aiRecommendedEdition,
      messages: nextMsgs,
    });
  }

  function handleTriggerFollowUp(lead: PublisherWebsiteLead, stage: "H+0" | "H+1" | "H+3" | "H+7") {
    const script = buildFollowUpScript(lead, stage);
    const now = new Date().toISOString();
    onUpdateLead(lead.id, {
      followUpStage: stage,
      status: "follow_up",
      lastFollowUpAt: now,
      messages: [
        ...lead.messages,
        {
          id: `msg-fu-${Date.now()}`,
          sender: "ai_agent",
          agentId: "ai_followup",
          agentName: `Raka AI · Follow-Up ${stage}`,
          text: script,
          timestamp: now,
        },
      ],
    });
    const waUrl = buildWhatsappDeepLink(lead.whatsapp, script);
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  }

  function handlePrintLeads() {
    printEmsTableReport({
      profile,
      title: "Laporan Multi-Agent AI & Pipeline Lead Website",
      subtitle: "Daftar prospek pendaftar otomatis dari Enterprise Website & status penanganan 5 Agen AI.",
      docCode: `AI-LEAD-${new Date().toISOString().slice(0, 10)}`,
      columns: ["Kode Reg", "Prospek & Perusahaan", "WhatsApp / Email", "Edisi AI", "Skor BANT", "Follow-Up", "Status"],
      rows: filteredLeads.map((l) => [
        l.registrationCode,
        `${l.fullName} — ${l.companyName} (${l.city})`,
        `${l.whatsapp} / ${l.email}`,
        l.aiRecommendedEdition.toUpperCase(),
        `${l.aiScore}/100`,
        l.followUpStage,
        l.status.toUpperCase(),
      ]),
      summaryNotes: [
        `Total Lead Aktif: ${filteredLeads.length} prospek`,
        `Agen AI Aktif: ${agents.filter((a) => a.isActive).length} dari ${agents.length} agen`,
        `Rata-rata Skor Kesiapan Beli (BANT): ${
          filteredLeads.length
            ? Math.round(filteredLeads.reduce((s, l) => s + l.aiScore, 0) / filteredLeads.length)
            : 0
        }/100`,
      ],
    });
  }

  function handleExportCsv() {
    exportEmsRowsToCsv(
      "wacrm-publisher-ai-leads.csv",
      ["Kode Reg", "Nama", "Perusahaan", "Email", "WhatsApp", "Kota", "Industri", "Edisi Minat", "Rekomendasi AI", "Skor AI", "Stage Follow-Up", "Status"],
      filteredLeads.map((l) => [
        l.registrationCode,
        l.fullName,
        l.companyName,
        l.email,
        l.whatsapp,
        l.city,
        l.industry,
        l.interestedEdition,
        l.aiRecommendedEdition,
        l.aiScore,
        l.followUpStage,
        l.status,
      ]),
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-extrabold text-white">
            Multi-Agent AI Command Hub (5 Agen AI Otonom)
          </h2>
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
            AUTO-PILOT 24/7 AKTIF
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Menangani otomatis pendaftar dari Website Enterprise, menjawab chat calon pelanggan 24/7,
          melakukan scoring BANT, mengirim follow-up WhatsApp (H+0 s/d H+7), dan mengonversi ke CRM/Lisensi.
        </p>
      </div>

      <EmsActionToolbar
        moduleName="Multi-Agent AI"
        subModules={[
          { id: "inbox_chat", label: "Inbox Chat & Auto-Reply AI", count: leads.length },
          { id: "website_leads", label: "Lead Website & Follow-Up Cadence", count: filteredLeads.length },
          { id: "agent_config", label: "Konfigurasi 5 Agen AI", count: agents.filter((a) => a.isActive).length },
        ]}
        activeSubModule={subModule}
        onSelectSubModule={(id) => onSelectSubModule(id as AiHubSubModule)}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, perusahaan, kode registrasi..."
        onInsert={openInsertLead}
        insertLabel="Insert Lead Baru"
        onUpdate={activeLead ? () => openEditLead(activeLead) : undefined}
        updateDisabled={!activeLead}
        onDelete={
          activeLead
            ? () => {
                if (window.confirm(`Hapus data lead ${activeLead.companyName}?`)) {
                  onDeleteLead(activeLead.id);
                }
              }
            : undefined
        }
        deleteDisabled={!activeLead}
        onPrint={handlePrintLeads}
        printLabel="Cetak Laporan AI"
        onExportCsv={handleExportCsv}
        onRefresh={onSyncLeads}
        refreshing={syncingLeads}
        selectedLabel={activeLead ? `${activeLead.registrationCode} · ${activeLead.companyName}` : null}
      />

      {/* SUB-MODULE 1: LIVE CHAT INBOX & MULTI-AGENT AUTO-REPLY */}
      {subModule === "inbox_chat" && (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Lead Conversation List */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 lg:col-span-4">
            <div className="flex items-center justify-between px-1 pb-1 text-[11px] font-bold text-slate-400">
              <span>Percakapan Prospek ({filteredLeads.length})</span>
              <span className="text-emerald-400">Real-Time Sync</span>
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {filteredLeads.map((lead) => {
                const selected = activeLead?.id === lead.id;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-extrabold text-white">{lead.companyName}</span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                        Skor {lead.aiScore}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {lead.fullName} · {lead.city}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">
                        {lead.registrationCode}
                      </span>
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-bold uppercase text-violet-300">
                        {lead.aiRecommendedEdition}
                      </span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-300">
                        FU {lead.followUpStage}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chat & AI Autopilot Panel */}
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/95 p-4 lg:col-span-8">
            {activeLead ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white">{activeLead.companyName}</h3>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                        {activeLead.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      PIC: {activeLead.fullName} · WA: {activeLead.whatsapp} · {activeLead.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendChatOrAiReply("ai_autopilot")}
                      className="inline-flex items-center gap-1 rounded-xl bg-violet-500 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-violet-400"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Auto-Balas AI Sekarang
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerFollowUp(activeLead, "H+1")}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Follow-Up WA
                    </button>
                    <button
                      type="button"
                      onClick={() => onConvertLeadToDeal(activeLead)}
                      className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Konversi ke CRM Deal
                    </button>
                  </div>
                </div>

                {/* Chat Transcript */}
                <div className="my-3 max-h-[340px] flex-1 space-y-2.5 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3">
                  {activeLead.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                        m.sender === "prospect"
                          ? "mr-auto border border-slate-700 bg-slate-900 text-slate-100"
                          : m.sender === "ai_agent"
                            ? "ml-auto border border-emerald-500/35 bg-emerald-950/40 text-emerald-100"
                            : "ml-auto border border-sky-500/35 bg-sky-950/40 text-sky-100"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold opacity-80">
                        <span>
                          {m.sender === "prospect"
                            ? activeLead.fullName
                            : m.agentName || "Agen AI Publisher HQ"}
                        </span>
                        <span>{new Date(m.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="whitespace-pre-line">{m.text}</div>
                    </div>
                  ))}
                </div>

                {/* Composer */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ketik balasan admin atau simulasi pertanyaan calon pelanggan..."
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendChatOrAiReply("admin_reply")}
                      className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-sky-400"
                    >
                      <Send className="h-3.5 w-3.5" /> Balas Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendChatOrAiReply("prospect_test")}
                      className="inline-flex items-center gap-1 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/25"
                      title="Simulasikan chat masuk dari prospek agar 5 Agen AI langsung merespons"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Uji Auto-Reply AI
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada percakapan prospek. Klik <strong>Insert Lead Baru</strong> atau daftar melalui Website Enterprise.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-MODULE 2: WEBSITE LEADS & FOLLOW-UP CADENCE TABLE */}
      {subModule === "website_leads" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/95">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
              <tr>
                <th className="px-3.5 py-2.5">Kode &amp; Sumber</th>
                <th className="px-3.5 py-2.5">Prospek &amp; Perusahaan</th>
                <th className="px-3.5 py-2.5">Kontak</th>
                <th className="px-3.5 py-2.5">AI Scoring &amp; Edisi</th>
                <th className="px-3.5 py-2.5">Cadence Follow-Up AI</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Aksi EMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`cursor-pointer hover:bg-slate-800/40 ${
                    activeLead?.id === lead.id ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <td className="px-3.5 py-3">
                    <div className="font-mono font-bold text-emerald-300">{lead.registrationCode}</div>
                    <div className="text-[10px] text-slate-400">{lead.source}</div>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="font-bold text-white">{lead.companyName}</div>
                    <div className="text-[11px] text-slate-400">
                      {lead.fullName} · {lead.city} · {lead.teamSize}
                    </div>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="font-mono text-[11px] text-slate-200">{lead.whatsapp}</div>
                    <div className="text-[10px] text-slate-400">{lead.email}</div>
                  </td>
                  <td className="px-3.5 py-3">
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      {lead.aiScore}/100
                    </span>
                    <span className="ml-1.5 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-300">
                      {lead.aiRecommendedEdition}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(["H+0", "H+1", "H+3", "H+7"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerFollowUp(lead, st);
                          }}
                          className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                            lead.followUpStage === st
                              ? "bg-emerald-500 text-slate-950"
                              : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500"
                          }`}
                        >
                          WA {st}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3.5 py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-200">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConvertLeadToDeal(lead);
                        }}
                        className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                        title="Konversi ke Deal B2B CRM"
                      >
                        +CRM
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditLead(lead);
                        }}
                        className="rounded-lg bg-amber-500/20 p-1.5 text-amber-300 hover:bg-amber-500/30"
                        title="Update Lead"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus lead ${lead.companyName}?`)) onDeleteLead(lead.id);
                        }}
                        className="rounded-lg bg-rose-500/20 p-1.5 text-rose-300 hover:bg-rose-500/30"
                        title="Delete Lead"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-MODULE 3: 5-AGENT CONFIGURATION */}
      {subModule === "agent_config" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((ag) => {
            const isEditing = editingAgentId === ag.id;
            return (
              <div
                key={ag.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-white">{ag.name}</div>
                        <div className="text-[10px] text-amber-300">{ag.roleTitle}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateAgent(ag.id, { isActive: !ag.isActive })}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                        ag.isActive
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {ag.isActive ? "AKTIF" : "NONAKTIF"}
                    </button>
                  </div>

                  <p className="mt-2.5 text-[11px] leading-relaxed text-slate-300">{ag.mission}</p>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">SLA Respon</div>
                      <div className="font-mono font-bold text-white">{ag.responseSlaSeconds}s</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Ditangani</div>
                      <div className="font-mono font-bold text-emerald-300">{ag.handledCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Konversi</div>
                      <div className="font-mono font-bold text-amber-300">{ag.conversionRatePct}%</div>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        rows={3}
                        value={agentPromptDraft}
                        onChange={(e) => setAgentPromptDraft(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-[11px] text-white"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingAgentId(null)}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateAgent(ag.id, { systemPrompt: agentPromptDraft.trim() || ag.systemPrompt });
                            setEditingAgentId(null);
                          }}
                          className="rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-extrabold text-slate-950"
                        >
                          Simpan Prompt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-2.5 text-[11px] text-slate-400">
                      <strong className="text-slate-300">Instruksi Agen:</strong> {ag.systemPrompt}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={ag.autoReplyEnabled}
                      onChange={(e) => onUpdateAgent(ag.id, { autoReplyEnabled: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    Auto-Reply Aktif
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAgentId(ag.id);
                      setAgentPromptDraft(ag.systemPrompt);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
                  >
                    <Pencil className="h-3 w-3" /> Update Prompt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INSERT / UPDATE LEAD MODAL */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveLead}
            className="w-full max-w-lg space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">
                {editingLeadId ? "Update Data Prospek / Lead" : "Insert Prospek / Lead Baru (Auto-Scoring AI)"}
              </h3>
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-slate-300">
                Nama Lengkap PIC *
                <input
                  required
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Nama Perusahaan / Bisnis *
                <input
                  required
                  value={fCompany}
                  onChange={(e) => setFCompany(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Email Bisnis *
                <input
                  required
                  type="email"
                  value={fEmail}
                  onChange={(e) => setFEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Nomor WhatsApp *
                <input
                  required
                  value={fWa}
                  onChange={(e) => setFWa(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Kota
                <input
                  value={fCity}
                  onChange={(e) => setFCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Edisi Minat
                <select
                  value={fEdition}
                  onChange={(e) => setFEdition(e.target.value as EditionId)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="starter">Starter UMKM (Rp 0)</option>
                  <option value="pro">Growth Pro (Rp 249rb/bln)</option>
                  <option value="enterprise">Enterprise AI Suite (Rp 699rb/bln)</option>
                  <option value="sovereign">Sovereign Corporate (Rp 1,95jt/bln)</option>
                </select>
              </label>
              <label className="block text-slate-300">
                Industri
                <input
                  value={fIndustry}
                  onChange={(e) => setFIndustry(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Status Lead
                <select
                  value={fStatus}
                  onChange={(e) => setFStatus(e.target.value as PublisherWebsiteLead["status"])}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="new">New</option>
                  <option value="ai_engaged">AI Engaged</option>
                  <option value="qualified">Qualified</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="converted">Converted</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <label className="block text-slate-300">
              Catatan Kebutuhan Prospek
              <textarea
                rows={2}
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 font-bold text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingLeadId ? "Simpan Perubahan" : "Simpan & Jalankan AI Qualifier"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
