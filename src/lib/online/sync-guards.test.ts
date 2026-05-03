import { describe, expect, it, vi } from "vitest";

import {
  createCoalescedAsyncEmitter,
  createOrderedAsyncEmitter,
  hasSameDepthChartPayload,
  isSafeOnlineSyncId,
  toOnlineSyncError,
} from "./sync-guards";

describe("online sync guards", () => {
  it("accepts only route- and document-safe online ids", () => {
    expect(isSafeOnlineSyncId("global-test-league")).toBe(true);
    expect(isSafeOnlineSyncId("league_123")).toBe(true);
    expect(isSafeOnlineSyncId("")).toBe(false);
    expect(isSafeOnlineSyncId("ab")).toBe(false);
    expect(isSafeOnlineSyncId("league/other")).toBe(false);
    expect(isSafeOnlineSyncId("../admin")).toBe(false);
  });

  it("keeps only the newest async sync emission", async () => {
    const onNext = vi.fn();
    const emitter = createOrderedAsyncEmitter<string>(onNext);

    emitter.emit(() => Promise.resolve("stale"));
    emitter.emit(() => Promise.resolve("fresh"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith("fresh");
  });

  it("does not emit after close", async () => {
    const onNext = vi.fn();
    const emitter = createOrderedAsyncEmitter<string>(onNext);

    emitter.emit(() => Promise.resolve("late"));
    emitter.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onNext).not.toHaveBeenCalled();
  });

  it("coalesces bursty sync emissions into one latest load", async () => {
    vi.useFakeTimers();
    const onNext = vi.fn();
    const firstLoad = vi.fn(() => Promise.resolve("first"));
    const latestLoad = vi.fn(() => Promise.resolve("latest"));
    const emitter = createCoalescedAsyncEmitter<string>(onNext, undefined, undefined, 10);

    emitter.emit(firstLoad);
    emitter.emit(latestLoad);
    await vi.advanceTimersByTimeAsync(10);

    expect(firstLoad).not.toHaveBeenCalled();
    expect(latestLoad).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith("latest");

    emitter.close();
    vi.useRealTimers();
  });

  it("normalizes sync errors", () => {
    expect(toOnlineSyncError("Kaputt", "Fallback").message).toBe("Kaputt");
    expect(toOnlineSyncError(null, "Fallback").message).toBe("Fallback");
  });

  it("compares depth charts without updatedAt churn", () => {
    expect(
      hasSameDepthChartPayload(
        [
          {
            position: "QB",
            starterPlayerId: "qb-1",
            backupPlayerIds: ["qb-2"],
            updatedAt: "old",
          },
        ],
        [
          {
            position: "QB",
            starterPlayerId: "qb-1",
            backupPlayerIds: ["qb-2"],
            updatedAt: "new",
          },
        ],
      ),
    ).toBe(true);
  });
});
