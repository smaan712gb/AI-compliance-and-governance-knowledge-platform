// Oracle NetSuite — CCM connector implementation

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
import type { NetSuiteConfig } from "../config-schema";
import { NetSuiteClient } from "./netsuite-client";
import {
  transformJournalEntries,
  transformPaymentRuns,
  transformEmployees,
  transformSystemNotes,
  transformSoDViolations,
  transformHighValueTx,
} from "./netsuite-data-transformers";
import { NETSUITE_API_ENDPOINTS } from "./netsuite-constants";

export class NetSuiteConnector implements ERPConnector {
  readonly connectorType: ERPType = "NETSUITE";
  readonly displayName = "Oracle NetSuite";
  readonly capabilities: ConnectorCapability[] = ["rest_api"];

  private config: NetSuiteConfig;
  private client: NetSuiteClient | null = null;
  private connected = false;

  constructor(rawConfig: ConnectorConfig) {
    this.config = rawConfig as NetSuiteConfig;
  }

  async connect(): Promise<boolean> {
    try {
      this.client = new NetSuiteClient(this.config);
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
        errors.push(result.error);
      }

      return {
        success: errors.length === 0,
        latencyMs: Date.now() - start,
        systemId: this.config.accountId,
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

    const from = params.dateFrom.toISOString().split("T")[0];
    const to = params.dateTo.toISOString().split("T")[0];
    const limit = params.limit || 1000;
    const offset = Number(params.offset || 0);

    const query = `SELECT id, tranId, tranDate, trantype, memo, createdDate, createdBy, currency, total, subsidiary, postingPeriod, isReversal FROM JournalEntry WHERE tranDate >= TO_DATE('${from}', 'YYYY-MM-DD') AND tranDate <= TO_DATE('${to}', 'YYYY-MM-DD') ORDER BY tranDate DESC`;

    const result = await this.client!.suiteql(query, offset, limit);
    const records = extractNsRecords(result.data);

    return {
      records: transformJournalEntries(records),
      totalCount: Number(result.data?.count || records.length),
      hasMore: records.length >= limit,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullPaymentRuns(params: PullParams): Promise<PullResult<PaymentRecord>> {
    const start = Date.now();
    await this.ensureConnected();

    const from = params.dateFrom.toISOString().split("T")[0];
    const to = params.dateTo.toISOString().split("T")[0];
    const limit = params.limit || 1000;
    const offset = Number(params.offset || 0);

    const query = `SELECT id, tranId, tranDate, entity, amount, currency, subsidiary, paymentMethod, account, createdBy FROM VendorPayment WHERE tranDate >= TO_DATE('${from}', 'YYYY-MM-DD') AND tranDate <= TO_DATE('${to}', 'YYYY-MM-DD') ORDER BY tranDate DESC`;

    const result = await this.client!.suiteql(query, offset, limit);
    const records = extractNsRecords(result.data);

    return {
      records: transformPaymentRuns(records),
      totalCount: records.length,
      hasMore: records.length >= limit,
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

    // NetSuite employee list via REST Record API
    const result = await this.client!.get(NETSUITE_API_ENDPOINTS.EMPLOYEES.path, {
      limit: String(params.limit || 1000),
      offset: String(params.offset || 0),
      expandSubResources: "true",
    });

    const records = extractNsListItems(result.data);

    return {
      records: transformEmployees(records),
      totalCount: Number(result.data?.count || records.length),
      hasMore: records.length >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  // ---- Audit Trail ----

  async pullChangeDocuments(params: PullParams): Promise<PullResult<ChangeLogEntry>> {
    const start = Date.now();
    await this.ensureConnected();

    const from = params.dateFrom.toISOString().split("T")[0];
    const to = params.dateTo.toISOString().split("T")[0];
    const limit = params.limit || 1000;
    const offset = Number(params.offset || 0);

    const query = `SELECT id, type, field, name, date, author, record, recordType, oldValue, newValue FROM SystemNote WHERE date >= TO_DATE('${from}', 'YYYY-MM-DD') AND date <= TO_DATE('${to}', 'YYYY-MM-DD') ORDER BY date DESC`;

    const result = await this.client!.suiteql(query, offset, limit);
    const records = extractNsRecords(result.data);

    return {
      records: transformSystemNotes(records),
      totalCount: Number(result.data?.count || records.length),
      hasMore: records.length >= limit,
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

    const from = params.dateFrom.toISOString().split("T")[0];
    const to = params.dateTo.toISOString().split("T")[0];
    const limit = params.limit || 500;
    const offset = Number(params.offset || 0);

    const query = `SELECT id, tranId, tranDate, entity, amount, currency, subsidiary, type FROM Transaction WHERE tranDate >= TO_DATE('${from}', 'YYYY-MM-DD') AND tranDate <= TO_DATE('${to}', 'YYYY-MM-DD') AND amount >= ${params.threshold} ORDER BY amount DESC`;

    const result = await this.client!.suiteql(query, offset, limit);
    const records = extractNsRecords(result.data);

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
      if (!ok) throw new Error("NetSuite: failed to establish connection");
    }
  }
}

function extractNsRecords(data: Record<string, unknown> | null): unknown[] {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items as unknown[];
  if (Array.isArray(data.results)) return data.results as unknown[];
  return [];
}

function extractNsListItems(data: Record<string, unknown> | null): unknown[] {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items as unknown[];
  return [];
}
