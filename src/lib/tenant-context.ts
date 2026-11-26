import type { PoolClient } from 'pg';
import { db } from '@/lib/db';

export type TenantRole = 'owner' | 'admin' | 'supervisor' | 'agent' | 'viewer';

export class TenantAccessError extends Error {
  readonly code = 'TENANT_ACCESS_DENIED';
  constructor() {
    super('Active membership in this organization is required.');
    this.name = 'TenantAccessError';
  }
}

export type TenantContext = { userId: string; tenantId: string; role: TenantRole };

/**
 * Run tenant-scoped database work inside one transaction.
 * userId MUST come from a verified server-side session, never request input.
 * tenantId is accepted only after active membership is verified in this transaction.
 * The database runtime role must be non-superuser and NOBYPASSRLS.
 */
const ROLE_RANK: Record<TenantRole, number> = {
  viewer: 1,
  agent: 2,
  supervisor: 3,
  admin: 4,
  owner: 5,
};

export async function withTenantContext<T>(
  identity: { userId: string; tenantId: string; minRole?: TenantRole },
  work: (client: PoolClient, context: TenantContext) => Promise<T>
): Promise<T> {
  if (!identity.userId || !identity.tenantId) throw new TenantAccessError();
  const client = await db.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    // Transaction-local settings are cleared automatically at COMMIT/ROLLBACK.
    await client.query("SELECT set_config('app.user_id', $1, true), set_config('app.tenant_id', $2, true)", [identity.userId, identity.tenantId]);
    const membership = await client.query<{ role: TenantRole }>(
      "SELECT role FROM organization_members WHERE tenant_id = $1::uuid AND user_id = $2::uuid AND status = 'active' LIMIT 1",
      [identity.tenantId, identity.userId]
    );
    if (!membership.rows[0]) throw new TenantAccessError();
    const role = membership.rows[0].role;
    if (identity.minRole && ROLE_RANK[role] < ROLE_RANK[identity.minRole]) {
      throw new TenantAccessError();
    }
    const result = await work(client, { userId: identity.userId, tenantId: identity.tenantId, role });
    await client.query('COMMIT');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try { await client.query('ROLLBACK'); } catch { /* preserve the original failure */ }
    }
    throw error;
  } finally {
    client.release();
  }
}
