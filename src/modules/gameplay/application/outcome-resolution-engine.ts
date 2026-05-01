import type {
  Down,
  FieldZone,
  GameSituationSnapshot,
} from "../domain/game-situation";
import { normalizePreGameXFactorPlan } from "../domain/pre-game-x-factor";
import type {
  DefensivePlayDefinition,
  OffensivePlayDefinition,
  OffensivePlayFamily,
} from "../domain/play-library";
import type {
  MatchupFeature,
  OutcomeDistributionPoint,
  OutcomeFactor,
  OutcomeResolutionEngine,
  PlayResolutionRequest,
  PlayResolutionTrace,
  PressureEventType,
  ResolvedPlayEvent,
  ResolutionMatchupSnapshot,
  ResolutionPlayPath,
} from "../domain/play-resolution";
import {
  createEmptyPlayerStats,
  createEmptyTeamStats,
  createGameStateStatsSnapshot,
  createPlayResolutionStatsReference,
  type DriveId,
  type DriveResultType,
  type DriveStats,
  type GameStats,
  type PenaltyStats,
  type PlayerId,
  type PlayerPlayRole,
  type PlayerPlayStats,
  type PlayId,
  type PlayStats,
  type PlayStatsResultType,
  type PlayStatsType,
  type TeamId,
  type TurnoverStats,
} from "../domain/game-stats";
import { validatePlayResolutionPreSnap } from "./pre-snap-legality-engine";
import {
  DEFAULT_OUTCOME_MODEL_PARAMETERS,
  type OutcomeModelParameters,
} from "./outcome-model-parameters";
import {
  DefaultStateValueModel,
  defaultStateValueModel,
} from "./default-state-value-model";
import { createSeededRandom } from "@/lib/random/seeded-rng";

type PassModelEvaluation = {
  path: "PASS";
  completionProbability: number;
  pressureProbability: number;
  sackProbability: number;
  throwawayProbability: number;
  interceptionProbability: number;
  explosiveProbability: number;
  fumbleProbability: number;
  airYardsMean: number;
  airYardsSpread: number;
  yardsAfterCatchMean: number;
  expectedYards: number;
  notes: string[];
  factors: OutcomeFactor[];
};

type RunModelEvaluation = {
  path: "RUN";
  pressureProbability: number;
  sackProbability: number;
  stuffedProbability: number;
  explosiveProbability: number;
  fumbleProbability: number;
  baseYardsMean: number;
  baseYardsSpread: number;
  expectedYards: number;
  notes: string[];
  factors: OutcomeFactor[];
};

type ProjectionResult = {
  situation: GameSituationSnapshot;
  turnoverOnDowns: boolean;
};

const EXPLOSIVE_STATS_YARDS = 20;

export type OutcomeStatsPlayerReference = {
  playerId: PlayerId;
  teamId: TeamId;
  snapshotFullName?: string | null;
  snapshotPositionCode?: string | null;
};

export type OutcomeStatsParticipants = {
  quarterback: OutcomeStatsPlayerReference;
  ballCarrier?: OutcomeStatsPlayerReference | null;
  target?: OutcomeStatsPlayerReference | null;
  tackler?: OutcomeStatsPlayerReference | null;
  passRusher?: OutcomeStatsPlayerReference | null;
  interceptor?: OutcomeStatsPlayerReference | null;
  forcedFumbleDefender?: OutcomeStatsPlayerReference | null;
  recoveryPlayer?: OutcomeStatsPlayerReference | null;
};

export type RecordResolvedPlayStatsInput = {
  gameStats: GameStats;
  driveId: DriveId;
  playId: PlayId;
  request: PlayResolutionRequest;
  event: ResolvedPlayEvent;
  participants: OutcomeStatsParticipants;
  driveResult?: DriveResultType;
};

export type ResolveAndRecordStatsInput = {
  request: PlayResolutionRequest;
  gameStats: GameStats;
  driveId: DriveId;
  playId: PlayId;
  participants: OutcomeStatsParticipants;
  driveResult?: DriveResultType;
};

export type ResolveAndRecordStatsResult = {
  event: ResolvedPlayEvent;
  playStats: PlayStats;
  gameStats: GameStats;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function createResolutionRandom(seed: string) {
  return createSeededRandom(seed);
}

function centeredRandom(random: () => number) {
  return random() + random() - 1;
}

function incrementDown(down: Down): Down {
  if (down === 1) {
    return 2;
  }

  if (down === 2) {
    return 3;
  }

  return 4;
}

function toRatingFactor(
  rating: number,
  parameters: OutcomeModelParameters,
) {
  return clamp(
    (rating - parameters.ratingCenter) / parameters.ratingScale,
    -1.6,
    1.6,
  );
}

function featureEdge(
  features: MatchupFeature[],
  stage: MatchupFeature["stage"],
) {
  const matching = features.filter((feature) => feature.stage === stage);

  if (matching.length === 0) {
    return 0;
  }

  const mean =
    matching.reduce(
      (sum, feature) => sum + (feature.offenseScore - feature.defenseScore),
      0,
    ) / matching.length;

  return clamp(mean / 100, -0.35, 0.35);
}

function coverageModeBlend(defensePlay: DefensivePlayDefinition) {
  switch (defensePlay.family) {
    case "MAN_COVERAGE":
    case "ZERO_PRESSURE":
      return { man: 0.75, zone: 0.25 };
    case "BRACKET_SPECIALTY":
      return { man: 0.6, zone: 0.4 };
    case "MATCH_COVERAGE":
      return { man: 0.4, zone: 0.6 };
    case "DROP_EIGHT":
    case "THREE_HIGH_PACKAGE":
      return { man: 0.15, zone: 0.85 };
    case "SIMULATED_PRESSURE":
    case "FIRE_ZONE":
    case "RUN_BLITZ":
      return { man: 0.3, zone: 0.7 };
    case "RED_ZONE_PACKAGE":
      return { man: 0.55, zone: 0.45 };
    case "ZONE_COVERAGE":
    default:
      return { man: 0.2, zone: 0.8 };
  }
}

function determinePrimaryPathFamily(
  family: OffensivePlayFamily,
): ResolutionPlayPath {
  switch (family) {
    case "ZONE_RUN":
    case "GAP_RUN":
    case "DESIGNED_QB_RUN":
      return "RUN";
    case "OPTION_RPO":
      return "RUN";
    case "QUICK_PASS":
    case "DROPBACK":
    case "PLAY_ACTION":
    case "MOVEMENT_PASS":
    case "SCREEN":
    case "EMPTY_TEMPO":
    default:
      return "PASS";
  }
}

function createFactor(label: string, value: number): OutcomeFactor {
  return {
    label,
    value,
  };
}

function buildPlayMetadataNotes(input: {
  offensePlay: OffensivePlayDefinition;
  defensePlay: DefensivePlayDefinition;
}) {
  const notes: string[] = [];

  if (input.offensePlay.variantGroupId) {
    notes.push(`Offense variant group ${input.offensePlay.variantGroupId}.`);
  }

  if (input.offensePlay.packageTags?.length) {
    notes.push(`Offense packages ${input.offensePlay.packageTags.join(", ")}.`);
  }

  if (input.defensePlay.variantGroupId) {
    notes.push(`Defense variant group ${input.defensePlay.variantGroupId}.`);
  }

  if (input.defensePlay.packageTags?.length) {
    notes.push(`Defense packages ${input.defensePlay.packageTags.join(", ")}.`);
  }

  if (input.defensePlay.structure.defensiveConceptTag) {
    notes.push(`Defense concept ${input.defensePlay.structure.defensiveConceptTag}.`);
  }

  return notes;
}

function createNeutralQuarterback() {
  return {
    accuracyShort: 72,
    accuracyIntermediate: 72,
    accuracyDeep: 70,
    decision: 72,
    pocketPresence: 72,
    mobility: 70,
    armStrength: 72,
  };
}

function createNeutralReceiver() {
  return {
    routeQuality: 72,
    separation: 72,
    hands: 72,
    ballSkills: 72,
    yardsAfterCatch: 72,
    release: 72,
  };
}

function createNeutralRunner() {
  return {
    vision: 72,
    acceleration: 72,
    balance: 72,
    ballSecurity: 72,
    power: 72,
  };
}

function createNeutralOffensiveLine() {
  return {
    passProtection: 72,
    runBlocking: 72,
    comboBlocking: 72,
    edgeControl: 72,
    communication: 72,
  };
}

function createNeutralCoverage() {
  return {
    manCoverage: 72,
    zoneCoverage: 72,
    leverage: 72,
    ballHawk: 72,
    tackling: 72,
  };
}

function createNeutralPassRush() {
  return {
    pressure: 72,
    edgeRush: 72,
    interiorRush: 72,
    contain: 72,
    finishing: 72,
  };
}

function createNeutralFront() {
  return {
    boxControl: 72,
    runFit: 72,
    leverage: 72,
    pursuit: 72,
    tackling: 72,
    hitPower: 72,
  };
}

export function createNeutralResolutionMatchup(): ResolutionMatchupSnapshot {
  return {
    offense: {
      quarterback: createNeutralQuarterback(),
      primaryTarget: createNeutralReceiver(),
      primaryRunner: createNeutralRunner(),
      offensiveLine: createNeutralOffensiveLine(),
    },
    defense: {
      coverage: createNeutralCoverage(),
      passRush: createNeutralPassRush(),
      front: createNeutralFront(),
    },
    context: {
      boxDefenders: 6.5,
      leverageAdvantage: 0,
      coverageTightness: 0,
    },
  };
}

function effectiveAccuracy(
  matchup: ResolutionMatchupSnapshot,
  airYardsMean: number,
  parameters: OutcomeModelParameters,
) {
  const quarterback = matchup.offense.quarterback;
  const rating =
    airYardsMean <= 7
      ? quarterback.accuracyShort
      : airYardsMean <= 13
        ? quarterback.accuracyIntermediate
        : quarterback.accuracyDeep;

  return toRatingFactor(rating, parameters);
}

function defensiveCoverageFactor(
  defensePlay: DefensivePlayDefinition,
  matchup: ResolutionMatchupSnapshot,
  parameters: OutcomeModelParameters,
) {
  const blend = coverageModeBlend(defensePlay);
  const coverageScore =
    matchup.defense.coverage.manCoverage * blend.man +
    matchup.defense.coverage.zoneCoverage * blend.zone;

  return toRatingFactor(coverageScore, parameters);
}

function determineRpoPassProbability(
  request: PlayResolutionRequest,
  parameters: OutcomeModelParameters,
) {
  const qbDecision = toRatingFactor(
    request.matchup.offense.quarterback.decision,
    parameters,
  );
  const targetSpace = toRatingFactor(
    request.matchup.offense.primaryTarget.separation,
    parameters,
  );
  const coverageTightness = request.matchup.context.coverageTightness;
  const leverage = request.matchup.context.leverageAdvantage;
  const boxPressure = (request.matchup.context.boxDefenders - 6.5) * 0.11;
  const passProbability = clamp(
    0.36 +
      qbDecision * 0.08 +
      targetSpace * 0.06 +
      leverage * 0.08 +
      boxPressure -
      coverageTightness * 0.07,
    0.14,
    0.76,
  );

  return passProbability;
}

function xFactorNote(label: string, plan: string) {
  return `Pre-game ${label} ${plan}.`;
}

function applyPassXFactorModifiers(
  evaluation: PassModelEvaluation,
  request: PlayResolutionRequest,
): PassModelEvaluation {
  const offensePlan = normalizePreGameXFactorPlan(request.offenseXFactorPlan);
  const defensePlan = normalizePreGameXFactorPlan(request.defenseXFactorPlan);
  const notes: string[] = [];
  const factors: OutcomeFactor[] = [];
  let pressureDelta = 0;
  let sackDelta = 0;
  let completionDelta = 0;
  let interceptionDelta = 0;
  let explosiveDelta = 0;
  let fumbleDelta = 0;
  let expectedYardsDelta = 0;
  let airYardsDelta = 0;
  let yacDelta = 0;

  if (offensePlan.protectionPlan === "MAX_PROTECT") {
    pressureDelta -= 0.035;
    sackDelta -= 0.018;
    explosiveDelta -= 0.018;
    expectedYardsDelta -= 0.35;
    notes.push(xFactorNote("protection plan", offensePlan.protectionPlan));
    factors.push(createFactor("xFactorMaxProtect", -0.035));
  } else if (offensePlan.protectionPlan === "FAST_RELEASE") {
    pressureDelta -= 0.025;
    sackDelta -= 0.014;
    completionDelta += 0.018;
    explosiveDelta -= 0.02;
    airYardsDelta -= 1.2;
    yacDelta += 0.35;
    notes.push(xFactorNote("protection plan", offensePlan.protectionPlan));
    factors.push(createFactor("xFactorFastRelease", 0.018));
  }

  if (offensePlan.aggression === "CONSERVATIVE") {
    interceptionDelta -= 0.009;
    explosiveDelta -= 0.018;
    completionDelta += 0.01;
    expectedYardsDelta -= 0.25;
    notes.push(xFactorNote("offensive aggression", offensePlan.aggression));
    factors.push(createFactor("xFactorConservativeOffense", -0.009));
  } else if (offensePlan.aggression === "AGGRESSIVE") {
    explosiveDelta += 0.022;
    interceptionDelta += 0.01;
    pressureDelta += 0.008;
    expectedYardsDelta += 0.28;
    notes.push(xFactorNote("offensive aggression", offensePlan.aggression));
    factors.push(createFactor("xFactorAggressiveOffense", 0.022));
  }

  if (offensePlan.turnoverPlan === "PROTECT_BALL") {
    interceptionDelta -= 0.012;
    fumbleDelta -= 0.004;
    explosiveDelta -= 0.012;
    notes.push(xFactorNote("offensive turnover plan", offensePlan.turnoverPlan));
    factors.push(createFactor("xFactorProtectBall", -0.012));
  } else if (offensePlan.turnoverPlan === "HUNT_TURNOVERS") {
    explosiveDelta += 0.01;
    interceptionDelta += 0.004;
    notes.push(xFactorNote("offensive turnover plan", offensePlan.turnoverPlan));
    factors.push(createFactor("xFactorOffensiveVariance", 0.01));
  }

  if (offensePlan.offensiveMatchupFocus === "FEATURE_WR") {
    completionDelta += 0.01;
    explosiveDelta += 0.012;
    yacDelta += 0.25;
  } else if (offensePlan.offensiveMatchupFocus === "FEATURE_TE") {
    completionDelta += request.situation.fieldZone === "LOW_RED_ZONE" || request.situation.fieldZone === "GOAL_TO_GO" ? 0.016 : 0.008;
    interceptionDelta -= 0.003;
  } else if (offensePlan.offensiveMatchupFocus === "FEATURE_RB") {
    completionDelta += 0.008;
    yacDelta += 0.45;
    airYardsDelta -= 0.6;
  } else if (offensePlan.offensiveMatchupFocus === "PROTECT_QB") {
    pressureDelta -= 0.018;
    sackDelta -= 0.01;
    airYardsDelta -= 0.7;
  }

  if (offensePlan.offensiveMatchupFocus !== "BALANCED") {
    notes.push(xFactorNote("offensive matchup focus", offensePlan.offensiveMatchupFocus));
    factors.push(createFactor("xFactorOffensiveMatchup", completionDelta + explosiveDelta));
  }

  if (defensePlan.defensiveFocus === "LIMIT_PASS") {
    completionDelta -= 0.016;
    explosiveDelta -= 0.012;
    interceptionDelta += 0.004;
    notes.push(xFactorNote("defensive focus", defensePlan.defensiveFocus));
    factors.push(createFactor("xFactorLimitPass", -0.016));
  }

  if (defensePlan.defensiveMatchupFocus === "DOUBLE_WR1") {
    completionDelta -= 0.012;
    explosiveDelta -= 0.016;
  } else if (defensePlan.defensiveMatchupFocus === "BRACKET_TE") {
    completionDelta -= request.situation.fieldZone === "LOW_RED_ZONE" || request.situation.fieldZone === "GOAL_TO_GO" ? 0.014 : 0.006;
  } else if (defensePlan.defensiveMatchupFocus === "ATTACK_WEAK_OL") {
    pressureDelta += 0.026;
    sackDelta += 0.012;
    explosiveDelta += 0.006;
  } else if (defensePlan.defensiveMatchupFocus === "SPY_QB") {
    sackDelta -= 0.006;
    pressureDelta -= 0.004;
  }

  if (defensePlan.defensiveMatchupFocus !== "BALANCED") {
    notes.push(xFactorNote("defensive matchup focus", defensePlan.defensiveMatchupFocus));
    factors.push(createFactor("xFactorDefensiveMatchup", pressureDelta - completionDelta));
  }

  if (defensePlan.turnoverPlan === "HUNT_TURNOVERS") {
    interceptionDelta += 0.012;
    fumbleDelta += 0.003;
    explosiveDelta += 0.01;
    notes.push(xFactorNote("defensive turnover plan", defensePlan.turnoverPlan));
    factors.push(createFactor("xFactorHuntTurnovers", 0.012));
  } else if (defensePlan.turnoverPlan === "PROTECT_BALL") {
    explosiveDelta -= 0.012;
    interceptionDelta -= 0.004;
    notes.push(xFactorNote("defensive turnover plan", defensePlan.turnoverPlan));
    factors.push(createFactor("xFactorPreventDefense", -0.012));
  }

  if (notes.length === 0 && factors.length === 0) {
    return evaluation;
  }

  return {
    ...evaluation,
    completionProbability: clamp(evaluation.completionProbability + completionDelta, 0.18, 0.9),
    pressureProbability: clamp(evaluation.pressureProbability + pressureDelta, 0.06, 0.62),
    sackProbability: clamp(evaluation.sackProbability + sackDelta, 0.015, 0.24),
    interceptionProbability: clamp(evaluation.interceptionProbability + interceptionDelta, 0.004, 0.14),
    explosiveProbability: clamp(evaluation.explosiveProbability + explosiveDelta, 0.01, 0.34),
    fumbleProbability: clamp(evaluation.fumbleProbability + fumbleDelta, 0.001, 0.04),
    airYardsMean: clamp(evaluation.airYardsMean + airYardsDelta, 1, 22),
    yardsAfterCatchMean: Math.max(0, evaluation.yardsAfterCatchMean + yacDelta),
    expectedYards: Math.max(-8, evaluation.expectedYards + expectedYardsDelta + completionDelta * 4 + explosiveDelta * 5 - sackDelta * 4),
    notes: [...evaluation.notes, ...notes],
    factors: [...evaluation.factors, ...factors],
  };
}

function applyRunXFactorModifiers(
  evaluation: RunModelEvaluation,
  request: PlayResolutionRequest,
): RunModelEvaluation {
  const offensePlan = normalizePreGameXFactorPlan(request.offenseXFactorPlan);
  const defensePlan = normalizePreGameXFactorPlan(request.defenseXFactorPlan);
  const notes: string[] = [];
  const factors: OutcomeFactor[] = [];
  let stuffedDelta = 0;
  let explosiveDelta = 0;
  let fumbleDelta = 0;
  let baseYardsDelta = 0;

  if (offensePlan.offensiveFocus === "RUN_FIRST") {
    stuffedDelta -= 0.01;
    baseYardsDelta += 0.18;
    notes.push(xFactorNote("offensive focus", offensePlan.offensiveFocus));
    factors.push(createFactor("xFactorRunFocus", 0.18));
  }

  if (offensePlan.offensiveMatchupFocus === "FEATURE_RB") {
    explosiveDelta += 0.014;
    baseYardsDelta += 0.22;
    notes.push(xFactorNote("offensive matchup focus", offensePlan.offensiveMatchupFocus));
    factors.push(createFactor("xFactorFeatureRb", 0.014));
  }

  if (offensePlan.aggression === "CONSERVATIVE") {
    fumbleDelta -= 0.004;
    explosiveDelta -= 0.008;
  } else if (offensePlan.aggression === "AGGRESSIVE") {
    explosiveDelta += 0.012;
    fumbleDelta += 0.003;
  }

  if (offensePlan.turnoverPlan === "PROTECT_BALL") {
    fumbleDelta -= 0.006;
    explosiveDelta -= 0.006;
    notes.push(xFactorNote("offensive turnover plan", offensePlan.turnoverPlan));
    factors.push(createFactor("xFactorRunBallSecurity", -0.006));
  }

  if (defensePlan.defensiveFocus === "STOP_RUN") {
    stuffedDelta += 0.025;
    explosiveDelta -= 0.012;
    baseYardsDelta -= 0.25;
    notes.push(xFactorNote("defensive focus", defensePlan.defensiveFocus));
    factors.push(createFactor("xFactorStopRun", 0.025));
  }

  if (defensePlan.defensiveMatchupFocus === "SPY_QB" && request.selectedPlayCall.offense.play.family === "DESIGNED_QB_RUN") {
    stuffedDelta += 0.018;
    explosiveDelta -= 0.014;
    notes.push(xFactorNote("defensive matchup focus", defensePlan.defensiveMatchupFocus));
    factors.push(createFactor("xFactorSpyQbRun", 0.018));
  } else if (defensePlan.defensiveMatchupFocus === "ATTACK_WEAK_OL") {
    stuffedDelta += 0.014;
    explosiveDelta += 0.004;
    notes.push(xFactorNote("defensive matchup focus", defensePlan.defensiveMatchupFocus));
    factors.push(createFactor("xFactorAttackWeakOlRun", 0.014));
  }

  if (defensePlan.turnoverPlan === "HUNT_TURNOVERS") {
    fumbleDelta += 0.006;
    explosiveDelta += 0.006;
    notes.push(xFactorNote("defensive turnover plan", defensePlan.turnoverPlan));
    factors.push(createFactor("xFactorRunTakeaway", 0.006));
  } else if (defensePlan.turnoverPlan === "PROTECT_BALL") {
    explosiveDelta -= 0.008;
    fumbleDelta -= 0.002;
  }

  if (notes.length === 0 && factors.length === 0) {
    return evaluation;
  }

  const baseYardsMean = evaluation.baseYardsMean + baseYardsDelta;

  return {
    ...evaluation,
    stuffedProbability: clamp(evaluation.stuffedProbability + stuffedDelta, 0.05, 0.58),
    explosiveProbability: clamp(evaluation.explosiveProbability + explosiveDelta, 0.01, 0.28),
    fumbleProbability: clamp(evaluation.fumbleProbability + fumbleDelta, 0.003, 0.05),
    baseYardsMean,
    expectedYards: Math.max(-5, evaluation.expectedYards + baseYardsDelta - stuffedDelta * 3 + explosiveDelta * 5),
    notes: [...evaluation.notes, ...notes],
    factors: [...evaluation.factors, ...factors],
  };
}

function buildPassModel(
  request: PlayResolutionRequest,
  parameters: OutcomeModelParameters,
  family: OffensivePlayFamily,
): PassModelEvaluation {
  const offensePlay = request.selectedPlayCall.offense.play;
  const defensePlay = request.selectedPlayCall.defense.play;
  const familyParameters = parameters.pass.families[family];
  const schemePressureBonus =
    parameters.offenseDefenseFamilyBonuses.pressureByDefense[defensePlay.family];
  const schemeCoverageBonus =
    parameters.offenseDefenseFamilyBonuses.coverageDisruptionByDefense[
      defensePlay.family
    ];
  const offensiveProtection =
    toRatingFactor(
      request.matchup.offense.offensiveLine.passProtection,
      parameters,
    ) *
      0.55 +
    toRatingFactor(
      request.matchup.offense.offensiveLine.communication,
      parameters,
    ) *
      0.15 +
    toRatingFactor(
      request.matchup.offense.quarterback.pocketPresence,
      parameters,
    ) *
      0.2 +
    toRatingFactor(request.matchup.offense.quarterback.mobility, parameters) *
      0.1;
  const defensivePressure =
    toRatingFactor(request.matchup.defense.passRush.pressure, parameters) * 0.4 +
    toRatingFactor(request.matchup.defense.passRush.edgeRush, parameters) * 0.25 +
    toRatingFactor(request.matchup.defense.passRush.interiorRush, parameters) *
      0.18 +
    toRatingFactor(request.matchup.defense.passRush.contain, parameters) * 0.17;
  const routeAdvantage =
    toRatingFactor(request.matchup.offense.primaryTarget.routeQuality, parameters) *
      0.35 +
    toRatingFactor(request.matchup.offense.primaryTarget.separation, parameters) *
      0.4 +
    toRatingFactor(request.matchup.offense.primaryTarget.release, parameters) *
      0.12 -
    defensiveCoverageFactor(defensePlay, request.matchup, parameters) * 0.55 -
    toRatingFactor(request.matchup.defense.coverage.leverage, parameters) * 0.15;
  const accuracyFactor = effectiveAccuracy(
    request.matchup,
    familyParameters.airYardsMean,
    parameters,
  );
  const handsFactor =
    toRatingFactor(request.matchup.offense.primaryTarget.hands, parameters) * 0.55 +
    toRatingFactor(request.matchup.offense.primaryTarget.ballSkills, parameters) *
      0.45;
  const decisionFactor = toRatingFactor(
    request.matchup.offense.quarterback.decision,
    parameters,
  );
  const ballHawkFactor = toRatingFactor(
    request.matchup.defense.coverage.ballHawk,
    parameters,
  );
  const passRushEdge =
    featureEdge(request.matchupFeatures, "PASS_RUSH") +
    featureEdge(request.matchupFeatures, "PRE_SNAP") * 0.3;
  const separationEdge = featureEdge(request.matchupFeatures, "SEPARATION");
  const catchPointEdge = featureEdge(request.matchupFeatures, "CATCH_POINT");
  const pressureProbability = clamp(
    parameters.pass.basePressureRate +
      familyParameters.pressureMitigation * -0.08 +
      schemePressureBonus +
      (defensivePressure - offensiveProtection) * 0.11 +
      passRushEdge * 0.1 +
      request.matchup.context.coverageTightness * 0.04 +
      request.selectedPlayCall.defense.play.expectedMetrics.pressureRate * 0.24 -
      request.selectedPlayCall.offense.play.expectedMetrics.pressureRate * 0.16,
    0.06,
    0.62,
  );
  const sackProbability = clamp(
    parameters.pass.baseSackRate +
      pressureProbability * 0.22 +
      toRatingFactor(request.matchup.defense.passRush.finishing, parameters) *
        0.035 -
      decisionFactor * 0.02 -
      toRatingFactor(request.matchup.offense.quarterback.mobility, parameters) *
        0.018 -
      familyParameters.pressureMitigation * 0.025,
    0.015,
    0.24,
  );
  const throwawayProbability = clamp(
    parameters.pass.baseThrowawayRate +
      pressureProbability * 0.18 +
      decisionFactor * 0.035 -
      routeAdvantage * 0.02,
    0.01,
    0.18,
  );
  const completionProbability = clamp(
    0.58 +
      familyParameters.baseCompletionBias +
      routeAdvantage * 0.12 +
      separationEdge * 0.08 +
      accuracyFactor * 0.14 +
      handsFactor * 0.08 +
      catchPointEdge * 0.05 -
      Math.max(0, familyParameters.airYardsMean - 8) * 0.012 -
      pressureProbability * parameters.pass.completionPressurePenalty -
      schemeCoverageBonus * 0.4,
    0.18,
    0.9,
  );
  const interceptionProbability = clamp(
    parameters.pass.baseInterceptionRate +
      familyParameters.interceptionBias +
      Math.max(-routeAdvantage, 0) * 0.035 +
      Math.max(-decisionFactor, 0) * 0.03 +
      pressureProbability * 0.022 +
      ballHawkFactor * 0.03 +
      schemeCoverageBonus * 0.32 -
      handsFactor * 0.012,
    0.004,
    0.14,
  );
  const explosiveProbability = clamp(
    0.05 +
      familyParameters.explosiveBias +
      Math.max(routeAdvantage, 0) * 0.08 +
      Math.max(
        toRatingFactor(request.matchup.offense.primaryTarget.yardsAfterCatch, parameters),
        0,
      ) *
        0.06 +
      Math.max(familyParameters.airYardsMean - 8, 0) * 0.008 -
      toRatingFactor(request.matchup.defense.coverage.tackling, parameters) * 0.03,
    0.01,
    0.34,
  );
  const fumbleProbability = clamp(
    0.004 +
      Math.max(
        toRatingFactor(request.matchup.defense.front.hitPower, parameters),
        0,
      ) *
        0.012 -
      toRatingFactor(request.matchup.offense.primaryRunner.ballSecurity, parameters) *
        0.006,
    0.001,
    0.04,
  );
  const yardsAfterCatchMean =
    familyParameters.yardsAfterCatchMean +
    toRatingFactor(request.matchup.offense.primaryTarget.yardsAfterCatch, parameters) *
      2.8 -
    toRatingFactor(request.matchup.defense.coverage.tackling, parameters) * 2.1 +
    Math.max(routeAdvantage, 0) * 1.2;
  const expectedYards =
    completionProbability *
      (familyParameters.airYardsMean + Math.max(0, yardsAfterCatchMean)) -
    sackProbability * 6.2;

  const evaluation = {
    path: "PASS",
    completionProbability,
    pressureProbability,
    sackProbability,
    throwawayProbability,
    interceptionProbability,
    explosiveProbability,
    fumbleProbability,
    airYardsMean: familyParameters.airYardsMean,
    airYardsSpread: familyParameters.airYardsSpread,
    yardsAfterCatchMean,
    expectedYards,
    notes: [
      `Pass family ${family}`,
      `Defense family ${defensePlay.family}`,
      ...buildPlayMetadataNotes({
        offensePlay,
        defensePlay,
      }),
    ],
    factors: [
      createFactor("offensiveProtection", offensiveProtection),
      createFactor("defensivePressure", defensivePressure),
      createFactor("routeAdvantage", routeAdvantage),
      createFactor("accuracyFactor", accuracyFactor),
      createFactor("decisionFactor", decisionFactor),
      createFactor("schemePressureBonus", schemePressureBonus),
      createFactor("schemeCoverageBonus", schemeCoverageBonus),
    ],
  } satisfies PassModelEvaluation;

  return applyPassXFactorModifiers(evaluation, request);
}

function buildRunModel(
  request: PlayResolutionRequest,
  parameters: OutcomeModelParameters,
  family: OffensivePlayFamily,
): RunModelEvaluation {
  const offensePlay = request.selectedPlayCall.offense.play;
  const defensePlay = request.selectedPlayCall.defense.play;
  const familyParameters = parameters.run.families[family];
  const schemeRunFitBonus =
    parameters.offenseDefenseFamilyBonuses.runFitByDefense[defensePlay.family];
  const linePush =
    toRatingFactor(request.matchup.offense.offensiveLine.runBlocking, parameters) *
      0.45 +
    toRatingFactor(request.matchup.offense.offensiveLine.comboBlocking, parameters) *
      0.3 +
    toRatingFactor(request.matchup.offense.offensiveLine.edgeControl, parameters) *
      0.25;
  const runnerQuality =
    toRatingFactor(request.matchup.offense.primaryRunner.vision, parameters) * 0.32 +
    toRatingFactor(request.matchup.offense.primaryRunner.acceleration, parameters) *
      0.24 +
    toRatingFactor(request.matchup.offense.primaryRunner.balance, parameters) *
      0.22 +
    toRatingFactor(request.matchup.offense.primaryRunner.power, parameters) * 0.22;
  const defensiveFront =
    toRatingFactor(request.matchup.defense.front.boxControl, parameters) * 0.35 +
    toRatingFactor(request.matchup.defense.front.runFit, parameters) * 0.35 +
    toRatingFactor(request.matchup.defense.front.leverage, parameters) * 0.15 +
    toRatingFactor(request.matchup.defense.front.pursuit, parameters) * 0.15;
  const tackleFinishing =
    toRatingFactor(request.matchup.defense.front.tackling, parameters) * 0.6 +
    toRatingFactor(request.matchup.defense.front.hitPower, parameters) * 0.4;
  const leverage = request.matchup.context.leverageAdvantage;
  const boxPenalty = (request.matchup.context.boxDefenders - 6.5) * 0.06;
  const runFitEdge =
    featureEdge(request.matchupFeatures, "RUN_FIT") +
    featureEdge(request.matchupFeatures, "TACKLE") * 0.25;
  const stuffedProbability = clamp(
    parameters.run.baseStuffedRate +
      familyParameters.stuffedBias +
      schemeRunFitBonus +
      boxPenalty +
      (defensiveFront - linePush) * 0.12 -
      runnerQuality * 0.04 -
      leverage * 0.05 -
      runFitEdge * 0.08,
    0.05,
    0.58,
  );
  const explosiveProbability = clamp(
    parameters.run.baseExplosiveRate +
      familyParameters.explosiveBias +
      Math.max(linePush - defensiveFront, 0) * 0.08 +
      Math.max(runnerQuality, 0) * 0.08 +
      Math.max(leverage, 0) * 0.05 -
      Math.max(boxPenalty, 0) * 0.55 -
      schemeRunFitBonus * 0.35,
    0.01,
    0.28,
  );
  const fumbleProbability = clamp(
    parameters.run.baseFumbleRate +
      familyParameters.fumbleBias +
      Math.max(tackleFinishing, 0) * 0.014 -
      toRatingFactor(request.matchup.offense.primaryRunner.ballSecurity, parameters) *
        0.007,
    0.003,
    0.05,
  );
  const baseYardsMean =
    familyParameters.baseYardsMean +
    (linePush - defensiveFront) * 2.1 +
    runnerQuality * 1.7 -
    boxPenalty * 3 +
    leverage * 1.2 -
    schemeRunFitBonus * 1.4;
  const expectedYards =
    (1 - stuffedProbability) * baseYardsMean + explosiveProbability * 6.5;

  const evaluation = {
    path: "RUN",
    pressureProbability: 0,
    sackProbability: 0,
    stuffedProbability,
    explosiveProbability,
    fumbleProbability,
    baseYardsMean,
    baseYardsSpread: familyParameters.baseYardsSpread,
    expectedYards,
    notes: [
      `Run family ${family}`,
      `Defense family ${defensePlay.family}`,
      ...buildPlayMetadataNotes({
        offensePlay,
        defensePlay,
      }),
    ],
    factors: [
      createFactor("linePush", linePush),
      createFactor("runnerQuality", runnerQuality),
      createFactor("defensiveFront", defensiveFront),
      createFactor("boxPenalty", boxPenalty),
      createFactor("schemeRunFitBonus", schemeRunFitBonus),
    ],
  } satisfies RunModelEvaluation;

  return applyRunXFactorModifiers(evaluation, request);
}

function determineResolutionPath(
  request: PlayResolutionRequest,
  parameters: OutcomeModelParameters,
  random: () => number,
) {
  const offenseFamily = request.selectedPlayCall.offense.play.family;

  if (offenseFamily !== "OPTION_RPO") {
    return {
      path: determinePrimaryPathFamily(offenseFamily),
      passProbability: determinePrimaryPathFamily(offenseFamily) === "PASS" ? 1 : 0,
      notes: [] as string[],
    };
  }

  const passProbability = determineRpoPassProbability(request, parameters);
  const path = random() < passProbability ? "PASS" : "RUN";

  return {
    path,
    passProbability,
    notes: [`RPO branch selected as ${path} with pass probability ${passProbability.toFixed(2)}.`],
  };
}

function pathFamily(
  request: PlayResolutionRequest,
  path: ResolutionPlayPath,
): OffensivePlayFamily {
  if (request.selectedPlayCall.offense.play.family !== "OPTION_RPO") {
    return request.selectedPlayCall.offense.play.family;
  }

  return path === "PASS" ? "OPTION_RPO" : "OPTION_RPO";
}

function completionThreshold(isExplosive: boolean, airYards: number, yac: number) {
  if (isExplosive) {
    return Math.max(16, airYards + yac);
  }

  return Math.max(0, airYards + yac);
}

function downSuccess(
  situation: GameSituationSnapshot,
  yards: number,
) {
  if (situation.down === 1) {
    return yards >= Math.ceil(situation.yardsToGo * DEFAULT_OUTCOME_MODEL_PARAMETERS.successThresholds.firstDownShare);
  }

  if (situation.down === 2) {
    return yards >= Math.ceil(situation.yardsToGo * DEFAULT_OUTCOME_MODEL_PARAMETERS.successThresholds.secondDownShare);
  }

  return yards >= situation.yardsToGo;
}

function deriveFieldZoneFromYardLine(ballOnYardLine: number): FieldZone {
  if (ballOnYardLine <= 10) {
    return "BACKED_UP";
  }

  if (ballOnYardLine < 40) {
    return "OWN_TERRITORY";
  }

  if (ballOnYardLine < 60) {
    return "MIDFIELD";
  }

  if (ballOnYardLine < 80) {
    return "PLUS_TERRITORY";
  }

  if (ballOnYardLine < 90) {
    return "HIGH_RED_ZONE";
  }

  if (ballOnYardLine < 97) {
    return "LOW_RED_ZONE";
  }

  return "GOAL_TO_GO";
}

function projectSituationAfterEvent(
  before: GameSituationSnapshot,
  event: ResolvedPlayEvent,
): ProjectionResult {
  const touchdown = event.touchdown;
  const turnover = event.turnover;
  const gainedTo = before.ballOnYardLine + Math.max(event.yards, 0);
  const firstDown = event.firstDown;
  const nextSeconds = Math.max(0, before.secondsRemainingInGame - event.clockRunoffSeconds);
  const nextQuarterSeconds = Math.max(
    0,
    before.secondsRemainingInQuarter - event.clockRunoffSeconds,
  );

  if (touchdown) {
    return {
      turnoverOnDowns: false,
      situation: {
        ...before,
        down: 1,
        yardsToGo: 10,
        ballOnYardLine: 25,
        fieldZone: "OWN_TERRITORY",
        offenseScore: before.offenseScore + event.scoreDelta,
        defenseScore: before.defenseScore,
        possessionTeamId: before.defenseTeamId,
        defenseTeamId: before.possessionTeamId,
        secondsRemainingInGame: nextSeconds,
        secondsRemainingInQuarter: nextQuarterSeconds,
      },
    };
  }

  if (turnover) {
    const flippedSpot = clamp(100 - clamp(gainedTo, 1, 99), 1, 99);

    return {
      turnoverOnDowns: false,
      situation: {
        ...before,
        down: 1,
        yardsToGo: 10,
        ballOnYardLine: flippedSpot,
        fieldZone: deriveFieldZoneFromYardLine(flippedSpot),
        offenseScore: before.offenseScore + event.scoreDelta,
        defenseScore: before.defenseScore,
        possessionTeamId: before.defenseTeamId,
        defenseTeamId: before.possessionTeamId,
        secondsRemainingInGame: nextSeconds,
        secondsRemainingInQuarter: nextQuarterSeconds,
      },
    };
  }

  if (before.down === 4 && !firstDown) {
    const flippedSpot = clamp(100 - clamp(gainedTo, 1, 99), 1, 99);

    return {
      turnoverOnDowns: true,
      situation: {
        ...before,
        down: 1,
        yardsToGo: 10,
        ballOnYardLine: flippedSpot,
        fieldZone: deriveFieldZoneFromYardLine(flippedSpot),
        possessionTeamId: before.defenseTeamId,
        defenseTeamId: before.possessionTeamId,
        secondsRemainingInGame: nextSeconds,
        secondsRemainingInQuarter: nextQuarterSeconds,
      },
    };
  }

  const nextBallOnYardLine = clamp(gainedTo, 1, 99);
  const nextYardsToGo = firstDown
    ? Math.min(10, 100 - nextBallOnYardLine)
    : Math.max(1, before.yardsToGo - event.yards);

  return {
    turnoverOnDowns: false,
    situation: {
      ...before,
      down: firstDown ? 1 : incrementDown(before.down),
      yardsToGo: nextYardsToGo,
      ballOnYardLine: nextBallOnYardLine,
      fieldZone: deriveFieldZoneFromYardLine(nextBallOnYardLine),
      offenseScore: before.offenseScore + event.scoreDelta,
      defenseScore: before.defenseScore,
      secondsRemainingInGame: nextSeconds,
      secondsRemainingInQuarter: nextQuarterSeconds,
    },
  };
}

function buildTrace(
  path: ResolutionPlayPath,
  notes: string[],
  factors: OutcomeFactor[],
  input: {
    pressureProbability: number;
    sackProbability: number;
    completionProbability: number | null;
    interceptionProbability: number;
    stuffedProbability: number | null;
    explosiveProbability: number;
    fumbleProbability: number;
    expectedYards: number;
  },
): PlayResolutionTrace {
  return {
    path,
    notes,
    factors,
    pressureProbability: input.pressureProbability,
    sackProbability: input.sackProbability,
    completionProbability: input.completionProbability,
    interceptionProbability: input.interceptionProbability,
    stuffedProbability: input.stuffedProbability,
    explosiveProbability: input.explosiveProbability,
    fumbleProbability: input.fumbleProbability,
    expectedYards: input.expectedYards,
  };
}

function illegalEvent(
  request: PlayResolutionRequest,
): ResolvedPlayEvent {
  return {
    path: determinePrimaryPathFamily(request.selectedPlayCall.offense.play.family),
    family: "PENALTY",
    yards: 0,
    success: false,
    explosive: false,
    turnoverType: "NONE",
    pressureEvent: "NONE",
    completion: null,
    throwaway: false,
    airYards: null,
    yardsAfterCatch: null,
    firstDown: false,
    touchdown: false,
    turnover: false,
    scoreDelta: 0,
    clockRunoffSeconds: 0,
    penaltyCode: "PRE_SNAP_ILLEGAL",
    value: null,
    trace: buildTrace(
      determinePrimaryPathFamily(request.selectedPlayCall.offense.play.family),
      ["Pre-snap legality failed before outcome resolution."],
      [],
      {
        pressureProbability: 0,
        sackProbability: 0,
        completionProbability: null,
        interceptionProbability: 0,
        stuffedProbability: null,
        explosiveProbability: 0,
        fumbleProbability: 0,
        expectedYards: 0,
      },
    ),
    summaryTokenIds: ["pre_snap_illegal"],
  };
}

function buildPassDistribution(
  evaluation: PassModelEvaluation,
): OutcomeDistributionPoint[] {
  const fumblePoint = clamp(
    evaluation.fumbleProbability * evaluation.completionProbability,
    0,
    0.03,
  );
  const explosivePoint = clamp(
    evaluation.completionProbability * evaluation.explosiveProbability,
    0.01,
    0.35,
  );
  const sackPoint = evaluation.sackProbability;
  const interceptionPoint = evaluation.interceptionProbability;
  const completePoint = clamp(
    evaluation.completionProbability - explosivePoint - fumblePoint,
    0,
    0.7,
  );
  const incompletePoint = clamp(
    1 - sackPoint - interceptionPoint - explosivePoint - completePoint - fumblePoint,
    0,
    1,
  );

  const distribution: OutcomeDistributionPoint[] = [
    {
      family: "EXPLOSIVE_PASS",
      probability: explosivePoint,
      meanYards: evaluation.airYardsMean + evaluation.yardsAfterCatchMean + 8,
      successProbability: 1,
      pressureProbability: evaluation.pressureProbability,
      completionProbability: evaluation.completionProbability,
      turnoverProbability: 0,
      explosiveProbability: evaluation.explosiveProbability,
    },
    {
      family: "PASS_COMPLETE",
      probability: completePoint,
      meanYards: evaluation.airYardsMean + Math.max(2, evaluation.yardsAfterCatchMean),
      successProbability: 0.58,
      pressureProbability: evaluation.pressureProbability,
      completionProbability: evaluation.completionProbability,
      turnoverProbability: 0,
      explosiveProbability: 0,
    },
    {
      family: "INCOMPLETE_PASS",
      probability: incompletePoint,
      meanYards: 0,
      successProbability: 0,
      pressureProbability: evaluation.pressureProbability,
      completionProbability: evaluation.completionProbability,
      turnoverProbability: 0,
      explosiveProbability: 0,
    },
    {
      family: "SACK",
      probability: sackPoint,
      meanYards: -6,
      successProbability: 0,
      pressureProbability: evaluation.pressureProbability,
      completionProbability: 0,
      turnoverProbability: clamp(
        evaluation.fumbleProbability * DEFAULT_OUTCOME_MODEL_PARAMETERS.pass.stripSackRate,
        0,
        0.03,
      ),
      explosiveProbability: 0,
    },
    {
      family: "INTERCEPTION",
      probability: interceptionPoint,
      meanYards: 0,
      successProbability: 0,
      pressureProbability: evaluation.pressureProbability,
      completionProbability: 0,
      turnoverProbability: 1,
      explosiveProbability: 0,
    },
    {
      family: "FUMBLE",
      probability: fumblePoint,
      meanYards: evaluation.airYardsMean + Math.max(1, evaluation.yardsAfterCatchMean / 2),
      successProbability: 0.25,
      pressureProbability: evaluation.pressureProbability,
      completionProbability: evaluation.completionProbability,
      turnoverProbability: 1,
      explosiveProbability: 0,
    },
  ];

  return distribution.filter((point) => point.probability > 0);
}

function buildRunDistribution(
  evaluation: RunModelEvaluation,
): OutcomeDistributionPoint[] {
  const fumblePoint = clamp(evaluation.fumbleProbability, 0, 0.05);
  const explosivePoint = clamp(
    evaluation.explosiveProbability * (1 - evaluation.stuffedProbability),
    0.01,
    0.28,
  );
  const stopPoint = clamp(evaluation.stuffedProbability - fumblePoint, 0.03, 0.58);
  const successPoint = clamp(
    1 - stopPoint - explosivePoint - fumblePoint,
    0.1,
    0.85,
  );

  const distribution: OutcomeDistributionPoint[] = [
    {
      family: "EXPLOSIVE_RUN",
      probability: explosivePoint,
      meanYards: Math.max(12, evaluation.baseYardsMean + 10),
      successProbability: 1,
      pressureProbability: 0,
      completionProbability: null,
      turnoverProbability: 0,
      explosiveProbability: evaluation.explosiveProbability,
    },
    {
      family: "RUN_SUCCESS",
      probability: successPoint,
      meanYards: Math.max(3, evaluation.baseYardsMean),
      successProbability: 0.7,
      pressureProbability: 0,
      completionProbability: null,
      turnoverProbability: 0,
      explosiveProbability: 0,
    },
    {
      family: "RUN_STOP",
      probability: stopPoint,
      meanYards: 1,
      successProbability: 0.05,
      pressureProbability: 0,
      completionProbability: null,
      turnoverProbability: 0,
      explosiveProbability: 0,
    },
    {
      family: "FUMBLE",
      probability: fumblePoint,
      meanYards: Math.max(0, evaluation.baseYardsMean / 2),
      successProbability: 0.15,
      pressureProbability: 0,
      completionProbability: null,
      turnoverProbability: 1,
      explosiveProbability: 0,
    },
  ];

  return distribution.filter((point) => point.probability > 0);
}

function combineDistributions(
  runDistribution: OutcomeDistributionPoint[],
  passDistribution: OutcomeDistributionPoint[],
  passProbability: number,
): OutcomeDistributionPoint[] {
  const weights = new Map<string, OutcomeDistributionPoint>();

  for (const point of runDistribution) {
    weights.set(point.family, {
      ...point,
      probability: point.probability * (1 - passProbability),
      meanYards: point.meanYards * (1 - passProbability),
      successProbability: point.successProbability * (1 - passProbability),
      pressureProbability: point.pressureProbability * (1 - passProbability),
      completionProbability:
        point.completionProbability == null
          ? null
          : point.completionProbability * (1 - passProbability),
      turnoverProbability: point.turnoverProbability * (1 - passProbability),
      explosiveProbability: point.explosiveProbability * (1 - passProbability),
    });
  }

  for (const point of passDistribution) {
    const existing = weights.get(point.family);

    if (!existing) {
      weights.set(point.family, {
        ...point,
        probability: point.probability * passProbability,
        meanYards: point.meanYards * passProbability,
        successProbability: point.successProbability * passProbability,
        pressureProbability: point.pressureProbability * passProbability,
        completionProbability:
          point.completionProbability == null
            ? null
            : point.completionProbability * passProbability,
        turnoverProbability: point.turnoverProbability * passProbability,
        explosiveProbability: point.explosiveProbability * passProbability,
      });
      continue;
    }

    weights.set(point.family, {
      family: point.family,
      probability: existing.probability + point.probability * passProbability,
      meanYards: existing.meanYards + point.meanYards * passProbability,
      successProbability:
        existing.successProbability + point.successProbability * passProbability,
      pressureProbability:
        existing.pressureProbability + point.pressureProbability * passProbability,
      completionProbability:
        existing.completionProbability == null && point.completionProbability == null
          ? null
          : (existing.completionProbability ?? 0) +
            (point.completionProbability ?? 0) * passProbability,
      turnoverProbability:
        existing.turnoverProbability + point.turnoverProbability * passProbability,
      explosiveProbability:
        existing.explosiveProbability + point.explosiveProbability * passProbability,
    });
  }

  return [...weights.values()]
    .filter((point) => point.probability > 0)
    .map((point) => ({
      ...point,
      meanYards: point.meanYards / point.probability,
      successProbability: point.successProbability / point.probability,
      pressureProbability: point.pressureProbability / point.probability,
      completionProbability:
        point.completionProbability == null
          ? null
          : point.completionProbability / point.probability,
      turnoverProbability: point.turnoverProbability / point.probability,
      explosiveProbability: point.explosiveProbability / point.probability,
    }))
    .sort((left, right) => right.probability - left.probability);
}

function completePassEvent(
  request: PlayResolutionRequest,
  evaluation: PassModelEvaluation,
  random: () => number,
  pressureEvent: PressureEventType,
): ResolvedPlayEvent {
  const explosive = random() < evaluation.explosiveProbability;
  const airYards = Math.round(
    familyNoise(
      evaluation.airYardsMean,
      evaluation.airYardsSpread,
      random,
    ),
  );
  const yacBase =
    evaluation.yardsAfterCatchMean +
    (explosive ? 6 + Math.max(0, centeredRandom(random) * 4) : centeredRandom(random) * 3);
  const yardsAfterCatch = Math.max(
    0,
    Math.round(yacBase),
  );
  const totalYards = clamp(
    completionThreshold(explosive, airYards, yardsAfterCatch),
    0,
    65,
  );
  const fumble = random() < evaluation.fumbleProbability;
  const touchdown =
    request.situation.ballOnYardLine + totalYards >= 100;
  const firstDown = touchdown || totalYards >= request.situation.yardsToGo;
  const success =
    !fumble && (touchdown || downSuccess(request.situation, totalYards));
  const family = fumble
    ? "FUMBLE"
    : explosive || totalYards >= 16
      ? "EXPLOSIVE_PASS"
      : "PASS_COMPLETE";

  return {
    path: "PASS",
    family,
    yards: totalYards,
    success,
    explosive: family === "EXPLOSIVE_PASS",
    turnoverType: fumble ? "FUMBLE" : "NONE",
    pressureEvent,
    completion: true,
    throwaway: false,
    airYards,
    yardsAfterCatch,
    firstDown,
    touchdown,
    turnover: fumble,
    scoreDelta: touchdown ? 6 : 0,
    clockRunoffSeconds: clamp(
      Math.round(22 + totalYards * 0.55 + centeredRandom(random) * 4),
      10,
      38,
    ),
    penaltyCode: null,
    value: null,
    trace: buildTrace(
      "PASS",
      evaluation.notes,
      evaluation.factors,
      {
        pressureProbability: evaluation.pressureProbability,
        sackProbability: evaluation.sackProbability,
        completionProbability: evaluation.completionProbability,
        interceptionProbability: evaluation.interceptionProbability,
        stuffedProbability: null,
        explosiveProbability: evaluation.explosiveProbability,
        fumbleProbability: evaluation.fumbleProbability,
        expectedYards: evaluation.expectedYards,
      },
    ),
    summaryTokenIds: [
      "pass_attempt",
      pressureEvent.toLowerCase(),
      family.toLowerCase(),
    ],
  };
}

function familyNoise(mean: number, spread: number, random: () => number) {
  return mean + centeredRandom(random) * spread;
}

function resolvePassEvent(
  request: PlayResolutionRequest,
  evaluation: PassModelEvaluation,
  random: () => number,
): ResolvedPlayEvent {
  const pressureTriggered = random() < evaluation.pressureProbability;
  const hurryOrHitRoll = random();
  const pressureEvent: PressureEventType = pressureTriggered
    ? hurryOrHitRoll < 0.55
      ? "HURRY"
      : "HIT"
    : "NONE";

  if (pressureTriggered && random() < evaluation.sackProbability) {
    const sackYards = -Math.round(
      clamp(5.5 + centeredRandom(random) * 3.5, 1, 12),
    );
    const stripSack =
      random() <
      evaluation.fumbleProbability *
        DEFAULT_OUTCOME_MODEL_PARAMETERS.pass.stripSackRate;

    return {
      path: "PASS",
      family: stripSack ? "FUMBLE" : "SACK",
      yards: sackYards,
      success: false,
      explosive: false,
      turnoverType: stripSack ? "FUMBLE" : "NONE",
      pressureEvent: "SACK",
      completion: false,
      throwaway: false,
      airYards: null,
      yardsAfterCatch: null,
      firstDown: false,
      touchdown: false,
      turnover: stripSack,
      scoreDelta: 0,
      clockRunoffSeconds: clamp(
        Math.round(24 + centeredRandom(random) * 5),
        14,
        36,
      ),
      penaltyCode: null,
      value: null,
      trace: buildTrace(
        "PASS",
        evaluation.notes,
        evaluation.factors,
        {
          pressureProbability: evaluation.pressureProbability,
          sackProbability: evaluation.sackProbability,
          completionProbability: evaluation.completionProbability,
          interceptionProbability: evaluation.interceptionProbability,
          stuffedProbability: null,
          explosiveProbability: evaluation.explosiveProbability,
          fumbleProbability: evaluation.fumbleProbability,
          expectedYards: evaluation.expectedYards,
        },
      ),
      summaryTokenIds: ["pass_attempt", "sack", stripSack ? "fumble" : "down"],
    };
  }

  if (pressureTriggered && random() < evaluation.throwawayProbability) {
    return {
      path: "PASS",
      family: "INCOMPLETE_PASS",
      yards: 0,
      success: false,
      explosive: false,
      turnoverType: "NONE",
      pressureEvent: "THROWAWAY",
      completion: false,
      throwaway: true,
      airYards: null,
      yardsAfterCatch: null,
      firstDown: false,
      touchdown: false,
      turnover: false,
      scoreDelta: 0,
      clockRunoffSeconds: clamp(
        Math.round(6 + centeredRandom(random) * 2),
        3,
        9,
      ),
      penaltyCode: null,
      value: null,
      trace: buildTrace(
        "PASS",
        evaluation.notes,
        evaluation.factors,
        {
          pressureProbability: evaluation.pressureProbability,
          sackProbability: evaluation.sackProbability,
          completionProbability: evaluation.completionProbability,
          interceptionProbability: evaluation.interceptionProbability,
          stuffedProbability: null,
          explosiveProbability: evaluation.explosiveProbability,
          fumbleProbability: evaluation.fumbleProbability,
          expectedYards: evaluation.expectedYards,
        },
      ),
      summaryTokenIds: ["pass_attempt", "throwaway", "incomplete_pass"],
    };
  }

  if (random() < evaluation.interceptionProbability) {
    return {
      path: "PASS",
      family: "INTERCEPTION",
      yards: 0,
      success: false,
      explosive: false,
      turnoverType: "INTERCEPTION",
      pressureEvent,
      completion: false,
      throwaway: false,
      airYards: Math.max(0, Math.round(evaluation.airYardsMean)),
      yardsAfterCatch: null,
      firstDown: false,
      touchdown: false,
      turnover: true,
      scoreDelta: 0,
      clockRunoffSeconds: clamp(
        Math.round(10 + centeredRandom(random) * 4),
        5,
        18,
      ),
      penaltyCode: null,
      value: null,
      trace: buildTrace(
        "PASS",
        evaluation.notes,
        evaluation.factors,
        {
          pressureProbability: evaluation.pressureProbability,
          sackProbability: evaluation.sackProbability,
          completionProbability: evaluation.completionProbability,
          interceptionProbability: evaluation.interceptionProbability,
          stuffedProbability: null,
          explosiveProbability: evaluation.explosiveProbability,
          fumbleProbability: evaluation.fumbleProbability,
          expectedYards: evaluation.expectedYards,
        },
      ),
      summaryTokenIds: ["pass_attempt", pressureEvent.toLowerCase(), "interception"],
    };
  }

  if (random() < evaluation.completionProbability) {
    return completePassEvent(request, evaluation, random, pressureEvent);
  }

  return {
    path: "PASS",
    family: "INCOMPLETE_PASS",
    yards: 0,
    success: false,
    explosive: false,
    turnoverType: "NONE",
    pressureEvent,
    completion: false,
    throwaway: false,
    airYards: Math.max(0, Math.round(evaluation.airYardsMean)),
    yardsAfterCatch: null,
    firstDown: false,
    touchdown: false,
    turnover: false,
    scoreDelta: 0,
    clockRunoffSeconds: clamp(
      Math.round(7 + centeredRandom(random) * 2),
      4,
      10,
    ),
    penaltyCode: null,
    value: null,
    trace: buildTrace(
      "PASS",
      evaluation.notes,
      evaluation.factors,
      {
        pressureProbability: evaluation.pressureProbability,
        sackProbability: evaluation.sackProbability,
        completionProbability: evaluation.completionProbability,
        interceptionProbability: evaluation.interceptionProbability,
        stuffedProbability: null,
        explosiveProbability: evaluation.explosiveProbability,
        fumbleProbability: evaluation.fumbleProbability,
        expectedYards: evaluation.expectedYards,
      },
    ),
    summaryTokenIds: ["pass_attempt", pressureEvent.toLowerCase(), "incomplete_pass"],
  };
}

function resolveRunEvent(
  request: PlayResolutionRequest,
  evaluation: RunModelEvaluation,
  random: () => number,
): ResolvedPlayEvent {
  const stuffed = random() < evaluation.stuffedProbability;
  const explosive = !stuffed && random() < evaluation.explosiveProbability;
  const rawYards = stuffed
    ? familyNoise(0.5 + evaluation.baseYardsMean * 0.1, 1.8, random)
    : explosive
      ? familyNoise(Math.max(13, evaluation.baseYardsMean + 10), 5.8, random)
      : familyNoise(Math.max(2.5, evaluation.baseYardsMean), evaluation.baseYardsSpread, random);
  const yards = Math.round(
    clamp(rawYards, stuffed ? -4 : 0, explosive ? 36 : 15),
  );
  const fumble = random() < evaluation.fumbleProbability;
  const touchdown = request.situation.ballOnYardLine + Math.max(yards, 0) >= 100;
  const firstDown = touchdown || yards >= request.situation.yardsToGo;
  const success = !fumble && (touchdown || downSuccess(request.situation, yards));
  const family = fumble
    ? "FUMBLE"
    : explosive || yards >= 12
      ? "EXPLOSIVE_RUN"
      : yards <= 2
        ? "RUN_STOP"
        : "RUN_SUCCESS";

  return {
    path: "RUN",
    family,
    yards,
    success,
    explosive: family === "EXPLOSIVE_RUN",
    turnoverType: fumble ? "FUMBLE" : "NONE",
    pressureEvent: "NONE",
    completion: null,
    throwaway: false,
    airYards: null,
    yardsAfterCatch: null,
    firstDown,
    touchdown,
    turnover: fumble,
    scoreDelta: touchdown ? 6 : 0,
    clockRunoffSeconds: clamp(
      Math.round(28 + Math.max(yards, 0) * 0.45 + centeredRandom(random) * 5),
      16,
      40,
    ),
    penaltyCode: null,
    value: null,
    trace: buildTrace(
      "RUN",
      evaluation.notes,
      evaluation.factors,
      {
        pressureProbability: 0,
        sackProbability: 0,
        completionProbability: null,
        interceptionProbability: 0,
        stuffedProbability: evaluation.stuffedProbability,
        explosiveProbability: evaluation.explosiveProbability,
        fumbleProbability: evaluation.fumbleProbability,
        expectedYards: evaluation.expectedYards,
      },
    ),
    summaryTokenIds: ["run_attempt", family.toLowerCase()],
  };
}

function attachValueAssessment(
  request: PlayResolutionRequest,
  event: ResolvedPlayEvent,
  stateValueModel: DefaultStateValueModel | typeof defaultStateValueModel,
) {
  const beforeValue = stateValueModel.evaluateState(request.situation);
  const projection = projectSituationAfterEvent(request.situation, event);
  const afterValue = stateValueModel.evaluateState(projection.situation);
  const value = stateValueModel.assessTransition({
    beforeSituation: request.situation,
    afterSituation: projection.situation,
    beforeValue,
    afterValue,
    scoreDelta: event.scoreDelta,
    turnover: event.turnover || projection.turnoverOnDowns,
  });

  return {
    ...event,
    value,
    summaryTokenIds: projection.turnoverOnDowns
      ? [...event.summaryTokenIds, "turnover_on_downs"]
      : event.summaryTokenIds,
  };
}

function ensureTeamStats(
  gameStats: GameStats,
  teamId: TeamId,
  opponentTeamId: TeamId,
) {
  const existing = gameStats.teamStats.find((entry) => entry.teamId === teamId);

  if (existing) {
    return existing;
  }

  const created = createEmptyTeamStats(teamId, opponentTeamId);
  gameStats.teamStats.push(created);
  return created;
}

function ensurePlayerStats(
  gameStats: GameStats,
  player: OutcomeStatsPlayerReference,
) {
  const existing = gameStats.playerStats.find((entry) => entry.playerId === player.playerId);

  if (existing) {
    return existing;
  }

  const created = createEmptyPlayerStats(player);
  gameStats.playerStats.push(created);
  return created;
}

function addNumberStats<TStats extends object>(
  current: Partial<TStats> | undefined,
  delta: Partial<TStats>,
): Partial<TStats> {
  const next: Record<string, number> = {
    ...((current ?? {}) as Record<string, number>),
  };

  for (const [key, value] of Object.entries(delta)) {
    if (typeof value === "number") {
      next[key] = (next[key] ?? 0) + value;
    }
  }

  return next as Partial<TStats>;
}

function addPlayerPlayDelta(
  deltas: Map<PlayerId, PlayerPlayStats>,
  player: OutcomeStatsPlayerReference,
  roles: PlayerPlayRole[],
  delta: Omit<Partial<PlayerPlayStats>, "playerId" | "teamId" | "roles">,
) {
  const existing =
    deltas.get(player.playerId) ??
    {
      playerId: player.playerId,
      teamId: player.teamId,
      roles: [],
    };

  existing.roles = [...new Set([...existing.roles, ...roles])];

  if (delta.passing) {
    existing.passing = addNumberStats(existing.passing, delta.passing);
  }

  if (delta.rushing) {
    existing.rushing = addNumberStats(existing.rushing, delta.rushing);
  }

  if (delta.receiving) {
    existing.receiving = addNumberStats(existing.receiving, delta.receiving);
  }

  if (delta.defensive) {
    existing.defensive = addNumberStats(existing.defensive, delta.defensive);
  }

  if (delta.ballSecurity) {
    existing.ballSecurity = addNumberStats(
      existing.ballSecurity,
      delta.ballSecurity,
    );
  }

  if (delta.specialTeams) {
    existing.specialTeams = addNumberStats(
      existing.specialTeams,
      delta.specialTeams,
    );
  }

  deltas.set(player.playerId, existing);
}

function ensureDriveStats(input: {
  gameStats: GameStats;
  driveId: DriveId;
  request: PlayResolutionRequest;
}) {
  const existing = input.gameStats.drives.find((entry) => entry.driveId === input.driveId);

  if (existing) {
    return existing;
  }

  const offenseTeamId = input.request.situation.possessionTeamId;
  const defenseTeamId = input.request.situation.defenseTeamId;
  const created: DriveStats = {
    driveId: input.driveId,
    gameId: input.gameStats.gameId,
    sequence: input.gameStats.drives.length + 1,
    offenseTeamId,
    defenseTeamId,
    startState: createGameStateStatsSnapshot({
      situation: input.request.situation,
      homeTeamId: input.gameStats.homeTeamId,
      awayTeamId: input.gameStats.awayTeamId,
    }),
    endState: null,
    playCount: 0,
    yards: 0,
    passingYards: 0,
    rushingYards: 0,
    firstDowns: 0,
    result: "IN_PROGRESS",
    pointsScored: 0,
    turnover: null,
    penalties: [],
    timeOfPossessionSeconds: 0,
    plays: [],
  };

  input.gameStats.drives.push(created);
  return created;
}

function classifyPlayType(event: ResolvedPlayEvent): PlayStatsType {
  if (event.penaltyCode) {
    return "PENALTY";
  }

  if (event.pressureEvent === "SACK") {
    return "SACK";
  }

  return event.path;
}

function classifyPlayResults(
  event: ResolvedPlayEvent,
): PlayStatsResultType[] {
  const results: PlayStatsResultType[] = [];

  if (event.success) {
    results.push("SUCCESS");
  }

  if (event.explosive || event.yards >= EXPLOSIVE_STATS_YARDS) {
    results.push("EXPLOSIVE");
  }

  if (event.yards < 0) {
    results.push("NEGATIVE");
  }

  if (event.touchdown) {
    results.push("TOUCHDOWN");
  }

  if (event.turnover) {
    results.push("TURNOVER");
  }

  if (event.penaltyCode) {
    results.push("PENALTY");
  }

  if (results.length === 0) {
    results.push("NEUTRAL");
  }

  return results;
}

function deriveDriveResult(
  event: ResolvedPlayEvent,
  projection: ProjectionResult,
  override: DriveResultType | undefined,
): DriveResultType {
  if (override) {
    return override;
  }

  if (event.touchdown) {
    return "TOUCHDOWN";
  }

  if (event.turnover) {
    return "TURNOVER";
  }

  if (projection.turnoverOnDowns) {
    return "TURNOVER_ON_DOWNS";
  }

  return "IN_PROGRESS";
}

function createPenaltyStats(
  event: ResolvedPlayEvent,
  offenseTeamId: TeamId,
): PenaltyStats | null {
  if (!event.penaltyCode) {
    return null;
  }

  return {
    penaltyId: event.penaltyCode,
    teamId: offenseTeamId,
    playerId: null,
    code: event.penaltyCode,
    yards: 0,
    accepted: true,
    automaticFirstDown: false,
    offsetting: false,
  };
}

function creditedFumblePlayer(
  event: ResolvedPlayEvent,
  participants: OutcomeStatsParticipants,
) {
  if (event.path === "RUN") {
    return participants.ballCarrier ?? participants.quarterback;
  }

  if (event.completion) {
    return participants.target ?? participants.ballCarrier ?? participants.quarterback;
  }

  return participants.quarterback;
}

function creditedFumbleRole(event: ResolvedPlayEvent): PlayerPlayRole {
  if (event.path === "RUN") {
    return "RUSHER";
  }

  if (event.completion) {
    return "RECEIVER";
  }

  return "PASSER";
}

function createTurnoverStats(input: {
  event: ResolvedPlayEvent;
  offenseTeamId: TeamId;
  defenseTeamId: TeamId;
  participants: OutcomeStatsParticipants;
}): TurnoverStats | null {
  if (!input.event.turnover) {
    return null;
  }

  if (input.event.turnoverType === "INTERCEPTION") {
    const defender = input.participants.interceptor ?? input.participants.tackler ?? null;

    return {
      type: "INTERCEPTION",
      committedByTeamId: input.offenseTeamId,
      forcedByTeamId: input.defenseTeamId,
      chargedPlayerId: input.participants.quarterback.playerId,
      forcedByPlayerId: defender?.playerId ?? null,
      recoveredByPlayerId: defender?.playerId ?? null,
      recoveryTeamId: input.defenseTeamId,
      returnYards: 0,
      touchdown: false,
    };
  }

  const chargedPlayer = creditedFumblePlayer(input.event, input.participants);
  const forcedBy =
    input.participants.forcedFumbleDefender ??
    input.participants.tackler ??
    null;
  const recoveredBy =
    input.participants.recoveryPlayer ??
    forcedBy ??
    null;

  return {
    type: "FUMBLE",
    committedByTeamId: input.offenseTeamId,
    forcedByTeamId: input.defenseTeamId,
    chargedPlayerId: chargedPlayer.playerId,
    forcedByPlayerId: forcedBy?.playerId ?? null,
    recoveredByPlayerId: recoveredBy?.playerId ?? null,
    recoveryTeamId: input.defenseTeamId,
    returnYards: 0,
    touchdown: false,
  };
}

function updateFinalScore(
  gameStats: GameStats,
  scoringTeamId: TeamId,
  scoreDelta: number,
) {
  if (scoreDelta <= 0) {
    return;
  }

  gameStats.finalScore.byTeamId[scoringTeamId] =
    (gameStats.finalScore.byTeamId[scoringTeamId] ?? 0) + scoreDelta;

  if (gameStats.homeTeamId === scoringTeamId) {
    gameStats.finalScore.home += scoreDelta;
  }

  if (gameStats.awayTeamId === scoringTeamId) {
    gameStats.finalScore.away += scoreDelta;
  }
}

export function recordResolvedPlayStats(
  input: RecordResolvedPlayStatsInput,
): PlayStats {
  const { event, gameStats, participants, request } = input;
  const offenseTeamId = request.situation.possessionTeamId;
  const defenseTeamId = request.situation.defenseTeamId;
  const offenseStats = ensureTeamStats(gameStats, offenseTeamId, defenseTeamId);
  const defenseStats = ensureTeamStats(gameStats, defenseTeamId, offenseTeamId);
  const drive = ensureDriveStats({
    gameStats,
    driveId: input.driveId,
    request,
  });
  const projection = projectSituationAfterEvent(request.situation, event);
  const stateBefore = createGameStateStatsSnapshot({
    situation: request.situation,
    homeTeamId: gameStats.homeTeamId,
    awayTeamId: gameStats.awayTeamId,
  });
  const stateAfter = createGameStateStatsSnapshot({
    situation: projection.situation,
    homeTeamId: gameStats.homeTeamId,
    awayTeamId: gameStats.awayTeamId,
  });
  const playerPlayDeltas = new Map<PlayerId, PlayerPlayStats>();
  const playType = classifyPlayType(event);
  const resultTypes = classifyPlayResults(event);
  const isPenalty = playType === "PENALTY";
  const isSack = playType === "SACK";
  const isPassAttempt = event.path === "PASS" && !isSack && !isPenalty;
  const isRun = event.path === "RUN" && !isPenalty;
  const isCompletion = isPassAttempt && event.completion === true;
  const creditedYards = isPenalty ? 0 : event.yards;
  const positivePassYards = isCompletion ? Math.max(0, event.yards) : 0;
  const sackYardsLost = isSack ? Math.abs(Math.min(0, event.yards)) : 0;
  const firstDownAwarded = event.firstDown && !event.turnover && !isPenalty;
  const penaltyStats = createPenaltyStats(event, offenseTeamId);
  const turnoverStats = createTurnoverStats({
    event,
    offenseTeamId,
    defenseTeamId,
    participants,
  });

  offenseStats.points += event.scoreDelta;
  offenseStats.totalYards += creditedYards;
  offenseStats.timeOfPossessionSeconds += event.clockRunoffSeconds;
  updateFinalScore(gameStats, offenseTeamId, event.scoreDelta);

  drive.yards += creditedYards;
  drive.timeOfPossessionSeconds += event.clockRunoffSeconds;
  drive.pointsScored += event.scoreDelta;

  if (isCompletion) {
    offenseStats.grossPassingYards += positivePassYards;
    offenseStats.passingYards += positivePassYards;
    drive.passingYards += positivePassYards;
  } else if (isSack) {
    offenseStats.passingYards += event.yards;
    offenseStats.sackYardsLost += sackYardsLost;
    offenseStats.sacksAllowed += 1;
    defenseStats.sacks += 1;
    drive.passingYards += event.yards;
  } else if (isRun) {
    offenseStats.rushingYards += event.yards;
    drive.rushingYards += event.yards;
  }

  if (firstDownAwarded) {
    offenseStats.firstDowns += 1;
    drive.firstDowns += 1;
  }

  if (resultTypes.includes("EXPLOSIVE")) {
    offenseStats.explosivePlays += 1;
  }

  if (penaltyStats) {
    offenseStats.penalties += 1;
    offenseStats.penaltyYards += penaltyStats.yards;
    drive.penalties.push(penaltyStats);
  }

  const quarterbackStats = ensurePlayerStats(gameStats, participants.quarterback);

  if (isPassAttempt) {
    quarterbackStats.passing.attempts += 1;
    addPlayerPlayDelta(
      playerPlayDeltas,
      participants.quarterback,
      ["PASSER"],
      {
        passing: {
          attempts: 1,
        },
      },
    );

    if (isCompletion) {
      quarterbackStats.passing.completions += 1;
      quarterbackStats.passing.yards += positivePassYards;
      addPlayerPlayDelta(
        playerPlayDeltas,
        participants.quarterback,
        ["PASSER"],
        {
          passing: {
            completions: 1,
            yards: positivePassYards,
          },
        },
      );

      if (event.touchdown) {
        quarterbackStats.passing.touchdowns += 1;
        addPlayerPlayDelta(
          playerPlayDeltas,
          participants.quarterback,
          ["PASSER"],
          {
            passing: {
              touchdowns: 1,
            },
          },
        );
      }
    }

    if (participants.target) {
      const receiverStats = ensurePlayerStats(gameStats, participants.target);
      receiverStats.receiving.targets += 1;
      addPlayerPlayDelta(
        playerPlayDeltas,
        participants.target,
        ["TARGET"],
        {
          receiving: {
            targets: 1,
          },
        },
      );

      if (isCompletion) {
        receiverStats.receiving.receptions += 1;
        receiverStats.receiving.yards += positivePassYards;
        receiverStats.receiving.yardsAfterCatch += event.yardsAfterCatch ?? 0;
        addPlayerPlayDelta(
          playerPlayDeltas,
          participants.target,
          ["RECEIVER"],
          {
            receiving: {
              receptions: 1,
              yards: positivePassYards,
              yardsAfterCatch: event.yardsAfterCatch ?? 0,
            },
          },
        );

        if (event.touchdown) {
          receiverStats.receiving.touchdowns += 1;
          addPlayerPlayDelta(
            playerPlayDeltas,
            participants.target,
            ["RECEIVER"],
            {
              receiving: {
                touchdowns: 1,
              },
            },
          );
        }
      }
    }
  }

  if (isSack) {
    quarterbackStats.passing.sacksTaken += 1;
    quarterbackStats.passing.sackYardsLost += sackYardsLost;
    addPlayerPlayDelta(
      playerPlayDeltas,
      participants.quarterback,
      ["PASSER"],
      {
        passing: {
          sacksTaken: 1,
          sackYardsLost,
        },
      },
    );

    const passRusher = participants.passRusher ?? participants.tackler ?? null;

    if (passRusher) {
      const defenderStats = ensurePlayerStats(gameStats, passRusher);
      defenderStats.defensive.sacks += 1;
      defenderStats.defensive.tackles += 1;
      addPlayerPlayDelta(
        playerPlayDeltas,
        passRusher,
        ["PASS_RUSHER", "TACKLER"],
        {
          defensive: {
            sacks: 1,
            tackles: 1,
          },
        },
      );
    }
  }

  if (isRun) {
    const runner = participants.ballCarrier ?? participants.quarterback;
    const runnerStats = ensurePlayerStats(gameStats, runner);
    runnerStats.rushing.carries += 1;
    runnerStats.rushing.yards += event.yards;
    addPlayerPlayDelta(
      playerPlayDeltas,
      runner,
      ["RUSHER"],
      {
        rushing: {
          carries: 1,
          yards: event.yards,
        },
      },
    );

    if (event.touchdown) {
      runnerStats.rushing.touchdowns += 1;
      addPlayerPlayDelta(
        playerPlayDeltas,
        runner,
        ["RUSHER"],
        {
          rushing: {
            touchdowns: 1,
          },
        },
      );
    }
  }

  if (turnoverStats) {
    offenseStats.turnovers += 1;
    defenseStats.turnoversForced += 1;
    drive.turnover = turnoverStats;

    if (turnoverStats.type === "INTERCEPTION") {
      offenseStats.interceptionsThrown += 1;
      quarterbackStats.passing.interceptions += 1;
      addPlayerPlayDelta(
        playerPlayDeltas,
        participants.quarterback,
        ["PASSER"],
        {
          passing: {
            interceptions: 1,
          },
        },
      );

      const interceptor =
        participants.interceptor ??
        participants.tackler ??
        null;

      if (interceptor) {
        const defenderStats = ensurePlayerStats(gameStats, interceptor);
        defenderStats.defensive.interceptions += 1;
        defenderStats.defensive.passesDefended += 1;
        addPlayerPlayDelta(
          playerPlayDeltas,
          interceptor,
          ["COVERAGE_DEFENDER"],
          {
            defensive: {
              interceptions: 1,
              passesDefended: 1,
            },
          },
        );
      }
    }

    if (turnoverStats.type === "FUMBLE") {
      offenseStats.fumblesLost += 1;
      const chargedPlayer = creditedFumblePlayer(event, participants);
      const chargedRole = creditedFumbleRole(event);
      const chargedStats = ensurePlayerStats(gameStats, chargedPlayer);
      chargedStats.ballSecurity.fumbles += 1;
      chargedStats.ballSecurity.fumblesLost += 1;
      addPlayerPlayDelta(
        playerPlayDeltas,
        chargedPlayer,
        [chargedRole],
        {
          ballSecurity: {
            fumbles: 1,
            fumblesLost: 1,
          },
        },
      );

      if (isRun) {
        chargedStats.rushing.fumbles += 1;
        addPlayerPlayDelta(
          playerPlayDeltas,
          chargedPlayer,
          ["RUSHER"],
          {
            rushing: {
              fumbles: 1,
            },
          },
        );
      }

      const forcedBy =
        participants.forcedFumbleDefender ??
        participants.tackler ??
        null;

      if (forcedBy) {
        const defenderStats = ensurePlayerStats(gameStats, forcedBy);
        defenderStats.defensive.forcedFumbles += 1;
        addPlayerPlayDelta(
          playerPlayDeltas,
          forcedBy,
          ["FORCED_FUMBLE_DEFENDER"],
          {
            defensive: {
              forcedFumbles: 1,
            },
          },
        );
      }

      const recoveredBy =
        participants.recoveryPlayer ??
        forcedBy ??
        null;

      if (recoveredBy) {
        const defenderStats = ensurePlayerStats(gameStats, recoveredBy);
        defenderStats.defensive.fumbleRecoveries += 1;
        addPlayerPlayDelta(
          playerPlayDeltas,
          recoveredBy,
          ["RECOVERY_PLAYER"],
          {
            defensive: {
              fumbleRecoveries: 1,
            },
          },
        );
      }
    }
  } else if (
    participants.tackler &&
    !event.touchdown &&
    !isPenalty &&
    creditedYards !== 0
  ) {
    const tacklerStats = ensurePlayerStats(gameStats, participants.tackler);
    tacklerStats.defensive.tackles += 1;
    addPlayerPlayDelta(
      playerPlayDeltas,
      participants.tackler,
      ["TACKLER"],
      {
        defensive: {
          tackles: 1,
        },
      },
    );
  }

  const playStats: PlayStats = {
    playId: input.playId,
    gameId: gameStats.gameId,
    driveId: input.driveId,
    sequenceInGame:
      gameStats.drives.reduce((total, entry) => total + entry.plays.length, 0) + 1,
    sequenceInDrive: drive.plays.length + 1,
    offenseTeamId,
    defenseTeamId,
    playType,
    playCall: {
      offensePlayId: request.selectedPlayCall.offense.play.id,
      offensePlayFamily: request.selectedPlayCall.offense.play.family,
      defensePlayId: request.selectedPlayCall.defense.play.id,
      defensePlayFamily: request.selectedPlayCall.defense.play.family,
    },
    stateBefore,
    stateAfter,
    yardsGained: creditedYards,
    resultTypes,
    firstDown: event.firstDown,
    touchdown: event.touchdown,
    pointsScored: event.scoreDelta,
    turnover: turnoverStats,
    penalty: penaltyStats,
    clockRunoffSeconds: event.clockRunoffSeconds,
    resolution: createPlayResolutionStatsReference(event),
    playerStats: [...playerPlayDeltas.values()],
  };

  drive.endState = stateAfter;
  drive.result = deriveDriveResult(event, projection, input.driveResult);
  drive.plays.push(playStats);
  drive.playCount = drive.plays.length;

  return playStats;
}

export class DefaultOutcomeResolutionEngine implements OutcomeResolutionEngine {
  constructor(
    private readonly parameters: OutcomeModelParameters = DEFAULT_OUTCOME_MODEL_PARAMETERS,
    private readonly fallbackStateValueModel: DefaultStateValueModel = defaultStateValueModel,
  ) {}

  buildDistribution(
    request: PlayResolutionRequest,
  ): OutcomeDistributionPoint[] {
    if (!request.legality.isLegal || !validatePlayResolutionPreSnap(request).isLegal) {
      const penaltyDistribution: OutcomeDistributionPoint[] = [
        {
          family: "PENALTY",
          probability: 1,
          meanYards: 0,
          successProbability: 0,
          pressureProbability: 0,
          completionProbability: null,
          turnoverProbability: 0,
          explosiveProbability: 0,
        },
      ];

      return penaltyDistribution;
    }

    const random =
      request.random ??
      createResolutionRandom(
        request.resolutionSeed ??
          `${request.situation.possessionTeamId}::${request.selectedPlayCall.offense.play.id}::${request.selectedPlayCall.defense.play.id}::distribution`,
      );
    const pathSelection = determineResolutionPath(request, this.parameters, random);
    const runModel = buildRunModel(
      request,
      this.parameters,
      pathFamily(request, "RUN"),
    );
    const passModel = buildPassModel(
      request,
      this.parameters,
      pathFamily(request, "PASS"),
    );

    if (request.selectedPlayCall.offense.play.family === "OPTION_RPO") {
      return combineDistributions(
        buildRunDistribution(runModel),
        buildPassDistribution(passModel),
        pathSelection.passProbability,
      );
    }

    return pathSelection.path === "PASS"
      ? buildPassDistribution(passModel)
      : buildRunDistribution(runModel);
  }

  resolve(request: PlayResolutionRequest): ResolvedPlayEvent {
    const validity = validatePlayResolutionPreSnap(request);

    if (!request.legality.isLegal || !validity.isLegal) {
      return illegalEvent(request);
    }

    const random =
      request.random ??
      createResolutionRandom(
        request.resolutionSeed ??
          `${request.situation.possessionTeamId}::${request.selectedPlayCall.offense.play.id}::${request.selectedPlayCall.defense.play.id}::resolve`,
      );
    const pathSelection = determineResolutionPath(request, this.parameters, random);
    const event =
      pathSelection.path === "PASS"
        ? resolvePassEvent(
            request,
            buildPassModel(
              request,
              this.parameters,
              pathFamily(request, "PASS"),
            ),
            random,
          )
        : resolveRunEvent(
            request,
            buildRunModel(
              request,
              this.parameters,
              pathFamily(request, "RUN"),
            ),
            random,
          );
    const eventWithPathNotes = {
      ...event,
      trace: {
        ...event.trace,
        notes: [...pathSelection.notes, ...event.trace.notes],
      },
    };

    return attachValueAssessment(
      request,
      eventWithPathNotes,
      (request.stateValueModel as DefaultStateValueModel | undefined) ??
        this.fallbackStateValueModel,
    );
  }

  resolveAndRecordStats(
    input: ResolveAndRecordStatsInput,
  ): ResolveAndRecordStatsResult {
    const event = this.resolve(input.request);
    const playStats = recordResolvedPlayStats({
      gameStats: input.gameStats,
      driveId: input.driveId,
      playId: input.playId,
      request: input.request,
      event,
      participants: input.participants,
      driveResult: input.driveResult,
    });

    return {
      event,
      playStats,
      gameStats: input.gameStats,
    };
  }
}

export const defaultOutcomeResolutionEngine = new DefaultOutcomeResolutionEngine();
