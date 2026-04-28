import { describe, expect, it } from "vitest";

import { runExtendedSeasonBalanceSuite } from "./extended-season-balance-suite";

describe("extended season balance suite", () => {
  it("produces a stable schema with complete balance metrics", () => {
    const run = runExtendedSeasonBalanceSuite({ seasons: 2, weeksPerSeason: 4 });

    expect(run.metrics.games).toBe(32);
    expect(run.scenarios.length).toBeGreaterThanOrEqual(4);
    expect(run.teams).toHaveLength(8);
    expect(run.strategies.length).toBeGreaterThan(0);
    expect(run.metrics.averageScore).toBeGreaterThan(20);
    expect(run.metrics.injuryRate).toBeGreaterThanOrEqual(0);
    expect(run.metrics.severeInjuryRate).toBeGreaterThanOrEqual(0);
    expect(run.metrics.fatigueP90).toBeGreaterThanOrEqual(run.metrics.fatigueMedian);
    expect(run.metrics.progressionXpAverage).toBeGreaterThan(0);
    expect(run.diagnostics.byWeek).toHaveLength(4);
    expect(run.availability.byTeam).toHaveLength(8);
    expect(run.availability.byWeek).toHaveLength(4);
    expect(run.availability.byTeam[0]?.averageAvailabilityIndex).toBeGreaterThan(0);
    expect(run.diagnostics.byProfilePair.length).toBeGreaterThan(0);
    expect(run.diagnostics.byAvailabilityBand.length).toBeGreaterThan(0);
    expect(run.diagnostics.byBackupUsageBand.length).toBeGreaterThan(0);
    expect(run.diagnostics.byEffectiveDepthRatingBand.length).toBeGreaterThan(0);
    expect(run.diagnostics.byFatigueBand.length).toBeGreaterThan(0);
    expect(run.diagnostics.byInjuryCountBand.length).toBeGreaterThan(0);
    expect(run.diagnostics.byAiArchetypePair.length).toBeGreaterThan(0);
    expect(run.diagnostics.byHomeAwayWinner.length).toBeGreaterThan(0);
    expect(run.diagnostics.byLongTermPhase).toHaveLength(3);
    expect(run.diagnostics.correlations.length).toBeGreaterThanOrEqual(5);
    expect(run.diagnostics.scoreSpikePatterns.map((pattern) => pattern.type)).toContain("winner-42-plus");
    expect(run.schedule.variant).toBe("balanced-rotation");
    expect(run.schedule.strengthOfSchedule).toHaveLength(8);
    expect(run.schedule.matchups.length).toBeGreaterThanOrEqual(8);
    expect(run.schedule.fairness.gamesPerTeamSpread).toBe(0);
    expect(run.fingerprint).toContain(`${run.metrics.games}`);
  });

  it("is reproducible for identical season and week counts", () => {
    expect(runExtendedSeasonBalanceSuite({ seasons: 2, weeksPerSeason: 3 })).toEqual(
      runExtendedSeasonBalanceSuite({ seasons: 2, weeksPerSeason: 3 }),
    );
  });

  it("keeps balanced rotation schedule strength close across teams", () => {
    const run = runExtendedSeasonBalanceSuite({ seasons: 1, weeksPerSeason: 14 });

    expect(run.metrics.games).toBe(56);
    expect(run.schedule.fairness.gamesPerTeamSpread).toBe(0);
    expect(run.schedule.fairness.minGamesPerOpponentPair).toBe(2);
    expect(run.schedule.fairness.maxGamesPerOpponentPair).toBe(2);
    expect(run.schedule.fairness.averageOpponentRatingSpread).toBeLessThanOrEqual(3);
    expect(run.schedule.strengthOfSchedule.every((entry) => entry.games === 14)).toBe(true);
  });

  it("can still run the legacy schedule for before and after comparisons", () => {
    const legacy = runExtendedSeasonBalanceSuite({
      scheduleVariant: "legacy",
      seasons: 1,
      weeksPerSeason: 14,
    });
    const balanced = runExtendedSeasonBalanceSuite({ seasons: 1, weeksPerSeason: 14 });

    expect(legacy.metrics.games).toBe(112);
    expect(balanced.metrics.games).toBe(56);
    expect(legacy.schedule.variant).toBe("legacy");
    expect(balanced.schedule.variant).toBe("balanced-rotation");
    expect(legacy.schedule.fairness.averageOpponentRatingSpread).toBeGreaterThan(
      balanced.schedule.fairness.averageOpponentRatingSpread,
    );
  });
});
