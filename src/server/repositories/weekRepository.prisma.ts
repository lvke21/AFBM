import { prisma } from "@/lib/db/prisma";

export const weekRepositoryPrisma = {
  async findBySaveGame(saveGameId: string, weekId: string) {
    const season = await prisma.season.findFirst({
      where: {
        saveGameId,
      },
      orderBy: {
        year: "desc",
      },
      select: {
        id: true,
        saveGameId: true,
        week: true,
        saveGame: {
          select: {
            weekState: true,
          },
        },
      },
    });

    if (!season) {
      return null;
    }

    const expectedWeekId = `${saveGameId}_${season.id}_w${season.week}`;

    return weekId === expectedWeekId
      ? {
          id: expectedWeekId,
          leagueId: saveGameId,
          seasonId: season.id,
          weekNumber: season.week,
          state: season.saveGame.weekState,
        }
      : null;
  },

  async findOwnedByUser(userId: string, saveGameId: string, weekId: string) {
    const saveGame = await prisma.saveGame.findFirst({
      where: {
        id: saveGameId,
        userId,
      },
      select: {
        id: true,
      },
    });

    return saveGame ? this.findBySaveGame(saveGameId, weekId) : null;
  },

  async findCurrentBySaveGame(saveGameId: string) {
    const saveGame = await prisma.saveGame.findFirst({
      where: {
        id: saveGameId,
      },
      select: {
        id: true,
        weekState: true,
        currentSeason: {
          select: {
            id: true,
            week: true,
          },
        },
      },
    });

    return saveGame?.currentSeason
      ? {
          id: `${saveGame.id}_${saveGame.currentSeason.id}_w${saveGame.currentSeason.week}`,
          leagueId: saveGame.id,
          seasonId: saveGame.currentSeason.id,
          weekNumber: saveGame.currentSeason.week,
          state: saveGame.weekState,
        }
      : null;
  },
};
