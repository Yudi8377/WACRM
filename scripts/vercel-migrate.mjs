import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function pickConnectionString() {
  const candidates = [
    process.env.NEON_OWNER_DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ];
  for (const raw of candidates) {
    const val = raw?.trim();
    if (val) return val;
  }
  return null;
}

function isLocalOrPlaceholder(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      parsed.username === "build"
    );
  } catch {
    return true;
  }
}

async function main() {
  const shouldRun = process.env.VERCEL === "1" || process.env.AUTO_MIGRATE_ON_BUILD === "true";
  if (!shouldRun) {
    return;
  }

  const connectionString = pickConnectionString();
  if (!connectionString || isLocalOrPlaceholder(connectionString)) {
    console.log("[wacrm-migrate] Skipping Neon auto-migration (no remote Neon DATABASE_URL configured).");
    return;
  }

  const sqlPath = path.join(process.cwd(), "db", "neon-production-setup.sql");
  if (!fs.existsSync(sqlPath)) {
    console.log("[wacrm-migrate] Setup SQL file not found; skipping.");
    return;
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: true },
    application_name: "wacrm-vercel-auto-migrate",
  });

  try {
    await client.connect();
    const check = await client.query(`
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

    const tablesCount = check.rows[0]?.tables_count ?? 0;
    const rlsCount = check.rows[0]?.rls_count ?? 0;

    if (tablesCount >= 19 && rlsCount >= 15 && process.env.FORCE_MIGRATE !== "true") {
      console.log(`[wacrm-migrate] Neon schema already up-to-date (${tablesCount} tables, ${rlsCount} RLS tables).`);
      return;
    }

    console.log(`[wacrm-migrate] Applying idempotent Neon schema (found ${tablesCount}/19 tables)...`);
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);

    const after = await client.query(`
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
    console.log(
      `[wacrm-migrate] Neon schema migration succeeded (${after.rows[0]?.tables_count ?? 0} tables, ${after.rows[0]?.rls_count ?? 0} RLS tables).`,
    );
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    if (code === "42501") {
      console.warn("[wacrm-migrate] Connected role is least-privilege runtime role (no DDL permission); run db/neon-production-setup.sql once as Neon owner.");
      return;
    }
    console.warn(`[wacrm-migrate] Auto-migration notice (code=${code}); continuing build without exposing credentials.`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch(() => {
  console.warn("[wacrm-migrate] Auto-migration skipped due to unexpected error.");
});
