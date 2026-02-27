// Workday Financial Management — CCM connector implementation

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
import type { WorkdayConfig } from "../config-schema";
import { WorkdayClient } from "./workday-client";
import { getWorkdayAuth, invalidateWorkdayToken } from "./workday-auth";
import {
  transformJournalEntries,
  transformPaymentRuns,
  transformWorkers,
  transformAuditLogs,
  transformSoDViolations,
  transformHighValueTx,
} from "./workday-data-transformers";
import { WORKDAY_API_ENDPOINTS, WORKDAY_FINANCIAL_VERSION } from "./workday-constants";

export class WorkdayConnector implements ERPConnector {
  readonly connectorType: ERPType = "WORKDAY";
  readonly displayName = "Workday Financial Management";
  readonly capabilities: ConnectorCapability[] = ["rest_api"];

  private config: WorkdayConfig;
  private client: WorkdayClient | null = null;
  private connected = false;

  constructor(rawConfig: ConnectorConfig) {
    this.config = rawConfig as WorkdayConfig;
  }

  async connect(): Promise<boolean> {
    try {
      const authHeader = await getWorkdayAuth(this.config);
      this.client = new WorkdayClient(
        this.config.hostname,
        this.config.tenantName,
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

      const result = await this.client.ping();

      if (result.error) {
        if (result.statusCode === 401 || result.statusCode === 403) {
          invalidateWorkdayToken(this.config);
          errors.push(`Authentication failed: ${result.error}`);
        } else {
          errors.push(result.error);
        }
      }

      const totalResults = result.data?.total as number | undefined;
      return {
        success: errors.length === 0,
        latencyMs: Date.now() - start,
        systemId: this.config.tenantName,
        capabilities: this.capabilities,
        errors,
        warnings: totalResults === 0 ? ["No workers found — verify tenant configuration"] : [],
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

    const result = await this.client!.getCollection(
      WORKDAY_API_ENDPOINTS.JOURNAL_ENTRIES.path,
      {
        from: params.dateFrom.toISOString().split("T")[0],
        to: params.dateTo.toISOString().split("T")[0],
        limit: String(params.limit || 100),
        offset: String(params.offset || 0),
      },
      WORKDAY_FINANCIAL_VERSION
    );

    const records = extractWdRecords(result.data);

    return {
      records: transformJournalEntries(records),
      totalCount: Number(result.data?.total || records.length),
      hasMore: records.length >= (params.limit || 100),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullPaymentRuns(params: PullParams): Promise<PullResult<PaymentRecord>> {
    const start = Date.now();
    await this.ensureConnected();

    const result = await this.client!.getCollection(
      WORKDAY_API_ENDPOINTS.PAYMENTS.invoicePath,
      {
        from: params.dateFrom.toISOString().split("T")[0],
        to: params.dateTo.toISOString().split("T")[0],
        limit: String(params.limit || 100),
        offset: String(params.offset || 0),
      },
      WORKDAY_FINANCIAL_VERSION
    );

    const records = extractWdRecords(result.data);

    return {
      records: transformPaymentRuns(records),
      totalCount: records.length,
      hasMore: records.length >= (params.limit || 100),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullSoDViolations(_params: PullParams): Promise<PullResult<SoDViolation>> {
    return { records: transformSoDViolations([]), totalCount: 0, hasMore: false, pulledAt: new Date(), durationMs: 0, apiCallCount: 0 };
  }

  // ---- Access Control ----

  async pullUserAccess(params: PullParams): Promise<PullResult<UserAccessRecord>> {
    const start = Date.now();
    await this.ensureConnected();

    const result = await this.client!.getCollection(WORKDAY_API_ENDPOINTS.WORKERS.path, {
      limit: String(params.limit || 100),
      offset: String(params.offset || 0),
      expand: "workerData:securityGroups,workerData:userAccountData,workerData:employmentData",
    });

    const records = extractWdRecords(result.data);

    return {
      records: transformWorkers(records),
      totalCount: Number(result.data?.total || records.length),
      hasMore: records.length >= (params.limit || 100),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  // ---- Audit Trail ----

  async pullChangeDocuments(params: PullParams): Promise<PullResult<ChangeLogEntry>> {
    const start = Date.now();
    await this.ensureConnected();

    const result = await this.client!.getCollection(WORKDAY_API_ENDPOINTS.AUDIT_LOGS.path, {
      from: params.dateFrom.toISOString(),
      to: params.dateTo.toISOString(),
      limit: String(params.limit || 100),
      offset: String(params.offset || 0),
    });

    const records = extractWdRecords(result.data);

    return {
      records: transformAuditLogs(records),
      totalCount: Number(result.data?.total || records.length),
      hasMore: records.length >= (params.limit || 100),
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

    const result = await this.client!.getCollection(
      WORKDAY_API_ENDPOINTS.BANK_TRANSACTIONS.path,
      {
        from: params.dateFrom.toISOString().split("T")[0],
        to: params.dateTo.toISOString().split("T")[0],
        minAmount: String(params.threshold),
        limit: String(params.limit || 100),
      },
      WORKDAY_FINANCIAL_VERSION
    );

    const records = extractWdRecords(result.data);

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
      if (!ok) throw new Error("Workday: failed to establish connection");
    }
  }
}

function extractWdRecords(data: Record<string, unknown> | null): unknown[] {
  if (!data) return [];
  if (Array.isArray(data.data)) return data.data as unknown[];
  if (Array.isArray(data.entries)) return data.entries as unknown[];
  if (Array.isArray(data.items)) return data.items as unknown[];
  return [];
}
