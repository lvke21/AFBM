import { prisma } from "@/lib/db/prisma";
import { DraftClassStatus, DraftPlayerStatus } from "@/modules/shared/domain/enums";

export type PickDraftPlayerResult = {
  draftPlayerId: string;
  pickNumber: number;
  prospectName: string;
  round: number;
  teamId: string;
};

export async function pickDraftPlayerForUser(input: {
  draftPlayerId: string;
  saveGameId: string;
  userId: string;
}): Promise<PickDraftPlayerResult> {
  const saveGame = await prisma.saveGame.findFirst({
    where: {
      id: input.saveGameId,
      userId: input.userId,
    },
    select: {
      id: true,
      currentSeasonId: true,
      teams: {
        where: {
          managerControlled: true,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!saveGame?.teams[0]) {
    throw new Error("Managed team context is incomplete");
  }

  const managerTeamId = saveGame.teams[0].id;
  const prospect = await prisma.draftPlayer.findFirst({
    where: {
      id: input.draftPlayerId,
      saveGameId: input.saveGameId,
    },
    select: {
      draftClassId: true,
      draftClass: {
        select: {
          seasonId: true,
          status: true,
        },
      },
      firstName: true,
      id: true,
      lastName: true,
      projectedRound: true,
      status: true,
    },
  });

  if (!prospect) {
    throw new Error("Draft prospect not found");
  }

  if (prospect.status !== DraftPlayerStatus.AVAILABLE) {
    throw new Error("Draft prospect is no longer available");
  }

  if (prospect.draftClass.status !== DraftClassStatus.ACTIVE) {
    throw new Error("Draft class is not active for picks");
  }

  if (
    prospect.draftClass.seasonId &&
    prospect.draftClass.seasonId !== saveGame.currentSeasonId
  ) {
    throw new Error("Draft class does not belong to the active season");
  }

  return prisma.$transaction(async (tx) => {
    const draftedCount = await tx.draftPlayer.count({
      where: {
        draftClassId: prospect.draftClassId,
        saveGameId: input.saveGameId,
        status: DraftPlayerStatus.DRAFTED,
      },
    });
    const pickNumber = draftedCount + 1;
    const updated = await tx.draftPlayer.updateMany({
      where: {
        id: prospect.id,
        saveGameId: input.saveGameId,
        status: DraftPlayerStatus.AVAILABLE,
      },
      data: {
        draftedByTeamId: managerTeamId,
        draftedPickNumber: pickNumber,
        draftedRound: prospect.projectedRound,
        status: DraftPlayerStatus.DRAFTED,
      },
    });

    if (updated.count !== 1) {
      throw new Error("Draft prospect is no longer available");
    }

    return {
      draftPlayerId: prospect.id,
      pickNumber,
      prospectName: `${prospect.firstName} ${prospect.lastName}`,
      round: prospect.projectedRound,
      teamId: managerTeamId,
    };
  });
}
