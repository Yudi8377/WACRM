import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const APP_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  "https://wacrm-commercial.dwahyudi8377.workers.dev"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  title: {
    default: "WACRM Commercial OS v5.3.2 — Platform CRM AI, ERP Gudang, POS & Akuntansi PSAK 72",
    template: "%s | WACRM Commercial OS",
  },
  description:
    "Platform Omnichannel CRM, POS Kasir, ERP Gudang, Akuntansi Double-Entry, Studio Cetak Universal (USB-C OTG, Inkjet, LaserJet, Thermal, EDC, Bluetooth, WiFi), dan 9 Agen AI Otonom termasuk SEO & Growth AI lintas WhatsApp, Google, Instagram, TikTok, YouTube & Facebook.",
  keywords: [
    "WACRM",
    "WhatsApp CRM Indonesia",
    "Aplikasi Kasir POS AI",
    "ERP Gudang UMKM",
    "Akuntansi Double Entry Otomatis",
    "Multi Agent AI Indonesia",
    "SEO Produk Omnichannel",
    "Printer USB OTG Thermal EDC",
    "WhatsApp Cloud API Indonesia",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: APP_BASE_URL,
    siteName: "WACRM AI Business Suite",
    title: "WACRM v4.0 — Omnichannel CRM, POS, ERP, Akuntansi & SEO Multi-Agent AI",
    description:
      "Kelola chat WhatsApp, Instagram, TikTok, YouTube, POS Kasir + Label QR, Gudang ERP, Akuntansi, dan SEO Produk otomatis dalam satu aplikasi Web & Android.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "WACRM AI Business Suite v4.0",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WACRM v4.0 — Omnichannel CRM, POS, ERP & SEO Multi-Agent AI",
    description:
      "9 Agen AI Otonom, Studio Cetak Universal (USB-C OTG, Inkjet, LaserJet, EDC, Thermal), Multi-Edition & Super Admin Command Center.",
    images: ["/icons/icon-512.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WACRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#00A885",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "WACRM AI Business Suite",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      softwareVersion: "4.0.0",
      url: APP_BASE_URL,
      inLanguage: "id-ID",
      description:
        "Suite bisnis omnichannel dengan 9 Agen AI otonom (CS, POS, ERP, Akuntansi, Anti-Fraud, Self-Healing, Voice Companion, Follow-Up, SEO & Growth) dan cetak universal USB-C/Micro-USB OTG, Inkjet, LaserJet, Thermal & EDC.",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "IDR",
        lowPrice: "0",
        highPrice: "1950000",
        offerCount: "4",
      },
    },
    {
      "@type": "Organization",
      name: "WACRM Platform",
      url: APP_BASE_URL,
      logo: `${APP_BASE_URL}/icons/icon-512.png`,
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
      </head>
      <body className="min-h-screen overflow-x-clip bg-white text-[#444444] antialiased selection:bg-[#00A885] selection:text-white">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
