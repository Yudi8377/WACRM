import { describe, expect, it, vi } from "vitest";
import { MetaWhatsAppValidationError, validateMetaWhatsAppConnection } from "./meta-whatsapp-validation";

const input = {
  appId: "12345",
  appSecret: "app-secret-value",
  graphApiVersion: "v26.0",
  wabaId: "22222",
  phoneNumberId: "11111",
  accessToken: "EAAB-test-access-token",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function validRequest() {
  return vi.fn(async (request: string | URL | Request) => {
    const url = String(request);
    if (url.includes("/debug_token?")) {
      return response({ data: { app_id: "12345", is_valid: true, expires_at: 0, scopes: ["whatsapp_business_management", "whatsapp_business_messaging"] } });
    }
    if (url.includes("/11111?fields=")) {
      return response({ id: "11111", display_phone_number: "+15551234567", verified_name: "Example Business" });
    }
    if (url.includes("/22222/phone_numbers?")) return response({ data: [{ id: "11111" }] });
    return response({}, 404);
  });
}

describe("Meta WhatsApp connection validation", () => {
  it("validates app, scopes, phone number and WABA association", async () => {
    const request = validRequest();
    const result = await validateMetaWhatsAppConnection(input, request as typeof fetch);
    expect(result.phoneNumberId).toBe("11111");
    expect(result.wabaId).toBe("22222");
    expect(result.displayPhoneNumber).toBe("+15551234567");
    expect(result.verifiedName).toBe("Example Business");
    expect(result.tokenExpiresAt).toBeNull();
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("rejects tokens that belong to a different Meta app", async () => {
    const request = vi.fn(async () => response({ data: { app_id: "99999", is_valid: true, expires_at: 0, scopes: ["whatsapp_business_management", "whatsapp_business_messaging"] } }));
    await expect(validateMetaWhatsAppConnection(input, request as typeof fetch))
      .rejects.toMatchObject({ code: "invalid_token" });
  });

  it("rejects tokens missing required WhatsApp permissions", async () => {
    const request = vi.fn(async () => response({ data: { app_id: "12345", is_valid: true, expires_at: 0, scopes: ["whatsapp_business_management"] } }));
    await expect(validateMetaWhatsAppConnection(input, request as typeof fetch))
      .rejects.toMatchObject({ code: "missing_permissions" });
  });

  it("rejects a phone number not attached to the selected WABA", async () => {
    const request = validRequest().mockImplementation(async (request: string | URL | Request) => {
      const url = String(request);
      if (url.includes("/debug_token?")) return response({ data: { app_id: "12345", is_valid: true, expires_at: 0, scopes: ["whatsapp_business_management", "whatsapp_business_messaging"] } });
      if (url.includes("/11111?fields=")) return response({ id: "11111" });
      return response({ data: [{ id: "33333" }] });
    });
    await expect(validateMetaWhatsAppConnection(input, request as typeof fetch))
      .rejects.toMatchObject({ code: "account_mismatch" });
  });

  it("does not return raw provider errors", async () => {
    const request = vi.fn(async () => response({ error: { message: "sensitive provider detail" } }, 400));
    try {
      await validateMetaWhatsAppConnection(input, request as typeof fetch);
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(MetaWhatsAppValidationError);
      expect((error as Error).message).not.toContain("sensitive provider detail");
    }
  });
});
