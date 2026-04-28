import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

import { canReadFirestoreLeague, getFirestoreLeague } from "./firestoreAccess";
import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

type FirestoreSeasonDoc = {
  id: string;
  leagueId: string;
  year: number;
  phase: string;
  currentWeekNumber?: number;
  status?: string;
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
};

type TeamSnapshot = {
  teamId: string;
  city: string;
  nickname: string;
  abbreviation: string;
  overallRating?: number;
};

type FirestoreTeamStatDoc = {
  teamId: string;
  teamSnapshot?: TeamSnapshot;
  wins?: number;
  losses?: number;
  ties?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  touchdownsFor?: number;
  turnoversForced?: number;
  turnoversCommitted?: number;
  passingYards?: number;
  rushingYards?: number;
  sacks?: number;
  explosivePlays?: number;
  redZoneTrips?: number;
  redZoneTouchdowns?: number;
};

export const seasonRepositoryFirestore = {
  async findBySaveGame(saveGameId: string, seasonId: string) {
    assertFirestoreEmulatorOnly();
    const firestore = getFirebaseAdminFirestore();
    const seasonSnapshot = await firestore.collection("seasons").doc(seasonId).get();
    recordFirestoreUsage({
      collection: "seasons",
      count: seasonSnapshot.exists ? 1 : 0,
      operation: "read",
      query: "doc",
    });

    if (!seasonSnapshot.exists) {
      return null;
    }

    const season = {
      ...(seasonSnapshot.data() as FirestoreSeasonDoc),
      id: seasonSnapshot.id,
    };

    if (season.leagueId !== saveGameId) {
      return null;
    }

    return buildSeasonRecord(season);
  },

  async findOwnedByUser(userId: string, saveGameId: string, seasonId: string) {
    assertFirestoreEmulatorOnly();

    if (!(await canReadFirestoreLeague(userId, saveGameId))) {
      return null;
    }

    return this.findBySaveGame(saveGameId, seasonId);
  },

  async findCurrentBySaveGame(saveGameId: string) {
    assertFirestoreEmulatorOnly();
    const league = await getFirestoreLeague(saveGameId);
    const currentSeasonId = league?.currentSeasonId;

    return typeof currentSeasonId === "string"
      ? this.findBySaveGame(saveGameId, currentSeasonId)
      : null;
  },
};

async function buildSeasonRecord(season: FirestoreSeasonDoc) {
  const firestore = getFirebaseAdminFirestore();
  const [matchesSnapshot, teamStatsSnapshot] = await Promise.all([
    firestore
      .collection("matches")
      .where("leagueId", "==", season.leagueId)
      .where("seasonId", "==", season.id)
      .get(),
    firestore
      .collection("teamStats")
      .where("leagueId", "==", season.leagueId)
      .where("seasonId", "==", season.id)
      .where("scope", "==", "SEASON")
      .get(),
  ]);
  recordFirestoreUsage({
    collection: "matches",
    count: matchesSnapshot.size,
    operation: "read",
    query: "leagueId+seasonId",
  });
  recordFirestoreUsage({
    collection: "teamStats",
    count: teamStatsSnapshot.size,
    operation: "read",
    query: "leagueId+seasonId+scope",
  });

  const matches = matchesSnapshot.docs
    .map((document) => ({
      ...(document.data() as FirestoreMatchDoc),
      id: document.id,
    }))
    .sort((left, right) =>
      left.weekNumber === right.weekNumber
        ? normalizeDate(left.scheduledAt).getTime() - normalizeDate(right.scheduledAt).getTime()
        : left.weekNumber - right.weekNumber,
    );

  const teamSeasonStats = teamStatsSnapshot.docs
    .map((document) => mapTeamStat(document.data() as FirestoreTeamStatDoc))
    .sort((left, right) => right.wins - left.wins || right.pointsFor - left.pointsFor);

  return {
    id: season.id,
    year: season.year,
    phase: season.phase,
    week: season.currentWeekNumber ?? 1,
    teamSeasonStats,
    matches: matches.map(mapSeasonMatch),
  };
}

function mapSeasonMatch(match: FirestoreMatchDoc) {
  return {
    id: match.id,
    week: match.weekNumber,
    kind: match.kind,
    scheduledAt: normalizeDate(match.scheduledAt),
    status: match.status,
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    homeTeam: {
      id: match.homeTeamSnapshot.teamId,
      city: match.homeTeamSnapshot.city,
      nickname: match.homeTeamSnapshot.nickname,
    },
    awayTeam: {
      id: match.awayTeamSnapshot.teamId,
      city: match.awayTeamSnapshot.city,
      nickname: match.awayTeamSnapshot.nickname,
    },
  };
}

function mapTeamStat(stat: FirestoreTeamStatDoc) {
  return {
    team: {
      id: stat.teamSnapshot?.teamId ?? stat.teamId,
      city: stat.teamSnapshot?.city ?? "Unknown",
      nickname: stat.teamSnapshot?.nickname ?? "Team",
      abbreviation: stat.teamSnapshot?.abbreviation ?? "",
      overallRating: stat.teamSnapshot?.overallRating ?? 75,
    },
    wins: stat.wins ?? 0,
    losses: stat.losses ?? 0,
    ties: stat.ties ?? 0,
    pointsFor: stat.pointsFor ?? 0,
    pointsAgainst: stat.pointsAgainst ?? 0,
    touchdownsFor: stat.touchdownsFor ?? 0,
    turnoversForced: stat.turnoversForced ?? 0,
    turnoversCommitted: stat.turnoversCommitted ?? 0,
    passingYards: stat.passingYards ?? 0,
    rushingYards: stat.rushingYards ?? 0,
    sacks: stat.sacks ?? 0,
    explosivePlays: stat.explosivePlays ?? 0,
    redZoneTrips: stat.redZoneTrips ?? 0,
    redZoneTouchdowns: stat.redZoneTouchdowns ?? 0,
  };
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }

  return new Date(0);
}
