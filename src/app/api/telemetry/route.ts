import { NextResponse } from "next/server";
import { z } from "zod";
import { recordMarketSignal, recordUsageEvent } from "@/lib/publisher-intelligence";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const telemetrySchema = z.object({
  type: z.enum(["usage", "market"]).default("usage"),
  tenantEmail: z.string().trim().max(160).optional().default(""),
  businessName: z.string().trim().max(140).optional().default(""),
  editionId: z.enum(["starter", "pro", "enterprise", "sovereign"]).optional().default("starter"),
  platform: z.enum(["web", "android"]).optional().default("web"),
  region: z.string().trim().max(80).optional().default("Indonesia"),
  // Usage fields
  featureKey: z.string().trim().max(40).optional().default("inbox"),
  durationSeconds: z.number().min(1).max(3600).optional().default(30),
  localHour: z.number().min(0).max(23).optional(),
  sessionId: z.string().trim().max(80).optional().default(""),
  // Market fields
  productCategory: z.string().trim().max(80).optional().default("UMKM Umum"),
  productName: z.string().trim().max(120).optional().default(""),
  avgPriceIdr: z.number().min(0).max(1_000_000_000).optional().default(0),
  unitsSold: z.number().min(1).max(100_000).optional().default(1),
  orderValueIdr: z.number().min(0).max(10_000_000_000).optional().default(0),
  paymentMethod: z.enum(["qris", "transfer", "cod", "cash", "edc"]).optional().default("qris"),
  channel: z
    .enum(["whatsapp", "instagram", "tiktok", "facebook", "youtube", "pos"])
    .optional()
    .default("whatsapp"),
  buyerHour: z.number().min(0).max(23).optional(),
  repeatBuyer: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const rate = checkRateLimit(`telemetry:${ip}`, 120, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: "Rate limit telemetry tercapai." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = telemetrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Payload telemetry tidak valid." }, { status: 400 });
  }

  const d = parsed.data;
  if (d.type === "market") {
    await recordMarketSignal({
      tenantEmail: d.tenantEmail,
      region: d.region,
      productCategory: d.productCategory,
      productName: d.productName,
      avgPriceIdr: d.avgPriceIdr,
      unitsSold: d.unitsSold,
      orderValueIdr: d.orderValueIdr,
      paymentMethod: d.paymentMethod,
      channel: d.channel,
      buyerHour: d.buyerHour ?? new Date().getHours(),
      repeatBuyer: d.repeatBuyer,
    });
  } else {
    await recordUsageEvent({
      tenantEmail: d.tenantEmail || "guest@umkm.id",
      businessName: d.businessName,
      editionId: d.editionId,
      platform: d.platform,
      region: d.region,
      featureKey: d.featureKey,
      durationSeconds: d.durationSeconds,
      localHour: d.localHour ?? new Date().getHours(),
      sessionId: d.sessionId,
    });
  }

  return NextResponse.json({ ok: true, recordedAt: new Date().toISOString() }, { status: 201 });
}
