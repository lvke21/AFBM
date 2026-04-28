import { liveEventDramaturgy } from "./live-event-dramaturgy";
import type { LiveSimulationState, LiveTimelineEntry } from "./live-simulation-model";

export type FinalScorePair = {
  away: number;
  home: number;
};

export function finalLeader(homeAbbreviation: string, awayAbbreviation: string, score: FinalScorePair) {
  if (score.home === score.away) {
    return "Unentschieden";
  }

  return score.home > score.away ? homeAbbreviation : awayAbbreviation;
}

export function finalKeyStatements(
  state: Pick<LiveSimulationState, "awayTeam" | "homeTeam">,
  visibleEntries: LiveTimelineEntry[],
  score: FinalScorePair,
) {
  const leader = finalLeader(state.homeTeam.abbreviation, state.awayTeam.abbreviation, score);
  const margin = Math.abs(score.home - score.away);
  const decisiveDrive =
    [...visibleEntries].reverse().find((entry) => entry.isImportant) ??
    visibleEntries.at(-1) ??
    null;
  const statements: string[] = [];

  statements.push(
    leader === "Unentschieden"
      ? "Kein Team konnte sich nach dem letzten Drive absetzen."
      : margin <= 7
        ? `${leader} bringt ein enges Spiel mit ${margin} Punkt(en) Vorsprung ueber die Ziellinie.`
        : `${leader} kontrolliert den Abschluss und gewinnt mit ${margin} Punkt(en) Abstand.`,
  );

  if (decisiveDrive) {
    const dramaturgy = liveEventDramaturgy(decisiveDrive);
    statements.push(`${dramaturgy.momentTitle}: ${decisiveDrive.offenseTeamAbbreviation} - ${decisiveDrive.resultLabel}.`);
  } else {
    statements.push("Der Score ist gespeichert; der Report ordnet die wichtigsten Signale ein.");
  }

  return statements.slice(0, 2);
}
