import type { PlayerValueLabel } from "@/components/player/player-value-model";

import type { ActionDecisionEffect, ActionValueFeedback } from "./action-feedback";

const ACTIVE_DEPTH_STATUSES = new Set(["STARTER", "ROTATION", "BACKUP"]);

export type DepthChartLineupFeedbackInput = {
  currentSlot: number | null;
  targetSlot: number | null;
  playerName?: string | null;
  playerOverall?: number | null;
  positionCode: string;
  starterOverallAfter?: number | null;
  starterOverallBefore?: number | null;
  swappedWithPlayerName?: string | null;
  swappedWithPlayerOverall?: number | null;
};

export type TransactionValueAssessmentLabel = "Guter Value" | "Neutral" | "Riskant";

export type TransactionValueAssessment = {
  label: TransactionValueAssessmentLabel;
  direction: ActionDecisionEffect["direction"];
  reason: string;
};

function finiteScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function valueImpactFromDirection(
  direction: ActionDecisionEffect["direction"],
): ActionValueFeedback["impact"] {
  if (direction === "up") {
    return "positive";
  }

  if (direction === "down") {
    return "negative";
  }

  return "neutral";
}

function cleanOverall(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function formatOverall(value: number | null | undefined) {
  return cleanOverall(value)?.toString() ?? "offen";
}

function positionPhase(positionCode: string) {
  if (positionCode === "QB" || positionCode === "WR" || positionCode === "TE") {
    return "Passing";
  }

  if (positionCode === "RB" || ["LT", "LG", "C", "RG", "RT", "FB"].includes(positionCode)) {
    return "Run/Protection";
  }

  if (["K", "P", "LS"].includes(positionCode)) {
    return "Special Teams";
  }

  return "Defense";
}

function lineupDelta(input: DepthChartLineupFeedbackInput) {
  const before = cleanOverall(input.starterOverallBefore);
  const after = cleanOverall(input.starterOverallAfter);

  if (before == null || after == null) {
    return null;
  }

  return after - before;
}

export function buildDepthChartLineupEvaluation(input: DepthChartLineupFeedbackInput) {
  const phase = positionPhase(input.positionCode);
  const delta = lineupDelta(input);

  if (delta != null) {
    if (delta >= 2) {
      return `${phase} leicht verbessert`;
    }

    if (delta <= -2) {
      return `${phase} Risiko steigt`;
    }

    return `${phase} bleibt stabil`;
  }

  if (input.currentSlot === 1 && input.targetSlot && input.targetSlot > 1) {
    return `${phase} Risiko steigt`;
  }

  if (input.targetSlot === 1 && input.currentSlot && input.currentSlot > 1) {
    return `${phase} bekommt neue Prioritaet`;
  }

  return `${phase} bleibt stabil`;
}

export function buildDepthChartLineupImpact(input: DepthChartLineupFeedbackInput) {
  const before = formatOverall(input.starterOverallBefore);
  const after = formatOverall(input.starterOverallAfter);
  const delta = lineupDelta(input);
  const deltaLabel =
    delta == null
      ? "n/a"
      : delta > 0
        ? `+${delta}`
        : String(delta);
  const slotLine =
    input.currentSlot && input.targetSlot
      ? `Slot #${input.currentSlot} -> #${input.targetSlot}`
      : "Slot-Reihenfolge angepasst";
  const swapLine = input.swappedWithPlayerName
    ? ` · Tausch mit ${input.swappedWithPlayerName}${
        cleanOverall(input.swappedWithPlayerOverall) != null
          ? ` (${cleanOverall(input.swappedWithPlayerOverall)} OVR)`
          : ""
      }`
    : "";

  return `${input.positionCode} · ${slotLine}${swapLine} · Positionsstaerke ${before} -> ${after} (${deltaLabel}) · Bewertung: ${buildDepthChartLineupEvaluation(input)}.`;
}

export function buildDepthChartLineupEffects(
  input: DepthChartLineupFeedbackInput,
): ActionDecisionEffect[] {
  const promoted =
    input.currentSlot != null && input.targetSlot != null && input.targetSlot < input.currentSlot;
  const demoted =
    input.currentSlot != null && input.targetSlot != null && input.targetSlot > input.currentSlot;
  const delta = lineupDelta(input);
  const effects: ActionDecisionEffect[] = [
    {
      direction: promoted ? "up" : demoted ? "down" : "neutral",
      label: promoted
        ? "Prioritaet erhoeht"
        : demoted
          ? "Prioritaet reduziert"
          : "Reihenfolge angepasst",
    },
  ];

  if (delta != null) {
    effects.push({
      direction: delta >= 2 ? "up" : delta <= -2 ? "down" : "neutral",
      label:
        delta >= 2
          ? `Positions-OVR +${delta}`
          : delta <= -2
            ? `Positions-OVR ${delta}`
            : "Positions-OVR stabil",
    });
  } else if (
    cleanOverall(input.starterOverallBefore) != null &&
    cleanOverall(input.starterOverallAfter) == null
  ) {
    effects.push({ direction: "down", label: "Starter offen" });
  }

  return effects;
}

export function buildDepthChartLineupValueFeedback(
  input: DepthChartLineupFeedbackInput,
): ActionValueFeedback {
  const delta = lineupDelta(input);
  const promoted =
    input.currentSlot != null && input.targetSlot != null && input.targetSlot < input.currentSlot;
  const evaluation = buildDepthChartLineupEvaluation(input);

  if (delta != null && delta >= 2) {
    return {
      impact: "positive",
      reason: `${evaluation}: Der neue Slot-1-Wert liegt ueber der vorherigen Positionsstaerke.`,
      context: `${input.positionCode} Depth Chart`,
    };
  }

  if (delta != null && delta <= -2) {
    return {
      impact: "negative",
      reason: `${evaluation}: Der neue Slot-1-Wert liegt unter der vorherigen Positionsstaerke.`,
      context: `${input.positionCode} Depth Chart`,
    };
  }

  if (
    cleanOverall(input.starterOverallBefore) != null &&
    cleanOverall(input.starterOverallAfter) == null
  ) {
    return {
      impact: "negative",
      reason: `${evaluation}: Der vorherige Slot-1-Wert ist nach der Aenderung offen.`,
      context: `${input.positionCode} Depth Chart`,
    };
  }

  return {
    impact: promoted ? "positive" : "neutral",
    reason: promoted
      ? `${evaluation}: Der Spieler bekommt mehr Einsatzprioritaet ohne sichtbares Rating-Risiko.`
      : `${evaluation}: Die Reihenfolge wurde angepasst, ohne klaren Rating-Ausschlag.`,
    context: `${input.positionCode} Depth Chart`,
  };
}

export function assessPlayerValueDecision(input: {
  label?: PlayerValueLabel | null;
  score?: number | null;
}): TransactionValueAssessment {
  if (input.label === "Great Value") {
    return {
      direction: "up",
      label: "Guter Value",
      reason: "Der bestehende Value Score sieht Fit, Leistung und Kosten klar positiv.",
    };
  }

  if (input.label === "Expensive" || input.label === "Low Fit") {
    return {
      direction: "down",
      label: "Riskant",
      reason:
        input.label === "Expensive"
          ? "Der bestehende Value Score warnt vor hoher Kostenlast."
          : "Der bestehende Value Score warnt vor niedrigem Fit.",
    };
  }

  if (finiteScore(input.score) == null) {
    return {
      direction: "neutral",
      label: "Neutral",
      reason: "Value-Daten sind unvollstaendig; die Entscheidung wird neutral eingeordnet.",
    };
  }

  return {
    direction: "neutral",
    label: "Neutral",
    reason: "Der bestehende Value Score sieht keinen klaren Vorteil und kein klares Risiko.",
  };
}

export function assessTradeValueDecision(input: {
  managerValueScore?: number | null;
  partnerValueScore?: number | null;
}): TransactionValueAssessment {
  const managerScore = finiteScore(input.managerValueScore);
  const partnerScore = finiteScore(input.partnerValueScore);

  if (managerScore == null || partnerScore == null) {
    return {
      direction: "neutral",
      label: "Neutral",
      reason: "Trade-Value-Daten sind unvollstaendig; die Entscheidung wird neutral eingeordnet.",
    };
  }

  const valueDelta = managerScore - partnerScore;

  if (valueDelta >= 6) {
    return {
      direction: "up",
      label: "Guter Value",
      reason: "Der erhaltene Value liegt klar ueber dem abgegebenen Value.",
    };
  }

  if (valueDelta <= -6) {
    return {
      direction: "down",
      label: "Riskant",
      reason: "Der abgegebene Value liegt klar ueber dem erhaltenen Value.",
    };
  }

  return {
    direction: "neutral",
    label: "Neutral",
    reason: "Erhaltener und abgegebener Value liegen nah beieinander.",
  };
}

export function buildTransactionValueFeedback(
  assessment: TransactionValueAssessment,
  context?: string | null,
): ActionValueFeedback {
  const cleanContext = context?.trim();

  return {
    impact: valueImpactFromDirection(assessment.direction),
    reason: assessment.reason,
    ...(cleanContext ? { context: cleanContext } : {}),
  };
}

export function buildTransactionValueEffect(
  assessment: TransactionValueAssessment,
): ActionDecisionEffect {
  return {
    direction: assessment.direction,
    label: assessment.label,
  };
}

export function buildRosterAssignmentEffects(input: {
  depthChartSlot: number | null;
  developmentFocus: boolean;
  rosterStatus: string;
  specialRole: string | null;
}): ActionDecisionEffect[] {
  const effects: ActionDecisionEffect[] = [];
  const hasActiveSlot =
    input.depthChartSlot != null && ACTIVE_DEPTH_STATUSES.has(input.rosterStatus);

  if (input.depthChartSlot === 1 && input.rosterStatus === "STARTER") {
    effects.push({ direction: "up", label: "Starter verbessert" });
  } else if (hasActiveSlot) {
    effects.push({ direction: "up", label: "Depth erhoeht" });
  } else if (input.rosterStatus === "INACTIVE" || input.rosterStatus === "INJURED_RESERVE") {
    effects.push({ direction: "down", label: "Depth reduziert" });
  } else {
    effects.push({ direction: "neutral", label: "Depth neutral" });
  }

  if (input.specialRole) {
    effects.push({ direction: "up", label: "Special Teams klarer" });
  }

  if (input.developmentFocus) {
    effects.push({ direction: "up", label: "Entwicklung fokussiert" });
  }

  return effects;
}

export function buildRosterAssignmentValueFeedback(input: {
  depthChartSlot: number | null;
  developmentFocus: boolean;
  rosterStatus: string;
  specialRole: string | null;
}): ActionValueFeedback {
  if (input.depthChartSlot === 1 && input.rosterStatus === "STARTER") {
    return {
      impact: "positive",
      reason: "Guter Value fuer aktuelle Rolle: Der Spieler ist als Starter klar eingeordnet.",
      context: "Roster-Change",
    };
  }

  if (
    input.depthChartSlot != null &&
    ACTIVE_DEPTH_STATUSES.has(input.rosterStatus)
  ) {
    return {
      impact: "positive",
      reason: "Guter Value fuer aktuelle Rolle: Der Spieler erhoeht die aktive Depth.",
      context: "Roster-Change",
    };
  }

  if (input.rosterStatus === "INACTIVE" || input.rosterStatus === "INJURED_RESERVE") {
    return {
      impact: "negative",
      reason: "Aktive Depth sinkt durch diese Rollenentscheidung.",
      context: "Roster-Change",
    };
  }

  if (input.developmentFocus || input.specialRole) {
    return {
      impact: "positive",
      reason: "Rolle wird klarer: Development Focus oder Special Teams Kontext ist gesetzt.",
      context: "Roster-Change",
    };
  }

  return {
    impact: "neutral",
    reason: "Keine klare Value-Veraenderung; Rolle und aktiver Slot bleiben neutral.",
    context: "Roster-Change",
  };
}

export function buildSigningEffects(input: {
  depthChartSlot: number | null;
  rosterStatus: string;
}): ActionDecisionEffect[] {
  if (ACTIVE_DEPTH_STATUSES.has(input.rosterStatus)) {
    return [
      { direction: "up", label: input.depthChartSlot === 1 ? "Starter verbessert" : "Depth erhoeht" },
      { direction: "up", label: "Need reduziert" },
    ];
  }

  if (input.rosterStatus === "PRACTICE_SQUAD") {
    return [
      { direction: "up", label: "Development Depth erhoeht" },
      { direction: "neutral", label: "Starter unveraendert" },
    ];
  }

  return [{ direction: "neutral", label: "Kader unveraendert" }];
}

export function buildTradeEffects(input: {
  managerValueScore?: number | null;
  partnerValueScore?: number | null;
}): ActionDecisionEffect[] {
  const managerScore = finiteScore(input.managerValueScore);
  const partnerScore = finiteScore(input.partnerValueScore);

  if (managerScore == null || partnerScore == null) {
    return [
      { direction: "neutral", label: "Value neutral" },
      { direction: "neutral", label: "Need geprueft" },
    ];
  }

  const valueDelta = managerScore - partnerScore;

  if (valueDelta >= 6) {
    return [
      { direction: "up", label: "Value verbessert" },
      { direction: "up", label: "Need reduziert" },
    ];
  }

  if (valueDelta <= -6) {
    return [
      { direction: "down", label: "Value verschlechtert" },
      { direction: "neutral", label: "Need geprueft" },
    ];
  }

  return [
    { direction: "neutral", label: "Value neutral" },
    { direction: "neutral", label: "Need geprueft" },
  ];
}

export function buildReleaseEffects(input: { capSavings: number; capHit: number }): ActionDecisionEffect[] {
  return [
    { direction: "down", label: "Depth reduziert" },
    {
      direction: input.capSavings > 0 || input.capHit === 0 ? "up" : "neutral",
      label: input.capSavings > 0 || input.capHit === 0 ? "Flexibilitaet erhoeht" : "Value neutral",
    },
  ];
}
