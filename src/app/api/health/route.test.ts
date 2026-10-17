import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query } }));

import { GET } from './route';

const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe('GET /api/health', () => {
  it('returns 503 without a configured database URL', async () => {
    delete process.env.DATABASE_URL;
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'not_ready', checks: { database: 'not_configured' } });
    expect(query).not.toHaveBeenCalled();
  });

  it('returns ready when the database query succeeds', async () => {
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', checks: { database: 'ok' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('returns a generic 503 when the database is unavailable', async () => {
    query.mockRejectedValueOnce(new Error('sensitive connection detail'));
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('unavailable');
    expect(body).not.toContain('sensitive connection detail');
  });
});
