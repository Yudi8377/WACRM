import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { decryptConnectorToken } from "@/lib/connectors/token-crypto";
import { sendWhatsAppText, WhatsAppCloudError } from "@/lib/connectors/whatsapp-cloud";
import { canSendFreeformReply, isUuid } from "@/lib/connectors/whatsapp-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(4096),
});

type RouteParams = { tenantId: string; conversationId: string };

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
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
  try { input = await request.json(); }
  catch { return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 }); }
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
    | { kind: "send"; messageId: string; accessToken: string; phoneNumberId: string; recipient: string };

  let prepared: Prepared;
  try {
    prepared = await withTenantContext(
      { userId: session.user.id, tenantId },
      async (client, tenant) => {
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
          status: string;
          external_account_id: string;
          external_contact_id: string;
          token_ciphertext: string | null;
          token_nonce: string | null;
          token_key_version: number | null;
          last_inbound_at: Date | string | null;
        }>(
          `SELECT conv.id, conv.status,
                  conn.external_account_id, conn.token_ciphertext, conn.token_nonce, conn.token_key_version,
                  identity.external_contact_id,
                  (SELECT COALESCE(m.provider_timestamp, m.created_at)
                     FROM messages m
                    WHERE m.tenant_id = conv.tenant_id
                      AND m.conversation_id = conv.id
                      AND m.direction = 'inbound'
                    ORDER BY COALESCE(m.provider_timestamp, m.created_at) DESC
                    LIMIT 1) AS last_inbound_at
             FROM conversations conv
             JOIN channel_connections conn
               ON conn.tenant_id = conv.tenant_id AND conn.id = conv.connection_id
             JOIN contact_channel_identities identity
               ON identity.tenant_id = conv.tenant_id
              AND identity.contact_id = conv.contact_id
              AND identity.channel = 'whatsapp'
            WHERE conv.tenant_id = $1::uuid
              AND conv.id = $2::uuid
              AND conv.channel = 'whatsapp'
              AND conv.status IN ('open', 'pending')
              AND conn.channel = 'whatsapp'
              AND conn.status = 'connected'
            LIMIT 1`,
          [tenantId, conversationId],
        );
        const row = conversation.rows[0];
        if (!row) return { kind: "not_found" as const };
        if (!canSendFreeformReply(row.last_inbound_at)) return { kind: "window_closed" as const };
        if (!row.token_ciphertext || !row.token_nonce || !row.token_key_version) {
          return { kind: "connection_not_ready" as const };
        }

        let accessToken: string;
        try {
          accessToken = decryptConnectorToken({
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

        return {
          kind: "send" as const,
          messageId: inserted.rows[0].id,
          accessToken,
          phoneNumberId: row.external_account_id,
          recipient: row.external_contact_id,
        };
      },
    );
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return Response.json({ error: "Anda tidak memiliki akses ke workspace ini." }, { status: 403 });
    }
    return Response.json({ error: "Permintaan belum dapat diproses." }, { status: 500 });
  }

  if (prepared.kind === "forbidden") return Response.json({ error: "Peran viewer tidak diizinkan mengirim pesan." }, { status: 403 });
  if (prepared.kind === "not_found") return Response.json({ error: "Percakapan WhatsApp tidak ditemukan atau koneksi tidak aktif." }, { status: 404 });
  if (prepared.kind === "connection_not_ready") return Response.json({ error: "Kredensial koneksi WhatsApp belum siap. Periksa koneksi dan kunci enkripsi." }, { status: 503 });
  if (prepared.kind === "window_closed") return Response.json({ error: "Jendela layanan 24 jam telah berakhir. Gunakan alur template WhatsApp yang disetujui." }, { status: 409 });
  if (prepared.kind === "idempotency_conflict") return Response.json({ error: "Idempotency-Key ini sudah dipakai untuk percakapan lain." }, { status: 409 });
  if (prepared.kind === "replay") {
    const status = prepared.status === "queued" ? 202 : 200;
    return Response.json({
      messageId: prepared.messageId,
      externalMessageId: prepared.externalMessageId,
      status: prepared.status,
      idempotentReplay: true,
      ...(prepared.status === "queued" ? { warning: "Status pengiriman belum final; jangan kirim ulang otomatis dengan kunci baru." } : {}),
    }, { status });
  }

  let sent: { externalMessageId: string; status: string };
  try {
    sent = await sendWhatsAppText(
      { accessToken: prepared.accessToken, phoneNumberId: prepared.phoneNumberId },
      { to: prepared.recipient, text: parsed.data.text },
    );
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
    const retryable = error instanceof WhatsAppCloudError && error.retryable;
    return Response.json({
      error: "WhatsApp belum mengonfirmasi pengiriman. Periksa status pesan sebelum mencoba lagi.",
      messageId: prepared.messageId,
      retryable,
      automaticRetry: false,
    }, { status: 502 });
  }

  try {
    await withTenantContext({ userId: session.user.id, tenantId }, async (client) => {
      const updated = await client.query(
        "UPDATE messages SET external_message_id = $1, delivery_status = 'sent', provider_timestamp = now() WHERE tenant_id = $2::uuid AND id = $3::uuid AND client_request_id = $4::uuid AND delivery_status = 'queued'",
        [sent.externalMessageId, tenantId, prepared.messageId, idempotencyKey],
      );
      if (updated.rowCount !== 1) throw new Error("message_status_not_updated");
      await client.query(
        "UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, conversationId],
      );
    });
  } catch {
    // Provider accepted the send. Keep the idempotency record and avoid another provider call.
    return Response.json({
      messageId: prepared.messageId,
      status: "queued",
      warning: "WhatsApp mungkin telah menerima pesan, tetapi status belum tersimpan. Jangan kirim ulang otomatis.",
    }, { status: 503 });
  }

  return Response.json({
    messageId: prepared.messageId,
    externalMessageId: sent.externalMessageId,
    status: "sent",
  }, { status: 201 });
}
