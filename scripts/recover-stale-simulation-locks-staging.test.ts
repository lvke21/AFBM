import { describe, expect, it } from "vitest";

import {
  applySimulationLockRecoveryPlanToRecords,
  buildSimulationLockRecoveryPlan,
  evaluateSimulationLockRecovery,
  requireStagingRecoveryEnvironment,
  type SimulationLockRecoveryCandidate,
  type SimulationLockRecoveryLeague,
} from "./recover-stale-simulation-locks-staging";

const NOW_MS = Date.parse("2026-05-03T12:20:00.000Z");
const THRESHOLD_MS = 10 * 60 * 1000;

function league(overrides: Partial<SimulationLockRecoveryLeague> = {}): SimulationLockRecoveryLeague {
  return {
    currentSeason: 1,
    id: "league-alpha",
    matchResults: [],
    ...overrides,
  };
}

function lock(
  id: string,
  overrides: Partial<SimulationLockRecoveryCandidate["data"]> = {},
): SimulationLockRecoveryCandidate {
  return {
    id,
    data: {
      season: 1,
      simulationAttemptId: `${id}-attempt`,
      startedAt: "2026-05-03T12:00:00.000Z",
      status: "simulating",
      updatedAt: "2026-05-03T12:00:00.000Z",
      week: 2,
      ...overrides,
    },
  };
}

describe("staging simulation lock recovery", () => {
  it("requires an explicitly confirmed staging environment", () => {
    expect(() =>
      requireStagingRecoveryEnvironment({
        CONFIRM_STAGING_RECOVERY: "true",
        GOOGLE_CLOUD_PROJECT: "afbm-staging",
      }),
    ).not.toThrow();
    expect(() =>
      requireStagingRecoveryEnvironment({
        CONFIRM_STAGING_RECOVERY: "true",
        GOOGLE_CLOUD_PROJECT: "prod-afbm",
      }),
    ).toThrow(/afbm-staging/);
    expect(() =>
      requireStagingRecoveryEnvironment({
        GOOGLE_CLOUD_PROJECT: "afbm-staging",
      }),
    ).toThrow(/CONFIRM_STAGING_RECOVERY=true/);
    expect(() =>
      requireStagingRecoveryEnvironment({
        CONFIRM_STAGING_RECOVERY: "true",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        GOOGLE_CLOUD_PROJECT: "afbm-staging",
      }),
    ).toThrow(/refuses emulator/);
  });

  it("marks stale simulating locks without matching results as safe to fail", () => {
    const decision = evaluateSimulationLockRecovery({
      league: league(),
      lock: lock("stale-lock"),
      nowMs: NOW_MS,
      thresholdMs: THRESHOLD_MS,
    });

    expect(decision).toMatchObject({
      action: "mark_failed",
      leagueId: "league-alpha",
      lockId: "stale-lock",
      reason: "stale-simulating-lock-without-results",
      weekKey: "s1-w2",
    });
    expect(decision.ageMs).toBe(20 * 60 * 1000);
  });

  it("skips fresh, simulated and result-backed locks", () => {
    expect(
      evaluateSimulationLockRecovery({
        league: league(),
        lock: lock("fresh-lock", { updatedAt: "2026-05-03T12:15:00.000Z" }),
        nowMs: NOW_MS,
        thresholdMs: THRESHOLD_MS,
      }),
    ).toMatchObject({ action: "skip", reason: "not-stale" });
    expect(
      evaluateSimulationLockRecovery({
        league: league(),
        lock: lock("simulated-lock", { status: "simulated" }),
        nowMs: NOW_MS,
        thresholdMs: THRESHOLD_MS,
      }),
    ).toMatchObject({ action: "skip", reason: "status=simulated" });
    expect(
      evaluateSimulationLockRecovery({
        league: league({
          matchResults: [{ matchId: "game-2", season: 1, week: 2 }],
        }),
        lock: lock("result-backed-lock"),
        nowMs: NOW_MS,
        thresholdMs: THRESHOLD_MS,
      }),
    ).toMatchObject({ action: "skip", reason: "matching-results-exist" });
  });

  it("builds a mixed recovery plan across leagues", () => {
    const locksByLeagueId = new Map<string, SimulationLockRecoveryCandidate[]>([
      ["league-alpha", [lock("safe-lock"), lock("done-lock", { status: "simulated" })]],
      ["league-beta", [lock("fresh-lock", { updatedAt: "2026-05-03T12:15:00.000Z" })]],
    ]);
    const plan = buildSimulationLockRecoveryPlan({
      leagues: [league(), league({ id: "league-beta" })],
      locksByLeagueId,
      nowMs: NOW_MS,
      thresholdMs: THRESHOLD_MS,
    });

    expect(plan.map((decision) => [decision.lockId, decision.action, decision.reason])).toEqual([
      ["safe-lock", "mark_failed", "stale-simulating-lock-without-results"],
      ["done-lock", "skip", "status=simulated"],
      ["fresh-lock", "skip", "not-stale"],
    ]);
  });

  it("dry-run leaves locks unchanged while write updates only safe stale locks", () => {
    const safeLock = lock("safe-lock");
    const simulatedLock = lock("done-lock", { status: "simulated" });
    const locksByLeagueId = new Map<string, SimulationLockRecoveryCandidate[]>([
      ["league-alpha", [safeLock, simulatedLock]],
    ]);
    const decisions = buildSimulationLockRecoveryPlan({
      leagues: [league()],
      locksByLeagueId,
      nowMs: NOW_MS,
      thresholdMs: THRESHOLD_MS,
    });

    const dryRun = applySimulationLockRecoveryPlanToRecords({
      decisions,
      locksByLeagueId,
      nowIso: "2026-05-03T12:20:00.000Z",
      write: false,
    });

    expect(dryRun.get("league-alpha")?.[0]).toBe(safeLock);
    expect(dryRun.get("league-alpha")?.[1]).toBe(simulatedLock);

    const written = applySimulationLockRecoveryPlanToRecords({
      decisions,
      locksByLeagueId,
      nowIso: "2026-05-03T12:20:00.000Z",
      write: true,
    });

    expect(written.get("league-alpha")?.[0]?.data).toMatchObject({
      recoveryReason: "stale-simulating-lock-without-results",
      status: "failed",
      updatedAt: "2026-05-03T12:20:00.000Z",
    });
    expect(written.get("league-alpha")?.[1]?.data.status).toBe("simulated");
    expect(locksByLeagueId.get("league-alpha")?.[0]?.data.status).toBe("simulating");
  });
});
