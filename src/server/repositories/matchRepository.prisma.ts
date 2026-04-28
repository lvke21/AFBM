import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const matchDetailInclude = Prisma.validator<Prisma.MatchInclude>()({
  homeTeam: {
    select: {
      id: true,
      city: true,
      nickname: true,
      abbreviation: true,
      managerControlled: true,
      overallRating: true,
      morale: true,
      offenseXFactorPlan: true,
      defenseXFactorPlan: true,
      offensiveSchemeFit: {
        select: {
          code: true,
          name: true,
        },
      },
      defensiveSchemeFit: {
        select: {
          code: true,
          name: true,
        },
      },
      specialTeamsSchemeFit: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
  awayTeam: {
    select: {
      id: true,
      city: true,
      nickname: true,
      abbreviation: true,
      managerControlled: true,
      overallRating: true,
      morale: true,
      offenseXFactorPlan: true,
      defenseXFactorPlan: true,
      offensiveSchemeFit: {
        select: {
          code: true,
          name: true,
        },
      },
      defensiveSchemeFit: {
        select: {
          code: true,
          name: true,
        },
      },
      specialTeamsSchemeFit: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
  teamMatchStats: true,
  simulationDrives: {
    orderBy: {
      sequence: "asc",
    },
  },
  playerMatchStats: {
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rosterProfile: {
            select: {
              primaryPosition: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
      passing: true,
      rushing: true,
      receiving: true,
      defensive: true,
      kicking: true,
      punting: true,
      returns: true,
    },
  },
});

export type MatchDetailRecord = Prisma.MatchGetPayload<{
  include: typeof matchDetailInclude;
}>;

export const matchRepositoryPrisma = {
  findDetailForUser(userId: string, saveGameId: string, matchId: string) {
    return prisma.match.findFirst({
      where: {
        id: matchId,
        saveGameId,
        saveGame: {
          userId,
        },
      },
      include: matchDetailInclude,
    });
  },
};
