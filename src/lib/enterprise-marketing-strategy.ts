import {
  formatIdr,
  type ContactRecord,
  type ConversationRecord,
  type ErpProductRecord,
  type FinancialReportSummary,
  type PosOrderRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";

export interface MarketingAgentTraceStep {
  agentNumber: number;
  agentName: string;
  roleTitle: string;
  status: "completed";
  keyFindings: string[];
}

export interface ChannelBudgetPlan {
  channel: string;
  sharePct: number;
  monthlyBudgetIdr: number;
  projectedRoas: number;
  projectedMonthlyRevenueIdr: number;
  primaryKpi: string;
  tacticalPlay: string;
}

export interface MarketingPersona {
  name: string;
  segmentSharePct: number;
  painPoint: string;
  buyingTrigger: string;
  bestChannel: string;
  recommendedOffer: string;
}

export interface MarketingRoadmapPhase {
  phase: string;
  windowLabel: string;
  objective: string;
  targetRevenueLiftPct: number;
  deliverables: string[];
  ownerAgent: string;
}

export interface CampaignScriptPack {
  id: string;
  channel: "WhatsApp Broadcast VIP" | "TikTok Live & Short" | "Instagram Reels & Carousel" | "Penawaran B2B / Reseller";
  title: string;
  targetAudience: string;
  scriptBody: string;
}

export interface MarketingCampaignInitiative {
  id: string;
  title: string;
  channel: string;
  budgetIdr: number;
  targetRevenueIdr: number;
  ownerPic: string;
  status: "draft" | "approved" | "running" | "completed";
  notes: string;
  updatedAt: string;
}

export interface EnterpriseMarketingBlueprint {
  generatedAt: string;
  businessName: string;
  strategicFocus: string;
  monthlyBudgetIdr: number;
  targetGrowthPct: number;
  // Agent 1 Data Snapshot
  dataMetrics: {
    baselineMonthlyRevenueIdr: number;
    avgOrderValueIdr: number;
    grossMarginPct: number;
    totalProducts: number;
    totalContacts: number;
    openConversations: number;
    heroProductName: string;
    overstockProductName: string;
    overstockTiedCapitalIdr: number;
  };
  // Agent 2 SWOT & Personas
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  personas: MarketingPersona[];
  // Agent 3 Forecast & ROAS
  forecast: {
    projected30dRevenueIdr: number;
    projected60dRevenueIdr: number;
    projected90dRevenueIdr: number;
    projected90dNetProfitIdr: number;
    blendedRoas: number;
    breakEvenRoas: number;
    estimatedCacIdr: number;
    estimatedLtvIdr: number;
    ltvToCacRatio: number;
    channelAllocations: ChannelBudgetPlan[];
  };
  // Agent 4 Blueprint & Scripts
  roadmap90Days: MarketingRoadmapPhase[];
  campaignScripts: CampaignScriptPack[];
  // Pipeline log
  agentPipeline: MarketingAgentTraceStep[];
}

export function buildEnterpriseMarketingBlueprint(params: {
  storeProfile: StoreBusinessProfile;
  products: ErpProductRecord[];
  orders: PosOrderRecord[];
  contacts: ContactRecord[];
  conversations: ConversationRecord[];
  report: FinancialReportSummary;
  monthlyBudgetIdr: number;
  targetGrowthPct: number;
  strategicFocus?: string;
}): EnterpriseMarketingBlueprint {
  const validOrders = params.orders.filter((o) => o.orderStatus !== "cancelled");
  const observedRevenue = Math.max(
    params.report.totalRevenue,
    validOrders.reduce((s, o) => s + o.totalAmount, 0),
  );
  const baselineMonthlyRevenueIdr = Math.max(25_000_000, observedRevenue > 0 ? observedRevenue : 25_000_000);
  const avgOrderValueIdr =
    validOrders.length > 0
      ? Math.max(85_000, Math.round(observedRevenue / validOrders.length))
      : 215_000;
  const grossMarginPct =
    params.report.totalRevenue > 0
      ? Math.max(15, Math.min(75, Math.round((params.report.grossProfit / params.report.totalRevenue) * 100)))
      : 36;

  // Identify Hero SKU & Highest Overstock SKU
  const soldBySku = new Map<string, number>();
  for (const ord of validOrders) {
    for (const item of ord.items) {
      const k = (item.sku || item.productName).toLowerCase();
      soldBySku.set(k, (soldBySku.get(k) ?? 0) + item.quantity);
    }
  }

  const sortedHero = [...params.products].sort(
    (a, b) => (soldBySku.get(b.sku.toLowerCase()) ?? 0) - (soldBySku.get(a.sku.toLowerCase()) ?? 0),
  );
  const heroProduct = sortedHero[0];
  const overstockProduct =
    [...params.products].sort(
      (a, b) => b.stockQty * b.costPrice - a.stockQty * a.costPrice,
    )[0] ?? heroProduct;

  const heroProductName = heroProduct?.name || "Produk Unggulan Utama";
  const overstockProductName = overstockProduct?.name || "Produk Stok Prioritas";
  const overstockTiedCapitalIdr = overstockProduct
    ? overstockProduct.stockQty * overstockProduct.costPrice
    : 4_500_000;

  const openConversations = params.conversations.filter((c) => c.status !== "resolved").length;
  const monthlyBudgetIdr = Math.max(1_000_000, Math.round(params.monthlyBudgetIdr));
  const targetGrowthPct = Math.max(10, Math.min(200, Math.round(params.targetGrowthPct)));
  const focus =
    params.strategicFocus?.trim() ||
    "Ekspansi Omnichannel WhatsApp CRM + Dominasi Bundling & Repeat Order Nasional";

  // Agent 3: Channel Allocation & ROAS Math
  const channelTemplates: Array<{
    channel: string;
    sharePct: number;
    roas: number;
    primaryKpi: string;
    tacticalPlay: string;
  }> = [
    {
      channel: "WhatsApp CRM Retention & Broadcast VIP",
      sharePct: 20,
      roas: 8.5,
      primaryKpi: "Repeat Order Rate ≥ 38% & Response < 15 detik",
      tacticalPlay: `Broadcast tersegmentasi ke ${Math.max(50, params.contacts.length)} kontak (VIP, Payday tgl 25, & Pengingat Isi Ulang H+25).`,
    },
    {
      channel: "TikTok Live, Affiliate & Short Video",
      sharePct: 30,
      roas: 4.4,
      primaryKpi: "GMV Live + CTR Keranjang Kuning ≥ 4,5%",
      tacticalPlay: `Live harian 2 sesi (12:00 & 19:30 WIB) demo "${heroProductName}" + Paket Bundling 1 Ongkir COD.`,
    },
    {
      channel: "Instagram Reels & Meta Click-to-WhatsApp Ads",
      sharePct: 25,
      roas: 3.9,
      primaryKpi: "Cost per WA Chat ≤ Rp 4.500 & Closing Rate ≥ 22%",
      tacticalPlay: `Iklan CTWA mengarah langsung ke CS AI Zero-Click untuk konsultasi & invoice QR otomatis.`,
    },
    {
      channel: "Google Search SEO & Google Business Profile",
      sharePct: 15,
      roas: 5.2,
      primaryKpi: "Top 3 Pencarian Lokal & Organik B2B",
      tacticalPlay: `Halaman landing kata kunci transaksional + JSON-LD produk + ulasan pelanggan WA otomatis.`,
    },
    {
      channel: "Program Reseller, Agen & B2B Korporat",
      sharePct: 10,
      roas: 6.4,
      primaryKpi: "Minimal 10 Mitra Grosir Aktif / Kuartal",
      tacticalPlay: `Penawaran harga grosir bertingkat (min. 5–20 unit) untuk mencairkan stok "${overstockProductName}".`,
    },
  ];

  const channelAllocations: ChannelBudgetPlan[] = channelTemplates.map((ct) => {
    const allocBudget = Math.round((monthlyBudgetIdr * ct.sharePct) / 100);
    return {
      channel: ct.channel,
      sharePct: ct.sharePct,
      monthlyBudgetIdr: allocBudget,
      projectedRoas: ct.roas,
      projectedMonthlyRevenueIdr: Math.round(allocBudget * ct.roas),
      primaryKpi: ct.primaryKpi,
      tacticalPlay: ct.tacticalPlay,
    };
  });

  const incrementalMonthlyMarketingRev = channelAllocations.reduce(
    (s, c) => s + c.projectedMonthlyRevenueIdr,
    0,
  );
  const blendedRoas = Number((incrementalMonthlyMarketingRev / monthlyBudgetIdr).toFixed(2));
  const breakEvenRoas = Number((100 / Math.max(15, grossMarginPct)).toFixed(2));
  const growthFactor = 1 + targetGrowthPct / 100;

  const projected30dRevenueIdr = Math.round(
    baselineMonthlyRevenueIdr * (1 + (targetGrowthPct / 100) * 0.45) +
      incrementalMonthlyMarketingRev * 0.35,
  );
  const projected60dRevenueIdr = Math.round(projected30dRevenueIdr * 2.15);
  const projected90dRevenueIdr = Math.round(
    baselineMonthlyRevenueIdr * 3 * (0.75 + growthFactor * 0.25) +
      incrementalMonthlyMarketingRev * 2.1,
  );
  const projected90dNetProfitIdr = Math.round(
    projected90dRevenueIdr * (grossMarginPct / 100) - monthlyBudgetIdr * 3,
  );

  const estimatedNewCustomersPerMonth = Math.max(
    15,
    Math.round(incrementalMonthlyMarketingRev / avgOrderValueIdr),
  );
  const estimatedCacIdr = Math.round(monthlyBudgetIdr / estimatedNewCustomersPerMonth);
  const estimatedLtvIdr = Math.round(avgOrderValueIdr * 3.4 * (grossMarginPct / 100));
  const ltvToCacRatio = Number((estimatedLtvIdr / Math.max(1, estimatedCacIdr)).toFixed(2));

  const swot = {
    strengths: [
      `Margin kotor sehat ${grossMarginPct}% memberi ruang promo bundling 8–12% tanpa menggerus profit.`,
      `Produk hero "${heroProductName}" sudah teruji permintaan & memiliki jalur transaksi POS/QRIS/COD cepat.`,
      `Infrastruktur CS AI 24/7 siap menampung lonjakan chat iklan CTWA tanpa menambah beban gaji CS.`,
    ],
    weaknesses: [
      `Modal tertahan sekitar ${formatIdr(overstockTiedCapitalIdr)} pada stok "${overstockProductName}" perlu dicairkan lewat bundling.`,
      `${openConversations} percakapan pelanggan aktif berisiko dingin bila tidak segera di-follow-up otomatis < 15 menit.`,
    ],
    opportunities: [
      `Lonjakan belanja Payday (tgl 25–02) & permintaan COD 1-ongkir paket bundling 3-in-1 di Indonesia (+38% YoY).`,
      `Optimalisasi database ${params.contacts.length} kontak CRM yang sudah ada menghasilkan ROAS tertinggi (8,5x).`,
    ],
    threats: [
      `Perang harga di marketplace — wajib diatasi dengan diferensiasi Paket Bundling, Layanan WA Cepat, & VIP Loyalty.`,
      `Kenaikan biaya iklan (CPM) di kuartal puncak — mitigasi dengan retensi pelanggan & kanal organik SEO/Affiliate.`,
    ],
  };

  const personas: MarketingPersona[] = [
    {
      name: "Pembeli Impulsif COD & QRIS (Malam Hari)",
      segmentSharePct: 38,
      painPoint: "Takut barang tidak sesuai foto & malas bayar ongkir mahal untuk 1 item.",
      buyingTrigger: "Video demo asli 15 detik + Opsi COD Amanah + Bundling 3-in-1 1 Ongkir.",
      bestChannel: "TikTok Live & WhatsApp Auto-Checkout",
      recommendedOffer: `Paket Bundling Hemat "${heroProductName}" + diskon 10%`,
    },
    {
      name: "Pelanggan Repeat Order Keluarga / Personal",
      segmentSharePct: 28,
      painPoint: "Sering lupa stok di rumah habis dan ingin proses pesan ulang < 1 menit.",
      buyingTrigger: "Pengingat WA ramah hari ke-25 + poin loyalitas/voucher pelanggan tetap.",
      bestChannel: "WhatsApp Broadcast & Follow-Up Hunter AI",
      recommendedOffer: "Paket Refill Bulanan (2x unit hemat 10% + prioritas kirim)",
    },
    {
      name: "Pemilik Warung / Reseller / Kafe B2B",
      segmentSharePct: 22,
      painPoint: "Butuh pasokan stabil, margin jual ulang sehat, & invoice resmi ber-NPWP.",
      buyingTrigger: "Daftar harga grosir bertingkat (min 5/10/20 unit) + dukungan materi promo.",
      bestChannel: "WhatsApp B2B + Google Search SEO",
      recommendedOffer: "Paket Kemitraan Grosir + Faktur Pajak / Invoice Corporate",
    },
    {
      name: "Corporate Gifting & Event Buyer",
      segmentSharePct: 12,
      painPoint: "Deadline mepet & butuh kemasan rapi ber-logo serta bukti transaksi rapi.",
      buyingTrigger: "Katalog PDF instan + custom kemasan + pengiriman terjadwal.",
      bestChannel: "Instagram Business + Email/WA Penawaran Resmi",
      recommendedOffer: "Paket Hampers Korporat min. 15 set (diskon 12%)",
    },
  ];

  const roadmap90Days: MarketingRoadmapPhase[] = [
    {
      phase: "Fase 1 · Quick Win & Pencairan Cashflow",
      windowLabel: "Hari 1 – 30",
      objective: "Cairkan stok overstock & konversi database kontak CRM eksisting dengan ROAS tertinggi.",
      targetRevenueLiftPct: Math.round(targetGrowthPct * 0.35),
      deliverables: [
        `Luncurkan SKU Bundling 3-in-1 ("${heroProductName}" + "${overstockProductName}") diskon 12%.`,
        `Jalankan 3 gelombang Broadcast WA VIP (Payday, Flash Sale Weekend, & Re-aktivasi kontak pasif).`,
        "Aktifkan AI Auto Follow-Up H+1 & H+3 bagi semua lead chat yang belum checkout.",
      ],
      ownerAgent: "Agen CRM Retention & Auto-Bundling AI",
    },
    {
      phase: "Fase 2 · Scale Akuisisi Omnichannel",
      windowLabel: "Hari 31 – 60",
      objective: "Perluas trafik pembeli baru secara terukur via TikTok Live, CTWA Ads, & SEO Lokal.",
      targetRevenueLiftPct: Math.round(targetGrowthPct * 0.7),
      deliverables: [
        `Alokasikan ${formatIdr(channelAllocations[1].monthlyBudgetIdr + channelAllocations[2].monthlyBudgetIdr)}/bln untuk TikTok Live & Meta Click-to-WhatsApp Ads.`,
        "Publikasikan 12 konten Reels/Short demo produk + pasang JSON-LD SEO pada halaman katalog.",
        "Rekrut 15 mikro-affiliate lokal berbasis komisi penjualan (tanpa biaya tetap di muka).",
      ],
      ownerAgent: "Agen Growth, SEO & Performance Ads AI",
    },
    {
      phase: "Fase 3 · Dominasi Retention & Kemitraan B2B",
      windowLabel: "Hari 61 – 90",
      objective: "Kunci pertumbuhan omzet berkelanjutan lewat langganan bulanan, VIP Tier & jalur B2B.",
      targetRevenueLiftPct: targetGrowthPct,
      deliverables: [
        "Aktifkan skema VIP Loyalty Tier (Silver 3%, Gold 7%, Platinum 12%) di Sovereign POS.",
        "Kirim proposal kemitraan grosir & corporate gifting ke 30 prospek B2B potensial.",
        "Audit ROAS per kanal, pangkas iklan ROAS < Break-Even, & gandakan kanal pemenang.",
      ],
      ownerAgent: "Agen Strategist & Revenue Forecaster AI",
    },
  ];

  const campaignScripts: CampaignScriptPack[] = [
    {
      id: "scr-wa-vip",
      channel: "WhatsApp Broadcast VIP",
      title: "Broadcast Payday & Paket Bundling 1 Ongkir",
      targetAudience: `Database ${params.contacts.length} Pelanggan & Prospek WA`,
      scriptBody: `Halo Kak! 👋 Spesial minggu ini di *${params.storeProfile.businessName}*:\n\n🔥 *Paket Hemat Bundling "${heroProductName}"* langsung diskon 12% + *1x Ongkir saja*!\n✅ Bisa *QRIS Instan* atau *COD Bayar di Tempat*\n✅ Stok terbatas 20 paket pertama hari ini.\n\nBalas *"MAU PAKET"* sekarang agar langsung disiapkan invoice & resinya oleh tim kami ya Kak!`,
    },
    {
      id: "scr-tiktok",
      channel: "TikTok Live & Short",
      title: "Skrip Video 30 Detik Hook Masalah → Demo → CTA",
      targetAudience: "Pembeli Impulsif & Pencari Solusi Cepat",
      scriptBody: `[0-3 dtk HOOK]: "Jangan beli satuan kalau bisa hemat puluhan ribu + 1 ongkir!"\n[4-18 dtk DEMO]: Tunjukkan langsung kualitas "${heroProductName}" + perbandingan kemasan/manfaat nyata.\n[19-25 dtk BUKTI]: Tunjukkan resi pengiriman hari ini & testimoni chat pembeli puas.\n[26-30 dtk CTA]: "Klik keranjang sekarang atau chat WA di bio, bisa COD ke seluruh Indonesia!"`,
    },
    {
      id: "scr-ig",
      channel: "Instagram Reels & Carousel",
      title: "Carousel Edukasi 5 Slide Konversi Tinggi",
      targetAudience: "Followers & Lookalike Audience Meta Ads",
      scriptBody: `Slide 1: 3 Alasan Kenapa Pelanggan Repeat Order "${heroProductName}" Setiap Bulan\nSlide 2: Kualitas Terjaga (Stok FIFO Selalu Segar)\nSlide 3: Simulasi Hemat Beli Paket Bundling vs Satuan\nSlide 4: Testimoni Asli Pembeli & Garansi Amanah\nSlide 5: Klik Link WA di Bio → Ketik "PROMO" untuk klaim voucher bebas admin COD!`,
    },
    {
      id: "scr-b2b",
      channel: "Penawaran B2B / Reseller",
      title: "Penawaran Resmi Kemitraan Grosir & Korporat",
      targetAudience: "Pemilik Toko, Kafe, Reseller & HRD/Procurement Kantor",
      scriptBody: `Yth. Bapak/Ibu Pimpinan,\n\nKami dari *${params.storeProfile.businessName}* menawarkan kerja sama pasokan produk unggulan (${heroProductName} & lini katalog lengkap) dengan skema:\n• Diskon Grosir Bertingkat (min. 5, 10, & 25 unit)\n• Dukungan Faktur Resmi & Laporan Transparan\n• Pengiriman prioritas terjadwal.\n\nBalas pesan ini untuk menerima daftar harga grosir & sampel produk minggu ini.`,
    },
  ];

  const agentPipeline: MarketingAgentTraceStep[] = [
    {
      agentNumber: 1,
      agentName: "Agent 1 · Data Collector & Telemetry Intelligence",
      roleTitle: "Pengumpul Data Real-Time Katalog, POS, CRM & Keuangan",
      status: "completed",
      keyFindings: [
        `Mengumpulkan ${params.products.length} SKU, ${validOrders.length} order valid, ${params.contacts.length} kontak CRM, & ${params.conversations.length} percakapan.`,
        `Baseline omzet bulanan ${formatIdr(baselineMonthlyRevenueIdr)} | AOV ${formatIdr(avgOrderValueIdr)} | Margin Kotor ${grossMarginPct}%.`,
      ],
    },
    {
      agentNumber: 2,
      agentName: "Agent 2 · SWOT, Funnel Leak & Persona Analyst",
      roleTitle: "Analisis Keunggulan, Kebocoran Funnel & 4 Persona Pembeli",
      status: "completed",
      keyFindings: [
        `Produk Hero: "${heroProductName}" · Modal Stok Terbesar: "${overstockProductName}" (${formatIdr(overstockTiedCapitalIdr)}).`,
        `Memetakan 4 persona pembeli utama dengan strategi penawaran & kanal paling responsif.`,
      ],
    },
    {
      agentNumber: 3,
      agentName: "Agent 3 · Budget, ROAS & 90-Day Revenue Forecaster",
      roleTitle: "Simulasi Anggaran Iklan, Break-Even ROAS & Proyeksi Laba",
      status: "completed",
      keyFindings: [
        `Anggaran ${formatIdr(monthlyBudgetIdr)}/bln diproyeksikan menghasilkan Blended ROAS ${blendedRoas}x (Break-Even ROAS ${breakEvenRoas}x).`,
        `Proyeksi Omzet 90 Hari: ${formatIdr(projected90dRevenueIdr)} · Estimasi Laba Bersih: ${formatIdr(projected90dNetProfitIdr)} · Rasio LTV:CAC ${ltvToCacRatio}x.`,
      ],
    },
    {
      agentNumber: 4,
      agentName: "Agent 4 · 90-Day Omnichannel Blueprint Architect",
      roleTitle: "Perancang Roadmap 3 Fase & 4 Paket Skrip Kampanye Siap Pakai",
      status: "completed",
      keyFindings: [
        `Menyusun 3 Fase Roadmap 90 Hari fokus pada "${focus}".`,
        "Menghasilkan 4 paket naskah kampanye siap eksekusi (WA VIP, TikTok Live, IG Carousel, B2B).",
      ],
    },
    {
      agentNumber: 5,
      agentName: "Agent 5 · Campaign Execution & ROI Optimizer",
      roleTitle: "Manajemen Inisiatif Kampanye & Cetak Blueprint Eksekutif",
      status: "completed",
      keyFindings: [
        "Siap mengelola persetujuan kampanye, pelacakan status (Draft→Berjalan→Selesai), & ekspor laporan Direksi.",
      ],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    businessName: params.storeProfile.businessName,
    strategicFocus: focus,
    monthlyBudgetIdr,
    targetGrowthPct,
    dataMetrics: {
      baselineMonthlyRevenueIdr,
      avgOrderValueIdr,
      grossMarginPct,
      totalProducts: params.products.length,
      totalContacts: params.contacts.length,
      openConversations,
      heroProductName,
      overstockProductName,
      overstockTiedCapitalIdr,
    },
    swot,
    personas,
    forecast: {
      projected30dRevenueIdr,
      projected60dRevenueIdr,
      projected90dRevenueIdr,
      projected90dNetProfitIdr,
      blendedRoas,
      breakEvenRoas,
      estimatedCacIdr,
      estimatedLtvIdr,
      ltvToCacRatio,
      channelAllocations,
    },
    roadmap90Days,
    campaignScripts,
    agentPipeline,
  };
}

const MARKETING_INITIATIVES_KEY_PREFIX = "wacrm_sovereign_mkt_initiatives_v53_";

export function getDefaultMarketingInitiatives(
  blueprint: EnterpriseMarketingBlueprint,
): MarketingCampaignInitiative[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "cmp-1",
      title: `Broadcast WA VIP — Bundling "${blueprint.dataMetrics.heroProductName}"`,
      channel: "WhatsApp CRM",
      budgetIdr: blueprint.forecast.channelAllocations[0]?.monthlyBudgetIdr ?? 1_000_000,
      targetRevenueIdr: blueprint.forecast.channelAllocations[0]?.projectedMonthlyRevenueIdr ?? 8_500_000,
      ownerPic: "Tim CRM & CS AI",
      status: "approved",
      notes: "Fokus repeat buyer & payday tanggal 25–28.",
      updatedAt: today,
    },
    {
      id: "cmp-2",
      title: "TikTok Live Harian + Affiliate Micro-Creator",
      channel: "TikTok Live & Shop",
      budgetIdr: blueprint.forecast.channelAllocations[1]?.monthlyBudgetIdr ?? 1_500_000,
      targetRevenueIdr: blueprint.forecast.channelAllocations[1]?.projectedMonthlyRevenueIdr ?? 6_600_000,
      ownerPic: "Tim Konten & Live",
      status: "running",
      notes: "Demo produk langsung + promo 1 ongkir COD.",
      updatedAt: today,
    },
  ];
}

export function loadMarketingInitiatives(
  tenantId: string,
  fallbackBlueprint: EnterpriseMarketingBlueprint,
): MarketingCampaignInitiative[] {
  if (typeof window === "undefined") return getDefaultMarketingInitiatives(fallbackBlueprint);
  try {
    const raw = window.localStorage.getItem(`${MARKETING_INITIATIVES_KEY_PREFIX}${tenantId}`);
    if (!raw) return getDefaultMarketingInitiatives(fallbackBlueprint);
    const parsed = JSON.parse(raw) as MarketingCampaignInitiative[];
    return Array.isArray(parsed) ? parsed : getDefaultMarketingInitiatives(fallbackBlueprint);
  } catch {
    return getDefaultMarketingInitiatives(fallbackBlueprint);
  }
}

export function saveMarketingInitiatives(
  tenantId: string,
  items: MarketingCampaignInitiative[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${MARKETING_INITIATIVES_KEY_PREFIX}${tenantId}`, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function escMktHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarketingStrategyPrintHtml(
  bp: EnterpriseMarketingBlueprint,
  initiatives: MarketingCampaignInitiative[],
): string {
  const channelRows = bp.forecast.channelAllocations
    .map(
      (c) => `<tr>
        <td><strong>${escMktHtml(c.channel)}</strong></td>
        <td class="center">${c.sharePct}%</td>
        <td class="right">${escMktHtml(formatIdr(c.monthlyBudgetIdr))}</td>
        <td class="center">${c.projectedRoas}x</td>
        <td class="right"><strong>${escMktHtml(formatIdr(c.projectedMonthlyRevenueIdr))}</strong></td>
        <td>${escMktHtml(c.primaryKpi)}</td>
      </tr>`,
    )
    .join("");

  const roadmapRows = bp.roadmap90Days
    .map(
      (r) => `<tr>
        <td><strong>${escMktHtml(r.phase)}</strong><br/><span class="muted">${escMktHtml(r.windowLabel)}</span></td>
        <td>${escMktHtml(r.objective)}</td>
        <td class="center">+${r.targetRevenueLiftPct}%</td>
        <td>${r.deliverables.map((d) => `• ${escMktHtml(d)}`).join("<br/>")}</td>
      </tr>`,
    )
    .join("");

  const initRows = initiatives
    .map(
      (i) => `<tr>
        <td><strong>${escMktHtml(i.title)}</strong></td>
        <td>${escMktHtml(i.channel)}</td>
        <td class="right">${escMktHtml(formatIdr(i.budgetIdr))}</td>
        <td class="right">${escMktHtml(formatIdr(i.targetRevenueIdr))}</td>
        <td class="center"><strong>${escMktHtml(i.status.toUpperCase())}</strong></td>
      </tr>`,
    )
    .join("");

  return `
    <div style="border-bottom:3px solid #b45309;padding-bottom:10px;margin-bottom:14px;">
      <h1 style="margin:0;color:#0f172a;font-size:20px;">BLUEPRINT STRATEGI PEMASARAN ENTERPRISE (MULTI-AGENT AI)</h1>
      <div style="font-size:13px;font-weight:700;color:#b45309;margin-top:2px;">${escMktHtml(bp.businessName)} · Fokus: ${escMktHtml(bp.strategicFocus)}</div>
      <div class="muted">Anggaran: ${escMktHtml(formatIdr(bp.monthlyBudgetIdr))}/bln · Blended ROAS: ${bp.forecast.blendedRoas}x (Break-Even ${bp.forecast.breakEvenRoas}x) · Proyeksi Omzet 90 Hari: ${escMktHtml(formatIdr(bp.forecast.projected90dRevenueIdr))} · LTV:CAC ${bp.forecast.ltvToCacRatio}x</div>
    </div>

    <h3>1. Alokasi Anggaran &amp; Proyeksi ROAS Multi-Kanal</h3>
    <table>
      <thead><tr><th>Kanal Pemasaran</th><th class="center">Porsi</th><th class="right">Budget/Bln</th><th class="center">Est. ROAS</th><th class="right">Proyeksi Omzet/Bln</th><th>KPI Utama</th></tr></thead>
      <tbody>${channelRows}</tbody>
    </table>

    <h3 style="margin-top:14px;">2. Roadmap Eksekusi Strategi Pemasaran 90 Hari</h3>
    <table>
      <thead><tr><th>Fase</th><th>Objektif Strategis</th><th class="center">Target Lift</th><th>Deliverables Utama</th></tr></thead>
      <tbody>${roadmapRows}</tbody>
    </table>

    <h3 style="margin-top:14px;">3. Inisiatif Kampanye Aktif (${initiatives.length})</h3>
    <table>
      <thead><tr><th>Inisiatif Kampanye</th><th>Kanal</th><th class="right">Budget</th><th class="right">Target Omzet</th><th class="center">Status</th></tr></thead>
      <tbody>${initRows}</tbody>
    </table>
  `;
}
