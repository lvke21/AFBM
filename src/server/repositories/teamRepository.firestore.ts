import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import type { TeamDetailRecord } from "@/modules/teams/infrastructure/team.repository";

import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import {
  mapFirestorePlayerDocument,
  mapFirestoreTeamDocument,
  mapFirestoreTeamToDetailRecord,
  type FirestoreTeamDoc,
} from "./firestoreRepositoryMappers";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

export type FirestoreTeamWrite = FirestoreTeamDoc;

export const teamRepositoryFirestore = {
  async findBySaveGame(saveGameId: string, teamId: string): Promise<TeamDetailRecord | null> {
    assertFirestoreEmulatorOnly();
    const firestore = getFirebaseAdminFirestore();
    const teamSnapshot = await firestore.collection("teams").doc(teamId).get();
    recordFirestoreUsage({
      collection: "teams",
      count: teamSnapshot.exists ? 1 : 0,
      operation: "read",
      query: "doc",
    });

    if (!teamSnapshot.exists) {
      return null;
    }

    const team = mapFirestoreTeamDocument(
      teamSnapshot.id,
      teamSnapshot.data() as FirestoreTeamDoc,
    );

    if (team.leagueId !== saveGameId) {
      return null;
    }

    const [playersSnapshot, teamStatsSnapshot] = await Promise.all([
      firestore.collection("players").where("roster.teamId", "==", teamId).get(),
      firestore.collection("teamStats").where("teamId", "==", teamId).limit(1).get(),
    ]);
    recordFirestoreUsage({
      collection: "players",
      count: playersSnapshot.size,
      operation: "read",
      query: "roster.teamId",
    });
    recordFirestoreUsage({
      collection: "teamStats",
      count: teamStatsSnapshot.size,
      operation: "read",
      query: "teamId limit 1",
    });

    return mapFirestoreTeamToDetailRecord({
      players: playersSnapshot.docs.map((document) =>
        mapFirestorePlayerDocument(document.id, document.data() as Parameters<typeof mapFirestorePlayerDocument>[1]),
      ),
      team,
      teamStats: teamStatsSnapshot.docs[0]?.data() ?? null,
    });
  },

  async findOwnedByUser(
    userId: string,
    saveGameId: string,
    teamId: string,
  ): Promise<TeamDetailRecord | null> {
    assertFirestoreEmulatorOnly();

    if (!(await canReadLeague(userId, saveGameId))) {
      return null;
    }

    return this.findBySaveGame(saveGameId, teamId);
  },

  async save(team: FirestoreTeamWrite) {
    assertFirestoreEmulatorOnly();
    await getFirebaseAdminFirestore().collection("teams").doc(team.id).set(team, {
      merge: true,
    });
    recordFirestoreUsage({
      collection: "teams",
      count: 1,
      operation: "write",
      query: "doc set merge",
    });
  },

  async listByLeague(leagueId: string): Promise<TeamDetailRecord[]> {
    assertFirestoreEmulatorOnly();
    const firestore = getFirebaseAdminFirestore();
    const snapshot = await firestore
      .collection("teams")
      .where("leagueId", "==", leagueId)
      .orderBy("abbreviation", "asc")
      .get();
    recordFirestoreUsage({
      collection: "teams",
      count: snapshot.size,
      operation: "read",
      query: "leagueId orderBy abbreviation",
    });
    const teams = snapshot.docs.map((document) =>
      mapFirestoreTeamDocument(document.id, document.data() as FirestoreTeamDoc),
    );
    const teamIds = new Set(teams.map((team) => team.id));
    const [playersSnapshot, teamStatsSnapshot] = await Promise.all([
      firestore.collection("players").where("leagueId", "==", leagueId).get(),
      firestore
        .collection("teamStats")
        .where("leagueId", "==", leagueId)
        .where("scope", "==", "SEASON")
        .get(),
    ]);
    recordFirestoreUsage({
      collection: "players",
      count: playersSnapshot.size,
      operation: "read",
      query: "leagueId",
    });
    recordFirestoreUsage({
      collection: "teamStats",
      count: teamStatsSnapshot.size,
      operation: "read",
      query: "leagueId+scope",
    });
    const playersByTeam = new Map<string, ReturnType<typeof mapFirestorePlayerDocument>[]>();

    for (const document of playersSnapshot.docs) {
      const player = mapFirestorePlayerDocument(
        document.id,
        document.data() as Parameters<typeof mapFirestorePlayerDocument>[1],
      );
      const playerTeamId = player.roster?.teamId;

      if (!playerTeamId || !teamIds.has(playerTeamId)) {
        continue;
      }

      playersByTeam.set(playerTeamId, [
        ...(playersByTeam.get(playerTeamId) ?? []),
        player,
      ]);
    }

    const teamStatsByTeam = new Map(
      teamStatsSnapshot.docs.map((document) => {
        const stat = document.data();
        return [String(stat.teamId ?? ""), stat];
      }),
    );

    return teams.map((team) =>
      mapFirestoreTeamToDetailRecord({
        players: playersByTeam.get(team.id) ?? [],
        team,
        teamStats: teamStatsByTeam.get(team.id) ?? null,
      }),
    );
  },
};

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
