import type {
  CalibrationExpectation,
  CalibrationObservation,
  CalibrationReport,
  CalibrationSuite,
  CalibrationViolation,
} from "../domain/calibration";
import type { CompetitionRuleset } from "../domain/competition-rules";

function buildObservationMap(observations: CalibrationObservation[]) {
  return new Map(observations.map((observation) => [observation.metric, observation]));
}

export class DefaultCalibrationSuite implements CalibrationSuite {
  evaluate(input: {
    ruleset: CompetitionRuleset;
    expectations: CalibrationExpectation[];
    observations: CalibrationObservation[];
  }): CalibrationReport {
    const observationMap = buildObservationMap(input.observations);
    const violations: CalibrationViolation[] = [];

    for (const expectation of input.expectations) {
      const observation = observationMap.get(expectation.metric);

      if (!observation) {
        violations.push({
          metric: expectation.metric,
          observedValue: Number.NaN,
          lowerBound: expectation.lowerBound,
          upperBound: expectation.upperBound,
          sampleSize: 0,
        });
        continue;
      }

      if (observation.sampleSize < expectation.minimumSampleSize) {
        violations.push({
          metric: expectation.metric,
          observedValue: observation.value,
          lowerBound: expectation.lowerBound,
          upperBound: expectation.upperBound,
          sampleSize: observation.sampleSize,
        });
        continue;
      }

      if (
        observation.value < expectation.lowerBound ||
        observation.value > expectation.upperBound
      ) {
        violations.push({
          metric: expectation.metric,
          observedValue: observation.value,
          lowerBound: expectation.lowerBound,
          upperBound: expectation.upperBound,
          sampleSize: observation.sampleSize,
        });
      }
    }

    return {
      ruleset: input.ruleset,
      passed: violations.length === 0,
      violations,
    };
  }
}

export const defaultCalibrationSuite = new DefaultCalibrationSuite();
