import {
  simulateMatch,
  type MinimalMatchSimulationOptions,
  type MinimalMatchSimulationResult,
  type MinimalMatchTeam,
} from "./minimal-match-simulation";

export type MinimalMatchFlowStatus = "idle" | "completed";

export type MinimalMatchFlowState = {
  result: MinimalMatchSimulationResult | null;
  status: MinimalMatchFlowStatus;
  teamA: MinimalMatchTeam | null;
  teamB: MinimalMatchTeam | null;
};

export type StartMatchInput = MinimalMatchSimulationOptions & {
  teamA: MinimalMatchTeam;
  teamB: MinimalMatchTeam;
};

export function createInitialMatchFlowState(): MinimalMatchFlowState {
  return {
    result: null,
    status: "idle",
    teamA: null,
    teamB: null,
  };
}

export function startMatch(input: StartMatchInput): {
  result: MinimalMatchSimulationResult;
  state: MinimalMatchFlowState;
} {
  const result = simulateMatch(input.teamA, input.teamB, {
    rng: input.rng,
    seed: input.seed,
  });

  return {
    result,
    state: {
      result,
      status: "completed",
      teamA: input.teamA,
      teamB: input.teamB,
    },
  };
}
