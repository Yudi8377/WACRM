"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  HeartHandshake,
  KeyRound,
  Lock,
  Mic,
  MicOff,
  Play,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  processCompanionTurn,
  type CompanionPendingAction,
} from "@/lib/ai-companion-engine";
import { formatIdr, type AppEditionId, type StoreBusinessProfile } from "@/lib/crm-types";
import { editionHasFeature, getEditionById } from "@/lib/editions";
import { getAndroidBridge } from "@/lib/printer";
import {
  playWarmActivationChime,
  selectWarmIndonesianVoice,
  speakWarmIndonesian,
  stopWarmSpeech,
  subscribeVoicesChanged,
  WARM_VOICE_PERSONAS,
  type WarmVoicePersonaId,
} from "@/lib/warm-voice";
import type { WorkspaceAdapter, WorkspaceSnapshot } from "@/lib/workspace-adapter";

interface CompanionMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  speechText?: string;
  at: string;
}

interface AiCompanionProps {
  adapter: WorkspaceAdapter;
  editionId?: AppEditionId;
  userName?: string;
  snapshot: WorkspaceSnapshot;
  storeProfile: StoreBusinessProfile;
  activeTab: string;
  externalPrompt?: { id: number; prompt: string; speakImmediately?: boolean } | null;
  externalOpenSignal?: number;
  onNavigateTab: (tab: string) => void;
  onUpgradeRequest?: () => void;
  onStartEnterpriseTrial?: () => void;
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

const STORAGE_KEY = "wacrm_companion_memory_v4";

function getWarmWelcomeGreeting(storeName: string, userName?: string): string {
  const hour = new Date().getHours();
  const salam =
    hour >= 4 && hour < 11
      ? "Selamat pagi"
      : hour >= 11 && hour < 15
        ? "Selamat siang"
        : hour >= 15 && hour < 18
          ? "Selamat sore"
          : "Selamat malam";
  const caller = userName?.trim() ? `Kak ${userName.trim().split(/\s+/)[0]}` : "Kak";
  return `${salam}, ${caller}! Saya Sari, Asisten Pribadi & Pemandu Suara AI untuk ${storeName}. Klik tombol "Tes & Aktifkan Suara Hangat" di atas agar suara saya langsung terdengar, lalu kita bisa ngobrol santai ("Apa kabar?", "Selamat pagi") atau langsung cek prospek, stok & omzet hari ini.`;
}

export function AiCompanion({
  adapter,
  editionId = "starter",
  userName,
  snapshot,
  storeProfile,
  activeTab,
  externalPrompt,
  externalOpenSignal = 0,
  onNavigateTab,
  onUpgradeRequest,
  onStartEnterpriseTrial,
  onRefresh,
  onToast,
}: AiCompanionProps) {
  const voiceUnlocked = editionHasFeature(editionId, "voice_companion_24_7");
  const activeEditionName = getEditionById(editionId).name;
  const [open, setOpen] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioActivated, setAudioActivated] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [personaId, setPersonaId] = useState<WarmVoicePersonaId>("warm_friendly");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [activeVoiceLabel, setActiveVoiceLabel] = useState<string>("Menyiapkan suara Bahasa Indonesia...");
  const [voiceWarning, setVoiceWarning] = useState<string | null>(null);
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
    const welcome = getWarmWelcomeGreeting(storeProfile.businessName, userName);
    return [
      {
        id: "welcome-1",
        role: "assistant",
        text: welcome,
        speechText: welcome,
        at: new Date().toISOString(),
      },
    ];
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const continuousRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastExternalIdRef = useRef<number>(0);
  const lastOpenSignalRef = useRef<number>(externalOpenSignal);
  const handleUserUtteranceRef = useRef<
    ((rawText: string, fromVoice: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    continuousRef.current = continuousMode;
  }, [continuousMode]);

  // Subscribe to browser SpeechSynthesis voices loading asynchronously
  useEffect(() => {
    return subscribeVoicesChanged((voices) => {
      setAvailableVoices(voices);
      const best = selectWarmIndonesianVoice(voices, selectedVoiceName || null);
      if (best) {
        setActiveVoiceLabel(`${best.name} (${best.lang})`);
      } else if (getAndroidBridge()?.speakText) {
        setActiveVoiceLabel("Suara Native Android Bahasa Indonesia");
      } else {
        setActiveVoiceLabel("Suara Sistem Bahasa Indonesia (id-ID)");
      }
    });
  }, [selectedVoiceName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Allow Header Bar button to open the Companion Drawer immediately
  useEffect(() => {
    if (externalOpenSignal > lastOpenSignalRef.current) {
      lastOpenSignalRef.current = externalOpenSignal;
      const timer = window.setTimeout(() => {
        setOpen(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [externalOpenSignal]);

  const startListeningOnce = useCallback(() => {
    if (typeof window === "undefined") return;
    stopWarmSpeech();
    setSpeaking(false);

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
        "Browser ini belum mendukung mikrofon otomatis. Gunakan Google Chrome, Microsoft Edge, atau Aplikasi Android WACRM, atau ketik pesan di bawah.",
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
    rec.onerror = (ev) => {
      setListening(false);
      if (ev.error === "not-allowed") {
        setContinuousMode(false);
        onToast(
          "Izin mikrofon belum diberikan. Klik ikon gembok di address bar browser lalu izinkan Mikrofon.",
          "error",
        );
      }
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

      setVoiceWarning(null);
      const result = speakWarmIndonesian({
        text,
        personaId,
        preferredVoiceName: selectedVoiceName || null,
        onStart: () => {
          setSpeaking(true);
          setAudioActivated(true);
        },
        onEnd: () => {
          setSpeaking(false);
          if (autoRearmListening && continuousRef.current) {
            setTimeout(() => {
              if (continuousRef.current) startListeningOnce();
            }, 400);
          }
        },
        onError: (reason) => {
          setSpeaking(false);
          setVoiceWarning(reason);
        },
      });

      if (result.voiceName) {
        setActiveVoiceLabel(result.voiceName);
      }
      if (result.engine === "unavailable") {
        setVoiceWarning(
          "Browser belum mengaktifkan mesin suara. Gunakan Chrome, Edge, Safari, atau Aplikasi Android WACRM.",
        );
      }
    },
    [personaId, selectedVoiceName, startListeningOnce, voiceEnabled],
  );

  // One-click Warm Voice Activator & Audio Check (guaranteed user-gesture unlock!)
  const handleActivateAndTestVoice = useCallback(() => {
    setVoiceEnabled(true);
    setAudioActivated(true);
    setVoiceWarning(null);
    playWarmActivationChime();

    const persona =
      WARM_VOICE_PERSONAS.find((p) => p.id === personaId) ?? WARM_VOICE_PERSONAS[0];
    const hour = new Date().getHours();
    const salam =
      hour >= 4 && hour < 11
        ? "Selamat pagi"
        : hour >= 11 && hour < 15
          ? "Selamat siang"
          : hour >= 15 && hour < 18
            ? "Selamat sore"
            : "Selamat malam";
    const caller = userName?.trim() ? `Kak ${userName.trim().split(/\s+/)[0]}` : "Kak";
    const greeting = `${salam}, ${caller}! Suara asisten pribadi sudah aktif dengan hangat. Saya ${persona.name.split("·")[0].trim()}, siap menemani ${storeProfile.businessName}. Apa kabar hari ini?`;

    speakResponse(greeting, false);
    onToast("Suara Hangat Asisten AI diaktifkan! Pastikan volume speaker/HP menyala.");
  }, [onToast, personaId, speakResponse, storeProfile.businessName, userName]);

  const executeCompanionAction = useCallback(
    async (action: CompanionPendingAction) => {
      if (!voiceUnlocked) {
        onToast(
          "Eksekusi aksi otonom dari Asisten Suara tersedia di Enterprise AI Suite (coba gratis 7 hari!).",
          "error",
        );
        return;
      }

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
    [adapter, onRefresh, onToast, storeProfile.businessName, voiceUnlocked],
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
          editionId,
          userName,
          snapshot,
          storeProfile,
          pendingAction,
        });

        setPendingAction(voiceUnlocked ? turn.nextPendingAction : null);
        if (turn.navigateToTab) {
          onNavigateTab(turn.navigateToTab);
        }

        const aiMsg: CompanionMessage = {
          id: `a-${Date.now() + 1}`,
          role: "assistant",
          text: turn.replyText,
          speechText: turn.speechText,
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

        if (turn.executeAction && voiceUnlocked) {
          await executeCompanionAction(turn.executeAction);
        }

        speakResponse(turn.speechText, voiceUnlocked && fromVoice && !turn.shouldEndSession);
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
    [
      activeTab,
      busy,
      editionId,
      executeCompanionAction,
      onNavigateTab,
      pendingAction,
      snapshot,
      speakResponse,
      storeProfile,
      userName,
      voiceUnlocked,
    ],
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
        if (voiceUnlocked) setContinuousMode(true);
      }
      void handleUserUtteranceRef.current?.(
        externalPrompt.prompt,
        Boolean(externalPrompt.speakImmediately),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [externalPrompt, voiceUnlocked]);

  function toggleVoiceSession() {
    if (!voiceUnlocked) {
      onToast(
        "Mode Mikrofon Hands-Free 24/7 aktif penuh di Enterprise AI Suite (Tersedia Trial Gratis 7 Hari!). Anda tetap bisa mengetik & menguji Suara Hangat AI sekarang.",
        "error",
      );
      return;
    }

    if (listening || continuousMode) {
      setContinuousMode(false);
      setListening(false);
      try {
        recognitionRef.current?.stop();
        stopWarmSpeech();
        setSpeaking(false);
      } catch {
        // ignore
      }
      onToast("Mode mikrofon kontinu dihentikan.");
      return;
    }
    playWarmActivationChime();
    setVoiceEnabled(true);
    setAudioActivated(true);
    setContinuousMode(true);
    startListeningOnce();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    setVoiceEnabled(true);
    await handleUserUtterance(text, false);
  }

  const indonesianVoices = availableVoices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith("id") ||
      v.lang.toLowerCase().startsWith("ms") ||
      v.name.toLowerCase().includes("indonesia"),
  );
  const voicePickerList = indonesianVoices.length > 0 ? indonesianVoices : availableVoices.slice(0, 12);

  return (
    <>
      {/* Prominent Floating Launcher Button */}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            playWarmActivationChime();
          }}
          className={`fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-xs font-extrabold text-white shadow-2xl transition hover:scale-105 md:bottom-6 ${
            voiceUnlocked
              ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 shadow-emerald-500/40 ring-2 ring-emerald-300/40"
              : "bg-gradient-to-r from-slate-900 to-emerald-950 text-emerald-200 ring-2 ring-emerald-400/50 shadow-slate-950/50"
          }`}
          title="Buka Asisten Pribadi & Pemandu Suara AI 24/7"
        >
          <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
          <span>Asisten Suara AI 24/7</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <Volume2 className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {/* Dockable Companion Drawer */}
      {open && (
        <div className="fixed right-3 bottom-16 z-50 flex h-[600px] max-h-[86vh] w-[calc(100vw-24px)] max-w-md flex-col overflow-hidden rounded-3xl border border-emerald-500/50 bg-slate-950 text-slate-100 shadow-2xl md:right-5 md:bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-emerald-950 via-teal-950/90 to-slate-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition ${
                  speaking
                    ? "animate-pulse bg-emerald-500 text-slate-950 ring-emerald-300"
                    : listening
                      ? "animate-pulse bg-rose-500 text-white ring-rose-300"
                      : "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40"
                }`}
              >
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-white">Asisten Suara AI 24/7</h3>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                    Ramah &amp; Hangat
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300">
                  {speaking
                    ? "Sedang berbicara dengan hangat..."
                    : listening
                      ? "Sedang mendengarkan suara Anda..."
                      : continuousMode
                        ? "Mode bicara kontinu aktif (bilang 'cukup' untuk berhenti)"
                        : activeVoiceLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowVoiceSettings((v) => !v)}
                className={`rounded-lg p-1.5 transition ${
                  showVoiceSettings
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
                title="Pengaturan Karakter & Suara"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  if (!next) {
                    stopWarmSpeech();
                    setSpeaking(false);
                  }
                }}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800"
                title={voiceEnabled ? "Bisukan suara balasan" : "Nyalakan suara balasan"}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-rose-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setContinuousMode(false);
                  setListening(false);
                  setSpeaking(false);
                  try {
                    recognitionRef.current?.stop();
                    stopWarmSpeech();
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

          {/* 1-Click Warm Voice Activator & Audio Check Bar (Fixes Silent Browser Issue!) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3.5 py-2.5">
            <button
              type="button"
              onClick={handleActivateAndTestVoice}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400"
            >
              <Volume2 className="h-4 w-4" />
              {audioActivated ? "Uji Ulang Suara Hangat" : "Aktifkan & Tes Suara Hangat"}
            </button>
            {speaking && (
              <button
                type="button"
                onClick={() => {
                  stopWarmSpeech();
                  setSpeaking(false);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
              >
                <Square className="h-3.5 w-3.5" /> Hentikan
              </button>
            )}
          </div>

          {/* Collapsible Voice Persona & Engine Picker */}
          {showVoiceSettings && (
            <div className="space-y-2.5 border-b border-slate-800 bg-slate-900/80 px-3.5 py-3 text-xs">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <HeartHandshake className="h-3.5 w-3.5" /> Pilih Karakter Suara Asisten
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {WARM_VOICE_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPersonaId(p.id);
                      speakWarmIndonesian({
                        text: p.sampleGreeting,
                        personaId: p.id,
                        preferredVoiceName: selectedVoiceName || null,
                        onStart: () => {
                          setSpeaking(true);
                          setAudioActivated(true);
                        },
                        onEnd: () => setSpeaking(false),
                      });
                    }}
                    className={`rounded-xl border px-2 py-2 text-left transition ${
                      personaId === p.id
                        ? "border-emerald-400 bg-emerald-500/20 text-white"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-[11px] font-bold">{p.name.split("·")[0]}</div>
                    <div className="text-[9px] text-slate-400">{p.name.split("·")[1]}</div>
                  </button>
                ))}
              </div>
              {voicePickerList.length > 0 && (
                <label className="block text-[11px] text-slate-300">
                  Suara Browser ({voicePickerList.length} tersedia):
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-white"
                  >
                    <option value="">Otomatis Terbaik (Bahasa Indonesia Hangat)</option>
                    {voicePickerList.map((v) => (
                      <option key={`${v.name}-${v.lang}`} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {voiceWarning && (
            <div className="border-b border-amber-500/30 bg-amber-950/50 px-3.5 py-2 text-[11px] text-amber-200">
              ⚠️ {voiceWarning}
            </div>
          )}

          {/* Friendly Tier Notice for Starter UMKM / Growth Pro (Still lets user chat & test warm voice!) */}
          {!voiceUnlocked && (
            <div className="border-b border-amber-500/40 bg-amber-950/35 px-3.5 py-2.5 text-[11px]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <div>
                    <div className="font-bold text-amber-200">
                      Mode Ramah &amp; Tes Suara Aktif ({activeEditionName})
                    </div>
                    <p className="mt-0.5 text-slate-300">
                      Anda bisa menyapa, tes suara hangat &amp; tanya FAQ di sini. Untuk <strong>Mikrofon Hands-Free 24/7 &amp; Eksekusi Aksi Otomatis</strong>, aktifkan <strong>Trial Gratis 7 Hari Enterprise</strong> atau License Key.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {onStartEnterpriseTrial && (
                  <button
                    type="button"
                    onClick={() => onStartEnterpriseTrial()}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-2.5 py-1 text-[10px] font-extrabold text-white hover:bg-violet-400"
                  >
                    <Sparkles className="h-3 w-3" /> Coba Gratis 7 Hari Enterprise
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onUpgradeRequest?.();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  <KeyRound className="h-3 w-3" /> Aktivasi License Key
                </button>
              </div>
            </div>
          )}

          {/* Warm Everyday Conversation + Business Quick Prompt Chips */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-slate-800 bg-slate-900/70 px-3 py-2">
            {[
              "Selamat pagi, apa kabar?",
              "Kasih motivasi & ide promo hari ini",
              "Apakah hari ini ada prospek yang belum kita follow up?",
              "Ringkasan omzet & laba hari ini",
              "Cek stok menipis",
              "Panduan hubungkan WhatsApp Cloud API Meta",
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

          {/* Conversation History with 1-Tap Audio Replay on every AI bubble */}
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm border border-slate-800 bg-slate-900 text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.role === "assistant" && (
                    <div className="mt-1.5 flex items-center justify-end border-t border-slate-800/80 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceEnabled(true);
                          speakResponse(m.speechText || m.text, false);
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/15"
                        title="Dengarkan ulang jawaban ini dengan suara hangat"
                      >
                        <Play className="h-2.5 w-2.5" /> Dengarkan Suara
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pendingAction && voiceUnlocked && (
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
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 p-3"
          >
            <button
              type="button"
              onClick={toggleVoiceSession}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                !voiceUnlocked
                  ? "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  : listening || continuousMode
                    ? "animate-pulse bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                    : "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40 hover:bg-cyan-500/30"
              }`}
              title={
                !voiceUnlocked
                  ? "Mikrofon Hands-Free 24/7 tersedia di Enterprise AI Suite (Trial 7 Hari)"
                  : listening || continuousMode
                    ? "Hentikan mode suara"
                    : "Mulai bicara lewat mikrofon (aktif sampai bilang 'cukup')"
              }
            >
              {!voiceUnlocked ? (
                <Lock className="h-4 w-4" />
              ) : listening || continuousMode ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Sapa 'Apa kabar?', tanya FAQ, atau beri perintah..."
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
