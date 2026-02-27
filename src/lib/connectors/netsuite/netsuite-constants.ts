// Oracle NetSuite — API endpoint constants
// NetSuite REST Record API: https://{accountId}.suitetalk.api.netsuite.com/services/rest/

export const NETSUITE_REST_BASE = "/services/rest";
export const NETSUITE_RECORD_API = `${NETSUITE_REST_BASE}/record/v1`;
export const NETSUITE_QUERY_API = `${NETSUITE_REST_BASE}/query/v1`;

export const NETSUITE_API_ENDPOINTS = {
  // SOX Controls
  JOURNAL_ENTRIES: {
    path: `${NETSUITE_RECORD_API}/journalentry`,
    suiteql: "SELECT * FROM JournalEntry WHERE TranDate >= ? AND TranDate <= ? LIMIT ?",
  },
  PAYMENTS: {
    path: `${NETSUITE_RECORD_API}/vendorpayment`,
    suiteql: "SELECT * FROM VendorPayment WHERE TranDate >= ? AND TranDate <= ? LIMIT ?",
  },
  // Access Control
  EMPLOYEES: {
    path: `${NETSUITE_RECORD_API}/employee`,
  },
  ROLES: {
    path: `${NETSUITE_RECORD_API}/role`,
  },
  // Audit Trail — NetSuite System Notes
  SYSTEM_NOTES: {
    // SuiteQL: SystemNotes table
    suiteql: "SELECT * FROM SystemNotes WHERE Date >= ? AND Date <= ? LIMIT ?",
    path: `${NETSUITE_RECORD_API}/systemnote`,
  },
  // AML
  TRANSACTIONS: {
    suiteql: "SELECT * FROM Transaction WHERE TranDate >= ? AND TranDate <= ? AND Amount >= ? LIMIT ?",
    path: `${NETSUITE_RECORD_API}/transaction`,
  },
  // Metadata
  META: {
    testPath: `${NETSUITE_RECORD_API}/subsidiary?limit=1`,
  },
};

// NetSuite OAuth 1.0a constants
export const NETSUITE_OAUTH_SIGNATURE_METHOD = "HMAC-SHA256";
export const NETSUITE_OAUTH_VERSION = "1.0";
