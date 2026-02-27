// Workday — OAuth2 client credentials authentication

import type { WorkdayConfig } from "../config-schema";
import { WORKDAY_TOKEN_PATH } from "./workday-constants";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

/**
 * Obtain a Workday OAuth2 Bearer token.
 * Workday supports client_credentials with a Workday API Client (non-user API client).
 */
export async function getWorkdayAuth(config: WorkdayConfig): Promise<string> {
  const cacheKey = `${config.hostname}:${config.tenantName}:${config.clientId}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return `Bearer ${cached.accessToken}`;
  }

  // Workday token endpoint: https://{hostname}/ccx/oauth2/{tenant}/token
  const tokenUrl = `https://${config.hostname}/ccx/oauth2/${encodeURIComponent(config.tenantName)}/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(config.timeoutMs ?? 30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => String(response.status));
    throw new Error(`Workday OAuth2 failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  if (!data.access_token) {
    throw new Error("Workday OAuth2: no access_token returned");
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });

  return `Bearer ${data.access_token}`;
}

export function invalidateWorkdayToken(config: { hostname: string; tenantName: string; clientId: string }): void {
  tokenCache.delete(`${config.hostname}:${config.tenantName}:${config.clientId}`);
}
