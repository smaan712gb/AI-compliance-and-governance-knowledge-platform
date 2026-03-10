// ============================================
// CCM — DB-Backed Persistent Job Queue
// Lightweight in-memory queue with priority ordering
// ============================================

import { withRetry } from "./retry";
import { ccmLogger } from "./logger";

export type JobType =
  | "ANALYSIS"
  | "SYNC"
  | "ESCALATION"
  | "NOTIFICATION"
  | "EVIDENCE_COLLECTION"
  | "REPORT"
  | "REMEDIATION";

export type JobPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";

const PRIORITY_ORDER: Record<JobPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

const DEFAULT_MAX_RETRIES = 3;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_CONCURRENCY_LIMITS: Record<JobType, number> = {
  ANALYSIS: 3,
  SYNC: 2,
  ESCALATION: 5,
  NOTIFICATION: 10,
  EVIDENCE_COLLECTION: 2,
  REPORT: 2,
  REMEDIATION: 3,
};

export interface JobPayload {
  type: JobType;
  priority?: JobPriority;
  organizationId: string;
  data: Record<string, unknown>;
  idempotencyKey?: string;
  maxRetries?: number;
  scheduledFor?: Date;
}

export interface JobResult {
  jobId: string;
  status: JobStatus;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface JobRecord {
  id: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  organizationId: string;
  data: Record<string, unknown>;
  idempotencyKey?: string;
  maxRetries: number;
  attempts: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  scheduledFor?: Date;
  durationMs?: number;
}

type JobHandler = (data: Record<string, unknown>) => Promise<unknown>;

export class CCMJobQueue {
  private handlers: Map<JobType, JobHandler> = new Map();
  private jobs: Map<string, JobRecord> = new Map();
  private processing: Set<string> = new Set();
  private concurrencyLimits: Map<JobType, number> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // key -> jobId

  private logger = ccmLogger.child({ module: "ccm:job-queue" });

  constructor() {
    // Set default concurrency limits
    for (const [type, limit] of Object.entries(DEFAULT_CONCURRENCY_LIMITS)) {
      this.concurrencyLimits.set(type as JobType, limit);
    }
  }

  /** Register a handler for a job type. */
  registerHandler(type: JobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
    this.logger.debug(`Handler registered for job type: ${type}`);
  }

  /** Enqueue a new job. Returns the job ID. */
  async enqueue(payload: JobPayload): Promise<string> {
    // Idempotency check
    if (payload.idempotencyKey) {
      const existingId = this.idempotencyIndex.get(payload.idempotencyKey);
      if (existingId) {
        const existing = this.jobs.get(existingId);
        if (
          existing &&
          existing.status !== "COMPLETED" &&
          existing.status !== "DEAD_LETTER"
        ) {
          this.logger.debug(
            `Duplicate job rejected (idempotency key: ${payload.idempotencyKey})`,
            { existingJobId: existingId },
          );
          return existingId;
        }
        // If completed or dead-lettered, allow re-enqueue
        this.idempotencyIndex.delete(payload.idempotencyKey);
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const record: JobRecord = {
      id,
      type: payload.type,
      priority: payload.priority ?? "NORMAL",
      status: "PENDING",
      organizationId: payload.organizationId,
      data: payload.data,
      idempotencyKey: payload.idempotencyKey,
      maxRetries: payload.maxRetries ?? DEFAULT_MAX_RETRIES,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      scheduledFor: payload.scheduledFor,
    };

    this.jobs.set(id, record);

    if (payload.idempotencyKey) {
      this.idempotencyIndex.set(payload.idempotencyKey, id);
    }

    this.logger.info(`Job enqueued`, {
      jobId: id,
      type: payload.type,
      priority: record.priority,
      organizationId: payload.organizationId,
    });

    return id;
  }

  /** Process the next highest-priority pending job. Returns null if none available. */
  async processNext(): Promise<JobResult | null> {
    const job = this.pickNextJob();
    if (!job) return null;
    return this.executeJob(job);
  }

  /** Process up to N jobs in priority order. */
  async processBatch(limit = 10): Promise<JobResult[]> {
    const results: JobResult[] = [];

    for (let i = 0; i < limit; i++) {
      const job = this.pickNextJob();
      if (!job) break;
      const result = await this.executeJob(job);
      results.push(result);
    }

    return results;
  }

  /** Re-queue jobs stuck in RUNNING state for more than 5 minutes. */
  async recoverStaleJobs(): Promise<number> {
    const now = Date.now();
    let recovered = 0;

    const allJobs = Array.from(this.jobs.values());
    for (const job of allJobs) {
      if (job.status !== "RUNNING") continue;
      if (!job.startedAt) continue;

      const elapsed = now - job.startedAt.getTime();
      if (elapsed > STALE_THRESHOLD_MS) {
        this.processing.delete(job.id);

        if (job.attempts >= job.maxRetries) {
          job.status = "DEAD_LETTER";
          job.error = `Stale job moved to dead letter after ${job.attempts} attempts`;
          this.logger.warn(`Stale job moved to dead letter`, { jobId: job.id, type: job.type });
        } else {
          job.status = "PENDING";
          this.logger.warn(`Stale job re-queued`, {
            jobId: job.id,
            type: job.type,
            elapsedMs: elapsed,
          });
        }

        job.updatedAt = new Date();
        recovered++;
      }
    }

    if (recovered > 0) {
      this.logger.info(`Recovered ${recovered} stale job(s)`);
    }

    return recovered;
  }

  /** Get queue statistics. */
  getStats(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    deadLetter: number;
  } {
    const stats = { pending: 0, running: 0, completed: 0, failed: 0, deadLetter: 0 };

    const statsJobs = Array.from(this.jobs.values());
    for (const job of statsJobs) {
      switch (job.status) {
        case "PENDING":
          stats.pending++;
          break;
        case "RUNNING":
          stats.running++;
          break;
        case "COMPLETED":
          stats.completed++;
          break;
        case "FAILED":
          stats.failed++;
          break;
        case "DEAD_LETTER":
          stats.deadLetter++;
          break;
      }
    }

    return stats;
  }

  /** Get the full record for a job by ID. */
  async getJobStatus(jobId: string): Promise<JobRecord | null> {
    return this.jobs.get(jobId) ?? null;
  }

  // ---- Internal ----

  /**
   * Pick the next eligible job: PENDING, not scheduled in the future,
   * and respecting concurrency limits per job type.
   */
  private pickNextJob(): JobRecord | null {
    const now = Date.now();
    const candidates: JobRecord[] = [];

    const jobIterator = Array.from(this.jobs.values());
    for (const job of jobIterator) {
      if (job.status !== "PENDING") continue;

      // Respect scheduled time
      if (job.scheduledFor && job.scheduledFor.getTime() > now) continue;

      // Check concurrency limit for this job type
      if (!this.canRunType(job.type)) continue;

      candidates.push(job);
    }

    if (candidates.length === 0) return null;

    // Sort by priority (lower number = higher priority), then by creation time
    candidates.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return candidates[0];
  }

  /** Check if we can run another job of this type without exceeding concurrency. */
  private canRunType(type: JobType): boolean {
    const limit = this.concurrencyLimits.get(type) ?? 5;
    let running = 0;
    const processingIds = Array.from(this.processing);
    for (const id of processingIds) {
      const job = this.jobs.get(id);
      if (job && job.type === type) running++;
    }
    return running < limit;
  }

  /** Execute a single job with retry logic. */
  private async executeJob(job: JobRecord): Promise<JobResult> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = "FAILED";
      job.error = `No handler registered for job type: ${job.type}`;
      job.updatedAt = new Date();
      this.logger.error(`No handler for job type`, undefined, {
        jobId: job.id,
        type: job.type,
      });
      return {
        jobId: job.id,
        status: "FAILED",
        error: job.error,
      };
    }

    // Mark as running
    job.status = "RUNNING";
    job.startedAt = new Date();
    job.attempts++;
    job.updatedAt = new Date();
    this.processing.add(job.id);

    const startTime = performance.now();

    try {
      const result = await withRetry(() => handler(job.data), {
        maxRetries: 0, // We handle retries at the queue level, not within a single execution
      });

      const durationMs = Math.round(performance.now() - startTime);

      job.status = "COMPLETED";
      job.result = result;
      job.completedAt = new Date();
      job.durationMs = durationMs;
      job.updatedAt = new Date();
      this.processing.delete(job.id);

      this.logger.info(`Job completed`, {
        jobId: job.id,
        type: job.type,
        durationMs,
      });

      return {
        jobId: job.id,
        status: "COMPLETED",
        result,
        durationMs,
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      this.processing.delete(job.id);

      if (job.attempts >= job.maxRetries) {
        // Exhausted retries — move to dead letter
        job.status = "DEAD_LETTER";
        job.error = errorMessage;
        job.durationMs = durationMs;
        job.updatedAt = new Date();

        this.logger.error(
          `Job moved to dead letter after ${job.attempts} attempt(s)`,
          err,
          { jobId: job.id, type: job.type },
        );

        return {
          jobId: job.id,
          status: "DEAD_LETTER",
          error: errorMessage,
          durationMs,
        };
      }

      // Re-queue for retry
      job.status = "PENDING";
      job.error = errorMessage;
      job.updatedAt = new Date();

      // Schedule retry with exponential backoff
      const backoffMs = 1000 * Math.pow(2, job.attempts - 1);
      const jitter = backoffMs * (0.7 + Math.random() * 0.6);
      job.scheduledFor = new Date(Date.now() + jitter);

      this.logger.warn(
        `Job failed, re-queued for retry (attempt ${job.attempts}/${job.maxRetries})`,
        {
          jobId: job.id,
          type: job.type,
          retryAfterMs: Math.round(jitter),
          error: errorMessage,
        },
      );

      return {
        jobId: job.id,
        status: "FAILED",
        error: errorMessage,
        durationMs,
      };
    }
  }
}

// ---- Global singleton ----
export const ccmJobQueue = new CCMJobQueue();
