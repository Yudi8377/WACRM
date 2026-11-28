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
            "Terima kasih! Silakan lengkapi formulir pada tab Daftar untuk langsung menerima akses privat aplikasi.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-fb-${Date.now()}`,
          sender: "ai",
          agentName: "Multi-Agent AI · Mode Siaga",
          text: "Terima kasih atas pesan Anda. Silakan buka tab Daftar untuk menerima akses privat aplikasi & balasan otomatis Publisher HQ.",
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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden"
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
            className="font-mono-meta inline-flex items-center gap-2 rounded-full border border-[#F5F2EB]/30 bg-[#141311]/95 px-3.5 py-2.5 text-[10px] uppercase tracking-widest text-[#F5F2EB] shadow-xl backdrop-blur transition hover:border-[#F5F2EB] hover:bg-[#0F5132] sm:rounded-none sm:px-4 sm:text-[11px]"
          >
            <Bot className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">AI 24/7</span>
            <span className="hidden sm:inline">5 Agen AI · 24/7</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </button>
        ) : (
          <div className="fixed inset-x-3 bottom-3 z-50 flex h-[74dvh] max-h-[520px] flex-col overflow-hidden rounded-xl border border-[#141311]/25 bg-[#F5F2EB] text-[#141311] shadow-2xl sm:static sm:h-[460px] sm:w-[360px] sm:rounded-none">
            <div className="flex items-center justify-between border-b border-[#141311]/15 bg-[#141311] px-4 py-3 text-[#F5F2EB]">
              <div>
                <div className="font-editorial text-sm font-semibold">Multi-Agent AI WACRM</div>
                <div className="font-mono-meta text-[10px] uppercase tracking-widest text-[#F5F2EB]/65">
                  Publisher HQ · Online 24/7
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-[#F5F2EB]/75 hover:text-white"
                aria-label="Tutup chat AI"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="editorial-scroll flex-1 space-y-2.5 overflow-y-auto p-3.5 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 ${
                    m.sender === "user"
                      ? "ml-6 bg-[#141311] text-[#F5F2EB]"
                      : "mr-4 border border-[#141311]/15 bg-[#ECE7DC]/70 text-[#141311]"
                  }`}
                >
                  {m.agentName && (
                    <div className="font-mono-meta mb-1 text-[9px] uppercase tracking-wider text-[#0F5132]">
                      {m.agentName}
                    </div>
                  )}
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                </div>
              ))}
              {sending && (
                <div className="font-mono-meta mr-6 border border-[#141311]/15 bg-[#ECE7DC]/60 p-2.5 text-[10px] uppercase tracking-wider text-[#6C675E]">
                  Agen AI sedang menyusun jawaban…
                </div>
              )}
            </div>

            <div className="border-t border-[#141311]/15 bg-[#ECE7DC]/60 px-3 py-2.5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendPrompt(q)}
                    className="font-mono-meta border border-[#141311]/20 bg-[#F5F2EB] px-2 py-1 text-[10px] text-[#141311] transition hover:bg-[#141311] hover:text-[#F5F2EB]"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pertanyaan bisnis Anda..."
                  className="flex-1 border-b border-[#141311]/30 bg-transparent px-1 py-2 text-sm text-[#141311] outline-none focus:border-[#141311] sm:text-xs"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-[#141311] px-3.5 py-2 text-[#F5F2EB] transition hover:bg-[#0F5132] disabled:opacity-50"
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
                    className="font-mono-meta py-1 text-[10px] uppercase tracking-wider text-[#0F5132] hover:underline"
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
