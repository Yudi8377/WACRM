import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface LiveRegisteredTenant {
  id: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  city: string;
  platform: "web" | "android";
  editionId: "starter" | "pro" | "enterprise" | "sovereign";
  licenseStatus: "free_umkm" | "trial" | "active" | "grace_period" | "expired" | "suspended";
  trialStartedAt: string;
  trialEndsAt: string;
  licenseKey: string | null;
  createdAt: string;
  updatedAt: string;
}

const globalHub = globalThis as unknown as {
  __publisherLiveTenants?: Map<string, LiveRegisteredTenant>;
};

function getLiveCache(): Map<string, LiveRegisteredTenant> {
  if (!globalHub.__publisherLiveTenants) {
    globalHub.__publisherLiveTenants = new Map();
  }
  return globalHub.__publisherLiveTenants;
}

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

function verifySecret(request: Request): boolean {
  const expected = getSyncSecret();
  const provided = request.headers.get("x-publisher-sync-secret")?.trim() || "";
  if (!expected || !provided) return false;
  const h1 = createHash("sha256").update(expected).digest();
  const h2 = createHash("sha256").update(provided).digest();
  return timingSafeEqual(h1, h2);
}

const pushSchema = z.object({
  tenant: z.object({
    id: z.string().min(3).max(120),
    fullName: z.string().min(1).max(160),
    businessName: z.string().min(1).max(160),
    email: z.string().email().max(160),
    phone: z.string().max(40).default(""),
    city: z.string().max(80).default("Indonesia"),
    platform: z.enum(["web", "android"]).default("web"),
    editionId: z.enum(["starter", "pro", "enterprise", "sovereign"]).default("starter"),
    licenseStatus: z
      .enum(["free_umkm", "trial", "active", "grace_period", "expired", "suspended"])
      .default("free_umkm"),
    trialStartedAt: z.string(),
    trialEndsAt: z.string(),
    licenseKey: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

const patchSchema = z.object({
  email: z.string().email().optional(),
  tenantId: z.string().min(3).max(120).optional(),
  editionId: z.enum(["starter", "pro", "enterprise", "sovereign"]),
  licenseStatus: z.enum(["free_umkm", "trial", "active", "grace_period", "expired", "suspended"]),
  licenseKey: z.string().max(100).optional().nullable(),
});

/**
 * GET /api/tenants
 * Pulls live newly-registered users from WACRM Client App (Neon PostgreSQL)
 * and merges with any webhook-pushed tenants in memory.
 */
export async function GET() {
  const cache = getLiveCache();
  let remoteReachable = false;
  let remoteError: string | null = null;
  const clientUrl = getClientApiBaseUrl();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${clientUrl}/api/publisher/tenants`, {
      method: "GET",
      headers: {
        "x-publisher-sync-secret": getSyncSecret(),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const payload = (await res.json()) as { ok?: boolean; tenants?: LiveRegisteredTenant[] };
      if (Array.isArray(payload.tenants)) {
        remoteReachable = true;
        for (const t of payload.tenants) {
          cache.set(t.email.toLowerCase(), t);
        }
      }
    } else {
      remoteError = `Remote HTTP ${res.status}`;
    }
  } catch (err) {
    remoteError = err instanceof Error ? err.message : "Remote unreachable";
  }

  const tenants = Array.from(cache.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return NextResponse.json({
    ok: true,
    remoteReachable,
    remoteUrl: clientUrl,
    remoteError,
    syncedAt: new Date().toISOString(),
    count: tenants.length,
    tenants,
  });
}

/**
 * POST /api/tenants
 * Authenticated webhook endpoint receiving real-time new user registrations from WACRM.
 */
export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized sync webhook." },
      { status: 401 },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Payload tenant tidak valid." },
      { status: 400 },
    );
  }
  const t: LiveRegisteredTenant = {
    ...parsed.data.tenant,
    licenseKey: parsed.data.tenant.licenseKey ?? null,
  };
  getLiveCache().set(t.email.toLowerCase(), t);
  return NextResponse.json({ ok: true, tenant: t }, { status: 201 });
}

/**
 * PATCH /api/tenants
 * Syncs newly issued License Keys & upgraded editions from Publisher HQ back to WACRM Neon DB.
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Payload update lisensi tidak valid." }, { status: 400 });
  }

  const clientUrl = getClientApiBaseUrl();
  try {
    const res = await fetch(`${clientUrl}/api/publisher/tenants`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-publisher-sync-secret": getSyncSecret(),
      },
      body: JSON.stringify(parsed.data),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, remote: data }, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Gagal sinkron ke server WACRM." }, { status: 502 });
  }
}
