import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const playerDetailInclude = Prisma.validator<Prisma.PlayerInclude>()({
  saveGame: {
    select: {
      currentSeason: {
        select: {
          id: true,
          year: true,
        },
      },
    },
  },
  rosterProfile: {
    include: {
      team: {
        select: {
          id: true,
          city: true,
          nickname: true,
          abbreviation: true,
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
      primaryPosition: {
        select: {
          code: true,
          name: true,
        },
      },
      secondaryPosition: {
        select: {
          code: true,
          name: true,
        },
      },
      positionGroup: {
        select: {
          code: true,
          name: true,
        },
      },
      archetype: {
        select: {
          name: true,
        },
      },
      schemeFit: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
  evaluation: {
    select: {
      positionOverall: true,
      potentialRating: true,
      offensiveOverall: true,
      defensiveOverall: true,
      specialTeamsOverall: true,
      physicalOverall: true,
      mentalOverall: true,
    },
  },
  attributes: {
    orderBy: [{ attributeDefinition: { sortOrder: "asc" } }],
    select: {
      value: true,
      attributeDefinition: {
        select: {
          code: true,
          name: true,
          category: true,
          sortOrder: true,
          description: true,
        },
      },
    },
  },
  contracts: {
    where: {
      status: "ACTIVE",
    },
    orderBy: [{ signedAt: "desc" }],
    take: 1,
    select: {
      years: true,
      yearlySalary: true,
      signingBonus: true,
      capHit: true,
      signedAt: true,
    },
  },
  playerSeasonStats: {
    orderBy: [{ season: { year: "desc" } }, { gamesPlayed: "desc" }],
    include: {
      season: {
        select: {
          id: true,
          year: true,
        },
      },
      team: {
        select: {
          id: true,
          abbreviation: true,
          city: true,
          nickname: true,
        },
      },
      passing: true,
      rushing: true,
      receiving: true,
      blocking: true,
      defensive: true,
      kicking: true,
      punting: true,
      returns: true,
    },
  },
  historyEvents: {
    orderBy: [{ occurredAt: "desc" }],
    take: 12,
    select: {
      id: true,
      type: true,
      week: true,
      title: true,
      description: true,
      occurredAt: true,
    },
  },
  careerStat: {
    include: {
      passing: true,
      rushing: true,
      receiving: true,
      blocking: true,
      defensive: true,
      kicking: true,
      punting: true,
      returns: true,
    },
  },
});

export type PlayerDetailRecord = Prisma.PlayerGetPayload<{
  include: typeof playerDetailInclude;
}>;

export const playerRepository = {
  findBySaveGame(saveGameId: string, playerId: string) {
    return prisma.player.findFirst({
      where: {
        id: playerId,
        saveGameId,
      },
      include: playerDetailInclude,
    });
  },

  findOwnedByUser(userId: string, saveGameId: string, playerId: string) {
    return prisma.player.findFirst({
      where: {
        id: playerId,
        saveGameId,
        saveGame: {
          userId,
        },
      },
      include: playerDetailInclude,
    });
  },
};
