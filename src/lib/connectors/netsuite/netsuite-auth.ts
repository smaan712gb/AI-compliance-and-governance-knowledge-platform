// Oracle NetSuite — OAuth 1.0a Token-Based Authentication (TBA)
// NetSuite uses HMAC-SHA256 signed OAuth 1.0a — no token endpoint, all requests are signed

import { createHmac, randomBytes } from "crypto";
import type { NetSuiteConfig } from "../config-schema";
import {
  NETSUITE_OAUTH_SIGNATURE_METHOD,
  NETSUITE_OAUTH_VERSION,
} from "./netsuite-constants";

/**
 * Build an OAuth 1.0a Authorization header for a NetSuite REST API request.
 * NetSuite TBA: consumer key/secret + token id/secret (no OAuth flow required).
 */
export function buildNetSuiteAuthHeader(
  config: NetSuiteConfig,
  method: string,
  url: string
): string {
  const realm = config.accountId.toUpperCase();
  const nonce = randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Base string parameters (OAuth params only — query params excluded for simplicity)
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: NETSUITE_OAUTH_SIGNATURE_METHOD,
    oauth_timestamp: timestamp,
    oauth_token: config.tokenId,
    oauth_version: NETSUITE_OAUTH_VERSION,
  };

  // Parse query string from URL and include in base string
  let baseUrl = url;
  let queryString = "";
  const qIndex = url.indexOf("?");
  if (qIndex !== -1) {
    baseUrl = url.slice(0, qIndex);
    queryString = url.slice(qIndex + 1);
  }

  // Collect all parameters for signature base string
  const allParams: Record<string, string> = { ...oauthParams };
  if (queryString) {
    for (const part of queryString.split("&")) {
      const [k, v] = part.split("=");
      if (k) allParams[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  }

  // Sort and percent-encode
  const paramString = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${pct(k)}=${pct(v)}`)
    .join("&");

  const signatureBase = [
    method.toUpperCase(),
    pct(baseUrl),
    pct(paramString),
  ].join("&");

  const signingKey = `${pct(config.consumerSecret)}&${pct(config.tokenSecret)}`;
  const signature = createHmac("sha256", signingKey)
    .update(signatureBase)
    .digest("base64");

  const authHeader =
    `OAuth realm="${realm}",` +
    `oauth_consumer_key="${oauthParams.oauth_consumer_key}",` +
    `oauth_token="${oauthParams.oauth_token}",` +
    `oauth_signature_method="${NETSUITE_OAUTH_SIGNATURE_METHOD}",` +
    `oauth_timestamp="${timestamp}",` +
    `oauth_nonce="${nonce}",` +
    `oauth_version="${NETSUITE_OAUTH_VERSION}",` +
    `oauth_signature="${pct(signature)}"`;

  return authHeader;
}

function pct(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}
