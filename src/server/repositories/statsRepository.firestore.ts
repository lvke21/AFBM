import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamContext,
  TeamSimulationResult,
} from "@/modules/seasons/application/simulation/simulation.types";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { measureAsyncPerformance } from "@/lib/observability/performance";

import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

type PersistMatchStatsInput = {
  context: SimulationMatchContext;
  result: MatchSimulationResult;
};

type TeamStatDoc = {
  explosivePlays?: number;
  firstDowns?: number;
  leagueId: string;
  idempotencyKey?: string;
  losses?: number;
  matchId?: string;
  passingYards?: number;
  penalties?: number;
  pointsAgainst?: number;
  pointsFor?: number;
  redZoneTouchdowns?: number;
  redZoneTrips?: number;
  rushingYards?: number;
  sacks?: number;
  scope: "MATCH" | "SEASON";
  seasonId: string;
  simulationRunId?: string;
  sourceMatchStatIds?: string[];
  teamId: string;
  teamSnapshot?: TeamSnapshot;
  ties?: number;
  timeOfPossessionSeconds?: number;
  totalYards?: number;
  touchdownsFor?: number;
  turnovers?: number;
  turnoversCommitted?: number;
  turnoversForced?: number;
  wins?: number;
};

type PlayerStatDoc = {
  blocking?: PlayerSimulationLine["blocking"];
  defensive?: PlayerSimulationLine["defensive"];
  kicking?: PlayerSimulationLine["kicking"];
  leagueId: string;
  idempotencyKey?: string;
  matchId?: string;
  passing?: PlayerSimulationLine["passing"];
  playerId: string;
  playerSnapshot?: PlayerSnapshot;
  punting?: PlayerSimulationLine["punting"];
  receiving?: PlayerSimulationLine["receiving"];
  returns?: PlayerSimulationLine["returns"];
  rushing?: PlayerSimulationLine["rushing"];
  scope: "MATCH" | "SEASON";
  seasonId: string;
  simulationRunId?: string;
  sourceMatchStatIds?: string[];
  seasonYear: number;
  snapsDefense?: number;
  snapsOffense?: number;
  snapsSpecialTeams?: number;
  started?: boolean;
  stats?: {
    gamesPlayed?: number;
    gamesStarted?: number;
    snapsDefense?: number;
    snapsOffense?: number;
    snapsSpecialTeams?: number;
    tackles?: number;
    touchdowns?: number;
    yards?: number;
  };
  teamId: string;
  teamSnapshot?: TeamSnapshot;
};

type TeamSnapshot = {
  abbreviation: string;
  city: string;
  nickname: string;
  teamId: string;
};

type PlayerSnapshot = {
  fullName: string;
  playerId: string;
  positionCode: string;
  teamAbbreviation: string;
  teamId: string;
};

export const statsRepositoryFirestore = {
  backend: "firestore",

  async persistMatchStats(input: PersistMatchStatsInput) {
    return measureAsyncPerformance(
      {
        area: "firestore",
        metadata: {
          operationScope: "stats",
          playerLineCount: input.result.playerLines.length,
          teamLineCount: 2,
        },
        operation: "persist-match-stats",
        resultMetadata: (result) => ({
          matchPlayerStatsWritten: result.matchPlayerStatsWritten,
          matchTeamStatsWritten: result.matchTeamStatsWritten,
          seasonPlayerStatsWritten: result.seasonPlayerStatsWritten,
          seasonTeamStatsWritten: result.seasonTeamStatsWritten,
        }),
      },
      async () => {
        assertFirestoreEmulatorOnly();

        const firestore = getFirebaseAdminFirestore();
        const matchSnapshot = await firestore.collection("matches").doc(input.context.matchId).get();
        recordFirestoreUsage({
          collection: "matches",
          count: matchSnapshot.exists ? 1 : 0,
          operation: "read",
          query: "doc",
        });

        if (!matchSnapshot.exists) {
          throw new Error(`Firestore match ${input.context.matchId} not found`);
        }

        const match = matchSnapshot.data();
        if (match?.leagueId !== input.context.saveGameId || match?.seasonId !== input.context.seasonId) {
          throw new Error("Firestore match does not belong to the simulation context");
        }

        const now = new Date();
        const teamMatchStats = buildTeamMatchStats(input.context, input.result, now);
        const playerMatchStats = buildPlayerMatchStats(input.context, input.result, now);
        const batch = firestore.batch();

        for (const stat of teamMatchStats) {
          batch.set(firestore.collection("teamStats").doc(stat.id), stat);
        }

        for (const stat of playerMatchStats) {
          batch.set(firestore.collection("playerStats").doc(stat.id), stat);
        }

        await batch.commit();
        recordFirestoreUsage({
          collection: "teamStats",
          count: teamMatchStats.length,
          operation: "write",
          query: "batch set match stats",
        });
        recordFirestoreUsage({
          collection: "playerStats",
          count: playerMatchStats.length,
          operation: "write",
          query: "batch set match stats",
        });

        const [teamAggregates, playerAggregates] = await Promise.all([
          recomputeTeamSeasonAggregates(input.context, now),
          recomputePlayerSeasonAggregates(input.context, input.result, now),
        ]);

        return {
          matchPlayerStatsWritten: playerMatchStats.length,
          matchTeamStatsWritten: teamMatchStats.length,
          seasonPlayerStatsWritten: playerAggregates,
          seasonTeamStatsWritten: teamAggregates,
        };
      },
    );
  },
};

function buildTeamMatchStats(
  context: SimulationMatchContext,
  result: MatchSimulationResult,
  now: Date,
) {
  const isTie = result.homeScore === result.awayScore;

  return [
    teamMatchStat({
      context,
      now,
      opponentScore: result.awayScore,
      result,
      score: result.homeScore,
      team: context.homeTeam,
      teamResult: result.homeTeam,
      won: result.homeScore > result.awayScore,
      lost: result.homeScore < result.awayScore,
      tied: isTie,
    }),
    teamMatchStat({
      context,
      now,
      opponentScore: result.homeScore,
      result,
      score: result.awayScore,
      team: context.awayTeam,
      teamResult: result.awayTeam,
      won: result.awayScore > result.homeScore,
      lost: result.awayScore < result.homeScore,
      tied: isTie,
    }),
  ];
}

function teamMatchStat(input: {
  context: SimulationMatchContext;
  lost: boolean;
  now: Date;
  opponentScore: number;
  result: MatchSimulationResult;
  score: number;
  team: SimulationTeamContext;
  teamResult: TeamSimulationResult;
  tied: boolean;
  won: boolean;
}) {
  const { context, now, team, teamResult } = input;

  return {
    createdAt: now,
    explosivePlays: teamResult.explosivePlays,
    firstDowns: teamResult.firstDowns,
    id: makeTeamMatchStatId(context.matchId, team.id),
    idempotencyKey: makeStatsIdempotencyKey(context, team.id),
    leagueId: context.saveGameId,
    losses: input.lost ? 1 : 0,
    matchId: context.matchId,
    passingYards: teamResult.passingYards,
    penalties: teamResult.penalties,
    pointsAgainst: input.opponentScore,
    pointsFor: input.score,
    redZoneTouchdowns: teamResult.redZoneTouchdowns,
    redZoneTrips: teamResult.redZoneTrips,
    rushingYards: teamResult.rushingYards,
    sacks: teamResult.sacks,
    scope: "MATCH" as const,
    seasonId: context.seasonId,
    seasonYear: context.seasonYear,
    simulationRunId: context.simulationSeed,
    teamId: team.id,
    teamSnapshot: teamSnapshot(team),
    ties: input.tied ? 1 : 0,
    timeOfPossessionSeconds: teamResult.timeOfPossessionSeconds,
    totalYards: teamResult.totalYards,
    touchdownsFor: teamResult.touchdowns,
    turnovers: teamResult.turnovers,
    turnoversCommitted: teamResult.turnovers,
    turnoversForced: team.id === context.homeTeam.id
      ? input.result.awayTeam.turnovers
      : input.result.homeTeam.turnovers,
    updatedAt: now,
    wins: input.won ? 1 : 0,
  };
}

function buildPlayerMatchStats(
  context: SimulationMatchContext,
  result: MatchSimulationResult,
  now: Date,
) {
  const playerContextById = new Map(
    [...context.homeTeam.roster, ...context.awayTeam.roster].map((player) => [player.id, player]),
  );
  const teamById = new Map([context.homeTeam, context.awayTeam].map((team) => [team.id, team]));

  return result.playerLines.map((line) => {
    const player = playerContextById.get(line.playerId);
    const team = teamById.get(line.teamId);

    return {
      blocking: line.blocking,
      createdAt: now,
      defensive: line.defensive,
      id: makePlayerMatchStatId(context.matchId, line.playerId),
      idempotencyKey: makeStatsIdempotencyKey(context, line.playerId),
      kicking: line.kicking,
      leagueId: context.saveGameId,
      matchId: context.matchId,
      passing: line.passing,
      playerId: line.playerId,
      playerSnapshot: playerSnapshot(player, line, team),
      punting: line.punting,
      receiving: line.receiving,
      returns: line.returns,
      rushing: line.rushing,
      scope: "MATCH" as const,
      seasonId: context.seasonId,
      seasonYear: context.seasonYear,
      simulationRunId: context.simulationSeed,
      snapsDefense: line.snapsDefense,
      snapsOffense: line.snapsOffense,
      snapsSpecialTeams: line.snapsSpecialTeams,
      started: line.started,
      stats: compactPlayerStats(line),
      teamId: line.teamId,
      teamSnapshot: team ? teamSnapshot(team) : undefined,
      updatedAt: now,
    };
  });
}

async function recomputeTeamSeasonAggregates(context: SimulationMatchContext, now: Date) {
  const firestore = getFirebaseAdminFirestore();
  const snapshot = await firestore
    .collection("teamStats")
    .where("leagueId", "==", context.saveGameId)
    .where("seasonId", "==", context.seasonId)
    .where("scope", "==", "MATCH")
    .get();
  recordFirestoreUsage({
    collection: "teamStats",
    count: snapshot.size,
    operation: "read",
    query: "leagueId+seasonId+scope",
  });
  const byTeam = new Map<string, TeamStatDoc[]>();

  for (const document of snapshot.docs) {
    const stat = document.data() as TeamStatDoc;
    byTeam.set(stat.teamId, [...(byTeam.get(stat.teamId) ?? []), stat]);
  }

  const batch = firestore.batch();

  for (const [teamId, stats] of byTeam) {
    const aggregate = sumTeamSeasonStats(context, teamId, stats, now);
    batch.set(firestore.collection("teamStats").doc(makeTeamSeasonStatId(context.seasonId, teamId)), aggregate);
  }

  await batch.commit();
  recordFirestoreUsage({
    collection: "teamStats",
    count: byTeam.size,
    operation: "write",
    query: "batch set season aggregates",
  });
  return byTeam.size;
}

async function recomputePlayerSeasonAggregates(
  context: SimulationMatchContext,
  result: MatchSimulationResult,
  now: Date,
) {
  const firestore = getFirebaseAdminFirestore();
  const affectedPlayerIds = [...new Set(result.playerLines.map((line) => line.playerId))];
  const batch = firestore.batch();

  for (const playerId of affectedPlayerIds) {
    const snapshot = await firestore
      .collection("playerStats")
      .where("leagueId", "==", context.saveGameId)
      .where("seasonId", "==", context.seasonId)
      .where("playerId", "==", playerId)
      .where("scope", "==", "MATCH")
      .get();
    recordFirestoreUsage({
      collection: "playerStats",
      count: snapshot.size,
      operation: "read",
      query: "leagueId+seasonId+playerId+scope",
    });
    const matchStats = snapshot.docs.map((document) => document.data() as PlayerStatDoc);

    if (matchStats.length === 0) {
      continue;
    }

    const teamId = matchStats[0]?.teamId ?? "unknown-team";
    batch.set(
      firestore.collection("playerStats").doc(makePlayerSeasonStatId(context.seasonId, playerId, teamId)),
      sumPlayerSeasonStats(context, playerId, teamId, matchStats, now),
    );
  }

  await batch.commit();
  recordFirestoreUsage({
    collection: "playerStats",
    count: affectedPlayerIds.length,
    operation: "write",
    query: "batch set season aggregates",
  });
  return affectedPlayerIds.length;
}

function sumTeamSeasonStats(
  context: SimulationMatchContext,
  teamId: string,
  stats: TeamStatDoc[],
  now: Date,
) {
  const team = teamId === context.homeTeam.id ? context.homeTeam : context.awayTeam;

  return {
    createdAt: now,
    explosivePlays: sum(stats, "explosivePlays"),
    gamesPlayed: stats.length,
    id: makeTeamSeasonStatId(context.seasonId, teamId),
    idempotencyKey: makeStatsIdempotencyKey(context, teamId, "season"),
    leagueId: context.saveGameId,
    losses: sum(stats, "losses"),
    passingYards: sum(stats, "passingYards"),
    pointsAgainst: sum(stats, "pointsAgainst"),
    pointsFor: sum(stats, "pointsFor"),
    redZoneTouchdowns: sum(stats, "redZoneTouchdowns"),
    redZoneTrips: sum(stats, "redZoneTrips"),
    rushingYards: sum(stats, "rushingYards"),
    sacks: sum(stats, "sacks"),
    scope: "SEASON" as const,
    seasonId: context.seasonId,
    seasonYear: context.seasonYear,
    simulationRunId: context.simulationSeed,
    sourceMatchStatIds: stats.map((stat) => stat.idempotencyKey ?? makeStatsIdempotencyKey(context, stat.matchId ?? "unknown-match")),
    teamId,
    teamSnapshot: teamSnapshot(team),
    ties: sum(stats, "ties"),
    touchdownsFor: sum(stats, "touchdownsFor"),
    totalYards: sum(stats, "totalYards"),
    turnoversCommitted: sum(stats, "turnoversCommitted"),
    turnoversForced: sum(stats, "turnoversForced"),
    updatedAt: now,
    wins: sum(stats, "wins"),
  };
}

function sumPlayerSeasonStats(
  context: SimulationMatchContext,
  playerId: string,
  teamId: string,
  stats: PlayerStatDoc[],
  now: Date,
) {
  const first = stats[0];

  return {
    blocking: sumPlayerFamily(stats, "blocking"),
    createdAt: now,
    defensive: sumPlayerFamily(stats, "defensive"),
    id: makePlayerSeasonStatId(context.seasonId, playerId, teamId),
    idempotencyKey: makeStatsIdempotencyKey(context, playerId, "season"),
    kicking: sumPlayerFamily(stats, "kicking"),
    leagueId: context.saveGameId,
    passing: sumPlayerFamily(stats, "passing"),
    playerId,
    playerSnapshot: first?.playerSnapshot,
    punting: sumPlayerFamily(stats, "punting"),
    receiving: sumPlayerFamily(stats, "receiving"),
    returns: sumPlayerFamily(stats, "returns"),
    rushing: sumPlayerFamily(stats, "rushing"),
    scope: "SEASON" as const,
    seasonId: context.seasonId,
    seasonYear: context.seasonYear,
    simulationRunId: context.simulationSeed,
    sourceMatchStatIds: stats.map((stat) => stat.idempotencyKey ?? makeStatsIdempotencyKey(context, stat.matchId ?? "unknown-match")),
    stats: {
      gamesPlayed: stats.length,
      gamesStarted: stats.filter((stat) => stat.started).length,
      snapsDefense: sum(stats, "snapsDefense"),
      snapsOffense: sum(stats, "snapsOffense"),
      snapsSpecialTeams: sum(stats, "snapsSpecialTeams"),
      tackles: stats.reduce((total, stat) => total + (stat.defensive?.tackles ?? 0), 0),
      touchdowns: stats.reduce(
        (total, stat) =>
          total +
          (stat.passing?.touchdowns ?? 0) +
          (stat.rushing?.touchdowns ?? 0) +
          (stat.receiving?.touchdowns ?? 0),
        0,
      ),
      yards: stats.reduce(
        (total, stat) =>
          total +
          (stat.passing?.yards ?? 0) +
          (stat.rushing?.yards ?? 0) +
          (stat.receiving?.yards ?? 0),
        0,
      ),
    },
    teamId,
    teamSnapshot: first?.teamSnapshot,
    updatedAt: now,
  };
}

function sum<T extends Record<string, unknown>>(stats: T[], key: keyof T) {
  return stats.reduce((total, stat) => total + (Number(stat[key]) || 0), 0);
}

function sumPlayerFamily(stats: PlayerStatDoc[], family: keyof Pick<
  PlayerStatDoc,
  "blocking" | "defensive" | "kicking" | "passing" | "punting" | "receiving" | "returns" | "rushing"
>) {
  const keys = new Set<string>();
  for (const stat of stats) {
    for (const key of Object.keys(stat[family] ?? {})) {
      keys.add(key);
    }
  }

  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      stats.reduce((total, stat) => total + (Number(stat[family]?.[key as never]) || 0), 0),
    ]),
  );
}

function compactPlayerStats(line: PlayerSimulationLine) {
  return {
    gamesPlayed: 1,
    gamesStarted: line.started ? 1 : 0,
    snapsDefense: line.snapsDefense,
    snapsOffense: line.snapsOffense,
    snapsSpecialTeams: line.snapsSpecialTeams,
    tackles: line.defensive.tackles,
    touchdowns:
      line.passing.touchdowns +
      line.rushing.touchdowns +
      line.receiving.touchdowns,
    yards:
      line.passing.yards +
      line.rushing.yards +
      line.receiving.yards,
  };
}

function teamSnapshot(team: SimulationTeamContext): TeamSnapshot {
  return {
    abbreviation: team.abbreviation,
    city: team.city,
    nickname: team.nickname,
    teamId: team.id,
  };
}

function playerSnapshot(
  player: SimulationPlayerContext | undefined,
  line: PlayerSimulationLine,
  team: SimulationTeamContext | undefined,
): PlayerSnapshot {
  return {
    fullName: player ? `${player.firstName} ${player.lastName}` : line.playerId,
    playerId: line.playerId,
    positionCode: player?.positionCode ?? "n/a",
    teamAbbreviation: team?.abbreviation ?? "n/a",
    teamId: line.teamId,
  };
}

function makeTeamMatchStatId(matchId: string, teamId: string) {
  return `match_${matchId}_${teamId}`;
}

function makeStatsIdempotencyKey(
  context: SimulationMatchContext,
  entityId: string,
  scope = context.matchId,
) {
  return `${context.saveGameId}:${context.seasonId}:${scope}:${entityId}`;
}

function makeTeamSeasonStatId(seasonId: string, teamId: string) {
  return `season_${seasonId}_${teamId}`;
}

function makePlayerMatchStatId(matchId: string, playerId: string) {
  return `match_${matchId}_${playerId}`;
}

function makePlayerSeasonStatId(seasonId: string, playerId: string, teamId: string) {
  return `season_${seasonId}_${playerId}_${teamId}`;
}
