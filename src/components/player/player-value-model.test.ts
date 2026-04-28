import { describe, expect, it } from "vitest";

import { buildPlayerValue } from "./player-value-model";

describe("player value model", () => {
  it("rewards strong fit and fair cap as great value", () => {
    const value = buildPlayerValue({
      age: 25,
      capHit: 7_000_000,
      positionOverall: 78,
      potentialRating: 82,
      schemeFitScore: 88,
      teamNeedScore: 90,
    });

    expect(value.label).toBe("Great Value");
    expect(value.reason).toBe("Guter Fit bei moderaten Kosten");
  });

  it("marks poor fit and low need as low fit", () => {
    const value = buildPlayerValue({
      age: 29,
      capHit: 6_000_000,
      positionOverall: 76,
      potentialRating: 77,
      schemeFitScore: 30,
      teamNeedScore: 30,
    });

    expect(value.label).toBe("Low Fit");
    expect(value.reason).toBe("Niedriger Fit fuer Team Need");
  });

  it("marks overpriced backups as expensive", () => {
    const value = buildPlayerValue({
      age: 30,
      capHit: 14_000_000,
      positionOverall: 72,
      potentialRating: 73,
      rosterStatus: "BACKUP",
      schemeFitScore: 65,
      teamNeedScore: 50,
    });

    expect(value.label).toBe("Expensive");
    expect(value.reason).toBe("Teuer fuer aktuelle Rolle");
  });

  it("does not punish young upside players for moderate cap", () => {
    const value = buildPlayerValue({
      age: 22,
      capHit: 5_000_000,
      positionOverall: 68,
      potentialRating: 82,
      schemeFitScore: 70,
      teamNeedScore: 60,
    });

    expect(value.label).not.toBe("Low Fit");
    expect(value.score).toBeGreaterThanOrEqual(65);
  });

  it("keeps missing contract data stable", () => {
    const value = buildPlayerValue({
      positionOverall: 70,
      potentialRating: 72,
    });

    expect(value.label).toBe("Fair Value");
    expect(value.reason).toBe("Solider Wert ohne klaren Rabatt");
  });

  it("keeps a reason for every value label", () => {
    const values = [
      buildPlayerValue({
        age: 25,
        capHit: 7_000_000,
        positionOverall: 78,
        potentialRating: 82,
        schemeFitScore: 88,
        teamNeedScore: 90,
      }),
      buildPlayerValue({
        capHit: 6_000_000,
        positionOverall: 76,
        potentialRating: 77,
        schemeFitScore: 30,
        teamNeedScore: 30,
      }),
      buildPlayerValue({
        capHit: 14_000_000,
        positionOverall: 72,
        potentialRating: 73,
        rosterStatus: "BACKUP",
      }),
      buildPlayerValue({
        positionOverall: 70,
        potentialRating: 72,
      }),
    ];

    expect(new Set(values.map((value) => value.label))).toEqual(
      new Set(["Great Value", "Low Fit", "Expensive", "Fair Value"]),
    );
    expect(values.every((value) => value.reason.length > 0)).toBe(true);
  });
});
