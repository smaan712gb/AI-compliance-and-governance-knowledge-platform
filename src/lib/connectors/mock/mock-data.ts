import type {
  TransactionRecord,
  PaymentRecord,
  UserAccessRecord,
  ChangeLogEntry,
  SoDViolation,
  SuspiciousTransaction,
} from "../types";

// Seeded pseudo-random generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randomDate(from: Date, to: Date, rand: () => number): Date {
  const f = from.getTime();
  const t = to.getTime();
  return new Date(f + rand() * (t - f));
}

const COMPANY_CODES = ["1000", "2000", "3000", "4000"];
const DOC_TYPES = ["SA", "KR", "KZ", "RE", "AB", "DA", "DZ"];
const GL_ACCOUNTS = ["100000", "110000", "140000", "160000", "200000", "300000", "400000", "500000", "600000", "700000"];
const CURRENCIES = ["USD", "EUR", "GBP", "CHF"];
const VENDOR_NAMES = ["Acme Corp", "GlobalTech Inc", "DataServ LLC", "CloudOps SA", "SecureNet GmbH", "PayFlow Ltd", "InfraPro Inc", "ComplianceAI Corp"];
const USER_NAMES = ["JSMITH", "MJONES", "RBROWN", "KWILSON", "LCHEN", "APATEL", "MGARCIA", "DKIM", "SLEE", "TNGUYEN"];
const FULL_NAMES = ["John Smith", "Mary Jones", "Robert Brown", "Karen Wilson", "Li Chen", "Arun Patel", "Maria Garcia", "David Kim", "Sarah Lee", "Tran Nguyen"];
const ROLES = ["SAP_FI_AP_CLERK", "SAP_FI_AR_CLERK", "SAP_FI_GL_ADMIN", "SAP_MM_BUYER", "SAP_SD_ORDER_ADMIN", "SAP_BASIS_ADMIN", "SAP_HR_ADMIN", "SAP_CONTROLLER", "SAP_TREASURY_MGR"];
const TCODES = ["FB01", "FB50", "F110", "FK01", "FK02", "SU01", "PFCG", "ME21N", "VA01", "MIRO", "FBL1N", "SE16"];
const DEPARTMENTS = ["Finance", "Procurement", "IT", "HR", "Treasury", "Compliance", "Sales", "Operations"];
const OBJECT_CLASSES = ["KRED", "DEBI", "BELEG", "FAHA", "EINKBELEG", "MATERIAL", "USER"];
const TABLE_NAMES = ["LFA1", "KNA1", "BKPF", "EKKO", "MARA", "USR02"];
const COUNTRIES = ["US", "DE", "GB", "CH", "SG", "HK", "AE", "RU", "CN", "IR"];

export function generateMockJournalEntries(
  from: Date,
  to: Date,
  count: number,
  seed?: number
): TransactionRecord[] {
  const rand = seededRandom(seed ?? Date.now());
  return Array.from({ length: count }, (_, i) => {
    const companyCode = pick(COMPANY_CODES, rand);
    const date = randomDate(from, to, rand);
    const lineCount = Math.floor(rand() * 4) + 2;
    const amounts = Array.from({ length: lineCount }, () => Math.round(rand() * 100000) / 100);
    const total = amounts.reduce((a, b) => a + b, 0);

    return {
      documentNumber: String(1000000 + i).padStart(10, "0"),
      companyCode,
      fiscalYear: date.getFullYear(),
      fiscalPeriod: date.getMonth() + 1,
      postingDate: date,
      documentDate: date,
      entryDate: date,
      documentType: pick(DOC_TYPES, rand),
      referenceNumber: rand() > 0.5 ? `REF-${Math.floor(rand() * 99999)}` : undefined,
      headerText: rand() > 0.7 ? "Monthly accrual" : undefined,
      userName: pick(USER_NAMES, rand),
      currency: pick(CURRENCIES, rand),
      totalAmount: Math.round(total * 100) / 100,
      isReversed: rand() < 0.05,
      source: pick(["MANUAL", "AUTOMATIC", "BATCH", "INTERFACE"] as const, rand),
      lineItems: amounts.map((amt, idx) => ({
        lineNumber: idx + 1,
        glAccount: pick(GL_ACCOUNTS, rand),
        amount: idx === 0 ? Math.abs(amt) : -Math.abs(amt),
        debitCredit: idx === 0 ? "D" as const : "C" as const,
        costCenter: rand() > 0.5 ? `CC${Math.floor(rand() * 9000) + 1000}` : undefined,
        profitCenter: rand() > 0.6 ? `PC${Math.floor(rand() * 900) + 100}` : undefined,
        vendorId: rand() > 0.7 ? `V${Math.floor(rand() * 9999)}` : undefined,
        text: rand() > 0.8 ? "Line item text" : undefined,
      })),
    };
  });
}

export function generateMockPaymentRuns(
  from: Date,
  to: Date,
  count: number,
  seed?: number
): PaymentRecord[] {
  const rand = seededRandom(seed ?? Date.now());
  return Array.from({ length: count }, (_, i) => ({
    paymentRunId: `PR-${String(i + 1).padStart(6, "0")}`,
    paymentDate: randomDate(from, to, rand),
    paymentMethod: pick(["T", "E", "C", "K"], rand),
    paymentAmount: Math.round(rand() * 500000 * 100) / 100,
    currency: pick(CURRENCIES, rand),
    vendorId: `V${Math.floor(rand() * 9999)}`,
    vendorName: pick(VENDOR_NAMES, rand),
    bankAccount: `ACCT-${Math.floor(rand() * 99999)}`,
    bankCountry: pick(COUNTRIES.slice(0, 4), rand),
    companyCode: pick(COMPANY_CODES, rand),
    invoiceReferences: [`INV-${Math.floor(rand() * 999999)}`],
    isUrgent: rand() < 0.1,
    createdBy: pick(USER_NAMES, rand),
    approvedBy: rand() > 0.3 ? pick(USER_NAMES, rand) : undefined,
  }));
}

export function generateMockUserAccess(
  count: number,
  seed?: number
): UserAccessRecord[] {
  const rand = seededRandom(seed ?? Date.now());
  return Array.from({ length: Math.min(count, USER_NAMES.length) }, (_, i) => {
    const roleCount = Math.floor(rand() * 4) + 1;
    return {
      userId: USER_NAMES[i],
      userName: FULL_NAMES[i],
      userType: "DIALOG" as const,
      isLocked: rand() < 0.1,
      lastLogon: rand() > 0.2 ? randomDate(new Date("2025-01-01"), new Date(), rand) : undefined,
      validFrom: new Date("2020-01-01"),
      validTo: new Date("2099-12-31"),
      roles: Array.from({ length: roleCount }, () => ({
        roleName: pick(ROLES, rand),
        roleDescription: "Role description",
        assignedFrom: new Date("2020-01-01"),
        assignedTo: new Date("2099-12-31"),
        isComposite: rand() < 0.2,
      })),
      profiles: [],
      department: pick(DEPARTMENTS, rand),
      email: `${USER_NAMES[i].toLowerCase()}@company.com`,
    };
  });
}

export function generateMockChangeDocuments(
  from: Date,
  to: Date,
  count: number,
  seed?: number
): ChangeLogEntry[] {
  const rand = seededRandom(seed ?? Date.now());
  return Array.from({ length: count }, (_, i) => ({
    changeDocumentNumber: String(5000000 + i).padStart(10, "0"),
    objectClass: pick(OBJECT_CLASSES, rand),
    objectId: String(Math.floor(rand() * 9999999)),
    changeDate: randomDate(from, to, rand),
    changeTime: `${String(Math.floor(rand() * 24)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00`,
    changedBy: pick(USER_NAMES, rand),
    transactionCode: pick(TCODES, rand),
    fieldChanges: Array.from(
      { length: Math.floor(rand() * 3) + 1 },
      () => ({
        tableName: pick(TABLE_NAMES, rand),
        fieldName: `FIELD_${Math.floor(rand() * 100)}`,
        changeIndicator: pick(["I", "U", "D"] as const, rand),
        oldValue: rand() > 0.3 ? `OLD_${Math.floor(rand() * 999)}` : undefined,
        newValue: `NEW_${Math.floor(rand() * 999)}`,
      })
    ),
  }));
}

export function generateMockSoDViolations(
  count: number,
  seed?: number
): SoDViolation[] {
  const rand = seededRandom(seed ?? Date.now());
  const SOD_RULES = [
    { id: "SOD-001", desc: "Create Vendor + Post Payment", process: "Procure-to-Pay", roles: ["SAP_FI_AP_CLERK", "SAP_MM_BUYER"] as [string, string], tcodes: ["FK01", "F110"] as [string, string] },
    { id: "SOD-002", desc: "Create PO + Approve PO", process: "Procure-to-Pay", roles: ["SAP_MM_BUYER", "SAP_MM_BUYER"] as [string, string], tcodes: ["ME21N", "ME29N"] as [string, string] },
    { id: "SOD-003", desc: "Post JE + Approve JE", process: "Record-to-Report", roles: ["SAP_FI_GL_ADMIN", "SAP_CONTROLLER"] as [string, string], tcodes: ["FB01", "FB08"] as [string, string] },
    { id: "SOD-004", desc: "Create User + Assign Role", process: "Identity Management", roles: ["SAP_BASIS_ADMIN", "SAP_BASIS_ADMIN"] as [string, string], tcodes: ["SU01", "PFCG"] as [string, string] },
    { id: "SOD-005", desc: "Create Customer + Post AR", process: "Order-to-Cash", roles: ["SAP_FI_AR_CLERK", "SAP_SD_ORDER_ADMIN"] as [string, string], tcodes: ["XD01", "FB70"] as [string, string] },
  ];

  return Array.from({ length: count }, (_, i) => {
    const rule = pick(SOD_RULES, rand);
    return {
      userId: pick(USER_NAMES, rand),
      userName: pick(FULL_NAMES, rand),
      ruleId: rule.id,
      ruleDescription: rule.desc,
      conflictingRoles: rule.roles,
      conflictingTransactions: rule.tcodes,
      riskLevel: pick(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const, rand),
      conflictType: "ROLE_TCODE" as const,
      businessProcess: rule.process,
      mitigatingControl: rand() > 0.6 ? `MC-${Math.floor(rand() * 100)}` : undefined,
      isWaived: rand() < 0.15,
      detectedAt: new Date(),
    };
  });
}

export function generateMockSuspiciousTransactions(
  count: number,
  threshold: number,
  seed?: number
): SuspiciousTransaction[] {
  const rand = seededRandom(seed ?? Date.now());
  const HIGH_RISK_COUNTRIES = ["RU", "CN", "IR", "KP", "SY"];

  return Array.from({ length: count }, (_, i) => {
    const amount = threshold + rand() * threshold * 10;
    const country = pick(COUNTRIES, rand);
    const riskFlags: string[] = [];

    if (amount >= threshold * 5) riskFlags.push("VERY_HIGH_AMOUNT");
    if (amount >= threshold) riskFlags.push("HIGH_VALUE");
    if (HIGH_RISK_COUNTRIES.includes(country)) riskFlags.push("HIGH_RISK_COUNTRY");
    if (Math.round(amount / 1000) * 1000 === Math.round(amount)) riskFlags.push("ROUND_AMOUNT");
    if (rand() < 0.2) riskFlags.push("STRUCTURING");

    return {
      transactionId: `TXN-${String(i + 1).padStart(8, "0")}`,
      transactionDate: new Date(),
      amount: Math.round(amount * 100) / 100,
      currency: pick(CURRENCIES, rand),
      counterpartyId: `CP-${Math.floor(rand() * 9999)}`,
      counterpartyName: pick(VENDOR_NAMES, rand),
      counterpartyCountry: country,
      transactionType: pick(["WIRE", "ACH", "CHECK", "CARD"] as const, rand),
      riskScore: Math.min(100, riskFlags.length * 20 + Math.floor(rand() * 20)),
      riskFlags,
      screeningResult: rand() < 0.1 ? "POSSIBLE_MATCH" as const : "CLEAR" as const,
      sanctionsHit: rand() < 0.05 ? "OFAC SDN List" : undefined,
    };
  });
}
