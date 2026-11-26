import { createHash } from "node:crypto";
import { db, isDatabaseConfigured } from "@/lib/db";
import { safeEqual } from "@/lib/connectors/meta-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Optional webhook intake for self-hosted Evolution API instances.
 * Fails closed unless EVOLUTION_WEBHOOK_SECRET and DATABASE_URL are configured.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!expectedSecret || !isDatabaseConfigured()) {
    return Response.json({ error: "Evolution webhook intake is not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-wacrm-webhook-secret") || "";
  if (!provided || !safeEqual(provided, expectedSecret)) {
    return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return Response.json({ error: "Payload too large" }, { status: 413 });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const instanceName = typeof payload.instance === "string" ? payload.instance.slice(0, 128) : null;
  const eventKey = createHash("sha256").update(`evolution:${rawBody}`, "utf8").digest("hex");

  try {
    await db.query(
      `INSERT INTO webhook_inbox (provider, event_key, provider_account_id, payload, signature_verified)
       VALUES ('meta', $1, $2, $3::jsonb, true)
       ON CONFLICT (provider, event_key) DO NOTHING`,
      [eventKey, instanceName, JSON.stringify(payload)],
    );
    return Response.json({ received: true }, { status: 200 });
  } catch {
    return Response.json({ error: "Webhook persistence failed" }, { status: 503 });
  }
}
