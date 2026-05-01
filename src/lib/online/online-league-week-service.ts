import type { OnlineLeague, OnlineLeagueUser } from "./online-league-types";

export type OnlineLeagueWeekReadyParticipant = {
  readyAt?: string;
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

function normalizeSeasonNumber(season: number | undefined) {
  if (typeof season !== "number" || !Number.isFinite(season)) {
    return 1;
  }

  return Math.max(Math.floor(season), 1);
}

export function isOnlineLeagueUserActiveWeekParticipant(user: OnlineLeagueUser) {
  return (
    user.teamStatus !== "vacant" &&
    user.adminRemoval?.status !== "admin_removed" &&
    user.jobSecurity?.status !== "fired" &&
    Boolean(user.teamId)
  );
}

function toReadyParticipant(user: OnlineLeagueUser): OnlineLeagueWeekReadyParticipant {
  return {
    readyAt: user.readyAt,
    readyForWeek: user.readyForWeek,
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
    .map(toReadyParticipant);
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
