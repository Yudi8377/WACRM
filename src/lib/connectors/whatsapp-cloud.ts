import type { SendMessageResult } from './types';

export type WhatsAppCloudConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion?: string;
};

export type WhatsAppSendTextInput = {
  to: string;
  text: string;
};

export class WhatsAppCloudError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly retryable = false
  ) {
    super(message);
    this.name = 'WhatsAppCloudError';
  }
}

/**
 * Sends a text message through Meta's official WhatsApp Cloud API.
 * Call only from a trusted server-side service after tenant authorization,
 * opt-in/policy checks, and retrieval/decryption of that tenant's token.
 * Never expose accessToken to the browser or log it.
 */
export async function sendWhatsAppText(
  config: WhatsAppCloudConfig,
  input: WhatsAppSendTextInput,
  request: typeof fetch = fetch
): Promise<SendMessageResult> {
  const { accessToken, phoneNumberId } = config;
  const graphApiVersion = config.graphApiVersion ?? process.env.META_GRAPH_API_VERSION;

  if (!accessToken || accessToken.trim().length < 10) {
    throw new WhatsAppCloudError('WhatsApp connection credentials are not configured.');
  }
  if (!/^\d{5,30}$/.test(phoneNumberId)) {
    throw new WhatsAppCloudError('WhatsApp phone number ID is invalid.');
  }
  if (!graphApiVersion || !/^v\d+\.\d+$/.test(graphApiVersion)) {
    throw new WhatsAppCloudError('Meta Graph API version is not configured correctly.');
  }
  if (!/^\+?[1-9]\d{7,14}$/.test(input.to)) {
    throw new WhatsAppCloudError('Recipient must be a valid international phone number.');
  }
  if (typeof input.text !== 'string' || input.text.trim().length === 0 || input.text.length > 4096) {
    throw new WhatsAppCloudError('Message text must contain 1–4096 characters.');
  }

  let response: Response;
  try {
    response = await request(
      `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.to.replace(/^\+/, ''),
          type: 'text',
          text: { preview_url: false, body: input.text }
        }),
        signal: AbortSignal.timeout(10_000)
      }
    );
  } catch {
    throw new WhatsAppCloudError('WhatsApp API request failed before a response was received.', null, true);
  }

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    // Do not include the provider body: it may contain identifiers or sensitive details.
    throw new WhatsAppCloudError(
      retryable ? 'WhatsApp API is temporarily unavailable.' : 'WhatsApp API rejected the message.',
      response.status,
      retryable
    );
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new WhatsAppCloudError('WhatsApp API returned an invalid response.', response.status, true);
  }

  const messages = (result as { messages?: Array<{ id?: unknown }> } | null)?.messages;
  const id = messages?.[0]?.id;
  if (typeof id !== 'string' || !id) {
    throw new WhatsAppCloudError('WhatsApp API response did not include a message ID.', response.status, true);
  }

  return { externalMessageId: id, status: 'accepted' };
}
