import { createCipheriv, createDecipheriv, randomBytes, createHmac } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns the master encryption key from env, validated to 32 bytes.
 */
function getMasterKey(): Buffer {
  const hex = process.env.CCM_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CCM_ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const key = Buffer.from(hex, "hex");
  // Buffer.from with 'hex' silently truncates invalid chars — verify output length
  if (key.length !== 32) {
    throw new Error(
      "CCM_ENCRYPTION_KEY contains invalid hex characters. " +
        "Must be exactly 64 valid hex characters (0-9, a-f)."
    );
  }
  return key;
}

/**
 * Derives a per-organization encryption key using HMAC-SHA256.
 * This provides key isolation between organizations (envelope encryption).
 */
function deriveOrgKey(orgId: string): Buffer {
  const master = getMasterKey();
  return createHmac("sha256", master).update(`ccm-org-${orgId}`).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a per-org derived key.
 * Returns a base64 string in format: iv:ciphertext:authTag
 */
export function encryptField(plaintext: string, orgId: string): string {
  const key = deriveOrgKey(orgId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${encrypted}:${authTag.toString("base64")}`;
}

/**
 * Decrypts a previously encrypted field.
 * Input format: iv:ciphertext:authTag (base64-encoded parts)
 */
export function decryptField(encrypted: string, orgId: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted field format — expected iv:ciphertext:authTag");
  }

  const key = deriveOrgKey(orgId);
  const iv = Buffer.from(parts[0], "base64");
  const ciphertext = parts[1];
  const authTag = Buffer.from(parts[2], "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Encrypts a JSON-serializable config object. Returns encrypted string.
 */
export function encryptConfig<T>(config: T, orgId: string): string {
  return encryptField(JSON.stringify(config), orgId);
}

/**
 * Decrypts and parses a JSON config object.
 */
export function decryptConfig<T>(encrypted: string, orgId: string): T {
  const json = decryptField(encrypted, orgId);
  return JSON.parse(json) as T;
}

/**
 * Masks a secret string for display, showing only the last 4 chars.
 * e.g., "sk-abc123xyz" → "sk-...xyz"
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "****";
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Generates a random encryption key hash for a new organization.
 */
export function generateOrgEncryptionHash(orgId: string): string {
  const master = getMasterKey();
  return createHmac("sha256", master)
    .update(`ccm-org-hash-${orgId}-${Date.now()}`)
    .digest("hex");
}
