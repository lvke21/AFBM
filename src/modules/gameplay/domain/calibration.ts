import type { CompetitionRuleset } from "./competition-rules";

export type CalibrationMetricCode =
  | "POINTS_PER_GAME"
  | "POINTS_PER_DRIVE"
  | "YARDS_PER_PLAY"
  | "COMPLETION_RATE"
  | "RUN_RATE"
  | "SACK_RATE"
  | "INTERCEPTION_RATE"
  | "TURNOVER_RATE"
  | "EXPLOSIVE_RUN_RATE"
  | "EXPLOSIVE_PASS_RATE"
  | "RED_ZONE_TOUCHDOWN_RATE"
  | "EPA_PER_PLAY";

export type CalibrationExpectation = {
  metric: CalibrationMetricCode;
  lowerBound: number;
  upperBound: number;
  minimumSampleSize: number;
};

export type CalibrationObservation = {
  metric: CalibrationMetricCode;
  value: number;
  sampleSize: number;
};

export type CalibrationViolation = {
  metric: CalibrationMetricCode;
  observedValue: number;
  lowerBound: number;
  upperBound: number;
  sampleSize: number;
};

export type CalibrationReport = {
  ruleset: CompetitionRuleset;
  passed: boolean;
  violations: CalibrationViolation[];
};

export interface CalibrationSuite {
  evaluate(input: {
    ruleset: CompetitionRuleset;
    expectations: CalibrationExpectation[];
    observations: CalibrationObservation[];
  }): CalibrationReport;
}
