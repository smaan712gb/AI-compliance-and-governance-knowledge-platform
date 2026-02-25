import type {
  TransactionRecord,
  PaymentRecord,
  UserAccessRecord,
  ChangeLogEntry,
  SoDViolation,
  SuspiciousTransaction,
} from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Transform SAP OData journal entry response to normalized TransactionRecord.
 */
export function transformJournalEntries(sapRecords: any[]): TransactionRecord[] {
  return sapRecords.map((r) => ({
    documentNumber: r.AccountingDocument || r.JournalEntry || "",
    companyCode: r.CompanyCode || "",
    fiscalYear: parseInt(r.FiscalYear || "0", 10),
    fiscalPeriod: parseInt(r.FiscalPeriod || "0", 10),
    postingDate: new Date(r.PostingDate || r.DocumentDate),
    documentDate: new Date(r.DocumentDate || r.PostingDate),
    entryDate: new Date(r.CreationDate || r.PostingDate),
    documentType: r.AccountingDocumentType || r.JournalEntryType || "",
    referenceNumber: r.DocumentReferenceID || undefined,
    headerText: r.DocumentHeaderText || undefined,
    userName: r.CreatedByUser || r.AccountingDocCreatedByUser || "",
    currency: r.CompanyCodeCurrency || r.TransactionCurrency || "USD",
    totalAmount: parseFloat(r.AmountInCompanyCodeCurrency || "0"),
    isReversed: r.IsReversed === "X" || r.IsReversed === true,
    reversalDocument: r.ReversalDocument || undefined,
    source: mapPostingSource(r.AccountingDocumentCategory),
    lineItems: (r.to_JournalEntryItem?.results || []).map((item: any, idx: number) => ({
      lineNumber: parseInt(item.JournalEntryItemNumber || String(idx + 1), 10),
      glAccount: item.GLAccount || "",
      glAccountName: item.GLAccountLongName || undefined,
      amount: parseFloat(item.AmountInCompanyCodeCurrency || "0"),
      debitCredit: item.DebitCreditCode === "S" ? "D" as const : "C" as const,
      costCenter: item.CostCenter || undefined,
      profitCenter: item.ProfitCenter || undefined,
      vendorId: item.Supplier || undefined,
      customerId: item.Customer || undefined,
      taxCode: item.TaxCode || undefined,
      text: item.JournalEntryItemText || undefined,
    })),
  }));
}

function mapPostingSource(category?: string): TransactionRecord["source"] {
  switch (category) {
    case "A": return "AUTOMATIC";
    case "B": return "BATCH";
    case "I": return "INTERFACE";
    default: return "MANUAL";
  }
}

/**
 * Transform SAP OData payment run response to normalized PaymentRecord.
 */
export function transformPaymentRuns(sapRecords: any[]): PaymentRecord[] {
  return sapRecords.map((r) => ({
    paymentRunId: r.PaymentRun || r.PaymentDocument || "",
    paymentDate: new Date(r.PaymentDate || r.PostingDate),
    paymentMethod: r.PaymentMethod || "",
    paymentAmount: parseFloat(r.PaidAmountInPaytCurrency || r.PaymentAmount || "0"),
    currency: r.PaymentCurrency || "USD",
    vendorId: r.Supplier || r.Payee || "",
    vendorName: r.SupplierName || r.PayeeName || "",
    bankAccount: r.HouseBankAccount || undefined,
    bankCountry: r.BankCountry || undefined,
    iban: r.IBAN || undefined,
    swiftCode: r.SWIFTCode || undefined,
    companyCode: r.CompanyCode || "",
    invoiceReferences: r.InvoiceReference ? [r.InvoiceReference] : [],
    isUrgent: r.IsUrgentPayment === "X" || false,
    createdBy: r.CreatedByUser || "",
    approvedBy: r.ApprovedByUser || undefined,
  }));
}

/**
 * Transform SAP user data to normalized UserAccessRecord.
 */
export function transformUserAccess(sapRecords: any[]): UserAccessRecord[] {
  return sapRecords.map((r) => ({
    userId: r.UserName || r.UserID || "",
    userName: r.FullName || `${r.FirstName || ""} ${r.LastName || ""}`.trim(),
    userType: mapUserType(r.UserType || r.UserGroup),
    isLocked: r.IsLocked === "X" || r.UserLockStatus === "LOCKED",
    lastLogon: r.LastLogonDate ? new Date(r.LastLogonDate) : undefined,
    validFrom: new Date(r.ValidityStartDate || "2000-01-01"),
    validTo: new Date(r.ValidityEndDate || "9999-12-31"),
    roles: (r.to_UserRoleAssignment?.results || []).map((role: any) => ({
      roleName: role.RoleName || role.AGR_NAME || "",
      roleDescription: role.RoleDescription || undefined,
      assignedFrom: new Date(role.ValidFrom || "2000-01-01"),
      assignedTo: new Date(role.ValidTo || "9999-12-31"),
      assignedBy: role.AssignedBy || undefined,
      isComposite: role.IsCompositeRole === "X" || false,
    })),
    profiles: r.Profiles ? r.Profiles.split(",") : [],
    userGroup: r.UserGroup || undefined,
    department: r.Department || undefined,
    email: r.EmailAddress || undefined,
  }));
}

function mapUserType(type?: string): UserAccessRecord["userType"] {
  switch (type) {
    case "A": return "DIALOG";
    case "B": return "SYSTEM";
    case "C": return "COMMUNICATION";
    case "S": return "SERVICE";
    case "L": return "REFERENCE";
    default: return "DIALOG";
  }
}

/**
 * Transform SAP change documents to normalized ChangeLogEntry.
 */
export function transformChangeDocuments(sapRecords: any[]): ChangeLogEntry[] {
  return sapRecords.map((r) => ({
    changeDocumentNumber: r.ChangeDocument || r.ObjectChangeDocument || "",
    objectClass: r.ObjectClass || "",
    objectId: r.ObjectValue || r.ObjectKey || "",
    changeDate: new Date(r.ChangeDate || r.CreationDate),
    changeTime: r.ChangeTime || "00:00:00",
    changedBy: r.ChangedByUser || r.CreatedByUser || "",
    transactionCode: r.TransactionCode || "",
    fieldChanges: (r.to_ChangeDocumentItem?.results || []).map((item: any) => ({
      tableName: item.TableName || "",
      fieldName: item.FieldName || "",
      changeIndicator: item.ChangeType === "I" ? "I" as const
        : item.ChangeType === "D" ? "D" as const
        : "U" as const,
      oldValue: item.OldValue || undefined,
      newValue: item.NewValue || undefined,
      fieldDescription: item.FieldDescription || undefined,
    })),
  }));
}

/**
 * Transform SoD violation data.
 */
export function transformSoDViolations(sapRecords: any[]): SoDViolation[] {
  return sapRecords.map((r) => ({
    userId: r.UserName || "",
    userName: r.FullName || "",
    ruleId: r.RuleID || r.AccessRiskID || "",
    ruleDescription: r.RuleDescription || r.AccessRiskDescription || "",
    conflictingRoles: [
      r.Role1 || r.ConflictRole1 || "",
      r.Role2 || r.ConflictRole2 || "",
    ] as [string, string],
    conflictingTransactions: [
      r.TCode1 || r.ConflictAction1 || "",
      r.TCode2 || r.ConflictAction2 || "",
    ] as [string, string],
    riskLevel: mapRiskLevel(r.RiskLevel),
    conflictType: r.ConflictType === "ROLE" ? "ROLE_ROLE" as const
      : r.ConflictType === "TCODE" ? "TCODE_TCODE" as const
      : "ROLE_TCODE" as const,
    businessProcess: r.BusinessProcess || "Unknown",
    mitigatingControl: r.MitigatingControl || undefined,
    isWaived: r.IsWaived === "X" || false,
    detectedAt: new Date(r.DetectedAt || r.CreationDate || new Date()),
  }));
}

function mapRiskLevel(level?: string): SoDViolation["riskLevel"] {
  switch (level?.toUpperCase()) {
    case "1": case "CRITICAL": return "CRITICAL";
    case "2": case "HIGH": return "HIGH";
    case "3": case "MEDIUM": return "MEDIUM";
    default: return "LOW";
  }
}

/**
 * Transform payment data into suspicious transaction format for AML screening.
 */
export function transformSuspiciousTransactions(
  sapRecords: any[],
  threshold: number
): SuspiciousTransaction[] {
  return sapRecords
    .filter((r) => parseFloat(r.PaidAmountInPaytCurrency || "0") >= threshold)
    .map((r) => {
      const amount = parseFloat(r.PaidAmountInPaytCurrency || "0");
      const riskFlags: string[] = [];

      if (amount >= threshold * 5) riskFlags.push("VERY_HIGH_AMOUNT");
      if (amount >= threshold) riskFlags.push("HIGH_VALUE");
      if (r.IsUrgentPayment === "X") riskFlags.push("URGENT_PAYMENT");
      if (Math.round(amount) === amount && amount > 1000) riskFlags.push("ROUND_AMOUNT");

      return {
        transactionId: r.PaymentDocument || r.PaymentRun || "",
        transactionDate: new Date(r.PaymentDate || r.PostingDate),
        amount,
        currency: r.PaymentCurrency || "USD",
        counterpartyId: r.Supplier || r.Payee || "",
        counterpartyName: r.SupplierName || r.PayeeName || "",
        counterpartyCountry: r.BankCountry || r.SupplierCountry || "",
        transactionType: mapPaymentType(r.PaymentMethod),
        riskScore: Math.min(100, riskFlags.length * 25),
        riskFlags,
        screeningResult: undefined,
        sanctionsHit: undefined,
      };
    });
}

function mapPaymentType(method?: string): SuspiciousTransaction["transactionType"] {
  switch (method) {
    case "T": return "WIRE";
    case "E": return "ACH";
    case "C": return "CHECK";
    case "K": return "CARD";
    default: return "INTERNAL";
  }
}
