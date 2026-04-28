import {
  ContractStatus,
  PlayerStatus,
  Prisma,
  RosterStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import { countsTowardActiveRosterLimit } from "../../shared/domain/roster-status";

export const teamManagementRepository = {
  findManagedTeamContext(userId: string, saveGameId: string, teamId: string) {
    return prisma.saveGame.findFirst({
      where: {
        id: saveGameId,
        userId,
      },
      select: {
        id: true,
        currentSeasonId: true,
        settings: {
          select: {
            salaryCap: true,
            activeRosterLimit: true,
            practiceSquadSize: true,
          },
        },
        teams: {
          where: {
            id: teamId,
          },
          select: {
            id: true,
            abbreviation: true,
            city: true,
            nickname: true,
            managerControlled: true,
            salaryCapSpace: true,
            cashBalance: true,
            offensiveSchemeFit: {
              select: {
                code: true,
              },
            },
            defensiveSchemeFit: {
              select: {
                code: true,
              },
            },
            specialTeamsSchemeFit: {
              select: {
                code: true,
              },
            },
          },
          take: 1,
        },
      },
    });
  },

  findSchemeDefinitionByGroup(groupCode: string, code: string) {
    return prisma.schemeFitDefinition.findFirst({
      where: {
        code,
        positionGroup: {
          code: groupCode,
        },
      },
      select: {
        code: true,
        id: true,
        name: true,
      },
    });
  },

  findPositionIdByCode(code: string) {
    return prisma.positionDefinition.findFirst({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });
  },

  findRosterAssignmentRecord(saveGameId: string, teamId: string, playerId: string) {
    return prisma.playerRosterProfile.findFirst({
      where: {
        saveGameId,
        teamId,
        playerId,
      },
      select: {
        rosterStatus: true,
        primaryPosition: {
          select: {
            code: true,
          },
        },
        secondaryPosition: {
          select: {
            code: true,
          },
        },
        player: {
          select: {
            firstName: true,
            lastName: true,
            evaluation: {
              select: {
                positionOverall: true,
              },
            },
            injuryStatus: true,
          },
        },
      },
    });
  },

  listRosterAssignments(saveGameId: string, teamId: string) {
    return prisma.playerRosterProfile.findMany({
      where: {
        saveGameId,
        teamId,
      },
      select: {
        playerId: true,
        rosterStatus: true,
        depthChartSlot: true,
        primaryPosition: {
          select: {
            code: true,
          },
        },
        player: {
          select: {
            firstName: true,
            lastName: true,
            evaluation: {
              select: {
                positionOverall: true,
              },
            },
          },
        },
      },
    });
  },

  findManagedPlayerForRelease(saveGameId: string, teamId: string, playerId: string) {
    return prisma.player.findFirst({
      where: {
        id: playerId,
        saveGameId,
        rosterProfile: {
          is: {
            teamId,
          },
        },
      },
      include: {
        rosterProfile: true,
        evaluation: {
          select: {
            positionOverall: true,
          },
        },
        contracts: {
          where: {
            teamId,
            status: ContractStatus.ACTIVE,
          },
          take: 1,
          orderBy: {
            signedAt: "desc",
          },
          select: {
            id: true,
            years: true,
            yearlySalary: true,
            capHit: true,
            signingBonus: true,
          },
        },
      },
    });
  },

  findManagedPlayerForContractAction(saveGameId: string, teamId: string, playerId: string) {
    return prisma.player.findFirst({
      where: {
        id: playerId,
        saveGameId,
        rosterProfile: {
          is: {
            teamId,
          },
        },
      },
      include: {
        rosterProfile: {
          include: {
            primaryPosition: {
              select: {
                code: true,
              },
            },
          },
        },
        evaluation: {
          select: {
            positionOverall: true,
          },
        },
        contracts: {
          where: {
            teamId,
            status: ContractStatus.ACTIVE,
          },
          take: 1,
          orderBy: {
            signedAt: "desc",
          },
          select: {
            id: true,
            years: true,
            yearlySalary: true,
            signingBonus: true,
            capHit: true,
          },
        },
      },
    });
  },

  findFreeAgentForSigning(
    saveGameId: string,
    currentSeasonId: string,
    teamId: string,
    playerId: string,
  ) {
    return prisma.player.findFirst({
      where: {
        id: playerId,
        saveGameId,
        OR: [
          {
            status: PlayerStatus.FREE_AGENT,
          },
          {
            rosterProfile: {
              is: {
                teamId: null,
              },
            },
          },
        ],
      },
      include: {
        rosterProfile: {
          select: {
            practiceSquadEligible: true,
            primaryPositionDefinitionId: true,
            primaryPosition: {
              select: {
                code: true,
                name: true,
              },
            },
            secondaryPosition: {
              select: {
                code: true,
              },
            },
          },
        },
        evaluation: {
          select: {
            positionOverall: true,
            potentialRating: true,
          },
        },
        playerSeasonStats: {
          where: {
            seasonId: currentSeasonId,
            teamId,
          },
          select: {
            id: true,
            seasonId: true,
            teamId: true,
          },
        },
      },
    });
  },

  findFreeAgentMarketRecord(userId: string, saveGameId: string) {
    return prisma.saveGame.findFirst({
      where: {
        id: saveGameId,
        userId,
      },
      select: {
        settings: {
          select: {
            activeRosterLimit: true,
            practiceSquadSize: true,
          },
        },
        teams: {
          where: {
            managerControlled: true,
          },
          take: 1,
          include: {
            offensiveSchemeFit: {
              select: {
                code: true,
              },
            },
            defensiveSchemeFit: {
              select: {
                code: true,
              },
            },
            specialTeamsSchemeFit: {
              select: {
                code: true,
              },
            },
            rosterProfiles: {
              include: {
                primaryPosition: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                positionGroup: {
                  select: {
                    code: true,
                  },
                },
                schemeFit: {
                  select: {
                    code: true,
                  },
                },
                player: {
                  select: {
                    evaluation: {
                      select: {
                        positionOverall: true,
                      },
                    },
                    attributes: {
                      select: {
                        value: true,
                        attributeDefinition: {
                          select: {
                            code: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        players: {
          where: {
            OR: [
              {
                status: PlayerStatus.FREE_AGENT,
              },
              {
                rosterProfile: {
                  is: {
                    teamId: null,
                  },
                },
              },
            ],
          },
          include: {
            rosterProfile: {
              include: {
                primaryPosition: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                positionGroup: {
                  select: {
                    code: true,
                  },
                },
                secondaryPosition: {
                  select: {
                    code: true,
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
                physicalOverall: true,
                mentalOverall: true,
              },
            },
            attributes: {
              select: {
                value: true,
                attributeDefinition: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  findTradeMarketRecord(userId: string, saveGameId: string) {
    return prisma.saveGame.findFirst({
      where: {
        id: saveGameId,
        userId,
      },
      select: {
        currentSeasonId: true,
        settings: {
          select: {
            activeRosterLimit: true,
          },
        },
        teams: {
          select: {
            id: true,
            abbreviation: true,
            city: true,
            nickname: true,
            managerControlled: true,
            salaryCapSpace: true,
            rosterProfiles: {
              where: {
                teamId: {
                  not: null,
                },
              },
              include: {
                primaryPosition: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                schemeFit: {
                  select: {
                    name: true,
                  },
                },
                player: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    age: true,
                    injuryStatus: true,
                    evaluation: {
                      select: {
                        positionOverall: true,
                        potentialRating: true,
                      },
                    },
                    contracts: {
                      where: {
                        status: ContractStatus.ACTIVE,
                      },
                      take: 1,
                      orderBy: {
                        signedAt: "desc",
                      },
                      select: {
                        id: true,
                        capHit: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  findTradePlayerForExecution(saveGameId: string, playerId: string) {
    return prisma.player.findFirst({
      where: {
        id: playerId,
        saveGameId,
        rosterProfile: {
          is: {
            teamId: {
              not: null,
            },
          },
        },
      },
      include: {
        rosterProfile: true,
        contracts: {
          where: {
            status: ContractStatus.ACTIVE,
          },
          take: 1,
          orderBy: {
            signedAt: "desc",
          },
          select: {
            id: true,
          },
        },
      },
    });
  },

  updateTeamSchemeIds(
    teamId: string,
    input: {
      offensiveSchemeFitDefinitionId: string;
      defensiveSchemeFitDefinitionId: string;
      specialTeamsSchemeFitDefinitionId: string;
    },
  ) {
    return prisma.team.update({
      where: {
        id: teamId,
      },
      data: input,
    });
  },

  runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(callback);
  },

  async countRosterUsage(
    tx: Prisma.TransactionClient,
    saveGameId: string,
    teamId: string,
  ) {
    const rosterProfiles = await tx.playerRosterProfile.findMany({
      where: {
        saveGameId,
        teamId,
      },
      select: {
        practiceSquadEligible: true,
        rosterStatus: true,
        primaryPosition: {
          select: {
            code: true,
            name: true,
          },
        },
        player: {
          select: {
            evaluation: {
              select: {
                positionOverall: true,
              },
            },
          },
        },
      },
    });

    const activeRosterCount = rosterProfiles.filter((profile) =>
      countsTowardActiveRosterLimit(profile.rosterStatus),
    ).length;
    const practiceSquadCount = rosterProfiles.filter(
      (profile) => profile.rosterStatus === RosterStatus.PRACTICE_SQUAD,
    ).length;

    return {
      activeRosterCount,
      practiceSquadCount,
      rosterProfiles,
    };
  },

  async findNextDepthSlot(
    tx: Prisma.TransactionClient,
    saveGameId: string,
    teamId: string,
    primaryPositionDefinitionId: string,
  ) {
    return (
      (
        await tx.playerRosterProfile.aggregate({
          where: {
            saveGameId,
            teamId,
            primaryPositionDefinitionId,
          },
          _max: {
            depthChartSlot: true,
          },
        })
      )._max.depthChartSlot ?? 0
    );
  },

  updateRosterProfile(
    tx: Prisma.TransactionClient,
    playerId: string,
    saveGameId: string,
    data: Prisma.PlayerRosterProfileUncheckedUpdateInput,
  ) {
    return tx.playerRosterProfile.update({
      where: {
        playerId_saveGameId: {
          playerId,
          saveGameId,
        },
      },
      data,
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

  updateContract(
    tx: Prisma.TransactionClient,
    contractId: string,
    data: Prisma.ContractUpdateInput,
  ) {
    return tx.contract.update({
      where: {
        id: contractId,
      },
      data,
    });
  },

  updateActiveContractTeam(
    tx: Prisma.TransactionClient,
    contractId: string,
    teamId: string,
  ) {
    return tx.contract.update({
      where: {
        id: contractId,
      },
      data: {
        teamId,
      },
    });
  },

  createContract(tx: Prisma.TransactionClient, data: Prisma.ContractUncheckedCreateInput) {
    return tx.contract.create({
      data,
    });
  },

  createRosterTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.RosterTransactionUncheckedCreateInput,
  ) {
    return tx.rosterTransaction.create({
      data,
    });
  },
};
