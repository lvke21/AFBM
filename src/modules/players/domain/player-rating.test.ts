import { describe, expect, it } from "vitest";

import { ATTRIBUTE_DEFINITIONS } from "@/modules/shared/infrastructure/reference-data";
import { computePlayerCompositeRatings } from "./player-rating";

const REQUIRED_PLAY_DEVELOPMENT_ATTRIBUTES = [
  "POCKET_PRESENCE",
  "DECISION_MAKING",
  "AWARENESS",
  "INTELLIGENCE",
  "LEADERSHIP",
  "RELEASE",
  "ROUTE_RUNNING",
  "SEPARATION",
  "CATCHING",
  "PASS_PROTECTION",
  "PASS_BLOCK",
  "RUN_BLOCK",
  "FOOTWORK",
  "HAND_TECHNIQUE",
  "ANCHOR",
  "PASS_RUSH",
  "POWER_MOVES",
  "FINESSE_MOVES",
  "BLOCK_SHEDDING",
  "PRESS",
  "MAN_COVERAGE",
  "ZONE_COVERAGE",
  "PLAY_RECOGNITION",
  "DISCIPLINE",
] as const;

describe("player rating composites", () => {
  it("keeps the play-development source attributes available without duplicates", () => {
    const attributeCodes = ATTRIBUTE_DEFINITIONS.map((attribute) => attribute.code);

    expect(new Set(attributeCodes).size).toBe(attributeCodes.length);
    expect(attributeCodes).toEqual(
      expect.arrayContaining([...REQUIRED_PLAY_DEVELOPMENT_ATTRIBUTES]),
    );
  });

  it("exposes the play-development composite ratings", () => {
    const ratings = computePlayerCompositeRatings({});

    expect(ratings).toEqual(
      expect.objectContaining({
        offensiveLineChemistry: expect.any(Number),
        qbReceiverChemistry: expect.any(Number),
        defensiveBackChemistry: expect.any(Number),
        protectionUnit: expect.any(Number),
        passRushUnit: expect.any(Number),
        pressCoverageUnit: expect.any(Number),
        runLaneCreation: expect.any(Number),
        boxDefense: expect.any(Number),
      }),
    );
  });

  it("derives protectionUnit from existing pass-protection and communication ratings", () => {
    const ratings = computePlayerCompositeRatings({
      PASS_BLOCK: 90,
      PASS_PROTECTION: 80,
      FOOTWORK: 70,
      ANCHOR: 60,
      HAND_TECHNIQUE: 85,
      AWARENESS: 75,
      DISCIPLINE: 65,
    });

    expect(ratings.protectionUnit).toBe(76);
  });

  it("derives the pressure and coverage unit composites from existing defensive ratings", () => {
    const ratings = computePlayerCompositeRatings({
      PASS_RUSH: 92,
      POWER_MOVES: 88,
      FINESSE_MOVES: 84,
      BLOCK_SHEDDING: 82,
      PLAY_RECOGNITION: 78,
      ACCELERATION: 74,
      STRENGTH: 80,
      PRESS: 91,
      MAN_COVERAGE: 86,
      COVERAGE_RANGE: 79,
      AWARENESS: 77,
      AGILITY: 81,
    });

    expect(ratings.passRushUnit).toBe(84);
    expect(ratings.pressCoverageUnit).toBe(83);
  });

  it("keeps chemistry and run-box composites explainable from current mental and unit ratings", () => {
    const ratings = computePlayerCompositeRatings({
      AWARENESS: 84,
      DISCIPLINE: 82,
      INTELLIGENCE: 80,
      LEADERSHIP: 76,
      HAND_TECHNIQUE: 78,
      FOOTWORK: 74,
      PASS_BLOCK: 72,
      RUN_BLOCK: 86,
      ROUTE_RUNNING: 83,
      RELEASE: 79,
      SEPARATION: 81,
      CATCHING: 77,
      THROW_ACCURACY_SHORT: 85,
      THROW_ACCURACY_MEDIUM: 82,
      ZONE_COVERAGE: 88,
      MAN_COVERAGE: 84,
      PRESS: 80,
      COVERAGE_RANGE: 86,
      STRENGTH: 87,
      BLOCKING: 75,
      BLOCK_SHEDDING: 89,
      TACKLING: 90,
      PURSUIT: 85,
      PLAY_RECOGNITION: 88,
      HIT_POWER: 83,
    });

    expect(ratings.offensiveLineChemistry).toBe(80);
    expect(ratings.qbReceiverChemistry).toBe(77);
    expect(ratings.defensiveBackChemistry).toBe(84);
    expect(ratings.runLaneCreation).toBe(77);
    expect(ratings.boxDefense).toBe(87);
  });
});
