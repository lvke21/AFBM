import type { OnlineLeague } from "@/lib/online/online-league-types";

type AdminLeagueActionGroup =
  | "overview"
  | "simulation"
  | "repair"
  | "debug"
  | "dangerous-mutation";

/**
 * Configuration boundary for league-level actions that share a simple control flow:
 * one Admin API action, one pending state, one success message, and no custom dialog.
 * Destructive, member-specific, draft-reset, or one-off simulation actions stay in
 * dedicated handlers so their confirmations and payloads remain explicit.
 */
export type AdminLeagueActionConfig = {
  apiAction: string;
  className: string;
  description: string;
  group: AdminLeagueActionGroup;
  id: "refresh-league" | "set-all-ready" | "start-league";
  isDisabled: (input: {
    league: OnlineLeague;
    pendingAction: string | null;
  }) => boolean;
  label: string;
  mutates: boolean;
  pendingLabel: string;
  successMessage: string;
};

export const ADMIN_LEAGUE_ACTIONS: AdminLeagueActionConfig[] = [
  {
    apiAction: "setAllReady",
    className:
      "rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-left text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55",
    description:
      "Korrektur: setzt alle aktuellen Manager auf bereit und verändert den Wochenstatus.",
    group: "repair",
    id: "set-all-ready",
    isDisabled: ({ league, pendingAction }) => league.users.length === 0 || pendingAction !== null,
    label: "Alle Spieler auf Ready setzen",
    mutates: true,
    pendingLabel: "Setzt Ready...",
    successMessage: "Alle Spieler wurden auf Ready gesetzt.",
  },
  {
    apiAction: "startLeague",
    className:
      "rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-left text-sm font-semibold text-amber-50 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-55",
    description:
      "Startet die Liga aus dem Wartezustand und bereitet Draft und Wochenablauf für die Saison vor.",
    group: "simulation",
    id: "start-league",
    isDisabled: ({ league, pendingAction }) => league.status === "active" || pendingAction !== null,
    label: "Liga starten",
    mutates: true,
    pendingLabel: "Startet...",
    successMessage: "Liga wurde gestartet.",
  },
  {
    apiAction: "getLeague",
    className:
      "rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55",
    description:
      "Lädt die aktuelle Admin-Ansicht neu, ohne Liga-, Mitgliedschafts- oder Wochendaten zu verändern.",
    group: "overview",
    id: "refresh-league",
    isDisabled: ({ pendingAction }) => pendingAction !== null,
    label: "Daten neu laden",
    mutates: false,
    pendingLabel: "Lädt...",
    successMessage: "Liga wurde aktualisiert.",
  },
];

export function getAdminLeagueActionsByGroup(group: AdminLeagueActionGroup) {
  return ADMIN_LEAGUE_ACTIONS.filter((action) => action.group === group);
}
