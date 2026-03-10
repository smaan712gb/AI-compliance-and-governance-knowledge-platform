import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withRetry,
  isTransientError,
  CircuitBreaker,
  CircuitOpenError,
} from "../retry";

describe("isTransientError", () => {
  it("returns true for 5xx status codes", () => {
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 502 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ status: 504 })).toBe(true);
  });

  it("returns false for 4xx status codes (except 429)", () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ status: 401 })).toBe(false);
    expect(isTransientError({ status: 403 })).toBe(false);
    expect(isTransientError({ status: 404 })).toBe(false);
    expect(isTransientError({ status: 422 })).toBe(false);
  });

  it("returns true for 429 (rate limit)", () => {
    expect(isTransientError({ status: 429 })).toBe(true);
  });

  it("returns true for network error codes", () => {
    expect(isTransientError({ code: "ECONNRESET" })).toBe(true);
    expect(isTransientError({ code: "ETIMEDOUT" })).toBe(true);
    expect(isTransientError({ code: "ENOTFOUND" })).toBe(true);
    expect(isTransientError({ code: "ECONNREFUSED" })).toBe(true);
  });

  it("returns true for timeout/network message patterns", () => {
    expect(isTransientError(new Error("Request timeout"))).toBe(true);
    expect(isTransientError(new Error("network error occurred"))).toBe(true);
    expect(isTransientError(new Error("fetch failed"))).toBe(true);
  });

  it("returns false for null/undefined", () => {
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("succeeds on first attempt without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const promise = withRetry(fn);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient errors and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 502 })
      .mockResolvedValue("recovered");

    const promise = withRetry(fn, { baseDelayMs: 100, maxDelayMs: 1000 });

    // Advance past first retry delay
    await vi.advanceTimersByTimeAsync(2000);
    // Advance past second retry delay
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on 4xx errors", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400 });

    await expect(withRetry(fn)).rejects.toEqual({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 rate limit errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { baseDelayMs: 100, maxDelayMs: 500 });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects maxRetries limit", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 500 });

    const promise = withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
    }).catch((e) => e);

    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result).toEqual({ status: 500 });
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff with jitter", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // jitter factor = 1.0

    const delays: number[] = [];
    const fn = vi.fn().mockRejectedValue({ status: 500 });

    const promise = withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 10000,
      onRetry: (_attempt, _error, delayMs) => {
        delays.push(delayMs);
      },
    }).catch((e) => e);

    await vi.advanceTimersByTimeAsync(50000);
    const result = await promise;
    expect(result).toEqual({ status: 500 });

    // With random=0.5, jitter factor=1.0, delays should be: 100, 200, 400
    expect(delays).toHaveLength(3);
    expect(delays[0]).toBe(100); // 100 * 2^0 * 1.0
    expect(delays[1]).toBe(200); // 100 * 2^1 * 1.0
    expect(delays[2]).toBe(400); // 100 * 2^2 * 1.0

    vi.spyOn(Math, "random").mockRestore();
  });

  it("calls onRetry callback with correct arguments", async () => {
    const onRetry = vi.fn();
    const error503 = { status: 503 };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error503)
      .mockResolvedValue("ok");

    const promise = withRetry(fn, {
      baseDelayMs: 100,
      maxDelayMs: 1000,
      onRetry,
    });
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, error503, expect.any(Number));
    // delay should be a positive number
    expect(onRetry.mock.calls[0][2]).toBeGreaterThan(0);
  });
});

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in closed state", () => {
    const cb = new CircuitBreaker("test");
    expect(cb.getState()).toBe("closed");
  });

  it("opens after failure threshold is reached", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 3 });

    for (let i = 0; i < 3; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow("fail");
    }

    expect(cb.getState()).toBe("open");
  });

  it("rejects calls when open with CircuitOpenError", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 2 });

    // Trip the breaker
    for (let i = 0; i < 2; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();
    }

    expect(cb.getState()).toBe("open");

    await expect(
      cb.execute(() => Promise.resolve("should not run"))
    ).rejects.toThrow(CircuitOpenError);
  });

  it("transitions to half-open after reset time", async () => {
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      resetTimeMs: 5000,
    });

    for (let i = 0; i < 2; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();
    }
    expect(cb.getState()).toBe("open");

    // Advance past reset time
    vi.advanceTimersByTime(6000);

    expect(cb.getState()).toBe("half-open");
  });

  it("closes on successful half-open call", async () => {
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      resetTimeMs: 1000,
    });

    // Open it
    for (let i = 0; i < 2; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();
    }

    // Wait for half-open
    vi.advanceTimersByTime(1500);
    expect(cb.getState()).toBe("half-open");

    // Successful probe
    const result = await cb.execute(() => Promise.resolve("recovered"));
    expect(result).toBe("recovered");
    expect(cb.getState()).toBe("closed");
  });

  it("re-opens on failed half-open call", async () => {
    const cb = new CircuitBreaker("test", {
      failureThreshold: 2,
      resetTimeMs: 1000,
    });

    // Open it
    for (let i = 0; i < 2; i++) {
      await expect(
        cb.execute(() => Promise.reject(new Error("fail")))
      ).rejects.toThrow();
    }

    // Wait for half-open
    vi.advanceTimersByTime(1500);
    expect(cb.getState()).toBe("half-open");

    // Failed probe
    await expect(
      cb.execute(() => Promise.reject(new Error("still failing")))
    ).rejects.toThrow();

    expect(cb.getState()).toBe("open");
  });

  it("getStats returns correct metrics", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 5 });

    // 2 successes
    await cb.execute(() => Promise.resolve("a"));
    await cb.execute(() => Promise.resolve("b"));

    // 1 failure
    await expect(
      cb.execute(() => Promise.reject(new Error("oops")))
    ).rejects.toThrow();

    const stats = cb.getStats();
    expect(stats.successes).toBe(2);
    expect(stats.failures).toBe(1);
    expect(stats.state).toBe("closed");
    expect(stats.lastFailure).toBeInstanceOf(Date);
  });
});
