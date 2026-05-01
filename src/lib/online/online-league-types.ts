import type { TeamNameCategory } from "./team-identity-options";

export type OwnershipProfile = {
  ownerId: string;
  ownerName: string;
  patience: number;
  ambition: number;
  financialPressure: number;
  loyalty: number;
  mediaSensitivity: number;
  rebuildTolerance: number;
};

export type GmJobSecurityStatus =
  | "secure"
  | "stable"
  | "under_pressure"
  | "hot_seat"
  | "termination_risk"
  | "fired";

export type OnlineGmExpectation = "rebuild" | "competitive" | "playoffs" | "championship";
export type OnlineGmExpectationResult = "exceeded" | "met" | "below" | "failed";
export type OnlineMediaExpectationGoal = "rebuild" | "playoffs" | "championship";

export type OnlineMediaExpectationProfile = {
  teamId: string;
  userId: string;
  season: number;
  goal: OnlineMediaExpectationGoal;
  ownerExpectation: OnlineGmExpectation;
  fanPressureModifier: number;
  ownerPressureModifier: number;
  mediaNarrative: string;
  setAt: string;
  updatedAt: string;
};

export type FranchiseStrategyType = "rebuild" | "win_now" | "balanced" | "youth_focus";

export type FranchiseStrategyProfile = {
  strategy: FranchiseStrategyType;
  strategyType: FranchiseStrategyType;
  selectedAtSeason: number;
  expectedWinRate: number;
  expectedPlayoff: boolean;
  developmentFocus: number;
  financialRiskTolerance: number;
  ownerPressureModifier: number;
  fanPressureModifier: number;
  financeRiskModifier: number;
  trainingDevelopmentModifier: number;
  trainingPreparationModifier: number;
  contractYouthPreference: number;
  starSpendingTolerance: number;
  narrative: string;
  riskExplanation: string;
  impactSummary: string;
  setAt: string;
  updatedAt: string;
};

export type OnlineGmSeasonResult = {
  season: number;
  wins: number;
  losses: number;
  ties?: number;
  playoffAppearance?: boolean;
  playoffWins?: number;
  championshipWon?: boolean;
  losingStreak?: number;
  rivalryLosses?: number;
  expectation?: OnlineGmExpectation;
  expectedWins?: number;
  rosterStrength?: number;
  capHealth?: number;
};

export type OnlineGmPerformanceHistoryEntry = {
  season: number;
  seasonResults: OnlineGmSeasonResult;
  expectationResult: OnlineGmExpectationResult;
  ownerConfidenceDelta: number;
  fanPressureScore?: number;
  ownerSensitivityModifier?: number;
  jobSecurityDeltaFromFans?: number;
  inactivityPenalty?: number;
  strategyPenalty?: number;
  reasonText?: string;
  finalJobSecurityScore: number;
};

export type GmJobSecurityScore = {
  score: number;
  status: GmJobSecurityStatus;
  lastUpdatedWeek: number;
  lastUpdatedSeason: number;
  gmPerformanceHistory: OnlineGmPerformanceHistoryEntry[];
};

export type OnlineGmInactiveStatus =
  | "active"
  | "warning"
  | "inactive"
  | "removal_eligible"
  | "removed";

export type OnlineGmActivityMetrics = {
  lastSeenAt: string;
  lastLeagueActionAt: string;
  missedWeeklyActions: number;
  missedLineupSubmissions: number;
  inactiveSinceWeek?: number;
  inactiveStatus: OnlineGmInactiveStatus;
};

export type OnlineGmAdminRemovalStatus =
  | "none"
  | "admin_warning"
  | "admin_authorized_removal"
  | "admin_removed";

export type OnlineGmAdminRemovalState = {
  status: OnlineGmAdminRemovalStatus;
  message?: string;
  reason?: string;
  deadlineAt?: string;
  updatedAt?: string;
};

export type OnlineTeamStatus = "occupied" | "vacant";
export type OnlineTeamControl = "user" | "ai_or_commissioner";

export type OnlineGmActivityRules = {
  warningAfterMissedWeeks: number;
  inactiveAfterMissedWeeks: number;
  removalEligibleAfterMissedWeeks: number;
  autoVacateAfterMissedWeeks: false | number;
};

export type OnlineFinanceRules = {
  enableStadiumFinance: boolean;
  enableFanPressure: boolean;
  enableMerchRevenue: boolean;
  equalMediaRevenue: boolean;
  revenueSharingEnabled: boolean;
  revenueSharingPercentage: number;
  ownerBailoutEnabled: boolean;
  minCashFloor: number;
  maxTicketPriceLevel: number;
  allowStadiumUpgrades: false;
};

export type TrainingIntensity = "light" | "normal" | "hard" | "extreme";
export type TrainingPrimaryFocus =
  | "offense"
  | "defense"
  | "balanced"
  | "conditioning"
  | "recovery"
  | "player_development"
  | "team_chemistry";
export type TrainingSecondaryFocus =
  | "passing_game"
  | "running_game"
  | "pass_protection"
  | "pass_rush"
  | "run_defense"
  | "coverage"
  | "turnovers"
  | "red_zone"
  | "two_minute_drill"
  | "special_teams";
export type TrainingRiskTolerance = "low" | "medium" | "high";
export type TrainingPlanSource = "gm_submitted" | "auto_default";
export type CoachRole =
  | "head_coach"
  | "offensive_coordinator"
  | "defensive_coordinator"
  | "development_coach";

export type CoachRatings = {
  offense: number;
  defense: number;
  development: number;
};

export type Coach = {
  coachId: string;
  name: string;
  role: CoachRole;
  ratings: CoachRatings;
};

export type CoachTransactionHistoryEntry = {
  transactionId: string;
  action: "hired" | "fired";
  teamId: string;
  userId: string;
  coachId: string;
  coachName: string;
  role: CoachRole;
  createdAt: string;
};

export type CoachingStaffProfile = {
  teamId: string;
  headCoachName: string;
  offensiveCoordinatorName: string;
  defensiveCoordinatorName: string;
  specialTeamsCoachName: string;
  strengthCoachName: string;
  developmentCoachName: string;
  offenseTraining: number;
  defenseTraining: number;
  playerDevelopment: number;
  injuryPrevention: number;
  discipline: number;
  motivation: number;
  gamePreparation: number;
  adaptability: number;
};

export type WeeklyTrainingPlan = {
  planId: string;
  teamId: string;
  leagueId: string;
  season: number;
  week: number;
  intensity: TrainingIntensity;
  primaryFocus: TrainingPrimaryFocus;
  secondaryFocus?: TrainingSecondaryFocus;
  riskTolerance: TrainingRiskTolerance;
  youngPlayerPriority: number;
  veteranMaintenance: number;
  notes?: string;
  submittedByUserId: string;
  submittedAt: string;
  source: TrainingPlanSource;
};

export type SubmitWeeklyTrainingPlanInput = {
  intensity: TrainingIntensity;
  primaryFocus: TrainingPrimaryFocus;
  secondaryFocus?: TrainingSecondaryFocus;
  riskTolerance: TrainingRiskTolerance;
  youngPlayerPriority: number;
  veteranMaintenance: number;
  notes?: string;
  season?: number;
  week?: number;
};

export type TrainingAffectedPlayer = {
  playerId: string;
  playerName: string;
  position: string;
  developmentDelta: number;
  fatigueDelta: number;
  injuryRiskDelta: number;
  moraleDelta?: number;
  note: string;
};

export type TrainingOutcome = {
  teamId: string;
  season: number;
  week: number;
  planId: string;
  developmentDeltaSummary: number;
  fatigueDelta: number;
  injuryRiskDelta: number;
  chemistryDelta: number;
  preparationBonus: number;
  coachExecutionRating: number;
  riskEvents: string[];
  affectedPlayers: TrainingAffectedPlayer[];
  createdAt: string;
};

export type TeamChemistryTier =
  | "fractured"
  | "unstable"
  | "neutral"
  | "connected"
  | "elite";

export type TeamChemistryProfile = {
  teamId: string;
  score: number;
  playerSatisfaction: number;
  gameplayModifier: number;
  recentTrend: number;
  lastUpdatedSeason: number;
  lastUpdatedWeek: number;
  updatedAt: string;
};

export type TeamChemistryHistoryEntry = {
  teamId: string;
  season: number;
  week: number;
  source: "training" | "match_result" | "player_satisfaction";
  previousScore: number;
  newScore: number;
  delta: number;
  reason: string;
  createdAt: string;
};

export type PlayerContract = {
  salaryPerYear: number;
  yearsRemaining: number;
  totalValue: number;
  guaranteedMoney: number;
  signingBonus: number;
  contractType: "rookie" | "regular" | "star";
  capHitPerYear: number;
  deadCapPerYear: number;
};

export type PlayerDevelopmentPath = "star" | "solid" | "bust";
export type OnlineXFactorAbilityId = "clutch" | "speed_burst" | "playmaker";

export type OnlinePlayerXFactor = {
  abilityId: OnlineXFactorAbilityId;
  abilityName: string;
  description: string;
  rarity: "rare";
};

export type OnlineXFactorPlayContext = {
  quarter: number;
  scoreDifferential: number;
  down: number;
  yardsToGo: number;
  playType: "pass" | "run" | "return";
  fieldZone?: "own" | "midfield" | "red_zone";
  playoffGame?: boolean;
};

export type OnlineXFactorTriggerResult = {
  playerId: string;
  playerName: string;
  abilityId: OnlineXFactorAbilityId;
  abilityName: string;
  active: boolean;
  impactModifier: number;
  reason: string;
};

export type OnlineContractPlayerStatus = "active" | "released" | "free_agent";
export type OnlineWeekFlowStatus =
  | "pre_week"
  | "ready"
  | "simulating"
  | "completed"
  | "post_game";

export type OnlineDepthChartEntry = {
  position: string;
  starterPlayerId: string;
  backupPlayerIds: string[];
  updatedAt: string;
};

export type OnlineContractPlayer = {
  playerId: string;
  playerName: string;
  position: string;
  attributes?: Record<string, number>;
  age: number;
  overall: number;
  potential: number;
  developmentPath: PlayerDevelopmentPath;
  developmentProgress: number;
  xFactors: OnlinePlayerXFactor[];
  contract: PlayerContract;
  status: OnlineContractPlayerStatus;
};

export type OnlineMatchResult = {
  matchId: string;
  season: number;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeStats: OnlineMatchTeamStats;
  awayStats: OnlineMatchTeamStats;
  winnerTeamId: string;
  winnerTeamName: string;
  tiebreakerApplied: boolean;
  simulatedAt: string;
  simulatedByUserId: string;
  status: "completed";
  createdAt: string;
};

export type OnlineMatchTeamStats = {
  firstDowns: number;
  passingYards: number;
  rushingYards: number;
  totalYards: number;
  turnovers: number;
};

export type OnlineCompletedWeek = {
  weekKey: string;
  season: number;
  week: number;
  status: "completed";
  resultMatchIds: string[];
  completedAt: string;
  simulatedByUserId: string;
  nextSeason: number;
  nextWeek: number;
};

export type SalaryCap = {
  capLimit: number;
  activeSalary: number;
  currentCapUsage: number;
  deadCap: number;
  availableCap: number;
  softBufferLimit: number;
  capRiskLevel: "healthy" | "tight" | "over";
};

export type OnlineDraftPick = {
  pickId: string;
  season: number;
  round: number;
  originalTeamId: string;
  currentTeamId: string;
};

export type TradeStatus = "pending" | "accepted" | "declined";

export type TradeProposal = {
  tradeId: string;
  fromTeamId: string;
  toTeamId: string;
  fromUserId: string;
  toUserId: string;
  playersOffered: string[];
  playersRequested: string[];
  picksOffered: string[];
  picksRequested: string[];
  status: TradeStatus;
  fairnessScore: number;
  fairnessLabel: "fair" | "slightly_unbalanced" | "unbalanced";
  createdAt: string;
  updatedAt: string;
};

export type TradeHistoryEntry = {
  tradeId: string;
  fromTeamId: string;
  toTeamId: string;
  playersOffered: string[];
  playersRequested: string[];
  picksOffered: string[];
  picksRequested: string[];
  executedAt: string;
  summary: string;
};

export type ProspectStatus = "available" | "drafted";

export type Prospect = {
  prospectId: string;
  playerName: string;
  position: string;
  age: number;
  trueRating: number;
  scoutedRating: number;
  potential: number;
  scoutingAccuracy: number;
  scoutedByTeamIds: string[];
  status: ProspectStatus;
  draftedByTeamId?: string;
};

export type DraftOrderPickStatus = "available" | "made";

export type DraftOrderPick = {
  pickNumber: number;
  round: number;
  teamId: string;
  userId: string;
  status: DraftOrderPickStatus;
  prospectId?: string;
};

export type DraftOrder = {
  season: number;
  picks: DraftOrderPick[];
};

export type DraftHistoryEntry = {
  pickNumber: number;
  round: number;
  teamId: string;
  userId: string;
  prospectId: string;
  playerName: string;
  draftedAt: string;
};

export type OnlineFantasyDraftStatus = "not_started" | "active" | "completed";

export type OnlineFantasyDraftPick = {
  pickNumber: number;
  round: number;
  teamId: string;
  playerId: string;
  pickedByUserId: string;
  timestamp: string;
};

export type OnlineFantasyDraftState = {
  leagueId: string;
  status: OnlineFantasyDraftStatus;
  round: number;
  pickNumber: number;
  currentTeamId: string;
  draftOrder: string[];
  picks: OnlineFantasyDraftPick[];
  availablePlayerIds: string[];
  startedAt: string | null;
  completedAt: string | null;
};

export type ContractActionResult =
  | {
      status: "success";
      league: OnlineLeague;
      message: string;
    }
  | {
      status: "blocked" | "missing-league" | "missing-user" | "missing-player";
      league: OnlineLeague | null;
      message: string;
    };

export type CreateTradeProposalInput = {
  toUserId: string;
  playersOffered: string[];
  playersRequested: string[];
  picksOffered?: string[];
  picksRequested?: string[];
};

export type TradeActionResult =
  | {
      status: "success";
      league: OnlineLeague;
      trade: TradeProposal;
      message: string;
    }
  | {
      status: "blocked" | "missing-league" | "missing-user" | "missing-trade";
      league: OnlineLeague | null;
      message: string;
    };

export type ScoutingActionResult =
  | {
      status: "success";
      league: OnlineLeague;
      prospect: Prospect;
      message: string;
    }
  | {
      status: "missing-league" | "missing-user" | "missing-prospect" | "blocked";
      league: OnlineLeague | null;
      message: string;
    };

export type DraftActionResult =
  | {
      status: "success";
      league: OnlineLeague;
      player: OnlineContractPlayer;
      prospect: Prospect;
      message: string;
    }
  | {
      status: "missing-league" | "missing-user" | "missing-prospect" | "blocked";
      league: OnlineLeague | null;
      message: string;
    };

export type CoachActionResult =
  | {
      status: "success";
      league: OnlineLeague;
      coach: Coach;
      message: string;
    }
  | {
      status: "missing-league" | "missing-user" | "missing-coach" | "blocked";
      league: OnlineLeague | null;
      message: string;
    };

export type OnlineLeagueSettings = {
  gmActivityRules: OnlineGmActivityRules;
  financeRules: OnlineFinanceRules;
};

export type OnlineLeagueEventType =
  | "owner_confidence_changed"
  | "gm_hot_seat"
  | "gm_warning"
  | "gm_removal_authorized"
  | "gm_removed_by_admin"
  | "owner_fired_gm"
  | "gm_fired_by_owner"
  | "team_marked_vacant"
  | "stadium_attendance_updated"
  | "fan_mood_changed"
  | "fan_pressure_changed"
  | "merchandise_revenue_generated"
  | "matchday_revenue_generated"
  | "franchise_finance_updated"
  | "owner_confidence_changed_by_fans"
  | "financial_warning"
  | "training_plan_submitted"
  | "training_plan_auto_defaulted"
  | "training_outcome_generated"
  | "training_fatigue_changed"
  | "training_chemistry_changed"
  | "training_injury_risk_changed"
  | "training_preparation_bonus_applied"
  | "player_development_updated"
  | "x_factor_triggered"
  | "contract_extended"
  | "player_released"
  | "free_agent_signed"
  | "salary_cap_updated"
  | "trade_proposed"
  | "trade_declined"
  | "trade_accepted"
  | "prospect_scouted"
  | "draft_pick_made"
  | "coach_hired"
  | "coach_fired"
  | "team_chemistry_changed"
  | "media_expectation_set"
  | "franchise_strategy_set"
  | "stadium_pricing_updated"
  | "depth_chart_updated"
  | "online_match_result_recorded";

export type OnlineLeagueEvent = {
  id: string;
  eventType: OnlineLeagueEventType;
  leagueId: string;
  teamId: string;
  userId: string;
  reason: string;
  season: number;
  week: number;
  previousScore?: number;
  newStatus?: GmJobSecurityStatus | OnlineGmAdminRemovalStatus | OnlineTeamStatus;
  createdAt: string;
};

export type StadiumProfile = {
  stadiumId: string;
  teamId: string;
  name: string;
  city: string;
  capacity: number;
  condition: number;
  comfort: number;
  atmosphere: number;
  ticketPriceLevel: number;
  merchPriceLevel: number;
  parkingRevenueLevel: number;
  concessionsQuality: number;
  luxurySuitesLevel: number;
  lastRenovatedSeason: number;
  createdAt: string;
  updatedAt: string;
};

export type StadiumAttendance = {
  matchId: string;
  teamId: string;
  season: number;
  week: number;
  attendance: number;
  attendanceRate: number;
  soldOut: boolean;
  ticketRevenue: number;
  concessionsRevenue: number;
  parkingRevenue: number;
  merchandiseRevenue: number;
  totalMatchdayRevenue: number;
  fanMoodBefore: number;
  fanMoodAfter: number;
};

export type FanMoodTier =
  | "ecstatic"
  | "excited"
  | "positive"
  | "neutral"
  | "frustrated"
  | "angry"
  | "hostile";

export type FanbaseProfile = {
  teamId: string;
  marketSize: number;
  fanLoyalty: number;
  fanMood: number;
  expectations: number;
  patience: number;
  bandwagonFactor: number;
  mediaPressure: number;
  seasonTicketBase: number;
  merchInterest: number;
  rivalryIntensity: number;
  updatedAt: string;
};

export type FanPressureSnapshot = {
  teamId: string;
  fanPressureScore: number;
  attendanceTrend: number;
  merchandiseTrend: number;
  mediaPressure: number;
  expectationsVsResult: number;
  rivalryFailures: number;
  playoffDrought: number;
  reasonText: string;
  updatedAt: string;
};

export type MerchandiseFinancials = {
  teamId: string;
  season: number;
  week: number;
  baseMerchRevenue: number;
  performanceMultiplier: number;
  fanMoodMultiplier: number;
  marketSizeMultiplier: number;
  playoffMultiplier: number;
  totalMerchRevenue: number;
};

export type FranchiseFinanceProfile = {
  teamId: string;
  ticketRevenue: number;
  concessionsRevenue: number;
  parkingRevenue: number;
  merchandiseRevenue: number;
  sponsorshipRevenue: number;
  mediaRevenue: number;
  playoffRevenue: number;
  totalRevenue: number;
  playerPayroll: number;
  staffPayroll: number;
  stadiumMaintenance: number;
  gameDayOperations: number;
  travelCosts: number;
  adminCosts: number;
  totalExpenses: number;
  weeklyProfitLoss: number;
  seasonProfitLoss: number;
  cashBalance: number;
  ownerInvestment: number;
  updatedAt: string;
};

export type OnlineMatchdayInput = {
  matchId: string;
  teamId: string;
  season: number;
  week: number;
  wins: number;
  losses: number;
  winStreak?: number;
  losingStreak?: number;
  playoffChances?: number;
  rivalryGame?: boolean;
  playoffGame?: boolean;
  homeGameAttractiveness?: number;
  won?: boolean;
};

export type OnlineLeagueUser = {
  userId: string;
  username: string;
  joinedAt: string;
  teamId: string;
  teamName: string;
  cityId?: string;
  cityName?: string;
  teamNameId?: string;
  teamCategory?: TeamNameCategory;
  teamDisplayName?: string;
  ownershipProfile?: OwnershipProfile;
  jobSecurity?: GmJobSecurityScore;
  activity?: OnlineGmActivityMetrics;
  adminRemoval?: OnlineGmAdminRemovalState;
  teamStatus?: OnlineTeamStatus;
  controlledBy?: OnlineTeamControl;
  allowNewUserJoin?: boolean;
  stadiumProfile?: StadiumProfile;
  attendanceHistory?: StadiumAttendance[];
  fanbaseProfile?: FanbaseProfile;
  fanPressure?: FanPressureSnapshot;
  mediaExpectationProfile?: OnlineMediaExpectationProfile;
  franchiseStrategy?: FranchiseStrategyProfile;
  teamChemistryProfile?: TeamChemistryProfile;
  chemistryHistory?: TeamChemistryHistoryEntry[];
  merchandiseFinancials?: MerchandiseFinancials[];
  financeProfile?: FranchiseFinanceProfile;
  coachingStaffProfile?: CoachingStaffProfile;
  weeklyTrainingPlans?: WeeklyTrainingPlan[];
  trainingOutcomes?: TrainingOutcome[];
  depthChart?: OnlineDepthChartEntry[];
  salaryCap?: SalaryCap;
  contractRoster?: OnlineContractPlayer[];
  draftPicks?: OnlineDraftPick[];
  previousUserId?: string;
  vacantSince?: string;
  readyForWeek: boolean;
  readyAt?: string;
};

export type OnlineLeagueTeam = {
  id: string;
  name: string;
  abbreviation: string;
};

export type OnlineLeagueScheduleMatch = {
  id: string;
  week: number;
  homeTeamName: string;
  awayTeamName: string;
};

export type OnlineLeagueLogEntry = {
  id: string;
  message: string;
  createdAt: string;
};

export type OnlineLeague = {
  id: string;
  name: string;
  users: OnlineLeagueUser[];
  teams: OnlineLeagueTeam[];
  schedule?: OnlineLeagueScheduleMatch[];
  matchResults?: OnlineMatchResult[];
  completedWeeks?: OnlineCompletedWeek[];
  freeAgents?: OnlineContractPlayer[];
  tradeProposals?: TradeProposal[];
  tradeHistory?: TradeHistoryEntry[];
  prospects?: Prospect[];
  draftOrder?: DraftOrder;
  draftHistory?: DraftHistoryEntry[];
  fantasyDraft?: OnlineFantasyDraftState;
  fantasyDraftPlayerPool?: OnlineContractPlayer[];
  availableCoaches?: Coach[];
  coachHistory?: CoachTransactionHistoryEntry[];
  logs?: OnlineLeagueLogEntry[];
  events?: OnlineLeagueEvent[];
  leagueSettings?: OnlineLeagueSettings;
  weekStatus?: OnlineWeekFlowStatus;
  lastSimulatedWeekKey?: string;
  currentWeek: number;
  currentSeason?: number;
  maxUsers: number;
  status: "waiting" | "active";
};

export type CreateOnlineLeagueInput = {
  name: string;
  maxUsers?: number;
  startWeek?: number;
};

export type JoinOnlineLeagueResult =
  | {
      status: "joined" | "already-member";
      league: OnlineLeague;
    }
  | {
      status: "missing-league";
      league: OnlineLeague;
      message: string;
    }
  | {
      status: "full" | "invalid-team-identity" | "team-identity-taken";
      league: OnlineLeague;
      message: string;
    };

export type OnlineLeagueStateValidationIssue = {
  code:
    | "missing-id"
    | "invalid-status"
    | "invalid-week"
    | "invalid-season"
    | "invalid-max-users"
    | "duplicate-user"
    | "duplicate-team"
    | "over-capacity"
    | "ready-vacant-member"
    | "missing-team-assignment";
  severity: "warning" | "error";
  message: string;
};

export type OnlineLeagueStateValidationResult = {
  valid: boolean;
  issues: OnlineLeagueStateValidationIssue[];
};

export type OnlineLeagueStateRepairResult = {
  league: OnlineLeague;
  repaired: boolean;
  issues: OnlineLeagueStateValidationIssue[];
};

export type SubmitWeeklyTrainingPlanResult =
  | {
      status: "submitted";
      league: OnlineLeague;
      plan: WeeklyTrainingPlan;
    }
  | {
      status: "invalid" | "missing-league" | "missing-user";
      league: OnlineLeague | null;
      message: string;
    };
