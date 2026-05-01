import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlayerHistoryEventType } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => ({
  createPlayerHistoryEvent: vi.fn(),
  repository: {
    clearRecoveredPlayers: vi.fn(),
    listPlayersForWeeklyRecovery: vi.fn(),
    listRecoveredPlayers: vi.fn(),
    runInTransaction: vi.fn(),
    updatePlayer: vi.fn(),
  },
}));

vi.mock("@/modules/players/application/player-history.service", () => ({
  createPlayerHistoryEvent: mocks.createPlayerHistoryEvent,
}));

vi.mock("./season-simulation.command-repository", () => ({
  seasonSimulationCommandRepository: mocks.repository,
}));

import { runWeeklyPreparation } from "./weekly-preparation";

describe("runWeeklyPreparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repository.runInTransaction.mockImplementation(async (callback) => callback("tx"));
    mocks.repository.listPlayersForWeeklyRecovery.mockResolvedValue([]);
    mocks.repository.listRecoveredPlayers.mockResolvedValue([]);
  });

  it("clears expired injuries and writes a recovery history event", async () => {
    const recoveryCutoff = new Date("2026-09-15T12:00:00.000Z");
    mocks.repository.listRecoveredPlayers.mockResolvedValue([
      {
        id: "player-1",
        firstName: "Jordan",
        lastName: "Stone",
        rosterProfile: {
          teamId: "team-1",
        },
      },
    ]);

    await runWeeklyPreparation({
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 4,
      recoveryCutoff,
    });

    expect(mocks.repository.clearRecoveredPlayers).toHaveBeenCalledWith(
      "tx",
      "save-1",
      recoveryCutoff,
    );
    expect(mocks.createPlayerHistoryEvent).toHaveBeenCalledWith({
      tx: "tx",
      saveGameId: "save-1",
      playerId: "player-1",
      seasonId: "season-1",
      teamId: "team-1",
      type: PlayerHistoryEventType.RECOVERY,
      week: 4,
      occurredAt: recoveryCutoff,
      title: "Medizinisch freigegeben",
      description: "Jordan Stone ist wieder voll einsatzfaehig.",
    });
  });

  it("applies weekly condition recovery to active injury states", async () => {
    mocks.repository.listPlayersForWeeklyRecovery.mockResolvedValue([
      {
        id: "player-1",
        fatigue: 60,
        morale: 51,
        status: "INJURED",
        injuryStatus: "OUT",
      },
    ]);

    await runWeeklyPreparation({
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 4,
      recoveryCutoff: new Date("2026-09-15T12:00:00.000Z"),
    });

    expect(mocks.repository.updatePlayer).toHaveBeenCalledWith("tx", "player-1", {
      fatigue: 52,
      morale: 50,
    });
  });
});
