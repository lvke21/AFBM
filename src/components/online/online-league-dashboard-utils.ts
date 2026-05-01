import type {
  FranchiseStrategyType,
  OnlineMediaExpectationGoal,
  TrainingIntensity,
  TrainingPrimaryFocus,
  TrainingRiskTolerance,
  TrainingSecondaryFocus,
} from "@/lib/online/online-league-types";

export const TRAINING_INTENSITIES: TrainingIntensity[] = ["light", "normal", "hard", "extreme"];
export const TRAINING_PRIMARY_FOCI: TrainingPrimaryFocus[] = [
  "offense",
  "defense",
  "balanced",
  "conditioning",
  "recovery",
  "player_development",
  "team_chemistry",
];
export const TRAINING_SECONDARY_FOCI: Array<TrainingSecondaryFocus | "none"> = [
  "none",
  "passing_game",
  "running_game",
  "pass_protection",
  "pass_rush",
  "run_defense",
  "coverage",
  "turnovers",
  "red_zone",
  "two_minute_drill",
  "special_teams",
];
export const TRAINING_RISK_LEVELS: TrainingRiskTolerance[] = ["low", "medium", "high"];
export const MEDIA_EXPECTATION_GOALS: OnlineMediaExpectationGoal[] = [
  "rebuild",
  "playoffs",
  "championship",
];
export const FRANCHISE_STRATEGIES: FranchiseStrategyType[] = [
  "rebuild",
  "win_now",
  "balanced",
  "youth_focus",
];
export const EXPERT_MODE_STORAGE_KEY = "afbm-online-league-expert-mode";

export function getTrainingIntensityLabel(intensity: TrainingIntensity) {
  if (intensity === "light") {
    return "Leicht";
  }

  if (intensity === "normal") {
    return "Normal";
  }

  if (intensity === "hard") {
    return "Hart";
  }

  return "Extrem";
}

export function getTrainingFocusLabel(focus: TrainingPrimaryFocus) {
  const labels: Record<TrainingPrimaryFocus, string> = {
    offense: "Offense",
    defense: "Defense",
    balanced: "Ausgewogen",
    conditioning: "Kondition",
    recovery: "Erholung",
    player_development: "Spielerentwicklung",
    team_chemistry: "Team-Chemistry",
  };

  return labels[focus];
}

export function getTrainingRiskLabel(riskTolerance: TrainingRiskTolerance) {
  if (riskTolerance === "low") {
    return "Vorsichtig";
  }

  if (riskTolerance === "medium") {
    return "Normal";
  }

  return "Risikofreudig";
}

export function getTrainingPreview(
  intensity: TrainingIntensity,
  focus: TrainingPrimaryFocus,
  riskTolerance: TrainingRiskTolerance,
  youngPlayerPriority: number,
  veteranMaintenance: number,
) {
  const focusBenefit: Record<TrainingPrimaryFocus, string> = {
    offense: "Mehr Fokus auf offensive Spielvorbereitung.",
    defense: "Mehr Fokus auf defensive Spielvorbereitung.",
    balanced: "Stabile Allround-Vorbereitung ohne klare Schwachstelle.",
    conditioning: "Mehr Kondition, aber etwas mehr Belastung.",
    recovery: "Entlastet den Kader und senkt Belastungsrisiken.",
    player_development: "Mehr langfristiger Fortschritt, besonders für junge Spieler.",
    team_chemistry: "Stärkt den Zusammenhalt im Team.",
  };
  const fatigueByIntensity: Record<TrainingIntensity, string> = {
    light: "Müdigkeit sinkt eher oder bleibt sehr niedrig.",
    normal: "Müdigkeit bleibt kontrollierbar.",
    hard: "Müdigkeit steigt spürbar.",
    extreme: "Müdigkeit steigt stark.",
  };
  const injuryByIntensity: Record<TrainingIntensity, string> = {
    light: "Verletzungsrisiko bleibt niedrig.",
    normal: "Verletzungsrisiko bleibt moderat.",
    hard: "Verletzungsrisiko steigt.",
    extreme: "Verletzungsrisiko steigt deutlich.",
  };
  const preparation =
    focus === "offense" || focus === "defense"
      ? "Spielvorbereitung: deutlicher Wochenfokus."
      : focus === "balanced"
        ? "Spielvorbereitung: solider Grundbonus."
        : focus === "recovery"
          ? "Spielvorbereitung: bewusst niedriger, dafür Erholung."
          : "Spielvorbereitung: kleiner bis mittlerer Effekt.";
  const chemistry =
    focus === "team_chemistry"
      ? "Chemistry: klar positiv."
      : focus === "balanced"
        ? "Chemistry: leicht positiv."
        : intensity === "extreme"
          ? "Chemistry: kann durch extreme Belastung leiden."
          : intensity === "hard"
            ? "Chemistry: kann leicht unter Belastung leiden."
            : "Chemistry: voraussichtlich stabil.";
  const riskLevel =
    intensity === "extreme" || (intensity === "hard" && riskTolerance === "high")
      ? "Kritisch"
      : intensity === "hard" || riskTolerance === "high"
        ? "Erhöht"
        : "Kontrolliert";
  const warnings = [
    ...(intensity === "hard"
      ? ["Hartes Training ist ein kurzfristiger Push, erhöht aber Müdigkeit und Verletzungsrisiko."]
      : []),
    ...(intensity === "extreme"
      ? ["Extremes Training ist riskant: hohe Müdigkeit, höheres Verletzungsrisiko und mögliche Chemistry-Verluste."]
      : []),
    ...(riskTolerance === "high"
      ? ["Risikofreudige Ausführung kann den kurzfristigen Effekt erhöhen, ist aber anfälliger für Belastungsprobleme."]
      : []),
  ];

  return {
    title: `${getTrainingFocusLabel(focus)} / ${getTrainingIntensityLabel(intensity)}`,
    benefit: focusBenefit[focus],
    fatigue:
      veteranMaintenance >= 70
        ? `${fatigueByIntensity[intensity]} Veteranen werden zusätzlich geschont.`
        : fatigueByIntensity[intensity],
    injuryRisk:
      focus === "recovery"
        ? "Verletzungsrisiko sinkt eher, weil Erholung priorisiert wird."
        : injuryByIntensity[intensity],
    preparation,
    chemistry,
    development:
      focus === "player_development" || youngPlayerPriority >= 70
        ? "Entwicklung: junge Spieler werden stärker priorisiert."
        : "Entwicklung: normaler Wochenfortschritt.",
    riskLevel,
    warnings,
  };
}

export function getToneClass(tone: "good" | "neutral" | "critical") {
  if (tone === "good") {
    return "border-emerald-200/30 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "critical") {
    return "border-rose-200/30 bg-rose-300/10 text-rose-100";
  }

  return "border-amber-200/30 bg-amber-300/10 text-amber-100";
}

export function formatContractCurrency(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export type ContractRiskPlayer = {
  playerName: string;
  salaryPerYear: number;
  capHitPerYear: number;
  signingBonus: number;
  deadCapPerYear?: number;
  guaranteedMoney?: number;
  yearsRemaining: number;
};

export type ContractRiskCap = {
  availableCap: number;
};

export function getReleaseWarningText(player: ContractRiskPlayer, cap: ContractRiskCap) {
  const deadCap = player.deadCapPerYear ?? 0;
  const nextCapSpace = cap.availableCap + player.capHitPerYear - deadCap;

  return [
    `${player.playerName} entlassen?`,
    "Entlassen entfernt den Spieler sofort aus deinem aktiven Kader.",
    `Dead Cap: ${formatContractCurrency(deadCap)}.`,
    `Neuer geschätzter Cap Space: ${formatContractCurrency(nextCapSpace)}.`,
    "Dead Cap bleibt als Altlast im Cap und kann spätere Moves einschränken.",
  ].join("\n");
}

export function getExtensionWarningText(player: ContractRiskPlayer, cap: ContractRiskCap) {
  const nextYears = Math.max(1, player.yearsRemaining + 1);
  const nextCapHit = Math.round(player.salaryPerYear + player.signingBonus / nextYears);
  const nextDeadCap = Math.round(((player.guaranteedMoney ?? 0) + player.signingBonus) / nextYears);
  const nextCapSpace = cap.availableCap + player.capHitPerYear - nextCapHit;
  const warnings = [
    `${player.playerName} um 1 Jahr verlängern?`,
    `Neue Laufzeit: ${nextYears} Jahre.`,
    `Signing Bonus: ${formatContractCurrency(player.signingBonus)}.`,
    `Geschätzter Cap Hit/Jahr: ${formatContractCurrency(nextCapHit)}.`,
    `Geschätzter Dead Cap/Jahr: ${formatContractCurrency(nextDeadCap)}.`,
    `Neuer geschätzter Cap Space: ${formatContractCurrency(nextCapSpace)}.`,
  ];

  if (player.signingBonus >= 5_000_000) {
    warnings.push("Achtung: Hoher Bonus bindet Geld über mehrere Jahre und erhöht Dead-Cap-Risiko.");
  }

  if (nextCapSpace < 0) {
    warnings.push("Warnung: Diese Verlängerung kann den Salary Cap überschreiten und blockiert werden.");
  }

  return warnings.join("\n");
}

export function getFreeAgentWarningText(player: ContractRiskPlayer, cap: ContractRiskCap) {
  const nextCapSpace = cap.availableCap - player.capHitPerYear;
  const warnings = [
    `${player.playerName} verpflichten?`,
    `Laufzeit: ${player.yearsRemaining} Jahre.`,
    `Cap Hit/Jahr: ${formatContractCurrency(player.capHitPerYear)}.`,
    `Signing Bonus: ${formatContractCurrency(player.signingBonus)}.`,
    `Neuer geschätzter Cap Space: ${formatContractCurrency(nextCapSpace)}.`,
  ];

  if (nextCapSpace < 0) {
    warnings.push("Warnung: Diese Verpflichtung kann den Salary Cap überschreiten und blockiert werden.");
  }

  return warnings.join("\n");
}
