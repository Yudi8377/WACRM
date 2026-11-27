import { describe, expect, it } from "vitest";
import {
  evaluateEditionQuota,
  evaluateTabAccess,
  getEditionMatrixCapabilities,
  isAiAgentAllowedInEdition,
  startCommercialEditionTrial,
} from "@/lib/access-control";
import { createDemoWorkspaceAdapter } from "@/lib/demo-store";
import { editionHasFeature, getEditionById } from "@/lib/editions";
import {
  issueSignedLicenseKey,
  resolveStrictSessionEntitlement,
  verifySignedLicenseKey,
} from "@/lib/license-crypto";
import {
  buildEscPosReceipt,
  buildEscPosTextReport,
  renderErpReportPrintHtml,
  renderFinancialReportPrintHtml,
  renderInvoicePrintHtml,
  renderShippingLabelPrintHtml,
} from "@/lib/printer";
import {
  appendTrackingCheckpoint,
  buildAiShipmentNotification,
  loadShipmentTrackings,
} from "@/lib/cod-logistics";
import {
  buildSeedFifoBatches,
  consumeStockFifo,
  encodeBatchQrPayload,
  parseScannedQrCode,
} from "@/lib/fifo-inventory";
import { answerAppFaqWithMultiAgent } from "@/lib/community-faq";
import { getDefaultStoreProfile } from "@/lib/store-profile";
import {
  checkRateLimit,
  evaluatePasswordStrength,
  resetRateLimitBucketsForTest,
  sanitizeImageUrl,
  sanitizeTrackingUrl,
} from "@/lib/security";

const STORE_PROFILE = getDefaultStoreProfile("Toko UMKM Nusantara");

describe("WACRM v5.0 — Commercial Launch Readiness E2E Verification", () => {
  it("activates ERP & Gudang on Starter UMKM (Free Forever) while strictly preserving paid-tier gates", () => {
    const starter = getEditionById("starter");
    expect(starter.monthlyPriceIdr).toBe(0);
    expect(starter.trialDays).toBe(0);

    // Core UMKM features — including ERP & Gudang!
    expect(editionHasFeature("starter", "omnichannel_inbox")).toBe(true);
    expect(editionHasFeature("starter", "master_data")).toBe(true);
    expect(editionHasFeature("starter", "pos_qr_shipping_label")).toBe(true);
    expect(editionHasFeature("starter", "erp_warehouse")).toBe(true);
    expect(editionHasFeature("starter", "universal_printing_usb_edc")).toBe(true);

    // Tab access on Starter UMKM
    expect(evaluateTabAccess("starter", "owner", "inbox").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "master").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "pos").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "erp").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "contacts").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "channels").allowed).toBe(true);
    expect(evaluateTabAccess("starter", "owner", "community").allowed).toBe(true);

    // Paid-tier modules remain strictly protected on Starter UMKM
    expect(evaluateTabAccess("starter", "owner", "qr_scanner").allowed).toBe(false);
    expect(evaluateTabAccess("starter", "owner", "seo_growth").allowed).toBe(false);
    expect(evaluateTabAccess("starter", "owner", "templates").allowed).toBe(false);
    expect(evaluateTabAccess("starter", "owner", "accounting").allowed).toBe(false);
    expect(evaluateTabAccess("starter", "owner", "forecast").allowed).toBe(false);

    // Capabilities & quotas
    const caps = getEditionMatrixCapabilities("starter");
    expect(caps.erpWarehouse).toBe(true);
    expect(caps.qrCameraFifoScanner).toBe(false);
    expect(caps.aiProductRecommender).toBe(false);
    expect(caps.buyerInterestForecast).toBe(false);
    expect(evaluateEditionQuota("starter", "contacts", 299).canAddMore).toBe(true);
    expect(evaluateEditionQuota("starter", "contacts", 300).canAddMore).toBe(false);
    expect(isAiAgentAllowedInEdition("starter", "cs_sales")).toBe(true);
    expect(isAiAgentAllowedInEdition("starter", "order_pos")).toBe(true);
    expect(isAiAgentAllowedInEdition("starter", "fraud_sentinel")).toBe(false);

    // Community FAQ confirms Starter UMKM includes ERP & Gudang
    const faqErp = answerAppFaqWithMultiAgent({
      question: "Apakah ERP & Gudang bisa dipakai di Starter UMKM?",
      editionId: "starter",
    });
    expect(faqErp.answer).toMatch(/Starter UMKM/i);
    expect(faqErp.answer).toMatch(/ERP/i);
  });

  it("executes full Starter UMKM ERP & Gudang + POS COD + Accounting Double-Entry lifecycle cleanly", async () => {
    const adapter = createDemoWorkspaceAdapter();
    const initial = await adapter.loadAll();
    expect(initial.products.length).toBeGreaterThan(0);
    expect(initial.financialReport.isBalanced).toBe(true);

    // 1. Add new supplier in ERP & Gudang
    await adapter.createSupplier({
      name: "CV Kopi & Bahan UMKM Kediri",
      contactPerson: "Pak Slamet",
      phone: "081234500111",
      email: "slamet@kopikediri.id",
      address: "Jl. Dhoho No. 88, Kediri",
      paymentTerms: "NET 14",
    });

    // 2. Add new product in ERP & Gudang
    await adapter.createProduct({
      sku: "UMKM-KOPI-500",
      name: "Kopi Robusta Wilis 500gr",
      category: "Kopi & F&B",
      description: "Kopi bubuk sangrai UMKM Kediri",
      unit: "pack",
      unitPrice: 95_000,
      costPrice: 52_000,
      stockQty: 40,
      minStock: 10,
    });

    const afterCreate = await adapter.loadAll();
    const createdProduct = afterCreate.products.find((p) => p.sku === "UMKM-KOPI-500");
    expect(createdProduct).toBeDefined();
    expect(createdProduct?.stockQty).toBe(40);
    expect(afterCreate.suppliers.some((s) => s.name.includes("Kediri"))).toBe(true);

    // 3. Create COD POS order & verify automatic stock reduction
    await adapter.createPosOrder({
      customerName: "Ibu Dewi Anggraini",
      customerPhone: "081299887766",
      shippingAddress: "Jl. Hayam Wuruk No. 12, Kediri",
      channel: "whatsapp",
      paymentMethod: "cod",
      shippingCourier: "J&T Express",
      shippingService: "EZ COD",
      shippingCost: 15_000,
      notes: "Order COD via WhatsApp",
      items: [
        {
          productId: createdProduct!.id,
          sku: createdProduct!.sku,
          productName: createdProduct!.name,
          quantity: 3,
          unitPrice: createdProduct!.unitPrice,
          costPrice: createdProduct!.costPrice,
        },
      ],
    });

    const afterOrder = await adapter.loadAll();
    const updatedProduct = afterOrder.products.find((p) => p.sku === "UMKM-KOPI-500");
    expect(updatedProduct?.stockQty).toBe(37); // 40 - 3

    const codOrder = afterOrder.orders.find((o) => o.customerName === "Ibu Dewi Anggraini");
    expect(codOrder).toBeDefined();
    expect(codOrder?.paymentMethod).toBe("cod");

    // 4. Advance COD shipment tracking + Multi-Agent AI notification
    const map = loadShipmentTrackings(
      adapter.tenantId,
      afterOrder.orders,
      STORE_PROFILE.businessName,
      STORE_PROFILE.phone,
    );
    const tracked = appendTrackingCheckpoint(map[codOrder!.id], {
      stage: "out_for_delivery",
      location: "Drop Point Kediri Kota",
      detail: "Kurir dalam perjalanan menuju lokasi penerima",
      senderName: "Gudang UMKM Kediri",
      driverName: "Mas Ardianto",
      driverPhone: "081355667788",
    });
    const aiNotif = buildAiShipmentNotification({ tracking: tracked });
    expect(aiNotif.whatsappText).toContain("Mas Ardianto");
    expect(aiNotif.whatsappText).toContain("Gudang UMKM Kediri");
    expect(aiNotif.waDeepLink).toMatch(/^https:\/\/wa\.me\/6281299887766/);

    // 5. Mark COD order settled & post accounting entry -> verify Double-Entry Balance 100%
    await adapter.updatePosOrder(codOrder!.id, {
      paymentStatus: "paid",
      orderStatus: "completed",
      notes: `COD Cair Resi ${tracked.awbNumber}`,
    });
    await adapter.createAccountingEntry({
      kind: "expense",
      categoryName: "Beban Biaya Admin COD",
      amount: tracked.codHandlingFeeIdr,
      description: `Admin COD ${codOrder!.invoiceNumber}`,
    });

    const finalSnap = await adapter.loadAll();
    expect(finalSnap.financialReport.isBalanced).toBe(true);
    expect(finalSnap.financialReport.totalDebits).toBe(finalSnap.financialReport.totalCredits);
  });

  it("renders Universal Printer HTML & ESC/POS outputs cleanly without broken tokens or NaN", async () => {
    const adapter = createDemoWorkspaceAdapter();
    const snap = await adapter.loadAll();
    const order = snap.orders[0];
    const dummyQr = "data:image/png;base64,iVBORw0KGgo=";

    const invoiceHtml = renderInvoicePrintHtml(order, STORE_PROFILE, dummyQr);
    expect(invoiceHtml).toContain(order.invoiceNumber);
    expect(invoiceHtml).not.toContain("NaN");
    expect(invoiceHtml).not.toContain("undefined");

    const labelHtml = renderShippingLabelPrintHtml(order, STORE_PROFILE, dummyQr);
    expect(labelHtml).toContain(order.customerName);
    expect(labelHtml).not.toContain("undefined");

    const erpHtml = renderErpReportPrintHtml(snap.products, STORE_PROFILE);
    expect(erpHtml).toContain("Laporan Stok");
    expect(erpHtml).not.toContain("NaN");

    const financeHtml = renderFinancialReportPrintHtml(
      snap.financialReport,
      STORE_PROFILE,
      snap.orders,
    );
    expect(financeHtml).not.toContain("NaN");

    const escPosReceipt = buildEscPosReceipt(order, STORE_PROFILE);
    expect(escPosReceipt.bytes.length).toBeGreaterThan(40);
    expect(escPosReceipt.plainText).toContain(order.invoiceNumber);

    const escPosErp = buildEscPosTextReport("LAPORAN STOK ERP", STORE_PROFILE, [
      `Total Produk: ${snap.products.length}`,
    ]);
    expect(escPosErp.bytes.length).toBeGreaterThan(20);
  });

  it("verifies strict cryptographic license key integrity, cross-account isolation, and trial expiry safety", () => {
    const now = new Date("2026-11-26T00:00:00Z");

    // Valid Sovereign Key
    const sovKey = issueSignedLicenseKey({
      editionId: "sovereign",
      expiryYear: 2028,
      expiryMonth: 12,
      maxSeats: 9999,
    });
    const verified = verifySignedLicenseKey(sovKey, now);
    expect(verified.valid).toBe(true);
    expect(verified.editionId).toBe("sovereign");

    // Tampered key MUST be rejected
    expect(verifySignedLicenseKey(sovKey.replace("SOV", "PRO"), now).valid).toBe(false);

    // Expired key MUST be rejected
    const expKey = issueSignedLicenseKey({
      editionId: "pro",
      expiryYear: 2024,
      expiryMonth: 1,
      maxSeats: 10,
    });
    expect(verifySignedLicenseKey(expKey, now).valid).toBe(false);

    // Cross-account entitlement isolation: Account B (Starter UMKM) never inherits Sovereign from Account A
    const resB = resolveStrictSessionEntitlement({
      tenantId: "demo-tenant",
      accountEmail: "umkm-baru@tokokecil.id",
      sessionEditionId: "starter",
      sessionLicenseKey: null,
      sessionHasPaidLicense: false,
      trialEndsAt: "2099-12-31T23:59:59.000Z",
      workspaceName: "Toko B",
      nowMs: now.getTime(),
    });
    expect(resB.editionId).toBe("starter");
    expect(resB.activeLicense).toBeNull();

    // Trial activation on Pro (14 days)
    const proTrial = startCommercialEditionTrial(
      {
        userId: "u-c",
        email: "pro-trial@toko.id",
        displayName: "Toko C",
        businessName: "Toko C",
        role: "owner",
        editionId: "starter",
        hasPaidLicense: false,
        licenseKey: null,
        trialEditionId: null,
        usedTrialEditions: [],
        trialStartedAt: now.toISOString(),
        trialEndsAt: "2099-12-31T23:59:59.000Z",
        platform: "web",
        authProvider: "workspace_local",
        signedInAt: now.toISOString(),
      },
      "pro",
    );
    expect(proTrial.ok).toBe(true);
    expect(proTrial.trialDays).toBe(14);
    expect(proTrial.session?.editionId).toBe("pro");
  });

  it("verifies FIFO QR batch roundtrip & security guards (URL XSS, password policy, rate limiter)", async () => {
    const adapter = createDemoWorkspaceAdapter();
    const snap = await adapter.loadAll();
    const batches = buildSeedFifoBatches(snap.products);
    const first = batches[0];
    const encoded = encodeBatchQrPayload({
      sku: first.sku,
      batchCode: first.batchCode,
      expiryDate: first.expiryDate ?? undefined,
    });
    const decoded = parseScannedQrCode(encoded);
    expect(decoded.sku).toBe(first.sku);
    expect(decoded.batchCode).toBe(first.batchCode);

    const pick = consumeStockFifo(batches, first.sku, 1);
    expect(pick.ok).toBe(true);
    expect(pick.totalPickedQty).toBe(1);

    // Security checks: URL XSS rejection, password policy & rate limiter
    expect(sanitizeImageUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeImageUrl("https://cdn.example.com/logo.png")).toBe(
      "https://cdn.example.com/logo.png",
    );
    expect(sanitizeTrackingUrl("javascript:evil({awb})", "RESI123")).toBeNull();
    expect(sanitizeTrackingUrl("https://track.example.com/{awb}", "RESI123")).toBe(
      "https://track.example.com/RESI123",
    );
    expect(evaluatePasswordStrength("12345").isCommercialReady).toBe(false);
    expect(evaluatePasswordStrength("Wacrm@2026Strong!").isCommercialReady).toBe(true);

    resetRateLimitBucketsForTest();
    const rl1 = checkRateLimit("qa-ip", 2, 60_000);
    const rl2 = checkRateLimit("qa-ip", 2, 60_000);
    const rl3 = checkRateLimit("qa-ip", 2, 60_000);
    expect(rl1.allowed).toBe(true);
    expect(rl2.allowed).toBe(true);
    expect(rl3.allowed).toBe(false);
  });
});
