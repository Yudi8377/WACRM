import { describe, expect, it, vi } from "vitest";
import { EvolutionApiError, sendEvolutionText } from "./evolution-api";

const config = {
  baseUrl: "https://evolution.example.test",
  apiKey: "test-api-key-that-is-long-enough",
  instanceName: "tenant_abc-whatsapp",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("Evolution API optional provider adapter", () => {
  it("sends a text message using the API key header and extracts the provider ID", async () => {
    const request = vi.fn(async () => ok({ key: { id: "evo-message-123" } }));
    const result = await sendEvolutionText(config, { to: "+6281234567890", text: "Halo" }, request as typeof fetch);
    expect(result).toEqual({ externalMessageId: "evo-message-123", status: "accepted" });
    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://evolution.example.test/message/sendText/tenant_abc-whatsapp");
    expect(new Headers(init.headers).get("apikey")).toBe(config.apiKey);
    expect(JSON.parse(String(init.body))).toEqual({ number: "6281234567890", text: "Halo" });
  });

  it("supports a nested response message ID", async () => {
    const request = vi.fn(async () => ok({ data: { key: { id: "nested-id" } } }));
    await expect(sendEvolutionText(config, { to: "6281234567890", text: "Test" }, request as typeof fetch))
      .resolves.toMatchObject({ externalMessageId: "nested-id" });
  });

  it("rejects plain HTTP except loopback", async () => {
    await expect(sendEvolutionText({ ...config, baseUrl: "http://evolution.example.test" }, { to: "6281234567890", text: "x" }))
      .rejects.toThrow("must use HTTPS");
    const request = vi.fn(async () => ok({ key: { id: "local-id" } }));
    await expect(sendEvolutionText({ ...config, baseUrl: "http://localhost:8080" }, { to: "6281234567890", text: "x" }, request as typeof fetch))
      .resolves.toMatchObject({ externalMessageId: "local-id" });
  });

  it("rejects invalid instance names, recipients, and empty messages", async () => {
    await expect(sendEvolutionText({ ...config, instanceName: "../other" }, { to: "6281234567890", text: "x" }))
      .rejects.toThrow("instance name is invalid");
    await expect(sendEvolutionText(config, { to: "not-a-phone", text: "x" }))
      .rejects.toThrow("international phone number");
    await expect(sendEvolutionText(config, { to: "6281234567890", text: " " }))
      .rejects.toThrow("Message text");
  });

  it("marks rate limits and server errors retryable without exposing provider bodies", async () => {
    for (const status of [429, 503]) {
      const request = vi.fn(async () => ok({ error: { message: "secret internal detail" } }, status));
      try {
        await sendEvolutionText(config, { to: "6281234567890", text: "x" }, request as typeof fetch);
        throw new Error("expected failure");
      } catch (error) {
        expect(error).toBeInstanceOf(EvolutionApiError);
        expect((error as EvolutionApiError).retryable).toBe(true);
        expect((error as Error).message).not.toContain("secret internal detail");
      }
    }
  });

  it("does not report accepted if the provider omits a message ID", async () => {
    const request = vi.fn(async () => ok({ status: "success" }));
    await expect(sendEvolutionText(config, { to: "6281234567890", text: "x" }, request as typeof fetch))
      .rejects.toMatchObject({ retryable: true });
  });
});
