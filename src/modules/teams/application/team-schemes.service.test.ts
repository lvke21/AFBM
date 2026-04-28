import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  teamManagementRepository: {
    findManagedTeamContext: vi.fn(),
    findSchemeDefinitionByGroup: vi.fn(),
    updateTeamSchemeIds: vi.fn(),
  },
}));

vi.mock("../infrastructure/team-management.repository", () => ({
  teamManagementRepository: mocks.teamManagementRepository,
}));

import { updateTeamSchemesForUser } from "./team-schemes.service";

const managedContextRecord = {
  id: "save-1",
  currentSeasonId: "season-1",
  settings: {
    salaryCap: 120_000_000,
    activeRosterLimit: 53,
    practiceSquadSize: 16,
  },
  teams: [
    {
      id: "team-1",
      abbreviation: "BOS",
      city: "Boston",
      nickname: "Guardians",
      managerControlled: true,
      salaryCapSpace: 20_000_000,
      cashBalance: 30_000_000,
      offensiveSchemeFit: null,
      defensiveSchemeFit: null,
      specialTeamsSchemeFit: null,
    },
  ],
};

describe("updateTeamSchemesForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.teamManagementRepository.findManagedTeamContext.mockResolvedValue(
      managedContextRecord,
    );
    mocks.teamManagementRepository.findSchemeDefinitionByGroup
      .mockResolvedValueOnce({ code: "WEST_COAST", id: "scheme-offense", name: "West Coast" })
      .mockResolvedValueOnce({
        code: "ZONE_DISCIPLINE",
        id: "scheme-defense",
        name: "Zone Discipline",
      })
      .mockResolvedValueOnce({
        code: "FIELD_POSITION",
        id: "scheme-special-teams",
        name: "Field Position",
      });
    mocks.teamManagementRepository.updateTeamSchemeIds.mockResolvedValue({});
  });

  it("persists selected offense, defense and special-teams schemes", async () => {
    const result = await updateTeamSchemesForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      offenseSchemeCode: "WEST_COAST",
      defenseSchemeCode: "ZONE_DISCIPLINE",
      specialTeamsSchemeCode: "FIELD_POSITION",
    });

    expect(mocks.teamManagementRepository.updateTeamSchemeIds).toHaveBeenCalledWith(
      "team-1",
      {
        offensiveSchemeFitDefinitionId: "scheme-offense",
        defensiveSchemeFitDefinitionId: "scheme-defense",
        specialTeamsSchemeFitDefinitionId: "scheme-special-teams",
      },
    );
    expect(result).toEqual({
      defense: "Zone Discipline",
      offense: "West Coast",
      specialTeams: "Field Position",
    });
  });
});
