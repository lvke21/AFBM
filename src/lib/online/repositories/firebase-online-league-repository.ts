import {
  collection,
  deleteDoc,
  deleteField,
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
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
  type JoinOnlineLeagueResult,
  type OnlineContractPlayer,
  type OnlineDepthChartEntry,
  type OnlineFantasyDraftPick,
  type OnlineFantasyDraftPickResult,
  type OnlineFantasyDraftState,
  type OnlineLeague,
} from "../online-league-service";
import { getCurrentAuthenticatedOnlineUser } from "../auth/online-auth";
import {
  clearStoredLastOnlineLeagueId,
  getOptionalBrowserOnlineLeagueStorage,
  getStoredLastOnlineLeagueId,
  setStoredLastOnlineLeagueId,
} from "../online-league-storage";
import {
  resolveTeamIdentitySelection,
  type TeamIdentitySelection,
} from "../team-identity-options";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreOnlineEventDoc,
  type FirestoreOnlineDraftAvailablePlayerDoc,
  type FirestoreOnlineDraftPickDoc,
  type FirestoreOnlineDraftStateDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineLeagueSnapshot,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
  type OnlineLeagueRepository,
  type OnlineLeagueRepositoryUnsubscribe,
} from "../types";
import {
  createOrderedAsyncEmitter,
  hasSameDepthChartPayload,
  isSafeOnlineSyncId,
} from "../sync-guards";

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

function readDocData<T>(snapshot: { exists(): boolean; data(): unknown } | null): T | null {
  if (!snapshot?.exists()) {
    return null;
  }

  return snapshot.data() as T;
}

function createUnavailableOnlineLeague(leagueId: string): OnlineLeague {
  return {
    id: leagueId,
    name: "Unbekannte Online-Liga",
    users: [],
    teams: [],
    currentWeek: 1,
    currentSeason: 1,
    maxUsers: 0,
    status: "waiting",
  };
}

function isFirestoreFantasyDraftState(value: unknown): value is OnlineFantasyDraftState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<OnlineFantasyDraftState>;

  return (
    typeof state.leagueId === "string" &&
    (state.status === "not_started" || state.status === "active" || state.status === "completed") &&
    typeof state.round === "number" &&
    typeof state.pickNumber === "number" &&
    typeof state.currentTeamId === "string" &&
    Array.isArray(state.draftOrder) &&
    Array.isArray(state.picks) &&
    Array.isArray(state.availablePlayerIds)
  );
}

function readFirestoreFantasyDraftState(league: FirestoreOnlineLeagueDoc) {
  return isFirestoreFantasyDraftState(league.settings.fantasyDraft)
    ? league.settings.fantasyDraft
    : null;
}

function readFirestoreFantasyDraftPlayerPool(league: FirestoreOnlineLeagueDoc) {
  return Array.isArray(league.settings.fantasyDraftPlayerPool)
    ? (league.settings.fantasyDraftPlayerPool as OnlineContractPlayer[])
    : [];
}

function toFirestoreDraftStateDoc(
  state: OnlineFantasyDraftState,
  draftRunId: string | undefined,
): FirestoreOnlineDraftStateDoc {
  return {
    leagueId: state.leagueId,
    status: state.status,
    round: state.round,
    pickNumber: state.pickNumber,
    currentTeamId: state.currentTeamId,
    draftOrder: state.draftOrder,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    ...(draftRunId ? { draftRunId } : {}),
  };
}

function toFirestoreDraftPickDoc(
  pick: OnlineFantasyDraftPick,
  player: OnlineContractPlayer,
  draftRunId: string | undefined,
): FirestoreOnlineDraftPickDoc {
  return {
    ...pick,
    ...(draftRunId ? { draftRunId } : {}),
    playerSnapshot: player,
  };
}

function getSnakeDraftTeamId(draftOrder: string[], pickIndex: number) {
  if (draftOrder.length === 0) {
    return "";
  }

  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return order[indexInRound] ?? "";
}

function createRosterDepthChart(
  roster: OnlineContractPlayer[],
  updatedAt: string,
): OnlineDepthChartEntry[] {
  const playersByPosition = new Map<string, OnlineContractPlayer[]>();

  roster.forEach((player) => {
    if (player.status !== "active") {
      return;
    }

    playersByPosition.set(player.position, [
      ...(playersByPosition.get(player.position) ?? []),
      player,
    ]);
  });

  return Array.from(playersByPosition.entries()).map(([position, players]) => {
    const sortedPlayers = [...players].sort((left, right) => right.overall - left.overall);

    return {
      position,
      starterPlayerId: sortedPlayers[0]?.playerId ?? "",
      backupPlayerIds: sortedPlayers.slice(1).map((player) => player.playerId),
      updatedAt,
    };
  });
}

function hasCompletedDraftRoster(
  teamId: string,
  picks: OnlineFantasyDraftPick[],
  playersById: Map<string, OnlineContractPlayer>,
) {
  const teamPicks = picks.filter((pick) => pick.teamId === teamId);

  if (teamPicks.length < ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE) {
    return false;
  }

  return ONLINE_FANTASY_DRAFT_POSITIONS.every((position) => {
    const count = teamPicks.filter(
      (pick) => playersById.get(pick.playerId)?.position === position,
    ).length;

    return count >= ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position];
  });
}

function getNextFantasyDraftState(
  state: OnlineFantasyDraftState,
  playerPool: OnlineContractPlayer[],
  now: string,
): OnlineFantasyDraftState {
  const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
  const completed = state.draftOrder.length > 0 &&
    state.draftOrder.every((teamId) => hasCompletedDraftRoster(teamId, state.picks, playersById));

  if (completed) {
    return {
      ...state,
      status: "completed",
      currentTeamId: "",
      completedAt: state.completedAt ?? now,
    };
  }

  const nextPickIndex = state.picks.length;

  return {
    ...state,
    status: "active",
    round: Math.floor(nextPickIndex / Math.max(1, state.draftOrder.length)) + 1,
    pickNumber: nextPickIndex + 1,
    currentTeamId: getSnakeDraftTeamId(state.draftOrder, nextPickIndex),
  };
}

function createUnsafeLeagueIdError() {
  return new Error("Ungueltige Online-Liga-ID. Bitte suche die Liga erneut.");
}

function assertWritableOnlineUser(user: { userId: string; username: string }) {
  if (!isSafeOnlineSyncId(user.userId)) {
    throw new Error("Firebase Auth ist noch nicht bereit. Bitte lade die Seite neu.");
  }

  if (!user.username.trim()) {
    throw new Error("Online-Profil ist unvollstaendig. Bitte lade die Seite neu.");
  }
}

function rejectClientAdminAction<T>(): Promise<T> {
  return Promise.reject(
    new Error("Admin-Aktionen werden serverseitig über den Admin-Route-Handler ausgeführt."),
  );
}

export function canLoadOnlineLeagueFromMembership(
  membership: FirestoreOnlineMembershipDoc | null,
  teams: FirestoreOnlineTeamDoc[],
) {
  if (!membership || membership.status !== "active") {
    return false;
  }

  if (membership.role === "admin") {
    return true;
  }

  return Boolean(
    membership.teamId &&
      teams.some(
        (team) =>
          team.id === membership.teamId &&
          team.assignedUserId === membership.userId &&
          team.status === "assigned",
      ),
  );
}

export function chooseFirstAvailableFirestoreTeam(teams: FirestoreOnlineTeamDoc[]) {
  return [...teams]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .find((team) => team.status === "available" || team.status === "vacant") ?? null;
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

  private draftRef(leagueId: string) {
    return doc(this.db, "leagues", leagueId, "draft", "main");
  }

  private draftPicksRef(leagueId: string) {
    return collection(this.db, "leagues", leagueId, "draft", "main", "picks");
  }

  private draftAvailablePlayersRef(leagueId: string) {
    return collection(this.db, "leagues", leagueId, "draft", "main", "availablePlayers");
  }

  private async getSnapshot(leagueId: string) {
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
        getDoc(this.leagueRef(leagueId)),
        getDocs(collection(this.db, "leagues", leagueId, "memberships")),
        getDocs(collection(this.db, "leagues", leagueId, "teams")),
        getDocs(query(this.eventsRef(leagueId), orderBy("createdAt", "desc"), limit(20))),
        getDoc(this.draftRef(leagueId)),
        getDocs(this.draftPicksRef(leagueId)),
        getDocs(this.draftAvailablePlayersRef(leagueId)),
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
      draftAvailablePlayers: draftAvailablePlayersSnapshot.docs.map(
        (player) => player.data() as FirestoreOnlineDraftAvailablePlayerDoc,
      ),
    };
  }

  private async getMemberScopedSnapshot(leagueId: string, userId: string) {
    const [leagueSnapshot, membershipSnapshot] = await Promise.all([
      getDoc(this.leagueRef(leagueId)),
      getDoc(this.membershipRef(leagueId, userId)),
    ]);
    const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);
    const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

    if (!league || !membership) {
      return null;
    }

    const teamsSnapshot = await getDocs(this.teamsRef(leagueId));
    const teams = teamsSnapshot.docs.map((team) => team.data() as FirestoreOnlineTeamDoc);

    if (!canLoadOnlineLeagueFromMembership(membership, teams)) {
      return null;
    }

    return this.getSnapshot(leagueId);
  }

  private async mapLeague(leagueId: string): Promise<OnlineLeague | null> {
    const snapshot = await this.getSnapshot(leagueId);

    return snapshot ? mapFirestoreSnapshotToOnlineLeague(snapshot) : null;
  }

  private async mapMemberScopedLeague(leagueId: string, userId: string): Promise<OnlineLeague | null> {
    const snapshot = await this.getMemberScopedSnapshot(leagueId, userId);

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
    if (!isSafeOnlineSyncId(leagueId)) {
      return null;
    }

    const user = await this.getCurrentUser();

    return this.mapMemberScopedLeague(leagueId, user.userId);
  }

  async joinLeague(
    leagueId: string,
    teamIdentity?: TeamIdentitySelection,
  ): Promise<JoinOnlineLeagueResult> {
    if (!isSafeOnlineSyncId(leagueId)) {
      return {
        status: "missing-league",
        league: createUnavailableOnlineLeague(leagueId),
        message: "Ungueltige Liga-ID. Bitte suche die Liga erneut.",
      };
    }

    const user = await this.getCurrentUser();
    assertWritableOnlineUser(user);
    const publicTeamsSnapshot = await getDocs(this.teamsRef(leagueId));
    const publicTeams = publicTeamsSnapshot.docs.map(
      (team) => team.data() as FirestoreOnlineTeamDoc,
    );

    const joinedLeague = await runTransaction(this.db, async (transaction) => {
      const leagueSnapshot = await transaction.get(this.leagueRef(leagueId));
      const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);

      if (!league) {
        return {
          status: "missing-league" as const,
          leagueId,
          message: "Diese Liga konnte nicht gefunden werden.",
        };
      }

      const membershipSnapshot = await transaction.get(this.membershipRef(leagueId, user.userId));
      const existingMembership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

      if (existingMembership?.status === "active" && existingMembership.teamId) {
        return {
          status: "already-member" as const,
          leagueId,
        };
      }

      if (league.status !== "lobby") {
        return {
          status: "missing-league" as const,
          leagueId,
          message: "Diese Liga ist nicht mehr in der Lobby.",
        };
      }

      const resolvedIdentity = teamIdentity
        ? resolveTeamIdentitySelection(teamIdentity)
        : null;

      if (!resolvedIdentity) {
        return {
          status: "invalid-team-identity" as const,
          leagueId,
          message: "Bitte wähle zuerst Stadt, Kategorie und Teamnamen.",
        };
      }

      if (league.memberCount >= league.maxTeams) {
        return {
          status: "full" as const,
          leagueId,
        };
      }

      const teamPool = publicTeams.slice(0, league.maxTeams);

      if (teamPool.length === 0) {
        return {
          status: "full" as const,
          leagueId,
        };
      }

      const teamRefs = teamPool.map((team) => this.teamRef(leagueId, team.id));
      const teamSnapshots = await Promise.all(
        teamRefs.map((teamRef) => transaction.get(teamRef)),
      );
      const createdAt = nowIso();
      const teams = teamPool.map((team, index) => {
        const existingTeam = readDocData<FirestoreOnlineTeamDoc>(
          teamSnapshots[index] ?? null,
        );

        return existingTeam ?? {
          ...team,
          createdAt: team.createdAt ?? createdAt,
          updatedAt: team.updatedAt ?? createdAt,
        };
      });

      const identityTaken =
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

      const availableTeam = chooseFirstAvailableFirestoreTeam(teams);

      if (!availableTeam) {
        return {
          status: "full" as const,
          leagueId,
        };
      }

      if (availableTeam.status !== "available" && availableTeam.status !== "vacant") {
        return {
          status: "full" as const,
          leagueId,
        };
      }

      const nextTeam: FirestoreOnlineTeamDoc = {
        ...availableTeam,
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
    const league =
      (await this.mapMemberScopedLeague(leagueId, user.userId)) ??
      createUnavailableOnlineLeague(leagueId);

    if (joinedLeague.status === "joined" || joinedLeague.status === "already-member") {
      this.setLastLeagueId(leagueId);
    }

    if (joinedLeague.status === "missing-league") {
      return {
        status: "missing-league",
        league,
        message: joinedLeague.message,
      };
    }

    if (joinedLeague.status === "full") {
      return {
        status: "full",
        league,
        message: "Diese Liga ist bereits voll.",
      };
    }

    if (joinedLeague.status === "invalid-team-identity") {
      return {
        status: "invalid-team-identity",
        league,
        message: joinedLeague.message,
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
    if (!isSafeOnlineSyncId(leagueId)) {
      throw createUnsafeLeagueIdError();
    }

    const user = await this.getCurrentUser();
    assertWritableOnlineUser(user);
    const updatedAt = nowIso();

    await runTransaction(this.db, async (transaction) => {
      const membershipSnapshot = await transaction.get(this.membershipRef(leagueId, user.userId));
      const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

      if (!membership || membership.status !== "active") {
        throw new Error("Nur aktive Liga-Mitglieder können Ready setzen.");
      }

      if (membership.ready === ready) {
        return;
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
    if (!isSafeOnlineSyncId(leagueId)) {
      throw createUnsafeLeagueIdError();
    }

    const user = await this.getCurrentUser();
    assertWritableOnlineUser(user);
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

      if (hasSameDepthChartPayload(team.depthChart, depthChart)) {
        return;
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

  async makeFantasyDraftPick(
    leagueId: string,
    teamId: string,
    playerId: string,
  ): Promise<OnlineFantasyDraftPickResult> {
    if (!isSafeOnlineSyncId(leagueId) || !isSafeOnlineSyncId(teamId) || !isSafeOnlineSyncId(playerId)) {
      throw createUnsafeLeagueIdError();
    }

    const user = await this.getCurrentUser();
    assertWritableOnlineUser(user);
    const now = nowIso();
    const mappedLeagueBeforePick = await this.mapLeague(leagueId);
    const result = await runTransaction(this.db, async (transaction) => {
      const draftRef = this.draftRef(leagueId);
      const availablePlayerRef = doc(this.draftAvailablePlayersRef(leagueId), playerId);
      const [leagueSnapshot, draftSnapshot, availablePlayerSnapshot] = await Promise.all([
        transaction.get(this.leagueRef(leagueId)),
        transaction.get(draftRef),
        transaction.get(availablePlayerRef),
      ]);
      const league = readDocData<FirestoreOnlineLeagueDoc>(leagueSnapshot);

      if (!league) {
        return {
          status: "missing-league" as const,
          message: "Liga konnte nicht gefunden werden.",
        };
      }

      const draftDoc = readDocData<FirestoreOnlineDraftStateDoc>(draftSnapshot);
      const state = mappedLeagueBeforePick?.fantasyDraft ?? readFirestoreFantasyDraftState(league);
      const playerPool =
        mappedLeagueBeforePick?.fantasyDraftPlayerPool ?? readFirestoreFantasyDraftPlayerPool(league);

      if (!state || state.status !== "active") {
        return {
          status: "draft-not-active" as const,
          message: "Fantasy Draft ist nicht aktiv.",
        };
      }

      const membershipSnapshot = await transaction.get(this.membershipRef(leagueId, user.userId));
      const membership = readDocData<FirestoreOnlineMembershipDoc>(membershipSnapshot);

      if (!membership || membership.status !== "active" || membership.teamId !== teamId) {
        return {
          status: "missing-user" as const,
          message: "GM gehoert nicht zu diesem Team.",
        };
      }

      if (state.currentTeamId !== teamId) {
        return {
          status: "wrong-team" as const,
          message: "Dieses Team ist aktuell nicht am Zug.",
        };
      }

      if (
        draftDoc &&
        (draftDoc.pickNumber !== state.pickNumber ||
          draftDoc.currentTeamId !== state.currentTeamId ||
          draftDoc.status !== state.status)
      ) {
        return {
          status: "draft-not-active" as const,
          message: "Draft-State wurde aktualisiert. Bitte lade den Draft neu.",
        };
      }

      if (
        !state.availablePlayerIds.includes(playerId) ||
        state.picks.some((pick) => pick.playerId === playerId) ||
        !availablePlayerSnapshot.exists()
      ) {
        return {
          status: "player-unavailable" as const,
          message: "Spieler ist nicht mehr verfuegbar.",
        };
      }

      const selectedPlayer = playerPool.find((player) => player.playerId === playerId);

      if (!selectedPlayer) {
        return {
          status: "player-unavailable" as const,
          message: "Spieler ist nicht im Draft-Pool.",
        };
      }

      const draftRunId = draftDoc?.draftRunId;
      const pick: OnlineFantasyDraftPick = {
        pickNumber: state.pickNumber,
        round: state.round,
        teamId,
        playerId,
        pickedByUserId: user.userId,
        timestamp: now,
      };
      const pickedState: OnlineFantasyDraftState = {
        ...state,
        picks: [...state.picks, pick],
        availablePlayerIds: state.availablePlayerIds.filter((candidate) => candidate !== playerId),
      };
      const nextState = getNextFantasyDraftState(pickedState, playerPool, now);

      transaction.set(
        doc(this.draftPicksRef(leagueId), String(pick.pickNumber).padStart(4, "0")),
        toFirestoreDraftPickDoc(pick, selectedPlayer, draftRunId),
      );
      transaction.delete(availablePlayerRef);
      transaction.set(draftRef, toFirestoreDraftStateDoc(nextState, draftRunId), { merge: true });
      transaction.set(
        doc(this.eventsRef(leagueId)),
        createEvent("draft_pick_made", user.userId, {
          teamId,
          playerId,
          playerName: selectedPlayer.playerName,
          pickNumber: pick.pickNumber,
          round: pick.round,
        }),
      );

      if (nextState.status === "completed") {
        const playersById = new Map(playerPool.map((player) => [player.playerId, player]));

        nextState.draftOrder.forEach((draftTeamId) => {
          const roster = nextState.picks
            .filter((candidate) => candidate.teamId === draftTeamId)
            .sort((left, right) => left.pickNumber - right.pickNumber)
            .map((candidate) => playersById.get(candidate.playerId))
            .filter((player): player is OnlineContractPlayer => Boolean(player));

          transaction.update(this.teamRef(leagueId, draftTeamId), {
            contractRoster: roster,
            depthChart: createRosterDepthChart(roster, now),
            updatedAt: now,
          });
        });
        transaction.update(this.leagueRef(leagueId), {
          status: "active",
          currentWeek: 1,
          currentSeason: 1,
          "settings.fantasyDraft": deleteField(),
          "settings.fantasyDraftPlayerPool": deleteField(),
          updatedAt: now,
          version: increment(1),
        });
        transaction.set(
          doc(this.eventsRef(leagueId)),
          createEvent("fantasy_draft_completed", user.userId, {
            totalPicks: nextState.picks.length,
          }),
        );
      } else {
        transaction.update(this.leagueRef(leagueId), {
          updatedAt: now,
          version: increment(1),
        });
      }

      return {
        status: nextState.status === "completed" ? "completed" as const : "success" as const,
        pick,
        message:
          nextState.status === "completed"
            ? "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1."
            : "Pick gespeichert.",
      };
    });
    const mappedLeague = await this.mapLeague(leagueId);

    if ("pick" in result) {
      return {
        ...result,
        league: mappedLeague ?? createUnavailableOnlineLeague(leagueId),
      };
    }

    return {
      ...result,
      league: mappedLeague,
    };
  }

  getLastLeagueId() {
    const storage = getOptionalBrowserOnlineLeagueStorage();
    const lastLeagueId = storage ? getStoredLastOnlineLeagueId(storage) : null;

    return isSafeOnlineSyncId(lastLeagueId) ? lastLeagueId : null;
  }

  setLastLeagueId(leagueId: string) {
    if (!isSafeOnlineSyncId(leagueId)) {
      return;
    }

    const storage = getOptionalBrowserOnlineLeagueStorage();

    if (storage) {
      setStoredLastOnlineLeagueId(storage, leagueId);
    }
  }

  clearLastLeagueId(leagueId?: string) {
    const storage = getOptionalBrowserOnlineLeagueStorage();

    if (!storage) {
      return;
    }

    clearStoredLastOnlineLeagueId(storage, leagueId);
  }

  subscribeToLeague(
    leagueId: string,
    onNext: (league: OnlineLeague | null) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    if (!isSafeOnlineSyncId(leagueId)) {
      queueMicrotask(() => onError?.(createUnsafeLeagueIdError()));

      return () => undefined;
    }

    const emitter = createOrderedAsyncEmitter(
      onNext,
      onError,
      "Online-Liga konnte nicht aus Firebase geladen werden.",
    );
    const emit = () => emitter.emit(() => this.mapLeague(leagueId));
    const unsubscribers = [
      onSnapshot(this.leagueRef(leagueId), emit, (error) => onError?.(error)),
      onSnapshot(
        collection(this.db, "leagues", leagueId, "memberships"),
        emit,
        (error) => onError?.(error),
      ),
      onSnapshot(this.teamsRef(leagueId), emit, (error) => onError?.(error)),
      onSnapshot(this.draftRef(leagueId), emit, (error) => onError?.(error)),
      onSnapshot(this.draftPicksRef(leagueId), emit, (error) => onError?.(error)),
      onSnapshot(this.draftAvailablePlayersRef(leagueId), emit, (error) => onError?.(error)),
      onSnapshot(
        query(this.eventsRef(leagueId), orderBy("createdAt", "desc"), limit(20)),
        emit,
        (error) => onError?.(error),
      ),
    ];

    return () => {
      emitter.close();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }

  subscribeToAvailableLeagues(
    onNext: (leagues: OnlineLeague[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    const emitter = createOrderedAsyncEmitter(
      onNext,
      onError,
      "Verfuegbare Online-Ligen konnten nicht synchronisiert werden.",
    );
    const unsubscribe = onSnapshot(
      query(
        collection(this.db, "leagues"),
        where("status", "==", "lobby"),
        where("settings.onlineBackbone", "==", true),
      ),
      (snapshot) =>
        emitter.emit(() =>
          Promise.all(
            snapshot.docs.map((league) =>
              this.mapPublicLobbyLeague(
                league.id,
                league.data() as FirestoreOnlineLeagueDoc,
              ),
            ),
          ),
        ),
      (error) => onError?.(error),
    );

    return () => {
      emitter.close();
      unsubscribe();
    };
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
