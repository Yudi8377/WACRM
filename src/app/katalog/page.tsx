import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Globe, Search, ShoppingBag, Sparkles, Tag } from "lucide-react";
import { formatIdr } from "@/lib/crm-types";
import { db, isDatabaseConfigured } from "@/lib/db";
import { slugifySeo } from "@/lib/seo-engine";
import { CorporateFooter, CorporateNavbar } from "@/components/brand-chrome";

export const dynamic = "force-dynamic";

const APP_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  "https://wacrm-seven-dusky.vercel.app"
).replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Katalog Produk Resmi — Terindeks Google SEO & Schema.org",
  description:
    "Katalog produk resmi teroptimasi SEO Google Search (Schema.org Product JSON-LD), WhatsApp Katalog, Instagram, TikTok, YouTube & Facebook dengan pemesanan instan 24/7.",
  alternates: { canonical: "/katalog" },
  openGraph: {
    title: "Katalog Produk Resmi — Terindeks Google SEO",
    description:
      "Lihat daftar produk siap kirim dengan harga transparan, stok real-time ERP, dan konfirmasi WhatsApp + QR resmi.",
    url: `${APP_BASE_URL}/katalog`,
    type: "website",
  },
};

interface PublicCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  unitPrice: number;
  stockQty: number;
  storeName: string;
}

const FALLBACK_CATALOG: PublicCatalogItem[] = [
  {
    id: "cat-1",
    sku: "GROSIR-50",
    name: "Paket Grosir Berkah Nusantara (Isi 12 Pack)",
    category: "Grosir Sembako",
    description:
      "Paket grosir unggulan untuk toko, reseller, dan agen dengan stok ERP real-time, invoice resmi ber-QR, dan pengiriman cepat ke seluruh Indonesia.",
    unit: "karton",
    unitPrice: 285000,
    stockQty: 140,
    storeName: "Toko Berkah Nusantara",
  },
  {
    id: "cat-2",
    sku: "KOPI-GAYO",
    name: "Kopi Arabika Gayo Specialty Roasted 1Kg",
    category: "Minuman & Kopi",
    description:
      "Biji kopi Arabika Gayo grade specialty freshly roasted, cocok untuk kafe, kedai kopi, maupun stok rumah tangga dengan kemasan valve kedap udara.",
    unit: "kg",
    unitPrice: 185000,
    stockQty: 68,
    storeName: "Toko Berkah Nusantara",
  },
  {
    id: "cat-3",
    sku: "TUMBLER-PRO",
    name: "Tumbler Stainless Vacuum Insulated 750ml",
    category: "Merchandise & Souvenir",
    description:
      "Tumbler stainless steel 304 tahan panas & dingin hingga 12 jam, siap custom logo perusahaan untuk souvenir korporat dan hadiah pelanggan VIP.",
    unit: "pcs",
    unitPrice: 145000,
    stockQty: 95,
    storeName: "Toko Berkah Nusantara",
  },
  {
    id: "cat-4",
    sku: "PRINTER-BT58",
    name: "Printer Thermal Bluetooth & USB-C OTG 58mm",
    category: "Perangkat Kasir POS",
    description:
      "Printer kasir portable mendukung Bluetooth, kabel USB-C OTG, dan Micro-USB untuk cetak struk invoice & label pengiriman QR langsung dari HP Android.",
    unit: "unit",
    unitPrice: 365000,
    stockQty: 24,
    storeName: "Toko Berkah Nusantara",
  },
];

async function loadPublicCatalog(): Promise<PublicCatalogItem[]> {
  if (!isDatabaseConfigured()) return FALLBACK_CATALOG;
  try {
    const res = await db.query<{
      id: string;
      sku: string;
      name: string;
      category: string;
      description: string | null;
      unit: string | null;
      unit_price: string;
      stock_qty: number;
      store_name: string | null;
    }>(`
      SELECT p.id::text, p.sku, p.name, p.category, p.description, p.unit,
             p.unit_price::text, p.stock_qty, o.name AS store_name
        FROM erp_products p
        JOIN organizations o ON o.id = p.tenant_id
       WHERE p.is_active = true
       ORDER BY p.updated_at DESC
       LIMIT 24
    `);
    if (res.rows.length === 0) return FALLBACK_CATALOG;
    return res.rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      category: r.category,
      description: r.description || `${r.name} original bergaransi resmi siap kirim.`,
      unit: r.unit || "pcs",
      unitPrice: Number(r.unit_price),
      stockQty: Number(r.stock_qty),
      storeName: r.store_name || "Toko Berkah Nusantara",
    }));
  } catch {
    return FALLBACK_CATALOG;
  }
}

export default async function PublicCatalogPage() {
  const items = await loadPublicCatalog();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Katalog Produk Resmi Teroptimasi SEO",
    url: `${APP_BASE_URL}/katalog`,
    numberOfItems: items.length,
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: item.name,
        sku: item.sku,
        category: item.category,
        description: item.description,
        url: `${APP_BASE_URL}/katalog#${slugifySeo(`${item.name}-${item.sku}`)}`,
        brand: { "@type": "Brand", name: item.storeName },
        offers: {
          "@type": "Offer",
          priceCurrency: "IDR",
          price: item.unitPrice,
          availability:
            item.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: item.storeName },
        },
      },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#444444]">
      <CorporateNavbar activeHref="/katalog" />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />

        <header className="rounded-2xl bg-[#222222] p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Aplikasi Utama
            </Link>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00A885]/20 px-3 py-1 font-heading text-xs font-bold text-[#00D4A8]">
              <Search className="h-3.5 w-3.5" /> Terindeks Google SEO · Schema.org Product JSON-LD
            </div>
          </div>

          <h1 className="font-heading mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
            Katalog Produk Publik Teroptimasi SEO Omnichannel
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Halaman katalog ini dirender langsung dari server dengan structured data{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[#00D4A8]">schema.org/Product</code>,{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[#00D4A8]">sitemap.xml</code>, dan{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[#00D4A8]">robots.txt</code> agar setiap produk mudah ditemukan di Google Search serta siap dibagikan ke WhatsApp, Instagram, TikTok, YouTube &amp; Facebook.
          </p>
        </header>

        <section
          aria-label="Daftar Produk"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => {
            const slug = slugifySeo(`${item.name}-${item.sku}`);
            return (
              <article
                key={item.id}
                id={slug}
                className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-[#00A885] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F7F3] px-2.5 py-1 font-heading font-bold text-[#008C6F]">
                      <Tag className="h-3 w-3" /> {item.category}
                    </span>
                    <span className="font-mono text-[11px] text-[#797979]">SKU: {item.sku}</span>
                  </div>

                  <h2 className="font-heading mt-3 text-lg font-extrabold text-[#222222]">{item.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#666666]">{item.description}</p>
                </div>

                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-heading text-xl font-extrabold text-[#00A885]">
                      {formatIdr(item.unitPrice)}
                      <span className="text-xs font-normal text-[#797979]"> /{item.unit}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#008C6F]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#00A885]" />
                      {item.stockQty > 0 ? `Stok Ready (${item.stockQty})` : "Pre-Order"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#666666]">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-[#797979]" /> {item.storeName}
                    </span>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 rounded bg-[#00A885] px-3.5 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white hover:bg-[#008C6F]"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" /> Pesan via AI
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 text-xs text-[#555555]">
          <div className="inline-flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-[#00A885]" />
            Dioptimalkan oleh Agen #9 SEO &amp; Omnichannel Growth AI — WACRM v5.3.2
          </div>
          <div className="flex gap-4">
            <a href="/sitemap.xml" className="font-semibold text-[#00A885] hover:underline">
              sitemap.xml
            </a>
            <a href="/robots.txt" className="font-semibold text-[#00A885] hover:underline">
              robots.txt
            </a>
          </div>
        </div>
      </main>

      <CorporateFooter />
    </div>
  );
}
