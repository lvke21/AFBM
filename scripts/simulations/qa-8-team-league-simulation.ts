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
const GAMES_PER_MATCHUP = 20;
const HOME_GAMES_PER_SIDE = 10;

type TeamTier = "SCHWACH" | "MITTEL" | "STARK";
type UnitCode = "QB" | "RB" | "WR" | "OL" | "DL" | "LB" | "DB" | "ST";

type UnitRatings = Record<UnitCode, number>;

type LeagueTeamDefinition = {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  tier: TeamTier;
  rosterIndex: number;
  overallRating: number;
  unitRatings: UnitRatings;
  rationale: string;
};

type TeamRatingSnapshot = LeagueTeamDefinition & {
  teamId: string;
  name: string;
  rosterSize: number;
  rosterOverall: number;
  offenseOverall: number;
  defenseOverall: number;
  specialTeamsOverall: number;
  physicalOverall: number;
  mentalOverall: number;
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
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
  penalties: number;
  timeOfPossessionSeconds: number;
  punts: number;
  fieldGoalAttempts: number;
  turnoverOnDowns: number;
};

type LeagueGameRecord = {
  gameId: string;
  globalGameNumber: number;
  matchupId: string;
  matchupGameNumber: number;
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

type MatchupSummary = {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  label: string;
  gamesPlanned: number;
  gamesCompleted: number;
  homeAwaySplit: {
    teamAHome: number;
    teamBHome: number;
  };
  record: {
    teamAWins: number;
    teamBWins: number;
    ties: number;
  };
  averages: {
    teamAScore: number;
    teamBScore: number;
    scoreDifferentialTeamAMinusTeamB: number;
    teamAYards: number;
    teamBYards: number;
    teamATurnovers: number;
    teamBTurnovers: number;
  };
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
};

const TEAM_DEFINITIONS: LeagueTeamDefinition[] = [
  {
    id: "L8_CANTON",
    city: "Canton",
    nickname: "Anchors",
    abbreviation: "CAN",
    tier: "SCHWACH",
    rosterIndex: 20,
    overallRating: 61,
    unitRatings: { QB: 59, RB: 63, WR: 60, OL: 62, DL: 61, LB: 60, DB: 62, ST: 64 },
    rationale: "Unterdurchschnittlich in fast allen Units, keine klare Elite-Staerke.",
  },
  {
    id: "L8_OMAHA",
    city: "Omaha",
    nickname: "Rails",
    abbreviation: "OMA",
    tier: "SCHWACH",
    rosterIndex: 21,
    overallRating: 65,
    unitRatings: { QB: 66, RB: 64, WR: 65, OL: 66, DL: 63, LB: 65, DB: 64, ST: 67 },
    rationale: "Stabiler als Canton, aber ohne starke Unit und mit begrenzter Defense.",
  },
  {
    id: "L8_PORTLAND",
    city: "Portland",
    nickname: "Bridges",
    abbreviation: "POR",
    tier: "MITTEL",
    rosterIndex: 22,
    overallRating: 73,
    unitRatings: { QB: 74, RB: 72, WR: 75, OL: 73, DL: 71, LB: 72, DB: 74, ST: 73 },
    rationale: "Solides Passspiel, ausgeglichene Struktur, aber keine dominante Line.",
  },
  {
    id: "L8_MEMPHIS",
    city: "Memphis",
    nickname: "Pilots",
    abbreviation: "MEM",
    tier: "MITTEL",
    rosterIndex: 23,
    overallRating: 76,
    unitRatings: { QB: 75, RB: 78, WR: 76, OL: 77, DL: 75, LB: 76, DB: 74, ST: 76 },
    rationale: "Gute Balance und leicht laufstaerkeres Profil.",
  },
  {
    id: "L8_ORLANDO",
    city: "Orlando",
    nickname: "Voltage",
    abbreviation: "ORL",
    tier: "MITTEL",
    rosterIndex: 24,
    overallRating: 79,
    unitRatings: { QB: 81, RB: 76, WR: 80, OL: 78, DL: 77, LB: 78, DB: 79, ST: 78 },
    rationale: "Oberes Mittelfeld mit gutem QB/WR-Kern und stabiler Defense.",
  },
  {
    id: "L8_SAN_DIEGO",
    city: "San Diego",
    nickname: "Sentinels",
    abbreviation: "SDG",
    tier: "STARK",
    rosterIndex: 25,
    overallRating: 84,
    unitRatings: { QB: 86, RB: 82, WR: 85, OL: 84, DL: 83, LB: 84, DB: 85, ST: 82 },
    rationale: "Playoff-Niveau mit starkem QB und guter Secondary.",
  },
  {
    id: "L8_CHICAGO",
    city: "Chicago",
    nickname: "Monarchs",
    abbreviation: "CHI",
    tier: "STARK",
    rosterIndex: 26,
    overallRating: 88,
    unitRatings: { QB: 87, RB: 89, WR: 86, OL: 90, DL: 89, LB: 88, DB: 86, ST: 87 },
    rationale: "Sehr starke Lines und physisch dominanter Stil.",
  },
  {
    id: "L8_NEW_YORK",
    city: "New York",
    nickname: "Titans",
    abbreviation: "NYT",
    tier: "STARK",
    rosterIndex: 27,
    overallRating: 91,
    unitRatings: { QB: 93, RB: 88, WR: 92, OL: 90, DL: 89, LB: 91, DB: 92, ST: 90 },
    rationale: "Elite-Team mit Top-QB, starker Secondary und kaum Schwaechen.",
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

function adjustNullableRating(value: number | null | undefined, offset: number) {
  return value == null ? null : clampRating(value + offset);
}

function teamDisplayName(team: Pick<SimulationTeamContext, "city" | "nickname">) {
  return `${team.city} ${team.nickname}`;
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

function buildLeagueTeam(definition: LeagueTeamDefinition): SimulationTeamContext {
  const roster = buildInitialRoster(
    definition.rosterIndex,
    definition.overallRating,
    2026,
  ).map((seed, index): SimulationPlayerContext => {
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
  });

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

function ratingSnapshot(
  definition: LeagueTeamDefinition,
  team: SimulationTeamContext,
): TeamRatingSnapshot {
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
    physicalOverall: round(average(numbers((player) => player.physicalOverall)), 1),
    mentalOverall: round(average(numbers((player) => player.mentalOverall)), 1),
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
  globalGameNumber: number;
}): SimulationMatchContext {
  return {
    matchId: input.matchId,
    saveGameId: "qa-8-team-league-savegame",
    seasonId: "qa-8-team-league-season-2026",
    kind: MatchKind.REGULAR_SEASON,
    simulationSeed: input.seed,
    seasonYear: 2026,
    week: ((input.globalGameNumber - 1) % 18) + 1,
    scheduledAt: new Date(Date.UTC(2026, 8, 1 + ((input.globalGameNumber - 1) % 112), 18, 0, 0)),
    homeTeam: cloneTeam(input.homeTeam),
    awayTeam: cloneTeam(input.awayTeam),
  };
}

function driveCountForTeam(
  result: MatchSimulationResult,
  teamId: string,
  resultType: string,
) {
  return result.drives.filter(
    (drive) => drive.offenseTeamId === teamId && drive.resultType === resultType,
  ).length;
}

function teamGameStats(
  result: MatchSimulationResult,
  teamResult: TeamSimulationResult,
): TeamGameStats {
  return {
    points: teamResult.score,
    totalYards: teamResult.totalYards,
    passingYards: teamResult.passingYards,
    rushingYards: teamResult.rushingYards,
    firstDowns: teamResult.firstDowns,
    touchdowns: teamResult.touchdowns,
    turnovers: teamResult.turnovers,
    sacks: teamResult.sacks,
    explosivePlays: teamResult.explosivePlays,
    redZoneTrips: teamResult.redZoneTrips,
    redZoneTouchdowns: teamResult.redZoneTouchdowns,
    penalties: teamResult.penalties,
    timeOfPossessionSeconds: teamResult.timeOfPossessionSeconds,
    punts: driveCountForTeam(result, teamResult.teamId, "PUNT"),
    fieldGoalAttempts:
      driveCountForTeam(result, teamResult.teamId, "FIELD_GOAL_MADE") +
      driveCountForTeam(result, teamResult.teamId, "FIELD_GOAL_MISSED"),
    turnoverOnDowns: driveCountForTeam(result, teamResult.teamId, "TURNOVER_ON_DOWNS"),
  };
}

function toGameRecord(input: {
  gameId: string;
  globalGameNumber: number;
  matchupId: string;
  matchupGameNumber: number;
  seed: string;
  result: MatchSimulationResult;
  homeTeam: SimulationTeamContext;
  awayTeam: SimulationTeamContext;
}): LeagueGameRecord {
  const winner =
    input.result.homeScore === input.result.awayScore
      ? null
      : input.result.homeScore > input.result.awayScore
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
    globalGameNumber: input.globalGameNumber,
    matchupId: input.matchupId,
    matchupGameNumber: input.matchupGameNumber,
    seed: input.seed,
    homeTeamId: input.homeTeam.id,
    awayTeamId: input.awayTeam.id,
    homeTeamName: teamDisplayName(input.homeTeam),
    awayTeamName: teamDisplayName(input.awayTeam),
    score: {
      home: input.result.homeScore,
      away: input.result.awayScore,
    },
    winner,
    stats: {
      home: teamGameStats(input.result, input.result.homeTeam),
      away: teamGameStats(input.result, input.result.awayTeam),
    },
  };
}

function matchupId(teamA: LeagueTeamDefinition, teamB: LeagueTeamDefinition) {
  return `${teamA.abbreviation.toLowerCase()}-vs-${teamB.abbreviation.toLowerCase()}`;
}

function buildSchedule() {
  const matchups: Array<{
    matchupId: string;
    teamAId: string;
    teamBId: string;
    gamesPlanned: number;
    homeAwaySplit: {
      teamAHome: number;
      teamBHome: number;
    };
  }> = [];

  for (let i = 0; i < TEAM_DEFINITIONS.length; i += 1) {
    for (let j = i + 1; j < TEAM_DEFINITIONS.length; j += 1) {
      const teamA = TEAM_DEFINITIONS[i];
      const teamB = TEAM_DEFINITIONS[j];
      matchups.push({
        matchupId: matchupId(teamA, teamB),
        teamAId: teamA.id,
        teamBId: teamB.id,
        gamesPlanned: GAMES_PER_MATCHUP,
        homeAwaySplit: {
          teamAHome: HOME_GAMES_PER_SIDE,
          teamBHome: HOME_GAMES_PER_SIDE,
        },
      });
    }
  }

  return matchups;
}

function summarizeMatchup(input: {
  matchupId: string;
  teamA: SimulationTeamContext;
  teamB: SimulationTeamContext;
  games: LeagueGameRecord[];
}): MatchupSummary {
  const teamAGameStats = (game: LeagueGameRecord) =>
    game.homeTeamId === input.teamA.id ? game.stats.home : game.stats.away;
  const teamBGameStats = (game: LeagueGameRecord) =>
    game.homeTeamId === input.teamB.id ? game.stats.home : game.stats.away;
  const teamAScore = (game: LeagueGameRecord) =>
    game.homeTeamId === input.teamA.id ? game.score.home : game.score.away;
  const teamBScore = (game: LeagueGameRecord) =>
    game.homeTeamId === input.teamB.id ? game.score.home : game.score.away;

  return {
    matchupId: input.matchupId,
    teamAId: input.teamA.id,
    teamBId: input.teamB.id,
    label: `${teamDisplayName(input.teamA)} vs ${teamDisplayName(input.teamB)}`,
    gamesPlanned: GAMES_PER_MATCHUP,
    gamesCompleted: input.games.length,
    homeAwaySplit: {
      teamAHome: input.games.filter((game) => game.homeTeamId === input.teamA.id).length,
      teamBHome: input.games.filter((game) => game.homeTeamId === input.teamB.id).length,
    },
    record: {
      teamAWins: input.games.filter((game) => game.winner?.teamId === input.teamA.id).length,
      teamBWins: input.games.filter((game) => game.winner?.teamId === input.teamB.id).length,
      ties: input.games.filter((game) => game.winner == null).length,
    },
    averages: {
      teamAScore: round(average(input.games.map(teamAScore)), 2),
      teamBScore: round(average(input.games.map(teamBScore)), 2),
      scoreDifferentialTeamAMinusTeamB: round(
        average(input.games.map((game) => teamAScore(game) - teamBScore(game))),
        2,
      ),
      teamAYards: round(average(input.games.map((game) => teamAGameStats(game).totalYards)), 2),
      teamBYards: round(average(input.games.map((game) => teamBGameStats(game).totalYards)), 2),
      teamATurnovers: round(average(input.games.map((game) => teamAGameStats(game).turnovers)), 2),
      teamBTurnovers: round(average(input.games.map((game) => teamBGameStats(game).turnovers)), 2),
    },
    gameIds: input.games.map((game) => game.gameId),
  };
}

function buildStandings(
  teams: SimulationTeamContext[],
  teamSnapshots: TeamRatingSnapshot[],
  games: LeagueGameRecord[],
): StandingRow[] {
  const snapshotById = new Map(teamSnapshots.map((snapshot) => [snapshot.teamId, snapshot]));
  const rows = new Map(
    teams.map((team) => {
      const snapshot = snapshotById.get(team.id);

      if (!snapshot) {
        throw new Error(`Missing snapshot for ${team.id}`);
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
          turnovers: 0,
      };

      return [team.id, row];
    }),
  );

  const addTeamGame = (input: {
    teamId: string;
    opponentId: string;
    pointsFor: number;
    pointsAgainst: number;
    yardsFor: number;
    yardsAgainst: number;
    turnovers: number;
    winner: LeagueGameRecord["winner"];
  }) => {
    const row = rows.get(input.teamId);

    if (!row) {
      throw new Error(`Missing standings row for ${input.teamId}`);
    }

    row.games += 1;
    row.pointsFor += input.pointsFor;
    row.pointsAgainst += input.pointsAgainst;
    row.yardsFor += input.yardsFor;
    row.yardsAgainst += input.yardsAgainst;
    row.turnovers += input.turnovers;

    if (!input.winner) {
      row.ties += 1;
    } else if (input.winner.teamId === input.teamId) {
      row.wins += 1;
    } else if (input.winner.teamId === input.opponentId) {
      row.losses += 1;
    }
  };

  for (const game of games) {
    addTeamGame({
      teamId: game.homeTeamId,
      opponentId: game.awayTeamId,
      pointsFor: game.score.home,
      pointsAgainst: game.score.away,
      yardsFor: game.stats.home.totalYards,
      yardsAgainst: game.stats.away.totalYards,
      turnovers: game.stats.home.turnovers,
      winner: game.winner,
    });
    addTeamGame({
      teamId: game.awayTeamId,
      opponentId: game.homeTeamId,
      pointsFor: game.score.away,
      pointsAgainst: game.score.home,
      yardsFor: game.stats.away.totalYards,
      yardsAgainst: game.stats.home.totalYards,
      turnovers: game.stats.away.turnovers,
      winner: game.winner,
    });
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      winPct: row.games === 0 ? 0 : round((row.wins + row.ties * 0.5) / row.games, 3),
      pointDifferential: row.pointsFor - row.pointsAgainst,
    }))
    .sort(
      (a, b) =>
        b.winPct - a.winPct ||
        b.pointDifferential - a.pointDifferential ||
        b.pointsFor - a.pointsFor,
    );
}

function summarizeTiers(standings: StandingRow[]) {
  const tiers: TeamTier[] = ["SCHWACH", "MITTEL", "STARK"];

  return tiers.map((tier) => {
    const rows = standings.filter((row) => row.tier === tier);
    return {
      tier,
      teams: rows.length,
      games: rows.reduce((sum, row) => sum + row.games, 0),
      wins: rows.reduce((sum, row) => sum + row.wins, 0),
      losses: rows.reduce((sum, row) => sum + row.losses, 0),
      ties: rows.reduce((sum, row) => sum + row.ties, 0),
      winPct: round(average(rows.map((row) => row.winPct)), 3),
      averagePointDifferential: round(average(rows.map((row) => row.pointDifferential / row.games)), 2),
    };
  });
}

function isRawGameComplete(game: LeagueGameRecord) {
  return (
    game.gameId.length > 0 &&
    game.seed.length > 0 &&
    game.homeTeamId.length > 0 &&
    game.awayTeamId.length > 0 &&
    Number.isFinite(game.score.home) &&
    Number.isFinite(game.score.away) &&
    Number.isFinite(game.stats.home.totalYards) &&
    Number.isFinite(game.stats.away.totalYards) &&
    Number.isFinite(game.stats.home.turnovers) &&
    Number.isFinite(game.stats.away.turnovers)
  );
}

function buildReport() {
  const teams = TEAM_DEFINITIONS.map((definition) => ({
    definition,
    team: buildLeagueTeam(definition),
  }));
  const teamsById = new Map(teams.map(({ team }) => [team.id, team]));
  const teamSnapshots = teams.map(({ definition, team }) => ratingSnapshot(definition, team));
  const beforeRatings = JSON.stringify(teamSnapshots);
  const schedule = buildSchedule();
  const allGames: LeagueGameRecord[] = [];
  const matchupSummaries: MatchupSummary[] = [];
  let globalGameNumber = 1;

  for (const scheduledMatchup of schedule) {
    const teamA = teamsById.get(scheduledMatchup.teamAId);
    const teamB = teamsById.get(scheduledMatchup.teamBId);

    if (!teamA || !teamB) {
      throw new Error(`Missing teams for ${scheduledMatchup.matchupId}`);
    }

    const matchupGames: LeagueGameRecord[] = [];

    for (let matchupGameNumber = 1; matchupGameNumber <= GAMES_PER_MATCHUP; matchupGameNumber += 1) {
      const teamAHome = matchupGameNumber <= HOME_GAMES_PER_SIDE;
      const homeTeam = teamAHome ? teamA : teamB;
      const awayTeam = teamAHome ? teamB : teamA;
      const seed = `qa-8-team-league-${scheduledMatchup.matchupId}-${String(matchupGameNumber).padStart(2, "0")}`;
      const gameId = `${scheduledMatchup.matchupId}-${String(matchupGameNumber).padStart(2, "0")}`;
      const context = createMatchContext({
        matchId: gameId,
        seed,
        homeTeam,
        awayTeam,
        globalGameNumber,
      });
      const result = generateMatchStats(context);
      const game = toGameRecord({
        gameId,
        globalGameNumber,
        matchupId: scheduledMatchup.matchupId,
        matchupGameNumber,
        seed,
        result,
        homeTeam,
        awayTeam,
      });

      matchupGames.push(game);
      allGames.push(game);
      globalGameNumber += 1;
    }

    matchupSummaries.push(
      summarizeMatchup({
        matchupId: scheduledMatchup.matchupId,
        teamA,
        teamB,
        games: matchupGames,
      }),
    );
  }

  const afterRatings = JSON.stringify(
    teams.map(({ definition, team }) => ratingSnapshot(definition, team)),
  );
  const standings = buildStandings(
    teams.map(({ team }) => team),
    teamSnapshots,
    allGames,
  );
  const tierSummary = summarizeTiers(standings);
  const weakTier = tierSummary.find((entry) => entry.tier === "SCHWACH");
  const middleTier = tierSummary.find((entry) => entry.tier === "MITTEL");
  const strongTier = tierSummary.find((entry) => entry.tier === "STARK");
  const expectedGames = schedule.length * GAMES_PER_MATCHUP;
  const teamGameCounts = Object.fromEntries(standings.map((row) => [row.teamId, row.games]));
  const checks = {
    teamCountIsEight: TEAM_DEFINITIONS.length === 8,
    matchupCountIsTwentyEight: schedule.length === 28,
    totalGamesExpected: expectedGames,
    totalGamesCompleted: allGames.length,
    everyMatchupHasTwentyGames: matchupSummaries.every(
      (summary) => summary.gamesCompleted === GAMES_PER_MATCHUP,
    ),
    everyMatchupHasTenTenHomeAway: matchupSummaries.every(
      (summary) =>
        summary.homeAwaySplit.teamAHome === HOME_GAMES_PER_SIDE &&
        summary.homeAwaySplit.teamBHome === HOME_GAMES_PER_SIDE,
    ),
    everyTeamHasOneHundredFortyGames: standings.every((row) => row.games === 140),
    rawDataComplete: allGames.every(isRawGameComplete),
    ratingsRemainUnchanged: beforeRatings === afterRatings,
    plausibilityTierOrder:
      Boolean(weakTier && middleTier && strongTier) &&
      strongTier!.winPct > middleTier!.winPct &&
      middleTier!.winPct > weakTier!.winPct,
  };
  const status = Object.values(checks).every(Boolean) ? "GRUEN" : "ROT";

  return {
    status,
    generatedAt: new Date().toISOString(),
    reportDate: REPORT_DATE,
    rules: {
      teams: TEAM_DEFINITIONS.length,
      matchupCount: schedule.length,
      gamesPerMatchup: GAMES_PER_MATCHUP,
      totalGamesExpected: expectedGames,
      homeAwaySplit: "10/10 je Matchup",
      engine: "generateMatchStats",
      engineChanges: false,
      balancingChanges: false,
      ratingsAdjustedDuringSimulation: false,
    },
    teams: teamSnapshots,
    schedule,
    standings,
    tierSummary,
    matchups: matchupSummaries,
    games: allGames,
    checks,
    teamGameCounts,
  };
}

function main() {
  const report = buildReport();
  const reportsDir = resolve("reports-output", "simulations");
  const jsonPath = join(reportsDir, "qa-8-team-league-results.json");

  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        status: report.status,
        jsonPath,
        teams: report.teams.length,
        matchups: report.matchups.length,
        games: report.games.length,
        standings: report.standings.map((row) => ({
          team: row.name,
          tier: row.tier,
          wins: row.wins,
          losses: row.losses,
          ties: row.ties,
          winPct: row.winPct,
          pointDifferential: row.pointDifferential,
        })),
        tierSummary: report.tierSummary,
        checks: report.checks,
      },
      null,
      2,
    ),
  );

  process.exitCode = report.status === "GRUEN" ? 0 : 1;
}

main();
