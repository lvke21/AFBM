import type { GameSituationSnapshot } from "./game-situation";
import type { PreSnapStructureSnapshot } from "./pre-snap-structure";
import type {
  DefensivePlayFamily,
  DefensivePlayDefinition,
  OffensivePlayFamily,
  OffensivePlayDefinition,
  PlayCallDefinition,
  PlayCallFamily,
  PlayCallSide,
} from "./play-library";
import type { Playbook } from "./playbook";
import type { PreGameXFactorPlan } from "./pre-game-x-factor";

export type SelectionModifierSource =
  | "LEGALITY"
  | "PLAYBOOK"
  | "TEAM_PHILOSOPHY"
  | "SITUATION"
  | "EV"
  | "FLOOR"
  | "RISK"
  | "PERSONNEL"
  | "DEFENSIVE_CONTEXT"
  | "FOUR_DOWN"
  | "CLOCK"
  | "FATIGUE"
  | "X_FACTOR"
  | "COORDINATOR"
  | "GAMEPLAN"
  | "SELF_SCOUT"
  | "RANDOMNESS";

export type SelectionModifier = {
  source: SelectionModifierSource;
  reason: string;
  deltaWeight: number;
};

export type WeightedCandidate<TPlay extends PlayCallDefinition> = {
  play: TPlay;
  policyIds: string[];
  baseWeight: number;
  score: number;
  adjustedWeight: number;
  selectionProbability: number;
  modifiers: SelectionModifier[];
};

export type SelectionMode = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

export type PersonnelFitSnapshot = {
  byPersonnelPackageId?: Record<string, number>;
  byPlayId?: Record<string, number>;
  byFamily?: Partial<Record<PlayCallFamily, number>>;
};

export type SelectionUsageMemory = {
  totalCalls: number;
  playCallCounts: Record<string, number>;
  familyCallCounts: Partial<Record<PlayCallFamily, number>>;
  variantGroupCallCounts?: Record<string, number>;
  recentPlayIds: string[];
  recentVariantGroups?: string[];
  recentFamilyCalls: PlayCallFamily[];
};

export type SelectionStrategyProfile = {
  id: string;
  side: PlayCallSide;
  mode: SelectionMode;
  schemeCode: string | null;
  evWeight: number;
  floorWeight: number;
  riskWeight: number;
  surpriseWeight: number;
  selfScoutWeight: number;
  personnelFitWeight: number;
  opponentContextWeight: number;
  clockWeight: number;
  fourDownWeight: number;
  fatigueWeight: number;
  temperature: number;
};

export type OffensiveCoordinatorTargetPreference =
  | "BALANCED"
  | "FEATURE_WR"
  | "FEATURE_TE"
  | "FEATURE_RB";

export type CoordinatorCoveragePreference =
  | "BALANCED"
  | "MAN"
  | "ZONE"
  | "MATCH"
  | "PRESS";

export type OffensiveCoordinatorTendencies = {
  runPassLean: number;
  aggressiveness: number;
  tempo: number;
  targetPreference: OffensiveCoordinatorTargetPreference;
  screenQuickVsBlitz: number;
  deepShotFrequency: number;
};

export type DefensiveCoordinatorTendencies = {
  blitzFrequency: number;
  pressFrequency: number;
  aggressiveness: number;
  coveragePreference: CoordinatorCoveragePreference;
};

export type CoordinatorTeamStrengthSnapshot = {
  passOffense?: number;
  runOffense?: number;
  passProtection?: number;
  passRush?: number;
  coverage?: number;
  runDefense?: number;
};

export type CoordinatorOpponentWeaknessSnapshot = {
  passRush?: number;
  secondary?: number;
  runDefense?: number;
  offensiveLine?: number;
  passProtection?: number;
  quarterbackDecision?: number;
};

export type SituationCallBias = {
  side: PlayCallSide;
  scoreDifferential: number;
  urgency:
    | "NEUTRAL"
    | "CATCH_UP"
    | "PROTECT_LEAD"
    | "TWO_MINUTE"
    | "FOUR_MINUTE";
  downType: "EARLY" | "SETUP" | "MONEY" | "FOURTH";
  distanceBucket: GameSituationSnapshot["distanceBucket"];
  fieldZone: GameSituationSnapshot["fieldZone"];
  isRedZone: boolean;
  isGoalToGo: boolean;
  isBackedUp: boolean;
  isPassingDown: boolean;
  isShortYardage: boolean;
  isShotWindow: boolean;
  isFourDownTerritory: boolean;
  needsClockDrain: boolean;
  needsExplosiveAnswer: boolean;
  remainingTimeouts: number;
};

export type FamilyExpectation = {
  family: PlayCallFamily;
  probability: number;
};

export type CandidateRejection = {
  playId: string;
  reason: string;
  issues: string[];
};

export type SideSelectionTrace<TPlay extends PlayCallDefinition> = {
  side: PlayCallSide;
  mode: SelectionMode;
  classification: SituationCallBias;
  matchedPolicyIds: string[];
  contextPreSnapLegal: boolean;
  expectationSpace: FamilyExpectation[];
  rejectedCandidates: CandidateRejection[];
  evaluatedCandidates: WeightedCandidate<TPlay>[];
  selectedPlayId: string;
  temperature: number;
  randomRoll: number;
};

export type SelectionDecisionTrace = {
  offense: SideSelectionTrace<OffensivePlayDefinition>;
  defense: SideSelectionTrace<DefensivePlayDefinition>;
  warnings: string[];
};

export type PlaySelectionContext = {
  situation: GameSituationSnapshot;
  preSnapStructure: PreSnapStructureSnapshot;
  offensePlaybook: Playbook;
  defensePlaybook: Playbook;
  offenseCandidates: OffensivePlayDefinition[];
  defenseCandidates: DefensivePlayDefinition[];
  offenseFatigueMultiplier: number;
  defenseFatigueMultiplier: number;
  offenseProfile?: SelectionStrategyProfile;
  defenseProfile?: SelectionStrategyProfile;
  offenseCoordinator?: Partial<OffensiveCoordinatorTendencies>;
  defenseCoordinator?: Partial<DefensiveCoordinatorTendencies>;
  offenseTeamStrength?: CoordinatorTeamStrengthSnapshot;
  defenseTeamStrength?: CoordinatorTeamStrengthSnapshot;
  opponentWeaknessForOffense?: CoordinatorOpponentWeaknessSnapshot;
  opponentWeaknessForDefense?: CoordinatorOpponentWeaknessSnapshot;
  offensePersonnelFit?: PersonnelFitSnapshot;
  defensePersonnelFit?: PersonnelFitSnapshot;
  offenseUsageMemory?: SelectionUsageMemory;
  defenseUsageMemory?: SelectionUsageMemory;
  offenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  defenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  random?: () => number;
  selectionSeed?: string;
};

export type SelectedPlayCall = {
  offense: WeightedCandidate<OffensivePlayDefinition>;
  defense: WeightedCandidate<DefensivePlayDefinition>;
  trace: SelectionDecisionTrace;
};

export interface PlaySelectionEngine {
  select(context: PlaySelectionContext): SelectedPlayCall;
}

export type OffensiveFamilyExpectation = Partial<
  Record<OffensivePlayFamily, number>
>;

export type DefensiveFamilyExpectation = Partial<
  Record<DefensivePlayFamily, number>
>;
