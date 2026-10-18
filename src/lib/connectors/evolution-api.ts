import type { SendMessageResult } from "./types";

export type EvolutionApiConfig = {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
};

export type EvolutionSendTextInput = {
  to: string;
  text: string;
};

export class EvolutionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "EvolutionApiError";
  }
}

function validateBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EvolutionApiError("Evolution API base URL is invalid.");
  }
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    !["http:", "https:"].includes(url.protocol)
    || (!localHost && url.protocol !== "https:")
    || url.username.length > 0
    || url.password.length > 0
    || url.search.length > 0
    || url.hash.length > 0
  ) {
    throw new EvolutionApiError("Evolution API must use HTTPS with no embedded credentials.");
  }
  return url;
}

function getExternalMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as {
    key?: { id?: unknown };
    message?: { key?: { id?: unknown } };
    data?: { key?: { id?: unknown } };
  };
  const candidates = [root.key?.id, root.message?.key?.id, root.data?.key?.id];
  return candidates.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

/**
 * Optional adapter for an independently hosted Evolution API instance.
 * This adapter does not manage WhatsApp Web pairing or bypass Meta policy.
 * Resolve the tenant's authorized connection and its instance name before calling.
 */
export async function sendEvolutionText(
  config: EvolutionApiConfig,
  input: EvolutionSendTextInput,
  request: typeof fetch = fetch,
): Promise<SendMessageResult> {
  const { baseUrl, apiKey, instanceName } = config;
  if (!apiKey || apiKey.trim().length < 16 || apiKey.length > 4096) {
    throw new EvolutionApiError("Evolution API credentials are not configured.");
  }
  if (!instanceName || instanceName.length > 128 || !/^[a-zA-Z0-9._-]+$/.test(instanceName)) {
    throw new EvolutionApiError("Evolution API instance name is invalid.");
  }
  if (!/^\+?[1-9]\d{7,14}$/.test(input.to)) {
    throw new EvolutionApiError("Recipient must be a valid international phone number.");
  }
  if (typeof input.text !== "string" || input.text.trim().length === 0 || input.text.length > 4096) {
    throw new EvolutionApiError("Message text must contain 1–4096 characters.");
  }

  const base = validateBaseUrl(baseUrl);
  const endpoint = new URL(
    `/message/sendText/${encodeURIComponent(instanceName)}`,
    base,
  );

  let response: Response;
  try {
    response = await request(endpoint, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: input.to.replace(/^\+/, ""),
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new EvolutionApiError("Evolution API request failed before a response was received.", null, true);
  }

  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new EvolutionApiError(
      retryable ? "Evolution API is temporarily unavailable." : "Evolution API rejected the message.",
      response.status,
      retryable,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new EvolutionApiError("Evolution API returned an invalid response.", response.status, true);
  }
  const externalMessageId = getExternalMessageId(payload);
  if (!externalMessageId) {
    throw new EvolutionApiError("Evolution API response did not include a message ID.", response.status, true);
  }

  return { externalMessageId, status: "accepted" };
}
