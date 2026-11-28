import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildMaskedCommercialConfig,
  getEffectiveCommercialConfig,
  invalidateCommercialRuntimeConfigCache,
  type CommercialRuntimeConfig,
} from "../src/lib/commercial-runtime-config";
import {
  createPaymentCheckout,
  listConfiguredPaymentProviders,
  resolveActivePaymentProvider,
} from "../src/lib/payment-gateway";
import {
  detectConfiguredEmailProvider,
  isEmailProviderConfigured,
} from "../src/lib/transactional-email";
import {
  GET as getCommercialConfig,
  POST as postCommercialConfig,
} from "../src/app/api/system/commercial-config/route";

describe("Autonomous Commercial Activation & Cloudflare Rp 0 Kit", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    invalidateCommercialRuntimeConfigCache();
  });

  it("masks secrets cleanly and never leaks raw API keys in masked summary", async () => {
    process.env.RESEND_API_KEY = "re_live_supersecret_99887766";
    process.env.MIDTRANS_SERVER_KEY = "Mid-server-supersecret-112233";
    process.env.XENDIT_SECRET_KEY = "xnd_production_supersecret_4455";
    process.env.PAYMENT_PROVIDER = "midtrans";
    process.env.MANUAL_BANK_NAME = "Bank BCA";
    process.env.MANUAL_BANK_ACCOUNT = "8877665544";
    process.env.MANUAL_BANK_HOLDER = "PT WACRM Nusantara";
    process.env.MANUAL_BILLING_WA = "628111222333";

    const cfg = await getEffectiveCommercialConfig(true);
    const masked = buildMaskedCommercialConfig(cfg);

    expect(masked.email.resendConfigured).toBe(true);
    expect(masked.email.resendMasked).not.toContain("supersecret");
    expect(masked.email.resendMasked).toContain("••••");
    expect(masked.paymentGateway.midtransConfigured).toBe(true);
    expect(masked.paymentGateway.midtransServerKeyMasked).not.toContain("supersecret");
    expect(masked.sources.activeEmailProvider).toBe("resend");
    expect(masked.sources.activePaymentProvider).toBe("midtrans");
    expect(masked.manualTransfer.accountNumber).toBe("8877665544");
  });

  it("activates Email OTP and Payment Gateways dynamically from runtimeConfig without process.env", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.BREVO_API_KEY;
    delete process.env.MIDTRANS_SERVER_KEY;
    delete process.env.XENDIT_SECRET_KEY;
    delete process.env.TRIPAY_API_KEY;

    const runtimeCfg: CommercialRuntimeConfig = {
      resendApiKey: "",
      brevoApiKey: "xkeysib-runtime-brevo-key-123456",
      emailWebhookUrl: "",
      emailWebhookSecret: "",
      emailFromAddress: "otp@wacrm.id",
      emailFromName: "WACRM Live",
      manualBankName: "Bank Mandiri",
      manualBankAccount: "1370099887766",
      manualBankHolder: "CV WACRM Mandiri",
      manualBillingWa: "6285566778899",
      paymentProvider: "manual_transfer",
      midtransServerKey: "",
      midtransIsProduction: true,
      xenditSecretKey: "",
      xenditWebhookToken: "",
      tripayApiKey: "",
      tripayPrivateKey: "",
      tripayMerchantCode: "",
      tripayIsProduction: true,
    };

    expect(isEmailProviderConfigured(runtimeCfg)).toBe(true);
    expect(detectConfiguredEmailProvider(runtimeCfg)).toBe("brevo");

    expect(listConfiguredPaymentProviders(runtimeCfg)).toEqual([]);
    expect(resolveActivePaymentProvider(undefined, runtimeCfg)).toBe("manual_transfer");

    // Flipping Midtrans on at runtime immediately enables automated gateway
    const midtransCfg: CommercialRuntimeConfig = {
      ...runtimeCfg,
      paymentProvider: "midtrans",
      midtransServerKey: "SB-Mid-server-runtime-only",
    };
    expect(listConfiguredPaymentProviders(midtransCfg)).toEqual(["midtrans"]);
    expect(resolveActivePaymentProvider(undefined, midtransCfg)).toBe("midtrans");

    const manualCheckout = await createPaymentCheckout({
      tenantId: "tenant_demo",
      editionId: "pro",
      billingCycle: "monthly",
      customerName: "Budi",
      customerEmail: "budi@umkm.id",
      runtimeConfig: runtimeCfg,
    });

    expect(manualCheckout.ok).toBe(true);
    expect(manualCheckout.provider).toBe("manual_transfer");
    expect(manualCheckout.manualInstructions?.bankName).toBe("Bank Mandiri");
    expect(manualCheckout.manualInstructions?.accountNumber).toBe("1370099887766");
    expect(manualCheckout.manualInstructions?.accountHolder).toBe("CV WACRM Mandiri");
    expect(manualCheckout.manualInstructions?.whatsappNumber).toBe("6285566778899");
  });

  it("exposes GET masked commercial status & enforces admin authorization on POST", async () => {
    process.env.PUBLISHER_SYNC_SECRET = "super-long-production-admin-secret-2026";

    const getRes = await getCommercialConfig();
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as {
      ok: boolean;
      webhookUrls: { midtrans: string; xendit: string; tripay: string };
    };
    expect(getBody.ok).toBe(true);
    expect(getBody.webhookUrls.midtrans).toContain("/api/webhooks/payment?provider=midtrans");
    expect(getBody.webhookUrls.xendit).toContain("/api/webhooks/payment?provider=xendit");
    expect(getBody.webhookUrls.tripay).toContain("/api/webhooks/payment?provider=tripay");

    const unauthorizedReq = new Request("https://wacrm.test/api/system/commercial-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        adminSecret: "wrong-key",
        patch: { manualBankName: "Bank Fake" },
      }),
    });
    const postRes = await postCommercialConfig(unauthorizedReq);
    expect(postRes.status).toBe(401);
  });

  it("includes ready-to-deploy Cloudflare Workers Rp 0 Commercial Migration Kit", () => {
    const rootWrangler = resolve(process.cwd(), "wrangler.jsonc");
    const rootOpenNext = resolve(process.cwd(), "open-next.config.ts");
    const mktWrangler = resolve(process.cwd(), "apps/marketing-web/wrangler.jsonc");
    const workflow = resolve(process.cwd(), ".github/workflows/deploy-cloudflare.yml");

    expect(existsSync(rootWrangler)).toBe(true);
    expect(existsSync(rootOpenNext)).toBe(true);
    expect(existsSync(mktWrangler)).toBe(true);
    expect(existsSync(workflow)).toBe(true);

    const wranglerText = readFileSync(rootWrangler, "utf8");
    expect(wranglerText).toContain("nodejs_compat");
    expect(wranglerText).toContain(".open-next/worker.js");

    const openNextText = readFileSync(rootOpenNext, "utf8");
    expect(openNextText).toContain("@opennextjs/cloudflare");
    expect(openNextText).toContain("defineCloudflareConfig");

    const workflowText = readFileSync(workflow, "utf8");
    expect(workflowText).toContain("opennextjs-cloudflare");
    expect(workflowText).toContain("CLOUDFLARE_API_TOKEN");
    expect(workflowText).toContain("CLOUDFLARE_ACCOUNT_ID");
  });
});
