import type { GameSituationSnapshot } from "../domain/game-situation";
import type {
  PlayValueAssessment,
  StateValueModel,
  StateValueSnapshot,
} from "../domain/simulation-metrics";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function logistic(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function downBonus(down: GameSituationSnapshot["down"]) {
  switch (down) {
    case 1:
      return 0.65;
    case 2:
      return 0.2;
    case 3:
      return -0.45;
    case 4:
    default:
      return -1.05;
  }
}

function fieldZoneBonus(fieldZone: GameSituationSnapshot["fieldZone"]) {
  switch (fieldZone) {
    case "BACKED_UP":
      return -0.5;
    case "PLUS_TERRITORY":
      return 0.45;
    case "HIGH_RED_ZONE":
      return 0.95;
    case "LOW_RED_ZONE":
      return 1.45;
    case "GOAL_TO_GO":
      return 2.1;
    case "MIDFIELD":
    case "OWN_TERRITORY":
    default:
      return 0;
  }
}

export class DefaultStateValueModel implements StateValueModel {
  evaluateState(situation: GameSituationSnapshot): StateValueSnapshot {
    const fieldPositionValue = (situation.ballOnYardLine - 50) * 0.062;
    const distancePenalty = situation.yardsToGo * 0.075;
    const expectedPoints = clamp(
      fieldPositionValue +
        downBonus(situation.down) -
        distancePenalty +
        fieldZoneBonus(situation.fieldZone),
      -2.5,
      7.2,
    );
    const scoreMargin = situation.offenseScore - situation.defenseScore;
    const timePressure = 1 + (1 - clamp(situation.secondsRemainingInGame / 3600, 0, 1));
    const winProbability = clamp(
      logistic(scoreMargin / 7.5 * timePressure + expectedPoints * 0.24),
      0.02,
      0.98,
    );

    return {
      expectedPoints,
      winProbability,
    };
  }

  assessTransition(input: {
    beforeSituation: GameSituationSnapshot;
    afterSituation: GameSituationSnapshot;
    beforeValue: StateValueSnapshot;
    afterValue: StateValueSnapshot;
    scoreDelta: number;
    turnover: boolean;
  }): PlayValueAssessment {
    const expectedPointsAdded =
      input.afterValue.expectedPoints -
      input.beforeValue.expectedPoints +
      input.scoreDelta;
    const winProbabilityAdded =
      input.afterValue.winProbability - input.beforeValue.winProbability;
    const turnoverSwing =
      input.turnover
        ? input.beforeValue.expectedPoints + Math.max(0, input.afterValue.expectedPoints)
        : 0;

    return {
      before: input.beforeValue,
      after: input.afterValue,
      expectedPointsAdded,
      winProbabilityAdded,
      turnoverSwing,
    };
  }
}

export const defaultStateValueModel = new DefaultStateValueModel();
