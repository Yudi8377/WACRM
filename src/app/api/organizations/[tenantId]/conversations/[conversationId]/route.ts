import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, normalizeTags, requireSession, validateUuidParam } from "@/lib/api-auth";
import { canSendFreeformReply } from "@/lib/connectors/whatsapp-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateConversationSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "archived"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  subject: z.string().trim().max(160).nullable().optional(),
  tags: z.array(z.string()).optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
  markRead: z.boolean().optional(),
});

type RouteParams = { tenantId: string; conversationId: string };

export async function GET(_request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, conversationId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidConv = validateUuidParam(conversationId, "ID percakapan");
  if (invalidConv) return invalidConv;

  try {
    const detail = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      const convRes = await client.query<{
        id: string;
        connection_id: string;
        contact_id: string;
        contact_name: string | null;
        contact_phone: string | null;
        contact_email: string | null;
        contact_company: string | null;
        contact_stage: string | null;
        channel: string;
        channel_display_name: string;
        external_conversation_id: string;
        status: string;
        priority: string;
        subject: string | null;
        tags: string[] | null;
        unread_count: number;
        assigned_user_id: string | null;
        assigned_user_name: string | null;
        last_message_at: Date | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT conv.id, conv.connection_id, conv.contact_id,
                c.display_name AS contact_name, c.phone_e164 AS contact_phone,
                c.email AS contact_email, c.company AS contact_company, c.lifecycle_stage AS contact_stage,
                conv.channel, conn.display_name AS channel_display_name,
                conv.external_conversation_id, conv.status, conv.priority, conv.subject,
                conv.tags, conv.unread_count, conv.assigned_user_id,
                up.display_name AS assigned_user_name,
                conv.last_message_at, conv.created_at, conv.updated_at
           FROM conversations conv
           JOIN contacts c ON c.tenant_id = conv.tenant_id AND c.id = conv.contact_id
           JOIN channel_connections conn ON conn.tenant_id = conv.tenant_id AND conn.id = conv.connection_id
           LEFT JOIN user_profiles up ON up.id = conv.assigned_user_id
          WHERE conv.tenant_id = $1::uuid AND conv.id = $2::uuid
          LIMIT 1`,
        [tenantId, conversationId],
      );
      const row = convRes.rows[0];
      if (!row) return null;

      const msgRes = await client.query<{
        id: string;
        conversation_id: string;
        channel: string;
        external_message_id: string | null;
        direction: "inbound" | "outbound" | "system";
        message_type: string;
        body_text: string | null;
        delivery_status: string;
        provider_timestamp: Date | null;
        created_at: Date;
      }>(
        `SELECT id, conversation_id, channel, external_message_id, direction, message_type, body_text, delivery_status, provider_timestamp, created_at
           FROM messages
          WHERE tenant_id = $1::uuid AND conversation_id = $2::uuid
          ORDER BY created_at ASC
          LIMIT 300`,
        [tenantId, conversationId],
      );

      const notesRes = await client.query<{
        id: string;
        conversation_id: string;
        author_user_id: string | null;
        author_name: string | null;
        body_text: string;
        created_at: Date;
      }>(
        `SELECT n.id, n.conversation_id, n.author_user_id, up.display_name AS author_name, n.body_text, n.created_at
           FROM conversation_notes n
           LEFT JOIN user_profiles up ON up.id = n.author_user_id
          WHERE n.tenant_id = $1::uuid AND n.conversation_id = $2::uuid
          ORDER BY n.created_at DESC
          LIMIT 50`,
        [tenantId, conversationId],
      );

      const lastInbound = [...msgRes.rows]
        .reverse()
        .find((m) => m.direction === "inbound");
      const lastInboundAt = lastInbound?.provider_timestamp ?? lastInbound?.created_at ?? null;

      return {
        conversation: {
          id: row.id,
          connectionId: row.connection_id,
          contactId: row.contact_id,
          contactName: row.contact_name || row.contact_phone || "Pelanggan",
          contactPhone: row.contact_phone,
          contactEmail: row.contact_email,
          contactCompany: row.contact_company,
          contactStage: row.contact_stage ?? "lead",
          channel: row.channel,
          channelDisplayName: row.channel_display_name,
          externalConversationId: row.external_conversation_id,
          status: row.status,
          priority: row.priority,
          subject: row.subject,
          tags: row.tags ?? [],
          unreadCount: row.unread_count ?? 0,
          assignedUserId: row.assigned_user_id,
          assignedUserName: row.assigned_user_name,
          lastMessageAt: row.last_message_at?.toISOString() ?? null,
          lastMessageText: msgRes.rows.at(-1)?.body_text ?? null,
          lastInboundAt: lastInboundAt?.toISOString() ?? null,
          withinServiceWindow: canSendFreeformReply(lastInboundAt),
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        },
        messages: msgRes.rows.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          channel: m.channel,
          externalMessageId: m.external_message_id,
          direction: m.direction,
          messageType: m.message_type,
          bodyText: m.body_text,
          deliveryStatus: m.delivery_status,
          providerTimestamp: m.provider_timestamp?.toISOString() ?? null,
          createdAt: m.created_at.toISOString(),
        })),
        notes: notesRes.rows.map((n) => ({
          id: n.id,
          conversationId: n.conversation_id,
          authorUserId: n.author_user_id,
          authorName: n.author_name || "Anggota Tim",
          bodyText: n.body_text,
          createdAt: n.created_at.toISOString(),
        })),
      };
    });

    if (!detail) return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    return Response.json(detail, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Detail percakapan belum dapat dimuat.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, conversationId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidConv = validateUuidParam(conversationId, "ID percakapan");
  if (invalidConv) return invalidConv;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = updateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Data pembaruan percakapan tidak valid." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };

      const existing = await client.query<{
        id: string;
        status: string;
        priority: string;
        subject: string | null;
        tags: string[] | null;
        assigned_user_id: string | null;
        unread_count: number;
      }>(
        "SELECT id, status, priority, subject, tags, assigned_user_id, unread_count FROM conversations WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, conversationId],
      );
      if (!existing.rows[0]) return { kind: "not_found" as const };
      const curr = existing.rows[0];

      const nextStatus = parsed.data.status ?? curr.status;
      const nextPriority = parsed.data.priority ?? curr.priority;
      const nextSubject = parsed.data.subject === undefined ? curr.subject : parsed.data.subject;
      const nextTags = parsed.data.tags === undefined ? curr.tags ?? [] : normalizeTags(parsed.data.tags);
      const nextAssigned = parsed.data.assignedUserId === undefined ? curr.assigned_user_id : parsed.data.assignedUserId;
      const nextUnread = parsed.data.markRead ? 0 : curr.unread_count;

      const updated = await client.query(
        `UPDATE conversations
            SET status = $3,
                priority = $4,
                subject = $5,
                tags = $6::text[],
                assigned_user_id = $7::uuid,
                unread_count = $8,
                updated_at = now()
          WHERE tenant_id = $1::uuid AND id = $2::uuid
          RETURNING id, status, priority, subject, tags, assigned_user_id, unread_count, updated_at`,
        [tenantId, conversationId, nextStatus, nextPriority, nextSubject, nextTags, nextAssigned, nextUnread],
      );

      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'conversation.updated', 'conversation', $3, $4::jsonb)",
        [tenantId, tenant.userId, conversationId, JSON.stringify({ status: nextStatus, priority: nextPriority })],
      );

      return { kind: "ok" as const, row: updated.rows[0] };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak diizinkan mengubah percakapan." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    return Response.json({ conversation: result.row }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Percakapan belum dapat diperbarui.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, conversationId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidConv = validateUuidParam(conversationId, "ID percakapan");
  if (invalidConv) return invalidConv;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer" || tenant.role === "agent") return { kind: "forbidden" as const };
      const deleted = await client.query(
        "DELETE FROM conversations WHERE tenant_id = $1::uuid AND id = $2::uuid RETURNING id",
        [tenantId, conversationId],
      );
      if (deleted.rowCount !== 1) return { kind: "not_found" as const };
      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'conversation.deleted', 'conversation', $3, '{}'::jsonb)",
        [tenantId, tenant.userId, conversationId],
      );
      return { kind: "ok" as const };
    });

    if (result.kind === "forbidden") {
      return Response.json({ error: "Hanya owner, admin, atau supervisor yang dapat menghapus percakapan." }, { status: 403 });
    }
    if (result.kind === "not_found") return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: conversationId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Percakapan belum dapat dihapus.");
  }
}
