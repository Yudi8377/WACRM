"use client";

import { useState, type FormEvent } from "react";
import { Bot, Send, X } from "lucide-react";
import { PUBLISHER_HQ_BASE_URL } from "@/lib/enterprise-catalog";

interface ChatMsg {
  id: string;
  sender: "ai" | "user";
  agentName?: string;
  text: string;
}

const QUICK_PROMPTS = [
  "Harga 4 edisi WACRM?",
  "Gratis untuk UMKM?",
  "Izin kamera & Android APK?",
  "Jadwalkan demo Enterprise",
];

interface LiveAiChatWidgetProps {
  onOpenRegister?: () => void;
}

export function LiveAiChatWidget({ onOpenRegister }: LiveAiChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      sender: "ai",
      agentName: "Nadia AI · Frontline Concierge 24/7",
      text: "Selamat datang di WACRM Enterprise. Saya terhubung langsung ke 5 Agen AI Publisher HQ — silakan tanya harga, modul ERP/PSAK, atau cara membuka akses privat aplikasi.",
    },
  ]);

  async function sendPrompt(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: clean }]);
    setSending(true);
    try {
      const res = await fetch(`${PUBLISHER_HQ_BASE_URL}/api/ai-agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });
      const data = (await res.json()) as {
        reply?: string;
        agentName?: string;
      };
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: "ai",
          agentName: data.agentName || "Multi-Agent AI · WACRM",
          text:
            data.reply ||
            "Terima kasih! Silakan lengkapi formulir pendaftaran untuk langsung menerima akses privat aplikasi.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-fb-${Date.now()}`,
          sender: "ai",
          agentName: "Multi-Agent AI · Mode Siaga",
          text: "Terima kasih atas pesan Anda. Silakan lengkapi formulir Daftar di halaman ini untuk menerima akses privat & tindak lanjut otomatis Publisher HQ.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendPrompt(input);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] sm:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka Konsultan 5 Agen AI 24/7"
            className="inline-flex items-center gap-2 rounded-full bg-[#00A885] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xl shadow-[#00A885]/35 transition hover:bg-[#008C6F] active:scale-95"
          >
            <Bot className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">AI 24/7</span>
            <span className="hidden sm:inline">Konsultan AI · 24/7</span>
            <span className="h-2 w-2 rounded-full bg-white" />
          </button>
        ) : (
          <div className="fixed inset-x-3 bottom-3 z-50 flex h-[74dvh] max-h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-[#222222] shadow-2xl sm:static sm:h-[470px] sm:w-[365px]">
            <div className="flex items-center justify-between bg-[#222222] px-4 py-3.5 text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00A885]">
                  <Bot className="h-4 w-4 text-white" />
                </span>
                <div>
                  <div className="font-heading text-sm font-bold">Multi-Agent AI WACRM</div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300">
                    Publisher HQ · Online 24/7
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
                aria-label="Tutup chat AI"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="chat-scroll flex-1 space-y-2.5 overflow-y-auto bg-[#F9F9F9] p-3.5 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 ${
                    m.sender === "user"
                      ? "ml-6 bg-[#00A885] text-white"
                      : "mr-4 border border-zinc-200 bg-white text-[#333333] shadow-2xs"
                  }`}
                >
                  {m.agentName && (
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#00A885]">
                      {m.agentName}
                    </div>
                  )}
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                </div>
              ))}
              {sending && (
                <div className="mr-6 rounded-lg border border-zinc-200 bg-white p-2.5 text-[11px] text-[#797979]">
                  Agen AI sedang menyusun jawaban…
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 bg-white px-3 py-2.5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendPrompt(q)}
                    className="rounded-full border border-[#00A885]/35 bg-[#E6F7F3] px-2.5 py-1 text-[10px] font-semibold text-[#008C6F] transition hover:bg-[#00A885] hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pertanyaan bisnis Anda..."
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-[#222222] outline-none focus:border-[#00A885] sm:text-xs"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-md bg-[#00A885] px-3.5 py-2 text-white transition hover:bg-[#008C6F] disabled:opacity-50"
                  aria-label="Kirim pertanyaan"
                >
                  <Send className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
              </form>
              {onOpenRegister && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenRegister();
                    }}
                    className="py-0.5 text-[11px] font-bold text-[#00A885] hover:underline"
                  >
                    Buka Form Daftar Akses Privat →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
