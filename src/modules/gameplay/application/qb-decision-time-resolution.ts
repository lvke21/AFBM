import type {
  OffensivePlayDefinition,
  OffensivePlayFamily,
} from "../domain/play-library";
import type { PassProtectionResolution } from "./pass-protection-resolution";

type DecisionTimeOffensePlay = Pick<
  OffensivePlayDefinition,
  "id" | "family" | "label" | "expectedMetrics"
>;

export type RouteDevelopmentTier = "QUICK" | "SHORT" | "MEDIUM" | "DEEP";

export type QuarterbackDecisionOutcome =
  | "PASS_ATTEMPT"
  | "THROWAWAY"
  | "SCRAMBLE"
  | "SACK"
  | "SACK_FUMBLE";

export type QuarterbackDecisionTimeInput = {
  offensePlay: DecisionTimeOffensePlay;
  passProtection: Pick<
    PassProtectionResolution,
    | "blockerCount"
    | "rusherCount"
    | "protectionAdvantage"
    | "doubleTeamChance"
    | "openBlitzLaneRisk"
    | "pressureLevel"
    | "pocketStability"
    | "isBlitz"
    | "isQuickCounter"
  >;
  qbPocketPresence: number;
  qbAwareness: number;
  qbDecisionMaking: number;
  qbCommand: number;
  qbMobility?: number;
  decisionSeed?: string;
  random?: () => number;
};

export type RouteAvailability = Record<RouteDevelopmentTier, boolean>;

export type QuarterbackDecisionTraceFactor = {
  label: string;
  value: number;
};

export type QuarterbackDecisionTrace = {
  notes: string[];
  factors: QuarterbackDecisionTraceFactor[];
  routeDevelopmentSeconds: Record<RouteDevelopmentTier, number>;
  gameReportRows: Array<{
    label: string;
    value: string;
  }>;
};

export type QuarterbackDecisionTimeResolution = {
  routeDepth: RouteDevelopmentTier;
  requiredDevelopmentTime: number;
  availableDecisionTime: number;
  timeToPressure: number;
  processingSpeed: number;
  routeAvailability: RouteAvailability;
  canThrow: boolean;
  outcome: QuarterbackDecisionOutcome;
  throwawayRisk: number;
  scrambleChance: number;
  sackRisk: number;
  sackFumbleRisk: number;
  trace: QuarterbackDecisionTrace;
};

export const ROUTE_DEVELOPMENT_SECONDS: Record<RouteDevelopmentTier, number> = {
  QUICK: 0.95,
  SHORT: 1.35,
  MEDIUM: 2.05,
  DEEP: 2.85,
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

export function createQuarterbackDecisionRandom(seed: string) {
  return mulberry32(hashString(seed));
}

export function routeDepthForPlay(
  family: OffensivePlayFamily,
  expectedYards: number,
): RouteDevelopmentTier {
  switch (family) {
    case "SCREEN":
      return "QUICK";
    case "QUICK_PASS":
    case "EMPTY_TEMPO":
      return expectedYards > 7 ? "SHORT" : "QUICK";
    case "MOVEMENT_PASS":
    case "OPTION_RPO":
      return expectedYards > 8 ? "MEDIUM" : "SHORT";
    case "PLAY_ACTION":
      return expectedYards >= 9 ? "DEEP" : "MEDIUM";
    case "DROPBACK":
      return expectedYards >= 10 ? "DEEP" : "MEDIUM";
    default:
      return "SHORT";
  }
}

function availableRoutes(availableDecisionTime: number): RouteAvailability {
  return {
    QUICK: availableDecisionTime >= ROUTE_DEVELOPMENT_SECONDS.QUICK,
    SHORT: availableDecisionTime >= ROUTE_DEVELOPMENT_SECONDS.SHORT,
    MEDIUM: availableDecisionTime >= ROUTE_DEVELOPMENT_SECONDS.MEDIUM,
    DEEP: availableDecisionTime >= ROUTE_DEVELOPMENT_SECONDS.DEEP,
  };
}

function bestAvailableDepth(
  desired: RouteDevelopmentTier,
  availability: RouteAvailability,
): RouteDevelopmentTier | null {
  const order: RouteDevelopmentTier[] = ["QUICK", "SHORT", "MEDIUM", "DEEP"];
  const desiredIndex = order.indexOf(desired);

  for (let index = desiredIndex; index >= 0; index -= 1) {
    const tier = order[index] as RouteDevelopmentTier;

    if (availability[tier]) {
      return tier;
    }
  }

  return null;
}

function timingBonus(family: OffensivePlayFamily) {
  switch (family) {
    case "SCREEN":
      return 0.34;
    case "QUICK_PASS":
      return 0.24;
    case "EMPTY_TEMPO":
      return 0.18;
    case "MOVEMENT_PASS":
    case "OPTION_RPO":
      return 0.12;
    case "PLAY_ACTION":
      return -0.08;
    case "DROPBACK":
      return -0.12;
    default:
      return 0;
  }
}

function pickOutcome(input: {
  canThrow: boolean;
  sackRisk: number;
  sackFumbleRisk: number;
  scrambleChance: number;
  throwawayRisk: number;
  random: () => number;
}) {
  if (input.canThrow && input.random() > input.sackRisk * 0.45) {
    return "PASS_ATTEMPT" satisfies QuarterbackDecisionOutcome;
  }

  if (input.random() < input.sackFumbleRisk) {
    return "SACK_FUMBLE" satisfies QuarterbackDecisionOutcome;
  }

  if (input.random() < input.scrambleChance) {
    return "SCRAMBLE" satisfies QuarterbackDecisionOutcome;
  }

  if (input.random() < input.throwawayRisk) {
    return "THROWAWAY" satisfies QuarterbackDecisionOutcome;
  }

  if (input.random() < input.sackRisk) {
    return "SACK" satisfies QuarterbackDecisionOutcome;
  }

  return input.canThrow
    ? ("PASS_ATTEMPT" satisfies QuarterbackDecisionOutcome)
    : ("THROWAWAY" satisfies QuarterbackDecisionOutcome);
}

export function resolveQuarterbackDecisionTime(
  input: QuarterbackDecisionTimeInput,
): QuarterbackDecisionTimeResolution {
  const random =
    input.random ??
    createQuarterbackDecisionRandom(
      input.decisionSeed ?? `${input.offensePlay.id}:qb-decision`,
    );
  const protection = input.passProtection;
  const family = input.offensePlay.family;
  const routeDepth = routeDepthForPlay(
    family,
    input.offensePlay.expectedMetrics.expectedYards,
  );
  const requiredDevelopmentTime =
    ROUTE_DEVELOPMENT_SECONDS[routeDepth] -
    timingBonus(family) * 0.25;
  const processingScore =
    input.qbDecisionMaking * 0.34 +
    input.qbAwareness * 0.26 +
    input.qbPocketPresence * 0.22 +
    input.qbCommand * 0.18;
  const processingSpeed = clamp(
    1 +
      (processingScore - 72) / 160 +
      timingBonus(family) * 0.32 -
      protection.pressureLevel * 0.08,
    0.72,
    1.28,
  );
  const timeToPressure = clamp(
    1.15 +
      protection.pocketStability * 1.55 +
      protection.doubleTeamChance * 0.38 +
      protection.protectionAdvantage / 85 -
      protection.pressureLevel * 0.78 -
      protection.openBlitzLaneRisk * 0.95 -
      (protection.isBlitz ? 0.18 : 0),
    0.55,
    4.2,
  );
  const availableDecisionTime = clamp(
    timeToPressure * processingSpeed +
      (input.qbPocketPresence - 72) / 210 +
      timingBonus(family) * 1.1,
    0.45,
    4.4,
  );
  const routeAvailability = availableRoutes(availableDecisionTime);
  const availableDepth = bestAvailableDepth(routeDepth, routeAvailability);
  const canThrow = availableDepth != null;
  const pressureStress = clamp(
    protection.pressureLevel +
      protection.openBlitzLaneRisk * 0.65 +
      Math.max(requiredDevelopmentTime - availableDecisionTime, 0) * 0.22,
    0,
    1,
  );
  const poiseFactor = clamp((processingScore - 72) / 100, -0.45, 0.45);
  const mobility = input.qbMobility ?? 70;
  const throwawayRisk = round(
    clamp(
      0.12 +
        pressureStress * 0.34 +
        Math.max(input.qbDecisionMaking - 72, 0) / 260 +
        Math.max(input.qbAwareness - 72, 0) / 320 -
        Math.max(72 - input.qbDecisionMaking, 0) / 260,
      0.04,
      0.74,
    ),
  );
  const scrambleChance = round(
    clamp(
      0.08 +
        pressureStress * 0.18 +
        (mobility - 72) / 260 +
        (input.qbPocketPresence - 72) / 340 -
        protection.openBlitzLaneRisk * 0.08,
      0.02,
      0.48,
    ),
  );
  const sackRisk = round(
    clamp(
      0.08 +
        pressureStress * 0.48 +
        Math.max(requiredDevelopmentTime - availableDecisionTime, 0) * 0.06 -
        poiseFactor * 0.28 -
        Math.max(mobility - 72, 0) / 360,
      0.015,
      0.86,
    ),
  );
  const sackFumbleRisk = round(
    clamp(
      sackRisk *
        (0.08 +
          protection.openBlitzLaneRisk * 0.16 +
          Math.max(72 - input.qbAwareness, 0) / 520 +
          Math.max(72 - input.qbCommand, 0) / 620),
      0.002,
      0.22,
    ),
  );
  const outcome = pickOutcome({
    canThrow,
    sackRisk,
    sackFumbleRisk,
    scrambleChance,
    throwawayRisk,
    random,
  });

  return {
    routeDepth,
    requiredDevelopmentTime: round(requiredDevelopmentTime),
    availableDecisionTime: round(availableDecisionTime),
    timeToPressure: round(timeToPressure),
    processingSpeed: round(processingSpeed),
    routeAvailability,
    canThrow,
    outcome,
    throwawayRisk,
    scrambleChance,
    sackRisk,
    sackFumbleRisk,
    trace: {
      notes: [
        `${family} targets ${routeDepth.toLowerCase()} timing.`,
        `QB has ${round(availableDecisionTime, 2)}s available against ${round(timeToPressure, 2)}s time-to-pressure.`,
        canThrow
          ? `${availableDepth} route window is available.`
          : "No route window developed before pressure arrived.",
      ],
      factors: [
        { label: "requiredDevelopmentTime", value: round(requiredDevelopmentTime) },
        { label: "availableDecisionTime", value: round(availableDecisionTime) },
        { label: "timeToPressure", value: round(timeToPressure) },
        { label: "processingScore", value: round(processingScore, 2) },
        { label: "processingSpeed", value: round(processingSpeed) },
        { label: "pressureStress", value: round(pressureStress) },
        { label: "sackRisk", value: sackRisk },
        { label: "sackFumbleRisk", value: sackFumbleRisk },
        { label: "throwawayRisk", value: throwawayRisk },
        { label: "scrambleChance", value: scrambleChance },
      ],
      routeDevelopmentSeconds: ROUTE_DEVELOPMENT_SECONDS,
      gameReportRows: [
        { label: "QB Decision Time", value: `${round(availableDecisionTime, 2)}s` },
        { label: "Time To Pressure", value: `${round(timeToPressure, 2)}s` },
        { label: "Route Target", value: routeDepth },
        { label: "Decision Outcome", value: outcome },
      ],
    },
  };
}
