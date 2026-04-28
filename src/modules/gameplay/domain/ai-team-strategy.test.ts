import { describe, expect, it } from "vitest";

import { selectAiTeamStrategy, type AiStrategyTeamContext } from "./ai-team-strategy";

function buildTeam(overrides: Partial<AiStrategyTeamContext> = {}): AiStrategyTeamContext {
  return {
    id: "team-1",
    overallRating: 76,
    roster: [
      {
        fatigue: 28,
        injuryStatus: "HEALTHY",
        positionCode: "QB",
        positionOverall: 76,
        rosterStatus: "STARTER",
        status: "ACTIVE",
      },
      {
        fatigue: 30,
        injuryStatus: "HEALTHY",
        positionCode: "RB",
        positionOverall: 74,
        rosterStatus: "STARTER",
        status: "ACTIVE",
      },
      {
        fatigue: 34,
        injuryStatus: "HEALTHY",
        positionCode: "CB",
        positionOverall: 75,
        rosterStatus: "STARTER",
        status: "ACTIVE",
      },
    ],
    ...overrides,
  };
}

describe("selectAiTeamStrategy", () => {
  it("lets strong favorites protect their advantage", () => {
    const strategy = selectAiTeamStrategy({
      team: buildTeam({ overallRating: 84 }),
      opponent: buildTeam({ id: "team-2", overallRating: 72 }),
      isHomeTeam: true,
    });

    expect(strategy.archetype).toBe("FAVORITE_CONTROL");
    expect(strategy.offenseXFactorPlan.offensiveFocus).toBe("RUN_FIRST");
    expect(strategy.offenseXFactorPlan.turnoverPlan).toBe("PROTECT_BALL");
  });

  it("lets underdogs seek variance", () => {
    const strategy = selectAiTeamStrategy({
      team: buildTeam({ overallRating: 68 }),
      opponent: buildTeam({ id: "team-2", overallRating: 81 }),
      isHomeTeam: false,
    });

    expect(strategy.archetype).toBe("UNDERDOG_VARIANCE");
    expect(strategy.offenseXFactorPlan.aggression).toBe("AGGRESSIVE");
    expect(strategy.offenseXFactorPlan.tempoPlan).toBe("HURRY_UP");
  });

  it("protects weakened teams before matchup edge rules", () => {
    const strategy = selectAiTeamStrategy({
      team: buildTeam({
        overallRating: 86,
        roster: [
          {
            fatigue: 88,
            injuryStatus: "OUT",
            positionCode: "QB",
            positionOverall: 84,
            rosterStatus: "STARTER",
            status: "ACTIVE",
          },
          {
            fatigue: 82,
            injuryStatus: "DOUBTFUL",
            positionCode: "LT",
            positionOverall: 80,
            rosterStatus: "STARTER",
            status: "ACTIVE",
          },
        ],
      }),
      opponent: buildTeam({ id: "team-2", overallRating: 74 }),
      isHomeTeam: true,
    });

    expect(strategy.archetype).toBe("PROTECT_WEAKENED");
    expect(strategy.offenseXFactorPlan.protectionPlan).toBe("MAX_PROTECT");
    expect(strategy.offenseXFactorPlan.aggression).toBe("CONSERVATIVE");
  });

  it("keeps equal healthy matchups balanced and deterministic", () => {
    const input = {
      team: buildTeam(),
      opponent: buildTeam({ id: "team-2" }),
      isHomeTeam: false,
    };

    expect(selectAiTeamStrategy(input)).toEqual(selectAiTeamStrategy(input));
    expect(selectAiTeamStrategy(input).archetype).toBe("BALANCED_MATCHUP");
  });
});
