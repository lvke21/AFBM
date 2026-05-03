import {
  getOnlineLeagueWeekReadyState,
  isOnlineLeagueUserActiveWeekParticipant,
} from "./online-league-week-service";
import {
  normalizeOnlineLeagueWeekProgressLifecycle,
  normalizeOnlineLeagueWeekSimulationLifecycle,
} from "./online-league-week-simulation-lifecycle";
import type {
  OnlineCompletedWeek,
  OnlineContractPlayer,
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
  completion: OnlineLeagueWeekProgressState;
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

export type OnlineLeagueWeekProgressPhase =
  | "advanced"
  | "completed"
  | "pending"
  | "ready"
  | "season_complete"
  | "simulating";

export type OnlineLeagueWeekProgressTransition =
  | "pending -> ready"
  | "ready -> simulating"
  | "simulating -> completed"
  | "completed -> advanced"
  | "advanced -> pending";

export const ONLINE_LEAGUE_WEEK_PROGRESS_TRANSITIONS: OnlineLeagueWeekProgressTransition[] = [
  "pending -> ready",
  "ready -> simulating",
  "simulating -> completed",
  "completed -> advanced",
  "advanced -> pending",
];

export type OnlineLeagueWeekProgressState = {
  canonicalCompletedWeekKeys: string[];
  conflictCodes: OnlineLeagueWeekStateConflictCode[];
  conflictReasons: string[];
  conflicts: OnlineLeagueWeekStateConflict[];
  currentSeason: number;
  currentWeek: number;
  currentWeekKey: string;
  hasConflicts: boolean;
  latestCompletedWeek?: OnlineCompletedWeek;
  latestCompletedWeekKey?: string;
  lastScheduledWeek?: number;
  legacyCompletionWeekKeys: string[];
  phase: OnlineLeagueWeekProgressPhase;
  seasonComplete: boolean;
};

export type OnlineLeagueWeekStateConflictCode =
  | "completed-week-result-missing"
  | "duplicate-completed-week"
  | "duplicate-match-result"
  | "last-simulated-week-mismatch"
  | "legacy-completion-without-completed-week"
  | "week-doc-completed-without-completed-week"
  | "week-status-completed-without-completed-week";

export type OnlineLeagueWeekStateConflict = {
  code: OnlineLeagueWeekStateConflictCode;
  message: string;
};

type ScheduleLike = OnlineLeagueScheduleMatch & {
  awayTeamId?: string;
  homeTeamId?: string;
  scheduledAt?: string;
  status?: OnlineLeagueWeekGameStatus;
};

export type OnlineLeagueWeekProjection = {
  season: number;
  status?: string;
  week: number;
};

const MAX_REGULAR_SEASON_WEEK = 18;

function getDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

function addWeekConflict(
  conflicts: OnlineLeagueWeekStateConflict[],
  code: OnlineLeagueWeekStateConflictCode,
  message: string,
) {
  conflicts.push({ code, message });
}

function dedupeWeekConflicts(conflicts: OnlineLeagueWeekStateConflict[]) {
  const seen = new Set<string>();

  return conflicts.filter((conflict) => {
    const key = `${conflict.code}:${conflict.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

function getLastScheduledWeek(league: OnlineLeague) {
  const scheduledWeeks = (league.schedule ?? [])
    .map((match) => match.week)
    .filter((week) => Number.isInteger(week) && week >= 1);

  return scheduledWeeks.length > 0 ? Math.max(...scheduledWeeks) : undefined;
}

function isSeasonCompleteBySchedule(input: {
  currentWeek: number;
  latestCompletionAdvancedCursor: boolean;
  lastScheduledWeek?: number;
}) {
  return (
    input.lastScheduledWeek !== undefined &&
    input.currentWeek > input.lastScheduledWeek &&
    input.latestCompletionAdvancedCursor
  );
}

function isDefinedInvalidWeek(value: unknown) {
  return (
    value !== undefined &&
    (typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > MAX_REGULAR_SEASON_WEEK)
  );
}

function normalizeWeekStatus(value: OnlineLeague["weekStatus"]) {
  return value ?? "pre_week";
}

export function getOnlineLeagueWeekKey(season: number, week: number) {
  return `s${normalizePositiveInteger(season, 1)}-w${normalizePositiveInteger(week, 1)}`;
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

function hasPlayableRoster(contractRoster: OnlineContractPlayer[] | undefined) {
  return (contractRoster ?? []).some(
    (player) =>
      player.status === "active" &&
      typeof player.overall === "number" &&
      Number.isFinite(player.overall) &&
      player.overall > 0,
  );
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

function getMatchResultWeekKey(result: OnlineMatchResult) {
  return getOnlineLeagueWeekKey(result.season, result.week);
}

function isValidCompletedWeek(value: OnlineCompletedWeek) {
  return (
    value.status === "completed" &&
    Number.isInteger(value.season) &&
    value.season >= 1 &&
    Number.isInteger(value.week) &&
    value.week >= 1 &&
    value.week <= MAX_REGULAR_SEASON_WEEK &&
    value.weekKey === getOnlineLeagueWeekKey(value.season, value.week)
  );
}

function getCanonicalCompletedWeeks(league: OnlineLeague) {
  return (league.completedWeeks ?? [])
    .filter(isValidCompletedWeek)
    .slice()
    .sort((left, right) => {
      if (right.season !== left.season) {
        return right.season - left.season;
      }

      if (right.week !== left.week) {
        return right.week - left.week;
      }

      return right.completedAt.localeCompare(left.completedAt);
    });
}

function getLegacyCompletionWeekKeys(
  league: OnlineLeague,
  projectedWeeks: OnlineLeagueWeekProjection[] = [],
) {
  const legacyKeys = new Set<string>();

  if (league.lastSimulatedWeekKey) {
    legacyKeys.add(league.lastSimulatedWeekKey);
  }

  for (const result of league.matchResults ?? []) {
    legacyKeys.add(getMatchResultWeekKey(result));
  }

  for (const week of projectedWeeks) {
    if (week.status === "completed") {
      legacyKeys.add(getOnlineLeagueWeekKey(week.season, week.week));
    }
  }

  return [...legacyKeys];
}

export function isOnlineLeagueWeekCanonicallyCompleted(
  league: OnlineLeague,
  season: number,
  week: number,
) {
  const weekKey = getOnlineLeagueWeekKey(season, week);

  return getCanonicalCompletedWeeks(league).some(
    (completedWeek) => completedWeek.weekKey === weekKey,
  );
}

// Legacy migration guard only: canonical completion is completedWeeks. This helper also
// detects old projection fields so simulation can stop and surface a conflict instead of
// silently producing a second result.
export function hasOnlineLeagueWeekCompletionSignal(
  league: OnlineLeague,
  season: number,
  week: number,
) {
  const weekKey = getOnlineLeagueWeekKey(season, week);

  return (
    isOnlineLeagueWeekCanonicallyCompleted(league, season, week) ||
    league.lastSimulatedWeekKey === weekKey ||
    (league.matchResults ?? []).some((result) => getMatchResultWeekKey(result) === weekKey)
  );
}

function isLegacyCompletedWeekStatus(status: NonNullable<OnlineLeague["weekStatus"]>) {
  return status === "completed" || status === "post_game";
}

export function getOnlineLeagueWeekProgressState(
  league: OnlineLeague,
  options: { projectedWeeks?: OnlineLeagueWeekProjection[] } = {},
): OnlineLeagueWeekProgressState {
  const currentSeason = normalizePositiveInteger(league.currentSeason, 1);
  const currentWeek = normalizePositiveInteger(
    (league as { currentWeek?: unknown }).currentWeek,
    1,
  );
  const currentWeekKey = getOnlineLeagueWeekKey(currentSeason, currentWeek);
  const canonicalCompletedWeeks = getCanonicalCompletedWeeks(league);
  const canonicalCompletedWeekKeys = canonicalCompletedWeeks.map((week) => week.weekKey);
  const canonicalCompletedWeekKeySet = new Set(canonicalCompletedWeekKeys);
  const projectedWeeks = options.projectedWeeks ?? [];
  const legacyCompletionWeekKeys = getLegacyCompletionWeekKeys(league, projectedWeeks).filter(
    (weekKey) => !canonicalCompletedWeekKeySet.has(weekKey),
  );
  const matchResults = league.matchResults ?? [];
  const resultIds = new Set(matchResults.map((result) => result.matchId));
  const conflicts: OnlineLeagueWeekStateConflict[] = [];

  for (const legacyWeekKey of legacyCompletionWeekKeys) {
    addWeekConflict(
      conflicts,
      "legacy-completion-without-completed-week",
      `${legacyWeekKey} hat Completion-Signale ohne kanonischen completedWeeks-Eintrag.`,
    );
  }

  for (const week of projectedWeeks) {
    const weekKey = getOnlineLeagueWeekKey(week.season, week.week);

    if (week.status === "completed" && !canonicalCompletedWeekKeySet.has(weekKey)) {
      addWeekConflict(
        conflicts,
        "week-doc-completed-without-completed-week",
        `weeks/${weekKey} markiert die Woche als abgeschlossen, aber completedWeeks enthält keinen kanonischen Eintrag.`,
      );
    }
  }

  for (const duplicateWeekKey of getDuplicateValues(canonicalCompletedWeekKeys)) {
    addWeekConflict(
      conflicts,
      "duplicate-completed-week",
      `${duplicateWeekKey} ist mehrfach in completedWeeks gespeichert.`,
    );
  }

  for (const duplicateResultId of getDuplicateValues(matchResults.map((result) => result.matchId))) {
    addWeekConflict(
      conflicts,
      "duplicate-match-result",
      `MatchResult ${duplicateResultId} ist mehrfach gespeichert.`,
    );
  }

  for (const completedWeek of canonicalCompletedWeeks) {
    const missingResultIds = completedWeek.resultMatchIds.filter(
      (resultId) => !resultIds.has(resultId),
    );

    if (missingResultIds.length > 0) {
      addWeekConflict(
        conflicts,
        "completed-week-result-missing",
        `${completedWeek.weekKey} verweist auf fehlende Results: ${missingResultIds.join(", ")}.`,
      );
    }
  }

  const latestCompletedWeek = canonicalCompletedWeeks[0];
  const latestCompletedWeekKey = latestCompletedWeek?.weekKey;

  if (
    league.lastSimulatedWeekKey &&
    latestCompletedWeekKey &&
    league.lastSimulatedWeekKey !== latestCompletedWeekKey
  ) {
    addWeekConflict(
      conflicts,
      "last-simulated-week-mismatch",
      `lastSimulatedWeekKey=${league.lastSimulatedWeekKey} widerspricht latest completedWeek=${latestCompletedWeekKey}.`,
    );
  }

  const currentWeekCompleted = canonicalCompletedWeekKeySet.has(currentWeekKey);
  const latestCompletionAdvancedCursor =
    latestCompletedWeek?.nextSeason === currentSeason &&
    latestCompletedWeek?.nextWeek === currentWeek;
  const readyState = getOnlineLeagueWeekReadyState(league);
  const normalizedWeekStatus = normalizeWeekStatus(league.weekStatus);
  const lastScheduledWeek = getLastScheduledWeek(league);
  const seasonComplete = isSeasonCompleteBySchedule({
    currentWeek,
    latestCompletionAdvancedCursor,
    lastScheduledWeek,
  });
  const lifecycle = normalizeOnlineLeagueWeekProgressLifecycle({
    currentWeekCompleted,
    latestCompletionAdvancedCursor,
    normalizedWeekStatus,
    readyState,
  });

  if (isLegacyCompletedWeekStatus(normalizedWeekStatus) && !currentWeekCompleted) {
    addWeekConflict(
      conflicts,
      "week-status-completed-without-completed-week",
      `weekStatus=${normalizedWeekStatus} markiert ${currentWeekKey} als abgeschlossen, aber completedWeeks enthält keinen kanonischen Eintrag.`,
    );
  }

  const uniqueConflicts = dedupeWeekConflicts(conflicts);

  return {
    canonicalCompletedWeekKeys,
    conflictCodes: [...new Set(uniqueConflicts.map((conflict) => conflict.code))],
    conflictReasons: uniqueConflicts.map((conflict) => conflict.message),
    conflicts: uniqueConflicts,
    currentSeason,
    currentWeek,
    currentWeekKey,
    hasConflicts: uniqueConflicts.length > 0,
    latestCompletedWeek,
    latestCompletedWeekKey,
    lastScheduledWeek,
    legacyCompletionWeekKeys,
    phase: seasonComplete ? "season_complete" : lifecycle.phase,
    seasonComplete,
  };
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

function getCurrentWeekScheduleMatches(league: OnlineLeague, currentWeek: number) {
  return (league.schedule ?? []).filter((match) => match.week === currentWeek);
}

function getScheduleValidationReasons(
  league: OnlineLeague,
  scheduleMatches: OnlineLeagueScheduleMatch[],
  weekProgress?: OnlineLeagueWeekProgressState,
) {
  if (weekProgress?.seasonComplete) {
    return [
      `Die Saison ist abgeschlossen; Woche ${weekProgress.currentWeek} liegt nach der letzten geplanten Woche ${weekProgress.lastScheduledWeek}.`,
    ];
  }

  if (scheduleMatches.length === 0) {
    return ["Für die aktuelle Woche ist kein gültiger Schedule vorhanden."];
  }

  const reasons: string[] = [];
  const scheduledTeamIds = new Set<string>();
  const activeTeamIds = new Set(
    league.users
      .filter(isOnlineLeagueUserActiveWeekParticipant)
      .map((user) => user.teamId)
      .filter(Boolean),
  );

  for (const scheduleMatch of scheduleMatches) {
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
      reasons.push("Mindestens ein Matchup der aktuellen Woche ist ungültig.");
      continue;
    }

    if (scheduledTeamIds.has(homeTeamId) || scheduledTeamIds.has(awayTeamId)) {
      reasons.push("Ein Team ist mehrfach in der aktuellen Woche eingeplant.");
    }

    scheduledTeamIds.add(homeTeamId);
    scheduledTeamIds.add(awayTeamId);
  }

  const missingScheduledTeams = [...activeTeamIds].filter(
    (teamId) => !scheduledTeamIds.has(teamId),
  );

  if (missingScheduledTeams.length > 0) {
    reasons.push("Mindestens ein aktives Team hat kein Matchup in der aktuellen Woche.");
  }

  return [...new Set(reasons)];
}

export function normalizeOnlineLeagueWeekSimulationState(
  league: OnlineLeague,
): OnlineLeagueWeekSimulationState {
  const rawCurrentWeek = (league as { currentWeek?: unknown }).currentWeek;
  const currentWeek = normalizePositiveInteger(
    rawCurrentWeek,
    1,
  );
  const currentSeason = normalizePositiveInteger(league.currentSeason, 1);
  const scheduleMatches = getCurrentWeekScheduleMatches(league, currentWeek);
  const games = getCurrentWeekGames(league);
  const weekProgress = getOnlineLeagueWeekProgressState(league);
  const readyState = getOnlineLeagueWeekReadyState({
    ...league,
    currentWeek,
    currentSeason,
  });
  const lifecycle = normalizeOnlineLeagueWeekSimulationLifecycle({
    draftStatus: league.fantasyDraft?.status,
    leagueStatus: league.status,
    readyState,
    weekProgress,
  });
  const reasons: string[] = [];

  if (isDefinedInvalidWeek(rawCurrentWeek)) {
    reasons.push("Aktuelle Woche ist ungültig.");
  }

  reasons.push(...lifecycle.reasons);

  const missingRosterTeams = league.users
    .filter(isOnlineLeagueUserActiveWeekParticipant)
    .filter((user) => !hasPlayableRoster(user.contractRoster))
    .map((user) => user.teamDisplayName ?? user.teamName ?? user.teamId);

  for (const teamName of missingRosterTeams) {
    reasons.push(`${teamName} hat kein spielbares Roster.`);
  }

  reasons.push(...getScheduleValidationReasons(league, scheduleMatches, weekProgress));

  return {
    canSimulate: lifecycle.canSimulate && reasons.length === 0,
    completion: weekProgress,
    currentSeason,
    currentWeek,
    games,
    hasValidSchedule:
      scheduleMatches.length > 0 &&
      getScheduleValidationReasons(league, scheduleMatches, weekProgress).length === 0,
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
  if (isDefinedInvalidWeek(week)) {
    return false;
  }

  const normalizedWeek = normalizePositiveInteger(week, 1);
  const scheduleMatches = getCurrentWeekScheduleMatches(league, normalizedWeek);

  return (
    scheduleMatches.length > 0 &&
    getScheduleValidationReasons(league, scheduleMatches).length === 0
  );
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

  for (const user of league.users.filter(isOnlineLeagueUserActiveWeekParticipant)) {
    if (user.teamId && !records.has(user.teamId)) {
      records.set(user.teamId, {
        gamesPlayed: 0,
        losses: 0,
        pointDifferential: 0,
        pointsAgainst: 0,
        pointsFor: 0,
        teamId: user.teamId,
        ties: 0,
        wins: 0,
      });
    }
  }

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
      const normalizedRecord: OnlineLeagueTeamRecord = {
        ...record,
        pointDifferential: record.pointsFor - record.pointsAgainst,
      };

      if (streak) {
        normalizedRecord.streak = `${streak.type}${streak.count}`;
      }

      if (updatedAt) {
        normalizedRecord.updatedAt = updatedAt;
      }

      return normalizedRecord;
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
