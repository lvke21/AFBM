import type { CompetitionRuleset } from "./competition-rules";
import type { SituationFilter } from "./playbook";
import type {
  FormationSnapshot,
  PersonnelPackage,
  PlayerAlignmentSnapshot,
  ShiftSnapshot,
} from "./pre-snap-structure";

export type PlayCallSide = "OFFENSE" | "DEFENSE";

export type OffensivePlayFamily =
  | "ZONE_RUN"
  | "GAP_RUN"
  | "DESIGNED_QB_RUN"
  | "OPTION_RPO"
  | "QUICK_PASS"
  | "DROPBACK"
  | "PLAY_ACTION"
  | "MOVEMENT_PASS"
  | "SCREEN"
  | "EMPTY_TEMPO";

export type OffensivePlayFamilyBucket = "RUN" | "PASS" | "RPO";

export const OFFENSIVE_PLAY_FAMILIES = [
  "ZONE_RUN",
  "GAP_RUN",
  "DESIGNED_QB_RUN",
  "OPTION_RPO",
  "QUICK_PASS",
  "DROPBACK",
  "PLAY_ACTION",
  "MOVEMENT_PASS",
  "SCREEN",
  "EMPTY_TEMPO",
] as const satisfies ReadonlyArray<OffensivePlayFamily>;

export const OFFENSIVE_PLAY_FAMILY_GROUPS = {
  RUN: ["ZONE_RUN", "GAP_RUN", "DESIGNED_QB_RUN"],
  PASS: [
    "QUICK_PASS",
    "DROPBACK",
    "PLAY_ACTION",
    "MOVEMENT_PASS",
    "SCREEN",
    "EMPTY_TEMPO",
  ],
  RPO: ["OPTION_RPO"],
} as const satisfies Record<
  OffensivePlayFamilyBucket,
  ReadonlyArray<OffensivePlayFamily>
>;

export type DefensivePlayFamily =
  | "MATCH_COVERAGE"
  | "ZONE_COVERAGE"
  | "MAN_COVERAGE"
  | "ZERO_PRESSURE"
  | "FIRE_ZONE"
  | "SIMULATED_PRESSURE"
  | "DROP_EIGHT"
  | "RUN_BLITZ"
  | "BRACKET_SPECIALTY"
  | "THREE_HIGH_PACKAGE"
  | "RED_ZONE_PACKAGE";

export type DefensivePlayFamilyBucket =
  | "COVERAGE"
  | "PRESSURE"
  | "STRUCTURE";

export const DEFENSIVE_PLAY_FAMILIES = [
  "MATCH_COVERAGE",
  "ZONE_COVERAGE",
  "MAN_COVERAGE",
  "ZERO_PRESSURE",
  "FIRE_ZONE",
  "SIMULATED_PRESSURE",
  "DROP_EIGHT",
  "RUN_BLITZ",
  "BRACKET_SPECIALTY",
  "THREE_HIGH_PACKAGE",
  "RED_ZONE_PACKAGE",
] as const satisfies ReadonlyArray<DefensivePlayFamily>;

export const DEFENSIVE_PLAY_FAMILY_GROUPS = {
  COVERAGE: [
    "MATCH_COVERAGE",
    "ZONE_COVERAGE",
    "MAN_COVERAGE",
    "BRACKET_SPECIALTY",
  ],
  PRESSURE: [
    "ZERO_PRESSURE",
    "FIRE_ZONE",
    "SIMULATED_PRESSURE",
    "RUN_BLITZ",
  ],
  STRUCTURE: [
    "DROP_EIGHT",
    "THREE_HIGH_PACKAGE",
    "RED_ZONE_PACKAGE",
  ],
} as const satisfies Record<
  DefensivePlayFamilyBucket,
  ReadonlyArray<DefensivePlayFamily>
>;

export type PlayCallFamily = OffensivePlayFamily | DefensivePlayFamily;

export type PlaySituationTag =
  | "BASE"
  | "EARLY_DOWN"
  | "SHORT_YARDAGE"
  | "PASSING_DOWN"
  | "TWO_MINUTE"
  | "FOUR_MINUTE"
  | "RED_ZONE"
  | "GOAL_LINE"
  | "BACKED_UP"
  | "SHOT_PLAY"
  | "PRESSURE_ANSWER"
  | "PLAY_ACTION"
  | "SCREEN_GAME"
  | "RPO"
  | "MATCH"
  | "ZONE"
  | "MAN"
  | "PRESSURE"
  | "SIMULATED_PRESSURE"
  | "RUN_FIT";

export type CoverageShell = "ZERO" | "ONE_HIGH" | "TWO_HIGH" | "MIXED";

export type PressurePresentation =
  | "NONE"
  | "THREE_MAN"
  | "FOUR_MAN"
  | "FIVE_MAN"
  | "SIX_MAN"
  | "SIMULATED";

export type PlayVariantGroupId = string;
export type PlayPackageTag = string;
export type DefensiveConceptTag = string;

export type PlayTriggerType = "DEFAULT" | "CHECK" | "AUDIBLE";

export type PlayReadType =
  | "BOX_COUNT"
  | "CONFLICT_DEFENDER"
  | "APEX_DEFENDER"
  | "LEVERAGE"
  | "SPACE"
  | "PRESSURE_CUE"
  | "RUN_PASS_KEY"
  | "RED_ZONE_ALERT";

export type AssignmentType =
  | "RUN_TRACK"
  | "RUN_BLOCK"
  | "PASS_PROTECTION"
  | "ROUTE"
  | "SCREEN_RELEASE"
  | "MESH_POINT"
  | "COVERAGE"
  | "FIT"
  | "PRESSURE"
  | "CONTAIN"
  | "BRACKET"
  | "SPY";

export type FormationFamily = {
  id: string;
  side: PlayCallSide;
  label: string;
  personnelPackageId: string;
  supportedRulesets: ReadonlyArray<CompetitionRuleset>;
  tags: string[];
};

export type MotionFamily = {
  id: string;
  label: string;
  tags: string[];
};

export type ProtectionFamily = {
  id: string;
  label: string;
  tags: string[];
};

export type OffensiveConceptFamily = {
  id: string;
  family: OffensivePlayFamily;
  label: string;
  tags: string[];
};

export type FrontFamily = {
  id: string;
  label: string;
  tags: string[];
};

export type CoverageFamily = {
  id: string;
  label: string;
  shell: CoverageShell;
  tags: string[];
};

export type PressureFamily = {
  id: string;
  label: string;
  presentation: PressurePresentation;
  tags: string[];
};

export type PlayTrigger = {
  id: string;
  type: PlayTriggerType;
  label: string;
  description: string;
  priority: number;
  filter: SituationFilter;
};

export type PlayRead = {
  id: string;
  order: number;
  label: string;
  type: PlayReadType;
  actorRoleId: string;
  description: string;
};

export type PlayAssignment = {
  roleId: string;
  positionCodes: string[];
  assignmentType: AssignmentType;
  responsibility: string;
  landmark: string | null;
  readId: string | null;
};

export type ExpectedPlayMetrics = {
  efficiencyRate: number;
  explosiveRate: number;
  turnoverSwingRate: number;
  pressureRate: number;
  expectedYards: number;
  redZoneValue: number;
};

export type PlayCounterReference = {
  playId: string;
  reason: string;
};

export type PlayAudibleReference = {
  playId: string;
  triggerId: string | null;
  reason: string;
};

export type PlayLegalityTemplate = {
  formation: FormationSnapshot;
  offensePersonnel: PersonnelPackage;
  defensePersonnel: PersonnelPackage;
  offenseShift: ShiftSnapshot;
  offensePlayers: PlayerAlignmentSnapshot[];
  defensePlayers: PlayerAlignmentSnapshot[];
};

export type OffensivePlayStructure = {
  formationFamilyId: string;
  personnelPackageId: string;
  conceptFamilyId: string;
  motionFamilyIds: string[];
  protectionFamilyId: string | null;
};

export type DefensivePlayStructure = {
  formationFamilyId: string;
  personnelPackageId: string;
  frontFamilyId: string;
  coverageFamilyId: string;
  pressureFamilyId: string | null;
  coverageShell: CoverageShell;
  pressurePresentation: PressurePresentation;
  defensiveConceptTag?: DefensiveConceptTag | null;
};

export type BasePlayCallDefinition = {
  id: string;
  side: PlayCallSide;
  family: PlayCallFamily;
  label: string;
  variantGroupId?: PlayVariantGroupId | null;
  packageTags?: PlayPackageTag[];
  supportedRulesets: ReadonlyArray<CompetitionRuleset>;
  situationTags: PlaySituationTag[];
  triggers: PlayTrigger[];
  reads: PlayRead[];
  assignments: PlayAssignment[];
  expectedMetrics: ExpectedPlayMetrics;
  counters: PlayCounterReference[];
  audibles: PlayAudibleReference[];
  legalityTemplate: PlayLegalityTemplate;
};

export type OffensivePlayDefinition = BasePlayCallDefinition & {
  side: "OFFENSE";
  family: OffensivePlayFamily;
  structure: OffensivePlayStructure;
};

export type DefensivePlayDefinition = BasePlayCallDefinition & {
  side: "DEFENSE";
  family: DefensivePlayFamily;
  structure: DefensivePlayStructure;
};

export type PlayCallDefinition = OffensivePlayDefinition | DefensivePlayDefinition;

export type PlayLibraryCatalog = {
  version: 1;
  personnelPackages: PersonnelPackage[];
  offenseFormationFamilies: FormationFamily[];
  defenseFormationFamilies: FormationFamily[];
  motionFamilies: MotionFamily[];
  protectionFamilies: ProtectionFamily[];
  offensiveConceptFamilies: OffensiveConceptFamily[];
  frontFamilies: FrontFamily[];
  coverageFamilies: CoverageFamily[];
  pressureFamilies: PressureFamily[];
  offensePlays: OffensivePlayDefinition[];
  defensePlays: DefensivePlayDefinition[];
};

export type PlayDefinitionValidationIssueCode =
  | "PLAY_NOT_OBJECT"
  | "MISSING_ID"
  | "MISSING_LABEL"
  | "INVALID_SIDE"
  | "INVALID_FAMILY"
  | "MISSING_SUPPORTED_RULESETS"
  | "MISSING_SITUATION_TAGS"
  | "MISSING_TRIGGERS"
  | "MISSING_READS"
  | "MISSING_ASSIGNMENTS"
  | "MISSING_COUNTERS"
  | "MISSING_AUDIBLES"
  | "MISSING_EXPECTED_METRICS"
  | "MISSING_LEGALITY_TEMPLATE"
  | "MISSING_STRUCTURE"
  | "INVALID_METRIC_RANGE"
  | "INVALID_REFERENCE"
  | "INVALID_REFERENCE_SIDE"
  | "INVALID_TRIGGER_REFERENCE"
  | "INVALID_READ_REFERENCE"
  | "FAMILY_STRUCTURE_MISMATCH"
  | "PRESSURE_SHELL_MISMATCH"
  | "SITUATION_TAG_MISMATCH"
  | "RULESET_MISMATCH"
  | "INVALID_OPTIONAL_METADATA"
  | "PRE_SNAP_ILLEGAL";

export type PlayDefinitionValidationIssue = {
  code: PlayDefinitionValidationIssueCode;
  playId: string | null;
  message: string;
};

export type PlayDefinitionValidationResult = {
  isValid: boolean;
  issues: PlayDefinitionValidationIssue[];
};

export type PlayValidationSummary = {
  playId: string | null;
  side: PlayCallSide | null;
  isValid: boolean;
  issues: PlayDefinitionValidationIssue[];
};

export type PlayLibraryValidationResult = {
  isValid: boolean;
  issues: PlayDefinitionValidationIssue[];
  playResults: PlayValidationSummary[];
};

export function isOffensivePlayFamily(
  family: PlayCallFamily,
): family is OffensivePlayFamily {
  return OFFENSIVE_PLAY_FAMILIES.includes(family as OffensivePlayFamily);
}

export function isDefensivePlayFamily(
  family: PlayCallFamily,
): family is DefensivePlayFamily {
  return DEFENSIVE_PLAY_FAMILIES.includes(family as DefensivePlayFamily);
}
