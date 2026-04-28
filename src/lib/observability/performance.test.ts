import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isPerformanceLoggingEnabled,
  measureAsyncPerformance,
  measureSyncPerformance,
  recordPerformanceMetric,
} from "./performance";

describe("performance observability", () => {
  afterEach(() => {
    delete process.env.AFBM_PERFORMANCE_LOG;
    vi.restoreAllMocks();
  });

  it("stays silent unless the performance flag is enabled", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordPerformanceMetric({
      area: "simulation",
      durationMs: 12,
      operation: "season-week",
      status: "ok",
    });

    expect(isPerformanceLoggingEnabled()).toBe(false);
    expect(consoleInfo).not.toHaveBeenCalled();
  });

  it("logs rounded metrics with non-sensitive metadata when enabled", () => {
    process.env.AFBM_PERFORMANCE_LOG = "true";
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordPerformanceMetric({
      area: "firestore",
      durationMs: 12.345,
      metadata: {
        batchWrites: 8,
        operationScope: "match-output",
      },
      operation: "persist-match-output",
      status: "ok",
    });

    expect(isPerformanceLoggingEnabled()).toBe(true);
    expect(consoleInfo).toHaveBeenCalledWith(
      "[afbm:perf]",
      expect.stringContaining("\"durationMs\":12.35"),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "[afbm:perf]",
      expect.stringContaining("\"batchWrites\":8"),
    );
  });

  it("measures async and sync work without changing return values", async () => {
    process.env.AFBM_PERFORMANCE_LOG = "1";
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const asyncResult = await measureAsyncPerformance(
      {
        area: "firestore",
        operation: "readmodel",
        resultMetadata: (result) => ({
          rows: result.length,
        }),
      },
      async () => ["a", "b"],
    );
    const syncResult = measureSyncPerformance(
      {
        area: "simulation",
        operation: "generate-match-results",
      },
      () => 42,
    );

    expect(asyncResult).toEqual(["a", "b"]);
    expect(syncResult).toBe(42);
  });
});
