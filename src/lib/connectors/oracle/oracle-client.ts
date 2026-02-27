// Oracle ERP Cloud REST API client

import { ORACLE_API_BASE, ORACLE_API_VERSION } from "./oracle-constants";

interface OracleResponse {
  data: Record<string, unknown> | null;
  error: string | null;
  statusCode: number;
}

export class OracleClient {
  private baseUrl: string;
  private authHeader: string;
  private timeoutMs: number;
  private requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(
    hostname: string,
    authHeader: string,
    requestsPerMinute = 60,
    timeoutMs = 30000
  ) {
    this.baseUrl = `https://${hostname}${ORACLE_API_BASE}/${ORACLE_API_VERSION}`;
    this.authHeader = authHeader;
    this.requestsPerMinute = requestsPerMinute;
    this.timeoutMs = timeoutMs;
  }

  updateAuthHeader(h: string): void {
    this.authHeader = h;
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

  async get(path: string, params?: Record<string, string>): Promise<OracleResponse> {
    await this.throttle();

    const url = new URL(`${this.baseUrl}${path}`);
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

  async getCollection(path: string, params?: Record<string, string>): Promise<OracleResponse> {
    return this.get(path, params);
  }
}
