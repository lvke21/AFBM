import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

function buildTeamDetailInclude(saveGameId: string, teamId: string) {
  return Prisma.validator<Prisma.TeamInclude>()({
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
    teamSeasonStats: {
      where: {
        season: {
          currentForSaveGame: {
            is: {
              id: saveGameId,
            },
          },
        },
      },
      take: 1,
      select: {
        wins: true,
        losses: true,
        ties: true,
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
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            age: true,
            yearsPro: true,
            heightCm: true,
            weightKg: true,
            status: true,
            injuryStatus: true,
            injuryName: true,
            morale: true,
            fatigue: true,
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
              select: {
                value: true,
                attributeDefinition: {
                  select: {
                    code: true,
                  },
                },
              },
            },
            contracts: {
              where: {
                status: "ACTIVE",
              },
              take: 1,
              orderBy: [
                {
                  signedAt: "desc",
                },
              ],
              select: {
                years: true,
                yearlySalary: true,
                signingBonus: true,
                capHit: true,
              },
            },
            playerSeasonStats: {
              where: {
                teamId,
                season: {
                  currentForSaveGame: {
                    is: {
                      id: saveGameId,
                    },
                  },
                },
              },
              take: 1,
              select: {
                gamesPlayed: true,
                passing: {
                  select: {
                    yards: true,
                    touchdowns: true,
                    interceptions: true,
                  },
                },
                rushing: {
                  select: {
                    yards: true,
                    touchdowns: true,
                  },
                },
                receiving: {
                  select: {
                    receptions: true,
                    yards: true,
                    touchdowns: true,
                  },
                },
                defensive: {
                  select: {
                    tackles: true,
                    sacks: true,
                    passesDefended: true,
                    interceptions: true,
                    targetsAllowed: true,
                    receptionsAllowed: true,
                    yardsAllowed: true,
                  },
                },
                kicking: {
                  select: {
                    fieldGoalsMade: true,
                    fieldGoalsAttempted: true,
                  },
                },
                punting: {
                  select: {
                    punts: true,
                    puntsInside20: true,
                  },
                },
                returns: {
                  select: {
                    kickReturnYards: true,
                    kickReturnTouchdowns: true,
                    kickReturnFumbles: true,
                    puntReturnYards: true,
                    puntReturnTouchdowns: true,
                    puntReturnFumbles: true,
                  },
                },
              },
            },
            historyEvents: {
              where: {
                type: "DEVELOPMENT",
              },
              orderBy: [
                {
                  week: "desc",
                },
                {
                  occurredAt: "desc",
                },
              ],
              take: 3,
              select: {
                id: true,
                type: true,
                week: true,
                title: true,
                description: true,
                occurredAt: true,
              },
            },
          },
        },
      },
    },
    financeEvents: {
      orderBy: [{ occurredAt: "desc" }],
      take: 8,
      select: {
        id: true,
        type: true,
        amount: true,
        capImpact: true,
        cashBalanceAfter: true,
        description: true,
        occurredAt: true,
        player: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    },
    playerHistoryEvents: {
      where: {
        type: {
          in: ["DEPTH_CHART", "SIGNING", "RELEASE"],
        },
      },
      orderBy: [{ occurredAt: "desc" }],
      take: 8,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        occurredAt: true,
        player: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    },
  });
}

type TeamDetailInclude = ReturnType<typeof buildTeamDetailInclude>;

export type TeamDetailRecord = Prisma.TeamGetPayload<{
  include: TeamDetailInclude;
}>;

export const teamRepository = {
  findBySaveGame(saveGameId: string, teamId: string) {
    return prisma.team.findFirst({
      where: {
        id: teamId,
        saveGameId,
      },
      include: buildTeamDetailInclude(saveGameId, teamId),
    });
  },

  findOwnedByUser(userId: string, saveGameId: string, teamId: string) {
    return prisma.team.findFirst({
      where: {
        id: teamId,
        saveGameId,
        saveGame: {
          userId,
        },
      },
      include: buildTeamDetailInclude(saveGameId, teamId),
    });
  },
};
