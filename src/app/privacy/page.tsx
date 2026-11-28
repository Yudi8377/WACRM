import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (UU PDP No. 27/2022) — WACRM Commercial OS",
  description:
    "Kebijakan privasi, pemrosesan data pribadi, keamanan isolasi tenant, integrasi Meta WhatsApp Cloud API, dan prosedur penghapusan data pengguna WACRM.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      activePath="/privacy"
      badge="Kepatuhan UU No. 27 Tahun 2022 (UU PDP) · Meta API · Google Play"
      title="Kebijakan Privasi & Perlindungan Data Pribadi"
      subtitle="Dokumen ini menjelaskan bagaimana WACRM Commercial OS mengumpulkan, menggunakan, menyimpan, melindungi, dan menghapus data pribadi maupun data bisnis pengguna secara transparan."
      effectiveDate="26 November 2026"
    >
      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">1. Ruang Lingkup &amp; Dasar Hukum</h2>
        <p>
          WACRM Commercial OS (&quot;Platform&quot;) berkomitmen melindungi privasi dan keamanan data pribadi seluruh pemilik usaha, administrator, staf, serta pelanggan akhir yang diproses melalui aplikasi Web, PWA, Desktop, maupun Android sesuai <strong>Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong> dan peraturan perundang-undangan Republik Indonesia.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">2. Jenis Data yang Diproses</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Data Identitas &amp; Akun Usaha:</strong> Nama lengkap, alamat email bisnis, nomor WhatsApp, nama toko/perusahaan, alamat usaha, kota, dan NPWP opsional yang dimasukkan oleh pengguna.</li>
          <li><strong>Data Operasional CRM, POS, ERP &amp; Akuntansi:</strong> Kontak pelanggan, riwayat percakapan omnichannel, katalog produk, stok FIFO, transaksi pesanan, jurnal pembukuan, dan laporan riset pasar milik tenant.</li>
          <li><strong>Data Integrasi Pihak Ketiga:</strong> Token akses Meta WhatsApp Cloud API, Evolution API, atau gateway pembayaran yang disimpan dalam bentuk terenkripsi (AES-256-GCM) hanya untuk menjalankan integrasi yang diaktifkan pengguna.</li>
          <li><strong>Data Teknis &amp; Keamanan:</strong> Alamat IP untuk perlindungan anti-brute-force/rate limiting, log audit sistem, serta preferensi perangkat (printer thermal/kamera QR lokal yang hanya diakses atas izin eksplisit pengguna).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">3. Tujuan Pemrosesan Data</h2>
        <p>Data digunakan semata-mata untuk:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Menyediakan layanan CRM omnichannel, kasir POS QR/COD, manajemen gudang ERP FIFO, pembukuan PSAK, HRD Payroll, dan analitik AI sesuai paket layanan.</li>
          <li>Mengirim notifikasi operasional, verifikasi keamanan (OTP reset sandi), serta verifikasi aktivasi lisensi resmi.</li>
          <li>Mencegah penipuan, penyalahgunaan spam, dan pelanggaran keamanan sistem.</li>
        </ul>
        <p className="font-semibold text-emerald-300">
          WACRM TIDAK PERNAH menjual, menyewakan, atau memperdagangkan data pelanggan maupun database transaksi milik pengguna kepada pihak ketiga mana pun.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">4. Isolasi Data Multi-Tenant &amp; Keamanan</h2>
        <p>
          Seluruh basis data cloud menerapkan isolasi multi-tenant ketat berbasis <strong>PostgreSQL Row-Level Security (RLS)</strong>, enkripsi TLS/HTTPS saat transmisi, enkripsi AES-256 untuk kredensial konektor, serta hashing kata sandi kriptografis. Setiap tenant hanya dapat mengakses data miliknya sendiri.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">5. Integrasi Meta WhatsApp Cloud API &amp; Layanan Pembayaran</h2>
        <p>
          Saat pengguna menghubungkan Meta WhatsApp Cloud API atau Payment Gateway (Midtrans, Xendit, Tripay), pertukaran pesan dan status transaksi diproses melalui webhook resmi yang diverifikasi dengan tanda tangan kriptografis (HMAC/SHA-512). Pengguna bertanggung jawab memastikan pelanggan akhir telah memberikan persetujuan (*opt-in*) untuk menerima pesan WhatsApp.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">6. Hak Subjek Data &amp; Prosedur Penghapusan Data (Meta &amp; Google Play Data Deletion)</h2>
        <p>Sesuai UU PDP, pengguna berhak untuk:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Mengakses, mengunduh/mengekspor seluruh data bisnis (format Excel, CSV, JSON, PDF) kapan saja secara mandiri dari dalam aplikasi.</li>
          <li>Memperbarui atau mengoreksi data pribadi yang tidak akurat.</li>
          <li>Meminta penghapusan permanen akun beserta seluruh data tenant melalui email ke <strong>privacy@wacrm.id</strong> atau melalui saluran dukungan resmi dengan subjek <em>&quot;Permintaan Penghapusan Data — [Email Terdaftar]&quot;</em>. Permintaan yang terverifikasi akan diproses maksimal dalam <strong>7 × 24 jam kerja</strong>.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">7. Masa Retensi &amp; Kontak Petugas Pelindungan Data (DPO)</h2>
        <p>
          Data disimpan selama akun aktif atau selama diperlukan untuk kepatuhan hukum perpajakan/akuntansi yang berlaku. Pertanyaan privasi dapat dikirimkan ke <strong>privacy@wacrm.id</strong>.
        </p>
      </section>
    </LegalPageShell>
  );
}
