import { beforeEach, describe, expect, it, vi } from "vitest";

import { DraftClassStatus, ScoutingLevel } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => ({
  prisma: {
    draftPlayer: {
      findFirst: vi.fn(),
    },
    saveGame: {
      findFirst: vi.fn(),
    },
    scoutingData: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { scoutProspectForUser } from "./scouting-command.service";

const saveGameRecord = {
  currentSeasonId: "season-1",
  id: "save-1",
  teams: [
    {
      id: "team-1",
    },
  ],
};

function prospectRecord(level: ScoutingLevel | null = ScoutingLevel.NONE) {
  return {
    id: "draft-player-1",
    draftClassId: "draft-class-1",
    draftClass: {
      seasonId: "season-1",
      status: DraftClassStatus.UPCOMING,
    },
    firstName: "Cole",
    lastName: "Harrison",
    position: {
      code: "QB",
    },
    scoutingData:
      level == null
        ? []
        : [
            {
              level,
              strengths: ["Arm talent"],
              weaknesses: [],
            },
          ],
    trueOverall: 72,
    truePotential: 88,
  };
}

describe("scoutProspectForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.saveGame.findFirst.mockResolvedValue(saveGameRecord);
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue(prospectRecord());
    mocks.prisma.scoutingData.upsert.mockResolvedValue({});
  });

  it("progresses manager scouting from NONE to BASIC", async () => {
    const result = await scoutProspectForUser({
      userId: "user-1",
      saveGameId: "save-1",
      draftPlayerId: "draft-player-1",
    });

    expect(result).toEqual({
      changed: true,
      draftPlayerId: "draft-player-1",
      nextLevel: ScoutingLevel.BASIC,
      previousLevel: ScoutingLevel.NONE,
      prospectName: "Cole Harrison",
    });
    expect(mocks.prisma.scoutingData.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          draftPlayerId_teamId: {
            draftPlayerId: "draft-player-1",
            teamId: "team-1",
          },
        },
        update: expect.objectContaining({
          level: ScoutingLevel.BASIC,
          visibleOverallMin: 67,
          visibleOverallMax: 77,
          visiblePotentialMin: 83,
          visiblePotentialMax: 93,
        }),
      }),
    );
  });

  it("progresses BASIC to FOCUSED with tighter ranges", async () => {
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue(
      prospectRecord(ScoutingLevel.BASIC),
    );

    await scoutProspectForUser({
      userId: "user-1",
      saveGameId: "save-1",
      draftPlayerId: "draft-player-1",
    });

    expect(mocks.prisma.scoutingData.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          level: ScoutingLevel.FOCUSED,
          visibleOverallMin: 70,
          visibleOverallMax: 74,
          visiblePotentialMin: 86,
          visiblePotentialMax: 90,
        }),
      }),
    );
  });

  it("rejects scouting when the savegame is not owned by the user", async () => {
    mocks.prisma.saveGame.findFirst.mockResolvedValue(null);

    await expect(
      scoutProspectForUser({
        userId: "other-user",
        saveGameId: "save-1",
        draftPlayerId: "draft-player-1",
      }),
    ).rejects.toThrow("Managed team context is incomplete");

    expect(mocks.prisma.scoutingData.upsert).not.toHaveBeenCalled();
  });

  it("rejects scouting after the draft class is completed", async () => {
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue({
      ...prospectRecord(),
      draftClass: {
        seasonId: "season-1",
        status: DraftClassStatus.COMPLETED,
      },
    });

    await expect(
      scoutProspectForUser({
        userId: "user-1",
        saveGameId: "save-1",
        draftPlayerId: "draft-player-1",
      }),
    ).rejects.toThrow("Draft class is closed for scouting");

    expect(mocks.prisma.scoutingData.upsert).not.toHaveBeenCalled();
  });

  it("rejects scouting outside the active season", async () => {
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue({
      ...prospectRecord(),
      draftClass: {
        seasonId: "season-2",
        status: DraftClassStatus.UPCOMING,
      },
    });

    await expect(
      scoutProspectForUser({
        userId: "user-1",
        saveGameId: "save-1",
        draftPlayerId: "draft-player-1",
      }),
    ).rejects.toThrow("Draft class does not belong to the active season");

    expect(mocks.prisma.scoutingData.upsert).not.toHaveBeenCalled();
  });
});
