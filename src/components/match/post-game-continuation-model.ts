import type { DashboardWeekState } from "@/components/dashboard/dashboard-model";

import type { MatchReport } from "./match-report-model";

export type PostGameContinuationAction = {
  kind: "advance-week" | "dashboard";
  label: string;
  href: string | null;
};

export type PostGameContinuationState = {
  title: string;
  progress: string;
  motivation: string;
  nextTask: string;
  action: PostGameContinuationAction | null;
  emptyMessage: string;
};

export function buildPostGameContinuationState(input: {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">;
  saveGameId: string;
  weekState: DashboardWeekState;
}): PostGameContinuationState {
  const emptyMessage = "Der Weiter-spielen-Impuls erscheint nach einem abgeschlossenen Spiel.";

  if (
    input.match.status !== "COMPLETED" ||
    input.match.homeTeam.score == null ||
    input.match.awayTeam.score == null
  ) {
    return {
      title: "Weiter zur naechsten Woche",
      progress: "Spiel noch nicht abgeschlossen",
      motivation: "Beende zuerst das Spiel, dann entsteht die naechste klare Aufgabe.",
      nextTask: "Spiel abschliessen",
      action: null,
      emptyMessage,
    };
  }

  const managerTeam = input.match.homeTeam.managerControlled
    ? input.match.homeTeam
    : input.match.awayTeam.managerControlled
      ? input.match.awayTeam
      : null;
  const opponent = managerTeam === input.match.homeTeam ? input.match.awayTeam : input.match.homeTeam;
  const managerScore = managerTeam?.score ?? input.match.homeTeam.score;
  const opponentScore = managerTeam ? opponent.score : input.match.awayTeam.score;
  const resultLabel =
    managerScore != null && opponentScore != null && managerScore > opponentScore
      ? "Sieg verarbeitet"
      : managerScore != null && opponentScore != null && managerScore < opponentScore
        ? "Niederlage ausgewertet"
        : "Ergebnis ausgewertet";

  if (input.weekState === "POST_GAME") {
    return {
      title: "Spiele noch eine Woche",
      progress: `${resultLabel} · Report gelesen · Week Loop 4/4`,
      motivation:
        "Die naechste Woche bringt neue Aufgaben, neue Matchups und sofort sichtbare Team-Entwicklung.",
      nextTask: "Naechste Woche laden und den neuen Fokus pruefen.",
      action: {
        kind: "advance-week",
        label: "Naechste Woche laden",
        href: null,
      },
      emptyMessage,
    };
  }

  return {
    title: "Naechste Aufgabe ist bereit",
    progress: `${resultLabel} · Week State ${input.weekState}`,
    motivation: "Der Loop ist nicht blockiert; auf dem Dashboard wartet die naechste beste Aktion.",
    nextTask: "Dashboard oeffnen und die neue Prioritaet starten.",
    action: {
      kind: "dashboard",
      label: "Naechste Aktion ansehen",
      href: `/app/savegames/${input.saveGameId}`,
    },
    emptyMessage,
  };
}
