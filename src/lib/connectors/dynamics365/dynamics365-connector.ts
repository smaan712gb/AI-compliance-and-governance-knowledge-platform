// Microsoft Dynamics 365 Finance & Operations — CCM connector implementation

import type { ERPType, SyncDomain } from "@prisma/client";
import type {
  ERPConnector,
  ConnectorCapability,
  ConnectionTestResult,
  PullParams,
  PullResult,
  TransactionRecord,
  PaymentRecord,
  UserAccessRecord,
  ChangeLogEntry,
  SoDViolation,
  SuspiciousTransaction,
} from "../types";
import type { ConnectorConfig } from "../config-schema";
import type { Dynamics365Config } from "../config-schema";
import { D365Client } from "./dynamics365-client";
import { getD365Auth, invalidateD365Token } from "./dynamics365-auth";
import {
  transformJournalEntries,
  transformPaymentRuns,
  transformUserAccess,
  transformChangeLogs,
  transformSoDViolations,
  transformHighValueTx,
} from "./dynamics365-data-transformers";
import { D365_API_ENDPOINTS } from "./dynamics365-constants";

export class Dynamics365Connector implements ERPConnector {
  readonly connectorType: ERPType = "DYNAMICS_365";
  readonly displayName = "Microsoft Dynamics 365 Finance & Operations";
  readonly capabilities: ConnectorCapability[] = ["odata_v4", "rest_api", "batch_api"];

  private config: Dynamics365Config;
  private client: D365Client | null = null;
  private connected = false;

  constructor(rawConfig: ConnectorConfig) {
    this.config = rawConfig as Dynamics365Config;
  }

  async connect(): Promise<boolean> {
    try {
      const authHeader = await getD365Auth(this.config);
      this.client = new D365Client(
        this.config.environmentUrl,
        authHeader,
        this.config.requestsPerMinute ?? 60,
        this.config.timeoutMs ?? 30000
      );
      this.connected = true;
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
      if (!this.client) await this.connect();
      if (!this.client) {
        return { success: false, latencyMs: Date.now() - start, capabilities: this.capabilities, errors: ["Failed to initialize client"], warnings: [] };
      }

      const result = await this.client.get(D365_API_ENDPOINTS.JOURNAL_ENTRIES.testPath);

      if (result.error) {
        if (result.statusCode === 401 || result.statusCode === 403) {
          invalidateD365Token(this.config);
          errors.push(`Authentication failed: ${result.error}`);
        } else {
          errors.push(result.error);
        }
      }

      const value = (result.data?.value as unknown[]) || [];
      const legalEntity = Array.isArray(value) && value.length > 0
        ? String((value[0] as Record<string, unknown>)["dataAreaId"] || "")
        : undefined;

      return {
        success: errors.length === 0,
        latencyMs: Date.now() - start,
        systemId: legalEntity || this.config.legalEntityId,
        capabilities: this.capabilities,
        errors,
        warnings: [],
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        capabilities: this.capabilities,
        errors: [err instanceof Error ? err.message : String(err)],
        warnings: [],
      };
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSupportedDomains(): SyncDomain[] {
    return ["SOX_CONTROLS", "ACCESS_CONTROL", "AUDIT_TRAIL", "AML_KYC"];
  }

  // ---- SOX Controls ----

  async pullJournalEntries(params: PullParams): Promise<PullResult<TransactionRecord>> {
    const start = Date.now();
    await this.ensureConnected();

    const filter = buildDateFilter(params, "PostingDate");
    const legalEntityFilter = this.config.legalEntityId
      ? ` and dataAreaId eq '${this.config.legalEntityId}'`
      : "";

    const result = await this.client!.getCollection(D365_API_ENDPOINTS.JOURNAL_ENTRIES.path, {
      "$filter": `${filter}${legalEntityFilter}`,
      "$top": String(params.limit || 1000),
      "$skip": String(params.offset || 0),
      "$select": "JournalNumber,dataAreaId,PostingDate,CreatedDateTime,CreatedBy,AccountingCurrencyCode,AccountingCurrencyAmount,Description,Voucher,IsReversed",
    });

    const records = Array.isArray(result.data?.value) ? (result.data!.value as unknown[]) : [];

    return {
      records: transformJournalEntries(records),
      totalCount: parseInt(String(result.data?.["@odata.count"] || records.length), 10),
      hasMore: records.length >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullPaymentRuns(params: PullParams): Promise<PullResult<PaymentRecord>> {
    const start = Date.now();
    await this.ensureConnected();

    const filter = buildDateFilter(params, "TransDate");

    const result = await this.client!.getCollection(D365_API_ENDPOINTS.PAYMENT_JOURNALS.detailPath, {
      "$filter": filter,
      "$top": String(params.limit || 1000),
      "$skip": String(params.offset || 0),
      "$select": "JournalBatchNumber,TransDate,MethodOfPayment,AmountCurCredit,CurrencyCode,AccountNum,Name,BankAccountId,IBAN,SWIFTNo,dataAreaId,CreatedBy,Invoice",
    });

    const records = Array.isArray(result.data?.value) ? (result.data!.value as unknown[]) : [];

    return {
      records: transformPaymentRuns(records),
      totalCount: records.length,
      hasMore: records.length >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullSoDViolations(_params: PullParams): Promise<PullResult<SoDViolation>> {
    // D365 does not have native SoD violation reports via OData — return empty
    // Organizations use Azure AD PIM or third-party tools (Pathlock, Fastpath) for SoD
    return { records: [], totalCount: 0, hasMore: false, pulledAt: new Date(), durationMs: 0, apiCallCount: 0 };
  }

  // ---- Access Control ----

  async pullUserAccess(params: PullParams): Promise<PullResult<UserAccessRecord>> {
    const start = Date.now();
    await this.ensureConnected();

    const [usersResult, rolesResult] = await Promise.all([
      this.client!.getCollection(D365_API_ENDPOINTS.USERS.path, {
        "$top": String(params.limit || 1000),
        "$select": "UserId,UserName,Alias,IsDisabled,Email,ValidFrom,ValidTo,LastLoginDateTime",
      }),
      this.client!.getCollection(D365_API_ENDPOINTS.USER_ROLES.path, {
        "$top": "5000",
        "$select": "UserId,SecurityRoleName,Description,ValidFrom,ValidTo",
      }),
    ]);

    const users = Array.isArray(usersResult.data?.value) ? (usersResult.data!.value as unknown[]) : [];
    const roles = Array.isArray(rolesResult.data?.value) ? (rolesResult.data!.value as unknown[]) : [];

    return {
      records: transformUserAccess(users, roles),
      totalCount: users.length,
      hasMore: users.length >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 2,
    };
  }

  // ---- Audit Trail ----

  async pullChangeDocuments(params: PullParams): Promise<PullResult<ChangeLogEntry>> {
    const start = Date.now();
    await this.ensureConnected();

    const filter = buildDateFilter(params, "CreatedDateTime");

    const result = await this.client!.getCollection(D365_API_ENDPOINTS.DATABASE_LOGS.path, {
      "$filter": filter,
      "$top": String(params.limit || 1000),
      "$skip": String(params.offset || 0),
      "$select": "RecId,TableName,FieldName,OrigValue,NewValue,CreatedBy,CreatedDateTime,ChangeType",
    });

    const records = Array.isArray(result.data?.value) ? (result.data!.value as unknown[]) : [];

    return {
      records: transformChangeLogs(records),
      totalCount: records.length,
      hasMore: records.length >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  // ---- AML/KYC ----

  async pullHighValueTransactions(
    params: PullParams & { threshold: number }
  ): Promise<PullResult<SuspiciousTransaction>> {
    const start = Date.now();
    await this.ensureConnected();

    const dateFilter = buildDateFilter(params, "TransDate");
    const amountFilter = `Amount ge ${params.threshold}`;

    const result = await this.client!.getCollection(D365_API_ENDPOINTS.LEDGER_TRANS.path, {
      "$filter": `${dateFilter} and ${amountFilter}`,
      "$top": String(params.limit || 500),
      "$select": "TransId,TransDate,Amount,CurrencyCode,AccountNum,Name,CountryRegionId,TransType",
    });

    const records = Array.isArray(result.data?.value) ? (result.data!.value as unknown[]) : [];

    return {
      records: transformHighValueTx(records, params.threshold),
      totalCount: records.length,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client) {
      const ok = await this.connect();
      if (!ok) throw new Error("Dynamics 365: failed to establish connection");
    }
  }
}

// ---- Helpers ----

function buildDateFilter(params: PullParams, field: string): string {
  const from = params.dateFrom.toISOString();
  const to = params.dateTo.toISOString();
  return `${field} ge ${from} and ${field} le ${to}`;
}
