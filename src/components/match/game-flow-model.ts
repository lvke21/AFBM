import type { SeasonMatchSummary, SeasonOverview } from "@/modules/seasons/domain/season.types";

export type GameFlowStep = "setup" | "live" | "report";

export type GameFlowStatus = "pre" | "live" | "finished";
export type GameReportPhase = "PRE_GAME" | "IN_PROGRESS" | "FINISHED";

const STEP_LABELS: Record<GameFlowStep, string> = {
  live: "Live-Spiel",
  report: "Spielbericht",
  setup: "Spielvorbereitung",
};

const STATUS_LABELS: Record<GameFlowStatus, string> = {
  finished: "Beendet",
  live: "Live",
  pre: "Vor dem Spiel",
};

const REPORT_PHASE_LABELS: Record<GameReportPhase, string> = {
  FINISHED: "Beendet",
  IN_PROGRESS: "Live",
  PRE_GAME: "Vor dem Spiel",
};

function gameBase(saveGameId: string) {
  return `/app/savegames/${saveGameId}/game`;
}

function matchQuery(matchId: string | null | undefined) {
  return matchId ? `?matchId=${encodeURIComponent(matchId)}` : "";
}

export function getGameSetupHref(saveGameId: string, matchId?: string | null) {
  return `${gameBase(saveGameId)}/setup${matchQuery(matchId)}`;
}

export function getGameLiveHref(saveGameId: string, matchId?: string | null) {
  return `${gameBase(saveGameId)}/live${matchQuery(matchId)}`;
}

export function getGameReportHref(saveGameId: string, matchId?: string | null) {
  return `${gameBase(saveGameId)}/report${matchQuery(matchId)}`;
}

export function getGameFlowStatus(status: string): GameFlowStatus {
  if (status === "IN_PROGRESS") {
    return "live";
  }

  if (status === "COMPLETED") {
    return "finished";
  }

  return "pre";
}

export function getGameReportPhase(status: string): GameReportPhase {
  if (status === "COMPLETED") {
    return "FINISHED";
  }

  if (status === "IN_PROGRESS") {
    return "IN_PROGRESS";
  }

  return "PRE_GAME";
}

export function getGameFlowStepForStatus(status: string): GameFlowStep {
  const flowStatus = getGameFlowStatus(status);

  if (flowStatus === "live") {
    return "live";
  }

  if (flowStatus === "finished") {
    return "report";
  }

  return "setup";
}

export function getGameFlowHref(
  saveGameId: string,
  match: Pick<SeasonMatchSummary, "id" | "status"> | null | undefined,
) {
  if (!match) {
    return getGameSetupHref(saveGameId);
  }

  const step = getGameFlowStepForStatus(match.status);

  if (step === "live") {
    return getGameLiveHref(saveGameId, match.id);
  }

  if (step === "report") {
    return getGameReportHref(saveGameId, match.id);
  }

  return getGameSetupHref(saveGameId, match.id);
}

export function getGameFlowStepLabel(step: GameFlowStep) {
  return STEP_LABELS[step];
}

export function getGameFlowStatusLabel(status: GameFlowStatus) {
  return STATUS_LABELS[status];
}

export function getGameReportPhaseLabel(phase: GameReportPhase) {
  return REPORT_PHASE_LABELS[phase];
}

function sortByWeekAndDate(matches: SeasonMatchSummary[]) {
  return [...matches].sort((left, right) => {
    if (left.week !== right.week) {
      return left.week - right.week;
    }

    return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
  });
}

function sortLatestFirst(matches: SeasonMatchSummary[]) {
  return [...matches].sort((left, right) => {
    if (left.week !== right.week) {
      return right.week - left.week;
    }

    return new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime();
  });
}

function isManagerMatch(match: SeasonMatchSummary, managerTeamId: string | null | undefined) {
  return Boolean(managerTeamId) &&
    (match.homeTeamId === managerTeamId || match.awayTeamId === managerTeamId);
}

function selectByStatus(
  season: SeasonOverview,
  managerTeamId: string | null | undefined,
  status: string,
) {
  const matches = season.matches.filter((match) => match.status === status);
  const ordered = status === "COMPLETED" ? sortLatestFirst(matches) : sortByWeekAndDate(matches);
  const currentWeek = ordered.filter((match) => match.week === season.week);

  return (
    currentWeek.find((match) => isManagerMatch(match, managerTeamId)) ??
    currentWeek[0] ??
    ordered.find((match) => isManagerMatch(match, managerTeamId)) ??
    ordered[0] ??
    null
  );
}

export function selectRelevantGameFlowMatch(
  season: SeasonOverview | null,
  managerTeamId: string | null | undefined,
) {
  if (!season) {
    return null;
  }

  return (
    selectByStatus(season, managerTeamId, "IN_PROGRESS") ??
    selectByStatus(season, managerTeamId, "SCHEDULED") ??
    selectByStatus(season, managerTeamId, "COMPLETED")
  );
}

export function selectGameFlowMatchForStep(
  season: SeasonOverview | null,
  managerTeamId: string | null | undefined,
  step: GameFlowStep,
) {
  if (!season) {
    return null;
  }

  if (step === "live") {
    return selectByStatus(season, managerTeamId, "IN_PROGRESS") ??
      selectRelevantGameFlowMatch(season, managerTeamId);
  }

  if (step === "report") {
    return selectByStatus(season, managerTeamId, "COMPLETED") ??
      selectRelevantGameFlowMatch(season, managerTeamId);
  }

  return selectByStatus(season, managerTeamId, "SCHEDULED") ??
    selectRelevantGameFlowMatch(season, managerTeamId);
}
