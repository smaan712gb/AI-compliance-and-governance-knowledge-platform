// ============================================
// CCM — Structured Logging
// JSON output in production, pretty-printed in development
// ============================================

export interface LogContext {
  organizationId?: string;
  userId?: string;
  requestId?: string;
  module?: string;
  [key: string]: unknown;
}

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[35m", // magenta
};

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVEL_PRIORITY) return env as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Serialize an error into a structured object with cause chain. */
function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error == null) return undefined;

  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    // Walk the cause chain
    if ("cause" in error && error.cause) {
      serialized.cause = serializeError(error.cause);
    }

    // Capture any extra enumerable properties (e.g., status, code)
    for (const key of Object.keys(error)) {
      if (!(key in serialized)) {
        serialized[key] = (error as unknown as Record<string, unknown>)[key];
      }
    }

    return serialized;
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { raw: String(error) };
}

export class Logger {
  private readonly context: LogContext;

  constructor(context?: LogContext) {
    this.context = context ?? {};
  }

  /**
   * Create a child logger that inherits this logger's context
   * and merges additional context on top.
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, undefined, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, undefined, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, undefined, data);
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    this.log("error", message, error, data);
  }

  fatal(message: string, error?: unknown, data?: Record<string, unknown>): void {
    this.log("fatal", message, error, data);
  }

  /**
   * Start a performance timer. Returns a stop function that logs the
   * elapsed time and returns the duration in milliseconds.
   */
  time(label: string): () => number {
    const start = performance.now();
    return () => {
      const elapsed = Math.round((performance.now() - start) * 100) / 100;
      this.info(`${label} completed`, { durationMs: elapsed });
      return elapsed;
    };
  }

  // ---- Internal ----

  private log(
    level: LogLevel,
    message: string,
    error?: unknown,
    data?: Record<string, unknown>,
  ): void {
    const minLevel = getMinLevel();
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) return;

    const timestamp = new Date().toISOString();
    const errorData = serializeError(error);

    if (isProduction()) {
      this.logJson(level, timestamp, message, errorData, data);
    } else {
      this.logPretty(level, timestamp, message, errorData, data);
    }
  }

  /** Single-line JSON output (production — Railway captures stdout). */
  private logJson(
    level: LogLevel,
    timestamp: string,
    message: string,
    error?: Record<string, unknown>,
    data?: Record<string, unknown>,
  ): void {
    const entry: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...this.context,
    };

    if (data && Object.keys(data).length > 0) {
      entry.data = data;
    }

    if (error) {
      entry.error = error;
    }

    const output = JSON.stringify(entry);

    if (level === "error" || level === "fatal") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  /** Colored human-readable output (development). */
  private logPretty(
    level: LogLevel,
    timestamp: string,
    message: string,
    error?: Record<string, unknown>,
    data?: Record<string, unknown>,
  ): void {
    const color = LOG_LEVEL_COLORS[level];
    const levelTag = `${color}${BOLD}${level.toUpperCase().padEnd(5)}${RESET}`;
    const timeStr = `${DIM}${timestamp}${RESET}`;

    // Context tags
    const contextParts: string[] = [];
    if (this.context.module) {
      contextParts.push(`${DIM}[${this.context.module}]${RESET}`);
    }
    if (this.context.organizationId) {
      contextParts.push(`${DIM}org:${this.context.organizationId}${RESET}`);
    }
    if (this.context.userId) {
      contextParts.push(`${DIM}user:${this.context.userId}${RESET}`);
    }
    if (this.context.requestId) {
      contextParts.push(`${DIM}req:${this.context.requestId}${RESET}`);
    }

    const contextStr = contextParts.length > 0 ? ` ${contextParts.join(" ")}` : "";

    let line = `${timeStr} ${levelTag}${contextStr} ${message}`;

    if (data && Object.keys(data).length > 0) {
      line += ` ${DIM}${JSON.stringify(data)}${RESET}`;
    }

    if (level === "error" || level === "fatal") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }

    // Print error details on separate lines
    if (error) {
      const errorColor = LOG_LEVEL_COLORS.error;
      if (error.name || error.message) {
        console.error(
          `  ${errorColor}${error.name ?? "Error"}: ${error.message}${RESET}`,
        );
      }
      if (error.stack && typeof error.stack === "string") {
        const stackLines = error.stack.split("\n").slice(1); // Skip first line (already printed)
        for (const stackLine of stackLines) {
          console.error(`  ${DIM}${stackLine.trim()}${RESET}`);
        }
      }
      if (error.cause) {
        console.error(
          `  ${DIM}Caused by: ${JSON.stringify(error.cause)}${RESET}`,
        );
      }
    }
  }
}

// ---- Pre-configured module loggers ----

export const ccmLogger = new Logger({ module: "ccm" });
export const sentinelLogger = new Logger({ module: "sentinel" });
