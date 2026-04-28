import { formatRecord } from "@/lib/utils/format";
import {
  buildPlayerSpotlightRatings,
  computePlayerCompositeRatings,
  toAttributeMap,
} from "@/modules/players/domain/player-rating";
import { computePlayerSchemeFitScore } from "@/modules/players/domain/player-scheme-fit";
import { buildTeamNeeds } from "@/modules/teams/application/team-management.service";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import type { TeamDetailRecord } from "@/modules/teams/infrastructure/team.repository";
import { getRepositories } from "@/server/repositories";

function getAttributeValue(
  attributes: Array<{
    value: number;
    attributeDefinition: {
      code: string;
    };
  }>,
  code: string,
) {
  return attributes.find((attribute) => attribute.attributeDefinition.code === code)?.value ?? 0;
}

function buildTeamSchemes(team: Pick<
  TeamDetailRecord,
  "offensiveSchemeFit" | "defensiveSchemeFit" | "specialTeamsSchemeFit"
>) {
  return {
    offense: team.offensiveSchemeFit?.code ?? null,
    defense: team.defensiveSchemeFit?.code ?? null,
    specialTeams: team.specialTeamsSchemeFit?.code ?? null,
  };
}

function mapTeamDetail(team: TeamDetailRecord) {
  const teamSchemes = buildTeamSchemes(team);
  const sortedPlayers = [...team.rosterProfiles].sort((left, right) => {
    const byPosition = left.primaryPosition.code.localeCompare(
      right.primaryPosition.code,
    );

    if (byPosition !== 0) {
      return byPosition;
    }

    const leftOverall = left.player.evaluation?.positionOverall ?? 0;
    const rightOverall = right.player.evaluation?.positionOverall ?? 0;

    return rightOverall - leftOverall;
  });

  return {
    id: team.id,
    name: `${team.city} ${team.nickname}`,
    abbreviation: team.abbreviation,
    conferenceName: team.conferenceDefinition.name,
    divisionName: team.divisionDefinition.name,
    managerControlled: team.managerControlled,
    overallRating: team.overallRating,
    morale: team.morale,
    cashBalance: Number(team.cashBalance),
    salaryCapSpace: Number(team.salaryCapSpace),
    currentRecord: team.teamSeasonStats[0]
      ? formatRecord(
          team.teamSeasonStats[0].wins,
          team.teamSeasonStats[0].losses,
          team.teamSeasonStats[0].ties,
        )
      : "0-0",
    players: sortedPlayers.map((slot) => {
      const attributes = toAttributeMap(slot.player.attributes);
      const compositeRatings = computePlayerCompositeRatings(attributes);
      const detailRatings = buildPlayerSpotlightRatings(
        slot.primaryPosition.code,
        slot.secondaryPosition?.code,
        compositeRatings,
      );
      const schemeFitScore = computePlayerSchemeFitScore({
        positionGroupCode: slot.positionGroup.code,
        playerSchemeCode: slot.schemeFit?.code ?? null,
        teamSchemes,
        compositeRatings,
      });

      return {
        id: slot.player.id,
        fullName: `${slot.player.firstName} ${slot.player.lastName}`,
        age: slot.player.age,
        yearsPro: slot.player.yearsPro,
        heightCm: slot.player.heightCm,
        weightKg: slot.player.weightKg,
        positionCode: slot.primaryPosition.code,
        positionName: slot.primaryPosition.name,
        secondaryPositionCode: slot.secondaryPosition?.code ?? null,
        secondaryPositionName: slot.secondaryPosition?.name ?? null,
        positionGroupName: slot.positionGroup.name,
        archetypeName: slot.archetype?.name ?? null,
        schemeFitName: slot.schemeFit?.name ?? null,
        rosterStatus: slot.rosterStatus,
        depthChartSlot: slot.depthChartSlot ?? null,
        captainFlag: slot.captainFlag,
        developmentFocus: slot.developmentFocus,
        schemeFitScore,
        positionOverall: slot.player.evaluation?.positionOverall ?? 0,
        potentialRating: slot.player.evaluation?.potentialRating ?? 0,
        physicalOverall: slot.player.evaluation?.physicalOverall ?? 0,
        mentalOverall: slot.player.evaluation?.mentalOverall ?? 0,
        detailRatings,
        status: slot.player.status,
        injuryStatus: slot.player.injuryStatus,
        injuryName: slot.player.injuryName,
        morale: slot.player.morale,
        fatigue: slot.player.fatigue,
        keyAttributes: {
          speed: getAttributeValue(slot.player.attributes, "SPEED"),
          strength: getAttributeValue(slot.player.attributes, "STRENGTH"),
          awareness: getAttributeValue(slot.player.attributes, "AWARENESS"),
          leadership: getAttributeValue(slot.player.attributes, "LEADERSHIP"),
          discipline: getAttributeValue(slot.player.attributes, "DISCIPLINE"),
          durability: getAttributeValue(slot.player.attributes, "DURABILITY"),
          mobility: getAttributeValue(slot.player.attributes, "MOBILITY"),
          hands: getAttributeValue(slot.player.attributes, "HANDS"),
          coverageRange: getAttributeValue(slot.player.attributes, "COVERAGE_RANGE"),
          linebackerCoverage: getAttributeValue(slot.player.attributes, "LB_COVERAGE"),
          linebackerManCoverage: getAttributeValue(slot.player.attributes, "LB_MAN_COVERAGE"),
          linebackerZoneCoverage: getAttributeValue(slot.player.attributes, "LB_ZONE_COVERAGE"),
          kickConsistency: getAttributeValue(slot.player.attributes, "KICK_CONSISTENCY"),
          returnVision: getAttributeValue(slot.player.attributes, "RETURN_VISION"),
          snapAccuracy: getAttributeValue(slot.player.attributes, "SNAP_ACCURACY"),
          snapVelocity: getAttributeValue(slot.player.attributes, "SNAP_VELOCITY"),
        },
        currentContract: slot.player.contracts[0]
          ? {
              years: slot.player.contracts[0].years,
              yearlySalary: Number(slot.player.contracts[0].yearlySalary),
              signingBonus: Number(slot.player.contracts[0].signingBonus),
              capHit: Number(slot.player.contracts[0].capHit),
            }
          : null,
        developmentHistory: (slot.player.historyEvents ?? []).map((event) => ({
          id: event.id,
          type: event.type,
          week: event.week,
          title: event.title,
          description: event.description,
          occurredAt: event.occurredAt,
        })),
        seasonLine: {
          gamesPlayed: slot.player.playerSeasonStats[0]?.gamesPlayed ?? 0,
          passingYards: slot.player.playerSeasonStats[0]?.passing?.yards ?? 0,
          passingTouchdowns: slot.player.playerSeasonStats[0]?.passing?.touchdowns ?? 0,
          passingInterceptions: slot.player.playerSeasonStats[0]?.passing?.interceptions ?? 0,
          rushingYards: slot.player.playerSeasonStats[0]?.rushing?.yards ?? 0,
          rushingTouchdowns: slot.player.playerSeasonStats[0]?.rushing?.touchdowns ?? 0,
          receivingYards: slot.player.playerSeasonStats[0]?.receiving?.yards ?? 0,
          receptions: slot.player.playerSeasonStats[0]?.receiving?.receptions ?? 0,
          receivingTouchdowns: slot.player.playerSeasonStats[0]?.receiving?.touchdowns ?? 0,
          tackles: slot.player.playerSeasonStats[0]?.defensive?.tackles ?? 0,
          sacks: Number(slot.player.playerSeasonStats[0]?.defensive?.sacks ?? 0),
          passesDefended: slot.player.playerSeasonStats[0]?.defensive?.passesDefended ?? 0,
          interceptions: slot.player.playerSeasonStats[0]?.defensive?.interceptions ?? 0,
          targetsAllowed: slot.player.playerSeasonStats[0]?.defensive?.targetsAllowed ?? 0,
          receptionsAllowed:
            slot.player.playerSeasonStats[0]?.defensive?.receptionsAllowed ?? 0,
          yardsAllowed: slot.player.playerSeasonStats[0]?.defensive?.yardsAllowed ?? 0,
          fieldGoalsMade: slot.player.playerSeasonStats[0]?.kicking?.fieldGoalsMade ?? 0,
          fieldGoalsAttempted:
            slot.player.playerSeasonStats[0]?.kicking?.fieldGoalsAttempted ?? 0,
          punts: slot.player.playerSeasonStats[0]?.punting?.punts ?? 0,
          puntsInside20: slot.player.playerSeasonStats[0]?.punting?.puntsInside20 ?? 0,
          returnYards:
            (slot.player.playerSeasonStats[0]?.returns?.kickReturnYards ?? 0) +
            (slot.player.playerSeasonStats[0]?.returns?.puntReturnYards ?? 0),
          returnTouchdowns:
            (slot.player.playerSeasonStats[0]?.returns?.kickReturnTouchdowns ?? 0) +
            (slot.player.playerSeasonStats[0]?.returns?.puntReturnTouchdowns ?? 0),
          returnFumbles:
            (slot.player.playerSeasonStats[0]?.returns?.kickReturnFumbles ?? 0) +
            (slot.player.playerSeasonStats[0]?.returns?.puntReturnFumbles ?? 0),
        },
      };
    }),
    schemes: {
      offense: team.offensiveSchemeFit?.name ?? null,
      defense: team.defensiveSchemeFit?.name ?? null,
      specialTeams: team.specialTeamsSchemeFit?.name ?? null,
    },
    contractOutlook: {
      activeCapCommitted: sortedPlayers.reduce(
        (sum, slot) => sum + (slot.player.contracts[0] ? Number(slot.player.contracts[0].capHit) : 0),
        0,
      ),
      expiringCap: sortedPlayers.reduce(
        (sum, slot) =>
          sum +
          (slot.player.contracts[0] && slot.player.contracts[0].years <= 1
            ? Number(slot.player.contracts[0].capHit)
            : 0),
        0,
      ),
      expiringPlayers: sortedPlayers
        .filter((slot) => slot.player.contracts[0] && slot.player.contracts[0].years <= 1)
        .map((slot) => ({
          id: slot.player.id,
          fullName: `${slot.player.firstName} ${slot.player.lastName}`,
          positionCode: slot.primaryPosition.code,
          years: slot.player.contracts[0]?.years ?? 0,
          capHit: Number(slot.player.contracts[0]?.capHit ?? 0),
        }))
        .slice(0, 6),
    },
    recentFinanceEvents: team.financeEvents.map((event) => ({
      id: event.id,
      type: event.type,
      amount: Number(event.amount),
      capImpact: Number(event.capImpact),
      cashBalanceAfter: Number(event.cashBalanceAfter),
      description: event.description,
      occurredAt: event.occurredAt,
      playerName: event.player ? `${event.player.firstName} ${event.player.lastName}` : null,
    })),
    recentDecisionEvents: team.playerHistoryEvents.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      occurredAt: event.occurredAt,
      playerName: event.player ? `${event.player.firstName} ${event.player.lastName}` : null,
    })),
    teamNeeds: buildTeamNeeds(
      sortedPlayers.map((slot) => ({
        positionCode: slot.primaryPosition.code,
        positionName: slot.primaryPosition.name,
        positionOverall: slot.player.evaluation?.positionOverall ?? 55,
        rosterStatus: slot.rosterStatus,
        schemeFitScore: slot.schemeFit?.code
          ? computePlayerSchemeFitScore({
              positionGroupCode: slot.positionGroup.code,
              playerSchemeCode: slot.schemeFit.code,
              teamSchemes,
              compositeRatings: computePlayerCompositeRatings(toAttributeMap(slot.player.attributes)),
            })
          : null,
      })),
    ),
  } satisfies TeamDetail;
}

export async function getTeamDetail(
  saveGameId: string,
  teamId: string,
): Promise<TeamDetail | null> {
  const team = await getRepositories().teams.findBySaveGame(saveGameId, teamId);

  if (!team) {
    return null;
  }

  return mapTeamDetail(team);
}

export async function getTeamDetailForUser(
  userId: string,
  saveGameId: string,
  teamId: string,
): Promise<TeamDetail | null> {
  const team = await getRepositories().teams.findOwnedByUser(
    userId,
    saveGameId,
    teamId,
  );

  if (!team) {
    return null;
  }

  return mapTeamDetail(team);
}
