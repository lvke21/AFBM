import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
} from "../domain/play-library";
import {
  resolvePassProtection,
  type PassProtectionResolution,
} from "./pass-protection-resolution";
import {
  resolveQuarterbackDecisionTime,
  type QuarterbackDecisionTimeResolution,
} from "./qb-decision-time-resolution";
import {
  resolvePressCoverage,
  type PressCoverageResolution,
  type PressRouteType,
} from "./press-coverage-resolution";
import {
  resolveReceiverMatchup,
  type ReceiverMatchupResolution,
  type ReceiverRouteTarget,
} from "./receiver-matchup-resolution";
import {
  resolveRunLane,
  type RunDirection,
  type RunLaneResolution,
} from "./run-lane-resolution";

export type OffensivePassProtectionRatings = {
  PASS_BLOCK: number;
  FOOTWORK: number;
  ANCHOR: number;
  HAND_TECHNIQUE?: number;
  PASS_PROTECTION?: number;
};

export type DefensivePassRushRatings = {
  PASS_RUSH: number;
  POWER_MOVES: number;
  FINESSE_MOVES: number;
  BLOCK_SHEDDING: number;
};

export type QuarterbackDevelopmentRatings = {
  POCKET_PRESENCE: number;
  AWARENESS: number;
  DECISION_MAKING: number;
  COMMAND: number;
  MOBILITY?: number;
  THROW_ACCURACY?: number;
  COVERAGE_READ?: number;
  RISK_TOLERANCE?: number;
};

export type ReceiverDevelopmentRatings = {
  RELEASE: number;
  ROUTE_RUNNING: number;
  SEPARATION: number;
  CATCHING: number;
  CONTESTED_CATCH: number;
  SPEED?: number;
  ACCELERATION?: number;
  YARDS_AFTER_CATCH?: number;
};

export type CoverageDevelopmentRatings = {
  PRESS: number;
  MAN_COVERAGE: number;
  ZONE_COVERAGE: number;
  COVERAGE_RANGE: number;
  BALL_SKILLS: number;
  PLAY_RECOGNITION: number;
  TACKLING?: number;
  SPEED?: number;
  ACCELERATION?: number;
};

export type OffensiveRunBlockingRatings = {
  RUN_BLOCK: number;
  STRENGTH: number;
  TOUGHNESS: number;
  HAND_TECHNIQUE?: number;
  ANCHOR?: number;
};

export type RunningBackDevelopmentRatings = {
  VISION: number;
  ELUSIVENESS: number;
  BREAK_TACKLE: number;
};

export type DefensiveRunFitRatings = {
  RUN_DEFENSE: number;
  BLOCK_SHEDDING: number;
  TACKLING: number;
  PLAY_RECOGNITION?: number;
};

export type PlayDevelopmentTraceStage = {
  stage:
    | "PASS_PROTECTION"
    | "QB_DECISION_TIME"
    | "PRESS_COVERAGE"
    | "TARGET_SELECTION"
    | "RECEIVER_MATCHUP"
    | "RUN_LANE"
    | "RUN_INTERPRETATION";
  label: string;
  values: Record<string, number | string | boolean>;
  notes: string[];
};

export type PlayDevelopmentTrace = {
  path: "PASS" | "RUN";
  notes: string[];
  stages: PlayDevelopmentTraceStage[];
};

export type PassPlayDevelopmentInput = {
  offensePlay: OffensivePlayDefinition;
  defensePlay: DefensivePlayDefinition;
  offensiveLine: OffensivePassProtectionRatings;
  passRush: DefensivePassRushRatings;
  quarterback: QuarterbackDevelopmentRatings;
  targets?: PassRouteDevelopmentTarget[];
  gameplan?: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  safetyHelp?: boolean;
  chemistryModifier?: {
    passProtectionBonus: number;
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
  decisionSeed?: string;
  pressSeed?: string;
  matchupSeed?: string;
  random?: () => number;
};

export type PassRouteDevelopmentTarget = {
  id: string;
  label: string;
  routeType: PressRouteType;
  routeDepth: ReceiverRouteTarget["routeDepth"];
  baseYards: number;
  receiver: ReceiverDevelopmentRatings;
  defender: CoverageDevelopmentRatings;
};

export type PressRouteResolution = {
  targetId: string;
  targetLabel: string;
  press: PressCoverageResolution;
};

export type PassPlayDevelopmentResolution = {
  path: "PASS";
  passBlockingComposite: number;
  passRushComposite: number;
  blockerCount: number;
  rusherCount: number;
  protectionAdvantage: number;
  doubleTeamChance: number;
  openBlitzLaneRisk: number;
  pressureLevel: number;
  pocketStability: number;
  isBlitz: boolean;
  isQuickCounter: boolean;
  decisionTime: number;
  routeAvailability: QuarterbackDecisionTimeResolution["routeAvailability"];
  decisionOutcome: QuarterbackDecisionTimeResolution["outcome"];
  canThrow: boolean;
  throwawayRisk: number;
  scrambleChance: number;
  sackRisk: number;
  sackFumbleRisk: number;
  press: PressRouteResolution[];
  receiverMatchup: ReceiverMatchupResolution | null;
  selectedTarget: ReceiverRouteTarget | null;
  passOutcome:
    | QuarterbackDecisionTimeResolution["outcome"]
    | ReceiverMatchupResolution["outcome"];
  yacYards: number;
  completionProbability: number | null;
  interceptionProbability: number | null;
  protection: PassProtectionResolution;
  quarterbackDecision: QuarterbackDecisionTimeResolution;
  trace: PlayDevelopmentTrace;
};

export type RunPlayDevelopmentInput = {
  offensePlay: OffensivePlayDefinition;
  defensePlay: DefensivePlayDefinition;
  offensiveLine: OffensiveRunBlockingRatings;
  runningBack: RunningBackDevelopmentRatings;
  defenseFront: DefensiveRunFitRatings;
  gameplanRunDirection: RunDirection;
  chemistryModifier?: {
    runBlockingBonus: number;
  };
};

export type RunLaneInterpretation =
  | "OPEN_LANE"
  | "CREATOR_LANE"
  | "DEFENSE_ADVANTAGE";

export type RunPlayDevelopmentResolution = {
  path: "RUN";
  runBlockingComposite: number;
  runDefenseComposite: number;
  blockerCount: number;
  boxDefenderCount: number;
  blockerAdvantage: number;
  laneQuality: number;
  openLaneChance: number;
  stuffedRisk: number;
  negativeYardageRisk: number;
  rbCreationChance: number;
  expectedYardsModifier: number;
  interpretation: RunLaneInterpretation;
  runLane: RunLaneResolution;
  trace: PlayDevelopmentTrace;
};

type WeightedRating = {
  value: number | undefined;
  weight: number;
  fallback: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 3) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

function weightedAverage(ratings: WeightedRating[]) {
  const totalWeight = ratings.reduce((sum, rating) => sum + rating.weight, 0);
  const total = ratings.reduce(
    (sum, rating) => sum + (rating.value ?? rating.fallback) * rating.weight,
    0,
  );

  return round(clamp(total / totalWeight, 1, 99), 2);
}

export function derivePassBlockingComposite(
  ratings: OffensivePassProtectionRatings,
) {
  return weightedAverage([
    { value: ratings.PASS_BLOCK, weight: 1.2, fallback: 72 },
    { value: ratings.FOOTWORK, weight: 1.0, fallback: 72 },
    { value: ratings.ANCHOR, weight: 0.95, fallback: 72 },
    { value: ratings.HAND_TECHNIQUE, weight: 0.85, fallback: ratings.PASS_BLOCK },
    { value: ratings.PASS_PROTECTION, weight: 0.55, fallback: ratings.PASS_BLOCK },
  ]);
}

export function derivePassRushComposite(ratings: DefensivePassRushRatings) {
  return weightedAverage([
    { value: ratings.PASS_RUSH, weight: 1.15, fallback: 72 },
    { value: ratings.POWER_MOVES, weight: 0.95, fallback: 72 },
    { value: ratings.FINESSE_MOVES, weight: 0.95, fallback: 72 },
    { value: ratings.BLOCK_SHEDDING, weight: 0.8, fallback: 72 },
  ]);
}

export function deriveRunBlockingComposite(
  ratings: OffensiveRunBlockingRatings,
) {
  return weightedAverage([
    { value: ratings.RUN_BLOCK, weight: 1.15, fallback: 72 },
    { value: ratings.HAND_TECHNIQUE, weight: 0.85, fallback: ratings.RUN_BLOCK },
    { value: ratings.STRENGTH, weight: 0.85, fallback: 72 },
    { value: ratings.ANCHOR, weight: 0.65, fallback: ratings.STRENGTH },
    { value: ratings.TOUGHNESS, weight: 0.6, fallback: 72 },
  ]);
}

export function deriveRunDefenseComposite(ratings: DefensiveRunFitRatings) {
  return weightedAverage([
    { value: ratings.RUN_DEFENSE, weight: 1.0, fallback: 72 },
    { value: ratings.BLOCK_SHEDDING, weight: 0.9, fallback: 72 },
    { value: ratings.TACKLING, weight: 0.85, fallback: 72 },
    { value: ratings.PLAY_RECOGNITION, weight: 0.75, fallback: ratings.RUN_DEFENSE },
  ]);
}

function routeAvailabilitySummary(
  availability: QuarterbackDecisionTimeResolution["routeAvailability"],
) {
  return Object.entries(availability)
    .filter(([, isAvailable]) => isAvailable)
    .map(([depth]) => depth)
    .join(", ") || "NONE";
}

function pressTimingForFamily(family: OffensivePlayDefinition["family"]) {
  if (family === "SCREEN" || family === "QUICK_PASS") {
    return 0.58;
  }

  if (family === "EMPTY_TEMPO" || family === "OPTION_RPO") {
    return 0.64;
  }

  if (family === "DROPBACK" || family === "PLAY_ACTION") {
    return 0.78;
  }

  return 0.72;
}

function deriveCoverageRead(quarterback: QuarterbackDevelopmentRatings) {
  return round(
    quarterback.COVERAGE_READ ??
      weightedAverage([
        { value: quarterback.DECISION_MAKING, weight: 1.05, fallback: 72 },
        { value: quarterback.AWARENESS, weight: 1.0, fallback: 72 },
        { value: quarterback.COMMAND, weight: 0.8, fallback: 72 },
        { value: quarterback.POCKET_PRESENCE, weight: 0.35, fallback: 72 },
      ]),
    2,
  );
}

function deriveThrowAccuracy(quarterback: QuarterbackDevelopmentRatings) {
  return round(
    quarterback.THROW_ACCURACY ??
      weightedAverage([
        { value: quarterback.DECISION_MAKING, weight: 0.45, fallback: 72 },
        { value: quarterback.AWARENESS, weight: 0.25, fallback: 72 },
        { value: quarterback.COMMAND, weight: 0.2, fallback: 72 },
        { value: quarterback.POCKET_PRESENCE, weight: 0.1, fallback: 72 },
      ]),
    2,
  );
}

function toReceiverTarget(
  target: PassRouteDevelopmentTarget,
  press: PressCoverageResolution,
): ReceiverRouteTarget {
  return {
    id: target.id,
    label: target.label,
    routeDepth: target.routeDepth,
    baseYards: target.baseYards,
    receiver: {
      release: target.receiver.RELEASE,
      routeRunning: target.receiver.ROUTE_RUNNING,
      separation: target.receiver.SEPARATION,
      catching: weightedAverage([
        { value: target.receiver.CATCHING, weight: 0.72, fallback: 72 },
        { value: target.receiver.CONTESTED_CATCH, weight: 0.28, fallback: target.receiver.CATCHING },
      ]),
      speed: target.receiver.SPEED ?? 72,
      acceleration: target.receiver.ACCELERATION ?? target.receiver.SPEED ?? 72,
      yardsAfterCatch: target.receiver.YARDS_AFTER_CATCH ?? target.receiver.SEPARATION,
    },
    defender: {
      manCoverage: weightedAverage([
        { value: target.defender.MAN_COVERAGE, weight: 0.72, fallback: 72 },
        { value: target.defender.PRESS, weight: 0.12, fallback: 72 },
        { value: target.defender.PLAY_RECOGNITION, weight: 0.16, fallback: 72 },
      ]),
      zoneCoverage: weightedAverage([
        { value: target.defender.ZONE_COVERAGE, weight: 0.68, fallback: 72 },
        { value: target.defender.COVERAGE_RANGE, weight: 0.2, fallback: 72 },
        { value: target.defender.PLAY_RECOGNITION, weight: 0.12, fallback: 72 },
      ]),
      ballSkills: target.defender.BALL_SKILLS,
      tackling: target.defender.TACKLING ?? 72,
      speed: target.defender.SPEED ?? target.defender.COVERAGE_RANGE,
      acceleration: target.defender.ACCELERATION ?? target.defender.SPEED ?? target.defender.COVERAGE_RANGE,
    },
    press,
  };
}

function resolveRoutePresses(input: {
  targets: PassRouteDevelopmentTarget[];
  defensePlay: DefensivePlayDefinition;
  offenseFamily: OffensivePlayDefinition["family"];
  safetyHelp?: boolean;
  pressSeed?: string;
}) {
  return input.targets.map((target, index): PressRouteResolution => ({
    targetId: target.id,
    targetLabel: target.label,
    press: resolvePressCoverage({
      routeType: target.routeType,
      defender: {
        press: target.defender.PRESS,
        manCoverage: target.defender.MAN_COVERAGE,
        speed: target.defender.SPEED ?? target.defender.COVERAGE_RANGE,
        acceleration:
          target.defender.ACCELERATION ?? target.defender.SPEED ?? target.defender.COVERAGE_RANGE,
      },
      receiver: {
        release: target.receiver.RELEASE,
        routeRunning: target.receiver.ROUTE_RUNNING,
        separation: target.receiver.SEPARATION,
        speed: target.receiver.SPEED ?? 72,
        acceleration: target.receiver.ACCELERATION ?? target.receiver.SPEED ?? 72,
      },
      coverageShell: input.defensePlay.structure.coverageShell,
      defenseFamily: input.defensePlay.family,
      safetyHelp: input.safetyHelp,
      qbTiming: pressTimingForFamily(input.offenseFamily),
      pressSeed: `${input.pressSeed ?? "play-development-press"}:${target.id}:${index}`,
    }),
  }));
}

function runInterpretation(result: RunLaneResolution): RunLaneInterpretation {
  if (result.blockerAdvantage > 8 && result.openLaneChance >= 0.24) {
    return "OPEN_LANE";
  }

  if (result.blockerAdvantage < -8 || result.negativeYardageRisk >= 0.18) {
    return "DEFENSE_ADVANTAGE";
  }

  return "CREATOR_LANE";
}

export function resolvePassPlayDevelopment(
  input: PassPlayDevelopmentInput,
): PassPlayDevelopmentResolution {
  const passBlockingComposite = derivePassBlockingComposite(input.offensiveLine);
  const passRushComposite = derivePassRushComposite(input.passRush);
  const protection = resolvePassProtection({
    offensePlay: input.offensePlay,
    defensePlay: input.defensePlay,
    passBlocking: passBlockingComposite,
    passRush: passRushComposite,
    qbPocketPresence: input.quarterback.POCKET_PRESENCE,
    qbAwareness: input.quarterback.AWARENESS,
    chemistryModifier: input.chemistryModifier,
  });
  const quarterbackDecision = resolveQuarterbackDecisionTime({
    offensePlay: input.offensePlay,
    passProtection: protection,
    qbPocketPresence: input.quarterback.POCKET_PRESENCE,
    qbAwareness: input.quarterback.AWARENESS,
    qbDecisionMaking: input.quarterback.DECISION_MAKING,
    qbCommand: input.quarterback.COMMAND,
    qbMobility: input.quarterback.MOBILITY,
    decisionSeed: input.decisionSeed,
    random: input.random,
  });
  const press = resolveRoutePresses({
    targets: input.targets ?? [],
    defensePlay: input.defensePlay,
    offenseFamily: input.offensePlay.family,
    safetyHelp: input.safetyHelp,
    pressSeed: input.pressSeed,
  });
  const receiverTargets = (input.targets ?? []).map((target) => {
    const targetPress = press.find((entry) => entry.targetId === target.id)?.press;

    if (!targetPress) {
      throw new Error(`Missing press resolution for target ${target.id}`);
    }

    return toReceiverTarget(target, targetPress);
  });
  const receiverMatchup =
    quarterbackDecision.outcome === "PASS_ATTEMPT" && receiverTargets.length > 0
      ? resolveReceiverMatchup({
          targets: receiverTargets,
          routeAvailability: quarterbackDecision.routeAvailability,
          qb: {
            decisionMaking: input.quarterback.DECISION_MAKING,
            awareness: input.quarterback.AWARENESS,
            command: input.quarterback.COMMAND,
            coverageRead: deriveCoverageRead(input.quarterback),
            riskTolerance: input.quarterback.RISK_TOLERANCE ?? 52,
            gameplan: input.gameplan ?? "BALANCED",
            throwAccuracy: deriveThrowAccuracy(input.quarterback),
          },
          pressure: {
            pressureLevel: protection.pressureLevel,
            pocketStability: protection.pocketStability,
            openBlitzLaneRisk: protection.openBlitzLaneRisk,
          },
          chemistryModifier: {
            qbReceiver: input.chemistryModifier?.qbReceiver,
            defensiveBack: input.chemistryModifier?.defensiveBack,
          },
          matchupSeed: input.matchupSeed,
        })
      : null;
  const trace: PlayDevelopmentTrace = {
    path: "PASS",
    notes: [
      `${input.offensePlay.family} pass development against ${input.defensePlay.family}.`,
      `Routes available: ${routeAvailabilitySummary(quarterbackDecision.routeAvailability)}.`,
    ],
    stages: [
      {
        stage: "PASS_PROTECTION",
        label: "Blocker vs Rusher",
        values: {
          blockerCount: protection.blockerCount,
          rusherCount: protection.rusherCount,
          protectionAdvantage: protection.protectionAdvantage,
          doubleTeamChance: protection.doubleTeamChance,
          openBlitzLaneRisk: protection.openBlitzLaneRisk,
          pressureLevel: protection.pressureLevel,
          pocketStability: protection.pocketStability,
          isQuickCounter: protection.isQuickCounter,
        },
        notes: protection.trace.notes,
      },
      {
        stage: "QB_DECISION_TIME",
        label: "QB Decision Time",
        values: {
          availableDecisionTime: quarterbackDecision.availableDecisionTime,
          timeToPressure: quarterbackDecision.timeToPressure,
          routeDepth: quarterbackDecision.routeDepth,
          canThrow: quarterbackDecision.canThrow,
          outcome: quarterbackDecision.outcome,
          sackRisk: quarterbackDecision.sackRisk,
          sackFumbleRisk: quarterbackDecision.sackFumbleRisk,
          throwawayRisk: quarterbackDecision.throwawayRisk,
          scrambleChance: quarterbackDecision.scrambleChance,
        },
        notes: quarterbackDecision.trace.notes,
      },
      ...(
        press.length > 0
          ? [
              {
                stage: "PRESS_COVERAGE" as const,
                label: "Press vs Release",
                values: {
                  targetsPressed: press.length,
                  avgTimingDisruption: round(
                    press.reduce((sum, entry) => sum + entry.press.timingDisruption, 0) /
                      press.length,
                  ),
                  avgSeparationDelta: round(
                    press.reduce((sum, entry) => sum + entry.press.separationDelta, 0) /
                      press.length,
                  ),
                  maxBigPlayRiskDelta: round(
                    Math.max(...press.map((entry) => entry.press.bigPlayRiskDelta)),
                  ),
                },
                notes: press.flatMap((entry) =>
                  entry.press.trace.notes.map((note) => `${entry.targetLabel}: ${note}`),
                ),
              },
            ]
          : []
      ),
      ...(
        receiverMatchup
          ? [
              {
                stage: "TARGET_SELECTION" as const,
                label: "Target Selection",
                values: {
                  availableTargets: receiverMatchup.availableTargetCount,
                  selectedTarget: receiverMatchup.selectedTarget?.label ?? "NONE",
                  selectedDepth: receiverMatchup.selectedTarget?.routeDepth ?? "NONE",
                },
                notes: receiverMatchup.trace.targetSelection.flatMap((entry) =>
                  entry.reasons.map((reason) => `${entry.targetId}: ${reason}`),
                ),
              },
              {
                stage: "RECEIVER_MATCHUP" as const,
                label: "Receiver vs Defender",
                values: {
                  outcome: receiverMatchup.outcome,
                  passQuality: receiverMatchup.passQuality,
                  pressureModifier: receiverMatchup.pressureModifier,
                  separationScore: receiverMatchup.separationScore,
                  coverageScore: receiverMatchup.coverageScore,
                  completionProbability: receiverMatchup.completionProbability,
                  interceptionProbability: receiverMatchup.interceptionProbability,
                  yacYards: receiverMatchup.yacYards,
                },
                notes: receiverMatchup.trace.notes,
              },
            ]
          : []
      ),
    ],
  };

  return {
    path: "PASS",
    passBlockingComposite,
    passRushComposite,
    blockerCount: protection.blockerCount,
    rusherCount: protection.rusherCount,
    protectionAdvantage: protection.protectionAdvantage,
    doubleTeamChance: protection.doubleTeamChance,
    openBlitzLaneRisk: protection.openBlitzLaneRisk,
    pressureLevel: protection.pressureLevel,
    pocketStability: protection.pocketStability,
    isBlitz: protection.isBlitz,
    isQuickCounter: protection.isQuickCounter,
    decisionTime: quarterbackDecision.availableDecisionTime,
    routeAvailability: quarterbackDecision.routeAvailability,
    decisionOutcome: quarterbackDecision.outcome,
    canThrow: quarterbackDecision.canThrow,
    throwawayRisk: quarterbackDecision.throwawayRisk,
    scrambleChance: quarterbackDecision.scrambleChance,
    sackRisk: quarterbackDecision.sackRisk,
    sackFumbleRisk: quarterbackDecision.sackFumbleRisk,
    press,
    receiverMatchup,
    selectedTarget: receiverMatchup?.selectedTarget ?? null,
    passOutcome: receiverMatchup?.outcome ?? quarterbackDecision.outcome,
    yacYards: receiverMatchup?.yacYards ?? 0,
    completionProbability: receiverMatchup?.completionProbability ?? null,
    interceptionProbability: receiverMatchup?.interceptionProbability ?? null,
    protection,
    quarterbackDecision,
    trace,
  };
}

export function resolveRunPlayDevelopment(
  input: RunPlayDevelopmentInput,
): RunPlayDevelopmentResolution {
  const runBlockingComposite = deriveRunBlockingComposite(input.offensiveLine);
  const runDefenseComposite = deriveRunDefenseComposite(input.defenseFront);
  const runLane = resolveRunLane({
    offensePlay: input.offensePlay,
    defensePlay: input.defensePlay,
    runBlocking: runBlockingComposite,
    strength: input.offensiveLine.STRENGTH,
    toughness: input.offensiveLine.TOUGHNESS,
    rbVision: input.runningBack.VISION,
    rbElusiveness: input.runningBack.ELUSIVENESS,
    rbBreakTackle: input.runningBack.BREAK_TACKLE,
    defenseRunDefense: runDefenseComposite,
    blockShedding: input.defenseFront.BLOCK_SHEDDING,
    tackling: input.defenseFront.TACKLING,
    playRecognition:
      input.defenseFront.PLAY_RECOGNITION ?? input.defenseFront.RUN_DEFENSE,
    gameplanRunDirection: input.gameplanRunDirection,
    chemistryModifier: input.chemistryModifier,
  });
  const interpretation = runInterpretation(runLane);
  const trace: PlayDevelopmentTrace = {
    path: "RUN",
    notes: [
      `${input.offensePlay.family} run development against ${input.defensePlay.family}.`,
      interpretation === "OPEN_LANE"
        ? "Blocking creates open-lane upside before the runner needs to create."
        : interpretation === "DEFENSE_ADVANTAGE"
          ? "Defense controls the fit and raises negative-play risk."
          : "Neutral lane: RB vision and tackle-breaking decide the finish.",
    ],
    stages: [
      {
        stage: "RUN_LANE",
        label: "Run Blocker vs Box Defender",
        values: {
          blockerCount: runLane.blockerCount,
          boxDefenderCount: runLane.boxDefenderCount,
          blockerAdvantage: runLane.blockerAdvantage,
          laneQuality: runLane.laneQuality,
          openLaneChance: runLane.openLaneChance,
          stuffedRisk: runLane.stuffedRisk,
          negativeYardageRisk: runLane.negativeYardageRisk,
          rbCreationChance: runLane.rbCreationChance,
        },
        notes: runLane.trace.notes,
      },
      {
        stage: "RUN_INTERPRETATION",
        label: "Run Result Lean",
        values: {
          interpretation,
          expectedYardsModifier: runLane.expectedYardsModifier,
        },
        notes: [
          "Lane quality influences expected yards before final tackle and ball-security resolution.",
        ],
      },
    ],
  };

  return {
    path: "RUN",
    runBlockingComposite,
    runDefenseComposite,
    blockerCount: runLane.blockerCount,
    boxDefenderCount: runLane.boxDefenderCount,
    blockerAdvantage: runLane.blockerAdvantage,
    laneQuality: runLane.laneQuality,
    openLaneChance: runLane.openLaneChance,
    stuffedRisk: runLane.stuffedRisk,
    negativeYardageRisk: runLane.negativeYardageRisk,
    rbCreationChance: runLane.rbCreationChance,
    expectedYardsModifier: runLane.expectedYardsModifier,
    interpretation,
    runLane,
    trace,
  };
}
