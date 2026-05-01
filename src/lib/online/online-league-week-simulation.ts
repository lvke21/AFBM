import {
  getOnlineLeagueWeekReadyState,
  isOnlineLeagueUserActiveWeekParticipant,
} from "./online-league-week-service";
import type {
  OnlineLeague,
  OnlineLeagueScheduleMatch,
  OnlineMatchResult,
} from "./online-league-types";

export type OnlineLeagueWeekGameStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "failed";

export type OnlineLeagueWeekSimulationGame = {
  id: string;
  awayTeamId: string;
  awayTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
  leagueId: string;
  result?: OnlineMatchResult;
  scheduledAt?: string;
  season: number;
  status: OnlineLeagueWeekGameStatus;
  week: number;
};

export type OnlineLeagueTeamRecord = {
  gamesPlayed: number;
  losses: number;
  pointDifferential: number;
  pointsAgainst: number;
  pointsFor: number;
  streak?: string;
  teamId: string;
  ties: number;
  updatedAt?: string;
  wins: number;
};

export type OnlineLeagueWeekSimulationState = {
  canSimulate: boolean;
  currentSeason: number;
  currentWeek: number;
  games: OnlineLeagueWeekSimulationGame[];
  hasValidSchedule: boolean;
  lastSimulatedWeekKey?: string;
  records: OnlineLeagueTeamRecord[];
  reasons: string[];
  status: OnlineLeague["status"];
  weekKey: string;
  weekStatus: NonNullable<OnlineLeague["weekStatus"]>;
};

type ScheduleLike = OnlineLeagueScheduleMatch & {
  awayTeamId?: string;
  homeTeamId?: string;
  scheduledAt?: string;
  status?: OnlineLeagueWeekGameStatus;
};

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

function normalizeWeekStatus(value: OnlineLeague["weekStatus"]) {
  return value ?? "pre_week";
}

function getTeamNameById(league: OnlineLeague, teamId: string) {
  return league.teams.find((team) => team.id === teamId)?.name ?? teamId;
}

function resolveScheduledTeamId(
  league: OnlineLeague,
  scheduledValue: string | undefined,
  explicitTeamId: string | undefined,
) {
  if (explicitTeamId && league.teams.some((team) => team.id === explicitTeamId)) {
    return explicitTeamId;
  }

  if (!scheduledValue) {
    return null;
  }

  const directTeam = league.teams.find((team) => team.id === scheduledValue);

  if (directTeam) {
    return directTeam.id;
  }

  const activeUser = league.users
    .filter(isOnlineLeagueUserActiveWeekParticipant)
    .find((user) => (user.teamDisplayName ?? user.teamName) === scheduledValue);

  return activeUser?.teamId ?? null;
}

function getResultForGame(
  results: OnlineMatchResult[],
  gameId: string,
  season: number,
  week: number,
) {
  return results.find(
    (result) =>
      result.matchId === gameId ||
      (result.season === season && result.week === week && result.matchId === gameId),
  );
}

function toWeekSimulationGame(
  league: OnlineLeague,
  scheduleMatch: OnlineLeagueScheduleMatch,
  season: number,
  results: OnlineMatchResult[],
) {
  const match = scheduleMatch as ScheduleLike;
  const homeTeamId = resolveScheduledTeamId(
    league,
    match.homeTeamName,
    match.homeTeamId,
  );
  const awayTeamId = resolveScheduledTeamId(
    league,
    match.awayTeamName,
    match.awayTeamId,
  );

  if (!match.id || !homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    return null;
  }

  const result = getResultForGame(results, match.id, season, match.week);
  const game: OnlineLeagueWeekSimulationGame = {
    id: match.id,
    awayTeamId,
    awayTeamName: getTeamNameById(league, awayTeamId),
    homeTeamId,
    homeTeamName: getTeamNameById(league, homeTeamId),
    leagueId: league.id,
    season,
    status: result ? "completed" : match.status ?? "scheduled",
    week: match.week,
  };

  if (result) {
    game.result = result;
  }

  if (match.scheduledAt) {
    game.scheduledAt = match.scheduledAt;
  }

  return game;
}

export function normalizeOnlineLeagueWeekSimulationState(
  league: OnlineLeague,
): OnlineLeagueWeekSimulationState {
  const currentWeek = normalizePositiveInteger(
    (league as { currentWeek?: unknown }).currentWeek,
    1,
  );
  const currentSeason = normalizePositiveInteger(league.currentSeason, 1);
  const games = getCurrentWeekGames(league);
  const readyState = getOnlineLeagueWeekReadyState({
    ...league,
    currentWeek,
    currentSeason,
  });
  const reasons: string[] = [];

  if (league.status !== "active") {
    reasons.push("Liga ist nicht aktiv.");
  }

  if (league.fantasyDraft && league.fantasyDraft.status !== "completed") {
    reasons.push("Fantasy Draft ist noch nicht abgeschlossen.");
  }

  if (!readyState.allReady) {
    reasons.push("Nicht alle aktiven Teams sind ready.");
  }

  if (games.length === 0) {
    reasons.push("Für die aktuelle Woche ist kein gültiger Schedule vorhanden.");
  }

  if (normalizeWeekStatus(league.weekStatus) === "simulating") {
    reasons.push("Die Woche wird bereits simuliert.");
  }

  return {
    canSimulate: reasons.length === 0,
    currentSeason,
    currentWeek,
    games,
    hasValidSchedule: games.length > 0,
    lastSimulatedWeekKey: league.lastSimulatedWeekKey,
    records: buildOnlineLeagueTeamRecords(league),
    reasons,
    status: league.status,
    weekKey: `s${currentSeason}-w${currentWeek}`,
    weekStatus: normalizeWeekStatus(league.weekStatus),
  };
}

export function getCurrentWeekGames(league: OnlineLeague) {
  const currentWeek = normalizePositiveInteger(
    (league as { currentWeek?: unknown }).currentWeek,
    1,
  );
  const currentSeason = normalizePositiveInteger(league.currentSeason, 1);
  const results = league.matchResults ?? [];

  return (league.schedule ?? [])
    .filter((match) => match.week === currentWeek)
    .map((match) => toWeekSimulationGame(league, match, currentSeason, results))
    .filter((game): game is OnlineLeagueWeekSimulationGame => game !== null);
}

export function hasValidScheduleForWeek(league: OnlineLeague, week: number) {
  const normalizedWeek = normalizePositiveInteger(week, 1);
  const currentSeason = normalizePositiveInteger(league.currentSeason, 1);
  const results = league.matchResults ?? [];

  return (league.schedule ?? [])
    .filter((match) => match.week === normalizedWeek)
    .some((match) => toWeekSimulationGame(league, match, currentSeason, results) !== null);
}

export function canSimulateWeek(league: OnlineLeague) {
  return normalizeOnlineLeagueWeekSimulationState(league).canSimulate;
}

export function buildOnlineLeagueTeamRecords(
  league: OnlineLeague,
  updatedAt?: string,
): OnlineLeagueTeamRecord[] {
  const records = new Map(
    league.teams.map((team) => [
      team.id,
      {
        gamesPlayed: 0,
        losses: 0,
        pointDifferential: 0,
        pointsAgainst: 0,
        pointsFor: 0,
        teamId: team.id,
        ties: 0,
        wins: 0,
      },
    ]),
  );
  const streaks = new Map<string, { count: number; type: "L" | "T" | "W" }>();

  for (const result of league.matchResults ?? []) {
    const home = records.get(result.homeTeamId);
    const away = records.get(result.awayTeamId);

    if (!home || !away) {
      continue;
    }

    home.pointsFor += result.homeScore;
    home.pointsAgainst += result.awayScore;
    home.pointDifferential = home.pointsFor - home.pointsAgainst;
    home.gamesPlayed += 1;
    away.pointsFor += result.awayScore;
    away.pointsAgainst += result.homeScore;
    away.pointDifferential = away.pointsFor - away.pointsAgainst;
    away.gamesPlayed += 1;

    if (result.homeScore === result.awayScore) {
      home.ties += 1;
      away.ties += 1;
      updateStreak(streaks, result.homeTeamId, "T");
      updateStreak(streaks, result.awayTeamId, "T");
    } else if (result.homeScore > result.awayScore) {
      home.wins += 1;
      away.losses += 1;
      updateStreak(streaks, result.homeTeamId, "W");
      updateStreak(streaks, result.awayTeamId, "L");
    } else {
      away.wins += 1;
      home.losses += 1;
      updateStreak(streaks, result.awayTeamId, "W");
      updateStreak(streaks, result.homeTeamId, "L");
    }
  }

  return sortOnlineLeagueTeamRecords(
    Array.from(records.values()).map((record) => {
      const streak = streaks.get(record.teamId);

      return {
        ...record,
        pointDifferential: record.pointsFor - record.pointsAgainst,
        streak: streak ? `${streak.type}${streak.count}` : undefined,
        updatedAt,
      };
    }),
  );
}

function updateStreak(
  streaks: Map<string, { count: number; type: "L" | "T" | "W" }>,
  teamId: string,
  type: "L" | "T" | "W",
) {
  const current = streaks.get(teamId);

  streaks.set(teamId, {
    count: current?.type === type ? current.count + 1 : 1,
    type,
  });
}

export function sortOnlineLeagueTeamRecords(records: OnlineLeagueTeamRecord[]) {
  return [...records].sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    if (left.losses !== right.losses) {
      return left.losses - right.losses;
    }

    if (right.pointDifferential !== left.pointDifferential) {
      return right.pointDifferential - left.pointDifferential;
    }

    if (right.pointsFor !== left.pointsFor) {
      return right.pointsFor - left.pointsFor;
    }

    return left.teamId.localeCompare(right.teamId);
  });
}
