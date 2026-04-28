import type {
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamContext,
} from "./simulation.types";
import { deriveSimulationSeed } from "./simulation-random";
import type { PreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";
import { selectAiTeamStrategy } from "@/modules/gameplay/domain/ai-team-strategy";
import { seasonSimulationRepository } from "../../infrastructure/simulation/season-simulation.repository";

function toAttributeMap(
  attributes: Array<{
    value: number;
    attributeDefinition: {
      code: string;
    };
  }>,
) {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.attributeDefinition.code, attribute.value]),
  );
}

export function selectSimulationSeasonStat(
  teamId: string,
  seasonStats: Array<{
    id: string;
    teamId: string;
    passing: {
      longestCompletion: number;
    } | null;
    rushing: {
      longestRush: number;
    } | null;
    receiving: {
      longestReception: number;
    } | null;
    kicking: {
      longestFieldGoal: number;
    } | null;
    punting: {
      longestPunt: number;
    } | null;
  }>,
) {
  return seasonStats.find((seasonStat) => seasonStat.teamId === teamId) ?? null;
}

function mapPlayerToContext(
  teamId: string,
  rosterProfile: {
    rosterStatus: string;
    depthChartSlot: number | null;
    captainFlag: boolean;
    developmentFocus: boolean;
    injuryRisk: number;
    primaryPosition: {
      code: string;
    };
    secondaryPosition: {
      code: string;
    } | null;
    player: {
      id: string;
      firstName: string;
      lastName: string;
      age: number;
      developmentTrait: string;
      status: string;
      injuryStatus: string;
      injuryName: string | null;
      injuryEndsOn: Date | null;
      fatigue: number;
      morale: number;
      evaluation: {
        potentialRating: number;
        positionOverall: number;
        offensiveOverall: number | null;
        defensiveOverall: number | null;
        specialTeamsOverall: number | null;
        physicalOverall: number | null;
        mentalOverall: number | null;
      } | null;
      attributes: Array<{
        value: number;
        attributeDefinition: {
          code: string;
        };
      }>;
      careerStat: {
        id: string;
        passing: {
          longestCompletion: number;
        } | null;
        rushing: {
          longestRush: number;
        } | null;
        receiving: {
          longestReception: number;
        } | null;
        kicking: {
          longestFieldGoal: number;
        } | null;
        punting: {
          longestPunt: number;
        } | null;
      } | null;
      playerSeasonStats: Array<{
        id: string;
        teamId: string;
        passing: {
          longestCompletion: number;
        } | null;
        rushing: {
          longestRush: number;
        } | null;
        receiving: {
          longestReception: number;
        } | null;
        kicking: {
          longestFieldGoal: number;
        } | null;
        punting: {
          longestPunt: number;
        } | null;
      }>;
    };
  },
): SimulationPlayerContext {
  const seasonStat = selectSimulationSeasonStat(
    teamId,
    rosterProfile.player.playerSeasonStats,
  );
  const careerStat = rosterProfile.player.careerStat;

  return {
    id: rosterProfile.player.id,
    teamId,
    firstName: rosterProfile.player.firstName,
    lastName: rosterProfile.player.lastName,
    age: rosterProfile.player.age,
    developmentTrait: rosterProfile.player.developmentTrait,
    potentialRating: rosterProfile.player.evaluation?.potentialRating ?? 0,
    positionCode: rosterProfile.primaryPosition.code,
    secondaryPositionCode: rosterProfile.secondaryPosition?.code ?? null,
    rosterStatus: rosterProfile.rosterStatus,
    depthChartSlot: rosterProfile.depthChartSlot,
    captainFlag: rosterProfile.captainFlag,
    developmentFocus: rosterProfile.developmentFocus,
    injuryRisk: rosterProfile.injuryRisk,
    status: rosterProfile.player.status,
    injuryStatus: rosterProfile.player.injuryStatus,
    injuryName: rosterProfile.player.injuryName,
    injuryEndsOn: rosterProfile.player.injuryEndsOn,
    fatigue: rosterProfile.player.fatigue,
    morale: rosterProfile.player.morale,
    positionOverall: rosterProfile.player.evaluation?.positionOverall ?? 0,
    offensiveOverall: rosterProfile.player.evaluation?.offensiveOverall ?? null,
    defensiveOverall: rosterProfile.player.evaluation?.defensiveOverall ?? null,
    specialTeamsOverall: rosterProfile.player.evaluation?.specialTeamsOverall ?? null,
    physicalOverall: rosterProfile.player.evaluation?.physicalOverall ?? null,
    mentalOverall: rosterProfile.player.evaluation?.mentalOverall ?? null,
    attributes: toAttributeMap(rosterProfile.player.attributes),
    gameDayAvailability: "ACTIVE",
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    seasonStat: seasonStat
      ? {
          id: seasonStat.id,
          passingLongestCompletion: seasonStat.passing?.longestCompletion ?? 0,
          rushingLongestRush: seasonStat.rushing?.longestRush ?? 0,
          receivingLongestReception: seasonStat.receiving?.longestReception ?? 0,
          kickingLongestFieldGoal: seasonStat.kicking?.longestFieldGoal ?? 0,
          puntingLongestPunt: seasonStat.punting?.longestPunt ?? 0,
        }
      : null,
    careerStat: careerStat
      ? {
          id: careerStat.id,
          passingLongestCompletion: careerStat.passing?.longestCompletion ?? 0,
          rushingLongestRush: careerStat.rushing?.longestRush ?? 0,
          receivingLongestReception: careerStat.receiving?.longestReception ?? 0,
          kickingLongestFieldGoal: careerStat.kicking?.longestFieldGoal ?? 0,
          puntingLongestPunt: careerStat.punting?.longestPunt ?? 0,
        }
      : null,
  };
}

export function buildMatchContext(
  seasonYear: number,
  match: Awaited<
    ReturnType<typeof seasonSimulationRepository.listWeekMatchesForSimulation>
  >[number],
): SimulationMatchContext {
  const homeTeam: SimulationTeamContext = {
    id: match.homeTeam.id,
    city: match.homeTeam.city,
    nickname: match.homeTeam.nickname,
    abbreviation: match.homeTeam.abbreviation,
    overallRating: match.homeTeam.overallRating,
    roster: match.homeTeam.rosterProfiles.map((rosterProfile) =>
      mapPlayerToContext(match.homeTeam.id, rosterProfile),
    ),
  };
  const awayTeam: SimulationTeamContext = {
    id: match.awayTeam.id,
    city: match.awayTeam.city,
    nickname: match.awayTeam.nickname,
    abbreviation: match.awayTeam.abbreviation,
    overallRating: match.awayTeam.overallRating,
    roster: match.awayTeam.rosterProfiles.map((rosterProfile) =>
      mapPlayerToContext(match.awayTeam.id, rosterProfile),
    ),
  };
  const homeAiStrategy = selectAiTeamStrategy({
    team: homeTeam,
    opponent: awayTeam,
    isHomeTeam: true,
  });
  const awayAiStrategy = selectAiTeamStrategy({
    team: awayTeam,
    opponent: homeTeam,
    isHomeTeam: false,
  });
  const homeOffensePlan =
    toPartialXFactorPlan(match.homeTeam.offenseXFactorPlan) ?? homeAiStrategy.offenseXFactorPlan;
  const homeDefensePlan =
    toPartialXFactorPlan(match.homeTeam.defenseXFactorPlan) ?? homeAiStrategy.defenseXFactorPlan;
  const awayOffensePlan =
    toPartialXFactorPlan(match.awayTeam.offenseXFactorPlan) ?? awayAiStrategy.offenseXFactorPlan;
  const awayDefensePlan =
    toPartialXFactorPlan(match.awayTeam.defenseXFactorPlan) ?? awayAiStrategy.defenseXFactorPlan;

  return {
    matchId: match.id,
    saveGameId: match.saveGameId,
    seasonId: match.seasonId,
    kind: match.kind,
    simulationSeed:
      match.simulationSeed ??
      deriveSimulationSeed(
        `${match.saveGameId}:${match.seasonId}:${match.id}:${match.week}`,
        match.scheduledAt.toISOString(),
      ),
    seasonYear,
    week: match.week,
    scheduledAt: match.scheduledAt,
    offenseXFactorPlan: homeOffensePlan,
    defenseXFactorPlan: awayDefensePlan,
    teamGameplans: {
      [homeTeam.id]: {
        aiStrategyArchetype: homeAiStrategy.archetype,
        offenseXFactorPlan: homeOffensePlan,
        defenseXFactorPlan: homeDefensePlan,
      },
      [awayTeam.id]: {
        aiStrategyArchetype: awayAiStrategy.archetype,
        offenseXFactorPlan: awayOffensePlan,
        defenseXFactorPlan: awayDefensePlan,
      },
    },
    homeTeam,
    awayTeam,
  };
}

function toPartialXFactorPlan(value: unknown): Partial<PreGameXFactorPlan> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<PreGameXFactorPlan>
    : null;
}
