import { describe, expect, it } from "vitest";

import { RosterStatus } from "@/modules/shared/domain/enums";

import {
  findDepthChartConflict,
  normalizeDepthChartSlot,
} from "./team-management.service";

describe("team management roster validation", () => {
  it("rejects invalid depth chart slot values", () => {
    expect(() => normalizeDepthChartSlot(Number.NaN)).toThrow(
      "Depth chart slot must be a positive whole number",
    );
    expect(() => normalizeDepthChartSlot(0)).toThrow(
      "Depth chart slot must be a positive whole number",
    );
    expect(normalizeDepthChartSlot(3)).toBe(3);
  });

  it("finds conflicting slots only for game-day eligible players at the same position", () => {
    const conflict = findDepthChartConflict({
      playerId: "player-1",
      positionCode: "QB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 2,
      rosterAssignments: [
        {
          playerId: "player-2",
          fullName: "Alex Carter",
          positionCode: "QB",
          rosterStatus: RosterStatus.STARTER,
          depthChartSlot: 2,
        },
        {
          playerId: "player-3",
          fullName: "Miles North",
          positionCode: "QB",
          rosterStatus: RosterStatus.INACTIVE,
          depthChartSlot: 2,
        },
      ],
    });

    expect(conflict?.fullName).toBe("Alex Carter");
  });

  it("ignores depth chart slots for non-playing roster statuses", () => {
    const conflict = findDepthChartConflict({
      playerId: "player-1",
      positionCode: "WR",
      rosterStatus: RosterStatus.PRACTICE_SQUAD,
      depthChartSlot: 1,
      rosterAssignments: [
        {
          playerId: "player-2",
          fullName: "Taylor Reed",
          positionCode: "WR",
          rosterStatus: RosterStatus.STARTER,
          depthChartSlot: 1,
        },
      ],
    });

    expect(conflict).toBeNull();
  });
});
