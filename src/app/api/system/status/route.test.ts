import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/system/status", () => {
  const originalDb = process.env.DATABASE_URL;
  const originalPg = process.env.POSTGRES_URL;
  const originalAuth = process.env.AUTH_SECRET;

  afterEach(() => {
    if (originalDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDb;
    if (originalPg === undefined) delete process.env.POSTGRES_URL;
    else process.env.POSTGRES_URL = originalPg;
    if (originalAuth === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalAuth;
  });

  it("reports target Neon project metadata and unconfigured state cleanly", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.AUTH_SECRET;

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.neon.projectId).toBe("small-tree-35716017");
    expect(body.neon.branchId).toBe("br-patient-mud-a1xi2iun");
    expect(body.checks.databaseConfigured).toBe(false);
    expect(body.checks.databaseConnected).toBe(false);
    expect(body.readyForLiveAuth).toBe(false);
  });
});
