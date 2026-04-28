import { performance } from "node:perf_hooks";

type PerformanceArea = "firestore" | "simulation";

type PerformanceMetric = {
  area: PerformanceArea;
  operation: string;
  durationMs: number;
  status?: "ok" | "error";
  metadata?: Record<string, number | string | boolean | null>;
};

type MeasurePerformanceInput<TResult> = {
  area: PerformanceArea;
  operation: string;
  metadata?: Record<string, number | string | boolean | null>;
  resultMetadata?: (result: TResult) => Record<string, number | string | boolean | null>;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function isPerformanceLoggingEnabled() {
  return TRUE_VALUES.has((process.env.AFBM_PERFORMANCE_LOG ?? "").toLowerCase());
}

export function recordPerformanceMetric(metric: PerformanceMetric) {
  if (!isPerformanceLoggingEnabled()) {
    return;
  }

  console.info("[afbm:perf]", JSON.stringify({
    ...metric,
    durationMs: Math.round(metric.durationMs * 100) / 100,
  }));
}

export async function measureAsyncPerformance<TResult>(
  input: MeasurePerformanceInput<TResult>,
  run: () => Promise<TResult>,
) {
  const startedAt = performance.now();

  try {
    const result = await run();
    recordPerformanceMetric({
      area: input.area,
      durationMs: performance.now() - startedAt,
      metadata: {
        ...input.metadata,
        ...input.resultMetadata?.(result),
      },
      operation: input.operation,
      status: "ok",
    });
    return result;
  } catch (error) {
    recordPerformanceMetric({
      area: input.area,
      durationMs: performance.now() - startedAt,
      metadata: {
        ...input.metadata,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
      operation: input.operation,
      status: "error",
    });
    throw error;
  }
}

export function measureSyncPerformance<TResult>(
  input: MeasurePerformanceInput<TResult>,
  run: () => TResult,
) {
  const startedAt = performance.now();

  try {
    const result = run();
    recordPerformanceMetric({
      area: input.area,
      durationMs: performance.now() - startedAt,
      metadata: {
        ...input.metadata,
        ...input.resultMetadata?.(result),
      },
      operation: input.operation,
      status: "ok",
    });
    return result;
  } catch (error) {
    recordPerformanceMetric({
      area: input.area,
      durationMs: performance.now() - startedAt,
      metadata: {
        ...input.metadata,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
      operation: input.operation,
      status: "error",
    });
    throw error;
  }
}
