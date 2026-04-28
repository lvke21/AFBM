import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

import { canReadFirestoreLeague, getFirestoreLeague } from "./firestoreAccess";
import { assertFirestoreEmulatorOnly } from "./firestoreGuard";

type FirestoreWeekDoc = {
  id: string;
  leagueId: string;
  seasonId: string;
  weekNumber: number;
  state: string;
};

export const weekRepositoryFirestore = {
  async findBySaveGame(saveGameId: string, weekId: string) {
    assertFirestoreEmulatorOnly();
    const snapshot = await getFirebaseAdminFirestore().collection("weeks").doc(weekId).get();

    if (!snapshot.exists) {
      return null;
    }

    const week = {
      ...(snapshot.data() as FirestoreWeekDoc),
      id: snapshot.id,
    };

    return week.leagueId === saveGameId ? week : null;
  },

  async findOwnedByUser(userId: string, saveGameId: string, weekId: string) {
    assertFirestoreEmulatorOnly();

    if (!(await canReadFirestoreLeague(userId, saveGameId))) {
      return null;
    }

    return this.findBySaveGame(saveGameId, weekId);
  },

  async findCurrentBySaveGame(saveGameId: string) {
    assertFirestoreEmulatorOnly();
    const league = await getFirestoreLeague(saveGameId);
    const currentWeekId = league?.currentWeekId;

    return typeof currentWeekId === "string"
      ? this.findBySaveGame(saveGameId, currentWeekId)
      : null;
  },
};
