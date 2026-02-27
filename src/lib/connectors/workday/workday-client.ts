// Workday REST API client with rate limiting

import { WORKDAY_API_VERSION } from "./workday-constants";

interface WorkdayResponse {
  data: Record<string, unknown> | null;
  error: string | null;
  statusCode: number;
}

export class WorkdayClient {
  private baseUrl: string;
  private authHeader: string;
  private tenantName: string;
  private timeoutMs: number;
  private requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(
    hostname: string,
    tenantName: string,
    authHeader: string,
    requestsPerMinute = 60,
    timeoutMs = 30000
  ) {
    this.baseUrl = `https://${hostname}/ccx/api`;
    this.tenantName = tenantName;
    this.authHeader = authHeader;
    this.requestsPerMinute = requestsPerMinute;
    this.timeoutMs = timeoutMs;
  }

  updateAuthHeader(authHeader: string): void {
    this.authHeader = authHeader;
  }

  private buildUrl(path: string, version = WORKDAY_API_VERSION): string {
    // Path pattern: /ccx/api/{version}/{tenant}{path}
    return `${this.baseUrl}/${version}/${encodeURIComponent(this.tenantName)}${path}`;
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

  async get(
    path: string,
    params?: Record<string, string>,
    version = WORKDAY_API_VERSION
  ): Promise<WorkdayResponse> {
    await this.throttle();

    const url = new URL(this.buildUrl(path, version));
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return {
          data: null,
          error: `HTTP ${response.status}: ${errText.slice(0, 200)}`,
          statusCode: response.status,
        };
      }

      const data = await response.json() as Record<string, unknown>;
      return { data, error: null, statusCode: response.status };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : String(err),
        statusCode: 0,
      };
    }
  }

  async getCollection(
    path: string,
    params?: Record<string, string>,
    version = WORKDAY_API_VERSION
  ): Promise<WorkdayResponse> {
    return this.get(path, params, version);
  }

  /** Simple connectivity probe — GET workers with limit=1 */
  async ping(): Promise<WorkdayResponse> {
    return this.get("/common/workers", { limit: "1" });
  }
}
