import type {
  SeasonMatchSummary,
  SeasonOverview,
  SeasonStandingRow,
} from "@/modules/seasons/domain/season.types";
import {
  getGameFlowHref,
  getGameLiveHref,
  getGameReportHref,
} from "@/components/match/game-flow-model";

export function getTeamHref(saveGameId: string, teamId: string) {
  void teamId;
  return `/app/savegames/${saveGameId}/team`;
}

export function getGameCenterHref(saveGameId: string, matchId: string) {
  return getGameLiveHref(saveGameId, matchId);
}

export function getMatchHref(saveGameId: string, matchId: string) {
  return getGameReportHref(saveGameId, matchId);
}

export function getMatchFlowHref(saveGameId: string, match: SeasonMatchSummary) {
  return getGameFlowHref(saveGameId, match);
}

export function getRedZoneTouchdownRate(row: SeasonStandingRow) {
  if (row.redZoneTrips <= 0) {
    return null;
  }

  return Math.round((row.redZoneTouchdowns / row.redZoneTrips) * 100);
}

function recordWins(record: string) {
  const [wins] = record.split("-").map((part) => Number(part));
  return Number.isFinite(wins) ? wins : 0;
}

function recordLosses(record: string) {
  const [, losses] = record.split("-").map((part) => Number(part));
  return Number.isFinite(losses) ? losses : 0;
}

export function sortStandingsRows(rows: SeasonStandingRow[]) {
  return [...rows].sort((left, right) => {
    const winDiff = recordWins(right.record) - recordWins(left.record);
    if (winDiff !== 0) {
      return winDiff;
    }

    const lossDiff = recordLosses(left.record) - recordLosses(right.record);
    if (lossDiff !== 0) {
      return lossDiff;
    }

    const pointDiff =
      right.pointsFor -
      right.pointsAgainst -
      (left.pointsFor - left.pointsAgainst);
    if (pointDiff !== 0) {
      return pointDiff;
    }

    return left.name.localeCompare(right.name);
  });
}

export function formatMatchResult(match: SeasonMatchSummary) {
  if (match.homeScore != null && match.awayScore != null) {
    return `${match.homeScore}:${match.awayScore}`;
  }

  return match.status;
}

export function getMatchWinnerName(match: SeasonMatchSummary) {
  if (match.homeScore == null || match.awayScore == null || match.homeScore === match.awayScore) {
    return null;
  }

  return match.homeScore > match.awayScore ? match.homeTeamName : match.awayTeamName;
}

export function sortScheduleMatches(matches: SeasonMatchSummary[]) {
  return [...matches].sort((left, right) => {
    if (left.week !== right.week) {
      return left.week - right.week;
    }

    return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
  });
}

export function groupScheduleByWeek(matches: SeasonMatchSummary[]) {
  return sortScheduleMatches(matches).reduce<Array<{ week: number; matches: SeasonMatchSummary[] }>>(
    (weeks, match) => {
      const current = weeks[weeks.length - 1];
      if (!current || current.week !== match.week) {
        weeks.push({
          week: match.week,
          matches: [match],
        });
      } else {
        current.matches.push(match);
      }

      return weeks;
    },
    [],
  );
}

export function getCurrentWeekSummary(season: Pick<SeasonOverview, "matches" | "week" | "phase">) {
  const currentWeekMatches = season.matches.filter((match) => match.week === season.week);
  const scheduledMatches = currentWeekMatches.filter((match) => match.status === "SCHEDULED");
  const completedMatches = currentWeekMatches.filter((match) => match.status === "COMPLETED");
  const inProgressMatches = currentWeekMatches.filter((match) => match.status === "IN_PROGRESS");
  const progressPercent =
    currentWeekMatches.length > 0
      ? Math.round((completedMatches.length / currentWeekMatches.length) * 100)
      : 0;

  return {
    canSimulateWeek:
      season.phase !== "OFFSEASON" &&
      scheduledMatches.length > 0 &&
      inProgressMatches.length === 0,
    completedMatches,
    currentWeekMatches,
    inProgressMatches,
    progressPercent,
    scheduledMatches,
  };
}
