import type { OnlineLeague } from "@/lib/online/online-league-types";

/**
 * Configuration boundary for simple, non-destructive league actions.
 *
 * Keep actions in this list only when they share the same control flow:
 * one Admin API action, one pending state, one success message, and no confirm dialog.
 * Actions that simulate weeks, mutate rosters/drafts/memberships, need custom
 * validation, or can destroy/reassign data must stay in dedicated handlers.
 */
export type AdminSimpleLeagueActionConfig = {
  apiAction: string;
  className: string;
  id: "refresh-league" | "set-all-ready" | "start-league";
  isDisabled: (input: {
    league: OnlineLeague;
    pendingAction: string | null;
  }) => boolean;
  label: string;
  pendingLabel: string;
  successMessage: string;
};

export const ADMIN_LEAGUE_ACTIONS: AdminSimpleLeagueActionConfig[] = [
  {
    apiAction: "setAllReady",
    className:
      "rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55",
    id: "set-all-ready",
    isDisabled: ({ league, pendingAction }) => league.users.length === 0 || pendingAction !== null,
    label: "Alle Spieler auf Ready setzen",
    pendingLabel: "Setzt Ready...",
    successMessage: "Alle Spieler wurden auf Ready gesetzt.",
  },
  {
    apiAction: "startLeague",
    className:
      "rounded-lg border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-55",
    id: "start-league",
    isDisabled: ({ league, pendingAction }) => league.status === "active" || pendingAction !== null,
    label: "Liga starten",
    pendingLabel: "Startet...",
    successMessage: "Liga wurde gestartet.",
  },
  {
    apiAction: "getLeague",
    className:
      "rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55",
    id: "refresh-league",
    isDisabled: ({ pendingAction }) => pendingAction !== null,
    label: "Daten neu laden",
    pendingLabel: "Lädt...",
    successMessage: "Liga wurde aktualisiert.",
  },
];
