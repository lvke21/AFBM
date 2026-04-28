import type {
  CompetitionRuleset,
  HashMarkProfile,
} from "./competition-rules";

export type Down = 1 | 2 | 3 | 4;

export type DistanceBucket =
  | "INCHES"
  | "SHORT"
  | "MEDIUM"
  | "LONG"
  | "VERY_LONG";

export type FieldZone =
  | "BACKED_UP"
  | "OWN_TERRITORY"
  | "MIDFIELD"
  | "PLUS_TERRITORY"
  | "HIGH_RED_ZONE"
  | "LOW_RED_ZONE"
  | "GOAL_TO_GO";

export type ClockBucket =
  | "OPENING"
  | "EARLY"
  | "MIDDLE"
  | "LATE"
  | "TWO_MINUTE"
  | "ENDGAME";

export type ScoreBucket =
  | "LEADING_BIG"
  | "LEADING"
  | "TIED"
  | "TRAILING"
  | "TRAILING_BIG";

export type TempoProfile = "SLOW" | "NORMAL" | "HURRY_UP" | "TWO_MINUTE";

export type GameSituationSnapshot = {
  ruleset: CompetitionRuleset;
  hashMarkProfile: HashMarkProfile;
  quarter: 1 | 2 | 3 | 4 | 5;
  down: Down;
  yardsToGo: number;
  ballOnYardLine: number;
  distanceBucket: DistanceBucket;
  fieldZone: FieldZone;
  clockBucket: ClockBucket;
  scoreBucket: ScoreBucket;
  offenseScore: number;
  defenseScore: number;
  secondsRemainingInQuarter: number;
  secondsRemainingInGame: number;
  offenseTimeouts: number;
  defenseTimeouts: number;
  tempoProfile: TempoProfile;
  possessionTeamId: string;
  defenseTeamId: string;
};
