import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#F5F2EB",
};

export const metadata: Metadata = {
  title: "WACRM Enterprise v5.3.2 — Split Index · CRM AI, ERP, POS & Akuntansi PSAK 72",
  description:
    "Platform Enterprise terpadu PT WACRM Digital Nusantara dengan pengalaman adaptif Split Index: 11 Agen AI WhatsApp CRM, ERP Multi-Gudang FIFO, Kasir POS QR/Barcode, HRD Payroll & Akuntansi PSAK 72. Mulai gratis untuk UMKM.",
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
    <html lang="id" className="overflow-x-clip">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-clip bg-[#F5F2EB] text-[#141311] antialiased selection:bg-[#141311] selection:text-[#F5F2EB]">
        {children}
      </body>
    </html>
  );
}
