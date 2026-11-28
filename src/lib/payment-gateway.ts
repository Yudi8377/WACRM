import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CommercialRuntimeConfig } from "@/lib/commercial-runtime-config";
import type { AppEditionId } from "@/lib/crm-types";
import { issueSignedLicenseKey } from "@/lib/license-crypto";

export type PaidEditionId = Exclude<AppEditionId, "starter">;
export type BillingCycle = "monthly" | "annual";
export type PaymentGatewayProvider = "midtrans" | "xendit" | "tripay" | "manual_transfer";

export interface CheckoutPlanSpec {
  editionId: PaidEditionId;
  editionCode: "PRO" | "ENT" | "SOV";
  planName: string;
  billingCycle: BillingCycle;
  durationMonths: number;
  amountIdr: number;
  maxSeats: number;
}

export interface CreateCheckoutInput {
  tenantId: string;
  editionId: PaidEditionId;
  billingCycle: BillingCycle;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  preferredProvider?: PaymentGatewayProvider;
  /** Optional Tripay channel code e.g. QRIS, BRIVA, BCAVA, MANDIRIVA */
  tripayMethod?: string;
  returnBaseUrl?: string;
  runtimeConfig?: CommercialRuntimeConfig;
}

export interface CheckoutCreationResult {
  ok: boolean;
  provider: PaymentGatewayProvider;
  mode: "live_gateway" | "manual_transfer_rp0";
  orderId: string;
  plan: CheckoutPlanSpec;
  paymentUrl?: string;
  snapToken?: string;
  reference?: string;
  expiresAt: string;
  manualInstructions?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    whatsappNumber: string;
    whatsappConfirmUrl: string;
    note: string;
  };
  error?: string;
}

export interface VerifiedPaymentWebhookResult {
  validSignature: boolean;
  provider: Exclude<PaymentGatewayProvider, "manual_transfer">;
  orderId: string;
  externalReference?: string;
  normalizedStatus: "paid" | "pending" | "failed" | "expired";
  amountIdr: number;
  editionId?: PaidEditionId;
  billingCycle?: BillingCycle;
  issuedLicenseKey?: string;
  licenseExpiresAt?: string;
  error?: string;
}

const PAID_PLAN_BASE: Record<
  PaidEditionId,
  { code: "PRO" | "ENT" | "SOV"; name: string; monthlyIdr: number; maxSeats: number }
> = {
  pro: { code: "PRO", name: "WACRM Growth Pro", monthlyIdr: 249_000, maxSeats: 10 },
  enterprise: { code: "ENT", name: "WACRM Enterprise AI Suite", monthlyIdr: 699_000, maxSeats: 50 },
  sovereign: { code: "SOV", name: "WACRM Sovereign Corporate", monthlyIdr: 1_950_000, maxSeats: 9999 },
};

const CODE_TO_PAID_EDITION: Record<string, PaidEditionId> = {
  PRO: "pro",
  ENT: "enterprise",
  SOV: "sovereign",
};

export function getCheckoutPlanSpec(
  editionId: PaidEditionId,
  billingCycle: BillingCycle,
): CheckoutPlanSpec {
  const base = PAID_PLAN_BASE[editionId];
  const isAnnual = billingCycle === "annual";
  return {
    editionId,
    editionCode: base.code,
    planName: `${base.name} (${isAnnual ? "Tahunan — Hemat 2 Bulan" : "Bulanan"})`,
    billingCycle,
    durationMonths: isAnnual ? 12 : 1,
    amountIdr: isAnnual ? base.monthlyIdr * 10 : base.monthlyIdr,
    maxSeats: base.maxSeats,
  };
}

export function listConfiguredPaymentProviders(
  cfg?: CommercialRuntimeConfig,
): Array<Exclude<PaymentGatewayProvider, "manual_transfer">> {
  const list: Array<Exclude<PaymentGatewayProvider, "manual_transfer">> = [];
  if ((cfg?.midtransServerKey ?? process.env.MIDTRANS_SERVER_KEY)?.trim()) list.push("midtrans");
  if ((cfg?.xenditSecretKey ?? process.env.XENDIT_SECRET_KEY)?.trim()) list.push("xendit");
  if (
    (cfg?.tripayApiKey ?? process.env.TRIPAY_API_KEY)?.trim() &&
    (cfg?.tripayPrivateKey ?? process.env.TRIPAY_PRIVATE_KEY)?.trim() &&
    (cfg?.tripayMerchantCode ?? process.env.TRIPAY_MERCHANT_CODE)?.trim()
  ) {
    list.push("tripay");
  }
  return list;
}

export function resolveActivePaymentProvider(
  preferred?: PaymentGatewayProvider,
  cfg?: CommercialRuntimeConfig,
): PaymentGatewayProvider {
  const configured = listConfiguredPaymentProviders(cfg);
  if (preferred && preferred !== "manual_transfer" && configured.includes(preferred)) {
    return preferred;
  }
  const envDefault = (
    cfg?.paymentProvider || (process.env.PAYMENT_PROVIDER?.trim().toLowerCase() as PaymentGatewayProvider | undefined)
  );
  if (envDefault && envDefault !== "manual_transfer" && configured.includes(envDefault)) {
    return envDefault;
  }
  return configured[0] ?? "manual_transfer";
}

export function buildBillingOrderId(editionId: PaidEditionId, billingCycle: BillingCycle): string {
  const code = PAID_PLAN_BASE[editionId].code;
  const cyc = billingCycle === "annual" ? "Y" : "M";
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(3).toString("hex").toUpperCase();
  return `WACRM-${code}-${cyc}-${ts}-${rnd}`;
}

export function parsePlanFromOrderId(
  orderId: string,
): { editionId: PaidEditionId; billingCycle: BillingCycle } | null {
  const match = orderId.trim().toUpperCase().match(/^WACRM-(PRO|ENT|SOV)-(M|Y)-[A-Z0-9-]+$/);
  if (!match) return null;
  const editionId = CODE_TO_PAID_EDITION[match[1]];
  if (!editionId) return null;
  return {
    editionId,
    billingCycle: match[2] === "Y" ? "annual" : "monthly",
  };
}

function secureEq(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Midtrans SHA-512 webhook signature verification */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  serverKey: string;
}): boolean {
  if (!params.serverKey || !params.signatureKey) return false;
  const expected = createHash("sha512")
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`)
    .digest("hex");
  return secureEq(expected.toLowerCase(), params.signatureKey.trim().toLowerCase());
}

/** Xendit callback token verification */
export function verifyXenditCallbackToken(headerToken: string, expectedToken: string): boolean {
  if (!headerToken || !expectedToken) return false;
  return secureEq(headerToken.trim(), expectedToken.trim());
}

/** Tripay HMAC-SHA256 raw-body webhook signature verification */
export function verifyTripaySignature(
  rawBody: string,
  headerSignature: string,
  privateKey: string,
): boolean {
  if (!headerSignature || !privateKey) return false;
  const expected = createHmac("sha256", privateKey).update(rawBody).digest("hex");
  return secureEq(expected.toLowerCase(), headerSignature.trim().toLowerCase());
}

export function issueLicenseForPaidPlan(
  editionId: PaidEditionId,
  billingCycle: BillingCycle,
  now = new Date(),
): { licenseKey: string; expiresAt: string; maxSeats: number } {
  const spec = getCheckoutPlanSpec(editionId, billingCycle);
  const exp = new Date(now);
  exp.setMonth(exp.getMonth() + spec.durationMonths);
  const licenseKey = issueSignedLicenseKey({
    editionId,
    expiryYear: exp.getFullYear(),
    expiryMonth: exp.getMonth() + 1,
    maxSeats: spec.maxSeats,
  });
  return {
    licenseKey,
    expiresAt: exp.toISOString(),
    maxSeats: spec.maxSeats,
  };
}

/**
 * Creates a live checkout session with Midtrans Snap, Xendit Invoice v2, or Tripay,
 * or returns structured Rp 0,- manual transfer instructions when gateway keys are not yet configured.
 */
export async function createPaymentCheckout(
  input: CreateCheckoutInput,
): Promise<CheckoutCreationResult> {
  const cfg = input.runtimeConfig;
  const plan = getCheckoutPlanSpec(input.editionId, input.billingCycle);
  const orderId = buildBillingOrderId(input.editionId, input.billingCycle);
  const provider = resolveActivePaymentProvider(input.preferredProvider, cfg);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const baseUrl = (
    input.returnBaseUrl ||
    process.env.APP_BASE_URL ||
    "https://wacrm-seven-dusky.vercel.app"
  ).replace(/\/$/, "");

  if (provider === "manual_transfer") {
    const bankName =
      (cfg?.manualBankName || process.env.MANUAL_BANK_NAME)?.trim() ||
      "Bank BCA / QRIS Resmi WACRM";
    const accountNumber =
      (cfg?.manualBankAccount || process.env.MANUAL_BANK_ACCOUNT)?.trim() ||
      "Hubungi Admin Billing";
    const accountHolder =
      (cfg?.manualBankHolder || process.env.MANUAL_BANK_HOLDER)?.trim() ||
      "PT WACRM Digital Nusantara";
    const waDigits = (
      (cfg?.manualBillingWa || process.env.MANUAL_BILLING_WA)?.trim() ||
      "6281234567890"
    ).replace(/\D/g, "");
    const waText = encodeURIComponent(
      `Halo Admin Billing WACRM, saya ingin aktivasi paket *${plan.planName}* (${plan.amountIdr.toLocaleString("id-ID")} IDR).\nNo. Invoice: ${orderId}\nEmail Akun: ${input.customerEmail}\nTenant: ${input.tenantId}`,
    );
    return {
      ok: true,
      provider: "manual_transfer",
      mode: "manual_transfer_rp0",
      orderId,
      plan,
      expiresAt,
      manualInstructions: {
        bankName,
        accountNumber,
        accountHolder,
        whatsappNumber: waDigits,
        whatsappConfirmUrl: `https://wa.me/${waDigits}?text=${waText}`,
        note: "Mode Rp 0,- Aktif: Lakukan transfer manual & konfirmasi via WhatsApp untuk menerima License Key resmi dari Publisher HQ (atau pasang API Key Midtrans/Xendit/Tripay di /setup untuk aktivasi otomatis 24 jam).",
      },
    };
  }

  try {
    if (provider === "midtrans") {
      const serverKey = (cfg?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "").trim();
      const isProd = cfg ? cfg.midtransIsProduction : process.env.MIDTRANS_IS_PRODUCTION === "true";
      const endpoint = isProd
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";
      const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: plan.amountIdr,
          },
          item_details: [
            {
              id: `${plan.editionId}-${plan.billingCycle}`,
              price: plan.amountIdr,
              quantity: 1,
              name: plan.planName.slice(0, 50),
            },
          ],
          customer_details: {
            first_name: input.customerName.slice(0, 50),
            email: input.customerEmail,
            phone: input.customerPhone || "",
          },
          callbacks: {
            finish: `${baseUrl}/?billing=success&orderId=${encodeURIComponent(orderId)}`,
          },
          custom_field1: input.tenantId,
          custom_field2: plan.editionId,
          custom_field3: plan.billingCycle,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        token?: string;
        redirect_url?: string;
        error_messages?: string[];
      };
      if (!res.ok || !json.redirect_url) {
        return {
          ok: false,
          provider: "midtrans",
          mode: "live_gateway",
          orderId,
          plan,
          expiresAt,
          error: json.error_messages?.join("; ") || `Midtrans HTTP ${res.status}`,
        };
      }

      return {
        ok: true,
        provider: "midtrans",
        mode: "live_gateway",
        orderId,
        plan,
        paymentUrl: json.redirect_url,
        snapToken: json.token,
        reference: orderId,
        expiresAt,
      };
    }

    if (provider === "xendit") {
      const secretKey = (cfg?.xenditSecretKey || process.env.XENDIT_SECRET_KEY || "").trim();
      const basicAuth = Buffer.from(`${secretKey}:`).toString("base64");
      const res = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: orderId,
          amount: plan.amountIdr,
          currency: "IDR",
          payer_email: input.customerEmail,
          description: `${plan.planName} — Tenant ${input.tenantId}`,
          invoice_duration: 86400,
          success_redirect_url: `${baseUrl}/?billing=success&orderId=${encodeURIComponent(orderId)}`,
          failure_redirect_url: `${baseUrl}/?billing=failed&orderId=${encodeURIComponent(orderId)}`,
          customer: {
            given_names: input.customerName,
            email: input.customerEmail,
            mobile_number: input.customerPhone || undefined,
          },
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        invoice_url?: string;
        message?: string;
      };
      if (!res.ok || !json.invoice_url) {
        return {
          ok: false,
          provider: "xendit",
          mode: "live_gateway",
          orderId,
          plan,
          expiresAt,
          error: json.message || `Xendit HTTP ${res.status}`,
        };
      }

      return {
        ok: true,
        provider: "xendit",
        mode: "live_gateway",
        orderId,
        plan,
        paymentUrl: json.invoice_url,
        reference: json.id || orderId,
        expiresAt,
      };
    }

    // Tripay Closed Payment API
    const apiKey = (cfg?.tripayApiKey || process.env.TRIPAY_API_KEY || "").trim();
    const privateKey = (cfg?.tripayPrivateKey || process.env.TRIPAY_PRIVATE_KEY || "").trim();
    const merchantCode = (cfg?.tripayMerchantCode || process.env.TRIPAY_MERCHANT_CODE || "").trim();
    const isProd = cfg ? cfg.tripayIsProduction : process.env.TRIPAY_IS_PRODUCTION === "true";
    const endpoint = isProd
      ? "https://tripay.co.id/api/transaction/create"
      : "https://tripay.co.id/api-sandbox/transaction/create";

    const signature = createHmac("sha256", privateKey)
      .update(`${merchantCode}${orderId}${plan.amountIdr}`)
      .digest("hex");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: input.tripayMethod || "QRIS",
        merchant_ref: orderId,
        amount: plan.amountIdr,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone || "081200000000",
        order_items: [
          {
            sku: `${plan.editionCode}-${plan.billingCycle.toUpperCase()}`,
            name: plan.planName,
            price: plan.amountIdr,
            quantity: 1,
          },
        ],
        return_url: `${baseUrl}/?billing=success&orderId=${encodeURIComponent(orderId)}`,
        expired_time: Math.floor(Date.now() / 1000) + 86400,
        signature,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: { reference?: string; checkout_url?: string };
    };
    if (!res.ok || !json.success || !json.data?.checkout_url) {
      return {
        ok: false,
        provider: "tripay",
        mode: "live_gateway",
        orderId,
        plan,
        expiresAt,
        error: json.message || `Tripay HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      provider: "tripay",
      mode: "live_gateway",
      orderId,
      plan,
      paymentUrl: json.data.checkout_url,
      reference: json.data.reference || orderId,
      expiresAt,
    };
  } catch (err) {
    return {
      ok: false,
      provider,
      mode: "live_gateway",
      orderId,
      plan,
      expiresAt,
      error: err instanceof Error ? err.message : "Gagal menghubungi gateway pembayaran.",
    };
  }
}

/**
 * Verifies cryptographic signature & normalizes webhook payloads from Midtrans, Xendit, or Tripay.
 * Automatically issues a signed License Key when status is settled/paid.
 */
export function verifyAndParsePaymentWebhook(params: {
  provider: Exclude<PaymentGatewayProvider, "manual_transfer">;
  rawBody: string;
  headers: Record<string, string | null>;
  secrets?: {
    midtransServerKey?: string;
    xenditWebhookToken?: string;
    tripayPrivateKey?: string;
  };
}): VerifiedPaymentWebhookResult {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(params.rawBody) as Record<string, unknown>;
  } catch {
    return {
      validSignature: false,
      provider: params.provider,
      orderId: "",
      normalizedStatus: "failed",
      amountIdr: 0,
      error: "Payload JSON webhook tidak valid.",
    };
  }

  if (params.provider === "midtrans") {
    const serverKey = params.secrets?.midtransServerKey ?? process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
    const orderId = String(payload.order_id ?? "");
    const statusCode = String(payload.status_code ?? "");
    const grossAmount = String(payload.gross_amount ?? "");
    const signatureKey = String(payload.signature_key ?? "");
    const txStatus = String(payload.transaction_status ?? "").toLowerCase();
    const fraudStatus = String(payload.fraud_status ?? "accept").toLowerCase();

    const validSignature = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
      serverKey,
    });
    if (!validSignature) {
      return {
        validSignature: false,
        provider: "midtrans",
        orderId,
        normalizedStatus: "failed",
        amountIdr: Math.round(Number(grossAmount) || 0),
        error: "Tanda tangan SHA-512 Midtrans tidak valid.",
      };
    }

    const normalizedStatus: VerifiedPaymentWebhookResult["normalizedStatus"] =
      txStatus === "settlement" || (txStatus === "capture" && fraudStatus === "accept")
        ? "paid"
        : txStatus === "pending"
          ? "pending"
          : txStatus === "expire"
            ? "expired"
            : "failed";

    const parsedPlan = parsePlanFromOrderId(orderId);
    const issued =
      normalizedStatus === "paid" && parsedPlan
        ? issueLicenseForPaidPlan(parsedPlan.editionId, parsedPlan.billingCycle)
        : undefined;

    return {
      validSignature: true,
      provider: "midtrans",
      orderId,
      externalReference: String(payload.transaction_id ?? orderId),
      normalizedStatus,
      amountIdr: Math.round(Number(grossAmount) || 0),
      editionId: parsedPlan?.editionId,
      billingCycle: parsedPlan?.billingCycle,
      issuedLicenseKey: issued?.licenseKey,
      licenseExpiresAt: issued?.expiresAt,
    };
  }

  if (params.provider === "xendit") {
    const expectedToken =
      params.secrets?.xenditWebhookToken ?? process.env.XENDIT_WEBHOOK_TOKEN?.trim() ?? "";
    const headerToken = params.headers["x-callback-token"] ?? "";
    const orderId = String(payload.external_id ?? "");
    const statusRaw = String(payload.status ?? "").toUpperCase();
    const amountIdr = Math.round(Number(payload.paid_amount ?? payload.amount ?? 0));

    if (!verifyXenditCallbackToken(headerToken, expectedToken)) {
      return {
        validSignature: false,
        provider: "xendit",
        orderId,
        normalizedStatus: "failed",
        amountIdr,
        error: "Header x-callback-token Xendit tidak cocok.",
      };
    }

    const normalizedStatus: VerifiedPaymentWebhookResult["normalizedStatus"] =
      statusRaw === "PAID" || statusRaw === "SETTLED"
        ? "paid"
        : statusRaw === "PENDING"
          ? "pending"
          : statusRaw === "EXPIRED"
            ? "expired"
            : "failed";

    const parsedPlan = parsePlanFromOrderId(orderId);
    const issued =
      normalizedStatus === "paid" && parsedPlan
        ? issueLicenseForPaidPlan(parsedPlan.editionId, parsedPlan.billingCycle)
        : undefined;

    return {
      validSignature: true,
      provider: "xendit",
      orderId,
      externalReference: String(payload.id ?? orderId),
      normalizedStatus,
      amountIdr,
      editionId: parsedPlan?.editionId,
      billingCycle: parsedPlan?.billingCycle,
      issuedLicenseKey: issued?.licenseKey,
      licenseExpiresAt: issued?.expiresAt,
    };
  }

  // Tripay
  const privateKey = params.secrets?.tripayPrivateKey ?? process.env.TRIPAY_PRIVATE_KEY?.trim() ?? "";
  const headerSig = params.headers["x-callback-signature"] ?? "";
  const orderId = String(payload.merchant_ref ?? "");
  const statusRaw = String(payload.status ?? "").toUpperCase();
  const amountIdr = Math.round(Number(payload.total_amount ?? payload.amount_received ?? 0));

  if (!verifyTripaySignature(params.rawBody, headerSig, privateKey)) {
    return {
      validSignature: false,
      provider: "tripay",
      orderId,
      normalizedStatus: "failed",
      amountIdr,
      error: "Tanda tangan HMAC-SHA256 Tripay tidak valid.",
    };
  }

  const normalizedStatus: VerifiedPaymentWebhookResult["normalizedStatus"] =
    statusRaw === "PAID"
      ? "paid"
      : statusRaw === "UNPAID"
        ? "pending"
        : statusRaw === "EXPIRED"
          ? "expired"
          : "failed";

  const parsedPlan = parsePlanFromOrderId(orderId);
  const issued =
    normalizedStatus === "paid" && parsedPlan
      ? issueLicenseForPaidPlan(parsedPlan.editionId, parsedPlan.billingCycle)
      : undefined;

  return {
    validSignature: true,
    provider: "tripay",
    orderId,
    externalReference: String(payload.reference ?? orderId),
    normalizedStatus,
    amountIdr,
    editionId: parsedPlan?.editionId,
    billingCycle: parsedPlan?.billingCycle,
    issuedLicenseKey: issued?.licenseKey,
    licenseExpiresAt: issued?.expiresAt,
  };
}
