import { describe, expect, it } from "vitest";

import { simulateMinimalDriveGame } from "./minimal-drive-simulation";

const homeTeam = {
  abbreviation: "BOS",
  id: "bos",
  name: "Boston Guardians",
  overallRating: 74,
};

const awayTeam = {
  abbreviation: "NYT",
  id: "nyt",
  name: "New York Titans",
  overallRating: 71,
};

function classifyGame(result: ReturnType<typeof simulateMinimalDriveGame>) {
  const totalScore = result.homeScore + result.awayScore;
  const touchdowns = result.drives.filter((drive) => drive.resultType === "TOUCHDOWN").length;
  const punts = result.drives.filter((drive) => drive.resultType === "PUNT").length;

  if (totalScore <= 24 && punts >= 9) {
    return "Defense Game";
  }

  if (totalScore >= 38 || touchdowns >= 4) {
    return "High Scoring";
  }

  return "Balanced";
}

describe("simulateMinimalDriveGame", () => {
  it("creates a deterministic drive-based game from the same seed inputs", () => {
    const first = simulateMinimalDriveGame({
      awayTeam,
      homeTeam,
      matchId: "match-1",
      week: 1,
    });
    const second = simulateMinimalDriveGame({
      awayTeam,
      homeTeam,
      matchId: "match-1",
      week: 1,
    });

    expect(second).toEqual(first);
    expect(first.seed).toContain("minimal-drive:match-1");
    expect(first.drives.length).toBeGreaterThanOrEqual(12);
    expect(first.drives.length).toBeLessThanOrEqual(17);
  });

  it("produces four-quarter drives with automatic score progression", () => {
    const result = simulateMinimalDriveGame({
      awayTeam,
      homeTeam,
      matchId: "match-2",
      week: 2,
    });

    expect(result.homeScore).toBeGreaterThanOrEqual(0);
    expect(result.awayScore).toBeGreaterThanOrEqual(0);
    expect(result.homeScore).not.toBe(result.awayScore);
    expect(result.drives.map((drive) => drive.phaseLabel)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Q1 /),
        expect.stringMatching(/^Q2 /),
        expect.stringMatching(/^Q3 /),
        expect.stringMatching(/^Q4 /),
      ]),
    );
    expect(result.drives[0]).toEqual(
      expect.objectContaining({
        sequence: 1,
        startedAwayScore: 0,
        startedHomeScore: 0,
        summary: expect.stringContaining("startet an der eigenen 25"),
      }),
    );
    expect(result.drives.some((drive) => drive.summary.includes("Big Play"))).toBe(true);
    expect(result.drives.some((drive) => drive.redZoneTrip)).toBe(true);
  });

  it("creates visible score and outcome variation across a 10-game sample", () => {
    const results = Array.from({ length: 10 }, (_, index) =>
      simulateMinimalDriveGame({
        awayTeam,
        homeTeam,
        matchId: `variation-${index + 1}`,
        week: index + 1,
      }),
    );
    const totalScores = results.map((result) => result.homeScore + result.awayScore);
    const turnoverAverage =
      results.reduce((sum, result) => sum + result.homeStats.turnovers + result.awayStats.turnovers, 0) /
      results.length;
    const gameTypes = new Set(results.map(classifyGame));

    expect(Math.max(...totalScores) - Math.min(...totalScores)).toBeGreaterThanOrEqual(20);
    expect(turnoverAverage).toBeLessThanOrEqual(2.3);
    expect(gameTypes).toEqual(new Set(["Balanced", "Defense Game", "High Scoring"]));
  });
});
