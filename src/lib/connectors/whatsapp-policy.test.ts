import { describe, expect, it } from "vitest";
import { canSendFreeformReply, isUuid, WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS } from "./whatsapp-policy";

describe("WhatsApp free-form reply policy", () => {
  const now = Date.parse("2026-10-18T12:00:00.000Z");

  it("allows a reply inside the 24-hour customer service window", () => {
    expect(canSendFreeformReply("2026-10-18T11:00:00.000Z", now)).toBe(true);
  });

  it("rejects a reply at or beyond the 24-hour boundary", () => {
    expect(canSendFreeformReply(now - WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS, now)).toBe(false);
    expect(canSendFreeformReply(now - WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS - 1, now)).toBe(false);
  });

  it("rejects missing, invalid, and future inbound timestamps", () => {
    expect(canSendFreeformReply(null, now)).toBe(false);
    expect(canSendFreeformReply("not-a-date", now)).toBe(false);
    expect(canSendFreeformReply(now + 1, now)).toBe(false);
  });
});

describe("UUID validation", () => {
  it("accepts valid UUIDs", () => {
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
  });

  it("rejects non-UUID identifiers", () => {
    expect(isUuid("../other-tenant")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
