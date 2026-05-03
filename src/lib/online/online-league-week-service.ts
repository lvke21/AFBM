import type { OnlineLeague, OnlineLeagueUser } from "./online-league-types";

export type OnlineLeagueWeekReadyParticipant = {
  readyAt?: string;
  readyBlockedReason?: string;
  readyForWeek: boolean;
  teamId: string;
  teamName: string;
  userId: string;
  username: string;
};

export type OnlineLeagueWeekReadyState = {
  activeParticipants: OnlineLeagueWeekReadyParticipant[];
  allReady: boolean;
  canSimulate: boolean;
  currentSeason: number;
  currentWeek: number;
  missingParticipants: OnlineLeagueWeekReadyParticipant[];
  readyParticipants: OnlineLeagueWeekReadyParticipant[];
  readyCount: number;
  requiredCount: number;
  weekKey: string;
};

export type OnlineLeagueReadyChangeResult =
  | {
      allowed: true;
      currentSeason: number;
      currentWeek: number;
      weekKey: string;
    }
  | {
      allowed: false;
      currentSeason: number;
      currentWeek: number;
      reason: string;
      weekKey: string;
    };

export function isOnlineLeagueCurrentWeekCanonicallyCompleted(
  league: Pick<OnlineLeague, "completedWeeks" | "currentSeason" | "currentWeek">,
) {
  const currentSeason = normalizeSeasonNumber(league.currentSeason);
  const currentWeek = normalizeWeekNumber(league.currentWeek);
  const weekKey = `s${currentSeason}-w${currentWeek}`;

  return (league.completedWeeks ?? []).some(
    (completedWeek) =>
      completedWeek.status === "completed" &&
      completedWeek.season === currentSeason &&
      completedWeek.week === currentWeek &&
      completedWeek.weekKey === weekKey,
  );
}

function normalizeSeasonNumber(season: number | undefined) {
  if (typeof season !== "number" || !Number.isFinite(season)) {
    return 1;
  }

  return Math.max(Math.floor(season), 1);
}

function normalizeWeekNumber(week: number | undefined) {
  if (typeof week !== "number" || !Number.isFinite(week)) {
    return 1;
  }

  return Math.max(1, Math.floor(week));
}

function getOnlineLeagueTeamReadinessBlockReason(
  _league: OnlineLeague,
  user: OnlineLeagueUser,
) {
  if (!user.teamId) {
    return "Kein Manager-Team verbunden.";
  }

  const roster = user.contractRoster;

  if (!Array.isArray(roster) || roster.length === 0) {
    return "Bereit gesperrt: Dein Team hat kein Roster.";
  }

  const activePlayers = roster.filter((player) => player.status === "active");

  if (activePlayers.length === 0) {
    return "Bereit gesperrt: Dein Roster hat keine aktiven Spieler.";
  }

  const playablePlayers = activePlayers.filter(
    (player) =>
      player.playerId.length > 0 &&
      player.position.length > 0 &&
      Number.isFinite(player.overall) &&
      player.overall > 0,
  );

  if (playablePlayers.length === 0) {
    return "Bereit gesperrt: Dein Roster ist nicht simulationsfähig.";
  }

  const depthChart = user.depthChart ?? [];

  if (depthChart.length === 0) {
    return null;
  }

  const activePlayerIds = new Set(activePlayers.map((player) => player.playerId));
  const activePositions = new Set(activePlayers.map((player) => player.position));
  const usedStarterIds = new Set<string>();

  for (const entry of depthChart) {
    if (
      !activePositions.has(entry.position) ||
      !activePlayerIds.has(entry.starterPlayerId) ||
      usedStarterIds.has(entry.starterPlayerId) ||
      entry.backupPlayerIds.some((playerId) => !activePlayerIds.has(playerId))
    ) {
      return "Bereit gesperrt: Depth Chart ist ungültig. Bitte prüfe Starter und Backups.";
    }

    usedStarterIds.add(entry.starterPlayerId);
  }

  return null;
}

export function getOnlineLeagueTeamReadinessState(
  league: OnlineLeague,
  user: OnlineLeagueUser | undefined,
) {
  if (!user) {
    return {
      ready: false as const,
      reason: "Kein Manager-Team verbunden.",
    };
  }

  const reason = getOnlineLeagueTeamReadinessBlockReason(league, user);

  return reason
    ? {
        ready: false as const,
        reason,
      }
    : {
        ready: true as const,
      };
}

export function getOnlineLeagueReadyChangeState(
  league: OnlineLeague,
  user: OnlineLeagueUser | undefined,
): OnlineLeagueReadyChangeResult {
  const currentSeason = normalizeSeasonNumber(league.currentSeason);
  const currentWeek = normalizeWeekNumber(league.currentWeek);
  const weekKey = `s${currentSeason}-w${currentWeek}`;

  if (!user) {
    return {
      allowed: false,
      currentSeason,
      currentWeek,
      reason: "Kein Manager-Team verbunden.",
      weekKey,
    };
  }

  if (!user.teamId) {
    return {
      allowed: false,
      currentSeason,
      currentWeek,
      reason: "Kein Manager-Team verbunden.",
      weekKey,
    };
  }

  if (!isOnlineLeagueUserActiveWeekParticipant(user)) {
    return {
      allowed: false,
      currentSeason,
      currentWeek,
      reason: "Dieser Manager ist für die aktuelle Woche nicht aktiv.",
      weekKey,
    };
  }

  if (league.fantasyDraft?.status === "active") {
    return {
      allowed: false,
      currentSeason,
      currentWeek,
      reason: "Bereit-Status ist während des Drafts gesperrt.",
      weekKey,
    };
  }

  if (league.weekStatus === "simulating") {
    return {
      allowed: false,
      currentSeason,
      currentWeek,
      reason: "Bereit-Status ist während der Simulation gesperrt.",
      weekKey,
    };
  }

  if (isOnlineLeagueCurrentWeekCanonicallyCompleted(league)) {
    return {
      allowed: false,
      currentSeason,
      currentWeek,
      reason: "Diese Woche ist bereits abgeschlossen.",
      weekKey,
    };
  }

  const teamReadiness = getOnlineLeagueTeamReadinessState(league, user);

  if (!teamReadiness.ready) {
    return {
      allowed: false,
      currentSeason,
      currentWeek,
      reason: teamReadiness.reason,
      weekKey,
    };
  }

  return {
    allowed: true,
    currentSeason,
    currentWeek,
    weekKey,
  };
}

export function isOnlineLeagueUserActiveWeekParticipant(user: OnlineLeagueUser) {
  return (
    user.teamStatus !== "vacant" &&
    user.adminRemoval?.status !== "admin_removed" &&
    user.jobSecurity?.status !== "fired" &&
    Boolean(user.teamId)
  );
}

function toReadyParticipant(
  league: OnlineLeague,
  user: OnlineLeagueUser,
): OnlineLeagueWeekReadyParticipant {
  const teamReadiness = getOnlineLeagueTeamReadinessState(league, user);

  return {
    readyAt: user.readyAt,
    readyBlockedReason: teamReadiness.ready ? undefined : teamReadiness.reason,
    readyForWeek: user.readyForWeek && teamReadiness.ready,
    teamId: user.teamId,
    teamName: user.teamDisplayName ?? user.teamName,
    userId: user.userId,
    username: user.username,
  };
}

export function getOnlineLeagueWeekReadyState(
  league: OnlineLeague,
): OnlineLeagueWeekReadyState {
  const currentSeason = normalizeSeasonNumber(league.currentSeason);
  const currentWeek = Math.max(1, Math.floor(league.currentWeek));
  const activeParticipants = league.users
    .filter(isOnlineLeagueUserActiveWeekParticipant)
    .map((user) => toReadyParticipant(league, user));
  const readyParticipants = activeParticipants.filter((participant) => participant.readyForWeek);
  const missingParticipants = activeParticipants.filter((participant) => !participant.readyForWeek);
  const allReady = activeParticipants.length > 0 && missingParticipants.length === 0;
  const draftReady = !league.fantasyDraft || league.fantasyDraft.status === "completed";

  return {
    activeParticipants,
    allReady,
    canSimulate:
      league.status === "active" &&
      draftReady &&
      allReady &&
      league.weekStatus !== "simulating",
    currentSeason,
    currentWeek,
    missingParticipants,
    readyParticipants,
    readyCount: readyParticipants.length,
    requiredCount: activeParticipants.length,
    weekKey: `s${currentSeason}-w${currentWeek}`,
  };
}
