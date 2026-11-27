"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageSquareHeart,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  Volume2,
  X,
} from "lucide-react";
import {
  answerAppFaqWithMultiAgent,
  PRESET_APP_FAQS,
  type MultiAgentFaqAnswer,
} from "@/lib/community-faq";
import type { AppEditionId } from "@/lib/crm-types";
import { getEditionById } from "@/lib/editions";
import { speakWarmIndonesian } from "@/lib/warm-voice";

interface PublicCommunityEntry {
  id: string;
  kind: "feedback" | "testimonial";
  displayName: string;
  businessName: string;
  editionId: AppEditionId;
  region: string;
  category: string;
  rating: number;
  usefulness: "very_useful" | "useful" | "needs_work";
  sentiment: "positive" | "neutral" | "constructive";
  headline: string;
  message: string;
  photoDataUrl: string | null;
  createdAt: string;
}

interface CommunityHubViewProps {
  editionId: AppEditionId;
  accountEmail?: string | null;
  displayName?: string;
  businessName: string;
  defaultCity?: string;
  onNavigateTab: (tab: string) => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

const INDONESIAN_REGIONS = [
  "Kediri, Jawa Timur",
  "Surabaya, Jawa Timur",
  "Malang, Jawa Timur",
  "DKI Jakarta",
  "Bandung, Jawa Barat",
  "Semarang, Jawa Tengah",
  "Yogyakarta, DIY",
  "Solo, Jawa Tengah",
  "Medan, Sumatera Utara",
  "Palembang, Sumatera Selatan",
  "Denpasar, Bali",
  "Makassar, Sulawesi Selatan",
  "Balikpapan, Kalimantan Timur",
];

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak didukung."));
      img.onload = () => {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas tidak tersedia."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function CommunityHubView({
  editionId,
  accountEmail,
  displayName,
  businessName,
  defaultCity,
  onNavigateTab,
  onToast,
}: CommunityHubViewProps) {
  const [subTab, setSubTab] = useState<"faq" | "feedback" | "testimonials">("faq");

  // --- Multi-Agent FAQ State (Dropdown Accordion + Custom AI Q&A) ---
  const [faqInput, setFaqInput] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>(PRESET_APP_FAQS[0]?.id ?? null);
  const [faqHistory, setFaqHistory] = useState<MultiAgentFaqAnswer[]>([]);

  // --- Community Feed State ---
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    testimonialsCount: 0,
    commentsCount: 0,
    avgRating: 4.9,
    usefulPct: 96,
  });
  const [testimonials, setTestimonials] = useState<PublicCommunityEntry[]>([]);
  const [comments, setComments] = useState<PublicCommunityEntry[]>([]);

  // --- Feedback Form State ---
  const [fbName, setFbName] = useState(displayName || businessName || "");
  const [fbRegion, setFbRegion] = useState(defaultCity || "Kediri, Jawa Timur");
  const [fbCategory, setFbCategory] = useState("Saran Fitur");
  const [fbRating, setFbRating] = useState(5);
  const [fbUsefulness, setFbUsefulness] = useState<"very_useful" | "useful" | "needs_work">(
    "very_useful",
  );
  const [fbHeadline, setFbHeadline] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [submittingFb, setSubmittingFb] = useState(false);

  // --- Testimonial + Photo Form State ---
  const [tsName, setTsName] = useState(displayName || "");
  const [tsBusiness, setTsBusiness] = useState(businessName || "");
  const [tsRegion, setTsRegion] = useState(defaultCity || "Kediri, Jawa Timur");
  const [tsRating, setTsRating] = useState(5);
  const [tsHeadline, setTsHeadline] = useState("");
  const [tsMessage, setTsMessage] = useState("");
  const [tsPhoto, setTsPhoto] = useState<string | null>(null);
  const [submittingTs, setSubmittingTs] = useState(false);

  const loadCommunityFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/community", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        summary?: typeof summary;
        testimonials?: PublicCommunityEntry[];
        comments?: PublicCommunityEntry[];
      };
      if (data.summary) setSummary(data.summary);
      if (data.testimonials) setTestimonials(data.testimonials);
      if (data.comments) setComments(data.comments);
    } catch {
      // ignore transient network error
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/community", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            summary?: typeof summary;
            testimonials?: PublicCommunityEntry[];
            comments?: PublicCommunityEntry[];
          } | null,
        ) => {
          if (!active || !data) return;
          if (data.summary) setSummary(data.summary);
          if (data.testimonials) setTestimonials(data.testimonials);
          if (data.comments) setComments(data.comments);
        },
      )
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingFeed(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleAskFaq(questionText: string) {
    const clean = questionText.trim();
    if (!clean) return;
    const answer = answerAppFaqWithMultiAgent({
      question: clean,
      editionId,
      businessName,
    });
    setFaqHistory((prev) => [answer, ...prev.slice(0, 7)]);
    setFaqInput("");
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast("Pilih file foto berformat JPG, PNG, atau WebP.", "error");
      return;
    }
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setTsPhoto(dataUrl);
      onToast("Foto testimoni berhasil dimuat & dioptimalkan!");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memproses foto.", "error");
    }
  }

  async function handleSubmitFeedback(e: FormEvent) {
    e.preventDefault();
    if (fbMessage.trim().length < 8) {
      onToast("Tulis pendapat/komentar minimal 8 karakter.", "error");
      return;
    }
    setSubmittingFb(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          tenantEmail: accountEmail || "",
          displayName: fbName.trim() || "Pengguna WACRM",
          businessName,
          editionId,
          region: fbRegion,
          category: fbCategory,
          rating: fbRating,
          usefulness: fbUsefulness,
          headline: fbHeadline.trim() || fbCategory,
          message: fbMessage.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        onToast(data.error || "Gagal mengirim masukan.", "error");
        return;
      }
      setFbHeadline("");
      setFbMessage("");
      onToast(
        "Terima kasih! Pendapat Anda langsung tercatat & dianalisis di WACRM Publisher HQ untuk peningkatan aplikasi.",
      );
      await loadCommunityFeed();
    } catch {
      onToast("Koneksi gagal saat mengirim komentar.", "error");
    } finally {
      setSubmittingFb(false);
    }
  }

  async function handleSubmitTestimonial(e: FormEvent) {
    e.preventDefault();
    if (tsMessage.trim().length < 8) {
      onToast("Tulis cerita testimoni minimal 8 karakter.", "error");
      return;
    }
    setSubmittingTs(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "testimonial",
          tenantEmail: accountEmail || "",
          displayName: tsName.trim() || displayName || "Pemilik Usaha",
          businessName: tsBusiness.trim() || businessName,
          editionId,
          region: tsRegion,
          category: "Testimoni Usaha",
          rating: tsRating,
          usefulness: tsRating >= 4 ? "very_useful" : "useful",
          headline: tsHeadline.trim() || `Pengalaman ${tsBusiness.trim() || businessName} dengan WACRM`,
          message: tsMessage.trim(),
          photoDataUrl: tsPhoto,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        onToast(data.error || "Gagal menyimpan testimoni.", "error");
        return;
      }
      setTsHeadline("");
      setTsMessage("");
      setTsPhoto(null);
      onToast("Testimoni & foto Anda berhasil dipublikasikan dan tersinkron ke Publisher HQ!");
      await loadCommunityFeed();
    } catch {
      onToast("Koneksi gagal saat mengirim testimoni.", "error");
    } finally {
      setSubmittingTs(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-emerald-950/50 to-slate-900 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Terbuka untuk Semua Edisi (Termasuk Starter UMKM Gratis)
            </div>
            <h2 className="mt-2.5 text-2xl font-extrabold text-white">
              Pusat Bantuan FAQ Multi-Agen AI, Pendapat &amp; Testimoni
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Tanyakan apa saja tentang cara kerja WACRM (dijawab langsung oleh Agen AI spesialis sesuai konteks Anda), berikan masukan agar aplikasi makin bermanfaat, dan bagikan testimoni berfoto dari usaha Anda.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2.5">
              <div className="text-lg font-extrabold text-emerald-400">{summary.usefulPct}%</div>
              <div className="text-[10px] text-slate-400">Menilai Bermanfaat</div>
            </div>
            <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2.5">
              <div className="text-lg font-extrabold text-amber-300">{summary.avgRating}/5</div>
              <div className="text-[10px] text-slate-400">Rating Pengguna</div>
            </div>
            <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2.5">
              <div className="text-lg font-extrabold text-cyan-300">{summary.testimonialsCount}</div>
              <div className="text-[10px] text-slate-400">Testimoni Usaha</div>
            </div>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab("faq")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              subTab === "faq"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "border border-slate-700 bg-slate-950/70 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <HelpCircle className="h-4 w-4" /> FAQ Cerdas Multi-Agen AI
          </button>
          <button
            type="button"
            onClick={() => setSubTab("feedback")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              subTab === "feedback"
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                : "border border-slate-700 bg-slate-950/70 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <MessageSquareHeart className="h-4 w-4" /> Pendapat &amp; Komentar ({comments.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("testimonials")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              subTab === "testimonials"
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "border border-slate-700 bg-slate-950/70 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Camera className="h-4 w-4" /> Testimoni Berfoto ({testimonials.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MULTI-AGENT AI FAQ (INTERACTIVE DROPDOWN ACCORDION!) */}
      {subTab === "faq" && (
        <div className="space-y-5">
          {/* Top: Ask Custom Question to Multi-Agent AI */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskFaq(faqInput);
            }}
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"
          >
            <label className="text-xs font-bold text-emerald-300">
              Tanyakan Apa Saja Tentang Aplikasi WACRM
            </label>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Pertanyaan otomatis diteruskan ke Agen AI spesialis (Lisensi, Meta WA, POS/Printer, ERP/Akuntansi, Voice AI, atau Keamanan).
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={faqInput}
                onChange={(e) => setFaqInput(e.target.value)}
                placeholder="Contoh: Cara aktifkan suara AI atau aturan Trial 14 hari..."
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                <Send className="h-3.5 w-3.5" /> Tanya AI
              </button>
            </div>
          </form>

          {/* Custom AI Answers (shown immediately beneath search bar when user asks a custom question) */}
          {faqHistory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-cyan-300">
                  Jawaban Langsung Multi-Agen AI ({faqHistory.length})
                </span>
                <button
                  type="button"
                  onClick={() => setFaqHistory([])}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white"
                >
                  Bersihkan Riwayat
                </button>
              </div>
              {faqHistory.map((ans, idx) => (
                <div
                  key={`${ans.agentKey}-${idx}`}
                  className="rounded-2xl border border-emerald-500/35 bg-slate-900/95 p-4 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-white">{ans.agentName}</div>
                        <div className="text-[10px] text-emerald-300">
                          {ans.agentBadge} · Kategori: {ans.category}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        speakWarmIndonesian({ text: ans.speechAnswer, personaId: "warm_friendly" });
                        onToast("Membacakan jawaban dengan suara hangat...");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/25"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Dengarkan Suara AI
                    </button>
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-cyan-200">
                    Pertanyaan: &ldquo;{ans.questionMatched}&rdquo;
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                    {ans.answer}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5">
                    {ans.relatedTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab(ans.relatedTab!)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
                      >
                        {ans.relatedTabLabel || "Buka Menu Terkait"} <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {ans.followUpQuestions.map((fq) => (
                        <button
                          key={fq}
                          type="button"
                          onClick={() => handleAskFaq(fq)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:border-emerald-500/40 hover:text-white"
                        >
                          {fq}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Popular Questions Accordion Dropdown (Answer expands DIRECTLY underneath clicked question!) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Pertanyaan Populer (Klik untuk Buka Jawaban di Bawahnya)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ketuk salah satu pertanyaan di bawah ini — jawaban lengkap langsung terbuka seperti dropdown tepat di bawah pertanyaan.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                {PRESET_APP_FAQS.length} Panduan Siap Pakai
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {PRESET_APP_FAQS.map((item) => {
                const isExpanded = openFaqId === item.id;
                const ans = isExpanded
                  ? answerAppFaqWithMultiAgent({
                      question: item.question,
                      editionId,
                      businessName,
                    })
                  : null;
                return (
                  <div
                    key={item.id}
                    className={`overflow-hidden rounded-2xl border transition ${
                      isExpanded
                        ? "border-emerald-500/60 bg-slate-950 shadow-lg shadow-emerald-950/30"
                        : "border-slate-800 bg-slate-950/75 hover:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setOpenFaqId((prev) => (prev === item.id ? null : item.id))}
                      className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-slate-900/80"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          {item.agentBadge}
                        </span>
                        <div className="mt-1 text-xs font-bold text-slate-100 sm:text-sm">
                          {item.question}
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-emerald-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && ans && (
                      <div className="border-t border-slate-800/90 bg-slate-900/90 px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="text-[11px] font-extrabold text-white">
                                {ans.agentName}
                              </div>
                              <div className="text-[10px] text-emerald-300">
                                Kategori: {ans.category}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              speakWarmIndonesian({
                                text: ans.speechAnswer,
                                personaId: "warm_friendly",
                              });
                              onToast("Membacakan jawaban dengan suara hangat...");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/25"
                          >
                            <Volume2 className="h-3.5 w-3.5" /> Dengarkan Suara AI
                          </button>
                        </div>

                        <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                          {ans.answer}
                        </div>

                        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                          {ans.relatedTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab(ans.relatedTab!)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
                            >
                              {ans.relatedTabLabel || "Buka Menu Terkait"}{" "}
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {ans.followUpQuestions.map((fq) => (
                              <button
                                key={fq}
                                type="button"
                                onClick={() => handleAskFaq(fq)}
                                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:border-emerald-500/40 hover:text-white"
                              >
                                {fq}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: USER FEEDBACK & COMMENTS */}
      {subTab === "feedback" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <form
            onSubmit={handleSubmitFeedback}
            className="space-y-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 lg:col-span-5"
          >
            <div>
              <h3 className="text-sm font-extrabold text-white">Kirim Pendapat &amp; Komentar Anda</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Masukan Anda otomatis dikelompokkan oleh AI sentimen di WACRM Publisher HQ agar tim kami bisa mengambil keputusan perbaikan tercepat.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-300">
                Nama Anda
                <input
                  required
                  value={fbName}
                  onChange={(e) => setFbName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Kota / Daerah
                <input
                  list="wacrm-region-list"
                  value={fbRegion}
                  onChange={(e) => setFbRegion(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-300">
                Kategori Topik
                <select
                  value={fbCategory}
                  onChange={(e) => setFbCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="Saran Fitur">Saran Fitur Baru</option>
                  <option value="Pujian / Bermanfaat">Pujian / Sangat Membantu</option>
                  <option value="Kendala / Bug">Kendala / Bug Aplikasi</option>
                  <option value="Harga & Lisensi">Harga, Trial &amp; Lisensi</option>
                  <option value="UX & Kecepatan">Kemudahan &amp; Kecepatan</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Apakah WACRM bermanfaat?
                <select
                  value={fbUsefulness}
                  onChange={(e) =>
                    setFbUsefulness(e.target.value as "very_useful" | "useful" | "needs_work")
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="very_useful">Sangat Bermanfaat</option>
                  <option value="useful">Bermanfaat</option>
                  <option value="needs_work">Perlu Peningkatan</option>
                </select>
              </label>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-300">Rating Kepuasan</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFbRating(n)}
                    className={`rounded-lg p-1.5 transition ${
                      n <= fbRating ? "text-amber-400" : "text-slate-600"
                    }`}
                  >
                    <Star className={`h-5 w-5 ${n <= fbRating ? "fill-amber-400" : ""}`} />
                  </button>
                ))}
                <span className="ml-1 text-xs font-bold text-amber-300">{fbRating}/5</span>
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-300">
              Judul Singkat (Opsional)
              <input
                value={fbHeadline}
                onChange={(e) => setFbHeadline(e.target.value)}
                placeholder="Contoh: Fitur POS QR sangat cepat, mohon tambah resi massal"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-300">
              Pendapat / Komentar / Saran *
              <textarea
                required
                rows={4}
                value={fbMessage}
                onChange={(e) => setFbMessage(e.target.value)}
                placeholder="Ceritakan apa yang paling membantu usaha Anda atau fitur apa yang ingin kami tambahkan..."
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </label>

            <button
              type="submit"
              disabled={submittingFb}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              <ThumbsUp className="h-4 w-4" />
              {submittingFb ? "Mengirim ke Publisher HQ..." : "Kirim Pendapat & Komentar"}
            </button>
          </form>

          <div className="space-y-3 lg:col-span-7">
            <h3 className="text-sm font-extrabold text-white">Komentar &amp; Masukan Pengguna Terbaru</h3>
            {loadingFeed ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-xs text-slate-400">
                Memuat komentar komunitas...
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-xs text-slate-400">
                Belum ada komentar. Jadilah yang pertama berbagi pendapat!
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        {c.displayName}{" "}
                        {c.businessName && (
                          <span className="font-normal text-slate-400">· {c.businessName}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3 text-emerald-400" /> {c.region}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-cyan-300">
                          {c.category}
                        </span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                          {getEditionById(c.editionId).name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: c.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  {c.headline && (
                    <div className="mt-2 text-xs font-bold text-white">{c.headline}</div>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{c.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PHOTO TESTIMONIALS */}
      {subTab === "testimonials" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <form
            onSubmit={handleSubmitTestimonial}
            className="space-y-3.5 rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 lg:col-span-5"
          >
            <div>
              <h3 className="text-sm font-extrabold text-white">Bagikan Testimoni Usaha + Foto</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Tampilkan foto toko, produk unggulan, atau hasil cetak struk/label QR usaha Anda bersama testimoni WACRM!
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-300">
                Nama Pemilik *
                <input
                  required
                  value={tsName}
                  onChange={(e) => setTsName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Nama Toko / Usaha *
                <input
                  required
                  value={tsBusiness}
                  onChange={(e) => setTsBusiness(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-300">
                Kota / Daerah
                <input
                  list="wacrm-region-list"
                  value={tsRegion}
                  onChange={(e) => setTsRegion(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
              <div>
                <span className="block text-xs font-semibold text-slate-300">Rating</span>
                <div className="mt-1.5 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTsRating(n)}
                      className="p-0.5 text-amber-400"
                    >
                      <Star className={`h-4.5 w-4.5 ${n <= tsRating ? "fill-amber-400" : "text-slate-600"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-300">
              Judul Testimoni *
              <input
                required
                value={tsHeadline}
                onChange={(e) => setTsHeadline(e.target.value)}
                placeholder="Contoh: Orderan WhatsApp makin rapi & cetak QR super cepat!"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-300">
              Cerita Pengalaman Anda *
              <textarea
                required
                rows={3}
                value={tsMessage}
                onChange={(e) => setTsMessage(e.target.value)}
                placeholder="Bagikan bagaimana WACRM membantu penjualan, stok, atau layanan pelanggan usaha Anda..."
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </label>

            {/* Photo Upload with Live Preview */}
            <div>
              <span className="block text-xs font-semibold text-slate-300">
                Foto Usaha / Produk / Struk (Opsional)
              </span>
              {tsPhoto ? (
                <div className="relative mt-2 overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tsPhoto}
                    alt="Preview foto testimoni"
                    className="h-44 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setTsPhoto(null)}
                    className="absolute right-2 top-2 rounded-full bg-slate-950/80 p-1.5 text-white hover:bg-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-4 text-center text-xs text-slate-400 transition hover:border-amber-400/60 hover:text-amber-200">
                  <ImageIcon className="h-5 w-5" />
                  <span className="font-semibold">Klik untuk Unggah Foto Testimoni (JPG/PNG)</span>
                  <span className="text-[10px] text-slate-500">
                    Otomatis dikompresi agar cepat tampil di galeri &amp; Publisher HQ
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handlePhotoUpload(e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingTs}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Heart className="h-4 w-4" />
              {submittingTs ? "Memublikasikan Testimoni..." : "Publikasikan Testimoni Berfoto"}
            </button>
          </form>

          {/* Testimonials Showcase Grid */}
          <div className="space-y-3 lg:col-span-7">
            <h3 className="text-sm font-extrabold text-white">
              Galeri Testimoni Pelaku Usaha WACRM
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {testimonials.map((t) => (
                <article
                  key={t.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-md"
                >
                  {t.photoDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={t.photoDataUrl}
                      alt={t.headline || t.businessName}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 items-center justify-between bg-gradient-to-br from-emerald-950 via-slate-900 to-cyan-950 px-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-lg font-extrabold text-emerald-300">
                        {t.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                        {getEditionById(t.editionId).name}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Terverifikasi
                      </span>
                    </div>
                    <h4 className="mt-2 text-xs font-extrabold text-white">{t.headline}</h4>
                    <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-300">
                      &ldquo;{t.message}&rdquo;
                    </p>
                    <div className="mt-3 border-t border-slate-800 pt-2.5 text-[11px]">
                      <div className="font-bold text-white">{t.displayName}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{t.businessName}</span>
                        <span className="inline-flex items-center gap-0.5 text-cyan-300">
                          <MapPin className="h-2.5 w-2.5" /> {t.region}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      <datalist id="wacrm-region-list">
        {INDONESIAN_REGIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}
