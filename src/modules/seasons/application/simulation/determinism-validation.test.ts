import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/random/seeded-rng";
import { buildInitialRoster } from "@/modules/savegames/application/bootstrap/initial-roster";

import { generateMatchStats } from "./match-engine";
import {
  SIMULATION_TEST_SEED_SCENARIOS,
  STANDARD_SIMULATION_TEST_SEED_LIST,
  STANDARD_SIMULATION_TEST_SEEDS,
  type SimulationTestSeedScenario,
} from "./simulation-test-seeds";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "./simulation.types";

const REPLAY_COUNT = 10;

function createStatAnchor(id: string): SimulationStatAnchor {
  return {
    id,
    kickingLongestFieldGoal: 0,
    passingLongestCompletion: 0,
    puntingLongestPunt: 0,
    receivingLongestReception: 0,
    rushingLongestRush: 0,
  };
}

function buildLeagueTeam(
  teamId: string,
  city: string,
  nickname: string,
  rosterIndex: number,
  prestige: number,
): SimulationTeamContext {
  return {
    id: teamId,
    city,
    nickname,
    abbreviation: teamId,
    overallRating: prestige,
    roster: buildInitialRoster(rosterIndex, prestige, 2026).map((seed, index) => ({
      id: `${teamId}-player-${index}`,
      teamId,
      age: seed.age,
      attributes: Object.fromEntries(
        Object.entries(seed.attributes).filter((entry): entry is [string, number] => entry[1] != null),
      ),
      captainFlag: seed.captainFlag,
      careerStat: createStatAnchor(`career-${teamId}-${index}`),
      depthChartSlot: seed.depthChartSlot,
      developmentFocus: false,
      developmentTrait: seed.developmentTrait,
      fatigue: seed.fatigue,
      firstName: seed.firstName,
      gameDayAvailability: "ACTIVE",
      gameDayReadinessMultiplier: 1,
      gameDaySnapMultiplier: 1,
      injuryEndsOn: null,
      injuryName: null,
      injuryRisk: seed.injuryRisk,
      injuryStatus: "HEALTHY",
      lastName: seed.lastName,
      mentalOverall: seed.mentalOverall,
      morale: seed.morale,
      offensiveOverall: seed.offensiveOverall ?? null,
      physicalOverall: seed.physicalOverall,
      positionCode: seed.primaryPositionCode,
      positionOverall: seed.positionOverall,
      potentialRating: seed.potentialRating,
      rosterStatus: seed.rosterStatus,
      seasonStat: createStatAnchor(`season-${teamId}-${index}`),
      secondaryPositionCode: seed.secondaryPositionCode ?? null,
      defensiveOverall: seed.defensiveOverall ?? null,
      specialTeamsOverall: seed.specialTeamsOverall ?? null,
      status: "ACTIVE",
    })),
  };
}

function buildLeagueFixture(
  seed: string,
  scenario: SimulationTestSeedScenario = SIMULATION_TEST_SEED_SCENARIOS[STANDARD_SIMULATION_TEST_SEEDS.BALANCED_GAME],
): SimulationMatchContext {
  return {
    matchId: "determinism-validation-league-game-1",
    saveGameId: "determinism-validation-league",
    seasonId: "determinism-validation-season",
    kind: scenario.kind,
    simulationSeed: seed,
    seasonYear: 2026,
    week: 4,
    scheduledAt: new Date("2026-09-22T18:00:00.000Z"),
    homeTeam: buildLeagueTeam(
      "BOS",
      "Boston",
      "Guardians",
      scenario.homeRosterIndex,
      scenario.homePrestige,
    ),
    awayTeam: buildLeagueTeam(
      "NYT",
      "New York",
      "Titans",
      scenario.awayRosterIndex,
      scenario.awayPrestige,
    ),
  };
}

function resolveWinner(result: MatchSimulationResult) {
  if (result.homeScore === result.awayScore) {
    return "TIE";
  }

  return result.homeScore > result.awayScore ? result.homeTeam.teamId : result.awayTeam.teamId;
}

function normalizeSimulationResult(result: MatchSimulationResult) {
  return {
    matchId: result.matchId,
    seed: result.simulationSeed,
    score: {
      away: result.awayScore,
      home: result.homeScore,
    },
    winner: resolveWinner(result),
    teams: {
      away: result.awayTeam,
      home: result.homeTeam,
    },
    playerLines: result.playerLines,
    eventOrder: result.drives.map((drive) => ({
      awayScore: drive.endedAwayScore,
      defense: drive.defenseTeamId,
      homeScore: drive.endedHomeScore,
      offense: drive.offenseTeamId,
      phase: drive.phaseLabel,
      plays: drive.plays,
      points: drive.pointsScored,
      resultType: drive.resultType,
      sequence: drive.sequence,
      summary: drive.summary,
      totalYards: drive.totalYards,
      turnover: drive.turnover,
    })),
  };
}

function collectNumbers(value: unknown, numbers: number[] = []) {
  if (typeof value === "number") {
    numbers.push(value);
    return numbers;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectNumbers(entry, numbers));
    return numbers;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectNumbers(entry, numbers));
  }

  return numbers;
}

describe("simulation determinism validation", () => {
  it("replays the same league and seed identically across ten executions", () => {
    const seed = STANDARD_SIMULATION_TEST_SEEDS.BALANCED_GAME;
    const baseline = normalizeSimulationResult(
      generateMatchStats(buildLeagueFixture(seed), createRng(seed)),
    );

    for (let index = 0; index < REPLAY_COUNT; index += 1) {
      const replay = normalizeSimulationResult(
        generateMatchStats(buildLeagueFixture(seed), createRng(seed)),
      );

      expect(replay).toEqual(baseline);
      expect(replay.eventOrder.map((event) => event.sequence)).toEqual(
        replay.eventOrder.map((_, eventIndex) => eventIndex + 1),
      );
      expect(collectNumbers(replay).every(Number.isFinite)).toBe(true);
      expect(collectNumbers(replay).every(Number.isInteger)).toBe(true);
    }
  });

  it("keeps different seeds stable while producing different results", () => {
    const baselineFingerprints = new Set<string>();

    for (const seed of STANDARD_SIMULATION_TEST_SEED_LIST) {
      const scenario = SIMULATION_TEST_SEED_SCENARIOS[seed];
      const baseline = normalizeSimulationResult(
        generateMatchStats(buildLeagueFixture(seed, scenario), createRng(seed)),
      );

      for (let index = 0; index < REPLAY_COUNT; index += 1) {
        const replay = normalizeSimulationResult(
          generateMatchStats(buildLeagueFixture(seed, scenario), createRng(seed)),
        );

        expect(replay).toEqual(baseline);
      }

      baselineFingerprints.add(JSON.stringify(baseline));
    }

    expect(baselineFingerprints.size).toBeGreaterThan(1);
  });

  it("covers every documented standard QA seed", () => {
    expect(STANDARD_SIMULATION_TEST_SEED_LIST).toEqual([
      "balanced-game",
      "edge-case",
      "high-scoring",
      "low-rating",
    ]);

    for (const seed of STANDARD_SIMULATION_TEST_SEED_LIST) {
      const scenario = SIMULATION_TEST_SEED_SCENARIOS[seed];
      const result = normalizeSimulationResult(
        generateMatchStats(buildLeagueFixture(seed, scenario), createRng(seed)),
      );

      expect(scenario.expectedBehavior.length).toBeGreaterThan(20);
      expect(result.seed).toBe(seed);
      expect(result.eventOrder.length).toBeGreaterThan(8);
      expect(result.winner.length).toBeGreaterThan(0);
    }
  });
});
