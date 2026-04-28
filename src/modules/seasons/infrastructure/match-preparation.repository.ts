import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const matchPreparationRepository = {
  findMatchPreparationContext(userId: string, saveGameId: string, matchId: string) {
    return prisma.match.findFirst({
      where: {
        id: matchId,
        saveGameId,
        saveGame: {
          userId,
        },
      },
      select: {
        id: true,
        status: true,
        homeTeam: {
          select: {
            id: true,
            managerControlled: true,
            offenseXFactorPlan: true,
            defenseXFactorPlan: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            managerControlled: true,
            offenseXFactorPlan: true,
            defenseXFactorPlan: true,
          },
        },
      },
    });
  },

  updateTeamXFactorPlan(
    teamId: string,
    input: {
      offenseXFactorPlan: Prisma.InputJsonValue;
      defenseXFactorPlan: Prisma.InputJsonValue;
    },
  ) {
    return prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        offenseXFactorPlan: input.offenseXFactorPlan,
        defenseXFactorPlan: input.defenseXFactorPlan,
      },
    });
  },
};
