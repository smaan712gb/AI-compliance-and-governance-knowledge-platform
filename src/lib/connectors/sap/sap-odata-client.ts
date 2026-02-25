/**
 * Simple OData V4 HTTP client with rate limiting for SAP APIs.
 */
export class SAPODataClient {
  private baseUrl: string;
  private authHeader: string;
  private requestsPerMinute: number;
  private timeoutMs: number;
  private requestTimestamps: number[] = [];

  constructor(
    baseUrl: string,
    authHeader: string,
    requestsPerMinute: number,
    timeoutMs: number
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.authHeader = authHeader;
    this.requestsPerMinute = requestsPerMinute;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Rate limiter — waits if we've exceeded requests per minute.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => now - t < 60000
    );

    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitMs = 60000 - (now - oldest) + 100;
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    this.requestTimestamps.push(Date.now());
  }

  /**
   * GET request to an OData endpoint.
   */
  async get(
    path: string,
    queryParams?: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ data: any; error?: string }> {
    await this.throttle();

    const url = new URL(`${this.baseUrl}${path}`);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.timeoutMs
      );

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
          "sap-client": "100",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        return {
          data: null,
          error: `SAP API error ${response.status}: ${text.slice(0, 500)}`,
        };
      }

      const data = await response.json();
      return { data };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { data: null, error: `Request timed out after ${this.timeoutMs}ms` };
      }
      return {
        data: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * GET a collection of entities (OData entity set).
   */
  async getCollection(
    entitySetPath: string,
    queryParams?: Record<string, string>
  ) {
    return this.get(entitySetPath, queryParams);
  }

  /**
   * POST request (for function imports or creating entities).
   */
  async post(
    path: string,
    body: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ data: any; error?: string }> {
    await this.throttle();

    const url = `${this.baseUrl}${path}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.timeoutMs
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
          "sap-client": "100",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        return {
          data: null,
          error: `SAP API error ${response.status}: ${text.slice(0, 500)}`,
        };
      }

      const data = await response.json();
      return { data };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { data: null, error: `Request timed out after ${this.timeoutMs}ms` };
      }
      return {
        data: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
