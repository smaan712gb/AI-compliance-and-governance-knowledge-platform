// Oracle ERP Cloud (Fusion) — API endpoint constants
// Oracle Fusion REST APIs follow: https://{hostname}/fscmRestApi/resources/{version}/

export const ORACLE_API_VERSION = "11.13.19.05";
export const ORACLE_API_BASE = "/fscmRestApi/resources";
export const ORACLE_TOKEN_PATH = "/oauth/token";

export const ORACLE_API_ENDPOINTS = {
  // SOX Controls — General Ledger
  JOURNAL_ENTRIES: {
    path: "/generalLedgerJournals",
    testPath: "/generalLedgerJournals?limit=1&fields=JournalHeaderId",
  },
  PAYMENT_RUNS: {
    // AP Payment Requests / Check Runs
    path: "/payables/payments",
    invoicesPath: "/payables/invoices",
  },
  // Access Control
  USERS: {
    path: "/userManagement/users",
  },
  USER_ROLES: {
    path: "/userManagement/users/{userId}/roleAssignments",
  },
  // Audit Trail
  AUDIT_HISTORY: {
    path: "/auditHistory",
    auditObjects: "/auditHistory/objects",
  },
  // AML / High-value Bank Transactions
  BANK_STATEMENTS: {
    path: "/cashManagement/bankStatementLines",
  },
  PAYMENTS_DISBURSEMENTS: {
    path: "/payables/disbursements",
  },
};

// Oracle uses offset/limit pagination
export const ORACLE_DEFAULT_PAGE_SIZE = 500;
