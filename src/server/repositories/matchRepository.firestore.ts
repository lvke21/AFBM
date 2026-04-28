import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import type { MatchDetailRecord } from "@/server/repositories/matchRepository.prisma";

import { canReadFirestoreLeague } from "./firestoreAccess";
import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import type { FirestoreTeamDoc } from "./firestoreRepositoryMappers";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

type TeamSnapshot = {
  teamId: string;
  city: string;
  nickname: string;
  abbreviation: string;
};

type FirestoreMatchDoc = {
  id: string;
  leagueId: string;
  seasonId: string;
  weekId: string;
  weekNumber: number;
  kind: string;
  status: string;
  scheduledAt?: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamSnapshot: TeamSnapshot;
  awayTeamSnapshot: TeamSnapshot;
  homeScore?: number | null;
  awayScore?: number | null;
  stadiumName?: string | null;
  simulationSeed?: string | null;
  simulationStartedAt?: Date | null;
  simulationCompletedAt?: Date | null;
};

type FirestoreDriveEventDoc = {
  defenseTeamAbbreviation: string;
  endedAwayScore: number;
  endedHomeScore: number;
  eventType: string;
  leagueId: string;
  matchId: string;
  offenseTeamAbbreviation: string;
  passAttempts: number;
  phaseLabel: string;
  plays: number;
  pointsScored: number;
  primaryDefenderName?: string | null;
  primaryPlayerName?: string | null;
  redZoneTrip: boolean;
  resultType: string;
  rushAttempts: number;
  sequence: number;
  startedAwayScore: number;
  startedHomeScore: number;
  summary: string;
  totalYards: number;
  turnover: boolean;
};

type FirestoreTeamStatDoc = {
  explosivePlays?: number;
  firstDowns?: number;
  matchId: string;
  passingYards?: number;
  penalties?: number;
  redZoneTouchdowns?: number;
  redZoneTrips?: number;
  rushingYards?: number;
  sacks?: number;
  scope: string;
  teamId: string;
  timeOfPossessionSeconds?: number;
  totalYards?: number;
  turnovers?: number;
};

type FirestorePlayerStatDoc = {
  blocking?: Record<string, number>;
  defensive?: Record<string, number>;
  kicking?: Record<string, number>;
  matchId: string;
  passing?: Record<string, number>;
  playerId: string;
  playerSnapshot?: {
    fullName?: string;
    positionCode?: string;
    teamAbbreviation?: string;
  };
  punting?: Record<string, number>;
  receiving?: Record<string, number>;
  returns?: Record<string, number>;
  rushing?: Record<string, number>;
  scope: string;
  snapsDefense?: number;
  snapsOffense?: number;
  snapsSpecialTeams?: number;
  started?: boolean;
  teamId: string;
};

export const matchRepositoryFirestore = {
  async findDetailForUser(userId: string, saveGameId: string, matchId: string) {
    assertFirestoreEmulatorOnly();

    if (!(await canReadFirestoreLeague(userId, saveGameId))) {
      return null;
    }

    return this.findBySaveGame(saveGameId, matchId);
  },

  async findBySaveGame(saveGameId: string, matchId: string): Promise<MatchDetailRecord | null> {
    assertFirestoreEmulatorOnly();
    const snapshot = await getFirebaseAdminFirestore().collection("matches").doc(matchId).get();
    recordFirestoreUsage({
      collection: "matches",
      count: snapshot.exists ? 1 : 0,
      operation: "read",
      query: "doc",
    });

    if (!snapshot.exists) {
      return null;
    }

    const match = {
      ...(snapshot.data() as FirestoreMatchDoc),
      id: snapshot.id,
    };

    if (match.leagueId !== saveGameId) {
      return null;
    }

    const [drives, teamStats, playerStats, teamsById] = await Promise.all([
      listDriveEvents(saveGameId, matchId),
      listTeamMatchStats(saveGameId, matchId),
      listPlayerMatchStats(saveGameId, matchId),
      listMatchTeams(match),
    ]);

    return mapMatchDetail(match, drives, teamStats, playerStats, teamsById);
  },

  async findByWeek(saveGameId: string, weekId: string): Promise<MatchDetailRecord[]> {
    assertFirestoreEmulatorOnly();
    const snapshot = await getFirebaseAdminFirestore()
      .collection("matches")
      .where("leagueId", "==", saveGameId)
      .where("weekId", "==", weekId)
      .get();
    recordFirestoreUsage({
      collection: "matches",
      count: snapshot.size,
      operation: "read",
      query: "leagueId+weekId",
    });

    const matches = await Promise.all(snapshot.docs.map(async (document) => {
      const match = {
        ...(document.data() as FirestoreMatchDoc),
        id: document.id,
      };
      const [drives, teamStats, playerStats, teamsById] = await Promise.all([
        listDriveEvents(saveGameId, match.id),
        listTeamMatchStats(saveGameId, match.id),
        listPlayerMatchStats(saveGameId, match.id),
        listMatchTeams(match),
      ]);

      return mapMatchDetail(match, drives, teamStats, playerStats, teamsById);
    }));

    return matches
      .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());
  },
};

async function listDriveEvents(saveGameId: string, matchId: string): Promise<FirestoreDriveEventDoc[]> {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("gameEvents")
    .where("leagueId", "==", saveGameId)
    .where("matchId", "==", matchId)
    .where("eventType", "==", "MATCH_DRIVE")
    .get();
  recordFirestoreUsage({
    collection: "gameEvents",
    count: snapshot.size,
    operation: "read",
    query: "leagueId+matchId+eventType",
  });

  return snapshot.docs
    .map((document) => document.data() as FirestoreDriveEventDoc)
    .sort((left, right) => left.sequence - right.sequence);
}

async function listTeamMatchStats(saveGameId: string, matchId: string): Promise<FirestoreTeamStatDoc[]> {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("teamStats")
    .where("leagueId", "==", saveGameId)
    .where("matchId", "==", matchId)
    .where("scope", "==", "MATCH")
    .get();
  recordFirestoreUsage({
    collection: "teamStats",
    count: snapshot.size,
    operation: "read",
    query: "leagueId+matchId+scope",
  });

  return snapshot.docs.map((document) => document.data() as FirestoreTeamStatDoc);
}

async function listPlayerMatchStats(saveGameId: string, matchId: string): Promise<FirestorePlayerStatDoc[]> {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("playerStats")
    .where("leagueId", "==", saveGameId)
    .where("matchId", "==", matchId)
    .where("scope", "==", "MATCH")
    .get();
  recordFirestoreUsage({
    collection: "playerStats",
    count: snapshot.size,
    operation: "read",
    query: "leagueId+matchId+scope",
  });

  return snapshot.docs.map((document) => document.data() as FirestorePlayerStatDoc);
}

async function listMatchTeams(match: FirestoreMatchDoc) {
  const firestore = getFirebaseAdminFirestore();
  const [homeTeamSnapshot, awayTeamSnapshot] = await Promise.all([
    firestore.collection("teams").doc(match.homeTeamId).get(),
    firestore.collection("teams").doc(match.awayTeamId).get(),
  ]);
  recordFirestoreUsage({
    collection: "teams",
    count: Number(homeTeamSnapshot.exists) + Number(awayTeamSnapshot.exists),
    operation: "read",
    query: "doc pair",
  });
  const teamsById = new Map<string, FirestoreTeamDoc>();

  if (homeTeamSnapshot.exists) {
    teamsById.set(homeTeamSnapshot.id, {
      ...(homeTeamSnapshot.data() as FirestoreTeamDoc),
      id: homeTeamSnapshot.id,
    });
  }

  if (awayTeamSnapshot.exists) {
    teamsById.set(awayTeamSnapshot.id, {
      ...(awayTeamSnapshot.data() as FirestoreTeamDoc),
      id: awayTeamSnapshot.id,
    });
  }

  return teamsById;
}

function mapMatchDetail(
  match: FirestoreMatchDoc,
  drives: FirestoreDriveEventDoc[],
  teamStats: FirestoreTeamStatDoc[],
  playerStats: FirestorePlayerStatDoc[],
  teamsById: Map<string, FirestoreTeamDoc>,
): MatchDetailRecord {
  return {
    id: match.id,
    week: match.weekNumber,
    kind: match.kind,
    status: match.status,
    scheduledAt: normalizeDate(match.scheduledAt),
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    stadiumName: match.stadiumName ?? null,
    simulationSeed: match.simulationSeed ?? null,
    simulationStartedAt: normalizeNullableDate(match.simulationStartedAt),
    simulationCompletedAt: normalizeNullableDate(match.simulationCompletedAt),
    homeTeam: mapTeamSummary(match.homeTeamSnapshot, teamsById.get(match.homeTeamId)),
    awayTeam: mapTeamSummary(match.awayTeamSnapshot, teamsById.get(match.awayTeamId)),
    teamMatchStats: teamStats.map(mapTeamMatchStat),
    simulationDrives: drives.map(mapDriveEvent),
    playerMatchStats: playerStats.map(mapPlayerMatchStat),
  } as unknown as MatchDetailRecord;
}

function mapTeamMatchStat(stat: FirestoreTeamStatDoc) {
  return {
    explosivePlays: stat.explosivePlays ?? 0,
    firstDowns: stat.firstDowns ?? 0,
    matchId: stat.matchId,
    passingYards: stat.passingYards ?? 0,
    penalties: stat.penalties ?? 0,
    redZoneTouchdowns: stat.redZoneTouchdowns ?? 0,
    redZoneTrips: stat.redZoneTrips ?? 0,
    rushingYards: stat.rushingYards ?? 0,
    sacks: stat.sacks ?? 0,
    teamId: stat.teamId,
    timeOfPossessionSeconds: stat.timeOfPossessionSeconds ?? 0,
    totalYards: stat.totalYards ?? 0,
    turnovers: stat.turnovers ?? 0,
  };
}

function mapPlayerMatchStat(stat: FirestorePlayerStatDoc) {
  const [firstName, ...lastNameParts] = (stat.playerSnapshot?.fullName ?? stat.playerId).split(" ");

  return {
    blocking: stat.blocking ?? null,
    defensive: stat.defensive ?? null,
    kicking: stat.kicking ?? null,
    passing: stat.passing ?? null,
    player: {
      firstName,
      id: stat.playerId,
      lastName: lastNameParts.join(" ") || stat.playerId,
      rosterProfile: {
        primaryPosition: {
          code: stat.playerSnapshot?.positionCode ?? "n/a",
        },
      },
    },
    playerId: stat.playerId,
    punting: stat.punting ?? null,
    receiving: stat.receiving ?? null,
    returns: stat.returns ?? null,
    rushing: stat.rushing ?? null,
    snapsDefense: stat.snapsDefense ?? 0,
    snapsOffense: stat.snapsOffense ?? 0,
    snapsSpecialTeams: stat.snapsSpecialTeams ?? 0,
    snapshotFullName: stat.playerSnapshot?.fullName ?? null,
    snapshotPositionCode: stat.playerSnapshot?.positionCode ?? null,
    snapshotTeamAbbreviation: stat.playerSnapshot?.teamAbbreviation ?? null,
    started: stat.started ?? false,
    teamId: stat.teamId,
  };
}

function mapDriveEvent(drive: FirestoreDriveEventDoc) {
  return {
    defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
    endedAwayScore: drive.endedAwayScore,
    endedHomeScore: drive.endedHomeScore,
    offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
    passAttempts: drive.passAttempts,
    phaseLabel: drive.phaseLabel,
    plays: drive.plays,
    pointsScored: drive.pointsScored,
    primaryDefenderName: drive.primaryDefenderName ?? null,
    primaryPlayerName: drive.primaryPlayerName ?? null,
    redZoneTrip: drive.redZoneTrip,
    resultType: drive.resultType,
    rushAttempts: drive.rushAttempts,
    sequence: drive.sequence,
    startedAwayScore: drive.startedAwayScore,
    startedHomeScore: drive.startedHomeScore,
    summary: drive.summary,
    totalYards: drive.totalYards,
    turnover: drive.turnover,
  };
}

function mapTeamSummary(snapshot: TeamSnapshot, team?: FirestoreTeamDoc) {
  return {
    id: snapshot.teamId,
    city: team?.city ?? snapshot.city,
    nickname: team?.nickname ?? snapshot.nickname,
    abbreviation: team?.abbreviation ?? snapshot.abbreviation,
    managerControlled: team?.managerControlled ?? false,
    overallRating: team?.overallRating ?? 0,
    morale: team?.morale ?? 0,
    offensiveSchemeFit: nullableScheme(team?.schemes?.offense),
    defensiveSchemeFit: nullableScheme(team?.schemes?.defense),
    specialTeamsSchemeFit: nullableScheme(team?.schemes?.specialTeams),
  };
}

function nullableScheme(scheme?: { code?: string; name?: string } | null) {
  return scheme?.code && scheme.name
    ? {
        code: scheme.code,
        name: scheme.name,
      }
    : null;
}

function normalizeDate(value: unknown) {
  return normalizeNullableDate(value) ?? new Date(0);
}

function normalizeNullableDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }

  return null;
}
