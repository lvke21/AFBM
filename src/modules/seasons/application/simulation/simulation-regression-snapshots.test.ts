import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/random/seeded-rng";
import { buildInitialRoster } from "@/modules/savegames/application/bootstrap/initial-roster";

import { generateMatchStats } from "./match-engine";
import {
  SIMULATION_TEST_SEED_SCENARIOS,
  STANDARD_SIMULATION_TEST_SEEDS,
  type SimulationTestSeedScenario,
} from "./simulation-test-seeds";
import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
  TeamSimulationResult,
} from "./simulation.types";

type RegressionTeamDefinition = {
  abbreviation: string;
  city: string;
  nickname: string;
  rosterIndex: number;
  prestige: number;
};

type SeasonStanding = {
  losses: number;
  pointDiff: number;
  pointsAgainst: number;
  pointsFor: number;
  teamId: string;
  ties: number;
  wins: number;
};

const REGRESSION_TEAMS: Record<string, RegressionTeamDefinition> = {
  BOS: {
    abbreviation: "BOS",
    city: "Boston",
    nickname: "Guardians",
    prestige: 76,
    rosterIndex: 0,
  },
  CHI: {
    abbreviation: "CHI",
    city: "Chicago",
    nickname: "Blizzards",
    prestige: 72,
    rosterIndex: 2,
  },
  MIA: {
    abbreviation: "MIA",
    city: "Miami",
    nickname: "Sharks",
    prestige: 69,
    rosterIndex: 3,
  },
  NYT: {
    abbreviation: "NYT",
    city: "New York",
    nickname: "Titans",
    prestige: 76,
    rosterIndex: 1,
  },
};

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

function buildRegressionTeam(definition: RegressionTeamDefinition): SimulationTeamContext {
  return {
    id: definition.abbreviation,
    city: definition.city,
    nickname: definition.nickname,
    abbreviation: definition.abbreviation,
    overallRating: definition.prestige,
    roster: buildInitialRoster(definition.rosterIndex, definition.prestige, 2026).map((seed, index) => ({
      id: `${definition.abbreviation}-player-${index}`,
      teamId: definition.abbreviation,
      age: seed.age,
      attributes: Object.fromEntries(
        Object.entries(seed.attributes).filter((entry): entry is [string, number] => entry[1] != null),
      ),
      captainFlag: seed.captainFlag,
      careerStat: createStatAnchor(`career-${definition.abbreviation}-${index}`),
      depthChartSlot: seed.depthChartSlot,
      defensiveOverall: seed.defensiveOverall ?? null,
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
      seasonStat: createStatAnchor(`season-${definition.abbreviation}-${index}`),
      secondaryPositionCode: seed.secondaryPositionCode ?? null,
      specialTeamsOverall: seed.specialTeamsOverall ?? null,
      status: "ACTIVE",
    })),
  };
}

function buildMatchContext(
  seed: string,
  scenario: SimulationTestSeedScenario,
  homeTeam = REGRESSION_TEAMS.BOS,
  awayTeam = REGRESSION_TEAMS.NYT,
): SimulationMatchContext {
  return {
    matchId: `regression-${seed}`,
    saveGameId: "simulation-regression-save",
    seasonId: "simulation-regression-season",
    kind: scenario.kind,
    simulationSeed: seed,
    seasonYear: 2026,
    week: 4,
    scheduledAt: new Date("2026-09-22T18:00:00.000Z"),
    homeTeam: buildRegressionTeam({
      ...homeTeam,
      prestige: scenario.homePrestige,
      rosterIndex: scenario.homeRosterIndex,
    }),
    awayTeam: buildRegressionTeam({
      ...awayTeam,
      prestige: scenario.awayPrestige,
      rosterIndex: scenario.awayRosterIndex,
    }),
  };
}

function resolveWinner(result: MatchSimulationResult) {
  if (result.homeScore === result.awayScore) {
    return "TIE";
  }

  return result.homeScore > result.awayScore ? result.homeTeam.teamId : result.awayTeam.teamId;
}

function summarizeTeamStats(team: TeamSimulationResult) {
  return {
    explosivePlays: team.explosivePlays,
    firstDowns: team.firstDowns,
    passingYards: team.passingYards,
    penalties: team.penalties,
    redZoneTouchdowns: team.redZoneTouchdowns,
    redZoneTrips: team.redZoneTrips,
    rushingYards: team.rushingYards,
    sacks: team.sacks,
    score: team.score,
    teamId: team.teamId,
    timeOfPossessionSeconds: team.timeOfPossessionSeconds,
    totalYards: team.totalYards,
    touchdowns: team.touchdowns,
    turnovers: team.turnovers,
  };
}

function playerName(line: PlayerSimulationLine) {
  return line.playerId;
}

function summarizeTopPlayers(result: MatchSimulationResult) {
  const lines = [...result.playerLines];

  return {
    defense: lines
      .sort((left, right) => right.defensive.tackles - left.defensive.tackles || playerName(left).localeCompare(playerName(right)))
      .slice(0, 5)
      .map((line) => ({
        interceptions: line.defensive.interceptions,
        name: playerName(line),
        sacks: line.defensive.sacks,
        tackles: line.defensive.tackles,
        teamId: line.teamId,
      })),
    passing: lines
      .filter((line) => line.passing.attempts > 0)
      .sort((left, right) => right.passing.yards - left.passing.yards || playerName(left).localeCompare(playerName(right)))
      .map((line) => ({
        attempts: line.passing.attempts,
        completions: line.passing.completions,
        interceptions: line.passing.interceptions,
        name: playerName(line),
        touchdowns: line.passing.touchdowns,
        yards: line.passing.yards,
      })),
    receiving: lines
      .filter((line) => line.receiving.targets > 0)
      .sort((left, right) => right.receiving.yards - left.receiving.yards || playerName(left).localeCompare(playerName(right)))
      .slice(0, 5)
      .map((line) => ({
        name: playerName(line),
        receptions: line.receiving.receptions,
        targets: line.receiving.targets,
        touchdowns: line.receiving.touchdowns,
        yards: line.receiving.yards,
      })),
    rushing: lines
      .filter((line) => line.rushing.attempts > 0)
      .sort((left, right) => right.rushing.yards - left.rushing.yards || playerName(left).localeCompare(playerName(right)))
      .slice(0, 5)
      .map((line) => ({
        attempts: line.rushing.attempts,
        name: playerName(line),
        touchdowns: line.rushing.touchdowns,
        yards: line.rushing.yards,
      })),
  };
}

function summarizeMatchResult(result: MatchSimulationResult) {
  return {
    awayScore: result.awayScore,
    driveCount: result.drives.length,
    homeScore: result.homeScore,
    matchId: result.matchId,
    seed: result.simulationSeed,
    totalDrivesPlanned: result.totalDrivesPlanned,
    winner: resolveWinner(result),
    drives: result.drives.map((drive) => ({
      awayScore: drive.endedAwayScore,
      homeScore: drive.endedHomeScore,
      offense: drive.offenseTeamAbbreviation,
      phase: drive.phaseLabel,
      points: drive.pointsScored,
      resultType: drive.resultType,
      sequence: drive.sequence,
      summary: drive.summary,
      totalYards: drive.totalYards,
      turnover: drive.turnover,
    })),
  };
}

function summarizeStats(result: MatchSimulationResult) {
  return {
    teams: {
      away: summarizeTeamStats(result.awayTeam),
      home: summarizeTeamStats(result.homeTeam),
    },
    topPlayers: summarizeTopPlayers(result),
  };
}

function createStanding(teamId: string): SeasonStanding {
  return {
    losses: 0,
    pointDiff: 0,
    pointsAgainst: 0,
    pointsFor: 0,
    teamId,
    ties: 0,
    wins: 0,
  };
}

function addSeasonResult(standings: Map<string, SeasonStanding>, result: MatchSimulationResult) {
  const home = standings.get(result.homeTeam.teamId);
  const away = standings.get(result.awayTeam.teamId);

  if (!home || !away) {
    throw new Error("Regression season standings are missing a team.");
  }

  home.pointsFor += result.homeScore;
  home.pointsAgainst += result.awayScore;
  away.pointsFor += result.awayScore;
  away.pointsAgainst += result.homeScore;
  home.pointDiff = home.pointsFor - home.pointsAgainst;
  away.pointDiff = away.pointsFor - away.pointsAgainst;

  if (result.homeScore === result.awayScore) {
    home.ties += 1;
    away.ties += 1;
  } else if (result.homeScore > result.awayScore) {
    home.wins += 1;
    away.losses += 1;
  } else {
    away.wins += 1;
    home.losses += 1;
  }
}

function simulateRegressionSeason() {
  const games = [
    ["BOS", "NYT", STANDARD_SIMULATION_TEST_SEEDS.BALANCED_GAME],
    ["CHI", "MIA", STANDARD_SIMULATION_TEST_SEEDS.HIGH_SCORING],
    ["BOS", "CHI", STANDARD_SIMULATION_TEST_SEEDS.EDGE_CASE],
    ["NYT", "MIA", STANDARD_SIMULATION_TEST_SEEDS.LOW_RATING],
    ["MIA", "BOS", `${STANDARD_SIMULATION_TEST_SEEDS.HIGH_SCORING}:return`],
    ["NYT", "CHI", `${STANDARD_SIMULATION_TEST_SEEDS.EDGE_CASE}:return`],
  ] as const;
  const standings = new Map(Object.keys(REGRESSION_TEAMS).map((teamId) => [teamId, createStanding(teamId)]));
  const gameResults = games.map(([homeTeamId, awayTeamId, seed], index) => {
    const scenario =
      SIMULATION_TEST_SEED_SCENARIOS[seed as keyof typeof SIMULATION_TEST_SEED_SCENARIOS] ??
      SIMULATION_TEST_SEED_SCENARIOS[STANDARD_SIMULATION_TEST_SEEDS.BALANCED_GAME];
    const context = {
      ...buildMatchContext(
        seed,
        scenario,
        REGRESSION_TEAMS[homeTeamId],
        REGRESSION_TEAMS[awayTeamId],
      ),
      matchId: `regression-season-week-${index + 1}`,
      week: index + 1,
    };
    const result = generateMatchStats(context, createRng(seed));

    addSeasonResult(standings, result);

    return {
      away: awayTeamId,
      awayScore: result.awayScore,
      home: homeTeamId,
      homeScore: result.homeScore,
      seed,
      winner: resolveWinner(result),
      week: index + 1,
    };
  });

  return {
    games: gameResults,
    standings: [...standings.values()].sort(
      (left, right) =>
        right.wins - left.wins ||
        left.losses - right.losses ||
        right.pointDiff - left.pointDiff ||
        left.teamId.localeCompare(right.teamId),
    ),
  };
}

describe("deterministic simulation regression snapshots", () => {
  it("snapshots a canonical match result", () => {
    const seed = STANDARD_SIMULATION_TEST_SEEDS.BALANCED_GAME;
    const scenario = SIMULATION_TEST_SEED_SCENARIOS[seed];
    const result = generateMatchStats(buildMatchContext(seed, scenario), createRng(seed));

    expect(summarizeMatchResult(result)).toMatchSnapshot();
  });

  it("snapshots canonical stats output", () => {
    const seed = STANDARD_SIMULATION_TEST_SEEDS.HIGH_SCORING;
    const scenario = SIMULATION_TEST_SEED_SCENARIOS[seed];
    const result = generateMatchStats(buildMatchContext(seed, scenario), createRng(seed));

    expect(summarizeStats(result)).toMatchSnapshot();
  });

  it("snapshots a deterministic mini-season outcome", () => {
    expect(simulateRegressionSeason()).toMatchSnapshot();
  });
});
