import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { client, connect } = vi.hoisted(() => ({
  client: { query: vi.fn(), release: vi.fn() },
  connect: vi.fn()
}));
vi.mock('@/lib/db', () => ({ db: { connect } }));

import { TenantAccessError, withTenantContext } from './tenant-context';

beforeEach(() => {
  vi.clearAllMocks();
  connect.mockResolvedValue(client);
  client.query.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT role FROM organization_members')) return { rows: [{ role: 'admin' }] };
    return { rows: [] };
  });
});

afterEach(() => vi.resetAllMocks());

describe('withTenantContext', () => {
  const identity = { userId: '11111111-1111-4111-8111-111111111111', tenantId: '22222222-2222-4222-8222-222222222222' };

  it('sets transaction-local tenant context, checks membership, and commits', async () => {
    const result = await withTenantContext(identity, async (_client, context) => context.role);
    expect(result).toBe('admin');
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("set_config('app.user_id'"), [identity.userId, identity.tenantId]);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('organization_members'), [identity.tenantId, identity.userId]);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rejects users without active membership and rolls back', async () => {
    client.query.mockImplementation(async (sql: string) => sql.startsWith('SELECT role FROM organization_members') ? { rows: [] } : { rows: [] });
    await expect(withTenantContext(identity, async () => 'must not run')).rejects.toBeInstanceOf(TenantAccessError);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back if tenant-scoped work fails', async () => {
    await expect(withTenantContext(identity, async () => { throw new Error('operation failed'); })).rejects.toThrow('operation failed');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rejects missing identity before opening a database connection', async () => {
    await expect(withTenantContext({ userId: '', tenantId: identity.tenantId }, async () => 'never')).rejects.toBeInstanceOf(TenantAccessError);
    expect(connect).not.toHaveBeenCalled();
  });
});
