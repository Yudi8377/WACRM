import type { EditionId } from "./publisher-types";
import { PUBLISHER_EDITIONS } from "./license-engine";

export type PublisherAiAgentId =
  | "ai_concierge"
  | "ai_qualifier"
  | "ai_followup"
  | "ai_onboarding"
  | "ai_retention";

export interface PublisherAiAgentConfig {
  id: PublisherAiAgentId;
  name: string;
  roleTitle: string;
  mission: string;
  tone: "eksekutif_ramah" | "konsultatif_b2b" | "teknis_solutif" | "closing_persuasif";
  isActive: boolean;
  autoReplyEnabled: boolean;
  responseSlaSeconds: number;
  handledCount: number;
  conversionRatePct: number;
  systemPrompt: string;
}

export interface LeadChatMessage {
  id: string;
  sender: "prospect" | "ai_agent" | "publisher_admin";
  agentId?: PublisherAiAgentId;
  agentName?: string;
  text: string;
  timestamp: string;
}

export interface PublisherWebsiteLead {
  id: string;
  registrationCode: string;
  fullName: string;
  companyName: string;
  email: string;
  whatsapp: string;
  city: string;
  industry: string;
  teamSize: string;
  interestedEdition: EditionId;
  source: "enterprise_website" | "website_ai_chat" | "whatsapp_inbound" | "manual_ems";
  notes: string;
  status: "new" | "ai_engaged" | "qualified" | "follow_up" | "converted" | "archived";
  aiScore: number;
  aiRecommendedEdition: EditionId;
  aiWelcomeReply: string;
  followUpStage: "H+0" | "H+1" | "H+3" | "H+7" | "closed";
  lastFollowUpAt: string | null;
  messages: LeadChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export function buildDefaultPublisherAiAgents(): PublisherAiAgentConfig[] {
  return [
    {
      id: "ai_concierge",
      name: "Nadia AI · Sales Concierge 24/7",
      roleTitle: "Agen 1 — Penjawab Chat Website & WhatsApp",
      mission:
        "Menjawab pertanyaan calon pembeli 24/7 terkait fitur WACRM v5.3, harga 4 edisi, demo, keamanan data, dan pendaftaran.",
      tone: "eksekutif_ramah",
      isActive: true,
      autoReplyEnabled: true,
      responseSlaSeconds: 3,
      handledCount: 148,
      conversionRatePct: 38.5,
      systemPrompt:
        "Jawab hangat, ringkas, profesional dalam Bahasa Indonesia. Arahkan prospek mengisi formulir pendaftaran resmi agar langsung diproses Publisher HQ.",
    },
    {
      id: "ai_qualifier",
      name: "Bima AI · BANT Deal Qualifier",
      roleTitle: "Agen 2 — Scoring Lead & Rekomendasi Edisi",
      mission:
        "Menilai skor kesiapan beli (0-100), merekomendasikan edisi terbaik (Starter/Pro/Enterprise/Sovereign), dan menghitung estimasi nilai kontrak tahunan.",
      tone: "konsultatif_b2b",
      isActive: true,
      autoReplyEnabled: true,
      responseSlaSeconds: 2,
      handledCount: 92,
      conversionRatePct: 44.0,
      systemPrompt:
        "Analisis skala tim, cabang, kebutuhan PSAK/HRD/ERP/AI, lalu klasifikasikan skor prioritas Hot/Warm/Nurture.",
    },
    {
      id: "ai_followup",
      name: "Raka AI · Follow-Up & Closing Specialist",
      roleTitle: "Agen 3 — Follow-Up Otomatis H+0, H+1, H+3, H+7",
      mission:
        "Menyusun dan mengeksekusi jadwal follow-up WhatsApp & Email personal hingga prospek aktivasi Trial/Lisensi Berbayar.",
      tone: "closing_persuasif",
      isActive: true,
      autoReplyEnabled: true,
      responseSlaSeconds: 5,
      handledCount: 215,
      conversionRatePct: 31.2,
      systemPrompt:
        "Bangun urgensi ROI tanpa memaksa, sertakan angka penghematan operasional dan ajakan aktivasi lisensi/konsultasi.",
    },
    {
      id: "ai_onboarding",
      name: "Sinta AI · Technical Onboarding Engineer",
      roleTitle: "Agen 4 — Aktivasi Lisensi, APK Android & Installer Windows",
      mission:
        "Memandu aktivasi License Key kriptografi, pemasangan Offline Windows Installer, APK Android v5.3.1, izin kamera/mikrofon, dan printer thermal.",
      tone: "teknis_solutif",
      isActive: true,
      autoReplyEnabled: true,
      responseSlaSeconds: 4,
      handledCount: 64,
      conversionRatePct: 96.4,
      systemPrompt:
        "Berikan langkah teknis berurutan, jelas, dan langsung menyelesaikan kendala perangkat atau aktivasi tenant.",
    },
    {
      id: "ai_retention",
      name: "Damar AI · Upsell & Renewal Strategist",
      roleTitle: "Agen 5 — Konversi Trial, Renewal & Upsell Sovereign",
      mission:
        "Memantau tenant Trial yang akan berakhir, mendeteksi peluang upsell Starter→Pro→Enterprise→Sovereign, dan menjaga Net Revenue Retention >115%.",
      tone: "konsultatif_b2b",
      isActive: true,
      autoReplyEnabled: true,
      responseSlaSeconds: 6,
      handledCount: 53,
      conversionRatePct: 41.8,
      systemPrompt:
        "Soroti modul eksklusif yang relevan (QR FIFO di Pro, 4 Agen AI di Enterprise, HRD/PSAK/5-Agen Marketing di Sovereign).",
    },
  ];
}

export function normalizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

export function buildWhatsappDeepLink(whatsapp: string, message: string): string {
  const normalized = normalizeWhatsappNumber(whatsapp);
  const encoded = encodeURIComponent(message);
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function qualifyWebsiteLead(input: {
  fullName: string;
  companyName: string;
  interestedEdition: EditionId;
  teamSize?: string;
  industry?: string;
  city?: string;
  notes?: string;
}): {
  aiScore: number;
  aiRecommendedEdition: EditionId;
  estimatedAnnualValueIdr: number;
  aiWelcomeReply: string;
  qualificationReason: string;
} {
  const notesLower = (input.notes || "").toLowerCase();
  const teamLower = (input.teamSize || "").toLowerCase();
  let score = 62;
  let recommended: EditionId = input.interestedEdition || "pro";

  if (
    notesLower.includes("psak") ||
    notesLower.includes("hrd") ||
    notesLower.includes("payroll") ||
    notesLower.includes("cabang") ||
    notesLower.includes("korporat") ||
    notesLower.includes("sovereign") ||
    notesLower.includes("holding") ||
    teamLower.includes("50") ||
    teamLower.includes("100") ||
    teamLower.includes(">")
  ) {
    recommended = "sovereign";
    score += 26;
  } else if (
    notesLower.includes("ai") ||
    notesLower.includes("enterprise") ||
    notesLower.includes("otomasi") ||
    notesLower.includes("omnichannel") ||
    teamLower.includes("20") ||
    teamLower.includes("15")
  ) {
    if (recommended === "starter" || recommended === "pro") recommended = "enterprise";
    score += 18;
  } else if (
    notesLower.includes("qr") ||
    notesLower.includes("fifo") ||
    notesLower.includes("stok") ||
    notesLower.includes("kasir") ||
    notesLower.includes("pro")
  ) {
    if (recommended === "starter") recommended = "pro";
    score += 14;
  }

  if (input.interestedEdition === "sovereign") score += 12;
  else if (input.interestedEdition === "enterprise") score += 9;
  else if (input.interestedEdition === "pro") score += 6;

  if (input.companyName && input.companyName.trim().length > 3) score += 5;
  if (input.notes && input.notes.trim().length > 15) score += 5;
  const aiScore = Math.min(99, Math.max(45, score));

  const spec = PUBLISHER_EDITIONS[recommended];
  const estimatedAnnualValueIdr = spec.annualPriceIdr;

  const priceLabel =
    spec.monthlyPriceIdr === 0
      ? "Gratis Selamanya (Rp 0)"
      : `Rp ${spec.monthlyPriceIdr.toLocaleString("id-ID")}/bulan (atau Rp ${spec.annualPriceIdr.toLocaleString("id-ID")}/tahun)`;

  const aiWelcomeReply = [
    `Halo Bapak/Ibu ${input.fullName} dari ${input.companyName}! Terima kasih telah mendaftar di ekosistem WACRM Commercial OS v5.3.`,
    `Tim Multi-Agent AI WACRM Publisher HQ telah memverifikasi pendaftaran Anda (Skor Prioritas BANT: ${aiScore}/100) dan merekomendasikan edisi **${spec.name}** (${priceLabel}).`,
    recommended === "sovereign"
      ? `Edisi Sovereign Corporate mencakup seluruh modul korporat: Akuntansi PSAK/SPT, HRD & Payroll CRUD+Print, ERP Multi-Cabang, serta Strategi Marketing Enterprise 5-Agen AI.`
      : recommended === "enterprise"
        ? `Edisi Enterprise AI Suite sudah dilengkapi 4 Agen AI Otomatis, Omnichannel WhatsApp CRM, POS & ERP Gudang, serta Pembukuan Operasional (Trial 7 Hari tersedia).`
        : recommended === "pro"
          ? `Edisi Growth Pro dilengkapi Scanner QR Kamera Belakang FIFO, POS Thermal & COD, serta 2 Agen AI Penjualan (Trial 14 Hari tersedia).`
          : `Edisi Starter UMKM Gratis Selamanya langsung aktif dengan Omnichannel CRM, Kasir POS COD, dan ERP Gudang dasar.`,
    `Tim & Agen AI Follow-Up kami siap mendampingi aktivasi ruang kerja, pemasangan Installer Windows/Android, dan onboarding tim Anda sekarang.`,
  ].join("\n\n");

  const qualificationReason = `Skor ${aiScore}/100 · Target ${spec.name} · Estimasi ACV Rp ${estimatedAnnualValueIdr.toLocaleString("id-ID")}/thn`;

  return {
    aiScore,
    aiRecommendedEdition: recommended,
    estimatedAnnualValueIdr,
    aiWelcomeReply,
    qualificationReason,
  };
}

export function buildFollowUpScript(
  lead: Pick<
    PublisherWebsiteLead,
    "fullName" | "companyName" | "aiRecommendedEdition" | "registrationCode" | "city"
  >,
  stage: "H+0" | "H+1" | "H+3" | "H+7",
): string {
  const spec = PUBLISHER_EDITIONS[lead.aiRecommendedEdition];
  if (stage === "H+0") {
    return `Halo Bapak/Ibu ${lead.fullName} (${lead.companyName}) 👋\n\nSaya Nadia dari *WACRM Publisher HQ* (Ref: ${lead.registrationCode}). Pendaftaran Anda sudah kami terima secara otomatis!\n\nUntuk kebutuhan ${lead.companyName}, kami siapkan paket *${spec.name}* beserta panduan instalasi cepat (Web, Windows Desktop & Android APK v5.3.1).\n\nApakah Bapak/Ibu berkenan kami bantu aktivasi ruang kerja hari ini?`;
  }
  if (stage === "H+1") {
    return `Selamat pagi Bapak/Ibu ${lead.fullName} 🙏\n\nFollow-up H+1 dari *Raka AI — WACRM Enterprise Team* untuk ${lead.companyName} (${lead.city}).\n\nApakah sudah sempat mencoba fitur *POS + ERP FIFO QR* dan *AI Sales 24/7* kami? Jika ada kendala setup produk, printer thermal, atau migrasi data, tim Technical Onboarding kami siap bantu 15 menit via WA/Zoom hari ini.`;
  }
  if (stage === "H+3") {
    return `Halo Bapak/Ibu ${lead.fullName} 👋\n\nKami melihat ${lead.companyName} cocok mengoptimalkan omzet dengan *WACRM ${spec.name}* (estimasi hemat waktu admin >20 jam/minggu & stok FIFO rapi otomatis).\n\nKhusus pendaftaran minggu ini (Ref: ${lead.registrationCode}), tersedia *prioritas setup katalog + bonus pendampingan onboarding* bila aktivasi lisensi tahunan. Boleh kami kirimkan proposal resmi & faktur penawaran?`;
  }
  return `Halo Bapak/Ibu ${lead.fullName},\n\nIni pengingat ramah dari *WACRM Publisher HQ* terkait pendaftaran ${lead.companyName} (${lead.registrationCode}). Slot onboarding prioritas bulan ini masih kami tahan untuk perusahaan Anda. Balas pesan ini dengan *"LANJUT"* bila ingin kami terbitkan License Key aktif atau jadwalkan demo singkat bersama tim Anda.`;
}

export function generateMultiAgentChatReply(
  userMessage: string,
  context?: { prospectName?: string; companyName?: string },
): {
  agentId: PublisherAiAgentId;
  agentName: string;
  intent: string;
  reply: string;
  suggestedEdition: EditionId | null;
  quickReplies: string[];
} {
  const q = userMessage.toLowerCase();
  const greeting = context?.prospectName ? `Halo Bapak/Ibu ${context.prospectName}, ` : "Halo! ";

  if (
    q.includes("kamera") ||
    q.includes("mikrofon") ||
    q.includes("izin") ||
    q.includes("install") ||
    q.includes("apk") ||
    q.includes("windows") ||
    q.includes("printer") ||
    q.includes("lisensi") ||
    q.includes("license")
  ) {
    return {
      agentId: "ai_onboarding",
      agentName: "Sinta AI · Technical Onboarding Engineer",
      intent: "technical_onboarding",
      reply: `${greeting}untuk kemudahan instalasi tanpa kendala izin perangkat, WACRM v5.3.1 menyediakan **Bundle Offline Installer Resmi** untuk Windows 10/11 (otomatis mengaktifkan izin Kamera, Mikrofon & Notifikasi tanpa mencari ikon gembok) serta **Android Native APK v5.3.1** (otomatis meminta izin Kamera QR, Mikrofon AI & Printer Bluetooth/USB OTG saat pertama dibuka).\n\nSilakan isi formulir pendaftaran di halaman ini agar tautan akses aplikasi & panduan aktivasi langsung diterbitkan oleh Publisher HQ.`,
      suggestedEdition: "pro",
      quickReplies: ["Daftar & Dapatkan Akses", "Lihat Harga 4 Edisi", "Jadwalkan Demo"],
    };
  }

  if (
    q.includes("harga") ||
    q.includes("biaya") ||
    q.includes("paket") ||
    q.includes("tarif") ||
    q.includes("gratis") ||
    q.includes("trial")
  ) {
    return {
      agentId: "ai_qualifier",
      agentName: "Bima AI · BANT Deal Qualifier",
      intent: "pricing_inquiry",
      reply: `${greeting}berikut struktur 4 Edisi Komersial WACRM v5.3:\n\n1. **Starter UMKM — Rp 0 (Gratis Selamanya):** CRM Omnichannel, Kasir POS COD & ERP Gudang dasar.\n2. **Growth Pro — Rp 249.000/bln (Trial 14 Hari):** Tambah QR Scanner Kamera Belakang FIFO, 2 Agen AI & Laporan Penjualan.\n3. **Enterprise AI Suite — Rp 699.000/bln (Trial 7 Hari):** 4 Agen AI Otomatis, Rekomendasi Produk AI, Auto-Bundling & Pembukuan Operasional.\n4. **Sovereign Corporate — Rp 1.950.000/bln:** Full Corporate OS — Akuntansi PSAK/SPT, HRD & Payroll CRUD+Print, ERP Multi-Cabang, & Strategi Marketing Enterprise 5-Agen AI.\n\nBerapa jumlah tim & cabang bisnis Anda saat ini? Saya bantu pilihkan edisi yang paling menguntungkan.`,
      suggestedEdition: "enterprise",
      quickReplies: ["Daftar Starter Gratis", "Coba Trial Growth Pro", "Konsultasi Sovereign"],
    };
  }

  if (
    q.includes("psak") ||
    q.includes("akuntansi") ||
    q.includes("hrd") ||
    q.includes("payroll") ||
    q.includes("gaji") ||
    q.includes("korporat") ||
    q.includes("sovereign") ||
    q.includes("strategi marketing")
  ) {
    return {
      agentId: "ai_retention",
      agentName: "Damar AI · Sovereign Strategist",
      intent: "sovereign_enterprise",
      reply: `${greeting}kebutuhan Akuntansi PSAK/SPT lengkap, HRD & Payroll (Slip Gaji, PPh 21 TER, BPJS, KPI, Cuti + Cetak), ERP Korporat, serta Strategi Marketing Enterprise 5-Agen AI tersedia lengkap di edisi **WACRM Sovereign Corporate (Rp 1,95jt/bln atau Rp 18,9jt/thn — Unlimited Kursi & Cabang)**.\n\nSilakan lengkapi formulir pendaftaran di bawah — permintaan Anda akan langsung masuk ke tim Enterprise Publisher HQ beserta proposal otomatis.`,
      suggestedEdition: "sovereign",
      quickReplies: ["Daftar Sovereign Corporate", "Hitung Estimasi ROI", "Minta Proposal Resmi"],
    };
  }

  if (
    q.includes("daftar") ||
    q.includes("coba") ||
    q.includes("demo") ||
    q.includes("mulai") ||
    q.includes("beli") ||
    q.includes("langganan")
  ) {
    return {
      agentId: "ai_followup",
      agentName: "Raka AI · Follow-Up & Closing Specialist",
      intent: "registration_intent",
      reply: `${greeting}luar biasa! Anda bisa langsung mengisi **Formulir Pendaftaran & Permintaan Akses Resmi** di bagian bawah halaman ini (hanya butuh 30 detik).\n\nBegitu Anda klik **Daftar & Aktivasi Sekarang**, data langsung diproses otomatis oleh **WACRM Publisher HQ** dan tautan akses aplikasi + nomor registrasi resmi Anda langsung terbuka di layar.`,
      suggestedEdition: "pro",
      quickReplies: ["Buka Formulir Pendaftaran", "Bandingkan Edisi", "Tanya Fitur AI"],
    };
  }

  return {
    agentId: "ai_concierge",
    agentName: "Nadia AI · Sales Concierge 24/7",
    intent: "general_inquiry",
    reply: `${greeting}selamat datang di **WACRM Commercial OS v5.3** — platform bisnis terpadu yang menyatukan **WhatsApp Omnichannel CRM, Kasir POS QR/COD, ERP Gudang FIFO, HRD Payroll, Akuntansi PSAK, dan Multi-Agent AI Penjualan** dalam satu ekosistem.\n\nAda yang ingin Anda tanyakan seputar fitur, harga 4 edisi (mulai Rp 0 Starter UMKM), atau langsung mendaftar untuk mendapatkan akses aplikasi?`,
    suggestedEdition: null,
    quickReplies: ["Lihat Harga 4 Edisi", "Fitur Sovereign Corporate", "Cara Daftar & Akses"],
  };
}
