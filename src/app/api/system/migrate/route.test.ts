import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/system/migrate", () => {
  const originalCron = process.env.CRON_SECRET;
  const originalDb = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCron;
    if (originalDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDb;
  });

  it("rejects missing or invalid authorization token", async () => {
    process.env.CRON_SECRET = "migration-secret-at-least-32-characters-long";
    const req = new Request("http://localhost/api/system/migrate", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 503 when authorized but Neon DB is not configured", async () => {
    process.env.CRON_SECRET = "migration-secret-at-least-32-characters-long";
    delete process.env.NEON_OWNER_DATABASE_URL;
    delete process.env.DATABASE_URL_UNPOOLED;
    delete process.env.POSTGRES_URL_NON_POOLING;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;

    const req = new Request("http://localhost/api/system/migrate", {
      method: "POST",
      headers: { authorization: "Bearer migration-secret-at-least-32-characters-long" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
