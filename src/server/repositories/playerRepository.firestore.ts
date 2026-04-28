import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import type { PlayerDetailRecord } from "@/modules/players/infrastructure/player.repository";

import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import {
  mapFirestorePlayerDocument,
  mapFirestorePlayerToDetailRecord,
  mapFirestoreTeamDocument,
  type FirestorePlayerDoc,
  type FirestoreTeamDoc,
} from "./firestoreRepositoryMappers";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

export type FirestorePlayerWrite = FirestorePlayerDoc;
type FirestorePlayerStatsForDetail = NonNullable<
  Parameters<typeof mapFirestorePlayerToDetailRecord>[0]["playerStats"]
>;

export const playerRepositoryFirestore = {
  async findBySaveGame(saveGameId: string, playerId: string): Promise<PlayerDetailRecord | null> {
    assertFirestoreEmulatorOnly();
    const firestore = getFirebaseAdminFirestore();
    const playerSnapshot = await firestore.collection("players").doc(playerId).get();
    recordFirestoreUsage({
      collection: "players",
      count: playerSnapshot.exists ? 1 : 0,
      operation: "read",
      query: "doc",
    });

    if (!playerSnapshot.exists) {
      return null;
    }

    const player = mapFirestorePlayerDocument(
      playerSnapshot.id,
      playerSnapshot.data() as FirestorePlayerDoc,
    );

    if (player.leagueId !== saveGameId) {
      return null;
    }

    return buildPlayerDetailRecord(player);
  },

  async findOwnedByUser(
    userId: string,
    saveGameId: string,
    playerId: string,
  ): Promise<PlayerDetailRecord | null> {
    assertFirestoreEmulatorOnly();

    if (!(await canReadLeague(userId, saveGameId))) {
      return null;
    }

    return this.findBySaveGame(saveGameId, playerId);
  },

  async findByTeam(saveGameId: string, teamId: string): Promise<PlayerDetailRecord[]> {
    assertFirestoreEmulatorOnly();
    const firestore = getFirebaseAdminFirestore();
    const playersSnapshot = await firestore
      .collection("players")
      .where("leagueId", "==", saveGameId)
      .where("roster.teamId", "==", teamId)
      .get();
    recordFirestoreUsage({
      collection: "players",
      count: playersSnapshot.size,
      operation: "read",
      query: "leagueId+roster.teamId",
    });
    const players = playersSnapshot.docs
      .map((document) =>
        mapFirestorePlayerDocument(document.id, document.data() as FirestorePlayerDoc),
      );

    if (players.length === 0) {
      return [];
    }

    const leagueSnapshot = await firestore.collection("leagues").doc(saveGameId).get();
    recordFirestoreUsage({
      collection: "leagues",
      count: leagueSnapshot.exists ? 1 : 0,
      operation: "read",
      query: "doc",
    });
    const league = leagueSnapshot.data();
    const currentSeasonId = typeof league?.currentSeasonId === "string"
      ? league.currentSeasonId
      : null;
    const [teamSnapshot, seasonSnapshot, statsSnapshot] = await Promise.all([
      firestore.collection("teams").doc(teamId).get(),
      currentSeasonId
        ? firestore.collection("seasons").doc(currentSeasonId).get()
        : Promise.resolve(null),
      currentSeasonId
        ? firestore
            .collection("playerStats")
            .where("leagueId", "==", saveGameId)
            .where("seasonId", "==", currentSeasonId)
            .where("teamId", "==", teamId)
            .where("scope", "==", "SEASON")
            .get()
        : Promise.resolve(null),
    ]);
    recordFirestoreUsage({
      collection: "teams",
      count: teamSnapshot.exists ? 1 : 0,
      operation: "read",
      query: "doc",
    });
    recordFirestoreUsage({
      collection: "seasons",
      count: seasonSnapshot?.exists ? 1 : 0,
      operation: "read",
      query: "doc",
    });
    recordFirestoreUsage({
      collection: "playerStats",
      count: statsSnapshot?.size ?? 0,
      operation: "read",
      query: "leagueId+seasonId+teamId+scope",
    });
    const team = teamSnapshot.exists
      ? mapFirestoreTeamDocument(
          teamSnapshot.id,
          teamSnapshot.data() as FirestoreTeamDoc,
        )
      : null;
    const currentSeason = seasonSnapshot?.exists
      ? {
          id: seasonSnapshot.id,
          year: seasonSnapshot.data()?.year ?? 0,
        }
      : null;
    const playerStatsByPlayer = new Map<string, FirestorePlayerStatsForDetail>();

    for (const document of statsSnapshot?.docs ?? []) {
      const stat = document.data() as FirestorePlayerStatsForDetail[number] & { playerId?: string };
      const playerId = String(stat.playerId ?? "");
      playerStatsByPlayer.set(playerId, [
        ...(playerStatsByPlayer.get(playerId) ?? []),
        stat,
      ]);
    }

    return players.map((player) =>
      mapFirestorePlayerToDetailRecord({
        currentSeason,
        league: {
          id: leagueSnapshot.id,
          ownerId: league?.ownerId ?? "",
          currentSeasonId,
        },
        player,
        playerStats: playerStatsByPlayer.get(player.id) ?? [],
        team,
      }),
    );
  },

  async save(player: FirestorePlayerWrite) {
    assertFirestoreEmulatorOnly();
    await getFirebaseAdminFirestore().collection("players").doc(player.id).set(player, {
      merge: true,
    });
    recordFirestoreUsage({
      collection: "players",
      count: 1,
      operation: "write",
      query: "doc set merge",
    });
  },
};

async function buildPlayerDetailRecord(player: FirestorePlayerDoc) {
  const firestore = getFirebaseAdminFirestore();
  const teamId = player.roster?.teamId ?? null;
  const [leagueSnapshot, teamSnapshot, statsSnapshot] = await Promise.all([
    firestore.collection("leagues").doc(player.leagueId).get(),
    teamId ? firestore.collection("teams").doc(teamId).get() : Promise.resolve(null),
    firestore.collection("playerStats")
      .where("playerId", "==", player.id)
      .where("scope", "==", "SEASON")
      .get(),
  ]);
  recordFirestoreUsage({
    collection: "leagues",
    count: leagueSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });
  recordFirestoreUsage({
    collection: "teams",
    count: teamSnapshot?.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });
  recordFirestoreUsage({
    collection: "playerStats",
    count: statsSnapshot.size,
    operation: "read",
    query: "playerId+scope",
  });
  const league = leagueSnapshot.data();
  const currentSeasonId = league?.currentSeasonId;
  const seasonSnapshot = currentSeasonId
    ? await firestore.collection("seasons").doc(currentSeasonId).get()
    : null;
  recordFirestoreUsage({
    collection: "seasons",
    count: seasonSnapshot?.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });
  const team = teamSnapshot?.exists
      ? mapFirestoreTeamDocument(
          teamSnapshot.id,
          teamSnapshot.data() as FirestoreTeamDoc,
        )
    : null;

  return mapFirestorePlayerToDetailRecord({
    currentSeason: seasonSnapshot?.exists
      ? {
          id: seasonSnapshot.id,
          year: seasonSnapshot.data()?.year ?? 0,
        }
      : null,
    league: {
      id: leagueSnapshot.id,
      ownerId: league?.ownerId ?? "",
      currentSeasonId: currentSeasonId ?? null,
    },
    player,
    playerStats: statsSnapshot.docs.map((document) => document.data()),
    team,
  });
}

async function canReadLeague(userId: string, leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const [leagueSnapshot, membershipSnapshot] = await Promise.all([
    firestore.collection("leagues").doc(leagueId).get(),
    firestore.collection("leagueMembers").doc(`${leagueId}_${userId}`).get(),
  ]);
  recordFirestoreUsage({
    collection: "leagues",
    count: leagueSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });
  recordFirestoreUsage({
    collection: "leagueMembers",
    count: membershipSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });

  const league = leagueSnapshot.data();
  const membership = membershipSnapshot.data();

  return league?.ownerId === userId || membership?.status === "ACTIVE";
}
