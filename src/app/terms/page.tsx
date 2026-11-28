import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan Layanan (Terms of Service) — WACRM Commercial OS",
  description:
    "Syarat dan ketentuan penggunaan platform WACRM Commercial OS, lisensi paket Starter UMKM hingga Sovereign Corporate, anti-spam WhatsApp, dan batas tanggung jawab.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      activePath="/terms"
      badge="Syarat & Ketentuan Resmi · SLA · Kepatuhan Bisnis"
      title="Syarat & Ketentuan Layanan (Terms of Service)"
      subtitle="Dengan mendaftar, mengakses, atau menggunakan WACRM Commercial OS pada versi Web, Desktop, maupun Android, Anda menyetujui ketentuan penggunaan berikut."
      effectiveDate="26 November 2026"
    >
      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-[#222222]">1. Definisi &amp; Ruang Lingkup Layanan</h2>
        <p>
          WACRM Commercial OS menyediakan perangkat lunak manajemen relasi pelanggan omnichannel (CRM), kasir POS QR/COD, gudang ERP FIFO, pembukuan akuntansi PSAK, HRD Payroll, strategi pemasaran AI, dan pelaporan riset pasar bagi pelaku UMKM hingga korporasi.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-[#222222]">2. Paket Layanan, Uji Coba &amp; Lisensi</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Starter UMKM (Gratis Selamanya):</strong> Tersedia gratis setelah registrasi akun resmi tanpa kewajiban kartu kredit, mengikuti batas kuota agen dan kontak pada katalog paket aktif.</li>
          <li><strong>Uji Coba Gratis (Trial):</strong> Growth Pro (14 hari) dan Enterprise AI Suite (7 hari) dapat dicoba satu kali per akun/tenant untuk evaluasi menyeluruh sebelum berlangganan.</li>
          <li><strong>Paket Berbayar &amp; License Key:</strong> Aktivasi paket Growth Pro, Enterprise AI Suite, dan Sovereign Corporate dilakukan melalui pembayaran terverifikasi (Transfer Bank / QRIS / Payment Gateway resmi) atau penerbitan License Key dari Publisher HQ. License Key bersifat eksklusif untuk satu organisasi/tenant dan dilarang diperjualbelikan ulang tanpa perjanjian mitra resmi.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-[#222222]">3. Kebijakan Penggunaan Wajar &amp; Anti-Spam WhatsApp</h2>
        <p>Pengguna dilarang keras menggunakan Platform untuk:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Mengirim pesan massal tanpa persetujuan penerima (*spam*), penipuan, judi daring, pinjaman ilegal, konten melanggar hukum RI, atau melanggar <em>WhatsApp Business Messaging Policy</em> dari Meta.</li>
          <li>Melakukan rekayasa balik (*reverse engineering*), pemindaian kerentanan tanpa izin tertulis, atau upaya melewati mekanisme lisensi dan pembatasan kuota.</li>
        </ul>
        <p>
          Pelanggaran berat atas kebijakan anti-spam atau hukum berlaku dapat mengakibatkan penangguhan akses akun sementara maupun permanen demi menjaga reputasi ekosistem layanan.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-[#222222]">4. Kepemilikan Data &amp; Hak Kekayaan Intelektual</h2>
        <p>
          Seluruh kode sumber, antarmuka, merek dagang, dan arsitektur WACRM Commercial OS merupakan kekayaan intelektual pengelola platform. Sebaliknya, <strong>100% data pelanggan, transaksi, produk, dan laporan keuangan yang Anda masukkan tetap menjadi milik penuh perusahaan Anda</strong> dan dapat diekspor kapan saja.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-[#222222]">5. Batasan Tanggung Jawab &amp; Kepatuhan Pajak/Akuntansi</h2>
        <p>
          Laporan akuntansi PSAK, estimasi SPT pajak (PPN 11%, PPh Final 0,5%, PPh 21/23/4(2)), dan analisis riset pasar disediakan sebagai alat bantu manajemen berbasis data yang diinput pengguna. Tanggung jawab akhir atas keakuratan pelaporan pajak ke DJP maupun pengisian sensus resmi tetap berada pada wajib pajak / akuntan bersertifikat milik pengguna.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-[#222222]">6. Hukum yang Berlaku &amp; Penyelesaian Sengketa</h2>
        <p>
          Syarat &amp; Ketentuan ini tunduk pada hukum Republik Indonesia. Segala perselisihan akan diupayakan terlebih dahulu melalui musyawarah mufakat dalam 30 hari kalender sejak pemberitahuan tertulis diterima.
        </p>
      </section>
    </LegalPageShell>
  );
}
