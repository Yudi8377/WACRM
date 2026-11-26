import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const provided = authHeader.slice(7).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Tidak terotorisasi." }, { status: 401 });
  }

  const connectionString =
    process.env.WEBHOOK_WORKER_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (!connectionString) {
    return NextResponse.json({ error: "Database Neon belum dikonfigurasi." }, { status: 503 });
  }

  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 5_000,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: true },
    application_name: "wacrm-cron-webhooks",
  });

  try {
    const pending = await pool.query<{ id: string; provider: string; attempt_count: number }>(
      `SELECT id, provider, attempt_count
         FROM webhook_inbox
        WHERE signature_verified = true
          AND processing_status IN ('received', 'retry')
          AND (next_attempt_at IS NULL OR next_attempt_at <= now())
        ORDER BY received_at
        LIMIT 25`,
    );

    return NextResponse.json({
      ok: true,
      pendingCount: pending.rows.length,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Pemeriksaan antrean webhook gagal." }, { status: 503 });
  } finally {
    await pool.end().catch(() => undefined);
  }
}
