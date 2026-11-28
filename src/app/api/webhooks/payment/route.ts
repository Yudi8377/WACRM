import { NextResponse } from "next/server";
import {
  verifyAndParsePaymentWebhook,
  type PaymentGatewayProvider,
} from "@/lib/payment-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SettledOrderRecord {
  orderId: string;
  provider: Exclude<PaymentGatewayProvider, "manual_transfer">;
  status: string;
  amountIdr: number;
  issuedLicenseKey?: string;
  licenseExpiresAt?: string;
  settledAt: string;
}

const globalBillingStore = globalThis as unknown as {
  __wacrmSettledPayments?: Map<string, SettledOrderRecord>;
};

function getSettledStore(): Map<string, SettledOrderRecord> {
  if (!globalBillingStore.__wacrmSettledPayments) {
    globalBillingStore.__wacrmSettledPayments = new Map();
  }
  return globalBillingStore.__wacrmSettledPayments;
}

function detectWebhookProvider(
  request: Request,
  rawBody: string,
): Exclude<PaymentGatewayProvider, "manual_transfer"> | null {
  const url = new URL(request.url);
  const qp = url.searchParams.get("provider")?.trim().toLowerCase();
  if (qp === "midtrans" || qp === "xendit" || qp === "tripay") return qp;

  if (request.headers.get("x-callback-token")) return "xendit";
  if (request.headers.get("x-callback-signature")) return "tripay";
  if (rawBody.includes('"signature_key"') && rawBody.includes('"order_id"')) return "midtrans";
  return null;
}

/**
 * Unified verified webhook endpoint for Midtrans, Xendit, and Tripay.
 * Configure in gateway dashboard:
 * - Midtrans Notification URL: https://<domain>/api/webhooks/payment?provider=midtrans
 * - Xendit Invoice Callback URL: https://<domain>/api/webhooks/payment?provider=xendit
 * - Tripay Callback URL: https://<domain>/api/webhooks/payment?provider=tripay
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const provider = detectWebhookProvider(request, rawBody);

  if (!provider) {
    return NextResponse.json(
      { ok: false, error: "Provider webhook tidak dikenali (midtrans / xendit / tripay)." },
      { status: 400 },
    );
  }

  const verified = verifyAndParsePaymentWebhook({
    provider,
    rawBody,
    headers: {
      "x-callback-token": request.headers.get("x-callback-token"),
      "x-callback-signature": request.headers.get("x-callback-signature"),
    },
  });

  if (!verified.validSignature) {
    return NextResponse.json(
      { ok: false, error: verified.error || "Tanda tangan webhook pembayaran tidak valid." },
      { status: 401 },
    );
  }

  const store = getSettledStore();
  const existing = store.get(verified.orderId);
  if (existing && existing.status === "paid") {
    return NextResponse.json({
      ok: true,
      idempotentReplay: true,
      ...existing,
    });
  }

  if (verified.normalizedStatus === "paid") {
    const rec: SettledOrderRecord = {
      orderId: verified.orderId,
      provider: verified.provider,
      status: "paid",
      amountIdr: verified.amountIdr,
      issuedLicenseKey: verified.issuedLicenseKey,
      licenseExpiresAt: verified.licenseExpiresAt,
      settledAt: new Date().toISOString(),
    };
    store.set(verified.orderId, rec);

    return NextResponse.json({
      ok: true,
      idempotentReplay: false,
      ...rec,
      editionId: verified.editionId,
      billingCycle: verified.billingCycle,
    });
  }

  return NextResponse.json({
    ok: true,
    orderId: verified.orderId,
    provider: verified.provider,
    status: verified.normalizedStatus,
    amountIdr: verified.amountIdr,
  });
}
