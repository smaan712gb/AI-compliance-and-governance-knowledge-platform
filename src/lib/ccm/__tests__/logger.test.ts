import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger, ccmLogger, sentinelLogger } from "../logger";

describe("Logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Default to production mode for JSON output tests
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "debug");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("outputs correct level names", () => {
    const logger = new Logger();

    logger.info("info msg");
    logger.warn("warn msg");
    logger.error("error msg");
    logger.debug("debug msg");

    const infoOutput = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(infoOutput.level).toBe("info");

    const warnOutput = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(warnOutput.level).toBe("warn");

    const errorOutput = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(errorOutput.level).toBe("error");

    const debugOutput = JSON.parse(logSpy.mock.calls[1][0] as string);
    expect(debugOutput.level).toBe("debug");
  });

  it("includes timestamp in ISO format", () => {
    const logger = new Logger();
    logger.info("test");

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.timestamp).toBeDefined();
    // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(output.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it("includes context fields (organizationId, module)", () => {
    const logger = new Logger({
      organizationId: "org-123",
      module: "ccm",
    });
    logger.info("with context");

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.organizationId).toBe("org-123");
    expect(output.module).toBe("ccm");
  });

  it("child() inherits parent context", () => {
    const parent = new Logger({ module: "ccm", organizationId: "org-1" });
    const child = parent.child({ userId: "user-42" });

    child.info("from child");

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.module).toBe("ccm");
    expect(output.organizationId).toBe("org-1");
    expect(output.userId).toBe("user-42");
  });

  it("child() can override parent context", () => {
    const parent = new Logger({ module: "ccm" });
    const child = parent.child({ module: "ccm-sync" });

    child.info("overridden");

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.module).toBe("ccm-sync");
  });

  it("error() serializes Error objects with stack trace", () => {
    const logger = new Logger();
    const err = new Error("something broke");

    logger.error("failure", err);

    const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(output.error).toBeDefined();
    expect(output.error.name).toBe("Error");
    expect(output.error.message).toBe("something broke");
    expect(output.error.stack).toBeDefined();
    expect(output.error.stack).toContain("something broke");
  });

  it("error() traverses error cause chain", () => {
    const logger = new Logger();
    const rootCause = new Error("root cause");
    const wrapper = new Error("wrapper", { cause: rootCause });

    logger.error("chained", wrapper);

    const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(output.error.cause).toBeDefined();
    expect(output.error.cause.message).toBe("root cause");
    expect(output.error.cause.name).toBe("Error");
  });

  it("time() returns elapsed milliseconds", () => {
    const logger = new Logger();

    const originalNow = performance.now;
    let callCount = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      callCount++;
      // First call is start, second is stop
      return callCount === 1 ? 1000 : 1150;
    });

    const stop = logger.time("db-query");
    const elapsed = stop();

    expect(elapsed).toBe(150);
    // Should have logged a completion message
    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.message).toBe("db-query completed");
    expect(output.data.durationMs).toBe(150);

    vi.spyOn(performance, "now").mockRestore();
  });

  it("in production mode, outputs single-line JSON", () => {
    const logger = new Logger({ module: "test" });
    logger.info("prod message", { key: "value" });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const raw = logSpy.mock.calls[0][0] as string;
    // Should be valid JSON and a single line
    expect(raw).not.toContain("\n");
    const parsed = JSON.parse(raw);
    expect(parsed.message).toBe("prod message");
    expect(parsed.data.key).toBe("value");
  });

  it("ccmLogger has correct module context", () => {
    ccmLogger.info("ccm log");

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.module).toBe("ccm");
  });

  it("sentinelLogger has correct module context", () => {
    sentinelLogger.info("sentinel log");

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.module).toBe("sentinel");
  });
});
