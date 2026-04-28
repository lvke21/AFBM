import { describe, expect, it } from "vitest";

import type { OffensivePlayDefinition } from "../domain/play-library";
import type { PassProtectionResolution } from "./pass-protection-resolution";
import {
  ROUTE_DEVELOPMENT_SECONDS,
  resolveQuarterbackDecisionTime,
  routeDepthForPlay,
} from "./qb-decision-time-resolution";

function play(
  family: OffensivePlayDefinition["family"],
  expectedYards: number,
): Pick<OffensivePlayDefinition, "id" | "family" | "label" | "expectedMetrics"> {
  return {
    id: `off-${family.toLowerCase()}-${expectedYards}`,
    family,
    label: family,
    expectedMetrics: {
      efficiencyRate: 0.48,
      explosiveRate: family === "DROPBACK" ? 0.18 : 0.08,
      turnoverSwingRate: 0.05,
      pressureRate: family === "DROPBACK" ? 0.32 : 0.18,
      expectedYards,
      redZoneValue: 0.45,
    },
  };
}

function protection(
  overrides: Partial<
    Pick<
      PassProtectionResolution,
      | "blockerCount"
      | "rusherCount"
      | "protectionAdvantage"
      | "doubleTeamChance"
      | "openBlitzLaneRisk"
      | "pressureLevel"
      | "pocketStability"
      | "isBlitz"
      | "isQuickCounter"
    >
  > = {},
) {
  return {
    blockerCount: 5,
    rusherCount: 4,
    protectionAdvantage: 10,
    doubleTeamChance: 0.18,
    openBlitzLaneRisk: 0,
    pressureLevel: 0.26,
    pocketStability: 0.62,
    isBlitz: false,
    isQuickCounter: false,
    ...overrides,
  };
}

function resolve(input: {
  family?: OffensivePlayDefinition["family"];
  expectedYards?: number;
  passProtection?: ReturnType<typeof protection>;
  qbPocketPresence?: number;
  qbAwareness?: number;
  qbDecisionMaking?: number;
  qbCommand?: number;
  qbMobility?: number;
  decisionSeed?: string;
}) {
  return resolveQuarterbackDecisionTime({
    offensePlay: play(input.family ?? "DROPBACK", input.expectedYards ?? 11),
    passProtection: input.passProtection ?? protection(),
    qbPocketPresence: input.qbPocketPresence ?? 74,
    qbAwareness: input.qbAwareness ?? 74,
    qbDecisionMaking: input.qbDecisionMaking ?? 74,
    qbCommand: input.qbCommand ?? 74,
    qbMobility: input.qbMobility ?? 70,
    decisionSeed: input.decisionSeed ?? "decision-default",
  });
}

describe("QB decision time resolution", () => {
  it("maps deeper route concepts to longer development time", () => {
    expect(routeDepthForPlay("SCREEN", 2)).toBe("QUICK");
    expect(routeDepthForPlay("QUICK_PASS", 5)).toBe("QUICK");
    expect(routeDepthForPlay("DROPBACK", 8)).toBe("MEDIUM");
    expect(routeDepthForPlay("DROPBACK", 12)).toBe("DEEP");
    expect(ROUTE_DEVELOPMENT_SECONDS.DEEP).toBeGreaterThan(
      ROUTE_DEVELOPMENT_SECONDS.MEDIUM,
    );
    expect(ROUTE_DEVELOPMENT_SECONDS.MEDIUM).toBeGreaterThan(
      ROUTE_DEVELOPMENT_SECONDS.SHORT,
    );
    expect(ROUTE_DEVELOPMENT_SECONDS.SHORT).toBeGreaterThan(
      ROUTE_DEVELOPMENT_SECONDS.QUICK,
    );
  });

  it("lets screen and quick timing work earlier against blitz pressure", () => {
    const blitz = protection({
      rusherCount: 6,
      protectionAdvantage: -12,
      openBlitzLaneRisk: 0.36,
      pressureLevel: 0.68,
      pocketStability: 0.22,
      isBlitz: true,
    });
    const deep = resolve({
      family: "DROPBACK",
      expectedYards: 12,
      passProtection: blitz,
      decisionSeed: "deep-vs-blitz",
    });
    const screen = resolve({
      family: "SCREEN",
      expectedYards: 1,
      passProtection: blitz,
      decisionSeed: "screen-vs-blitz",
    });

    expect(screen.availableDecisionTime).toBeGreaterThan(deep.availableDecisionTime);
    expect(screen.routeAvailability.QUICK).toBe(true);
    expect(deep.routeAvailability.DEEP).toBe(false);
    expect(screen.canThrow).toBe(true);
  });

  it("makes poor QB processing worse under the same pressure", () => {
    const heavyPressure = protection({
      rusherCount: 6,
      protectionAdvantage: -18,
      openBlitzLaneRisk: 0.42,
      pressureLevel: 0.74,
      pocketStability: 0.16,
      isBlitz: true,
    });
    const weakQuarterback = resolve({
      passProtection: heavyPressure,
      qbPocketPresence: 52,
      qbAwareness: 50,
      qbDecisionMaking: 48,
      qbCommand: 50,
      qbMobility: 58,
      decisionSeed: "weak-qb-pressure",
    });
    const strongQuarterback = resolve({
      passProtection: heavyPressure,
      qbPocketPresence: 88,
      qbAwareness: 86,
      qbDecisionMaking: 90,
      qbCommand: 87,
      qbMobility: 78,
      decisionSeed: "strong-qb-pressure",
    });

    expect(strongQuarterback.availableDecisionTime).toBeGreaterThan(
      weakQuarterback.availableDecisionTime,
    );
    expect(strongQuarterback.sackRisk).toBeLessThan(weakQuarterback.sackRisk);
    expect(strongQuarterback.sackFumbleRisk).toBeLessThan(
      weakQuarterback.sackFumbleRisk,
    );
    expect(strongQuarterback.throwawayRisk).toBeGreaterThan(
      weakQuarterback.throwawayRisk,
    );
  });

  it("uses fixed seeds to resolve a pass attempt when timing is clean", () => {
    const result = resolve({
      family: "QUICK_PASS",
      expectedYards: 5,
      passProtection: protection({
        blockerCount: 6,
        rusherCount: 4,
        protectionAdvantage: 26,
        doubleTeamChance: 0.42,
        pressureLevel: 0.12,
        pocketStability: 0.82,
      }),
      qbPocketPresence: 84,
      qbAwareness: 83,
      qbDecisionMaking: 85,
      qbCommand: 82,
      decisionSeed: "clean-quick-pass",
    });

    expect(result.canThrow).toBe(true);
    expect(result.outcome).toBe("PASS_ATTEMPT");
    expect(result.trace.gameReportRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "QB Decision Time" }),
        expect.objectContaining({ label: "Decision Outcome", value: "PASS_ATTEMPT" }),
      ]),
    );
  });

  it("uses fixed seeds to produce pressure escape branches", () => {
    const crisisProtection = protection({
      blockerCount: 5,
      rusherCount: 6,
      protectionAdvantage: -28,
      openBlitzLaneRisk: 0.62,
      pressureLevel: 0.88,
      pocketStability: 0.08,
      isBlitz: true,
    });
    const sack = resolve({
      passProtection: crisisProtection,
      qbPocketPresence: 45,
      qbAwareness: 44,
      qbDecisionMaking: 42,
      qbCommand: 43,
      qbMobility: 48,
      decisionSeed: "pressure-sack",
    });
    const escape = resolve({
      passProtection: crisisProtection,
      qbPocketPresence: 91,
      qbAwareness: 89,
      qbDecisionMaking: 92,
      qbCommand: 90,
      qbMobility: 92,
      decisionSeed: "pressure-escape",
    });

    expect(["SACK", "SACK_FUMBLE"]).toContain(sack.outcome);
    expect(["THROWAWAY", "SCRAMBLE", "PASS_ATTEMPT"]).toContain(escape.outcome);
    expect(escape.sackRisk).toBeLessThan(sack.sackRisk);
  });
});
