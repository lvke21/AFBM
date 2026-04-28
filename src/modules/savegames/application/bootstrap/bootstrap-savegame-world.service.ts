import type {
  Prisma,
  Season,
  Team,
} from "@prisma/client";
import { calculateTeamOverall } from "@/modules/players/domain/player-evaluation";

import {
  FRANCHISE_TEMPLATES,
  listArchetypeDefinitions,
  listAttributeDefinitions,
  listFranchiseTemplatesByLeague,
  listPositionDefinitions,
  listSchemeFitDefinitions,
} from "@/modules/shared/infrastructure/reference-data";

import { buildDoubleRoundRobinSchedule } from "./double-round-robin-schedule";
import { buildInitialRoster } from "./initial-roster";
import { createInitialPlayerStatShells } from "./player-stat-shells";

const SALARY_CAP = 255_000_000;
const OFFENSE_TEAM_SCHEMES = [
  "BALANCED_OFFENSE",
  "WEST_COAST",
  "POWER_RUN",
  "SPREAD_ATTACK",
  "AIR_RAID",
] as const;
const DEFENSE_TEAM_SCHEMES = [
  "FOUR_THREE_FRONT",
  "PRESS_MAN",
  "THREE_FOUR_FRONT",
  "ZONE_DISCIPLINE",
] as const;
const SPECIAL_TEAMS_SCHEMES = [
  "FIELD_POSITION",
  "RETURN_SPARK",
  "POWER_LEG",
] as const;

function calculateCapHit(yearlySalary: number, signingBonus: number, years: number) {
  return Number((yearlySalary + signingBonus / years).toFixed(2));
}

type BootstrapSaveGameWorldInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  season: Season;
  leagueDefinitionId: string;
  managerTeamAbbreviation?: string;
};

export async function bootstrapSaveGameWorld({
  tx,
  saveGameId,
  season,
  leagueDefinitionId,
  managerTeamAbbreviation,
}: BootstrapSaveGameWorldInput) {
  const [
    positionDefinitions,
    franchiseTemplates,
    archetypeDefinitions,
    schemeFitDefinitions,
    attributeDefinitions,
  ] = await Promise.all([
    listPositionDefinitions(tx),
    listFranchiseTemplatesByLeague(tx, leagueDefinitionId),
    listArchetypeDefinitions(tx),
    listSchemeFitDefinitions(tx),
    listAttributeDefinitions(tx),
  ]);

  const positionByCode = new Map(
    positionDefinitions.map((position) => [position.code, position]),
  );
  const archetypeByCode = new Map(
    archetypeDefinitions.map((archetype) => [archetype.code, archetype.id]),
  );
  const schemeFitByCode = new Map(
    schemeFitDefinitions.map((schemeFit) => [schemeFit.code, schemeFit.id]),
  );
  const attributeDefinitionIdsByCode = new Map(
    attributeDefinitions.map((attribute) => [attribute.code, attribute.id]),
  );

  const createdTeams: Team[] = [];

  for (const [teamIndex, franchise] of franchiseTemplates.entries()) {
    const roster = buildInitialRoster(teamIndex, franchise.prestige, season.year);
    const initialTeamOverall = calculateTeamOverall(
      roster.map((playerSeed) => ({
        positionCode: playerSeed.primaryPositionCode,
        positionOverall: playerSeed.positionOverall,
        specialTeamsOverall: playerSeed.specialTeamsOverall,
      })),
    );
    const team = await tx.team.create({
      data: {
        saveGameId,
        franchiseTemplateId: franchise.id,
        conferenceDefinitionId: franchise.conferenceDefinitionId,
        divisionDefinitionId: franchise.divisionDefinitionId,
        offensiveSchemeFitDefinitionId:
          schemeFitByCode.get(
            OFFENSE_TEAM_SCHEMES[teamIndex % OFFENSE_TEAM_SCHEMES.length],
          ) ?? null,
        defensiveSchemeFitDefinitionId:
          schemeFitByCode.get(
            DEFENSE_TEAM_SCHEMES[teamIndex % DEFENSE_TEAM_SCHEMES.length],
          ) ?? null,
        specialTeamsSchemeFitDefinitionId:
          schemeFitByCode.get(
            SPECIAL_TEAMS_SCHEMES[teamIndex % SPECIAL_TEAMS_SCHEMES.length],
          ) ?? null,
        city: franchise.city,
        nickname: franchise.nickname,
        abbreviation: franchise.abbreviation,
        managerControlled:
          managerTeamAbbreviation != null
            ? managerTeamAbbreviation === franchise.abbreviation
            : franchise.abbreviation === FRANCHISE_TEMPLATES[0]?.abbreviation,
        overallRating: initialTeamOverall,
        morale: 64,
        cashBalance: franchise.defaultBudget,
        salaryCapSpace: SALARY_CAP,
      },
    });

    createdTeams.push(team);

    await tx.teamSeasonStat.create({
      data: {
        saveGameId,
        seasonId: season.id,
        teamId: team.id,
      },
    });
    let teamCapUsage = 0;

    for (const playerSeed of roster) {
      const primaryPosition = positionByCode.get(playerSeed.primaryPositionCode);
      const secondaryPosition = playerSeed.secondaryPositionCode
        ? positionByCode.get(playerSeed.secondaryPositionCode)
        : null;
      const archetypeDefinitionId = archetypeByCode.get(playerSeed.archetypeCode);
      const schemeFitDefinitionId = schemeFitByCode.get(playerSeed.schemeFitCode);

      if (!primaryPosition) {
        throw new Error(
          `Primary position ${playerSeed.primaryPositionCode} is missing`,
        );
      }

      if (playerSeed.secondaryPositionCode && !secondaryPosition) {
        throw new Error(
          `Secondary position ${playerSeed.secondaryPositionCode} is missing`,
        );
      }

      if (!archetypeDefinitionId) {
        throw new Error(`Archetype ${playerSeed.archetypeCode} is missing`);
      }

      if (!schemeFitDefinitionId) {
        throw new Error(`Scheme fit ${playerSeed.schemeFitCode} is missing`);
      }

      const player = await tx.player.create({
        data: {
          saveGameId,
          firstName: playerSeed.firstName,
          lastName: playerSeed.lastName,
          age: playerSeed.age,
          birthDate: playerSeed.birthDate,
          heightCm: playerSeed.heightCm,
          weightKg: playerSeed.weightKg,
          yearsPro: playerSeed.yearsPro,
          college: playerSeed.college,
          nationality: playerSeed.nationality,
          dominantHand: playerSeed.dominantHand,
          fatigue: playerSeed.fatigue,
          morale: playerSeed.morale,
          developmentTrait: playerSeed.developmentTrait,
        },
      });

      await tx.playerRosterProfile.create({
        data: {
          saveGameId,
          playerId: player.id,
          teamId: team.id,
          primaryPositionDefinitionId: primaryPosition.id,
          secondaryPositionDefinitionId: secondaryPosition?.id,
          positionGroupDefinitionId: primaryPosition.positionGroupDefinitionId,
          archetypeDefinitionId,
          schemeFitDefinitionId,
          rosterStatus: playerSeed.rosterStatus,
          depthChartSlot: playerSeed.depthChartSlot,
          captainFlag: playerSeed.captainFlag,
          injuryRisk: playerSeed.injuryRisk,
          practiceSquadEligible: playerSeed.practiceSquadEligible,
        },
      });

      await tx.playerEvaluation.create({
        data: {
          saveGameId,
          playerId: player.id,
          potentialRating: playerSeed.potentialRating,
          positionOverall: playerSeed.positionOverall,
          offensiveOverall: playerSeed.offensiveOverall,
          defensiveOverall: playerSeed.defensiveOverall,
          specialTeamsOverall: playerSeed.specialTeamsOverall,
          physicalOverall: playerSeed.physicalOverall,
          mentalOverall: playerSeed.mentalOverall,
        },
      });

      const attributeRows = Object.entries(playerSeed.attributes)
        .map(([code, value]) => {
          const attributeDefinitionId = attributeDefinitionIdsByCode.get(code);

          if (!attributeDefinitionId || value == null) {
            return null;
          }

          return {
            saveGameId,
            playerId: player.id,
            attributeDefinitionId,
            value,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row != null);

      if (attributeRows.length > 0) {
        await tx.playerAttributeRating.createMany({
          data: attributeRows,
        });
      }

      const capHit = calculateCapHit(
        playerSeed.yearlySalary,
        playerSeed.signingBonus,
        playerSeed.years,
      );

      teamCapUsage += capHit;

      await tx.contract.create({
        data: {
          saveGameId,
          playerId: player.id,
          teamId: team.id,
          startSeasonId: season.id,
          years: playerSeed.years,
          yearlySalary: playerSeed.yearlySalary,
          signingBonus: playerSeed.signingBonus,
          capHit,
        },
      });

      await createInitialPlayerStatShells({
        tx,
        saveGameId,
        seasonId: season.id,
        teamId: team.id,
        playerId: player.id,
      });

      await tx.rosterTransaction.create({
        data: {
          saveGameId,
          playerId: player.id,
          toTeamId: team.id,
          type: "SIGNING",
          description: "Initial roster bootstrap",
        },
      });
    }

    await tx.team.update({
      where: { id: team.id },
      data: {
        salaryCapSpace: Number((SALARY_CAP - teamCapUsage).toFixed(2)),
      },
    });
  }

  const openingSchedule = buildDoubleRoundRobinSchedule(createdTeams, season.year);

  for (const matchup of openingSchedule) {
    await tx.match.create({
      data: {
        saveGameId,
        seasonId: season.id,
        week: matchup.week,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        scheduledAt: matchup.scheduledAt,
        stadiumName: matchup.stadiumName,
      },
    });
  }
}
