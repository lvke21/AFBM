import type {
  CoverageShell,
  DefensivePlayFamily,
} from "../domain/play-library";

export type PressRouteType =
  | "QUICK_SLANT"
  | "QUICK_OUT"
  | "HITCH"
  | "CROSSER"
  | "DIG"
  | "GO"
  | "POST"
  | "FADE";

export type PressCoverageOutcome =
  | "PRESS_WIN"
  | "RELEASE_WIN"
  | "STACKED_OVER_TOP"
  | "NEUTRAL";

export type PressCoverageResolutionInput = {
  routeType: PressRouteType;
  defender: {
    press: number;
    manCoverage: number;
    speed: number;
    acceleration: number;
  };
  receiver: {
    release: number;
    routeRunning: number;
    separation: number;
    speed: number;
    acceleration: number;
  };
  coverageShell: CoverageShell;
  defenseFamily: DefensivePlayFamily;
  safetyHelp?: boolean;
  qbTiming: number;
  pressSeed?: string;
  random?: () => number;
};

export type PressCoverageTraceFactor = {
  label: string;
  value: number;
};

export type PressCoverageTrace = {
  notes: string[];
  factors: PressCoverageTraceFactor[];
  gameReportRows: Array<{
    label: string;
    value: string;
  }>;
};

export type PressCoverageResolution = {
  outcome: PressCoverageOutcome;
  pressWinProbability: number;
  releaseWinProbability: number;
  safetyHelpActive: boolean;
  routeDevelopmentTimeDelta: number;
  timingDisruption: number;
  separationDelta: number;
  bigPlayRiskDelta: number;
  quickPassPenalty: number;
  trace: PressCoverageTrace;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number) {
  let current = seed >>> 0;

  return () => {
    current = (current + 0x6d2b79f5) >>> 0;
    let value = Math.imul(current ^ (current >>> 15), current | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPressCoverageRandom(seed: string) {
  return mulberry32(hashString(seed));
}

function routePressSensitivity(routeType: PressRouteType) {
  switch (routeType) {
    case "QUICK_SLANT":
    case "QUICK_OUT":
      return 1.18;
    case "HITCH":
      return 1.05;
    case "GO":
    case "FADE":
      return 0.82;
    case "POST":
      return 0.9;
    case "CROSSER":
    case "DIG":
    default:
      return 0.96;
  }
}

function verticalPunishPotential(routeType: PressRouteType) {
  switch (routeType) {
    case "GO":
    case "FADE":
      return 1.25;
    case "POST":
      return 1.05;
    case "DIG":
    case "CROSSER":
      return 0.78;
    case "QUICK_SLANT":
      return 0.68;
    case "QUICK_OUT":
    case "HITCH":
    default:
      return 0.48;
  }
}

function isQuickRoute(routeType: PressRouteType) {
  return routeType === "QUICK_SLANT" || routeType === "QUICK_OUT" || routeType === "HITCH";
}

function resolveSafetyHelp(input: {
  explicit?: boolean;
  shell: CoverageShell;
  family: DefensivePlayFamily;
}) {
  if (input.explicit != null) {
    return input.explicit;
  }

  if (input.shell === "TWO_HIGH" || input.shell === "MIXED") {
    return true;
  }

  if (
    input.family === "BRACKET_SPECIALTY" ||
    input.family === "THREE_HIGH_PACKAGE" ||
    input.family === "DROP_EIGHT"
  ) {
    return true;
  }

  return false;
}

function coveragePressBias(family: DefensivePlayFamily, shell: CoverageShell) {
  const familyBias =
    family === "ZERO_PRESSURE"
      ? 0.08
      : family === "MAN_COVERAGE"
        ? 0.06
        : family === "BRACKET_SPECIALTY"
          ? 0.04
          : family === "DROP_EIGHT" || family === "THREE_HIGH_PACKAGE"
            ? -0.03
            : 0;
  const shellBias = shell === "ZERO" ? 0.07 : shell === "TWO_HIGH" ? 0.02 : 0;

  return familyBias + shellBias;
}

function outcomeFromRoll(input: {
  roll: number;
  pressWinProbability: number;
  releaseWinProbability: number;
  overTopProbability: number;
}): PressCoverageOutcome {
  if (input.roll < input.overTopProbability) {
    return "STACKED_OVER_TOP";
  }

  if (input.roll < input.overTopProbability + input.pressWinProbability) {
    return "PRESS_WIN";
  }

  if (
    input.roll <
    input.overTopProbability + input.pressWinProbability + input.releaseWinProbability
  ) {
    return "RELEASE_WIN";
  }

  return "NEUTRAL";
}

export function resolvePressCoverage(
  input: PressCoverageResolutionInput,
): PressCoverageResolution {
  const random =
    input.random ??
    createPressCoverageRandom(
      input.pressSeed ??
        `${input.defenseFamily}:${input.coverageShell}:${input.routeType}:press`,
    );
  const safetyHelpActive = resolveSafetyHelp({
    explicit: input.safetyHelp,
    shell: input.coverageShell,
    family: input.defenseFamily,
  });
  const defenderPressScore =
    input.defender.press * 0.42 +
    input.defender.manCoverage * 0.27 +
    input.defender.acceleration * 0.18 +
    input.defender.speed * 0.13;
  const receiverReleaseScore =
    input.receiver.release * 0.34 +
    input.receiver.routeRunning * 0.23 +
    input.receiver.separation * 0.19 +
    input.receiver.acceleration * 0.14 +
    input.receiver.speed * 0.1;
  const speedMismatch =
    (input.receiver.speed * 0.58 + input.receiver.acceleration * 0.42) -
    (input.defender.speed * 0.52 + input.defender.acceleration * 0.48);
  const pressEdge = defenderPressScore - receiverReleaseScore;
  const routeSensitivity = routePressSensitivity(input.routeType);
  const coverageBias = coveragePressBias(input.defenseFamily, input.coverageShell);
  const pressWinProbability = round(
    clamp(
      0.36 +
        (pressEdge / 95) * routeSensitivity +
        coverageBias +
        (safetyHelpActive ? 0.035 : -0.015),
      0.08,
      0.82,
    ),
  );
  const releaseWinProbability = round(
    clamp(
      0.32 +
        (-pressEdge / 90) * routeSensitivity +
        Math.max(speedMismatch, 0) / 180 -
        (safetyHelpActive ? 0.045 : 0),
      0.08,
      0.78,
    ),
  );
  const overTopProbability = clamp(
    releaseWinProbability *
      verticalPunishPotential(input.routeType) *
      (safetyHelpActive ? 0.28 : 0.72) *
      clamp((speedMismatch + 18) / 42, 0.22, 1.15),
    0.015,
    safetyHelpActive ? 0.18 : 0.42,
  );
  const outcome = outcomeFromRoll({
    roll: random(),
    pressWinProbability,
    releaseWinProbability,
    overTopProbability,
  });

  const baseTimingDisruption = clamp(
    pressWinProbability * 0.42 +
      Math.max(pressEdge, 0) / 210 +
      (isQuickRoute(input.routeType) ? 0.12 : 0) -
      Math.max(-pressEdge, 0) / 260,
    0,
    0.86,
  );
  const outcomeTimingModifier =
    outcome === "PRESS_WIN"
      ? 0.16
      : outcome === "RELEASE_WIN"
        ? -0.08
        : outcome === "STACKED_OVER_TOP"
          ? -0.12
          : 0;
  const timingDisruption = round(
    clamp(baseTimingDisruption + outcomeTimingModifier, 0, 0.92),
  );
  const routeDevelopmentTimeDelta = round(
    clamp(
      timingDisruption * (isQuickRoute(input.routeType) ? 0.42 : 0.32) -
        (outcome === "STACKED_OVER_TOP" ? 0.09 : 0) -
        (outcome === "RELEASE_WIN" ? 0.04 : 0),
      -0.16,
      0.52,
    ),
  );
  const separationDelta = round(
    clamp(
      outcome === "PRESS_WIN"
        ? -0.18 - timingDisruption * 0.22
        : outcome === "STACKED_OVER_TOP"
          ? 0.32 + Math.max(speedMismatch, 0) / 120
          : outcome === "RELEASE_WIN"
            ? 0.16 + Math.max(-pressEdge, 0) / 160
            : -0.04 + Math.max(-pressEdge, 0) / 260,
      -0.46,
      0.58,
    ),
  );
  const bigPlayRiskDelta = round(
    clamp(
      outcome === "STACKED_OVER_TOP"
        ? 0.2 + verticalPunishPotential(input.routeType) * 0.11 - (safetyHelpActive ? 0.13 : 0)
        : outcome === "RELEASE_WIN"
          ? 0.07 * verticalPunishPotential(input.routeType) - (safetyHelpActive ? 0.045 : 0)
          : outcome === "PRESS_WIN"
            ? -0.05 - (safetyHelpActive ? 0.035 : 0)
            : safetyHelpActive
              ? -0.02
              : 0.015,
      -0.12,
      0.42,
    ),
  );
  const quickPassPenalty = round(
    isQuickRoute(input.routeType)
      ? clamp(timingDisruption * (1.08 - input.qbTiming * 0.18), 0, 0.72)
      : 0,
  );

  return {
    outcome,
    pressWinProbability,
    releaseWinProbability,
    safetyHelpActive,
    routeDevelopmentTimeDelta,
    timingDisruption,
    separationDelta,
    bigPlayRiskDelta,
    quickPassPenalty,
    trace: {
      notes: [
        `${input.defenseFamily} press look against ${input.routeType}.`,
        safetyHelpActive
          ? "Safety help is available over the top."
          : "No reliable safety help behind the press.",
        outcome === "PRESS_WIN"
          ? "Press disrupts the release and delays the route."
          : outcome === "STACKED_OVER_TOP"
            ? "Receiver beats press cleanly and threatens vertically."
            : outcome === "RELEASE_WIN"
              ? "Receiver wins the release and protects timing."
              : "Press creates a neutral release outcome.",
      ],
      factors: [
        { label: "defenderPressScore", value: round(defenderPressScore, 2) },
        { label: "receiverReleaseScore", value: round(receiverReleaseScore, 2) },
        { label: "pressEdge", value: round(pressEdge, 2) },
        { label: "speedMismatch", value: round(speedMismatch, 2) },
        { label: "routeSensitivity", value: routeSensitivity },
        { label: "coveragePressBias", value: coverageBias },
        { label: "overTopProbability", value: round(overTopProbability) },
      ],
      gameReportRows: [
        { label: "Press Outcome", value: outcome },
        { label: "Timing Disruption", value: `${round(timingDisruption * 100, 1)}%` },
        {
          label: "Route Development Delta",
          value: `${routeDevelopmentTimeDelta >= 0 ? "+" : ""}${routeDevelopmentTimeDelta}s`,
        },
        {
          label: "Separation Delta",
          value: `${separationDelta >= 0 ? "+" : ""}${separationDelta}`,
        },
        {
          label: "Big Play Risk Delta",
          value: `${bigPlayRiskDelta >= 0 ? "+" : ""}${bigPlayRiskDelta}`,
        },
      ],
    },
  };
}
