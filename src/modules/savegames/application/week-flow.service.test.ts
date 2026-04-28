import { beforeEach, describe, expect, it, vi } from "vitest";

import { MatchStatus, SeasonPhase, WeekState } from "@/modules/shared/domain/enums";

const mocks = vi.hoisted(() => {
  const tx = {
    match: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    matchSimulationDrive: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    saveGame: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    player: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    playerRosterProfile: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    season: {
      update: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    teamMatchStat: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    teamSeasonStat: {
      upsert: vi.fn(),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(),
    },
    weeklyDevelopment: {
      applyWeeklyDevelopmentForSaveGame: vi.fn(),
    },
    tx,
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("./weekly-player-development.service", () => ({
  applyWeeklyDevelopmentForSaveGame: mocks.weeklyDevelopment.applyWeeklyDevelopmentForSaveGame,
}));

import {
  advanceWeekForUser,
  finishGameForUser,
  prepareWeekForUser,
  startGameForUser,
} from "./week-flow.service";

function createContext(weekState: WeekState, overrides = {}) {
  return {
    id: "save-1",
    currentSeason: {
      id: "season-1",
      phase: SeasonPhase.REGULAR_SEASON,
      week: 1,
    },
    settings: {
      seasonLengthWeeks: 14,
    },
    weekState,
    ...overrides,
  };
}

describe("week-flow.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx as never),
    );
    mocks.tx.saveGame.update.mockResolvedValue({});
    mocks.tx.match.update.mockResolvedValue({});
    mocks.tx.matchSimulationDrive.createMany.mockResolvedValue({ count: 0 });
    mocks.tx.matchSimulationDrive.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.season.update.mockResolvedValue({});
    mocks.tx.team.findFirst.mockResolvedValue({ id: "team-1" });
    mocks.tx.teamMatchStat.findUnique.mockResolvedValue({
      explosivePlays: 1,
      firstDowns: 12,
      passingYards: 120,
      redZoneTouchdowns: 2,
      redZoneTrips: 3,
      rushingYards: 80,
      sacks: 1,
      timeOfPossessionSeconds: 1500,
      totalYards: 200,
      turnovers: 1,
    });
    mocks.tx.teamMatchStat.upsert.mockResolvedValue({});
    mocks.tx.teamSeasonStat.upsert.mockResolvedValue({});
    mocks.tx.player.findMany.mockResolvedValue([]);
    mocks.tx.player.update.mockResolvedValue({});
    mocks.tx.playerRosterProfile.updateMany.mockResolvedValue({ count: 0 });
    mocks.tx.playerRosterProfile.findMany.mockResolvedValue([]);
    mocks.tx.match.findFirst.mockResolvedValue({
      id: "match-1",
      awayScore: null,
      awayTeam: {
        abbreviation: "AWY",
        city: "Away",
        id: "away-team",
        nickname: "Team",
        overallRating: 70,
      },
      homeScore: null,
      homeTeam: {
        abbreviation: "HME",
        city: "Home",
        id: "home-team",
        nickname: "Team",
        overallRating: 74,
      },
      week: 1,
    });
    mocks.tx.match.findMany.mockResolvedValue([]);
    mocks.tx.match.count.mockResolvedValue(0);
    mocks.weeklyDevelopment.applyWeeklyDevelopmentForSaveGame.mockResolvedValue({
      changedPlayers: 0,
      skippedAlreadyDeveloped: 0,
      touchedTeamIds: [],
    });
  });

  it("prepareWeek moves PRE_WEEK to READY", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.PRE_WEEK));
    mocks.tx.match.count.mockResolvedValue(1);

    const result = await prepareWeekForUser({
      saveGameId: "save-1",
      userId: "user-1",
    });

    expect(mocks.tx.saveGame.update).toHaveBeenCalledWith({
      where: { id: "save-1" },
      data: { weekState: WeekState.READY },
    });
    expect(result.weekState).toBe(WeekState.READY);
  });

  it("prepareWeek applies a conservative weekly plan to the manager team", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.PRE_WEEK));
    mocks.tx.match.count.mockResolvedValue(1);
    mocks.tx.player.findMany.mockResolvedValue([
      {
        id: "player-1",
        fatigue: 30,
        morale: 55,
      },
    ]);
    mocks.tx.playerRosterProfile.updateMany
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 2 });

    await prepareWeekForUser({
      saveGameId: "save-1",
      userId: "user-1",
      weeklyPlan: {
        developmentFocusPlayerIds: ["player-1", "player-2", "player-3", "player-4"],
        intensity: "RECOVERY",
        opponentFocus: "DEFENSE",
      },
    });

    expect(mocks.tx.team.findFirst).toHaveBeenCalledWith({
      where: {
        saveGameId: "save-1",
        managerControlled: true,
      },
      select: {
        id: true,
      },
    });
    expect(mocks.tx.player.update).toHaveBeenCalledWith({
      where: {
        id: "player-1",
      },
      data: {
        fatigue: 14,
        morale: 59,
      },
    });
    expect(mocks.tx.playerRosterProfile.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        saveGameId: "save-1",
        teamId: "team-1",
      },
      data: {
        developmentFocus: false,
      },
    });
    expect(mocks.tx.playerRosterProfile.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        saveGameId: "save-1",
        teamId: "team-1",
        playerId: {
          in: ["player-1", "player-2", "player-3"],
        },
      },
      data: {
        developmentFocus: true,
      },
    });
  });

  it("prepareWeek rejects empty current weeks before marking the savegame ready", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.PRE_WEEK));
    mocks.tx.match.count.mockResolvedValue(0);

    await expect(
      prepareWeekForUser({
        saveGameId: "save-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("prepareWeek requires at least one scheduled current-week match");

    expect(mocks.tx.saveGame.update).not.toHaveBeenCalled();
  });

  it("startGame rejects invalid state transitions", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.PRE_WEEK));

    await expect(
      startGameForUser({
        matchId: "match-1",
        saveGameId: "save-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("startGame requires week state READY");

    expect(mocks.tx.match.update).not.toHaveBeenCalled();
  });

  it("startGame marks the current scheduled match as running", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.READY));
    mocks.tx.match.count.mockResolvedValue(0);

    const result = await startGameForUser({
      matchId: "match-1",
      saveGameId: "save-1",
      userId: "user-1",
    });

    expect(mocks.tx.match.findFirst).toHaveBeenCalledWith({
      where: {
        id: "match-1",
        saveGameId: "save-1",
        seasonId: "season-1",
        status: MatchStatus.SCHEDULED,
        week: 1,
      },
      select: {
        id: true,
        awayScore: true,
        awayTeam: {
          select: {
            abbreviation: true,
            city: true,
            id: true,
            nickname: true,
            overallRating: true,
          },
        },
        homeScore: true,
        homeTeam: {
          select: {
            abbreviation: true,
            city: true,
            id: true,
            nickname: true,
            overallRating: true,
          },
        },
        week: true,
      },
    });
    expect(mocks.tx.match.update).toHaveBeenCalledWith({
      where: { id: "match-1" },
      data: {
        awayScore: expect.any(Number),
        homeScore: expect.any(Number),
        simulationSeed: expect.stringContaining("minimal-drive:match-1"),
        simulationStartedAt: expect.any(Date),
        status: MatchStatus.IN_PROGRESS,
      },
    });
    expect(mocks.tx.matchSimulationDrive.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          matchId: "match-1",
          phaseLabel: expect.stringMatching(/^Q[1-4] /),
          resultType: expect.any(String),
          saveGameId: "save-1",
        }),
      ]),
    });
    expect(mocks.tx.teamMatchStat.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.tx.saveGame.update).toHaveBeenCalledWith({
      where: { id: "save-1" },
      data: { weekState: WeekState.GAME_RUNNING },
    });
    expect(result.weekState).toBe(WeekState.GAME_RUNNING);
  });

  it("startGame rejects inconsistent weeks with an already running current-week match", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.READY));
    mocks.tx.match.count.mockResolvedValue(1);

    await expect(
      startGameForUser({
        matchId: "match-1",
        saveGameId: "save-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("Another current-week match is already running");

    expect(mocks.tx.match.update).not.toHaveBeenCalled();
  });

  it("finishGame stores the score and moves to POST_GAME", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.GAME_RUNNING));
    mocks.tx.match.findFirst.mockResolvedValue({
      id: "match-1",
      awayScore: 17,
      awayTeam: {
        abbreviation: "AWY",
        city: "Away",
        id: "away-team",
        nickname: "Team",
        overallRating: 70,
      },
      homeScore: 24,
      homeTeam: {
        abbreviation: "HME",
        city: "Home",
        id: "home-team",
        nickname: "Team",
        overallRating: 74,
      },
      week: 1,
    });

    const result = await finishGameForUser({
      matchId: "match-1",
      saveGameId: "save-1",
      userId: "user-1",
    });

    expect(mocks.tx.match.update).toHaveBeenCalledWith({
      where: { id: "match-1" },
      data: {
        awayScore: 17,
        homeScore: 24,
        simulationCompletedAt: expect.any(Date),
        status: MatchStatus.COMPLETED,
      },
    });
    expect(mocks.tx.saveGame.update).toHaveBeenCalledWith({
      where: { id: "save-1" },
      data: { weekState: WeekState.POST_GAME },
    });
    expect(mocks.tx.teamSeasonStat.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.tx.teamSeasonStat.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      create: expect.objectContaining({
        gamesPlayed: 1,
        losses: 0,
        pointsAgainst: 17,
        pointsFor: 24,
        teamId: "home-team",
        wins: 1,
      }),
      update: expect.objectContaining({
        gamesPlayed: { increment: 1 },
        losses: { increment: 0 },
        pointsAgainst: { increment: 17 },
        pointsFor: { increment: 24 },
        wins: { increment: 1 },
      }),
    }));
    expect(mocks.tx.teamSeasonStat.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      create: expect.objectContaining({
        gamesPlayed: 1,
        losses: 1,
        pointsAgainst: 24,
        pointsFor: 17,
        teamId: "away-team",
        wins: 0,
      }),
      update: expect.objectContaining({
        gamesPlayed: { increment: 1 },
        losses: { increment: 1 },
        pointsAgainst: { increment: 24 },
        pointsFor: { increment: 17 },
        wins: { increment: 0 },
      }),
    }));
    expect(result.weekState).toBe(WeekState.POST_GAME);
  });

  it("finishGame returns to READY when more scheduled current-week matches remain", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.GAME_RUNNING));
    mocks.tx.match.findMany.mockResolvedValue([{ status: MatchStatus.SCHEDULED }]);

    const result = await finishGameForUser({
      matchId: "match-1",
      saveGameId: "save-1",
      userId: "user-1",
    });

    expect(mocks.tx.match.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          not: "match-1",
        },
        saveGameId: "save-1",
        seasonId: "season-1",
        week: 1,
        status: {
          in: [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS],
        },
      },
      select: {
        status: true,
      },
    });
    expect(mocks.tx.saveGame.update).toHaveBeenCalledWith({
      where: { id: "save-1" },
      data: { weekState: WeekState.READY },
    });
    expect(result.weekState).toBe(WeekState.READY);
  });

  it("finishGame keeps GAME_RUNNING when another current-week match is already running", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.GAME_RUNNING));
    mocks.tx.match.findMany.mockResolvedValue([{ status: MatchStatus.IN_PROGRESS }]);

    const result = await finishGameForUser({
      matchId: "match-1",
      saveGameId: "save-1",
      userId: "user-1",
    });

    expect(mocks.tx.saveGame.update).toHaveBeenCalledWith({
      where: { id: "save-1" },
      data: { weekState: WeekState.GAME_RUNNING },
    });
    expect(result.weekState).toBe(WeekState.GAME_RUNNING);
  });

  it("advanceWeek rejects open current-week matches", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.POST_GAME));
    mocks.tx.match.count.mockResolvedValue(1);

    await expect(
      advanceWeekForUser({
        saveGameId: "save-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("Current week still has open matches");

    expect(mocks.tx.season.update).not.toHaveBeenCalled();
  });

  it("advanceWeek moves POST_GAME to PRE_WEEK and loads the next week", async () => {
    mocks.tx.saveGame.findFirst.mockResolvedValue(createContext(WeekState.POST_GAME));

    const result = await advanceWeekForUser({
      saveGameId: "save-1",
      userId: "user-1",
    });

    expect(mocks.tx.season.update).toHaveBeenCalledWith({
      where: { id: "season-1" },
      data: {
        endsAt: undefined,
        phase: SeasonPhase.REGULAR_SEASON,
        week: 2,
      },
    });
    expect(mocks.weeklyDevelopment.applyWeeklyDevelopmentForSaveGame).toHaveBeenCalledWith({
      tx: mocks.tx,
      saveGameId: "save-1",
      seasonId: "season-1",
      week: 1,
      occurredAt: expect.any(Date),
    });
    expect(mocks.tx.saveGame.update).toHaveBeenCalledWith({
      where: { id: "save-1" },
      data: { weekState: WeekState.PRE_WEEK },
    });
    expect(result).toEqual({
      currentSeasonId: "season-1",
      phase: SeasonPhase.REGULAR_SEASON,
      saveGameId: "save-1",
      week: 2,
      weekState: WeekState.PRE_WEEK,
    });
  });
});
