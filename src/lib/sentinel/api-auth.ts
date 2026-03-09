// ============================================
// SENTINEL — API Key Authentication
// ============================================

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { SentinelTier } from "./types";

const API_KEY_PREFIX = "stl_";

export interface ApiKeyValidation {
  valid: boolean;
  userId?: string;
  tier?: SentinelTier;
  keyId?: string;
  error?: string;
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const rawKey = randomBytes(32).toString("hex");
  const key = `${API_KEY_PREFIX}${rawKey}`;
  const hash = hashApiKey(key);
  const prefix = key.slice(0, 12);

  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(
  authHeader: string | null
): Promise<ApiKeyValidation> {
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  let key: string;

  if (authHeader.startsWith("Bearer ")) {
    key = authHeader.slice(7);
  } else if (authHeader.startsWith("ApiKey ")) {
    key = authHeader.slice(7);
  } else {
    return { valid: false, error: "Invalid authorization format. Use: Bearer <key> or ApiKey <key>" };
  }

  if (!key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "Invalid API key format" };
  }

  const hash = hashApiKey(key);

  const apiKey = await db.sentinelApiKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      userId: true,
      tier: true,
      isActive: true,
      expiresAt: true,
    },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!apiKey.isActive) {
    return { valid: false, error: "API key is deactivated" };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Update last used timestamp (fire-and-forget)
  db.sentinelApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {}); // Non-blocking

  return {
    valid: true,
    userId: apiKey.userId,
    tier: apiKey.tier as SentinelTier,
    keyId: apiKey.id,
  };
}
