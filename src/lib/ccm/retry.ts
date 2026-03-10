// ============================================
// CCM — Exponential Backoff with Jitter + Circuit Breaker
// Production-grade retry utility for LLM API calls and external services
// ============================================

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
]);
const TRANSIENT_MESSAGE_PATTERNS = ["timeout", "network", "fetch failed"];

/** Check whether an error is transient (retriable). */
export function isTransientError(error: unknown): boolean {
  if (error == null) return false;

  // Check HTTP status codes
  if (typeof error === "object") {
    const status =
      (error as Record<string, unknown>).status ??
      (error as Record<string, unknown>).statusCode;
    if (typeof status === "number") {
      // Don't retry 4xx client errors, except 429 (rate limit)
      if (status >= 400 && status < 500 && status !== 429) return false;
      if (TRANSIENT_STATUS_CODES.has(status)) return true;
    }

    // Check Node.js error codes
    const code = (error as Record<string, unknown>).code;
    if (typeof code === "string" && TRANSIENT_ERROR_CODES.has(code)) return true;
  }

  // Check error message
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);

  const lowerMessage = message.toLowerCase();
  for (const pattern of TRANSIENT_MESSAGE_PATTERNS) {
    if (lowerMessage.includes(pattern)) return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Calculate delay with exponential backoff and +-30% jitter. */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxDelayMs);
  // Apply +-30% jitter
  const jitterFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
  return Math.round(capped * jitterFactor);
}

/**
 * Execute an async function with exponential backoff retry.
 *
 * Defaults: 3 retries, 1s base delay, 30s max delay.
 * Only retries on transient errors (5xx, 429, timeout, network).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 30000;
  const retryOn = options?.retryOn ?? isTransientError;
  const onRetry = options?.onRetry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or non-transient errors
      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }

      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs);
      onRetry?.(attempt + 1, error, delayMs);
      await sleep(delayMs);
    }
  }

  // Unreachable, but TypeScript needs it
  throw lastError;
}

// ---- Circuit Breaker ----

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeMs?: number;
  halfOpenMaxCalls?: number;
}

interface FailureRecord {
  timestamp: number;
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeMs: number;
  private readonly halfOpenMaxCalls: number;

  private state: CircuitState = "closed";
  private failures: FailureRecord[] = [];
  private successes = 0;
  private lastFailure: Date | null = null;
  private openedAt: number | null = null;
  private halfOpenCalls = 0;

  constructor(name: string, options?: CircuitBreakerOptions) {
    this.name = name;
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeMs = options?.resetTimeMs ?? 30000;
    this.halfOpenMaxCalls = options?.halfOpenMaxCalls ?? 1;
  }

  getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  getStats(): {
    failures: number;
    successes: number;
    state: string;
    lastFailure: Date | null;
  } {
    this.evaluateState();
    return {
      failures: this.failures.length,
      successes: this.successes,
      state: this.state,
      lastFailure: this.lastFailure,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === "open") {
      throw new CircuitOpenError(
        `Circuit breaker "${this.name}" is OPEN. Retry after ${this.resetTimeMs}ms.`,
      );
    }

    if (this.state === "half-open" && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new CircuitOpenError(
        `Circuit breaker "${this.name}" is HALF-OPEN with max probe calls reached.`,
      );
    }

    if (this.state === "half-open") {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** Transition state based on timing. */
  private evaluateState(): void {
    if (this.state === "open" && this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.resetTimeMs) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
      }
    }
  }

  private onSuccess(): void {
    this.successes++;
    if (this.state === "half-open") {
      // Successful probe — close the circuit
      this.state = "closed";
      this.failures = [];
      this.openedAt = null;
      this.halfOpenCalls = 0;
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.lastFailure = new Date(now);
    this.failures.push({ timestamp: now });

    // Prune failures older than 60s
    const windowStart = now - 60000;
    this.failures = this.failures.filter((f) => f.timestamp >= windowStart);

    if (this.state === "half-open") {
      // Probe failed — re-open
      this.state = "open";
      this.openedAt = now;
      this.halfOpenCalls = 0;
      return;
    }

    if (this.failures.length >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = now;
      this.halfOpenCalls = 0;
    }
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}
