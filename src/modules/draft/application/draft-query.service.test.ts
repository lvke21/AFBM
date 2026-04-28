import { beforeEach, describe, expect, it, vi } from "vitest";

import { DraftPlayerStatus, DraftRiskLevel, ScoutingLevel } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => ({
  prisma: {
    draftClass: {
      findFirst: vi.fn(),
    },
    draftPlayer: {
      findMany: vi.fn(),
    },
    playerRosterProfile: {
      findMany: vi.fn(),
    },
    saveGame: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

import { getDraftOverviewForUser } from "./draft-query.service";

const saveGameRecord = {
  currentSeasonId: "season-1",
  id: "save-1",
  teams: [
    {
      abbreviation: "BOS",
      city: "Boston",
      id: "team-1",
      nickname: "Guardians",
    },
  ],
};

const draftClassRecord = {
  id: "draft-class-1",
  name: "2027 Draft Class",
  status: "UPCOMING",
  year: 2027,
};

function prospect(overrides = {}) {
  return {
    age: 22,
    college: "Great Lakes",
    draftedByTeam: null,
    draftedByTeamId: null,
    draftedPickNumber: null,
    draftedRound: null,
    firstName: "Cole",
    id: "prospect-1",
    lastName: "Harrison",
    position: {
      code: "QB",
      name: "Quarterback",
    },
    projectedRound: 1,
    riskLevel: DraftRiskLevel.MEDIUM,
    scoutingData: [
      {
        level: ScoutingLevel.FOCUSED,
        notes: "Ready for full board discussion.",
        strengths: ["Decision making", "Accuracy"],
        visibleOverallMax: 74,
        visibleOverallMin: 70,
        visiblePotentialMax: 90,
        visiblePotentialMin: 86,
        weaknesses: ["Deep velocity"],
      },
    ],
    status: DraftPlayerStatus.AVAILABLE,
    trueOverall: 72,
    truePotential: 88,
    ...overrides,
  };
}

describe("getDraftOverviewForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.saveGame.findFirst.mockResolvedValue(saveGameRecord);
    mocks.prisma.draftClass.findFirst.mockResolvedValue(draftClassRecord);
    mocks.prisma.draftPlayer.findMany.mockResolvedValue([prospect()]);
    mocks.prisma.playerRosterProfile.findMany.mockResolvedValue([
      {
        primaryPosition: {
          code: "LT",
          name: "Left Tackle",
        },
        player: {
          evaluation: {
            positionOverall: 58,
          },
        },
        rosterStatus: "STARTER",
      },
    ]);
  });

  it("returns null when the user cannot access the savegame", async () => {
    mocks.prisma.saveGame.findFirst.mockResolvedValue(null);

    await expect(getDraftOverviewForUser("user-1", "save-1")).resolves.toBeNull();

    expect(mocks.prisma.draftClass.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.draftPlayer.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.playerRosterProfile.findMany).not.toHaveBeenCalled();
  });

  it("handles missing draft classes without throwing", async () => {
    mocks.prisma.draftClass.findFirst.mockResolvedValue(null);

    const result = await getDraftOverviewForUser("user-1", "save-1");

    expect(result).toEqual({
      draftClass: null,
      managerTeam: {
        abbreviation: "BOS",
        id: "team-1",
        name: "Boston Guardians",
      },
      managerTeamId: "team-1",
      managerDraftedPlayers: [],
      prospects: [],
      saveGameId: "save-1",
      summary: {
        availableProspects: 0,
        basicScouted: 0,
        focusedScouted: 0,
        totalProspects: 0,
      },
    });
  });

  it("maps prospects to a scouting-aware view model", async () => {
    mocks.prisma.draftPlayer.findMany.mockResolvedValue([
      prospect(),
      prospect({
        firstName: "Jalen",
        id: "prospect-2",
        lastName: "Brooks",
        position: {
          code: "WR",
          name: "Wide Receiver",
        },
        riskLevel: DraftRiskLevel.LOW,
        scoutingData: [
          {
            level: ScoutingLevel.BASIC,
            notes: "Basic report only.",
            strengths: ["Separation"],
            visibleOverallMax: 75,
            visibleOverallMin: 65,
            visiblePotentialMax: 91,
            visiblePotentialMin: 81,
            weaknesses: ["Blocking"],
          },
        ],
      }),
      prospect({
        firstName: "Owen",
        id: "prospect-3",
        lastName: "Price",
        position: {
          code: "LT",
          name: "Left Tackle",
        },
        scoutingData: [],
        draftedByTeam: {
          abbreviation: "BOS",
          city: "Boston",
          nickname: "Guardians",
        },
        draftedByTeamId: "team-1",
        draftedPickNumber: 7,
        draftedRound: 1,
        status: DraftPlayerStatus.DRAFTED,
      }),
    ]);

    const result = await getDraftOverviewForUser("user-1", "save-1");

    expect(result?.draftClass).toEqual({
      canPick: false,
      id: "draft-class-1",
      name: "2027 Draft Class",
      prospectCount: 3,
      status: "UPCOMING",
      year: 2027,
    });
    expect(result?.summary).toEqual({
      availableProspects: 2,
      basicScouted: 1,
      focusedScouted: 1,
      totalProspects: 3,
    });
    expect(result?.managerDraftedPlayers).toEqual([
      expect.objectContaining({
        draftedByTeamId: "team-1",
        draftedByTeamName: "Boston Guardians",
        fullName: "Owen Price",
        teamNeedRelevance: expect.objectContaining({
          label: expect.any(String),
          score: expect.any(Number),
        }),
        teamConsequence: {
          label: "Rookie Rights",
          status: "Needs Contract",
        },
      }),
    ]);
    expect(result?.prospects[0]).toEqual(
      expect.objectContaining({
        draftedByTeamId: null,
        fullName: "Cole Harrison",
        notes: "Ready for full board discussion.",
        positionCode: "QB",
        positionName: "Quarterback",
        riskLevel: DraftRiskLevel.MEDIUM,
        status: DraftPlayerStatus.AVAILABLE,
        strengths: ["Decision making", "Accuracy"],
        visibleOverall: "70-74",
        visiblePotential: "86-90",
        weaknesses: ["Deep velocity"],
      }),
    );
    expect(result?.prospects[1]).toEqual(
      expect.objectContaining({
        notes: null,
        riskLevel: DraftRiskLevel.LOW,
        visibleOverall: "65-75",
        visiblePotential: "Unbekannt",
        weaknesses: [],
      }),
    );
    expect(result?.prospects[2]).toEqual(
      expect.objectContaining({
        riskLevel: "Unbekannt",
        draftedByTeamName: "Boston Guardians",
        draftedByTeamId: "team-1",
        draftedPickNumber: 7,
        draftedRound: 1,
        status: DraftPlayerStatus.DRAFTED,
        visibleOverall: "Unbekannt",
        visiblePotential: "Unbekannt",
      }),
    );
  });
});
