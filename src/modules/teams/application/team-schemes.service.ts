import { normalizeSchemeCode, requireManagedTeamContext } from "./team-management.shared";
import { teamManagementRepository } from "../infrastructure/team-management.repository";

export async function updateTeamSchemesForUser(input: {
  userId: string;
  saveGameId: string;
  teamId: string;
  offenseSchemeCode: string;
  defenseSchemeCode: string;
  specialTeamsSchemeCode: string;
}) {
  const context = await requireManagedTeamContext(input.userId, input.saveGameId, input.teamId);
  const [offenseScheme, defenseScheme, specialTeamsScheme] = await Promise.all([
    teamManagementRepository.findSchemeDefinitionByGroup(
      "OFFENSE",
      normalizeSchemeCode(input.offenseSchemeCode) ?? "",
    ),
    teamManagementRepository.findSchemeDefinitionByGroup(
      "DEFENSE",
      normalizeSchemeCode(input.defenseSchemeCode) ?? "",
    ),
    teamManagementRepository.findSchemeDefinitionByGroup(
      "SPECIAL_TEAMS",
      normalizeSchemeCode(input.specialTeamsSchemeCode) ?? "",
    ),
  ]);

  if (!offenseScheme || !defenseScheme || !specialTeamsScheme) {
    throw new Error("Scheme selection is incomplete");
  }

  await teamManagementRepository.updateTeamSchemeIds(context.team.id, {
    offensiveSchemeFitDefinitionId: offenseScheme.id,
    defensiveSchemeFitDefinitionId: defenseScheme.id,
    specialTeamsSchemeFitDefinitionId: specialTeamsScheme.id,
  });

  return {
    defense: defenseScheme.name ?? defenseScheme.code ?? input.defenseSchemeCode,
    offense: offenseScheme.name ?? offenseScheme.code ?? input.offenseSchemeCode,
    specialTeams:
      specialTeamsScheme.name ?? specialTeamsScheme.code ?? input.specialTeamsSchemeCode,
  };
}
