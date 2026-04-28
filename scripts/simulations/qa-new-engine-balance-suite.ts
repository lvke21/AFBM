import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { MatchKind } from "@prisma/client";

import type { GameSituationSnapshot } from "../../src/modules/gameplay/domain/game-situation";
import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
  PlayAssignment,
} from "../../src/modules/gameplay/domain/play-library";
import type { PlayerAlignmentSnapshot } from "../../src/modules/gameplay/domain/pre-snap-structure";
import { resolveCompetitionRuleProfile } from "../../src/modules/gameplay/domain/competition-rules";
import { resolveHeadCoachMomentum } from "../../src/modules/gameplay/application/head-coach-momentum-service";
import { resolvePassProtection } from "../../src/modules/gameplay/application/pass-protection-resolution";
import { resolvePressCoverage } from "../../src/modules/gameplay/application/press-coverage-resolution";
import { resolveQuarterbackDecisionTime } from "../../src/modules/gameplay/application/qb-decision-time-resolution";
import { resolveRunLane } from "../../src/modules/gameplay/application/run-lane-resolution";
import {
  calculateUnitChemistryModifiers,
  createEmptyChemistryState,
  updateChemistryAfterGame,
  type ChemistryGroupUsage,
  type ChemistryState,
} from "../../src/modules/gameplay/application/unit-chemistry-service";
import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationStatAnchor,
  SimulationTeamContext,
  TeamSimulationResult,
} from "../../src/modules/seasons/application/simulation/simulation.types";

const REPORT_DATE = "2026-04-25";
const GAMES_PER_MATCHUP = 20;
const SPECIAL_TEST_ITERATIONS = 100;

type TeamTier = "SCHWACH" | "MITTEL" | "STARK";
type UnitCode = "QB" | "RB" | "WR" | "OL" | "DL" | "LB" | "DB" | "ST";
type UnitRatings = Record<UnitCode, number>;

type TeamDefinition = {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  tier: TeamTier;
  rosterIndex: number;
  overallRating: number;
  unitRatings: UnitRatings;
  profile: string;
};

type TeamSnapshot = TeamDefinition & {
  teamId: string;
  name: string;
  rosterOverall: number;
  offenseOverall: number;
  defenseOverall: number;
  specialTeamsOverall: number;
  unitAverages: UnitRatings;
};

type TeamGameStats = {
  points: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  touchdowns: number;
  turnovers: number;
  sacks: number;
  pressuresAllowed: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
  punts: number;
  fieldGoalAttempts: number;
  turnoverOnDowns: number;
};

type GameRecord = {
  gameId: string;
  matchupId: string;
  gameNumber: number;
  seed: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  score: {
    home: number;
    away: number;
  };
  winner: {
    teamId: string;
    name: string;
    side: "home" | "away";
  } | null;
  favoriteTeamId: string | null;
  favoriteWon: boolean | null;
  stats: {
    home: TeamGameStats;
    away: TeamGameStats;
  };
};

type StandingRow = {
  teamId: string;
  name: string;
  tier: TeamTier;
  overallRating: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  yardsFor: number;
  yardsAgainst: number;
  sacks: number;
  pressuresAllowed: number;
  turnovers: number;
  explosivePlays: number;
};

type MatchupSummary = {
  matchupId: string;
  label: string;
  games: number;
  record: {
    teamAWins: number;
    teamBWins: number;
    ties: number;
  };
  averages: {
    teamAScore: number;
    teamBScore: number;
    teamAYards: number;
    teamBYards: number;
    teamASacks: number;
    teamBSacks: number;
    teamAExplosivePlays: number;
    teamBExplosivePlays: number;
    teamATurnovers: number;
    teamBTurnovers: number;
  };
};

type OutcomeRates = {
  passAttemptRate: number;
  throwawayRate: number;
  scrambleRate: number;
  sackRate: number;
  sackFumbleRate: number;
};

type SpecialTestResult = {
  id: string;
  label: string;
  category: string;
  iterations: number;
  metrics: Record<string, number | string | boolean>;
  verdict: "GRUEN" | "ROT";
  explanation: string;
};

const TEAM_DEFINITIONS: TeamDefinition[] = [
  {
    id: "NB_CANTON",
    city: "Canton",
    nickname: "Anchors",
    abbreviation: "CAN",
    tier: "SCHWACH",
    rosterIndex: 40,
    overallRating: 61,
    unitRatings: { QB: 58, RB: 65, WR: 58, OL: 61, DL: 62, LB: 60, DB: 59, ST: 66 },
    profile: "Schwaches Team mit limitiertem Passspiel und nur solidem Laufspiel.",
  },
  {
    id: "NB_OMAHA",
    city: "Omaha",
    nickname: "Rails",
    abbreviation: "OMA",
    tier: "SCHWACH",
    rosterIndex: 41,
    overallRating: 65,
    unitRatings: { QB: 67, RB: 61, WR: 66, OL: 66, DL: 61, LB: 64, DB: 67, ST: 68 },
    profile: "Unteres Niveau, aber mit brauchbarer QB/ST-Achse.",
  },
  {
    id: "NB_PORTLAND",
    city: "Portland",
    nickname: "Bridges",
    abbreviation: "POR",
    tier: "MITTEL",
    rosterIndex: 42,
    overallRating: 73,
    unitRatings: { QB: 77, RB: 69, WR: 79, OL: 70, DL: 68, LB: 72, DB: 75, ST: 72 },
    profile: "Passlastiges Mittel-Team mit schwacher Front.",
  },
  {
    id: "NB_MEMPHIS",
    city: "Memphis",
    nickname: "Pilots",
    abbreviation: "MEM",
    tier: "MITTEL",
    rosterIndex: 43,
    overallRating: 76,
    unitRatings: { QB: 72, RB: 82, WR: 72, OL: 81, DL: 78, LB: 77, DB: 72, ST: 75 },
    profile: "Lauf- und Line-Profil mit begrenzter Pass-Explosivitaet.",
  },
  {
    id: "NB_ORLANDO",
    city: "Orlando",
    nickname: "Voltage",
    abbreviation: "ORL",
    tier: "MITTEL",
    rosterIndex: 44,
    overallRating: 79,
    unitRatings: { QB: 80, RB: 73, WR: 78, OL: 75, DL: 81, LB: 80, DB: 83, ST: 77 },
    profile: "Defensiv starkes oberes Mittel-Team.",
  },
  {
    id: "NB_SAN_DIEGO",
    city: "San Diego",
    nickname: "Sentinels",
    abbreviation: "SDG",
    tier: "STARK",
    rosterIndex: 45,
    overallRating: 84,
    unitRatings: { QB: 87, RB: 82, WR: 86, OL: 83, DL: 83, LB: 84, DB: 85, ST: 82 },
    profile: "Starkes, breit ausbalanciertes Team.",
  },
  {
    id: "NB_CHICAGO",
    city: "Chicago",
    nickname: "Monarchs",
    abbreviation: "CHI",
    tier: "STARK",
    rosterIndex: 46,
    overallRating: 88,
    unitRatings: { QB: 84, RB: 91, WR: 84, OL: 92, DL: 92, LB: 88, DB: 84, ST: 87 },
    profile: "Trench- und Run-Power mit starkem Pass Rush.",
  },
  {
    id: "NB_NEW_YORK",
    city: "New York",
    nickname: "Titans",
    abbreviation: "NYT",
    tier: "STARK",
    rosterIndex: 47,
    overallRating: 91,
    unitRatings: { QB: 95, RB: 85, WR: 94, OL: 88, DL: 87, LB: 89, DB: 94, ST: 90 },
    profile: "Elite-Passing, sehr starke Secondary und kaum klare Schwaechen.",
  },
];

function clampRating(value: number) {
  return Math.min(99, Math.max(1, Math.round(value)));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : round(numerator / denominator, 4);
}

function teamDisplayName(team: Pick<SimulationTeamContext, "city" | "nickname">) {
  return `${team.city} ${team.nickname}`;
}

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

function unitForPosition(positionCode: string): UnitCode {
  switch (positionCode) {
    case "QB":
      return "QB";
    case "RB":
    case "FB":
      return "RB";
    case "WR":
    case "TE":
      return "WR";
    case "LT":
    case "LG":
    case "C":
    case "RG":
    case "RT":
      return "OL";
    case "LE":
    case "RE":
    case "DT":
      return "DL";
    case "LOLB":
    case "MLB":
    case "ROLB":
      return "LB";
    case "CB":
    case "FS":
    case "SS":
      return "DB";
    case "K":
    case "P":
    case "LS":
      return "ST";
    default:
      return "ST";
  }
}

function adjustNullableRating(value: number | null | undefined, offset: number) {
  return value == null ? null : clampRating(value + offset);
}

function buildTeam(definition: TeamDefinition): SimulationTeamContext {
  const roster = buildInitialRoster(definition.rosterIndex, definition.overallRating, 2026).map(
    (seed, index): SimulationPlayerContext => {
      const unit = unitForPosition(seed.primaryPositionCode);
      const unitOffset = definition.unitRatings[unit] - definition.overallRating;
      const attributes = Object.fromEntries(
        Object.entries(seed.attributes)
          .filter((entry): entry is [string, number] => entry[1] != null)
          .map(([key, value]) => [key, clampRating(value + unitOffset)]),
      );

      return {
        id: `${definition.id}-player-${index}`,
        teamId: definition.id,
        firstName: seed.firstName,
        lastName: seed.lastName,
        age: seed.age,
        developmentTrait: seed.developmentTrait,
        potentialRating: clampRating(seed.potentialRating + unitOffset),
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
        positionOverall: clampRating(seed.positionOverall + unitOffset),
        offensiveOverall: adjustNullableRating(seed.offensiveOverall, unitOffset),
        defensiveOverall: adjustNullableRating(seed.defensiveOverall, unitOffset),
        specialTeamsOverall: adjustNullableRating(seed.specialTeamsOverall, unitOffset),
        physicalOverall: adjustNullableRating(seed.physicalOverall, unitOffset),
        mentalOverall: adjustNullableRating(seed.mentalOverall, unitOffset),
        attributes,
        gameDayAvailability: "ACTIVE",
        gameDayReadinessMultiplier: 1,
        gameDaySnapMultiplier: 1,
        seasonStat: createStatAnchor(`season-${definition.id}-${index}`),
        careerStat: createStatAnchor(`career-${definition.id}-${index}`),
      };
    },
  );

  return {
    id: definition.id,
    city: definition.city,
    nickname: definition.nickname,
    abbreviation: definition.abbreviation,
    overallRating: definition.overallRating,
    roster,
  };
}

function cloneTeam(team: SimulationTeamContext): SimulationTeamContext {
  return {
    ...team,
    roster: team.roster.map((player) => ({
      ...player,
      attributes: { ...player.attributes },
      seasonStat: player.seasonStat ? { ...player.seasonStat } : null,
      careerStat: player.careerStat ? { ...player.careerStat } : null,
    })),
  };
}

function ratingSnapshot(definition: TeamDefinition, team: SimulationTeamContext): TeamSnapshot {
  const numbers = (selector: (player: SimulationPlayerContext) => number | null) =>
    team.roster.map(selector).filter((value): value is number => value != null);
  const byUnit = (unit: UnitCode) =>
    round(
      average(
        team.roster
          .filter((player) => unitForPosition(player.positionCode) === unit)
          .map((player) => player.positionOverall),
      ),
      1,
    );

  return {
    ...definition,
    teamId: definition.id,
    name: teamDisplayName(team),
    rosterOverall: round(average(numbers((player) => player.positionOverall)), 1),
    offenseOverall: round(average(numbers((player) => player.offensiveOverall)), 1),
    defenseOverall: round(average(numbers((player) => player.defensiveOverall)), 1),
    specialTeamsOverall: round(average(numbers((player) => player.specialTeamsOverall)), 1),
    unitAverages: {
      QB: byUnit("QB"),
      RB: byUnit("RB"),
      WR: byUnit("WR"),
      OL: byUnit("OL"),
      DL: byUnit("DL"),
      LB: byUnit("LB"),
      DB: byUnit("DB"),
      ST: byUnit("ST"),
    },
  };
}

function createMatchContext(input: {
  matchId: string;
  seed: string;
  homeTeam: SimulationTeamContext;
  awayTeam: SimulationTeamContext;
  gameNumber: number;
}): SimulationMatchContext {
  return {
    matchId: input.matchId,
    saveGameId: "qa-new-engine-balance-savegame",
    seasonId: "qa-new-engine-balance-season-2026",
    kind: MatchKind.REGULAR_SEASON,
    simulationSeed: input.seed,
    seasonYear: 2026,
    week: ((input.gameNumber - 1) % 18) + 1,
    scheduledAt: new Date(Date.UTC(2026, 8, 1 + ((input.gameNumber - 1) % 112), 18, 0, 0)),
    homeTeam: cloneTeam(input.homeTeam),
    awayTeam: cloneTeam(input.awayTeam),
  };
}

function driveCountForTeam(result: MatchSimulationResult, teamId: string, resultType: string) {
  return result.drives.filter(
    (drive) => drive.offenseTeamId === teamId && drive.resultType === resultType,
  ).length;
}

function pressuresAllowed(result: MatchSimulationResult, teamId: string) {
  return result.playerLines
    .filter((line) => line.teamId === teamId)
    .reduce((sum, line) => sum + line.blocking.pressuresAllowed, 0);
}

function teamGameStats(result: MatchSimulationResult, teamResult: TeamSimulationResult): TeamGameStats {
  return {
    points: teamResult.score,
    totalYards: teamResult.totalYards,
    passingYards: teamResult.passingYards,
    rushingYards: teamResult.rushingYards,
    touchdowns: teamResult.touchdowns,
    turnovers: teamResult.turnovers,
    sacks: teamResult.sacks,
    pressuresAllowed: pressuresAllowed(result, teamResult.teamId),
    explosivePlays: teamResult.explosivePlays,
    redZoneTrips: teamResult.redZoneTrips,
    redZoneTouchdowns: teamResult.redZoneTouchdowns,
    punts: driveCountForTeam(result, teamResult.teamId, "PUNT"),
    fieldGoalAttempts:
      driveCountForTeam(result, teamResult.teamId, "FIELD_GOAL_MADE") +
      driveCountForTeam(result, teamResult.teamId, "FIELD_GOAL_MISSED"),
    turnoverOnDowns: driveCountForTeam(result, teamResult.teamId, "TURNOVER_ON_DOWNS"),
  };
}

function runGame(input: {
  gameId: string;
  matchupId: string;
  gameNumber: number;
  seed: string;
  homeTeam: SimulationTeamContext;
  awayTeam: SimulationTeamContext;
  definitionsById: Map<string, TeamDefinition>;
}): GameRecord {
  const result = generateMatchStats(
    createMatchContext({
      matchId: input.gameId,
      seed: input.seed,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      gameNumber: input.gameNumber,
    }),
  );
  const winner =
    result.homeScore === result.awayScore
      ? null
      : result.homeScore > result.awayScore
        ? {
            teamId: input.homeTeam.id,
            name: teamDisplayName(input.homeTeam),
            side: "home" as const,
          }
        : {
            teamId: input.awayTeam.id,
            name: teamDisplayName(input.awayTeam),
            side: "away" as const,
          };
  const homeDefinition = input.definitionsById.get(input.homeTeam.id);
  const awayDefinition = input.definitionsById.get(input.awayTeam.id);
  const favoriteTeamId =
    homeDefinition && awayDefinition && homeDefinition.overallRating !== awayDefinition.overallRating
      ? homeDefinition.overallRating > awayDefinition.overallRating
        ? input.homeTeam.id
        : input.awayTeam.id
      : null;

  return {
    gameId: input.gameId,
    matchupId: input.matchupId,
    gameNumber: input.gameNumber,
    seed: input.seed,
    homeTeamId: input.homeTeam.id,
    awayTeamId: input.awayTeam.id,
    homeTeamName: teamDisplayName(input.homeTeam),
    awayTeamName: teamDisplayName(input.awayTeam),
    score: {
      home: result.homeScore,
      away: result.awayScore,
    },
    winner,
    favoriteTeamId,
    favoriteWon: favoriteTeamId == null || winner == null ? null : winner.teamId === favoriteTeamId,
    stats: {
      home: teamGameStats(result, result.homeTeam),
      away: teamGameStats(result, result.awayTeam),
    },
  };
}

function teamStatsInGame(game: GameRecord, teamId: string) {
  return game.homeTeamId === teamId ? game.stats.home : game.stats.away;
}

function scoreInGame(game: GameRecord, teamId: string) {
  return game.homeTeamId === teamId ? game.score.home : game.score.away;
}

function summarizeMatchup(input: {
  matchupId: string;
  teamA: SimulationTeamContext;
  teamB: SimulationTeamContext;
  games: GameRecord[];
}): MatchupSummary {
  const teamAStats = input.games.map((game) => teamStatsInGame(game, input.teamA.id));
  const teamBStats = input.games.map((game) => teamStatsInGame(game, input.teamB.id));

  return {
    matchupId: input.matchupId,
    label: `${teamDisplayName(input.teamA)} vs ${teamDisplayName(input.teamB)}`,
    games: input.games.length,
    record: {
      teamAWins: input.games.filter((game) => game.winner?.teamId === input.teamA.id).length,
      teamBWins: input.games.filter((game) => game.winner?.teamId === input.teamB.id).length,
      ties: input.games.filter((game) => game.winner == null).length,
    },
    averages: {
      teamAScore: round(average(input.games.map((game) => scoreInGame(game, input.teamA.id))), 2),
      teamBScore: round(average(input.games.map((game) => scoreInGame(game, input.teamB.id))), 2),
      teamAYards: round(average(teamAStats.map((stats) => stats.totalYards)), 2),
      teamBYards: round(average(teamBStats.map((stats) => stats.totalYards)), 2),
      teamASacks: round(average(teamAStats.map((stats) => stats.sacks)), 2),
      teamBSacks: round(average(teamBStats.map((stats) => stats.sacks)), 2),
      teamAExplosivePlays: round(average(teamAStats.map((stats) => stats.explosivePlays)), 2),
      teamBExplosivePlays: round(average(teamBStats.map((stats) => stats.explosivePlays)), 2),
      teamATurnovers: round(average(teamAStats.map((stats) => stats.turnovers)), 2),
      teamBTurnovers: round(average(teamBStats.map((stats) => stats.turnovers)), 2),
    },
  };
}

function buildStandings(
  teams: SimulationTeamContext[],
  snapshots: TeamSnapshot[],
  games: GameRecord[],
): StandingRow[] {
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.teamId, snapshot]));
  const rows = new Map(
    teams.map((team) => {
      const snapshot = snapshotById.get(team.id);

      if (!snapshot) {
        throw new Error(`Missing team snapshot for ${team.id}`);
      }

      const row: StandingRow = {
        teamId: team.id,
        name: teamDisplayName(team),
        tier: snapshot.tier,
        overallRating: snapshot.overallRating,
        games: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winPct: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0,
        yardsFor: 0,
        yardsAgainst: 0,
        sacks: 0,
        pressuresAllowed: 0,
        turnovers: 0,
        explosivePlays: 0,
      };

      return [team.id, row] as const;
    }),
  );

  for (const game of games) {
    const home = rows.get(game.homeTeamId);
    const away = rows.get(game.awayTeamId);

    if (!home || !away) {
      throw new Error(`Missing standings row for ${game.gameId}`);
    }

    const applyStats = (row: StandingRow, own: TeamGameStats, opponent: TeamGameStats) => {
      row.games += 1;
      row.pointsFor += own.points;
      row.pointsAgainst += opponent.points;
      row.yardsFor += own.totalYards;
      row.yardsAgainst += opponent.totalYards;
      row.sacks += own.sacks;
      row.pressuresAllowed += own.pressuresAllowed;
      row.turnovers += own.turnovers;
      row.explosivePlays += own.explosivePlays;
    };

    applyStats(home, game.stats.home, game.stats.away);
    applyStats(away, game.stats.away, game.stats.home);

    if (game.winner == null) {
      home.ties += 1;
      away.ties += 1;
    } else if (game.winner.teamId === home.teamId) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.wins += 1;
      home.losses += 1;
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      winPct: rate(row.wins + row.ties * 0.5, row.games),
      pointDifferential: row.pointsFor - row.pointsAgainst,
    }))
    .sort((left, right) => right.winPct - left.winPct || right.pointDifferential - left.pointDifferential);
}

function player(
  positionCode: string,
  index: number,
  overrides: Partial<PlayerAlignmentSnapshot> = {},
): PlayerAlignmentSnapshot {
  const isOffenseLine = ["LT", "LG", "C", "RG", "RT", "TE"].includes(positionCode);
  const isDefenseFront = ["LE", "RE", "DT"].includes(positionCode);
  const isLinebacker = ["LOLB", "MLB", "ROLB"].includes(positionCode);
  const isDefensiveBack = ["CB", "FS", "SS"].includes(positionCode);

  return {
    playerId: `${positionCode.toLowerCase()}-${index}`,
    teamId: isDefenseFront || isLinebacker || isDefensiveBack ? "DEF" : "OFF",
    positionCode,
    lineOfScrimmageSide:
      index % 3 === 0 ? "LEFT" : index % 3 === 1 ? "MIDDLE" : "RIGHT",
    fieldAlignment: isOffenseLine || isDefenseFront ? "CORE" : "BACKFIELD",
    alignmentIndex: index,
    onLineOfScrimmage: isOffenseLine || isDefenseFront,
    inBackfield: !isOffenseLine && !isDefenseFront,
    snapRole: isDefenseFront
      ? "DEFENSIVE_FRONT"
      : isLinebacker
        ? "DEFENSIVE_BOX"
        : isDefensiveBack
          ? "DEFENSIVE_SECONDARY"
          : positionCode === "QB"
            ? "BACKFIELD_QB"
            : isOffenseLine
              ? "INTERIOR_LINE"
              : "BACKFIELD_SKILL",
    receiverDeclaration: "AUTO",
    motion: {
      type: "NONE",
      isInMotionAtSnap: false,
      directionAtSnap: "STATIONARY",
      startedFromSetPosition: true,
    },
    ...overrides,
  };
}

function assignment(
  id: string,
  positionCodes: string[],
  assignmentType: PlayAssignment["assignmentType"],
): PlayAssignment {
  return {
    roleId: id,
    positionCodes,
    assignmentType,
    responsibility: id,
    landmark: null,
    readId: null,
  };
}

function offensePlay(input: {
  family?: OffensivePlayDefinition["family"];
  expectedYards?: number;
  assignments?: PlayAssignment[];
  extraPlayers?: PlayerAlignmentSnapshot[];
} = {}): OffensivePlayDefinition {
  const family = input.family ?? "DROPBACK";
  const offensePlayers = [
    player("LT", 1, { lineOfScrimmageSide: "LEFT" }),
    player("LG", 2, { lineOfScrimmageSide: "LEFT" }),
    player("C", 3, { lineOfScrimmageSide: "MIDDLE" }),
    player("RG", 4, { lineOfScrimmageSide: "RIGHT" }),
    player("RT", 5, { lineOfScrimmageSide: "RIGHT" }),
    player("QB", 6),
    ...(input.extraPlayers ?? []),
  ];

  return {
    id: `qa-off-${family.toLowerCase()}-${input.expectedYards ?? 6}`,
    family,
    side: "OFFENSE",
    label: family,
    supportedRulesets: ["NFL_PRO"],
    situationTags: ["BASE"],
    triggers: [],
    reads: [],
    assignments: input.assignments ?? [],
    expectedMetrics: {
      efficiencyRate: 0.48,
      explosiveRate: family === "DROPBACK" ? 0.18 : 0.08,
      turnoverSwingRate: 0.05,
      pressureRate: family === "DROPBACK" ? 0.32 : 0.18,
      expectedYards: input.expectedYards ?? 6,
      redZoneValue: 0.45,
    },
    counters: [],
    audibles: [],
    legalityTemplate: {
      formation: {
        id: "qa-off-formation",
        familyId: "gun",
        side: "OFFENSE",
        label: "Gun",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "qa-off-personnel",
        side: "OFFENSE",
        label: "11",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "qa-def-personnel",
        side: "DEFENSE",
        label: "Nickel",
        entries: [],
        totalPlayers: 11,
      },
      offenseShift: {
        playersShifted: [],
        allPlayersSetForSeconds: 1,
        wasResetAfterShift: true,
      },
      offensePlayers,
      defensePlayers: [],
    },
    structure: {
      formationFamilyId: "gun",
      personnelPackageId: "qa-off-personnel",
      conceptFamilyId: `concept-${family.toLowerCase()}`,
      motionFamilyIds: [],
      protectionFamilyId: "protection-base",
    },
  };
}

function defensePlay(input: {
  family?: DefensivePlayDefinition["family"];
  pressureCodes?: string[];
  includeSecondLinebacker?: boolean;
  extraPlayers?: PlayerAlignmentSnapshot[];
  assignments?: PlayAssignment[];
} = {}): DefensivePlayDefinition {
  const family = input.family ?? "MAN_COVERAGE";
  const pressureAssignments = input.pressureCodes?.length
    ? [assignment("pressure", input.pressureCodes, "PRESSURE")]
    : [];
  const defensePlayers = [
    player("LE", 1, { lineOfScrimmageSide: "LEFT" }),
    player("DT", 2, { lineOfScrimmageSide: "MIDDLE" }),
    player("DT", 3, { lineOfScrimmageSide: "MIDDLE" }),
    player("RE", 4, { lineOfScrimmageSide: "RIGHT" }),
    player("MLB", 5),
    ...(input.includeSecondLinebacker === false ? [] : [player("LOLB", 6)]),
    player("ROLB", 7),
    player("CB", 8),
    player("CB", 9),
    player("FS", 10),
    player("SS", 11),
    ...(input.extraPlayers ?? []),
  ];

  return {
    id: `qa-def-${family.toLowerCase()}`,
    family,
    side: "DEFENSE",
    label: family,
    supportedRulesets: ["NFL_PRO"],
    situationTags: ["BASE"],
    triggers: [],
    reads: [],
    assignments: [...pressureAssignments, ...(input.assignments ?? [])],
    expectedMetrics: {
      efficiencyRate: 0.44,
      explosiveRate: 0.09,
      turnoverSwingRate: 0.07,
      pressureRate: 0.28,
      expectedYards: 5,
      redZoneValue: 0.42,
    },
    counters: [],
    audibles: [],
    legalityTemplate: {
      formation: {
        id: "qa-def-formation",
        familyId: "nickel",
        side: "DEFENSE",
        label: "Nickel",
        strength: "BALANCED",
        spacing: "NORMAL",
        tags: [],
      },
      offensePersonnel: {
        id: "qa-off-personnel",
        side: "OFFENSE",
        label: "11",
        entries: [],
        totalPlayers: 11,
      },
      defensePersonnel: {
        id: "qa-def-personnel",
        side: "DEFENSE",
        label: "Nickel",
        entries: [],
        totalPlayers: 11,
      },
      offenseShift: {
        playersShifted: [],
        allPlayersSetForSeconds: 1,
        wasResetAfterShift: true,
      },
      offensePlayers: [],
      defensePlayers,
    },
    structure: {
      formationFamilyId: "nickel",
      personnelPackageId: "qa-def-personnel",
      frontFamilyId: "front-even",
      coverageFamilyId: "coverage",
      pressureFamilyId: input.pressureCodes?.length ? "pressure" : null,
      coverageShell: family === "ZERO_PRESSURE" ? "ZERO" : "ONE_HIGH",
      pressurePresentation: input.pressureCodes?.length ? "FIVE_MAN" : "FOUR_MAN",
      defensiveConceptTag: null,
    },
  };
}

function summarizeDecisionOutcomes(
  outcomes: ReturnType<typeof resolveQuarterbackDecisionTime>[],
): OutcomeRates {
  return {
    passAttemptRate: rate(outcomes.filter((outcome) => outcome.outcome === "PASS_ATTEMPT").length, outcomes.length),
    throwawayRate: rate(outcomes.filter((outcome) => outcome.outcome === "THROWAWAY").length, outcomes.length),
    scrambleRate: rate(outcomes.filter((outcome) => outcome.outcome === "SCRAMBLE").length, outcomes.length),
    sackRate: rate(outcomes.filter((outcome) => outcome.outcome === "SACK").length, outcomes.length),
    sackFumbleRate: rate(outcomes.filter((outcome) => outcome.outcome === "SACK_FUMBLE").length, outcomes.length),
  };
}

function runDecisionSeries(input: {
  id: string;
  offense: OffensivePlayDefinition;
  protection: ReturnType<typeof resolvePassProtection>;
  qbPocketPresence: number;
  qbAwareness: number;
  qbDecisionMaking: number;
  qbCommand: number;
  qbMobility?: number;
}) {
  return Array.from({ length: SPECIAL_TEST_ITERATIONS }, (_, index) =>
    resolveQuarterbackDecisionTime({
      offensePlay: input.offense,
      passProtection: input.protection,
      qbPocketPresence: input.qbPocketPresence,
      qbAwareness: input.qbAwareness,
      qbDecisionMaking: input.qbDecisionMaking,
      qbCommand: input.qbCommand,
      qbMobility: input.qbMobility ?? 70,
      decisionSeed: `${input.id}-${index + 1}`,
    }),
  );
}

function buildChemistryState(input: {
  weeks: number;
  usagesForWeek: (week: number) => ChemistryGroupUsage[];
}) {
  let state: ChemistryState = createEmptyChemistryState();

  for (let week = 1; week <= input.weeks; week += 1) {
    state = updateChemistryAfterGame({
      state,
      usages: input.usagesForWeek(week),
      context: {
        seasonYear: 2026,
        week,
      },
    });
  }

  return state;
}

function baseSituation(): GameSituationSnapshot {
  const rules = resolveCompetitionRuleProfile("NFL_PRO");

  return {
    ruleset: "NFL_PRO",
    hashMarkProfile: rules.hashMarks,
    quarter: 4,
    down: 3,
    yardsToGo: 7,
    ballOnYardLine: 78,
    distanceBucket: "MEDIUM",
    fieldZone: "LOW_RED_ZONE",
    clockBucket: "TWO_MINUTE",
    scoreBucket: "TRAILING",
    offenseScore: 21,
    defenseScore: 24,
    secondsRemainingInQuarter: 118,
    secondsRemainingInGame: 118,
    offenseTimeouts: 2,
    defenseTimeouts: 2,
    tempoProfile: "TWO_MINUTE",
    possessionTeamId: "OFF",
    defenseTeamId: "DEF",
  };
}

function runSpecialTests(): SpecialTestResult[] {
  const deepDropback = offensePlay({ family: "DROPBACK", expectedYards: 12 });
  const screen = offensePlay({ family: "SCREEN", expectedYards: 1 });
  const passBlitz = defensePlay({ family: "ZERO_PRESSURE", pressureCodes: ["MLB", "CB"] });
  const normalPassRush = defensePlay({ family: "MAN_COVERAGE" });
  const strongRushWeakLine = resolvePassProtection({
    offensePlay: deepDropback,
    defensePlay: passBlitz,
    passBlocking: 54,
    passRush: 92,
    qbPocketPresence: 58,
    qbAwareness: 56,
  });
  const weakRushStrongLine = resolvePassProtection({
    offensePlay: deepDropback,
    defensePlay: normalPassRush,
    passBlocking: 92,
    passRush: 54,
    qbPocketPresence: 84,
    qbAwareness: 84,
  });
  const strongRushDecision = runDecisionSeries({
    id: "strong-rush-weak-ol",
    offense: deepDropback,
    protection: strongRushWeakLine,
    qbPocketPresence: 58,
    qbAwareness: 56,
    qbDecisionMaking: 58,
    qbCommand: 55,
    qbMobility: 62,
  });
  const weakRushDecision = runDecisionSeries({
    id: "weak-rush-strong-ol",
    offense: deepDropback,
    protection: weakRushStrongLine,
    qbPocketPresence: 84,
    qbAwareness: 84,
    qbDecisionMaking: 84,
    qbCommand: 84,
    qbMobility: 74,
  });
  const strongRushRates = summarizeDecisionOutcomes(strongRushDecision);
  const weakRushRates = summarizeDecisionOutcomes(weakRushDecision);

  const pressResults = Array.from({ length: SPECIAL_TEST_ITERATIONS }, (_, index) =>
    resolvePressCoverage({
      routeType: index % 2 === 0 ? "GO" : "QUICK_SLANT",
      defender: {
        press: 88,
        manCoverage: 86,
        speed: 86,
        acceleration: 86,
      },
      receiver: {
        release: 94,
        routeRunning: 93,
        separation: 92,
        speed: 94,
        acceleration: 94,
      },
      coverageShell: "ZERO",
      defenseFamily: "ZERO_PRESSURE",
      safetyHelp: false,
      qbTiming: 0.72,
      pressSeed: `press-heavy-elite-wr-${index + 1}`,
    }),
  );
  const pressWins = pressResults.filter((result) => result.outcome === "PRESS_WIN").length;
  const pressPunished = pressResults.filter(
    (result) => result.outcome === "RELEASE_WIN" || result.outcome === "STACKED_OVER_TOP",
  ).length;

  const deepVsBlitzProtection = resolvePassProtection({
    offensePlay: deepDropback,
    defensePlay: passBlitz,
    passBlocking: 72,
    passRush: 82,
    qbPocketPresence: 72,
    qbAwareness: 72,
  });
  const screenVsBlitzProtection = resolvePassProtection({
    offensePlay: screen,
    defensePlay: passBlitz,
    passBlocking: 72,
    passRush: 82,
    qbPocketPresence: 72,
    qbAwareness: 72,
  });
  const deepVsBlitzOutcomes = runDecisionSeries({
    id: "deep-vs-blitz",
    offense: deepDropback,
    protection: deepVsBlitzProtection,
    qbPocketPresence: 72,
    qbAwareness: 72,
    qbDecisionMaking: 72,
    qbCommand: 72,
  });
  const screenVsBlitzOutcomes = runDecisionSeries({
    id: "screen-vs-blitz",
    offense: screen,
    protection: screenVsBlitzProtection,
    qbPocketPresence: 72,
    qbAwareness: 72,
    qbDecisionMaking: 72,
    qbCommand: 72,
  });
  const deepVsBlitzRates = summarizeDecisionOutcomes(deepVsBlitzOutcomes);
  const screenVsBlitzRates = summarizeDecisionOutcomes(screenVsBlitzOutcomes);

  const strongRun = resolveRunLane({
    offensePlay: offensePlay({
      family: "GAP_RUN",
      extraPlayers: [player("TE", 7), player("FB", 8)],
    }),
    defensePlay: defensePlay({ family: "ZONE_COVERAGE", includeSecondLinebacker: false }),
    runBlocking: 92,
    strength: 91,
    toughness: 90,
    rbVision: 90,
    rbElusiveness: 86,
    rbBreakTackle: 91,
    defenseRunDefense: 58,
    blockShedding: 56,
    tackling: 58,
    playRecognition: 57,
    gameplanRunDirection: "INSIDE",
  });
  const weakRun = resolveRunLane({
    offensePlay: offensePlay({
      family: "GAP_RUN",
      extraPlayers: [player("TE", 7)],
    }),
    defensePlay: defensePlay({
      family: "RUN_BLITZ",
      extraPlayers: [player("SS", 12, { fieldAlignment: "CORE", snapRole: "DEFENSIVE_BOX" })],
    }),
    runBlocking: 54,
    strength: 56,
    toughness: 57,
    rbVision: 58,
    rbElusiveness: 58,
    rbBreakTackle: 59,
    defenseRunDefense: 92,
    blockShedding: 91,
    tackling: 90,
    playRecognition: 92,
    gameplanRunDirection: "INSIDE",
  });

  const highCommandProtection = resolvePassProtection({
    offensePlay: deepDropback,
    defensePlay: passBlitz,
    passBlocking: 68,
    passRush: 82,
    qbPocketPresence: 88,
    qbAwareness: 88,
  });
  const lowCommandProtection = resolvePassProtection({
    offensePlay: deepDropback,
    defensePlay: passBlitz,
    passBlocking: 68,
    passRush: 82,
    qbPocketPresence: 52,
    qbAwareness: 52,
  });
  const highCommandOutcomes = runDecisionSeries({
    id: "high-qb-command",
    offense: deepDropback,
    protection: highCommandProtection,
    qbPocketPresence: 88,
    qbAwareness: 88,
    qbDecisionMaking: 90,
    qbCommand: 92,
    qbMobility: 78,
  });
  const lowCommandOutcomes = runDecisionSeries({
    id: "low-qb-command",
    offense: deepDropback,
    protection: lowCommandProtection,
    qbPocketPresence: 52,
    qbAwareness: 52,
    qbDecisionMaking: 50,
    qbCommand: 48,
    qbMobility: 58,
  });
  const highCommandRates = summarizeDecisionOutcomes(highCommandOutcomes);
  const lowCommandRates = summarizeDecisionOutcomes(lowCommandOutcomes);

  const stableLine = ["lt", "lg", "c", "rg", "rt"];
  const rotatingLines = [
    ["lt", "lg", "c", "rg", "rt"],
    ["lt", "lg", "c", "rg", "rt2"],
    ["lt", "lg2", "c", "rg", "rt2"],
    ["lt2", "lg2", "c", "rg", "rt2"],
    ["lt2", "lg2", "c2", "rg", "rt2"],
    ["lt2", "lg2", "c2", "rg2", "rt2"],
    ["lt3", "lg2", "c2", "rg2", "rt2"],
    ["lt3", "lg3", "c2", "rg2", "rt2"],
  ];
  const stableChemistry = buildChemistryState({
    weeks: 8,
    usagesForWeek: () => [
      { type: "OFFENSIVE_LINE", teamId: "TEAM", playerIds: stableLine, snaps: 64 },
      { type: "QB_WR", teamId: "TEAM", playerIds: ["qb-1", "wr-1"], snaps: 42 },
      { type: "DEFENSIVE_BACK", teamId: "TEAM", playerIds: ["cb-1", "cb-2", "fs-1", "ss-1"], snaps: 58 },
    ],
  });
  const rotatingChemistry = buildChemistryState({
    weeks: 8,
    usagesForWeek: (week) => [
      { type: "OFFENSIVE_LINE", teamId: "TEAM", playerIds: rotatingLines[week - 1], snaps: 64 },
      { type: "QB_WR", teamId: "TEAM", playerIds: ["qb-1", `wr-${week}`], snaps: 42 },
      { type: "DEFENSIVE_BACK", teamId: "TEAM", playerIds: [`cb-${week}`, "cb-2", "fs-1", "ss-1"], snaps: 58 },
    ],
  });
  const stableModifiers = calculateUnitChemistryModifiers({
    state: stableChemistry,
    teamId: "TEAM",
    offensiveLinePlayerIds: stableLine,
    qbReceiverPlayerIds: ["qb-1", "wr-1"],
    defensiveBackPlayerIds: ["cb-1", "cb-2", "fs-1", "ss-1"],
  });
  const rotatingModifiers = calculateUnitChemistryModifiers({
    state: rotatingChemistry,
    teamId: "TEAM",
    offensiveLinePlayerIds: rotatingLines[7],
    qbReceiverPlayerIds: ["qb-1", "wr-8"],
    defensiveBackPlayerIds: ["cb-8", "cb-2", "fs-1", "ss-1"],
  });

  const goodCoach = resolveHeadCoachMomentum({
    headCoach: {
      motivation: 91,
      stability: 93,
      bigPicture: 90,
      riskControl: 88,
      teamDiscipline: 89,
    },
    situation: baseSituation(),
    recentEvents: [
      { type: "SACK", sequence: 1 },
      { type: "DROP", sequence: 2 },
      { type: "INTERCEPTION", sequence: 3 },
    ],
    unsuccessfulDriveStreak: 2,
  });
  const poorCoach = resolveHeadCoachMomentum({
    headCoach: {
      motivation: 48,
      stability: 45,
      bigPicture: 50,
      riskControl: 47,
      teamDiscipline: 49,
    },
    situation: baseSituation(),
    recentEvents: [
      { type: "SACK", sequence: 1 },
      { type: "DROP", sequence: 2 },
      { type: "INTERCEPTION", sequence: 3 },
    ],
    unsuccessfulDriveStreak: 2,
  });

  const passRushCheck = strongRushWeakLine.pressureLevel > weakRushStrongLine.pressureLevel;
  const blitzCounterCheck =
    screenVsBlitzProtection.pressureLevel < deepVsBlitzProtection.pressureLevel &&
    screenVsBlitzRates.sackRate <= deepVsBlitzRates.sackRate;
  const runCheck = strongRun.openLaneChance > weakRun.openLaneChance && weakRun.stuffedRisk > strongRun.stuffedRisk;
  const commandCheck =
    average(highCommandOutcomes.map((outcome) => outcome.sackRisk)) <
    average(lowCommandOutcomes.map((outcome) => outcome.sackRisk));
  const chemistryCheck =
    stableModifiers.offensiveLine.passProtectionBonus >
      rotatingModifiers.offensiveLine.passProtectionBonus &&
    stableModifiers.qbReceiver.catchWindowModifier >
      rotatingModifiers.qbReceiver.catchWindowModifier;
  const coachingCheck = goodCoach.errorChainRisk < poorCoach.errorChainRisk;

  return [
    {
      id: "strong-pass-rush-vs-weak-ol",
      label: "Starker Pass Rush vs schwache OL",
      category: "Pass Protection",
      iterations: SPECIAL_TEST_ITERATIONS,
      metrics: {
        pressureLevel: strongRushWeakLine.pressureLevel,
        openBlitzLaneRisk: strongRushWeakLine.openBlitzLaneRisk,
        pocketStability: strongRushWeakLine.pocketStability,
        sackRate: strongRushRates.sackRate,
        throwawayRate: strongRushRates.throwawayRate,
        scrambleRate: strongRushRates.scrambleRate,
      },
      verdict: passRushCheck ? "GRUEN" : "ROT",
      explanation: "Elite Rush gegen schwache Protection erzeugt sichtbar mehr Druck und Katastrophenrisiko.",
    },
    {
      id: "weak-pass-rush-vs-strong-ol",
      label: "Schwacher Pass Rush vs starke OL",
      category: "Pass Protection",
      iterations: SPECIAL_TEST_ITERATIONS,
      metrics: {
        pressureLevel: weakRushStrongLine.pressureLevel,
        doubleTeamChance: weakRushStrongLine.doubleTeamChance,
        pocketStability: weakRushStrongLine.pocketStability,
        sackRate: weakRushRates.sackRate,
        passAttemptRate: weakRushRates.passAttemptRate,
      },
      verdict: passRushCheck ? "GRUEN" : "ROT",
      explanation: "Starke OL reduziert Pressure und erlaubt stabilere Passversuche.",
    },
    {
      id: "press-heavy-defense-vs-elite-wr",
      label: "Press-heavy Defense vs Elite WR",
      category: "Coverage",
      iterations: SPECIAL_TEST_ITERATIONS,
      metrics: {
        pressWinRate: rate(pressWins, SPECIAL_TEST_ITERATIONS),
        releaseOrStackRate: rate(pressPunished, SPECIAL_TEST_ITERATIONS),
        avgTimingDisruption: round(average(pressResults.map((result) => result.timingDisruption)), 3),
        avgBigPlayRiskDelta: round(average(pressResults.map((result) => result.bigPlayRiskDelta)), 3),
      },
      verdict: pressWins > 0 && pressPunished > 0 ? "GRUEN" : "ROT",
      explanation: "Press gewinnt nicht automatisch; Elite-WR kann Press bestrafen.",
    },
    {
      id: "blitz-heavy-defense-vs-screen-gameplan",
      label: "Blitz-heavy Defense vs Screen Gameplan",
      category: "Gameplan",
      iterations: SPECIAL_TEST_ITERATIONS,
      metrics: {
        deepPressureLevel: deepVsBlitzProtection.pressureLevel,
        screenPressureLevel: screenVsBlitzProtection.pressureLevel,
        deepSackRate: deepVsBlitzRates.sackRate,
        screenSackRate: screenVsBlitzRates.sackRate,
        screenPassAttemptRate: screenVsBlitzRates.passAttemptRate,
      },
      verdict: blitzCounterCheck ? "GRUEN" : "ROT",
      explanation: "Screen/Quick-Timing kontert Blitz messbar, aber ohne Druck komplett zu neutralisieren.",
    },
    {
      id: "strong-run-offense-vs-weak-box",
      label: "Starke OL/RB Run Offense vs schwache Box",
      category: "Run Game",
      iterations: 1,
      metrics: {
        blockerCount: strongRun.blockerCount,
        boxDefenderCount: strongRun.boxDefenderCount,
        laneQuality: strongRun.laneQuality,
        openLaneChance: strongRun.openLaneChance,
        stuffedRisk: strongRun.stuffedRisk,
        expectedYardsModifier: strongRun.expectedYardsModifier,
      },
      verdict: runCheck ? "GRUEN" : "ROT",
      explanation: "Starke Run-Unit erzeugt bessere Lane Quality und Open-Lane-Chancen.",
    },
    {
      id: "weak-ol-vs-strong-run-defense",
      label: "Schwache OL vs starke Run Defense",
      category: "Run Game",
      iterations: 1,
      metrics: {
        blockerCount: weakRun.blockerCount,
        boxDefenderCount: weakRun.boxDefenderCount,
        laneQuality: weakRun.laneQuality,
        stuffedRisk: weakRun.stuffedRisk,
        negativeYardageRisk: weakRun.negativeYardageRisk,
        expectedYardsModifier: weakRun.expectedYardsModifier,
      },
      verdict: runCheck ? "GRUEN" : "ROT",
      explanation: "Starke Box erhöht Stuff- und Negative-Play-Risiko sichtbar.",
    },
    {
      id: "high-qb-command-vs-low-qb-command",
      label: "Hoher QB Command vs niedriger QB Command",
      category: "QB Decision",
      iterations: SPECIAL_TEST_ITERATIONS,
      metrics: {
        highCommandAvgDecisionTime: round(average(highCommandOutcomes.map((outcome) => outcome.availableDecisionTime)), 3),
        lowCommandAvgDecisionTime: round(average(lowCommandOutcomes.map((outcome) => outcome.availableDecisionTime)), 3),
        highCommandSackRisk: round(average(highCommandOutcomes.map((outcome) => outcome.sackRisk)), 3),
        lowCommandSackRisk: round(average(lowCommandOutcomes.map((outcome) => outcome.sackRisk)), 3),
        highCommandThrowawayRate: highCommandRates.throwawayRate,
        lowCommandSackRate: lowCommandRates.sackRate,
      },
      verdict: commandCheck ? "GRUEN" : "ROT",
      explanation: "QB Command/Awareness/Decision reduziert Sack-Risiko und verbessert Druckmanagement.",
    },
    {
      id: "good-chemistry-vs-bad-chemistry",
      label: "Gute Chemistry vs schlechte Chemistry",
      category: "Chemistry",
      iterations: 8,
      metrics: {
        stableLineChemistry: stableModifiers.offensiveLine.chemistry,
        rotatingLineChemistry: rotatingModifiers.offensiveLine.chemistry,
        stablePassProtectionBonus: stableModifiers.offensiveLine.passProtectionBonus,
        rotatingPassProtectionBonus: rotatingModifiers.offensiveLine.passProtectionBonus,
        stableCatchWindowModifier: stableModifiers.qbReceiver.catchWindowModifier,
        rotatingCatchWindowModifier: rotatingModifiers.qbReceiver.catchWindowModifier,
        stableCoverageSupportModifier: stableModifiers.defensiveBack.coverageSupportModifier,
        rotatingCoverageSupportModifier: rotatingModifiers.defensiveBack.coverageSupportModifier,
      },
      verdict: chemistryCheck ? "GRUEN" : "ROT",
      explanation: "Stabile Gruppen erhalten kleine messbare Vorteile, ohne Haupt-Ratings zu ersetzen.",
    },
    {
      id: "coaching-after-negative-events",
      label: "Coaching-Einfluss nach negativen Events",
      category: "Coaching",
      iterations: 1,
      metrics: {
        goodCoachStabilization: goodCoach.coachStabilization,
        poorCoachStabilization: poorCoach.coachStabilization,
        goodCoachErrorChainRisk: goodCoach.errorChainRisk,
        poorCoachErrorChainRisk: poorCoach.errorChainRisk,
        goodCoachCollapseRisk: goodCoach.collapseRisk,
        poorCoachCollapseRisk: poorCoach.collapseRisk,
      },
      verdict: coachingCheck ? "GRUEN" : "ROT",
      explanation: "Guter Head Coach stabilisiert nach negativen Sequenzen messbar staerker.",
    },
  ];
}

function tierSummary(standings: StandingRow[]) {
  return (["SCHWACH", "MITTEL", "STARK"] as TeamTier[]).map((tier) => {
    const rows = standings.filter((row) => row.tier === tier);

    return {
      tier,
      teams: rows.length,
      avgWinPct: round(average(rows.map((row) => row.winPct)), 4),
      avgPointDifferential: round(average(rows.map((row) => row.pointDifferential)), 2),
      avgYardsFor: round(average(rows.map((row) => rate(row.yardsFor, row.games))), 2),
      avgSacks: round(average(rows.map((row) => rate(row.sacks, row.games))), 2),
      avgTurnovers: round(average(rows.map((row) => rate(row.turnovers, row.games))), 2),
    };
  });
}

function runLeagueSimulation() {
  const definitionsById = new Map(TEAM_DEFINITIONS.map((definition) => [definition.id, definition]));
  const teams = TEAM_DEFINITIONS.map(buildTeam);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const snapshots = teams.map((team) => {
    const definition = definitionsById.get(team.id);

    if (!definition) {
      throw new Error(`Missing definition for ${team.id}`);
    }

    return ratingSnapshot(definition, team);
  });
  const games: GameRecord[] = [];
  const matchupSummaries: MatchupSummary[] = [];
  let gameNumber = 1;

  for (let teamAIndex = 0; teamAIndex < TEAM_DEFINITIONS.length; teamAIndex += 1) {
    for (let teamBIndex = teamAIndex + 1; teamBIndex < TEAM_DEFINITIONS.length; teamBIndex += 1) {
      const teamADefinition = TEAM_DEFINITIONS[teamAIndex];
      const teamBDefinition = TEAM_DEFINITIONS[teamBIndex];
      const teamA = teamsById.get(teamADefinition.id);
      const teamB = teamsById.get(teamBDefinition.id);

      if (!teamA || !teamB) {
        throw new Error(`Missing teams for ${teamADefinition.id} vs ${teamBDefinition.id}`);
      }

      const matchupId = `${teamADefinition.abbreviation.toLowerCase()}-vs-${teamBDefinition.abbreviation.toLowerCase()}`;
      const matchupGames: GameRecord[] = [];

      for (let matchupGame = 1; matchupGame <= GAMES_PER_MATCHUP; matchupGame += 1) {
        const teamAHome = matchupGame <= GAMES_PER_MATCHUP / 2;
        const homeTeam = teamAHome ? teamA : teamB;
        const awayTeam = teamAHome ? teamB : teamA;
        const gameId = `qa-new-engine-${matchupId}-${String(matchupGame).padStart(2, "0")}`;
        const seed = `${gameId}-seed`;
        const record = runGame({
          gameId,
          matchupId,
          gameNumber,
          seed,
          homeTeam,
          awayTeam,
          definitionsById,
        });

        games.push(record);
        matchupGames.push(record);
        gameNumber += 1;
      }

      matchupSummaries.push(
        summarizeMatchup({
          matchupId,
          teamA,
          teamB,
          games: matchupGames,
        }),
      );
    }
  }

  const standings = buildStandings(teams, snapshots, games);
  const favoriteGames = games.filter((game) => game.favoriteWon != null);
  const favoriteWins = favoriteGames.filter((game) => game.favoriteWon).length;
  const upsets = favoriteGames.filter((game) => game.favoriteWon === false).length;

  return {
    teams: snapshots,
    games,
    matchupSummaries,
    standings,
    tierSummary: tierSummary(standings),
    leagueChecks: {
      totalGames: games.length,
      expectedGames: 28 * GAMES_PER_MATCHUP,
      favoriteGames: favoriteGames.length,
      favoriteWins,
      favoriteWinRate: rate(favoriteWins, favoriteGames.length),
      upsets,
      upsetRate: rate(upsets, favoriteGames.length),
      maxTeamWinPct: Math.max(...standings.map((row) => row.winPct)),
      minTeamWinPct: Math.min(...standings.map((row) => row.winPct)),
      avgTotalScore: round(average(games.map((game) => game.score.home + game.score.away)), 2),
      avgTotalYards: round(
        average(games.map((game) => game.stats.home.totalYards + game.stats.away.totalYards)),
        2,
      ),
      avgTurnoversPerGame: round(
        average(games.map((game) => game.stats.home.turnovers + game.stats.away.turnovers)),
        2,
      ),
      avgExplosivePlaysPerGame: round(
        average(games.map((game) => game.stats.home.explosivePlays + game.stats.away.explosivePlays)),
        2,
      ),
      avgSacksPerGame: round(
        average(games.map((game) => game.stats.home.sacks + game.stats.away.sacks)),
        2,
      ),
    },
  };
}

function escapeHtml(value: string | number | boolean) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function table(headers: string[], rows: Array<Array<string | number | boolean>>) {
  return `<table><thead><tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
}

function renderHtmlReport(input: {
  league: ReturnType<typeof runLeagueSimulation>;
  specialTests: SpecialTestResult[];
  status: "GRUEN" | "ROT";
  statusChecks: Record<string, boolean>;
}) {
  const statusClass = input.status === "GRUEN" ? "green" : "red";
  const metricRows = Object.entries(input.league.leagueChecks).map(([key, value]) => [
    key,
    value,
  ]);
  const specialRows = input.specialTests.map((test) => [
    test.label,
    test.category,
    test.verdict,
    test.explanation,
  ]);
  const checkRows = Object.entries(input.statusChecks).map(([key, value]) => [
    key,
    value ? "GRUEN" : "ROT",
  ]);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA New Engine Balance Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; background: #f7f8fa; color: #17202a; }
    header { background: #17202a; color: #fff; padding: 28px 36px; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 24px 48px; }
    section { background: #fff; border: 1px solid #d9dee7; border-radius: 8px; padding: 22px; margin: 0 0 18px; }
    h1, h2, h3 { margin: 0 0 14px; }
    p { line-height: 1.55; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th, td { border-bottom: 1px solid #e6e9ef; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #eef2f7; font-weight: 700; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-weight: 700; font-size: 12px; }
    .green { background: #d9f7df; color: #145c2a; }
    .red { background: #ffe1df; color: #8f1d17; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .card { border: 1px solid #d9dee7; border-radius: 8px; padding: 14px; background: #fbfcfe; }
    .muted { color: #5f6b7a; }
    code { background: #eef2f7; border-radius: 4px; padding: 2px 5px; }
  </style>
</head>
<body>
  <header>
    <h1>QA New Engine Balance Report</h1>
    <p>Datum: ${REPORT_DATE} · 8 Teams · jedes Matchup ${GAMES_PER_MATCHUP} Spiele · ${input.league.leagueChecks.totalGames} Spiele gesamt</p>
    <span class="badge ${statusClass}">Status: ${input.status}</span>
  </header>
  <main>
    <section>
      <h2>Executive Summary</h2>
      <p>Die neue Engine wurde mit einer 8-Team-Liga und isolierten Spezialtests fuer Pass Rush, Press Coverage, Blitz-Counter, Run Lanes, QB Command, Chemistry und Coaching gemessen.</p>
      ${table(["Pruefung", "Status"], checkRows)}
    </section>

    <section>
      <h2>Liga-Kennzahlen</h2>
      ${table(["Metrik", "Wert"], metricRows)}
    </section>

    <section>
      <h2>Teamuebersicht</h2>
      ${table(
        ["Team", "Stufe", "OVR", "QB", "RB", "WR", "OL", "DL", "LB", "DB", "Profil"],
        input.league.teams.map((team) => [
          team.name,
          team.tier,
          team.overallRating,
          team.unitRatings.QB,
          team.unitRatings.RB,
          team.unitRatings.WR,
          team.unitRatings.OL,
          team.unitRatings.DL,
          team.unitRatings.LB,
          team.unitRatings.DB,
          team.profile,
        ]),
      )}
    </section>

    <section>
      <h2>Win Records</h2>
      ${table(
        ["Team", "Stufe", "OVR", "W", "L", "T", "Win %", "PF", "PA", "Diff", "Yards For", "Sacks", "Turnovers", "Explosive"],
        input.league.standings.map((row) => [
          row.name,
          row.tier,
          row.overallRating,
          row.wins,
          row.losses,
          row.ties,
          `${round(row.winPct * 100, 1)}%`,
          row.pointsFor,
          row.pointsAgainst,
          row.pointDifferential,
          row.yardsFor,
          row.sacks,
          row.turnovers,
          row.explosivePlays,
        ]),
      )}
    </section>

    <section>
      <h2>Staerkegruppen</h2>
      ${table(
        ["Stufe", "Teams", "Avg Win %", "Avg Point Diff", "Avg Yards/G", "Avg Sacks/G", "Avg Turnovers/G"],
        input.league.tierSummary.map((row) => [
          row.tier,
          row.teams,
          `${round(row.avgWinPct * 100, 1)}%`,
          row.avgPointDifferential,
          row.avgYardsFor,
          row.avgSacks,
          row.avgTurnovers,
        ]),
      )}
    </section>

    <section>
      <h2>Spezialtests</h2>
      ${table(["Test", "Kategorie", "Status", "Interpretation"], specialRows)}
      <h3>Messwerte</h3>
      ${input.specialTests
        .map(
          (test) => `
        <div class="card">
          <h3>${escapeHtml(test.label)}</h3>
          <p class="muted">${escapeHtml(test.explanation)}</p>
          ${table(
            ["Metrik", "Wert"],
            Object.entries(test.metrics).map(([key, value]) => [key, value]),
          )}
        </div>`,
        )
        .join("")}
    </section>

    <section>
      <h2>Matchup-Zusammenfassung</h2>
      ${table(
        ["Matchup", "Spiele", "Record", "Score A", "Score B", "Yards A", "Yards B", "Sacks A", "Sacks B", "Turnovers A", "Turnovers B"],
        input.league.matchupSummaries.map((summary) => [
          summary.label,
          summary.games,
          `${summary.record.teamAWins}-${summary.record.teamBWins}-${summary.record.ties}`,
          summary.averages.teamAScore,
          summary.averages.teamBScore,
          summary.averages.teamAYards,
          summary.averages.teamBYards,
          summary.averages.teamASacks,
          summary.averages.teamBSacks,
          summary.averages.teamATurnovers,
          summary.averages.teamBTurnovers,
        ]),
      )}
    </section>

    <section>
      <h2>Bewertung</h2>
      <p>Favoriten gewinnen im Gesamtlauf haeufiger, Upsets bleiben vorhanden. Die Spezialtests zeigen messbare Effekte der neuen Faktoren: Protection und Pressure veraendern Sack-/Throwaway-Zweige, Screen-Timing wirkt als Blitz-Counter, Press kann gewinnen oder bestraft werden, Run-Lane-Qualitaet verschiebt Stuff- und Open-Lane-Raten, Chemistry und Coaching bleiben kleine Modifier.</p>
      <p>Rohdaten: <code>reports-output/simulations/qa-new-engine-balance-results.json</code></p>
    </section>
  </main>
</body>
</html>`;
}

function writeReports() {
  const reportsDir = resolve(process.cwd(), "reports-output", "simulations");
  mkdirSync(reportsDir, { recursive: true });

  const league = runLeagueSimulation();
  const specialTests = runSpecialTests();
  const statusChecks = {
    scheduleComplete: league.leagueChecks.totalGames === league.leagueChecks.expectedGames,
    favoritesWinMoreOften:
      league.leagueChecks.favoriteWinRate > 0.5 && league.leagueChecks.favoriteWinRate < 0.9,
    upsetsExist: league.leagueChecks.upsets > 0,
    noExtremeExploit:
      league.leagueChecks.maxTeamWinPct < 0.9 && league.leagueChecks.minTeamWinPct > 0.1,
    specialFactorsMeasurable: specialTests.every((test) => test.verdict === "GRUEN"),
    scoringPlausible:
      league.leagueChecks.avgTotalScore >= 28 && league.leagueChecks.avgTotalScore <= 70,
    turnoversPlausible:
      league.leagueChecks.avgTurnoversPerGame >= 0.6 &&
      league.leagueChecks.avgTurnoversPerGame <= 4.5,
  };
  const status = Object.values(statusChecks).every(Boolean) ? "GRUEN" : "ROT";
  const payload = {
    reportDate: REPORT_DATE,
    status,
    statusChecks,
    league,
    specialTests,
  };

  writeFileSync(
    join(reportsDir, "qa-new-engine-balance-results.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(reportsDir, "qa-new-engine-balance-report.html"),
    renderHtmlReport({ league, specialTests, status, statusChecks }),
    "utf8",
  );

  return payload;
}

const result = writeReports();

console.log(
  JSON.stringify(
    {
      status: result.status,
      totalGames: result.league.leagueChecks.totalGames,
      favoriteWinRate: result.league.leagueChecks.favoriteWinRate,
      upsets: result.league.leagueChecks.upsets,
      json: "reports-output/simulations/qa-new-engine-balance-results.json",
      html: "reports-output/simulations/qa-new-engine-balance-report.html",
    },
    null,
    2,
  ),
);
