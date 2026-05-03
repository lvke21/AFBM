import type { OnlineFantasyDraftStatus, OnlineLeague } from "./online-league-types";
import type { OnlineLeagueWeekReadyState } from "./online-league-week-service";
import type {
  OnlineLeagueWeekProgressPhase,
  OnlineLeagueWeekProgressState,
} from "./online-league-week-simulation";

export type OnlineLeagueWeekProgressLifecycleInput = {
  currentWeekCompleted: boolean;
  latestCompletionAdvancedCursor: boolean;
  normalizedWeekStatus: NonNullable<OnlineLeague["weekStatus"]>;
  readyState: OnlineLeagueWeekReadyState;
};

export type OnlineLeagueWeekProgressLifecycleState = {
  phase: OnlineLeagueWeekProgressPhase;
};

export type OnlineLeagueWeekSimulationLifecycleInput = {
  draftStatus?: OnlineFantasyDraftStatus;
  leagueStatus: OnlineLeague["status"];
  readyState: OnlineLeagueWeekReadyState;
  weekProgress: OnlineLeagueWeekProgressState;
};

export type OnlineLeagueWeekSimulationLifecyclePhase =
  | "blockedConflict"
  | "draftBlocked"
  | "leagueInactive"
  | "readyComplete"
  | "seasonComplete"
  | "simulating"
  | "teamsNotReady"
  | "weekCompleted";

export type OnlineLeagueWeekSimulationLifecycleState = {
  canSimulate: boolean;
  phase: OnlineLeagueWeekSimulationLifecyclePhase;
  reasons: string[];
};

export function normalizeOnlineLeagueWeekProgressLifecycle(
  input: OnlineLeagueWeekProgressLifecycleInput,
): OnlineLeagueWeekProgressLifecycleState {
  if (input.normalizedWeekStatus === "simulating") {
    return { phase: "simulating" };
  }

  if (input.currentWeekCompleted) {
    return { phase: "completed" };
  }

  if (input.latestCompletionAdvancedCursor) {
    return { phase: "advanced" };
  }

  if (input.readyState.allReady) {
    return { phase: "ready" };
  }

  return { phase: "pending" };
}

function getOnlineLeagueWeekSimulationLifecycleBlockReason(
  phase: OnlineLeagueWeekSimulationLifecyclePhase,
) {
  switch (phase) {
    case "blockedConflict":
      return null;
    case "draftBlocked":
      return "Fantasy Draft ist noch nicht abgeschlossen.";
    case "leagueInactive":
      return "Liga ist nicht aktiv.";
    case "readyComplete":
      return null;
    case "seasonComplete":
      return "Die Saison ist abgeschlossen.";
    case "simulating":
      return "Die Woche wird bereits simuliert.";
    case "teamsNotReady":
      return "Nicht alle aktiven Teams sind ready.";
    case "weekCompleted":
      return "Aktuelle Woche ist bereits abgeschlossen.";
  }
}

function getOnlineLeagueWeekSimulationLifecyclePhase(
  input: OnlineLeagueWeekSimulationLifecycleInput,
): OnlineLeagueWeekSimulationLifecyclePhase {
  if (input.weekProgress.hasConflicts) {
    return "blockedConflict";
  }

  if (input.leagueStatus !== "active") {
    return "leagueInactive";
  }

  if (input.weekProgress.phase === "season_complete") {
    return "seasonComplete";
  }

  if (input.weekProgress.phase === "simulating") {
    return "simulating";
  }

  if (input.weekProgress.phase === "completed") {
    return "weekCompleted";
  }

  if (input.draftStatus && input.draftStatus !== "completed") {
    return "draftBlocked";
  }

  if (!input.readyState.allReady || !input.readyState.canSimulate) {
    return "teamsNotReady";
  }

  return "readyComplete";
}

export function normalizeOnlineLeagueWeekSimulationLifecycle(
  input: OnlineLeagueWeekSimulationLifecycleInput,
): OnlineLeagueWeekSimulationLifecycleState {
  const phase = getOnlineLeagueWeekSimulationLifecyclePhase(input);
  const blockReason = getOnlineLeagueWeekSimulationLifecycleBlockReason(phase);
  const canonicalCompletionReason =
    input.weekProgress.phase === "completed"
      ? getOnlineLeagueWeekSimulationLifecycleBlockReason("weekCompleted")
      : null;
  const conflictReasons = input.weekProgress.conflictReasons.map(
    (reason) => `Week-State-Konflikt: ${reason}`,
  );
  const reasons = [
    phase === "blockedConflict" ? null : blockReason,
    canonicalCompletionReason,
    ...conflictReasons,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    canSimulate: phase === "readyComplete",
    phase,
    reasons: [...new Set(reasons)],
  };
}
