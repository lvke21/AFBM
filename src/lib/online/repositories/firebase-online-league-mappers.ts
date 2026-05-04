import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
  OnlineLeague,
} from "../online-league-service";
import type {
  FirestoreLeagueMemberMirrorDoc,
  FirestoreOnlineDraftPickDoc,
  FirestoreOnlineDraftStateDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "../types";

export function readDocData<T>(
  snapshot: { exists(): boolean; data(): unknown } | null,
): T | null {
  if (!snapshot?.exists()) {
    return null;
  }

  return snapshot.data() as T;
}

export function createUnavailableOnlineLeague(leagueId: string): OnlineLeague {
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

export function readFirestoreFantasyDraftState(league: FirestoreOnlineLeagueDoc) {
  return isFirestoreFantasyDraftState(league.settings.fantasyDraft)
    ? league.settings.fantasyDraft
    : null;
}

export function readFirestoreFantasyDraftPlayerPool(league: FirestoreOnlineLeagueDoc) {
  return Array.isArray(league.settings.fantasyDraftPlayerPool)
    ? (league.settings.fantasyDraftPlayerPool as OnlineContractPlayer[])
    : [];
}

export function readLegacyFantasyDraftStatus(league: FirestoreOnlineLeagueDoc) {
  const fantasyDraft = league.settings.fantasyDraft;

  if (!fantasyDraft || typeof fantasyDraft !== "object" || !("status" in fantasyDraft)) {
    return null;
  }

  const status = fantasyDraft.status;

  return status === "not_started" || status === "active" || status === "completed"
    ? status
    : null;
}

export function isFirestoreWeekSimulationLockActive(lock: unknown) {
  return (
    lock !== null &&
    lock !== undefined &&
    typeof lock === "object" &&
    "status" in lock &&
    (lock as { status?: unknown }).status === "simulating"
  );
}

export function toFirestoreDraftStateDoc(
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

export function toFirestoreDraftPickDoc(
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

function isAdminMembershipRole(role: unknown) {
  return role === "admin" || role === "ADMIN";
}

function getLeagueSlug(leagueId: string, league: FirestoreOnlineLeagueDoc) {
  return typeof league.settings.leagueSlug === "string"
    ? league.settings.leagueSlug
    : typeof league.settings.slug === "string"
      ? league.settings.slug
      : leagueId;
}

function mapMembershipRoleToMirrorRole(role: FirestoreOnlineMembershipDoc["role"]) {
  return isAdminMembershipRole(role) ? "ADMIN" : "GM";
}

export function getMembershipProjectionProblem(
  membership: FirestoreOnlineMembershipDoc | null,
  teams: FirestoreOnlineTeamDoc[],
  mirror: FirestoreLeagueMemberMirrorDoc | null = null,
  leagueId?: string,
) {
  if (!membership) {
    return "missing-membership";
  }

  if (!isActiveMembershipStatus(membership.status)) {
    return `inactive-membership:${membership.status}`;
  }

  if (isAdminMembershipRole(membership.role)) {
    return null;
  }

  if (!membership.teamId) {
    return "missing-team-id";
  }

  const team = teams.find((candidate) => candidate.id === membership.teamId);

  if (!team) {
    return `missing-team:${membership.teamId}`;
  }

  if (team.assignedUserId !== membership.userId) {
    return `team-user-mismatch:${team.id}`;
  }

  if (team.status === "available" || team.status === "vacant") {
    return `team-not-assigned:${team.status}`;
  }

  if (mirror) {
    const mirrorUserId = mirror.userId || mirror.uid;

    if (leagueId && mirror.leagueId !== leagueId) {
      return `mirror-league-mismatch:${mirror.leagueId}`;
    }

    if (mirror.status === "ACTIVE" && mirrorUserId !== membership.userId) {
      return `membership-mirror-user-mismatch:${mirrorUserId}`;
    }

    if (mirror.status === "ACTIVE" && mirror.teamId !== membership.teamId) {
      return `membership-mirror-team-mismatch:${mirror.teamId}`;
    }
  }

  return null;
}

export function getTeamProjectionWithoutMembershipProblem(
  membership: FirestoreOnlineMembershipDoc | null,
  teams: FirestoreOnlineTeamDoc[],
  userId: string,
) {
  if (membership) {
    return null;
  }

  const assignedTeam = teams.find(
    (team) =>
      team.assignedUserId === userId &&
      team.status !== "available" &&
      team.status !== "vacant",
  );

  return assignedTeam ? `missing-membership-for-team:${assignedTeam.id}` : null;
}

export function createMembershipProjectionConflictMessage(
  leagueId: string,
  userId: string,
  reason: string,
) {
  return `Membership-Projektion inkonsistent in ${leagueId} für ${userId}: ${reason}`;
}

export function isMembershipTeamProjectionProblem(reason: string) {
  return (
    reason === "missing-team-id" ||
    reason.startsWith("missing-team:") ||
    reason.startsWith("team-user-mismatch:") ||
    reason.startsWith("team-not-assigned:")
  );
}

export function isMembershipMirrorProjectionProblem(reason: string) {
  return (
    reason.startsWith("mirror-league-mismatch:") ||
    reason.startsWith("membership-mirror-user-mismatch:") ||
    reason.startsWith("membership-mirror-team-mismatch:")
  );
}

export function createLeagueMemberMirrorFromMembership(
  leagueId: string,
  league: FirestoreOnlineLeagueDoc,
  membership: FirestoreOnlineMembershipDoc,
  updatedAt: string,
): FirestoreLeagueMemberMirrorDoc {
  return {
    id: `${leagueId}_${membership.userId}`,
    leagueId,
    leagueSlug: getLeagueSlug(leagueId, league),
    userId: membership.userId,
    role: mapMembershipRoleToMirrorRole(membership.role),
    status: "ACTIVE",
    teamId: membership.teamId,
    createdAt: membership.joinedAt || updatedAt,
    updatedAt,
  };
}

export function isLeagueMemberMirrorAligned(
  mirror: FirestoreLeagueMemberMirrorDoc | null,
  leagueId: string,
  membership: FirestoreOnlineMembershipDoc,
) {
  if (!mirror) {
    return false;
  }

  const mirrorUserId = mirror.userId || mirror.uid;

  return (
    mirror.id === `${leagueId}_${membership.userId}` &&
    mirror.leagueId === leagueId &&
    mirrorUserId === membership.userId &&
    mirror.role === mapMembershipRoleToMirrorRole(membership.role) &&
    mirror.status === "ACTIVE" &&
    mirror.teamId === membership.teamId
  );
}

export function resolveFirestoreMembershipForUser(
  membership: FirestoreOnlineMembershipDoc | null,
  _mirror: FirestoreLeagueMemberMirrorDoc | null,
  _teams: FirestoreOnlineTeamDoc[],
  user: { userId: string; username: string; displayName: string },
  _leagueId?: string,
) {
  void _mirror;
  void _teams;
  void _leagueId;

  if (membership?.userId !== user.userId || !isActiveMembershipStatus(membership.status)) {
    return null;
  }

  return membership;
}

export function canLoadOnlineLeagueFromMembership(
  membership: FirestoreOnlineMembershipDoc | null,
  _teams: FirestoreOnlineTeamDoc[],
  _mirror: FirestoreLeagueMemberMirrorDoc | null = null,
  _leagueId?: string,
) {
  void _teams;
  void _mirror;
  void _leagueId;

  return Boolean(membership && isActiveMembershipStatus(membership.status));
}

export function chooseFirstAvailableFirestoreTeam(teams: FirestoreOnlineTeamDoc[]) {
  return [...teams]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .find((team) => team.status === "available" || team.status === "vacant") ?? null;
}

export function chooseAvailableFirestoreTeamForIdentity(
  teams: FirestoreOnlineTeamDoc[],
  identity: { cityId: string; teamNameId: string } | null,
) {
  const sortedTeams = [...teams].sort(
    (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );
  const availableTeams = sortedTeams.filter(
    (team) => team.status === "available" || team.status === "vacant",
  );

  if (identity) {
    const matchingTeam = availableTeams.find(
      (team) => team.cityId === identity.cityId && team.teamNameId === identity.teamNameId,
    );

    if (matchingTeam) {
      return matchingTeam;
    }
  }

  return availableTeams[0] ?? null;
}

function isActiveMembershipStatus(status: unknown) {
  return status === "active" || status === "ACTIVE";
}
