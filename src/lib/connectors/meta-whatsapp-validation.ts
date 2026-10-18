export type MetaWhatsAppValidationCode =
  | "not_configured"
  | "invalid_token"
  | "missing_permissions"
  | "account_mismatch"
  | "provider_unavailable";

export class MetaWhatsAppValidationError extends Error {
  constructor(public readonly code: MetaWhatsAppValidationCode) {
    const messages: Record<MetaWhatsAppValidationCode, string> = {
      not_configured: "Meta app validation is not configured.",
      invalid_token: "The Meta access token is invalid, expired, or belongs to another app.",
      missing_permissions: "The Meta access token lacks required WhatsApp permissions.",
      account_mismatch: "The phone number is not available under the specified WhatsApp Business Account.",
      provider_unavailable: "Meta could not validate the WhatsApp connection at this time.",
    };
    super(messages[code]);
    this.name = "MetaWhatsAppValidationError";
  }
}

export type MetaWhatsAppValidationInput = {
  appId: string | undefined;
  appSecret: string | undefined;
  graphApiVersion: string | undefined;
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
};

export type ValidatedMetaWhatsAppConnection = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  scopes: string[];
  tokenExpiresAt: string | null;
};

type JsonObject = Record<string, unknown>;

async function readJson(
  request: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<JsonObject> {
  let response: Response;
  try {
    response = await request(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new MetaWhatsAppValidationError("provider_unavailable");
  }
  if (!response.ok) throw new MetaWhatsAppValidationError("provider_unavailable");
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("invalid_json");
    }
    return body as JsonObject;
  } catch {
    throw new MetaWhatsAppValidationError("provider_unavailable");
  }
}

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Validate token ownership, scopes, phone-number identity, and WABA membership without logging credentials. */
export async function validateMetaWhatsAppConnection(
  input: MetaWhatsAppValidationInput,
  request: typeof fetch = fetch,
): Promise<ValidatedMetaWhatsAppConnection> {
  const { appId, appSecret, graphApiVersion, wabaId, phoneNumberId, accessToken } = input;
  if (!appId || !appSecret || !graphApiVersion || !/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new MetaWhatsAppValidationError("not_configured");
  }
  if (!/^\d{5,30}$/.test(wabaId) || !/^\d{5,30}$/.test(phoneNumberId) || accessToken.length < 10) {
    throw new MetaWhatsAppValidationError("invalid_token");
  }

  const debugParams = new URLSearchParams({
    input_token: accessToken,
    access_token: `${appId}|${appSecret}`,
  });
  const debug = await readJson(
    request,
    `https://graph.facebook.com/${graphApiVersion}/debug_token?${debugParams.toString()}`,
    { method: "GET" },
  );
  const debugData = object(debug.data);
  const expiresAt = typeof debugData?.expires_at === "number" ? debugData.expires_at : null;
  if (
    debugData?.is_valid !== true
    || debugData.app_id !== appId
    || expiresAt === null
    || (expiresAt > 0 && expiresAt * 1000 <= Date.now())
  ) {
    throw new MetaWhatsAppValidationError("invalid_token");
  }

  const scopes = new Set<string>();
  if (Array.isArray(debugData.scopes)) {
    for (const scope of debugData.scopes) if (typeof scope === "string") scopes.add(scope);
  }
  if (Array.isArray(debugData.granular_scopes)) {
    for (const item of debugData.granular_scopes) {
      const scope = object(item)?.scope;
      if (typeof scope === "string") scopes.add(scope);
    }
  }
  if (!scopes.has("whatsapp_business_management") || !scopes.has("whatsapp_business_messaging")) {
    throw new MetaWhatsAppValidationError("missing_permissions");
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const phone = await readJson(
    request,
    `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name`,
    { method: "GET", headers: authHeaders },
  );
  if (phone.id !== phoneNumberId) throw new MetaWhatsAppValidationError("account_mismatch");

  const phoneNumbers = await readJson(
    request,
    `https://graph.facebook.com/${graphApiVersion}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&limit=100`,
    { method: "GET", headers: authHeaders },
  );
  const data = Array.isArray(phoneNumbers.data) ? phoneNumbers.data : [];
  if (!data.some((item) => object(item)?.id === phoneNumberId)) {
    throw new MetaWhatsAppValidationError("account_mismatch");
  }

  return {
    wabaId,
    phoneNumberId,
    displayPhoneNumber: stringOrNull(phone.display_phone_number),
    verifiedName: stringOrNull(phone.verified_name),
    scopes: [...scopes].sort(),
    tokenExpiresAt: expiresAt > 0 ? new Date(expiresAt * 1000).toISOString() : null,
  };
}
