import type { SAPConfig, SAPAuthConfig } from "../config-schema";

/**
 * Returns an Authorization header value for the configured SAP auth method.
 */
export async function getSAPAuth(config: SAPConfig): Promise<string> {
  const auth = config.auth;

  switch (auth.method) {
    case "basic":
      return getBasicAuth(auth);
    case "oauth2_client_credentials":
      return getOAuth2ClientCredentials(auth);
    case "oauth2_saml_bearer":
      return getOAuth2SAMLBearer(auth);
    case "x509":
      // X.509 is handled at the TLS layer, not as an Authorization header
      return "";
    case "principal_propagation":
      return getPrincipalPropagation(auth);
    default:
      throw new Error(`Unsupported SAP auth method`);
  }
}

function getBasicAuth(auth: SAPAuthConfig & { method: "basic" }): string {
  const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString(
    "base64"
  );
  return `Basic ${encoded}`;
}

async function getOAuth2ClientCredentials(
  auth: SAPAuthConfig & { method: "oauth2_client_credentials" }
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
    ...(auth.scope ? { scope: auth.scope } : {}),
  });

  const response = await fetch(auth.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OAuth2 token request failed: ${response.status} ${text}`
    );
  }

  const data = await response.json();
  return `Bearer ${data.access_token}`;
}

async function getOAuth2SAMLBearer(
  auth: SAPAuthConfig & { method: "oauth2_saml_bearer" }
): Promise<string> {
  // Step 1: Get SAML assertion from IdP
  // Step 2: Exchange SAML assertion for OAuth2 token
  // This is a simplified implementation — production would need full SAML flow
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:saml2-bearer",
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
    scope: "API_JOURNALENTRY_SRV_0001",
  });

  const response = await fetch(auth.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`SAML Bearer token request failed: ${response.status}`);
  }

  const data = await response.json();
  return `Bearer ${data.access_token}`;
}

async function getPrincipalPropagation(
  auth: SAPAuthConfig & { method: "principal_propagation" }
): Promise<string> {
  // BTP Destination Service handles auth via Cloud Connector
  // The destination name is used to look up the configuration
  // In production, this calls the BTP Destination Service API
  const btpToken = process.env.BTP_SERVICE_TOKEN || "";
  if (!btpToken) {
    throw new Error(
      "BTP_SERVICE_TOKEN env var required for principal propagation"
    );
  }

  const response = await fetch(
    `https://destination-configuration.cfapps.us10.hana.ondemand.com/destination-configuration/v1/destinations/${auth.destinationName}`,
    {
      headers: { Authorization: `Bearer ${btpToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(
      `BTP Destination lookup failed: ${response.status}`
    );
  }

  const data = await response.json();
  return data.authTokens?.[0]?.value
    ? `Bearer ${data.authTokens[0].value}`
    : "";
}
