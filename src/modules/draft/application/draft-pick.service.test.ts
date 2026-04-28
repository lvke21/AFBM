import { beforeEach, describe, expect, it, vi } from "vitest";

import { DraftClassStatus, DraftPlayerStatus } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    draftPlayer: {
      findFirst: vi.fn(),
    },
    saveGame: {
      findFirst: vi.fn(),
    },
  },
  tx: {
    draftPlayer: {
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { pickDraftPlayerForUser } from "./draft-pick.service";

const saveGameRecord = {
  currentSeasonId: "season-1",
  id: "save-1",
  teams: [
    {
      id: "team-1",
    },
  ],
};

const prospectRecord = {
  draftClassId: "draft-class-1",
  draftClass: {
    seasonId: "season-1",
    status: DraftClassStatus.ACTIVE,
  },
  firstName: "Cole",
  id: "draft-player-1",
  lastName: "Harrison",
  projectedRound: 1,
  status: DraftPlayerStatus.AVAILABLE,
};

describe("pickDraftPlayerForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.saveGame.findFirst.mockResolvedValue(saveGameRecord);
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue(prospectRecord);
    mocks.tx.draftPlayer.count.mockResolvedValue(2);
    mocks.tx.draftPlayer.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.$transaction.mockImplementation((callback) => callback(mocks.tx));
  });

  it("marks an available prospect as drafted by the manager team", async () => {
    const result = await pickDraftPlayerForUser({
      userId: "user-1",
      saveGameId: "save-1",
      draftPlayerId: "draft-player-1",
    });

    expect(result).toEqual({
      draftPlayerId: "draft-player-1",
      pickNumber: 3,
      prospectName: "Cole Harrison",
      round: 1,
      teamId: "team-1",
    });
    expect(mocks.tx.draftPlayer.updateMany).toHaveBeenCalledWith({
      where: {
        id: "draft-player-1",
        saveGameId: "save-1",
        status: DraftPlayerStatus.AVAILABLE,
      },
      data: {
        draftedByTeamId: "team-1",
        draftedPickNumber: 3,
        draftedRound: 1,
        status: DraftPlayerStatus.DRAFTED,
      },
    });
  });

  it("blocks prospects that are already drafted", async () => {
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue({
      ...prospectRecord,
      status: DraftPlayerStatus.DRAFTED,
    });

    await expect(
      pickDraftPlayerForUser({
        userId: "user-1",
        saveGameId: "save-1",
        draftPlayerId: "draft-player-1",
      }),
    ).rejects.toThrow("Draft prospect is no longer available");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.draftPlayer.updateMany).not.toHaveBeenCalled();
  });

  it("blocks picks before the draft class is active", async () => {
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue({
      ...prospectRecord,
      draftClass: {
        ...prospectRecord.draftClass,
        status: DraftClassStatus.UPCOMING,
      },
    });

    await expect(
      pickDraftPlayerForUser({
        userId: "user-1",
        saveGameId: "save-1",
        draftPlayerId: "draft-player-1",
      }),
    ).rejects.toThrow("Draft class is not active for picks");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks picks from draft classes outside the active season", async () => {
    mocks.prisma.draftPlayer.findFirst.mockResolvedValue({
      ...prospectRecord,
      draftClass: {
        seasonId: "season-2",
        status: DraftClassStatus.ACTIVE,
      },
    });

    await expect(
      pickDraftPlayerForUser({
        userId: "user-1",
        saveGameId: "save-1",
        draftPlayerId: "draft-player-1",
      }),
    ).rejects.toThrow("Draft class does not belong to the active season");

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects picks without a manager team context", async () => {
    mocks.prisma.saveGame.findFirst.mockResolvedValue({
      id: "save-1",
      teams: [],
    });

    await expect(
      pickDraftPlayerForUser({
        userId: "other-user",
        saveGameId: "save-1",
        draftPlayerId: "draft-player-1",
      }),
    ).rejects.toThrow("Managed team context is incomplete");

    expect(mocks.prisma.draftPlayer.findFirst).not.toHaveBeenCalled();
  });
});
