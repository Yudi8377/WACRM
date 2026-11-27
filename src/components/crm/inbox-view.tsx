"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  Clock,
  Info,
  MessageSquarePlus,
  Plus,
  QrCode,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { PaginationBar } from "@/components/crud-toolbar";
import {
  CHANNEL_META,
  LIFECYCLE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ChannelRecord,
  type ChannelType,
  type ContactRecord,
  type ConversationNoteRecord,
  type ConversationPriority,
  type ConversationRecord,
  type ConversationStatus,
  type MessageRecord,
  type PosOrderRecord,
  type QuickReplyRecord,
  type TeamMemberRecord,
} from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface InboxViewProps {
  adapter: WorkspaceAdapter;
  conversations: ConversationRecord[];
  contacts: ContactRecord[];
  channels: ChannelRecord[];
  quickReplies: QuickReplyRecord[];
  members: TeamMemberRecord[];
  initialConversationId?: string | null;
  onRefresh: () => Promise<void>;
  onOpenPos?: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function InboxView({
  adapter,
  conversations,
  contacts,
  channels,
  quickReplies,
  members,
  initialConversationId,
  onRefresh,
  onOpenPos,
  onToast,
}: InboxViewProps) {
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(initialConversationId ?? null);
  const [mobileShowDetail, setMobileShowDetail] = useState(Boolean(initialConversationId));
  const [showInspector, setShowInspector] = useState(false);

  const selectedId =
    manualSelectedId && conversations.some((c) => c.id === manualSelectedId)
      ? manualSelectedId
      : (conversations[0]?.id ?? null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const LIST_PAGE_SIZE = 8;

  const [detail, setDetail] = useState<{
    conversation: ConversationRecord;
    messages: MessageRecord[];
    notes: ConversationNoteRecord[];
  } | null>(null);
  const [loadedDetailId, setLoadedDetailId] = useState<string | null>(null);

  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newContactId, setNewContactId] = useState(contacts[0]?.id ?? "");
  const [newChannel, setNewChannel] = useState<ChannelType>("whatsapp");
  const [newPriority, setNewPriority] = useState<ConversationPriority>("normal");
  const [newSubject, setNewSubject] = useState("");
  const [newInitialMsg, setNewInitialMsg] = useState("");
  const [creatingConv, setCreatingConv] = useState(false);

  const [newTagInput, setNewTagInput] = useState("");
  const [aiAutoReplyOn, setAiAutoReplyOn] = useState(true);
  const [runningAi, setRunningAi] = useState(false);
  const [simCustomerMsg, setSimCustomerMsg] = useState("");
  const [showAiSim, setShowAiSim] = useState(false);
  const [lastAiResult, setLastAiResult] = useState<{
    agentTrace: Array<{
      agentName: string;
      action: string;
      status: string;
    }>;
    fraudRiskScore: number;
    createdOrder: PosOrderRecord | null;
    escalationRequired?: boolean;
    escalationReason?: string | null;
    detectedIntent?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoHandledMsgIdsRef = useRef<Set<string>>(new Set());
  const autoRunInFlightRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) return;
    adapter
      .loadConversationDetail(selectedId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        setLoadedDetailId(selectedId);
        if (res.conversation.unreadCount > 0) {
          adapter.updateConversation(selectedId, { markRead: true }).then(() => onRefresh()).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setLoadedDetailId(selectedId);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const loadingDetail = Boolean(selectedId && loadedDetailId !== selectedId);
  const currentDetail = selectedId && detail?.conversation.id === selectedId ? detail : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentDetail?.messages.length]);

  // ZERO-CLICK AUTOMATIC AI AUTO-REPLY:
  // When AI Auto-Reply is ON and the latest message in the active conversation is an
  // unanswered customer inbound message (and not already escalated to human admin),
  // automatically analyze & reply without requiring the user to click any button!
  useEffect(() => {
    if (!aiAutoReplyOn || !currentDetail || runningAi || autoRunInFlightRef.current) return;
    const msgs = currentDetail.messages;
    if (msgs.length === 0) return;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.direction !== "inbound") return;
    if (currentDetail.conversation.status === "resolved") return;
    if (currentDetail.conversation.tags.includes("perlu-admin")) return;
    if (autoHandledMsgIdsRef.current.has(lastMsg.id)) return;

    autoHandledMsgIdsRef.current.add(lastMsg.id);
    autoRunInFlightRef.current = true;
    const timer = window.setTimeout(() => {
      void handleRunAiAutoReply().finally(() => {
        autoRunInFlightRef.current = false;
      });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      autoRunInFlightRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiAutoReplyOn, currentDetail?.conversation.id, currentDetail?.messages.length]);

  const filtered = conversations.filter((conv) => {
    if (statusFilter !== "all" && conv.status !== statusFilter) return false;
    if (channelFilter !== "all" && conv.channel !== channelFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${conv.contactName} ${conv.contactPhone ?? ""} ${conv.subject ?? ""} ${conv.lastMessageText ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const paginatedConvs = filtered.slice(
    (listPage - 1) * LIST_PAGE_SIZE,
    listPage * LIST_PAGE_SIZE,
  );

  async function reloadSelected() {
    if (!selectedId) return;
    const res = await adapter.loadConversationDetail(selectedId);
    setDetail(res);
    setLoadedDetailId(selectedId);
  }

  async function handleRunAiAutoReply(simulatedInbound?: string) {
    if (!selectedId || runningAi) return;
    setRunningAi(true);
    try {
      const res = await adapter.runAiAutoReply(selectedId, simulatedInbound);
      setLastAiResult({
        agentTrace: res.agentTrace,
        fraudRiskScore: res.fraudRiskScore,
        createdOrder: res.createdOrder,
        escalationRequired: res.escalationRequired,
        escalationReason: res.escalationReason,
        detectedIntent: res.detectedIntent,
      });
      setSimCustomerMsg("");
      await Promise.all([reloadSelected(), onRefresh()]);
      if (res.createdOrder) {
        onToast(
          `AI membalas otomatis + membuat Invoice POS ${res.createdOrder.invoiceNumber} & Label Pengiriman QR!`,
        );
      } else if (res.escalationRequired) {
        onToast(
          `Eskalasi Admin: ${res.escalationReason || "Pesan memerlukan keputusan admin manusia."}`,
          "error",
        );
      } else if (res.securityIncident) {
        onToast(
          `Fraud Sentinel memblokir/menandai risiko (${res.fraudRiskScore}/100) & mengirim proteksi otomatis.`,
          "error",
        );
      } else {
        onToast("AI menjawab otomatis sesuai konteks percakapan.");
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menjalankan Multi-Agent AI.", "error");
    } finally {
      setRunningAi(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    try {
      if (composerMode === "note") {
        await adapter.addNote(selectedId, draft.trim());
        onToast("Catatan internal ditambahkan.");
      } else {
        const res = await adapter.sendMessage(selectedId, draft.trim());
        onToast(res.note ? res.note : "Pesan terkirim.");
      }
      setDraft("");
      setShowQuickReplies(false);
      await Promise.all([reloadSelected(), onRefresh()]);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal mengirim pesan.", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateConv(patch: Parameters<WorkspaceAdapter["updateConversation"]>[1], msg: string) {
    if (!selectedId) return;
    try {
      await adapter.updateConversation(selectedId, patch);
      await Promise.all([reloadSelected(), onRefresh()]);
      onToast(msg);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memperbarui percakapan.", "error");
    }
  }

  async function handleDeleteConv() {
    if (!selectedId) return;
    if (!window.confirm("Hapus percakapan ini beserta semua riwayat pesannya?")) return;
    try {
      await adapter.deleteConversation(selectedId);
      setManualSelectedId(null);
      setDetail(null);
      setLoadedDetailId(null);
      setMobileShowDetail(false);
      await onRefresh();
      onToast("Percakapan berhasil dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus percakapan.", "error");
    }
  }

  async function handleAddTag(e: FormEvent) {
    e.preventDefault();
    if (!detail || !newTagInput.trim()) return;
    const nextTags = [...new Set([...detail.conversation.tags, newTagInput.trim().toLowerCase()])];
    setNewTagInput("");
    await handleUpdateConv({ tags: nextTags }, "Label ditambahkan.");
  }

  async function handleRemoveTag(tag: string) {
    if (!detail) return;
    const nextTags = detail.conversation.tags.filter((t) => t !== tag);
    await handleUpdateConv({ tags: nextTags }, "Label dihapus.");
  }

  async function handleDeleteNote(noteId: string) {
    if (!selectedId) return;
    try {
      await adapter.deleteNote(selectedId, noteId);
      await reloadSelected();
      onToast("Catatan dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus catatan.", "error");
    }
  }

  async function handleCreateConversation(e: FormEvent) {
    e.preventDefault();
    if (!newContactId || creatingConv) return;
    setCreatingConv(true);
    try {
      const matchingConn = channels.find((c) => c.channel === newChannel && c.status === "connected") ?? channels.find((c) => c.channel === newChannel);
      const created = await adapter.createConversation({
        contactId: newContactId,
        connectionId: matchingConn?.id,
        channel: newChannel,
        priority: newPriority,
        subject: newSubject.trim() || undefined,
        initialMessage: newInitialMsg.trim() || undefined,
        initialDirection: "inbound",
      });
      setShowNewModal(false);
      setNewSubject("");
      setNewInitialMsg("");
      await onRefresh();
      setManualSelectedId(created.id);
      setMobileShowDetail(true);
      onToast("Percakapan baru dibuat.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal membuat percakapan.", "error");
    } finally {
      setCreatingConv(false);
    }
  }

  const activeConv = currentDetail?.conversation ?? conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      {/* LEFT PANE: Conversation List */}
      <aside
        className={`flex w-full flex-col border-r border-slate-200 bg-white md:w-80 lg:w-96 ${
          mobileShowDetail ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-200 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Kotak Masuk</h2>
              <p className="text-xs text-slate-500">{filtered.length} percakapan</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewContactId(contacts[0]?.id ?? "");
                setShowNewModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Baru
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, nomor, subjek..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {(["all", "open", "pending", "resolved"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === st
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "all" ? "Semua" : STATUS_LABELS[st].label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setChannelFilter("all")}
              className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                channelFilter === "all"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              Semua Kanal
            </button>
            {(["whatsapp", "instagram", "facebook_messenger", "tiktok", "youtube"] as ChannelType[]).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannelFilter(ch)}
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                  channelFilter === ch
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {CHANNEL_META[ch].shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">Belum ada percakapan</p>
              <p className="mt-1 text-xs text-slate-500">Klik tombol &ldquo;Baru&rdquo; atau hubungkan kanal untuk menerima pesan.</p>
            </div>
          ) : (
            paginatedConvs.map((conv) => {
              const isActive = conv.id === selectedId;
              const meta = CHANNEL_META[conv.channel];
              const needsAdmin = conv.tags.includes("perlu-admin");
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setManualSelectedId(conv.id);
                    setMobileShowDetail(true);
                  }}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition ${
                    isActive ? "bg-emerald-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {conv.contactName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{conv.contactName}</p>
                      <span className="shrink-0 text-[11px] text-slate-400">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span className={`inline-flex rounded border px-1.5 py-0.2 text-[10px] font-semibold ${meta.badgeClass}`}>
                        {meta.shortLabel}
                      </span>
                      <span className={`inline-flex rounded px-1.5 py-0.2 text-[10px] font-medium ${PRIORITY_LABELS[conv.priority].badgeClass}`}>
                        {PRIORITY_LABELS[conv.priority].label}
                      </span>
                      {needsAdmin && (
                        <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                          Perlu Admin
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-600">
                      {conv.lastMessageText || conv.subject || "Belum ada pesan"}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {filtered.length > LIST_PAGE_SIZE && (
          <div className="border-t border-slate-200 p-2">
            <PaginationBar
              page={listPage}
              pageSize={LIST_PAGE_SIZE}
              totalItems={filtered.length}
              onPageChange={setListPage}
            />
          </div>
        )}
      </aside>

      {/* CENTER PANE: Chat Thread */}
      <section
        className={`flex min-w-0 flex-1 flex-col bg-slate-50 ${
          mobileShowDetail ? "flex" : "hidden md:flex"
        }`}
      >
        {!activeConv ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <MessageSquarePlus className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">Pilih Percakapan</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Pilih percakapan dari daftar sebelah kiri atau buat percakapan baru untuk mulai membalas pelanggan.
            </p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
                  aria-label="Kembali ke daftar"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: CHANNEL_META[activeConv.channel].color }}
                >
                  {activeConv.contactName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">{activeConv.contactName}</h3>
                    <span className={`hidden sm:inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_LABELS[activeConv.status].badgeClass}`}>
                      {STATUS_LABELS[activeConv.status].label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {activeConv.contactPhone || activeConv.externalConversationId} · {activeConv.channelDisplayName}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {activeConv.channel === "whatsapp" && (
                  <span
                    className={`hidden lg:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      activeConv.withinServiceWindow
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {activeConv.withinServiceWindow ? "Jendela 24j Aktif" : "Di luar 24j (Template)"}
                  </span>
                )}
                {activeConv.status !== "resolved" ? (
                  <button
                    type="button"
                    onClick={() => handleUpdateConv({ status: "resolved" }, "Percakapan ditandai selesai.")}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Selesaikan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpdateConv({ status: "open" }, "Percakapan dibuka kembali.")}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Buka Lagi
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowInspector((v) => !v)}
                  className={`rounded-lg border p-2 transition ${
                    showInspector
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Detail Kontak & Pengaturan Percakapan"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Autonomous Multi-Agent AI Auto-Reply Bar */}
            <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-cyan-50/70 to-white px-3.5 py-2.5">
              {activeConv.tags.includes("perlu-admin") && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Eskalasi Admin Aktif: Pesan ini di luar wewenang AI — silakan dibalas langsung oleh Admin.
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdateConv(
                        { tags: activeConv.tags.filter((t) => t !== "perlu-admin") },
                        "Eskalasi diselesaikan — AI Auto-Reply kembali aktif untuk chat ini.",
                      )
                    }
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                  >
                    Tandai Ditangani Admin
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAiAutoReplyOn((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      aiAutoReplyOn
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {aiAutoReplyOn ? "AI Auto-Reply Otomatis AKTIF (Tanpa Klik)" : "AI Auto-Reply Dijeda"}
                  </button>
                  <span className="hidden text-[11px] text-slate-600 lg:inline">
                    Chat masuk dibalas AI otomatis sesuai konteks. Topik kredensial/refund otomatis dieskalasi ke Admin.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={runningAi}
                    onClick={() => void handleRunAiAutoReply()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${runningAi ? "animate-spin" : ""}`} />
                    {runningAi ? "AI Menganalisis..." : "Jalankan AI Ulang"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiSim((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Simulasi Chat Masuk
                  </button>
                </div>
              </div>

              {showAiSim && (
                <div className="mt-2.5 space-y-2 rounded-xl border border-cyan-200 bg-white p-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={runningAi}
                      onClick={() => void handleRunAiAutoReply("selamat pagi..")}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-200"
                    >
                      Uji Sapaan (&ldquo;selamat pagi..&rdquo;)
                    </button>
                    <button
                      type="button"
                      disabled={runningAi}
                      onClick={() =>
                        void handleRunAiAutoReply(
                          "Kak, apakah aplikasi Android WACRM bisa dipakai bersamaan oleh 5 agen CS?",
                        )
                      }
                      className="rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100"
                    >
                      Uji Multi-Agen Android (5 CS)
                    </button>
                    <button
                      type="button"
                      disabled={runningAi}
                      onClick={() =>
                        void handleRunAiAutoReply(
                          "Halo kak, saya mau pesan 2 Kopi Arabika Gayo, kirim ke Jl. Dhoho No. 12 Kota Kediri, bayar QRIS ya!",
                        )
                      }
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      Uji Order + Label QR
                    </button>
                    <button
                      type="button"
                      disabled={runningAi}
                      onClick={() =>
                        void handleRunAiAutoReply(
                          "Kak, saya mau minta refund Rp 2 juta dan akses kredensial admin sekarang juga.",
                        )
                      }
                      className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      Uji Eskalasi ke Admin
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={simCustomerMsg}
                      onChange={(e) => setSimCustomerMsg(e.target.value)}
                      placeholder="Ketik pesan masuk pelanggan apa saja — AI langsung menganalisis & membalas otomatis..."
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      disabled={runningAi || !simCustomerMsg.trim()}
                      onClick={() => void handleRunAiAutoReply(simCustomerMsg)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Kirim Chat Masuk
                    </button>
                  </div>
                </div>
              )}

              {lastAiResult && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2 text-slate-700">
                    <span className="font-bold text-emerald-700">
                      Jejak Swarm: {lastAiResult.agentTrace.length} agen
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                        lastAiResult.fraudRiskScore >= 50
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Risiko Fraud: {lastAiResult.fraudRiskScore}/100
                    </span>
                  </div>
                  {lastAiResult.createdOrder && onOpenPos && (
                    <button
                      type="button"
                      onClick={onOpenPos}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 font-bold text-white hover:bg-cyan-700"
                    >
                      <QrCode className="h-3 w-3" />
                      Lihat QR {lastAiResult.createdOrder.invoiceNumber}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activeConv.subject && (
                <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center text-xs text-slate-600">
                  Subjek: <strong className="text-slate-800">{activeConv.subject}</strong>
                </div>
              )}

              {loadingDetail && !currentDetail ? (
                <p className="py-8 text-center text-xs text-slate-400">Memuat riwayat pesan...</p>
              ) : (currentDetail?.messages ?? []).length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada pesan dalam percakapan ini. Kirim pesan pertama di bawah.</p>
              ) : (
                (currentDetail?.messages ?? []).map((msg) => {
                  const isOut = msg.direction === "outbound";
                  return (
                    <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${
                          isOut
                            ? "rounded-br-sm bg-emerald-600 text-white"
                            : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.bodyText}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isOut ? "text-emerald-100" : "text-slate-400"}`}>
                          <span>{formatTime(msg.providerTimestamp || msg.createdAt)}</span>
                          {isOut &&
                            (msg.deliveryStatus === "read" || msg.deliveryStatus === "delivered" ? (
                              <CheckCheck className={`h-3.5 w-3.5 ${msg.deliveryStatus === "read" ? "text-sky-200" : ""}`} />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Internal Notes Timeline */}
              {(currentDetail?.notes ?? []).length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Catatan Internal Tim</p>
                  {currentDetail?.notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950"
                    >
                      <div>
                        <p className="font-semibold text-amber-800">
                          {note.authorName} · <span className="font-normal text-amber-700">{formatTime(note.createdAt)}</span>
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{note.bodyText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="rounded p-1 text-amber-700 hover:bg-amber-100"
                        title="Hapus catatan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="relative border-t border-slate-200 bg-white p-3">
              {showQuickReplies && quickReplies.length > 0 && (() => {
                const slashQuery = draft.startsWith("/")
                  ? draft.slice(1).trim().toLowerCase()
                  : "";
                const filteredQuickReplies = slashQuery
                  ? quickReplies.filter(
                      (qr) =>
                        qr.shortcut.toLowerCase().includes(slashQuery) ||
                        qr.title.toLowerCase().includes(slashQuery) ||
                        qr.category.toLowerCase().includes(slashQuery),
                    )
                  : quickReplies;
                return (
                  <div className="absolute bottom-full left-3 right-3 mb-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="mb-1 flex items-center justify-between px-2 py-1">
                      <span className="text-xs font-bold text-slate-700">
                        Balasan Cepat {slashQuery ? `(/${slashQuery})` : ""}
                      </span>
                      <button type="button" onClick={() => setShowQuickReplies(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {filteredQuickReplies.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-slate-400">
                        Tidak ada pintasan cocok dengan <code className="font-mono">/{slashQuery}</code>. Buat otomatis lewat AI di tab Template &amp; Cepat.
                      </div>
                    ) : (
                      filteredQuickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          type="button"
                          onClick={() => {
                            setDraft(qr.bodyText);
                            setShowQuickReplies(false);
                          }}
                          className="flex w-full flex-col rounded-xl px-2.5 py-2 text-left hover:bg-emerald-50"
                        >
                          <span className="text-xs font-semibold text-emerald-700">
                            /{qr.shortcut} · {qr.title}
                          </span>
                          <span className="line-clamp-1 text-xs text-slate-500">{qr.bodyText}</span>
                        </button>
                      ))
                    )}
                  </div>
                );
              })()}

              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposerMode("reply")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    composerMode === "reply" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Balas Pelanggan
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("note")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    composerMode === "note" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <StickyNote className="h-3 w-3" />
                  Catatan Internal
                </button>
                {composerMode === "reply" && (
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies((v) => !v)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Zap className="h-3 w-3 text-amber-500" />
                    Balasan Cepat
                  </button>
                )}
              </div>

              <form onSubmit={handleSend} className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft(val);
                    if (composerMode === "reply") {
                      if (val.startsWith("/") && !val.includes("\n") && val.length <= 32) {
                        setShowQuickReplies(true);
                      } else if (showQuickReplies && !val.startsWith("/")) {
                        setShowQuickReplies(false);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend(e);
                    }
                  }}
                  placeholder={
                    composerMode === "note"
                      ? "Tulis catatan internal untuk tim (tidak dikirim ke pelanggan)..."
                      : "Ketik balasan... (ketik / untuk balasan cepat, Enter untuk kirim)"
                  }
                  className={`min-h-[44px] flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
                    composerMode === "note"
                      ? "border-amber-300 bg-amber-50/50 focus:border-amber-500"
                      : "border-slate-200 bg-slate-50 focus:border-emerald-500 focus:bg-white"
                  }`}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition disabled:opacity-50 ${
                    composerMode === "note" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                  aria-label="Kirim"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </section>

      {/* RIGHT PANE: Conversation & Contact Inspector */}
      {activeConv && showInspector && (
        <aside className="fixed inset-y-0 right-0 z-30 flex w-80 flex-col border-l border-slate-200 bg-white shadow-2xl xl:static xl:z-auto xl:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h4 className="text-sm font-bold text-slate-900">Detail Percakapan</h4>
            <button
              type="button"
              onClick={() => setShowInspector(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kontak</p>
              <p className="mt-1.5 text-sm font-bold text-slate-900">{activeConv.contactName}</p>
              {activeConv.contactPhone && <p className="text-xs text-slate-600">{activeConv.contactPhone}</p>}
              {activeConv.contactEmail && <p className="text-xs text-slate-600">{activeConv.contactEmail}</p>}
              {activeConv.contactCompany && <p className="text-xs text-slate-500">{activeConv.contactCompany}</p>}
              {activeConv.contactStage && (
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LIFECYCLE_LABELS[activeConv.contactStage].badgeClass}`}>
                  {LIFECYCLE_LABELS[activeConv.contactStage].label}
                </span>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <label className="block text-xs font-semibold text-slate-600">
                Status Percakapan
                <select
                  value={activeConv.status}
                  onChange={(e) => handleUpdateConv({ status: e.target.value as ConversationStatus }, "Status diperbarui.")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  {(Object.keys(STATUS_LABELS) as ConversationStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-slate-600">
                Prioritas
                <select
                  value={activeConv.priority}
                  onChange={(e) => handleUpdateConv({ priority: e.target.value as ConversationPriority }, "Prioritas diperbarui.")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  {(Object.keys(PRIORITY_LABELS) as ConversationPriority[]).map((pr) => (
                    <option key={pr} value={pr}>
                      {PRIORITY_LABELS[pr].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" /> Penanggung Jawab
                </span>
                <select
                  value={activeConv.assignedUserId ?? ""}
                  onChange={(e) =>
                    handleUpdateConv({ assignedUserId: e.target.value || null }, "Penugasan agen diperbarui.")
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Belum ditugaskan</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} ({m.role})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Tag className="h-3.5 w-3.5" /> Label
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeConv.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                  >
                    #{tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="mt-2 flex gap-1.5">
                <input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Tambah label..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleDeleteConv}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Percakapan
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* NEW CONVERSATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Mulai Percakapan Baru</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                Tambahkan kontak terlebih dahulu pada menu <strong>Kontak</strong> sebelum membuat percakapan baru.
              </p>
            ) : (
              <form onSubmit={handleCreateConversation} className="mt-4 space-y-3.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kontak Pelanggan
                  <select
                    required
                    value={newContactId}
                    onChange={(e) => setNewContactId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} {c.phoneE164 ? `(${c.phoneE164})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kanal
                    <select
                      value={newChannel}
                      onChange={(e) => setNewChannel(e.target.value as ChannelType)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {(Object.keys(CHANNEL_META) as ChannelType[]).map((ch) => (
                        <option key={ch} value={ch}>
                          {CHANNEL_META[ch].shortLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Prioritas
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as ConversationPriority)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {(Object.keys(PRIORITY_LABELS) as ConversationPriority[]).map((pr) => (
                        <option key={pr} value={pr}>
                          {PRIORITY_LABELS[pr].label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-700">
                  Subjek / Topik (opsional)
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Contoh: Pesanan Grosir #102"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Pesan Awal (opsional)
                  <textarea
                    rows={3}
                    value={newInitialMsg}
                    onChange={(e) => setNewInitialMsg(e.target.value)}
                    placeholder="Catat pesan masuk pelanggan..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={creatingConv}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {creatingConv ? "Menyimpan..." : "Buat Percakapan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
