import { getRepositories } from "@/server/repositories";
import type { PreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";
import type { MatchDetailRecord } from "@/server/repositories/matchRepository.prisma";

type MatchPlayerLine = {
  playerId: string;
  fullName: string;
  teamId: string;
  teamAbbreviation: string;
  positionCode: string;
  passingYards: number;
  passingTouchdowns: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receivingYards: number;
  receivingTouchdowns: number;
  tackles: number;
  sacks: number;
  interceptions: number;
  fieldGoalsMade: number;
  puntsInside20: number;
  kickReturnYards: number;
  puntReturnYards: number;
};

type MatchPlayerLineRecord = MatchDetailRecord["playerMatchStats"][number];
type MatchDriveRecord = MatchDetailRecord["simulationDrives"][number];
type MatchTeamStatRecord = MatchDetailRecord["teamMatchStats"][number];

export type MatchGameplanSummary = {
  aggression: string | null;
  aiStrategyArchetype: string | null;
  defenseFocus: string | null;
  label: string;
  offenseFocus: string | null;
  summary: string;
};

type MatchTeamSummaryRecord = {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  managerControlled: boolean;
  overallRating: number;
  morale: number;
  offensiveSchemeFit: {
    code: string;
    name: string;
  } | null;
  defensiveSchemeFit: {
    code: string;
    name: string;
  } | null;
  specialTeamsSchemeFit: {
    code: string;
    name: string;
  } | null;
  offenseXFactorPlan?: unknown;
  defenseXFactorPlan?: unknown;
};

function summarizeMatch(
  match: {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    simulationStartedAt: Date | null;
  },
  homeStats: {
    totalYards: number;
    turnovers: number;
    explosivePlays: number;
    redZoneTrips: number;
    redZoneTouchdowns: number;
  } | null,
  awayStats: {
    totalYards: number;
    turnovers: number;
    explosivePlays: number;
    redZoneTrips: number;
    redZoneTouchdowns: number;
  } | null,
  driveCount: number,
) {
  if (match.status === "IN_PROGRESS") {
    return `Die Simulation fuer dieses Match laeuft. Bisher sind ${driveCount} persistierte Drives verfuegbar.`;
  }

  if (match.homeScore == null || match.awayScore == null || !homeStats || !awayStats) {
    return "Dieses Match ist noch nicht abgeschlossen. Team- und Spielerwerte erscheinen nach der Simulation.";
  }

  const winner =
    match.homeScore >= match.awayScore ? match.homeTeamName : match.awayTeamName;
  const loser =
    match.homeScore >= match.awayScore ? match.awayTeamName : match.homeTeamName;
  const winnerStats =
    match.homeScore >= match.awayScore ? homeStats : awayStats;
  const loserStats =
    match.homeScore >= match.awayScore ? awayStats : homeStats;

  return `${winner} setzte sich gegen ${loser} durch, gewann das Yard-Duell ${winnerStats.totalYards}-${loserStats.totalYards} und kontrollierte die Big Plays (${winnerStats.explosivePlays}:${loserStats.explosivePlays}). Entscheidend waren ${winnerStats.redZoneTouchdowns}/${winnerStats.redZoneTrips} Touchdowns in der Red Zone bei nur ${winnerStats.turnovers} Turnovern.`;
}

function pickLeader(
  players: MatchPlayerLine[],
  scoreOf: (player: MatchPlayerLine) => number,
) {
  return [...players]
    .sort((left, right) => scoreOf(right) - scoreOf(left))
    .find((player) => scoreOf(player) > 0) ?? null;
}

function toGameplanSummary(value: unknown): MatchGameplanSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const summary = typeof record.summary === "string" ? record.summary : null;

  if (!summary) {
    return null;
  }

  return {
    aggression: typeof record.aggression === "string" ? record.aggression : null,
    aiStrategyArchetype:
      typeof record.aiStrategyArchetype === "string" ? record.aiStrategyArchetype : null,
    defenseFocus: typeof record.defenseFocus === "string" ? record.defenseFocus : null,
    label: typeof record.label === "string" ? record.label : "gameplan",
    offenseFocus: typeof record.offenseFocus === "string" ? record.offenseFocus : null,
    summary,
  };
}

export function toMatchPlayerLine(
  line: MatchPlayerLineRecord,
  fallbackTeamAbbreviation: string,
): MatchPlayerLine {
  return {
    playerId: line.player.id,
    fullName:
      line.snapshotFullName ?? `${line.player.firstName} ${line.player.lastName}`,
    teamId: line.teamId,
    teamAbbreviation:
      line.snapshotTeamAbbreviation ?? fallbackTeamAbbreviation,
    positionCode:
      line.snapshotPositionCode ??
      line.player.rosterProfile?.primaryPosition.code ??
      "n/a",
    passingYards: line.passing?.yards ?? 0,
    passingTouchdowns: line.passing?.touchdowns ?? 0,
    rushingYards: line.rushing?.yards ?? 0,
    rushingTouchdowns: line.rushing?.touchdowns ?? 0,
    receivingYards: line.receiving?.yards ?? 0,
    receivingTouchdowns: line.receiving?.touchdowns ?? 0,
    tackles: line.defensive?.tackles ?? 0,
    sacks: Number(line.defensive?.sacks ?? 0),
    interceptions: line.defensive?.interceptions ?? 0,
    fieldGoalsMade: line.kicking?.fieldGoalsMade ?? 0,
    puntsInside20: line.punting?.puntsInside20 ?? 0,
    kickReturnYards: line.returns?.kickReturnYards ?? 0,
    puntReturnYards: line.returns?.puntReturnYards ?? 0,
  };
}

export function toMatchTeamSummary(
  team: MatchTeamSummaryRecord,
  score: number | null,
  stats: MatchTeamStatRecord | null,
) {
  return {
    id: team.id,
    name: `${team.city} ${team.nickname}`,
    abbreviation: team.abbreviation,
    managerControlled: team.managerControlled,
    overallRating: team.overallRating,
    morale: team.morale,
    score,
    stats,
    gameplanSummary: toGameplanSummary(stats?.gameplanSummary),
    schemes: {
      offense: team.offensiveSchemeFit
        ? {
            code: team.offensiveSchemeFit.code,
            name: team.offensiveSchemeFit.name,
          }
        : null,
      defense: team.defensiveSchemeFit
        ? {
            code: team.defensiveSchemeFit.code,
            name: team.defensiveSchemeFit.name,
          }
        : null,
      specialTeams: team.specialTeamsSchemeFit
        ? {
            code: team.specialTeamsSchemeFit.code,
            name: team.specialTeamsSchemeFit.name,
          }
        : null,
    },
    xFactorPlan: {
      offense: toPartialXFactorPlan(team.offenseXFactorPlan),
      defense: toPartialXFactorPlan(team.defenseXFactorPlan),
    },
  };
}

function toPartialXFactorPlan(value: unknown): Partial<PreGameXFactorPlan> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<PreGameXFactorPlan>
    : null;
}

export async function getMatchDetailForUser(
  userId: string,
  saveGameId: string,
  matchId: string,
) {
  const match = await getRepositories().matches.findDetailForUser(
    userId,
    saveGameId,
    matchId,
  );

  if (!match) {
    return null;
  }

  const homeStats = match.teamMatchStats.find((entry) => entry.teamId === match.homeTeam.id) ?? null;
  const awayStats = match.teamMatchStats.find((entry) => entry.teamId === match.awayTeam.id) ?? null;
  const teamAbbreviationById = new Map([
    [match.homeTeam.id, match.homeTeam.abbreviation],
    [match.awayTeam.id, match.awayTeam.abbreviation],
  ]);
  const playerLines: MatchPlayerLine[] = match.playerMatchStats.map((line) =>
    toMatchPlayerLine(line, teamAbbreviationById.get(line.teamId) ?? "n/a"),
  );

  return {
    id: match.id,
    week: match.week,
    kind: match.kind,
    status: match.status,
    simulationSeed: match.simulationSeed,
    simulationStartedAt: match.simulationStartedAt,
    simulationCompletedAt: match.simulationCompletedAt,
    scheduledAt: match.scheduledAt,
    stadiumName: match.stadiumName,
    homeTeam: toMatchTeamSummary(match.homeTeam, match.homeScore, homeStats),
    awayTeam: toMatchTeamSummary(match.awayTeam, match.awayScore, awayStats),
    summary: summarizeMatch(
      {
        homeTeamName: `${match.homeTeam.city} ${match.homeTeam.nickname}`,
        awayTeamName: `${match.awayTeam.city} ${match.awayTeam.nickname}`,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        simulationStartedAt: match.simulationStartedAt,
      },
      homeStats,
      awayStats,
      match.simulationDrives.length,
    ),
    drives: match.simulationDrives.map((drive: MatchDriveRecord) => ({
      sequence: drive.sequence,
      phaseLabel: drive.phaseLabel,
      offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
      defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
      startedScore: `${drive.startedHomeScore}-${drive.startedAwayScore}`,
      endedScore: `${drive.endedHomeScore}-${drive.endedAwayScore}`,
      plays: drive.plays,
      passAttempts: drive.passAttempts,
      rushAttempts: drive.rushAttempts,
      totalYards: drive.totalYards,
      resultType: drive.resultType,
      turnover: drive.turnover,
      redZoneTrip: drive.redZoneTrip,
      summary: drive.summary,
      pointsScored: drive.pointsScored,
      primaryPlayerName: drive.primaryPlayerName,
      primaryDefenderName: drive.primaryDefenderName,
    })),
    leaders: {
      passing: pickLeader(playerLines, (player) => player.passingYards),
      rushing: pickLeader(playerLines, (player) => player.rushingYards),
      receiving: pickLeader(playerLines, (player) => player.receivingYards),
      defense: pickLeader(
        playerLines,
        (player) => player.tackles + player.sacks * 4 + player.interceptions * 6,
      ),
      specialTeams: pickLeader(
        playerLines,
        (player) =>
          player.fieldGoalsMade * 4 +
          player.puntsInside20 * 2 +
          (player.kickReturnYards + player.puntReturnYards) / 20,
      ),
    },
  };
}
