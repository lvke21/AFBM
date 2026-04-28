import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { measureAsyncPerformance } from "@/lib/observability/performance";

import { canReadFirestoreLeague, getFirestoreLeague } from "./firestoreAccess";
import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import { matchRepositoryFirestore } from "./matchRepository.firestore";
import { seasonRepositoryFirestore } from "./seasonRepository.firestore";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

export type FirestoreTeamOverviewReadModel = {
  id: string;
  name: string;
  abbreviation: string;
  playerCount: number;
  starterCount: number;
  averageOverall: number;
  seasonRecord: string;
  pointsFor: number;
  pointsAgainst: number;
};

export type FirestorePlayerOverviewReadModel = {
  id: string;
  fullName: string;
  teamId: string | null;
  positionCode: string;
  positionOverall: number;
  gamesPlayed: number;
  yards: number;
  touchdowns: number;
  tackles: number;
};

export type FirestoreMatchSummaryReadModel = {
  id: string;
  status: string;
  scoreLabel: string;
  driveCount: number;
  topPassingPlayer: string | null;
  totalYards: {
    home: number | null;
    away: number | null;
  };
};

export type FirestoreStatsViewsReadModel = {
  standings: Array<{
    teamId: string;
    name: string;
    record: string;
    pointsFor: number;
    pointsAgainst: number;
  }>;
  topPlayers: Array<{
    playerId: string;
    fullName: string;
    teamId: string;
    yards: number;
    touchdowns: number;
    tackles: number;
  }>;
};

export type FirestoreReportReadModel = {
  id: string;
  createdAt: Date | null;
  title: string;
  type: string;
  summary: string | null;
};

type FirestoreTeamDoc = {
  abbreviation?: string;
  city?: string;
  evaluation?: unknown;
  id?: string;
  leagueId?: string;
  nickname?: string;
  overallRating?: number;
};

type FirestorePlayerDoc = {
  evaluation?: {
    positionOverall?: number;
  };
  firstName?: string;
  fullName?: string;
  id?: string;
  leagueId?: string;
  lastName?: string;
  roster?: {
    primaryPosition?: {
      code?: string;
    };
    rosterStatus?: string;
    teamId?: string;
  };
};

type FirestoreTeamStatDoc = {
  losses?: number;
  pointsAgainst?: number;
  pointsFor?: number;
  scope?: string;
  teamId?: string;
  teamSnapshot?: {
    abbreviation?: string;
    city?: string;
    nickname?: string;
    teamId?: string;
  };
  ties?: number;
  wins?: number;
};

type FirestorePlayerStatDoc = {
  playerId?: string;
  playerSnapshot?: {
    fullName?: string;
    teamId?: string;
  };
  stats?: {
    tackles?: number;
    touchdowns?: number;
    yards?: number;
    gamesPlayed?: number;
  };
  teamId?: string;
};

type FirestoreReportDoc = {
  createdAt?: unknown;
  payload?: {
    summary?: string;
  };
  title?: string;
  type?: string;
};

export const readModelRepositoryFirestore = {
  async getTeamOverview(
    userId: string,
    leagueId: string,
    teamId: string,
  ): Promise<FirestoreTeamOverviewReadModel | null> {
    return measureAsyncPerformance(
      {
        area: "firestore",
        metadata: {
          operationScope: "readmodel",
          plannedReads: 4,
        },
        operation: "read-team-overview",
        resultMetadata: (result) => ({
          found: result != null,
          playerCount: result?.playerCount ?? 0,
        }),
      },
      async () => {
        assertFirestoreEmulatorOnly();
        if (!(await canReadFirestoreLeague(userId, leagueId))) {
          return null;
        }

        const firestore = getFirebaseAdminFirestore();
        const league = await getFirestoreLeague(leagueId);
        const [teamSnapshot, playersSnapshot, seasonStatSnapshot] = await Promise.all([
          firestore.collection("teams").doc(teamId).get(),
          firestore.collection("players").where("roster.teamId", "==", teamId).get(),
          league?.currentSeasonId
            ? firestore.collection("teamStats").doc(`season_${league.currentSeasonId}_${teamId}`).get()
            : Promise.resolve(null),
        ]);
        recordFirestoreUsage({
          collection: "teams",
          count: teamSnapshot.exists ? 1 : 0,
          operation: "read",
          query: "doc",
        });
        recordFirestoreUsage({
          collection: "players",
          count: playersSnapshot.size,
          operation: "read",
          query: "roster.teamId",
        });
        recordFirestoreUsage({
          collection: "teamStats",
          count: seasonStatSnapshot?.exists ? 1 : 0,
          operation: "read",
          query: "doc",
        });

        if (!teamSnapshot.exists) {
          return null;
        }

        const team = teamSnapshot.data() as FirestoreTeamDoc;
        if (team.leagueId !== leagueId) {
          return null;
        }

        const players = playersSnapshot.docs
          .map((document) => document.data() as FirestorePlayerDoc)
          .filter((player) => player.leagueId === leagueId);
        const seasonStat = seasonStatSnapshot?.exists
          ? seasonStatSnapshot.data() as FirestoreTeamStatDoc
          : null;
        const averageOverall = players.length
          ? Math.round(
              players.reduce(
                (sum, player) => sum + (player.evaluation?.positionOverall ?? 0),
                0,
              ) / players.length,
            )
          : 0;

        return {
          abbreviation: team.abbreviation ?? "",
          averageOverall,
          id: teamSnapshot.id,
          name: `${team.city ?? "Unknown"} ${team.nickname ?? "Team"}`,
          playerCount: players.length,
          pointsAgainst: seasonStat?.pointsAgainst ?? 0,
          pointsFor: seasonStat?.pointsFor ?? 0,
          seasonRecord: formatRecord(seasonStat?.wins ?? 0, seasonStat?.losses ?? 0, seasonStat?.ties ?? 0),
          starterCount: players.filter((player) => player.roster?.rosterStatus === "STARTER").length,
        };
      },
    );
  },

  async getPlayerOverview(
    userId: string,
    leagueId: string,
    playerId: string,
  ): Promise<FirestorePlayerOverviewReadModel | null> {
    return measureAsyncPerformance(
      {
        area: "firestore",
        metadata: {
          operationScope: "readmodel",
          plannedReads: 3,
        },
        operation: "read-player-overview",
        resultMetadata: (result) => ({
          found: result != null,
        }),
      },
      async () => {
        assertFirestoreEmulatorOnly();
        if (!(await canReadFirestoreLeague(userId, leagueId))) {
          return null;
        }

        const firestore = getFirebaseAdminFirestore();
        const league = await getFirestoreLeague(leagueId);
        const [playerSnapshot, statsSnapshot] = await Promise.all([
          firestore.collection("players").doc(playerId).get(),
          league?.currentSeasonId
            ? firestore
                .collection("playerStats")
                .where("leagueId", "==", leagueId)
                .where("seasonId", "==", league.currentSeasonId)
                .where("playerId", "==", playerId)
                .where("scope", "==", "SEASON")
                .get()
            : Promise.resolve(null),
        ]);
        recordFirestoreUsage({
          collection: "players",
          count: playerSnapshot.exists ? 1 : 0,
          operation: "read",
          query: "doc",
        });
        recordFirestoreUsage({
          collection: "playerStats",
          count: statsSnapshot?.size ?? 0,
          operation: "read",
          query: "leagueId+seasonId+playerId+scope",
        });

        if (!playerSnapshot.exists) {
          return null;
        }

        const player = playerSnapshot.data() as FirestorePlayerDoc;
        if (player.leagueId !== leagueId) {
          return null;
        }

        const stat = statsSnapshot?.docs[0]?.data() as FirestorePlayerStatDoc | undefined;

        return {
          fullName: player.fullName ?? `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim(),
          gamesPlayed: stat?.stats?.gamesPlayed ?? 0,
          id: playerSnapshot.id,
          positionCode: player.roster?.primaryPosition?.code ?? "n/a",
          positionOverall: player.evaluation?.positionOverall ?? 0,
          tackles: stat?.stats?.tackles ?? 0,
          teamId: player.roster?.teamId ?? null,
          touchdowns: stat?.stats?.touchdowns ?? 0,
          yards: stat?.stats?.yards ?? 0,
        };
      },
    );
  },

  async getMatchSummary(
    userId: string,
    leagueId: string,
    matchId: string,
  ): Promise<FirestoreMatchSummaryReadModel | null> {
    const match = await matchRepositoryFirestore.findDetailForUser(userId, leagueId, matchId);
    if (!match) {
      return null;
    }

    const scoreLabel =
      match.homeScore == null || match.awayScore == null
        ? "not final"
        : `${match.homeTeam.abbreviation} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.abbreviation}`;
    const topPassing = match.playerMatchStats
      .map((stat) => ({
        name: stat.snapshotFullName ?? `${stat.player.firstName} ${stat.player.lastName}`,
        yards: stat.passing?.yards ?? 0,
      }))
      .sort((left, right) => right.yards - left.yards)[0];

    return {
      driveCount: match.simulationDrives.length,
      id: match.id,
      scoreLabel,
      status: match.status,
      topPassingPlayer: topPassing && topPassing.yards > 0 ? topPassing.name : null,
      totalYards: {
        away: match.teamMatchStats.find((stat) => stat.teamId === match.awayTeam.id)?.totalYards ?? null,
        home: match.teamMatchStats.find((stat) => stat.teamId === match.homeTeam.id)?.totalYards ?? null,
      },
    };
  },

  async getSeasonOverview(userId: string, leagueId: string, seasonId: string) {
    assertFirestoreEmulatorOnly();
    return seasonRepositoryFirestore.findOwnedByUser(userId, leagueId, seasonId);
  },

  async getStatsViews(
    userId: string,
    leagueId: string,
    seasonId: string,
  ): Promise<FirestoreStatsViewsReadModel | null> {
    return measureAsyncPerformance(
      {
        area: "firestore",
        metadata: {
          operationScope: "readmodel",
          plannedReads: 3,
        },
        operation: "read-stats-views",
        resultMetadata: (result) => ({
          standingsCount: result?.standings.length ?? 0,
          topPlayersCount: result?.topPlayers.length ?? 0,
        }),
      },
      async () => {
        assertFirestoreEmulatorOnly();
        if (!(await canReadFirestoreLeague(userId, leagueId))) {
          return null;
        }

        const firestore = getFirebaseAdminFirestore();
        const [teamStatsSnapshot, playerStatsSnapshot] = await Promise.all([
          firestore
            .collection("teamStats")
            .where("leagueId", "==", leagueId)
            .where("seasonId", "==", seasonId)
            .where("scope", "==", "SEASON")
            .get(),
          firestore
            .collection("playerStats")
            .where("leagueId", "==", leagueId)
            .where("seasonId", "==", seasonId)
            .where("scope", "==", "SEASON")
            .get(),
        ]);
        recordFirestoreUsage({
          collection: "teamStats",
          count: teamStatsSnapshot.size,
          operation: "read",
          query: "leagueId+seasonId+scope",
        });
        recordFirestoreUsage({
          collection: "playerStats",
          count: playerStatsSnapshot.size,
          operation: "read",
          query: "leagueId+seasonId+scope",
        });

        return {
          standings: teamStatsSnapshot.docs
            .map((document) => document.data() as FirestoreTeamStatDoc)
            .map((stat) => ({
              name: `${stat.teamSnapshot?.city ?? "Unknown"} ${stat.teamSnapshot?.nickname ?? "Team"}`,
              pointsAgainst: stat.pointsAgainst ?? 0,
              pointsFor: stat.pointsFor ?? 0,
              record: formatRecord(stat.wins ?? 0, stat.losses ?? 0, stat.ties ?? 0),
              teamId: stat.teamId ?? stat.teamSnapshot?.teamId ?? "",
            }))
            .sort((left, right) => right.pointsFor - left.pointsFor),
          topPlayers: playerStatsSnapshot.docs
            .map((document) => document.data() as FirestorePlayerStatDoc)
            .map((stat) => ({
              fullName: stat.playerSnapshot?.fullName ?? stat.playerId ?? "Unknown Player",
              playerId: stat.playerId ?? "",
              tackles: stat.stats?.tackles ?? 0,
              teamId: stat.teamId ?? stat.playerSnapshot?.teamId ?? "",
              touchdowns: stat.stats?.touchdowns ?? 0,
              yards: stat.stats?.yards ?? 0,
            }))
            .sort((left, right) => right.yards - left.yards)
            .slice(0, 10),
        };
      },
    );
  },

  async listReports(
    userId: string,
    leagueId: string,
    limit = 10,
  ): Promise<FirestoreReportReadModel[] | null> {
    return measureAsyncPerformance(
      {
        area: "firestore",
        metadata: {
          limit,
          operationScope: "readmodel",
          plannedReads: 2,
        },
        operation: "read-reports",
        resultMetadata: (result) => ({
          reportCount: result?.length ?? 0,
        }),
      },
      async () => {
        assertFirestoreEmulatorOnly();
        if (!(await canReadFirestoreLeague(userId, leagueId))) {
          return null;
        }

        const snapshot = await getFirebaseAdminFirestore()
          .collection("reports")
          .where("leagueId", "==", leagueId)
          .orderBy("createdAt", "desc")
          .limit(limit)
          .get();
        recordFirestoreUsage({
          collection: "reports",
          count: snapshot.size,
          operation: "read",
          query: "leagueId+createdAt limit",
        });

        return snapshot.docs.map((document) => {
          const report = document.data() as FirestoreReportDoc;
          return {
            createdAt: normalizeDate(report.createdAt),
            id: document.id,
            summary: report.payload?.summary ?? null,
            title: report.title ?? "Untitled report",
            type: report.type ?? "UNKNOWN",
          };
        });
      },
    );
  },
};

function formatRecord(wins: number, losses: number, ties: number) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function normalizeDate(value: unknown) {
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
