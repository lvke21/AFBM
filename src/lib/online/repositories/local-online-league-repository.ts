import {
  createOnlineLeague,
  getAvailableOnlineLeagues,
  getLastOnlineLeagueId,
  getOnlineLeagueById,
  joinOnlineLeague,
  makeOnlineFantasyDraftPick,
  setOnlineLeagueUserReadyState,
  updateOnlineLeagueUserDepthChart,
  type CreateOnlineLeagueInput,
  type OnlineDepthChartEntry,
  type JoinOnlineLeagueResult,
  type OnlineLeague,
} from "../online-league-service";
import {
  clearStoredLastOnlineLeagueId,
  getOptionalBrowserOnlineLeagueStorage,
  setStoredLastOnlineLeagueId,
} from "../online-league-storage";
import { ensureCurrentOnlineUser } from "../online-user-service";
import type { TeamIdentitySelection } from "../team-identity-options";
import type {
  FirestoreOnlineEventDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
  OnlineAuthenticatedUser,
  OnlineLeagueRepository,
  OnlineLeagueRepositoryUnsubscribe,
} from "../types";

function localUserToAuthenticatedUser(storage?: Storage): OnlineAuthenticatedUser {
  const user = storage ? ensureCurrentOnlineUser(storage) : ensureCurrentOnlineUser();

  return {
    ...user,
    displayName: user.username,
  };
}

function toMemberships(league: OnlineLeague | null): FirestoreOnlineMembershipDoc[] {
  return (
    league?.users.map((user) => ({
      userId: user.userId,
      username: user.username,
      role: "gm" as const,
      teamId: user.teamId,
      joinedAt: user.joinedAt,
      lastSeenAt: user.activity?.lastSeenAt ?? user.joinedAt,
      ready: user.readyForWeek,
      status: "active" as const,
      displayName: user.username,
    })) ?? []
  );
}

function toTeams(league: OnlineLeague | null): FirestoreOnlineTeamDoc[] {
  return (
    league?.teams.map((team) => {
      const user = league.users.find((candidate) => candidate.teamId === team.id);

      return {
        id: team.id,
        teamName: team.name,
        displayName: user?.teamDisplayName ?? team.name,
        assignedUserId: user?.userId ?? null,
        status: user ? ("assigned" as const) : ("available" as const),
        createdAt: user?.joinedAt ?? new Date().toISOString(),
        updatedAt: user?.joinedAt ?? new Date().toISOString(),
      };
    }) ?? []
  );
}

function rejectClientAdminAction<T>(): Promise<T> {
  return Promise.reject(
    new Error("Admin-Aktionen werden serverseitig über den Admin-Route-Handler ausgeführt."),
  );
}

export class LocalOnlineLeagueRepository implements OnlineLeagueRepository {
  readonly mode = "local" as const;

  constructor(private readonly storage?: Storage) {}

  async getCurrentUser() {
    return localUserToAuthenticatedUser(this.storage);
  }

  async createLeague(input: CreateOnlineLeagueInput) {
    return createOnlineLeague(input, this.storage);
  }

  async getAvailableLeagues() {
    return getAvailableOnlineLeagues(this.storage);
  }

  async getLeagueById(leagueId: string) {
    return getOnlineLeagueById(leagueId, this.storage);
  }

  async joinLeague(
    leagueId: string,
    teamIdentity?: TeamIdentitySelection,
  ): Promise<JoinOnlineLeagueResult> {
    return joinOnlineLeague(
      leagueId,
      this.storage ? ensureCurrentOnlineUser(this.storage) : ensureCurrentOnlineUser(),
      teamIdentity,
      this.storage,
    );
  }

  async setUserReady(leagueId: string, ready: boolean) {
    const user = this.storage ? ensureCurrentOnlineUser(this.storage) : ensureCurrentOnlineUser();

    return setOnlineLeagueUserReadyState(leagueId, user.userId, ready, this.storage);
  }

  async updateDepthChart(leagueId: string, depthChart: OnlineDepthChartEntry[]) {
    const user = this.storage ? ensureCurrentOnlineUser(this.storage) : ensureCurrentOnlineUser();

    return updateOnlineLeagueUserDepthChart(leagueId, user.userId, depthChart, this.storage);
  }

  async makeFantasyDraftPick(leagueId: string, teamId: string, playerId: string) {
    const user = this.storage ? ensureCurrentOnlineUser(this.storage) : ensureCurrentOnlineUser();

    return makeOnlineFantasyDraftPick(leagueId, teamId, playerId, user.userId, this.storage);
  }

  getLastLeagueId() {
    return getLastOnlineLeagueId(this.storage);
  }

  setLastLeagueId(leagueId: string) {
    const storage = this.storage ?? getOptionalBrowserOnlineLeagueStorage();

    if (storage) {
      setStoredLastOnlineLeagueId(storage, leagueId);
    }
  }

  clearLastLeagueId(leagueId?: string) {
    const storage = this.storage ?? getOptionalBrowserOnlineLeagueStorage();

    if (!storage) {
      return;
    }

    clearStoredLastOnlineLeagueId(storage, leagueId);
  }

  subscribeToLeague(
    leagueId: string,
    onNext: (league: OnlineLeague | null) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    onNext(getOnlineLeagueById(leagueId, this.storage));

    return () => undefined;
  }

  subscribeToAvailableLeagues(
    onNext: (leagues: OnlineLeague[]) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    onNext(getAvailableOnlineLeagues(this.storage));

    return () => undefined;
  }

  subscribeToMemberships(
    leagueId: string,
    onNext: (memberships: FirestoreOnlineMembershipDoc[]) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    onNext(toMemberships(getOnlineLeagueById(leagueId, this.storage)));

    return () => undefined;
  }

  subscribeToTeams(
    leagueId: string,
    onNext: (teams: FirestoreOnlineTeamDoc[]) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    onNext(toTeams(getOnlineLeagueById(leagueId, this.storage)));

    return () => undefined;
  }

  subscribeToCurrentUserMembership(
    leagueId: string,
    userId: string,
    onNext: (membership: FirestoreOnlineMembershipDoc | null) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    onNext(
      toMemberships(getOnlineLeagueById(leagueId, this.storage)).find(
        (membership) => membership.userId === userId,
      ) ?? null,
    );

    return () => undefined;
  }

  subscribeToLeagueEvents(
    leagueId: string,
    onNext: (events: FirestoreOnlineEventDoc[]) => void,
  ): OnlineLeagueRepositoryUnsubscribe {
    const league = getOnlineLeagueById(leagueId, this.storage);

    onNext(
      league?.events?.map((event) => ({
        type: event.eventType,
        createdAt: event.createdAt,
        createdByUserId: event.userId ?? "local",
        payload: {
          reason: event.reason,
        },
      })) ?? [],
    );

    return () => undefined;
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
