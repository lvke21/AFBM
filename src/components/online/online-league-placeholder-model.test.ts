import { describe, expect, it } from "vitest";

import type { OnlineLeagueDetailState } from "./online-league-detail-model";
import { getOnlineReadyGuidanceItems } from "./online-league-placeholder-model";

function detailState(overrides: Partial<Extract<OnlineLeagueDetailState, { status: "found" }>> = {}) {
  return {
    status: "found",
    firstSteps: {
      completedCount: 0,
      totalCount: 2,
      items: [
        { id: "team", label: "Team", completed: true, statusLabel: "Erledigt" },
        { id: "training", label: "Training", completed: false, statusLabel: "Empfohlen" },
      ],
    },
    roster: { depthChart: [] },
    franchise: null,
    ...overrides,
  } as Extract<OnlineLeagueDetailState, { status: "found" }>;
}

describe("online league placeholder model", () => {
  it("derives ready guidance from first steps and firebase mode", () => {
    expect(getOnlineReadyGuidanceItems(detailState(), true)).toEqual([
      { label: "Team geprüft", completed: true, statusLabel: "Erledigt" },
      { label: "Training geprüft", completed: true, statusLabel: "Auto-Default aktiv" },
      {
        label: "Strategie/Depth Chart optional geprüft",
        completed: false,
        statusLabel: "Optional",
      },
    ]);
  });

  it("marks optional planning complete when a depth chart exists", () => {
    expect(
      getOnlineReadyGuidanceItems(
        detailState({ roster: { depthChart: [{ position: "QB" }] } } as Partial<
          Extract<OnlineLeagueDetailState, { status: "found" }>
        >),
        false,
      )[2],
    ).toEqual({
      label: "Strategie/Depth Chart optional geprüft",
      completed: true,
      statusLabel: "Geprüft",
    });
  });
});
