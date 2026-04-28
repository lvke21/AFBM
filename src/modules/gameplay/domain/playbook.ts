import type { CompetitionRuleset } from "./competition-rules";
import type {
  ClockBucket,
  DistanceBucket,
  Down,
  FieldZone,
  ScoreBucket,
  TempoProfile,
} from "./game-situation";

export type PlaybookSide = "OFFENSE" | "DEFENSE";

export type PlaybookReferenceType = "PLAY" | "PLAY_FAMILY";

export type SituationFilter = {
  rulesets?: ReadonlyArray<CompetitionRuleset>;
  downs?: ReadonlyArray<Down>;
  distanceBuckets?: ReadonlyArray<DistanceBucket>;
  fieldZones?: ReadonlyArray<FieldZone>;
  clockBuckets?: ReadonlyArray<ClockBucket>;
  scoreBuckets?: ReadonlyArray<ScoreBucket>;
  tempoProfiles?: ReadonlyArray<TempoProfile>;
  personnelPackages?: ReadonlyArray<string>;
};

export type WeightedPlayReference = {
  referenceId: string;
  referenceType: PlaybookReferenceType;
  weight: number;
};

export type PlaybookPolicy = {
  id: string;
  side: PlaybookSide;
  label: string;
  situation: SituationFilter;
  candidates: WeightedPlayReference[];
  minimumCallRate?: number;
  maximumCallRate?: number;
};

export type Playbook = {
  id: string;
  teamId: string;
  ruleset: CompetitionRuleset;
  offensePolicies: PlaybookPolicy[];
  defensePolicies: PlaybookPolicy[];
};
