import { MatchKind, MatchStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const seasonSimulationCommandRepository = {
  runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(callback);
  },

  listRecoveredPlayers(saveGameId: string, recoveryCutoff: Date) {
    return prisma.player.findMany({
      where: {
        saveGameId,
        injuryEndsOn: {
          lte: recoveryCutoff,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rosterProfile: {
          select: {
            teamId: true,
          },
        },
      },
    });
  },

  clearRecoveredPlayers(
    tx: Prisma.TransactionClient,
    saveGameId: string,
    recoveryCutoff: Date,
  ) {
    return tx.player.updateMany({
      where: {
        saveGameId,
        injuryEndsOn: {
          lte: recoveryCutoff,
        },
      },
      data: {
        status: "ACTIVE",
        injuryStatus: "HEALTHY",
        injuryName: null,
        injuryEndsOn: null,
      },
    });
  },

  listPlayersForWeeklyRecovery(saveGameId: string) {
    return prisma.player.findMany({
      where: {
        saveGameId,
      },
      select: {
        id: true,
        fatigue: true,
        morale: true,
        status: true,
        injuryStatus: true,
      },
    });
  },

  updatePlayer(
    tx: Prisma.TransactionClient,
    playerId: string,
    data: Prisma.PlayerUpdateInput,
  ) {
    return tx.player.update({
      where: {
        id: playerId,
      },
      data,
    });
  },

  releaseStaleWeekSimulationLocks(
    tx: Prisma.TransactionClient,
    saveGameId: string,
    seasonId: string,
    week: number,
    staleBefore: Date,
  ) {
    return tx.match.updateMany({
      where: {
        saveGameId,
        seasonId,
        week,
        status: MatchStatus.IN_PROGRESS,
        updatedAt: {
          lt: staleBefore,
        },
      },
      data: {
        status: MatchStatus.SCHEDULED,
        simulationSeed: null,
        simulationStartedAt: null,
        simulationCompletedAt: null,
      },
    });
  },

  countWeekMatchesByStatus(
    tx: Prisma.TransactionClient,
    saveGameId: string,
    seasonId: string,
    week: number,
    status: MatchStatus,
  ) {
    return tx.match.count({
      where: {
        saveGameId,
        seasonId,
        week,
        status,
      },
    });
  },

  markWeekMatchesInProgress(
    tx: Prisma.TransactionClient,
    saveGameId: string,
    seasonId: string,
    week: number,
  ) {
    return tx.match.updateMany({
      where: {
        saveGameId,
        seasonId,
        week,
        status: MatchStatus.SCHEDULED,
      },
      data: {
        status: MatchStatus.IN_PROGRESS,
      },
    });
  },

  markMatchSimulationStarted(
    tx: Prisma.TransactionClient,
    matchId: string,
    simulationSeed: string,
    startedAt: Date,
  ) {
    return tx.match.update({
      where: {
        id: matchId,
      },
      data: {
        simulationSeed,
        simulationStartedAt: startedAt,
        simulationCompletedAt: null,
      },
    });
  },

  releaseWeekSimulationLock(
    saveGameId: string,
    seasonId: string,
    week: number,
  ) {
    return prisma.match.updateMany({
      where: {
        saveGameId,
        seasonId,
        week,
        status: MatchStatus.IN_PROGRESS,
      },
      data: {
        status: MatchStatus.SCHEDULED,
        simulationSeed: null,
        simulationStartedAt: null,
        simulationCompletedAt: null,
      },
    });
  },

  countPlayoffMatches(tx: Prisma.TransactionClient, seasonId: string, week: number) {
    return tx.match.count({
      where: {
        seasonId,
        week,
        kind: MatchKind.PLAYOFF,
      },
    });
  },

  listPlayoffStandings(tx: Prisma.TransactionClient, seasonId: string) {
    return tx.teamSeasonStat.findMany({
      where: {
        seasonId,
      },
      orderBy: [
        { wins: "desc" },
        { pointsFor: "desc" },
        { turnoversCommitted: "asc" },
      ],
      include: {
        team: {
          select: {
            id: true,
            city: true,
            nickname: true,
          },
        },
      },
      take: 4,
    });
  },

  listCompletedPlayoffMatches(
    tx: Prisma.TransactionClient,
    seasonId: string,
    week: number,
  ) {
    return tx.match.findMany({
      where: {
        seasonId,
        week,
        kind: MatchKind.PLAYOFF,
        status: MatchStatus.COMPLETED,
      },
      include: {
        homeTeam: {
          select: {
            id: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
          },
        },
      },
    });
  },

  listWinnerSeasonStats(
    tx: Prisma.TransactionClient,
    seasonId: string,
    teamIds: string[],
  ) {
    return tx.teamSeasonStat.findMany({
      where: {
        seasonId,
        teamId: {
          in: teamIds,
        },
      },
      orderBy: [{ wins: "desc" }, { pointsFor: "desc" }],
    });
  },

  createMatch(tx: Prisma.TransactionClient, data: Prisma.MatchUncheckedCreateInput) {
    return tx.match.create({
      data,
    });
  },

  updateMatchScore(
    tx: Prisma.TransactionClient,
    matchId: string,
    data: Pick<
      Prisma.MatchUncheckedUpdateInput,
      "status" | "homeScore" | "awayScore" | "simulationCompletedAt"
    >,
  ) {
    return tx.match.update({
      where: {
        id: matchId,
      },
      data,
    });
  },

  upsertTeamMatchStat(
    tx: Prisma.TransactionClient,
    data: Prisma.TeamMatchStatUncheckedCreateInput,
  ) {
    const { matchId, teamId, ...rest } = data;

    return tx.teamMatchStat.upsert({
      where: {
        matchId_teamId: {
          matchId,
          teamId,
        },
      },
      update: rest,
      create: data,
    });
  },

  updateTeamSeasonStat(
    tx: Prisma.TransactionClient,
    seasonId: string,
    teamId: string,
    data: Prisma.TeamSeasonStatUpdateInput,
  ) {
    return tx.teamSeasonStat.update({
      where: {
        seasonId_teamId: {
          seasonId,
          teamId,
        },
      },
      data,
    });
  },

  createPlayerMatchStat(
    tx: Prisma.TransactionClient,
    data: Prisma.PlayerMatchStatUncheckedCreateInput,
  ) {
    return tx.playerMatchStat.create({
      data,
    });
  },

  replaceMatchSimulationDrives(
    tx: Prisma.TransactionClient,
    matchId: string,
    saveGameId: string,
    drives: Prisma.MatchSimulationDriveUncheckedCreateInput[],
  ) {
    return tx.matchSimulationDrive.deleteMany({
      where: {
        matchId,
        saveGameId,
      },
    }).then(() => {
      if (drives.length === 0) {
        return { count: 0 };
      }

      return tx.matchSimulationDrive.createMany({
        data: drives,
      });
    });
  },

  updateSeason(
    tx: Prisma.TransactionClient,
    seasonId: string,
    data: Prisma.SeasonUpdateInput,
  ) {
    return tx.season.update({
      where: {
        id: seasonId,
      },
      data,
    });
  },

  touchSaveGame(tx: Prisma.TransactionClient, saveGameId: string) {
    return tx.saveGame.update({
      where: {
        id: saveGameId,
      },
      data: {
        updatedAt: new Date(),
      },
    });
  },
};
