import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ENTERPRISE_TRIAL_DAYS,
  getPublisherSyncSecret,
  GROWTH_PRO_TRIAL_DAYS,
  recordTenantRegistration,
} from "@/lib/publisher-sync";
import { checkRateLimit, getClientIpFromRequest, sanitizePhoneDigits } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerTenantSchema = z.object({
  fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(120),
  businessName: z.string().trim().min(2, "Nama toko/usaha minimal 2 karakter.").max(140),
  email: z.string().trim().email("Format email tidak valid.").max(160),
  phone: z.string().trim().max(40).optional().default(""),
  city: z.string().trim().max(80).optional().default("Indonesia"),
  platform: z.enum(["web", "android"]).optional(),
  editionId: z.enum(["starter", "pro", "enterprise"]).optional().default("starter"),
});

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const rate = checkRateLimit(`tenant_register:${ip}`, 12, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Terlalu banyak pendaftaran dari alamat ini. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Data pendaftaran tidak valid." },
      { status: 400 },
    );
  }

  const ua = request.headers.get("user-agent") || "";
  const detectedPlatform: "web" | "android" =
    parsed.data.platform ??
    (/wacrm-android/i.test(ua) ? "android" : "web");

  const tenant = await recordTenantRegistration({
    fullName: parsed.data.fullName,
    businessName: parsed.data.businessName,
    email: parsed.data.email,
    phone: sanitizePhoneDigits(parsed.data.phone),
    city: parsed.data.city || "Indonesia",
    platform: detectedPlatform,
    editionId: parsed.data.editionId,
  });

  const resolvedTrialDays =
    tenant.editionId === "enterprise"
      ? ENTERPRISE_TRIAL_DAYS
      : tenant.editionId === "pro"
        ? GROWTH_PRO_TRIAL_DAYS
        : 0;

  // Best-effort real-time webhook push to Publisher HQ (non-blocking)
  const publisherUrl = process.env.PUBLISHER_LICENSE_API_URL?.trim().replace(/\/$/, "");
  let syncedToPublisherHq = false;
  if (publisherUrl && /^https?:\/\//i.test(publisherUrl)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const pushRes = await fetch(`${publisherUrl}/api/tenants`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publisher-sync-secret": getPublisherSyncSecret(),
        },
        body: JSON.stringify({ tenant }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      syncedToPublisherHq = pushRes.ok;
    } catch {
      syncedToPublisherHq = false;
    }
  }

  return NextResponse.json(
    {
      ok: true,
      tenant,
      trialDays: resolvedTrialDays,
      isFreeForever: tenant.editionId === "starter",
      trialEndsAt: tenant.trialEndsAt,
      syncedToPublisherHq,
    },
    { status: 201 },
  );
}
