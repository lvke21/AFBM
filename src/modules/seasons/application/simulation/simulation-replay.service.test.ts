import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/random/seeded-rng";

import { generateMatchStats } from "./match-engine";
import { createProductionMatchContext } from "./production-qa-suite";
import {
  createSimulationReplayCapture,
  replaySimulationCapture,
} from "./simulation-replay.service";

describe("simulation replay service", () => {
  it("stores seed, serialized input and result fingerprint for replay", () => {
    const context = createProductionMatchContext(0, {
      matchId: "replay-capture-game-1",
      seed: "replay-capture-seed-1",
    });
    const result = generateMatchStats(context, createRng(context.simulationSeed));
    const capture = createSimulationReplayCapture(context, result);

    expect(capture.version).toBe(1);
    expect(capture.seed).toBe("replay-capture-seed-1");
    expect(capture.input.matchId).toBe("replay-capture-game-1");
    expect(capture.input.simulationSeed).toBe(capture.seed);
    expect(capture.input.scheduledAt).toEqual(expect.any(String));
    expect(capture.resultFingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(capture.resultSummary.homeScore).toBe(result.homeScore);
    expect(capture.resultSummary.awayScore).toBe(result.awayScore);
    expect(capture.stepReplay).toHaveLength(result.drives.length);
  });

  it("replays a captured simulation with identical results", () => {
    const context = createProductionMatchContext(1, {
      matchId: "replay-match-game-1",
      seed: "replay-match-seed-1",
    });
    const capture = createSimulationReplayCapture(context);
    const replay = replaySimulationCapture(capture);

    expect(replay.matches).toBe(true);
    expect(replay.actualFingerprint).toBe(capture.resultFingerprint);
    expect(replay.expectedFingerprint).toBe(capture.resultFingerprint);
    expect(replay.actualSummary).toEqual(capture.resultSummary);
    expect(replay.stepReplay).toEqual(capture.stepReplay);
  });

  it("replays after a JSON storage roundtrip", () => {
    const context = createProductionMatchContext(1, {
      matchId: "replay-json-game-1",
      seed: "replay-json-seed-1",
    });
    const capture = createSimulationReplayCapture(context);
    const restoredCapture = JSON.parse(JSON.stringify(capture)) as typeof capture;
    const replay = replaySimulationCapture(restoredCapture);

    expect(restoredCapture).toEqual(capture);
    expect(replay.matches).toBe(true);
    expect(replay.stepReplay).toEqual(capture.stepReplay);
  });

  it("surfaces changed expected fingerprints as replay mismatches", () => {
    const context = createProductionMatchContext(2, {
      matchId: "replay-mismatch-game-1",
      seed: "replay-mismatch-seed-1",
    });
    const capture = createSimulationReplayCapture(context);
    const replay = replaySimulationCapture({
      ...capture,
      resultFingerprint: "00000000",
    });

    expect(replay.matches).toBe(false);
    expect(replay.actualFingerprint).not.toBe(replay.expectedFingerprint);
  });

  it("rejects captures where stored seed and input seed diverge", () => {
    const context = createProductionMatchContext(3, {
      matchId: "replay-invalid-seed-game-1",
      seed: "replay-invalid-seed-1",
    });
    const capture = createSimulationReplayCapture(context);

    expect(() =>
      replaySimulationCapture({
        ...capture,
        input: {
          ...capture.input,
          simulationSeed: "different-seed",
        },
      }),
    ).toThrow("Replay capture seed mismatch");
  });
});
