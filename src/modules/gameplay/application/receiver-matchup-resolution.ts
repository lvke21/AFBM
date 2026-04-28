import type { RouteDevelopmentTier } from "./qb-decision-time-resolution";
import type { PressCoverageResolution } from "./press-coverage-resolution";

export type ReceiverRouteTarget = {
  id: string;
  label: string;
  routeDepth: RouteDevelopmentTier;
  baseYards: number;
  receiver: {
    release: number;
    routeRunning: number;
    separation: number;
    catching: number;
    speed: number;
    acceleration: number;
    yardsAfterCatch: number;
  };
  defender: {
    manCoverage: number;
    zoneCoverage: number;
    ballSkills: number;
    tackling: number;
    speed: number;
    acceleration: number;
  };
  press?: Pick<
    PressCoverageResolution,
    | "routeDevelopmentTimeDelta"
    | "timingDisruption"
    | "separationDelta"
    | "bigPlayRiskDelta"
    | "quickPassPenalty"
  > | null;
};

export type QuarterbackTargetSelectionProfile = {
  decisionMaking: number;
  awareness: number;
  command: number;
  coverageRead: number;
  riskTolerance: number;
  gameplan: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  throwAccuracy: number;
};

export type ReceiverMatchupPressure = {
  pressureLevel: number;
  pocketStability: number;
  openBlitzLaneRisk: number;
};

export type ReceiverMatchupInput = {
  targets: ReceiverRouteTarget[];
  routeAvailability: Record<RouteDevelopmentTier, boolean>;
  qb: QuarterbackTargetSelectionProfile;
  pressure: ReceiverMatchupPressure;
  chemistryModifier?: {
    qbReceiver?: {
      routeTimingModifier: number;
      targetSelectionBonus: number;
      catchWindowModifier: number;
    };
    defensiveBack?: {
      coverageSupportModifier: number;
      zoneHandoffModifier: number;
      safetyHelpModifier: number;
    };
  };
  matchupSeed?: string;
  random?: () => number;
};

export type ReceiverPassOutcome =
  | "COMPLETE"
  | "INCOMPLETE"
  | "DROP"
  | "PASS_BREAKUP"
  | "INTERCEPTION";

export type TargetSelectionLogEntry = {
  targetId: string;
  routeDepth: RouteDevelopmentTier;
  isAvailable: boolean;
  score: number;
  reasons: string[];
};

export type ReceiverMatchupTrace = {
  notes: string[];
  targetSelection: TargetSelectionLogEntry[];
  factors: Array<{
    label: string;
    value: number;
  }>;
  gameReportRows: Array<{
    label: string;
    value: string;
  }>;
};

export type ReceiverMatchupResolution = {
  selectedTarget: ReceiverRouteTarget | null;
  availableTargetCount: number;
  pressureModifier: number;
  passQuality: number;
  separationScore: number;
  coverageScore: number;
  catchScore: number;
  ballSkillScore: number;
  completionProbability: number;
  dropProbability: number;
  breakupProbability: number;
  interceptionProbability: number;
  yacYards: number;
  outcome: ReceiverPassOutcome | "NO_TARGET";
  trace: ReceiverMatchupTrace;
};

const DEPTH_ORDER: RouteDevelopmentTier[] = ["QUICK", "SHORT", "MEDIUM", "DEEP"];

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

export function createReceiverMatchupRandom(seed: string) {
  return mulberry32(hashString(seed));
}

function depthRisk(routeDepth: RouteDevelopmentTier) {
  return DEPTH_ORDER.indexOf(routeDepth) / 3;
}

function gameplanDepthBias(
  gameplan: QuarterbackTargetSelectionProfile["gameplan"],
  routeDepth: RouteDevelopmentTier,
) {
  const risk = depthRisk(routeDepth);

  if (gameplan === "CONSERVATIVE") {
    return 0.18 - risk * 0.3;
  }

  if (gameplan === "AGGRESSIVE") {
    return -0.04 + risk * 0.24;
  }

  return risk <= 0.33 ? 0.05 : risk >= 1 ? -0.02 : 0.02;
}

function coverageScoreForTarget(target: ReceiverRouteTarget, coverageRead: number) {
  const depth = depthRisk(target.routeDepth);
  const coverage =
    target.defender.manCoverage * (0.58 - depth * 0.1) +
    target.defender.zoneCoverage * (0.24 + depth * 0.08) +
    target.defender.speed * 0.1 +
    target.defender.acceleration * 0.08;
  const readAdjustment = (coverageRead - 72) * 0.08;

  return coverage - readAdjustment;
}

function separationForTarget(target: ReceiverRouteTarget) {
  return (
    target.receiver.separation * 0.36 +
    target.receiver.routeRunning * 0.24 +
    target.receiver.release * 0.16 +
    target.receiver.speed * 0.14 +
    target.receiver.acceleration * 0.1 +
    (target.press?.separationDelta ?? 0) * 100 -
    (target.press?.timingDisruption ?? 0) * 18
  );
}

function targetScore(input: {
  target: ReceiverRouteTarget;
  qb: QuarterbackTargetSelectionProfile;
  pressure: ReceiverMatchupPressure;
  targetSelectionBonus: number;
  coverageSupportModifier: number;
}) {
  const separation = separationForTarget(input.target);
  const coverage = coverageScoreForTarget(input.target, input.qb.coverageRead);
  const risk = depthRisk(input.target.routeDepth);
  const pressurePenalty =
    input.pressure.pressureLevel * (0.2 + risk * 0.22) +
    input.pressure.openBlitzLaneRisk * 0.18 +
    Math.max(input.target.press?.quickPassPenalty ?? 0, 0) * 0.16;
  const qbProcessing =
    input.qb.decisionMaking * 0.18 +
    input.qb.awareness * 0.14 +
    input.qb.command * 0.1;
  const riskToleranceBonus = (input.qb.riskTolerance - 50) * (risk - 0.35) * 0.012;
  const score =
    separation * 0.42 -
    coverage * 0.34 +
    qbProcessing * 0.1 +
    input.targetSelectionBonus * 100 -
    input.coverageSupportModifier * 70 +
    gameplanDepthBias(input.qb.gameplan, input.target.routeDepth) * 100 +
    riskToleranceBonus * 100 -
    pressurePenalty * 100 +
    input.target.baseYards * 0.18;

  return round(score, 3);
}

function selectTarget(input: {
  targets: ReceiverRouteTarget[];
  routeAvailability: Record<RouteDevelopmentTier, boolean>;
  qb: QuarterbackTargetSelectionProfile;
  pressure: ReceiverMatchupPressure;
  targetSelectionBonus: number;
  coverageSupportModifier: number;
}) {
  const log: TargetSelectionLogEntry[] = input.targets.map((target) => {
    const isAvailable = input.routeAvailability[target.routeDepth];
    const score = isAvailable
      ? targetScore({
          target,
          qb: input.qb,
          pressure: input.pressure,
          targetSelectionBonus: input.targetSelectionBonus,
          coverageSupportModifier: input.coverageSupportModifier,
        })
      : -999;

    return {
      targetId: target.id,
      routeDepth: target.routeDepth,
      isAvailable,
      score,
      reasons: [
        isAvailable
          ? `${target.routeDepth} route available after QB decision time.`
          : `${target.routeDepth} route not developed before QB decision point.`,
        `Gameplan ${input.qb.gameplan}.`,
      ],
    };
  });
  const selected = [...log]
    .filter((entry) => entry.isAvailable)
    .sort((left, right) => right.score - left.score)[0];

  return {
    selectedTarget:
      input.targets.find((target) => target.id === selected?.targetId) ?? null,
    log,
  };
}

function outcomeFromRoll(input: {
  roll: number;
  completionProbability: number;
  dropProbability: number;
  breakupProbability: number;
  interceptionProbability: number;
}): ReceiverPassOutcome {
  if (input.roll < input.interceptionProbability) {
    return "INTERCEPTION";
  }

  if (input.roll < input.interceptionProbability + input.dropProbability) {
    return "DROP";
  }

  if (
    input.roll <
    input.interceptionProbability + input.dropProbability + input.breakupProbability
  ) {
    return "PASS_BREAKUP";
  }

  if (
    input.roll <
    input.interceptionProbability +
      input.dropProbability +
      input.breakupProbability +
      input.completionProbability
  ) {
    return "COMPLETE";
  }

  return "INCOMPLETE";
}

export function resolveReceiverMatchup(
  input: ReceiverMatchupInput,
): ReceiverMatchupResolution {
  const random =
    input.random ??
    createReceiverMatchupRandom(input.matchupSeed ?? "receiver-matchup");
  const selection = selectTarget({
    targets: input.targets,
    routeAvailability: input.routeAvailability,
    qb: input.qb,
    pressure: input.pressure,
    targetSelectionBonus:
      input.chemistryModifier?.qbReceiver?.targetSelectionBonus ?? 0,
    coverageSupportModifier:
      input.chemistryModifier?.defensiveBack?.coverageSupportModifier ?? 0,
  });

  if (!selection.selectedTarget) {
    return {
      selectedTarget: null,
      availableTargetCount: 0,
      pressureModifier: 0,
      passQuality: 0,
      separationScore: 0,
      coverageScore: 0,
      catchScore: 0,
      ballSkillScore: 0,
      completionProbability: 0,
      dropProbability: 0,
      breakupProbability: 0,
      interceptionProbability: 0,
      yacYards: 0,
      outcome: "NO_TARGET",
      trace: {
        notes: ["No route target was available after QB decision time."],
        targetSelection: selection.log,
        factors: [],
        gameReportRows: [
          { label: "Selected Target", value: "None" },
          { label: "Pass Outcome", value: "NO_TARGET" },
        ],
      },
    };
  }

  const target = selection.selectedTarget;
  const depth = depthRisk(target.routeDepth);
  const routeTimingModifier =
    input.chemistryModifier?.qbReceiver?.routeTimingModifier ?? 0;
  const catchWindowModifier =
    input.chemistryModifier?.qbReceiver?.catchWindowModifier ?? 0;
  const coverageSupportModifier =
    input.chemistryModifier?.defensiveBack?.coverageSupportModifier ?? 0;
  const zoneHandoffModifier =
    input.chemistryModifier?.defensiveBack?.zoneHandoffModifier ?? 0;
  const safetyHelpModifier =
    input.chemistryModifier?.defensiveBack?.safetyHelpModifier ?? 0;
  const pressureModifier = round(
    clamp(
      -input.pressure.pressureLevel * (0.16 + depth * 0.11) -
        input.pressure.openBlitzLaneRisk * 0.11 +
        input.pressure.pocketStability * 0.05 -
        (target.press?.quickPassPenalty ?? 0) * 0.08,
      -0.38,
      0.08,
    ),
  );
  const separationScore = round(
    separationForTarget(target) + routeTimingModifier * 24,
    2,
  );
  const coverageScore = round(
    coverageScoreForTarget(target, input.qb.coverageRead) +
      coverageSupportModifier * 60 +
      zoneHandoffModifier * 45 +
      safetyHelpModifier * 35,
    2,
  );
  const catchScore = round(
    target.receiver.catching * 0.72 +
      target.receiver.routeRunning * 0.14 +
      target.receiver.separation * 0.14,
    2,
  );
  const ballSkillScore = round(
    target.defender.ballSkills * 0.68 +
      target.defender.manCoverage * 0.16 +
      target.defender.zoneCoverage * 0.16,
    2,
  );
  const accuracyDepthPenalty = depth * 8.5;
  const passQuality = round(
    clamp(
      input.qb.throwAccuracy +
        (input.qb.decisionMaking - 72) * 0.08 +
        (input.qb.command - 72) * 0.05 -
        accuracyDepthPenalty +
        pressureModifier * 100,
      35,
      99,
    ),
    2,
  );
  const matchupEdge = separationScore - coverageScore;
  const completionProbability = round(
    clamp(
      0.54 +
        matchupEdge / 190 +
        (passQuality - 72) / 180 +
        (catchScore - 72) / 260 -
        depth * 0.12 +
        catchWindowModifier -
        coverageSupportModifier * 0.45,
      0.12,
      0.9,
    ),
  );
  const dropProbability = round(
    clamp(0.045 + Math.max(72 - catchScore, 0) / 340 + Math.max(depth - 0.66, 0) * 0.015, 0.01, 0.18),
  );
  const breakupProbability = round(
    clamp(
      0.08 +
        Math.max(-matchupEdge, 0) / 210 +
        (ballSkillScore - 72) / 420 -
        Math.max(passQuality - 72, 0) / 520 +
        coverageSupportModifier * 0.35,
      0.025,
      0.32,
    ),
  );
  const interceptionProbability = round(
    clamp(
      0.018 +
        Math.max(coverageScore - separationScore, 0) / 420 +
        Math.max(ballSkillScore - passQuality, 0) / 520 +
        input.pressure.pressureLevel * 0.035 +
        depth * 0.018 -
        (input.qb.decisionMaking - 72) / 850 +
        zoneHandoffModifier * 0.22,
      0.003,
      0.16,
    ),
  );
  const outcome = outcomeFromRoll({
    roll: random(),
    completionProbability,
    dropProbability,
    breakupProbability,
    interceptionProbability,
  });
  const yacYards =
    outcome === "COMPLETE"
      ? Math.max(
          0,
          Math.round(
            2 +
              target.receiver.yardsAfterCatch / 18 +
              Math.max(separationScore - coverageScore, 0) / 18 -
              target.defender.tackling / 28 +
              (target.press?.bigPlayRiskDelta ?? 0) * 8,
          ),
        )
      : 0;

  return {
    selectedTarget: target,
    availableTargetCount: selection.log.filter((entry) => entry.isAvailable).length,
    pressureModifier,
    passQuality,
    separationScore,
    coverageScore,
    catchScore,
    ballSkillScore,
    completionProbability,
    dropProbability,
    breakupProbability,
    interceptionProbability,
    yacYards,
    outcome,
    trace: {
      notes: [
        `QB selected ${target.label} at ${target.routeDepth} depth.`,
        `Pressure modifier changed pass quality by ${round(pressureModifier * 100, 1)} points.`,
        `Receiver/defender matchup edge is ${round(matchupEdge, 2)}.`,
      ],
      targetSelection: selection.log,
      factors: [
        { label: "pressureModifier", value: pressureModifier },
        { label: "passQuality", value: passQuality },
        { label: "separationScore", value: separationScore },
        { label: "coverageScore", value: coverageScore },
        { label: "catchScore", value: catchScore },
        { label: "ballSkillScore", value: ballSkillScore },
        { label: "completionProbability", value: completionProbability },
        { label: "interceptionProbability", value: interceptionProbability },
        { label: "chemistryRouteTiming", value: routeTimingModifier },
        { label: "chemistryCatchWindow", value: catchWindowModifier },
        { label: "chemistryCoverageSupport", value: coverageSupportModifier },
      ],
      gameReportRows: [
        { label: "Selected Target", value: target.label },
        { label: "Route Depth", value: target.routeDepth },
        { label: "Pass Quality", value: `${passQuality}` },
        { label: "Pass Outcome", value: outcome },
        { label: "YAC", value: `${yacYards}` },
      ],
    },
  };
}
