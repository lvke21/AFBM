import { beforeEach, describe, expect, it, vi } from "vitest";

import { MatchStatus } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => ({
  matchPreparationRepository: {
    findMatchPreparationContext: vi.fn(),
    updateTeamXFactorPlan: vi.fn(),
  },
  updateTeamSchemesForUser: vi.fn(),
}));

vi.mock("../infrastructure/match-preparation.repository", () => ({
  matchPreparationRepository: mocks.matchPreparationRepository,
}));

vi.mock("@/modules/teams/application/team-schemes.service", () => ({
  updateTeamSchemesForUser: mocks.updateTeamSchemesForUser,
}));

import { updateMatchPreparationForUser } from "./match-preparation.service";

const scheduledMatch = {
  id: "match-1",
  status: MatchStatus.SCHEDULED,
  homeTeam: {
    id: "team-1",
    managerControlled: true,
  },
  awayTeam: {
    id: "team-2",
    managerControlled: false,
  },
};

describe("updateMatchPreparationForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.matchPreparationRepository.findMatchPreparationContext.mockResolvedValue(scheduledMatch);
    mocks.matchPreparationRepository.updateTeamXFactorPlan.mockResolvedValue(undefined);
    mocks.updateTeamSchemesForUser.mockResolvedValue(undefined);
  });

  it("stores the manager gameplan for a scheduled match", async () => {
    await updateMatchPreparationForUser({
      userId: "user-1",
      saveGameId: "save-1",
      matchId: "match-1",
      teamId: "team-1",
      offenseSchemeCode: "WEST_COAST",
      defenseSchemeCode: "ZONE_DISCIPLINE",
      specialTeamsSchemeCode: "FIELD_POSITION",
      offenseXFactorPlan: {
        offensiveFocus: "PASS_FIRST",
        defensiveFocus: "BALANCED",
        aggression: "AGGRESSIVE",
        tempoPlan: "HURRY_UP",
        protectionPlan: "FAST_RELEASE",
        offensiveMatchupFocus: "FEATURE_WR",
        defensiveMatchupFocus: "BALANCED",
        turnoverPlan: "BALANCED",
      },
      defenseXFactorPlan: {
        offensiveFocus: "BALANCED",
        defensiveFocus: "LIMIT_PASS",
        aggression: "BALANCED",
        tempoPlan: "NORMAL",
        protectionPlan: "STANDARD",
        offensiveMatchupFocus: "BALANCED",
        defensiveMatchupFocus: "DOUBLE_WR1",
        turnoverPlan: "HUNT_TURNOVERS",
      },
    });

    expect(mocks.updateTeamSchemesForUser).toHaveBeenCalledWith({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      offenseSchemeCode: "WEST_COAST",
      defenseSchemeCode: "ZONE_DISCIPLINE",
      specialTeamsSchemeCode: "FIELD_POSITION",
    });
    expect(mocks.matchPreparationRepository.updateTeamXFactorPlan).toHaveBeenCalledWith("team-1", {
      offenseXFactorPlan: expect.objectContaining({
        offensiveFocus: "PASS_FIRST",
        protectionPlan: "FAST_RELEASE",
      }),
      defenseXFactorPlan: expect.objectContaining({
        defensiveFocus: "LIMIT_PASS",
        defensiveMatchupFocus: "DOUBLE_WR1",
      }),
    });
  });

  it("rejects gameplan changes after kickoff", async () => {
    mocks.matchPreparationRepository.findMatchPreparationContext.mockResolvedValue({
      ...scheduledMatch,
      status: MatchStatus.COMPLETED,
    });

    await expect(
      updateMatchPreparationForUser({
        userId: "user-1",
        saveGameId: "save-1",
        matchId: "match-1",
        teamId: "team-1",
        offenseSchemeCode: "WEST_COAST",
        defenseSchemeCode: "ZONE_DISCIPLINE",
        specialTeamsSchemeCode: "FIELD_POSITION",
        offenseXFactorPlan: {
          offensiveFocus: "BALANCED",
          defensiveFocus: "BALANCED",
          aggression: "BALANCED",
          tempoPlan: "NORMAL",
          protectionPlan: "STANDARD",
          offensiveMatchupFocus: "BALANCED",
          defensiveMatchupFocus: "BALANCED",
          turnoverPlan: "BALANCED",
        },
        defenseXFactorPlan: {
          offensiveFocus: "BALANCED",
          defensiveFocus: "BALANCED",
          aggression: "BALANCED",
          tempoPlan: "NORMAL",
          protectionPlan: "STANDARD",
          offensiveMatchupFocus: "BALANCED",
          defensiveMatchupFocus: "BALANCED",
          turnoverPlan: "BALANCED",
        },
      }),
    ).rejects.toThrow("Gameplan can only be changed before kickoff");

    expect(mocks.updateTeamSchemesForUser).not.toHaveBeenCalled();
  });

  it("rejects changes for non-manager teams", async () => {
    await expect(
      updateMatchPreparationForUser({
        userId: "user-1",
        saveGameId: "save-1",
        matchId: "match-1",
        teamId: "team-2",
        offenseSchemeCode: "WEST_COAST",
        defenseSchemeCode: "ZONE_DISCIPLINE",
        specialTeamsSchemeCode: "FIELD_POSITION",
        offenseXFactorPlan: {
          offensiveFocus: "BALANCED",
          defensiveFocus: "BALANCED",
          aggression: "BALANCED",
          tempoPlan: "NORMAL",
          protectionPlan: "STANDARD",
          offensiveMatchupFocus: "BALANCED",
          defensiveMatchupFocus: "BALANCED",
          turnoverPlan: "BALANCED",
        },
        defenseXFactorPlan: {
          offensiveFocus: "BALANCED",
          defensiveFocus: "BALANCED",
          aggression: "BALANCED",
          tempoPlan: "NORMAL",
          protectionPlan: "STANDARD",
          offensiveMatchupFocus: "BALANCED",
          defensiveMatchupFocus: "BALANCED",
          turnoverPlan: "BALANCED",
        },
      }),
    ).rejects.toThrow("Only the manager-controlled team can change this gameplan");

    expect(mocks.updateTeamSchemesForUser).not.toHaveBeenCalled();
  });
});
