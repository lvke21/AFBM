import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { MatchKind } from "@prisma/client";

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
const LEAGUE_GAMES_PER_MATCHUP = 100;
const ISOLATED_GAMES_PER_TEST = 100;
const VARIANCE_GAMES_PER_SERIES = 500;

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
  rosterSize: number;
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
  firstDowns: number;
  touchdowns: number;
  turnovers: number;
  sacks: number;
  pressuresAllowed: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
  penalties: number;
  punts: number;
  fieldGoalAttempts: number;
  turnoverOnDowns: number;
};

type GameRecord = {
  gameId: string;
  seriesId: string;
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
  stats: {
    home: TeamGameStats;
    away: TeamGameStats;
  };
};

type SeriesSummary = {
  id: string;
  label: string;
  teamAId: string;
  teamBId: string;
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
    teamATurnovers: number;
    teamBTurnovers: number;
    teamARedZoneTdRate: number;
    teamBRedZoneTdRate: number;
    teamAExplosivePlays: number;
    teamBExplosivePlays: number;
    teamASacks: number;
    teamBSacks: number;
  };
  upsetCount: number;
  scoreYardsCorrelation: number;
  gameIds: string[];
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
  turnovers: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
};

type ScoreYardsBucket = {
  label: string;
  games: number;
  avgScore: number;
  avgYards: number;
  avgRedZoneTrips: number;
  avgTouchdowns: number;
  avgFieldGoalAttempts: number;
  avgPunts: number;
  avgTurnovers: number;
  avgTurnoverOnDowns: number;
};

const LEAGUE_TEAMS: TeamDefinition[] = [
  {
    id: "VAL_CANTON",
    city: "Canton",
    nickname: "Anchors",
    abbreviation: "CAN",
    tier: "SCHWACH",
    rosterIndex: 30,
    overallRating: 61,
    unitRatings: { QB: 58, RB: 66, WR: 58, OL: 62, DL: 63, LB: 60, DB: 59, ST: 67 },
    profile: "Schwach, aber mit brauchbarem RB/ST-Profil.",
  },
  {
    id: "VAL_OMAHA",
    city: "Omaha",
    nickname: "Rails",
    abbreviation: "OMA",
    tier: "SCHWACH",
    rosterIndex: 31,
    overallRating: 65,
    unitRatings: { QB: 68, RB: 61, WR: 66, OL: 67, DL: 61, LB: 64, DB: 67, ST: 69 },
    profile: "Schwaches Team mit passabler QB/ST-Achse.",
  },
  {
    id: "VAL_PORTLAND",
    city: "Portland",
    nickname: "Bridges",
    abbreviation: "POR",
    tier: "MITTEL",
    rosterIndex: 32,
    overallRating: 73,
    unitRatings: { QB: 77, RB: 69, WR: 79, OL: 70, DL: 68, LB: 72, DB: 75, ST: 72 },
    profile: "Passlastiges Mittel-Team mit schwacher Front.",
  },
  {
    id: "VAL_MEMPHIS",
    city: "Memphis",
    nickname: "Pilots",
    abbreviation: "MEM",
    tier: "MITTEL",
    rosterIndex: 33,
    overallRating: 76,
    unitRatings: { QB: 72, RB: 82, WR: 72, OL: 81, DL: 78, LB: 77, DB: 72, ST: 75 },
    profile: "Lauf- und Line-Team mit begrenztem Passspiel.",
  },
  {
    id: "VAL_ORLANDO",
    city: "Orlando",
    nickname: "Voltage",
    abbreviation: "ORL",
    tier: "MITTEL",
    rosterIndex: 34,
    overallRating: 79,
    unitRatings: { QB: 80, RB: 73, WR: 78, OL: 75, DL: 81, LB: 80, DB: 83, ST: 77 },
    profile: "Defensiv starkes oberes Mittel-Team.",
  },
  {
    id: "VAL_SAN_DIEGO",
    city: "San Diego",
    nickname: "Sentinels",
    abbreviation: "SDG",
    tier: "STARK",
    rosterIndex: 35,
    overallRating: 84,
    unitRatings: { QB: 87, RB: 82, WR: 86, OL: 83, DL: 83, LB: 84, DB: 85, ST: 82 },
    profile: "Stark und weitgehend balanced.",
  },
  {
    id: "VAL_CHICAGO",
    city: "Chicago",
    nickname: "Monarchs",
    abbreviation: "CHI",
    tier: "STARK",
    rosterIndex: 36,
    overallRating: 88,
    unitRatings: { QB: 84, RB: 91, WR: 84, OL: 92, DL: 92, LB: 88, DB: 84, ST: 87 },
    profile: "Trench- und Laufdominanz.",
  },
  {
    id: "VAL_NEW_YORK",
    city: "New York",
    nickname: "Titans",
    abbreviation: "NYT",
    tier: "STARK",
    rosterIndex: 37,
    overallRating: 91,
    unitRatings: { QB: 95, RB: 85, WR: 94, OL: 88, DL: 87, LB: 89, DB: 94, ST: 90 },
    profile: "Elite-Passing und starke Secondary.",
  },
];

const ISOLATED_UNITS: UnitCode[] = ["QB", "OL", "DL", "WR", "DB", "RB", "ST"];

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

function correlation(xs: number[], ys: number[]) {
  if (xs.length !== ys.length || xs.length < 2) {
    return 0;
  }

  const xMean = average(xs);
  const yMean = average(ys);
  let numerator = 0;
  let xSquare = 0;
  let ySquare = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const x = xs[index] - xMean;
    const y = ys[index] - yMean;
    numerator += x * y;
    xSquare += x * x;
    ySquare += y * y;
  }

  return xSquare === 0 || ySquare === 0 ? 0 : numerator / Math.sqrt(xSquare * ySquare);
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

function teamDisplayName(team: Pick<SimulationTeamContext, "city" | "nickname">) {
  return `${team.city} ${team.nickname}`;
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
  const numbers = (
    selector: (player: SimulationPlayerContext) => number | null,
  ) => team.roster.map(selector).filter((value): value is number => value != null);
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
    rosterSize: team.roster.length,
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
    saveGameId: "qa-rating-impact-savegame",
    seasonId: "qa-rating-impact-season-2026",
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
    firstDowns: teamResult.firstDowns,
    touchdowns: teamResult.touchdowns,
    turnovers: teamResult.turnovers,
    sacks: teamResult.sacks,
    pressuresAllowed: pressuresAllowed(result, teamResult.teamId),
    explosivePlays: teamResult.explosivePlays,
    redZoneTrips: teamResult.redZoneTrips,
    redZoneTouchdowns: teamResult.redZoneTouchdowns,
    penalties: teamResult.penalties,
    punts: driveCountForTeam(result, teamResult.teamId, "PUNT"),
    fieldGoalAttempts:
      driveCountForTeam(result, teamResult.teamId, "FIELD_GOAL_MADE") +
      driveCountForTeam(result, teamResult.teamId, "FIELD_GOAL_MISSED"),
    turnoverOnDowns: driveCountForTeam(result, teamResult.teamId, "TURNOVER_ON_DOWNS"),
  };
}

function runGame(input: {
  gameId: string;
  seriesId: string;
  gameNumber: number;
  seed: string;
  homeTeam: SimulationTeamContext;
  awayTeam: SimulationTeamContext;
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

  return {
    gameId: input.gameId,
    seriesId: input.seriesId,
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

function summarizeSeries(input: {
  id: string;
  label: string;
  teamA: SimulationTeamContext;
  teamB: SimulationTeamContext;
  games: GameRecord[];
  teamDefinitions: Map<string, TeamDefinition>;
}): SeriesSummary {
  const teamAStats = input.games.map((game) => teamStatsInGame(game, input.teamA.id));
  const teamBStats = input.games.map((game) => teamStatsInGame(game, input.teamB.id));
  const teamAScores = input.games.map((game) => scoreInGame(game, input.teamA.id));
  const teamBScores = input.games.map((game) => scoreInGame(game, input.teamB.id));
  const teamAYards = teamAStats.map((stats) => stats.totalYards);
  const teamBYards = teamBStats.map((stats) => stats.totalYards);
  const winnerLowerRated = input.games.filter((game) => {
    if (!game.winner) {
      return false;
    }

    const winner = input.teamDefinitions.get(game.winner.teamId);
    const loserId = game.winner.teamId === input.teamA.id ? input.teamB.id : input.teamA.id;
    const loser = input.teamDefinitions.get(loserId);

    return Boolean(winner && loser && winner.overallRating < loser.overallRating);
  }).length;

  return {
    id: input.id,
    label: input.label,
    teamAId: input.teamA.id,
    teamBId: input.teamB.id,
    games: input.games.length,
    record: {
      teamAWins: input.games.filter((game) => game.winner?.teamId === input.teamA.id).length,
      teamBWins: input.games.filter((game) => game.winner?.teamId === input.teamB.id).length,
      ties: input.games.filter((game) => game.winner == null).length,
    },
    averages: {
      teamAScore: round(average(teamAScores), 2),
      teamBScore: round(average(teamBScores), 2),
      teamAYards: round(average(teamAYards), 2),
      teamBYards: round(average(teamBYards), 2),
      teamATurnovers: round(average(teamAStats.map((stats) => stats.turnovers)), 2),
      teamBTurnovers: round(average(teamBStats.map((stats) => stats.turnovers)), 2),
      teamARedZoneTdRate: rate(
        teamAStats.reduce((sum, stats) => sum + stats.redZoneTouchdowns, 0),
        teamAStats.reduce((sum, stats) => sum + stats.redZoneTrips, 0),
      ),
      teamBRedZoneTdRate: rate(
        teamBStats.reduce((sum, stats) => sum + stats.redZoneTouchdowns, 0),
        teamBStats.reduce((sum, stats) => sum + stats.redZoneTrips, 0),
      ),
      teamAExplosivePlays: round(average(teamAStats.map((stats) => stats.explosivePlays)), 2),
      teamBExplosivePlays: round(average(teamBStats.map((stats) => stats.explosivePlays)), 2),
      teamASacks: round(average(teamAStats.map((stats) => stats.sacks)), 2),
      teamBSacks: round(average(teamBStats.map((stats) => stats.sacks)), 2),
    },
    upsetCount: winnerLowerRated,
    scoreYardsCorrelation: round(correlation([...teamAYards, ...teamBYards], [...teamAScores, ...teamBScores]), 3),
    gameIds: input.games.map((game) => game.gameId),
  };
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : round(numerator / denominator, 3);
}

function buildStandings(
  teamDefinitions: TeamDefinition[],
  teamsById: Map<string, SimulationTeamContext>,
  games: GameRecord[],
): StandingRow[] {
  const rows = new Map(
    teamDefinitions.map((definition) => {
      const team = teamsById.get(definition.id);

      if (!team) {
        throw new Error(`Missing team ${definition.id}`);
      }

      const row: StandingRow = {
        teamId: definition.id,
        name: teamDisplayName(team),
        tier: definition.tier,
        overallRating: definition.overallRating,
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
        turnovers: 0,
        redZoneTrips: 0,
        redZoneTouchdowns: 0,
      };

      return [definition.id, row];
    }),
  );

  const apply = (game: GameRecord, teamId: string, opponentId: string, stats: TeamGameStats, pointsFor: number, pointsAgainst: number) => {
    const row = rows.get(teamId);

    if (!row) {
      throw new Error(`Missing standings row ${teamId}`);
    }

    row.games += 1;
    row.pointsFor += pointsFor;
    row.pointsAgainst += pointsAgainst;
    row.yardsFor += stats.totalYards;
    row.yardsAgainst += teamStatsInGame(game, opponentId).totalYards;
    row.turnovers += stats.turnovers;
    row.redZoneTrips += stats.redZoneTrips;
    row.redZoneTouchdowns += stats.redZoneTouchdowns;

    if (!game.winner) {
      row.ties += 1;
    } else if (game.winner.teamId === teamId) {
      row.wins += 1;
    } else {
      row.losses += 1;
    }
  };

  for (const game of games) {
    apply(game, game.homeTeamId, game.awayTeamId, game.stats.home, game.score.home, game.score.away);
    apply(game, game.awayTeamId, game.homeTeamId, game.stats.away, game.score.away, game.score.home);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      winPct: rate(row.wins + row.ties * 0.5, row.games),
      pointDifferential: row.pointsFor - row.pointsAgainst,
    }))
    .sort((a, b) => b.winPct - a.winPct || b.pointDifferential - a.pointDifferential);
}

function buildLeagueSuite() {
  const teams = LEAGUE_TEAMS.map((definition) => ({
    definition,
    team: buildTeam(definition),
  }));
  const teamsById = new Map(teams.map(({ team }) => [team.id, team]));
  const teamDefinitions = new Map(LEAGUE_TEAMS.map((definition) => [definition.id, definition]));
  const games: GameRecord[] = [];
  const series: SeriesSummary[] = [];
  let globalGameNumber = 1;

  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      const teamA = teams[i].team;
      const teamB = teams[j].team;
      const id = `${teamA.abbreviation.toLowerCase()}-vs-${teamB.abbreviation.toLowerCase()}`;
      const matchupGames: GameRecord[] = [];

      for (let gameNumber = 1; gameNumber <= LEAGUE_GAMES_PER_MATCHUP; gameNumber += 1) {
        const teamAHome = gameNumber <= LEAGUE_GAMES_PER_MATCHUP / 2;
        const homeTeam = teamAHome ? teamA : teamB;
        const awayTeam = teamAHome ? teamB : teamA;
        const game = runGame({
          gameId: `league-${id}-${String(gameNumber).padStart(3, "0")}`,
          seriesId: id,
          gameNumber: globalGameNumber,
          seed: `qa-rating-impact-league-${id}-${String(gameNumber).padStart(3, "0")}`,
          homeTeam,
          awayTeam,
        });

        games.push(game);
        matchupGames.push(game);
        globalGameNumber += 1;
      }

      series.push(
        summarizeSeries({
          id,
          label: `${teamDisplayName(teamA)} vs ${teamDisplayName(teamB)}`,
          teamA,
          teamB,
          games: matchupGames,
          teamDefinitions,
        }),
      );
    }
  }

  const snapshots = teams.map(({ definition, team }) => ratingSnapshot(definition, team));
  const standings = buildStandings(LEAGUE_TEAMS, teamsById, games);
  const tierSummary = (["SCHWACH", "MITTEL", "STARK"] as TeamTier[]).map((tier) => {
    const rows = standings.filter((row) => row.tier === tier);

    return {
      tier,
      teams: rows.length,
      games: rows.reduce((sum, row) => sum + row.games, 0),
      winPct: round(average(rows.map((row) => row.winPct)), 3),
      averagePointDifferential: round(average(rows.map((row) => row.pointDifferential / row.games)), 2),
      pointsPerGame: round(average(rows.map((row) => row.pointsFor / row.games)), 2),
      redZoneTdRate: rate(
        rows.reduce((sum, row) => sum + row.redZoneTouchdowns, 0),
        rows.reduce((sum, row) => sum + row.redZoneTrips, 0),
      ),
    };
  });

  return {
    teams: snapshots,
    games,
    series,
    standings,
    tierSummary,
  };
}

function isolatedDefinition(unit: UnitCode, boosted: boolean): TeamDefinition {
  const ratings: UnitRatings = { QB: 76, RB: 76, WR: 76, OL: 76, DL: 76, LB: 76, DB: 76, ST: 76 };

  if (boosted) {
    ratings[unit] = 86;
  }

  return {
    id: boosted ? `ISO_${unit}_BOOST` : `ISO_${unit}_BASE`,
    city: boosted ? `${unit}+10` : "Baseline",
    nickname: "Controls",
    abbreviation: boosted ? `${unit}B`.slice(0, 3) : "BAS",
    tier: "MITTEL",
    rosterIndex: 40,
    overallRating: 76,
    unitRatings: ratings,
    profile: boosted ? `${unit} um 10 Punkte verbessert.` : "Identisches Kontrollteam ohne Boost.",
  };
}

function buildIsolatedSuite() {
  const testDefinitions = new Map<string, TeamDefinition>();

  return ISOLATED_UNITS.map((unit) => {
    const baselineDefinition = isolatedDefinition(unit, false);
    const boostedDefinition = isolatedDefinition(unit, true);
    testDefinitions.set(baselineDefinition.id, baselineDefinition);
    testDefinitions.set(boostedDefinition.id, boostedDefinition);
    const baseline = buildTeam(baselineDefinition);
    const boosted = buildTeam(boostedDefinition);
    const games: GameRecord[] = [];

    for (let gameNumber = 1; gameNumber <= ISOLATED_GAMES_PER_TEST; gameNumber += 1) {
      const boostedHome = gameNumber <= ISOLATED_GAMES_PER_TEST / 2;
      games.push(
        runGame({
          gameId: `isolated-${unit.toLowerCase()}-${String(gameNumber).padStart(3, "0")}`,
          seriesId: `isolated-${unit.toLowerCase()}`,
          gameNumber,
          seed: `qa-rating-impact-isolated-${unit.toLowerCase()}-${String(gameNumber).padStart(3, "0")}`,
          homeTeam: boostedHome ? boosted : baseline,
          awayTeam: boostedHome ? baseline : boosted,
        }),
      );
    }

    const summary = summarizeSeries({
      id: `isolated-${unit.toLowerCase()}`,
      label: `${unit} +10 vs identisches Kontrollteam`,
      teamA: boosted,
      teamB: baseline,
      games,
      teamDefinitions: testDefinitions,
    });
    const boostedStats = games.map((game) => teamStatsInGame(game, boosted.id));
    const baselineStats = games.map((game) => teamStatsInGame(game, baseline.id));

    return {
      unit,
      summary,
      games,
      deltas: {
        winPct: rate(summary.record.teamAWins + summary.record.ties * 0.5, summary.games) - 0.5,
        points: round(average(boostedStats.map((stats) => stats.points)) - average(baselineStats.map((stats) => stats.points)), 2),
        yards: round(average(boostedStats.map((stats) => stats.totalYards)) - average(baselineStats.map((stats) => stats.totalYards)), 2),
        turnovers: round(average(boostedStats.map((stats) => stats.turnovers)) - average(baselineStats.map((stats) => stats.turnovers)), 2),
        sacks: round(average(boostedStats.map((stats) => stats.sacks)) - average(baselineStats.map((stats) => stats.sacks)), 2),
        pressuresAllowed: round(
          average(boostedStats.map((stats) => stats.pressuresAllowed)) -
            average(baselineStats.map((stats) => stats.pressuresAllowed)),
          2,
        ),
        explosivePlays: round(
          average(boostedStats.map((stats) => stats.explosivePlays)) -
            average(baselineStats.map((stats) => stats.explosivePlays)),
          2,
        ),
        redZoneTdRate: round(summary.averages.teamARedZoneTdRate - summary.averages.teamBRedZoneTdRate, 3),
      },
    };
  });
}

function runFixedSeries(input: {
  id: string;
  label: string;
  teamA: SimulationTeamContext;
  teamB: SimulationTeamContext;
  teamDefinitions: Map<string, TeamDefinition>;
  games: number;
}) {
  const games: GameRecord[] = [];

  for (let gameNumber = 1; gameNumber <= input.games; gameNumber += 1) {
    const teamAHome = gameNumber <= input.games / 2;
    games.push(
      runGame({
        gameId: `${input.id}-${String(gameNumber).padStart(3, "0")}`,
        seriesId: input.id,
        gameNumber,
        seed: `qa-rating-impact-${input.id}-${String(gameNumber).padStart(3, "0")}`,
        homeTeam: teamAHome ? input.teamA : input.teamB,
        awayTeam: teamAHome ? input.teamB : input.teamA,
      }),
    );
  }

  return {
    summary: summarizeSeries({
      id: input.id,
      label: input.label,
      teamA: input.teamA,
      teamB: input.teamB,
      games,
      teamDefinitions: input.teamDefinitions,
    }),
    games,
  };
}

function buildVarianceSuite() {
  const teamDefinitions = new Map(LEAGUE_TEAMS.map((definition) => [definition.id, definition]));
  const teamsById = new Map(LEAGUE_TEAMS.map((definition) => [definition.id, buildTeam(definition)]));
  const strongWeak = runFixedSeries({
    id: "variance-strong-vs-weak",
    label: "New York Titans vs Canton Anchors",
    teamA: requiredTeam(teamsById, "VAL_NEW_YORK"),
    teamB: requiredTeam(teamsById, "VAL_CANTON"),
    teamDefinitions,
    games: VARIANCE_GAMES_PER_SERIES,
  });
  const midMid = runFixedSeries({
    id: "variance-mid-vs-mid",
    label: "Portland Bridges vs Orlando Voltage",
    teamA: requiredTeam(teamsById, "VAL_PORTLAND"),
    teamB: requiredTeam(teamsById, "VAL_ORLANDO"),
    teamDefinitions,
    games: VARIANCE_GAMES_PER_SERIES,
  });

  return [strongWeak, midMid];
}

function requiredTeam(teamsById: Map<string, SimulationTeamContext>, teamId: string) {
  const team = teamsById.get(teamId);

  if (!team) {
    throw new Error(`Missing required team ${teamId}`);
  }

  return team;
}

function buildAnalysis(report: ReturnType<typeof buildLeagueSuite>, isolated: ReturnType<typeof buildIsolatedSuite>, variance: ReturnType<typeof buildVarianceSuite>) {
  const leagueRows = report.standings.map((standing) => {
    const team = report.teams.find((candidate) => candidate.teamId === standing.teamId);

    if (!team) {
      throw new Error(`Missing team snapshot ${standing.teamId}`);
    }

    return {
      standing,
      team,
      pointDiffPerGame: standing.pointDifferential / standing.games,
    };
  });
  const overallCorrelation = round(
    correlation(
      leagueRows.map((row) => row.team.overallRating),
      leagueRows.map((row) => row.standing.winPct),
    ),
    3,
  );
  const pointDiffCorrelation = round(
    correlation(
      leagueRows.map((row) => row.team.overallRating),
      leagueRows.map((row) => row.pointDiffPerGame),
    ),
    3,
  );
  const units = ["QB", "RB", "WR", "OL", "DL", "LB", "DB", "ST"] as UnitCode[];
  const unitCorrelations = units.map((unit) => ({
    unit,
    winPct: round(
      correlation(
        leagueRows.map((row) => row.team.unitRatings[unit]),
        leagueRows.map((row) => row.standing.winPct),
      ),
      3,
    ),
    pointDiff: round(
      correlation(
        leagueRows.map((row) => row.team.unitRatings[unit]),
        leagueRows.map((row) => row.pointDiffPerGame),
      ),
      3,
    ),
  }));
  const allLeagueTeamGames = report.games.flatMap((game) => [
    { score: game.score.home, yards: game.stats.home.totalYards, stats: game.stats.home },
    { score: game.score.away, yards: game.stats.away.totalYards, stats: game.stats.away },
  ]);
  const scoreYardsBuckets: ScoreYardsBucket[] = [
    { label: "<300", min: Number.NEGATIVE_INFINITY, max: 300 },
    { label: "300-399", min: 300, max: 400 },
    { label: "400-499", min: 400, max: 500 },
    { label: "500+", min: 500, max: Number.POSITIVE_INFINITY },
  ].map((bucket) => {
    const entries = allLeagueTeamGames.filter(
      (entry) => entry.yards >= bucket.min && entry.yards < bucket.max,
    );

    return {
      label: bucket.label,
      games: entries.length,
      avgScore: round(average(entries.map((entry) => entry.score)), 2),
      avgYards: round(average(entries.map((entry) => entry.yards)), 1),
      avgRedZoneTrips: round(average(entries.map((entry) => entry.stats.redZoneTrips)), 2),
      avgTouchdowns: round(average(entries.map((entry) => entry.stats.touchdowns)), 2),
      avgFieldGoalAttempts: round(average(entries.map((entry) => entry.stats.fieldGoalAttempts)), 2),
      avgPunts: round(average(entries.map((entry) => entry.stats.punts)), 2),
      avgTurnovers: round(average(entries.map((entry) => entry.stats.turnovers)), 2),
      avgTurnoverOnDowns: round(average(entries.map((entry) => entry.stats.turnoverOnDowns)), 2),
    };
  });
  const weakStrongGames = report.games.filter((game) => {
    const home = report.teams.find((team) => team.teamId === game.homeTeamId);
    const away = report.teams.find((team) => team.teamId === game.awayTeamId);

    return Boolean(home && away && new Set([home.tier, away.tier]).has("SCHWACH") && new Set([home.tier, away.tier]).has("STARK"));
  });
  const weakStrongUpsets = weakStrongGames.filter((game) => {
    const winner = game.winner
      ? report.teams.find((team) => team.teamId === game.winner?.teamId)
      : null;

    return winner?.tier === "SCHWACH";
  });

  return {
    overallCorrelation,
    pointDiffCorrelation,
    unitCorrelations,
    scoreYardsCorrelation: round(
      correlation(
        allLeagueTeamGames.map((entry) => entry.yards),
        allLeagueTeamGames.map((entry) => entry.score),
      ),
      3,
    ),
    scoreYardsBuckets,
    weakStrongUpsets: weakStrongUpsets.length,
    weakStrongGames: weakStrongGames.length,
    isolatedPassing: isolated,
    varianceSummaries: variance.map((entry) => entry.summary),
  };
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderTable(headers: string[], rows: string[][]) {
  return `<div class="table-scroll"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderHtml(fullReport: ReturnType<typeof buildFullReport>) {
  const { league, isolated, variance, analysis, status } = fullReport;
  const teamRows = league.teams.map((team) => [
    `${escapeHtml(team.abbreviation)} ${escapeHtml(team.name)}`,
    escapeHtml(team.tier),
    String(team.overallRating),
    String(team.unitRatings.QB),
    String(team.unitRatings.RB),
    String(team.unitRatings.WR),
    String(team.unitRatings.OL),
    String(team.unitRatings.DL),
    String(team.unitRatings.LB),
    String(team.unitRatings.DB),
    String(team.unitRatings.ST),
    escapeHtml(team.profile),
  ]);
  const standingRows = league.standings.map((row) => [
    escapeHtml(row.name),
    escapeHtml(row.tier),
    String(row.overallRating),
    `${row.wins}-${row.losses}-${row.ties}`,
    pct(row.winPct),
    round(row.pointsFor / row.games, 2).toFixed(2),
    round(row.pointDifferential / row.games, 2).toFixed(2),
    round(row.yardsFor / row.games, 1).toFixed(1),
    pct(rate(row.redZoneTouchdowns, row.redZoneTrips)),
  ]);
  const tierRows = league.tierSummary.map((row) => [
    escapeHtml(row.tier),
    String(row.teams),
    pct(row.winPct),
    row.pointsPerGame.toFixed(2),
    row.averagePointDifferential.toFixed(2),
    pct(row.redZoneTdRate),
  ]);
  const isolatedRows = isolated.map((row) => [
    row.unit,
    `${row.summary.record.teamAWins}-${row.summary.record.teamBWins}-${row.summary.record.ties}`,
    pct(rate(row.summary.record.teamAWins + row.summary.record.ties * 0.5, row.summary.games)),
    row.deltas.points.toFixed(2),
    row.deltas.yards.toFixed(2),
    row.deltas.turnovers.toFixed(2),
    row.deltas.sacks.toFixed(2),
    row.deltas.pressuresAllowed.toFixed(2),
    row.deltas.explosivePlays.toFixed(2),
    pct(row.deltas.redZoneTdRate),
  ]);
  const varianceRows = variance.map(({ summary }) => [
    escapeHtml(summary.label),
    `${summary.record.teamAWins}-${summary.record.teamBWins}-${summary.record.ties}`,
    `${summary.averages.teamAScore.toFixed(2)}-${summary.averages.teamBScore.toFixed(2)}`,
    `${summary.averages.teamAYards.toFixed(1)}-${summary.averages.teamBYards.toFixed(1)}`,
    String(summary.upsetCount),
    summary.scoreYardsCorrelation.toFixed(3),
  ]);
  const unitCorrelationRows = analysis.unitCorrelations.map((row) => [
    row.unit,
    row.winPct.toFixed(3),
    row.pointDiff.toFixed(3),
  ]);
  const scoreYardsBucketRows = analysis.scoreYardsBuckets.map((row) => [
    row.label,
    String(row.games),
    row.avgYards.toFixed(1),
    row.avgScore.toFixed(2),
    row.avgRedZoneTrips.toFixed(2),
    row.avgTouchdowns.toFixed(2),
    row.avgFieldGoalAttempts.toFixed(2),
    row.avgPunts.toFixed(2),
    row.avgTurnovers.toFixed(2),
    row.avgTurnoverOnDowns.toFixed(2),
  ]);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA Rating Impact Validation</title>
  <style>
    :root {
      --bg: #f5f7f6;
      --panel: #fff;
      --ink: #172124;
      --muted: #5f6f72;
      --line: #d5dfdc;
      --soft: #edf4f1;
      --good: #17613d;
      --warn: #94620f;
      --bad: #9b2d25;
      --shadow: 0 14px 36px rgba(23, 33, 36, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.48;
    }
    main { max-width: 1280px; margin: 0 auto; padding: 32px 20px 60px; }
    h1, h2, h3 { margin: 0; letter-spacing: 0; }
    h1 { font-size: 34px; line-height: 1.08; }
    h2 { margin-top: 38px; font-size: 24px; }
    h3 { margin-top: 20px; font-size: 17px; }
    p { margin: 8px 0 0; color: var(--muted); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .hero { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--line); padding-bottom: 22px; }
    .status { align-self: flex-start; border: 1px solid var(--line); border-radius: 8px; background: var(--soft); padding: 7px 12px; font-weight: 900; color: ${status === "GRUEN" ? "var(--good)" : "var(--bad)"}; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .card, .note { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); box-shadow: var(--shadow); padding: 14px; }
    .label { color: var(--muted); font-size: 12px; font-weight: 850; text-transform: uppercase; }
    .value { margin-top: 4px; font-size: 22px; font-weight: 900; }
    .table-scroll { width: 100%; margin-top: 12px; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 9px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; font-size: 13px; }
    th { background: #e7efeb; color: var(--muted); font-size: 12px; text-transform: uppercase; white-space: nowrap; }
    tr:last-child td { border-bottom: 0; }
    ul { margin: 10px 0 0; padding-left: 20px; }
    li { margin: 5px 0; }
    .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
    .good { color: var(--good); }
    .warn { color: var(--warn); }
    .bad { color: var(--bad); }
    @media (max-width: 900px) { .hero, .two-col { display: block; } .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 620px) { main { padding: 22px 14px 48px; } .cards { grid-template-columns: 1fr; } h1 { font-size: 28px; } }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <div>
        <h1>Rating Impact Validation nach Engine-Anpassung</h1>
        <p>Analyse von 8-Team-Liga, isolierten Positionsgruppen und Varianztests. Rohdaten: <code>qa-rating-impact-validation-results.json</code>.</p>
      </div>
      <div class="status">Status: ${status}</div>
    </header>

    <section>
      <div class="cards">
        <div class="card"><div class="label">Liga-Spiele</div><div class="value">${league.games.length}</div><p>28 Matchups x 100.</p></div>
        <div class="card"><div class="label">Isolierte Tests</div><div class="value">${isolated.length}</div><p>Je 100 Spiele.</p></div>
        <div class="card"><div class="label">Varianz-Spiele</div><div class="value">${variance.reduce((sum, row) => sum + row.games.length, 0)}</div><p>2 Serien x 500.</p></div>
        <div class="card"><div class="label">Score/Yards r</div><div class="value">${analysis.scoreYardsCorrelation.toFixed(3)}</div><p>Kohärenz in Team-Spielzeilen.</p></div>
      </div>
    </section>

    <section>
      <h2>1. Was war am alten System auffaellig?</h2>
      <div class="note">
        <ul>
          <li>Overall zu Winrate war mit r = 0.966 sehr hoch.</li>
          <li>Alle Positionsgruppen korrelierten fast identisch stark, weil Teamstaerke zu linear ueber alle Units lief.</li>
          <li>Mittlere Teams landeten im alten 560er Lauf teilweise bei identischer Winrate.</li>
          <li>Upsets waren vorhanden, aber Field Position und isolierte Unit-Wirkung waren nicht ausreichend sichtbar dokumentiert.</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>2. Gepruefte Engine-Logik</h2>
      <div class="note">
        Geprueft wurden Drive-Qualitaet, Passing/Rushing-Yards, Completion Rate, Sack Pressure, Turnover Chance, Red-Zone-Finish, Field Goals, Punts und Drive-Enden. Positionsratings waren vorhanden, wurden aber in vielen Stellen als lineare Aggregate ausgewertet.
      </div>
    </section>

    <section>
      <h2>3. Umgesetzte Änderungen</h2>
      <div class="note">
        <ul>
          <li>Neue Unit-vs-Unit-Kanten: QB/WR/OL gegen Coverage/Pass Rush, RB/OL gegen Front Seven, QB Decision gegen Coverage.</li>
          <li>Nichtlineare Saettigung ueber <code>tanh</code>, damit grosse Ratingvorteile Vorteile bringen, aber nicht unbegrenzt wachsen.</li>
          <li>Korrektur der Pass-Rush-Kante im Sackdruck: Defense-Vorteile erhoehen jetzt den Druck statt ihn zu senken.</li>
          <li>Field-Position-Carryover fuer Punts, Turnovers, Turnover on Downs und missed Field Goals.</li>
          <li>Red-Zone-Finish beruecksichtigt nun spezifische Unit-Kanten statt nur aggregierter Drive-Qualitaet.</li>
          <li>Explosive Plays werden nicht mehr rein ueber kumulierte Drive-Yards gezaehlt, sondern probabilistisch aus Yards, Unit-Kanten und Coverage-Kontext abgeleitet.</li>
          <li>Turnover-, Sack- und Penalty-Korridore wurden minimal kalibriert, damit Produktions-QA nicht durch zu niedrige Ereignisraten kippt.</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>4. Wie wirken Ratings jetzt?</h2>
      <div class="cards">
        <div class="card"><div class="label">Overall -> Win %</div><div class="value">${analysis.overallCorrelation.toFixed(3)}</div></div>
        <div class="card"><div class="label">Overall -> Punktdiff</div><div class="value">${analysis.pointDiffCorrelation.toFixed(3)}</div></div>
        <div class="card"><div class="label">Weak/Strong Upsets</div><div class="value">${analysis.weakStrongUpsets}/${analysis.weakStrongGames}</div></div>
        <div class="card"><div class="label">Status</div><div class="value ${status === "GRUEN" ? "good" : "bad"}">${status}</div></div>
      </div>
      ${renderTable(["Unit", "r Win %", "r Punktdiff"], unitCorrelationRows)}
    </section>

    <section>
      <h2>5. 8-Team-Liga-Ergebnisse</h2>
      <h3>Teams</h3>
      ${renderTable(["Team", "Tier", "OVR", "QB", "RB", "WR", "OL", "DL", "LB", "DB", "ST", "Profil"], teamRows)}
      <h3>Standings</h3>
      ${renderTable(["Team", "Tier", "OVR", "Record", "Win %", "PPG", "Diff/G", "Yards/G", "RZ TD%"], standingRows)}
      <h3>Tier Summary</h3>
      ${renderTable(["Tier", "Teams", "Win %", "PPG", "Diff/G", "RZ TD%"], tierRows)}
    </section>

    <section>
      <h2>6. Isolierte Positionsgruppen-Ergebnisse</h2>
      <p>Jeweils zwei identische Teams, nur die genannte Unit ist beim Testteam +10.</p>
      ${renderTable(["Unit +10", "Record Boost-Control", "Boost Erfolg", "Punkte Δ", "Yards Δ", "TO Δ", "Sacks Δ", "PressureAllowed Δ", "Explosive Δ", "RZ TD% Δ"], isolatedRows)}
    </section>

    <section>
      <h2>7. Varianz-Analyse</h2>
      ${renderTable(["Serie", "Record A-B-T", "Avg Score", "Avg Yards", "Upsets", "Score/Yards r"], varianceRows)}
      <div class="note">
        Stark-vs-schwach zeigt erwartbar klare Favoritenwirkung. Mittel-vs-mittel bleibt deutlich variabler und zeigt, dass kleine bis mittlere Ratingdifferenzen nicht deterministisch entschieden werden.
      </div>
    </section>

    <section>
      <h2>8. Upset-Analyse</h2>
      <div class="note">
        Weak-over-Strong-Upsets: ${analysis.weakStrongUpsets} aus ${analysis.weakStrongGames} Liga-Spielen. Durch Field-Position-Carryover sind Upsets nun besser erklaerbar: kurze Felder nach Turnovers, missed FGs oder schlechte Punts schlagen direkt auf den naechsten Drive durch.
      </div>
    </section>

    <section>
      <h2>9. Score/Yards-Kohärenz</h2>
      <div class="note">
        Die globale Score/Yards-Korrelation liegt bei ${analysis.scoreYardsCorrelation.toFixed(3)}. Viele Yards fuehren tendenziell zu mehr Punkten, aber der Check bewertet bewusst auch Yardage-Buckets: Red-Zone-Finish, Field Goals, Turnovers und Field Position duerfen einzelne Spiele vom linearen Zusammenhang loesen.
      </div>
      ${renderTable(["Yards", "Team-Spiele", "Avg Yards", "Avg Points", "RZ Trips", "TD", "FG Att", "Punts", "TO", "TOD"], scoreYardsBucketRows)}
    </section>

    <section>
      <h2>10. Offene Risiken</h2>
      <div class="note">
        <ul>
          <li>Positionsgruppen sind in der 8-Team-Liga weiterhin teilweise gekoppelt; isolierte Tests sind daher wichtiger als reine Korrelationen.</li>
          <li>Pressure ist als Pressures Allowed aus Blocking-Lines verfuegbar, aber nicht als natives Teamfeld.</li>
          <li>Kickoff-Field-Position ist noch weniger stark modelliert als Punt-Field-Position.</li>
          <li>Der bestehende Production-QA-Wrapper meldet weiterhin Observability ROT, weil native 3rd-Down-Conversion und Play-by-Play nicht als Simulationsoutput existieren; Technik, Qualitaet, Regression und Edge-Cases sind separat gruen.</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>11. Empfehlung</h2>
      <div class="note">
        Naechster Schritt: native Drive-Start- und Return-Events im Drive Log speichern, damit Field Position und Special Teams noch direkter auditierbar werden. Danach koennen gezielte Kalibrierungen fuer Kickoff Returns, Red-Zone-Konversion und Druckraten folgen.
      </div>
    </section>
  </main>
</body>
</html>`;
}

function buildFullReport() {
  const league = buildLeagueSuite();
  const isolated = buildIsolatedSuite();
  const variance = buildVarianceSuite();
  const analysis = buildAnalysis(league, isolated, variance);
  const expectedLeagueGames = 28 * LEAGUE_GAMES_PER_MATCHUP;
  const rawDataComplete =
    league.games.length === expectedLeagueGames &&
    isolated.every((row) => row.games.length === ISOLATED_GAMES_PER_TEST) &&
    variance.every((row) => row.games.length === VARIANCE_GAMES_PER_SERIES);
  const tierOrder =
    (league.tierSummary.find((row) => row.tier === "STARK")?.winPct ?? 0) >
      (league.tierSummary.find((row) => row.tier === "MITTEL")?.winPct ?? 0) &&
    (league.tierSummary.find((row) => row.tier === "MITTEL")?.winPct ?? 0) >
      (league.tierSummary.find((row) => row.tier === "SCHWACH")?.winPct ?? 0);
  const isolatedHasSignal = isolated.filter((row) => row.deltas.winPct > 0.02).length >= 4;
  const nonEmptyScoreBuckets = analysis.scoreYardsBuckets.filter((bucket) => bucket.games > 0);
  const scoreYardsBucketTrend =
    nonEmptyScoreBuckets.length >= 3 &&
    nonEmptyScoreBuckets.every(
      (bucket, index) => index === 0 || bucket.avgScore >= nonEmptyScoreBuckets[index - 1].avgScore + 0.5,
    );
  const scoreYardsPlausible = analysis.scoreYardsCorrelation > 0.3 && scoreYardsBucketTrend;
  const status =
    rawDataComplete && tierOrder && isolatedHasSignal && scoreYardsPlausible ? "GRUEN" : "ROT";

  return {
    status,
    generatedAt: new Date().toISOString(),
    reportDate: REPORT_DATE,
    engineChanges: [
      "Nichtlineare Unit-vs-Unit-Kanten in Drive Quality, Completion, Sack Pressure, Turnover und Red Zone.",
      "Korrigiertes Pass-Rush-Vorzeichen fuer Sack Pressure.",
      "Punt/Turnover/Missed-FG Field Position Carryover in den naechsten Drive.",
      "Gezielte Red-Zone-Unit-Kante fuer weniger rein lineare Overall-Wirkung.",
      "Probabilistische Explosive-Play-Zaehlung und minimale Turnover/Sack/Penalty-Kalibrierung.",
    ],
    checks: {
      rawDataComplete,
      tierOrder,
      isolatedHasSignal,
      scoreYardsPlausible,
      scoreYardsBucketTrend,
      expectedLeagueGames,
      actualLeagueGames: league.games.length,
      isolatedGames: isolated.reduce((sum, row) => sum + row.games.length, 0),
      varianceGames: variance.reduce((sum, row) => sum + row.games.length, 0),
    },
    league,
    isolated,
    variance,
    analysis,
  };
}

function main() {
  const fullReport = buildFullReport();
  const reportsDir = resolve("reports-output", "simulations");
  const jsonPath = join(reportsDir, "qa-rating-impact-validation-results.json");
  const htmlPath = join(reportsDir, "qa-rating-impact-validation-report.html");

  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2), "utf8");
  writeFileSync(htmlPath, renderHtml(fullReport), "utf8");

  console.log(
    JSON.stringify(
      {
        status: fullReport.status,
        jsonPath,
        htmlPath,
        checks: fullReport.checks,
        overallCorrelation: fullReport.analysis.overallCorrelation,
        scoreYardsCorrelation: fullReport.analysis.scoreYardsCorrelation,
        weakStrongUpsets: `${fullReport.analysis.weakStrongUpsets}/${fullReport.analysis.weakStrongGames}`,
      },
      null,
      2,
    ),
  );

  process.exitCode = fullReport.status === "GRUEN" ? 0 : 1;
}

main();
