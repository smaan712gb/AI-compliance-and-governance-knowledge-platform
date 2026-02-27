// Oracle ERP Cloud (Fusion) — CCM connector implementation

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
import type { OracleCloudConfig } from "../config-schema";
import { OracleClient } from "./oracle-client";
import { getOracleAuth, invalidateOracleToken } from "./oracle-auth";
import {
  transformJournalEntries,
  transformPaymentRuns,
  transformUsers,
  transformAuditHistory,
  transformSoDViolations,
  transformHighValueTx,
} from "./oracle-data-transformers";
import { ORACLE_API_ENDPOINTS, ORACLE_DEFAULT_PAGE_SIZE } from "./oracle-constants";

export class OracleCloudConnector implements ERPConnector {
  readonly connectorType: ERPType = "ORACLE_CLOUD";
  readonly displayName = "Oracle ERP Cloud (Fusion)";
  readonly capabilities: ConnectorCapability[] = ["rest_api", "odata_v4"];

  private config: OracleCloudConfig;
  private client: OracleClient | null = null;
  private connected = false;

  constructor(rawConfig: ConnectorConfig) {
    this.config = rawConfig as OracleCloudConfig;
  }

  async connect(): Promise<boolean> {
    try {
      const authHeader = await getOracleAuth(this.config);
      this.client = new OracleClient(
        this.config.hostname,
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

      const result = await this.client.get(ORACLE_API_ENDPOINTS.JOURNAL_ENTRIES.testPath);

      if (result.error) {
        if (result.statusCode === 401 || result.statusCode === 403) {
          invalidateOracleToken(this.config);
          errors.push(`Authentication failed: ${result.error}`);
        } else {
          errors.push(result.error);
        }
      }

      return {
        success: errors.length === 0,
        latencyMs: Date.now() - start,
        systemId: this.config.hostname,
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

    const queryParams: Record<string, string> = {
      limit: String(params.limit || ORACLE_DEFAULT_PAGE_SIZE),
      offset: String(params.offset || 0),
      q: `AccountedDate >= "${params.dateFrom.toISOString().split("T")[0]}" AND AccountedDate <= "${params.dateTo.toISOString().split("T")[0]}"`,
    };

    if (this.config.defaultBusinessUnit) {
      queryParams["q"] += ` AND LedgerName = "${this.config.defaultBusinessUnit}"`;
    }

    const result = await this.client!.getCollection(ORACLE_API_ENDPOINTS.JOURNAL_ENTRIES.path, queryParams);
    const records = extractOracleRecords(result.data);

    return {
      records: transformJournalEntries(records),
      totalCount: Number(result.data?.totalResults || records.length),
      hasMore: records.length >= (params.limit || ORACLE_DEFAULT_PAGE_SIZE),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullPaymentRuns(params: PullParams): Promise<PullResult<PaymentRecord>> {
    const start = Date.now();
    await this.ensureConnected();

    const result = await this.client!.getCollection(ORACLE_API_ENDPOINTS.PAYMENT_RUNS.path, {
      limit: String(params.limit || ORACLE_DEFAULT_PAGE_SIZE),
      offset: String(params.offset || 0),
      q: `PaymentDate >= "${params.dateFrom.toISOString().split("T")[0]}" AND PaymentDate <= "${params.dateTo.toISOString().split("T")[0]}"`,
    });

    const records = extractOracleRecords(result.data);

    return {
      records: transformPaymentRuns(records),
      totalCount: records.length,
      hasMore: records.length >= (params.limit || ORACLE_DEFAULT_PAGE_SIZE),
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

    const [usersResult, rolesResult] = await Promise.all([
      this.client!.getCollection(ORACLE_API_ENDPOINTS.USERS.path, {
        limit: String(params.limit || ORACLE_DEFAULT_PAGE_SIZE),
        offset: String(params.offset || 0),
        fields: "Username,DisplayName,Email,SuspendedFlag,StartDate,EndDate,LastLoggedInDate",
      }),
      this.client!.getCollection(`${ORACLE_API_ENDPOINTS.USERS.path}?expand=roleAssignments`, {
        limit: "2000",
        fields: "Username,roleAssignments.RoleName,roleAssignments.RoleCode,roleAssignments.StartDate",
      }),
    ]);

    const users = extractOracleRecords(usersResult.data);
    // Oracle returns nested roleAssignments per user — flatten to role records
    const roleRecords: unknown[] = [];
    for (const u of extractOracleRecords(rolesResult.data)) {
      const user = u as Record<string, unknown>;
      const assignments = user["roleAssignments"];
      if (Array.isArray(assignments)) {
        for (const a of assignments) {
          roleRecords.push({ ...(a as Record<string, unknown>), Username: user["Username"] });
        }
      }
    }

    return {
      records: transformUsers(users, roleRecords),
      totalCount: Number(usersResult.data?.totalResults || users.length),
      hasMore: users.length >= (params.limit || ORACLE_DEFAULT_PAGE_SIZE),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 2,
    };
  }

  // ---- Audit Trail ----

  async pullChangeDocuments(params: PullParams): Promise<PullResult<ChangeLogEntry>> {
    const start = Date.now();
    await this.ensureConnected();

    const result = await this.client!.getCollection(ORACLE_API_ENDPOINTS.AUDIT_HISTORY.path, {
      limit: String(params.limit || ORACLE_DEFAULT_PAGE_SIZE),
      offset: String(params.offset || 0),
      q: `AuditTimestamp >= "${params.dateFrom.toISOString()}" AND AuditTimestamp <= "${params.dateTo.toISOString()}"`,
    });

    const records = extractOracleRecords(result.data);

    return {
      records: transformAuditHistory(records),
      totalCount: Number(result.data?.totalResults || records.length),
      hasMore: records.length >= (params.limit || ORACLE_DEFAULT_PAGE_SIZE),
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

    const result = await this.client!.getCollection(ORACLE_API_ENDPOINTS.PAYMENTS_DISBURSEMENTS.path, {
      limit: String(params.limit || 500),
      offset: String(params.offset || 0),
      q: `PaymentDate >= "${params.dateFrom.toISOString().split("T")[0]}" AND PaymentDate <= "${params.dateTo.toISOString().split("T")[0]}" AND PaymentAmount >= "${params.threshold}"`,
    });

    const records = extractOracleRecords(result.data);

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
      if (!ok) throw new Error("Oracle ERP Cloud: failed to establish connection");
    }
  }
}

function extractOracleRecords(data: Record<string, unknown> | null): unknown[] {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items as unknown[];
  if (Array.isArray(data.entries)) return data.entries as unknown[];
  return [];
}
