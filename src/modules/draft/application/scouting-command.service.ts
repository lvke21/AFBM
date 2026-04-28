import { prisma } from "@/lib/db/prisma";
import { DraftClassStatus, ScoutingLevel } from "@/modules/shared/domain/enums";

export type ScoutProspectResult = {
  draftPlayerId: string;
  prospectName: string;
  previousLevel: ScoutingLevel;
  nextLevel: ScoutingLevel;
  changed: boolean;
};

function nextScoutingLevel(level: ScoutingLevel) {
  if (level === ScoutingLevel.NONE) {
    return ScoutingLevel.BASIC;
  }

  if (level === ScoutingLevel.BASIC) {
    return ScoutingLevel.FOCUSED;
  }

  return ScoutingLevel.FOCUSED;
}

function visibleRange(value: number, level: ScoutingLevel) {
  if (level === ScoutingLevel.FOCUSED) {
    return {
      max: Math.min(99, value + 2),
      min: Math.max(35, value - 2),
    };
  }

  return {
    max: Math.min(99, value + 5),
    min: Math.max(35, value - 5),
  };
}

function defaultStrengths(positionCode: string) {
  if (positionCode === "QB") {
    return ["Decision profile", "Accuracy window"];
  }

  if (["CB", "MLB"].includes(positionCode)) {
    return ["Recognition", "Defensive fit"];
  }

  if (["LT", "RB", "WR"].includes(positionCode)) {
    return ["Role fit", "Development upside"];
  }

  return ["Specialist profile", "Roster value"];
}

function defaultWeaknesses(level: ScoutingLevel) {
  return level === ScoutingLevel.FOCUSED ? ["Needs pro evaluation"] : [];
}

export async function scoutProspectForUser(input: {
  userId: string;
  saveGameId: string;
  draftPlayerId: string;
}): Promise<ScoutProspectResult> {
  const saveGame = await prisma.saveGame.findFirst({
    where: {
      id: input.saveGameId,
      userId: input.userId,
    },
    select: {
      id: true,
      currentSeasonId: true,
      teams: {
        where: {
          managerControlled: true,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!saveGame?.teams[0]) {
    throw new Error("Managed team context is incomplete");
  }

  const managerTeamId = saveGame.teams[0].id;
  const prospect = await prisma.draftPlayer.findFirst({
    where: {
      id: input.draftPlayerId,
      saveGameId: input.saveGameId,
      status: "AVAILABLE",
    },
    include: {
      draftClass: {
        select: {
          seasonId: true,
          status: true,
        },
      },
      position: {
        select: {
          code: true,
        },
      },
      scoutingData: {
        where: {
          teamId: managerTeamId,
        },
        take: 1,
      },
    },
  });

  if (!prospect) {
    throw new Error("Draft prospect not found");
  }

  if (
    prospect.draftClass.status !== DraftClassStatus.UPCOMING &&
    prospect.draftClass.status !== DraftClassStatus.ACTIVE
  ) {
    throw new Error("Draft class is closed for scouting");
  }

  if (
    prospect.draftClass.seasonId &&
    prospect.draftClass.seasonId !== saveGame.currentSeasonId
  ) {
    throw new Error("Draft class does not belong to the active season");
  }

  const existing = prospect.scoutingData[0] ?? null;
  const previousLevel = existing?.level ?? ScoutingLevel.NONE;
  const nextLevel = nextScoutingLevel(previousLevel);
  const changed = nextLevel !== previousLevel;

  if (!changed) {
    return {
      changed: false,
      draftPlayerId: prospect.id,
      nextLevel,
      previousLevel,
      prospectName: `${prospect.firstName} ${prospect.lastName}`,
    };
  }

  const overallRange = visibleRange(prospect.trueOverall, nextLevel);
  const potentialRange = visibleRange(prospect.truePotential, nextLevel);
  const strengths = existing?.strengths.length
    ? existing.strengths
    : defaultStrengths(prospect.position.code);
  const weaknesses = existing?.weaknesses.length
    ? existing.weaknesses
    : defaultWeaknesses(nextLevel);

  await prisma.scoutingData.upsert({
    where: {
      draftPlayerId_teamId: {
        draftPlayerId: prospect.id,
        teamId: managerTeamId,
      },
    },
    create: {
      saveGameId: input.saveGameId,
      draftClassId: prospect.draftClassId,
      draftPlayerId: prospect.id,
      teamId: managerTeamId,
      level: nextLevel,
      visibleOverallMin: overallRange.min,
      visibleOverallMax: overallRange.max,
      visiblePotentialMin: potentialRange.min,
      visiblePotentialMax: potentialRange.max,
      strengths,
      weaknesses,
      notes: `Scouting updated to ${nextLevel}.`,
    },
    update: {
      level: nextLevel,
      visibleOverallMin: overallRange.min,
      visibleOverallMax: overallRange.max,
      visiblePotentialMin: potentialRange.min,
      visiblePotentialMax: potentialRange.max,
      strengths,
      weaknesses,
      notes: `Scouting updated to ${nextLevel}.`,
    },
  });

  return {
    changed: true,
    draftPlayerId: prospect.id,
    nextLevel,
    previousLevel,
    prospectName: `${prospect.firstName} ${prospect.lastName}`,
  };
}
