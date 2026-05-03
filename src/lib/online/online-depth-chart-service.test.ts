import { describe, expect, it } from "vitest";

import type { OnlineContractPlayer } from "./online-league-types";
import {
  createDefaultOnlineDepthChart,
  validateOnlineDepthChartForRoster,
} from "./online-depth-chart-service";

function player(overrides: Partial<OnlineContractPlayer> = {}): OnlineContractPlayer {
  return {
    age: 25,
    contract: {
      capHitPerYear: 1_000_000,
      contractType: "regular",
      deadCapPerYear: 0,
      guaranteedMoney: 0,
      salaryPerYear: 1_000_000,
      signingBonus: 0,
      totalValue: 1_000_000,
      yearsRemaining: 1,
    },
    developmentPath: "solid",
    developmentProgress: 0,
    overall: 70,
    playerId: "player-1",
    playerName: "Test Player",
    position: "QB",
    potential: 75,
    status: "active",
    xFactors: [],
    ...overrides,
  };
}

describe("online depth chart service", () => {
  it("creates starters and backups from active roster players by position", () => {
    const depthChart = createDefaultOnlineDepthChart(
      [
        player({ playerId: "qb-1", overall: 75, position: "QB" }),
        player({ playerId: "qb-2", overall: 82, position: "QB" }),
        player({ playerId: "wr-1", overall: 78, position: "WR" }),
        player({ playerId: "inactive-rb", position: "RB", status: "released" }),
      ],
      "2026-05-02T10:00:00.000Z",
    );

    expect(depthChart).toEqual([
      {
        backupPlayerIds: ["qb-1"],
        position: "QB",
        starterPlayerId: "qb-2",
        updatedAt: "2026-05-02T10:00:00.000Z",
      },
      {
        backupPlayerIds: [],
        position: "WR",
        starterPlayerId: "wr-1",
        updatedAt: "2026-05-02T10:00:00.000Z",
      },
    ]);
  });

  it("validates starters and backups against the active roster only", () => {
    const roster = [
      player({ playerId: "qb-1", position: "QB" }),
      player({ playerId: "qb-2", position: "QB" }),
      player({ playerId: "inactive-qb", position: "QB", status: "released" }),
    ];

    expect(
      validateOnlineDepthChartForRoster(roster, [
        {
          backupPlayerIds: ["qb-2"],
          position: "QB",
          starterPlayerId: "qb-1",
          updatedAt: "2026-05-02T10:00:00.000Z",
        },
      ]),
    ).toBe(true);
    expect(
      validateOnlineDepthChartForRoster(roster, [
        {
          backupPlayerIds: ["inactive-qb"],
          position: "QB",
          starterPlayerId: "qb-1",
          updatedAt: "2026-05-02T10:00:00.000Z",
        },
      ]),
    ).toBe(false);
    expect(
      validateOnlineDepthChartForRoster(roster, [
        {
          backupPlayerIds: [],
          position: "RB",
          starterPlayerId: "qb-1",
          updatedAt: "2026-05-02T10:00:00.000Z",
        },
      ]),
    ).toBe(false);
  });
});
