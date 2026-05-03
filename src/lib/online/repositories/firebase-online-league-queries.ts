import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
} from "firebase/firestore";

import { getCurrentAuthenticatedOnlineUser } from "../auth/online-auth";
import type { OnlineLeague } from "../online-league-service";
import { isSafeOnlineSyncId } from "../sync-guards";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreLeagueMemberMirrorDoc,
  type FirestoreOnlineDraftAvailablePlayerDoc,
  type FirestoreOnlineDraftPickDoc,
  type FirestoreOnlineDraftStateDoc,
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineLeagueSnapshot,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
  type OnlineLeagueReadOptions,
} from "../types";
import {
  createMembershipProjectionConflictMessage,
  createUnavailableOnlineLeague,
  getMembershipProjectionProblem,
  readDocData,
  resolveFirestoreMembershipForUser,
} from "./firebase-online-league-mappers";

type FirebaseOnlineUser = {
  userId: string;
  username: string;
  displayName: string;
};

type FirebaseLobbyDoc = {
  id: string;
  data(): unknown;
};

function leagueRef(db: Firestore, leagueId: string) {
  return doc(db, "leagues", leagueId);
}

function membershipRef(db: Firestore, leagueId: string, userId: string) {
  return doc(db, "leagues", leagueId, "memberships", userId);
}

function leagueMemberRef(db: Firestore, leagueId: string, userId: string) {
  return doc(db, "leagueMembers", `${leagueId}_${userId}`);
}

function teamsRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "teams");
}

function eventsRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "events");
}

function draftRef(db: Firestore, leagueId: string) {
  return doc(db, "leagues", leagueId, "draft", "main");
}

function draftPicksRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "draft", "main", "picks");
}

function draftAvailablePlayersRef(db: Firestore, leagueId: string) {
  return collection(db, "leagues", leagueId, "draft", "main", "availablePlayers");
}

function normalizeReadOptions(options?: OnlineLeagueReadOptions) {
  return {
    includeDraftPlayerPool: options?.includeDraftPlayerPool ?? true,
    draftPlayerLimit:
      typeof options?.draftPlayerLimit === "number" && options.draftPlayerLimit > 0
        ? Math.floor(options.draftPlayerLimit)
        : undefined,
  };
}

function draftAvailablePlayersQuery(
  db: Firestore,
  leagueId: string,
  draftPlayerLimit?: number,
) {
  const ref = draftAvailablePlayersRef(db, leagueId);

  return draftPlayerLimit ? query(ref, limit(draftPlayerLimit)) : ref;
}

export function resolveLeagueDiscoveryCandidateIds(input: {
  canonicalMembershipLeagueIds?: string[];
  mirroredLeagueIds?: string[];
}) {
  const canonicalMembershipLeagueIds = input.canonicalMembershipLeagueIds ?? [];
  const mirroredLeagueIds = input.mirroredLeagueIds ?? [];

  return Array.from(
    new Set([...canonicalMembershipLeagueIds, ...mirroredLeagueIds].filter(isSafeOnlineSyncId)),
  );
}

export async function getFirebaseCurrentUser() {
  return getCurrentAuthenticatedOnlineUser("firebase");
}

export async function getFirebaseOnlineLeagueSnapshot(
  db: Firestore,
  leagueId: string,
  options?: OnlineLeagueReadOptions,
): Promise<FirestoreOnlineLeagueSnapshot | null> {
  const readOptions = normalizeReadOptions(options);
  const [
    leagueSnapshot,
    membershipsSnapshot,
    teamsSnapshot,
    eventsSnapshot,
    draftSnapshot,
    draftPicksSnapshot,
    draftAvailablePlayersSnapshot,
  ] =
    await Promise.all([
      getDoc(leagueRef(db, leagueId)),
      getDocs(collection(db, "leagues", leagueId, "memberships")),
      getDocs(collection(db, "leagues", leagueId, "teams")),
      getDocs(query(eventsRef(db, leagueId), orderBy("createdAt", "desc"), limit(20))),
      getDoc(draftRef(db, leagueId)),
      getDocs(draftPicksRef(db, leagueId)),
      readOptions.includeDraftPlayerPool
        ? getDocs(draftAvailablePlayersQuery(db, leagueId, readOptions.draftPlayerLimit))
        : Promise.resolve(undefined),
    ]);
  const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);

  if (!league) {
    return null;
  }

  return {
    league,
    memberships: membershipsSnapshot.docs.map(
      (membership) => membership.data() as FirestoreOnlineMembershipDoc,
    ),
    teams: teamsSnapshot.docs.map((team) => team.data() as FirestoreOnlineTeamDoc),
    events: eventsSnapshot.docs.map((event) => event.data() as FirestoreOnlineEventDoc),
    draftState: draftSnapshot.exists()
      ? (draftSnapshot.data() as FirestoreOnlineDraftStateDoc)
      : undefined,
    draftPicks: draftPicksSnapshot.docs.map(
      (draftPick) => draftPick.data() as FirestoreOnlineDraftPickDoc,
    ),
    draftAvailablePlayers: draftAvailablePlayersSnapshot?.docs.map(
      (player) => player.data() as FirestoreOnlineDraftAvailablePlayerDoc,
    ),
  };
}

export async function getFirebaseMemberScopedLeagueSnapshot(
  db: Firestore,
  leagueId: string,
  user: FirebaseOnlineUser,
  options?: OnlineLeagueReadOptions,
): Promise<FirestoreOnlineLeagueSnapshot | null> {
  const [leagueSnapshot, membershipSnapshot, mirrorSnapshot] = await Promise.all([
    getDoc(leagueRef(db, leagueId)),
    getDoc(membershipRef(db, leagueId, user.userId)),
    getDoc(leagueMemberRef(db, leagueId, user.userId)),
  ]);
  const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);
  const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);
  const mirror = readDocData<FirestoreLeagueMemberMirrorDoc>(mirrorSnapshot);

  if (!league) {
    console.warn("[online-league] member-scoped load failed", {
      leagueId,
      userId: user.userId,
      hasLeague: Boolean(league),
      hasMembership: Boolean(membership),
      hasLeagueMemberMirror: Boolean(mirror),
      mirrorTeamId: mirror?.teamId,
      mirrorStatus: mirror?.status,
    });
    return null;
  }

  const teamsSnapshot = await getDocs(teamsRef(db, leagueId));
  const teams = teamsSnapshot.docs.map((team) => team.data() as FirestoreOnlineTeamDoc);
  if (membership && membership.userId !== user.userId) {
    const membershipProblem = `membership-user-mismatch:${membership.userId}`;

    console.warn("[online-league] membership document user mismatch", {
      leagueId,
      membershipUserId: membership.userId,
      userId: user.userId,
    });
    throw new Error(
      createMembershipProjectionConflictMessage(leagueId, user.userId, membershipProblem),
    );
  }

  const resolvedMembership = resolveFirestoreMembershipForUser(
    membership,
    mirror,
    teams,
    user,
    leagueId,
  );
  const membershipProblem = resolvedMembership
    ? getMembershipProjectionProblem(resolvedMembership, teams, mirror, leagueId)
    : getMembershipProjectionProblem(membership, teams, mirror, leagueId);

  if (membershipProblem) {
    console.warn("[online-league] membership/team connection invalid", {
      leagueId,
      userId: user.userId,
      reason: membershipProblem,
      membershipTeamId: membership?.teamId,
      membershipStatus: membership?.status,
      membershipRole: membership?.role,
      mirrorTeamId: mirror?.teamId,
      mirrorStatus: mirror?.status,
      team: teams.find((team) => team.id === membership?.teamId) ?? null,
    });
    if (resolvedMembership) {
      throw new Error(
        createMembershipProjectionConflictMessage(leagueId, user.userId, membershipProblem),
      );
    }

    return null;
  }

  const snapshot = await getFirebaseOnlineLeagueSnapshot(db, leagueId, options);

  if (!snapshot) {
    return null;
  }

  const memberships = snapshot.memberships.some(
    (candidate) => candidate.userId === resolvedMembership?.userId,
  )
    ? snapshot.memberships
    : resolvedMembership
      ? [...snapshot.memberships, resolvedMembership]
      : snapshot.memberships;

  return {
    ...snapshot,
    memberships,
  };
}

export async function mapFirebaseOnlineLeague(
  db: Firestore,
  leagueId: string,
  options?: OnlineLeagueReadOptions,
): Promise<OnlineLeague | null> {
  const snapshot = await getFirebaseOnlineLeagueSnapshot(db, leagueId, options);

  return snapshot ? mapFirestoreSnapshotToOnlineLeague(snapshot) : null;
}

export async function mapFirebaseMemberScopedLeague(
  db: Firestore,
  leagueId: string,
  user: FirebaseOnlineUser,
  options?: OnlineLeagueReadOptions,
): Promise<OnlineLeague | null> {
  const snapshot = await getFirebaseMemberScopedLeagueSnapshot(db, leagueId, user, options);

  return snapshot ? mapFirestoreSnapshotToOnlineLeague(snapshot) : null;
}

export async function mapFirebasePublicLobbyLeague(
  db: Firestore,
  leagueId: string,
  league: FirestoreOnlineLeagueDoc,
): Promise<OnlineLeague> {
  const teamsSnapshot = await getDocs(teamsRef(db, leagueId));
  const teams = teamsSnapshot.docs.map((team) => team.data() as FirestoreOnlineTeamDoc);
  const memberships: FirestoreOnlineMembershipDoc[] = teams
    .filter((team) => team.status !== "available" && team.assignedUserId)
    .map((team) => ({
      userId: team.assignedUserId as string,
      username: "Belegter Platz",
      role: "gm",
      teamId: team.id,
      joinedAt: team.updatedAt,
      lastSeenAt: team.updatedAt,
      ready: false,
      status: "active",
      displayName: "Belegter Platz",
    }));
  const snapshot: FirestoreOnlineLeagueSnapshot = {
    league,
    memberships,
    teams,
    events: [],
  };

  return mapFirestoreSnapshotToOnlineLeague(snapshot);
}

export async function resolveFirebaseActiveMembershipLeagueIds(
  db: Firestore,
  userId: string,
  candidateLeagueIds: string[],
) {
  const uniqueLeagueIds = Array.from(new Set(candidateLeagueIds));
  const resolvedLeagueIds = await Promise.all(
    uniqueLeagueIds.map(async (leagueId) => {
      const snapshot = await getDoc(membershipRef(db, leagueId, userId));
      const membership = readDocData<FirestoreOnlineMembershipDoc>(snapshot);

      return membership?.userId === userId && membership.status === "active" ? leagueId : null;
    }),
  );

  return resolvedLeagueIds.filter((leagueId): leagueId is string => Boolean(leagueId));
}

export async function getFirebaseJoinedLeagueIdsForUser(db: Firestore, userId: string) {
  const mirrorSnapshot = await getDocs(
    query(
      collection(db, "leagueMembers"),
      where("userId", "==", userId),
      where("status", "==", "ACTIVE"),
    ),
  );

  const mirroredLeagueIds = mirrorSnapshot.docs
    .map((membership) => (membership.data() as FirestoreLeagueMemberMirrorDoc).leagueId)
    .filter((leagueId): leagueId is string => isSafeOnlineSyncId(leagueId));

  return resolveFirebaseActiveMembershipLeagueIds(
    db,
    userId,
    resolveLeagueDiscoveryCandidateIds({ mirroredLeagueIds }),
  );
}

export async function mapFirebaseSearchLeagues(
  db: Firestore,
  lobbyDocs: FirebaseLobbyDoc[],
  joinedLeagueIds: string[],
) {
  const leaguesById = new Map<string, OnlineLeague>();

  await Promise.all(
    lobbyDocs.map(async (leagueDoc) => {
      const league = await mapFirebasePublicLobbyLeague(
        db,
        leagueDoc.id,
        leagueDoc.data() as FirestoreOnlineLeagueDoc,
      );

      leaguesById.set(league.id, league);
    }),
  );

  await Promise.all(
    joinedLeagueIds.map(async (leagueId) => {
      if (leaguesById.has(leagueId)) {
        return;
      }

      const snapshot = await getDoc(leagueRef(db, leagueId));
      const league = readDocData<FirestoreOnlineLeagueDoc>(snapshot);

      if (!league || league.settings.onlineBackbone !== true) {
        return;
      }

      leaguesById.set(leagueId, await mapFirebasePublicLobbyLeague(db, leagueId, league));
    }),
  );

  return Array.from(leaguesById.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function getFirebaseAvailableLeagues(db: Firestore) {
  const user = await getFirebaseCurrentUser();
  const snapshot = await getDocs(
    query(
      collection(db, "leagues"),
      where("status", "==", "lobby"),
      where("settings.onlineBackbone", "==", true),
    ),
  );
  const joinedLeagueIds = await getFirebaseJoinedLeagueIdsForUser(db, user.userId);

  return mapFirebaseSearchLeagues(db, snapshot.docs, joinedLeagueIds);
}

export async function getFirebaseLeagueById(
  db: Firestore,
  leagueId: string,
  options?: OnlineLeagueReadOptions,
) {
  if (!isSafeOnlineSyncId(leagueId)) {
    return null;
  }

  const user = await getFirebaseCurrentUser();

  return mapFirebaseMemberScopedLeague(db, leagueId, user, options);
}

export { createUnavailableOnlineLeague };
