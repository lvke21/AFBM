import {
  canCreateOnlineLeagueSchedule,
  createOnlineLeagueSchedule,
} from "./online-league-schedule";
import type {
  OnlineFinanceRules,
  OnlineGmActivityRules,
  OnlineLeagueSettings,
  OnlineLeagueTeam,
  OnlineLeagueUser,
} from "./online-league-types";

export const DEFAULT_ONLINE_GM_ACTIVITY_RULES: OnlineGmActivityRules = {
  warningAfterMissedWeeks: 1,
  inactiveAfterMissedWeeks: 2,
  removalEligibleAfterMissedWeeks: 3,
  autoVacateAfterMissedWeeks: false,
};

export const DEFAULT_ONLINE_FINANCE_RULES: OnlineFinanceRules = {
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

export function resetOnlineLeagueUserReadyState(user: OnlineLeagueUser): OnlineLeagueUser {
  const userWithoutReadyAt = { ...user };
  delete userWithoutReadyAt.readyAt;

  return {
    ...userWithoutReadyAt,
    readyForWeek: false,
  };
}

export function createDefaultOnlineLeagueSettings(): OnlineLeagueSettings {
  return {
    gmActivityRules: { ...DEFAULT_ONLINE_GM_ACTIVITY_RULES },
    financeRules: { ...DEFAULT_ONLINE_FINANCE_RULES },
  };
}

export function normalizeOnlineFinanceRules(
  rules: Partial<OnlineFinanceRules> | undefined,
): OnlineFinanceRules {
  return {
    ...DEFAULT_ONLINE_FINANCE_RULES,
    ...(rules ?? {}),
    revenueSharingPercentage: Math.min(
      100,
      Math.max(0, Math.round(rules?.revenueSharingPercentage ?? 20)),
    ),
    minCashFloor: Math.max(0, Math.round(rules?.minCashFloor ?? 0)),
    maxTicketPriceLevel: Math.min(
      100,
      Math.max(1, Math.round(rules?.maxTicketPriceLevel ?? 100)),
    ),
    allowStadiumUpgrades: false,
  };
}

export function normalizeOnlineLeagueSettings(
  settings: Partial<OnlineLeagueSettings> | undefined,
): OnlineLeagueSettings {
  return {
    gmActivityRules: {
      ...DEFAULT_ONLINE_GM_ACTIVITY_RULES,
      ...(settings?.gmActivityRules ?? {}),
    },
    financeRules: normalizeOnlineFinanceRules(settings?.financeRules),
  };
}

export function createScheduleForOnlineTeamPool(
  leagueId: string,
  teams: OnlineLeagueTeam[],
) {
  return canCreateOnlineLeagueSchedule(teams) ? createOnlineLeagueSchedule(leagueId, teams) : [];
}

export function createOnlineTeamAbbreviationFromId(teamId: string) {
  const compactId = teamId.replace(/[^a-z0-9]/gi, "").toUpperCase();

  return (compactId.slice(0, 3) || "TM").padEnd(3, "X");
}
