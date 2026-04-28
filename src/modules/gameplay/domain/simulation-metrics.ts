import type { GameSituationSnapshot } from "./game-situation";

export type StateValueSnapshot = {
  expectedPoints: number;
  winProbability: number;
};

export type PlayValueAssessment = {
  before: StateValueSnapshot;
  after: StateValueSnapshot;
  expectedPointsAdded: number;
  winProbabilityAdded: number;
  turnoverSwing: number;
};

export interface StateValueModel {
  evaluateState(situation: GameSituationSnapshot): StateValueSnapshot;
  assessTransition(input: {
    beforeSituation: GameSituationSnapshot;
    afterSituation: GameSituationSnapshot;
    beforeValue: StateValueSnapshot;
    afterValue: StateValueSnapshot;
    scoreDelta: number;
    turnover: boolean;
  }): PlayValueAssessment;
}
