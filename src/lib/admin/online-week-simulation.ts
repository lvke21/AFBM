import { simulateOnlineGame } from "@/lib/online/online-game-simulation";
import type {
  OnlineCompletedWeek,
  OnlineLeague,
  OnlineMatchResult,
} from "@/lib/online/online-league-types";
import {
  buildOnlineLeagueTeamRecords,
  type OnlineLeagueTeamRecord,
} from "@/lib/online/online-league-week-simulation";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreOnlineDraftStateDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
} from "@/lib/online/types";

export type OnlineLeagueWeekSimulationErrorCode =
  | "league_not_found"
  | "league_not_active"
  | "draft_not_completed"
  | "teams_not_ready"
  | "simulation_in_progress"
  | "week_already_simulated"
  | "schedule_missing"
  | "team_missing"
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
  status?: OnlineLeagueSimulationLockStatus | "completed";
};

export type PreparedOnlineLeagueWeekSimulation = OnlineLeagueWeekSimulationSummary & {
  completedWeek: OnlineCompletedWeek;
  existingMatchResults: OnlineMatchResult[];
  nextCompletedWeeks: OnlineCompletedWeek[];
};

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

export function assertCanStartOnlineLeagueWeekSimulation(lock: unknown) {
  const lockStatus = getOnlineLeagueSimulationLockStatus(lock);

  if (lockStatus === "simulating") {
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

export type PrepareOnlineLeagueWeekSimulationInput = {
  actorUserId: string;
  draftState?: FirestoreOnlineDraftStateDoc | null;
  expectedSeason?: number;
  expectedWeek?: number;
  league?: FirestoreOnlineLeagueDoc | null;
  memberships: FirestoreOnlineMembershipDoc[];
  now: string;
  teams: FirestoreOnlineTeamDoc[];
};

function getLegacyFantasyDraftStatus(
  league: FirestoreOnlineLeagueDoc,
): "not_started" | "active" | "completed" | null {
  const fantasyDraft = league.settings.fantasyDraft;

  if (typeof fantasyDraft !== "object" || fantasyDraft === null || !("status" in fantasyDraft)) {
    return null;
  }

  const status = fantasyDraft.status;

  return status === "not_started" || status === "active" || status === "completed"
    ? status
    : null;
}

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
  scheduledValue: string,
) {
  return teams.find(
    (team) =>
      team.id === scheduledValue ||
      team.displayName === scheduledValue ||
      team.teamName === scheduledValue,
  );
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

  if (league.weekStatus === "simulating") {
    throw new OnlineLeagueWeekSimulationError(
      "simulation_in_progress",
      "Diese Woche wird bereits simuliert.",
    );
  }

  const draftStatus = input.draftState?.status ?? getLegacyFantasyDraftStatus(league);

  if (draftStatus && draftStatus !== "completed") {
    throw new OnlineLeagueWeekSimulationError(
      "draft_not_completed",
      "Fantasy Draft muss vor der Week-Simulation abgeschlossen sein.",
    );
  }

  const simulatedSeason = league.currentSeason;
  const simulatedWeek = league.currentWeek;
  const weekKey = `s${simulatedSeason}-w${simulatedWeek}`;

  if (
    (input.expectedSeason !== undefined && input.expectedSeason !== simulatedSeason) ||
    (input.expectedWeek !== undefined && input.expectedWeek !== simulatedWeek) ||
    league.lastSimulatedWeekKey === weekKey ||
    (league.matchResults ?? []).some(
      (result) => result.season === simulatedSeason && result.week === simulatedWeek,
    )
  ) {
    throw new OnlineLeagueWeekSimulationError(
      "week_already_simulated",
      "Die Woche wurde bereits weitergeschaltet.",
    );
  }

  const notReadyMemberships = input.memberships.filter(
    (membership) => membership.status === "active" && membership.teamId && !membership.ready,
  );

  if (notReadyMemberships.length > 0) {
    throw new OnlineLeagueWeekSimulationError(
      "teams_not_ready",
      "Week-Simulation ist gesperrt, bis alle aktiven Teams ready sind.",
    );
  }

  const scheduledMatches = (league.schedule ?? []).filter(
    (match) => match.week === simulatedWeek,
  );

  if (scheduledMatches.length === 0) {
    throw new OnlineLeagueWeekSimulationError(
      "schedule_missing",
      "Für die aktuelle Woche ist kein gültiger Schedule vorhanden.",
    );
  }

  const onlineLeague = mapFirestoreSnapshotToOnlineLeague({
    league,
    memberships: input.memberships,
    teams: input.teams,
  });
  const results: OnlineMatchResult[] = [];

  for (const match of scheduledMatches) {
    const homeTeam = resolveScheduledTeam(input.teams, match.homeTeamName);
    const awayTeam = resolveScheduledTeam(input.teams, match.awayTeamName);

    if (!homeTeam || !awayTeam) {
      throw new OnlineLeagueWeekSimulationError(
        "team_missing",
        `Geplantes Spiel ${match.id} referenziert ein fehlendes Team.`,
      );
    }

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
