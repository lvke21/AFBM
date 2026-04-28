import { describe, expect, it } from "vitest";

import {
  ATTRIBUTE_PROGRESS_CAP,
  calculateDevelopmentFocusWeeklyXp,
  calculateGameProgressionXp,
  calculateWeeklyTrainingXp,
  buildAttributeProgressionPlan,
} from "./player-progression";

const basePlayer = {
  age: 23,
  attributes: {
    HANDS: 70,
    ROUTE_RUNNING: 70,
    SEPARATION: 70,
  },
  depthChartSlot: 1,
  developmentFocus: false,
  developmentTrait: "NORMAL",
  fatigue: 28,
  morale: 58,
  positionCode: "WR",
  positionOverall: 70,
  potentialRating: 82,
  rosterStatus: "STARTER",
};

describe("player progression", () => {
  it("adds deterministic weekly training XP and rewards development focus", () => {
    const unfocusedXp = calculateWeeklyTrainingXp(basePlayer);
    const focusedXp = calculateWeeklyTrainingXp({
      ...basePlayer,
      developmentFocus: true,
    });

    expect(unfocusedXp).toBe(68);
    expect(focusedXp).toBe(90);
    expect(focusedXp).toBeGreaterThan(unfocusedXp);
  });

  it("keeps focus useful but applies diminishing returns for repeated weekly focus", () => {
    const freshFocusXp = calculateWeeklyTrainingXp({
      ...basePlayer,
      developmentFocus: true,
      developmentFocusStreakWeeks: 0,
    });
    const repeatedFocusXp = calculateWeeklyTrainingXp({
      ...basePlayer,
      developmentFocus: true,
      developmentFocusStreakWeeks: 3,
    });

    expect(calculateDevelopmentFocusWeeklyXp(basePlayer)).toBe(0);
    expect(freshFocusXp).toBe(90);
    expect(repeatedFocusXp).toBe(78);
    expect(repeatedFocusXp).toBeGreaterThan(calculateWeeklyTrainingXp(basePlayer));
    expect(repeatedFocusXp).toBeLessThan(freshFocusXp);
  });

  it("turns enough XP into bounded attribute growth", () => {
    const changes = buildAttributeProgressionPlan({
      maxAttributeGains: 1,
      player: {
        ...basePlayer,
        developmentFocus: true,
      },
      source: "WEEKLY_TRAINING",
      xpGained: 90,
    });

    expect(changes).toEqual([
      {
        code: "HANDS",
        delta: 1,
        previous: 70,
        next: 71,
      },
    ]);
  });

  it("does not grow players at their potential or over the attribute cap", () => {
    expect(
      buildAttributeProgressionPlan({
        maxAttributeGains: 2,
        player: {
          ...basePlayer,
          positionOverall: 82,
          potentialRating: 82,
        },
        source: "WEEKLY_TRAINING",
        xpGained: 140,
      }),
    ).toEqual([]);

    expect(
      buildAttributeProgressionPlan({
        maxAttributeGains: 2,
        player: {
          ...basePlayer,
          attributes: {
            HANDS: ATTRIBUTE_PROGRESS_CAP,
            RELEASE: ATTRIBUTE_PROGRESS_CAP,
            ROUTE_RUNNING: ATTRIBUTE_PROGRESS_CAP,
            RUN_AFTER_CATCH: ATTRIBUTE_PROGRESS_CAP,
            SEPARATION: ATTRIBUTE_PROGRESS_CAP,
          },
        },
        source: "WEEKLY_TRAINING",
        xpGained: 140,
      }),
    ).toEqual([]);
  });

  it("keeps edge cases conservative when no player is focused", () => {
    const xp = calculateWeeklyTrainingXp({
      ...basePlayer,
      depthChartSlot: null,
      developmentFocus: false,
      fatigue: 88,
      morale: 40,
      rosterStatus: "PRACTICE_SQUAD",
    });

    expect(xp).toBe(13);
    expect(
      buildAttributeProgressionPlan({
        maxAttributeGains: 1,
        player: basePlayer,
        source: "WEEKLY_TRAINING",
        xpGained: xp,
      }),
    ).toEqual([]);
  });

  it("keeps older low-potential focused players under the weekly XP cap", () => {
    const xp = calculateWeeklyTrainingXp({
      ...basePlayer,
      age: 32,
      developmentFocus: true,
      developmentFocusStreakWeeks: 5,
      developmentTrait: "ELITE",
      potentialRating: 70,
      positionOverall: 70,
    });

    expect(xp).toBeLessThan(70);
    expect(xp).toBeLessThanOrEqual(140);
  });

  it("calculates game XP from snaps and performance without randomness", () => {
    const xp = calculateGameProgressionXp({
      ...basePlayer,
      bigPlays: 2,
      mistakes: 1,
      started: true,
      totalSnaps: 52,
      touchdowns: 1,
    });

    expect(xp).toBe(153);
  });
});
