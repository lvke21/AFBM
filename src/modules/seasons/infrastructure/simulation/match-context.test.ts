import { describe, expect, it } from "vitest";

import { MatchStatus } from "@/modules/shared/domain/enums";
import { buildMatchContext, selectSimulationSeasonStat } from "./match-context";

describe("selectSimulationSeasonStat", () => {
  it("prefers the season stat block that matches the active team context", () => {
    const seasonStat = selectSimulationSeasonStat("team-2", [
      {
        id: "season-1",
        teamId: "team-1",
        passing: null,
        rushing: null,
        receiving: null,
        kicking: null,
        punting: null,
      },
      {
        id: "season-2",
        teamId: "team-2",
        passing: {
          longestCompletion: 42,
        },
        rushing: null,
        receiving: null,
        kicking: null,
        punting: null,
      },
    ]);

    expect(seasonStat?.id).toBe("season-2");
  });
});

describe("buildMatchContext", () => {
  it("reuses a stored match simulation seed for exact replay contexts", () => {
    const match = {
      id: "match-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 1,
      kind: "REGULAR_SEASON" as const,
      status: MatchStatus.COMPLETED,
      simulationSeed: "stored-replay-seed",
      scheduledAt: new Date("2026-09-01T18:00:00.000Z"),
      homeTeam: {
        id: "home",
        city: "Boston",
        nickname: "Guardians",
        abbreviation: "BOS",
        overallRating: 74,
        offenseXFactorPlan: {
          offensiveFocus: "PASS_FIRST",
        },
        defenseXFactorPlan: null,
        rosterProfiles: [],
      },
      awayTeam: {
        id: "away",
        city: "New York",
        nickname: "Titans",
        abbreviation: "NYT",
        overallRating: 78,
        offenseXFactorPlan: null,
        defenseXFactorPlan: {
          defensiveFocus: "LIMIT_PASS",
        },
        rosterProfiles: [],
      },
    } satisfies Parameters<typeof buildMatchContext>[1];

    expect(buildMatchContext(2026, match).simulationSeed).toBe("stored-replay-seed");
    expect(buildMatchContext(2026, match).offenseXFactorPlan?.offensiveFocus).toBe("PASS_FIRST");
    expect(buildMatchContext(2026, match).defenseXFactorPlan?.defensiveFocus).toBe("LIMIT_PASS");
  });

  it("fills missing team gameplans with deterministic AI strategy", () => {
    const match = {
      id: "match-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 1,
      kind: "REGULAR_SEASON" as const,
      status: MatchStatus.SCHEDULED,
      simulationSeed: "stored-replay-seed",
      scheduledAt: new Date("2026-09-01T18:00:00.000Z"),
      homeTeam: {
        id: "home",
        city: "Boston",
        nickname: "Guardians",
        abbreviation: "BOS",
        overallRating: 84,
        offenseXFactorPlan: null,
        defenseXFactorPlan: null,
        rosterProfiles: [],
      },
      awayTeam: {
        id: "away",
        city: "New York",
        nickname: "Titans",
        abbreviation: "NYT",
        overallRating: 70,
        offenseXFactorPlan: null,
        defenseXFactorPlan: null,
        rosterProfiles: [],
      },
    } satisfies Parameters<typeof buildMatchContext>[1];

    const context = buildMatchContext(2026, match);

    expect(context.teamGameplans?.home.aiStrategyArchetype).toBe("FAVORITE_CONTROL");
    expect(context.teamGameplans?.home.offenseXFactorPlan?.offensiveFocus).toBe("RUN_FIRST");
    expect(context.teamGameplans?.away.aiStrategyArchetype).toBe("UNDERDOG_VARIANCE");
    expect(context.teamGameplans?.away.offenseXFactorPlan?.aggression).toBe("AGGRESSIVE");
  });
});
