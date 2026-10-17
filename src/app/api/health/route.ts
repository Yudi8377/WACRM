import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Minimal liveness/readiness probe. Never return connection details or raw database errors. */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { status: 'not_ready', checks: { database: 'not_configured' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    await db.query('SELECT 1');
    return Response.json(
      { status: 'ok', checks: { database: 'ok' } },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return Response.json(
      { status: 'not_ready', checks: { database: 'unavailable' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
