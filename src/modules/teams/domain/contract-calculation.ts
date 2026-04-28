export function normalizeContractYears(value: number) {
  return Math.min(Math.max(Math.round(value), 1), 5);
}

export function normalizeYearlySalary(value: number) {
  return Math.min(Math.max(Math.round(value), 750_000), 45_000_000);
}

export function calculateSigningBonus(yearlySalary: number, positionOverall: number) {
  return Math.round(Math.max(125_000, yearlySalary * 0.18 + positionOverall * 6_000));
}

export function calculateCapHit(yearlySalary: number, signingBonus: number, years: number) {
  return Number((yearlySalary + signingBonus / years).toFixed(2));
}

export function buildContractOffer(input: {
  positionOverall: number;
  yearlySalary: number;
  years: number;
}) {
  const years = normalizeContractYears(input.years);
  const yearlySalary = normalizeYearlySalary(input.yearlySalary);
  const signingBonus = calculateSigningBonus(yearlySalary, input.positionOverall);
  const capHit = calculateCapHit(yearlySalary, signingBonus, years);

  return {
    capHit,
    signingBonus,
    yearlySalary,
    years,
  };
}

export type FreeAgentOfferEvaluation = {
  acceptanceScore: number;
  decision: "likely_accept" | "borderline" | "likely_reject";
  label: "Gutes Angebot" | "Grenzwertig" | "Schlechtes Angebot";
  playerCanReject: boolean;
  reason: string;
};

export function getExpectedFreeAgentSalary(positionOverall: number) {
  return Math.max(850_000, Math.round(positionOverall * 120_000));
}

export function evaluateFreeAgentOffer(input: {
  positionOverall: number;
  yearlySalary: number;
  years: number;
  schemeFitScore?: number | null;
  teamNeedScore?: number | null;
}): FreeAgentOfferEvaluation {
  const yearlySalary = normalizeYearlySalary(input.yearlySalary);
  const years = normalizeContractYears(input.years);
  const expectedSalary = getExpectedFreeAgentSalary(input.positionOverall);
  const salaryRatio = yearlySalary / expectedSalary;
  const salaryScore = Math.min(88, Math.round(salaryRatio * 82));
  const yearScore = years >= 3 ? 12 : years === 2 ? 8 : 3;
  const acceptanceScore = Math.min(100, salaryScore + yearScore);
  const requiredScore = input.positionOverall >= 85 ? 85 : input.positionOverall >= 75 ? 76 : 68;

  if (acceptanceScore < requiredScore) {
    return {
      acceptanceScore,
      decision: "likely_reject",
      label: "Schlechtes Angebot",
      playerCanReject: true,
      reason: "Der Spieler erwartet am Markt ein staerkeres Angebot.",
    };
  }

  if (acceptanceScore < requiredScore + 8) {
    return {
      acceptanceScore,
      decision: "borderline",
      label: "Grenzwertig",
      playerCanReject: false,
      reason: "Das Angebot ist knapp akzeptabel, aber nicht besonders attraktiv.",
    };
  }

  return {
    acceptanceScore,
    decision: "likely_accept",
    label: "Gutes Angebot",
    playerCanReject: false,
    reason: "Gehalt, Laufzeit und Team-Fit sind fuer den Spieler plausibel.",
  };
}
