export type OffensiveFocusXFactor = "RUN_FIRST" | "BALANCED" | "PASS_FIRST";

export type DefensiveFocusXFactor = "STOP_RUN" | "BALANCED" | "LIMIT_PASS";

export type AggressionXFactor = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

export type TempoPlanXFactor = "SLOW" | "NORMAL" | "HURRY_UP";

export type ProtectionPlanXFactor = "MAX_PROTECT" | "STANDARD" | "FAST_RELEASE";

export type OffensiveMatchupFocusXFactor =
  | "FEATURE_WR"
  | "FEATURE_TE"
  | "FEATURE_RB"
  | "PROTECT_QB"
  | "BALANCED";

export type DefensiveMatchupFocusXFactor =
  | "DOUBLE_WR1"
  | "SPY_QB"
  | "BRACKET_TE"
  | "ATTACK_WEAK_OL"
  | "BALANCED";

export type TurnoverPlanXFactor =
  | "PROTECT_BALL"
  | "BALANCED"
  | "HUNT_TURNOVERS";

export type PreGameXFactorPlan = {
  offensiveFocus: OffensiveFocusXFactor;
  defensiveFocus: DefensiveFocusXFactor;
  aggression: AggressionXFactor;
  tempoPlan: TempoPlanXFactor;
  protectionPlan: ProtectionPlanXFactor;
  offensiveMatchupFocus: OffensiveMatchupFocusXFactor;
  defensiveMatchupFocus: DefensiveMatchupFocusXFactor;
  turnoverPlan: TurnoverPlanXFactor;
};

export const PRE_GAME_X_FACTOR_OPTIONS = {
  offensiveFocus: ["RUN_FIRST", "BALANCED", "PASS_FIRST"],
  defensiveFocus: ["STOP_RUN", "BALANCED", "LIMIT_PASS"],
  aggression: ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"],
  tempoPlan: ["SLOW", "NORMAL", "HURRY_UP"],
  protectionPlan: ["MAX_PROTECT", "STANDARD", "FAST_RELEASE"],
  offensiveMatchupFocus: ["FEATURE_WR", "FEATURE_TE", "FEATURE_RB", "PROTECT_QB", "BALANCED"],
  defensiveMatchupFocus: ["DOUBLE_WR1", "SPY_QB", "BRACKET_TE", "ATTACK_WEAK_OL", "BALANCED"],
  turnoverPlan: ["PROTECT_BALL", "BALANCED", "HUNT_TURNOVERS"],
} as const satisfies {
  [Key in keyof PreGameXFactorPlan]: readonly PreGameXFactorPlan[Key][];
};

export const DEFAULT_PRE_GAME_X_FACTOR_PLAN: PreGameXFactorPlan = {
  offensiveFocus: "BALANCED",
  defensiveFocus: "BALANCED",
  aggression: "BALANCED",
  tempoPlan: "NORMAL",
  protectionPlan: "STANDARD",
  offensiveMatchupFocus: "BALANCED",
  defensiveMatchupFocus: "BALANCED",
  turnoverPlan: "BALANCED",
};

export function normalizePreGameXFactorPlan(
  plan?: Partial<PreGameXFactorPlan> | null,
): PreGameXFactorPlan {
  return {
    ...DEFAULT_PRE_GAME_X_FACTOR_PLAN,
    ...(plan ?? {}),
  };
}

export function parsePreGameXFactorPlan(
  input: Partial<Record<keyof PreGameXFactorPlan, FormDataEntryValue | string | null | undefined>>,
): PreGameXFactorPlan {
  const plan = { ...DEFAULT_PRE_GAME_X_FACTOR_PLAN };

  for (const key of Object.keys(PRE_GAME_X_FACTOR_OPTIONS) as Array<keyof PreGameXFactorPlan>) {
    const rawValue = input[key];
    const value = typeof rawValue === "string" ? rawValue : "";

    if (PRE_GAME_X_FACTOR_OPTIONS[key].includes(value as never)) {
      plan[key] = value as never;
    }
  }

  return plan;
}
