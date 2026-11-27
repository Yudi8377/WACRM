import { describe, expect, it } from "vitest";
import { buildDefaultAiAgents, buildOrderRecord } from "@/lib/ai-agents";
import { processCompanionTurn } from "@/lib/ai-companion-engine";
import type { ErpProductRecord } from "@/lib/crm-types";
import { createDemoWorkspaceAdapter } from "@/lib/demo-store";
import { APP_EDITIONS, editionHasFeature, getEditionById } from "@/lib/editions";
import {
  buildEscPosEdcCompact,
  buildEscPosReceipt,
  buildEscPosShippingLabel,
  detectPrinterCapabilities,
  printViaUsbOtg,
  printViaUsbSerialEdc,
} from "@/lib/printer";
import {
  auditProductSeo,
  computeStoreSeoSummary,
  generateOmnichannelSeoPack,
  slugifySeo,
} from "@/lib/seo-engine";
import { getDefaultStoreProfile } from "@/lib/store-profile";
import {
  applySuperAdminAutoFix,
  applySuperAdminTenantUpdate,
  computeSuperAdminOverview,
  loadStoredSuperAdminTenants,
} from "@/lib/super-admin";

const sampleProduct: ErpProductRecord = {
  id: "prod-1",
  sku: "KOPI-GAYO-1KG",
  name: "Kopi Arabika Gayo Specialty Roasted 1Kg",
  category: "Minuman & Kopi",
  description:
    "Kopi Arabika Gayo specialty freshly roasted dengan aroma cokelat dan floral, kemasan valve 1Kg cocok untuk kedai kopi, kafe, dan stok rumah tangga.",
  unit: "kg",
  unitPrice: 185000,
  costPrice: 112000,
  stockQty: 45,
  minStock: 10,
  isActive: true,
  createdAt: "2026-11-26T00:00:00.000Z",
  updatedAt: "2026-11-26T00:00:00.000Z",
};

const weakSeoProduct: ErpProductRecord = {
  ...sampleProduct,
  id: "prod-2",
  sku: "X1",
  name: "Kopi",
  category: "Umum",
  description: "Enak.",
  stockQty: 0,
};

describe("WACRM v4.0.0 — Universal Printing (USB-C/Micro-USB OTG, Inkjet, LaserJet, Thermal, EDC)", () => {
  it("builds compact 32-col EDC ESC/POS slip alongside Invoice & Shipping Label with zero WACRM branding", () => {
    const store = getDefaultStoreProfile("Toko Kopi Nusantara");
    const order = buildOrderRecord({
      id: "ord-1",
      workspaceName: store.businessName,
      customerName: "Budi Santoso",
      customerPhone: "+628123456789",
      shippingAddress: "Jl. Dhoho No. 12, Kediri",
      channel: "whatsapp",
      paymentMethod: "qris",
      paymentStatus: "paid",
      items: [
        {
          id: "item-1",
          productId: sampleProduct.id,
          sku: sampleProduct.sku,
          productName: sampleProduct.name,
          quantity: 2,
          unitPrice: sampleProduct.unitPrice,
          costPrice: sampleProduct.costPrice,
        },
      ],
      aiGenerated: true,
    });

    const edc = buildEscPosEdcCompact(order, store);
    const receipt = buildEscPosReceipt(order, store);
    const label = buildEscPosShippingLabel(order, store);

    expect(edc.bytes.length).toBeGreaterThan(40);
    expect(edc.plainText).toContain("TOKO KOPI NUSANTARA");
    expect(edc.plainText).toContain("SLIP EDC");
    const visibleLines = edc.plainText
      .split("\n")
      .filter((line) => !line.startsWith("QR:"))
      .join("\n");
    expect(visibleLines).not.toContain("WACRM");
    expect(receipt.plainText).toContain("TOKO KOPI NUSANTARA");
    expect(label.plainText).toContain("LABEL PENGIRIMAN PESANAN");
  });

  it("gracefully reports fallback guidance for USB OTG & USB Serial EDC in non-WebUSB environments", async () => {
    const caps = detectPrinterCapabilities();
    expect(caps.isAndroidApk).toBe(false);

    const dummyEsc = { bytes: new Uint8Array([0x1b, 0x40]), base64: "G0A=", plainText: "TEST" };
    const usbRes = await printViaUsbOtg(dummyEsc, "Invoice Test");
    const edcRes = await printViaUsbSerialEdc(dummyEsc, "Slip EDC Test");
    expect(usbRes.ok).toBe(false);
    expect(usbRes.method).toBe("fallback");
    expect(edcRes.ok).toBe(false);
    expect(edcRes.method).toBe("fallback");
  });
});

describe("WACRM v4.0.0 — Omnichannel SEO Engine & 9th AI Agent (seo_growth)", () => {
  it("registers all 9 autonomous AI agents including seo_growth", () => {
    const agents = buildDefaultAiAgents();
    expect(agents).toHaveLength(9);
    expect(agents.map((a) => a.agentKey)).toContain("seo_growth");
  });

  it("audits product SEO scores accurately and generates valid 6-channel JSON-LD SEO packs", () => {
    const store = getDefaultStoreProfile("Toko Kopi Nusantara");
    const strongAudit = auditProductSeo(sampleProduct, store);
    const weakAudit = auditProductSeo(weakSeoProduct, store);

    expect(strongAudit.score).toBeGreaterThanOrEqual(85);
    expect(strongAudit.grade).toBe("A");
    expect(weakAudit.score).toBeLessThan(70);
    expect(weakAudit.issues.length).toBeGreaterThan(0);

    const pack = generateOmnichannelSeoPack(sampleProduct, store);

    expect(slugifySeo(sampleProduct.name)).toBe("kopi-arabika-gayo-specialty-roasted-1kg");
    expect(pack.google.slug).toContain("kopi-arabika-gayo");
    const parsedJsonLd = JSON.parse(pack.google.jsonLd) as {
      "@type": string;
      sku: string;
      offers: { priceCurrency: string; price: number };
    };
    expect(parsedJsonLd["@type"]).toBe("Product");
    expect(parsedJsonLd.sku).toBe("KOPI-GAYO-1KG");
    expect(parsedJsonLd.offers.priceCurrency).toBe("IDR");
    expect(parsedJsonLd.offers.price).toBe(185000);

    expect(pack.whatsapp.broadcastCopy).toContain("Kopi Arabika Gayo");
    expect(pack.instagram.hashtags.length).toBeGreaterThan(3);
    expect(pack.tiktok.videoHook.length).toBeGreaterThan(10);
    expect(pack.youtube.tags.length).toBeGreaterThan(2);
    expect(pack.facebook.marketplaceTitle).toContain("Kopi Arabika");

    const summary = computeStoreSeoSummary([sampleProduct, weakSeoProduct], store);
    expect(summary.totalProducts).toBe(2);
    expect(summary.optimizedCount).toBe(1);
    expect(summary.needsAttentionCount).toBe(1);
  });
});

describe("WACRM v4.0.0 — Multi-Edition Tiered Versioning", () => {
  it("defines 4 ascending tiers with strict feature gating", () => {
    expect(APP_EDITIONS).toHaveLength(4);
    expect(APP_EDITIONS.map((e) => e.id)).toEqual(["starter", "pro", "enterprise", "sovereign"]);

    const starter = getEditionById("starter");
    const enterprise = getEditionById("enterprise");
    const sovereign = getEditionById("sovereign");

    expect(starter.monthlyPriceIdr).toBe(0);
    expect(enterprise.monthlyPriceIdr).toBeGreaterThan(starter.monthlyPriceIdr);
    expect(sovereign.monthlyPriceIdr).toBeGreaterThan(enterprise.monthlyPriceIdr);

    expect(editionHasFeature("starter", "seo_growth_ai")).toBe(false);
    expect(editionHasFeature("pro", "seo_growth_ai")).toBe(true);
    expect(editionHasFeature("pro", "super_admin_analytics")).toBe(false);
    expect(editionHasFeature("enterprise", "universal_printing_usb_edc")).toBe(true);
    expect(editionHasFeature("enterprise", "super_admin_analytics")).toBe(true);
    expect(editionHasFeature("sovereign", "custom_branded_apk")).toBe(true);
    expect(editionHasFeature("sovereign", "dedicated_db_sla")).toBe(true);
  });
});

describe("WACRM v4.0.0 — Super Admin Command Center & SWOT Auto-Fix", () => {
  it("computes MRR/ARR, edition breakdown, SWOT insights, and executes 1-click Auto-Fix actions", () => {
    const tenants = loadStoredSuperAdminTenants();
    const overview = computeSuperAdminOverview({ tenants, source: "demo" });

    expect(overview.summary.totalTenants).toBeGreaterThanOrEqual(4);
    expect(overview.summary.mrrIdr).toBeGreaterThan(0);
    expect(overview.summary.arrIdr).toBe(overview.summary.mrrIdr * 12);
    expect(overview.strengths.length).toBeGreaterThan(0);
    expect(overview.weaknesses.length).toBeGreaterThan(0);
    expect(overview.opportunities.length).toBeGreaterThan(0);

    // Update a tenant edition
    const first = tenants[0];
    const updated = applySuperAdminTenantUpdate(tenants, first.tenantId, {
      editionId: "sovereign",
      subscriptionStatus: "active",
    });
    const refreshedFirst = updated.find((t) => t.tenantId === first.tenantId)!;
    expect(refreshedFirst.editionId).toBe("sovereign");
    expect(refreshedFirst.monthlyPriceIdr).toBe(getEditionById("sovereign").monthlyPriceIdr);

    // Execute Auto-Fix on the past_due imbalanced tenant
    const troubled = updated.find((t) => !t.ledgerBalanced)!;
    const healed = applySuperAdminAutoFix(updated, troubled.tenantId);
    const healedTenant = healed.find((t) => t.tenantId === troubled.tenantId)!;
    expect(healedTenant.ledgerBalanced).toBe(true);
    expect(healedTenant.healthScore).toBeGreaterThanOrEqual(96);
    expect(healedTenant.detectedIssues).toHaveLength(0);
  });
});

describe("WACRM v4.0.0 — AI Companion Voice/Text Navigation for v4 Modules", () => {
  it("routes user voice/text queries to SEO Growth, Universal Printing, Editions & Super Admin", async () => {
    const adapter = createDemoWorkspaceAdapter();
    const snapshot = await adapter.loadAll();
    const store = getDefaultStoreProfile("Toko Berkah Nusantara");

    const seoTurn = processCompanionTurn({
      userText: "Tolong bantu optimasi SEO produk ke Google dan TikTok",
      activeTab: "inbox",
      snapshot,
      storeProfile: store,
      pendingAction: null,
    });
    expect(seoTurn.navigateToTab).toBe("seo_growth");

    const printTurn = processCompanionTurn({
      userText: "Bagaimana cara cetak invoice pakai kabel USB-C OTG ke printer Inkjet atau EDC?",
      activeTab: "inbox",
      snapshot,
      storeProfile: store,
      pendingAction: null,
    });
    expect(printTurn.navigateToTab).toBe("pos");

    const edTurn = processCompanionTurn({
      userText: "Lihat perbandingan edisi dan paket aplikasi",
      activeTab: "inbox",
      snapshot,
      storeProfile: store,
      pendingAction: null,
    });
    expect(edTurn.navigateToTab).toBe("editions");

    const saTurn = processCompanionTurn({
      userText: "Buka dashboard super admin untuk analisis kelemahan produk",
      activeTab: "inbox",
      snapshot,
      storeProfile: store,
      pendingAction: null,
    });
    expect(saTurn.navigateToTab).toBe("super_admin");
  });
});
