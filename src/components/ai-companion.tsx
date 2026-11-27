"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  processCompanionTurn,
  type CompanionPendingAction,
} from "@/lib/ai-companion-engine";
import { formatIdr, type StoreBusinessProfile } from "@/lib/crm-types";
import { getAndroidBridge } from "@/lib/printer";
import type { WorkspaceAdapter, WorkspaceSnapshot } from "@/lib/workspace-adapter";

interface CompanionMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  at: string;
}

interface AiCompanionProps {
  adapter: WorkspaceAdapter;
  snapshot: WorkspaceSnapshot;
  storeProfile: StoreBusinessProfile;
  activeTab: string;
  externalPrompt?: { id: number; prompt: string; speakImmediately?: boolean } | null;
  onNavigateTab: (tab: string) => void;
  onRefresh: () => Promise<void>;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const STORAGE_KEY = "wacrm_companion_memory_v3";

export function AiCompanion({
  adapter,
  snapshot,
  storeProfile,
  activeTab,
  externalPrompt,
  onNavigateTab,
  onRefresh,
  onToast,
}: AiCompanionProps) {
  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<CompanionPendingAction | null>(null);
  const [messages, setMessages] = useState<CompanionMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as CompanionMessage[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-30);
        }
      } catch {
        // ignore
      }
    }
    return [
      {
        id: "welcome-1",
        role: "assistant",
        text: `Halo! Saya Asisten Pribadi AI 24/7 untuk ${storeProfile.businessName}. Tanyakan lewat suara atau teks — misalnya "Apakah hari ini ada prospek yang belum kita follow up?" atau "Panduan hubungkan WhatsApp Cloud API Meta". Memori percakapan saya aktif terus sampai Anda bilang "cukup".`,
        at: new Date().toISOString(),
      },
    ];
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const continuousRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastExternalIdRef = useRef<number>(0);
  const handleUserUtteranceRef = useRef<
    ((rawText: string, fromVoice: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    continuousRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startListeningOnce = useCallback(() => {
    if (typeof window === "undefined") return;
    const android = getAndroidBridge();
    if (android?.startVoiceInput) {
      setListening(true);
      android.startVoiceInput();
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setListening(false);
      setContinuousMode(false);
      onToast(
        "Browser tidak mendukung mikrofon suara langsung. Gunakan Chrome/Android APK atau ketik perintah di kolom chat.",
        "error",
      );
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript?.trim();
      setListening(false);
      if (transcript) {
        void handleUserUtteranceRef.current?.(transcript, true);
      }
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [onToast]);

  const speakResponse = useCallback(
    (text: string, autoRearmListening: boolean) => {
      if (!voiceEnabled || typeof window === "undefined") {
        if (autoRearmListening && continuousRef.current) {
          setTimeout(() => startListeningOnce(), 450);
        }
        return;
      }

      const android = getAndroidBridge();
      if (android?.speakText) {
        android.speakText(text);
        if (autoRearmListening && continuousRef.current) {
          setTimeout(() => {
            if (continuousRef.current) startListeningOnce();
          }, Math.min(12000, Math.max(2500, text.length * 65)));
        }
        return;
      }

      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = "id-ID";
          utter.rate = 1.03;
          const voices = window.speechSynthesis.getVoices();
          const idVoice = voices.find((v) => v.lang.toLowerCase().startsWith("id"));
          if (idVoice) utter.voice = idVoice;
          utter.onend = () => {
            if (autoRearmListening && continuousRef.current) {
              setTimeout(() => {
                if (continuousRef.current) startListeningOnce();
              }, 350);
            }
          };
          window.speechSynthesis.speak(utter);
        } catch {
          // ignore speech synthesis restriction
        }
      }
    },
    [startListeningOnce, voiceEnabled],
  );

  const executeCompanionAction = useCallback(
    async (action: CompanionPendingAction) => {
      if (action.type === "followup_prospects") {
        let sentCount = 0;
        for (const t of action.targets) {
          const followUpText = `Halo Kak ${t.name}! Kami dari ${storeProfile.businessName} ingin menindaklanjuti minat Kakak sebelumnya. Apakah ada info produk, harga spesial, atau pesanan yang bisa kami bantu hari ini?`;
          if (t.conversationId) {
            await adapter.sendMessage(t.conversationId, followUpText);
          } else {
            await adapter.createConversation({
              contactId: t.contactId,
              channel: "whatsapp",
              priority: "normal",
              subject: `Follow-up Prospek ${t.name}`,
              initialMessage: followUpText,
              initialDirection: "outbound",
            });
          }
          sentCount += 1;
        }
        await onRefresh();
        onToast(`Asisten AI berhasil mengirim follow-up ke ${sentCount} prospek!`);
        return;
      }

      if (action.type === "remind_unpaid_invoices") {
        let count = 0;
        for (const ord of action.orders) {
          if (ord.conversationId) {
            await adapter.sendMessage(
              ord.conversationId,
              `Halo Kak ${ord.customerName}, pengingat ramah dari ${storeProfile.businessName}: Invoice ${ord.invoiceNumber} sebesar ${formatIdr(ord.totalAmount)} masih menunggu pembayaran. Setelah lunas, invoice resmi & label QR pengiriman akan langsung diproses!`,
            );
            count += 1;
          }
        }
        await onRefresh();
        onToast(`Pengingat pembayaran dikirim untuk ${count || action.orders.length} tagihan.`);
        return;
      }

      if (action.type === "restock_low_products") {
        for (const p of action.products) {
          await adapter.updateProduct(p.productId, {
            stockDelta: 20,
            stockReason: "Restok otomatis atas perintah Asisten AI Companion",
          });
        }
        await onRefresh();
        onToast(`Restok +20 unit dicatat untuk ${action.products.length} produk menipis.`);
        return;
      }

      if (action.type === "run_guardian_audit") {
        const res = await adapter.runAiGuardianScan();
        await onRefresh();
        onToast(`Audit Keamanan & Self-Healing selesai — Skor Kesehatan ${res.healthScore}/100.`);
      }
    },
    [adapter, onRefresh, onToast, storeProfile.businessName],
  );

  const handleUserUtterance = useCallback(
    async (text: string, fromVoice: boolean) => {
      const clean = text.trim();
      if (!clean || busy) return;
      setBusy(true);

      const userMsg: CompanionMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text: clean,
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const turn = processCompanionTurn({
          userText: clean,
          activeTab,
          snapshot,
          storeProfile,
          pendingAction,
        });

        setPendingAction(turn.nextPendingAction);
        if (turn.navigateToTab) {
          onNavigateTab(turn.navigateToTab);
        }

        const aiMsg: CompanionMessage = {
          id: `a-${Date.now() + 1}`,
          role: "assistant",
          text: turn.replyText,
          at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (turn.shouldEndSession) {
          setContinuousMode(false);
          setListening(false);
          try {
            recognitionRef.current?.stop();
          } catch {
            // ignore
          }
        }

        if (turn.executeAction) {
          await executeCompanionAction(turn.executeAction);
        }

        speakResponse(turn.speechText, fromVoice && !turn.shouldEndSession);
      } catch (err) {
        const errText = err instanceof Error ? err.message : "Terjadi kendala saat menjalankan perintah.";
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: "assistant", text: `Maaf, ${errText}`, at: new Date().toISOString() },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [activeTab, busy, executeCompanionAction, onNavigateTab, pendingAction, snapshot, speakResponse, storeProfile],
  );

  useEffect(() => {
    handleUserUtteranceRef.current = handleUserUtterance;
  }, [handleUserUtterance]);

  // Register global Android Native Voice callback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { __wacrmOnVoiceResult?: (transcript: string) => void };
    win.__wacrmOnVoiceResult = (transcript: string) => {
      setListening(false);
      if (transcript?.trim()) {
        void handleUserUtteranceRef.current?.(transcript.trim(), true);
      }
    };
    return () => {
      delete win.__wacrmOnVoiceResult;
    };
  }, []);

  // Respond to contextual triggers from inside modals (e.g. "Panduan Suara AI" on Meta WhatsApp Cloud API!)
  useEffect(() => {
    if (!externalPrompt || externalPrompt.id === lastExternalIdRef.current) return;
    lastExternalIdRef.current = externalPrompt.id;
    const timer = window.setTimeout(() => {
      setOpen(true);
      if (externalPrompt.speakImmediately) {
        setVoiceEnabled(true);
        setContinuousMode(true);
      }
      void handleUserUtteranceRef.current?.(
        externalPrompt.prompt,
        Boolean(externalPrompt.speakImmediately),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [externalPrompt]);

  function toggleVoiceSession() {
    if (listening || continuousMode) {
      setContinuousMode(false);
      setListening(false);
      try {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
        getAndroidBridge()?.stopSpeaking?.();
      } catch {
        // ignore
      }
      onToast("Mode suara asisten AI dihentikan.");
      return;
    }
    setVoiceEnabled(true);
    setContinuousMode(true);
    startListeningOnce();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    await handleUserUtterance(text, false);
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 text-xs font-bold text-white shadow-2xl shadow-emerald-600/30 transition hover:scale-105 md:bottom-6"
          title="Buka Asisten Pribadi AI 24/7 (Suara & Teks)"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Asisten AI 24/7</span>
          <Mic className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Dockable Companion Drawer */}
      {open && (
        <div className="fixed right-3 bottom-16 z-50 flex h-[540px] max-h-[82vh] w-[calc(100vw-24px)] max-w-md flex-col overflow-hidden rounded-3xl border border-emerald-500/40 bg-slate-950 text-slate-100 shadow-2xl md:right-5 md:bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-emerald-950/90 to-slate-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Asisten Pribadi AI 24/7</h3>
                <p className="text-[11px] text-emerald-300">
                  {listening
                    ? "Sedang mendengarkan suara Anda..."
                    : continuousMode
                      ? "Memori aktif terus (ucapkan 'cukup' untuk berhenti)"
                      : "Pemandu Suara, Analisis & Eksekusi Perintah"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  if (!next) {
                    window.speechSynthesis?.cancel();
                    getAndroidBridge()?.stopSpeaking?.();
                  }
                }}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800"
                title={voiceEnabled ? "Matikan suara balasan" : "Nyalakan suara balasan"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setContinuousMode(false);
                  setListening(false);
                  try {
                    recognitionRef.current?.stop();
                    window.speechSynthesis?.cancel();
                  } catch {
                    // ignore
                  }
                  setOpen(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-slate-800 bg-slate-900/70 px-3 py-2">
            {[
              "Apakah hari ini ada prospek yang belum kita follow up?",
              "Panduan hubungkan WhatsApp Cloud API Meta",
              "Apakah ada tagihan belum lunas?",
              "Cek stok menipis",
              "Ringkasan omzet & laba hari ini",
            ].map((q) => (
              <button
                key={q}
                type="button"
                disabled={busy}
                onClick={() => void handleUserUtterance(q, false)}
                className="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-cyan-200 transition hover:border-emerald-500/50 hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Conversation History */}
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm border border-slate-800 bg-slate-900 text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}

            {pendingAction && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleUserUtterance("Ya, lanjutkan sekarang", false)}
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Ya, Lanjutkan Sekarang
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleUserUtterance("Tidak, nanti saja", false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Nanti Saja
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleUserUtterance("Cukup", false)}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25"
                >
                  Cukup
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Voice + Text Input Bar */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 p-3">
            <button
              type="button"
              onClick={toggleVoiceSession}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                listening || continuousMode
                  ? "animate-pulse bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                  : "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40 hover:bg-cyan-500/30"
              }`}
              title={listening || continuousMode ? "Hentikan mode suara" : "Mulai bicara (mode suara aktif sampai bilang 'cukup')"}
            >
              {listening || continuousMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ketik perintah atau tekan mikrofon..."
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
              aria-label="Kirim ke Asisten AI"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
