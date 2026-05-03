import {
  getOnlineLeagueReadyChangeState,
  getOnlineLeagueWeekReadyState,
  isOnlineLeagueUserActiveWeekParticipant,
  type OnlineLeagueReadyChangeResult,
  type OnlineLeagueWeekReadyState,
} from "./online-league-week-service";
import {
  getOnlineLeagueWeekProgressState,
  type OnlineLeagueWeekProgressState,
} from "./online-league-week-simulation";
import type {
  OnlineFantasyDraftStatus,
  OnlineLeague,
  OnlineLeagueUser,
} from "./online-league-types";
import type { OnlineUser } from "./online-user-service";

export type OnlineLeagueLifecycleMembershipPhase =
  | "anonymous"
  | "connected"
  | "inactive_team"
  | "missing_membership";

export type OnlineLeagueLifecycleDraftPhase =
  | "active"
  | "completed"
  | "not_configured"
  | "pending";

export type OnlineLeagueLifecyclePhase =
  | "draft_active"
  | "draft_pending"
  | "inactive_team"
  | "missing_membership"
  | "needs_login"
  | "ready_blocked"
  | "ready_open"
  | "ready_set"
  | "week_advanced"
  | "week_completed"
  | "week_simulating";

export type OnlineLeagueLifecycleState = {
  currentLeagueUser: OnlineLeagueUser | null;
  currentUserReady: boolean;
  draftPhase: OnlineLeagueLifecycleDraftPhase;
  leagueStatusLabel: string;
  membershipPhase: OnlineLeagueLifecycleMembershipPhase;
  phase: OnlineLeagueLifecyclePhase;
  readyAction: OnlineLeagueReadyChangeResult;
  readyActionDisabledReason: string | null;
  readyState: OnlineLeagueWeekReadyState;
  reasons: string[];
  statusLabel: string;
  weekProgress: OnlineLeagueWeekProgressState;
};

export type OnlineCoreLifecyclePhase =
  | "blockedConflict"
  | "draftActive"
  | "draftPending"
  | "joining"
  | "noLeague"
  | "noTeam"
  | "readyComplete"
  | "readyOpen"
  | "resultsAvailable"
  | "rosterInvalid"
  | "simulating"
  | "waitingForOthers"
  | "weekCompleted";

export type OnlineCoreLifecycleInput = {
  currentUser: OnlineUser | null;
  joining?: boolean;
  league: OnlineLeague | null;
  projectionConflicts?: string[];
  requiresDraft?: boolean;
  simulationInProgress?: boolean;
};

export type OnlineCoreLifecycleState = {
  allowedTransitions: OnlineCoreLifecyclePhase[];
  canSetReady: boolean;
  canSimulate: boolean;
  currentLeagueUser: OnlineLeagueUser | null;
  currentSeason: number | null;
  currentUserReady: boolean;
  currentWeek: number | null;
  draftStatus: OnlineFantasyDraftStatus | "missing";
  hasResults: boolean;
  phase: OnlineCoreLifecyclePhase;
  readyState: OnlineLeagueWeekReadyState | null;
  reasons: string[];
  weekKey: string | null;
  weekProgress: OnlineLeagueWeekProgressState | null;
};

type OnlineCoreLifecycleDerivationMode = "league" | "user";

export const ONLINE_CORE_LIFECYCLE_ALLOWED_TRANSITIONS = {
  blockedConflict: [],
  draftActive: ["draftPending", "blockedConflict", "rosterInvalid"],
  draftPending: ["draftActive", "blockedConflict"],
  joining: ["noLeague", "noTeam", "draftPending", "draftActive", "blockedConflict"],
  noLeague: ["joining"],
  noTeam: ["joining", "draftPending", "blockedConflict"],
  readyComplete: ["simulating", "waitingForOthers", "blockedConflict"],
  readyOpen: ["waitingForOthers", "readyComplete", "blockedConflict"],
  resultsAvailable: ["readyOpen", "readyComplete", "draftPending", "blockedConflict"],
  rosterInvalid: ["readyOpen", "blockedConflict"],
  simulating: ["weekCompleted", "resultsAvailable", "blockedConflict"],
  waitingForOthers: ["readyOpen", "readyComplete", "simulating", "blockedConflict"],
  weekCompleted: ["resultsAvailable", "readyOpen", "blockedConflict"],
} satisfies Record<OnlineCoreLifecyclePhase, OnlineCoreLifecyclePhase[]>;

function getLeagueStatusLabel(status: OnlineLeague["status"]) {
  return status === "waiting" ? "Wartet auf Spieler" : "Saison läuft";
}

function normalizeDraftPhase(
  draftStatus: OnlineFantasyDraftStatus | undefined,
): OnlineLeagueLifecycleDraftPhase {
  if (!draftStatus) {
    return "not_configured";
  }

  if (draftStatus === "active") {
    return "active";
  }

  if (draftStatus === "completed") {
    return "completed";
  }

  return "pending";
}

function getMembershipPhase(
  currentUser: OnlineUser | null,
  currentLeagueUser: OnlineLeagueUser | null,
): OnlineLeagueLifecycleMembershipPhase {
  if (!currentUser) {
    return "anonymous";
  }

  if (!currentLeagueUser) {
    return "missing_membership";
  }

  return isOnlineLeagueUserActiveWeekParticipant(currentLeagueUser)
    ? "connected"
    : "inactive_team";
}

function getCurrentLeagueUser(league: OnlineLeague, currentUser: OnlineUser | null) {
  return league.users.find((user) => currentUser?.userId === user.userId) ?? null;
}

function getCoreLifecycleProjectionConflicts(
  league: OnlineLeague,
  currentLeagueUser: OnlineLeagueUser | null,
) {
  if (!currentLeagueUser?.teamId) {
    return [];
  }

  const assignedTeam = league.teams.find((team) => team.id === currentLeagueUser.teamId);

  if (!assignedTeam) {
    return [];
  }

  const projectionUserId = assignedTeam.assignedUserId ?? null;

  if (projectionUserId && projectionUserId !== currentLeagueUser.userId) {
    return [
      `Membership-Projektion inkonsistent: Team ${assignedTeam.id} ist ${projectionUserId} zugeordnet, Membership gehoert ${currentLeagueUser.userId}.`,
    ];
  }

  if (assignedTeam.assignmentStatus === "assigned" && projectionUserId === null) {
    return [
      `Membership-Projektion inkonsistent: Team ${assignedTeam.id} ist assigned, aber assignedUserId fehlt.`,
    ];
  }

  return [];
}

function hasCurrentWeekResults(
  league: OnlineLeague,
  weekProgress: OnlineLeagueWeekProgressState,
) {
  const resultIds = new Set((league.matchResults ?? []).map((result) => result.matchId));
  const completedWeek = weekProgress.latestCompletedWeek;

  if (!completedWeek) {
    return false;
  }

  if (completedWeek.resultMatchIds.length > 0) {
    return completedWeek.resultMatchIds.every((resultId) => resultIds.has(resultId));
  }

  return (league.matchResults ?? []).some(
    (result) => result.season === completedWeek.season && result.week === completedWeek.week,
  );
}

function getCoreLifecycleWeekProjectionConflicts(
  league: OnlineLeague,
  weekProgress: OnlineLeagueWeekProgressState,
) {
  const weekStatus = league.weekStatus ?? "pre_week";

  if (
    weekProgress.canonicalCompletedWeekKeys.includes(weekProgress.currentWeekKey) &&
    (weekStatus === "pre_week" || weekStatus === "ready")
  ) {
    return [
      `Week-State-Konflikt: completedWeeks markiert ${weekProgress.currentWeekKey} als abgeschlossen, aber weekStatus=${weekStatus} ist offen.`,
    ];
  }

  return [];
}

function getCoreLifecyclePhase(input: {
  conflictReasons: string[];
  currentLeagueUser: OnlineLeagueUser | null;
  currentUserReady: boolean;
  draftStatus: OnlineFantasyDraftStatus | "missing";
  hasResults: boolean;
  joining?: boolean;
  league: OnlineLeague;
  readyAction: OnlineLeagueReadyChangeResult;
  readyState: OnlineLeagueWeekReadyState;
  requiresDraft?: boolean;
  simulationInProgress?: boolean;
  weekProgress: OnlineLeagueWeekProgressState;
}): OnlineCoreLifecyclePhase {
  if (input.conflictReasons.length > 0) {
    return "blockedConflict";
  }

  if (input.joining || !input.currentLeagueUser) {
    return "joining";
  }

  if (
    !input.currentLeagueUser.teamId ||
    input.currentLeagueUser.teamStatus === "vacant" ||
    !input.league.teams.some((team) => team.id === input.currentLeagueUser?.teamId)
  ) {
    return "noTeam";
  }

  if (input.simulationInProgress || input.weekProgress.phase === "simulating") {
    return "simulating";
  }

  if (input.weekProgress.phase === "completed") {
    return input.hasResults ? "resultsAvailable" : "weekCompleted";
  }

  if (input.weekProgress.phase === "advanced" && input.hasResults) {
    return "resultsAvailable";
  }

  if (input.draftStatus === "active") {
    return "draftActive";
  }

  if (
    input.requiresDraft &&
    (input.draftStatus === "not_started" || input.draftStatus === "missing")
  ) {
    return "draftPending";
  }

  const teamReadinessIssue = input.readyState.activeParticipants.find(
    (participant) => participant.userId === input.currentLeagueUser?.userId,
  )?.readyBlockedReason;

  if (teamReadinessIssue) {
    return "rosterInvalid";
  }

  if (input.readyState.allReady && input.readyState.canSimulate) {
    return "readyComplete";
  }

  if (input.currentUserReady) {
    return "waitingForOthers";
  }

  return input.readyAction.allowed ? "readyOpen" : "rosterInvalid";
}

function getGlobalCoreLifecyclePhase(input: {
  conflictReasons: string[];
  draftStatus: OnlineFantasyDraftStatus | "missing";
  hasResults: boolean;
  league: OnlineLeague;
  readyState: OnlineLeagueWeekReadyState;
  requiresDraft?: boolean;
  simulationInProgress?: boolean;
  weekProgress: OnlineLeagueWeekProgressState;
}): OnlineCoreLifecyclePhase {
  if (input.conflictReasons.length > 0) {
    return "blockedConflict";
  }

  if (input.readyState.activeParticipants.length === 0) {
    return input.league.users.length === 0 ? "joining" : "noTeam";
  }

  if (
    input.readyState.activeParticipants.some(
      (participant) =>
        !participant.teamId ||
        !input.league.teams.some((team) => team.id === participant.teamId),
    )
  ) {
    return "noTeam";
  }

  if (input.simulationInProgress || input.weekProgress.phase === "simulating") {
    return "simulating";
  }

  if (input.weekProgress.phase === "completed") {
    return input.hasResults ? "resultsAvailable" : "weekCompleted";
  }

  if (input.weekProgress.phase === "advanced" && input.hasResults) {
    return "resultsAvailable";
  }

  if (input.draftStatus === "active") {
    return "draftActive";
  }

  if (
    input.requiresDraft &&
    (input.draftStatus === "not_started" || input.draftStatus === "missing")
  ) {
    return "draftPending";
  }

  if (input.readyState.activeParticipants.some((participant) => participant.readyBlockedReason)) {
    return "rosterInvalid";
  }

  if (input.readyState.allReady && input.readyState.canSimulate) {
    return "readyComplete";
  }

  if (input.readyState.readyCount > 0) {
    return "waitingForOthers";
  }

  return "readyOpen";
}

export function canTransitionOnlineCoreLifecycle(
  from: OnlineCoreLifecyclePhase,
  to: OnlineCoreLifecyclePhase,
) {
  const allowedTransitions: readonly OnlineCoreLifecyclePhase[] =
    ONLINE_CORE_LIFECYCLE_ALLOWED_TRANSITIONS[from];

  return allowedTransitions.includes(to);
}

function canSetReadyInCoreLifecyclePhase(
  phase: OnlineCoreLifecyclePhase,
  readyAction: OnlineLeagueReadyChangeResult,
) {
  return (
    readyAction.allowed &&
    (phase === "readyOpen" || phase === "waitingForOthers" || phase === "readyComplete")
  );
}

function getCoreLifecyclePhaseBlockReason(phase: OnlineCoreLifecyclePhase) {
  switch (phase) {
    case "draftActive":
      return "Bereit-Status ist während des Drafts gesperrt.";
    case "draftPending":
      return "Fantasy Draft muss vor dem Ready-State abgeschlossen sein.";
    case "joining":
      return "Liga-Beitritt und Team-Zuordnung sind noch nicht abgeschlossen.";
    case "noLeague":
      return "Keine Online-Liga geladen.";
    case "noTeam":
      return "Kein Manager-Team verbunden.";
    case "resultsAvailable":
      return "Ergebnisse sind bereits verfügbar.";
    case "simulating":
      return "Simulation läuft gerade.";
    case "weekCompleted":
      return "Diese Woche ist bereits abgeschlossen.";
    case "blockedConflict":
    case "readyComplete":
    case "readyOpen":
    case "rosterInvalid":
    case "waitingForOthers":
      return null;
  }
}

function normalizeOnlineCoreLifecycleInternal(
  input: OnlineCoreLifecycleInput & { mode: OnlineCoreLifecycleDerivationMode },
): OnlineCoreLifecycleState {
  if (!input.league) {
    return {
      allowedTransitions: ONLINE_CORE_LIFECYCLE_ALLOWED_TRANSITIONS.noLeague,
      canSetReady: false,
      canSimulate: false,
      currentLeagueUser: null,
      currentSeason: null,
      currentUserReady: false,
      currentWeek: null,
      draftStatus: "missing",
      hasResults: false,
      phase: "noLeague",
      readyState: null,
      reasons: ["Keine Online-Liga geladen."],
      weekKey: null,
      weekProgress: null,
    };
  }

  const league = input.league;
  const readyState = getOnlineLeagueWeekReadyState(league);
  const weekProgress = getOnlineLeagueWeekProgressState(league);
  const currentLeagueUser = getCurrentLeagueUser(league, input.currentUser);
  const currentUserReady = Boolean(
    input.currentUser &&
      readyState.readyParticipants.some(
        (participant) => participant.userId === input.currentUser?.userId,
      ),
  );
  const readyAction = getOnlineLeagueReadyChangeState(
    {
      ...league,
      weekStatus: weekProgress.phase === "completed" ? "completed" : league.weekStatus,
    },
    currentLeagueUser ?? undefined,
  );
  const conflictReasons = [
    ...weekProgress.conflictReasons,
    ...getCoreLifecycleWeekProjectionConflicts(league, weekProgress),
    ...getCoreLifecycleProjectionConflicts(league, currentLeagueUser),
    ...(input.projectionConflicts ?? []),
  ];
  const draftStatus = league.fantasyDraft?.status ?? "missing";
  const hasResults = hasCurrentWeekResults(league, weekProgress);
  const phase = getCoreLifecyclePhase({
    conflictReasons,
    currentLeagueUser,
    currentUserReady,
    draftStatus,
    hasResults,
    joining: input.joining,
    league,
    readyAction,
    readyState,
    requiresDraft: input.requiresDraft,
    simulationInProgress: input.simulationInProgress,
    weekProgress,
  });
  const globalPhase = getGlobalCoreLifecyclePhase({
    conflictReasons,
    draftStatus,
    hasResults,
    league,
    readyState,
    requiresDraft: input.requiresDraft,
    simulationInProgress: input.simulationInProgress,
    weekProgress,
  });
  const effectivePhase = input.mode === "league" ? globalPhase : phase;
  const teamReadinessIssue =
    input.mode === "league"
      ? readyState.activeParticipants.find((participant) => participant.readyBlockedReason)
          ?.readyBlockedReason
      : readyState.activeParticipants.find(
          (participant) => participant.userId === currentLeagueUser?.userId,
        )?.readyBlockedReason;
  const readyActionReason =
    input.mode === "user" && !readyAction.allowed ? readyAction.reason : null;
  const reasons = (
    effectivePhase === "rosterInvalid"
      ? [...conflictReasons, teamReadinessIssue, readyActionReason]
      : [
          ...conflictReasons,
          readyActionReason,
          teamReadinessIssue,
          getCoreLifecyclePhaseBlockReason(effectivePhase),
        ]
  ).filter((reason): reason is string => Boolean(reason));

  return {
    allowedTransitions: ONLINE_CORE_LIFECYCLE_ALLOWED_TRANSITIONS[effectivePhase],
    canSetReady:
      input.mode === "user" && canSetReadyInCoreLifecyclePhase(effectivePhase, readyAction),
    canSimulate: readyState.canSimulate && effectivePhase === "readyComplete",
    currentLeagueUser,
    currentSeason: weekProgress.currentSeason,
    currentUserReady,
    currentWeek: weekProgress.currentWeek,
    draftStatus,
    hasResults,
    phase: effectivePhase,
    readyState,
    reasons: [...new Set(reasons)],
    weekKey: weekProgress.currentWeekKey,
    weekProgress,
  };
}

export function normalizeOnlineCoreLifecycle(
  input: OnlineCoreLifecycleInput,
): OnlineCoreLifecycleState {
  return normalizeOnlineCoreLifecycleInternal({ ...input, mode: "user" });
}

export function normalizeOnlineLeagueCoreLifecycle(
  input: Omit<OnlineCoreLifecycleInput, "currentUser" | "joining">,
): OnlineCoreLifecycleState {
  return normalizeOnlineCoreLifecycleInternal({
    ...input,
    currentUser: null,
    mode: "league",
  });
}

function getLifecyclePhase(input: {
  currentUserReady: boolean;
  draftPhase: OnlineLeagueLifecycleDraftPhase;
  membershipPhase: OnlineLeagueLifecycleMembershipPhase;
  readyAction: OnlineLeagueReadyChangeResult;
  weekProgress: OnlineLeagueWeekProgressState;
}): OnlineLeagueLifecyclePhase {
  if (input.membershipPhase === "anonymous") {
    return "needs_login";
  }

  if (input.membershipPhase === "missing_membership") {
    return "missing_membership";
  }

  if (input.membershipPhase === "inactive_team") {
    return "inactive_team";
  }

  if (input.draftPhase === "active") {
    return "draft_active";
  }

  if (input.draftPhase === "pending") {
    return "draft_pending";
  }

  if (input.weekProgress.phase === "simulating") {
    return "week_simulating";
  }

  if (input.weekProgress.phase === "completed") {
    return "week_completed";
  }

  if (input.weekProgress.phase === "advanced") {
    return "week_advanced";
  }

  if (input.currentUserReady) {
    return "ready_set";
  }

  return input.readyAction.allowed ? "ready_open" : "ready_blocked";
}

function getLifecycleStatusLabel(phase: OnlineLeagueLifecyclePhase) {
  switch (phase) {
    case "needs_login":
      return "Login erforderlich";
    case "missing_membership":
      return "Kein Team verbunden";
    case "inactive_team":
      return "Team nicht aktiv";
    case "draft_active":
      return "Draft läuft";
    case "draft_pending":
      return "Draft vorbereitet";
    case "week_simulating":
      return "Simulation läuft";
    case "week_completed":
      return "Woche abgeschlossen";
    case "week_advanced":
      return "Nächste Woche offen";
    case "ready_set":
      return "Bereit";
    case "ready_open":
      return "Ready möglich";
    case "ready_blocked":
      return "Bereit gesperrt";
  }
}

export function normalizeOnlineLeagueLifecycle(
  league: OnlineLeague,
  currentUser: OnlineUser | null,
): OnlineLeagueLifecycleState {
  const readyState = getOnlineLeagueWeekReadyState(league);
  const weekProgress = getOnlineLeagueWeekProgressState(league);
  const currentLeagueUser = getCurrentLeagueUser(league, currentUser);
  const currentUserReady = Boolean(
    currentUser &&
      readyState.readyParticipants.some((participant) => participant.userId === currentUser.userId),
  );
  const draftPhase = normalizeDraftPhase(league.fantasyDraft?.status);
  const membershipPhase = getMembershipPhase(currentUser, currentLeagueUser);
  const readyAction = getOnlineLeagueReadyChangeState(
    {
      ...league,
      weekStatus: weekProgress.phase === "completed" ? "completed" : league.weekStatus,
    },
    currentLeagueUser ?? undefined,
  );
  const phase = getLifecyclePhase({
    currentUserReady,
    draftPhase,
    membershipPhase,
    readyAction,
    weekProgress,
  });
  const reasons = [
    readyAction.allowed ? null : readyAction.reason,
    ...weekProgress.conflictReasons,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    currentLeagueUser,
    currentUserReady,
    draftPhase,
    leagueStatusLabel: getLeagueStatusLabel(league.status),
    membershipPhase,
    phase,
    readyAction,
    readyActionDisabledReason: readyAction.allowed ? null : readyAction.reason,
    readyState,
    reasons: [...new Set(reasons)],
    statusLabel: getLifecycleStatusLabel(phase),
    weekProgress,
  };
}
