import { answerAppFaqWithMultiAgent } from "@/lib/community-faq";
import { formatIdr, type AppEditionId, type StoreBusinessProfile } from "@/lib/crm-types";
import type { WorkspaceSnapshot } from "@/lib/workspace-adapter";

export type CompanionPendingAction =
  | {
      type: "followup_prospects";
      targets: Array<{ contactId: string; name: string; conversationId: string | null }>;
    }
  | {
      type: "remind_unpaid_invoices";
      orders: Array<{ orderId: string; invoiceNumber: string; customerName: string; totalAmount: number; conversationId: string | null }>;
    }
  | {
      type: "restock_low_products";
      products: Array<{ productId: string; sku: string; name: string; stockQty: number; minStock: number }>;
    }
  | {
      type: "run_guardian_audit";
    }
  | {
      type: "guide_meta_whatsapp";
      step: 1 | 2 | 3;
    };

export interface CompanionTurnInput {
  userText: string;
  activeTab: string;
  editionId?: AppEditionId;
  userName?: string;
  snapshot: WorkspaceSnapshot;
  storeProfile: StoreBusinessProfile;
  pendingAction: CompanionPendingAction | null;
  now?: Date;
}

function getIndonesianTimeOfDayGreeting(now: Date): {
  period: "pagi" | "siang" | "sore" | "malam";
  greeting: string;
  warmWish: string;
} {
  const hour = now.getHours();
  if (hour >= 4 && hour < 11) {
    return {
      period: "pagi",
      greeting: "Selamat pagi",
      warmWish: "Semoga pagi ini penuh energi positif dan rezeki yang lancar ya",
    };
  }
  if (hour >= 11 && hour < 15) {
    return {
      period: "siang",
      greeting: "Selamat siang",
      warmWish: "Semoga aktivitas siang ini berjalan mulus dan orderan terus mengalir ya",
    };
  }
  if (hour >= 15 && hour < 18) {
    return {
      period: "sore",
      greeting: "Selamat sore",
      warmWish: "Semoga sore ini tetap semangat dan semua pesanan terkirim rapi ya",
    };
  }
  return {
    period: "malam",
    greeting: "Selamat malam",
    warmWish: "Jangan lupa istirahat juga ya, biar saya bantu jaga operasional bisnis Anda",
  };
}

export interface CompanionTurnResult {
  replyText: string;
  speechText: string;
  shouldEndSession: boolean;
  nextPendingAction: CompanionPendingAction | null;
  executeAction: CompanionPendingAction | null;
  navigateToTab: string | null;
}

/**
 * 24/7 AI Personal Companion Guide Engine:
 * - Unbroken multi-turn conversational memory until user explicitly says "cukup" / "selesai" / "berhenti".
 * - Analyzes real live CRM, POS, ERP & Accounting data on demand.
 * - Proactively proposes actions ("Apakah prospek kita follow up hari ini?") and executes them upon confirmation!
 * - Guides users step-by-step (with voice & text) through complex forms like Meta WhatsApp Cloud API setup!
 */
export function processCompanionTurn(input: CompanionTurnInput): CompanionTurnResult {
  const raw = input.userText.trim();
  const lower = raw.toLowerCase();
  const storeName = input.storeProfile.businessName;
  const now = input.now ?? new Date();
  const tod = getIndonesianTimeOfDayGreeting(now);
  const caller = input.userName?.trim()
    ? `Kak ${input.userName.trim().split(/\s+/)[0]}`
    : "Kak";

  // 1. Check explicit end-of-session cue ("cukup", "sudah cukup", "selesai", "berhenti")
  if (/^(?:cukup|sudah\s*cukup|selesai|berhenti|stop|terima\s*kasih\s*cukup|udah\s*cukup)[\s!.,?]*$/i.test(raw)) {
    const text = `Baik ${caller}, sesi asisten suara saya jeda dulu ya. Saya selalu siaga 24 jam kapan saja ${caller} butuh teman ngobrol, analisis, atau bantuan bisnis untuk ${storeName}. Sehat dan sukses selalu ya!`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: true,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 1b. Warm Human Everyday Greetings & Small Talk (natural, friendly, empathetic!)
  if (/(ass?alamu\s*'?alaikum|salam\s*sejahtera)/i.test(lower)) {
    const text = `Waalaikumsalam warahmatullahi wabarakatuh, ${caller}! ${tod.greeting}. Alhamdulillah senang sekali bisa menyapa ${caller} hari ini. ${tod.warmWish}. Ada yang bisa saya bantu untuk ${storeName} sekarang, atau mau ngobrol santai dulu?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (
    /(apa\s*kabar|gimana\s*kabar|bagaimana\s*kabar|kabar\s*kamu|kamu\s*sehat|sehat\s*kan|how\s*are\s*you)/i.test(
      lower,
    )
  ) {
    const text = `Alhamdulillah kabar saya sangat baik dan penuh semangat hari ini, ${caller}! Terima kasih sudah menanyakan dengan ramah. Bagaimana kabar ${caller} sendiri dan tim di ${storeName}? Semoga sehat selalu ya. Kalau ada pekerjaan yang ingin saya ringankan hari ini, tinggal bilang saja ya!`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (
    /^(?:selamat\s*(?:pagi|siang|sore|malam)|pagi|siang|sore|malam|halo+|hai+|helo+|hello+|hey+|permisi|p)[!.,?\s]*(?:kak|ai|asisten|sari|nadia|bima|sayang|bro|sis|boss|bos)?[!.,?\s]*$/i.test(
      raw,
    )
  ) {
    const greetedPeriod = /pagi/i.test(lower)
      ? "Selamat pagi"
      : /siang/i.test(lower)
        ? "Selamat siang"
        : /sore/i.test(lower)
          ? "Selamat sore"
          : /malam/i.test(lower)
            ? "Selamat malam"
            : tod.greeting;
    const text = `${greetedPeriod}, ${caller}! Senang sekali mendengar suara Anda. ${tod.warmWish}. Saya siap menemani ${storeName} — mau saya cek prospek yang belum di-follow up, ringkasan omzet hari ini, atau kita ngobrol santai dulu?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (
    /(lagi\s*capek|capek\s*banget|lelah|pusing|stres|penat|ngantuk|jualan\s*sepi|sepi\s*banget|omzet\s*turun|lagi\s*sedih|curhat)/i.test(
      lower,
    )
  ) {
    const isQuietSales = /(sepi|omzet\s*turun)/i.test(lower);
    const text = isQuietSales
      ? `Saya mengerti sekali rasanya saat penjualan sedang agak melambat, ${caller}. Tidak apa-apa, naik-turun dalam usaha itu wajar dan ${caller} sudah luar biasa bertahan sejauh ini. Mau saya bantu cek prospek lama yang bisa kita sapa hangat ulang hari ini atau siapkan ide promo ringan untuk ${storeName}?`
      : `Wah, terdengar hari ini cukup padat ya ${caller}. Tarik napas pelan dulu dan sempatkan minum air hangat ya — kesehatan ${caller} jauh lebih penting daripada apa pun. Urusan cek stok, rekap tagihan, atau follow up pelanggan biar saya yang bantu ringankan pelan-pelan.`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (/(alhamdulillah\s*laris|lagi\s*ramai|orderan\s*banyak|senang\s*banget|alhamdulillah\s*lancar|syukur)/i.test(lower)) {
    const text = `Wah, ikut senang sekali mendengarnya, ${caller}! Alhamdulillah, kerja keras ${caller} dan tim ${storeName} benar-benar membuahkan hasil. Semoga berkah dan makin laris manis ya! Mau saya bantu cek stok gudang supaya tidak kehabisan barang terlaris?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (
    /^(?:terima\s*kasih|makasih|thanks|thank\s*you|sip|mantap|keren|bagus|hebat|oke\s*makasih|ok\s*makasih)/i.test(
      raw,
    ) ||
    (/\b(?:terima\s*kasih|makasih|thank\s*you)\b/i.test(lower) && !/\?/.test(raw))
  ) {
    const text = `Sama-sama, ${caller}! Senang sekali bisa membantu. Kalau nanti butuh apa-apa lagi — mau tanya bisnis, panduan aplikasi, atau sekadar menyapa — saya selalu ada di sini 24 jam ya!`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (/(siapa\s*kamu|kamu\s*siapa|nama\s*kamu|namamu\s*siapa|bisa\s*bantu\s*apa|lagi\s*apa)/i.test(lower)) {
    const text = `Saya Asisten Pribadi & Pemandu Suara AI 24/7 untuk ${storeName}, ${caller}! Saya dibuat agar bisa menjadi partner ngobrol yang ramah sekaligus membantu pekerjaan nyata: menyapa & follow up prospek, cek tagihan belum lunas, pantau stok ERP, baca laporan laba rugi, memandu setup WhatsApp Meta, sampai menjawab pertanyaan seputar aplikasi WACRM. Mau coba tanya sesuatu sekarang?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (/(jam\s*berapa|tanggal\s*berapa|hari\s*apa\s*sekarang|sekarang\s*jam)/i.test(lower)) {
    const dateStr = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const text = `Sekarang hari ${dateStr}, pukul ${timeStr}, ${caller}. ${tod.warmWish}. Ada agenda usaha yang ingin kita selesaikan sebelum jam berikutnya?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  if (/(motivasi|semangati|ide\s*promo|tips\s*laris|cara\s*naikkan\s*omzet|saran\s*bisnis)/i.test(lower)) {
    const topProduct = input.snapshot.products[0]?.name || "produk unggulan Anda";
    const text = `Semangat terus ya, ${caller}! Bisnis hebat selalu tumbuh dari pelayanan yang hangat dan konsisten. Untuk ${storeName} hari ini, saran praktis saya: buat paket bundling hemat untuk "${topProduct}", balas chat pelanggan di bawah 1 menit, dan kirim sapaan ramah ke pelanggan lama di jam istirahat (11.00–13.00) atau malam (19.00–20.30). Mau saya bantu cek prospek yang bisa disapa sekarang?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 2. Check confirmation / rejection for an active Pending Action (continuous memory!)
  const isYes =
    /^(?:ya|iya|yup|oke|ok|boleh|lanjut|lanjutkan|setuju|gas|eksekusi|kerjakan|follow\s*up(\s*sekarang|\s*hari\s*ini)?|kirim(\s*sekarang)?|jalankan|iya\s*tolong|ya\s*silakan)/i.test(
      lower,
    );
  const isNo = /^(?:tidak|nggak|enggak|jangan|nanti\s*saja|batal|skip|lewat)/i.test(lower);

  if (input.pendingAction && isYes) {
    const act = input.pendingAction;
    if (act.type === "guide_meta_whatsapp") {
      if (act.step === 1) {
        const text =
          "Langkah 2: Isi Phone Number ID. Di halaman WhatsApp > API Setup pada Meta for Developers, salin angka di bawah nomor pengirim bertuliskan 'Phone number ID' (biasanya 15 digit), lalu tempel ke kolom Phone Number ID. Jika sudah siap ke langkah terakhir yaitu System User Access Token, katakan 'lanjut'.";
        return {
          replyText: text,
          speechText: text,
          shouldEndSession: false,
          nextPendingAction: { type: "guide_meta_whatsapp", step: 2 },
          executeAction: null,
          navigateToTab: "channels",
        };
      }
      if (act.step === 2) {
        const text =
          "Langkah 3: Isi System User Access Token. Buka Meta Business Settings > Users > System Users > pilih Admin System User > klik Generate New Token dengan izin whatsapp_business_messaging dan whatsapp_business_management. Tempel token EAAG tersebut ke kolom terakhir lalu klik Validasi & Hubungkan. Token akan dienkripsi otomatis di server. Apakah ada kendala, atau katakan 'cukup' jika sudah selesai?";
        return {
          replyText: text,
          speechText: text,
          shouldEndSession: false,
          nextPendingAction: null,
          executeAction: null,
          navigateToTab: "channels",
        };
      }
    }

    if (act.type === "followup_prospects") {
      const names = act.targets.map((t) => t.name).join(", ");
      const text = `Siap! Saya langsung mengeksekusi pengiriman pesan follow-up personal hari ini untuk ${act.targets.length} prospek (${names}). Ada hal lain yang ingin kita cek atau tindak lanjuti? Jika sudah selesai, cukup ucapkan 'cukup'.`;
      return {
        replyText: text,
        speechText: text,
        shouldEndSession: false,
        nextPendingAction: null,
        executeAction: act,
        navigateToTab: null,
      };
    }

    if (act.type === "remind_unpaid_invoices") {
      const list = act.orders.map((o) => `${o.customerName} (${o.invoiceNumber})`).join(", ");
      const text = `Baik! Saya segera mengirimkan pengingat pembayaran & tautan QR resmi untuk ${act.orders.length} tagihan belum lunas: ${list}. Mau saya bantu cek stok gudang atau laba rugi juga?`;
      return {
        replyText: text,
        speechText: text,
        shouldEndSession: false,
        nextPendingAction: null,
        executeAction: act,
        navigateToTab: null,
      };
    }

    if (act.type === "restock_low_products") {
      const list = act.products.map((p) => `${p.name} (+20)`).join(", ");
      const text = `Siap! Saya langsung memproses penyesuaian restok darurat & mencatat mutasi gudang untuk: ${list}. Apakah ada perintah lain hari ini?`;
      return {
        replyText: text,
        speechText: text,
        shouldEndSession: false,
        nextPendingAction: null,
        executeAction: act,
        navigateToTab: null,
      };
    }

    if (act.type === "run_guardian_audit") {
      const text =
        "Siap! Saya menjalankan pemindaian Fraud Sentinel & Self-Healing Sistem sekarang juga. Hasil kesehatan sistem dan neraca akan segera diperbarui. Ada hal lain yang ingin diperiksa?";
      return {
        replyText: text,
        speechText: text,
        shouldEndSession: false,
        nextPendingAction: null,
        executeAction: act,
        navigateToTab: "ai",
      };
    }
  }

  if (input.pendingAction && isNo) {
    const text =
      "Baik, aksi tersebut saya tunda dulu. Ada hal lain yang ingin Anda tanyakan atau analisis sekarang? Anda bisa bilang 'cukup' kapan saja untuk mengakhiri sesi.";
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 3. Guided Setup: Meta WhatsApp Cloud API (WABA ID, Phone Number ID, System User Access Token)
  if (
    /(waba|phone\s*number\s*id|system\s*user|access\s*token|whatsapp\s*cloud|hubungkan\s*whatsapp|panduan\s*kanal|cara\s*isi\s*meta|bimbing.*whatsapp)/i.test(
      lower,
    )
  ) {
    const text = [
      "Baik, saya pandu langkah demi langkah untuk menghubungkan WhatsApp Cloud API (Meta):",
      "Langkah 1 — WABA ID (WhatsApp Business Account ID): Buka developers.facebook.com, pilih aplikasi bisnis Anda, masuk ke menu WhatsApp > API Setup, lalu salin angka 'WhatsApp Business Account ID' (15 digit) ke kolom pertama.",
      "Jika Langkah 1 sudah Anda pahami atau isi, katakan 'lanjut' supaya saya pandu ke Phone Number ID dan System User Access Token.",
    ].join(" ");
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: { type: "guide_meta_whatsapp", step: 1 },
      executeAction: null,
      navigateToTab: "channels",
    };
  }

  // 4. Prospect / Lead Follow-up Analysis (Exact User Scenario!)
  if (/(prospek|lead|follow\s*up|tindak\s*lanjut|belum\s*dibalas|pelanggan\s*potensial)/i.test(lower)) {
    const prospectContacts = input.snapshot.contacts.filter(
      (c) => c.lifecycleStage === "lead" || c.lifecycleStage === "prospect",
    );
    const openUnreadConvs = input.snapshot.conversations.filter(
      (c) => c.status !== "resolved" && (c.unreadCount > 0 || c.tags.includes("perlu-admin")),
    );

    const targetsMap = new Map<string, { contactId: string; name: string; conversationId: string | null }>();
    for (const c of prospectContacts) {
      const conv = input.snapshot.conversations.find((cv) => cv.contactId === c.id);
      targetsMap.set(c.id, {
        contactId: c.id,
        name: c.displayName,
        conversationId: conv?.id ?? null,
      });
    }
    for (const conv of openUnreadConvs) {
      if (!targetsMap.has(conv.contactId)) {
        targetsMap.set(conv.contactId, {
          contactId: conv.contactId,
          name: conv.contactName,
          conversationId: conv.id,
        });
      }
    }
    const targets = [...targetsMap.values()].slice(0, 6);

    if (targets.length === 0) {
      const text =
        "Kabar baik! Setelah saya analisis data CRM hari ini, seluruh prospek dan percakapan aktif sudah tertangani dengan baik. Mau saya cek tagihan belum lunas atau stok gudang sekarang?";
      return {
        replyText: text,
        speechText: text,
        shouldEndSession: false,
        nextPendingAction: null,
        executeAction: null,
        navigateToTab: null,
      };
    }

    const nameList = targets.map((t, i) => `${i + 1}. ${t.name}`).join(", ");
    const text = `Dari hasil analisis data CRM ${storeName} hari ini, ada ${targets.length} prospek/percakapan yang perlu kita follow up: ${nameList}. Apakah prospek tersebut mau kita follow up hari ini?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: { type: "followup_prospects", targets },
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 5. Unpaid Invoices & Payment Reminder Analysis
  if (/(belum\s*bayar|belum\s*lunas|piutang|tagihan|invoice\s*tertunda|unpaid)/i.test(lower)) {
    const unpaid = input.snapshot.orders.filter((o) => o.paymentStatus === "unpaid");
    if (unpaid.length === 0) {
      const text =
        "Mantap! Seluruh invoice POS saat ini sudah berstatus LUNAS dan tidak ada tagihan tertunggak. Ada hal lain yang ingin saya analisis?";
      return {
        replyText: text,
        speechText: text,
        shouldEndSession: false,
        nextPendingAction: null,
        executeAction: null,
        navigateToTab: null,
      };
    }
    const sum = unpaid.reduce((s, o) => s + o.totalAmount, 0);
    const details = unpaid.map((o) => `${o.customerName} (${o.invoiceNumber} senilai ${formatIdr(o.totalAmount)})`).join(", ");
    const text = `Saat ini ada ${unpaid.length} invoice yang belum dibayar dengan total ${formatIdr(sum)}, yaitu: ${details}. Apakah mau saya kirimkan pengingat pembayaran resmi ke mereka sekarang?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: {
        type: "remind_unpaid_invoices",
        orders: unpaid.map((o) => ({
          orderId: o.id,
          invoiceNumber: o.invoiceNumber,
          customerName: o.customerName,
          totalAmount: o.totalAmount,
          conversationId: o.conversationId,
        })),
      },
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 6. ERP Low Stock & Restock Forecast Analysis
  if (/(stok|gudang|habis|menipis|restok|barang|inventaris|erp)/i.test(lower)) {
    const lowStock = input.snapshot.products.filter((p) => p.isActive && p.stockQty <= p.minStock);
    const totalUnits = input.snapshot.products.reduce((s, p) => s + p.stockQty, 0);
    if (lowStock.length === 0) {
      const text = `Stok gudang ${storeName} dalam kondisi aman dengan ${input.snapshot.products.length} produk aktif dan total ${totalUnits} unit tersedia. Mau saya analisis omzet penjualan atau prospek hari ini?`;
      return {
        replyText: text,
        speechText: text,
        shouldEndSession: false,
        nextPendingAction: null,
        executeAction: null,
        navigateToTab: null,
      };
    }
    const list = lowStock.map((p) => `${p.name} sisa ${p.stockQty} ${p.unit} (minimum ${p.minStock})`).join(", ");
    const text = `Peringatan stok ERP: ada ${lowStock.length} barang yang menipis, yaitu ${list}. Apakah Anda ingin saya bantu tambahkan restok (+20 unit) dan catat mutasi gudangnya sekarang?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: {
        type: "restock_low_products",
        products: lowStock.map((p) => ({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          stockQty: p.stockQty,
          minStock: p.minStock,
        })),
      },
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 7. Financial / Revenue / Profit / Accounting Briefing
  if (/(omzet|omset|laba|profit|keuangan|\bkas\b|neraca|akuntansi|laporan|pendapatan)/i.test(lower)) {
    const r = input.snapshot.financialReport;
    const text = `Ringkasan keuangan ${storeName} saat ini: Total pendapatan ${formatIdr(r.totalRevenue)}, HPP ${formatIdr(r.totalCogs)}, beban operasional ${formatIdr(r.totalExpenses)}, sehingga laba bersih mencapai ${formatIdr(r.netProfit)} (margin ${r.profitMarginPct.toFixed(1)}%). Saldo kas & bank ${formatIdr(r.cashBalance)}, dan neraca dalam status ${r.isBalanced ? "100% SEIMBANG" : "perlu rekonsiliasi"}. Apakah Anda ingin saya buka halaman Akuntansi atau jalankan audit keamanan & neraca?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: r.isBalanced ? null : { type: "run_guardian_audit" },
      executeAction: null,
      navigateToTab: "accounting",
    };
  }

  // 8. Security / Fraud / System Health Audit
  if (/(keamanan|fraud|penipuan|audit|self\s*heal|kesehatan\s*sistem|pindai)/i.test(lower)) {
    const openInc = input.snapshot.aiIncidents.filter((i) => i.status === "open").length;
    const text = `Saat ini tercatat ${input.snapshot.aiIncidents.length} riwayat log keamanan (${openInc} insiden terbuka). Apakah Anda ingin saya jalankan pemindaian Fraud Sentinel dan Self-Healing sistem sekarang juga?`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: { type: "run_guardian_audit" },
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 8b. SEO & Omnichannel Product Growth AI
  if (/(seo|google|tiktok|instagram|youtube|facebook|katalog\s*publik|promosi\s*produk|optimasi\s*produk)/i.test(lower)) {
    const prodCount = input.snapshot.products.filter((p) => p.isActive).length;
    const text = `Agen SEO & Omnichannel Growth AI siap mengoptimalkan seluruh ${prodCount} produk aktif ${storeName}! Saya bisa mengaudit skor SEO produk, menyusun JSON-LD Google Search, serta menghasilkan naskah promo siap posting untuk WhatsApp Katalog, Instagram Reels, TikTok FYP, YouTube Shorts, dan Facebook. Saya buka menu SEO & Growth AI untuk Anda sekarang ya.`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: "seo_growth",
    };
  }

  // 8c. Universal Printing Guide (USB-C / Micro-USB OTG, Inkjet, LaserJet, Thermal, EDC, AirPrint)
  if (/(printer|cetak|usb|otg|inkjet|laserjet|edc|airprint|mopria|kabel)/i.test(lower)) {
    const text =
      "Sekarang di WACRM v4.0 Anda bisa mencetak Invoice Resmi dan Label Pengiriman QR melalui SEMUA jalur printer: Kabel Micro-USB / USB-C OTG langsung (Thermal, Label & EDC), Printer Inkjet & LaserJet (A4 via USB/WiFi/AirPrint iOS/Mopria Android), Printer Bluetooth Thermal, WiFi Jaringan, serta Share/Ekspor PDF siap cetak untuk HP iPhone & Android. Saya buka menu POS & Studio Cetak Universal ya.";
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: "pos",
    };
  }

  // 8d. Editions & Tiered Licensing
  if (/(edisi|paket\s*aplikasi|tier|upgrade|langganan|versi\s*aplikasi|sovereign|enterprise)/i.test(lower)) {
    const text =
      "WACRM kini hadir dalam 4 edisi berjenjang: Starter UMKM, Growth Pro, Enterprise AI Suite, dan Sovereign Corporate. Anda bisa membandingkan fitur lengkap dan mencoba pergantian edisi di menu Edisi & Paket. Saya buka sekarang ya.";
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: "editions",
    };
  }

  // 8e. AI Generator Balasan Cepat (/slash) & Template Resmi
  if (/(template|balasan\s*cepat|slash|quick\s*repl|generate\s*pesan|balas\s*otomatis)/i.test(lower)) {
    const text =
      "Di menu Balasan Cepat & Template Pesan, sekarang tersedia AI Generator yang otomatis membuat pintasan /slash dan template resmi siap approve Meta lengkap dengan pratinjau variabel. Saya bukakan sekarang.";
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: "templates",
    };
  }

  // 8f. Super Admin & License Management (Separated to Publisher HQ App)
  if (/(super\s*admin|license\s*key|lisensi|aktivasi\s*lisensi|publisher)/i.test(lower)) {
    const text =
      "Dashboard Super Admin adalah aplikasi terpisah milik perusahaan penerbit WACRM (WACRM Publisher HQ — berisi License Management, Master Data, ERP, CRM & Akuntansi penerbit). Untuk mengaktifkan atau memverifikasi License Key resmi workspace ini, saya arahkan ke menu Edisi & Lisensi sekarang.";
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: "editions",
    };
  }

  // 9. Navigation & Screen-Specific Companion Guide
  if (/(buka|pindah|ke\s*menu)\s*(master\s*data|pos|kasir|invoice|erp|gudang|akuntansi|inbox|kotak\s*masuk|kontak|kanal|pengaturan|ai|seo|edisi|paket|lisensi|template)/i.test(lower)) {
    let target = "inbox";
    let label = "Kotak Masuk AI";
    if (/master/i.test(lower)) {
      target = "master";
      label = "Master Data";
    } else if (/pos|kasir|invoice/i.test(lower)) {
      target = "pos";
      label = "POS & Label QR";
    } else if (/erp|gudang/i.test(lower)) {
      target = "erp";
      label = "ERP & Gudang";
    } else if (/akuntansi/i.test(lower)) {
      target = "accounting";
      label = "Akuntansi";
    } else if (/kontak/i.test(lower)) {
      target = "contacts";
      label = "Kontak CRM";
    } else if (/kanal/i.test(lower)) {
      target = "channels";
      label = "Kanal Omnichannel";
    } else if (/template/i.test(lower)) {
      target = "templates";
      label = "Balasan Cepat & Template AI";
    } else if (/pengaturan/i.test(lower)) {
      target = "settings";
      label = "Pengaturan Profil Toko";
    } else if (/seo/i.test(lower)) {
      target = "seo_growth";
      label = "SEO & Growth AI";
    } else if (/edisi|paket|lisensi/i.test(lower)) {
      target = "editions";
      label = "Edisi & Lisensi";
    } else if (/\bai\b/i.test(lower)) {
      target = "ai";
      label = "Pusat Multi-Agent AI";
    }
    const text = `Baik, saya sudah membuka menu ${label} untuk Anda. Silakan klik tombol 'Tambah Baru' jika ingin menambah data, atau tanyakan langsung jika butuh panduan pengisian form di halaman ini.`;
    return {
      replyText: text,
      speechText: text,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: target,
    };
  }

  // 10. Multi-Agent App FAQ fallback (handles any question about WACRM features, trials, voice, printing, etc.)
  if (/(cara|bagaimana|kenapa|mengapa|apa\s*itu|apakah|berapa|gratis|trial|fitur|bantuan|faq|tidak\s*bisa|bisa\s*tidak)/i.test(lower)) {
    const faq = answerAppFaqWithMultiAgent({
      question: raw,
      editionId: input.editionId ?? "starter",
      businessName: storeName,
    });
    return {
      replyText: `[${faq.agentBadge}] ${faq.answer}`,
      speechText: faq.speechAnswer,
      shouldEndSession: false,
      nextPendingAction: null,
      executeAction: null,
      navigateToTab: null,
    };
  }

  // 11. Warm Context-Aware Help for the Business Owner
  const screenTips: Record<string, string> = {
    channels:
      "Anda sedang di menu Kanal Omnichannel. Saya bisa memandu pengisian WABA ID, Phone Number ID, dan System User Access Token untuk Meta WhatsApp Cloud API langkah demi langkah.",
    pos: "Anda sedang di POS & Studio Cetak Universal. Cetak Invoice & Label QR melalui USB-C/Micro-USB OTG, Inkjet/LaserJet A4, Thermal, EDC, Bluetooth, WiFi, AirPrint, atau PDF.",
    master:
      "Anda sedang di Master Data. Anda dapat mengelola Master Barang, Supplier, Pelanggan, Kategori/Satuan, Kurir Ekspedisi, dan Rekening Pembayaran lengkap dengan tombol Tambah Baru, Ubah, Hapus, Next & Back.",
    erp: "Anda sedang di ERP & Gudang. Saya bisa memeriksa barang yang hampir habis dan membantu restok cepat.",
    accounting:
      "Anda sedang di Akuntansi. Saya bisa membacakan ringkasan laba rugi, kas, dan memeriksa keseimbangan neraca Anda.",
    seo_growth:
      "Anda sedang di SEO & Katalog Publik AI. Klik produk mana saja untuk audit skor SEO katalog & konten akuisisi klik-ke-WhatsApp.",
    templates:
      "Anda sedang di Balasan Cepat & Template Pesan. Gunakan AI Generator di bagian atas untuk menghasilkan pintasan /slash dan template resmi siap approve Meta dalam satu klik.",
    community:
      "Anda sedang di Pusat FAQ AI & Testimoni. Anda bisa menanyakan apa saja tentang aplikasi WACRM atau berbagi pengalaman dan testimoni berfoto untuk usaha Anda.",
    editions:
      "Anda sedang di Edisi & Lisensi. Starter UMKM gratis selamanya, Growth Pro punya Trial 14 Hari, Enterprise AI Suite punya Trial 7 Hari, dan Sovereign menggunakan License Key resmi.",
    settings:
      "Anda sedang di Pengaturan Usaha. Ubah Nama Toko, Alamat, No. Telp, dan Footer di sini agar seluruh Invoice, Label Pengiriman QR, dan Laporan tercetak atas nama usaha Anda sendiri.",
  };

  const tip =
    screenTips[input.activeTab] ||
    `${tod.greeting}, ${caller}! Saya Asisten Pribadi AI 24/7 untuk ${storeName}. Kita bisa ngobrol santai seperti "Apa kabar?", atau langsung tanya bisnis seperti "Cek prospek yang belum di-follow up", "Cek tagihan belum lunas", "Cek stok menipis", dan "Ringkasan laba hari ini".`;
  const text = `${tip} Silakan bicara atau ketik apa saja ya — saya menyimak dengan hangat sampai ${caller} bilang "cukup".`;
  return {
    replyText: text,
    speechText: text,
    shouldEndSession: false,
    nextPendingAction: null,
    executeAction: null,
    navigateToTab: null,
  };
}
