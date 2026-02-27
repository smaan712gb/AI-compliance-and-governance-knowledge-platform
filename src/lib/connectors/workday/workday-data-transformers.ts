// Workday — data transformers to normalized CCM types

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
    // Workday nested objects pattern
    const journal = (r["journal"] as Record<string, unknown>) || r;
    const descriptor = String(r["descriptor"] || journal["journalNumber"] || "");
    return {
      documentNumber: String(journal["journalNumber"] || r["id"] || descriptor),
      companyCode: getWdDescriptor(r["company"] as Record<string, unknown> | undefined, "companyCode"),
      fiscalYear: Number(r["fiscalYear"] || new Date().getFullYear()),
      fiscalPeriod: Number(r["fiscalPeriod"] || 1),
      postingDate: parseWdDate(r["postingDate"] as string) || new Date(),
      documentDate: parseWdDate(r["journalDate"] as string || r["postingDate"] as string) || new Date(),
      entryDate: parseWdDate(r["enteredDateTime"] as string || r["postingDate"] as string) || new Date(),
      documentType: String(r["journalType"]?.toString() || "JE"),
      referenceNumber: r["externalJournalReference"] ? String(r["externalJournalReference"]) : undefined,
      headerText: r["memo"] ? String(r["memo"]) : undefined,
      userName: getWdDescriptor(r["enteredBy"] as Record<string, unknown> | undefined, ""),
      lineItems: [],
      currency: getWdDescriptor(r["currency"] as Record<string, unknown> | undefined, "USD"),
      totalAmount: parseFloat(String(r["totalAmount"] || r["amount"] || "0")) || 0,
      isReversed: Boolean(r["reversed"] || false),
      reversalDocument: r["reversalJournal"]
        ? getWdDescriptor(r["reversalJournal"] as Record<string, unknown>, "")
        : undefined,
      source: mapWdSource(String(r["journalSource"] || "")),
    };
  });
}

function mapWdSource(src: string): "MANUAL" | "AUTOMATIC" | "BATCH" | "INTERFACE" {
  const s = src.toLowerCase();
  if (s.includes("manual") || s.includes("user")) return "MANUAL";
  if (s.includes("batch") || s.includes("mass")) return "BATCH";
  if (s.includes("integrat") || s.includes("interface") || s.includes("import")) return "INTERFACE";
  return "AUTOMATIC";
}

// ---- Payments ----

export function transformPaymentRuns(records: unknown[]): PaymentRecord[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      paymentRunId: String(r["id"] || r["paymentNumber"] || ""),
      paymentDate: parseWdDate(r["paymentDate"] as string) || new Date(),
      paymentMethod: getWdDescriptor(r["paymentType"] as Record<string, unknown> | undefined, ""),
      paymentAmount: parseFloat(String(r["amount"] || r["paymentAmount"] || "0")) || 0,
      currency: getWdDescriptor(r["currency"] as Record<string, unknown> | undefined, "USD"),
      vendorId: getWdId(r["supplier"] as Record<string, unknown> | undefined),
      vendorName: getWdDescriptor(r["supplier"] as Record<string, unknown> | undefined, ""),
      bankAccount: r["bankAccountNumber"] ? String(r["bankAccountNumber"]) : undefined,
      bankCountry: r["bankCountry"]
        ? getWdDescriptor(r["bankCountry"] as Record<string, unknown>, "")
        : undefined,
      iban: r["iban"] ? String(r["iban"]) : undefined,
      swiftCode: r["swiftCode"] ? String(r["swiftCode"]) : undefined,
      companyCode: getWdDescriptor(r["company"] as Record<string, unknown> | undefined, ""),
      invoiceReferences: Array.isArray(r["invoices"])
        ? (r["invoices"] as unknown[]).map((i) => getWdId(i as Record<string, unknown>)).filter(Boolean)
        : [],
      isUrgent: Boolean(r["urgent"] || false),
      createdBy: getWdDescriptor(r["enteredBy"] as Record<string, unknown> | undefined, ""),
      approvedBy: r["approvedBy"]
        ? getWdDescriptor(r["approvedBy"] as Record<string, unknown>, "")
        : undefined,
    };
  });
}

// ---- User Access ----

export function transformWorkers(workers: unknown[]): UserAccessRecord[] {
  return workers.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const worker = (r["worker"] as Record<string, unknown>) || r;
    const workerData = (r["workerData"] as Record<string, unknown>) || {};
    const userData = (workerData["userAccountData"] as Record<string, unknown>) || {};

    const roles: UserRoleAssignment[] = [];
    const securityGroups = (workerData["securityGroups"] as unknown[]) || [];
    for (const sg of securityGroups) {
      const s = sg as Record<string, unknown>;
      roles.push({
        roleName: getWdDescriptor(s as Record<string, unknown>, ""),
        roleDescription: s["description"] ? String(s["description"]) : undefined,
        assignedFrom: new Date(0),
        assignedTo: new Date(9999, 11, 31),
        isComposite: false,
      });
    }

    return {
      userId: getWdId(worker) || String(r["id"] || ""),
      userName: getWdDescriptor(worker, ""),
      userType: "DIALOG" as const,
      isLocked: Boolean(userData["userIsDisabled"] || userData["disabled"] || false),
      lastLogon: parseWdDate(userData["lastSignIn"] as string || userData["lastLogin"] as string),
      validFrom: parseWdDate(
        (workerData["employmentData"] as Record<string, unknown>)?.["hireDate"] as string
      ) || new Date(0),
      validTo: parseWdDate(
        (workerData["employmentData"] as Record<string, unknown>)?.["endDate"] as string
      ) || new Date(9999, 11, 31),
      roles,
      profiles: [],
      email: String(
        userData["email"] ||
        (workerData["contactData"] as Record<string, unknown>)?.["email"] ||
        ""
      ) || undefined,
    };
  });
}

// ---- Audit Trail ----

export function transformAuditLogs(records: unknown[]): ChangeLogEntry[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const fieldChange: FieldChange = {
      tableName: String(r["businessObject"] || r["dataSource"] || ""),
      fieldName: String(r["field"] || r["attribute"] || ""),
      changeIndicator: mapWdChangeType(String(r["action"] || "U")),
      oldValue: r["previousValue"] ? String(r["previousValue"]) : undefined,
      newValue: r["newValue"] ? String(r["newValue"]) : undefined,
    };

    return {
      changeDocumentNumber: String(r["id"] || r["logId"] || ""),
      objectClass: String(r["businessObject"] || r["objectType"] || ""),
      objectId: String(r["instanceId"] || r["workdayId"] || ""),
      changeDate: parseWdDate(r["eventDateTime"] as string || r["dateTimeStamp"] as string) || new Date(),
      changeTime: formatTime(parseWdDate(r["eventDateTime"] as string) || new Date()),
      changedBy: getWdDescriptor(r["user"] as Record<string, unknown> | undefined, "") ||
        String(r["userName"] || ""),
      transactionCode: String(r["task"] || r["action"] || ""),
      fieldChanges: [fieldChange],
    };
  });
}

function mapWdChangeType(t: string): "I" | "U" | "D" {
  const u = t.toUpperCase();
  if (u === "CREATE" || u === "INSERT" || u === "I") return "I";
  if (u === "DELETE" || u === "INACTIVATE" || u === "D") return "D";
  return "U";
}

// ---- SoD Violations ----

export function transformSoDViolations(_records: unknown[]): SoDViolation[] {
  // Workday does not expose native SoD violations via REST — use empty set
  // Organizations use Workday Compliance module or third-party (Saviynt, Pathlock)
  return [];
}

// ---- High-value Transactions ----

export function transformHighValueTx(records: unknown[], threshold: number): SuspiciousTransaction[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const amount = parseFloat(String(r["amount"] || r["transactionAmount"] || "0")) || 0;
    const riskFlags: string[] = [];
    if (amount > threshold * 10) riskFlags.push("LARGE_AMOUNT");

    return {
      transactionId: String(r["id"] || r["transactionId"] || ""),
      transactionDate: parseWdDate(r["transactionDate"] as string) || new Date(),
      amount,
      currency: getWdDescriptor(r["currency"] as Record<string, unknown> | undefined, "USD"),
      counterpartyId: getWdId(r["counterparty"] as Record<string, unknown> | undefined) || "",
      counterpartyName: getWdDescriptor(r["counterparty"] as Record<string, unknown> | undefined, ""),
      counterpartyCountry: String(r["counterpartyCountry"] || ""),
      transactionType: "WIRE" as const,
      riskScore: Math.min(100, Math.round((amount / threshold) * 10)),
      riskFlags,
      screeningResult: "CLEAR" as const,
    };
  });
}

// ---- Helpers ----

function getWdDescriptor(
  obj: Record<string, unknown> | undefined,
  fallback: string
): string {
  if (!obj) return fallback;
  return String(obj["descriptor"] || obj["name"] || obj["id"] || fallback);
}

function getWdId(obj: Record<string, unknown> | undefined): string {
  if (!obj) return "";
  return String(obj["id"] || obj["workdayId"] || obj["descriptor"] || "");
}

function parseWdDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}
