import { simulateOnlineGame } from "@/lib/online/online-game-simulation";
import type {
  OnlineCompletedWeek,
  OnlineLeague,
  OnlineLeagueUser,
  OnlineMatchResult,
} from "@/lib/online/online-league-types";
import { validateOnlineDepthChartForRoster } from "@/lib/online/online-depth-chart-service";
import {
  buildOnlineLeagueTeamRecords,
  getOnlineLeagueWeekProgressState,
  type OnlineLeagueTeamRecord,
} from "@/lib/online/online-league-week-simulation";
import { isOnlineLeagueUserActiveWeekParticipant } from "@/lib/online/online-league-week-service";
import { normalizeOnlineLeagueCoreLifecycle } from "@/lib/online/online-league-lifecycle";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreOnlineDraftStateDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
  type FirestoreOnlineWeekDoc,
} from "@/lib/online/types";
import {
  createMembershipProjectionConflictMessage,
  getMembershipProjectionProblem,
} from "@/lib/online/repositories/firebase-online-league-mappers";

export type OnlineLeagueWeekSimulationErrorCode =
  | "league_not_found"
  | "league_not_active"
  | "draft_not_completed"
  | "teams_not_ready"
  | "simulation_in_progress"
  | "week_already_simulated"
  | "week_state_conflict"
  | "membership_projection_conflict"
  | "invalid_week"
  | "schedule_missing"
  | "team_missing"
  | "roster_missing"
  | "depth_chart_invalid"
  | "invalid_game"
  | "simulation_failed";

export class OnlineLeagueWeekSimulationError extends Error {
  constructor(
    readonly code: OnlineLeagueWeekSimulationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OnlineLeagueWeekSimulationError";
  }
}

export type OnlineLeagueWeekSimulationSummary = {
  gamesSimulated: number;
  leagueId: string;
  nextSeason: number;
  nextWeek: number;
  results: OnlineMatchResult[];
  simulatedSeason: number;
  simulatedWeek: number;
  standingsSummary: OnlineLeagueTeamRecord[];
  updatedAt: string;
  weekKey: string;
};

export type OnlineLeagueSimulationLockStatus =
  | "failed"
  | "idle"
  | "simulated"
  | "simulating";

export type OnlineLeagueSimulationLockDoc = {
  createdAt?: string;
  simulationAttemptId?: string;
  startedAt?: string;
  status?: OnlineLeagueSimulationLockStatus | "completed";
  updatedAt?: string;
};

export type PreparedOnlineLeagueWeekSimulation = OnlineLeagueWeekSimulationSummary & {
  completedWeek: OnlineCompletedWeek;
  existingMatchResults: OnlineMatchResult[];
  nextCompletedWeeks: OnlineCompletedWeek[];
};

export const ONLINE_LEAGUE_WEEK_SIMULATION_LOCK_TTL_MS = 15 * 60 * 1000;

function parseLockTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getSimulationLockLastUpdatedAt(lock: OnlineLeagueSimulationLockDoc) {
  return (
    parseLockTimestamp(lock.updatedAt) ??
    parseLockTimestamp(lock.startedAt) ??
    parseLockTimestamp(lock.createdAt)
  );
}

export function getOnlineLeagueSimulationLockStatus(
  value: unknown,
): OnlineLeagueSimulationLockStatus {
  if (!value || typeof value !== "object" || !("status" in value)) {
    return "idle";
  }

  const status = (value as OnlineLeagueSimulationLockDoc).status;

  if (status === "completed" || status === "simulated") {
    return "simulated";
  }

  if (status === "simulating" || status === "failed") {
    return status;
  }

  return "idle";
}

export function isOnlineLeagueWeekSimulationLockStale(
  lock: unknown,
  now: string,
  staleAfterMs = ONLINE_LEAGUE_WEEK_SIMULATION_LOCK_TTL_MS,
) {
  if (getOnlineLeagueSimulationLockStatus(lock) !== "simulating") {
    return false;
  }

  if (!lock || typeof lock !== "object") {
    return false;
  }

  const nowMs = parseLockTimestamp(now);
  const lockMs = getSimulationLockLastUpdatedAt(lock as OnlineLeagueSimulationLockDoc);

  if (nowMs === null || lockMs === null) {
    return false;
  }

  return nowMs - lockMs >= staleAfterMs;
}

export function assertCanStartOnlineLeagueWeekSimulation(lock: unknown, now?: string) {
  const lockStatus = getOnlineLeagueSimulationLockStatus(lock);

  if (lockStatus === "simulating") {
    if (now && isOnlineLeagueWeekSimulationLockStale(lock, now)) {
      return;
    }

    throw new OnlineLeagueWeekSimulationError(
      "simulation_in_progress",
      "Diese Woche wird bereits simuliert.",
    );
  }

  if (lockStatus === "simulated") {
    throw new OnlineLeagueWeekSimulationError(
      "week_already_simulated",
      "Die Woche wurde bereits weitergeschaltet.",
    );
  }
}

export function assertCanCompleteOnlineLeagueWeekSimulation(
  lock: unknown,
  simulationAttemptId: string,
) {
  const lockStatus = getOnlineLeagueSimulationLockStatus(lock);
  const lockAttemptId =
    lock && typeof lock === "object" && "simulationAttemptId" in lock
      ? (lock as OnlineLeagueSimulationLockDoc).simulationAttemptId
      : undefined;

  if (lockStatus === "simulated") {
    throw new OnlineLeagueWeekSimulationError(
      "week_already_simulated",
      "Die Woche wurde bereits weitergeschaltet.",
    );
  }

  if (lockStatus !== "simulating" || lockAttemptId !== simulationAttemptId) {
    throw new OnlineLeagueWeekSimulationError(
      "simulation_in_progress",
      "Eine andere Week-Simulation läuft bereits.",
    );
  }
}

export type PrepareOnlineLeagueWeekSimulationInput = {
  actorUserId: string;
  draftState?: FirestoreOnlineDraftStateDoc | null;
  expectedSeason?: number;
  expectedWeek?: number;
  league?: FirestoreOnlineLeagueDoc | null;
  memberships: FirestoreOnlineMembershipDoc[];
  now: string;
  teams: FirestoreOnlineTeamDoc[];
  weeks?: FirestoreOnlineWeekDoc[];
};

type ValidatedScheduledMatch = {
  awayTeam: FirestoreOnlineTeamDoc;
  homeTeam: FirestoreOnlineTeamDoc;
  match: NonNullable<FirestoreOnlineLeagueDoc["schedule"]>[number];
};

const MAX_REGULAR_SEASON_WEEK = 18;

function createCompletedOnlineWeek(input: {
  completedAt: string;
  nextSeason: number;
  nextWeek: number;
  resultMatchIds: string[];
  season: number;
  simulatedByUserId: string;
  week: number;
}): OnlineCompletedWeek {
  return {
    completedAt: input.completedAt,
    nextSeason: input.nextSeason,
    nextWeek: input.nextWeek,
    resultMatchIds: input.resultMatchIds,
    season: input.season,
    simulatedByUserId: input.simulatedByUserId,
    status: "completed",
    week: input.week,
    weekKey: `s${input.season}-w${input.week}`,
  };
}

function resolveScheduledTeam(
  teams: FirestoreOnlineTeamDoc[],
  scheduledValue: string | undefined,
  explicitTeamId?: string,
) {
  if (explicitTeamId) {
    const explicitTeam = teams.find((team) => team.id === explicitTeamId);

    if (explicitTeam) {
      return explicitTeam;
    }
  }

  if (!scheduledValue) {
    return undefined;
  }

  return teams.find(
    (team) =>
      team.id === scheduledValue ||
      team.displayName === scheduledValue ||
      team.teamName === scheduledValue,
  );
}

function assertValidSimulationWeek(week: number) {
  if (!Number.isInteger(week) || week < 1 || week > MAX_REGULAR_SEASON_WEEK) {
    throw new OnlineLeagueWeekSimulationError(
      "invalid_week",
      "Aktuelle Woche ist ungültig. Bitte repariere den League-State vor der Simulation.",
    );
  }
}

function hasPlayableFirestoreRoster(team: FirestoreOnlineTeamDoc) {
  return (team.contractRoster ?? []).some(
    (player) =>
      player.status === "active" &&
      typeof player.overall === "number" &&
      Number.isFinite(player.overall) &&
      player.overall > 0,
  );
}

function assertActiveTeamsHavePlayableRosters(onlineLeague: OnlineLeague) {
  const missingRosterUser = onlineLeague.users
    .filter(isOnlineLeagueUserActiveWeekParticipant)
    .find(
      (user) =>
        !(user.contractRoster ?? []).some(
          (player) =>
            player.status === "active" &&
            typeof player.overall === "number" &&
            Number.isFinite(player.overall) &&
            player.overall > 0,
        ),
    );

  if (missingRosterUser) {
    throw new OnlineLeagueWeekSimulationError(
      "roster_missing",
      `${missingRosterUser.teamDisplayName ?? missingRosterUser.teamName ?? missingRosterUser.teamId} hat kein spielbares Roster.`,
    );
  }
}

function getOnlineLeagueUserSimulationName(user: OnlineLeagueUser) {
  return user.teamDisplayName ?? user.teamName ?? user.teamId;
}

function assertActiveTeamsHaveValidDepthCharts(onlineLeague: OnlineLeague) {
  const invalidDepthChartUser = onlineLeague.users
    .filter(isOnlineLeagueUserActiveWeekParticipant)
    .map((user) => {
      const depthChart = user.depthChart ?? [];

      if (depthChart.length === 0) {
        return {
          message: `${getOnlineLeagueUserSimulationName(user)} hat keine Depth Chart für die Simulation.`,
          user,
        };
      }

      if (!validateOnlineDepthChartForRoster(user.contractRoster ?? [], depthChart)) {
        return {
          message: `${getOnlineLeagueUserSimulationName(user)} hat eine ungültige Depth Chart. Bitte prüfe Starter und Backups.`,
          user,
        };
      }

      return null;
    })
    .find((entry) => entry !== null);

  if (invalidDepthChartUser) {
    throw new OnlineLeagueWeekSimulationError(
      "depth_chart_invalid",
      invalidDepthChartUser.message,
    );
  }
}

function assertActiveTeamsExist(
  onlineLeague: OnlineLeague,
  teams: FirestoreOnlineTeamDoc[],
) {
  const teamIds = new Set(teams.map((team) => team.id));
  const missingTeamUser = onlineLeague.users
    .filter(isOnlineLeagueUserActiveWeekParticipant)
    .find((user) => !teamIds.has(user.teamId));

  if (missingTeamUser) {
    throw new OnlineLeagueWeekSimulationError(
      "team_missing",
      `${missingTeamUser.teamDisplayName ?? missingTeamUser.teamName ?? missingTeamUser.teamId} ist kein gültiges Team der Liga.`,
    );
  }
}

function getScheduledMatchesForWeek(
  league: FirestoreOnlineLeagueDoc,
  week: number,
) {
  return (league.schedule ?? []).filter((match) => match.week === week);
}

function validateScheduledMatches(input: {
  matches: NonNullable<FirestoreOnlineLeagueDoc["schedule"]>;
  onlineLeague: OnlineLeague;
  teams: FirestoreOnlineTeamDoc[];
}) {
  if (input.matches.length === 0) {
    throw new OnlineLeagueWeekSimulationError(
      "schedule_missing",
      "Für die aktuelle Woche ist kein gültiger Schedule vorhanden.",
    );
  }

  const scheduledMatchIds = new Set<string>();
  const scheduledTeamIds = new Set<string>();
  const activeTeamIds = new Set(
    input.onlineLeague.users
      .filter(isOnlineLeagueUserActiveWeekParticipant)
      .map((user) => user.teamId)
      .filter(Boolean),
  );
  const validatedMatches: ValidatedScheduledMatch[] = [];

  for (const match of input.matches) {
    const homeTeam = resolveScheduledTeam(
      input.teams,
      match.homeTeamName,
      (match as { homeTeamId?: string }).homeTeamId,
    );
    const awayTeam = resolveScheduledTeam(
      input.teams,
      match.awayTeamName,
      (match as { awayTeamId?: string }).awayTeamId,
    );

    if (!match.id || !homeTeam || !awayTeam) {
      throw new OnlineLeagueWeekSimulationError(
        !homeTeam || !awayTeam ? "team_missing" : "invalid_game",
        `Geplantes Spiel ${match.id || "ohne ID"} referenziert ein fehlendes Team.`,
      );
    }

    if (scheduledMatchIds.has(match.id)) {
      throw new OnlineLeagueWeekSimulationError(
        "invalid_game",
        `Geplantes Spiel ${match.id} ist im Schedule mehrfach vorhanden.`,
      );
    }

    if (homeTeam.id === awayTeam.id) {
      throw new OnlineLeagueWeekSimulationError(
        "invalid_game",
        `Geplantes Spiel ${match.id} enthält ein Self-Matchup.`,
      );
    }

    if (!activeTeamIds.has(homeTeam.id) || !activeTeamIds.has(awayTeam.id)) {
      const inactiveTeam = !activeTeamIds.has(homeTeam.id) ? homeTeam : awayTeam;

      throw new OnlineLeagueWeekSimulationError(
        "invalid_game",
        `${inactiveTeam.displayName} ist nicht als aktives Team für die Simulation gesetzt.`,
      );
    }

    if (scheduledTeamIds.has(homeTeam.id) || scheduledTeamIds.has(awayTeam.id)) {
      throw new OnlineLeagueWeekSimulationError(
        "invalid_game",
        `Ein Team ist in Woche ${match.week} mehrfach eingeplant.`,
      );
    }

    if (!hasPlayableFirestoreRoster(homeTeam) || !hasPlayableFirestoreRoster(awayTeam)) {
      const missingRosterTeam = !hasPlayableFirestoreRoster(homeTeam) ? homeTeam : awayTeam;

      throw new OnlineLeagueWeekSimulationError(
        "roster_missing",
        `${missingRosterTeam.displayName} hat kein spielbares Roster.`,
      );
    }

    scheduledMatchIds.add(match.id);
    scheduledTeamIds.add(homeTeam.id);
    scheduledTeamIds.add(awayTeam.id);
    validatedMatches.push({ awayTeam, homeTeam, match });
  }

  const missingScheduledTeam = [...activeTeamIds].find(
    (teamId) => !scheduledTeamIds.has(teamId),
  );

  if (missingScheduledTeam) {
    const teamName =
      input.teams.find((team) => team.id === missingScheduledTeam)?.displayName ??
      missingScheduledTeam;

    throw new OnlineLeagueWeekSimulationError(
      "invalid_game",
      `${teamName} hat kein Matchup in der aktuellen Woche.`,
    );
  }

  return validatedMatches;
}

function getNextWeekStep(league: FirestoreOnlineLeagueDoc) {
  const rawNextWeek = league.currentWeek + 1;

  return {
    nextSeason: rawNextWeek > 18 ? league.currentSeason + 1 : league.currentSeason,
    nextWeek: rawNextWeek > 18 ? 1 : rawNextWeek,
  };
}

function getStandingsLeague(
  league: OnlineLeague,
  matchResults: OnlineMatchResult[],
): OnlineLeague {
  return {
    ...league,
    matchResults,
  };
}

export function prepareOnlineLeagueWeekSimulation(
  input: PrepareOnlineLeagueWeekSimulationInput,
): PreparedOnlineLeagueWeekSimulation {
  const league = input.league;

  if (!league) {
    throw new OnlineLeagueWeekSimulationError(
      "league_not_found",
      "Liga konnte nicht gefunden werden.",
    );
  }

  if (league.status !== "active") {
    throw new OnlineLeagueWeekSimulationError(
      "league_not_active",
      "Nur aktive Ligen können simuliert werden.",
    );
  }

  assertValidSimulationWeek(league.currentWeek);

  const simulatedSeason = league.currentSeason;
  const simulatedWeek = league.currentWeek;
  const weekKey = `s${simulatedSeason}-w${simulatedWeek}`;
  const projectionConflict = input.memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => ({
      membership,
      reason: getMembershipProjectionProblem(membership, input.teams, null, league.id),
    }))
    .find((entry) => entry.reason !== null);

  if (projectionConflict?.reason) {
    console.error("[online-week-simulation] blocked by membership projection conflict", {
      leagueId: league.id,
      membershipTeamId: projectionConflict.membership.teamId,
      reason: projectionConflict.reason,
      userId: projectionConflict.membership.userId,
      weekKey,
    });
    throw new OnlineLeagueWeekSimulationError(
      "membership_projection_conflict",
      createMembershipProjectionConflictMessage(
        league.id,
        projectionConflict.membership.userId,
        projectionConflict.reason,
      ),
    );
  }

  const onlineLeague = mapFirestoreSnapshotToOnlineLeague({
    draftState: input.draftState ?? undefined,
    league,
    memberships: input.memberships,
    teams: input.teams,
  });

  if (
    (input.expectedSeason !== undefined && input.expectedSeason !== simulatedSeason) ||
    (input.expectedWeek !== undefined && input.expectedWeek !== simulatedWeek)
  ) {
    throw new OnlineLeagueWeekSimulationError(
      "week_already_simulated",
      "Die Woche wurde bereits weitergeschaltet.",
    );
  }

  const weekProgress = getOnlineLeagueWeekProgressState(onlineLeague, {
    projectedWeeks: input.weeks,
  });

  if (weekProgress.hasConflicts) {
    console.error("[online-week-simulation] blocked by contradictory week state", {
      conflictCodes: weekProgress.conflictCodes,
      conflictReasons: weekProgress.conflictReasons,
      leagueId: league.id,
      weekKey,
    });
    throw new OnlineLeagueWeekSimulationError(
      "week_state_conflict",
      `Week-State ist widersprüchlich: ${weekProgress.conflictReasons.join(" ")}`,
    );
  }

  assertActiveTeamsExist(onlineLeague, input.teams);
  assertActiveTeamsHavePlayableRosters(onlineLeague);
  assertActiveTeamsHaveValidDepthCharts(onlineLeague);

  const lifecycle = normalizeOnlineLeagueCoreLifecycle({
    league: onlineLeague,
    projectionConflicts: weekProgress.conflictReasons,
    requiresDraft: league.settings.onlineBackbone === true,
  });

  if (lifecycle.phase === "simulating") {
    throw new OnlineLeagueWeekSimulationError(
      "simulation_in_progress",
      "Diese Woche wird bereits simuliert.",
    );
  }

  if (lifecycle.phase === "draftActive" || lifecycle.phase === "draftPending") {
    throw new OnlineLeagueWeekSimulationError(
      "draft_not_completed",
      lifecycle.reasons[0] ?? "Fantasy Draft muss vor der Week-Simulation abgeschlossen sein.",
    );
  }

  if (lifecycle.phase === "weekCompleted" || lifecycle.phase === "resultsAvailable") {
    throw new OnlineLeagueWeekSimulationError(
      "week_already_simulated",
      "Die Woche wurde bereits weitergeschaltet.",
    );
  }

  if (!lifecycle.canSimulate) {
    throw new OnlineLeagueWeekSimulationError(
      "teams_not_ready",
      lifecycle.reasons[0] ??
        "Week-Simulation ist gesperrt, bis alle aktiven Teams ready sind.",
    );
  }

  const scheduledMatches = validateScheduledMatches({
    matches: getScheduledMatchesForWeek(league, simulatedWeek),
    onlineLeague,
    teams: input.teams,
  });

  const results: OnlineMatchResult[] = [];

  for (const { awayTeam, homeTeam, match } of scheduledMatches) {
    const simulated = simulateOnlineGame(
      {
        awayTeamId: awayTeam.id,
        awayTeamName: awayTeam.displayName,
        homeTeamId: homeTeam.id,
        homeTeamName: homeTeam.displayName,
        id: match.id,
        season: simulatedSeason,
        week: simulatedWeek,
      },
      onlineLeague,
      {
        simulatedAt: input.now,
        simulatedByUserId: input.actorUserId,
      },
    );

    if (!simulated.ok) {
      throw new OnlineLeagueWeekSimulationError(
        simulated.error.code === "invalid_game" ? "invalid_game" : "simulation_failed",
        simulated.error.message,
      );
    }

    results.push(simulated.result);
  }

  if (results.length !== scheduledMatches.length) {
    throw new OnlineLeagueWeekSimulationError(
      "simulation_failed",
      "Nicht alle Spiele der Woche konnten simuliert werden.",
    );
  }

  const { nextSeason, nextWeek } = getNextWeekStep(league);
  const completedWeek = createCompletedOnlineWeek({
    completedAt: input.now,
    nextSeason,
    nextWeek,
    resultMatchIds: results.map((result) => result.matchId),
    season: simulatedSeason,
    simulatedByUserId: input.actorUserId,
    week: simulatedWeek,
  });
  const existingMatchResults = league.matchResults ?? [];
  const allMatchResults = [...results, ...existingMatchResults];
  const standingsSummary = buildOnlineLeagueTeamRecords(
    getStandingsLeague(onlineLeague, allMatchResults),
    input.now,
  );
  const nextCompletedWeeks = [
    completedWeek,
    ...(league.completedWeeks ?? []).filter((week) => week.weekKey !== completedWeek.weekKey),
  ];

  return {
    completedWeek,
    existingMatchResults,
    gamesSimulated: results.length,
    leagueId: league.id,
    nextCompletedWeeks,
    nextSeason,
    nextWeek,
    results,
    simulatedSeason,
    simulatedWeek,
    standingsSummary,
    updatedAt: input.now,
    weekKey,
  };
}
