import { z } from "zod";

// ============================================
// SAP AUTHENTICATION SCHEMAS
// ============================================

const sapBasicAuthSchema = z.object({
  method: z.literal("basic"),
  username: z.string().min(1, "SAP username is required"),
  password: z.string().min(1, "SAP password is required"),
  client: z.string().regex(/^\d{3}$/, "SAP client must be 3 digits"),
});

const sapOAuth2Schema = z.object({
  method: z.literal("oauth2_client_credentials"),
  tokenUrl: z.string().url("Token URL must be a valid URL"),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scope: z.string().optional(),
});

const sapSAMLBearerSchema = z.object({
  method: z.literal("oauth2_saml_bearer"),
  tokenUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  idpUrl: z.string().url(),
  audienceUrl: z.string().url(),
  nameId: z.string().min(1),
});

const sapX509Schema = z.object({
  method: z.literal("x509"),
  certPem: z.string().min(1, "X.509 certificate is required"),
  keyPem: z.string().min(1, "Private key is required"),
  passphrase: z.string().optional(),
});

const sapPrincipalPropSchema = z.object({
  method: z.literal("principal_propagation"),
  destinationName: z.string().min(1),
  btpSubaccountId: z.string().min(1),
});

export const sapAuthSchema = z.discriminatedUnion("method", [
  sapBasicAuthSchema,
  sapOAuth2Schema,
  sapSAMLBearerSchema,
  sapX509Schema,
  sapPrincipalPropSchema,
]);

export type SAPAuthConfig = z.infer<typeof sapAuthSchema>;

// ============================================
// SAP CONNECTION SCHEMAS
// ============================================

const sapS4CloudSchema = z.object({
  system: z.literal("SAP_S4HANA_CLOUD"),
  apiHost: z.string().min(1, "API hostname is required"),
  auth: sapAuthSchema,
  sapClient: z.string().regex(/^\d{3}$/, "SAP client must be 3 digits (e.g. 100)").default("100"),
  communicationArrangement: z.string().optional(),
  defaultCompanyCode: z.string().optional(),
  maxConcurrency: z.number().int().min(1).max(10).default(3),
  requestsPerMinute: z.number().int().min(1).max(240).default(60),
  timeoutMs: z.number().int().min(5000).max(300000).default(30000),
});

const sapS4OnPremSchema = z.object({
  system: z.literal("SAP_S4HANA_ONPREM"),
  hostname: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(443),
  usesCloudConnector: z.boolean().default(false),
  btpDestination: z.string().optional(),
  instanceNumber: z.string().regex(/^\d{2}$/).optional(),
  auth: sapAuthSchema,
  sapClient: z.string().regex(/^\d{3}$/, "SAP client must be 3 digits (e.g. 100)").default("100"),
  defaultCompanyCode: z.string().optional(),
  maxConcurrency: z.number().int().min(1).max(10).default(2),
  requestsPerMinute: z.number().int().min(1).max(60).default(30),
  timeoutMs: z.number().int().min(5000).max(300000).default(60000),
  hasGRC: z.boolean().default(false),
  systemId: z.string().regex(/^[A-Z0-9]{3}$/).optional(),
});

const sapECCSchema = z.object({
  system: z.literal("SAP_ECC"),
  hostname: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(443),
  usesCloudConnector: z.boolean().default(false),
  btpDestination: z.string().optional(),
  instanceNumber: z.string().regex(/^\d{2}$/).optional(),
  auth: sapAuthSchema,
  sapClient: z.string().regex(/^\d{3}$/, "SAP client must be 3 digits (e.g. 100)").default("100"),
  defaultCompanyCode: z.string().optional(),
  maxConcurrency: z.number().int().min(1).max(5).default(2),
  requestsPerMinute: z.number().int().min(1).max(30).default(15),
  timeoutMs: z.number().int().min(5000).max(300000).default(60000),
  hasGRC: z.boolean().default(false),
  systemId: z.string().regex(/^[A-Z0-9]{3}$/).optional(),
  eccVersion: z.string().optional(),
  preferredApiStyle: z.enum(["odata", "rfc", "auto"]).default("auto"),
});

export const sapConfigSchema = z.discriminatedUnion("system", [
  sapS4CloudSchema,
  sapS4OnPremSchema,
  sapECCSchema,
]);

export type SAPConfig = z.infer<typeof sapConfigSchema>;

// ============================================
// MOCK CONNECTOR SCHEMA
// ============================================

export const mockConnectorConfigSchema = z.object({
  system: z.literal("MOCK"),
  latencyMinMs: z.number().default(50),
  latencyMaxMs: z.number().default(500),
  recordsPerPull: z.number().default(100),
  failureRate: z.number().min(0).max(1).default(0),
  seed: z.number().optional(),
});

export type MockConnectorConfig = z.infer<typeof mockConnectorConfigSchema>;

// ============================================
// DYNAMICS 365 SCHEMA
// ============================================

export const dynamics365ConfigSchema = z.object({
  system: z.literal("DYNAMICS_365"),
  tenantId: z.string().min(1, "Azure AD Tenant ID is required"),
  clientId: z.string().min(1, "Azure AD Client ID is required"),
  clientSecret: z.string().min(1, "Azure AD Client Secret is required"),
  environmentUrl: z.string().url("Environment URL must be a valid URL (e.g. https://mycompany.operations.dynamics.com)"),
  legalEntityId: z.string().optional(),
  maxConcurrency: z.number().int().min(1).max(10).default(3),
  requestsPerMinute: z.number().int().min(1).max(120).default(60),
  timeoutMs: z.number().int().min(5000).max(300000).default(30000),
});

export type Dynamics365Config = z.infer<typeof dynamics365ConfigSchema>;

// ============================================
// WORKDAY SCHEMA
// ============================================

export const workdayConfigSchema = z.object({
  system: z.literal("WORKDAY"),
  hostname: z.string().min(1, "Workday hostname is required (e.g. wd2-impl-services1.workday.com)"),
  tenantName: z.string().min(1, "Workday tenant name is required"),
  clientId: z.string().min(1, "OAuth2 Client ID is required"),
  clientSecret: z.string().min(1, "OAuth2 Client Secret is required"),
  maxConcurrency: z.number().int().min(1).max(10).default(3),
  requestsPerMinute: z.number().int().min(1).max(120).default(60),
  timeoutMs: z.number().int().min(5000).max(300000).default(30000),
});

export type WorkdayConfig = z.infer<typeof workdayConfigSchema>;

// ============================================
// ORACLE ERP CLOUD SCHEMA
// ============================================

export const oracleCloudConfigSchema = z.discriminatedUnion("authMethod", [
  z.object({
    system: z.literal("ORACLE_CLOUD"),
    authMethod: z.literal("basic"),
    hostname: z.string().min(1, "Oracle ERP Cloud hostname is required (e.g. fa-xxxx.oraclecloud.com)"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    defaultBusinessUnit: z.string().optional(),
    maxConcurrency: z.number().int().min(1).max(10).default(3),
    requestsPerMinute: z.number().int().min(1).max(120).default(60),
    timeoutMs: z.number().int().min(5000).max(300000).default(30000),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    oauthScope: z.string().optional(),
  }),
  z.object({
    system: z.literal("ORACLE_CLOUD"),
    authMethod: z.literal("oauth2"),
    hostname: z.string().min(1, "Oracle ERP Cloud hostname is required"),
    clientId: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client Secret is required"),
    oauthScope: z.string().optional(),
    defaultBusinessUnit: z.string().optional(),
    maxConcurrency: z.number().int().min(1).max(10).default(3),
    requestsPerMinute: z.number().int().min(1).max(120).default(60),
    timeoutMs: z.number().int().min(5000).max(300000).default(30000),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
]);

export type OracleCloudConfig = z.infer<typeof oracleCloudConfigSchema>;

// ============================================
// NETSUITE SCHEMA
// ============================================

export const netSuiteConfigSchema = z.object({
  system: z.literal("NETSUITE"),
  accountId: z.string().min(1, "NetSuite Account ID is required (e.g. 1234567 or 1234567-SB1)"),
  consumerKey: z.string().min(1, "OAuth 1.0a Consumer Key is required"),
  consumerSecret: z.string().min(1, "OAuth 1.0a Consumer Secret is required"),
  tokenId: z.string().min(1, "OAuth 1.0a Token ID is required"),
  tokenSecret: z.string().min(1, "OAuth 1.0a Token Secret is required"),
  subsidiaryId: z.string().optional(),
  maxConcurrency: z.number().int().min(1).max(5).default(2),
  requestsPerMinute: z.number().int().min(1).max(60).default(30),
  timeoutMs: z.number().int().min(5000).max(300000).default(30000),
});

export type NetSuiteConfig = z.infer<typeof netSuiteConfigSchema>;

// ============================================
// UNIFIED CONFIG SCHEMA
// ============================================

export const connectorConfigSchema = z.union([
  sapConfigSchema,
  mockConnectorConfigSchema,
  dynamics365ConfigSchema,
  workdayConfigSchema,
  oracleCloudConfigSchema,
  netSuiteConfigSchema,
]);

export type ConnectorConfig = z.infer<typeof connectorConfigSchema>;
