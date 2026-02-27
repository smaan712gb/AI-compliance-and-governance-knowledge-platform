// Microsoft Dynamics 365 Finance & Operations — data transformers to normalized CCM types

import type {
  TransactionRecord,
  PaymentRecord,
  UserAccessRecord,
  UserRoleAssignment,
  ChangeLogEntry,
  FieldChange,
  SoDViolation,
  SuspiciousTransaction,
} from "../types";

// ---- Journal Entries ----

export function transformJournalEntries(records: unknown[]): TransactionRecord[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      documentNumber: String(r["JournalNumber"] || r["JournalBatchNumber"] || ""),
      companyCode: String(r["dataAreaId"] || r["LegalEntityId"] || ""),
      fiscalYear: Number(r["FiscalYear"] || new Date().getFullYear()),
      fiscalPeriod: Number(r["FiscalPeriodNumber"] || 1),
      postingDate: parseD365Date(r["PostingDate"] as string) || new Date(),
      documentDate: parseD365Date(r["DocumentDate"] as string || r["PostingDate"] as string) || new Date(),
      entryDate: parseD365Date(r["CreatedDateTime"] as string || r["PostingDate"] as string) || new Date(),
      documentType: String(r["TransactionType"] || r["JournalType"] || "JE"),
      referenceNumber: r["Voucher"] ? String(r["Voucher"]) : undefined,
      headerText: r["Description"] ? String(r["Description"]) : undefined,
      userName: String(r["PostedByUser"] || r["CreatedBy"] || ""),
      lineItems: [],
      currency: String(r["AccountingCurrencyCode"] || r["CurrencyCode"] || "USD"),
      totalAmount: parseFloat(String(r["AccountingCurrencyAmount"] || r["Amount"] || "0")) || 0,
      isReversed: Boolean(r["IsReversed"] || r["Reversed"]),
      reversalDocument: r["ReversalVoucher"] ? String(r["ReversalVoucher"]) : undefined,
      source: mapD365Source(String(r["TransactionOrigin"] || "")),
    };
  });
}

function mapD365Source(origin: string): "MANUAL" | "AUTOMATIC" | "BATCH" | "INTERFACE" {
  const o = origin.toLowerCase();
  if (o.includes("manual") || o.includes("user")) return "MANUAL";
  if (o.includes("batch") || o.includes("automatic") || o.includes("auto")) return "BATCH";
  if (o.includes("integration") || o.includes("interface") || o.includes("import")) return "INTERFACE";
  return "AUTOMATIC";
}

// ---- Payments ----

export function transformPaymentRuns(records: unknown[]): PaymentRecord[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      paymentRunId: String(r["JournalBatchNumber"] || r["RecId"] || ""),
      paymentDate: parseD365Date(r["TransDate"] as string || r["DueDate"] as string) || new Date(),
      paymentMethod: String(r["MethodOfPayment"] || r["PaymMode"] || ""),
      paymentAmount: parseFloat(String(r["AmountCurCredit"] || r["AmountCur"] || "0")) || 0,
      currency: String(r["CurrencyCode"] || "USD"),
      vendorId: String(r["AccountNum"] || r["VendAccount"] || ""),
      vendorName: String(r["Name"] || r["VendorName"] || ""),
      bankAccount: r["BankAccountId"] ? String(r["BankAccountId"]) : undefined,
      bankCountry: r["BankCountryRegionId"] ? String(r["BankCountryRegionId"]) : undefined,
      iban: r["IBAN"] ? String(r["IBAN"]) : undefined,
      swiftCode: r["SWIFTNo"] ? String(r["SWIFTNo"]) : undefined,
      companyCode: String(r["dataAreaId"] || ""),
      invoiceReferences: r["Invoice"] ? [String(r["Invoice"])] : [],
      isUrgent: Boolean(r["IsUrgentPayment"] || false),
      createdBy: String(r["CreatedBy"] || r["PostedByUser"] || ""),
      approvedBy: r["ApprovedBy"] ? String(r["ApprovedBy"]) : undefined,
    };
  });
}

// ---- User Access ----

export function transformUserAccess(users: unknown[], roleRecords: unknown[] = []): UserAccessRecord[] {
  const rolesByUser = new Map<string, UserRoleAssignment[]>();
  for (const raw of roleRecords) {
    const r = raw as Record<string, unknown>;
    const userId = String(r["UserId"] || "");
    if (!rolesByUser.has(userId)) rolesByUser.set(userId, []);
    rolesByUser.get(userId)!.push({
      roleName: String(r["SecurityRoleName"] || r["RoleId"] || ""),
      roleDescription: r["Description"] ? String(r["Description"]) : undefined,
      assignedFrom: parseD365Date(r["ValidFrom"] as string) || new Date(0),
      assignedTo: parseD365Date(r["ValidTo"] as string) || new Date(9999, 11, 31),
      assignedBy: r["AssignedBy"] ? String(r["AssignedBy"]) : undefined,
      isComposite: false,
    });
  }

  return users.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const userId = String(r["UserId"] || r["AzureActiveDirectoryUserId"] || "");
    return {
      userId,
      userName: String(r["UserName"] || r["Alias"] || userId),
      userType: "DIALOG" as const,
      isLocked: Boolean(r["IsDisabled"] || r["Blocked"] || false),
      lastLogon: parseD365Date(r["LastLoginDateTime"] as string),
      validFrom: parseD365Date(r["ValidFrom"] as string) || new Date(0),
      validTo: parseD365Date(r["ValidTo"] as string) || new Date(9999, 11, 31),
      roles: rolesByUser.get(userId) || [],
      profiles: [],
      department: r["Department"] ? String(r["Department"]) : undefined,
      email: r["Email"] ? String(r["Email"]) : undefined,
    };
  });
}

// ---- Change Documents / Audit Trail ----

export function transformChangeLogs(records: unknown[]): ChangeLogEntry[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const fieldChange: FieldChange = {
      tableName: String(r["TableName"] || r["Table"] || ""),
      fieldName: String(r["FieldName"] || r["Field"] || ""),
      changeIndicator: mapChangeIndicator(String(r["ChangeType"] || "U")),
      oldValue: r["OrigValue"] ? String(r["OrigValue"]) : undefined,
      newValue: r["NewValue"] ? String(r["NewValue"]) : undefined,
    };
    return {
      changeDocumentNumber: String(r["RecId"] || r["LogId"] || ""),
      objectClass: String(r["TableName"] || r["ObjectType"] || ""),
      objectId: String(r["RecordId"] || r["KeyValue"] || ""),
      changeDate: parseD365Date(r["CreatedDateTime"] as string) || new Date(),
      changeTime: formatTime(parseD365Date(r["CreatedDateTime"] as string) || new Date()),
      changedBy: String(r["CreatedBy"] || r["UserId"] || ""),
      transactionCode: String(r["MenuItemName"] || r["Action"] || ""),
      fieldChanges: [fieldChange],
    };
  });
}

function mapChangeIndicator(t: string): "I" | "U" | "D" {
  const u = t.toUpperCase();
  if (u === "INSERT" || u === "I") return "I";
  if (u === "DELETE" || u === "D") return "D";
  return "U";
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

// ---- SoD Violations ----

export function transformSoDViolations(records: unknown[]): SoDViolation[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      userId: String(r["UserId"] || ""),
      userName: String(r["UserName"] || r["UserId"] || ""),
      ruleId: String(r["RuleId"] || r["ConflictId"] || ""),
      ruleDescription: String(r["Description"] || r["ConflictDescription"] || ""),
      conflictingRoles: [
        String(r["Role1"] || r["DutyId1"] || ""),
        String(r["Role2"] || r["DutyId2"] || ""),
      ] as [string, string],
      conflictingTransactions: [
        String(r["Process1"] || ""),
        String(r["Process2"] || ""),
      ] as [string, string],
      riskLevel: mapRiskLevel(String(r["RiskLevel"] || "MEDIUM")),
      conflictType: "ROLE_ROLE" as const,
      businessProcess: String(r["BusinessProcess"] || "Finance"),
      mitigatingControl: r["MitigatingControl"] ? String(r["MitigatingControl"]) : undefined,
      isWaived: Boolean(r["IsWaived"] || r["Approved"] || false),
      detectedAt: parseD365Date(r["DetectedDateTime"] as string) || new Date(),
    };
  });
}

function mapRiskLevel(level: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const l = level.toUpperCase();
  if (l === "CRITICAL" || l === "1") return "CRITICAL";
  if (l === "HIGH" || l === "2") return "HIGH";
  if (l === "LOW" || l === "4") return "LOW";
  return "MEDIUM";
}

// ---- High-value Transactions ----

export function transformHighValueTx(records: unknown[], threshold: number): SuspiciousTransaction[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const amount = parseFloat(String(r["Amount"] || r["AccountingCurrencyAmount"] || "0")) || 0;
    const riskFlags: string[] = [];
    if (amount > threshold * 10) riskFlags.push("LARGE_AMOUNT");
    if (r["CountryRegionId"] && isHighRiskCountry(String(r["CountryRegionId"]))) {
      riskFlags.push("HIGH_RISK_COUNTRY");
    }
    return {
      transactionId: String(r["TransId"] || r["RecId"] || ""),
      transactionDate: parseD365Date(r["TransDate"] as string || r["AccountDate"] as string) || new Date(),
      amount,
      currency: String(r["CurrencyCode"] || "USD"),
      counterpartyId: String(r["AccountNum"] || r["VendAccount"] || ""),
      counterpartyName: String(r["Name"] || ""),
      counterpartyCountry: String(r["CountryRegionId"] || ""),
      transactionType: "WIRE" as const,
      riskScore: Math.min(100, Math.round((amount / threshold) * 10)),
      riskFlags,
      screeningResult: "CLEAR" as const,
    };
  });
}

function isHighRiskCountry(code: string): boolean {
  const highRisk = ["IR", "KP", "CU", "SY", "RU", "BY", "MM"];
  return highRisk.includes(code.toUpperCase());
}

// ---- Helpers ----

function parseD365Date(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  // D365 OData dates come as "/Date(1234567890000)/" or ISO string
  const odataMatch = value.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
  if (odataMatch) {
    return new Date(parseInt(odataMatch[1], 10));
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}
