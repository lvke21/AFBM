import { describe, expect, it } from "vitest";

import {
  WeeklyOpponentFocus,
  WeeklyPlanIntensity,
  buildWeeklyPlanConditionImpact,
  normalizeWeeklyPlanInput,
} from "./weekly-plan";

describe("weekly plan", () => {
  it("normalizes invalid values to a conservative balanced plan", () => {
    expect(
      normalizeWeeklyPlanInput({
        developmentFocusPlayerIds: [" player-1 ", "", "player-1", "player-2", "player-3", "player-4"],
        intensity: "AGGRESSIVE" as never,
        opponentFocus: "BLITZ" as never,
      }),
    ).toEqual({
      developmentFocusPlayerIds: ["player-1", "player-2", "player-3"],
      intensity: WeeklyPlanIntensity.BALANCED,
      opponentFocus: WeeklyOpponentFocus.BALANCED,
    });
  });

  it("keeps weekly condition impacts small and explicit", () => {
    expect(
      buildWeeklyPlanConditionImpact({
        developmentFocusPlayerIds: [],
        intensity: WeeklyPlanIntensity.RECOVERY,
        opponentFocus: WeeklyOpponentFocus.DEFENSE,
      }),
    ).toEqual({
      fatigueDelta: -16,
      moraleDelta: 4,
    });

    expect(
      buildWeeklyPlanConditionImpact({
        developmentFocusPlayerIds: [],
        intensity: WeeklyPlanIntensity.INTENSE,
        opponentFocus: WeeklyOpponentFocus.BALANCED,
      }),
    ).toEqual({
      fatigueDelta: 10,
      moraleDelta: -2,
    });
  });

  it("separates balanced training from recovery and intense load", () => {
    expect(
      buildWeeklyPlanConditionImpact({
        developmentFocusPlayerIds: [],
        intensity: WeeklyPlanIntensity.BALANCED,
        opponentFocus: WeeklyOpponentFocus.BALANCED,
      }),
    ).toEqual({
      fatigueDelta: 2,
      moraleDelta: 0,
    });
  });
});
