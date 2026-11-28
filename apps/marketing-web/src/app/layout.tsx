import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WACRM Enterprise v5.3.1 — Platform WhatsApp CRM, ERP, POS, HRD & Akuntansi PSAK 72",
  description:
    "Platform Enterprise terpadu karya PT WACRM Digital Nusantara: 11 Agen AI WhatsApp CRM, ERP Multi-Gudang FIFO, Kasir POS QR/Barcode, HRD Payroll & Akuntansi PSAK 72. Tersedia Edisi Starter UMKM Gratis Selamanya.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "WACRM Enterprise — CRM AI, ERP, POS & Akuntansi PSAK 72 Terpadu",
    description:
      "Satukan penjualan WhatsApp, stok multi-cabang, kasir POS, dan laporan keuangan PSAK 72 dalam satu platform Enterprise Indonesia.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#030712] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
