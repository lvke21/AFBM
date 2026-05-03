import { simulateOnlineGame } from "./online-game-simulation";
import { isOnlineLeagueUserActiveWeekParticipant } from "./online-league-week-service";
import type {
  OnlineCompletedWeek,
  OnlineLeague,
  OnlineLeagueUser,
  OnlineMatchResult,
} from "./online-league-types";

export type OnlineWeekMatchup = {
  away: OnlineLeagueUser;
  home: OnlineLeagueUser;
  matchId: string;
};

export function normalizeOnlineSeasonNumber(season: number | undefined) {
  if (typeof season !== "number" || !Number.isFinite(season)) {
    return 1;
  }

  return Math.max(Math.floor(season), 1);
}

export function clampOnlineScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function clampOnlineTrait(value: number) {
  return Math.min(100, Math.max(1, Math.round(value)));
}

export function clampOnlinePercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getStableOnlineNumberFromString(value: string) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function getOnlineSeasonFromLeagueWeek(currentWeek: number) {
  if (!Number.isFinite(currentWeek) || currentWeek <= 1) {
    return 1;
  }

  return Math.max(1, Math.ceil(currentWeek / 18));
}

export function isOnlineOffseasonWeek(currentWeek: number) {
  if (!Number.isFinite(currentWeek)) {
    return false;
  }

  const normalizedWeek = Math.max(1, Math.floor(currentWeek));

  return normalizedWeek === 1 || (normalizedWeek - 1) % 18 === 0;
}

export function getOnlineWeekMatchups(
  league: OnlineLeague,
  season: number,
  week: number,
): OnlineWeekMatchup[] {
  const activeUsers = league.users.filter(isOnlineLeagueUserActiveWeekParticipant);
  const usersByTeamId = new Map(activeUsers.map((user) => [user.teamId, user]));
  const scheduledMatches = (league.schedule ?? []).filter((match) => match.week === week);

  if (scheduledMatches.length > 0) {
    const matchups = scheduledMatches
      .map((match) => {
        const home =
          usersByTeamId.get(match.homeTeamName) ??
          activeUsers.find((user) => (user.teamDisplayName ?? user.teamName) === match.homeTeamName);
        const away =
          usersByTeamId.get(match.awayTeamName) ??
          activeUsers.find((user) => (user.teamDisplayName ?? user.teamName) === match.awayTeamName);

        return home && away
          ? {
              away,
              home,
              matchId: match.id,
            }
          : null;
      })
      .filter((matchup): matchup is OnlineWeekMatchup => matchup !== null);

    if (matchups.length > 0) {
      return matchups;
    }
  }

  const results: OnlineWeekMatchup[] = [];

  for (let index = 0; index < activeUsers.length; index += 2) {
    const home = activeUsers[index];
    const away = activeUsers[index + 1];

    if (!home || !away) {
      continue;
    }

    results.push({
      away,
      home,
      matchId: `${league.id}-s${season}-w${week}-${home.teamId}-${away.teamId}`,
    });
  }

  return results;
}

export function createOnlineMatchResultsForWeek(
  league: OnlineLeague,
  now = new Date().toISOString(),
  simulatedByUserId = "admin",
): OnlineMatchResult[] {
  const season = normalizeOnlineSeasonNumber(
    league.currentSeason ?? Math.ceil(league.currentWeek / 18),
  );
  const results: OnlineMatchResult[] = [];

  for (const matchup of getOnlineWeekMatchups(league, season, league.currentWeek)) {
    const simulated = simulateOnlineGame(
      {
        awayTeamId: matchup.away.teamId,
        awayTeamName: matchup.away.teamDisplayName ?? matchup.away.teamName,
        homeTeamId: matchup.home.teamId,
        homeTeamName: matchup.home.teamDisplayName ?? matchup.home.teamName,
        id: matchup.matchId,
        season,
        week: league.currentWeek,
      },
      league,
      {
        simulatedAt: now,
        simulatedByUserId,
      },
    );

    if (simulated.ok) {
      results.push(simulated.result);
    }
  }

  return results;
}

export function createCompletedOnlineWeek(input: {
  completedAt: string;
  nextSeason: number;
  nextWeek: number;
  resultMatchIds: string[];
  season: number;
  simulatedByUserId: string;
  week: number;
}): OnlineCompletedWeek {
  return {
    weekKey: `s${input.season}-w${input.week}`,
    season: input.season,
    week: input.week,
    status: "completed",
    resultMatchIds: input.resultMatchIds,
    completedAt: input.completedAt,
    simulatedByUserId: input.simulatedByUserId,
    nextSeason: input.nextSeason,
    nextWeek: input.nextWeek,
  };
}
