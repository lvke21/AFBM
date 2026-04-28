import type { GameSituationSnapshot } from "./game-situation";
import type { LegalityResult } from "./pre-snap-legality";
import type { PreSnapStructureSnapshot } from "./pre-snap-structure";
import type { SelectedPlayCall } from "./play-selection";
import type {
  PlayValueAssessment,
  StateValueModel,
} from "./simulation-metrics";
import type { PreGameXFactorPlan } from "./pre-game-x-factor";

export type ContestStage =
  | "PRE_SNAP"
  | "RUN_FIT"
  | "PASS_RUSH"
  | "SEPARATION"
  | "CATCH_POINT"
  | "TACKLE"
  | "BALL_SECURITY"
  | "PENALTY";

export type MatchupFeature = {
  stage: ContestStage;
  feature: string;
  offenseScore: number;
  defenseScore: number;
};

export type ResolutionPlayPath = "RUN" | "PASS";

export type PressureEventType =
  | "NONE"
  | "HURRY"
  | "HIT"
  | "SACK"
  | "THROWAWAY";

export type TurnoverType = "NONE" | "INTERCEPTION" | "FUMBLE";

export type QuarterbackMatchupProfile = {
  accuracyShort: number;
  accuracyIntermediate: number;
  accuracyDeep: number;
  decision: number;
  pocketPresence: number;
  mobility: number;
  armStrength: number;
};

export type ReceiverMatchupProfile = {
  routeQuality: number;
  separation: number;
  hands: number;
  ballSkills: number;
  yardsAfterCatch: number;
  release: number;
};

export type RunnerMatchupProfile = {
  vision: number;
  acceleration: number;
  balance: number;
  ballSecurity: number;
  power: number;
};

export type OffensiveLineMatchupProfile = {
  passProtection: number;
  runBlocking: number;
  comboBlocking: number;
  edgeControl: number;
  communication: number;
};

export type CoverageMatchupProfile = {
  manCoverage: number;
  zoneCoverage: number;
  leverage: number;
  ballHawk: number;
  tackling: number;
};

export type PassRushMatchupProfile = {
  pressure: number;
  edgeRush: number;
  interiorRush: number;
  contain: number;
  finishing: number;
};

export type FrontMatchupProfile = {
  boxControl: number;
  runFit: number;
  leverage: number;
  pursuit: number;
  tackling: number;
  hitPower: number;
};

export type ResolutionMatchupSnapshot = {
  offense: {
    quarterback: QuarterbackMatchupProfile;
    primaryTarget: ReceiverMatchupProfile;
    primaryRunner: RunnerMatchupProfile;
    offensiveLine: OffensiveLineMatchupProfile;
  };
  defense: {
    coverage: CoverageMatchupProfile;
    passRush: PassRushMatchupProfile;
    front: FrontMatchupProfile;
  };
  context: {
    boxDefenders: number;
    leverageAdvantage: number;
    coverageTightness: number;
  };
};

export type OutcomeFamily =
  | "RUN_STOP"
  | "RUN_SUCCESS"
  | "EXPLOSIVE_RUN"
  | "PASS_COMPLETE"
  | "EXPLOSIVE_PASS"
  | "INCOMPLETE_PASS"
  | "SACK"
  | "INTERCEPTION"
  | "FUMBLE"
  | "PENALTY";

export type OutcomeDistributionPoint = {
  family: OutcomeFamily;
  probability: number;
  meanYards: number;
  successProbability: number;
  pressureProbability: number;
  completionProbability: number | null;
  turnoverProbability: number;
  explosiveProbability: number;
};

export type OutcomeFactor = {
  label: string;
  value: number;
};

export type PlayResolutionTrace = {
  path: ResolutionPlayPath;
  notes: string[];
  factors: OutcomeFactor[];
  pressureProbability: number;
  sackProbability: number;
  completionProbability: number | null;
  interceptionProbability: number;
  stuffedProbability: number | null;
  explosiveProbability: number;
  fumbleProbability: number;
  expectedYards: number;
};

export type PlayResolutionRequest = {
  situation: GameSituationSnapshot;
  preSnapStructure: PreSnapStructureSnapshot;
  selectedPlayCall: SelectedPlayCall;
  legality: LegalityResult;
  matchupFeatures: MatchupFeature[];
  matchup: ResolutionMatchupSnapshot;
  stateValueModel?: StateValueModel;
  offenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  defenseXFactorPlan?: Partial<PreGameXFactorPlan>;
  random?: () => number;
  resolutionSeed?: string;
};

export type ResolvedPlayEvent = {
  path: ResolutionPlayPath;
  family: OutcomeFamily;
  yards: number;
  success: boolean;
  explosive: boolean;
  turnoverType: TurnoverType;
  pressureEvent: PressureEventType;
  completion: boolean | null;
  throwaway: boolean;
  airYards: number | null;
  yardsAfterCatch: number | null;
  firstDown: boolean;
  touchdown: boolean;
  turnover: boolean;
  scoreDelta: number;
  clockRunoffSeconds: number;
  penaltyCode: string | null;
  value: PlayValueAssessment | null;
  trace: PlayResolutionTrace;
  summaryTokenIds: string[];
};

export interface OutcomeResolutionEngine {
  resolve(request: PlayResolutionRequest): ResolvedPlayEvent;
  buildDistribution(
    request: PlayResolutionRequest,
  ): OutcomeDistributionPoint[];
}
