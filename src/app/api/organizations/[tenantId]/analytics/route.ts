import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const analytics = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      const summary = await client.query<{
        total_conversations: string;
        open_conversations: string;
        pending_conversations: string;
        resolved_conversations: string;
        total_contacts: string;
        total_messages: string;
        messages_24h: string;
        connected_channels: string;
      }>(
        `SELECT
          (SELECT count(*)::text FROM conversations WHERE tenant_id = $1::uuid) AS total_conversations,
          (SELECT count(*)::text FROM conversations WHERE tenant_id = $1::uuid AND status = 'open') AS open_conversations,
          (SELECT count(*)::text FROM conversations WHERE tenant_id = $1::uuid AND status = 'pending') AS pending_conversations,
          (SELECT count(*)::text FROM conversations WHERE tenant_id = $1::uuid AND status = 'resolved') AS resolved_conversations,
          (SELECT count(*)::text FROM contacts WHERE tenant_id = $1::uuid) AS total_contacts,
          (SELECT count(*)::text FROM messages WHERE tenant_id = $1::uuid) AS total_messages,
          (SELECT count(*)::text FROM messages WHERE tenant_id = $1::uuid AND created_at >= now() - interval '24 hours') AS messages_24h,
          (SELECT count(*)::text FROM channel_connections WHERE tenant_id = $1::uuid AND status = 'connected') AS connected_channels`,
        [tenantId],
      );

      const byChannel = await client.query<{ channel: string; count: string }>(
        "SELECT channel, count(*)::text AS count FROM conversations WHERE tenant_id = $1::uuid GROUP BY channel ORDER BY count(*) DESC",
        [tenantId],
      );
      const byStage = await client.query<{ stage: string; count: string }>(
        "SELECT lifecycle_stage AS stage, count(*)::text AS count FROM contacts WHERE tenant_id = $1::uuid GROUP BY lifecycle_stage ORDER BY count(*) DESC",
        [tenantId],
      );
      const audits = await client.query<{
        id: string;
        actor_user_id: string | null;
        actor_name: string | null;
        action: string;
        resource_type: string;
        resource_id: string | null;
        details: Record<string, unknown> | null;
        created_at: Date;
      }>(
        `SELECT a.id::text, a.actor_user_id, up.display_name AS actor_name, a.action, a.resource_type, a.resource_id, a.details, a.created_at
           FROM audit_logs a
           LEFT JOIN user_profiles up ON up.id = a.actor_user_id
          WHERE a.tenant_id = $1::uuid
          ORDER BY a.created_at DESC
          LIMIT 30`,
        [tenantId],
      );

      const s = summary.rows[0];
      return {
        totalConversations: Number(s?.total_conversations ?? 0),
        openConversations: Number(s?.open_conversations ?? 0),
        pendingConversations: Number(s?.pending_conversations ?? 0),
        resolvedConversations: Number(s?.resolved_conversations ?? 0),
        totalContacts: Number(s?.total_contacts ?? 0),
        totalMessages: Number(s?.total_messages ?? 0),
        messagesLast24h: Number(s?.messages_24h ?? 0),
        connectedChannels: Number(s?.connected_channels ?? 0),
        byChannel: byChannel.rows.map((r) => ({ channel: r.channel, count: Number(r.count) })),
        byStage: byStage.rows.map((r) => ({ stage: r.stage, count: Number(r.count) })),
        recentAuditLogs: audits.rows.map((a) => ({
          id: a.id,
          actorUserId: a.actor_user_id,
          actorName: a.actor_name || "Sistem",
          action: a.action,
          resourceType: a.resource_type,
          resourceId: a.resource_id,
          details: a.details ?? {},
          createdAt: a.created_at.toISOString(),
        })),
      };
    });

    return Response.json({ analytics }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Analitik workspace belum dapat dimuat.");
  }
}
