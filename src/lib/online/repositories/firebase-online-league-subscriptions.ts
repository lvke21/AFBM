import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Firestore,
} from "firebase/firestore";

import {
  createCoalescedAsyncEmitter,
  createOrderedAsyncEmitter,
  isSafeOnlineSyncId,
} from "../sync-guards";
import type { OnlineLeague } from "../online-league-service";
import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineEventDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
  OnlineLeagueReadOptions,
  OnlineLeagueRepositoryUnsubscribe,
} from "../types";
import { readDocData } from "./firebase-online-league-mappers";
import {
  getFirebaseCurrentUser,
  mapFirebaseOnlineLeague,
  mapFirebaseSearchLeagues,
  resolveFirebaseActiveMembershipLeagueIds,
  resolveLeagueDiscoveryCandidateIds,
} from "./firebase-online-league-queries";
import { createUnsafeLeagueIdError } from "./firebase-online-league-commands";

function leagueRef(db: Firestore, leagueId: string) {
  return doc(db, "leagues", leagueId);
}

function membershipRef(db: Firestore, leagueId: string, userId: string) {
  return doc(db, "leagues", leagueId, "memberships", userId);
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

function subscribeToLeagueCoreDocs(
  db: Firestore,
  leagueId: string,
  onChange: () => void,
  onError?: (error: Error) => void,
): OnlineLeagueRepositoryUnsubscribe[] {
  return [
    onSnapshot(leagueRef(db, leagueId), onChange, (error) => onError?.(error)),
    onSnapshot(
      collection(db, "leagues", leagueId, "memberships"),
      onChange,
      (error) => onError?.(error),
    ),
    onSnapshot(teamsRef(db, leagueId), onChange, (error) => onError?.(error)),
  ];
}

function subscribeToLeagueDraftDocs(
  db: Firestore,
  leagueId: string,
  onChange: () => void,
  onError?: (error: Error) => void,
  options?: OnlineLeagueReadOptions,
): OnlineLeagueRepositoryUnsubscribe[] {
  const readOptions = normalizeReadOptions(options);
  const subscriptions: OnlineLeagueRepositoryUnsubscribe[] = [
    onSnapshot(draftRef(db, leagueId), onChange, (error) => onError?.(error)),
    onSnapshot(draftPicksRef(db, leagueId), onChange, (error) => onError?.(error)),
  ];

  if (readOptions.includeDraftPlayerPool) {
    subscriptions.push(
      onSnapshot(
        draftAvailablePlayersQuery(db, leagueId, readOptions.draftPlayerLimit),
        onChange,
        (error) => onError?.(error),
      ),
    );
  }

  return subscriptions;
}

function mapFirebaseLeagueEvents(
  league: OnlineLeague,
  events: FirestoreOnlineEventDoc[],
): OnlineLeague["events"] {
  return events.map((event) => ({
    id: `${event.type}-${event.createdAt}`,
    eventType: event.type as never,
    leagueId: league.id,
    teamId: "",
    userId: event.createdByUserId,
    reason: JSON.stringify(event.payload),
    season: league.currentSeason ?? 1,
    week: league.currentWeek,
    createdAt: event.createdAt,
  }));
}

export function subscribeToFirebaseLeague(
  db: Firestore,
  leagueId: string,
  onNext: Parameters<import("../types").OnlineLeagueRepository["subscribeToLeague"]>[1],
  onError?: (error: Error) => void,
  options?: OnlineLeagueReadOptions,
): OnlineLeagueRepositoryUnsubscribe {
  if (!isSafeOnlineSyncId(leagueId)) {
    queueMicrotask(() => onError?.(createUnsafeLeagueIdError()));

    return () => undefined;
  }

  const emitter = createCoalescedAsyncEmitter(
    onNext,
    onError,
    "Online-Liga konnte nicht aus Firebase geladen werden.",
  );
  let active = true;
  let latestLeague: OnlineLeague | null = null;
  let latestEvents: FirestoreOnlineEventDoc[] | null = null;
  const readOptions = normalizeReadOptions(options);
  const emit = () =>
    emitter.emit(async () => {
      const league = await mapFirebaseOnlineLeague(db, leagueId, readOptions);

      latestLeague = league;

      return league && latestEvents
        ? {
            ...league,
            events: mapFirebaseLeagueEvents(league, latestEvents),
          }
        : league;
    });
  const unsubscribers = [
    ...subscribeToLeagueCoreDocs(db, leagueId, emit, onError),
    ...subscribeToLeagueDraftDocs(db, leagueId, emit, onError, readOptions),
    onSnapshot(
      query(eventsRef(db, leagueId), orderBy("createdAt", "desc"), limit(20)),
      (snapshot) => {
        latestEvents = snapshot.docs.map((event) => event.data() as FirestoreOnlineEventDoc);

        if (active && latestLeague) {
          latestLeague = {
            ...latestLeague,
            events: mapFirebaseLeagueEvents(latestLeague, latestEvents),
          };
          onNext(latestLeague);
        }
      },
      (error) => onError?.(error),
    ),
  ];

  return () => {
    active = false;
    emitter.close();
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeToFirebaseAvailableLeagues(
  db: Firestore,
  onNext: Parameters<import("../types").OnlineLeagueRepository["subscribeToAvailableLeagues"]>[0],
  onError?: (error: Error) => void,
): OnlineLeagueRepositoryUnsubscribe {
  const emitter = createOrderedAsyncEmitter(
    onNext,
    onError,
    "Verfuegbare Online-Ligen konnten nicht synchronisiert werden.",
  );
  let lobbyDocs: Array<{ id: string; data(): unknown }> = [];
  let joinedLeagueIds: string[] = [];
  let mirroredLeagueIds: string[] = [];
  let active = true;
  let membershipValidationRun = 0;
  const emit = () => {
    emitter.emit(() => mapFirebaseSearchLeagues(db, lobbyDocs, joinedLeagueIds));
  };
  const resolveDiscoveryIds = (userId: string) => {
    const validationRun = ++membershipValidationRun;

    resolveFirebaseActiveMembershipLeagueIds(
      db,
      userId,
      resolveLeagueDiscoveryCandidateIds({ mirroredLeagueIds }),
    )
      .then((resolvedLeagueIds) => {
        if (!active || validationRun !== membershipValidationRun) {
          return;
        }

        joinedLeagueIds = resolvedLeagueIds;
        emit();
      })
      .catch((error) => {
        if (active) {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      });
  };
  const unsubscribers: OnlineLeagueRepositoryUnsubscribe[] = [];
  const unsubscribeLobby = onSnapshot(
    query(
      collection(db, "leagues"),
      where("status", "==", "lobby"),
      where("settings.onlineBackbone", "==", true),
    ),
    (snapshot) => {
      lobbyDocs = snapshot.docs;
      emit();
    },
    (error) => onError?.(error),
  );
  unsubscribers.push(unsubscribeLobby);

  getFirebaseCurrentUser()
    .then((user) => {
      if (!active) {
        return;
      }

      const unsubscribeMemberships = onSnapshot(
        query(
          collection(db, "leagueMembers"),
          where("userId", "==", user.userId),
          where("status", "==", "ACTIVE"),
        ),
        (snapshot) => {
          mirroredLeagueIds = snapshot.docs
            .map((membership) => (membership.data() as FirestoreLeagueMemberMirrorDoc).leagueId)
            .filter((leagueId): leagueId is string => isSafeOnlineSyncId(leagueId));
          resolveDiscoveryIds(user.userId);
        },
        (error) => onError?.(error),
      );
      unsubscribers.push(unsubscribeMemberships);
    })
    .catch((error) => {
      if (active) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    });

  return () => {
    active = false;
    emitter.close();
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeToFirebaseMemberships(
  db: Firestore,
  leagueId: string,
  onNext: (memberships: FirestoreOnlineMembershipDoc[]) => void,
  onError?: (error: Error) => void,
): OnlineLeagueRepositoryUnsubscribe {
  return onSnapshot(
    collection(db, "leagues", leagueId, "memberships"),
    (snapshot) =>
      onNext(snapshot.docs.map((membership) => membership.data() as FirestoreOnlineMembershipDoc)),
    (error) => onError?.(error),
  );
}

export function subscribeToFirebaseTeams(
  db: Firestore,
  leagueId: string,
  onNext: (teams: FirestoreOnlineTeamDoc[]) => void,
  onError?: (error: Error) => void,
): OnlineLeagueRepositoryUnsubscribe {
  return onSnapshot(
    teamsRef(db, leagueId),
    (snapshot) => onNext(snapshot.docs.map((team) => team.data() as FirestoreOnlineTeamDoc)),
    (error) => onError?.(error),
  );
}

export function subscribeToFirebaseCurrentUserMembership(
  db: Firestore,
  leagueId: string,
  userId: string,
  onNext: (membership: FirestoreOnlineMembershipDoc | null) => void,
  onError?: (error: Error) => void,
): OnlineLeagueRepositoryUnsubscribe {
  return onSnapshot(
    membershipRef(db, leagueId, userId),
    (snapshot) => onNext(readDocData<FirestoreOnlineMembershipDoc>(snapshot)),
    (error) => onError?.(error),
  );
}

export function subscribeToFirebaseLeagueEvents(
  db: Firestore,
  leagueId: string,
  onNext: (events: FirestoreOnlineEventDoc[]) => void,
  onError?: (error: Error) => void,
): OnlineLeagueRepositoryUnsubscribe {
  return onSnapshot(
    query(eventsRef(db, leagueId), orderBy("createdAt", "desc"), limit(20)),
    (snapshot) => onNext(snapshot.docs.map((event) => event.data() as FirestoreOnlineEventDoc)),
    (error) => onError?.(error),
  );
}
