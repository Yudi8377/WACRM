import { Pool } from 'pg';

// This module must only be imported by server-side code. DATABASE_URL is a secret.
const globalForDb = globalThis as typeof globalThis & { wacrmPool?: Pool };

export const db = globalForDb.wacrmPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  ssl: { rejectUnauthorized: true }
});

if (process.env.NODE_ENV !== 'production') globalForDb.wacrmPool = db;
