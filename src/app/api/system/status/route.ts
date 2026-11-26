import { db, isDatabaseConfigured, NEON_BRANCH_ID, NEON_CONSOLE_URL, NEON_PROJECT_ID } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe diagnostic endpoint showing setup readiness for Neon + Meta + Auth.
 * Strictly returns booleans and non-sensitive identifiers — NEVER credentials.
 */
export async function GET() {
  const databaseConfigured = isDatabaseConfigured();
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
  const encryptionKeyConfigured = (() => {
    const key = process.env.APP_ENCRYPTION_KEY;
    if (!key) return false;
    try {
      return Buffer.from(key, "base64").length === 32;
    } catch {
      return false;
    }
  })();
  const metaConfigured = Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_WEBHOOK_VERIFY_TOKEN,
  );

  let databaseConnected = false;
  let schemaTablesCount = 0;
  let rlsEnabledTablesCount = 0;

  if (databaseConfigured) {
    try {
      await db.query("SELECT 1");
      databaseConnected = true;
      const stats = await db.query<{ total: string; rls_count: string }>(
        "SELECT count(*)::text AS total, count(*) FILTER (WHERE rowsecurity)::text AS rls_count FROM pg_tables WHERE schemaname = 'public'",
      );
      schemaTablesCount = Number(stats.rows[0]?.total ?? 0);
      rlsEnabledTablesCount = Number(stats.rows[0]?.rls_count ?? 0);
    } catch {
      databaseConnected = false;
    }
  }

  return Response.json(
    {
      neon: {
        projectId: NEON_PROJECT_ID,
        branchId: NEON_BRANCH_ID,
        region: "aws-ap-southeast-1 (Singapore)",
        consoleUrl: NEON_CONSOLE_URL,
      },
      checks: {
        databaseConfigured,
        databaseConnected,
        authSecretConfigured,
        encryptionKeyConfigured,
        metaConfigured,
        schemaTablesCount,
        rlsEnabledTablesCount,
        enterpriseSuiteReady: schemaTablesCount >= 28 && rlsEnabledTablesCount >= 24,
      },
      readyForLiveAuth: databaseConfigured && databaseConnected && authSecretConfigured && schemaTablesCount >= 16,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
