import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured before authentication is used.");
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must be set to a strong secret of at least 32 characters.");
}

const globalForAuth = globalThis as typeof globalThis & { wacrmAuthPool?: Pool };
const authPool = globalForAuth.wacrmAuthPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
});
if (process.env.NODE_ENV !== "production") globalForAuth.wacrmAuthPool = authPool;

export const auth = betterAuth({
  appName: "WACRM",
  database: authPool,
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL || process.env.APP_URL || "http://localhost:3000",
  trustedOrigins: [...new Set([process.env.APP_URL, process.env.AUTH_URL, "http://localhost:3000"].filter((origin): origin is string => Boolean(origin)))],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Keep the CRM profile ID identical to Better Auth's UUID user ID.
          const client = await authPool.connect();
          try {
            await client.query("BEGIN");
            await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
            await client.query(
              "INSERT INTO user_profiles (id, display_name) VALUES ($1::uuid, $2) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()",
              [user.id, user.name]
            );
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
