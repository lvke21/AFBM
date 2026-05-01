import type { OnlineUser } from "./online-user-service";
import { createRng, createSeededId } from "@/lib/random/seeded-rng";
import {
  resolveTeamIdentitySelection,
  type TeamIdentitySelection,
} from "./team-identity-options";

import type {
  OwnershipProfile,
  GmJobSecurityStatus,
  OnlineGmExpectation,
  OnlineGmExpectationResult,
  OnlineMediaExpectationGoal,
  OnlineMediaExpectationProfile,
  FranchiseStrategyType,
  FranchiseStrategyProfile,
  OnlineGmSeasonResult,
  OnlineGmPerformanceHistoryEntry,
  GmJobSecurityScore,
  OnlineGmInactiveStatus,
  OnlineGmActivityMetrics,
  OnlineGmAdminRemovalStatus,
  OnlineGmAdminRemovalState,
  OnlineTeamStatus,
  OnlineTeamControl,
  OnlineGmActivityRules,
  OnlineFinanceRules,
  TrainingIntensity,
  TrainingPrimaryFocus,
  TrainingSecondaryFocus,
  TrainingRiskTolerance,
  TrainingPlanSource,
  CoachRole,
  CoachRatings,
  Coach,
  CoachTransactionHistoryEntry,
  CoachingStaffProfile,
  WeeklyTrainingPlan,
  SubmitWeeklyTrainingPlanInput,
  TrainingAffectedPlayer,
  TrainingOutcome,
  TeamChemistryTier,
  TeamChemistryProfile,
  TeamChemistryHistoryEntry,
  PlayerContract,
  PlayerDevelopmentPath,
  OnlineXFactorAbilityId,
  OnlinePlayerXFactor,
  OnlineXFactorPlayContext,
  OnlineXFactorTriggerResult,
  OnlineContractPlayerStatus,
  OnlineWeekFlowStatus,
  OnlineDepthChartEntry,
  OnlineContractPlayer,
  OnlineMatchResult,
  OnlineCompletedWeek,
  SalaryCap,
  OnlineDraftPick,
  TradeStatus,
  TradeProposal,
  TradeHistoryEntry,
  ProspectStatus,
  Prospect,
  DraftOrderPick,
  DraftOrder,
  DraftHistoryEntry,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
  ContractActionResult,
  CreateTradeProposalInput,
  TradeActionResult,
  ScoutingActionResult,
  DraftActionResult,
  CoachActionResult,
  OnlineLeagueSettings,
  OnlineLeagueEventType,
  OnlineLeagueEvent,
  StadiumProfile,
  StadiumAttendance,
  FanMoodTier,
  FanbaseProfile,
  FanPressureSnapshot,
  MerchandiseFinancials,
  FranchiseFinanceProfile,
  OnlineMatchdayInput,
  OnlineLeagueUser,
  OnlineLeagueTeam,
  OnlineLeagueScheduleMatch,
  OnlineLeagueLogEntry,
  OnlineLeague,
  CreateOnlineLeagueInput,
  JoinOnlineLeagueResult,
  OnlineLeagueStateValidationIssue,
  OnlineLeagueStateValidationResult,
  OnlineLeagueStateRepairResult,
  SubmitWeeklyTrainingPlanResult,
} from "./online-league-types";
import {
  GLOBAL_TEST_LEAGUE_ID,
  ONLINE_MVP_TEAM_POOL,
} from "./online-league-constants";
import {
  getNextFantasyDraftStateAfterPick,
  isOnlineFantasyDraftComplete,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_RESERVE_RATE,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_SEED,
  type OnlineFantasyDraftPosition,
} from "./online-league-draft-service";
import {
  createUserFacingLeagueId,
  normalizeMaxUsers,
  normalizeStartWeek,
} from "./online-league-creation";
import {
  getTeamIdentityId,
  hasTeamDisplayName,
} from "./online-league-identity";
import { resolveJoinArguments } from "./online-league-join";
import { saveOnlineLeagueCollection } from "./online-league-persistence";
import {
  getOnlineLeagueWeekReadyState,
  isOnlineLeagueUserActiveWeekParticipant,
} from "./online-league-week-service";
import {
  canCreateOnlineLeagueSchedule,
  createOnlineLeagueSchedule,
} from "./online-league-schedule";
import { simulateOnlineGame } from "./online-game-simulation";
import {
  clearStoredLastOnlineLeagueId,
  getBrowserOnlineLeagueStorage,
  getStoredLastOnlineLeagueId,
  readStoredOnlineLeagueCollection,
  removeStoredOnlineLeagueCollection,
  setStoredLastOnlineLeagueId,
  type OnlineLeagueStorage,
} from "./online-league-storage";

export type * from "./online-league-types";
export {
  ONLINE_LEAGUES_STORAGE_KEY,
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  GLOBAL_TEST_LEAGUE_ID,
  ONLINE_MVP_TEAM_POOL,
} from "./online-league-constants";
export {
  getOnlineLeagueWeekReadyState,
  type OnlineLeagueWeekReadyParticipant,
  type OnlineLeagueWeekReadyState,
} from "./online-league-week-service";
export {
  buildOnlineLeagueTeamRecords,
  canSimulateWeek,
  getCurrentWeekGames,
  hasValidScheduleForWeek,
  normalizeOnlineLeagueWeekSimulationState,
  sortOnlineLeagueTeamRecords,
  type OnlineLeagueTeamRecord,
  type OnlineLeagueWeekGameStatus,
  type OnlineLeagueWeekSimulationGame,
  type OnlineLeagueWeekSimulationState,
} from "./online-league-week-simulation";
export {
  canCreateOnlineLeagueSchedule,
  createOnlineLeagueSchedule,
  ONLINE_LEAGUE_REGULAR_SEASON_GAMES_PER_WEEK,
  ONLINE_LEAGUE_REGULAR_SEASON_WEEKS,
  ONLINE_LEAGUE_SCHEDULE_TEAM_COUNT,
  OnlineLeagueScheduleError,
} from "./online-league-schedule";
export {
  adaptOnlineTeamToSimulationTeam,
  simulateOnlineGame,
  type OnlineGameSimulationError,
  type OnlineGameSimulationGame,
  type OnlineGameSimulationResult,
  type SimulateOnlineGameOptions,
  type SimulateOnlineGameResult,
} from "./online-game-simulation";
export {
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_RESERVE_RATE,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
  ONLINE_FANTASY_DRAFT_SEED,
  type OnlineFantasyDraftPosition,
} from "./online-league-draft-service";
type StoredOnlineLeagueUser = Omit<
  OnlineLeagueUser,
  | "readyForWeek"
  | "readyAt"
  | "ownershipProfile"
  | "jobSecurity"
  | "activity"
  | "adminRemoval"
  | "teamStatus"
  | "controlledBy"
  | "allowNewUserJoin"
  | "stadiumProfile"
  | "attendanceHistory"
  | "fanbaseProfile"
  | "fanPressure"
  | "mediaExpectationProfile"
  | "franchiseStrategy"
  | "teamChemistryProfile"
  | "chemistryHistory"
  | "merchandiseFinancials"
  | "financeProfile"
  | "coachingStaffProfile"
  | "weeklyTrainingPlans"
  | "trainingOutcomes"
  | "depthChart"
  | "salaryCap"
  | "contractRoster"
  | "draftPicks"
> & {
  readyForWeek?: boolean;
  readyAt?: string;
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
};
type StoredOnlineLeague = Omit<
  OnlineLeague,
  "users" | "currentWeek" | "leagueSettings" | "weekStatus"
> & {
  users: StoredOnlineLeagueUser[];
  currentWeek?: number;
  leagueSettings?: OnlineLeagueSettings;
  weekStatus?: OnlineWeekFlowStatus;
};

const DEFAULT_GM_ACTIVITY_RULES: OnlineGmActivityRules = {
  warningAfterMissedWeeks: 1,
  inactiveAfterMissedWeeks: 2,
  removalEligibleAfterMissedWeeks: 3,
  autoVacateAfterMissedWeeks: false,
};

const DEFAULT_FINANCE_RULES: OnlineFinanceRules = {
  enableStadiumFinance: true,
  enableFanPressure: true,
  enableMerchRevenue: true,
  equalMediaRevenue: true,
  revenueSharingEnabled: true,
  revenueSharingPercentage: 20,
  ownerBailoutEnabled: true,
  minCashFloor: 0,
  maxTicketPriceLevel: 100,
  allowStadiumUpgrades: false,
};

const DEFAULT_ONLINE_SALARY_CAP_LIMIT = 200_000_000;
const DEFAULT_ONLINE_SOFT_CAP_BUFFER_PERCENTAGE = 5;
const CONTRACT_ROSTER_TEMPLATE: Array<{
  suffix: string;
  playerName: string;
  position: string;
  age: number;
  overall: number;
  potential: number;
  developmentPath: PlayerDevelopmentPath;
  salaryPerYear: number;
  yearsRemaining: number;
  guaranteedMoney: number;
}> = [
  {
    suffix: "qb1",
    playerName: "Franchise QB",
    position: "QB",
    age: 27,
    overall: 86,
    potential: 93,
    developmentPath: "star",
    salaryPerYear: 42_000_000,
    yearsRemaining: 3,
    guaranteedMoney: 72_000_000,
  },
  {
    suffix: "wr1",
    playerName: "WR1",
    position: "WR",
    age: 25,
    overall: 84,
    potential: 88,
    developmentPath: "solid",
    salaryPerYear: 22_000_000,
    yearsRemaining: 2,
    guaranteedMoney: 24_000_000,
  },
  {
    suffix: "edge1",
    playerName: "Edge Starter",
    position: "EDGE",
    age: 28,
    overall: 83,
    potential: 86,
    developmentPath: "solid",
    salaryPerYear: 24_000_000,
    yearsRemaining: 3,
    guaranteedMoney: 30_000_000,
  },
  {
    suffix: "cb1",
    playerName: "CB1",
    position: "CB",
    age: 26,
    overall: 81,
    potential: 83,
    developmentPath: "bust",
    salaryPerYear: 17_000_000,
    yearsRemaining: 2,
    guaranteedMoney: 14_000_000,
  },
  {
    suffix: "ot1",
    playerName: "Left Tackle",
    position: "OT",
    age: 29,
    overall: 80,
    potential: 84,
    developmentPath: "solid",
    salaryPerYear: 18_000_000,
    yearsRemaining: 2,
    guaranteedMoney: 16_000_000,
  },
];

const FANTASY_DRAFT_FIRST_NAMES = [
  "Adrian",
  "Bastian",
  "Caleb",
  "Dario",
  "Elias",
  "Finn",
  "Gabriel",
  "Hugo",
  "Isaac",
  "Jonas",
  "Kian",
  "Luca",
  "Milan",
  "Noah",
  "Oscar",
  "Rafael",
  "Silas",
  "Theo",
  "Victor",
  "Yann",
  "Zane",
  "Mateo",
  "Emil",
  "Nico",
];
const FANTASY_DRAFT_LAST_NAMES = [
  "Alder",
  "Berg",
  "Cross",
  "Diaz",
  "Eden",
  "Frost",
  "Grant",
  "Hale",
  "Ivers",
  "Jensen",
  "Keller",
  "Lang",
  "Morrow",
  "Novak",
  "Ortega",
  "Price",
  "Quinn",
  "Reed",
  "Stone",
  "Tanner",
  "Vale",
  "West",
  "Young",
  "Ziegler",
  "Voss",
  "Marin",
  "Sato",
  "Moreau",
  "Peters",
  "Rossi",
  "Schneider",
  "Walker",
];
const FANTASY_DRAFT_POSITION_SUFFIX: Record<OnlineFantasyDraftPosition, string> = {
  QB: "Field General",
  RB: "Runner",
  WR: "Receiver",
  TE: "Tight End",
  OL: "Lineman",
  DL: "Defender",
  LB: "Linebacker",
  CB: "Corner",
  S: "Safety",
  K: "Kicker",
  P: "Punter",
};
const FANTASY_DRAFT_SALARY_BASE: Record<OnlineFantasyDraftPosition, number> = {
  QB: 18_000_000,
  RB: 5_500_000,
  WR: 9_500_000,
  TE: 6_500_000,
  OL: 7_500_000,
  DL: 8_500_000,
  LB: 6_500_000,
  CB: 8_500_000,
  S: 6_000_000,
  K: 2_500_000,
  P: 2_200_000,
};

const FREE_AGENT_TEMPLATE: Array<{
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  overall: number;
  potential: number;
  developmentPath: PlayerDevelopmentPath;
  salaryPerYear: number;
  yearsRemaining: number;
  guaranteedMoney: number;
}> = [
  {
    playerId: "fa-qb-veteran",
    playerName: "Veteran Quarterback",
    position: "QB",
    age: 34,
    overall: 76,
    potential: 76,
    developmentPath: "solid",
    salaryPerYear: 12_000_000,
    yearsRemaining: 1,
    guaranteedMoney: 5_000_000,
  },
  {
    playerId: "fa-wr-speed",
    playerName: "Speed Receiver",
    position: "WR",
    age: 27,
    overall: 74,
    potential: 79,
    developmentPath: "star",
    salaryPerYear: 6_500_000,
    yearsRemaining: 2,
    guaranteedMoney: 4_000_000,
  },
  {
    playerId: "fa-lb-depth",
    playerName: "Linebacker Depth",
    position: "LB",
    age: 29,
    overall: 72,
    potential: 74,
    developmentPath: "bust",
    salaryPerYear: 3_500_000,
    yearsRemaining: 1,
    guaranteedMoney: 1_200_000,
  },
];

const COACH_MARKET_TEMPLATE: Coach[] = [
  {
    coachId: "coach-oc-marta-reyes",
    name: "Marta Reyes",
    role: "offensive_coordinator",
    ratings: { offense: 88, defense: 48, development: 71 },
  },
  {
    coachId: "coach-dc-erik-stahl",
    name: "Erik Stahl",
    role: "defensive_coordinator",
    ratings: { offense: 44, defense: 90, development: 67 },
  },
  {
    coachId: "coach-dev-sam-keller",
    name: "Sam Keller",
    role: "development_coach",
    ratings: { offense: 66, defense: 63, development: 93 },
  },
  {
    coachId: "coach-hc-nadia-cole",
    name: "Nadia Cole",
    role: "head_coach",
    ratings: { offense: 82, defense: 78, development: 84 },
  },
  {
    coachId: "coach-oc-jonas-vale",
    name: "Jonas Vale",
    role: "offensive_coordinator",
    ratings: { offense: 76, defense: 52, development: 82 },
  },
  {
    coachId: "coach-dc-kenji-morita",
    name: "Kenji Morita",
    role: "defensive_coordinator",
    ratings: { offense: 50, defense: 81, development: 75 },
  },
];

const PROSPECT_TEMPLATE: Array<{
  prospectId: string;
  playerName: string;
  position: string;
  age: number;
  trueRating: number;
  publicOffset: number;
  potential: number;
}> = [
  {
    prospectId: "prospect-qb-eli-keller",
    playerName: "Eli Keller",
    position: "QB",
    age: 22,
    trueRating: 78,
    publicOffset: -7,
    potential: 91,
  },
  {
    prospectId: "prospect-wr-marcus-vale",
    playerName: "Marcus Vale",
    position: "WR",
    age: 21,
    trueRating: 74,
    publicOffset: 5,
    potential: 88,
  },
  {
    prospectId: "prospect-edge-noah-cross",
    playerName: "Noah Cross",
    position: "EDGE",
    age: 22,
    trueRating: 76,
    publicOffset: -4,
    potential: 86,
  },
  {
    prospectId: "prospect-cb-luca-steiner",
    playerName: "Luca Steiner",
    position: "CB",
    age: 21,
    trueRating: 72,
    publicOffset: 6,
    potential: 84,
  },
  {
    prospectId: "prospect-ot-jalen-price",
    playerName: "Jalen Price",
    position: "OT",
    age: 23,
    trueRating: 70,
    publicOffset: -3,
    potential: 80,
  },
];

const OWNER_PROFILE_TEMPLATES: Array<Omit<OwnershipProfile, "ownerId" | "ownerName">> = [
  {
    patience: 82,
    ambition: 52,
    financialPressure: 42,
    loyalty: 78,
    mediaSensitivity: 35,
    rebuildTolerance: 84,
  },
  {
    patience: 32,
    ambition: 88,
    financialPressure: 65,
    loyalty: 42,
    mediaSensitivity: 72,
    rebuildTolerance: 24,
  },
  {
    patience: 58,
    ambition: 72,
    financialPressure: 88,
    loyalty: 55,
    mediaSensitivity: 48,
    rebuildTolerance: 46,
  },
  {
    patience: 65,
    ambition: 68,
    financialPressure: 50,
    loyalty: 86,
    mediaSensitivity: 78,
    rebuildTolerance: 58,
  },
];

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampTrait(value: number) {
  return Math.min(100, Math.max(1, Math.round(value)));
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function inferContractType(
  input: Pick<OnlineContractPlayer, "age" | "overall"> | Pick<PlayerContract, "salaryPerYear" | "yearsRemaining">,
): PlayerContract["contractType"] {
  if ("age" in input) {
    if (input.age <= 24) {
      return "rookie";
    }

    return input.overall >= 84 ? "star" : "regular";
  }

  if (input.salaryPerYear >= DEFAULT_ONLINE_SALARY_CAP_LIMIT * 0.15) {
    return "star";
  }

  if (input.yearsRemaining >= 4 && input.salaryPerYear <= DEFAULT_ONLINE_SALARY_CAP_LIMIT * 0.025) {
    return "rookie";
  }

  return "regular";
}

function isPlayerDevelopmentPath(value: unknown): value is PlayerDevelopmentPath {
  return value === "star" || value === "solid" || value === "bust";
}

function isOnlineXFactorAbilityId(value: unknown): value is OnlineXFactorAbilityId {
  return value === "clutch" || value === "speed_burst" || value === "playmaker";
}

function getOnlineXFactorDefinition(
  abilityId: OnlineXFactorAbilityId,
): OnlinePlayerXFactor {
  if (abilityId === "clutch") {
    return {
      abilityId,
      abilityName: "Clutch",
      description: "Aktiviert in engen Schlussphasen einen kleinen Entscheidungs- und Execution-Bonus.",
      rarity: "rare",
    };
  }

  if (abilityId === "speed_burst") {
    return {
      abilityId,
      abilityName: "Speed Burst",
      description: "Kann bei Raum, langen Downs oder Returns explosive Plays anschieben.",
      rarity: "rare",
    };
  }

  return {
    abilityId,
    abilityName: "Playmaker",
    description: "Aktiviert in Passing-Situationen mit hoher Hebelwirkung einen kleinen Creation-Bonus.",
    rarity: "rare",
  };
}

function inferPlayerDevelopmentPath(
  player: Pick<OnlineContractPlayer, "age" | "overall"> & Partial<Pick<OnlineContractPlayer, "potential">>,
): PlayerDevelopmentPath {
  const potential = player.potential ?? player.overall;
  const upside = potential - player.overall;

  if (player.age <= 25 && (potential >= 88 || upside >= 8)) {
    return "star";
  }

  if (player.age >= 29 || upside <= 2) {
    return "bust";
  }

  return "solid";
}

function inferDefaultXFactors(
  player: Pick<
    OnlineContractPlayer,
    "age" | "overall" | "position" | "potential" | "developmentPath"
  >,
): OnlinePlayerXFactor[] {
  const abilityIds: OnlineXFactorAbilityId[] = [];
  const isPremiumPlayer =
    player.overall >= 86 ||
    (player.developmentPath === "star" && player.potential >= 90 && player.overall >= 78);

  if (!isPremiumPlayer) {
    return [];
  }

  if (player.overall >= 86 && ["QB", "K"].includes(player.position)) {
    abilityIds.push("clutch");
  }

  if (
    ["WR", "RB", "TE", "CB"].includes(player.position) &&
    player.age <= 27 &&
    player.potential >= 86
  ) {
    abilityIds.push("speed_burst");
  }

  if (
    ["QB", "WR", "TE", "RB"].includes(player.position) &&
    player.overall >= 84 &&
    player.potential >= 88
  ) {
    abilityIds.push("playmaker");
  }

  return Array.from(new Set(abilityIds))
    .slice(0, player.overall >= 90 ? 2 : 1)
    .map(getOnlineXFactorDefinition);
}

function getDefaultPotentialForPath(overall: number, path: PlayerDevelopmentPath) {
  if (path === "star") {
    return Math.max(overall, Math.min(99, overall + 9));
  }

  if (path === "solid") {
    return Math.max(overall, Math.min(95, overall + 5));
  }

  return Math.max(overall, Math.min(90, overall + 2));
}

function createDefaultLeagueSettings(): OnlineLeagueSettings {
  return {
    gmActivityRules: { ...DEFAULT_GM_ACTIVITY_RULES },
    financeRules: { ...DEFAULT_FINANCE_RULES },
  };
}

function createDefaultOwnershipProfile(teamId: string, teamName: string): OwnershipProfile {
  const charTotal = Array.from(teamId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const template = OWNER_PROFILE_TEMPLATES[charTotal % OWNER_PROFILE_TEMPLATES.length];

  return {
    ownerId: `owner-${teamId}`,
    ownerName: `${teamName} Ownership Group`,
    ...template,
  };
}

function createDefaultJobSecurityScore(
  currentWeek: number,
  currentSeason = 1,
): GmJobSecurityScore {
  return {
    score: 72,
    status: "stable",
    lastUpdatedWeek: currentWeek,
    lastUpdatedSeason: currentSeason,
    gmPerformanceHistory: [],
  };
}

function createDefaultActivityMetrics(now = new Date().toISOString()): OnlineGmActivityMetrics {
  return {
    lastSeenAt: now,
    lastLeagueActionAt: now,
    missedWeeklyActions: 0,
    missedLineupSubmissions: 0,
    inactiveStatus: "active",
  };
}

function createDefaultAdminRemovalState(): OnlineGmAdminRemovalState {
  return {
    status: "none",
  };
}

function getMediaExpectationNarrative(goal: OnlineMediaExpectationGoal) {
  if (goal === "rebuild") {
    return "Rebuild: Entwicklung, Geduld und stabile Fortschritte stehen vor kurzfristigem Druck.";
  }

  if (goal === "playoffs") {
    return "Playoffs: Die Kabine und die Medien erwarten eine relevante Saison.";
  }

  return "Championship: Der GM verspricht ein Titel-Fenster. Jeder Rückschlag wird lauter.";
}

function getOnlineSeasonFromLeagueWeek(currentWeek: number) {
  if (!Number.isFinite(currentWeek) || currentWeek <= 1) {
    return 1;
  }

  return Math.max(1, Math.ceil(currentWeek / 18));
}

function isOnlineOffseasonWeek(currentWeek: number) {
  if (!Number.isFinite(currentWeek)) {
    return false;
  }

  const normalizedWeek = Math.max(1, Math.floor(currentWeek));

  return normalizedWeek === 1 || (normalizedWeek - 1) % 18 === 0;
}

function getFranchiseStrategyDefaults(strategy: FranchiseStrategyType) {
  if (strategy === "rebuild") {
    return {
      expectedWinRate: 0.34,
      expectedPlayoff: false,
      developmentFocus: 88,
      financialRiskTolerance: 24,
      ownerPressureModifier: 7,
      fanPressureModifier: -8,
      financeRiskModifier: -0.1,
      trainingDevelopmentModifier: 0.22,
      trainingPreparationModifier: -0.06,
      contractYouthPreference: 92,
      starSpendingTolerance: 25,
      narrative: "Rebuild: Owner und Fans tolerieren kurzfristige Rückschläge, erwarten aber junge Entwicklung.",
      riskExplanation: "Zu teure Veteranen oder fehlende Entwicklung wirken gegen die gewählte Richtung.",
      impactSummary: "Mehr Geduld, konservativere Finanzen, stärkerer Player-Development-Fokus.",
    };
  }

  if (strategy === "youth_focus") {
    return {
      expectedWinRate: 0.42,
      expectedPlayoff: false,
      developmentFocus: 96,
      financialRiskTolerance: 34,
      ownerPressureModifier: 4,
      fanPressureModifier: -4,
      financeRiskModifier: -0.05,
      trainingDevelopmentModifier: 0.3,
      trainingPreparationModifier: -0.03,
      contractYouthPreference: 100,
      starSpendingTolerance: 36,
      narrative: "Youth Focus: Die Franchise priorisiert junge Spieler, Entwicklung und mittelfristige Sprünge.",
      riskExplanation: "Wenn keine jungen Kerne wachsen oder teure Kurzzeitlösungen dominieren, kippt die Geduld schnell.",
      impactSummary: "Maximaler Development-Schwerpunkt, moderate Geduld, klare Präferenz für junge Verträge.",
    };
  }

  if (strategy === "win_now") {
    return {
      expectedWinRate: 0.65,
      expectedPlayoff: true,
      developmentFocus: 35,
      financialRiskTolerance: 88,
      ownerPressureModifier: -10,
      fanPressureModifier: 10,
      financeRiskModifier: 0.12,
      trainingDevelopmentModifier: -0.04,
      trainingPreparationModifier: 0.18,
      contractYouthPreference: 24,
      starSpendingTolerance: 92,
      narrative: "Win Now: Owner und Fans erwarten sofortige Resultate, Finanzen und Training werden aggressiver.",
      riskExplanation: "Playoffs sind Pflicht. Verfehlte Erwartungen treffen Job Security und Fan-Druck härter.",
      impactSummary: "Höherer Druck, mehr Spending-Toleranz, stärkerer Preparation-Fokus.",
    };
  }

  return {
    expectedWinRate: 0.5,
    expectedPlayoff: false,
    developmentFocus: 55,
    financialRiskTolerance: 52,
    ownerPressureModifier: 0,
    fanPressureModifier: 0,
    financeRiskModifier: 0,
    trainingDevelopmentModifier: 0,
    trainingPreparationModifier: 0,
    contractYouthPreference: 50,
    starSpendingTolerance: 50,
    narrative: "Balanced: Franchise bleibt flexibel zwischen Entwicklung, Ergebnisdruck und finanzieller Stabilität.",
    riskExplanation: "Extreme Kaderentscheidungen ohne klare Richtung werden weniger stark belohnt.",
    impactSummary: "Ausgewogene Erwartungen, Standard-Finanzen, keine harten Systemboni.",
  };
}

function createFranchiseStrategyProfile(
  strategy: FranchiseStrategyType,
  now = new Date().toISOString(),
  selectedAtSeason = 1,
): FranchiseStrategyProfile {
  return {
    strategy,
    strategyType: strategy,
    selectedAtSeason: normalizeSeasonNumber(selectedAtSeason),
    ...getFranchiseStrategyDefaults(strategy),
    setAt: now,
    updatedAt: now,
  };
}

function getStrategyExpectation(strategy: FranchiseStrategyProfile): OnlineGmExpectation {
  if (strategy.strategyType === "rebuild" || strategy.strategyType === "youth_focus") {
    return "rebuild";
  }

  if (strategy.strategyType === "win_now") {
    return "playoffs";
  }

  return "competitive";
}

function getFranchiseStrategyMismatchPenalty(
  strategy: FranchiseStrategyProfile,
  seasonResult: OnlineGmSeasonResult,
  expectationResult: OnlineGmExpectationResult,
) {
  const totalGames = Math.max(1, seasonResult.wins + seasonResult.losses + (seasonResult.ties ?? 0));
  const winRate = seasonResult.wins / totalGames;
  let penalty = 0;

  if (strategy.expectedPlayoff && !seasonResult.playoffAppearance) {
    penalty -= strategy.strategyType === "win_now" ? 12 : 7;
  }

  if (winRate + 0.001 < strategy.expectedWinRate - 0.15) {
    penalty -= Math.round((strategy.expectedWinRate - winRate) * 24);
  }

  if (
    (strategy.strategyType === "rebuild" || strategy.strategyType === "youth_focus") &&
    (seasonResult.capHealth ?? 60) < 45
  ) {
    penalty -= strategy.strategyType === "youth_focus" ? 10 : 8;
  }

  if (expectationResult === "failed" && strategy.strategyType === "win_now") {
    penalty -= 6;
  }

  return Math.max(-24, penalty);
}

function getMediaExpectationPressure(goal: OnlineMediaExpectationGoal) {
  if (goal === "rebuild") {
    return {
      fanPressureModifier: -8,
      ownerPressureModifier: -5,
      ownerExpectation: "rebuild" as const,
    };
  }

  if (goal === "playoffs") {
    return {
      fanPressureModifier: 6,
      ownerPressureModifier: 4,
      ownerExpectation: "playoffs" as const,
    };
  }

  return {
    fanPressureModifier: 16,
    ownerPressureModifier: 10,
    ownerExpectation: "championship" as const,
  };
}

function createMediaExpectationProfile(
  user: Pick<OnlineLeagueUser, "teamId" | "userId">,
  season: number,
  goal: OnlineMediaExpectationGoal,
  now = new Date().toISOString(),
): OnlineMediaExpectationProfile {
  const pressure = getMediaExpectationPressure(goal);

  return {
    teamId: user.teamId,
    userId: user.userId,
    season: normalizeSeasonNumber(season),
    goal,
    ownerExpectation: pressure.ownerExpectation,
    fanPressureModifier: pressure.fanPressureModifier,
    ownerPressureModifier: pressure.ownerPressureModifier,
    mediaNarrative: getMediaExpectationNarrative(goal),
    setAt: now,
    updatedAt: now,
  };
}

function getStableNumberFromString(value: string) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function createDefaultStadiumProfile(
  teamId: string,
  teamName: string,
  cityName: string | undefined,
  season: number,
  now = new Date().toISOString(),
): StadiumProfile {
  const seed = getStableNumberFromString(teamId);
  const capacity = 35_000 + (seed % 56_000);

  return {
    stadiumId: `stadium-${teamId}`,
    teamId,
    name: `${teamName} Stadium`,
    city: cityName ?? "Local Market",
    capacity,
    condition: 60 + (seed % 31),
    comfort: 50 + (seed % 41),
    atmosphere: 50 + (seed % 46),
    ticketPriceLevel: 45 + (seed % 31),
    merchPriceLevel: 45 + ((seed + 11) % 31),
    parkingRevenueLevel: 35 + (seed % 41),
    concessionsQuality: 45 + (seed % 41),
    luxurySuitesLevel: 30 + (seed % 51),
    lastRenovatedSeason: season,
    createdAt: now,
    updatedAt: now,
  };
}

function createDefaultFanbaseProfile(
  teamId: string,
  cityName: string | undefined,
  now = new Date().toISOString(),
): FanbaseProfile {
  const seed = getStableNumberFromString(`${teamId}-${cityName ?? ""}`);

  return {
    teamId,
    marketSize: 35 + (seed % 66),
    fanLoyalty: 45 + (seed % 46),
    fanMood: 58 + (seed % 18),
    expectations: 45 + (seed % 46),
    patience: 45 + (seed % 46),
    bandwagonFactor: 25 + (seed % 66),
    mediaPressure: 30 + (seed % 66),
    seasonTicketBase: 35 + (seed % 56),
    merchInterest: 35 + (seed % 56),
    rivalryIntensity: 35 + (seed % 61),
    updatedAt: now,
  };
}

export function getTeamChemistryTier(score: number): TeamChemistryTier {
  const chemistry = clampScore(score);

  if (chemistry >= 85) {
    return "elite";
  }
  if (chemistry >= 70) {
    return "connected";
  }
  if (chemistry >= 50) {
    return "neutral";
  }
  if (chemistry >= 30) {
    return "unstable";
  }

  return "fractured";
}

export function calculateTeamChemistryGameplayModifier(score: number) {
  const normalized = clampScore(score);
  const rawModifier = (normalized - 50) / 500;

  return Math.round(Math.max(-0.08, Math.min(0.08, rawModifier)) * 1000) / 1000;
}

function createDefaultTeamChemistryProfile(
  teamId: string,
  currentWeek: number,
  currentSeason = 1,
  now = new Date().toISOString(),
): TeamChemistryProfile {
  const seed = getStableNumberFromString(teamId);
  const score = 56 + (seed % 14);

  return {
    teamId,
    score,
    playerSatisfaction: 58 + (seed % 16),
    gameplayModifier: calculateTeamChemistryGameplayModifier(score),
    recentTrend: 0,
    lastUpdatedSeason: currentSeason,
    lastUpdatedWeek: currentWeek,
    updatedAt: now,
  };
}

function createDefaultFinanceProfile(teamId: string, now = new Date().toISOString()) {
  return {
    teamId,
    ticketRevenue: 0,
    concessionsRevenue: 0,
    parkingRevenue: 0,
    merchandiseRevenue: 0,
    sponsorshipRevenue: 0,
    mediaRevenue: 0,
    playoffRevenue: 0,
    totalRevenue: 0,
    playerPayroll: 0,
    staffPayroll: 0,
    stadiumMaintenance: 0,
    gameDayOperations: 0,
    travelCosts: 0,
    adminCosts: 0,
    totalExpenses: 0,
    weeklyProfitLoss: 0,
    seasonProfitLoss: 0,
    cashBalance: 25_000_000,
    ownerInvestment: 0,
    updatedAt: now,
  };
}

function createDefaultCoachingStaffProfile(teamId: string, teamName: string): CoachingStaffProfile {
  const seed = getStableNumberFromString(`${teamId}-${teamName}`);
  const surnames = ["Keller", "Morgan", "Reeves", "Bennett", "Fischer", "Hayes"];
  const surname = surnames[seed % surnames.length];

  return {
    teamId,
    headCoachName: `${surname} Head Coach`,
    offensiveCoordinatorName: `${surname} OC`,
    defensiveCoordinatorName: `${surname} DC`,
    specialTeamsCoachName: `${surname} ST`,
    strengthCoachName: `${surname} Strength`,
    developmentCoachName: `${surname} Development`,
    offenseTraining: 48 + (seed % 35),
    defenseTraining: 46 + ((seed + 7) % 37),
    playerDevelopment: 45 + ((seed + 13) % 40),
    injuryPrevention: 48 + ((seed + 19) % 36),
    discipline: 45 + ((seed + 23) % 39),
    motivation: 48 + ((seed + 29) % 38),
    gamePreparation: 46 + ((seed + 31) % 40),
    adaptability: 45 + ((seed + 37) % 39),
  };
}

function createDefaultTrainingPlan(
  leagueId: string,
  teamId: string,
  userId: string,
  season: number,
  week: number,
  source: TrainingPlanSource,
  now = new Date().toISOString(),
): WeeklyTrainingPlan {
  return {
    planId: `${leagueId}-${teamId}-s${season}-w${week}-${source}`,
    teamId,
    leagueId,
    season,
    week,
    intensity: "normal",
    primaryFocus: "balanced",
    riskTolerance: "medium",
    youngPlayerPriority: 50,
    veteranMaintenance: 50,
    submittedByUserId: userId,
    submittedAt: now,
    source,
  };
}

function applyFranchiseStrategyToDefaultTrainingPlan(
  plan: WeeklyTrainingPlan,
  strategy: FranchiseStrategyProfile,
): WeeklyTrainingPlan {
  if (strategy.strategyType === "rebuild") {
    return {
      ...plan,
      primaryFocus: "player_development",
      riskTolerance: "low",
      youngPlayerPriority: 80,
      veteranMaintenance: 65,
    };
  }

  if (strategy.strategyType === "youth_focus") {
    return {
      ...plan,
      primaryFocus: "player_development",
      riskTolerance: "low",
      youngPlayerPriority: 95,
      veteranMaintenance: 55,
    };
  }

  if (strategy.strategyType === "win_now") {
    return {
      ...plan,
      intensity: "hard",
      primaryFocus: "balanced",
      riskTolerance: "medium",
      youngPlayerPriority: 40,
      veteranMaintenance: 35,
    };
  }

  return plan;
}

function createContract(
  salaryPerYear: number,
  yearsRemaining: number,
  guaranteedMoney: number,
  contractType?: PlayerContract["contractType"],
  signingBonus?: number,
): PlayerContract {
  const normalizedYears = Math.max(1, Math.floor(yearsRemaining));
  const normalizedSalary = Math.max(0, Math.round(salaryPerYear));
  const normalizedGuaranteed = Math.max(0, Math.round(guaranteedMoney));
  const normalizedSigningBonus = Math.max(
    0,
    Math.round(signingBonus ?? normalizedGuaranteed * 0.15),
  );
  const normalizedContractType =
    contractType ?? inferContractType({ salaryPerYear: normalizedSalary, yearsRemaining: normalizedYears });
  const capHitPerYear = Math.max(
    0,
    Math.round(normalizedSalary + normalizedSigningBonus / normalizedYears),
  );
  const deadCapPerYear = Math.max(
    0,
    Math.round((normalizedGuaranteed + normalizedSigningBonus) / normalizedYears),
  );

  return {
    salaryPerYear: normalizedSalary,
    yearsRemaining: normalizedYears,
    totalValue: Math.max(
      0,
      Math.round(normalizedSalary * normalizedYears + normalizedSigningBonus),
    ),
    guaranteedMoney: normalizedGuaranteed,
    signingBonus: normalizedSigningBonus,
    contractType: normalizedContractType,
    capHitPerYear,
    deadCapPerYear,
  };
}

function createDefaultContractRoster(teamId: string, teamName: string): OnlineContractPlayer[] {
  return CONTRACT_ROSTER_TEMPLATE.map((player) => ({
    playerId: `${teamId}-${player.suffix}`,
    playerName: `${teamName} ${player.playerName}`,
    position: player.position,
    age: player.age,
    overall: player.overall,
    potential: player.potential,
    developmentPath: player.developmentPath,
    developmentProgress: 0,
    xFactors: inferDefaultXFactors(player),
    contract: createContract(
      player.salaryPerYear,
      player.yearsRemaining,
      player.guaranteedMoney,
      inferContractType({ age: player.age, overall: player.overall }),
    ),
    status: "active",
  }));
}

export function getFantasyDraftPositionTargetCounts(
  maxUsers: number,
): Record<OnlineFantasyDraftPosition, number> {
  const normalizedTeams = normalizeMaxUsers(maxUsers);

  return ONLINE_FANTASY_DRAFT_POSITIONS.reduce(
    (counts, position) => ({
      ...counts,
      [position]: Math.ceil(
        ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position] *
          normalizedTeams *
          (1 + ONLINE_FANTASY_DRAFT_RESERVE_RATE),
      ),
    }),
    {} as Record<OnlineFantasyDraftPosition, number>,
  );
}

function getFantasyDraftPlayerRating(
  position: OnlineFantasyDraftPosition,
  index: number,
  count: number,
) {
  const tier = index / Math.max(1, count - 1);

  if (position === "K" || position === "P") {
    if (tier < 0.15) {
      return { min: 82, max: 90 };
    }

    if (tier < 0.45) {
      return { min: 74, max: 81 };
    }

    return { min: 62, max: 73 };
  }

  if (tier < 0.05) {
    return { min: 88, max: 94 };
  }

  if (tier < 0.2) {
    return { min: 80, max: 87 };
  }

  if (tier < 0.75) {
    return { min: 68, max: 79 };
  }

  return { min: 58, max: 67 };
}

function getFantasyDraftPlayerAge(
  position: OnlineFantasyDraftPosition,
  overall: number,
  rng: ReturnType<typeof createRng>,
) {
  if (position === "K" || position === "P") {
    return rng.int(23, 36);
  }

  if (overall >= 86) {
    return rng.int(24, 31);
  }

  if (overall >= 76) {
    return rng.int(22, 32);
  }

  return rng.int(21, 34);
}

function getFantasyDraftPlayerName(
  position: OnlineFantasyDraftPosition,
  index: number,
  rng: ReturnType<typeof createRng>,
) {
  const firstName = FANTASY_DRAFT_FIRST_NAMES[
    rng.int(0, FANTASY_DRAFT_FIRST_NAMES.length - 1)
  ];
  const lastName = FANTASY_DRAFT_LAST_NAMES[
    rng.int(0, FANTASY_DRAFT_LAST_NAMES.length - 1)
  ];

  return `${firstName} ${lastName} ${FANTASY_DRAFT_POSITION_SUFFIX[position]} ${index + 1}`;
}

function getFantasyDraftSalary(
  position: OnlineFantasyDraftPosition,
  overall: number,
  rng: ReturnType<typeof createRng>,
) {
  const base = FANTASY_DRAFT_SALARY_BASE[position];
  const ratingMultiplier = 0.45 + Math.max(0, overall - 55) / 38;
  const positionPremium = position === "QB" && overall >= 84 ? 1.35 : 1;
  const variance = rng.int(88, 114) / 100;

  return Math.round(base * ratingMultiplier * positionPremium * variance);
}

function createFantasyDraftPlayer(
  leagueId: string,
  position: OnlineFantasyDraftPosition,
  index: number,
  count: number,
  seed: string,
): OnlineContractPlayer {
  const rng = createRng(`${seed}:${leagueId}:${position}:${index}`);
  const ratingBand = getFantasyDraftPlayerRating(position, index, count);
  const overall = rng.int(ratingBand.min, ratingBand.max);
  const age = getFantasyDraftPlayerAge(position, overall, rng);
  const developmentPath = inferPlayerDevelopmentPath({
    age,
    overall,
    potential: Math.min(99, overall + rng.int(age <= 24 ? 4 : 0, age <= 27 ? 9 : 4)),
  });
  const potential = Math.min(
    99,
    overall + rng.int(developmentPath === "star" ? 5 : 0, developmentPath === "bust" ? 3 : 7),
  );
  const salaryPerYear = getFantasyDraftSalary(position, overall, rng);
  const yearsRemaining = rng.int(1, overall >= 82 ? 5 : 4);
  const guaranteedMoney = Math.round(salaryPerYear * yearsRemaining * rng.int(20, 55) / 100);
  const player: OnlineContractPlayer = {
    playerId: createSeededId(
      `pool-${position.toLowerCase()}-${String(index + 1).padStart(3, "0")}`,
      `${seed}:${leagueId}:${position}:${index}:id`,
      8,
    ),
    playerName: getFantasyDraftPlayerName(position, index, rng),
    position,
    age,
    overall,
    potential,
    developmentPath,
    developmentProgress: 0,
    xFactors: [],
    contract: createContract(
      salaryPerYear,
      yearsRemaining,
      guaranteedMoney,
      inferContractType({ age, overall }),
    ),
    status: "active",
  };

  return {
    ...player,
    xFactors: inferDefaultXFactors(player),
  };
}

export function createFantasyDraftPlayerPool(
  leagueId: string,
  maxUsers: number,
): OnlineContractPlayer[] {
  const counts = getFantasyDraftPositionTargetCounts(maxUsers);

  return ONLINE_FANTASY_DRAFT_POSITIONS.flatMap((position) =>
    Array.from({ length: counts[position] }, (_, index) =>
      createFantasyDraftPlayer(
        leagueId,
        position,
        index,
        counts[position],
        ONLINE_FANTASY_DRAFT_SEED,
      ),
    ),
  );
}

export function createInitialFantasyDraftState(
  leagueId: string,
  maxUsers: number,
): OnlineFantasyDraftState {
  const playerPool = createFantasyDraftPlayerPool(leagueId, maxUsers);

  return {
    leagueId,
    status: "not_started",
    round: 1,
    pickNumber: 1,
    currentTeamId: "",
    draftOrder: [],
    picks: [],
    availablePlayerIds: playerPool.map((player) => player.playerId),
    startedAt: null,
    completedAt: null,
  };
}

function isOnlineFantasyDraftPick(value: unknown): value is OnlineFantasyDraftPick {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pick = value as Partial<OnlineFantasyDraftPick>;

  return (
    typeof pick.pickNumber === "number" &&
    typeof pick.round === "number" &&
    typeof pick.teamId === "string" &&
    typeof pick.playerId === "string" &&
    typeof pick.pickedByUserId === "string" &&
    typeof pick.timestamp === "string"
  );
}

function isOnlineFantasyDraftState(value: unknown): value is OnlineFantasyDraftState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<OnlineFantasyDraftState>;

  return (
    typeof state.leagueId === "string" &&
    (state.status === "not_started" || state.status === "active" || state.status === "completed") &&
    typeof state.round === "number" &&
    typeof state.pickNumber === "number" &&
    typeof state.currentTeamId === "string" &&
    Array.isArray(state.draftOrder) &&
    state.draftOrder.every((teamId) => typeof teamId === "string") &&
    Array.isArray(state.picks) &&
    state.picks.every(isOnlineFantasyDraftPick) &&
    Array.isArray(state.availablePlayerIds) &&
    state.availablePlayerIds.every((playerId) => typeof playerId === "string") &&
    (state.startedAt === null || typeof state.startedAt === "string") &&
    (state.completedAt === null || typeof state.completedAt === "string")
  );
}

function normalizeFantasyDraftState(state: OnlineFantasyDraftState): OnlineFantasyDraftState {
  const picks = state.picks
    .map((pick) => ({
      ...pick,
      pickNumber: Math.max(1, Math.floor(pick.pickNumber)),
      round: Math.max(1, Math.floor(pick.round)),
    }))
    .sort((left, right) => left.pickNumber - right.pickNumber);
  const pickedPlayerIds = new Set(picks.map((pick) => pick.playerId));

  return {
    ...state,
    round: Math.max(1, Math.floor(state.round)),
    pickNumber: Math.max(1, Math.floor(state.pickNumber)),
    draftOrder: Array.from(new Set(state.draftOrder)),
    picks,
    availablePlayerIds: Array.from(
      new Set(state.availablePlayerIds.filter((playerId) => !pickedPlayerIds.has(playerId))),
    ),
    startedAt: state.startedAt ?? null,
    completedAt: state.completedAt ?? null,
  };
}

function createDefaultOnlineDepthChart(
  roster: OnlineContractPlayer[],
  now = new Date().toISOString(),
): OnlineDepthChartEntry[] {
  const playersByPosition = new Map<string, OnlineContractPlayer[]>();

  roster
    .filter((player) => player.status === "active")
    .forEach((player) => {
      playersByPosition.set(player.position, [
        ...(playersByPosition.get(player.position) ?? []),
        player,
      ]);
    });

  return Array.from(playersByPosition.entries())
    .map(([position, players]) => {
      const sortedPlayers = [...players].sort((left, right) => right.overall - left.overall);
      const starter = sortedPlayers[0];

      return starter
        ? {
            position,
            starterPlayerId: starter.playerId,
            backupPlayerIds: sortedPlayers.slice(1).map((player) => player.playerId),
            updatedAt: now,
          }
        : null;
    })
    .filter((entry): entry is OnlineDepthChartEntry => Boolean(entry));
}

function createDefaultFreeAgents(): OnlineContractPlayer[] {
  return FREE_AGENT_TEMPLATE.map((player) => ({
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    age: player.age,
    overall: player.overall,
    potential: player.potential,
    developmentPath: player.developmentPath,
    developmentProgress: 0,
    xFactors: inferDefaultXFactors(player),
    contract: createContract(
      player.salaryPerYear,
      player.yearsRemaining,
      player.guaranteedMoney,
      inferContractType({ age: player.age, overall: player.overall }),
    ),
    status: "free_agent",
  }));
}

function createDefaultAvailableCoaches(): Coach[] {
  return COACH_MARKET_TEMPLATE.map(normalizeCoach);
}

function createDefaultDraftPicks(teamId: string, currentSeason = 1): OnlineDraftPick[] {
  return [currentSeason, currentSeason + 1, currentSeason + 2].flatMap((season) =>
    [1, 2, 3].map((round) => ({
      pickId: `${teamId}-${season}-r${round}`,
      season,
      round,
      originalTeamId: teamId,
      currentTeamId: teamId,
    })),
  );
}

function createDefaultProspects(): Prospect[] {
  return PROSPECT_TEMPLATE.map((prospect) => ({
    prospectId: prospect.prospectId,
    playerName: prospect.playerName,
    position: prospect.position,
    age: prospect.age,
    trueRating: prospect.trueRating,
    scoutedRating: clampScore(prospect.trueRating + prospect.publicOffset),
    potential: prospect.potential,
    scoutingAccuracy: 35,
    scoutedByTeamIds: [],
    status: "available",
  }));
}

function createDraftOrder(league: OnlineLeague): DraftOrder {
  const picks = league.users.map((user, index) => ({
    pickNumber: index + 1,
    round: 1,
    teamId: user.teamId,
    userId: user.userId,
    status: "available" as const,
  }));

  return {
    season: Math.max(1, ...league.users.map((user) => user.jobSecurity?.lastUpdatedSeason ?? 1)),
    picks,
  };
}

function calculateSalaryCap(
  contractRoster: OnlineContractPlayer[],
  capLimit = DEFAULT_ONLINE_SALARY_CAP_LIMIT,
  deadCapOverride?: number,
): SalaryCap {
  const activeSalary = contractRoster
    .filter((player) => player.status === "active")
    .reduce((sum, player) => sum + player.contract.capHitPerYear, 0);
  const deadCap =
    deadCapOverride ??
    contractRoster
      .filter((player) => player.status === "released")
      .reduce((sum, player) => sum + player.contract.deadCapPerYear, 0);
  const currentCapUsage = Math.max(0, activeSalary + deadCap);
  const availableCap = capLimit - currentCapUsage;
  const softBufferLimit = Math.round(
    capLimit * (1 + DEFAULT_ONLINE_SOFT_CAP_BUFFER_PERCENTAGE / 100),
  );

  return {
    capLimit,
    activeSalary: Math.max(0, activeSalary),
    currentCapUsage,
    deadCap: Math.max(0, deadCap),
    availableCap,
    softBufferLimit,
    capRiskLevel:
      currentCapUsage > capLimit
        ? "over"
        : currentCapUsage >= capLimit * 0.95
          ? "tight"
          : "healthy",
  };
}

function normalizeFinanceRules(rules: Partial<OnlineFinanceRules> | undefined): OnlineFinanceRules {
  return {
    ...DEFAULT_FINANCE_RULES,
    ...rules,
    revenueSharingPercentage: clampPercentage(
      rules?.revenueSharingPercentage ?? DEFAULT_FINANCE_RULES.revenueSharingPercentage,
    ),
    minCashFloor: Math.max(0, Math.round(rules?.minCashFloor ?? DEFAULT_FINANCE_RULES.minCashFloor)),
    maxTicketPriceLevel: clampTrait(
      rules?.maxTicketPriceLevel ?? DEFAULT_FINANCE_RULES.maxTicketPriceLevel,
    ),
    allowStadiumUpgrades: false,
  };
}

function normalizeLeagueSettings(settings: Partial<OnlineLeagueSettings> | undefined): OnlineLeagueSettings {
  return {
    gmActivityRules: {
      ...DEFAULT_GM_ACTIVITY_RULES,
      ...(settings?.gmActivityRules ?? {}),
    },
    financeRules: normalizeFinanceRules(settings?.financeRules),
  };
}

function createScheduleForTeamPool(leagueId: string, teams: OnlineLeagueTeam[]) {
  return canCreateOnlineLeagueSchedule(teams) ? createOnlineLeagueSchedule(leagueId, teams) : [];
}

function createGlobalTestLeague(): OnlineLeague {
  return {
    id: GLOBAL_TEST_LEAGUE_ID,
    name: "Global Test League",
    users: [],
    teams: ONLINE_MVP_TEAM_POOL,
    schedule: createOnlineLeagueSchedule(GLOBAL_TEST_LEAGUE_ID, ONLINE_MVP_TEAM_POOL),
    freeAgents: createDefaultFreeAgents(),
    fantasyDraft: createInitialFantasyDraftState(GLOBAL_TEST_LEAGUE_ID, ONLINE_MVP_TEAM_POOL.length),
    fantasyDraftPlayerPool: createFantasyDraftPlayerPool(GLOBAL_TEST_LEAGUE_ID, ONLINE_MVP_TEAM_POOL.length),
    leagueSettings: createDefaultLeagueSettings(),
    weekStatus: "pre_week",
    currentWeek: 1,
    currentSeason: 1,
    maxUsers: ONLINE_MVP_TEAM_POOL.length,
    status: "waiting",
  };
}

function isOnlineLeagueTeam(value: unknown): value is OnlineLeagueTeam {
  if (!value || typeof value !== "object") {
    return false;
  }

  const team = value as Partial<OnlineLeagueTeam>;

  return (
    typeof team.id === "string" &&
    typeof team.name === "string" &&
    typeof team.abbreviation === "string"
  );
}

function isOnlineLeagueScheduleMatch(value: unknown): value is OnlineLeagueScheduleMatch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const match = value as Partial<OnlineLeagueScheduleMatch>;

  return (
    typeof match.id === "string" &&
    typeof match.week === "number" &&
    typeof match.homeTeamName === "string" &&
    typeof match.awayTeamName === "string"
  );
}

function isOnlineLeagueLogEntry(value: unknown): value is OnlineLeagueLogEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const logEntry = value as Partial<OnlineLeagueLogEntry>;

  return (
    typeof logEntry.id === "string" &&
    typeof logEntry.message === "string" &&
    typeof logEntry.createdAt === "string"
  );
}

function isOwnershipProfile(value: unknown): value is OwnershipProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<OwnershipProfile>;

  return (
    typeof profile.ownerId === "string" &&
    typeof profile.ownerName === "string" &&
    typeof profile.patience === "number" &&
    typeof profile.ambition === "number" &&
    typeof profile.financialPressure === "number" &&
    typeof profile.loyalty === "number" &&
    typeof profile.mediaSensitivity === "number" &&
    typeof profile.rebuildTolerance === "number"
  );
}

function isGmJobSecurityStatus(value: unknown): value is GmJobSecurityStatus {
  return (
    value === "secure" ||
    value === "stable" ||
    value === "under_pressure" ||
    value === "hot_seat" ||
    value === "termination_risk" ||
    value === "fired"
  );
}

function isOnlineGmInactiveStatus(value: unknown): value is OnlineGmInactiveStatus {
  return (
    value === "active" ||
    value === "warning" ||
    value === "inactive" ||
    value === "removal_eligible" ||
    value === "removed"
  );
}

function isOnlineGmAdminRemovalStatus(
  value: unknown,
): value is OnlineGmAdminRemovalStatus {
  return (
    value === "none" ||
    value === "admin_warning" ||
    value === "admin_authorized_removal" ||
    value === "admin_removed"
  );
}

function isOnlineLeagueEventType(value: unknown): value is OnlineLeagueEventType {
  return (
    value === "owner_confidence_changed" ||
    value === "gm_hot_seat" ||
    value === "gm_warning" ||
    value === "gm_removal_authorized" ||
    value === "gm_removed_by_admin" ||
    value === "owner_fired_gm" ||
    value === "gm_fired_by_owner" ||
    value === "team_marked_vacant" ||
    value === "stadium_attendance_updated" ||
    value === "fan_mood_changed" ||
    value === "fan_pressure_changed" ||
    value === "merchandise_revenue_generated" ||
    value === "matchday_revenue_generated" ||
    value === "franchise_finance_updated" ||
    value === "owner_confidence_changed_by_fans" ||
    value === "financial_warning" ||
    value === "training_plan_submitted" ||
    value === "training_plan_auto_defaulted" ||
    value === "training_outcome_generated" ||
    value === "training_fatigue_changed" ||
    value === "training_chemistry_changed" ||
    value === "training_injury_risk_changed" ||
    value === "training_preparation_bonus_applied" ||
    value === "player_development_updated" ||
    value === "x_factor_triggered" ||
    value === "contract_extended" ||
    value === "player_released" ||
    value === "free_agent_signed" ||
    value === "salary_cap_updated" ||
    value === "trade_proposed" ||
    value === "trade_declined" ||
    value === "trade_accepted" ||
    value === "prospect_scouted" ||
    value === "draft_pick_made" ||
    value === "coach_hired" ||
    value === "coach_fired" ||
    value === "team_chemistry_changed" ||
    value === "media_expectation_set" ||
    value === "franchise_strategy_set" ||
    value === "stadium_pricing_updated" ||
    value === "depth_chart_updated" ||
    value === "online_match_result_recorded"
  );
}

function isOnlineLeagueEvent(value: unknown): value is OnlineLeagueEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<OnlineLeagueEvent>;

  return (
    typeof event.id === "string" &&
    isOnlineLeagueEventType(event.eventType) &&
    typeof event.leagueId === "string" &&
    typeof event.teamId === "string" &&
    typeof event.userId === "string" &&
    typeof event.reason === "string" &&
    typeof event.season === "number" &&
    typeof event.week === "number" &&
    typeof event.createdAt === "string"
  );
}

function isStadiumProfile(value: unknown): value is StadiumProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const stadium = value as Partial<StadiumProfile>;

  return (
    typeof stadium.stadiumId === "string" &&
    typeof stadium.teamId === "string" &&
    typeof stadium.name === "string" &&
    typeof stadium.city === "string" &&
    typeof stadium.capacity === "number" &&
    typeof stadium.condition === "number" &&
    typeof stadium.comfort === "number" &&
    typeof stadium.atmosphere === "number" &&
    typeof stadium.ticketPriceLevel === "number" &&
    (stadium.merchPriceLevel === undefined ||
      typeof stadium.merchPriceLevel === "number") &&
    typeof stadium.parkingRevenueLevel === "number" &&
    typeof stadium.concessionsQuality === "number" &&
    typeof stadium.luxurySuitesLevel === "number" &&
    typeof stadium.lastRenovatedSeason === "number" &&
    typeof stadium.createdAt === "string" &&
    typeof stadium.updatedAt === "string"
  );
}

function isStadiumAttendance(value: unknown): value is StadiumAttendance {
  if (!value || typeof value !== "object") {
    return false;
  }

  const attendance = value as Partial<StadiumAttendance>;

  return (
    typeof attendance.matchId === "string" &&
    typeof attendance.teamId === "string" &&
    typeof attendance.season === "number" &&
    typeof attendance.week === "number" &&
    typeof attendance.attendance === "number" &&
    typeof attendance.attendanceRate === "number" &&
    typeof attendance.soldOut === "boolean" &&
    typeof attendance.ticketRevenue === "number" &&
    typeof attendance.concessionsRevenue === "number" &&
    typeof attendance.parkingRevenue === "number" &&
    typeof attendance.merchandiseRevenue === "number" &&
    typeof attendance.totalMatchdayRevenue === "number" &&
    typeof attendance.fanMoodBefore === "number" &&
    typeof attendance.fanMoodAfter === "number"
  );
}

function isFanbaseProfile(value: unknown): value is FanbaseProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const fanbase = value as Partial<FanbaseProfile>;

  return (
    typeof fanbase.teamId === "string" &&
    typeof fanbase.marketSize === "number" &&
    typeof fanbase.fanLoyalty === "number" &&
    typeof fanbase.fanMood === "number" &&
    typeof fanbase.expectations === "number" &&
    typeof fanbase.patience === "number" &&
    typeof fanbase.bandwagonFactor === "number" &&
    typeof fanbase.mediaPressure === "number" &&
    typeof fanbase.seasonTicketBase === "number" &&
    typeof fanbase.merchInterest === "number" &&
    typeof fanbase.rivalryIntensity === "number" &&
    typeof fanbase.updatedAt === "string"
  );
}

function isFanPressureSnapshot(value: unknown): value is FanPressureSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pressure = value as Partial<FanPressureSnapshot>;

  return (
    typeof pressure.teamId === "string" &&
    typeof pressure.fanPressureScore === "number" &&
    typeof pressure.attendanceTrend === "number" &&
    typeof pressure.merchandiseTrend === "number" &&
    typeof pressure.mediaPressure === "number" &&
    typeof pressure.expectationsVsResult === "number" &&
    typeof pressure.rivalryFailures === "number" &&
    typeof pressure.playoffDrought === "number" &&
    typeof pressure.reasonText === "string" &&
    typeof pressure.updatedAt === "string"
  );
}

function isOnlineMediaExpectationGoal(value: unknown): value is OnlineMediaExpectationGoal {
  return value === "rebuild" || value === "playoffs" || value === "championship";
}

function isFranchiseStrategyType(value: unknown): value is FranchiseStrategyType {
  return (
    value === "rebuild" ||
    value === "win_now" ||
    value === "balanced" ||
    value === "youth_focus"
  );
}

function isOnlineGmExpectation(value: unknown): value is OnlineGmExpectation {
  return (
    value === "rebuild" ||
    value === "competitive" ||
    value === "playoffs" ||
    value === "championship"
  );
}

function isFranchiseStrategyProfile(value: unknown): value is FranchiseStrategyProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<FranchiseStrategyProfile>;
  const strategy = profile.strategyType ?? profile.strategy;

  return (
    isFranchiseStrategyType(strategy) &&
    typeof profile.ownerPressureModifier === "number" &&
    typeof profile.fanPressureModifier === "number" &&
    typeof profile.financeRiskModifier === "number" &&
    typeof profile.trainingDevelopmentModifier === "number" &&
    typeof profile.trainingPreparationModifier === "number" &&
    typeof profile.narrative === "string" &&
    typeof profile.setAt === "string" &&
    typeof profile.updatedAt === "string"
  );
}

function isOnlineMediaExpectationProfile(
  value: unknown,
): value is OnlineMediaExpectationProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<OnlineMediaExpectationProfile>;

  return (
    typeof profile.teamId === "string" &&
    typeof profile.userId === "string" &&
    typeof profile.season === "number" &&
    isOnlineMediaExpectationGoal(profile.goal) &&
    isOnlineGmExpectation(profile.ownerExpectation) &&
    typeof profile.fanPressureModifier === "number" &&
    typeof profile.ownerPressureModifier === "number" &&
    typeof profile.mediaNarrative === "string" &&
    typeof profile.setAt === "string" &&
    typeof profile.updatedAt === "string"
  );
}

function isTeamChemistryProfile(value: unknown): value is TeamChemistryProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const chemistry = value as Partial<TeamChemistryProfile>;

  return (
    typeof chemistry.teamId === "string" &&
    typeof chemistry.score === "number" &&
    typeof chemistry.playerSatisfaction === "number" &&
    typeof chemistry.gameplayModifier === "number" &&
    typeof chemistry.recentTrend === "number" &&
    typeof chemistry.lastUpdatedSeason === "number" &&
    typeof chemistry.lastUpdatedWeek === "number" &&
    typeof chemistry.updatedAt === "string"
  );
}

function isTeamChemistryHistoryEntry(value: unknown): value is TeamChemistryHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<TeamChemistryHistoryEntry>;

  return (
    typeof entry.teamId === "string" &&
    typeof entry.season === "number" &&
    typeof entry.week === "number" &&
    (entry.source === "training" ||
      entry.source === "match_result" ||
      entry.source === "player_satisfaction") &&
    typeof entry.previousScore === "number" &&
    typeof entry.newScore === "number" &&
    typeof entry.delta === "number" &&
    typeof entry.reason === "string" &&
    typeof entry.createdAt === "string"
  );
}

function isMerchandiseFinancials(value: unknown): value is MerchandiseFinancials {
  if (!value || typeof value !== "object") {
    return false;
  }

  const merch = value as Partial<MerchandiseFinancials>;

  return (
    typeof merch.teamId === "string" &&
    typeof merch.season === "number" &&
    typeof merch.week === "number" &&
    typeof merch.baseMerchRevenue === "number" &&
    typeof merch.performanceMultiplier === "number" &&
    typeof merch.fanMoodMultiplier === "number" &&
    typeof merch.marketSizeMultiplier === "number" &&
    typeof merch.playoffMultiplier === "number" &&
    typeof merch.totalMerchRevenue === "number"
  );
}

function isFranchiseFinanceProfile(value: unknown): value is FranchiseFinanceProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const finance = value as Partial<FranchiseFinanceProfile>;

  return (
    typeof finance.teamId === "string" &&
    typeof finance.ticketRevenue === "number" &&
    typeof finance.concessionsRevenue === "number" &&
    typeof finance.parkingRevenue === "number" &&
    typeof finance.merchandiseRevenue === "number" &&
    typeof finance.totalRevenue === "number" &&
    typeof finance.totalExpenses === "number" &&
    typeof finance.weeklyProfitLoss === "number" &&
    typeof finance.seasonProfitLoss === "number" &&
    typeof finance.cashBalance === "number" &&
    typeof finance.ownerInvestment === "number" &&
    typeof finance.updatedAt === "string"
  );
}

function isTrainingIntensity(value: unknown): value is TrainingIntensity {
  return value === "light" || value === "normal" || value === "hard" || value === "extreme";
}

function isTrainingPrimaryFocus(value: unknown): value is TrainingPrimaryFocus {
  return (
    value === "offense" ||
    value === "defense" ||
    value === "balanced" ||
    value === "conditioning" ||
    value === "recovery" ||
    value === "player_development" ||
    value === "team_chemistry"
  );
}

function isTrainingSecondaryFocus(value: unknown): value is TrainingSecondaryFocus {
  return (
    value === "passing_game" ||
    value === "running_game" ||
    value === "pass_protection" ||
    value === "pass_rush" ||
    value === "run_defense" ||
    value === "coverage" ||
    value === "turnovers" ||
    value === "red_zone" ||
    value === "two_minute_drill" ||
    value === "special_teams"
  );
}

function isTrainingRiskTolerance(value: unknown): value is TrainingRiskTolerance {
  return value === "low" || value === "medium" || value === "high";
}

function isTrainingPlanSource(value: unknown): value is TrainingPlanSource {
  return value === "gm_submitted" || value === "auto_default";
}

function isCoachRole(value: unknown): value is CoachRole {
  return (
    value === "head_coach" ||
    value === "offensive_coordinator" ||
    value === "defensive_coordinator" ||
    value === "development_coach"
  );
}

function isCoachRatings(value: unknown): value is CoachRatings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ratings = value as Partial<CoachRatings>;

  return (
    typeof ratings.offense === "number" &&
    typeof ratings.defense === "number" &&
    typeof ratings.development === "number"
  );
}

function isCoach(value: unknown): value is Coach {
  if (!value || typeof value !== "object") {
    return false;
  }

  const coach = value as Partial<Coach>;

  return (
    typeof coach.coachId === "string" &&
    typeof coach.name === "string" &&
    isCoachRole(coach.role) &&
    isCoachRatings(coach.ratings)
  );
}

function isCoachTransactionHistoryEntry(
  value: unknown,
): value is CoachTransactionHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<CoachTransactionHistoryEntry>;

  return (
    typeof entry.transactionId === "string" &&
    (entry.action === "hired" || entry.action === "fired") &&
    typeof entry.teamId === "string" &&
    typeof entry.userId === "string" &&
    typeof entry.coachId === "string" &&
    typeof entry.coachName === "string" &&
    isCoachRole(entry.role) &&
    typeof entry.createdAt === "string"
  );
}

function isCoachingStaffProfile(value: unknown): value is CoachingStaffProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const staff = value as Partial<CoachingStaffProfile>;

  return (
    typeof staff.teamId === "string" &&
    typeof staff.headCoachName === "string" &&
    typeof staff.offensiveCoordinatorName === "string" &&
    typeof staff.defensiveCoordinatorName === "string" &&
    typeof staff.specialTeamsCoachName === "string" &&
    typeof staff.strengthCoachName === "string" &&
    typeof staff.developmentCoachName === "string" &&
    typeof staff.offenseTraining === "number" &&
    typeof staff.defenseTraining === "number" &&
    typeof staff.playerDevelopment === "number" &&
    typeof staff.injuryPrevention === "number" &&
    typeof staff.discipline === "number" &&
    typeof staff.motivation === "number" &&
    typeof staff.gamePreparation === "number" &&
    typeof staff.adaptability === "number"
  );
}

function isWeeklyTrainingPlan(value: unknown): value is WeeklyTrainingPlan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const plan = value as Partial<WeeklyTrainingPlan>;

  return (
    typeof plan.planId === "string" &&
    typeof plan.teamId === "string" &&
    typeof plan.leagueId === "string" &&
    typeof plan.season === "number" &&
    typeof plan.week === "number" &&
    isTrainingIntensity(plan.intensity) &&
    isTrainingPrimaryFocus(plan.primaryFocus) &&
    (plan.secondaryFocus === undefined || isTrainingSecondaryFocus(plan.secondaryFocus)) &&
    isTrainingRiskTolerance(plan.riskTolerance) &&
    typeof plan.youngPlayerPriority === "number" &&
    typeof plan.veteranMaintenance === "number" &&
    (plan.notes === undefined || typeof plan.notes === "string") &&
    typeof plan.submittedByUserId === "string" &&
    typeof plan.submittedAt === "string" &&
    isTrainingPlanSource(plan.source)
  );
}

function isTrainingAffectedPlayer(value: unknown): value is TrainingAffectedPlayer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const player = value as Partial<TrainingAffectedPlayer>;

  return (
    typeof player.playerId === "string" &&
    typeof player.playerName === "string" &&
    typeof player.position === "string" &&
    typeof player.developmentDelta === "number" &&
    typeof player.fatigueDelta === "number" &&
    typeof player.injuryRiskDelta === "number" &&
    (player.moraleDelta === undefined || typeof player.moraleDelta === "number") &&
    typeof player.note === "string"
  );
}

function isTrainingOutcome(value: unknown): value is TrainingOutcome {
  if (!value || typeof value !== "object") {
    return false;
  }

  const outcome = value as Partial<TrainingOutcome>;

  return (
    typeof outcome.teamId === "string" &&
    typeof outcome.season === "number" &&
    typeof outcome.week === "number" &&
    typeof outcome.planId === "string" &&
    typeof outcome.developmentDeltaSummary === "number" &&
    typeof outcome.fatigueDelta === "number" &&
    typeof outcome.injuryRiskDelta === "number" &&
    typeof outcome.chemistryDelta === "number" &&
    typeof outcome.preparationBonus === "number" &&
    typeof outcome.coachExecutionRating === "number" &&
    Array.isArray(outcome.riskEvents) &&
    outcome.riskEvents.every((event) => typeof event === "string") &&
    Array.isArray(outcome.affectedPlayers) &&
    outcome.affectedPlayers.every(isTrainingAffectedPlayer) &&
    typeof outcome.createdAt === "string"
  );
}

function isPlayerContract(value: unknown): value is PlayerContract {
  if (!value || typeof value !== "object") {
    return false;
  }

  const contract = value as Partial<PlayerContract>;

  return (
    typeof contract.salaryPerYear === "number" &&
    typeof contract.yearsRemaining === "number" &&
    typeof contract.totalValue === "number" &&
    typeof contract.guaranteedMoney === "number" &&
    (contract.signingBonus === undefined || typeof contract.signingBonus === "number") &&
    (contract.contractType === undefined ||
      contract.contractType === "rookie" ||
      contract.contractType === "regular" ||
      contract.contractType === "star") &&
    (contract.capHitPerYear === undefined || typeof contract.capHitPerYear === "number") &&
    (contract.deadCapPerYear === undefined || typeof contract.deadCapPerYear === "number")
  );
}

function isOnlineContractPlayerStatus(value: unknown): value is OnlineContractPlayerStatus {
  return value === "active" || value === "released" || value === "free_agent";
}

function isOnlinePlayerXFactor(value: unknown): value is OnlinePlayerXFactor {
  if (!value || typeof value !== "object") {
    return false;
  }

  const xFactor = value as Partial<OnlinePlayerXFactor>;

  return (
    isOnlineXFactorAbilityId(xFactor.abilityId) &&
    typeof xFactor.abilityName === "string" &&
    typeof xFactor.description === "string" &&
    xFactor.rarity === "rare"
  );
}

function isOnlineContractPlayer(value: unknown): value is OnlineContractPlayer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const player = value as Partial<OnlineContractPlayer>;

  return (
    typeof player.playerId === "string" &&
    typeof player.playerName === "string" &&
    typeof player.position === "string" &&
    typeof player.age === "number" &&
    typeof player.overall === "number" &&
    (player.potential === undefined || typeof player.potential === "number") &&
    (player.developmentPath === undefined ||
      isPlayerDevelopmentPath(player.developmentPath)) &&
    (player.developmentProgress === undefined ||
      typeof player.developmentProgress === "number") &&
    (player.xFactors === undefined ||
      (Array.isArray(player.xFactors) && player.xFactors.every(isOnlinePlayerXFactor))) &&
    isPlayerContract(player.contract) &&
    isOnlineContractPlayerStatus(player.status)
  );
}

function isOnlineDepthChartEntry(value: unknown): value is OnlineDepthChartEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<OnlineDepthChartEntry>;

  return (
    typeof entry.position === "string" &&
    typeof entry.starterPlayerId === "string" &&
    Array.isArray(entry.backupPlayerIds) &&
    entry.backupPlayerIds.every((playerId) => typeof playerId === "string") &&
    typeof entry.updatedAt === "string"
  );
}

function isOnlineWeekFlowStatus(value: unknown): value is OnlineWeekFlowStatus {
  return (
    value === "pre_week" ||
    value === "ready" ||
    value === "simulating" ||
    value === "completed" ||
    value === "post_game"
  );
}

function isOnlineMatchResult(value: unknown): value is OnlineMatchResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<OnlineMatchResult>;

  return (
    typeof result.matchId === "string" &&
    typeof result.season === "number" &&
    typeof result.week === "number" &&
    typeof result.homeTeamId === "string" &&
    typeof result.awayTeamId === "string" &&
    typeof result.homeTeamName === "string" &&
    typeof result.awayTeamName === "string" &&
    typeof result.homeScore === "number" &&
    typeof result.awayScore === "number" &&
    isOnlineMatchTeamStats(result.homeStats) &&
    isOnlineMatchTeamStats(result.awayStats) &&
    typeof result.winnerTeamId === "string" &&
    typeof result.winnerTeamName === "string" &&
    typeof result.tiebreakerApplied === "boolean" &&
    typeof result.simulatedAt === "string" &&
    typeof result.simulatedByUserId === "string" &&
    result.status === "completed" &&
    typeof result.createdAt === "string"
  );
}

function isOnlineMatchTeamStats(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const stats = value as Record<string, unknown>;

  return (
    typeof stats.firstDowns === "number" &&
    typeof stats.passingYards === "number" &&
    typeof stats.rushingYards === "number" &&
    typeof stats.totalYards === "number" &&
    typeof stats.turnovers === "number"
  );
}

function isOnlineCompletedWeek(value: unknown): value is OnlineCompletedWeek {
  if (!value || typeof value !== "object") {
    return false;
  }

  const completedWeek = value as Partial<OnlineCompletedWeek>;

  return (
    typeof completedWeek.weekKey === "string" &&
    typeof completedWeek.season === "number" &&
    typeof completedWeek.week === "number" &&
    completedWeek.status === "completed" &&
    Array.isArray(completedWeek.resultMatchIds) &&
    completedWeek.resultMatchIds.every((matchId) => typeof matchId === "string") &&
    typeof completedWeek.completedAt === "string" &&
    typeof completedWeek.simulatedByUserId === "string" &&
    typeof completedWeek.nextSeason === "number" &&
    typeof completedWeek.nextWeek === "number"
  );
}

function isSalaryCap(value: unknown): value is SalaryCap {
  if (!value || typeof value !== "object") {
    return false;
  }

  const cap = value as Partial<SalaryCap>;

  return (
    typeof cap.capLimit === "number" &&
    typeof cap.currentCapUsage === "number" &&
    typeof cap.deadCap === "number" &&
    (cap.activeSalary === undefined || typeof cap.activeSalary === "number") &&
    (cap.availableCap === undefined || typeof cap.availableCap === "number") &&
    (cap.softBufferLimit === undefined || typeof cap.softBufferLimit === "number") &&
    (cap.capRiskLevel === undefined ||
      cap.capRiskLevel === "healthy" ||
      cap.capRiskLevel === "tight" ||
      cap.capRiskLevel === "over")
  );
}

function isOnlineDraftPick(value: unknown): value is OnlineDraftPick {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pick = value as Partial<OnlineDraftPick>;

  return (
    typeof pick.pickId === "string" &&
    typeof pick.season === "number" &&
    typeof pick.round === "number" &&
    typeof pick.originalTeamId === "string" &&
    typeof pick.currentTeamId === "string"
  );
}

function isTradeStatus(value: unknown): value is TradeStatus {
  return value === "pending" || value === "accepted" || value === "declined";
}

function isTradeProposal(value: unknown): value is TradeProposal {
  if (!value || typeof value !== "object") {
    return false;
  }

  const trade = value as Partial<TradeProposal>;

  return (
    typeof trade.tradeId === "string" &&
    typeof trade.fromTeamId === "string" &&
    typeof trade.toTeamId === "string" &&
    typeof trade.fromUserId === "string" &&
    typeof trade.toUserId === "string" &&
    Array.isArray(trade.playersOffered) &&
    trade.playersOffered.every((playerId) => typeof playerId === "string") &&
    Array.isArray(trade.playersRequested) &&
    trade.playersRequested.every((playerId) => typeof playerId === "string") &&
    Array.isArray(trade.picksOffered) &&
    trade.picksOffered.every((pickId) => typeof pickId === "string") &&
    Array.isArray(trade.picksRequested) &&
    trade.picksRequested.every((pickId) => typeof pickId === "string") &&
    isTradeStatus(trade.status) &&
    typeof trade.fairnessScore === "number" &&
    (trade.fairnessLabel === "fair" ||
      trade.fairnessLabel === "slightly_unbalanced" ||
      trade.fairnessLabel === "unbalanced") &&
    typeof trade.createdAt === "string" &&
    typeof trade.updatedAt === "string"
  );
}

function isTradeHistoryEntry(value: unknown): value is TradeHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const trade = value as Partial<TradeHistoryEntry>;

  return (
    typeof trade.tradeId === "string" &&
    typeof trade.fromTeamId === "string" &&
    typeof trade.toTeamId === "string" &&
    Array.isArray(trade.playersOffered) &&
    Array.isArray(trade.playersRequested) &&
    Array.isArray(trade.picksOffered) &&
    Array.isArray(trade.picksRequested) &&
    typeof trade.executedAt === "string" &&
    typeof trade.summary === "string"
  );
}

function isProspectStatus(value: unknown): value is ProspectStatus {
  return value === "available" || value === "drafted";
}

function isProspect(value: unknown): value is Prospect {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prospect = value as Partial<Prospect>;

  return (
    typeof prospect.prospectId === "string" &&
    typeof prospect.playerName === "string" &&
    typeof prospect.position === "string" &&
    typeof prospect.age === "number" &&
    typeof prospect.trueRating === "number" &&
    typeof prospect.scoutedRating === "number" &&
    typeof prospect.potential === "number" &&
    typeof prospect.scoutingAccuracy === "number" &&
    Array.isArray(prospect.scoutedByTeamIds) &&
    prospect.scoutedByTeamIds.every((teamId) => typeof teamId === "string") &&
    isProspectStatus(prospect.status) &&
    (prospect.draftedByTeamId === undefined || typeof prospect.draftedByTeamId === "string")
  );
}

function isDraftOrderPick(value: unknown): value is DraftOrderPick {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pick = value as Partial<DraftOrderPick>;

  return (
    typeof pick.pickNumber === "number" &&
    typeof pick.round === "number" &&
    typeof pick.teamId === "string" &&
    typeof pick.userId === "string" &&
    (pick.status === "available" || pick.status === "made") &&
    (pick.prospectId === undefined || typeof pick.prospectId === "string")
  );
}

function isDraftOrder(value: unknown): value is DraftOrder {
  if (!value || typeof value !== "object") {
    return false;
  }

  const order = value as Partial<DraftOrder>;

  return (
    typeof order.season === "number" &&
    Array.isArray(order.picks) &&
    order.picks.every(isDraftOrderPick)
  );
}

function isDraftHistoryEntry(value: unknown): value is DraftHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const history = value as Partial<DraftHistoryEntry>;

  return (
    typeof history.pickNumber === "number" &&
    typeof history.round === "number" &&
    typeof history.teamId === "string" &&
    typeof history.userId === "string" &&
    typeof history.prospectId === "string" &&
    typeof history.playerName === "string" &&
    typeof history.draftedAt === "string"
  );
}

function isGmJobSecurityScore(value: unknown): value is GmJobSecurityScore {
  if (!value || typeof value !== "object") {
    return false;
  }

  const jobSecurity = value as Partial<GmJobSecurityScore>;

  return (
    typeof jobSecurity.score === "number" &&
    isGmJobSecurityStatus(jobSecurity.status) &&
    typeof jobSecurity.lastUpdatedWeek === "number" &&
    typeof jobSecurity.lastUpdatedSeason === "number" &&
    Array.isArray(jobSecurity.gmPerformanceHistory)
  );
}

function isOnlineGmActivityMetrics(value: unknown): value is OnlineGmActivityMetrics {
  if (!value || typeof value !== "object") {
    return false;
  }

  const activity = value as Partial<OnlineGmActivityMetrics>;

  return (
    typeof activity.lastSeenAt === "string" &&
    typeof activity.lastLeagueActionAt === "string" &&
    typeof activity.missedWeeklyActions === "number" &&
    typeof activity.missedLineupSubmissions === "number" &&
    isOnlineGmInactiveStatus(activity.inactiveStatus) &&
    (activity.inactiveSinceWeek === undefined ||
      typeof activity.inactiveSinceWeek === "number")
  );
}

function isOnlineGmAdminRemovalState(value: unknown): value is OnlineGmAdminRemovalState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const removal = value as Partial<OnlineGmAdminRemovalState>;

  return (
    isOnlineGmAdminRemovalStatus(removal.status) &&
    (removal.message === undefined || typeof removal.message === "string") &&
    (removal.reason === undefined || typeof removal.reason === "string") &&
    (removal.deadlineAt === undefined || typeof removal.deadlineAt === "string") &&
    (removal.updatedAt === undefined || typeof removal.updatedAt === "string")
  );
}

function isOnlineLeagueSettings(value: unknown): value is OnlineLeagueSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settings = value as Partial<OnlineLeagueSettings>;
  const rules = settings.gmActivityRules;
  const financeRules = settings.financeRules;
  const hasValidFinanceRules =
    financeRules === undefined ||
    (typeof financeRules.enableStadiumFinance === "boolean" &&
      typeof financeRules.enableFanPressure === "boolean" &&
      typeof financeRules.enableMerchRevenue === "boolean" &&
      typeof financeRules.equalMediaRevenue === "boolean" &&
      typeof financeRules.revenueSharingEnabled === "boolean" &&
      typeof financeRules.revenueSharingPercentage === "number" &&
      typeof financeRules.ownerBailoutEnabled === "boolean" &&
      typeof financeRules.minCashFloor === "number" &&
      typeof financeRules.maxTicketPriceLevel === "number" &&
      financeRules.allowStadiumUpgrades === false);

  return (
    !!rules &&
    typeof rules.warningAfterMissedWeeks === "number" &&
    typeof rules.inactiveAfterMissedWeeks === "number" &&
    typeof rules.removalEligibleAfterMissedWeeks === "number" &&
    (rules.autoVacateAfterMissedWeeks === false ||
      typeof rules.autoVacateAfterMissedWeeks === "number") &&
    hasValidFinanceRules
  );
}

function isStoredOnlineLeagueUser(value: unknown): value is StoredOnlineLeagueUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<StoredOnlineLeagueUser>;

  return (
    typeof user.userId === "string" &&
    typeof user.username === "string" &&
    typeof user.joinedAt === "string" &&
    typeof user.teamId === "string" &&
    typeof user.teamName === "string" &&
    (user.cityId === undefined || typeof user.cityId === "string") &&
    (user.cityName === undefined || typeof user.cityName === "string") &&
    (user.teamNameId === undefined || typeof user.teamNameId === "string") &&
    (user.teamCategory === undefined ||
      (user.teamCategory === "identity_city" ||
        user.teamCategory === "aggressive_competitive" ||
        user.teamCategory === "modern_sports" ||
        user.teamCategory === "classic_sports")) &&
    (user.teamDisplayName === undefined || typeof user.teamDisplayName === "string") &&
    (user.ownershipProfile === undefined || isOwnershipProfile(user.ownershipProfile)) &&
    (user.jobSecurity === undefined || isGmJobSecurityScore(user.jobSecurity)) &&
    (user.activity === undefined || isOnlineGmActivityMetrics(user.activity)) &&
    (user.adminRemoval === undefined ||
      isOnlineGmAdminRemovalState(user.adminRemoval)) &&
    (user.teamStatus === undefined ||
      user.teamStatus === "occupied" ||
      user.teamStatus === "vacant") &&
    (user.controlledBy === undefined ||
      user.controlledBy === "user" ||
      user.controlledBy === "ai_or_commissioner") &&
    (user.allowNewUserJoin === undefined || typeof user.allowNewUserJoin === "boolean") &&
    (user.stadiumProfile === undefined || isStadiumProfile(user.stadiumProfile)) &&
    (user.attendanceHistory === undefined ||
      (Array.isArray(user.attendanceHistory) &&
        user.attendanceHistory.every(isStadiumAttendance))) &&
    (user.fanbaseProfile === undefined || isFanbaseProfile(user.fanbaseProfile)) &&
    (user.fanPressure === undefined || isFanPressureSnapshot(user.fanPressure)) &&
    (user.mediaExpectationProfile === undefined ||
      isOnlineMediaExpectationProfile(user.mediaExpectationProfile)) &&
    (user.franchiseStrategy === undefined ||
      isFranchiseStrategyProfile(user.franchiseStrategy)) &&
    (user.teamChemistryProfile === undefined ||
      isTeamChemistryProfile(user.teamChemistryProfile)) &&
    (user.chemistryHistory === undefined ||
      (Array.isArray(user.chemistryHistory) &&
        user.chemistryHistory.every(isTeamChemistryHistoryEntry))) &&
    (user.merchandiseFinancials === undefined ||
      (Array.isArray(user.merchandiseFinancials) &&
        user.merchandiseFinancials.every(isMerchandiseFinancials))) &&
    (user.financeProfile === undefined ||
      isFranchiseFinanceProfile(user.financeProfile)) &&
    (user.coachingStaffProfile === undefined ||
      isCoachingStaffProfile(user.coachingStaffProfile)) &&
    (user.weeklyTrainingPlans === undefined ||
      (Array.isArray(user.weeklyTrainingPlans) &&
        user.weeklyTrainingPlans.every(isWeeklyTrainingPlan))) &&
    (user.trainingOutcomes === undefined ||
      (Array.isArray(user.trainingOutcomes) &&
        user.trainingOutcomes.every(isTrainingOutcome))) &&
    (user.depthChart === undefined ||
      (Array.isArray(user.depthChart) &&
        user.depthChart.every(isOnlineDepthChartEntry))) &&
    (user.salaryCap === undefined || isSalaryCap(user.salaryCap)) &&
    (user.contractRoster === undefined ||
      (Array.isArray(user.contractRoster) &&
        user.contractRoster.every(isOnlineContractPlayer))) &&
    (user.draftPicks === undefined ||
      (Array.isArray(user.draftPicks) && user.draftPicks.every(isOnlineDraftPick))) &&
    (user.previousUserId === undefined || typeof user.previousUserId === "string") &&
    (user.vacantSince === undefined || typeof user.vacantSince === "string") &&
    (user.readyForWeek === undefined || typeof user.readyForWeek === "boolean") &&
    (user.readyAt === undefined || typeof user.readyAt === "string")
  );
}

function isStoredOnlineLeague(value: unknown): value is StoredOnlineLeague {
  if (!value || typeof value !== "object") {
    return false;
  }

  const league = value as Partial<StoredOnlineLeague>;

  return (
    typeof league.id === "string" &&
    typeof league.name === "string" &&
    Array.isArray(league.users) &&
    league.users.every(isStoredOnlineLeagueUser) &&
    Array.isArray(league.teams) &&
    league.teams.every(isOnlineLeagueTeam) &&
    (league.freeAgents === undefined ||
      (Array.isArray(league.freeAgents) &&
        league.freeAgents.every(isOnlineContractPlayer))) &&
    (league.tradeProposals === undefined ||
      (Array.isArray(league.tradeProposals) &&
        league.tradeProposals.every(isTradeProposal))) &&
    (league.tradeHistory === undefined ||
      (Array.isArray(league.tradeHistory) &&
        league.tradeHistory.every(isTradeHistoryEntry))) &&
    (league.prospects === undefined ||
      (Array.isArray(league.prospects) && league.prospects.every(isProspect))) &&
    (league.draftOrder === undefined || isDraftOrder(league.draftOrder)) &&
    (league.draftHistory === undefined ||
      (Array.isArray(league.draftHistory) &&
        league.draftHistory.every(isDraftHistoryEntry))) &&
    (league.fantasyDraft === undefined || isOnlineFantasyDraftState(league.fantasyDraft)) &&
    (league.fantasyDraftPlayerPool === undefined ||
      (Array.isArray(league.fantasyDraftPlayerPool) &&
        league.fantasyDraftPlayerPool.every(isOnlineContractPlayer))) &&
    (league.availableCoaches === undefined ||
      (Array.isArray(league.availableCoaches) && league.availableCoaches.every(isCoach))) &&
    (league.coachHistory === undefined ||
      (Array.isArray(league.coachHistory) &&
        league.coachHistory.every(isCoachTransactionHistoryEntry))) &&
    (league.schedule === undefined ||
      (Array.isArray(league.schedule) &&
        league.schedule.every(isOnlineLeagueScheduleMatch))) &&
    (league.logs === undefined ||
      (Array.isArray(league.logs) && league.logs.every(isOnlineLeagueLogEntry))) &&
    (league.events === undefined ||
      (Array.isArray(league.events) && league.events.every(isOnlineLeagueEvent))) &&
    (league.leagueSettings === undefined ||
      isOnlineLeagueSettings(league.leagueSettings)) &&
    (league.weekStatus === undefined || isOnlineWeekFlowStatus(league.weekStatus)) &&
    (league.matchResults === undefined ||
      (Array.isArray(league.matchResults) &&
        league.matchResults.every(isOnlineMatchResult))) &&
    (league.completedWeeks === undefined ||
      (Array.isArray(league.completedWeeks) &&
        league.completedWeeks.every(isOnlineCompletedWeek))) &&
    (league.currentWeek === undefined ||
      (typeof league.currentWeek === "number" && Number.isFinite(league.currentWeek))) &&
    typeof league.maxUsers === "number" &&
    (league.status === "waiting" || league.status === "active")
  );
}

function normalizeOwnershipProfile(user: StoredOnlineLeagueUser): OwnershipProfile {
  const fallbackTeamName = user.teamDisplayName ?? user.teamName;
  const profile =
    user.ownershipProfile ?? createDefaultOwnershipProfile(user.teamId, fallbackTeamName);

  return {
    ...profile,
    patience: clampTrait(profile.patience),
    ambition: clampTrait(profile.ambition),
    financialPressure: clampTrait(profile.financialPressure),
    loyalty: clampTrait(profile.loyalty),
    mediaSensitivity: clampTrait(profile.mediaSensitivity),
    rebuildTolerance: clampTrait(profile.rebuildTolerance),
  };
}

function normalizeJobSecurity(
  user: StoredOnlineLeagueUser,
  currentWeek: number,
): GmJobSecurityScore {
  const jobSecurity = user.jobSecurity ?? createDefaultJobSecurityScore(currentWeek);

  return {
    ...jobSecurity,
    score: clampScore(jobSecurity.score),
    status: jobSecurity.status,
    lastUpdatedWeek: jobSecurity.lastUpdatedWeek,
    lastUpdatedSeason: jobSecurity.lastUpdatedSeason,
    gmPerformanceHistory: jobSecurity.gmPerformanceHistory,
  };
}

function normalizeActivity(
  user: StoredOnlineLeagueUser,
  now = user.joinedAt,
): OnlineGmActivityMetrics {
  const activity = user.activity ?? createDefaultActivityMetrics(now);

  return {
    ...activity,
    missedWeeklyActions: Math.max(0, Math.floor(activity.missedWeeklyActions)),
    missedLineupSubmissions: Math.max(0, Math.floor(activity.missedLineupSubmissions)),
  };
}

function normalizeStadiumProfile(
  user: StoredOnlineLeagueUser,
  currentSeason: number,
): StadiumProfile {
  const teamDisplayName = user.teamDisplayName ?? user.teamName;
  const stadium =
    user.stadiumProfile ??
    createDefaultStadiumProfile(user.teamId, teamDisplayName, user.cityName, currentSeason);

  return {
    ...stadium,
    capacity: Math.max(35_000, Math.min(90_000, Math.round(stadium.capacity))),
    condition: clampTrait(stadium.condition),
    comfort: clampTrait(stadium.comfort),
    atmosphere: clampTrait(stadium.atmosphere),
    ticketPriceLevel: clampTrait(stadium.ticketPriceLevel),
    merchPriceLevel: clampTrait(stadium.merchPriceLevel ?? stadium.ticketPriceLevel),
    parkingRevenueLevel: clampTrait(stadium.parkingRevenueLevel),
    concessionsQuality: clampTrait(stadium.concessionsQuality),
    luxurySuitesLevel: clampTrait(stadium.luxurySuitesLevel),
  };
}

function normalizeFanbaseProfile(user: StoredOnlineLeagueUser): FanbaseProfile {
  const fanbase = user.fanbaseProfile ?? createDefaultFanbaseProfile(user.teamId, user.cityName);

  return {
    ...fanbase,
    marketSize: clampTrait(fanbase.marketSize),
    fanLoyalty: clampTrait(fanbase.fanLoyalty),
    fanMood: clampScore(fanbase.fanMood),
    expectations: clampTrait(fanbase.expectations),
    patience: clampTrait(fanbase.patience),
    bandwagonFactor: clampTrait(fanbase.bandwagonFactor),
    mediaPressure: clampTrait(fanbase.mediaPressure),
    seasonTicketBase: clampTrait(fanbase.seasonTicketBase),
    merchInterest: clampTrait(fanbase.merchInterest),
    rivalryIntensity: clampTrait(fanbase.rivalryIntensity),
  };
}

function normalizeFinanceProfile(user: StoredOnlineLeagueUser): FranchiseFinanceProfile {
  const finance = user.financeProfile ?? createDefaultFinanceProfile(user.teamId);
  const totalRevenue =
    finance.ticketRevenue +
    finance.concessionsRevenue +
    finance.parkingRevenue +
    finance.merchandiseRevenue +
    finance.sponsorshipRevenue +
    finance.mediaRevenue +
    finance.playoffRevenue;
  const totalExpenses =
    finance.playerPayroll +
    finance.staffPayroll +
    finance.stadiumMaintenance +
    finance.gameDayOperations +
    finance.travelCosts +
    finance.adminCosts;

  return {
    ...finance,
    totalRevenue: Math.max(0, totalRevenue),
    totalExpenses: Math.max(0, totalExpenses),
    weeklyProfitLoss: finance.weeklyProfitLoss,
    seasonProfitLoss: finance.seasonProfitLoss,
    cashBalance: Math.max(0, finance.cashBalance),
  };
}

function normalizeCoachingStaffValues(staff: CoachingStaffProfile): CoachingStaffProfile {
  return {
    ...staff,
    offenseTraining: clampTrait(staff.offenseTraining),
    defenseTraining: clampTrait(staff.defenseTraining),
    playerDevelopment: clampTrait(staff.playerDevelopment),
    injuryPrevention: clampTrait(staff.injuryPrevention),
    discipline: clampTrait(staff.discipline),
    motivation: clampTrait(staff.motivation),
    gamePreparation: clampTrait(staff.gamePreparation),
    adaptability: clampTrait(staff.adaptability),
  };
}

function normalizeCoachingStaffProfile(user: StoredOnlineLeagueUser): CoachingStaffProfile {
  const teamDisplayName = user.teamDisplayName ?? user.teamName;
  const staff =
    user.coachingStaffProfile ??
    createDefaultCoachingStaffProfile(user.teamId, teamDisplayName);

  return normalizeCoachingStaffValues(staff);
}

function normalizeWeeklyTrainingPlan(plan: WeeklyTrainingPlan): WeeklyTrainingPlan {
  const planWithoutEmptyNotes = { ...plan };

  if (planWithoutEmptyNotes.notes !== undefined && !planWithoutEmptyNotes.notes.trim()) {
    delete planWithoutEmptyNotes.notes;
  }

  return {
    ...planWithoutEmptyNotes,
    season: normalizeSeasonNumber(plan.season),
    week: Math.max(1, Math.floor(plan.week)),
    youngPlayerPriority: clampPercentage(plan.youngPlayerPriority),
    veteranMaintenance: clampPercentage(plan.veteranMaintenance),
  };
}

function normalizeTrainingOutcome(outcome: TrainingOutcome): TrainingOutcome {
  return {
    ...outcome,
    season: normalizeSeasonNumber(outcome.season),
    week: Math.max(1, Math.floor(outcome.week)),
    coachExecutionRating: clampScore(outcome.coachExecutionRating),
    preparationBonus: Math.max(0, Math.min(5, outcome.preparationBonus)),
  };
}

function normalizeMediaExpectationProfile(
  profile: OnlineMediaExpectationProfile | undefined,
): OnlineMediaExpectationProfile | undefined {
  if (!profile) {
    return undefined;
  }

  const pressure = getMediaExpectationPressure(profile.goal);

  return {
    ...profile,
    season: normalizeSeasonNumber(profile.season),
    ownerExpectation: pressure.ownerExpectation,
    fanPressureModifier: Math.max(-25, Math.min(25, Math.round(profile.fanPressureModifier))),
    ownerPressureModifier: Math.max(-20, Math.min(20, Math.round(profile.ownerPressureModifier))),
    mediaNarrative: profile.mediaNarrative || getMediaExpectationNarrative(profile.goal),
  };
}

function normalizeFranchiseStrategyProfile(
  profile: FranchiseStrategyProfile | undefined,
): FranchiseStrategyProfile {
  const strategy = isFranchiseStrategyType(profile?.strategyType)
    ? profile.strategyType
    : isFranchiseStrategyType(profile?.strategy)
      ? profile.strategy
      : "balanced";
  const defaults = getFranchiseStrategyDefaults(strategy);
  const now = new Date().toISOString();

  return {
    strategy,
    strategyType: strategy,
    selectedAtSeason: normalizeSeasonNumber(profile?.selectedAtSeason ?? 1),
    expectedWinRate: Math.max(
      0,
      Math.min(1, profile?.expectedWinRate ?? defaults.expectedWinRate),
    ),
    expectedPlayoff: profile?.expectedPlayoff ?? defaults.expectedPlayoff,
    developmentFocus: clampPercentage(profile?.developmentFocus ?? defaults.developmentFocus),
    financialRiskTolerance: clampPercentage(
      profile?.financialRiskTolerance ?? defaults.financialRiskTolerance,
    ),
    ownerPressureModifier: Math.max(
      -20,
      Math.min(20, Math.round(profile?.ownerPressureModifier ?? defaults.ownerPressureModifier)),
    ),
    fanPressureModifier: Math.max(
      -20,
      Math.min(20, Math.round(profile?.fanPressureModifier ?? defaults.fanPressureModifier)),
    ),
    financeRiskModifier: Math.max(
      -0.5,
      Math.min(0.5, profile?.financeRiskModifier ?? defaults.financeRiskModifier),
    ),
    trainingDevelopmentModifier: Math.max(
      -0.5,
      Math.min(0.5, profile?.trainingDevelopmentModifier ?? defaults.trainingDevelopmentModifier),
    ),
    trainingPreparationModifier: Math.max(
      -0.5,
      Math.min(0.5, profile?.trainingPreparationModifier ?? defaults.trainingPreparationModifier),
    ),
    contractYouthPreference: clampPercentage(
      profile?.contractYouthPreference ?? defaults.contractYouthPreference,
    ),
    starSpendingTolerance: clampPercentage(
      profile?.starSpendingTolerance ?? defaults.starSpendingTolerance,
    ),
    narrative: profile?.narrative || defaults.narrative,
    riskExplanation: profile?.riskExplanation || defaults.riskExplanation,
    impactSummary: profile?.impactSummary || defaults.impactSummary,
    setAt: profile?.setAt ?? now,
    updatedAt: profile?.updatedAt ?? now,
  };
}

function normalizeTeamChemistryProfile(
  user: StoredOnlineLeagueUser,
  currentWeek: number,
): TeamChemistryProfile {
  const currentSeason = normalizeSeasonNumber(user.jobSecurity?.lastUpdatedSeason ?? 1);
  const profile =
    user.teamChemistryProfile ??
    createDefaultTeamChemistryProfile(user.teamId, currentWeek, currentSeason);
  const score = clampScore(profile.score);

  return {
    ...profile,
    score,
    playerSatisfaction: clampScore(profile.playerSatisfaction),
    gameplayModifier: calculateTeamChemistryGameplayModifier(score),
    recentTrend: Math.max(-25, Math.min(25, Math.round(profile.recentTrend))),
    lastUpdatedSeason: normalizeSeasonNumber(profile.lastUpdatedSeason),
    lastUpdatedWeek: Math.max(1, Math.floor(profile.lastUpdatedWeek)),
  };
}

function normalizeTeamChemistryHistoryEntry(
  entry: TeamChemistryHistoryEntry,
): TeamChemistryHistoryEntry {
  return {
    ...entry,
    season: normalizeSeasonNumber(entry.season),
    week: Math.max(1, Math.floor(entry.week)),
    previousScore: clampScore(entry.previousScore),
    newScore: clampScore(entry.newScore),
    delta: Math.max(-25, Math.min(25, Math.round(entry.delta))),
  };
}

function normalizePlayerContract(contract: PlayerContract): PlayerContract {
  const yearsRemaining = Math.max(0, Math.floor(contract.yearsRemaining));
  const salaryPerYear = Math.max(0, Math.round(contract.salaryPerYear));
  const guaranteedMoney = Math.max(0, Math.round(contract.guaranteedMoney));
  const signingBonus = Math.max(0, Math.round(contract.signingBonus ?? guaranteedMoney * 0.15));
  const contractType =
    contract.contractType ?? inferContractType({ salaryPerYear, yearsRemaining });
  const normalizedYearsForMath = Math.max(1, yearsRemaining);

  return {
    salaryPerYear,
    yearsRemaining,
    totalValue: Math.max(0, Math.round(contract.totalValue || salaryPerYear * yearsRemaining + signingBonus)),
    guaranteedMoney,
    signingBonus,
    contractType,
    capHitPerYear: Math.max(
      0,
      Math.round(contract.capHitPerYear ?? salaryPerYear + signingBonus / normalizedYearsForMath),
    ),
    deadCapPerYear: Math.max(
      0,
      Math.round(contract.deadCapPerYear ?? (guaranteedMoney + signingBonus) / normalizedYearsForMath),
    ),
  };
}

function normalizeContractPlayer(player: OnlineContractPlayer): OnlineContractPlayer {
  const overall = clampScore(player.overall);
  const developmentPath = isPlayerDevelopmentPath(player.developmentPath)
    ? player.developmentPath
    : inferPlayerDevelopmentPath({ ...player, overall });
  const potential = clampScore(
    Math.max(
      overall,
      player.potential ?? getDefaultPotentialForPath(overall, developmentPath),
    ),
  );
  const normalizedPlayer = {
    ...player,
    age: Math.max(18, Math.floor(player.age)),
    overall,
    potential,
    developmentPath,
  };

  return {
    ...normalizedPlayer,
    overall,
    potential,
    developmentPath,
    developmentProgress: Math.max(0, player.developmentProgress ?? 0),
    xFactors: (player.xFactors ?? inferDefaultXFactors(normalizedPlayer)).map((xFactor) =>
      getOnlineXFactorDefinition(xFactor.abilityId),
    ),
    contract: normalizePlayerContract(player.contract),
  };
}

function normalizeDraftPick(pick: OnlineDraftPick): OnlineDraftPick {
  return {
    ...pick,
    season: normalizeSeasonNumber(pick.season),
    round: Math.max(1, Math.floor(pick.round)),
  };
}

function normalizeProspect(prospect: Prospect): Prospect {
  return {
    ...prospect,
    age: Math.max(18, Math.floor(prospect.age)),
    trueRating: clampScore(prospect.trueRating),
    scoutedRating: clampScore(prospect.scoutedRating),
    potential: clampScore(prospect.potential),
    scoutingAccuracy: clampScore(prospect.scoutingAccuracy),
    scoutedByTeamIds: Array.from(new Set(prospect.scoutedByTeamIds)),
  };
}

function normalizeDraftOrder(order: DraftOrder): DraftOrder {
  return {
    season: normalizeSeasonNumber(order.season),
    picks: order.picks
      .map((pick) => ({
        ...pick,
        pickNumber: Math.max(1, Math.floor(pick.pickNumber)),
        round: Math.max(1, Math.floor(pick.round)),
      }))
      .sort((left, right) => left.pickNumber - right.pickNumber),
  };
}

function normalizeCoach(coach: Coach): Coach {
  return {
    ...coach,
    ratings: {
      offense: clampTrait(coach.ratings.offense),
      defense: clampTrait(coach.ratings.defense),
      development: clampTrait(coach.ratings.development),
    },
  };
}

function normalizeContractRoster(user: StoredOnlineLeagueUser): OnlineContractPlayer[] {
  const teamDisplayName = user.teamDisplayName ?? user.teamName;

  return (user.contractRoster ?? createDefaultContractRoster(user.teamId, teamDisplayName)).map(
    normalizeContractPlayer,
  );
}

function normalizeDepthChart(
  user: StoredOnlineLeagueUser,
  contractRoster: OnlineContractPlayer[],
): OnlineDepthChartEntry[] {
  const activePlayerIds = new Set(
    contractRoster
      .filter((player) => player.status === "active")
      .map((player) => player.playerId),
  );
  const normalizedEntries = (user.depthChart ?? [])
    .filter(
      (entry) =>
        activePlayerIds.has(entry.starterPlayerId) &&
        entry.backupPlayerIds.every((playerId) => activePlayerIds.has(playerId)),
    )
    .map((entry) => ({
      ...entry,
      backupPlayerIds: Array.from(new Set(entry.backupPlayerIds)),
      updatedAt: entry.updatedAt || new Date().toISOString(),
    }));

  return normalizedEntries.length > 0
    ? normalizedEntries
    : createDefaultOnlineDepthChart(contractRoster);
}

function normalizeOnlineLeagueUser(
  user: StoredOnlineLeagueUser,
  currentWeek: number,
): OnlineLeagueUser {
  const currentSeason = normalizeSeasonNumber(user.jobSecurity?.lastUpdatedSeason ?? 1);
  const contractRoster = normalizeContractRoster(user);
  const salaryCap = calculateSalaryCap(
    contractRoster,
    user.salaryCap?.capLimit ?? DEFAULT_ONLINE_SALARY_CAP_LIMIT,
    user.salaryCap?.deadCap,
  );

  return {
    ...user,
    ownershipProfile: normalizeOwnershipProfile(user),
    jobSecurity: normalizeJobSecurity(user, currentWeek),
    activity: normalizeActivity(user),
    adminRemoval: user.adminRemoval ?? createDefaultAdminRemovalState(),
    teamStatus: user.teamStatus ?? "occupied",
    controlledBy: user.controlledBy ?? "user",
    allowNewUserJoin: user.allowNewUserJoin ?? false,
    stadiumProfile: normalizeStadiumProfile(user, currentSeason),
    attendanceHistory: user.attendanceHistory ?? [],
    fanbaseProfile: normalizeFanbaseProfile(user),
    fanPressure: user.fanPressure,
    mediaExpectationProfile: normalizeMediaExpectationProfile(user.mediaExpectationProfile),
    franchiseStrategy: normalizeFranchiseStrategyProfile(user.franchiseStrategy),
    teamChemistryProfile: normalizeTeamChemistryProfile(user, currentWeek),
    chemistryHistory: (user.chemistryHistory ?? []).map(normalizeTeamChemistryHistoryEntry),
    merchandiseFinancials: user.merchandiseFinancials ?? [],
    financeProfile: normalizeFinanceProfile(user),
    coachingStaffProfile: normalizeCoachingStaffProfile(user),
    weeklyTrainingPlans: (user.weeklyTrainingPlans ?? []).map(normalizeWeeklyTrainingPlan),
    trainingOutcomes: (user.trainingOutcomes ?? []).map(normalizeTrainingOutcome),
    contractRoster,
    depthChart: normalizeDepthChart(user, contractRoster),
    salaryCap,
    draftPicks: (user.draftPicks ?? createDefaultDraftPicks(user.teamId, currentSeason)).map(
      normalizeDraftPick,
    ),
    readyForWeek: user.readyForWeek ?? false,
  };
}

function getOnlineLeagueUserOwner(user: OnlineLeagueUser): OwnershipProfile {
  return (
    user.ownershipProfile ??
    createDefaultOwnershipProfile(user.teamId, user.teamDisplayName ?? user.teamName)
  );
}

function getOnlineLeagueUserFranchiseStrategy(user: OnlineLeagueUser): FranchiseStrategyProfile {
  return normalizeFranchiseStrategyProfile(user.franchiseStrategy);
}

function getOnlineLeagueUserJobSecurity(
  user: OnlineLeagueUser,
  currentWeek: number,
): GmJobSecurityScore {
  return user.jobSecurity ?? createDefaultJobSecurityScore(currentWeek);
}

function getOnlineLeagueUserActivity(user: OnlineLeagueUser): OnlineGmActivityMetrics {
  return user.activity ?? createDefaultActivityMetrics(user.joinedAt);
}

function getOnlineLeagueUserAdminRemoval(
  user: OnlineLeagueUser,
): OnlineGmAdminRemovalState {
  return user.adminRemoval ?? createDefaultAdminRemovalState();
}

function getOnlineLeagueActivityRules(league: OnlineLeague): OnlineGmActivityRules {
  return league.leagueSettings?.gmActivityRules ?? DEFAULT_GM_ACTIVITY_RULES;
}

function getOnlineLeagueFinanceRules(league: OnlineLeague): OnlineFinanceRules {
  return league.leagueSettings?.financeRules ?? DEFAULT_FINANCE_RULES;
}

function getOnlineLeagueUserStadium(user: OnlineLeagueUser): StadiumProfile {
  return (
    user.stadiumProfile ??
    createDefaultStadiumProfile(
      user.teamId,
      user.teamDisplayName ?? user.teamName,
      user.cityName,
      user.jobSecurity?.lastUpdatedSeason ?? 1,
    )
  );
}

function getOnlineLeagueUserFanbase(user: OnlineLeagueUser): FanbaseProfile {
  return user.fanbaseProfile ?? createDefaultFanbaseProfile(user.teamId, user.cityName);
}

function getOnlineLeagueUserMediaExpectation(
  user: OnlineLeagueUser,
  season: number,
): OnlineMediaExpectationProfile | undefined {
  const profile = user.mediaExpectationProfile;

  if (!profile || profile.season !== normalizeSeasonNumber(season)) {
    return undefined;
  }

  return profile;
}

function getOnlineLeagueUserFinance(user: OnlineLeagueUser): FranchiseFinanceProfile {
  return user.financeProfile ?? createDefaultFinanceProfile(user.teamId);
}

function getOnlineLeagueUserAttendanceHistory(user: OnlineLeagueUser) {
  return user.attendanceHistory ?? [];
}

function getOnlineLeagueUserMerchandiseFinancials(user: OnlineLeagueUser) {
  return user.merchandiseFinancials ?? [];
}

function getOnlineLeagueUserTeamChemistry(user: OnlineLeagueUser): TeamChemistryProfile {
  return (
    user.teamChemistryProfile ??
    createDefaultTeamChemistryProfile(
      user.teamId,
      user.jobSecurity?.lastUpdatedWeek ?? 1,
      user.jobSecurity?.lastUpdatedSeason ?? 1,
    )
  );
}

function getOnlineLeagueUserChemistryHistory(user: OnlineLeagueUser) {
  return user.chemistryHistory ?? [];
}

function getOnlineLeagueUserCoachingStaff(user: OnlineLeagueUser): CoachingStaffProfile {
  return (
    user.coachingStaffProfile ??
    createDefaultCoachingStaffProfile(user.teamId, user.teamDisplayName ?? user.teamName)
  );
}

function getOnlineLeagueUserTrainingPlans(user: OnlineLeagueUser) {
  return user.weeklyTrainingPlans ?? [];
}

function getOnlineLeagueUserTrainingOutcomes(user: OnlineLeagueUser) {
  return user.trainingOutcomes ?? [];
}

function getOnlineLeagueUserContractRoster(user: OnlineLeagueUser) {
  return user.contractRoster ?? createDefaultContractRoster(user.teamId, user.teamDisplayName ?? user.teamName);
}

function validateOnlineDepthChart(
  user: OnlineLeagueUser,
  depthChart: OnlineDepthChartEntry[],
) {
  const roster = getOnlineLeagueUserContractRoster(user).filter(
    (player) => player.status === "active",
  );
  const activePlayerIds = new Set(roster.map((player) => player.playerId));
  const positions = new Set(roster.map((player) => player.position));
  const usedStarters = new Set<string>();

  return depthChart.every((entry) => {
    if (!positions.has(entry.position) || !activePlayerIds.has(entry.starterPlayerId)) {
      return false;
    }

    if (usedStarters.has(entry.starterPlayerId)) {
      return false;
    }

    usedStarters.add(entry.starterPlayerId);

    return entry.backupPlayerIds.every(
      (playerId) => playerId !== entry.starterPlayerId && activePlayerIds.has(playerId),
    );
  });
}

function getOnlineMatchResultForWeek(
  league: OnlineLeague,
  season: number,
  week: number,
) {
  return (league.matchResults ?? []).find(
    (result) => result.season === season && result.week === week,
  );
}

type OnlineWeekMatchup = {
  away: OnlineLeagueUser;
  home: OnlineLeagueUser;
  matchId: string;
};

function getOnlineWeekMatchups(
  league: OnlineLeague,
  season: number,
  week: number,
): OnlineWeekMatchup[] {
  const activeUsers = league.users.filter(isOnlineLeagueUserActiveWeekParticipant);
  const usersByTeamId = new Map(activeUsers.map((user) => [user.teamId, user]));
  const scheduledMatches = (league.schedule ?? []).filter((match) => match.week === week);

  if (scheduledMatches.length > 0) {
    const matchups = scheduledMatches
      .map((match) => {
        const home =
          usersByTeamId.get(match.homeTeamName) ??
          activeUsers.find((user) => (user.teamDisplayName ?? user.teamName) === match.homeTeamName);
        const away =
          usersByTeamId.get(match.awayTeamName) ??
          activeUsers.find((user) => (user.teamDisplayName ?? user.teamName) === match.awayTeamName);

        return home && away
          ? {
              away,
              home,
              matchId: match.id,
            }
          : null;
      })
      .filter((matchup): matchup is OnlineWeekMatchup => matchup !== null);

    if (matchups.length > 0) {
      return matchups;
    }
  }

  const results: OnlineWeekMatchup[] = [];

  for (let index = 0; index < activeUsers.length; index += 2) {
    const home = activeUsers[index];
    const away = activeUsers[index + 1];

    if (!home || !away) {
      continue;
    }

    results.push({
      away,
      home,
      matchId: `${league.id}-s${season}-w${week}-${home.teamId}-${away.teamId}`,
    });
  }

  return results;
}

function createOnlineMatchResultsForWeek(
  league: OnlineLeague,
  now = new Date().toISOString(),
  simulatedByUserId = "admin",
): OnlineMatchResult[] {
  const season = normalizeSeasonNumber(league.currentSeason ?? Math.ceil(league.currentWeek / 18));
  const results: OnlineMatchResult[] = [];

  for (const matchup of getOnlineWeekMatchups(league, season, league.currentWeek)) {
    const simulated = simulateOnlineGame(
      {
        awayTeamId: matchup.away.teamId,
        awayTeamName: matchup.away.teamDisplayName ?? matchup.away.teamName,
        homeTeamId: matchup.home.teamId,
        homeTeamName: matchup.home.teamDisplayName ?? matchup.home.teamName,
        id: matchup.matchId,
        season,
        week: league.currentWeek,
      },
      league,
      {
        simulatedAt: now,
        simulatedByUserId,
      },
    );

    if (simulated.ok) {
      results.push(simulated.result);
    }
  }

  return results;
}

function createCompletedOnlineWeek(input: {
  completedAt: string;
  nextSeason: number;
  nextWeek: number;
  resultMatchIds: string[];
  season: number;
  simulatedByUserId: string;
  week: number;
}): OnlineCompletedWeek {
  return {
    weekKey: `s${input.season}-w${input.week}`,
    season: input.season,
    week: input.week,
    status: "completed",
    resultMatchIds: input.resultMatchIds,
    completedAt: input.completedAt,
    simulatedByUserId: input.simulatedByUserId,
    nextSeason: input.nextSeason,
    nextWeek: input.nextWeek,
  };
}

function getOnlineLeagueUserDraftPicks(user: OnlineLeagueUser) {
  return user.draftPicks ?? createDefaultDraftPicks(user.teamId, getTrainingSeason(user));
}

function getOnlineLeagueUserSalaryCap(user: OnlineLeagueUser) {
  return (
    user.salaryCap ??
    calculateSalaryCap(getOnlineLeagueUserContractRoster(user), DEFAULT_ONLINE_SALARY_CAP_LIMIT)
  );
}

export function getOnlineLeagueProspectsForDisplay(league: OnlineLeague): Prospect[] {
  return (league.prospects ?? createDefaultProspects()).map(normalizeProspect);
}

export function getOnlineLeagueDraftOrderForDisplay(league: OnlineLeague): DraftOrder {
  return normalizeDraftOrder(league.draftOrder ?? createDraftOrder(league));
}

export function getAvailableOnlineCoaches(league: OnlineLeague): Coach[] {
  return (league.availableCoaches ?? createDefaultAvailableCoaches()).map(normalizeCoach);
}

function normalizeOnlineLeague(league: StoredOnlineLeague): OnlineLeague {
  const currentWeek =
    typeof league.currentWeek === "number" && league.currentWeek >= 1
      ? Math.floor(league.currentWeek)
      : 1;

  return {
    ...league,
    currentWeek,
    currentSeason: normalizeSeasonNumber(league.currentSeason),
    freeAgents: (league.freeAgents ?? createDefaultFreeAgents()).map(normalizeContractPlayer),
    tradeProposals: league.tradeProposals?.filter(isTradeProposal),
    tradeHistory: league.tradeHistory?.filter(isTradeHistoryEntry),
    prospects: league.prospects?.filter(isProspect).map(normalizeProspect),
    draftOrder: league.draftOrder ? normalizeDraftOrder(league.draftOrder) : undefined,
    draftHistory: league.draftHistory?.filter(isDraftHistoryEntry),
    fantasyDraft: league.fantasyDraft
      ? normalizeFantasyDraftState(league.fantasyDraft)
      : undefined,
    fantasyDraftPlayerPool: league.fantasyDraftPlayerPool?.map(normalizeContractPlayer),
    availableCoaches: league.availableCoaches?.filter(isCoach).map(normalizeCoach),
    coachHistory: league.coachHistory?.filter(isCoachTransactionHistoryEntry),
    leagueSettings: normalizeLeagueSettings(league.leagueSettings),
    weekStatus: league.weekStatus ?? "pre_week",
    matchResults: (league.matchResults ?? []).filter(isOnlineMatchResult),
    completedWeeks: (league.completedWeeks ?? []).filter(isOnlineCompletedWeek),
    users: league.users.map((user) => normalizeOnlineLeagueUser(user, currentWeek)),
  };
}

export function validateOnlineLeagueState(
  league: OnlineLeague,
): OnlineLeagueStateValidationResult {
  const issues: OnlineLeagueStateValidationIssue[] = [];
  const seenUserIds = new Set<string>();
  const seenAssignedTeamIds = new Set<string>();
  const activeUsers = league.users.filter((user) => user.teamStatus !== "vacant");

  if (!league.id.trim()) {
    issues.push({
      code: "missing-id",
      severity: "error",
      message: "Liga hat keine gültige ID.",
    });
  }

  if (league.status !== "waiting" && league.status !== "active") {
    issues.push({
      code: "invalid-status",
      severity: "error",
      message: "Liga hat keinen gültigen Status.",
    });
  }

  if (!Number.isFinite(league.currentWeek) || league.currentWeek < 1) {
    issues.push({
      code: "invalid-week",
      severity: "error",
      message: "Liga hat keine gültige aktuelle Woche.",
    });
  }

  if (league.currentSeason !== undefined && (!Number.isFinite(league.currentSeason) || league.currentSeason < 1)) {
    issues.push({
      code: "invalid-season",
      severity: "error",
      message: "Liga hat keine gültige aktuelle Saison.",
    });
  }

  if (!Number.isFinite(league.maxUsers) || league.maxUsers < 1) {
    issues.push({
      code: "invalid-max-users",
      severity: "error",
      message: "Liga hat keine gültige maximale Spieleranzahl.",
    });
  }

  if (activeUsers.length > league.maxUsers) {
    issues.push({
      code: "over-capacity",
      severity: "error",
      message: "Liga hat mehr aktive Mitglieder als erlaubte Slots.",
    });
  }

  for (const user of league.users) {
    if (seenUserIds.has(user.userId)) {
      issues.push({
        code: "duplicate-user",
        severity: "error",
        message: `User ${user.userId} ist mehrfach Mitglied derselben Liga.`,
      });
    }
    seenUserIds.add(user.userId);

    if (!user.teamId || !user.teamName) {
      issues.push({
        code: "missing-team-assignment",
        severity: "error",
        message: `User ${user.username} hat keine vollständige Team-Zuweisung.`,
      });
    }

    if (user.teamStatus === "vacant" && user.readyForWeek) {
      issues.push({
        code: "ready-vacant-member",
        severity: "warning",
        message: `Vakantes Team ${user.teamDisplayName ?? user.teamName} ist noch ready markiert.`,
      });
    }

    if (user.teamStatus !== "vacant") {
      const assignmentKey = user.teamId;

      if (seenAssignedTeamIds.has(assignmentKey)) {
        issues.push({
          code: "duplicate-team",
          severity: "error",
          message: `Team ${user.teamDisplayName ?? user.teamName} ist mehrfach vergeben.`,
        });
      }
      seenAssignedTeamIds.add(assignmentKey);
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}

export function repairOnlineLeagueState(league: OnlineLeague): OnlineLeagueStateRepairResult {
  const before = validateOnlineLeagueState(league);
  const seenUserIds = new Set<string>();
  let repaired = false;

  const repairedUsers = league.users
    .filter((user) => {
      if (seenUserIds.has(user.userId)) {
        repaired = true;
        return false;
      }

      seenUserIds.add(user.userId);
      return true;
    })
    .map((user) => {
      if (user.teamStatus === "vacant" && user.readyForWeek) {
        repaired = true;
        return resetReadyState(user);
      }

      return user;
    });

  const safeLeague: OnlineLeague = {
    ...league,
    currentWeek:
      Number.isFinite(league.currentWeek) && league.currentWeek >= 1
        ? Math.floor(league.currentWeek)
        : 1,
    currentSeason:
      league.currentSeason === undefined
        ? league.currentSeason
        : normalizeSeasonNumber(league.currentSeason),
    maxUsers: normalizeMaxUsers(league.maxUsers),
    weekStatus: isOnlineWeekFlowStatus(league.weekStatus) ? league.weekStatus : "pre_week",
    users: repairedUsers,
  };

  if (
    safeLeague.currentWeek !== league.currentWeek ||
    safeLeague.currentSeason !== league.currentSeason ||
    safeLeague.maxUsers !== league.maxUsers ||
    safeLeague.weekStatus !== league.weekStatus
  ) {
    repaired = true;
  }

  return {
    league: safeLeague,
    repaired,
    issues: before.issues,
  };
}

function normalizeSeasonNumber(season: number | undefined) {
  if (typeof season !== "number" || !Number.isFinite(season)) {
    return 1;
  }

  return Math.max(Math.floor(season), 1);
}

function createLeagueLogEntry(message: string): OnlineLeagueLogEntry {
  const createdAt = new Date().toISOString();

  return {
    id: createSeededId("log", `league-log:${createdAt}:${message}`, 12),
    message,
    createdAt,
  };
}

function createLeagueEvent(input: Omit<OnlineLeagueEvent, "id" | "createdAt">): OnlineLeagueEvent {
  const createdAt = new Date().toISOString();

  return {
    ...input,
    id: createSeededId(
      "event",
      `league-event:${createdAt}:${input.eventType}:${input.leagueId}:${input.teamId}:${input.userId}`,
      12,
    ),
    createdAt,
  };
}

function resetReadyState(user: OnlineLeagueUser): OnlineLeagueUser {
  const userWithoutReadyAt = { ...user };
  delete userWithoutReadyAt.readyAt;

  return {
    ...userWithoutReadyAt,
    readyForWeek: false,
  };
}

function readOnlineLeagues(storage: OnlineLeagueStorage): OnlineLeague[] {
  return readStoredOnlineLeagueCollection(storage)
    .filter(isStoredOnlineLeague)
    .map(normalizeOnlineLeague)
    .map((league) => repairOnlineLeagueState(league).league);
}

function saveOnlineLeagues(
  leagues: OnlineLeague[],
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
) {
  saveOnlineLeagueCollection(leagues, storage);
}

export function saveOnlineLeague(
  league: OnlineLeague,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague {
  const repairedLeague = repairOnlineLeagueState(league).league;
  const existingLeagues = readOnlineLeagues(storage);
  const nextLeagues = [
    repairedLeague,
    ...existingLeagues.filter((existingLeague) => existingLeague.id !== repairedLeague.id),
  ];

  saveOnlineLeagues(nextLeagues, storage);

  return repairedLeague;
}

export function getOnlineLeagues(
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague[] {
  return readOnlineLeagues(storage);
}

export function createOnlineLeague(
  input: CreateOnlineLeagueInput,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague {
  const existingLeagues = readOnlineLeagues(storage);
  const name = input.name.trim() || "Neue Online Liga";
  const maxUsers = normalizeMaxUsers(input.maxUsers);
  const leagueId = createUserFacingLeagueId(name, existingLeagues);
  const teams = ONLINE_MVP_TEAM_POOL.slice(0, maxUsers);
  const league: OnlineLeague = {
    id: leagueId,
    name,
    users: [],
    teams,
    schedule: createScheduleForTeamPool(leagueId, teams),
    freeAgents: createDefaultFreeAgents(),
    fantasyDraft: createInitialFantasyDraftState(leagueId, maxUsers),
    fantasyDraftPlayerPool: createFantasyDraftPlayerPool(leagueId, maxUsers),
    leagueSettings: createDefaultLeagueSettings(),
    weekStatus: "pre_week",
    matchResults: [],
    completedWeeks: [],
    currentWeek: normalizeStartWeek(input.startWeek),
    currentSeason: 1,
    maxUsers,
    status: "waiting",
  };

  return saveOnlineLeague(league, storage);
}

export function getOnlineLeagueById(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = readOnlineLeagues(storage).find(
    (candidate) => candidate.id === leagueId,
  );

  return league ?? null;
}

export function deleteOnlineLeague(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague[] {
  const nextLeagues = readOnlineLeagues(storage).filter((league) => league.id !== leagueId);

  saveOnlineLeagues(nextLeagues, storage);

  clearStoredLastOnlineLeagueId(storage, leagueId);

  return nextLeagues;
}

export function resetOnlineLeague(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league =
    getOnlineLeagueById(leagueId, storage) ??
    (leagueId === GLOBAL_TEST_LEAGUE_ID ? getOrCreateGlobalTestLeague(storage) : null);

  if (!league) {
    return null;
  }

  const resetLeague = saveOnlineLeague(
    {
      ...league,
      users: [],
      currentWeek: 1,
      currentSeason: 1,
      weekStatus: "pre_week",
      lastSimulatedWeekKey: undefined,
      schedule: createScheduleForTeamPool(league.id, league.teams),
      matchResults: [],
      completedWeeks: [],
      fantasyDraft: createInitialFantasyDraftState(league.id, league.maxUsers),
      fantasyDraftPlayerPool: createFantasyDraftPlayerPool(league.id, league.maxUsers),
      status: "waiting",
    },
    storage,
  );

  clearStoredLastOnlineLeagueId(storage, leagueId);

  return resetLeague;
}

export function getOrCreateGlobalTestLeague(
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague {
  const existingLeague = getOnlineLeagueById(GLOBAL_TEST_LEAGUE_ID, storage);

  if (existingLeague) {
    saveOnlineLeagues(
      [
        existingLeague,
        ...readOnlineLeagues(storage).filter(
          (league) => league.id !== GLOBAL_TEST_LEAGUE_ID,
        ),
      ],
      storage,
    );
    return existingLeague;
  }

  return saveOnlineLeague(createGlobalTestLeague(), storage);
}

export function getAvailableOnlineLeagues(
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague[] {
  getOrCreateGlobalTestLeague(storage);

  return readOnlineLeagues(storage);
}

export function resetOnlineLeagues(storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage()) {
  removeStoredOnlineLeagueCollection(storage);
  clearStoredLastOnlineLeagueId(storage);
}

export function getLastOnlineLeagueId(
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): string | null {
  return getStoredLastOnlineLeagueId(storage);
}

function getFreeTeam(league: OnlineLeague): OnlineLeagueTeam | null {
  const assignedTeamIds = new Set(league.users.map((user) => user.teamId));

  return league.teams.find((team) => !assignedTeamIds.has(team.id)) ?? null;
}

function getFantasyDraftState(league: OnlineLeague): OnlineFantasyDraftState {
  return normalizeFantasyDraftState(
    league.fantasyDraft ?? createInitialFantasyDraftState(league.id, league.maxUsers),
  );
}

function getFantasyDraftPlayerPool(league: OnlineLeague): OnlineContractPlayer[] {
  return (league.fantasyDraftPlayerPool ?? createFantasyDraftPlayerPool(league.id, league.maxUsers))
    .map(normalizeContractPlayer);
}

function getOnlineFantasyDraftEligibleUsers(league: OnlineLeague) {
  return league.users.filter((user) => user.teamStatus !== "vacant");
}

function getOnlineFantasyDraftOrder(league: OnlineLeague) {
  const users = getOnlineFantasyDraftEligibleUsers(league);

  return users.map((user) => user.teamId);
}

function finalizeFantasyDraftLeague(
  league: OnlineLeague,
  state: OnlineFantasyDraftState,
  playerPool: OnlineContractPlayer[],
  now: string,
): OnlineLeague {
  const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
  const picksByTeamId = state.picks.reduce((map, pick) => {
    map.set(pick.teamId, [...(map.get(pick.teamId) ?? []), pick]);
    return map;
  }, new Map<string, OnlineFantasyDraftPick[]>());

  return appendLeagueAudit(
    {
      ...league,
      currentWeek: 1,
      status: "active",
      weekStatus: "ready",
      fantasyDraft: {
        ...state,
        status: "completed",
        currentTeamId: "",
        completedAt: state.completedAt ?? now,
      },
      users: league.users.map((user) => {
        const roster = (picksByTeamId.get(user.teamId) ?? [])
          .map((pick) => playersById.get(pick.playerId))
          .filter((player): player is OnlineContractPlayer => Boolean(player))
          .map((player) => ({ ...player, status: "active" as const }));

        if (roster.length === 0) {
          return user;
        }

        return getRecalculatedCapUser(
          {
            ...user,
            readyForWeek: false,
          },
          roster,
        );
      }),
    },
    createLeagueEvent({
      eventType: "draft_pick_made",
      leagueId: league.id,
      teamId: "league",
      userId: "system",
      reason: "Fantasy Draft completed. League moved to Week 1 ready phase.",
      season: 1,
      week: 1,
    }),
    "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1.",
  );
}

export function startOnlineFantasyDraft(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const existingState = getFantasyDraftState(league);

  if (existingState.status === "completed") {
    return saveOnlineLeague(
      {
        ...league,
        status: "active",
        weekStatus: "ready",
        currentWeek: 1,
      },
      storage,
    );
  }

  if (existingState.status === "active") {
    return league;
  }

  const draftOrder = getOnlineFantasyDraftOrder(league);
  const now = new Date().toISOString();
  const playerPool = getFantasyDraftPlayerPool(league);
  const state: OnlineFantasyDraftState = {
    ...existingState,
    status: "active",
    draftOrder,
    round: 1,
    pickNumber: 1,
    currentTeamId: draftOrder[0] ?? "",
    picks: [],
    availablePlayerIds: playerPool.map((player) => player.playerId),
    startedAt: now,
    completedAt: null,
  };

  return saveOnlineLeague(
    appendLeagueAudit(
      {
        ...league,
        fantasyDraft: state,
        fantasyDraftPlayerPool: playerPool,
        status: "waiting",
        weekStatus: "pre_week",
      },
      createLeagueEvent({
        eventType: "draft_pick_made",
        leagueId: league.id,
        teamId: state.currentTeamId || "league",
        userId: "system",
        reason: "Fantasy Draft started.",
        season: 1,
        week: 1,
      }),
      "Fantasy Draft gestartet.",
    ),
    storage,
  );
}

export type OnlineFantasyDraftPickResult =
  | {
      status: "success" | "completed";
      league: OnlineLeague;
      pick: OnlineFantasyDraftPick;
      message: string;
    }
  | {
      status:
        | "missing-league"
        | "missing-user"
        | "draft-not-active"
        | "wrong-team"
        | "player-unavailable"
        | "blocked";
      league: OnlineLeague | null;
      message: string;
    };

export function makeOnlineFantasyDraftPick(
  leagueId: string,
  teamId: string,
  playerId: string,
  pickedByUserId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineFantasyDraftPickResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return {
      status: "missing-league",
      league: null,
      message: "Liga konnte nicht gefunden werden.",
    };
  }

  const state = getFantasyDraftState(league);

  if (state.status !== "active") {
    return {
      status: "draft-not-active",
      league,
      message: "Fantasy Draft ist nicht aktiv.",
    };
  }

  const user = league.users.find(
    (candidate) => candidate.userId === pickedByUserId && candidate.teamId === teamId,
  );

  if (!user) {
    return {
      status: "missing-user",
      league,
      message: "GM gehoert nicht zu diesem Team.",
    };
  }

  if (state.currentTeamId !== teamId) {
    return {
      status: "wrong-team",
      league,
      message: "Dieses Team ist aktuell nicht am Zug.",
    };
  }

  if (!state.availablePlayerIds.includes(playerId) || state.picks.some((pick) => pick.playerId === playerId)) {
    return {
      status: "player-unavailable",
      league,
      message: "Spieler ist nicht mehr verfuegbar.",
    };
  }

  const playerPool = getFantasyDraftPlayerPool(league);
  const selectedPlayer = playerPool.find((player) => player.playerId === playerId);

  if (!selectedPlayer) {
    return {
      status: "player-unavailable",
      league,
      message: "Spieler ist nicht im Draft-Pool.",
    };
  }

  const now = new Date().toISOString();
  const pick: OnlineFantasyDraftPick = {
    pickNumber: state.pickNumber,
    round: state.round,
    teamId,
    playerId,
    pickedByUserId,
    timestamp: now,
  };
  const pickedState: OnlineFantasyDraftState = {
    ...state,
    picks: [...state.picks, pick],
    availablePlayerIds: state.availablePlayerIds.filter((candidate) => candidate !== playerId),
  };
  const nextState = getNextFantasyDraftStateAfterPick(pickedState, playerPool, now);
  const baseLeague = appendLeagueAudit(
    {
      ...league,
      fantasyDraft: nextState,
      fantasyDraftPlayerPool: playerPool,
    },
    createLeagueEvent({
      eventType: "draft_pick_made",
      leagueId: league.id,
      teamId,
      userId: pickedByUserId,
      reason: `${user.teamDisplayName ?? user.teamName} picked ${selectedPlayer.playerName}.`,
      season: 1,
      week: 1,
    }),
    `Fantasy Draft Pick ${pick.pickNumber}: ${user.teamDisplayName ?? user.teamName} waehlt ${selectedPlayer.playerName}.`,
  );
  const nextLeague =
    nextState.status === "completed"
      ? finalizeFantasyDraftLeague(baseLeague, nextState, playerPool, now)
      : baseLeague;
  const savedLeague = saveOnlineLeague(nextLeague, storage);

  return {
    status: nextState.status === "completed" ? "completed" : "success",
    league: savedLeague,
    pick,
    message:
      nextState.status === "completed"
        ? "Fantasy Draft abgeschlossen. Liga ist bereit fuer Week 1."
        : "Pick gespeichert.",
  };
}

export type OnlineFantasyDraftAvailablePlayerFilters = {
  position?: OnlineFantasyDraftPosition | OnlineFantasyDraftPosition[];
  search?: string;
  minOverall?: number;
  maxOverall?: number;
  limit?: number;
  sortBy?: "overall" | "age" | "position" | "playerName";
  sortDirection?: "asc" | "desc";
};

export function getOnlineFantasyDraftState(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineFantasyDraftState | null {
  const league = getOnlineLeagueById(leagueId, storage);

  return league ? getFantasyDraftState(league) : null;
}

export function getOnlineFantasyDraftAvailablePlayers(
  leagueId: string,
  filters: OnlineFantasyDraftAvailablePlayerFilters = {},
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineContractPlayer[] {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return [];
  }

  const state = getFantasyDraftState(league);
  const availableIds = new Set(state.availablePlayerIds);
  const positions = filters.position
    ? new Set(Array.isArray(filters.position) ? filters.position : [filters.position])
    : null;
  const search = filters.search?.trim().toLowerCase() ?? "";
  const minOverall = typeof filters.minOverall === "number" ? filters.minOverall : -Infinity;
  const maxOverall = typeof filters.maxOverall === "number" ? filters.maxOverall : Infinity;
  const sortBy = filters.sortBy ?? "overall";
  const sortDirection = filters.sortDirection ?? "desc";
  const direction = sortDirection === "asc" ? 1 : -1;
  const players = getFantasyDraftPlayerPool(league)
    .filter((player) => availableIds.has(player.playerId))
    .filter((player) => !positions || positions.has(player.position as OnlineFantasyDraftPosition))
    .filter((player) => !search || player.playerName.toLowerCase().includes(search))
    .filter((player) => player.overall >= minOverall && player.overall <= maxOverall)
    .sort((left, right) => {
      if (sortBy === "age") {
        return (left.age - right.age) * direction || right.overall - left.overall;
      }

      if (sortBy === "position") {
        return left.position.localeCompare(right.position) * direction || right.overall - left.overall;
      }

      if (sortBy === "playerName") {
        return left.playerName.localeCompare(right.playerName) * direction || right.overall - left.overall;
      }

      return (left.overall - right.overall) * direction || left.playerName.localeCompare(right.playerName);
    });

  return typeof filters.limit === "number" && filters.limit >= 0
    ? players.slice(0, Math.floor(filters.limit))
    : players;
}

export function advanceOnlineFantasyDraftPick(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const state = getFantasyDraftState(league);

  if (state.status !== "active") {
    return league;
  }

  const playerPool = getFantasyDraftPlayerPool(league);
  const nextState = getNextFantasyDraftStateAfterPick(
    state,
    playerPool,
    new Date().toISOString(),
  );

  return saveOnlineLeague(
    {
      ...league,
      fantasyDraft: nextState,
      fantasyDraftPlayerPool: playerPool,
    },
    storage,
  );
}

export function buildOnlineFantasyDraftRosters(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const state = getFantasyDraftState(league);
  const playerPool = getFantasyDraftPlayerPool(league);

  if (!isOnlineFantasyDraftComplete(state, playerPool)) {
    return league;
  }

  const completedAt = state.completedAt ?? new Date().toISOString();
  const completedState: OnlineFantasyDraftState = {
    ...state,
    status: "completed",
    currentTeamId: "",
    completedAt,
  };

  return saveOnlineLeague(
    finalizeFantasyDraftLeague(league, completedState, playerPool, completedAt),
    storage,
  );
}

export function completeOnlineFantasyDraftIfReady(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  return buildOnlineFantasyDraftRosters(leagueId, storage);
}

function appendLeagueAudit(
  league: OnlineLeague,
  event: OnlineLeagueEvent,
  logMessage: string,
): OnlineLeague {
  return {
    ...league,
    events: [event, ...(league.events ?? [])],
    logs: [createLeagueLogEntry(logMessage), ...(league.logs ?? [])],
  };
}

function getExpectedWins(result: OnlineGmSeasonResult) {
  if (typeof result.expectedWins === "number") {
    return result.expectedWins;
  }

  switch (result.expectation ?? "competitive") {
    case "rebuild":
      return 5;
    case "competitive":
      return 8;
    case "playoffs":
      return 10;
    case "championship":
      return 12;
  }
}

function getExpectationResult(
  result: OnlineGmSeasonResult,
): OnlineGmExpectationResult {
  const expectedWins = getExpectedWins(result);
  const winDelta = result.wins - expectedWins;

  if (winDelta >= 3 || result.championshipWon) {
    return "exceeded";
  }

  if (winDelta >= -1 || (result.playoffAppearance && expectedWins >= 10)) {
    return "met";
  }

  if (winDelta >= -3) {
    return "below";
  }

  return "failed";
}

function getJobSecurityStatus(score: number): GmJobSecurityStatus {
  if (score >= 85) {
    return "secure";
  }

  if (score >= 65) {
    return "stable";
  }

  if (score >= 45) {
    return "under_pressure";
  }

  if (score >= 30) {
    return "hot_seat";
  }

  return "termination_risk";
}

function getConsecutiveBadSeasons(history: OnlineGmPerformanceHistoryEntry[]) {
  let badSeasons = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];

    if (
      entry.expectationResult === "below" ||
      entry.expectationResult === "failed"
    ) {
      badSeasons += 1;
      continue;
    }

    break;
  }

  return badSeasons;
}

function calculateOwnerConfidenceDelta(
  owner: OwnershipProfile,
  result: OnlineGmSeasonResult,
  expectationResult: OnlineGmExpectationResult,
) {
  const expectedWins = getExpectedWins(result);
  const winDelta = result.wins - expectedWins;
  let delta = winDelta * 4;

  if (result.playoffAppearance) {
    delta += 6;
  }

  delta += (result.playoffWins ?? 0) * 3;

  if (result.championshipWon) {
    delta += 14;
  }

  if ((result.losingStreak ?? 0) >= 4) {
    delta -= (result.losingStreak ?? 0) + Math.round(owner.mediaSensitivity / 18);
  }

  delta -= (result.rivalryLosses ?? 0) * Math.max(1, Math.round(owner.mediaSensitivity / 35));

  if (typeof result.capHealth === "number" && result.capHealth < 45) {
    delta -= Math.round((45 - result.capHealth) / 5) + Math.round(owner.financialPressure / 25);
  }

  if (expectationResult === "below" || expectationResult === "failed") {
    delta -= Math.round((100 - owner.patience) / 10);
    delta -= Math.round(owner.ambition / 20);

    if ((result.expectation ?? "competitive") === "rebuild") {
      delta += Math.round(owner.rebuildTolerance / 8);
    }
  }

  if (expectationResult === "exceeded") {
    delta += Math.round(owner.loyalty / 12);
  }

  return Math.round(delta);
}

function applyOwnerTerminationRules(
  owner: OwnershipProfile,
  jobSecurity: GmJobSecurityScore,
): GmJobSecurityScore {
  const history = jobSecurity.gmPerformanceHistory;
  const badSeasons = getConsecutiveBadSeasons(history);
  const isWinNowOwner = owner.ambition >= 80 && owner.patience <= 40;
  const isPatientOwner = owner.patience >= 70 || owner.rebuildTolerance >= 70;
  let status = getJobSecurityStatus(jobSecurity.score);

  if (jobSecurity.score < 20 && history.length >= 1) {
    status = "termination_risk";
  }

  if (jobSecurity.score < 15 && badSeasons >= (isPatientOwner ? 3 : 2)) {
    status = "fired";
  }

  if (jobSecurity.score < 10 && isWinNowOwner && badSeasons >= 2) {
    status = "fired";
  }

  return {
    ...jobSecurity,
    status,
  };
}

function getInactiveStatus(
  missedWeeklyActions: number,
  rules: OnlineGmActivityRules,
): OnlineGmInactiveStatus {
  if (missedWeeklyActions >= rules.removalEligibleAfterMissedWeeks) {
    return "removal_eligible";
  }

  if (missedWeeklyActions >= rules.inactiveAfterMissedWeeks) {
    return "inactive";
  }

  if (missedWeeklyActions >= rules.warningAfterMissedWeeks) {
    return "warning";
  }

  return "active";
}

function calculateJobSecurityInactivityPenalty(
  activity: OnlineGmActivityMetrics,
  rules: OnlineGmActivityRules,
) {
  if (activity.missedWeeklyActions <= 0) {
    return 0;
  }

  const missedWeekPenalty = activity.missedWeeklyActions * 8;
  const lineupPenalty = activity.missedLineupSubmissions * 4;
  const statusPenalty =
    activity.inactiveStatus === "removal_eligible"
      ? 10
      : activity.inactiveStatus === "inactive"
        ? 6
        : activity.inactiveStatus === "warning"
          ? 2
          : 0;
  const rulesPressure =
    activity.missedWeeklyActions >= rules.removalEligibleAfterMissedWeeks ? 4 : 0;

  return -Math.min(30, missedWeekPenalty + lineupPenalty + statusPenalty + rulesPressure);
}

export function getFanMoodTier(fanMood: number): FanMoodTier {
  const mood = clampScore(fanMood);

  if (mood >= 90) {
    return "ecstatic";
  }
  if (mood >= 75) {
    return "excited";
  }
  if (mood >= 60) {
    return "positive";
  }
  if (mood >= 45) {
    return "neutral";
  }
  if (mood >= 30) {
    return "frustrated";
  }
  if (mood >= 15) {
    return "angry";
  }

  return "hostile";
}

function getPlayerSatisfactionDeltaFromChemistry(
  chemistry: TeamChemistryProfile,
  trainingOutcome?: TrainingOutcome,
) {
  const chemistryMood = chemistry.score >= 75 ? 1 : chemistry.score <= 35 ? -2 : 0;
  const trainingMood =
    trainingOutcome && trainingOutcome.fatigueDelta > 4
      ? -1
      : trainingOutcome && trainingOutcome.developmentDeltaSummary > 0.5
        ? 1
        : 0;

  return chemistryMood + trainingMood;
}

function updateTeamChemistryProfile(
  user: OnlineLeagueUser,
  input: {
    season: number;
    week: number;
    source: TeamChemistryHistoryEntry["source"];
    delta: number;
    reason: string;
    playerSatisfactionDelta?: number;
    createdAt?: string;
  },
) {
  const now = input.createdAt ?? new Date().toISOString();
  const previousProfile = getOnlineLeagueUserTeamChemistry(user);
  const playerSatisfaction = clampScore(
    previousProfile.playerSatisfaction + (input.playerSatisfactionDelta ?? 0),
  );
  const satisfactionEffect = (playerSatisfaction - previousProfile.playerSatisfaction) * 0.35;
  const rawDelta = input.delta + satisfactionEffect;
  const roundedDelta = Math.round(rawDelta);
  const newScore = clampScore(previousProfile.score + roundedDelta);
  const nextProfile: TeamChemistryProfile = {
    teamId: user.teamId,
    score: newScore,
    playerSatisfaction,
    gameplayModifier: calculateTeamChemistryGameplayModifier(newScore),
    recentTrend: Math.max(-25, Math.min(25, previousProfile.recentTrend + roundedDelta)),
    lastUpdatedSeason: normalizeSeasonNumber(input.season),
    lastUpdatedWeek: Math.max(1, Math.floor(input.week)),
    updatedAt: now,
  };
  const historyEntry: TeamChemistryHistoryEntry = {
    teamId: user.teamId,
    season: normalizeSeasonNumber(input.season),
    week: Math.max(1, Math.floor(input.week)),
    source: input.source,
    previousScore: previousProfile.score,
    newScore,
    delta: newScore - previousProfile.score,
    reason: input.reason,
    createdAt: now,
  };

  return {
    profile: nextProfile,
    historyEntry,
  };
}

function getChemistryFanMoodModifier(chemistry: TeamChemistryProfile) {
  if (chemistry.score >= 85) {
    return 3;
  }
  if (chemistry.score >= 72) {
    return 2;
  }
  if (chemistry.score <= 25) {
    return -4;
  }
  if (chemistry.score <= 38) {
    return -2;
  }

  return 0;
}

function calculateFanMoodAfterMatch(
  fanbase: FanbaseProfile,
  input: OnlineMatchdayInput,
  chemistry?: TeamChemistryProfile,
  stadium?: StadiumProfile,
) {
  const loyaltyBuffer = Math.round(fanbase.fanLoyalty / 25);
  const bandwagonBoost = Math.round(fanbase.bandwagonFactor / 28);
  let delta =
    typeof input.won === "boolean"
      ? input.won
        ? 4 + bandwagonBoost
        : -5 + loyaltyBuffer
      : 0;

  if ((input.winStreak ?? 0) >= 3) {
    delta += 2;
  }

  if ((input.losingStreak ?? 0) >= 3) {
    delta -= Math.max(1, 4 - loyaltyBuffer);
  }

  if (input.rivalryGame && typeof input.won === "boolean") {
    delta += input.won ? 3 : -Math.max(1, Math.round(fanbase.rivalryIntensity / 25));
  }

  if (input.playoffGame && typeof input.won === "boolean") {
    delta += input.won ? 6 : -4;
  }

  if (stadium) {
    delta -= Math.max(0, Math.round((stadium.ticketPriceLevel - 78) / 12));
    delta -= Math.max(0, Math.round((stadium.merchPriceLevel - 82) / 14));
  }

  return clampScore(fanbase.fanMood + delta + (chemistry ? getChemistryFanMoodModifier(chemistry) : 0));
}

function calculateAttendanceRate(
  stadium: StadiumProfile,
  fanbase: FanbaseProfile,
  input: OnlineMatchdayInput,
) {
  const gamesPlayed = Math.max(1, input.wins + input.losses);
  const winRate = input.wins / gamesPlayed;
  let rate =
    0.48 +
    winRate * 0.22 +
    fanbase.fanMood / 500 +
    fanbase.fanLoyalty / 650 +
    stadium.atmosphere / 700 +
    stadium.comfort / 900;

  rate -= Math.max(0, stadium.ticketPriceLevel - 55) / 450;

  if ((input.losingStreak ?? 0) >= 3) {
    rate -= Math.min(0.12, ((input.losingStreak ?? 0) - 2) * 0.025);
  }

  if ((input.winStreak ?? 0) >= 3) {
    rate += Math.min(0.08, ((input.winStreak ?? 0) - 2) * 0.02);
  }

  if (input.rivalryGame) {
    rate += 0.08;
  }

  if (input.playoffGame) {
    rate += 0.14;
  }

  rate += ((input.playoffChances ?? 35) - 35) / 1000;
  rate += ((input.homeGameAttractiveness ?? 50) - 50) / 900;

  return Math.min(1, Math.max(0.25, rate));
}

function calculateMatchResultChemistryDelta(input: OnlineMatchdayInput) {
  let delta =
    typeof input.won === "boolean" ? (input.won ? 3 : -3) : 0;

  if ((input.winStreak ?? 0) >= 3) {
    delta += 2;
  }

  if ((input.losingStreak ?? 0) >= 3) {
    delta -= 2;
  }

  if (input.rivalryGame && typeof input.won === "boolean") {
    delta += input.won ? 2 : -2;
  }

  if (input.playoffGame && typeof input.won === "boolean") {
    delta += input.won ? 3 : -2;
  }

  return delta;
}

function calculateMerchandiseFinancials(
  user: OnlineLeagueUser,
  input: OnlineMatchdayInput,
  merchandiseRevenueFromMatchday = 0,
): MerchandiseFinancials {
  const fanbase = getOnlineLeagueUserFanbase(user);
  const gamesPlayed = Math.max(1, input.wins + input.losses);
  const winRate = input.wins / gamesPlayed;
  const baseMerchRevenue = Math.round(85_000 + fanbase.marketSize * 3_800);
  const performanceMultiplier = Math.max(0.65, 0.75 + winRate * 0.65);
  const fanMoodMultiplier = Math.max(0.55, 0.7 + fanbase.fanMood / 125);
  const marketSizeMultiplier = Math.max(0.75, 0.8 + fanbase.marketSize / 180);
  const playoffMultiplier = input.playoffGame ? 1.6 : input.playoffChances && input.playoffChances > 75 ? 1.18 : 1;

  return {
    teamId: user.teamId,
    season: input.season,
    week: input.week,
    baseMerchRevenue,
    performanceMultiplier,
    fanMoodMultiplier,
    marketSizeMultiplier,
    playoffMultiplier,
    totalMerchRevenue: Math.max(
      0,
      Math.round(
        baseMerchRevenue *
          performanceMultiplier *
          fanMoodMultiplier *
          marketSizeMultiplier *
          playoffMultiplier +
          merchandiseRevenueFromMatchday,
      ),
    ),
  };
}

function getMediaExpectationPressureForResult(
  mediaExpectation: OnlineMediaExpectationProfile,
  seasonResult: OnlineGmSeasonResult,
) {
  const goal = mediaExpectation.goal;
  const gamesPlayed = Math.max(1, seasonResult.wins + seasonResult.losses + (seasonResult.ties ?? 0));
  const winRate = seasonResult.wins / gamesPlayed;
  const missedPlayoffs = !seasonResult.playoffAppearance;

  if (goal === "rebuild") {
    if (winRate <= 0.45) {
      return mediaExpectation.fanPressureModifier;
    }

    return Math.max(-2, Math.round(mediaExpectation.fanPressureModifier / 2));
  }

  if (goal === "playoffs") {
    return missedPlayoffs
      ? mediaExpectation.fanPressureModifier + 8
      : -Math.round(mediaExpectation.fanPressureModifier / 2);
  }

  if (seasonResult.championshipWon) {
    return -Math.round(mediaExpectation.fanPressureModifier * 0.75);
  }

  return mediaExpectation.fanPressureModifier + ((seasonResult.playoffWins ?? 0) < 2 ? 12 : 4);
}

function getMediaExpectationOwnerModifier(
  mediaExpectation: OnlineMediaExpectationProfile | undefined,
  expectationResult: OnlineGmExpectationResult,
) {
  if (!mediaExpectation) {
    return 0;
  }

  if (mediaExpectation.goal === "rebuild") {
    return expectationResult === "failed"
      ? Math.abs(mediaExpectation.ownerPressureModifier)
      : Math.round(Math.abs(mediaExpectation.ownerPressureModifier) / 2);
  }

  if (expectationResult === "below" || expectationResult === "failed") {
    return -Math.abs(mediaExpectation.ownerPressureModifier);
  }

  return Math.max(2, Math.round(mediaExpectation.ownerPressureModifier / 2));
}

function calculateFanPressure(
  user: OnlineLeagueUser,
  seasonResult?: OnlineGmSeasonResult,
): FanPressureSnapshot {
  const fanbase = getOnlineLeagueUserFanbase(user);
  const mediaExpectation = seasonResult
    ? getOnlineLeagueUserMediaExpectation(user, seasonResult.season)
    : undefined;
  const attendanceHistory = getOnlineLeagueUserAttendanceHistory(user);
  const merchHistory = getOnlineLeagueUserMerchandiseFinancials(user);
  const recentAttendances = attendanceHistory.slice(0, 3);
  const previousAttendances = attendanceHistory.slice(3, 6);
  const recentAttendanceAverage =
    recentAttendances.reduce((sum, attendance) => sum + attendance.attendanceRate, 0) /
    Math.max(1, recentAttendances.length);
  const previousAttendanceAverage =
    previousAttendances.reduce((sum, attendance) => sum + attendance.attendanceRate, 0) /
    Math.max(1, previousAttendances.length || recentAttendances.length || 1);
  const attendanceTrend = Math.round((recentAttendanceAverage - previousAttendanceAverage) * 100);
  const recentMerch = merchHistory[0]?.totalMerchRevenue ?? 0;
  const previousMerch = merchHistory[1]?.totalMerchRevenue ?? recentMerch;
  const merchandiseTrend =
    previousMerch > 0 ? Math.round(((recentMerch - previousMerch) / previousMerch) * 100) : 0;
  const expectationsVsResult = seasonResult
    ? Math.max(0, getExpectedWins(seasonResult) - seasonResult.wins) * 7
    : Math.max(0, fanbase.expectations - fanbase.fanMood) / 2;
  const mediaExpectationPressure =
    seasonResult && mediaExpectation
      ? getMediaExpectationPressureForResult(mediaExpectation, seasonResult)
      : 0;
  const rivalryFailures = (seasonResult?.rivalryLosses ?? 0) * Math.max(4, fanbase.rivalryIntensity / 15);
  const playoffDrought =
    seasonResult && !seasonResult.playoffAppearance && (seasonResult.expectation ?? "competitive") !== "rebuild"
      ? 12
      : 0;
  const franchiseStrategy = getOnlineLeagueUserFranchiseStrategy(user);
  const fanPressureScore = clampScore(
    (100 - fanbase.fanMood) * 0.45 +
      Math.max(0, -attendanceTrend) * 0.35 +
      Math.max(0, -merchandiseTrend) * 0.15 +
      fanbase.mediaPressure * 0.22 +
      expectationsVsResult +
      mediaExpectationPressure +
      rivalryFailures +
      playoffDrought -
      fanbase.fanLoyalty * 0.18 +
      franchiseStrategy.fanPressureModifier,
  );

  return {
    teamId: user.teamId,
    fanPressureScore,
    attendanceTrend,
    merchandiseTrend,
    mediaPressure: fanbase.mediaPressure,
    expectationsVsResult: Math.round(expectationsVsResult + mediaExpectationPressure),
    rivalryFailures: Math.round(rivalryFailures),
    playoffDrought,
    reasonText:
      fanPressureScore >= 70
        ? "Fans erhöhen den Druck auf den Owner deutlich."
        : fanPressureScore >= 45
          ? "Fan-Druck ist spürbar, aber noch kontrollierbar."
          : mediaExpectation && mediaExpectationPressure < 0
            ? "Realistische Teamziele stabilisieren den Fan-Druck."
            : franchiseStrategy.strategyType !== "balanced"
              ? franchiseStrategy.narrative
              : "Fan-Druck ist niedrig.",
    updatedAt: new Date().toISOString(),
  };
}

function calculateMatchdayMerchandiseRevenue(
  attendance: number,
  fanbase: FanbaseProfile,
  input: OnlineMatchdayInput,
  stadium: StadiumProfile,
) {
  const resultMultiplier = input.won ? 1.08 : 0.92;
  const playoffMultiplier = input.playoffGame ? 1.45 : 1;
  const rivalryMultiplier = input.rivalryGame ? 1.12 : 1;
  const priceMultiplier = 0.65 + stadium.merchPriceLevel / 100;
  const demandPenalty = 1 - Math.max(0, stadium.merchPriceLevel - 70) / 250;
  const spendPerFan =
    3.5 +
    fanbase.merchInterest * 0.18 +
    fanbase.fanMood * 0.08 +
    fanbase.marketSize * 0.03;

  return Math.max(
    0,
    Math.round(
      attendance *
        spendPerFan *
        priceMultiplier *
        demandPenalty *
        resultMultiplier *
        playoffMultiplier *
        rivalryMultiplier,
    ),
  );
}

function updateFinanceAfterMatchday(
  finance: FranchiseFinanceProfile,
  stadium: StadiumProfile,
  attendance: number,
  revenues: Pick<
    StadiumAttendance,
    "ticketRevenue" | "concessionsRevenue" | "parkingRevenue" | "merchandiseRevenue"
  >,
  rules: OnlineFinanceRules,
  strategy: FranchiseStrategyProfile,
  now: string,
): FranchiseFinanceProfile {
  const weeklyRevenue =
    revenues.ticketRevenue +
    revenues.concessionsRevenue +
    revenues.parkingRevenue +
    revenues.merchandiseRevenue;
  const weeklyStadiumMaintenance = Math.max(
    0,
    Math.round(stadium.capacity * (0.16 + (100 - stadium.condition) * 0.006)),
  );
  const weeklyGameDayOperations = Math.max(
    0,
    Math.round(
      attendance *
        (4.5 + stadium.comfort * 0.035) *
        (1 + strategy.financeRiskModifier),
    ),
  );
  const totalRevenue = Math.max(0, finance.totalRevenue + weeklyRevenue);
  const totalExpenses = Math.max(
    0,
    finance.totalExpenses + weeklyStadiumMaintenance + weeklyGameDayOperations,
  );
  const weeklyProfitLoss = weeklyRevenue - weeklyStadiumMaintenance - weeklyGameDayOperations;
  const cashBeforeBailout = finance.cashBalance + weeklyProfitLoss;
  const bailout =
    rules.ownerBailoutEnabled && cashBeforeBailout < rules.minCashFloor
      ? rules.minCashFloor - cashBeforeBailout
      : 0;

  return {
    ...finance,
    ticketRevenue: Math.max(0, finance.ticketRevenue + revenues.ticketRevenue),
    concessionsRevenue: Math.max(0, finance.concessionsRevenue + revenues.concessionsRevenue),
    parkingRevenue: Math.max(0, finance.parkingRevenue + revenues.parkingRevenue),
    merchandiseRevenue: Math.max(0, finance.merchandiseRevenue + revenues.merchandiseRevenue),
    totalRevenue,
    stadiumMaintenance: Math.max(0, finance.stadiumMaintenance + weeklyStadiumMaintenance),
    gameDayOperations: Math.max(0, finance.gameDayOperations + weeklyGameDayOperations),
    totalExpenses,
    weeklyProfitLoss,
    seasonProfitLoss: finance.seasonProfitLoss + weeklyProfitLoss + bailout,
    cashBalance: Math.max(rules.minCashFloor, cashBeforeBailout + bailout),
    ownerInvestment: finance.ownerInvestment + bailout,
    updatedAt: now,
  };
}

export function recordOnlineMatchdayAttendance(
  leagueId: string,
  input: OnlineMatchdayInput,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league =
    getOnlineLeagueById(leagueId, storage) ??
    (leagueId === GLOBAL_TEST_LEAGUE_ID ? getOrCreateGlobalTestLeague(storage) : null);

  if (!league) {
    return null;
  }

  const financeRules = getOnlineLeagueFinanceRules(league);

  if (!financeRules.enableStadiumFinance) {
    return league;
  }

  const leagueUser = league.users.find((user) => user.teamId === input.teamId);

  if (!leagueUser) {
    return league;
  }

  const now = new Date().toISOString();
  const baseStadium = getOnlineLeagueUserStadium(leagueUser);
  const stadium = {
    ...baseStadium,
    ticketPriceLevel: Math.min(
      baseStadium.ticketPriceLevel,
      financeRules.maxTicketPriceLevel,
    ),
    updatedAt: now,
  };
  const fanbase = getOnlineLeagueUserFanbase(leagueUser);
  const finance = getOnlineLeagueUserFinance(leagueUser);
  const attendanceRate = calculateAttendanceRate(stadium, fanbase, input);
  const attendance = Math.min(stadium.capacity, Math.round(stadium.capacity * attendanceRate));
  const ticketRevenue = Math.max(
    0,
    Math.round(attendance * (18 + stadium.ticketPriceLevel * 0.9)),
  );
  const concessionsRevenue = Math.max(
    0,
    Math.round(attendance * (8 + stadium.concessionsQuality * 0.28)),
  );
  const parkingRevenue = Math.max(
    0,
    Math.round(attendance * 0.55 * (5 + stadium.parkingRevenueLevel * 0.22)),
  );
  const merchandiseRevenue = financeRules.enableMerchRevenue
    ? calculateMatchdayMerchandiseRevenue(attendance, fanbase, input, stadium)
    : 0;
  const chemistryUpdate = updateTeamChemistryProfile(leagueUser, {
    season: input.season,
    week: input.week,
    source: "match_result",
    delta: calculateMatchResultChemistryDelta(input),
    playerSatisfactionDelta: typeof input.won === "boolean" ? (input.won ? 1 : -1) : 0,
    reason:
      typeof input.won === "boolean"
        ? input.won
          ? "Sieg stärkt Locker Room und Vertrauen."
          : "Niederlage belastet Locker Room und Zufriedenheit."
        : "Matchday ohne Ergebnis verändert Chemistry nur leicht.",
    createdAt: now,
  });
  const fanMoodAfter = calculateFanMoodAfterMatch(
    fanbase,
    input,
    chemistryUpdate.profile,
    stadium,
  );
  const attendanceRecord: StadiumAttendance = {
    matchId: input.matchId,
    teamId: input.teamId,
    season: input.season,
    week: input.week,
    attendance,
    attendanceRate,
    soldOut: attendance >= stadium.capacity,
    ticketRevenue,
    concessionsRevenue,
    parkingRevenue,
    merchandiseRevenue,
    totalMatchdayRevenue:
      ticketRevenue + concessionsRevenue + parkingRevenue + merchandiseRevenue,
    fanMoodBefore: fanbase.fanMood,
    fanMoodAfter,
  };
  const merchandiseFinancials = calculateMerchandiseFinancials(
    {
      ...leagueUser,
      fanbaseProfile: {
        ...fanbase,
        fanMood: fanMoodAfter,
        updatedAt: now,
      },
    },
    input,
    merchandiseRevenue,
  );
  const updatedFinanceProfile = updateFinanceAfterMatchday(
    finance,
    stadium,
    attendance,
    {
      ticketRevenue,
      concessionsRevenue,
      parkingRevenue,
      merchandiseRevenue,
    },
    financeRules,
    getOnlineLeagueUserFranchiseStrategy(leagueUser),
    now,
  );
  const updatedUser: OnlineLeagueUser = {
    ...leagueUser,
    stadiumProfile: stadium,
    attendanceHistory: [
      attendanceRecord,
      ...getOnlineLeagueUserAttendanceHistory(leagueUser),
    ],
    fanbaseProfile: {
      ...fanbase,
      fanMood: fanMoodAfter,
      updatedAt: now,
    },
    teamChemistryProfile: chemistryUpdate.profile,
    chemistryHistory: [
      chemistryUpdate.historyEntry,
      ...getOnlineLeagueUserChemistryHistory(leagueUser),
    ],
    merchandiseFinancials: [
      merchandiseFinancials,
      ...getOnlineLeagueUserMerchandiseFinancials(leagueUser),
    ],
    financeProfile: updatedFinanceProfile,
  };
  updatedUser.fanPressure = calculateFanPressure(updatedUser);

  let auditedLeague: OnlineLeague = {
    ...league,
    users: league.users.map((user) =>
      user.teamId === input.teamId ? updatedUser : user,
    ),
  };
  const reason = `${updatedUser.teamDisplayName ?? updatedUser.teamName}: ${attendance.toLocaleString("en-US")} Zuschauer, ${Math.round(attendanceRate * 100)}% Auslastung.`;

  auditedLeague = appendLeagueAudit(
    auditedLeague,
    createLeagueEvent({
      eventType: "stadium_attendance_updated",
      leagueId: league.id,
      teamId: updatedUser.teamId,
      userId: updatedUser.userId,
      reason,
      season: input.season,
      week: input.week,
    }),
    reason,
  );
  auditedLeague = appendLeagueAudit(
    auditedLeague,
    createLeagueEvent({
      eventType: "matchday_revenue_generated",
      leagueId: league.id,
      teamId: updatedUser.teamId,
      userId: updatedUser.userId,
      reason: `Matchday revenue generated: ${attendanceRecord.totalMatchdayRevenue}`,
      season: input.season,
      week: input.week,
    }),
    `Matchday revenue generated for ${updatedUser.teamDisplayName ?? updatedUser.teamName}: ${attendanceRecord.totalMatchdayRevenue}`,
  );

  if (financeRules.enableMerchRevenue) {
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "merchandise_revenue_generated",
        leagueId: league.id,
        teamId: updatedUser.teamId,
        userId: updatedUser.userId,
        reason: `Merch revenue generated: ${merchandiseFinancials.totalMerchRevenue}`,
        season: input.season,
        week: input.week,
      }),
      `Merchandise revenue generated for ${updatedUser.teamDisplayName ?? updatedUser.teamName}: ${merchandiseFinancials.totalMerchRevenue}`,
    );
  }

  if (fanMoodAfter !== fanbase.fanMood) {
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "fan_mood_changed",
        leagueId: league.id,
        teamId: updatedUser.teamId,
        userId: updatedUser.userId,
        reason: `Fan mood changed from ${fanbase.fanMood} to ${fanMoodAfter}.`,
        season: input.season,
        week: input.week,
        previousScore: fanbase.fanMood,
      }),
      `Fan mood changed for ${updatedUser.teamDisplayName ?? updatedUser.teamName}: ${fanbase.fanMood} -> ${fanMoodAfter}`,
    );
  }

  if (chemistryUpdate.historyEntry.delta !== 0) {
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "team_chemistry_changed",
        leagueId: league.id,
        teamId: updatedUser.teamId,
        userId: updatedUser.userId,
        reason: `${chemistryUpdate.historyEntry.reason} Chemistry ${chemistryUpdate.historyEntry.previousScore} -> ${chemistryUpdate.historyEntry.newScore}.`,
        season: input.season,
        week: input.week,
        previousScore: chemistryUpdate.historyEntry.previousScore,
      }),
      `Team chemistry changed for ${updatedUser.teamDisplayName ?? updatedUser.teamName}: ${chemistryUpdate.historyEntry.previousScore} -> ${chemistryUpdate.historyEntry.newScore}`,
    );
  }

  auditedLeague = appendLeagueAudit(
    auditedLeague,
    createLeagueEvent({
      eventType: "fan_pressure_changed",
      leagueId: league.id,
      teamId: updatedUser.teamId,
      userId: updatedUser.userId,
      reason: updatedUser.fanPressure.reasonText,
      season: input.season,
      week: input.week,
    }),
    updatedUser.fanPressure.reasonText,
  );
  auditedLeague = appendLeagueAudit(
    auditedLeague,
    createLeagueEvent({
      eventType: "franchise_finance_updated",
      leagueId: league.id,
      teamId: updatedUser.teamId,
      userId: updatedUser.userId,
      reason: `Finance updated after matchday. Cash balance: ${updatedFinanceProfile.cashBalance}`,
      season: input.season,
      week: input.week,
    }),
    `Franchise finance updated for ${updatedUser.teamDisplayName ?? updatedUser.teamName}`,
  );

  if (updatedFinanceProfile.cashBalance <= financeRules.minCashFloor) {
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "financial_warning",
        leagueId: league.id,
        teamId: updatedUser.teamId,
        userId: updatedUser.userId,
        reason: "Cash balance reached configured floor.",
        season: input.season,
        week: input.week,
      }),
      `Financial warning for ${updatedUser.teamDisplayName ?? updatedUser.teamName}`,
    );
  }

  return saveOnlineLeague(auditedLeague, storage);
}

export function setOnlineStadiumPricing(
  leagueId: string,
  userId: string,
  input: {
    ticketPriceLevel: number;
    merchPriceLevel: number;
  },
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  const now = new Date().toISOString();
  const stadium = getOnlineLeagueUserStadium(leagueUser);
  const ticketPriceLevel = clampTrait(input.ticketPriceLevel);
  const merchPriceLevel = clampTrait(input.merchPriceLevel);
  const updatedStadium: StadiumProfile = {
    ...stadium,
    ticketPriceLevel,
    merchPriceLevel,
    updatedAt: now,
  };
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              stadiumProfile: updatedStadium,
              activity: {
                ...getOnlineLeagueUserActivity(user),
                lastSeenAt: now,
                lastLeagueActionAt: now,
                missedWeeklyActions: 0,
                inactiveSinceWeek: undefined,
                inactiveStatus: "active",
              },
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "stadium_pricing_updated",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `Pricing updated: tickets ${ticketPriceLevel}, merch ${merchPriceLevel}.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Stadium pricing updated for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: tickets ${ticketPriceLevel}, merch ${merchPriceLevel}`,
  );

  return saveOnlineLeague(nextLeague, storage);
}

export function applyOnlineRevenueSharing(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const financeRules = getOnlineLeagueFinanceRules(league);

  if (!financeRules.revenueSharingEnabled || league.users.length === 0) {
    return league;
  }

  const percentage = financeRules.revenueSharingPercentage / 100;
  const contributions = new Map(
    league.users.map((user) => {
      const finance = getOnlineLeagueUserFinance(user);

      return [user.userId, Math.max(0, Math.round(finance.totalRevenue * percentage))];
    }),
  );
  const pool = Array.from(contributions.values()).reduce(
    (sum, contribution) => sum + contribution,
    0,
  );
  const share = Math.round(pool / league.users.length);
  const now = new Date().toISOString();
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) => {
        const finance = getOnlineLeagueUserFinance(user);
        const contribution = contributions.get(user.userId) ?? 0;
        const netShare = share - contribution;

        return {
          ...user,
          financeProfile: {
            ...finance,
            weeklyProfitLoss: finance.weeklyProfitLoss + netShare,
            seasonProfitLoss: finance.seasonProfitLoss + netShare,
            cashBalance: Math.max(financeRules.minCashFloor, finance.cashBalance + netShare),
            updatedAt: now,
          },
        };
      }),
    },
    createLeagueEvent({
      eventType: "franchise_finance_updated",
      leagueId: league.id,
      teamId: "league",
      userId: "admin",
      reason: `Revenue sharing applied: ${pool} pool, ${share} per franchise.`,
      season: normalizeSeasonNumber(league.currentWeek),
      week: league.currentWeek,
    }),
    `Revenue sharing applied: ${pool} pool, ${share} per franchise.`,
  );

  return saveOnlineLeague(nextLeague, storage);
}

function getCapSpace(cap: SalaryCap) {
  return cap.availableCap;
}

function getStrategyCapLimit(cap: SalaryCap, strategy: FranchiseStrategyProfile) {
  return strategy.strategyType === "win_now" && strategy.financialRiskTolerance >= 80
    ? cap.softBufferLimit
    : cap.capLimit;
}

function hasStrategyCapSpace(cap: SalaryCap, strategy: FranchiseStrategyProfile) {
  return cap.currentCapUsage <= getStrategyCapLimit(cap, strategy);
}

function getStrategyContractBlockReason(
  strategy: FranchiseStrategyProfile,
  player: OnlineContractPlayer,
  contract: PlayerContract,
) {
  if (
    strategy.strategyType === "rebuild" &&
    (contract.contractType === "star" || player.age >= 30) &&
    player.potential < 95
  ) {
    return "Signing blockiert: Rebuild-Strategie priorisiert junge Assets statt teurer Kurzzeitlösungen.";
  }

  if (
    strategy.strategyType === "youth_focus" &&
    (player.age > 27 || contract.contractType === "star") &&
    player.potential < 95
  ) {
    return "Signing blockiert: Youth Focus erlaubt nur junge Kernspieler oder außergewöhnliches Potenzial.";
  }

  return null;
}

function getXFactorTriggerResult(
  player: OnlineContractPlayer,
  xFactor: OnlinePlayerXFactor,
  context: OnlineXFactorPlayContext,
): OnlineXFactorTriggerResult {
  const closeLateGame = context.quarter >= 4 && Math.abs(context.scoreDifferential) <= 8;
  const longSpacePlay =
    context.playType === "return" ||
    (context.yardsToGo >= 7 && context.fieldZone !== "red_zone");
  const highLeveragePass =
    context.playType === "pass" &&
    (context.down >= 3 || context.yardsToGo >= 8 || context.fieldZone === "red_zone");

  if (player.status !== "active") {
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      abilityId: xFactor.abilityId,
      abilityName: xFactor.abilityName,
      active: false,
      impactModifier: 0,
      reason: "X-Factor inaktiv: Spieler ist nicht aktiv.",
    };
  }

  if (xFactor.abilityId === "clutch") {
    const active = closeLateGame || !!context.playoffGame;

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      abilityId: xFactor.abilityId,
      abilityName: xFactor.abilityName,
      active,
      impactModifier: active ? 0.035 : 0,
      reason: active
        ? "Clutch aktiv: enge Schlussphase oder Playoff-Druck."
        : "Clutch wartet auf eine enge Schlussphase.",
    };
  }

  if (xFactor.abilityId === "speed_burst") {
    const active = longSpacePlay && ["WR", "RB", "TE", "CB"].includes(player.position);

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      abilityId: xFactor.abilityId,
      abilityName: xFactor.abilityName,
      active,
      impactModifier: active ? 0.03 : 0,
      reason: active
        ? "Speed Burst aktiv: Raum fuer explosives Play vorhanden."
        : "Speed Burst braucht Raum, Return oder langen Down.",
    };
  }

  const active = highLeveragePass && ["QB", "WR", "TE", "RB"].includes(player.position);

  return {
    playerId: player.playerId,
    playerName: player.playerName,
    abilityId: xFactor.abilityId,
    abilityName: xFactor.abilityName,
    active,
    impactModifier: active ? 0.028 : 0,
    reason: active
      ? "Playmaker aktiv: Passing-Situation mit hoher Hebelwirkung."
      : "Playmaker wartet auf Third Down, Red Zone oder langen Pass-Kontext.",
  };
}

export function evaluateOnlinePlayerXFactors(
  player: OnlineContractPlayer,
  context: OnlineXFactorPlayContext,
): OnlineXFactorTriggerResult[] {
  return player.xFactors.map((xFactor) => getXFactorTriggerResult(player, xFactor, context));
}

export function evaluateOnlineTeamXFactors(
  leagueId: string,
  userId: string,
  context: OnlineXFactorPlayContext,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineXFactorTriggerResult[] {
  const league = getOnlineLeagueById(leagueId, storage);
  const leagueUser = league?.users.find((user) => user.userId === userId);

  if (!league || !leagueUser) {
    return [];
  }

  return getOnlineLeagueUserContractRoster(leagueUser).flatMap((player) =>
    evaluateOnlinePlayerXFactors(player, context),
  );
}

function getRecalculatedCapUser(
  user: OnlineLeagueUser,
  contractRoster: OnlineContractPlayer[],
  deadCapOverride?: number,
): OnlineLeagueUser {
  const previousCap = getOnlineLeagueUserSalaryCap(user);
  const salaryCap = calculateSalaryCap(
    contractRoster,
    previousCap.capLimit,
    deadCapOverride,
  );

  return {
    ...user,
    contractRoster,
    salaryCap,
  };
}

function advanceContractOneYear(contract: PlayerContract): PlayerContract {
  const yearsRemaining = Math.max(0, contract.yearsRemaining - 1);
  const signingBonusReduction = Math.min(
    contract.signingBonus,
    Math.round(contract.signingBonus / Math.max(1, contract.yearsRemaining)),
  );
  const guaranteedReduction = Math.min(
    contract.guaranteedMoney,
    Math.max(0, contract.deadCapPerYear - signingBonusReduction),
  );

  return normalizePlayerContract({
    ...contract,
    yearsRemaining,
    signingBonus: Math.max(0, contract.signingBonus - signingBonusReduction),
    guaranteedMoney: Math.max(0, contract.guaranteedMoney - guaranteedReduction),
  });
}

function createContractActionResult(
  status: ContractActionResult["status"],
  league: OnlineLeague | null,
  message: string,
): ContractActionResult {
  if (status === "success" && league) {
    return {
      status,
      league,
      message,
    };
  }

  return {
    status: status === "success" ? "blocked" : status,
    league,
    message,
  };
}

export function extendOnlinePlayerContract(
  leagueId: string,
  userId: string,
  playerId: string,
  contract: PlayerContract,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): ContractActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createContractActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return createContractActionResult("missing-user", league, "GM konnte nicht gefunden werden.");
  }

  const roster = getOnlineLeagueUserContractRoster(leagueUser);
  const player = roster.find(
    (candidate) => candidate.playerId === playerId && candidate.status === "active",
  );

  if (!player) {
    return createContractActionResult("missing-player", league, "Spieler wurde nicht gefunden.");
  }

  const nextContract = normalizePlayerContract(contract);
  const strategy = getOnlineLeagueUserFranchiseStrategy(leagueUser);
  const nextRoster = roster.map((candidate) =>
    candidate.playerId === playerId
      ? {
          ...candidate,
          contract: nextContract,
        }
      : candidate,
  );
  const nextUser = getRecalculatedCapUser(leagueUser, nextRoster);
  const nextCap = nextUser.salaryCap ?? getOnlineLeagueUserSalaryCap(nextUser);

  if (!hasStrategyCapSpace(nextCap, strategy)) {
    return createContractActionResult(
      "blocked",
      league,
      "Verlängerung blockiert: Salary Cap würde überschritten.",
    );
  }

  const updatedLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) => (user.userId === userId ? nextUser : user)),
    },
    createLeagueEvent({
      eventType: "contract_extended",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${player.playerName} extended for ${nextContract.yearsRemaining} years.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Contract extended: ${player.playerName}`,
  );

  return createContractActionResult(
    "success",
    saveOnlineLeague(updatedLeague, storage),
    "Vertrag wurde verlängert.",
  );
}

export function releaseOnlinePlayer(
  leagueId: string,
  userId: string,
  playerId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): ContractActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createContractActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return createContractActionResult("missing-user", league, "GM konnte nicht gefunden werden.");
  }

  const roster = getOnlineLeagueUserContractRoster(leagueUser);
  const player = roster.find(
    (candidate) => candidate.playerId === playerId && candidate.status === "active",
  );

  if (!player) {
    return createContractActionResult("missing-player", league, "Spieler wurde nicht gefunden.");
  }

  const deadCapCharge = player.contract.deadCapPerYear;
  const nextRoster = roster.map((candidate) =>
    candidate.playerId === playerId
      ? {
          ...candidate,
          status: "released" as const,
        }
      : candidate,
  );
  const nextUser = getRecalculatedCapUser(leagueUser, nextRoster);
  const updatedLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) => (user.userId === userId ? nextUser : user)),
    },
    createLeagueEvent({
      eventType: "player_released",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${player.playerName} released. Dead cap: ${deadCapCharge}.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Player released: ${player.playerName}. Dead cap: ${deadCapCharge}`,
  );

  return createContractActionResult(
    "success",
    saveOnlineLeague(updatedLeague, storage),
    "Spieler wurde entlassen. Dead Cap wurde verbucht.",
  );
}

export function signOnlineFreeAgent(
  leagueId: string,
  userId: string,
  freeAgentId: string,
  contract: PlayerContract | undefined,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): ContractActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createContractActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return createContractActionResult("missing-user", league, "GM konnte nicht gefunden werden.");
  }

  const freeAgents = league.freeAgents ?? createDefaultFreeAgents();
  const freeAgent = freeAgents.find((candidate) => candidate.playerId === freeAgentId);

  if (!freeAgent) {
    return createContractActionResult("missing-player", league, "Free Agent wurde nicht gefunden.");
  }

  const nextContract = normalizePlayerContract(contract ?? freeAgent.contract);
  const strategy = getOnlineLeagueUserFranchiseStrategy(leagueUser);
  const strategyBlockReason = getStrategyContractBlockReason(
    strategy,
    freeAgent,
    nextContract,
  );

  if (strategyBlockReason) {
    return createContractActionResult("blocked", league, strategyBlockReason);
  }

  const signedPlayer: OnlineContractPlayer = {
    ...freeAgent,
    contract: nextContract,
    status: "active",
  };
  const nextRoster = [...getOnlineLeagueUserContractRoster(leagueUser), signedPlayer];
  const nextUser = getRecalculatedCapUser(leagueUser, nextRoster);
  const nextCap = nextUser.salaryCap ?? getOnlineLeagueUserSalaryCap(nextUser);

  if (!hasStrategyCapSpace(nextCap, strategy)) {
    return createContractActionResult(
      "blocked",
      league,
      "Signing blockiert: Salary Cap würde überschritten.",
    );
  }

  const updatedLeague = appendLeagueAudit(
    {
      ...league,
      freeAgents: freeAgents.filter((candidate) => candidate.playerId !== freeAgentId),
      users: league.users.map((user) => (user.userId === userId ? nextUser : user)),
    },
    createLeagueEvent({
      eventType: "free_agent_signed",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${freeAgent.playerName} signed for ${nextContract.salaryPerYear}/year.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Free agent signed: ${freeAgent.playerName}`,
  );

  return createContractActionResult(
    "success",
    saveOnlineLeague(updatedLeague, storage),
    "Free Agent wurde verpflichtet.",
  );
}

export function advanceOnlineContractsOneYear(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const expiringPlayers: OnlineContractPlayer[] = [];
  const nextUsers = league.users.map((user) => {
    const nextRoster = getOnlineLeagueUserContractRoster(user)
      .map((player) => {
        if (player.status !== "active" && player.status !== "released") {
          return player;
        }

        return {
          ...player,
          contract: advanceContractOneYear(player.contract),
        };
      })
      .filter((player) => {
        if (player.status === "active" && player.contract.yearsRemaining === 0) {
          expiringPlayers.push({
            ...player,
            status: "free_agent",
          });
          return false;
        }

        if (player.status === "released" && player.contract.yearsRemaining === 0) {
          return false;
        }

        return true;
      });

    return getRecalculatedCapUser(user, nextRoster);
  });

  return saveOnlineLeague(
    appendLeagueAudit(
      {
        ...league,
        users: nextUsers,
        freeAgents: [...(league.freeAgents ?? createDefaultFreeAgents()), ...expiringPlayers],
      },
      createLeagueEvent({
        eventType: "salary_cap_updated",
        leagueId: league.id,
        teamId: "league",
        userId: "admin",
        reason: `Contract year advanced. Expiring players: ${expiringPlayers.length}.`,
        season: normalizeSeasonNumber(league.currentWeek),
        week: league.currentWeek,
      }),
      `Contract year advanced. Expiring players: ${expiringPlayers.length}.`,
    ),
    storage,
  );
}

function createScoutingActionResult(
  status: ScoutingActionResult["status"],
  league: OnlineLeague | null,
  message: string,
  prospect?: Prospect,
): ScoutingActionResult {
  if (status === "success" && league && prospect) {
    return {
      status,
      league,
      prospect,
      message,
    };
  }

  return {
    status: status === "success" ? "blocked" : status,
    league,
    message,
  };
}

function createDraftActionResult(
  status: DraftActionResult["status"],
  league: OnlineLeague | null,
  message: string,
  player?: OnlineContractPlayer,
  prospect?: Prospect,
): DraftActionResult {
  if (status === "success" && league && player && prospect) {
    return {
      status,
      league,
      player,
      prospect,
      message,
    };
  }

  return {
    status: status === "success" ? "blocked" : status,
    league,
    message,
  };
}

export function scoutOnlineProspect(
  leagueId: string,
  userId: string,
  prospectId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): ScoutingActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createScoutingActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return createScoutingActionResult("missing-user", league, "GM konnte nicht gefunden werden.");
  }

  const prospects = getOnlineLeagueProspectsForDisplay(league);
  const prospect = prospects.find((candidate) => candidate.prospectId === prospectId);

  if (!prospect) {
    return createScoutingActionResult("missing-prospect", league, "Prospect wurde nicht gefunden.");
  }

  if (prospect.status !== "available") {
    return createScoutingActionResult("blocked", league, "Dieser Prospect wurde bereits gedraftet.");
  }

  const previousAccuracy = prospect.scoutingAccuracy;
  const nextAccuracy = Math.min(95, previousAccuracy + 20);
  const previousError = prospect.scoutedRating - prospect.trueRating;
  const errorRetention =
    previousAccuracy >= 95 ? 0 : Math.max(0, (100 - nextAccuracy) / (100 - previousAccuracy));
  const updatedProspect: Prospect = normalizeProspect({
    ...prospect,
    scoutingAccuracy: nextAccuracy,
    scoutedRating: Math.round(prospect.trueRating + previousError * errorRetention),
    scoutedByTeamIds: [...prospect.scoutedByTeamIds, leagueUser.teamId],
  });
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      prospects: prospects.map((candidate) =>
        candidate.prospectId === prospectId ? updatedProspect : candidate,
      ),
    },
    createLeagueEvent({
      eventType: "prospect_scouted",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${updatedProspect.playerName} scouted. Accuracy ${previousAccuracy} -> ${updatedProspect.scoutingAccuracy}.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Prospect scouted: ${updatedProspect.playerName}`,
  );

  return createScoutingActionResult(
    "success",
    saveOnlineLeague(nextLeague, storage),
    "Scouting-Bericht aktualisiert.",
    updatedProspect,
  );
}

function createRookieContractForDraftPick(round: number): PlayerContract {
  return createContract(
    round === 1 ? 2_500_000 : 1_200_000,
    4,
    round === 1 ? 1_500_000 : 500_000,
    "rookie",
    round === 1 ? 750_000 : 250_000,
  );
}

function createDraftedPlayer(prospect: Prospect, pick: DraftOrderPick): OnlineContractPlayer {
  const developmentPath = inferPlayerDevelopmentPath({
    age: prospect.age,
    overall: prospect.trueRating,
    potential: prospect.potential,
  });

  return {
    playerId: `rookie-${prospect.prospectId}`,
    playerName: prospect.playerName,
    position: prospect.position,
    age: prospect.age,
    overall: prospect.trueRating,
    potential: prospect.potential,
    developmentPath,
    developmentProgress: 0,
    xFactors: inferDefaultXFactors({
      age: prospect.age,
      overall: prospect.trueRating,
      position: prospect.position,
      potential: prospect.potential,
      developmentPath,
    }),
    contract: createRookieContractForDraftPick(pick.round),
    status: "active",
  };
}

export function makeOnlineDraftPick(
  leagueId: string,
  userId: string,
  prospectId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): DraftActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createDraftActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return createDraftActionResult("missing-user", league, "GM konnte nicht gefunden werden.");
  }

  const prospects = getOnlineLeagueProspectsForDisplay(league);
  const prospect = prospects.find((candidate) => candidate.prospectId === prospectId);

  if (!prospect) {
    return createDraftActionResult("missing-prospect", league, "Prospect wurde nicht gefunden.");
  }

  if (prospect.status !== "available") {
    return createDraftActionResult("blocked", league, "Dieser Prospect ist nicht mehr verfügbar.");
  }

  const draftOrder = getOnlineLeagueDraftOrderForDisplay(league);
  const currentPick = draftOrder.picks.find((pick) => pick.status === "available");

  if (!currentPick) {
    return createDraftActionResult("blocked", league, "Der Draft ist bereits abgeschlossen.");
  }

  if (currentPick.userId !== userId) {
    return createDraftActionResult(
      "blocked",
      league,
      "Dieses Team ist aktuell nicht am Zug.",
    );
  }

  const draftedPlayer = createDraftedPlayer(prospect, currentPick);
  const nextRoster = [...getOnlineLeagueUserContractRoster(leagueUser), draftedPlayer];
  const nextUser = getRecalculatedCapUser(leagueUser, nextRoster);

  if (getCapSpace(nextUser.salaryCap ?? getOnlineLeagueUserSalaryCap(nextUser)) < 0) {
    return createDraftActionResult(
      "blocked",
      league,
      "Draft-Pick blockiert: Rookie-Vertrag würde den Salary Cap überschreiten.",
    );
  }

  const now = new Date().toISOString();
  const draftedProspect: Prospect = normalizeProspect({
    ...prospect,
    status: "drafted",
    draftedByTeamId: leagueUser.teamId,
  });
  const madePick: DraftOrderPick = {
    ...currentPick,
    status: "made",
    prospectId,
  };
  const historyEntry: DraftHistoryEntry = {
    pickNumber: currentPick.pickNumber,
    round: currentPick.round,
    teamId: leagueUser.teamId,
    userId,
    prospectId,
    playerName: prospect.playerName,
    draftedAt: now,
  };
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      prospects: prospects.map((candidate) =>
        candidate.prospectId === prospectId ? draftedProspect : candidate,
      ),
      draftOrder: {
        ...draftOrder,
        picks: draftOrder.picks.map((pick) =>
          pick.pickNumber === currentPick.pickNumber ? madePick : pick,
        ),
      },
      draftHistory: [historyEntry, ...(league.draftHistory ?? [])],
      users: league.users.map((user) => (user.userId === userId ? nextUser : user)),
    },
    createLeagueEvent({
      eventType: "draft_pick_made",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `Pick ${currentPick.pickNumber}: ${prospect.playerName} selected.`,
      season: draftOrder.season,
      week: league.currentWeek,
    }),
    `Draft pick made: ${prospect.playerName} to ${leagueUser.teamDisplayName ?? leagueUser.teamName}`,
  );

  return createDraftActionResult(
    "success",
    saveOnlineLeague(nextLeague, storage),
    `${prospect.playerName} wurde gedraftet.`,
    draftedPlayer,
    draftedProspect,
  );
}

function getPlayerTradeValue(player: OnlineContractPlayer) {
  const ageModifier = player.age <= 25 ? 8_000_000 : player.age >= 31 ? -6_000_000 : 0;
  const contractDiscount = Math.max(0, player.contract.salaryPerYear - 12_000_000) * 0.25;

  return Math.max(
    1_000_000,
    player.overall * 1_250_000 + ageModifier - contractDiscount,
  );
}

function getPickTradeValue(pick: OnlineDraftPick) {
  const roundValue =
    pick.round === 1 ? 32_000_000 : pick.round === 2 ? 15_000_000 : 7_000_000;
  const seasonDiscount = Math.max(0, pick.season - 1) * 1_500_000;

  return Math.max(1_000_000, roundValue - seasonDiscount);
}

function evaluateTradeFairness(
  fromUser: OnlineLeagueUser,
  toUser: OnlineLeagueUser,
  input: Pick<
    TradeProposal,
    "playersOffered" | "playersRequested" | "picksOffered" | "picksRequested"
  >,
) {
  const fromRoster = getOnlineLeagueUserContractRoster(fromUser);
  const toRoster = getOnlineLeagueUserContractRoster(toUser);
  const fromPicks = getOnlineLeagueUserDraftPicks(fromUser);
  const toPicks = getOnlineLeagueUserDraftPicks(toUser);
  const offeredValue =
    input.playersOffered.reduce((sum, playerId) => {
      const player = fromRoster.find((candidate) => candidate.playerId === playerId);
      return sum + (player ? getPlayerTradeValue(player) : 0);
    }, 0) +
    input.picksOffered.reduce((sum, pickId) => {
      const pick = fromPicks.find((candidate) => candidate.pickId === pickId);
      return sum + (pick ? getPickTradeValue(pick) : 0);
    }, 0);
  const requestedValue =
    input.playersRequested.reduce((sum, playerId) => {
      const player = toRoster.find((candidate) => candidate.playerId === playerId);
      return sum + (player ? getPlayerTradeValue(player) : 0);
    }, 0) +
    input.picksRequested.reduce((sum, pickId) => {
      const pick = toPicks.find((candidate) => candidate.pickId === pickId);
      return sum + (pick ? getPickTradeValue(pick) : 0);
    }, 0);
  const higherValue = Math.max(offeredValue, requestedValue, 1);
  const lowerValue = Math.min(offeredValue, requestedValue);
  const fairnessScore = Math.round((lowerValue / higherValue) * 100);

  return {
    fairnessScore,
    fairnessLabel:
      fairnessScore >= 80
        ? ("fair" as const)
        : fairnessScore >= 60
          ? ("slightly_unbalanced" as const)
          : ("unbalanced" as const),
  };
}

function createTradeActionResult(
  status: TradeActionResult["status"],
  league: OnlineLeague | null,
  message: string,
  trade?: TradeProposal,
): TradeActionResult {
  if (status === "success" && league && trade) {
    return {
      status,
      league,
      trade,
      message,
    };
  }

  return {
    status: status === "success" ? "blocked" : status,
    league,
    message,
  };
}

function ownsActivePlayers(user: OnlineLeagueUser, playerIds: string[]) {
  const roster = getOnlineLeagueUserContractRoster(user);

  return playerIds.every((playerId) =>
    roster.some((player) => player.playerId === playerId && player.status === "active"),
  );
}

function ownsDraftPicks(user: OnlineLeagueUser, pickIds: string[]) {
  const picks = getOnlineLeagueUserDraftPicks(user);

  return pickIds.every((pickId) => picks.some((pick) => pick.pickId === pickId));
}

export function createOnlineTradeProposal(
  leagueId: string,
  fromUserId: string,
  input: CreateTradeProposalInput,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): TradeActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createTradeActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const fromUser = league.users.find((user) => user.userId === fromUserId);
  const toUser = league.users.find((user) => user.userId === input.toUserId);

  if (!fromUser || !toUser || fromUser.userId === toUser.userId) {
    return createTradeActionResult("missing-user", league, "Trade-Partner konnte nicht gefunden werden.");
  }

  const playersOffered = input.playersOffered;
  const playersRequested = input.playersRequested;
  const picksOffered = input.picksOffered ?? [];
  const picksRequested = input.picksRequested ?? [];

  if (
    playersOffered.length + playersRequested.length + picksOffered.length + picksRequested.length ===
    0
  ) {
    return createTradeActionResult("blocked", league, "Trade braucht mindestens ein Asset.");
  }

  if (
    !ownsActivePlayers(fromUser, playersOffered) ||
    !ownsActivePlayers(toUser, playersRequested) ||
    !ownsDraftPicks(fromUser, picksOffered) ||
    !ownsDraftPicks(toUser, picksRequested)
  ) {
    return createTradeActionResult("blocked", league, "Trade enthält Assets, die dem Team nicht gehören.");
  }

  const now = new Date().toISOString();
  const fairness = evaluateTradeFairness(fromUser, toUser, {
    playersOffered,
    playersRequested,
    picksOffered,
    picksRequested,
  });
  const trade: TradeProposal = {
    tradeId: createSeededId(
      "trade",
      `trade:${now}:${fromUserId}:${toUser.userId}:${playersOffered.join(",")}:${playersRequested.join(",")}:${picksOffered.join(",")}:${picksRequested.join(",")}`,
      12,
    ),
    fromTeamId: fromUser.teamId,
    toTeamId: toUser.teamId,
    fromUserId,
    toUserId: toUser.userId,
    playersOffered,
    playersRequested,
    picksOffered,
    picksRequested,
    status: "pending",
    fairnessScore: fairness.fairnessScore,
    fairnessLabel: fairness.fairnessLabel,
    createdAt: now,
    updatedAt: now,
  };
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      tradeProposals: [trade, ...(league.tradeProposals ?? [])],
    },
    createLeagueEvent({
      eventType: "trade_proposed",
      leagueId: league.id,
      teamId: fromUser.teamId,
      userId: fromUserId,
      reason: `Trade proposed to ${toUser.teamDisplayName ?? toUser.teamName}. Fairness ${trade.fairnessScore}.`,
      season: getTrainingSeason(fromUser),
      week: league.currentWeek,
    }),
    `Trade proposed: ${fromUser.teamDisplayName ?? fromUser.teamName} -> ${toUser.teamDisplayName ?? toUser.teamName}`,
  );

  return createTradeActionResult(
    "success",
    saveOnlineLeague(nextLeague, storage),
    "Trade wurde erstellt.",
    trade,
  );
}

function moveTradeAssets(
  fromUser: OnlineLeagueUser,
  toUser: OnlineLeagueUser,
  trade: TradeProposal,
) {
  const fromRoster = getOnlineLeagueUserContractRoster(fromUser);
  const toRoster = getOnlineLeagueUserContractRoster(toUser);
  const offeredPlayers = fromRoster.filter((player) =>
    trade.playersOffered.includes(player.playerId),
  );
  const requestedPlayers = toRoster.filter((player) =>
    trade.playersRequested.includes(player.playerId),
  );
  const nextFromRoster = [
    ...fromRoster.filter((player) => !trade.playersOffered.includes(player.playerId)),
    ...requestedPlayers,
  ];
  const nextToRoster = [
    ...toRoster.filter((player) => !trade.playersRequested.includes(player.playerId)),
    ...offeredPlayers,
  ];
  const fromPicks = getOnlineLeagueUserDraftPicks(fromUser);
  const toPicks = getOnlineLeagueUserDraftPicks(toUser);
  const offeredPicks = fromPicks
    .filter((pick) => trade.picksOffered.includes(pick.pickId))
    .map((pick) => ({ ...pick, currentTeamId: toUser.teamId }));
  const requestedPicks = toPicks
    .filter((pick) => trade.picksRequested.includes(pick.pickId))
    .map((pick) => ({ ...pick, currentTeamId: fromUser.teamId }));
  const nextFromPicks = [
    ...fromPicks.filter((pick) => !trade.picksOffered.includes(pick.pickId)),
    ...requestedPicks,
  ];
  const nextToPicks = [
    ...toPicks.filter((pick) => !trade.picksRequested.includes(pick.pickId)),
    ...offeredPicks,
  ];
  const nextFromUser = {
    ...getRecalculatedCapUser(fromUser, nextFromRoster),
    draftPicks: nextFromPicks,
  };
  const nextToUser = {
    ...getRecalculatedCapUser(toUser, nextToRoster),
    draftPicks: nextToPicks,
  };

  return {
    nextFromUser,
    nextToUser,
  };
}

export function acceptOnlineTradeProposal(
  leagueId: string,
  tradeId: string,
  acceptingUserId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): TradeActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createTradeActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const trade = (league.tradeProposals ?? []).find((proposal) => proposal.tradeId === tradeId);

  if (!trade) {
    return createTradeActionResult("missing-trade", league, "Trade wurde nicht gefunden.");
  }

  if (trade.status !== "pending") {
    return createTradeActionResult("blocked", league, "Trade wurde bereits abgeschlossen.");
  }

  if (trade.toUserId !== acceptingUserId) {
    return createTradeActionResult("blocked", league, "Nur der empfangende GM kann diesen Trade annehmen.");
  }

  const fromUser = league.users.find((user) => user.userId === trade.fromUserId);
  const toUser = league.users.find((user) => user.userId === trade.toUserId);

  if (!fromUser || !toUser) {
    return createTradeActionResult("missing-user", league, "Trade-Team konnte nicht gefunden werden.");
  }

  if (
    !ownsActivePlayers(fromUser, trade.playersOffered) ||
    !ownsActivePlayers(toUser, trade.playersRequested) ||
    !ownsDraftPicks(fromUser, trade.picksOffered) ||
    !ownsDraftPicks(toUser, trade.picksRequested)
  ) {
    return createTradeActionResult("blocked", league, "Trade-Assets sind nicht mehr verfügbar.");
  }

  const { nextFromUser, nextToUser } = moveTradeAssets(fromUser, toUser, trade);
  const fromCap = getOnlineLeagueUserSalaryCap(nextFromUser);
  const toCap = getOnlineLeagueUserSalaryCap(nextToUser);

  if (getCapSpace(fromCap) < 0 || getCapSpace(toCap) < 0) {
    return createTradeActionResult("blocked", league, "Trade blockiert: Salary Cap wäre nach dem Trade ungültig.");
  }

  const now = new Date().toISOString();
  const acceptedTrade: TradeProposal = {
    ...trade,
    status: "accepted",
    updatedAt: now,
  };
  const historyEntry: TradeHistoryEntry = {
    tradeId: trade.tradeId,
    fromTeamId: trade.fromTeamId,
    toTeamId: trade.toTeamId,
    playersOffered: trade.playersOffered,
    playersRequested: trade.playersRequested,
    picksOffered: trade.picksOffered,
    picksRequested: trade.picksRequested,
    executedAt: now,
    summary: `Trade accepted: ${trade.playersOffered.length + trade.picksOffered.length} assets for ${trade.playersRequested.length + trade.picksRequested.length} assets.`,
  };
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) => {
        if (user.userId === nextFromUser.userId) {
          return nextFromUser;
        }
        if (user.userId === nextToUser.userId) {
          return nextToUser;
        }
        return user;
      }),
      tradeProposals: (league.tradeProposals ?? []).map((proposal) =>
        proposal.tradeId === tradeId ? acceptedTrade : proposal,
      ),
      tradeHistory: [historyEntry, ...(league.tradeHistory ?? [])],
    },
    createLeagueEvent({
      eventType: "trade_accepted",
      leagueId: league.id,
      teamId: trade.toTeamId,
      userId: acceptingUserId,
      reason: historyEntry.summary,
      season: getTrainingSeason(toUser),
      week: league.currentWeek,
    }),
    historyEntry.summary,
  );

  return createTradeActionResult(
    "success",
    saveOnlineLeague(nextLeague, storage),
    "Trade wurde angenommen.",
    acceptedTrade,
  );
}

export function declineOnlineTradeProposal(
  leagueId: string,
  tradeId: string,
  decliningUserId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): TradeActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createTradeActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const trade = (league.tradeProposals ?? []).find((proposal) => proposal.tradeId === tradeId);

  if (!trade) {
    return createTradeActionResult("missing-trade", league, "Trade wurde nicht gefunden.");
  }

  if (trade.status !== "pending") {
    return createTradeActionResult("blocked", league, "Trade wurde bereits abgeschlossen.");
  }

  if (trade.toUserId !== decliningUserId && trade.fromUserId !== decliningUserId) {
    return createTradeActionResult("blocked", league, "Nur beteiligte GMs können diesen Trade ablehnen.");
  }

  const now = new Date().toISOString();
  const declinedTrade: TradeProposal = {
    ...trade,
    status: "declined",
    updatedAt: now,
  };
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      tradeProposals: (league.tradeProposals ?? []).map((proposal) =>
        proposal.tradeId === tradeId ? declinedTrade : proposal,
      ),
    },
    createLeagueEvent({
      eventType: "trade_declined",
      leagueId: league.id,
      teamId: trade.toTeamId,
      userId: decliningUserId,
      reason: "Trade declined.",
      season: normalizeSeasonNumber(league.currentWeek),
      week: league.currentWeek,
    }),
    "Trade declined.",
  );

  return createTradeActionResult(
    "success",
    saveOnlineLeague(nextLeague, storage),
    "Trade wurde abgelehnt.",
    declinedTrade,
  );
}

function getTrainingSeason(user: OnlineLeagueUser) {
  return user.jobSecurity?.lastUpdatedSeason ?? 1;
}

function getTrainingPlanForWeek(
  user: OnlineLeagueUser,
  season: number,
  week: number,
) {
  return getOnlineLeagueUserTrainingPlans(user).find(
    (plan) => plan.season === season && plan.week === week,
  );
}

function getTrainingOutcomeForWeek(
  user: OnlineLeagueUser,
  season: number,
  week: number,
) {
  return getOnlineLeagueUserTrainingOutcomes(user).find(
    (outcome) => outcome.season === season && outcome.week === week,
  );
}

function getTrainingCoachExecutionRating(
  staff: CoachingStaffProfile,
  plan: WeeklyTrainingPlan,
) {
  const focusRating =
    plan.primaryFocus === "offense"
      ? staff.offenseTraining
      : plan.primaryFocus === "defense"
        ? staff.defenseTraining
        : plan.primaryFocus === "player_development"
          ? staff.playerDevelopment
          : plan.primaryFocus === "recovery" || plan.primaryFocus === "conditioning"
            ? staff.injuryPrevention
            : plan.primaryFocus === "team_chemistry"
              ? staff.motivation
              : (staff.offenseTraining + staff.defenseTraining) / 2;
  const execution =
    focusRating * 0.38 +
    staff.gamePreparation * 0.22 +
    staff.discipline * 0.16 +
    staff.adaptability * 0.14 +
    staff.motivation * 0.1;

  return clampScore(execution);
}

function roundTrainingDelta(value: number) {
  return Math.round(value * 100) / 100;
}

function getDevelopmentPathMultiplier(path: PlayerDevelopmentPath) {
  if (path === "star") {
    return 1.45;
  }

  if (path === "solid") {
    return 1;
  }

  return 0.45;
}

function getAgeDevelopmentMultiplier(age: number) {
  if (age <= 23) {
    return 1.28;
  }

  if (age <= 26) {
    return 1.05;
  }

  if (age <= 29) {
    return 0.68;
  }

  return 0.28;
}

function getPotentialDevelopmentMultiplier(player: OnlineContractPlayer) {
  const upside = Math.max(0, player.potential - player.overall);

  return Math.min(1.55, 0.35 + upside / 14);
}

function calculatePlayerTrainingDevelopmentDelta(
  player: OnlineContractPlayer,
  baseDevelopment: number,
  plan: WeeklyTrainingPlan,
) {
  const youngPriority =
    player.age <= 24 ? 0.85 + plan.youngPlayerPriority / 120 : 1;
  const veteranDrag =
    player.age >= 30 ? 1 - Math.min(0.35, plan.veteranMaintenance / 260) : 1;
  const focusMultiplier =
    plan.primaryFocus === "player_development"
      ? 1.22
      : plan.primaryFocus === "recovery"
        ? 0.62
        : 1;

  return roundTrainingDelta(
    baseDevelopment *
      getDevelopmentPathMultiplier(player.developmentPath) *
      getAgeDevelopmentMultiplier(player.age) *
      getPotentialDevelopmentMultiplier(player) *
      youngPriority *
      veteranDrag *
      focusMultiplier,
  );
}

function createTrainingAffectedPlayer(
  player: OnlineContractPlayer,
  developmentDelta: number,
  fatigueDelta: number,
  injuryRiskDelta: number,
  plan: WeeklyTrainingPlan,
): TrainingAffectedPlayer {
  const pathLabel =
    player.developmentPath === "star"
      ? "Star Path"
      : player.developmentPath === "solid"
        ? "Solid Path"
        : "Bust Risk";

  return {
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    developmentDelta,
    fatigueDelta,
    injuryRiskDelta,
    moraleDelta:
      plan.primaryFocus === "player_development" && player.age <= 24
        ? 1
        : plan.primaryFocus === "recovery" && player.age >= 30
          ? 1
          : 0,
    note: `${pathLabel}: Alter ${player.age}, OVR ${player.overall}, POT ${player.potential}.`,
  };
}

function applyTrainingDevelopmentToRoster(
  roster: OnlineContractPlayer[],
  outcome: TrainingOutcome,
) {
  const developmentByPlayerId = new Map(
    outcome.affectedPlayers.map((player) => [player.playerId, player.developmentDelta]),
  );

  return roster.map((player) => {
    const developmentDelta = developmentByPlayerId.get(player.playerId) ?? 0;

    if (player.status !== "active" || developmentDelta <= 0) {
      return player;
    }

    const nextProgress = player.developmentProgress + developmentDelta;
    const ratingGain = Math.floor(nextProgress);
    const nextOverall = Math.min(player.potential, player.overall + ratingGain);
    const cappedRatingGain = nextOverall - player.overall;

    return {
      ...player,
      overall: nextOverall,
      developmentProgress:
        nextOverall >= player.potential
          ? 0
          : roundTrainingDelta(nextProgress - cappedRatingGain),
    };
  });
}

function calculateTrainingOutcome(
  user: OnlineLeagueUser,
  plan: WeeklyTrainingPlan,
  now = new Date().toISOString(),
): TrainingOutcome {
  const staff = getOnlineLeagueUserCoachingStaff(user);
  const strategy = getOnlineLeagueUserFranchiseStrategy(user);
  const coachExecutionRating = getTrainingCoachExecutionRating(staff, plan);
  const coachFactor = 0.7 + coachExecutionRating / 250;
  const intensityDev =
    plan.intensity === "light"
      ? 0.58
      : plan.intensity === "normal"
        ? 1
        : plan.intensity === "hard"
          ? 1.24
          : 1.42;
  const intensityFatigue =
    plan.intensity === "light"
      ? -1.6
      : plan.intensity === "normal"
        ? 0.8
        : plan.intensity === "hard"
          ? 3.4
          : 6.2;
  const intensityInjuryRisk =
    plan.intensity === "light"
      ? -1.2
      : plan.intensity === "normal"
        ? 0.4
        : plan.intensity === "hard"
          ? 2.3
          : 5.2;
  const riskModifier =
    plan.riskTolerance === "low" ? -0.8 : plan.riskTolerance === "medium" ? 0 : 1.15;
  const focusDevelopmentBonus = plan.primaryFocus === "player_development" ? 0.38 : 0;
  const focusPreparationBonus =
    plan.primaryFocus === "offense" || plan.primaryFocus === "defense"
      ? 0.42
      : plan.primaryFocus === "balanced"
        ? 0.28
        : plan.primaryFocus === "team_chemistry"
          ? 0.12
          : plan.primaryFocus === "recovery"
            ? -0.08
            : 0.18;
  const recoveryFatigueBonus = plan.primaryFocus === "recovery" ? -3.4 : 0;
  const conditioningFatigueCost = plan.primaryFocus === "conditioning" ? 1.1 : 0;
  const chemistryDelta =
    (plan.primaryFocus === "team_chemistry" ? 2.4 : plan.primaryFocus === "balanced" ? 0.6 : 0) +
    (plan.intensity === "extreme" ? -2.2 : plan.intensity === "hard" ? -0.4 : 0) +
    (coachExecutionRating - 60) / 60;
  const veteranRelief = plan.veteranMaintenance / 45;
  const youngPriorityFactor = 0.75 + plan.youngPlayerPriority / 100;
  const baseDevelopment =
    (0.22 + focusDevelopmentBonus) *
    intensityDev *
    coachFactor *
    youngPriorityFactor *
    (1 + strategy.trainingDevelopmentModifier);
  const fatigueDelta =
    intensityFatigue + conditioningFatigueCost + recoveryFatigueBonus - veteranRelief;
  const injuryRiskDelta =
    intensityInjuryRisk +
    riskModifier +
    (plan.primaryFocus === "recovery" ? -1.7 : 0) -
    staff.injuryPrevention / 55;
  const preparationBonus = Math.max(
    0,
    Math.min(
      5,
      (0.35 + focusPreparationBonus + (plan.secondaryFocus ? 0.14 : 0)) *
        coachFactor *
        (1 + strategy.trainingPreparationModifier),
    ),
  );
  const activeRoster = getOnlineLeagueUserContractRoster(user).filter(
    (player) => player.status === "active",
  );
  const affectedPlayers = activeRoster.map((player) => {
    const developmentDelta = calculatePlayerTrainingDevelopmentDelta(
      player,
      baseDevelopment,
      plan,
    );
    const ageFatigueMultiplier =
      player.age >= 30 ? 1.14 - plan.veteranMaintenance / 280 : player.age <= 23 ? 0.9 : 1;

    return createTrainingAffectedPlayer(
      player,
      developmentDelta,
      roundTrainingDelta(fatigueDelta * ageFatigueMultiplier),
      roundTrainingDelta(injuryRiskDelta * (player.age >= 30 ? 1.12 : 0.92)),
      plan,
    );
  });
  const developmentDeltaSummary =
    affectedPlayers.reduce((sum, player) => sum + player.developmentDelta, 0) /
    Math.max(1, affectedPlayers.length);
  const riskEvents = [
    ...(plan.intensity === "extreme"
      ? ["Extreme Intensität erhöht Verletzungs- und Chemistry-Risiko."]
      : []),
    ...(injuryRiskDelta > 2.5 ? ["Medical Staff meldet erhöhtes Belastungsrisiko."] : []),
    ...(preparationBonus >= 1.2 ? ["Coaching Staff meldet starken Game-Prep-Fokus."] : []),
  ];

  return {
    teamId: user.teamId,
    season: plan.season,
    week: plan.week,
    planId: plan.planId,
    developmentDeltaSummary: roundTrainingDelta(developmentDeltaSummary),
    fatigueDelta: roundTrainingDelta(fatigueDelta),
    injuryRiskDelta: roundTrainingDelta(injuryRiskDelta),
    chemistryDelta: roundTrainingDelta(chemistryDelta),
    preparationBonus: roundTrainingDelta(preparationBonus),
    coachExecutionRating,
    riskEvents,
    affectedPlayers,
    createdAt: now,
  };
}

function createOnlineLocalId(prefix: string, now = new Date().toISOString()) {
  return createSeededId(prefix, `${prefix}:${now}`, 12);
}

function getInterimCoach(role: CoachRole): Coach {
  const roleLabel =
    role === "head_coach"
      ? "Head Coach"
      : role === "offensive_coordinator"
        ? "Offensive Coordinator"
        : role === "defensive_coordinator"
          ? "Defensive Coordinator"
          : "Development Coach";

  return {
    coachId: `interim-${role}`,
    name: `Interim ${roleLabel}`,
    role,
    ratings: {
      offense: 45,
      defense: 45,
      development: 45,
    },
  };
}

function getCurrentCoachFromStaff(staff: CoachingStaffProfile, role: CoachRole): Coach {
  if (role === "head_coach") {
    return normalizeCoach({
      coachId: `${staff.teamId}-current-head-coach`,
      name: staff.headCoachName,
      role,
      ratings: {
        offense: staff.offenseTraining,
        defense: staff.defenseTraining,
        development: staff.playerDevelopment,
      },
    });
  }

  if (role === "offensive_coordinator") {
    return normalizeCoach({
      coachId: `${staff.teamId}-current-offensive-coordinator`,
      name: staff.offensiveCoordinatorName,
      role,
      ratings: {
        offense: staff.offenseTraining,
        defense: Math.round(staff.defenseTraining * 0.55),
        development: Math.round((staff.playerDevelopment + staff.gamePreparation) / 2),
      },
    });
  }

  if (role === "defensive_coordinator") {
    return normalizeCoach({
      coachId: `${staff.teamId}-current-defensive-coordinator`,
      name: staff.defensiveCoordinatorName,
      role,
      ratings: {
        offense: Math.round(staff.offenseTraining * 0.55),
        defense: staff.defenseTraining,
        development: Math.round((staff.playerDevelopment + staff.discipline) / 2),
      },
    });
  }

  return normalizeCoach({
    coachId: `${staff.teamId}-current-development-coach`,
    name: staff.developmentCoachName,
    role,
    ratings: {
      offense: Math.round(staff.offenseTraining * 0.7),
      defense: Math.round(staff.defenseTraining * 0.7),
      development: staff.playerDevelopment,
    },
  });
}

function applyCoachToStaff(
  staff: CoachingStaffProfile,
  coach: Coach,
): CoachingStaffProfile {
  const normalizedCoach = normalizeCoach(coach);

  if (normalizedCoach.role === "head_coach") {
    return normalizeCoachingStaffValues({
      ...staff,
      headCoachName: normalizedCoach.name,
      offenseTraining: Math.round(
        normalizedCoach.ratings.offense * 0.72 + staff.offenseTraining * 0.28,
      ),
      defenseTraining: Math.round(
        normalizedCoach.ratings.defense * 0.72 + staff.defenseTraining * 0.28,
      ),
      playerDevelopment: Math.round(
        normalizedCoach.ratings.development * 0.62 + staff.playerDevelopment * 0.38,
      ),
      discipline: Math.round(
        (normalizedCoach.ratings.offense + normalizedCoach.ratings.defense) / 2,
      ),
      motivation: normalizedCoach.ratings.development,
      gamePreparation: Math.round(
        (normalizedCoach.ratings.offense + normalizedCoach.ratings.defense) / 2,
      ),
      adaptability: Math.round(
        (normalizedCoach.ratings.offense +
          normalizedCoach.ratings.defense +
          normalizedCoach.ratings.development) /
          3,
      ),
    });
  }

  if (normalizedCoach.role === "offensive_coordinator") {
    return normalizeCoachingStaffValues({
      ...staff,
      offensiveCoordinatorName: normalizedCoach.name,
      offenseTraining: normalizedCoach.ratings.offense,
      gamePreparation: Math.round(
        normalizedCoach.ratings.offense * 0.7 + normalizedCoach.ratings.development * 0.3,
      ),
    });
  }

  if (normalizedCoach.role === "defensive_coordinator") {
    return normalizeCoachingStaffValues({
      ...staff,
      defensiveCoordinatorName: normalizedCoach.name,
      defenseTraining: normalizedCoach.ratings.defense,
      discipline: Math.round(
        normalizedCoach.ratings.defense * 0.75 + normalizedCoach.ratings.development * 0.25,
      ),
    });
  }

  return normalizeCoachingStaffValues({
    ...staff,
    developmentCoachName: normalizedCoach.name,
    playerDevelopment: normalizedCoach.ratings.development,
    motivation: Math.round(
      normalizedCoach.ratings.development * 0.72 + normalizedCoach.ratings.offense * 0.14 + normalizedCoach.ratings.defense * 0.14,
    ),
    adaptability: Math.round(
      (normalizedCoach.ratings.offense +
        normalizedCoach.ratings.defense +
        normalizedCoach.ratings.development) /
        3,
    ),
  });
}

function createCoachActionResult(
  status: CoachActionResult["status"],
  league: OnlineLeague | null,
  message: string,
  coach?: Coach,
): CoachActionResult {
  if (status === "success" && league && coach) {
    return {
      status,
      league,
      coach,
      message,
    };
  }

  return {
    status: status === "success" ? "blocked" : status,
    league,
    message,
  };
}

export function hireOnlineCoach(
  leagueId: string,
  userId: string,
  coachId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): CoachActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createCoachActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return createCoachActionResult("missing-user", league, "GM konnte nicht gefunden werden.");
  }

  const availableCoaches = getAvailableOnlineCoaches(league);
  const coach = availableCoaches.find((candidate) => candidate.coachId === coachId);

  if (!coach) {
    return createCoachActionResult("missing-coach", league, "Coach ist nicht verfügbar.");
  }

  const staff = getOnlineLeagueUserCoachingStaff(leagueUser);
  const replacedCoach = getCurrentCoachFromStaff(staff, coach.role);
  const nextStaff = applyCoachToStaff(staff, coach);
  const now = new Date().toISOString();
  const historyEntry: CoachTransactionHistoryEntry = {
    transactionId: createOnlineLocalId("coach-hire", now),
    action: "hired",
    teamId: leagueUser.teamId,
    userId,
    coachId: coach.coachId,
    coachName: coach.name,
    role: coach.role,
    createdAt: now,
  };
  const nextAvailableCoaches = [
    ...availableCoaches.filter((candidate) => candidate.coachId !== coachId),
    ...(replacedCoach.coachId.startsWith("interim-") ? [] : [replacedCoach]),
  ];
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      availableCoaches: nextAvailableCoaches.map(normalizeCoach),
      coachHistory: [historyEntry, ...(league.coachHistory ?? [])],
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              coachingStaffProfile: nextStaff,
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "coach_hired",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${coach.name} hired as ${coach.role}.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Coach hired: ${coach.name}`,
  );

  return createCoachActionResult(
    "success",
    saveOnlineLeague(nextLeague, storage),
    "Coach wurde eingestellt.",
    coach,
  );
}

export function fireOnlineCoach(
  leagueId: string,
  userId: string,
  role: CoachRole,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): CoachActionResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return createCoachActionResult("missing-league", null, "Liga konnte nicht gefunden werden.");
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return createCoachActionResult("missing-user", league, "GM konnte nicht gefunden werden.");
  }

  if (!isCoachRole(role)) {
    return createCoachActionResult("blocked", league, "Ungültige Coaching-Rolle.");
  }

  const staff = getOnlineLeagueUserCoachingStaff(leagueUser);
  const firedCoach = getCurrentCoachFromStaff(staff, role);

  if (firedCoach.name.startsWith("Interim ")) {
    return createCoachActionResult(
      "blocked",
      league,
      "Interim-Coach kann nicht erneut gefeuert werden.",
    );
  }

  const interimCoach = getInterimCoach(role);
  const nextStaff = applyCoachToStaff(staff, interimCoach);
  const now = new Date().toISOString();
  const historyEntry: CoachTransactionHistoryEntry = {
    transactionId: createOnlineLocalId("coach-fire", now),
    action: "fired",
    teamId: leagueUser.teamId,
    userId,
    coachId: firedCoach.coachId,
    coachName: firedCoach.name,
    role,
    createdAt: now,
  };
  const availableCoaches = getAvailableOnlineCoaches(league);
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      availableCoaches: [
        ...availableCoaches.filter((coach) => coach.coachId !== firedCoach.coachId),
        firedCoach,
      ].map(normalizeCoach),
      coachHistory: [historyEntry, ...(league.coachHistory ?? [])],
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              coachingStaffProfile: nextStaff,
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "coach_fired",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${firedCoach.name} fired from ${role}.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Coach fired: ${firedCoach.name}`,
  );

  return createCoachActionResult(
    "success",
    saveOnlineLeague(nextLeague, storage),
    "Coach wurde entlassen. Ein Interim-Coach übernimmt.",
    firedCoach,
  );
}

function isValidTrainingPlanInput(input: SubmitWeeklyTrainingPlanInput) {
  return (
    isTrainingIntensity(input.intensity) &&
    isTrainingPrimaryFocus(input.primaryFocus) &&
    (input.secondaryFocus === undefined || isTrainingSecondaryFocus(input.secondaryFocus)) &&
    isTrainingRiskTolerance(input.riskTolerance) &&
    typeof input.youngPlayerPriority === "number" &&
    Number.isFinite(input.youngPlayerPriority) &&
    typeof input.veteranMaintenance === "number" &&
    Number.isFinite(input.veteranMaintenance)
  );
}

export function submitWeeklyTrainingPlan(
  leagueId: string,
  userId: string,
  input: SubmitWeeklyTrainingPlanInput,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): SubmitWeeklyTrainingPlanResult {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return {
      status: "missing-league",
      league: null,
      message: "Liga konnte nicht gefunden werden.",
    };
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return {
      status: "missing-user",
      league,
      message: "GM konnte in dieser Liga nicht gefunden werden.",
    };
  }

  if (!isValidTrainingPlanInput(input)) {
    return {
      status: "invalid",
      league,
      message: "Trainingsplan enthält ungültige Werte.",
    };
  }

  const now = new Date().toISOString();
  const season = normalizeSeasonNumber(input.season ?? getTrainingSeason(leagueUser));
  const week = Math.max(1, Math.floor(input.week ?? league.currentWeek));
  const plan: WeeklyTrainingPlan = {
    planId: `${league.id}-${leagueUser.teamId}-s${season}-w${week}-gm`,
    teamId: leagueUser.teamId,
    leagueId: league.id,
    season,
    week,
    intensity: input.intensity,
    primaryFocus: input.primaryFocus,
    secondaryFocus: input.secondaryFocus,
    riskTolerance: input.riskTolerance,
    youngPlayerPriority: clampPercentage(input.youngPlayerPriority),
    veteranMaintenance: clampPercentage(input.veteranMaintenance),
    notes: input.notes?.trim() || undefined,
    submittedByUserId: userId,
    submittedAt: now,
    source: "gm_submitted",
  };
  const updatedLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              weeklyTrainingPlans: [
                plan,
                ...getOnlineLeagueUserTrainingPlans(user).filter(
                  (existingPlan) =>
                    existingPlan.season !== season || existingPlan.week !== week,
                ),
              ],
              activity: {
                ...getOnlineLeagueUserActivity(user),
                lastSeenAt: now,
                lastLeagueActionAt: now,
                missedWeeklyActions: 0,
                inactiveSinceWeek: undefined,
                inactiveStatus: "active",
              },
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "training_plan_submitted",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${leagueUser.username} submitted ${plan.intensity}/${plan.primaryFocus} training.`,
      season,
      week,
    }),
    `Training plan submitted for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${plan.intensity}/${plan.primaryFocus}`,
  );

  return {
    status: "submitted",
    league: saveOnlineLeague(updatedLeague, storage),
    plan,
  };
}

export function resetWeeklyTrainingPlan(
  leagueId: string,
  userId: string,
  season: number,
  week: number,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  return saveOnlineLeague(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              weeklyTrainingPlans: getOnlineLeagueUserTrainingPlans(user).filter(
                (plan) => plan.season !== season || plan.week !== week,
              ),
            }
          : user,
      ),
      logs: [
        createLeagueLogEntry(`Training plan reset for user ${userId}, Week ${week}.`),
        ...(league.logs ?? []),
      ],
    },
    storage,
  );
}

export function generateOnlineTrainingOutcome(
  leagueId: string,
  userId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  const season = getTrainingSeason(leagueUser);
  const week = league.currentWeek;

  if (getTrainingOutcomeForWeek(leagueUser, season, week)) {
    return league;
  }

  const now = new Date().toISOString();
  const existingPlan = getTrainingPlanForWeek(leagueUser, season, week);
  const plan =
    existingPlan ??
    applyFranchiseStrategyToDefaultTrainingPlan(
      createDefaultTrainingPlan(league.id, leagueUser.teamId, userId, season, week, "auto_default", now),
      getOnlineLeagueUserFranchiseStrategy(leagueUser),
    );
  const outcome = calculateTrainingOutcome(leagueUser, plan, now);
  const chemistryUpdate = updateTeamChemistryProfile(leagueUser, {
    season,
    week,
    source: "training",
    delta: outcome.chemistryDelta,
    playerSatisfactionDelta: getPlayerSatisfactionDeltaFromChemistry(
      getOnlineLeagueUserTeamChemistry(leagueUser),
      outcome,
    ),
    reason: `Training ${plan.intensity}/${plan.primaryFocus} beeinflusst Team Chemistry.`,
    createdAt: now,
  });
  const developedRoster = applyTrainingDevelopmentToRoster(
    getOnlineLeagueUserContractRoster(leagueUser),
    outcome,
  );
  let updatedLeague = league;

  if (!existingPlan) {
    updatedLeague = appendLeagueAudit(
      {
        ...updatedLeague,
        users: updatedLeague.users.map((user) =>
          user.userId === userId
            ? {
                ...user,
                weeklyTrainingPlans: [plan, ...getOnlineLeagueUserTrainingPlans(user)],
              }
            : user,
        ),
      },
      createLeagueEvent({
        eventType: "training_plan_auto_defaulted",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: "No GM training plan submitted. Balanced/normal auto default used.",
        season,
        week,
      }),
      `Training auto-defaulted for ${leagueUser.teamDisplayName ?? leagueUser.teamName}`,
    );
  }

  updatedLeague = appendLeagueAudit(
    {
      ...updatedLeague,
      users: updatedLeague.users.map((user) =>
        user.userId === userId
          ? getRecalculatedCapUser(
              {
                ...user,
                trainingOutcomes: [outcome, ...getOnlineLeagueUserTrainingOutcomes(user)],
                teamChemistryProfile: chemistryUpdate.profile,
                chemistryHistory: [
                  chemistryUpdate.historyEntry,
                  ...getOnlineLeagueUserChemistryHistory(user),
                ],
              },
              developedRoster,
            )
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "training_outcome_generated",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `Training outcome generated. Prep +${outcome.preparationBonus}, fatigue ${outcome.fatigueDelta}.`,
      season,
      week,
    }),
    `Training outcome generated for ${leagueUser.teamDisplayName ?? leagueUser.teamName}`,
  );
  if (outcome.developmentDeltaSummary > 0) {
    updatedLeague = appendLeagueAudit(
      updatedLeague,
      createLeagueEvent({
        eventType: "player_development_updated",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: `Player development updated. Average delta ${outcome.developmentDeltaSummary}.`,
        season,
        week,
      }),
      `Player development updated for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${outcome.developmentDeltaSummary}`,
    );
  }
  updatedLeague = appendLeagueAudit(
    updatedLeague,
    createLeagueEvent({
      eventType: "training_fatigue_changed",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `Fatigue delta ${outcome.fatigueDelta}.`,
      season,
      week,
    }),
    `Training fatigue delta for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${outcome.fatigueDelta}`,
  );
  updatedLeague = appendLeagueAudit(
    updatedLeague,
    createLeagueEvent({
      eventType: "training_chemistry_changed",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `Chemistry delta ${outcome.chemistryDelta}.`,
      season,
      week,
    }),
    `Training chemistry delta for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${outcome.chemistryDelta}`,
  );
  if (chemistryUpdate.historyEntry.delta !== 0) {
    updatedLeague = appendLeagueAudit(
      updatedLeague,
      createLeagueEvent({
        eventType: "team_chemistry_changed",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: `${chemistryUpdate.historyEntry.reason} Chemistry ${chemistryUpdate.historyEntry.previousScore} -> ${chemistryUpdate.historyEntry.newScore}.`,
        season,
        week,
        previousScore: chemistryUpdate.historyEntry.previousScore,
      }),
      `Team chemistry changed for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${chemistryUpdate.historyEntry.previousScore} -> ${chemistryUpdate.historyEntry.newScore}`,
    );
  }
  updatedLeague = appendLeagueAudit(
    updatedLeague,
    createLeagueEvent({
      eventType: "training_injury_risk_changed",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `Injury risk delta ${outcome.injuryRiskDelta}.`,
      season,
      week,
    }),
    `Training injury risk delta for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${outcome.injuryRiskDelta}`,
  );

  if (outcome.preparationBonus > 0) {
    updatedLeague = appendLeagueAudit(
      updatedLeague,
      createLeagueEvent({
        eventType: "training_preparation_bonus_applied",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: `Temporary preparation bonus prepared: ${outcome.preparationBonus}.`,
        season,
        week,
      }),
      `Training preparation bonus prepared for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${outcome.preparationBonus}`,
    );
  }

  return saveOnlineLeague(updatedLeague, storage);
}

function getFirstOrCreateOnlineLeague(storage: OnlineLeagueStorage) {
  return readOnlineLeagues(storage)[0] ?? saveOnlineLeague(createGlobalTestLeague(), storage);
}

function getNextDebugUserIndex(users: OnlineLeagueUser[]) {
  const usedIndexes = new Set(
    users
      .map((user) => /^debug-user-(\d+)$/.exec(user.userId)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value)),
  );
  let nextIndex = 1;

  while (usedIndexes.has(nextIndex)) {
    nextIndex += 1;
  }

  return nextIndex;
}

function createDebugLeagueUser(
  league: OnlineLeague,
  team: OnlineLeagueTeam,
): OnlineLeagueUser {
  const nextIndex = getNextDebugUserIndex(league.users);
  const paddedIndex = String(nextIndex).padStart(2, "0");

  const now = new Date().toISOString();
  const stadiumProfile = createDefaultStadiumProfile(
    team.id,
    team.name,
    undefined,
    league.currentWeek,
    now,
  );
  const contractRoster = createDefaultContractRoster(team.id, team.name);

  return {
    userId: `debug-user-${nextIndex}`,
    username: `DebugCoach_${paddedIndex}`,
    joinedAt: now,
    teamId: team.id,
    teamName: team.name,
    ownershipProfile: createDefaultOwnershipProfile(team.id, team.name),
    jobSecurity: createDefaultJobSecurityScore(league.currentWeek),
    activity: createDefaultActivityMetrics(now),
    adminRemoval: createDefaultAdminRemovalState(),
    teamStatus: "occupied",
    controlledBy: "user",
    allowNewUserJoin: false,
    stadiumProfile,
    attendanceHistory: [],
    fanbaseProfile: createDefaultFanbaseProfile(team.id, undefined, now),
    teamChemistryProfile: createDefaultTeamChemistryProfile(team.id, league.currentWeek, 1, now),
    chemistryHistory: [],
    merchandiseFinancials: [],
    financeProfile: createDefaultFinanceProfile(team.id, now),
    coachingStaffProfile: createDefaultCoachingStaffProfile(team.id, team.name),
    weeklyTrainingPlans: [],
    trainingOutcomes: [],
    contractRoster,
    depthChart: createDefaultOnlineDepthChart(contractRoster, now),
    salaryCap: calculateSalaryCap(contractRoster),
    draftPicks: createDefaultDraftPicks(team.id),
    readyForWeek: false,
  };
}

export function addFakeUserToOnlineLeague(
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague {
  const league = getFirstOrCreateOnlineLeague(storage);
  const freeTeam = getFreeTeam(league);

  if (!freeTeam || league.users.length >= league.maxUsers) {
    return league;
  }

  return saveOnlineLeague(
    {
      ...league,
      users: [...league.users, createDebugLeagueUser(league, freeTeam)],
    },
    storage,
  );
}

export function fillOnlineLeagueWithFakeUsers(
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague {
  const league = getFirstOrCreateOnlineLeague(storage);
  const users = [...league.users];
  let workingLeague: OnlineLeague = {
    ...league,
    teams: ONLINE_MVP_TEAM_POOL,
    maxUsers: ONLINE_MVP_TEAM_POOL.length,
  };

  while (users.length < ONLINE_MVP_TEAM_POOL.length) {
    workingLeague = {
      ...workingLeague,
      users,
    };
    const freeTeam = getFreeTeam(workingLeague);

    if (!freeTeam) {
      break;
    }

    users.push(createDebugLeagueUser(workingLeague, freeTeam));
  }

  return saveOnlineLeague(
    {
      ...workingLeague,
      users,
    },
    storage,
  );
}

export function setAllOnlineLeaguesUsersReady(
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague[] {
  const readyAt = new Date().toISOString();
  const leagues = readOnlineLeagues(storage).map((league) => ({
    ...league,
    users: league.users.map((user) =>
      user.teamStatus === "vacant" ||
      user.adminRemoval?.status === "admin_removed" ||
      user.jobSecurity?.status === "fired"
        ? resetReadyState(user)
        : {
            ...user,
            readyForWeek: true,
            readyAt: user.readyAt ?? readyAt,
          },
    ),
  }));

  saveOnlineLeagues(leagues, storage);

  return leagues;
}

export function joinOnlineLeague(
  leagueId: string,
  user: OnlineUser,
  teamIdentityOrStorage?: TeamIdentitySelection | OnlineLeagueStorage,
  storageOverride?: OnlineLeagueStorage,
): JoinOnlineLeagueResult {
  const { teamIdentity, storage } = resolveJoinArguments(
    teamIdentityOrStorage,
    storageOverride,
  );
  const league =
    getOnlineLeagueById(leagueId, storage) ??
    (leagueId === GLOBAL_TEST_LEAGUE_ID ? getOrCreateGlobalTestLeague(storage) : null);

  if (!league) {
    return {
      status: "missing-league",
      league: {
        id: leagueId,
        name: "Unbekannte Online-Liga",
        users: [],
        teams: [],
        currentWeek: 1,
        currentSeason: 1,
        maxUsers: 0,
        status: "waiting",
      },
      message: "Diese Liga konnte nicht gefunden werden.",
    };
  }
  const existingUser = league.users.some(
    (leagueUser) => leagueUser.userId === user.userId && leagueUser.teamStatus !== "vacant",
  );

  if (existingUser) {
    setStoredLastOnlineLeagueId(storage, league.id);

    return {
      status: "already-member",
      league,
    };
  }

  const resolvedTeamIdentity = resolveTeamIdentitySelection(teamIdentity);

  if (!resolvedTeamIdentity) {
    return {
      status: "invalid-team-identity",
      league,
      message: "Bitte wähle zuerst Stadt, Kategorie und Teamnamen.",
    };
  }

  const occupiedUsers = league.users.filter((leagueUser) => leagueUser.teamStatus !== "vacant");

  if (occupiedUsers.length >= league.maxUsers) {
    return {
      status: "full",
      league,
      message: "Diese Liga ist bereits voll.",
    };
  }

  if (hasTeamDisplayName(league, resolvedTeamIdentity.teamDisplayName)) {
    return {
      status: "team-identity-taken",
      league,
      message: "Diese Team-Identität ist in der Liga bereits vergeben.",
    };
  }

  const updatedLeague = saveOnlineLeague(
    {
      ...league,
      users: [
        ...league.users,
        (() => {
          const now = new Date().toISOString();
          const teamId = getTeamIdentityId(resolvedTeamIdentity);
          const contractRoster = createDefaultContractRoster(
            teamId,
            resolvedTeamIdentity.teamDisplayName,
          );

          return {
            userId: user.userId,
            username: user.username,
            joinedAt: now,
            teamId,
            teamName: resolvedTeamIdentity.teamName,
            cityId: resolvedTeamIdentity.cityId,
            cityName: resolvedTeamIdentity.cityName,
            teamNameId: resolvedTeamIdentity.teamNameId,
            teamCategory: resolvedTeamIdentity.teamCategory,
            teamDisplayName: resolvedTeamIdentity.teamDisplayName,
            ownershipProfile: createDefaultOwnershipProfile(
              teamId,
              resolvedTeamIdentity.teamDisplayName,
            ),
            jobSecurity: createDefaultJobSecurityScore(league.currentWeek),
            activity: createDefaultActivityMetrics(now),
            adminRemoval: createDefaultAdminRemovalState(),
            teamStatus: "occupied" as const,
            controlledBy: "user" as const,
            allowNewUserJoin: false,
            stadiumProfile: createDefaultStadiumProfile(
              teamId,
              resolvedTeamIdentity.teamDisplayName,
              resolvedTeamIdentity.cityName,
              league.currentWeek,
              now,
            ),
            attendanceHistory: [],
            fanbaseProfile: createDefaultFanbaseProfile(
              teamId,
              resolvedTeamIdentity.cityName,
              now,
            ),
            teamChemistryProfile: createDefaultTeamChemistryProfile(
              teamId,
              league.currentWeek,
              1,
              now,
            ),
            chemistryHistory: [],
            merchandiseFinancials: [],
            financeProfile: createDefaultFinanceProfile(teamId, now),
            coachingStaffProfile: createDefaultCoachingStaffProfile(
              teamId,
              resolvedTeamIdentity.teamDisplayName,
            ),
            weeklyTrainingPlans: [],
            trainingOutcomes: [],
            contractRoster,
            depthChart: createDefaultOnlineDepthChart(contractRoster, now),
            salaryCap: calculateSalaryCap(contractRoster),
            draftPicks: createDefaultDraftPicks(teamId),
            readyForWeek: false,
          };
        })(),
      ],
    },
    storage,
  );

  setStoredLastOnlineLeagueId(storage, updatedLeague.id);

  return {
    status: "joined",
    league: updatedLeague,
  };
}

export function setOnlineLeagueUserReady(
  leagueId: string,
  userId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  return setOnlineLeagueUserReadyState(leagueId, userId, true, storage);
}

export function setOnlineLeagueUserReadyState(
  leagueId: string,
  userId: string,
  ready: boolean,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const existingUser = league.users.find((leagueUser) => leagueUser.userId === userId);

  if (!existingUser) {
    return league;
  }

  if (!isOnlineLeagueUserActiveWeekParticipant(existingUser)) {
    return league;
  }

  if (existingUser.readyForWeek === ready) {
    return league;
  }

  const now = new Date().toISOString();

  return saveOnlineLeague(
    {
      ...league,
      users: league.users.map((leagueUser) =>
        leagueUser.userId === userId
          ? ready
            ? {
                ...leagueUser,
                readyForWeek: true,
                readyAt: now,
                activity: {
                  ...getOnlineLeagueUserActivity(leagueUser),
                  lastSeenAt: now,
                  lastLeagueActionAt: now,
                  missedWeeklyActions: 0,
                  inactiveSinceWeek: undefined,
                  inactiveStatus: "active",
                },
              }
            : {
                ...resetReadyState(leagueUser),
                activity: {
                  ...getOnlineLeagueUserActivity(leagueUser),
                  lastSeenAt: now,
                  lastLeagueActionAt: now,
                },
              }
          : leagueUser,
      ),
    },
    storage,
  );
}

export function setAllOnlineLeagueUsersReady(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const readyAt = new Date().toISOString();

  return saveOnlineLeague(
    {
      ...league,
      users: league.users.map((leagueUser) =>
        !isOnlineLeagueUserActiveWeekParticipant(leagueUser)
          ? resetReadyState(leagueUser)
          : {
              ...leagueUser,
              readyForWeek: true,
              readyAt: leagueUser.readyAt ?? readyAt,
            },
      ),
    },
    storage,
  );
}

export function updateOnlineLeagueUserDepthChart(
  leagueId: string,
  userId: string,
  depthChart: OnlineDepthChartEntry[],
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser || !validateOnlineDepthChart(leagueUser, depthChart)) {
    return league;
  }

  const now = new Date().toISOString();
  const normalizedDepthChart = depthChart.map((entry) => ({
    ...entry,
    backupPlayerIds: Array.from(new Set(entry.backupPlayerIds)),
    updatedAt: now,
  }));
  const updatedLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              depthChart: normalizedDepthChart,
              activity: {
                ...getOnlineLeagueUserActivity(user),
                lastSeenAt: now,
                lastLeagueActionAt: now,
                missedWeeklyActions: 0,
                inactiveSinceWeek: undefined,
                inactiveStatus: "active",
              },
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "depth_chart_updated",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${leagueUser.username} updated depth chart.`,
      season: getTrainingSeason(leagueUser),
      week: league.currentWeek,
    }),
    `Depth chart updated for ${leagueUser.teamDisplayName ?? leagueUser.teamName}.`,
  );

  return saveOnlineLeague(updatedLeague, storage);
}

export function startOnlineLeague(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const draftState = getFantasyDraftState(league);

  if (draftState.status !== "completed") {
    return startOnlineFantasyDraft(leagueId, storage);
  }

  return saveOnlineLeague(
    {
      ...league,
      status: "active",
      currentWeek: 1,
      weekStatus: "ready",
    },
    storage,
  );
}

export function removeOnlineLeagueUser(
  leagueId: string,
  userId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  return saveOnlineLeague(
    {
      ...league,
      users: league.users.filter((leagueUser) => leagueUser.userId !== userId),
    },
    storage,
  );
}

export function simulateOnlineLeagueWeek(
  leagueId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
  options: {
    simulatedByUserId?: string;
  } = {},
): OnlineLeague | null {
  let league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  if (league.fantasyDraft && league.fantasyDraft.status !== "completed") {
    return league;
  }

  if (league.weekStatus === "simulating") {
    return league;
  }

  const readyState = getOnlineLeagueWeekReadyState(league);

  if (!readyState.canSimulate) {
    return league;
  }

  const season = normalizeSeasonNumber(league.currentSeason ?? Math.ceil(league.currentWeek / 18));
  const weekKey = `s${season}-w${league.currentWeek}`;

  if (league.lastSimulatedWeekKey === weekKey || getOnlineMatchResultForWeek(league, season, league.currentWeek)) {
    return league;
  }

  league = saveOnlineLeague(
    {
      ...league,
      weekStatus: "simulating",
    },
    storage,
  );

  for (const user of league.users) {
    if (user.teamStatus === "vacant") {
      continue;
    }

    const trainedLeague = generateOnlineTrainingOutcome(league.id, user.userId, storage);

    if (trainedLeague) {
      league = trainedLeague;
    }

    const updatedLeague = recordOnlineMatchdayAttendance(
      league.id,
      {
        matchId: `${league.id}-week-${league.currentWeek}-${user.teamId}`,
        teamId: user.teamId,
        season: user.jobSecurity?.lastUpdatedSeason ?? 1,
        week: league.currentWeek,
        wins: Math.max(0, league.currentWeek - 1),
        losses: 0,
        playoffChances: 35,
        homeGameAttractiveness: 50,
      },
      storage,
    );

    if (updatedLeague) {
      league = updatedLeague;
    }
  }

  const now = new Date().toISOString();
  const matchResults = createOnlineMatchResultsForWeek(
    league,
    now,
    options.simulatedByUserId ?? "admin",
  );
  const nextWeek = league.currentWeek + 1;
  const nextSeason = normalizeSeasonNumber(league.currentSeason ?? Math.ceil(nextWeek / 18));
  const completedWeek = createCompletedOnlineWeek({
    completedAt: now,
    nextSeason,
    nextWeek,
    resultMatchIds: matchResults.map((result) => result.matchId),
    season,
    simulatedByUserId: options.simulatedByUserId ?? "admin",
    week: league.currentWeek,
  });
  const existingCompletedWeeks = (league.completedWeeks ?? []).filter(
    (week) => week.weekKey !== completedWeek.weekKey,
  );
  const advancedLeague = saveOnlineLeague(
    {
      ...league,
      currentWeek: nextWeek,
      currentSeason: nextSeason,
      weekStatus: "pre_week",
      lastSimulatedWeekKey: weekKey,
      matchResults: [...matchResults, ...(league.matchResults ?? [])],
      completedWeeks: [completedWeek, ...existingCompletedWeeks],
      users: league.users.map(resetReadyState),
      logs: [
        createLeagueLogEntry(
          matchResults.length > 0
            ? "Simulation placeholder ausgeführt und Ergebnisse gespeichert"
            : "Simulation placeholder ausgeführt",
        ),
        ...(league.logs ?? []),
      ],
      events: [
        ...matchResults.map((result) =>
          createLeagueEvent({
            eventType: "online_match_result_recorded",
            leagueId: league.id,
            teamId: result.homeTeamId,
            userId: "admin",
            reason: `${result.homeTeamName} ${result.homeScore} - ${result.awayScore} ${result.awayTeamName}`,
            season: result.season,
            week: result.week,
          }),
        ),
        ...(league.events ?? []),
      ],
    },
    storage,
  );

  if (league.currentWeek > 0 && league.currentWeek % 18 === 0) {
    return advanceOnlineContractsOneYear(advancedLeague.id, storage) ?? advancedLeague;
  }

  return advancedLeague;
}

export function setOnlineMediaExpectation(
  leagueId: string,
  userId: string,
  goal: OnlineMediaExpectationGoal,
  season?: number,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser || !isOnlineMediaExpectationGoal(goal)) {
    return league;
  }

  const now = new Date().toISOString();
  const targetSeason = normalizeSeasonNumber(season ?? getTrainingSeason(leagueUser));
  const profile = createMediaExpectationProfile(leagueUser, targetSeason, goal, now);
  const nextLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              mediaExpectationProfile: profile,
              activity: {
                ...getOnlineLeagueUserActivity(user),
                lastSeenAt: now,
                lastLeagueActionAt: now,
                missedWeeklyActions: 0,
                inactiveSinceWeek: undefined,
                inactiveStatus: "active",
              },
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "media_expectation_set",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `${leagueUser.username} set media expectation: ${goal}.`,
      season: targetSeason,
      week: league.currentWeek,
    }),
    `Media expectation set for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${goal}`,
  );

  return saveOnlineLeague(nextLeague, storage);
}

export function setOnlineFranchiseStrategy(
  leagueId: string,
  userId: string,
  strategy: FranchiseStrategyType,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league || !isFranchiseStrategyType(strategy)) {
    return league;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  if (!isOnlineOffseasonWeek(league.currentWeek)) {
    return league;
  }

  const now = new Date().toISOString();
  const selectedAtSeason = getOnlineSeasonFromLeagueWeek(league.currentWeek);
  const profile = createFranchiseStrategyProfile(strategy, now, selectedAtSeason);
  const updatedLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              franchiseStrategy: profile,
              activity: {
                ...getOnlineLeagueUserActivity(user),
                lastSeenAt: now,
                lastLeagueActionAt: now,
                missedWeeklyActions: 0,
                inactiveSinceWeek: undefined,
                inactiveStatus: "active",
              },
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "franchise_strategy_set",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: `Franchise strategy set to ${strategy} in offseason.`,
      season: selectedAtSeason,
      week: league.currentWeek,
    }),
    `Franchise strategy set for ${leagueUser.teamDisplayName ?? leagueUser.teamName}: ${strategy}`,
  );

  return saveOnlineLeague(updatedLeague, storage);
}

export function recordOnlineGmSeasonResult(
  leagueId: string,
  userId: string,
  seasonResult: OnlineGmSeasonResult,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  const ownerProfile = getOnlineLeagueUserOwner(leagueUser);
  const previousJobSecurity = getOnlineLeagueUserJobSecurity(
    leagueUser,
    league.currentWeek,
  );
  const mediaExpectation = getOnlineLeagueUserMediaExpectation(
    leagueUser,
    seasonResult.season,
  );
  const franchiseStrategy = getOnlineLeagueUserFranchiseStrategy(leagueUser);
  const effectiveSeasonResult: OnlineGmSeasonResult = {
    ...seasonResult,
    expectation:
      seasonResult.expectation ??
      mediaExpectation?.ownerExpectation ??
      getStrategyExpectation(franchiseStrategy),
  };
  const expectationResult = getExpectationResult(effectiveSeasonResult);
  const baseOwnerConfidenceDelta = calculateOwnerConfidenceDelta(
    ownerProfile,
    effectiveSeasonResult,
    expectationResult,
  );
  const financeRules = getOnlineLeagueFinanceRules(league);
  const fanPressure = calculateFanPressure(leagueUser, effectiveSeasonResult);
  const ownerSensitivityModifier =
    (ownerProfile.mediaSensitivity - ownerProfile.loyalty / 2) / 100;
  const jobSecurityDeltaFromFans = financeRules.enableFanPressure
    ? -Math.round((fanPressure.fanPressureScore / 18) * Math.max(0.3, ownerSensitivityModifier + 0.75))
    : 0;
  const mediaOwnerModifier = getMediaExpectationOwnerModifier(
    mediaExpectation,
    expectationResult,
  );
  const inactivityPenalty = calculateJobSecurityInactivityPenalty(
    getOnlineLeagueUserActivity(leagueUser),
    getOnlineLeagueActivityRules(league),
  );
  const strategyOwnerModifier =
    expectationResult === "exceeded" && franchiseStrategy.strategyType === "win_now"
      ? Math.abs(franchiseStrategy.ownerPressureModifier)
      : franchiseStrategy.ownerPressureModifier;
  const strategyPenalty = getFranchiseStrategyMismatchPenalty(
    franchiseStrategy,
    effectiveSeasonResult,
    expectationResult,
  );
  const ownerConfidenceDelta =
    baseOwnerConfidenceDelta +
    jobSecurityDeltaFromFans +
    mediaOwnerModifier +
    strategyOwnerModifier +
    inactivityPenalty +
    strategyPenalty;
  const previousScore = previousJobSecurity.score;
  const nextScore = clampScore(previousScore + ownerConfidenceDelta);
  const nextHistory = [
    ...previousJobSecurity.gmPerformanceHistory,
    {
      season: seasonResult.season,
      seasonResults: effectiveSeasonResult,
      expectationResult,
      ownerConfidenceDelta,
      fanPressureScore: fanPressure.fanPressureScore,
      ownerSensitivityModifier,
      jobSecurityDeltaFromFans,
      inactivityPenalty,
      strategyPenalty,
      reasonText: mediaExpectation
        ? `${fanPressure.reasonText} ${mediaExpectation.mediaNarrative} ${franchiseStrategy.narrative}${strategyPenalty < 0 ? " Die gewählte Strategie wurde verfehlt." : ""}${inactivityPenalty < 0 ? " Inaktivität belastet Owner Confidence." : ""}`
        : `${fanPressure.reasonText} ${franchiseStrategy.narrative}${strategyPenalty < 0 ? " Die gewählte Strategie wurde verfehlt." : ""}${inactivityPenalty < 0 ? " Inaktivität belastet Owner Confidence." : ""}`,
      finalJobSecurityScore: nextScore,
    },
  ];
  const nextJobSecurity = applyOwnerTerminationRules(ownerProfile, {
    score: nextScore,
    status: getJobSecurityStatus(nextScore),
    lastUpdatedWeek: league.currentWeek,
    lastUpdatedSeason: seasonResult.season,
    gmPerformanceHistory: nextHistory,
  });
  const updatedLeague: OnlineLeague = {
    ...league,
    users: league.users.map((user) =>
      user.userId === userId
        ? {
            ...user,
            jobSecurity: nextJobSecurity,
            fanPressure,
          }
        : user,
    ),
  };
  const eventReason = `Owner confidence changed by ${ownerConfidenceDelta} after season ${seasonResult.season}.`;
  let auditedLeague = appendLeagueAudit(
    updatedLeague,
    createLeagueEvent({
      eventType: "owner_confidence_changed",
      leagueId: league.id,
      teamId: leagueUser.teamId,
      userId,
      reason: eventReason,
      season: seasonResult.season,
      week: league.currentWeek,
      previousScore,
      newStatus: nextJobSecurity.status,
    }),
    eventReason,
  );

  if (nextJobSecurity.status === "hot_seat" || nextJobSecurity.status === "termination_risk") {
    const hotSeatReason = `${leagueUser.username} steht bei ${nextScore}/100 unter Owner-Druck.`;
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "gm_hot_seat",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: hotSeatReason,
        season: seasonResult.season,
        week: league.currentWeek,
        previousScore,
        newStatus: nextJobSecurity.status,
      }),
      hotSeatReason,
    );
  }

  if (financeRules.enableFanPressure && jobSecurityDeltaFromFans < 0) {
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "owner_confidence_changed_by_fans",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: fanPressure.reasonText,
        season: seasonResult.season,
        week: league.currentWeek,
        previousScore,
        newStatus: nextJobSecurity.status,
      }),
      `Fan pressure affected owner confidence: ${jobSecurityDeltaFromFans}`,
    );
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "fan_pressure_changed",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: fanPressure.reasonText,
        season: seasonResult.season,
        week: league.currentWeek,
        newStatus: nextJobSecurity.status,
      }),
      fanPressure.reasonText,
    );
  }

  if (nextJobSecurity.status === "fired") {
    const firedReason = `${ownerProfile.ownerName} hat den GM nach mehrjähriger Untererfüllung entlassen.`;
    auditedLeague = appendLeagueAudit(
      {
        ...auditedLeague,
        users: auditedLeague.users.map((user) =>
          user.userId === userId
            ? {
                ...user,
                teamStatus: "vacant",
                controlledBy: "ai_or_commissioner",
                allowNewUserJoin: true,
                vacantSince: new Date().toISOString(),
              }
            : user,
        ),
      },
      createLeagueEvent({
        eventType: "owner_fired_gm",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: firedReason,
        season: seasonResult.season,
        week: league.currentWeek,
        previousScore,
        newStatus: "fired",
      }),
      firedReason,
    );
    auditedLeague = appendLeagueAudit(
      auditedLeague,
      createLeagueEvent({
        eventType: "gm_fired_by_owner",
        leagueId: league.id,
        teamId: leagueUser.teamId,
        userId,
        reason: firedReason,
        season: seasonResult.season,
        week: league.currentWeek,
        previousScore,
        newStatus: "fired",
      }),
      `Owner firing notification: ${leagueUser.username}`,
    );
  }

  return saveOnlineLeague(auditedLeague, storage);
}

export function recordOnlineGmMissedWeek(
  leagueId: string,
  userId: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);

  if (!league) {
    return null;
  }

  const rules = getOnlineLeagueActivityRules(league);

  return saveOnlineLeague(
    {
      ...league,
      users: league.users.map((user) => {
        if (user.userId !== userId) {
          return user;
        }

        const activity = getOnlineLeagueUserActivity(user);
        const missedWeeklyActions = activity.missedWeeklyActions + 1;
        const inactiveStatus = getInactiveStatus(missedWeeklyActions, rules);

        return {
          ...user,
          activity: {
            ...activity,
            missedWeeklyActions,
            inactiveStatus,
            inactiveSinceWeek:
              inactiveStatus === "active"
                ? undefined
                : activity.inactiveSinceWeek ?? league.currentWeek,
          },
        };
      }),
    },
    storage,
  );
}

export function warnOnlineGm(
  leagueId: string,
  userId: string,
  message: string,
  deadlineAt: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);
  const reason = message.trim();

  if (!league || !reason || !deadlineAt.trim()) {
    return league;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  const nextLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              adminRemoval: {
                status: "admin_warning",
                message: reason,
                deadlineAt,
                updatedAt: new Date().toISOString(),
              },
              activity: {
                ...getOnlineLeagueUserActivity(user),
                inactiveStatus:
                  getOnlineLeagueUserActivity(user).inactiveStatus === "active"
                    ? "warning"
                    : getOnlineLeagueUserActivity(user).inactiveStatus,
              },
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "gm_warning",
      leagueId,
      teamId: leagueUser.teamId,
      userId,
      reason,
      season: getOnlineLeagueUserJobSecurity(leagueUser, league.currentWeek)
        .lastUpdatedSeason,
      week: league.currentWeek,
      newStatus: "admin_warning",
    }),
    `Admin warning for ${leagueUser.username}: ${reason}`,
  );

  return saveOnlineLeague(nextLeague, storage);
}

export function authorizeOnlineGmRemoval(
  leagueId: string,
  userId: string,
  reason: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);
  const trimmedReason = reason.trim();

  if (!league || !trimmedReason) {
    return league;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  const nextLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              adminRemoval: {
                ...getOnlineLeagueUserAdminRemoval(user),
                status: "admin_authorized_removal",
                reason: trimmedReason,
                updatedAt: new Date().toISOString(),
              },
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "gm_removal_authorized",
      leagueId,
      teamId: leagueUser.teamId,
      userId,
      reason: trimmedReason,
      season: getOnlineLeagueUserJobSecurity(leagueUser, league.currentWeek)
        .lastUpdatedSeason,
      week: league.currentWeek,
      newStatus: "admin_authorized_removal",
    }),
    `GM removal authorized for ${leagueUser.username}: ${trimmedReason}`,
  );

  return saveOnlineLeague(nextLeague, storage);
}

export function markOnlineTeamVacant(
  leagueId: string,
  userId: string,
  reason: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);
  const trimmedReason = reason.trim();

  if (!league || !trimmedReason) {
    return league;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  const nextLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              previousUserId: user.userId,
              teamStatus: "vacant",
              controlledBy: "ai_or_commissioner",
              allowNewUserJoin: true,
              vacantSince: new Date().toISOString(),
              readyForWeek: false,
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "team_marked_vacant",
      leagueId,
      teamId: leagueUser.teamId,
      userId,
      reason: trimmedReason,
      season: getOnlineLeagueUserJobSecurity(leagueUser, league.currentWeek)
        .lastUpdatedSeason,
      week: league.currentWeek,
      newStatus: "vacant",
    }),
    `Team marked vacant for ${leagueUser.username}: ${trimmedReason}`,
  );

  return saveOnlineLeague(nextLeague, storage);
}

export function removeOnlineGmByAdmin(
  leagueId: string,
  userId: string,
  reason: string,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): OnlineLeague | null {
  const league = getOnlineLeagueById(leagueId, storage);
  const trimmedReason = reason.trim();

  if (!league || !trimmedReason) {
    return league;
  }

  const leagueUser = league.users.find((user) => user.userId === userId);

  if (!leagueUser) {
    return league;
  }

  const removedLeague = appendLeagueAudit(
    {
      ...league,
      users: league.users.map((user) =>
        user.userId === userId
          ? {
              ...user,
              previousUserId: user.userId,
              adminRemoval: {
                ...getOnlineLeagueUserAdminRemoval(user),
                status: "admin_removed",
                reason: trimmedReason,
                updatedAt: new Date().toISOString(),
              },
              activity: {
                ...getOnlineLeagueUserActivity(user),
                inactiveStatus: "removed",
              },
              jobSecurity: {
                ...getOnlineLeagueUserJobSecurity(user, league.currentWeek),
                status: "fired",
              },
              teamStatus: "vacant",
              controlledBy: "ai_or_commissioner",
              allowNewUserJoin: true,
              vacantSince: new Date().toISOString(),
              readyForWeek: false,
            }
          : user,
      ),
    },
    createLeagueEvent({
      eventType: "gm_removed_by_admin",
      leagueId,
      teamId: leagueUser.teamId,
      userId,
      reason: trimmedReason,
      season: getOnlineLeagueUserJobSecurity(leagueUser, league.currentWeek)
        .lastUpdatedSeason,
      week: league.currentWeek,
      previousScore: getOnlineLeagueUserJobSecurity(leagueUser, league.currentWeek).score,
      newStatus: "admin_removed",
    }),
    `GM removed by admin: ${leagueUser.username}. Reason: ${trimmedReason}`,
  );

  const vacantLeague = appendLeagueAudit(
    removedLeague,
    createLeagueEvent({
      eventType: "team_marked_vacant",
      leagueId,
      teamId: leagueUser.teamId,
      userId,
      reason: trimmedReason,
      season: getOnlineLeagueUserJobSecurity(leagueUser, league.currentWeek)
        .lastUpdatedSeason,
      week: league.currentWeek,
      newStatus: "vacant",
    }),
    `Team marked vacant after admin removal: ${leagueUser.teamDisplayName ?? leagueUser.teamName}`,
  );

  return saveOnlineLeague(vacantLeague, storage);
}

export function claimVacantOnlineTeam(
  leagueId: string,
  teamId: string,
  user: OnlineUser,
  storage: OnlineLeagueStorage = getBrowserOnlineLeagueStorage(),
): JoinOnlineLeagueResult {
  const league = getOnlineLeagueById(leagueId, storage) ?? getOrCreateGlobalTestLeague(storage);
  const existingUser = league.users.some(
    (leagueUser) => leagueUser.userId === user.userId && leagueUser.teamStatus !== "vacant",
  );

  if (existingUser) {
    setStoredLastOnlineLeagueId(storage, league.id);

    return {
      status: "already-member",
      league,
    };
  }

  const vacantUser = league.users.find(
    (leagueUser) =>
      leagueUser.teamId === teamId &&
      leagueUser.teamStatus === "vacant" &&
      leagueUser.allowNewUserJoin,
  );

  if (!vacantUser) {
    return {
      status: "team-identity-taken",
      league,
      message: "Dieses vakante Team ist nicht verfügbar.",
    };
  }

  const updatedLeague = saveOnlineLeague(
    {
      ...league,
      users: league.users.map((leagueUser) =>
        leagueUser.teamId === teamId
          ? {
              ...leagueUser,
              userId: user.userId,
              username: user.username,
              joinedAt: new Date().toISOString(),
              previousUserId: leagueUser.previousUserId ?? leagueUser.userId,
              jobSecurity: createDefaultJobSecurityScore(league.currentWeek),
              activity: createDefaultActivityMetrics(),
              adminRemoval: createDefaultAdminRemovalState(),
              teamStatus: "occupied",
              controlledBy: "user",
              allowNewUserJoin: false,
              vacantSince: undefined,
              readyForWeek: false,
            }
          : leagueUser,
      ),
    },
    storage,
  );

  setStoredLastOnlineLeagueId(storage, updatedLeague.id);

  return {
    status: "joined",
    league: updatedLeague,
  };
}
