import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

import { recordFirestoreUsage } from "./firestoreUsageLogger";

export async function canReadFirestoreLeague(userId: string, leagueId: string) {
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

export type FirestoreLeagueAccessDoc = {
  id: string;
  ownerId?: string;
  currentSeasonId?: string | null;
  currentWeekId?: string | null;
};

export async function getFirestoreLeague(leagueId: string): Promise<FirestoreLeagueAccessDoc | null> {
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
        ...snapshot.data(),
        id: snapshot.id,
      }
    : null;
}
