export type SimulationOrchestratorStepId =
  | "lock"
  | "simulate"
  | "persist-game-output"
  | "persist-stats"
  | "generate-readmodels"
  | "unlock";

export type SimulationOrchestratorStepStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "SKIPPED"
  | "FAILED";

export type SimulationJobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

type SimulationOrchestratorStepDefinition = {
  id: SimulationOrchestratorStepId;
  label: string;
};

export type SimulationOrchestratorError = {
  name?: string;
  message: string;
};

export type SimulationOrchestratorStep = SimulationOrchestratorStepDefinition & {
  status: SimulationOrchestratorStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  skippedReason?: string;
  error?: SimulationOrchestratorError;
};

export type SimulationOrchestratorSnapshot = {
  jobId: string;
  status: SimulationJobStatus;
  saveGameId: string;
  seasonId: string;
  week: number;
  matchIds: string[];
  steps: SimulationOrchestratorStep[];
  error?: SimulationOrchestratorError;
};

export const SIMULATION_ORCHESTRATOR_STEPS: readonly SimulationOrchestratorStepDefinition[] = [
  {
    id: "lock",
    label: "Lock scheduled week matches",
  },
  {
    id: "simulate",
    label: "Simulate deterministic match outputs",
  },
  {
    id: "persist-game-output",
    label: "Persist game output per match",
  },
  {
    id: "persist-stats",
    label: "Persist stats aggregates per match",
  },
  {
    id: "generate-readmodels",
    label: "Generate report readmodels",
  },
  {
    id: "unlock",
    label: "Release simulation lock",
  },
] as const;

export function createSimulationOrchestratorSnapshot(input: {
  saveGameId: string;
  seasonId: string;
  week: number;
  matchIds?: string[];
}): SimulationOrchestratorSnapshot {
  return {
    jobId: createSimulationJobId(input.saveGameId, input.seasonId, input.week),
    status: "PENDING",
    saveGameId: input.saveGameId,
    seasonId: input.seasonId,
    week: input.week,
    matchIds: input.matchIds ?? [],
    steps: SIMULATION_ORCHESTRATOR_STEPS.map((step) => ({
      ...step,
      status: "PENDING",
    })),
  };
}

export function setSimulationOrchestratorMatchIds(
  snapshot: SimulationOrchestratorSnapshot,
  matchIds: string[],
): SimulationOrchestratorSnapshot {
  return {
    ...snapshot,
    matchIds,
  };
}

export function startSimulationOrchestratorStep(
  snapshot: SimulationOrchestratorSnapshot,
  stepId: SimulationOrchestratorStepId,
  now = new Date(),
): SimulationOrchestratorSnapshot {
  return updateSimulationStep(snapshot, stepId, {
    status: "RUNNING",
    startedAt: now,
    completedAt: undefined,
    skippedReason: undefined,
    error: undefined,
  });
}

export function completeSimulationOrchestratorStep(
  snapshot: SimulationOrchestratorSnapshot,
  stepId: SimulationOrchestratorStepId,
  now = new Date(),
): SimulationOrchestratorSnapshot {
  return updateSimulationStep(snapshot, stepId, {
    status: "COMPLETED",
    completedAt: now,
    skippedReason: undefined,
    error: undefined,
  });
}

export function skipSimulationOrchestratorStep(
  snapshot: SimulationOrchestratorSnapshot,
  stepId: SimulationOrchestratorStepId,
  skippedReason: string,
  now = new Date(),
): SimulationOrchestratorSnapshot {
  return updateSimulationStep(snapshot, stepId, {
    status: "SKIPPED",
    completedAt: now,
    skippedReason,
    error: undefined,
  });
}

export function failSimulationOrchestratorStep(
  snapshot: SimulationOrchestratorSnapshot,
  stepId: SimulationOrchestratorStepId,
  error: unknown,
  now = new Date(),
): SimulationOrchestratorSnapshot {
  const normalizedError = normalizeSimulationError(error);

  return updateSimulationStep(
    {
      ...snapshot,
      status: "FAILED",
      error: normalizedError,
    },
    stepId,
    {
      status: "FAILED",
      completedAt: now,
      error: normalizedError,
    },
  );
}

function createSimulationJobId(saveGameId: string, seasonId: string, week: number) {
  return `${saveGameId}:${seasonId}:week-${week}`;
}

function updateSimulationStep(
  snapshot: SimulationOrchestratorSnapshot,
  stepId: SimulationOrchestratorStepId,
  update: Partial<SimulationOrchestratorStep>,
): SimulationOrchestratorSnapshot {
  const steps = snapshot.steps.map((step) =>
    step.id === stepId
      ? {
          ...step,
          ...update,
        }
      : step,
  );

  return {
    ...snapshot,
    steps,
    status: deriveSimulationJobStatus(steps),
  };
}

function deriveSimulationJobStatus(steps: SimulationOrchestratorStep[]): SimulationJobStatus {
  if (steps.some((step) => step.status === "FAILED")) {
    return "FAILED";
  }

  if (steps.some((step) => step.status === "RUNNING")) {
    return "RUNNING";
  }

  if (steps.every((step) => step.status === "COMPLETED" || step.status === "SKIPPED")) {
    return "COMPLETED";
  }

  return "PENDING";
}

function normalizeSimulationError(error: unknown): SimulationOrchestratorError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}
