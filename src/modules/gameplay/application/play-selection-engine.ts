import type { GameSituationSnapshot } from "../domain/game-situation";
import {
  normalizePreGameXFactorPlan,
  type PreGameXFactorPlan,
} from "../domain/pre-game-x-factor";
import type {
  DefensivePlayDefinition,
  DefensivePlayFamily,
  OffensivePlayDefinition,
  OffensivePlayFamily,
  PlayCallDefinition,
  PlayCallFamily,
  PlayCallSide,
} from "../domain/play-library";
import type { PlaybookPolicy, WeightedPlayReference } from "../domain/playbook";
import type {
  CandidateRejection,
  CoordinatorOpponentWeaknessSnapshot,
  CoordinatorTeamStrengthSnapshot,
  DefensiveFamilyExpectation,
  DefensiveCoordinatorTendencies,
  FamilyExpectation,
  OffensiveCoordinatorTendencies,
  OffensiveFamilyExpectation,
  PersonnelFitSnapshot,
  PlaySelectionContext,
  PlaySelectionEngine,
  SelectedPlayCall,
  SelectionMode,
  SelectionModifier,
  SelectionModifierSource,
  SelectionStrategyProfile,
  SelectionUsageMemory,
  SideSelectionTrace,
  SituationCallBias,
  WeightedCandidate,
} from "../domain/play-selection";
import { buildPreSnapStructureForPlay, matchesSituationFilter } from "./play-library-service";
import { validatePlaySelectionPreSnap, validatePreSnapStructure } from "./pre-snap-legality-engine";

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

export function createSelectionRandom(seed: string) {
  return mulberry32(hashString(seed));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeFitValue(value: number | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 0.5;
  }

  if (value > 1) {
    return clamp(value / 100, 0, 1);
  }

  return clamp(value, 0, 1);
}

function normalizeTendency(value: number | undefined) {
  return clamp(value ?? 0, -1, 1);
}

function normalizeFrequency(value: number | undefined) {
  return clamp(value ?? 0.5, 0, 1);
}

function createModifier(
  source: SelectionModifierSource,
  reason: string,
  deltaWeight: number,
): SelectionModifier {
  return {
    source,
    reason,
    deltaWeight,
  };
}

function normalizeOffensiveCoordinator(
  tendencies?: Partial<OffensiveCoordinatorTendencies>,
): OffensiveCoordinatorTendencies {
  return {
    runPassLean: normalizeTendency(tendencies?.runPassLean),
    aggressiveness: normalizeTendency(tendencies?.aggressiveness),
    tempo: normalizeTendency(tendencies?.tempo),
    targetPreference: tendencies?.targetPreference ?? "BALANCED",
    screenQuickVsBlitz: normalizeFrequency(tendencies?.screenQuickVsBlitz),
    deepShotFrequency: normalizeFrequency(tendencies?.deepShotFrequency),
  };
}

function normalizeDefensiveCoordinator(
  tendencies?: Partial<DefensiveCoordinatorTendencies>,
): DefensiveCoordinatorTendencies {
  return {
    blitzFrequency: normalizeFrequency(tendencies?.blitzFrequency),
    pressFrequency: normalizeFrequency(tendencies?.pressFrequency),
    aggressiveness: normalizeTendency(tendencies?.aggressiveness),
    coveragePreference: tendencies?.coveragePreference ?? "BALANCED",
  };
}

function normalizeVariantGroupId(
  play: Pick<PlayCallDefinition, "variantGroupId">,
) {
  const variantGroupId = play.variantGroupId?.trim();

  return variantGroupId && variantGroupId.length > 0 ? variantGroupId : null;
}

function scoreDifferentialForSide(
  side: PlayCallSide,
  situation: GameSituationSnapshot,
) {
  return side === "OFFENSE"
    ? situation.offenseScore - situation.defenseScore
    : situation.defenseScore - situation.offenseScore;
}

export function classifySelectionSituation(input: {
  side: PlayCallSide;
  situation: GameSituationSnapshot;
}): SituationCallBias {
  const { side, situation } = input;
  const scoreDifferential = scoreDifferentialForSide(side, situation);
  const isRedZone =
    situation.fieldZone === "HIGH_RED_ZONE" ||
    situation.fieldZone === "LOW_RED_ZONE" ||
    situation.fieldZone === "GOAL_TO_GO";
  const isGoalToGo = situation.fieldZone === "GOAL_TO_GO";
  const isBackedUp = situation.fieldZone === "BACKED_UP";
  const isShortYardage =
    situation.distanceBucket === "INCHES" || situation.distanceBucket === "SHORT";
  const isPassingDown =
    situation.down >= 3 ||
    situation.distanceBucket === "LONG" ||
    situation.distanceBucket === "VERY_LONG";
  const isTwoMinute =
    situation.clockBucket === "TWO_MINUTE" || situation.clockBucket === "ENDGAME";
  const needsClockDrain =
    scoreDifferential > 0 &&
    (isTwoMinute || situation.secondsRemainingInGame <= 420);
  const needsExplosiveAnswer =
    scoreDifferential < 0 &&
    (isTwoMinute || situation.secondsRemainingInGame <= 420);
  const downType =
    situation.down === 1
      ? "EARLY"
      : situation.down === 2
        ? "SETUP"
        : situation.down === 3
          ? "MONEY"
          : "FOURTH";
  const isShotWindow =
    situation.down === 2 &&
    isShortYardage &&
    !isRedZone &&
    !isBackedUp &&
    situation.clockBucket !== "ENDGAME";
  const plusTerritory =
    situation.fieldZone === "PLUS_TERRITORY" || isRedZone || situation.ballOnYardLine >= 55;
  const manageableDistance = situation.yardsToGo <= 4;
  const isFourDownTerritory =
    (situation.down === 4 && manageableDistance && plusTerritory) ||
    (situation.down === 3 &&
      manageableDistance &&
      plusTerritory &&
      (needsExplosiveAnswer || scoreDifferential <= 0 || situation.secondsRemainingInGame <= 300));
  const urgency = isTwoMinute
    ? "TWO_MINUTE"
    : needsClockDrain
      ? "FOUR_MINUTE"
      : needsExplosiveAnswer
        ? "CATCH_UP"
        : scoreDifferential > 0 && situation.secondsRemainingInGame <= 600
          ? "PROTECT_LEAD"
          : "NEUTRAL";
  const remainingTimeouts =
    side === "OFFENSE" ? situation.offenseTimeouts : situation.defenseTimeouts;

  return {
    side,
    scoreDifferential,
    urgency,
    downType,
    distanceBucket: situation.distanceBucket,
    fieldZone: situation.fieldZone,
    isRedZone,
    isGoalToGo,
    isBackedUp,
    isPassingDown,
    isShortYardage,
    isShotWindow,
    isFourDownTerritory,
    needsClockDrain,
    needsExplosiveAnswer,
    remainingTimeouts,
  };
}

export function createSelectionStrategyProfile(input: {
  side: PlayCallSide;
  mode?: SelectionMode;
  schemeCode?: string | null;
  overrides?: Partial<Omit<SelectionStrategyProfile, "id" | "side" | "mode">>;
}): SelectionStrategyProfile {
  const mode = input.mode ?? "BALANCED";
  const baseByMode: Record<
    SelectionMode,
    Omit<SelectionStrategyProfile, "id" | "side" | "mode" | "schemeCode">
  > = {
    CONSERVATIVE: {
      evWeight: 0.95,
      floorWeight: 1.2,
      riskWeight: 0.65,
      surpriseWeight: 0.55,
      selfScoutWeight: 0.8,
      personnelFitWeight: 0.8,
      opponentContextWeight: 0.7,
      clockWeight: 0.95,
      fourDownWeight: 0.65,
      fatigueWeight: 0.75,
      temperature: 0.9,
    },
    BALANCED: {
      evWeight: 1,
      floorWeight: 1,
      riskWeight: 1,
      surpriseWeight: 0.8,
      selfScoutWeight: 0.95,
      personnelFitWeight: 0.9,
      opponentContextWeight: 0.85,
      clockWeight: 1,
      fourDownWeight: 1,
      fatigueWeight: 0.9,
      temperature: 1,
    },
    AGGRESSIVE: {
      evWeight: 1.1,
      floorWeight: 0.8,
      riskWeight: 1.35,
      surpriseWeight: 1.05,
      selfScoutWeight: 1,
      personnelFitWeight: 0.95,
      opponentContextWeight: 1,
      clockWeight: 1.1,
      fourDownWeight: 1.35,
      fatigueWeight: 0.85,
      temperature: 1.08,
    },
  };
  const base = baseByMode[mode];

  return {
    id: `${input.side.toLowerCase()}-${mode.toLowerCase()}-${input.schemeCode ?? "default"}`,
    side: input.side,
    mode,
    schemeCode: input.schemeCode ?? null,
    ...base,
    ...input.overrides,
  };
}

function offenseSchemeBias(
  schemeCode: string | null,
  family: OffensivePlayFamily,
) {
  switch (schemeCode) {
    case "POWER_RUN":
      return (
        {
          ZONE_RUN: 0.26,
          GAP_RUN: 0.34,
          DESIGNED_QB_RUN: 0.18,
          OPTION_RPO: -0.04,
          QUICK_PASS: -0.06,
          DROPBACK: -0.08,
          PLAY_ACTION: 0.18,
          MOVEMENT_PASS: -0.04,
          SCREEN: 0.02,
          EMPTY_TEMPO: -0.12,
        } satisfies Record<OffensivePlayFamily, number>
      )[family];
    case "SPREAD_ATTACK":
      return (
        {
          ZONE_RUN: -0.04,
          GAP_RUN: -0.08,
          DESIGNED_QB_RUN: 0.04,
          OPTION_RPO: 0.28,
          QUICK_PASS: 0.24,
          DROPBACK: 0.12,
          PLAY_ACTION: 0.02,
          MOVEMENT_PASS: 0.12,
          SCREEN: 0.12,
          EMPTY_TEMPO: 0.22,
        } satisfies Record<OffensivePlayFamily, number>
      )[family];
    case "WEST_COAST":
      return (
        {
          ZONE_RUN: 0.08,
          GAP_RUN: 0.02,
          DESIGNED_QB_RUN: 0.02,
          OPTION_RPO: 0.08,
          QUICK_PASS: 0.28,
          DROPBACK: 0.12,
          PLAY_ACTION: 0.12,
          MOVEMENT_PASS: 0.18,
          SCREEN: 0.15,
          EMPTY_TEMPO: 0.08,
        } satisfies Record<OffensivePlayFamily, number>
      )[family];
    case "AIR_RAID":
      return (
        {
          ZONE_RUN: -0.08,
          GAP_RUN: -0.12,
          DESIGNED_QB_RUN: -0.1,
          OPTION_RPO: 0.16,
          QUICK_PASS: 0.26,
          DROPBACK: 0.34,
          PLAY_ACTION: -0.03,
          MOVEMENT_PASS: 0.14,
          SCREEN: 0.1,
          EMPTY_TEMPO: 0.32,
        } satisfies Record<OffensivePlayFamily, number>
      )[family];
    case "BALANCED_OFFENSE":
    default:
      return (
        {
          ZONE_RUN: 0.08,
          GAP_RUN: 0.05,
          DESIGNED_QB_RUN: 0.04,
          OPTION_RPO: 0.08,
          QUICK_PASS: 0.08,
          DROPBACK: 0.06,
          PLAY_ACTION: 0.08,
          MOVEMENT_PASS: 0.08,
          SCREEN: 0.04,
          EMPTY_TEMPO: 0.06,
        } satisfies Record<OffensivePlayFamily, number>
      )[family];
  }
}

function defenseSchemeBias(
  schemeCode: string | null,
  family: DefensivePlayFamily,
) {
  switch (schemeCode) {
    case "PRESS_MAN":
      return (
        {
          MATCH_COVERAGE: 0.05,
          ZONE_COVERAGE: -0.08,
          MAN_COVERAGE: 0.28,
          ZERO_PRESSURE: 0.18,
          FIRE_ZONE: 0.08,
          SIMULATED_PRESSURE: 0.1,
          DROP_EIGHT: -0.06,
          RUN_BLITZ: 0.12,
          BRACKET_SPECIALTY: 0.12,
          THREE_HIGH_PACKAGE: -0.08,
          RED_ZONE_PACKAGE: 0.1,
        } satisfies Record<DefensivePlayFamily, number>
      )[family];
    case "ZONE_DISCIPLINE":
      return (
        {
          MATCH_COVERAGE: 0.18,
          ZONE_COVERAGE: 0.26,
          MAN_COVERAGE: -0.08,
          ZERO_PRESSURE: -0.12,
          FIRE_ZONE: 0.02,
          SIMULATED_PRESSURE: 0.08,
          DROP_EIGHT: 0.16,
          RUN_BLITZ: 0.02,
          BRACKET_SPECIALTY: 0.1,
          THREE_HIGH_PACKAGE: 0.18,
          RED_ZONE_PACKAGE: 0.12,
        } satisfies Record<DefensivePlayFamily, number>
      )[family];
    case "THREE_FOUR_FRONT":
      return (
        {
          MATCH_COVERAGE: 0.06,
          ZONE_COVERAGE: 0.08,
          MAN_COVERAGE: 0.03,
          ZERO_PRESSURE: 0.1,
          FIRE_ZONE: 0.22,
          SIMULATED_PRESSURE: 0.18,
          DROP_EIGHT: 0.06,
          RUN_BLITZ: 0.22,
          BRACKET_SPECIALTY: 0.02,
          THREE_HIGH_PACKAGE: 0.04,
          RED_ZONE_PACKAGE: 0.08,
        } satisfies Record<DefensivePlayFamily, number>
      )[family];
    case "FOUR_THREE_FRONT":
    default:
      return (
        {
          MATCH_COVERAGE: 0.16,
          ZONE_COVERAGE: 0.12,
          MAN_COVERAGE: 0.05,
          ZERO_PRESSURE: 0.03,
          FIRE_ZONE: 0.04,
          SIMULATED_PRESSURE: 0.06,
          DROP_EIGHT: 0.08,
          RUN_BLITZ: 0.1,
          BRACKET_SPECIALTY: 0.08,
          THREE_HIGH_PACKAGE: 0.1,
          RED_ZONE_PACKAGE: 0.08,
        } satisfies Record<DefensivePlayFamily, number>
      )[family];
  }
}

function resolvePlaybookPolicies(
  side: "OFFENSE",
  context: PlaySelectionContext,
): PlaySelectionContext["offensePlaybook"]["offensePolicies"];
function resolvePlaybookPolicies(
  side: "DEFENSE",
  context: PlaySelectionContext,
): PlaySelectionContext["defensePlaybook"]["defensePolicies"];
function resolvePlaybookPolicies(
  side: PlayCallSide,
  context: PlaySelectionContext,
) {
  return side === "OFFENSE"
    ? context.offensePlaybook.offensePolicies
    : context.defensePlaybook.defensePolicies;
}

function resolveCandidates(
  side: "OFFENSE",
  context: PlaySelectionContext,
): OffensivePlayDefinition[];
function resolveCandidates(
  side: "DEFENSE",
  context: PlaySelectionContext,
): DefensivePlayDefinition[];
function resolveCandidates(
  side: PlayCallSide,
  context: PlaySelectionContext,
) {
  return side === "OFFENSE" ? context.offenseCandidates : context.defenseCandidates;
}

function policyMatches(
  policy: PlaybookPolicy,
  situation: GameSituationSnapshot,
) {
  return matchesSituationFilter(situation, policy.situation);
}

function resolveReferenceMatches<TPlay extends PlayCallDefinition>(
  reference: WeightedPlayReference,
  candidates: TPlay[],
): TPlay[] {
  if (reference.referenceType === "PLAY") {
    return candidates.filter((candidate) => candidate.id === reference.referenceId);
  }

  return candidates.filter((candidate) => candidate.family === reference.referenceId);
}

function buildBaseMenu<TPlay extends PlayCallDefinition>(input: {
  policies: PlaybookPolicy[];
  candidates: TPlay[];
  situation: GameSituationSnapshot;
}): {
  baseWeights: Map<string, number>;
  policyIdsByPlayId: Map<string, Set<string>>;
  matchedPolicyIds: string[];
} {
  const matchedPolicies = input.policies.filter((policy) =>
    policyMatches(policy, input.situation),
  );
  const baseWeights = new Map<string, number>();
  const policyIdsByPlayId = new Map<string, Set<string>>();

  if (matchedPolicies.length === 0) {
    for (const candidate of input.candidates) {
      baseWeights.set(candidate.id, 1);
      policyIdsByPlayId.set(candidate.id, new Set(["fallback-open-menu"]));
    }

    return {
      baseWeights,
      policyIdsByPlayId,
      matchedPolicyIds: ["fallback-open-menu"],
    };
  }

  for (const policy of matchedPolicies) {
    for (const reference of policy.candidates) {
      const matches = resolveReferenceMatches(reference, input.candidates);
      const splitWeight = reference.weight / Math.max(matches.length, 1);

      for (const match of matches) {
        baseWeights.set(match.id, (baseWeights.get(match.id) ?? 0) + splitWeight);
        const ids = policyIdsByPlayId.get(match.id) ?? new Set<string>();
        ids.add(policy.id);
        policyIdsByPlayId.set(match.id, ids);
      }
    }
  }

  for (const candidate of input.candidates) {
    if (!baseWeights.has(candidate.id)) {
      baseWeights.set(candidate.id, 0.08);
      policyIdsByPlayId.set(candidate.id, new Set(["exploratory-menu"]));
    }
  }

  return {
    baseWeights,
    policyIdsByPlayId,
    matchedPolicyIds: matchedPolicies.map((policy) => policy.id),
  };
}

function buildExpectationSpace<TFamily extends PlayCallFamily>(
  weights: Map<TFamily, number>,
): FamilyExpectation[] {
  const totalWeight = [...weights.values()].reduce((sum, value) => sum + value, 0);

  if (totalWeight <= 0) {
    return [];
  }

  return [...weights.entries()]
    .map(([family, value]) => ({
      family,
      probability: value / totalWeight,
    }))
    .sort((left, right) => right.probability - left.probability);
}

function applyUsageMemory<TPlay extends PlayCallDefinition>(input: {
  play: TPlay;
  usageMemory?: SelectionUsageMemory;
  profile: SelectionStrategyProfile;
  candidateCount: number;
}) {
  const modifiers: SelectionModifier[] = [];
  const memory = input.usageMemory;

  if (!memory || memory.totalCalls <= 0) {
    return modifiers;
  }

  const playRate = (memory.playCallCounts[input.play.id] ?? 0) / memory.totalCalls;
  const familyRate = (memory.familyCallCounts[input.play.family] ?? 0) / memory.totalCalls;
  const maxPlayRate = Math.max(
    0,
    ...Object.values(memory.playCallCounts).map((count) => count / memory.totalCalls),
  );
  const variantGroupId = normalizeVariantGroupId(input.play);
  const variantGroupRate =
    variantGroupId == null
      ? 0
      : (memory.variantGroupCallCounts?.[variantGroupId] ?? 0) / memory.totalCalls;
  const variantExposureRate =
    variantGroupId == null ? playRate : Math.max(playRate, variantGroupRate);
  const expectedShare = 1 / Math.max(input.candidateCount, 1);
  const recentPlayPenalty = memory.recentPlayIds.slice(-2).includes(input.play.id)
    ? 0.18
    : 0;
  const recentVariantGroupPenalty =
    variantGroupId != null &&
    (memory.recentVariantGroups?.slice(-3).includes(variantGroupId) ?? false)
      ? 0.08
      : 0;
  const recentFamilyPenalty = memory.recentFamilyCalls.slice(-3).includes(input.play.family)
    ? 0.1
    : 0;
  const scoutPenalty =
    -(
      playRate * 0.62 +
      variantGroupRate * 0.28 +
      familyRate * 0.42 +
      recentPlayPenalty +
      recentVariantGroupPenalty +
      recentFamilyPenalty
    ) *
    input.profile.selfScoutWeight;
  const underuseShare = clamp(
    (expectedShare - variantExposureRate) / Math.max(expectedShare, 0.01),
    0,
    1,
  );
  const surpriseBonus =
    underuseShare * 0.16 * input.profile.surpriseWeight +
    (memory.totalCalls >= 60 &&
    memory.totalCalls <= 140 &&
    maxPlayRate > 0.3 &&
    familyRate > playRate &&
    recentPlayPenalty === 0
      ? clamp(familyRate - playRate, 0, 0.8) * 0.28 * input.profile.surpriseWeight
      : 0) +
    (recentPlayPenalty === 0 &&
    recentVariantGroupPenalty === 0 &&
    recentFamilyPenalty === 0
      ? 0.05 * input.profile.surpriseWeight
      : 0);
  const usageReason =
    variantGroupId == null
      ? `Self-scout penalty from recent usage (play ${(playRate * 100).toFixed(1)}%, family ${(familyRate * 100).toFixed(1)}%).`
      : `Self-scout penalty from recent usage (play ${(playRate * 100).toFixed(1)}%, variant ${(variantGroupRate * 100).toFixed(1)}%, family ${(familyRate * 100).toFixed(1)}%).`;

  modifiers.push(
    createModifier(
      "SELF_SCOUT",
      usageReason,
      scoutPenalty,
    ),
  );
  modifiers.push(
    createModifier(
      "RANDOMNESS",
      "Tendency-break bonus for less exposed calls.",
      surpriseBonus,
    ),
  );

  return modifiers;
}

function applyPersonnelFit<TPlay extends PlayCallDefinition>(input: {
  play: TPlay;
  personnelFit?: PersonnelFitSnapshot;
  profile: SelectionStrategyProfile;
}) {
  const modifiers: SelectionModifier[] = [];
  const fit = input.personnelFit;

  if (!fit) {
    return modifiers;
  }

  const structure = input.play.structure;
  const personnelPackageId = structure.personnelPackageId;
  const directPlayFit = normalizeFitValue(fit.byPlayId?.[input.play.id]);
  const personnelPackageFit = normalizeFitValue(
    fit.byPersonnelPackageId?.[personnelPackageId],
  );
  const familyFit = normalizeFitValue(fit.byFamily?.[input.play.family]);
  const combinedFit = (directPlayFit * 0.45) + (personnelPackageFit * 0.35) + (familyFit * 0.2);
  const delta = (combinedFit - 0.5) * 0.55 * input.profile.personnelFitWeight;

  modifiers.push(
    createModifier(
      "PERSONNEL",
      `Personnel fit composite ${combinedFit.toFixed(2)} for ${personnelPackageId}.`,
      delta,
    ),
  );

  return modifiers;
}

function applySituationModifiersForOffense(input: {
  play: OffensivePlayDefinition;
  situation: GameSituationSnapshot;
  classification: SituationCallBias;
  profile: SelectionStrategyProfile;
  defensiveExpectation: DefensiveFamilyExpectation;
}) {
  const modifiers: SelectionModifier[] = [];
  const { play, classification, profile, situation } = input;
  const matchedTriggers = play.triggers.filter((trigger) =>
    matchesSituationFilter(situation, trigger.filter, play.structure.personnelPackageId),
  );
  const highestTriggerPriority = matchedTriggers.reduce(
    (highest, trigger) => Math.max(highest, trigger.priority),
    0,
  );

  if (highestTriggerPriority > 0) {
    modifiers.push(
      createModifier(
        "SITUATION",
        `Play trigger alignment (${matchedTriggers.map((trigger) => trigger.id).join(", ")}).`,
        highestTriggerPriority / 350,
      ),
    );
  }

  if (classification.isPassingDown && play.situationTags.includes("PASSING_DOWN")) {
    modifiers.push(createModifier("SITUATION", "Passing-down tag match.", 0.24));
  }

  if (classification.isShortYardage && play.situationTags.includes("SHORT_YARDAGE")) {
    modifiers.push(createModifier("SITUATION", "Short-yardage tag match.", 0.26));
  }

  if (classification.isRedZone && play.situationTags.includes("RED_ZONE")) {
    modifiers.push(createModifier("SITUATION", "Red-zone tag match.", 0.22));
  }

  if (classification.isGoalToGo && play.situationTags.includes("GOAL_LINE")) {
    modifiers.push(createModifier("SITUATION", "Goal-line tag match.", 0.28));
  }

  if (classification.isRedZone) {
    let redZoneDelta = 0;

    if (
      play.family === "GAP_RUN" ||
      play.family === "DESIGNED_QB_RUN" ||
      play.family === "QUICK_PASS" ||
      play.family === "PLAY_ACTION" ||
      play.family === "ZONE_RUN"
    ) {
      redZoneDelta += 0.22;
    }

    if (play.family === "OPTION_RPO") {
      redZoneDelta -= 0.08;
    }

    if (play.family === "SCREEN") {
      redZoneDelta -= 0.22;
    }

    if (play.family === "DROPBACK") {
      redZoneDelta -= 0.08;
    }

    if (play.family === "MOVEMENT_PASS") {
      redZoneDelta += 0.12;
    }

    if (play.family === "EMPTY_TEMPO") {
      redZoneDelta -= 0.12;
    }

    if (redZoneDelta !== 0) {
      modifiers.push(
        createModifier(
          "SITUATION",
          "Family-level red-zone bias.",
          redZoneDelta,
        ),
      );
    }
  }

  if (classification.urgency === "TWO_MINUTE" && play.situationTags.includes("TWO_MINUTE")) {
    modifiers.push(
      createModifier(
        "CLOCK",
        "Two-minute tag match for hurry-up sequencing.",
        0.34 * profile.clockWeight,
      ),
    );
  }

  if (classification.urgency === "TWO_MINUTE") {
    let hurryDelta = 0;

    if (play.family === "QUICK_PASS" || play.family === "DROPBACK") {
      hurryDelta += 0.42 * profile.clockWeight;
    }

    if (play.family === "SCREEN") {
      hurryDelta += 0.22 * profile.clockWeight;
    }

    if (play.family === "EMPTY_TEMPO") {
      hurryDelta += 0.48 * profile.clockWeight;
    }

    if (play.family === "MOVEMENT_PASS") {
      hurryDelta += 0.08 * profile.clockWeight;
    }

    if (
      play.family === "ZONE_RUN" ||
      play.family === "GAP_RUN" ||
      play.family === "DESIGNED_QB_RUN"
    ) {
      hurryDelta -= 0.36 * profile.clockWeight;
    }

    if (play.family === "OPTION_RPO") {
      hurryDelta -= 0.22 * profile.clockWeight;
    }

    if (play.family === "PLAY_ACTION") {
      hurryDelta -= 0.28 * profile.clockWeight;
    }

    if (hurryDelta !== 0) {
      modifiers.push(
        createModifier(
          "CLOCK",
          "Two-minute family tempo bias.",
          hurryDelta,
        ),
      );
    }
  }

  if (classification.needsClockDrain && play.situationTags.includes("FOUR_MINUTE")) {
    modifiers.push(
      createModifier(
        "CLOCK",
        "Four-minute tag match for lead protection.",
        0.3 * profile.clockWeight,
      ),
    );
  }

  if (classification.isBackedUp && play.situationTags.includes("BACKED_UP")) {
    modifiers.push(createModifier("SITUATION", "Backed-up field position fit.", 0.22));
  }

  if (classification.isShotWindow && play.situationTags.includes("SHOT_PLAY")) {
    modifiers.push(
      createModifier(
        "SITUATION",
        "Shot-play bonus in breaker window.",
        0.28 * profile.riskWeight,
      ),
    );
  }

  if (
    classification.isPassingDown &&
    (classification.distanceBucket === "LONG" ||
      classification.distanceBucket === "VERY_LONG")
  ) {
    let longYardageDelta = 0;

    if (
      play.family === "QUICK_PASS" ||
      play.family === "DROPBACK" ||
      play.family === "SCREEN" ||
      play.family === "MOVEMENT_PASS" ||
      play.family === "EMPTY_TEMPO"
    ) {
      longYardageDelta += 0.14;
    }

    if (play.family === "OPTION_RPO") {
      longYardageDelta -= 0.18;
    }

    if (
      play.family === "ZONE_RUN" ||
      play.family === "GAP_RUN" ||
      play.family === "DESIGNED_QB_RUN"
    ) {
      longYardageDelta -= 0.18;
    }

    if (play.family === "PLAY_ACTION") {
      longYardageDelta -= 0.06;
    }

    if (longYardageDelta !== 0) {
      modifiers.push(
        createModifier(
          "SITUATION",
          "Long-yardage family adjustment.",
          longYardageDelta,
        ),
      );
    }
  }

  const expectedPressure =
    (input.defensiveExpectation.ZERO_PRESSURE ?? 0) +
    (input.defensiveExpectation.FIRE_ZONE ?? 0) +
    (input.defensiveExpectation.SIMULATED_PRESSURE ?? 0) * 0.8 +
    (input.defensiveExpectation.RUN_BLITZ ?? 0) * 0.7;
  const expectedMan =
    (input.defensiveExpectation.MAN_COVERAGE ?? 0) +
    (input.defensiveExpectation.ZERO_PRESSURE ?? 0) +
    (input.defensiveExpectation.BRACKET_SPECIALTY ?? 0) * 0.55;
  const expectedZone =
    (input.defensiveExpectation.ZONE_COVERAGE ?? 0) +
    (input.defensiveExpectation.MATCH_COVERAGE ?? 0) * 0.75 +
    (input.defensiveExpectation.DROP_EIGHT ?? 0) +
    (input.defensiveExpectation.THREE_HIGH_PACKAGE ?? 0) * 0.9;

  if (
    expectedPressure > 0 &&
    (play.family === "QUICK_PASS" ||
      play.family === "MOVEMENT_PASS" ||
      play.family === "EMPTY_TEMPO" ||
      play.family === "SCREEN" ||
      play.family === "OPTION_RPO" ||
      play.situationTags.includes("PRESSURE_ANSWER"))
  ) {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        `Pressure-answer bonus versus expected pressure ${expectedPressure.toFixed(2)}.`,
        expectedPressure * 0.26 * profile.opponentContextWeight,
      ),
    );
  }

  if (expectedPressure > 0 && play.family === "DROPBACK") {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        "Dropback penalty into likely pressure picture.",
        -expectedPressure * 0.22 * profile.opponentContextWeight,
      ),
    );
  }

  if (
    expectedMan > 0 &&
    (play.family === "ZONE_RUN" ||
      play.family === "DESIGNED_QB_RUN" ||
      play.family === "SCREEN")
  ) {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        "Run/screen lift versus expected man structure.",
        expectedMan * 0.14 * profile.opponentContextWeight,
      ),
    );
  }

  if (
    expectedZone > 0 &&
    (play.family === "PLAY_ACTION" ||
      play.family === "DROPBACK" ||
      play.family === "MOVEMENT_PASS")
  ) {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        "Intermediate attack bonus versus expected zone spacing.",
        expectedZone * 0.12 * profile.opponentContextWeight,
      ),
    );
  }

  return modifiers;
}

function applySituationModifiersForDefense(input: {
  play: DefensivePlayDefinition;
  situation: GameSituationSnapshot;
  classification: SituationCallBias;
  profile: SelectionStrategyProfile;
  offensiveExpectation: OffensiveFamilyExpectation;
}) {
  const modifiers: SelectionModifier[] = [];
  const { play, classification, profile, situation } = input;
  const matchedTriggers = play.triggers.filter((trigger) =>
    matchesSituationFilter(situation, trigger.filter, play.structure.personnelPackageId),
  );
  const highestTriggerPriority = matchedTriggers.reduce(
    (highest, trigger) => Math.max(highest, trigger.priority),
    0,
  );

  if (highestTriggerPriority > 0) {
    modifiers.push(
      createModifier(
        "SITUATION",
        `Play trigger alignment (${matchedTriggers.map((trigger) => trigger.id).join(", ")}).`,
        highestTriggerPriority / 350,
      ),
    );
  }

  if (classification.isPassingDown && play.situationTags.includes("PASSING_DOWN")) {
    modifiers.push(createModifier("SITUATION", "Passing-down defensive tag match.", 0.24));
  }

  if (classification.isShortYardage && play.situationTags.includes("SHORT_YARDAGE")) {
    modifiers.push(createModifier("SITUATION", "Short-yardage defensive tag match.", 0.25));
  }

  if (classification.isRedZone && play.situationTags.includes("RED_ZONE")) {
    modifiers.push(createModifier("SITUATION", "Red-zone defensive tag match.", 0.25));
  }

  if (classification.isGoalToGo && play.situationTags.includes("GOAL_LINE")) {
    modifiers.push(createModifier("SITUATION", "Goal-line package match.", 0.3));
  }

  if (classification.isRedZone) {
    let redZoneDelta = 0;

    if (play.family === "RED_ZONE_PACKAGE") {
      redZoneDelta += 0.34;
    }

    if (play.family === "BRACKET_SPECIALTY") {
      redZoneDelta += 0.22;
    }

    if (play.family === "RUN_BLITZ") {
      redZoneDelta += 0.12;
    }

    if (play.family === "MAN_COVERAGE") {
      redZoneDelta += 0.08;
    }

    if (play.family === "ZONE_COVERAGE") {
      redZoneDelta -= 0.06;
    }

    if (play.family === "DROP_EIGHT") {
      redZoneDelta -= 0.1;
    }

    if (play.family === "ZERO_PRESSURE") {
      redZoneDelta -= 0.08;
    }

    if (redZoneDelta !== 0) {
      modifiers.push(
        createModifier(
          "SITUATION",
          "Family-level red-zone defensive bias.",
          redZoneDelta,
        ),
      );
    }
  }

  const expectedRun =
    (input.offensiveExpectation.ZONE_RUN ?? 0) +
    (input.offensiveExpectation.GAP_RUN ?? 0) +
    (input.offensiveExpectation.DESIGNED_QB_RUN ?? 0) +
    (input.offensiveExpectation.OPTION_RPO ?? 0) * 0.6;
  const expectedPass =
    (input.offensiveExpectation.QUICK_PASS ?? 0) +
    (input.offensiveExpectation.DROPBACK ?? 0) +
    (input.offensiveExpectation.MOVEMENT_PASS ?? 0) +
    (input.offensiveExpectation.SCREEN ?? 0) +
    (input.offensiveExpectation.EMPTY_TEMPO ?? 0) +
    (input.offensiveExpectation.PLAY_ACTION ?? 0) * 0.7;
  const expectedShot =
    (input.offensiveExpectation.DROPBACK ?? 0) * 0.45 +
    (input.offensiveExpectation.PLAY_ACTION ?? 0) * 0.35 +
    (input.offensiveExpectation.MOVEMENT_PASS ?? 0) * 0.2;

  if (
    expectedRun > 0 &&
    (play.family === "MATCH_COVERAGE" ||
      play.family === "ZONE_COVERAGE" ||
      play.family === "RUN_BLITZ" ||
      play.family === "RED_ZONE_PACKAGE")
  ) {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        "Run-fit lift against expected run-heavy menu.",
        expectedRun * 0.16 * profile.opponentContextWeight,
      ),
    );
  }

  if (expectedRun > 0 && play.family === "ZERO_PRESSURE") {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        "Zero pressure penalty against run-heavy expectation.",
        -expectedRun * 0.14 * profile.opponentContextWeight,
      ),
    );
  }

  if (
    expectedPass > 0 &&
    (play.family === "MAN_COVERAGE" ||
      play.family === "FIRE_ZONE" ||
      play.family === "SIMULATED_PRESSURE" ||
      play.family === "DROP_EIGHT" ||
      play.family === "BRACKET_SPECIALTY" ||
      play.family === "THREE_HIGH_PACKAGE" ||
      play.family === "ZERO_PRESSURE")
  ) {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        "Pass-rush or coverage pressure bonus against expected pass.",
        expectedPass * 0.16 * profile.opponentContextWeight,
      ),
    );
  }

  if (
    expectedShot > 0 &&
    (play.family === "MATCH_COVERAGE" ||
      play.family === "SIMULATED_PRESSURE" ||
      play.family === "DROP_EIGHT" ||
      play.family === "BRACKET_SPECIALTY" ||
      play.family === "THREE_HIGH_PACKAGE")
  ) {
    modifiers.push(
      createModifier(
        "DEFENSIVE_CONTEXT",
        "Shot-play protection bonus from split-safety or disguised pressure.",
        expectedShot * 0.12 * profile.opponentContextWeight,
      ),
    );
  }

  return modifiers;
}
function offenseExpectedValue(play: OffensivePlayDefinition) {
  const metrics = play.expectedMetrics;

  return (
    (metrics.expectedYards / 8 - 0.5) * 0.36 +
    (metrics.efficiencyRate - 0.5) * 0.34 +
    (metrics.redZoneValue - 0.5) * 0.18 +
    (metrics.explosiveRate - 0.1) * 0.12
  );
}

function offenseFloorValue(play: OffensivePlayDefinition) {
  const metrics = play.expectedMetrics;

  return (
    (metrics.efficiencyRate - 0.5) * 0.42 +
    ((1 - metrics.pressureRate) - 0.9) * 0.32 +
    ((1 - metrics.turnoverSwingRate) - 0.94) * 0.26
  );
}

function offenseRiskValue(play: OffensivePlayDefinition) {
  const metrics = play.expectedMetrics;

  return (
    (metrics.explosiveRate - 0.1) * 0.75 -
    (metrics.turnoverSwingRate - 0.04) * 0.48 -
    (metrics.pressureRate - 0.05) * 0.38
  );
}

function defenseExpectedValue(play: DefensivePlayDefinition) {
  const metrics = play.expectedMetrics;

  return (
    ((5.2 - metrics.expectedYards) / 5.2) * 0.38 +
    (0.5 - metrics.efficiencyRate) * 0.28 +
    (metrics.turnoverSwingRate - 0.06) * 0.16 +
    (metrics.redZoneValue - 0.45) * 0.18
  );
}

function defenseFloorValue(play: DefensivePlayDefinition) {
  const metrics = play.expectedMetrics;

  return (
    (0.11 - metrics.explosiveRate) * 0.5 +
    ((5.2 - metrics.expectedYards) / 5.2) * 0.3 +
    (metrics.redZoneValue - 0.45) * 0.2
  );
}

function defenseRiskValue(play: DefensivePlayDefinition) {
  const metrics = play.expectedMetrics;

  return (
    (metrics.pressureRate - 0.2) * 0.6 +
    (metrics.turnoverSwingRate - 0.06) * 0.4 -
    (metrics.explosiveRate - 0.1) * 0.5
  );
}

function buildOffensiveExpectation(
  candidates: OffensivePlayDefinition[],
  baseWeights: Map<string, number>,
  classification: SituationCallBias,
): OffensiveFamilyExpectation {
  const familyWeights = new Map<OffensivePlayFamily, number>();

  for (const candidate of candidates) {
    let weight = baseWeights.get(candidate.id) ?? 0.08;

    if (
      classification.isPassingDown &&
      candidate.situationTags.includes("PASSING_DOWN")
    ) {
      weight += 0.22;
    }

    if (
      classification.isShortYardage &&
      candidate.situationTags.includes("SHORT_YARDAGE")
    ) {
      weight += 0.2;
    }

    if (classification.isShotWindow && candidate.situationTags.includes("SHOT_PLAY")) {
      weight += 0.24;
    }

    familyWeights.set(candidate.family, (familyWeights.get(candidate.family) ?? 0) + weight);
  }

  return Object.fromEntries(
    buildExpectationSpace(familyWeights).map((entry) => [
      entry.family as OffensivePlayFamily,
      entry.probability,
    ]),
  ) as OffensiveFamilyExpectation;
}

function buildDefensiveExpectation(
  candidates: DefensivePlayDefinition[],
  baseWeights: Map<string, number>,
  classification: SituationCallBias,
): DefensiveFamilyExpectation {
  const familyWeights = new Map<DefensivePlayFamily, number>();

  for (const candidate of candidates) {
    let weight = baseWeights.get(candidate.id) ?? 0.08;

    if (
      classification.isPassingDown &&
      candidate.situationTags.includes("PASSING_DOWN")
    ) {
      weight += 0.22;
    }

    if (classification.isRedZone && candidate.situationTags.includes("RED_ZONE")) {
      weight += 0.24;
    }

    if (
      classification.isShortYardage &&
      candidate.situationTags.includes("SHORT_YARDAGE")
    ) {
      weight += 0.18;
    }

    familyWeights.set(candidate.family, (familyWeights.get(candidate.family) ?? 0) + weight);
  }

  return Object.fromEntries(
    buildExpectationSpace(familyWeights).map((entry) => [
      entry.family as DefensivePlayFamily,
      entry.probability,
    ]),
  ) as DefensiveFamilyExpectation;
}

function sampleCandidate<TPlay extends PlayCallDefinition>(
  candidates: WeightedCandidate<TPlay>[],
  random: () => number,
) {
  const roll = random();
  let cumulative = 0;

  for (const candidate of candidates) {
    cumulative += candidate.selectionProbability;

    if (roll <= cumulative) {
      return {
        candidate,
        roll,
      };
    }
  }

  return {
    candidate: candidates[candidates.length - 1],
    roll,
  };
}

function makeRejection(playId: string, reason: string, issues: string[]): CandidateRejection {
  return {
    playId,
    reason,
    issues,
  };
}

function applyClockAndTerritoryModifiers<TPlay extends PlayCallDefinition>(input: {
  play: TPlay;
  classification: SituationCallBias;
  profile: SelectionStrategyProfile;
}) {
  const modifiers: SelectionModifier[] = [];
  const { play, classification, profile } = input;
  const timeouts = classification.remainingTimeouts;

  if (classification.urgency === "TWO_MINUTE") {
    const quickGameBonus =
      play.family === "QUICK_PASS" ||
      play.family === "DROPBACK" ||
      play.family === "EMPTY_TEMPO" ||
      play.family === "MAN_COVERAGE"
        ? 0.3
        : play.family === "ZONE_COVERAGE" ||
            play.family === "DROP_EIGHT" ||
            play.family === "THREE_HIGH_PACKAGE"
          ? 0.22
          : play.family === "BRACKET_SPECIALTY"
            ? 0.16
        : play.family === "MOVEMENT_PASS"
          ? 0.14
        : 0;
    const conservativePenalty =
      play.family === "ZONE_RUN" ||
      play.family === "GAP_RUN" ||
      play.family === "DESIGNED_QB_RUN" ||
      play.family === "RED_ZONE_PACKAGE"
        ? -0.14
        : play.family === "RUN_BLITZ"
          ? -0.08
        : 0;
    const timeoutBonus = timeouts <= 1 ? quickGameBonus * 0.6 : quickGameBonus;
    const delta = (timeoutBonus + conservativePenalty) * profile.clockWeight;

    if (delta !== 0) {
      modifiers.push(
        createModifier(
          "CLOCK",
          "Two-minute or endgame context adjustment.",
          delta,
        ),
      );
    }
  }

  if (classification.needsClockDrain) {
    const drainDelta =
      play.family === "ZONE_RUN" || play.family === "GAP_RUN"
        ? 0.18 * profile.clockWeight
        : play.family === "DESIGNED_QB_RUN"
          ? 0.12 * profile.clockWeight
        : play.family === "DROPBACK" || play.family === "ZERO_PRESSURE"
          ? -0.08 * profile.clockWeight
          : 0;

    if (drainDelta !== 0) {
      modifiers.push(
        createModifier(
          "CLOCK",
          "Lead-protection clock drain modifier.",
          drainDelta,
        ),
      );
    }
  }

  if (classification.isFourDownTerritory) {
    let delta = 0;

    if (
      play.family === "OPTION_RPO" ||
      play.family === "QUICK_PASS" ||
      play.family === "EMPTY_TEMPO" ||
      play.family === "GAP_RUN" ||
      play.family === "DESIGNED_QB_RUN" ||
      play.family === "ZERO_PRESSURE" ||
      play.family === "MAN_COVERAGE" ||
      play.family === "RUN_BLITZ"
    ) {
      delta += 0.22 * profile.fourDownWeight;
    }

    if (
      play.family === "DROPBACK" ||
      (play.side === "OFFENSE" && play.situationTags.includes("SHOT_PLAY"))
    ) {
      delta -= 0.09 * profile.fourDownWeight;
    }

    if (play.side === "OFFENSE" && profile.mode === "AGGRESSIVE") {
      if (
        play.family === "OPTION_RPO" ||
        play.family === "QUICK_PASS" ||
        play.family === "EMPTY_TEMPO"
      ) {
        delta += 0.24;
      }

      if (play.family === "DROPBACK" || play.family === "MOVEMENT_PASS") {
        delta += 0.08;
      }

      if (play.family === "ZONE_RUN" || play.family === "SCREEN") {
        delta -= 0.14;
      }

      if (play.family === "GAP_RUN") {
        delta -= 0.04;
      }

      if (play.family === "DESIGNED_QB_RUN") {
        delta += 0.04;
      }
    }

    if (play.side === "OFFENSE" && profile.mode === "CONSERVATIVE") {
      if (play.family === "OPTION_RPO") {
        delta -= 0.14;
      }

      if (play.family === "QUICK_PASS" || play.family === "EMPTY_TEMPO") {
        delta -= 0.05;
      }

      if (play.family === "ZONE_RUN") {
        delta += 0.1;
      }

      if (play.family === "GAP_RUN" || play.family === "DESIGNED_QB_RUN") {
        delta += 0.08;
      }
    }

    if (
      play.side === "DEFENSE" &&
      profile.mode === "AGGRESSIVE" &&
      (play.family === "ZERO_PRESSURE" ||
        play.family === "MAN_COVERAGE" ||
        play.family === "RUN_BLITZ")
    ) {
      delta += 0.1;
    }

    if (delta !== 0) {
      modifiers.push(
        createModifier(
          "FOUR_DOWN",
          "Four-down-territory adjustment.",
          delta,
        ),
      );
    }
  }

  return modifiers;
}

function applyFatigueModifier<TPlay extends PlayCallDefinition>(input: {
  play: TPlay;
  fatigueMultiplier: number;
  profile: SelectionStrategyProfile;
}) {
  const normalizedFatigue = clamp(input.fatigueMultiplier, 0.7, 1.1);
  const delta = Math.log(normalizedFatigue) * input.profile.fatigueWeight;

  return [
    createModifier(
      "FATIGUE",
      `Fatigue multiplier ${normalizedFatigue.toFixed(2)}.`,
      delta,
    ),
  ];
}

function applyOffenseXFactorModifiers(input: {
  play: OffensivePlayDefinition;
  plan: PreGameXFactorPlan;
  classification: SituationCallBias;
}) {
  const modifiers: SelectionModifier[] = [];
  const { play, plan, classification } = input;
  let focusDelta = 0;

  if (plan.offensiveFocus === "RUN_FIRST") {
    if (
      play.family === "ZONE_RUN" ||
      play.family === "GAP_RUN" ||
      play.family === "DESIGNED_QB_RUN" ||
      play.family === "OPTION_RPO"
    ) {
      focusDelta += 0.2;
    } else if (play.family === "DROPBACK" || play.family === "EMPTY_TEMPO") {
      focusDelta -= 0.12;
    }
  }

  if (plan.offensiveFocus === "PASS_FIRST") {
    if (
      play.family === "QUICK_PASS" ||
      play.family === "DROPBACK" ||
      play.family === "PLAY_ACTION" ||
      play.family === "MOVEMENT_PASS" ||
      play.family === "SCREEN" ||
      play.family === "EMPTY_TEMPO"
    ) {
      focusDelta += 0.18;
    } else {
      focusDelta -= 0.1;
    }
  }

  if (focusDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game offensive focus ${plan.offensiveFocus}.`, focusDelta),
    );
  }

  let aggressionDelta = 0;

  if (plan.aggression === "CONSERVATIVE") {
    aggressionDelta += offenseFloorValue(play) * 0.45 - Math.max(offenseRiskValue(play), 0) * 0.35;
  } else if (plan.aggression === "AGGRESSIVE") {
    aggressionDelta += offenseRiskValue(play) * 0.45;

    if (play.situationTags.includes("SHOT_PLAY") || play.family === "DROPBACK") {
      aggressionDelta += 0.09;
    }
  }

  if (aggressionDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game aggression ${plan.aggression}.`, aggressionDelta),
    );
  }

  let tempoDelta = 0;

  if (plan.tempoPlan === "SLOW") {
    if (play.family === "ZONE_RUN" || play.family === "GAP_RUN" || play.family === "PLAY_ACTION") {
      tempoDelta += classification.needsExplosiveAnswer ? 0.02 : 0.14;
    }

    if (play.family === "EMPTY_TEMPO" || play.family === "DROPBACK") {
      tempoDelta -= 0.14;
    }
  } else if (plan.tempoPlan === "HURRY_UP") {
    if (
      play.family === "QUICK_PASS" ||
      play.family === "SCREEN" ||
      play.family === "EMPTY_TEMPO" ||
      play.family === "OPTION_RPO"
    ) {
      tempoDelta += 0.18;
    }

    if (play.family === "GAP_RUN" || play.family === "PLAY_ACTION") {
      tempoDelta -= 0.08;
    }
  }

  if (tempoDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game tempo plan ${plan.tempoPlan}.`, tempoDelta),
    );
  }

  let protectionDelta = 0;

  if (plan.protectionPlan === "MAX_PROTECT") {
    if (play.family === "PLAY_ACTION" || play.family === "MOVEMENT_PASS") {
      protectionDelta += 0.14;
    }

    if (play.family === "EMPTY_TEMPO" || play.family === "SCREEN") {
      protectionDelta -= 0.08;
    }
  } else if (plan.protectionPlan === "FAST_RELEASE") {
    if (
      play.family === "QUICK_PASS" ||
      play.family === "SCREEN" ||
      play.family === "OPTION_RPO" ||
      play.family === "EMPTY_TEMPO"
    ) {
      protectionDelta += 0.16;
    }

    if (play.family === "DROPBACK" || play.family === "PLAY_ACTION") {
      protectionDelta -= 0.1;
    }
  }

  if (protectionDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game protection plan ${plan.protectionPlan}.`, protectionDelta),
    );
  }

  let matchupDelta = 0;

  if (plan.offensiveMatchupFocus === "FEATURE_WR") {
    if (play.family === "DROPBACK" || play.family === "QUICK_PASS" || play.family === "EMPTY_TEMPO") {
      matchupDelta += 0.12;
    }
  } else if (plan.offensiveMatchupFocus === "FEATURE_TE") {
    if (play.situationTags.includes("RED_ZONE") || play.family === "PLAY_ACTION" || play.family === "QUICK_PASS") {
      matchupDelta += 0.1;
    }
  } else if (plan.offensiveMatchupFocus === "FEATURE_RB") {
    if (play.family === "ZONE_RUN" || play.family === "GAP_RUN" || play.family === "SCREEN") {
      matchupDelta += 0.13;
    }
  } else if (plan.offensiveMatchupFocus === "PROTECT_QB") {
    if (
      play.family === "QUICK_PASS" ||
      play.family === "SCREEN" ||
      play.family === "MOVEMENT_PASS" ||
      play.family === "OPTION_RPO"
    ) {
      matchupDelta += 0.11;
    }

    if (play.family === "DROPBACK") {
      matchupDelta -= 0.1;
    }
  }

  if (matchupDelta !== 0) {
    modifiers.push(
      createModifier(
        "X_FACTOR",
        `Pre-game offensive matchup focus ${plan.offensiveMatchupFocus}.`,
        matchupDelta,
      ),
    );
  }

  let turnoverDelta = 0;

  if (plan.turnoverPlan === "PROTECT_BALL") {
    turnoverDelta += (0.06 - play.expectedMetrics.turnoverSwingRate) * 1.4;

    if (play.expectedMetrics.explosiveRate > 0.16) {
      turnoverDelta -= 0.08;
    }
  } else if (plan.turnoverPlan === "HUNT_TURNOVERS") {
    turnoverDelta += play.expectedMetrics.explosiveRate * 0.45 - play.expectedMetrics.turnoverSwingRate * 0.3;
  }

  if (turnoverDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game turnover plan ${plan.turnoverPlan}.`, turnoverDelta),
    );
  }

  return modifiers;
}

function applyDefenseXFactorModifiers(input: {
  play: DefensivePlayDefinition;
  plan: PreGameXFactorPlan;
  classification: SituationCallBias;
}) {
  const modifiers: SelectionModifier[] = [];
  const { play, plan, classification } = input;
  let focusDelta = 0;

  if (plan.defensiveFocus === "STOP_RUN") {
    if (
      play.family === "RUN_BLITZ" ||
      play.family === "RED_ZONE_PACKAGE" ||
      play.family === "MATCH_COVERAGE" ||
      play.family === "ZONE_COVERAGE"
    ) {
      focusDelta += 0.18;
    }

    if (play.family === "DROP_EIGHT" || play.family === "ZERO_PRESSURE") {
      focusDelta -= 0.1;
    }
  } else if (plan.defensiveFocus === "LIMIT_PASS") {
    if (
      play.family === "MATCH_COVERAGE" ||
      play.family === "ZONE_COVERAGE" ||
      play.family === "MAN_COVERAGE" ||
      play.family === "DROP_EIGHT" ||
      play.family === "BRACKET_SPECIALTY" ||
      play.family === "THREE_HIGH_PACKAGE"
    ) {
      focusDelta += 0.17;
    }

    if (play.family === "RUN_BLITZ") {
      focusDelta -= 0.1;
    }
  }

  if (focusDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game defensive focus ${plan.defensiveFocus}.`, focusDelta),
    );
  }

  let aggressionDelta = 0;

  if (plan.aggression === "CONSERVATIVE") {
    aggressionDelta += defenseFloorValue(play) * 0.42;

    if (play.family === "ZERO_PRESSURE" || play.family === "RUN_BLITZ") {
      aggressionDelta -= 0.14;
    }
  } else if (plan.aggression === "AGGRESSIVE") {
    aggressionDelta += defenseRiskValue(play) * 0.5;

    if (play.family === "ZERO_PRESSURE" || play.family === "FIRE_ZONE" || play.family === "RUN_BLITZ") {
      aggressionDelta += 0.09;
    }
  }

  if (aggressionDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game aggression ${plan.aggression}.`, aggressionDelta),
    );
  }

  let matchupDelta = 0;

  if (plan.defensiveMatchupFocus === "DOUBLE_WR1") {
    if (play.family === "BRACKET_SPECIALTY" || play.family === "MATCH_COVERAGE" || play.family === "MAN_COVERAGE") {
      matchupDelta += 0.13;
    }
  } else if (plan.defensiveMatchupFocus === "SPY_QB") {
    if (play.family === "ZONE_COVERAGE" || play.family === "MATCH_COVERAGE" || play.family === "RUN_BLITZ") {
      matchupDelta += 0.1;
    }

    if (play.family === "ZERO_PRESSURE") {
      matchupDelta -= 0.08;
    }
  } else if (plan.defensiveMatchupFocus === "BRACKET_TE") {
    if (play.family === "BRACKET_SPECIALTY" || play.family === "RED_ZONE_PACKAGE" || play.family === "MATCH_COVERAGE") {
      matchupDelta += 0.12;
    }
  } else if (plan.defensiveMatchupFocus === "ATTACK_WEAK_OL") {
    if (
      play.family === "FIRE_ZONE" ||
      play.family === "SIMULATED_PRESSURE" ||
      play.family === "ZERO_PRESSURE" ||
      play.family === "RUN_BLITZ"
    ) {
      matchupDelta += 0.15;
    }

    if (play.family === "DROP_EIGHT") {
      matchupDelta -= 0.1;
    }
  }

  if (classification.isRedZone && plan.defensiveMatchupFocus === "BRACKET_TE" && play.family === "RED_ZONE_PACKAGE") {
    matchupDelta += 0.06;
  }

  if (matchupDelta !== 0) {
    modifiers.push(
      createModifier(
        "X_FACTOR",
        `Pre-game defensive matchup focus ${plan.defensiveMatchupFocus}.`,
        matchupDelta,
      ),
    );
  }

  let turnoverDelta = 0;

  if (plan.turnoverPlan === "HUNT_TURNOVERS") {
    if (
      play.family === "MAN_COVERAGE" ||
      play.family === "ZERO_PRESSURE" ||
      play.family === "FIRE_ZONE" ||
      play.family === "SIMULATED_PRESSURE" ||
      play.family === "BRACKET_SPECIALTY"
    ) {
      turnoverDelta += 0.14;
    }

    turnoverDelta += play.expectedMetrics.turnoverSwingRate * 0.7;
  } else if (plan.turnoverPlan === "PROTECT_BALL") {
    if (play.family === "DROP_EIGHT" || play.family === "ZONE_COVERAGE" || play.family === "THREE_HIGH_PACKAGE") {
      turnoverDelta += 0.12;
    }

    if (play.family === "ZERO_PRESSURE" || play.family === "RUN_BLITZ") {
      turnoverDelta -= 0.1;
    }
  }

  if (turnoverDelta !== 0) {
    modifiers.push(
      createModifier("X_FACTOR", `Pre-game turnover plan ${plan.turnoverPlan}.`, turnoverDelta),
    );
  }

  return modifiers;
}

function normalizedRatingEdge(value: number | undefined, center = 72) {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }

  return clamp((value - center) / 28, -1, 1);
}

function applyOffensiveCoordinatorModifiers(input: {
  play: OffensivePlayDefinition;
  classification: SituationCallBias;
  profile: SelectionStrategyProfile;
  coordinator: OffensiveCoordinatorTendencies;
  teamStrength?: CoordinatorTeamStrengthSnapshot;
  opponentWeakness?: CoordinatorOpponentWeaknessSnapshot;
  defensiveExpectation: DefensiveFamilyExpectation;
  xFactorPlan: PreGameXFactorPlan;
}) {
  const modifiers: SelectionModifier[] = [];
  const {
    play,
    classification,
    profile,
    coordinator,
    teamStrength,
    opponentWeakness,
    defensiveExpectation,
    xFactorPlan,
  } = input;
  const isRunFamily =
    play.family === "ZONE_RUN" ||
    play.family === "GAP_RUN" ||
    play.family === "DESIGNED_QB_RUN" ||
    play.family === "OPTION_RPO";
  const isPassFamily =
    play.family === "QUICK_PASS" ||
    play.family === "DROPBACK" ||
    play.family === "PLAY_ACTION" ||
    play.family === "MOVEMENT_PASS" ||
    play.family === "SCREEN" ||
    play.family === "EMPTY_TEMPO";
  const isQuickAnswer =
    play.family === "QUICK_PASS" ||
    play.family === "SCREEN" ||
    play.family === "MOVEMENT_PASS" ||
    play.family === "OPTION_RPO" ||
    play.family === "EMPTY_TEMPO";
  const isDeepShot =
    play.family === "DROPBACK" ||
    play.family === "PLAY_ACTION" ||
    play.situationTags.includes("SHOT_PLAY");
  const expectedPressure =
    (defensiveExpectation.ZERO_PRESSURE ?? 0) +
    (defensiveExpectation.FIRE_ZONE ?? 0) +
    (defensiveExpectation.SIMULATED_PRESSURE ?? 0) * 0.8;
  const passPlanEdge =
    normalizedRatingEdge(teamStrength?.passOffense) +
    normalizedRatingEdge(opponentWeakness?.secondary);
  const runPlanEdge =
    normalizedRatingEdge(teamStrength?.runOffense) +
    normalizedRatingEdge(opponentWeakness?.runDefense);
  const passRushThreat = normalizedRatingEdge(opponentWeakness?.passRush);

  if (coordinator.runPassLean !== 0) {
    const delta =
      coordinator.runPassLean * (isPassFamily ? 0.2 : isRunFamily ? -0.18 : 0);

    if (delta !== 0) {
      modifiers.push(
        createModifier(
          "COORDINATOR",
          "Offensive coordinator run/pass tendency.",
          delta,
        ),
      );
    }
  }

  if (coordinator.aggressiveness !== 0) {
    let delta = 0;

    if (coordinator.aggressiveness > 0) {
      delta += coordinator.aggressiveness * (isDeepShot ? 0.22 : play.family === "EMPTY_TEMPO" ? 0.12 : 0);
      delta -= coordinator.aggressiveness * (play.family === "ZONE_RUN" ? 0.08 : 0);
    } else {
      delta += Math.abs(coordinator.aggressiveness) *
        (play.family === "ZONE_RUN" || play.family === "QUICK_PASS" || play.family === "SCREEN"
          ? 0.14
          : isDeepShot
            ? -0.16
            : 0);
    }

    if (delta !== 0) {
      modifiers.push(
        createModifier(
          "COORDINATOR",
          "Offensive coordinator aggression tendency.",
          delta * profile.riskWeight,
        ),
      );
    }
  }

  if (coordinator.tempo !== 0) {
    const delta =
      coordinator.tempo *
      (play.family === "EMPTY_TEMPO"
        ? 0.24
        : play.family === "QUICK_PASS" || play.family === "SCREEN"
          ? 0.14
          : play.family === "GAP_RUN" || play.family === "PLAY_ACTION"
            ? -0.08
            : 0);

    if (delta !== 0) {
      modifiers.push(
        createModifier("COORDINATOR", "Offensive coordinator tempo tendency.", delta),
      );
    }
  }

  if (coordinator.targetPreference !== "BALANCED") {
    let delta = 0;

    if (coordinator.targetPreference === "FEATURE_WR") {
      delta =
        play.family === "DROPBACK" || play.family === "QUICK_PASS" || play.family === "EMPTY_TEMPO"
          ? 0.14
          : play.family === "SCREEN"
            ? -0.04
            : 0;
    } else if (coordinator.targetPreference === "FEATURE_TE") {
      delta =
        play.family === "PLAY_ACTION" ||
        play.family === "QUICK_PASS" ||
        (classification.isRedZone && play.family === "MOVEMENT_PASS")
          ? 0.12
          : 0;
    } else if (coordinator.targetPreference === "FEATURE_RB") {
      delta =
        play.family === "SCREEN" ||
        play.family === "ZONE_RUN" ||
        play.family === "GAP_RUN" ||
        play.family === "OPTION_RPO"
          ? 0.13
          : play.family === "DROPBACK"
            ? -0.06
            : 0;
    }

    if (delta !== 0) {
      modifiers.push(
        createModifier(
          "COORDINATOR",
          `Offensive coordinator target preference ${coordinator.targetPreference}.`,
          delta,
        ),
      );
    }
  }

  if (expectedPressure > 0 && isQuickAnswer) {
    modifiers.push(
      createModifier(
        "COORDINATOR",
        "Coordinator quick/screen answer versus expected pressure.",
        expectedPressure * coordinator.screenQuickVsBlitz * 0.28,
      ),
    );
  }

  if (expectedPressure > 0 && play.family === "DROPBACK") {
    modifiers.push(
      createModifier(
        "COORDINATOR",
        "Coordinator avoids static dropback into pressure.",
        -expectedPressure * coordinator.screenQuickVsBlitz * 0.16,
      ),
    );
  }

  if (isDeepShot) {
    modifiers.push(
      createModifier(
        "COORDINATOR",
        "Coordinator deep-shot frequency tendency.",
        (coordinator.deepShotFrequency - 0.5) * 0.28,
      ),
    );
  }

  if (passPlanEdge !== 0 && isPassFamily) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan leans into pass strength or weak secondary.",
        passPlanEdge * 0.11,
      ),
    );
  }

  if (runPlanEdge !== 0 && isRunFamily) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan leans into run strength or weak run defense.",
        runPlanEdge * 0.1,
      ),
    );
  }

  if (passRushThreat > 0 && isQuickAnswer) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan answers strong pass rush with quick or screen concepts.",
        passRushThreat * 0.18,
      ),
    );
  }

  if (passRushThreat > 0 && play.family === "DROPBACK") {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan protects against strong pass rush by reducing pure dropbacks.",
        -passRushThreat * 0.14,
      ),
    );
  }

  if (normalizedRatingEdge(opponentWeakness?.secondary) > 0.35 && isDeepShot) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan attacks weak secondary with deeper concepts.",
        normalizedRatingEdge(opponentWeakness?.secondary) * 0.18,
      ),
    );
  }

  if (xFactorPlan.protectionPlan === "FAST_RELEASE" && isQuickAnswer) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "X-Factor hook: fast release amplifies coordinator quick answers.",
        0.08,
      ),
    );
  }

  if (xFactorPlan.offensiveMatchupFocus === "FEATURE_WR" && isDeepShot) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "X-Factor hook: featured receiver expands deep-shot menu.",
        0.07,
      ),
    );
  }

  return modifiers;
}

function applyDefensiveCoordinatorModifiers(input: {
  play: DefensivePlayDefinition;
  profile: SelectionStrategyProfile;
  coordinator: DefensiveCoordinatorTendencies;
  teamStrength?: CoordinatorTeamStrengthSnapshot;
  opponentWeakness?: CoordinatorOpponentWeaknessSnapshot;
  offensiveExpectation: OffensiveFamilyExpectation;
  xFactorPlan: PreGameXFactorPlan;
}) {
  const modifiers: SelectionModifier[] = [];
  const { play, profile, coordinator, teamStrength, opponentWeakness, offensiveExpectation, xFactorPlan } = input;
  const isPressure =
    play.family === "ZERO_PRESSURE" ||
    play.family === "FIRE_ZONE" ||
    play.family === "SIMULATED_PRESSURE" ||
    play.family === "RUN_BLITZ";
  const isPress =
    play.family === "MAN_COVERAGE" ||
    play.family === "ZERO_PRESSURE" ||
    play.family === "BRACKET_SPECIALTY";
  const isZone =
    play.family === "ZONE_COVERAGE" ||
    play.family === "MATCH_COVERAGE" ||
    play.family === "DROP_EIGHT" ||
    play.family === "THREE_HIGH_PACKAGE";
  const expectedPass =
    (offensiveExpectation.QUICK_PASS ?? 0) +
    (offensiveExpectation.DROPBACK ?? 0) +
    (offensiveExpectation.MOVEMENT_PASS ?? 0) +
    (offensiveExpectation.EMPTY_TEMPO ?? 0) +
    (offensiveExpectation.PLAY_ACTION ?? 0) * 0.7;
  const expectedRun =
    (offensiveExpectation.ZONE_RUN ?? 0) +
    (offensiveExpectation.GAP_RUN ?? 0) +
    (offensiveExpectation.DESIGNED_QB_RUN ?? 0) +
    (offensiveExpectation.OPTION_RPO ?? 0) * 0.6;
  const passRushEdge =
    normalizedRatingEdge(teamStrength?.passRush) +
    normalizedRatingEdge(opponentWeakness?.offensiveLine);
  const coverageEdge =
    normalizedRatingEdge(teamStrength?.coverage) +
    normalizedRatingEdge(opponentWeakness?.quarterbackDecision);

  if (isPressure) {
    modifiers.push(
      createModifier(
        "COORDINATOR",
        "Defensive coordinator blitz-frequency tendency.",
        (coordinator.blitzFrequency - 0.5) * 0.42 * profile.riskWeight,
      ),
    );
  } else if (coordinator.blitzFrequency < 0.38 && play.family === "DROP_EIGHT") {
    modifiers.push(
      createModifier(
        "COORDINATOR",
        "Defensive coordinator low-blitz tendency favors coverage volume.",
        (0.38 - coordinator.blitzFrequency) * 0.18,
      ),
    );
  }

  if (isPress) {
    modifiers.push(
      createModifier(
        "COORDINATOR",
        "Defensive coordinator press-frequency tendency.",
        (coordinator.pressFrequency - 0.5) * 0.36,
      ),
    );
  }

  if (coordinator.aggressiveness !== 0) {
    const delta =
      coordinator.aggressiveness *
      (isPressure
        ? 0.18
        : play.family === "MAN_COVERAGE"
          ? 0.1
          : play.family === "DROP_EIGHT" || play.family === "THREE_HIGH_PACKAGE"
            ? -0.1
            : 0);

    if (delta !== 0) {
      modifiers.push(
        createModifier(
          "COORDINATOR",
          "Defensive coordinator aggression tendency.",
          delta * profile.riskWeight,
        ),
      );
    }
  }

  if (coordinator.coveragePreference !== "BALANCED") {
    let delta = 0;

    if (coordinator.coveragePreference === "MAN") {
      delta = play.family === "MAN_COVERAGE" || play.family === "ZERO_PRESSURE" ? 0.16 : isZone ? -0.06 : 0;
    } else if (coordinator.coveragePreference === "ZONE") {
      delta = play.family === "ZONE_COVERAGE" || play.family === "DROP_EIGHT" ? 0.16 : isPress ? -0.08 : 0;
    } else if (coordinator.coveragePreference === "MATCH") {
      delta = play.family === "MATCH_COVERAGE" || play.family === "THREE_HIGH_PACKAGE" ? 0.14 : 0;
    } else if (coordinator.coveragePreference === "PRESS") {
      delta = isPress ? 0.18 : isZone ? -0.06 : 0;
    }

    if (delta !== 0) {
      modifiers.push(
        createModifier(
          "COORDINATOR",
          `Defensive coordinator coverage preference ${coordinator.coveragePreference}.`,
          delta,
        ),
      );
    }
  }

  if (expectedPass > 0.45 && isPressure) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan raises pressure calls against likely pass menu.",
        expectedPass * coordinator.blitzFrequency * 0.12,
      ),
    );
  }

  if (expectedRun > 0.45 && play.family === "RUN_BLITZ") {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan uses run blitz against likely run menu.",
        expectedRun * 0.16,
      ),
    );
  }

  if (passRushEdge > 0 && isPressure) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan attacks weak protection with pass-rush strength.",
        passRushEdge * 0.13,
      ),
    );
  }

  if (coverageEdge > 0 && (isZone || isPress)) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "Gameplan leans on coverage strength or uncertain QB decisions.",
        coverageEdge * 0.09,
      ),
    );
  }

  if (xFactorPlan.defensiveMatchupFocus === "ATTACK_WEAK_OL" && isPressure) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "X-Factor hook: attack weak OL amplifies coordinator pressure.",
        0.08,
      ),
    );
  }

  if (xFactorPlan.defensiveMatchupFocus === "DOUBLE_WR1" && isPress) {
    modifiers.push(
      createModifier(
        "GAMEPLAN",
        "X-Factor hook: double WR1 supports press/bracket calls.",
        0.07,
      ),
    );
  }

  return modifiers;
}

function scoreOffenseCandidate(input: {
  play: OffensivePlayDefinition;
  situation: GameSituationSnapshot;
  baseWeight: number;
  policyIds: string[];
  classification: SituationCallBias;
  profile: SelectionStrategyProfile;
  personnelFit?: PersonnelFitSnapshot;
  usageMemory?: SelectionUsageMemory;
  defensiveExpectation: DefensiveFamilyExpectation;
  coordinator: OffensiveCoordinatorTendencies;
  teamStrength?: CoordinatorTeamStrengthSnapshot;
  opponentWeakness?: CoordinatorOpponentWeaknessSnapshot;
  xFactorPlan: PreGameXFactorPlan;
  fatigueMultiplier: number;
  candidateCount: number;
}): WeightedCandidate<OffensivePlayDefinition> {
  const modifiers: SelectionModifier[] = [];
  const philosophyDelta = offenseSchemeBias(input.profile.schemeCode, input.play.family);

  modifiers.push(
    createModifier(
      "TEAM_PHILOSOPHY",
      `Scheme bias from ${input.profile.schemeCode ?? "default"} philosophy.`,
      philosophyDelta,
    ),
  );
  modifiers.push(
    createModifier(
      "EV",
      "Expected-value blend from yards, efficiency and red-zone value.",
      offenseExpectedValue(input.play) * input.profile.evWeight,
    ),
  );
  modifiers.push(
    createModifier(
      "FLOOR",
      "Floor blend from efficiency, pressure avoidance and turnover control.",
      offenseFloorValue(input.play) * input.profile.floorWeight,
    ),
  );
  modifiers.push(
    createModifier(
      "RISK",
      "Risk/reward blend from explosiveness, turnover and pressure profile.",
      offenseRiskValue(input.play) * input.profile.riskWeight,
    ),
  );
  modifiers.push(
    ...applySituationModifiersForOffense({
      play: input.play,
      situation: input.situation,
      classification: input.classification,
      profile: input.profile,
      defensiveExpectation: input.defensiveExpectation,
    }),
  );
  modifiers.push(
    ...applyClockAndTerritoryModifiers({
      play: input.play,
      classification: input.classification,
      profile: input.profile,
    }),
  );
  modifiers.push(
    ...applyPersonnelFit({
      play: input.play,
      personnelFit: input.personnelFit,
      profile: input.profile,
    }),
  );
  modifiers.push(
    ...applyOffenseXFactorModifiers({
      play: input.play,
      plan: input.xFactorPlan,
      classification: input.classification,
    }),
  );
  modifiers.push(
    ...applyOffensiveCoordinatorModifiers({
      play: input.play,
      classification: input.classification,
      profile: input.profile,
      coordinator: input.coordinator,
      teamStrength: input.teamStrength,
      opponentWeakness: input.opponentWeakness,
      defensiveExpectation: input.defensiveExpectation,
      xFactorPlan: input.xFactorPlan,
    }),
  );
  modifiers.push(
    ...applyUsageMemory({
      play: input.play,
      usageMemory: input.usageMemory,
      profile: input.profile,
      candidateCount: input.candidateCount,
    }),
  );
  modifiers.push(
    ...applyFatigueModifier({
      play: input.play,
      fatigueMultiplier: input.fatigueMultiplier,
      profile: input.profile,
    }),
  );

  const score =
    Math.log(Math.max(input.baseWeight, 0.01)) +
    modifiers.reduce((sum, modifier) => sum + modifier.deltaWeight, 0);

  return {
    play: input.play,
    policyIds: input.policyIds,
    baseWeight: input.baseWeight,
    score,
    adjustedWeight: 0,
    selectionProbability: 0,
    modifiers,
  };
}

function scoreDefenseCandidate(input: {
  play: DefensivePlayDefinition;
  situation: GameSituationSnapshot;
  baseWeight: number;
  policyIds: string[];
  classification: SituationCallBias;
  profile: SelectionStrategyProfile;
  personnelFit?: PersonnelFitSnapshot;
  usageMemory?: SelectionUsageMemory;
  offensiveExpectation: OffensiveFamilyExpectation;
  coordinator: DefensiveCoordinatorTendencies;
  teamStrength?: CoordinatorTeamStrengthSnapshot;
  opponentWeakness?: CoordinatorOpponentWeaknessSnapshot;
  xFactorPlan: PreGameXFactorPlan;
  fatigueMultiplier: number;
  candidateCount: number;
}): WeightedCandidate<DefensivePlayDefinition> {
  const modifiers: SelectionModifier[] = [];
  const philosophyDelta = defenseSchemeBias(input.profile.schemeCode, input.play.family);

  modifiers.push(
    createModifier(
      "TEAM_PHILOSOPHY",
      `Scheme bias from ${input.profile.schemeCode ?? "default"} philosophy.`,
      philosophyDelta,
    ),
  );
  modifiers.push(
    createModifier(
      "EV",
      "Expected defensive value from yards, efficiency, red-zone and takeaway blend.",
      defenseExpectedValue(input.play) * input.profile.evWeight,
    ),
  );
  modifiers.push(
    createModifier(
      "FLOOR",
      "Defensive floor blend from explosives suppression and red-zone control.",
      defenseFloorValue(input.play) * input.profile.floorWeight,
    ),
  );
  modifiers.push(
    createModifier(
      "RISK",
      "Pressure-risk blend from sacks, takeaways and explosive exposure.",
      defenseRiskValue(input.play) * input.profile.riskWeight,
    ),
  );
  modifiers.push(
    ...applySituationModifiersForDefense({
      play: input.play,
      situation: input.situation,
      classification: input.classification,
      profile: input.profile,
      offensiveExpectation: input.offensiveExpectation,
    }),
  );
  modifiers.push(
    ...applyClockAndTerritoryModifiers({
      play: input.play,
      classification: input.classification,
      profile: input.profile,
    }),
  );
  modifiers.push(
    ...applyPersonnelFit({
      play: input.play,
      personnelFit: input.personnelFit,
      profile: input.profile,
    }),
  );
  modifiers.push(
    ...applyDefenseXFactorModifiers({
      play: input.play,
      plan: input.xFactorPlan,
      classification: input.classification,
    }),
  );
  modifiers.push(
    ...applyDefensiveCoordinatorModifiers({
      play: input.play,
      profile: input.profile,
      coordinator: input.coordinator,
      teamStrength: input.teamStrength,
      opponentWeakness: input.opponentWeakness,
      offensiveExpectation: input.offensiveExpectation,
      xFactorPlan: input.xFactorPlan,
    }),
  );
  modifiers.push(
    ...applyUsageMemory({
      play: input.play,
      usageMemory: input.usageMemory,
      profile: input.profile,
      candidateCount: input.candidateCount,
    }),
  );
  modifiers.push(
    ...applyFatigueModifier({
      play: input.play,
      fatigueMultiplier: input.fatigueMultiplier,
      profile: input.profile,
    }),
  );

  const score =
    Math.log(Math.max(input.baseWeight, 0.01)) +
    modifiers.reduce((sum, modifier) => sum + modifier.deltaWeight, 0);

  return {
    play: input.play,
    policyIds: input.policyIds,
    baseWeight: input.baseWeight,
    score,
    adjustedWeight: 0,
    selectionProbability: 0,
    modifiers,
  };
}

function finalizeWeightedCandidates<TPlay extends PlayCallDefinition>(
  candidates: WeightedCandidate<TPlay>[],
  temperature: number,
) {
  const adjusted = candidates.map((candidate) => ({
    ...candidate,
    adjustedWeight: Math.max(
      Math.exp(candidate.score / Math.max(temperature, 0.2)),
      0.0001,
    ),
  }));
  const totalWeight = adjusted.reduce((sum, candidate) => sum + candidate.adjustedWeight, 0);

  return adjusted
    .map((candidate) => ({
      ...candidate,
      selectionProbability: candidate.adjustedWeight / Math.max(totalWeight, 0.0001),
    }))
    .sort((left, right) => right.selectionProbability - left.selectionProbability);
}

function buildSideTrace<TPlay extends PlayCallDefinition>(input: {
  side: PlayCallSide;
  profile: SelectionStrategyProfile;
  classification: SituationCallBias;
  matchedPolicyIds: string[];
  contextPreSnapLegal: boolean;
  expectationSpace: FamilyExpectation[];
  rejectedCandidates: CandidateRejection[];
  evaluatedCandidates: WeightedCandidate<TPlay>[];
  selectedPlayId: string;
  randomRoll: number;
}): SideSelectionTrace<TPlay> {
  return {
    side: input.side,
    mode: input.profile.mode,
    classification: input.classification,
    matchedPolicyIds: input.matchedPolicyIds,
    contextPreSnapLegal: input.contextPreSnapLegal,
    expectationSpace: input.expectationSpace,
    rejectedCandidates: input.rejectedCandidates,
    evaluatedCandidates: input.evaluatedCandidates,
    selectedPlayId: input.selectedPlayId,
    temperature: input.profile.temperature,
    randomRoll: input.randomRoll,
  };
}

function legalFilter<TPlay extends PlayCallDefinition>(input: {
  candidates: TPlay[];
  situation: GameSituationSnapshot;
}) {
  const legalCandidates: TPlay[] = [];
  const rejectedCandidates: CandidateRejection[] = [];

  for (const play of input.candidates) {
    if (!play.supportedRulesets.includes(input.situation.ruleset)) {
      rejectedCandidates.push(
        makeRejection(play.id, "Ruleset mismatch", [
          `Play ${play.id} does not support ${input.situation.ruleset}.`,
        ]),
      );
      continue;
    }

    const legality = validatePreSnapStructure(
      buildPreSnapStructureForPlay(play, input.situation),
    );

    if (!legality.isLegal) {
      rejectedCandidates.push(
        makeRejection(
          play.id,
          "Pre-snap legality failed",
          legality.issues.map((issue) => issue.message),
        ),
      );
      continue;
    }

    legalCandidates.push(play);
  }

  return {
    legalCandidates,
    rejectedCandidates,
  };
}

export class DefaultPlaySelectionEngine implements PlaySelectionEngine {
  select(context: PlaySelectionContext): SelectedPlayCall {
    const random =
      context.random ??
      createSelectionRandom(
        context.selectionSeed ??
          `play-selection::${context.offensePlaybook.id}::${context.situation.possessionTeamId}::${context.situation.down}-${context.situation.yardsToGo}-${context.situation.ballOnYardLine}`,
      );
    const contextLegality = validatePlaySelectionPreSnap(context);
    const offenseProfile =
      context.offenseProfile ??
      createSelectionStrategyProfile({
        side: "OFFENSE",
        mode: "BALANCED",
      });
    const defenseProfile =
      context.defenseProfile ??
      createSelectionStrategyProfile({
        side: "DEFENSE",
        mode: "BALANCED",
      });
    const offenseXFactorPlan = normalizePreGameXFactorPlan(context.offenseXFactorPlan);
    const defenseXFactorPlan = normalizePreGameXFactorPlan(context.defenseXFactorPlan);
    const offenseCoordinator = normalizeOffensiveCoordinator(context.offenseCoordinator);
    const defenseCoordinator = normalizeDefensiveCoordinator(context.defenseCoordinator);
    const offenseClassification = classifySelectionSituation({
      side: "OFFENSE",
      situation: context.situation,
    });
    const defenseClassification = classifySelectionSituation({
      side: "DEFENSE",
      situation: context.situation,
    });
    const offensePolicies = resolvePlaybookPolicies("OFFENSE", context);
    const defensePolicies = resolvePlaybookPolicies("DEFENSE", context);
    const offensePool = buildBaseMenu({
      policies: offensePolicies,
      candidates: resolveCandidates("OFFENSE", context),
      situation: context.situation,
    });
    const defensePool = buildBaseMenu({
      policies: defensePolicies,
      candidates: resolveCandidates("DEFENSE", context),
      situation: context.situation,
    });
    const legalOffense = legalFilter({
      candidates: resolveCandidates("OFFENSE", context),
      situation: context.situation,
    });
    const legalDefense = legalFilter({
      candidates: resolveCandidates("DEFENSE", context),
      situation: context.situation,
    });

    if (legalOffense.legalCandidates.length === 0) {
      throw new Error("No legal offensive play candidates available for selection.");
    }

    if (legalDefense.legalCandidates.length === 0) {
      throw new Error("No legal defensive play candidates available for selection.");
    }

    const offenseExpectation = buildOffensiveExpectation(
      legalOffense.legalCandidates,
      offensePool.baseWeights,
      offenseClassification,
    );
    const defenseExpectation = buildDefensiveExpectation(
      legalDefense.legalCandidates,
      defensePool.baseWeights,
      defenseClassification,
    );
    const scoredOffense = finalizeWeightedCandidates(
      legalOffense.legalCandidates.map((play) =>
        scoreOffenseCandidate({
          play,
          situation: context.situation,
          baseWeight: offensePool.baseWeights.get(play.id) ?? 0.08,
          policyIds: [...(offensePool.policyIdsByPlayId.get(play.id) ?? new Set(["exploratory-menu"]))],
          classification: offenseClassification,
          profile: offenseProfile,
          personnelFit: context.offensePersonnelFit,
          usageMemory: context.offenseUsageMemory,
          defensiveExpectation: defenseExpectation,
          coordinator: offenseCoordinator,
          teamStrength: context.offenseTeamStrength,
          opponentWeakness: context.opponentWeaknessForOffense,
          xFactorPlan: offenseXFactorPlan,
          fatigueMultiplier: context.offenseFatigueMultiplier,
          candidateCount: legalOffense.legalCandidates.length,
        }),
      ),
      offenseProfile.temperature,
    );
    const scoredDefense = finalizeWeightedCandidates(
      legalDefense.legalCandidates.map((play) =>
        scoreDefenseCandidate({
          play,
          situation: context.situation,
          baseWeight: defensePool.baseWeights.get(play.id) ?? 0.08,
          policyIds: [...(defensePool.policyIdsByPlayId.get(play.id) ?? new Set(["exploratory-menu"]))],
          classification: defenseClassification,
          profile: defenseProfile,
          personnelFit: context.defensePersonnelFit,
          usageMemory: context.defenseUsageMemory,
          offensiveExpectation: offenseExpectation,
          coordinator: defenseCoordinator,
          teamStrength: context.defenseTeamStrength,
          opponentWeakness: context.opponentWeaknessForDefense,
          xFactorPlan: defenseXFactorPlan,
          fatigueMultiplier: context.defenseFatigueMultiplier,
          candidateCount: legalDefense.legalCandidates.length,
        }),
      ),
      defenseProfile.temperature,
    );
    const offenseSample = sampleCandidate(scoredOffense, random);
    const defenseSample = sampleCandidate(scoredDefense, random);
    const warnings = contextLegality.isLegal
      ? []
      : contextLegality.issues.map((issue) => issue.message);

    return {
      offense: offenseSample.candidate,
      defense: defenseSample.candidate,
      trace: {
        offense: buildSideTrace({
          side: "OFFENSE",
          profile: offenseProfile,
          classification: offenseClassification,
          matchedPolicyIds: offensePool.matchedPolicyIds,
          contextPreSnapLegal: contextLegality.isLegal,
          expectationSpace: buildExpectationSpace(
            new Map(
              Object.entries(offenseExpectation).map(([family, probability]) => [
                family as OffensivePlayFamily,
                probability ?? 0,
              ]),
            ),
          ),
          rejectedCandidates: legalOffense.rejectedCandidates,
          evaluatedCandidates: scoredOffense,
          selectedPlayId: offenseSample.candidate.play.id,
          randomRoll: offenseSample.roll,
        }),
        defense: buildSideTrace({
          side: "DEFENSE",
          profile: defenseProfile,
          classification: defenseClassification,
          matchedPolicyIds: defensePool.matchedPolicyIds,
          contextPreSnapLegal: contextLegality.isLegal,
          expectationSpace: buildExpectationSpace(
            new Map(
              Object.entries(defenseExpectation).map(([family, probability]) => [
                family as DefensivePlayFamily,
                probability ?? 0,
              ]),
            ),
          ),
          rejectedCandidates: legalDefense.rejectedCandidates,
          evaluatedCandidates: scoredDefense,
          selectedPlayId: defenseSample.candidate.play.id,
          randomRoll: defenseSample.roll,
        }),
        warnings,
      },
    };
  }
}

export const defaultPlaySelectionEngine = new DefaultPlaySelectionEngine();
