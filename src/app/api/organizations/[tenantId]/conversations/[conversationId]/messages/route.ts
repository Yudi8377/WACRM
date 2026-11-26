import { headers } from "next/headers";
import { z } from "zod";
import { auth, isAuthConfigured } from "@/lib/auth";
import { withTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { decryptConnectorToken } from "@/lib/connectors/token-crypto";
import { sendWhatsAppText, WhatsAppCloudError } from "@/lib/connectors/whatsapp-cloud";
import { sendEvolutionText, EvolutionApiError } from "@/lib/connectors/evolution-api";
import { canSendFreeformReply, isUuid } from "@/lib/connectors/whatsapp-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(4096),
});

type RouteParams = { tenantId: string; conversationId: string };

export async function GET(_request: Request, context: { params: Promise<RouteParams> }) {
  if (!isAuthConfigured()) {
    return Response.json({ error: "Database Neon belum aktif." }, { status: 503 });
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const { tenantId, conversationId } = await context.params;
  if (!isUuid(tenantId) || !isUuid(conversationId)) {
    return Response.json({ error: "ID workspace atau percakapan tidak valid." }, { status: 400 });
  }

  try {
    const messages = await withTenantContext({ userId: session.user.id, tenantId }, async (client) => {
      const res = await client.query<{
        id: string;
        conversation_id: string;
        channel: string;
        external_message_id: string | null;
        direction: string;
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
      return res.rows.map((m) => ({
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
      }));
    });
    return Response.json({ messages }, { status: 200 });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return Response.json({ error: "Anda tidak memiliki akses ke workspace ini." }, { status: 403 });
    }
    return Response.json({ error: "Pesan belum dapat dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  if (!isAuthConfigured()) {
    return Response.json({ error: "Database Neon belum aktif." }, { status: 503 });
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const { tenantId, conversationId } = await context.params;
  if (!isUuid(tenantId) || !isUuid(conversationId)) {
    return Response.json({ error: "ID workspace atau percakapan tidak valid." }, { status: 400 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!isUuid(idempotencyKey)) {
    return Response.json({ error: "Header Idempotency-Key wajib berisi UUID yang unik untuk permintaan ini." }, { status: 400 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return Response.json({ error: "Pesan teks harus berisi 1–4096 karakter." }, { status: 400 });
  }

  type Prepared =
    | { kind: "forbidden" }
    | { kind: "not_found" }
    | { kind: "connection_not_ready" }
    | { kind: "window_closed" }
    | { kind: "idempotency_conflict" }
    | { kind: "replay"; messageId: string; status: string; externalMessageId: string | null }
    | { kind: "send_whatsapp_cloud"; messageId: string; accessToken: string; phoneNumberId: string; recipient: string }
    | { kind: "send_evolution"; messageId: string; baseUrl: string; apiKey: string; instanceName: string; recipient: string }
    | { kind: "logged_manual"; messageId: string };

  let prepared: Prepared;
  try {
    prepared = await withTenantContext({ userId: session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };

      const existing = await client.query<{
        id: string;
        conversation_id: string;
        delivery_status: string;
        external_message_id: string | null;
      }>(
        "SELECT id, conversation_id, delivery_status, external_message_id FROM messages WHERE tenant_id = $1::uuid AND client_request_id = $2::uuid LIMIT 1",
        [tenantId, idempotencyKey],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].conversation_id !== conversationId) return { kind: "idempotency_conflict" as const };
        return {
          kind: "replay" as const,
          messageId: existing.rows[0].id,
          status: existing.rows[0].delivery_status,
          externalMessageId: existing.rows[0].external_message_id,
        };
      }

      const conversation = await client.query<{
        id: string;
        channel: string;
        status: string;
        conn_status: string;
        external_account_id: string;
        metadata: Record<string, unknown> | null;
        external_contact_id: string | null;
        phone_e164: string | null;
        token_ciphertext: string | null;
        token_nonce: string | null;
        token_key_version: number | null;
        last_inbound_at: Date | string | null;
      }>(
        `SELECT conv.id, conv.channel, conv.status,
                conn.status AS conn_status, conn.external_account_id, conn.metadata,
                conn.token_ciphertext, conn.token_nonce, conn.token_key_version,
                identity.external_contact_id, c.phone_e164,
                (SELECT COALESCE(m.provider_timestamp, m.created_at)
                   FROM messages m
                  WHERE m.tenant_id = conv.tenant_id
                    AND m.conversation_id = conv.id
                    AND m.direction = 'inbound'
                  ORDER BY COALESCE(m.provider_timestamp, m.created_at) DESC
                  LIMIT 1) AS last_inbound_at
           FROM conversations conv
           JOIN contacts c ON c.tenant_id = conv.tenant_id AND c.id = conv.contact_id
           JOIN channel_connections conn
             ON conn.tenant_id = conv.tenant_id AND conn.id = conv.connection_id
           LEFT JOIN contact_channel_identities identity
             ON identity.tenant_id = conv.tenant_id
            AND identity.contact_id = conv.contact_id
            AND identity.channel = conv.channel
          WHERE conv.tenant_id = $1::uuid
            AND conv.id = $2::uuid
            AND conv.status IN ('open', 'pending')
          LIMIT 1`,
        [tenantId, conversationId],
      );
      const row = conversation.rows[0];
      if (!row) return { kind: "not_found" as const };

      // Check if this is an active live provider connection (Meta WhatsApp Cloud API or Evolution API)
      const providerType = typeof row.metadata?.provider === "string" ? row.metadata.provider : "meta_cloud";
      const isLiveWhatsApp = row.channel === "whatsapp" && row.conn_status === "connected";

      if (isLiveWhatsApp) {
        if (!canSendFreeformReply(row.last_inbound_at)) return { kind: "window_closed" as const };
        if (!row.token_ciphertext || !row.token_nonce || !row.token_key_version) {
          return { kind: "connection_not_ready" as const };
        }
        const recipient = row.external_contact_id || row.phone_e164?.replace(/^\+/, "") || "";
        if (!recipient) return { kind: "not_found" as const };

        let secretToken: string;
        try {
          secretToken = decryptConnectorToken({
            ciphertext: row.token_ciphertext,
            nonce: row.token_nonce,
            keyVersion: row.token_key_version,
          });
        } catch {
          return { kind: "connection_not_ready" as const };
        }

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO messages
             (tenant_id, conversation_id, channel, direction, message_type, body_text, delivery_status, client_request_id)
           VALUES ($1::uuid, $2::uuid, 'whatsapp', 'outbound', 'text', $3, 'queued', $4::uuid)
           ON CONFLICT (tenant_id, client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
           RETURNING id`,
          [tenantId, conversationId, parsed.data.text, idempotencyKey],
        );
        if (!inserted.rows[0]) {
          const replay = await client.query<{
            id: string;
            conversation_id: string;
            delivery_status: string;
            external_message_id: string | null;
          }>(
            "SELECT id, conversation_id, delivery_status, external_message_id FROM messages WHERE tenant_id = $1::uuid AND client_request_id = $2::uuid LIMIT 1",
            [tenantId, idempotencyKey],
          );
          if (!replay.rows[0]) throw new Error("idempotency_record_missing");
          if (replay.rows[0].conversation_id !== conversationId) return { kind: "idempotency_conflict" as const };
          return {
            kind: "replay" as const,
            messageId: replay.rows[0].id,
            status: replay.rows[0].delivery_status,
            externalMessageId: replay.rows[0].external_message_id,
          };
        }

        if (providerType === "evolution_api") {
          const baseUrl = typeof row.metadata?.base_url === "string" ? row.metadata.base_url : "";
          const instanceName = typeof row.metadata?.instance_name === "string" ? row.metadata.instance_name : row.external_account_id;
          if (!baseUrl) return { kind: "connection_not_ready" as const };
          return {
            kind: "send_evolution" as const,
            messageId: inserted.rows[0].id,
            baseUrl,
            apiKey: secretToken,
            instanceName,
            recipient,
          };
        }

        return {
          kind: "send_whatsapp_cloud" as const,
          messageId: inserted.rows[0].id,
          accessToken: secretToken,
          phoneNumberId: row.external_account_id,
          recipient,
        };
      }

      // Non-connected / manual CRM log mode (e.g. pending channel setup or omnichannel log)
      const insertedManual = await client.query<{ id: string }>(
        `INSERT INTO messages
           (tenant_id, conversation_id, channel, direction, message_type, body_text, delivery_status, provider_timestamp, client_request_id)
         VALUES ($1::uuid, $2::uuid, $3, 'outbound', 'text', $4, 'sent', now(), $5::uuid)
         ON CONFLICT (tenant_id, client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
         RETURNING id`,
        [tenantId, conversationId, row.channel, parsed.data.text, idempotencyKey],
      );
      if (!insertedManual.rows[0]) {
        const replay = await client.query<{
          id: string;
          conversation_id: string;
          delivery_status: string;
          external_message_id: string | null;
        }>(
          "SELECT id, conversation_id, delivery_status, external_message_id FROM messages WHERE tenant_id = $1::uuid AND client_request_id = $2::uuid LIMIT 1",
          [tenantId, idempotencyKey],
        );
        if (!replay.rows[0]) throw new Error("idempotency_record_missing");
        if (replay.rows[0].conversation_id !== conversationId) return { kind: "idempotency_conflict" as const };
        return {
          kind: "replay" as const,
          messageId: replay.rows[0].id,
          status: replay.rows[0].delivery_status,
          externalMessageId: replay.rows[0].external_message_id,
        };
      }

      await client.query(
        "UPDATE conversations SET last_message_at = now(), unread_count = 0, updated_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, conversationId],
      );
      return { kind: "logged_manual" as const, messageId: insertedManual.rows[0].id };
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return Response.json({ error: "Anda tidak memiliki akses ke workspace ini." }, { status: 403 });
    }
    return Response.json({ error: "Permintaan belum dapat diproses." }, { status: 500 });
  }

  if (prepared.kind === "forbidden") return Response.json({ error: "Peran viewer tidak diizinkan mengirim pesan." }, { status: 403 });
  if (prepared.kind === "not_found") return Response.json({ error: "Percakapan tidak ditemukan atau sudah ditutup." }, { status: 404 });
  if (prepared.kind === "connection_not_ready") return Response.json({ error: "Kredensial koneksi WhatsApp belum siap. Periksa koneksi dan kunci enkripsi." }, { status: 503 });
  if (prepared.kind === "window_closed") return Response.json({ error: "Jendela layanan 24 jam telah berakhir. Gunakan alur template WhatsApp yang disetujui." }, { status: 409 });
  if (prepared.kind === "idempotency_conflict") return Response.json({ error: "Idempotency-Key ini sudah dipakai untuk percakapan lain." }, { status: 409 });
  if (prepared.kind === "logged_manual") {
    return Response.json({
      messageId: prepared.messageId,
      externalMessageId: null,
      status: "sent",
      note: "Tersimpan di CRM. Hubungkan kredensial resmi kanal untuk pengiriman otomatis ke provider.",
    }, { status: 201 });
  }
  if (prepared.kind === "replay") {
    const status = prepared.status === "queued" ? 202 : 200;
    return Response.json(
      {
        messageId: prepared.messageId,
        externalMessageId: prepared.externalMessageId,
        status: prepared.status,
        idempotentReplay: true,
        ...(prepared.status === "queued" ? { warning: "Status pengiriman belum final; jangan kirim ulang otomatis dengan kunci baru." } : {}),
      },
      { status },
    );
  }

  let sent: { externalMessageId: string; status: string };
  try {
    if (prepared.kind === "send_evolution") {
      sent = await sendEvolutionText(
        { baseUrl: prepared.baseUrl, apiKey: prepared.apiKey, instanceName: prepared.instanceName },
        { to: prepared.recipient, text: parsed.data.text },
      );
    } else {
      sent = await sendWhatsAppText(
        { accessToken: prepared.accessToken, phoneNumberId: prepared.phoneNumberId },
        { to: prepared.recipient, text: parsed.data.text },
      );
    }
  } catch (error) {
    try {
      await withTenantContext({ userId: session.user.id, tenantId }, async (client) => {
        await client.query(
          "UPDATE messages SET delivery_status = 'failed' WHERE tenant_id = $1::uuid AND id = $2::uuid AND client_request_id = $3::uuid AND delivery_status = 'queued'",
          [tenantId, prepared.messageId, idempotencyKey],
        );
      });
    } catch {
      // Keep the queued idempotency record if the status update fails; never auto-send again.
    }
    const retryable =
      (error instanceof WhatsAppCloudError && error.retryable) ||
      (error instanceof EvolutionApiError && error.retryable);
    return Response.json(
      {
        error: "WhatsApp belum mengonfirmasi pengiriman. Periksa status pesan sebelum mencoba lagi.",
        messageId: prepared.messageId,
        retryable,
        automaticRetry: false,
      },
      { status: 502 },
    );
  }

  try {
    await withTenantContext({ userId: session.user.id, tenantId }, async (client) => {
      const updated = await client.query(
        "UPDATE messages SET external_message_id = $1, delivery_status = 'sent', provider_timestamp = now() WHERE tenant_id = $2::uuid AND id = $3::uuid AND client_request_id = $4::uuid AND delivery_status = 'queued'",
        [sent.externalMessageId, tenantId, prepared.messageId, idempotencyKey],
      );
      if (updated.rowCount !== 1) throw new Error("message_status_not_updated");
      await client.query(
        "UPDATE conversations SET last_message_at = now(), unread_count = 0, updated_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, conversationId],
      );
    });
  } catch {
    return Response.json(
      {
        messageId: prepared.messageId,
        status: "queued",
        warning: "WhatsApp mungkin telah menerima pesan, tetapi status belum tersimpan. Jangan kirim ulang otomatis.",
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      messageId: prepared.messageId,
      externalMessageId: sent.externalMessageId,
      status: "sent",
    },
    { status: 201 },
  );
}
