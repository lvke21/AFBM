import type {
  CreateOnlineLeagueInput,
  JoinOnlineLeagueResult,
  OnlineDepthChartEntry,
  OnlineLeague,
  OnlineLeagueTeam,
} from "./online-league-service";
import type { OnlineUser } from "./online-user-service";
import type { TeamIdentitySelection } from "./team-identity-options";

export type OnlineBackendMode = "local" | "firebase";
export type OnlineRole = "admin" | "gm";
export type OnlineMembershipStatus = "active" | "inactive" | "removed";
export type OnlineTeamAssignmentStatus = "available" | "assigned" | "vacant" | "ai";
export type FirestoreOnlineLeagueStatus = "lobby" | "active" | "completed" | "archived";
export type FirestoreOnlineWeekStatus = "pre_week" | "ready" | "simulating" | "completed";

export type OnlineAuthenticatedUser = OnlineUser & {
  displayName: string;
  isAnonymous: boolean;
  createdAt?: string;
  lastSeenAt?: string;
};

export type FirestoreOnlineLeagueDoc = {
  id: string;
  name: string;
  status: FirestoreOnlineLeagueStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  maxTeams: number;
  memberCount: number;
  currentWeek: number;
  currentSeason: number;
  settings: Record<string, unknown>;
  version: number;
};

export type FirestoreOnlineMembershipDoc = {
  userId: string;
  username: string;
  role: OnlineRole;
  teamId: string;
  joinedAt: string;
  lastSeenAt: string;
  ready: boolean;
  status: OnlineMembershipStatus;
  displayName: string;
};

export type FirestoreOnlineTeamDoc = {
  id: string;
  cityId?: string;
  cityName?: string;
  teamNameId?: string;
  teamName: string;
  displayName: string;
  depthChart?: OnlineDepthChartEntry[];
  assignedUserId?: string | null;
  status: OnlineTeamAssignmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type FirestoreOnlineWeekDoc = {
  season: number;
  week: number;
  status: FirestoreOnlineWeekStatus;
  startedAt?: string;
  completedAt?: string;
  simulatedByUserId?: string;
};

export type FirestoreOnlineEventDoc = {
  type: string;
  createdAt: string;
  createdByUserId: string;
  payload: Record<string, unknown>;
};

export type FirestoreOnlineAdminLogDoc = {
  action: string;
  createdAt: string;
  adminUserId: string;
  targetUserId?: string;
  targetTeamId?: string;
  reason?: string;
  payload?: Record<string, unknown>;
};

export type OnlineLeagueRepositoryUnsubscribe = () => void;

export type OnlineLeagueRepository = {
  readonly mode: OnlineBackendMode;
  getCurrentUser(): Promise<OnlineAuthenticatedUser>;
  createLeague(input: CreateOnlineLeagueInput): Promise<OnlineLeague>;
  getAvailableLeagues(): Promise<OnlineLeague[]>;
  getLeagueById(leagueId: string): Promise<OnlineLeague | null>;
  joinLeague(
    leagueId: string,
    teamIdentity?: TeamIdentitySelection,
  ): Promise<JoinOnlineLeagueResult>;
  setUserReady(leagueId: string, ready: boolean): Promise<OnlineLeague | null>;
  updateDepthChart(
    leagueId: string,
    depthChart: OnlineDepthChartEntry[],
  ): Promise<OnlineLeague | null>;
  getLastLeagueId(): string | null;
  setLastLeagueId(leagueId: string): void;
  clearLastLeagueId(leagueId?: string): void;
  subscribeToLeague(
    leagueId: string,
    onNext: (league: OnlineLeague | null) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe;
  subscribeToAvailableLeagues(
    onNext: (leagues: OnlineLeague[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe;
  subscribeToMemberships(
    leagueId: string,
    onNext: (memberships: FirestoreOnlineMembershipDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe;
  subscribeToTeams(
    leagueId: string,
    onNext: (teams: FirestoreOnlineTeamDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe;
  subscribeToCurrentUserMembership(
    leagueId: string,
    userId: string,
    onNext: (membership: FirestoreOnlineMembershipDoc | null) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe;
  subscribeToLeagueEvents(
    leagueId: string,
    onNext: (events: FirestoreOnlineEventDoc[]) => void,
    onError?: (error: Error) => void,
  ): OnlineLeagueRepositoryUnsubscribe;
  admin: {
    archiveLeague(leagueId: string, reason?: string): Promise<void>;
    resetLeague(leagueId: string, reason?: string): Promise<OnlineLeague | null>;
    removeMember(leagueId: string, targetUserId: string, reason: string): Promise<void>;
    markTeamVacant(leagueId: string, teamId: string, reason: string): Promise<void>;
    setAllReady(leagueId: string, ready: boolean): Promise<OnlineLeague | null>;
    startLeague(leagueId: string): Promise<OnlineLeague | null>;
    simulateWeekPlaceholder(leagueId: string, overrideReady?: boolean): Promise<OnlineLeague | null>;
  };
};

export type FirestoreOnlineLeagueSnapshot = {
  league: FirestoreOnlineLeagueDoc;
  memberships: FirestoreOnlineMembershipDoc[];
  teams: FirestoreOnlineTeamDoc[];
  events?: FirestoreOnlineEventDoc[];
};

export function mapFirestoreStatusToLocalStatus(
  status: FirestoreOnlineLeagueStatus,
): OnlineLeague["status"] {
  return status === "active" ? "active" : "waiting";
}

export function mapLocalTeamToFirestoreTeam(
  team: OnlineLeagueTeam,
  now: string,
): FirestoreOnlineTeamDoc {
  return {
    id: team.id,
    teamName: team.name,
    displayName: team.name,
    assignedUserId: null,
    status: "available",
    createdAt: now,
    updatedAt: now,
  };
}

export function mapFirestoreSnapshotToOnlineLeague(
  snapshot: FirestoreOnlineLeagueSnapshot,
): OnlineLeague {
  const teamsById = new Map(snapshot.teams.map((team) => [team.id, team]));

  return {
    id: snapshot.league.id,
    name: snapshot.league.name,
    currentWeek: snapshot.league.currentWeek,
    maxUsers: snapshot.league.maxTeams,
    status: mapFirestoreStatusToLocalStatus(snapshot.league.status),
    teams: snapshot.teams.map((team) => ({
      id: team.id,
      name: team.displayName,
      abbreviation: team.displayName.slice(0, 3).toUpperCase(),
    })),
    users: snapshot.memberships
      .filter((membership) => membership.status !== "removed" && membership.teamId)
      .map((membership) => {
        const team = teamsById.get(membership.teamId);

        return {
          userId: membership.userId,
          username: membership.username,
          joinedAt: membership.joinedAt,
          teamId: membership.teamId,
          teamName: team?.teamName ?? membership.teamId,
          cityId: team?.cityId,
          cityName: team?.cityName,
          teamNameId: team?.teamNameId,
          teamDisplayName: team?.displayName ?? membership.teamId,
          depthChart: team?.depthChart,
          teamStatus: team?.status === "vacant" ? "vacant" : "occupied",
          readyForWeek: membership.ready,
        };
      }),
    events: snapshot.events?.map((event) => ({
      id: `${event.type}-${event.createdAt}`,
      eventType: event.type as never,
      leagueId: snapshot.league.id,
      teamId: "",
      userId: event.createdByUserId,
      reason: JSON.stringify(event.payload),
      season: snapshot.league.currentSeason,
      week: snapshot.league.currentWeek,
      createdAt: event.createdAt,
    })),
  };
}
