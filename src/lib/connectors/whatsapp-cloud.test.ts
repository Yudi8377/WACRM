import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendWhatsAppText, WhatsAppCloudError } from './whatsapp-cloud';

const config = {
  accessToken: 'test-access-token-not-real',
  phoneNumberId: '123456789012345',
  graphApiVersion: 'v26.0'
};

afterEach(() => vi.unstubAllGlobals());

describe('sendWhatsAppText', () => {
  it('sends a valid text message to the official endpoint and returns provider ID', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ messages: [{ id: 'wamid.test-message' }] }, { status: 200 })
    );

    const result = await sendWhatsAppText(config, { to: '+6281234567890', text: 'Halo' }, request);

    expect(result).toEqual({ externalMessageId: 'wamid.test-message', status: 'accepted' });
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v26.0/123456789012345/messages');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-access-token-not-real');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      messaging_product: 'whatsapp',
      to: '6281234567890',
      type: 'text',
      text: { body: 'Halo', preview_url: false }
    });
  });

  it('rejects invalid recipient and empty message before making a request', async () => {
    const request = vi.fn<typeof fetch>();
    await expect(sendWhatsAppText(config, { to: '123', text: 'Halo' }, request))
      .rejects.toBeInstanceOf(WhatsAppCloudError);
    await expect(sendWhatsAppText(config, { to: '+6281234567890', text: '   ' }, request))
      .rejects.toBeInstanceOf(WhatsAppCloudError);
    expect(request).not.toHaveBeenCalled();
  });

  it('classifies rate limits and server failures as retryable without exposing provider body', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('sensitive provider error payload', { status: 429 })
    );

    let caught: unknown;
    try {
      await sendWhatsAppText(config, { to: '6281234567890', text: 'Halo' }, request);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(WhatsAppCloudError);
    expect(caught).toMatchObject({ status: 429, retryable: true });
    expect((caught as Error).message).not.toContain('sensitive provider error payload');
  });

  it('does not retry permanent provider rejections automatically', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('invalid token', { status: 401 }));
    await expect(sendWhatsAppText(config, { to: '6281234567890', text: 'Halo' }, request))
      .rejects.toMatchObject({ status: 401, retryable: false });
  });

  it('requires a configured version and a valid phone number ID', async () => {
    const request = vi.fn<typeof fetch>();
    await expect(sendWhatsAppText({ ...config, phoneNumberId: 'abc' }, { to: '6281234567890', text: 'Halo' }, request))
      .rejects.toThrow(/phone number ID/i);
    await expect(sendWhatsAppText({ ...config, graphApiVersion: 'latest' }, { to: '6281234567890', text: 'Halo' }, request))
      .rejects.toThrow(/version/i);
    expect(request).not.toHaveBeenCalled();
  });
});
