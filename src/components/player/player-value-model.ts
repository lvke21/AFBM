export type PlayerValueLabel = "Great Value" | "Fair Value" | "Expensive" | "Low Fit";

export type PlayerValueView = {
  label: PlayerValueLabel;
  reason: string;
  score: number;
  summary: string;
  reasons: string[];
  tone: "positive" | "neutral" | "warning" | "negative";
};

export type PlayerValueInput = {
  age?: number | null;
  capHit?: number | null;
  depthChartSlot?: number | null;
  positionOverall?: number | null;
  potentialRating?: number | null;
  rosterStatus?: string | null;
  schemeFitScore?: number | null;
  teamNeedScore?: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeNeedScore(score: number | null | undefined) {
  if (typeof score !== "number") {
    return 50;
  }

  return score <= 10 ? clamp(score * 10, 0, 100) : clamp(score, 0, 100);
}

function expectedCapHit(overall: number) {
  return Math.max(850_000, overall * 120_000);
}

function getCapValueScore(capHit: number | null | undefined, overall: number) {
  if (typeof capHit !== "number" || capHit <= 0) {
    return 62;
  }

  const ratio = capHit / expectedCapHit(overall);

  if (ratio <= 0.85) {
    return 92;
  }

  if (ratio <= 1.05) {
    return 78;
  }

  if (ratio <= 1.25) {
    return 58;
  }

  return 32;
}

function getAgeAdjustment(age: number | null | undefined, upside: number) {
  if (typeof age !== "number") {
    return 0;
  }

  if (age <= 24 && upside >= 5) {
    return 7;
  }

  if (age <= 27) {
    return 3;
  }

  if (age >= 32) {
    return -6;
  }

  return 0;
}

function isBackupStatus(status: string | null | undefined) {
  return status === "BACKUP" || status === "ROTATION" || status === "INACTIVE";
}

export function buildPlayerValue(input: PlayerValueInput): PlayerValueView {
  const overall = input.positionOverall ?? 60;
  const potential = input.potentialRating ?? overall;
  const fit = input.schemeFitScore ?? 55;
  const need = normalizeNeedScore(input.teamNeedScore);
  const upside = Math.max(0, potential - overall);
  const capScore = getCapValueScore(input.capHit, overall);
  const ageAdjustment = getAgeAdjustment(input.age, upside);
  const rawScore =
    overall * 0.34 + potential * 0.16 + fit * 0.16 + need * 0.12 + capScore * 0.22 + ageAdjustment;
  const score = Math.round(clamp(rawScore, 0, 100));
  const capRatio =
    typeof input.capHit === "number" && input.capHit > 0
      ? input.capHit / expectedCapHit(overall)
      : null;

  if (fit < 45 && need < 70) {
    return {
      label: "Low Fit",
      reason: "Niedriger Fit fuer Team Need",
      score,
      summary: `Fit ${fit} bei Need ${need}`,
      reasons: ["Scheme Fit ist niedrig", "Team Need kompensiert den Fit nicht"],
      tone: "negative",
    };
  }

  if (
    (capRatio !== null && capRatio > 1.25 && isBackupStatus(input.rosterStatus)) ||
    (capRatio !== null && capRatio > 1.45)
  ) {
    return {
      label: "Expensive",
      reason: isBackupStatus(input.rosterStatus)
        ? "Teuer fuer aktuelle Rolle"
        : "Cap Hit ueber Erwartung",
      score,
      summary: `Cap ${Math.round(capRatio * 100)}% vom Erwartungswert`,
      reasons: ["Cap Hit liegt ueber dem Rollenwert", "Pruefen vor langfristiger Bindung"],
      tone: "warning",
    };
  }

  if (score >= 78) {
    return {
      label: "Great Value",
      reason: "Guter Fit bei moderaten Kosten",
      score,
      summary: `Score ${score}/100`,
      reasons: ["Starker Fit aus OVR, Need und Cap", upside >= 5 ? `+${upside} Potential` : "Cap passt"],
      tone: "positive",
    };
  }

  return {
    label: "Fair Value",
    reason: "Solider Wert ohne klaren Rabatt",
    score,
    summary: `Score ${score}/100`,
    reasons: ["Solider Kaderwert ohne klaren Discount", "Cap und Fit bleiben beobachtbar"],
    tone: "neutral",
  };
}
