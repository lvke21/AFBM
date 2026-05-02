import { prisma } from "@/lib/db/prisma";

export const saveGameRepository = {
  listByUser(userId: string) {
    return prisma.saveGame.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      orderBy: { updatedAt: "desc" },
      include: {
        leagueDefinition: {
          select: {
            name: true,
          },
        },
        currentSeason: {
          select: {
            id: true,
            year: true,
            phase: true,
            week: true,
          },
        },
        _count: {
          select: {
            teams: true,
            players: true,
          },
        },
      },
    });
  },

  findByIdForUser(userId: string, saveGameId: string) {
    return prisma.saveGame.findFirst({
      where: {
        id: saveGameId,
        userId,
      },
      include: {
        leagueDefinition: {
          select: {
            name: true,
          },
        },
        currentSeason: {
          select: {
            id: true,
            year: true,
            phase: true,
            week: true,
          },
        },
        settings: true,
        seasons: {
          orderBy: [{ year: "desc" }],
          select: {
            id: true,
            year: true,
            phase: true,
            week: true,
            _count: {
              select: {
                matches: true,
              },
            },
          },
        },
        teams: {
          orderBy: [{ abbreviation: "asc" }],
          include: {
            conferenceDefinition: {
              select: {
                name: true,
              },
            },
            divisionDefinition: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                rosterProfiles: true,
              },
            },
            teamSeasonStats: {
              orderBy: [{ season: { year: "desc" } }],
              take: 1,
              select: {
                wins: true,
                losses: true,
                ties: true,
              },
            },
          },
        },
      },
    });
  },

  async archiveForUser(userId: string, saveGameId: string) {
    const result = await prisma.saveGame.updateMany({
      where: {
        id: saveGameId,
        userId,
        status: "ACTIVE",
      },
      data: {
        status: "ARCHIVED",
      },
    });

    return result.count > 0;
  },
};
