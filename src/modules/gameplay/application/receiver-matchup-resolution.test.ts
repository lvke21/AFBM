import { describe, expect, it } from "vitest";

import type { RouteDevelopmentTier } from "./qb-decision-time-resolution";
import {
  type ReceiverMatchupInput,
  type ReceiverRouteTarget,
  resolveReceiverMatchup,
} from "./receiver-matchup-resolution";

const ALL_ROUTES_AVAILABLE: Record<RouteDevelopmentTier, boolean> = {
  QUICK: true,
  SHORT: true,
  MEDIUM: true,
  DEEP: true,
};

const QUICK_ONLY: Record<RouteDevelopmentTier, boolean> = {
  QUICK: true,
  SHORT: false,
  MEDIUM: false,
  DEEP: false,
};

function target(
  id: string,
  routeDepth: RouteDevelopmentTier,
  baseYards: number,
  overrides: Partial<ReceiverRouteTarget> = {},
): ReceiverRouteTarget {
  return {
    id,
    label: `${routeDepth} ${id}`,
    routeDepth,
    baseYards,
    receiver: {
      release: 76,
      routeRunning: 76,
      separation: 76,
      catching: 76,
      speed: 76,
      acceleration: 76,
      yardsAfterCatch: 76,
    },
    defender: {
      manCoverage: 74,
      zoneCoverage: 74,
      ballSkills: 72,
      tackling: 74,
      speed: 74,
      acceleration: 74,
    },
    ...overrides,
  };
}

function resolve(input: Partial<ReceiverMatchupInput> = {}) {
  return resolveReceiverMatchup({
    targets: [
      target("flat", "QUICK", 4),
      target("dig", "MEDIUM", 11),
      target("go", "DEEP", 24),
    ],
    routeAvailability: ALL_ROUTES_AVAILABLE,
    qb: {
      decisionMaking: 76,
      awareness: 76,
      command: 76,
      coverageRead: 76,
      riskTolerance: 52,
      gameplan: "BALANCED",
      throwAccuracy: 76,
    },
    pressure: {
      pressureLevel: 0.26,
      pocketStability: 0.64,
      openBlitzLaneRisk: 0.04,
    },
    matchupSeed: "receiver-default",
    ...input,
  });
}

describe("receiver matchup resolution", () => {
  it("only lets the QB select routes available after decision time", () => {
    const result = resolve({
      routeAvailability: QUICK_ONLY,
      qb: {
        decisionMaking: 88,
        awareness: 86,
        command: 88,
        coverageRead: 86,
        riskTolerance: 90,
        gameplan: "AGGRESSIVE",
        throwAccuracy: 88,
      },
    });

    expect(result.selectedTarget?.routeDepth).toBe("QUICK");
    expect(result.availableTargetCount).toBe(1);
    expect(result.trace.targetSelection).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routeDepth: "DEEP",
          isAvailable: false,
          score: -999,
        }),
      ]),
    );
  });

  it("changes target choice across short, medium and deep route windows", () => {
    const quick = resolve({
      routeAvailability: QUICK_ONLY,
      qb: {
        decisionMaking: 80,
        awareness: 80,
        command: 80,
        coverageRead: 80,
        riskTolerance: 45,
        gameplan: "CONSERVATIVE",
        throwAccuracy: 80,
      },
    });
    const medium = resolve({
      routeAvailability: {
        QUICK: true,
        SHORT: true,
        MEDIUM: true,
        DEEP: false,
      },
      qb: {
        decisionMaking: 82,
        awareness: 82,
        command: 82,
        coverageRead: 82,
        riskTolerance: 66,
        gameplan: "BALANCED",
        throwAccuracy: 82,
      },
    });
    const deep = resolve({
      routeAvailability: ALL_ROUTES_AVAILABLE,
      qb: {
        decisionMaking: 88,
        awareness: 88,
        command: 90,
        coverageRead: 86,
        riskTolerance: 92,
        gameplan: "AGGRESSIVE",
        throwAccuracy: 88,
      },
      pressure: {
        pressureLevel: 0.08,
        pocketStability: 0.86,
        openBlitzLaneRisk: 0,
      },
    });

    expect(quick.selectedTarget?.routeDepth).toBe("QUICK");
    expect(["QUICK", "MEDIUM"]).toContain(medium.selectedTarget?.routeDepth);
    expect(deep.selectedTarget?.routeDepth).toBe("DEEP");
  });

  it("gives a strong QB better pass quality and lower interception risk", () => {
    const weakQuarterback = resolve({
      qb: {
        decisionMaking: 52,
        awareness: 54,
        command: 50,
        coverageRead: 52,
        riskTolerance: 64,
        gameplan: "BALANCED",
        throwAccuracy: 56,
      },
      random: () => 0.99,
    });
    const strongQuarterback = resolve({
      qb: {
        decisionMaking: 91,
        awareness: 90,
        command: 89,
        coverageRead: 90,
        riskTolerance: 64,
        gameplan: "BALANCED",
        throwAccuracy: 91,
      },
      random: () => 0.99,
    });

    expect(strongQuarterback.passQuality).toBeGreaterThan(weakQuarterback.passQuality);
    expect(strongQuarterback.completionProbability).toBeGreaterThan(
      weakQuarterback.completionProbability,
    );
    expect(strongQuarterback.interceptionProbability).toBeLessThan(
      weakQuarterback.interceptionProbability,
    );
  });

  it("makes receiver and defender quality visibly decide the matchup", () => {
    const eliteReceiver = resolve({
      targets: [
        target("iso", "SHORT", 8, {
          receiver: {
            release: 93,
            routeRunning: 92,
            separation: 94,
            catching: 91,
            speed: 92,
            acceleration: 92,
            yardsAfterCatch: 90,
          },
          defender: {
            manCoverage: 58,
            zoneCoverage: 60,
            ballSkills: 55,
            tackling: 60,
            speed: 68,
            acceleration: 68,
          },
        }),
      ],
      random: () => 0.45,
    });
    const eliteDefender = resolve({
      targets: [
        target("iso", "SHORT", 8, {
          receiver: {
            release: 58,
            routeRunning: 60,
            separation: 57,
            catching: 62,
            speed: 68,
            acceleration: 68,
            yardsAfterCatch: 62,
          },
          defender: {
            manCoverage: 93,
            zoneCoverage: 90,
            ballSkills: 92,
            tackling: 88,
            speed: 90,
            acceleration: 90,
          },
        }),
      ],
      random: () => 0.45,
    });

    expect(eliteReceiver.separationScore).toBeGreaterThan(eliteDefender.separationScore);
    expect(eliteReceiver.coverageScore).toBeLessThan(eliteDefender.coverageScore);
    expect(eliteReceiver.completionProbability).toBeGreaterThan(
      eliteDefender.completionProbability,
    );
    expect(eliteReceiver.interceptionProbability).toBeLessThan(
      eliteDefender.interceptionProbability,
    );
  });

  it("turns pressure into a lower pass-quality modifier", () => {
    const cleanPocket = resolve({
      pressure: {
        pressureLevel: 0.08,
        pocketStability: 0.86,
        openBlitzLaneRisk: 0,
      },
      random: () => 0.99,
    });
    const heavyPressure = resolve({
      pressure: {
        pressureLevel: 0.82,
        pocketStability: 0.12,
        openBlitzLaneRisk: 0.46,
      },
      random: () => 0.99,
    });

    expect(heavyPressure.pressureModifier).toBeLessThan(cleanPocket.pressureModifier);
    expect(heavyPressure.passQuality).toBeLessThan(cleanPocket.passQuality);
    expect(heavyPressure.completionProbability).toBeLessThan(
      cleanPocket.completionProbability,
    );
  });

  it("resolves complete, incomplete, drop, breakup and interception branches", () => {
    const base = resolve({ random: () => 0.99 });
    const interception = resolve({
      random: () => base.interceptionProbability / 2,
    });
    const drop = resolve({
      random: () =>
        base.interceptionProbability + base.dropProbability / 2,
    });
    const breakup = resolve({
      random: () =>
        base.interceptionProbability +
        base.dropProbability +
        base.breakupProbability / 2,
    });
    const complete = resolve({
      random: () =>
        base.interceptionProbability +
        base.dropProbability +
        base.breakupProbability +
        base.completionProbability / 2,
    });
    const incomplete = resolve({
      random: () => 0.99,
    });

    expect(interception.outcome).toBe("INTERCEPTION");
    expect(drop.outcome).toBe("DROP");
    expect(breakup.outcome).toBe("PASS_BREAKUP");
    expect(complete.outcome).toBe("COMPLETE");
    expect(complete.yacYards).toBeGreaterThanOrEqual(0);
    expect(incomplete.outcome).toBe("INCOMPLETE");
  });

  it("returns a debug trace ready for game reports", () => {
    const result = resolve();

    expect(result.trace.gameReportRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Selected Target" }),
        expect.objectContaining({ label: "Pass Quality" }),
        expect.objectContaining({ label: "Pass Outcome" }),
      ]),
    );
    expect(result.trace.notes.join(" ")).toContain("Pressure modifier");
  });
});
