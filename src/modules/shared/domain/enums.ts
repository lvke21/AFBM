export const MatchKind = {
  PLAYOFF: "PLAYOFF",
  PRESEASON: "PRESEASON",
  REGULAR_SEASON: "REGULAR_SEASON",
} as const;

export type MatchKind = typeof MatchKind[keyof typeof MatchKind];

export const MatchStatus = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
  SCHEDULED: "SCHEDULED",
} as const;

export type MatchStatus = typeof MatchStatus[keyof typeof MatchStatus];

export const SeasonPhase = {
  OFFSEASON: "OFFSEASON",
  PLAYOFFS: "PLAYOFFS",
  PRESEASON: "PRESEASON",
  REGULAR_SEASON: "REGULAR_SEASON",
} as const;

export type SeasonPhase = typeof SeasonPhase[keyof typeof SeasonPhase];

export const WeekState = {
  GAME_RUNNING: "GAME_RUNNING",
  POST_GAME: "POST_GAME",
  PRE_WEEK: "PRE_WEEK",
  READY: "READY",
} as const;

export type WeekState = typeof WeekState[keyof typeof WeekState];

export const DominantHand = {
  AMBIDEXTROUS: "AMBIDEXTROUS",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
} as const;

export type DominantHand = typeof DominantHand[keyof typeof DominantHand];

export const DevelopmentTrait = {
  ELITE: "ELITE",
  IMPACT: "IMPACT",
  NORMAL: "NORMAL",
  STAR: "STAR",
} as const;

export type DevelopmentTrait =
  typeof DevelopmentTrait[keyof typeof DevelopmentTrait];

export const RosterStatus = {
  BACKUP: "BACKUP",
  FREE_AGENT: "FREE_AGENT",
  INACTIVE: "INACTIVE",
  INJURED_RESERVE: "INJURED_RESERVE",
  PRACTICE_SQUAD: "PRACTICE_SQUAD",
  ROTATION: "ROTATION",
  STARTER: "STARTER",
} as const;

export type RosterStatus = typeof RosterStatus[keyof typeof RosterStatus];

export const PlayerStatus = {
  ACTIVE: "ACTIVE",
  FREE_AGENT: "FREE_AGENT",
  INJURED: "INJURED",
  RETIRED: "RETIRED",
} as const;

export type PlayerStatus = typeof PlayerStatus[keyof typeof PlayerStatus];

export const InjuryStatus = {
  DOUBTFUL: "DOUBTFUL",
  HEALTHY: "HEALTHY",
  INJURED_RESERVE: "INJURED_RESERVE",
  OUT: "OUT",
  QUESTIONABLE: "QUESTIONABLE",
} as const;

export type InjuryStatus = typeof InjuryStatus[keyof typeof InjuryStatus];

export const PlayerHistoryEventType = {
  DEPTH_CHART: "DEPTH_CHART",
  DEVELOPMENT: "DEVELOPMENT",
  INJURY: "INJURY",
  RECOVERY: "RECOVERY",
  RELEASE: "RELEASE",
  SIGNING: "SIGNING",
} as const;

export type PlayerHistoryEventType =
  typeof PlayerHistoryEventType[keyof typeof PlayerHistoryEventType];

export const DraftClassStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
  COMPLETED: "COMPLETED",
  UPCOMING: "UPCOMING",
} as const;

export type DraftClassStatus = typeof DraftClassStatus[keyof typeof DraftClassStatus];

export const DraftPlayerStatus = {
  AVAILABLE: "AVAILABLE",
  DRAFTED: "DRAFTED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type DraftPlayerStatus = typeof DraftPlayerStatus[keyof typeof DraftPlayerStatus];

export const ScoutingLevel = {
  BASIC: "BASIC",
  FOCUSED: "FOCUSED",
  NONE: "NONE",
} as const;

export type ScoutingLevel = typeof ScoutingLevel[keyof typeof ScoutingLevel];

export const DraftRiskLevel = {
  HIGH: "HIGH",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
} as const;

export type DraftRiskLevel = typeof DraftRiskLevel[keyof typeof DraftRiskLevel];

export const ContractStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  RELEASED: "RELEASED",
} as const;

export type ContractStatus = typeof ContractStatus[keyof typeof ContractStatus];

export const TeamFinanceEventType = {
  RELEASE_PAYOUT: "RELEASE_PAYOUT",
  SEASON_SALARY: "SEASON_SALARY",
  SIGNING_BONUS: "SIGNING_BONUS",
} as const;

export type TeamFinanceEventType =
  typeof TeamFinanceEventType[keyof typeof TeamFinanceEventType];

export const InboxTaskStatus = {
  DONE: "DONE",
  HIDDEN: "HIDDEN",
  OPEN: "OPEN",
  READ: "READ",
} as const;

export type InboxTaskStatus = typeof InboxTaskStatus[keyof typeof InboxTaskStatus];

export const InboxTaskPriority = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
} as const;

export type InboxTaskPriority = typeof InboxTaskPriority[keyof typeof InboxTaskPriority];
