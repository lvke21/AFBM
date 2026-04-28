import { describe, expect, it } from "vitest";

import { runSimulationBalancingBatch } from "./simulation-balancing";

describe("simulation balancing batch", () => {
  it("keeps strength-based outcomes plausible across controlled scenario batches", () => {
    const run = runSimulationBalancingBatch({
      repetitions: 80,
    });
    const byScenario = Object.fromEntries(
      run.results.map((result) => [result.scenarioId, result]),
    );

    expect(byScenario["strong-vs-weak"]?.favoriteWinRate).toBeGreaterThanOrEqual(0.6);
    expect(byScenario["strong-vs-medium"]?.favoriteWinRate).toBeGreaterThanOrEqual(0.45);
    expect(byScenario["medium-vs-medium"]?.averageTotalScore).toBeGreaterThanOrEqual(24);
    expect(byScenario["medium-vs-medium"]?.averageTotalScore).toBeLessThanOrEqual(62);
    expect(byScenario["medium-vs-medium"]?.blowoutRate).toBeLessThanOrEqual(0.1);
    expect(byScenario["strong-vs-weak"]?.favoriteWinRate).toBeGreaterThanOrEqual(0.9);
    expect(byScenario["strong-vs-weak"]?.maxTotalScore).toBeLessThanOrEqual(95);
    expect(byScenario["weakened-strong-vs-medium"]?.averageHomeScore).toBeGreaterThanOrEqual(6);
    expect(byScenario["weakened-strong-vs-medium"]?.blowoutRate).toBeLessThanOrEqual(0.45);
    expect(byScenario["weakened-strong-vs-medium"]?.favoriteWinRate).toBeLessThan(
      byScenario["strong-vs-medium"]?.favoriteWinRate ?? 1,
    );
  });

  it("is deterministic for identical seeds and repetitions", () => {
    expect(runSimulationBalancingBatch({ repetitions: 12 })).toEqual(
      runSimulationBalancingBatch({ repetitions: 12 }),
    );
  });
});
