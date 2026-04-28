import type {
  PlayerAlignmentSnapshot,
  PreSnapStructureSnapshot,
  ReceiverEligibilityState,
} from "./pre-snap-structure";

export type LegalityIssueCode =
  | "OFFENSE_TOO_FEW_PLAYERS"
  | "OFFENSE_TOO_MANY_PLAYERS"
  | "DEFENSE_TOO_FEW_PLAYERS"
  | "DEFENSE_TOO_MANY_PLAYERS"
  | "OFFENSE_PERSONNEL_PACKAGE_MISMATCH"
  | "DEFENSE_PERSONNEL_PACKAGE_MISMATCH"
  | "OFFENSE_TOO_FEW_ON_LINE"
  | "OFFENSE_TOO_MANY_BACKFIELD"
  | "TOO_FEW_ELIGIBLE_RECEIVERS"
  | "LINE_END_INELIGIBLE"
  | "INTERIOR_PLAYER_ELIGIBLE"
  | "TOO_MANY_PLAYERS_IN_MOTION"
  | "MOTION_PLAYER_ON_LINE"
  | "ILLEGAL_MOTION_DIRECTION"
  | "MOTION_NOT_FROM_SET_POSITION"
  | "SHIFT_NOT_SET"
  | "INELIGIBLE_PLAYER_DOWNFIELD"
  | "RULESET_UNSUPPORTED";

export type LegalityFallbackAction =
  | "REMOVE_EXTRA_PLAYER"
  | "ADD_MISSING_PLAYER"
  | "MOVE_PLAYER_TO_LINE"
  | "MOVE_PLAYER_OFF_LINE"
  | "MAKE_LINE_END_ELIGIBLE"
  | "KEEP_INTERIOR_INELIGIBLE"
  | "REDUCE_PLAYERS_IN_MOTION"
  | "MOVE_MOTION_OFF_LINE"
  | "STOP_FORWARD_MOTION"
  | "RESET_BEFORE_MOTION"
  | "WAIT_FOR_SET"
  | "KEEP_INELIGIBLE_BEHIND_LIMIT";

export type LegalityRecommendation = {
  action: LegalityFallbackAction;
  description: string;
};

export type LegalityIssue = {
  code: LegalityIssueCode;
  side: "OFFENSE" | "DEFENSE" | "BOTH";
  message: string;
  playerIds: string[];
  recommendation?: LegalityRecommendation;
};

export type NormalizedPlayerAlignmentSnapshot = PlayerAlignmentSnapshot & {
  lineOrder: number | null;
  linePositionRole: "LEFT_END" | "RIGHT_END" | "INTERIOR" | "BACKFIELD";
  resolvedReceiverState: ReceiverEligibilityState;
};

export type NormalizedPreSnapStructureSnapshot = Omit<
  PreSnapStructureSnapshot,
  "offensePlayers"
> & {
  offensePlayers: NormalizedPlayerAlignmentSnapshot[];
};

export type LegalityResult = {
  isLegal: boolean;
  issues: LegalityIssue[];
  normalizedSnapshot: NormalizedPreSnapStructureSnapshot;
};

export interface PreSnapLegalityEngine {
  validate(snapshot: PreSnapStructureSnapshot): LegalityResult;
}

export type IneligibleDownfieldObservation = {
  playerId: string;
  yardsBeyondLineOfScrimmage: number;
};

export type IneligibleDownfieldRequest = {
  normalizedSnapshot: NormalizedPreSnapStructureSnapshot;
  isForwardPassThrown: boolean;
  passCrossedLineOfScrimmage: boolean;
  observations: IneligibleDownfieldObservation[];
};

export type IneligibleDownfieldResult = {
  isLegal: boolean;
  maxAllowedYards: number;
  issues: LegalityIssue[];
};
