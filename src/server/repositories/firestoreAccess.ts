import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

import { recordFirestoreUsage } from "./firestoreUsageLogger";

type FirestoreLeagueAccessData = {
  createdByUserId?: string;
  ownerId?: string;
  settings?: {
    onlineBackbone?: unknown;
  } | null;
};

type FirestoreLegacyLeagueMemberMirrorData = {
  status?: string;
  userId?: string;
};

type FirestoreOnlineMembershipData = {
  status?: string;
  userId?: string;
};

function isOnlineBackboneLeague(league: FirestoreLeagueAccessData | null | undefined) {
  return league?.settings?.onlineBackbone === true;
}

export function canReadFirestoreLeagueFromDocs(input: {
  legacyMirror?: FirestoreLegacyLeagueMemberMirrorData | null;
  league?: FirestoreLeagueAccessData | null;
  onlineMembership?: FirestoreOnlineMembershipData | null;
  userId: string;
}) {
  const { legacyMirror, league, onlineMembership, userId } = input;

  if (!league) {
    return false;
  }

  if (league.ownerId === userId || league.createdByUserId === userId) {
    return true;
  }

  if (isOnlineBackboneLeague(league)) {
    return onlineMembership?.userId === userId && onlineMembership.status === "active";
  }

  return legacyMirror?.userId === userId && legacyMirror.status === "ACTIVE";
}

export async function canReadFirestoreLeague(userId: string, leagueId: string) {
  const firestore = getFirebaseAdminFirestore();
  const [leagueSnapshot, legacyMirrorSnapshot, onlineMembershipSnapshot] = await Promise.all([
    firestore.collection("leagues").doc(leagueId).get(),
    firestore.collection("leagueMembers").doc(`${leagueId}_${userId}`).get(),
    firestore.collection("leagues").doc(leagueId).collection("memberships").doc(userId).get(),
  ]);
  recordFirestoreUsage({
    collection: "leagues",
    count: leagueSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });
  recordFirestoreUsage({
    collection: "leagueMembers",
    count: legacyMirrorSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });
  recordFirestoreUsage({
    collection: "leagues/{leagueId}/memberships",
    count: onlineMembershipSnapshot.exists ? 1 : 0,
    operation: "read",
    query: "doc",
  });

  return canReadFirestoreLeagueFromDocs({
    userId,
    league: leagueSnapshot.data() as FirestoreLeagueAccessData | undefined,
    legacyMirror: legacyMirrorSnapshot.data() as FirestoreLegacyLeagueMemberMirrorData | undefined,
    onlineMembership: onlineMembershipSnapshot.data() as FirestoreOnlineMembershipData | undefined,
  });
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
