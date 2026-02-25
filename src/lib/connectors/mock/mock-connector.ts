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
import type { ConnectorConfig, MockConnectorConfig } from "../config-schema";
import {
  generateMockJournalEntries,
  generateMockPaymentRuns,
  generateMockUserAccess,
  generateMockChangeDocuments,
  generateMockSoDViolations,
  generateMockSuspiciousTransactions,
} from "./mock-data";

export class MockConnector implements ERPConnector {
  readonly connectorType: ERPType = "MOCK";
  readonly displayName = "Demo / Mock Connector";
  readonly capabilities: ConnectorCapability[] = [
    "odata_v4",
    "rest_api",
    "batch_api",
  ];

  private config: MockConnectorConfig;
  private connected = false;

  constructor(rawConfig: ConnectorConfig) {
    this.config = rawConfig as MockConnectorConfig;
  }

  private async simulateLatency(): Promise<void> {
    const min = this.config.latencyMinMs ?? 50;
    const max = this.config.latencyMaxMs ?? 500;
    const delay = min + Math.random() * (max - min);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private shouldFail(): boolean {
    return Math.random() < (this.config.failureRate ?? 0);
  }

  async connect(): Promise<boolean> {
    await this.simulateLatency();
    if (this.shouldFail()) return false;
    this.connected = true;
    return true;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    await this.simulateLatency();

    if (this.shouldFail()) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        capabilities: this.capabilities,
        errors: ["Simulated connection failure"],
        warnings: [],
      };
    }

    return {
      success: true,
      latencyMs: Date.now() - start,
      serverVersion: "Mock ERP v1.0",
      systemId: "MCK",
      clientId: "100",
      authenticatedUser: "DEMO_USER",
      capabilities: this.capabilities,
      errors: [],
      warnings: ["This is a mock connector for demonstration purposes."],
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSupportedDomains(): SyncDomain[] {
    return ["SOX_CONTROLS", "AML_KYC", "ACCESS_CONTROL", "AUDIT_TRAIL"];
  }

  async pullJournalEntries(
    params: PullParams
  ): Promise<PullResult<TransactionRecord>> {
    const start = Date.now();
    await this.simulateLatency();
    const records = generateMockJournalEntries(
      params.dateFrom,
      params.dateTo,
      this.config.recordsPerPull ?? 100,
      this.config.seed
    );
    return {
      records,
      totalCount: records.length,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullPaymentRuns(
    params: PullParams
  ): Promise<PullResult<PaymentRecord>> {
    const start = Date.now();
    await this.simulateLatency();
    const records = generateMockPaymentRuns(
      params.dateFrom,
      params.dateTo,
      Math.min(this.config.recordsPerPull ?? 100, 50),
      this.config.seed
    );
    return {
      records,
      totalCount: records.length,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullSoDViolations(
    params: PullParams
  ): Promise<PullResult<SoDViolation>> {
    const start = Date.now();
    await this.simulateLatency();
    const records = generateMockSoDViolations(
      Math.min(this.config.recordsPerPull ?? 100, 30),
      this.config.seed
    );
    return {
      records,
      totalCount: records.length,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullUserAccess(
    params: PullParams
  ): Promise<PullResult<UserAccessRecord>> {
    const start = Date.now();
    await this.simulateLatency();
    const records = generateMockUserAccess(
      Math.min(this.config.recordsPerPull ?? 100, 50),
      this.config.seed
    );
    return {
      records,
      totalCount: records.length,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullChangeDocuments(
    params: PullParams
  ): Promise<PullResult<ChangeLogEntry>> {
    const start = Date.now();
    await this.simulateLatency();
    const records = generateMockChangeDocuments(
      params.dateFrom,
      params.dateTo,
      this.config.recordsPerPull ?? 100,
      this.config.seed
    );
    return {
      records,
      totalCount: records.length,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }

  async pullHighValueTransactions(
    params: PullParams & { threshold: number }
  ): Promise<PullResult<SuspiciousTransaction>> {
    const start = Date.now();
    await this.simulateLatency();
    const records = generateMockSuspiciousTransactions(
      Math.min(this.config.recordsPerPull ?? 100, 20),
      params.threshold,
      this.config.seed
    );
    return {
      records,
      totalCount: records.length,
      hasMore: false,
      pulledAt: new Date(),
      durationMs: Date.now() - start,
      apiCallCount: 1,
    };
  }
}
