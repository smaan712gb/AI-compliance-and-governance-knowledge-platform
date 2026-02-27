// Oracle ERP Cloud — authentication (Basic + OAuth2 JWT Bearer)

import type { OracleCloudConfig } from "../config-schema";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

/**
 * Returns the Authorization header for Oracle ERP Cloud REST API.
 *
 * - basic: Base64-encoded username:password (Oracle Cloud native users)
 * - oauth2: JWT Bearer via OAuth2 client_credentials (recommended for integrations)
 */
export async function getOracleAuth(config: OracleCloudConfig): Promise<string> {
  if (config.authMethod === "basic") {
    const creds = Buffer.from(`${config.username}:${config.password}`).toString("base64");
    return `Basic ${creds}`;
  }

  // oauth2 path
  const cacheKey = `${config.hostname}:${config.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return `Bearer ${cached.accessToken}`;
  }

  // Oracle Identity Cloud Service (IDCS) token endpoint
  const tokenUrl = `https://${config.hostname}/oauth/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
    scope: config.oauthScope || "urn:opc:resource:consumer::all",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(config.timeoutMs ?? 30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => String(response.status));
    throw new Error(`Oracle OAuth2 failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  if (!data.access_token) {
    throw new Error("Oracle OAuth2: no access_token returned");
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });

  return `Bearer ${data.access_token}`;
}

export function invalidateOracleToken(config: { hostname: string; clientId?: string }): void {
  if (config.clientId) {
    tokenCache.delete(`${config.hostname}:${config.clientId}`);
  }
}
