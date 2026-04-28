import { randomUUID } from "node:crypto";

import { z } from "zod";

import { buildInitialRoster } from "../../../savegames/application/bootstrap/initial-roster";
import { MatchKind } from "../../../shared/domain/enums";

import { generateMatchStats } from "./match-engine";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationStatAnchor,
  SimulationTeamContext,
  TeamSimulationResult,
} from "./simulation.types";

type SimulationApiStatus = "CREATED" | "SIMULATED";

type SimulationApiTeamSide = "home" | "away";

type SimulationApiStoredGame = {
  gameId: string;
  status: SimulationApiStatus;
  teams: {
    home: SimulationApiTeamSummary;
    away: SimulationApiTeamSummary;
  };
  seed: string;
  gameplan: unknown;
  settings: SimulationApiSettings;
  createdAt: string;
  simulatedAt: string | null;
  context: SimulationMatchContext;
  result: MatchSimulationResult | null;
};

type SimulationApiTeamSummary = {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  overallRating: number;
};

type SimulationApiSettings = {
  kind: MatchKind;
  seasonYear: number;
  week: number;
  scheduledAt: string;
};

const teamInputSchema = z.object({
  id: z.string().trim().min(1).max(24),
  city: z.string().trim().min(1).max(80),
  nickname: z.string().trim().min(1).max(80),
  abbreviation: z.string().trim().min(1).max(8),
  overallRating: z.number().int().min(1).max(99).default(75),
  rosterSeed: z.number().int().min(0).max(999).default(0),
});

const createGameInputSchema = z.object({
  gameId: z.string().trim().min(1).max(80).optional(),
  seed: z.string().trim().min(1).max(120).optional(),
  teams: z.object({
    home: teamInputSchema,
    away: teamInputSchema,
  }),
  gameplan: z.unknown().optional(),
  settings: z.object({
    kind: z.nativeEnum(MatchKind).default(MatchKind.REGULAR_SEASON),
    seasonYear: z.number().int().min(1900).max(2200).default(2026),
    week: z.number().int().min(1).max(30).default(1),
    scheduledAt: z.string().datetime().optional(),
  }).default({
    kind: MatchKind.REGULAR_SEASON,
    seasonYear: 2026,
    week: 1,
  }),
});

const gameIdInputSchema = z.object({
  gameId: z.string().trim().min(1),
});

export type CreateSimulationGameInput = z.input<typeof createGameInputSchema>;

export class SimulationApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SimulationApiError";
  }
}

class SimulationGameStore {
  private readonly games = new Map<string, SimulationApiStoredGame>();

  create(game: SimulationApiStoredGame) {
    if (this.games.has(game.gameId)) {
      throw new SimulationApiError("Game already exists", 409, "GAME_ALREADY_EXISTS");
    }

    this.games.set(game.gameId, game);
    return game;
  }

  get(gameId: string) {
    return this.games.get(gameId) ?? null;
  }

  update(game: SimulationApiStoredGame) {
    this.games.set(game.gameId, game);
    return game;
  }

  clear() {
    this.games.clear();
  }
}

const simulationGameStore = new SimulationGameStore();

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
  team: z.output<typeof teamInputSchema>,
): SimulationTeamContext {
  const roster = buildInitialRoster(team.rosterSeed, team.overallRating, 2026).map(
    (seed, index): SimulationPlayerContext => ({
      id: `${team.id}-player-${index}`,
      teamId: team.id,
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
        Object.entries(seed.attributes).filter(
          (entry): entry is [string, number] => entry[1] != null,
        ),
      ),
      gameDayAvailability: "ACTIVE",
      gameDayReadinessMultiplier: 1,
      gameDaySnapMultiplier: 1,
      seasonStat: createStatAnchor(`season-${team.id}-${index}`),
      careerStat: createStatAnchor(`career-${team.id}-${index}`),
    }),
  );

  return {
    id: team.id,
    city: team.city,
    nickname: team.nickname,
    abbreviation: team.abbreviation,
    overallRating: team.overallRating,
    roster,
  };
}

function toTeamSummary(team: SimulationTeamContext): SimulationApiTeamSummary {
  return {
    id: team.id,
    city: team.city,
    nickname: team.nickname,
    abbreviation: team.abbreviation,
    overallRating: team.overallRating,
  };
}

function readGame(gameId: string) {
  const parsed = gameIdInputSchema.safeParse({ gameId });

  if (!parsed.success) {
    throw new SimulationApiError("Invalid gameId", 400, "INVALID_GAME_ID");
  }

  const game = simulationGameStore.get(parsed.data.gameId);

  if (!game) {
    throw new SimulationApiError("Game not found", 404, "GAME_NOT_FOUND");
  }

  return game;
}

function requireSimulatedGame(gameId: string) {
  const game = readGame(gameId);

  if (!game.result) {
    throw new SimulationApiError("Game has not been simulated yet", 409, "GAME_NOT_SIMULATED");
  }

  return {
    game,
    result: game.result,
  };
}

function teamName(team: SimulationApiTeamSummary) {
  return `${team.city} ${team.nickname}`;
}

function resolveWinner(game: SimulationApiStoredGame, result: MatchSimulationResult) {
  if (result.homeScore === result.awayScore) {
    return null;
  }

  const side: SimulationApiTeamSide = result.homeScore > result.awayScore ? "home" : "away";
  const team = game.teams[side];

  return {
    teamId: team.id,
    side,
    name: teamName(team),
    abbreviation: team.abbreviation,
  };
}

function finalScore(result: MatchSimulationResult) {
  return {
    home: result.homeScore,
    away: result.awayScore,
  };
}

function rosterByPlayerId(game: SimulationApiStoredGame) {
  return new Map(
    [
      ...game.context.homeTeam.roster,
      ...game.context.awayTeam.roster,
    ].map((player) => [player.id, player]),
  );
}

function teamSide(game: SimulationApiStoredGame, teamId: string): SimulationApiTeamSide {
  return game.context.homeTeam.id === teamId ? "home" : "away";
}

function toTeamStats(
  game: SimulationApiStoredGame,
  team: TeamSimulationResult,
) {
  const side = teamSide(game, team.teamId);
  const summary = game.teams[side];

  return {
    teamId: team.teamId,
    side,
    name: teamName(summary),
    abbreviation: summary.abbreviation,
    score: side === "home" ? game.result?.homeScore ?? null : game.result?.awayScore ?? null,
    firstDowns: team.firstDowns,
    totalYards: team.totalYards,
    passingYards: team.passingYards,
    rushingYards: team.rushingYards,
    turnovers: team.turnovers,
    sacks: team.sacks,
    explosivePlays: team.explosivePlays,
    redZoneTrips: team.redZoneTrips,
    redZoneTouchdowns: team.redZoneTouchdowns,
    penalties: team.penalties,
    timeOfPossessionSeconds: team.timeOfPossessionSeconds,
  };
}

function toPlayerStat(
  line: PlayerSimulationLine,
  game: SimulationApiStoredGame,
) {
  const rosterPlayer = rosterByPlayerId(game).get(line.playerId);

  return {
    playerId: line.playerId,
    teamId: line.teamId,
    teamAbbreviation: game.teams[teamSide(game, line.teamId)].abbreviation,
    name: rosterPlayer ? `${rosterPlayer.firstName} ${rosterPlayer.lastName}` : line.playerId,
    positionCode: rosterPlayer?.positionCode ?? "n/a",
    started: line.started,
    snaps: {
      offense: line.snapsOffense,
      defense: line.snapsDefense,
      specialTeams: line.snapsSpecialTeams,
    },
    passing: line.passing,
    rushing: line.rushing,
    receiving: line.receiving,
    blocking: line.blocking,
    defensive: line.defensive,
    kicking: line.kicking,
    punting: line.punting,
    returns: line.returns,
  };
}

function toDriveSummary(drive: MatchDriveResult) {
  return {
    sequence: drive.sequence,
    phaseLabel: drive.phaseLabel,
    offenseTeamId: drive.offenseTeamId,
    offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
    defenseTeamId: drive.defenseTeamId,
    defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
    result: drive.resultType,
    plays: drive.plays,
    totalYards: drive.totalYards,
    pointsScored: drive.pointsScored,
    scoreAfterDrive: {
      home: drive.endedHomeScore,
      away: drive.endedAwayScore,
    },
    summary: drive.summary,
  };
}

function toDriveLogEntry(drive: MatchDriveResult) {
  return {
    sequence: drive.sequence,
    phaseLabel: drive.phaseLabel,
    offenseTeamId: drive.offenseTeamId,
    offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
    defenseTeamId: drive.defenseTeamId,
    defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
    startFieldPosition: drive.startFieldPosition,
    endFieldPosition: drive.highestReachedFieldPosition,
    highestReachedFieldPosition: drive.highestReachedFieldPosition,
    result: drive.resultType,
    plays: drive.plays,
    passAttempts: drive.passAttempts,
    rushAttempts: drive.rushAttempts,
    totalYards: drive.totalYards,
    turnover: drive.turnover,
    redZoneTrip: drive.redZoneTrip,
    scoreBeforeDrive: {
      home: drive.startedHomeScore,
      away: drive.startedAwayScore,
    },
    scoreAfterDrive: {
      home: drive.endedHomeScore,
      away: drive.endedAwayScore,
    },
    importantEvents: [
      drive.pointsScored > 0 ? `${drive.pointsScored} points` : null,
      drive.turnover ? "turnover" : null,
      drive.redZoneTrip ? "red-zone trip" : null,
      drive.fourthDownDecision ? `fourth down: ${drive.fourthDownDecision}` : null,
      drive.primaryPlayerName ? `primary player: ${drive.primaryPlayerName}` : null,
      drive.primaryDefenderName ? `primary defender: ${drive.primaryDefenderName}` : null,
    ].filter((event): event is string => event != null),
    summary: drive.summary,
  };
}

function pickLeader<T>(
  items: T[],
  scoreOf: (item: T) => number,
) {
  return [...items]
    .sort((left, right) => scoreOf(right) - scoreOf(left))
    .find((item) => scoreOf(item) > 0) ?? null;
}

function summarizeResult(game: SimulationApiStoredGame, result: MatchSimulationResult) {
  const winner = resolveWinner(game, result);
  const loserSide: SimulationApiTeamSide | null =
    winner?.side === "home" ? "away" : winner?.side === "away" ? "home" : null;

  if (!winner || !loserSide) {
    return `${teamName(game.teams.home)} und ${teamName(game.teams.away)} trennen sich ${result.homeScore}-${result.awayScore}.`;
  }

  return `${winner.name} gewinnt ${result.homeScore}-${result.awayScore} gegen ${teamName(game.teams[loserSide])}.`;
}

function buildStatsResponse(game: SimulationApiStoredGame, result: MatchSimulationResult) {
  const teamStats = [
    toTeamStats(game, result.homeTeam),
    toTeamStats(game, result.awayTeam),
  ];
  const playerStats = result.playerLines.map((line) => toPlayerStat(line, game));

  return {
    gameId: game.gameId,
    teamStats,
    playerStats,
    leaders: {
      passing: pickLeader(playerStats, (player) => player.passing.yards),
      rushing: pickLeader(playerStats, (player) => player.rushing.yards),
      receiving: pickLeader(playerStats, (player) => player.receiving.yards),
      defense: pickLeader(
        playerStats,
        (player) =>
          player.defensive.tackles +
          player.defensive.sacks * 4 +
          player.defensive.interceptions * 6,
      ),
      specialTeams: pickLeader(
        playerStats,
        (player) =>
          player.kicking.fieldGoalsMade * 4 +
          player.punting.puntsInside20 * 2 +
          (player.returns.kickReturnYards + player.returns.puntReturnYards) / 20,
      ),
    },
    summary: summarizeResult(game, result),
  };
}

export function createGame(input: CreateSimulationGameInput) {
  const parsed = createGameInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new SimulationApiError(parsed.error.issues[0]?.message ?? "Invalid input", 400, "INVALID_INPUT");
  }

  if (parsed.data.teams.home.id === parsed.data.teams.away.id) {
    throw new SimulationApiError("Home and away teams must be different", 400, "INVALID_TEAMS");
  }

  const gameId = parsed.data.gameId ?? randomUUID();
  const seed = parsed.data.seed ?? `simulation-game-${gameId}`;
  const homeTeam = buildSimulationTeam(parsed.data.teams.home);
  const awayTeam = buildSimulationTeam(parsed.data.teams.away);
  const scheduledAt = parsed.data.settings.scheduledAt ?? new Date().toISOString();
  const createdAt = new Date().toISOString();
  const game: SimulationApiStoredGame = {
    gameId,
    status: "CREATED",
    teams: {
      home: toTeamSummary(homeTeam),
      away: toTeamSummary(awayTeam),
    },
    seed,
    gameplan: parsed.data.gameplan ?? null,
    settings: {
      kind: parsed.data.settings.kind,
      seasonYear: parsed.data.settings.seasonYear,
      week: parsed.data.settings.week,
      scheduledAt,
    },
    createdAt,
    simulatedAt: null,
    context: {
      matchId: gameId,
      saveGameId: "simulation-api",
      seasonId: "simulation-api-season",
      kind: parsed.data.settings.kind,
      simulationSeed: seed,
      seasonYear: parsed.data.settings.seasonYear,
      week: parsed.data.settings.week,
      scheduledAt: new Date(scheduledAt),
      homeTeam,
      awayTeam,
    },
    result: null,
  };

  simulationGameStore.create(game);

  return {
    gameId: game.gameId,
    status: game.status,
    teams: game.teams,
    seed: game.seed,
    createdAt: game.createdAt,
  };
}

export function simulateGame(gameId: string) {
  const game = readGame(gameId);
  const simulatedAt = new Date().toISOString();
  const result = game.result ?? generateMatchStats(game.context);
  const nextGame: SimulationApiStoredGame = {
    ...game,
    status: "SIMULATED",
    simulatedAt,
    result,
  };

  simulationGameStore.update(nextGame);

  return {
    gameId: nextGame.gameId,
    status: nextGame.status,
    finalScore: finalScore(result),
    winner: resolveWinner(nextGame, result),
    simulatedAt,
  };
}

export function getGameResult(gameId: string) {
  const { game, result } = requireSimulatedGame(gameId);
  const stats = buildStatsResponse(game, result);

  return {
    gameId: game.gameId,
    finalScore: finalScore(result),
    winner: resolveWinner(game, result),
    teamStats: stats.teamStats,
    playerStats: stats.playerStats,
    driveSummary: result.drives.map(toDriveSummary),
  };
}

export function getDriveLog(gameId: string) {
  const { game, result } = requireSimulatedGame(gameId);

  return {
    gameId: game.gameId,
    drives: result.drives.map(toDriveLogEntry),
  };
}

export function getStats(gameId: string) {
  const { game, result } = requireSimulatedGame(gameId);

  return buildStatsResponse(game, result);
}

export function resetSimulationApiStoreForTests() {
  simulationGameStore.clear();
}
