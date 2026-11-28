import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#00A885",
};

export const metadata: Metadata = {
  title: "WACRM Enterprise v5.3.2 — Platform CRM AI, ERP Gudang, POS & Akuntansi PSAK 72",
  description:
    "Platform bisnis terpadu PT WACRM Digital Nusantara: 11 Agen AI WhatsApp CRM 24/7, ERP Multi-Cabang FIFO, Kasir POS QR/Barcode, HRD Payroll & Akuntansi PSAK 72. Responsif di HP Android, Tablet & Desktop.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "WACRM Enterprise — Otomasi CRM AI, ERP, POS & Akuntansi PSAK 72",
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
    <html lang="id" className="overflow-x-clip">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Raleway:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-clip bg-white text-[#444444] antialiased selection:bg-[#00A885] selection:text-white">
        {children}
      </body>
    </html>
  );
}
