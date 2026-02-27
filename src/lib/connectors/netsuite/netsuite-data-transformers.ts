// Oracle NetSuite — data transformers to normalized CCM types

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
      documentNumber: String(r["tranId"] || r["id"] || r["TRANID"] || ""),
      companyCode: getNsValue(r["subsidiary"] || r["SUBSIDIARY"] || r["entity"]),
      fiscalYear: extractYear(String(r["tranDate"] || r["TRANDATE"] || "")),
      fiscalPeriod: extractPeriod(getNsValue(r["postingPeriod"] || r["POSTINGPERIOD"] || "")),
      postingDate: parseDate(String(r["tranDate"] || r["TRANDATE"] || "")) || new Date(),
      documentDate: parseDate(String(r["tranDate"] || r["TRANDATE"] || "")) || new Date(),
      entryDate: parseDate(String(r["createdDate"] || r["tranDate"] || "")) || new Date(),
      documentType: String(r["trantype"] || r["TRANTYPE"] || "JE"),
      referenceNumber: r["externalId"] ? String(r["externalId"]) : undefined,
      headerText: String(r["memo"] || r["MEMO"] || r["description"] || ""),
      userName: getNsValue(r["createdBy"] || r["CREATEDBY"] || r["lastModifiedBy"]),
      lineItems: [],
      currency: getNsValue(r["currency"] || r["CURRENCY"]) || "USD",
      totalAmount: parseFloat(String(r["total"] || r["TOTAL"] || r["debitTotal"] || "0")) || 0,
      isReversed: Boolean(r["isReversal"] || r["reversed"] || false),
      reversalDocument: r["reversalEntry"] ? getNsValue(r["reversalEntry"] as Record<string, unknown>) : undefined,
      source: mapNsSource(String(r["trantype"] || r["TRANTYPE"] || "")),
    };
  });
}

function mapNsSource(trantype: string): "MANUAL" | "AUTOMATIC" | "BATCH" | "INTERFACE" {
  const t = trantype.toUpperCase();
  if (t === "JOURNAL" || t === "JOURNALENTRY") return "MANUAL";
  if (t === "EXPENSE" || t === "BATCHPAYMENT") return "BATCH";
  return "AUTOMATIC";
}

function extractYear(dateStr: string): number {
  const d = parseDate(dateStr);
  return d ? d.getFullYear() : new Date().getFullYear();
}

function extractPeriod(periodStr: string): number {
  const match = periodStr.match(/(\d{1,2})[/\-]?\d{4}/);
  return match ? parseInt(match[1], 10) : 1;
}

// ---- Payments ----

export function transformPaymentRuns(records: unknown[]): PaymentRecord[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      paymentRunId: String(r["tranId"] || r["id"] || r["TRANID"] || ""),
      paymentDate: parseDate(String(r["tranDate"] || r["TRANDATE"] || "")) || new Date(),
      paymentMethod: getNsValue(r["paymentMethod"] || r["PAYMENTMETHOD"]) || "",
      paymentAmount: parseFloat(String(r["total"] || r["TOTAL"] || r["amount"] || r["AMOUNT"] || "0")) || 0,
      currency: getNsValue(r["currency"] || r["CURRENCY"]) || "USD",
      vendorId: getNsId(r["entity"] || r["ENTITY"]),
      vendorName: getNsValue(r["entity"] || r["ENTITY"]) || "",
      bankAccount: r["account"] ? getNsValue(r["account"] as Record<string, unknown>) : undefined,
      companyCode: getNsValue(r["subsidiary"] || r["SUBSIDIARY"]),
      invoiceReferences: r["applyList"]
        ? extractApplyList(r["applyList"] as Record<string, unknown>)
        : [],
      isUrgent: false,
      createdBy: getNsValue(r["createdBy"] || r["CREATEDBY"]) || "",
      approvedBy: r["approvedBy"] ? getNsValue(r["approvedBy"] as Record<string, unknown>) : undefined,
    };
  });
}

function extractApplyList(applyList: Record<string, unknown>): string[] {
  const apply = applyList["apply"];
  if (!Array.isArray(apply)) return [];
  return (apply as unknown[]).map((a) => {
    const item = a as Record<string, unknown>;
    return String(item["doc"] || item["refNum"] || item["internalId"] || "");
  }).filter(Boolean);
}

// ---- User Access ----

export function transformEmployees(employees: unknown[]): UserAccessRecord[] {
  return employees.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const roles: UserRoleAssignment[] = [];

    // NetSuite employee roles come as a sub-list
    const roleList = (r["roles"] as Record<string, unknown>)?.["role"];
    if (Array.isArray(roleList)) {
      for (const role of roleList as unknown[]) {
        const ro = role as Record<string, unknown>;
        roles.push({
          roleName: getNsValue(ro["role"] as Record<string, unknown>) || String(ro["name"] || ""),
          assignedFrom: new Date(0),
          assignedTo: new Date(9999, 11, 31),
          isComposite: false,
        });
      }
    }

    return {
      userId: String(r["entityId"] || r["ENTITYID"] || r["id"] || ""),
      userName: String(r["entityId"] || r["ENTITYID"] || r["email"] || ""),
      userType: "DIALOG" as const,
      isLocked: Boolean(r["giveAccess"] === false || r["isInactive"] || false),
      lastLogon: undefined,
      validFrom: new Date(0),
      validTo: Boolean(r["isInactive"]) ? new Date() : new Date(9999, 11, 31),
      roles,
      profiles: [],
      email: r["email"] ? String(r["email"]) : undefined,
      department: r["department"] ? getNsValue(r["department"] as Record<string, unknown>) : undefined,
    };
  });
}

// ---- Audit Trail (System Notes) ----

export function transformSystemNotes(records: unknown[]): ChangeLogEntry[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const fieldChange: FieldChange = {
      tableName: String(r["type"] || r["TYPE"] || "Record"),
      fieldName: String(r["field"] || r["FIELD"] || r["name"] || ""),
      changeIndicator: "U" as const,
      oldValue: r["oldValue"] !== undefined ? String(r["oldValue"]) : undefined,
      newValue: r["newValue"] !== undefined ? String(r["newValue"]) : undefined,
    };

    return {
      changeDocumentNumber: String(r["id"] || r["ID"] || ""),
      objectClass: String(r["recordType"] || r["RECORDTYPE"] || r["type"] || ""),
      objectId: String(r["record"] || r["RECORD"] || r["internalId"] || ""),
      changeDate: parseDate(String(r["date"] || r["DATE"] || r["dateCreated"] || "")) || new Date(),
      changeTime: formatTime(parseDate(String(r["date"] || r["DATE"] || "")) || new Date()),
      changedBy: getNsValue(r["author"] || r["AUTHOR"] || r["user"]),
      transactionCode: String(r["type"] || r["TYPE"] || ""),
      fieldChanges: [fieldChange],
    };
  });
}

// ---- SoD Violations ----

export function transformSoDViolations(_records: unknown[]): SoDViolation[] {
  // NetSuite does not have native SoD violation reports — use empty set
  return [];
}

// ---- High-value Transactions ----

export function transformHighValueTx(records: unknown[], threshold: number): SuspiciousTransaction[] {
  return records.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    const amount = parseFloat(String(r["amount"] || r["AMOUNT"] || r["total"] || r["TOTAL"] || "0")) || 0;
    const riskFlags: string[] = [];
    if (amount > threshold * 10) riskFlags.push("LARGE_AMOUNT");

    return {
      transactionId: String(r["tranId"] || r["TRANID"] || r["id"] || ""),
      transactionDate: parseDate(String(r["tranDate"] || r["TRANDATE"] || "")) || new Date(),
      amount,
      currency: getNsValue(r["currency"] || r["CURRENCY"]) || "USD",
      counterpartyId: getNsId(r["entity"] || r["ENTITY"]),
      counterpartyName: getNsValue(r["entity"] || r["ENTITY"]) || "",
      counterpartyCountry: "",
      transactionType: "WIRE" as const,
      riskScore: Math.min(100, Math.round((amount / threshold) * 10)),
      riskFlags,
      screeningResult: "CLEAR" as const,
    };
  });
}

// ---- Helpers ----

function getNsValue(obj: unknown): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number") return String(obj);
  const o = obj as Record<string, unknown>;
  return String(o["name"] || o["refName"] || o["value"] || o["id"] || "");
}

function getNsId(obj: unknown): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  const o = obj as Record<string, unknown>;
  return String(o["id"] || o["internalId"] || o["value"] || "");
}

function parseDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}
