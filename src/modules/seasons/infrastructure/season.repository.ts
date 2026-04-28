import { prisma } from "@/lib/db/prisma";

export const seasonRepository = {
  findBySaveGame(saveGameId: string, seasonId: string) {
    return prisma.season.findFirst({
      where: {
        id: seasonId,
        saveGameId,
      },
      include: {
        teamSeasonStats: {
          orderBy: [{ wins: "desc" }, { pointsFor: "desc" }],
          include: {
            team: {
              select: {
                id: true,
                city: true,
                nickname: true,
                abbreviation: true,
                overallRating: true,
              },
            },
          },
        },
        matches: {
          orderBy: [{ week: "asc" }, { scheduledAt: "asc" }],
          include: {
            homeTeam: {
              select: {
                id: true,
                city: true,
                nickname: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                city: true,
                nickname: true,
              },
            },
          },
        },
      },
    });
  },

  findOwnedByUser(userId: string, saveGameId: string, seasonId: string) {
    return prisma.season.findFirst({
      where: {
        id: seasonId,
        saveGameId,
        saveGame: {
          userId,
        },
      },
      include: {
        teamSeasonStats: {
          orderBy: [{ wins: "desc" }, { pointsFor: "desc" }],
          include: {
            team: {
              select: {
                id: true,
                city: true,
                nickname: true,
                abbreviation: true,
                overallRating: true,
              },
            },
          },
        },
        matches: {
          orderBy: [{ week: "asc" }, { scheduledAt: "asc" }],
          include: {
            homeTeam: {
              select: {
                id: true,
                city: true,
                nickname: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                city: true,
                nickname: true,
              },
            },
          },
        },
      },
    });
  },
};
