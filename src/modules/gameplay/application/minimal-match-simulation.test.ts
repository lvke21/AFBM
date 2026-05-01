import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/random/seeded-rng";

import { simulateMatch, type MinimalMatchTeamStats } from "./minimal-match-simulation";

function expectCompleteStats(stats: MinimalMatchTeamStats) {
  expect(stats).toEqual({
    firstDowns: expect.any(Number),
    passingYards: expect.any(Number),
    rushingYards: expect.any(Number),
    totalYards: expect.any(Number),
    turnovers: expect.any(Number),
  });
  expect(Object.values(stats).every((value) => value != null && Number.isFinite(value))).toBe(true);
  expect(stats.totalYards).toBe(stats.passingYards + stats.rushingYards);
  expect(stats.totalYards).toBeGreaterThanOrEqual(0);
  expect(stats.passingYards).toBeGreaterThanOrEqual(0);
  expect(stats.rushingYards).toBeGreaterThanOrEqual(0);
  expect(stats.turnovers).toBeGreaterThanOrEqual(0);
  expect(stats.firstDowns).toBeGreaterThanOrEqual(0);
}

describe("simulateMatch", () => {
  const teamA = {
    id: "team-a",
    name: "Team A",
    rating: 76,
  };

  const teamB = {
    id: "team-b",
    name: "Team B",
    rating: 72,
  };

  it("returns scores and a winner", () => {
    const result = simulateMatch(teamA, teamB, { seed: "basic-match" });

    expect(result.scoreA).toEqual(expect.any(Number));
    expect(result.scoreB).toEqual(expect.any(Number));
    expect(result.scoreA).toBeGreaterThanOrEqual(0);
    expect(result.scoreB).toBeGreaterThanOrEqual(0);
    expect(result.scoreA).not.toBe(result.scoreB);
    expect(result.winner).toBe(result.scoreA > result.scoreB ? "A" : "B");
    expect(typeof result.tiebreakerApplied).toBe("boolean");
    expectCompleteStats(result.teamAStats);
    expectCompleteStats(result.teamBStats);
  });

  it("returns a complete match result with plausible team stats for both teams", () => {
    const result = simulateMatch(teamA, teamB, { seed: "complete-match-result" });

    expect(result).toEqual({
      scoreA: expect.any(Number),
      scoreB: expect.any(Number),
      teamAStats: expect.any(Object),
      teamBStats: expect.any(Object),
      tiebreakerApplied: expect.any(Boolean),
      winner: expect.stringMatching(/A|B/),
    });
    expectCompleteStats(result.teamAStats);
    expectCompleteStats(result.teamBStats);
  });

  it("is deterministic for the same seed", () => {
    const first = simulateMatch(teamA, teamB, { seed: "repeatable-match" });
    const second = simulateMatch(teamA, teamB, { seed: "repeatable-match" });

    expect(second).toEqual(first);
  });

  it("accepts a provided RNG source", () => {
    const first = simulateMatch(teamA, teamB, { rng: createRng("provided-rng") });
    const second = simulateMatch(teamA, teamB, { rng: createRng("provided-rng") });

    expect(second).toEqual(first);
  });

  it("lets different seeds produce different outcomes", () => {
    const results = Array.from({ length: 8 }, (_, index) =>
      simulateMatch(teamA, teamB, { seed: `seed-variant-${index}` }),
    );
    const uniqueResults = new Set(results.map((result) => JSON.stringify(result)));

    expect(uniqueResults.size).toBeGreaterThan(1);
  });

  it("uses overall as a rating alias", () => {
    const result = simulateMatch({ id: "overall-a", overall: 80 }, { id: "overall-b", overall: 65 }, {
      seed: "overall-rating-alias",
    });

    expect(result.scoreA).toEqual(expect.any(Number));
    expect(result.scoreB).toEqual(expect.any(Number));
    expect(result.winner).toMatch(/A|B/);
    expectCompleteStats(result.teamAStats);
    expectCompleteStats(result.teamBStats);
  });

  it("gives a stronger team a clear advantage across deterministic seeds", () => {
    const strongerTeamWins = Array.from({ length: 40 }, (_, index) =>
      simulateMatch(
        { id: "strong-team", rating: 92 },
        { id: "weak-team", rating: 48 },
        { seed: `rating-influence-${index}` },
      ),
    ).filter((result) => result.winner === "A").length;

    expect(strongerTeamWins).toBeGreaterThanOrEqual(30);
  });

  it("runs repeatedly with stable seeded output and no runtime errors", () => {
    const firstPass = Array.from({ length: 100 }, (_, index) =>
      simulateMatch(teamA, teamB, { seed: `stability-run-${index}` }),
    );
    const secondPass = Array.from({ length: 100 }, (_, index) =>
      simulateMatch(teamA, teamB, { seed: `stability-run-${index}` }),
    );

    expect(secondPass).toEqual(firstPass);
    for (const result of firstPass) {
      expect(Number.isFinite(result.scoreA)).toBe(true);
      expect(Number.isFinite(result.scoreB)).toBe(true);
      expect(result.scoreA).toBeGreaterThanOrEqual(0);
      expect(result.scoreB).toBeGreaterThanOrEqual(0);
      expect(result.scoreA).not.toBe(result.scoreB);
      expect(result.winner).toBe(result.scoreA > result.scoreB ? "A" : "B");
      expectCompleteStats(result.teamAStats);
      expectCompleteStats(result.teamBStats);
    }
  });

  it("resolves a forced 0-0 generated tie into a winner", () => {
    const result = simulateMatch(
      { id: "zero-a", rating: 0 },
      { id: "zero-b", rating: 0 },
      { rng: () => 0 },
    );

    expect(result.scoreA).toBe(3);
    expect(result.scoreB).toBe(0);
    expect(result.winner).toBe("A");
    expect(result.tiebreakerApplied).toBe(true);
    expectCompleteStats(result.teamAStats);
    expectCompleteStats(result.teamBStats);
  });

  it("handles equal-team ties without returning tied final scores", () => {
    const tiedRollsThenTeamB = [0.5, 0.5, 0.5, 0.5, 0, 1];
    let draw = 0;

    const result = simulateMatch(
      { id: "tie-a", rating: 70 },
      { id: "tie-b", rating: 70 },
      {
        rng: () => tiedRollsThenTeamB[draw++] ?? 0.5,
      },
    );

    expect(result.scoreA).toBe(21);
    expect(result.scoreB).toBe(24);
    expect(result.winner).toBe("B");
    expect(result.tiebreakerApplied).toBe(true);
    expectCompleteStats(result.teamAStats);
    expectCompleteStats(result.teamBStats);
  });

  it("clamps extreme and invalid ratings to safe score ranges", () => {
    const result = simulateMatch(
      { id: "extreme-a", rating: 999 },
      { id: "extreme-b", rating: Number.NaN, overall: -100 },
      { seed: "extreme-rating-safety" },
    );

    expect(result.scoreA).toBeGreaterThanOrEqual(0);
    expect(result.scoreA).toBeLessThanOrEqual(63);
    expect(result.scoreB).toBeGreaterThanOrEqual(0);
    expect(result.scoreB).toBeLessThanOrEqual(63);
    expect(result.scoreA).not.toBe(result.scoreB);
    expect(result.winner).toBe(result.scoreA > result.scoreB ? "A" : "B");
    expectCompleteStats(result.teamAStats);
    expectCompleteStats(result.teamBStats);
  });
});
