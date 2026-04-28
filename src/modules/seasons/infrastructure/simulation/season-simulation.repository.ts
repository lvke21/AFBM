import { MatchStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

function teamSimulationSelect(seasonId: string) {
  return {
    select: {
      id: true,
      city: true,
      nickname: true,
      abbreviation: true,
      overallRating: true,
      offenseXFactorPlan: true,
      defenseXFactorPlan: true,
      rosterProfiles: {
        where: {
          teamId: {
            not: null,
          },
        },
        select: {
          rosterStatus: true,
          depthChartSlot: true,
          captainFlag: true,
          developmentFocus: true,
          injuryRisk: true,
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
              id: true,
              firstName: true,
              lastName: true,
              age: true,
              developmentTrait: true,
              status: true,
              injuryStatus: true,
              injuryName: true,
              injuryEndsOn: true,
              fatigue: true,
              morale: true,
              evaluation: {
                select: {
                  potentialRating: true,
                  positionOverall: true,
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
              careerStat: {
                select: {
                  id: true,
                  passing: {
                    select: {
                      longestCompletion: true,
                    },
                  },
                  rushing: {
                    select: {
                      longestRush: true,
                    },
                  },
                  receiving: {
                    select: {
                      longestReception: true,
                    },
                  },
                  kicking: {
                    select: {
                      longestFieldGoal: true,
                    },
                  },
                  punting: {
                    select: {
                      longestPunt: true,
                    },
                  },
                },
              },
              playerSeasonStats: {
                where: {
                  seasonId,
                },
                select: {
                  id: true,
                  teamId: true,
                  passing: {
                    select: {
                      longestCompletion: true,
                    },
                  },
                  rushing: {
                    select: {
                      longestRush: true,
                    },
                  },
                  receiving: {
                    select: {
                      longestReception: true,
                    },
                  },
                  kicking: {
                    select: {
                      longestFieldGoal: true,
                    },
                  },
                  punting: {
                    select: {
                      longestPunt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  } as const;
}

export const seasonSimulationRepository = {
  findSeasonHeaderForUser(userId: string, saveGameId: string, seasonId: string) {
    return prisma.season.findFirst({
      where: {
        id: seasonId,
        saveGameId,
        saveGame: {
          userId,
        },
      },
      select: {
        id: true,
        saveGameId: true,
        year: true,
        phase: true,
        week: true,
        saveGame: {
          select: {
            currentSeasonId: true,
            settings: {
              select: {
                seasonLengthWeeks: true,
              },
            },
          },
        },
      },
    });
  },

  listWeekMatchesForSimulation(
    saveGameId: string,
    seasonId: string,
    week: number,
    statuses: MatchStatus[] = [MatchStatus.SCHEDULED],
  ) {
    return prisma.match.findMany({
      where: {
        saveGameId,
        seasonId,
        week,
        status: {
          in: statuses,
        },
      },
      orderBy: [{ scheduledAt: "asc" }],
      select: {
        id: true,
        saveGameId: true,
        seasonId: true,
        week: true,
        kind: true,
        status: true,
        simulationSeed: true,
        scheduledAt: true,
        homeTeam: teamSimulationSelect(seasonId),
        awayTeam: teamSimulationSelect(seasonId),
      },
    });
  },
};
