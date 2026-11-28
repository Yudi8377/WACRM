import {
  formatIdr,
  type ErpProductRecord,
  type OmnichannelSeoPack,
  type ProductSeoAudit,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import { normalizeSocialChannelAccount } from "@/lib/store-profile";

export function slugifySeo(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70);
}

function slugify(input: string): string {
  return slugifySeo(input);
}

function cleanHashtag(word: string): string {
  const cleaned = word.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned ? `#${cleaned}` : "";
}

/**
 * Evaluates SEO readiness (0-100) for a single ERP product across Google & Social Search.
 */
export function auditProductSeo(
  product: ErpProductRecord,
  storeProfile: StoreBusinessProfile,
): ProductSeoAudit {
  let score = 35;
  const issues: string[] = [];
  const strengths: string[] = [];
  const city = storeProfile.city || "Indonesia";

  // 1. Title length & specificity
  if (product.name.length >= 16 && product.name.length <= 65) {
    score += 20;
    strengths.push("Nama produk ideal untuk SEO Google & TikTok Search (16–65 karakter).");
  } else if (product.name.length < 16) {
    score += 8;
    issues.push("Nama produk terlalu singkat — tambahkan varian, ukuran, atau keunggulan utama.");
  } else {
    score += 12;
    issues.push("Nama produk sedikit terlalu panjang (>65 karakter) — berisiko terpotong di hasil Google.");
  }

  // 2. Description depth
  if (product.description.trim().length >= 45) {
    score += 20;
    strengths.push("Deskripsi produk informatif & siap dijadikan meta description + snippet AI.");
  } else {
    issues.push("Deskripsi produk masih tipis (<45 karakter) — lengkapi manfaat, bahan, dan garansi.");
  }

  // 3. Stock & Price availability (crucial for Google Merchant / TikTok Shop ranking)
  if (product.stockQty > 0 && product.unitPrice > 0) {
    score += 15;
    strengths.push("Harga & stok tersedia — layak muncul sebagai Rich Product Snippet (InStock).");
  } else {
    issues.push("Stok 0 atau harga belum diatur — produk tidak akan diprioritaskan mesin pencari.");
  }

  // 4. Category & Local SEO readiness
  if (product.category && product.category.toLowerCase() !== "umum") {
    score += 10;
    strengths.push(`Terkategorisasi jelas di "${product.category}" untuk pencarian lokal ${city}.`);
  } else {
    issues.push("Kategori masih 'Umum' — gunakan kategori spesifik agar SEO niche lebih kuat.");
  }

  const finalScore = Math.min(100, Math.max(0, score));
  const grade: ProductSeoAudit["grade"] =
    finalScore >= 85 ? "A" : finalScore >= 70 ? "B" : finalScore >= 55 ? "C" : "D";

  const primaryKeyword = `jual ${product.name.toLowerCase()} ${city.toLowerCase()}`;
  const secondaryKeywords = [
    `harga ${product.name.toLowerCase()} terbaru`,
    `${product.category.toLowerCase()} terbaik ${city.toLowerCase()}`,
    `beli ${product.name.toLowerCase()} grosir`,
    `promo ${product.name.toLowerCase()} ${storeProfile.businessName.toLowerCase()}`,
    `${product.sku.toLowerCase()} ready stock`,
  ];

  return {
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    score: finalScore,
    grade,
    issues,
    strengths,
    primaryKeyword,
    secondaryKeywords,
  };
}

/**
 * Multi-Agent AI #9 (`seo_growth`):
 * Generates complete, ready-to-publish SEO & Sales Growth content for ALL 6 channels:
 * Google Search (Meta + JSON-LD), WhatsApp Catalog/Broadcast, Instagram, TikTok, YouTube & Facebook.
 */
export function generateOmnichannelSeoPack(
  product: ErpProductRecord,
  storeProfile: StoreBusinessProfile,
): OmnichannelSeoPack {
  const audit = auditProductSeo(product, storeProfile);
  const store = storeProfile.businessName;
  const city = storeProfile.city || "Indonesia";
  const priceText = formatIdr(product.unitPrice);
  const stockBadge = product.stockQty > 0 ? `Ready ${product.stockQty} ${product.unit}` : "Pre-Order";
  const slug = `${slugify(product.name)}-${slugify(product.sku)}`;

  const metaTitle = `${product.name} ${priceText} | ${store} ${city}`.slice(0, 68);
  const metaDescription = `Beli ${product.name} (${stockBadge}) harga ${priceText}/${product.unit} di ${store} ${city}. ${
    product.description || "Kualitas terjamin, pengiriman cepat & pembayaran QRIS/Transfer."
  } Pesan langsung via WhatsApp!`.slice(0, 160);

  const waAcc = normalizeSocialChannelAccount(
    "whatsapp",
    storeProfile.socialHandles?.whatsapp || storeProfile.phone,
  );
  const igAcc = normalizeSocialChannelAccount("instagram", storeProfile.socialHandles?.instagram);
  const fbAcc = normalizeSocialChannelAccount("facebook", storeProfile.socialHandles?.facebook);
  const ttAcc = normalizeSocialChannelAccount("tiktok", storeProfile.socialHandles?.tiktok);
  const ytAcc = normalizeSocialChannelAccount("youtube", storeProfile.socialHandles?.youtube);
  const sameAsLinks = [igAcc.url, fbAcc.url, ttAcc.url, ytAcc.url].filter(
    (u): u is string => Boolean(u),
  );
  const waOrderLink = waAcc.url
    ? `${waAcc.url}?text=${encodeURIComponent(`Halo ${store}, saya mau pesan ${product.name} (${product.sku})`)}`
    : null;

  const jsonLdObj = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    category: product.category,
    description: product.description || `${product.name} resmi dari ${store}`,
    brand: {
      "@type": "Brand",
      name: store,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.unitPrice,
      availability:
        product.stockQty > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: store,
        telephone: waAcc.handle || storeProfile.phone,
        ...(sameAsLinks.length > 0 ? { sameAs: sameAsLinks } : {}),
      },
    },
  };

  const nameTokens = product.name
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 4);
  const hashtags = Array.from(
    new Set(
      [
        cleanHashtag(product.category),
        cleanHashtag(store),
        cleanHashtag(city),
        ...nameTokens.map(cleanHashtag),
        "#PromoHariIni",
        "#ReadyStock",
        "#BelanjaAman",
        "#UMKMIndonesia",
        "#GrosirDanEcer",
        "#OrderWhatsApp",
        "#PengirimanCepat",
      ].filter(Boolean),
    ),
  );

  return {
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    generatedAt: new Date().toISOString(),
    audit,
    google: {
      metaTitle,
      metaDescription,
      slug,
      keywords: [audit.primaryKeyword, ...audit.secondaryKeywords],
      jsonLd: JSON.stringify(jsonLdObj, null, 2),
    },
    whatsapp: {
      catalogTitle: `${product.name} — ${priceText}/${product.unit}`,
      broadcastCopy: [
        `🔥 *${product.name}* (${stockBadge})`,
        `Harga spesial hari ini: *${priceText}/${product.unit}*`,
        product.description ? `✅ ${product.description}` : "✅ Kualitas pilihan, siap kirim hari ini!",
        `🚚 Kirim cepat dari ${city} (${storeProfile.defaultCourier}) · Bayar QRIS / Transfer / COD.`,
        waOrderLink
          ? `📲 Klik untuk langsung pesan: ${waOrderLink}`
          : `Balas chat ini dengan *"Pesan ${product.name}"* — Invoice & Label QR langsung terbit otomatis!`,
      ].join("\n"),
      ctaLine: `Balas "Pesan 1 ${product.name}" sekarang sebelum stok ${product.stockQty} ${product.unit} habis!`,
    },
    instagram: {
      hook: `Cari ${product.name} original di ${city}? Stok baru masuk & langsung ludes tiap minggu!`,
      caption: [
        `✨ ${product.name} — Kini hanya ${priceText}/${product.unit}!`,
        "",
        product.description || `Pilihan terlaris dari ${store} untuk kebutuhan harian maupun grosir Anda.`,
        `📦 Status: ${stockBadge} | 🚚 Pengiriman Same-Day & Ekspedisi Nasional.`,
        igAcc.connected
          ? `💬 Follow & DM ${igAcc.handle} dengan kata "${product.sku}" atau klik link WA ${waAcc.handle || "di bio"}!`
          : `💬 Cara Order Cepat: DM kata "${product.sku}" atau klik link WhatsApp di bio — AI CS kami langsung balas 24 jam!`,
      ].join("\n"),
      hashtags,
    },
    tiktok: {
      videoHook: `[0-3 detik] "Banyak yang nanya di mana beli ${product.name} harga ${priceText} yang kualitasnya juara? Cek ini!"`,
      seoCaption: `Review jujur ${product.name} (${product.category}) dari ${store} ${city}${ttAcc.connected ? ` (${ttAcc.handle})` : ""}! Harga ${priceText}, ${stockBadge}. Klik keranjang kuning atau order WA ${waAcc.handle || "di bio"}! ${hashtags.slice(0, 6).join(" ")}`,
      searchTags: [
        product.name.toLowerCase(),
        `rekomendasi ${product.category.toLowerCase()}`,
        `${product.name.toLowerCase()} murah berkualitas`,
        `${store.toLowerCase()} ${city.toLowerCase()}`,
      ],
    },
    youtube: {
      title: `Review & Harga Terbaru ${product.name} (${priceText}) — ${store} ${city}`,
      description: [
        `Sedang mencari ${product.name}? Di video ini kami bahas detail, keunggulan, dan cara pemesanan cepat langsung dari ${store} (${city}).`,
        "",
        `📌 Detail Produk:`,
        `- Nama: ${product.name} (SKU: ${product.sku})`,
        `- Kategori: ${product.category}`,
        `- Harga: ${priceText}/${product.unit}`,
        `- Ketersediaan: ${stockBadge}`,
        "",
        `📲 Pesan Resmi via WhatsApp: ${waOrderLink || storeProfile.phone || "Hubungi admin toko"}`,
        ...(igAcc.url ? [`📸 Instagram: ${igAcc.url}`] : []),
        ...(fbAcc.url ? [`👍 Facebook: ${fbAcc.url}`] : []),
        ...(ttAcc.url ? [`🎵 TikTok: ${ttAcc.url}`] : []),
        ...(ytAcc.url ? [`▶️ Subscribe Channel: ${ytAcc.url}`] : []),
        `📍 Lokasi Pengiriman: ${storeProfile.address || city}`,
      ].join("\n"),
      tags: [
        product.name,
        product.category,
        `harga ${product.name}`,
        `jual ${product.name} ${city}`,
        store,
      ],
    },
    facebook: {
      marketplaceTitle: `[READY] ${product.name} - ${priceText}/${product.unit} (${city})`,
      postCopy: [
        `READY STOCK! ${product.name} hanya ${priceText}/${product.unit}.`,
        product.description || `Produk unggulan ${store} siap kirim ke seluruh Indonesia.`,
        `Pembayaran mudah via QRIS, Transfer Bank, atau COD.${
          fbAcc.url ? ` Kunjungi halaman resmi kami: ${fbAcc.url}` : ""
        }${waOrderLink ? `\n📲 Order instan WhatsApp: ${waOrderLink}` : ' Klik "Kirim Pesan" untuk pemesanan instan!'}`,
      ].join("\n\n"),
    },
  };
}

export interface StoreSeoSummary {
  overallScore: number;
  grade: "A" | "B" | "C" | "D";
  totalProducts: number;
  optimizedCount: number;
  needsAttentionCount: number;
  topKeywords: string[];
  channelReadiness: Array<{
    channel: string;
    score: number;
    status: string;
  }>;
  audits: ProductSeoAudit[];
}

export function computeStoreSeoSummary(
  products: ErpProductRecord[],
  storeProfile: StoreBusinessProfile,
): StoreSeoSummary {
  const active = products.filter((p) => p.isActive);
  const audits = active.map((p) => auditProductSeo(p, storeProfile));
  const avg =
    audits.length > 0
      ? Math.round(audits.reduce((sum, a) => sum + a.score, 0) / audits.length)
      : 0;
  const grade: StoreSeoSummary["grade"] =
    avg >= 85 ? "A" : avg >= 70 ? "B" : avg >= 55 ? "C" : "D";

  const topKeywords = Array.from(
    new Set(audits.flatMap((a) => [a.primaryKeyword, a.secondaryKeywords[0]])),
  ).slice(0, 8);

  return {
    overallScore: avg,
    grade,
    totalProducts: active.length,
    optimizedCount: audits.filter((a) => a.score >= 80).length,
    needsAttentionCount: audits.filter((a) => a.score < 80).length,
    topKeywords,
    channelReadiness: [
      { channel: "Google Search & JSON-LD", score: Math.min(100, avg + 5), status: avg >= 75 ? "Siap Indeks" : "Perlu Optimasi" },
      { channel: "WhatsApp Business Catalog", score: Math.min(100, avg + 8), status: "Aktif 24/7" },
      { channel: "Instagram & Hashtag SEO", score: avg, status: avg >= 70 ? "Optimal" : "Perlu Copy" },
      { channel: "TikTok Search & Shop", score: Math.max(45, avg - 4), status: avg >= 75 ? "Optimal" : "Tambahkan Hook Video" },
      { channel: "YouTube & Facebook", score: Math.max(50, avg - 2), status: "Siap Publikasi" },
    ],
    audits,
  };
}
