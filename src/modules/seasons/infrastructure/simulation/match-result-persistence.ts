import {
  Prisma,
} from "@prisma/client";

import { createPlayerHistoryEvent } from "@/modules/players/application/player-history.service";
import {
  MatchStatus,
  PlayerHistoryEventType,
} from "@/modules/shared/domain/enums";
import { buildPlayerConditionUpdate } from "@/modules/seasons/application/simulation/player-condition";
import {
  createSeededRandom,
  deriveSimulationSeed,
} from "@/modules/seasons/application/simulation/simulation-random";
import {
  applyWeeklyPlayerDevelopment,
  recalculateTeamState,
} from "./player-development";
import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamGameplanContext,
} from "@/modules/seasons/application/simulation/simulation.types";
import { seasonSimulationCommandRepository } from "./season-simulation.command-repository";

function hasAnyNonZero(values: number[]) {
  return values.some((value) => value > 0);
}

function formatPlayerName(player: SimulationPlayerContext) {
  return `${player.firstName} ${player.lastName}`;
}

function formatPlanValue(value: string | null | undefined) {
  return value ? value.toLowerCase().replaceAll("_", " ") : null;
}

function buildPlanParts(gameplan: SimulationTeamGameplanContext | undefined) {
  const offense = gameplan?.offenseXFactorPlan;
  const defense = gameplan?.defenseXFactorPlan;

  return [
    formatPlanValue(gameplan?.aiStrategyArchetype),
    formatPlanValue(offense?.offensiveFocus),
    formatPlanValue(offense?.aggression),
    formatPlanValue(offense?.tempoPlan),
    formatPlanValue(defense?.defensiveFocus),
    formatPlanValue(defense?.turnoverPlan),
  ].filter((part): part is string => Boolean(part));
}

export function buildTeamGameplanReportSummary(
  gameplan: SimulationTeamGameplanContext | undefined,
): Prisma.JsonObject | undefined {
  if (!gameplan) {
    return undefined;
  }

  const parts = buildPlanParts(gameplan);
  const archetype = gameplan.aiStrategyArchetype ?? null;
  const offenseFocus = formatPlanValue(gameplan.offenseXFactorPlan?.offensiveFocus);
  const defenseFocus = formatPlanValue(gameplan.defenseXFactorPlan?.defensiveFocus);
  const aggression = formatPlanValue(gameplan.offenseXFactorPlan?.aggression);

  return {
    aiStrategyArchetype: archetype,
    label: archetype ? formatPlanValue(archetype) : "gameplan",
    summary:
      parts.length > 0
        ? `AI/Gameplan: ${parts.slice(0, 4).join(", ")}.`
        : "AI/Gameplan: balanced.",
    offenseFocus,
    defenseFocus,
    aggression,
  };
}

async function createConditionHistoryEvents(
  tx: Prisma.TransactionClient,
  input: {
    saveGameId: string;
    seasonId: string;
    week: number;
    scheduledAt: Date;
    player: SimulationPlayerContext;
    previous: {
      status: string;
      injuryStatus: string;
      injuryName: string | null;
      injuryEndsOn: Date | null;
    };
    next: {
      status: string;
      injuryStatus: string;
      injuryName: string | null;
      injuryEndsOn: Date | null;
    };
  },
) {
  const { player, previous, next } = input;

  if (
    previous.status === next.status &&
    previous.injuryStatus === next.injuryStatus &&
    previous.injuryName === next.injuryName &&
    previous.injuryEndsOn?.getTime() === next.injuryEndsOn?.getTime()
  ) {
    return;
  }

  if (next.injuryStatus !== "HEALTHY") {
    await createPlayerHistoryEvent({
      tx,
      saveGameId: input.saveGameId,
      playerId: player.id,
      seasonId: input.seasonId,
      teamId: player.teamId,
      type: PlayerHistoryEventType.INJURY,
      week: input.week,
      occurredAt: input.scheduledAt,
      title: "Verletzung im Spiel erlitten",
      description: `${formatPlayerName(player)}: ${next.injuryName ?? "Unspecified injury"} · ${next.injuryStatus}`,
    });
    return;
  }

  if (previous.injuryStatus !== "HEALTHY" && next.injuryStatus === "HEALTHY") {
    await createPlayerHistoryEvent({
      tx,
      saveGameId: input.saveGameId,
      playerId: player.id,
      seasonId: input.seasonId,
      teamId: player.teamId,
      type: PlayerHistoryEventType.RECOVERY,
      week: input.week,
      occurredAt: input.scheduledAt,
      title: "Zurueck im Training",
      description: `${formatPlayerName(player)} ist wieder einsatzbereit.`,
    });
  }
}

async function createDevelopmentHistory(
  tx: Prisma.TransactionClient,
  input: {
    saveGameId: string;
    seasonId: string;
    week: number;
    scheduledAt: Date;
    player: SimulationPlayerContext;
    development: Awaited<ReturnType<typeof applyWeeklyPlayerDevelopment>>;
  },
) {
  if (!input.development) {
    return;
  }

  const changeSummary = input.development.changes
    .map((change) => `${change.code} ${change.previous}->${change.next}`)
    .join(" · ");

  await createPlayerHistoryEvent({
    tx,
    saveGameId: input.saveGameId,
    playerId: input.player.id,
    seasonId: input.seasonId,
    teamId: input.player.teamId,
    type: PlayerHistoryEventType.DEVELOPMENT,
    week: input.week,
    occurredAt: input.scheduledAt,
    title:
      input.development.nextOverall > input.development.previousOverall
        ? "Spielerentwicklung sichtbar"
        : "Wochenanpassung am Spielerprofil",
    description: `XP ${input.development.xpGained} · OVR ${input.development.previousOverall}->${input.development.nextOverall} · ${changeSummary}`,
  });
}

async function createPlayerMatchBlocks(
  tx: Prisma.TransactionClient,
  playerMatchStatId: string,
  line: PlayerSimulationLine,
) {
  if (
    hasAnyNonZero([
      line.passing.attempts,
      line.passing.completions,
      line.passing.yards,
      line.passing.touchdowns,
      line.passing.interceptions,
      line.passing.sacksTaken,
      line.passing.sackYardsLost,
      line.passing.longestCompletion,
    ])
  ) {
    await tx.playerMatchPassingStat.create({
      data: {
        playerMatchStatId,
        ...line.passing,
      },
    });
  }

  if (
    hasAnyNonZero([
      line.rushing.attempts,
      line.rushing.yards,
      line.rushing.touchdowns,
      line.rushing.fumbles,
      line.rushing.longestRush,
      line.rushing.brokenTackles,
    ])
  ) {
    await tx.playerMatchRushingStat.create({
      data: {
        playerMatchStatId,
        ...line.rushing,
      },
    });
  }

  if (
    hasAnyNonZero([
      line.receiving.targets,
      line.receiving.receptions,
      line.receiving.yards,
      line.receiving.touchdowns,
      line.receiving.drops,
      line.receiving.longestReception,
      line.receiving.yardsAfterCatch,
    ])
  ) {
    await tx.playerMatchReceivingStat.create({
      data: {
        playerMatchStatId,
        ...line.receiving,
      },
    });
  }

  if (
    hasAnyNonZero([
      line.blocking.passBlockSnaps,
      line.blocking.runBlockSnaps,
      line.blocking.sacksAllowed,
      line.blocking.pressuresAllowed,
      line.blocking.pancakes,
    ])
  ) {
    await tx.playerMatchBlockingStat.create({
      data: {
        playerMatchStatId,
        ...line.blocking,
      },
    });
  }

  if (
    hasAnyNonZero([
      line.defensive.tackles,
      line.defensive.assistedTackles,
      line.defensive.tacklesForLoss,
      line.defensive.sacks,
      line.defensive.quarterbackHits,
      line.defensive.passesDefended,
      line.defensive.interceptions,
      line.defensive.forcedFumbles,
      line.defensive.fumbleRecoveries,
      line.defensive.defensiveTouchdowns,
      line.defensive.coverageSnaps,
      line.defensive.targetsAllowed,
      line.defensive.receptionsAllowed,
      line.defensive.yardsAllowed,
    ])
  ) {
    await tx.playerMatchDefensiveStat.create({
      data: {
        playerMatchStatId,
        ...line.defensive,
      },
    });
  }

  if (
    hasAnyNonZero([
      line.kicking.fieldGoalsMade,
      line.kicking.fieldGoalsAttempted,
      line.kicking.fieldGoalsMadeShort,
      line.kicking.fieldGoalsAttemptedShort,
      line.kicking.fieldGoalsMadeMid,
      line.kicking.fieldGoalsAttemptedMid,
      line.kicking.fieldGoalsMadeLong,
      line.kicking.fieldGoalsAttemptedLong,
      line.kicking.extraPointsMade,
      line.kicking.extraPointsAttempted,
      line.kicking.longestFieldGoal,
      line.kicking.kickoffTouchbacks,
    ])
  ) {
    await tx.playerMatchKickingStat.create({
      data: {
        playerMatchStatId,
        ...line.kicking,
      },
    });
  }

  if (
    hasAnyNonZero([
      line.punting.punts,
      line.punting.puntYards,
      line.punting.netPuntYards,
      line.punting.fairCatchesForced,
      line.punting.hangTimeTotalTenths,
      line.punting.puntsInside20,
      line.punting.touchbacks,
      line.punting.longestPunt,
    ])
  ) {
    await tx.playerMatchPuntingStat.create({
      data: {
        playerMatchStatId,
        ...line.punting,
      },
    });
  }

  if (
    hasAnyNonZero([
      line.returns.kickReturns,
      line.returns.kickReturnYards,
      line.returns.kickReturnTouchdowns,
      line.returns.kickReturnFumbles,
      line.returns.puntReturns,
      line.returns.puntReturnYards,
      line.returns.puntReturnTouchdowns,
      line.returns.puntReturnFumbles,
    ])
  ) {
    await tx.playerMatchReturnStat.create({
      data: {
        playerMatchStatId,
        ...line.returns,
      },
    });
  }
}

async function applyPlayerLine(
  tx: Prisma.TransactionClient,
  line: PlayerSimulationLine,
  saveGameId: string,
  matchId: string,
  playerContext: SimulationPlayerContext,
  teamAbbreviation: string,
) {
  const playerMatchStat = await seasonSimulationCommandRepository.createPlayerMatchStat(tx, {
    saveGameId,
    matchId,
    playerId: line.playerId,
    teamId: line.teamId,
    snapshotFullName: formatPlayerName(playerContext),
    snapshotPositionCode: playerContext.positionCode,
    snapshotTeamAbbreviation: teamAbbreviation,
    started: line.started,
    snapsOffense: line.snapsOffense,
    snapsDefense: line.snapsDefense,
    snapsSpecialTeams: line.snapsSpecialTeams,
  });

  await createPlayerMatchBlocks(tx, playerMatchStat.id, line);

  if (!playerContext.seasonStat || !playerContext.careerStat) {
    throw new Error(`Missing stat anchors for player ${playerContext.id}`);
  }

  await tx.playerSeasonStat.update({
    where: {
      id: playerContext.seasonStat.id,
    },
    data: {
      gamesPlayed: {
        increment: 1,
      },
      gamesStarted: {
        increment: line.started ? 1 : 0,
      },
      snapsOffense: {
        increment: line.snapsOffense,
      },
      snapsDefense: {
        increment: line.snapsDefense,
      },
      snapsSpecialTeams: {
        increment: line.snapsSpecialTeams,
      },
    },
  });

  await tx.playerCareerStat.update({
    where: {
      id: playerContext.careerStat.id,
    },
    data: {
      gamesPlayed: {
        increment: 1,
      },
      gamesStarted: {
        increment: line.started ? 1 : 0,
      },
      snapsOffense: {
        increment: line.snapsOffense,
      },
      snapsDefense: {
        increment: line.snapsDefense,
      },
      snapsSpecialTeams: {
        increment: line.snapsSpecialTeams,
      },
    },
  });

  await Promise.all([
    tx.playerSeasonPassingStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        attempts: { increment: line.passing.attempts },
        completions: { increment: line.passing.completions },
        yards: { increment: line.passing.yards },
        touchdowns: { increment: line.passing.touchdowns },
        interceptions: { increment: line.passing.interceptions },
        sacksTaken: { increment: line.passing.sacksTaken },
        sackYardsLost: { increment: line.passing.sackYardsLost },
        longestCompletion: Math.max(
          playerContext.seasonStat.passingLongestCompletion,
          line.passing.longestCompletion,
        ),
      },
    }),
    tx.playerCareerPassingStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        attempts: { increment: line.passing.attempts },
        completions: { increment: line.passing.completions },
        yards: { increment: line.passing.yards },
        touchdowns: { increment: line.passing.touchdowns },
        interceptions: { increment: line.passing.interceptions },
        sacksTaken: { increment: line.passing.sacksTaken },
        sackYardsLost: { increment: line.passing.sackYardsLost },
        longestCompletion: Math.max(
          playerContext.careerStat.passingLongestCompletion,
          line.passing.longestCompletion,
        ),
      },
    }),
    tx.playerSeasonRushingStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        attempts: { increment: line.rushing.attempts },
        yards: { increment: line.rushing.yards },
        touchdowns: { increment: line.rushing.touchdowns },
        fumbles: { increment: line.rushing.fumbles },
        brokenTackles: { increment: line.rushing.brokenTackles },
        longestRush: Math.max(
          playerContext.seasonStat.rushingLongestRush,
          line.rushing.longestRush,
        ),
      },
    }),
    tx.playerCareerRushingStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        attempts: { increment: line.rushing.attempts },
        yards: { increment: line.rushing.yards },
        touchdowns: { increment: line.rushing.touchdowns },
        fumbles: { increment: line.rushing.fumbles },
        brokenTackles: { increment: line.rushing.brokenTackles },
        longestRush: Math.max(
          playerContext.careerStat.rushingLongestRush,
          line.rushing.longestRush,
        ),
      },
    }),
    tx.playerSeasonReceivingStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        targets: { increment: line.receiving.targets },
        receptions: { increment: line.receiving.receptions },
        yards: { increment: line.receiving.yards },
        touchdowns: { increment: line.receiving.touchdowns },
        drops: { increment: line.receiving.drops },
        yardsAfterCatch: { increment: line.receiving.yardsAfterCatch },
        longestReception: Math.max(
          playerContext.seasonStat.receivingLongestReception,
          line.receiving.longestReception,
        ),
      },
    }),
    tx.playerCareerReceivingStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        targets: { increment: line.receiving.targets },
        receptions: { increment: line.receiving.receptions },
        yards: { increment: line.receiving.yards },
        touchdowns: { increment: line.receiving.touchdowns },
        drops: { increment: line.receiving.drops },
        yardsAfterCatch: { increment: line.receiving.yardsAfterCatch },
        longestReception: Math.max(
          playerContext.careerStat.receivingLongestReception,
          line.receiving.longestReception,
        ),
      },
    }),
    tx.playerSeasonBlockingStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        passBlockSnaps: { increment: line.blocking.passBlockSnaps },
        runBlockSnaps: { increment: line.blocking.runBlockSnaps },
        sacksAllowed: { increment: line.blocking.sacksAllowed },
        pressuresAllowed: { increment: line.blocking.pressuresAllowed },
        pancakes: { increment: line.blocking.pancakes },
      },
    }),
    tx.playerCareerBlockingStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        passBlockSnaps: { increment: line.blocking.passBlockSnaps },
        runBlockSnaps: { increment: line.blocking.runBlockSnaps },
        sacksAllowed: { increment: line.blocking.sacksAllowed },
        pressuresAllowed: { increment: line.blocking.pressuresAllowed },
        pancakes: { increment: line.blocking.pancakes },
      },
    }),
    tx.playerSeasonDefensiveStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        tackles: { increment: line.defensive.tackles },
        assistedTackles: { increment: line.defensive.assistedTackles },
        tacklesForLoss: { increment: line.defensive.tacklesForLoss },
        sacks: { increment: line.defensive.sacks },
        quarterbackHits: { increment: line.defensive.quarterbackHits },
        passesDefended: { increment: line.defensive.passesDefended },
        interceptions: { increment: line.defensive.interceptions },
        forcedFumbles: { increment: line.defensive.forcedFumbles },
        fumbleRecoveries: { increment: line.defensive.fumbleRecoveries },
        defensiveTouchdowns: { increment: line.defensive.defensiveTouchdowns },
        coverageSnaps: { increment: line.defensive.coverageSnaps },
        targetsAllowed: { increment: line.defensive.targetsAllowed },
        receptionsAllowed: { increment: line.defensive.receptionsAllowed },
        yardsAllowed: { increment: line.defensive.yardsAllowed },
      },
    }),
    tx.playerCareerDefensiveStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        tackles: { increment: line.defensive.tackles },
        assistedTackles: { increment: line.defensive.assistedTackles },
        tacklesForLoss: { increment: line.defensive.tacklesForLoss },
        sacks: { increment: line.defensive.sacks },
        quarterbackHits: { increment: line.defensive.quarterbackHits },
        passesDefended: { increment: line.defensive.passesDefended },
        interceptions: { increment: line.defensive.interceptions },
        forcedFumbles: { increment: line.defensive.forcedFumbles },
        fumbleRecoveries: { increment: line.defensive.fumbleRecoveries },
        defensiveTouchdowns: { increment: line.defensive.defensiveTouchdowns },
        coverageSnaps: { increment: line.defensive.coverageSnaps },
        targetsAllowed: { increment: line.defensive.targetsAllowed },
        receptionsAllowed: { increment: line.defensive.receptionsAllowed },
        yardsAllowed: { increment: line.defensive.yardsAllowed },
      },
    }),
    tx.playerSeasonKickingStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        fieldGoalsMade: { increment: line.kicking.fieldGoalsMade },
        fieldGoalsAttempted: { increment: line.kicking.fieldGoalsAttempted },
        fieldGoalsMadeShort: { increment: line.kicking.fieldGoalsMadeShort },
        fieldGoalsAttemptedShort: { increment: line.kicking.fieldGoalsAttemptedShort },
        fieldGoalsMadeMid: { increment: line.kicking.fieldGoalsMadeMid },
        fieldGoalsAttemptedMid: { increment: line.kicking.fieldGoalsAttemptedMid },
        fieldGoalsMadeLong: { increment: line.kicking.fieldGoalsMadeLong },
        fieldGoalsAttemptedLong: { increment: line.kicking.fieldGoalsAttemptedLong },
        extraPointsMade: { increment: line.kicking.extraPointsMade },
        extraPointsAttempted: { increment: line.kicking.extraPointsAttempted },
        kickoffTouchbacks: { increment: line.kicking.kickoffTouchbacks },
        longestFieldGoal: Math.max(
          playerContext.seasonStat.kickingLongestFieldGoal,
          line.kicking.longestFieldGoal,
        ),
      },
    }),
    tx.playerCareerKickingStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        fieldGoalsMade: { increment: line.kicking.fieldGoalsMade },
        fieldGoalsAttempted: { increment: line.kicking.fieldGoalsAttempted },
        fieldGoalsMadeShort: { increment: line.kicking.fieldGoalsMadeShort },
        fieldGoalsAttemptedShort: { increment: line.kicking.fieldGoalsAttemptedShort },
        fieldGoalsMadeMid: { increment: line.kicking.fieldGoalsMadeMid },
        fieldGoalsAttemptedMid: { increment: line.kicking.fieldGoalsAttemptedMid },
        fieldGoalsMadeLong: { increment: line.kicking.fieldGoalsMadeLong },
        fieldGoalsAttemptedLong: { increment: line.kicking.fieldGoalsAttemptedLong },
        extraPointsMade: { increment: line.kicking.extraPointsMade },
        extraPointsAttempted: { increment: line.kicking.extraPointsAttempted },
        kickoffTouchbacks: { increment: line.kicking.kickoffTouchbacks },
        longestFieldGoal: Math.max(
          playerContext.careerStat.kickingLongestFieldGoal,
          line.kicking.longestFieldGoal,
        ),
      },
    }),
    tx.playerSeasonPuntingStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        punts: { increment: line.punting.punts },
        puntYards: { increment: line.punting.puntYards },
        netPuntYards: { increment: line.punting.netPuntYards },
        fairCatchesForced: { increment: line.punting.fairCatchesForced },
        hangTimeTotalTenths: { increment: line.punting.hangTimeTotalTenths },
        puntsInside20: { increment: line.punting.puntsInside20 },
        touchbacks: { increment: line.punting.touchbacks },
        longestPunt: Math.max(
          playerContext.seasonStat.puntingLongestPunt,
          line.punting.longestPunt,
        ),
      },
    }),
    tx.playerCareerPuntingStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        punts: { increment: line.punting.punts },
        puntYards: { increment: line.punting.puntYards },
        netPuntYards: { increment: line.punting.netPuntYards },
        fairCatchesForced: { increment: line.punting.fairCatchesForced },
        hangTimeTotalTenths: { increment: line.punting.hangTimeTotalTenths },
        puntsInside20: { increment: line.punting.puntsInside20 },
        touchbacks: { increment: line.punting.touchbacks },
        longestPunt: Math.max(
          playerContext.careerStat.puntingLongestPunt,
          line.punting.longestPunt,
        ),
      },
    }),
    tx.playerSeasonReturnStat.update({
      where: {
        playerSeasonStatId: playerContext.seasonStat.id,
      },
      data: {
        kickReturns: { increment: line.returns.kickReturns },
        kickReturnYards: { increment: line.returns.kickReturnYards },
        kickReturnTouchdowns: { increment: line.returns.kickReturnTouchdowns },
        kickReturnFumbles: { increment: line.returns.kickReturnFumbles },
        puntReturns: { increment: line.returns.puntReturns },
        puntReturnYards: { increment: line.returns.puntReturnYards },
        puntReturnTouchdowns: { increment: line.returns.puntReturnTouchdowns },
        puntReturnFumbles: { increment: line.returns.puntReturnFumbles },
      },
    }),
    tx.playerCareerReturnStat.update({
      where: {
        playerCareerStatId: playerContext.careerStat.id,
      },
      data: {
        kickReturns: { increment: line.returns.kickReturns },
        kickReturnYards: { increment: line.returns.kickReturnYards },
        kickReturnTouchdowns: { increment: line.returns.kickReturnTouchdowns },
        kickReturnFumbles: { increment: line.returns.kickReturnFumbles },
        puntReturns: { increment: line.returns.puntReturns },
        puntReturnYards: { increment: line.returns.puntReturnYards },
        puntReturnTouchdowns: { increment: line.returns.puntReturnTouchdowns },
        puntReturnFumbles: { increment: line.returns.puntReturnFumbles },
      },
    }),
  ]);
}

export async function persistMatchResult(
  tx: Prisma.TransactionClient,
  context: SimulationMatchContext,
  result: MatchSimulationResult,
) {
  await seasonSimulationCommandRepository.updateMatchScore(tx, context.matchId, {
    status: MatchStatus.COMPLETED,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    simulationCompletedAt: new Date(),
  });

  await seasonSimulationCommandRepository.replaceMatchSimulationDrives(
    tx,
    context.matchId,
    context.saveGameId,
    result.drives.map((drive) => ({
      saveGameId: context.saveGameId,
      matchId: context.matchId,
      sequence: drive.sequence,
      phaseLabel: drive.phaseLabel,
      offenseTeamId: drive.offenseTeamId,
      offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
      defenseTeamId: drive.defenseTeamId,
      defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
      startedHomeScore: drive.startedHomeScore,
      startedAwayScore: drive.startedAwayScore,
      endedHomeScore: drive.endedHomeScore,
      endedAwayScore: drive.endedAwayScore,
      plays: drive.plays,
      passAttempts: drive.passAttempts,
      rushAttempts: drive.rushAttempts,
      totalYards: drive.totalYards,
      resultType: drive.resultType,
      pointsScored: drive.pointsScored,
      turnover: drive.turnover,
      redZoneTrip: drive.redZoneTrip,
      summary: drive.summary,
      primaryPlayerName: drive.primaryPlayerName,
      primaryDefenderName: drive.primaryDefenderName,
    })),
  );

  await Promise.all([
    seasonSimulationCommandRepository.upsertTeamMatchStat(tx, {
      saveGameId: context.saveGameId,
      matchId: context.matchId,
      teamId: context.homeTeam.id,
      firstDowns: result.homeTeam.firstDowns,
      totalYards: result.homeTeam.totalYards,
      passingYards: result.homeTeam.passingYards,
      rushingYards: result.homeTeam.rushingYards,
      turnovers: result.homeTeam.turnovers,
      sacks: result.homeTeam.sacks,
      explosivePlays: result.homeTeam.explosivePlays,
      redZoneTrips: result.homeTeam.redZoneTrips,
      redZoneTouchdowns: result.homeTeam.redZoneTouchdowns,
      penalties: result.homeTeam.penalties,
      timeOfPossessionSeconds: result.homeTeam.timeOfPossessionSeconds,
      gameplanSummary: buildTeamGameplanReportSummary(
        context.teamGameplans?.[context.homeTeam.id],
      ),
    }),
    seasonSimulationCommandRepository.upsertTeamMatchStat(tx, {
      saveGameId: context.saveGameId,
      matchId: context.matchId,
      teamId: context.awayTeam.id,
      firstDowns: result.awayTeam.firstDowns,
      totalYards: result.awayTeam.totalYards,
      passingYards: result.awayTeam.passingYards,
      rushingYards: result.awayTeam.rushingYards,
      turnovers: result.awayTeam.turnovers,
      sacks: result.awayTeam.sacks,
      explosivePlays: result.awayTeam.explosivePlays,
      redZoneTrips: result.awayTeam.redZoneTrips,
      redZoneTouchdowns: result.awayTeam.redZoneTouchdowns,
      penalties: result.awayTeam.penalties,
      timeOfPossessionSeconds: result.awayTeam.timeOfPossessionSeconds,
      gameplanSummary: buildTeamGameplanReportSummary(
        context.teamGameplans?.[context.awayTeam.id],
      ),
    }),
  ]);

  const isTie = result.homeScore === result.awayScore;
  const homeWon = result.homeScore > result.awayScore;
  const awayWon = result.awayScore > result.homeScore;

  await Promise.all([
    seasonSimulationCommandRepository.updateTeamSeasonStat(
      tx,
      context.seasonId,
      context.homeTeam.id,
      {
        gamesPlayed: { increment: 1 },
        wins: { increment: homeWon ? 1 : 0 },
        losses: { increment: awayWon ? 1 : 0 },
        ties: { increment: isTie ? 1 : 0 },
        pointsFor: { increment: result.homeScore },
        pointsAgainst: { increment: result.awayScore },
        touchdownsFor: { increment: result.homeTeam.touchdowns },
        touchdownsAgainst: { increment: result.awayTeam.touchdowns },
        turnoversForced: { increment: result.awayTeam.turnovers },
        turnoversCommitted: { increment: result.homeTeam.turnovers },
        passingYards: { increment: result.homeTeam.passingYards },
        rushingYards: { increment: result.homeTeam.rushingYards },
        sacks: { increment: result.homeTeam.sacks },
        explosivePlays: { increment: result.homeTeam.explosivePlays },
        redZoneTrips: { increment: result.homeTeam.redZoneTrips },
        redZoneTouchdowns: { increment: result.homeTeam.redZoneTouchdowns },
      },
    ),
    seasonSimulationCommandRepository.updateTeamSeasonStat(
      tx,
      context.seasonId,
      context.awayTeam.id,
      {
        gamesPlayed: { increment: 1 },
        wins: { increment: awayWon ? 1 : 0 },
        losses: { increment: homeWon ? 1 : 0 },
        ties: { increment: isTie ? 1 : 0 },
        pointsFor: { increment: result.awayScore },
        pointsAgainst: { increment: result.homeScore },
        touchdownsFor: { increment: result.awayTeam.touchdowns },
        touchdownsAgainst: { increment: result.homeTeam.touchdowns },
        turnoversForced: { increment: result.homeTeam.turnovers },
        turnoversCommitted: { increment: result.awayTeam.turnovers },
        passingYards: { increment: result.awayTeam.passingYards },
        rushingYards: { increment: result.awayTeam.rushingYards },
        sacks: { increment: result.awayTeam.sacks },
        explosivePlays: { increment: result.awayTeam.explosivePlays },
        redZoneTrips: { increment: result.awayTeam.redZoneTrips },
        redZoneTouchdowns: { increment: result.awayTeam.redZoneTouchdowns },
      },
    ),
  ]);

  const playerContextById = new Map(
    [...context.homeTeam.roster, ...context.awayTeam.roster].map((player) => [player.id, player]),
  );
  const teamAbbreviationById = new Map(
    [context.homeTeam, context.awayTeam].map((team) => [team.id, team.abbreviation]),
  );

  for (const line of result.playerLines) {
    const playerContext = playerContextById.get(line.playerId);

    if (!playerContext) {
      continue;
    }

    await applyPlayerLine(
      tx,
      line,
      context.saveGameId,
      context.matchId,
      playerContext,
      teamAbbreviationById.get(line.teamId) ?? "n/a",
    );

    const conditionUpdate = buildPlayerConditionUpdate(
      playerContext,
      line,
      result,
      context.scheduledAt,
      createSeededRandom(
        deriveSimulationSeed(context.simulationSeed, `condition:${line.playerId}`),
      ),
    );

    await seasonSimulationCommandRepository.updatePlayer(
      tx,
      line.playerId,
      conditionUpdate,
    );

    await createConditionHistoryEvents(tx, {
      saveGameId: context.saveGameId,
      seasonId: context.seasonId,
      week: context.week,
      scheduledAt: context.scheduledAt,
      player: playerContext,
      previous: {
        status: playerContext.status,
        injuryStatus: playerContext.injuryStatus,
        injuryName: playerContext.injuryName,
        injuryEndsOn: playerContext.injuryEndsOn,
      },
      next: {
        status: conditionUpdate.status,
        injuryStatus: conditionUpdate.injuryStatus,
        injuryName: conditionUpdate.injuryName,
        injuryEndsOn: conditionUpdate.injuryEndsOn,
      },
    });

    const development = await applyWeeklyPlayerDevelopment({
      tx,
      saveGameId: context.saveGameId,
      player: playerContext,
      line,
    });

    await createDevelopmentHistory(tx, {
      saveGameId: context.saveGameId,
      seasonId: context.seasonId,
      week: context.week,
      scheduledAt: context.scheduledAt,
      player: playerContext,
      development,
    });
  }

  await Promise.all([
    recalculateTeamState(tx, context.saveGameId, context.homeTeam.id),
    recalculateTeamState(tx, context.saveGameId, context.awayTeam.id),
  ]);
}
