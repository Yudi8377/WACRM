import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptConnectorToken, encryptConnectorToken } from './token-crypto';

const key = randomBytes(32).toString('base64');

describe('connector token encryption', () => {
  it('round-trips a token and uses a random nonce', () => {
    const first = encryptConnectorToken('provider-secret-token', key);
    const second = encryptConnectorToken('provider-secret-token', key);

    expect(decryptConnectorToken(first, key)).toBe('provider-secret-token');
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.keyVersion).toBe(1);
  });

  it('rejects missing or incorrectly sized encryption keys', () => {
    expect(() => encryptConnectorToken('token', undefined)).toThrow(/not configured/i);
    expect(() => encryptConnectorToken('token', Buffer.from('short').toString('base64'))).toThrow(/32-byte/i);
  });

  it('rejects tampering and decryption with the wrong key', () => {
    const encrypted = encryptConnectorToken('provider-secret-token', key);
    const tamperedBytes = Buffer.from(encrypted.ciphertext, 'base64');
    tamperedBytes[0] ^= 1;
    const tampered = { ...encrypted, ciphertext: tamperedBytes.toString('base64') };
    expect(() => decryptConnectorToken(tampered, key)).toThrow();
    expect(() => decryptConnectorToken(encrypted, randomBytes(32).toString('base64'))).toThrow();
  });

  it('rejects invalid token values and key versions', () => {
    expect(() => encryptConnectorToken('')).toThrow(/token must/i);
    expect(() => encryptConnectorToken('token', key, 0)).toThrow(/version/i);
  });
});
