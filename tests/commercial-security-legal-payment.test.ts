import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST as forgotPasswordPost } from "@/app/api/auth/forgot-password/route";
import { GET as billingCheckoutGet, POST as billingCheckoutPost } from "@/app/api/billing/checkout/route";
import { POST as paymentWebhookPost } from "@/app/api/webhooks/payment/route";
import { verifySignedLicenseKey } from "@/lib/license-crypto";
import {
  buildBillingOrderId,
  getCheckoutPlanSpec,
  parsePlanFromOrderId,
  verifyAndParsePaymentWebhook,
} from "@/lib/payment-gateway";
import {
  buildPasswordResetOtpEmail,
  detectConfiguredEmailProvider,
} from "@/lib/transactional-email";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("OTP Forgot-Password Production Security Hardening", () => {
  it("BLOCKS OTP leakage (HTTP 503, no verificationCodePreview) in production when no email provider is set", async () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.RESEND_API_KEY;
    delete process.env.BREVO_API_KEY;
    delete process.env.EMAIL_WEBHOOK_URL;

    const req = new Request("https://wacrm-seven-dusky.vercel.app/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.99",
      },
      body: JSON.stringify({
        action: "request",
        email: "victim@tokobahagia.id",
      }),
    });

    const res = await forgotPasswordPost(req);
    const data = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.code).toBe("EMAIL_PROVIDER_NOT_CONFIGURED");
    expect(data.verificationCodePreview).toBeUndefined();
  });

  it("detects Rp 0 free email providers (Resend / Brevo) and builds clean Indonesian OTP email", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.BREVO_API_KEY;
    delete process.env.EMAIL_WEBHOOK_URL;
    expect(detectConfiguredEmailProvider()).toBe("none");

    process.env.BREVO_API_KEY = "xkeysib-test-free-tier";
    expect(detectConfiguredEmailProvider()).toBe("brevo");

    process.env.RESEND_API_KEY = "re_test_free_tier";
    expect(detectConfiguredEmailProvider()).toBe("resend");

    const mail = buildPasswordResetOtpEmail({
      email: "owner@umkm.id",
      otpCode: "482910",
      expiresInMinutes: 15,
    });
    expect(mail.subject).toContain("482910");
    expect(mail.html).toContain("482910");
    expect(mail.html).toContain("15 menit");
  });
});

describe("Official Legal Pages (/privacy, /terms, /refund) on Both Applications", () => {
  const routes = [
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
    "src/app/refund/page.tsx",
    "apps/marketing-web/src/app/privacy/page.tsx",
    "apps/marketing-web/src/app/terms/page.tsx",
    "apps/marketing-web/src/app/refund/page.tsx",
  ];

  it("ships all 6 legal routes with UU PDP No. 27/2022, Meta Data Deletion, Terms & Refund compliance", () => {
    for (const rel of routes) {
      const abs = path.join(process.cwd(), rel);
      expect(existsSync(abs)).toBe(true);
    }

    const mainPrivacy = readFileSync(path.join(process.cwd(), "src/app/privacy/page.tsx"), "utf8");
    expect(mainPrivacy).toContain("27 Tahun 2022");
    expect(mainPrivacy).toContain("Penghapusan Data");

    const mktPrivacy = readFileSync(
      path.join(process.cwd(), "apps/marketing-web/src/app/privacy/page.tsx"),
      "utf8",
    );
    expect(mktPrivacy).toContain("27 Tahun 2022");
    expect(mktPrivacy).not.toContain("wacrm-seven-dusky.vercel.app");

    const mktFooter = readFileSync(
      path.join(process.cwd(), "apps/marketing-web/src/app/page.tsx"),
      "utf8",
    );
    expect(mktFooter).toContain('href="/privacy"');
    expect(mktFooter).toContain('href="/terms"');
    expect(mktFooter).toContain('href="/refund"');
  });
});

describe("Unified Indonesian Payment Gateway (Midtrans / Xendit / Tripay + Rp 0 Manual Fallback)", () => {
  it("provides Rp 0 manual transfer checkout cleanly when gateway env keys are not yet configured", async () => {
    delete process.env.MIDTRANS_SERVER_KEY;
    delete process.env.XENDIT_SECRET_KEY;
    delete process.env.TRIPAY_API_KEY;
    delete process.env.TRIPAY_PRIVATE_KEY;
    delete process.env.TRIPAY_MERCHANT_CODE;

    const statusRes = await billingCheckoutGet();
    const statusJson = (await statusRes.json()) as {
      ok: boolean;
      activeProvider: string;
      rp0ManualModeActive: boolean;
    };
    expect(statusJson.ok).toBe(true);
    expect(statusJson.activeProvider).toBe("manual_transfer");
    expect(statusJson.rp0ManualModeActive).toBe(true);

    const req = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.12" },
      body: JSON.stringify({
        tenantId: "tenant-umkm-01",
        editionId: "enterprise",
        billingCycle: "annual",
        customerName: "CV Maju Bersama",
        customerEmail: "finance@majubersama.id",
      }),
    });
    const res = await billingCheckoutPost(req);
    const json = (await res.json()) as {
      ok: boolean;
      mode: string;
      orderId: string;
      plan: { amountIdr: number };
      manualInstructions?: { whatsappConfirmUrl: string };
    };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.mode).toBe("manual_transfer_rp0");
    expect(json.plan.amountIdr).toBe(6_990_000);
    expect(parsePlanFromOrderId(json.orderId)).toEqual({
      editionId: "enterprise",
      billingCycle: "annual",
    });
    expect(json.manualInstructions?.whatsappConfirmUrl).toContain("https://wa.me/");
  });

  it("verifies Midtrans SHA-512 webhook, auto-issues a valid signed License Key, rejects forged signatures & handles idempotent replay", async () => {
    const serverKey = "SB-Mid-server-TESTKEY-999";
    process.env.MIDTRANS_SERVER_KEY = serverKey;

    const orderId = buildBillingOrderId("pro", "monthly");
    const grossAmount = `${getCheckoutPlanSpec("pro", "monthly").amountIdr}.00`;
    const statusCode = "200";
    const validSig = createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex");

    // 1) Forged signature MUST be rejected with 401
    const badRes = await paymentWebhookPost(
      new Request("http://localhost/api/webhooks/payment?provider=midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          transaction_status: "settlement",
          signature_key: "deadbeef".repeat(16),
        }),
      }),
    );
    expect(badRes.status).toBe(401);

    // 2) Valid signature settles order and issues verifiable License Key
    const goodPayload = JSON.stringify({
      order_id: orderId,
      transaction_id: "mid-tx-123",
      status_code: statusCode,
      gross_amount: grossAmount,
      transaction_status: "settlement",
      fraud_status: "accept",
      signature_key: validSig,
    });
    const okRes = await paymentWebhookPost(
      new Request("http://localhost/api/webhooks/payment?provider=midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: goodPayload,
      }),
    );
    const okJson = (await okRes.json()) as {
      ok: boolean;
      status: string;
      issuedLicenseKey: string;
      idempotentReplay: boolean;
    };
    expect(okRes.status).toBe(200);
    expect(okJson.ok).toBe(true);
    expect(okJson.status).toBe("paid");
    expect(okJson.idempotentReplay).toBe(false);

    const verifiedKey = verifySignedLicenseKey(okJson.issuedLicenseKey);
    expect(verifiedKey.valid).toBe(true);
    expect(verifiedKey.editionId).toBe("pro");

    // 3) Idempotent replay returns exact same key
    const replayRes = await paymentWebhookPost(
      new Request("http://localhost/api/webhooks/payment?provider=midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: goodPayload,
      }),
    );
    const replayJson = (await replayRes.json()) as {
      idempotentReplay: boolean;
      issuedLicenseKey: string;
    };
    expect(replayJson.idempotentReplay).toBe(true);
    expect(replayJson.issuedLicenseKey).toBe(okJson.issuedLicenseKey);
  });

  it("verifies Xendit callback token & Tripay HMAC-SHA256 signatures and issues matching signed License Keys", () => {
    // Xendit
    const xOrder = buildBillingOrderId("enterprise", "annual");
    const xResult = verifyAndParsePaymentWebhook({
      provider: "xendit",
      rawBody: JSON.stringify({
        id: "inv-xendit-001",
        external_id: xOrder,
        status: "PAID",
        paid_amount: 6_990_000,
      }),
      headers: { "x-callback-token": "xnd_webhook_secret_123" },
      secrets: { xenditWebhookToken: "xnd_webhook_secret_123" },
    });
    expect(xResult.validSignature).toBe(true);
    expect(xResult.normalizedStatus).toBe("paid");
    expect(verifySignedLicenseKey(xResult.issuedLicenseKey!).editionId).toBe("enterprise");

    // Tripay
    const tOrder = buildBillingOrderId("sovereign", "monthly");
    const tRaw = JSON.stringify({
      reference: "T000123456",
      merchant_ref: tOrder,
      status: "PAID",
      total_amount: 1_950_000,
    });
    const tSecret = "tripay_private_key_secret_abc";
    const tSig = createHmac("sha256", tSecret).update(tRaw).digest("hex");

    const tResult = verifyAndParsePaymentWebhook({
      provider: "tripay",
      rawBody: tRaw,
      headers: { "x-callback-signature": tSig },
      secrets: { tripayPrivateKey: tSecret },
    });
    expect(tResult.validSignature).toBe(true);
    expect(tResult.normalizedStatus).toBe("paid");
    expect(verifySignedLicenseKey(tResult.issuedLicenseKey!).editionId).toBe("sovereign");

    // Tampered Tripay body MUST fail
    const tTampered = verifyAndParsePaymentWebhook({
      provider: "tripay",
      rawBody: tRaw.replace("1950000", "100"),
      headers: { "x-callback-signature": tSig },
      secrets: { tripayPrivateKey: tSecret },
    });
    expect(tTampered.validSignature).toBe(false);
  });
});
