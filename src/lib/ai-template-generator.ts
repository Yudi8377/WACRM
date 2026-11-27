import {
  formatIdr,
  type ChannelType,
  type ErpProductRecord,
  type StoreBusinessProfile,
  type TemplateCategory,
  type TemplateStatus,
} from "@/lib/crm-types";

export type TemplateTone = "ramah" | "profesional" | "empatik" | "persuasif" | "singkat";

export type TemplateLanguage = "id" | "en";

export type AiTemplateGenerateMode = "quick_reply" | "official_template" | "bundle";

export type CsScenarioId =
  | "greeting_catalog"
  | "order_confirmation"
  | "shipping_tracking"
  | "payment_reminder"
  | "complaint_resolution"
  | "out_of_stock_alt"
  | "vip_promo"
  | "otp_verification"
  | "operating_hours"
  | "review_request"
  | "custom";

export interface CsScenarioPreset {
  id: Exclude<CsScenarioId, "custom">;
  label: string;
  shortDesc: string;
  defaultShortcut: string;
  defaultCategory: string;
  officialCategory: TemplateCategory;
  samplePrompt: string;
}

export const CS_SCENARIO_PRESETS: CsScenarioPreset[] = [
  {
    id: "greeting_catalog",
    label: "Sapaan & Katalog",
    shortDesc: "Sambut pelanggan baru + daftar produk unggulan",
    defaultShortcut: "salam",
    defaultCategory: "sapaan",
    officialCategory: "service",
    samplePrompt: "Sambut pelanggan baru dengan ramah, sebutkan produk unggulan, dan tawarkan bantuan pemesanan.",
  },
  {
    id: "order_confirmation",
    label: "Konfirmasi Pesanan",
    shortDesc: "Konfirmasi nota, total bayar, & status proses",
    defaultShortcut: "konfirmasi",
    defaultCategory: "transaksi",
    officialCategory: "utility",
    samplePrompt: "Konfirmasi pesanan berhasil diterima beserta nomor invoice, total pembayaran, dan estimasi proses.",
  },
  {
    id: "shipping_tracking",
    label: "Update Resi & Kirim",
    shortDesc: "Infokan paket dikirim lengkap kurir & nomor resi",
    defaultShortcut: "resi",
    defaultCategory: "pengiriman",
    officialCategory: "utility",
    samplePrompt: "Beritahu pelanggan bahwa paket sudah diserahkan ke kurir beserta nomor resi dan estimasi tiba.",
  },
  {
    id: "payment_reminder",
    label: "Pengingat Bayar / QRIS",
    shortDesc: "Follow-up tagihan tertunda secara sopan",
    defaultShortcut: "bayar",
    defaultCategory: "penagihan",
    officialCategory: "utility",
    samplePrompt: "Ingatkan pelanggan dengan sopan untuk menyelesaikan pembayaran pesanan via QRIS atau transfer bank sebelum stok dilepas.",
  },
  {
    id: "complaint_resolution",
    label: "Penanganan Komplain",
    shortDesc: "Respon empatik untuk barang rusak/salah kirim",
    defaultShortcut: "komplain",
    defaultCategory: "keluhan",
    officialCategory: "service",
    samplePrompt: "Minta maaf secara tulus atas kendala pesanan, minta foto/video unboxing, dan pastikan garansi penggantian cepat.",
  },
  {
    id: "out_of_stock_alt",
    label: "Stok Habis & Alternatif",
    shortDesc: "Info restock + tawarkan produk pengganti",
    defaultShortcut: "stokhabis",
    defaultCategory: "katalog",
    officialCategory: "utility",
    samplePrompt: "Informasikan produk sedang kosong, beri estimasi restock, dan rekomendasikan alternatif produk tersedia.",
  },
  {
    id: "vip_promo",
    label: "Promo & Repeat Order",
    shortDesc: "Penawaran eksklusif pelanggan setia",
    defaultShortcut: "promo",
    defaultCategory: "promosi",
    officialCategory: "marketing",
    samplePrompt: "Tawarkan promo khusus pelanggan setia dengan kode voucher diskon terbatas dan ajakan order sekarang.",
  },
  {
    id: "otp_verification",
    label: "Verifikasi OTP & Keamanan",
    shortDesc: "Template resmi kode OTP / keamanan akun",
    defaultShortcut: "otp",
    defaultCategory: "keamanan",
    officialCategory: "authentication",
    samplePrompt: "Kirim kode verifikasi keamanan sekali pakai (OTP) beserta masa berlaku dan peringatan jangan bagikan kode.",
  },
  {
    id: "operating_hours",
    label: "Jam Kerja & Eskalasi CS",
    shortDesc: "Info jam operasional + eskalasi ke agen manusia",
    defaultShortcut: "jadwal",
    defaultCategory: "layanan",
    officialCategory: "service",
    samplePrompt: "Infokan jam operasional layanan pelanggan dan sampaikan pesan akan segera ditindaklanjuti agen spesialis kami.",
  },
  {
    id: "review_request",
    label: "Minta Ulasan & Testimoni",
    shortDesc: "Ajak pelanggan memberi rating bintang 5",
    defaultShortcut: "ulasan",
    defaultCategory: "retensi",
    officialCategory: "marketing",
    samplePrompt: "Ucapkan terima kasih setelah paket diterima dan minta ulasan jujur bintang 5 dengan bonus voucher next order.",
  },
];

export const TEMPLATE_TONE_META: Record<
  TemplateTone,
  { label: string; desc: string }
> = {
  ramah: { label: "Ramah & Hangat", desc: "Cocok untuk retail, F&B, dan UMKM" },
  profesional: { label: "Profesional & Formal", desc: "Cocok untuk B2B, korporat, dan distributor" },
  empatik: { label: "Empatik & Solutif", desc: "Cocok untuk penanganan komplain & retur" },
  persuasif: { label: "Persuasif & Closing", desc: "Cocok untuk promo, follow-up, & upsell" },
  singkat: { label: "Singkat & Cepat", desc: "Cocok untuk tim CS volume chat tinggi" },
};

export interface MetaComplianceCheck {
  score: number;
  status: "ready" | "warning" | "fix_needed";
  issues: string[];
  passedRules: string[];
}

export interface GeneratedQuickReplyDraft {
  id: string;
  shortcut: string;
  title: string;
  category: string;
  bodyText: string;
  tone: TemplateTone;
  language: TemplateLanguage;
  usageTip: string;
}

export interface GeneratedOfficialTemplateDraft {
  id: string;
  name: string;
  channel: ChannelType;
  category: TemplateCategory;
  language: TemplateLanguage;
  status: TemplateStatus;
  bodyText: string;
  variableSamples: Record<string, string>;
  compliance: MetaComplianceCheck;
  submissionNote: string;
}

export interface AiTemplateGenerationInput {
  mode: AiTemplateGenerateMode;
  prompt: string;
  scenarioId?: CsScenarioId;
  tone: TemplateTone;
  language: TemplateLanguage;
  channel: ChannelType;
  officialCategory?: TemplateCategory;
  storeProfile?: StoreBusinessProfile;
  products?: ErpProductRecord[];
  existingShortcuts?: string[];
  existingTemplateNames?: string[];
  variationSeed?: number;
}

export interface AiTemplateGenerationResult {
  detectedScenario: CsScenarioId;
  engineLabel: string;
  quickReplies: GeneratedQuickReplyDraft[];
  officialTemplates: GeneratedOfficialTemplateDraft[];
}

export function extractTemplateVariables(bodyText: string): number[] {
  const matches = bodyText.matchAll(/\{\{(\d+)\}\}/g);
  const nums = new Set<number>();
  for (const m of matches) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) nums.add(n);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

export function renderTemplatePreview(
  bodyText: string,
  variableSamples: Record<string, string>,
): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_match, num: string) => {
    return variableSamples[num] || `[Variabel ${num}]`;
  });
}

export function evaluateMetaTemplateCompliance(draft: {
  name: string;
  category: TemplateCategory;
  bodyText: string;
}): MetaComplianceCheck {
  const issues: string[] = [];
  const passedRules: string[] = [];
  let score = 100;

  if (/^[a-z0-9_]{2,80}$/.test(draft.name)) {
    passedRules.push("Format nama snake_case sesuai standar Meta/WhatsApp API");
  } else {
    issues.push("Nama template wajib huruf kecil, angka, dan underscore (snake_case).");
    score -= 25;
  }

  const trimmed = draft.bodyText.trim();
  if (trimmed.length >= 15 && trimmed.length <= 1024) {
    passedRules.push(`Panjang pesan optimal (${trimmed.length}/1024 karakter)`);
  } else if (trimmed.length > 1024) {
    issues.push("Melebihi batas maksimal 1.024 karakter template body WhatsApp.");
    score -= 25;
  } else {
    issues.push("Isi template terlalu pendek (minimal 15 karakter).");
    score -= 20;
  }

  if (/^\{\{\d+\}\}/.test(trimmed) || /\{\{\d+\}\}$/.test(trimmed)) {
    issues.push("Template tidak boleh diawali atau diakhiri langsung oleh variabel {{n}}.");
    score -= 20;
  } else {
    passedRules.push("Tidak diawali/diakhiri variabel mentah (lolos filter anti-spam Meta)");
  }

  const vars = extractTemplateVariables(trimmed);
  const isSequential = vars.every((v, idx) => v === idx + 1);
  if (vars.length === 0 || isSequential) {
    passedRules.push(
      vars.length > 0
        ? `Urutan variabel berurutan ({{1}}..{{${vars.length}}})`
        : "Struktur pesan statis valid",
    );
  } else {
    issues.push("Nomor variabel harus berurutan mulai dari {{1}}, {{2}}, dst tanpa melompat.");
    score -= 20;
  }

  const hasPromoWords = /(diskon|promo|voucher|cashback|flash sale|gratis ongkir|beli sekarang|discount|sale)/i.test(
    trimmed,
  );
  if (draft.category === "utility" && hasPromoWords) {
    issues.push(
      "Kategori 'utility' mengandung kata promosi — Meta berisiko memindahkan atau menolak ke 'marketing'.",
    );
    score -= 15;
  } else if (draft.category === "authentication" && !/\{\{1\}\}/.test(trimmed)) {
    issues.push("Template 'authentication' sebaiknya menyertakan variabel {{1}} untuk kode OTP.");
    score -= 15;
  } else {
    passedRules.push(`Kategori '${draft.category}' selaras dengan isi pesan`);
  }

  const finalScore = Math.max(20, Math.min(100, score));
  const status: MetaComplianceCheck["status"] =
    finalScore >= 85 && issues.length === 0
      ? "ready"
      : finalScore >= 65
        ? "warning"
        : "fix_needed";

  return { score: finalScore, status, issues, passedRules };
}

function sanitizeShortcut(raw: string, existing: string[] = []): string {
  const base =
    raw
      .toLowerCase()
      .replace(/^\/+/, "")
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "balasan";

  const taken = new Set(existing.map((s) => s.toLowerCase()));
  if (!taken.has(base)) return base;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base.slice(0, 28)}_${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 26)}_${Date.now().toString().slice(-4)}`;
}

function sanitizeTemplateName(raw: string, existing: string[] = []): string {
  const base =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64) || "template_layanan_cs";

  const taken = new Set(existing.map((s) => s.toLowerCase()));
  if (!taken.has(base)) return base;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base.slice(0, 58)}_v${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 56)}_${Date.now().toString().slice(-4)}`;
}

export function detectScenarioFromPrompt(
  prompt: string,
  explicitScenario?: CsScenarioId,
): CsScenarioId {
  if (explicitScenario && explicitScenario !== "custom") return explicitScenario;
  const p = prompt.toLowerCase();

  if (/(otp|verifikasi|kode\s*keamanan|login|pin|2fa|authentication)/i.test(p)) {
    return "otp_verification";
  }
  if (/(resi|kirim|kurir|paket|tracking|ekspedisi|jne|jnt|sicepat|dikirim|shipping)/i.test(p)) {
    return "shipping_tracking";
  }
  if (/(komplain|rusak|cacat|salah\s*kirim|retur|refund|tukar|garansi|kecewa|complaint)/i.test(p)) {
    return "complaint_resolution";
  }
  if (/(stok\s*habis|kosong|restock|alternatif|pengganti|out\s*of\s*stock)/i.test(p)) {
    return "out_of_stock_alt";
  }
  if (/(bayar|tagihan|jatuh\s*tempo|qris|transfer|belum\s*bayar|keranjang|reminder|payment)/i.test(p)) {
    return "payment_reminder";
  }
  if (/(konfirmasi|nota|invoice|pesanan\s*diterima|lunas|order\s*confirm)/i.test(p)) {
    return "order_confirmation";
  }
  if (/(promo|diskon|voucher|flash\s*sale|vip|repeat\s*order|cashback|penawaran)/i.test(p)) {
    return "vip_promo";
  }
  if (/(ulasan|review|bintang\s*5|testimoni|rating|feedback)/i.test(p)) {
    return "review_request";
  }
  if (/(jam\s*kerja|jam\s*operasional|tutup|buka|eskalasi|cs\s*manusia|libur|jadwal)/i.test(p)) {
    return "operating_hours";
  }
  if (/(salam|halo|sapaan|selamat\s*datang|katalog|daftar\s*harga|produk|welcome|greeting)/i.test(p)) {
    return "greeting_catalog";
  }
  return "custom";
}

function getToneSalutation(tone: TemplateTone, lang: TemplateLanguage): {
  greet: string;
  politeName: string;
  closing: string;
} {
  if (lang === "en") {
    switch (tone) {
      case "profesional":
        return { greet: "Dear", politeName: "Valued Customer", closing: "Best regards," };
      case "empatik":
        return { greet: "Hi", politeName: "there", closing: "We are here to help," };
      case "persuasif":
        return { greet: "Hello", politeName: "VIP Member", closing: "Don't miss out," };
      case "singkat":
        return { greet: "Hi", politeName: "Customer", closing: "Thanks," };
      default:
        return { greet: "Hello", politeName: "Friend", closing: "Warm regards," };
    }
  }

  switch (tone) {
    case "profesional":
      return {
        greet: "Yth. Bapak/Ibu",
        politeName: "Pelanggan",
        closing: "Hormat kami,",
      };
    case "empatik":
      return {
        greet: "Halo Kak",
        politeName: "Kakak",
        closing: "Dengan sepenuh hati membantu,",
      };
    case "persuasif":
      return {
        greet: "Halo Kak",
        politeName: "Pelanggan Spesial",
        closing: "Yuk amankan sekarang sebelum kehabisan!",
      };
    case "singkat":
      return {
        greet: "Halo Kak",
        politeName: "Kakak",
        closing: "Terima kasih,",
      };
    default:
      return {
        greet: "Halo Kak",
        politeName: "Kakak",
        closing: "Salam hangat,",
      };
  }
}

function buildScenarioDrafts(params: {
  scenario: CsScenarioId;
  prompt: string;
  tone: TemplateTone;
  language: TemplateLanguage;
  channel: ChannelType;
  officialCategory?: TemplateCategory;
  storeName: string;
  storePhone: string;
  topProductText: string;
  secondProductName: string;
  existingShortcuts: string[];
  existingTemplateNames: string[];
  seed: number;
}): {
  qr: GeneratedQuickReplyDraft;
  tpl: GeneratedOfficialTemplateDraft;
} {
  const {
    scenario,
    prompt,
    tone,
    language,
    channel,
    officialCategory,
    storeName,
    storePhone,
    topProductText,
    secondProductName,
    existingShortcuts,
    existingTemplateNames,
    seed,
  } = params;
  const { greet, closing } = getToneSalutation(tone, language);
  const altVariant = seed % 2 === 1;

  let shortcutBase = "balasan_ai";
  let qrCategory = "layanan";
  let qrTitle = "Balasan Cepat Layanan Pelanggan";
  let qrBody = "";

  let tplNameBase = "notifikasi_layanan_pelanggan";
  let tplCategory: TemplateCategory = officialCategory ?? "utility";
  let tplBody = "";
  let sampleVars: Record<string, string> = {};
  let usageTip = "Ketik pintasan /slash di kotak pesan Inbox untuk menyisipkan otomatis.";
  let submissionNote = "Siap diajukan ke Meta WhatsApp Business Manager / Kanal Resmi.";

  if (language === "en") {
    switch (scenario) {
      case "greeting_catalog":
        shortcutBase = "welcome";
        qrCategory = "sapaan";
        qrTitle = "Warm Welcome & Featured Catalog";
        qrBody = `${greet}! Welcome to ${storeName}. ✨\n${altVariant ? "Here are our best-selling items ready to ship today:" : "Thank you for reaching out! Our featured stock today:"}\n${topProductText}\n\nReply with the product name & quantity to get an instant invoice. ${closing} Tim ${storeName}`;
        tplNameBase = "welcome_catalog_official";
        tplCategory = officialCategory ?? "service";
        tplBody = `${greet} {{1}}, thank you for contacting ${storeName}. Our featured product {{2}} is available starting at {{3}}. Reply to this message anytime to place your order with our team.`;
        sampleVars = { "1": "Budi", "2": secondProductName, "3": "Rp 185.000" };
        break;
      case "order_confirmation":
        shortcutBase = "confirm";
        qrCategory = "transaksi";
        qrTitle = "Order Confirmation & Processing";
        qrBody = `${greet}, thank you for your order at ${storeName}! ✅\nYour order is confirmed and being prepared by our fulfillment team. We will share your tracking number once handed to the courier.\n${closing} ${storeName}`;
        tplNameBase = "order_confirmation_utility";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, your order #{{2}} at ${storeName} totaling {{3}} has been confirmed. Estimated dispatch time is {{4}}. Thank you for shopping with us.`;
        sampleVars = { "1": "Rina", "2": "INV-2026-0812", "3": "Rp 370.000", "4": "Today 16:00 WIB" };
        break;
      case "shipping_tracking":
        shortcutBase = "tracking";
        qrCategory = "pengiriman";
        qrTitle = "Shipping Dispatch & Tracking Number";
        qrBody = `${greet}, great news! 📦 Your ${storeName} order has been shipped.\nPlease share your invoice number if you need live tracking updates. ${closing} ${storeName}`;
        tplNameBase = "shipping_tracking_update";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, your order #{{2}} from ${storeName} has been shipped via {{3}} with tracking number {{4}}. Estimated delivery is 1-3 business days.`;
        sampleVars = { "1": "Rina", "2": "INV-2026-0812", "3": "JNE Reguler", "4": "JNE8829104421" };
        break;
      case "payment_reminder":
        shortcutBase = "payremind";
        qrCategory = "penagihan";
        qrTitle = "Friendly Payment Reminder";
        qrBody = `${greet}, gentle reminder regarding your pending order at ${storeName}. You can complete payment via QRIS or bank transfer so we can reserve your stock and ship today. Need help? Just reply here!`;
        tplNameBase = "payment_reminder_notice";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, your invoice #{{2}} for {{3}} at ${storeName} is awaiting payment before {{4}}. Please complete via QRIS or transfer so we can process your shipment immediately.`;
        sampleVars = { "1": "Andi", "2": "INV-2026-0815", "3": "Rp 245.000", "4": "20:00 WIB today" };
        break;
      case "complaint_resolution":
        shortcutBase = "supportfix";
        qrCategory = "keluhan";
        qrTitle = "Empathetic Complaint & Replacement";
        qrBody = `${greet}, we sincerely apologize for the inconvenience with your ${storeName} order. 🙏\nPlease send a photo/unboxing video along with your invoice number so our quality team can arrange an immediate replacement or refund within 24 hours.`;
        tplNameBase = "complaint_resolution_update";
        tplCategory = officialCategory ?? "service";
        tplBody = `${greet} {{1}}, we apologize for the issue with order #{{2}}. Ticket #{{3}} has been prioritized by ${storeName} Support with resolution: {{4}}. Please reply if you need further assistance.`;
        sampleVars = { "1": "Siti", "2": "INV-2026-0799", "3": "CS-409", "4": "Free Express Replacement" };
        break;
      case "out_of_stock_alt":
        shortcutBase = "restock";
        qrCategory = "katalog";
        qrTitle = "Out of Stock & Alternative Recommendation";
        qrBody = `${greet}, thank you for checking with ${storeName}. The requested item is currently sold out and scheduled to restock soon. Meanwhile, we recommend ${secondProductName} which is ready to ship today! Would you like to switch or join our restock alert?`;
        tplNameBase = "restock_alternative_notice";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, item {{2}} at ${storeName} is currently out of stock (ETA restock: {{3}}). As an immediate ready-stock alternative, we recommend {{4}}. Reply to reserve yours.`;
        sampleVars = { "1": "Dedi", "2": "Arabika Gayo 1Kg", "3": "3 Hari", "4": secondProductName };
        break;
      case "vip_promo":
        shortcutBase = "vippromo";
        qrCategory = "promosi";
        qrTitle = "VIP Customer Exclusive Offer";
        qrBody = `${greet}! 🎉 Special appreciation from ${storeName}: enjoy 15% OFF on your next order using code VIP15 (valid 48 hours). Ready stock today:\n${topProductText}\nReply ORDER to claim!`;
        tplNameBase = "vip_exclusive_promo";
        tplCategory = officialCategory ?? "marketing";
        tplBody = `${greet} {{1}}, as a valued ${storeName} VIP customer, enjoy {{2}} off with voucher code {{3}} valid until {{4}}. Reply to this chat to claim your order now.`;
        sampleVars = { "1": "Rina", "2": "15%", "3": "VIP15", "4": "30 Nov 2026" };
        break;
      case "otp_verification":
        shortcutBase = "otp";
        qrCategory = "keamanan";
        qrTitle = "Account Verification Code Guide";
        qrBody = `${greet}, for your security please never share your OTP code with anyone including staff claiming to represent ${storeName}. Need account help? Contact official WA ${storePhone}.`;
        tplNameBase = "account_otp_verification";
        tplCategory = officialCategory ?? "authentication";
        tplBody = `Your ${storeName} verification code is {{1}}. This code expires in {{2}} minutes. For your account security, never share this code with anyone.`;
        sampleVars = { "1": "482910", "2": "5" };
        break;
      case "operating_hours":
        shortcutBase = "hours";
        qrCategory = "layanan";
        qrTitle = "Operating Hours & Specialist Escalation";
        qrBody = `${greet}, thank you for contacting ${storeName}. Our live CS hours are Mon–Sat 08:00–20:00 WIB. Your message is logged and our specialist will respond promptly during active hours.`;
        tplNameBase = "customer_service_hours_info";
        tplCategory = officialCategory ?? "service";
        tplBody = `${greet} {{1}}, thank you for reaching ${storeName}. Your inquiry #{{2}} has been assigned to {{3}} and will be responded to within {{4}}.`;
        sampleVars = { "1": "Budi", "2": "TKT-221", "3": "Senior CS Team", "4": "15 minutes" };
        break;
      case "review_request":
        shortcutBase = "review";
        qrCategory = "retensi";
        qrTitle = "Post-Delivery 5-Star Review Request";
        qrBody = `${greet}, we hope you love your order from ${storeName}! ⭐ Could you spare 30 seconds to share your rating & feedback? As a thank-you, we will send a discount voucher for your next order!`;
        tplNameBase = "order_review_invitation";
        tplCategory = officialCategory ?? "marketing";
        tplBody = `${greet} {{1}}, thank you for receiving order #{{2}} from ${storeName}. Share your quick rating via {{3}} and unlock voucher {{4}} for your next purchase.`;
        sampleVars = { "1": "Siti", "2": "INV-2026-0812", "3": "katalog.toko/ulasan", "4": "TERIMAKASIH10" };
        break;
      default: {
        const cleanTopic = prompt.trim() || "Customer Service Inquiry";
        shortcutBase = cleanTopic.split(/\s+/).slice(0, 2).join("_");
        qrCategory = "kustom";
        qrTitle = `AI Response: ${cleanTopic.slice(0, 38)}`;
        qrBody = `${greet}! Terima kasih telah menghubungi ${storeName}. Regarding "${cleanTopic}", our team is ready to assist you promptly. Please share your order number or details so we can proceed right away. ${closing} ${storeName}`;
        tplNameBase = `cs_official_${cleanTopic.split(/\s+/).slice(0, 3).join("_")}`;
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, regarding your request on ${cleanTopic.slice(0, 60)} at ${storeName}, current status is {{2}} (Ref: {{3}}). Please reply if you need additional details.`;
        sampleVars = { "1": "Customer", "2": "In Progress", "3": "REF-2026-01" };
      }
    }
  } else {
    // BAHASA INDONESIA (Rich tone-aware CS generation)
    const formal = tone === "profesional";
    const singkat = tone === "singkat";

    switch (scenario) {
      case "greeting_catalog":
        shortcutBase = "salam";
        qrCategory = "sapaan";
        qrTitle = formal ? "Sapaan Resmi & Katalog Produk" : "Salam Hangat & Rekomendasi Produk";
        qrBody = singkat
          ? `${greet}! Selamat datang di ${storeName}. Stok unggulan hari ini:\n${topProductText}\nKetik nama produk + jumlah untuk langsung kami buatkan nota ya!`
          : `${greet}! Terima kasih telah menghubungi *${storeName}*. ${altVariant ? "Senang sekali dapat melayani kebutuhan Anda hari ini." : "Ada yang bisa kami bantu untuk kebutuhan hari ini?"}\n\nBerikut katalog unggulan kami yang *ready stock*:\n${topProductText}\n\nSilakan balas nama produk & jumlahnya untuk cek ongkir dan pembuatan invoice otomatis.\n${closing} Tim CS ${storeName}`;
        tplNameBase = "salam_katalog_resmi";
        tplCategory = officialCategory ?? "service";
        tplBody = `${greet} {{1}}, terima kasih telah menghubungi ${storeName}. Produk unggulan {{2}} tersedia mulai {{3}}. Silakan balas pesan ini kapan saja apabila membutuhkan penawaran atau pemesanan langsung.`;
        sampleVars = { "1": "Ibu Rina", "2": secondProductName, "3": "Rp 185.000" };
        usageTip = "Gunakan /salam saat pelanggan pertama kali menyapa atau menanyakan daftar produk.";
        break;

      case "order_confirmation":
        shortcutBase = "konfirmasi";
        qrCategory = "transaksi";
        qrTitle = "Konfirmasi Pesanan & Nota Resmi";
        qrBody = singkat
          ? `${greet}, pesanan di ${storeName} sudah kami terima & konfirmasi ✅. Sedang disiapkan untuk pengiriman hari ini. Terima kasih!`
          : `${greet}, terima kasih atas pesanan Anda di *${storeName}*! ✅\n\nPesanan Anda telah kami terima dan masuk antrean pengemasan gudang. Nota resmi & nomor resi pengiriman akan otomatis kami kirimkan setelah paket diserahkan ke kurir.\n\n${closing} Tim Operasional ${storeName}`;
        tplNameBase = "konfirmasi_pesanan_resmi";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, pesanan #{{2}} di ${storeName} sebesar {{3}} telah terkonfirmasi (${altVariant ? "status pembayaran lunas" : "sedang diproses"}). Estimasi pengiriman pada {{4}}. Terima kasih telah berbelanja bersama kami.`;
        sampleVars = {
          "1": "Bapak Budi",
          "2": "INV-2026-0812",
          "3": "Rp 370.000",
          "4": "Hari ini pukul 16.00 WIB",
        };
        usageTip = "Gunakan /konfirmasi segera setelah pembayaran QRIS/Transfer diverifikasi.";
        break;

      case "shipping_tracking":
        shortcutBase = "resi";
        qrCategory = "pengiriman";
        qrTitle = "Notifikasi Pengiriman & Nomor Resi";
        qrBody = singkat
          ? `${greet}, paket dari ${storeName} sudah dikirim ke kurir 📦. Nomor resi segera aktif maksimal 2 jam. Mohon tunggu ya!`
          : `${greet}, kabar baik! 📦 Pesanan Anda dari *${storeName}* sudah selesai dikemas dan diserahkan ke pihak ekspedisi.\n\nNomor resi dapat dilacak dalam 1–2 jam ke depan. Pastikan nomor WA aktif saat kurir menghubungi ya.\n${closing} Tim Pengiriman ${storeName}`;
        tplNameBase = "notifikasi_pengiriman_resi";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, pesanan #{{2}} dari ${storeName} telah dikirim menggunakan ekspedisi {{3}} dengan nomor resi {{4}}. Estimasi paket tiba dalam 1-3 hari kerja. Terima kasih.`;
        sampleVars = {
          "1": "Ibu Sari",
          "2": "INV-2026-0812",
          "3": "JNE Reguler",
          "4": "JNE8829104421",
        };
        usageTip = "Gunakan /resi setelah label QR pengiriman dicetak dari POS/ERP.";
        break;

      case "payment_reminder":
        shortcutBase = "bayar";
        qrCategory = "penagihan";
        qrTitle = "Pengingat Pembayaran QRIS / Transfer";
        qrBody = singkat
          ? `${greet}, izin mengingatkan pesanan di ${storeName} masih menunggu pembayaran. Bisa via QRIS/Transfer agar stok tetap aman & dikirim hari ini ya 🙏`
          : `${greet}, izin mengingatkan secara sopan bahwa pesanan Anda di *${storeName}* masih menunggu konfirmasi pembayaran.\n\nPembayaran dapat dilakukan melalui *QRIS Instan* atau *Transfer Bank* agar stok pesanan tetap kami kunci dan dapat dikirim pada jadwal hari ini. Jika butuh dibantu kirim ulang kode QRIS, silakan balas pesan ini ya.\n${closing} Tim Billing ${storeName}`;
        tplNameBase = "pengingat_pembayaran_pesanan";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, invoice #{{2}} di ${storeName} sebesar {{3}} masih menunggu pembayaran sebelum {{4}}. Mohon selesaikan melalui QRIS atau transfer bank agar pesanan dapat segera kami proses.`;
        sampleVars = {
          "1": "Bapak Andi",
          "2": "INV-2026-0815",
          "3": "Rp 245.000",
          "4": "hari ini pukul 20.00 WIB",
        };
        usageTip = "Cocok untuk follow-up H+3 jam atau H-1 jatuh tempo invoice.";
        break;

      case "complaint_resolution":
        shortcutBase = "komplain";
        qrCategory = "keluhan";
        qrTitle = "Penanganan Komplain & Garansi Tukar Baru";
        qrBody = `${greet}, kami mohon maaf sebesar-besarnya atas ketidaknyamanan yang dialami pada pesanan dari *${storeName}*. 🙏\n\nKami bertanggung jawab penuh untuk menyelesaikannya dengan cepat. Mohon bantu kirimkan:\n1. Nomor Invoice / Nama Pemesan\n2. Foto atau video unboxing singkat\n\nTim Garansi kami akan memprioritaskan penggantian unit baru atau pengembalian dana dalam 1×24 jam kerja.\n${closing} Tim Layanan Pelanggan ${storeName}`;
        tplNameBase = "resolusi_komplain_garansi";
        tplCategory = officialCategory ?? "service";
        tplBody = `${greet} {{1}}, kami mohon maaf atas kendala pada pesanan #{{2}}. Tiket layanan #{{3}} telah diprioritaskan tim ${storeName} dengan solusi: {{4}}. Balas pesan ini kapan saja bila ada pertanyaan lanjutan.`;
        sampleVars = {
          "1": "Ibu Dewi",
          "2": "INV-2026-0799",
          "3": "CS-2026-409",
          "4": "Pengiriman unit pengganti baru gratis ongkir",
        };
        usageTip = "Gunakan nada empatik ini untuk meredakan komplain dan menjaga rating toko.";
        break;

      case "out_of_stock_alt":
        shortcutBase = "stokhabis";
        qrCategory = "katalog";
        qrTitle = "Info Stok Kosong & Alternatif Ready Stock";
        qrBody = `${greet}, terima kasih sudah menanyakan produk di *${storeName}*. Saat ini varian yang dimaksud sedang *habis terjual* karena permintaan tinggi dan dijadwalkan restock dalam 2–3 hari.\n\nSebagai alternatif cepat yang kualitasnya setara dan *ready kirim hari ini*, kami rekomendasikan *${secondProductName}*. Apakah Kakak ingin beralih ke varian tersebut atau kami catat di daftar prioritas restock?`;
        tplNameBase = "notifikasi_restock_produk";
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, produk {{2}} di ${storeName} saat ini sedang kosong dengan estimasi restock pada {{3}}. Sebagai alternatif yang siap kirim hari ini, tersedia {{4}}. Silakan balas pesan ini untuk reservasi.`;
        sampleVars = {
          "1": "Bapak Dedi",
          "2": "Kopi Arabika Gayo 1Kg",
          "3": "Jumat, 29 Nov 2026",
          "4": secondProductName,
        };
        usageTip = "Membantu menyelamatkan konversi penjualan saat stok SKU tertentu habis.";
        break;

      case "vip_promo":
        shortcutBase = "promo";
        qrCategory = "promosi";
        qrTitle = "Penawaran Promo & Voucher Repeat Order";
        qrBody = `${greet}! 🎉 Spesial untuk pelanggan setia *${storeName}*, dapatkan *potongan harga eksklusif* untuk repeat order minggu ini!\n\nPilihan favorit siap kirim:\n${topProductText}\n\nGunakan kode *VIP15* saat order lewat chat ini (kuota terbatas 48 jam). ${closing}`;
        tplNameBase = "promo_pelanggan_vip";
        tplCategory = officialCategory ?? "marketing";
        tplBody = `${greet} {{1}}, spesial pelanggan setia ${storeName}! Nikmati penawaran {{2}} dengan kode voucher {{3}} berlaku hingga {{4}}. Balas pesan ini untuk klaim langsung bersama tim kami.`;
        sampleVars = {
          "1": "Ibu Rina",
          "2": "diskon 15% + gratis ongkir",
          "3": "VIP15",
          "4": "30 Nov 2026",
        };
        usageTip = "Gunakan kategori 'marketing' saat mengirim broadcast promo di luar jendela 24 jam WA.";
        break;

      case "otp_verification":
        shortcutBase = "otp";
        qrCategory = "keamanan";
        qrTitle = "Edukasi Keamanan OTP & Akun Resmi";
        qrBody = `${greet}, demi keamanan transaksi di *${storeName}*, mohon JANGAN PERNAH membagikan kode OTP, PIN, atau bukti transfer kepada pihak mana pun di luar nomor resmi kami (${storePhone}).`;
        tplNameBase = "kode_verifikasi_akun";
        tplCategory = officialCategory ?? "authentication";
        tplBody = `Kode verifikasi keamanan ${storeName} Anda adalah {{1}}. Kode ini berlaku selama {{2}} menit. Demi keamanan akun, jangan bagikan kode ini kepada siapa pun.`;
        sampleVars = { "1": "482910", "2": "5" };
        usageTip = "Template resmi kategori 'authentication' wajib jelas dan tanpa teks promosi.";
        break;

      case "operating_hours":
        shortcutBase = "jadwal";
        qrCategory = "layanan";
        qrTitle = "Jam Operasional & Eskalasi Agen CS";
        qrBody = `${greet}, terima kasih telah menghubungi *${storeName}*. Jam operasional tim CS aktif kami adalah *Senin–Sabtu pukul 08.00–20.00 WIB*.\n\nPesan Anda sudah kami catat dalam antrean prioritas dan akan segera ditangani oleh agen spesialis kami. ${closing} ${storeName}`;
        tplNameBase = "info_layanan_pelanggan";
        tplCategory = officialCategory ?? "service";
        tplBody = `${greet} {{1}}, terima kasih telah menghubungi ${storeName}. Pertanyaan Anda dengan tiket #{{2}} telah diteruskan ke {{3}} dan akan ditanggapi maksimal dalam {{4}}.`;
        sampleVars = {
          "1": "Bapak Hendra",
          "2": "TKT-2026-221",
          "3": "Tim Spesialis Layanan",
          "4": "15 menit pada jam operasional",
        };
        usageTip = "Ideal dipakai saat eskalasi ke supervisor atau pesan masuk di luar jam kerja.";
        break;

      case "review_request":
        shortcutBase = "ulasan";
        qrCategory = "retensi";
        qrTitle = "Permintaan Ulasan Bintang 5 & Bonus Voucher";
        qrBody = `${greet}, semoga pesanan dari *${storeName}* sudah diterima dengan baik dan memuaskan! ⭐\n\nJika berkenan, boleh bantu berikan ulasan jujur bintang 5 untuk membantu kami terus meningkatkan layanan? Sebagai tanda terima kasih, kami siapkan voucher diskon untuk order berikutnya ya!`;
        tplNameBase = "permintaan_ulasan_pesanan";
        tplCategory = officialCategory ?? "marketing";
        tplBody = `${greet} {{1}}, terima kasih telah berbelanja pesanan #{{2}} di ${storeName}. Bagikan pengalaman Anda melalui {{3}} dan dapatkan voucher apresiasi {{4}} untuk pemesanan berikutnya.`;
        sampleVars = {
          "1": "Ibu Nadia",
          "2": "INV-2026-0812",
          "3": "g.page/r/ulasan-kami",
          "4": "TERIMAKASIH10",
        };
        usageTip = "Kirim 1–2 hari setelah resi berstatus Delivered untuk meningkatkan repeat order.";
        break;

      default: {
        const cleanTopic = prompt.trim() || "Layanan Pelanggan";
        const words = cleanTopic
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !["buat", "buatkan", "tolong", "template", "balasan", "yang", "untuk", "dengan", "dari", "pada"].includes(w));
        shortcutBase = words.slice(0, 2).join("_") || "respon_ai";
        qrCategory = "kustom";
        qrTitle = `Respons CS: ${cleanTopic.slice(0, 42)}`;
        qrBody = singkat
          ? `${greet}! Terkait ${cleanTopic}, tim ${storeName} siap membantu segera. Mohon kirim detail/nomor pesanan agar langsung kami proses ya.`
          : `${greet}! Terima kasih telah menghubungi *${storeName}*.\n\nTerkait *${cleanTopic}*, tim layanan pelanggan kami siap membantu Anda dengan cepat dan tuntas. Mohon informasikan detail kebutuhan atau nomor invoice Anda agar segera kami tindak lanjuti.\n\n${closing} Tim CS ${storeName}`;
        tplNameBase = `cs_${words.slice(0, 3).join("_") || "notifikasi_resmi"}`;
        tplCategory = officialCategory ?? "utility";
        tplBody = `${greet} {{1}}, terkait informasi ${cleanTopic.slice(0, 65)} dari ${storeName}, saat ini berstatus {{2}} dengan referensi {{3}}. Silakan balas pesan ini apabila memerlukan bantuan lanjutan.`;
        sampleVars = {
          "1": "Pelanggan Yth.",
          "2": "Sedang Diproses",
          "3": "REF-2026-088",
        };
        usageTip = "Template dibuat khusus berdasarkan instruksi prompt kustom Anda.";
      }
    }
  }

  const shortcut = sanitizeShortcut(shortcutBase, existingShortcuts);
  const name = sanitizeTemplateName(tplNameBase, existingTemplateNames);
  const compliance = evaluateMetaTemplateCompliance({
    name,
    category: tplCategory,
    bodyText: tplBody,
  });

  if (compliance.issues.length > 0) {
    submissionNote = `Perhatikan ${compliance.issues.length} catatan Meta Compliance sebelum diajukan.`;
  } else {
    submissionNote = `Skor Meta Compliance ${compliance.score}/100 — siap disetujui untuk WhatsApp Official API & Omnichannel.`;
  }

  return {
    qr: {
      id: `ai-qr-${scenario}-${seed}`,
      shortcut,
      title: qrTitle,
      category: qrCategory,
      bodyText: qrBody,
      tone,
      language,
      usageTip,
    },
    tpl: {
      id: `ai-tpl-${scenario}-${seed}`,
      name,
      channel,
      category: tplCategory,
      language,
      status: compliance.status === "ready" ? "pending_approval" : "draft",
      bodyText: tplBody,
      variableSamples: sampleVars,
      compliance,
      submissionNote,
    },
  };
}

/**
 * Main AI Customer Service Template & Quick Reply Generator.
 * Synthesizes `/slash` Quick Replies and Meta-compliant Official Templates
 * grounded in real tenant store profile & active ERP catalog.
 */
export function generateAiCustomerServiceTemplates(
  input: AiTemplateGenerationInput,
): AiTemplateGenerationResult {
  const detectedScenario = detectScenarioFromPrompt(input.prompt, input.scenarioId);
  const storeName = input.storeProfile?.businessName?.trim() || "Toko Anda";
  const storePhone = input.storeProfile?.phone?.trim() || "+62-811-0000-0000";
  const activeProducts = (input.products ?? []).filter((p) => p.isActive && p.stockQty > 0);
  const topProducts = activeProducts.slice(0, 3);
  const topProductText =
    topProducts.length > 0
      ? topProducts
          .map((p) => `• ${p.name} — ${formatIdr(p.unitPrice)} (Stok: ${p.stockQty} ${p.unit})`)
          .join("\n")
      : "• Produk Unggulan Ready Stock — Mulai Rp 95.000\n• Paket Hemat Terlaris — Mulai Rp 185.000";
  const secondProductName =
    topProducts[1]?.name ?? topProducts[0]?.name ?? "Paket Unggulan Ready Stock";

  const seed = input.variationSeed ?? 0;
  const takenShortcuts = [...(input.existingShortcuts ?? [])];
  const takenTemplateNames = [...(input.existingTemplateNames ?? [])];

  if (input.mode === "bundle") {
    // Generate a smart 3-pack CS bundle centered on the detected scenario + 2 complementary CS flows
    const bundleScenarios: CsScenarioId[] =
      detectedScenario === "custom"
        ? ["custom", "order_confirmation", "shipping_tracking"]
        : [
            detectedScenario,
            detectedScenario === "greeting_catalog" ? "order_confirmation" : "greeting_catalog",
            detectedScenario === "shipping_tracking" ? "review_request" : "shipping_tracking",
          ];

    const quickReplies: GeneratedQuickReplyDraft[] = [];
    const officialTemplates: GeneratedOfficialTemplateDraft[] = [];

    for (let i = 0; i < bundleScenarios.length; i++) {
      const sc = bundleScenarios[i];
      const built = buildScenarioDrafts({
        scenario: sc,
        prompt: i === 0 ? input.prompt : "",
        tone: input.tone,
        language: input.language,
        channel: input.channel,
        officialCategory: i === 0 ? input.officialCategory : undefined,
        storeName,
        storePhone,
        topProductText,
        secondProductName,
        existingShortcuts: takenShortcuts,
        existingTemplateNames: takenTemplateNames,
        seed: seed + i,
      });
      takenShortcuts.push(built.qr.shortcut);
      takenTemplateNames.push(built.tpl.name);
      quickReplies.push(built.qr);
      officialTemplates.push(built.tpl);
    }

    return {
      detectedScenario,
      engineLabel: "WACRM CS Copywriter AI · Paket Lengkap (/slash + Template Resmi)",
      quickReplies,
      officialTemplates,
    };
  }

  const primary = buildScenarioDrafts({
    scenario: detectedScenario,
    prompt: input.prompt,
    tone: input.tone,
    language: input.language,
    channel: input.channel,
    officialCategory: input.officialCategory,
    storeName,
    storePhone,
    topProductText,
    secondProductName,
    existingShortcuts: takenShortcuts,
    existingTemplateNames: takenTemplateNames,
    seed,
  });

  if (input.mode === "quick_reply") {
    // Provide 2 fresh variations so CS can pick the best /slash phrasing!
    const alt = buildScenarioDrafts({
      scenario: detectedScenario,
      prompt: input.prompt,
      tone: input.tone === "singkat" ? "ramah" : "singkat",
      language: input.language,
      channel: input.channel,
      officialCategory: input.officialCategory,
      storeName,
      storePhone,
      topProductText,
      secondProductName,
      existingShortcuts: [...takenShortcuts, primary.qr.shortcut],
      existingTemplateNames: takenTemplateNames,
      seed: seed + 1,
    });

    return {
      detectedScenario,
      engineLabel: "WACRM CS Copywriter AI · Balasan Cepat /slash",
      quickReplies: [primary.qr, alt.qr],
      officialTemplates: [],
    };
  }

  // official_template mode
  return {
    detectedScenario,
    engineLabel: "WACRM CS Copywriter AI · Template Resmi Meta/Omnichannel",
    quickReplies: [],
    officialTemplates: [primary.tpl],
  };
}
