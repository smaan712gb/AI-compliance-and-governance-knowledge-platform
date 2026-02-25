/**
 * SAP OData API endpoint mappings for compliance data extraction.
 */
export const SAP_API_ENDPOINTS = {
  // SOX Controls
  JOURNAL_ENTRY: {
    path: "/sap/opu/odata/sap/API_JOURNALENTRY_SRV/A_JournalEntry",
    metadataPath: "/sap/opu/odata/sap/API_JOURNALENTRY_SRV/$metadata",
    description: "Journal entries and financial postings (BKPF/BSEG)",
    module: "FI",
  },
  PAYMENT_RUN: {
    path: "/sap/opu/odata/sap/API_PAYMENTRUN_SRV/A_PaymentRunItem",
    metadataPath: "/sap/opu/odata/sap/API_PAYMENTRUN_SRV/$metadata",
    description: "Payment run data (F110)",
    module: "FI-AP",
  },
  BUSINESS_PARTNER: {
    path: "/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner",
    metadataPath: "/sap/opu/odata/sap/API_BUSINESS_PARTNER/$metadata",
    description: "Vendor and customer master data",
    module: "MM/SD",
  },

  // Change Documents / Audit Trail
  CHANGE_DOCUMENTS: {
    path: "/sap/opu/odata/sap/API_CHANGEDOCUMENT_SRV/A_ChangeDocumentHeader",
    metadataPath: "/sap/opu/odata/sap/API_CHANGEDOCUMENT_SRV/$metadata",
    description: "Change document headers and items (CDHDR/CDPOS)",
    module: "BC",
  },

  // Access Control
  USER_ACCESS: {
    path: "/sap/opu/odata/sap/API_USER_SRV/A_User",
    metadataPath: "/sap/opu/odata/sap/API_USER_SRV/$metadata",
    description: "User master data and role assignments",
    module: "BC-SEC",
  },
  SECURITY_AUDIT_LOG: {
    path: "/sap/opu/odata/sap/API_SECURITY_AUDIT_LOG_SRV/A_SecurityAuditLog",
    metadataPath: "/sap/opu/odata/sap/API_SECURITY_AUDIT_LOG_SRV/$metadata",
    description: "Security audit log events (SM20)",
    module: "BC-SEC",
  },

  // SoD (requires SAP GRC or custom CDS views)
  SOD_VIOLATIONS: {
    path: "/sap/opu/odata/sap/GRC_API_ACCESS_RISK_SRV/AccessRiskAnalysis",
    metadataPath: "/sap/opu/odata/sap/GRC_API_ACCESS_RISK_SRV/$metadata",
    description: "Segregation of Duties violations (GRC Access Control)",
    module: "GRC",
  },

  // AML / Banking
  BANK_PAYMENT: {
    path: "/sap/opu/odata/sap/API_BANK_PAYMENT_SRV/A_BankPayment",
    metadataPath: "/sap/opu/odata/sap/API_BANK_PAYMENT_SRV/$metadata",
    description: "Bank payment transactions for AML monitoring",
    module: "FI-BL",
  },
} as const;

/**
 * Critical SAP transaction codes monitored for access control compliance.
 */
export const CRITICAL_TCODES = {
  FINANCIAL: [
    "FB01", // Post Document
    "FB50", // Enter G/L Account Document
    "F110", // Payment Run
    "F-02", // Enter G/L Account Posting
    "FBL1N", // Vendor Line Items
    "FBL5N", // Customer Line Items
    "FK01", // Create Vendor
    "FK02", // Change Vendor
    "FS00", // Edit G/L Account Centrally
  ],
  ACCESS_ADMIN: [
    "SU01", // User Maintenance
    "SU10", // User Mass Maintenance
    "PFCG", // Role Maintenance
    "SU53", // Authorization Check Display
    "SM21", // System Log
    "SM20", // Security Audit Log
    "SUIM", // User Information System
  ],
  CONFIG: [
    "SPRO", // Customizing
    "SE16", // Data Browser
    "SE16N", // General Table Display
    "SE38", // ABAP Editor
    "STMS", // Transport Management
    "SM30", // Table Maintenance
    "SM31", // Table Maintenance
  ],
  HIGH_RISK: [
    "SE06", // Set Up Transport Organizer
    "SM49", // External OS Commands
    "SM69", // Maintain External OS Commands
    "SA38", // Execute Program
    "SCC4", // Client Administration
    "RZ10", // Edit Profile Parameters
  ],
} as const;

/**
 * Common SAP authorization objects for SoD analysis.
 */
export const SOD_AUTH_OBJECTS = {
  FINANCE: [
    { object: "F_BKPF_BUK", description: "FI: Authorization for Company Codes" },
    { object: "F_BKPF_BLA", description: "FI: Authorization for Document Types" },
    { object: "F_BKPF_KOA", description: "FI: Authorization for Account Types" },
    { object: "F_LFA1_BUK", description: "Vendor: Company Code Authorization" },
    { object: "F_KNA1_BUK", description: "Customer: Company Code Authorization" },
  ],
  MATERIALS: [
    { object: "M_BEST_EKG", description: "MM: Purchase Order Purchasing Group" },
    { object: "M_BEST_EKO", description: "MM: Purchase Order Purchasing Org" },
    { object: "M_BEST_WRK", description: "MM: Purchase Order Plant" },
  ],
  BASIS: [
    { object: "S_TCODE", description: "Transaction Code Authorization" },
    { object: "S_USER_GRP", description: "User Master: User Groups" },
    { object: "S_USER_AGR", description: "User Master: Roles" },
    { object: "S_TABU_DIS", description: "Table Maintenance via SM30" },
  ],
} as const;
