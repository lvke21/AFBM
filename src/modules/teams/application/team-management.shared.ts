import type { PlayerSpotlightRating } from "@/modules/players/domain/player-rating";
import type { RosterStatus } from "@/modules/shared/domain/enums";
import { teamManagementRepository } from "@/modules/teams/infrastructure/team-management.repository";
export {
  calculateCapHit,
  calculateSigningBonus,
  evaluateFreeAgentOffer,
  getExpectedFreeAgentSalary,
  normalizeContractYears,
  normalizeYearlySalary,
} from "@/modules/teams/domain/contract-calculation";

import { isGameDayEligibleRosterStatus } from "../../shared/domain/roster-status";
import type { TeamNeedSummary } from "../domain/team.types";

export type FreeAgentMarketPlayer = {
  id: string;
  fullName: string;
  age: number;
  yearsPro: number;
  positionCode: string;
  positionName: string;
  archetypeName: string | null;
  schemeFitName: string | null;
  positionOverall: number;
  potentialRating: number;
  physicalOverall: number;
  mentalOverall: number;
  projectedCapHit: number;
  schemeFitScore: number | null;
  teamNeedScore: number;
  spotlightRatings: PlayerSpotlightRating[];
};

export type FreeAgentMarket = {
  managerTeam: {
    id: string;
    name: string;
    abbreviation: string;
    cashBalance: number;
    salaryCapSpace: number;
    overallRating: number;
    rosterCount: number;
    activeLimit: number;
    practiceSquadSize: number;
    schemes: {
      offense: string | null;
      defense: string | null;
      specialTeams: string | null;
    };
    needs: TeamNeedSummary[];
  };
  players: FreeAgentMarketPlayer[];
};

export type ManagedTeamContext = {
  saveGameId: string;
  currentSeasonId: string;
  settings: {
    salaryCap: number;
    activeRosterLimit: number;
    practiceSquadSize: number;
  };
  team: {
    id: string;
    abbreviation: string;
    city: string;
    nickname: string;
    managerControlled: boolean;
    salaryCapSpace: number;
    cashBalance: number;
    schemes: {
      offense: string | null;
      defense: string | null;
      specialTeams: string | null;
    };
  };
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeSchemeCode(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildTeamSchemeCodes(team: {
  offensiveSchemeFit?: {
    code: string;
  } | null;
  defensiveSchemeFit?: {
    code: string;
  } | null;
  specialTeamsSchemeFit?: {
    code: string;
  } | null;
}) {
  return {
    offense: team.offensiveSchemeFit?.code ?? null,
    defense: team.defensiveSchemeFit?.code ?? null,
    specialTeams: team.specialTeamsSchemeFit?.code ?? null,
  };
}

export async function requireManagedTeamContext(
  userId: string,
  saveGameId: string,
  teamId: string,
): Promise<ManagedTeamContext> {
  const saveGame = await teamManagementRepository.findManagedTeamContext(
    userId,
    saveGameId,
    teamId,
  );

  if (!saveGame?.currentSeasonId || !saveGame.settings || !saveGame.teams[0]) {
    throw new Error("Managed team context is incomplete");
  }

  if (!saveGame.teams[0].managerControlled) {
    throw new Error("Only the manager-controlled team can be changed");
  }

  return {
    saveGameId: saveGame.id,
    currentSeasonId: saveGame.currentSeasonId,
    settings: {
      salaryCap: Number(saveGame.settings.salaryCap),
      activeRosterLimit: saveGame.settings.activeRosterLimit,
      practiceSquadSize: saveGame.settings.practiceSquadSize,
    },
    team: {
      id: saveGame.teams[0].id,
      abbreviation: saveGame.teams[0].abbreviation,
      city: saveGame.teams[0].city,
      nickname: saveGame.teams[0].nickname,
      managerControlled: saveGame.teams[0].managerControlled,
      salaryCapSpace: Number(saveGame.teams[0].salaryCapSpace),
      cashBalance: Number(saveGame.teams[0].cashBalance),
      schemes: buildTeamSchemeCodes(saveGame.teams[0]),
    },
  };
}

export function nextSpecialRole(role: string | null) {
  return role === "KR" || role === "PR" ? role : null;
}

export function normalizeDepthChartSlot(value: number | null) {
  if (value == null) {
    return null;
  }

  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error("Depth chart slot must be a positive whole number");
  }

  return value;
}

export function findDepthChartConflict(input: {
  playerId: string;
  positionCode: string;
  rosterStatus: RosterStatus;
  depthChartSlot: number | null;
  rosterAssignments: Array<{
    playerId: string;
    fullName: string;
    positionCode: string;
    rosterStatus: RosterStatus;
    depthChartSlot: number | null;
  }>;
}) {
  if (input.depthChartSlot == null || !isGameDayEligibleRosterStatus(input.rosterStatus)) {
    return null;
  }

  return (
    input.rosterAssignments.find(
      (assignment) =>
        assignment.playerId !== input.playerId &&
        assignment.positionCode === input.positionCode &&
        assignment.depthChartSlot === input.depthChartSlot &&
        isGameDayEligibleRosterStatus(assignment.rosterStatus),
    ) ?? null
  );
}
