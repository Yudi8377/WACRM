import type { Metadata } from "next";
import { MarketingLegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (UU PDP No. 27/2022) — WACRM Enterprise",
  description:
    "Kebijakan privasi, perlindungan data pribadi UU PDP, integrasi Meta WhatsApp Cloud API, dan prosedur penghapusan data PT WACRM Digital Nusantara.",
};

export default function MarketingPrivacyPage() {
  return (
    <MarketingLegalShell
      activePath="/privacy"
      badge="Kepatuhan UU No. 27 Tahun 2022 (UU PDP) · Meta API · Payment Gateway"
      title="Kebijakan Privasi & Perlindungan Data Pribadi"
      subtitle="Komitmen resmi PT WACRM Digital Nusantara terhadap keamanan, kerahasiaan, dan transparansi pemrosesan data pribadi serta data bisnis pelanggan."
      effectiveDate="26 November 2026"
    >
      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">1. Dasar Hukum &amp; Cakupan</h2>
        <p>
          Kebijakan ini disusun sesuai <strong>Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong> Republik Indonesia dan berlaku bagi seluruh pengunjung website, pendaftar konsultasi/demo, serta pengguna platform WACRM Commercial OS (Web, Desktop &amp; Android).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">2. Data yang Dikumpulkan</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Data Pendaftaran &amp; Prospek:</strong> Nama PIC, nama perusahaan/UMKM, email bisnis, nomor WhatsApp, kota, dan paket layanan yang diminati.</li>
          <li><strong>Data Operasional Aplikasi:</strong> Data kontak, chat omnichannel, transaksi POS, inventaris ERP FIFO, pembukuan PSAK, dan laporan riset pasar yang diinput oleh masing-masing tenant.</li>
          <li><strong>Data Keamanan &amp; Pembayaran:</strong> Log transaksi pembayaran melalui mitra Payment Gateway resmi (Midtrans / Xendit / Tripay) tanpa menyimpan data kartu kredit/PIN perbankan pelanggan di server kami.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">3. Keamanan &amp; Isolasi Multi-Tenant</h2>
        <p>
          Seluruh sistem menggunakan enkripsi TLS 1.3 saat transmisi, enkripsi AES-256-GCM untuk kredensial konektor, serta isolasi basis data PostgreSQL Row-Level Security (RLS). <strong>Kami tidak pernah menjual atau membagikan data pelanggan Anda kepada pihak ketiga mana pun.</strong>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">4. Hak Subjek Data &amp; Penghapusan Data (Meta &amp; Google Play Compliance)</h2>
        <p>
          Anda berhak meminta akses, koreksi, ekspor data mandiri (Excel/CSV/JSON/PDF), maupun penghapusan permanen data akun dan tenant dengan mengirim permintaan ke <strong>privacy@wacrm.id</strong> (diproses maksimal <strong>7 × 24 jam kerja</strong> setelah verifikasi identitas pemilik akun).
        </p>
      </section>
    </MarketingLegalShell>
  );
}
