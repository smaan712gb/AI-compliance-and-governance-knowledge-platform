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
import type { SAPConfig } from "../config-schema";
import type { ConnectorConfig } from "../config-schema";
import { SAPODataClient } from "./sap-odata-client";
import { getSAPAuth } from "./sap-auth";
import {
  transformJournalEntries,
  transformPaymentRuns,
  transformUserAccess,
  transformChangeDocuments,
  transformSoDViolations,
  transformSuspiciousTransactions,
} from "./sap-data-transformers";
import { SAP_API_ENDPOINTS } from "./sap-constants";

export class SAPConnector implements ERPConnector {
  readonly connectorType: ERPType;
  readonly displayName: string;
  readonly capabilities: ConnectorCapability[];

  private config: SAPConfig;
  private odataClient: SAPODataClient | null = null;
  private connected = false;

  constructor(rawConfig: ConnectorConfig) {
    this.config = rawConfig as SAPConfig;
    this.connectorType = this.config.system as ERPType;
    this.displayName = this.getDisplayName();
    this.capabilities = this.detectCapabilities();
  }

  private getDisplayName(): string {
    switch (this.config.system) {
      case "SAP_S4HANA_CLOUD":
        return "SAP S/4HANA Cloud";
      case "SAP_S4HANA_ONPREM":
        return "SAP S/4HANA On-Premise";
      case "SAP_ECC":
        return "SAP ECC 6.0";
      default:
        return "SAP";
    }
  }

  private detectCapabilities(): ConnectorCapability[] {
    if (this.config.system === "SAP_S4HANA_CLOUD") {
      return ["odata_v4", "batch_api", "rest_api"];
    }
    if (this.config.system === "SAP_S4HANA_ONPREM") {
      return ["odata_v4", "odata_v2", "batch_api", "rest_api"];
    }
    // ECC
    return ["odata_v2", "rest_api"];
  }

  private getBaseUrl(): string {
    if (this.config.system === "SAP_S4HANA_CLOUD") {
      return `https://${this.config.apiHost}`;
    }
    // On-prem and ECC
    const cfg = this.config as SAPConfig & { hostname: string; port: number };
    return `https://${cfg.hostname}:${cfg.port}`;
  }

  async connect(): Promise<boolean> {
    try {
      const authHeader = await getSAPAuth(this.config);
      const cfg = this.config as SAPConfig & { sapClient?: string };
      this.odataClient = new SAPODataClient(
        this.getBaseUrl(),
        authHeader,
        this.config.requestsPerMinute ?? 60,
        this.config.timeoutMs ?? 30000,
        cfg.sapClient ?? "100"
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
    const warnings: string[] = [];

    try {
      if (!this.odataClient) {
        await this.connect();
      }

      if (!this.odataClient) {
        return {
          success: false,
          latencyMs: Date.now() - start,
          capabilities: this.capabilities,
          errors: ["Failed to initialize OData client"],
          warnings: [],
        };
      }

      // Test with a lightweight metadata request
      const result = await this.odataClient.get(
        SAP_API_ENDPOINTS.JOURNAL_ENTRY.metadataPath
      );

      if (result.error) {
        errors.push(result.error);
      }

      return {
        success: errors.length === 0,
        latencyMs: Date.now() - start,
        serverVersion: result.data?.["sap-server"]?.toString(),
        systemId: this.config.system === "SAP_S4HANA_CLOUD"
          ? undefined
          : (this.config as SAPConfig & { systemId?: string }).systemId,
        capabilities: this.capabilities,
        errors,
        warnings,
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        capabilities: this.capabilities,
        errors: [err instanceof Error ? err.message : String(err)],
        warnings,
      };
    }
  }

  async disconnect(): Promise<void> {
    this.odataClient = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSupportedDomains(): SyncDomain[] {
    return ["SOX_CONTROLS", "AML_KYC", "ACCESS_CONTROL", "AUDIT_TRAIL"];
  }

  // ---- SOX Controls ----

  async pullJournalEntries(
    params: PullParams
  ): Promise<PullResult<TransactionRecord>> {
    const start = Date.now();
    if (!this.odataClient) await this.connect();

    const filter = this.buildDateFilter(params, "PostingDate");
    const result = await this.odataClient!.getCollection(
      SAP_API_ENDPOINTS.JOURNAL_ENTRY.path,
      {
        $filter: filter,
        $top: String(params.limit || 1000),
        $skip: String(params.offset || 0),
        $expand: "to_JournalEntryItem",
        $inlinecount: "allpages",
      }
    );

    return {
      records: transformJournalEntries(result.data?.d?.results || []),
      totalCount: parseInt(result.data?.d?.__count || "0", 10),
      hasMore: (result.data?.d?.results?.length || 0) >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullPaymentRuns(
    params: PullParams
  ): Promise<PullResult<PaymentRecord>> {
    const start = Date.now();
    if (!this.odataClient) await this.connect();

    const filter = this.buildDateFilter(params, "PaymentDate");
    const result = await this.odataClient!.getCollection(
      SAP_API_ENDPOINTS.PAYMENT_RUN.path,
      {
        $filter: filter,
        $top: String(params.limit || 1000),
        $skip: String(params.offset || 0),
        $inlinecount: "allpages",
      }
    );

    return {
      records: transformPaymentRuns(result.data?.d?.results || []),
      totalCount: parseInt(result.data?.d?.__count || "0", 10),
      hasMore: (result.data?.d?.results?.length || 0) >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullSoDViolations(
    params: PullParams
  ): Promise<PullResult<SoDViolation>> {
    const start = Date.now();
    if (!this.odataClient) await this.connect();

    const filter = this.buildDateFilter(params, "DetectedAt");
    const result = await this.odataClient!.getCollection(
      SAP_API_ENDPOINTS.SOD_VIOLATIONS.path,
      {
        $filter: filter,
        $top: String(params.limit || 500),
        $skip: String(params.offset || 0),
      }
    );

    return {
      records: transformSoDViolations(result.data?.d?.results || []),
      totalCount: result.data?.d?.results?.length || 0,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  // ---- Access Control ----

  async pullUserAccess(
    params: PullParams
  ): Promise<PullResult<UserAccessRecord>> {
    const start = Date.now();
    if (!this.odataClient) await this.connect();

    const result = await this.odataClient!.getCollection(
      SAP_API_ENDPOINTS.USER_ACCESS.path,
      {
        $top: String(params.limit || 1000),
        $skip: String(params.offset || 0),
        $expand: "to_UserRoleAssignment",
        $inlinecount: "allpages",
      }
    );

    return {
      records: transformUserAccess(result.data?.d?.results || []),
      totalCount: parseInt(result.data?.d?.__count || "0", 10),
      hasMore: (result.data?.d?.results?.length || 0) >= (params.limit || 1000),
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  // ---- Audit Trail ----

  async pullChangeDocuments(
    params: PullParams
  ): Promise<PullResult<ChangeLogEntry>> {
    const start = Date.now();
    if (!this.odataClient) await this.connect();

    const filter = this.buildDateFilter(params, "ChangeDate");
    const result = await this.odataClient!.getCollection(
      SAP_API_ENDPOINTS.CHANGE_DOCUMENTS.path,
      {
        $filter: filter,
        $top: String(params.limit || 1000),
        $skip: String(params.offset || 0),
        $expand: "to_ChangeDocumentItem",
        $inlinecount: "allpages",
      }
    );

    return {
      records: transformChangeDocuments(result.data?.d?.results || []),
      totalCount: parseInt(result.data?.d?.__count || "0", 10),
      hasMore: (result.data?.d?.results?.length || 0) >= (params.limit || 1000),
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
    if (!this.odataClient) await this.connect();

    const dateFilter = this.buildDateFilter(params, "PaymentDate");
    const filter = `${dateFilter} and PaymentAmount ge ${params.threshold}`;

    const result = await this.odataClient!.getCollection(
      SAP_API_ENDPOINTS.BANK_PAYMENT.path,
      {
        $filter: filter,
        $top: String(params.limit || 500),
        $skip: String(params.offset || 0),
      }
    );

    return {
      records: transformSuspiciousTransactions(
        result.data?.d?.results || [],
        params.threshold
      ),
      totalCount: result.data?.d?.results?.length || 0,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  // ---- Helpers ----

  private buildDateFilter(params: PullParams, dateField: string): string {
    const from = params.dateFrom.toISOString().split("T")[0];
    const to = params.dateTo.toISOString().split("T")[0];
    let filter = `${dateField} ge datetime'${from}T00:00:00' and ${dateField} le datetime'${to}T23:59:59'`;
    if (params.companyCode) {
      filter += ` and CompanyCode eq '${params.companyCode}'`;
    }
    return filter;
  }
}
