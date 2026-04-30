import type { OnlineLeague } from "@/lib/online/online-league-service";

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
      status: "missing-league";
      message: string;
      helper: string;
    };

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

  if (!league) {
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
