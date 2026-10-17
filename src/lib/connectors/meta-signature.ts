import { createHmac, timingSafeEqual } from 'node:crypto';

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyMetaSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature?.startsWith('sha256=')) return false;
  const suppliedHex = signature.slice('sha256='.length);
  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) return false;
  const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  return safeEqual(expectedHex.toLowerCase(), suppliedHex.toLowerCase());
}
