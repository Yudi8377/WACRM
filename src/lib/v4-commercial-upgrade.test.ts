import { beforeEach, describe, expect, it } from "vitest";
import { POST as forgotPasswordPost } from "@/app/api/auth/forgot-password/route";
import { POST as licenseVerifyPost } from "@/app/api/license/verify/route";
import {
  COMMERCIAL_DEMO_ACCOUNTS,
  evaluateEditionQuota,
  evaluateTabAccess,
} from "@/lib/access-control";
import {
  buildDefaultAiAgents,
  buildDoubleEntryForOrder,
  buildProactiveFollowUpReply,
  orchestrateMultiAgentReply,
} from "@/lib/ai-agents";
import type { AiAgentRecord, ErpProductRecord, PosOrderRecord } from "@/lib/crm-types";
import { renderInvoicePrintHtml } from "@/lib/printer";
import {
  checkRateLimit,
  evaluatePasswordStrength,
  resetRateLimitBucketsForTest,
  sanitizeImageUrl,
  sanitizePhoneDigits,
  sanitizeTrackingUrl,
} from "@/lib/security";
import { buildCourierKnowledgeSummary, getDefaultMasterData } from "@/lib/store-profile";

const SAMPLE_AGENTS: AiAgentRecord[] = buildDefaultAiAgents().map((a, idx) => ({
  ...a,
  id: `agent-${idx + 1}`,
}));

const SAMPLE_PRODUCTS: ErpProductRecord[] = [
  {
    id: "prod-1",
    sku: "KOPI-GAYO-1KG",
    name: "Kopi Arabika Gayo 1Kg",
    category: "Minuman & Kopi",
    description: "Biji kopi Arabika Gayo specialty grade roasted segar.",
    unit: "kg",
    unitPrice: 185000,
    costPrice: 120000,
    stockQty: 50,
    minStock: 10,
    isActive: true,
    weightGrams: 1000,
    imageUrl: "https://example.com/kopi-gayo.jpg",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "prod-2",
    sku: "TEH-MATCHA-250",
    name: "Matcha Uji Ceremonial 250g",
    category: "Minuman & Kopi",
    description: "Bubuk matcha murni dari Uji Jepang untuk latte & dessert.",
    unit: "pack",
    unitPrice: 135000,
    costPrice: 80000,
    stockQty: 30,
    minStock: 5,
    isActive: true,
    weightGrams: 250,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "prod-3",
    sku: "MADU-HUTAN-500",
    name: "Madu Hutan Liar 500ml",
    category: "Kesehatan",
    description: "Madu hutan murni tanpa pemanis tambahan, kaya antioksidan.",
    unit: "botol",
    unitPrice: 95000,
    costPrice: 55000,
    stockQty: 40,
    minStock: 8,
    isActive: true,
    weightGrams: 600,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("v4.2 Commercial Upgrade — Security Hardening", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTest();
  });

  it("sanitizes image URLs against XSS/SVG/javascript injection while allowing safe HTTPS & raster data URIs", () => {
    expect(sanitizeImageUrl("https://cdn.example.com/pic.png")).toBe("https://cdn.example.com/pic.png");
    expect(sanitizeImageUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe(
      "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    );
    expect(sanitizeImageUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeImageUrl("data:image/svg+xml;base64,PHN2Zy8+")).toBeNull();
    expect(sanitizeImageUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(sanitizeImageUrl("ftp://unsafe.local/a.png")).toBeNull();
  });

  it("sanitizes phone digits and tracking URLs safely", () => {
    expect(sanitizePhoneDigits("+62 812-3456-7890")).toBe("6281234567890");
    expect(sanitizeTrackingUrl("https://cekresi.com/?noresi={resi}", "JNE-12345")).toBe(
      "https://cekresi.com/?noresi=JNE-12345",
    );
    expect(sanitizeTrackingUrl("javascript:alert('{resi}')", "123")).toBeNull();
  });

  it("evaluates password strength accurately for commercial auth", () => {
    const weak = evaluatePasswordStrength("123456");
    expect(weak.isCommercialReady).toBe(false);
    expect(weak.score).toBeLessThan(2);

    const strong = evaluatePasswordStrength("WaCrm#2026Strong!");
    expect(strong.isCommercialReady).toBe(true);
    expect(strong.score).toBe(4);
  });

  it("enforces sliding-window rate limits cleanly", () => {
    const r1 = checkRateLimit("test:ip:1", 2, 60_000);
    const r2 = checkRateLimit("test:ip:1", 2, 60_000);
    const r3 = checkRateLimit("test:ip:1", 2, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("escapes single quotes and HTML payloads inside printable invoice HTML and displays shipping fee", () => {
    const order: PosOrderRecord = {
      id: "ord-xss",
      invoiceNumber: "INV-XSS-1",
      conversationId: null,
      contactId: null,
      customerName: `Budi <script>alert('xss')</script> "Test"`,
      customerPhone: "62812345",
      shippingAddress: `Jl. 'Merdeka' <img src=x onerror=alert(1)>`,
      channel: "whatsapp",
      subtotal: 100000,
      discountAmount: 0,
      taxAmount: 11000,
      shippingCourier: "JNE",
      shippingService: "JNE YES",
      shippingCost: 28000,
      totalAmount: 139000,
      paymentMethod: "qris",
      paymentStatus: "paid",
      orderStatus: "confirmed",
      qrPayload: "WACRM|INV-XSS-1",
      aiGenerated: true,
      fraudRiskScore: 0,
      notes: null,
      items: [
        {
          id: "it-1",
          productId: null,
          sku: "SKU-1",
          productName: "Produk <Aman>",
          quantity: 1,
          unitPrice: 100000,
          costPrice: 50000,
          lineTotal: 100000,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const html = renderInvoicePrintHtml(order, "Toko Berkah", "data:image/png;base64,AAA");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&#39;Merdeka&#39;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("JNE YES");
  });
});

describe("v4.2 Commercial Upgrade — Edition RBAC & Quota Enforcement", () => {
  it("enforces edition-level feature gates and role-based tab permissions", () => {
    // Starter unlocks inbox, pos, master but locks erp, accounting, seo_growth
    expect(evaluateTabAccess("starter", "owner", "inbox").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "pos").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "master").allowed).toBe(true);

    const starterAccounting = evaluateTabAccess("starter", "owner", "accounting");
    expect(starterAccounting.allowed).toBe(false);
    expect(starterAccounting.lockedByEdition).toBe(true);

    const starterSeo = evaluateTabAccess("starter", "owner", "seo_growth");
    expect(starterSeo.allowed).toBe(false);
    expect(starterSeo.lockedByEdition).toBe(true);

    const starterErp = evaluateTabAccess("starter", "owner", "erp");
    expect(starterErp.allowed).toBe(false);
    expect(starterErp.lockedByEdition).toBe(true);

    // Enterprise unlocks all features for owner, but viewer still blocked on admin tabs
    expect(evaluateTabAccess("enterprise", "owner", "accounting").allowed).toBe(true);
    expect(evaluateTabAccess("enterprise", "owner", "seo_growth").allowed).toBe(true);

    const viewerSettings = evaluateTabAccess("enterprise", "viewer", "settings");
    expect(viewerSettings.allowed).toBe(false);
    expect(viewerSettings.lockedByRole).toBe(true);
  });

  it("evaluates edition resource quotas and ships demo accounts per tier", () => {
    const okQuota = evaluateEditionQuota("starter", "channels", 1);
    expect(okQuota.withinQuota).toBe(true);

    const exceededQuota = evaluateEditionQuota("starter", "channels", 10);
    expect(exceededQuota.withinQuota).toBe(false);
    expect(exceededQuota.canAddMore).toBe(false);

    expect(COMMERCIAL_DEMO_ACCOUNTS.length).toBeGreaterThanOrEqual(4);
    expect(COMMERCIAL_DEMO_ACCOUNTS.some((a) => a.editionId === "starter")).toBe(true);
    expect(COMMERCIAL_DEMO_ACCOUNTS.some((a) => a.editionId === "enterprise")).toBe(true);
  });
});

describe("v4.2 Commercial Upgrade — AI Multi-Turn Courier, Shipping Update & Proactive Cross-Sell", () => {
  const defaultCouriers = getDefaultMasterData().couriers;

  it("generates structured courier AI knowledge summary covering multi-tier rates & policies", () => {
    const summary = buildCourierKnowledgeSummary(defaultCouriers);
    expect(summary).toContain("JNE");
    expect(summary).toContain("SiCepat");
    expect(summary).toContain("Cut-off");
    expect(summary).toContain("COD");
  });

  it("auto-matches Indonesian courier tier during checkout and posts balanced shipping revenue journal (4200)", () => {
    const result = orchestrateMultiAgentReply({
      workspaceName: "Toko Berkah Nusantara",
      customerName: "Dewi Lestari",
      customerPhone: "+6281234567890",
      incomingMessage:
        "Halo kak, saya pesan 2 Kopi Arabika Gayo kirim ke Jl. Asia Afrika No. 88 Bandung pakai JNE YES bayar QRIS ya",
      products: SAMPLE_PRODUCTS,
      knowledgeItems: [],
      agents: SAMPLE_AGENTS,
      couriers: defaultCouriers,
    });

    expect(result.extractedOrder).not.toBeNull();
    expect(result.extractedOrder?.shippingCourier).toContain("JNE");
    expect(result.extractedOrder?.shippingService?.toLowerCase()).toContain("yes");
    expect(result.extractedOrder?.shippingCost ?? 0).toBeGreaterThan(0);
    expect(result.replyText).toContain("Ongkir");

    const sampleOrder: PosOrderRecord = {
      id: "ord-ai-1",
      invoiceNumber: "INV-AI-001",
      conversationId: null,
      contactId: null,
      customerName: "Dewi Lestari",
      customerPhone: "+6281234567890",
      shippingAddress: result.extractedOrder!.shippingAddress,
      channel: "whatsapp",
      subtotal: 370000,
      discountAmount: 0,
      taxAmount: 40700,
      shippingCourier: result.extractedOrder!.shippingCourier,
      shippingService: result.extractedOrder!.shippingService,
      shippingCost: result.extractedOrder!.shippingCost,
      shippingWeightKg: result.extractedOrder!.shippingWeightKg,
      totalAmount: 370000 + 40700 + (result.extractedOrder!.shippingCost ?? 0),
      paymentMethod: "qris",
      paymentStatus: "unpaid",
      orderStatus: "confirmed",
      qrPayload: "QR",
      aiGenerated: true,
      fraudRiskScore: 0,
      notes: null,
      items: [
        {
          id: "it-1",
          productId: "prod-1",
          sku: "KOPI-GAYO-1KG",
          productName: "Kopi Arabika Gayo 1Kg",
          quantity: 2,
          unitPrice: 185000,
          costPrice: 120000,
          lineTotal: 370000,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const journal = buildDoubleEntryForOrder(sampleOrder);
    const totalDebit = journal.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = journal.reduce((sum, l) => sum + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
    expect(journal.some((l) => l.accountCode === "4200" && l.credit === sampleOrder.shippingCost)).toBe(true);
  });

  it("handles multi-turn shipping address & courier tier update on an existing order", () => {
    const existingOrder: PosOrderRecord = {
      id: "ord-exist-1",
      invoiceNumber: "INV-EXIST-1",
      conversationId: null,
      contactId: null,
      customerName: "Dewi Lestari",
      customerPhone: "+6281234567890",
      shippingAddress: "Jl. Lama No. 1 Bandung",
      channel: "whatsapp",
      subtotal: 185000,
      discountAmount: 0,
      taxAmount: 20350,
      shippingCourier: "JNE",
      shippingService: "JNE Reguler",
      shippingCost: 16000,
      shippingWeightKg: 1,
      totalAmount: 221350,
      paymentMethod: "qris",
      paymentStatus: "unpaid",
      orderStatus: "confirmed",
      qrPayload: "QR-OLD",
      aiGenerated: true,
      fraudRiskScore: 0,
      notes: null,
      items: [
        {
          id: "it-1",
          productId: "prod-1",
          sku: "KOPI-GAYO-1KG",
          productName: "Kopi Arabika Gayo 1Kg",
          quantity: 1,
          unitPrice: 185000,
          costPrice: 120000,
          lineTotal: 185000,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const result = orchestrateMultiAgentReply({
      workspaceName: "Toko Berkah Nusantara",
      customerName: "Dewi Lestari",
      customerPhone: "+6281234567890",
      incomingMessage: "Kak ubah alamat kirim ke Jl. Sudirman No. 55 Jakarta dan ganti kurir pakai SiCepat BEST ya",
      products: SAMPLE_PRODUCTS,
      knowledgeItems: [],
      agents: SAMPLE_AGENTS,
      couriers: defaultCouriers,
      existingConversationOrder: existingOrder,
    });

    expect(result.shippingUpdate).not.toBeNull();
    expect(result.shippingUpdate?.orderId).toBe("ord-exist-1");
    expect(result.shippingUpdate?.shippingAddress).toContain("Jl. Sudirman No. 55");
    expect(result.shippingUpdate?.shippingCourier?.toLowerCase()).toContain("sicepat");
    expect(result.shippingUpdate?.shippingService?.toLowerCase()).toContain("best");
    expect(result.shippingUpdate?.shippingCost ?? 0).toBeGreaterThan(0);
  });

  it("answers shipping / courier policy questions directly from Master Kurir knowledge", () => {
    const result = orchestrateMultiAgentReply({
      workspaceName: "Toko Berkah Nusantara",
      customerName: "Andi",
      customerPhone: null,
      incomingMessage: "Kak ongkir kurir JNE dan SiCepat berapa ya? Bisa COD tidak?",
      products: SAMPLE_PRODUCTS,
      knowledgeItems: [],
      agents: SAMPLE_AGENTS,
      couriers: defaultCouriers,
    });

    expect(result.replyText).toContain("JNE");
    expect(result.replyText).toContain("COD");
  });

  it("politely handles checkout abandonment with cross-sell alternatives from admin catalog", () => {
    const result = orchestrateMultiAgentReply({
      workspaceName: "Toko Berkah Nusantara",
      customerName: "Rina",
      customerPhone: null,
      incomingMessage: "Maaf kak gajadi pesan Kopi Arabika Gayo dulu deh, kemahalan",
      products: SAMPLE_PRODUCTS,
      knowledgeItems: [],
      agents: SAMPLE_AGENTS,
      couriers: defaultCouriers,
    });

    expect(result.followUpStage).toBe("abandon_cross_sell");
    expect((result.suggestedProducts ?? []).length).toBeGreaterThan(0);
    expect(result.replyText.toLowerCase()).toContain("alternatif");
  });

  it("builds proactive follow-up attempt 1 (polite check-in) and attempt 2 (catalog cross-sell)", () => {
    const f1 = buildProactiveFollowUpReply({
      workspaceName: "Toko Berkah Nusantara",
      customerName: "Rina",
      attemptNumber: 1,
      products: SAMPLE_PRODUCTS,
      lastTopic: "Kopi Arabika Gayo",
    });
    expect(f1.stage).toBe("idle_nudge");
    expect(f1.replyText.toLowerCase()).toContain("rina");

    const f2 = buildProactiveFollowUpReply({
      workspaceName: "Toko Berkah Nusantara",
      customerName: "Rina",
      attemptNumber: 2,
      products: SAMPLE_PRODUCTS,
      lastTopic: "Kopi Arabika Gayo",
    });
    expect(f2.stage).toBe("abandon_cross_sell");
    expect(f2.suggestedProducts.length).toBeGreaterThan(0);
    expect(f2.replyText).toContain("Matcha Uji Ceremonial");
  });
});

describe("v4.2 Commercial Upgrade — Forgot Password & License Rate-Limit APIs", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTest();
  });

  it("executes 2-step OTP forgot-password reset and blocks OTP reuse & brute force", async () => {
    const req1 = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.55" },
      body: JSON.stringify({ action: "request", email: "user.test@tokoberkah.id" }),
    });
    const res1 = await forgotPasswordPost(req1);
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as { ok: boolean; verificationCodePreview?: string };
    expect(data1.ok).toBe(true);
    expect(data1.verificationCodePreview).toMatch(/^\d{6}$/);

    // Wrong code fails with 400
    const badReq = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.55" },
      body: JSON.stringify({
        action: "confirm",
        email: "user.test@tokoberkah.id",
        code: "000000",
        newPassword: "StrongPassword#2026!",
      }),
    });
    const badRes = await forgotPasswordPost(badReq);
    expect(badRes.status).toBe(400);

    // Correct code succeeds
    const okReq = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.55" },
      body: JSON.stringify({
        action: "confirm",
        email: "user.test@tokoberkah.id",
        code: data1.verificationCodePreview,
        newPassword: "StrongPassword#2026!",
      }),
    });
    const okRes = await forgotPasswordPost(okReq);
    expect(okRes.status).toBe(200);

    // Reusing same single-use OTP fails
    const reuseReq = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.55" },
      body: JSON.stringify({
        action: "confirm",
        email: "user.test@tokoberkah.id",
        code: data1.verificationCodePreview,
        newPassword: "AnotherStrongPassword#2026!",
      }),
    });
    const reuseRes = await forgotPasswordPost(reuseReq);
    expect(reuseRes.status).toBe(400);
  });

  it("rate limits license verification brute force after 20 requests per IP", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 21; i++) {
      const req = new Request("http://localhost/api/license/verify", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.99" },
        body: JSON.stringify({ licenseKey: "INVALID-KEY" }),
      });
      const res = await licenseVerifyPost(req);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
