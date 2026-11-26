import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import { withTenantContext } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const syncState = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "viewer" },
      async (client) => {
        const res = await client.query(`
          SELECT
            (SELECT count(*)::int FROM conversations WHERE tenant_id = $1::uuid) AS conversations,
            (SELECT count(*)::int FROM contacts WHERE tenant_id = $1::uuid) AS contacts,
            (SELECT count(*)::int FROM erp_products WHERE tenant_id = $1::uuid) AS products,
            (SELECT count(*)::int FROM pos_orders WHERE tenant_id = $1::uuid) AS orders,
            (SELECT count(*)::int FROM accounting_entries WHERE tenant_id = $1::uuid) AS ledger_entries,
            (SELECT count(*)::int FROM ai_knowledge_items WHERE tenant_id = $1::uuid) AS knowledge_items,
            (SELECT count(*)::int FROM ai_security_incidents WHERE tenant_id = $1::uuid AND status = 'open') AS open_incidents
        `, [tenantId]);
        return {
          syncedAt: new Date().toISOString(),
          source: "neon-postgresql",
          counts: res.rows[0],
        };
      },
    );
    return Response.json(syncState, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return handleTenantError(error, "Sinkronisasi database gagal.");
  }
}
