import type { AppEditionId } from "@/lib/crm-types";
import { getEditionById } from "@/lib/editions";

export interface MultiAgentFaqAnswer {
  agentKey: string;
  agentName: string;
  agentBadge: string;
  category: string;
  questionMatched: string;
  answer: string;
  speechAnswer: string;
  relatedTab: string | null;
  relatedTabLabel: string | null;
  followUpQuestions: string[];
}

export interface PresetFaqItem {
  id: string;
  category: string;
  question: string;
  agentBadge: string;
}

export const PRESET_APP_FAQS: PresetFaqItem[] = [
  {
    id: "faq-umkm-free",
    category: "Edisi & Harga",
    question: "Apakah versi Starter UMKM benar-benar gratis selamanya? Apa saja fiturnya?",
    agentBadge: "Agen Lisensi AI",
  },
  {
    id: "faq-trial-rules",
    category: "Edisi & Harga",
    question: "Bagaimana aturan Trial 14 hari Growth Pro dan Trial 7 hari Enterprise AI Suite?",
    agentBadge: "Agen Lisensi AI",
  },
  {
    id: "faq-voice-247",
    category: "Asisten Suara AI",
    question: "Bagaimana cara mengaktifkan Asisten Pribadi & Pemandu Suara AI 24/7 agar keluar suara hangat?",
    agentBadge: "Agen Voice Companion",
  },
  {
    id: "faq-meta-wa",
    category: "WhatsApp & Kanal",
    question: "Bagaimana cara menghubungkan WhatsApp Cloud API Meta, Instagram, dan TikTok?",
    agentBadge: "Agen Omnichannel AI",
  },
  {
    id: "faq-pos-print",
    category: "POS & Cetak",
    question: "Printer apa saja yang didukung untuk cetak struk POS dan Label Pengiriman QR?",
    agentBadge: "Agen POS & Logistik",
  },
  {
    id: "faq-erp-acc",
    category: "ERP & Akuntansi",
    question: "Bagaimana cara kerja ERP Gudang dan Akuntansi Double-Entry otomatis di WACRM?",
    agentBadge: "Agen ERP & Keuangan",
  },
  {
    id: "faq-seo-growth",
    category: "SEO & Promosi",
    question: "Bagaimana Studio SEO AI membantu mendatangkan pembeli dari Google, TikTok & IG?",
    agentBadge: "Agen SEO Growth AI",
  },
  {
    id: "faq-security",
    category: "Keamanan & Android",
    question: "Apakah data toko aman? Bagaimana isolasi data dan aplikasi Android APK?",
    agentBadge: "Agen Fraud Sentinel",
  },
];

/**
 * Multi-Agent Contextual FAQ Orchestrator:
 * Routes every user question about WACRM to the right specialist AI agent and tailors
 * the explanation to the user's active edition and business profile.
 */
export function answerAppFaqWithMultiAgent(params: {
  question: string;
  editionId: AppEditionId;
  businessName?: string;
}): MultiAgentFaqAnswer {
  const q = params.question.trim();
  const lower = q.toLowerCase();
  const edition = getEditionById(params.editionId);
  const store = params.businessName?.trim() || "usaha Anda";

  // 1. Starter UMKM Gratis Selamanya
  if (/(starter|umkm|gratis|free|selamanya|tanpa\s*bayar|wajib\s*daftar)/i.test(lower)) {
    const answer = `Benar sekali! Edisi **Starter UMKM** di WACRM adalah **GRATIS SELAMANYA tanpa batas waktu trial** — Anda cukup mendaftar akun email agar data usaha ${store} tersimpan rapi.\n\n**Fitur aktif Starter UMKM:**\n• Hingga 2 agen CS bersamaan (Web & Android APK + Login Biometrik Sidik Jari/Face ID)\n• Maksimal 300 kontak CRM & 2 kanal (WhatsApp + 1 medsos)\n• **ERP & Gudang aktif penuh** (pantau stok real-time, mutasi barang keluar-masuk, peringatan stok menipis & Supplier)\n• Master Data lengkap (Produk, Supplier, Pelanggan, Kurir, Rekening)\n• POS Kasir, COD Marketplace + Lacak Pengiriman, Label QR & Cetak Universal (USB OTG, Bluetooth, WiFi, Inkjet/LaserJet, EDC)\n• 2 Agen AI Dasar (CS & Order Extractor) + Pusat FAQ AI & Komunitas.\n\nUntuk edisi lebih tinggi tersedia **Trial Gratis 14 hari Growth Pro** (QR Scanner Kamera Belakang FIFO + SEO AI) dan **Trial Gratis 7 hari Enterprise AI Suite** (Saran Produk Terlaris AI + Akuntansi Double-Entry + Suara 24/7). Saat ini workspace Anda berjalan di edisi **${edition.name}**.`;
    return {
      agentKey: "license_specialist",
      agentName: "Agen Lisensi & Edisi WACRM",
      agentBadge: "Agen Lisensi AI",
      category: "Edisi & Harga",
      questionMatched: q,
      answer,
      speechAnswer: `Benar sekali Kak! Edisi Starter UMKM di WACRM gratis selamanya tanpa batas trial setelah mendaftar. Anda langsung mendapatkan dua agen CS, tiga ratus kontak, dua kanal, ERP dan Gudang, Master Data, POS COD dan label QR, cetak universal, dan dua agen AI dasar.`,
      relatedTab: "editions",
      relatedTabLabel: "Buka Edisi & Lisensi",
      followUpQuestions: [
        "Bagaimana aturan Trial 14 hari Growth Pro dan Trial 7 hari Enterprise AI Suite?",
        "Bagaimana cara aktivasi License Key resmi?",
      ],
    };
  }

  // 2. Trial Rules (Growth Pro 14 hari, Enterprise 7 hari, Sovereign Key)
  if (/(trial|coba\s*gratis|14\s*hari|7\s*hari|growth\s*pro|enterprise|sovereign|license\s*key|lisensi|harga|biaya|upgrade)/i.test(lower)) {
    const answer = `Berikut aturan resmi Edisi & Masa Trial WACRM v5.0 terbaru:\n\n1. **Starter UMKM (Rp 0):** Gratis selamanya tanpa batas trial setelah mendaftar akun — sudah termasuk **POS COD, Label QR, ERP & Gudang, Master Data, serta Cetak Universal**.\n2. **Growth Pro (Rp 249.000/bln):** Tersedia **Trial Gratis 14 Hari**! Membuka 10 agen, 5.000 kontak, 5 kanal, 6 Agen AI, Auto-Reply 24/7 Zero-Click, **QR Scanner Kamera Belakang FIFO Anti-Basi**, SEO Growth AI, Template AI, dan 100% White-Label.\n3. **Enterprise AI Suite (Rp 699.000/bln):** Tersedia **Trial Gratis 7 Hari**! Membuka seluruh 9 Agen AI, **Multi-Agent AI Saran Produk Paling Laku**, Pemandu Suara AI 24/7, Akuntansi Double-Entry, Fraud Sentinel & Self-Healing, serta Analitik SWOT.\n4. **Sovereign Corporate (Rp 1.950.000/bln):** Khusus License Key resmi (\`WACRM-SOV-...\`) untuk **Menu Eksklusif Tren Minat Pembeli & Forecasting 90 Hari**, Custom Domain, Branded Android APK, dan Dedicated DB SLA.\n\nJika masa trial Growth Pro atau Enterprise selesai tanpa License Key, akun **tidak akan hilang** — otomatis kembali aman ke **Starter UMKM (Gratis Selamanya)**!`;
    return {
      agentKey: "license_specialist",
      agentName: "Agen Lisensi & Edisi WACRM",
      agentBadge: "Agen Lisensi AI",
      category: "Edisi & Harga",
      questionMatched: q,
      answer,
      speechAnswer: `Aturan baru WACRM sangat bersahabat Kak. Starter UMKM gratis selamanya. Growth Pro punya trial gratis empat belas hari, dan Enterprise AI Suite punya trial gratis tujuh hari. Kalau masa trial selesai tanpa License Key, data tetap aman dan akun otomatis kembali ke Starter UMKM gratis.`,
      relatedTab: "editions",
      relatedTabLabel: "Lihat Paket & Mulai Trial",
      followUpQuestions: [
        "Apakah versi Starter UMKM benar-benar gratis selamanya?",
        "Bagaimana cara mengaktifkan Asisten Suara AI 24/7?",
      ],
    };
  }

  // 3. Voice Companion 24/7 Activation & Troubleshooting
  if (/(suara|voice|asisten\s*pribadi|pemandu|mikrofon|mic|tidak\s*terdengar|bisu|audio|ngobrol|bicara)/i.test(lower)) {
    const answer = `Cara mudah mengaktifkan **Asisten Pribadi & Pemandu Suara AI 24/7** agar terdengar suara hangat & alami:\n\n1. Klik tombol **"🎙️ Asisten Suara AI"** di bagian **Header Atas** (atau tombol mengambang kanan bawah).\n2. Di bagian atas jendela Asisten, klik **"🔊 Tes & Aktifkan Suara Hangat"** — browser akan membunyikan lonceng lembut dan menyapa Anda dengan suara Bahasa Indonesia yang ramah.\n3. Pilih karakter suara favorit Anda (**Sari · Ramah & Hangat**, **Nadia · Tenang & Elegan**, atau **Bima · Ceria & Semangat**) dan pastikan volume perangkat aktif.\n4. Anda bisa menyapa santai seperti *"Selamat pagi"*, *"Apa kabar?"*, atau perintah bisnis penuh (seperti follow-up prospek, cek stok, cek laba rugi) pada **Enterprise AI Suite / Trial 7 Hari Enterprise / Sovereign**.\n\n*Tips:* Jika suara belum muncul di HP/Laptop, pastikan mode hening mati dan gunakan Chrome, Edge, Safari, atau Aplikasi Android WACRM.`;
    return {
      agentKey: "companion_guide",
      agentName: "Agen Pemandu Suara AI 24/7",
      agentBadge: "Agen Voice Companion",
      category: "Asisten Suara AI",
      questionMatched: q,
      answer,
      speechAnswer: `Mudah sekali Kak! Klik tombol Asisten Suara AI di bar atas atau pojok kanan bawah, lalu tekan tombol Tes dan Aktifkan Suara Hangat. Anda juga bisa memilih karakter suara Sari yang ramah, Nadia yang tenang, atau Bima yang ceria.`,
      relatedTab: "ai",
      relatedTabLabel: "Buka Pusat Multi-Agent AI",
      followUpQuestions: [
        "Bagaimana aturan Trial 7 hari Enterprise AI Suite?",
        "Apa saja 9 Agen AI Otonom di WACRM?",
      ],
    };
  }

  // 4. WhatsApp Cloud API Meta & Omnichannel
  if (/(whatsapp|wa\s*cloud|meta|waba|instagram|tiktok|facebook|youtube|kanal|channel|auto\s*reply|balas\s*otomatis)/i.test(lower)) {
    const answer = `Untuk menghubungkan **WhatsApp Cloud API Meta** & kanal media sosial di ${store}:\n\n1. Masuk ke menu **Kanal Omnichannel**.\n2. Untuk WhatsApp resmi Meta: masukkan **WABA ID**, **Phone Number ID**, dan **System User Access Token** (tersedia tombol *Panduan Suara AI* langkah demi langkah di dalam form!).\n3. Untuk Instagram, TikTok, Facebook & YouTube: cukup masukkan username akun bisnis Anda.\n4. Batas kanal sesuai edisi: **Starter UMKM (2 kanal)**, **Growth Pro (5 kanal + Auto-Reply 24/7 Zero-Click)**, **Enterprise (20 kanal)**, **Sovereign (Unlimited)**.`;
    return {
      agentKey: "cs_sales",
      agentName: "Agen Omnichannel & Meta WA",
      agentBadge: "Agen Omnichannel AI",
      category: "WhatsApp & Kanal",
      questionMatched: q,
      answer,
      speechAnswer: `Untuk menghubungkan WhatsApp Cloud API Meta, buka menu Kanal Omnichannel lalu isi WABA ID, Phone Number ID, dan System User Access Token. Starter UMKM mendukung dua kanal, sedangkan Growth Pro membuka lima kanal sekaligus Auto Reply dua puluh empat jam.`,
      relatedTab: "channels",
      relatedTabLabel: "Buka Kanal Omnichannel",
      followUpQuestions: [
        "Printer apa saja yang didukung untuk cetak struk dan Label QR?",
        "Bagaimana cara kerja Auto Follow-Up prospek?",
      ],
    };
  }

  // 4b. Biometric Login (Fingerprint / Face ID)
  if (/(biometrik|sidik\s*jari|fingerprint|face\s*id|wajah|face\s*recognition|passkey)/i.test(lower)) {
    const answer = `WACRM mendukung **Login Biometrik (Sidik Jari & Face Recognition)** setelah aplikasi diinstall di HP (Android APK / PWA Android & iPhone):\n\n1. Masuk 1 kali terlebih dahulu dengan email & kata sandi Anda.\n2. Buka menu **Pengaturan → Login Biometrik HP** lalu klik **Aktifkan Sidik Jari / Face ID**.\n3. Berikutnya di layar Sign-In, cukup 1 sentuhan tombol **Masuk Cepat Sidik Jari / Face ID** (menggunakan sensor native Android BiometricPrompt atau FIDO2/WebAuthn Passkey).\n\nKeamanan tetap terisolasi ketat per akun — biometrik hanya membuka akun milik Anda sendiri!`;
    return {
      agentKey: "fraud_sentinel",
      agentName: "Agen Keamanan Biometrik AI",
      agentBadge: "Agen Keamanan Biometrik",
      category: "Keamanan & Biometrik",
      questionMatched: q,
      answer,
      speechAnswer: `Anda bisa masuk dengan sidik jari atau pengenalan wajah setelah aplikasi terpasang di HP. Cukup login sekali, aktifkan di menu Pengaturan, lalu berikutnya masuk dengan satu sentuhan biometrik.`,
      relatedTab: "settings",
      relatedTabLabel: "Aktifkan Biometrik di Pengaturan",
      followUpQuestions: [
        "Bagaimana cara memakai kamera belakang HP sebagai QR Scanner FIFO?",
        "Bagaimana sistem pembayaran COD dan lacak pengiriman di WACRM?",
      ],
    };
  }

  // 4c. COD Marketplace & Live Shipment Tracking AI
  if (/(cod|bayar\s*di\s*tempat|lacak|tracking|pengiriman|shopee|tokopedia|toped)/i.test(lower)) {
    const answer = `WACRM menghadirkan **Sistem COD Marketplace (ala Shopee/Tokopedia) + Pelacakan Pengiriman & Notifikasi AI Otomatis** di menu **POS, COD & Lacak QR**:\n\n• **COD Risk Guard AI & Biaya Admin COD:** Menilai risiko retur (RTS) sebelum barang dikirim & menghitung biaya penanganan COD otomatis.\n• **Jejak Pengiriman Lengkap + Nama Pengirim & Nama Kurir:** Lacak tahap *Dikemas → Pickup → Transit Hub → Sedang Diantar oleh [Nama Kurir & No. HP] → Terkirim → Dana COD Cair*.\n• **Multi-Agen AI Auto-Notify Pembeli:** Setiap status diperbarui, AI langsung menyusun pesan WhatsApp sopan lengkap dengan lokasi paket, resi, **nama pengirim & kurir**, serta nominal COD yang harus disiapkan pembeli.\n• **1-Klik Dana COD Cair → Jurnal Akuntansi:** Otomatis memposting Kas Masuk & Biaya Admin COD ke buku besar.`;
    return {
      agentKey: "order_pos",
      agentName: "Agen Logistik COD & Pelacakan AI",
      agentBadge: "Agen COD & Logistik",
      category: "COD & Pengiriman",
      questionMatched: q,
      answer,
      speechAnswer: `Fitur COD di WACRM dilengkapi penilaian risiko retur, pelacakan pengiriman bertahap lengkap dengan nama pengirim dan nama kurir, serta pesan notifikasi WhatsApp otomatis dari Multi Agen AI untuk pembeli.`,
      relatedTab: "pos",
      relatedTabLabel: "Buka POS, COD & Lacak Kiriman",
      followUpQuestions: [
        "Apakah WACRM bisa mencetak ke semua jenis printer?",
        "Bagaimana cara memakai QR Scanner kamera belakang untuk gudang FIFO?",
      ],
    };
  }

  // 4d. Rear Camera QR Scanner & FIFO Anti-Basi
  if (/(scanner|scan\s*qr|kamera\s*belakang|fifo|fefo|basi|expired|kadaluwarsa|barang\s*masuk|opname)/i.test(lower)) {
    const answer = `Menu **QR Scanner & FIFO** (aktif di **Growth Pro, Enterprise AI Suite & Sovereign Corporate**) mengubah kamera belakang HP Anda menjadi scanner gudang profesional:\n\n1. **Barang Masuk Supplier + Batch FIFO & Expired:** Scan QR → stok Master Data & Gudang bertambah, batch FIFO tercatat, & jurnal Persediaan otomatis masuk ke Akuntansi.\n2. **Pengeluaran Barang FIFO/FEFO Anti-Basi:** Otomatis memprioritaskan barang masuk duluan / paling dekat tanggal kedaluwarsa keluar lebih dulu!\n3. **Fitur Istimewa — AI Flash Sale Anti-Basi:** Jika ada batch expired ≤30 hari, Multi-Agen AI langsung menyiapkan promo Flash Sale WhatsApp & Medsos agar modal terselamatkan.\n4. Mendukung pula **Kasir POS Kilat, Stock Opname, Scan Resi COD, & Cetak Stiker QR Batch**.`;
    return {
      agentKey: "procurement_forecast",
      agentName: "Agen Gudang FIFO & QR Scanner AI",
      agentBadge: "Agen Gudang FIFO",
      category: "QR Scanner & FIFO",
      questionMatched: q,
      answer,
      speechAnswer: `Fitur QR Scanner kamera belakang HP aktif mulai Growth Pro hingga Sovereign Corporate. Terhubung otomatis ke Master Data, gudang FIFO anti basi, kasir POS, dan jurnal akuntansi, lengkap dengan AI Flash Sale untuk barang mendekati kadaluwarsa.`,
      relatedTab: params.editionId === "starter" ? "editions" : "qr_scanner",
      relatedTabLabel: params.editionId === "starter" ? "Coba Trial 14 Hari Growth Pro" : "Buka QR Scanner & FIFO",
      followUpQuestions: [
        "Bagaimana cara AI memberi saran produk paling laku dan forecasting?",
        "Apakah aplikasi sudah mendukung semua jenis printer?",
      ],
    };
  }

  // 4e. AI Product Recommender & Sovereign Buyer Interest Forecasting
  if (/(forecast|forecasting|minat\s*pembeli|prediksi|produk\s*laku|produk\s*terlaris|saran\s*produk)/i.test(lower)) {
    const answer = `WACRM menyediakan 2 lapisan intelijen produk & forecasting di menu **Tren Minat & AI Produk**:\n\n• **Enterprise AI Suite (Trial 7h) & Sovereign Corporate:** Membuka **Multi-Agent AI Saran Produk Paling Laku** — menggabungkan data katalog, transaksi POS, percakapan pelanggan & tren pasar nasional untuk menyarankan produk hero, produk baru yang sedang naik daun, dan ide paket bundling!\n• **Eksklusif Sovereign Corporate:** Membuka **Menu Tren Minat Pembeli & Forecasting 30–90 Hari** — grafik proyeksi omzet 3 skenario (Konservatif/Realistis/Optimis), indeks minat per segmen & jam belanja, simulasi elastisitas diskon/COD, serta proyeksi belanja stok FIFO & modal kerja.`;
    return {
      agentKey: "procurement_forecast",
      agentName: "Agen Forecasting & Riset Pasar AI",
      agentBadge: "Agen Forecasting AI",
      category: "Forecasting & Tren Pasar",
      questionMatched: q,
      answer,
      speechAnswer: `Saran produk paling laku oleh Multi Agen AI aktif mulai edisi Enterprise AI Suite dan Sovereign Corporate. Sedangkan Menu Tren Minat Pembeli dan Forecasting permintaan sembilan puluh hari tersedia eksklusif pada Sovereign Corporate.`,
      relatedTab: params.editionId === "starter" || params.editionId === "pro" ? "editions" : "forecast",
      relatedTabLabel:
        params.editionId === "starter" || params.editionId === "pro"
          ? "Lihat Edisi Enterprise & Sovereign"
          : "Buka Tren Minat & Forecasting",
      followUpQuestions: [
        "Bagaimana aturan Trial 7 hari Enterprise AI Suite?",
        "Bagaimana cara aktivasi License Key Sovereign Corporate?",
      ],
    };
  }

  // 5. POS, QR Shipping Label, Couriers & Universal Printing
  if (/(printer|cetak|print|struk|thermal|bluetooth|usb|otg|inkjet|laserjet|edc|pos|kasir|label|qr|kurir|ongkir|resi)/i.test(lower)) {
    const answer = `WACRM mendukung **Studio Cetak Universal** di seluruh edisi (termasuk Starter UMKM Gratis!):\n\n• **Kabel USB-C / Micro-USB OTG** langsung ke printer Thermal 58mm/80mm & mesin EDC\n• **Bluetooth Thermal** (dari HP Android / APK WACRM)\n• **Printer Inkjet & LaserJet A4** (USB, WiFi, Apple AirPrint, Android Mopria)\n• **Ekspor & Share PDF** instan ke WhatsApp pelanggan.\n\nSetiap transaksi POS otomatis menghitung ongkir dari **Master Kurir Multi-Tarif**, menghasilkan **Invoice + QR Pelacakan**, dan pada edisi Growth Pro ke atas tampil **100% White-Label** dengan nama & logo ${store} tanpa watermark.`;
    return {
      agentKey: "order_pos",
      agentName: "Agen POS, QR & Logistik",
      agentBadge: "Agen POS & Logistik",
      category: "POS & Cetak",
      questionMatched: q,
      answer,
      speechAnswer: `Semua edisi termasuk Starter UMKM Gratis sudah mendukung cetak universal lewat kabel USB OTG, Bluetooth thermal, WiFi, Inkjet, LaserJet, mesin EDC, maupun PDF. Invoice dan label pengiriman QR langsung terbentuk otomatis.`,
      relatedTab: "pos",
      relatedTabLabel: "Buka POS & Label QR",
      followUpQuestions: [
        "Bagaimana cara mengatur nama toko & White-Label di struk?",
        "Bagaimana cara menambah kurir & ongkir di Master Data?",
      ],
    };
  }

  // 6. ERP Warehouse & Double-Entry Accounting
  if (/(erp|gudang|stok|supplier|akuntansi|jurnal|neraca|laba\s*rugi|hpp|double\s*entry|keuangan|kas)/i.test(lower)) {
    const answer = `Integrasi **ERP Gudang & Akuntansi Double-Entry** WACRM bekerja otomatis dari setiap pesanan:\n\n• **ERP & Gudang (AKTIF GRATIS SELAMANYA mulai Starter UMKM!):** Memantau stok real-time, kartu mutasi keluar-masuk, peringatan stok menipis, data Supplier, serta cetak laporan stok universal.\n• **QR Scanner Kamera Belakang + Gudang FIFO Anti-Basi (mulai Growth Pro / Trial 14 Hari):** Scan barang masuk/keluar langsung lewat kamera HP dan cegah barang basi dengan FIFO/FEFO otomatis.\n• **Akuntansi Double-Entry (mulai Enterprise AI Suite / Trial 7 Hari):** Setiap invoice lunas langsung membukukan Jurnal Kas/Bank, Pendapatan, HPP, dan Persediaan secara otomatis sehingga Laporan **Laba Rugi & Neraca selalu 100% Seimbang (Balanced)**.`;
    return {
      agentKey: "finance_auditor",
      agentName: "Agen ERP & Akuntansi PSAK",
      agentBadge: "Agen ERP & Keuangan",
      category: "ERP & Akuntansi",
      questionMatched: q,
      answer,
      speechAnswer: `Modul ERP dan Gudang sudah aktif gratis selamanya sejak edisi Starter UMKM untuk pantau stok, mutasi barang, dan supplier. Untuk QR Scanner kamera belakang FIFO tersedia mulai Growth Pro, dan Akuntansi Double Entry otomatis tersedia mulai Enterprise AI Suite.`,
      relatedTab: "erp",
      relatedTabLabel: "Buka ERP & Gudang",
      followUpQuestions: [
        "Bagaimana aturan Trial 14 hari Growth Pro dan Trial 7 hari Enterprise AI Suite?",
        "Bagaimana cara cek laporan laba rugi lewat suara?",
      ],
    };
  }

  // 7. SEO & Omnichannel Growth Studio
  if (/(seo|google|promosi|konten|reels|fyp|shorts|katalog\s*publik|laris|pembeli|traffic)/i.test(lower)) {
    const answer = `**Studio SEO & Omnichannel Growth AI** (tersedia mulai Growth Pro / Trial 14 Hari) membantu produk ${store} mudah ditemukan calon pembeli:\n\n• Cukup isi username akun **WhatsApp, Instagram, TikTok, YouTube & Facebook**.\n• AI otomatis membuat judul SEO Google, **JSON-LD Schema**, naskah TikTok FYP, caption IG Reels, deskripsi YouTube Shorts, dan tombol klik langsung ke WhatsApp Anda.\n• Dilengkapi audit skor SEO per produk dan halaman **Katalog Publik** siap diindeks mesin pencari.`;
    return {
      agentKey: "seo_growth",
      agentName: "Agen SEO & Omnichannel Growth AI",
      agentBadge: "Agen SEO Growth AI",
      category: "SEO & Promosi",
      questionMatched: q,
      answer,
      speechAnswer: `Studio SEO AI membantu produk Anda muncul di Google, TikTok, Instagram, Facebook, dan YouTube secara otomatis. Anda cukup memasukkan username media sosial usaha lalu AI menyiapkan naskah promo siap posting.`,
      relatedTab: params.editionId === "starter" ? "editions" : "seo_growth",
      relatedTabLabel: params.editionId === "starter" ? "Coba Gratis 14 Hari Growth Pro" : "Buka Studio SEO AI",
      followUpQuestions: [
        "Bagaimana aturan Trial 14 hari Growth Pro?",
        "Bagaimana cara menghubungkan kanal Instagram dan TikTok?",
      ],
    };
  }

  // 8. Security, Fraud Sentinel, Multi-Tenant Isolation & Android APK
  if (/(aman|keamanan|privasi|bocor|fraud|hacker|android|apk|hp|mobile|isolasi|database|neon|rls)/i.test(lower)) {
    const answer = `Keamanan data ${store} adalah prioritas utama WACRM:\n\n• **Isolasi Akun & Lisensi Ketat (v5 + PostgreSQL RLS):** Setiap akun memiliki cakupan lisensi & ruang kerja terpisah sehingga data maupun lisensi akun lain tidak pernah bocor.\n• **Fraud Sentinel & Self-Healing Guardian (Enterprise+):** Melindungi chat AI dari *prompt injection*, SQL/XSS injection, dan anomali transaksi.\n• **Web & Aplikasi Android APK:** Dapat diakses mulus dari browser HP/PC maupun Aplikasi Android native dengan dukungan printer Bluetooth/USB OTG & suara native.`;
    return {
      agentKey: "fraud_sentinel",
      agentName: "Agen Fraud Sentinel & Keamanan",
      agentBadge: "Agen Fraud Sentinel",
      category: "Keamanan & Android",
      questionMatched: q,
      answer,
      speechAnswer: `Data usaha Anda dilindungi isolasi akun ketat dan Row Level Security PostgreSQL. WACRM juga tersedia dalam versi Web dan aplikasi Android APK yang mendukung cetak thermal dan asisten suara.`,
      relatedTab: "settings",
      relatedTabLabel: "Buka Pengaturan & Keamanan",
      followUpQuestions: [
        "Apakah versi Starter UMKM benar-benar gratis selamanya?",
        "Bagaimana cara mengaktifkan Asisten Suara AI 24/7?",
      ],
    };
  }

  // 9. Smart Contextual Default Multi-Agent Answer
  const answer = `Terima kasih atas pertanyaannya tentang **"${q}"**! Saya telah merangkum panduan konteks untuk workspace **${store}** (Edisi aktif: **${edition.name}**):\n\n• Untuk mengelola chat pelanggan & balas AI → menu **Inbox AI**\n• Untuk transaksi kasir, ongkir & cetak Label QR → menu **POS & Label QR**\n• Untuk produk foto, supplier & kurir → menu **Master Data**\n• Untuk mencoba **Trial 14 Hari Growth Pro** (ERP + SEO AI) atau **Trial 7 Hari Enterprise** (9 Agen AI + Suara 24/7 + Akuntansi) → menu **Edisi & Lisensi**\n\nAnda juga bisa menanyakan topik spesifik seperti *cara hubungkan WhatsApp Meta*, *aktifkan suara AI*, atau *aturan printer thermal*, serta mengirim saran langsung di tab **Komentar & Testimoni**!`;
  return {
    agentKey: "knowledge_orchestrator",
    agentName: "Koordinator Multi-Agen FAQ AI",
    agentBadge: "Multi-Agen AI FAQ",
    category: "Panduan Umum",
    questionMatched: q,
    answer,
    speechAnswer: `Terima kasih atas pertanyaannya Kak! Di WACRM Anda bisa langsung membuka Inbox AI untuk chat pelanggan, POS untuk kasir dan label QR, Master Data untuk produk dan kurir, atau Edisi dan Lisensi jika ingin mencoba Trial Growth Pro atau Enterprise.`,
    relatedTab: "editions",
    relatedTabLabel: "Lihat Ringkasan Edisi & Fitur",
    followUpQuestions: [
      "Apakah versi Starter UMKM benar-benar gratis selamanya?",
      "Bagaimana cara mengaktifkan Asisten Suara AI 24/7?",
      "Bagaimana cara menghubungkan WhatsApp Cloud API Meta?",
    ],
  };
}
