import type { RuleFramework, RuleSeverity, SyncDomain } from "@prisma/client";

export interface RuleTemplate {
  name: string;
  description: string;
  framework: RuleFramework;
  controlId: string;
  domain: SyncDomain;
  severity: RuleSeverity;
  ruleDefinition: {
    type: "threshold" | "pattern" | "missing_control" | "sod" | "access";
    conditions: Record<string, unknown>;
  };
}

export const CCM_RULE_TEMPLATES: RuleTemplate[] = [
  // ---- SOX Controls ----
  {
    name: "High-value manual journal entries",
    description: "Detect manual journal entries exceeding threshold amount that may require additional review",
    framework: "SOX",
    controlId: "SOX-JE-01",
    domain: "SOX_CONTROLS",
    severity: "HIGH",
    ruleDefinition: {
      type: "threshold",
      conditions: {
        dataType: "journal_entry",
        field: "totalAmount",
        operator: "gt",
        value: 100000,
        additionalFilter: { source: "MANUAL" },
      },
    },
  },
  {
    name: "Journal entries posted outside business hours",
    description: "Flag journal entries posted before 7 AM or after 8 PM which may indicate unauthorized activity",
    framework: "SOX",
    controlId: "SOX-JE-02",
    domain: "SOX_CONTROLS",
    severity: "MEDIUM",
    ruleDefinition: {
      type: "pattern",
      conditions: {
        dataType: "journal_entry",
        timeField: "entryDate",
        outsideHours: { before: 7, after: 20 },
      },
    },
  },
  {
    name: "Reversed journal entries",
    description: "Monitor journal entries that have been reversed — high reversal rates may indicate errors or fraud",
    framework: "SOX",
    controlId: "SOX-JE-03",
    domain: "SOX_CONTROLS",
    severity: "MEDIUM",
    ruleDefinition: {
      type: "pattern",
      conditions: {
        dataType: "journal_entry",
        field: "isReversed",
        value: true,
      },
    },
  },
  {
    name: "Payments without proper approval",
    description: "Detect payments where no approver is recorded, violating dual-control requirements",
    framework: "SOX",
    controlId: "SOX-PAY-01",
    domain: "SOX_CONTROLS",
    severity: "CRITICAL",
    ruleDefinition: {
      type: "missing_control",
      conditions: {
        dataType: "payment_run",
        requiredField: "approvedBy",
        thresholdAmount: 10000,
      },
    },
  },
  {
    name: "Urgent payments above threshold",
    description: "Flag urgent/rush payments above threshold that bypass normal approval workflows",
    framework: "SOX",
    controlId: "SOX-PAY-02",
    domain: "SOX_CONTROLS",
    severity: "HIGH",
    ruleDefinition: {
      type: "threshold",
      conditions: {
        dataType: "payment_run",
        field: "paymentAmount",
        operator: "gt",
        value: 50000,
        additionalFilter: { isUrgent: true },
      },
    },
  },
  {
    name: "Segregation of Duties violations",
    description: "Detect users with conflicting roles that violate separation of duties requirements",
    framework: "SOX",
    controlId: "SOX-SOD-01",
    domain: "ACCESS_CONTROL",
    severity: "CRITICAL",
    ruleDefinition: {
      type: "sod",
      conditions: {
        dataType: "sod_violation",
        minRiskLevel: "MEDIUM",
      },
    },
  },

  // ---- PCI DSS Controls ----
  {
    name: "Changes to payment card data stores",
    description: "Monitor changes to tables or systems that store cardholder data (PCI Req 3)",
    framework: "PCI_DSS",
    controlId: "PCI-3.4.1",
    domain: "AUDIT_TRAIL",
    severity: "CRITICAL",
    ruleDefinition: {
      type: "pattern",
      conditions: {
        dataType: "change_log",
        objectClasses: ["PAYMENT_CARD", "FAHA", "REGUH"],
      },
    },
  },
  {
    name: "Privileged access to cardholder data environment",
    description: "Monitor admin/privileged access to systems processing payment card data (PCI Req 7-9)",
    framework: "PCI_DSS",
    controlId: "PCI-7.2.1",
    domain: "ACCESS_CONTROL",
    severity: "HIGH",
    ruleDefinition: {
      type: "access",
      conditions: {
        dataType: "user_access",
        rolePatterns: ["*ADMIN*", "*BASIS*", "*SEC*"],
        checkExpired: true,
      },
    },
  },

  // ---- AML/BSA Controls ----
  {
    name: "High-value wire transfers",
    description: "Flag wire transfers above BSA reporting threshold ($10,000 USD or equivalent)",
    framework: "AML_BSA",
    controlId: "AML-CTR-01",
    domain: "AML_KYC",
    severity: "HIGH",
    ruleDefinition: {
      type: "threshold",
      conditions: {
        dataType: "suspicious_transaction",
        field: "amount",
        operator: "gte",
        value: 10000,
        transactionTypes: ["WIRE"],
      },
    },
  },
  {
    name: "Payments to high-risk countries",
    description: "Monitor payments to FATF-listed or sanctioned jurisdictions",
    framework: "AML_BSA",
    controlId: "AML-SANC-01",
    domain: "AML_KYC",
    severity: "CRITICAL",
    ruleDefinition: {
      type: "pattern",
      conditions: {
        dataType: "suspicious_transaction",
        field: "counterpartyCountry",
        values: ["IR", "KP", "SY", "RU", "BY", "CU", "VE", "MM"],
      },
    },
  },
  {
    name: "Structuring / Smurfing detection",
    description: "Detect multiple transactions just below reporting thresholds from same counterparty",
    framework: "AML_BSA",
    controlId: "AML-STR-01",
    domain: "AML_KYC",
    severity: "CRITICAL",
    ruleDefinition: {
      type: "pattern",
      conditions: {
        dataType: "suspicious_transaction",
        riskFlags: ["STRUCTURING"],
      },
    },
  },

  // ---- HIPAA Controls ----
  {
    name: "Unauthorized access to PHI systems",
    description: "Monitor access to systems containing protected health information by non-authorized users",
    framework: "HIPAA",
    controlId: "HIPAA-AC-01",
    domain: "ACCESS_CONTROL",
    severity: "CRITICAL",
    ruleDefinition: {
      type: "access",
      conditions: {
        dataType: "user_access",
        systemTags: ["PHI", "HEALTH_DATA", "PATIENT_RECORDS"],
        unauthorizedRoles: true,
      },
    },
  },

  // ---- ISO 27001 Controls ----
  {
    name: "Configuration changes without change ticket",
    description: "Monitor system configuration changes that don't reference an approved change ticket (ISO A.12.1.2)",
    framework: "ISO_27001",
    controlId: "ISO-A.12.1.2",
    domain: "AUDIT_TRAIL",
    severity: "HIGH",
    ruleDefinition: {
      type: "missing_control",
      conditions: {
        dataType: "change_log",
        objectClasses: ["CUSTOMIZING", "CONFIG"],
        requiredField: "changeTicketReference",
      },
    },
  },
  {
    name: "Dormant user accounts",
    description: "Identify active user accounts with no logon in 90+ days (ISO A.9.2.5)",
    framework: "ISO_27001",
    controlId: "ISO-A.9.2.5",
    domain: "ACCESS_CONTROL",
    severity: "MEDIUM",
    ruleDefinition: {
      type: "pattern",
      conditions: {
        dataType: "user_access",
        field: "lastLogon",
        daysInactive: 90,
        excludeLocked: true,
      },
    },
  },
];
