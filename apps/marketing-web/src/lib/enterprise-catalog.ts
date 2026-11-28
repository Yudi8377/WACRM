/**
 * Pure-Free / 100% Original Enterprise Product Catalog & Configuration.
 * Zero copyrighted assets, zero third-party templates, and ZERO public exposure
 * of private client application URLs (delivered strictly post-registration via Publisher HQ).
 */

export const PUBLISHER_HQ_BASE_URL = (
  process.env.NEXT_PUBLIC_PUBLISHER_HQ_URL || "https://wacrm-publisher-hq.vercel.app"
).replace(/\/$/, "");

export type CommercialEditionId = "starter" | "pro" | "enterprise" | "sovereign";

export interface EditionSpec {
  id: CommercialEditionId;
  name: string;
  badge: string;
  tagline: string;
  monthlyPriceLabel: string;
  annualPriceLabel: string;
  monthlyValueIdr: number;
  highlighted?: boolean;
  metrics: {
    seats: string;
    branches: string;
    aiAgents: string;
  };
  features: string[];
  ctaLabel: string;
}

export const COMMERCIAL_EDITIONS: EditionSpec[] = [
  {
    id: "starter",
    name: "Starter UMKM",
    badge: "Gratis Selamanya",
    tagline: "Pondasi digital resmi untuk bisnis mikro & rintisan siap naik kelas.",
    monthlyPriceLabel: "Rp 0",
    annualPriceLabel: "Gratis Selamanya",
    monthlyValueIdr: 0,
    metrics: { seats: "2 User", branches: "1 Cabang", aiAgents: "2 Agen AI" },
    features: [
      "Inbox WhatsApp CRM & Katalog Produk",
      "Kasir POS Digital + Scan Barcode/QR",
      "Master Data Pelanggan & Laporan Harian",
      "Akses Web & Android APK v5.3.2",
    ],
    ctaLabel: "Daftar Gratis Sekarang",
  },
  {
    id: "pro",
    name: "Growth Pro",
    badge: "Paling Populer UKM",
    tagline: "Automasi penjualan omnichannel, stok multi-gudang & pembukuan rapi.",
    monthlyPriceLabel: "Rp 249.000",
    annualPriceLabel: "Rp 2.490.000 / tahun (hemat 2 bulan)",
    monthlyValueIdr: 249_000,
    metrics: { seats: "10 User", branches: "5 Cabang", aiAgents: "6 Agen AI" },
    features: [
      "Semua fitur Starter UMKM + Trial 14 Hari",
      "ERP Stok Multi-Cabang FIFO & Purchase Order",
      "Kasir POS Thermal Printer & Auto-Restock",
      "Akuntansi Double-Entry & Laba Rugi Instan",
      "Scanner QR Kamera Belakang FIFO & 2+ Agen AI",
    ],
    ctaLabel: "Ajukan Trial 14 Hari",
  },
  {
    id: "enterprise",
    name: "Enterprise AI",
    badge: "Pilihan Korporasi",
    tagline: "Eksekusi penuh CRM, ERP, Auto-Bundling AI, Pembukuan & Multi-Agent AI.",
    monthlyPriceLabel: "Rp 699.000",
    annualPriceLabel: "Rp 6.990.000 / tahun (hemat 2 bulan)",
    monthlyValueIdr: 699_000,
    highlighted: true,
    metrics: { seats: "50 User", branches: "25 Cabang", aiAgents: "11 Agen AI" },
    features: [
      "Semua fitur Growth Pro + Trial 7 Hari",
      "Multi-Agent AI (Sales, CS, Finance, CFO, Marketing)",
      "Akuntansi PSAK 72 Lengkap + Neraca + e-Faktur PPN 11%",
      "Rekomendasi Produk AI & Smart Auto-Bundling",
      "Offline Installer Windows/Android Auto-Fix Izin Kamera & Mic",
    ],
    ctaLabel: "Mulai Onboarding Enterprise",
  },
  {
    id: "sovereign",
    name: "Sovereign Corporate",
    badge: "Dedicated & White-Label",
    tagline: "Kedaulatan data penuh, HRD Payroll, multi-entitas holding & SLA 99,9%.",
    monthlyPriceLabel: "Rp 1.950.000",
    annualPriceLabel: "Rp 18.900.000 / tahun",
    monthlyValueIdr: 1_950_000,
    metrics: { seats: "Unlimited", branches: "Unlimited", aiAgents: "11 Agen + Custom" },
    features: [
      "Multi-Entitas Holding & Konsolidasi Keuangan Grup",
      "Dedicated Infrastructure, Custom Domain & White-Label",
      "Audit Keamanan AES-256-GCM, WebAuthn Biometrik & SSO",
      "Dedicated Solution Architect & On-Site Onboarding",
      "Integrasi API ERP/Bank/Marketplace Custom",
    ],
    ctaLabel: "Hubungi Divisi Sovereign",
  },
];

export const ENTERPRISE_PILLARS = [
  {
    code: "01",
    title: "Omnichannel WhatsApp CRM & 11 Agen AI",
    subtitle: "Respon < 5 detik, 24/7 tanpa lembur",
    description:
      "Tangani ribuan chat WhatsApp, kualifikasi prospek otomatis dengan skoring BANT, dan jalankan follow-up terstruktur H+0 hingga H+7 secara konsisten.",
    highlights: ["Multi-Agent AI Router", "Follow-Up Cadence Otomatis", "Lead Scoring Real-Time"],
  },
  {
    code: "02",
    title: "ERP Inventory, Gudang FIFO & Procurement",
    subtitle: "Anti-selisih stok antar cabang",
    description:
      "Pantau mutasi stok real-time lintas gudang, hitung HPP FIFO akurat, kelola Purchase Order vendor, serta terima peringatan restock otomatis berbasis tren penjualan.",
    highlights: ["FIFO & Batch Expiry", "Multi-Gudang & Transfer", "Smart Auto-Bundling"],
  },
  {
    code: "03",
    title: "Kasir POS & Hardware Permission Bridge",
    subtitle: "Kamera QR, mikrofon & printer siap pakai",
    description:
      "Transaksi kasir super cepat dengan pemindai QR/Barcode kamera, perintah suara AI, dan dukungan Offline Installer Windows & Android yang otomatis menuntaskan izin hardware.",
    highlights: ["QR/Barcode Scanner Cepat", "Voice AI Companion", "Auto-Fix Izin Kamera/Mic"],
  },
  {
    code: "04",
    title: "Akuntansi Korporat PSAK 72 & Pajak RI",
    subtitle: "Jurnal double-entry 100% balance otomatis",
    description:
      "Setiap invoice, pembayaran kasir, dan PO vendor otomatis menjurnal ke Buku Besar, Neraca Saldo, Laba Rugi, Neraca, Arus Kas, serta rekap PPN 11% & PPh.",
    highlights: ["PSAK 72 Revenue Recognition", "Neraca & Laba Rugi Real-Time", "Siap Audit & Cetak A4"],
  },
  {
    code: "05",
    title: "HRD, Absensi, RBAC & Payroll Otomatis",
    subtitle: "Kontrol akses ketat per jabatan",
    description:
      "Atur hak akses granular per modul, hitung gaji pokok, tunjangan, komisi penjualan, PPh 21, dan cetak slip gaji resmi korporasi dalam satu klik.",
    highlights: ["RBAC Granular Multi-Role", "Kalkulasi Payroll & Komisi", "Cetak Slip Gaji Resmi"],
  },
  {
    code: "06",
    title: "Keamanan Enterprise & Kedaulatan Data",
    subtitle: "Standar produksi perbankan & korporat",
    description:
      "Enkripsi kredensial AES-256-GCM, validasi HMAC webhook, WebAuthn biometrik, HSTS, dan arsitektur isolasi data antara website publik, aplikasi klien, dan Publisher HQ.",
    highlights: ["AES-256-GCM & HSTS", "Akses Privat Pasca-Registrasi", "Audit Log Lengkap"],
  },
];

export const INDUSTRY_SOLUTIONS = [
  {
    sector: "Distribusi & Grosir FMCG",
    pain: "Order WhatsApp menumpuk, stok antar gudang sering bentrok, piutang toko telat ditagih.",
    outcome: "Order WA langsung jadi Invoice ERP + potong stok FIFO + pengingat jatuh tempo otomatis.",
    kpi: "3,4x lebih cepat memproses PO harian",
  },
  {
    sector: "Retail Multi-Cabang & F&B",
    pain: "Kasir terpisah dari pembukuan, sulit memantau margin bersih per gerai setiap hari.",
    outcome: "POS kasir menyatu dengan Laba Rugi & Neraca real-time per cabang plus analisa produk terlaris.",
    kpi: "Hemat 42 jam rekap bulanan per cabang",
  },
  {
    sector: "Klinik, Jasa & B2B Korporat",
    pain: "Prospek masuk di luar jam kerja lepas ke kompetitor karena admin lambat membalas.",
    outcome: "Multi-Agent AI menjawab dalam hitungan detik, menjadwalkan demo, dan melacak SLA tim sales.",
    kpi: "+68% konversi prospek menjadi transaksi",
  },
  {
    sector: "Holding & Manufaktur Skala Besar",
    pain: "Setiap anak perusahaan memakai software berbeda sehingga laporan konsolidasi butuh berminggu-minggu.",
    outcome: "Edisi Sovereign menyatukan multi-entitas, payroll, pengadaan, dan konsolidasi PSAK dalam satu kokpit.",
    kpi: "Tutup buku bulanan selesai di H+2",
  },
];

export const ENTERPRISE_FAQS = [
  {
    q: "Mengapa tautan aplikasi tidak dipasang terbuka di website ini?",
    a: "Untuk menjaga keamanan, kualitas onboarding, serta mencegah akses acak yang tidak terverifikasi, akses privat aplikasi hanya diberikan secara eksklusif setelah calon pengguna mengisi formulir pendaftaran resmi. Setelah mendaftar, sistem Multi-Agent AI kami langsung menyiapkan akses privat sekaligus mengarahkan proses onboarding ke Portal Penerbit resmi.",
  },
  {
    q: "Apakah aplikasi bisa berjalan online untuk banyak karyawan dan cabang di kota berbeda?",
    a: "Ya. WACRM beroperasi dengan arsitektur Cloud HTTPS global (dilindungi TLS/CDN setara Cloudflare) sehingga seluruh tim cabang, kasir, gudang, dan direksi dapat mengakses data real-time dari Windows, macOS, maupun Android kapan pun dan di mana pun.",
  },
  {
    q: "Bagaimana dengan kendala izin kamera, mikrofon, dan perangkat keras di Windows atau Android?",
    a: "WACRM v5.3.1 dilengkapi Go-Commercial Offline Installer untuk Windows & Android APK Native yang secara otomatis mengonfigurasi kebijakan izin kamera (QR/Barcode scanner), mikrofon (Voice AI), USB/Serial printer thermal, serta Permissions-Policy browser sehingga langsung berfungsi tanpa konfigurasi rumit.",
  },
  {
    q: "Apakah benar tersedia Edisi Starter UMKM Gratis Selamanya?",
    a: "Benar. UMKM rintisan dapat memulai secara gratis selamanya pada Edisi Starter (2 user, 1 cabang, 2 Agen AI) dan melakukan upgrade mulus ke Growth Pro, Enterprise AI, atau Sovereign Corporate kapan pun bisnis berkembang tanpa kehilangan data historis.",
  },
  {
    q: "Apakah laporan keuangan WACRM sudah sesuai standar akuntansi di Indonesia?",
    a: "Ya. Mesin akuntansi WACRM menerapkan pencatatan double-entry seimbang (PSAK 72 Revenue Recognition), lengkap dengan Jurnal Umum, Buku Besar, Neraca Saldo, Laba Rugi, Neraca, Arus Kas, dan rekap PPN 11% siap cetak format A4.",
  },
];

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}
