import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPaymentCheckout,
  getCheckoutPlanSpec,
  listConfiguredPaymentProviders,
  resolveActivePaymentProvider,
} from "@/lib/payment-gateway";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CheckoutRequestSchema = z.object({
  tenantId: z.string().trim().min(1).max(120),
  editionId: z.enum(["pro", "enterprise", "sovereign"]),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(160),
  customerPhone: z.string().trim().max(32).optional(),
  preferredProvider: z.enum(["midtrans", "xendit", "tripay", "manual_transfer"]).optional(),
  tripayMethod: z.string().trim().max(32).optional(),
});

export async function GET() {
  const configuredProviders = listConfiguredPaymentProviders();
  const activeProvider = resolveActivePaymentProvider();
  return NextResponse.json({
    ok: true,
    activeProvider,
    configuredProviders,
    supportedProviders: ["midtrans", "xendit", "tripay", "manual_transfer"],
    rp0ManualModeActive: activeProvider === "manual_transfer",
    plans: [
      getCheckoutPlanSpec("pro", "monthly"),
      getCheckoutPlanSpec("pro", "annual"),
      getCheckoutPlanSpec("enterprise", "monthly"),
      getCheckoutPlanSpec("enterprise", "annual"),
      getCheckoutPlanSpec("sovereign", "monthly"),
      getCheckoutPlanSpec("sovereign", "annual"),
    ],
  });
}

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const rate = checkRateLimit(`billing_checkout:${ip}`, 15, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Terlalu banyak permintaan checkout. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message || "Data checkout paket tidak valid.",
      },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin") || undefined;
  const result = await createPaymentCheckout({
    ...parsed.data,
    returnBaseUrl: origin,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
