import type { GameSituationSnapshot } from "./game-situation";
import type { ResolvedPlayEvent } from "./play-resolution";

export type GameStatsVersion = 1;

export type GameStatsSource =
  | "GAMEPLAY_ENGINE"
  | "SEASON_SIMULATION_AGGREGATE"
  | "IMPORTED";

export type TeamId = string;
export type PlayerId = string;
export type GameId = string;
export type DriveId = string;
export type PlayId = string;

export type DriveResultType =
  | "TOUCHDOWN"
  | "FIELD_GOAL_MADE"
  | "FIELD_GOAL_MISSED"
  | "PUNT"
  | "TURNOVER"
  | "TURNOVER_ON_DOWNS"
  | "SAFETY"
  | "IN_PROGRESS"
  | "END_HALF"
  | "END_GAME"
  | "EMPTY_DRIVE";

export type PlayStatsType =
  | "RUN"
  | "PASS"
  | "SACK"
  | "PUNT"
  | "FIELD_GOAL"
  | "EXTRA_POINT"
  | "KICKOFF"
  | "PENALTY"
  | "CLOCK";

export type PlayStatsResultType =
  | "SUCCESS"
  | "EXPLOSIVE"
  | "NEGATIVE"
  | "NEUTRAL"
  | "TOUCHDOWN"
  | "TURNOVER"
  | "PENALTY";

export type TurnoverStatsType =
  | "INTERCEPTION"
  | "FUMBLE"
  | "TURNOVER_ON_DOWNS";

export type PlayerPlayRole =
  | "PASSER"
  | "RUSHER"
  | "TARGET"
  | "RECEIVER"
  | "TACKLER"
  | "PASS_RUSHER"
  | "COVERAGE_DEFENDER"
  | "FORCED_FUMBLE_DEFENDER"
  | "RECOVERY_PLAYER"
  | "KICKER"
  | "PUNTER"
  | "RETURNER"
  | "BLOCKER";

export type ScoreSnapshot = {
  byTeamId: Record<TeamId, number>;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  home: number;
  away: number;
};

export type FieldPositionSnapshot = {
  yardLine: number;
  possessionTeamId: TeamId;
  defenseTeamId: TeamId;
  down: GameSituationSnapshot["down"];
  yardsToGo: number;
};

export type ClockSnapshot = {
  quarter: GameSituationSnapshot["quarter"];
  secondsRemainingInQuarter: number;
  secondsRemainingInGame: number;
};

export type GameStateStatsSnapshot = {
  /**
   * Existing engine state at the moment a stat event is observed.
   * Keep this as the bridge to Gameplay selection/resolution.
   */
  situation: GameSituationSnapshot;
  score: ScoreSnapshot;
  fieldPosition: FieldPositionSnapshot;
  clock: ClockSnapshot;
};

export function createGameStateStatsSnapshot(input: {
  situation: GameSituationSnapshot;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
}): GameStateStatsSnapshot {
  const { situation } = input;
  const byTeamId: Record<TeamId, number> = {
    [situation.possessionTeamId]: situation.offenseScore,
    [situation.defenseTeamId]: situation.defenseScore,
  };

  return {
    situation,
    score: {
      byTeamId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      home: byTeamId[input.homeTeamId] ?? 0,
      away: byTeamId[input.awayTeamId] ?? 0,
    },
    fieldPosition: {
      yardLine: situation.ballOnYardLine,
      possessionTeamId: situation.possessionTeamId,
      defenseTeamId: situation.defenseTeamId,
      down: situation.down,
      yardsToGo: situation.yardsToGo,
    },
    clock: {
      quarter: situation.quarter,
      secondsRemainingInQuarter: situation.secondsRemainingInQuarter,
      secondsRemainingInGame: situation.secondsRemainingInGame,
    },
  };
}

export type PenaltyStats = {
  penaltyId: string;
  teamId: TeamId;
  playerId: PlayerId | null;
  code: string;
  yards: number;
  accepted: boolean;
  automaticFirstDown: boolean;
  offsetting: boolean;
};

export type TurnoverStats = {
  type: TurnoverStatsType;
  committedByTeamId: TeamId;
  forcedByTeamId: TeamId;
  chargedPlayerId: PlayerId | null;
  forcedByPlayerId: PlayerId | null;
  recoveredByPlayerId: PlayerId | null;
  recoveryTeamId: TeamId;
  returnYards: number;
  touchdown: boolean;
};

export type PassingStats = {
  attempts: number;
  completions: number;
  yards: number;
  touchdowns: number;
  interceptions: number;
  sacksTaken: number;
  sackYardsLost: number;
};

export type RushingStats = {
  carries: number;
  yards: number;
  touchdowns: number;
  fumbles: number;
};

export type ReceivingStats = {
  targets: number;
  receptions: number;
  yards: number;
  touchdowns: number;
  yardsAfterCatch: number;
};

export type DefensiveStats = {
  tackles: number;
  sacks: number;
  interceptions: number;
  forcedFumbles: number;
  fumbleRecoveries: number;
  passesDefended: number;
  defensiveTouchdowns: number;
};

export type BallSecurityStats = {
  fumbles: number;
  fumblesLost: number;
};

export type SpecialTeamsStats = {
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  extraPointsMade: number;
  extraPointsAttempted: number;
  punts: number;
  puntYards: number;
  kickReturns: number;
  kickReturnYards: number;
  puntReturns: number;
  puntReturnYards: number;
};

export type TeamStats = {
  teamId: TeamId;
  opponentTeamId: TeamId;
  points: number;
  totalYards: number;
  passingYards: number;
  grossPassingYards: number;
  sackYardsLost: number;
  rushingYards: number;
  turnovers: number;
  turnoversForced: number;
  interceptionsThrown: number;
  fumblesLost: number;
  firstDowns: number;
  timeOfPossessionSeconds: number;
  penalties: number;
  penaltyYards: number;
  sacks: number;
  sacksAllowed: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
};

export type PlayerStats = {
  playerId: PlayerId;
  teamId: TeamId;
  snapshotFullName: string | null;
  snapshotPositionCode: string | null;
  started: boolean;
  snapsOffense: number;
  snapsDefense: number;
  snapsSpecialTeams: number;
  passing: PassingStats;
  rushing: RushingStats;
  receiving: ReceivingStats;
  defensive: DefensiveStats;
  ballSecurity: BallSecurityStats;
  specialTeams: SpecialTeamsStats;
};

export function createEmptyPassingStats(): PassingStats {
  return {
    attempts: 0,
    completions: 0,
    yards: 0,
    touchdowns: 0,
    interceptions: 0,
    sacksTaken: 0,
    sackYardsLost: 0,
  };
}

export function createEmptyRushingStats(): RushingStats {
  return {
    carries: 0,
    yards: 0,
    touchdowns: 0,
    fumbles: 0,
  };
}

export function createEmptyReceivingStats(): ReceivingStats {
  return {
    targets: 0,
    receptions: 0,
    yards: 0,
    touchdowns: 0,
    yardsAfterCatch: 0,
  };
}

export function createEmptyDefensiveStats(): DefensiveStats {
  return {
    tackles: 0,
    sacks: 0,
    interceptions: 0,
    forcedFumbles: 0,
    fumbleRecoveries: 0,
    passesDefended: 0,
    defensiveTouchdowns: 0,
  };
}

export function createEmptyBallSecurityStats(): BallSecurityStats {
  return {
    fumbles: 0,
    fumblesLost: 0,
  };
}

export function createEmptySpecialTeamsStats(): SpecialTeamsStats {
  return {
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    extraPointsMade: 0,
    extraPointsAttempted: 0,
    punts: 0,
    puntYards: 0,
    kickReturns: 0,
    kickReturnYards: 0,
    puntReturns: 0,
    puntReturnYards: 0,
  };
}

export function createEmptyTeamStats(
  teamId: TeamId,
  opponentTeamId: TeamId,
): TeamStats {
  return {
    teamId,
    opponentTeamId,
    points: 0,
    totalYards: 0,
    passingYards: 0,
    grossPassingYards: 0,
    sackYardsLost: 0,
    rushingYards: 0,
    turnovers: 0,
    turnoversForced: 0,
    interceptionsThrown: 0,
    fumblesLost: 0,
    firstDowns: 0,
    timeOfPossessionSeconds: 0,
    penalties: 0,
    penaltyYards: 0,
    sacks: 0,
    sacksAllowed: 0,
    explosivePlays: 0,
    redZoneTrips: 0,
    redZoneTouchdowns: 0,
  };
}

export function createEmptyPlayerStats(input: {
  playerId: PlayerId;
  teamId: TeamId;
  snapshotFullName?: string | null;
  snapshotPositionCode?: string | null;
  started?: boolean;
  snapsOffense?: number;
  snapsDefense?: number;
  snapsSpecialTeams?: number;
}): PlayerStats {
  return {
    playerId: input.playerId,
    teamId: input.teamId,
    snapshotFullName: input.snapshotFullName ?? null,
    snapshotPositionCode: input.snapshotPositionCode ?? null,
    started: input.started ?? false,
    snapsOffense: input.snapsOffense ?? 0,
    snapsDefense: input.snapsDefense ?? 0,
    snapsSpecialTeams: input.snapsSpecialTeams ?? 0,
    passing: createEmptyPassingStats(),
    rushing: createEmptyRushingStats(),
    receiving: createEmptyReceivingStats(),
    defensive: createEmptyDefensiveStats(),
    ballSecurity: createEmptyBallSecurityStats(),
    specialTeams: createEmptySpecialTeamsStats(),
  };
}

export type PlayerPlayStats = {
  playerId: PlayerId;
  teamId: TeamId;
  roles: PlayerPlayRole[];
  passing?: Partial<PassingStats>;
  rushing?: Partial<RushingStats>;
  receiving?: Partial<ReceivingStats>;
  defensive?: Partial<DefensiveStats>;
  ballSecurity?: Partial<BallSecurityStats>;
  specialTeams?: Partial<SpecialTeamsStats>;
};

export type PlayCallStatsReference = {
  offensePlayId: string | null;
  offensePlayFamily: string | null;
  defensePlayId: string | null;
  defensePlayFamily: string | null;
};

export type PlayResolutionStatsReference = Pick<
  ResolvedPlayEvent,
  | "path"
  | "family"
  | "yards"
  | "success"
  | "explosive"
  | "turnoverType"
  | "pressureEvent"
  | "completion"
  | "throwaway"
  | "airYards"
  | "yardsAfterCatch"
  | "firstDown"
  | "touchdown"
  | "scoreDelta"
  | "clockRunoffSeconds"
  | "penaltyCode"
>;

export function createPlayResolutionStatsReference(
  event: ResolvedPlayEvent,
): PlayResolutionStatsReference {
  return {
    path: event.path,
    family: event.family,
    yards: event.yards,
    success: event.success,
    explosive: event.explosive,
    turnoverType: event.turnoverType,
    pressureEvent: event.pressureEvent,
    completion: event.completion,
    throwaway: event.throwaway,
    airYards: event.airYards,
    yardsAfterCatch: event.yardsAfterCatch,
    firstDown: event.firstDown,
    touchdown: event.touchdown,
    scoreDelta: event.scoreDelta,
    clockRunoffSeconds: event.clockRunoffSeconds,
    penaltyCode: event.penaltyCode,
  };
}

export type PlayStats = {
  playId: PlayId;
  gameId: GameId;
  driveId: DriveId;
  sequenceInGame: number;
  sequenceInDrive: number;
  offenseTeamId: TeamId;
  defenseTeamId: TeamId;
  playType: PlayStatsType;
  playCall: PlayCallStatsReference | null;
  stateBefore: GameStateStatsSnapshot;
  stateAfter: GameStateStatsSnapshot | null;
  yardsGained: number;
  resultTypes: PlayStatsResultType[];
  firstDown: boolean;
  touchdown: boolean;
  pointsScored: number;
  turnover: TurnoverStats | null;
  penalty: PenaltyStats | null;
  clockRunoffSeconds: number;
  resolution: PlayResolutionStatsReference | null;
  playerStats: PlayerPlayStats[];
};

export type DriveStats = {
  driveId: DriveId;
  gameId: GameId;
  sequence: number;
  offenseTeamId: TeamId;
  defenseTeamId: TeamId;
  startState: GameStateStatsSnapshot;
  endState: GameStateStatsSnapshot | null;
  playCount: number;
  yards: number;
  passingYards: number;
  rushingYards: number;
  firstDowns: number;
  result: DriveResultType;
  pointsScored: number;
  turnover: TurnoverStats | null;
  penalties: PenaltyStats[];
  timeOfPossessionSeconds: number;
  plays: PlayStats[];
};

export type GameStats = {
  version: GameStatsVersion;
  source: GameStatsSource;
  gameId: GameId;
  saveGameId: string;
  seasonId: string;
  week: number;
  simulationSeed: string | null;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  finalScore: ScoreSnapshot;
  teamStats: TeamStats[];
  playerStats: PlayerStats[];
  drives: DriveStats[];
};

/**
 * Use GameStats as the canonical write contract for future play-by-play.
 * Aggregate tables can be materialized from this tree instead of calculated separately.
 */
export type GameStatsTree = GameStats;
