// Microsoft Dynamics 365 Finance & Operations — API constants

export const D365_AUTH_URL =
  "https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";

// OData v4 data entity paths (Dynamics 365 Finance & Operations)
export const D365_API_ENDPOINTS = {
  // SOX Controls
  JOURNAL_ENTRIES: {
    path: "/data/GeneralJournalEntries",
    metadataPath: "/data/$metadata",
    testPath: "/data/Companies?$top=1&$select=dataAreaId",
  },
  PAYMENT_JOURNALS: {
    path: "/data/VendorPaymentJournals",
    detailPath: "/data/VendorPaymentJournalLines",
  },
  // Access Control
  USERS: {
    path: "/data/SystemUsers",
  },
  USER_ROLES: {
    path: "/data/SystemUserRoles",
  },
  SECURITY_ROLES: {
    path: "/data/SecurityRoles",
  },
  // Audit Trail
  DATABASE_LOGS: {
    path: "/data/DatabaseLogs",
  },
  AUDIT_TRAIL: {
    path: "/data/SysDataAccessLogLine",
  },
  // AML / High-value transactions
  BANK_TRANSACTIONS: {
    path: "/data/BankAccountTransactions",
  },
  LEDGER_TRANS: {
    path: "/data/LedgerTransactions",
  },
};

// Default Dynamics 365 OData API version
export const D365_API_VERSION = "7.0";

// Scope for Azure AD OAuth2 (client credentials)
// The resource URL has /.default appended for client credentials flow
export const D365_OAUTH_SCOPE_SUFFIX = "/.default";
