import { randomUUID } from "node:crypto";
import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, normalizeTags, requireSession, validateUuidParam } from "@/lib/api-auth";
import { canSendFreeformReply } from "@/lib/connectors/whatsapp-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createConversationSchema = z.object({
  contactId: z.string().uuid(),
  connectionId: z.string().uuid().optional(),
  channel: z.enum(["whatsapp", "facebook_messenger", "instagram", "tiktok", "youtube"]).default("whatsapp"),
  subject: z.string().trim().max(160).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  tags: z.array(z.string()).optional(),
  initialMessage: z.string().trim().max(4096).optional(),
  initialDirection: z.enum(["inbound", "outbound", "system"]).default("inbound"),
});

export async function GET(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() || "";
  const channel = url.searchParams.get("channel")?.trim() || "";
  const priority = url.searchParams.get("priority")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";

  try {
    const conversations = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      const params: unknown[] = [tenantId];
      const conditions = ["conv.tenant_id = $1::uuid"];

      if (status && ["open", "pending", "resolved", "archived"].includes(status)) {
        params.push(status);
        conditions.push(`conv.status = $${params.length}`);
      }
      if (channel && ["whatsapp", "facebook_messenger", "instagram", "tiktok", "youtube"].includes(channel)) {
        params.push(channel);
        conditions.push(`conv.channel = $${params.length}`);
      }
      if (priority && ["low", "normal", "high", "urgent"].includes(priority)) {
        params.push(priority);
        conditions.push(`conv.priority = $${params.length}`);
      }
      if (q) {
        params.push(`%${q}%`);
        conditions.push(
          `(c.display_name ILIKE $${params.length} OR c.phone_e164 ILIKE $${params.length} OR conv.subject ILIKE $${params.length})`,
        );
      }

      const result = await client.query<{
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
        last_message_text: string | null;
        last_inbound_at: Date | null;
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
                conv.last_message_at,
                (SELECT m.body_text FROM messages m WHERE m.tenant_id = conv.tenant_id AND m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_text,
                (SELECT COALESCE(m.provider_timestamp, m.created_at) FROM messages m WHERE m.tenant_id = conv.tenant_id AND m.conversation_id = conv.id AND m.direction = 'inbound' ORDER BY COALESCE(m.provider_timestamp, m.created_at) DESC LIMIT 1) AS last_inbound_at,
                conv.created_at, conv.updated_at
           FROM conversations conv
           JOIN contacts c ON c.tenant_id = conv.tenant_id AND c.id = conv.contact_id
           JOIN channel_connections conn ON conn.tenant_id = conv.tenant_id AND conn.id = conv.connection_id
           LEFT JOIN user_profiles up ON up.id = conv.assigned_user_id
          WHERE ${conditions.join(" AND ")}
          ORDER BY conv.last_message_at DESC NULLS LAST, conv.updated_at DESC
          LIMIT 150`,
        params,
      );

      return result.rows.map((row) => ({
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
        lastMessageText: row.last_message_text,
        lastInboundAt: row.last_inbound_at?.toISOString() ?? null,
        withinServiceWindow: canSendFreeformReply(row.last_inbound_at),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));
    });

    return Response.json({ conversations }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Daftar percakapan belum dapat dimuat.");
  }
}

export async function POST(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Data percakapan tidak valid." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };

      const contactRes = await client.query<{ id: string; phone_e164: string | null; display_name: string | null }>(
        "SELECT id, phone_e164, display_name FROM contacts WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, parsed.data.contactId],
      );
      if (!contactRes.rows[0]) return { kind: "contact_not_found" as const };

      let connectionId = parsed.data.connectionId;
      let channel = parsed.data.channel;
      if (connectionId) {
        const connRes = await client.query<{ id: string; channel: string }>(
          "SELECT id, channel FROM channel_connections WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
          [tenantId, connectionId],
        );
        if (!connRes.rows[0]) return { kind: "connection_not_found" as const };
        channel = connRes.rows[0].channel as typeof channel;
      } else {
        const existingConn = await client.query<{ id: string }>(
          "SELECT id FROM channel_connections WHERE tenant_id = $1::uuid AND channel = $2 ORDER BY (status = 'connected') DESC, updated_at DESC LIMIT 1",
          [tenantId, channel],
        );
        if (existingConn.rows[0]) {
          connectionId = existingConn.rows[0].id;
        } else {
          const createdConn = await client.query<{ id: string }>(
            `INSERT INTO channel_connections (tenant_id, channel, display_name, external_account_id, status, metadata)
             VALUES ($1::uuid, $2, $3, $4, 'pending', '{"manual_inbox": true}'::jsonb)
             RETURNING id`,
            [tenantId, channel, `Kanal ${channel.toUpperCase()}`, `manual-${channel}-${tenantId.slice(0, 8)}`],
          );
          connectionId = createdConn.rows[0].id;
        }
      }

      const externalConvId =
        contactRes.rows[0].phone_e164?.replace(/^\+/, "") || `conv-${parsed.data.contactId.slice(0, 8)}-${randomUUID().slice(0, 6)}`;

      const convRes = await client.query<{ id: string }>(
        `INSERT INTO conversations
           (tenant_id, connection_id, contact_id, channel, external_conversation_id, status, priority, subject, tags, assigned_user_id, last_message_at, unread_count)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'open', $6, $7, $8::text[], $9::uuid, now(), $10)
         ON CONFLICT (tenant_id, channel, external_conversation_id)
         DO UPDATE SET
           status = 'open',
           priority = EXCLUDED.priority,
           subject = COALESCE(EXCLUDED.subject, conversations.subject),
           last_message_at = now(),
           updated_at = now()
         RETURNING id`,
        [
          tenantId,
          connectionId,
          parsed.data.contactId,
          channel,
          externalConvId,
          parsed.data.priority,
          parsed.data.subject || null,
          normalizeTags(parsed.data.tags),
          tenant.userId,
          parsed.data.initialDirection === "inbound" && parsed.data.initialMessage ? 1 : 0,
        ],
      );
      const conversationId = convRes.rows[0].id;

      if (parsed.data.initialMessage) {
        await client.query(
          `INSERT INTO messages (tenant_id, conversation_id, channel, direction, message_type, body_text, delivery_status, provider_timestamp)
           VALUES ($1::uuid, $2::uuid, $3, $4, 'text', $5, $6, now())`,
          [
            tenantId,
            conversationId,
            channel,
            parsed.data.initialDirection,
            parsed.data.initialMessage,
            parsed.data.initialDirection === "inbound" ? "received" : "sent",
          ],
        );
      }

      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'conversation.created', 'conversation', $3, $4::jsonb)",
        [tenantId, tenant.userId, conversationId, JSON.stringify({ channel, priority: parsed.data.priority })],
      );

      return { kind: "ok" as const, id: conversationId };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat membuat percakapan." }, { status: 403 });
    if (result.kind === "contact_not_found") return Response.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    if (result.kind === "connection_not_found") return Response.json({ error: "Koneksi kanal tidak ditemukan." }, { status: 404 });
    return Response.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Percakapan belum dapat dibuat.");
  }
}
