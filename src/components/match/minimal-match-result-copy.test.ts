import { describe, expect, it } from "vitest";

import type { MinimalMatchSimulationResult } from "@/modules/gameplay/application/minimal-match-simulation";

import {
  buildMinimalMatchResultCopy,
  normalizeMinimalMatchTeamStats,
} from "./minimal-match-result-copy";

function result(overrides: Partial<MinimalMatchSimulationResult>): MinimalMatchSimulationResult {
  return {
    scoreA: 24,
    scoreB: 17,
    teamAStats: {
      firstDowns: 21,
      passingYards: 230,
      rushingYards: 110,
      totalYards: 340,
      turnovers: 1,
    },
    teamBStats: {
      firstDowns: 17,
      passingYards: 190,
      rushingYards: 88,
      totalYards: 278,
      turnovers: 2,
    },
    tiebreakerApplied: false,
    winner: "A",
    ...overrides,
  };
}

describe("buildMinimalMatchResultCopy", () => {
  it("writes a close-win headline without contradicting the score", () => {
    const copy = buildMinimalMatchResultCopy({
      result: result({
        scoreA: 27,
        scoreB: 24,
      }),
      teamAName: "Home Team",
      teamBName: "Away Team",
    });

    expect(copy.headline).toBe("Knapper Sieg nach hartem Kampf");
    expect(copy.summary[0]).toBe("Home Team gewinnt 27:24 gegen Away Team.");
    expect(copy.summary[1]).toContain("knappen Score");
  });

  it("highlights a blowout when the score gap is large", () => {
    const copy = buildMinimalMatchResultCopy({
      result: result({
        scoreA: 42,
        scoreB: 14,
        teamAStats: {
          firstDowns: 29,
          passingYards: 310,
          rushingYards: 170,
          totalYards: 480,
          turnovers: 0,
        },
        teamBStats: {
          firstDowns: 13,
          passingYards: 150,
          rushingYards: 80,
          totalYards: 230,
          turnovers: 3,
        },
      }),
      teamAName: "Home Team",
      teamBName: "Away Team",
    });

    expect(copy.headline).toBe("Blowout mit klarer Ansage");
    expect(copy.summary.join(" ")).toContain("gewinnt 42:14");
    expect(copy.summary[1]).toContain("Turnovers");
  });

  it("uses a tiebreak headline when the simulation applied a tiebreak", () => {
    const copy = buildMinimalMatchResultCopy({
      result: result({
        scoreA: 21,
        scoreB: 24,
        tiebreakerApplied: true,
        winner: "B",
      }),
      teamAName: "Home Team",
      teamBName: "Away Team",
    });

    expect(copy.headline).toBe("Tiebreak entscheidet ein enges Spiel");
    expect(copy.summary[0]).toBe("Away Team gewinnt 24:21 gegen Home Team.");
    expect(copy.summary[1]).toContain("Tiebreak");
  });

  it("treats equal scores as draw copy even when a winner value is present", () => {
    const copy = buildMinimalMatchResultCopy({
      result: result({
        scoreA: 17,
        scoreB: 17,
        winner: "A",
      }),
      teamAName: "Home Team",
      teamBName: "Away Team",
    });

    expect(copy.headline).toBe("Unentschieden nach ausgeglichenem Spiel");
    expect(copy.summary[0]).toBe("Home Team und Away Team trennen sich 17:17.");
    expect(copy.summary.join(" ")).not.toContain("gewinnt");
  });

  it("normalizes missing and invalid stats without throwing", () => {
    const normalized = normalizeMinimalMatchTeamStats({
      firstDowns: Number.NaN,
      passingYards: 120.4,
      rushingYards: -12,
      turnovers: undefined,
    });

    expect(normalized).toEqual({
      firstDowns: 0,
      passingYards: 120,
      rushingYards: 0,
      totalYards: 120,
      turnovers: 0,
    });
    expect(() =>
      buildMinimalMatchResultCopy({
        result: result({
          teamAStats: undefined,
          teamBStats: {
            firstDowns: Number.NaN,
            passingYards: -20,
            rushingYards: 50,
            totalYards: Number.NaN,
            turnovers: -2,
          },
        } as Partial<MinimalMatchSimulationResult>),
        teamAName: "Home Team",
        teamBName: "Away Team",
      }),
    ).not.toThrow();
  });
});
