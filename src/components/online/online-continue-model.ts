import type { OnlineLeague } from "@/lib/online/online-league-types";

export type OnlineContinueState =
  | {
      status: "ready";
      href: string;
    }
  | {
      status: "missing-last-league";
      message: string;
      helper: string;
    }
  | {
      status: "invalid-last-league";
      message: string;
      helper: string;
    }
  | {
      status: "missing-league";
      message: string;
      helper: string;
    };

export function isSafeOnlineLeagueId(leagueId: string | null): leagueId is string {
  return Boolean(leagueId && /^[A-Za-z0-9_-]{3,80}$/.test(leagueId));
}

export function buildOnlineContinueState(
  lastLeagueId: string | null,
  league: OnlineLeague | null,
): OnlineContinueState {
  if (!lastLeagueId) {
    return {
      status: "missing-last-league",
      message: "Du bist noch keiner Online-Liga beigetreten.",
      helper: "Suche zuerst nach einer Liga.",
    };
  }

  if (!isSafeOnlineLeagueId(lastLeagueId)) {
    return {
      status: "invalid-last-league",
      message: "Die gespeicherte Online-Liga ist ungültig.",
      helper: "Suche erneut nach einer Liga.",
    };
  }

  if (!league || league.id !== lastLeagueId) {
    return {
      status: "missing-league",
      message: "Die zuletzt gespielte Online-Liga konnte nicht gefunden werden.",
      helper: "Suche erneut nach einer Liga.",
    };
  }

  return {
    status: "ready",
    href: `/online/league/${league.id}`,
  };
}
