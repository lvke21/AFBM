import { describe, expect, it } from "vitest";

import {
  completeSimulationOrchestratorStep,
  createSimulationOrchestratorSnapshot,
  failSimulationOrchestratorStep,
  setSimulationOrchestratorMatchIds,
  skipSimulationOrchestratorStep,
  startSimulationOrchestratorStep,
} from "./simulation-orchestrator";

describe("simulation orchestrator", () => {
  it("creates a deterministic season-week job with ordered pipeline steps", () => {
    const snapshot = createSimulationOrchestratorSnapshot({
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 3,
      matchIds: ["match-1", "match-2"],
    });

    expect(snapshot).toMatchObject({
      jobId: "save-1:season-1:week-3",
      status: "PENDING",
      matchIds: ["match-1", "match-2"],
    });
    expect(snapshot.steps.map((step) => step.id)).toEqual([
      "lock",
      "simulate",
      "persist-game-output",
      "persist-stats",
      "generate-readmodels",
      "unlock",
    ]);
    expect(snapshot.steps.every((step) => step.status === "PENDING")).toBe(true);
  });

  it("records repeatable per-match progress without changing the job identity", () => {
    const startedAt = new Date("2026-04-26T10:00:00.000Z");
    const completedAt = new Date("2026-04-26T10:00:01.000Z");
    const snapshot = createSimulationOrchestratorSnapshot({
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 1,
    });

    const updated = completeSimulationOrchestratorStep(
      startSimulationOrchestratorStep(
        setSimulationOrchestratorMatchIds(snapshot, ["match-1"]),
        "simulate",
        startedAt,
      ),
      "simulate",
      completedAt,
    );

    expect(updated.jobId).toBe(snapshot.jobId);
    expect(updated.matchIds).toEqual(["match-1"]);
    expect(updated.steps.find((step) => step.id === "simulate")).toMatchObject({
      status: "COMPLETED",
      startedAt,
      completedAt,
    });
  });

  it("treats completed or skipped steps as terminal and keeps failures structured", () => {
    const snapshot = createSimulationOrchestratorSnapshot({
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 1,
    });
    const completed = snapshot.steps.reduce(
      (current, step) =>
        step.id === "generate-readmodels"
          ? skipSimulationOrchestratorStep(current, step.id, "Query-derived readmodels")
          : completeSimulationOrchestratorStep(current, step.id),
      snapshot,
    );

    expect(completed.status).toBe("COMPLETED");

    const failed = failSimulationOrchestratorStep(
      completed,
      "persist-stats",
      new Error("stats write failed"),
    );

    expect(failed.status).toBe("FAILED");
    expect(failed.error).toEqual({
      name: "Error",
      message: "stats write failed",
    });
    expect(failed.steps.find((step) => step.id === "persist-stats")).toMatchObject({
      status: "FAILED",
      error: {
        name: "Error",
        message: "stats write failed",
      },
    });
  });
});
