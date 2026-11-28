import { describe, expect, it } from "vitest";
import { POST as tenantsPost } from "@/app/api/tenants/route";

describe("Publisher HQ Live Tenant Webhook Security", () => {
  it("rejects unauthorized webhook POST without valid x-publisher-sync-secret", async () => {
    const res = await tenantsPost(
      new Request("http://localhost:3001/api/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant: {
            id: "ten-fake-1",
            fullName: "Attacker",
            businessName: "Fake Corp",
            email: "attacker@evil.test",
            phone: "08123",
            city: "Jakarta",
            platform: "web",
            editionId: "starter",
            licenseStatus: "trial",
            trialStartedAt: "2026-11-26T00:00:00.000Z",
            trialEndsAt: "2026-12-10T00:00:00.000Z",
            licenseKey: null,
            createdAt: "2026-11-26T00:00:00.000Z",
            updatedAt: "2026-11-26T00:00:00.000Z",
          },
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("accepts signed webhook POST from wacrm-seven-dusky.vercel.app", async () => {
    const res = await tenantsPost(
      new Request("http://localhost:3001/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publisher-sync-secret": "wacrm-publisher-sync-v42-default-key",
        },
        body: JSON.stringify({
          tenant: {
            id: "ten-live-1",
            fullName: "Dewi Lestari",
            businessName: "Butik Nusantara",
            email: "dewi@butiknusantara.id",
            phone: "081298765432",
            city: "Kediri",
            platform: "android",
            editionId: "starter",
            licenseStatus: "trial",
            trialStartedAt: "2026-11-26T00:00:00.000Z",
            trialEndsAt: "2026-12-10T00:00:00.000Z",
            licenseKey: null,
            createdAt: "2026-11-26T00:00:00.000Z",
            updatedAt: "2026-11-26T00:00:00.000Z",
          },
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; tenant: { email: string; platform: string } };
    expect(body.ok).toBe(true);
    expect(body.tenant.email).toBe("dewi@butiknusantara.id");
    expect(body.tenant.platform).toBe("android");
  });
});
