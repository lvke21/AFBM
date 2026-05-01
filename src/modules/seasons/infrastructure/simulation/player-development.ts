import type { Prisma } from "@prisma/client";

import {
  buildPlayerEvaluationSnapshot,
  calculateTeamOverall,
} from "@/modules/players/domain/player-evaluation";
import {
  buildAgeRegressionPlan,
  buildAttributeProgressionPlan,
  calculateDevelopmentFocusWeeklyXp,
  calculateGameProgressionXp,
  calculateWeeklyTrainingXp,
} from "@/modules/players/domain/player-progression";
import { isGameDayEligibleRosterStatus } from "../../../shared/domain/roster-status";

import type {
  PlayerSimulationLine,
  SimulationPlayerContext,
} from "@/modules/seasons/application/simulation/simulation.types";

type ApplyWeeklyPlayerDevelopmentInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  player: SimulationPlayerContext;
  line: PlayerSimulationLine;
};

export type AdvanceWeekDevelopmentPlayer = {
  id: string;
  teamId: string;
  positionCode: string;
  secondaryPositionCode: string | null;
  rosterStatus: string;
  depthChartSlot: number | null;
  developmentFocus: boolean;
  developmentFocusStreakWeeks?: number;
  developmentTrait: string;
  potentialRating: number;
  positionOverall: number;
  attributes: Record<string, number>;
};

type ApplyAdvanceWeekPlayerDevelopmentInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  player: AdvanceWeekDevelopmentPlayer;
};

function totalSnaps(line: PlayerSimulationLine) {
  return line.snapsOffense + line.snapsDefense + line.snapsSpecialTeams;
}

function resolvePositionGroupCode(positionCode: string): "OFFENSE" | "DEFENSE" | "SPECIAL_TEAMS" {
  if (["K", "P", "LS", "KR", "PR"].includes(positionCode)) {
    return "SPECIAL_TEAMS";
  }

  if (["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"].includes(positionCode)) {
    return "DEFENSE";
  }

  return "OFFENSE";
}

function buildAdvanceWeekAttributeDeltaPlan(player: AdvanceWeekDevelopmentPlayer) {
  const xpGained = calculateWeeklyTrainingXp(player);
  const focusBonusXp = calculateDevelopmentFocusWeeklyXp(player);
  const changes = buildAttributeProgressionPlan({
    maxAttributeGains: 1,
    player,
    source: "WEEKLY_TRAINING",
    xpGained,
  });

  return {
    changes,
    focusBonusXp,
    xpGained,
  };
}

function buildAttributeDeltaPlan(
  player: SimulationPlayerContext,
  line: PlayerSimulationLine,
  attributes: Record<string, number>,
) {
  const snaps = totalSnaps(line);
  const xpGained = calculateGameProgressionXp({
    ...player,
    attributes,
    bigPlays:
      line.passing.touchdowns +
      line.rushing.touchdowns +
      line.receiving.touchdowns +
      line.defensive.sacks +
      line.defensive.interceptions,
    mistakes: line.passing.interceptions + line.rushing.fumbles + line.receiving.drops,
    started: line.started,
    touchdowns:
      line.passing.touchdowns + line.rushing.touchdowns + line.receiving.touchdowns,
    totalSnaps: snaps,
  });
  const growthChanges = buildAttributeProgressionPlan({
    maxAttributeGains: player.developmentFocus ? 4 : 3,
    player: {
      ...player,
      attributes,
    },
    source: "GAME",
    xpGained,
  });
  const regressionChanges =
    snaps < 18
      ? buildAgeRegressionPlan({
          ...player,
          attributes,
        })
      : [];

  return {
    changes: [...growthChanges, ...regressionChanges],
    xpGained,
  };
}

export async function applyAdvanceWeekPlayerDevelopment({
  tx,
  saveGameId,
  player,
}: ApplyAdvanceWeekPlayerDevelopmentInput) {
  const currentAttributes = { ...player.attributes };
  const progression = buildAdvanceWeekAttributeDeltaPlan(player);
  const changes = progression.changes.filter(
    (change) => change.previous !== change.next,
  );

  if (changes.length === 0) {
    return null;
  }

  for (const change of changes) {
    await tx.playerAttributeRating.updateMany({
      where: {
        saveGameId,
        playerId: player.id,
        attributeDefinition: {
          code: change.code,
        },
      },
      data: {
        value: change.next,
      },
    });

    currentAttributes[change.code] = change.next;
  }

  const updatedEvaluation = buildPlayerEvaluationSnapshot(
    player.positionCode,
    resolvePositionGroupCode(player.positionCode),
    player.secondaryPositionCode,
    currentAttributes,
  );

  await tx.playerEvaluation.update({
    where: {
      playerId_saveGameId: {
        playerId: player.id,
        saveGameId,
      },
    },
    data: {
      positionOverall: updatedEvaluation.positionOverall,
      offensiveOverall: updatedEvaluation.offensiveOverall,
      defensiveOverall: updatedEvaluation.defensiveOverall,
      specialTeamsOverall: updatedEvaluation.specialTeamsOverall,
      physicalOverall: updatedEvaluation.physicalOverall,
      mentalOverall: updatedEvaluation.mentalOverall,
    },
  });

  return {
    previousOverall: player.positionOverall,
    nextOverall: updatedEvaluation.positionOverall,
    focusBonusXp: progression.focusBonusXp,
    developmentFocusStreakWeeks: player.developmentFocusStreakWeeks ?? 0,
    xpGained: progression.xpGained,
    changes,
  };
}

export async function applyWeeklyPlayerDevelopment({
  tx,
  saveGameId,
  player,
  line,
}: ApplyWeeklyPlayerDevelopmentInput) {
  const currentAttributes = { ...player.attributes };
  const progression = buildAttributeDeltaPlan(player, line, currentAttributes);
  const changes = progression.changes.filter(
    (change) => change.previous !== change.next,
  );

  if (changes.length === 0) {
    return null;
  }

  for (const change of changes) {
    await tx.playerAttributeRating.updateMany({
      where: {
        saveGameId,
        playerId: player.id,
        attributeDefinition: {
          code: change.code,
        },
      },
      data: {
        value: change.next,
      },
    });

    currentAttributes[change.code] = change.next;
  }

  const updatedEvaluation = buildPlayerEvaluationSnapshot(
    player.positionCode,
    resolvePositionGroupCode(player.positionCode),
    player.secondaryPositionCode,
    currentAttributes,
  );

  await tx.playerEvaluation.update({
    where: {
      playerId_saveGameId: {
        playerId: player.id,
        saveGameId,
      },
    },
    data: {
      positionOverall: updatedEvaluation.positionOverall,
      offensiveOverall: updatedEvaluation.offensiveOverall,
      defensiveOverall: updatedEvaluation.defensiveOverall,
      specialTeamsOverall: updatedEvaluation.specialTeamsOverall,
      physicalOverall: updatedEvaluation.physicalOverall,
      mentalOverall: updatedEvaluation.mentalOverall,
    },
  });

  return {
    previousOverall: player.positionOverall,
    nextOverall: updatedEvaluation.positionOverall,
    xpGained: progression.xpGained,
    changes,
  };
}

export async function recalculateTeamState(
  tx: Prisma.TransactionClient,
  saveGameId: string,
  teamId: string,
) {
  const [settings, team, evaluations] = await Promise.all([
    tx.saveGameSetting.findUnique({
      where: {
        saveGameId,
      },
      select: {
        salaryCap: true,
      },
    }),
    tx.team.findFirst({
      where: {
        id: teamId,
        saveGameId,
      },
      select: {
        id: true,
      },
    }),
    tx.playerRosterProfile.findMany({
      where: {
        saveGameId,
        teamId,
      },
      select: {
        rosterStatus: true,
        primaryPosition: {
          select: {
            code: true,
          },
        },
        player: {
          select: {
            evaluation: {
              select: {
                positionOverall: true,
                specialTeamsOverall: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!team) {
    return null;
  }

  const capHits = await tx.contract.aggregate({
    where: {
      saveGameId,
      teamId,
      status: {
        in: ["ACTIVE", "RELEASED"],
      },
    },
    _sum: {
      capHit: true,
    },
  });
  const usedCap = Number(capHits._sum.capHit ?? 0);
  const teamOverall = calculateTeamOverall(
    evaluations
      .filter((entry) => isGameDayEligibleRosterStatus(entry.rosterStatus))
      .map((entry) => ({
        positionCode: entry.primaryPosition.code,
        positionOverall: entry.player.evaluation?.positionOverall ?? 55,
        specialTeamsOverall: entry.player.evaluation?.specialTeamsOverall ?? null,
      })),
  );

  await tx.team.update({
    where: {
      id: team.id,
    },
    data: {
      overallRating: teamOverall,
      salaryCapSpace: Number(((Number(settings?.salaryCap ?? 0) || 0) - usedCap).toFixed(2)),
    },
  });

  return {
    overallRating: teamOverall,
    salaryCapSpace: Number(((Number(settings?.salaryCap ?? 0) || 0) - usedCap).toFixed(2)),
  };
}
