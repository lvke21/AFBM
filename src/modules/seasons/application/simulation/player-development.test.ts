import { describe, expect, it, vi } from "vitest";

import { applyAdvanceWeekPlayerDevelopment, type AdvanceWeekDevelopmentPlayer } from "./player-development";

function createTx() {
  return {
    playerAttributeRating: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    playerEvaluation: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

function createPlayer(overrides: Partial<AdvanceWeekDevelopmentPlayer> = {}): AdvanceWeekDevelopmentPlayer {
  return {
    id: "player-1",
    teamId: "team-1",
    positionCode: "WR",
    secondaryPositionCode: null,
    rosterStatus: "STARTER",
    depthChartSlot: 1,
    developmentFocus: true,
    developmentTrait: "NORMAL",
    potentialRating: 82,
    positionOverall: 70,
    attributes: {
      HANDS: 70,
      ROUTE_RUNNING: 70,
      SEPARATION: 70,
      RELEASE: 70,
      RUN_AFTER_CATCH: 70,
    },
    ...overrides,
  };
}

describe("advance-week player development", () => {
  it("adds at most one focused attribute point for an eligible player", async () => {
    const tx = createTx();

    const result = await applyAdvanceWeekPlayerDevelopment({
      tx: tx as never,
      saveGameId: "save-1",
      player: createPlayer(),
    });

    expect(result?.changes).toEqual([
      {
        code: "HANDS",
        previous: 70,
        next: 71,
        delta: 1,
      },
    ]);
    expect(tx.playerAttributeRating.updateMany).toHaveBeenCalledWith({
      where: {
        saveGameId: "save-1",
        playerId: "player-1",
        attributeDefinition: {
          code: "HANDS",
        },
      },
      data: {
        value: 71,
      },
    });
    expect(tx.playerEvaluation.update).toHaveBeenCalledOnce();
  });

  it("does not develop players who are already at their potential", async () => {
    const tx = createTx();

    const result = await applyAdvanceWeekPlayerDevelopment({
      tx: tx as never,
      saveGameId: "save-1",
      player: createPlayer({
        potentialRating: 70,
        positionOverall: 70,
      }),
    });

    expect(result).toBeNull();
    expect(tx.playerAttributeRating.updateMany).not.toHaveBeenCalled();
    expect(tx.playerEvaluation.update).not.toHaveBeenCalled();
  });

  it("keeps low-playing-time players without focus from gaining every week", async () => {
    const tx = createTx();

    const result = await applyAdvanceWeekPlayerDevelopment({
      tx: tx as never,
      saveGameId: "save-1",
      player: createPlayer({
        rosterStatus: "BACKUP",
        depthChartSlot: null,
        developmentFocus: false,
      }),
    });

    expect(result).toBeNull();
    expect(tx.playerAttributeRating.updateMany).not.toHaveBeenCalled();
  });

  it("keeps repeated focus useful but below fresh-focus weekly XP", async () => {
    const tx = createTx();

    const result = await applyAdvanceWeekPlayerDevelopment({
      tx: tx as never,
      saveGameId: "save-1",
      player: createPlayer({
        developmentFocus: true,
        developmentFocusStreakWeeks: 3,
      }),
    });

    expect(result?.xpGained).toBe(76);
    expect(result?.focusBonusXp).toBe(10);
    expect(result?.changes).toHaveLength(1);
  });
});
