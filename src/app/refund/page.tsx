import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Kebijakan Pembayaran & Pengembalian Dana (Refund Policy) — WACRM",
  description:
    "Ketentuan pembayaran langganan, garansi uji coba gratis, aktivasi License Key, pembatalan, dan pengembalian dana WACRM Commercial OS.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPageShell
      activePath="/refund"
      badge="Transparansi Pembayaran · Midtrans / Xendit / Tripay Ready"
      title="Kebijakan Pembayaran, Lisensi & Pengembalian Dana"
      subtitle="Kebijakan ini mengatur proses pembayaran paket berbayar, pembatalan langganan, serta kriteria pengembalian dana (refund) secara adil dan transparan."
      effectiveDate="26 November 2026"
    >
      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">1. Evaluasi Risiko Nol (Gratis &amp; Uji Coba Sebelum Bayar)</h2>
        <p>
          WACRM menyediakan paket <strong>Starter UMKM Gratis Selamanya</strong> serta masa uji coba tanpa biaya (<strong>Trial 14 Hari Growth Pro</strong> dan <strong>Trial 7 Hari Enterprise AI Suite</strong>) agar calon pelanggan dapat menguji kesesuaian fitur, printer thermal/A4, dan alur operasional sebelum melakukan pembayaran apa pun.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">2. Metode Pembayaran Resmi</h2>
        <p>
          Pembayaran upgrade paket dilakukan dalam mata uang <strong>Rupiah (IDR)</strong> melalui kanal resmi yang tertera pada halaman Tagihan &amp; Lisensi aplikasi (QRIS, Virtual Account Bank melalui Payment Gateway Midtrans / Xendit / Tripay, atau transfer bank resmi yang terverifikasi oleh Publisher HQ).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">3. Kriteria Pengembalian Dana (Refund 100%)</h2>
        <p>Pengajuan pengembalian dana dapat disetujui penuh dalam kondisi berikut:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Penagihan Ganda (Double Charge):</strong> Terjadi pendebitan dua kali untuk tagihan dan periode yang sama akibat gangguan jaringan pembayaran.</li>
          <li><strong>Kegagalan Aktivasi Teknis Permanen:</strong> Layanan berbayar atau License Key gagal diaktifkan pada akun Anda dan tim teknis tidak dapat menyelesaikannya dalam waktu <strong>3 × 24 jam kerja</strong> sejak laporan diterima.</li>
          <li><strong>Garansi Kepuasan 7 Hari (Langganan Baru):</strong> Khusus transaksi pertama paket bulanan/tahunan yang belum melewati 7 hari kalender sejak aktivasi dan terdapat kendala kesesuaian fitur inti yang tidak dapat diatasi tim support (dikurangi biaya administrasi gateway pembayaran jika berlaku).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">4. Kondisi yang Tidak Dapat Di-Refund</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Permintaan pengembalian dana setelah melewati 7 hari kalender sejak pembayaran dan layanan berjalan normal.</li>
          <li>Akun yang ditangguhkan akibat pelanggaran Syarat &amp; Ketentuan (misalnya aktivitas spam WhatsApp atau penyalahgunaan lisensi).</li>
          <li>Biaya layanan pihak ketiga di luar platform (seperti biaya percakapan template Meta WhatsApp atau biaya domain/VPS milik klien sendiri).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-white">5. Prosedur Pengajuan &amp; Waktu Pemrosesan</h2>
        <p>
          Kirimkan nomor invoice, email terdaftar, bukti transfer/pembayaran, dan alasan pengajuan ke <strong>billing@wacrm.id</strong> atau WhatsApp Billing resmi. Pengembalian dana yang disetujui diproses ke rekening atau metode pembayaran asal dalam <strong>5–10 hari kerja</strong>.
        </p>
      </section>
    </LegalPageShell>
  );
}
