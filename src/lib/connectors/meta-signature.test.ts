import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMetaSignature } from './meta-signature';

describe('verifyMetaSignature', () => {
  const secret = 'test-only-secret';
  const body = '{"object":"whatsapp_business_account","entry":[]}';
  const valid = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('accepts a valid HMAC over the exact raw body', () => {
    expect(verifyMetaSignature(body, valid, secret)).toBe(true);
  });

  it('rejects missing or malformed signatures', () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, 'sha1=abcd', secret)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=not-hex', secret)).toBe(false);
  });

  it('rejects a signature for a different body', () => {
    expect(verifyMetaSignature(`${body} `, valid, secret)).toBe(false);
  });
});
