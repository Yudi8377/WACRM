import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSyncSecret(): string {
  return (
    process.env.PUBLISHER_SYNC_SECRET?.trim() ||
    "wacrm-publisher-sync-v42-default-key"
  );
}

function getClientApiBaseUrl(): string {
  return (
    process.env.WACRM_CLIENT_API_URL?.trim() ||
    "https://wacrm-seven-dusky.vercel.app"
  ).replace(/\/$/, "");
}

const patchSchema = z.object({
  feedbackId: z.string().min(3).max(120),
  actionStatus: z.enum(["new", "reviewed", "planned", "resolved"]),
});

/**
 * GET /api/intelligence
 * Pulls live Usage Telemetry, Voice of Customer (Comments + Photo Testimonials),
 * and Economic/Market Trend Intelligence from WACRM Client App (Neon PostgreSQL).
 */
export async function GET() {
  const baseUrl = getClientApiBaseUrl();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(`${baseUrl}/api/publisher/intelligence`, {
      method: "GET",
      headers: { "x-publisher-sync-secret": getSyncSecret() },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, remoteReachable: false, error: `HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const payload = (await res.json()) as { ok?: boolean; report?: unknown };
    return NextResponse.json({
      ok: true,
      remoteReachable: true,
      syncedAt: new Date().toISOString(),
      report: payload.report ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        remoteReachable: false,
        error: err instanceof Error ? err.message : "Gagal menghubungi server WACRM Client.",
      },
      { status: 502 },
    );
  }
}

/**
 * PATCH /api/intelligence
 * Updates the strategic action status (new / reviewed / planned / resolved) on a user comment.
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Payload update status tidak valid." }, { status: 400 });
  }

  const baseUrl = getClientApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/publisher/intelligence`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-publisher-sync-secret": getSyncSecret(),
      },
      body: JSON.stringify(parsed.data),
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
