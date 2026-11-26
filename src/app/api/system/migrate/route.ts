import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Client } from "pg";

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

function getMigrationConnectionString(): string | null {
  const candidates = [
    process.env.NEON_OWNER_DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ];
  for (const val of candidates) {
    const trimmed = val?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Tidak terotorisasi." }, { status: 401 });
  }

  const connectionString = getMigrationConnectionString();
  if (!connectionString) {
    return NextResponse.json({ error: "Database Neon belum dikonfigurasi." }, { status: 503 });
  }

  const sqlPath = path.join(process.cwd(), "db", "neon-production-setup.sql");
  if (!fs.existsSync(sqlPath)) {
    return NextResponse.json({ error: "File skrip migrasi tidak ditemukan." }, { status: 500 });
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: true },
    application_name: "wacrm-api-migrate",
  });

  try {
    await client.connect();
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);

    const check = await client.query<{ tables_count: number; rls_count: number }>(`
      SELECT
        count(*) FILTER (WHERE tablename IN (
          'organizations','user_profiles','organization_members','channel_connections',
          'contacts','contact_channel_identities','conversations','messages',
          'webhook_events','webhook_inbox','audit_logs','user','session','account',
          'verification','conversation_notes','quick_replies','whatsapp_templates','broadcast_campaigns'
        ))::int AS tables_count,
        count(*) FILTER (WHERE rowsecurity = true)::int AS rls_count
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    return NextResponse.json({
      ok: true,
      schemaTablesCount: check.rows[0]?.tables_count ?? 0,
      rlsEnabledTablesCount: check.rows[0]?.rls_count ?? 0,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    if (code === "42501") {
      return NextResponse.json(
        { error: "Role database tidak memiliki hak DDL. Jalankan db/neon-production-setup.sql sebagai owner Neon." },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "Migrasi skema Neon gagal dijalankan." }, { status: 503 });
  } finally {
    await client.end().catch(() => undefined);
  }
}
