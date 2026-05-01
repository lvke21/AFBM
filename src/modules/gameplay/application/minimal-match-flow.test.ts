import { describe, expect, it } from "vitest";

import { createInitialMatchFlowState, startMatch } from "./minimal-match-flow";

describe("minimal match flow", () => {
  const teamA = {
    id: "flow-team-a",
    name: "Flow Team A",
    rating: 78,
  };
  const teamB = {
    id: "flow-team-b",
    name: "Flow Team B",
    rating: 71,
  };

  it("starts with an empty idle state", () => {
    expect(createInitialMatchFlowState()).toEqual({
      result: null,
      status: "idle",
      teamA: null,
      teamB: null,
    });
  });

  it("starts a match, passes teams into the simulation and stores the result in state", () => {
    const { result, state } = startMatch({
      seed: "flow-start",
      teamA,
      teamB,
    });

    expect(result.scoreA).toEqual(expect.any(Number));
    expect(result.scoreB).toEqual(expect.any(Number));
    expect(result.winner).toBe(result.scoreA > result.scoreB ? "A" : "B");
    expect(state).toEqual({
      result,
      status: "completed",
      teamA,
      teamB,
    });
  });

  it("returns a deterministic result when started with the same seed", () => {
    const first = startMatch({
      seed: "flow-repeatable",
      teamA,
      teamB,
    });
    const second = startMatch({
      seed: "flow-repeatable",
      teamA,
      teamB,
    });

    expect(second).toEqual(first);
  });

  it("can be started repeatedly without crashing or losing the latest result", () => {
    const runs = Array.from({ length: 25 }, (_, index) =>
      startMatch({
        seed: `flow-repeat-${index}`,
        teamA,
        teamB,
      }),
    );
    const latest = runs.at(-1);

    expect(latest).toBeDefined();
    expect(latest?.state.status).toBe("completed");
    expect(latest?.state.result).toEqual(latest?.result);
    for (const run of runs) {
      expect(run.state.result).toEqual(run.result);
      expect(run.result.scoreA).not.toBe(run.result.scoreB);
      expect(run.result.winner).toBe(run.result.scoreA > run.result.scoreB ? "A" : "B");
    }
  });
});
