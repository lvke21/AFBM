import {
  createEmptyPlayerStats,
  createEmptyTeamStats,
  type DriveId,
  type DriveResultType,
  type DriveStats,
  type GameId,
  type GameStateStatsSnapshot,
  type GameStats,
  type PenaltyStats,
  type PlayerId,
  type PlayerStats,
  type PlayStats,
  type TeamId,
  type TeamStats,
  type TurnoverStats,
} from "../domain/game-stats";

export type CreateDriveStatsInput = {
  driveId: DriveId;
  gameId: GameId;
  sequence: number;
  offenseTeamId: TeamId;
  defenseTeamId: TeamId;
  startState: GameStateStatsSnapshot;
  plays?: PlayStats[];
};

export function createDriveStats(input: CreateDriveStatsInput): DriveStats {
  const drive: DriveStats = {
    driveId: input.driveId,
    gameId: input.gameId,
    sequence: input.sequence,
    offenseTeamId: input.offenseTeamId,
    defenseTeamId: input.defenseTeamId,
    startState: input.startState,
    endState: null,
    playCount: 0,
    yards: 0,
    passingYards: 0,
    rushingYards: 0,
    firstDowns: 0,
    result: "IN_PROGRESS",
    pointsScored: 0,
    turnover: null,
    penalties: [],
    timeOfPossessionSeconds: 0,
    plays: input.plays ?? [],
  };

  return input.plays == null ? drive : finalizeDriveStats(drive);
}

export function isDriveTerminalResult(result: DriveResultType) {
  return result !== "IN_PROGRESS";
}

export function inferDriveResultFromPlay(
  play: PlayStats | null | undefined,
): DriveResultType {
  if (!play) {
    return "EMPTY_DRIVE";
  }

  if (play.playType === "PUNT") {
    return "PUNT";
  }

  if (play.playType === "FIELD_GOAL") {
    return play.pointsScored >= 3 || play.resultTypes.includes("SUCCESS")
      ? "FIELD_GOAL_MADE"
      : "FIELD_GOAL_MISSED";
  }

  if (play.turnover) {
    return play.turnover.type === "TURNOVER_ON_DOWNS"
      ? "TURNOVER_ON_DOWNS"
      : "TURNOVER";
  }

  if (play.touchdown || play.resultTypes.includes("TOUCHDOWN")) {
    return "TOUCHDOWN";
  }

  return "IN_PROGRESS";
}

export function finalizeDriveStats(
  drive: DriveStats,
  resultOverride?: DriveResultType,
): DriveStats {
  const penalties = drive.plays
    .map((play) => play.penalty)
    .filter((penalty): penalty is PenaltyStats => penalty != null);
  const turnover =
    [...drive.plays]
      .reverse()
      .map((play) => play.turnover)
      .find((entry): entry is TurnoverStats => entry != null) ?? null;
  const lastPlay = drive.plays[drive.plays.length - 1] ?? null;
  const result =
    resultOverride ??
    (lastPlay ? inferDriveResultFromPlay(lastPlay) : "EMPTY_DRIVE");

  return {
    ...drive,
    endState: lastPlay?.stateAfter ?? drive.endState,
    playCount: drive.plays.length,
    yards: drive.plays
      .filter(countsTowardScrimmageYards)
      .reduce((sum, play) => sum + play.yardsGained, 0),
    passingYards: drive.plays.reduce(
      (sum, play) => sum + passingYardsForPlay(play),
      0,
    ),
    rushingYards: drive.plays
      .filter((play) => play.playType === "RUN")
      .reduce((sum, play) => sum + play.yardsGained, 0),
    firstDowns: drive.plays.filter(countsAsOffensiveFirstDown).length,
    result,
    pointsScored: drive.plays.reduce(
      (sum, play) => sum + play.pointsScored,
      0,
    ),
    turnover,
    penalties,
    timeOfPossessionSeconds: drive.plays.reduce(
      (sum, play) => sum + play.clockRunoffSeconds,
      0,
    ),
  };
}

export function aggregateGameStats(gameStats: GameStats): GameStats {
  const drives = gameStats.drives.map((drive) => finalizeDriveStats(drive));
  const teamStatsById = new Map<TeamId, TeamStats>();
  const playerStatsById = new Map<PlayerId, PlayerStats>();

  for (const teamId of collectTeamIds(gameStats, drives)) {
    teamStatsById.set(
      teamId,
      createEmptyTeamStats(teamId, opponentTeamId(gameStats, teamId)),
    );
  }

  for (const player of gameStats.playerStats) {
    playerStatsById.set(
      player.playerId,
      createEmptyPlayerStats({
        playerId: player.playerId,
        teamId: player.teamId,
        snapshotFullName: player.snapshotFullName,
        snapshotPositionCode: player.snapshotPositionCode,
        started: player.started,
        snapsOffense: player.snapsOffense,
        snapsDefense: player.snapsDefense,
        snapsSpecialTeams: player.snapsSpecialTeams,
      }),
    );
  }

  for (const drive of drives) {
    const offenseStats = ensureAggregatedTeamStats(
      teamStatsById,
      gameStats,
      drive.offenseTeamId,
    );

    offenseStats.points += drive.pointsScored;
    offenseStats.totalYards += drive.yards;
    offenseStats.passingYards += drive.passingYards;
    offenseStats.rushingYards += drive.rushingYards;
    offenseStats.firstDowns += drive.firstDowns;
    offenseStats.timeOfPossessionSeconds += drive.timeOfPossessionSeconds;

    if (isRedZoneDrive(drive)) {
      offenseStats.redZoneTrips += 1;

      if (drive.result === "TOUCHDOWN") {
        offenseStats.redZoneTouchdowns += 1;
      }
    }

    for (const penalty of drive.penalties) {
      const penalizedTeamStats = ensureAggregatedTeamStats(
        teamStatsById,
        gameStats,
        penalty.teamId,
      );
      penalizedTeamStats.penalties += penalty.accepted ? 1 : 0;
      penalizedTeamStats.penaltyYards += penalty.accepted ? penalty.yards : 0;
    }

    for (const play of drive.plays) {
      aggregateTeamPlayStats(teamStatsById, gameStats, play);
      aggregatePlayerPlayStats(playerStatsById, play);
    }
  }

  const finalScoreByTeamId: Record<TeamId, number> = {};

  for (const [teamId, teamStats] of teamStatsById.entries()) {
    finalScoreByTeamId[teamId] = teamStats.points;
  }

  return {
    ...gameStats,
    finalScore: {
      byTeamId: finalScoreByTeamId,
      homeTeamId: gameStats.homeTeamId,
      awayTeamId: gameStats.awayTeamId,
      home: finalScoreByTeamId[gameStats.homeTeamId] ?? 0,
      away: finalScoreByTeamId[gameStats.awayTeamId] ?? 0,
    },
    teamStats: [...teamStatsById.values()],
    playerStats: [...playerStatsById.values()],
    drives,
  };
}

function countsTowardScrimmageYards(play: PlayStats) {
  return play.playType === "RUN" || play.playType === "PASS" || play.playType === "SACK";
}

function passingYardsForPlay(play: PlayStats) {
  if (play.playType === "SACK") {
    return play.yardsGained;
  }

  if (play.playType === "PASS" && play.resolution?.completion === true) {
    return Math.max(0, play.yardsGained);
  }

  return 0;
}

function countsAsOffensiveFirstDown(play: PlayStats) {
  if (play.turnover) {
    return false;
  }

  return (
    (play.firstDown && play.penalty == null) ||
    play.penalty?.automaticFirstDown === true
  );
}

function collectTeamIds(gameStats: GameStats, drives: DriveStats[]) {
  return new Set<TeamId>([
    gameStats.homeTeamId,
    gameStats.awayTeamId,
    ...gameStats.teamStats.map((teamStats) => teamStats.teamId),
    ...drives.flatMap((drive) => [drive.offenseTeamId, drive.defenseTeamId]),
  ]);
}

function opponentTeamId(gameStats: GameStats, teamId: TeamId) {
  if (teamId === gameStats.homeTeamId) {
    return gameStats.awayTeamId;
  }

  if (teamId === gameStats.awayTeamId) {
    return gameStats.homeTeamId;
  }

  return "";
}

function ensureAggregatedTeamStats(
  teamStatsById: Map<TeamId, TeamStats>,
  gameStats: GameStats,
  teamId: TeamId,
) {
  const existing = teamStatsById.get(teamId);

  if (existing) {
    return existing;
  }

  const created = createEmptyTeamStats(teamId, opponentTeamId(gameStats, teamId));
  teamStatsById.set(teamId, created);
  return created;
}

function aggregateTeamPlayStats(
  teamStatsById: Map<TeamId, TeamStats>,
  gameStats: GameStats,
  play: PlayStats,
) {
  const offenseStats = ensureAggregatedTeamStats(
    teamStatsById,
    gameStats,
    play.offenseTeamId,
  );
  const defenseStats = ensureAggregatedTeamStats(
    teamStatsById,
    gameStats,
    play.defenseTeamId,
  );

  if (play.playType === "PASS" && play.resolution?.completion === true) {
    offenseStats.grossPassingYards += Math.max(0, play.yardsGained);
  }

  if (play.playType === "SACK") {
    const sackYardsLost = Math.abs(Math.min(0, play.yardsGained));
    offenseStats.sacksAllowed += 1;
    offenseStats.sackYardsLost += sackYardsLost;
    defenseStats.sacks += 1;
  }

  if (play.resultTypes.includes("EXPLOSIVE")) {
    offenseStats.explosivePlays += 1;
  }

  if (!play.turnover) {
    return;
  }

  const committedBy = ensureAggregatedTeamStats(
    teamStatsById,
    gameStats,
    play.turnover.committedByTeamId,
  );
  const forcedBy = ensureAggregatedTeamStats(
    teamStatsById,
    gameStats,
    play.turnover.forcedByTeamId,
  );

  committedBy.turnovers += 1;
  forcedBy.turnoversForced += 1;

  if (play.turnover.type === "INTERCEPTION") {
    committedBy.interceptionsThrown += 1;
  }

  if (play.turnover.type === "FUMBLE") {
    committedBy.fumblesLost += 1;
  }
}

function aggregatePlayerPlayStats(
  playerStatsById: Map<PlayerId, PlayerStats>,
  play: PlayStats,
) {
  for (const playerDelta of play.playerStats) {
    const playerStats =
      playerStatsById.get(playerDelta.playerId) ??
      createEmptyPlayerStats({
        playerId: playerDelta.playerId,
        teamId: playerDelta.teamId,
      });

    addPartialNumberStats(playerStats.passing, playerDelta.passing);
    addPartialNumberStats(playerStats.rushing, playerDelta.rushing);
    addPartialNumberStats(playerStats.receiving, playerDelta.receiving);
    addPartialNumberStats(playerStats.defensive, playerDelta.defensive);
    addPartialNumberStats(playerStats.ballSecurity, playerDelta.ballSecurity);
    addPartialNumberStats(playerStats.specialTeams, playerDelta.specialTeams);

    playerStatsById.set(playerDelta.playerId, playerStats);
  }
}

function addPartialNumberStats<TStats extends object>(
  target: TStats,
  delta: Partial<TStats> | undefined,
) {
  if (!delta) {
    return;
  }

  const numericTarget = target as Record<string, number>;

  for (const [key, value] of Object.entries(delta)) {
    if (typeof value === "number") {
      numericTarget[key] = (numericTarget[key] ?? 0) + value;
    }
  }
}

function isRedZoneDrive(drive: DriveStats) {
  return (
    drive.startState.fieldPosition.yardLine >= 80 ||
    drive.plays.some((play) => play.stateBefore.fieldPosition.yardLine >= 80)
  );
}
