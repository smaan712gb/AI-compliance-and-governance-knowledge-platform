// Oracle NetSuite REST Record API + SuiteQL client

import type { NetSuiteConfig } from "../config-schema";
import { buildNetSuiteAuthHeader } from "./netsuite-auth";
import { NETSUITE_QUERY_API } from "./netsuite-constants";

interface NetSuiteResponse {
  data: Record<string, unknown> | null;
  error: string | null;
  statusCode: number;
}

export class NetSuiteClient {
  private baseUrl: string;
  private config: NetSuiteConfig;
  private timeoutMs: number;
  private requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(config: NetSuiteConfig) {
    // NetSuite account ID must be formatted as lowercase with hyphens for API URLs
    const accountId = config.accountId.toLowerCase().replace(/_/g, "-");
    this.baseUrl = `https://${accountId}.suitetalk.api.netsuite.com`;
    this.config = config;
    this.requestsPerMinute = config.requestsPerMinute ?? 60;
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > now - 60_000);
    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitMs = oldest + 60_000 - now + 50;
      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    }
    this.requestTimestamps.push(Date.now());
  }

  async get(path: string, params?: Record<string, string>): Promise<NetSuiteResponse> {
    await this.throttle();

    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const fullUrl = url.toString();
    const authHeader = buildNetSuiteAuthHeader(this.config, "GET", fullUrl);

    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
          Prefer: "transient",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return { data: null, error: `HTTP ${response.status}: ${errText.slice(0, 200)}`, statusCode: response.status };
      }

      const data = await response.json() as Record<string, unknown>;
      return { data, error: null, statusCode: response.status };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : String(err), statusCode: 0 };
    }
  }

  /** Execute a SuiteQL query via POST /services/rest/query/v1/suiteql */
  async suiteql(query: string, offset = 0, limit = 1000): Promise<NetSuiteResponse> {
    await this.throttle();

    const path = `${NETSUITE_QUERY_API}/suiteql`;
    const fullUrl = `${this.baseUrl}${path}?limit=${limit}&offset=${offset}`;
    const authHeader = buildNetSuiteAuthHeader(this.config, "POST", fullUrl);

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
          Prefer: "transient",
        },
        body: JSON.stringify({ q: query }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return { data: null, error: `HTTP ${response.status}: ${errText.slice(0, 200)}`, statusCode: response.status };
      }

      const data = await response.json() as Record<string, unknown>;
      return { data, error: null, statusCode: response.status };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : String(err), statusCode: 0 };
    }
  }

  async ping(): Promise<NetSuiteResponse> {
    return this.get("/services/rest/record/v1/subsidiary", { limit: "1" });
  }
}
