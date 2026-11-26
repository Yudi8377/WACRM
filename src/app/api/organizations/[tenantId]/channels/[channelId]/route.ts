import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateChannelSchema = z.object({
  displayName: z.string().trim().min(2).max(160).optional(),
  status: z.enum(["pending", "connected", "needs_reauth", "disabled", "error"]).optional(),
});

type RouteParams = { tenantId: string; channelId: string };

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, channelId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidChan = validateUuidParam(channelId, "ID kanal");
  if (invalidChan) return invalidChan;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = updateChannelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Data pembaruan kanal tidak valid." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role !== "owner" && tenant.role !== "admin") return { kind: "forbidden" as const };
      const existing = await client.query<{ display_name: string; status: string }>(
        "SELECT display_name, status FROM channel_connections WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, channelId],
      );
      if (!existing.rows[0]) return { kind: "not_found" as const };

      const updated = await client.query<{
        id: string;
        channel: string;
        display_name: string;
        external_account_id: string;
        status: string;
        updated_at: Date;
      }>(
        `UPDATE channel_connections
            SET display_name = $3,
                status = $4,
                updated_at = now()
          WHERE tenant_id = $1::uuid AND id = $2::uuid
          RETURNING id, channel, display_name, external_account_id, status, updated_at`,
        [
          tenantId,
          channelId,
          parsed.data.displayName ?? existing.rows[0].display_name,
          parsed.data.status ?? existing.rows[0].status,
        ],
      );

      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'channel.updated', 'channel_connection', $3, $4::jsonb)",
        [tenantId, tenant.userId, channelId, JSON.stringify(parsed.data)],
      );
      return { kind: "ok" as const, channel: updated.rows[0] };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Hanya pemilik atau admin yang dapat mengubah kanal." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Kanal tidak ditemukan." }, { status: 404 });
    return Response.json({ channel: result.channel }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Kanal belum dapat diperbarui.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, channelId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidChan = validateUuidParam(channelId, "ID kanal");
  if (invalidChan) return invalidChan;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role !== "owner" && tenant.role !== "admin") return { kind: "forbidden" as const };
      const deleted = await client.query(
        "DELETE FROM channel_connections WHERE tenant_id = $1::uuid AND id = $2::uuid RETURNING id",
        [tenantId, channelId],
      );
      if (deleted.rowCount !== 1) return { kind: "not_found" as const };
      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'channel.deleted', 'channel_connection', $3, '{}'::jsonb)",
        [tenantId, tenant.userId, channelId],
      );
      return { kind: "ok" as const };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Hanya pemilik atau admin yang dapat menghapus kanal." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Kanal tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: channelId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Kanal belum dapat dihapus.");
  }
}
