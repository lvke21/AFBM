import { describe, expect, it } from "vitest";

import { buildInitialRoster } from "./bootstrap/initial-roster";
import {
  continueLoadedSaveGameSnapshot,
  createSaveGameSnapshot,
  loadSaveGameSnapshot,
  serializeSaveGameSnapshot,
} from "./savegame-snapshot";
import { generateMatchStats } from "../../seasons/application/simulation/match-engine";
import type {
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../seasons/application/simulation/simulation.types";

function createStatAnchor(id: string): SimulationStatAnchor {
  return {
    id,
    passingLongestCompletion: 0,
    rushingLongestRush: 0,
    receivingLongestReception: 0,
    kickingLongestFieldGoal: 0,
    puntingLongestPunt: 0,
  };
}

function buildSimulationTeam(
  teamId: string,
  city: string,
  nickname: string,
  rosterIndex: number,
  prestige: number,
): SimulationTeamContext {
  const roster = buildInitialRoster(rosterIndex, prestige, 2026).map((seed, index) => ({
    id: `${teamId}-player-${index}`,
    teamId,
    firstName: seed.firstName,
    lastName: seed.lastName,
    age: seed.age,
    developmentTrait: seed.developmentTrait,
    potentialRating: seed.potentialRating,
    positionCode: seed.primaryPositionCode,
    secondaryPositionCode: seed.secondaryPositionCode ?? null,
    rosterStatus: seed.rosterStatus,
    depthChartSlot: seed.depthChartSlot,
    captainFlag: seed.captainFlag,
    developmentFocus: false,
    injuryRisk: seed.injuryRisk,
    status: "ACTIVE",
    injuryStatus: "HEALTHY",
    injuryName: null,
    injuryEndsOn: null,
    fatigue: seed.fatigue,
    morale: seed.morale,
    positionOverall: seed.positionOverall,
    offensiveOverall: seed.offensiveOverall ?? null,
    defensiveOverall: seed.defensiveOverall ?? null,
    specialTeamsOverall: seed.specialTeamsOverall ?? null,
    physicalOverall: seed.physicalOverall,
    mentalOverall: seed.mentalOverall,
    attributes: Object.fromEntries(
      Object.entries(seed.attributes).filter((entry): entry is [string, number] => entry[1] != null),
    ),
    gameDayAvailability: "ACTIVE" as const,
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    seasonStat: createStatAnchor(`season-${teamId}-${index}`),
    careerStat: createStatAnchor(`career-${teamId}-${index}`),
  }));

  return {
    id: teamId,
    city,
    nickname,
    abbreviation: teamId,
    overallRating: prestige,
    roster,
  };
}

function createMatchContext(): SimulationMatchContext {
  return {
    matchId: "save-load-match-1",
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: "save-load-seed-1",
    seasonYear: 2026,
    week: 6,
    scheduledAt: new Date("2026-10-10T18:00:00.000Z"),
    homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
    awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
  };
}

describe("save-game snapshot", () => {
  it("saves, loads and continues a match with an identical deterministic result", () => {
    const matchContext = createMatchContext();
    const expected = generateMatchStats(matchContext);
    const snapshot = createSaveGameSnapshot({
      saveGameId: "save-1",
      saveGameName: "Save Load QA",
      currentSeasonId: "season-1",
      seasonId: "season-1",
      seasonYear: 2026,
      seasonPhase: "REGULAR_SEASON",
      week: 6,
      currentMatch: matchContext,
      currentMatchResult: expected,
      gameplan: {
        teams: {
          BOS: {
            coachingProfile: "BALANCED",
            offenseXFactorPlan: {
              offensiveFocus: "PASS_FIRST",
              defensiveFocus: "BALANCED",
              aggression: "BALANCED",
              tempoPlan: "NORMAL",
              protectionPlan: "STANDARD",
              offensiveMatchupFocus: "FEATURE_WR",
              defensiveMatchupFocus: "BALANCED",
              turnoverPlan: "PROTECT_BALL",
            },
          },
          NYT: {
            coachingProfile: "AGGRESSIVE",
            offenseXFactorPlan: {
              offensiveFocus: "BALANCED",
              defensiveFocus: "BALANCED",
              aggression: "AGGRESSIVE",
              tempoPlan: "HURRY_UP",
              protectionPlan: "FAST_RELEASE",
              offensiveMatchupFocus: "BALANCED",
              defensiveMatchupFocus: "ATTACK_WEAK_OL",
              turnoverPlan: "BALANCED",
            },
          },
        },
      },
      savedAt: "2026-04-24T00:00:00.000Z",
    });
    const json = serializeSaveGameSnapshot(snapshot);
    const loaded = loadSaveGameSnapshot(json);
    const continued = continueLoadedSaveGameSnapshot(json);

    expect(loaded.currentMatch.simulationSeed).toBe(matchContext.simulationSeed);
    expect(loaded.currentMatch.scheduledAt.toISOString()).toBe(
      matchContext.scheduledAt.toISOString(),
    );
    expect(loaded.currentMatch.homeTeam.roster).toHaveLength(
      matchContext.homeTeam.roster.length,
    );
    expect(loaded.currentMatchResult).toEqual(expected);
    expect(loaded.gameplan.teams.BOS?.coachingProfile).toBe("BALANCED");
    expect(loaded.gameplan.teams.NYT?.offenseXFactorPlan.tempoPlan).toBe("HURRY_UP");
    expect(loaded.seeds.matches).toEqual([
      {
        matchId: matchContext.matchId,
        simulationSeed: matchContext.simulationSeed,
      },
    ]);
    expect(continued).toEqual(expected);
    expect(JSON.stringify(continued)).toBe(JSON.stringify(expected));
  });
});
