import { createHash, timingSafeEqual } from "node:crypto";
import { getDbPool, isDatabaseConfigured } from "@/lib/db";

export const TRIAL_DURATION_DAYS = 14;

export interface RegisteredTenantRecord {
  id: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  city: string;
  platform: "web" | "android";
  editionId: "starter" | "pro" | "enterprise" | "sovereign";
  licenseStatus: "trial" | "active" | "grace_period" | "expired" | "suspended";
  trialStartedAt: string;
  trialEndsAt: string;
  licenseKey: string | null;
  createdAt: string;
  updatedAt: string;
}

const globalRegStore = globalThis as unknown as {
  __wacrmRegisteredTenants?: Map<string, RegisteredTenantRecord>;
  __wacrmRegTableReady?: boolean;
};

function getMemoryRegistry(): Map<string, RegisteredTenantRecord> {
  if (!globalRegStore.__wacrmRegisteredTenants) {
    globalRegStore.__wacrmRegisteredTenants = new Map();
  }
  return globalRegStore.__wacrmRegisteredTenants;
}

export function resetMemoryTenantRegistryForTest(): void {
  globalRegStore.__wacrmRegisteredTenants?.clear();
}

export function getPublisherSyncSecret(): string {
  return (
    process.env.PUBLISHER_SYNC_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "wacrm-publisher-sync-v42-default-key"
  );
}

/**
 * Constant-time verification of the shared Publisher HQ synchronization secret.
 */
export function verifyPublisherSyncSecret(request: Request): boolean {
  const expected = getPublisherSyncSecret();
  const headerSecret = request.headers.get("x-publisher-sync-secret")?.trim() || "";
  const authHeader = request.headers.get("authorization")?.trim() || "";
  const bearerSecret = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const provided = headerSecret || bearerSecret;
  if (!provided || !expected) return false;

  const expectedHash = createHash("sha256").update(expected).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
}

async function ensureRegistrationTable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  if (globalRegStore.__wacrmRegTableReady) return true;
  try {
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS publisher_tenant_registrations (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        business_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT 'Indonesia',
        platform TEXT NOT NULL DEFAULT 'web',
        edition_id TEXT NOT NULL DEFAULT 'starter',
        license_status TEXT NOT NULL DEFAULT 'trial',
        trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
        license_key TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_pub_tenant_reg_created
        ON publisher_tenant_registrations (created_at DESC);
    `);
    globalRegStore.__wacrmRegTableReady = true;
    return true;
  } catch {
    return false;
  }
}

function mapRow(row: Record<string, unknown>): RegisteredTenantRecord {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    businessName: String(row.business_name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    city: String(row.city ?? "Indonesia"),
    platform: String(row.platform) === "android" ? "android" : "web",
    editionId: (["starter", "pro", "enterprise", "sovereign"].includes(String(row.edition_id))
      ? String(row.edition_id)
      : "starter") as RegisteredTenantRecord["editionId"],
    licenseStatus: (["trial", "active", "grace_period", "expired", "suspended"].includes(
      String(row.license_status),
    )
      ? String(row.license_status)
      : "trial") as RegisteredTenantRecord["licenseStatus"],
    trialStartedAt: new Date(String(row.trial_started_at)).toISOString(),
    trialEndsAt: new Date(String(row.trial_ends_at)).toISOString(),
    licenseKey: row.license_key ? String(row.license_key) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function recordTenantRegistration(input: {
  fullName: string;
  businessName: string;
  email: string;
  phone?: string;
  city?: string;
  platform: "web" | "android";
}): Promise<RegisteredTenantRecord> {
  const email = input.email.trim().toLowerCase();
  const now = new Date();
  const trialEnds = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const stableId = `ten-live-${createHash("sha256").update(email).digest("hex").slice(0, 12)}`;

  const fallbackRecord: RegisteredTenantRecord = {
    id: stableId,
    fullName: input.fullName.trim(),
    businessName: input.businessName.trim() || input.fullName.trim(),
    email,
    phone: (input.phone ?? "").trim(),
    city: (input.city ?? "Indonesia").trim() || "Indonesia",
    platform: input.platform,
    editionId: "starter",
    licenseStatus: "trial",
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEnds.toISOString(),
    licenseKey: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Always save to in-memory registry for immediate local availability
  const mem = getMemoryRegistry();
  const existingMem = mem.get(email);
  if (!existingMem) {
    mem.set(email, fallbackRecord);
  } else {
    mem.set(email, {
      ...existingMem,
      fullName: fallbackRecord.fullName,
      businessName: fallbackRecord.businessName,
      phone: fallbackRecord.phone || existingMem.phone,
      city: fallbackRecord.city || existingMem.city,
      platform: fallbackRecord.platform,
      updatedAt: now.toISOString(),
    });
  }

  // Persist durably into Neon PostgreSQL when configured
  const dbReady = await ensureRegistrationTable();
  if (dbReady) {
    try {
      const pool = getDbPool();
      const res = await pool.query(
        `INSERT INTO publisher_tenant_registrations
          (id, full_name, business_name, email, phone, city, platform, edition_id, license_status, trial_started_at, trial_ends_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'starter', 'trial', $8::timestamptz, $9::timestamptz)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           business_name = EXCLUDED.business_name,
           phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE publisher_tenant_registrations.phone END,
           city = CASE WHEN EXCLUDED.city <> '' THEN EXCLUDED.city ELSE publisher_tenant_registrations.city END,
           platform = EXCLUDED.platform,
           updated_at = now()
         RETURNING *`,
        [
          stableId,
          fallbackRecord.fullName,
          fallbackRecord.businessName,
          email,
          fallbackRecord.phone,
          fallbackRecord.city,
          fallbackRecord.platform,
          fallbackRecord.trialStartedAt,
          fallbackRecord.trialEndsAt,
        ],
      );
      if (res.rows[0]) {
        const saved = mapRow(res.rows[0] as Record<string, unknown>);
        mem.set(email, saved);
        return saved;
      }
    } catch {
      // Fall back safely to memory record if DB call fails transiently
    }
  }

  return mem.get(email) ?? fallbackRecord;
}

export async function listRegisteredTenants(limit = 200): Promise<RegisteredTenantRecord[]> {
  const safeLimit = Math.min(500, Math.max(1, limit));
  const dbReady = await ensureRegistrationTable();
  if (dbReady) {
    try {
      const pool = getDbPool();
      const res = await pool.query(
        `SELECT * FROM publisher_tenant_registrations ORDER BY created_at DESC LIMIT $1`,
        [safeLimit],
      );
      return res.rows.map((r) => mapRow(r as Record<string, unknown>));
    } catch {
      // Fall back to memory
    }
  }
  return Array.from(getMemoryRegistry().values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, safeLimit);
}

export async function updateRegisteredTenantLicense(input: {
  email?: string;
  tenantId?: string;
  editionId: RegisteredTenantRecord["editionId"];
  licenseStatus: RegisteredTenantRecord["licenseStatus"];
  licenseKey?: string | null;
}): Promise<RegisteredTenantRecord | null> {
  const email = input.email?.trim().toLowerCase();
  const tenantId = input.tenantId?.trim();
  if (!email && !tenantId) return null;

  const dbReady = await ensureRegistrationTable();
  if (dbReady) {
    try {
      const pool = getDbPool();
      const res = await pool.query(
        `UPDATE publisher_tenant_registrations
            SET edition_id = $1,
                license_status = $2,
                license_key = COALESCE($3, license_key),
                updated_at = now()
          WHERE ($4::text IS NOT NULL AND email = $4::text)
             OR ($5::text IS NOT NULL AND id = $5::text)
          RETURNING *`,
        [input.editionId, input.licenseStatus, input.licenseKey ?? null, email ?? null, tenantId ?? null],
      );
      if (res.rows[0]) {
        const updated = mapRow(res.rows[0] as Record<string, unknown>);
        getMemoryRegistry().set(updated.email, updated);
        return updated;
      }
    } catch {
      // Fallback below
    }
  }

  const mem = getMemoryRegistry();
  const found = email
    ? mem.get(email)
    : Array.from(mem.values()).find((t) => t.id === tenantId);
  if (!found) return null;
  const updated: RegisteredTenantRecord = {
    ...found,
    editionId: input.editionId,
    licenseStatus: input.licenseStatus,
    licenseKey: input.licenseKey ?? found.licenseKey,
    updatedAt: new Date().toISOString(),
  };
  mem.set(updated.email, updated);
  return updated;
}
