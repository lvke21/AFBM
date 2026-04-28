import {
  buildPlayerSpotlightRatings,
  computePlayerCompositeRatings,
  toAttributeMap,
} from "@/modules/players/domain/player-rating";
import { computePlayerSchemeFitScore } from "@/modules/players/domain/player-scheme-fit";

import { buildTeamNeeds } from "./team-needs.service";
import {
  buildTeamSchemeCodes,
  calculateCapHit,
  calculateSigningBonus,
  type FreeAgentMarket,
  type FreeAgentMarketPlayer,
} from "./team-management.shared";
import { teamManagementRepository } from "../infrastructure/team-management.repository";

export function rankFreeAgentMarketPlayers(players: FreeAgentMarketPlayer[]) {
  return [...players].sort((left, right) => {
    if (right.teamNeedScore !== left.teamNeedScore) {
      return right.teamNeedScore - left.teamNeedScore;
    }

    if ((right.schemeFitScore ?? 0) !== (left.schemeFitScore ?? 0)) {
      return (right.schemeFitScore ?? 0) - (left.schemeFitScore ?? 0);
    }

    if (right.positionOverall !== left.positionOverall) {
      return right.positionOverall - left.positionOverall;
    }

    return left.age - right.age;
  });
}

export async function getFreeAgentMarketForUser(
  userId: string,
  saveGameId: string,
): Promise<FreeAgentMarket | null> {
  const saveGame = await teamManagementRepository.findFreeAgentMarketRecord(userId, saveGameId);
  const managerTeam = saveGame?.teams[0];
  const settings = saveGame?.settings;

  if (!managerTeam || !settings) {
    return null;
  }

  const teamSchemes = buildTeamSchemeCodes(managerTeam);
  const needs = buildTeamNeeds(
    managerTeam.rosterProfiles.map((profile) => {
      const attributes = toAttributeMap(profile.player.attributes);
      const compositeRatings = computePlayerCompositeRatings(attributes);

      return {
        positionCode: profile.primaryPosition.code,
        positionName: profile.primaryPosition.name,
        positionOverall: profile.player.evaluation?.positionOverall ?? 55,
        rosterStatus: profile.rosterStatus,
        schemeFitScore: computePlayerSchemeFitScore({
          positionGroupCode: profile.positionGroup.code,
          playerSchemeCode: profile.schemeFit?.code ?? null,
          teamSchemes,
          compositeRatings,
        }),
      };
    }),
  );
  const needByPosition = new Map(needs.map((need) => [need.positionCode, need.needScore]));

  const rankedPlayers = rankFreeAgentMarketPlayers(
    (saveGame?.players ?? [])
      .filter((player) => player.rosterProfile && player.evaluation)
      .map((player) => {
        const attributes = toAttributeMap(player.attributes);
        const compositeRatings = computePlayerCompositeRatings(attributes);
        const spotlightRatings = buildPlayerSpotlightRatings(
          player.rosterProfile?.primaryPosition.code ?? "QB",
          player.rosterProfile?.secondaryPosition?.code ?? null,
          compositeRatings,
        );
        const projectedSalary = Math.max(
          850_000,
          (player.evaluation?.positionOverall ?? 60) * 120_000,
        );
        const projectedCapHit = calculateCapHit(
          projectedSalary,
          calculateSigningBonus(
            projectedSalary,
            player.evaluation?.positionOverall ?? 60,
          ),
          1,
        );
        const schemeFitScore = computePlayerSchemeFitScore({
          positionGroupCode: player.rosterProfile?.positionGroup?.code ?? "OFFENSE",
          playerSchemeCode: player.rosterProfile?.schemeFit?.code ?? null,
          teamSchemes,
          compositeRatings,
        });

        return {
          id: player.id,
          fullName: `${player.firstName} ${player.lastName}`,
          age: player.age,
          yearsPro: player.yearsPro,
          positionCode: player.rosterProfile?.primaryPosition.code ?? "n/a",
          positionName: player.rosterProfile?.primaryPosition.name ?? "n/a",
          archetypeName: player.rosterProfile?.archetype?.name ?? null,
          schemeFitName: player.rosterProfile?.schemeFit?.name ?? null,
          positionOverall: player.evaluation?.positionOverall ?? 0,
          potentialRating: player.evaluation?.potentialRating ?? 0,
          physicalOverall: player.evaluation?.physicalOverall ?? 0,
          mentalOverall: player.evaluation?.mentalOverall ?? 0,
          projectedCapHit,
          schemeFitScore,
          teamNeedScore: needByPosition.get(player.rosterProfile?.primaryPosition.code ?? "") ?? 0,
          spotlightRatings,
        } satisfies FreeAgentMarketPlayer;
      }),
  );

  return {
    managerTeam: {
      id: managerTeam.id,
      name: `${managerTeam.city} ${managerTeam.nickname}`,
      abbreviation: managerTeam.abbreviation,
      cashBalance: Number(managerTeam.cashBalance),
      salaryCapSpace: Number(managerTeam.salaryCapSpace),
      overallRating: managerTeam.overallRating,
      rosterCount: managerTeam.rosterProfiles.length,
      activeLimit: settings.activeRosterLimit,
      practiceSquadSize: settings.practiceSquadSize,
      schemes: teamSchemes,
      needs,
    },
    players: rankedPlayers,
  };
}
