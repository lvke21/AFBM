import {
  buildPlayerSpotlightRatings,
  computePlayerCompositeRatings,
  toAttributeMap,
} from "@/modules/players/domain/player-rating";
import { computePlayerSchemeFitScore } from "@/modules/players/domain/player-scheme-fit";
import type {
  PlayerAttributeGroup,
  PlayerDetail,
} from "@/modules/players/domain/player.types";
import type { PlayerDetailRecord } from "@/modules/players/infrastructure/player.repository";
import { getRepositories } from "@/server/repositories";

const ATTRIBUTE_CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  QUARTERBACK: "Quarterback",
  BALL_CARRIER: "Ball Carrier",
  RECEIVING: "Receiving",
  OFFENSIVE_LINE: "Offensive Line",
  FRONT_SEVEN: "Front Seven",
  COVERAGE: "Coverage",
  KICKING: "Kicking",
  SPECIAL_TEAMS: "Special Teams",
};

function mapAttributeGroups(player: PlayerDetailRecord): PlayerAttributeGroup[] {
  const groups = new Map<string, PlayerAttributeGroup>();

  for (const attribute of player.attributes) {
    const category = attribute.attributeDefinition.category;

    if (!groups.has(category)) {
      groups.set(category, {
        category,
        label: ATTRIBUTE_CATEGORY_LABELS[category] ?? category,
        attributes: [],
      });
    }

    groups.get(category)?.attributes.push({
      code: attribute.attributeDefinition.code,
      name: attribute.attributeDefinition.name,
      value: attribute.value,
      description: attribute.attributeDefinition.description,
    });
  }

  return [...groups.values()];
}

type PlayerSeasonSnapshotRecord = PlayerDetailRecord["playerSeasonStats"][number];

function mapSeasonSnapshot(
  seasonStat: PlayerSeasonSnapshotRecord,
  input: {
    label: string;
    isCurrentTeamSeason: boolean;
  },
): NonNullable<PlayerDetail["latestSeason"]> {
  return {
    label: input.label,
    isCurrentTeamSeason: input.isCurrentTeamSeason,
    year: seasonStat.season.year,
    teamName: `${seasonStat.team.city} ${seasonStat.team.nickname}`,
    gamesPlayed: seasonStat.gamesPlayed,
    gamesStarted: seasonStat.gamesStarted,
    snapsOffense: seasonStat.snapsOffense,
    snapsDefense: seasonStat.snapsDefense,
    snapsSpecialTeams: seasonStat.snapsSpecialTeams,
    passing: {
      attempts: seasonStat.passing?.attempts ?? 0,
      completions: seasonStat.passing?.completions ?? 0,
      yards: seasonStat.passing?.yards ?? 0,
      touchdowns: seasonStat.passing?.touchdowns ?? 0,
      interceptions: seasonStat.passing?.interceptions ?? 0,
      longestCompletion: seasonStat.passing?.longestCompletion ?? 0,
    },
    rushing: {
      attempts: seasonStat.rushing?.attempts ?? 0,
      yards: seasonStat.rushing?.yards ?? 0,
      touchdowns: seasonStat.rushing?.touchdowns ?? 0,
      fumbles: seasonStat.rushing?.fumbles ?? 0,
      longestRush: seasonStat.rushing?.longestRush ?? 0,
    },
    receiving: {
      targets: seasonStat.receiving?.targets ?? 0,
      receptions: seasonStat.receiving?.receptions ?? 0,
      yards: seasonStat.receiving?.yards ?? 0,
      touchdowns: seasonStat.receiving?.touchdowns ?? 0,
      drops: seasonStat.receiving?.drops ?? 0,
      longestReception: seasonStat.receiving?.longestReception ?? 0,
      yardsAfterCatch: seasonStat.receiving?.yardsAfterCatch ?? 0,
    },
    blocking: {
      passBlockSnaps: seasonStat.blocking?.passBlockSnaps ?? 0,
      runBlockSnaps: seasonStat.blocking?.runBlockSnaps ?? 0,
      sacksAllowed: seasonStat.blocking?.sacksAllowed ?? 0,
      pressuresAllowed: seasonStat.blocking?.pressuresAllowed ?? 0,
      pancakes: seasonStat.blocking?.pancakes ?? 0,
    },
    defensive: {
      tackles: seasonStat.defensive?.tackles ?? 0,
      assistedTackles: seasonStat.defensive?.assistedTackles ?? 0,
      tacklesForLoss: seasonStat.defensive?.tacklesForLoss ?? 0,
      sacks: Number(seasonStat.defensive?.sacks ?? 0),
      interceptions: seasonStat.defensive?.interceptions ?? 0,
      forcedFumbles: seasonStat.defensive?.forcedFumbles ?? 0,
      passesDefended: seasonStat.defensive?.passesDefended ?? 0,
      coverageSnaps: seasonStat.defensive?.coverageSnaps ?? 0,
      targetsAllowed: seasonStat.defensive?.targetsAllowed ?? 0,
      receptionsAllowed: seasonStat.defensive?.receptionsAllowed ?? 0,
      yardsAllowed: seasonStat.defensive?.yardsAllowed ?? 0,
    },
    kicking: {
      fieldGoalsMade: seasonStat.kicking?.fieldGoalsMade ?? 0,
      fieldGoalsAttempted: seasonStat.kicking?.fieldGoalsAttempted ?? 0,
      fieldGoalsMadeShort: seasonStat.kicking?.fieldGoalsMadeShort ?? 0,
      fieldGoalsAttemptedShort: seasonStat.kicking?.fieldGoalsAttemptedShort ?? 0,
      fieldGoalsMadeMid: seasonStat.kicking?.fieldGoalsMadeMid ?? 0,
      fieldGoalsAttemptedMid: seasonStat.kicking?.fieldGoalsAttemptedMid ?? 0,
      fieldGoalsMadeLong: seasonStat.kicking?.fieldGoalsMadeLong ?? 0,
      fieldGoalsAttemptedLong: seasonStat.kicking?.fieldGoalsAttemptedLong ?? 0,
      extraPointsMade: seasonStat.kicking?.extraPointsMade ?? 0,
      extraPointsAttempted: seasonStat.kicking?.extraPointsAttempted ?? 0,
      longestFieldGoal: seasonStat.kicking?.longestFieldGoal ?? 0,
    },
    punting: {
      punts: seasonStat.punting?.punts ?? 0,
      puntYards: seasonStat.punting?.puntYards ?? 0,
      netPuntYards: seasonStat.punting?.netPuntYards ?? 0,
      fairCatchesForced: seasonStat.punting?.fairCatchesForced ?? 0,
      hangTimeTotalTenths: seasonStat.punting?.hangTimeTotalTenths ?? 0,
      puntsInside20: seasonStat.punting?.puntsInside20 ?? 0,
      longestPunt: seasonStat.punting?.longestPunt ?? 0,
    },
    returns: {
      kickReturns: seasonStat.returns?.kickReturns ?? 0,
      kickReturnYards: seasonStat.returns?.kickReturnYards ?? 0,
      kickReturnTouchdowns: seasonStat.returns?.kickReturnTouchdowns ?? 0,
      kickReturnFumbles: seasonStat.returns?.kickReturnFumbles ?? 0,
      puntReturns: seasonStat.returns?.puntReturns ?? 0,
      puntReturnYards: seasonStat.returns?.puntReturnYards ?? 0,
      puntReturnTouchdowns: seasonStat.returns?.puntReturnTouchdowns ?? 0,
      puntReturnFumbles: seasonStat.returns?.puntReturnFumbles ?? 0,
    },
  };
}

function buildEmptySeasonSnapshot(input: {
  year: number;
  teamName: string;
  label: string;
  isCurrentTeamSeason: boolean;
}): NonNullable<PlayerDetail["latestSeason"]> {
  return {
    label: input.label,
    isCurrentTeamSeason: input.isCurrentTeamSeason,
    year: input.year,
    teamName: input.teamName,
    gamesPlayed: 0,
    gamesStarted: 0,
    snapsOffense: 0,
    snapsDefense: 0,
    snapsSpecialTeams: 0,
    passing: {
      attempts: 0,
      completions: 0,
      yards: 0,
      touchdowns: 0,
      interceptions: 0,
      longestCompletion: 0,
    },
    rushing: {
      attempts: 0,
      yards: 0,
      touchdowns: 0,
      fumbles: 0,
      longestRush: 0,
    },
    receiving: {
      targets: 0,
      receptions: 0,
      yards: 0,
      touchdowns: 0,
      drops: 0,
      longestReception: 0,
      yardsAfterCatch: 0,
    },
    blocking: {
      passBlockSnaps: 0,
      runBlockSnaps: 0,
      sacksAllowed: 0,
      pressuresAllowed: 0,
      pancakes: 0,
    },
    defensive: {
      tackles: 0,
      assistedTackles: 0,
      tacklesForLoss: 0,
      sacks: 0,
      interceptions: 0,
      forcedFumbles: 0,
      passesDefended: 0,
      coverageSnaps: 0,
      targetsAllowed: 0,
      receptionsAllowed: 0,
      yardsAllowed: 0,
    },
    kicking: {
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalsMadeShort: 0,
      fieldGoalsAttemptedShort: 0,
      fieldGoalsMadeMid: 0,
      fieldGoalsAttemptedMid: 0,
      fieldGoalsMadeLong: 0,
      fieldGoalsAttemptedLong: 0,
      extraPointsMade: 0,
      extraPointsAttempted: 0,
      longestFieldGoal: 0,
    },
    punting: {
      punts: 0,
      puntYards: 0,
      netPuntYards: 0,
      fairCatchesForced: 0,
      hangTimeTotalTenths: 0,
      puntsInside20: 0,
      longestPunt: 0,
    },
    returns: {
      kickReturns: 0,
      kickReturnYards: 0,
      kickReturnTouchdowns: 0,
      kickReturnFumbles: 0,
      puntReturns: 0,
      puntReturnYards: 0,
      puntReturnTouchdowns: 0,
      puntReturnFumbles: 0,
    },
  };
}

export function selectSeasonSnapshot(
  player: PlayerDetailRecord,
): NonNullable<PlayerDetail["latestSeason"]> | null {
  const currentSeason = player.saveGame.currentSeason;
  const currentTeam = player.rosterProfile?.team ?? null;

  if (currentSeason && currentTeam) {
    const currentTeamSeason = player.playerSeasonStats.find(
      (seasonStat) =>
        seasonStat.season.id === currentSeason.id && seasonStat.team.id === currentTeam.id,
    );

    if (currentTeamSeason) {
      return mapSeasonSnapshot(currentTeamSeason, {
        label: "Aktuelle Team-Saison",
        isCurrentTeamSeason: true,
      });
    }

    return buildEmptySeasonSnapshot({
      year: currentSeason.year,
      teamName: `${currentTeam.city} ${currentTeam.nickname}`,
      label: "Aktuelle Team-Saison",
      isCurrentTeamSeason: true,
    });
  }

  const latestRecordedSeason = player.playerSeasonStats[0] ?? null;

  return latestRecordedSeason
    ? mapSeasonSnapshot(latestRecordedSeason, {
        label: "Letzte verknuepfte Saison",
        isCurrentTeamSeason: false,
      })
    : null;
}

function mapPlayerDetail(player: PlayerDetailRecord): PlayerDetail {
  const latestSeason = selectSeasonSnapshot(player);
  const roster = player.rosterProfile;
  const team = roster?.team;
  const attributes = toAttributeMap(player.attributes);
  const compositeRatings = computePlayerCompositeRatings(attributes);
  const teamSchemeNames = team
    ? {
        offense: team.offensiveSchemeFit?.name ?? null,
        defense: team.defensiveSchemeFit?.name ?? null,
        specialTeams: team.specialTeamsSchemeFit?.name ?? null,
      }
    : null;
  const teamSchemeCodes = team
    ? {
        offense: team.offensiveSchemeFit?.code ?? null,
        defense: team.defensiveSchemeFit?.code ?? null,
        specialTeams: team.specialTeamsSchemeFit?.code ?? null,
      }
    : null;
  const schemeFitScore =
    roster && teamSchemeCodes
      ? computePlayerSchemeFitScore({
          positionGroupCode: roster.positionGroup.code,
          playerSchemeCode: roster.schemeFit?.code ?? null,
          teamSchemes: teamSchemeCodes,
          compositeRatings,
        })
      : null;
  const detailRatings = buildPlayerSpotlightRatings(
    roster?.primaryPosition.code ?? "UNKNOWN",
    roster?.secondaryPosition?.code ?? null,
    compositeRatings,
  );

  return {
    id: player.id,
    fullName: `${player.firstName} ${player.lastName}`,
    age: player.age,
    birthDate: player.birthDate,
    heightCm: player.heightCm,
    weightKg: player.weightKg,
    yearsPro: player.yearsPro,
    college: player.college,
    nationality: player.nationality,
    dominantHand: player.dominantHand ?? null,
    status: player.status,
    injuryStatus: player.injuryStatus,
    injuryName: player.injuryName,
    injuryEndsOn: player.injuryEndsOn,
    fatigue: player.fatigue,
    morale: player.morale,
    developmentTrait: player.developmentTrait,
    team: team
      ? {
          id: team.id,
          name: `${team.city} ${team.nickname}`,
          abbreviation: team.abbreviation,
        }
      : null,
    roster: roster
      ? {
          primaryPositionCode: roster.primaryPosition.code,
          primaryPositionName: roster.primaryPosition.name,
          secondaryPositionCode: roster.secondaryPosition?.code ?? null,
          secondaryPositionName: roster.secondaryPosition?.name ?? null,
          positionGroupName: roster.positionGroup.name,
          rosterStatus: roster.rosterStatus,
          depthChartSlot: roster.depthChartSlot,
          captainFlag: roster.captainFlag,
          developmentFocus: roster.developmentFocus,
          injuryRisk: roster.injuryRisk,
          practiceSquadEligible: roster.practiceSquadEligible ?? null,
          archetypeName: roster.archetype?.name ?? null,
          schemeFitName: roster.schemeFit?.name ?? null,
        }
      : null,
    teamSchemes: teamSchemeNames,
    schemeFitScore,
    evaluation: player.evaluation
      ? {
          positionOverall: player.evaluation.positionOverall,
          potentialRating: player.evaluation.potentialRating,
          offensiveOverall: player.evaluation.offensiveOverall,
          defensiveOverall: player.evaluation.defensiveOverall,
          specialTeamsOverall: player.evaluation.specialTeamsOverall,
          physicalOverall: player.evaluation.physicalOverall,
          mentalOverall: player.evaluation.mentalOverall,
        }
      : null,
    currentContract: player.contracts[0]
      ? {
          years: player.contracts[0].years,
          yearlySalary: Number(player.contracts[0].yearlySalary),
          signingBonus: Number(player.contracts[0].signingBonus),
          capHit: Number(player.contracts[0].capHit),
          signedAt: player.contracts[0].signedAt,
        }
      : null,
    history: player.historyEvents.map((event) => ({
      id: event.id,
      type: event.type,
      week: event.week,
      title: event.title,
      description: event.description,
      occurredAt: event.occurredAt,
    })),
    detailRatings,
    compositeRatings,
    attributeGroups: mapAttributeGroups(player),
    latestSeason,
    career: player.careerStat
      ? {
          gamesPlayed: player.careerStat.gamesPlayed,
          gamesStarted: player.careerStat.gamesStarted,
          snapsOffense: player.careerStat.snapsOffense,
          snapsDefense: player.careerStat.snapsDefense,
          snapsSpecialTeams: player.careerStat.snapsSpecialTeams,
          passing: {
            attempts: player.careerStat.passing?.attempts ?? 0,
            completions: player.careerStat.passing?.completions ?? 0,
            yards: player.careerStat.passing?.yards ?? 0,
            touchdowns: player.careerStat.passing?.touchdowns ?? 0,
            interceptions: player.careerStat.passing?.interceptions ?? 0,
            longestCompletion: player.careerStat.passing?.longestCompletion ?? 0,
          },
          rushing: {
            attempts: player.careerStat.rushing?.attempts ?? 0,
            yards: player.careerStat.rushing?.yards ?? 0,
            touchdowns: player.careerStat.rushing?.touchdowns ?? 0,
            fumbles: player.careerStat.rushing?.fumbles ?? 0,
            longestRush: player.careerStat.rushing?.longestRush ?? 0,
          },
          receiving: {
            targets: player.careerStat.receiving?.targets ?? 0,
            receptions: player.careerStat.receiving?.receptions ?? 0,
            yards: player.careerStat.receiving?.yards ?? 0,
            touchdowns: player.careerStat.receiving?.touchdowns ?? 0,
            drops: player.careerStat.receiving?.drops ?? 0,
            longestReception: player.careerStat.receiving?.longestReception ?? 0,
            yardsAfterCatch: player.careerStat.receiving?.yardsAfterCatch ?? 0,
          },
          defensive: {
            tackles: player.careerStat.defensive?.tackles ?? 0,
            sacks: Number(player.careerStat.defensive?.sacks ?? 0),
            interceptions: player.careerStat.defensive?.interceptions ?? 0,
            forcedFumbles: player.careerStat.defensive?.forcedFumbles ?? 0,
            passesDefended: player.careerStat.defensive?.passesDefended ?? 0,
            coverageSnaps: player.careerStat.defensive?.coverageSnaps ?? 0,
            targetsAllowed: player.careerStat.defensive?.targetsAllowed ?? 0,
            receptionsAllowed: player.careerStat.defensive?.receptionsAllowed ?? 0,
            yardsAllowed: player.careerStat.defensive?.yardsAllowed ?? 0,
          },
          blocking: {
            passBlockSnaps: player.careerStat.blocking?.passBlockSnaps ?? 0,
            runBlockSnaps: player.careerStat.blocking?.runBlockSnaps ?? 0,
            sacksAllowed: player.careerStat.blocking?.sacksAllowed ?? 0,
            pressuresAllowed: player.careerStat.blocking?.pressuresAllowed ?? 0,
            pancakes: player.careerStat.blocking?.pancakes ?? 0,
          },
          kicking: {
            fieldGoalsMade: player.careerStat.kicking?.fieldGoalsMade ?? 0,
            fieldGoalsAttempted: player.careerStat.kicking?.fieldGoalsAttempted ?? 0,
            fieldGoalsMadeShort: player.careerStat.kicking?.fieldGoalsMadeShort ?? 0,
            fieldGoalsAttemptedShort: player.careerStat.kicking?.fieldGoalsAttemptedShort ?? 0,
            fieldGoalsMadeMid: player.careerStat.kicking?.fieldGoalsMadeMid ?? 0,
            fieldGoalsAttemptedMid: player.careerStat.kicking?.fieldGoalsAttemptedMid ?? 0,
            fieldGoalsMadeLong: player.careerStat.kicking?.fieldGoalsMadeLong ?? 0,
            fieldGoalsAttemptedLong: player.careerStat.kicking?.fieldGoalsAttemptedLong ?? 0,
            extraPointsMade: player.careerStat.kicking?.extraPointsMade ?? 0,
            extraPointsAttempted: player.careerStat.kicking?.extraPointsAttempted ?? 0,
            longestFieldGoal: player.careerStat.kicking?.longestFieldGoal ?? 0,
          },
          punting: {
            punts: player.careerStat.punting?.punts ?? 0,
            puntYards: player.careerStat.punting?.puntYards ?? 0,
            netPuntYards: player.careerStat.punting?.netPuntYards ?? 0,
            fairCatchesForced: player.careerStat.punting?.fairCatchesForced ?? 0,
            hangTimeTotalTenths: player.careerStat.punting?.hangTimeTotalTenths ?? 0,
            puntsInside20: player.careerStat.punting?.puntsInside20 ?? 0,
            longestPunt: player.careerStat.punting?.longestPunt ?? 0,
          },
          returns: {
            kickReturns: player.careerStat.returns?.kickReturns ?? 0,
            kickReturnYards: player.careerStat.returns?.kickReturnYards ?? 0,
            kickReturnTouchdowns: player.careerStat.returns?.kickReturnTouchdowns ?? 0,
            kickReturnFumbles: player.careerStat.returns?.kickReturnFumbles ?? 0,
            puntReturns: player.careerStat.returns?.puntReturns ?? 0,
            puntReturnYards: player.careerStat.returns?.puntReturnYards ?? 0,
            puntReturnTouchdowns: player.careerStat.returns?.puntReturnTouchdowns ?? 0,
            puntReturnFumbles: player.careerStat.returns?.puntReturnFumbles ?? 0,
          },
        }
      : null,
  };
}

export async function getPlayerDetail(
  saveGameId: string,
  playerId: string,
): Promise<PlayerDetail | null> {
  const player = await getRepositories().players.findBySaveGame(saveGameId, playerId);

  if (!player) {
    return null;
  }

  return mapPlayerDetail(player);
}

export async function getPlayerDetailForUser(
  userId: string,
  saveGameId: string,
  playerId: string,
): Promise<PlayerDetail | null> {
  const player = await getRepositories().players.findOwnedByUser(
    userId,
    saveGameId,
    playerId,
  );

  if (!player) {
    return null;
  }

  return mapPlayerDetail(player);
}
