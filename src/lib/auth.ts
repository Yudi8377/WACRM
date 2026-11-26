import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/db";

type BetterAuthInstance = ReturnType<typeof createAuthInstance>;

const globalForAuth = globalThis as typeof globalThis & {
  wacrmAuthPool?: Pool;
  wacrmAuthInstance?: BetterAuthInstance;
};

export function isAuthConfigured(): boolean {
  return Boolean(getDatabaseUrl() && process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
}

function getTrustedOrigins(): string[] {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;
  return [
    ...new Set(
      [
        process.env.APP_URL,
        process.env.AUTH_URL,
        vercelUrl,
        vercelProdUrl,
        "http://localhost:3000",
      ].filter((origin): origin is string => Boolean(origin)),
    ),
  ];
}

function createAuthInstance() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured before authentication is used.");
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be set to a strong secret of at least 32 characters.");
  }

  const isLocal = /@(localhost|127\.0\.0\.1|::1)(:|\/)/.test(databaseUrl) || databaseUrl.includes("sslmode=disable");
  const authPool =
    globalForAuth.wacrmAuthPool ??
    new Pool({
      connectionString: databaseUrl,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      ssl: isLocal ? undefined : { rejectUnauthorized: true },
    });
  if (process.env.NODE_ENV !== "production") globalForAuth.wacrmAuthPool = authPool;

  const baseURL =
    process.env.AUTH_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "http://localhost:3000";

  return betterAuth({
    appName: "WACRM",
    database: authPool,
    secret: process.env.AUTH_SECRET,
    baseURL,
    trustedOrigins: getTrustedOrigins(),
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
                [user.id, user.name],
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
}

export function getAuth(): BetterAuthInstance {
  if (!globalForAuth.wacrmAuthInstance) {
    globalForAuth.wacrmAuthInstance = createAuthInstance();
  }
  return globalForAuth.wacrmAuthInstance;
}

export const auth: BetterAuthInstance = new Proxy({} as BetterAuthInstance, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export async function getSafeSession(reqHeaders: Headers) {
  if (!isAuthConfigured()) return null;
  try {
    return await getAuth().api.getSession({ headers: reqHeaders });
  } catch {
    return null;
  }
}
