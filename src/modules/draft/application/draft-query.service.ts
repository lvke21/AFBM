import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { DraftClassStatus, ScoutingLevel } from "@/modules/shared/domain/enums";
import { buildTeamNeeds } from "@/modules/teams/application/team-needs.service";
import type { TeamNeedSummary } from "@/modules/teams/domain/team.types";

export type DraftBoardProspect = {
  id: string;
  fullName: string;
  age: number;
  college: string | null;
  draftedByTeamId: string | null;
  draftedByTeamName: string | null;
  draftedPickNumber: number | null;
  draftedRound: number | null;
  positionCode: string;
  positionName: string;
  projectedRound: number;
  riskLevel: string;
  status: string;
  scoutingLevel: ScoutingLevel;
  teamNeedRelevance: {
    detail: string;
    label: string;
    score: number | null;
  };
  visibleOverallRange: {
    label: string;
    max: number | null;
    min: number | null;
  };
  visiblePotentialRange: {
    label: string;
    max: number | null;
    min: number | null;
  };
  visibleOverall: string;
  visiblePotential: string;
  strengths: string[];
  weaknesses: string[];
  notes: string | null;
  teamConsequence: {
    label: string;
    status: string;
  } | null;
};

export type DraftBoardState = {
  draftClass: {
    canPick: boolean;
    id: string;
    name: string;
    prospectCount: number;
    year: number;
    status: string;
  } | null;
  managerTeam: {
    abbreviation: string;
    id: string;
    name: string;
  } | null;
  managerTeamId: string | null;
  managerDraftedPlayers: DraftBoardProspect[];
  prospects: DraftBoardProspect[];
  saveGameId: string;
  summary: {
    availableProspects: number;
    basicScouted: number;
    focusedScouted: number;
    totalProspects: number;
  };
};

export type DraftOverviewViewModel = DraftBoardState;
export type DraftProspectViewModel = DraftBoardProspect;

type DraftBoardProspectRecord = Prisma.DraftPlayerGetPayload<{
  include: {
    draftedByTeam: {
      select: {
        abbreviation: true;
        city: true;
        nickname: true;
      };
    };
    position: {
      select: {
        code: true;
        name: true;
      };
    };
    scoutingData: true;
  };
}>;

function buildVisibleRange(min: number | null, max: number | null) {
  if (min == null || max == null) {
    return {
      label: "Unbekannt",
      max: null,
      min: null,
    };
  }

  return {
    label: `${min}-${max}`,
    max,
    min,
  };
}

function mapVisibleProspect(
  prospect: DraftBoardProspectRecord,
  teamNeedByPosition: Map<string, TeamNeedSummary>,
): DraftBoardProspect {
  const scouting = prospect.scoutingData[0] ?? null;
  const scoutingLevel = scouting?.level ?? ScoutingLevel.NONE;
  const showBasic = scoutingLevel === ScoutingLevel.BASIC || scoutingLevel === ScoutingLevel.FOCUSED;
  const showFocused = scoutingLevel === ScoutingLevel.FOCUSED;
  const visibleOverallRange = showBasic
    ? buildVisibleRange(scouting?.visibleOverallMin ?? null, scouting?.visibleOverallMax ?? null)
    : buildVisibleRange(null, null);
  const visiblePotentialRange = showFocused
    ? buildVisibleRange(
        scouting?.visiblePotentialMin ?? null,
        scouting?.visiblePotentialMax ?? null,
      )
    : buildVisibleRange(null, null);
  const teamNeed = teamNeedByPosition.get(prospect.position.code) ?? null;

  return {
    id: prospect.id,
    fullName: `${prospect.firstName} ${prospect.lastName}`,
    age: prospect.age,
    college: prospect.college,
    draftedByTeamId: prospect.draftedByTeamId,
    draftedByTeamName: prospect.draftedByTeam
      ? `${prospect.draftedByTeam.city} ${prospect.draftedByTeam.nickname}`
      : null,
    draftedPickNumber: prospect.draftedPickNumber,
    draftedRound: prospect.draftedRound,
    positionCode: prospect.position.code,
    positionName: prospect.position.name,
    projectedRound: prospect.projectedRound,
    riskLevel: showBasic ? prospect.riskLevel : "Unbekannt",
    status: prospect.status,
    scoutingLevel,
    teamNeedRelevance: teamNeed
      ? {
          detail: `Starter ${teamNeed.starterAverage} · Tiefe ${teamNeed.playerCount}/${teamNeed.targetCount}`,
          label:
            teamNeed.needScore >= 60
              ? "Hoher Need"
              : teamNeed.needScore >= 30
                ? "Moderater Need"
                : "Geringer Need",
          score: teamNeed.needScore,
        }
      : {
          detail: "Keine priorisierte Luecke auf dieser Position.",
          label: "Geringer Need",
          score: 0,
        },
    visibleOverallRange,
    visiblePotentialRange,
    visibleOverall: visibleOverallRange.label,
    visiblePotential: visiblePotentialRange.label,
    strengths: showBasic ? scouting?.strengths.slice(0, showFocused ? 3 : 1) ?? [] : [],
    weaknesses: showFocused ? scouting?.weaknesses ?? [] : [],
    notes: showFocused ? scouting?.notes ?? null : null,
    teamConsequence: prospect.draftedByTeamId
      ? {
          label: "Rookie Rights",
          status: "Needs Contract",
        }
      : null,
  };
}

function buildSummary(prospects: DraftBoardProspect[]) {
  return {
    availableProspects: prospects.filter((prospect) => prospect.status === "AVAILABLE").length,
    basicScouted: prospects.filter((prospect) => prospect.scoutingLevel === ScoutingLevel.BASIC).length,
    focusedScouted: prospects.filter((prospect) => prospect.scoutingLevel === ScoutingLevel.FOCUSED).length,
    totalProspects: prospects.length,
  };
}

function canPickDraftClass(status: string) {
  return status === DraftClassStatus.ACTIVE;
}

function emptyDraftOverview(input: {
  managerTeam: DraftOverviewViewModel["managerTeam"];
  saveGameId: string;
}): DraftOverviewViewModel {
  return {
    draftClass: null,
    managerTeam: input.managerTeam,
    managerTeamId: input.managerTeam?.id ?? null,
    managerDraftedPlayers: [],
    prospects: [],
    saveGameId: input.saveGameId,
    summary: {
      availableProspects: 0,
      basicScouted: 0,
      focusedScouted: 0,
      totalProspects: 0,
    },
  };
}

export async function getDraftOverviewForUser(
  userId: string,
  saveGameId: string,
): Promise<DraftOverviewViewModel | null> {
  const saveGame = await prisma.saveGame.findFirst({
    where: {
      id: saveGameId,
      userId,
    },
    select: {
      id: true,
      currentSeasonId: true,
      teams: {
        where: {
          managerControlled: true,
        },
        select: {
          abbreviation: true,
          city: true,
          id: true,
          nickname: true,
        },
        take: 1,
      },
    },
  });

  if (!saveGame) {
    return null;
  }

  const managerTeamRecord = saveGame.teams[0] ?? null;
  const managerTeam = managerTeamRecord
    ? {
        abbreviation: managerTeamRecord.abbreviation,
        id: managerTeamRecord.id,
        name: `${managerTeamRecord.city} ${managerTeamRecord.nickname}`,
      }
    : null;
  const managerTeamId = managerTeam?.id ?? null;

  if (!managerTeamId) {
    return emptyDraftOverview({ managerTeam: null, saveGameId: saveGame.id });
  }

  const draftClass = await prisma.draftClass.findFirst({
    where: {
      saveGameId: saveGame.id,
      OR: [
        {
          seasonId: saveGame.currentSeasonId,
        },
        {
          seasonId: null,
        },
      ],
    },
    orderBy: [
      {
        year: "desc",
      },
    ],
    select: {
      id: true,
      name: true,
      status: true,
      year: true,
    },
  });

  if (!draftClass) {
    return emptyDraftOverview({ managerTeam, saveGameId: saveGame.id });
  }

  const prospects = await prisma.draftPlayer.findMany({
    where: {
      draftClassId: draftClass.id,
      saveGameId: saveGame.id,
    },
    include: {
      draftedByTeam: {
        select: {
          abbreviation: true,
          city: true,
          nickname: true,
        },
      },
      position: {
        select: {
          code: true,
          name: true,
        },
      },
      scoutingData: {
        where: {
          teamId: managerTeamId,
        },
        take: 1,
      },
    },
    orderBy: [
      {
        projectedRound: "asc",
      },
      {
        status: "asc",
      },
      {
        truePotential: "desc",
      },
      {
        trueOverall: "desc",
      },
    ],
  });
  const rosterProfiles = await prisma.playerRosterProfile.findMany({
    where: {
      saveGameId: saveGame.id,
      teamId: managerTeamId,
    },
    select: {
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
      rosterStatus: true,
    },
  });
  const teamNeeds = buildTeamNeeds(
    rosterProfiles.map((profile) => ({
      positionCode: profile.primaryPosition.code,
      positionName: profile.primaryPosition.name,
      positionOverall: profile.player.evaluation?.positionOverall ?? 55,
      rosterStatus: profile.rosterStatus,
      schemeFitScore: null,
    })),
  );
  const teamNeedByPosition = new Map(teamNeeds.map((need) => [need.positionCode, need]));
  const prospectViewModels = prospects.map((prospect) =>
    mapVisibleProspect(prospect, teamNeedByPosition),
  );
  const managerDraftedPlayers = prospectViewModels.filter(
    (prospect) => prospect.draftedByTeamId === managerTeamId,
  );

  return {
    draftClass: {
      canPick: canPickDraftClass(draftClass.status),
      id: draftClass.id,
      name: draftClass.name ?? `Draft Class ${draftClass.year}`,
      prospectCount: prospectViewModels.length,
      status: draftClass.status,
      year: draftClass.year,
    },
    managerTeam,
    managerTeamId,
    managerDraftedPlayers,
    prospects: prospectViewModels,
    saveGameId: saveGame.id,
    summary: buildSummary(prospectViewModels),
  };
}

export async function getDraftBoardForUser(
  userId: string,
  saveGameId: string,
): Promise<DraftBoardState | null> {
  return getDraftOverviewForUser(userId, saveGameId);
}
