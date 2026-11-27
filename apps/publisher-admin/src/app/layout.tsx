import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WACRM Publisher HQ — Super Admin License & Enterprise Management System",
  description:
    "Sistem internal khusus perusahaan penerbit WACRM (PT WACRM Digital Nusantara): License Management, Master Data, Publisher ERP, B2B SaaS CRM, dan Akuntansi PSAK Lengkap.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function PublisherRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
