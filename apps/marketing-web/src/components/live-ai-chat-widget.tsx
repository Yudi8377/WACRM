"use client";

import { useState, type FormEvent } from "react";
import { Bot, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { PUBLISHER_HQ_BASE_URL } from "@/lib/enterprise-catalog";

interface ChatMsg {
  id: string;
  sender: "ai" | "user";
  agentName?: string;
  text: string;
}

const QUICK_PROMPTS = [
  "Berapa harga paket WACRM?",
  "Apakah tersedia gratis untuk UMKM?",
  "Bagaimana cara atasi izin kamera & mic?",
  "Saya ingin jadwalkan demo Enterprise",
];

export function LiveAiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      sender: "ai",
      agentName: "Multi-Agent AI · Frontline Concierge",
      text: "Halo! Saya Asisten Multi-Agent AI resmi PT WACRM Digital Nusantara yang terhubung langsung ke Publisher HQ. Silakan tanya harga, modul ERP/PSAK, atau cara mendapatkan akses privat aplikasi.",
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
            "Terima kasih! Silakan isi formulir pendaftaran di bagian bawah halaman agar akses privat aplikasi dan panduan onboarding langsung disiapkan.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-fb-${Date.now()}`,
          sender: "ai",
          agentName: "Multi-Agent AI · Mode Siaga",
          text: "Terima kasih atas pertanyaan Anda! Untuk mendapatkan akses privat aplikasi & penawaran edisi WACRM v5.3.1, silakan lengkapi formulir pendaftaran resmi di bagian #daftar halaman ini.",
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
    <div className="fixed bottom-5 right-5 z-50">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 rounded-full border border-emerald-400/50 bg-emerald-500 px-5 py-3 text-xs font-extrabold text-slate-950 shadow-2xl shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-400"
        >
          <Bot className="h-4 w-4" />
          <span>Tanya 5 Agen AI (24/7)</span>
          <span className="flex h-2 w-2 rounded-full bg-slate-950" />
        </button>
      ) : (
        <div className="flex h-[480px] w-[350px] max-w-[92vw] flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white">Multi-Agent AI WACRM</div>
                <div className="text-[10px] text-emerald-400">Terhubung ke Publisher HQ · Online 24/7</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Tutup chat AI"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl p-3 ${
                  m.sender === "user"
                    ? "ml-6 bg-emerald-500/15 text-emerald-100"
                    : "mr-4 border border-slate-800 bg-slate-900 text-slate-200"
                }`}
              >
                {m.agentName && (
                  <div className="mb-1 text-[10px] font-extrabold text-emerald-400">
                    {m.agentName}
                  </div>
                )}
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
              </div>
            ))}
            {sending && (
              <div className="mr-6 rounded-2xl border border-slate-800 bg-slate-900 p-2.5 text-[11px] text-slate-400">
                Agen AI sedang menyusun jawaban...
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 bg-slate-900/60 px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendPrompt(q)}
                  className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
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
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-3 py-2 text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                aria-label="Kirim pertanyaan"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Respon Instan AI
              </span>
              <a
                href="#daftar"
                onClick={() => setOpen(false)}
                className="font-bold text-emerald-400 hover:underline"
              >
                Buka Form Daftar →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
