export const WeeklyPlanIntensity = {
  BALANCED: "BALANCED",
  INTENSE: "INTENSE",
  RECOVERY: "RECOVERY",
} as const;

export type WeeklyPlanIntensity =
  typeof WeeklyPlanIntensity[keyof typeof WeeklyPlanIntensity];

export const WeeklyOpponentFocus = {
  BALANCED: "BALANCED",
  DEFENSE: "DEFENSE",
  OFFENSE: "OFFENSE",
} as const;

export type WeeklyOpponentFocus =
  typeof WeeklyOpponentFocus[keyof typeof WeeklyOpponentFocus];

export type WeeklyPlanInput = {
  developmentFocusPlayerIds: string[];
  intensity: WeeklyPlanIntensity;
  opponentFocus: WeeklyOpponentFocus;
};

export const WEEKLY_DEVELOPMENT_FOCUS_LIMIT = 3;

const VALID_INTENSITIES = new Set(Object.values(WeeklyPlanIntensity));
const VALID_OPPONENT_FOCUSES = new Set(Object.values(WeeklyOpponentFocus));

function isWeeklyPlanIntensity(value: unknown): value is WeeklyPlanIntensity {
  return typeof value === "string" && VALID_INTENSITIES.has(value as WeeklyPlanIntensity);
}

function isWeeklyOpponentFocus(value: unknown): value is WeeklyOpponentFocus {
  return typeof value === "string" && VALID_OPPONENT_FOCUSES.has(value as WeeklyOpponentFocus);
}

export function normalizeWeeklyPlanInput(
  input: Partial<WeeklyPlanInput> | null | undefined,
): WeeklyPlanInput {
  const intensity = isWeeklyPlanIntensity(input?.intensity)
    ? input?.intensity
    : WeeklyPlanIntensity.BALANCED;
  const opponentFocus = isWeeklyOpponentFocus(input?.opponentFocus)
    ? input?.opponentFocus
    : WeeklyOpponentFocus.BALANCED;
  const developmentFocusPlayerIds = [
    ...new Set(
      (input?.developmentFocusPlayerIds ?? [])
        .map((playerId) => playerId.trim())
        .filter(Boolean),
    ),
  ].slice(0, WEEKLY_DEVELOPMENT_FOCUS_LIMIT);

  return {
    developmentFocusPlayerIds,
    intensity: intensity ?? WeeklyPlanIntensity.BALANCED,
    opponentFocus: opponentFocus ?? WeeklyOpponentFocus.BALANCED,
  };
}

export function buildWeeklyPlanConditionImpact(plan: WeeklyPlanInput) {
  const intensityImpact =
    plan.intensity === WeeklyPlanIntensity.RECOVERY
      ? { fatigueDelta: -16, moraleDelta: 3 }
      : plan.intensity === WeeklyPlanIntensity.INTENSE
        ? { fatigueDelta: 10, moraleDelta: -2 }
        : { fatigueDelta: 2, moraleDelta: 0 };
  const focusMoraleDelta =
    plan.opponentFocus === WeeklyOpponentFocus.BALANCED ? 0 : 1;

  return {
    fatigueDelta: intensityImpact.fatigueDelta,
    moraleDelta: intensityImpact.moraleDelta + focusMoraleDelta,
  };
}
