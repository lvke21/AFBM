import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
  type Firestore,
} from "firebase/firestore";

import { getFirebaseClientApp } from "@/lib/firebase/client";

import {
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  ONLINE_MVP_TEAM_POOL,
  type JoinOnlineLeagueResult,
  type OnlineDepthChartEntry,
  type OnlineLeague,
} from "../online-league-service";
import { getCurrentAuthenticatedOnlineUser } from "../auth/online-auth";
import {
  resolveTeamIdentitySelection,
  type TeamIdentitySelection,
} from "../team-identity-options";
import {
  mapFirestoreSnapshotToOnlineLeague,
  mapLocalTeamToFirestoreTeam,
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineLeagueSnapshot,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
  type OnlineLeagueRepository,
  type OnlineLeagueRepositoryUnsubscribe,
} from "../types";

function nowIso() {
  return new Date().toISOString();
}

function createEvent(
  type: string,
  createdByUserId: string,
  payload: Record<string, unknown> = {},
): FirestoreOnlineEventDoc {
  return {
    type,
    createdAt: nowIso(),
    createdByUserId,
    payload,
  };
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function readDocData<T>(snapshot: { exists(): boolean; data(): unknown } | null): T | null {
  if (!snapshot?.exists()) {
    return null;
  }

  return snapshot.data() as T;
}

function rejectClientAdminAction<T>(): Promise<T> {
  return Promise.reject(
    new Error("Admin-Aktionen werden serverseitig über den Admin-Route-Handler ausgeführt."),
  );
}

export class FirebaseOnlineLeagueRepository implements OnlineLeagueRepository {
  readonly mode = "firebase" as const;
  private readonly db: Firestore;

  constructor(db = getFirestore(getFirebaseClientApp())) {
    this.db = db;
  }

  private leagueRef(leagueId: string) {
    return doc(this.db, "leagues", leagueId);
  }

  private membershipRef(leagueId: string, userId: string) {
    return doc(this.db, "leagues", leagueId, "memberships", userId);
  }

  private teamsRef(leagueId: string) {
    return collection(this.db, "leagues", leagueId, "teams");
  }

  private teamRef(leagueId: string, teamId: string) {
    return doc(this.db, "leagues", leagueId, "teams", teamId);
  }

  private eventsRef(leagueId: string) {
    return collection(this.db, "leagues", leagueId, "events");
  }

  private async getSnapshot(leagueId: string) {
    const [leagueSnapshot, membershipsSnapshot, teamsSnapshot, eventsSnapshot] =
      await Promise.all([
        getDoc(this.leagueRef(leagueId)),
        getDocs(collection(this.db, "leagues", leagueId, "memberships")),
        getDocs(collection(this.db, "leagues", leagueId, "teams")),
        getDocs(query(this.eventsRef(leagueId), orderBy("createdAt", "desc"), limit(20))),
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
    };
  }

  private async mapLeague(leagueId: string): Promise<OnlineLeague | null> {
    const snapshot = await this.getSnapshot(leagueId);

    return snapshot ? mapFirestoreSnapshotToOnlineLeague(snapshot) : null;
  }

  private async mapPublicLobbyLeague(
    leagueId: string,
    league: FirestoreOnlineLeagueDoc,
  ): Promise<OnlineLeague> {
    const teamsSnapshot = await getDocs(this.teamsRef(leagueId));
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

  async getCurrentUser() {
    return getCurrentAuthenticatedOnlineUser("firebase");
  }

  async createLeague(): Promise<OnlineLeague> {
    throw new Error(
      "Admin-Aktionen werden serverseitig über den Admin-Route-Handler ausgeführt.",
    );
  }

  async getAvailableLeagues() {
    const snapshot = await getDocs(
      query(
        collection(this.db, "leagues"),
        where("status", "==", "lobby"),
        where("settings.onlineBackbone", "==", true),
      ),
    );
    const leagues = await Promise.all(
      snapshot.docs.map((league) =>
        this.mapPublicLobbyLeague(
          league.id,
          league.data() as FirestoreOnlineLeagueDoc,
        ),
      ),
    );

    return leagues;
  }

  async getLeagueById(leagueId: string) {
    return this.mapLeague(leagueId);
  }

  async joinLeague(
    leagueId: string,
    teamIdentity?: TeamIdentitySelection,
  ): Promise<JoinOnlineLeagueResult> {
    const user = await this.getCurrentUser();
    const preloadedTeamsSnapshot = await getDocs(this.teamsRef(leagueId));
    const joinedLeague = await runTransaction(this.db, async (transaction) => {
      const leagueSnapshot = await transaction.get(this.leagueRef(leagueId));
      const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);

      if (!league) {
        throw new Error("Liga konnte nicht gefunden werden.");
      }

      if (league.status !== "lobby") {
        throw new Error("Diese Liga ist nicht mehr in der Lobby.");
      }

      const membershipSnapshot = await transaction.get(this.membershipRef(leagueId, user.userId));
      const existingMembership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

      if (existingMembership?.status === "active" && existingMembership.teamId) {
        return {
          status: "already-member" as const,
          leagueId,
        };
      }

      if (league.memberCount >= league.maxTeams) {
        return {
          status: "full" as const,
          leagueId,
        };
      }

      let teams = preloadedTeamsSnapshot.docs.map(
        (team) => team.data() as FirestoreOnlineTeamDoc,
      );
      const createdAt = nowIso();

      if (teams.length === 0) {
        teams = ONLINE_MVP_TEAM_POOL.slice(0, league.maxTeams).map((team) =>
          mapLocalTeamToFirestoreTeam(team, createdAt),
        );
        teams.forEach((team) => transaction.set(this.teamRef(leagueId, team.id), team));
      }

      const resolvedIdentity = teamIdentity
        ? resolveTeamIdentitySelection(teamIdentity)
        : null;
      const identityTaken =
        resolvedIdentity &&
        teams.some(
          (team) =>
            team.status !== "available" &&
            team.cityId === resolvedIdentity.cityId &&
            team.teamNameId === resolvedIdentity.teamNameId,
        );

      if (identityTaken) {
        return {
          status: "team-identity-taken" as const,
          leagueId,
        };
      }

      const availableTeam = teams.find((team) => team.status === "available");

      if (!availableTeam) {
        return {
          status: "full" as const,
          leagueId,
        };
      }

      const currentAvailableTeam = preloadedTeamsSnapshot.empty
        ? availableTeam
        : (readDocData<FirestoreOnlineTeamDoc>(
            await transaction.get(this.teamRef(leagueId, availableTeam.id)),
          ) ?? availableTeam);

      if (currentAvailableTeam.status !== "available" && currentAvailableTeam.status !== "vacant") {
        return {
          status: "full" as const,
          leagueId,
        };
      }

      const nextTeam: FirestoreOnlineTeamDoc = {
        ...currentAvailableTeam,
        cityId: resolvedIdentity?.cityId ?? availableTeam.cityId,
        cityName: resolvedIdentity?.cityName ?? availableTeam.cityName,
        teamNameId: resolvedIdentity?.teamNameId ?? availableTeam.teamNameId,
        teamName: resolvedIdentity?.teamName ?? availableTeam.teamName,
        displayName: resolvedIdentity?.teamDisplayName ?? availableTeam.displayName,
        assignedUserId: user.userId,
        status: "assigned",
        updatedAt: createdAt,
      };
      const membership: FirestoreOnlineMembershipDoc = {
        userId: user.userId,
        username: user.username,
        role: existingMembership?.role === "admin" ? "admin" : "gm",
        teamId: nextTeam.id,
        joinedAt: existingMembership?.joinedAt ?? createdAt,
        lastSeenAt: createdAt,
        ready: false,
        status: "active",
        displayName: user.displayName,
      };

      transaction.set(this.teamRef(leagueId, nextTeam.id), nextTeam, { merge: true });
      transaction.set(this.membershipRef(leagueId, user.userId), membership, { merge: true });
      transaction.update(this.leagueRef(leagueId), {
        memberCount: increment(existingMembership?.teamId ? 0 : 1),
        updatedAt: createdAt,
        version: increment(1),
      });
      transaction.set(
        doc(this.eventsRef(leagueId)),
        createEvent("user_joined_league", user.userId, {
          teamId: nextTeam.id,
          teamDisplayName: nextTeam.displayName,
        }),
      );

      return {
        status: "joined" as const,
        leagueId,
      };
    });
    const league = (await this.mapLeague(leagueId)) ?? mapFirestoreSnapshotToOnlineLeague({
      league: {
        id: leagueId,
        name: "Online Liga",
        status: "lobby",
        createdByUserId: user.userId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        maxTeams: 16,
        memberCount: 0,
        currentWeek: 1,
        currentSeason: 1,
        settings: {
          onlineBackbone: true,
        },
        version: 1,
      },
      memberships: [],
      teams: [],
    });

    this.setLastLeagueId(leagueId);

    if (joinedLeague.status === "full") {
      return {
        status: "full",
        league,
        message: "Diese Liga ist bereits voll.",
      };
    }

    if (joinedLeague.status === "team-identity-taken") {
      return {
        status: "team-identity-taken",
        league,
        message: "Diese Team-Identität ist in der Liga bereits vergeben.",
      };
    }

    return {
      status: joinedLeague.status,
      league,
    };
  }

  async setUserReady(leagueId: string, ready: boolean) {
    const user = await this.getCurrentUser();
    const updatedAt = nowIso();

    await runTransaction(this.db, async (transaction) => {
      const membershipSnapshot = await transaction.get(this.membershipRef(leagueId, user.userId));
      const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

      if (!membership || membership.status !== "active") {
        throw new Error("Nur aktive Liga-Mitglieder können Ready setzen.");
      }

      transaction.update(this.membershipRef(leagueId, user.userId), {
        ready,
        lastSeenAt: updatedAt,
      });
      transaction.set(
        doc(this.eventsRef(leagueId)),
        createEvent(ready ? "gm_ready_set" : "gm_ready_unset", user.userId, {
          teamId: membership.teamId,
        }),
      );
    });

    return this.mapLeague(leagueId);
  }

  async updateDepthChart(leagueId: string, depthChart: OnlineDepthChartEntry[]) {
    const user = await this.getCurrentUser();
    const updatedAt = nowIso();

    await runTransaction(this.db, async (transaction) => {
      const membershipSnapshot = await transaction.get(this.membershipRef(leagueId, user.userId));
      const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

      if (!membership || membership.status !== "active" || !membership.teamId) {
        throw new Error("Nur aktive GMs können ihre eigene Depth Chart ändern.");
      }

      const teamSnapshot = await transaction.get(this.teamRef(leagueId, membership.teamId));
      const team = readDocData<FirestoreOnlineTeamDoc>(teamSnapshot);

      if (!team || team.assignedUserId !== user.userId) {
        throw new Error("GM darf nur das eigene Team bearbeiten.");
      }

      transaction.update(this.teamRef(leagueId, membership.teamId), {
        depthChart: depthChart.map((entry) => ({
          ...entry,
          updatedAt,
        })),
        updatedAt,
      });
      transaction.set(
        doc(this.eventsRef(leagueId)),
        createEvent("depth_chart_updated", user.userId, {
          teamId: membership.teamId,
        }),
      );
    });

    return this.mapLeague(leagueId);
  }

  getLastLeagueId() {
    return getBrowserStorage()?.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY) ?? null;
  }

  setLastLeagueId(leagueId: string) {
    getBrowserStorage()?.setItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY, leagueId);
  }

  clearLastLeagueId(leagueId?: string) {
    const storage = getBrowserStorage();

    if (!storage) {
      return;
    }

    if (!leagueId || storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY) === leagueId) {
      storage.removeItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY);
    }
  }

  subscribeToLeague(
    leagueId: string,
    onNext: (league: OnlineLeague | null) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    const emit = async () => onNext(await this.mapLeague(leagueId));
    const unsubscribers = [
      onSnapshot(this.leagueRef(leagueId), emit, (error) => onError?.(error)),
      onSnapshot(
        collection(this.db, "leagues", leagueId, "memberships"),
        emit,
        (error) => onError?.(error),
      ),
      onSnapshot(this.teamsRef(leagueId), emit, (error) => onError?.(error)),
      onSnapshot(
        query(this.eventsRef(leagueId), orderBy("createdAt", "desc"), limit(20)),
        emit,
        (error) => onError?.(error),
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  subscribeToAvailableLeagues(
    onNext: (leagues: OnlineLeague[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return onSnapshot(
      query(
        collection(this.db, "leagues"),
        where("status", "==", "lobby"),
        where("settings.onlineBackbone", "==", true),
      ),
      async (snapshot) => {
        const leagues = await Promise.all(
          snapshot.docs.map((league) =>
            this.mapPublicLobbyLeague(
              league.id,
              league.data() as FirestoreOnlineLeagueDoc,
            ),
          ),
        );

        onNext(leagues);
      },
      (error) => onError?.(error),
    );
  }

  subscribeToMemberships(
    leagueId: string,
    onNext: (memberships: FirestoreOnlineMembershipDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return onSnapshot(
      collection(this.db, "leagues", leagueId, "memberships"),
      (snapshot) =>
        onNext(snapshot.docs.map((membership) => membership.data() as FirestoreOnlineMembershipDoc)),
      (error) => onError?.(error),
    );
  }

  subscribeToTeams(
    leagueId: string,
    onNext: (teams: FirestoreOnlineTeamDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return onSnapshot(
      this.teamsRef(leagueId),
      (snapshot) => onNext(snapshot.docs.map((team) => team.data() as FirestoreOnlineTeamDoc)),
      (error) => onError?.(error),
    );
  }

  subscribeToCurrentUserMembership(
    leagueId: string,
    userId: string,
    onNext: (membership: FirestoreOnlineMembershipDoc | null) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return onSnapshot(
      this.membershipRef(leagueId, userId),
      (snapshot) => onNext(readDocData<FirestoreOnlineMembershipDoc>(snapshot)),
      (error) => onError?.(error),
    );
  }

  subscribeToLeagueEvents(
    leagueId: string,
    onNext: (events: FirestoreOnlineEventDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    return onSnapshot(
      query(this.eventsRef(leagueId), orderBy("createdAt", "desc"), limit(20)),
      (snapshot) => onNext(snapshot.docs.map((event) => event.data() as FirestoreOnlineEventDoc)),
      (error) => onError?.(error),
    );
  }

  admin = {
    archiveLeague: async () => rejectClientAdminAction<void>(),
    resetLeague: async () => rejectClientAdminAction<OnlineLeague | null>(),
    removeMember: async () => rejectClientAdminAction<void>(),
    markTeamVacant: async () => rejectClientAdminAction<void>(),
    setAllReady: async () => rejectClientAdminAction<OnlineLeague | null>(),
    startLeague: async () => rejectClientAdminAction<OnlineLeague | null>(),
    simulateWeekPlaceholder: async () => rejectClientAdminAction<OnlineLeague | null>(),
  };
}

export async function deleteFirebaseOnlineLeagueForTest(
  db: Firestore,
  leagueId: string,
) {
  await deleteDoc(doc(db, "leagues", leagueId));
}
