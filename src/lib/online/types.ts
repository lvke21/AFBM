import type {
  CreateOnlineLeagueInput,
  JoinOnlineLeagueResult,
  OnlineDepthChartEntry,
  OnlineFantasyDraftPickResult,
  OnlineFantasyDraftState,
  OnlineContractPlayer,
  OnlineLeague,
  OnlineCompletedWeek,
  OnlineMatchResult,
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
  email?: string | null;
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
  weekStatus?: FirestoreOnlineWeekStatus;
  settings: Record<string, unknown>;
  matchResults?: OnlineMatchResult[];
  completedWeeks?: OnlineCompletedWeek[];
  version: number;
};

export type FirestoreOnlineDraftStateDoc = {
  leagueId: string;
  status: "not_started" | "active" | "completed";
  round: number;
  pickNumber: number;
  currentTeamId: string;
  draftOrder: string[];
  startedAt: string | null;
  completedAt: string | null;
  draftRunId?: string;
  seedKey?: string;
  testData?: boolean;
  leagueSlug?: string;
  createdBySeed?: boolean;
};

export type FirestoreOnlineDraftPickDoc = {
  pickNumber: number;
  round: number;
  teamId: string;
  playerId: string;
  pickedByUserId: string;
  timestamp: string;
  draftRunId?: string;
  playerSnapshot?: OnlineContractPlayer;
};

export type FirestoreOnlineDraftAvailablePlayerDoc = OnlineContractPlayer & {
  displayName: string;
  draftRunId?: string;
  seedKey?: string;
  testData?: boolean;
  leagueSlug?: string;
  createdBySeed?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function mapFirestoreFantasyDraftState(value: unknown): OnlineFantasyDraftState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const status = value.status;
  const leagueId = value.leagueId;
  const round = value.round;
  const pickNumber = value.pickNumber;
  const currentTeamId = value.currentTeamId;
  const draftOrder = value.draftOrder;
  const picks = value.picks;
  const availablePlayerIds = value.availablePlayerIds;
  const startedAt = value.startedAt;
  const completedAt = value.completedAt;

  if (
    typeof leagueId !== "string" ||
    (status !== "not_started" && status !== "active" && status !== "completed") ||
    typeof round !== "number" ||
    typeof pickNumber !== "number" ||
    typeof currentTeamId !== "string" ||
    !isStringArray(draftOrder) ||
    !Array.isArray(picks) ||
    !isStringArray(availablePlayerIds) ||
    (startedAt !== null && typeof startedAt !== "string") ||
    (completedAt !== null && typeof completedAt !== "string")
  ) {
    return undefined;
  }

  return {
    leagueId,
    status,
    round,
    pickNumber,
    currentTeamId,
    draftOrder,
    picks: picks as OnlineFantasyDraftState["picks"],
    availablePlayerIds,
    startedAt,
    completedAt,
  };
}

function mapFirestoreFantasyDraftPlayerPool(value: unknown): OnlineContractPlayer[] | undefined {
  return Array.isArray(value) ? (value as OnlineContractPlayer[]) : undefined;
}

function mapFirestoreDraftStateFromSubcollections(
  draftState: FirestoreOnlineDraftStateDoc | undefined,
  picks: FirestoreOnlineDraftPickDoc[] | undefined,
  availablePlayers: FirestoreOnlineDraftAvailablePlayerDoc[] | undefined,
): OnlineFantasyDraftState | undefined {
  if (!draftState) {
    return undefined;
  }

  const draftRunId = draftState.draftRunId;
  const filteredPicks = (picks ?? [])
    .filter((pick) => !draftRunId || pick.draftRunId === draftRunId)
    .sort((left, right) => left.pickNumber - right.pickNumber);
  const filteredAvailablePlayers = (availablePlayers ?? [])
    .filter((player) => !draftRunId || player.draftRunId === draftRunId);

  return {
    leagueId: draftState.leagueId,
    status: draftState.status,
    round: draftState.round,
    pickNumber: draftState.pickNumber,
    currentTeamId: draftState.currentTeamId,
    draftOrder: draftState.draftOrder,
    picks: filteredPicks.map((pick) => ({
      pickNumber: pick.pickNumber,
      round: pick.round,
      teamId: pick.teamId,
      playerId: pick.playerId,
      pickedByUserId: pick.pickedByUserId,
      timestamp: pick.timestamp,
    })),
    availablePlayerIds: filteredAvailablePlayers.map((player) => player.playerId),
    startedAt: draftState.startedAt,
    completedAt: draftState.completedAt,
  };
}

function mapFirestoreDraftPlayerPoolFromSubcollections(
  picks: FirestoreOnlineDraftPickDoc[] | undefined,
  availablePlayers: FirestoreOnlineDraftAvailablePlayerDoc[] | undefined,
  draftRunId?: string,
): OnlineContractPlayer[] | undefined {
  if (!picks && !availablePlayers) {
    return undefined;
  }

  const playersById = new Map<string, OnlineContractPlayer>();

  (availablePlayers ?? [])
    .filter((player) => !draftRunId || player.draftRunId === draftRunId)
    .forEach((player) => {
      playersById.set(player.playerId, player);
    });
  (picks ?? [])
    .filter((pick) => !draftRunId || pick.draftRunId === draftRunId)
    .forEach((pick) => {
      if (pick.playerSnapshot) {
        playersById.set(pick.playerId, pick.playerSnapshot);
      }
    });

  return Array.from(playersById.values());
}

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
  contractRoster?: OnlineContractPlayer[];
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
  makeFantasyDraftPick(
    leagueId: string,
    teamId: string,
    playerId: string,
  ): Promise<OnlineFantasyDraftPickResult>;
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
  draftState?: FirestoreOnlineDraftStateDoc;
  draftPicks?: FirestoreOnlineDraftPickDoc[];
  draftAvailablePlayers?: FirestoreOnlineDraftAvailablePlayerDoc[];
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
  const subcollectionDraft = mapFirestoreDraftStateFromSubcollections(
    snapshot.draftState,
    snapshot.draftPicks,
    snapshot.draftAvailablePlayers,
  );
  const subcollectionPlayerPool = mapFirestoreDraftPlayerPoolFromSubcollections(
    snapshot.draftPicks,
    snapshot.draftAvailablePlayers,
    snapshot.draftState?.draftRunId,
  );

  return {
    id: snapshot.league.id,
    name: snapshot.league.name,
    currentWeek: snapshot.league.currentWeek,
    weekStatus: snapshot.league.weekStatus ?? "pre_week",
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
          contractRoster: team?.contractRoster,
          teamStatus: team?.status === "vacant" ? "vacant" : "occupied",
          readyForWeek: membership.ready,
        };
    }),
    matchResults: snapshot.league.matchResults ?? [],
    completedWeeks: snapshot.league.completedWeeks ?? [],
    fantasyDraft: subcollectionDraft ?? mapFirestoreFantasyDraftState(snapshot.league.settings.fantasyDraft),
    fantasyDraftPlayerPool: subcollectionPlayerPool ?? mapFirestoreFantasyDraftPlayerPool(
      snapshot.league.settings.fantasyDraftPlayerPool,
    ),
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
