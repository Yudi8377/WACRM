import { beforeEach, describe, expect, it } from "vitest";
import { POST as registerTenantPost } from "@/app/api/auth/register-tenant/route";
import {
  GET as publisherTenantsGet,
  PATCH as publisherTenantsPatch,
} from "@/app/api/publisher/tenants/route";
import {
  evaluateEditionQuota,
  evaluateTabAccess,
  evaluateTrialStatus,
  getEditionMatrixCapabilities,
  isAiAgentAllowedInEdition,
  revertCommercialSessionToTrial,
  TRIAL_DURATION_DAYS,
  upgradeCommercialSessionWithLicense,
  type CommercialUserSession,
} from "@/lib/access-control";
import {
  buildDefaultAiAgents,
  buildDoubleEntryForOrder,
  buildProactiveFollowUpReply,
  computeFinancialReport,
  evaluateFraudRisk,
  evaluateHumanEscalation,
  orchestrateMultiAgentReply,
  runSystemGuardianAudit,
} from "@/lib/ai-agents";
import type { AiAgentRecord, ErpProductRecord, PosOrderRecord } from "@/lib/crm-types";
import {
  clearLegacyUnscopedLicenseStorage,
  issueSignedLicenseKey,
  licenseStorageKey,
  loadStoredClientLicense,
  resolveStrictSessionEntitlement,
  saveStoredClientLicense,
  verifySignedLicenseKey,
} from "@/lib/license-crypto";
import { renderShippingLabelPrintHtml } from "@/lib/printer";
import {
  getPublisherSyncSecret,
  resetMemoryTenantRegistryForTest,
} from "@/lib/publisher-sync";
import { resetRateLimitBucketsForTest } from "@/lib/security";
import { generateOmnichannelSeoPack } from "@/lib/seo-engine";
import {
  getDefaultMasterData,
  getDefaultStoreProfile,
  normalizeSocialChannelAccount,
} from "@/lib/store-profile";

const AGENTS: AiAgentRecord[] = buildDefaultAiAgents().map((a, idx) => ({
  ...a,
  id: `qa-agent-${idx + 1}`,
}));

const PRODUCTS: ErpProductRecord[] = [
  {
    id: "qa-p1",
    sku: "KOPI-GAYO-1KG",
    name: "Kopi Arabika Gayo Premium 1Kg",
    category: "Minuman & Kopi",
    description: "Biji kopi Arabika Gayo specialty grade roasted harian untuk kedai & rumah.",
    unit: "kg",
    unitPrice: 185000,
    costPrice: 115000,
    stockQty: 45,
    minStock: 10,
    isActive: true,
    weightGrams: 1000,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "qa-p2",
    sku: "TEH-MATCHA-250",
    name: "Matcha Uji Ceremonial 250g",
    category: "Minuman & Kopi",
    description: "Bubuk matcha murni dari Uji Jepang untuk latte premium & bakery.",
    unit: "pack",
    unitPrice: 135000,
    costPrice: 78000,
    stockQty: 25,
    minStock: 5,
    isActive: true,
    weightGrams: 250,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "qa-p3",
    sku: "MADU-HUTAN-500",
    name: "Madu Hutan Asli Sumbawa 500ml",
    category: "Kesehatan",
    description: "Madu hutan liar murni tanpa campuran gula, kaya enzim alami.",
    unit: "botol",
    unitPrice: 95000,
    costPrice: 52000,
    stockQty: 30,
    minStock: 5,
    isActive: true,
    weightGrams: 600,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("High-Standard QA 1 — Security, Penetration & Auth Protection", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTest();
    resetMemoryTenantRegistryForTest();
  });

  it("blocks unauthenticated and forged-secret access to /api/publisher/tenants (Zero PII Leak)", async () => {
    const noAuthRes = await publisherTenantsGet(
      new Request("http://localhost/api/publisher/tenants", { method: "GET" }),
    );
    expect(noAuthRes.status).toBe(401);

    const badSecretRes = await publisherTenantsGet(
      new Request("http://localhost/api/publisher/tenants", {
        method: "GET",
        headers: { "x-publisher-sync-secret": "forged-hacker-token" },
      }),
    );
    expect(badSecretRes.status).toBe(401);

    const badPatchRes = await publisherTenantsPatch(
      new Request("http://localhost/api/publisher/tenants", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-publisher-sync-secret": "wrong" },
        body: JSON.stringify({
          email: "victim@toko.id",
          editionId: "enterprise",
          licenseStatus: "active",
        }),
      }),
    );
    expect(badPatchRes.status).toBe(401);
  });

  it("rate-limits abusive registration spam on /api/auth/register-tenant", async () => {
    let lastStatus = 201;
    for (let i = 0; i < 13; i += 1) {
      const res = await registerTenantPost(
        new Request("http://localhost/api/auth/register-tenant", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "198.51.100.77",
          },
          body: JSON.stringify({
            fullName: `User ${i}`,
            businessName: `Toko ${i}`,
            email: `spam${i}@example.com`,
          }),
        }),
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("neutralizes XSS & dangerous protocols in social handles and shipping label print HTML", () => {
    expect(normalizeSocialChannelAccount("instagram", "javascript:alert(1)").connected).toBe(false);
    expect(normalizeSocialChannelAccount("facebook", "data:text/html,<script>").connected).toBe(false);
    const cleanedIg = normalizeSocialChannelAccount("instagram", "@toko<script>alert(1)</script>");
    expect(cleanedIg.url).not.toContain("<script>");
    expect(cleanedIg.url?.startsWith("https://instagram.com/")).toBe(true);

    const order: PosOrderRecord = {
      id: "ord-sec-label",
      invoiceNumber: "INV-SEC-1",
      conversationId: null,
      contactId: null,
      customerName: `<svg onload=alert(1)>'Budi'`,
      customerPhone: "+628123456",
      shippingAddress: `Jl. "Aman" <script>steal()</script>`,
      channel: "whatsapp",
      subtotal: 185000,
      discountAmount: 0,
      taxAmount: 20350,
      shippingCourier: "JNE",
      shippingService: "JNE YES",
      shippingCost: 28000,
      totalAmount: 233350,
      paymentMethod: "qris",
      paymentStatus: "paid",
      orderStatus: "packed",
      qrPayload: "WACRM-QRIS|TEST",
      aiGenerated: true,
      fraudRiskScore: 0,
      notes: null,
      items: [
        {
          id: "it-1",
          productId: "qa-p1",
          sku: "KOPI-GAYO-1KG",
          productName: "Kopi <img src=x onerror=alert(1)>",
          quantity: 1,
          unitPrice: 185000,
          costPrice: 115000,
          lineTotal: 185000,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const labelHtml = renderShippingLabelPrintHtml(
      order,
      "Toko <script>bad</script>",
      "data:image/png;base64,AAA",
    );
    expect(labelHtml).not.toContain("<script>");
    expect(labelHtml).not.toContain("<svg onload");
    expect(labelHtml).toContain("&#39;Budi&#39;");
  });

  it("rejects tampered, malformed, and forged License Keys cryptographically", () => {
    expect(verifySignedLicenseKey("WACRM-ENT-2912-0050-FAKE1234").valid).toBe(false);
    expect(verifySignedLicenseKey("INVALID-KEY").valid).toBe(false);
    expect(verifySignedLicenseKey("WACRM-PRO-2001-0010-00000000").valid).toBe(false);
  });
});

describe("High-Standard QA 2 — Real-Time Signup Sync (Web & Android) + 14-Day UMKM Trial", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTest();
    resetMemoryTenantRegistryForTest();
  });

  it("syncs Web and Android APK signups immediately into Publisher HQ feed & supports license activation PATCH", async () => {
    // 1. Web user signs up on wacrm-seven-dusky.vercel.app
    const webRes = await registerTenantPost(
      new Request("http://localhost/api/auth/register-tenant", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.1" },
        body: JSON.stringify({
          fullName: "Siti Rahayu",
          businessName: "Batik Sekar Kediri",
          email: "siti@batiksekar.id",
          phone: "081234567890",
          platform: "web",
        }),
      }),
    );
    expect(webRes.status).toBe(201);
    const webBody = (await webRes.json()) as {
      ok: boolean;
      trialDays: number;
      tenant: { editionId: string; licenseStatus: string; platform: string };
    };
    expect(webBody.ok).toBe(true);
    expect(webBody.trialDays).toBe(0);
    expect(webBody.tenant.editionId).toBe("starter");
    expect(webBody.tenant.licenseStatus).toBe("free_umkm");
    expect(webBody.tenant.platform).toBe("web");

    // 2. Android APK user signs up for 14-day Growth Pro Trial (detected via WACRM-Android User-Agent)
    const androidRes = await registerTenantPost(
      new Request("http://localhost/api/auth/register-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 Android WACRM-Android/4.2.0",
          "x-forwarded-for": "10.1.1.2",
        },
        body: JSON.stringify({
          fullName: "Agus Pratama",
          businessName: "Kopi Lereng Kelud",
          email: "agus@kopikelud.id",
          phone: "085611223344",
          editionId: "pro",
        }),
      }),
    );
    expect(androidRes.status).toBe(201);
    const androidBody = (await androidRes.json()) as {
      trialDays: number;
      tenant: { platform: string; editionId: string; licenseStatus: string };
    };
    expect(androidBody.trialDays).toBe(TRIAL_DURATION_DAYS);
    expect(androidBody.tenant.platform).toBe("android");
    expect(androidBody.tenant.editionId).toBe("pro");
    expect(androidBody.tenant.licenseStatus).toBe("trial");

    // 3. Publisher HQ pulls live registrations with shared secret
    const syncRes = await publisherTenantsGet(
      new Request("http://localhost/api/publisher/tenants", {
        method: "GET",
        headers: { "x-publisher-sync-secret": getPublisherSyncSecret() },
      }),
    );
    expect(syncRes.status).toBe(200);
    const syncData = (await syncRes.json()) as {
      ok: boolean;
      summary: { total: number; webSignups: number; androidSignups: number; activeTrials: number; freeUmkm: number };
      tenants: Array<{ email: string; platform: string; licenseStatus: string }>;
    };
    expect(syncData.ok).toBe(true);
    expect(syncData.summary.total).toBe(2);
    expect(syncData.summary.webSignups).toBe(1);
    expect(syncData.summary.androidSignups).toBe(1);
    expect(syncData.summary.freeUmkm).toBe(1);
    expect(syncData.summary.activeTrials).toBe(1);

    // 4. Publisher HQ issues License Key & syncs upgrade back via PATCH
    const patchRes = await publisherTenantsPatch(
      new Request("http://localhost/api/publisher/tenants", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-publisher-sync-secret": getPublisherSyncSecret(),
        },
        body: JSON.stringify({
          email: "siti@batiksekar.id",
          editionId: "pro",
          licenseStatus: "active",
          licenseKey: "WACRM-PRO-2711-0010-TESTKEY1",
        }),
      }),
    );
    expect(patchRes.status).toBe(200);
    const patchData = (await patchRes.json()) as {
      tenant: { editionId: string; licenseStatus: string; licenseKey: string };
    };
    expect(patchData.tenant.editionId).toBe("pro");
    expect(patchData.tenant.licenseStatus).toBe("active");
    expect(patchData.tenant.licenseKey).toBe("WACRM-PRO-2711-0010-TESTKEY1");
  });

  it("enforces Starter UMKM Free Forever, Growth Pro 14-day Trial, Enterprise 7-day Trial, and Starter restrictions", () => {
    const startMs = Date.parse("2026-11-01T00:00:00.000Z");
    const endProMs = startMs + 14 * 24 * 60 * 60 * 1000;
    const endEntMs = startMs + 7 * 24 * 60 * 60 * 1000;

    // 1. Starter UMKM = FREE FOREVER (no trial expiry limit!)
    const starterSession: CommercialUserSession = {
      userId: "u-free-1",
      email: "umkm@tokoku.id",
      displayName: "Pemilik UMKM",
      businessName: "Toko UMKM",
      role: "owner",
      editionId: "starter",
      authProvider: "workspace_local",
      hasPaidLicense: false,
      trialStartedAt: new Date(startMs).toISOString(),
      trialEndsAt: new Date(startMs).toISOString(),
      platform: "android",
      signedInAt: new Date(startMs).toISOString(),
    };
    const starterStatus = evaluateTrialStatus(starterSession, startMs + 365 * 24 * 60 * 60 * 1000);
    expect(starterStatus.isFreeForever).toBe(true);
    expect(starterStatus.isTrial).toBe(false);
    expect(starterStatus.isExpired).toBe(false);

    // 2. Growth Pro = 14-Day Trial
    const proTrialSession: CommercialUserSession = {
      ...starterSession,
      editionId: "pro",
      trialEditionId: "pro",
      trialEndsAt: new Date(endProMs).toISOString(),
    };
    const proDay1 = evaluateTrialStatus(proTrialSession, startMs + 1000);
    expect(proDay1.isTrial).toBe(true);
    expect(proDay1.isExpired).toBe(false);
    expect(proDay1.daysRemaining).toBe(14);
    expect(proDay1.effectiveEditionId).toBe("pro");

    // Day 15 (expired -> falls back gracefully to Starter UMKM Free Forever!)
    const proDay15 = evaluateTrialStatus(proTrialSession, endProMs + 60_000);
    expect(proDay15.isExpired).toBe(true);
    expect(proDay15.daysRemaining).toBe(0);
    expect(proDay15.effectiveEditionId).toBe("starter");

    // 3. Enterprise AI Suite = 7-Day Trial
    const entTrialSession: CommercialUserSession = {
      ...starterSession,
      editionId: "enterprise",
      trialEditionId: "enterprise",
      trialEndsAt: new Date(endEntMs).toISOString(),
    };
    const entDay1 = evaluateTrialStatus(entTrialSession, startMs + 1000);
    expect(entDay1.isTrial).toBe(true);
    expect(entDay1.daysRemaining).toBe(7);
    expect(entDay1.effectiveEditionId).toBe("enterprise");
    const entDay8 = evaluateTrialStatus(entTrialSession, endEntMs + 60_000);
    expect(entDay8.isExpired).toBe(true);
    expect(entDay8.effectiveEditionId).toBe("starter");

    // Paid License Key lifts trial expiration immediately
    const licensed = evaluateTrialStatus({
      ...proTrialSession,
      editionId: "pro",
      hasPaidLicense: true,
      licenseKey: "WACRM-PRO-2711-0010-VALIDKEY",
    }, endProMs + 60_000);
    expect(licensed.isTrial).toBe(false);
    expect(licensed.isExpired).toBe(false);

    // Starter UMKM allows core UMKM tabs + Community FAQ tab and strictly locks higher-tier tabs
    expect(evaluateTabAccess("starter", "owner", "inbox").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "pos").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "master").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "contacts").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "channels").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "ai").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "community").allowed).toBe(true);

    expect(evaluateTabAccess("starter", "owner", "erp").lockedByEdition).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "seo_growth").lockedByEdition).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "templates").lockedByEdition).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "accounting").lockedByEdition).toBe(true);
  });

  it("enforces every single row of Matriks Perbandingan Fitur Antar Edisi WACRM via real signed License Keys (STR / PRO / ENT / SOV)", () => {
    const now = new Date("2026-11-26T00:00:00Z");

    // 1. Starter UMKM License Key (STR)
    const strKey = issueSignedLicenseKey({
      editionId: "starter",
      expiryYear: 2028,
      expiryMonth: 12,
      maxSeats: 2,
    });
    const strVerified = verifySignedLicenseKey(strKey, now);
    expect(strVerified.valid).toBe(true);
    expect(strVerified.editionId).toBe("starter");

    const strCaps = getEditionMatrixCapabilities("starter", strVerified.maxSeats);
    expect(strCaps.omnichannelInbox).toBe(true);
    expect(strCaps.masterData).toBe(true);
    expect(strCaps.posQrShippingLabel).toBe(true);
    expect(strCaps.universalPrinting).toBe(true);
    expect(strCaps.zeroClickAiAutoReply).toBe(false);
    expect(strCaps.erpWarehouse).toBe(false);
    expect(strCaps.seoGrowthAi).toBe(false);
    expect(strCaps.whiteLabelStore).toBe(false);
    expect(strCaps.doubleEntryAccounting).toBe(false);
    expect(strCaps.voiceCompanion247).toBe(false);
    expect(strCaps.fraudSentinelHealing).toBe(false);
    expect(strCaps.superAdminAnalytics).toBe(false);
    expect(strCaps.customBrandedApk).toBe(false);
    expect(strCaps.dedicatedDbSla).toBe(false);
    expect(strCaps.allowedAiAgents).toEqual(["cs_sales", "order_pos"]);
    expect(isAiAgentAllowedInEdition("starter", "cs_sales")).toBe(true);
    expect(isAiAgentAllowedInEdition("starter", "order_pos")).toBe(true);
    expect(isAiAgentAllowedInEdition("starter", "seo_growth")).toBe(false);
    expect(isAiAgentAllowedInEdition("starter", "fraud_sentinel")).toBe(false);
    expect(evaluateEditionQuota("starter", "agents", 2).canAddMore).toBe(false);
    expect(evaluateEditionQuota("starter", "contacts", 300).canAddMore).toBe(false);
    expect(evaluateEditionQuota("starter", "channels", 2).canAddMore).toBe(false);

    // 2. Growth Pro License Key (PRO)
    const proKey = issueSignedLicenseKey({
      editionId: "pro",
      expiryYear: 2028,
      expiryMonth: 12,
      maxSeats: 10,
    });
    const proVerified = verifySignedLicenseKey(proKey, now);
    expect(proVerified.valid).toBe(true);
    expect(proVerified.editionId).toBe("pro");

    const proCaps = getEditionMatrixCapabilities("pro", proVerified.maxSeats);
    expect(proCaps.zeroClickAiAutoReply).toBe(true);
    expect(proCaps.erpWarehouse).toBe(true);
    expect(proCaps.seoGrowthAi).toBe(true);
    expect(proCaps.whiteLabelStore).toBe(true);
    expect(proCaps.doubleEntryAccounting).toBe(false);
    expect(proCaps.voiceCompanion247).toBe(false);
    expect(proCaps.fraudSentinelHealing).toBe(false);
    expect(proCaps.superAdminAnalytics).toBe(false);
    expect(proCaps.customBrandedApk).toBe(false);
    expect(proCaps.allowedAiAgents.length).toBe(6);
    expect(evaluateTabAccess("pro", "owner", "erp").allowed).toBe(true);
    expect(evaluateTabAccess("pro", "owner", "seo_growth").allowed).toBe(true);
    expect(evaluateTabAccess("pro", "owner", "templates").allowed).toBe(true);
    expect(evaluateTabAccess("pro", "owner", "accounting").lockedByEdition).toBe(true);
    expect(evaluateEditionQuota("pro", "contacts", 4999).canAddMore).toBe(true);
    expect(evaluateEditionQuota("pro", "contacts", 5000).canAddMore).toBe(false);
    expect(evaluateEditionQuota("pro", "channels", 5).canAddMore).toBe(false);

    // 3. Enterprise AI Suite License Key (ENT)
    const entKey = issueSignedLicenseKey({
      editionId: "enterprise",
      expiryYear: 2028,
      expiryMonth: 12,
      maxSeats: 9999,
    });
    const entVerified = verifySignedLicenseKey(entKey, now);
    expect(entVerified.valid).toBe(true);
    expect(entVerified.editionId).toBe("enterprise");

    const entCaps = getEditionMatrixCapabilities("enterprise", entVerified.maxSeats);
    expect(entCaps.doubleEntryAccounting).toBe(true);
    expect(entCaps.voiceCompanion247).toBe(true);
    expect(entCaps.fraudSentinelHealing).toBe(true);
    expect(entCaps.superAdminAnalytics).toBe(true);
    expect(entCaps.customBrandedApk).toBe(false);
    expect(entCaps.dedicatedDbSla).toBe(false);
    expect(entCaps.allowedAiAgents.length).toBe(9);
    expect(evaluateTabAccess("enterprise", "owner", "accounting").allowed).toBe(true);
    expect(evaluateEditionQuota("enterprise", "agents", 120, entVerified.maxSeats).isUnlimited).toBe(true);
    expect(evaluateEditionQuota("enterprise", "channels", 20).canAddMore).toBe(false);

    // 4. Sovereign Corporate License Key (SOV)
    const sovKey = issueSignedLicenseKey({
      editionId: "sovereign",
      expiryYear: 2029,
      expiryMonth: 12,
      maxSeats: 9999,
    });
    const sovVerified = verifySignedLicenseKey(sovKey, now);
    expect(sovVerified.valid).toBe(true);
    expect(sovVerified.editionId).toBe("sovereign");

    const sovCaps = getEditionMatrixCapabilities("sovereign", sovVerified.maxSeats);
    expect(sovCaps.customBrandedApk).toBe(true);
    expect(sovCaps.dedicatedDbSla).toBe(true);
    expect(evaluateEditionQuota("sovereign", "contacts", 500_000).isUnlimited).toBe(true);
    expect(evaluateEditionQuota("sovereign", "channels", 500).isUnlimited).toBe(true);

    // 5. License activation & release downgrade integrity (zero bypass!)
    const baseSession: CommercialUserSession = {
      userId: "u-matrix-1",
      email: "owner@matrix.id",
      displayName: "Owner Matrix",
      businessName: "Toko Matrix",
      role: "owner",
      editionId: "starter",
      authProvider: "workspace_local",
      hasPaidLicense: false,
      signedInAt: now.toISOString(),
    };
    const upgraded = upgradeCommercialSessionWithLicense(baseSession, "sovereign", sovKey);
    expect(upgraded.editionId).toBe("sovereign");
    expect(upgraded.hasPaidLicense).toBe(true);
    const reverted = revertCommercialSessionToTrial(upgraded);
    expect(reverted.editionId).toBe("starter");
    expect(reverted.hasPaidLicense).toBe(false);
    expect(reverted.licenseKey).toBeNull();
  });
});

describe("High-Standard QA 3 — Ultra-Simple Omnichannel SEO Studio", () => {
  it("normalizes beginner social usernames (FB, IG, TikTok, YouTube, WA) and embeds them across all 6 SEO channels", () => {
    const wa = normalizeSocialChannelAccount("whatsapp", "0812-9988-7766");
    const ig = normalizeSocialChannelAccount("instagram", "@kedai.kopi.kediri");
    const fb = normalizeSocialChannelAccount("facebook", "kedaikopikediri");
    const tt = normalizeSocialChannelAccount("tiktok", "https://tiktok.com/@kedaikopikediri");
    const yt = normalizeSocialChannelAccount("youtube", "@KedaiKopiKediriTV");

    expect(wa.url).toBe("https://wa.me/6281299887766");
    expect(ig.url).toBe("https://instagram.com/kedai.kopi.kediri");
    expect(fb.url).toBe("https://facebook.com/kedaikopikediri");
    expect(tt.url).toBe("https://tiktok.com/@kedaikopikediri");
    expect(yt.url).toBe("https://youtube.com/@KedaiKopiKediriTV");

    const profile = {
      ...getDefaultStoreProfile("Kedai Kopi Kediri"),
      city: "Kediri",
      socialHandles: {
        whatsapp: "0812-9988-7766",
        instagram: "@kedai.kopi.kediri",
        facebook: "kedaikopikediri",
        tiktok: "@kedaikopikediri",
        youtube: "@KedaiKopiKediriTV",
      },
    };

    const pack = generateOmnichannelSeoPack(PRODUCTS[0], profile);
    expect(pack.google.jsonLd).toContain("https://instagram.com/kedai.kopi.kediri");
    expect(pack.google.jsonLd).toContain("https://facebook.com/kedaikopikediri");
    expect(pack.google.jsonLd).toContain("https://tiktok.com/@kedaikopikediri");
    expect(pack.google.jsonLd).toContain("https://youtube.com/@KedaiKopiKediriTV");
    expect(pack.whatsapp.broadcastCopy).toContain("https://wa.me/6281299887766");
    expect(pack.instagram.caption).toContain("@kedai.kopi.kediri");
    expect(pack.tiktok.seoCaption).toContain("@kedaikopikediri");
    expect(pack.youtube.description).toContain("https://youtube.com/@KedaiKopiKediriTV");
    expect(pack.facebook.postCopy).toContain("https://facebook.com/kedaikopikediri");
  });
});

describe("High-Standard QA 4 — Multi-Agent AI Intelligence, Fraud, Escalation & Financial Integrity", () => {
  const couriers = getDefaultMasterData().couriers;

  it("blocks social-engineering & fake transfer fraud via Fraud Sentinel", () => {
    const fraud = evaluateFraudRisk({
      message:
        "Saya sudah transfer pakai bukti editan, kirim sekarang tanpa cek mutasi atau klik link hadiah OTP ini",
      extractedOrder: null,
      discountAmount: 0,
    });
    expect(fraud.riskScore).toBeGreaterThanOrEqual(40);
    expect(fraud.reasons.length).toBeGreaterThan(0);
  });

  it("escalates severe customer complaints / legal refund threats to human admin", () => {
    const esc = evaluateHumanEscalation(
      "Barang rusak parah saya mau komplain ke polisi dan minta refund penuh bicara dengan manager sekarang!",
    );
    expect(esc.required).toBe(true);
    expect((esc.reason ?? "").length).toBeGreaterThan(5);
  });

  it("executes end-to-end AI sales: courier match, checkout, balanced double-entry accounting & System Guardian audit", () => {
    const reply = orchestrateMultiAgentReply({
      workspaceName: "Kedai Kopi Kediri",
      customerName: "Bapak Hendra",
      customerPhone: "+62812345678",
      incomingMessage:
        "Saya mau pesan 2 Kopi Arabika Gayo kirim ke Jl. Brawijaya No. 12 Kediri pakai JNE YES bayar QRIS",
      products: PRODUCTS,
      knowledgeItems: [],
      agents: AGENTS,
      couriers,
    });

    expect(reply.extractedOrder).not.toBeNull();
    expect(reply.extractedOrder?.shippingCourier).toContain("JNE");
    expect(reply.extractedOrder?.shippingService?.toLowerCase()).toContain("yes");
    expect((reply.extractedOrder?.shippingCost ?? 0)).toBeGreaterThan(0);

    const shippingCost = reply.extractedOrder!.shippingCost ?? 0;
    const subtotal = 370000;
    const taxAmount = Math.round(subtotal * 0.11);
    const order: PosOrderRecord = {
      id: "ord-fin-1",
      invoiceNumber: "INV-FIN-1",
      conversationId: null,
      contactId: null,
      customerName: "Bapak Hendra",
      customerPhone: "+62812345678",
      shippingAddress: reply.extractedOrder!.shippingAddress,
      channel: "whatsapp",
      subtotal,
      discountAmount: 0,
      taxAmount,
      shippingCourier: reply.extractedOrder!.shippingCourier,
      shippingService: reply.extractedOrder!.shippingService,
      shippingCost,
      shippingWeightKg: 2,
      totalAmount: subtotal + taxAmount + shippingCost,
      paymentMethod: "qris",
      paymentStatus: "paid",
      orderStatus: "confirmed",
      qrPayload: "QR",
      aiGenerated: true,
      fraudRiskScore: 0,
      notes: null,
      items: [
        {
          id: "it-1",
          productId: "qa-p1",
          sku: "KOPI-GAYO-1KG",
          productName: "Kopi Arabika Gayo Premium 1Kg",
          quantity: 2,
          unitPrice: 185000,
          costPrice: 115000,
          lineTotal: 370000,
        },
      ],
      createdAt: "2026-11-26T00:00:00.000Z",
      updatedAt: "2026-11-26T00:00:00.000Z",
    };

    const entries = buildDoubleEntryForOrder(order).map((e, idx) => ({
      ...e,
      id: `je-${idx + 1}`,
      createdAt: "2026-11-26T00:00:00.000Z",
    }));

    const report = computeFinancialReport(entries, PRODUCTS);
    expect(report.isBalanced).toBe(true);
    expect(report.totalDebits).toBe(report.totalCredits);
    expect(report.totalRevenue).toBe(subtotal + shippingCost);
    expect(report.netProfit).toBeGreaterThan(0);

    const guardian = runSystemGuardianAudit({
      products: PRODUCTS,
      orders: [order],
      entries,
    });
    expect(guardian.healthScore).toBeGreaterThanOrEqual(90);

    // Also verify proactive follow-up stage 1 & stage 2 cross-sell
    const stage1 = buildProactiveFollowUpReply({
      workspaceName: "Kedai Kopi Kediri",
      customerName: "Bapak Hendra",
      attemptNumber: 1,
      products: PRODUCTS,
      lastTopic: "Kopi Arabika Gayo",
    });
    const stage2 = buildProactiveFollowUpReply({
      workspaceName: "Kedai Kopi Kediri",
      customerName: "Bapak Hendra",
      attemptNumber: 2,
      products: PRODUCTS,
      lastTopic: "Kopi Arabika Gayo",
    });
    expect(stage1.stage).toBe("idle_nudge");
    expect(stage2.suggestedProducts.length).toBeGreaterThan(0);
  });

  it("isolates licenses strictly per account so Owner Sovereign key can NEVER leak into a 14-day Trial UMKM account on the same browser", () => {
    // Provide an in-memory localStorage mock on globalThis.window for Node Vitest
    const storageMap = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
      setItem: (key: string, value: string) => {
        storageMap.set(key, String(value));
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
      clear: () => {
        storageMap.clear();
      },
    };
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { localStorage: mockLocalStorage };

    try {
      const tenantId = "demo-workspace";
      const ownerEmail = "dwahyudi8377@gmail.com";
      const trialEmail = "umkm.trial.baru@toko.id";

      const sovereignKey = issueSignedLicenseKey({
        editionId: "sovereign",
        expiryYear: 2029,
        expiryMonth: 12,
        maxSeats: 9999,
      });

      // 1. Simulate Owner activating Sovereign AND poisoning legacy unscoped v4 storage keys
      saveStoredClientLicense(
        tenantId,
        {
          licenseKey: sovereignKey,
          editionId: "sovereign",
          maxSeats: 9999,
          expiresAt: "2029-12-31",
          activatedAt: "2026-11-26",
          licensedTo: "akvisio",
          licensedEmail: ownerEmail,
          verificationMode: "cryptographic_offline",
          status: "active",
        },
        ownerEmail,
      );
      mockLocalStorage.setItem(
        `wacrm_active_license_v4_${tenantId}`,
        JSON.stringify({
          licenseKey: sovereignKey,
          editionId: "sovereign",
          maxSeats: 9999,
          expiresAt: "2029-12-31",
          activatedAt: "2026-11-26",
          licensedTo: "akvisio",
          verificationMode: "cryptographic_offline",
          status: "active",
        }),
      );
      mockLocalStorage.setItem(`wacrm_tenant_edition_v4_${tenantId}`, "sovereign");

      // 2. Brand-new 14-day Trial UMKM user logs in on the SAME browser
      const trialEntitlement = resolveStrictSessionEntitlement({
        tenantId,
        accountEmail: trialEmail,
        sessionLicenseKey: null,
        sessionHasPaidLicense: false,
        workspaceName: "Warung Kopi UMKM",
      });
      expect(trialEntitlement.editionId).toBe("starter");
      expect(trialEntitlement.activeLicense).toBeNull();
      expect(trialEntitlement.licenseMaxSeats).toBeNull();
      expect(trialEntitlement.isLicensed).toBe(false);
      expect(loadStoredClientLicense(tenantId, trialEmail)).toBeNull();

      // 3. Even if someone tampers with trial's v5 slot by pasting Owner's record with Owner's email, it is rejected
      mockLocalStorage.setItem(
        licenseStorageKey(tenantId, trialEmail),
        JSON.stringify({
          licenseKey: sovereignKey,
          editionId: "sovereign",
          maxSeats: 9999,
          expiresAt: "2029-12-31",
          activatedAt: "2026-11-26",
          licensedTo: "akvisio",
          licensedEmail: ownerEmail,
          verificationMode: "cryptographic_offline",
          status: "active",
        }),
      );
      expect(loadStoredClientLicense(tenantId, trialEmail)).toBeNull();

      // 4. Legacy unscoped v4 storage is purged cleanly while preserving Owner's scoped v5 key
      clearLegacyUnscopedLicenseStorage(tenantId);
      expect(mockLocalStorage.getItem(`wacrm_active_license_v4_${tenantId}`)).toBeNull();
      expect(mockLocalStorage.getItem(`wacrm_tenant_edition_v4_${tenantId}`)).toBeNull();

      // 5. Owner signing back in STILL receives Sovereign Corporate cleanly
      const ownerEntitlement = resolveStrictSessionEntitlement({
        tenantId,
        accountEmail: ownerEmail,
        sessionLicenseKey: sovereignKey,
        sessionHasPaidLicense: true,
        workspaceName: "akvisio",
      });
      expect(ownerEntitlement.editionId).toBe("sovereign");
      expect(ownerEntitlement.isLicensed).toBe(true);
      expect(ownerEntitlement.licenseMaxSeats).toBe(9999);
      expect(ownerEntitlement.activeLicense?.licenseKey).toBe(sovereignKey);

      // 6. Confirm Starter UMKM locks knowledge_learner (Growth Pro+) while keeping only cs_sales & order_pos
      expect(isAiAgentAllowedInEdition("starter", "cs_sales")).toBe(true);
      expect(isAiAgentAllowedInEdition("starter", "order_pos")).toBe(true);
      expect(isAiAgentAllowedInEdition("starter", "knowledge_learner")).toBe(false);
      expect(isAiAgentAllowedInEdition("pro", "knowledge_learner")).toBe(true);
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });
});
