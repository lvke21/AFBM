import { describe, expect, it } from "vitest";

import {
  EXPECTED_PRODUCTION_REGRESSION_FINGERPRINTS,
  assessEdgeCases,
  runProductionQaGames,
  runSeedRegressionQa,
} from "./production-qa-suite";

describe("production simulation QA suite", () => {
  it("runs a 100-game smoke test without technical consistency failures", () => {
    const suite = runProductionQaGames({
      suiteName: "Production Smoke 100",
      gameCount: 100,
      seedPrefix: "production-smoke",
    });

    expect(suite.games).toHaveLength(100);
    expect(suite.assessment.technicalStatus).toBe("GRUEN");
    expect(suite.assessment.flags.criticalCount).toBe(0);
    expect(suite.assessment.flags.majorCount).toBe(0);
    expect(suite.assessment.flags.allClockTotalsValid).toBe(true);
    expect(suite.assessment.flags.performanceAcceptable).toBe(true);
  }, 30_000);

  it("runs a 500-game stability test with stable core invariants", () => {
    const suite = runProductionQaGames({
      suiteName: "Production Stability 500",
      gameCount: 500,
      seedPrefix: "production-stability",
    });

    expect(suite.games).toHaveLength(500);
    expect(suite.assessment.technicalStatus).toBe("GRUEN");
    expect(suite.assessment.flags.criticalCount).toBe(0);
    expect(suite.assessment.flags.majorCount).toBe(0);
    expect(suite.assessment.aggregate.summaries.totalTopPerGameSeconds.avg).toBe(3600);
    expect(suite.assessment.aggregate.summaries.runtimePerGameMs.avg).toBeLessThanOrEqual(20);
    expect(suite.assessment.aggregate.summaries.pointsPerGame.stdDev).toBeLessThan(30);
    expect(suite.assessment.aggregate.summaries.totalYardsPerGame.stdDev).toBeLessThan(350);
  }, 60_000);

  it("protects seed-based regression fingerprints", () => {
    const rows = runSeedRegressionQa();
    const fingerprints = Object.fromEntries(
      rows.map((row) => [row.seed, row.fingerprint]),
    );

    expect(rows.every((row) => row.identical)).toBe(true);
    expect(rows.every((row) => row.fingerprint === row.repeatedFingerprint)).toBe(true);
    expect(fingerprints).toEqual(EXPECTED_PRODUCTION_REGRESSION_FINGERPRINTS);
  });

  it("covers production edge cases for endgame, blowout, red-zone stops and playoffs", () => {
    const suite = runProductionQaGames({
      suiteName: "Production Edge Scan",
      gameCount: 160,
      seedPrefix: "production-edge",
    });
    const edge = assessEdgeCases(suite.games);

    expect(edge.status).toBe("GRUEN");
    expect(edge.endgameDriveCount).toBeGreaterThan(0);
    expect(edge.lateTrailingDecisionCount).toBeGreaterThan(0);
    expect(edge.blowoutGameCount).toBeGreaterThan(0);
    expect(edge.garbageTimeDecisionCount).toBeGreaterThan(0);
    expect(edge.redZoneStopCount).toBeGreaterThan(0);
    expect(edge.backedUpDriveCount).toBeGreaterThan(0);
    expect(edge.playoffDecisive).toBe(true);
  }, 30_000);
});
