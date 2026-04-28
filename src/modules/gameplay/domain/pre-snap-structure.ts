import type { CompetitionRuleset } from "./competition-rules";
import type { GameSituationSnapshot } from "./game-situation";

export type PersonnelSide = "OFFENSE" | "DEFENSE";

export type PersonnelEntry = {
  positionCode: string;
  quantity: number;
};

export type PersonnelPackage = {
  id: string;
  side: PersonnelSide;
  label: string;
  entries: PersonnelEntry[];
  totalPlayers: number;
};

export type FormationStrength = "LEFT" | "RIGHT" | "BALANCED";

export type FormationSpacing = "TIGHT" | "NORMAL" | "WIDE";

export type FormationSnapshot = {
  id: string;
  familyId: string;
  side: PersonnelSide;
  label: string;
  strength: FormationStrength;
  spacing: FormationSpacing;
  tags: string[];
};

export type AlignmentSide = "LEFT" | "MIDDLE" | "RIGHT";

export type FieldAlignment = "WIDE" | "SLOT" | "CORE" | "BACKFIELD";

export type SnapPlayerRole =
  | "LINE_END"
  | "INTERIOR_LINE"
  | "BACKFIELD_QB"
  | "BACKFIELD_SKILL"
  | "MOTION_PLAYER"
  | "DEFENSIVE_FRONT"
  | "DEFENSIVE_BOX"
  | "DEFENSIVE_SECONDARY";

export type ReceiverDeclaration = "AUTO" | "ELIGIBLE" | "INELIGIBLE";

export type ReceiverEligibilityState = "ELIGIBLE" | "INELIGIBLE";

export type MotionType = "NONE" | "SHORT" | "JET" | "ORBIT" | "RETURN";

export type MotionDirection = "STATIONARY" | "PARALLEL" | "TOWARD_LINE" | "AWAY_FROM_LINE";

export type MotionSnapshot = {
  type: MotionType;
  isInMotionAtSnap: boolean;
  directionAtSnap: MotionDirection;
  startedFromSetPosition: boolean;
};

export type ShiftSnapshot = {
  playersShifted: string[];
  allPlayersSetForSeconds: number;
  wasResetAfterShift: boolean;
};

export type PlayerAlignmentSnapshot = {
  playerId: string;
  teamId: string;
  positionCode: string;
  lineOfScrimmageSide: AlignmentSide;
  fieldAlignment: FieldAlignment;
  alignmentIndex: number;
  onLineOfScrimmage: boolean;
  inBackfield: boolean;
  snapRole: SnapPlayerRole;
  receiverDeclaration: ReceiverDeclaration;
  motion: MotionSnapshot;
};

export type PreSnapStructureSnapshot = {
  ruleset: CompetitionRuleset;
  situation: GameSituationSnapshot;
  offensePersonnel: PersonnelPackage;
  defensePersonnel: PersonnelPackage;
  formation: FormationSnapshot;
  offenseShift: ShiftSnapshot;
  offensePlayers: PlayerAlignmentSnapshot[];
  defensePlayers: PlayerAlignmentSnapshot[];
};
