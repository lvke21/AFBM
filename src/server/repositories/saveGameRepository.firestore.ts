import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

import { canReadFirestoreLeague } from "./firestoreAccess";
import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import type { FirestoreTeamDoc } from "./firestoreRepositoryMappers";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

type FirestoreLeagueDoc = {
  counts?: {
    playerCount?: number;
    teamCount?: number;
  };
  createdAt?: unknown;
  currentSeasonId?: string | null;
  currentSeasonSnapshot?: {
    phase?: string;
    weekNumber?: number;
    year?: number;
  } | null;
  id?: string;
  leagueDefinitionSnapshot?: {
    name?: string;
  } | null;
  managerTeamId?: string | null;
  name?: string;
  ownerId?: string;
  settings?: {
    activeRosterLimit?: number;
    practiceSquadSize?: number;
    salaryCapCents?: number;
    seasonLengthWeeks?: number;
  } | null;
  status?: string;
  updatedAt?: unknown;
  weekState?: string;
};

type FirestoreSeasonDoc = {
  currentWeekNumber?: number;
  id?: string;
  leagueId?: string;
  phase?: string;
  week?: number;
  year?: number;
};

type FirestoreLeagueMemberDoc = {
  leagueId?: string;
  status?: string;
  updatedAt?: unknown;
  userId?: string;
};

type FirestoreTeamStatDoc = {
  losses?: number;
  teamId?: string;
  ties?: number;
  wins?: number;
};

export const saveGameRepositoryFirestore = {
  async listByUser(userId: string) {
    assertFirestoreEmulatorOnly();
    const firestore = getFirebaseAdminFirestore();
    const membershipSnapshot = await firestore
      .collection("leagueMembers")
      .where("userId", "==", userId)
      .where("status", "==", "ACTIVE")
      .get();
    recordFirestoreUsage({
      collection: "leagueMembers",
      count: membershipSnapshot.size,
      operation: "read",
      query: "userId+status",
    });

    const saveGames = await Promise.all(
      membershipSnapshot.docs.map(async (document) => {
        const membership = document.data() as FirestoreLeagueMemberDoc;
        const leagueId = membership.leagueId;

        if (!leagueId) {
          return null;
        }

        const league = await getLeague(leagueId);

        if (!league) {
          return null;
        }

        const currentSeason = await getCurrentSeason(league);

        return toListRecord(leagueId, league, currentSeason);
      }),
    );

    return saveGames
      .filter((saveGame): saveGame is NonNullable<typeof saveGame> => Boolean(saveGame))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  },

  async findByIdForUser(userId: string, saveGameId: string) {
    assertFirestoreEmulatorOnly();

    if (!(await canReadFirestoreLeague(userId, saveGameId))) {
      return null;
    }

    const league = await getLeague(saveGameId);

    if (!league) {
      return null;
    }

    const [seasons, teams, playerCount, matchCounts, teamStats] = await Promise.all([
      listSeasons(saveGameId),
      listTeams(saveGameId),
      countPlayers(saveGameId),
      countMatchesBySeason(saveGameId),
      listCurrentTeamStats(saveGameId, league.currentSeasonId ?? null),
    ]);
    const currentSeason =
      seasons.find((season) => season.id === league.currentSeasonId) ?? seasons[0] ?? null;
    const statsByTeam = new Map(teamStats.map((stat) => [stat.teamId ?? "", stat]));

    return {
      id: saveGameId,
      name: league.name ?? saveGameId,
      status: normalizeStatus(league.status),
      weekState: normalizeWeekState(league.weekState),
      leagueDefinition: {
        name: league.leagueDefinitionSnapshot?.name ?? league.name ?? "Firestore League",
      },
      createdAt: normalizeDate(league.createdAt),
      updatedAt: normalizeDate(league.updatedAt),
      currentSeason: currentSeason
        ? toSeasonRecord(currentSeason)
        : null,
      settings: league.settings
        ? {
            activeRosterLimit: league.settings.activeRosterLimit ?? 53,
            practiceSquadSize: league.settings.practiceSquadSize ?? 16,
            salaryCap: centsToCurrencyUnits(league.settings.salaryCapCents),
            seasonLengthWeeks: league.settings.seasonLengthWeeks ?? seasons.length,
          }
        : null,
      seasons: seasons.map((season) => ({
        ...toSeasonRecord(season),
        _count: {
          matches: matchCounts.get(season.id ?? "") ?? 0,
        },
      })),
      teams: teams.map((team) => {
        const stat = statsByTeam.get(team.id);

        return {
          id: team.id,
          abbreviation: team.abbreviation,
          city: team.city,
          nickname: team.nickname,
          conferenceDefinition: {
            name: team.conferenceSnapshot?.name ?? "Unknown Conference",
          },
          divisionDefinition: {
            name: team.divisionSnapshot?.name ?? "Unknown Division",
          },
          managerControlled:
            team.managerControlled || team.id === league.managerTeamId || team.ownerUserId === userId,
          overallRating: team.overallRating ?? 0,
          salaryCapSpace: centsToCurrencyUnits(team.salaryCapSpaceCents),
          _count: {
            rosterProfiles: playerCount.byTeam.get(team.id) ?? 0,
          },
          teamSeasonStats: [
            {
              losses: stat?.losses ?? 0,
              ties: stat?.ties ?? 0,
              wins: stat?.wins ?? 0,
            },
          ],
        };
      }),
    };
  },

  async archiveForUser() {
    throw new Error(
      "Firestore-Spielstaende werden in dieser Umgebung nicht ueber den Savegames-Screen geloescht.",
    );
  },
};

async function getLeague(leagueId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("leagues")
    .doc(leagueId)
    .get();
  recordFirestoreUsage({
    collection: "leagues",
    count: snapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });

  return snapshot.exists
    ? {
        ...(snapshot.data() as FirestoreLeagueDoc),
        id: snapshot.id,
      }
    : null;
}

async function getCurrentSeason(league: FirestoreLeagueDoc) {
  if (!league.currentSeasonId) {
    return null;
  }

  const snapshot = await getFirebaseAdminFirestore()
    .collection("seasons")
    .doc(league.currentSeasonId)
    .get();
  recordFirestoreUsage({
    collection: "seasons",
    count: snapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });

  return snapshot.exists
    ? {
        ...(snapshot.data() as FirestoreSeasonDoc),
        id: snapshot.id,
      }
    : null;
}

async function listSeasons(leagueId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("seasons")
    .where("leagueId", "==", leagueId)
    .get();
  recordFirestoreUsage({
    collection: "seasons",
    count: snapshot.size,
    operation: "read",
    query: "leagueId",
  });

  return snapshot.docs
    .map((document) => ({
      ...(document.data() as FirestoreSeasonDoc),
      id: document.id,
    }))
    .sort((left, right) => (right.year ?? 0) - (left.year ?? 0));
}

async function listTeams(leagueId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("teams")
    .where("leagueId", "==", leagueId)
    .get();
  recordFirestoreUsage({
    collection: "teams",
    count: snapshot.size,
    operation: "read",
    query: "leagueId",
  });

  return snapshot.docs
    .map((document) => ({
      ...(document.data() as FirestoreTeamDoc),
      id: document.id,
    }))
    .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
}

async function countPlayers(leagueId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("players")
    .where("leagueId", "==", leagueId)
    .get();
  recordFirestoreUsage({
    collection: "players",
    count: snapshot.size,
    operation: "read",
    query: "leagueId",
  });
  const byTeam = new Map<string, number>();

  for (const document of snapshot.docs) {
    const player = document.data() as { roster?: { teamId?: string | null } | null };
    const teamId = player.roster?.teamId;

    if (teamId) {
      byTeam.set(teamId, (byTeam.get(teamId) ?? 0) + 1);
    }
  }

  return {
    byTeam,
    total: snapshot.size,
  };
}

async function countMatchesBySeason(leagueId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection("matches")
    .where("leagueId", "==", leagueId)
    .get();
  recordFirestoreUsage({
    collection: "matches",
    count: snapshot.size,
    operation: "read",
    query: "leagueId",
  });
  const counts = new Map<string, number>();

  for (const document of snapshot.docs) {
    const match = document.data() as { seasonId?: string };
    const seasonId = match.seasonId;

    if (seasonId) {
      counts.set(seasonId, (counts.get(seasonId) ?? 0) + 1);
    }
  }

  return counts;
}

async function listCurrentTeamStats(leagueId: string, seasonId: string | null) {
  if (!seasonId) {
    return [];
  }

  const snapshot = await getFirebaseAdminFirestore()
    .collection("teamStats")
    .where("leagueId", "==", leagueId)
    .where("seasonId", "==", seasonId)
    .where("scope", "==", "SEASON")
    .get();
  recordFirestoreUsage({
    collection: "teamStats",
    count: snapshot.size,
    operation: "read",
    query: "leagueId+seasonId+scope",
  });

  return snapshot.docs.map((document) => document.data() as FirestoreTeamStatDoc);
}

function toListRecord(
  leagueId: string,
  league: FirestoreLeagueDoc,
  currentSeason: FirestoreSeasonDoc | null,
) {
  return {
    id: leagueId,
    name: league.name ?? leagueId,
    status: normalizeStatus(league.status),
    weekState: normalizeWeekState(league.weekState),
    leagueDefinition: {
      name: league.leagueDefinitionSnapshot?.name ?? league.name ?? "Firestore League",
    },
    currentSeason: currentSeason ? toSeasonRecord(currentSeason) : null,
    updatedAt: normalizeDate(league.updatedAt),
    _count: {
      players: league.counts?.playerCount ?? 0,
      teams: league.counts?.teamCount ?? 0,
    },
  };
}

function toSeasonRecord(season: FirestoreSeasonDoc) {
  return {
    id: season.id ?? "",
    phase: season.phase ?? "REGULAR_SEASON",
    week: season.currentWeekNumber ?? season.week ?? 1,
    year: season.year ?? 0,
  };
}

function centsToCurrencyUnits(value?: number) {
  return (value ?? 0) / 100;
}

function normalizeStatus(value: unknown): "ACTIVE" | "ARCHIVED" {
  return value === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
}

function normalizeWeekState(
  value: unknown,
): "PRE_WEEK" | "READY" | "GAME_RUNNING" | "POST_GAME" {
  if (
    value === "READY" ||
    value === "GAME_RUNNING" ||
    value === "POST_GAME"
  ) {
    return value;
  }

  return "PRE_WEEK";
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
