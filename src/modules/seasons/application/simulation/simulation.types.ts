import type { PreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";
import type { MatchKind } from "@/modules/shared/domain/enums";

export type SimulationAttributeMap = Record<string, number>;

export type SimulationStatAnchor = {
  id: string;
  passingLongestCompletion: number;
  rushingLongestRush: number;
  receivingLongestReception: number;
  kickingLongestFieldGoal: number;
  puntingLongestPunt: number;
};

export type SimulationPlayerContext = {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  age: number;
  developmentTrait: string;
  potentialRating: number;
  positionCode: string;
  secondaryPositionCode: string | null;
  rosterStatus: string;
  depthChartSlot: number | null;
  captainFlag: boolean;
  developmentFocus: boolean;
  injuryRisk: number;
  status: string;
  injuryStatus: string;
  injuryName: string | null;
  injuryEndsOn: Date | null;
  fatigue: number;
  morale: number;
  positionOverall: number;
  offensiveOverall: number | null;
  defensiveOverall: number | null;
  specialTeamsOverall: number | null;
  physicalOverall: number | null;
  mentalOverall: number | null;
  attributes: SimulationAttributeMap;
  seasonStat: SimulationStatAnchor | null;
  careerStat: SimulationStatAnchor | null;
  gameDayAvailability: "ACTIVE" | "LIMITED" | "UNAVAILABLE";
  gameDayReadinessMultiplier: number;
  gameDaySnapMultiplier: number;
};

export type SimulationTeamContext = {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  overallRating: number;
  roster: SimulationPlayerContext[];
};

export type SimulationTeamGameplanContext = {
  aiStrategyArchetype?: string;
  defenseXFactorPlan?: Partial<PreGameXFactorPlan> | null;
  offenseXFactorPlan?: Partial<PreGameXFactorPlan> | null;
};

export type SimulationMatchContext = {
  matchId: string;
  saveGameId: string;
  seasonId: string;
  kind: MatchKind;
  simulationSeed: string;
  seasonYear: number;
  week: number;
  scheduledAt: Date;
  offenseXFactorPlan?: Partial<PreGameXFactorPlan> | null;
  defenseXFactorPlan?: Partial<PreGameXFactorPlan> | null;
  teamGameplans?: Record<string, SimulationTeamGameplanContext>;
  homeTeam: SimulationTeamContext;
  awayTeam: SimulationTeamContext;
};

export type MatchDriveResult = {
  sequence: number;
  phaseLabel: string;
  offenseTeamId: string;
  offenseTeamAbbreviation: string;
  defenseTeamId: string;
  defenseTeamAbbreviation: string;
  startedHomeScore: number;
  startedAwayScore: number;
  startSecondsRemainingInGame: number | null;
  endedHomeScore: number;
  endedAwayScore: number;
  plays: number;
  passAttempts: number;
  rushAttempts: number;
  totalYards: number;
  resultType: string;
  pointsScored: number;
  turnover: boolean;
  redZoneTrip: boolean;
  summary: string;
  primaryPlayerName: string | null;
  primaryDefenderName: string | null;
  startFieldPosition: number | null;
  highestReachedFieldPosition: number | null;
  fourthDownBallPosition: number | null;
  fourthDownDistance: number | null;
  fourthDownScoreDelta: number | null;
  fourthDownSecondsRemaining: number | null;
  coachingRiskProfile: string | null;
  fourthDownDecision: string | null;
  terminalPlayDistance: number | null;
  postFourthDownConverted: boolean | null;
  postFourthDownYards: number | null;
  targetedAggressiveGoForIt: boolean | null;
  aggressiveGoForItResolution: string | null;
  softFailCount: number | null;
  fourthDownAttempts: number | null;
  playsAfterConvert: number | null;
  postConvertOriginatedOpp35To20: boolean | null;
  postConvertEnteredOpp35To20: boolean | null;
  opp35To20FinishResult: string | null;
  playsAfterOpp35To20Entry: number | null;
};

export type PassingLine = {
  attempts: number;
  completions: number;
  yards: number;
  touchdowns: number;
  interceptions: number;
  sacksTaken: number;
  sackYardsLost: number;
  longestCompletion: number;
};

export type RushingLine = {
  attempts: number;
  yards: number;
  touchdowns: number;
  fumbles: number;
  longestRush: number;
  brokenTackles: number;
};

export type ReceivingLine = {
  targets: number;
  receptions: number;
  yards: number;
  touchdowns: number;
  drops: number;
  longestReception: number;
  yardsAfterCatch: number;
};

export type BlockingLine = {
  passBlockSnaps: number;
  runBlockSnaps: number;
  sacksAllowed: number;
  pressuresAllowed: number;
  pancakes: number;
};

export type DefensiveLine = {
  tackles: number;
  assistedTackles: number;
  tacklesForLoss: number;
  sacks: number;
  quarterbackHits: number;
  passesDefended: number;
  interceptions: number;
  forcedFumbles: number;
  fumbleRecoveries: number;
  defensiveTouchdowns: number;
  coverageSnaps: number;
  targetsAllowed: number;
  receptionsAllowed: number;
  yardsAllowed: number;
};

export type KickingLine = {
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalsMadeShort: number;
  fieldGoalsAttemptedShort: number;
  fieldGoalsMadeMid: number;
  fieldGoalsAttemptedMid: number;
  fieldGoalsMadeLong: number;
  fieldGoalsAttemptedLong: number;
  extraPointsMade: number;
  extraPointsAttempted: number;
  longestFieldGoal: number;
  kickoffTouchbacks: number;
};

export type PuntingLine = {
  punts: number;
  puntYards: number;
  netPuntYards: number;
  fairCatchesForced: number;
  hangTimeTotalTenths: number;
  puntsInside20: number;
  touchbacks: number;
  longestPunt: number;
};

export type ReturnLine = {
  kickReturns: number;
  kickReturnYards: number;
  kickReturnTouchdowns: number;
  kickReturnFumbles: number;
  puntReturns: number;
  puntReturnYards: number;
  puntReturnTouchdowns: number;
  puntReturnFumbles: number;
};

export type PlayerSimulationLine = {
  playerId: string;
  teamId: string;
  started: boolean;
  snapsOffense: number;
  snapsDefense: number;
  snapsSpecialTeams: number;
  passing: PassingLine;
  rushing: RushingLine;
  receiving: ReceivingLine;
  blocking: BlockingLine;
  defensive: DefensiveLine;
  kicking: KickingLine;
  punting: PuntingLine;
  returns: ReturnLine;
};

export type TeamSimulationResult = {
  teamId: string;
  score: number;
  touchdowns: number;
  firstDowns: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  sacks: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
  penalties: number;
  timeOfPossessionSeconds: number;
};

export type MatchSimulationResult = {
  matchId: string;
  simulationSeed: string;
  totalDrivesPlanned: number;
  engineNotes?: string[];
  homeScore: number;
  awayScore: number;
  homeTeam: TeamSimulationResult;
  awayTeam: TeamSimulationResult;
  playerLines: PlayerSimulationLine[];
  drives: MatchDriveResult[];
};
