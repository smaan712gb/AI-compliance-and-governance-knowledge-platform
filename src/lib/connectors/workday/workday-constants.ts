// Workday — API endpoint constants

// Workday REST API base: https://{hostname}/ccx/api/{version}/{tenant}/
// Workday RAAS/REST: https://{hostname}/ccx/service/{tenant}/

export const WORKDAY_TOKEN_PATH = "/ccx/token";

export const WORKDAY_API_ENDPOINTS = {
  // Workday Financial Management — Journal Entries
  JOURNAL_ENTRIES: {
    // Workday Financial Management API
    path: "/accounting/journal_entries",
    // Workday RAAS report path fallback
    reportPath: "/ccx/service/{tenant}/Financial_Management/Get_Journals",
  },
  // Accounts Payable — Payment Runs
  PAYMENTS: {
    path: "/paymentElect/paymentElections",
    invoicePath: "/paymentElect/supplierPayments",
  },
  // Human Capital Management — Workers/Users
  WORKERS: {
    path: "/common/workers",
  },
  USER_SECURITY: {
    path: "/staffing/workers",
  },
  SECURITY_ROLES: {
    path: "/staffing/securityGroups",
  },
  // Audit Trail
  AUDIT_LOGS: {
    path: "/auditLogs/auditLogs",
  },
  // Financials
  BANK_TRANSACTIONS: {
    path: "/bankingAndSettlement/bankTransactions",
  },
};

// Workday API versions
export const WORKDAY_API_VERSION = "v1";
export const WORKDAY_FINANCIAL_VERSION = "v2";

// Workday uses offset-based pagination with limit param
export const WORKDAY_DEFAULT_PAGE_SIZE = 100;
