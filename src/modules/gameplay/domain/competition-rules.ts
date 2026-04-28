export type CompetitionRuleset = "NFL_PRO" | "COLLEGE";

export type HashMarkProfile = "NFL_HASH" | "COLLEGE_HASH";

export type OvertimeFormat = "NFL_REGULAR_SEASON" | "NFL_PLAYOFF" | "COLLEGE";

export type PreSnapRuleProfile = {
  offensePlayersOnField: number;
  defensePlayersOnField: number;
  minPlayersOnLine: number;
  maxBackfieldPlayers: number;
  minEligibleReceivers: number;
  requireEligibleEndsOnLine: boolean;
  requireIneligibleInteriorLinemen: boolean;
};

export type ClockRuleProfile = {
  stopClockOnFirstDown: boolean;
  stopClockAfterOutOfBounds: boolean;
  stopClockAfterIncompletePass: boolean;
  playClockSeconds: number;
};

export type ScoringRuleProfile = {
  touchdownPoints: number;
  extraPointPoints: number;
  twoPointConversionPoints: number;
  fieldGoalPoints: number;
  safetyPoints: number;
};

export type MotionRuleProfile = {
  maxPlayersInMotionAtSnap: number;
  allowPlayerInMotionOnLineAtSnap: boolean;
  allowMotionTowardLineAtSnap: boolean;
  requireMotionFromSetPosition: boolean;
};

export type ShiftRuleProfile = {
  minimumSetSecondsAfterShift: number;
  requireResetAfterShift: boolean;
  minimumPlayersForShiftRule: number;
};

export type DownfieldRuleProfile = {
  ineligiblePlayerLimitYards: number;
  enforceOnlyOnForwardPassBeyondLine: boolean;
};

export type CompetitionRuleProfile = {
  ruleset: CompetitionRuleset;
  hashMarks: HashMarkProfile;
  overtimeFormat: OvertimeFormat;
  preSnap: PreSnapRuleProfile;
  motion: MotionRuleProfile;
  shift: ShiftRuleProfile;
  downfield: DownfieldRuleProfile;
  clock: ClockRuleProfile;
  scoring: ScoringRuleProfile;
};

export const COMPETITION_RULE_PROFILES = {
  NFL_PRO: {
    ruleset: "NFL_PRO",
    hashMarks: "NFL_HASH",
    overtimeFormat: "NFL_REGULAR_SEASON",
    preSnap: {
      offensePlayersOnField: 11,
      defensePlayersOnField: 11,
      minPlayersOnLine: 7,
      maxBackfieldPlayers: 4,
      minEligibleReceivers: 5,
      requireEligibleEndsOnLine: true,
      requireIneligibleInteriorLinemen: true,
    },
    motion: {
      maxPlayersInMotionAtSnap: 1,
      allowPlayerInMotionOnLineAtSnap: false,
      allowMotionTowardLineAtSnap: false,
      requireMotionFromSetPosition: true,
    },
    shift: {
      minimumSetSecondsAfterShift: 1,
      requireResetAfterShift: true,
      minimumPlayersForShiftRule: 2,
    },
    downfield: {
      ineligiblePlayerLimitYards: 1,
      enforceOnlyOnForwardPassBeyondLine: true,
    },
    clock: {
      stopClockOnFirstDown: false,
      stopClockAfterOutOfBounds: true,
      stopClockAfterIncompletePass: true,
      playClockSeconds: 40,
    },
    scoring: {
      touchdownPoints: 6,
      extraPointPoints: 1,
      twoPointConversionPoints: 2,
      fieldGoalPoints: 3,
      safetyPoints: 2,
    },
  },
  COLLEGE: {
    ruleset: "COLLEGE",
    hashMarks: "COLLEGE_HASH",
    overtimeFormat: "COLLEGE",
    preSnap: {
      offensePlayersOnField: 11,
      defensePlayersOnField: 11,
      minPlayersOnLine: 7,
      maxBackfieldPlayers: 4,
      minEligibleReceivers: 5,
      requireEligibleEndsOnLine: true,
      requireIneligibleInteriorLinemen: true,
    },
    motion: {
      maxPlayersInMotionAtSnap: 1,
      allowPlayerInMotionOnLineAtSnap: false,
      allowMotionTowardLineAtSnap: false,
      requireMotionFromSetPosition: true,
    },
    shift: {
      minimumSetSecondsAfterShift: 1,
      requireResetAfterShift: true,
      minimumPlayersForShiftRule: 2,
    },
    downfield: {
      ineligiblePlayerLimitYards: 3,
      enforceOnlyOnForwardPassBeyondLine: true,
    },
    clock: {
      stopClockOnFirstDown: true,
      stopClockAfterOutOfBounds: true,
      stopClockAfterIncompletePass: true,
      playClockSeconds: 40,
    },
    scoring: {
      touchdownPoints: 6,
      extraPointPoints: 1,
      twoPointConversionPoints: 2,
      fieldGoalPoints: 3,
      safetyPoints: 2,
    },
  },
} satisfies Record<CompetitionRuleset, CompetitionRuleProfile>;

export function resolveCompetitionRuleProfile(
  ruleset: CompetitionRuleset,
): CompetitionRuleProfile {
  return COMPETITION_RULE_PROFILES[ruleset];
}
