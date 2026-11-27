import {
  formatIdr,
  type AppEditionId,
  type PlatformSwotInsight,
  type StoreBusinessProfile,
  type SubscriptionStatus,
  type SuperAdminOverview,
  type SuperAdminTenantRecord,
} from "@/lib/crm-types";
import { APP_EDITIONS, getEditionById } from "@/lib/editions";
import { computeStoreSeoSummary } from "@/lib/seo-engine";
import type { WorkspaceSnapshot } from "@/lib/workspace-adapter";

const SUPER_ADMIN_STORAGE_KEY = "wacrm_super_admin_tenants_v4";

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function buildSeededPlatformTenants(): SuperAdminTenantRecord[] {
  return [
    {
      tenantId: "tenant-kediri-kopi",
      businessName: "CV Sumber Kopi Nusantara",
      ownerName: "Budi Santoso",
      ownerEmail: "budi@sumberkopi.id",
      editionId: "enterprise",
      subscriptionStatus: "active",
      monthlyPriceIdr: 699_000,
      activeAgents: 8,
      totalContacts: 1_420,
      totalConversations: 486,
      connectedChannels: 4,
      ordersCount: 194,
      gmvIdr: 86_450_000,
      healthScore: 96,
      seoScore: 88,
      aiAutoReplyRatePct: 91,
      escalationCount: 2,
      lowStockCount: 1,
      ledgerBalanced: true,
      lastActiveAt: hoursAgoIso(1),
      renewsAt: daysFromNowIso(21),
      detectedIssues: ["1 SKU mendekati batas stok minimum"],
    },
    {
      tenantId: "tenant-hijab-bandung",
      businessName: "Butik Zahra Fashion Bandung",
      ownerName: "Nadia Permata",
      ownerEmail: "nadia@zahrafashion.co.id",
      editionId: "pro",
      subscriptionStatus: "active",
      monthlyPriceIdr: 249_000,
      activeAgents: 5,
      totalContacts: 890,
      totalConversations: 312,
      connectedChannels: 3,
      ordersCount: 128,
      gmvIdr: 54_200_000,
      healthScore: 84,
      seoScore: 68,
      aiAutoReplyRatePct: 86,
      escalationCount: 5,
      lowStockCount: 3,
      ledgerBalanced: true,
      lastActiveAt: hoursAgoIso(2),
      renewsAt: daysFromNowIso(14),
      detectedIssues: [
        "Skor SEO katalog masih 68/100 (butuh optimasi TikTok & IG)",
        "5 eskalasi admin menunggu respons",
      ],
    },
    {
      tenantId: "tenant-elektronik-sby",
      businessName: "PT Surya Mandiri Distribusi",
      ownerName: "Hendra Wijaya",
      ownerEmail: "hendra@suryamandiri.id",
      editionId: "sovereign",
      subscriptionStatus: "active",
      monthlyPriceIdr: 1_950_000,
      activeAgents: 18,
      totalContacts: 6_340,
      totalConversations: 1_920,
      connectedChannels: 5,
      ordersCount: 642,
      gmvIdr: 412_800_000,
      healthScore: 98,
      seoScore: 92,
      aiAutoReplyRatePct: 94,
      escalationCount: 1,
      lowStockCount: 0,
      ledgerBalanced: true,
      lastActiveAt: hoursAgoIso(0.5),
      renewsAt: daysFromNowIso(27),
      detectedIssues: [],
    },
    {
      tenantId: "tenant-herbal-solo",
      businessName: "Toko Herbal Alami Solo",
      ownerName: "Rina Kusuma",
      ownerEmail: "rina@herbalsolo.id",
      editionId: "starter",
      subscriptionStatus: "trial",
      monthlyPriceIdr: 0,
      activeAgents: 2,
      totalContacts: 145,
      totalConversations: 64,
      connectedChannels: 1,
      ordersCount: 23,
      gmvIdr: 7_350_000,
      healthScore: 71,
      seoScore: 54,
      aiAutoReplyRatePct: 62,
      escalationCount: 3,
      lowStockCount: 2,
      ledgerBalanced: true,
      lastActiveAt: hoursAgoIso(19),
      renewsAt: daysFromNowIso(7),
      detectedIssues: [
        "Baru menghubungkan 1 kanal (Instagram & TikTok belum aktif)",
        "Kandidat kuat upgrade Starter → Growth Pro",
      ],
    },
    {
      tenantId: "tenant-frozen-malang",
      businessName: "Malang Frozen Express",
      ownerName: "Dedi Kurniawan",
      ownerEmail: "dedi@frozenexpress.id",
      editionId: "pro",
      subscriptionStatus: "past_due",
      monthlyPriceIdr: 249_000,
      activeAgents: 4,
      totalContacts: 520,
      totalConversations: 175,
      connectedChannels: 2,
      ordersCount: 79,
      gmvIdr: 29_100_000,
      healthScore: 63,
      seoScore: 61,
      aiAutoReplyRatePct: 78,
      escalationCount: 4,
      lowStockCount: 4,
      ledgerBalanced: false,
      lastActiveAt: hoursAgoIso(48),
      renewsAt: daysFromNowIso(-2),
      detectedIssues: [
        "Tagihan langganan lewat jatuh tempo (Past Due)",
        "Terdeteksi selisih pembukuan — butuh Auto-Fix Self-Healing",
        "4 SKU stok kritis",
      ],
    },
  ];
}

export function loadStoredSuperAdminTenants(): SuperAdminTenantRecord[] {
  if (typeof window === "undefined") return buildSeededPlatformTenants();
  try {
    const raw = window.localStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SuperAdminTenantRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  const seeded = buildSeededPlatformTenants();
  saveStoredSuperAdminTenants(seeded);
  return seeded;
}

export function saveStoredSuperAdminTenants(tenants: SuperAdminTenantRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(tenants));
  } catch {
    // ignore
  }
}

export function buildCurrentTenantTelemetry(params: {
  tenantId: string;
  snapshot: WorkspaceSnapshot;
  storeProfile: StoreBusinessProfile;
  editionId: AppEditionId;
}): SuperAdminTenantRecord {
  const { snapshot, storeProfile, editionId } = params;
  const edition = getEditionById(editionId);
  const seo = computeStoreSeoSummary(snapshot.products, storeProfile);
  const gmvIdr = snapshot.orders.reduce((s, o) => s + o.totalAmount, 0);
  const connectedChannels = snapshot.channels.filter((c) => c.status === "connected").length;
  const escalationCount = snapshot.conversations.filter((c) => c.tags.includes("perlu-admin")).length;
  const lowStockCount = snapshot.products.filter((p) => p.isActive && p.stockQty <= p.minStock).length;
  const ledgerBalanced = snapshot.financialReport.isBalanced;

  const issues: string[] = [];
  if (connectedChannels < 2) issues.push("Kanal omnichannel terhubung masih minim (<2 kanal).");
  if (escalationCount > 0) issues.push(`${escalationCount} chat eskalasi menunggu tindakan admin.`);
  if (lowStockCount > 0) issues.push(`${lowStockCount} produk stok menipis di bawah batas minimum.`);
  if (!ledgerBalanced) issues.push("Neraca akuntansi tidak seimbang — perlu Self-Healing.");
  if (seo.overallScore < 75) issues.push(`Skor SEO katalog ${seo.overallScore}/100 — jalankan AI SEO Growth.`);

  let health = 100;
  if (!ledgerBalanced) health -= 25;
  health -= Math.min(20, lowStockCount * 4);
  health -= Math.min(15, escalationCount * 5);
  if (connectedChannels === 0) health -= 15;

  return {
    tenantId: params.tenantId,
    businessName: storeProfile.businessName,
    ownerName: snapshot.members[0]?.displayName || "Pemilik Usaha",
    ownerEmail: storeProfile.email || "owner@tokoanda.id",
    editionId,
    subscriptionStatus: "active",
    monthlyPriceIdr: edition.monthlyPriceIdr,
    activeAgents: snapshot.members.length,
    totalContacts: snapshot.contacts.length,
    totalConversations: snapshot.conversations.length,
    connectedChannels,
    ordersCount: snapshot.orders.length,
    gmvIdr,
    healthScore: Math.max(30, health),
    seoScore: seo.overallScore,
    aiAutoReplyRatePct: snapshot.aiAgents.some((a) => a.agentKey === "cs_sales" && a.autoReplyEnabled) ? 92 : 40,
    escalationCount,
    lowStockCount,
    ledgerBalanced,
    lastActiveAt: snapshot.syncedAt,
    renewsAt: daysFromNowIso(28),
    isCurrentWorkspace: true,
    detectedIssues: issues,
  };
}

/**
 * Computes full Super Admin Platform Overview + Automated Strengths/Weaknesses/Opportunities Analyzer.
 */
export function computeSuperAdminOverview(params: {
  tenants: SuperAdminTenantRecord[];
  source: "neon" | "demo";
}): SuperAdminOverview {
  const { tenants, source } = params;
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.subscriptionStatus === "active").length;
  const trialTenants = tenants.filter((t) => t.subscriptionStatus === "trial").length;
  const pastDueOrSuspended = tenants.filter(
    (t) => t.subscriptionStatus === "past_due" || t.subscriptionStatus === "suspended",
  ).length;
  const totalUsersAgents = tenants.reduce((s, t) => s + t.activeAgents, 0);
  const totalOrders = tenants.reduce((s, t) => s + t.ordersCount, 0);
  const totalGmvIdr = tenants.reduce((s, t) => s + t.gmvIdr, 0);
  const mrrIdr = tenants
    .filter((t) => t.subscriptionStatus === "active")
    .reduce((s, t) => s + t.monthlyPriceIdr, 0);
  const avgHealthScore = totalTenants
    ? Math.round(tenants.reduce((s, t) => s + t.healthScore, 0) / totalTenants)
    : 100;
  const avgSeoScore = totalTenants
    ? Math.round(tenants.reduce((s, t) => s + t.seoScore, 0) / totalTenants)
    : 0;
  const avgAiAutomationPct = totalTenants
    ? Math.round(tenants.reduce((s, t) => s + t.aiAutoReplyRatePct, 0) / totalTenants)
    : 0;

  const editionBreakdown = APP_EDITIONS.map((ed) => {
    const group = tenants.filter((t) => t.editionId === ed.id);
    return {
      editionId: ed.id,
      label: ed.name,
      count: group.length,
      mrrIdr: group
        .filter((t) => t.subscriptionStatus === "active")
        .reduce((s, t) => s + t.monthlyPriceIdr, 0),
    };
  });

  // Automated Strengths & Weaknesses (SWOT) Product Intelligence
  const strengths: PlatformSwotInsight[] = [];
  const weaknesses: PlatformSwotInsight[] = [];
  const opportunities: PlatformSwotInsight[] = [];

  if (avgAiAutomationPct >= 80) {
    strengths.push({
      id: "str-ai",
      type: "strength",
      title: "Otomatisasi Multi-Agent AI Sangat Tinggi",
      metric: `${avgAiAutomationPct}% Auto-Reply`,
      detail: "Mayoritas percakapan pelanggan di seluruh tenant terjawab otomatis 24/7 tanpa klik manual dan langsung terhubung ke stok ERP & POS.",
    });
  }

  const balancedCount = tenants.filter((t) => t.ledgerBalanced).length;
  strengths.push({
    id: "str-accounting",
    type: "strength",
    title: "Integritas Pembukuan Double-Entry & White-Label",
    metric: `${balancedCount}/${totalTenants} Seimbang`,
    detail: "Transaksi POS lunas otomatis menerbitkan Invoice White-Label, Label Pengiriman QR & jurnal Kas/Piutang seimbang.",
  });

  strengths.push({
    id: "str-gmv",
    type: "strength",
    title: "Traksi Transaksi & Nilai GMV Aktif",
    metric: formatIdr(totalGmvIdr),
    detail: `${totalOrders} pesanan POS tercatat melintasi ${totalUsersAgents} agen aktif Desktop & Android.`,
  });

  if (pastDueOrSuspended > 0) {
    weaknesses.push({
      id: "wk-churn",
      type: "weakness",
      title: "Risiko Churn / Tagihan Langganan Menunggak",
      metric: `${pastDueOrSuspended} Tenant`,
      detail: "Ada tenant berstatus Past Due / Suspended yang berpotensi berhenti jika tidak segera dihubungi atau dibantu kendalanya.",
      recommendedFix: "Kirim pengingat perpanjangan otomatis & aktifkan masa tenggang 7 hari.",
    });
  }

  const lowSeoTenants = tenants.filter((t) => t.seoScore < 75);
  if (lowSeoTenants.length > 0) {
    weaknesses.push({
      id: "wk-seo",
      type: "weakness",
      title: "Optimasi SEO Produk Belum Merata",
      metric: `${lowSeoTenants.length} Tenant < 75`,
      detail: `Skor SEO rata-rata masih ${avgSeoScore}/100. Deskripsi produk yang singkat membatasi traffic organik dari Google, TikTok & Instagram.`,
      recommendedFix: "Jalankan AI SEO Growth Agent massal untuk melengkapi meta tag & copy 6 kanal.",
    });
  }

  const totalEscalations = tenants.reduce((s, t) => s + t.escalationCount, 0);
  if (totalEscalations > 0) {
    weaknesses.push({
      id: "wk-esc",
      type: "weakness",
      title: "Antrean Eskalasi Admin Perlu Dipercepat",
      metric: `${totalEscalations} Tiket Eskalasi`,
      detail: "Beberapa pertanyaan sensitif/refund masih menunggu respons admin manusia di masing-masing tenant.",
      recommendedFix: "Tambahkan SOP kebijakan refund di Knowledge Base & aktifkan notifikasi push Android.",
    });
  }

  const imbalancedCount = tenants.filter((t) => !t.ledgerBalanced).length;
  if (imbalancedCount > 0) {
    weaknesses.push({
      id: "wk-ledger",
      type: "weakness",
      title: "Selisih Neraca Terdeteksi pada Tenant",
      metric: `${imbalancedCount} Workspace`,
      detail: "Ada jurnal manual tidak berpasangan yang perlu segera dipulihkan oleh System Guardian AI.",
      recommendedFix: "Klik tombol Auto-Fix pada tenant terkait untuk menjalankan Self-Healing otomatis.",
    });
  }

  const starterCount = tenants.filter((t) => t.editionId === "starter").length;
  if (starterCount > 0) {
    opportunities.push({
      id: "opp-upgrade",
      type: "opportunity",
      title: "Potensi Konversi Upgrade Starter → Growth Pro",
      metric: `+${formatIdr(starterCount * 249_000)}/bln`,
      detail: `${starterCount} tenant Starter aktif bertransaksi dan berpeluang besar naik ke Growth Pro untuk fitur SEO AI & ERP penuh.`,
    });
  }

  opportunities.push({
    id: "opp-usb-edc",
    type: "opportunity",
    title: "Ekspansi Cetak USB-C OTG, EDC & Inkjet/LaserJet",
    metric: "Android + iOS + PC",
    detail: "Dukungan cetak universal via USB-C/Micro-USB, AirPrint iOS & EDC membuka pasar toko ritel, apotek, dan grosir tanpa wajib beli printer Bluetooth baru.",
  });

  return {
    generatedAt: new Date().toISOString(),
    source,
    summary: {
      totalTenants,
      activeTenants,
      trialTenants,
      pastDueOrSuspended,
      totalUsersAgents,
      totalOrders,
      totalGmvIdr,
      mrrIdr,
      arrIdr: mrrIdr * 12,
      avgHealthScore,
      avgSeoScore,
      avgAiAutomationPct,
    },
    editionBreakdown,
    tenants,
    strengths,
    weaknesses,
    opportunities,
  };
}

export function applySuperAdminTenantUpdate(
  tenants: SuperAdminTenantRecord[],
  tenantId: string,
  patch: Partial<{ editionId: AppEditionId; subscriptionStatus: SubscriptionStatus }>,
): SuperAdminTenantRecord[] {
  return tenants.map((t) => {
    if (t.tenantId !== tenantId) return t;
    const nextEdition = patch.editionId ?? t.editionId;
    const nextPrice = getEditionById(nextEdition).monthlyPriceIdr;
    return {
      ...t,
      editionId: nextEdition,
      monthlyPriceIdr: nextPrice,
      subscriptionStatus: patch.subscriptionStatus ?? t.subscriptionStatus,
    };
  });
}

export function applySuperAdminAutoFix(
  tenants: SuperAdminTenantRecord[],
  tenantId: string,
): SuperAdminTenantRecord[] {
  return tenants.map((t) => {
    if (t.tenantId !== tenantId) return t;
    return {
      ...t,
      ledgerBalanced: true,
      lowStockCount: 0,
      seoScore: Math.max(t.seoScore, 88),
      healthScore: Math.max(t.healthScore, 96),
      detectedIssues: [],
      lastActiveAt: new Date().toISOString(),
    };
  });
}
