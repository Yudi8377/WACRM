import type { CommercialEditionId } from "@/lib/enterprise-catalog";

export type SplitNavSection = "index" | "about" | "pricing" | "register";

export interface SplitIndexShowcaseItem {
  num: string;
  id: string;
  title: string;
  category: string;
  year: string;
  image: string;
  headline: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  highlights: string[];
  actionLabel: string;
  actionTarget: SplitNavSection;
  suggestedEdition?: CommercialEditionId;
}

export const SPLIT_INDEX_ITEMS: SplitIndexShowcaseItem[] = [
  {
    num: "01",
    id: "crm-ai",
    title: "Omnichannel AI CRM",
    category: "11 Agen AI · 24/7",
    year: "2026",
    image: "/images/split-01-crm.jpg",
    headline: "Respon prospek WhatsApp dalam < 3 detik, 24 jam tanpa lembur.",
    summary:
      "Multi-Agent AI menangani chat masuk, melakukan skoring BANT otomatis, dan mengeksekusi follow-up terstruktur H+0 hingga H+7 langsung ke WhatsApp pelanggan.",
    metrics: [
      { label: "Respon AI", value: "3,2 dtk" },
      { label: "Konversi WA", value: "+68%" },
      { label: "Agen Otonom", value: "11 Agen" },
    ],
    highlights: ["Multi-Agent AI Router", "BANT Lead Scoring", "Cadence Follow-Up H+0..H+7"],
    actionLabel: "Ajukan Akses CRM AI",
    actionTarget: "register",
    suggestedEdition: "enterprise",
  },
  {
    num: "02",
    id: "erp-fifo",
    title: "ERP & Gudang FIFO",
    category: "Multi-Cabang · PO",
    year: "2026",
    image: "/images/split-02-erp.jpg",
    headline: "Zero selisih stok lintas gudang dengan valuasi HPP FIFO presisi.",
    summary:
      "Kendalikan mutasi stok antar cabang, Purchase Order vendor, tanggal kedaluwarsa batch, dan peringatan restock otomatis berbasis permintaan nyata.",
    metrics: [
      { label: "Akurasi Stok", value: "99,9%" },
      { label: "Proses PO", value: "3,4x Cepat" },
      { label: "Multi-Gudang", value: "25+ Lokasi" },
    ],
    highlights: ["Valuasi HPP FIFO", "Auto-Restock & PO Vendor", "Smart Auto-Bundling AI"],
    actionLabel: "Simulasi Efisiensi Cabang",
    actionTarget: "about",
    suggestedEdition: "pro",
  },
  {
    num: "03",
    id: "pos-qr",
    title: "Kasir POS & QR",
    category: "Kamera · Printer",
    year: "2026",
    image: "/images/split-05-pos.jpg",
    headline: "Kasir super cepat terintegrasi QR/Barcode kamera & thermal printer.",
    summary:
      "Pemindai QR/Barcode kamera belakang, Voice AI Companion, cetak struk thermal Bluetooth/USB-OTG, hingga pelabelan paket COD & QRIS menyatu dalam satu layar.",
    metrics: [
      { label: "Checkout", value: "< 5 dtk" },
      { label: "Printer", value: "BT / USB / WiFi" },
      { label: "Hardware Bridge", value: "Auto-Izin" },
    ],
    highlights: ["QR/Barcode Kamera FIFO", "Thermal ESC/POS 58/80mm", "Voice AI Companion"],
    actionLabel: "Daftar & Aktifkan POS",
    actionTarget: "register",
    suggestedEdition: "pro",
  },
  {
    num: "04",
    id: "psak-72",
    title: "Akuntansi PSAK 72",
    category: "Neraca · PPN 11%",
    year: "2026",
    image: "/images/split-03-finance.jpg",
    headline: "Jurnal double-entry otomatis 100% balance dari setiap transaksi.",
    summary:
      "Setiap transaksi kasir, invoice langganan, dan pembayaran vendor langsung membentuk Buku Besar, Neraca Saldo, Laba Rugi, Neraca, Arus Kas, dan rekap PPN 11% siap cetak A4.",
    metrics: [
      { label: "Neraca PSAK", value: "100% Balance" },
      { label: "Tutup Buku", value: "H+2 Bulan" },
      { label: "Pajak RI", value: "PPN 11% & PPh" },
    ],
    highlights: ["PSAK 72 Revenue Recognition", "Laporan Siap Audit A4", "Export CSV & e-Faktur"],
    actionLabel: "Bandingkan Edisi Keuangan",
    actionTarget: "pricing",
    suggestedEdition: "enterprise",
  },
  {
    num: "05",
    id: "hrd-payroll",
    title: "HRD & Payroll",
    category: "RBAC · Slip Gaji",
    year: "2026",
    image: "/images/split-06-hrd.jpg",
    headline: "Kontrol akses RBAC ketat & penggajian otomatis dalam satu klik.",
    summary:
      "Kelola data karyawan, absensi, cuti, KPI berbobot, PPh 21 TER, komisi sales, hingga cetak slip gaji resmi korporasi dengan hak akses per jabatan.",
    metrics: [
      { label: "Role RBAC", value: "7 Level" },
      { label: "Slip Gaji", value: "1-Klik A4" },
      { label: "Kepatuhan", value: "PPh 21 TER" },
    ],
    highlights: ["Matriks Izin Per Jabatan", "Payroll & Komisi Sales", "Register SPT PPh 21"],
    actionLabel: "Lihat Edisi Sovereign",
    actionTarget: "pricing",
    suggestedEdition: "sovereign",
  },
  {
    num: "06",
    id: "roi-simulator",
    title: "Kalkulator ROI",
    category: "Simulasi Efisiensi",
    year: "2026",
    image: "/images/split-04-register.jpg",
    headline: "Ukur dampak penghematan software & omzet terselamatkan secara nyata.",
    summary:
      "Hitung proyeksi efisiensi bulanan dan tahunan berdasarkan jumlah cabang, jumlah staf operasional, dan volume chat WhatsApp harian perusahaan Anda.",
    metrics: [
      { label: "Jam Terhemat", value: "100+ Jam/bln" },
      { label: "Estimasi ROI", value: "15x – 35x" },
      { label: "Konsolidasi", value: "6-in-1 App" },
    ],
    highlights: ["Kalkulasi Transparan", "Rekomendasi Edisi Instan", "Proyeksi Tahunan"],
    actionLabel: "Buka Simulasi ROI",
    actionTarget: "about",
  },
  {
    num: "07",
    id: "editions-pricing",
    title: "4 Edisi Lisensi",
    category: "Mulai Rp 0 UMKM",
    year: "2026",
    image: "/images/split-01-crm.jpg",
    headline: "Gratis selamanya untuk UMKM, tumbuh mulus hingga skala holding.",
    summary:
      "Empat jenjang komersial transparan tanpa biaya tersembunyi: Starter UMKM (Rp 0), Growth Pro (Rp 249rb), Enterprise AI (Rp 699rb), dan Sovereign Corporate (Rp 1,95jt).",
    metrics: [
      { label: "Starter UMKM", value: "Rp 0" },
      { label: "Growth Pro", value: "Rp 249rb" },
      { label: "Enterprise AI", value: "Rp 699rb" },
    ],
    highlights: ["Starter Gratis Selamanya", "Trial Pro 14 Hari", "Sovereign Unlimited"],
    actionLabel: "Buka Daftar Harga",
    actionTarget: "pricing",
  },
  {
    num: "08",
    id: "offline-installer",
    title: "Offline Installer",
    category: "Windows · Android",
    year: "2026",
    image: "/images/split-02-erp.jpg",
    headline: "Suite instalasi Windows 10/11 & Android APK v5.3.2 Signed Release.",
    summary:
      "Installer komersial v5.3.2 secara otomatis menuntaskan izin Kamera QR, Mikrofon AI, USB & Bluetooth pada Windows & Android (Signed Release v1+v2+v3).",
    metrics: [
      { label: "Android APK", value: "v5.3.2 Signed" },
      { label: "Windows Suite", value: "Auto-Izin" },
      { label: "Keamanan", value: "AES-256-GCM" },
    ],
    highlights: ["Android Signed v1/v2/v3", "Auto-Fix Kamera & Mic", "Akses Privat Terverifikasi"],
    actionLabel: "Daftar & Dapatkan Akses",
    actionTarget: "register",
    suggestedEdition: "enterprise",
  },
];
