export const SAP_SYSTEM_TYPES = [
  {
    value: "SAP_S4HANA_CLOUD",
    label: "SAP S/4HANA Cloud (Public Edition)",
    description: "Cloud-hosted by SAP. Uses OData V4 APIs with Communication Arrangements.",
    authMethods: ["oauth2_client_credentials", "oauth2_saml_bearer"],
  },
  {
    value: "SAP_S4HANA_ONPREM",
    label: "SAP S/4HANA On-Premise",
    description: "Installed on customer infrastructure. Supports OData, RFC, and Cloud Connector.",
    authMethods: ["basic", "oauth2_client_credentials", "x509", "principal_propagation"],
  },
  {
    value: "SAP_ECC",
    label: "SAP ECC 6.0",
    description: "Legacy SAP system. Best used with RFC or OData via SAP Gateway.",
    authMethods: ["basic", "x509"],
  },
] as const;

export const SAP_AUTH_METHODS = [
  {
    value: "basic",
    label: "Basic Authentication",
    description: "Username + Password + SAP Client. Simplest setup, suitable for testing.",
    fields: [
      { name: "username", label: "SAP Username", type: "text", required: true },
      { name: "password", label: "SAP Password", type: "password", required: true },
      { name: "client", label: "SAP Client (3 digits)", type: "text", required: true, placeholder: "100" },
    ],
  },
  {
    value: "oauth2_client_credentials",
    label: "OAuth 2.0 Client Credentials",
    description: "Standard for S/4HANA Cloud Communication Arrangements. Most common for cloud.",
    fields: [
      { name: "tokenUrl", label: "Token URL", type: "url", required: true, placeholder: "https://myhost.authentication.us10.hana.ondemand.com/oauth/token" },
      { name: "clientId", label: "Client ID", type: "text", required: true },
      { name: "clientSecret", label: "Client Secret", type: "password", required: true },
      { name: "scope", label: "Scope (optional)", type: "text", required: false },
    ],
  },
  {
    value: "oauth2_saml_bearer",
    label: "OAuth 2.0 SAML Bearer",
    description: "For SSO-enabled environments with identity provider integration.",
    fields: [
      { name: "tokenUrl", label: "Token URL", type: "url", required: true },
      { name: "clientId", label: "Client ID", type: "text", required: true },
      { name: "clientSecret", label: "Client Secret", type: "password", required: true },
      { name: "idpUrl", label: "Identity Provider URL", type: "url", required: true },
      { name: "audienceUrl", label: "Audience URL", type: "url", required: true },
      { name: "nameId", label: "SAML NameID", type: "text", required: true },
    ],
  },
  {
    value: "x509",
    label: "X.509 Certificate",
    description: "Mutual TLS with client certificate. Most secure, enterprise-preferred.",
    fields: [
      { name: "certPem", label: "Certificate (PEM)", type: "textarea", required: true },
      { name: "keyPem", label: "Private Key (PEM)", type: "textarea", required: true },
      { name: "passphrase", label: "Key Passphrase (optional)", type: "password", required: false },
    ],
  },
  {
    value: "principal_propagation",
    label: "Principal Propagation (BTP)",
    description: "Uses SAP BTP Cloud Connector for secure on-premise access.",
    fields: [
      { name: "destinationName", label: "BTP Destination Name", type: "text", required: true },
      { name: "btpSubaccountId", label: "BTP Subaccount ID", type: "text", required: true },
    ],
  },
] as const;

export const SAP_COMPLIANCE_DOMAINS = [
  {
    value: "SOX_CONTROLS",
    label: "SOX Controls",
    description: "Journal entries, payment runs, vendor master changes, segregation of duties",
    icon: "FileCheck",
    sapModules: ["FI", "FI-AP", "FI-AR", "CO"],
  },
  {
    value: "AML_KYC",
    label: "AML / KYC",
    description: "High-value transactions, wire transfers, sanctions screening, customer due diligence",
    icon: "ShieldAlert",
    sapModules: ["FI-BL", "FI-AP"],
  },
  {
    value: "ACCESS_CONTROL",
    label: "Access Control",
    description: "User roles, authorization objects, critical TCode usage, dormant accounts",
    icon: "KeyRound",
    sapModules: ["BC-SEC"],
  },
  {
    value: "AUDIT_TRAIL",
    label: "Audit Trail",
    description: "Change documents, transport requests, configuration changes, system logs",
    icon: "ClipboardList",
    sapModules: ["BC"],
  },
] as const;

export const SAP_SYNC_FREQUENCIES = [
  { value: "1h", label: "Every hour", tier: "enterprise" },
  { value: "4h", label: "Every 4 hours", tier: "professional" },
  { value: "6h", label: "Every 6 hours", tier: "professional" },
  { value: "12h", label: "Every 12 hours", tier: "starter" },
  { value: "24h", label: "Daily", tier: "starter" },
] as const;
