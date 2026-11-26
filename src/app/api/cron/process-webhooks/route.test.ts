import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/cron/process-webhooks", () => {
  const originalCron = process.env.CRON_SECRET;
  const originalDb = process.env.DATABASE_URL;
  const originalWorker = process.env.WEBHOOK_WORKER_DATABASE_URL;

  afterEach(() => {
    if (originalCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCron;
    if (originalDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDb;
    if (originalWorker === undefined) delete process.env.WEBHOOK_WORKER_DATABASE_URL;
    else process.env.WEBHOOK_WORKER_DATABASE_URL = originalWorker;
  });

  it("rejects unauthorized requests with 401", async () => {
    process.env.CRON_SECRET = "super-secret-cron-token-minimum-32-chars";
    const req = new Request("http://localhost/api/cron/process-webhooks", {
      method: "POST",
      headers: { authorization: "Bearer wrong-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 503 when authorized but database is unconfigured", async () => {
    process.env.CRON_SECRET = "super-secret-cron-token-minimum-32-chars";
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.WEBHOOK_WORKER_DATABASE_URL;

    const req = new Request("http://localhost/api/cron/process-webhooks", {
      method: "POST",
      headers: { authorization: "Bearer super-secret-cron-token-minimum-32-chars" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
