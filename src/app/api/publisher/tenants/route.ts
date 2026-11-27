import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listRegisteredTenants,
  updateRegisteredTenantLicense,
  verifyPublisherSyncSecret,
} from "@/lib/publisher-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchTenantSchema = z.object({
  email: z.string().trim().email().optional(),
  tenantId: z.string().trim().min(3).max(120).optional(),
  editionId: z.enum(["starter", "pro", "enterprise", "sovereign"]),
  licenseStatus: z.enum(["trial", "active", "grace_period", "expired", "suspended"]),
  licenseKey: z.string().trim().max(100).optional().nullable(),
});

export async function GET(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized — X-Publisher-Sync-Secret tidak valid." },
      { status: 401 },
    );
  }

  const tenants = await listRegisteredTenants(300);
  const now = Date.now();
  const summary = {
    total: tenants.length,
    activeTrials: tenants.filter(
      (t) => t.licenseStatus === "trial" && Date.parse(t.trialEndsAt) > now,
    ).length,
    expiredTrials: tenants.filter(
      (t) => t.licenseStatus === "trial" && Date.parse(t.trialEndsAt) <= now,
    ).length,
    paidActive: tenants.filter((t) => t.licenseStatus === "active").length,
    webSignups: tenants.filter((t) => t.platform === "web").length,
    androidSignups: tenants.filter((t) => t.platform === "android").length,
  };

  return NextResponse.json({
    ok: true,
    source: "wacrm-client-neon",
    syncedAt: new Date().toISOString(),
    summary,
    tenants,
  });
}

export async function PATCH(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized — X-Publisher-Sync-Secret tidak valid." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = patchTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Payload pembaruan lisensi tenant tidak valid." },
      { status: 400 },
    );
  }

  const updated = await updateRegisteredTenantLicense(parsed.data);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Tenant pendaftar tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, tenant: updated });
}
