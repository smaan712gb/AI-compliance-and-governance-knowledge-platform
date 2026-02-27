// Microsoft Dynamics 365 Finance & Operations — REST OData v4 HTTP client

import { D365_API_VERSION } from "./dynamics365-constants";

interface D365Response {
  data: Record<string, unknown> | null;
  error: string | null;
  statusCode: number;
}

export class D365Client {
  private baseUrl: string;
  private authHeader: string;
  private timeoutMs: number;
  private requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(
    baseUrl: string,
    authHeader: string,
    requestsPerMinute = 60,
    timeoutMs = 30000
  ) {
    // Ensure no trailing slash
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.authHeader = authHeader;
    this.requestsPerMinute = requestsPerMinute;
    this.timeoutMs = timeoutMs;
  }

  updateAuthHeader(authHeader: string): void {
    this.authHeader = authHeader;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60_000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > windowStart);

    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitMs = oldest + 60_000 - now + 50;
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    this.requestTimestamps.push(Date.now());
  }

  async get(path: string, params?: Record<string, string>): Promise<D365Response> {
    await this.throttle();

    const url = new URL(`${this.baseUrl}${path}`);
    // Always request JSON
    url.searchParams.set("cross-company", "true");
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
          Accept: "application/json;odata.metadata=minimal",
          "OData-MaxVersion": D365_API_VERSION,
          "OData-Version": D365_API_VERSION,
          "Prefer": "odata.maxpagesize=1000",
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
      return {
        data: null,
        error: err instanceof Error ? err.message : String(err),
        statusCode: 0,
      };
    }
  }

  async getCollection(
    path: string,
    params?: Record<string, string>
  ): Promise<D365Response> {
    return this.get(path, params);
  }
}
