import { describe, expect, it } from "vitest";

import { buildTeamGameplanReportSummary } from "./match-result-persistence";

describe("match-result-persistence gameplan summary", () => {
  it("builds a compact persisted AI/gameplan summary", () => {
    expect(
      buildTeamGameplanReportSummary({
        aiStrategyArchetype: "UNDERDOG_VARIANCE",
        offenseXFactorPlan: {
          offensiveFocus: "PASS_FIRST",
          aggression: "AGGRESSIVE",
          tempoPlan: "HURRY_UP",
        },
        defenseXFactorPlan: {
          defensiveFocus: "LIMIT_PASS",
          turnoverPlan: "HUNT_TURNOVERS",
        },
      }),
    ).toEqual({
      aggression: "aggressive",
      aiStrategyArchetype: "UNDERDOG_VARIANCE",
      defenseFocus: "limit pass",
      label: "underdog variance",
      offenseFocus: "pass first",
      summary: "AI/Gameplan: underdog variance, pass first, aggressive, hurry up.",
    });
  });

  it("returns null when no gameplan context is available", () => {
    expect(buildTeamGameplanReportSummary(undefined)).toBeUndefined();
  });
});
