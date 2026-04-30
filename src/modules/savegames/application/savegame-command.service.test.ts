import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    saveGame: {
      create: vi.fn(),
      update: vi.fn(),
    },
    saveGameSetting: {
      create: vi.fn(),
    },
    season: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      $transaction: vi.fn(),
    },
    requireDefaultLeagueDefinition: vi.fn(),
    bootstrapSaveGameWorld: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/modules/shared/infrastructure/reference-data", () => ({
  requireDefaultLeagueDefinition: mocks.requireDefaultLeagueDefinition,
}));

vi.mock("./bootstrap/bootstrap-savegame-world.service", () => ({
  bootstrapSaveGameWorld: mocks.bootstrapSaveGameWorld,
}));

import { createSaveGame } from "./savegame-command.service";

const ORIGINAL_ENV = { ...process.env };

describe("createSaveGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      DATA_BACKEND: "prisma",
      DATABASE_URL: "postgresql://localhost:5432/afbm_test",
    };

    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx as never),
    );
    mocks.requireDefaultLeagueDefinition.mockResolvedValue({
      id: "league-1",
    });
    mocks.tx.saveGame.create.mockResolvedValue({
      id: "save-1",
    });
    mocks.tx.season.create.mockResolvedValue({
      id: "season-1",
      year: 2026,
      phase: "REGULAR_SEASON",
      week: 1,
      startsAt: new Date("2026-09-01T18:00:00.000Z"),
    });
    mocks.tx.saveGame.update.mockResolvedValue({});
    mocks.tx.saveGameSetting.create.mockResolvedValue({});
    mocks.bootstrapSaveGameWorld.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("creates a regular-season savegame and boots the world", async () => {
    const currentYear = new Date().getUTCFullYear();

    const result = await createSaveGame({
      userId: "user-1",
      name: "Test Save",
      managerTeamAbbreviation: "BOS",
    });

    expect(mocks.tx.season.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        saveGameId: "save-1",
        phase: "REGULAR_SEASON",
        week: 1,
        startsAt: new Date(Date.UTC(currentYear, 8, 1, 18, 0, 0)),
      }),
    });
    expect(mocks.bootstrapSaveGameWorld).toHaveBeenCalledWith(
      expect.objectContaining({
        saveGameId: "save-1",
        leagueDefinitionId: "league-1",
        managerTeamAbbreviation: "BOS",
      }),
    );
    expect(result).toEqual({
      id: "save-1",
      currentSeasonId: "season-1",
    });
  });

  it("does not initialize Prisma when DATA_BACKEND=firestore", async () => {
    process.env.DATA_BACKEND = "firestore";
    delete process.env.DATABASE_URL;

    await expect(
      createSaveGame({
        userId: "user-1",
        name: "Firestore Save",
        managerTeamAbbreviation: "BOS",
      }),
    ).rejects.toThrow("Firestore-Staging");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
