import { prisma } from "@/lib/db/prisma";
import { createPlayerHistoryEvent } from "@/modules/players/application/player-history.service";
import { createSeasonStatShells } from "@/modules/savegames/application/bootstrap/player-stat-shells";
import { buildDoubleRoundRobinSchedule } from "@/modules/savegames/application/bootstrap/double-round-robin-schedule";
import { recalculateTeamState } from "@/modules/seasons/application/simulation/player-development";
import {
  ContractStatus,
  PlayerHistoryEventType,
  PlayerStatus,
  RosterStatus,
  TeamFinanceEventType,
} from "@/modules/shared/domain/enums";
import { recordTeamFinanceEvent } from "@/modules/teams/application/team-finance.service";

import {
  assertCurrentSeasonIsActive,
  assertSeasonCanAdvanceToNextSeason,
} from "./simulation/engine-state-machine";

type AdvanceToNextSeasonInput = {
  userId: string;
  saveGameId: string;
  seasonId: string;
};

type AdvanceToNextSeasonResult = {
  seasonId: string;
  year: number;
};

function buildSeasonStartDate(year: number) {
  return new Date(Date.UTC(year, 8, 1, 18, 0, 0));
}

export async function advanceToNextSeasonForUser({
  userId,
  saveGameId,
  seasonId,
}: AdvanceToNextSeasonInput): Promise<AdvanceToNextSeasonResult | null> {
  const currentSeason = await prisma.season.findFirst({
    where: {
      id: seasonId,
      saveGameId,
      saveGame: {
        userId,
      },
    },
    include: {
      saveGame: {
        select: {
          id: true,
          currentSeasonId: true,
        },
      },
    },
  });

  if (!currentSeason) {
    return null;
  }

  assertCurrentSeasonIsActive(seasonId, currentSeason.saveGame.currentSeasonId);
  assertSeasonCanAdvanceToNextSeason(currentSeason.phase);

  const nextYear = currentSeason.year + 1;
  const existingNextSeason = await prisma.season.findFirst({
    where: {
      saveGameId,
      year: nextYear,
    },
    select: {
      id: true,
      year: true,
    },
  });

  if (existingNextSeason) {
    await prisma.saveGame.update({
      where: {
        id: saveGameId,
      },
      data: {
        currentSeasonId: existingNextSeason.id,
      },
    });

    return {
      seasonId: existingNextSeason.id,
      year: existingNextSeason.year,
    };
  }

  const seasonStartDate = buildSeasonStartDate(nextYear);

  return prisma.$transaction(async (tx) => {
    const [teams, rosterProfiles, activeContracts] = await Promise.all([
      tx.team.findMany({
        where: {
          saveGameId,
        },
        select: {
          id: true,
          city: true,
          abbreviation: true,
        },
        orderBy: [{ abbreviation: "asc" }],
      }),
      tx.playerRosterProfile.findMany({
        where: {
          saveGameId,
        },
        select: {
          playerId: true,
          teamId: true,
          rosterStatus: true,
          captainFlag: true,
        },
      }),
      tx.contract.findMany({
        where: {
          saveGameId,
          status: ContractStatus.ACTIVE,
        },
        select: {
          id: true,
          playerId: true,
          teamId: true,
          years: true,
          yearlySalary: true,
          capHit: true,
        },
      }),
    ]);

    const nextSeason = await tx.season.create({
      data: {
        saveGameId,
        year: nextYear,
        phase: "REGULAR_SEASON",
        week: 1,
        startsAt: seasonStartDate,
      },
    });

    for (const team of teams) {
      await tx.teamSeasonStat.create({
        data: {
          saveGameId,
          seasonId: nextSeason.id,
          teamId: team.id,
        },
      });
    }

    await tx.player.updateMany({
      where: {
        saveGameId,
        status: {
          not: PlayerStatus.RETIRED,
        },
      },
      data: {
        age: {
          increment: 1,
        },
        yearsPro: {
          increment: 1,
        },
        fatigue: 10,
        morale: 58,
        status: PlayerStatus.ACTIVE,
        injuryStatus: "HEALTHY",
        injuryName: null,
        injuryEndsOn: null,
      },
    });

    for (const contract of activeContracts) {
      if (contract.years <= 1) {
        await tx.contract.update({
          where: {
            id: contract.id,
          },
          data: {
            status: ContractStatus.EXPIRED,
            endedAt: seasonStartDate,
          },
        });

        await tx.playerRosterProfile.update({
          where: {
            playerId_saveGameId: {
              playerId: contract.playerId,
              saveGameId,
            },
          },
          data: {
            teamId: null,
            rosterStatus: RosterStatus.FREE_AGENT,
            depthChartSlot: null,
            captainFlag: false,
          },
        });

        await tx.player.update({
          where: {
            id: contract.playerId,
          },
          data: {
            status: PlayerStatus.FREE_AGENT,
          },
        });

        await tx.rosterTransaction.create({
          data: {
            saveGameId,
            playerId: contract.playerId,
            fromTeamId: contract.teamId,
            type: "RELEASE",
            description: "Contract expired at offseason rollover",
          },
        });

        await createPlayerHistoryEvent({
          tx,
          saveGameId,
          playerId: contract.playerId,
          seasonId: nextSeason.id,
          teamId: contract.teamId,
          type: PlayerHistoryEventType.RELEASE,
          title: "Vertrag ausgelaufen",
          description: `Zum Start der Saison ${nextYear} wurde der Spieler Free Agent.`,
          occurredAt: seasonStartDate,
        });

        continue;
      }

      await tx.contract.update({
        where: {
          id: contract.id,
        },
        data: {
          years: {
            decrement: 1,
          },
        },
      });

      await recordTeamFinanceEvent({
        tx,
        saveGameId,
        teamId: contract.teamId,
        playerId: contract.playerId,
        seasonId: nextSeason.id,
        type: TeamFinanceEventType.SEASON_SALARY,
        amount: -Number(contract.yearlySalary),
        capImpact: 0,
        description: `Saison ${nextYear}: Jahresgehalt fuer aktiven Vertrag reserviert.`,
        occurredAt: seasonStartDate,
      });
    }

    await tx.player.updateMany({
      where: {
        saveGameId,
        rosterProfile: {
          is: {
            teamId: null,
          },
        },
        status: {
          not: PlayerStatus.RETIRED,
        },
      },
      data: {
        status: PlayerStatus.FREE_AGENT,
      },
    });

    for (const rosterProfile of rosterProfiles) {
      if (!rosterProfile.teamId) {
        continue;
      }

      const stillUnderContract = activeContracts.some(
        (contract) =>
          contract.playerId === rosterProfile.playerId &&
          contract.teamId === rosterProfile.teamId &&
          contract.years > 1,
      );

      if (!stillUnderContract) {
        continue;
      }

      await tx.playerRosterProfile.update({
        where: {
          playerId_saveGameId: {
            playerId: rosterProfile.playerId,
            saveGameId,
          },
        },
        data: {
          rosterStatus:
            rosterProfile.rosterStatus === RosterStatus.INJURED_RESERVE
              ? RosterStatus.BACKUP
              : rosterProfile.rosterStatus,
        },
      });

      await createSeasonStatShells({
        tx,
        saveGameId,
        seasonId: nextSeason.id,
        teamId: rosterProfile.teamId,
        playerId: rosterProfile.playerId,
      });
    }

    const schedule = buildDoubleRoundRobinSchedule(teams, nextYear);

    for (const match of schedule) {
      await tx.match.create({
        data: {
          saveGameId,
          seasonId: nextSeason.id,
          week: match.week,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          scheduledAt: match.scheduledAt,
          stadiumName: match.stadiumName,
        },
      });
    }

    for (const team of teams) {
      await recalculateTeamState(tx, saveGameId, team.id);
    }

    await tx.saveGame.update({
      where: {
        id: saveGameId,
      },
      data: {
        currentSeasonId: nextSeason.id,
        updatedAt: new Date(),
      },
    });

    return {
      seasonId: nextSeason.id,
      year: nextSeason.year,
    };
  });
}
