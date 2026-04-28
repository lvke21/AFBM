import type { MatchReport, MatchReportDrive } from "./match-report-model";
import {
  getGameLiveHref,
  getGameReportHref as getGameFlowReportHref,
} from "./game-flow-model";

export type GameCenterStatusTone = "scheduled" | "live" | "final";

export type GameCenterStatusState = {
  label: string;
  tone: GameCenterStatusTone;
  scoreLine: string;
  driveCount: number;
  hasDriveLog: boolean;
  lastDrive: MatchReportDrive | null;
  reportReady: boolean;
  reportHref: string;
};

export function getGameCenterHref(saveGameId: string, matchId: string | null | undefined) {
  return matchId ? getGameLiveHref(saveGameId, matchId) : null;
}

export function getGameReportHref(saveGameId: string, matchId: string | null | undefined) {
  return matchId ? getGameFlowReportHref(saveGameId, matchId) : null;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "Geplant";
    case "IN_PROGRESS":
      return "Laeuft";
    case "COMPLETED":
      return "Final";
    default:
      return status.replaceAll("_", " ");
  }
}

function getStatusTone(status: string): GameCenterStatusTone {
  if (status === "IN_PROGRESS") {
    return "live";
  }

  if (status === "COMPLETED") {
    return "final";
  }

  return "scheduled";
}

export function buildGameCenterStatusState(
  match: Pick<MatchReport, "status" | "homeTeam" | "awayTeam" | "drives">,
  reportHref: string,
): GameCenterStatusState {
  const homeScore = match.homeTeam.score ?? "-";
  const awayScore = match.awayTeam.score ?? "-";

  return {
    driveCount: match.drives.length,
    hasDriveLog: match.drives.length > 0,
    label: getStatusLabel(match.status),
    lastDrive: match.drives.at(-1) ?? null,
    reportHref,
    reportReady: match.status === "COMPLETED",
    scoreLine: `${match.homeTeam.abbreviation} ${homeScore} : ${awayScore} ${match.awayTeam.abbreviation}`,
    tone: getStatusTone(match.status),
  };
}
