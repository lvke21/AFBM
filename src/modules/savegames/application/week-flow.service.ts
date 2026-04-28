import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  buildWeeklyPlanConditionImpact,
  normalizeWeeklyPlanInput,
  type WeeklyPlanInput,
} from "@/modules/savegames/domain/weekly-plan";
import { MatchStatus, SeasonPhase, WeekState } from "@/modules/shared/domain/enums";
import { buildSeasonTransition } from "@/modules/seasons/application/simulation/engine-state-machine";
import { weekMatchStateRepositoryFirestore } from "@/server/repositories/weekMatchStateRepository.firestore";
import {
  simulateMinimalDriveGame,
  type MinimalDriveSimulationResult,
} from "./minimal-drive-simulation";
import { applyWeeklyDevelopmentForSaveGame } from "./weekly-player-development.service";

type WeekFlowInput = {
  weeklyPlan?: Partial<WeeklyPlanInput>;
  userId: string;
  saveGameId: string;
};

type MatchWeekFlowInput = WeekFlowInput & {
  matchId: string;
};

type FinishGameInput = MatchWeekFlowInput;

type WeekFlowResult = {
  currentSeasonId: string;
  matchId?: string;
  phase: SeasonPhase;
  saveGameId: string;
  week: number;
  weekState: WeekState;
};

type SaveGameWeekContext = NonNullable<
  Awaited<ReturnType<typeof findSaveGameWeekContext>>
>;

const VALID_WEEK_TRANSITIONS: Record<WeekState, WeekState[]> = {
  [WeekState.PRE_WEEK]: [WeekState.READY],
  [WeekState.READY]: [WeekState.GAME_RUNNING],
  [WeekState.GAME_RUNNING]: [WeekState.READY, WeekState.POST_GAME],
  [WeekState.POST_GAME]: [WeekState.PRE_WEEK],
};

function assertTransition(from: WeekState, to: WeekState) {
  if (!VALID_WEEK_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid week-state transition from ${from} to ${to}`);
  }
}

function assertCurrentState(actual: WeekState, expected: WeekState, action: string) {
  if (actual !== expected) {
    throw new Error(`${action} requires week state ${expected}, current state is ${actual}`);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function findSaveGameWeekContext(
  tx: Prisma.TransactionClient,
  userId: string,
  saveGameId: string,
) {
  return tx.saveGame.findFirst({
    where: {
      id: saveGameId,
      userId,
    },
    select: {
      id: true,
      currentSeason: {
        select: {
          id: true,
          phase: true,
          week: true,
        },
      },
      settings: {
        select: {
          seasonLengthWeeks: true,
        },
      },
      weekState: true,
    },
  });
}

function requireContext(context: SaveGameWeekContext | null) {
  if (!context) {
    throw new Error("Savegame week context not found");
  }

  if (!context.currentSeason) {
    throw new Error("Savegame has no active current season");
  }

  return context;
}

function resultFromContext(
  context: SaveGameWeekContext,
  weekState: WeekState,
  matchId?: string,
): WeekFlowResult {
  const currentSeason = context.currentSeason;

  if (!currentSeason) {
    throw new Error("Savegame has no active current season");
  }

  return {
    currentSeasonId: currentSeason.id,
    matchId,
    phase: currentSeason.phase,
    saveGameId: context.id,
    week: currentSeason.week,
    weekState,
  };
}

async function findCurrentWeekMatch(
  tx: Prisma.TransactionClient,
  context: SaveGameWeekContext,
  matchId: string,
  status: MatchStatus,
) {
  const currentSeason = context.currentSeason;

  if (!currentSeason) {
    throw new Error("Savegame has no active current season");
  }

  return tx.match.findFirst({
    where: {
      id: matchId,
      saveGameId: context.id,
      seasonId: currentSeason.id,
      status,
      week: currentSeason.week,
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
}

type CurrentWeekMatch = NonNullable<Awaited<ReturnType<typeof findCurrentWeekMatch>>>;

async function countCurrentWeekMatches(
  tx: Prisma.TransactionClient,
  context: SaveGameWeekContext,
  statuses?: MatchStatus[],
) {
  const currentSeason = context.currentSeason;

  if (!currentSeason) {
    throw new Error("Savegame has no active current season");
  }

  return tx.match.count({
    where: {
      saveGameId: context.id,
      seasonId: currentSeason.id,
      status: statuses
        ? {
            in: statuses,
          }
        : undefined,
      week: currentSeason.week,
    },
  });
}

async function determineWeekStateAfterFinishedMatch(
  tx: Prisma.TransactionClient,
  context: SaveGameWeekContext,
  finishedMatchId: string,
) {
  const currentSeason = context.currentSeason;

  if (!currentSeason) {
    throw new Error("Savegame has no active current season");
  }

  const remainingOpenMatches = await tx.match.findMany({
    where: {
      id: {
        not: finishedMatchId,
      },
      saveGameId: context.id,
      seasonId: currentSeason.id,
      week: currentSeason.week,
      status: {
        in: [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS],
      },
    },
    select: {
      status: true,
    },
  });

  if (remainingOpenMatches.some((match) => match.status === MatchStatus.IN_PROGRESS)) {
    return WeekState.GAME_RUNNING;
  }

  if (remainingOpenMatches.some((match) => match.status === MatchStatus.SCHEDULED)) {
    return WeekState.READY;
  }

  return WeekState.POST_GAME;
}

async function applyWeeklyPlanForManagerTeam(
  tx: Prisma.TransactionClient,
  saveGameId: string,
  weeklyPlan: WeeklyPlanInput,
) {
  const managerTeam = await tx.team.findFirst({
    where: {
      saveGameId,
      managerControlled: true,
    },
    select: {
      id: true,
    },
  });

  if (!managerTeam) {
    return {
      focusedPlayers: 0,
      teamId: null,
    };
  }

  const impact = buildWeeklyPlanConditionImpact(weeklyPlan);
  const players = await tx.player.findMany({
    where: {
      saveGameId,
      rosterProfile: {
        is: {
          teamId: managerTeam.id,
        },
      },
    },
    select: {
      fatigue: true,
      id: true,
      morale: true,
    },
  });

  for (const player of players) {
    await tx.player.update({
      where: {
        id: player.id,
      },
      data: {
        fatigue: clamp(player.fatigue + impact.fatigueDelta, 0, 99),
        morale: clamp(player.morale + impact.moraleDelta, 20, 99),
      },
    });
  }

  await tx.playerRosterProfile.updateMany({
    where: {
      saveGameId,
      teamId: managerTeam.id,
    },
    data: {
      developmentFocus: false,
    },
  });

  if (weeklyPlan.developmentFocusPlayerIds.length === 0) {
    return {
      focusedPlayers: 0,
      teamId: managerTeam.id,
    };
  }

  const focused = await tx.playerRosterProfile.updateMany({
    where: {
      saveGameId,
      teamId: managerTeam.id,
      playerId: {
        in: weeklyPlan.developmentFocusPlayerIds,
      },
    },
    data: {
      developmentFocus: true,
    },
  });

  return {
    focusedPlayers: focused.count,
    teamId: managerTeam.id,
  };
}

function toMinimalTeam(team: CurrentWeekMatch["homeTeam"]) {
  return {
    abbreviation: team.abbreviation,
    id: team.id,
    name: `${team.city} ${team.nickname}`,
    overallRating: team.overallRating,
  };
}

const LINEUP_CORE_POSITIONS = new Set(["QB", "RB", "WR"]);
const LINEUP_SECONDARY_POSITIONS = new Set([
  "FB",
  "TE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "LE",
  "RE",
  "DT",
  "LOLB",
  "MLB",
  "ROLB",
  "CB",
  "FS",
  "SS",
  "K",
  "P",
  "LS",
]);
const LINEUP_IMPACT_POSITIONS = new Set(["QB", "RB", "WR", "LT", "MLB", "CB", "K"]);
const LINEUP_REQUIRED_POSITIONS = new Set([
  ...LINEUP_CORE_POSITIONS,
  ...LINEUP_SECONDARY_POSITIONS,
]);
const GAME_DAY_ROSTER_STATUSES = new Set(["STARTER", "ROTATION", "BACKUP"]);

async function calculateLineupRatingModifier(
  tx: Prisma.TransactionClient,
  saveGameId: string,
  teamId: string,
) {
  const profiles = await tx.playerRosterProfile.findMany({
    where: {
      saveGameId,
      teamId,
      primaryPosition: {
        code: {
          in: [...LINEUP_REQUIRED_POSITIONS],
        },
      },
    },
    select: {
      depthChartSlot: true,
      rosterStatus: true,
      primaryPosition: {
        select: {
          code: true,
        },
      },
      player: {
        select: {
          fatigue: true,
          evaluation: {
            select: {
              positionOverall: true,
              potentialRating: true,
            },
          },
        },
      },
    },
  });
  const byPosition = new Map<string, typeof profiles>();

  for (const profile of profiles) {
    if (!GAME_DAY_ROSTER_STATUSES.has(profile.rosterStatus)) {
      continue;
    }

    const positionCode = profile.primaryPosition.code;
    byPosition.set(positionCode, [...(byPosition.get(positionCode) ?? []), profile]);
  }

  let modifier = 0;

  for (const positionCode of LINEUP_REQUIRED_POSITIONS) {
    const positionProfiles = byPosition.get(positionCode) ?? [];
    const starter = positionProfiles.find((profile) => profile.depthChartSlot === 1);

    if (!starter?.player.evaluation) {
      modifier -= LINEUP_CORE_POSITIONS.has(positionCode) ? 1.2 : 0.25;
      continue;
    }

    if (!LINEUP_IMPACT_POSITIONS.has(positionCode)) {
      continue;
    }

    const starterCurrent =
      starter.player.evaluation.positionOverall -
      (starter.player.fatigue >= 70 ? 4 : starter.player.fatigue >= 55 ? 2 : 0);
    const currentOptions = positionProfiles
      .map((profile) => profile.player.evaluation)
      .filter((evaluation): evaluation is NonNullable<typeof evaluation> => evaluation != null)
      .map((evaluation) => evaluation.positionOverall);
    const bestCurrent = currentOptions.length > 0 ? Math.max(...currentOptions) : starterCurrent;
    const upside = starter.player.evaluation.potentialRating - starter.player.evaluation.positionOverall;

    if (starterCurrent >= bestCurrent - 1) {
      modifier += 0.45;
    } else if (starterCurrent <= bestCurrent - 4) {
      modifier -= 0.7;
    }

    if (starter.player.fatigue >= 65) {
      modifier -= 0.45;
    }

    if (upside >= 10 && starter.player.fatigue < 45) {
      modifier += 0.25;
    }
  }

  return clamp(Math.round(modifier * 10) / 10, -3, 3);
}

async function persistMinimalDriveSimulation(
  tx: Prisma.TransactionClient,
  saveGameId: string,
  match: CurrentWeekMatch,
  generatedAt: Date,
) {
  const [homeLineupModifier, awayLineupModifier] = await Promise.all([
    calculateLineupRatingModifier(tx, saveGameId, match.homeTeam.id),
    calculateLineupRatingModifier(tx, saveGameId, match.awayTeam.id),
  ]);
  const homeTeam = toMinimalTeam(match.homeTeam);
  const awayTeam = toMinimalTeam(match.awayTeam);
  const result = simulateMinimalDriveGame({
    awayTeam: {
      ...awayTeam,
      overallRating: clamp(awayTeam.overallRating + awayLineupModifier, 35, 99),
    },
    homeTeam: {
      ...homeTeam,
      overallRating: clamp(homeTeam.overallRating + homeLineupModifier, 35, 99),
    },
    matchId: match.id,
    week: match.week,
  });

  await tx.match.update({
    where: {
      id: match.id,
    },
    data: {
      awayScore: result.awayScore,
      homeScore: result.homeScore,
      simulationSeed: result.seed,
      simulationStartedAt: generatedAt,
      status: MatchStatus.IN_PROGRESS,
    },
  });

  await tx.matchSimulationDrive.deleteMany({
    where: {
      matchId: match.id,
      saveGameId,
    },
  });

  if (result.drives.length > 0) {
    await tx.matchSimulationDrive.createMany({
      data: result.drives.map((drive) => ({
        defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
        defenseTeamId: drive.defenseTeamId,
        endedAwayScore: drive.endedAwayScore,
        endedHomeScore: drive.endedHomeScore,
        matchId: match.id,
        offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
        offenseTeamId: drive.offenseTeamId,
        passAttempts: drive.passAttempts,
        phaseLabel: drive.phaseLabel,
        plays: drive.plays,
        pointsScored: drive.pointsScored,
        primaryDefenderName: drive.primaryDefenderName,
        primaryPlayerName: drive.primaryPlayerName,
        redZoneTrip: drive.redZoneTrip,
        resultType: drive.resultType,
        rushAttempts: drive.rushAttempts,
        saveGameId,
        sequence: drive.sequence,
        startedAwayScore: drive.startedAwayScore,
        startedHomeScore: drive.startedHomeScore,
        summary: drive.summary,
        totalYards: drive.totalYards,
        turnover: drive.turnover,
      })),
    });
  }

  await Promise.all([
    upsertGeneratedTeamStats(tx, saveGameId, match.id, match.homeTeam.id, result.homeStats),
    upsertGeneratedTeamStats(tx, saveGameId, match.id, match.awayTeam.id, result.awayStats),
  ]);

  return result;
}

function upsertGeneratedTeamStats(
  tx: Prisma.TransactionClient,
  saveGameId: string,
  matchId: string,
  teamId: string,
  stats: MinimalDriveSimulationResult["homeStats"],
) {
  return tx.teamMatchStat.upsert({
    where: {
      matchId_teamId: {
        matchId,
        teamId,
      },
    },
    update: {
      explosivePlays: stats.explosivePlays,
      firstDowns: stats.firstDowns,
      passingYards: stats.passingYards,
      penalties: 0,
      redZoneTouchdowns: stats.redZoneTouchdowns,
      redZoneTrips: stats.redZoneTrips,
      rushingYards: stats.rushingYards,
      sacks: stats.sacks,
      timeOfPossessionSeconds: stats.timeOfPossessionSeconds,
      totalYards: stats.totalYards,
      turnovers: stats.turnovers,
    },
    create: {
      explosivePlays: stats.explosivePlays,
      firstDowns: stats.firstDowns,
      matchId,
      passingYards: stats.passingYards,
      penalties: 0,
      redZoneTouchdowns: stats.redZoneTouchdowns,
      redZoneTrips: stats.redZoneTrips,
      rushingYards: stats.rushingYards,
      sacks: stats.sacks,
      saveGameId,
      teamId,
      timeOfPossessionSeconds: stats.timeOfPossessionSeconds,
      totalYards: stats.totalYards,
      turnovers: stats.turnovers,
    },
  });
}

function emptyGeneratedStats(): MinimalDriveSimulationResult["homeStats"] {
  return {
    explosivePlays: 0,
    firstDowns: 0,
    passingYards: 0,
    redZoneTouchdowns: 0,
    redZoneTrips: 0,
    rushingYards: 0,
    sacks: 0,
    timeOfPossessionSeconds: 0,
    totalYards: 0,
    turnovers: 0,
  };
}

function updateSeasonStatsFromCompletedGame(
  tx: Prisma.TransactionClient,
  input: {
    awayScore: number;
    awayStats: MinimalDriveSimulationResult["awayStats"];
    awayTeamId: string;
    homeScore: number;
    homeStats: MinimalDriveSimulationResult["homeStats"];
    homeTeamId: string;
    saveGameId: string;
    seasonId: string;
  },
) {
  const homeWon = input.homeScore > input.awayScore;
  const awayWon = input.awayScore > input.homeScore;
  const isTie = input.homeScore === input.awayScore;

  return Promise.all([
    tx.teamSeasonStat.upsert({
      where: {
        seasonId_teamId: {
          seasonId: input.seasonId,
          teamId: input.homeTeamId,
        },
      },
      update: {
        explosivePlays: { increment: input.homeStats.explosivePlays },
        gamesPlayed: { increment: 1 },
        losses: { increment: awayWon ? 1 : 0 },
        passingYards: { increment: input.homeStats.passingYards },
        pointsAgainst: { increment: input.awayScore },
        pointsFor: { increment: input.homeScore },
        redZoneTouchdowns: { increment: input.homeStats.redZoneTouchdowns },
        redZoneTrips: { increment: input.homeStats.redZoneTrips },
        rushingYards: { increment: input.homeStats.rushingYards },
        sacks: { increment: input.homeStats.sacks },
        ties: { increment: isTie ? 1 : 0 },
        touchdownsAgainst: { increment: input.awayStats.redZoneTouchdowns },
        touchdownsFor: { increment: input.homeStats.redZoneTouchdowns },
        turnoversCommitted: { increment: input.homeStats.turnovers },
        turnoversForced: { increment: input.awayStats.turnovers },
        wins: { increment: homeWon ? 1 : 0 },
      },
      create: {
        explosivePlays: input.homeStats.explosivePlays,
        gamesPlayed: 1,
        losses: awayWon ? 1 : 0,
        passingYards: input.homeStats.passingYards,
        pointsAgainst: input.awayScore,
        pointsFor: input.homeScore,
        redZoneTouchdowns: input.homeStats.redZoneTouchdowns,
        redZoneTrips: input.homeStats.redZoneTrips,
        rushingYards: input.homeStats.rushingYards,
        sacks: input.homeStats.sacks,
        saveGameId: input.saveGameId,
        seasonId: input.seasonId,
        teamId: input.homeTeamId,
        ties: isTie ? 1 : 0,
        touchdownsAgainst: input.awayStats.redZoneTouchdowns,
        touchdownsFor: input.homeStats.redZoneTouchdowns,
        turnoversCommitted: input.homeStats.turnovers,
        turnoversForced: input.awayStats.turnovers,
        wins: homeWon ? 1 : 0,
      },
    }),
    tx.teamSeasonStat.upsert({
      where: {
        seasonId_teamId: {
          seasonId: input.seasonId,
          teamId: input.awayTeamId,
        },
      },
      update: {
        explosivePlays: { increment: input.awayStats.explosivePlays },
        gamesPlayed: { increment: 1 },
        losses: { increment: homeWon ? 1 : 0 },
        passingYards: { increment: input.awayStats.passingYards },
        pointsAgainst: { increment: input.homeScore },
        pointsFor: { increment: input.awayScore },
        redZoneTouchdowns: { increment: input.awayStats.redZoneTouchdowns },
        redZoneTrips: { increment: input.awayStats.redZoneTrips },
        rushingYards: { increment: input.awayStats.rushingYards },
        sacks: { increment: input.awayStats.sacks },
        ties: { increment: isTie ? 1 : 0 },
        touchdownsAgainst: { increment: input.homeStats.redZoneTouchdowns },
        touchdownsFor: { increment: input.awayStats.redZoneTouchdowns },
        turnoversCommitted: { increment: input.awayStats.turnovers },
        turnoversForced: { increment: input.homeStats.turnovers },
        wins: { increment: awayWon ? 1 : 0 },
      },
      create: {
        explosivePlays: input.awayStats.explosivePlays,
        gamesPlayed: 1,
        losses: homeWon ? 1 : 0,
        passingYards: input.awayStats.passingYards,
        pointsAgainst: input.homeScore,
        pointsFor: input.awayScore,
        redZoneTouchdowns: input.awayStats.redZoneTouchdowns,
        redZoneTrips: input.awayStats.redZoneTrips,
        rushingYards: input.awayStats.rushingYards,
        sacks: input.awayStats.sacks,
        saveGameId: input.saveGameId,
        seasonId: input.seasonId,
        teamId: input.awayTeamId,
        ties: isTie ? 1 : 0,
        touchdownsAgainst: input.homeStats.redZoneTouchdowns,
        touchdownsFor: input.awayStats.redZoneTouchdowns,
        turnoversCommitted: input.awayStats.turnovers,
        turnoversForced: input.homeStats.turnovers,
        wins: awayWon ? 1 : 0,
      },
    }),
  ]);
}

export async function prepareWeekForUser({
  saveGameId,
  weeklyPlan,
  userId,
}: WeekFlowInput): Promise<WeekFlowResult> {
  if (process.env.DATA_BACKEND === "firestore") {
    return weekMatchStateRepositoryFirestore.prepareWeekForUser({ saveGameId, userId });
  }

  return prisma.$transaction(async (tx) => {
    const context = requireContext(await findSaveGameWeekContext(tx, userId, saveGameId));
    const normalizedWeeklyPlan = normalizeWeeklyPlanInput(weeklyPlan);

    assertCurrentState(context.weekState, WeekState.PRE_WEEK, "prepareWeek");
    assertTransition(context.weekState, WeekState.READY);

    const scheduledCurrentWeekMatches = await countCurrentWeekMatches(tx, context, [
      MatchStatus.SCHEDULED,
    ]);

    if (scheduledCurrentWeekMatches === 0) {
      throw new Error("prepareWeek requires at least one scheduled current-week match");
    }

    await applyWeeklyPlanForManagerTeam(tx, context.id, normalizedWeeklyPlan);

    await tx.saveGame.update({
      where: {
        id: context.id,
      },
      data: {
        weekState: WeekState.READY,
      },
    });

    return resultFromContext(context, WeekState.READY);
  });
}

export async function startGameForUser({
  matchId,
  saveGameId,
  userId,
}: MatchWeekFlowInput): Promise<WeekFlowResult> {
  if (process.env.DATA_BACKEND === "firestore") {
    return weekMatchStateRepositoryFirestore.startGameForUser({ matchId, saveGameId, userId });
  }

  return prisma.$transaction(async (tx) => {
    const context = requireContext(await findSaveGameWeekContext(tx, userId, saveGameId));

    assertCurrentState(context.weekState, WeekState.READY, "startGame");
    assertTransition(context.weekState, WeekState.GAME_RUNNING);

    const runningCurrentWeekMatches = await countCurrentWeekMatches(tx, context, [
      MatchStatus.IN_PROGRESS,
    ]);

    if (runningCurrentWeekMatches > 0) {
      throw new Error("Another current-week match is already running");
    }

    const match = await findCurrentWeekMatch(tx, context, matchId, MatchStatus.SCHEDULED);

    if (!match) {
      throw new Error("Scheduled current-week match not found");
    }

    await persistMinimalDriveSimulation(tx, context.id, match, new Date());

    await tx.saveGame.update({
      where: {
        id: context.id,
      },
      data: {
        weekState: WeekState.GAME_RUNNING,
      },
    });

    return resultFromContext(context, WeekState.GAME_RUNNING, match.id);
  });
}

export async function finishGameForUser({
  matchId,
  saveGameId,
  userId,
}: FinishGameInput): Promise<WeekFlowResult> {
  if (process.env.DATA_BACKEND === "firestore") {
    return weekMatchStateRepositoryFirestore.finishGameForUser({
      matchId,
      saveGameId,
      userId,
    });
  }

  return prisma.$transaction(async (tx) => {
    const context = requireContext(await findSaveGameWeekContext(tx, userId, saveGameId));
    const currentSeason = context.currentSeason;

    if (!currentSeason) {
      throw new Error("Savegame has no active current season");
    }

    assertCurrentState(context.weekState, WeekState.GAME_RUNNING, "finishGame");

    const match = await findCurrentWeekMatch(tx, context, matchId, MatchStatus.IN_PROGRESS);

    if (!match) {
      throw new Error("Running current-week match not found");
    }

    let finishedHomeScore = match.homeScore;
    let finishedAwayScore = match.awayScore;

    if (finishedHomeScore == null || finishedAwayScore == null) {
      const generated = await persistMinimalDriveSimulation(tx, context.id, match, new Date());
      finishedHomeScore = generated.homeScore;
      finishedAwayScore = generated.awayScore;
    }

    const nextWeekState = await determineWeekStateAfterFinishedMatch(tx, context, match.id);
    if (nextWeekState !== context.weekState) {
      assertTransition(context.weekState, nextWeekState);
    }

    await tx.match.update({
      where: {
        id: match.id,
      },
      data: {
        awayScore: finishedAwayScore,
        homeScore: finishedHomeScore,
        simulationCompletedAt: new Date(),
        status: MatchStatus.COMPLETED,
      },
    });

    const homeStatsRecord = await tx.teamMatchStat.findUnique({
      where: {
        matchId_teamId: {
          matchId: match.id,
          teamId: match.homeTeam.id,
        },
      },
    });
    const awayStatsRecord = await tx.teamMatchStat.findUnique({
      where: {
        matchId_teamId: {
          matchId: match.id,
          teamId: match.awayTeam.id,
        },
      },
    });
    const homeStats = homeStatsRecord
      ? {
          explosivePlays: homeStatsRecord.explosivePlays,
          firstDowns: homeStatsRecord.firstDowns,
          passingYards: homeStatsRecord.passingYards,
          redZoneTouchdowns: homeStatsRecord.redZoneTouchdowns,
          redZoneTrips: homeStatsRecord.redZoneTrips,
          rushingYards: homeStatsRecord.rushingYards,
          sacks: homeStatsRecord.sacks,
          timeOfPossessionSeconds: homeStatsRecord.timeOfPossessionSeconds,
          totalYards: homeStatsRecord.totalYards,
          turnovers: homeStatsRecord.turnovers,
        }
      : emptyGeneratedStats();
    const awayStats = awayStatsRecord
      ? {
          explosivePlays: awayStatsRecord.explosivePlays,
          firstDowns: awayStatsRecord.firstDowns,
          passingYards: awayStatsRecord.passingYards,
          redZoneTouchdowns: awayStatsRecord.redZoneTouchdowns,
          redZoneTrips: awayStatsRecord.redZoneTrips,
          rushingYards: awayStatsRecord.rushingYards,
          sacks: awayStatsRecord.sacks,
          timeOfPossessionSeconds: awayStatsRecord.timeOfPossessionSeconds,
          totalYards: awayStatsRecord.totalYards,
          turnovers: awayStatsRecord.turnovers,
        }
      : emptyGeneratedStats();

    await updateSeasonStatsFromCompletedGame(tx, {
      awayScore: finishedAwayScore,
      awayStats,
      awayTeamId: match.awayTeam.id,
      homeScore: finishedHomeScore,
      homeStats,
      homeTeamId: match.homeTeam.id,
      saveGameId: context.id,
      seasonId: currentSeason.id,
    });

    await tx.saveGame.update({
      where: {
        id: context.id,
      },
      data: {
        weekState: nextWeekState,
      },
    });

    return resultFromContext(context, nextWeekState, match.id);
  });
}

export async function advanceWeekForUser({
  saveGameId,
  userId,
}: WeekFlowInput): Promise<WeekFlowResult> {
  if (process.env.DATA_BACKEND === "firestore") {
    return weekMatchStateRepositoryFirestore.advanceWeekForUser({ saveGameId, userId });
  }

  return prisma.$transaction(async (tx) => {
    const context = requireContext(await findSaveGameWeekContext(tx, userId, saveGameId));
    const currentSeason = context.currentSeason;

    if (!currentSeason) {
      throw new Error("Savegame has no active current season");
    }

    assertCurrentState(context.weekState, WeekState.POST_GAME, "advanceWeek");
    assertTransition(context.weekState, WeekState.PRE_WEEK);

    const openCurrentWeekMatches = await tx.match.count({
      where: {
        saveGameId: context.id,
        seasonId: currentSeason.id,
        week: currentSeason.week,
        status: {
          in: [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS],
        },
      },
    });

    if (openCurrentWeekMatches > 0) {
      throw new Error("Current week still has open matches");
    }

    const transitionTime = new Date();
    const transition = buildSeasonTransition({
      currentPhase: currentSeason.phase,
      currentWeek: currentSeason.week,
      seasonLengthWeeks: context.settings?.seasonLengthWeeks ?? currentSeason.week,
      createdFinal: false,
      createdPlayoffs: false,
      transitionTime,
    });

    await applyWeeklyDevelopmentForSaveGame({
      tx,
      saveGameId: context.id,
      seasonId: currentSeason.id,
      week: currentSeason.week,
      occurredAt: transitionTime,
    });

    await tx.season.update({
      where: {
        id: currentSeason.id,
      },
      data: {
        endsAt: transition.endsAt,
        phase: transition.phase,
        week: transition.week,
      },
    });

    await tx.saveGame.update({
      where: {
        id: context.id,
      },
      data: {
        weekState: WeekState.PRE_WEEK,
      },
    });

    return {
      currentSeasonId: currentSeason.id,
      phase: transition.phase,
      saveGameId: context.id,
      week: transition.week,
      weekState: WeekState.PRE_WEEK,
    };
  });
}
