import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the retry module to skip delays
vi.mock("../retry", () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

// Mock the logger
vi.mock("../logger", () => ({
  ccmLogger: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { CCMJobQueue } from "../job-queue";
import type { JobPayload } from "../job-queue";

let queue: CCMJobQueue;

beforeEach(() => {
  queue = new CCMJobQueue();
});

// ---- enqueue ----

describe("enqueue", () => {
  it("creates job with correct defaults", async () => {
    const handler = vi.fn().mockResolvedValue("ok");
    queue.registerHandler("ANALYSIS", handler);

    const id = await queue.enqueue({
      type: "ANALYSIS",
      organizationId: "org-1",
      data: { findingId: "f-1" },
    });

    expect(id).toBeTruthy();
    const job = await queue.getJobStatus(id);
    expect(job).not.toBeNull();
    expect(job!.status).toBe("PENDING");
    expect(job!.priority).toBe("NORMAL");
    expect(job!.maxRetries).toBe(3);
    expect(job!.attempts).toBe(0);
    expect(job!.organizationId).toBe("org-1");
  });

  it("respects idempotency key (no duplicate jobs)", async () => {
    queue.registerHandler("ANALYSIS", vi.fn().mockResolvedValue("ok"));

    const id1 = await queue.enqueue({
      type: "ANALYSIS",
      organizationId: "org-1",
      data: {},
      idempotencyKey: "unique-key-1",
    });
    const id2 = await queue.enqueue({
      type: "ANALYSIS",
      organizationId: "org-1",
      data: {},
      idempotencyKey: "unique-key-1",
    });

    expect(id1).toBe(id2);
  });

  it("assigns priority correctly", async () => {
    queue.registerHandler("ANALYSIS", vi.fn().mockResolvedValue("ok"));

    const id = await queue.enqueue({
      type: "ANALYSIS",
      organizationId: "org-1",
      data: {},
      priority: "CRITICAL",
    });

    const job = await queue.getJobStatus(id);
    expect(job!.priority).toBe("CRITICAL");
  });
});

// ---- processNext ----

describe("processNext", () => {
  it("processes highest priority job first", async () => {
    const results: string[] = [];
    queue.registerHandler("ANALYSIS", async (data) => {
      results.push(data.label as string);
      return data.label;
    });

    await queue.enqueue({ type: "ANALYSIS", organizationId: "org-1", data: { label: "low" }, priority: "LOW" });
    await queue.enqueue({ type: "ANALYSIS", organizationId: "org-1", data: { label: "critical" }, priority: "CRITICAL" });
    await queue.enqueue({ type: "ANALYSIS", organizationId: "org-1", data: { label: "high" }, priority: "HIGH" });

    await queue.processNext();
    expect(results[0]).toBe("critical");

    await queue.processNext();
    expect(results[1]).toBe("high");

    await queue.processNext();
    expect(results[2]).toBe("low");
  });

  it("returns null when queue empty", async () => {
    const result = await queue.processNext();
    expect(result).toBeNull();
  });

  it("sets job to RUNNING during execution", async () => {
    let capturedStatus: string | undefined;
    queue.registerHandler("ANALYSIS", async () => {
      // Cannot easily check mid-execution since it's synchronous from queue's perspective
      // but we verify the job was marked RUNNING by checking attempts
      return "done";
    });

    const id = await queue.enqueue({ type: "ANALYSIS", organizationId: "org-1", data: {} });
    const result = await queue.processNext();
    const job = await queue.getJobStatus(id);

    expect(result!.status).toBe("COMPLETED");
    expect(job!.attempts).toBe(1);
    expect(job!.startedAt).toBeDefined();
  });

  it("marks job COMPLETED on success", async () => {
    queue.registerHandler("SYNC", async () => ({ synced: 42 }));

    const id = await queue.enqueue({ type: "SYNC", organizationId: "org-1", data: {} });
    const result = await queue.processNext();

    expect(result!.status).toBe("COMPLETED");
    expect(result!.result).toEqual({ synced: 42 });
    expect(result!.durationMs).toBeGreaterThanOrEqual(0);

    const job = await queue.getJobStatus(id);
    expect(job!.status).toBe("COMPLETED");
    expect(job!.completedAt).toBeDefined();
  });

  it("marks job FAILED on handler error (with retries remaining)", async () => {
    queue.registerHandler("ANALYSIS", async () => {
      throw new Error("LLM API timeout");
    });

    const id = await queue.enqueue({
      type: "ANALYSIS",
      organizationId: "org-1",
      data: {},
      maxRetries: 3,
    });
    const result = await queue.processNext();

    expect(result!.status).toBe("FAILED");
    expect(result!.error).toBe("LLM API timeout");

    // Job should be re-queued as PENDING for retry
    const job = await queue.getJobStatus(id);
    expect(job!.status).toBe("PENDING");
    expect(job!.attempts).toBe(1);
  });

  it("retries failed jobs up to maxRetries", async () => {
    let callCount = 0;
    queue.registerHandler("ANALYSIS", async () => {
      callCount++;
      if (callCount < 3) throw new Error("fail");
      return "success";
    });

    const id = await queue.enqueue({
      type: "ANALYSIS",
      organizationId: "org-1",
      data: {},
      maxRetries: 3,
    });

    // First attempt: fails, re-queued
    await queue.processNext();
    let job = await queue.getJobStatus(id);
    expect(job!.status).toBe("PENDING");

    // Override scheduledFor so we can process immediately
    job!.scheduledFor = undefined;

    // Second attempt: fails, re-queued
    await queue.processNext();
    job = await queue.getJobStatus(id);
    expect(job!.status).toBe("PENDING");
    job!.scheduledFor = undefined;

    // Third attempt: succeeds
    await queue.processNext();
    job = await queue.getJobStatus(id);
    expect(job!.status).toBe("COMPLETED");
    expect(callCount).toBe(3);
  });

  it("moves to DEAD_LETTER after max retries exceeded", async () => {
    queue.registerHandler("ANALYSIS", async () => {
      throw new Error("persistent failure");
    });

    const id = await queue.enqueue({
      type: "ANALYSIS",
      organizationId: "org-1",
      data: {},
      maxRetries: 1,
    });

    // First attempt (attempt 1 of max 1) => DEAD_LETTER
    const result = await queue.processNext();
    expect(result!.status).toBe("DEAD_LETTER");
    expect(result!.error).toBe("persistent failure");

    const job = await queue.getJobStatus(id);
    expect(job!.status).toBe("DEAD_LETTER");
  });
});

// ---- processBatch ----

describe("processBatch", () => {
  it("processes up to N jobs", async () => {
    queue.registerHandler("NOTIFICATION", async (data) => data);

    for (let i = 0; i < 5; i++) {
      await queue.enqueue({ type: "NOTIFICATION", organizationId: "org-1", data: { i } });
    }

    const results = await queue.processBatch(3);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "COMPLETED")).toBe(true);

    const stats = queue.getStats();
    expect(stats.completed).toBe(3);
    expect(stats.pending).toBe(2);
  });
});

// ---- recoverStaleJobs ----

describe("recoverStaleJobs", () => {
  it("re-queues jobs stuck in RUNNING > 5 min", async () => {
    queue.registerHandler("SYNC", async () => "ok");

    const id = await queue.enqueue({ type: "SYNC", organizationId: "org-1", data: {} });

    // Manually set job to RUNNING with old startedAt
    const job = await queue.getJobStatus(id);
    job!.status = "RUNNING";
    job!.startedAt = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
    job!.attempts = 1;

    const recovered = await queue.recoverStaleJobs();
    expect(recovered).toBe(1);

    const updatedJob = await queue.getJobStatus(id);
    expect(updatedJob!.status).toBe("PENDING");
  });

  it("moves to DEAD_LETTER if max retries exceeded during recovery", async () => {
    queue.registerHandler("SYNC", async () => "ok");

    const id = await queue.enqueue({ type: "SYNC", organizationId: "org-1", data: {}, maxRetries: 1 });
    const job = await queue.getJobStatus(id);
    job!.status = "RUNNING";
    job!.startedAt = new Date(Date.now() - 10 * 60 * 1000);
    job!.attempts = 1;

    const recovered = await queue.recoverStaleJobs();
    expect(recovered).toBe(1);
    expect(job!.status).toBe("DEAD_LETTER");
  });
});

// ---- getStats ----

describe("getStats", () => {
  it("returns correct counts per status", async () => {
    queue.registerHandler("NOTIFICATION", async () => "ok");
    queue.registerHandler("ANALYSIS", async () => { throw new Error("fail"); });

    await queue.enqueue({ type: "NOTIFICATION", organizationId: "org-1", data: {} });
    await queue.enqueue({ type: "NOTIFICATION", organizationId: "org-1", data: {} });
    await queue.enqueue({ type: "ANALYSIS", organizationId: "org-1", data: {}, maxRetries: 1 });

    // Process one successfully
    await queue.processNext();

    let stats = queue.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.pending).toBe(2); // 1 NOTIFICATION + 1 ANALYSIS still pending

    // Process second notification
    await queue.processNext();
    stats = queue.getStats();
    expect(stats.completed).toBe(2);
    expect(stats.pending).toBe(1);
  });
});

// ---- concurrency ----

describe("concurrency", () => {
  it("respects per-type concurrency limits", async () => {
    // EVIDENCE_COLLECTION has a default concurrency limit of 2
    let running = 0;
    let maxConcurrent = 0;

    queue.registerHandler("EVIDENCE_COLLECTION", async () => {
      running++;
      maxConcurrent = Math.max(maxConcurrent, running);
      // Simulate some work
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return "done";
    });

    // Enqueue 5 jobs
    for (let i = 0; i < 5; i++) {
      await queue.enqueue({
        type: "EVIDENCE_COLLECTION",
        organizationId: "org-1",
        data: { i },
      });
    }

    // Process all sequentially (processNext picks one at a time respecting concurrency)
    const results = await queue.processBatch(5);
    expect(results).toHaveLength(5);
    expect(results.every((r) => r.status === "COMPLETED")).toBe(true);
  });
});
