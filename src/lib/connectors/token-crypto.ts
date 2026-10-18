import { createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export type EncryptedToken = {
  ciphertext: string;
  nonce: string;
  keyVersion: number;
};

/**
 * Encrypts provider access tokens at rest. Keep the 32-byte base64 key in the
 * server secret manager only. The returned fields map to channel_connections.
 */
export function encryptConnectorToken(
  plaintext: string,
  keyBase64 = process.env.APP_ENCRYPTION_KEY,
  keyVersion = 1
): EncryptedToken {
  if (!plaintext || plaintext.length > 16_384) {
    throw new Error('Connector token must contain 1–16384 characters.');
  }
  if (!Number.isSafeInteger(keyVersion) || keyVersion < 1) {
    throw new Error('Encryption key version must be a positive integer.');
  }

  const key = decodeKey(keyBase64);
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'),
    nonce: nonce.toString('base64'),
    keyVersion
  };
}

/** Decrypts only on the server after tenant authorization has succeeded. */
export function decryptConnectorToken(
  encrypted: EncryptedToken,
  keyBase64 = process.env.APP_ENCRYPTION_KEY
): string {
  if (!Number.isSafeInteger(encrypted.keyVersion) || encrypted.keyVersion < 1) {
    throw new Error('Encrypted token key version is invalid.');
  }

  const key = decodeKey(keyBase64);
  const nonce = Buffer.from(encrypted.nonce, 'base64');
  const packed = Buffer.from(encrypted.ciphertext, 'base64');
  if (nonce.length !== NONCE_BYTES || packed.length <= AUTH_TAG_BYTES) {
    throw new Error('Encrypted token payload is invalid.');
  }

  const ciphertext = packed.subarray(0, -AUTH_TAG_BYTES);
  const authTag = packed.subarray(-AUTH_TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function decodeKey(keyBase64: string | undefined): Buffer {
  if (!keyBase64) throw new Error('Connector token encryption is not configured.');
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return key;
}
