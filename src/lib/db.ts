import { Pool } from "pg";

// This module must only be imported by server-side code. DATABASE_URL is a secret.
const globalForDb = globalThis as typeof globalThis & { wacrmPool?: Pool };

export const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID || "small-tree-35716017";
export const NEON_BRANCH_ID = process.env.NEON_BRANCH_ID || "br-patient-mud-a1xi2iun";
export const NEON_CONSOLE_URL = `https://console.neon.tech/app/projects/${NEON_PROJECT_ID}/branches/${NEON_BRANCH_ID}`;

export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

function createPool(): Pool {
  const connectionString = getDatabaseUrl();
  const isLocal = connectionString
    ? /@(localhost|127\.0\.0\.1|::1)(:|\/)/.test(connectionString) || connectionString.includes("sslmode=disable")
    : false;
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
  });
}

export function getDbPool(): Pool {
  if (!globalForDb.wacrmPool) {
    globalForDb.wacrmPool = createPool();
  }
  return globalForDb.wacrmPool;
}

export const db: Pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const pool = getDbPool();
    const value = Reflect.get(pool, prop, receiver);
    return typeof value === "function" ? value.bind(pool) : value;
  },
});
