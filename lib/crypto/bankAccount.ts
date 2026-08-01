// lib/crypto/bankAccount.ts
// AES-256-GCM encryption for landlord bank account numbers.
// Encryption happens here, in Node, before any value reaches Postgres —
// the database only ever sees opaque ciphertext.

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // recommended IV length for GCM
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const hexKey = process.env.BANK_ENCRYPTION_KEY
  if (!hexKey) {
    throw new Error('BANK_ENCRYPTION_KEY is not set.')
  }
  const key = Buffer.from(hexKey, 'hex')
  if (key.length !== 32) {
    throw new Error(
      `BANK_ENCRYPTION_KEY must be 32 bytes (64 hex chars). Got ${key.length} bytes. ` +
      `Generate one with: openssl rand -hex 32`
    )
  }
  return key
}

/**
 * Encrypts a plaintext bank account number.
 * Returns a Buffer packed as: iv (12 bytes) || authTag (16 bytes) || ciphertext.
 * Callers store this as base64 text or raw bytea, depending on the column type.
 */
export function encryptAccountNumber(plainAccountNumber: string): Buffer {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(plainAccountNumber, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, ciphertext])
}

/**
 * Decrypts a packed buffer produced by encryptAccountNumber.
 * Throws if the auth tag doesn't match (tampered or wrong key).
 */
export function decryptAccountNumber(packed: Buffer): string {
  const key = getKey()

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

/** Convenience wrapper — encrypt straight to a base64 string for TEXT columns. */
export function encryptAccountNumberToBase64(plainAccountNumber: string): string {
  return encryptAccountNumber(plainAccountNumber).toString('base64')
}

/** Convenience wrapper — decrypt from a base64 string read out of a TEXT column. */
export function decryptAccountNumberFromBase64(base64: string): string {
  return decryptAccountNumber(Buffer.from(base64, 'base64'))
}