import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlayerStatus, RosterStatus, TeamFinanceEventType } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => {
  const tx = {};

  return {
    tx,
    teamManagementRepository: {
      findManagedTeamContext: vi.fn(),
      findManagedPlayerForContractAction: vi.fn(),
      findManagedPlayerForRelease: vi.fn(),
      findRosterAssignmentRecord: vi.fn(),
      listRosterAssignments: vi.fn(),
      findPositionIdByCode: vi.fn(),
      findFreeAgentForSigning: vi.fn(),
      runInTransaction: vi.fn(),
      countRosterUsage: vi.fn(),
      findNextDepthSlot: vi.fn(),
      updateRosterProfile: vi.fn(),
      updatePlayer: vi.fn(),
      updateContract: vi.fn(),
      createContract: vi.fn(),
      createRosterTransaction: vi.fn(),
    },
    createPlayerHistoryEvent: vi.fn(),
    createSeasonStatShells: vi.fn(),
    recalculateTeamState: vi.fn(),
    recordTeamFinanceEvent: vi.fn(),
  };
});

vi.mock("../infrastructure/team-management.repository", () => ({
  teamManagementRepository: mocks.teamManagementRepository,
}));

vi.mock("@/modules/players/application/player-history.service", () => ({
  createPlayerHistoryEvent: mocks.createPlayerHistoryEvent,
}));

vi.mock("@/modules/savegames/application/bootstrap/player-stat-shells", () => ({
  createSeasonStatShells: mocks.createSeasonStatShells,
}));

vi.mock("@/modules/seasons/infrastructure/simulation/player-development", () => ({
  recalculateTeamState: mocks.recalculateTeamState,
}));

vi.mock("@/modules/teams/application/team-finance.service", () => ({
  recordTeamFinanceEvent: mocks.recordTeamFinanceEvent,
}));

import {
  extendPlayerContractForUser,
  moveDepthChartPlayerForUser,
  releasePlayerForUser,
  signFreeAgentForUser,
  updateRosterAssignmentForUser,
} from "./team-roster.service";

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

const freeAgentRecord = {
  id: "player-1",
  firstName: "Alex",
  lastName: "Free",
  injuryStatus: "HEALTHY",
  rosterProfile: {
    practiceSquadEligible: true,
    primaryPositionDefinitionId: "position-qb",
    primaryPosition: {
      code: "QB",
      name: "Quarterback",
    },
    secondaryPosition: null,
  },
  evaluation: {
    positionOverall: 74,
    potentialRating: 80,
  },
  playerSeasonStats: [],
};

const managedContractPlayerRecord = {
  id: "player-2",
  firstName: "Casey",
  lastName: "Starter",
  injuryStatus: "HEALTHY",
  rosterProfile: {
    primaryPosition: {
      code: "WR",
    },
  },
  evaluation: {
    positionOverall: 78,
  },
  contracts: [
    {
      id: "contract-1",
      years: 1,
      yearlySalary: 7_000_000,
      signingBonus: 1_500_000,
      capHit: 8_500_000,
    },
  ],
};

const managedRosterAssignmentRecord = {
  playerId: "player-2",
  rosterStatus: RosterStatus.BACKUP,
  depthChartSlot: 2,
  captainFlag: false,
  developmentFocus: false,
  primaryPosition: {
    code: "WR",
  },
  player: {
    firstName: "Casey",
    lastName: "Starter",
    injuryStatus: "HEALTHY",
  },
};

describe("updateRosterAssignmentForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.teamManagementRepository.findManagedTeamContext.mockResolvedValue(
      managedContextRecord,
    );
    mocks.teamManagementRepository.findRosterAssignmentRecord.mockResolvedValue(
      managedRosterAssignmentRecord,
    );
    mocks.teamManagementRepository.listRosterAssignments.mockResolvedValue([
      {
        playerId: "player-2",
        rosterStatus: RosterStatus.BACKUP,
        depthChartSlot: 2,
        primaryPosition: { code: "WR" },
        player: { firstName: "Casey", lastName: "Starter" },
      },
      {
        playerId: "player-3",
        rosterStatus: RosterStatus.BACKUP,
        depthChartSlot: 1,
        primaryPosition: { code: "WR" },
        player: { firstName: "Riley", lastName: "Conflict" },
      },
    ]);
    mocks.teamManagementRepository.findPositionIdByCode.mockImplementation(async (code) => ({
      id: `position-${String(code).toLowerCase()}`,
    }));
    mocks.teamManagementRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(mocks.tx as never),
    );
    mocks.teamManagementRepository.updateRosterProfile.mockResolvedValue({});
    mocks.createPlayerHistoryEvent.mockResolvedValue(undefined);
  });

  it("assigns a clear slot and writes only roster assignment fields", async () => {
    const result = await updateRosterAssignmentForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-2",
      depthChartSlot: 3,
      rosterStatus: RosterStatus.ROTATION,
      captainFlag: true,
      developmentFocus: true,
      specialRole: null,
    });

    expect(result).toMatchObject({
      depthChartSlot: 3,
      playerName: "Casey Starter",
      positionCode: "WR",
      rosterStatus: RosterStatus.ROTATION,
    });
    expect(mocks.teamManagementRepository.updateRosterProfile).toHaveBeenCalledWith(
      mocks.tx,
      "player-2",
      "save-1",
      expect.objectContaining({
        depthChartSlot: 3,
        rosterStatus: RosterStatus.ROTATION,
        captainFlag: true,
        developmentFocus: true,
      }),
    );
  });

  it("clears the active slot when a player is made inactive", async () => {
    await updateRosterAssignmentForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-2",
      depthChartSlot: 2,
      rosterStatus: RosterStatus.INACTIVE,
      captainFlag: false,
      developmentFocus: false,
      specialRole: "KR",
    });

    expect(mocks.teamManagementRepository.updateRosterProfile).toHaveBeenCalledWith(
      mocks.tx,
      "player-2",
      "save-1",
      expect.objectContaining({
        depthChartSlot: null,
        rosterStatus: RosterStatus.INACTIVE,
        secondaryPositionDefinitionId: null,
      }),
    );
  });

  it("rejects occupied active slots so conflicts are resolved by reassignment first", async () => {
    await expect(
      updateRosterAssignmentForUser({
        userId: "user-1",
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-2",
        depthChartSlot: 1,
        rosterStatus: RosterStatus.STARTER,
        captainFlag: false,
        developmentFocus: false,
        specialRole: null,
      }),
    ).rejects.toThrow("Depth chart slot 1 is already assigned");

    expect(mocks.teamManagementRepository.updateRosterProfile).not.toHaveBeenCalled();
  });

  it("rejects invalid depth slots before writing roster state", async () => {
    await expect(
      updateRosterAssignmentForUser({
        userId: "user-1",
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-2",
        depthChartSlot: 0,
        rosterStatus: RosterStatus.BACKUP,
        captainFlag: false,
        developmentFocus: false,
        specialRole: null,
      }),
    ).rejects.toThrow("Depth chart slot must be a positive whole number");

    expect(mocks.teamManagementRepository.updateRosterProfile).not.toHaveBeenCalled();
  });

  it("keeps injured reserve restricted to injured players", async () => {
    await expect(
      updateRosterAssignmentForUser({
        userId: "user-1",
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-2",
        depthChartSlot: null,
        rosterStatus: RosterStatus.INJURED_RESERVE,
        captainFlag: false,
        developmentFocus: false,
        specialRole: null,
      }),
    ).rejects.toThrow("Only injured players can be moved to injured reserve");
  });
});

describe("moveDepthChartPlayerForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.teamManagementRepository.findManagedTeamContext.mockResolvedValue(
      managedContextRecord,
    );
    mocks.teamManagementRepository.listRosterAssignments.mockResolvedValue([
      {
        playerId: "player-2",
        rosterStatus: RosterStatus.BACKUP,
        depthChartSlot: 2,
        primaryPosition: { code: "WR" },
        player: { firstName: "Casey", lastName: "Starter" },
      },
      {
        playerId: "player-3",
        rosterStatus: RosterStatus.STARTER,
        depthChartSlot: 1,
        primaryPosition: { code: "WR" },
        player: { firstName: "Riley", lastName: "Target" },
      },
    ]);
    mocks.teamManagementRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(mocks.tx as never),
    );
    mocks.teamManagementRepository.updateRosterProfile.mockResolvedValue({});
    mocks.createPlayerHistoryEvent.mockResolvedValue(undefined);
  });

  it("swaps adjacent depth chart players inside one position", async () => {
    const result = await moveDepthChartPlayerForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-2",
      currentSlot: 2,
      targetSlot: 1,
      targetPlayerId: "player-3",
    });

    expect(result).toMatchObject({
      currentSlot: 2,
      depthChartSlot: 1,
      playerName: "Casey Starter",
      positionCode: "WR",
      swappedWithPlayerName: "Riley Target",
    });
    expect(mocks.teamManagementRepository.updateRosterProfile).toHaveBeenNthCalledWith(
      1,
      mocks.tx,
      "player-3",
      "save-1",
      { depthChartSlot: 2 },
    );
    expect(mocks.teamManagementRepository.updateRosterProfile).toHaveBeenNthCalledWith(
      2,
      mocks.tx,
      "player-2",
      "save-1",
      { depthChartSlot: 1 },
    );
    expect(mocks.createPlayerHistoryEvent).toHaveBeenCalledTimes(2);
  });

  it("moves into an empty adjacent slot without changing other roles", async () => {
    mocks.teamManagementRepository.listRosterAssignments.mockResolvedValue([
      {
        playerId: "player-2",
        rosterStatus: RosterStatus.BACKUP,
        depthChartSlot: 2,
        primaryPosition: { code: "WR" },
        player: { firstName: "Casey", lastName: "Starter" },
      },
    ]);

    const result = await moveDepthChartPlayerForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-2",
      currentSlot: 2,
      targetSlot: 3,
      targetPlayerId: null,
    });

    expect(result.swappedWithPlayerName).toBeNull();
    expect(mocks.teamManagementRepository.updateRosterProfile).toHaveBeenCalledTimes(1);
    expect(mocks.teamManagementRepository.updateRosterProfile).toHaveBeenCalledWith(
      mocks.tx,
      "player-2",
      "save-1",
      { depthChartSlot: 3 },
    );
  });

  it("rejects moves across positions", async () => {
    mocks.teamManagementRepository.listRosterAssignments.mockResolvedValue([
      {
        playerId: "player-2",
        rosterStatus: RosterStatus.BACKUP,
        depthChartSlot: 2,
        primaryPosition: { code: "WR" },
        player: { firstName: "Casey", lastName: "Starter" },
      },
      {
        playerId: "player-3",
        rosterStatus: RosterStatus.STARTER,
        depthChartSlot: 1,
        primaryPosition: { code: "QB" },
        player: { firstName: "Riley", lastName: "Target" },
      },
    ]);

    await expect(
      moveDepthChartPlayerForUser({
        userId: "user-1",
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-2",
        currentSlot: 2,
        targetSlot: 1,
        targetPlayerId: "player-3",
      }),
    ).rejects.toThrow("same position");

    expect(mocks.teamManagementRepository.updateRosterProfile).not.toHaveBeenCalled();
  });

  it("rejects non-adjacent move jumps", async () => {
    await expect(
      moveDepthChartPlayerForUser({
        userId: "user-1",
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-2",
        currentSlot: 2,
        targetSlot: 5,
        targetPlayerId: null,
      }),
    ).rejects.toThrow("adjacent slots");

    expect(mocks.teamManagementRepository.listRosterAssignments).not.toHaveBeenCalled();
    expect(mocks.teamManagementRepository.updateRosterProfile).not.toHaveBeenCalled();
  });
});

describe("signFreeAgentForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.teamManagementRepository.findManagedTeamContext.mockResolvedValue(
      managedContextRecord,
    );
    mocks.teamManagementRepository.findManagedPlayerForContractAction.mockResolvedValue(
      managedContractPlayerRecord,
    );
    mocks.teamManagementRepository.findManagedPlayerForRelease.mockResolvedValue(
      managedContractPlayerRecord,
    );
    mocks.teamManagementRepository.findFreeAgentForSigning.mockResolvedValue(freeAgentRecord);
    mocks.teamManagementRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(mocks.tx as never),
    );
    mocks.teamManagementRepository.countRosterUsage.mockResolvedValue({
      activeRosterCount: 50,
      practiceSquadCount: 4,
      rosterProfiles: [],
    });
    mocks.teamManagementRepository.findNextDepthSlot.mockResolvedValue(2);
    mocks.teamManagementRepository.updateRosterProfile.mockResolvedValue({});
    mocks.teamManagementRepository.updatePlayer.mockResolvedValue({});
    mocks.teamManagementRepository.updateContract.mockResolvedValue({});
    mocks.teamManagementRepository.createContract.mockResolvedValue({});
    mocks.teamManagementRepository.createRosterTransaction.mockResolvedValue({});
    mocks.createSeasonStatShells.mockResolvedValue(undefined);
    mocks.createPlayerHistoryEvent.mockResolvedValue(undefined);
    mocks.recordTeamFinanceEvent.mockResolvedValue(undefined);
    mocks.recalculateTeamState.mockResolvedValue(undefined);
  });

  it("validates cap before signing", async () => {
    mocks.teamManagementRepository.findManagedTeamContext.mockResolvedValue({
      ...managedContextRecord,
      teams: [
        {
          ...managedContextRecord.teams[0],
          salaryCapSpace: 100,
        },
      ],
    });

    await expect(
      signFreeAgentForUser({
        userId: "user-1",
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-1",
        years: 2,
        yearlySalary: 45_000_000,
      }),
    ).rejects.toThrow("Not enough salary cap space");

    expect(mocks.teamManagementRepository.updateRosterProfile).not.toHaveBeenCalled();
    expect(mocks.teamManagementRepository.createContract).not.toHaveBeenCalled();
    expect(mocks.recordTeamFinanceEvent).not.toHaveBeenCalled();
  });

  it("moves the player onto the managed team roster", async () => {
    const result = await signFreeAgentForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-1",
      years: 2,
      yearlySalary: 9_000_000,
    });

    expect(result).toEqual(
      expect.objectContaining({
        capHit: expect.any(Number),
        depthChartSlot: 3,
        playerName: "Alex Free",
        rosterStatus: RosterStatus.BACKUP,
        signingBonus: expect.any(Number),
        valueLabel: expect.any(String),
        valueReason: expect.any(String),
        valueScore: expect.any(Number),
      }),
    );
    expect(mocks.teamManagementRepository.updateRosterProfile).toHaveBeenCalledWith(
      mocks.tx,
      "player-1",
      "save-1",
      expect.objectContaining({
        teamId: "team-1",
        rosterStatus: RosterStatus.BACKUP,
        depthChartSlot: 3,
        captainFlag: false,
      }),
    );
    expect(mocks.teamManagementRepository.updatePlayer).toHaveBeenCalledWith(
      mocks.tx,
      "player-1",
      {
        status: PlayerStatus.ACTIVE,
      },
    );
  });

  it("lets players reject clearly weak offers before signing", async () => {
    await expect(
      signFreeAgentForUser({
        userId: "user-1",
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-1",
        years: 1,
        yearlySalary: 850_000,
      }),
    ).rejects.toThrow("Player rejected the offer");

    expect(mocks.teamManagementRepository.runInTransaction).not.toHaveBeenCalled();
    expect(mocks.teamManagementRepository.createContract).not.toHaveBeenCalled();
  });

  it("creates contract, finance event and stat shells", async () => {
    await signFreeAgentForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-1",
      years: 2,
      yearlySalary: 9_000_000,
    });

    expect(mocks.teamManagementRepository.createContract).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({
        saveGameId: "save-1",
        playerId: "player-1",
        teamId: "team-1",
        startSeasonId: "season-1",
        years: 2,
        yearlySalary: 9_000_000,
      }),
    );
    expect(mocks.recordTeamFinanceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tx: mocks.tx,
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: "player-1",
        seasonId: "season-1",
        type: TeamFinanceEventType.SIGNING_BONUS,
        amount: expect.any(Number),
        capImpact: expect.any(Number),
      }),
    );
    expect(mocks.recordTeamFinanceEvent.mock.calls[0][0].amount).toBeLessThan(0);
    expect(mocks.recordTeamFinanceEvent.mock.calls[0][0].capImpact).toBeLessThan(0);
    expect(mocks.createSeasonStatShells).toHaveBeenCalledWith(
      expect.objectContaining({
        tx: mocks.tx,
        saveGameId: "save-1",
        seasonId: "season-1",
        teamId: "team-1",
        playerId: "player-1",
      }),
    );
  });
});

describe("contract actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.teamManagementRepository.findManagedTeamContext.mockResolvedValue(
      managedContextRecord,
    );
    mocks.teamManagementRepository.findManagedPlayerForContractAction.mockResolvedValue(
      managedContractPlayerRecord,
    );
    mocks.teamManagementRepository.findManagedPlayerForRelease.mockResolvedValue(
      managedContractPlayerRecord,
    );
    mocks.teamManagementRepository.runInTransaction.mockImplementation(async (callback) =>
      callback(mocks.tx as never),
    );
    mocks.teamManagementRepository.updateRosterProfile.mockResolvedValue({});
    mocks.teamManagementRepository.updatePlayer.mockResolvedValue({});
    mocks.teamManagementRepository.updateContract.mockResolvedValue({});
    mocks.teamManagementRepository.createContract.mockResolvedValue({});
    mocks.teamManagementRepository.createRosterTransaction.mockResolvedValue({});
    mocks.createPlayerHistoryEvent.mockResolvedValue(undefined);
    mocks.recordTeamFinanceEvent.mockResolvedValue(undefined);
    mocks.recalculateTeamState.mockResolvedValue(undefined);
  });

  it("extends an active contract and reports the cap change", async () => {
    const result = await extendPlayerContractForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-2",
      years: 3,
      yearlySalary: 8_000_000,
    });

    expect(mocks.teamManagementRepository.updateContract).toHaveBeenCalledWith(
      mocks.tx,
      "contract-1",
      expect.objectContaining({
        capHit: 0,
        status: "RELEASED",
      }),
    );
    expect(mocks.teamManagementRepository.createContract).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({
        playerId: "player-2",
        teamId: "team-1",
        years: 3,
        yearlySalary: 8_000_000,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        playerName: "Casey Starter",
        previousCapHit: 8_500_000,
        years: 3,
      }),
    );
    expect(mocks.recordTeamFinanceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TeamFinanceEventType.SIGNING_BONUS,
        capImpact: result.capDelta,
      }),
    );
    expect(mocks.recalculateTeamState).toHaveBeenCalledWith(
      mocks.tx,
      "save-1",
      "team-1",
    );
  });

  it("releases a player with dead cap and cap savings", async () => {
    const result = await releasePlayerForUser({
      userId: "user-1",
      saveGameId: "save-1",
      teamId: "team-1",
      playerId: "player-2",
    });

    expect(result).toEqual({
      capHit: 8_500_000,
      capSavings: 7_000_000,
      deadCap: 1_500_000,
      playerName: "Casey Starter",
    });
    expect(mocks.teamManagementRepository.updateContract).toHaveBeenCalledWith(
      mocks.tx,
      "contract-1",
      expect.objectContaining({
        capHit: 1_500_000,
        status: "RELEASED",
      }),
    );
    expect(mocks.recordTeamFinanceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TeamFinanceEventType.RELEASE_PAYOUT,
        capImpact: 7_000_000,
      }),
    );
  });
});
