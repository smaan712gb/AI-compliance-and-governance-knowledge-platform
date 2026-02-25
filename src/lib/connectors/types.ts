import type { ERPType, SyncDomain } from "@prisma/client";

// ============================================
// CONNECTION & CAPABILITIES
// ============================================

export type ConnectorCapability =
  | "odata_v4"
  | "odata_v2"
  | "rfc"
  | "batch_api"
  | "streaming"
  | "rest_api";

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  serverVersion?: string;
  systemId?: string;
  clientId?: string;
  authenticatedUser?: string;
  capabilities: ConnectorCapability[];
  errors: string[];
  warnings: string[];
}

// ============================================
// DATA PULL PARAMETERS
// ============================================

export interface PullParams {
  dateFrom: Date;
  dateTo: Date;
  companyCode?: string;
  limit?: number;
  offset?: number | string;
  filters?: Record<string, string | string[] | number | boolean>;
  includeRawData?: boolean;
}

export interface PullResult<T> {
  records: T[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number | string;
  pulledAt: Date;
  durationMs: number;
  apiCallCount: number;
}

// ============================================
// NORMALIZED DATA TYPES
// ============================================

/** SOX: Journal entry / financial transaction */
export interface TransactionRecord {
  documentNumber: string;
  companyCode: string;
  fiscalYear: number;
  fiscalPeriod: number;
  postingDate: Date;
  documentDate: Date;
  entryDate: Date;
  documentType: string;
  referenceNumber?: string;
  headerText?: string;
  userName: string;
  lineItems: TransactionLineItem[];
  currency: string;
  totalAmount: number;
  isReversed: boolean;
  reversalDocument?: string;
  source: "MANUAL" | "AUTOMATIC" | "BATCH" | "INTERFACE";
}

export interface TransactionLineItem {
  lineNumber: number;
  glAccount: string;
  glAccountName?: string;
  amount: number;
  debitCredit: "D" | "C";
  costCenter?: string;
  profitCenter?: string;
  vendorId?: string;
  customerId?: string;
  taxCode?: string;
  text?: string;
}

/** SOX + AML: Payment run record */
export interface PaymentRecord {
  paymentRunId: string;
  paymentDate: Date;
  paymentMethod: string;
  paymentAmount: number;
  currency: string;
  vendorId: string;
  vendorName: string;
  bankAccount?: string;
  bankCountry?: string;
  iban?: string;
  swiftCode?: string;
  companyCode: string;
  invoiceReferences: string[];
  isUrgent: boolean;
  createdBy: string;
  approvedBy?: string;
}

/** Access Control: User access record */
export interface UserAccessRecord {
  userId: string;
  userName: string;
  userType: "DIALOG" | "SYSTEM" | "COMMUNICATION" | "SERVICE" | "REFERENCE";
  isLocked: boolean;
  lastLogon?: Date;
  validFrom: Date;
  validTo: Date;
  roles: UserRoleAssignment[];
  profiles: string[];
  userGroup?: string;
  department?: string;
  email?: string;
}

export interface UserRoleAssignment {
  roleName: string;
  roleDescription?: string;
  assignedFrom: Date;
  assignedTo: Date;
  assignedBy?: string;
  isComposite: boolean;
}

/** Audit Trail: Change document */
export interface ChangeLogEntry {
  changeDocumentNumber: string;
  objectClass: string;
  objectId: string;
  changeDate: Date;
  changeTime: string;
  changedBy: string;
  transactionCode: string;
  fieldChanges: FieldChange[];
}

export interface FieldChange {
  tableName: string;
  fieldName: string;
  changeIndicator: "I" | "U" | "D";
  oldValue?: string;
  newValue?: string;
  fieldDescription?: string;
}

/** SOX: Segregation of Duties violation */
export interface SoDViolation {
  userId: string;
  userName: string;
  ruleId: string;
  ruleDescription: string;
  conflictingRoles: [string, string];
  conflictingTransactions: [string, string];
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  conflictType: "ROLE_ROLE" | "ROLE_TCODE" | "TCODE_TCODE";
  businessProcess: string;
  mitigatingControl?: string;
  isWaived: boolean;
  detectedAt: Date;
}

/** AML: Suspicious transaction */
export interface SuspiciousTransaction {
  transactionId: string;
  transactionDate: Date;
  amount: number;
  currency: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyCountry: string;
  transactionType: "WIRE" | "ACH" | "CHECK" | "CARD" | "CASH" | "INTERNAL";
  riskScore: number;
  riskFlags: string[];
  screeningResult?: "CLEAR" | "MATCH" | "POSSIBLE_MATCH";
  sanctionsHit?: string;
}

// ============================================
// MAIN CONNECTOR INTERFACE
// ============================================

export interface ERPConnector {
  readonly connectorType: ERPType;
  readonly displayName: string;
  readonly capabilities: ConnectorCapability[];

  // Lifecycle
  connect(): Promise<boolean>;
  testConnection(): Promise<ConnectionTestResult>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // SOX Controls
  pullJournalEntries(params: PullParams): Promise<PullResult<TransactionRecord>>;
  pullPaymentRuns(params: PullParams): Promise<PullResult<PaymentRecord>>;
  pullSoDViolations(params: PullParams): Promise<PullResult<SoDViolation>>;

  // Access Control
  pullUserAccess(params: PullParams): Promise<PullResult<UserAccessRecord>>;

  // Audit Trail
  pullChangeDocuments(params: PullParams): Promise<PullResult<ChangeLogEntry>>;

  // AML/KYC
  pullHighValueTransactions(
    params: PullParams & { threshold: number }
  ): Promise<PullResult<SuspiciousTransaction>>;

  // Domains this connector supports
  getSupportedDomains(): SyncDomain[];
}
