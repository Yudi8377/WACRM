import type { Metadata } from "next";
import { MarketingLegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Kebijakan Pembayaran & Pengembalian Dana — WACRM Enterprise",
  description:
    "Aturan transparansi pembayaran, uji coba gratis, aktivasi License Key, dan kebijakan pengembalian dana (refund) WACRM.",
};

export default function MarketingRefundPage() {
  return (
    <MarketingLegalShell
      activePath="/refund"
      badge="Transparansi Billing · Midtrans / Xendit / Tripay Ready"
      title="Kebijakan Pembayaran & Pengembalian Dana (Refund Policy)"
      subtitle="Transparansi penuh mengenai uji coba gratis, pembayaran berlangganan dalam mata uang Rupiah (IDR), serta garansi pengembalian dana."
      effectiveDate="26 November 2026"
    >
      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">1. Coba Gratis Sebelum Membayar</h2>
        <p>
          Seluruh calon pengguna dianjurkan memanfaatkan paket <strong>Starter UMKM Gratis Selamanya</strong> atau <strong>Trial Growth Pro (14 hari) / Enterprise (7 hari)</strong> terlebih dahulu untuk memastikan seluruh kebutuhan operasional berjalan sempurna sebelum berlangganan.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">2. Kriteria Pengembalian Dana</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Penagihan Ganda (Double Charge):</strong> Pengembalian penuh 100% atas nominal ganda yang terverifikasi.</li>
          <li><strong>Kegagalan Aktivasi Permanen:</strong> Jika lisensi gagal diaktifkan dalam 3 × 24 jam kerja akibat kesalahan sistem kami.</li>
          <li><strong>Garansi Kepuasan 7 Hari:</strong> Berlaku untuk pembayaran langganan baru pertama kali dalam 7 hari kalender sejak aktivasi bila terdapat ketidaksesuaian fungsi inti yang tidak dapat diselesaikan tim dukungan.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">3. Pengajuan &amp; Waktu Refund</h2>
        <p>
          Ajukan permohonan dengan melampirkan nomor invoice dan bukti bayar ke <strong>billing@wacrm.id</strong>. Dana yang disetujui dikembalikan ke metode pembayaran asal dalam <strong>5–10 hari kerja</strong>.
        </p>
      </section>
    </MarketingLegalShell>
  );
}
