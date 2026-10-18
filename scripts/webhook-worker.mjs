import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.WEBHOOK_WORKER_DATABASE_URL;
if (!connectionString) {
  throw new Error("WEBHOOK_WORKER_DATABASE_URL must be configured for the isolated webhook worker.");
}

const pool = new Pool({
  connectionString,
  max: 3,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  ssl: { rejectUnauthorized: true },
  application_name: "wacrm-webhook-worker",
});

let stopping = false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

function log(level, event, fields = {}) {
  // Never log webhook payloads, message text, phone numbers, or credentials.
  console.log(JSON.stringify({ level, event, at: new Date().toISOString(), ...fields }));
}

async function claimNext() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      WITH candidate AS (
        SELECT id
        FROM webhook_inbox
        WHERE signature_verified = true
          AND provider = 'meta'
          AND (
            (processing_status IN ('received', 'retry')
              AND (next_attempt_at IS NULL OR next_attempt_at <= now()))
            OR
            (processing_status = 'processing'
              AND processing_started_at < now() - interval '5 minutes')
          )
        ORDER BY received_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE webhook_inbox AS inbox
      SET processing_status = 'processing',
          attempt_count = inbox.attempt_count + 1,
          processing_started_at = now(),
          last_error_code = NULL
      FROM candidate
      WHERE inbox.id = candidate.id
      RETURNING inbox.id, inbox.provider, inbox.payload, inbox.attempt_count
    `);
    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findConnection(phoneNumberId) {
  const result = await pool.query(
    `SELECT id, tenant_id, external_account_id
       FROM channel_connections
      WHERE channel = 'whatsapp'
        AND status = 'connected'
        AND external_account_id = $1
      LIMIT 1`,
    [phoneNumberId],
  );
  return result.rows[0] ?? null;
}

function providerTimestamp(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function messageText(message) {
  return message?.text?.body
    ?? message?.image?.caption
    ?? message?.video?.caption
    ?? message?.document?.caption
    ?? message?.interactive?.button_reply?.title
    ?? message?.interactive?.list_reply?.title
    ?? message?.button?.text
    ?? null;
}

function mediaMetadata(message) {
  const kind = message?.type;
  if (!kind || kind === "text") return [];
  const item = message[kind];
  if (!item || typeof item !== "object") return [{ type: String(kind) }];
  return [{
    type: String(kind),
    ...(typeof item.id === "string" ? { id: item.id } : {}),
    ...(typeof item.mime_type === "string" ? { mime_type: item.mime_type } : {}),
    ...(typeof item.sha256 === "string" ? { sha256: item.sha256 } : {}),
    ...(typeof item.filename === "string" ? { filename: item.filename } : {}),
    ...(typeof item.caption === "string" ? { caption: item.caption } : {}),
  }];
}

async function processInboundMessage(connection, message, contactProfile) {
  const waId = typeof message?.from === "string" ? message.from : "";
  const externalMessageId = typeof message?.id === "string" ? message.id : "";
  if (!waId || !externalMessageId) return;

  const tenantId = connection.tenant_id;
  const occurredAt = providerTimestamp(message.timestamp);
  const displayName = typeof contactProfile?.name === "string" ? contactProfile.name.slice(0, 160) : null;
  const phoneE164 = /^\d{6,16}$/.test(waId) ? `+${waId}` : null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    // Serialize identity creation for the same tenant/customer without exposing another tenant.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [tenantId, waId]);

    let identity = await client.query(
      "SELECT contact_id FROM contact_channel_identities WHERE tenant_id = $1::uuid AND channel = 'whatsapp' AND external_contact_id = $2 LIMIT 1",
      [tenantId, waId],
    );
    let contactId = identity.rows[0]?.contact_id;

    if (!contactId) {
      const contact = await client.query(
        "INSERT INTO contacts (tenant_id, display_name, phone_e164) VALUES ($1::uuid, $2, $3) RETURNING id",
        [tenantId, displayName, phoneE164],
      );
      contactId = contact.rows[0].id;
      await client.query(
        "INSERT INTO contact_channel_identities (tenant_id, contact_id, channel, external_contact_id) VALUES ($1::uuid, $2::uuid, 'whatsapp', $3) ON CONFLICT (tenant_id, channel, external_contact_id) DO NOTHING",
        [tenantId, contactId, waId],
      );
    } else if (displayName) {
      await client.query(
        "UPDATE contacts SET display_name = $3, updated_at = now() WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, contactId, displayName],
      );
    }

    const conversation = await client.query(
      `INSERT INTO conversations
        (tenant_id, connection_id, contact_id, channel, external_conversation_id, status, last_message_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'whatsapp', $4, 'open', $5::timestamptz)
       ON CONFLICT (tenant_id, channel, external_conversation_id)
       DO UPDATE SET
         last_message_at = CASE
           WHEN conversations.last_message_at IS NULL THEN EXCLUDED.last_message_at
           WHEN EXCLUDED.last_message_at IS NULL THEN conversations.last_message_at
           ELSE GREATEST(conversations.last_message_at, EXCLUDED.last_message_at)
         END,
         updated_at = now()
       RETURNING id`,
      [tenantId, connection.id, contactId, waId, occurredAt],
    );

    await client.query(
      `INSERT INTO messages
        (tenant_id, conversation_id, channel, external_message_id, direction, message_type, body_text, media, delivery_status, provider_timestamp)
       VALUES ($1::uuid, $2::uuid, 'whatsapp', $3, 'inbound', $4, $5, $6::jsonb, 'received', $7::timestamptz)
       ON CONFLICT (tenant_id, channel, external_message_id) DO NOTHING`,
      [
        tenantId,
        conversation.rows[0].id,
        externalMessageId,
        typeof message.type === "string" ? message.type.slice(0, 40) : "unknown",
        messageText(message),
        JSON.stringify(mediaMetadata(message)),
        occurredAt,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function processStatus(connection, status) {
  const externalMessageId = typeof status?.id === "string" ? status.id : "";
  const providerStatus = typeof status?.status === "string" ? status.status : "";
  const allowed = new Set(["sent", "delivered", "read", "failed"]);
  if (!externalMessageId || !allowed.has(providerStatus)) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [connection.tenant_id]);
    await client.query(
      "UPDATE messages SET delivery_status = $1 WHERE tenant_id = $2::uuid AND channel = 'whatsapp' AND external_message_id = $3",
      [providerStatus, connection.tenant_id, externalMessageId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function processPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.entry)) return;

  for (const entry of payload.entry) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== "messages" || !change.value || typeof change.value !== "object") continue;
      const value = change.value;
      const phoneNumberId = typeof value.metadata?.phone_number_id === "string"
        ? value.metadata.phone_number_id
        : "";
      if (!phoneNumberId) throw new Error("phone_number_id_missing");

      const connection = await findConnection(phoneNumberId);
      if (!connection) throw new Error("connection_not_found");

      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) {
        const profile = contacts.find((item) => item?.wa_id === message?.from)?.profile ?? null;
        await processInboundMessage(connection, message, profile);
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const status of statuses) await processStatus(connection, status);
    }
  }
}

async function markProcessed(id) {
  await pool.query(
    "UPDATE webhook_inbox SET processing_status = 'processed', processed_at = now(), processing_started_at = NULL, next_attempt_at = NULL, last_error_code = NULL WHERE id = $1::uuid AND signature_verified = true",
    [id],
  );
}

async function markFailed(id, attempts) {
  const deadLetter = attempts >= 10;
  await pool.query(
    `UPDATE webhook_inbox
        SET processing_status = $2,
            processing_started_at = NULL,
            next_attempt_at = CASE WHEN $2 = 'retry' THEN now() + interval '1 minute' ELSE NULL END,
            last_error_code = $3
      WHERE id = $1::uuid AND signature_verified = true`,
    [id, deadLetter ? "dead_letter" : "retry", "processing_failed"],
  );
  return deadLetter;
}

async function main() {
  log("info", "worker_started");
  while (!stopping) {
    try {
      const event = await claimNext();
      if (!event) {
        await sleep(1_000);
        continue;
      }

      try {
        await processPayload(event.payload);
        await markProcessed(event.id);
        log("info", "webhook_processed", { eventId: event.id });
      } catch (error) {
        const deadLetter = await markFailed(event.id, Number(event.attempt_count) || 1);
        log("warn", deadLetter ? "webhook_dead_letter" : "webhook_retry_scheduled", {
          eventId: event.id,
          errorCode: error?.message === "connection_not_found" ? "connection_not_found" : "processing_failed",
          attempts: Number(event.attempt_count) || 1,
        });
      }
    } catch {
      log("error", "worker_iteration_failed");
      await sleep(5_000);
    }
  }

  await pool.end();
  log("info", "worker_stopped");
}

main().catch(() => {
  log("error", "worker_stopped_unexpectedly");
  process.exitCode = 1;
});
