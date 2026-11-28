import type { Metadata } from "next";
import { MarketingLegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan Layanan — WACRM Enterprise",
  description:
    "Syarat dan ketentuan resmi pemakaian platform WACRM Commercial OS, lisensi, anti-spam WhatsApp, dan hak kekayaan intelektual.",
};

export default function MarketingTermsPage() {
  return (
    <MarketingLegalShell
      activePath="/terms"
      badge="Syarat & Ketentuan Layanan · SLA · Kepatuhan Bisnis"
      title="Syarat & Ketentuan Layanan (Terms of Service)"
      subtitle="Ketentuan penggunaan situs informasi dan perangkat lunak WACRM Commercial OS bagi pelaku UMKM, distributor, hingga perusahaan korporasi."
      effectiveDate="26 November 2026"
    >
      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">1. Paket Layanan &amp; Lisensi</h2>
        <p>
          WACRM tersedia mulai dari paket <strong>Starter UMKM (Gratis Selamanya)</strong>, masa uji coba <strong>Growth Pro (14 hari)</strong> dan <strong>Enterprise AI Suite (7 hari)</strong>, hingga lisensi berbayar <strong>Sovereign Corporate</strong>. Setiap License Key yang diterbitkan berlaku eksklusif untuk organisasi pemegang lisensi.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">2. Kepatuhan Anti-Spam &amp; Hukum RI</h2>
        <p>
          Pengguna wajib mematuhi <em>WhatsApp Business Messaging Policy</em> dari Meta dan hukum Republik Indonesia. Penggunaan sistem untuk spam tanpa persetujuan penerima, penipuan, atau konten terlarang dapat mengakibatkan pencabutan akses layanan.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">3. Kepemilikan Data &amp; Batas Tanggung Jawab</h2>
        <p>
          Seluruh data bisnis yang Anda kelola tetap 100% milik perusahaan Anda. Laporan pembukuan PSAK, simulasi SPT pajak, dan laporan riset pasar/sensus merupakan alat bantu operasional; verifikasi akhir pelaporan pajak dan sensus resmi tetap menjadi tanggung jawab wajib pajak / perusahaan pengguna.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-zinc-900">4. Kontak &amp; Penyelesaian Sengketa</h2>
        <p>
          Syarat ini tunduk pada hukum Republik Indonesia. Untuk bantuan hukum atau SLA korporasi, hubungi <strong>enterprise@wacrm.id</strong>.
        </p>
      </section>
    </MarketingLegalShell>
  );
}
