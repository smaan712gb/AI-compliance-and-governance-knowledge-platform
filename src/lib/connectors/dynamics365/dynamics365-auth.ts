// Microsoft Dynamics 365 — Azure AD OAuth2 client credentials authentication

import type { Dynamics365Config } from "../config-schema";
import { D365_AUTH_URL, D365_OAUTH_SCOPE_SUFFIX } from "./dynamics365-constants";

interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms epoch
}

const tokenCache = new Map<string, TokenCache>();

/**
 * Obtain an Azure AD OAuth2 access token for Dynamics 365 Finance & Operations.
 * Uses client_credentials grant. Tokens are cached until 60s before expiry.
 */
export async function getD365Auth(config: Dynamics365Config): Promise<string> {
  const cacheKey = `${config.tenantId}:${config.clientId}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return `Bearer ${cached.accessToken}`;
  }

  // Build the resource scope — D365 F&O uses the environment URL + /.default
  const resource = config.environmentUrl.endsWith("/")
    ? config.environmentUrl.slice(0, -1)
    : config.environmentUrl;
  const scope = `${resource}${D365_OAUTH_SCOPE_SUFFIX}`;

  const tokenUrl = D365_AUTH_URL.replace("{tenantId}", encodeURIComponent(config.tenantId));

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(config.timeoutMs ?? 30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => String(response.status));
    throw new Error(`D365 Azure AD auth failed (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  if (!data.access_token) {
    throw new Error("D365 Azure AD auth: no access_token in response");
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });

  return `Bearer ${data.access_token}`;
}

/** Clear cached token for a given config (use after auth errors). */
export function invalidateD365Token(config: { tenantId: string; clientId: string }): void {
  tokenCache.delete(`${config.tenantId}:${config.clientId}`);
}
