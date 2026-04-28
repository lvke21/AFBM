import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlayerHistoryEventType, RosterStatus } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => ({
  createPlayerHistoryEvent: vi.fn(),
  applyAdvanceWeekPlayerDevelopment: vi.fn(),
  recalculateTeamState: vi.fn(),
}));

vi.mock("@/modules/players/application/player-history.service", () => ({
  createPlayerHistoryEvent: mocks.createPlayerHistoryEvent,
}));

vi.mock("@/modules/seasons/application/simulation/player-development", () => ({
  applyAdvanceWeekPlayerDevelopment: mocks.applyAdvanceWeekPlayerDevelopment,
  recalculateTeamState: mocks.recalculateTeamState,
}));

import { applyWeeklyDevelopmentForSaveGame } from "./weekly-player-development.service";

function createTx() {
  return {
    playerRosterProfile: {
      findMany: vi.fn(),
    },
    playerHistoryEvent: {
      findMany: vi.fn(),
    },
  };
}

function createRosterProfile(overrides = {}) {
  return {
    teamId: "team-1",
    rosterStatus: RosterStatus.STARTER,
    depthChartSlot: 1,
    developmentFocus: true,
    primaryPosition: {
      code: "WR",
    },
    secondaryPosition: null,
    player: {
      id: "player-1",
      firstName: "Test",
      lastName: "Receiver",
      developmentTrait: "NORMAL",
      evaluation: {
        potentialRating: 82,
        positionOverall: 70,
      },
      attributes: [
        {
          value: 70,
          attributeDefinition: {
            code: "HANDS",
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("weekly-player-development.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyAdvanceWeekPlayerDevelopment.mockResolvedValue({
      previousOverall: 70,
      nextOverall: 71,
      xpGained: 90,
      changes: [
        {
          code: "HANDS",
          previous: 70,
          next: 71,
          delta: 1,
        },
      ],
    });
    mocks.createPlayerHistoryEvent.mockResolvedValue({});
    mocks.recalculateTeamState.mockResolvedValue({});
  });

  it("applies weekly development, writes history, and recalculates touched teams", async () => {
    const tx = createTx();
    tx.playerRosterProfile.findMany.mockResolvedValue([createRosterProfile()]);
    tx.playerHistoryEvent.findMany.mockResolvedValue([]);

    const result = await applyWeeklyDevelopmentForSaveGame({
      tx: tx as never,
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 3,
      occurredAt: new Date("2026-04-25T12:00:00Z"),
    });

    expect(mocks.applyAdvanceWeekPlayerDevelopment).toHaveBeenCalledWith({
      tx,
      saveGameId: "save-1",
      player: {
        id: "player-1",
        teamId: "team-1",
        positionCode: "WR",
        secondaryPositionCode: null,
        rosterStatus: RosterStatus.STARTER,
        depthChartSlot: 1,
        developmentFocus: true,
        developmentFocusStreakWeeks: 0,
        developmentTrait: "NORMAL",
        potentialRating: 82,
        positionOverall: 70,
        attributes: {
          HANDS: 70,
        },
      },
    });
    expect(mocks.createPlayerHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Test Receiver: OVR 70->71 · XP 90 · HANDS 70->71",
        saveGameId: "save-1",
        playerId: "player-1",
        seasonId: "season-1",
        teamId: "team-1",
        type: PlayerHistoryEventType.DEVELOPMENT,
        week: 3,
      }),
    );
    expect(mocks.recalculateTeamState).toHaveBeenCalledWith(tx, "save-1", "team-1");
    expect(result).toEqual({
      changedPlayers: 1,
      skippedAlreadyDeveloped: 0,
      touchedTeamIds: ["team-1"],
    });
  });

  it("passes a repeated development-focus streak into weekly progression", async () => {
    const tx = createTx();
    tx.playerRosterProfile.findMany.mockResolvedValue([createRosterProfile()]);
    tx.playerHistoryEvent.findMany.mockResolvedValue([
      {
        playerId: "player-1",
        week: 2,
        description: "Test Receiver: OVR 70->71 · XP 90 · Development Focus: +22 XP, streak 0 · HANDS 70->71",
      },
      {
        playerId: "player-1",
        week: 1,
        description: "Test Receiver: OVR 69->70 · XP 86 · Development Focus: +18 XP, streak 1 · ROUTE_RUNNING 69->70",
      },
    ]);

    await applyWeeklyDevelopmentForSaveGame({
      tx: tx as never,
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 3,
      occurredAt: new Date("2026-04-25T12:00:00Z"),
    });

    expect(mocks.applyAdvanceWeekPlayerDevelopment).toHaveBeenCalledWith(
      expect.objectContaining({
        player: expect.objectContaining({
          developmentFocus: true,
          developmentFocusStreakWeeks: 2,
        }),
      }),
    );
  });

  it("skips players who already have a development event for the week", async () => {
    const tx = createTx();
    tx.playerRosterProfile.findMany.mockResolvedValue([createRosterProfile()]);
    tx.playerHistoryEvent.findMany.mockResolvedValue([
      {
        playerId: "player-1",
        week: 3,
        description: "Test Receiver: OVR 70->71 · XP 90 · HANDS 70->71",
      },
    ]);

    const result = await applyWeeklyDevelopmentForSaveGame({
      tx: tx as never,
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 3,
      occurredAt: new Date("2026-04-25T12:00:00Z"),
    });

    expect(mocks.applyAdvanceWeekPlayerDevelopment).not.toHaveBeenCalled();
    expect(mocks.createPlayerHistoryEvent).not.toHaveBeenCalled();
    expect(mocks.recalculateTeamState).not.toHaveBeenCalled();
    expect(result).toEqual({
      changedPlayers: 0,
      skippedAlreadyDeveloped: 1,
      touchedTeamIds: [],
    });
  });
});
