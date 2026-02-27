// Oracle ERP Cloud — data transformers to normalized CCM types

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
      documentNumber: String(r["JournalHeaderId"] || r["BatchName"] || ""),
      companyCode: String(r["LedgerName"] || r["BalancingSegmentValue"] || ""),
      fiscalYear: Number(r["AccountingYear"] || r["PeriodYear"] || new Date().getFullYear()),
      fiscalPeriod: Number(r["AccountingPeriodNumber"] || r["PeriodNum"] || 1),
      postingDate: parseDate(r["AccountedDate"] as string || r["DefaultEffectiveDate"] as string) || new Date(),
      documentDate: parseDate(r["JournalEntryDate"] as string || r["AccountedDate"] as string) || new Date(),
      entryDate: parseDate(r["CreationDate"] as string || r["AccountedDate"] as string) || new Date(),
      documentType: String(r["JournalCategory"] || r["JournalSource"] || "JE"),
      referenceNumber: r["ReferenceNumber"] ? String(r["ReferenceNumber"]) : undefined,
      headerText: r["Description"] ? String(r["Description"]) : undefined,
      userName: String(r["CreatedBy"] || r["EnteredBy"] || ""),
      lineItems: [],
      currency: String(r["CurrencyCode"] || r["EnteredCurrency"] || "USD"),
      totalAmount: parseFloat(String(r["TotalCreditAmount"] || r["TotalDebitAmount"] || "0")) || 0,
      isReversed: Boolean(r["ReverseStatus"] === "Y" || r["Reversed"] || false),
      reversalDocument: r["ReversingEntry"] ? String(r["ReversingEntry"]) : undefined,
      source: mapOracleSource(String(r["JournalSource"] || "")),
    };
  });
}

function mapOracleSource(src: string): "MANUAL" | "AUTOMATIC" | "BATCH" | "INTERFACE" {
  const s = src.toUpperCase();
  if (s.includes("MANUAL") || s === "USER") return "MANUAL";
  if (s.includes("BATCH") || s.includes("AUTOMATIC") || s.includes("RECURRING")) return "BATCH";
  if (s.includes("INTEGRAT") || s.includes("INTERF") || s.includes("IMPORT") || s.includes("API")) return "INTERFACE";
  return "AUTOMATIC";
}

// ---- Payments ----

export function transformPaymentRuns(records: unknown[]): PaymentRecord[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      paymentRunId: String(r["PaymentId"] || r["CheckNumber"] || r["PaymentDocumentNumber"] || ""),
      paymentDate: parseDate(r["PaymentDate"] as string) || new Date(),
      paymentMethod: String(r["PaymentMethodCode"] || r["PaymentMethodName"] || ""),
      paymentAmount: parseFloat(String(r["PaymentAmount"] || r["Amount"] || "0")) || 0,
      currency: String(r["CurrencyCode"] || r["PaymentCurrencyCode"] || "USD"),
      vendorId: String(r["PartyId"] || r["VendorId"] || r["SupplierId"] || ""),
      vendorName: String(r["PartyName"] || r["VendorName"] || r["SupplierName"] || ""),
      bankAccount: r["PayerBankAccountName"] ? String(r["PayerBankAccountName"]) : undefined,
      bankCountry: r["PayeeBankCountry"] ? String(r["PayeeBankCountry"]) : undefined,
      iban: r["Iban"] ? String(r["Iban"]) : undefined,
      swiftCode: r["BicSwiftCode"] ? String(r["BicSwiftCode"]) : undefined,
      companyCode: String(r["LegalEntityId"] || r["LegalEntityName"] || ""),
      invoiceReferences: r["DocumentNumber"] ? [String(r["DocumentNumber"])] : [],
      isUrgent: Boolean(r["StopPaymentFlag"] === "N" && r["VoidPaymentFlag"] === "N" ? false : false),
      createdBy: String(r["CreatedBy"] || ""),
      approvedBy: r["LastUpdatedBy"] ? String(r["LastUpdatedBy"]) : undefined,
    };
  });
}

// ---- User Access ----

export function transformUsers(users: unknown[], roleRecords: unknown[] = []): UserAccessRecord[] {
  const rolesByUser = new Map<string, UserRoleAssignment[]>();

  for (const raw of roleRecords) {
    const r = raw as Record<string, unknown>;
    const userId = String(r["Username"] || r["UserId"] || "");
    if (!rolesByUser.has(userId)) rolesByUser.set(userId, []);
    rolesByUser.get(userId)!.push({
      roleName: String(r["RoleName"] || r["RoleCode"] || ""),
      roleDescription: r["RoleDisplayName"] ? String(r["RoleDisplayName"]) : undefined,
      assignedFrom: parseDate(r["StartDate"] as string) || new Date(0),
      assignedTo: parseDate(r["EndDate"] as string) || new Date(9999, 11, 31),
      assignedBy: r["AssignedBy"] ? String(r["AssignedBy"]) : undefined,
      isComposite: false,
    });
  }

  return users.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const userId = String(r["Username"] || r["PersonUserName"] || "");
    return {
      userId,
      userName: String(r["DisplayName"] || r["PersonName"] || userId),
      userType: "DIALOG" as const,
      isLocked: Boolean(r["SuspendedFlag"] === "Y" || r["AccountLocked"] || false),
      lastLogon: parseDate(r["LastLoggedInDate"] as string),
      validFrom: parseDate(r["StartDate"] as string) || new Date(0),
      validTo: parseDate(r["EndDate"] as string) || new Date(9999, 11, 31),
      roles: rolesByUser.get(userId) || [],
      profiles: [],
      email: r["Email"] ? String(r["Email"]) : undefined,
    };
  });
}

// ---- Audit Trail ----

export function transformAuditHistory(records: unknown[]): ChangeLogEntry[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const fieldChange: FieldChange = {
      tableName: String(r["ObjectName"] || r["EntityName"] || ""),
      fieldName: String(r["AttributeName"] || r["ColumnName"] || ""),
      changeIndicator: mapOracleChangeType(String(r["AuditActionType"] || r["Action"] || "U")),
      oldValue: r["OldValue"] ? String(r["OldValue"]) : undefined,
      newValue: r["NewValue"] ? String(r["NewValue"]) : undefined,
      fieldDescription: r["AttributeDisplayName"] ? String(r["AttributeDisplayName"]) : undefined,
    };

    return {
      changeDocumentNumber: String(r["AuditRowId"] || r["AuditId"] || ""),
      objectClass: String(r["ObjectName"] || r["EntityName"] || ""),
      objectId: String(r["SourceObjectId"] || r["KeyValue"] || ""),
      changeDate: parseDate(r["AuditTimestamp"] as string || r["LastUpdateDate"] as string) || new Date(),
      changeTime: formatTime(parseDate(r["AuditTimestamp"] as string) || new Date()),
      changedBy: String(r["UpdatedBy"] || r["AuditUserId"] || ""),
      transactionCode: String(r["TransactionType"] || r["AuditActionType"] || ""),
      fieldChanges: [fieldChange],
    };
  });
}

function mapOracleChangeType(t: string): "I" | "U" | "D" {
  const u = t.toUpperCase();
  if (u === "INSERT" || u === "CREATE" || u === "I") return "I";
  if (u === "DELETE" || u === "D") return "D";
  return "U";
}

// ---- SoD Violations ----

export function transformSoDViolations(_records: unknown[]): SoDViolation[] {
  // Oracle ERP Cloud has SoD analysis in Oracle GRC Cloud — not exposed via standard REST API
  return [];
}

// ---- High-value Transactions ----

export function transformHighValueTx(records: unknown[], threshold: number): SuspiciousTransaction[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const amount = parseFloat(String(r["TransactionAmount"] || r["PaymentAmount"] || r["Amount"] || "0")) || 0;
    const riskFlags: string[] = [];
    if (amount > threshold * 10) riskFlags.push("LARGE_AMOUNT");
    if (r["CountryCode"] && isHighRiskCountry(String(r["CountryCode"]))) {
      riskFlags.push("HIGH_RISK_COUNTRY");
    }

    return {
      transactionId: String(r["TransactionId"] || r["PaymentId"] || r["StatementLineId"] || ""),
      transactionDate: parseDate(r["TransactionDate"] as string || r["ValueDate"] as string) || new Date(),
      amount,
      currency: String(r["TransactionCurrencyCode"] || r["CurrencyCode"] || "USD"),
      counterpartyId: String(r["PartyId"] || r["SupplierId"] || ""),
      counterpartyName: String(r["PartyName"] || r["SupplierName"] || ""),
      counterpartyCountry: String(r["CountryCode"] || r["PayeeCountry"] || ""),
      transactionType: "WIRE" as const,
      riskScore: Math.min(100, Math.round((amount / threshold) * 10)),
      riskFlags,
      screeningResult: "CLEAR" as const,
    };
  });
}

function isHighRiskCountry(code: string): boolean {
  return ["IR", "KP", "CU", "SY", "RU", "BY", "MM"].includes(code.toUpperCase());
}

// ---- Helpers ----

function parseDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}
