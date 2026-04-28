import type { PreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";
import { MatchStatus } from "@/modules/shared/domain/enums";
import { updateTeamSchemesForUser } from "@/modules/teams/application/team-schemes.service";

import { matchPreparationRepository } from "../infrastructure/match-preparation.repository";

export type UpdateMatchPreparationInput = {
  userId: string;
  saveGameId: string;
  matchId: string;
  teamId: string;
  offenseSchemeCode: string;
  defenseSchemeCode: string;
  specialTeamsSchemeCode: string;
  offenseXFactorPlan: PreGameXFactorPlan;
  defenseXFactorPlan: PreGameXFactorPlan;
};

type MatchPreparationContext = NonNullable<
  Awaited<ReturnType<typeof matchPreparationRepository.findMatchPreparationContext>>
>;

export function getManagedMatchTeam(match: MatchPreparationContext) {
  return [match.homeTeam, match.awayTeam].find((team) => team.managerControlled) ?? null;
}

export async function updateMatchPreparationForUser(input: UpdateMatchPreparationInput) {
  const match = await matchPreparationRepository.findMatchPreparationContext(
    input.userId,
    input.saveGameId,
    input.matchId,
  );

  if (!match) {
    throw new Error("Match preparation context not found");
  }

  if (match.status !== MatchStatus.SCHEDULED) {
    throw new Error("Gameplan can only be changed before kickoff");
  }

  const managerTeam = getManagedMatchTeam(match);

  if (!managerTeam || managerTeam.id !== input.teamId) {
    throw new Error("Only the manager-controlled team can change this gameplan");
  }

  const schemes = await updateTeamSchemesForUser({
    userId: input.userId,
    saveGameId: input.saveGameId,
    teamId: input.teamId,
    offenseSchemeCode: input.offenseSchemeCode,
    defenseSchemeCode: input.defenseSchemeCode,
    specialTeamsSchemeCode: input.specialTeamsSchemeCode,
  });
  await matchPreparationRepository.updateTeamXFactorPlan(input.teamId, {
    offenseXFactorPlan: input.offenseXFactorPlan,
    defenseXFactorPlan: input.defenseXFactorPlan,
  });

  return {
    defenseXFactorPlan: input.defenseXFactorPlan,
    offenseXFactorPlan: input.offenseXFactorPlan,
    matchId: match.id,
    schemes,
    teamId: managerTeam.id,
  };
}
