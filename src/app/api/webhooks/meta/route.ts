import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { safeEqual, verifyMetaSignature } from '@/lib/connectors/meta-signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getProviderAccountId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as { entry?: Array<{ id?: unknown; changes?: Array<{ value?: { metadata?: { phone_number_id?: unknown } } }> }> };
  const firstEntry = root.entry?.[0];
  const phoneNumberId = firstEntry?.changes?.[0]?.value?.metadata?.phone_number_id;
  if (typeof phoneNumberId === 'string' && phoneNumberId.length > 0) return phoneNumberId;
  if (typeof firstEntry?.id === 'string' && firstEntry.id.length > 0) return firstEntry.id;
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken || mode !== 'subscribe' || !token || !challenge || !safeEqual(token, expectedToken)) {
    return new Response('Forbidden', { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !process.env.DATABASE_URL) {
    return Response.json({ error: 'Webhook intake is not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return Response.json({ error: 'Payload too large' }, { status: 413 });
  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const eventKey = createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const providerAccountId = getProviderAccountId(payload);
  try {
    await db.query(
      `INSERT INTO webhook_inbox (provider, event_key, provider_account_id, payload, signature_verified)
       VALUES ('meta', $1, $2, $3::jsonb, true)
       ON CONFLICT (provider, event_key) DO NOTHING`,
      [eventKey, providerAccountId, JSON.stringify(payload)]
    );
  } catch {
    // Do not acknowledge an event until durable persistence succeeds; Meta can retry delivery.
    return Response.json({ error: 'Webhook persistence failed' }, { status: 503 });
  }

  return Response.json({ received: true }, { status: 200 });
}
